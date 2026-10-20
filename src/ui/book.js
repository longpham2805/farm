import { h, rewardChips, nutritionBlock } from './dom.js';
import { t, fmtNum, cropName, seedName } from '../i18n.js';
import * as G from '../game/logic.js';
import { CROPS, TOTAL_VARIETIES } from '../data/crops.js';
import { MILESTONES } from '../config.js';
import { openModal, toast } from './overlay.js';
import { cropImg } from '../three/thumbs.js';
import { icon } from './icons.js';
import { sfx } from '../audio.js';

export function openBook(app) {
  let tier = 0;
  openModal({
    title: t('bookTitle'),
    render(body, api) {
      const s = app.state;
      const found = G.discoveredCount(s);
      const claimGift = (fn) => {
        const r = fn();
        if (r.ok) {
          sfx.chest();
          toast([icon('gift'), ' ', t('youGot'), ': ', rewardLine(r.reward)], 'good');
          app.handleChests(r.chests);
          app.refresh();
        }
      };
      const milestones = h('div', { class: 'milestones' }, MILESTONES.map((m, i) => {
        const n = Math.min(m.n, TOTAL_VARIETIES);
        const done = s.claimedMilestones[i];
        const ready = !done && found >= n;
        return h('button', {
          class: `milestone${ready ? ' ready' : ''}${done ? ' done' : ''}`,
          disabled: !ready,
          title: rewardText(m.reward),
          onClick: () => claimGift(() => G.claimMilestone(s, i)),
        }, icon(done ? 'check' : 'gift'), h('span', { class: 'num' }, n));
      }));
      body.append(
        h('div', { class: 'book-top' },
          h('div', { class: 'book-count num' }, fmtNum(found), h('small', null, ` / ${TOTAL_VARIETIES} ${t('discovered')}`)),
          milestones),
        h('p', { class: 'muted', style: { margin: '0 0 8px' } }, t('bookHint')),
        h('div', { class: 'tabs' }, [0, 1, 2, 3, 4].map((tr) => h('button', { class: `tab${tier === tr ? ' on' : ''}`, onClick: () => {
          tier = tr;
          api.refresh();
        } }, tr === 0 ? t('tabAll') : h('span', { style: { color: tier === tr ? '#fff' : `var(--tier${tr})` } }, '●'.repeat(tr))))),
      );
      for (const crop of CROPS) {
        if (tier && crop.tier !== tier) continue;
        const have = G.cropDiscovered(s, crop);
        const complete = have === crop.variants;
        const claimed = s.claimedSets[crop.id];
        const vars = [];
        for (let v = 0; v < crop.variants; v++) {
          const known = !!s.discovered[G.varietyKey(crop.id, v)];
          vars.push(h('div', { class: `var${known ? '' : ' unknown'}${v && known ? ' mut' : ''}`, title: known ? cropName(crop.id, v) : '?' }, cropImg(crop.id, v)));
        }
        let action;
        if (claimed) action = h('span', { class: 'muted' }, icon('check'), ' ', t('claimed'));
        else if (complete) action = h('button', { class: 'btn small', onClick: () => claimGift(() => G.claimSet(s, crop.id)) }, icon('gift'), t('claim'));
        else action = h('div', { class: 'rewards' }, rewardChips(G.setReward(crop)));
        body.append(h('div', { class: 'set-row' },
          h('div', { class: 'set-name' }, cropName(crop.id), h('small', { class: 'num' }, `${have}/${crop.variants}`), nutritionBlock(crop.id, { compact: true })),
          h('div', { class: 'set-vars' }, vars),
          action));
      }
    },
  });
}

/** What a reward holds, with its icons, for a toast. */
export function rewardLine(reward) {
  const parts = [];
  if (reward.coins) parts.push([icon('earth'), fmtNum(reward.coins)]);
  if (reward.energy) parts.push([icon('energy'), reward.energy]);
  if (reward.xp) parts.push([icon('star'), reward.xp]);
  if (reward.seeds) for (const [id, n] of Object.entries(reward.seeds)) parts.push(`${n}× ${seedName(id)}`);
  return parts.flatMap((p, i) => (i ? [' · ', p] : [p]));
}

/** The same as plain text, for a tooltip. */
export function rewardText(reward) {
  const parts = [];
  if (reward.coins) parts.push(`🌏${fmtNum(reward.coins)}`);
  if (reward.energy) parts.push(`✨${reward.energy}`);
  if (reward.xp) parts.push(`⭐${reward.xp}`);
  if (reward.seeds) for (const [id, n] of Object.entries(reward.seeds)) parts.push(`${n}× ${seedName(id)}`);
  return parts.join(' · ');
}
