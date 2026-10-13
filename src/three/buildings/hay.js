// Hay about the farmyard, as the reference design draws it: a wooden cart heaped with hay beside the hen yard, a
// round bale at the barn's front corner, and a haystack of two tiers round a pole beside the silo. The hay is drawn
// as straw: hundreds of strands in golden yellows on a texture with a bump to it, lying the way the straw would
// (down a stack, round a bale, every which way on a cart), with loose straws sticking out of it and scraps of straw
// fallen round it on the ground (strawScraps, for anywhere else hay lies about too).
//
// Each returns its hay as a group of its own, standing where the batch's origin is; the wood goes into the batch.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { BOX, cyl } from './parts.js';
import { seeded } from '../../util.js';

const WOOD = '#b5723c';
const DARK = '#7f4c28';
const STRAWS = ['#f2cd5e', '#f7d978', '#e6bf50', '#d9ad45'];
const STRANDS = ['#f8db80', '#e8bd52', '#fbe7a6', '#d4a03c', '#efc865', '#c7922f'];

const textures = {};

/**
 * Straw on a canvas, repeating: strands lying `along` (up the picture, v), `across` (along it, u), `tangle`d every
 * which way, or in `rings` round its middle, for a bale's ends.
 */
function strawTexture(kind) {
  if (textures[kind]) return textures[kind];
  const size = 256;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const rand = seeded(kind.length * 97);
  g.fillStyle = '#c89a3c';
  g.fillRect(0, 0, size, size);
  g.lineCap = 'round';
  if (kind === 'rings') {
    for (let r = 4; r < size * 0.72; r += 3 + rand() * 3) {
      g.strokeStyle = STRANDS[Math.floor(rand() * STRANDS.length)];
      g.lineWidth = 1.5 + rand() * 2;
      g.beginPath();
      g.arc(size / 2, size / 2, r, rand() * 6, rand() * 6 + 4 + rand() * 2);
      g.stroke();
    }
  } else {
    const main = kind === 'along' ? Math.PI / 2 : 0;
    for (let k = 0; k < 1400; k++) {
      const a = kind === 'tangle' ? rand() * Math.PI : main + (rand() - 0.5) * 0.45;
      const len = 14 + rand() * 40;
      const x = rand() * size;
      const y = rand() * size;
      g.strokeStyle = k % 9 === 0 ? 'rgba(150, 105, 35, 0.6)' : STRANDS[Math.floor(rand() * STRANDS.length)];
      g.lineWidth = 1 + rand() * 1.8;
      // Drawn again a picture's width or height away, so the strands run on across its edges.
      for (const [ox, oy] of [[0, 0], [-size, 0], [0, -size], [size, 0], [0, size]]) {
        g.beginPath();
        g.moveTo(x + ox, y + oy);
        g.lineTo(x + ox + Math.cos(a) * len, y + oy + Math.sin(a) * len);
        g.stroke();
      }
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  textures[kind] = tex;
  return tex;
}

/** A straw material: the texture of `kind` repeated `repeat` times, its strands raised by a bump. */
function straw(kind, repeat, flatShading = false) {
  const map = strawTexture(kind).clone();
  map.repeat.set(...repeat);
  return new THREE.MeshStandardMaterial({ map, bumpMap: map, bumpScale: 2.5, roughness: 0.95, flatShading });
}

/** A group standing where the batch's origin is, for the hay. */
function stands(batch) {
  const group = new THREE.Group();
  batch.origin.decompose(group.position, group.quaternion, group.scale);
  return group;
}

function mesh(geometry, material, p, r = [0, 0, 0]) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(...p);
  m.rotation.set(...r);
  m.castShadow = m.receiveShadow = true;
  m.userData.ownMaterial = true;
  return m;
}

/** Loose straws sticking out from p (in the batch's frame), pointing out along `out`, n of them about `spread`. */
function straws(batch, rand, [x, y, z], out, spread, n) {
  for (let k = 0; k < n; k++) {
    const len = 0.06 + rand() * 0.07;
    const px = x + (rand() - 0.5) * spread;
    const py = y + (rand() - 0.5) * spread;
    const pz = z + (rand() - 0.5) * spread;
    // Lying out along `out`, tipped every which way.
    const yaw = Math.atan2(out[0], out[2]) + (rand() - 0.5) * 1.2;
    const pitch = Math.PI / 2 - Math.atan2(out[1], Math.hypot(out[0], out[2])) + (rand() - 0.5) * 1.0;
    batch.push(px, py, pz, yaw);
    batch.add(BOX, STRAWS[k % STRAWS.length], [0, 0, 0], [0.005, len, 0.005], [pitch, 0, 0]);
    batch.pop();
  }
}

/**
 * Scraps of straw on the ground round hay: single straws lying every which way and small tufts of a few together,
 * scattered over a ring from r0 to r1 round (x, z) in the batch's frame, thicker near the hay; n of them.
 */
export function strawScraps(batch, rand, [x, z], r0, r1, n) {
  for (let k = 0; k < n; k++) {
    const a = rand() * Math.PI * 2;
    const d = r0 + (r1 - r0) * rand() ** 1.6;
    const px = x + Math.sin(a) * d;
    const pz = z + Math.cos(a) * d;
    const many = k % 5 === 0 ? 4 : 1;
    for (let j = 0; j < many; j++) {
      const len = 0.05 + rand() * 0.07;
      // Lying flat, or in a tuft leaning up off the ground a little.
      const lean = many > 1 ? 0.25 + rand() * 0.4 : rand() * 0.12;
      batch.push(px + (rand() - 0.5) * 0.03, 0.004, pz + (rand() - 0.5) * 0.03, rand() * Math.PI * 2);
      batch.add(BOX, STRAWS[Math.floor(rand() * STRAWS.length)], [0, Math.sin(lean) * len * 0.5, 0], [0.009, 0.005, len], [-lean, 0, 0]);
      batch.pop();
    }
  }
}

/** A cart wheel in the x-y plane, radius r: a rim, spokes and a hub. */
function wheel(batch, r) {
  batch.add(new THREE.TorusGeometry(r, 0.028, 6, 20), DARK, [0, 0, 0], 1);
  for (let k = 0; k < 8; k++) batch.add(BOX, '#94603a', [0, 0, 0], [0.022, r * 2 - 0.02, 0.018], [0, 0, (k * Math.PI) / 8]);
  batch.add(cyl(1, 1, 10), '#6b3f22', [0, 0, 0], [0.05, 0.07, 0.05], [Math.PI / 2, 0, 0]);
}

/**
 * The hay cart: a bed of planks with flared sides on two big spoked wheels, its shafts reaching out behind (+x) and
 * a leg under its front, heaped with hay with straws sticking out.
 */
export function cart(batch) {
  const rand = seeded(53);
  const L = 0.9;
  const Wd = 0.52;
  const bed = 0.34;
  // The bed: a floor, sides of two boards flared out a little, ends, and posts at the corners.
  batch.add(BOX, '#a8673a', [0, bed, 0], [L, 0.04, Wd]);
  for (const s of [-1, 1]) {
    for (const [y, h] of [[bed + 0.06, 0.08], [bed + 0.145, 0.08]]) batch.add(BOX, WOOD, [0, y, s * (Wd / 2 + 0.01 + (y - bed) * 0.15)], [L, h - 0.008, 0.03], [s * 0.15, 0, 0]);
    batch.add(BOX, WOOD, [s * (L / 2), bed + 0.1, 0], [0.03, 0.16, Wd], [0, 0, -s * 0.12]);
    for (const e of [-1, 1]) batch.add(BOX, DARK, [e * (L / 2 - 0.02), bed + 0.1, s * (Wd / 2 + 0.02)], [0.045, 0.2, 0.045], [s * 0.15, 0, 0]);
  }
  // The axle and the wheels on it, either side, a little behind the middle.
  const wr = 0.27;
  batch.add(cyl(1, 1, 8), DARK, [0.06, wr, 0], [0.03, Wd + 0.2, 0.03], [Math.PI / 2, 0, 0]);
  for (const s of [-1, 1]) {
    batch.push(0.06, wr, s * (Wd / 2 + 0.09));
    wheel(batch, wr);
    batch.pop();
  }
  // The shafts out behind, and a leg under the front.
  for (const s of [-1, 1]) batch.add(BOX, '#9a6038', [L / 2 + 0.3, bed - 0.04, s * 0.17], [0.7, 0.035, 0.035], [0, 0, -0.12]);
  batch.add(BOX, '#9a6038', [L / 2 + 0.6, bed - 0.08, 0], [0.035, 0.035, 0.36]);
  batch.add(BOX, DARK, [-L / 2 + 0.06, bed / 2, 0], [0.04, bed, 0.04]);
  // The hay: a soft heap above the sides, a smaller one on top, and straws sticking out all round.
  const hay = stands(batch);
  hay.add(mesh(new RoundedBoxGeometry(L - 0.12, 0.3, Wd - 0.06, 3, 0.11), straw('tangle', [2, 1]), [0, bed + 0.2, 0]));
  hay.add(mesh(new RoundedBoxGeometry(L - 0.3, 0.12, Wd - 0.18, 3, 0.05), straw('tangle', [1.5, 1]), [0.02, bed + 0.36, 0], [0, 0.15, 0]));
  for (let k = 0; k < 18; k++) {
    const a = rand() * Math.PI * 2;
    const p = [Math.cos(a) * (L / 2 - 0.08), bed + 0.24 + rand() * 0.14, Math.sin(a) * (Wd / 2 - 0.05)];
    straws(batch, rand, p, [Math.cos(a), 0.4, Math.sin(a)], 0.04, 2);
  }
  // Straw fallen from it, under it and round it.
  strawScraps(batch, rand, [0, 0], 0.05, 0.7, 40);
  return hay;
}

/** A round bale lying on its side, its ends across x: straw rolled round, rings on its ends, twine and loose straws. */
export function hayBale(batch) {
  const rand = seeded(59);
  const r = 0.26;
  const len = 0.42;
  const hay = stands(batch);
  const ends = straw('rings', [1, 1]);
  hay.add(mesh(new THREE.CylinderGeometry(r, r, len, 28), [straw('across', [3, 1]), ends, ends], [0, r, 0], [0, 0, Math.PI / 2]));
  // Bands of twine round it, and loose straws on its round side and at its ends' edges.
  for (const x of [-0.09, 0.09]) batch.add(new THREE.TorusGeometry(r + 0.004, 0.006, 4, 24), '#a8823a', [x, r, 0], 1, [0, Math.PI / 2, 0]);
  for (let k = 0; k < 22; k++) {
    const a = rand() * Math.PI * 2;
    const x = k < 14 ? (rand() - 0.5) * len : (k % 2 ? 1 : -1) * (len / 2);
    straws(batch, rand, [x, r + Math.cos(a) * r, Math.sin(a) * r], [k < 14 ? 0 : Math.sign(x), Math.cos(a), Math.sin(a)], 0.02, 1);
  }
  strawScraps(batch, rand, [0, 0], 0.28, 0.65, 30);
  return hay;
}

/** A haystack of two tiers round a pole: a faceted, bulging drum of straw, a band where the cap sits, and the cap. */
export function haystack(batch) {
  const rand = seeded(61);
  const lathe = (pts, segments) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), segments);
  const hay = stands(batch);
  hay.add(mesh(lathe([[0.0, 0], [0.4, 0], [0.47, 0.18], [0.46, 0.38], [0.4, 0.56], [0.0, 0.56]], 12), straw('along', [4, 1], true), [0, 0, 0]));
  hay.add(mesh(lathe([[0.0, 0.5], [0.42, 0.52], [0.4, 0.68], [0.31, 0.86], [0.16, 1.0], [0.03, 1.07], [0.0, 1.07]], 12), straw('along', [4, 1], true), [0, 0, 0]));
  batch.add(new THREE.TorusGeometry(0.41, 0.025, 5, 24), '#c99a38', [0, 0.56, 0], 1, [Math.PI / 2, 0, 0]);
  batch.add(cyl(0.025, 0.03, 6), '#7a4f32', [0, 1.1, 0], [1, 0.3, 1]);
  // Loose straws on its sides, hanging out and down, thickest round its foot and under the cap's edge.
  for (let k = 0; k < 40; k++) {
    const a = rand() * Math.PI * 2;
    const y = k < 16 ? 0.02 + rand() * 0.08 : k < 26 ? 0.5 + rand() * 0.06 : 0.1 + rand() * 0.85;
    const r = (y < 0.56 ? 0.46 - Math.abs(y - 0.28) * 0.2 : 0.42 - (y - 0.56) * 0.7) + 0.005;
    straws(batch, rand, [Math.sin(a) * r, y, Math.cos(a) * r], [Math.sin(a), -0.3, Math.cos(a)], 0.02, 1);
  }
  strawScraps(batch, rand, [0, 0], 0.48, 0.9, 45);
  return hay;
}
