import { esc } from './dom.js';

/**
 * Chargement des illustrations (PNG / WebP).
 *
 * Chaque sprite est référencé par un chemin sans extension, par exemple
 * "assets/heroes/brannoc". On essaie .webp puis .png. Tant qu'aucun fichier
 * n'existe, l'interface affiche un emplacement décoratif neutre (cadre +
 * monogramme) — jamais un faux personnage dessiné en code.
 */

const EXTENSIONS = ['webp', 'png'];
const pending = new Map();   // base → Promise<string|null>
const resolved = new Map();  // base → url | null (résultat connu)

function tryLoad(base) {
  return new Promise((resolve) => {
    let i = 0;
    const next = () => {
      if (i >= EXTENSIONS.length) { resolve(null); return; }
      const url = `${base}.${EXTENSIONS[i++]}`;
      const img = new Image();
      img.onload = () => resolve(url);
      img.onerror = next;
      img.src = url;
    };
    next();
  });
}

export function resolveAsset(base) {
  if (!pending.has(base)) {
    pending.set(base, tryLoad(base).then((url) => { resolved.set(base, url); return url; }));
  }
  return pending.get(base);
}

export function knownAsset(base) {
  return resolved.has(base) ? resolved.get(base) : undefined;
}

export function initials(name) {
  const words = name.replace(/[,'’]/g, ' ').split(/[\s-]+/).filter((w) => w.length > 2 || /^[A-ZÉÈ]/.test(w));
  const letters = words.slice(0, 2).map((w) => w[0].toUpperCase()).join('');
  return letters || name.slice(0, 2).toUpperCase();
}

/**
 * HTML d'un emplacement de sprite. Si l'image est déjà connue, elle est
 * insérée directement ; sinon un emplacement est affiché puis hydraté.
 */
export function spriteSlot(base, { name, kind = 'hero', color = '#d9a033', cls = '' } = {}) {
  const url = knownAsset(base);
  if (url) {
    return `<div class="sprite-slot has-sprite kind-${kind} ${cls}" style="--slot-color:${color}">`
      + `<img class="sprite-img" src="${esc(url)}" alt="${esc(name)}" draggable="false"></div>`;
  }
  const hydrate = url === undefined ? ` data-sprite="${esc(base)}"` : '';
  return `<div class="sprite-slot kind-${kind} ${cls}"${hydrate} style="--slot-color:${color}" data-name="${esc(name)}">`
    + `<span class="monogram">${esc(initials(name))}</span></div>`;
}

/** Remplace les emplacements par les vraies images dès qu'elles sont chargées. */
export function hydrateSprites(root) {
  for (const el of root.querySelectorAll('[data-sprite]')) {
    const base = el.getAttribute('data-sprite');
    el.removeAttribute('data-sprite');
    resolveAsset(base).then((url) => {
      if (!url || !el.isConnected) return;
      const img = new Image();
      img.className = 'sprite-img';
      img.alt = el.getAttribute('data-name') || '';
      img.draggable = false;
      img.src = url;
      el.replaceChildren(img);
      el.classList.add('has-sprite');
    });
  }
}
