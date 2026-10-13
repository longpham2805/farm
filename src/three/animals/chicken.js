// Chickens, built in code like the rest of the farm: hens of a few breeds, a rooster and a chick (CHICKENS), and a
// flock that wanders about any patch of ground, stopping to peck. A coop lets its flock loose in its yard; the same
// birds can be let loose anywhere else.
//
// A chicken faces +z, standing on its origin. Its head is a child of its own, so it can peck.
import * as THREE from 'three';
import { Batch } from '../batch.js';

const TAU = Math.PI * 2;
const BALL = new THREE.SphereGeometry(1, 14, 10);
const BOX = new THREE.BoxGeometry(1, 1, 1);
const CYL = new THREE.CylinderGeometry(1, 1, 1, 6);
const CONE = new THREE.ConeGeometry(1, 1, 6);
// A sickle feather of the rooster's tail: an arc in the y-z plane round a centre R behind where it starts, rising
// from its root up and over to the back and down.
const SICKLE_R = 0.08;
const SICKLE = new THREE.TorusGeometry(SICKLE_R, 0.011, 5, 12, Math.PI * 0.85).rotateY(-Math.PI / 2);

const LEGS = '#f4a63a';
const BEAK = '#ffb33a';
const COMB = '#e8413a';
const EYE = '#1d1d2a';

/**
 * The breeds: body, wing and tail feathers, and the neck's hackles. `specks` dots the body; `rooster` and `chick`
 * pick those shapes, and `size` how big it stands.
 */
export const CHICKENS = {
  white: { body: '#fbf6ec', wing: '#ebe1cf', tail: '#f1e9da', neck: '#fdf9f1', size: 1.15 },
  brown: { body: '#c97a3f', wing: '#a85f2c', tail: '#6e3a1c', neck: '#dc914f', size: 1.15 },
  gold: { body: '#eab36b', wing: '#d49a52', tail: '#a8702f', neck: '#f4c98a', size: 1.15 },
  black: { body: '#3a3d48', wing: '#2c2f38', tail: '#24443c', neck: '#4a4e5c', size: 1.15 },
  speckled: { body: '#ece6da', wing: '#d2c9b8', tail: '#3a3d48', neck: '#f6f1e8', specks: '#3a3d48', size: 1.15 },
  rooster: { body: '#c4562a', wing: '#8a3a1f', tail: '#1f4a3a', neck: '#eaa53c', rooster: true, size: 1.32 },
  chick: { body: '#ffe066', wing: '#f5d14e', chick: true, size: 1.06 },
};

function merged(build) {
  const batch = new Batch();
  build(batch);
  return batch.build();
}

/** Two legs with three toes each, `h` tall. */
function legs(b, h, spread = 0.03) {
  for (const x of [-spread, spread]) {
    b.add(CYL, LEGS, [x, h / 2, 0.005], [0.008, h, 0.008]);
    for (const a of [-0.5, 0, 0.5]) b.add(BOX, LEGS, [x + Math.sin(a) * 0.015, 0.004, 0.02 + Math.cos(a) * 0.012], [0.008, 0.006, 0.03], [0, a, 0]);
  }
}

/** Eyes on either side of a head of radius r round (0, y, z), looking a little forward. */
function eyes(b, r, y, z) {
  for (const s of [-1, 1]) {
    b.add(BALL, EYE, [s * r * 0.72, y + r * 0.25, z + r * 0.55], r * 0.2);
    b.add(BALL, '#ffffff', [s * r * 0.8, y + r * 0.33, z + r * 0.62], r * 0.07);
  }
}

function chick(kind) {
  const g = new THREE.Group();
  g.add(merged((b) => {
    legs(b, 0.03, 0.018);
    b.add(BALL, kind.body, [0, 0.06, 0], [0.05, 0.045, 0.055]);
    for (const s of [-1, 1]) b.add(BALL, kind.wing, [s * 0.044, 0.062, -0.005], [0.012, 0.025, 0.035], [0, 0, s * 0.3]);
    b.add(CONE, kind.wing, [0, 0.075, -0.05], [0.015, 0.025, 0.01], [-1.2, 0, 0]);
  }));
  const head = merged((b) => {
    b.add(BALL, kind.body, [0, 0.025, 0.01], 0.034);
    b.add(CONE, BEAK, [0, 0.02, 0.048], [0.009, 0.02, 0.009], [Math.PI / 2, 0, 0]);
    eyes(b, 0.034, 0.025, 0.01);
    b.add(BALL, kind.body, [0, 0.058, 0.006], [0.008, 0.012, 0.008]);
  });
  head.position.set(0, 0.075, 0.03);
  g.add(head);
  g.userData.head = head;
  return g;
}

function bird(kind) {
  const g = new THREE.Group();
  const rooster = !!kind.rooster;
  g.add(merged((b) => {
    legs(b, rooster ? 0.06 : 0.05);
    // A round body with a full breast, wings folded at its sides and a tail cocked up behind.
    b.add(BALL, kind.body, [0, 0.105, -0.005], [0.085, 0.075, 0.105]);
    b.add(BALL, kind.body, [0, 0.1, 0.05], [0.07, 0.068, 0.06]);
    for (const s of [-1, 1]) b.add(BALL, kind.wing, [s * 0.074, 0.105, -0.018], [0.018, 0.046, 0.072], [0.2, 0, s * 0.08]);
    if (kind.specks) {
      // Dots over the body's surface, from its shoulders down its sides, not under it.
      for (let k = 0; k < 26; k++) {
        const up = 0.5 + ((k * 0.618) % 1) * 1.2;
        const round = k * 2.4;
        const p = [Math.sin(up) * Math.cos(round) * 0.086, 0.105 + Math.cos(up) * 0.076, -0.005 + Math.sin(up) * Math.sin(round) * 0.106];
        b.add(BALL, kind.specks, p, [0.009, 0.006, 0.009]);
      }
    }
    if (rooster) {
      // Long sickle feathers arching back, shining dark green.
      for (const [x, s, tilt] of [[-0.022, 1, 0.12], [0.022, 0.9, -0.12], [0, 1.15, 0]]) {
        b.add(SICKLE, kind.tail, [x, 0.14, -0.09 - SICKLE_R * s], s, [0, tilt, 0]);
      }
      b.add(BALL, kind.tail, [0, 0.15, -0.1], [0.035, 0.06, 0.03], [-0.6, 0, 0]);
    } else {
      for (const [x, roll] of [[-0.018, -0.25], [0, 0], [0.018, 0.25]]) b.add(BALL, kind.tail, [x, 0.16, -0.098], [0.022, 0.06, 0.016], [-0.55, 0, roll]);
    }
    // The neck, with its hackles.
    b.add(BALL, kind.neck, [0, 0.15, 0.06], [0.046, 0.058, 0.046], [0.3, 0, 0]);
  }));
  const head = merged((b) => {
    const r = 0.042;
    b.add(BALL, kind.neck, [0, 0.025, 0.012], r);
    // A comb of red lobes along the crown, bigger on a rooster, and wattles under the beak.
    const lobes = rooster ? [[-0.018, 0.016], [0, 0.022], [0.018, 0.018], [0.034, 0.012]] : [[-0.01, 0.011], [0.005, 0.014], [0.02, 0.01]];
    for (const [z, r2] of lobes) b.add(BALL, COMB, [0, 0.07 + r2 * 0.4, z], [r2 * 0.5, r2 * 1.2, r2]);
    b.add(CONE, BEAK, [0, 0.022, 0.06], [0.013, 0.032, 0.013], [Math.PI / 2, 0, 0]);
    const wattle = rooster ? 0.016 : 0.01;
    for (const x of [-0.007, 0.007]) b.add(BALL, COMB, [x, -0.005, 0.042], [wattle * 0.6, wattle * 1.4, wattle * 0.7]);
    eyes(b, r, 0.025, 0.012);
  });
  head.position.set(0, 0.165, 0.075);
  g.add(head);
  g.userData.head = head;
  return g;
}

/** A chicken of the given breed (a name in CHICKENS), facing +z on its origin; its head is userData.head. */
export function chicken(name) {
  const kind = CHICKENS[name];
  const g = kind.chick ? chick(kind) : bird(kind);
  g.scale.setScalar(kind.size);
  return g;
}

/** Whether the world point (x, z) is inside the polygon of world points `area`. */
function inside(area, x, z) {
  let hit = false;
  for (let i = 0, j = area.length - 1; i < area.length; j = i++) {
    const a = area[i];
    const b = area[j];
    if (a.z > z !== b.z > z && x < ((b.x - a.x) * (z - a.z)) / (b.z - a.z) + a.x) hit = !hit;
  }
  return hit;
}

/**
 * A flock of the given breeds (names in CHICKENS) let loose in `area`, a polygon of world points: each walks to a
 * spot inside, waits there pecking, and walks on. Returns its group and update(t, dt).
 */
export function flock(area, names) {
  const group = new THREE.Group();
  const xs = area.map((p) => p.x);
  const zs = area.map((p) => p.z);
  const box = [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)];
  const spot = () => {
    for (let k = 0; k < 50; k++) {
      const x = box[0] + Math.random() * (box[1] - box[0]);
      const z = box[2] + Math.random() * (box[3] - box[2]);
      if (inside(area, x, z)) return [x, z];
    }
    return [(box[0] + box[1]) / 2, (box[2] + box[3]) / 2];
  };
  const birds = names.map((name) => {
    const c = chicken(name);
    const [x, z] = spot();
    c.position.set(x, 0, z);
    c.rotation.y = Math.random() * TAU;
    Object.assign(c.userData, { target: spot(), wait: Math.random() * 2, phase: Math.random() * TAU, speed: CHICKENS[name].chick ? 0.36 : 0.28 });
    group.add(c);
    return c;
  });
  const update = (t, dt) => {
    for (const c of birds) {
      const u = c.userData;
      if (u.wait > 0) {
        u.wait -= dt;
        u.head.rotation.x = 0.95 * Math.max(0, Math.sin(t * 9 + u.phase));
        c.position.y = 0;
        if (u.wait <= 0) u.target = spot();
        continue;
      }
      const dx = u.target[0] - c.position.x;
      const dz = u.target[1] - c.position.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.03) {
        u.wait = 0.8 + Math.random() * 2.6;
        continue;
      }
      const step = Math.min(d, dt * u.speed);
      c.position.x += (dx / d) * step;
      c.position.z += (dz / d) * step;
      c.position.y = Math.abs(Math.sin(t * 16 + u.phase)) * 0.012;
      c.rotation.y = Math.atan2(dx, dz);
      u.head.rotation.x = 0.1;
    }
  };
  return { group, update };
}
