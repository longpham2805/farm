// A round leafy tree as the reference design draws them in the woods: a stout brown trunk on flaring roots, forking
// a third of the way up into a few limbs that reach up into a big rounded crown, a little wider than tall, of many
// lumpy clumps of leaves, each of small flat facets: yellow-green where the light falls on top, darker down the sides
// and under the crown, darkest deep in the gaps between the clumps.
import * as THREE from 'three';
import { seeded } from '../../util.js';
import { TAU, MATERIAL, mesher, palette, limb, pointNoise } from './parts.js';

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
 */
function clump(m, rand, c, r, seed, colors, { mid, bottom, top }) {
  // Turned and stretched its own way, so no two clumps show the same facets.
  const turn = new THREE.Quaternion().setFromEuler(new THREE.Euler(rand() * TAU, rand() * TAU, rand() * TAU));
  const stretch = new THREE.Vector3(1 + (rand() - 0.5) * 0.3, 0.86, 1 + (rand() - 0.5) * 0.3);
  const corner = (k) => {
    const p = new THREE.Vector3().fromBufferAttribute(BALL, k);
    const s = 1 + pointNoise(p, seed) * 0.3;
    return p.applyQuaternion(turn).multiply(stretch).multiplyScalar(r * s).add(c);
  };
  const n = new THREE.Vector3();
  const out = new THREE.Vector3();
  const { shade, dark, mid: middle, light } = colors;
  for (let k = 0; k < BALL.count; k += 3) {
    const [a, b, d] = [corner(k), corner(k + 1), corner(k + 2)];
    n.subVectors(b, a).cross(new THREE.Vector3().subVectors(d, a)).normalize();
    const centre = a.clone().add(b).add(d).divideScalar(3);
    if (n.dot(out.subVectors(centre, c)) < 0) n.negate();
    const outward = n.dot(out.subVectors(centre, mid).normalize());
    const h = THREE.MathUtils.clamp((centre.y - bottom) / (top - bottom), 0, 1);
    const t = THREE.MathUtils.clamp(0.48 + 0.35 * n.y + 0.25 * (h - 0.5) + 0.2 * outward + (rand() - 0.5) * 0.08, 0, 1);
    const col = t < 0.25 ? shade.clone().lerp(dark, t / 0.25) : t < 0.6 ? dark.clone().lerp(middle, (t - 0.25) / 0.35) : middle.clone().lerp(light, (t - 0.6) / 0.4);
    m.tri(a, b, d, col, col, col, () => n);
  }
}

/**
 * A round tree `height` tall (world units), laid out by `seed`, its leaves `colors` (one of ROUND_TREES). Returns a
 * mesh standing on its foot at the origin.
 */
export function roundTree(seed = 1, height = 2.4, colors = ROUND_TREES.lime) {
  const rand = seeded(seed);
  const c = palette(colors, (rand() - 0.5) * 0.03, 1 + (rand() - 0.5) * 0.12, ['bark', 'barkDark']);
  const bark = { dark: c.barkDark, light: c.bark };
  const m = mesher();
  // The crown: clumps spread over a flattened ball, none right underneath, and a big one in the middle to fill it.
  const R = 0.33 + (rand() - 0.5) * 0.04;
  const mid = new THREE.Vector3(0, 1 - R * 0.95, 0);
  const clumps = [{ c: mid.clone().setY(mid.y + R * 0.1), r: R * 0.65 }];
  const N = 21 + Math.floor(rand() * 5);
  const turn = rand() * TAU;
  for (let i = 0; i < N; i++) {
    const y = 1 - (2 * (i + 0.5)) / N;
    if (y < -0.62) continue;
    const ring = Math.sqrt(1 - y * y);
    const a = turn + i * GOLDEN + (rand() - 0.5) * 0.5;
    const out = R * (0.72 + 0.3 * Math.max(0, -y) + rand() * 0.1);
    clumps.push({ c: new THREE.Vector3(Math.cos(a) * ring * out, mid.y + y * R * 0.7, Math.sin(a) * ring * out), r: R * (0.32 + rand() * 0.1) });
  }
  const bottom = Math.min(...clumps.map((k) => k.c.y - k.r));
  const top = Math.max(...clumps.map((k) => k.c.y + k.r));
  // The trunk, leaning a little, on roots flaring into the ground; forking into limbs up into the lowest clumps on
  // three sides, and one up the middle.
  const fork = new THREE.Vector3((rand() - 0.5) * 0.04, 0.24 + rand() * 0.04, (rand() - 0.5) * 0.04);
  limb(m, new THREE.Vector3(0, -0.02, 0), fork, 0.045, 0.032, bark, 7);
  const roots = 4 + Math.floor(rand() * 2);
  for (let k = 0; k < roots; k++) {
    const a = turn + (k / roots) * TAU + (rand() - 0.5) * 0.6;
    const reach = 0.055 + rand() * 0.02;
    limb(m, new THREE.Vector3(Math.cos(a) * 0.012, 0.09, Math.sin(a) * 0.012), new THREE.Vector3(Math.cos(a) * reach, -0.01, Math.sin(a) * reach), 0.03, 0.012, bark, 5);
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
    limb(m, fork, bend, 0.028, 0.02, bark, 6);
    limb(m, bend, end, 0.02, 0.011, bark, 5);
  }
  limb(m, fork, mid.clone().setY(mid.y - R * 0.2), 0.026, 0.014, bark, 5);
  clumps.forEach((k, i) => clump(m, rand, k.c, k.r, seed * 31 + i, c, { mid, bottom, top }));
  const g = m.geometry();
  g.scale(height, height, height);
  const mesh = new THREE.Mesh(g, MATERIAL);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.height = height;
  return mesh;
}
