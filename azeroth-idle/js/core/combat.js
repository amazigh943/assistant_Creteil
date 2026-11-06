import { Big } from './bignum.js';
import { BALANCE } from '../config.js';
import { REGIONS, cycleName } from '../data/regions.js';
import { RELICS, RELIC_WEIGHTS } from '../data/progression.js';
import { ensureStats } from './stats.js';

/* ------------------------------------------------------------------ */
/* Zones et monstres                                                   */
/* ------------------------------------------------------------------ */

export function isBossZone(zone) {
  return zone % BALANCE.bossEvery === 0;
}

export function regionForZone(zone) {
  const idx = Math.floor((zone - 1) / BALANCE.zonesPerRegion);
  const cycle = Math.floor(idx / REGIONS.length);
  const region = REGIONS[idx % REGIONS.length];
  return { region, cycle, cycleLabel: cycleName(cycle), zoneInRegion: ((zone - 1) % BALANCE.zonesPerRegion) + 1 };
}

export function monsterHp(zone, isBoss = isBossZone(zone)) {
  const z = zone - 1;
  const early = Math.min(z, BALANCE.hpGrowthBreak - 1);
  const late = Math.max(0, z - (BALANCE.hpGrowthBreak - 1));
  const log = Math.log10(BALANCE.hpBase)
    + early * Math.log10(BALANCE.hpGrowthEarly)
    + late * Math.log10(BALANCE.hpGrowthLate);
  let hp = Big.fromLog10(log).add(z * BALANCE.hpLinear).ceil();
  if (isBoss) hp = hp.mul(BALANCE.bossHpMultiplier);
  return hp;
}

/** Or de base d'un monstre (avant multiplicateurs). */
export function monsterGold(zone, isBoss = isBossZone(zone)) {
  const base = Big.max(1, monsterHp(zone, false).mul(BALANCE.goldPerHp).ceil());
  return isBoss ? base.mul(BALANCE.bossGoldMultiplier) : base;
}

export function createMonster(zone, uid, rng = Math.random) {
  const boss = isBossZone(zone);
  const { region, cycle, cycleLabel, zoneInRegion } = regionForZone(zone);
  let def;
  if (boss) {
    const bossIndex = Math.min(region.bosses.length - 1, Math.floor((zoneInRegion - 1) / BALANCE.bossEvery));
    def = region.bosses[bossIndex];
  } else {
    def = region.monsters[Math.floor(rng() * region.monsters.length) % region.monsters.length];
  }
  const maxHp = monsterHp(zone, boss);
  return {
    uid,
    id: def.id,
    name: def.name,
    type: def.type,
    regionId: region.id,
    cycle,
    cycleLabel,
    zone,
    isBoss: boss,
    sprite: `assets/monsters/${def.id}`,
    maxHp,
    hp: maxHp,
    gold: monsterGold(zone, boss),
    rewarded: false,
  };
}

/* ------------------------------------------------------------------ */
/* Contexte de jeu                                                     */
/* ------------------------------------------------------------------ */

/**
 * `game` regroupe l'état persistant et les données transitoires :
 *  { state, battle, stats, statsAt, statsDirty, events, rng }
 */
export function createGame(state, rng = Math.random) {
  const game = { state, battle: null, stats: null, statsAt: 0, statsDirty: true, events: [], rng };
  game.battle = { uidCounter: 0, monster: null, phase: 'alive', respawnIn: 0, bossTimeLeft: 0, autoClickCarry: 0 };
  spawnMonster(game, Date.now());
  return game;
}

function emit(game, event) {
  game.events.push(event);
  if (game.events.length > 500) game.events.splice(0, game.events.length - 500);
}

export function spawnMonster(game, now) {
  const b = game.battle;
  b.uidCounter += 1;
  b.monster = createMonster(game.state.zone.current, b.uidCounter, game.rng);
  b.phase = 'alive';
  b.respawnIn = 0;
  b.bossTimeLeft = b.monster.isBoss ? ensureStats(game, now).bossTime : 0;
  b.bossTimeMax = b.bossTimeLeft;
  emit(game, { type: 'spawn', monster: b.monster });
}

/** Zone la plus haute accessible (zone frontière). */
export function maxAccessibleZone(state) {
  return state.zone.highestCleared + 1;
}

export function isZoneCleared(state, zone) {
  return zone <= state.zone.highestCleared;
}

export function travelToZone(game, zone, now = Date.now()) {
  const s = game.state;
  const target = Math.max(1, Math.min(Math.floor(zone), maxAccessibleZone(s)));
  if (target === s.zone.current && game.battle.monster) return false;
  s.zone.current = target;
  s.zone.highestReached = Math.max(s.zone.highestReached, target);
  s.records.highestZoneEver = Math.max(s.records.highestZoneEver, target);
  // zone.kills ne compte que les victoires dans la zone frontière : il est
  // conservé quand on redescend farmer une zone déjà conquise.
  emit(game, { type: 'zone', zone: target });
  spawnMonster(game, now);
  return true;
}

/* ------------------------------------------------------------------ */
/* Dégâts et récompenses                                               */
/* ------------------------------------------------------------------ */

export function rollRelic(rng) {
  const total = RELICS.reduce((sum, r) => sum + (RELIC_WEIGHTS[r.rarity] ?? 1), 0);
  let pick = rng() * total;
  for (const relic of RELICS) {
    pick -= RELIC_WEIGHTS[relic.rarity] ?? 1;
    if (pick <= 0) return relic;
  }
  return RELICS[RELICS.length - 1];
}

export function grantRelic(game, relic) {
  const s = game.state;
  s.relics[relic.id] = (s.relics[relic.id] ?? 0) + 1;
  s.stats.relicsFound += 1;
  game.statsDirty = true;
  emit(game, { type: 'relic', relic, level: s.relics[relic.id] });
}

/** Éclats d'éther accordés à la première victoire contre le boss d'une zone. */
export function bossFirstClearEther(zone) {
  return 1 + Math.floor(zone / 25);
}

function killMonster(game, now) {
  const b = game.battle;
  const m = b.monster;
  // Garde-fou : la récompense d'un monstre n'est accordée qu'une seule fois.
  if (!m || m.rewarded) return;
  m.rewarded = true;
  m.hp = Big.ZERO;
  b.phase = 'dead';
  b.respawnIn = BALANCE.respawnDelay;

  const s = game.state;
  const stats = ensureStats(game, now);
  const gold = m.gold.mul(stats.goldMultiplier).ceil();
  s.gold = s.gold.add(gold);
  s.stats.totalGoldEarned = s.stats.totalGoldEarned.add(gold);
  s.stats.totalKills += 1;
  emit(game, { type: 'kill', uid: m.uid, gold, isBoss: m.isBoss, zone: m.zone });

  let ether = 0;
  if (game.rng() < stats.etherChance) ether += 1;

  // Progression de la zone frontière.
  if (m.zone === maxAccessibleZone(s)) {
    let cleared = false;
    if (m.isBoss) cleared = true;
    else {
      s.zone.kills += 1;
      cleared = s.zone.kills >= BALANCE.monstersPerZone;
    }
    if (cleared) {
      s.zone.highestCleared = m.zone;
      s.zone.kills = 0;
      emit(game, { type: 'zoneCleared', zone: m.zone });
    }
  }

  if (m.isBoss) {
    s.stats.bossKills += 1;
    if (m.zone > s.records.highestBossEther) {
      s.records.highestBossEther = m.zone;
      ether += bossFirstClearEther(m.zone);
    }
    if (m.zone >= BALANCE.relicMinZone && game.rng() < BALANCE.relicChance) {
      grantRelic(game, rollRelic(game.rng));
    }
  }

  if (ether > 0) {
    s.ether += ether;
    emit(game, { type: 'ether', amount: ether });
  }
}

/** Inflige des dégâts au monstre courant. Renvoie true si le coup l'a tué. */
export function dealDamage(game, amount, now, meta = {}) {
  const b = game.battle;
  if (b.phase !== 'alive' || !b.monster) return false;
  const dmg = Big.from(amount);
  if (dmg.lte(0)) return false;
  b.monster.hp = b.monster.hp.sub(dmg);
  if (meta.source === 'click') emit(game, { type: 'hit', amount: dmg, crit: !!meta.crit, auto: !!meta.auto });
  if (b.monster.hp.lte(0)) {
    killMonster(game, now);
    return true;
  }
  return false;
}

export function playerClick(game, now = Date.now(), { auto = false } = {}) {
  if (game.battle.phase !== 'alive') return false;
  const stats = ensureStats(game, now);
  const crit = game.rng() < stats.critChance;
  const dmg = crit ? stats.clickDamage.mul(stats.critMultiplier) : stats.clickDamage;
  if (!auto) game.state.stats.totalClicks += 1;
  return dealDamage(game, dmg, now, { source: 'click', crit, auto });
}

function failBoss(game, now) {
  const s = game.state;
  emit(game, { type: 'bossFailed', zone: s.zone.current });
  s.autoProgress = false;
  if (s.zone.current > 1) travelToZone(game, s.zone.current - 1, now);
  else spawnMonster(game, now);
}

/**
 * Avance la simulation de `dt` secondes (appelé à chaque image).
 * Les longues absences passent par simulateIdle().
 */
export function tick(game, dt, now = Date.now()) {
  if (!(dt > 0)) return;
  const s = game.state;
  const b = game.battle;
  const stats = ensureStats(game, now);
  s.stats.playTime += dt;

  if (b.phase === 'dead') {
    b.respawnIn -= dt;
    if (b.respawnIn <= 0) {
      const frontier = maxAccessibleZone(s);
      if (s.autoProgress && s.zone.current < frontier) travelToZone(game, s.zone.current + 1, now);
      else spawnMonster(game, now);
    }
    return;
  }

  if (stats.totalDps.gt(0)) dealDamage(game, stats.totalDps.mul(dt), now, { source: 'dps' });

  if (stats.autoClicks > 0 && b.phase === 'alive') {
    b.autoClickCarry += stats.autoClicks * dt;
    while (b.autoClickCarry >= 1 && b.phase === 'alive') {
      b.autoClickCarry -= 1;
      playerClick(game, now, { auto: true });
    }
    if (b.phase !== 'alive') b.autoClickCarry = 0;
  }

  if (b.phase === 'alive' && b.monster.isBoss) {
    b.bossTimeLeft -= dt;
    if (b.bossTimeLeft <= 0) failBoss(game, now);
  }
}

/**
 * Gains pendant une absence (onglet en arrière-plan ou jeu fermé).
 * Les héros combattent dans la zone actuelle (la précédente s'il s'agit
 * d'une zone de boss) ; la progression de zone n'avance pas hors ligne.
 */
export function simulateIdle(game, seconds, stats) {
  const s = game.state;
  const time = Math.min(Math.max(0, seconds), BALANCE.offlineCapSeconds);
  if (time <= 0 || !stats.totalDps.gt(0)) return { seconds: time, kills: 0, gold: Big.ZERO };
  const zone = isBossZone(s.zone.current) ? Math.max(1, s.zone.current - 1) : s.zone.current;
  const hp = monsterHp(zone, false);
  const timePerKill = hp.div(stats.totalDps).toNumber() + BALANCE.respawnDelay;
  const kills = Math.floor(time / timePerKill);
  if (kills <= 0) return { seconds: time, kills: 0, gold: Big.ZERO };
  const gold = monsterGold(zone, false).mul(stats.goldMultiplier).mul(kills).floor();
  s.gold = s.gold.add(gold);
  s.stats.totalGoldEarned = s.stats.totalGoldEarned.add(gold);
  s.stats.totalKills += kills;
  s.stats.playTime += time;
  return { seconds: time, kills, gold };
}
