import { BALANCE } from '../config.js';
import { SKILLS } from '../data/progression.js';
import { HEROES } from '../data/heroes.js';
import { formatNumber, formatDuration } from '../core/format.js';
import { isBossZone, regionForZone, maxAccessibleZone, isZoneCleared } from '../core/combat.js';
import { skillStatus } from '../core/actions.js';
import { ensureStats } from '../core/stats.js';
import { resolveAsset, knownAsset } from './assets.js';
import { regionBackgroundUrl } from './background.js';
import { icon } from './icons.js';
import { $, esc, setText, toggleClass } from './dom.js';

const MAX_FX = 48;
const PARTICLE_COUNT = 22;

const SKILL_SOURCE = Object.fromEntries(
  HEROES.flatMap((h) => h.upgrades.flatMap((u) => u.effects.filter((e) => e.type === 'unlockSkill').map((e) => [e.skill, `${h.name} niv. ${u.level}`]))),
);

function particlesHtml(kind) {
  let out = '';
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const x = Math.random() * 100;
    const y = Math.random() * 100;
    const d = 6 + Math.random() * 10;
    const delay = -Math.random() * d;
    const s = 0.5 + Math.random() * 1.2;
    out += `<span style="--x:${x.toFixed(1)}%;--y:${y.toFixed(1)}%;--d:${d.toFixed(1)}s;--delay:${delay.toFixed(1)}s;--s:${s.toFixed(2)}"></span>`;
  }
  return `<div class="particles p-${kind}">${out}</div>`;
}

function sigilHtml(monster, accent) {
  const runes = Array.from({ length: 24 }, (_, i) => {
    const a = (i / 24) * Math.PI * 2;
    const x1 = 100 + Math.cos(a) * 82; const y1 = 100 + Math.sin(a) * 82;
    const x2 = 100 + Math.cos(a) * (i % 3 === 0 ? 70 : 76); const y2 = 100 + Math.sin(a) * (i % 3 === 0 ? 70 : 76);
    return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>`;
  }).join('');
  const star = Array.from({ length: 6 }, (_, i) => {
    const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
    return `${(100 + Math.cos(a) * 56).toFixed(1)},${(100 + Math.sin(a) * 56).toFixed(1)}`;
  });
  const hex = `${star[0]} ${star[2]} ${star[4]} ${star[0]} M${star[1]} ${star[3]} ${star[5]} ${star[1]}`;
  return `<div class="sigil ${monster.isBoss ? 'is-boss' : ''}" style="--accent:${accent}">`
    + `<svg class="sigil-ring outer" viewBox="0 0 200 200"><circle cx="100" cy="100" r="92"/><circle cx="100" cy="100" r="86" class="thin"/><g class="ticks">${runes}</g></svg>`
    + `<svg class="sigil-ring inner" viewBox="0 0 200 200"><path d="M${hex}"/><circle cx="100" cy="100" r="56" class="thin"/></svg>`
    + '<div class="sigil-core"></div>'
    + `<div class="sigil-label"><span>${esc(monster.type)}</span><small>Illustration à venir</small><code>${esc(monster.sprite)}.webp</code></div>`
    + '</div>';
}

export class Scene {
  constructor(root, handlers) {
    this.root = root;
    this.handlers = handlers;
    this.bgKey = '';
    this.zoneKey = '';
    this.monsterUid = -1;
    this.lastPointer = null;
    this.lastDpsFx = 0;
    this.lastSkillUpdate = 0;
    this.build();
  }

  build() {
    this.root.innerHTML = `
      <div class="zone-bar">
        <button class="zone-nav" data-step="-1" aria-label="Zone précédente">${icon('left')}</button>
        <div class="zone-track" role="list"></div>
        <button class="zone-nav" data-step="1" aria-label="Zone suivante">${icon('right')}</button>
        <button class="auto-toggle" aria-pressed="true" data-tip="Avance automatiquement à la zone suivante dès qu'elle est débloquée."></button>
      </div>
      <div class="scene" tabindex="0" aria-label="Zone de combat : cliquez ou appuyez sur Espace pour attaquer">
        <div class="scene-bg layer-a"></div>
        <div class="scene-bg layer-b"></div>
        <div class="scene-particles"></div>
        <div class="region-banner"><span class="rb-cycle"></span><h2 class="rb-name"></h2><p class="rb-sub"></p></div>
        <div class="monster-plate">
          <div class="plate-title"><span class="m-name"></span><span class="m-type"></span></div>
          <div class="hpbar"><div class="hpbar-lag"></div><div class="hpbar-fill"></div><div class="hpbar-text"></div></div>
          <div class="boss-timer" hidden><div class="boss-timer-fill"></div><span class="boss-timer-text"></span></div>
        </div>
        <div class="monster-stage">
          <div class="monster-shadow"></div>
          <div class="monster"></div>
        </div>
        <div class="fx-layer" aria-hidden="true"></div>
        <div class="kill-counter"></div>
      </div>
      <div class="skillbar" role="toolbar" aria-label="Compétences"></div>`;

    this.el = {
      zoneTrack: $('.zone-track', this.root),
      auto: $('.auto-toggle', this.root),
      scene: $('.scene', this.root),
      bgA: $('.layer-a', this.root),
      bgB: $('.layer-b', this.root),
      particles: $('.scene-particles', this.root),
      rbCycle: $('.rb-cycle', this.root),
      rbName: $('.rb-name', this.root),
      rbSub: $('.rb-sub', this.root),
      name: $('.m-name', this.root),
      type: $('.m-type', this.root),
      hpFill: $('.hpbar-fill', this.root),
      hpLag: $('.hpbar-lag', this.root),
      hpText: $('.hpbar-text', this.root),
      bossTimer: $('.boss-timer', this.root),
      bossFill: $('.boss-timer-fill', this.root),
      bossText: $('.boss-timer-text', this.root),
      monster: $('.monster', this.root),
      monsterStage: $('.monster-stage', this.root),
      fx: $('.fx-layer', this.root),
      kills: $('.kill-counter', this.root),
      skillbar: $('.skillbar', this.root),
    };
    this.activeBg = this.el.bgA;
    this.buildSkillbar();
    this.bindEvents();
  }

  buildSkillbar() {
    this.el.skillbar.innerHTML = SKILLS.map((s) => `
      <button class="skill-slot is-locked" data-skill="${s.id}" data-tip-title="${esc(s.name)} [${s.key}]"
        data-tip="${esc(s.description)}\nRecharge : ${formatDuration(s.cooldown)}\nDébloquée par ${esc(SKILL_SOURCE[s.id] ?? '—')}">
        <span class="skill-icon">${icon(s.id)}</span>
        <span class="skill-cd"></span>
        <span class="skill-key">${s.key}</span>
        <span class="skill-time"></span>
        <span class="skill-lock">${icon('lock')}</span>
      </button>`).join('');
    this.skillEls = Object.fromEntries(SKILLS.map((s) => {
      const el = this.el.skillbar.querySelector(`[data-skill="${s.id}"]`);
      return [s.id, { el, cd: el.querySelector('.skill-cd'), time: el.querySelector('.skill-time') }];
    }));
    for (const s of SKILLS) {
      resolveAsset(`assets/skills/${s.id}`).then((url) => {
        if (!url) return;
        this.skillEls[s.id].el.querySelector('.skill-icon').innerHTML = `<img src="${esc(url)}" alt="" draggable="false">`;
      });
    }
  }

  bindEvents() {
    const scene = this.el.scene;
    scene.addEventListener('pointerdown', (e) => {
      if (e.button !== undefined && e.button > 0) return;
      e.preventDefault();
      scene.focus({ preventScroll: true });
      const r = this.el.fx.getBoundingClientRect();
      this.lastPointer = { x: e.clientX - r.left, y: e.clientY - r.top, t: performance.now() };
      this.handlers.onAttack();
    });
    scene.addEventListener('keydown', (e) => {
      if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
        e.preventDefault();
        this.lastPointer = null;
        this.handlers.onAttack();
      }
    });
    scene.addEventListener('contextmenu', (e) => e.preventDefault());

    this.root.querySelector('.zone-bar').addEventListener('click', (e) => {
      const medal = e.target.closest('[data-zone]');
      if (medal && !medal.disabled) { this.handlers.onTravel(Number(medal.dataset.zone)); return; }
      const nav = e.target.closest('[data-step]');
      if (nav && !nav.disabled) { this.handlers.onStep(Number(nav.dataset.step)); return; }
      if (e.target.closest('.auto-toggle')) this.handlers.onToggleAuto();
    });
    this.el.skillbar.addEventListener('click', (e) => {
      const slot = e.target.closest('[data-skill]');
      if (slot) this.handlers.onSkill(slot.dataset.skill);
    });
  }

  /* ----------------------------- décor ----------------------------- */

  setRegion(monster) {
    const { region, cycle, cycleLabel, zoneInRegion } = regionForZone(monster.zone);
    setText(this.el.rbCycle, cycleLabel ? `Mode ${cycleLabel}` : '');
    setText(this.el.rbName, region.name);
    setText(this.el.rbSub, `${region.subtitle} · ${zoneInRegion}/${BALANCE.zonesPerRegion}`);
    const key = `${region.id}:${cycle}`;
    if (key === this.bgKey) return;
    const first = this.bgKey === '';
    this.bgKey = key;
    this.root.style.setProperty('--region-accent', region.palette.accent);
    const apply = (bg) => {
      if (this.bgKey !== key) return;
      const next = this.activeBg === this.el.bgA ? this.el.bgB : this.el.bgA;
      next.style.backgroundImage = bg;
      next.classList.add('visible');
      this.activeBg.classList.remove('visible');
      this.activeBg = next;
    };
    apply(regionBackgroundUrl(region, cycle));
    resolveAsset(`assets/zones/${region.id}`).then((url) => { if (url) apply(`url("${url}")`); });
    this.el.particles.innerHTML = particlesHtml(region.particles);
    if (!first) {
      this.el.rbName.parentElement.classList.remove('announce');
      void this.el.rbName.offsetWidth;
      this.el.rbName.parentElement.classList.add('announce');
    }
  }

  /* ---------------------------- monstre ---------------------------- */

  showMonster(monster) {
    this.monsterUid = monster.uid;
    this.setRegion(monster);
    const { region } = regionForZone(monster.zone);
    setText(this.el.name, monster.name);
    setText(this.el.type, monster.isBoss ? `Boss · ${monster.type}` : monster.type);
    toggleClass(this.el.scene, 'is-boss', monster.isBoss);
    this.el.bossTimer.hidden = !monster.isBoss;
    this.hpRatio = 1;
    this.el.hpLag.style.transform = 'scaleX(1)';

    const url = knownAsset(monster.sprite);
    const m = this.el.monster;
    m.className = `monster ${monster.isBoss ? 'is-boss' : ''}`;
    if (url) m.innerHTML = `<img class="monster-img" src="${esc(url)}" alt="${esc(monster.name)}" draggable="false">`;
    else {
      m.innerHTML = sigilHtml(monster, region.palette.accent);
      if (url === undefined) {
        resolveAsset(monster.sprite).then((found) => {
          if (found && this.monsterUid === monster.uid) {
            m.innerHTML = `<img class="monster-img" src="${esc(found)}" alt="${esc(monster.name)}" draggable="false">`;
          }
        });
      }
    }
    this.el.monsterStage.classList.remove('dying');
    this.el.monsterStage.animate(
      [{ transform: 'translateX(-50%) translateY(30px) scale(.6)', opacity: 0 },
        { transform: 'translateX(-50%) translateY(-6px) scale(1.04)', opacity: 1, offset: 0.7 },
        { transform: 'translateX(-50%)', opacity: 1 }],
      { duration: 380, easing: 'cubic-bezier(.2,.8,.3,1.2)' },
    );
  }

  hitReaction(crit) {
    this.el.monster.animate(
      [{ transform: 'none', filter: 'brightness(1)' },
        { transform: `translateX(${crit ? 10 : 5}px) scale(.95,1.04)`, filter: 'brightness(1.8)' },
        { transform: 'none', filter: 'brightness(1)' }],
      { duration: crit ? 200 : 140, easing: 'ease-out' },
    );
  }

  deathAnimation() {
    this.el.monsterStage.classList.add('dying');
  }

  /* --------------------------- effets FX --------------------------- */

  spawnFx(className, html, x, y) {
    const fx = this.el.fx;
    while (fx.childElementCount >= MAX_FX) fx.firstElementChild.remove();
    const el = document.createElement('div');
    el.className = `fx ${className}`;
    el.innerHTML = html;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.addEventListener('animationend', () => el.remove(), { once: true });
    fx.appendChild(el);
    return el;
  }

  monsterCenter() {
    const fr = this.el.fx.getBoundingClientRect();
    const mr = this.el.monster.getBoundingClientRect();
    return { x: mr.left - fr.left + mr.width / 2, y: mr.top - fr.top + mr.height * 0.45, w: mr.width, h: mr.height };
  }

  onHit(event, showNumbers) {
    const c = this.monsterCenter();
    const p = this.lastPointer && performance.now() - this.lastPointer.t < 120 && !event.auto
      ? this.lastPointer
      : { x: c.x + (Math.random() - 0.5) * c.w * 0.6, y: c.y + (Math.random() - 0.5) * c.h * 0.4 };
    this.lastPointer = null;
    this.spawnFx(event.crit ? 'fx-burst crit' : 'fx-burst', '', p.x, p.y);
    if (showNumbers) {
      const text = formatNumber(event.amount);
      const html = event.crit ? `<small>Critique !</small>${text}` : text;
      const el = this.spawnFx(`fx-dmg${event.crit ? ' crit' : ''}${event.auto ? ' auto' : ''}`, html, p.x, p.y - 20);
      el.style.setProperty('--dx', `${((Math.random() - 0.5) * 60).toFixed(0)}px`);
    }
    this.hitReaction(event.crit);
  }

  onKill(event) {
    const c = this.monsterCenter();
    this.deathAnimation();
    this.spawnFx(`fx-gold${event.isBoss ? ' boss' : ''}`, `${icon('gold')}+${formatNumber(event.gold)}`, c.x, c.y + c.h * 0.25);
    const coins = event.isBoss ? 10 : 4;
    for (let i = 0; i < coins; i++) {
      const el = this.spawnFx('fx-coin', icon('gold'), c.x, c.y + c.h * 0.2);
      el.style.setProperty('--dx', `${((Math.random() - 0.5) * 220).toFixed(0)}px`);
      el.style.setProperty('--dy', `${(-60 - Math.random() * 90).toFixed(0)}px`);
      el.style.animationDelay = `${(i * 25).toFixed(0)}ms`;
    }
  }

  onEther(amount) {
    const c = this.monsterCenter();
    this.spawnFx('fx-gold ether', `${icon('ether')}+${amount}`, c.x + 50, c.y);
  }

  /* --------------------------- mise à jour --------------------------- */

  renderZoneBar(state) {
    const current = state.zone.current;
    const frontier = maxAccessibleZone(state);
    const key = `${current}:${frontier}:${state.autoProgress}`;
    if (key === this.zoneKey) return;
    this.zoneKey = key;
    const start = Math.max(1, current - 3);
    const zones = Array.from({ length: 7 }, (_, i) => start + i);
    // Sur petit écran, on masque les deux médailles les plus éloignées de la zone actuelle.
    const edges = new Set([...zones].sort((a, b) => Math.abs(b - current) - Math.abs(a - current) || b - a).slice(0, 2));
    let html = '';
    for (const z of zones) {
      const cls = ['zone-medal'];
      if (edges.has(z)) cls.push('is-edge');
      if (z === current) cls.push('is-current');
      if (isBossZone(z)) cls.push('is-boss');
      if (isZoneCleared(state, z)) cls.push('is-cleared');
      const locked = z > frontier;
      if (locked) cls.push('is-locked');
      const { region } = regionForZone(z);
      html += `<button class="${cls.join(' ')}" data-zone="${z}" role="listitem" ${locked ? 'disabled' : ''}
        data-tip-title="Zone ${z}${isBossZone(z) ? ' · Boss' : ''}" data-tip="${esc(region.name)}${locked ? '\nVerrouillée' : ''}">
        ${isBossZone(z) ? icon('crown', 'medal-crown') : ''}<span>${z}</span></button>`;
    }
    this.el.zoneTrack.innerHTML = html;
    const [prev, next] = this.root.querySelectorAll('.zone-nav');
    prev.disabled = current <= 1;
    next.disabled = current >= frontier;
    this.el.auto.setAttribute('aria-pressed', String(state.autoProgress));
    this.el.auto.innerHTML = `${icon(state.autoProgress ? 'play' : 'pause')}<span>${state.autoProgress ? 'Progression auto' : 'Farm'}</span>`;
    toggleClass(this.el.auto, 'is-off', !state.autoProgress);
  }

  update(game, now) {
    const { state, battle } = game;
    const m = battle.monster;
    if (!m) return;
    if (m.uid !== this.monsterUid && battle.phase === 'alive') this.showMonster(m);
    this.renderZoneBar(state);

    const ratio = Math.max(0, Math.min(1, m.hp.div(m.maxHp).toNumber()));
    this.el.hpFill.style.transform = `scaleX(${ratio.toFixed(4)})`;
    if (ratio < this.hpRatio) {
      this.hpRatio += (ratio - this.hpRatio) * 0.08;
      if (this.hpRatio - ratio < 0.002) this.hpRatio = ratio;
      this.el.hpLag.style.transform = `scaleX(${this.hpRatio.toFixed(4)})`;
    }
    setText(this.el.hpText, `${formatNumber(m.hp.lt(0) ? 0 : m.hp.ceil())} / ${formatNumber(m.maxHp)} PV`);

    if (m.isBoss) {
      const t = Math.max(0, battle.bossTimeLeft);
      this.el.bossFill.style.transform = `scaleX(${(t / (battle.bossTimeMax || 1)).toFixed(4)})`;
      setText(this.el.bossText, `${t.toFixed(1)} s`);
      toggleClass(this.el.bossTimer, 'urgent', t < 8);
    }

    const frontier = maxAccessibleZone(state);
    let killText;
    if (m.isBoss) killText = state.zone.current === frontier ? 'Vainquez le boss pour avancer' : 'Boss déjà vaincu · farm';
    else if (state.zone.current === frontier) killText = `Monstres ${state.zone.kills} / ${BALANCE.monstersPerZone}`;
    else killText = 'Zone conquise · farm';
    setText(this.el.kills, killText);

    // Nombre de DPS des héros (une fois par seconde).
    const stats = ensureStats(game, now);
    if (battle.phase === 'alive' && stats.totalDps.gt(0) && now - this.lastDpsFx > 1000 && state.settings.floatingText) {
      this.lastDpsFx = now;
      const c = this.monsterCenter();
      this.spawnFx('fx-dps', `${icon('sword')}${formatNumber(stats.totalDps)}`, c.x + c.w * 0.32, c.y - c.h * 0.1);
    }

    if (now - this.lastSkillUpdate > 200) {
      this.lastSkillUpdate = now;
      for (const s of SKILLS) {
        const st = skillStatus(game, s.id, now);
        const { el, cd, time } = this.skillEls[s.id];
        toggleClass(el, 'is-locked', st.state === 'locked');
        toggleClass(el, 'is-active', st.state === 'active');
        toggleClass(el, 'is-cooldown', st.state === 'cooldown');
        toggleClass(el, 'is-ready', st.state === 'ready');
        el.disabled = st.state === 'locked';
        if (st.state === 'active') {
          cd.style.setProperty('--p', '0');
          setText(time, `${Math.ceil(st.remaining)} s`);
        } else if (st.state === 'cooldown') {
          cd.style.setProperty('--p', (st.remaining / s.cooldown).toFixed(3));
          setText(time, st.remaining > 60 ? `${Math.ceil(st.remaining / 60)} min` : `${Math.ceil(st.remaining)} s`);
        } else {
          cd.style.setProperty('--p', '0');
          setText(time, '');
        }
      }
    }
  }
}
