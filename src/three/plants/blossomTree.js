// The pink blossom tree the reference design draws by the farmhouse, a cherry in flower, made as the low-poly cherry
// trees the user found drawn: a twisted trunk on roots flaring into the ground, forking into limbs that fork again,
// each bough holding up one lobe of the crown, the boughs showing under it and in the gaps between the lobes. Each
// lobe is a few lumpy clumps of pink, deep rose in the gaps, covered over its outer side in five-petalled flowers,
// pale pink to white where the light falls, a deep pink eye at the heart of each; and petals fallen on the grass.
import * as THREE from 'three';
import { seeded } from '../../util.js';
import { TAU, SOFT_MATERIAL, mesher, palette, wood, glowing } from './parts.js';
import { clump } from './roundTree.js';

/** Blossom: deep rose in the gaps, darker under the crown, pink on its sides, pale on top; the petals and their eyes; the bark. */
export const BLOSSOM = { shade: '#90205c', dark: '#d04a96', mid: '#f884d0', light: '#ffd0ee', petal: '#ffe6f4', eye: '#d42a6c', bark: '#8e5440', barkDark: '#4a2620' };

const GOLDEN = Math.PI * (3 - Math.sqrt(5));
// Which way round the trunk the camera looks from (its direction in FarmScene is (1, 0.95, 1)).
const FACING = Math.PI / 4;

/**
 * How the tree grows, in units of its height: the crown's lobes, ring by ring from the top ([how many, how far out
 * from the trunk, how high, how big]); its wood (see WOOD in parts.js); how many clumps to a lobe ([least, most]),
 * how big the dark clump deep in the crown is, how many flowers sit on each of the clumps' facets (on average) and
 * how big they are (of the height), how many petals lie fallen on the grass under it; and how much it glows in its own colours, so the
 * pink stays pink in the warm sun (see glowing).
 */
const FORM = {
  lobes: [[2, 0.08, 0.88, 0.18], [4, 0.22, 0.77, 0.2], [6, 0.34, 0.63, 0.165]],
  wood: { fork: 0.21, trunk: [0.052, 0.036], tip: 0.011, roots: 5, flare: 1.7, kink: 0.14, twist: 0.2, sides: 8, soft: 0.3, ridges: 0.12 },
  clumps: [5, 7],
  core: 0.18,
  flowers: 1.5,
  flower: 0.05,
  fallen: [26, 34],
  glow: 0.25,
};

/**
 * One flower at p, facing d: five petals round a raised eye, each folded down its middle and cupped up a little, its
 * tip lifted towards d; `lit` (0 to 1) is how much light it catches, from a pink deep in the crown to near white.
 */
function flower(m, rand, p, d, s, c, lit) {
  const e1 = new THREE.Vector3().crossVectors(d, Math.abs(d.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)).normalize();
  const e2 = new THREE.Vector3().crossVectors(d, e1);
  const at = (a, r, up) => p.clone().addScaledVector(e1, Math.cos(a) * r * s).addScaledVector(e2, Math.sin(a) * r * s).addScaledVector(d, up * s);
  const eye = p.clone().addScaledVector(d, 0.14 * s);
  const facing = () => d;
  const base = c.mid.clone().lerp(c.petal, 0.15 + 0.5 * lit);
  const tip = c.mid.clone().lerp(c.petal, 0.4 + 0.6 * lit);
  const heart = c.eye.clone().lerp(c.mid, 0.25 * lit);
  const turn = rand() * TAU;
  for (let j = 0; j < 5; j++) {
    const a = turn + (j / 5) * TAU + (rand() - 0.5) * 0.2;
    const T = at(a, 1, 0.24);
    const L = at(a - 0.5, 0.64, 0.1);
    const R = at(a + 0.5, 0.64, 0.1);
    m.tri(eye, L, T, heart, base, tip, facing);
    m.tri(eye, T, R, heart, tip, base, facing);
  }
}

/** A blossom tree `height` tall (world units), laid out by `seed`. Returns a mesh standing on its foot at the origin. */
export function blossomTree(seed = 1, height = 1.9, colors = BLOSSOM) {
  const rand = seeded(seed);
  const c = palette(colors, (rand() - 0.5) * 0.02, 1 + (rand() - 0.5) * 0.08, ['bark', 'barkDark', 'eye']);
  const m = mesher();
  // The lobes, ring by ring round the trunk's line, each ring turned its own way; but the lowest turned so the camera
  // looks in between two of its lobes, at the limbs under the crown.
  const lobes = [];
  for (const [count, out, y, r] of FORM.lobes) {
    const turn = y === FORM.lobes[FORM.lobes.length - 1][2] ? FACING + Math.PI / count + (rand() - 0.5) * 0.3 : rand() * TAU;
    for (let i = 0; i < count; i++) {
      const a = turn + (i / count) * TAU + (rand() - 0.5) * 0.6;
      const o = out * (0.85 + rand() * 0.3);
      lobes.push({ c: new THREE.Vector3(Math.cos(a) * o, y + (rand() - 0.5) * 0.06, Math.sin(a) * o), r: r * (0.88 + rand() * 0.24) });
    }
  }
  const mid = new THREE.Vector3(0, lobes.reduce((s, l) => s + l.c.y, 0) / lobes.length, 0);
  // The wood, a bough ending a little inside each lobe, below its middle.
  wood(m, rand, lobes.map((l) => l.c.clone().multiplyScalar(0.8).setY(l.c.y - l.r * 0.35)), { dark: c.barkDark, light: c.bark }, FORM.wood);
  // Each lobe: a core, and clumps round its outer side, standing out of it; and deep in the middle of the crown a
  // dark clump, so the gaps between the lobes show deep rose rather than the sky.
  const clumps = [];
  for (const lobe of lobes) {
    lobe.clumps = [{ c: lobe.c, r: lobe.r * 0.72 }];
    const away = lobe.c.clone().sub(mid).normalize();
    const n = FORM.clumps[0] + Math.floor(rand() * (FORM.clumps[1] - FORM.clumps[0] + 1));
    const turn = rand() * TAU;
    for (let i = 0; i < n; i++) {
      const y = 1 - (2 * (i + 0.5)) / n;
      const ring = Math.sqrt(1 - y * y);
      const a = turn + i * GOLDEN + (rand() - 0.5) * 0.5;
      const d = new THREE.Vector3(Math.cos(a) * ring, y, Math.sin(a) * ring);
      if (d.dot(away) < -0.35) continue;
      lobe.clumps.push({ c: lobe.c.clone().addScaledVector(d, lobe.r * 0.55), r: lobe.r * (0.45 + rand() * 0.12) });
    }
    clumps.push(...lobe.clumps);
  }
  const bottom = Math.min(...clumps.map((k) => k.c.y - k.r));
  const top = Math.max(...clumps.map((k) => k.c.y + k.r));
  clumps.forEach((k, i) => clump(m, rand, k.c, k.r, seed * 31 + i, c, { mid, bottom, top, soft: 0.25, mottle: 0.2, facets: (k.facets = []) }));
  const deep = { shade: c.shade, dark: c.shade, mid: c.dark, light: c.dark };
  clump(m, rand, mid.clone().setY(mid.y + 0.05), FORM.core, seed * 31 - 1, deep, { mid, bottom, top });
  // The flowers, set on the clumps' own facets, so they sit on what shows (set on round balls, some sank into the
  // clumps' lumps and left them bare): one or two to each facet (`flowers` on average), but those facing straight in to
  // the crown's middle or straight down, and those another clump covers. A lobe's inner side shows over the lobes in
  // front of it, so it is covered too.
  for (const k of clumps) {
    for (const { p, n } of k.facets) {
      if (n.dot(p.clone().sub(mid).normalize()) < -0.75 || n.y < -0.75) continue;
      if (clumps.some((o) => o !== k && p.distanceTo(o.c) < o.r * 0.85)) continue;
      const count = Math.floor(FORM.flowers + rand());
      for (let j = 0; j < count; j++) {
        const aside = new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5);
        aside.addScaledVector(n, -aside.dot(n)).setLength(j === 0 ? 0 : k.r * 0.3);
        const face = n.clone().add(new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).multiplyScalar(0.6)).normalize();
        const at = p.clone().add(aside).addScaledVector(n, k.r * 0.06);
        const h = THREE.MathUtils.clamp((at.y - bottom) / (top - bottom), 0, 1);
        const lit = THREE.MathUtils.clamp(0.45 + 0.4 * face.y + 0.3 * (h - 0.5) + 0.2 * face.dot(at.clone().sub(mid).normalize()), 0, 1);
        flower(m, rand, at, face, FORM.flower * (0.85 + rand() * 0.3), c, lit);
      }
    }
  }
  // Petals fallen on the grass under the crown, more of them near the trunk, each lying its own way.
  const reach = Math.max(...lobes.map((l) => Math.hypot(l.c.x, l.c.z) + l.r));
  const fallen = FORM.fallen[0] + Math.floor(rand() * (FORM.fallen[1] - FORM.fallen[0] + 1));
  const up = () => new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < fallen; i++) {
    const a = rand() * TAU;
    const o = reach * (0.15 + 0.85 * Math.sqrt(rand()));
    const p = new THREE.Vector3(Math.cos(a) * o, 0.004, Math.sin(a) * o);
    const t = rand() * TAU;
    const s = FORM.flower * (0.5 + rand() * 0.25);
    const along = new THREE.Vector3(Math.cos(t), 0, Math.sin(t)).multiplyScalar(s);
    const across = new THREE.Vector3(-Math.sin(t), 0, Math.cos(t)).multiplyScalar(s * 0.45);
    const col = c.mid.clone().lerp(c.petal, 0.4 + rand() * 0.5);
    const [tail, head] = [p.clone().sub(along), p.clone().add(along)];
    const [l, r] = [p.clone().add(across), p.clone().sub(across)];
    m.tri(tail, l, head, col, col, col, up);
    m.tri(tail, head, r, col, col, col, up);
  }
  const g = m.geometry();
  g.scale(height, height, height);
  const mesh = new THREE.Mesh(g, glowing(SOFT_MATERIAL, FORM.glow));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.height = height;
  return mesh;
}
