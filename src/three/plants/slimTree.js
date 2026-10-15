// A slim upright tree as the reference design draws two together by the river on the right, by the fields' fence: a
// long, slender trunk, bare a third of the way up, and tiers of broad leafy lobes hanging out from it, smaller up the
// tree to a pointed top, the trunk showing between them. Each lobe is folded down its middle and droops to a point,
// its edges notched as a leaf's, so one half takes the light, yellow-green, and the other is a deep green.
import * as THREE from 'three';
import { seeded } from '../../util.js';
import { TAU, SOFT_MATERIAL, mesher, palette, trunk } from './parts.js';

/** Leaves: in the shade, dark, mid, in the light; the bark. */
export const SLIM = { shade: '#0f3306', dark: '#1f5c0c', mid: '#4a8c1a', light: '#9cc83a', bark: '#7a4c30', barkDark: '#36200e' };

// The game's sun (SUN_DIR in countryside.js), for colouring what faces it.
const SUN = new THREE.Vector3(-0.414, 1.11, 0.91).normalize();
const UP = () => new THREE.Vector3(0, 1, 0);
const DOWN = () => new THREE.Vector3(0, -1, 0);

/**
 * How it grows, in units of its height: its tiers from the bottom up ([how high, how many lobes, how far they reach
 * out, how far they droop by their tips]), a lobe of the lowest the likeliest to be missing (`gaps`, less going up);
 * how wide a lobe is at its widest (of its length) and how far its halves fold down; the pointed top ([from, to, how
 * wide at its foot]); its trunk (see WOOD in parts.js).
 */
const FORM = {
  tiers: [[0.42, 4, 0.12, 0.05], [0.57, 5, 0.14, 0.06], [0.71, 4, 0.12, 0.05], [0.82, 4, 0.09, 0.035], [0.9, 3, 0.06, 0.02]],
  gaps: 0.35,
  width: 0.85,
  fold: 0.38,
  tip: [0.91, 1, 0.026],
  wood: { trunk: [0.017, 0.005], roots: 4, flare: 1.0, kink: 0.05, twist: 0.05, sides: 8, soft: 0.35, ridges: 0.08 },
};

// A lobe's edge on each side from its root to its point ([how far along, how wide, of its widest]): lobes, and the
// notches between them.
const EDGE = [[0.04, 0.4], [0.2, 0.85], [0.32, 0.78], [0.46, 1], [0.62, 0.78], [0.76, 0.5], [0.89, 0.24], [1, 0]];

/** The point on `path` (a trunk's line, going up) at height y. */
function at(path, y) {
  for (let i = 1; i < path.length; i++) {
    if (path[i].y >= y) return path[i - 1].clone().lerp(path[i], (y - path[i - 1].y) / (path[i].y - path[i - 1].y));
  }
  return path[path.length - 1].clone();
}

/**
 * One lobe from `root`, reaching L out the way of angle a and drooping `drop` by its point: folded down its middle,
 * its edges notched, thick at its root and thinning to its point. `face(a, b, c, facing)` draws and colours a facet.
 */
function lobe(rand, root, a, L, drop, face) {
  const out = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
  const across = new THREE.Vector3(-Math.sin(a), 0, Math.cos(a));
  const W = L * FORM.width * (0.85 + rand() * 0.3);
  const thick = W * 0.45;
  const middle = (s) => root.clone().addScaledVector(out, L * s).setY(root.y - drop * s ** 1.3);
  for (const side of [1, -1]) {
    const rim = EDGE.map(([s, w], i) => {
      const last = i === EDGE.length - 1;
      const ss = last ? s : s + (rand() - 0.5) * 0.03;
      const ww = last ? 0 : (w + (rand() - 0.5) * 0.08) * W;
      return { s: ss, p: middle(ss).addScaledVector(across, side * ww).add(new THREE.Vector3(0, -ww * FORM.fold, 0)) };
    });
    const top = rim.map(({ s }) => middle(s).add(new THREE.Vector3(0, thick * (1 - s) ** 0.7, 0)));
    const under = rim.map(({ s }) => middle(s));
    // Its root, against the trunk.
    face(top[0], under[0], rim[0].p, () => out.clone().negate());
    for (let i = 0; i + 1 < rim.length; i++) {
      const [p, q] = [rim[i].p, rim[i + 1].p];
      face(top[i], p, q, UP);
      face(under[i], q, p, DOWN);
      if (i + 2 < rim.length) {
        face(top[i], q, top[i + 1], UP);
        face(under[i], under[i + 1], q, DOWN);
      }
    }
  }
}

/** A slim upright tree `height` tall (world units), laid out by `seed`. Returns a mesh standing on its foot at the origin. */
export function slimTree(seed = 1, height = 1.9, colors = SLIM) {
  const rand = seeded(seed);
  const c = palette(colors, (rand() - 0.5) * 0.03, 1 + (rand() - 0.5) * 0.1, ['bark', 'barkDark']);
  const m = mesher();
  const lean = new THREE.Vector3((rand() - 0.5) * 0.04, 0, (rand() - 0.5) * 0.04);
  const line = trunk(m, rand, lean.clone().setY(FORM.tip[0] + 0.03), { dark: c.barkDark, light: c.bark }, FORM.wood);
  // Each facet one colour, by how it faces the sky and the sun and how high it sits, give or take a little.
  const bottom = FORM.tiers[0][0] - FORM.tiers[0][3];
  const ramp = [c.shade, c.dark, c.mid, c.light];
  const n = new THREE.Vector3();
  const face = (p, q, r, facing) => {
    n.subVectors(q, p).cross(new THREE.Vector3().subVectors(r, p)).normalize();
    if (n.dot(facing(p, q, r)) < 0) n.negate();
    const h = THREE.MathUtils.clamp(((p.y + q.y + r.y) / 3 - bottom) / (1 - bottom), 0, 1);
    const x = THREE.MathUtils.clamp(0.3 + 0.3 * n.y + 0.35 * n.dot(SUN) + 0.25 * (h - 0.5) + (rand() - 0.5) * 0.08, 0, 1) * 3;
    const i = Math.min(2, Math.floor(x));
    const col = ramp[i].clone().lerp(ramp[i + 1], x - i);
    const facet = n.clone();
    m.tri(p, q, r, col, col, col, () => facet);
  };
  // The tiers, each turned its own way, its lobes from the bark round the trunk.
  const [first, last] = [FORM.tiers[0][0], FORM.tiers[FORM.tiers.length - 1][0]];
  for (const [y0, count, reach, drop] of FORM.tiers) {
    const turn = rand() * TAU;
    const low = 1 - (y0 - first) / (last - first);
    for (let i = 0; i < count; i++) {
      if (rand() < FORM.gaps * low) continue;
      const a = turn + (i / count) * TAU + (rand() - 0.5) * 0.7;
      const y = y0 + (rand() - 0.5) * 0.03;
      const root = at(line, y).add(new THREE.Vector3(Math.cos(a), 0, Math.sin(a)).multiplyScalar(0.006));
      lobe(rand, root, a, reach * (0.85 + rand() * 0.3), drop * (0.85 + rand() * 0.3), face);
    }
  }
  // The pointed top: a narrow cone of five sides round the trunk's end.
  const [from, to, r] = FORM.tip;
  const foot = at(line, from);
  const apex = foot.clone().setY(to);
  const turn = rand() * TAU;
  const ring = (y, k) => Array.from({ length: k }, (_, i) => {
    const a = turn + (i / k) * TAU + (rand() - 0.5) * 0.3;
    return foot.clone().add(new THREE.Vector3(Math.cos(a), 0, Math.sin(a)).multiplyScalar(r * y * (0.85 + rand() * 0.3))).setY(from + (to - from) * (1 - y));
  });
  const [low, high] = [ring(1, 5), ring(0.5, 5)];
  const away = (p, q, s) => new THREE.Vector3().addVectors(p, q).add(s).divideScalar(3).sub(foot).setY(0.3 * r);
  for (let i = 0; i < 5; i++) {
    const j = (i + 1) % 5;
    face(low[i], low[j], high[j], away);
    face(low[i], high[j], high[i], away);
    face(high[i], high[j], apex, away);
    face(low[i], foot, low[j], DOWN);
  }
  const g = m.geometry();
  g.scale(height, height, height);
  const mesh = new THREE.Mesh(g, SOFT_MATERIAL);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.height = height;
  return mesh;
}
