// Moving the farm between devices without our own server.
//  · Family code: the save lives in one Firestore document named after a random code,
//    read and written through Firestore's REST API. Whoever knows the code shares the farm.
//  · Save code: the whole save packed into a line of text to copy to another device by hand.
import { CLOUD, SAVE_KEY } from '../config.js';

const CODE_KEY = 'nong-trai-sync-code';
const META_KEY = 'nong-trai-sync-meta';
// No 0/O or 1/I, so a code read aloud or copied by hand cannot be mistyped that way.
const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const CODE_LEN = 12;

export const cloudReady = () => !!(CLOUD.projectId && CLOUD.apiKey);

// ── Family code ─────────────────────────────────────────────

export function newCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(CODE_LEN));
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
}

/** "k7pm 3qxd-9hwt" → "K7PM3QXD9HWT", or null when it cannot be a code. */
export function parseCode(text) {
  const code = String(text || '').toUpperCase().replace(/[^0-9A-Z]/g, '');
  return code.length === CODE_LEN && [...code].every((c) => ALPHABET.includes(c)) ? code : null;
}

export const showCode = (code) => code.match(/.{4}/g).join('-');

export function getCode() {
  try {
    return parseCode(localStorage.getItem(CODE_KEY));
  } catch {
    return null;
  }
}

export function setCode(code) {
  try {
    if (code) localStorage.setItem(CODE_KEY, code);
    else localStorage.removeItem(CODE_KEY);
  } catch {
    // storage blocked: sync just stays off
  }
}

/** What this device last agreed with the cloud: base = cloud updateTime, hash = farm at that moment. */
export function getMeta() {
  try {
    return JSON.parse(localStorage.getItem(META_KEY)) || {};
  } catch {
    return {};
  }
}

export function setMeta(meta) {
  try {
    if (meta) localStorage.setItem(META_KEY, JSON.stringify(meta));
    else localStorage.removeItem(META_KEY);
  } catch {
    // ignore
  }
}

function docUrl(code, params = '') {
  const base = `${CLOUD.endpoint || 'https://firestore.googleapis.com'}/v1/projects/${CLOUD.projectId}/databases/(default)/documents/farms/${code}`;
  return `${base}?key=${encodeURIComponent(CLOUD.apiKey)}${params}`;
}

class CloudError extends Error {
  constructor(kind, message) {
    super(message || kind);
    this.kind = kind; // 'conflict' | 'offline' | 'server'
  }
}

async function request(url, init = {}, timeout = 8000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } catch (err) {
    throw new CloudError('offline', err.message);
  } finally {
    clearTimeout(timer);
  }
}

/** The farm stored under a code: { save, updateTime }, or null when nothing is there yet. */
export async function fetchFarm(code, timeout) {
  const res = await request(docUrl(code), {}, timeout);
  if (res.status === 404) return null;
  if (!res.ok) throw new CloudError('server', `HTTP ${res.status}`);
  const doc = await res.json();
  return { save: JSON.parse(doc.fields.save.stringValue), updateTime: doc.updateTime };
}

/**
 * Writes the farm only if the cloud still holds the version we last saw (base), or nothing when
 * base is null. Someone else saving in between gives a 'conflict' error instead of losing their play.
 */
export async function pushFarm(code, state, base, { keepalive = false } = {}) {
  const pre = base ? `&currentDocument.updateTime=${encodeURIComponent(base)}` : '&currentDocument.exists=false';
  const body = JSON.stringify({
    fields: {
      save: { stringValue: JSON.stringify(state) },
      updatedAt: { integerValue: String(Date.now()) },
      v: { integerValue: '1' },
    },
  });
  const res = await request(docUrl(code, pre), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: keepalive && body.length < 60000,
  });
  if (res.ok) return (await res.json()).updateTime;
  if ([400, 404, 409].includes(res.status)) {
    const err = await res.json().catch(() => ({}));
    const status = err.error?.status;
    if (['FAILED_PRECONDITION', 'ALREADY_EXISTS', 'NOT_FOUND', 'ABORTED'].includes(status)) throw new CloudError('conflict', status);
  }
  throw new CloudError('server', `HTTP ${res.status}`);
}

// ── Comparing farms ─────────────────────────────────────────

/** Fingerprint of the farm, ignoring what changes on its own (last-seen time, this device's graphics). */
export function farmHash(state) {
  const json = JSON.stringify({ ...state, lastSeen: 0, settings: { ...state.settings, quality: '' } });
  let h = 0x811c9dc5;
  for (let i = 0; i < json.length; i++) {
    h ^= json.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

/** How much has been played: the action counters only ever go up. */
export function progress(state) {
  const actions = Object.values(state.stats || {}).reduce((n, v) => n + (Number(v) || 0), 0);
  return (state.level || 1) * 100000 + actions;
}

/** Puts a farm from elsewhere into this device's storage, keeping this device's graphics setting. */
export function storeFarm(save) {
  let quality = null;
  try {
    quality = JSON.parse(localStorage.getItem(SAVE_KEY))?.settings?.quality;
  } catch {
    // no local farm
  }
  const next = { ...save, settings: { ...save.settings, ...(quality ? { quality } : {}) } };
  localStorage.setItem(SAVE_KEY, JSON.stringify(next));
}

/**
 * Before the game starts: if another device played since we last synced, load its farm.
 * Waits at most a few seconds so the game still opens offline.
 */
export async function pullOnStart() {
  const code = cloudReady() && getCode();
  if (!code) return;
  const meta = getMeta();
  if (meta.force) return; // a save code was just loaded here; it goes up, not down
  try {
    const remote = await fetchFarm(code, 3000);
    if (!remote || remote.updateTime === meta.base) return;
    let local = null;
    try {
      local = JSON.parse(localStorage.getItem(SAVE_KEY));
    } catch {
      // unreadable: take the cloud farm
    }
    const localChanged = local && meta.pending && farmHash(local) !== meta.hash;
    if (localChanged && progress(local) > progress(remote.save)) return; // ours wins; it is pushed once the game runs
    storeFarm(remote.save);
    setMeta({ base: remote.updateTime, rebase: true, toast: 'cloudLoaded' });
  } catch {
    // offline: play what is here and sync later
  }
}

// ── Save code ───────────────────────────────────────────────

const toB64 = (bytes) => {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const fromB64 = (text) => {
  const s = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
};

async function pipe(bytes, stream) {
  return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer());
}

/** The farm as one line of text: "NT1." + gzip + base64, or "NT0." + base64 where gzip is missing. */
export async function exportSave(state) {
  const raw = new TextEncoder().encode(JSON.stringify(state));
  if (typeof CompressionStream === 'function') return `NT1.${toB64(await pipe(raw, new CompressionStream('gzip')))}`;
  return `NT0.${toB64(raw)}`;
}

/** Reads a save code back into a farm, or throws when the text is not one. */
export async function importSave(text) {
  const m = String(text || '').replace(/\s+/g, '').match(/^NT([01])\.([A-Za-z0-9_-]+)$/);
  if (!m) throw new Error('bad');
  let bytes = fromB64(m[2]);
  if (m[1] === '1') bytes = await pipe(bytes, new DecompressionStream('gzip'));
  const save = JSON.parse(new TextDecoder().decode(bytes));
  if (!save || !Array.isArray(save.plots) || typeof save.level !== 'number') throw new Error('bad');
  return save;
}
