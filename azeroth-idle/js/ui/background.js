/**
 * Décors procéduraux des régions (paysages en couches avec perspective
 * atmosphérique). Utilisés tant que assets/zones/<regionId>.webp|png
 * n'est pas fourni. Uniquement des paysages : aucun personnage.
 *
 * Le SVG est généré une fois par région puis utilisé comme image de fond
 * (le navigateur le rastérise une seule fois).
 */

const W = 1600;
const H = 900;

function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgbToHex([r, g, b]) {
  return '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
}
/** Mélange deux couleurs hexadécimales (t = 0 → a, t = 1 → b). */
function mix(a, b, t) {
  const ca = hexToRgb(a); const cb = hexToRgb(b);
  return rgbToHex(ca.map((v, i) => v + (cb[i] - v) * t));
}
const shade = (hex, t) => (t >= 0 ? mix(hex, '#ffffff', t) : mix(hex, '#000000', -t));
const f = (n) => Math.round(n * 10) / 10;

/** Ligne de crête lissée (courbes de Bézier), fermée vers le bas. */
function ridgePath(rng, { y, amp, seg = 14, jag = 0, freq = 1 }) {
  const p1 = rng() * Math.PI * 2; const p2 = rng() * Math.PI * 2;
  const pts = [];
  for (let i = 0; i <= seg; i++) {
    const x = (i / seg) * (W + 200) - 100;
    const n = Math.sin((i / seg) * Math.PI * 2 * freq + p1) * 0.55
      + Math.sin((i / seg) * Math.PI * 5.3 * freq + p2) * 0.3
      + (rng() - 0.5) * 0.5;
    const peak = jag ? Math.abs(n) * jag + n * (1 - jag) : n;
    pts.push([x, y - peak * amp]);
  }
  let d = `M${f(pts[0][0])},${H + 10} L${f(pts[0][0])},${f(pts[0][1])}`;
  if (jag > 0.5) {
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1]; const [x1, y1] = pts[i];
      const mx = (x0 + x1) / 2; const my = Math.min(y0, y1) - amp * 0.35 * rng();
      d += ` L${f(mx)},${f(my)} L${f(x1)},${f(y1)}`;
    }
  } else {
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1]; const [x1, y1] = pts[i];
      const cx = (x0 + x1) / 2;
      d += ` C${f(cx)},${f(y0)} ${f(cx)},${f(y1)} ${f(x1)},${f(y1)}`;
    }
  }
  return `${d} L${f(pts[pts.length - 1][0])},${H + 10} Z`;
}

/* --------------------------- éléments de décor --------------------------- */

function roundTree(x, y, s, c, light) {
  const trunk = `<path d="M${f(x - 5 * s)},${f(y)} q${f(3 * s)},${f(-30 * s)} ${f(2 * s)},${f(-60 * s)} h${f(6 * s)} q${f(-1 * s)},${f(30 * s)} ${f(2 * s)},${f(60 * s)}z" fill="${shade(c, -0.35)}"/>`;
  const blobs = [[0, -78, 34], [-26, -62, 26], [26, -60, 27], [-12, -95, 24], [14, -96, 22]]
    .map(([dx, dy, r]) => `<circle cx="${f(x + dx * s)}" cy="${f(y + dy * s)}" r="${f(r * s)}"/>`).join('');
  const hi = [[-8, -92, 14], [-28, -68, 12], [8, -84, 10]]
    .map(([dx, dy, r]) => `<circle cx="${f(x + dx * s)}" cy="${f(y + dy * s)}" r="${f(r * s)}"/>`).join('');
  return `${trunk}<g fill="${c}">${blobs}</g><g fill="${light}" opacity=".55">${hi}</g>`;
}

function pineTree(x, y, s, c, snow) {
  let out = `<rect x="${f(x - 4 * s)}" y="${f(y - 18 * s)}" width="${f(8 * s)}" height="${f(18 * s)}" fill="${shade(c, -0.4)}"/>`;
  const tiers = [[0, 46, 34], [-26, 38, 28], [-50, 30, 22], [-72, 20, 16]];
  for (const [dy, w, h] of tiers) {
    const ty = y - 14 * s + dy * s;
    out += `<path d="M${f(x - w * s)},${f(ty)} Q${f(x)},${f(ty - 6 * s)} ${f(x + w * s)},${f(ty)} L${f(x)},${f(ty - h * s - 22 * s)}z" fill="${c}"/>`;
    if (snow) out += `<path d="M${f(x - w * 0.45 * s)},${f(ty - h * s * 0.55 - 10 * s)} L${f(x)},${f(ty - h * s - 22 * s)} L${f(x + w * 0.45 * s)},${f(ty - h * s * 0.55 - 10 * s)} Q${f(x)},${f(ty - h * s * 0.7 - 6 * s)} ${f(x - w * 0.45 * s)},${f(ty - h * s * 0.55 - 10 * s)}z" fill="#f4f9ff" opacity=".9"/>`;
  }
  return out;
}

function deadTree(x, y, s, c, rng) {
  let d = `M${f(x)},${f(y)} L${f(x + 2 * s)},${f(y - 110 * s)}`;
  for (let i = 0; i < 5; i++) {
    const by = y - (40 + i * 16) * s;
    const dir = i % 2 ? 1 : -1;
    const len = (24 + rng() * 26) * s;
    d += ` M${f(x + s)},${f(by)} q${f(dir * len * 0.5)},${f(-10 * s)} ${f(dir * len)},${f(-len * 0.7)}`;
  }
  return `<path d="${d}" stroke="${c}" stroke-width="${f(7 * s)}" stroke-linecap="round" fill="none"/>`
    + `<path d="M${f(x - 9 * s)},${f(y)} L${f(x - 2 * s)},${f(y - 50 * s)} L${f(x + 6 * s)},${f(y - 50 * s)} L${f(x + 12 * s)},${f(y)}z" fill="${c}"/>`;
}

function twistedTree(x, y, s, c, moss) {
  const t = `<path d="M${f(x - 14 * s)},${f(y)} C${f(x - 4 * s)},${f(y - 60 * s)} ${f(x - 24 * s)},${f(y - 120 * s)} ${f(x - 6 * s)},${f(y - 190 * s)} L${f(x + 6 * s)},${f(y - 188 * s)} C${f(x - 6 * s)},${f(y - 120 * s)} ${f(x + 14 * s)},${f(y - 60 * s)} ${f(x + 16 * s)},${f(y)}z" fill="${c}"/>`;
  const b = `<path d="M${f(x - 6 * s)},${f(y - 120 * s)} q${f(-40 * s)},${f(-10 * s)} ${f(-70 * s)},${f(-50 * s)} M${f(x)},${f(y - 150 * s)} q${f(40 * s)},${f(-6 * s)} ${f(74 * s)},${f(-44 * s)} M${f(x - 4 * s)},${f(y - 175 * s)} q${f(-26 * s)},${f(-20 * s)} ${f(-36 * s)},${f(-44 * s)}" stroke="${c}" stroke-width="${f(8 * s)}" stroke-linecap="round" fill="none"/>`;
  const hang = [-60, -30, 40, 64].map((dx) => `<path d="M${f(x + dx * s)},${f(y - 160 * s)} q${f(3 * s)},${f(26 * s)} 0,${f(46 * s)}" stroke="${moss}" stroke-width="${f(3 * s)}" fill="none" opacity=".7"/>`).join('');
  return t + b + hang;
}

function palmTree(x, y, s, c, light) {
  const trunk = `<path d="M${f(x - 7 * s)},${f(y)} Q${f(x - 20 * s)},${f(y - 80 * s)} ${f(x + 10 * s)},${f(y - 150 * s)} L${f(x + 18 * s)},${f(y - 146 * s)} Q${f(x - 8 * s)},${f(y - 80 * s)} ${f(x + 7 * s)},${f(y)}z" fill="${shade(c, -0.3)}"/>`;
  const top = [x + 14 * s, y - 150 * s];
  const fronds = [[-95, 20], [-60, -25], [-10, -45], [45, -30], [90, 15], [70, 45], [-70, 48]]
    .map(([dx, dy]) => `<path d="M${f(top[0])},${f(top[1])} Q${f(top[0] + dx * 0.5 * s)},${f(top[1] + (dy - 30) * s)} ${f(top[0] + dx * s)},${f(top[1] + dy * s)} Q${f(top[0] + dx * 0.45 * s)},${f(top[1] + (dy - 8) * s)} ${f(top[0])},${f(top[1])}z" fill="${c}"/>`).join('');
  return trunk + fronds + `<circle cx="${f(top[0])}" cy="${f(top[1])}" r="${f(8 * s)}" fill="${light}" opacity=".5"/>`;
}

function acaciaTree(x, y, s, c) {
  return `<path d="M${f(x - 4 * s)},${f(y)} L${f(x - 2 * s)},${f(y - 50 * s)} L${f(x - 30 * s)},${f(y - 90 * s)} M${f(x)},${f(y - 50 * s)} L${f(x + 34 * s)},${f(y - 92 * s)} M${f(x)},${f(y - 60 * s)} L${f(x + 4 * s)},${f(y - 96 * s)}" stroke="${shade(c, -0.25)}" stroke-width="${f(6 * s)}" stroke-linecap="round" fill="none"/>`
    + `<ellipse cx="${f(x)}" cy="${f(y - 100 * s)}" rx="${f(78 * s)}" ry="${f(16 * s)}" fill="${c}"/>`
    + `<ellipse cx="${f(x - 10 * s)}" cy="${f(y - 108 * s)}" rx="${f(50 * s)}" ry="${f(10 * s)}" fill="${c}"/>`;
}

function crystal(x, y, s, c, glow) {
  return `<g><path d="M${f(x)},${f(y)} L${f(x - 18 * s)},${f(y - 60 * s)} L${f(x - 4 * s)},${f(y - 130 * s)} L${f(x + 14 * s)},${f(y - 70 * s)}z" fill="${c}"/>`
    + `<path d="M${f(x - 4 * s)},${f(y - 130 * s)} L${f(x + 14 * s)},${f(y - 70 * s)} L${f(x)},${f(y)}z" fill="${glow}" opacity=".35"/>`
    + `<path d="M${f(x + 10 * s)},${f(y)} L${f(x + 22 * s)},${f(y - 50 * s)} L${f(x + 34 * s)},${f(y - 8 * s)}z" fill="${c}"/></g>`;
}

function ruinPillar(x, y, s, c) {
  const h = 90 * s;
  return `<rect x="${f(x - 12 * s)}" y="${f(y - h)}" width="${f(24 * s)}" height="${f(h)}" fill="${c}"/>`
    + `<rect x="${f(x - 17 * s)}" y="${f(y - h - 8 * s)}" width="${f(34 * s)}" height="${f(9 * s)}" fill="${shade(c, 0.08)}"/>`
    + `<path d="M${f(x - 12 * s)},${f(y - h)} l${f(8 * s)},${f(-10 * s)} l${f(6 * s)},${f(8 * s)} l${f(10 * s)},${f(-6 * s)} v${f(8 * s)}z" fill="${c}"/>`;
}

function floatingIsland(x, y, s, top, rock) {
  return `<path d="M${f(x - 70 * s)},${f(y)} Q${f(x)},${f(y - 16 * s)} ${f(x + 70 * s)},${f(y)} L${f(x + 30 * s)},${f(y + 40 * s)} L${f(x + 6 * s)},${f(y + 90 * s)} L${f(x - 26 * s)},${f(y + 44 * s)}z" fill="${rock}"/>`
    + `<path d="M${f(x - 70 * s)},${f(y)} Q${f(x)},${f(y - 16 * s)} ${f(x + 70 * s)},${f(y)} Q${f(x)},${f(y + 8 * s)} ${f(x - 70 * s)},${f(y)}z" fill="${top}"/>`;
}

function cloud(x, y, s, color, op) {
  const parts = [[0, 0, 60, 26], [-50, 8, 44, 20], [52, 6, 48, 22], [-14, -16, 40, 24], [24, -12, 36, 20]]
    .map(([dx, dy, rx, ry]) => `<ellipse cx="${f(x + dx * s)}" cy="${f(y + dy * s)}" rx="${f(rx * s)}" ry="${f(ry * s)}"/>`).join('');
  return `<g fill="${color}" opacity="${op}" filter="url(#soft)">${parts}</g>`;
}

/* ------------------------------- scène ------------------------------- */

function scatter(rng, n, fn, { xMin = -40, xMax = W + 40, avoidCenter = 0 } = {}) {
  let out = '';
  for (let i = 0; i < n; i++) {
    let x = xMin + ((i + rng() * 0.8) / n) * (xMax - xMin);
    if (avoidCenter && Math.abs(x - W / 2) < avoidCenter) x += (x < W / 2 ? -1 : 1) * avoidCenter;
    out += fn(x, i);
  }
  return out;
}

function decorLayer(decor, rng, p, depth, groundY) {
  // depth : 0 = lointain, 1 = proche
  const scale = 0.55 + depth * 0.75;
  const color = depth < 0.5 ? mix(p.mid, p.skyBottom, 0.25) : p.near;
  const light = shade(color, 0.18);
  const count = depth < 0.5 ? 16 : 7;
  const avoid = depth < 0.5 ? 0 : 260;
  const y = (x) => groundY + Math.sin(x / 140) * 6;
  switch (decor) {
    case 'meadow':
      return scatter(rng, count, (x) => roundTree(x, y(x), scale * (0.8 + rng() * 0.45), color, light), { avoidCenter: avoid });
    case 'coast':
      return scatter(rng, Math.round(count * 0.6), (x) => roundTree(x, y(x), scale * (0.7 + rng() * 0.4), color, light), { avoidCenter: avoid + 100 });
    case 'darkwood':
      return scatter(rng, Math.round(count * 0.8), (x) => twistedTree(x, y(x), scale * (0.75 + rng() * 0.4), color, shade(p.accent, -0.4)), { avoidCenter: avoid });
    case 'jungle':
      return scatter(rng, count, (x) => palmTree(x, y(x), scale * (0.8 + rng() * 0.4), color, light), { avoidCenter: avoid });
    case 'savanna':
      return scatter(rng, Math.round(count * 0.45), (x) => acaciaTree(x, y(x), scale * (0.8 + rng() * 0.5), color), { avoidCenter: avoid + 80 });
    case 'blight':
      return scatter(rng, Math.round(count * 0.7), (x, i) => (i % 3 === 0 ? ruinPillar(x, y(x), scale, color) : deadTree(x, y(x), scale * (0.8 + rng() * 0.4), color, rng)), { avoidCenter: avoid });
    case 'fel':
      return scatter(rng, Math.round(count * 0.8), (x) => twistedTree(x, y(x), scale * (0.75 + rng() * 0.4), color, p.accent), { avoidCenter: avoid });
    case 'shattered':
      return scatter(rng, Math.round(count * 0.6), (x) => crystal(x, y(x), scale * (0.7 + rng() * 0.6), color, p.accent), { avoidCenter: avoid });
    case 'tundra':
      return scatter(rng, count, (x) => pineTree(x, y(x), scale * (0.8 + rng() * 0.45), color, true), { avoidCenter: avoid });
    default:
      return '';
  }
}

function celestial(region, p) {
  const night = ['darkwood', 'blight', 'fel', 'shattered'].includes(region.decor);
  const cx = night ? 1180 : 1150; const cy = night ? 170 : 210;
  let out = `<circle cx="${cx}" cy="${cy}" r="260" fill="url(#sunGlow)"/>`;
  out += `<circle cx="${cx}" cy="${cy}" r="${night ? 58 : 70}" fill="${p.sun}" opacity="${night ? 0.9 : 0.95}"/>`;
  if (night) out += `<circle cx="${cx + 20}" cy="${cy - 12}" r="50" fill="${p.skyTop}" opacity=".35"/>`;
  if (region.decor === 'shattered') {
    out += `<circle cx="380" cy="190" r="120" fill="${shade(p.far, 0.15)}" opacity=".75"/><ellipse cx="380" cy="190" rx="200" ry="26" fill="none" stroke="${p.accent}" stroke-width="5" opacity=".4" transform="rotate(-14 380 190)"/>`;
  }
  return out;
}

function stars(rng, n) {
  let out = '<g fill="#fff">';
  for (let i = 0; i < n; i++) out += `<circle cx="${f(rng() * W)}" cy="${f(rng() * 420)}" r="${f(0.6 + rng() * 1.6)}" opacity="${f(0.3 + rng() * 0.6)}"/>`;
  return out + '</g>';
}

function groundDetails(rng, p, y0) {
  let out = '';
  for (let i = 0; i < 70; i++) {
    const x = rng() * W;
    const y = y0 + 40 + rng() * (H - y0 - 40);
    const s = 0.6 + ((y - y0) / (H - y0)) * 1.4;
    if (rng() < 0.6) {
      out += `<path d="M${f(x)},${f(y)} q${f(-3 * s)},${f(-10 * s)} ${f(-6 * s)},${f(-14 * s)} M${f(x)},${f(y)} q0,${f(-12 * s)} ${f(1 * s)},${f(-17 * s)} M${f(x)},${f(y)} q${f(3 * s)},${f(-9 * s)} ${f(7 * s)},${f(-12 * s)}" stroke="${shade(p.ground, 0.15)}" stroke-width="${f(1.6 * s)}" fill="none" stroke-linecap="round" opacity=".8"/>`;
    } else {
      out += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(6 * s)}" ry="${f(3 * s)}" fill="${shade(p.groundDark, 0.05)}" opacity=".6"/>`;
    }
  }
  return out;
}

export function buildRegionBackground(region, cycle = 0) {
  const rng = mulberry32(hashString(region.id));
  const p = { ...region.palette };
  if (cycle > 0) {
    // Cycles supérieurs : ambiance plus sombre et teintée de rouge.
    for (const k of ['skyTop', 'skyBottom', 'far', 'mid', 'near', 'ground', 'groundDark']) p[k] = mix(p[k], '#4a0f1a', Math.min(0.45, 0.18 * cycle));
  }
  const night = ['darkwood', 'blight', 'fel', 'shattered'].includes(region.decor);
  const horizon = 520;
  const groundY = 690;

  const farCol = mix(p.far, p.skyBottom, 0.35);
  const farCol2 = mix(p.far, p.skyBottom, 0.15);
  const midCol = mix(p.mid, p.skyBottom, 0.1);

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">`
    + '<defs>'
    + `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.skyTop}"/><stop offset=".72" stop-color="${p.skyBottom}"/></linearGradient>`
    + `<radialGradient id="sunGlow"><stop offset="0" stop-color="${p.sun}" stop-opacity=".75"/><stop offset=".35" stop-color="${p.sun}" stop-opacity=".25"/><stop offset="1" stop-color="${p.sun}" stop-opacity="0"/></radialGradient>`
    + `<linearGradient id="haze" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.skyBottom}" stop-opacity="0"/><stop offset="1" stop-color="${p.skyBottom}" stop-opacity=".75"/></linearGradient>`
    + `<linearGradient id="ground" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${shade(p.ground, 0.06)}"/><stop offset="1" stop-color="${p.groundDark}"/></linearGradient>`
    + `<radialGradient id="arena" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="${shade(p.ground, 0.35)}" stop-opacity=".75"/><stop offset="1" stop-color="${p.ground}" stop-opacity="0"/></radialGradient>`
    + `<linearGradient id="ray" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.sun}" stop-opacity=".22"/><stop offset="1" stop-color="${p.sun}" stop-opacity="0"/></linearGradient>`
    + `<radialGradient id="vig" cx=".5" cy=".45" r=".75"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></radialGradient>`
    + '<filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6"/></filter>'
    + '<filter id="blurFar" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="1.4"/></filter>'
    + '</defs>'
    + `<rect width="${W}" height="${H}" fill="url(#sky)"/>`;

  if (night) svg += stars(rng, 90);
  svg += celestial(region, p);

  if (!night || region.decor === 'blight') {
    const cloudCol = night ? shade(p.skyBottom, 0.1) : '#ffffff';
    svg += cloud(260, 140, 1.4, cloudCol, 0.55) + cloud(760, 90, 1.1, cloudCol, 0.45) + cloud(1450, 260, 1.2, cloudCol, 0.4);
  }

  // Montagnes lointaines
  svg += `<g filter="url(#blurFar)"><path d="${ridgePath(rng, { y: horizon - 90, amp: 120, seg: 9, jag: 0.8 })}" fill="${farCol}"/>`;
  if (region.decor === 'tundra' || region.decor === 'coast') {
    svg += `<path d="${ridgePath(rng, { y: horizon - 70, amp: 90, seg: 8, jag: 0.85 })}" fill="${mix(farCol, '#ffffff', 0.35)}" opacity=".55"/>`;
  }
  svg += `<path d="${ridgePath(rng, { y: horizon - 30, amp: 70, seg: 11, jag: region.decor === 'savanna' ? 0 : 0.6 })}" fill="${farCol2}"/></g>`;
  svg += `<rect y="${horizon - 200}" width="${W}" height="260" fill="url(#haze)"/>`;

  if (region.decor === 'coast') {
    svg += `<rect y="${horizon - 10}" width="${W}" height="80" fill="${mix('#3f7fa8', p.skyBottom, 0.35)}"/>`;
    for (let i = 0; i < 26; i++) svg += `<rect x="${f(rng() * W)}" y="${f(horizon + rng() * 60)}" width="${f(20 + rng() * 50)}" height="2" fill="#fff" opacity=".5"/>`;
  }
  if (region.decor === 'savanna') {
    svg += `<path d="M180,${horizon + 10} L230,${horizon - 90} L400,${horizon - 96} L450,${horizon + 10}z M1120,${horizon + 10} L1160,${horizon - 60} L1300,${horizon - 64} L1350,${horizon + 10}z" fill="${mix(p.far, p.accent, 0.2)}"/>`;
  }
  if (region.decor === 'shattered') {
    svg += floatingIsland(260, 330, 1.1, mix(p.mid, p.accent, 0.2), farCol) + floatingIsland(1350, 380, 0.8, mix(p.mid, p.accent, 0.2), farCol) + floatingIsland(820, 250, 0.5, mix(p.mid, p.accent, 0.2), farCol);
  }

  // Rayons de lumière
  if (['meadow', 'jungle', 'darkwood', 'fel'].includes(region.decor)) {
    for (let i = 0; i < 4; i++) {
      const x = 900 + i * 140 + rng() * 60;
      svg += `<path d="M${f(x)},-20 L${f(x + 70)},-20 L${f(x - 220)},${groundY} L${f(x - 380)},${groundY}z" fill="url(#ray)"/>`;
    }
  }

  // Collines moyennes + décor lointain
  svg += `<path d="${ridgePath(rng, { y: horizon + 50, amp: 40, seg: 10 })}" fill="${midCol}"/>`;
  svg += decorLayer(region.decor, rng, p, 0.2, horizon + 70);
  svg += `<path d="${ridgePath(rng, { y: horizon + 110, amp: 30, seg: 9 })}" fill="${mix(p.mid, p.near, 0.4)}"/>`;
  svg += `<rect y="${horizon + 60}" width="${W}" height="140" fill="${p.fog}"/>`;

  // Décor proche
  svg += decorLayer(region.decor, rng, p, 0.85, groundY - 6);

  // Sol + arène centrale
  svg += `<path d="${ridgePath(rng, { y: groundY, amp: 14, seg: 8 })}" fill="url(#ground)"/>`;
  svg += `<ellipse cx="${W / 2}" cy="${groundY + 70}" rx="420" ry="90" fill="url(#arena)"/>`;
  svg += groundDetails(rng, p, groundY);

  // Premier plan (cadre)
  const fg = shade(p.groundDark, -0.35);
  svg += `<path d="M-20,${H} L-20,${H - 230} Q60,${H - 260} 120,${H - 200} Q190,${H - 250} 250,${H - 170} Q320,${H - 150} 360,${H} z" fill="${fg}" opacity=".92"/>`;
  svg += `<path d="M${W + 20},${H} L${W + 20},${H - 250} Q${W - 70},${H - 280} ${W - 140},${H - 210} Q${W - 210},${H - 250} ${W - 270},${H - 160} Q${W - 330},${H - 140} ${W - 380},${H} z" fill="${fg}" opacity=".92"/>`;
  svg += `<rect width="${W}" height="${H}" fill="url(#vig)"/>`;
  svg += '</svg>';
  return svg;
}

const cache = new Map();
export function regionBackgroundUrl(region, cycle = 0) {
  const key = `${region.id}:${Math.min(cycle, 3)}`;
  if (!cache.has(key)) {
    cache.set(key, `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(buildRegionBackground(region, cycle))}")`);
  }
  return cache.get(key);
}
