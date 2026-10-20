// A robin, built in code like the chickens: a round brown bird with an orange breast and face, a pale belly, its wings
// folded and its tail down behind, perched; it looks about in quick jerks, as a robin does. One sits on the post by the
// back fence of the fields over the big bridge (buildings/birdPost.js).
//
// A robin faces +z, standing on its origin. Its head is a child of its own, so it can look about.
import * as THREE from 'three';
import { Batch } from '../batch.js';

const BALL = new THREE.SphereGeometry(1, 14, 10);
const BOX = new THREE.BoxGeometry(1, 1, 1);
const CYL = new THREE.CylinderGeometry(1, 1, 1, 6);
const CONE = new THREE.ConeGeometry(1, 1, 6);

/** The robin's colours: back and crown, wings, tail, breast and face, belly, legs, beak, eyes. */
export const ROBIN = { back: '#8a6a44', wing: '#73552f', tail: '#5e4529', breast: '#ec6a2c', belly: '#f1e8d8', legs: '#5a4a3e', beak: '#3a2e26', eye: '#1d1d2a' };

function merged(build) {
  const batch = new Batch();
  build(batch);
  return batch.build();
}

/** A value in 0..1 that is the same for the same n. */
const hash = (n) => {
  const s = Math.sin(n * 12.9898 + 4.1414) * 43758.5453;
  return s - Math.floor(s);
};

/**
 * A robin perched, `size` times its usual size (about 0.2 tall, drawn bigger than life as the game's swallows are),
 * facing +z on its origin. Its head is userData.head; userData.look is the way it mostly looks (0, ahead), and
 * userData.update(t) has it look about.
 */
export function robin(size = 1, c = ROBIN) {
  const g = new THREE.Group();
  g.add(merged((b) => {
    // Short legs gripping the perch, three toes forward and one back.
    for (const x of [-0.016, 0.016]) {
      b.add(CYL, c.legs, [x, 0.018, 0.004], [0.005, 0.036, 0.005]);
      for (const a of [-0.45, 0, 0.45, Math.PI]) b.add(BOX, c.legs, [x + Math.sin(a) * 0.01, 0.003, 0.004 + Math.cos(a) * 0.01], [0.006, 0.005, 0.022], [0, a, 0]);
    }
    // A round body, tipped up at the front: brown over the back, the orange breast, a pale belly under it.
    b.add(BALL, c.back, [0, 0.085, -0.012], [0.062, 0.064, 0.082], [-0.3, 0, 0]);
    b.add(BALL, c.breast, [0, 0.094, 0.03], [0.056, 0.06, 0.05]);
    b.add(BALL, c.belly, [0, 0.062, 0.012], [0.048, 0.036, 0.054]);
    // Wings folded close along its sides, their tips over the base of the tail.
    for (const s of [-1, 1]) b.add(BALL, c.wing, [s * 0.037, 0.087, -0.034], [0.016, 0.036, 0.06], [0.25, s * 0.16, s * 0.05]);
    // The tail, a flat oval down and out behind from under them.
    b.add(BALL, c.tail, [0, 0.056, -0.11], [0.024, 0.008, 0.05], [-0.5, 0, 0]);
  }));
  const head = merged((b) => {
    const r = 0.044;
    b.add(BALL, c.back, [0, 0.004, -0.004], r);
    // The orange face from the forehead down to the breast, the crown and nape left brown.
    b.add(BALL, c.breast, [0, -0.01, 0.017], [r * 0.9, r * 0.82, r * 0.72]);
    b.add(CONE, c.beak, [0, -0.004, 0.058], [0.007, 0.022, 0.007], [Math.PI / 2, 0, 0]);
    // Big dark eyes, a little forward, a glint in each.
    for (const s of [-1, 1]) {
      b.add(BALL, c.eye, [s * r * 0.7, r * 0.18, r * 0.5], r * 0.19);
      b.add(BALL, '#ffffff', [s * r * 0.8, r * 0.26, r * 0.56], r * 0.06);
    }
  });
  head.position.set(0, 0.14, 0.04);
  g.add(head);
  g.userData.head = head;
  g.userData.look = 0;
  // It holds each look for most of a second, then turns its head quickly to the next, now and then cocking it.
  g.userData.update = (t) => {
    const k = Math.floor(t / 0.9);
    const turn = THREE.MathUtils.smoothstep(t / 0.9 - k, 0, 0.12);
    const look = (n) => [(hash(n) - 0.5) * 1.6, hash(n + 0.5) < 0.3 ? (hash(n + 0.7) - 0.5) * 0.7 : 0];
    const [a0, z0] = look(k - 1);
    const [a1, z1] = look(k);
    head.rotation.y = g.userData.look + THREE.MathUtils.lerp(a0, a1, turn);
    head.rotation.z = THREE.MathUtils.lerp(z0, z1, turn);
  };
  g.scale.setScalar(size);
  return g;
}
