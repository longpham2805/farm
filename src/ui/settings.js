import { h } from './dom.js';
import { icon } from './icons.js';
import { avatarImg, PLAYER_AVATARS as AVATARS } from './avatars.js';
import { t } from '../i18n.js';
import { openModal } from './overlay.js';
import { openSync } from './sync.js';
import { cloudReady } from '../game/cloud.js';


function nameAndAvatar(app, body, compact = false) {
  const s = app.state;
  const input = h('input', { type: 'text', id: 'farmer-name', maxlength: '16', value: s.profile.name, placeholder: t('defaultName'), autocomplete: 'off' });
  input.addEventListener('input', () => {
    s.profile.name = input.value.trim().slice(0, 16);
    app.save();
    app.hud.update();
  });
  const avatars = h('div', { class: `avatars${compact ? ' compact' : ''}` }, AVATARS.map((a) => h('button', {
    class: s.profile.avatar === a ? 'on' : '',
    'aria-label': a,
    onClick: (e) => {
      s.profile.avatar = a;
      for (const b of e.currentTarget.parentNode.children) b.classList.toggle('on', b === e.currentTarget);
      app.save();
      app.hud.update();
    },
  }, avatarImg(a))));
  const fields = [
    h('div', { class: 'field' }, h('label', { for: 'farmer-name' }, t('farmerName')), input),
    h('div', { class: 'field' }, h('label', null, t('avatar')), avatars),
  ];
  body.append(...(compact ? [h('div', { class: 'welcome-row' }, fields)] : fields));
}

const seg = (options, value, onPick) => h('div', { class: 'seg' }, options.map(([v, label]) =>
  h('button', { class: v === value ? 'on' : '', onClick: () => onPick(v) }, label)));

export function openSettings(app) {
  let confirmReset = false;
  openModal({
    title: t('settingsTitle'),
    size: 'narrow',
    render(body, api) {
      const s = app.state.settings;
      nameAndAvatar(app, body);
      const set = (key) => (v) => {
        app.setSetting(key, v);
        api.refresh();
      };
      body.append(
        h('div', { class: 'field' }, h('label', null, t('language')), seg([['vi', 'Tiếng Việt'], ['en', 'English']], s.lang, set('lang'))),
        h('div', { class: 'field' }, h('label', null, t('sound')), seg([[true, t('on')], [false, t('off')]], s.sound, set('sound'))),
        h('div', { class: 'field' }, h('label', null, t('music')), seg([[true, t('on')], [false, t('off')]], s.music, set('music'))),
        h('div', { class: 'field' }, h('label', null, t('graphics')), seg([['high', t('gfxHigh')], ['low', t('gfxLow')]], s.quality, set('quality'))),
        installField(app, api),
        h('div', { class: 'field' }, h('label', null, icon('cloud'), ' ', t('syncField')),
          h('div', null, h('button', { class: 'btn honey small', onClick: () => openSync(app) }, icon('cloud'), t('syncOpen')))),
        h('p', { class: 'muted' }, icon('save'), ' ', t('saveNote')),
        confirmReset
          ? h('div', { class: 'center' }, h('p', { class: 'danger' }, t('resetConfirm')),
            h('div', { class: 'row-btns' },
              h('button', { class: 'btn red small', onClick: () => app.resetGame() }, t('resetYes')),
              h('button', { class: 'btn ghost small', onClick: () => {
                confirmReset = false;
                api.refresh();
              } }, t('cancel'))))
          : h('div', { class: 'row-btns' }, h('button', { class: 'btn ghost small', onClick: () => {
            confirmReset = true;
            api.refresh();
          } }, icon('sync'), t('resetGame'))),
        h('p', { class: 'credits center' }, t('credits')),
      );
    },
  });
}

function installField(app, api) {
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  let body;
  if (standalone) body = h('p', { class: 'muted', style: { margin: 0 } }, icon('check'), ' ', t('installed'));
  else if (app.installPrompt) {
    body = h('div', null, h('button', { class: 'btn honey small', onClick: async () => {
      const prompt = app.installPrompt;
      app.installPrompt = null;
      prompt.prompt();
      await prompt.userChoice.catch(() => null);
      api.refresh();
    } }, icon('install'), t('installBtn')));
  } else body = h('p', { class: 'muted', style: { margin: 0 } }, ios ? t('installIos') : t('installOther'));
  return h('div', { class: 'field' }, h('label', null, icon('install'), ' ', t('installTitle')), body);
}

export function openWelcome(app) {
  openModal({
    title: t('gameName'),
    size: 'mid',
    dismissable: false,
    render(body, api) {
      body.append(
        h('h2', { class: 'center', style: { fontFamily: 'var(--font-display)', margin: '0' } }, icon('cloud'), ' ', t('welcomeTitle'), ' ', icon('cloud')),
        h('p', { class: 'center', style: { margin: '0 0 4px' } }, t('welcomeText')),
        h('div', { class: 'how' },
          h('div', null, h('b', null, icon('seeds')), t('how1')),
          h('div', null, h('b', null, icon('water')), t('how2')),
          h('div', null, h('b', null, icon('basket')), t('how3')),
          h('div', null, h('b', null, icon('mutation')), t('how4'))),
      );
      nameAndAvatar(app, body, true);
      body.append(
        h('div', { class: 'row-btns', style: { alignItems: 'center' } },
          seg([['vi', 'Tiếng Việt'], ['en', 'English']], app.state.settings.lang, (v) => {
            app.setSetting('lang', v);
            api.refresh();
          }),
          h('button', { class: 'btn berry', onClick: () => {
          app.state.seenIntro = true;
          api.close();
          app.refresh();
          app.openSeeds();
        } }, icon('seeds'), t('start'))),
        h('div', { class: 'center' }, h('button', { class: 'link-btn', onClick: () => openSync(app, cloudReady() ? 'enter' : 'paste') }, icon('cloud'), ' ', t('haveCode'))));
    },
  });
}
