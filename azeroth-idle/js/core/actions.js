import { BALANCE } from '../config.js';
import { HERO_BY_ID, UPGRADE_BY_ID } from '../data/heroes.js';
import { SKILL_BY_ID, IDOL_BY_ID, MOUNT_BY_ID, SHOP_BY_ID } from '../data/progression.js';
import { resolvePurchase } from './economy.js';
import { createInitialState, heroState } from './state.js';
import { ensureStats } from './stats.js';
import { spawnMonster, monsterGold, isBossZone, grantRelic, rollRelic } from './combat.js';

/**
 * Actions du joueur. Chaque action vérifie ses conditions, modifie l'état
 * et renvoie { ok, reason? } sans jamais laisser l'état incohérent.
 */

const fail = (reason) => ({ ok: false, reason });

export function heroPurchase(state, heroId, mode = state.settings.buyMode) {
  const hero = HERO_BY_ID[heroId];
  if (!hero) return null;
  const level = state.heroes[heroId]?.level ?? 0;
  return resolvePurchase(mode, hero.baseCost, level, state.gold, BALANCE.heroGrowth);
}

export function buyHero(game, heroId, mode = game.state.settings.buyMode) {
  const s = game.state;
  const purchase = heroPurchase(s, heroId, mode);
  if (!purchase) return fail('Héros inconnu');
  if (!purchase.affordable) return fail("Pas assez d'or");
  s.gold = s.gold.sub(purchase.cost);
  const hs = heroState(s, heroId);
  const wasRecruited = hs.level > 0;
  hs.level += purchase.count;
  game.statsDirty = true;
  game.events.push({ type: 'heroLevel', heroId, level: hs.level, recruited: !wasRecruited });
  return { ok: true, count: purchase.count, cost: purchase.cost };
}

export function upgradeStatus(state, upgradeId) {
  const up = UPGRADE_BY_ID[upgradeId];
  if (!up) return 'unknown';
  const hs = state.heroes[up.heroId];
  if (hs?.upgrades.includes(upgradeId)) return 'owned';
  if (!hs || hs.level < up.level) return 'locked';
  return state.gold.gte(up.cost) ? 'available' : 'expensive';
}

export function buyUpgrade(game, upgradeId) {
  const s = game.state;
  const up = UPGRADE_BY_ID[upgradeId];
  if (!up) return fail('Amélioration inconnue');
  const status = upgradeStatus(s, upgradeId);
  if (status === 'owned') return fail('Déjà acquise');
  if (status === 'locked') return fail(`Niveau ${up.level} requis`);
  if (status === 'expensive') return fail("Pas assez d'or");
  s.gold = s.gold.sub(up.cost);
  heroState(s, up.heroId).upgrades.push(upgradeId);
  game.statsDirty = true;
  game.events.push({ type: 'upgrade', upgrade: up });
  return { ok: true };
}

export function skillStatus(game, skillId, now) {
  const stats = ensureStats(game, now);
  const sk = game.state.skills[skillId];
  if (!stats.unlockedSkills.has(skillId)) return { state: 'locked' };
  if (sk && sk.activeUntil > now) return { state: 'active', remaining: (sk.activeUntil - now) / 1000 };
  if (sk && sk.readyAt > now) return { state: 'cooldown', remaining: (sk.readyAt - now) / 1000 };
  return { state: 'ready' };
}

export function activateSkill(game, skillId, now = Date.now()) {
  const def = SKILL_BY_ID[skillId];
  if (!def) return fail('Compétence inconnue');
  const status = skillStatus(game, skillId, now);
  if (status.state === 'locked') return fail('Compétence verrouillée');
  if (status.state !== 'ready') return fail('Compétence en recharge');
  game.state.skills[skillId] = { activeUntil: now + def.duration * 1000, readyAt: now + def.cooldown * 1000 };
  game.statsDirty = true;
  game.events.push({ type: 'skill', skill: def });
  return { ok: true };
}

export function idolCost(state, idolId) {
  return (state.idols[idolId] ?? 0) + 1;
}

export function buyIdol(game, idolId) {
  const s = game.state;
  const idol = IDOL_BY_ID[idolId];
  if (!idol) return fail('Idole inconnue');
  const level = s.idols[idolId] ?? 0;
  if (idol.maxLevel && level >= idol.maxLevel) return fail('Niveau maximal atteint');
  const cost = idolCost(s, idolId);
  if (s.souls < cost) return fail("Pas assez d'âmes");
  s.souls -= cost;
  s.idols[idolId] = level + 1;
  game.statsDirty = true;
  return { ok: true };
}

export function buyMount(game, mountId) {
  const s = game.state;
  const mount = MOUNT_BY_ID[mountId];
  if (!mount) return fail('Monture inconnue');
  if (s.mounts.includes(mountId)) return fail('Déjà possédée');
  if (s.ether < mount.cost) return fail("Pas assez d'éclats d'éther");
  s.ether -= mount.cost;
  s.mounts.push(mountId);
  game.statsDirty = true;
  return { ok: true };
}

export function merchantPurseValue(state) {
  const zone = isBossZone(state.zone.current) ? Math.max(1, state.zone.current - 1) : state.zone.current;
  return monsterGold(zone, false).mul(250);
}

export function buyShopItem(game, itemId, now = Date.now()) {
  const s = game.state;
  const item = SHOP_BY_ID[itemId];
  if (!item) return fail('Article inconnu');
  if (s.ether < item.cost) return fail("Pas assez d'éclats d'éther");
  if (itemId === 'sablier-brise') {
    const anyCooldown = Object.values(s.skills).some((sk) => sk.readyAt > now);
    if (!anyCooldown) return fail('Aucune compétence en recharge');
  }
  s.ether -= item.cost;
  if (itemId === 'bourse-marchand') {
    const gold = merchantPurseValue(s);
    s.gold = s.gold.add(gold);
    s.stats.totalGoldEarned = s.stats.totalGoldEarned.add(gold);
  } else if (itemId === 'sablier-brise') {
    for (const sk of Object.values(s.skills)) sk.readyAt = Math.min(sk.readyAt, now);
  } else if (item.buff) {
    const current = Math.max(now, s.buffs[item.buff.id] ?? 0);
    s.buffs[item.buff.id] = current + item.buff.duration * 1000;
  }
  game.statsDirty = true;
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* Ascension                                                           */
/* ------------------------------------------------------------------ */

export function totalHeroLevels(state) {
  return Object.values(state.heroes).reduce((sum, h) => sum + (h.level || 0), 0);
}

export function soulsForAscension(state) {
  const zone = state.zone.highestReached;
  if (zone < BALANCE.ascensionMinZone) return 0;
  const fromZones = Math.floor(Math.pow((zone - 25) / 5, 1.4));
  const fromLevels = Math.floor(totalHeroLevels(state) / 500);
  return Math.max(1, fromZones + fromLevels);
}

export function canAscend(state) {
  return state.zone.highestReached >= BALANCE.ascensionMinZone;
}

/**
 * Ascension : réinitialise or, héros, améliorations et zones.
 * Conserve âmes, éclats d'éther, reliques, montures, idoles, records,
 * statistiques et réglages. Accorde une relique garantie.
 */
export function ascend(game, now = Date.now()) {
  const old = game.state;
  if (!canAscend(old)) return fail(`Atteignez la zone ${BALANCE.ascensionMinZone}`);
  const souls = soulsForAscension(old);
  const fresh = createInitialState(now);
  fresh.souls = old.souls + souls;
  fresh.ether = old.ether;
  fresh.relics = { ...old.relics };
  fresh.idols = { ...old.idols };
  fresh.mounts = [...old.mounts];
  fresh.records = { ...old.records };
  fresh.settings = { ...old.settings };
  fresh.stats = { ...old.stats, ascensions: old.stats.ascensions + 1, soulsEarned: old.stats.soulsEarned + souls };
  fresh.createdAt = old.createdAt;
  game.state = fresh;
  game.statsDirty = true;
  grantRelic(game, rollRelic(game.rng));
  game.events.push({ type: 'ascension', souls });
  spawnMonster(game, now);
  return { ok: true, souls };
}

