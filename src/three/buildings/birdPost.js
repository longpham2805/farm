// The post the reference design draws by the back fence of the fields over the big bridge, beside the scarecrow: a
// tall post of weathered wood, as the fence's but a good deal taller, a birdhouse on its top (a box of boards under a
// steep roof, a round door and a perch under it, turned to the camera), and a robin perched on a peg out of its side
// below it (animals/robin.js).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { Batch } from '../batch.js';
import { seeded } from '../../util.js';
import { BOX, GABLE, CYL10, FACE } from './parts.js';
import { robin } from '../animals/robin.js';

const CYL = new THREE.CylinderGeometry(1, 1, 1, 6);
// A post 1 tall, a little rounded so the light catches its edges, stretched to length (as the fence's).
const POST_W = 0.07;
const POST = new RoundedBoxGeometry(POST_W, 1, POST_W, 2, 0.014);

const WOOD = ['#8f5d36', '#875632', '#97643b'];
const PEG = '#7a4f2c';
/** The birdhouse's walls and the boards across its front, its roof, its door. */
const HOUSE = { wall: '#d6a86c', boards: ['#cf9f63', '#c4945a', '#d9ad72'], roof: ['#8a5530', '#7d4c2c', '#94603a'], door: '#2b1c12' };
// Its size: the body's width (across the front), height and depth, the roof's rise over it and how far it reaches out.
const [HW, HH, HD, RISE, EAVES] = [0.24, 0.2, 0.22, 0.13, 0.045];

/**
 * A birdhouse standing on y, its front (+z) to the camera: a box of boards on a base board, a steep roof of two
 * boards reaching out past it all round, gable ends filled, a round door high in its front and a perch under it.
 * Returns how high its roof's ridge reaches.
 */
function birdhouse(b, rand, y) {
  b.add(BOX, HOUSE.wall, [0, y + 0.01, 0], [HW + 0.03, 0.02, HD + 0.03]);
  const y0 = y + 0.02;
  b.add(BOX, HOUSE.wall, [0, y0 + HH / 2, 0], [HW, HH, HD]);
  // Three boards up the front and the back, each a little off from the next in colour.
  for (const z of [1, -1]) {
    for (let k = 0; k < 3; k++) b.add(BOX, HOUSE.boards[Math.floor(rand() * 3)], [(k - 1) * (HW / 3), y0 + HH / 2, z * (HD / 2 + 0.004)], [HW / 3 - 0.006, HH, 0.008]);
  }
  // The gable ends, and the roof: on each side three courses of boards from the eaves up to the ridge, each tipped out
  // a little at its foot so it stands proud of the one below, and a bar along the ridge.
  b.add(GABLE, HOUSE.wall, [0, y0 + HH, 0], [HD, RISE, HW], [0, Math.PI / 2, 0]);
  const a = Math.atan2(RISE, HW / 2);
  const slope = Math.hypot(RISE, HW / 2) + EAVES;
  const t = 0.018;
  const ridge = y0 + HH + RISE;
  const deep = HD + EAVES * 1.6;
  for (const s of [-1, 1]) {
    const down = [s * Math.cos(a), -Math.sin(a)];
    const out = [s * Math.sin(a), Math.cos(a)];
    for (let k = 0; k < 3; k++) {
      const d = slope - ((k + 0.5) * slope) / 3;
      const lift = t / 2 + 0.004 * (2 - k);
      const mid = [down[0] * d + out[0] * lift, ridge + down[1] * d + out[1] * lift, 0];
      b.add(BOX, HOUSE.roof[Math.floor(rand() * HOUSE.roof.length)], mid, [slope / 3 + 0.02, t, deep], [0, 0, -s * (a - 0.07)]);
    }
  }
  b.add(BOX, HOUSE.roof[0], [0, ridge + t * 0.9, 0], [0.032, 0.032, deep + 0.01], [0, 0, Math.PI / 4]);
  // The round door, and the perch under it.
  b.add(CYL10, HOUSE.door, [0, y0 + HH * 0.6, HD / 2 + 0.008], [0.036, 0.004, 0.036], [Math.PI / 2, 0, 0]);
  b.add(CYL, PEG, [0, y0 + HH * 0.32, HD / 2 + 0.04], [0.007, 0.07, 0.007], [Math.PI / 2, 0, 0]);
  return ridge + t * 0.9 + 0.023;
}

// The post is turned to face the camera (FarmScene's camera looks from (1, 0.95, 1)), so in its frame +x is the right
// of the screen. The robin's peg reaches out that way, as the reference draws its orange breast on the right below the
// birdhouse; the robin faces the camera, turned a little to the right, its head turned back towards the camera.
const PERCH = 0.48;
const FACING = Math.PI / 6;
const LOOK = -0.4;

/**
 * The post with its birdhouse and robin, `height` tall to the birdhouse's ridge (world units), laid out by `seed`.
 * Returns a group standing on its foot at the origin; the robin is userData.robin.
 */
export function birdPost(seed = 1, height = 1.13, size = 1.4) {
  const rand = seeded(seed);
  const g = new THREE.Group();
  const turned = new THREE.Group();
  turned.rotation.y = FACE + (rand() - 0.5) * 0.3;
  g.add(turned);
  // The post leans a little; where it is at a height.
  const lean = [(rand() - 0.5) * 0.04, (rand() - 0.5) * 0.04];
  const at = (y) => [-lean[1] * y, y, lean[0] * y];
  const top = height - (0.02 + HH + RISE + 0.039);
  const b = new Batch();
  b.add(POST, WOOD[Math.floor(rand() * WOOD.length)], at(top / 2), [1, top + 0.02, 1], [lean[0], 0, lean[1]]);
  b.push(...at(top));
  birdhouse(b, rand, 0);
  b.pop();
  const [x, y, z] = at(PERCH);
  b.add(CYL, PEG, [x + POST_W / 2 + 0.1, y, z], [0.012, 0.2, 0.012], [0, 0, -Math.PI / 2]);
  turned.add(b.build());
  const bird = robin(size);
  bird.position.set(x + POST_W / 2 + 0.15, y + 0.012, z);
  bird.rotation.y = FACING;
  bird.userData.look = LOOK + (rand() - 0.5) * 0.4;
  bird.userData.head.rotation.y = bird.userData.look;
  turned.add(bird);
  g.userData.robin = bird;
  g.userData.height = height;
  return g;
}
