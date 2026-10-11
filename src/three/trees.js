// Stylised low-poly trees built in code: pines of stacked tiers, round trees whose crowns are clusters of leafy
// puffs, birches and bushes. Every face is painted lighter where it faces up and sits high, and darker underneath
// and low down, so the crowns look round and deep even on the side the sun does not reach.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { seeded } from '../util.js';

const TAU = Math.PI * 2;

/** Leaf and bark colours: light on top, mid on the sides, dark underneath. */
export const LEAVES = { light: '#a8dc5a', mid: '#5cb546', dark: '#2a7232' };
export const YELLOW_LEAVES = { light: '#cde46a', mid: '#8fc449', dark: '#47812f' };
export const DEEP_LEAVES = { light: '#8fd25a', mid: '#47a144', dark: '#1d5c2d' };
export const PINE_NEEDLES = { light: '#74bd5a', mid: '#43984b', dark: '#22653a' };
export const FRESH_PINE = { light: '#a2d660', mid: '#5dab4c', dark: '#2b6f37' };
export const BIRCH_LEAVES = { light: '#c2e56e', mid: '#84c751', dark: '#3e8637' };
export const BLOSSOM = { light: '#ffd9ea', mid: '#f59cc4', dark: '#c05a8a' };
const BARK = { light: '#9a6a44', mid: '#7a4f32', dark: '#4e3322' };
const BIRCH_BARK = { light: '#ffffff', mid: '#efebe2', dark: '#cfc8ba' };

/** A value in -0.5..0.5 that is the same for every copy of a corner, so faces meeting there stay joined when it moves. */
function cornerNoise(x, y, z, seed) {
  const s = Math.sin(Math.round(x * 1000) * 12.9898 + Math.round(y * 1000) * 78.233 + Math.round(z * 1000) * 37.719 + seed * 19.19) * 43758.5453;
  return s - Math.floor(s) - 0.5;
}

/** Keeps only the corners of a geometry, one copy per face, ready to be moved, painted and merged. */
function corners(g) {
  const out = g.index ? g.toNonIndexed() : g;
  for (const name of Object.keys(out.attributes)) if (name !== 'position') out.deleteAttribute(name);
  return out;
}

/**
 * Paints each face of a geometry from corners(): `light` where it faces up and sits near `top`, `dark` where it
 * faces down or sits near `bottom`, `mid` between. heightWeight: how much the height counts against the facing.
 */
function shade(g, { light, mid, dark }, bottom, top, heightWeight = 0.4) {
  const pos = g.attributes.position;
  const col = new Float32Array(pos.count * 3);
  const a = new THREE.Vector3();
  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();
  const colors = [dark, mid, light].map((c) => new THREE.Color(c));
  const out = new THREE.Color();
  for (let i = 0; i < pos.count; i += 3) {
    a.fromBufferAttribute(pos, i);
    ab.fromBufferAttribute(pos, i + 1).sub(a);
    ac.fromBufferAttribute(pos, i + 2).sub(a);
    const up = ab.cross(ac).normalize().y;
    const h = THREE.MathUtils.clamp(((pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3 - bottom) / (top - bottom), 0, 1);
    const t = THREE.MathUtils.clamp(0.5 + 0.42 * up + heightWeight * (h - 0.5), 0, 1);
    if (t < 0.5) out.copy(colors[0]).lerp(colors[1], t * 2);
    else out.copy(colors[1]).lerp(colors[2], t * 2 - 1);
    for (let k = 0; k < 3; k++) out.toArray(col, (i + k) * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}

/**
 * A lumpy ball of leaves of radius r round c: a faceted ball with its corners pushed in and out. lite: a ball of
 * twelve faces instead of eighty, for trees too far off to show the difference.
 */
function puff(c, r, seed, lite = false) {
  const g = corners(lite ? new THREE.DodecahedronGeometry(1, 0) : new THREE.IcosahedronGeometry(1, 1));
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const k = 1 + cornerNoise(x, y, z, seed) * 0.24;
    p.setXYZ(i, c.x + x * r * k, c.y + y * r * k * 0.86, c.z + z * r * k);
  }
  return g;
}

/** A tapering stem from `from` towards `to` (points), as thick as rFrom at its foot and rTo at its tip. */
function stem(from, to, rFrom, rTo, segments = 6) {
  const dir = new THREE.Vector3().subVectors(to, from);
  const g = corners(new THREE.CylinderGeometry(rTo, rFrom, dir.length(), segments, 1, true));
  g.translate(0, dir.length() / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()));
  g.translate(from.x, from.y, from.z);
  return g;
}

/** One tier of a pine: a cone whose middle sags in and whose ragged rim droops, turned `turn` about its axis. */
function tier(r, h, y, seed, turn) {
  const g = corners(new THREE.ConeGeometry(r, h, 9, 2, true));
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const py = p.getY(i);
    const z = p.getZ(i);
    if (py < -h / 2 + 1e-4) {
      const n = cornerNoise(x, py, z, seed);
      p.setXYZ(i, x * (1 + n * 0.22), py - (0.5 + n) * h * 0.16, z * (1 + n * 0.22));
    } else if (py < h / 2 - 1e-4) {
      p.setXYZ(i, x * 0.86, py + h * 0.05, z * 0.86);
    }
  }
  g.rotateY(turn);
  g.translate(0, y + h / 2, 0);
  return g;
}

/** Merges the painted parts, stands the tree `height` tall, and works out normals (one per face) and its reach. */
function finish(parts, height, puffs = []) {
  const g = mergeGeometries(parts, false);
  g.computeBoundingBox();
  const s = height / g.boundingBox.max.y;
  g.scale(s, s, s);
  g.computeVertexNormals();
  const pos = g.attributes.position;
  let reach = 0;
  for (let i = 0; i < pos.count; i++) reach = Math.max(reach, Math.hypot(pos.getX(i), pos.getZ(i)));
  return { geometry: g, reach, puffs: puffs.map(({ c, r }) => ({ c: c.clone().multiplyScalar(s), r: r * s })) };
}

/**
 * A pine of four or five stacked tiers on a short trunk, each tier light where the sun reaches its top and dark at
 * its drooping rim, so the tiers stand apart. Returns { geometry, reach }.
 */
export function pineTree(seed, height = 1.6, colors = PINE_NEEDLES) {
  const rand = seeded(seed);
  const parts = [shade(stem(new THREE.Vector3(0, -0.05, 0), new THREE.Vector3(0, 0.5, 0), 0.08, 0.05), BARK, 0, 0.5)];
  const tiers = 4 + (rand() < 0.4 ? 1 : 0);
  let y = 0.3;
  for (let i = 0; i < tiers; i++) {
    const t = i / (tiers - 1);
    const h = 0.68 - 0.24 * t;
    const cone = tier((0.5 - 0.3 * t) * (0.92 + rand() * 0.16), h, y, seed * 31 + i, rand() * TAU);
    parts.push(shade(cone, colors, y - h * 0.16, y + h, 1.1));
    y += h * (0.52 - 0.06 * t);
  }
  return finish(parts, height);
}

/**
 * A round leafy tree: a trunk forking into a crown of six to eight puffs (lite: cheaper puffs, see puff()).
 * Returns { geometry, reach, puffs }, the puffs' middles and sizes as drawn, for hanging fruit on.
 */
export function roundTree(seed, height = 1.5, colors = LEAVES, lite = false) {
  const rand = seeded(seed);
  const foot = new THREE.Vector3(0, -0.05, 0);
  const fork = new THREE.Vector3((rand() - 0.5) * 0.06, 0.58, (rand() - 0.5) * 0.06);
  const parts = [shade(stem(foot, fork, 0.1, 0.07), BARK, 0, 0.8)];
  const R = 0.42;
  const cy = 0.98;
  const puffs = [{ c: new THREE.Vector3(0, cy + R * 0.15, 0), r: R }];
  const n = 4 + Math.floor(rand() * 2);
  for (let k = 0; k < n; k++) {
    const a = (k / n) * TAU + rand() * 0.8;
    const d = R * (0.72 + rand() * 0.25);
    puffs.push({ c: new THREE.Vector3(Math.cos(a) * d, cy - R * 0.12 + rand() * R * 0.35, Math.sin(a) * d), r: R * (0.6 + rand() * 0.18) });
  }
  puffs.push({ c: new THREE.Vector3((rand() - 0.5) * R * 0.4, cy + R * 0.8, (rand() - 0.5) * R * 0.4), r: R * (0.55 + rand() * 0.12) });
  // Branches from the fork up into two of the side puffs.
  for (const k of [1, 3]) parts.push(shade(stem(fork, puffs[k].c.clone().multiplyScalar(0.7).setY(puffs[k].c.y - 0.05), 0.05, 0.03, 5), BARK, 0, 0.8));
  const bottom = Math.min(...puffs.map((p) => p.c.y - p.r));
  const top = Math.max(...puffs.map((p) => p.c.y + p.r));
  puffs.forEach((p, k) => parts.push(shade(puff(p.c, p.r, seed * 13 + k, lite), colors, bottom, top)));
  return finish(parts, height, puffs);
}

/** A birch: a slim white trunk marked with black, under a loose crown of light leaves. Returns { geometry, reach }. */
export function birchTree(seed, height = 1.8, lite = false) {
  const rand = seeded(seed);
  const parts = [shade(stem(new THREE.Vector3(0, -0.05, 0), new THREE.Vector3((rand() - 0.5) * 0.08, 1.15, 0), 0.065, 0.04), BIRCH_BARK, 0, 1)];
  // The black marks: short bands part of the way round the trunk, standing a little proud of it.
  for (let k = 0; k < 6; k++) {
    const y = 0.1 + k * 0.15 + rand() * 0.05;
    const r = 0.068 - y * 0.022;
    const band = new THREE.CylinderGeometry(r, r, 0.035, 6, 1, true, rand() * TAU, Math.PI * (0.6 + rand() * 0.6));
    band.translate(0, y, 0);
    parts.push(shade(corners(band), { light: '#4a4440', mid: '#33302d', dark: '#24211f' }, 0, 1));
  }
  const R = 0.32;
  const puffs = [[0, 1.36, 0, R], [0.18, 1.18, 0.1, R * 0.78], [-0.19, 1.22, -0.05, R * 0.74], [0.06, 1.56, -0.13, R * 0.72], [-0.09, 1.5, 0.16, R * 0.68]]
    .map(([x, y, z, r]) => ({ c: new THREE.Vector3(x + (rand() - 0.5) * 0.08, y, z + (rand() - 0.5) * 0.08), r }));
  puffs.forEach((p, k) => parts.push(shade(puff(p.c, p.r, seed * 17 + k, lite), BIRCH_LEAVES, 0.9, 1.85)));
  return finish(parts, height);
}

/** A low bush of three puffs. Returns { geometry, reach }. */
export function bush(seed, height = 0.42, colors = LEAVES, lite = false) {
  const rand = seeded(seed);
  const puffs = [[0, 0.2, 0, 0.3], [0.24, 0.14, 0.08, 0.22], [-0.22, 0.13, -0.06, 0.21]]
    .map(([x, y, z, r]) => ({ c: new THREE.Vector3(x, y + rand() * 0.04, z), r: r * (0.9 + rand() * 0.2) }));
  return finish(puffs.map((p, k) => shade(puff(p.c, p.r, seed * 7 + k, lite), colors, -0.05, 0.5)), height);
}

/**
 * n spots on the outside of a round tree's crown (see roundTree) for fruit to hang on, on the side facing `facing`
 * (an angle round the trunk, as atan2(z, x)): [point, outward normal] pairs.
 */
export function fruitSpots(puffs, n, rand, facing) {
  const out = [];
  // The side puffs, where fruit hangs; the top puff and the middle one stay bare.
  const sides = puffs.slice(1, -1);
  for (let k = 0; k < n; k++) {
    const { c, r } = sides[k % sides.length];
    const a = facing + (rand() - 0.5) * 2.2;
    const tilt = (rand() - 0.6) * 0.9;
    const dir = new THREE.Vector3(Math.cos(a) * Math.cos(tilt), Math.sin(tilt), Math.sin(a) * Math.cos(tilt));
    out.push([c.clone().addScaledVector(dir, r * 0.9), dir]);
  }
  return out;
}
