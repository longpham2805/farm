// Icons floating above the plots: water drop, basket, lock and so on.
import { h } from './dom.js';
import { PLOT_UNLOCK } from '../config.js';

export class Bubbles {
  constructor(app) {
    this.app = app;
    this.root = document.getElementById('bubbles');
    this.items = [];
    for (let i = 0; i < 16; i++) {
      const el = h('div', { class: 'bubble', hidden: true });
      el.addEventListener('pointerup', (e) => {
        e.stopPropagation();
        if (el.dataset.kind !== 'lock') app.onPlot(i);
        else app.onPlot(i);
      });
      el.style.zIndex = String(10 + Math.floor(i / 4) + (i % 4));
      this.root.append(el);
      this.items.push({ el, kind: '' });
    }
  }

  sync() {
    const app = this.app;
    const npc = app.view.mode === 'npc';
    for (let i = 0; i < 16; i++) {
      const d = app.describe(i);
      let kind = '';
      let icon = '';
      if (d && d.locked) {
        if (!npc && app.sheet === 'seeds' && PLOT_UNLOCK[i] <= app.state.level + 3) {
          kind = 'lock';
          icon = `🔒 ${PLOT_UNLOCK[i]}`;
        }
      } else if (!d && !npc && app.sheet === 'seeds' && i === app.plantTarget) {
        kind = 'target';
        icon = '🌱';
      } else if (d) {
        if (d.info.mature) {
          if (npc) {
            if (!d.plot.stolen) {
              kind = 'steal';
              icon = '✋';
            }
          } else {
            kind = 'ripe';
            icon = '🧺';
          }
        } else if (d.info.thirsty) {
          kind = 'water';
          icon = '💧';
        } else if (d.mystery && !npc) {
          kind = 'mystery';
          icon = '❓';
        }
      }
      const item = this.items[i];
      const k = kind + icon;
      if (item.kind === k) continue;
      item.kind = k;
      item.el.dataset.kind = kind;
      item.el.className = `bubble ${kind}`;
      item.el.textContent = icon;
      item.el.hidden = !kind;
      item.el.style.animationDelay = `${-(i * 0.17)}s`;
    }
  }

  frame() {
    const scene = this.app.scene;
    for (let i = 0; i < 16; i++) {
      const item = this.items[i];
      if (item.el.hidden) continue;
      const p = item.el.dataset.kind === 'lock' ? scene.screenPos(i, 0.05) : scene.screenPos(i);
      item.el.style.transform = `translate3d(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px, 0)`;
    }
  }
}
