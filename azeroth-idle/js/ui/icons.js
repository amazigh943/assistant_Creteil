/**
 * Icônes d'interface (ressources, boutons). Ce ne sont pas des sprites de
 * personnages : uniquement des pictogrammes d'interface.
 */
const SVG = {
  gold: `<svg viewBox="0 0 32 32"><defs><radialGradient id="gc" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#fff6c4"/><stop offset=".45" stop-color="#f5c451"/><stop offset="1" stop-color="#a8681a"/></radialGradient></defs><circle cx="16" cy="16" r="13.5" fill="url(#gc)" stroke="#6b3f0e" stroke-width="2"/><circle cx="16" cy="16" r="9.5" fill="none" stroke="#b27420" stroke-width="1.6"/><path d="M16 9.5l1.9 4.2 4.6.4-3.5 3 1.1 4.5-4.1-2.4-4.1 2.4 1.1-4.5-3.5-3 4.6-.4z" fill="#fff1b0" stroke="#9a5d14" stroke-width=".8"/></svg>`,
  ether: `<svg viewBox="0 0 32 32"><defs><linearGradient id="ec" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e6fbff"/><stop offset=".5" stop-color="#5fd3f5"/><stop offset="1" stop-color="#2a6fd1"/></linearGradient></defs><path d="M16 2l9 9-9 19-9-19z" fill="url(#ec)" stroke="#1b3f86" stroke-width="1.8" stroke-linejoin="round"/><path d="M7 11h18M16 2l-4 9 4 19 4-19z" fill="none" stroke="#e8fbff" stroke-width="1" opacity=".75"/></svg>`,
  soul: `<svg viewBox="0 0 32 32"><defs><radialGradient id="sc" cx="50%" cy="65%" r="60%"><stop offset="0" stop-color="#fff"/><stop offset=".4" stop-color="#d8a8ff"/><stop offset="1" stop-color="#7a3fd1"/></radialGradient></defs><path d="M16 30c-6 0-10-4-10-9.5 0-5 4-7 5-12 2 3 1.5 5 3 6 0-5 2-8.5 6-12.5-1 5 6 9 6 17.5C26 26 22 30 16 30z" fill="url(#sc)" stroke="#4b1f8f" stroke-width="1.8" stroke-linejoin="round"/></svg>`,
  sword: `<svg viewBox="0 0 32 32"><path d="M26 3l3 3-15 15-3-3z" fill="#dfe7ef" stroke="#3b4a5a" stroke-width="1.6" stroke-linejoin="round"/><path d="M8 17l7 7M6 26l4-4" stroke="#8a5a1c" stroke-width="3.2" stroke-linecap="round"/><path d="M7 16l9 9" stroke="#f5c451" stroke-width="2.4" stroke-linecap="round"/></svg>`,
  click: `<svg viewBox="0 0 32 32"><path d="M11 4v15l-3.5-3.2c-1.4-1.2-3.4.6-2.2 2.1L12 27h12l2-9c.3-1.6-.6-2.7-2-3l-7-1.2V4c0-2.6-6-2.6-6 0z" fill="#ffe2b8" stroke="#6b3f0e" stroke-width="1.8" stroke-linejoin="round"/></svg>`,
  map: `<svg viewBox="0 0 32 32"><path d="M16 30s10-9.5 10-17A10 10 0 0 0 6 13c0 7.5 10 17 10 17z" fill="#e8584a" stroke="#6b1a12" stroke-width="1.8"/><circle cx="16" cy="13" r="4" fill="#fff1d6" stroke="#6b1a12" stroke-width="1.4"/></svg>`,
  crown: `<svg viewBox="0 0 32 32"><path d="M4 24l-1-14 7 6 6-10 6 10 7-6-1 14z" fill="#f5c451" stroke="#6b3f0e" stroke-width="1.8" stroke-linejoin="round"/><rect x="4" y="24" width="24" height="4" rx="1" fill="#d9a033" stroke="#6b3f0e" stroke-width="1.6"/></svg>`,
  gear: `<svg viewBox="0 0 24 24"><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>`,
  lock: `<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2" fill="currentColor"/><path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="2.4"/></svg>`,
  left: `<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  right: `<svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  check: `<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  hourglass: `<svg viewBox="0 0 24 24"><path d="M6 3h12M6 21h12M7 3c0 5 10 5 10 9s-10 4-10 9M17 3c0 5-10 5-10 9s10 4 10 9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
  play: `<svg viewBox="0 0 24 24"><path d="M7 5l12 7-12 7z" fill="currentColor"/></svg>`,
  pause: `<svg viewBox="0 0 24 24"><rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor"/></svg>`,
  // Pictogrammes des compétences (utilisés tant qu'aucune icône PNG n'est fournie).
  frenzy: `<svg viewBox="0 0 32 32"><path d="M16 3c2 5 8 7 8 14a8 8 0 0 1-16 0c0-4 2-6 3-8 .5 3 2 4 3 4-1-4 0-7 2-10z" fill="#ff8a3a" stroke="#6b1a05" stroke-width="1.8" stroke-linejoin="round"/><path d="M16 15c1 2.5 4 3.5 4 7a4 4 0 0 1-8 0c0-2 1.5-3 2-4 .5 1.5 1 2 2 2-.5-2 0-3.5 0-5z" fill="#ffe08a"/></svg>`,
  midas: `<svg viewBox="0 0 32 32"><ellipse cx="16" cy="24" rx="10" ry="4" fill="#d9a033" stroke="#6b3f0e" stroke-width="1.6"/><ellipse cx="16" cy="19" rx="10" ry="4" fill="#f5c451" stroke="#6b3f0e" stroke-width="1.6"/><ellipse cx="16" cy="14" rx="10" ry="4" fill="#ffe08a" stroke="#6b3f0e" stroke-width="1.6"/><path d="M22 3l1.2 2.8L26 7l-2.8 1.2L22 11l-1.2-2.8L18 7l2.8-1.2z" fill="#fff" /></svg>`,
  blessing: `<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="6.5" fill="#fff3b0" stroke="#a8681a" stroke-width="1.8"/><g stroke="#f5c451" stroke-width="2.6" stroke-linecap="round"><path d="M16 2v5M16 25v5M2 16h5M25 16h5M6 6l3.5 3.5M22.5 22.5L26 26M26 6l-3.5 3.5M9.5 22.5L6 26"/></g></svg>`,
  hunt: `<svg viewBox="0 0 32 32"><path d="M2 16s5.5-9 14-9 14 9 14 9-5.5 9-14 9S2 16 2 16z" fill="#e9f5d0" stroke="#2f4a12" stroke-width="1.8"/><circle cx="16" cy="16" r="5.5" fill="#7fb04f" stroke="#2f4a12" stroke-width="1.6"/><ellipse cx="16" cy="16" rx="1.6" ry="4" fill="#1a2a08"/></svg>`,
};

let uid = 0;

export function icon(name, cls = '') {
  uid += 1;
  // Identifiants de dégradés uniques par instance (sinon Chrome n'affiche pas
  // un dégradé défini dans un élément masqué ailleurs dans la page).
  const svg = (SVG[name] ?? '')
    .replace(/id="(\w+)"/g, `id="$1-${uid}"`)
    .replace(/url\(#(\w+)\)/g, `url(#$1-${uid})`);
  return `<span class="ico ico-${name} ${cls}" aria-hidden="true">${svg}</span>`;
}
