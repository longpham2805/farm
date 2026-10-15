// A sunflower as the reference design draws them along the front right of the fields over the big bridge and by their
// back fence: a tall, slender green stem with broad pointed leaves up it, the biggest at its foot, bending at the top
// into a big head turned to face the viewer and tipped up a little: a dark brown disc, domed, its rim a warmer brown,
// ringed by two layers of pointed yellow petals, the back layer deeper and more orange, a green cup behind it.
import * as THREE from 'three';
import { seeded } from '../../util.js';
import { TAU, SOFT_MATERIAL, mesher, palette, tube, glowing } from './parts.js';
import { leaf } from './birch.js';

/** The petals (light, deep), the disc (its heart, rim), the leaves and stem (shade, dark, mid, light). */
export const SUNFLOWER = { petal: '#ffdc28', petalDeep: '#f4a818', heart: '#3a1e08', rim: '#7a4818', shade: '#1e5410', dark: '#2f7418', mid: '#56a42a', light: '#98d048' };

// Which way the camera looks from (its direction in FarmScene is (1, 0.95, 1)); the heads face it, tipped down a little.
const FACING = new THREE.Vector3(1, 0.55, 1).normalize();

/**
 * How it grows, in units of its height: the head's radius, how many petals to a layer ([least, most]); the stem's
 * radius; its leaves ([how high, how long] from the bottom up); how much it glows in its own colours, so the yellow
 * stays clear in the warm sun (see glowing).
 */
const FORM = { head: 0.18, petals: [12, 14], stem: 0.013, leaves: [[0.07, 0.24], [0.14, 0.23], [0.22, 0.22], [0.31, 0.2], [0.41, 0.18], [0.51, 0.16], [0.61, 0.14], [0.71, 0.12]], glow: 0.15 };

/** A sunflower `height` tall (world units), laid out by `seed`. Returns a mesh standing on its foot at the origin. */
export function sunflower(seed = 1, height = 1.4, colors = SUNFLOWER) {
  const rand = seeded(seed);
  const c = palette(colors, (rand() - 0.5) * 0.02, 1 + (rand() - 0.5) * 0.1, ['heart', 'rim']);
  const m = mesher();
  // The head: its middle, the way it faces (towards the camera, turned and tipped a little its own way), and two
  // directions across it.
  const R = FORM.head * (0.9 + rand() * 0.2);
  const F = FACING.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), (rand() - 0.5) * 0.8);
  F.y += (rand() - 0.5) * 0.2;
  F.normalize();
  const e1 = new THREE.Vector3().crossVectors(F, new THREE.Vector3(0, 1, 0)).normalize();
  const e2 = new THREE.Vector3().crossVectors(e1, F);
  const lean = new THREE.Vector3((rand() - 0.5) * 0.06, 0, (rand() - 0.5) * 0.06);
  const C = lean.clone().addScaledVector(F, -R * 0.2).setY(1 - R * 0.95);
  const at = (r, a, forward) => C.clone().addScaledVector(e1, Math.cos(a) * r).addScaledVector(e2, Math.sin(a) * r).addScaledVector(F, forward * R);
  const front = () => F;
  const back = () => F.clone().negate();
  // The stem, up from the ground and bending round into the back of the head.
  const neck = C.clone().addScaledVector(F, -R * 0.3);
  const path = [0, 0.3, 0.6, 0.82].map((y) => lean.clone().multiplyScalar(y / neck.y).setY(y * neck.y)).concat([neck.clone().addScaledVector(F, -R * 0.25).setY(neck.y - R * 0.1), neck]);
  tube(m, path, path.map((_, i) => FORM.stem * (1 - 0.3 * (i / (path.length - 1)))), { dark: c.shade, light: c.mid }, { sides: 6, soft: 0.4 });
  // Its leaves, round the stem a different way each, drooping, the lower ones more; their faces turned up to the light.
  const turn = rand() * TAU;
  FORM.leaves.forEach(([y, size], i) => {
    const a = turn + i * 2.4 + (rand() - 0.5) * 0.5;
    const base = lean.clone().multiplyScalar(y / neck.y).setY(y);
    const out = new THREE.Vector3(Math.cos(a), 0.15 - 0.3 * (1 - i / FORM.leaves.length) + (rand() - 0.5) * 0.2, Math.sin(a)).normalize();
    const face = new THREE.Vector3(0, 1, 0).addScaledVector(out, -out.y).normalize().applyAxisAngle(out, (rand() - 0.5) * 0.6);
    const col = c.dark.clone().lerp(c.mid, 0.3 + 0.5 * face.y * (0.6 + 0.4 * (i / FORM.leaves.length)) + (rand() - 0.5) * 0.2);
    leaf(m, base.addScaledVector(out, FORM.stem), out, face, size * (0.9 + rand() * 0.2), col, 0.9);
  });
  // The green cup behind the head.
  const K = 10;
  const cupTip = C.clone().addScaledVector(F, -R * 0.35);
  for (let k = 0; k < K; k++) {
    const [a, b] = [(k / K) * TAU, ((k + 1) / K) * TAU];
    m.tri(at(R * 0.5, a, -0.05), at(R * 0.5, b, -0.05), cupTip, c.dark, c.dark, c.shade, back);
  }
  // Two layers of petals, the back one between the front one's, a little shorter, deeper and more orange, so it only
  // shows between them; each petal a broad oval with a blunt point, folded a little down its middle, its tip bent back.
  const N = FORM.petals[0] + Math.floor(rand() * (FORM.petals[1] - FORM.petals[0] + 1));
  const spin = rand() * TAU;
  for (const layer of [1, 0]) {
    for (let k = 0; k < N; k++) {
      const a = spin + ((k + (layer ? 0 : 0.5)) / N) * TAU + (rand() - 0.5) * 0.12;
      const r0 = R * 0.46;
      const len = R * (layer ? 1 : 0.86) * (0.92 + rand() * 0.16);
      const w = (TAU * R * 0.72 * 0.5) / N;
      const z = layer ? 0 : -0.06;
      // Across it, s from its middle, at radius r: the angle there.
      const side = (s, r) => a + s / r;
      const along = (f) => r0 + (len - r0) * f;
      const edge = [[0, 0.6], [0.45, 1.15], [0.8, 0.8]].map(([f, k]) => [along(f), w * k * (layer ? 1 : 0.8), f]);
      const mids = edge.map(([r, , f]) => at(r, a, z + 0.02 + 0.015 * Math.sin(f * Math.PI) - 0.07 * f * f));
      const tip = at(len, a, z - 0.08);
      const [light, deep] = layer ? [c.petal, c.petal.clone().lerp(c.petalDeep, 0.25)] : [c.petal.clone().lerp(c.petalDeep, 0.6), c.petalDeep];
      const lit = light.clone().lerp(deep, rand() * 0.2);
      for (const sgn of [1, -1]) {
        const rim = edge.map(([r, half, f]) => at(r, side(sgn * half, r), z + 0.01 - 0.07 * f * f));
        const tris = [[mids[0], rim[0], rim[1], deep, deep, lit], [mids[0], rim[1], mids[1], deep, lit, light], [mids[1], rim[1], rim[2], light, lit, lit], [mids[1], rim[2], mids[2], light, lit, light], [mids[2], rim[2], tip, light, lit, lit]];
        for (const [p, q, r, cp, cq, cr] of tris) m.tri(p, q, r, cp, cq, cr, front);
      }
    }
  }
  // The disc: domed, a warm brown rim round a dark heart, in two rings of facets.
  const D = 11;
  const rim = Array.from({ length: D }, (_, k) => at(R * 0.5, (k / D) * TAU, 0.04));
  const ring = Array.from({ length: D }, (_, k) => at(R * 0.3 * (0.9 + rand() * 0.2), ((k + 0.5) / D) * TAU, 0.12));
  const top = at(0, 0, 0.17);
  const heart = c.heart.clone().lerp(c.rim, 0.25);
  for (let k = 0; k < D; k++) {
    const k1 = (k + 1) % D;
    const k0 = (k + D - 1) % D;
    m.tri(rim[k], rim[k1], ring[k], c.rim, c.rim, heart, front);
    m.tri(ring[k0], rim[k], ring[k], heart, c.rim, heart, front);
    m.tri(ring[k], top, ring[k0], c.heart, c.heart, c.heart, front);
  }
  const g = m.geometry();
  g.scale(height, height, height);
  const material = glowing(SOFT_MATERIAL, FORM.glow);
  // Thin petals and leaves show either face.
  material.side = THREE.DoubleSide;
  const mesh = new THREE.Mesh(g, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.height = height;
  return mesh;
}
