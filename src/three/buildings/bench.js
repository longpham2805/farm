// A rustic wooden bench as the reference design draws them in the meadow's right corner and beside the well, with no
// back: a seat of rough planks laid along it, no two the same width, length or lie, gaps between them, their rounded
// ends standing out past the legs, on two bearers and four round legs splayed out a little, in light warm wood. The
// meadow's has a folded newspaper left lying on it, as the reference draws a white patch there.
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { BOX, cyl } from './parts.js';
import { Batch } from '../batch.js';
import { glowing } from '../plants/parts.js';

export const PLANKS = ['#dca468', '#d39a5e', '#e2ac70', '#d8a064'];
export const FRAME = '#c08a56';
const [LONG, DEEP, SEAT] = [0.9, 0.34, 0.21];
export const LEG = cyl(1, 1.15, 6);
// A plank of its own size, its edges and ends rounded over a little.
export const plank = (len, thick, w) => new RoundedBoxGeometry(len, thick, w, 2, Math.min(thick, w) * 0.4);
const PAPER = '#ffffff';
const PRINT = ['#a29d94', '#d8d4cb']; // the headline, the lines of print

/**
 * A newspaper folded in half, lying on the origin, its fold along x at -z: two sheets, the upper a little short of the
 * lower, rounded over at the fold, with a headline along the fold and columns of print under it.
 */
function newspaper(batch) {
  const [L, W, T] = [0.19, 0.13, 0.004];
  batch.add(plank(L, T, W), PAPER, [0, T / 2, 0]);
  batch.add(plank(L - 0.006, T, W - 0.008), PAPER, [0.003, T * 1.5 + 0.0005, -0.004]);
  batch.add(cyl(1, 1, 8), PAPER, [0, T, -W / 2], [T, L - 0.004, T], [0, 0, Math.PI / 2]);
  const top = 2 * T + 0.0012;
  batch.add(BOX, PRINT[0], [-0.008, top, -W / 2 + 0.02], [0.15, 0.001, 0.016]);
  for (let c = 0; c < 3; c++) {
    for (let r = 0; r < 4; r++) batch.add(BOX, PRINT[1], [-0.058 + c * 0.052, top, -W / 2 + 0.043 + r * 0.017], [0.042, 0.001, 0.006]);
  }
}

/**
 * The bench, along x, standing on the batch's origin: all of it goes into the batch. With `paper`, a folded newspaper
 * lies on the seat towards its +x end and front (+z): a mesh of its own, returned, that glows a little so the warm sun
 * does not turn its white to cream.
 */
export function bench(batch, rand, { paper = false } = {}) {
  const tone = () => PLANKS[Math.floor(rand() * PLANKS.length)];
  const jitter = (a) => (rand() - 0.5) * a;
  // Four legs, round and a little uneven, their feet out towards the corners; a bearer across the top of each pair.
  for (const s of [-1, 1]) {
    const x = s * (LONG / 2 - 0.12);
    for (const t of [-1, 1]) {
      const r = 0.033 + jitter(0.008);
      batch.add(LEG, FRAME, [x + s * 0.012, (SEAT - 0.03) / 2, t * (DEEP / 2 - 0.07)], [r, SEAT - 0.03, r], [t * 0.12 + jitter(0.04), jitter(0.5), -s * 0.1 + jitter(0.04)], true);
    }
    batch.add(plank(0.065, 0.045, DEEP - 0.02), FRAME, [x, SEAT - 0.045, jitter(0.01)], 1, [0, jitter(0.08), jitter(0.06)]);
  }
  // The seat: planks of uneven widths along it, side by side with gaps between, each its own length, lie and tone.
  const widths = Array.from({ length: 4 }, () => 0.045 + rand() * 0.018);
  const gap = (DEEP - widths.reduce((a, w) => a + w, 0)) / 3;
  let z = -DEEP / 2;
  let top = 0;
  for (const w of widths) {
    const len = LONG + jitter(0.08);
    const thick = 0.026 + rand() * 0.01;
    const y = SEAT - 0.025 + thick / 2 + jitter(0.006);
    batch.add(plank(len, thick, w), tone(), [jitter(0.04), y, z + w / 2], 1, [jitter(0.05), jitter(0.04), jitter(0.03)]);
    top = Math.max(top, y + thick / 2);
    z += w + gap;
  }
  // The newspaper on the highest plank's top, clear of the others' slight lie, turned a little off the seat's line.
  if (!paper) return null;
  const sheets = new Batch();
  sheets.stack.push(batch.origin.clone());
  sheets.push(LONG / 2 - 0.2, top + 0.003, DEEP / 2 - 0.095, 0.3);
  newspaper(sheets);
  const group = sheets.build();
  group.traverse((o) => o.material && (o.material = glowing(o.material, 0.35)));
  return group;
}
