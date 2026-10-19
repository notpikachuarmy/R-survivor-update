const RiftDatabase = {
  rhyhorn: {
    id: "rhyhorn",
    name: "Grieta de Rhyhorn",
    bossId: "rhyhornBoss",
    sprite: () => Assets.world.magicCircle,
    width: 128,
    height: 128,
    collision: 60,
    summonTime: 3
  },

  // Grieta de tormenta: aparece a mitad de partida una vez completada la de Rhyhorn.
  storm: {
    id: "storm",
    name: "Grieta de tormenta",
    bossId: "sandyShocksBoss",
    sprite: () => Assets.world.magicCircle,
    width: 128,
    height: 128,
    collision: 60,
    summonTime: 3,
    tint: "#ffe14d",
    requiresRift: "rhyhorn",
    appearAt: 240
  },

  // Grieta Jojo: aparece a los 7 minutos una vez completada la de tormenta.
  jojo: {
    id: "jojo",
    name: "Grieta Jojo",
    bossId: "dioBoss",
    sprite: () => Assets.world.magicCircle,
    width: 128,
    height: 128,
    collision: 60,
    summonTime: 3,
    tint: "#ffd23f",
    glow: "jojo",
    requiresRift: "storm",
    appearAt: 420
  }
};

function isRiftCompleted(id) {
  return saveData.completedRifts[id] === true;
}

function completeRift(id) {
  saveData.completedRifts[id] = true;
  saveGameData(saveData);
}
