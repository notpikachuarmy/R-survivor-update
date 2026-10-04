const WORLD_CHUNK_SIZE = 1024;
// Distancia (en chunks) a partir de la cual se descargan chunks lejanos.
// Los chunks son deterministas con la semilla, así que si vuelves se regeneran idénticos.
const WORLD_CHUNK_UNLOAD_DISTANCE = 5;

let worldChunks = new Map();

// Semilla del mundo: cambia en cada partida (ver resetWorld) para que
// ríos, bosques, obstáculos y decoraciones sean distintos cada vez.
let WORLD_SEED = (Math.random() * 0xFFFFFFFF) >>> 0;

// dt del frame actual, para que la IA de rodeo no dependa de los Hz de la pantalla.
let worldFrameDt = 1 / 60;

const WORLD_OBJECTS = {
  obstacles: {
    rock: {
      id: "rock",
      biome: "plains",
      sprite: () => Assets.obstacles.rock,
      width: 48,
      height: 48,
      collision: 20
    },
    bush: {
      id: "bush",
      biome: "plains",
      sprite: () => Assets.obstacles.bush,
      width: 48,
      height: 48,
      collision: 18
    },
    tree: {
      id: "tree",
      biome: "plains",
      sprite: () => Assets.obstacles.tree,
      width: 64,
      height: 96,
      collision: 18
    },
    treeForest1: {
      id: "treeForest1",
      biome: "forest",
      sprite: () => Assets.obstacles.treeForest1,
      width: 64,
      height: 96,
      collision: 20
    },
    treeForest2: {
      id: "treeForest2",
      biome: "forest",
      sprite: () => Assets.obstacles.treeForest2,
      width: 64,
      height: 96,
      collision: 20
    },
    treeForest3: {
      id: "treeForest3",
      biome: "forest",
      sprite: () => Assets.obstacles.treeForest3,
      width: 64,
      height: 96,
      collision: 20
    }
  },

  decorations: {
    grass1: {
      id: "grass1",
      biome: "plains",
      sprite: () => Assets.decorations.grass1,
      width: 32,
      height: 32
    },
    grass2: {
      id: "grass2",
      biome: "plains",
      sprite: () => Assets.decorations.grass2,
      width: 32,
      height: 32
    },
    flower1: {
      id: "flower1",
      biome: "plains",
      sprite: () => Assets.decorations.flower1,
      width: 32,
      height: 32
    },
    flowerBlue: {
      id: "flowerBlue",
      biome: "forest",
      sprite: () => Assets.decorations.flowerBlue,
      width: 32,
      height: 32
    },
    flowerRed: {
      id: "flowerRed",
      biome: "forest",
      sprite: () => Assets.decorations.flowerRed,
      width: 32,
      height: 32
    },
    flowerYellow: {
      id: "flowerYellow",
      biome: "forest",
      sprite: () => Assets.decorations.flowerYellow,
      width: 32,
      height: 32
    },
    bushSmall: {
      id: "bushSmall",
      biome: "forest",
      sprite: () => Assets.decorations.bushSmall,
      width: 32,
      height: 32
    }
  }
};

function getWorldTemplatesForBiome(kind, biome) {
  const ids = kind === "obstacles"
    ? getBiomeObstacleIds(biome)
    : getBiomeDecorationIds(biome);

  return ids
    .map(id => WORLD_OBJECTS[kind][id])
    .filter(Boolean);
}

function getRandomAmount(range, random) {
  const min = range?.min || 0;
  const max = range?.max ?? min;
  return min + Math.floor(random() * (max - min + 1));
}

function getChunkKey(chunkX, chunkY) {
  return `${chunkX},${chunkY}`;
}

function seededRandom(seed) {
  let value = seed;

  return function () {
    value |= 0;
    value = value + 0x6D2B79F5 | 0;

    let t = Math.imul(value ^ value >>> 15, 1 | value);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;

    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function getSeedFromChunk(chunkX, chunkY) {
  // Math.imul evita perder precisión con coordenadas grandes.
  return Math.imul(chunkX, 92837111) ^ Math.imul(chunkY, 689287499) ^ WORLD_SEED;
}

function getRandomFromArray(array, random) {
  return array[Math.floor(random() * array.length)];
}


function isWorldObjectPlacementValid(template, x, y, biomeId) {
  // Evita que decoraciones/obstáculos de planicie o bosque aparezcan encima del río
  // o invadan visualmente sus orillas. El río usa su propio bioma limpio.
  if (biomeId === "river") return false;

  const halfW = (template.width || 32) / 2;
  const halfH = (template.height || 32) / 2;
  const padding = 12;

  const checks = [
    [x, y],
    [x - halfW - padding, y],
    [x + halfW + padding, y],
    [x, y - halfH - padding],
    [x, y + halfH + padding],
    [x - halfW - padding, y - halfH - padding],
    [x + halfW + padding, y - halfH - padding],
    [x - halfW - padding, y + halfH + padding],
    [x + halfW + padding, y + halfH + padding]
  ];

  // Usa la caché por tiles: antes cada chunk nuevo hacía miles de cálculos de bioma
  // y provocaba tirones al explorar.
  const getId = typeof getCachedBiomeAt === "function"
    ? (cx, cy) => getCachedBiomeAt(cx, cy)?.id || "plains"
    : getBiomeIdAt;

  return checks.every(([checkX, checkY]) => getId(checkX, checkY) === biomeId);
}

function createChunk(chunkX, chunkY) {
  const random = seededRandom(getSeedFromChunk(chunkX, chunkY));

  const baseX = chunkX * WORLD_CHUNK_SIZE;
  const baseY = chunkY * WORLD_CHUNK_SIZE;
  const centerX = baseX + WORLD_CHUNK_SIZE / 2;
  const centerY = baseY + WORLD_CHUNK_SIZE / 2;
  const biome = getBiomeAt(centerX, centerY);
  const biomeId = biome?.id || "plains";

  const chunk = {
    x: chunkX,
    y: chunkY,
    biomeId,
    obstacles: [],
    decorations: []
  };

  const decorationTemplates = getWorldTemplatesForBiome("decorations", biome);
  const obstacleTemplates = getWorldTemplatesForBiome("obstacles", biome);

  const decorationAmount = getRandomAmount(getBiomeObjectAmount(biome, "decoration"), random);
  const obstacleAmount = getRandomAmount(getBiomeObjectAmount(biome, "obstacle"), random);

  for (let i = 0, attempts = 0; chunk.decorations.length < decorationAmount && decorationTemplates.length && attempts < decorationAmount * 12; attempts++) {
    const template = getRandomFromArray(decorationTemplates, random);
    const x = baseX + random() * WORLD_CHUNK_SIZE;
    const y = baseY + random() * WORLD_CHUNK_SIZE;

    if (!isWorldObjectPlacementValid(template, x, y, biomeId)) continue;

    chunk.decorations.push({
      id: template.id,
      sprite: template.sprite(),
      x,
      y,
      width: template.width,
      height: template.height,
      rotation: random() * Math.PI * 2
    });
  }

  for (let i = 0, attempts = 0; chunk.obstacles.length < obstacleAmount && obstacleTemplates.length && attempts < obstacleAmount * 16; attempts++) {
    const template = getRandomFromArray(obstacleTemplates, random);
    const x = baseX + random() * WORLD_CHUNK_SIZE;
    const y = baseY + random() * WORLD_CHUNK_SIZE;

    if (!isWorldObjectPlacementValid(template, x, y, biomeId)) continue;

    const obstacle = {
      id: template.id,
      sprite: template.sprite(),
      x,
      y,
      width: template.width,
      height: template.height,
      size: template.collision * 2,
      collision: template.collision
    };

    let valid = true;

    for (const other of chunk.obstacles) {
      const minDistance = obstacle.collision + other.collision + 40;
      const dist = Math.hypot(obstacle.x - other.x, obstacle.y - other.y);

      if (dist < minDistance) {
        valid = false;
        break;
      }
    }

    if (valid) {
      chunk.obstacles.push(obstacle);
    }
  }

  return chunk;
}

function getChunk(chunkX, chunkY) {
  const key = getChunkKey(chunkX, chunkY);

  if (!worldChunks.has(key)) {
    worldChunks.set(key, createChunk(chunkX, chunkY));
  }

  return worldChunks.get(key);
}

function updateWorldAroundPlayer() {
  const playerChunkX = Math.floor(player.x / WORLD_CHUNK_SIZE);
  const playerChunkY = Math.floor(player.y / WORLD_CHUNK_SIZE);

  for (let y = playerChunkY - 2; y <= playerChunkY + 2; y++) {
    for (let x = playerChunkX - 2; x <= playerChunkX + 2; x++) {
      getChunk(x, y);
    }
  }

  // Descarga chunks muy lejanos para que la memoria no crezca sin límite en partidas largas.
  if (worldChunks.size > 160) {
    for (const [key, chunk] of worldChunks) {
      if (
        Math.abs(chunk.x - playerChunkX) > WORLD_CHUNK_UNLOAD_DISTANCE ||
        Math.abs(chunk.y - playerChunkY) > WORLD_CHUNK_UNLOAD_DISTANCE
      ) {
        worldChunks.delete(key);
      }
    }
  }
}

function getVisibleChunks() {
  const minChunkX = Math.floor((camera.x - canvas.width / 2) / WORLD_CHUNK_SIZE) - 1;
  const maxChunkX = Math.floor((camera.x + canvas.width / 2) / WORLD_CHUNK_SIZE) + 1;

  const minChunkY = Math.floor((camera.y - canvas.height / 2) / WORLD_CHUNK_SIZE) - 1;
  const maxChunkY = Math.floor((camera.y + canvas.height / 2) / WORLD_CHUNK_SIZE) + 1;

  const result = [];

  for (let y = minChunkY; y <= maxChunkY; y++) {
    for (let x = minChunkX; x <= maxChunkX; x++) {
      result.push(getChunk(x, y));
    }
  }

  return result;
}

function getNearbyObstacles() {
  const chunks = getVisibleChunks();
  const result = [];

  for (const chunk of chunks) {
    result.push(...chunk.obstacles);
  }

  return result;
}

// Radio de colisión máximo de cualquier obstáculo (para saber qué chunks mirar).
const MAX_OBSTACLE_COLLISION = Math.max(
  ...Object.values(WORLD_OBJECTS.obstacles).map(o => o.collision || 0)
);

function isCollidingWithObstacle(entity) {
  const entityRadius = entity.collision || entity.size * 0.35 || 0;
  const reach = entityRadius + MAX_OBSTACLE_COLLISION;
  const ignoreRocks = entity === player && player.drillActive;

  // Antes se recorrían TODOS los obstáculos de todos los chunks visibles
  // (creando arrays nuevos) en cada comprobación de cada enemigo.
  // Ahora solo se miran los chunks que toca la entidad (normalmente 1, como mucho 4).
  const minChunkX = Math.floor((entity.x - reach) / WORLD_CHUNK_SIZE);
  const maxChunkX = Math.floor((entity.x + reach) / WORLD_CHUNK_SIZE);
  const minChunkY = Math.floor((entity.y - reach) / WORLD_CHUNK_SIZE);
  const maxChunkY = Math.floor((entity.y + reach) / WORLD_CHUNK_SIZE);

  for (let cy = minChunkY; cy <= maxChunkY; cy++) {
    for (let cx = minChunkX; cx <= maxChunkX; cx++) {
      const obstacles = getChunk(cx, cy).obstacles;

      for (let i = 0; i < obstacles.length; i++) {
        const obstacle = obstacles[i];
        if (ignoreRocks && obstacle.id === "rock") continue;

        const dx = entity.x - obstacle.x;
        const dy = entity.y - obstacle.y;
        const minDist = entityRadius + obstacle.collision;

        if (dx * dx + dy * dy < minDist * minDist) {
          return true;
        }
      }
    }
  }

  return false;
}

function isCollidingWithRiverWater(entity) {
  if (entity !== player) return false;
  if (entity.canWalkOnRiver || entity.canCrossRiver || entity.laprasFloatActive) return false;
  if (typeof isRiverWaterAt !== "function") return false;

  const radius = entity.collision || entity.size * 0.35 || 14;
  const checks = [
    [entity.x, entity.y],
    [entity.x + radius, entity.y],
    [entity.x - radius, entity.y],
    [entity.x, entity.y + radius],
    [entity.x, entity.y - radius]
  ];

  return checks.some(([x, y]) => isRiverWaterAt(x, y));
}

function isBlockedByWorld(entity) {
  return (
    isCollidingWithObstacle(entity) ||
    isCollidingWithSenseiPillar(entity) ||
    isCollidingWithRiverWater(entity)
  );
}

function tryMoveEntity(entity, dx, dy) {
  entity.x += dx;
  entity.y += dy;

  if (isBlockedByWorld(entity)) {
    entity.x -= dx;
    entity.y -= dy;
    return false;
  }

  return true;
}

function moveWithObstacleCollision(entity, dx, dy) {
  if (!dx && !dy) return false;

  const oldX = entity.x;
  const oldY = entity.y;

  // 1) Intento normal.
  if (tryMoveEntity(entity, dx, dy)) {
    entity.visualMoving = true;
    return true;
  }

  // 2) Deslizamiento por ejes: evita que se queden pegados en esquinas simples.
  entity.x = oldX;
  entity.y = oldY;

  const movedX = dx !== 0 && tryMoveEntity(entity, dx, 0);

  if (!movedX) {
    entity.x = oldX;
    entity.y = oldY;
  }

  const afterX = entity.x;
  const afterY = entity.y;
  const movedY = dy !== 0 && tryMoveEntity(entity, 0, dy);

  if (movedX || movedY) {
    entity.visualMoving = true;
    return true;
  }

  entity.x = oldX;
  entity.y = oldY;

  // 3) Sólo para IA móvil: pequeño rodeo lateral cuando el objetivo está detrás
  // de un obstáculo. El jugador conserva control exacto.
  if (entity !== player) {
    const len = Math.hypot(dx, dy) || 1;
    const nx = dx / len;
    const ny = dy / len;
    const step = len * 0.9;

    entity.obstacleAvoidSide ||= Math.random() < 0.5 ? -1 : 1;
    entity.obstacleAvoidTimer = (entity.obstacleAvoidTimer || 0) - worldFrameDt;

    if (entity.obstacleAvoidTimer <= 0) {
      entity.obstacleAvoidSide *= -1;
      entity.obstacleAvoidTimer = 0.25 + Math.random() * 0.35;
    }

    const side = entity.obstacleAvoidSide;
    const candidates = [
      [-ny * side * step, nx * side * step],
      [ny * side * step, -nx * side * step],
      [(nx - ny * side * 0.85) * step, (ny + nx * side * 0.85) * step],
      [(nx + ny * side * 0.85) * step, (ny - nx * side * 0.85) * step]
    ];

    for (const [avoidX, avoidY] of candidates) {
      entity.x = oldX;
      entity.y = oldY;

      if (tryMoveEntity(entity, avoidX, avoidY)) {
        entity.visualMoving = true;
        return true;
      }
    }
  }

  entity.x = oldX;
  entity.y = oldY;
  entity.visualMoving = false;
  return false;
}

function drawWorldSprite(object) {
  const sx = worldToScreenX(object.x);
  const sy = worldToScreenY(object.y);
  const halfW = object.width / 2;
  const halfH = object.height / 2;

  // No dibujar lo que está fuera de pantalla.
  if (sx + halfW < 0 || sx - halfW > canvas.width || sy + halfH < 0 || sy - halfH > canvas.height) {
    return;
  }

  ctx.drawImage(
    object.sprite,
    sx - object.width / 2,
    sy - object.height / 2,
    object.width,
    object.height
  );
}

function drawDecorations() {
  const chunks = getVisibleChunks();

  for (const chunk of chunks) {
    for (const decoration of chunk.decorations) {
      drawWorldSprite(decoration);
    }
  }
}

function drawObstacles() {
  const chunks = getVisibleChunks();

  for (const chunk of chunks) {
    for (const obstacle of chunk.obstacles) {
      drawWorldSprite(obstacle);
    }
  }
}

function drawWorld() {
  drawDecorations();
  drawObstacles();
}

function resetWorld() {
  WORLD_SEED = (Math.random() * 0xFFFFFFFF) >>> 0;
  worldChunks = new Map();
  if (typeof resetBiomeCache === "function") resetBiomeCache();
}
