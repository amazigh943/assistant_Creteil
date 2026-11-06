import { formatNumber } from '../core/format.js';
import { ensureStats } from '../core/stats.js';
import { regionForZone } from '../core/combat.js';
import { icon } from './icons.js';
import { $, esc, setText } from './dom.js';

const RESOURCES = [
  { key: 'gold', label: "Pièces d'or", icon: 'gold', tip: 'Monnaie principale. Gagnée en vainquant les monstres, elle sert à recruter et améliorer les héros.' },
  { key: 'ether', label: "Éclats d'éther", icon: 'ether', tip: 'Ressource rare. Tombe parfois des monstres et de chaque boss vaincu pour la première fois. Sert aux montures et à la boutique.' },
  { key: 'souls', label: 'Âmes', icon: 'soul', tip: "Obtenues par l'Ascension. Chaque âme non dépensée donne +10 % de DPS ; elles s'investissent dans les idoles." },
  { key: 'dps', label: 'DPS', icon: 'sword', tip: 'Dégâts infligés chaque seconde par vos héros, sans cliquer.' },
  { key: 'click', label: 'Clic', icon: 'click', tip: 'Dégâts infligés par chaque clic sur la scène de combat.' },
  { key: 'zone', label: 'Zone', icon: 'map', tip: 'Zone actuelle et région.' },
];

export class Hud {
  constructor(root) {
    this.root = root;
    root.innerHTML = RESOURCES.map((r) => `
      <div class="res res-${r.key}" data-tip-title="${esc(r.label)}" data-tip="${esc(r.tip)}">
        ${icon(r.icon)}<div class="res-text"><span class="res-label">${esc(r.label)}</span><b class="res-value" data-res="${r.key}">0</b></div>
      </div>`).join('');
    this.values = Object.fromEntries(RESOURCES.map((r) => [r.key, $(`[data-res="${r.key}"]`, root)]));
    this.goldEl = $('.res-gold', root);
  }

  pulse(key) {
    const el = this.values[key]?.closest('.res');
    if (!el) return;
    el.classList.remove('pulse');
    void el.offsetWidth;
    el.classList.add('pulse');
  }

  update(game, now) {
    const s = game.state;
    const st = ensureStats(game, now);
    setText(this.values.gold, formatNumber(s.gold));
    setText(this.values.ether, formatNumber(s.ether));
    setText(this.values.souls, formatNumber(s.souls));
    setText(this.values.dps, formatNumber(st.totalDps));
    setText(this.values.click, formatNumber(st.clickDamage));
    const { region } = regionForZone(s.zone.current);
    setText(this.values.zone, `${s.zone.current} · ${region.name}`);
  }
}
