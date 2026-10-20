import { h, seedBag } from './dom.js';
import { t, fmtNum, cropName, seedName } from '../i18n.js';
import * as G from '../game/logic.js';
import { growReduction, priceBonus, energyBonus, mutationBase, MAX_LEVEL } from '../config.js';
import { openModal, toast, confetti } from './overlay.js';
import { cropIcon } from './cropIcons.js';
import { sfx } from '../audio.js';

const pct = (v) => `${Math.round(v * 1000) / 10}%`;

export function openUpgrade(app) {
  openModal({
    title: t('upgradeTitle'),
    size: 'mid',
    render(body, api) {
      const s = app.state;
      const L = s.level;
      const check = G.upgradeCheck(s);
      if (check.max) {
        body.append(h('div', { class: 'empty-note' }, h('span', { class: 'big' }, '🏆'), t('maxLevel')));
        return;
      }
      const need = check.need;
      const bonusRow = (label, fn) => [h('span', null, label), h('b', null, pct(fn(L))), h('span', null, '→'), h('b', { class: 'to' }, pct(fn(L + 1)))];
      const unlocks = G.unlocksAt(L + 1);
      body.append(
        h('div', { class: 'up-levels' },
          h('div', { class: 'house' }, L),
          h('div', { class: 'up-bar' },
            h('div', { class: 'bar' }, h('i', { style: { width: `${Math.min(100, (s.xp / need.xp) * 100)}%` } }),
              h('span', { class: 'num' }, `⭐ ${fmtNum(s.xp)} / ${fmtNum(need.xp)}`))),
          h('div', { class: 'house next' }, L + 1)),
        h('div', { class: 'bonus' },
          bonusRow(t('bonusGrow'), growReduction),
          bonusRow(t('bonusPrice'), priceBonus),
          bonusRow(t('bonusEnergy'), energyBonus),
          bonusRow(t('bonusMutation'), mutationBase),
          h('span', null, t('plots')), h('b', null, G.plotCount(L)), h('span', null, '→'), h('b', { class: 'to' }, G.plotCount(L + 1))),
      );
      if (unlocks.seeds.length || unlocks.plots) {
        body.append(h('div', { class: 'section-title center' }, t('newUnlocks')),
          h('div', { class: 'unlocks' },
            unlocks.seeds.map((id) => h('div', { class: 'u' }, seedBag(id, {}), seedName(id))),
            unlocks.plots ? h('div', { class: 'u' }, h('span', { style: { fontSize: '40px' } }, '🟫'), t('morePlots', { n: unlocks.plots })) : null));
      }
      const reqs = [
        h('div', { class: `req ${check.xpOk ? 'ok' : 'miss'}` }, '⭐', h('b', { class: 'num' }, `${fmtNum(Math.min(s.xp, need.xp))}/${fmtNum(need.xp)}`)),
        h('div', { class: `req ${check.coinsOk ? 'ok' : 'miss'}` }, '🌏', h('b', { class: 'num' }, fmtNum(need.coins))),
      ];
      if (need.material) {
        const have = G.cropCount(s, need.material.crop);
        reqs.push(h('div', { class: `req ${check.matOk ? 'ok' : 'miss'}` }, cropIcon(need.material.crop), cropName(need.material.crop),
          h('b', { class: 'num' }, `${fmtNum(have)}/${fmtNum(need.material.n)}`)));
      }
      body.append(
        h('div', { class: 'reqs' }, reqs),
        h('div', { class: 'row-btns' },
          h('button', { class: 'btn berry', disabled: !check.ok, onClick: () => {
            const r = G.upgrade(s);
            if (!r.ok) return;
            api.close();
            app.refresh();
            showLevelUp(app, r);
          } }, '🏡 ', t('upgrade'))),
        !check.xpOk ? h('p', { class: 'muted center' }, t('needXp', { n: fmtNum(need.xp - s.xp) })) : null,
      );
    },
  });
}

export function showLevelUp(app, result) {
  sfx.levelUp();
  const m = openModal({
    size: 'narrow',
    static: true,
    render(body, api) {
      body.append(h('div', { class: 'reveal' },
        h('div', { class: 'pic' }, h('div', { class: 'house next', style: { width: '120px', height: '120px', fontSize: '60px', position: 'relative' } }, result.level)),
        h('h2', null, t('levelUp', { n: result.level })),
        h('div', { class: 'kicker' }, t('levelUpSub')),
        result.unlocks.seeds.length || result.unlocks.plots
          ? h('div', { class: 'unlocks' },
            result.unlocks.seeds.map((id) => h('div', { class: 'u' }, seedBag(id, {}), seedName(id))),
            result.unlocks.plots ? h('div', { class: 'u' }, h('span', { style: { fontSize: '40px' } }, '🟫'), t('morePlots', { n: result.unlocks.plots })) : null)
          : null,
        h('div', { class: 'row-btns' }, h('button', { class: 'btn', onClick: () => api.close() }, t('ok')))));
    },
  });
  confetti(m.card);
  if (result.level >= MAX_LEVEL) toast(t('maxLevel'), 'good');
}
