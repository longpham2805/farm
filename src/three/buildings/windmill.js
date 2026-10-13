// The windmill on the right of the ring road, as the reference design draws it: a tapering eight-sided tower of
// cream plaster with its stones showing through in patches, on a stone plinth, with a wooden door up two stone steps
// and small windows; a wooden cap roofed in shingles; and four lattice sails of brown frames and cream canvas that
// turn in the wind.
//
// Modelled with its door and sails to +z; placed, it turns a little left of facing the camera.
import * as THREE from 'three';
import { Batch } from '../batch.js';
import { BOX, GABLE, ICO, cyl, tiledSlope } from './parts.js';
import { seeded } from '../../util.js';

// The tower: R0 across at the foot (to the middle of a side) on a plinth P tall, tapering to R1 at the top, H tall.
const P = 0.1;
const H = 1.45;
const R0 = 0.64;
const R1 = 0.47;
const TOP = P + H;
const SIDES = 8;
// The cap's body, and where the sails turn.
const CAP_W = 0.98;
const CAP_D = 1.0;
const CAP_H = 0.16;
const CAP_RISE = 0.46;
const HUB = [0, TOP + 0.32, CAP_D / 2 + 0.06];
// Each sail: its stock reaches LEN from the hub, and its lattice runs from IN out to the end, SAIL wide.
const LEN = 1.3;
const IN = 0.26;
const SAIL = 0.36;

const PLASTER = '#fcf1dc';
const STONES = ['#c99e6c', '#b48659', '#d9b385', '#bf9466'];
const WOOD = '#9a6640';
const DARK_WOOD = '#6b4226';
const FRAME = '#7a4f32';
const CANVAS = ['#f5ecd8', '#ece0c8'];

// How far the middle of a side is from the axis at height y, and how far the sides lean in.
const apothem = (y) => (R0 + ((R1 - R0) * (y - P)) / H);
const LEAN = Math.atan2(R0 - R1, H);

/** Where a point on the side of the tower facing angle `a` (0 is +z) at height y is, and the side's frame there. */
function onSide(batch, a, y, out = 0) {
  const r = apothem(y) + out;
  batch.push(Math.sin(a) * r, y, Math.cos(a) * r, a);
}

/** Builds the windmill's tower and cap into the batch, and returns its sails, which turn on their own (see update). */
export function windmill(batch) {
  const rand = seeded(17);
  const corner = 1 / Math.cos(Math.PI / SIDES);

  // A plinth of grey stone and the plastered tower on it, a side of each to the front.
  batch.add(cyl(1, 1, SIDES).rotateY(Math.PI / SIDES), '#b8b0a0', [0, P / 2, 0], [(R0 + 0.08) * corner, P, (R0 + 0.08) * corner], null, true);
  batch.add(cyl(R1 * corner, R0 * corner, SIDES).rotateY(Math.PI / SIDES), PLASTER, [0, P + H / 2, 0], [1, H, 1], null, true);

  // Stones showing through the plaster in patches, on the sides the camera sees, lying in the tower's lean.
  for (let n = 0; n < 26; n++) {
    const side = Math.floor(rand() * 5) - 2;
    const a = (side * Math.PI * 2) / SIDES;
    // More of them low down, where the plaster has worn most.
    const y = P + 0.08 + rand() ** 1.6 * (H - 0.25);
    const across = (rand() - 0.5) * apothem(y) * 0.5;
    onSide(batch, a, y, 0.006);
    for (let k = 0, m = 2 + Math.floor(rand() * 4); k < m; k++) {
      const w = 0.07 + rand() * 0.07;
      batch.add(BOX, STONES[Math.floor(rand() * STONES.length)], [across + (k % 2) * 0.06 - 0.03 + (rand() - 0.5) * 0.03, (Math.floor(k / 2) - 0.5) * 0.065, 0], [w, 0.055, 0.02], [-LEAN, 0, 0]);
    }
    batch.pop();
  }

  // The door at the front, framed in wood, up two stone steps, and a small window over it and on the right.
  onSide(batch, 0, P, 0.01);
  batch.add(BOX, WOOD, [0, 0.26, 0], [0.32, 0.52, 0.03], [-LEAN, 0, 0]);
  batch.add(BOX, DARK_WOOD, [0, 0.24, 0.012], [0.24, 0.46, 0.02], [-LEAN, 0, 0]);
  for (const x of [-0.06, 0.06]) batch.add(BOX, '#5a361e', [x, 0.24, 0.024], [0.01, 0.42, 0.005], [-LEAN, 0, 0]);
  batch.pop();
  for (const [k, h] of [[0, P], [1, P / 2]]) batch.add(BOX, '#c4bcaa', [0, h / 2, R0 + 0.1 + k * 0.12], [0.44, h, 0.13]);
  for (const [a, y, w, h] of [[0, P + 0.85, 0.15, 0.2], [Math.PI / 2, P + 0.6, 0.12, 0.16], [Math.PI / 4, P + 1.15, 0.11, 0.15]]) {
    onSide(batch, a, y, 0.006);
    batch.add(BOX, '#cdbb9c', [0, 0, 0], [w + 0.07, h + 0.07, 0.02], [-LEAN, 0, 0]);
    batch.add(BOX, '#3a2a20', [0, 0, 0.008], [w, h, 0.02], [-LEAN, 0, 0]);
    batch.pop();
  }

  // The cap: a wooden curb on the tower, a body of boards, and a roof of shingles with its ridge front to back.
  batch.add(cyl(1, 1, 16), FRAME, [0, TOP + 0.03, 0], [R1 + 0.06, 0.06, R1 + 0.06]);
  batch.add(BOX, WOOD, [0, TOP + 0.06 + CAP_H / 2, 0], [CAP_W, CAP_H, CAP_D]);
  for (let x = -CAP_W / 2 + 0.06; x < CAP_W / 2; x += 0.1) batch.add(BOX, '#7a4c2f', [x, TOP + 0.06 + CAP_H / 2, CAP_D / 2 + 0.004], [0.012, CAP_H, 0.008]);
  const eave = TOP + 0.06 + CAP_H;
  batch.add(GABLE, WOOD, [0, eave, 0], [CAP_D, CAP_RISE, CAP_W], [0, Math.PI / 2, 0], true);
  const tones = ['#b0703f', '#9f6236', '#bf7c48', '#a86a3a'];
  batch.push(0, 0, 0, Math.PI / 2);
  for (const s of [1, -1]) {
    tiledSlope(batch, rand, { w: CAP_D + 0.12, z0: 0, y0: eave + CAP_RISE, z1: s * (CAP_W / 2 + 0.07), y1: eave - 0.05, rows: 4, tones, under: '#5a3620', tile: 0.15, jitter: 0.4, thick: 0.045, tilt: 0.14, wobble: 0.05 });
  }
  batch.pop();
  batch.add(BOX, '#6a3f24', [0, eave + CAP_RISE + 0.04, 0], [0.07, 0.05, CAP_D + 0.14]);
  const slope = Math.atan2(CAP_RISE + 0.05, CAP_W / 2 + 0.07);
  const slant = Math.hypot(CAP_RISE + 0.05, CAP_W / 2 + 0.07);
  for (const s of [-1, 1]) batch.add(BOX, '#5e3820', [(s * (CAP_W / 2 + 0.07)) / 2, eave + (CAP_RISE - 0.05) / 2 + 0.03, CAP_D / 2 + 0.065], [slant + 0.04, 0.05, 0.03], [0, 0, -s * slope]);
  // The windshaft out of the cap's front.
  batch.add(cyl(1, 1, 10), FRAME, [0, HUB[1], CAP_D / 2 + 0.02], [0.05, 0.12, 0.05], [Math.PI / 2, 0, 0]);

  // The sails, round their hub; the group returned stands at the hub, and its child turns.
  const sails = new Batch();
  sails.add(cyl(1, 0.8, 10), FRAME, [0, 0, 0.03], [0.1, 0.1, 0.1], [Math.PI / 2, 0, 0]);
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2;
    // Each arm laid out along +y, then turned into place about the hub.
    const part = (x, y, z, size, color) => {
      const c = Math.cos(a);
      const s = Math.sin(a);
      sails.add(BOX, color, [x * c - y * s, x * s + y * c, z], size, [0, 0, a]);
    };
    part(0, LEN / 2, 0.04, [0.06, LEN, 0.05], FRAME);
    const len = LEN - IN;
    const mid = IN + len / 2;
    part(SAIL + 0.03, mid, 0.05, [0.03, len, 0.03], FRAME);
    let row = 0;
    for (let y = IN; y < LEN; y += 0.13, row++) {
      part(0.03 + SAIL / 2 + 0.015, y, 0.05, [SAIL + 0.03, 0.025, 0.025], FRAME);
      if (y + 0.13 <= LEN + 0.001) part(0.03 + SAIL / 2, y + 0.065, 0.038, [SAIL - 0.01, 0.105, 0.008], CANVAS[(row + k) % 2]);
    }
    part(0.03 + SAIL / 2 + 0.015, LEN, 0.05, [SAIL + 0.03, 0.025, 0.025], FRAME);
  }
  const hub = new THREE.Group();
  batch.origin.clone().multiply(new THREE.Matrix4().makeTranslation(...HUB)).multiply(new THREE.Matrix4().makeRotationX(-0.08))
    .decompose(hub.position, hub.quaternion, hub.scale);
  hub.add(sails.build());

  // Grass and flowers round the foot of the tower.
  for (let k = 0; k < 7; k++) {
    const a = (rand() - 0.5) * 2.6;
    const r = R0 + 0.16 + rand() * 0.1;
    if (Math.abs(a) < 0.35) continue;
    batch.add(ICO, k % 2 ? '#5cb546' : '#4ea53e', [Math.sin(a) * r, 0.05, Math.cos(a) * r], [0.08, 0.05, 0.08], [rand(), rand(), 0], true);
    batch.add(ICO, ['#ffffff', '#ff8fc1', '#ffd23f'][k % 3], [Math.sin(a) * r, 0.1, Math.cos(a) * r + 0.02], 0.025, null, true);
  }
  return hub;
}
