import { h, seedBag, tierOf, nutritionBlock } from './dom.js';
import { t, fmtNum, fmtDur, seedName } from '../i18n.js';
import * as G from '../game/logic.js';
import { CROPS, PACKS, CROP_BY_ID, PACK_BY_ID, isPack, hasTag, packPool } from '../data/crops.js';
import { openModal, toast } from './overlay.js';
import { cropIcon } from './cropIcons.js';
import { sfx } from '../audio.js';

const tagsFor = (crop) => [
  hasTag(crop, 'exp') && h('span', { class: 'tag exp' }, 'EXP'),
  hasTag(crop, 'special') && h('span', { class: 'tag special' }, '★ ', t('tagSpecial')),
  hasTag(crop, 'lucky') && h('span', { class: 'tag lucky' }, '🍀 ', t('tagLucky')),
];

export function openShop(app, focus = null) {
  let tab = 'all';
  let sel = focus || null;
  let qty = 1;

  const all = [...CROPS.filter((c) => c.price > 0), ...PACKS];
  const sorted = all.slice().sort((a, b) => a.unlock - b.unlock || tierOf(a.id) - tierOf(b.id) || a.price - b.price);

  openModal({
    title: t('shopTitle'),
    render(body, api) {
      const s = app.state;
      const list = sorted.filter((d) => {
        if (tab === 'all') return true;
        if (tab === 'packs') return isPack(d.id);
        if (isPack(d.id)) return false;
        return tab === 'special' ? hasTag(d, 'special') : !hasTag(d, 'special');
      });
      if (!sel || !list.find((d) => d.id === sel)) sel = (list.find((d) => d.unlock <= s.level) || list[0]).id;
      const def = CROP_BY_ID[sel] || PACK_BY_ID[sel];
      const locked = def.unlock > s.level;
      const maxQty = Math.max(1, Math.min(99, Math.floor(s.coins / def.price)));
      qty = Math.max(1, Math.min(qty, maxQty));

      const tabs = h('div', { class: 'tabs' },
        [['all', t('tabAll')], ['normal', t('tabNormal')], ['special', t('tabSpecial')], ['packs', t('tabPacks')]].map(([id, label]) =>
          h('button', { class: `tab${tab === id ? ' on' : ''}`, onClick: () => {
            tab = id;
            api.refresh();
          } }, label)));

      const grid = h('div', { class: 'grid' }, list.map((d) => seedBag(d.id, {
        label: d.unlock > s.level ? `🔒 ${t('level')} ${d.unlock}` : `🌏${fmtNum(d.price)}`,
        locked: d.unlock > s.level,
        selected: d.id === sel,
        corner: s.seeds[d.id] ? `x${s.seeds[d.id]}` : null,
        onClick: () => {
          sel = d.id;
          qty = 1;
          sfx.tap();
          api.refresh();
        },
      })));

      const pic = h('div', { class: 'detail-pic' }, isPack(def.id) ? h('span', { class: 'q' }, '?') : cropIcon(def.id));
      const stats = h('dl', { class: 'stats' });
      const stat = (k, v) => stats.append(h('dt', null, k), h('dd', null, v));
      if (isPack(def.id)) {
        const pool = packPool(def.id);
        stat(t('mutations'), t('packPool', { n: pool.length }));
        if (def.mutation) stat('✨', t('packBonus', { n: Math.round(def.mutation * 100) }));
        stat(t('xpGain'), t('random'));
        stat(t('growTime'), t('random'));
      } else {
        stat(t('variants'), `${def.variants}`);
        stat(t('xpGain'), `⭐ ${fmtNum(def.xp)}`);
        stat(t('yield'), `${def.yield} (+2 💧)`);
        stat(t('sellEach'), `🌏 ${fmtNum(G.sellPrice(s, def.id, 0))}`);
        stat(t('growTime'), fmtDur(G.growMsFor(def, s.level)));
      }
      stat(t('owned'), `${fmtNum(s.seeds[def.id] || 0)}`);

      const range = h('input', { type: 'range', min: 1, max: maxQty, value: qty, 'aria-label': t('qty'), id: 'shop-qty' });
      range.addEventListener('input', () => {
        qty = Number(range.value);
        val.textContent = qty;
        buyBtn.lastChild.textContent = fmtNum(def.price * qty);
      });
      const val = h('span', { class: 'val num' }, qty);
      const set = (n) => {
        qty = Math.max(1, Math.min(maxQty, n));
        api.refresh();
      };
      const buyBtn = h('button', {
        class: 'btn berry',
        disabled: locked || def.price * qty > s.coins,
        onClick: () => {
          const r = G.buySeed(s, def.id, qty);
          if (!r.ok) {
            sfx.error();
            toast(r.err === 'noCoins' ? t('notEnoughCoins') : t('unlockAt', { n: def.unlock }), 'warn');
            return;
          }
          sfx.coin();
          toast(t('bought', { n: qty, name: seedName(def.id) }), 'good');
          qty = 1;
          app.refresh();
        },
      }, `${t('buy')} 🌏`, h('span', { class: 'num' }, fmtNum(def.price * qty)));

      const detail = h('div', { class: 'detail' },
        h('div', { class: 'detail-head' }, pic,
          h('div', null, h('h3', null, seedName(def.id)),
            h('div', { class: 'tags' }, isPack(def.id) ? h('span', { class: 'tag mut' }, '?') : tagsFor(def)))),
        stats,
        isPack(def.id) ? null : nutritionBlock(def.id),
        locked
          ? h('div', { class: 'center danger' }, '🔒 ', t('unlockAt', { n: def.unlock }))
          : [
            h('div', { class: 'qty' },
              h('button', { class: 'step', onClick: () => set(qty - 1), 'aria-label': '-' }, '−'),
              range, val,
              h('button', { class: 'step', onClick: () => set(qty + 1), 'aria-label': '+' }, '+')),
            h('div', { class: 'quick' },
              [1, 5, 10].map((n) => h('button', { onClick: () => set(n) }, `${n}`)),
              h('button', { onClick: () => set(maxQty) }, t('max'))),
            buyBtn,
          ]);

      body.append(h('div', { class: 'split' }, h('div', { class: 'grid-wrap' }, tabs, grid), detail));
    },
  });
}
