// Birds high over the valley, built in code like the chickens: swallows (BIRDS), and a few of them wheeling round
// over the hills behind the farm (wheel). Each flies a circle of its own, beating its wings for a while, then gliding
// with them held out, and banks into the turn.
//
// A bird faces +z, its middle on its origin. Its wings are children of their own, turning at the shoulder, and each
// one strip that curves about the wrist as it beats.
import * as THREE from 'three';
import { Batch } from '../batch.js';

const BALL = new THREE.SphereGeometry(1, 12, 9);
const CONE = new THREE.ConeGeometry(1, 1, 6);

/** The kinds: the back and wings, the belly, the throat, and how big it is. */
export const BIRDS = {
  // Drawn about twice a swallow's size against the farm, so it reads from the game's camera.
  swallow: { back: '#2b3654', belly: '#f2ede3', throat: '#b8582f', size: 1.8 },
};

function merged(build) {
  const batch = new Batch();
  build(batch);
  return batch.build({ castShadow: false });
}

// A wing: one strip from the root out along +x to its tip, `STATIONS` steps of it, each [how far out, its leading
// edge, its trailing edge] (z): broad at the root, narrowing and sweeping back to a long point, a swallow's scythe.
const SPAN = 0.26;
const STATIONS = 12;
const WING = Array.from({ length: STATIONS + 1 }, (_, i) => {
  const t = i / STATIONS;
  const middle = -0.11 * t ** 1.6;
  const chord = 0.075 * (1 - t) ** 0.7 + 0.006;
  return [t * SPAN, middle + chord * 0.45, middle - chord * 0.55];
});

/** A wing's own geometry, flat; bendWing curls it. */
function wingGeometry() {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array((STATIONS + 1) * 6), 3));
  const index = [];
  for (let i = 0; i < STATIONS; i++) {
    const [a, b, c, d] = [i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 3];
    index.push(a, b, c, b, d, c);
  }
  g.setIndex(index);
  bendWing(g, 0);
  return g;
}

/**
 * Bends a wing at its wrist, `bend` radians up (down if below 0) from the inner half to the tip: the bend comes on
 * gradually across the middle of the wing, so it curves there rather than breaking.
 */
function bendWing(g, bend) {
  const pos = g.attributes.position;
  let [x, y, a] = [0, 0, 0];
  WING.forEach(([out, lead, trail], i) => {
    if (i) {
      const step = out - WING[i - 1][0];
      const t = out / SPAN;
      a = bend * Math.min(1, Math.max(0, (t - 0.3) / 0.4)) ** 2;
      x += Math.cos(a) * step;
      y += Math.sin(a) * step;
    }
    pos.setXYZ(i * 2, x, y, lead);
    pos.setXYZ(i * 2 + 1, x, y, trail);
  });
  pos.needsUpdate = true;
  g.computeVertexNormals();
}

// The forked tail, flat: from inside the body back to two long streamers with a notch between them.
const TAIL = (() => {
  const shape = new THREE.Shape();
  shape.moveTo(-0.022, -0.05);
  shape.quadraticCurveTo(-0.045, -0.13, -0.05, -0.21);
  shape.quadraticCurveTo(-0.03, -0.15, 0, -0.125);
  shape.quadraticCurveTo(0.03, -0.15, 0.05, -0.21);
  shape.quadraticCurveTo(0.045, -0.13, 0.022, -0.05);
  shape.closePath();
  // Turned to lie flat, the shape's y runs along z: back along the bird.
  return new THREE.ShapeGeometry(shape, 6).rotateX(Math.PI / 2);
})();

/** A bird of the given kind (a name in BIRDS), facing +z on its origin; userData.flap(a, glide) sets its wings. */
export function bird(name) {
  const kind = BIRDS[name];
  const g = new THREE.Group();
  g.add(merged((b) => {
    // A slim body, dark above and pale beneath, a rufous throat and a small head.
    b.add(BALL, kind.back, [0, 0.004, 0], [0.032, 0.026, 0.085]);
    b.add(BALL, kind.belly, [0, -0.008, 0.005], [0.028, 0.02, 0.075]);
    b.add(BALL, kind.back, [0, 0.008, 0.085], [0.026, 0.024, 0.028]);
    b.add(BALL, kind.throat, [0, -0.004, 0.096], [0.018, 0.015, 0.016]);
    b.add(CONE, '#1d1d22', [0, 0.004, 0.118], [0.006, 0.02, 0.006], [Math.PI / 2, 0, 0]);
  }));
  const material = new THREE.MeshStandardMaterial({ color: kind.back, side: THREE.DoubleSide, roughness: 0.8 });
  const tail = new THREE.Mesh(TAIL, material);
  tail.position.y = 0.004;
  g.add(tail);
  // Each wing turns at the shoulder and bends at the wrist, the bend lagging a little behind the beat.
  const wings = [1, -1].map((s) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(s * 0.018, 0.01, 0.02);
    shoulder.scale.x = s;
    const geometry = wingGeometry();
    shoulder.add(new THREE.Mesh(geometry, material));
    g.add(shoulder);
    return { shoulder, geometry, s };
  });
  // a: where in its beat (radians); glide: 0 for wings beating, 1 for held out gliding.
  g.userData.flap = (a, glide) => {
    for (const { shoulder, geometry, s } of wings) {
      // The shoulder turns after its mirroring, so the right wing's turns the other way round.
      shoulder.rotation.z = s * ((1 - glide) * Math.sin(a) * 0.7 + glide * 0.12);
      bendWing(geometry, (1 - glide) * Math.sin(a - 0.7) * 0.6 + glide * 0.06);
    }
  };
  g.userData.flap(0, 1);
  g.scale.setScalar(kind.size);
  return g;
}

/**
 * Birds of the given kinds (names in BIRDS) wheeling round `centre` (a world point, high up): each flies a circle of
 * its own, wider for each, at its own height and speed, beating its wings for a few seconds, then gliding, banking
 * into the turn. Returns its group and update(t, dt).
 */
export function wheel(centre, names) {
  const group = new THREE.Group();
  const birds = names.map((name, k) => {
    const b = bird(name);
    Object.assign(b.userData, { phase: k * 2.1, radius: 2.6 + k * 0.7, speed: 0.22 - k * 0.025, height: k * 0.35 });
    group.add(b);
    return b;
  });
  const update = (t) => {
    for (const b of birds) {
      const { phase, radius, speed, height } = b.userData;
      const a = t * speed + phase;
      b.position.set(centre.x + Math.cos(a) * radius, centre.y + height + Math.sin(t * 0.5 + phase) * 0.2, centre.z + Math.sin(a) * radius);
      // It faces along the circle and leans into it, its right wing down towards the middle.
      b.rotation.set(0, -a, 0);
      b.rotateZ(0.35);
      // A few seconds beating its wings, then a few gliding.
      const c = (t + phase * 3) % 9;
      const glide = Math.min(1, Math.max(0, (c - 3.5) * 2)) * Math.min(1, Math.max(0, (8.5 - c) * 2));
      b.userData.flap(t * 14 + phase, glide);
    }
  };
  return { group, update };
}
