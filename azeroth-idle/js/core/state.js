import { Big } from './bignum.js';

/**
 * État persistant du joueur. Tout ce qui est ici est sauvegardé.
 * Les données transitoires (monstre en cours, événements d'affichage)
 * vivent dans `game.battle` / `game.events` et ne sont jamais sauvegardées.
 */
export function createInitialState(now = Date.now()) {
  return {
    gold: Big.ZERO,
    ether: 0,
    souls: 0,
    heroes: {},              // id → { level, upgrades: [upgradeId] }
    zone: {
      current: 1,
      highestCleared: 0,     // dernière zone terminée (10 monstres ou boss vaincu)
      highestReached: 1,     // zone la plus haute atteinte pendant cette ascension
      kills: 0,              // monstres vaincus dans la zone frontière
    },
    autoProgress: true,
    skills: {},              // id → { readyAt, activeUntil } (horodatages ms)
    buffs: {},               // id → expiration (ms)
    relics: {},              // id → niveau
    idols: {},               // id → niveau
    mounts: [],              // ids possédés
    records: {
      highestBossEther: 0,   // plus haut boss ayant déjà donné son éther de première victoire
      highestZoneEver: 1,
    },
    stats: {
      totalKills: 0,
      bossKills: 0,
      totalClicks: 0,
      playTime: 0,
      ascensions: 0,
      soulsEarned: 0,
      relicsFound: 0,
      totalGoldEarned: Big.ZERO,
    },
    settings: {
      buyMode: 1,
      floatingText: true,
    },
    createdAt: now,
    lastSeen: now,
  };
}

/** Accès sûr à l'état d'un héros (créé à la volée). */
export function heroState(state, heroId) {
  if (!state.heroes[heroId]) state.heroes[heroId] = { level: 0, upgrades: [] };
  return state.heroes[heroId];
}

export function heroLevel(state, heroId) {
  return state.heroes[heroId]?.level ?? 0;
}

export function hasUpgrade(state, heroId, upgradeId) {
  return state.heroes[heroId]?.upgrades.includes(upgradeId) ?? false;
}
