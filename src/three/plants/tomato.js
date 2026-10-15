// Tomato plants, as the reference design draws a row of them on the grass behind the plots, beside the pig, along the
// ring road: low leafy plants, most tied to a wooden stake, a bright green, their leaves in bunches up a thin stem,
// small round tomatoes hanging under them, most ripe red, some orange, a few still green, and a few small yellow
// flowers.
import * as THREE from 'three';
import { seeded } from '../../util.js';
import { TAU, SOFT_MATERIAL, mesher, palette, tube } from './parts.js';
import { leaf } from './birch.js';

/** Leaves (shade, dark, mid, light), the stake (sun, shade), the tomatoes (ripe, turning, unripe), the flowers. */
export const TOMATO = { shade: '#1d5a12', dark: '#2f7e1a', mid: '#4fa82a', light: '#90d24a', stake: '#a57442', stakeDark: '#5c3a1e', ripe: '#e5321a', turning: '#f27c1c', unripe: '#a8c83a', flower: '#ffd83a' };

const GOLDEN = Math.PI * (3 - Math.sqrt(5));
const BALL = new THREE.IcosahedronGeometry(1, 1).toNonIndexed().attributes.position;

/**
 * How it grows, in units of its height: the stake's radius and how likely a plant is to have one; the stem's radius;
 * its bunches of leaves up the stem ([least, most], from how high to how high, how far out from it), how many leaves
 * to a bunch ([least, most]), how long and how wide (of their length); how many bunches have tomatoes under them, how many to a bunch ([least,
 * most]) and how big; how many flowers.
 */
const FORM = { stake: 0.018, staked: 0.6, stem: 0.014, bunches: [8, 10], low: 0.12, high: 0.8, out: [0.08, 0.18], leaves: [8, 10], leaf: 0.27, wide: 0.7, fruited: 3, fruit: [1, 3], tomato: 0.065, flowers: 3 };

/** One tomato plant `height` tall (world units), laid out by `seed`. Returns a mesh standing on its foot at the origin. */
export function tomato(seed = 1, height = 0.65, colors = TOMATO) {
  const rand = seeded(seed);
  const c = palette(colors, (rand() - 0.5) * 0.02, 1 + (rand() - 0.5) * 0.1, ['stake', 'stakeDark', 'ripe', 'turning', 'unripe', 'flower']);
  const m = mesher();
  const turn = rand() * TAU;
  // The stake, a little to one side of the stem, standing a little above the plant.
  if (rand() < FORM.staked) {
    const at = new THREE.Vector3(Math.cos(turn) * 0.03, 0, Math.sin(turn) * 0.03);
    tube(m, [at.clone().setY(-0.04), at.clone().setY(0.92)], [FORM.stake, FORM.stake * 0.9], { dark: c.stakeDark, light: c.stake }, { sides: 4 });
  }
  // The stem, wandering a little on its way up.
  const stem = [0, 0.3, 0.6, 0.9].map((y) => new THREE.Vector3((rand() - 0.5) * 0.04, y, (rand() - 0.5) * 0.04));
  tube(m, stem, stem.map((_, i) => FORM.stem * (1 - 0.4 * (i / 3))), { dark: c.shade, light: c.mid }, { sides: 5 });
  const along = (y) => {
    const i = Math.min(2, Math.floor(y / 0.3));
    return stem[i].clone().lerp(stem[i + 1], (y - i * 0.3) / 0.3);
  };
  // The bunches of leaves, round the stem a different way each, on a short stalk; each a rosette of pointed leaves
  // spread out and drooping, faces up, coloured by how they face and how high they sit.
  const ramp = [c.shade, c.dark, c.mid, c.light];
  const tone = (t) => {
    const x = THREE.MathUtils.clamp(t, 0, 1) * 3;
    const i = Math.min(2, Math.floor(x));
    return ramp[i].clone().lerp(ramp[i + 1], x - i);
  };
  const n = FORM.bunches[0] + Math.floor(rand() * (FORM.bunches[1] - FORM.bunches[0] + 1));
  const bunches = [];
  for (let i = 0; i < n; i++) {
    const y = FORM.low + (FORM.high - FORM.low) * (i / (n - 1)) + (rand() - 0.5) * 0.05;
    const a = turn + i * GOLDEN * 2 + (rand() - 0.5) * 0.6;
    const dir = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
    const from = along(y);
    const at = from.clone().addScaledVector(dir, FORM.out[0] + rand() * (FORM.out[1] - FORM.out[0])).setY(y + 0.04);
    tube(m, [from, at], [FORM.stem * 0.6, FORM.stem * 0.4], { dark: c.shade, light: c.mid }, { sides: 4 });
    bunches.push({ at, dir });
    const k = FORM.leaves[0] + Math.floor(rand() * (FORM.leaves[1] - FORM.leaves[0] + 1));
    const spin = rand() * TAU;
    for (let j = 0; j < k; j++) {
      const b = spin + (j / k) * TAU + (rand() - 0.5) * 0.5;
      const out = new THREE.Vector3(Math.cos(b), 0.3 - rand() * 0.7, Math.sin(b)).addScaledVector(dir, 0.4).normalize();
      const face = new THREE.Vector3(0, 1, 0).addScaledVector(out, -out.y).normalize().applyAxisAngle(out, (rand() - 0.5) * 0.8);
      const size = FORM.leaf * (0.75 + rand() * 0.4) * (1 - 0.3 * (y - FORM.low));
      leaf(m, at.clone().addScaledVector(out, 0.01), out, face, size, tone(0.1 + 0.45 * face.y + 0.35 * y + (rand() - 0.5) * 0.3), FORM.wide);
    }
  }
  // The tomatoes, hanging in ones to threes under a few of the bunches, towards their outer edge, where they show.
  const tomatoes = bunches.slice(0, -1).sort(() => rand() - 0.5).slice(0, FORM.fruited);
  for (const { at, dir } of tomatoes) {
    const count = FORM.fruit[0] + Math.floor(rand() * (FORM.fruit[1] - FORM.fruit[0] + 1));
    const roll = rand();
    const col = roll < 0.6 ? c.ripe : roll < 0.85 ? c.turning : c.unripe;
    for (let j = 0; j < count; j++) {
      const b = rand() * TAU;
      const r = FORM.tomato * (0.8 + rand() * 0.35);
      const p = at.clone().addScaledVector(dir, 0.1 + rand() * 0.05).add(new THREE.Vector3(Math.cos(b) * 0.05, -0.04 - j * 0.03 - rand() * 0.03, Math.sin(b) * 0.05));
      const shade = col.clone().lerp(new THREE.Color('#5a1008'), 0.35);
      for (let k = 0; k < BALL.count; k += 3) {
        const v = [0, 1, 2].map((d) => new THREE.Vector3().fromBufferAttribute(BALL, k + d));
        const mid = v[0].clone().add(v[1]).add(v[2]).normalize();
        const tint = col.clone().lerp(shade, THREE.MathUtils.clamp(0.5 - 0.6 * mid.y, 0, 1)).lerp(new THREE.Color('#fff2d8'), mid.y > 0.75 ? 0.25 : 0);
        const [pa, pb, pc] = v.map((q) => q.multiply(new THREE.Vector3(r, r * 0.85, r)).add(p));
        m.tri(pa, pb, pc, tint, tint, tint, () => mid);
      }
    }
  }
  // A few small yellow flowers among the upper bunches: five pointed petals round a darker eye.
  for (let i = 0; i < FORM.flowers; i++) {
    const { at, dir } = bunches[bunches.length - 1 - Math.floor(rand() * 3)];
    const p = at.clone().addScaledVector(dir, 0.05 + rand() * 0.04).add(new THREE.Vector3((rand() - 0.5) * 0.06, -0.01, (rand() - 0.5) * 0.06));
    const d = dir.clone().setY(0.6 + rand() * 0.6).normalize();
    const e1 = new THREE.Vector3().crossVectors(d, new THREE.Vector3(0, 1, 0)).normalize();
    const e2 = new THREE.Vector3().crossVectors(d, e1);
    const s = 0.035;
    const eye = p.clone().addScaledVector(d, -s * 0.15);
    for (let j = 0; j < 5; j++) {
      const b = (j / 5) * TAU;
      const pt = (x, r) => p.clone().addScaledVector(e1, Math.cos(b + x) * r * s).addScaledVector(e2, Math.sin(b + x) * r * s).addScaledVector(d, -r * s * 0.3);
      m.tri(eye, pt(-0.3, 0.45), pt(0, 1), c.flower.clone().multiplyScalar(0.8), c.flower, c.flower, () => d);
      m.tri(eye, pt(0, 1), pt(0.3, 0.45), c.flower.clone().multiplyScalar(0.8), c.flower, c.flower, () => d);
    }
  }
  const g = m.geometry();
  g.scale(height, height, height);
  const material = SOFT_MATERIAL.clone();
  // Thin leaves show either face.
  material.side = THREE.DoubleSide;
  const mesh = new THREE.Mesh(g, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.height = height;
  return mesh;
}

/**
 * A row of tomato plants `length` long along x (world units), round the origin, each about `height` tall and laid out
 * by `seed` and its place in the row; a little out of line, as planted by hand.
 */
export function tomatoRow(seed = 1, length = 2, height = 0.65) {
  const rand = seeded(seed * 101 + 7);
  const row = new THREE.Group();
  const n = Math.max(2, Math.round(length / 0.26));
  for (let i = 0; i < n; i++) {
    const plant = tomato(seed * 13 + i, height * (0.85 + rand() * 0.3));
    plant.position.set(-length / 2 + (length * (i + 0.5)) / n + (rand() - 0.5) * 0.08, 0, (rand() - 0.5) * 0.2);
    plant.rotation.y = rand() * TAU;
    row.add(plant);
  }
  return row;
}
