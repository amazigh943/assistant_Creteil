import { Big } from './bignum.js';
import { createInitialState } from './state.js';
import { BUY_MODES } from './economy.js';

/**
 * Sauvegarde locale versionnée.
 *
 * Format : { version, savedAt, state }
 *  - Chaque changement de structure incrémente SAVE_VERSION et ajoute une
 *    migration MIGRATIONS[n] qui transforme une sauvegarde v(n) en v(n+1).
 *  - Avant toute migration, la sauvegarde d'origine est copiée dans BACKUP_KEY.
 *  - normalizeState() complète les champs manquants avec les valeurs par
 *    défaut : un nouveau champ ajouté au jeu n'efface jamais la progression.
 *  - Une sauvegarde plus récente que le jeu n'est jamais écrasée.
 */

export const SAVE_VERSION = 1;
export const SAVE_KEY = 'aldoria-idle/save';
export const BACKUP_KEY = 'aldoria-idle/save-backup';

/** MIGRATIONS[n] : sauvegarde version n → version n + 1. */
export const MIGRATIONS = {
  // Exemple pour la prochaine évolution :
  // 1: (s) => ({ ...s, nouveauChamp: valeurParDefaut }),
};

export function migrate(raw, fromVersion, migrations = MIGRATIONS, target = SAVE_VERSION) {
  let state = raw;
  for (let v = fromVersion; v < target; v += 1) {
    const step = migrations[v];
    if (step) state = step(state);
  }
  return state;
}

/* ------------------------------------------------------------------ */
/* Normalisation                                                       */
/* ------------------------------------------------------------------ */

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const nonNegInt = (v) => (Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0);
const finiteOr = (v, d) => (Number.isFinite(v) ? v : d);

function reviveBig(v, fallback) {
  if (typeof v === 'string' || typeof v === 'number' || isObj(v)) {
    const b = Big.from(v);
    if (Number.isFinite(b.m) && Number.isFinite(b.e) && !b.isNegative()) return b;
  }
  return fallback;
}

/** Fusion récursive : les valeurs valides de `raw` remplacent celles de `defaults`. */
function mergeDefaults(defaults, raw) {
  if (defaults instanceof Big) return reviveBig(raw, defaults);
  if (Array.isArray(defaults)) return Array.isArray(raw) ? raw.slice() : defaults.slice();
  if (isObj(defaults)) {
    const out = {};
    const src = isObj(raw) ? raw : {};
    for (const key of Object.keys(defaults)) out[key] = mergeDefaults(defaults[key], src[key]);
    return out;
  }
  if (typeof defaults === 'number') return finiteOr(raw, defaults);
  if (typeof raw === typeof defaults) return raw;
  return defaults;
}

function sanitizeLevelMap(map) {
  const out = {};
  if (!isObj(map)) return out;
  for (const [id, lvl] of Object.entries(map)) {
    const n = nonNegInt(lvl);
    if (n > 0) out[id] = n;
  }
  return out;
}

export function normalizeState(raw, now = Date.now()) {
  const defaults = createInitialState(now);
  const s = mergeDefaults(defaults, raw);
  const src = isObj(raw) ? raw : {};

  // Héros : on conserve aussi les héros inconnus (ajoutés par une version future).
  s.heroes = {};
  if (isObj(src.heroes)) {
    for (const [id, h] of Object.entries(src.heroes)) {
      if (!isObj(h)) continue;
      const upgrades = Array.isArray(h.upgrades) ? [...new Set(h.upgrades.filter((u) => typeof u === 'string'))] : [];
      s.heroes[id] = { level: nonNegInt(h.level), upgrades };
    }
  }
  s.relics = sanitizeLevelMap(src.relics);
  s.idols = sanitizeLevelMap(src.idols);
  s.mounts = [...new Set((Array.isArray(src.mounts) ? src.mounts : []).filter((m) => typeof m === 'string'))];

  s.skills = {};
  if (isObj(src.skills)) {
    for (const [id, sk] of Object.entries(src.skills)) {
      if (isObj(sk)) s.skills[id] = { readyAt: finiteOr(sk.readyAt, 0), activeUntil: finiteOr(sk.activeUntil, 0) };
    }
  }
  s.buffs = {};
  if (isObj(src.buffs)) {
    for (const [id, until] of Object.entries(src.buffs)) if (Number.isFinite(until) && until > now) s.buffs[id] = until;
  }

  s.ether = nonNegInt(s.ether);
  s.souls = nonNegInt(s.souls);
  s.zone.current = Math.max(1, nonNegInt(s.zone.current));
  s.zone.highestCleared = nonNegInt(s.zone.highestCleared);
  s.zone.current = Math.min(s.zone.current, s.zone.highestCleared + 1);
  s.zone.highestReached = Math.max(s.zone.current, nonNegInt(s.zone.highestReached));
  s.zone.kills = nonNegInt(s.zone.kills);
  s.records.highestZoneEver = Math.max(s.zone.highestReached, nonNegInt(s.records.highestZoneEver));
  const mode = isObj(src.settings) ? src.settings.buyMode : undefined;
  s.settings.buyMode = BUY_MODES.includes(mode) ? mode : 1;
  return s;
}

/* ------------------------------------------------------------------ */
/* Sérialisation                                                       */
/* ------------------------------------------------------------------ */

export function serializeState(state, now = Date.now()) {
  return JSON.stringify({ version: SAVE_VERSION, savedAt: now, state: { ...state, lastSeen: now } });
}

/**
 * Analyse un texte de sauvegarde.
 * @returns {{ ok: true, state, savedAt, migratedFrom: number|null } | { ok: false, reason }}
 */
export function parseSave(text, now = Date.now()) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, reason: 'corrupt' };
  }
  if (!isObj(data) || !isObj(data.state)) return { ok: false, reason: 'corrupt' };
  const version = Number.isInteger(data.version) ? data.version : 0;
  if (version > SAVE_VERSION) return { ok: false, reason: 'newer', version };
  try {
    const migrated = migrate(data.state, version);
    const state = normalizeState(migrated, now);
    return { ok: true, state, savedAt: finiteOr(data.savedAt, now), migratedFrom: version < SAVE_VERSION ? version : null };
  } catch {
    return { ok: false, reason: 'corrupt' };
  }
}

/* ------------------------------------------------------------------ */
/* Stockage (localStorage ou équivalent, injectable pour les tests)    */
/* ------------------------------------------------------------------ */

export function writeSave(storage, state, now = Date.now()) {
  try {
    storage.setItem(SAVE_KEY, serializeState(state, now));
    return true;
  } catch {
    return false; // quota dépassé, navigation privée…
  }
}

/**
 * Charge la sauvegarde.
 * status : 'new' | 'loaded' | 'migrated' | 'corrupt' | 'newer' | 'unavailable'
 */
export function readSave(storage, now = Date.now()) {
  let text;
  try {
    text = storage.getItem(SAVE_KEY);
  } catch {
    return { status: 'unavailable', state: null };
  }
  if (text == null) return { status: 'new', state: null };
  const result = parseSave(text, now);
  if (!result.ok) {
    if (result.reason === 'corrupt') {
      try { storage.setItem(`${SAVE_KEY}:corrupt-${now}`, text); } catch { /* ignoré */ }
    }
    return { status: result.reason, state: null };
  }
  if (result.migratedFrom !== null) {
    try { storage.setItem(BACKUP_KEY, text); } catch { /* ignoré */ }
    return { status: 'migrated', state: result.state, savedAt: result.savedAt };
  }
  return { status: 'loaded', state: result.state, savedAt: result.savedAt };
}

/* Export / import texte (base64, compatible UTF-8). */
export function encodeExport(state, now = Date.now()) {
  const bytes = new TextEncoder().encode(serializeState(state, now));
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

export function decodeImport(text, now = Date.now()) {
  try {
    const bin = atob(text.trim());
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return parseSave(new TextDecoder().decode(bytes), now);
  } catch {
    return { ok: false, reason: 'corrupt' };
  }
}
