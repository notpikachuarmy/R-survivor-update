/*
 * Enemigos eléctricos: Magnemite, Magneton y Sandy Shocks (jefe y normal).
 *
 * Ataques (todos avisan antes de golpear, se pueden esquivar):
 *  - Rayo: línea amarilla de aviso y después descarga en esa línea.
 *  - Impacto del cielo (solo jefe): círculos en el suelo y luego cae un rayo.
 *  - Atracción magnética: arrastra al jugador hacia el enemigo; cerca de él
 *    hay un aura de descarga que hace daño.
 */

let enemyLightningBolts = [];
let enemyLightningStrikes = [];
let stormRiftSpawnedThisRun = false;
let sandyShocksSpawnTimer = 300;

function resetElectricState() {
  enemyLightningBolts = [];
  enemyLightningStrikes = [];
  stormRiftSpawnedThisRun = false;
  sandyShocksSpawnTimer = 300;
}

// ---------------------------------------------------------------------------
// Comportamiento
// ---------------------------------------------------------------------------

function updateElectricEnemy(enemy, dt) {
  const cfg = enemy.electric;
  const dx = player.x - enemy.x;
  const dy = player.y - enemy.y;
  const dist = Math.hypot(dx, dy) || 1;
  const speed = enemy.speed * getEnemyStatMultiplier(enemy, "speed");

  enemy.facing = dx < 0 ? "left" : "right";

  // Movimiento: los de distancia mantienen su rango; los jefes persiguen.
  if (!enemy.pullTimer || enemy.pullTimer <= 0) {
    const preferred = cfg.preferredDistance || 0;
    let dir = 1;

    if (preferred > 0) {
      if (dist < preferred - 70) dir = -1;
      else if (dist < preferred + 40) dir = 0;
    }

    if (dir !== 0) {
      moveWithObstacleCollision(enemy, (dx / dist) * speed * dt * dir, (dy / dist) * speed * dt * dir);
    } else {
      enemy.visualMoving = false;
    }
  }

  // Rayos
  if (cfg.boltCooldown) {
    enemy.boltTimer = (enemy.boltTimer ?? 1.2 + Math.random() * cfg.boltCooldown) - dt;

    if (enemy.boltTimer <= 0 && dist < cfg.boltRange) {
      fireEnemyLightningVolley(enemy);
      enemy.boltTimer = cfg.boltCooldown;
    }
  }

  // Impactos desde el cielo
  if (cfg.strikeCooldown) {
    enemy.strikeTimer = (enemy.strikeTimer ?? 3) - dt;

    if (enemy.strikeTimer <= 0 && dist < 900) {
      callLightningStrikes(enemy);
      enemy.strikeTimer = cfg.strikeCooldown;
    }
  }

  // Atracción magnética
  if (cfg.pullCooldown) {
    enemy.pullCooldownTimer = (enemy.pullCooldownTimer ?? 4 + Math.random() * 2) - dt;

    if (enemy.pullCooldownTimer <= 0 && dist < cfg.pullRange && !(enemy.pullTimer > 0)) {
      enemy.pullTimer = cfg.pullDuration;
      enemy.pullCooldownTimer = cfg.pullCooldown;
      enemy.shockTickTimer = 0;
      if (enemy.isBoss && enemy.id === "sandyShocksBoss") showEventMessage("¡Sandy Shocks te atrae!");
    }

    if (enemy.pullTimer > 0) {
      enemy.pullTimer -= dt;

      // Arrastra al jugador (respeta obstáculos y ríos).
      const pull = cfg.pullStrength * dt;
      if (dist > enemy.collision + player.collision) {
        moveWithObstacleCollision(player, -(dx / dist) * pull, -(dy / dist) * pull);
      }

      // Aura de descarga
      enemy.shockTickTimer -= dt;
      if (enemy.shockTickTimer <= 0) {
        enemy.shockTickTimer = 0.4;
        if (dist < cfg.shockRadius + player.collision && player.invulnerableTimer <= 0) {
          damagePlayer(cfg.shockDamage);
          player.invulnerableTimer = 0.25;
        }
      }
    }
  }

  // Daño por contacto (los demás enemigos lo hacen al final de updateEnemies).
  const contactDamage = (enemy.isBoss ? 20 : 8) * getEnemyStatMultiplier(enemy, "damage");
  if (
    dist < player.collision + enemy.collision &&
    player.invulnerableTimer <= 0
  ) {
    damagePlayer(contactDamage);
    player.invulnerableTimer = 0.6;
  }
}

function fireEnemyLightningVolley(enemy) {
  const cfg = enemy.electric;
  const baseAngle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
  const count = Math.max(1, cfg.boltCount || 1);
  const spread = cfg.boltSpread || 0;

  for (let i = 0; i < count; i++) {
    const offset = count === 1 ? 0 : (i / (count - 1) - 0.5) * 2 * spread;
    const angle = baseAngle + offset;
    const length = cfg.boltLength || 560;

    enemyLightningBolts.push({
      x1: enemy.x,
      y1: enemy.y,
      x2: enemy.x + Math.cos(angle) * length,
      y2: enemy.y + Math.sin(angle) * length,
      warn: cfg.boltWarn || 0.75,
      maxWarn: cfg.boltWarn || 0.75,
      active: 0.18,
      width: 22,
      damage: cfg.boltDamage || 8,
      hasHit: false,
      seed: Math.random() * 1000
    });
  }
}

function callLightningStrikes(enemy) {
  const cfg = enemy.electric;
  const count = cfg.strikeCount || 3;

  for (let i = 0; i < count; i++) {
    // El primero cae justo donde está el jugador; el resto alrededor.
    const angle = Math.random() * Math.PI * 2;
    const radius = i === 0 ? 0 : 80 + Math.random() * 180;

    enemyLightningStrikes.push({
      x: player.x + Math.cos(angle) * radius,
      y: player.y + Math.sin(angle) * radius,
      radius: cfg.strikeRadius || 70,
      warn: (cfg.strikeWarn || 1) + i * 0.08,
      maxWarn: (cfg.strikeWarn || 1) + i * 0.08,
      active: 0.22,
      damage: cfg.strikeDamage || 15,
      hasHit: false,
      seed: Math.random() * 1000
    });
  }
}

function distanceToSegment(px, py, x1, y1, x2, y2) {
  const vx = x2 - x1;
  const vy = y2 - y1;
  const lenSq = vx * vx + vy * vy || 1;
  let t = ((px - x1) * vx + (py - y1) * vy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + vx * t), py - (y1 + vy * t));
}

function updateEnemyLightning(dt) {
  for (const bolt of enemyLightningBolts) {
    if (bolt.warn > 0) {
      bolt.warn -= dt;
      continue;
    }

    if (!bolt.hasHit) {
      bolt.hasHit = true;
      const d = distanceToSegment(player.x, player.y, bolt.x1, bolt.y1, bolt.x2, bolt.y2);
      if (d < bolt.width / 2 + player.collision * 0.6 && player.invulnerableTimer <= 0) {
        damagePlayer(bolt.damage);
        player.invulnerableTimer = 0.35;
      }
    }

    bolt.active -= dt;
  }

  for (const strike of enemyLightningStrikes) {
    if (strike.warn > 0) {
      strike.warn -= dt;
      continue;
    }

    if (!strike.hasHit) {
      strike.hasHit = true;
      if (Math.hypot(player.x - strike.x, player.y - strike.y) < strike.radius + player.collision * 0.5 && player.invulnerableTimer <= 0) {
        damagePlayer(strike.damage);
        player.invulnerableTimer = 0.35;
      }
    }

    strike.active -= dt;
  }

  enemyLightningBolts = enemyLightningBolts.filter(bolt => bolt.warn > 0 || bolt.active > 0);
  enemyLightningStrikes = enemyLightningStrikes.filter(strike => strike.warn > 0 || strike.active > 0);
}

// ---------------------------------------------------------------------------
// Grieta de tormenta y Sandy Shocks periódico
// ---------------------------------------------------------------------------

function updateStormEvents(dt) {
  // Grieta de tormenta: tras completar la de Rhyhorn, aparece a los 4 minutos.
  const storm = RiftDatabase.storm;
  if (
    storm &&
    !stormRiftSpawnedThisRun &&
    gameTime >= storm.appearAt &&
    !isRiftCompleted("storm") &&
    isRiftCompleted(storm.requiresRift)
  ) {
    stormRiftSpawnedThisRun = true; // solo una vez por partida
    spawnRift("storm");
  }

  // Sandy Shocks normal: como Rhyhorn, aparece cada 5 minutos una vez derrotado el jefe.
  if (saveData.unlocks.sandyShocks) {
    sandyShocksSpawnTimer -= dt;

    if (sandyShocksSpawnTimer <= 0 && !enemies.some(enemy => enemy.id === "sandyShocks")) {
      spawnEnemyGuaranteed("sandyShocks");
      sandyShocksSpawnTimer = 300;
    }
  }
}

// ---------------------------------------------------------------------------
// Dibujo
// ---------------------------------------------------------------------------

function drawJaggedLine(x1, y1, x2, y2, seed, segments, jitter) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);

  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;

  for (let i = 1; i < segments; i++) {
    const t = i / segments;
    const n = Math.sin(seed + i * 12.9898) * 43758.5453;
    const offset = ((n - Math.floor(n)) - 0.5) * 2 * jitter;
    ctx.lineTo(x1 + dx * t + nx * offset, y1 + dy * t + ny * offset);
  }

  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function drawEnemyLightning() {
  const now = performance.now() / 1000;

  for (const bolt of enemyLightningBolts) {
    const x1 = worldToScreenX(bolt.x1);
    const y1 = worldToScreenY(bolt.y1);
    const x2 = worldToScreenX(bolt.x2);
    const y2 = worldToScreenY(bolt.y2);

    ctx.save();
    if (bolt.warn > 0) {
      const progress = 1 - bolt.warn / bolt.maxWarn;
      ctx.globalAlpha = 0.25 + progress * 0.45;
      ctx.strokeStyle = "#ffe14d";
      ctx.lineWidth = 2 + progress * 3;
      ctx.setLineDash([10, 8]);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    } else {
      ctx.globalAlpha = Math.max(0, bolt.active / 0.18);
      ctx.strokeStyle = "rgba(255, 240, 120, 0.55)";
      ctx.lineWidth = bolt.width;
      ctx.lineCap = "round";
      drawJaggedLine(x1, y1, x2, y2, bolt.seed, 14, 14);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 4;
      drawJaggedLine(x1, y1, x2, y2, bolt.seed, 14, 14);
    }
    ctx.restore();
  }

  for (const strike of enemyLightningStrikes) {
    const sx = worldToScreenX(strike.x);
    const sy = worldToScreenY(strike.y);

    ctx.save();
    if (strike.warn > 0) {
      const progress = 1 - strike.warn / strike.maxWarn;
      ctx.globalAlpha = 0.2 + progress * 0.35;
      ctx.fillStyle = "#ffe14d";
      ctx.beginPath();
      ctx.arc(sx, sy, strike.radius * progress, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.8;
      ctx.strokeStyle = "#ffe14d";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(sx, sy, strike.radius, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.globalAlpha = Math.max(0, strike.active / 0.22);
      ctx.fillStyle = "rgba(255, 245, 160, 0.6)";
      ctx.beginPath();
      ctx.arc(sx, sy, strike.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 5;
      drawJaggedLine(sx, sy - 420, sx, sy, strike.seed, 9, 18);
    }
    ctx.restore();
  }

  // Ondas de atracción magnética
  for (const enemy of enemies) {
    if (!(enemy.pullTimer > 0) || !enemy.electric) continue;
    const sx = worldToScreenX(enemy.x);
    const sy = worldToScreenY(enemy.y);
    const cfg = enemy.electric;

    ctx.save();
    ctx.strokeStyle = "#b46bff";
    ctx.lineWidth = 3;
    for (let i = 0; i < 3; i++) {
      const t = 1 - ((now * 1.4 + i / 3) % 1);
      ctx.globalAlpha = 0.15 + (1 - t) * 0.5;
      ctx.beginPath();
      ctx.arc(sx, sy, 40 + t * 260, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 0.25 + Math.sin(now * 20) * 0.1;
    ctx.fillStyle = "#ffe14d";
    ctx.beginPath();
    ctx.arc(sx, sy, cfg.shockRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawStormRiftGlow(rift) {
  const sx = worldToScreenX(rift.x);
  const sy = worldToScreenY(rift.y);
  const now = performance.now() / 1000;

  ctx.save();
  ctx.globalAlpha = 0.25 + Math.sin(now * 4) * 0.1;
  ctx.fillStyle = rift.tint || "#ffe14d";
  ctx.beginPath();
  ctx.arc(sx, sy, rift.width * 0.55, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = 0.9;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    const angle = now * 2 + i * 2.1;
    const r = rift.width * 0.45;
    drawJaggedLine(
      sx + Math.cos(angle) * r * 0.3, sy + Math.sin(angle) * r * 0.3,
      sx + Math.cos(angle) * r, sy + Math.sin(angle) * r,
      Math.floor(now * 12) + i, 5, 6
    );
  }
  ctx.restore();
}
