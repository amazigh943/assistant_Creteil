import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Big } from '../js/core/bignum.js';
import { formatNumber } from '../js/core/format.js';
import { levelCost, costForLevels, maxAffordable, resolvePurchase } from '../js/core/economy.js';
import { createInitialState } from '../js/core/state.js';
import { computeStats } from '../js/core/stats.js';
import {
  createGame, dealDamage, tick, travelToZone, monsterHp, simulateIdle, isBossZone,
} from '../js/core/combat.js';
import { buyHero, buyUpgrade, activateSkill, ascend, soulsForAscension } from '../js/core/actions.js';
import {
  serializeState, parseSave, readSave, writeSave, migrate, SAVE_KEY, BACKUP_KEY, SAVE_VERSION,
} from '../js/core/save.js';
import { BALANCE } from '../js/config.js';
import { HEROES } from '../js/data/heroes.js';

const fixedRng = (v = 0.99) => () => v;
const NOW = 1_700_000_000_000;

function newGame(rngValue = 0.99) {
  return createGame(createInitialState(NOW), fixedRng(rngValue));
}

/** Tue le monstre courant et fait réapparaître le suivant. */
function killCurrent(game) {
  dealDamage(game, game.battle.monster.maxHp, NOW);
  tick(game, BALANCE.respawnDelay + 0.01, NOW);
}

/* ------------------------------ Big ------------------------------ */

test('Big : arithmétique de base', () => {
  assert.equal(Big.from(2).add(3).toNumber(), 5);
  assert.equal(Big.from(10).sub(4).toNumber(), 6);
  assert.ok(Big.from(10).sub(4).gte(6));
  assert.equal(Big.from(0.1).add(0.2).toNumber(), 0.3);
  assert.equal(Big.from(6).mul(7).toNumber(), 42);
  assert.equal(Big.from(1).div(4).toNumber(), 0.25);
  assert.ok(Math.abs(Big.from(1.07).pow(100).toNumber() - Math.pow(1.07, 100)) < 1e-6);
});

test('Big : dépasse la limite des nombres JavaScript', () => {
  const huge = Big.from('5e400').mul('4e500');
  assert.equal(huge.e, 901);
  assert.ok(Math.abs(huge.m - 2) < 1e-12);
  assert.ok(huge.gt('1e900'));
  assert.ok(Big.from('1e1000').add(1).eq('1e1000'));
});

test('Big : comparaison et sérialisation', () => {
  assert.ok(Big.from(-5).lt(3));
  assert.ok(Big.from(0).eq(Big.ZERO));
  const b = Big.from('1.234e56');
  assert.ok(Big.from(b.toJSON()).eq(b));
  assert.ok(Big.from(JSON.parse(JSON.stringify({ v: b })).v).eq(b));
});

/* ------------------------------ format ------------------------------ */

test('formatNumber : suffixes et troncature', () => {
  assert.equal(formatNumber(0), '0');
  assert.equal(formatNumber(999), '999');
  assert.equal(formatNumber(1520), '1.52K');
  assert.equal(formatNumber(12_345_678), '12.3M');
  assert.equal(formatNumber(999_999), '999K'); // jamais arrondi vers le haut
  assert.equal(formatNumber(Big.from('3.5e40')), '3.5e40');
});

/* ------------------------------ économie ------------------------------ */

test('économie : la somme géométrique correspond aux achats unitaires', () => {
  let sum = Big.ZERO;
  for (let l = 7; l < 7 + 25; l++) sum = sum.add(levelCost(50, l, 1.07));
  const fast = costForLevels(50, 7, 25, 1.07);
  assert.ok(Math.abs(fast.div(sum).toNumber() - 1) < 1e-9);
});

test('économie : MAX achète exactement ce qui est abordable', () => {
  const gold = Big.from(123_456);
  const n = maxAffordable(50, 3, gold, 1.07);
  assert.ok(costForLevels(50, 3, n, 1.07).lte(gold));
  assert.ok(costForLevels(50, 3, n + 1, 1.07).gt(gold));
  assert.equal(maxAffordable(50, 0, 49, 1.07), 0);
  const p = resolvePurchase('max', 50, 0, 10, 1.07);
  assert.equal(p.affordable, false);
  assert.equal(p.count, 1);
});

/* ------------------------------ combat ------------------------------ */

test('combat : la récompense d’un monstre n’est accordée qu’une fois', () => {
  const game = newGame();
  const m = game.battle.monster;
  dealDamage(game, m.maxHp, NOW);
  const goldAfterKill = game.state.gold;
  assert.ok(goldAfterKill.gt(0));
  // coups supplémentaires sur le même monstre (déjà mort) : aucun gain
  dealDamage(game, m.maxHp, NOW);
  dealDamage(game, m.maxHp.mul(10), NOW);
  assert.ok(game.state.gold.eq(goldAfterKill));
  assert.equal(game.state.stats.totalKills, 1);
});

test('combat : 10 monstres débloquent la zone suivante, la progression auto avance', () => {
  const game = newGame();
  for (let i = 0; i < BALANCE.monstersPerZone; i++) killCurrent(game);
  assert.equal(game.state.zone.highestCleared, 1);
  assert.equal(game.state.zone.current, 2);
});

test('combat : impossible de voyager au-delà de la zone frontière', () => {
  const game = newGame();
  travelToZone(game, 50, NOW);
  assert.equal(game.state.zone.current, 1);
});

test('combat : échec contre un boss → retour à la zone précédente, progression auto coupée', () => {
  const game = newGame();
  game.state.zone.highestCleared = 4;
  travelToZone(game, 5, NOW);
  assert.ok(game.battle.monster.isBoss);
  tick(game, BALANCE.bossTime + 1, NOW);
  assert.equal(game.state.zone.current, 4);
  assert.equal(game.state.autoProgress, false);
});

test('combat : l’éther de première victoire contre un boss n’est donné qu’une fois', () => {
  const game = newGame();
  game.state.zone.highestCleared = 4;
  travelToZone(game, 5, NOW);
  killCurrent(game);
  const ether = game.state.ether;
  assert.ok(ether >= 1);
  game.state.autoProgress = false;
  travelToZone(game, 5, NOW);
  killCurrent(game);
  assert.equal(game.state.ether, ether);
});

test('combat : PV croissants et boss ×10', () => {
  assert.ok(monsterHp(10, false).gt(monsterHp(9, false)));
  assert.ok(isBossZone(5) && !isBossZone(6));
  assert.equal(monsterHp(5, true).div(monsterHp(5, false)).toNumber(), BALANCE.bossHpMultiplier);
  assert.ok(monsterHp(6000, false).gt('1e300')); // au-delà des nombres JS, sans Infinity
});

test('combat : gains d’absence plafonnés', () => {
  const game = newGame();
  game.state.heroes.brannoc = { level: 10, upgrades: [] };
  const stats = computeStats(game.state, NOW);
  const r = simulateIdle(game, 10 * 24 * 3600, stats);
  assert.equal(r.seconds, BALANCE.offlineCapSeconds);
  assert.ok(r.kills > 0 && game.state.gold.gt(0));
});

/* ------------------------------ actions & stats ------------------------------ */

test('héros : achat, déduction de l’or et refus sans fonds', () => {
  const game = newGame();
  assert.equal(buyHero(game, 'brannoc', 1).ok, false);
  game.state.gold = Big.from(1000);
  const r = buyHero(game, 'brannoc', 10);
  assert.equal(r.ok, true);
  assert.equal(game.state.heroes.brannoc.level, 10);
  assert.ok(game.state.gold.eq(Big.from(1000).sub(r.cost)));
});

test('améliorations : verrouillées sous le niveau requis, ×2 ensuite', () => {
  const game = newGame();
  game.state.gold = Big.from(1e9);
  buyHero(game, 'brannoc', 9);
  assert.equal(buyUpgrade(game, 'brannoc-1').ok, false);
  buyHero(game, 'brannoc', 1);
  const before = computeStats(game.state, NOW).heroDps.brannoc;
  assert.equal(buyUpgrade(game, 'brannoc-1').ok, true);
  const after = computeStats(game.state, NOW).heroDps.brannoc;
  assert.ok(Math.abs(after.div(before).toNumber() - 2) < 1e-9);
  assert.equal(buyUpgrade(game, 'brannoc-1').ok, false); // pas deux fois
});

test('compétences : débloquées par amélioration, recharge respectée', () => {
  const game = newGame();
  assert.equal(activateSkill(game, 'blessing', NOW).ok, false);
  game.state.heroes.oswin = { level: 25, upgrades: ['oswin-1', 'oswin-2'] };
  game.statsDirty = true;
  const base = computeStats(game.state, NOW).totalDps;
  assert.equal(activateSkill(game, 'blessing', NOW).ok, true);
  assert.equal(activateSkill(game, 'blessing', NOW + 1000).ok, false);
  const boosted = computeStats(game.state, NOW + 1000).totalDps;
  assert.ok(Math.abs(boosted.div(base).toNumber() - 2) < 1e-9);
});

test('ascension : âmes gagnées, progression réinitialisée, bonus conservés', () => {
  const game = newGame();
  game.state.zone.highestReached = 50;
  game.state.gold = Big.from(1e12);
  game.state.ether = 7;
  game.state.heroes.brannoc = { level: 200, upgrades: ['brannoc-1'] };
  const souls = soulsForAscension(game.state);
  assert.ok(souls > 0);
  assert.equal(ascend(game, NOW).ok, true);
  assert.equal(game.state.souls, souls);
  assert.equal(game.state.ether, 7);
  assert.ok(game.state.gold.isZero());
  assert.deepEqual(game.state.heroes, {});
  assert.equal(game.state.zone.current, 1);
  assert.equal(Object.values(game.state.relics).reduce((a, b) => a + b, 0), 1);
  const dpsMult = computeStats(game.state, NOW).soulMult;
  assert.equal(dpsMult, 1 + souls * BALANCE.soulDpsBonus);
});

test('données : 10 héros, coûts croissants, identifiants d’amélioration uniques', () => {
  assert.equal(HEROES.length, 10);
  for (let i = 2; i < HEROES.length; i++) assert.ok(HEROES[i].baseCost > HEROES[i - 1].baseCost);
  const ids = HEROES.flatMap((h) => h.upgrades.map((u) => u.id));
  assert.equal(new Set(ids).size, ids.length);
});

/* ------------------------------ sauvegarde ------------------------------ */

function memoryStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), map: m };
}

test('sauvegarde : aller-retour sans perte (grands nombres inclus)', () => {
  const s = createInitialState(NOW);
  s.gold = Big.from('4.2e512');
  s.heroes.mirelle = { level: 77, upgrades: ['mirelle-1', 'mirelle-2'] };
  s.zone = { current: 12, highestCleared: 14, highestReached: 15, kills: 3 };
  s.relics['ecu-ancestral'] = 2;
  s.settings.buyMode = 'max';
  const r = parseSave(serializeState(s, NOW), NOW);
  assert.equal(r.ok, true);
  assert.ok(r.state.gold.eq(s.gold));
  assert.deepEqual(r.state.heroes.mirelle, s.heroes.mirelle);
  assert.deepEqual(r.state.zone, s.zone);
  assert.equal(r.state.relics['ecu-ancestral'], 2);
  assert.equal(r.state.settings.buyMode, 'max');
});

test('sauvegarde : champs manquants complétés, valeurs invalides corrigées', () => {
  const text = JSON.stringify({ version: SAVE_VERSION, savedAt: NOW, state: { gold: 'n/a', heroes: { brannoc: { level: -3 } }, zone: { current: 99, highestCleared: 4 } } });
  const r = parseSave(text, NOW);
  assert.equal(r.ok, true);
  assert.ok(r.state.gold.isZero());
  assert.equal(r.state.heroes.brannoc.level, 0);
  assert.equal(r.state.zone.current, 5); // ramené à la frontière
  assert.ok(r.state.stats && r.state.settings && Array.isArray(r.state.mounts));
});

test('sauvegarde : version future refusée, JSON corrompu détecté', () => {
  assert.equal(parseSave(JSON.stringify({ version: SAVE_VERSION + 1, state: {} })).reason, 'newer');
  assert.equal(parseSave('{pas du json').reason, 'corrupt');
});

test('sauvegarde : migrations enchaînées', () => {
  const out = migrate({ a: 1 }, 1, { 1: (s) => ({ ...s, b: 2 }), 2: (s) => ({ ...s, c: 3 }) }, 3);
  assert.deepEqual(out, { a: 1, b: 2, c: 3 });
});

test('sauvegarde : stockage, copie de secours lors d’une migration', () => {
  const st = memoryStorage();
  assert.equal(readSave(st, NOW).status, 'new');
  const s = createInitialState(NOW);
  s.souls = 12;
  assert.equal(writeSave(st, s, NOW), true);
  const loaded = readSave(st, NOW);
  assert.equal(loaded.status, 'loaded');
  assert.equal(loaded.state.souls, 12);
  // Ancienne sauvegarde sans numéro de version → migrée + copie de secours.
  st.setItem(SAVE_KEY, JSON.stringify({ state: { souls: 3 } }));
  const migrated = readSave(st, NOW);
  assert.equal(migrated.status, 'migrated');
  assert.equal(migrated.state.souls, 3);
  assert.ok(st.getItem(BACKUP_KEY));
  // Sauvegarde corrompue → copie conservée.
  st.setItem(SAVE_KEY, '###');
  assert.equal(readSave(st, NOW).status, 'corrupt');
  assert.ok([...st.map.keys()].some((k) => k.startsWith(`${SAVE_KEY}:corrupt-`)));
});
