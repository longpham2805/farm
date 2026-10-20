// The farmhouse at the back left of the ring road, as the reference design draws it: walls of weatherboards painted
// cream on a stone footing, under a big roof of orange clay tiles, a brick chimney that smokes, blue shutters, a
// planter of flowers in front, and a porch on the right under a tiled roof of its own, with steps down to the yard.
//
// Modelled with its front to +z and its long side along x; placed, it turns to face the ring road, so the camera
// sees its front and its left end (-x). The back and the right end face away and are left plain.
import * as THREE from 'three';
import { BOX, GABLE, BALL, ICO, CYL10, GLASS, STONE, stoneFooting, tiledSlope } from './parts.js';
import { addNature } from '../nature.js';
import { seeded } from '../../util.js';

// Modelled small; it stands this much bigger.
const SIZE = 1.32;

const WALL = '#f7e6c8';
const BOARDS = ['#fff0d4', '#fae7c8'];
const CORNER = '#fffaf0';
const TILES = ['#ff6f3c', '#f56536', '#ff8049', '#f06a3a'];
const UNDERLAY = '#9c3f27';
const RIDGE = '#c24a2c';
const BARGE = '#7a4528';
const FRAME = '#c98a4b';
const SHUTTER = '#4f7cc4';
const SLAT = '#3f69ad';
const DOOR = '#7a4a2a';
const DECK = '#b5763f';
const POST = '#8a5530';
const BRICK = '#c4603e';
const BRICK_DARK = '#a14c31';

// Walls W long and D deep, H tall on a footing F tall; the roof rises R above the walls and reaches O past them.
const W = 1.75;
const D = 1.0;
const F = 0.12;
const H = 0.84;
const R = 0.44;
const O = 0.11;
const TOP = F + H;
const RIDGE_Y = TOP + R;
// The roof's eaves hang below the top of the walls, on the slope carried on past them.
const EAVE_Y = TOP - (R / (D / 2)) * O;
const EAVE_Z = D / 2 + O;

const BOARD = 0.07;

/** A window with a wooden frame, a cross of glazing bars, a sill and blue shutters, its middle at p, facing `turn`. */
function shuttered(batch, p, turn, w, h) {
  batch.push(...p, turn);
  batch.add(BOX, FRAME, [0, 0, 0.012], [w + 0.06, h + 0.06, 0.03]);
  batch.add(BOX, GLASS, [0, 0, 0.022], [w, h, 0.02]);
  batch.add(BOX, FRAME, [0, 0, 0.034], [0.022, h, 0.012]);
  batch.add(BOX, FRAME, [0, 0, 0.034], [w, 0.022, 0.012]);
  batch.add(BOX, FRAME, [0, -h / 2 - 0.04, 0.035], [w + 0.1, 0.03, 0.07]);
  const sw = Math.min(0.11, w * 0.42);
  for (const s of [-1, 1]) {
    const x = s * (w / 2 + 0.03 + sw / 2);
    batch.add(BOX, SHUTTER, [x, 0, 0.016], [sw, h + 0.06, 0.02]);
    for (let y = -h / 2 + 0.05; y < h / 2; y += 0.06) batch.add(BOX, SLAT, [x, y, 0.028], [sw - 0.03, 0.014, 0.006]);
  }
  batch.pop();
}

/** A window box of flowers, w long, its middle at (x, y) on the front wall. */
function flowerBox(batch, rand, x, y, w) {
  const z = D / 2 + 0.06;
  batch.add(BOX, '#9a6638', [x, y, z], [w, 0.08, 0.1]);
  for (let k = 0; k < Math.round(w / 0.07); k++) {
    const fx = x - w / 2 + 0.04 + k * 0.07;
    batch.add(ICO, k % 2 ? '#5cb546' : '#4ea53e', [fx, y + 0.06, z + (rand() - 0.5) * 0.03], 0.045, [rand(), rand(), 0], true);
    batch.add(BALL, ['#ff5a4f', '#fff3f0', '#ff8fc1', '#ff5a4f'][k % 4], [fx + 0.02, y + 0.09 + rand() * 0.02, z + 0.03], 0.026);
  }
}

/** The porch on the right of the front: a plank deck, steps, posts and railings, a door, a lamp and two pots. */
function porch(batch, rand) {
  const x0 = 0.08;
  const x1 = W / 2 + 0.04;
  const xm = (x0 + x1) / 2;
  const front = D / 2 + 0.46;
  const zm = (D / 2 + front) / 2;
  batch.add(BOX, DECK, [xm, F / 2, zm], [x1 - x0, F, front - D / 2]);
  for (let z = D / 2 + 0.035; z < front; z += 0.07) batch.add(BOX, '#a0652f', [xm, F + 0.002, z], [x1 - x0, 0.004, 0.012]);
  // Two steps down to the yard, stone below and wood on top.
  for (const [k, h] of [[0, F * 0.66], [1, F * 0.33]]) {
    batch.add(BOX, STONE, [xm + 0.04, h / 2, front + 0.06 + k * 0.1], [0.36, h, 0.1]);
    batch.add(BOX, DECK, [xm + 0.04, h - 0.006, front + 0.06 + k * 0.1], [0.36, 0.012, 0.1]);
  }
  // The door, in a frame of the same wood as the windows.
  const dx = xm + 0.04;
  const dh = 0.5;
  batch.add(BOX, FRAME, [dx, F + dh / 2 + 0.01, D / 2 + 0.012], [0.3, dh + 0.04, 0.03]);
  batch.add(BOX, DOOR, [dx, F + dh / 2, D / 2 + 0.022], [0.24, dh, 0.02]);
  for (const x of [-0.06, 0.06]) batch.add(BOX, '#673d22', [dx + x, F + dh / 2, D / 2 + 0.034], [0.012, dh - 0.04, 0.006]);
  batch.add(BALL, '#ffd36b', [dx + 0.08, F + dh * 0.48, D / 2 + 0.04], 0.018);
  // A lamp by the door, and a pot of leaves either side of it.
  batch.add(BOX, '#3d4148', [dx + 0.22, F + 0.46, D / 2 + 0.04], [0.06, 0.09, 0.06]);
  batch.add(BOX, '#ffe9a8', [dx + 0.22, F + 0.46, D / 2 + 0.072], [0.04, 0.06, 0.004]);
  for (const x of [x0 + 0.08, x1 - 0.06]) {
    batch.add(CYL10, '#c8673e', [x, F + 0.05, D / 2 + 0.08], [0.045, 0.1, 0.045]);
    batch.add(ICO, '#5cb546', [x, F + 0.13, D / 2 + 0.08], 0.065, [rand(), rand(), 0], true);
  }
  // Posts at the front corners, and railings along the left side and the front, leaving room for the steps.
  const postH = EAVE_Y - F - 0.18;
  for (const x of [x0 + 0.03, x1 - 0.03]) batch.add(BOX, POST, [x, F + postH / 2, front - 0.03], [0.05, postH, 0.05]);
  const rail = (ax, az, bx, bz) => {
    const len = Math.hypot(bx - ax, bz - az);
    const turn = Math.atan2(-(bz - az), bx - ax);
    batch.push((ax + bx) / 2, F, (az + bz) / 2, turn);
    batch.add(BOX, POST, [0, 0.2, 0], [len, 0.03, 0.035]);
    for (let t = -len / 2 + 0.05; t < len / 2 - 0.02; t += 0.07) batch.add(BOX, DECK, [t, 0.1, 0], [0.022, 0.18, 0.022]);
    batch.pop();
  };
  rail(x0 + 0.03, D / 2 + 0.02, x0 + 0.03, front - 0.03);
  rail(x0 + 0.03, front - 0.03, xm - 0.15, front - 0.03);
  // Its roof: tiles from just under the eaves of the house down to the posts.
  batch.push(xm, 0, 0);
  tiledSlope(batch, rand, { w: x1 - x0 + 0.1, z0: EAVE_Z - 0.06, y0: EAVE_Y - 0.03, z1: front + 0.06, y1: F + postH + 0.02, rows: 3, tones: TILES, under: UNDERLAY });
  batch.pop();
  // The roof's sides: a board under each end.
  for (const x of [x0 - 0.04, x1 + 0.04]) {
    const dz = front + 0.06 - (EAVE_Z - 0.06);
    const dy = F + postH + 0.02 - (EAVE_Y - 0.03);
    batch.add(BOX, BARGE, [x, (EAVE_Y + F + postH) / 2 - 0.01, (EAVE_Z + front) / 2], [0.03, 0.05, Math.hypot(dz, dy)], [Math.atan2(-dy, dz), 0, 0]);
  }
}

/**
 * Weatherboards over a wall that faces +z from the batch's origin, from y0 up to y1: rows of boards BOARD tall, each
 * tipped out at its foot so it laps over the one below. width(y) is how wide the wall is at height y.
 */
function boards(batch, width, y0, y1) {
  for (let y = y0, k = 0; y < y1 - 0.01; y += BOARD, k++) {
    const h = Math.min(BOARD, y1 - y);
    const w = width(y + h);
    if (w > 0.04) batch.add(BOX, BOARDS[k % 2], [0, y + h / 2, 0.009], [w, h + 0.006, 0.012], [-0.2, 0, 0]);
  }
}

/** A long wooden planter of red and white flowers on the ground in front of the house, left of the porch. */
function planter(batch, rand) {
  const x0 = -W / 2 + 0.05;
  const x1 = -0.06;
  const xm = (x0 + x1) / 2;
  const len = x1 - x0;
  const z = D / 2 + 0.2;
  const d = 0.2;
  const h = 0.13;
  for (const s of [-1, 1]) {
    batch.add(BOX, '#a8703f', [xm, h / 2, z + s * (d / 2 - 0.012)], [len, h, 0.024]);
    batch.add(BOX, '#a8703f', [xm + s * (len / 2 - 0.012), h / 2, z], [0.024, h, d]);
    // A seam between the two planks of each long side, and a rim along its top.
    batch.add(BOX, '#8a5a32', [xm, h / 2, z + s * (d / 2 + 0.001)], [len, 0.008, 0.006]);
    batch.add(BOX, '#7d4f2b', [xm, h + 0.006, z + s * (d / 2 - 0.012)], [len + 0.02, 0.016, 0.036]);
  }
  for (const x of [x0, x1]) for (const s of [-1, 1]) batch.add(BOX, '#7d4f2b', [x, (h + 0.02) / 2, z + s * (d / 2 - 0.006)], [0.034, h + 0.02, 0.034]);
  batch.add(BOX, '#5e3a24', [xm, h - 0.02, z], [len - 0.04, 0.02, d - 0.04]);
  const blooms = ['#ff4f45', '#fffaf2', '#ff4f45', '#ff8fc1', '#fffaf2', '#ffd23f'];
  for (let x = x0 + 0.05; x < x1 - 0.02; x += 0.07) {
    for (const dz of [-0.045, 0.045]) {
      const px = x + (rand() - 0.5) * 0.03;
      const pz = z + dz + (rand() - 0.5) * 0.02;
      batch.add(ICO, rand() < 0.5 ? '#5cb546' : '#4ea53e', [px, h + 0.02, pz], [0.05, 0.04, 0.05], [rand(), rand(), 0], true);
      batch.add(BALL, blooms[Math.floor(rand() * blooms.length)], [px + (rand() - 0.5) * 0.03, h + 0.07 + rand() * 0.03, pz + 0.01], 0.028);
    }
  }
}

/**
 * Builds the farmhouse into the batch, standing on the batch's origin, and returns the top of its chimney in the
 * batch's frame (the world, for a batch whose origin was pushed to where the house stands).
 */
export function farmhouse(batch) {
  const rand = seeded(3);
  batch.push(0, 0, 0, 0, SIZE);

  // Walls on a stone footing, and the gable ends up to the roof.
  batch.add(BOX, STONE, [0, F / 2, 0], [W + 0.04, F, D + 0.04]);
  stoneFooting(batch, W + 0.06, D + 0.06, F + 0.01, rand);
  batch.add(BOX, WALL, [0, F + H / 2, 0], [W, H, D]);
  batch.add(GABLE, WALL, [0, TOP, 0], [W, R, D]);
  // Weatherboards over the front, and over the left end up into its gable, with white boards at the corners.
  batch.push(0, 0, D / 2);
  boards(batch, () => W, F, TOP);
  batch.pop();
  batch.push(-W / 2, 0, 0, -Math.PI / 2);
  boards(batch, (y) => (y <= TOP ? D : D * (1 - (y - TOP) / R)), F, RIDGE_Y);
  batch.pop();
  for (const [x, z] of [[-W / 2, D / 2], [W / 2, D / 2], [-W / 2, -D / 2]]) batch.add(BOX, CORNER, [x, F + H / 2, z], [0.05, H, 0.05]);

  // The roof: two slopes of tiles from the ridge to the eaves, round ridge tiles along the top and a dark board
  // under the tiles' edge at each end.
  const width = W + 2 * O;
  for (const s of [1, -1]) tiledSlope(batch, rand, { w: width, z0: 0, y0: RIDGE_Y, z1: s * EAVE_Z, y1: EAVE_Y, tones: TILES, under: UNDERLAY });
  batch.add(CYL10, RIDGE, [0, RIDGE_Y + 0.035, 0], [0.06, width + 0.04, 0.06], [0, 0, Math.PI / 2]);
  for (let x = -width / 2 + 0.12; x < width / 2; x += 0.2) batch.add(CYL10, '#a83f26', [x, RIDGE_Y + 0.035, 0], [0.066, 0.025, 0.066], [0, 0, Math.PI / 2]);
  const slope = Math.atan2(RIDGE_Y - EAVE_Y, EAVE_Z);
  const slant = Math.hypot(RIDGE_Y - EAVE_Y, EAVE_Z);
  for (const x of [-width / 2, width / 2]) {
    for (const s of [1, -1]) {
      batch.add(BOX, BARGE, [x, (RIDGE_Y + EAVE_Y) / 2 + 0.01, (s * EAVE_Z) / 2], [0.035, 0.07, slant + 0.03], [s * slope, 0, 0]);
    }
  }

  // The chimney, at the left end on the back of the roof, with bands of darker brick and a cap.
  const cx = -0.6;
  const cz = -0.2;
  const ch = RIDGE_Y + 0.28 - TOP;
  batch.add(BOX, BRICK, [cx, TOP + ch / 2, cz], [0.2, ch, 0.2]);
  for (const y of [RIDGE_Y - 0.08, RIDGE_Y + 0.1]) batch.add(BOX, BRICK_DARK, [cx, y, cz], [0.205, 0.025, 0.205]);
  batch.add(BOX, BRICK_DARK, [cx, TOP + ch + 0.02, cz], [0.25, 0.05, 0.25]);
  batch.add(BOX, '#4a3328', [cx, TOP + ch + 0.046, cz], [0.13, 0.01, 0.13]);

  // Windows: one in the front left of the porch, one in the left end and a small one up in its gable.
  shuttered(batch, [-0.4, F + 0.47, D / 2], 0, 0.34, 0.3);
  flowerBox(batch, rand, -0.4, F + 0.24, 0.42);
  shuttered(batch, [-W / 2, F + 0.47, 0.03], -Math.PI / 2, 0.26, 0.28);
  shuttered(batch, [-W / 2, TOP + 0.16, 0], -Math.PI / 2, 0.12, 0.12);

  porch(batch, rand);
  planter(batch, rand);
  addNature(batch, 'PLANT_10_BroadleafPlant', [-W / 2 - 0.12, 0, 0.2], 0.26, 2);

  const chimney = new THREE.Vector3(cx, TOP + ch + 0.08, cz).applyMatrix4(batch.origin);
  batch.pop();
  return chimney;
}
