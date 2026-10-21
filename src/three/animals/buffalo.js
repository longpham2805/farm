// Buffaloes, built in code like the chickens: a grown buffalo and a calf (BUFFALOES), heavy in the forequarters like
// a Cape buffalo: the back rising to a hump over the shoulders and falling away to a smaller rump, a deep chest with a
// fold of skin under the throat, a thick neck carrying the head low in front, a long face down to a broad dark muzzle,
// horns meeting in a boss over the forehead and sweeping out and down, then up at the tips, drooping ears under them,
// and sturdy legs, darker below the knee. They graze, now and then lift their heads to look about, swish their tails
// and flick their ears, and every so often walk slowly to another spot (herd).
//
// A buffalo faces +z, standing on its origin. Its legs, neck and head, tail and ears are children of their own, so
// they can move; userData.update(t, dt, speed) moves them.
import * as THREE from 'three';
import { BALL, CYL, HOOF, merged, hornGeometry, loft, grazing } from './parts.js';

const EYE = '#1d1d2a';

/**
 * The kinds: hide, the darker legs below the knee, the muzzle, the horns' colour, the inside of the ears, and how big
 * it stands. A calf has only buds for horns, a bigger head for its body and longer legs.
 */
export const BUFFALOES = {
  buffalo: { hide: '#686e7a', dark: '#41444c', muzzle: '#2f3137', horn: '#c4bdb0', ear: '#b88e8b', size: 1.3 },
  calf: { hide: '#757c88', dark: '#4d5059', muzzle: '#3a3c43', horn: '#cfc6b6', ear: '#c39895', calf: true, size: 0.72 },
};

// The body along its back, from the rump to the chest, about the height it stands at: the rump smaller and lower, the
// barrel with its belly tucked up, the deep chest, and the hump over the shoulders the highest point.
const TRUNK = [
  [-0.45, 0.01, 0, 0, 0],
  [-0.44, 0.01, 0.07, 0.07, 0.07],
  [-0.41, 0.01, 0.12, 0.13, 0.12],
  [-0.34, 0.01, 0.155, 0.16, 0.155],
  [-0.23, 0.01, 0.17, 0.165, 0.165],
  [-0.09, 0.0, 0.185, 0.19, 0.18],
  [0.04, 0.02, 0.2, 0.235, 0.205],
  [0.14, 0.03, 0.2, 0.265, 0.225],
  [0.24, 0.03, 0.185, 0.225, 0.22],
  [0.32, 0.02, 0.15, 0.16, 0.19],
  [0.37, 0.0, 0.09, 0.09, 0.12],
  [0.385, 0.0, 0, 0, 0],
];
const TRUNK_GEOMETRY = loft(TRUNK);

/** A leg `h` long and `w` thick hanging from its top at the origin, darker below the knee. */
function leg(kind, h, w) {
  return merged((b, coat) => {
    coat.add(CYL, kind.hide, [0, -h * 0.3, 0], [w * 1.1, h * 0.6, w * 1.15]);
    coat.add(BALL, kind.dark, [0, -h * 0.58, 0], [w * 0.85, w * 0.85, w * 0.9]);
    coat.add(CYL, kind.dark, [0, -h * 0.78, 0], [w * 0.78, h * 0.4, w * 0.82]);
    b.add(HOOF, '#222226', [0, -h + 0.02, 0.006], [w * 0.92, 0.04, w]);
  });
}

// How far a buffalo goes in one stride (both pairs of legs stepping), as modelled, before its size.
const STRIDE = 0.42;

// The ground a buffalo takes up, before its size: circles along its back from the tail to the muzzle, [how far
// forward, radius], wide enough for the horns and for the head lifted and turned to look about.
const BODY = [[-0.27, 0.2], [0.07, 0.22], [0.5, 0.36], [0.7, 0.13]];

/**
 * A buffalo of the given kind (a name in BUFFALOES), facing +z on its origin. userData.update(t, dt, speed) moves it:
 * at a standstill it grazes, at `speed` (world units a second) it walks, its legs stepping in time (grazing in
 * parts.js); `phase` puts it at another moment of grazing. Let loose with herd (herd.js).
 */
export function buffalo(name, phase = 0) {
  const kind = BUFFALOES[name];
  const calf = !!kind.calf;
  const g = new THREE.Group();
  // Everything bobs a little as it walks.
  const rig = new THREE.Group();
  g.add(rig);
  // Where the body sits: the legs up to it are `len` long, longer for a calf.
  const len = calf ? 0.31 : 0.25;
  const y = len + 0.18;

  rig.add(merged((b, coat) => {
    coat.add(TRUNK_GEOMETRY, kind.hide, [0, y, 0]);
    // The fold of skin hanging under the throat.
    coat.add(BALL, kind.hide, [0, y - 0.13, 0.27], [0.05, 0.11, 0.075]);
    // Shoulders and haunches, swelling a little out of the body down to the legs.
    for (const s of [-1, 1]) {
      coat.add(BALL, kind.hide, [s * 0.1, y - 0.07, 0.17], [0.085, 0.17, 0.12]);
      coat.add(BALL, kind.hide, [s * 0.09, y - 0.04, -0.25], [0.085, 0.17, 0.14]);
    }
  }));
  // The legs swing from the top: front left with back right, then front right with back left. The front ones, under
  // the weight of the forequarters, are the stouter.
  const legs = [[-0.1, 0.17, 0.056, 0], [0.1, 0.17, 0.056, Math.PI], [-0.1, -0.24, 0.052, Math.PI], [0.1, -0.24, 0.052, 0]].map(([x, z, w, step]) => {
    const l = leg(kind, len + 0.06, w);
    l.position.set(x, len + 0.06, z);
    l.userData.step = step;
    rig.add(l);
    return l;
  });

  // The tail hangs from the top of the rump to the hocks, a tuft at its end.
  const tail = new THREE.Group();
  tail.position.set(0, y + 0.12, -0.38);
  tail.add(merged((b, coat) => {
    coat.add(CYL, kind.hide, [0, -0.15, -0.01], [0.012, 0.3, 0.012], [0.08, 0, 0]);
    coat.add(BALL, '#26272b', [0, -0.31, -0.02], [0.024, 0.055, 0.024]);
  }));
  rig.add(tail);

  // The thick neck swings down from the shoulders to graze, carrying the head.
  const neck = new THREE.Group();
  neck.position.set(0, y + 0.08, 0.26);
  neck.add(merged((b, coat) => coat.add(BALL, kind.hide, [0, -0.03, 0.08], [0.13, 0.15, 0.16], [0.35, 0, 0])));
  // The head turns about the top of the skull. Its long face slopes down and forward to a broad dark muzzle; a calf's
  // head is bigger for its body.
  const head = new THREE.Group();
  head.position.set(0, -0.02, 0.24);
  head.scale.setScalar(calf ? 1.3 : 1.15);
  head.add(merged((b, coat) => {
    coat.add(BALL, kind.hide, [0, -0.01, 0.02], [0.092, 0.085, 0.085]);
    coat.add(BALL, kind.hide, [0, -0.1, 0.075], [0.07, 0.12, 0.068], [-0.4, 0, 0]);
    b.add(BALL, kind.muzzle, [0, -0.19, 0.125], [0.076, 0.058, 0.066], [-0.2, 0, 0]);
    for (const s of [-1, 1]) {
      b.add(BALL, '#1d1d22', [s * 0.032, -0.2, 0.18], [0.015, 0.011, 0.01]);
      b.add(BALL, '#ece8e0', [s * 0.07, -0.035, 0.07], 0.019);
      b.add(BALL, EYE, [s * 0.076, -0.035, 0.08], 0.012);
      b.add(BALL, '#ffffff', [s * 0.08, -0.03, 0.088], 0.004);
    }
    if (!calf) {
      // The boss: the horns' broad bases meeting in one over the forehead; from it each horn sweeps out and down
      // beside the head, then up, its tip turning in a little.
      b.add(BALL, kind.horn, [0, 0.058, 0.0], [0.11, 0.038, 0.068]);
      for (const s of [-1, 1]) {
        b.add(hornGeometry([[s * 0.08, 0.058, -0.005], [s * 0.145, 0.03, -0.01], [s * 0.195, -0.01, -0.015], [s * 0.24, 0.0, -0.025], [s * 0.265, 0.05, -0.045], [s * 0.245, 0.095, -0.075]], 0.04, 0.007), kind.horn);
      }
    } else {
      // A calf's horns are only buds, in a tuft of hair.
      coat.add(BALL, kind.dark, [0, 0.065, 0.0], [0.05, 0.025, 0.05]);
      for (const s of [-1, 1]) b.add(BALL, kind.horn, [s * 0.05, 0.06, 0.0], [0.018, 0.022, 0.018]);
    }
  }));
  // The ears, broad and drooping under the horns, pink inside, flicking now and then.
  const ears = [-1, 1].map((s) => {
    const ear = merged((b, coat) => {
      coat.add(BALL, kind.hide, [s * 0.055, 0, 0], [0.062, 0.036, 0.016]);
      b.add(BALL, kind.ear, [s * 0.058, -0.002, 0.008], [0.046, 0.025, 0.01]);
    });
    ear.position.set(s * 0.08, -0.04, 0.0);
    ear.rotation.z = s * -0.5;
    head.add(ear);
    return ear;
  });
  neck.add(head);
  rig.add(neck);

  // It grazes with its muzzle down in the grass, now and then lifts its head to look about, and walks with it low.
  grazing(g, { rig, neck, head, legs, tail, ears }, { phase, stride: STRIDE * kind.size, poses: { graze: [0.9, -0.3], look: [0.1, 0.15], walk: [0.3, 0.1] }, droop: 0.5 });
  // What a herd needs to know of it.
  Object.assign(g.userData, { size: kind.size, calf, body: BODY, pace: calf ? 0.15 : 0.11 });
  g.scale.setScalar(kind.size);
  return g;
}
