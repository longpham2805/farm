let rngFn = Math.random;

/** Random number in [0, 1). Tests can swap the generator with setRng(). */
export const rng = () => rngFn();
export function setRng(fn) {
  rngFn = fn || Math.random;
}

/** Small seeded generator (mulberry32) for tests and repeatable layouts. */
export function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const randInt = (min, max) => min + Math.floor(rng() * (max - min + 1));
export const pick = (arr) => arr[Math.floor(rng() * arr.length)];

export function pickWeighted(entries) {
  // entries: [[value, weight], ...]
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = rng() * total;
  for (const [value, w] of entries) {
    r -= w;
    if (r < 0) return value;
  }
  return entries[entries.length - 1][0];
}

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function dayKey(t) {
  const d = new Date(t);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}
