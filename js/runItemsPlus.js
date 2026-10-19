/*
 * Items de run pasivos nuevos.
 *
 *  - Máscara de piedra: robo de vida (un % del daño que haces te cura).
 *  - Rayo de Zeus: +15% de velocidad de movimiento.
 *  - Alas de Dédalo: dash con ESPACIO (o Shift) cada X segundos. Durante el dash
 *    eres intangible: no recibes daño y atraviesas obstáculos y enemigos.
 *  - Peluche de Snom: cuando un enemigo te ataca, puede que te ignore unos segundos.
 *  - Bugforce: los enemigos de cualquier bioma pueden aparecer en cualquier bioma
 *    (la lógica está en pickBiomeEnemyId, js/registry.js).
 */

const RUN_ITEMS_PLUS = {
  stoneMask: { lifeStealPercent: 0.03 },
  zeusBolt: { speedMultiplier: 1.15 },
  daedalusWings: { cooldown: 4.5, duration: 0.22, speed: 950 },
  snomPlush: { chance: 0.3, ignoreTime: 4 }
};

function resetRunItemsPlusState() {
  player.stoneMaskActive = false;
  player.stoneMaskHealBuffer = 0;
  player.zeusBoltActive = false;
  player.daedalusWingsActive = false;
  player.dashCooldown = 0;
  player.dashTimer = 0;
  player.dashing = false;
  player.dashDirX = 0;
  player.dashDirY = 0;
  player.dashTrail = [];
  player.snomPlushActive = false;
  player.bugforceActive = false;
  player.moveDirX = 0;
  player.moveDirY = 0;
}

// ---------------------------------------------------------------------------
// Máscara de piedra
// ---------------------------------------------------------------------------

function applyStoneMaskLifeSteal(damageDealt) {
  if (!player.stoneMaskActive || !(damageDealt > 0) || player.life <= 0) return;

  player.stoneMaskHealBuffer = (player.stoneMaskHealBuffer || 0) + damageDealt * RUN_ITEMS_PLUS.stoneMask.lifeStealPercent;

  if (player.stoneMaskHealBuffer >= 1) {
    const heal = Math.floor(player.stoneMaskHealBuffer);
    player.stoneMaskHealBuffer -= heal;

    const before = player.life;
    player.life = Math.min(player.maxLife, player.life + heal);
    if (saveData?.stats) saveData.stats.totalHealingReceived += player.life - before;
  }
}

// ---------------------------------------------------------------------------
// Alas de Dédalo (dash)
// ---------------------------------------------------------------------------

function tryStartDash() {
  if (!player.daedalusWingsActive || player.dashing || player.dashCooldown > 0) return;

  let dirX = player.moveDirX || 0;
  let dirY = player.moveDirY || 0;
  if (!dirX && !dirY) dirX = player.facing === "left" ? -1 : 1;

  const cfg = RUN_ITEMS_PLUS.daedalusWings;
  player.dashing = true;
  player.dashTimer = cfg.duration;
  player.dashCooldown = cfg.cooldown;
  player.dashDirX = dirX;
  player.dashDirY = dirY;
  player.invulnerableTimer = Math.max(player.invulnerableTimer, cfg.duration + 0.12);
}

// Devuelve true si este frame el jugador está haciendo el dash (y ya se ha movido).
function updatePlayerDash(dt) {
  if (!player.daedalusWingsActive) return false;

  if (player.dashCooldown > 0) player.dashCooldown -= dt;
  if (player.dashRequested || keys[" "] || keys["shift"]) tryStartDash();
  player.dashRequested = false;

  if (player.dashTrail?.length) {
    for (const ghost of player.dashTrail) ghost.life -= dt;
    player.dashTrail = player.dashTrail.filter(ghost => ghost.life > 0);
  }

  if (!player.dashing) return false;

  const cfg = RUN_ITEMS_PLUS.daedalusWings;
  player.dashTrail ||= [];
  player.dashTrail.push({ x: player.x, y: player.y, life: 0.25, facing: player.facing });

  // Intangible: atraviesa rocas, árboles y enemigos (el agua del río sigue bloqueando).
  moveWithObstacleCollision(player, player.dashDirX * cfg.speed * dt, player.dashDirY * cfg.speed * dt);
  if (player.dashDirX < 0) player.facing = "left";
  if (player.dashDirX > 0) player.facing = "right";

  player.dashTimer -= dt;
  if (player.dashTimer <= 0) {
    player.dashing = false;
    // Si acaba encima de un obstáculo, lo empuja fuera para que no se quede atascado.
    pushPlayerOutOfObstacles();
  }

  return true;
}

function pushPlayerOutOfObstacles() {
  if (!isCollidingWithObstacle(player)) return;
  for (let radius = 8; radius <= 160; radius += 8) {
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const oldX = player.x;
      const oldY = player.y;
      player.x += Math.cos(angle) * radius;
      player.y += Math.sin(angle) * radius;
      if (!isBlockedByWorld(player)) return;
      player.x = oldX;
      player.y = oldY;
    }
  }
}

function drawDashTrail(sprite) {
  if (!player.dashTrail?.length) return;
  for (const ghost of player.dashTrail) {
    drawSprite(sprite, ghost.x, ghost.y, player.size, ghost.facing, Math.max(0, ghost.life / 0.25) * 0.35);
  }
}

function drawDashCooldown() {
  if (!player.daedalusWingsActive) return;
  const cfg = RUN_ITEMS_PLUS.daedalusWings;
  const ready = player.dashCooldown <= 0;
  const progress = ready ? 1 : 1 - player.dashCooldown / cfg.cooldown;

  const sx = worldToScreenX(player.x);
  const sy = worldToScreenY(player.y) + player.size / 2 + 8;
  const width = 46;

  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(sx - width / 2 - 1, sy - 1, width + 2, 6);
  ctx.fillStyle = ready ? "#ffe07a" : "#9a8a5a";
  ctx.fillRect(sx - width / 2, sy, width * progress, 4);
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Peluche de Snom
// ---------------------------------------------------------------------------

function canBeCalmedBySnom(enemy) {
  return enemy && !enemy.isBoss && !enemy.senseiId && !enemy.isAlly;
}

// Llamar justo después de que un enemigo haga daño al jugador.
function trySnomPlushIgnore(enemy) {
  if (!player.snomPlushActive || !canBeCalmedBySnom(enemy)) return;
  if (Math.random() >= RUN_ITEMS_PLUS.snomPlush.chance) return;

  enemy.snomIgnoreTimer = RUN_ITEMS_PLUS.snomPlush.ignoreTime;
  enemy.state = "chase";
  enemy.pullTimer = 0;
  enemy.snomWanderAngle = Math.atan2(enemy.y - player.y, enemy.x - player.x) + (Math.random() - 0.5);
}

// Movimiento del enemigo mientras te ignora: se aleja paseando, sin atacar.
function updateSnomIgnoringEnemy(enemy, dt) {
  enemy.snomIgnoreTimer -= dt;
  enemy.snomWanderAngle = (enemy.snomWanderAngle ?? Math.random() * Math.PI * 2) + (Math.random() - 0.5) * dt * 2;

  const speed = (enemy.speed || 60) * 0.55;
  const dx = Math.cos(enemy.snomWanderAngle) * speed * dt;
  const dy = Math.sin(enemy.snomWanderAngle) * speed * dt;

  if (enemy.ignoresObstacles) {
    enemy.x += dx;
    enemy.y += dy;
  } else {
    moveWithObstacleCollision(enemy, dx, dy);
  }

  enemy.facing = dx < 0 ? "left" : "right";
  enemy.visualMoving = true;
}

function drawSnomIgnoreIcon(enemy) {
  if (!(enemy.snomIgnoreTimer > 0)) return;
  const sx = worldToScreenX(enemy.x);
  const sy = worldToScreenY(enemy.y) - (enemy.size || 56) / 2 - 14;

  ctx.save();
  ctx.font = "16px Arial";
  ctx.textAlign = "center";
  ctx.globalAlpha = 0.6 + Math.sin(performance.now() / 200) * 0.3;
  ctx.fillText("❄️", sx, sy + Math.sin(performance.now() / 300) * 3);
  ctx.restore();
}
