// Small animals that make the farm feel lived in: hens in the coop yard, a duck family on the
// river, a water buffalo and her calf grazing by the bank, and birds circling over the hills.
import * as THREE from 'three';
import { Batch } from './batch.js';

const TAU = Math.PI * 2;
const BALL = new THREE.SphereGeometry(1, 12, 9);
const BOX = new THREE.BoxGeometry(1, 1, 1);
const CYL = new THREE.CylinderGeometry(1, 1, 1, 6);
const CONE = new THREE.ConeGeometry(1, 1, 5);

/** One mesh from many coloured parts: build(batch) adds them. */
function merged(build, castShadow = true) {
  const batch = new Batch();
  build(batch);
  return batch.build({ castShadow });
}

/** Body and head are separate so the head can peck; the head turns round the neck. */
function hen(color) {
  const g = new THREE.Group();
  g.add(merged((b) => {
    b.add(BALL, color, [0, 0.1, 0], [0.085, 0.075, 0.105]);
    b.add(CONE, color, [0, 0.15, -0.09], [0.045, 0.1, 0.03], [-0.7, 0, 0]);
    for (const x of [-0.03, 0.03]) b.add(CYL, '#f4a63a', [x, 0.025, 0.01], [0.008, 0.05, 0.008]);
  }));
  const head = merged((b) => {
    b.add(BALL, color, [0, 0.035, 0.02], 0.045);
    b.add(BOX, '#e84a3a', [0, 0.085, 0.02], [0.012, 0.035, 0.045]);
    b.add(CONE, '#ffb33a', [0, 0.03, 0.075], [0.015, 0.035, 0.015], [Math.PI / 2, 0, 0]);
    b.add(BALL, '#e84a3a', [0, 0.005, 0.055], [0.01, 0.018, 0.01]);
    for (const x of [-0.027, 0.027]) b.add(BALL, '#1d1d2a', [x, 0.05, 0.045], 0.008);
  });
  head.position.set(0, 0.15, 0.07);
  g.add(head);
  g.userData.head = head;
  return g;
}

function duck(color, beak) {
  return merged((b) => {
    b.add(BALL, color, [0, 0.03, 0], [0.065, 0.045, 0.095]);
    b.add(CONE, color, [0, 0.06, -0.085], [0.03, 0.06, 0.02], [-1.0, 0, 0]);
    b.add(BALL, color, [0, 0.1, 0.065], 0.042);
    b.add(BOX, beak, [0, 0.095, 0.11], [0.03, 0.012, 0.04]);
    for (const x of [-0.025, 0.025]) b.add(BALL, '#1d1d2a', [x, 0.115, 0.09], 0.007);
  });
}

/** A Vietnamese water buffalo with curved horns, or a cow. The head nods and the tail swishes. */
function bovine({ hide = '#5d6168', dark = '#464a50', muzzle = '#80848c', horns: hornSize = 0.13 } = {}) {
  const g = new THREE.Group();
  g.add(merged((b) => {
    b.add(BALL, hide, [0, 0.36, 0.02], [0.2, 0.17, 0.34]);
    b.add(BALL, hide, [0, 0.39, -0.17], [0.19, 0.16, 0.2]);
    for (const [x, z] of [[-0.11, 0.18], [0.11, 0.18], [-0.11, -0.22], [0.11, -0.22]]) b.add(CYL, dark, [x, 0.13, z], [0.045, 0.26, 0.045]);
  }));
  const tail = new THREE.Group();
  tail.position.set(0, 0.44, -0.36);
  tail.add(merged((b) => b.add(CYL, dark, [0, -0.12, 0], [0.012, 0.24, 0.012])));
  g.add(tail);
  const horns = new THREE.TorusGeometry(hornSize, 0.022, 6, 14, Math.PI * 0.85);
  const head = merged((b) => {
    b.add(BALL, hide, [0, -0.02, 0.1], [0.1, 0.1, 0.15]);
    b.add(BALL, muzzle, [0, -0.07, 0.22], [0.075, 0.06, 0.06]);
    for (const s of [-1, 1]) {
      b.add(BALL, hide, [s * 0.11, 0.02, 0.05], [0.05, 0.02, 0.03]);
      b.add(BALL, '#1d1d2a', [s * 0.065, 0.03, 0.17], 0.014);
    }
    b.add(horns, '#e2d8c4', [0, 0.06, 0.03], 1, [-0.9, 0, Math.PI * 0.075]);
  });
  head.position.set(0, 0.42, 0.3);
  g.add(head);
  g.userData.head = head;
  g.userData.tail = tail;
  return g;
}

function bird() {
  const g = new THREE.Group();
  g.add(merged((b) => b.add(BALL, '#3d3d4a', [0, 0, 0], [0.04, 0.035, 0.09]), false));
  const wing = new THREE.BufferGeometry();
  wing.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, -0.03, 0, 0, 0.045, 0.24, 0, -0.03], 3));
  wing.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ color: '#3d3d4a', side: THREE.DoubleSide, roughness: 0.8 });
  const wings = [1, -1].map((s) => {
    const w = new THREE.Mesh(wing, mat);
    w.scale.x = s;
    g.add(w);
    return w;
  });
  g.userData.wings = wings;
  return g;
}

/**
 * map: { layout, at(u, b, y), groundY(x, z), river, riverHalf, waterY, coopYard }
 * coopYard: { center, w, d, turn } of the chicken run in front of the coop.
 */
export function addAnimals({ layout, at, groundY, river, riverHalf, waterY, coopYard }) {
  const group = new THREE.Group();

  // Hens wander about the run, stopping to peck.
  const yardPoint = () => {
    const lx = (Math.random() - 0.5) * coopYard.w;
    const lz = (Math.random() - 0.5) * coopYard.d;
    const c = Math.cos(coopYard.turn);
    const s = Math.sin(coopYard.turn);
    return [coopYard.center.x + lx * c + lz * s, coopYard.center.z - lx * s + lz * c];
  };
  const hens = ['#fff8ef', '#fff8ef', '#c98a4b', '#e9b26a'].map((color) => {
    const h = hen(color);
    const [x, z] = yardPoint();
    h.position.set(x, 0, z);
    h.rotation.y = Math.random() * TAU;
    h.userData.target = yardPoint();
    h.userData.wait = Math.random() * 2;
    h.userData.phase = Math.random() * TAU;
    group.add(h);
    return h;
  });

  // A mother duck and her ducklings paddle up and down the river above the bridge.
  const bridgeAt = at(4.2, -5.0);
  const i0 = river.nearest(bridgeAt.x, bridgeAt.z).i;
  const swim = { from: Math.max(2, i0 - 42), to: Math.max(4, i0 - 9) };
  const ducks = [duck('#ffffff', '#ff9f2e'), duck('#ffe066', '#ff9f2e'), duck('#ffe066', '#ff9f2e'), duck('#ffe066', '#ff9f2e')];
  ducks.forEach((d, k) => {
    if (k) d.scale.setScalar(0.62);
    group.add(d);
  });
  const along = (t) => swim.from + (swim.to - swim.from) * (0.5 - 0.5 * Math.cos(t * 0.09));
  const riverPoint = (s, sway) => {
    const i = Math.min(river.pts.length - 2, Math.floor(s));
    const p = river.pts[i].clone().lerp(river.pts[i + 1], s - i);
    const { dir } = river.frame(i);
    return p.add(new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(sway * riverHalf(i) * 0.4));
  };

  // A water buffalo and her calf grazing by the river, and two cows in the meadow.
  const cow = { hide: '#d29a5c', dark: '#a8713f', muzzle: '#f1dcc0', horns: 0.07 };
  const [bu, bb, bturn] = layout.buffalo;
  const herd = [
    [{}, bu, bb, bturn, 1],
    [{}, bu - 0.75, bb + 0.45, bturn + 0.9, 0.6],
    ...layout.cows.map(([u, b, turn]) => [cow, u, b, turn, 0.92]),
  ].map(([look, u, b, turn, size], k) => {
    const h = bovine(look);
    const p = at(u, b);
    h.position.set(p.x, Math.max(0, groundY(p.x, p.z)), p.z);
    h.rotation.y = Math.PI / 4 + turn;
    h.scale.setScalar(size);
    h.userData.phase = k * 2.1;
    group.add(h);
    return h;
  });

  // Birds circling high over the hills behind the farm.
  const centre = at(0, 8.5, 3.8);
  const birds = [0, 1, 2].map((k) => {
    const b = bird();
    b.userData.phase = k * 0.5;
    b.userData.radius = 4.2 + k * 0.6;
    group.add(b);
    return b;
  });

  const update = (t, dt) => {
    for (const h of hens) {
      const head = h.userData.head;
      if (h.userData.wait > 0) {
        h.userData.wait -= dt;
        head.rotation.x = 0.95 * Math.max(0, Math.sin(t * 9 + h.userData.phase));
        h.position.y = 0;
        if (h.userData.wait <= 0) h.userData.target = yardPoint();
        continue;
      }
      const [tx, tz] = h.userData.target;
      const dx = tx - h.position.x;
      const dz = tz - h.position.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.03) {
        h.userData.wait = 0.8 + Math.random() * 2.6;
        continue;
      }
      const step = Math.min(d, dt * 0.22);
      h.position.x += (dx / d) * step;
      h.position.z += (dz / d) * step;
      h.position.y = Math.abs(Math.sin(t * 16 + h.userData.phase)) * 0.012;
      h.rotation.y = Math.atan2(dx, dz);
      head.rotation.x = 0.1;
    }

    ducks.forEach((d, k) => {
      const tt = t - k * 2.4;
      const p = riverPoint(along(tt), Math.sin(tt * 0.3) * 0.8);
      const q = riverPoint(along(tt + 0.2), Math.sin((tt + 0.2) * 0.3) * 0.8);
      d.position.set(p.x, waterY + 0.004 + Math.sin(t * 2.6 + k) * 0.006, p.z);
      if (q.distanceToSquared(p) > 1e-6) d.rotation.y = Math.atan2(q.x - p.x, q.z - p.z);
    });

    for (const h of herd) {
      const ph = h.userData.phase;
      h.userData.head.rotation.x = 0.35 + 0.38 * Math.sin(t * 0.55 + ph);
      h.userData.tail.rotation.z = 0.35 * Math.sin(t * 2.1 + ph);
    }

    for (const b of birds) {
      const a = t * 0.16 + b.userData.phase;
      const r = b.userData.radius;
      b.position.set(centre.x + Math.cos(a) * r, centre.y + Math.sin(t * 0.7 + b.userData.phase * 3) * 0.25, centre.z + Math.sin(a) * r);
      b.rotation.y = -a;
      const flap = Math.sin(t * 9 + b.userData.phase * 4) * 0.55;
      b.userData.wings[0].rotation.z = flap;
      b.userData.wings[1].rotation.z = -flap;
    }
  };
  return { group, update };
}
