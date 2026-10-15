// A rustic wooden bench as the reference design draws them in the meadow's right corner and beside the well, with no
// back: a seat of rough planks laid along it, no two the same width, length or lie, gaps between them, their rounded
// ends standing out past the legs, on two bearers and four round legs splayed out a little, in light warm wood.
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { cyl } from './parts.js';

const PLANKS = ['#dca468', '#d39a5e', '#e2ac70', '#d8a064'];
const FRAME = '#c08a56';
const [LONG, DEEP, SEAT] = [0.9, 0.34, 0.21];
const LEG = cyl(1, 1.15, 6);
// A plank of its own size, its edges and ends rounded over a little.
const plank = (len, thick, w) => new RoundedBoxGeometry(len, thick, w, 2, Math.min(thick, w) * 0.4);

/** The bench, along x, standing on the batch's origin: all of it goes into the batch. */
export function bench(batch, rand) {
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
  for (const w of widths) {
    const len = LONG + jitter(0.08);
    const thick = 0.026 + rand() * 0.01;
    batch.add(plank(len, thick, w), tone(), [jitter(0.04), SEAT - 0.025 + thick / 2 + jitter(0.006), z + w / 2], 1, [jitter(0.05), jitter(0.04), jitter(0.03)]);
    z += w + gap;
  }
}
