import { t, fmtNum, seedName, cropName, getLang } from '../i18n.js';
import { NUTRIENTS, CROP_NUTRITION } from '../data/nutrition.js';
import { CROP_BY_ID, PACK_BY_ID, isPack } from '../data/crops.js';
import { cropImg } from '../three/thumbs.js';
import { cropIcon } from './cropIcons.js';
import { icon, chestSvg as chestArt } from './icons.js';
import { svgImg } from './draw.js';

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

/** A chest in its tier's colours (icons.js). */
export function chestSvg(tier) {
  return h('span', { class: 'chest-svg' }, svgImg(`chest:${tier}`, () => chestArt(tier), ''));
}

/** Little chips showing what a reward contains. */
export function rewardChips(reward) {
  const out = [];
  if (!reward) return out;
  if (reward.coins) out.push(h('span', { class: 'rw' }, icon('earth'), fmtNum(reward.coins)));
  if (reward.xp) out.push(h('span', { class: 'rw' }, icon('star'), fmtNum(reward.xp)));
  if (reward.energy) out.push(h('span', { class: 'rw' }, icon('energy'), fmtNum(reward.energy)));
  if (reward.seeds) {
    for (const [id, n] of Object.entries(reward.seeds)) {
      out.push(h('span', { class: 'rw', title: seedName(id) },
        isPack(id) ? icon('gift') : cropIcon(id),
        `×${n}`));
    }
  }
  return out;
}

/** A nutrient's badge: its letters (vitamins, minerals) or its icon. */
const nutriMark = (n) => (n.icon ? (n.icon === 'avocado' ? cropIcon('avocado', 'i') : icon(n.icon)) : n.code);

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
      h('span', { class: 'nutri-dot', style: { '--nc': NUTRIENTS[id].color }, title: NUTRIENTS[id].name[lang] }, nutriMark(NUTRIENTS[id]))));
  }
  const line = h('p', { class: 'nutri-benefit' });
  const chips = info.n.map((id) => h('button', {
    class: 'nutri',
    style: { '--nc': NUTRIENTS[id].color },
    'data-id': id,
    onClick: () => show(id),
  }, h('b', null, nutriMark(NUTRIENTS[id])), NUTRIENTS[id].name[lang]));
  function show(id) {
    const n = NUTRIENTS[id];
    line.textContent = `${n.name[lang]} ${n.benefit[lang]}.`;
    for (const c of chips) c.classList.toggle('on', c.dataset.id === id);
  }
  show(info.n[0]);
  return h('div', { class: 'nutri-box' },
    h('div', { class: 'nutri-title' }, icon('apple'), ' ', t('nutrition')),
    h('div', { class: 'nutri-row' }, chips),
    line,
    h('p', { class: 'nutri-fact' }, icon('bulb'), ' ', info.fact[lang]));
}

export function variantTitle(cropId, variant) {
  return cropName(cropId, variant);
}

export { t, fmtNum, cropImg, cropIcon, PACK_BY_ID };
