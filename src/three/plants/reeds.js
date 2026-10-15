// Cattails as the reference design draws them at the water's edge: three on the bank below the frog's pond, a big
// clump of five or six on the river's near bank at the front, two slim ones on the upper riverbank above the fir.
// Slender green stalks, the middle one tallest, fanning out to either side of the camera, each topped by a long brown
// head like a sausage with a short spike above it; and round their foot long strap leaves rising and arching over.
import * as THREE from 'three';
import { seeded } from '../../util.js';
import { TAU, SOFT_MATERIAL, glowing, mesher, palette, tube } from './parts.js';

/** Colours: the heads, dark to light, and their spikes; the stalks, dark to light; the leaves, deep to light. */
export const REEDS = {
  head: '#3a1a0c', headLight: '#7a4222', spike: '#6b5030', stalk: '#32602e', stalkLight: '#5e9c3e',
  leafDark: '#2b6b28', leafMid: '#4b9a2e', leafLight: '#86c444',
};

/**
 * How a clump grows, in units of its height (its tallest stalk): how many stalks ([least, most]), how tall the others
 * are ([least, most], of the tallest), how far their foot is from the middle, and how far out their top leans
 * ([least, most]; the shorter, the further); the stalks' radius at foot and top; the heads' length and radius and the
 * spike's length; how many leaves ([least, most]), how long and how wide at their foot ([least, most]), how far from
 * upright they set off and how much further they arch over by their tip ([least, most], radians).
 */
const FORM = {
  stalks: [2, 6], tall: [0.55, 0.88], foot: 0.05, lean: [0.05, 0.28], stalk: [0.016, 0.01],
  head: 0.27, headRadius: 0.028, spike: 0.06, leaves: [4, 9], leaf: [0.3, 0.55], wide: [0.06, 0.1], rise: [0.08, 0.35], bend: [0.3, 1.1],
};

const between = ([a, b], t) => a + (b - a) * t;

// Across the screen, level (the game's camera looks from (1, 0.95, 1)): the stalks fan out to either side of it, and
// the leaves turn their faces to the camera, a little up.
const ACROSS = new THREE.Vector3(1, 0, -1).normalize();
const FACE = new THREE.Vector3(1, 0.95, 1).normalize().lerp(new THREE.Vector3(0, 1, 0), 0.3).normalize();

/** One material for it all, soft, either face showing, glowing a little as the flowers' leaves do. */
const MATERIAL = Object.assign(glowing(SOFT_MATERIAL, 0.12), { side: THREE.DoubleSide });

/**
 * A long strap of a leaf from `foot`, rising the way `out` (level) and arching over: setting off `rise` (radians)
 * from upright and bending `bend` more by its tip, `length` long and `wide` wide near its foot, narrowing to a point,
 * its face turned as near to `facing` as it can, folded a little down its middle; coloured from `from` at its foot to
 * `to` at its tip.
 */
function blade(m, foot, out, rise, bend, length, wide, facing, from, to) {
  const n = 6;
  const spine = [foot.clone()];
  for (let i = 1; i <= n; i++) {
    const a = rise + bend * ((i - 0.5) / n) ** 2;
    spine.push(spine[i - 1].clone().addScaledVector(out.clone().multiplyScalar(Math.sin(a)).setY(Math.cos(a)), length / n));
  }
  const half = (t) => (wide / 2) * (1 - t * t) * (0.7 + 0.3 * Math.min(1, t / 0.2));
  // At each point along it: its two edges and its midrib, raised a little off the face.
  const rows = spine.map((p, i) => {
    const t = i / n;
    const tan = spine[Math.min(n, i + 1)].clone().sub(spine[Math.max(0, i - 1)]).normalize();
    const face = facing.clone().addScaledVector(tan, -facing.dot(tan)).normalize();
    const side = new THREE.Vector3().crossVectors(face, tan).normalize();
    const w = half(t);
    return { l: p.clone().addScaledVector(side, -w), r: p.clone().addScaledVector(side, w), mid: p.clone().addScaledVector(face, w * 0.3), face, c: from.clone().lerp(to, t) };
  });
  for (let i = 0; i < n; i++) {
    const [a, b] = [rows[i], rows[i + 1]];
    const facing = () => a.face;
    for (const e of ['l', 'r']) {
      m.tri(a[e], a.mid, b.mid, a.c, a.c, b.c, facing);
      m.tri(a[e], b.mid, b[e], a.c, b.c, b.c, facing);
    }
  }
}

/**
 * A clump of cattails `height` tall (world units, its tallest stalk with its spike), laid out by `seed`. `look` may set
 * how many stalks (`stalks`) and leaves (`leaves`) it has; the seed picks them otherwise. Returns a group standing on
 * its foot at the origin.
 */
export function reeds(seed = 1, height = 1.2, look = {}, colors = REEDS) {
  const rand = seeded(seed);
  const c = palette(colors, (rand() - 0.5) * 0.02, 1 + (rand() - 0.5) * 0.08);
  const m = mesher();
  const count = (k, [a, b]) => look[k] ?? a + Math.floor(rand() * (b - a + 1));
  const stalks = count('stalks', FORM.stalks);
  // The stalks: the first the tallest and nearly upright, the others shorter and leaning out to either side of the
  // camera in turn, a little off it; each leaning out most near its foot and straightening up, so its head stands
  // nearly upright.
  const top = 1 - FORM.spike;
  for (let i = 0; i < stalks; i++) {
    const h = i === 0 ? top : top * between(FORM.tall, rand());
    const a = (rand() - 0.5) * 0.9 + (i % 2 ? Math.PI : 0);
    const foot = new THREE.Vector3((rand() - 0.5) * 2 * FORM.foot, 0, (rand() - 0.5) * 2 * FORM.foot);
    const lean = i === 0 ? FORM.lean[0] * rand() : between(FORM.lean, (1 - h / top) * 2.5 * (0.6 + rand() * 0.4));
    const dir = ACROSS.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), a);
    const end = foot.clone().addScaledVector(dir, lean).setY(h);
    const along = (t) => foot.clone().lerp(end, 1 - (1 - t) ** 1.8).setY(h * t);
    const below = h - FORM.head;
    const path = [0, 0.35, 0.7, below / h].map(along);
    tube(m, path, path.map((_, j) => between(FORM.stalk, j / 3)), { dark: c.stalk, light: c.stalkLight }, { sides: 4 });
    // Its head, rounded at either end, and the spike above it.
    const r = FORM.headRadius * (0.85 + rand() * 0.3);
    const head = [0, 0.12, 0.5, 0.88, 1].map((s) => along(THREE.MathUtils.lerp(below / h, 1, s)));
    tube(m, head, [0.55, 0.95, 1, 0.92, 0.5].map((k) => k * r), { dark: c.head, light: c.headLight }, { sides: 7, soft: 0.6 });
    const tip = end.clone().add(new THREE.Vector3(0, FORM.spike * (0.7 + rand() * 0.5), 0)).addScaledVector(dir, 0.01);
    tube(m, [end, tip], [0.007, 0.003], { dark: c.spike, light: c.spike }, { sides: 3 });
  }
  // The leaves round their foot, every way but more of them to the sides, some arching right over.
  const leaves = count('leaves', FORM.leaves);
  const turn = rand() * TAU;
  for (let i = 0; i < leaves; i++) {
    const a = turn + (i / leaves) * TAU + (rand() - 0.5) * 0.7;
    let out = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
    out = out.lerp(ACROSS.clone().multiplyScalar(Math.sign(out.dot(ACROSS)) || 1), 0.35).normalize();
    const foot = out.clone().multiplyScalar(FORM.foot * rand()).setY(0);
    const from = c.leafDark.clone().lerp(c.leafMid, rand() * 0.4);
    const to = c.leafMid.clone().lerp(c.leafLight, 0.3 + rand() * 0.7);
    const facing = FACE.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), (rand() - 0.5) * 1.2);
    blade(m, foot, out, between(FORM.rise, rand()), between(FORM.bend, rand()), between(FORM.leaf, rand()), between(FORM.wide, rand()), facing, from, to);
  }
  const g = m.geometry();
  g.scale(height, height, height);
  const mesh = new THREE.Mesh(g, MATERIAL);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  const group = new THREE.Group();
  group.add(mesh);
  group.userData.height = height;
  return group;
}
