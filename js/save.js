const SAVE_KEY = "survivorSave";

const DEFAULT_SAVE = {
  bestScore: 0,
  bestTime: 0,

  selectedSkin: "default",
  unlockedSkins: ["default"],

  achievements: {},

  completedRifts: {},

  stats: {
    totalSlimeKills: 0,
    totalFireSlimeGiantKills: 0,
    totalFireSlimeSmallKills: 0,
    totalSlimeGiantKills: 0,
    totalSlimeEliteKills: 0,
    totalChestsOpened: 0,
    totalAlioliPotatoesEaten: 0,
    totalHealingReceived: 0,
    totalMimicsKilled: 0,
    totalRhyhornBossKills: 0,
    totalRhyhornKills: 0,
    totalWatermelonVoltorbKills: 0,
    totalWatermelonElectrodeKills: 0,
    totalWatermelonTurretKills: 0,
    totalSenseisDefeated: 0,
    totalPrisonersRescued: 0,
    totalGoldSlimeKills: 0,
    totalGoldSlimeGiantKills: 0,
    totalPinkSlimeKills: 0,
    totalPinkSlimeGiantKills: 0,
    totalCloudSlimeKills: 0,
    totalCloudSlimeGiantKills: 0,
    totalPidoveKills: 0,
    totalChickensSummoned: 0,
    totalEnemiesKilledInRiver: 0,
    totalEnemiesKilled: 0,
    totalXPCollected: 0,
    totalFlabebeKills: 0,
    totalMagnemiteKills: 0,
    totalMagnetonKills: 0,
    totalSandyShocksBossKills: 0,
    totalSandyShocksKills: 0,
  },

  senseis: {
  defeated: []
},

  scrolls: {
  life: false,
  combat: false,
  knowledge: false,
  speed: false,
  talent: false
},

  encyclopedia: {
    weapons: ["stone"],
    items: [],
    enemies: ["slime"],
    scrolls: [],
  },

  unlocks: {
    fireSlimeGiant: false,
    fireSlimeSmall: false,
    slimeGiant: false,
    notpikachuOrb: false,
    patataBoom: false,
    scaryMedkit: false,
    rhyhorn: false,
    pokeball: false,
    watermelonVoltorb: false,
    watermelonElectrode: false,
    turret: false,
    flabebe: false,
    chikoritaLeaf: false,
    delibird: false,
    bigBlackChestItems: false,
    skin5: false,
    soap: false,
    sockRock: false,
    skin4: false,
    goldPlort: false,
    goldSlimeGiant: false,
    pinkSlimeGiant: false,
    cloudSlime: false,
    cloudSlimeGiant: false,
    slimeJam: false,
    greenPlort: false,
    firePlort: false,
    chicken: false,
    cursor: false,
    rooster: false,
    laprasFloat: false,
    pidove: false,
    panPaloma: false,
    butterflyStaff: false,
    repellent: false,
    berserkSleeve: false,
    magnet: false,
    shellBell: false,
    magnemite: false,
    magneton: false,
    sandyShocks: false,
  }
};

function loadSave() {
  let saved = null;

  try {
    saved = JSON.parse(localStorage.getItem(SAVE_KEY));
  } catch (error) {
    // Si el save está corrupto, se guarda una copia y se arranca con uno limpio
    // en lugar de que el juego no cargue.
    console.warn("Save corrupto, se usará uno nuevo:", error);
    try {
      localStorage.setItem(SAVE_KEY + "_corrupt_backup", localStorage.getItem(SAVE_KEY) || "");
    } catch (_) {}
    saved = null;
  }

  if (!saved) {
    return structuredClone(DEFAULT_SAVE);
  }

  return mergeSave(DEFAULT_SAVE, saved);
}

function mergeSave(defaultData, savedData) {
  const result = structuredClone(defaultData);

  for (const key in savedData) {
    if (
      savedData[key] &&
      typeof savedData[key] === "object" &&
      !Array.isArray(savedData[key])
    ) {
      result[key] = {
        ...result[key],
        ...savedData[key]
      };
    } else {
      result[key] = savedData[key];
    }
  }

  return result;
}

// Guardado con límite de frecuencia: antes se escribía el save completo en
// localStorage en CADA enemigo derrotado, lo que daba tirones en las hordas.
// Ahora se escribe como mucho cada 2 segundos (y siempre al cerrar la pestaña).
const SAVE_MIN_INTERVAL_MS = 2000;
let lastSaveWrite = 0;
let pendingSaveData = null;
let pendingSaveTimeout = null;
let savingDisabled = false;

function writeSaveNow(data) {
  if (savingDisabled) return;
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    lastSaveWrite = Date.now();
  } catch (error) {
    // Navegación privada o almacenamiento lleno: el juego sigue funcionando.
    console.warn("No se pudo guardar la partida:", error);
  }
}

function flushPendingSave() {
  if (pendingSaveTimeout) {
    clearTimeout(pendingSaveTimeout);
    pendingSaveTimeout = null;
  }
  if (pendingSaveData) {
    const data = pendingSaveData;
    pendingSaveData = null;
    writeSaveNow(data);
  }
}

// Para el botón de borrar save: evita que un guardado pendiente lo vuelva a escribir.
function cancelPendingSaves() {
  if (pendingSaveTimeout) clearTimeout(pendingSaveTimeout);
  pendingSaveTimeout = null;
  pendingSaveData = null;
  savingDisabled = true;
}

function saveGameData(data) {
  pendingSaveData = data;
  const elapsed = Date.now() - lastSaveWrite;

  if (elapsed >= SAVE_MIN_INTERVAL_MS) {
    flushPendingSave();
  } else if (!pendingSaveTimeout) {
    pendingSaveTimeout = setTimeout(flushPendingSave, SAVE_MIN_INTERVAL_MS - elapsed);
  }
}

window.addEventListener("beforeunload", flushPendingSave);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") flushPendingSave();
});

function unlockEncyclopedia(category, id) {
  if (!saveData.encyclopedia[category]) return;

  if (!saveData.encyclopedia[category].includes(id)) {
    saveData.encyclopedia[category].push(id);
    saveGameData(saveData);
  }
}

function unlockSkin(id) {
  if (!saveData.unlockedSkins.includes(id)) {
    saveData.unlockedSkins.push(id);
    saveGameData(saveData);
  }
}

function selectSkin(id) {
  if (!saveData.unlockedSkins.includes(id)) return false;

  saveData.selectedSkin = id;
  saveGameData(saveData);
  return true;
}
