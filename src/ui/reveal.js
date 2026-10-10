import { h } from './dom.js';
import { t, cropName } from '../i18n.js';
import { openModal, confetti } from './overlay.js';
import { cropImg } from '../three/thumbs.js';
import { lookOf, STYLES } from '../data/styles.js';
import { CROP_BY_ID } from '../data/crops.js';
import { sfx } from '../audio.js';

/** Celebrates a new plant look (or what a mystery seed became). Resolves when closed. */
export function showReveal(app, { crop, variant, newDiscovery, pack }) {
  return new Promise((resolve) => {
    const look = lookOf(CROP_BY_ID[crop], variant);
    const kicker = newDiscovery ? (variant ? t('newMutation') : t('newVariety')) : t('mysteryWas');
    if (variant) sfx.mutate();
    else sfx.harvest();
    const m = openModal({
      size: 'narrow',
      static: true,
      onClose: resolve,
      render(body, api) {
        const pic = h('div', { class: 'pic' }, cropImg(crop, variant));
        if (look) pic.style.filter = `drop-shadow(0 0 18px ${STYLES[look.style].aura})`;
        body.append(h('div', { class: 'reveal' },
          h('div', { class: 'kicker' }, pack && newDiscovery ? `❓ → ${kicker}` : kicker),
          pic,
          h('h2', null, cropName(crop, variant)),
          newDiscovery ? h('p', { class: 'muted' }, '📖 ', t('addedToBook')) : null,
          h('div', { class: 'row-btns' }, h('button', { class: 'btn berry', onClick: () => api.close() }, t('ok')))));
      },
    });
    if (variant || newDiscovery) confetti(m.card);
  });
}
