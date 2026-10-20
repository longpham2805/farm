// Water lilies as the reference design draws them: a raft of them on the river across from the front bank, another in
// the main fall's pool. Round pads lying on the water, overlapping, each with a notch cut in to its middle and its rim
// turned up a little, in broad flat facets of deep to light green, a dark edge where they meet the water; and among
// them pink flowers, cups of pointed petals in three rings round a yellow heart, and now and then a bud, still closed,
// standing up out of the water on a short stalk.
import * as THREE from 'three';
import { seeded } from '../../util.js';
import { TAU, MATERIAL, SOFT_MATERIAL, glowing, twoSided, mesher, palette, tube } from './parts.js';
import { head } from './flowers.js';

/**
 * Colours: the pads, deep to light, and their edge; the flowers' petals at the tip and at the foot, their heart and its
 * top, and the green of their cups and stalks, dark and in shade.
 */
export const LILIES = {
  padDark: '#2e6c2a', padMid: '#48a232', padLight: '#7cc444', edge: '#245a1e',
  petal: '#ff9ac6', petalFoot: '#e0508e', heart: '#f0a818', heartTop: '#ffe04a', dark: '#2f6a22', shade: '#1e4a16',
};
// Each flower takes one of these, [the petals' tip, their foot]: pink, a deeper pink, a pale one, a lilac.
const MIX = [['#ff9ac6', '#e0508e'], ['#ff86b8', '#d4447e'], ['#ffd6e8', '#f084b6'], ['#e8b8f0', '#b46ac8']];

/**
 * How a raft grows, in units of its width across the screen: how many pads ([least, most]) and how big (their radius,
 * [least, most], the middle ones the biggest), how far their middles spread across the screen and towards the camera,
 * how wide the notch is (radians, either side), how far the rim turns up ([least, most]); how many flowers and buds
 * ([least, most]) and how big (their radius).
 */
const FORM = {
  pads: [6, 9], pad: [0.12, 0.21], across: 0.36, deep: 0.24, notch: 0.22, lift: [0.003, 0.012],
  flowers: [2, 4], buds: [0, 2], flower: [0.07, 0.09], bud: 0.035,
};
// A flower's head (see head in flowers.js): eight pointed petals lying open, and two rings inside, shorter, cupped up
// further and deeper in colour, so it sits low on its pad as a round open cup; a bud's, five petals closing over it.
const FLOWER = { petals: 8, petalWide: 0.62, cup: 0.3, rings: [[8, 0.78, 0.65], [6, 0.55, 1.05]], eye: 0.24 };
const BUD = { petals: 5, petalWide: 0.85, cup: 2.6, eye: 0.15 };

// Across the screen and towards the camera, level (the game's camera looks from (1, 0.95, 1)).
const ACROSS = new THREE.Vector3(1, 0, -1).normalize();
const TOWARDS = new THREE.Vector3(1, 0, 1).normalize();
const UP = new THREE.Vector3(0, 1, 0);
const GOLDEN = Math.PI * (3 - Math.sqrt(5));

/** The pads, flat-faceted, glowing a little as the leaves do; the flowers soft, glowing more, either face showing. */
const PAD_MATERIAL = glowing(MATERIAL, 0.1);
const FLOWER_MATERIAL = twoSided(glowing(SOFT_MATERIAL, 0.3));

const between = ([a, b], t) => a + (b - a) * t;

/**
 * A pad round `C` (on the water, its middle `y` up), radius `r`, its notch at angle `notch`, its rim turned up `lift`:
 * a fan of facets out to a ring halfway and on to the rim, each a green of its own, and the edge down to the water.
 */
function pad(m, rand, C, y, r, notch, lift, c) {
  const n = 13;
  const spanA = TAU - 2 * FORM.notch;
  const point = (a, rr, h) => new THREE.Vector3(C.x + Math.cos(a) * rr, h, C.z + Math.sin(a) * rr);
  const angles = Array.from({ length: n + 1 }, (_, k) => notch + FORM.notch + (k / n) * spanA);
  const radii = angles.map(() => r * (0.94 + rand() * 0.12));
  const rim = angles.map((a, k) => point(a, radii[k], y + lift * (0.6 + rand() * 0.4)));
  const mid = angles.map((a, k) => point(a, radii[k] * 0.55, y + lift * 0.12));
  const middle = new THREE.Vector3(C.x, y, C.z);
  const tone = () => {
    const t = rand();
    return t < 0.5 ? c.padDark.clone().lerp(c.padMid, 0.4 + t) : c.padMid.clone().lerp(c.padLight, (t - 0.5) * 1.4);
  };
  const up = () => UP;
  for (let k = 0; k < n; k++) {
    const inner = tone();
    m.tri(middle, mid[k], mid[k + 1], inner, inner, inner, up);
    const outer = tone();
    m.tri(mid[k], rim[k], rim[k + 1], outer, outer, outer, up);
    const outer2 = outer.clone().lerp(tone(), 0.5);
    m.tri(mid[k], rim[k + 1], mid[k + 1], outer2, outer2, outer2, up);
    // The edge, down to the water.
    const out = () => new THREE.Vector3(Math.cos(angles[k] + spanA / n / 2), 0, Math.sin(angles[k] + spanA / n / 2));
    const [a, b] = [rim[k], rim[k + 1]];
    const [a0, b0] = [a.clone().setY(0), b.clone().setY(0)];
    m.tri(a, a0, b0, c.edge, c.edge, c.edge, out);
    m.tri(a, b0, b, c.edge, c.edge, c.edge, out);
  }
  // The notch's two sides, down to the water.
  for (const [k, s] of [[0, -1], [n, 1]]) {
    const side = () => new THREE.Vector3(-Math.sin(angles[k]) * s, 0, Math.cos(angles[k]) * s);
    const pts = [middle, mid[k], rim[k]];
    for (let j = 0; j < 2; j++) {
      const [a, b] = [pts[j], pts[j + 1]];
      m.tri(a, a.clone().setY(0), b.clone().setY(0), c.edge, c.edge, c.edge, side);
      m.tri(a, b.clone().setY(0), b, c.edge, c.edge, c.edge, side);
    }
  }
}

/**
 * A raft of water lilies `size` across the screen (world units), laid out by `seed`, lying on the water at the origin.
 * `look` may set how many flowers (`flowers`) and buds (`buds`) it has; the seed picks them otherwise. Returns a group:
 * the pads, and the flowers with their stalks.
 */
export function lilies(seed = 1, size = 1, look = {}, colors = LILIES) {
  const rand = seeded(seed);
  const c = palette(colors, (rand() - 0.5) * 0.02, 1 + (rand() - 0.5) * 0.08, ['petal', 'petalFoot', 'heart', 'heartTop']);
  const pm = mesher();
  const fm = mesher();
  // The pads' middles over an oval, longer across the screen, the middle ones the biggest; each lies a little higher
  // than those behind it, so a nearer pad lies over a further one where they meet.
  const count = (range, k) => look[k] ?? range[0] + Math.floor(rand() * (range[1] - range[0] + 1));
  const n = count(FORM.pads);
  const spin = rand() * TAU;
  const pads = [];
  for (let i = 0; i < n; i++) {
    const v = (i + 0.5) / n;
    const a = spin + i * GOLDEN;
    const out = Math.sqrt(v) * (0.85 + rand() * 0.3);
    const C = new THREE.Vector3()
      .addScaledVector(ACROSS, Math.cos(a) * out * FORM.across)
      .addScaledVector(TOWARDS, Math.sin(a) * out * FORM.deep);
    pads.push({ C, r: between(FORM.pad, 1 - 0.6 * v + rand() * 0.4), notch: rand() * TAU, lift: between(FORM.lift, rand()) });
  }
  pads.sort((p, q) => p.C.dot(TOWARDS) - q.C.dot(TOWARDS));
  pads.forEach((p, i) => {
    p.y = 0.003 + i * 0.0015;
    pad(pm, rand, p.C, p.y, p.r, p.notch, p.lift, c);
  });
  // The flowers, each on a pad of its own, spread over the raft: the first on one of the bigger pads, each next on the
  // pad furthest from those flowering already; a little off its middle, facing up and a little each its own way, in
  // one of the pinks.
  const flowers = Math.min(count(FORM.flowers, 'flowers'), n);
  const bySize = [...pads].sort((p, q) => q.r - p.r);
  const flowering = flowers ? [bySize[Math.floor(rand() * Math.ceil(n / 2))]] : [];
  const far = (p) => Math.min(...flowering.map((q) => p.C.distanceTo(q.C)));
  while (flowering.length < flowers) flowering.push(pads.filter((p) => !flowering.includes(p)).reduce((a, b) => (far(b) > far(a) ? b : a)));
  for (const p of flowering) {
    const R = between(FORM.flower, rand());
    const off = rand() * TAU;
    const C = p.C.clone().add(new THREE.Vector3(Math.cos(off), 0, Math.sin(off)).multiplyScalar(p.r * 0.3 * rand())).setY(p.y + p.lift * 0.3 + R * 0.12);
    const F = UP.clone().add(new THREE.Vector3(rand() - 0.5, 0, rand() - 0.5).multiplyScalar(0.4)).normalize();
    const [tip, foot] = MIX[Math.floor(rand() * MIX.length)];
    head(fm, rand, C, F, R, FLOWER, { ...c, petal: new THREE.Color(tip), petalFoot: new THREE.Color(foot) });
  }
  // The buds, each standing up from near the rim of a pad with no flower (if there is one), on a short stalk leaning
  // out.
  const buds = count(FORM.buds, 'buds');
  const bare = pads.filter((p) => !flowering.includes(p));
  for (let j = 0; j < buds; j++) {
    const from = bare.length ? bare : pads;
    const p = from[Math.floor(rand() * from.length)];
    const a = rand() * TAU;
    const dir = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
    const foot = p.C.clone().addScaledVector(dir, p.r * 0.7).setY(p.y);
    const top = foot.clone().addScaledVector(dir, 0.015).setY(p.y + 0.035 + rand() * 0.02);
    tube(fm, [foot, foot.clone().lerp(top, 0.5), top], [0.008, 0.007, 0.006], { dark: c.dark, light: c.dark.clone().lerp(c.padMid, 0.5) }, { sides: 4 });
    const F = UP.clone().addScaledVector(dir, 0.3).normalize();
    const [tip, deep] = MIX[Math.floor(rand() * MIX.length)];
    head(fm, rand, top.clone().addScaledVector(F, FORM.bud * 0.3), F, FORM.bud * (0.85 + rand() * 0.3), BUD, { ...c, petal: new THREE.Color(tip), petalFoot: new THREE.Color(deep) });
  }
  const group = new THREE.Group();
  for (const [mm, material] of [[pm, PAD_MATERIAL], [fm, FLOWER_MATERIAL]]) {
    const g = mm.geometry();
    g.scale(size, size, size);
    const mesh = new THREE.Mesh(g, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }
  group.userData.height = size;
  return group;
}
