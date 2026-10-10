import { h, clear } from './dom.js';
import { t, fmtNum } from '../i18n.js';
import * as G from '../game/logic.js';
import { NPC_BY_ID } from '../data/npcs.js';
import { CHAPTERS } from '../data/quests.js';
import { ENERGY_PER_CHEST } from '../config.js';
import { openUpgrade } from './upgrade.js';
import { openQuests, taskText } from './quests.js';

export class Hud {
  constructor(app) {
    this.app = app;
    this.root = document.getElementById('hud');
    this.mode = null;
    this.build();
  }

  build() {
    const app = this.app;
    this.mode = app.view.mode + (app.view.npcId || '');
    clear(this.root);
    const r = (this.refs = {});
    const btn = (key, icon, label, onClick, extra) =>
      (r[key] = h('button', { class: 'hbtn', onClick, 'aria-label': label }, h('span', { class: 'ico' }, icon), label, extra || null));

    r.coins = h('div', { class: 'coins' }, h('span', { class: 'ico' }, '🪙'), (r.coinText = h('span', { class: 'num' })));

    if (app.view.mode === 'npc') {
      const npc = NPC_BY_ID[app.view.npcId];
      this.root.append(
        h('div', { class: 'hud-top' },
          h('button', { class: 'back-btn', onClick: () => app.goHome(), 'aria-label': t('back'), title: t('back') }, '🏡'),
          h('div', { class: 'profile' },
            h('div', { class: 'avatar' }, npc.avatar, h('span', { class: 'lvl' }, npc.level)),
            h('div', { class: 'profile-text' }, h('div', { class: 'profile-name' }, t('visiting', { name: npc.name })))),
          h('div', { class: 'spacer' }),
          r.coins),
        (r.visitInfo = h('div', { class: 'visit-info' })),
      );
      this.update();
      return;
    }

    r.profile = h('button', { class: 'profile', onClick: () => openUpgrade(app), 'aria-label': t('upgradeTitle') },
      (r.avatar = h('div', { class: 'avatar' })),
      h('div', { class: 'profile-text' },
        (r.name = h('div', { class: 'profile-name' })),
        (r.xp = h('div', { class: 'xpbar' }, (r.xpFill = h('i')), (r.xpText = h('span', { class: 'num' }))))));

    r.meter = h('span', { class: 'meter' }, (r.meterFill = h('i')));
    this.root.append(
      h('div', { class: 'hud-top' }, r.profile, h('div', { class: 'spacer' }), r.coins),
      h('div', { class: 'side' },
        btn('shop', '🏪', t('shop'), () => app.go('shop')),
        btn('chests', '🎁', t('chests'), () => app.go('chests'), r.meter),
        btn('quests', '📜', t('quests'), () => app.go('quests')),
        btn('settings', '⚙️', t('settings'), () => app.go('settings'))),
      (r.actions = h('div', { class: 'actions' })),
      (r.banner = h('button', { class: 'quest-banner', onClick: () => openQuests(app) },
        h('span', { class: 'qi' }, '📜'),
        (r.bannerText = h('span', { class: 'qt' })))),
      h('div', { class: 'dock' },
        btn('barn', '🏚️', t('warehouse'), () => app.go('warehouse')),
        btn('seeds', '🌱', t('seeds'), () => (app.sheet === 'seeds' ? app.closeSheet() : app.openSeeds())),
        btn('friends', '👫', t('friends'), () => app.openFriends()),
        btn('book', '📖', t('book'), () => app.go('book'))),
    );
    this.update();
  }

  setBadge(el, n) {
    let b = el.querySelector('.badge-dot');
    if (!n) {
      if (b) b.remove();
      return;
    }
    if (!b) {
      b = h('span', { class: 'badge-dot' });
      el.append(b);
    }
    if (b.textContent !== String(n)) b.textContent = n;
  }

  update() {
    const app = this.app;
    const s = app.state;
    const mode = app.view.mode + (app.view.npcId || '');
    if (mode !== this.mode) return this.build();
    const r = this.refs;
    const coins = fmtNum(s.coins);
    if (r.coinText.textContent !== coins) {
      if (r.coinText.textContent) {
        r.coins.classList.remove('bump');
        void r.coins.offsetWidth;
        r.coins.classList.add('bump');
      }
      r.coinText.textContent = coins;
    }

    if (app.view.mode === 'npc') {
      const left = app.stealLeft(app.view.npcId);
      r.visitInfo.textContent = t(left.stranger ? 'stealLeftStranger' : 'stealLeftFriend', { n: Math.max(0, left.n), max: left.max });
      return;
    }

    r.avatar.textContent = s.profile.avatar;
    r.avatar.append(h('span', { class: 'lvl' }, s.level));
    r.name.textContent = s.profile.name ? t('myFarm', { name: s.profile.name }) : t('gameName');
    const need = G.levelNeeds(s);
    const check = G.upgradeCheck(s);
    if (need) {
      r.xpFill.style.width = `${Math.min(100, (s.xp / need.xp) * 100)}%`;
      r.xpText.textContent = `${fmtNum(s.xp)}/${fmtNum(need.xp)}`;
      r.xp.classList.toggle('ready', s.xp >= need.xp);
    } else {
      r.xpFill.style.width = '100%';
      r.xpText.textContent = 'MAX';
    }
    let arrow = r.name.querySelector('.up-arrow');
    if (check.ok && !arrow) r.name.append(h('span', { class: 'up-arrow', title: t('upgradeReady') }, '⬆'));
    if (!check.ok && arrow) arrow.remove();

    r.meterFill.style.width = `${(s.energy / ENERGY_PER_CHEST) * 100}%`;
    const chests = Object.values(s.chests).reduce((a, b) => a + b, 0);
    this.setBadge(r.chests, chests);
    this.setBadge(r.quests, G.claimableCount(s));
    this.setBadge(r.book, G.bookClaimable(s));
    this.root.classList.toggle('sheet-open', !!app.sheet);
    r.seeds.classList.toggle('on', app.sheet === 'seeds');
    r.friends.classList.toggle('on', app.sheet === 'friends');

    // Quest banner shows the first unfinished main task.
    const chapter = G.currentChapter(s);
    let text = t('allQuestsDone');
    let done = false;
    let title = '';
    if (chapter) {
      const idx = CHAPTERS.indexOf(chapter);
      title = `${t('chapter', { n: idx + 1 })} · ${chapter.title[app.state.settings.lang] || chapter.title.vi}`;
      const ready = chapter.tasks.find((task) => !s.quests.claimed[task.id] && G.taskProgress(s, task) >= task.n);
      const open = chapter.tasks.find((task) => !s.quests.claimed[task.id]);
      if (ready) {
        text = `${taskText(ready)} · ${t('questDone')}`;
        done = true;
      } else if (open) text = `${taskText(open)} (${fmtNum(Math.min(G.taskProgress(s, open), open.n))}/${fmtNum(open.n)})`;
    }
    const html = `${title}|${text}`;
    if (r.bannerText.dataset.k !== html) {
      r.bannerText.dataset.k = html;
      clear(r.bannerText);
      if (title) r.bannerText.append(h('b', null, title));
      r.bannerText.append(text);
    }
    r.banner.classList.toggle('done', done);

    // Water-all and harvest-all buttons.
    const now = app.now();
    let thirsty = 0;
    let ripe = 0;
    for (const p of s.plots) {
      if (!p) continue;
      const info = G.plotInfo(p, now);
      if (info.mature) ripe++;
      else if (info.thirsty) thirsty++;
    }
    const key = `${thirsty}|${ripe}|${s.settings.lang}`;
    if (r.actions.dataset.k !== key) {
      r.actions.dataset.k = key;
      clear(r.actions);
      if (ripe) r.actions.append(h('button', { class: 'pill-act harvest', onClick: () => app.harvestAll() }, h('span', { class: 'ico' }, '🧺'), t('harvestAll', { n: ripe })));
      if (thirsty) r.actions.append(h('button', { class: 'pill-act', onClick: () => app.waterAll() }, h('span', { class: 'ico' }, '💧'), t('waterAll', { n: thirsty })));
    }
  }
}
