// The silo between the barn and the haystack, as the reference design draws it: a tall drum of grey corrugated
// sheet ringed with riveted bands, a ladder up its front, a red dome of painted panels a little taller than round
// with a grey cap on top, standing on a round concrete footing with flowers at its foot.
//
// Round, so it only turns to keep its ladder to the camera (+z).
import * as THREE from 'three';
import { Batch } from '../batch.js';
import { BOX, BALL, ICO } from './parts.js';
import { seeded } from '../../util.js';

// The drum: radius R, H tall on a footing F tall; the dome reaches DOME_R out and rises DOME_H.
const R = 0.56;
const H = 1.6;
const F = 0.06;
const DOME_R = R + 0.035;
const DOME_H = 0.7;
const TOP = F + H;
const COURSES = 5;
const STEP = H / COURSES;
// The dome's panels.
const GORES = 12;

/** A tube of corrugated sheet, 1 tall round the y axis: `n` ridges, the sheet `depth` deep, shading flat. */
function corrugated(radius, depth, n) {
  const pos = [];
  const at = (k) => {
    const a = (k / (2 * n)) * Math.PI * 2;
    const r = radius + (k % 2 ? depth : 0);
    return [Math.sin(a) * r, Math.cos(a) * r];
  };
  for (let k = 0; k < 2 * n; k++) {
    const [x0, z0] = at(k);
    const [x1, z1] = at(k + 1);
    pos.push(x0, -0.5, z0, x1, -0.5, z1, x1, 0.5, z1, x0, -0.5, z0, x1, 0.5, z1, x0, 0.5, z0);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}
const DRUM = corrugated(R, 0.014, 44);
const DISC = new THREE.CylinderGeometry(1, 1, 1, 32);
const RING = new THREE.TorusGeometry(R + 0.016, 0.02, 6, 48).rotateX(Math.PI / 2);
const GORE = new THREE.SphereGeometry(1, 4, 12, 0, (Math.PI * 2) / GORES, 0, Math.PI / 2);
// A seam from the dome's foot over to its top, in the x-y plane.
const SEAM = new THREE.TorusGeometry(1, 0.016, 4, 20, Math.PI / 2);
const LATITUDE = new THREE.TorusGeometry(1, 0.02, 4, 48).rotateX(Math.PI / 2);

const METAL = ['#d5dae0', '#ccd2d9'];
const BAND = '#9ea7b1';
const REDS = ['#e5453a', '#de4036', '#e94b3f'];
const SEAM_RED = '#cc3a30';

/** A batch that starts where `batch` stands, for parts of another material. */
function beside(batch) {
  const own = new Batch();
  own.stack[0].copy(batch.origin);
  return own;
}

/**
 * Builds the silo, standing on the batch's origin with its ladder towards +z: its matt parts into the batch, and
 * the painted dome and the metal drum as meshes of their own, a little glossy, which it returns as a group.
 */
export function silo(batch) {
  const rand = seeded(5);
  const metal = beside(batch);
  const paint = beside(batch);

  // The footing: a round slab, a little lighter on top.
  batch.add(DISC, '#cfc4b8', [0, F / 2, 0], [R + 0.12, F, R + 0.12]);
  batch.add(DISC, '#ddd3c8', [0, F + 0.004, 0], [R + 0.09, 0.008, R + 0.09]);

  // The drum in courses of corrugated sheet a slightly different grey, each set half a ridge round from the last; a
  // band riveted round where each course meets the next, and here and there a darker streak running down from one.
  for (let k = 0; k < COURSES; k++) {
    const y = F + (k + 0.5) * STEP;
    metal.add(DRUM, METAL[k % 2], [0, y, 0], [1, STEP, 1], [0, ((k % 2) * Math.PI) / 44, 0]);
  }
  for (let k = 1; k <= COURSES; k++) {
    const y = F + k * STEP;
    metal.add(RING, BAND, [0, y, 0]);
    for (let j = 0; j < 28; j++) {
      const a = (j / 28) * Math.PI * 2;
      metal.add(ICO, '#868f99', [Math.sin(a) * (R + 0.034), y, Math.cos(a) * (R + 0.034)], 0.011);
    }
  }
  for (let n = 0; n < 9; n++) {
    const a = (rand() - 0.5) * 2.6;
    const k = 1 + Math.floor(rand() * (COURSES - 1));
    const len = 0.08 + rand() * 0.16;
    metal.add(BOX, rand() < 0.5 ? '#aab1b9' : '#b4a99c', [Math.sin(a) * (R + 0.016), F + k * STEP - 0.03 - len / 2, Math.cos(a) * (R + 0.016)], [0.025, len, 0.005], [0, a, 0]);
  }

  // The dome: panels of painted sheet in reds a shade apart, with raised seams up between them and one round them
  // halfway up, rivets round its foot, a darker lip and a grey cap.
  for (let g = 0; g < GORES; g++) {
    const a = (g / GORES) * Math.PI * 2;
    paint.add(GORE, REDS[g % REDS.length], [0, TOP, 0], [DOME_R, DOME_H, DOME_R], [0, a, 0]);
    paint.push(0, TOP, 0, a - Math.PI / 2);
    paint.add(SEAM, SEAM_RED, [0, 0, 0], [DOME_R + 0.004, DOME_H + 0.004, 1]);
    paint.pop();
  }
  const lat = 0.9;
  paint.add(LATITUDE, SEAM_RED, [0, TOP + DOME_H * Math.cos(lat), 0], [DOME_R * Math.sin(lat) + 0.003, 1, DOME_R * Math.sin(lat) + 0.003]);
  paint.add(DISC, '#b8342c', [0, TOP + 0.01, 0], [DOME_R + 0.012, 0.04, DOME_R + 0.012]);
  for (let j = 0; j < 32; j++) {
    const a = (j / 32) * Math.PI * 2;
    paint.add(ICO, '#9c2c25', [Math.sin(a) * (DOME_R + 0.014), TOP + 0.012, Math.cos(a) * (DOME_R + 0.014)], 0.011);
  }
  batch.add(DISC, '#d9d4cc', [0, TOP + DOME_H - 0.01, 0], [0.09, 0.05, 0.09]);
  batch.add(BALL, '#e6e1d9', [0, TOP + DOME_H + 0.02, 0], [0.07, 0.04, 0.07]);

  // A ladder up the front, standing off the drum on brackets.
  const lz = R + 0.07;
  for (const x of [-0.09, 0.09]) {
    batch.add(BOX, '#8f98a2', [x, F + H / 2, lz], [0.03, H, 0.03]);
    for (let y = F + 0.25; y < TOP; y += 0.5) batch.add(BOX, '#8f98a2', [x, y, lz - 0.035], [0.016, 0.016, 0.06]);
  }
  for (let y = F + 0.12; y < TOP - 0.05; y += 0.12) batch.add(BOX, '#a3abb5', [0, y, lz], [0.18, 0.02, 0.02]);

  // Flowers in the grass at its foot, in front.
  for (let k = 0; k < 9; k++) {
    const a = Math.PI / 2 + (k / 8 - 0.5) * 2.2 + (rand() - 0.5) * 0.15;
    const r = R + 0.17 + rand() * 0.08;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    batch.add(ICO, k % 2 ? '#5cb546' : '#4ea53e', [x, 0.05, z], [0.07, 0.05, 0.07], [rand(), rand(), 0], true);
    for (let j = 0; j < 3; j++) {
      batch.add(BALL, ['#ffffff', '#ffb347', '#fff3c4', '#ff8a3d'][(k + j) % 4], [x + (rand() - 0.5) * 0.08, 0.1 + rand() * 0.04, z + (rand() - 0.5) * 0.08], 0.028);
    }
  }

  const group = new THREE.Group();
  group.add(metal.build({ roughness: 0.5, metalness: 0.1 }), paint.build({ roughness: 0.4, metalness: 0.1 }));
  return group;
}
