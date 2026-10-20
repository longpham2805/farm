import { h, rewardChips } from './dom.js';
import { t, fmtNum, getLang } from '../i18n.js';
import * as G from '../game/logic.js';
import { CHAPTERS, DAILY } from '../data/quests.js';
import { openModal, toast } from './overlay.js';
import { rewardLine } from './book.js';
import { icon } from './icons.js';
import { sfx } from '../audio.js';

export const taskText = (task) => t(`q_${task.kind}`, { n: fmtNum(task.n) });

export function openQuests(app, startTab = 'main') {
  let tab = startTab;
  openModal({
    title: t('questsTitle'),
    size: 'mid',
    render(body, api) {
      const s = app.state;
      body.append(h('div', { class: 'tabs' },
        [['main', t('mainQuests')], ['daily', t('dailyQuests')]].map(([id, label]) => h('button', { class: `tab${tab === id ? ' on' : ''}`, onClick: () => {
          tab = id;
          api.refresh();
        } }, label))));

      const row = (task, daily) => {
        const progress = G.taskProgress(s, task, daily);
        const claimed = daily ? s.daily.claimed[task.id] : s.quests.claimed[task.id];
        const done = progress >= task.n;
        let btn;
        if (claimed) btn = h('span', { class: 'muted' }, icon('check'));
        else if (done) {
          btn = h('button', { class: 'btn small', onClick: () => {
            const r = daily ? G.claimDaily(s, task.id) : G.claimTask(s, task.id);
            if (!r.ok) return;
            sfx.coin();
            toast([icon('gift'), ' ', t('youGot'), ': ', rewardLine(r.reward)], 'good');
            if (r.chapterDone) {
              sfx.levelUp();
              setTimeout(() => toast([icon('quests'), ' ', t('chapterDone')], 'good'), 500);
            }
            app.handleChests(r.chests);
            app.refresh();
          } }, t('claim'));
        } else {
          btn = h('button', { class: 'btn small honey', onClick: () => app.go(task.go === 'farm' ? null : task.go) }, t('goTo'));
        }
        return h('div', { class: `task${claimed ? ' claimed' : ''}` },
          h('div', { class: 'tt' }, taskText(task), h('span', { class: 'muted num' }, `  ${fmtNum(Math.min(progress, task.n))}/${fmtNum(task.n)}`),
            h('div', { class: 'bar' }, h('i', { style: { width: `${Math.min(100, (progress / task.n) * 100)}%` } }))),
          h('div', { class: 'rewards' }, rewardChips(task.reward)),
          btn);
      };

      if (tab === 'main') {
        const chapter = G.currentChapter(s);
        if (!chapter) {
          body.append(h('div', { class: 'empty-note' }, h('span', { class: 'big' }, icon('trophy')), t('allQuestsDone')));
          return;
        }
        const idx = CHAPTERS.indexOf(chapter);
        body.append(h('div', { class: 'chapter' }, h('small', null, t('chapter', { n: idx + 1 })), h('b', null, chapter.title[getLang()])));
        chapter.tasks.forEach((task) => body.append(row(task, false)));
      } else {
        body.append(h('p', { class: 'muted', style: { margin: '0 0 8px' } }, icon('sunrise'), ' ', t('dailyReset')));
        DAILY.forEach((task) => body.append(row(task, true)));
      }
    },
  });
}
