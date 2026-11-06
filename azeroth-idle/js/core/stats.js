import { Big } from './bignum.js';
import { BALANCE } from '../config.js';
import { HEROES, UPGRADE_BY_ID } from '../data/heroes.js';
import {
  RELIC_BY_ID, MOUNT_BY_ID, IDOL_BY_ID, SKILL_BY_ID, BUFF_EFFECTS,
} from '../data/progression.js';

/**
 * Calcul centralisé de toutes les statistiques dérivées.
 * Aucune autre partie du code ne doit recalculer DPS, clic ou multiplicateurs.
 *
 * Règles d'empilement :
 *  - *Percent / critChance / etherChance / bossTime : additifs entre eux
 *  - *Mult (heroMult, clickMult, dpsMult, goldMult) : multiplicatifs
 *  - âmes non dépensées : multiplicateur séparé (1 + âmes × soulDpsBonus)
 */

const ADDITIVE = new Set(['dpsPercent', 'clickPercent', 'goldPercent', 'critChance', 'etherChance', 'bossTime', 'clickDpsPercent', 'autoClicks']);
const MULTIPLICATIVE = new Set(['clickMult', 'dpsMult', 'goldMult']);

function emptyAggregate() {
  return {
    dpsPercent: 0, clickPercent: 0, goldPercent: 0,
    critChance: BALANCE.baseCritChance,
    etherChance: BALANCE.baseEtherChance,
    bossTime: 0, clickDpsPercent: 0, autoClicks: 0,
    clickMult: 1, dpsMult: 1, goldMult: 1,
    unlockedSkills: new Set(),
  };
}

function apply(agg, effect, times = 1) {
  if (times <= 0) return;
  if (ADDITIVE.has(effect.type)) agg[effect.type] += effect.value * times;
  else if (MULTIPLICATIVE.has(effect.type)) agg[effect.type] *= Math.pow(effect.value, times);
  else if (effect.type === 'unlockSkill') agg.unlockedSkills.add(effect.skill);
  // heroMult est traité par héros dans heroMultiplier().
}

export function milestoneCount(level) {
  if (level < BALANCE.heroMilestoneStart) return 0;
  return Math.floor((level - BALANCE.heroMilestoneStart) / BALANCE.heroMilestoneEvery) + 1;
}

export function heroMultiplier(hero, heroSt) {
  let mult = Math.pow(BALANCE.heroMilestoneMult, milestoneCount(heroSt.level));
  for (const id of heroSt.upgrades) {
    const up = UPGRADE_BY_ID[id];
    if (!up || up.heroId !== hero.id) continue;
    for (const eff of up.effects) if (eff.type === 'heroMult') mult *= eff.value;
  }
  return mult;
}

export function computeStats(state, now = Date.now(), { includeTemporary = true } = {}) {
  const agg = emptyAggregate();

  for (const hero of HEROES) {
    const hs = state.heroes[hero.id];
    if (!hs) continue;
    for (const id of hs.upgrades) {
      const up = UPGRADE_BY_ID[id];
      if (up) for (const eff of up.effects) apply(agg, eff);
    }
  }
  for (const [id, level] of Object.entries(state.relics)) {
    const relic = RELIC_BY_ID[id];
    if (relic) for (const eff of relic.effects) apply(agg, eff, level);
  }
  for (const id of state.mounts) {
    const mount = MOUNT_BY_ID[id];
    if (mount) for (const eff of mount.effects) apply(agg, eff);
  }
  for (const [id, level] of Object.entries(state.idols)) {
    const idol = IDOL_BY_ID[id];
    if (idol) for (const eff of idol.effects) apply(agg, eff, level);
  }

  const activeSkills = new Set();
  if (includeTemporary) {
    for (const [id, sk] of Object.entries(state.skills)) {
      const def = SKILL_BY_ID[id];
      if (def && sk.activeUntil > now) {
        activeSkills.add(id);
        for (const eff of def.effects) apply(agg, eff);
      }
    }
    for (const [id, until] of Object.entries(state.buffs)) {
      if (until > now && BUFF_EFFECTS[id]) for (const eff of BUFF_EFFECTS[id]) apply(agg, eff);
    }
  }

  const soulMult = 1 + state.souls * BALANCE.soulDpsBonus;
  const globalDpsMult = (1 + agg.dpsPercent) * agg.dpsMult * soulMult;

  const heroDps = {};
  let totalDps = Big.ZERO;
  let clickHeroLevels = 0;
  for (const hero of HEROES) {
    const hs = state.heroes[hero.id];
    if (!hs || hs.level <= 0) { heroDps[hero.id] = Big.ZERO; continue; }
    if (hero.role === 'click') {
      clickHeroLevels += hs.level * hero.clickPerLevel;
      heroDps[hero.id] = Big.ZERO;
      continue;
    }
    const dps = Big.from(hero.baseDps).mul(hs.level).mul(heroMultiplier(hero, hs)).mul(globalDpsMult);
    heroDps[hero.id] = dps;
    totalDps = totalDps.add(dps);
  }

  const clickBase = Big.from(1 + clickHeroLevels).mul(agg.clickMult * (1 + agg.clickPercent));
  const clickDamage = clickBase.add(totalDps.mul(agg.clickDpsPercent));

  return {
    totalDps,
    heroDps,
    clickDamage,
    critChance: Math.min(1, agg.critChance),
    critMultiplier: BALANCE.baseCritMultiplier,
    goldMultiplier: (1 + agg.goldPercent) * agg.goldMult,
    etherChance: Math.min(1, agg.etherChance),
    bossTime: BALANCE.bossTime + agg.bossTime,
    autoClicks: agg.autoClicks,
    globalDpsMult,
    soulMult,
    dpsPercent: agg.dpsPercent,
    clickPercent: agg.clickPercent,
    goldPercent: agg.goldPercent,
    unlockedSkills: agg.unlockedSkills,
    activeSkills,
  };
}

/** Recalcule les statistiques si l'état a changé ou si elles datent de plus de 250 ms. */
export function ensureStats(game, now) {
  if (!game.stats || game.statsDirty || now - game.statsAt > 250) {
    game.stats = computeStats(game.state, now);
    game.statsAt = now;
    game.statsDirty = false;
  }
  return game.stats;
}
