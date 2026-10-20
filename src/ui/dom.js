import { t, fmtNum, seedName, cropName, getLang } from '../i18n.js';
import { NUTRIENTS, CROP_NUTRITION } from '../data/nutrition.js';
import { CROP_BY_ID, PACK_BY_ID, isPack } from '../data/crops.js';
import { cropImg } from '../three/thumbs.js';
import { cropIcon } from './cropIcons.js';

/** Tiny element builder: h('div', { class: 'x', onClick }, child, ...) */
export function h(tag, props, ...children) {
  const el = document.createElement(tag);
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'style' && typeof v === 'object') {
        for (const [prop, val] of Object.entries(v)) {
          if (prop.startsWith('--')) el.style.setProperty(prop, val);
          else el.style[prop] = val;
        }
      }
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
      else if (k === 'text') el.textContent = v;
      else if (k === 'value' || k === 'checked' || k === 'disabled') el[k] = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
  }
  append(el, children);
  return el;
}

function append(el, children) {
  for (const c of children) {
    if (c == null || c === false) continue;
    if (Array.isArray(c)) append(el, c);
    else el.append(c instanceof Node ? c : String(c));
  }
}

export function clear(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
  return el;
}

const PACK_TINT = { pack1: 1, pack2: 2, pack3: 3, pack4: 4 };

export function tierOf(id) {
  return isPack(id) ? PACK_TINT[id] : CROP_BY_ID[id].tier;
}

/** Seed bag tile used in the shop and the planting bar. */
export function seedBag(id, { label, corner, selected, locked, onClick } = {}) {
  const tier = tierOf(id);
  return h('button', {
    class: `bag tier-${tier}${selected ? ' sel' : ''}${locked ? ' locked' : ''}`,
    onClick,
    'aria-label': seedName(id),
    title: seedName(id),
  },
  isPack(id) ? h('span', { class: 'q-mark' }, '?') : cropIcon(id),
  corner ? h('span', { class: 'corner' }, corner) : null,
  label != null ? h('span', { class: locked ? 'price' : 'count' }, label) : null);
}

/** A crop's picture: the drawn one for its plain look, the 3D render for a mutation (its own colours and aura). */
export const cropPic = (id, variant = 0) => (variant ? cropImg(id, variant) : cropIcon(id));

export function chestSvg(tier) {
  const c = { green: ['#5cc46a', '#3a9a4a'], blue: ['#4aa8ff', '#2a74c9'], purple: ['#a066ff', '#6c3ccf'], red: ['#ff4f6d', '#c22a48'] }[tier];
  const trim = tier === 'green' ? '#d9dde3' : '#ffcf3a';
  return h('span', {
    class: 'chest-svg',
    html: null,
  }, svg(`<svg viewBox="0 0 72 64" aria-hidden="true">
    <ellipse cx="36" cy="60" rx="28" ry="4" fill="rgba(0,0,0,0.15)"/>
    <rect x="8" y="28" width="56" height="30" rx="6" fill="${c[1]}"/>
    <rect x="10" y="30" width="52" height="26" rx="5" fill="${c[0]}"/>
    <path d="M8 30 Q8 8 36 8 Q64 8 64 30 Z" fill="${c[1]}"/>
    <path d="M11 29 Q11 11 36 11 Q61 11 61 29 Z" fill="${c[0]}"/>
    <rect x="6" y="26" width="60" height="6" rx="3" fill="${trim}"/>
    <rect x="16" y="9" width="6" height="49" fill="${trim}" opacity="0.9"/>
    <rect x="50" y="9" width="6" height="49" fill="${trim}" opacity="0.9"/>
    <rect x="29" y="24" width="14" height="16" rx="4" fill="${trim}"/>
    <circle cx="36" cy="31" r="3" fill="${c[1]}"/>
    ${tier === 'red' ? '<path d="M36 1 L40 9 L36 7 L32 9 Z" fill="#ffcf3a"/><circle cx="36" cy="18" r="3" fill="#fff6a8"/>' : ''}
    ${tier === 'purple' ? '<path d="M36 13 L40 19 L36 25 L32 19 Z" fill="#fff" opacity="0.85"/>' : ''}
  </svg>`));
}

function svg(markup) {
  const tpl = document.createElement('template');
  tpl.innerHTML = markup.trim();
  return tpl.content.firstChild;
}

/** Little chips showing what a reward contains. */
export function rewardChips(reward) {
  const out = [];
  if (!reward) return out;
  if (reward.coins) out.push(h('span', { class: 'rw' }, h('span', { class: 'e' }, '🌏'), fmtNum(reward.coins)));
  if (reward.xp) out.push(h('span', { class: 'rw' }, h('span', { class: 'e' }, '⭐'), fmtNum(reward.xp)));
  if (reward.energy) out.push(h('span', { class: 'rw' }, h('span', { class: 'e' }, '✨'), fmtNum(reward.energy)));
  if (reward.seeds) {
    for (const [id, n] of Object.entries(reward.seeds)) {
      out.push(h('span', { class: 'rw', title: seedName(id) },
        isPack(id) ? h('span', { class: 'e' }, '🎁') : cropIcon(id),
        `×${n}`));
    }
  }
  return out;
}

/**
 * What is good inside a crop: nutrient badges (tap one to read what it does) and a fun fact.
 * compact: just the little coloured badges.
 */
export function nutritionBlock(cropId, { compact = false } = {}) {
  const info = CROP_NUTRITION[cropId];
  if (!info) return null;
  const lang = getLang();
  if (compact) {
    return h('div', { class: 'nutri-dots' }, info.n.map((id) =>
      h('span', { class: 'nutri-dot', style: { '--nc': NUTRIENTS[id].color }, title: NUTRIENTS[id].name[lang] }, NUTRIENTS[id].code)));
  }
  const line = h('p', { class: 'nutri-benefit' });
  const chips = info.n.map((id) => h('button', {
    class: 'nutri',
    style: { '--nc': NUTRIENTS[id].color },
    'data-id': id,
    onClick: () => show(id),
  }, h('b', null, NUTRIENTS[id].code), NUTRIENTS[id].name[lang]));
  function show(id) {
    const n = NUTRIENTS[id];
    line.textContent = `${n.name[lang]} ${n.benefit[lang]}.`;
    for (const c of chips) c.classList.toggle('on', c.dataset.id === id);
  }
  show(info.n[0]);
  return h('div', { class: 'nutri-box' },
    h('div', { class: 'nutri-title' }, '🍎 ', t('nutrition')),
    h('div', { class: 'nutri-row' }, chips),
    line,
    h('p', { class: 'nutri-fact' }, '💡 ', info.fact[lang]));
}

export function variantTitle(cropId, variant) {
  return cropName(cropId, variant);
}

export { t, fmtNum, cropImg, cropIcon, PACK_BY_ID };
