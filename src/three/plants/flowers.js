// Flowers as the reference design draws them in clumps along the roads and the river: a mound of broad pointed leaves
// rising from the ground, and over it flowers on slender stems, their heads turned up to the sky and to the camera.
// One model for them all; the kinds (FLOWERS) differ in their heads and colours. First the white daisies by the river
// at the front left: big heads of six broad rounded petals, cupped up a little, round an orange heart.
import * as THREE from 'three';
import { seeded } from '../../util.js';
import { TAU, SOFT_MATERIAL, mesher, palette, tube, glowing } from './parts.js';
import { leaf } from './birch.js';
import { clump } from './roundTree.js';

const GOLDEN = Math.PI * (3 - Math.sqrt(5));
// Which way the heads face: up to the sky, and a little to the camera (FarmScene's camera looks from (1, 0.95, 1)).
const FACING = new THREE.Vector3(1, 2.2, 1).normalize();

/**
 * The kinds: their colours (the petals at the tip and at the foot, the heart and its top, the leaves and stems: shade,
 * dark, mid, light); their heads' petals (how many, how wide of the head's radius, how far they cup up, of it); how
 * many heads ([least, most]) and how big (their radius, of the clump's height); how much it glows in its own colours,
 * so the white stays white in the warm sun (see glowing).
 */
export const FLOWERS = {
  daisy: {
    colors: { petal: '#eef3ff', petalFoot: '#e6ebf2', heart: '#ec8c1c', heartTop: '#ffc43a', shade: '#16420e', dark: '#24601a', mid: '#3f8a26', light: '#7ab844' },
    petals: 6, petalWide: 0.85, cup: 0.3, heads: [8, 10], head: 0.12, glow: 0.5,
  },
};

/**
 * How a clump grows, in units of its height: its leaves ([least, most], how long, how wide of their length), how far
 * out from its middle the heads spread, and the stems' radius.
 */
const FORM = { leaves: [40, 48], leaf: 0.34, wide: 0.62, spread: 0.6, stem: 0.012 };

/**
 * A head at `C` facing `F`, radius `R`: petals round a domed heart, each a broad oval with a rounded tip, cupped up
 * towards its tip and ridged a little down its middle; a small green cup behind.
 */
function head(m, rand, C, F, R, k, c) {
  const e1 = new THREE.Vector3().crossVectors(F, new THREE.Vector3(0, 0, 1)).normalize();
  const e2 = new THREE.Vector3().crossVectors(e1, F);
  const at = (r, a, up) => C.clone().addScaledVector(e1, Math.cos(a) * r).addScaledVector(e2, Math.sin(a) * r).addScaledVector(F, up * R);
  const front = () => F;
  const back = () => F.clone().negate();
  const r0 = R * 0.26;
  // The petals: along each, how far out (0 at its foot, 1 at its tip) and how wide there, of its widest.
  const edge = [[0, 0.35], [0.3, 0.85], [0.62, 1], [0.88, 0.7]];
  const half = (R * k.petalWide) / 2;
  const spin = rand() * TAU;
  for (let i = 0; i < k.petals; i++) {
    const a = spin + (i / k.petals) * TAU + (rand() - 0.5) * 0.15;
    const len = R * (0.92 + rand() * 0.16);
    const r = (f) => r0 + (len - r0) * f;
    const rise = (f) => k.cup * f * f;
    const lit = c.petal.clone().lerp(c.petalFoot, rand() * 0.15);
    const tone = (f) => c.petalFoot.clone().lerp(lit, THREE.MathUtils.smoothstep(f, 0, 0.5));
    const mids = edge.map(([f]) => at(r(f), a, rise(f) + 0.03 * Math.sin(Math.PI * f)));
    const tip = at(len, a, rise(1));
    for (const s of [1, -1]) {
      const rim = edge.map(([f, w]) => at(r(f), a + (s * w * half) / r(f), rise(f)));
      const cols = edge.map(([f]) => tone(f));
      for (let j = 0; j < edge.length - 1; j++) {
        m.tri(mids[j], rim[j], rim[j + 1], cols[j], cols[j], cols[j + 1], front);
        m.tri(mids[j], rim[j + 1], mids[j + 1], cols[j], cols[j + 1], cols[j + 1], front);
      }
      m.tri(mids[3], rim[3], tip, cols[3], cols[3], lit, front);
    }
  }
  // The heart, domed, in two rings of facets.
  const D = 8;
  const ring = Array.from({ length: D }, (_, j) => at(r0 * 1.15, (j / D) * TAU, 0.05));
  const inner = Array.from({ length: D }, (_, j) => at(r0 * 0.65, ((j + 0.5) / D) * TAU, 0.15));
  const top = at(0, 0, 0.2);
  for (let j = 0; j < D; j++) {
    const j1 = (j + 1) % D;
    const j0 = (j + D - 1) % D;
    m.tri(ring[j], ring[j1], inner[j], c.heart, c.heart, c.heartTop, front);
    m.tri(inner[j0], ring[j], inner[j], c.heartTop, c.heart, c.heartTop, front);
    m.tri(inner[j], top, inner[j0], c.heartTop, c.heartTop, c.heartTop, front);
  }
  // The green cup behind it.
  const tail = C.clone().addScaledVector(F, -R * 0.25);
  for (let j = 0; j < 6; j++) m.tri(at(r0 * 1.3, (j / 6) * TAU, -0.02), at(r0 * 1.3, ((j + 1) / 6) * TAU, -0.02), tail, c.dark, c.dark, c.shade, back);
}

/**
 * A clump of flowers of a kind (a name in FLOWERS), `height` tall to the top of its heads (world units), laid out by
 * `seed`. Returns a group standing on the ground at the origin: the leaves and stems, and the heads.
 */
export function flowers(seed = 1, height = 0.6, kind = 'daisy') {
  const k = FLOWERS[kind];
  const rand = seeded(seed);
  const c = palette(k.colors, (rand() - 0.5) * 0.02, 1 + (rand() - 0.5) * 0.08, ['petal', 'petalFoot', 'heart', 'heartTop']);
  const ramp = [c.shade, c.dark, c.mid, c.light];
  const tone = (t) => {
    const x = THREE.MathUtils.clamp(t, 0, 1) * 3;
    const i = Math.min(2, Math.floor(x));
    return ramp[i].clone().lerp(ramp[i + 1], x - i);
  };
  const m = mesher();
  // The heads are a mesh of their own, which glows (see the kinds); the leaves glow a little, to soften their shade.
  const hm = mesher();
  const turn = rand() * TAU;
  // A dark core, so the gaps between the leaves show deep green rather than the grass.
  const core = new THREE.Vector3(0, 0.18, 0);
  clump(m, rand, core, 0.26, seed * 31, { shade: c.shade, dark: c.shade, mid: c.dark, light: c.dark }, { mid: core, bottom: 0, top: 0.5, soft: 0.3 });
  // The leaves, a mound of them every way round: the inner ones from higher up and more upright, the outer ones low
  // and spreading; their faces turned up, coloured by how they face the sky and how far in they are.
  const n = FORM.leaves[0] + Math.floor(rand() * (FORM.leaves[1] - FORM.leaves[0] + 1));
  for (let i = 0; i < n; i++) {
    const v = (i + 0.5) / n;
    const a = turn + i * GOLDEN + (rand() - 0.5) * 0.3;
    const e = 1.3 - 0.85 * v + (rand() - 0.5) * 0.25;
    const along = new THREE.Vector3(Math.cos(a) * Math.cos(e), Math.sin(e), Math.sin(a) * Math.cos(e));
    const face = new THREE.Vector3(0, 1, 0).addScaledVector(along, -along.y).normalize().applyAxisAngle(along, (rand() - 0.5) * 0.8);
    const rb = 0.05 + 0.22 * v;
    const base = new THREE.Vector3(Math.cos(a) * rb, 0.4 - 0.32 * v, Math.sin(a) * rb);
    leaf(m, base, along, face, FORM.leaf * (1 - 0.15 * v) * (0.8 + rand() * 0.35), tone(0.28 + 0.4 * face.y + 0.3 * (1 - v) + (rand() - 0.5) * 0.25), FORM.wide);
  }
  // The heads, spread over a low dome, the middle ones highest, each on its stem from the foot of the clump; turned up
  // and to the camera, and a little out the way they lie, each a little its own way.
  const heads = k.heads[0] + Math.floor(rand() * (k.heads[1] - k.heads[0] + 1));
  const spin = rand() * TAU;
  for (let j = 0; j < heads; j++) {
    const a = spin + j * GOLDEN;
    const out = FORM.spread * Math.sqrt((j + 0.5) / heads) * (0.85 + rand() * 0.3);
    const R = k.head * (0.85 + rand() * 0.3);
    const C = new THREE.Vector3(Math.cos(a) * out, 1 - R * 0.5 - 0.35 * (out / FORM.spread) ** 2 - rand() * 0.1, Math.sin(a) * out);
    const F = FACING.clone().add(new THREE.Vector3(Math.cos(a), 0, Math.sin(a)).multiplyScalar(0.5 * (out / FORM.spread))).add(new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).multiplyScalar(0.5)).normalize();
    const foot = new THREE.Vector3(Math.cos(a) * 0.03, 0, Math.sin(a) * 0.03);
    const end = C.clone().addScaledVector(F, -R * 0.2);
    // Up from the foot, bending out towards the head.
    const path = [0, 0.35, 0.7, 1].map((t) => foot.clone().lerp(end, t ** 1.6).setY(end.y * t ** 0.85));
    tube(m, path, path.map((_, i) => FORM.stem * (1.1 - 0.3 * (i / 3))), { dark: c.dark, light: c.mid }, { sides: 4 });
    // Two leaves up the stem, either side, out and up a little, so the heads sit among leaves.
    for (const [t, side] of [[0.5, 1], [0.72, -1]]) {
      const b = (a + side * (0.7 + rand() * 0.5));
      const along = new THREE.Vector3(Math.cos(b), 0.35 + rand() * 0.3, Math.sin(b)).normalize();
      const face = new THREE.Vector3(0, 1, 0).addScaledVector(along, -along.y).normalize().applyAxisAngle(along, (rand() - 0.5) * 0.6);
      const at = foot.clone().lerp(end, t ** 1.6).setY(end.y * t ** 0.85);
      leaf(m, at, along, face, FORM.leaf * (0.6 + rand() * 0.25), tone(0.45 + 0.4 * face.y + (rand() - 0.5) * 0.2), FORM.wide);
    }
    head(hm, rand, C, F, R, k, c);
  }
  const group = new THREE.Group();
  for (const [mm, glow] of [[m, 0.12], [hm, k.glow]]) {
    const g = mm.geometry();
    g.scale(height, height, height);
    const material = glowing(SOFT_MATERIAL, glow);
    // Thin petals and leaves show either face.
    material.side = THREE.DoubleSide;
    const mesh = new THREE.Mesh(g, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }
  group.userData.height = height;
  return group;
}
