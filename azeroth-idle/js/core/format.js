import { Big } from './bignum.js';

const SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];

/** Tronque (sans arrondir vers le haut) à `digits` décimales et retire les zéros inutiles. */
function truncate(value, digits) {
  const f = Math.pow(10, digits);
  const t = Math.floor(value * f + 1e-9) / f;
  return t.toFixed(digits).replace(/\.?0+$/, '');
}

/**
 * Affiche un nombre de façon lisible : 999, 1.52K, 12.3M, 456B… puis 1.23e45.
 * Les valeurs sont tronquées : on n'affiche jamais plus que ce que l'on possède.
 */
export function formatNumber(x) {
  const b = Big.from(x);
  if (b.isZero()) return '0';
  if (b.isNegative()) return '-' + formatNumber(b.neg());
  if (b.e < 3) {
    const n = b.toNumber();
    if (n < 10 && !Number.isInteger(n)) return truncate(n, 1);
    return String(Math.floor(n + 1e-9));
  }
  const tier = Math.floor(b.e / 3);
  if (tier < SUFFIXES.length) {
    const scaled = b.m * Math.pow(10, b.e - tier * 3);
    const digits = scaled >= 100 ? 0 : scaled >= 10 ? 1 : 2;
    return truncate(scaled, digits) + SUFFIXES[tier];
  }
  return `${truncate(b.m, 2)}e${b.e}`;
}

export function formatPercent(fraction, digits = 0) {
  return `${(fraction * 100).toFixed(digits)} %`;
}

export function formatDuration(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h > 0) return `${h} h ${String(m).padStart(2, '0')} min`;
  if (m > 0) return `${m} min ${String(r).padStart(2, '0')} s`;
  return `${r} s`;
}
