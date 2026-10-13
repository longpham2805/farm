// Where the hens live, behind the ring road's back left side, as the reference design draws it: a hen house of
// boards on short legs with a shingled roof, a little door with a ramp down to the yard and a white sign; a small
// coop beside it with a round window in its gable and straw inside; and the yard in front of them, fenced with
// rails all round, with a feeder, a water dish, straw and grass. The hens themselves are animals/chicken.js, let
// loose in the yard.
//
// Each hut is modelled with its door to +z, and the yard with its front to +z; placed, it turns a little right of
// facing the camera.
import * as THREE from 'three';
import { BOX, GABLE, BALL, cyl, tiledSlope } from './parts.js';
import { addNature } from '../nature.js';
import { seeded } from '../../util.js';

const BOARDS = '#dc9a62';
const SEAM = '#bf7f4a';
const TRIM = '#a8703f';
const DARK = '#3e2618';
const SHINGLES = ['#c7844f', '#b97748', '#d4915b', '#c07e4c'];
const UNDER = '#7a4c2c';
const FENCE = '#c48c57';
const DISC = cyl(1, 1, 16);

/** Boards across a wall w wide facing +z from the batch's origin, from y0 up to y1: seams every few centimetres. */
function seams(batch, w, y0, y1) {
  for (let y = y0 + 0.06; y < y1 - 0.02; y += 0.06) batch.add(BOX, SEAM, [0, y, 0.004], [w, 0.008, 0.006]);
}

/** A gable roof of shingles with its ridge along x: eaves at height y, w long, d deep, rising `rise`. */
function roof(batch, rand, { y, w, d, rise, rows }) {
  for (const s of [1, -1]) tiledSlope(batch, rand, { w, z0: 0, y0: y + rise, z1: (s * d) / 2, y1: y, rows, tones: SHINGLES, under: UNDER, tile: 0.13, jitter: 0.4, thick: 0.04, tilt: 0.12, wobble: 0.04 });
  batch.add(BOX, TRIM, [0, y + rise + 0.035, 0], [w + 0.02, 0.04, 0.06]);
  const slope = Math.atan2(rise, d / 2);
  const slant = Math.hypot(rise, d / 2);
  for (const x of [-w / 2, w / 2]) for (const s of [1, -1]) batch.add(BOX, TRIM, [x, y + rise / 2 + 0.01, (s * d) / 4], [0.03, 0.05, slant + 0.02], [s * slope, 0, 0]);
}

/** The hen house: boards on four short legs, its door on the right of its front, up a ramp from the yard. */
export function henHouse(batch) {
  const rand = seeded(31);
  const w = 0.95;
  const d = 0.66;
  const legs = 0.16;
  const h = 0.48;
  const top = legs + h;
  const rise = 0.3;
  for (const x of [-w / 2 + 0.05, w / 2 - 0.05]) for (const z of [-d / 2 + 0.05, d / 2 - 0.05]) batch.add(BOX, TRIM, [x, legs / 2, z], [0.06, legs, 0.06]);
  batch.add(BOX, BOARDS, [0, legs + h / 2, 0], [w, h, d]);
  batch.add(GABLE, BOARDS, [0, top, 0], [w, rise, d]);
  for (const [x, z] of [[-w / 2, d / 2], [w / 2, d / 2], [-w / 2, -d / 2]]) batch.add(BOX, TRIM, [x, legs + h / 2, z], [0.05, h, 0.05]);
  batch.push(0, 0, d / 2);
  seams(batch, w, legs, top);
  batch.pop();
  batch.push(-w / 2, 0, 0, -Math.PI / 2);
  seams(batch, d, legs, top);
  batch.pop();
  // The door, a sign beside it, and a ramp of planks with cleats down to the ground.
  const dx = 0.2;
  batch.add(BOX, TRIM, [dx, legs + 0.17, d / 2 + 0.012], [0.22, 0.26, 0.02]);
  batch.add(BOX, DARK, [dx, legs + 0.16, d / 2 + 0.02], [0.15, 0.2, 0.01]);
  batch.add(BOX, '#f6efe2', [-0.15, legs + 0.3, d / 2 + 0.014], [0.16, 0.11, 0.012]);
  batch.add(BOX, '#b8a88e', [-0.15, legs + 0.3, d / 2 + 0.021], [0.1, 0.012, 0.004]);
  const run = 0.42;
  const ramp = Math.atan2(legs + 0.06, run);
  batch.add(BOX, '#b98450', [dx, (legs + 0.06) / 2, d / 2 + run / 2], [0.14, 0.02, Math.hypot(run, legs + 0.06)], [ramp, 0, 0]);
  for (let t = 0.1; t < 0.95; t += 0.18) batch.add(BOX, TRIM, [dx, (legs + 0.06) * (1 - t) + 0.015, d / 2 + run * t], [0.14, 0.014, 0.014]);
  // A small vent in the left end.
  batch.add(BOX, TRIM, [-w / 2 - 0.01, legs + 0.32, 0], [0.02, 0.12, 0.16]);
  batch.add(BOX, DARK, [-w / 2 - 0.016, legs + 0.32, 0], [0.012, 0.08, 0.12]);
  roof(batch, rand, { y: top - 0.04, w: w + 0.14, d: d + 0.18, rise: rise + 0.05, rows: 4 });
}

/** The small coop: boards on the ground, its gable to the front with a round window, a doorway with straw. */
export function coop(batch) {
  const rand = seeded(37);
  const w = 0.5;
  const d = 0.56;
  const h = 0.36;
  const rise = 0.26;
  batch.add(BOX, BOARDS, [0, h / 2, 0], [w, h, d]);
  batch.add(GABLE, BOARDS, [0, h, 0], [d, rise, w], [0, Math.PI / 2, 0], true);
  for (const [x, z] of [[-w / 2, d / 2], [w / 2, d / 2], [-w / 2, -d / 2]]) batch.add(BOX, TRIM, [x, h / 2, z], [0.04, h, 0.04]);
  batch.push(0, 0, d / 2);
  seams(batch, w, 0, h);
  batch.pop();
  batch.push(-w / 2, 0, 0, -Math.PI / 2);
  seams(batch, d, 0, h);
  batch.pop();
  // The doorway with straw spilling out, and the round window up in the gable.
  batch.add(BOX, TRIM, [0.06, 0.13, d / 2 + 0.01], [0.2, 0.26, 0.02]);
  batch.add(BOX, DARK, [0.06, 0.12, d / 2 + 0.018], [0.14, 0.22, 0.01]);
  for (let k = 0; k < 4; k++) batch.add(BALL, k % 2 ? '#e8c45a' : '#f2d47a', [0.02 + k * 0.03, 0.03, d / 2 + 0.03 + (k % 2) * 0.03], [0.05, 0.025, 0.04]);
  batch.add(DISC, TRIM, [0, h + 0.1, d / 2 + 0.01], [0.075, 0.02, 0.075], [Math.PI / 2, 0, 0]);
  batch.add(DISC, DARK, [0, h + 0.1, d / 2 + 0.018], [0.05, 0.02, 0.05], [Math.PI / 2, 0, 0]);
  batch.push(0, 0, 0, Math.PI / 2);
  roof(batch, rand, { y: h - 0.03, w: d + 0.14, d: w + 0.14, rise: rise + 0.04, rows: 3 });
  batch.pop();
}

// The yard, square to the huts: HX either side of its middle and HZ in front and behind; fence posts at most POST
// apart, with two rails between them.
const HX = 1.05;
const HZ = 1.0;
const POST = 0.3;
const GRASS = ['PLANT_01_GrassShort', 'PLANT_02_GrassMedium', 'PLANT_03_GrassTall'];

/** A rail fence from (ax, az) to (bx, bz) in the batch's frame: posts at most POST apart, two rails between. */
function fence(batch, ax, az, bx, bz) {
  const len = Math.hypot(bx - ax, bz - az);
  const n = Math.ceil(len / POST);
  const turn = Math.atan2(-(bz - az), bx - ax);
  for (let k = 0; k <= n; k++) {
    const x = ax + ((bx - ax) * k) / n;
    const z = az + ((bz - az) * k) / n;
    batch.add(BOX, TRIM, [x, 0.18, z], [0.045, 0.36, 0.045]);
    batch.add(BOX, '#94603a', [x, 0.365, z], [0.055, 0.02, 0.055]);
  }
  batch.push((ax + bx) / 2, 0, (az + bz) / 2, turn);
  for (const y of [0.13, 0.28]) batch.add(BOX, FENCE, [0, y, 0.026], [len, 0.04, 0.022]);
  batch.pop();
}

/** A square bale of straw tied with two strings, w × h × d, at (x, y, z) in the batch's frame. */
function bale(batch, [x, y, z], turn, [w, h, d] = [0.3, 0.16, 0.2]) {
  batch.push(x, y, z, turn);
  batch.add(BOX, '#e6c35a', [0, h / 2, 0], [w, h, d]);
  batch.add(BOX, '#f0d272', [0, h + 0.002, 0], [w - 0.02, 0.004, d - 0.02]);
  for (const t of [-w / 4, w / 4]) batch.add(BOX, '#b8862e', [t, h / 2, 0], [0.012, h + 0.004, d + 0.004]);
  batch.pop();
}

/**
 * The hens' place, square in the batch's frame (its front to +z): a fenced yard with the hen house at the back on
 * the right and the small coop further forward on the left, a feeder, a water dish, straw about and grass round the
 * fence. Returns the front part of the yard, where the hens wander, as world points.
 */
export function henYard(batch) {
  const rand = seeded(41);
  // The huts, at the back inside the fence.
  batch.push(0.38, 0, -HZ + 0.42);
  henHouse(batch);
  batch.pop();
  batch.push(-HX + 0.33, 0, -0.22, 0, 0.85);
  coop(batch);
  batch.pop();

  // The fence all round, posts and rails.
  const corners = [[-HX, -HZ], [HX, -HZ], [HX, HZ], [-HX, HZ]];
  corners.forEach(([ax, az], k) => fence(batch, ax, az, ...corners[(k + 1) % 4]));

  // A feeder and a water dish, bales of straw stacked between the huts, and straw strewn about.
  batch.push(0.05, 0, 0.45, 0.25);
  for (const x of [-0.16, 0.16]) batch.add(BOX, TRIM, [x, 0.05, 0], [0.04, 0.1, 0.12]);
  batch.add(BOX, '#b98450', [0, 0.1, 0], [0.38, 0.07, 0.12]);
  batch.add(BOX, '#e8c45a', [0, 0.13, 0], [0.32, 0.01, 0.07]);
  batch.pop();
  batch.add(DISC, '#9aa3ad', [0.7, 0.025, 0.25], [0.11, 0.05, 0.11]);
  batch.add(DISC, '#7cc6ef', [0.7, 0.05, 0.25], [0.09, 0.004, 0.09]);
  bale(batch, [-0.3, 0, -HZ + 0.3], 0.1);
  bale(batch, [-0.12, 0, -HZ + 0.52], -0.35);
  bale(batch, [-0.24, 0.16, -HZ + 0.36], 0.5, [0.26, 0.14, 0.18]);
  for (let k = 0; k < 40; k++) {
    const x = (rand() - 0.5) * 2 * (HX - 0.1);
    const z = -0.2 + rand() * (HZ + 0.1);
    batch.add(BOX, rand() < 0.5 ? '#e8c45a' : '#d9b04a', [x, 0.004, z], [0.08 + rand() * 0.06, 0.006, 0.012], [0, rand() * Math.PI, 0]);
  }

  // Grass along the fence, outside it, thicker at the corners.
  const tuft = (x, z, s) => addNature(batch, GRASS[Math.floor(rand() * GRASS.length)], [x, 0, z], s, rand() * Math.PI * 2);
  for (const [x, z] of corners) {
    for (let k = 0; k < 3; k++) tuft(x * 1.06 + (rand() - 0.5) * 0.12, z * 1.08 + (rand() - 0.5) * 0.12, 0.22 + rand() * 0.1);
  }
  for (let k = 0; k < 18; k++) {
    const side = k % 4;
    const t = (rand() - 0.5) * 2;
    const [x, z] = [[t * HX, HZ + 0.08], [HX + 0.08, t * HZ], [t * HX, -HZ - 0.08], [-HX - 0.08, t * HZ]][side];
    tuft(x, z, 0.16 + rand() * 0.1);
  }

  // Where the hens may go: the yard in front of the huts, kept off the fence.
  return [[-HX + 0.7, -0.05], [-0.15, -0.05], [-0.15, -HZ + 0.9], [HX - 0.15, -HZ + 0.9], [HX - 0.15, HZ - 0.15], [-HX + 0.55, HZ - 0.15], [-HX + 0.55, HZ - 0.55], [-HX + 0.15, HZ - 0.55], [-HX + 0.15, 0.12], [-HX + 0.7, 0.12]]
    .map(([x, z]) => new THREE.Vector3(x, 0, z).applyMatrix4(batch.origin));
}
