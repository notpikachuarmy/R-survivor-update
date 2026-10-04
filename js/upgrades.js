const UPGRADE_POOL = [
  {
    id: "stone_damage",
    weaponId: "stone",
    itemName: "Piedra",
    name: "Piedra más fuerte",
    description: "+1 daño a todas las piedras.",
    apply() {
      player.weapons.stone.damage += 1;
    }
  },
  {
    id: "stone_extra_projectile",
    weaponId: "stone",
    itemName: "Piedra",
    name: "Proyectil extra",
    description: "Lanzas una piedra adicional.",
    apply() {
      player.weapons.stone.projectiles += 1;
    }
  },
  {
    id: "stone_fire_rate",
    weaponId: "stone",
    itemName: "Piedra",
    name: "Lanzamiento rápido",
    description: "Reduces el tiempo entre lanzamientos.",
    apply() {
      player.weapons.stone.cooldown = Math.max(0.25, player.weapons.stone.cooldown - 0.1);
    }
  },
  {
    id: "stone_bounce",
    weaponId: "stone",
    itemName: "Piedra",
    name: "Rebote",
    description: "Las piedras pueden saltar a otro enemigo.",
    apply() {
      player.weapons.stone.bounces += 1;
    }
  },
  {
    id: "ruby_stone",
    weaponId: "stone",
    itemName: "Piedra",
    name: "Piedra rubí",
    description: "Pequeña probabilidad de lanzar una piedra de mucho daño.",
    apply() {
      player.weapons.stone.specialChance += 0.05;
      player.weapons.stone.specialDamage += 2;
    }
  },
  {
    id: "stone_size",
    weaponId: "stone",
    itemName: "Piedra",
    name: "Piedra grande",
    description: "Aumenta el tamaño de las piedras.",
    apply() {
      player.weapons.stone.size += 4;
    }
  },

  {
    id: "patataBoom_damage",
    weaponId: "patataBoom",
    itemName: "PatataBoom",
    name: "Explosión potente",
    description: "+5 daño a las minas PatataBoom.",
    apply() {
      player.weapons.patataBoom.damage += 5;
    }
  },
  {
    id: "patataBoom_radius",
    weaponId: "patataBoom",
    itemName: "PatataBoom",
    name: "Radio explosivo",
    description: "Aumenta el radio de explosión.",
    apply() {
      player.weapons.patataBoom.radius += 20;
    }
  },
  {
    id: "patataBoom_extra_mine",
    weaponId: "patataBoom",
    itemName: "PatataBoom",
    name: "Mina extra",
    description: "Coloca una mina adicional.",
    apply() {
      player.weapons.patataBoom.mines += 1;
    }
  },
  {
    id: "patataBoom_fire_rate",
    weaponId: "patataBoom",
    itemName: "PatataBoom",
    name: "Plantación rápida",
    description: "Reduce la cadencia entre minas.",
    apply() {
      player.weapons.patataBoom.cooldown = Math.max(1.2, player.weapons.patataBoom.cooldown - 0.3);
    }
  },
  {
    id: "patataBoom_chain",
    weaponId: "patataBoom",
    itemName: "PatataBoom",
    name: "Explosión en cadena",
    description: "Las minas pueden activar otras minas cercanas.",
    unique: true,
    apply() {
      player.weapons.patataBoom.chain = true;
    }
  },

  // --- Bastón de Mariposamancia ---
  {
    id: "butterflyStaff_count",
    weaponId: "butterflyStaff",
    itemName: "Bastón de Mariposamancia",
    name: "Enjambre",
    description: "+1 mariposa.",
    canApply: (p, weapon) => weapon.count < 8,
    apply() { player.weapons.butterflyStaff.count += 1; }
  },
  {
    id: "butterflyStaff_damage",
    weaponId: "butterflyStaff",
    itemName: "Bastón de Mariposamancia",
    name: "Alas afiladas",
    description: "+2 daño de las mariposas.",
    apply() { player.weapons.butterflyStaff.damage += 2; }
  },
  {
    id: "butterflyStaff_duration",
    weaponId: "butterflyStaff",
    itemName: "Bastón de Mariposamancia",
    name: "Metamorfosis duradera",
    description: "Las mariposas duran 1,5 segundos más.",
    canApply: (p, weapon) => weapon.duration < 15,
    apply() {
      player.weapons.butterflyStaff.duration += 1.5;
      for (const butterfly of butterflies) butterfly.life += 1.5;
    }
  },
  {
    id: "butterflyStaff_speed",
    weaponId: "butterflyStaff",
    itemName: "Bastón de Mariposamancia",
    name: "Vuelo nervioso",
    description: "Las mariposas vuelan más rápido y reaparecen antes.",
    canApply: (p, weapon) => weapon.speed < 520,
    apply() {
      const weapon = player.weapons.butterflyStaff;
      weapon.speed += 45;
      weapon.respawnCooldown = Math.max(0.6, weapon.respawnCooldown - 0.2);
    }
  },
  {
    id: "butterflyStaff_chain",
    weaponId: "butterflyStaff",
    itemName: "Bastón de Mariposamancia",
    name: "Polvo eléctrico",
    description: "Las mariposas se unen con una cadena relámpago que daña a los enemigos que la tocan.",
    unique: true,
    canApply: (p, weapon) => weapon.chain !== true && weapon.count >= 2,
    apply() { player.weapons.butterflyStaff.chain = true; }
  },
  {
    id: "butterflyStaff_chain_damage",
    weaponId: "butterflyStaff",
    itemName: "Bastón de Mariposamancia",
    name: "Alto voltaje",
    description: "+3 daño de la cadena relámpago.",
    canApply: (p, weapon) => weapon.chain === true,
    apply() { player.weapons.butterflyStaff.chainDamage += 3; }
  },

  { id: "panPaloma_damage", weaponId: "panPaloma", itemName: "Pan Paloma", name: "Miga contundente", description: "+5 daño de explosión.", apply() { player.weapons.panPaloma.damage += 5; } },
  { id: "panPaloma_extra", weaponId: "panPaloma", itemName: "Pan Paloma", name: "Bandada de pan", description: "Permite tener un Pan Paloma adicional en el mapa.", apply() { player.weapons.panPaloma.maxActive += 1; } },
  { id: "panPaloma_cooldown", weaponId: "panPaloma", itemName: "Pan Paloma", name: "Horno rápido", description: "Reduce el tiempo entre invocaciones.", apply() { player.weapons.panPaloma.cooldown = Math.max(2.2, player.weapons.panPaloma.cooldown - 0.55); } },
  { id: "panPaloma_speed", weaponId: "panPaloma", itemName: "Pan Paloma", name: "Vuelo veloz", description: "Aumenta la velocidad de vuelo.", apply() { player.weapons.panPaloma.speed += 45; for (const p of panPalomas) p.speed += 45; } },
  { id: "panPaloma_distance", weaponId: "panPaloma", itemName: "Pan Paloma", name: "Vuelo de largo alcance", description: "Puede separarse más del jugador.", apply() { player.weapons.panPaloma.maxDistance += 120; for (const p of panPalomas) p.maxDistance += 120; } },
  { id: "panPaloma_double_explosion", weaponId: "panPaloma", itemName: "Pan Paloma", name: "Doble horneado", description: "Cada Pan Paloma explota dos veces.", unique: true, apply() { player.weapons.panPaloma.explosions = 2; for (const p of panPalomas) p.explosions = 2; } },
  {
  id: "pokeball_more_allies",
  weaponId: "pokeball",
  itemName: "Poké Ball",
  name: "Más Poké Balls",
  description: "Puedes controlar un aliado adicional.",
  apply() {
    player.maxAllies += 1;
  }
},
{
  id: "pokeball_damage",
  weaponId: "pokeball",
  itemName: "Poké Ball",
  name: "Entrenamiento aliado",
  description: "Los aliados hacen un 20% más de daño.",
  apply() {
    player.allyDamageMultiplier += 0.20;
  }
},
{
  id: "pokeball_life",
  weaponId: "pokeball",
  itemName: "Poké Ball",
  name: "Aliados resistentes",
  description: "Los aliados tienen un 25% más de vida.",
  apply() {
    player.allyLifeMultiplier += 0.25;

    for (const ally of getAllies()) {
      ally.maxLife = Math.ceil(ally.maxLife * 1.25);
      ally.life = Math.ceil(ally.life * 1.25);
    }
  }
},
{
  id: "pokeball_speed",
  weaponId: "pokeball",
  itemName: "Poké Ball",
  name: "Aliados veloces",
  description: "Los aliados se mueven un 15% más rápido.",
  apply() {
    player.allySpeedMultiplier += 0.15;

    for (const ally of getAllies()) {
      ally.speed *= 1.15;
    }
  }
},
  {
  id: "watermelonSeedTurret_damage",
  weaponId: "watermelonSeedTurret",
  itemName: "Torreta semillas de sandía",
  name: "Semillas más duras",
  description: "+3 daño a las semillas de la torreta.",
  apply() {
    player.weapons.watermelonSeedTurret.damage += 3;
  }
},
{
  id: "watermelonSeedTurret_extra",
  weaponId: "watermelonSeedTurret",
  itemName: "Torreta semillas de sandía",
  name: "Torreta extra",
  description: "Puedes tener una torreta adicional activa.",
  apply() {
    player.weapons.watermelonSeedTurret.maxTurrets += 1;
  }
},
{
  id: "watermelonSeedTurret_fire_rate",
  weaponId: "watermelonSeedTurret",
  itemName: "Torreta semillas de sandía",
  name: "Disparo rápido",
  description: "Las torretas disparan más rápido.",
  apply() {
    player.weapons.watermelonSeedTurret.fireCooldown =
      Math.max(0.25, player.weapons.watermelonSeedTurret.fireCooldown - 0.1);
  }
},
{
  id: "watermelonSeedTurret_duration",
  weaponId: "watermelonSeedTurret",
  itemName: "Torreta semillas de sandía",
  name: "Torreta resistente",
  description: "Las torretas duran más tiempo.",
  apply() {
    player.weapons.watermelonSeedTurret.duration += 2;
  }
},
{
  id: "watermelonSeedTurret_range",
  weaponId: "watermelonSeedTurret",
  itemName: "Torreta semillas de sandía",
  name: "Mirilla vegetal",
  description: "Las torretas tienen más alcance.",
  apply() {
    player.weapons.watermelonSeedTurret.range += 45;
  }
},
{
  id: "watermelonSeedTurret_cooldown",
  weaponId: "watermelonSeedTurret",
  itemName: "Torreta semillas de sandía",
  name: "Plantación rápida",
  description: "Las torretas reaparecen antes.",
  apply() {
    player.weapons.watermelonSeedTurret.respawnCooldown =
    Math.max(2, player.weapons.watermelonSeedTurret.respawnCooldown - 0.5);
  }
},
  {
  id: "chikoritaLeaf_damage",
  weaponId: "chikoritaLeaf",
  itemName: "Hoja de Chikorita",
  name: "Hoja más afilada",
  description: "+3 daño a las hojas.",
  apply() {
    player.weapons.chikoritaLeaf.damage += 3;
  }
},
{
  id: "chikoritaLeaf_extra_leaf",
  weaponId: "chikoritaLeaf",
  itemName: "Hoja de Chikorita",
  name: "Hoja extra",
  description: "Lanzas una hoja adicional.",
  apply() {
    player.weapons.chikoritaLeaf.leaves += 1;
  }
},
{
  id: "chikoritaLeaf_speed",
  weaponId: "chikoritaLeaf",
  itemName: "Hoja de Chikorita",
  name: "Viento cortante",
  description: "Las hojas viajan más rápido.",
  apply() {
    player.weapons.chikoritaLeaf.speed += 90;
  }
},
{
  id: "chikoritaLeaf_pierce",
  weaponId: "chikoritaLeaf",
  itemName: "Hoja de Chikorita",
  name: "Perforación vegetal",
  description: "Las hojas atraviesan un enemigo adicional.",
  apply() {
    player.weapons.chikoritaLeaf.pierce += 1;
  }
},
{
  id: "chikoritaLeaf_size",
  weaponId: "chikoritaLeaf",
  itemName: "Hoja de Chikorita",
  name: "Hoja grande",
  description: "Aumenta el tamaño de las hojas.",
  apply() {
    player.weapons.chikoritaLeaf.size += 4;
    player.weapons.chikoritaLeaf.collision += 2;
  }
},
{
  id: "chikoritaLeaf_fire_rate",
  weaponId: "chikoritaLeaf",
  itemName: "Hoja de Chikorita",
  name: "Lluvia de hojas",
  description: "Reduce el tiempo entre lanzamientos.",
  apply() {
    player.weapons.chikoritaLeaf.cooldown =
      Math.max(0.35, player.weapons.chikoritaLeaf.cooldown - 0.12);
  }
},
  {
  id: "sockRock_damage",
  weaponId: "sockRock",
  itemName: "Calcetín con Piedra",
  name: "Más relleno",
  description: "+5 daño al Calcetín con Piedra.",
  apply() {
    player.weapons.sockRock.damage += 5;
  }
},

{
  id: "sockRock_range",
  weaponId: "sockRock",
  itemName: "Calcetín con Piedra",
  name: "Calcetín más largo",
  description: "Aumenta el alcance del golpe.",
  apply() {
    player.weapons.sockRock.range += 18;
  }
},

{
  id: "sockRock_fire_rate",
  weaponId: "sockRock",
  itemName: "Calcetín con Piedra",
  name: "Muñeca rápida",
  description: "Atacas más rápido con el calcetín.",
  apply() {
    player.weapons.sockRock.cooldown =
      Math.max(0.35, player.weapons.sockRock.cooldown - 0.12);
  }
},

{
  id: "sockRock_size",
  weaponId: "sockRock",
  itemName: "Calcetín con Piedra",
  name: "Calcetín enorme",
  description: "Aumenta el tamaño del golpe.",
  apply() {
    player.weapons.sockRock.size += 12;
    player.weapons.sockRock.collision += 6;
  }
},
  {
  id: "firePlort_duration",
  weaponId: "firePlort",
  itemName: "Plort de Fuego",
  name: "Llama persistente",
  description: "La quemadura dura más tiempo.",
  apply() {
    player.burnDuration += 1;
  }
},

{
  id: "firePlort_damage",
  weaponId: "firePlort",
  itemName: "Plort de Fuego",
  name: "Llama intensa",
  description: "+1 daño por tick de quemadura.",
  apply() {
    player.burnDamage += 1;
  }
},

{
  id: "firePlort_tick_rate",
  weaponId: "firePlort",
  itemName: "Plort de Fuego",
  name: "Combustión rápida",
  description: "La quemadura hace daño más a menudo.",
  apply() {
    player.burnTickRate = Math.max(0.35, player.burnTickRate - 0.1);
  }
},

{
  id: "firePlort_chance",
  weaponId: "firePlort",
  itemName: "Plort de Fuego",
  name: "Chispa fácil",
  description: "Aumenta la probabilidad de aplicar quemadura.",
  apply() {
    player.burnChance = Math.min(0.35, player.burnChance + 0.03);
  }
},
  {
  id: "chicken_life",
  weaponId: "chicken",
  itemName: "Gallina",
  name: "Gallina robusta",
  description: "+15 vida a las gallinas.",
  apply() {
    player.chickenLife += 15;

    for (const chicken of chickens) {
      chicken.maxLife += 15;
      chicken.life += 15;
    }
  }
},

{
  id: "chicken_attract_range",
  weaponId: "chicken",
  itemName: "Gallina",
  name: "Cacareo irresistible",
  description: "Aumenta el rango de atracción de slimes.",
  apply() {
    player.chickenAttractRange += 60;

    for (const chicken of chickens) {
      chicken.attractRange += 60;
    }
  }
},

{
  id: "chicken_max",
  weaponId: "chicken",
  itemName: "Gallina",
  name: "Más gallinas",
  description: "+1 gallina máxima.",
  apply() {
    player.chickenMax += 1;
    summonMissingChickens();
  }
},

{
  id: "chicken_spawn_area",
  weaponId: "chicken",
  itemName: "Gallina",
  name: "Corral amplio",
  description: "Las gallinas aparecen en un área más grande alrededor del jugador.",
  apply() {
    player.chickenSpawnRadius += 50;
  }
},

{
  id: "chicken_giant",
  weaponId: "chicken",
  itemName: "Gallina",
  name: "Gallina Gigante",
  description: "Las gallinas tienen 1% de probabilidad de aparecer gigantes.",
  unique: true,
  apply() {
    player.chickenGiantChance = Math.max(player.chickenGiantChance, 0.01);
  }
},
  {
  id: "cursor_damage",
  weaponId: "cursor",
  itemName: "Cursor",
  name: "Clic doloroso",
  description: "+2 daño del Cursor.",
  apply() {
    player.weapons.cursor.damage += 2;
  }
},

{
  id: "cursor_click_speed",
  weaponId: "cursor",
  itemName: "Cursor",
  name: "Doble clic",
  description: "El Cursor hace clic más rápido.",
  apply() {
    player.weapons.cursor.clickCooldown =
      Math.max(1.6, player.weapons.cursor.clickCooldown - 0.15);
  }
},

{
  id: "cursor_count",
  weaponId: "cursor",
  itemName: "Cursor",
  name: "Otro Cursor",
  description: "+1 Cursor.",
  apply() {
    player.weapons.cursor.count += 1;
    createMissingMouseCursors();
  }
},

{
  id: "cursor_range",
  weaponId: "cursor",
  itemName: "Cursor",
  name: "Pantalla ampliada",
  description: "Aumenta el alcance máximo desde el jugador.",
  apply() {
    player.weapons.cursor.range += 120;
  }
},
  {
  id: "rooster_damage",
  weaponId: "rooster",
  itemName: "Gallo de Pelea",
  name: "Pico afilado",
  description: "+4 daño del Gallo.",
  apply() {
    player.roosterDamage += 4;

    for (const rooster of roosters) {
      rooster.damage += 4;
    }
  }
},

{
  id: "rooster_speed",
  weaponId: "rooster",
  itemName: "Gallo de Pelea",
  name: "Gallo veloz",
  description: "+25 velocidad del Gallo.",
  apply() {
    player.roosterSpeed += 25;

    for (const rooster of roosters) {
      rooster.speed += 25;
    }
  }
},

{
  id: "rooster_life",
  weaponId: "rooster",
  itemName: "Gallo de Pelea",
  name: "Cresta resistente",
  description: "+20 vida del Gallo.",
  apply() {
    player.roosterLife += 20;

    for (const rooster of roosters) {
      rooster.maxLife += 20;
      rooster.life += 20;
    }
  }
},

{
  id: "rooster_count",
  weaponId: "rooster",
  itemName: "Gallo de Pelea",
  name: "Más gallos",
  description: "+1 Gallo máximo.",
  apply() {
    player.roosterMax += 1;
    summonMissingRoosters();
  }
},

{
  id: "rooster_giant",
  weaponId: "rooster",
  itemName: "Gallo de Pelea",
  name: "Gallo Gigante",
  description: "Los gallos invocados son más grandes y resistentes.",
  unique: true,
  apply() {
    player.roosterGiantUnlocked = true;

    for (const rooster of roosters) {
      rooster.isGiant = true;
      rooster.width *= 2.2;
      rooster.height *= 2.2;
      rooster.size *= 2.2;
      rooster.collision *= 2.2;
      rooster.maxLife *= 2.2;
      rooster.life *= 2.2;
    }
  }
},

{
  id: "rooster_slime",
  weaponId: "rooster",
  itemName: "Gallo de Pelea",
  name: "Gallo Devoraslimes",
  description: "Cambia de forma y hace mucho más daño contra enemigos slime.",
  unique: true,
  apply() {
    player.roosterSlimeUnlocked = true;

    for (const rooster of roosters) {
      rooster.isSlimeRooster = true;
      rooster.sprite = Assets.allies.roosterSlime;
    }
  }
},
];


// ---------------------------------------------------------------------------
// Máximo de veces que se puede elegir cada mejora en una partida.
// Antes la mayoría no tenían límite y el arma inicial se podía subir sin fin.
// Cuando una mejora llega a su máximo deja de salir; si no queda ninguna,
// sale la opción de curarse con Patatas con alioli.
// ---------------------------------------------------------------------------
const UPGRADE_MAX_STACKS = {
  // Piedra
  stone_damage: 8, stone_extra_projectile: 4, stone_fire_rate: 5,
  stone_bounce: 3, ruby_stone: 4, stone_size: 4,
  // PatataBoom
  patataBoom_damage: 8, patataBoom_radius: 4, patataBoom_extra_mine: 4,
  patataBoom_fire_rate: 6, patataBoom_chain: 1,
  // Bastón de Mariposamancia
  butterflyStaff_count: 6, butterflyStaff_damage: 8, butterflyStaff_duration: 6,
  butterflyStaff_speed: 5, butterflyStaff_chain: 1, butterflyStaff_chain_damage: 5,
  // Pan Paloma
  panPaloma_damage: 8, panPaloma_extra: 3, panPaloma_cooldown: 6,
  panPaloma_speed: 4, panPaloma_distance: 4, panPaloma_double_explosion: 1,
  // Poké Ball
  pokeball_more_allies: 4, pokeball_damage: 5, pokeball_life: 4, pokeball_speed: 3,
  // Torreta
  watermelonSeedTurret_damage: 8, watermelonSeedTurret_extra: 3, watermelonSeedTurret_fire_rate: 5,
  watermelonSeedTurret_duration: 4, watermelonSeedTurret_range: 4, watermelonSeedTurret_cooldown: 6,
  // Hoja de Chikorita
  chikoritaLeaf_damage: 8, chikoritaLeaf_extra_leaf: 5, chikoritaLeaf_speed: 4,
  chikoritaLeaf_pierce: 4, chikoritaLeaf_size: 4, chikoritaLeaf_fire_rate: 6,
  // Calcetín con Piedra
  sockRock_damage: 8, sockRock_range: 5, sockRock_fire_rate: 6, sockRock_size: 4,
  // Plort de Fuego
  firePlort_duration: 5, firePlort_damage: 5, firePlort_tick_rate: 6, firePlort_chance: 10,
  // Gallina
  chicken_life: 5, chicken_attract_range: 4, chicken_max: 4, chicken_spawn_area: 3, chicken_giant: 1,
  // Cursor
  cursor_damage: 8, cursor_click_speed: 3, cursor_count: 4, cursor_range: 4,
  // Gallo de Pelea
  rooster_damage: 8, rooster_speed: 4, rooster_life: 5, rooster_count: 4,
  rooster_giant: 1, rooster_slime: 1
};

// Para mejoras nuevas que se olviden de añadir arriba.
const DEFAULT_UPGRADE_MAX_STACKS = 5;

function getUpgradeMaxStacks(upgrade) {
  if (!upgrade) return DEFAULT_UPGRADE_MAX_STACKS;
  if (upgrade.unique) return 1;
  return UPGRADE_MAX_STACKS[upgrade.id] ?? upgrade.maxStacks ?? DEFAULT_UPGRADE_MAX_STACKS;
}

function getUpgradeStacks(upgradeId) {
  return player.upgradeStacks?.[upgradeId] || 0;
}

// Texto "Nv. 2/8" para las tarjetas de mejora.
function getUpgradeLevelLabel(upgrade) {
  if (!upgrade || upgrade.isFallbackHeal) return "";
  const max = getUpgradeMaxStacks(upgrade);
  return `Nv. ${getUpgradeStacks(upgrade.id) + 1}/${max}`;
}

function registerWeaponUpgrade(weaponId, upgradeId = null, unique = false) {
  if (upgradeId) {
    if (!player.upgradeStacks) player.upgradeStacks = {};
    player.upgradeStacks[upgradeId] = (player.upgradeStacks[upgradeId] || 0) + 1;
  }

  if (!player.weaponUpgradeCounts) {
    player.weaponUpgradeCounts = {};
  }

  if (!player.weaponUpgradeCounts[weaponId]) {
    player.weaponUpgradeCounts[weaponId] = 0;
  }

  player.weaponUpgradeCounts[weaponId]++;

  if (unique && upgradeId) {
    if (!player.uniqueUpgrades) {
      player.uniqueUpgrades = {};
    }

    player.uniqueUpgrades[upgradeId] = true;
  }
}

const UPGRADE_EPSILON = 0.0001;

const NO_MORE_UPGRADES_HEAL_OPTION = {
  id: "no_more_upgrades_alioli_potatoes",
  name: "Patatas con alioli",
  description: "No quedan mejoras disponibles para tu build. Curas 30 PS.",
  isFallbackHeal: true,
  apply() {
    if (typeof ItemDatabase !== "undefined" && ItemDatabase.alioliPotatoes) {
      ItemDatabase.alioliPotatoes.apply();
      return;
    }

    const lifeBefore = player.life || 0;
    player.life = Math.min(player.maxLife || 0, lifeBefore + 30);

    if (typeof saveData !== "undefined" && saveData.stats) {
      saveData.stats.totalAlioliPotatoesEaten = (saveData.stats.totalAlioliPotatoesEaten || 0) + 1;
      saveData.stats.totalHealingReceived = (saveData.stats.totalHealingReceived || 0) + Math.max(0, player.life - lifeBefore);
    }

    if (typeof checkAchievements === "function") checkAchievements();
    if (typeof saveGameData === "function") saveGameData(saveData);
  }
};

function isUpgradeStillUseful(upgrade) {
  if (!upgrade || !upgrade.weaponId) return false;

  const weapon = player.weapons?.[upgrade.weaponId];
  if (!weapon) return false;

  if (
    upgrade.unique &&
    player.uniqueUpgrades &&
    player.uniqueUpgrades[upgrade.id]
  ) {
    return false;
  }

  if (getUpgradeStacks(upgrade.id) >= getUpgradeMaxStacks(upgrade)) {
    return false;
  }

  if (typeof upgrade.canApply === "function") {
    return upgrade.canApply(player, weapon) !== false;
  }

  switch (upgrade.id) {
    case "stone_fire_rate":
      return (weapon.cooldown ?? Infinity) > 0.25 + UPGRADE_EPSILON;

    case "patataBoom_fire_rate":
      return (weapon.cooldown ?? Infinity) > 1.2 + UPGRADE_EPSILON;

    case "patataBoom_chain":
      return weapon.chain !== true;

    case "watermelonSeedTurret_fire_rate":
      return (weapon.fireCooldown ?? Infinity) > 0.25 + UPGRADE_EPSILON;

    case "watermelonSeedTurret_cooldown":
      return (weapon.respawnCooldown ?? Infinity) > 2 + UPGRADE_EPSILON;

    case "chikoritaLeaf_fire_rate":
      return (weapon.cooldown ?? Infinity) > 0.35 + UPGRADE_EPSILON;

    case "sockRock_fire_rate":
      return (weapon.cooldown ?? Infinity) > 0.35 + UPGRADE_EPSILON;

    case "firePlort_tick_rate":
      return (player.burnTickRate ?? Infinity) > 0.35 + UPGRADE_EPSILON;

    case "firePlort_chance":
      return (player.burnChance ?? 0) < 0.35 - UPGRADE_EPSILON;

    case "chicken_giant":
      return (player.chickenGiantChance ?? 0) < 0.01 - UPGRADE_EPSILON;

    case "cursor_click_speed":
      return (weapon.clickCooldown ?? Infinity) > 1.6 + UPGRADE_EPSILON;

    case "rooster_giant":
      return player.roosterGiantUnlocked !== true;

    case "rooster_slime":
      return player.roosterSlimeUnlocked !== true;

    default:
      return true;
  }
}

function getAvailableUpgrades() {
  return UPGRADE_POOL.filter(isUpgradeStillUseful);
}

function getRandomUpgrades(amount = 3) {
  const available = getAvailableUpgrades();

  if (available.length === 0) {
    return [NO_MORE_UPGRADES_HEAL_OPTION];
  }

  const result = [];

  while (result.length < amount && available.length > 0) {
    const weightedPool = [];

    for (const upgrade of available) {
      if (result.includes(upgrade)) continue;

      const weaponId = upgrade.weaponId;
      const upgradeCount = player.weaponUpgradeCounts?.[weaponId] || 0;

      let weight = Math.max(1, 8 - upgradeCount);

      for (let i = 0; i < weight; i++) {
        weightedPool.push(upgrade);
      }
    }

    if (weightedPool.length === 0) break;

    const chosen = weightedPool[Math.floor(Math.random() * weightedPool.length)];

    result.push(chosen);
  }

  return result;
}
