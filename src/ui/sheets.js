// Bottom sheets: the planting bar and the friends strip.
import { h, clear, seedBag } from './dom.js';
import { t, fmtNum, seedName } from '../i18n.js';
import * as G from '../game/logic.js';
import { CROP_BY_ID, isPack, hasTag } from '../data/crops.js';
import { NPCS } from '../data/npcs.js';

export class Sheets {
  constructor(app) {
    this.app = app;
    this.root = document.getElementById('sheet-root');
    this.seedTab = 'all';
    this.friendTab = 'friends';
    this.key = '';
  }

  render() {
    const app = this.app;
    const s = app.state;
    const sheet = app.sheet;
    let key = `${sheet}|${app.view.mode}|${app.view.npcId}|${s.settings.lang}`;
    if (sheet === 'seeds') key += `|${this.seedTab}|${app.seedSel}|${JSON.stringify(s.seeds)}`;
    if (sheet === 'friends') key += `|${this.friendTab}|${this.friendKey()}`;
    if (key === this.key) return;
    const scroller = this.root.querySelector('.scroller');
    const scroll = scroller ? scroller.scrollLeft : 0;
    this.key = key;
    clear(this.root);
    if (sheet === 'seeds') this.root.append(this.seedSheet());
    else if (sheet === 'friends') this.root.append(this.friendSheet());
    const next = this.root.querySelector('.scroller');
    if (next && key.split('|')[0] === sheet) next.scrollLeft = scroll;
  }

  tabs(list, current, onPick, closable = true) {
    return h('div', { class: 'sheet-tabs' },
      list.map(([id, label]) => h('button', { class: `sheet-tab${current === id ? ' on' : ''}`, onClick: () => onPick(id) }, label)),
      closable ? h('button', { class: 'sheet-tab close', 'aria-label': t('close'), onClick: () => this.app.closeSheet() }, '✕') : null);
  }

  seedSheet() {
    const app = this.app;
    const s = app.state;
    const ids = ['radish', ...Object.keys(s.seeds).filter((id) => s.seeds[id] > 0 && id !== 'radish')];
    const filtered = ids.filter((id) => {
      if (this.seedTab === 'all') return true;
      const special = isPack(id) || hasTag(CROP_BY_ID[id], 'special');
      return this.seedTab === 'special' ? special : !special;
    });
    filtered.sort((a, b) => order(a) - order(b));
    const list = h('div', { class: 'scroller' },
      filtered.map((id) => seedBag(id, {
        label: id === 'radish' ? '∞' : `x${fmtNum(G.seedCount(s, id))}`,
        selected: app.seedSel === id,
        corner: isPack(id) ? '?' : null,
        onClick: () => app.selectSeed(id),
      })));
    const onlyFree = ids.length === 1;
    return h('div', { class: 'sheet' },
      this.tabs([['all', t('tabAll')], ['normal', t('tabNormal')], ['special', t('tabSpecial')]], this.seedTab, (id) => {
        this.seedTab = id;
        this.render();
      }),
      h('div', { class: 'sheet-body' },
        list,
        h('div', { class: 'sheet-side' },
          app.seedSel ? h('button', { class: 'btn small', onClick: () => app.plantAll(app.seedSel) }, '🌱 ', t('plantAll')) : null,
          onlyFree || this.seedTab !== 'all' ? h('button', { class: 'btn small honey', onClick: () => app.go('shop') }, '🏪 ', t('shop')) : null)));
  }

  friendKey() {
    const app = this.app;
    const now = app.now();
    return NPCS.map((n) => {
      const st = G.npcStatus(app.state, n.id, now);
      return `${n.id}${st.canSteal ? 1 : 0}${st.thirsty ? 1 : 0}`;
    }).join(',');
  }

  friendSheet() {
    const app = this.app;
    const now = app.now();
    const strangers = this.friendTab === 'strangers';
    const cards = NPCS.filter((n) => !!n.stranger === strangers).map((n) => {
      const st = G.npcStatus(app.state, n.id, now);
      const status = st.canSteal ? ['steal', t('canSteal')] : st.thirsty ? ['water', t('canWater')] : ['none', t('nothing')];
      return h('button', { class: `friend${app.view.npcId === n.id ? ' here' : ''}`, onClick: () => app.visit(n.id) },
        h('div', { class: 'avatar' }, n.avatar, h('span', { class: 'lvl' }, n.level)),
        h('div', null, h('div', { class: 'fn' }, n.name), h('span', { class: `fs ${status[0]}` }, status[1])));
    });
    return h('div', { class: 'sheet' },
      this.tabs([['friends', t('friendsTab')], ['strangers', t('strangersTab')]], this.friendTab, (id) => {
        this.friendTab = id;
        this.render();
      }, app.view.mode !== 'npc'),
      h('div', { class: 'sheet-body' }, h('div', { class: 'scroller' }, cards)));
  }
}

function order(id) {
  if (id === 'radish') return -1;
  if (isPack(id)) return 1000 + Number(id.slice(4));
  const c = CROP_BY_ID[id];
  return c.tier * 100 + c.unlock;
}

export { seedName };
