export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/** Ne touche au DOM que si le texte change (évite des reflows inutiles). */
export function setText(el, text) {
  if (el && el.textContent !== text) el.textContent = text;
}

export function toggleClass(el, cls, on) {
  if (el && el.classList.contains(cls) !== !!on) el.classList.toggle(cls, !!on);
}

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export function esc(value) {
  return String(value).replace(/[&<>"']/g, (c) => ESC[c]);
}

/* ------------------------------------------------------------------ */
/* Infobulles : tout élément portant data-tip (et data-tip-title).     */
/* ------------------------------------------------------------------ */

let tipEl = null;
let tipTarget = null;

function placeTip(target) {
  const r = target.getBoundingClientRect();
  const t = tipEl.getBoundingClientRect();
  let x = r.left + r.width / 2 - t.width / 2;
  let y = r.top - t.height - 10;
  if (y < 8) y = r.bottom + 10;
  x = Math.max(8, Math.min(window.innerWidth - t.width - 8, x));
  tipEl.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
}

export function refreshTooltip() {
  if (!tipTarget || !tipEl) return;
  if (!document.body.contains(tipTarget)) { hideTip(); return; }
  fillTip(tipTarget);
}

function fillTip(target) {
  const title = target.getAttribute('data-tip-title');
  const body = target.getAttribute('data-tip') || '';
  tipEl.innerHTML = (title ? `<strong>${esc(title)}</strong>` : '')
    + body.split('\n').map((line) => `<span>${esc(line)}</span>`).join('');
}

function hideTip() {
  tipTarget = null;
  if (tipEl) tipEl.classList.remove('visible');
}

export function setupTooltips() {
  tipEl = document.createElement('div');
  tipEl.className = 'tooltip';
  tipEl.setAttribute('role', 'tooltip');
  document.body.appendChild(tipEl);

  document.addEventListener('pointerover', (e) => {
    if (e.pointerType === 'touch') return;
    const target = e.target.closest?.('[data-tip]');
    if (!target || target === tipTarget) return;
    tipTarget = target;
    fillTip(target);
    tipEl.classList.add('visible');
    placeTip(target);
  });
  document.addEventListener('pointerout', (e) => {
    if (!tipTarget) return;
    const to = e.relatedTarget;
    if (to && tipTarget.contains(to)) return;
    hideTip();
  });
  document.addEventListener('scroll', hideTip, true);
}
