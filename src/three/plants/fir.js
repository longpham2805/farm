// A full, light green fir as the reference design draws one on the upper riverbank, between the riverside road's
// fence and the water: a short brown trunk under six tiers of leafy lobes and a pointed top, as wide as three fifths
// of its height, the lowest tiers drooping out over the grass. Built as the slim tree is (tieredTree in slimTree.js),
// its lobes broader and more of them to a tier, drooping late, over a dark core, so it reads full where the slim tree
// is open.
import { tieredTree } from './slimTree.js';

/** Leaves: in the shade, dark, mid, in the light; the bark. */
export const FIR = { shade: '#08380c', dark: '#16600f', mid: '#3f8c16', light: '#a0ca34', bark: '#7a4c30', barkDark: '#36200e' };

// How it grows, in units of its height (see FORM in slimTree.js).
const FORM = {
  tiers: [[0.38, 6, 0.32, 0.13], [0.52, 6, 0.27, 0.11], [0.64, 5, 0.21, 0.085], [0.75, 5, 0.15, 0.065], [0.84, 4, 0.1, 0.045], [0.9, 3, 0.06, 0.025]],
  gaps: 0.1,
  width: 0.66,
  fold: 0.3,
  curl: 1.7,
  core: 0.7,
  tip: [0.88, 1, 0.03],
  wood: { trunk: [0.026, 0.006], roots: 5, flare: 1.1, kink: 0.04, twist: 0.05, sides: 8, soft: 0.35, ridges: 0.08 },
};

/** A fir `height` tall (world units), laid out by `seed`. Returns a mesh standing on its foot at the origin. */
export function fir(seed = 1, height = 1.6, colors = FIR) {
  return tieredTree(seed, height, colors, FORM);
}
