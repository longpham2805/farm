// A pig, built like the cattle and the sheep (parts.js): pink, as the reference draws it in the farm behind the plots.
// A plump round body on short legs, a big head straight off the shoulders with a flat round snout, ears flopping
// forward over its eyes, a curly tail; smooth pink skin. It roots about with its snout in the grass, now and then lifts
// its head to look about, twitches its tail and flicks its ears, and every so often walks a little way to another spot
// (herd in herd.js).
//
// A pig faces +z, standing on its origin. Its legs, head, tail and ears are children of their own, so they can move;
// userData.update(t, dt, speed) moves them.
import * as THREE from 'three';
import { BALL, CYL, HOOF, merged, hornGeometry, loft, grazing } from './parts.js';

const EYE = '#1d1d2a';

/** The kinds: the skin, the snout, its nostrils, the inside of the ears, the hooves, and how big it stands. */
export const PIGS = {
  pig: { skin: '#ffa8cc', snout: '#f78ab0', nostril: '#9d5560', ear: '#ec7fa4', hoof: '#7b5650', size: 0.8 },
};

// The body along its back, from the rump to the shoulders: round and plump, deepest in the middle.
const TRUNK = [
  [-0.3, 0.03, 0, 0, 0],
  [-0.295, 0.03, 0.08, 0.09, 0.09],
  [-0.275, 0.03, 0.14, 0.155, 0.155],
  [-0.21, 0.02, 0.18, 0.19, 0.19],
  [-0.105, 0.01, 0.2, 0.2, 0.21],
  [0.02, 0.0, 0.2, 0.2, 0.21],
  [0.125, 0.0, 0.185, 0.19, 0.19],
  [0.2, 0.0, 0.16, 0.17, 0.17],
  [0.245, 0.0, 0.12, 0.135, 0.135],
  [0.265, 0.0, 0, 0, 0],
];
const TRUNK_GEOMETRY = loft(TRUNK, 5, 32, 2.3);

// How far a pig goes in one stride (both pairs of legs stepping), as modelled, before its size.
const STRIDE = 0.24;

// The ground a pig takes up, before its size: circles along its back from the tail to the snout, [how far forward,
// radius], wide enough for the head lifted and turned to look about.
const BODY = [[-0.15, 0.21], [0.08, 0.21], [0.33, 0.14]];

/** A short leg `h` long and `w` thick hanging from its top at the origin. */
function leg(kind, h, w) {
  return merged((b, coat) => {
    coat.add(CYL, kind.skin, [0, -h * 0.45, 0], [w, h * 0.9, w * 1.05]);
    b.add(HOOF, kind.hoof, [0, -h + 0.016, 0.004], [w * 0.95, 0.032, w]);
  });
}

/**
 * A pig of the given kind (a name in PIGS), facing +z on its origin. userData.update(t, dt, speed) moves it: at a
 * standstill it roots about, at `speed` (world units a second) it walks, its legs stepping in time (grazing in
 * parts.js). `phase` puts it at another moment of rooting.
 */
export function pig(name, phase = 0) {
  const kind = PIGS[name];
  const g = new THREE.Group();
  // Everything bobs a little as it walks.
  const rig = new THREE.Group();
  g.add(rig);
  // Where the body sits, its legs up to it `len` long.
  const len = 0.11;
  const y = len + 0.19;

  rig.add(merged((b, coat) => {
    coat.add(TRUNK_GEOMETRY, kind.skin, [0, y, 0]);
    // Shoulders and hams, swelling a little out of the body down to the legs.
    for (const s of [-1, 1]) {
      coat.add(BALL, kind.skin, [s * 0.1, y - 0.05, 0.13], [0.08, 0.12, 0.09]);
      coat.add(BALL, kind.skin, [s * 0.1, y - 0.04, -0.17], [0.085, 0.13, 0.1]);
    }
  }));
  // The legs swing from the top: front left with back right, then front right with back left.
  const legs = [[-0.1, 0.14, 0], [0.1, 0.14, Math.PI], [-0.1, -0.17, Math.PI], [0.1, -0.17, 0]].map(([x, z, step]) => {
    const l = leg(kind, len + 0.05, 0.05);
    l.position.set(x, len + 0.05, z);
    l.userData.step = step;
    rig.add(l);
    return l;
  });

  // The tail, curled in a ring and a half at the top of the rump.
  const tail = new THREE.Group();
  tail.position.set(0, y + 0.09, -0.285);
  const curl = [];
  for (let k = 0; k <= 12; k++) {
    const a = (k / 12) * Math.PI * 3;
    const r = 0.035 * (1 - k / 20);
    curl.push([Math.sin(a) * r, Math.cos(a) * r - r + k * 0.003, -0.012 - k * 0.005]);
  }
  tail.add(merged((b) => b.add(hornGeometry(curl, 0.013, 0.007, 24, 6), kind.skin)));
  rig.add(tail);

  // The head comes straight off the shoulders; it swings down from there to root in the grass.
  const neck = new THREE.Group();
  neck.position.set(0, y + 0.02, 0.17);
  // It turns about the top of the skull: round, with full cheeks, and a flat round snout at the front.
  const head = new THREE.Group();
  head.position.set(0, 0, 0.06);
  head.scale.setScalar(1.15);
  head.add(merged((b, coat) => {
    coat.add(BALL, kind.skin, [0, -0.01, 0.03], [0.12, 0.11, 0.11]);
    for (const s of [-1, 1]) coat.add(BALL, kind.skin, [s * 0.05, -0.05, 0.06], [0.06, 0.06, 0.07]);
    coat.add(CYL, kind.skin, [0, -0.035, 0.13], [0.06, 0.07, 0.052], [Math.PI / 2, 0, 0]);
    b.add(CYL, kind.snout, [0, -0.035, 0.168], [0.052, 0.012, 0.045], [Math.PI / 2, 0, 0]);
    for (const s of [-1, 1]) {
      b.add(BALL, kind.nostril, [s * 0.017, -0.035, 0.173], [0.009, 0.012, 0.005]);
      b.add(BALL, EYE, [s * 0.062, 0.025, 0.105], 0.009);
      b.add(BALL, '#ffffff', [s * 0.065, 0.028, 0.111], 0.003);
    }
  }));
  // The ears, broad and pointed, flopping forward and down over the eyes, flicking now and then.
  const ears = [-1, 1].map((s) => {
    const ear = merged((b, coat) => {
      coat.add(BALL, kind.skin, [s * 0.025, 0.01, 0.035], [0.042, 0.012, 0.055], [0.7, s * -0.3, 0]);
      b.add(BALL, kind.ear, [s * 0.025, 0.004, 0.039], [0.032, 0.008, 0.042], [0.7, s * -0.3, 0]);
    });
    ear.position.set(s * 0.06, 0.085, 0.02);
    head.add(ear);
    return ear;
  });
  neck.add(head);
  rig.add(neck);

  // It roots with its snout down in the grass, now and then lifts its head to look about, and walks with it level.
  grazing(g, { rig, neck, head, legs, tail, ears }, { phase, stride: STRIDE * kind.size, poses: { graze: [0.55, 0.15], look: [-0.1, -0.05], walk: [0.1, 0.0] }, droop: 0.35 });
  // What a herd needs to know of it.
  Object.assign(g.userData, { size: kind.size, calf: false, body: BODY, pace: 0.11 });
  g.scale.setScalar(kind.size);
  return g;
}
