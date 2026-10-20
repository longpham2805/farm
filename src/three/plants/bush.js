// A bush as the reference design draws a few here and there, at the foot of a tree behind the hen yard and under the
// slim trees by the fields' fence: a low dome of leaves sitting on the grass, no stem showing, as the low-poly leafy
// trees the user found: big separate leaves laid over it like shingles, their tips down its slope, pale where the
// light falls on top, a deep green further down, over a dark core that fills the gaps between them.
import * as THREE from 'three';
import { seeded } from '../../util.js';
import { TAU, SOFT_MATERIAL, twoSided, mesher, palette } from './parts.js';
import { clump } from './roundTree.js';
import { leaf } from './birch.js';

/** Leaves: deep in the gaps, dark at its foot, mid on its sides, light on top. */
export const BUSH = { shade: '#0c3008', dark: '#1a5210', mid: '#3a8020', light: '#86c040' };

const GOLDEN = Math.PI * (3 - Math.sqrt(5));

/**
 * How it grows, in units of its height: a few lobes swelling out of it, each a ball ([how far out from its middle,
 * how high, how big]), the first in its middle and the others round it, a little turned and sized from bush to bush;
 * how many leaves over it ([least, most]), how long they are and how wide, of their length.
 */
const FORM = { lobes: [[0, 0.44, 0.48], [0.26, 0.32, 0.38], [0.26, 0.3, 0.36], [0.24, 0.34, 0.34]], leaves: [110, 130], leaf: 0.22, wide: 0.8 };

/** A bush `height` tall (world units), laid out by `seed`. Returns a mesh sitting on the ground at the origin. */
export function bush(seed = 1, height = 0.4, colors = BUSH) {
  const rand = seeded(seed);
  const c = palette(colors, (rand() - 0.5) * 0.03, 1 + (rand() - 0.5) * 0.12);
  const m = mesher();
  const turn = rand() * TAU;
  // Its lobes, the side ones spread round the middle one (two or three of them), each a ball.
  const sides = rand() < 0.5 ? 2 : 3;
  const lobes = FORM.lobes.slice(0, 1 + sides).map(([out, y, r], i) => {
    const a = turn + (i / sides) * TAU + (rand() - 0.5) * 0.8;
    return { c: new THREE.Vector3(Math.cos(a) * out, y + (rand() - 0.5) * 0.06, Math.sin(a) * out), r: r * (0.9 + rand() * 0.2) };
  });
  // A dark clump inside each lobe, so the gaps between the leaves show deep green rather than the grass.
  const deep = { shade: c.shade, dark: c.shade, mid: c.dark, light: c.dark };
  const mid = new THREE.Vector3(0, lobes[0].c.y, 0);
  lobes.forEach((l, i) => clump(m, rand, l.c, l.r * 0.85, seed * 31 + i, deep, { mid, bottom: 0, top: 1, soft: 0.3 }));
  // The leaves, spread every way round its middle and set where that way leaves the outermost lobe, each from a
  // little way in, its face out of the lobe and its tip down the slope, a little out from it; coloured by how they
  // face and how high they sit.
  const ramp = [c.shade, c.dark, c.mid, c.light];
  const tone = (t) => {
    const x = THREE.MathUtils.clamp(t, 0, 1) * 3;
    const i = Math.min(2, Math.floor(x));
    return ramp[i].clone().lerp(ramp[i + 1], x - i);
  };
  const from = new THREE.Vector3(0, 0.3, 0);
  const n = FORM.leaves[0] + Math.floor(rand() * (FORM.leaves[1] - FORM.leaves[0] + 1));
  for (let i = 0; i < n; i++) {
    const v = 1 - ((i + 0.5) / n) * 1.4;
    const ring = Math.sqrt(Math.max(0, 1 - v * v));
    const a = turn + i * GOLDEN + (rand() - 0.5) * 0.3;
    const d = new THREE.Vector3(Math.cos(a) * ring, v, Math.sin(a) * ring);
    // How far that way the lobes reach, and which one.
    let far = 0;
    let lobe = lobes[0];
    for (const l of lobes) {
      const q = l.c.clone().sub(from);
      const b = d.dot(q);
      const disc = b * b - q.lengthSq() + l.r * l.r;
      if (disc < 0) continue;
      const t = b + Math.sqrt(disc);
      if (t > far) [far, lobe] = [t, l];
    }
    const p = from.clone().addScaledVector(d, far);
    if (p.y < 0.03) continue;
    const normal = p.clone().sub(lobe.c).normalize();
    // Down the slope; at the very top, out the way it lies.
    const slope = new THREE.Vector3(0, -1, 0).addScaledVector(normal, normal.y);
    if (slope.lengthSq() < 0.04) slope.set(Math.cos(a), -0.2, Math.sin(a));
    const along = slope.normalize().multiplyScalar(0.9).addScaledVector(normal, 0.25).add(new THREE.Vector3(rand() - 0.5, (rand() - 0.5) * 0.4, rand() - 0.5).multiplyScalar(0.5)).normalize();
    const face = normal.clone().add(new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).multiplyScalar(0.35));
    face.addScaledVector(along, -face.dot(along)).normalize();
    const size = FORM.leaf * (0.8 + rand() * 0.4);
    const h = THREE.MathUtils.clamp(p.y, 0, 1);
    leaf(m, p.addScaledVector(along, -size * 0.35).addScaledVector(normal, -0.03), along, face, size, tone(0.3 + 0.4 * face.y + 0.3 * h + (rand() - 0.5) * 0.3), FORM.wide);
  }
  const g = m.geometry();
  g.scale(height, height, height);
  // Thin leaves show either face.
  const material = twoSided(SOFT_MATERIAL.clone());
  const mesh = new THREE.Mesh(g, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.height = height;
  return mesh;
}
