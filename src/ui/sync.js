// The "play on several devices" screen: family code (cloud) and save code (copy by hand).
import { h } from './dom.js';
import { icon } from './icons.js';
import { avatarImg } from './avatars.js';
import { t, fmtNum } from '../i18n.js';
import { openModal, toast } from './overlay.js';
import * as C from '../game/cloud.js';
import { sfx } from '../audio.js';

// Like el.append, but skips the null/false of optional parts.
const add = (el, ...kids) => el.append(...kids.filter((k) => k != null && k !== false));

export function openSync(app, start = null) {
  const cloud = app.cloud;
  let mode = start; // null | enter | join | paste | load | stop
  let codeText = '';
  let error = '';
  let busy = false;
  let remote = null; // { code, farm } while asking to join
  let saveText = '';
  let pasteText = '';
  let pasted = null;
  let statusEl = null;

  const go = (next, api) => {
    mode = next;
    error = '';
    api.refresh();
  };

  const statusText = () => {
    if (cloud.status === 'syncing') return [icon('hourglass'), ' ', t('syncing')];
    if (cloud.status === 'offline') return [icon('offline'), ' ', t('syncOffline')];
    if (cloud.status === 'error') return [icon('warning'), ' ', t('syncError')];
    if (cloud.lastOk) return [icon('check'), ' ', t('syncOk', { time: new Date(cloud.lastOk).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) })];
    return [icon('cloud'), ' ', t('syncIdle')];
  };

  const summary = (label, farm) => h('div', { class: 'farm-card' },
    h('div', { class: 'muted' }, label),
    h('b', null, avatarImg(farm.profile?.avatar || '🧑‍🌾', 'i'), ` ${farm.profile?.name || t('defaultName')}`),
    h('div', null, t('farmSummary', { level: farm.level }), ' · ', icon('earth'), ` ${fmtNum(farm.coins || 0)}`));

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast([icon('copy'), ' ', t('copied')], 'good');
    } catch {
      toast(t('copyFailed'), 'warn');
    }
  };

  const familySection = (api) => {
    const code = C.getCode();
    const box = h('div', { class: 'sync-box' }, h('div', { class: 'section-title' }, icon('cloud'), ' ', t('familyCode')));

    if (code && mode === 'stop') {
      add(box, h('p', null, t('stopConfirm')),
        h('div', { class: 'row-btns' },
          h('button', { class: 'btn berry small', onClick: () => {
            cloud.stop();
            go(null, api);
          } }, t('stopYes')),
          h('button', { class: 'btn ghost small', onClick: () => go(null, api) }, t('cancel'))));
      return box;
    }

    if (code) {
      statusEl = h('p', { class: 'muted center sync-status' }, statusText());
      add(box, 
        h('div', { class: 'muted' }, t('yourCode')),
        h('div', { class: 'sync-code' }, C.showCode(code)),
        h('div', { class: 'row-btns' },
          h('button', { class: 'btn honey small', onClick: () => copy(C.showCode(code)) }, icon('copy'), t('copy')),
          h('button', { class: 'btn ghost small', onClick: () => cloud.sync() }, icon('sync'), t('syncNow'))),
        statusEl,
        h('p', { class: 'muted' }, t('codeHint')),
        h('div', { class: 'row-btns' }, h('button', { class: 'btn ghost small', onClick: () => go('stop', api) }, t('stopSync'))));
      return box;
    }

    if (mode === 'join' && remote) {
      add(box, 
        h('p', null, t('joinConfirm')),
        h('div', { class: 'farm-cards' }, summary(t('thisDevice'), app.state), h('span', { class: 'arrow' }, '→'), summary(t('onCode'), remote.farm.save)),
        h('div', { class: 'row-btns' },
          h('button', { class: 'btn berry small', onClick: () => cloud.join(remote.code, remote.farm) }, icon('cloud'), t('useThisFarm')),
          h('button', { class: 'btn ghost small', onClick: () => go(null, api) }, t('cancel'))));
      return box;
    }

    if (mode === 'enter') {
      const input = h('input', {
        type: 'text', id: 'family-code', value: codeText, placeholder: 'XXXX-XXXX-XXXX', maxlength: '20',
        autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false', class: 'code-input',
      });
      input.addEventListener('input', () => {
        codeText = input.value;
      });
      const connect = async () => {
        const parsed = C.parseCode(codeText);
        if (!parsed) {
          error = t('codeBad');
          api.refresh();
          return;
        }
        busy = true;
        error = '';
        api.refresh();
        try {
          const farm = await C.fetchFarm(parsed);
          if (!farm) error = t('codeMissing');
          else {
            remote = { code: parsed, farm };
            mode = 'join';
          }
        } catch {
          error = t('netError');
        }
        busy = false;
        api.refresh();
      };
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') connect();
      });
      add(box, 
        h('div', { class: 'field' }, h('label', { for: 'family-code' }, t('codeInputLabel')), input),
        error ? h('p', { class: 'danger' }, error) : null,
        h('div', { class: 'row-btns' },
          h('button', { class: 'btn berry small', disabled: busy, onClick: connect }, icon(busy ? 'hourglass' : 'cloud'), t('connect')),
          h('button', { class: 'btn ghost small', onClick: () => go(null, api) }, t('cancel'))));
      setTimeout(() => input.focus(), 50);
      return box;
    }

    add(box, 
      h('p', null, t('familyIntro')),
      error ? h('p', { class: 'danger' }, error) : null,
      h('div', { class: 'row-btns' },
        h('button', { class: 'btn berry small', disabled: busy, onClick: async () => {
          busy = true;
          error = '';
          api.refresh();
          try {
            await cloud.create();
            sfx.coin();
          } catch {
            error = t('netError');
          }
          busy = false;
          api.refresh();
        } }, icon(busy ? 'hourglass' : 'mutation'), t('createCode')),
        h('button', { class: 'btn honey small', onClick: () => go('enter', api) }, icon('key'), t('enterCode'))));
    return box;
  };

  const saveCodeSection = (api) => {
    const box = h('div', { class: 'sync-box' }, h('div', { class: 'section-title' }, icon('box'), ' ', t('saveCode')));

    if (mode === 'load' && pasted) {
      add(box, 
        h('p', null, t('loadConfirm'), cloud.active ? ` ${t('loadConfirmCloud')}` : ''),
        h('div', { class: 'farm-cards' }, summary(t('thisDevice'), app.state), h('span', { class: 'arrow' }, '→'), summary(t('fromSaveCode'), pasted)),
        h('div', { class: 'row-btns' },
          h('button', { class: 'btn berry small', onClick: () => cloud.loadSaveCode(pasted) }, icon('load'), t('loadSave')),
          h('button', { class: 'btn ghost small', onClick: () => go(null, api) }, t('cancel'))));
      return box;
    }

    if (mode === 'paste') {
      const area = h('textarea', { class: 'code-area', rows: 4, placeholder: 'NT1.…', spellcheck: 'false', autocomplete: 'off' });
      area.value = pasteText;
      area.addEventListener('input', () => {
        pasteText = area.value;
      });
      add(box, 
        area,
        error ? h('p', { class: 'danger' }, error) : null,
        h('div', { class: 'row-btns' },
          h('button', { class: 'btn berry small', onClick: async () => {
            try {
              pasted = await C.importSave(pasteText);
              go('load', api);
            } catch {
              error = t('saveCodeBad');
              api.refresh();
            }
          } }, icon('load'), t('loadSave')),
          h('button', { class: 'btn ghost small', onClick: () => go(null, api) }, t('cancel'))));
      setTimeout(() => area.focus(), 50);
      return box;
    }

    const makeCode = async () => {
      app.save(true);
      saveText = await C.exportSave(app.state);
      api.refresh();
      return saveText;
    };
    add(box, 
      h('p', null, t('saveCodeIntro')),
      saveText ? h('textarea', { class: 'code-area', rows: 3, readonly: true, onClick: (e) => e.currentTarget.select() }, saveText) : null,
      h('div', { class: 'row-btns' },
        h('button', { class: 'btn honey small', onClick: async () => copy(await makeCode()) }, icon('copy'), t('copySaveCode')),
        navigator.share ? h('button', { class: 'btn ghost small', onClick: async () => {
          const text = await makeCode();
          navigator.share({ title: t('gameName'), text }).catch(() => {});
        } }, icon('share'), t('shareSaveCode')) : null,
        h('button', { class: 'btn ghost small', onClick: () => go('paste', api) }, icon('load'), t('pasteSaveCode'))));
    return box;
  };

  openModal({
    title: t('syncTitle'),
    size: 'narrow',
    static: true,
    onClose: () => {
      cloud.onChange = null;
    },
    render(body, api) {
      statusEl = null;
      if (C.cloudReady()) body.append(familySection(api));
      body.append(saveCodeSection(api));
      cloud.onChange = () => {
        if (statusEl) statusEl.replaceChildren(...statusText());
      };
    },
  });
}
