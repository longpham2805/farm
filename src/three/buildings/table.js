// A rustic wooden table as the reference design draws one on the grass by the windmill's road above the small fall: a
// thick top of rough planks laid along it, no two the same width, length or lie, gaps between them, their rounded ends
// standing out past the legs; under each end a bearer and two round legs crossed, braced by a rail along its middle;
// in the benches' light warm wood.
import { PLANKS, FRAME, LEG, plank } from './bench.js';

const [LONG, DEEP, HIGH] = [0.5, 0.34, 0.36];

/** The table, along x, standing on the batch's origin: all of it goes into the batch. */
export function table(batch, rand) {
  const tone = () => PLANKS[Math.floor(rand() * PLANKS.length)];
  const jitter = (a) => (rand() - 0.5) * a;
  const under = HIGH - 0.05;
  for (const s of [-1, 1]) {
    const x = s * (LONG / 2 - 0.08);
    // Two legs crossed under the end, side by side, each from a foot out at the front or back up to the bearer's
    // other end.
    for (const t of [-1, 1]) {
      const foot = [x, 0, t * (DEEP / 2 - 0.03)];
      const top = [x, under, -t * (DEEP / 2 - 0.09)];
      const [dy, dz] = [top[1] - foot[1], top[2] - foot[2]];
      const r = 0.024 + jitter(0.006);
      batch.add(LEG, FRAME, [x + t * 0.014, under / 2, (foot[2] + top[2]) / 2], [r, Math.hypot(dy, dz), r], [Math.atan2(dz, dy), jitter(0.5), jitter(0.05)], true);
    }
    batch.add(plank(0.06, 0.045, DEEP - 0.06), FRAME, [x, under, jitter(0.01)], 1, [0, jitter(0.06), jitter(0.05)]);
  }
  // A rail along the middle, from one end's crossing to the other's.
  batch.add(plank(LONG - 0.12, 0.034, 0.034), FRAME, [0, under / 2 + 0.01, 0], 1, [jitter(0.04), 0, jitter(0.03)]);
  // The top: planks of uneven widths along it, side by side with gaps between, each its own length, lie and tone.
  const widths = Array.from({ length: 3 }, () => 0.1 + rand() * 0.02);
  const gap = (DEEP - widths.reduce((a, w) => a + w, 0)) / 2;
  let z = -DEEP / 2;
  for (const w of widths) {
    const thick = 0.05 + rand() * 0.012;
    const y = under + 0.022 + thick / 2 + jitter(0.005);
    batch.add(plank(LONG + jitter(0.06), thick, w), tone(), [jitter(0.03), y, z + w / 2], 1, [jitter(0.04), jitter(0.04), jitter(0.03)]);
    z += w + gap;
  }
}
