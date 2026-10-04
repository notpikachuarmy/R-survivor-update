/*
 * Bolitas de experiencia.
 * Los enemigos ya no dan XP al morir: sueltan una bolita.
 * Las bolitas cercanas se fusionan en una sola (menos objetos = menos lag),
 * y cuanto más valor tiene una bolita, más intenso es su color.
 */

let xpOrbs = [];
let xpOrbMergeTimer = 0;

// De menos a más valor. El color se vuelve más intenso al subir de tramo.
const XP_ORB_TIERS = [
  { min: 1,   core: "#bfefff", glow: "rgba(150, 230, 255, 0.30)", radius: 5 },
  { min: 3,   core: "#4fb4ff", glow: "rgba(60, 160, 255, 0.35)",  radius: 6 },
  { min: 10,  core: "#38e07a", glow: "rgba(40, 220, 110, 0.38)",  radius: 7 },
  { min: 30,  core: "#ffd23f", glow: "rgba(255, 210, 50, 0.42)",  radius: 8 },
  { min: 80,  core: "#ff8a1f", glow: "rgba(255, 130, 20, 0.46)",  radius: 9 },
  { min: 200, core: "#ff2f4f", glow: "rgba(255, 40, 70, 0.50)",   radius: 10 },
  { min: 500, core: "#c13cff", glow: "rgba(190, 50, 255, 0.58)",  radius: 12 }
];

function getXpOrbTier(value) {
  let tier = XP_ORB_TIERS[0];
  for (const candidate of XP_ORB_TIERS) {
    if (value >= candidate.min) tier = candidate;
  }
  return tier;
}

function resetXpOrbs() {
  xpOrbs = [];
  xpOrbMergeTimer = 0;
}

function spawnXpOrb(x, y, value) {
  value = Math.round(value || 0);
  if (value <= 0) return;

  const mergeRadiusSq = BALANCE.xp.mergeRadius * BALANCE.xp.mergeRadius;
  let target = null;
  let targetDistSq = mergeRadiusSq;

  for (const orb of xpOrbs) {
    if (orb.collecting || orb.dead) continue;
    const dx = orb.x - x;
    const dy = orb.y - y;
    const distSq = dx * dx + dy * dy;

    if (distSq < targetDistSq) {
      target = orb;
      targetDistSq = distSq;
    }
  }

  // Demasiadas bolitas: la nueva se suma a la más cercana esté donde esté.
  if (!target && xpOrbs.length >= BALANCE.xp.maxOrbs) {
    targetDistSq = Infinity;
    for (const orb of xpOrbs) {
      if (orb.dead) continue;
      const dx = orb.x - x;
      const dy = orb.y - y;
      const distSq = dx * dx + dy * dy;
      if (distSq < targetDistSq) {
        target = orb;
        targetDistSq = distSq;
      }
    }
  }

  if (target) {
    target.value += value;
    target.pulse = 0.25;
    return;
  }

  const angle = Math.random() * Math.PI * 2;
  const pop = 6 + Math.random() * 10;

  xpOrbs.push({
    x: x + Math.cos(angle) * pop,
    y: y + Math.sin(angle) * pop,
    value,
    collecting: false,
    speed: 0,
    pulse: 0.2,
    phase: Math.random() * Math.PI * 2
  });
}

// XP de un enemigo derrotado: cae al suelo en vez de darse directamente.
function dropEnemyXP(enemy, amount) {
  if (!enemy) {
    gainXP(amount);
    return;
  }
  spawnXpOrb(enemy.x, enemy.y, amount);
}

function mergeNearbyXpOrbs() {
  const mergeRadiusSq = BALANCE.xp.mergeRadius * BALANCE.xp.mergeRadius;

  for (let i = 0; i < xpOrbs.length; i++) {
    const a = xpOrbs[i];
    if (a.dead || a.collecting) continue;

    for (let j = i + 1; j < xpOrbs.length; j++) {
      const b = xpOrbs[j];
      if (b.dead || b.collecting) continue;

      const dx = a.x - b.x;
      const dy = a.y - b.y;

      if (dx * dx + dy * dy < mergeRadiusSq) {
        // La bolita resultante queda en el punto medio ponderado por valor.
        const total = a.value + b.value;
        a.x = (a.x * a.value + b.x * b.value) / total;
        a.y = (a.y * a.value + b.y * b.value) / total;
        a.value = total;
        a.pulse = 0.25;
        b.dead = true;
      }
    }
  }
}

function updateXpOrbs(dt) {
  const range = player.magnetActive ? BALANCE.xp.magnetPickupRange : BALANCE.xp.pickupRange;
  const rangeSq = range * range;
  const attract = BALANCE.xp.attractSpeed;
  let anyDead = false;

  for (const orb of xpOrbs) {
    if (orb.dead) {
      anyDead = true;
      continue;
    }

    if (orb.pulse > 0) orb.pulse -= dt;

    const dx = player.x - orb.x;
    const dy = player.y - orb.y;
    const distSq = dx * dx + dy * dy;

    if (!orb.collecting && distSq < rangeSq) {
      orb.collecting = true;
      orb.speed = attract * 0.35;
    }

    if (!orb.collecting) continue;

    const dist = Math.sqrt(distSq) || 1;
    orb.speed = Math.min(attract * 2.2, orb.speed + attract * 3 * dt);
    const step = Math.min(dist, orb.speed * dt);
    orb.x += (dx / dist) * step;
    orb.y += (dy / dist) * step;

    if (dist <= (player.collision || 22) + 6) {
      orb.dead = true;
      anyDead = true;
      gainXP(orb.value);
    }
  }

  xpOrbMergeTimer -= dt;
  if (xpOrbMergeTimer <= 0) {
    xpOrbMergeTimer = 0.5;
    mergeNearbyXpOrbs();
    anyDead = true;
  }

  if (anyDead) xpOrbs = xpOrbs.filter(orb => !orb.dead);
}

function drawXpOrbs() {
  const time = performance.now() / 1000;

  for (const orb of xpOrbs) {
    const sx = worldToScreenX(orb.x);
    const sy = worldToScreenY(orb.y);
    if (sx < -30 || sy < -30 || sx > canvas.width + 30 || sy > canvas.height + 30) continue;

    const tier = getXpOrbTier(orb.value);
    const bob = orb.collecting ? 0 : Math.sin(time * 3 + orb.phase) * 2;
    const pulse = orb.pulse > 0 ? 1 + orb.pulse * 1.6 : 1;
    const r = tier.radius * pulse;

    ctx.fillStyle = tier.glow;
    ctx.beginPath();
    ctx.arc(sx, sy + bob, r * 1.9, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = tier.core;
    ctx.beginPath();
    ctx.arc(sx, sy + bob, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
    ctx.beginPath();
    ctx.arc(sx - r * 0.35, sy + bob - r * 0.35, Math.max(1.5, r * 0.3), 0, Math.PI * 2);
    ctx.fill();
  }
}
