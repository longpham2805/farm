import { h, chestSvg, rewardChips } from './dom.js';
import { t, fmtNum } from '../i18n.js';
import * as G from '../game/logic.js';
import { CHEST_TIERS, ENERGY_PER_CHEST } from '../config.js';
import { openModal } from './overlay.js';
import { sfx } from '../audio.js';

export function openChests(app) {
  const s = app.state;
  let sel = CHEST_TIERS.find((tier) => s.chests[tier] > 0) || 'green';
  let loot = null;

  openModal({
    title: t('chestsTitle'),
    size: 'mid',
    render(body, api) {
      body.append(
        h('p', { class: 'muted center', style: { margin: '0 0 10px' } }, t('chestsIntro')),
        h('div', { class: 'energy' }, h('span', null, '✨ ', t('energy')),
          h('div', { class: 'bar' }, h('i', { style: { width: `${(s.energy / ENERGY_PER_CHEST) * 100}%` } }),
            h('span', { class: 'num' }, `${Math.floor(s.energy)}/${ENERGY_PER_CHEST}`))),
        h('div', { class: 'chests' }, CHEST_TIERS.map((tier) => h('button', {
          class: `chest${sel === tier ? ' sel' : ''}${s.chests[tier] ? '' : ' empty'}`,
          onClick: () => {
            sel = tier;
            loot = null;
            sfx.tap();
            api.refresh();
          },
        }, chestSvg(tier), h('span', { class: 'n num' }, `x${s.chests[tier]}`), h('span', { class: 'nm' }, t(`chest_${tier}`))))),
      );
      const n = s.chests[sel];
      body.append(h('div', { class: 'chest-info' },
        h('h3', null, t(`chest_${sel}`)),
        h('p', { class: 'muted', style: { margin: '0 0 10px' } }, t(`chestDesc_${sel}`)),
        n
          ? h('button', { class: 'btn berry', onClick: () => {
            const r = G.openChests(s, sel);
            loot = r.rewards;
            sfx.chest();
            app.handleChests(r.chests);
            app.refresh();
          } }, '🎁 ', t('openAll', { n: fmtNum(n) }))
          : h('span', { class: 'muted' }, t('noChests')),
        loot ? h('div', null, h('div', { class: 'section-title' }, t('youGot')),
          h('div', { class: 'loot' }, mergeLoot(loot).map((chip, i) => {
            chip.style.animationDelay = `${i * 0.06}s`;
            return chip;
          }))) : null));
    },
  });
}

function mergeLoot(rewards) {
  const total = { coins: 0, seeds: {} };
  for (const r of rewards) {
    total.coins += r.coins || 0;
    for (const [id, n] of Object.entries(r.seeds || {})) total.seeds[id] = (total.seeds[id] || 0) + n;
  }
  return rewardChips(total);
}
