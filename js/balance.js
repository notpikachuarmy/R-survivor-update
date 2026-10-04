/*
 * Equilibrio y estabilidad.
 * Todos los números que afectan a la dificultad y al rendimiento están aquí,
 * para poder ajustarlos sin buscar por todo game.js.
 */

const BALANCE = {
  spawn: {
    // Segundos entre apariciones al empezar la partida.
    startInterval: 1.35,
    // Intervalo mínimo (lo más rápido que llegan a salir enemigos).
    // Antes era 0.22 y se alcanzaba al minuto y medio. Ahora 0.36, hacia el minuto 4.
    minInterval: 0.36,
    // Cuánto se reduce el intervalo por segundo de partida (antes 0.01).
    rampPerSecond: 0.004,
    // Multiplicador del intervalo durante la horda (antes 0.45 → más del doble de enemigos).
    hordeMultiplier: 0.55
  },

  limits: {
    // Máximo de enemigos hostiles vivos a la vez. Jefes, sensei, mímicos y
    // eventos especiales no cuentan para bloquear su propia aparición.
    maxEnemies: 170,
    // Límite por tipo (los slimes nube orbitan y nunca se alejan, así que se acumulaban).
    perType: {
      cloudSlime: 5,
      cloudSlimeGiant: 2,
      magneton: 4,
      fireSlimeGiant: 1
    },
    // Barreras de nube activas a la vez (las más viejas desaparecen primero).
    maxSlimeCloudWalls: 18,
    // Nubes de lluvia activas a la vez.
    maxSlimeRainClouds: 3,
    // Partículas visuales de lluvia (ya no tienen colisión: solo decoran).
    maxSlimeRainParticles: 160,
    // Enemigos normales más lejos que esto se eliminan (no dan XP): se quedaron atrás.
    despawnDistance: 2100
  },

  xp: {
    // Radio de recogida base y con el Imán.
    pickupRange: 70,
    magnetPickupRange: 230,
    // Las bolitas a menos de esta distancia se fusionan en una sola.
    mergeRadius: 56,
    // Si hay más bolitas que esto en el mapa, las nuevas se suman a la más cercana.
    maxOrbs: 220,
    // Velocidad a la que vuelan hacia el jugador al recogerlas.
    attractSpeed: 520
  },

  // Dificultad creciente: cada "fase" (5 minutos) la partida se endurece.
  scaling: {
    stageSeconds: 300,
    // +35 al máximo de enemigos por fase (170 → 205 → 240 → 275...).
    maxEnemiesPerStage: 35,
    maxEnemiesCap: 400,
    // El intervalo entre apariciones se multiplica por esto en cada fase (0.8 = 25% más enemigos).
    spawnIntervalPerStage: 0.8,
    // Nunca bajará de aquí (≈ 8 enemigos por segundo, sin contar hordas).
    spawnIntervalFloor: 0.12,
    // +10% de vida y +5% de daño de los enemigos por fase.
    enemyLifePerStage: 0.10,
    enemyDamagePerStage: 0.05
  },

  items: {
    // Repelente: multiplica el tiempo entre apariciones y reduce el límite de enemigos.
    repellentIntervalMultiplier: 1.3,
    repellentMaxEnemiesMultiplier: 0.8,
    // Manga de Berserk: daño plano extra para TODOS tus ataques.
    berserkDamageBonus: 2,
    // Cascabel Concha: cura X PS cada N enemigos derrotados.
    shellBellKillsPerHeal: 15,
    shellBellHeal: 4
  }
};

// Enemigos que nunca se eliminan por distancia y que no se bloquean por el límite.
const SPECIAL_ENEMY_IDS = new Set([
  "mimic",
  "rhyhorn",
  "rhyhornBoss",
  "sandyShocks",
  "sandyShocksBoss",
  "goldSlime",
  "goldSlimeGiant",
  "delibird"
]);

function isSpecialEnemy(enemy) {
  return Boolean(
    enemy &&
    (enemy.isBoss || enemy.senseiId || SPECIAL_ENEMY_IDS.has(enemy.id))
  );
}

let currentDifficultyStage = 0;

// Fase de dificultad actual: 0 los primeros 5 minutos, 1 de 5 a 10, etc.
function getDifficultyStage() {
  return Math.floor((gameTime || 0) / BALANCE.scaling.stageSeconds);
}

function updateDifficultyStage() {
  const stage = getDifficultyStage();
  if (stage > currentDifficultyStage) {
    currentDifficultyStage = stage;
    showEventMessage(`¡Los enemigos se vuelven más fuertes y numerosos! (Fase ${stage + 1})`);
  }
}

// Vida extra de los enemigos según la fase (se aplica al aparecer).
function applyDifficultyScalingToEnemy(enemy) {
  if (!enemy || enemy.isAlly || enemy.difficultyScaled) return enemy;
  const stage = getDifficultyStage();
  if (stage > 0) {
    const multiplier = 1 + stage * BALANCE.scaling.enemyLifePerStage;
    enemy.life = Math.ceil(enemy.life * multiplier);
    enemy.maxLife = Math.ceil(enemy.maxLife * multiplier);
  }
  enemy.difficultyScaled = true;
  return enemy;
}

function getDifficultyDamageMultiplier() {
  return 1 + getDifficultyStage() * BALANCE.scaling.enemyDamagePerStage;
}

function getSpawnInterval() {
  const cfg = BALANCE.spawn;
  let interval = Math.max(cfg.minInterval, cfg.startInterval - gameTime * cfg.rampPerSecond);

  const stage = getDifficultyStage();
  if (stage > 0) {
    interval = Math.max(
      BALANCE.scaling.spawnIntervalFloor,
      interval * Math.pow(BALANCE.scaling.spawnIntervalPerStage, stage)
    );
  }

  if (hordeActive) interval *= cfg.hordeMultiplier;
  if (player.repellentActive) interval *= BALANCE.items.repellentIntervalMultiplier;

  return interval;
}

function getMaxEnemies() {
  let max = Math.min(
    BALANCE.scaling.maxEnemiesCap,
    BALANCE.limits.maxEnemies + getDifficultyStage() * BALANCE.scaling.maxEnemiesPerStage
  );
  if (player.repellentActive) max = Math.floor(max * BALANCE.items.repellentMaxEnemiesMultiplier);
  return max;
}

function countHostileEnemies(typeId = null) {
  let count = 0;

  for (const enemy of enemies) {
    if (enemy.dead || enemy.isAlly) continue;
    if (typeId && enemy.id !== typeId) continue;
    count++;
  }

  return count;
}

// ¿Cabe otro enemigo normal en pantalla?
function hasRoomForRegularEnemy() {
  return countHostileEnemies() < getMaxEnemies();
}

// ¿Se ha llegado al límite de este tipo concreto?
function isEnemyTypeAtLimit(typeId) {
  const limit = BALANCE.limits.perType[typeId];
  if (limit === undefined) return false;
  return countHostileEnemies(typeId) >= limit;
}

function despawnFarEnemies() {
  const maxDist = BALANCE.limits.despawnDistance;
  const maxDistSq = maxDist * maxDist;
  let removed = false;

  for (const enemy of enemies) {
    if (enemy.dead || enemy.isAlly || isSpecialEnemy(enemy)) continue;

    const dx = enemy.x - player.x;
    const dy = enemy.y - player.y;

    if (dx * dx + dy * dy > maxDistSq) {
      enemy.dead = true;
      enemy.despawned = true;
      removed = true;
    }
  }

  if (removed) enemies = enemies.filter(enemy => !enemy.dead);
}

// Recorta arrays de efectos para que nunca crezcan sin límite.
function trimOldest(array, max) {
  if (array.length > max) array.splice(0, array.length - max);
}
