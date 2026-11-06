import { Big } from './bignum.js';

/**
 * Coûts d'achat de niveaux : chaque niveau coûte `growth` fois le précédent.
 * coût(L) = base × growth^L
 * coût de n niveaux à partir de L = coût(L) × (growth^n − 1) / (growth − 1)
 */

export function levelCost(baseCost, level, growth) {
  return Big.from(baseCost).mul(Big.from(growth).pow(level));
}

export function costForLevels(baseCost, level, count, growth) {
  if (count <= 0) return Big.ZERO;
  const first = levelCost(baseCost, level, growth);
  return first.mul(Big.from(growth).pow(count).sub(1).div(growth - 1));
}

/** Nombre maximal de niveaux achetables avec `gold`. */
export function maxAffordable(baseCost, level, gold, growth, cap = 1_000_000) {
  const g = Big.from(gold);
  const first = levelCost(baseCost, level, growth);
  if (g.lt(first)) return 0;
  const x = g.mul(growth - 1).div(first).add(1);
  let n = Math.min(cap, Math.floor(x.log10() / Math.log10(growth)));
  // Corrige les imprécisions de log10 dans les deux sens.
  while (n > 0 && costForLevels(baseCost, level, n, growth).gt(g)) n -= 1;
  while (n < cap && costForLevels(baseCost, level, n + 1, growth).lte(g)) n += 1;
  return n;
}

export const BUY_MODES = [1, 10, 25, 100, 'max'];

/**
 * Résout un mode d'achat (x1, x10, x25, x100, MAX).
 * En mode MAX sans fonds suffisants, on affiche le prix d'un seul niveau.
 */
export function resolvePurchase(mode, baseCost, level, gold, growth) {
  if (mode === 'max') {
    const n = maxAffordable(baseCost, level, gold, growth);
    const count = Math.max(1, n);
    return { count, cost: costForLevels(baseCost, level, count, growth), affordable: n > 0 };
  }
  const count = Math.max(1, Number(mode) || 1);
  const cost = costForLevels(baseCost, level, count, growth);
  return { count, cost, affordable: Big.from(gold).gte(cost) };
}
