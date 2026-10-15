// A pine as the reference design draws them: a narrow cone of stacked tiers on a short brown trunk. Each tier is a
// skirt of broad panels of needles, each folded down its middle so one half takes the light and the other does not,
// their tips drooping out and down over the tier below, darker up under the tier above. Flat facets, as the design's
// low-poly trees.
import * as THREE from 'three';
import { seeded } from '../../util.js';
import { TAU, MATERIAL, mesher, OUT, DOWN, trunk } from './parts.js';

/** Needles: deep in the shade under a tier, mid on its panels, light at their tips; the bark. */
export const PINE = { shade: '#123f24', dark: '#1f6232', mid: '#2f8a45', light: '#5cae4c', bark: '#a06c40', barkDark: '#6b4426' };

// Its trunk (see WOOD in parts.js): straighter and plainer than a leafy tree's, on four short roots.
const PINE_WOOD = { trunk: [0.045, 0.028], roots: 4, flare: 1.1, kink: 0.04, twist: 0.08, soft: 0, ridges: 0.06 };

/**
 * One tier: K panels round the trunk, their tips at radius R and height y (drooping a little below it), the notches
 * between them higher and further in, all rising to a point `h` above y, inside the tier above. `light` is how lit
 * this tier is as a whole (the lower ones a little darker).
 */
function tier(m, rand, c, { y, h, R, K, light }) {
  const turn = rand() * TAU;
  const at = (a, r, yy) => new THREE.Vector3(Math.cos(a) * r, yy, Math.sin(a) * r);
  const apex = new THREE.Vector3(0, y + h, 0);
  const ridge = [];
  const valley = [];
  const tip = [];
  const notch = [];
  const band = Math.min(h, R * 1.3);
  const midY = y + h * 0.42;
  const midR = R * 0.58;
  for (let k = 0; k < K; k++) {
    const a = turn + (k / K) * TAU + (rand() - 0.5) * 0.2;
    const b = turn + ((k + 0.5) / K) * TAU + (rand() - 0.5) * 0.2;
    const j = 1 + (rand() - 0.5) * 0.12;
    ridge.push(at(a, midR * 1.12 * j, midY));
    valley.push(at(b, midR * 0.92, midY + band * 0.03));
    tip.push(at(a, R * j, y - band * (0.04 + rand() * 0.06)));
    notch.push(at(b, R * 0.88, y + band * 0.07));
  }
  const under = new THREE.Vector3(0, y + band * 0.4, 0);
  const tone = (from, to, f) => from.clone().lerp(to, f).multiplyScalar(light);
  const C = { apex: tone(c.shade, c.dark, 0.3), ridge: tone(c.dark, c.mid, 0.8), valley: tone(c.shade, c.dark, 0.9), tip: tone(c.mid, c.light, 0.85), notch: tone(c.dark, c.mid, 0.5), under: c.shade };
  for (let k = 0; k < K; k++) {
    const k1 = (k + 1) % K;
    m.tri(apex, ridge[k], valley[k], C.apex, C.ridge, C.valley, OUT);
    m.tri(apex, valley[k], ridge[k1], C.apex, C.valley, C.ridge, OUT);
    m.tri(ridge[k], valley[k], notch[k], C.ridge, C.valley, C.notch, OUT);
    m.tri(ridge[k], notch[k], tip[k], C.ridge, C.notch, C.tip, OUT);
    m.tri(valley[k], ridge[k1], tip[k1], C.valley, C.ridge, C.tip, OUT);
    m.tri(valley[k], tip[k1], notch[k], C.valley, C.tip, C.notch, OUT);
    // Underneath, dark, seen through the notches and from below.
    m.tri(tip[k], notch[k], under, C.under, C.under, C.under, DOWN);
    m.tri(notch[k], tip[k1], under, C.under, C.under, C.under, DOWN);
  }
}

/**
 * A pine `height` tall (world units), laid out by `seed`: five or six tiers, the crown half to two thirds as wide as
 * it is tall, its lowest tier a quarter of the height up, so the trunk shows under it from the camera. Returns a mesh
 * standing on its foot at the origin.
 */
export function pine(seed = 1, height = 1.4, colors = PINE) {
  const rand = seeded(seed);
  const c = Object.fromEntries(Object.entries(colors).map(([k, v]) => [k, new THREE.Color(v)]));
  // A little lighter or darker, a little yellower or bluer, from tree to tree.
  const hue = (rand() - 0.5) * 0.025;
  const value = 1 + (rand() - 0.5) * 0.12;
  for (const k of ['shade', 'dark', 'mid', 'light']) c[k].offsetHSL(hue, 0, 0).multiplyScalar(value);
  const m = mesher();
  const n = rand() < 0.5 ? 5 : 6;
  const foot = 0.24 + rand() * 0.04;
  const topH = 0.24;
  const Rmax = 0.26 + rand() * 0.07;
  // The trunk on a few roots flaring into the ground, laid out by random numbers of its own so the tiers stay as
  // they were.
  const grain = seeded(seed * 7919 + 1);
  trunk(m, grain, new THREE.Vector3((grain() - 0.5) * 0.03, foot + 0.25, (grain() - 0.5) * 0.03), { dark: c.barkDark, light: c.bark }, PINE_WOOD);
  // The bands of the tiers below the top one, a little deeper low down.
  const weights = Array.from({ length: n - 1 }, (_, i) => 1 - 0.3 * (i / Math.max(1, n - 2)));
  const total = weights.reduce((s, w) => s + w, 0);
  let y = foot;
  for (let i = 0; i < n; i++) {
    const top = i === n - 1;
    const band = top ? 1 - y : ((1 - foot - topH) * weights[i]) / total;
    const R = Rmax * ((1 - y) / (1 - foot)) ** 0.92 * (top ? 1.1 : 1);
    tier(m, rand, c, { y, h: top ? band : band * 1.7, R, K: top ? 5 : i < 2 ? 7 : 6, light: 0.92 + 0.08 * (i / (n - 1)) });
    y += band;
  }
  const g = m.geometry();
  g.scale(height, height, height);
  const mesh = new THREE.Mesh(g, MATERIAL);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.height = height;
  return mesh;
}
