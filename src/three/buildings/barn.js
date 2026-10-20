// The big red barn behind the ring road's back corner, as the reference design draws it: boarded red walls with
// white corners and trim, its gable end to the front with both doors swung open on a dark doorway and a loft door
// above, a gambrel roof of wooden shingles (steep below, gentler above) with a log along the ridge and an open
// chimney, and small windows down its right side. Through the doorway shows a plank floor with hay, bales and a
// crate. Its walls and
// roof take the farm's colours (theme.barn, theme.roof), so a friend's barn looks like their own.
//
// Modelled with its doors to +z and its ridge along z; placed, it turns a little left of facing the camera, so the
// camera sees its front and its right side (+x). The back and the left side face away and are left plain.
import * as THREE from 'three';
import { Batch } from '../batch.js';
import { BOX, BALL, CYL10, STONE, prismGeometry, tiledSlope } from './parts.js';
import { addNature } from '../nature.js';
import { seeded } from '../../util.js';

// Modelled small; it stands this much bigger.
const SIZE = 1.6;

const WHITE = '#fff8ef';
const GLASS = '#cfe8f5';
const STACK = '#ebe1cd';
const CROWN = '#d6c9b1';

// Walls W wide and D long, H tall on a footing F tall. The roof bends at its knees, KNEE_X either side of the middle
// and KNEE_H above the walls, and rises to its ridge R above them; it reaches O past the sides and G past the ends.
// Its upper part is a roof of its own, LIFT above the lower one's line, and reaches LIP past the knees over it.
const W = 1.45;
const D = 1.15;
const F = 0.05;
const H = 0.72;
const KNEE_X = 0.42;
const KNEE_H = 0.34;
const R = 0.58;
const O = 0.05;
const G = 0.1;
const LIFT = 0.012;
const LIP = 0.035;
// The walls' thickness, round the room inside.
const T = 0.04;
const TOP = F + H;
const KNEE_Y = TOP + KNEE_H;
const RIDGE_Y = TOP + R;
const EAVE_X = W / 2 + O;
const EAVE_Y = TOP - (KNEE_H / (W / 2 - KNEE_X)) * O;
// Where the upper roof's edges are, and its ridge.
const UP_X = KNEE_X + LIP;
const UP_Y = KNEE_Y + LIFT - ((R - KNEE_H) / KNEE_X) * LIP;
const TOP_Y = RIDGE_Y + LIFT;
// The roof's outline across the barn, the upper roof and each lower one, and the height of the gable ends at x.
const OUTLINES = [[[-UP_X, UP_Y], [0, TOP_Y], [UP_X, UP_Y]], [[-EAVE_X, EAVE_Y], [-KNEE_X, KNEE_Y]], [[KNEE_X, KNEE_Y], [EAVE_X, EAVE_Y]]];
const gable = (x) => (Math.abs(x) < KNEE_X ? R - ((R - KNEE_H) * Math.abs(x)) / KNEE_X : (KNEE_H * (W / 2 - Math.abs(x))) / (W / 2 - KNEE_X));
// The walls above the eaves' height: the gable ends' shape, up under the upper roof, D long.
const ATTIC = prismGeometry([[-W / 2, 0], [W / 2, 0], [KNEE_X, KNEE_H], [KNEE_X, KNEE_H + LIFT], [0, R + LIFT], [-KNEE_X, KNEE_H + LIFT], [-KNEE_X, KNEE_H]], D);
// The doorway, and the loft door's middle.
const DW = 0.54;
const DH = 0.56;
const LOFT_Y = TOP + 0.2;

const shade = (color, k) => `#${new THREE.Color(color).multiplyScalar(k).getHexString()}`;

/** A door leaf: boards in a white frame crossed by white braces, w × h, its middle at the batch's origin. */
function leaf(batch, w, h, color) {
  batch.add(BOX, color, [0, 0, 0], [w, h, 0.025]);
  for (const z of [-0.016, 0.016]) {
    for (const y of [-h / 2 + 0.017, h / 2 - 0.017]) batch.add(BOX, WHITE, [0, y, z], [w, 0.034, 0.008]);
    for (const x of [-w / 2 + 0.017, w / 2 - 0.017]) batch.add(BOX, WHITE, [x, 0, z], [0.034, h, 0.008]);
    const reach = Math.hypot(w - 0.06, h - 0.06);
    const angle = Math.atan2(h - 0.06, w - 0.06);
    for (const r of [angle, -angle]) batch.add(BOX, WHITE, [0, 0, z], [reach, 0.03, 0.008], [0, 0, r]);
  }
}

/** The room inside: a plank floor, walls lined with dark boards, a heap of loose hay, stacked bales and a crate. */
function inside(batch, rand) {
  const w = W - 2 * T;
  const d = D - 2 * T;
  batch.add(BOX, '#c08850', [0, F + 0.006, 0], [w, 0.012, d]);
  for (let x = -w / 2 + 0.07; x < w / 2; x += 0.07) batch.add(BOX, '#8a5c34', [x, F + 0.013, 0], [0.008, 0.002, d]);
  batch.add(BOX, '#7a5234', [0, F + H / 2, -D / 2 + T + 0.005], [w, H, 0.01]);
  for (const s of [-1, 1]) batch.add(BOX, '#7a5234', [s * (W / 2 - T - 0.005), F + H / 2, 0], [0.01, H, d]);
  // Loose hay in the middle, a little to the right.
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI * 2;
    const r = k ? 0.1 : 0;
    batch.add(BALL, k % 2 ? '#f7c548' : '#ffd76a', [0.1 + Math.cos(a) * r, F + 0.04, 0.05 + Math.sin(a) * r * 0.7], [0.11, 0.07 + rand() * 0.03, 0.09], [0, rand() * 3, 0]);
  }
  // Bales stacked at the back left, tied with twine, and a crate at the back right.
  for (const [x, y, z] of [[-0.36, 0, -0.3], [-0.36, 1, -0.3], [-0.1, 0, -0.34], [-0.36, 0, 0]]) {
    const by = F + 0.012 + 0.065 + y * 0.13;
    batch.add(BOX, y ? '#f8cf5c' : '#efbf48', [x, by, z], [0.24, 0.13, 0.16]);
    for (const t of [-0.06, 0.06]) batch.add(BOX, '#b8862e', [x + t, by, z], [0.012, 0.132, 0.162]);
  }
  batch.add(BOX, '#9a6638', [0.4, F + 0.09, -0.3], [0.17, 0.16, 0.17]);
  for (const y of [F + 0.05, F + 0.13]) batch.add(BOX, '#7d4f2b', [0.4, y, -0.3], [0.175, 0.02, 0.175]);
}

/** Builds the barn in the farm's colours, standing on its origin at its full size. */
export function barn(theme) {
  const batch = new Batch();
  const rand = seeded(11);
  const wall = theme.barn;
  const batten = shade(wall, 0.8);
  batch.push(0, 0, 0, 0, SIZE);

  // Walls round a room on a low stone footing, open at the doorway, and the gable ends up to the roof.
  batch.add(BOX, STONE, [0, F / 2, 0], [W + 0.04, F, D + 0.04]);
  const side = (W - DW) / 2;
  for (const s of [-1, 1]) {
    batch.add(BOX, wall, [s * (W / 2 - side / 2), F + H / 2, D / 2 - T / 2], [side, H, T]);
    batch.add(BOX, wall, [s * (W / 2 - T / 2), F + H / 2, 0], [T, H, D]);
  }
  batch.add(BOX, wall, [0, F + DH + (H - DH) / 2, D / 2 - T / 2], [DW, H - DH, T]);
  batch.add(BOX, wall, [0, F + H / 2, -D / 2 + T / 2], [W, H, T]);
  batch.add(ATTIC, wall, [0, TOP, 0], 1, null, true);

  // The walls are boarded: battens up the front and its gable, round the doorway, and down the right side.
  const front = D / 2 + 0.004;
  for (let x = -W / 2 + 0.06; x < W / 2 - 0.03; x += 0.09) {
    const y0 = Math.abs(x) < DW / 2 + 0.05 ? F + DH + 0.04 : F;
    batch.add(BOX, batten, [x, (y0 + TOP) / 2, front], [0.016, TOP - y0, 0.008]);
    const up = gable(x) - 0.03;
    if (up > 0.03) batch.add(BOX, batten, [x, TOP + up / 2, front], [0.016, up, 0.008]);
  }
  for (let z = -D / 2 + 0.06; z < D / 2 - 0.03; z += 0.09) batch.add(BOX, batten, [W / 2 + 0.004, F + H / 2, z], [0.008, H, 0.016]);

  // White boards at the corners and across the front where the gable starts.
  for (const [x, z] of [[-W / 2, D / 2], [W / 2, D / 2], [W / 2, -D / 2]]) batch.add(BOX, WHITE, [x, F + H / 2, z], [0.05, H, 0.05]);
  batch.add(BOX, WHITE, [0, TOP, D / 2 + 0.012], [W + 0.03, 0.045, 0.025]);

  // The doorway in a white frame, and its two doors swung open.
  for (const s of [-1, 1]) batch.add(BOX, WHITE, [s * (DW / 2 + 0.02), F + DH / 2 + 0.02, D / 2 + 0.012], [0.04, DH + 0.04, 0.03]);
  batch.add(BOX, WHITE, [0, F + DH + 0.02, D / 2 + 0.012], [DW + 0.08, 0.04, 0.03]);
  const swing = 0.45;
  for (const s of [-1, 1]) {
    // Hinged at the frame, swung out towards the camera.
    batch.push(s * (DW / 2 + 0.04), F + DH / 2 - 0.005, D / 2 + 0.03, -s * swing);
    batch.push((s * DW) / 4, 0, 0);
    leaf(batch, DW / 2, DH - 0.02, shade(wall, 0.92));
    batch.pop().pop();
  }

  // The loft door up in the gable.
  batch.add(BOX, WHITE, [0, LOFT_Y, D / 2 + 0.01], [0.28, 0.25, 0.02]);
  batch.add(BOX, shade(wall, 0.85), [0, LOFT_Y, D / 2 + 0.021], [0.21, 0.18, 0.01]);
  for (const r of [0.71, -0.71]) batch.add(BOX, WHITE, [0, LOFT_Y, D / 2 + 0.028], [0.26, 0.026, 0.008], [0, 0, r]);

  // Two small windows down the right side, low enough to show under the eaves.
  for (const z of [0.2, -0.24]) {
    batch.add(BOX, WHITE, [W / 2 + 0.01, F + 0.36, z], [0.02, 0.24, 0.2]);
    batch.add(BOX, GLASS, [W / 2 + 0.018, F + 0.36, z], [0.012, 0.18, 0.14]);
    batch.add(BOX, WHITE, [W / 2 + 0.024, F + 0.36, z], [0.006, 0.18, 0.02]);
    batch.add(BOX, WHITE, [W / 2 + 0.024, F + 0.36, z], [0.006, 0.02, 0.14]);
  }

  // The roof: thick wooden shingles down the steep lower slopes, and down the gentle upper ones, which overhang the
  // lower with a dark board under their edge; a log along the ridge, and white boards along the gables' edges.
  const roof = theme.roof;
  const tones = [roof, shade(roof, 0.84), shade(roof, 1.12), shade(roof, 0.94), shade(roof, 1.04)];
  const shingles = { w: D + 2 * G, tones, under: shade(roof, 0.45), tile: 0.2, jitter: 0.5, thick: 0.05, tilt: 0.16, wobble: 0.05 };
  batch.push(0, 0, 0, Math.PI / 2);
  for (const s of [1, -1]) {
    tiledSlope(batch, rand, { ...shingles, z0: s * KNEE_X, y0: KNEE_Y, z1: s * EAVE_X, y1: EAVE_Y, rows: 4 });
    tiledSlope(batch, rand, { ...shingles, z0: 0, y0: TOP_Y, z1: s * UP_X, y1: UP_Y, rows: 3 });
  }
  batch.pop();
  for (const s of [1, -1]) batch.add(BOX, shade(roof, 0.6), [s * UP_X, UP_Y - 0.012, 0], [0.02, 0.03, D + 2 * G]);
  batch.add(CYL10, shade(roof, 1.05), [0, TOP_Y + 0.045, 0], [0.045, D + 2 * G + 0.04, 0.045], [Math.PI / 2, 0, 0]);
  for (const z of [D / 2 + G, -D / 2 - G]) {
    for (const line of OUTLINES) for (let k = 1; k < line.length; k++) {
      const [ax, ay] = line[k - 1];
      const [bx, by] = line[k];
      const len = Math.hypot(bx - ax, by - ay);
      // Laid along the edge, a little above it.
      const nx = -(by - ay) / len;
      const ny = (bx - ax) / len;
      batch.add(BOX, WHITE, [(ax + bx) / 2 + nx * 0.015, (ay + by) / 2 + ny * 0.015, z], [len + 0.04, 0.07, 0.04], [0, 0, Math.atan2(by - ay, bx - ax)]);
    }
  }

  // A chimney of pale stone, open at the top, astride the ridge near the front.
  const cs = 0.17;
  const ct = 0.03;
  const cx = 0;
  const cz = D / 2 - 0.32;
  const c0 = RIDGE_Y - 0.1;
  const c1 = TOP_Y + 0.22;
  for (const k of [-1, 1]) {
    batch.add(BOX, STACK, [cx + k * (cs / 2 - ct / 2), (c0 + c1) / 2, cz], [ct, c1 - c0, cs]);
    batch.add(BOX, STACK, [cx, (c0 + c1) / 2, cz + k * (cs / 2 - ct / 2)], [cs - 2 * ct, c1 - c0, ct]);
    // The crown round its top, a little wider.
    const c = cs + 0.04;
    const t = ct + 0.02;
    batch.add(BOX, CROWN, [cx + k * (c / 2 - t / 2), c1 - 0.015, cz], [t, 0.03, c]);
    batch.add(BOX, CROWN, [cx, c1 - 0.015, cz + k * (c / 2 - t / 2)], [c - 2 * t, 0.03, t]);
  }
  batch.add(BOX, '#2b1d15', [cx, c1 - 0.05, cz], [cs - 2 * ct, 0.01, cs - 2 * ct]);

  // Leafy plants at its front corners.
  for (const [s, size, turn] of [[-1, 0.2, 0.5], [1, 0.18, 2.6]]) addNature(batch, 'PLANT_10_BroadleafPlant', [s * (W / 2 + 0.08), 0, D / 2 + 0.06], size, turn);

  batch.pop();
  const group = batch.build();

  // The room inside glows a little in its own colours, as if the sun came in at the door, so the hay stays golden in
  // the shade of the walls.
  const room = new Batch();
  room.push(0, 0, 0, 0, SIZE);
  inside(room, rand);
  room.pop();
  const lit = room.build();
  lit.traverse((o) => {
    if (!o.material) return;
    o.material.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n\ttotalEmissiveRadiance += diffuseColor.rgb * 0.35;');
    };
  });
  group.add(lit);
  return group;
}
