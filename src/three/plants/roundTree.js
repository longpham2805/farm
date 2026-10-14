// A round leafy tree as the reference design draws them in the woods: a stout brown trunk on flaring roots, forking
// a third of the way up into a few limbs that reach up into a big rounded crown, a little wider than tall, of many
// lumpy clumps of leaves, each of broad flat facets: yellow-green where the light falls on top, darker down the sides
// and under the crown, darkest deep in the gaps between the clumps.
import * as THREE from 'three';
import { seeded } from '../../util.js';
import { TAU, MATERIAL, SOFT_MATERIAL, mesher, palette, limb, pointNoise } from './parts.js';

/** Leaves: deep in the gaps, dark under the crown, mid on its sides, light on top; the bark. */
export const ROUND_TREES = {
  lime: { shade: '#1e4a06', dark: '#3f8010', mid: '#7cc020', light: '#c4f040', bark: '#8f5e30', barkDark: '#4a2f16' },
  green: { shade: '#123f0e', dark: '#287018', mid: '#4ca626', light: '#94d83c', bark: '#8f5e30', barkDark: '#4a2f16' },
};

const GOLDEN = Math.PI * (3 - Math.sqrt(5));
const BALL = new THREE.DodecahedronGeometry(1, 0).toNonIndexed().attributes.position;

/**
 * A lumpy clump of leaves of radius r round `c`, a little flattened, each facet one colour: from `shade` to `light` by
 * how much it faces up, out of the crown (whose middle is `mid`) and how high it sits between `bottom` and `top`.
 * `soft` (0 to 1) rounds its edges over: each facet is split in four, the middles of its edges pushed out towards the
 * ball that far, and its light and colour bend round the corners that far too.
 */
function clump(m, rand, c, r, seed, colors, { mid, bottom, top, soft = 0 }) {
  // Turned and stretched its own way, so no two clumps show the same facets.
  const turn = new THREE.Quaternion().setFromEuler(new THREE.Euler(rand() * TAU, rand() * TAU, rand() * TAU));
  const stretch = new THREE.Vector3(1 + (rand() - 0.5) * 0.3, 0.86, 1 + (rand() - 0.5) * 0.3);
  const corner = (k) => {
    const p = new THREE.Vector3().fromBufferAttribute(BALL, k);
    const s = 1 + pointNoise(p, seed) * 0.3;
    return p.applyQuaternion(turn).multiply(stretch).multiplyScalar(r * s).add(c);
  };
  const out = new THREE.Vector3();
  const { shade, dark, mid: middle, light } = colors;
  // The colour of a point facing n, give or take a little (`jitter`, -0.5 to 0.5).
  const tone = (p, n, jitter) => {
    const outward = n.dot(out.subVectors(p, mid).normalize());
    const h = THREE.MathUtils.clamp((p.y - bottom) / (top - bottom), 0, 1);
    const t = THREE.MathUtils.clamp(0.48 + 0.35 * n.y + 0.25 * (h - 0.5) + 0.2 * outward + jitter * 0.08, 0, 1);
    return t < 0.25 ? shade.clone().lerp(dark, t / 0.25) : t < 0.6 ? dark.clone().lerp(middle, (t - 0.25) / 0.35) : middle.clone().lerp(light, (t - 0.6) / 0.4);
  };
  // A facet's normal, facing out of the clump.
  const facing = (a, b, d) => {
    const n = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(d, a)).normalize();
    return n.dot(out.addVectors(a, b).add(d).divideScalar(3).sub(c)) < 0 ? n.negate() : n;
  };
  // The middle of an edge, pushed out towards the ball.
  const lift = (p, q) => {
    const e = p.clone().add(q).multiplyScalar(0.5).sub(c);
    const want = (p.distanceTo(c) + q.distanceTo(c)) / 2;
    return e.multiplyScalar(THREE.MathUtils.lerp(e.length(), want, soft) / e.length()).add(c);
  };
  for (let k = 0; k < BALL.count; k += 3) {
    const [a, b, d] = [corner(k), corner(k + 1), corner(k + 2)];
    if (!soft) {
      const n = facing(a, b, d);
      const col = tone(a.clone().add(b).add(d).divideScalar(3), n, rand() - 0.5);
      m.tri(a, b, d, col, col, col, () => n);
      continue;
    }
    const [ab, bd, da] = [lift(a, b), lift(b, d), lift(d, a)];
    for (const face of [[a, ab, da], [ab, b, bd], [da, bd, d], [ab, bd, da]]) {
      const n = facing(...face);
      const normals = face.map((p) => n.clone().lerp(p.clone().sub(c).normalize(), soft).normalize());
      const cols = face.map((p, i) => tone(p, normals[i], pointNoise(p, seed + 7)));
      m.tri(...face, ...cols, () => n, normals);
    }
  }
}

/**
 * How a leafy tree grows, in units of its height: the crown's radius, how many clumps round it ([least, most]) and how
 * big ([least, most] of the radius), the big clump in its middle, where the trunk forks, the trunk's radius at its foot
 * and at the fork, and the limbs' at the fork, where they bend and at their ends; and how far its edges are rounded
 * over (`soft`, 0 to 1; see clump).
 */
export const ROUND_FORM = { crown: 0.33, clumps: [21, 26], size: [0.32, 0.42], core: 0.65, fork: 0.24, trunk: [0.045, 0.032], limbs: [0.028, 0.02, 0.011], soft: 0.4 };

/**
 * A leafy tree `height` tall (world units), laid out by `seed`, its leaves `colors` (one of ROUND_TREES), grown as
 * `form` says. Returns the mesh, standing on its foot at the origin, and for hanging things in it: the clumps (their
 * middles `c` and radii `r`) and the crown's middle, in units of the height, and the seed's random numbers, carried on.
 */
export function leafyTree(seed, height, colors, form = ROUND_FORM) {
  const rand = seeded(seed);
  const c = palette(colors, (rand() - 0.5) * 0.03, 1 + (rand() - 0.5) * 0.12, ['bark', 'barkDark']);
  const bark = { dark: c.barkDark, light: c.bark };
  const m = mesher();
  // The crown: clumps spread over a flattened ball, none right underneath, and a big one in the middle to fill it.
  const R = form.crown + (rand() - 0.5) * 0.04;
  const mid = new THREE.Vector3(0, 1 - R * 0.95, 0);
  const clumps = [{ c: mid.clone().setY(mid.y + R * 0.1), r: R * form.core }];
  const N = form.clumps[0] + Math.floor(rand() * (form.clumps[1] - form.clumps[0]));
  const turn = rand() * TAU;
  for (let i = 0; i < N; i++) {
    const y = 1 - (2 * (i + 0.5)) / N;
    if (y < -0.62) continue;
    const ring = Math.sqrt(1 - y * y);
    const a = turn + i * GOLDEN + (rand() - 0.5) * 0.5;
    const out = R * (0.72 + 0.3 * Math.max(0, -y) + rand() * 0.1);
    clumps.push({ c: new THREE.Vector3(Math.cos(a) * ring * out, mid.y + y * R * 0.7, Math.sin(a) * ring * out), r: R * (form.size[0] + rand() * (form.size[1] - form.size[0])) });
  }
  const bottom = Math.min(...clumps.map((k) => k.c.y - k.r));
  const top = Math.max(...clumps.map((k) => k.c.y + k.r));
  // The trunk, leaning a little, on roots flaring into the ground; forking into limbs up into the lowest clumps on
  // three sides, and one up the middle.
  const fork = new THREE.Vector3((rand() - 0.5) * 0.04, form.fork + rand() * 0.04, (rand() - 0.5) * 0.04);
  const [foot, neck] = form.trunk;
  const [thick, mean, thin] = form.limbs;
  const round = form.soft > 0;
  limb(m, new THREE.Vector3(0, -0.02, 0), fork, foot, neck, bark, 7, round);
  const roots = 4 + Math.floor(rand() * 2);
  const flare = foot / 0.045;
  for (let k = 0; k < roots; k++) {
    const a = turn + (k / roots) * TAU + (rand() - 0.5) * 0.6;
    const reach = (0.055 + rand() * 0.02) * Math.sqrt(flare);
    limb(m, new THREE.Vector3(Math.cos(a) * 0.012, 0.09, Math.sin(a) * 0.012).multiplyScalar(flare), new THREE.Vector3(Math.cos(a) * reach, -0.01, Math.sin(a) * reach), 0.03 * Math.sqrt(flare), 0.012 * flare, bark, 5, round);
  }
  const low = clumps.slice(1).sort((p, q) => p.c.y - q.c.y);
  const reached = [];
  for (const k of low) {
    if (reached.length === 3) break;
    const a = Math.atan2(k.c.z, k.c.x);
    if (reached.some((b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b))) < 1.6)) continue;
    reached.push(a);
    const end = k.c.clone().multiplyScalar(0.9).setY(k.c.y - k.r * 0.1);
    const bend = fork.clone().lerp(end, 0.45).add(new THREE.Vector3(Math.cos(a) * 0.03, 0.04, Math.sin(a) * 0.03));
    limb(m, fork, bend, thick, mean, bark, 6, round);
    limb(m, bend, end, mean, thin, bark, 5, round);
  }
  limb(m, fork, mid.clone().setY(mid.y - R * 0.2), thick * 0.93, thin * 1.27, bark, 5, round);
  clumps.forEach((k, i) => clump(m, rand, k.c, k.r, seed * 31 + i, c, { mid, bottom, top, soft: form.soft }));
  const g = m.geometry();
  g.scale(height, height, height);
  const mesh = new THREE.Mesh(g, round ? SOFT_MATERIAL : MATERIAL);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.height = height;
  return { mesh, clumps, mid, rand };
}

/**
 * A round tree of the woods `height` tall (world units), laid out by `seed`, its leaves `colors` (one of
 * ROUND_TREES). Returns a mesh standing on its foot at the origin.
 */
export function roundTree(seed = 1, height = 2.4, colors = ROUND_TREES.lime) {
  return leafyTree(seed, height, colors).mesh;
}
