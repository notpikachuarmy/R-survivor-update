const levelUpPanel = document.getElementById("levelUpPanel");
const upgradeOptions = document.getElementById("upgradeOptions");

// Subidas de nivel pendientes. Si subes varios niveles de golpe (por ejemplo al
// recoger una bolita de XP grande), los paneles se muestran uno detrás de otro
// en vez de pisarse y hacerte perder mejoras.
let pendingLevelUps = 0;

function gainXP(amount) {
  const gained = Math.ceil(amount * (player.xpMultiplier || 1));
  player.xp += gained;

  if (saveData?.stats) {
    saveData.stats.totalXPCollected = (saveData.stats.totalXPCollected || 0) + gained;
  }

  while (player.xp >= player.xpToNext) {
    player.xp -= player.xpToNext;
    player.level += 1;

    checkAchievements();
    saveGameData(saveData);

    player.xpToNext = Math.floor(player.xpToNext * 1.35);
    openLevelUpPanel();
  }
}

function isLevelUpPanelOpen() {
  return !levelUpPanel.classList.contains("hidden");
}

function openLevelUpPanel() {
  if (isLevelUpPanelOpen()) {
    pendingLevelUps++;
    return;
  }

  showLevelUpOptions();
}

function showLevelUpOptions() {
  gamePaused = true;
  levelUpPanel.classList.remove("hidden");
  upgradeOptions.innerHTML = "";

  const options = getRandomUpgrades(3);

  for (const upgrade of options) {
    const card = document.createElement("button");
    card.className = "upgrade-card";

    card.innerHTML = `
      <h3>${upgrade.name}</h3>
      <p>${upgrade.description}</p>
    `;

    card.addEventListener("click", () => {
  upgrade.apply();

  if (!upgrade.isFallbackHeal) {
    registerWeaponUpgrade(upgrade.weaponId, upgrade.id, upgrade.unique === true);
  }

  closeLevelUpPanel();
});

    upgradeOptions.appendChild(card);
  }
}

function closeLevelUpPanel() {
  if (pendingLevelUps > 0) {
    pendingLevelUps--;
    showLevelUpOptions();
    return;
  }

  levelUpPanel.classList.add("hidden");
  gamePaused = false;
}
