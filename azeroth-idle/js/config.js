/**
 * Paramètres globaux de l'équilibrage. Toute la courbe de difficulté
 * se règle ici, sans toucher au moteur de combat.
 */
export const GAME = {
  title: 'Aldoria Idle',
  subtitle: 'Chroniques des Royaumes',
};

export const BALANCE = {
  heroGrowth: 1.07,          // multiplicateur du coût par niveau de héros
  monstersPerZone: 10,       // monstres à vaincre pour débloquer la zone suivante
  bossEvery: 5,              // un boss toutes les 5 zones
  zonesPerRegion: 10,        // chaque région couvre 10 zones (2 boss)
  bossHpMultiplier: 10,
  bossGoldMultiplier: 8,
  bossTime: 30,              // secondes pour vaincre un boss
  hpBase: 10,
  hpGrowthEarly: 1.5,        // croissance des PV par zone jusqu'à hpGrowthBreak
  hpGrowthLate: 1.145,
  hpGrowthBreak: 140,
  hpLinear: 5,
  goldPerHp: 1 / 9,
  respawnDelay: 0.35,        // secondes entre deux monstres
  baseCritChance: 0.03,
  baseCritMultiplier: 5,
  baseEtherChance: 0.002,    // probabilité d'un éclat d'éther par monstre
  soulDpsBonus: 0.10,        // +10 % de DPS par âme non dépensée
  relicChance: 0.12,         // chance de relique sur un boss (zone ≥ relicMinZone)
  relicMinZone: 10,
  ascensionMinZone: 30,
  heroMilestoneEvery: 50,    // ×3 tous les 50 niveaux à partir de heroMilestoneStart
  heroMilestoneStart: 100,
  heroMilestoneMult: 3,
  offlineCapSeconds: 24 * 3600,
  autosaveSeconds: 15,
};
