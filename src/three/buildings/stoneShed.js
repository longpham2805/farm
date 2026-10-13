// The little stone shed beside the windmill, as the reference design draws it: walls of grey stones laid in courses
// under a roof of two broad slabs, a low wooden door, and moss and leaves round its foot.
//
// Modelled with its door to +z.
import { BOX, ICO, GREYS } from './parts.js';
import { addNature } from '../nature.js';
import { seeded } from '../../util.js';

// Its walls: W wide, D deep, H tall; courses of stones C tall.
const W = 0.72;
const D = 0.56;
const H = 0.5;
const C = 0.085;

/** Courses of stones over a wall `len` long facing +z from the batch's origin, from the ground up to H. */
function courses(batch, rand, len) {
  for (let y = 0, row = 0; y < H - 0.01; y += C, row++) {
    for (let x = -len / 2 - (row % 2) * 0.05; x < len / 2 - 0.01;) {
      const w = 0.1 + rand() * 0.09;
      const left = Math.max(-len / 2, x);
      const right = Math.min(len / 2, x + w);
      x += w + 0.008;
      if (right - left < 0.03) continue;
      batch.add(BOX, GREYS[Math.floor(rand() * GREYS.length)], [(left + right) / 2, y + C / 2, 0.012 + rand() * 0.008], [right - left, C - 0.008, 0.03]);
    }
  }
}

/** Builds the stone shed into the batch, standing on the batch's origin with its door to +z. */
export function stoneShed(batch) {
  const rand = seeded(23);
  batch.add(BOX, '#8f897d', [0, H / 2, 0], [W - 0.02, H, D - 0.02]);
  for (const [x, z, turn, len] of [[0, D / 2 - 0.02, 0, W], [W / 2 - 0.02, 0, Math.PI / 2, D], [-W / 2 + 0.02, 0, -Math.PI / 2, D]]) {
    batch.push(x, 0, z, turn);
    courses(batch, rand, len);
    batch.pop();
  }
  // The roof: two broad slabs, the upper a little smaller and skewed.
  batch.add(BOX, '#b9b2a4', [0, H + 0.035, 0], [W + 0.1, 0.07, D + 0.1], [0, 0.03, 0]);
  batch.add(BOX, '#c8c1b3', [0.02, H + 0.095, -0.01], [W - 0.04, 0.05, D - 0.06], [0, -0.05, 0]);
  // A low door of dark boards in a wooden frame.
  batch.add(BOX, '#7a4f32', [-0.08, 0.17, D / 2 + 0.02], [0.24, 0.34, 0.02]);
  batch.add(BOX, '#5a3a24', [-0.08, 0.16, D / 2 + 0.032], [0.18, 0.3, 0.012]);
  // Moss on the slabs' edge and round the foot, and leaves at its corners.
  for (let k = 0; k < 6; k++) {
    batch.add(ICO, k % 2 ? '#6aa84f' : '#5c9a44', [-W / 2 + rand() * W, H + 0.07, D / 2 + 0.03], [0.05, 0.025, 0.035], [rand(), rand(), 0], true);
  }
  for (const [x, z, s, turn] of [[W / 2 + 0.06, D / 2, 0.24, 1], [-W / 2 - 0.05, D / 2 - 0.05, 0.2, 2.5]]) {
    addNature(batch, 'PLANT_10_BroadleafPlant', [x, 0, z], s, turn);
  }
  for (let k = 0; k < 5; k++) {
    batch.add(ICO, '#5cb546', [-W / 2 + 0.1 + k * 0.13, 0.03, D / 2 + 0.06], [0.06, 0.04, 0.05], [rand(), rand(), 0], true);
  }
}
