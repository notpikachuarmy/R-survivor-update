/*
 * Bastón de Mariposamancia.
 * Invoca mariposas que vuelan hacia el enemigo más cercano y le hacen daño al tocarlo.
 * Cada mariposa vive un tiempo (duración) y reaparece tras un pequeño cooldown.
 * Con la mejora "Polvo eléctrico", las mariposas quedan unidas por una cadena
 * relámpago: cualquier enemigo que toque la cadena recibe daño.
 */

let butterflies = [];

const BUTTERFLY_MAX_COUNT = 8;
const BUTTERFLY_MAX_LINK_LENGTH = 460;

function resetButterflies() {
  butterflies = [];
}

function addButterflyStaffWeapon() {
  applyWeaponDefinition("butterflyStaff");
}

function updateButterflyStaffWeapon(dt) {
  const weapon = player.weapons.butterflyStaff;
  if (!weapon) return;

  if (!Array.isArray(weapon.cooldownSlots)) weapon.cooldownSlots = [];
  while (weapon.cooldownSlots.length < weapon.count) weapon.cooldownSlots.push(0);
  if (weapon.cooldownSlots.length > weapon.count) weapon.cooldownSlots.length = weapon.count;

  for (let slot = 0; slot < weapon.count; slot++) {
    weapon.cooldownSlots[slot] = Math.max(0, weapon.cooldownSlots[slot] - dt);

    const occupied = butterflies.some(butterfly => !butterfly.dead && butterfly.slot === slot);
    if (!occupied && weapon.cooldownSlots[slot] <= 0) {
      spawnButterfly(slot);
    }
  }

  updateButterflies(dt, weapon);
}

function spawnButterfly(slot) {
  const weapon = player.weapons.butterflyStaff;
  const angle = Math.random() * Math.PI * 2;

  butterflies.push({
    slot,
    x: player.x + Math.cos(angle) * 30,
    y: player.y + Math.sin(angle) * 30,
    size: 26,
    collision: 13,
    life: weapon.duration,
    maxLife: weapon.duration,
    target: null,
    hitTimer: 0,
    facing: "right",
    phase: Math.random() * Math.PI * 2,
    orbitAngle: angle
  });
}

function findButterflyTarget(butterfly, weapon) {
  let best = null;
  let bestDistSq = weapon.range * weapon.range;

  for (const enemy of enemies) {
    if (!isEnemyFaction(enemy)) continue;

    // Solo enemigos dentro del alcance del jugador, para que no se vayan lejísimos.
    const pdx = enemy.x - player.x;
    const pdy = enemy.y - player.y;
    if (pdx * pdx + pdy * pdy > bestDistSq) continue;

    const dx = enemy.x - butterfly.x;
    const dy = enemy.y - butterfly.y;

    // Penaliza enemigos que ya persiguen otras mariposas: así se reparten
    // y la cadena relámpago cubre más zona.
    let alreadyTargeted = 0;
    for (const other of butterflies) {
      if (other !== butterfly && !other.dead && other.target === enemy) alreadyTargeted++;
    }
    const distSq = (dx * dx + dy * dy) * (1 + alreadyTargeted * 4);

    if (!best || distSq < best.distSq) {
      best = { enemy, distSq };
    }
  }

  return best ? best.enemy : null;
}

function updateButterflies(dt, weapon) {
  const time = performance.now() / 1000;

  for (const butterfly of butterflies) {
    if (butterfly.dead) continue;

    butterfly.life -= dt;
    butterfly.hitTimer -= dt;

    if (butterfly.life <= 0) {
      butterfly.dead = true;
      weapon.cooldownSlots[butterfly.slot] = weapon.respawnCooldown;
      continue;
    }

    if (!butterfly.target || butterfly.target.dead || !isEnemyFaction(butterfly.target)) {
      butterfly.target = findButterflyTarget(butterfly, weapon);
    }

    // Si el objetivo se ha alejado demasiado del jugador, se busca otro.
    if (butterfly.target && Math.hypot(butterfly.target.x - player.x, butterfly.target.y - player.y) > weapon.range + 160) {
      butterfly.target = null;
    }

    let goalX;
    let goalY;

    if (butterfly.target) {
      goalX = butterfly.target.x;
      goalY = butterfly.target.y;
    } else {
      butterfly.orbitAngle += dt * 2.2;
      const radius = 70 + butterfly.slot * 10;
      goalX = player.x + Math.cos(butterfly.orbitAngle) * radius;
      goalY = player.y + Math.sin(butterfly.orbitAngle) * radius;
    }

    const dx = goalX - butterfly.x;
    const dy = goalY - butterfly.y;
    const dist = Math.hypot(dx, dy) || 1;
    const step = Math.min(dist, weapon.speed * dt);

    // Vuelo con aleteo: pequeño zigzag perpendicular a la dirección.
    const wobble = Math.sin(time * 9 + butterfly.phase) * 55 * dt;
    butterfly.x += (dx / dist) * step + (-dy / dist) * wobble;
    butterfly.y += (dy / dist) * step + (dx / dist) * wobble;
    butterfly.facing = dx < 0 ? "left" : "right";

    if (butterfly.hitTimer > 0) continue;

    for (const enemy of enemies) {
      if (!isEnemyFaction(enemy)) continue;

      const ex = enemy.x - butterfly.x;
      const ey = enemy.y - butterfly.y;
      const reach = butterfly.collision + (enemy.collision || 16);

      if (ex * ex + ey * ey < reach * reach) {
        damageEnemy(enemy, weapon.damage, "butterflyStaff", weapon.tags || ["summon", "butterfly"]);
        butterfly.hitTimer = weapon.hitCooldown;
        break;
      }
    }
  }

  butterflies = butterflies.filter(butterfly => !butterfly.dead);

  if (weapon.chain) updateButterflyChain(dt, weapon);
}

function getButterflyLinks() {
  const ordered = butterflies
    .filter(butterfly => !butterfly.dead)
    .sort((a, b) => a.slot - b.slot);

  const links = [];
  if (ordered.length < 2) return links;

  for (let i = 0; i < ordered.length; i++) {
    const a = ordered[i];
    const b = ordered[(i + 1) % ordered.length];

    // Con 2 mariposas solo hay una conexión (no se cierra el círculo dos veces).
    if (ordered.length === 2 && i === 1) break;

    if (Math.hypot(a.x - b.x, a.y - b.y) <= BUTTERFLY_MAX_LINK_LENGTH) {
      links.push([a, b]);
    }
  }

  return links;
}

function updateButterflyChain(dt, weapon) {
  weapon.chainTimer = (weapon.chainTimer ?? 0) - dt;
  if (weapon.chainTimer > 0) return;
  weapon.chainTimer = weapon.chainTick;

  const links = getButterflyLinks();
  if (!links.length) return;

  const tags = [...(weapon.tags || []), "electric", "chain"];

  for (const enemy of enemies) {
    if (!isEnemyFaction(enemy)) continue;

    for (const [a, b] of links) {
      const d = distanceToSegment(enemy.x, enemy.y, a.x, a.y, b.x, b.y);
      if (d < (enemy.collision || 16) + 6) {
        damageEnemy(enemy, weapon.chainDamage, "butterflyStaff", tags);
        break; // un enemigo recibe como mucho un golpe de cadena por tick
      }
    }
  }
}

function drawButterflies() {
  const weapon = player.weapons?.butterflyStaff;
  const time = performance.now() / 1000;

  if (weapon?.chain) {
    const links = getButterflyLinks();

    ctx.save();
    ctx.lineCap = "round";
    for (const [a, b] of links) {
      const x1 = worldToScreenX(a.x);
      const y1 = worldToScreenY(a.y);
      const x2 = worldToScreenX(b.x);
      const y2 = worldToScreenY(b.y);
      const seed = Math.floor(time * 14) + a.slot * 7;

      ctx.globalAlpha = 0.4;
      ctx.strokeStyle = "#7fe8ff";
      ctx.lineWidth = 7;
      drawJaggedLine(x1, y1, x2, y2, seed, 8, 7);

      ctx.globalAlpha = 0.95;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      drawJaggedLine(x1, y1, x2, y2, seed, 8, 7);
    }
    ctx.restore();
  }

  for (const butterfly of butterflies) {
    const sx = worldToScreenX(butterfly.x);
    const sy = worldToScreenY(butterfly.y);
    if (sx < -40 || sy < -40 || sx > canvas.width + 40 || sy > canvas.height + 40) continue;

    // Aleteo: se estrecha horizontalmente. Parpadea al final de su vida.
    const flap = 0.35 + Math.abs(Math.sin(time * 16 + butterfly.phase)) * 0.65;
    const fading = butterfly.life < 1 ? 0.4 + Math.abs(Math.sin(time * 18)) * 0.6 : 1;
    const size = butterfly.size;

    ctx.save();
    ctx.globalAlpha = fading;
    ctx.translate(sx, sy);
    ctx.scale((butterfly.facing === "left" ? -1 : 1) * flap, 1);
    ctx.drawImage(Assets.projectiles.butterfly, -size / 2, -size / 2, size, size);
    ctx.restore();
  }
}
