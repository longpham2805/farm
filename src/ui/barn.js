import { h, nutritionBlock, cropPic, cropIcon } from './dom.js';
import { icon } from './icons.js';
import { t, fmtNum, cropName } from '../i18n.js';
import * as G from '../game/logic.js';
import { CROP_BY_ID } from '../data/crops.js';
import { openModal, toast } from './overlay.js';
import { sfx } from '../audio.js';

export function openBarn(app, startTab = 'crops') {
  let tab = startTab;
  let sel = null;
  let qty = 1;
  let confirmAll = false;

  openModal({
    title: t('barnTitle'),
    render(body, api) {
      const s = app.state;
      const reserved = G.reservedItems(s);
      const keys = Object.keys(s.items).filter((k) => s.items[k] > 0).sort((a, b) => {
        const [ca, va] = a.split(':');
        const [cb, vb] = b.split(':');
        return CROP_BY_ID[ca].tier - CROP_BY_ID[cb].tier || ca.localeCompare(cb) || Number(va) - Number(vb);
      });
      const tabs = h('div', { class: 'tabs' },
        [['crops', t('crops')], ['useful', t('useful')]].map(([id, label]) => h('button', { class: `tab${tab === id ? ' on' : ''}`, onClick: () => {
          tab = id;
          api.refresh();
          const list = api.body.querySelector('.grid-wrap'); // a new list starts at its top
          if (list) list.scrollTop = 0;
        } }, label)));

      if (tab === 'useful') {
        const need = G.levelNeeds(s);
        const mat = need && need.material;
        body.append(tabs);
        if (!mat) {
          body.append(h('div', { class: 'empty-note' }, h('span', { class: 'big' }, icon('basket')), t('usefulNone')));
          return;
        }
        const have = G.cropCount(s, mat.crop);
        body.append(
          h('p', { class: 'muted' }, t('usefulNote')),
          h('div', { class: 'reqs' }, h('div', { class: `req ${have >= mat.n ? 'ok' : 'miss'}` },
            cropIcon(mat.crop), cropName(mat.crop), h('b', { class: 'num' }, `${fmtNum(have)}/${fmtNum(mat.n)}`))),
          h('div', { class: 'row-btns' }, h('button', { class: 'btn honey', onClick: () => app.go('upgrade') }, icon('home'), t('upgradeTitle'))));
        return;
      }

      if (!keys.length) {
        body.append(tabs, h('div', { class: 'empty-note' }, h('span', { class: 'big' }, icon('basket')), t('barnEmpty')));
        return;
      }
      if (!sel || !s.items[sel]) sel = keys[0];
      const [cropId, vs] = sel.split(':');
      const variant = Number(vs);
      const have = s.items[sel];
      qty = Math.max(1, Math.min(qty, have));
      const price = G.sellPrice(s, cropId, variant);

      const grid = h('div', { class: 'grid' }, keys.map((k) => {
        const [c, v] = k.split(':');
        return h('button', {
          class: `item${k === sel ? ' sel' : ''}${Number(v) ? ' mut' : ''}`,
          title: cropName(c, Number(v)),
          'aria-label': cropName(c, Number(v)),
          onClick: () => {
            sel = k;
            qty = 1;
            confirmAll = false;
            sfx.tap();
            api.refresh();
          },
        }, cropPic(c, Number(v)), Number(v) ? h('span', { class: 'spark' }, icon('mutation')) : null,
        reserved[k] ? h('span', { class: 'keep', title: t('keptForUpgrade') }, icon('lock')) : null,
        h('span', { class: 'count num' }, fmtNum(s.items[k])));
      }));

      const range = h('input', { type: 'range', min: 1, max: have, value: qty, 'aria-label': t('qty'), id: 'barn-qty' });
      const val = h('span', { class: 'val num' }, qty);
      const sellBtn = h('button', { class: 'btn', onClick: () => {
        const r = G.sell(s, sel, qty);
        if (r.ok) {
          sfx.coin();
          toast([icon('earth'), ' ', t('sold', { coins: fmtNum(r.coins) })], 'good');
          qty = 1;
          app.refresh();
        }
      } }, t('sell'), icon('earth'), h('span', { class: 'num' }, fmtNum(price * qty)));
      range.addEventListener('input', () => {
        qty = Number(range.value);
        val.textContent = qty;
        sellBtn.lastChild.textContent = fmtNum(price * qty);
      });
      const set = (n) => {
        qty = Math.max(1, Math.min(have, n));
        api.refresh();
      };

      const preview = G.sellAllPreview(s);
      const detail = h('div', { class: 'detail' },
        h('div', { class: 'detail-head' }, h('div', { class: 'detail-pic' }, cropPic(cropId, variant)),
          h('div', null, h('h3', null, cropName(cropId, variant)),
            h('div', { class: 'tags' }, variant ? h('span', { class: 'tag mut' }, icon('mutation'), ' ', t('tagMutation')) : null))),
        h('dl', { class: 'stats' },
          h('dt', null, t('owned')), h('dd', null, fmtNum(have)),
          h('dt', null, t('sellEach')), h('dd', null, icon('earth'), ' ', fmtNum(price)),
          reserved[sel] ? [h('dt', null, icon('lock')), h('dd', null, t('keptForUpgrade'))] : null),
        nutritionBlock(cropId),
        h('div', { class: 'qty' },
          h('button', { class: 'step', onClick: () => set(qty - 1), 'aria-label': '-' }, '−'),
          range, val,
          h('button', { class: 'step', onClick: () => set(qty + 1), 'aria-label': '+' }, '+')),
        h('div', { class: 'quick' }, [1, 10].map((n) => h('button', { onClick: () => set(n) }, `${n}`)), h('button', { onClick: () => set(have) }, t('max'))),
        sellBtn,
        h('hr', { style: { border: 0, borderTop: '2px dashed var(--paper-3)', width: '100%', margin: '4px 0' } }),
        confirmAll
          ? h('div', { class: 'center' },
            h('p', { style: { margin: '0 0 8px' } }, t('sellAllConfirm', { n: fmtNum(preview.qty), coins: fmtNum(preview.coins) })),
            h('div', { class: 'row-btns' },
              h('button', { class: 'btn small', onClick: () => {
                const r = G.sellAll(s);
                confirmAll = false;
                if (r.ok) {
                  sfx.coin();
                  toast([icon('earth'), ' ', t('sold', { coins: fmtNum(r.coins) })], 'good');
                }
                app.refresh();
              } }, t('yes')),
              h('button', { class: 'btn ghost small', onClick: () => {
                confirmAll = false;
                api.refresh();
              } }, t('cancel'))))
          : h('button', { class: 'btn honey', disabled: preview.qty === 0, onClick: () => {
            confirmAll = true;
            api.refresh();
          } }, icon('basket'), t('sellAll')));

      body.append(h('div', { class: 'split' }, h('div', { class: 'grid-wrap' }, tabs, grid), detail));
    },
  });
}
