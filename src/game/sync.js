// Keeps the farm in step with the family code while the game runs.
//  · Changes made by the player go up a few seconds later, and right away when the game is hidden.
//  · The cloud is checked when the game comes back to the front and every minute while it is open.
//  · If another device saved in between, the farm with more play on it wins.
// Changes that happen on their own (plants ripening on a device nobody touches) never go up,
// so a tablet left open cannot overwrite what was played on the phone.
import * as C from './cloud.js';

const PUSH_DELAY = 5000;
const POLL_EVERY = 60000;

export class CloudSync {
  constructor(app) {
    this.app = app;
    this.status = 'idle'; // idle | syncing | ok | offline | error
    this.lastOk = 0;
    this.onChange = null;
    this.touched = false;
    this.timer = null;
    this.running = false;
    this.again = false;

    const meta = C.getMeta();
    if (meta.rebase) {
      // A farm from the cloud was just loaded: what the game made of it is the synced version.
      C.setMeta({ base: meta.base, hash: C.farmHash(app.state) });
      this.status = 'ok';
      this.lastOk = Date.now();
    }
    this.startToast = meta.toast || null;

    const touch = () => {
      this.touched = true;
    };
    window.addEventListener('pointerdown', touch, { passive: true });
    window.addEventListener('keydown', touch);
    document.addEventListener('visibilitychange', () => (document.hidden ? this.flush() : this.sync()));
    setInterval(() => {
      if (!document.hidden) this.sync();
    }, POLL_EVERY);
    if (this.active) setTimeout(() => this.sync(), 1500);
  }

  get active() {
    return C.cloudReady() && !!C.getCode();
  }

  setStatus(status) {
    this.status = status;
    if (status === 'ok') this.lastOk = Date.now();
    if (this.onChange) this.onChange();
  }

  /** Called on every save: remembers that the player changed something, and sends it soon. */
  changed() {
    if (!this.active) return;
    this.markPending();
    if (!this.timer) {
      this.timer = setTimeout(() => {
        this.timer = null;
        this.sync({ pull: false });
      }, PUSH_DELAY);
    }
  }

  markPending() {
    if (!this.touched) return;
    const meta = C.getMeta();
    if (!meta.pending) C.setMeta({ ...meta, pending: true });
  }

  dirty(meta = C.getMeta()) {
    return !!meta.force || (!!meta.pending && C.farmHash(this.app.state) !== meta.hash);
  }

  async sync({ pull = true } = {}) {
    if (!this.active || this.app.reloading) return;
    if (this.running) {
      this.again = true;
      return;
    }
    this.running = true;
    this.setStatus('syncing');
    try {
      await this.run(pull);
      if (!this.app.reloading) this.setStatus('ok');
    } catch (err) {
      this.setStatus(err.kind === 'offline' ? 'offline' : 'error');
    } finally {
      this.running = false;
      if (this.again) {
        this.again = false;
        this.sync();
      }
    }
  }

  async run(pull) {
    const code = C.getCode();
    const meta = C.getMeta();
    const state = this.app.state;
    const dirty = this.dirty(meta);
    let base = meta.base || null;
    if (pull || !base || meta.force) {
      const remote = await C.fetchFarm(code);
      if (remote && remote.updateTime !== base) {
        if (!meta.force && (!dirty || C.progress(remote.save) > C.progress(state))) {
          this.adopt(remote);
          return;
        }
        base = remote.updateTime; // ours has more play on it: write over it
      } else if (!remote) {
        base = null;
      }
    }
    if (!dirty && base) return;
    const hash = C.farmHash(state);
    try {
      const updateTime = await C.pushFarm(code, state, base);
      C.setMeta({ base: updateTime, hash });
      this.touched = false;
    } catch (err) {
      // Someone saved since we last looked: look again and decide.
      if (err.kind === 'conflict' && !pull) return this.run(true);
      throw err;
    }
  }

  adopt(remote) {
    C.setMeta({ base: remote.updateTime, rebase: true, toast: 'cloudLoaded' });
    this.app.replaceFarm(remote.save);
  }

  /** The game is going to the background: send what was played now, it may not come back. */
  flush() {
    if (!this.active || this.app.reloading) return;
    clearTimeout(this.timer);
    this.timer = null;
    this.markPending();
    const meta = C.getMeta();
    if (!this.dirty(meta) || !meta.base || meta.force) return;
    const hash = C.farmHash(this.app.state);
    C.pushFarm(C.getCode(), this.app.state, meta.base, { keepalive: true })
      .then((updateTime) => {
        C.setMeta({ base: updateTime, hash });
        this.touched = false;
      })
      .catch(() => {});
  }

  // ── Used by the sync screen ──────────────────────────────

  /** Starts a new family code holding this device's farm. */
  async create() {
    const code = C.newCode();
    const hash = C.farmHash(this.app.state);
    const updateTime = await C.pushFarm(code, this.app.state, null);
    C.setCode(code);
    C.setMeta({ base: updateTime, hash });
    this.touched = false;
    this.setStatus('ok');
    return code;
  }

  /** Joins an existing code: this device's farm is replaced by the one in the cloud. */
  join(code, remote) {
    C.setCode(code);
    C.setMeta({ base: remote.updateTime, rebase: true, toast: 'cloudJoined' });
    this.app.replaceFarm(remote.save);
  }

  stop() {
    C.setCode(null);
    C.setMeta(null);
    this.setStatus('idle');
  }

  /** A save code was loaded: it replaces the farm here and, with a family code, in the cloud too. */
  loadSaveCode(save) {
    if (this.active) C.setMeta({ ...C.getMeta(), force: true });
    this.app.replaceFarm(save);
  }
}
