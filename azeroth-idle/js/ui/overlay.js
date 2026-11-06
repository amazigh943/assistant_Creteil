import { esc } from './dom.js';
import { icon } from './icons.js';

/* ------------------------------ Toasts ------------------------------ */

const MAX_TOASTS = 3;

export function toast(message, { kind = 'info', iconName = null, duration = 3600 } = {}) {
  const root = document.getElementById('toasts');
  if (!root) return;
  while (root.childElementCount >= MAX_TOASTS) root.firstElementChild.remove();
  const el = document.createElement('div');
  el.className = `toast toast-${kind}`;
  el.setAttribute('role', 'status');
  el.innerHTML = `${iconName ? icon(iconName) : ''}<span>${esc(message)}</span>`;
  root.appendChild(el);
  setTimeout(() => {
    el.classList.add('leaving');
    el.addEventListener('animationend', () => el.remove(), { once: true });
  }, duration);
}

/* ------------------------------ Modale ------------------------------ */

let openCount = 0;

/**
 * Ouvre une fenêtre modale.
 * actions : [{ label, kind: 'primary'|'danger'|'secondary', onClick(close) }]
 */
export function openModal({ title, html, actions = [{ label: 'Fermer', kind: 'secondary' }], dismissible = true }) {
  const root = document.getElementById('modal-root');
  const previous = document.activeElement;
  const wrap = document.createElement('div');
  wrap.className = 'modal-backdrop';
  wrap.innerHTML = `
    <div class="modal frame" role="dialog" aria-modal="true" aria-labelledby="modal-title-${openCount}">
      <h2 id="modal-title-${openCount}">${esc(title)}</h2>
      <div class="modal-body">${html}</div>
      <div class="modal-actions">${actions.map((a, i) => `<button class="btn-${a.kind ?? 'secondary'}" data-i="${i}">${esc(a.label)}</button>`).join('')}</div>
    </div>`;
  openCount += 1;

  const close = () => {
    document.removeEventListener('keydown', onKey);
    wrap.remove();
    previous?.focus?.({ preventScroll: true });
  };
  const onKey = (e) => {
    if (e.key === 'Escape' && dismissible) close();
  };
  wrap.addEventListener('click', (e) => {
    if (e.target === wrap && dismissible) { close(); return; }
    const btn = e.target.closest('[data-i]');
    if (!btn) return;
    const action = actions[Number(btn.dataset.i)];
    if (action.onClick) action.onClick(close, wrap);
    else close();
  });
  document.addEventListener('keydown', onKey);
  root.appendChild(wrap);
  wrap.querySelector('.modal-actions button:last-child')?.focus({ preventScroll: true });
  return { close, el: wrap };
}
