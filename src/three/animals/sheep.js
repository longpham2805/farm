// Sheep, built like the cattle (parts.js): white ewes, as the reference draws them in the meadow. A plump round body of
// wool, lumpy as a fleece is, a woolly tuft of a tail; a pale face, long and narrow, under a cap of wool, a pink nose,
// ears standing out sideways, pink inside; slender pale legs on dark hooves. They graze, now and then lift their heads
// to look about, flick their ears and waggle their tails, and every so often walk a little way to another spot (herd
// in herd.js).
//
// A sheep faces +z, standing on its origin. Its legs, neck and head, tail and ears are children of their own, so they
// can move; userData.update(t, dt, speed) moves them.
import * as THREE from 'three';
import { BALL, FINE_BALL, CYL, HOOF, merged, loft, grazing } from './parts.js';

const EYE = '#1d1d2a';

/** The kinds: the wool, the face and legs, the inside of the ears, the nose, the hooves, and how big it stands. */
export const SHEEP = {
  ewe: { wool: '#f2f3f4', face: '#f0e2d7', ear: '#dc9f93', nose: '#c98c86', hoof: '#54463f', size: 1.0 },
};

// The fleece over the body, round and plump, from the tail to the chest.
const FLEECE = [
  [-0.31, 0.02, 0, 0, 0],
  [-0.3, 0.02, 0.08, 0.08, 0.08],
  [-0.27, 0.02, 0.14, 0.14, 0.14],
  [-0.2, 0.01, 0.18, 0.17, 0.17],
  [-0.08, 0.0, 0.2, 0.18, 0.19],
  [0.06, 0.0, 0.2, 0.18, 0.19],
  [0.17, 0.01, 0.18, 0.17, 0.17],
  [0.25, 0.02, 0.14, 0.15, 0.14],
  [0.29, 0.03, 0.08, 0.09, 0.08],
  [0.3, 0.03, 0, 0, 0],
];
const FLEECE_GEOMETRY = loft(FLEECE, 8, 56, 2.2);
// Round its middle, and along it in model units.
FLEECE_GEOMETRY.userData.hair = [1.2, 1];

// The fleece: wool, standing off the hide farther than hair, streaking it a little, in lumps.
const fleece = (seed) => ({ wool: true, stand: 1.8, streak: 0.35, lumps: { size: 0.06, height: 0.03, seed } });
// The face and legs: short, sleek hair.
const SKIN = { flat: true, stand: 0.5, streak: 0.3 };

// How far a sheep goes in one stride (both pairs of legs stepping), as modelled, before its size.
const STRIDE = 0.3;

// The ground a sheep takes up, before its size: circles along its back from the tail to the nose, [how far forward,
// radius], wide enough for the head lifted and turned to look about.
const BODY = [[-0.18, 0.21], [0.1, 0.21], [0.38, 0.12]];

/** A slender leg `h` long and `w` thick hanging from its top at the origin, wool at its top. */
function leg(kind, h, w, seed) {
  const g = merged((b, coat) => {
    coat.add(CYL, kind.face, [0, -h * 0.55, 0], [w, h * 0.9, w * 1.05]);
    b.add(HOOF, kind.hoof, [0, -h + 0.016, 0.004], [w * 1.05, 0.032, w * 1.1]);
  }, SKIN);
  g.add(merged((b, coat) => coat.add(FINE_BALL, kind.wool, [0, -h * 0.12, 0], [w * 2.2, h * 0.3, w * 2.3]), fleece(seed)));
  return g;
}

/**
 * A sheep of the given kind (a name in SHEEP), facing +z on its origin. userData.update(t, dt, speed) moves it: at a
 * standstill it grazes, at `speed` (world units a second) it walks, its legs stepping in time (grazing in parts.js).
 * `phase` puts it at another moment of grazing and lays its fleece out differently.
 */
export function sheep(name, phase = 0) {
  const kind = SHEEP[name];
  const g = new THREE.Group();
  // Everything bobs a little as it walks.
  const rig = new THREE.Group();
  g.add(rig);
  // Where the body sits, its legs up to it `len` long.
  const len = 0.17;
  const y = len + 0.19;

  rig.add(merged((b, coat) => {
    coat.add(FLEECE_GEOMETRY, kind.wool, [0, y, 0]);
  }, fleece(phase)));
  const legs = [[-0.09, 0.15, 0, 0], [0.09, 0.15, Math.PI, 1], [-0.09, -0.17, Math.PI, 2], [0.09, -0.17, 0, 3]].map(([x, z, step, k]) => {
    const l = leg(kind, len + 0.04, 0.022, phase + k + 1);
    l.position.set(x, len + 0.04, z);
    l.userData.step = step;
    rig.add(l);
    return l;
  });

  // The tail, a short tuft of wool at the top of the rump.
  const tail = new THREE.Group();
  tail.position.set(0, y + 0.08, -0.3);
  tail.add(merged((b, coat) => coat.add(FINE_BALL, kind.wool, [0, -0.04, -0.015], [0.04, 0.06, 0.035]), fleece(phase + 7)));
  rig.add(tail);

  // The neck, wool too, swings down from the shoulders to graze, carrying the head.
  const neck = new THREE.Group();
  neck.position.set(0, y + 0.06, 0.22);
  neck.add(merged((b, coat) => coat.add(FINE_BALL, kind.wool, [0, -0.01, 0.05], [0.09, 0.11, 0.1], [0.4, 0, 0]), fleece(phase + 9)));
  // The head turns about the top of the skull: a long, narrow pale face down to a pink nose, under a cap of wool.
  const head = new THREE.Group();
  head.position.set(0, 0.0, 0.14);
  head.scale.setScalar(1.3);
  head.add(merged((b, coat) => {
    coat.add(BALL, kind.face, [0, -0.02, 0.03], [0.044, 0.048, 0.056]);
    coat.add(BALL, kind.face, [0, -0.058, 0.07], [0.03, 0.055, 0.034], [-0.7, 0, 0]);
    b.add(BALL, kind.nose, [0, -0.08, 0.098], [0.014, 0.01, 0.007], [-0.5, 0, 0]);
    for (const s of [-1, 1]) {
      b.add(BALL, '#ece8e0', [s * 0.037, -0.015, 0.05], 0.009);
      b.add(BALL, EYE, [s * 0.04, -0.015, 0.054], 0.007);
      b.add(BALL, '#ffffff', [s * 0.043, -0.012, 0.058], 0.0025);
    }
  }, SKIN));
  head.add(merged((b, coat) => coat.add(FINE_BALL, kind.wool, [0, 0.03, 0.005], [0.055, 0.035, 0.055]), fleece(phase + 11)));
  // The ears, standing out sideways from under the cap, pink inside, flicking now and then.
  const ears = [-1, 1].map((s) => {
    const ear = merged((b, coat) => {
      coat.add(BALL, kind.face, [s * 0.04, 0, 0], [0.045, 0.016, 0.02]);
      b.add(BALL, kind.ear, [s * 0.042, -0.002, 0.008], [0.034, 0.011, 0.012]);
    }, SKIN);
    ear.position.set(s * 0.04, 0.005, 0.0);
    head.add(ear);
    return ear;
  });
  neck.add(head);
  rig.add(neck);

  // It grazes with its nose down in the grass, now and then lifts its head to look about, and walks with it up.
  grazing(g, { rig, neck, head, legs, tail, ears }, { phase, stride: STRIDE * kind.size, poses: { graze: [1.1, -0.1], look: [-0.25, 0.15], walk: [0.0, 0.15] }, droop: 0.25 });
  // What a herd needs to know of it.
  Object.assign(g.userData, { size: kind.size, calf: false, body: BODY, pace: 0.13 });
  g.scale.setScalar(kind.size);
  return g;
}
