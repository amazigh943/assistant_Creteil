import { BALANCE } from '../config.js';
import { HEROES, HERO_BY_ID, UPGRADES, PLANNED_HERO_COUNT } from '../data/heroes.js';
import { SKILLS, SKILL_BY_ID, RELICS, MOUNTS, IDOLS, SHOP_ITEMS } from '../data/progression.js';
import { BUY_MODES } from '../core/economy.js';
import { formatNumber, formatDuration } from '../core/format.js';
import {
  heroPurchase, upgradeStatus, idolCost, soulsForAscension, canAscend,
  merchantPurseValue, totalHeroLevels,
} from '../core/actions.js';
import { ensureStats } from '../core/stats.js';
import { regionForZone, isBossZone, maxAccessibleZone, monsterHp } from '../core/combat.js';
import { spriteSlot, hydrateSprites } from './assets.js';
import { icon } from './icons.js';
import { $, $$, esc, setText, toggleClass, refreshTooltip } from './dom.js';

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
const pct = (v, d = 0) => `${(v * 100).toFixed(d).replace('.', ',')} %`;

export function describeEffect(eff, times = 1, heroName = '') {
  const v = eff.value * times;
  switch (eff.type) {
    case 'heroMult': return `DPS de ${heroName || 'ce héros'} ×${formatNumber(Math.pow(eff.value, times))}`;
    case 'clickMult': return `Dégâts de clic ×${formatNumber(Math.pow(eff.value, times))}`;
    case 'dpsMult': return `DPS ×${eff.value}`;
    case 'goldMult': return `Or ×${eff.value}`;
    case 'dpsPercent': return `+${pct(v)} de DPS global`;
    case 'clickPercent': return `+${pct(v)} de dégâts de clic`;
    case 'goldPercent': return `+${pct(v)} d'or gagné`;
    case 'critChance': return `+${pct(v)} de chance de critique`;
    case 'clickDpsPercent': return `Chaque clic inflige en plus ${pct(v)} de votre DPS`;
    case 'etherChance': return `+${pct(v, 2)} de chance d'éclat d'éther`;
    case 'bossTime': return `+${v} s pour vaincre les boss`;
    case 'autoClicks': return `${v} frappes automatiques par seconde`;
    case 'unlockSkill': return `Débloque la compétence « ${SKILL_BY_ID[eff.skill]?.name ?? eff.skill} »`;
    default: return eff.type;
  }
}
const describeAll = (effects, times = 1, heroName = '') => effects.map((e) => describeEffect(e, times, heroName)).join('\n');

function goldCost(cost) {
  return `<span class="cost">${icon('gold')}<b data-f="cost">${formatNumber(cost)}</b></span>`;
}

/* ------------------------------------------------------------------ */
/* Héros                                                               */
/* ------------------------------------------------------------------ */

function visibleHeroes(state) {
  const list = [];
  for (const hero of HEROES) {
    list.push(hero);
    if ((state.heroes[hero.id]?.level ?? 0) === 0) break;
  }
  const next = HEROES[list.length];
  return { list, mystery: next ?? null };
}

function upgradeGem(state, up, hero) {
  const status = upgradeStatus(state, up.id);
  const req = status === 'locked' ? `\nRequiert ${hero.name} niveau ${up.level}` : '';
  const price = status === 'owned' ? '\nAcquise' : `\nCoût : ${formatNumber(up.cost)} or`;
  return `<button class="up-gem st-${status}" data-action="buy-upgrade" data-id="${up.id}" data-up="${up.id}"
    data-tip-title="${esc(up.name)}" data-tip="${esc(describeAll(up.effects, 1, hero.name) + price + req)}"
    aria-label="${esc(up.name)}">${ROMAN[hero.upgrades.indexOf(up)]}</button>`;
}

const HeroesPanel = {
  id: 'heroes',
  label: 'Héros',
  signature(game) {
    const s = game.state;
    const { list } = visibleHeroes(s);
    return `${s.settings.buyMode}|${s.stats.ascensions}|` + list.map((h) => `${h.id}:${s.heroes[h.id]?.level ?? 0}:${s.heroes[h.id]?.upgrades.length ?? 0}`).join(',');
  },
  render(game) {
    const s = game.state;
    const { list, mystery } = visibleHeroes(s);
    const modes = BUY_MODES.map((m) => `<button class="mode-btn ${s.settings.buyMode === m ? 'is-active' : ''}" data-action="buy-mode" data-id="${m}">${m === 'max' ? 'MAX' : `x${m}`}</button>`).join('');
    const rows = list.map((hero) => {
      const hs = s.heroes[hero.id];
      const level = hs?.level ?? 0;
      const isClick = hero.role === 'click';
      return `
      <article class="hero-row ${level ? '' : 'is-new'}" data-hero="${hero.id}" style="--hero-color:${hero.color}">
        <div class="hero-portrait" data-tip-title="${esc(hero.name)}" data-tip="${esc(hero.lore)}">
          ${spriteSlot(hero.sprite, { name: hero.name, kind: 'hero', color: hero.color })}
          <span class="hero-level">${level ? `Niv. ${level}` : 'Nouveau'}</span>
        </div>
        <div class="hero-main">
          <header><h3>${esc(hero.name)}</h3><span class="hero-class">${esc(hero.heroClass)}</span></header>
          <div class="hero-stat">${isClick
            ? `${icon('click')}<span>Clic : <b data-f="stat">0</b></span>`
            : `${icon('sword')}<span><b data-f="stat">0</b> DPS</span>`}
            <span class="hero-next" data-f="next"></span></div>
          <div class="hero-upgrades">${hero.upgrades.map((u) => upgradeGem(s, u, hero)).join('')}</div>
        </div>
        <button class="btn-buy" data-action="buy-hero" data-id="${hero.id}">
          <span class="buy-label" data-f="label">${level ? 'Niveau' : 'Recruter'}</span>
          ${goldCost(0)}
        </button>
      </article>`;
    }).join('');
    const mysteryRow = mystery ? `
      <article class="hero-row is-mystery">
        <div class="hero-portrait"><div class="sprite-slot kind-hero mystery"><span class="monogram">?</span></div></div>
        <div class="hero-main"><header><h3>Héros inconnu</h3></header>
        <p class="muted">Recrutez ${esc(list[list.length - 1].name)} pour révéler le prochain allié.</p></div>
      </article>` : '';
    return `
      <div class="panel-head">
        <h2>Compagnie de héros</h2>
        <div class="buy-modes" role="group" aria-label="Quantité d'achat">${modes}</div>
      </div>
      <div class="hero-list">${rows}${mysteryRow}</div>
      <p class="panel-foot">${HEROES.length} héros disponibles sur ${PLANNED_HERO_COUNT} prévus.</p>`;
  },
  refresh(game, root, now) {
    const s = game.state;
    const stats = ensureStats(game, now);
    for (const row of $$('[data-hero]', root)) {
      const hero = HERO_BY_ID[row.dataset.hero];
      const level = s.heroes[hero.id]?.level ?? 0;
      const p = heroPurchase(s, hero.id);
      const btn = $('.btn-buy', row);
      toggleClass(btn, 'is-affordable', p.affordable);
      btn.disabled = !p.affordable;
      setText($('[data-f="cost"]', btn), formatNumber(p.cost));
      setText($('[data-f="label"]', btn), level ? `Niveau +${p.count}` : (p.count > 1 ? `Recruter +${p.count}` : 'Recruter'));
      if (hero.role === 'click') {
        setText($('[data-f="stat"]', row), formatNumber(stats.clickDamage));
        setText($('[data-f="next"]', row), '');
      } else {
        const dps = level > 0 ? stats.heroDps[hero.id] : stats.globalDpsMult * hero.baseDps;
        setText($('[data-f="stat"]', row), level > 0 ? formatNumber(dps) : `+${formatNumber(dps)}`);
        const next = hero.upgrades.find((u) => u.level > level);
        setText($('[data-f="next"]', row), next && level > 0 ? `Amélioration au niv. ${next.level}` : '');
      }
      for (const gem of $$('[data-up]', row)) {
        const st = upgradeStatus(s, gem.dataset.up);
        if (!gem.classList.contains(`st-${st}`)) {
          gem.className = `up-gem st-${st}`;
        }
        gem.disabled = st === 'owned' || st === 'locked';
      }
    }
  },
};

/* ------------------------------------------------------------------ */
/* Améliorations                                                       */
/* ------------------------------------------------------------------ */

const UpgradesPanel = {
  id: 'upgrades',
  label: 'Améliorations',
  signature(game, now) {
    const s = game.state;
    const stats = ensureStats(game, now);
    const unlocked = UPGRADES.filter((u) => ['available', 'expensive'].includes(upgradeStatus(s, u.id))).map((u) => u.id);
    const owned = UPGRADES.filter((u) => upgradeStatus(s, u.id) === 'owned').length;
    return `${unlocked.join(',')}|${owned}|${[...stats.unlockedSkills].join(',')}|${s.stats.ascensions}`;
  },
  render(game, now) {
    const s = game.state;
    const stats = ensureStats(game, now);
    const available = UPGRADES.filter((u) => ['available', 'expensive'].includes(upgradeStatus(s, u.id))).sort((a, b) => a.cost - b.cost);
    const owned = UPGRADES.filter((u) => upgradeStatus(s, u.id) === 'owned');
    const upcoming = UPGRADES.filter((u) => upgradeStatus(s, u.id) === 'locked' && (s.heroes[u.heroId]?.level ?? 0) > 0)
      .sort((a, b) => a.cost - b.cost).slice(0, 4);

    const card = (u, locked = false) => {
      const hero = HERO_BY_ID[u.heroId];
      return `<article class="up-card ${locked ? 'is-locked' : ''}" data-upcard="${u.id}">
        ${spriteSlot(hero.sprite, { name: hero.name, kind: 'mini', color: hero.color })}
        <div class="up-info"><h4>${esc(u.name)} <small>${ROMAN[hero.upgrades.indexOf(u)]}</small></h4>
          <p>${esc(describeAll(u.effects, 1, hero.name)).replace(/\n/g, '<br>')}</p>
          <p class="muted">${esc(hero.name)}${locked ? ` · requiert le niveau ${u.level}` : ''}</p></div>
        ${locked ? `<span class="up-req">Niv. ${u.level}</span>` : `<button class="btn-buy small" data-action="buy-upgrade" data-id="${u.id}">${goldCost(u.cost)}</button>`}
      </article>`;
    };

    const skills = SKILLS.map((sk) => {
      const unlocked = stats.unlockedSkills.has(sk.id);
      return `<li class="skill-line ${unlocked ? '' : 'is-locked'}">${icon(sk.id)}<div><b>${esc(sk.name)}</b> <kbd>${sk.key}</kbd><br>
        <span class="muted">${esc(sk.description)} Recharge ${formatDuration(sk.cooldown)}.</span></div>
        <span class="skill-state">${unlocked ? 'Débloquée' : icon('lock')}</span></li>`;
    }).join('');

    return `
      <div class="panel-head"><h2>Améliorations</h2>
        ${available.length > 1 ? '<button class="btn-secondary" data-action="buy-all-upgrades">Tout acheter</button>' : ''}</div>
      <section class="panel-section"><h3>Disponibles (${available.length})</h3>
        ${available.length ? available.map((u) => card(u)).join('') : '<p class="muted empty">Montez vos héros de niveau pour débloquer de nouvelles améliorations (niveaux 10, 25, 50, 75 et 100).</p>'}
      </section>
      ${upcoming.length ? `<section class="panel-section"><h3>Prochainement</h3>${upcoming.map((u) => card(u, true)).join('')}</section>` : ''}
      <section class="panel-section"><h3>Compétences</h3><ul class="skill-list">${skills}</ul></section>
      <section class="panel-section"><h3>Acquises (${owned.length} / ${UPGRADES.length})</h3>
        <div class="chips">${owned.map((u) => `<span class="chip" data-tip-title="${esc(u.name)}" data-tip="${esc(describeAll(u.effects, 1, HERO_BY_ID[u.heroId].name))}">${esc(u.name)}</span>`).join('') || '<span class="muted">Aucune pour le moment.</span>'}</div>
      </section>`;
  },
  refresh(game, root) {
    for (const cardEl of $$('[data-upcard]', root)) {
      const btn = $('.btn-buy', cardEl);
      if (!btn) continue;
      const st = upgradeStatus(game.state, cardEl.dataset.upcard);
      toggleClass(btn, 'is-affordable', st === 'available');
      btn.disabled = st !== 'available';
    }
  },
};

/* ------------------------------------------------------------------ */
/* Reliques                                                            */
/* ------------------------------------------------------------------ */

const RelicsPanel = {
  id: 'relics',
  label: 'Reliques',
  signature: (game) => JSON.stringify(game.state.relics),
  render(game) {
    const s = game.state;
    const found = Object.keys(s.relics).length;
    const cards = RELICS.map((r) => {
      const level = s.relics[r.id] ?? 0;
      if (!level) {
        return `<article class="relic-card is-unknown rarity-${r.rarity}"><div class="sprite-slot kind-relic mystery"><span class="monogram">?</span></div>
          <h4>Relique inconnue</h4><p class="muted">Rareté ${esc(r.rarity)}</p></article>`;
      }
      return `<article class="relic-card rarity-${r.rarity}">
        ${spriteSlot(`assets/relics/${r.id}`, { name: r.name, kind: 'relic' })}
        <h4>${esc(r.name)}</h4><span class="relic-level">Niv. ${level}</span>
        <p>${esc(describeAll(r.effects, level)).replace(/\n/g, '<br>')}</p></article>`;
    }).join('');
    return `
      <div class="panel-head"><h2>Reliques</h2><span class="badge">${found} / ${RELICS.length}</span></div>
      <p class="panel-intro">Les boss à partir de la zone ${BALANCE.relicMinZone} ont ${pct(BALANCE.relicChance)} de chance de laisser une relique,
      et chaque Ascension en accorde une. Une relique déjà possédée gagne un niveau. Les reliques sont conservées après l'Ascension.</p>
      <div class="card-grid">${cards}</div>`;
  },
};

/* ------------------------------------------------------------------ */
/* Montures                                                            */
/* ------------------------------------------------------------------ */

const MountsPanel = {
  id: 'mounts',
  label: 'Montures',
  signature: (game) => game.state.mounts.join(','),
  render(game) {
    const s = game.state;
    const cards = MOUNTS.map((m) => {
      const owned = s.mounts.includes(m.id);
      return `<article class="mount-card ${owned ? 'is-owned' : ''}" data-mount="${m.id}">
        ${spriteSlot(`assets/mounts/${m.id}`, { name: m.name, kind: 'mount' })}
        <div class="mount-info"><h4>${esc(m.name)}</h4><p class="muted">${esc(m.description)}</p>
          <p class="bonus">${esc(describeAll(m.effects)).replace(/\n/g, '<br>')}</p></div>
        ${owned ? `<span class="owned-tag">${icon('check')} Possédée</span>`
          : `<button class="btn-buy small ether" data-action="buy-mount" data-id="${m.id}"><span class="cost">${icon('ether')}<b>${m.cost}</b></span></button>`}
      </article>`;
    }).join('');
    return `
      <div class="panel-head"><h2>Écuries</h2><span class="badge">${s.mounts.length} / ${MOUNTS.length}</span></div>
      <p class="panel-intro">Les montures s'achètent avec des éclats d'éther et accordent un bonus permanent, conservé après l'Ascension.
      La collection s'agrandira au fil des mises à jour.</p>
      <div class="card-list">${cards}</div>`;
  },
  refresh(game, root) {
    for (const card of $$('[data-mount]', root)) {
      const btn = $('.btn-buy', card);
      if (!btn) continue;
      const m = MOUNTS.find((x) => x.id === card.dataset.mount);
      const ok = game.state.ether >= m.cost;
      toggleClass(btn, 'is-affordable', ok);
      btn.disabled = !ok;
    }
  },
};

/* ------------------------------------------------------------------ */
/* Idoles                                                              */
/* ------------------------------------------------------------------ */

const IdolsPanel = {
  id: 'idols',
  label: 'Idoles',
  signature: (game) => `${JSON.stringify(game.state.idols)}|${game.state.souls}`,
  render(game) {
    const s = game.state;
    const cards = IDOLS.map((idol) => {
      const level = s.idols[idol.id] ?? 0;
      const maxed = idol.maxLevel && level >= idol.maxLevel;
      const cost = idolCost(s, idol.id);
      return `<article class="idol-card" data-idol="${idol.id}">
        ${spriteSlot(`assets/idols/${idol.id}`, { name: idol.name, kind: 'idol', color: '#c58cff' })}
        <div class="idol-info"><h4>${esc(idol.name)}</h4><span class="muted">Idole de ${esc(idol.domain)} · niveau ${level}${idol.maxLevel ? ` / ${idol.maxLevel}` : ''}</span>
          <p>${esc(idol.description)}</p>
          ${level ? `<p class="bonus">Actuellement : ${esc(describeAll(idol.effects, level))}</p>` : ''}</div>
        ${maxed ? '<span class="owned-tag">Max</span>'
          : `<button class="btn-buy small soul" data-action="buy-idol" data-id="${idol.id}" ${s.souls >= cost ? '' : 'disabled'}><span class="cost">${icon('soul')}<b>${cost}</b></span></button>`}
      </article>`;
    }).join('');
    return `
      <div class="panel-head"><h2>Idoles légendaires</h2><span class="badge soul">${icon('soul')} ${formatNumber(s.souls)}</span></div>
      <p class="panel-intro">Les âmes s'obtiennent par l'Ascension. Chaque âme non dépensée augmente le DPS de ${pct(BALANCE.soulDpsBonus)} ;
      les investir dans une idole octroie un bonus spécialisé et permanent. Élever une idole au niveau N coûte N âmes.</p>
      <div class="card-list">${cards}</div>`;
  },
};

/* ------------------------------------------------------------------ */
/* Boutique                                                            */
/* ------------------------------------------------------------------ */

const ShopPanel = {
  id: 'shop',
  label: 'Boutique',
  signature: (game) => Object.keys(game.state.buffs).join(','),
  render(game) {
    const cards = SHOP_ITEMS.map((item) => `
      <article class="shop-card" data-shop="${item.id}">
        ${spriteSlot(`assets/shop/${item.id}`, { name: item.name, kind: 'mini', color: '#5fd3f5' })}
        <div class="shop-info"><h4>${esc(item.name)}</h4><p>${esc(item.description)}</p><p class="muted" data-f="extra"></p></div>
        <button class="btn-buy small ether" data-action="buy-shop" data-id="${item.id}"><span class="cost">${icon('ether')}<b>${item.cost}</b></span></button>
      </article>`).join('');
    return `
      <div class="panel-head"><h2>Comptoir du marchand</h2><span class="badge ether">${icon('ether')} <b data-f="ether">${game.state.ether}</b></span></div>
      <p class="panel-intro">Échangez vos éclats d'éther contre des fournitures. Les éclats tombent rarement des monstres, et
      chaque boss vaincu pour la première fois en offre. Aucun achat en argent réel.</p>
      <div class="card-list">${cards}</div>`;
  },
  refresh(game, root, now) {
    const s = game.state;
    setText($('[data-f="ether"]', root), String(s.ether));
    for (const card of $$('[data-shop]', root)) {
      const item = SHOP_ITEMS.find((x) => x.id === card.dataset.shop);
      const btn = $('.btn-buy', card);
      const ok = s.ether >= item.cost;
      toggleClass(btn, 'is-affordable', ok);
      btn.disabled = !ok;
      let extra = '';
      if (item.id === 'bourse-marchand') extra = `Valeur actuelle : ${formatNumber(merchantPurseValue(s).mul(ensureStats(game, now).goldMultiplier))} or`;
      if (item.buff && s.buffs[item.buff.id] > now) extra = `Actif encore ${formatDuration((s.buffs[item.buff.id] - now) / 1000)}`;
      setText($('[data-f="extra"]', card), extra);
    }
  },
};

/* ------------------------------------------------------------------ */
/* Ascension                                                           */
/* ------------------------------------------------------------------ */

const AscensionPanel = {
  id: 'ascension',
  label: 'Ascension',
  signature: (game) => `${canAscend(game.state)}|${game.state.stats.ascensions}`,
  render(game) {
    const s = game.state;
    const ready = canAscend(s);
    const progress = Math.min(1, s.zone.highestReached / BALANCE.ascensionMinZone);
    return `
      <div class="panel-head"><h2>Ascension</h2><span class="badge soul">${icon('soul')} ${formatNumber(s.souls)}</span></div>
      <div class="ascension-hero ${ready ? 'is-ready' : ''}">
        ${icon('soul', 'big')}
        <p>Renoncez à votre progression actuelle pour renaître plus fort. Les âmes recueillies renforcent définitivement vos héros.</p>
        ${ready
          ? '<p class="souls-preview">Âmes gagnées : <b data-f="souls">0</b></p><button class="btn-ascend" data-action="ascend">Ascension</button>'
          : `<div class="progress"><div style="transform:scaleX(${progress.toFixed(3)})"></div></div>
             <p class="muted">Atteignez la zone ${BALANCE.ascensionMinZone} pour débloquer l'Ascension (zone actuelle la plus haute : ${s.zone.highestReached}).</p>`}
      </div>
      <div class="two-cols">
        <section class="panel-section"><h3>Conservé</h3><ul class="plain">
          <li>Âmes et idoles</li><li>Éclats d'éther</li><li>Reliques et montures</li><li>Statistiques et records</li></ul></section>
        <section class="panel-section"><h3>Réinitialisé</h3><ul class="plain">
          <li>Or</li><li>Niveaux des héros</li><li>Améliorations</li><li>Zones (retour en zone 1)</li></ul></section>
      </div>
      <p class="panel-foot">Ascensions réalisées : ${s.stats.ascensions} · âmes gagnées au total : ${formatNumber(s.stats.soulsEarned)}</p>`;
  },
  refresh(game, root) {
    setText($('[data-f="souls"]', root), formatNumber(soulsForAscension(game.state)));
  },
};

/* ------------------------------------------------------------------ */
/* Combat (progression et statistiques)                                */
/* ------------------------------------------------------------------ */

const CombatPanel = {
  id: 'combat',
  label: 'Combat',
  signature: (game) => `${game.state.zone.current}|${game.state.zone.highestCleared}|${game.state.stats.ascensions}`,
  render(game) {
    const s = game.state;
    const { region, cycleLabel } = regionForZone(s.zone.current);
    const frontier = maxAccessibleZone(s);
    let nextBoss = s.zone.current;
    while (!isBossZone(nextBoss)) nextBoss += 1;
    const bestiary = [...region.monsters, ...region.bosses].map((m, i) => `
      <li class="${i >= region.monsters.length ? 'is-boss' : ''}">${spriteSlot(`assets/monsters/${m.id}`, { name: m.name, kind: 'mini', color: region.palette.accent })}
        <div><b>${esc(m.name)}</b><span class="muted">${i >= region.monsters.length ? 'Boss · ' : ''}${esc(m.type)}</span></div></li>`).join('');
    return `
      <div class="panel-head"><h2>${esc(region.name)}${cycleLabel ? ` <small>${esc(cycleLabel)}</small>` : ''}</h2></div>
      <p class="panel-intro">${esc(region.subtitle)}. Prochain boss en zone ${nextBoss}. Zone frontière : ${frontier}.</p>
      <section class="panel-section"><h3>Puissance</h3><dl class="stat-grid">
        <dt>DPS des héros</dt><dd data-f="dps"></dd>
        <dt>Dégâts par clic</dt><dd data-f="click"></dd>
        <dt>Coup critique</dt><dd data-f="crit"></dd>
        <dt>Multiplicateur de DPS</dt><dd data-f="dpsmult"></dd>
        <dt>Bonus d'or</dt><dd data-f="gold"></dd>
        <dt>Temps contre les boss</dt><dd data-f="boss"></dd>
        <dt>PV d'un monstre ici</dt><dd data-f="hp"></dd>
      </dl></section>
      <section class="panel-section"><h3>Bestiaire de la région</h3><ul class="bestiary">${bestiary}</ul></section>
      <section class="panel-section"><h3>Chroniques</h3><dl class="stat-grid">
        <dt>Monstres vaincus</dt><dd data-f="kills"></dd>
        <dt>Boss vaincus</dt><dd data-f="bosses"></dd>
        <dt>Clics</dt><dd data-f="clicks"></dd>
        <dt>Or gagné au total</dt><dd data-f="earned"></dd>
        <dt>Zone record</dt><dd data-f="record"></dd>
        <dt>Niveaux de héros</dt><dd data-f="levels"></dd>
        <dt>Temps de jeu</dt><dd data-f="time"></dd>
      </dl></section>`;
  },
  refresh(game, root, now) {
    const s = game.state;
    const st = ensureStats(game, now);
    const set = (k, v) => setText($(`[data-f="${k}"]`, root), v);
    set('dps', formatNumber(st.totalDps));
    set('click', formatNumber(st.clickDamage));
    set('crit', `${pct(st.critChance)} · ×${st.critMultiplier}`);
    set('dpsmult', `×${formatNumber(st.globalDpsMult)}`);
    set('gold', `×${formatNumber(st.goldMultiplier)}`);
    set('boss', `${st.bossTime} s`);
    set('hp', formatNumber(monsterHp(s.zone.current)));
    set('kills', formatNumber(s.stats.totalKills));
    set('bosses', formatNumber(s.stats.bossKills));
    set('clicks', formatNumber(s.stats.totalClicks));
    set('earned', formatNumber(s.stats.totalGoldEarned));
    set('record', String(s.records.highestZoneEver));
    set('levels', formatNumber(totalHeroLevels(s)));
    set('time', formatDuration(s.stats.playTime));
  },
};

/* ------------------------------------------------------------------ */
/* Hôte des onglets                                                    */
/* ------------------------------------------------------------------ */

export const PANELS = [CombatPanel, HeroesPanel, UpgradesPanel, RelicsPanel, MountsPanel, IdolsPanel, ShopPanel, AscensionPanel];

export class PanelHost {
  constructor(tabsEl, bodyEl, onAction, initial = 'heroes') {
    this.tabsEl = tabsEl;
    this.bodyEl = bodyEl;
    this.onAction = onAction;
    this.current = PANELS.find((p) => p.id === initial) ?? HeroesPanel;
    this.sig = null;
    this.alerts = {};
    tabsEl.innerHTML = PANELS.map((p) => `<button class="tab" role="tab" data-tab="${p.id}" aria-selected="false">${p.label}<i class="tab-alert"></i></button>`).join('');
    tabsEl.addEventListener('click', (e) => {
      const tab = e.target.closest('[data-tab]');
      if (tab) this.select(tab.dataset.tab);
    });
    bodyEl.addEventListener('click', (e) => {
      const el = e.target.closest('[data-action]');
      if (el && !el.disabled) this.onAction(el.dataset.action, el.dataset.id, el);
    });
    this.markTabs();
  }

  select(id) {
    const panel = PANELS.find((p) => p.id === id);
    if (!panel || panel === this.current) return;
    this.current = panel;
    this.sig = null;
    this.bodyEl.scrollTop = 0;
    this.markTabs();
    try { localStorage.setItem('aldoria-idle/tab', id); } catch { /* ignoré */ }
  }

  markTabs() {
    for (const tab of $$('[data-tab]', this.tabsEl)) {
      const on = tab.dataset.tab === this.current.id;
      tab.setAttribute('aria-selected', String(on));
      toggleClass(tab, 'is-active', on);
    }
  }

  invalidate() { this.sig = null; }

  update(game, now) {
    const p = this.current;
    const sig = p.signature(game, now);
    if (sig !== this.sig) {
      this.sig = sig;
      this.bodyEl.innerHTML = `<div class="panel panel-${p.id}">${p.render(game, now)}</div>`;
      hydrateSprites(this.bodyEl);
      refreshTooltip();
    }
    p.refresh?.(game, this.bodyEl, now);
    this.updateAlerts(game, now);
  }

  /** Pastilles sur les onglets quand une action est possible. */
  updateAlerts(game, now) {
    const s = game.state;
    const alerts = {
      heroes: HEROES.some((h) => (s.heroes[h.id]?.level ?? 0) === 0 && heroPurchase(s, h.id, 1).affordable),
      upgrades: UPGRADES.some((u) => upgradeStatus(s, u.id) === 'available'),
      ascension: canAscend(s),
      idols: IDOLS.some((i) => s.souls >= idolCost(s, i.id) && !(i.maxLevel && (s.idols[i.id] ?? 0) >= i.maxLevel)),
      mounts: MOUNTS.some((m) => !s.mounts.includes(m.id) && s.ether >= m.cost),
    };
    for (const [id, on] of Object.entries(alerts)) {
      if (this.alerts[id] === on) continue;
      this.alerts[id] = on;
      toggleClass($(`[data-tab="${id}"]`, this.tabsEl), 'has-alert', on);
    }
  }
}

