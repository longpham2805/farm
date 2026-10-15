// A birch as the reference design draws them, two together by the river at the front left and one by the fields on
// the right, made as the low-poly tree the user found: a slender white trunk dashed across with black, more of it at
// its foot, forking into limbs that fork again and again out to thirty-odd twigs, the boughs showing all through an
// open crown; on the end of each twig a loose bunch of leaves, each a pointed oval folded down its middle and arched,
// a fresh green with soft shade, not yellow.
import * as THREE from 'three';
import { seeded } from '../../util.js';
import { TAU, SOFT_MATERIAL, mesher, palette, glowing, wood } from './parts.js';

/** Leaves: in the shade, dark, mid, in the light; the bark, in the sun and shade. */
export const BIRCH = { shade: '#3e7a2a', dark: '#529436', mid: '#6eb244', light: '#a2d45e', bark: '#f4f1ea', barkDark: '#c2beb4' };

const GOLDEN = Math.PI * (3 - Math.sqrt(5));

/**
 * How it grows, in units of its height: its crown, an egg round `middle` high `size` across and up, over whose outer
 * part `twigs` ([least, most]) twigs end (none underneath); its wood (see WOOD in parts.js): a straight, slender
 * trunk on short roots, its white bark dashed thinly with black, more of it at its foot; how many leaves to a twig
 * ([least, most]) and how long they are; and how much it glows in its own colours, to soften its shade (see glowing).
 */
const FORM = {
  middle: 0.68,
  size: [0.32, 0.27],
  twigs: [32, 38],
  wood: { fork: 0.3, trunk: [0.042, 0.032], tip: 0.006, roots: 5, flare: 0.45, kink: 0.14, twist: 0, sides: 8, soft: 0.35, ridges: 0, step: 0.014, marks: { colour: new THREE.Color('#3a3532'), chance: 0.45, run: [1, 3], low: 0.05 } },
  leaves: [8, 11],
  leaf: 0.115,
  glow: 0.15,
};

/**
 * One leaf from `base`, pointing along `along`, its face turned to `face` (square to `along`), `size` long: a pointed
 * oval, widest a little below its middle, folded down its middle so its halves rise a little to its edges, and arched
 * so its tip droops; coloured `col`, its two halves taking the light differently.
 */
function leaf(m, base, along, face, size, col) {
  const across = new THREE.Vector3().crossVectors(along, face).normalize();
  const width = size * 0.48;
  // Along the middle: how far, and how far the arch has dropped there; out to the edge: how far along, how wide there.
  const rib = [[0, 0], [0.3, 0.02], [0.62, 0.06], [1, 0.14]];
  const edge = [[0.16, 0.26], [0.45, 0.5], [0.76, 0.32]];
  const at = (s, drop, out, rise) => base.clone().addScaledVector(along, s * size).addScaledVector(face, (rise - drop) * size).addScaledVector(across, out * width);
  const arch = (s) => 0.14 * s * s;
  const mids = rib.map(([s, d]) => at(s, d, 0, 0));
  const facing = (a, b, c) => {
    const n = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a));
    return n.dot(face) < 0 ? n.negate() : n;
  };
  for (const side of [1, -1]) {
    const rim = edge.map(([s, w]) => at(s, arch(s), side * w, 0.08));
    for (const [a, b, c] of [[mids[0], rim[0], mids[1]], [mids[1], rim[0], rim[1]], [mids[1], rim[1], mids[2]], [mids[2], rim[1], rim[2]], [mids[2], rim[2], mids[3]]]) {
      m.tri(a, b, c, col, col, col, facing);
    }
  }
}

/** A birch `height` tall (world units), laid out by `seed`. Returns a mesh standing on its foot at the origin. */
export function birch(seed = 1, height = 2.4, colors = BIRCH) {
  const rand = seeded(seed);
  const c = palette(colors, (rand() - 0.5) * 0.03, 1 + (rand() - 0.5) * 0.1, ['bark', 'barkDark']);
  const m = mesher();
  // The twigs' ends, spread over the outer part of the egg, none underneath.
  const [across, up] = FORM.size;
  const middle = new THREE.Vector3(0, FORM.middle, 0);
  const n = FORM.twigs[0] + Math.floor(rand() * (FORM.twigs[1] - FORM.twigs[0] + 1));
  const turn = rand() * TAU;
  const tips = [];
  for (let i = 0; i < n; i++) {
    const y = 1 - (2 * (i + 0.5)) / n;
    if (y < -0.55) continue;
    const ring = Math.sqrt(1 - y * y);
    const a = turn + i * GOLDEN + (rand() - 0.5) * 0.5;
    const out = 0.72 + rand() * 0.28;
    tips.push(new THREE.Vector3(Math.cos(a) * ring * across * out, middle.y + y * up * out, Math.sin(a) * ring * across * out));
  }
  wood(m, rand, tips, { dark: c.barkDark, light: c.bark }, FORM.wood);
  // A loose bunch of leaves round each twig's end, spread out about the way out of the crown (and up a little), their
  // faces turned up to the light, tipped a little; coloured by how they face and how high they sit.
  const ramp = [c.shade, c.dark, c.mid, c.light];
  const tone = (t) => {
    const x = THREE.MathUtils.clamp(t, 0, 1) * 3;
    const i = Math.min(2, Math.floor(x));
    return ramp[i].clone().lerp(ramp[i + 1], x - i);
  };
  const lowest = middle.y - up;
  for (const tip of tips) {
    const out = tip.clone().sub(middle).normalize().add(new THREE.Vector3(0, 0.4, 0)).normalize();
    const e1 = new THREE.Vector3().crossVectors(out, Math.abs(out.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)).normalize();
    const e2 = new THREE.Vector3().crossVectors(out, e1);
    const count = FORM.leaves[0] + Math.floor(rand() * (FORM.leaves[1] - FORM.leaves[0] + 1));
    const spin = rand() * TAU;
    for (let j = 0; j < count; j++) {
      const a = spin + j * GOLDEN * 2;
      const tilt = 0.5 + 0.9 * Math.sqrt((j + 0.5) / count);
      const side = e1.clone().multiplyScalar(Math.cos(a)).addScaledVector(e2, Math.sin(a));
      const along = out.clone().multiplyScalar(Math.cos(tilt)).addScaledVector(side, Math.sin(tilt)).normalize();
      const face = new THREE.Vector3(0, 1, 0).addScaledVector(along, -along.y);
      if (face.lengthSq() < 0.01) face.copy(e1);
      face.normalize().applyAxisAngle(along, (rand() - 0.5) * 0.9);
      // Off the twig a little way back from its end and round it, not all from one point (a star of leaves).
      const base = tip.clone().addScaledVector(side, 0.02 + rand() * 0.025).addScaledVector(out, (rand() - 0.7) * 0.05).addScaledVector(along, 0.01);
      const h = THREE.MathUtils.clamp((base.y - lowest) / (2 * up), 0, 1);
      const t = 0.5 + 0.25 * face.y + 0.25 * (h - 0.5) + (rand() - 0.5) * 0.2;
      leaf(m, base, along, face, FORM.leaf * (0.8 + rand() * 0.4), tone(t));
    }
  }
  const g = m.geometry();
  g.scale(height, height, height);
  const material = glowing(SOFT_MATERIAL, FORM.glow);
  // Thin leaves show either face.
  material.side = THREE.DoubleSide;
  const mesh = new THREE.Mesh(g, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.height = height;
  return mesh;
}
