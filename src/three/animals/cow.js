// Cows, built like the buffaloes (buffalo.js, parts.js): black and white Holsteins, as the reference draws them in the
// meadow. A chunky body, square at the rump and level along the back, with a deep barrel; a slimmer neck than a
// buffalo's carrying a big black head with a pale pink muzzle, short horns and ears standing out sideways; a pink
// udder; short white legs on dark hooves. Big black patches lie over the white coat, falling differently on each cow.
// They graze, now and then lift their heads to look about, swish their tails and flick their ears, and every so often
// walk slowly to another spot (herd in herd.js).
//
// A cow faces +z, standing on its origin. Its legs, neck and head, tail and ears are children of their own, so they
// can move; userData.update(t, dt, speed) moves them.
import * as THREE from 'three';
import { BALL, CYL, HOOF, merged, hornGeometry, loft, grazing } from './parts.js';

const EYE = '#1d1d2a';

/**
 * The kinds: the white hide and its patches, the head, the muzzle, the hooves, the horns, the inside of the ears, the
 * udder, and how big it stands.
 */
export const COWS = {
  holstein: { hide: '#edf1f8', patch: '#202024', head: '#232327', muzzle: '#f1d8d2', hoof: '#3a3533', horn: '#e6dccb', ear: '#d99d98', udder: '#eeb2ab', size: 1.2 },
};

// The body along its back, from the rump to the chest, about the height it stands at: square at the rump, level
// along the back, the barrel deepest in the middle, narrowing to the chest.
const TRUNK = [
  [-0.37, 0.05, 0, 0, 0],
  [-0.365, 0.05, 0.08, 0.08, 0.1],
  [-0.343, 0.045, 0.135, 0.13, 0.17],
  [-0.29, 0.035, 0.17, 0.16, 0.2],
  [-0.202, 0.02, 0.18, 0.17, 0.22],
  [-0.088, 0.0, 0.19, 0.18, 0.245],
  [0.035, 0.0, 0.19, 0.18, 0.245],
  [0.141, 0.01, 0.175, 0.18, 0.22],
  [0.229, 0.01, 0.15, 0.17, 0.2],
  [0.29, 0.0, 0.115, 0.14, 0.15],
  [0.326, -0.01, 0.06, 0.075, 0.085],
  [0.334, -0.01, 0, 0, 0],
];
const TRUNK_GEOMETRY = loft(TRUNK, 5, 28, 2.8);

// How far a cow goes in one stride (both pairs of legs stepping), as modelled, before its size.
const STRIDE = 0.42;

// The ground a cow takes up, before its size: circles along its back from the tail to the muzzle, [how far forward,
// radius], wide enough for the head lifted and turned to look about.
const BODY = [[-0.24, 0.21], [0.05, 0.22], [0.38, 0.2], [0.6, 0.14]];

/** A leg `h` long and `w` thick hanging from its top at the origin, the patches reaching down to the knee. */
function leg(kind, h, w, patches) {
  return merged((b, coat) => {
    coat.add(CYL, kind.hide, [0, -h * 0.3, 0], [w * 1.1, h * 0.6, w * 1.15]);
    coat.add(BALL, kind.hide, [0, -h * 0.58, 0], [w * 0.85, w * 0.85, w * 0.9], null, 0);
    coat.add(CYL, kind.hide, [0, -h * 0.78, 0], [w * 0.74, h * 0.4, w * 0.78], null, 0);
    b.add(HOOF, kind.hoof, [0, -h + 0.02, 0.006], [w * 0.92, 0.04, w]);
  }, { patches });
}

/**
 * A cow of the given kind (a name in COWS), facing +z on its origin. userData.update(t, dt, speed) moves it: at a
 * standstill it grazes, at `speed` (world units a second) it walks, its legs stepping in time (grazing in parts.js).
 * `phase` puts it at another moment of grazing and lays its patches out differently.
 */
export function cow(name, phase = 0) {
  const kind = COWS[name];
  const patches = { color: kind.patch, size: 0.3, edge: 0.56, seed: phase };
  const g = new THREE.Group();
  // Everything bobs a little as it walks.
  const rig = new THREE.Group();
  g.add(rig);
  // Where the body sits, its legs up to it `len` long.
  const len = 0.24;
  const y = len + 0.2;

  rig.add(merged((b, coat) => {
    coat.add(TRUNK_GEOMETRY, kind.hide, [0, y, 0]);
    // A little dewlap under the throat.
    coat.add(BALL, kind.hide, [0, y - 0.13, 0.27], [0.05, 0.1, 0.065]);
    // Shoulders and haunches, swelling a little out of the body down to the legs.
    for (const s of [-1, 1]) {
      coat.add(BALL, kind.hide, [s * 0.105, y - 0.06, 0.18], [0.085, 0.16, 0.1]);
      coat.add(BALL, kind.hide, [s * 0.1, y - 0.04, -0.22], [0.085, 0.16, 0.11]);
    }
    // The udder between the hind legs, and its teats.
    b.add(BALL, kind.udder, [0, y - 0.2, -0.17], [0.075, 0.06, 0.08]);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.add(CYL, kind.udder, [sx * 0.035, y - 0.265, -0.17 + sz * 0.033], [0.011, 0.04, 0.011]);
  }, { patches }));
  // The legs swing from the top: front left with back right, then front right with back left.
  // Each leg's patches fall their own way, though the legs are alike.
  const legs = [[-0.105, 0.18, 0.058, 0], [0.105, 0.18, 0.058, Math.PI], [-0.105, -0.235, 0.06, Math.PI], [0.105, -0.235, 0.06, 0]].map(([x, z, w, step], k) => {
    const l = leg(kind, len + 0.06, w, { ...patches, seed: patches.seed + k + 1 });
    l.position.set(x, len + 0.06, z);
    l.userData.step = step;
    rig.add(l);
    return l;
  });

  // The tail hangs from the root of it at the top of the rump to the hocks, a black switch at its end.
  const tail = new THREE.Group();
  tail.position.set(0, y + 0.14, -0.365);
  tail.add(merged((b, coat) => {
    coat.add(CYL, kind.hide, [0, -0.14, -0.01], [0.011, 0.28, 0.011], [0.08, 0, 0]);
    coat.add(BALL, kind.patch, [0, -0.3, -0.02], [0.024, 0.06, 0.024]);
  }));
  rig.add(tail);

  // The neck swings down from the shoulders to graze, carrying the head.
  const neck = new THREE.Group();
  neck.position.set(0, y + 0.06, 0.255);
  neck.add(merged((b, coat) => coat.add(BALL, kind.hide, [0, -0.02, 0.08], [0.105, 0.13, 0.15], [0.35, 0, 0]), { patches }));
  // The head turns about the top of the skull: black, a long face sloping down and forward to a broad pale muzzle.
  const head = new THREE.Group();
  head.position.set(0, 0.0, 0.2);
  head.scale.setScalar(1.45);
  head.add(merged((b, coat) => {
    coat.add(BALL, kind.head, [0, 0, 0.02], [0.08, 0.075, 0.08]);
    coat.add(BALL, kind.head, [0, -0.07, 0.07], [0.066, 0.1, 0.064], [-0.55, 0, 0]);
    coat.add(BALL, kind.muzzle, [0, -0.14, 0.125], [0.062, 0.048, 0.054], [-0.3, 0, 0]);
    for (const s of [-1, 1]) {
      b.add(BALL, '#b98682', [s * 0.024, -0.138, 0.174], [0.012, 0.009, 0.006]);
      b.add(BALL, '#ece8e0', [s * 0.066, -0.03, 0.07], 0.013);
      b.add(BALL, EYE, [s * 0.071, -0.03, 0.076], 0.0095);
      b.add(BALL, '#ffffff', [s * 0.075, -0.026, 0.082], 0.0035);
      // Short horns, up and out from the top of the skull.
      b.add(hornGeometry([[s * 0.05, 0.05, 0.0], [s * 0.075, 0.068, 0.0], [s * 0.088, 0.092, 0.01]], 0.016, 0.006, 8, 6), kind.horn);
    }
  }));
  // The ears, standing out sideways under the horns, black, pink inside, flicking now and then.
  const ears = [-1, 1].map((s) => {
    const ear = merged((b, coat) => {
      coat.add(BALL, kind.head, [s * 0.058, 0, 0], [0.064, 0.026, 0.013]);
      b.add(BALL, kind.ear, [s * 0.06, -0.002, 0.007], [0.046, 0.017, 0.008]);
    });
    ear.position.set(s * 0.075, 0.015, -0.01);
    head.add(ear);
    return ear;
  });
  neck.add(head);
  rig.add(neck);

  // It grazes with its muzzle down in the grass, now and then lifts its head to look about, and walks with it low.
  grazing(g, { rig, neck, head, legs, tail, ears }, { phase, stride: STRIDE * kind.size, poses: { graze: [1.0, -0.25], look: [-0.25, 0.05], walk: [0.3, 0.15] }, droop: 0.15 });
  // What a herd needs to know of it.
  Object.assign(g.userData, { size: kind.size, calf: false, body: BODY, pace: 0.12 });
  g.scale.setScalar(kind.size);
  return g;
}
