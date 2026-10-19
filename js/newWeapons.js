/*
 * Armas nuevas: Balón de fútbol, Logo AVA y Apisonadora.
 *
 *  - Balón de fútbol: un balón con físicas. Si el jugador choca con él lo chuta
 *    en la dirección del choque. Rebota en enemigos y obstáculos y les hace daño.
 *    Si se aleja más que su "rango", reaparece a los pies del jugador.
 *  - Logo AVA: como el salvapantallas del DVD. Se mueve por la pantalla, rebota
 *    en los bordes cambiando de color y daña a los enemigos que toca.
 *    Si da justo en una esquina, provoca una explosión.
 *  - Apisonadora: sale disparada en línea recta y aplasta a todos los enemigos
 *    por los que pasa. Su combustible decide cuánto avanza.
 */

let soccerBalls = [];
let avaLogos = [];
let steamrollers = [];

function resetNewWeapons() {
  soccerBalls = [];
  avaLogos = [];
  steamrollers = [];
}

function isHostileTarget(enemy) {
  return enemy && !enemy.dead && !enemy.isAlly;
}

// ---------------------------------------------------------------------------
// Balón de fútbol
// ---------------------------------------------------------------------------

function addSoccerBallWeapon() {
  applyWeaponDefinition("soccerBall");
}

function setupSoccerBallWeapon() {
  soccerBalls = [];
}

function spawnSoccerBall(index = 0) {
  const weapon = player.weapons.soccerBall;
  const angle = Math.random() * Math.PI * 2;
  const ball = {
    index,
    x: player.x + Math.cos(angle) * 50,
    y: player.y + Math.sin(angle) * 50,
    vx: 0,
    vy: 0,
    radius: weapon.size / 2,
    spin: 0,
    kickCooldown: 0,
    hitTimers: new Map(),
    flash: 0.35
  };

  // Sale con un pequeño chut hacia el enemigo más cercano.
  kickSoccerBallTowardsEnemy(ball, weapon.kickPower * 0.6);
  soccerBalls.push(ball);
  return ball;
}

function kickSoccerBallTowardsEnemy(ball, power) {
  const target = getNearestEnemyFromPoint(ball.x, ball.y);
  const angle = target
    ? Math.atan2(target.y - ball.y, target.x - ball.x)
    : Math.random() * Math.PI * 2;
  ball.vx = Math.cos(angle) * power;
  ball.vy = Math.sin(angle) * power;
}

function moveSoccerBallAxis(ball, dx, dy) {
  ball.x += dx;
  ball.y += dy;
  if (isCollidingWithObstacle({ x: ball.x, y: ball.y, collision: ball.radius })) {
    ball.x -= dx;
    ball.y -= dy;
    return false;
  }
  return true;
}

function updateSoccerBallWeapon(dt) {
  const weapon = player.weapons.soccerBall;
  if (!weapon) return;

  while (soccerBalls.length < weapon.count) spawnSoccerBall(soccerBalls.length);
  if (soccerBalls.length > weapon.count) soccerBalls.length = weapon.count;

  for (const ball of soccerBalls) {
    ball.radius = weapon.size / 2;
    ball.kickCooldown -= dt;
    if (ball.flash > 0) ball.flash -= dt;

    // Demasiado lejos: reaparece a los pies del jugador.
    if (Math.hypot(ball.x - player.x, ball.y - player.y) > weapon.range) {
      const angle = Math.random() * Math.PI * 2;
      ball.x = player.x + Math.cos(angle) * 40;
      ball.y = player.y + Math.sin(angle) * 40;
      ball.flash = 0.35;
      kickSoccerBallTowardsEnemy(ball, weapon.kickPower * 0.6);
    }

    // El jugador choca con el balón: lo chuta.
    const pdx = ball.x - player.x;
    const pdy = ball.y - player.y;
    const pdist = Math.hypot(pdx, pdy) || 1;
    if (pdist < player.collision + ball.radius && ball.kickCooldown <= 0) {
      ball.vx = (pdx / pdist) * weapon.kickPower;
      ball.vy = (pdy / pdist) * weapon.kickPower;
      ball.kickCooldown = 0.2;
      ball.hitTimers.clear();
    }

    // Movimiento con rozamiento y rebote en obstáculos.
    const friction = Math.exp(-1.25 * dt);
    ball.vx *= friction;
    ball.vy *= friction;

    if (!moveSoccerBallAxis(ball, ball.vx * dt, 0)) ball.vx *= -0.75;
    if (!moveSoccerBallAxis(ball, 0, ball.vy * dt)) ball.vy *= -0.75;

    const speed = Math.hypot(ball.vx, ball.vy);
    ball.spin += (speed * dt) / Math.max(8, ball.radius) * (ball.vx < 0 ? -1 : 1);

    for (const [enemy, timer] of ball.hitTimers) {
      if (timer - dt <= 0 || enemy.dead) ball.hitTimers.delete(enemy);
      else ball.hitTimers.set(enemy, timer - dt);
    }

    // Solo hace daño si va con algo de velocidad.
    if (speed < 90) continue;

    for (const enemy of enemies) {
      if (!isHostileTarget(enemy) || ball.hitTimers.has(enemy)) continue;

      const ex = enemy.x - ball.x;
      const ey = enemy.y - ball.y;
      const reach = ball.radius + (enemy.collision || 16);
      const distSq = ex * ex + ey * ey;
      if (distSq >= reach * reach) continue;

      const dist = Math.sqrt(distSq) || 1;
      const nx = ex / dist;
      const ny = ey / dist;
      const bonus = speed > weapon.kickPower * 0.75 ? 1.5 : 1;

      damageEnemy(enemy, Math.round(weapon.damage * bonus), "soccerBall", weapon.tags || ["ball"]);
      ball.hitTimers.set(enemy, 0.35);

      // Empuja al enemigo (los jefes casi no se mueven).
      if (!enemy.dead) {
        const push = (enemy.isBoss ? 0.25 : 1) * weapon.knockback;
        moveWithObstacleCollision(enemy, nx * push, ny * push);
      }

      // El balón rebota contra el enemigo y pierde algo de fuerza.
      const dot = ball.vx * nx + ball.vy * ny;
      if (dot > 0) {
        ball.vx = (ball.vx - 2 * dot * nx) * 0.85;
        ball.vy = (ball.vy - 2 * dot * ny) * 0.85;
      }
    }
  }
}

function drawSoccerBalls() {
  if (!player.weapons?.soccerBall) return;

  for (const ball of soccerBalls) {
    const sx = worldToScreenX(ball.x);
    const sy = worldToScreenY(ball.y);
    if (sx < -60 || sy < -60 || sx > canvas.width + 60 || sy > canvas.height + 60) continue;

    const size = ball.radius * 2;

    // Sombra
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = "black";
    ctx.beginPath();
    ctx.ellipse(sx, sy + ball.radius * 0.85, ball.radius * 0.8, ball.radius * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = ball.flash > 0 ? 0.5 + Math.abs(Math.sin(performance.now() / 40)) * 0.5 : 1;
    ctx.translate(sx, sy);
    ctx.rotate(ball.spin);
    ctx.drawImage(Assets.items.soccerBall, -size / 2, -size / 2, size, size);
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------
// Logo AVA (salvapantallas de DVD)
// ---------------------------------------------------------------------------

function addAvaLogoWeapon() {
  applyWeaponDefinition("avaLogo");
}

function setupAvaLogoWeapon() {
  avaLogos = [];
}

function spawnAvaLogo(index = 0) {
  const weapon = player.weapons.avaLogo;
  // Ángulos "de salvapantallas": siempre en diagonal.
  const diagonals = [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4];
  const angle = diagonals[(index + Math.floor(Math.random() * 4)) % 4];

  avaLogos.push({
    index,
    // Coordenadas de PANTALLA: el logo vive en la pantalla, no en el mundo.
    sx: canvas.width * (0.25 + Math.random() * 0.5),
    sy: canvas.height * (0.25 + Math.random() * 0.5),
    dirX: Math.cos(angle),
    dirY: Math.sin(angle),
    hue: Math.floor(Math.random() * 360),
    hitTimers: new Map(),
    lastBounceX: -10,
    lastBounceY: -10,
    cornerFlash: 0
  });

  return weapon;
}

function getAvaLogoBox(weapon) {
  // El dibujo del logo ocupa la franja central del sprite.
  const width = weapon.size;
  const height = weapon.size * 0.5;
  return { width, height };
}

function updateAvaLogoWeapon(dt) {
  const weapon = player.weapons.avaLogo;
  if (!weapon) return;

  while (avaLogos.length < weapon.count) spawnAvaLogo(avaLogos.length);
  if (avaLogos.length > weapon.count) avaLogos.length = weapon.count;

  const { width, height } = getAvaLogoBox(weapon);
  const now = gameTime;

  for (const logo of avaLogos) {
    logo.sx += logo.dirX * weapon.speed * dt;
    logo.sy += logo.dirY * weapon.speed * dt;
    if (logo.cornerFlash > 0) logo.cornerFlash -= dt;

    let bounced = false;

    if (logo.sx - width / 2 < 0) {
      logo.sx = width / 2;
      logo.dirX = Math.abs(logo.dirX);
      logo.lastBounceX = now;
      bounced = true;
    } else if (logo.sx + width / 2 > canvas.width) {
      logo.sx = canvas.width - width / 2;
      logo.dirX = -Math.abs(logo.dirX);
      logo.lastBounceX = now;
      bounced = true;
    }

    if (logo.sy - height / 2 < 0) {
      logo.sy = height / 2;
      logo.dirY = Math.abs(logo.dirY);
      logo.lastBounceY = now;
      bounced = true;
    } else if (logo.sy + height / 2 > canvas.height) {
      logo.sy = canvas.height - height / 2;
      logo.dirY = -Math.abs(logo.dirY);
      logo.lastBounceY = now;
      bounced = true;
    }

    if (bounced) {
      logo.hue = (logo.hue + 70 + Math.floor(Math.random() * 90)) % 360;

      // ¡Esquina! Los dos rebotes casi a la vez.
      if (Math.abs(logo.lastBounceX - logo.lastBounceY) < 0.12) {
        triggerAvaCornerHit(logo, weapon);
        logo.lastBounceX = -10;
        logo.lastBounceY = -10;
      }
    }

    // Posición del logo en el mundo (la cámara sigue al jugador).
    const wx = player.x + (logo.sx - canvas.width / 2);
    const wy = player.y + (logo.sy - canvas.height / 2);
    logo.x = wx;
    logo.y = wy;

    for (const [enemy, timer] of logo.hitTimers) {
      if (timer - dt <= 0 || enemy.dead) logo.hitTimers.delete(enemy);
      else logo.hitTimers.set(enemy, timer - dt);
    }

    for (const enemy of enemies) {
      if (!isHostileTarget(enemy) || logo.hitTimers.has(enemy)) continue;
      const r = enemy.collision || 16;
      if (
        Math.abs(enemy.x - wx) < width / 2 + r * 0.6 &&
        Math.abs(enemy.y - wy) < height / 2 + r * 0.6
      ) {
        damageEnemy(enemy, weapon.damage, "avaLogo", weapon.tags || ["digital"]);
        logo.hitTimers.set(enemy, weapon.hitCooldown);
      }
    }
  }
}

function triggerAvaCornerHit(logo, weapon) {
  logo.cornerFlash = 0.8;
  showEventMessage("¡ESQUINA! 📀");

  const wx = player.x + (logo.sx - canvas.width / 2);
  const wy = player.y + (logo.sy - canvas.height / 2);
  const radius = 230;

  explosions.push({
    x: wx,
    y: wy,
    size: radius * 2,
    lifeTime: 0.35,
    sprite: Assets.effects.explosion
  });

  for (const enemy of enemies) {
    if (!isHostileTarget(enemy)) continue;
    if (Math.hypot(enemy.x - wx, enemy.y - wy) < radius + (enemy.collision || 16)) {
      damageEnemy(enemy, weapon.cornerDamage, "avaLogo", [...(weapon.tags || []), "explosive"]);
    }
  }
}

function drawAvaLogos() {
  if (!player.weapons?.avaLogo) return;
  const weapon = player.weapons.avaLogo;
  const size = weapon.size;

  for (const logo of avaLogos) {
    ctx.save();
    // El sprite original es azul cian: se gira el tono para el cambio de color del DVD.
    ctx.filter = `hue-rotate(${logo.hue}deg) saturate(1.3)`;
    if (logo.cornerFlash > 0) {
      ctx.shadowBlur = 25;
      ctx.shadowColor = "white";
    }
    ctx.drawImage(Assets.items.avaLogo, logo.sx - size / 2, logo.sy - size / 2, size, size);
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------
// Apisonadora
// ---------------------------------------------------------------------------

function addSteamrollerWeapon() {
  applyWeaponDefinition("steamroller");
}

function setupSteamrollerWeapon() {
  steamrollers = [];
}

function updateSteamrollerWeapon(dt) {
  const weapon = player.weapons.steamroller;
  if (!weapon) return;

  weapon.timer = (weapon.timer ?? 0.5) - dt;
  if (weapon.timer <= 0) {
    launchSteamrollers(weapon);
    weapon.timer = weapon.cooldown;
  }

  updateSteamrollers(dt);
}

function launchSteamrollers(weapon) {
  const target = getNearestEnemyFromPoint(player.x, player.y);
  let baseAngle;

  if (target) {
    baseAngle = Math.atan2(target.y - player.y, target.x - player.x);
  } else if (player.moveDirX || player.moveDirY) {
    baseAngle = Math.atan2(player.moveDirY, player.moveDirX);
  } else {
    baseAngle = player.facing === "left" ? Math.PI : 0;
  }

  const count = Math.max(1, weapon.count);
  // Con varias apisonadoras salen en abanico (1 → recta, 2 → ±20º, etc.).
  const spread = count === 1 ? 0 : Math.min(Math.PI * 0.9, 0.35 * (count - 1));

  for (let i = 0; i < count; i++) {
    const angle = count === 1 ? baseAngle : baseAngle - spread / 2 + (spread * i) / (count - 1);
    steamrollers.push({
      x: player.x + Math.cos(angle) * 30,
      y: player.y + Math.sin(angle) * 30,
      angle,
      speed: weapon.speed,
      fuel: weapon.fuel,
      maxFuel: weapon.fuel,
      damage: weapon.damage,
      size: weapon.size,
      collision: weapon.size * 0.42,
      crushed: new Set(),
      fade: 0.5,
      smokeTimer: 0
    });
  }
}

function updateSteamrollers(dt) {
  const weapon = player.weapons.steamroller;

  for (const roller of steamrollers) {
    if (roller.fuel <= 0) {
      roller.fade -= dt;
      continue;
    }

    const step = Math.min(roller.fuel, roller.speed * dt);
    roller.x += Math.cos(roller.angle) * step;
    roller.y += Math.sin(roller.angle) * step;
    roller.fuel -= step;
    roller.smokeTimer -= dt;

    for (const enemy of enemies) {
      if (!isHostileTarget(enemy) || roller.crushed.has(enemy)) continue;
      const reach = roller.collision + (enemy.collision || 16);
      if (Math.hypot(enemy.x - roller.x, enemy.y - roller.y) < reach) {
        roller.crushed.add(enemy);
        damageEnemy(enemy, roller.damage, "steamroller", weapon?.tags || ["crush"]);

        // Los supervivientes salen despedidos hacia los lados.
        if (!enemy.dead && !enemy.isBoss) {
          const side = Math.sign(
            Math.cos(roller.angle) * (enemy.y - roller.y) - Math.sin(roller.angle) * (enemy.x - roller.x)
          ) || 1;
          const push = 40;
          moveWithObstacleCollision(
            enemy,
            -Math.sin(roller.angle) * push * side,
            Math.cos(roller.angle) * push * side
          );
        }
      }
    }
  }

  steamrollers = steamrollers.filter(roller => roller.fuel > 0 || roller.fade > 0);
}

function drawSteamrollers() {
  for (const roller of steamrollers) {
    const sx = worldToScreenX(roller.x);
    const sy = worldToScreenY(roller.y);
    if (sx < -120 || sy < -120 || sx > canvas.width + 120 || sy > canvas.height + 120) continue;

    const size = roller.size;
    const running = roller.fuel > 0;

    ctx.save();
    ctx.globalAlpha = running ? 1 : Math.max(0, roller.fade / 0.5);
    ctx.translate(sx, sy + (running ? Math.sin(performance.now() / 45) * 1.2 : 0));
    ctx.rotate(roller.angle);
    // Si va hacia la izquierda se voltea para que las ruedas sigan abajo.
    if (Math.cos(roller.angle) < 0) ctx.scale(1, -1);
    ctx.drawImage(Assets.items.steamroller, -size / 2, -size / 2, size, size);
    ctx.restore();

    // Barra de combustible
    if (running) {
      const width = size * 0.7;
      const ratio = Math.max(0, roller.fuel / roller.maxFuel);
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(sx - width / 2 - 1, sy - size / 2 - 9, width + 2, 6);
      ctx.fillStyle = ratio > 0.3 ? "#ffd23f" : "#ff5a3c";
      ctx.fillRect(sx - width / 2, sy - size / 2 - 8, width * ratio, 4);
      ctx.restore();
    } else {
      // Se queda sin gasolina: humo.
      ctx.save();
      ctx.globalAlpha = Math.max(0, roller.fade / 0.5) * 0.7;
      ctx.drawImage(Assets.effects.smoke, sx - 24, sy - size / 2 - 30, 48, 48);
      ctx.restore();
    }
  }
}
