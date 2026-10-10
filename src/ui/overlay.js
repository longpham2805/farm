import { h, clear } from './dom.js';
import { t } from '../i18n.js';
import { sfx } from '../audio.js';

const modalRoot = () => document.getElementById('modal-root');
const stack = [];

/**
 * Opens a framed card. render(body, api) fills it and is called again by api.refresh().
 * Returns the api: { refresh, close, body }.
 */
export function openModal({ title, size = '', render, onClose, dismissable = true, static: isStatic = false }) {
  const body = h('div', { class: 'modal-body' });
  const api = {
    body,
    refresh: () => {
      const scroll = body.scrollTop;
      clear(body);
      render(body, api);
      body.scrollTop = scroll;
    },
    close: () => closeModal(api),
  };
  const card = h('div', { class: `modal ${size}`, role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
    title ? h('div', { class: 'modal-title' }, title) : null,
    dismissable ? h('button', { class: 'modal-close', 'aria-label': t('close'), onClick: () => api.close() }, '✕') : null,
    body);
  const overlay = h('div', { class: 'overlay' }, card);
  overlay.addEventListener('pointerdown', (e) => {
    if (e.target === overlay && dismissable) api.close();
  });
  api.overlay = overlay;
  api.card = card;
  api.onClose = onClose;
  api.static = isStatic;
  stack.push(api);
  modalRoot().append(overlay);
  render(body, api);
  sfx.open();
  return api;
}

export function closeModal(api) {
  const i = stack.indexOf(api);
  if (i < 0) return;
  stack.splice(i, 1);
  api.overlay.remove();
  if (api.onClose) api.onClose();
}

export const topModal = () => stack[stack.length - 1] || null;
export const anyModal = () => stack.length > 0;
export function refreshModals() {
  for (const m of stack) if (!m.static) m.refresh();
}
export function closeAll() {
  while (stack.length) closeModal(stack[stack.length - 1]);
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && stack.length) closeModal(stack[stack.length - 1]);
});

export function toast(text, kind = '') {
  const root = document.getElementById('toast-root');
  const el = h('div', { class: `toast ${kind}` }, text);
  root.append(el);
  while (root.children.length > 3) root.firstChild.remove();
  setTimeout(() => el.remove(), 2700);
}

export function floatText(x, y, text, cls = '') {
  const el = h('div', { class: `float-text ${cls}`, style: { left: `${x}px`, top: `${y}px` } }, text);
  document.getElementById('app').append(el);
  setTimeout(() => el.remove(), 1500);
}

export function confetti(card) {
  const box = h('div', { class: 'confetti' });
  const colors = ['#ff5f8f', '#ffd23f', '#4cb860', '#3fa9f5', '#a066ff'];
  for (let i = 0; i < 40; i++) {
    box.append(h('i', { style: {
      left: `${Math.random() * 100}%`,
      background: colors[i % colors.length],
      animationDelay: `${Math.random() * 0.6}s`,
      transform: `rotate(${Math.random() * 360}deg)`,
    } }));
  }
  card.append(box);
  setTimeout(() => box.remove(), 3000);
}
