// Ducks on the river, built in code like the chickens: a white mother duck and her yellow ducklings (DUCKS), and a
// family that paddles about a stretch of river (paddle). The mother swims slowly from one spot to another and rests
// there, now and then tipping up to feed with her tail in the air; the ducklings keep near her, each in its own way,
// and rings of ripples spread from each as it swims.
//
// A duck faces +z, floating on its origin, the water's surface; what lies under it is hidden by the painted water.
import * as THREE from 'three';
import { Batch } from '../batch.js';

const TAU = Math.PI * 2;
const BALL = new THREE.SphereGeometry(1, 14, 10);
const CONE = new THREE.ConeGeometry(1, 1, 6);
const EYE = '#1d1d2a';

/** The kinds: body, folded wings, bill, and how big it floats. A duckling is round and downy, its bill small. */
export const DUCKS = {
  duck: { body: '#fbf8f1', wing: '#ebe4d6', bill: '#f59a2c', size: 1.25 },
  duckling: { body: '#ffe066', wing: '#f5cf48', bill: '#f0a43a', duckling: true, size: 1.0 },
};

function merged(build) {
  const batch = new Batch();
  build(batch);
  return batch.build();
}

/**
 * A duck of the given kind (a name in DUCKS), facing +z, floating on its origin. Its body tips about its rig to feed
 * (userData.rig) and its head nods as it paddles (userData.head).
 */
export function duck(name) {
  const kind = DUCKS[name];
  const g = new THREE.Group();
  const rig = new THREE.Group();
  g.add(rig);
  const head = new THREE.Group();
  if (kind.duckling) {
    // Round and downy, stubs of wings, a tuft of a tail.
    rig.add(merged((b) => {
      b.add(BALL, kind.body, [0, 0.018, 0], [0.042, 0.034, 0.05]);
      for (const s of [-1, 1]) b.add(BALL, kind.wing, [s * 0.036, 0.026, -0.008], [0.012, 0.018, 0.026], [0, 0, s * 0.3]);
      b.add(CONE, kind.wing, [0, 0.035, -0.048], [0.012, 0.022, 0.01], [-1.1, 0, 0]);
    }));
    head.position.set(0, 0.052, 0.03);
    head.add(merged((b) => {
      b.add(BALL, kind.body, [0, 0.008, 0.006], 0.028);
      b.add(BALL, kind.bill, [0, 0.0, 0.034], [0.011, 0.005, 0.016]);
      for (const s of [-1, 1]) {
        b.add(BALL, EYE, [s * 0.02, 0.014, 0.019], 0.0055);
        b.add(BALL, '#ffffff', [s * 0.022, 0.016, 0.022], 0.0018);
      }
      b.add(BALL, kind.body, [0, 0.034, 0.004], [0.006, 0.01, 0.006]);
    }));
  } else {
    // A long body riding low in the water, a full breast, wings folded along its sides and its tail turned up behind.
    rig.add(merged((b) => {
      b.add(BALL, kind.body, [0, 0.015, -0.01], [0.068, 0.048, 0.105]);
      b.add(BALL, kind.body, [0, 0.025, 0.045], [0.058, 0.05, 0.06]);
      for (const s of [-1, 1]) b.add(BALL, kind.wing, [s * 0.055, 0.036, -0.025], [0.011, 0.022, 0.066], [0.12, 0, s * 0.18]);
      b.add(BALL, kind.body, [0, 0.042, -0.1], [0.024, 0.014, 0.042], [-0.6, 0, 0]);
      // The neck, up from the breast.
      b.add(BALL, kind.body, [0, 0.075, 0.06], [0.027, 0.045, 0.028], [0.15, 0, 0]);
    }));
    head.position.set(0, 0.105, 0.068);
    head.add(merged((b) => {
      b.add(BALL, kind.body, [0, 0.012, 0.008], [0.033, 0.034, 0.04]);
      // The bill: broad and flat, a little turned up at its tip.
      b.add(BALL, kind.bill, [0, -0.002, 0.052], [0.016, 0.007, 0.03], [-0.12, 0, 0]);
      for (const s of [-1, 1]) {
        b.add(BALL, EYE, [s * 0.024, 0.02, 0.022], 0.0065);
        b.add(BALL, '#ffffff', [s * 0.026, 0.023, 0.025], 0.002);
      }
    }));
  }
  rig.add(head);
  Object.assign(g.userData, { rig, head, size: kind.size });
  g.scale.setScalar(kind.size);
  return g;
}

// Ripples: rings spreading over the water from where a duck was, growing and fading.
const RING = new THREE.RingGeometry(0.88, 1, 40).rotateX(-Math.PI / 2);
const RIPPLE_LIFE = 2.4;

/**
 * A mother duck and her ducklings (names in DUCKS, the mother first) paddling about a stretch of river: `way`, world
 * points down the middle of the stretch, and `half`, how far either side of it they may swim. The mother swims to a
 * spot along it, rests there a while, now and then tipping up to feed, and swims on; the ducklings keep near her,
 * each swimming after a spot of its own, behind her as she swims and all round her as she rests, and pecking at the
 * water when still. Returns its group and update(t, dt).
 */
export function paddle(way, half, names) {
  const group = new THREE.Group();
  // Where along the way a point s (0 to the end) is, `side` of the way from its middle (-1 to 1).
  const lengths = [0];
  for (let i = 1; i < way.length; i++) lengths.push(lengths[i - 1] + way[i].distanceTo(way[i - 1]));
  const end = lengths.at(-1);
  const point = (s, side) => {
    let i = 1;
    while (i < way.length - 1 && lengths[i] < s) i++;
    const a = way[i - 1];
    const b = way[i];
    const f = Math.min(1, Math.max(0, (s - lengths[i - 1]) / (lengths[i] - lengths[i - 1])));
    const dir = b.clone().sub(a).normalize();
    return a.clone().lerp(b, f).add(new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(side * half));
  };
  // The nearest point to (x, z) down the middle of the way, and how far it is.
  const nearest = (x, z) => {
    let best = null;
    for (let i = 1; i < way.length; i++) {
      const a = way[i - 1];
      const b = way[i];
      const [ex, ez] = [b.x - a.x, b.z - a.z];
      const f = Math.min(1, Math.max(0, ((x - a.x) * ex + (z - a.z) * ez) / (ex * ex + ez * ez)));
      const [px, pz] = [a.x + ex * f, a.z + ez * f];
      const d = Math.hypot(x - px, z - pz);
      if (!best || d < best.d) best = { x: px, z: pz, d };
    }
    return best;
  };
  const ducks = names.map((name) => {
    const d = duck(name);
    group.add(d);
    return d;
  });
  const [mother, ...young] = ducks;
  mother.position.copy(point(end * 0.5, 0));
  // Where each duckling makes for: a spot near its mother, [to her side, behind her], picked afresh every few
  // seconds; how fast it swims at most, and how it is moving.
  const near = (moving) => {
    if (moving) return [(Math.random() * 2 - 1) * 0.2, 0.14 + Math.random() * 0.3];
    const a = Math.random() * TAU;
    const r = 0.16 + Math.random() * 0.25;
    return [Math.sin(a) * r, Math.cos(a) * r];
  };
  young.forEach((d, k) => {
    Object.assign(d.userData, { spot: near(false), next: Math.random() * 3, pace: 0.12 + Math.random() * 0.05, vx: 0, vz: 0, phase: k * 1.9 });
    const [side, back] = d.userData.spot;
    d.position.set(mother.position.x + side, 0, mother.position.z - back);
    d.rotation.y = Math.random() * TAU;
  });
  const ripples = ducks.flatMap((d, k) => [0, 1].map((n) => {
    const r = new THREE.Mesh(RING, new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false }));
    r.userData = { duck: d, age: (n + k * 0.37) * RIPPLE_LIFE * 0.5, size: d.userData.size };
    r.position.set(d.position.x, 0.006, d.position.z);
    r.renderOrder = 1;
    group.add(r);
    return r;
  }));
  let target = null;
  let wait = 2;
  let tip = 0;
  const swimTo = () => point(Math.random() * end, (Math.random() * 2 - 1) * 0.8);
  const update = (t, dt) => {
    let moving = false;
    if (!target) {
      wait -= dt;
      if (wait <= 0) target = swimTo();
    } else {
      const dx = target.x - mother.position.x;
      const dz = target.z - mother.position.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.03) {
        target = null;
        wait = 4 + Math.random() * 8;
      } else {
        moving = true;
        // Turning towards it as she goes.
        let turn = Math.atan2(dx, dz) - mother.rotation.y;
        turn = Math.atan2(Math.sin(turn), Math.cos(turn));
        mother.rotation.y += Math.sign(turn) * Math.min(Math.abs(turn), dt * 1.2);
        const step = Math.min(d, dt * 0.09 * Math.max(0.25, Math.cos(turn)));
        mother.position.x += (dx / d) * step;
        mother.position.z += (dz / d) * step;
      }
    }
    // Resting, she tips up to feed now and then, her head under and her tail in the air, for a couple of seconds.
    const c = (t % 11) / 11;
    const feeding = !moving && wait > 1.5 && c > 0.55 && c < 0.75;
    tip += ((feeding ? 1 : 0) - tip) * Math.min(1, dt * 4);
    mother.userData.rig.rotation.x = tip * 1.7;
    // Each duckling swims after a spot of its own near her, behind her as she swims and all round her as she rests,
    // speeding up and slowing down as it goes, keeping off the others and inside the river.
    const h = mother.rotation.y;
    young.forEach((d) => {
      const u = d.userData;
      u.next -= dt;
      if (u.next <= 0) {
        u.spot = near(moving);
        u.next = 2 + Math.random() * 5;
      }
      const [side, back] = u.spot;
      const tx = mother.position.x - Math.sin(h) * back + Math.cos(h) * side;
      const tz = mother.position.z - Math.cos(h) * back - Math.sin(h) * side;
      const [dx, dz] = [tx - d.position.x, tz - d.position.z];
      const dist = Math.hypot(dx, dz) || 1;
      // Slowing as it gets there; now and then a little faster, and faster still when it has fallen behind her.
      const behind = Math.max(0, Math.hypot(mother.position.x - d.position.x, mother.position.z - d.position.z) - 0.5);
      const speed = Math.min(u.pace * (1 + 0.3 * Math.sin(t * 0.8 + u.phase)) * (1 + behind * 2), dist * 1.2);
      let [wx, wz] = [(dx / dist) * speed, (dz / dist) * speed];
      for (const o of ducks) {
        if (o === d) continue;
        const [ox, oz] = [d.position.x - o.position.x, d.position.z - o.position.z];
        const gap = Math.hypot(ox, oz);
        const room = o === mother ? 0.18 : 0.13;
        if (gap > 1e-4 && gap < room) {
          wx += (ox / gap) * (room - gap) * 5;
          wz += (oz / gap) * (room - gap) * 5;
        }
      }
      u.vx += (wx - u.vx) * Math.min(1, dt * 2);
      u.vz += (wz - u.vz) * Math.min(1, dt * 2);
      d.position.x += u.vx * dt;
      d.position.z += u.vz * dt;
      // It turns the way it is swimming; nearly still, it stays as it is and pecks at the water now and then.
      const going = Math.hypot(u.vx, u.vz);
      if (going > 0.015) {
        let turn = Math.atan2(u.vx, u.vz) - d.rotation.y;
        turn = Math.atan2(Math.sin(turn), Math.cos(turn));
        d.rotation.y += turn * Math.min(1, dt * 3);
      }
      u.pecking = going < 0.03;
    });
    // However they press together, none sits on another.
    for (const d of young) {
      for (const o of ducks) {
        if (o === d) continue;
        const least = o === mother ? 0.13 : 0.085;
        const [ox, oz] = [d.position.x - o.position.x, d.position.z - o.position.z];
        const gap = Math.hypot(ox, oz);
        if (gap > 1e-4 && gap < least) {
          // The mother keeps her way; two ducklings each give half.
          const push = (least - gap) / (o === mother ? 1 : 2);
          d.position.x += (ox / gap) * push;
          d.position.z += (oz / gap) * push;
          if (o !== mother) {
            o.position.x -= (ox / gap) * push;
            o.position.z -= (oz / gap) * push;
          }
        }
      }
    }
    // And none leaves the river.
    for (const d of young) {
      const mid = nearest(d.position.x, d.position.z);
      if (mid.d > half) {
        d.position.x = mid.x + ((d.position.x - mid.x) * half) / mid.d;
        d.position.z = mid.z + ((d.position.z - mid.z) * half) / mid.d;
      }
    }
    // All of them bob on the water and nod as they paddle; the ducklings peck when still.
    ducks.forEach((d, k) => {
      d.position.y = 0.004 * Math.sin(t * 2.4 + k * 1.7);
      d.userData.head.rotation.x = d.userData.pecking
        ? 0.6 * Math.max(0, Math.sin(t * 2.2 + k * 2.3)) ** 6
        : 0.12 * Math.sin(t * (moving ? 5 : 1.3) + k);
    });
    // The rings spread from where each was, and fade.
    for (const r of ripples) {
      const u = r.userData;
      u.age += dt;
      if (u.age > RIPPLE_LIFE) {
        u.age -= RIPPLE_LIFE;
        r.position.set(u.duck.position.x, 0.006, u.duck.position.z);
      }
      const f = u.age / RIPPLE_LIFE;
      r.scale.setScalar(u.size * (0.07 + 0.2 * f));
      r.material.opacity = 0.32 * (1 - f) * Math.min(1, f * 6);
    }
  };
  return { group, update };
}
