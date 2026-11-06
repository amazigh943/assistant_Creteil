/**
 * Big — nombre immuable « mantisse × 10^exposant ».
 *
 * Les jeux idle dépassent rapidement la limite des nombres JavaScript
 * (~1.8e308). Big stocke une mantisse dans [1, 10) et un exposant entier,
 * ce qui suffit pour des valeurs jusqu'à 10^(9e15).
 *
 * Toutes les opérations renvoient une nouvelle instance.
 */

const PRECISION_DIGITS = 17; // au-delà, l'opérande la plus petite est négligeable

export class Big {
  constructor(m = 0, e = 0) {
    this.m = m;
    this.e = e;
    Object.freeze(this);
  }

  /** Normalise une paire (mantisse, exposant) quelconque. */
  static norm(m, e = 0) {
    if (Number.isNaN(m) || m === 0) return Big.ZERO;
    if (!Number.isFinite(m)) return new Big(Math.sign(m) * 1.7976931348623157, 308 + e);
    const shift = Math.floor(Math.log10(Math.abs(m)));
    if (shift < -300) return Big.ZERO;
    // Arrondi à 14 chiffres significatifs : élimine le bruit des flottants
    // (ex. 10 − 4 = 5.999999999999999 → 6).
    let mm = Math.round((m / Math.pow(10, shift)) * 1e13) / 1e13;
    let ee = e + shift;
    // Corrige les erreurs d'arrondi de log10 (ex. 9.9999999 → 10).
    if (Math.abs(mm) >= 10) { mm /= 10; ee += 1; }
    else if (Math.abs(mm) < 1) { mm *= 10; ee -= 1; }
    return new Big(mm, ee);
  }

  static from(x) {
    if (x instanceof Big) return x;
    if (typeof x === 'number') return Big.norm(x, 0);
    if (typeof x === 'string') {
      const [a, b] = x.trim().toLowerCase().split('e');
      const m = parseFloat(a);
      const e = b === undefined ? 0 : parseInt(b, 10);
      if (Number.isNaN(m) || Number.isNaN(e)) return Big.ZERO;
      return Big.norm(m, e);
    }
    if (x && typeof x === 'object' && 'm' in x && 'e' in x) return Big.norm(Number(x.m), Number(x.e));
    return Big.ZERO;
  }

  /** Construit 10^l (l peut être fractionnaire). */
  static fromLog10(l) {
    if (!Number.isFinite(l)) return Big.ZERO;
    const e = Math.floor(l);
    return Big.norm(Math.pow(10, l - e), e);
  }

  static max(a, b) { a = Big.from(a); b = Big.from(b); return a.gte(b) ? a : b; }
  static min(a, b) { a = Big.from(a); b = Big.from(b); return a.lte(b) ? a : b; }

  isZero() { return this.m === 0; }
  isNegative() { return this.m < 0; }
  neg() { return new Big(-this.m, this.e); }

  add(other) {
    const b = Big.from(other);
    if (this.m === 0) return b;
    if (b.m === 0) return this;
    const d = this.e - b.e;
    if (d > PRECISION_DIGITS) return this;
    if (d < -PRECISION_DIGITS) return b;
    if (d >= 0) return Big.norm(this.m + b.m / Math.pow(10, d), this.e);
    return Big.norm(this.m / Math.pow(10, -d) + b.m, b.e);
  }

  sub(other) { return this.add(Big.from(other).neg()); }

  mul(other) {
    const b = Big.from(other);
    if (this.m === 0 || b.m === 0) return Big.ZERO;
    return Big.norm(this.m * b.m, this.e + b.e);
  }

  div(other) {
    const b = Big.from(other);
    if (b.m === 0) throw new RangeError('Big: division par zéro');
    if (this.m === 0) return Big.ZERO;
    return Big.norm(this.m / b.m, this.e - b.e);
  }

  /** Puissance réelle d'un nombre positif. */
  pow(n) {
    if (n === 0) return Big.ONE;
    if (this.m === 0) return Big.ZERO;
    if (this.m < 0) throw new RangeError('Big: pow sur un nombre négatif');
    return Big.fromLog10(this.log10() * n);
  }

  log10() {
    if (this.m <= 0) return -Infinity;
    return Math.log10(this.m) + this.e;
  }

  floor() {
    if (this.e >= 16) return this;
    return Big.from(Math.floor(this.toNumber()));
  }

  ceil() {
    if (this.e >= 16) return this;
    return Big.from(Math.ceil(this.toNumber()));
  }

  cmp(other) {
    const b = Big.from(other);
    const sa = Math.sign(this.m);
    const sb = Math.sign(b.m);
    if (sa !== sb) return sa > sb ? 1 : -1;
    if (sa === 0) return 0;
    if (this.e !== b.e) return (this.e > b.e ? 1 : -1) * sa;
    if (this.m === b.m) return 0;
    return this.m > b.m ? 1 : -1;
  }

  gt(o) { return this.cmp(o) > 0; }
  gte(o) { return this.cmp(o) >= 0; }
  lt(o) { return this.cmp(o) < 0; }
  lte(o) { return this.cmp(o) <= 0; }
  eq(o) { return this.cmp(o) === 0; }

  toNumber() {
    if (this.e > 308) return this.m > 0 ? Infinity : -Infinity;
    if (this.e < -320) return 0;
    // Division pour les exposants négatifs : 3 / 10 est exact, 3 × 0.1 ne l'est pas.
    return this.e >= 0 ? this.m * Math.pow(10, this.e) : this.m / Math.pow(10, -this.e);
  }

  /** Format compact et sans perte pour la sauvegarde : "1.234e56". */
  toJSON() { return `${this.m}e${this.e}`; }
  toString() { return this.toJSON(); }
}

Big.ZERO = new Big(0, 0);
Big.ONE = new Big(1, 0);
