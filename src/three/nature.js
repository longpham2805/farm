// Grass, flowers, rocks, logs and fences built from Cenji's LowPoly Nature pack models in natureModels.js,
// repainted in the game's brighter colours.
import * as THREE from 'three';
import { NATURE_MODELS } from './natureModels.js';

/** The pack's colours by name, in the game's palette. */
export const PALETTE = {
  // Grass and leaves
  Grass: '#82cc56', GrassLight: '#b2e276', Moss: '#7cb84e', Leaf: '#4fae52', LeafDark: '#3f9a4a', LeafLight: '#72c75e',
  LeafFresh: '#a6d65a', Pine: '#3f9a5a', PineDark: '#2f7f4c', PineLight: '#5cb466',
  // Flowers and mushrooms
  White: '#fff6ea', Yellow: '#ffd23f', Purple: '#b48aff', Blue: '#7ab8ff', Red: '#ff6b5a',
  MushStem: '#f4e9cf', MushGill: '#d9c4a0', MushBrown: '#c58a5a',
  // Wood
  Bark: '#7a4f32', BarkLight: '#9a6c48', BarkDark: '#5e3a26', CutWood: '#e8c48e', HeartWood: '#c9945c',
  Wood: '#b07a48', WoodLight: '#d39a5c', Weathered: '#a8a08c', Rope: '#d9c4a0', Birch: '#f4efe4', BirchScar: '#6c6660',
  // Stone and ground
  Rock: '#bdb6a8', RockLight: '#d6d0c2', RockDark: '#a39d91', WetRock: '#7f8f8c',
  Dirt: '#c49a6c', DirtLight: '#d2a874', Mud: '#9b7650', Sand: '#e3c98f',
  // The rest
  Metal: '#6f7a80', Lantern: '#ffd36b', Ember: '#ff7a3a', Seed: '#a8703f',
  Water: '#5cc6f6', WaterDeep: '#3fa9e0', Foam: '#ffffff',
};

/** Size of a model as made, in metres: { width (x), height (y), depth (z) }. */
export function natureSize(name) {
  const { v } = NATURE_MODELS[name];
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < v.length; i++) {
    min[i % 3] = Math.min(min[i % 3], v[i]);
    max[i % 3] = Math.max(max[i % 3], v[i]);
  }
  return { width: (max[0] - min[0]) / 1000, height: (max[1] - min[1]) / 1000, depth: (max[2] - min[2]) / 1000 };
}

/**
 * A model as a vertex-coloured geometry (position, normal, color), `scale` times its size as made.
 * Non-indexed, so every face keeps its own colour and normal. colors: replacements for PALETTE entries.
 */
export function natureGeometry(name, scale = 1, colors = {}) {
  const { m, v, t, c } = NATURE_MODELS[name];
  const paint = m.map((n) => new THREE.Color(colors[n] ?? PALETTE[n] ?? '#ff00ff'));
  const pos = new Float32Array(t.length * 3);
  const col = new Float32Array(t.length * 3);
  const s = scale / 1000;
  let k = 0;
  for (let r = 0; r < c.length; r += 2) {
    const color = paint[c[r]];
    for (const end = k + c[r + 1] * 3; k < end; k++) {
      const i = t[k] * 3;
      pos.set([v[i] * s, v[i + 1] * s, v[i + 2] * s], k * 3);
      col.set([color.r, color.g, color.b], k * 3);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}

const made = new Map();

/** natureGeometry at the size as made, built once and shared: place copies of it with Batch.add and a scale. */
export function natureModel(name, colors = {}) {
  const key = name + JSON.stringify(colors);
  if (!made.has(key)) made.set(key, natureGeometry(name, 1, colors));
  return made.get(key);
}

/**
 * Adds a model to a Batch at p, scaled by s (a number or [x, y, z]) and turned by the Euler angles r. It goes in
 * smooth-shaded, lit by its own face normals: flat shading works the normals out per pixel instead, and on the
 * thinnest slivers of the flower heads that gives NaN, which the glow spreads into a white haze.
 */
export function putNature(batch, name, p, s = 1, r = null, colors) {
  batch.add(natureModel(name, colors), null, p, s, r, false);
}

/** Adds a model to a Batch: standing at p, `s` times its size as made and turned `turn` about y. */
export function addNature(batch, name, p, s = 1, turn = 0, colors) {
  putNature(batch, name, p, s, [0, turn, 0], colors);
}

/**
 * A rail fence from `from` to `to` (world points on flat ground) in `color`, with paler post tops and rails:
 * sections about 1.1 long between posts, `height` tall. broken: which sections have a fallen rail.
 * Returns where its posts stand.
 */
export function railFence(batch, from, to, color, { height = 0.5, broken = [] } = {}) {
  const c = new THREE.Color(color);
  const pale = (k) => `#${c.clone().lerp(new THREE.Color('#fff3dc'), k).getHexString()}`;
  const colors = { Wood: color, WoodLight: pale(0.3), Weathered: pale(0.15) };
  const dir = new THREE.Vector3().subVectors(to, from).setY(0);
  const n = Math.max(1, Math.round(dir.length() / 1.1));
  const s = height / 1.35;
  const posts = [];
  // A section runs 3 m along x, from a post at its start to one at its end.
  for (let i = 0; i <= n; i++) {
    const p = from.clone().addScaledVector(dir, i / n);
    posts.push(p);
    if (i === n) break;
    const name = broken.includes(i) ? 'PROP_07_FenceBroken' : 'PROP_05_FenceStraight';
    putNature(batch, name, [p.x, p.y, p.z], [dir.length() / n / 3, s, s], [0, Math.atan2(-dir.z, dir.x), 0], colors);
  }
  return posts;
}

/** Flat stepping stones about every 0.28 along the points of `path` (world points), for a footpath. */
export function steppingStones(batch, path, groundY = () => 0) {
  let k = 0;
  for (let i = 1; i < path.length; i++) {
    const dir = new THREE.Vector3().subVectors(path[i], path[i - 1]).setY(0);
    const n = Math.max(1, Math.round(dir.length() / 0.28));
    const side = new THREE.Vector3(-dir.z, 0, dir.x).normalize();
    for (let j = i === 1 ? 0 : 1; j <= n; j++, k++) {
      // A little to either side by turns, and each turned its own way.
      const p = path[i - 1].clone().addScaledVector(dir, j / n).addScaledVector(side, (k % 2 ? 1 : -1) * 0.03);
      putNature(batch, 'ROCK_14_SteppingStone', [p.x, groundY(p.x, p.z) - 0.012, p.z], 0.19 + (k % 3) * 0.015, [0, k * 2.1, 0]);
    }
  }
}
