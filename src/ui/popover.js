// Small info card above a growing plant.
import { h, clear } from './dom.js';
import { t, fmtClock, cropName } from '../i18n.js';
import * as G from '../game/logic.js';
import { CROP_BY_ID } from '../data/crops.js';

export class Popover {
  constructor(app) {
    this.app = app;
    this.root = document.getElementById('popover-root');
    this.index = null;
    this.el = null;
    this.confirming = false;
  }

  open(i) {
    if (this.index === i && this.el) return this.close();
    this.close();
    this.index = i;
    this.confirming = false;
    this.el = h('div', { class: 'popover' });
    this.root.append(this.el);
    this.app.scene.setSelected(i);
    this.build();
    this.frame();
  }

  close() {
    if (this.el) this.el.remove();
    if (this.index !== null) this.app.scene.setSelected(null);
    this.el = null;
    this.index = null;
  }

  build() {
    const app = this.app;
    const d = app.describe(this.index);
    if (!d || d.locked || d.info.mature) return this.close();
    const npc = app.view.mode === 'npc';
    const plot = d.plot;
    const mystery = !!plot.pack && !npc;
    const r = (this.refs = {});
    clear(this.el);
    this.el.append(
      h('h4', null, h('span', null, mystery ? `❓ ${t('mysteryPlant')}` : cropName(plot.crop)),
        !npc ? h('button', { class: 'shovel', title: t('removePlant'), 'aria-label': t('removePlant'), onClick: () => {
          this.confirming = !this.confirming;
          this.build();
        } }, '🗑️') : null),
      (r.stage = h('div', { class: 'muted', style: { color: '#e3d6f0' } })),
      h('div', { class: 'progress' }, (r.bar = h('i'))),
      h('div', { class: 'row' }, h('span', null, t('grows')), (r.left = h('b', { class: 'num' }))),
      (r.waterRow = h('div', { class: 'row' }, (r.waterLabel = h('span')), (r.water = h('b', { class: 'warn num' })))),
    );
    if (!npc) {
      this.el.append(
        h('div', { class: 'row' }, h('span', null, t('mutationChance')), (r.mut = h('b'))),
        h('div', { class: 'row' }, h('span', null, t('output')), (r.out = h('b'))),
      );
    }
    if (this.confirming) {
      this.el.append(h('div', { class: 'confirm' },
        h('span', { style: { flex: '1' } }, t('removePlant')),
        h('button', { class: 'btn small berry', onClick: () => app.removePlant(this.index) }, t('yes')),
        h('button', { class: 'btn small ghost', onClick: () => {
          this.confirming = false;
          this.build();
        } }, t('cancel'))));
    }
    this.update();
  }

  update() {
    if (!this.el || !this.refs) return;
    const app = this.app;
    const d = app.describe(this.index);
    if (!d || d.locked || d.info.mature) return this.close();
    const { info, plot } = d;
    const r = this.refs;
    r.stage.textContent = [t('stageSeed'), t('stageSprout'), t('stageGrow'), t('stageRipe')][info.stage];
    r.bar.style.width = `${info.progress * 100}%`;
    r.left.textContent = fmtClock(info.remainingMs);
    if (info.thirsty) {
      r.waterRow.hidden = false;
      r.waterLabel.textContent = '💧';
      r.water.textContent = t('needsWater');
    } else if (info.waterInMs != null) {
      r.waterRow.hidden = false;
      r.waterLabel.textContent = t('waterIn');
      r.water.textContent = fmtClock(info.waterInMs);
    } else {
      r.waterRow.hidden = true;
    }
    if (r.mut) {
      r.mut.textContent = `${Math.round(G.mutationChance(app.state, plot) * 100)}%`;
      const base = CROP_BY_ID[plot.crop].yield;
      r.out.textContent = plot.pack ? '?' : plot.waters ? `${base + plot.waters} (${base}+${plot.waters})` : `${base}`;
    }
  }

  frame() {
    if (!this.el) return;
    const p = this.app.scene.screenPos(this.index);
    const w = this.app.scene.width;
    const x = Math.max(125, Math.min(w - 125, p.x));
    const y = Math.max(this.el.offsetHeight + 30, p.y);
    this.el.style.left = `${x}px`;
    this.el.style.top = `${y}px`;
  }
}
