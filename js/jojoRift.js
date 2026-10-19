/*
 * Grieta Jojo: DIO Brando y sus vampiros.
 *
 * DIO (jefe de la grieta) y DIO (versión debilitada que aparece cada 5 minutos
 * una vez derrotado el jefe) comparten esta IA, configurada con enemy.jojo:
 *  - Cuchillos en abanico.
 *  - ¡MUDA MUDA!: ráfaga de puñetazos si estás cerca.
 *  - ¡ZA WARUDO!: para el tiempo. Todo se congela (tú también) y DIO coloca un
 *    anillo de cuchillos a tu alrededor con un hueco. Cuando el tiempo vuelve a
 *    fluir, los cuchillos van a por ti: escapa por el hueco o usa un dash.
 *  - ¡ROAD ROLLER DA! (solo el jefe, con poca vida): cae una apisonadora donde estás.
 *  - Invoca vampiros (solo el jefe).
 *
 * El vampiro normal usa la IA de persecución normal; al morderte se cura.
 */

let jojoTimeStop = null;
let jojoRiftSpawnedThisRun = false;
let dioSpawnTimer = 300;
let roadRollerDrops = [];

function resetJojoState() {
  jojoTimeStop = null;
  jojoRiftSpawnedThisRun = false;
  dioSpawnTimer = 300;
  roadRollerDrops = [];
}

function isTimeStopped() {
  return jojoTimeStop !== null;
}

// ---------------------------------------------------------------------------
// Eventos de partida: la grieta y DIO periódico.
// ---------------------------------------------------------------------------

function updateJojoEvents(dt) {
  const rift = RiftDatabase.jojo;
  if (
    rift &&
    !jojoRiftSpawnedThisRun &&
    gameTime >= rift.appearAt &&
    !isRiftCompleted("jojo") &&
    isRiftCompleted(rift.requiresRift)
  ) {
    jojoRiftSpawnedThisRun = true;
    spawnRift("jojo");
  }

  // DIO normal: como Rhyhorn y Sandy Shocks, cada 5 minutos tras derrotar al jefe.
  if (saveData.unlocks.dio) {
    dioSpawnTimer -= dt;
    if (dioSpawnTimer <= 0 && !enemies.some(enemy => enemy.id === "dio" || enemy.id === "dioBoss")) {
      if (spawnEnemyGuaranteed("dio")) showEventMessage("¡Oh! ¿Te acercas a mí?");
      dioSpawnTimer = 300;
    }
  }

  updateRoadRollerDrops(dt);
}

// ---------------------------------------------------------------------------
// IA de DIO
// ---------------------------------------------------------------------------

function updateDioEnemy(enemy, dt) {
  const cfg = enemy.jojo;
  const dx = player.x - enemy.x;
  const dy = player.y - enemy.y;
  const dist = Math.hypot(dx, dy) || 1;
  const speed = enemy.speed * getEnemyStatMultiplier(enemy, "speed");

  enemy.facing = dx < 0 ? "left" : "right";

  // --- Ráfaga MUDA MUDA ---
  if (enemy.barrageTimer > 0) {
    enemy.barrageTimer -= dt;
    enemy.barrageTick = (enemy.barrageTick ?? 0) - dt;

    // Avanza despacio mientras golpea.
    moveWithObstacleCollision(enemy, (dx / dist) * speed * 0.35 * dt, (dy / dist) * speed * 0.35 * dt);

    if (enemy.barrageTick <= 0) {
      enemy.barrageTick = 0.12;
      if (dist < cfg.barrageRange + player.collision && player.invulnerableTimer <= 0) {
        damagePlayer(cfg.barrageDamage * getEnemyStatMultiplier(enemy, "damage"));
        player.invulnerableTimer = 0.1;
      }
    }
  } else if (dist > enemy.collision + player.collision - 6) {
    moveWithObstacleCollision(enemy, (dx / dist) * speed * dt, (dy / dist) * speed * dt);
  }

  // --- Cuchillos ---
  enemy.knifeTimerJojo = (enemy.knifeTimerJojo ?? 2) - dt;
  if (enemy.knifeTimerJojo <= 0 && dist < cfg.knifeRange && !(enemy.barrageTimer > 0)) {
    throwDioKnifeFan(enemy);
    enemy.knifeTimerJojo = cfg.knifeCooldown;
  }

  // --- MUDA MUDA ---
  enemy.barrageCooldownTimer = (enemy.barrageCooldownTimer ?? 2) - dt;
  if (enemy.barrageCooldownTimer <= 0 && dist < cfg.barrageRange + 60) {
    enemy.barrageTimer = cfg.barrageDuration;
    enemy.barrageTick = 0.2;
    enemy.barrageCooldownTimer = cfg.barrageCooldown;
  }

  // --- ZA WARUDO ---
  if (cfg.timeStopCooldown) {
    enemy.timeStopTimerJojo = (enemy.timeStopTimerJojo ?? cfg.timeStopFirst) - dt;
    if (enemy.timeStopTimerJojo <= 0 && dist < 900 && !(enemy.barrageTimer > 0)) {
      startTimeStop(enemy);
      enemy.timeStopTimerJojo = cfg.timeStopCooldown;
      return;
    }
  }

  // --- ROAD ROLLER DA ---
  if (cfg.roadRollerCooldown && enemy.life <= enemy.maxLife * cfg.roadRollerLifeRatio) {
    enemy.roadRollerTimer = (enemy.roadRollerTimer ?? 1.5) - dt;
    if (enemy.roadRollerTimer <= 0) {
      dropRoadRoller(enemy);
      enemy.roadRollerTimer = cfg.roadRollerCooldown;
    }
  }

  // --- Vampiros ---
  if (cfg.summonCooldown) {
    enemy.summonTimer = (enemy.summonTimer ?? 5) - dt;
    if (enemy.summonTimer <= 0) {
      for (let i = 0; i < cfg.summonCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        spawnEnemyAt("vampire", enemy.x + Math.cos(angle) * 90, enemy.y + Math.sin(angle) * 90);
      }
      enemy.summonTimer = cfg.summonCooldown;
    }
  }

  // --- Contacto ---
  if (dist < player.collision + enemy.collision && player.invulnerableTimer <= 0) {
    damagePlayer((cfg.contactDamage || 15) * getEnemyStatMultiplier(enemy, "damage"));
    player.invulnerableTimer = 0.6;
  }
}

function pushDioKnife(x, y, angle, speed, damage, lifeTime = 2.6) {
  enemyProjectiles.push({
    id: "dioKnife",
    x,
    y,
    angle,
    size: 30,
    collision: 9,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    damage,
    lifeTime,
    ignoresObstacles: true
  });
}

function throwDioKnifeFan(enemy) {
  const cfg = enemy.jojo;
  const base = Math.atan2(player.y - enemy.y, player.x - enemy.x);
  const count = Math.max(1, cfg.knifeCount);

  for (let i = 0; i < count; i++) {
    const offset = count === 1 ? 0 : (i / (count - 1) - 0.5) * 2 * cfg.knifeSpread;
    pushDioKnife(enemy.x, enemy.y, base + offset, cfg.knifeSpeed, cfg.knifeDamage);
  }
}

// ---------------------------------------------------------------------------
// ZA WARUDO (parada del tiempo)
// ---------------------------------------------------------------------------

function startTimeStop(dio) {
  const cfg = dio.jojo;

  // DIO aparece detrás del jugador.
  const behind = player.facing === "left" ? 0 : Math.PI;
  const tx = player.x + Math.cos(behind) * 190;
  const ty = player.y + Math.sin(behind) * 40;
  const oldX = dio.x;
  const oldY = dio.y;
  dio.x = tx;
  dio.y = ty;
  if (isCollidingWithObstacle(dio)) {
    dio.x = oldX;
    dio.y = oldY;
  }

  const total = cfg.timeStopKnives || 10;
  jojoTimeStop = {
    dio,
    timer: cfg.timeStopDuration,
    duration: cfg.timeStopDuration,
    centerX: player.x,
    centerY: player.y,
    radius: 240,
    total,
    placed: 0,
    placeTimer: 0.35,
    placeInterval: Math.max(0.08, (cfg.timeStopDuration - 0.6) / total),
    gap: Math.floor(Math.random() * total),
    phase: Math.random() * Math.PI * 2,
    damage: cfg.timeStopKnifeDamage || 10
  };

  showEventMessage("¡ZA WARUDO! ⏱");
}

function updateTimeStop(dt) {
  const stop = jojoTimeStop;
  if (!stop) return;

  if (stop.dio.dead) {
    jojoTimeStop = null;
    return;
  }

  stop.timer -= dt;
  stop.placeTimer -= dt;

  // DIO va colocando cuchillos en un anillo alrededor del jugador (con un hueco de 2).
  while (stop.placeTimer <= 0 && stop.placed < stop.total) {
    const index = stop.placed;
    stop.placed++;
    stop.placeTimer += stop.placeInterval;

    if (index === stop.gap || index === (stop.gap + 1) % stop.total) continue;

    const angle = stop.phase + (index / stop.total) * Math.PI * 2;
    const x = stop.centerX + Math.cos(angle) * stop.radius;
    const y = stop.centerY + Math.sin(angle) * stop.radius;
    // Apuntan al centro. Al reanudarse el tiempo vuelan hacia ahí.
    pushDioKnife(x, y, angle + Math.PI, 380, stop.damage, 1.6);

    // DIO "se mueve" mientras el tiempo está parado: va saltando de cuchillo en cuchillo.
    stop.dio.x = x + Math.cos(angle) * 50;
    stop.dio.y = y + Math.sin(angle) * 50;
    stop.dio.facing = Math.cos(angle) > 0 ? "left" : "right";
  }

  if (stop.timer <= 0) {
    jojoTimeStop = null;
    showEventMessage("El tiempo vuelve a fluir...");
  }
}

function drawTimeStopOverlay() {
  if (!jojoTimeStop) return;
  const stop = jojoTimeStop;

  ctx.save();
  // Todo en blanco y negro...
  ctx.globalCompositeOperation = "saturation";
  ctx.fillStyle = "hsl(0, 0%, 50%)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = "rgba(70, 20, 110, 0.22)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();

  // ...menos DIO y sus cuchillos.
  for (const p of enemyProjectiles) {
    if (p.id === "dioKnife") drawDioKnife(p);
  }
  drawSprite(stop.dio.sprite, stop.dio.x, stop.dio.y, stop.dio.size, stop.dio.facing);

  // Reloj
  const progress = Math.max(0, stop.timer / stop.duration);
  const cx = canvas.width / 2;
  const cy = 70;
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.beginPath();
  ctx.arc(cx, cy, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#ffd23f";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(cx, cy, 22, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
  ctx.stroke();
  ctx.font = "bold 28px Arial";
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffd23f";
  ctx.strokeStyle = "black";
  ctx.lineWidth = 4;
  ctx.strokeText("ZA WARUDO", cx, cy + 62);
  ctx.fillText("ZA WARUDO", cx, cy + 62);
  ctx.restore();
}

function drawDioKnife(p) {
  const sx = worldToScreenX(p.x);
  const sy = worldToScreenY(p.y);
  if (sx < -40 || sy < -40 || sx > canvas.width + 40 || sy > canvas.height + 40) return;

  ctx.save();
  ctx.translate(sx, sy);
  // El sprite del cuchillo apunta hacia la izquierda.
  ctx.rotate(p.angle + Math.PI);
  ctx.drawImage(Assets.projectiles.knife, -p.size / 2, -p.size / 2, p.size, p.size);
  ctx.restore();
}

// ---------------------------------------------------------------------------
// ROAD ROLLER DA
// ---------------------------------------------------------------------------

function dropRoadRoller(dio) {
  roadRollerDrops.push({
    x: player.x,
    y: player.y,
    radius: 120,
    warn: 1.3,
    maxWarn: 1.3,
    impacted: false,
    life: 1.4,
    damage: dio.jojo.roadRollerDamage || 30
  });
  showEventMessage("¡ROAD ROLLER DA!");
}

function updateRoadRollerDrops(dt) {
  for (const drop of roadRollerDrops) {
    if (drop.warn > 0) {
      drop.warn -= dt;
      continue;
    }

    if (!drop.impacted) {
      drop.impacted = true;
      if (
        Math.hypot(player.x - drop.x, player.y - drop.y) < drop.radius + player.collision * 0.5 &&
        player.invulnerableTimer <= 0
      ) {
        damagePlayer(drop.damage);
        player.invulnerableTimer = 0.6;
      }
      explosions.push({
        x: drop.x,
        y: drop.y,
        size: drop.radius * 2,
        lifeTime: 0.35,
        sprite: Assets.effects.smoke
      });
    }

    drop.life -= dt;
  }

  roadRollerDrops = roadRollerDrops.filter(drop => drop.warn > 0 || drop.life > 0);
}

function drawRoadRollerDrops() {
  for (const drop of roadRollerDrops) {
    const sx = worldToScreenX(drop.x);
    const sy = worldToScreenY(drop.y);
    const size = drop.radius * 2;

    ctx.save();
    if (drop.warn > 0) {
      const progress = 1 - drop.warn / drop.maxWarn;
      // Sombra que crece
      ctx.globalAlpha = 0.25 + progress * 0.35;
      ctx.fillStyle = "#3a1010";
      ctx.beginPath();
      ctx.arc(sx, sy, drop.radius * (0.3 + progress * 0.7), 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.85;
      ctx.strokeStyle = "#ff3c3c";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(sx, sy, drop.radius, 0, Math.PI * 2);
      ctx.stroke();

      // La apisonadora cae desde arriba
      ctx.globalAlpha = 1;
      const fall = (1 - progress) * 520;
      ctx.drawImage(Assets.items.steamroller, sx - size / 2, sy - size / 2 - fall, size, size);
    } else {
      ctx.globalAlpha = Math.min(1, drop.life / 0.6);
      ctx.drawImage(Assets.items.steamroller, sx - size / 2, sy - size / 2, size, size);
    }
    ctx.restore();
  }
}

function drawDioBarrage(enemy) {
  if (!(enemy.barrageTimer > 0)) return;
  const sx = worldToScreenX(enemy.x);
  const sy = worldToScreenY(enemy.y);
  const dir = Math.atan2(player.y - enemy.y, player.x - enemy.x);
  const t = performance.now() / 1000;

  ctx.save();
  // Puños
  for (let i = 0; i < 6; i++) {
    const a = dir + Math.sin(t * 40 + i * 1.7) * 0.6;
    const r = 40 + ((t * 600 + i * 37) % 70);
    ctx.globalAlpha = 0.75;
    ctx.fillStyle = "#ffd23f";
    ctx.beginPath();
    ctx.arc(sx + Math.cos(a) * r, sy + Math.sin(a) * r, 9, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.font = "bold 22px Arial";
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffd23f";
  ctx.strokeStyle = "black";
  ctx.lineWidth = 4;
  const text = "MUDA MUDA!";
  const ty = sy - enemy.size / 2 - 20 + Math.sin(t * 30) * 3;
  ctx.strokeText(text, sx, ty);
  ctx.fillText(text, sx, ty);
  ctx.restore();
}

function drawJojoRiftGlow(rift) {
  const sx = worldToScreenX(rift.x);
  const sy = worldToScreenY(rift.y);
  const now = performance.now() / 1000;

  ctx.save();
  ctx.globalAlpha = 0.3 + Math.sin(now * 3) * 0.1;
  ctx.fillStyle = "#8a2be2";
  ctx.beginPath();
  ctx.arc(sx, sy, rift.width * 0.6, 0, Math.PI * 2);
  ctx.fill();

  // ゴゴゴゴ "menacing"
  ctx.font = "bold 26px Arial";
  ctx.textAlign = "center";
  for (let i = 0; i < 4; i++) {
    const a = now * 0.8 + i * (Math.PI / 2);
    const r = rift.width * 0.62;
    ctx.globalAlpha = 0.55 + Math.sin(now * 5 + i) * 0.35;
    ctx.fillStyle = "#c86bff";
    ctx.strokeStyle = "black";
    ctx.lineWidth = 3;
    const x = sx + Math.cos(a) * r;
    const y = sy + Math.sin(a) * r * 0.6 + Math.sin(now * 6 + i) * 4;
    ctx.strokeText("ゴ", x, y);
    ctx.fillText("ゴ", x, y);
  }
  ctx.restore();
}
