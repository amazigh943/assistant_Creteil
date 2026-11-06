import { BALANCE, GAME } from './config.js';
import { HERO_BY_ID, UPGRADES } from './data/heroes.js';
import { SKILLS } from './data/progression.js';
import { createInitialState } from './core/state.js';
import { computeStats } from './core/stats.js';
import {
  createGame, tick, playerClick, travelToZone, simulateIdle, spawnMonster, isBossZone, regionForZone,
} from './core/combat.js';
import {
  buyHero, buyUpgrade, upgradeStatus, activateSkill, buyIdol, buyMount, buyShopItem, ascend, soulsForAscension,
} from './core/actions.js';
import { readSave, writeSave, encodeExport, decodeImport, SAVE_KEY } from './core/save.js';
import { formatNumber, formatDuration } from './core/format.js';
import { Hud } from './ui/hud.js';
import { Scene } from './ui/scene.js';
import { PanelHost } from './ui/panels.js';
import { toast, openModal } from './ui/overlay.js';
import { $, esc, setupTooltips } from './ui/dom.js';

/* ------------------------------------------------------------------ */
/* Stockage                                                            */
/* ------------------------------------------------------------------ */

function safeStorage() {
  try {
    const k = '__aldoria_test__';
    localStorage.setItem(k, '1');
    localStorage.removeItem(k);
    return { storage: localStorage, persistent: true };
  } catch {
    const mem = new Map();
    return {
      storage: { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) },
      persistent: false,
    };
  }
}

const { storage, persistent } = safeStorage();
const bootTime = Date.now();
const loaded = persistent ? readSave(storage, bootTime) : { status: 'unavailable', state: null };
let saveBlocked = loaded.status === 'newer';
let lastSave = bootTime;

const game = createGame(loaded.state ?? createInitialState(bootTime));

let offlineResult = null;
if (loaded.state && loaded.savedAt) {
  const seconds = (bootTime - loaded.savedAt) / 1000;
  if (seconds > 30) offlineResult = simulateIdle(game, seconds, computeStats(game.state, bootTime, { includeTemporary: false }));
}

function save() {
  lastSave = Date.now();
  if (saveBlocked) return false;
  return writeSave(storage, game.state, lastSave);
}

/* ------------------------------------------------------------------ */
/* Interface                                                           */
/* ------------------------------------------------------------------ */

document.title = `${GAME.title} — ${GAME.subtitle}`;
$('.brand-title').textContent = GAME.title;
$('.brand-sub').textContent = GAME.subtitle;
setupTooltips();

const hud = new Hud($('#hud'));

const scene = new Scene($('#stage'), {
  onAttack: () => playerClick(game, Date.now()),
  onTravel: (zone) => travelToZone(game, zone, Date.now()),
  onStep: (step) => travelToZone(game, game.state.zone.current + step, Date.now()),
  onToggleAuto: () => { game.state.autoProgress = !game.state.autoProgress; },
  onSkill: (id) => useSkill(id),
});

let initialTab = 'heroes';
try { initialTab = localStorage.getItem('aldoria-idle/tab') || 'heroes'; } catch { /* ignoré */ }
const panels = new PanelHost($('#tabs'), $('#panel'), onAction, initialTab);

function useSkill(id) {
  const res = activateSkill(game, id, Date.now());
  if (!res.ok && res.reason) toast(res.reason, { kind: 'muted' });
}

function onAction(action, id) {
  const now = Date.now();
  let res = { ok: true };
  switch (action) {
    case 'buy-hero': res = buyHero(game, id); break;
    case 'buy-upgrade': res = buyUpgrade(game, id); break;
    case 'buy-all-upgrades': {
      const list = UPGRADES.filter((u) => upgradeStatus(game.state, u.id) !== 'owned').sort((a, b) => a.cost - b.cost);
      let count = 0;
      for (const u of list) if (buyUpgrade(game, u.id).ok) count += 1;
      res = count ? { ok: true } : { ok: false, reason: "Pas assez d'or" };
      break;
    }
    case 'buy-mode': game.state.settings.buyMode = id === 'max' ? 'max' : Number(id); break;
    case 'buy-mount': res = buyMount(game, id); break;
    case 'buy-idol': res = buyIdol(game, id); break;
    case 'buy-shop': res = buyShopItem(game, id, now); if (res.ok) toast('Achat effectué', { kind: 'success', iconName: 'ether' }); break;
    case 'ascend': confirmAscension(); return;
    default: return;
  }
  if (!res.ok && res.reason) toast(res.reason, { kind: 'muted' });
  panels.update(game, now);
  hud.update(game, now);
}

function confirmAscension() {
  const souls = soulsForAscension(game.state);
  openModal({
    title: 'Ascension',
    html: `<p>Vous allez recommencer en zone 1 et perdre votre or, vos niveaux de héros et vos améliorations.</p>
      <p>Vous recevrez <b>${formatNumber(souls)} âme(s)</b> et une relique. Âmes, idoles, reliques, montures et éclats d'éther sont conservés.</p>`,
    actions: [
      { label: 'Annuler', kind: 'secondary' },
      { label: 'Monter en Ascension', kind: 'primary', onClick: (close) => {
        const res = ascend(game, Date.now());
        close();
        if (res.ok) { panels.invalidate(); save(); }
        else toast(res.reason, { kind: 'muted' });
      } },
    ],
  });
}

/* ------------------------------------------------------------------ */
/* Événements du moteur → affichage                                    */
/* ------------------------------------------------------------------ */

function drainEvents() {
  const floating = game.state.settings.floatingText;
  for (const ev of game.events) {
    switch (ev.type) {
      case 'hit': scene.onHit(ev, floating); break;
      case 'kill': scene.onKill(ev); hud.pulse('gold'); break;
      case 'ether': scene.onEther(ev.amount); hud.pulse('ether'); break;
      case 'zoneCleared':
        if (isBossZone(ev.zone)) {
          toast(`Boss vaincu ! Zone ${ev.zone} conquise.`, { kind: 'success', iconName: 'crown' });
          if (ev.zone % BALANCE.zonesPerRegion === 0) {
            const { region } = regionForZone(ev.zone + 1);
            toast(`Nouvelle région découverte : ${region.name}`, { kind: 'gold', iconName: 'map' });
          }
        }
        break;
      case 'bossFailed':
        toast('Le boss vous a repoussé. Renforcez vos héros, puis relancez la progression auto.', { kind: 'danger', iconName: 'hourglass', duration: 5000 });
        break;
      case 'relic': toast(`Relique trouvée : ${ev.relic.name} (niv. ${ev.level})`, { kind: 'gold' }); panels.invalidate(); break;
      case 'skill': toast(`${ev.skill.name} !`, { kind: 'gold', iconName: ev.skill.id }); break;
      case 'heroLevel':
        if (ev.recruited) toast(`${HERO_BY_ID[ev.heroId].name} rejoint votre compagnie !`, { kind: 'success' });
        break;
      case 'ascension': toast(`Ascension réussie : +${formatNumber(ev.souls)} âme(s)`, { kind: 'gold', iconName: 'soul', duration: 5000 }); break;
      default: break;
    }
  }
  game.events.length = 0;
}

/* ------------------------------------------------------------------ */
/* Boucle principale                                                   */
/* ------------------------------------------------------------------ */

let last = performance.now();
let hudAt = 0;
let panelAt = 0;
let errorShown = false;

function frame(t) {
  try {
    const now = Date.now();
    let dt = (t - last) / 1000;
    last = t;
    if (dt > 5) {
      // Onglet en arrière-plan : on applique les gains d'absence en une fois.
      const res = simulateIdle(game, dt, computeStats(game.state, now, { includeTemporary: false }));
      if (res.kills > 0) toast(`Pendant votre absence : ${formatNumber(res.kills)} monstres, +${formatNumber(res.gold)} or`, { kind: 'gold', iconName: 'gold', duration: 5000 });
    } else {
      while (dt > 0) {
        const step = Math.min(dt, 0.05);
        tick(game, step, now);
        dt -= step;
      }
    }
    drainEvents();
    scene.update(game, now);
    if (t - hudAt > 100) { hud.update(game, now); hudAt = t; }
    if (t - panelAt > 200) { panels.update(game, now); panelAt = t; }
    if (now - lastSave > BALANCE.autosaveSeconds * 1000) save();
  } catch (err) {
    console.error(err);
    if (!errorShown) { errorShown = true; toast('Une erreur est survenue (voir la console). Le jeu continue.', { kind: 'danger' }); }
  }
  requestAnimationFrame(frame);
}

/* ------------------------------------------------------------------ */
/* Raccourcis, sauvegarde à la fermeture, paramètres                   */
/* ------------------------------------------------------------------ */

document.addEventListener('keydown', (e) => {
  if (e.target.closest?.('input, textarea, select') || e.ctrlKey || e.metaKey || e.altKey) return;
  const skill = SKILLS.find((s) => s.key === e.key);
  if (skill && !e.repeat) useSkill(skill.id);
});

document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') save(); });
window.addEventListener('pagehide', save);

function openSettings() {
  const ago = Math.round((Date.now() - lastSave) / 1000);
  const { el, close } = openModal({
    title: 'Paramètres',
    html: `
      <section class="settings-section"><h3>Sauvegarde</h3>
        <p class="muted">${persistent ? `Sauvegarde automatique toutes les ${BALANCE.autosaveSeconds} s dans ce navigateur. Dernière sauvegarde : il y a ${formatDuration(ago)}.` : 'Stockage local indisponible : la progression ne sera pas conservée.'}
        ${saveBlocked ? '<br><b>Sauvegarde automatique suspendue :</b> la sauvegarde existante provient d’une version plus récente du jeu.' : ''}</p>
        <div class="row"><button class="btn-secondary" data-set="save">Sauvegarder maintenant</button>
        <button class="btn-secondary" data-set="export">Exporter</button><button class="btn-secondary" data-set="import">Importer</button></div>
        <textarea class="save-text" rows="4" spellcheck="false" placeholder="Code de sauvegarde (export / import)"></textarea>
      </section>
      <section class="settings-section"><h3>Affichage</h3>
        <label class="check"><input type="checkbox" data-set="floating" ${game.state.settings.floatingText ? 'checked' : ''}> Afficher les dégâts flottants</label>
      </section>
      <section class="settings-section danger"><h3>Zone dangereuse</h3>
        <button class="btn-danger" data-set="reset">Réinitialiser la partie</button>
      </section>`,
  });
  const text = el.querySelector('.save-text');
  el.querySelector('[data-set="floating"]').addEventListener('change', (e) => { game.state.settings.floatingText = e.target.checked; });
  el.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-set]');
    if (!btn || btn.tagName === 'INPUT') return;
    const what = btn.dataset.set;
    if (what === 'save') toast(save() ? 'Partie sauvegardée' : 'Échec de la sauvegarde', { kind: 'success' });
    if (what === 'export') { text.value = encodeExport(game.state); text.select(); navigator.clipboard?.writeText(text.value).then(() => toast('Code copié dans le presse-papiers', { kind: 'success' }), () => {}); }
    if (what === 'import') {
      const res = decodeImport(text.value);
      if (!res.ok) { toast(res.reason === 'newer' ? 'Ce code vient d’une version plus récente du jeu.' : 'Code de sauvegarde invalide.', { kind: 'danger' }); return; }
      close();
      replaceState(res.state);
      toast('Sauvegarde importée', { kind: 'success' });
    }
    if (what === 'reset') {
      close();
      openModal({
        title: 'Réinitialiser ?',
        html: '<p>Toute votre progression (y compris âmes, reliques et montures) sera définitivement effacée.</p>',
        actions: [{ label: 'Annuler', kind: 'secondary' }, { label: 'Tout effacer', kind: 'danger', onClick: (c) => { c(); replaceState(createInitialState(Date.now())); toast('Nouvelle partie', { kind: 'muted' }); } }],
      });
    }
  });
}

function replaceState(state) {
  game.state = state;
  game.statsDirty = true;
  game.events.length = 0;
  saveBlocked = false;
  spawnMonster(game, Date.now());
  panels.invalidate();
  save();
}

$('#btn-settings').addEventListener('click', openSettings);

/* ------------------------------------------------------------------ */
/* Démarrage                                                           */
/* ------------------------------------------------------------------ */

if (loaded.status === 'migrated') toast('Sauvegarde mise à jour vers la nouvelle version (copie de secours conservée).', { kind: 'success' });
if (loaded.status === 'unavailable') toast('Stockage local indisponible : la progression ne sera pas sauvegardée.', { kind: 'danger', duration: 6000 });
if (loaded.status === 'corrupt') {
  openModal({ title: 'Sauvegarde illisible', html: `<p>La sauvegarde n'a pas pu être lue. Une copie a été conservée dans le stockage du navigateur (clé <code>${esc(SAVE_KEY)}:corrupt-…</code>) et une nouvelle partie commence.</p>` });
}
if (loaded.status === 'newer') {
  openModal({ title: 'Version plus récente détectée', html: '<p>Votre sauvegarde a été créée par une version plus récente du jeu. Pour ne pas l’écraser, la sauvegarde automatique est suspendue. Rechargez la dernière version du jeu.</p>' });
}
if (offlineResult && offlineResult.kills > 0) {
  openModal({
    title: 'Bon retour, aventurier !',
    html: `<p>Pendant votre absence (${formatDuration(offlineResult.seconds)}), vos héros ont vaincu
      <b>${formatNumber(offlineResult.kills)}</b> monstres et rapporté <b>${formatNumber(offlineResult.gold)}</b> pièces d'or.</p>`,
    actions: [{ label: 'Au combat !', kind: 'primary' }],
  });
}
if (loaded.status === 'new') {
  toast('Cliquez sur la scène pour attaquer, puis recrutez vos premiers héros !', { kind: 'gold', duration: 6000 });
}

save();
requestAnimationFrame((t) => { last = t; frame(t); });

// Accès console pour le débogage : window.aldoria.game
window.aldoria = { game, save };
