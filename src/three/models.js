// Procedural 3D models for every crop and growth stage.
// Everything is built from spheres, cones, lathes and leaves so it stays light
// and every mutation can recolour the parts it needs.

import * as THREE from 'three';
import { plantMat } from './materials.js';
import { lookOf } from '../data/styles.js';
import { CROP_BY_ID } from '../data/crops.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { stripeTexture, pineappleTexture, kernelTexture, netTexture, speckleTexture } from './textures.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const FRONT = V(1, 0.7, 1).normalize(); // toward the camera
const FRONT_FLAT = V(1, 0, 1).normalize();
const RIGHT = V(1, 0, -1).normalize(); // screen right
const UPV = V(0, 1, 0);
const FY = Math.PI / 4; // yaw that faces the camera
const TAU = Math.PI * 2;

// ── Shared geometry ───────────────────────────────────────────

const geos = new Map();
function geo(key, make) {
  let g = geos.get(key);
  if (!g) geos.set(key, (g = make()));
  return g;
}
const SPHERE = () => geo('s', () => new THREE.SphereGeometry(1, 24, 16));
const SPHERE_LO = () => geo('sl', () => new THREE.SphereGeometry(1, 10, 7));
const HEMI = () => geo('hemi', () => new THREE.SphereGeometry(1, 24, 10, 0, TAU, 0, Math.PI / 2));
const CYL = (top = 1) => geo('c' + top, () => new THREE.CylinderGeometry(top, 1, 1, 12));
const CONE = () => geo('cone', () => new THREE.ConeGeometry(1, 1, 16));
const LEAF = () =>
  geo('leaf', () => {
    const g = new THREE.SphereGeometry(1, 12, 8);
    g.translate(0, 0, 1);
    return g;
  });
const CAPS = (r, len) => geo(`cap${r}_${len}`, () => new THREE.CapsuleGeometry(r, len, 6, 14));
const TORUS = (r, tube, arc) => geo(`t${r}_${tube}_${arc}`, () => new THREE.TorusGeometry(r, tube, 8, 28, arc));
const LATHE = (name, pts) => geo('l' + name, () => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), 24));
const BOX = () => geo('box', () => new THREE.BoxGeometry(1, 1, 1));

function mesh(geometry, material, p = [0, 0, 0], s = 1, r = null) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(p[0], p[1], p[2]);
  if (typeof s === 'number') m.scale.setScalar(s);
  else m.scale.set(s[0], s[1], s[2]);
  if (r) m.rotation.set(r[0], r[1], r[2], r[3] || 'XYZ');
  m.castShadow = true;
  return m;
}

/** A leaf whose base sits at p, pointing along yaw, raised by tilt (π/2 = straight up). */
function leaf(parent, mat, { p = [0, 0, 0], len = 0.3, w = 0.1, th = 0.025, yaw = 0, tilt = 0.6, roll = 0 } = {}) {
  const m = new THREE.Mesh(LEAF(), mat);
  m.position.set(p[0], p[1], p[2]);
  m.rotation.set(-tilt, yaw, roll, 'YXZ');
  m.scale.set(w, th, len / 2);
  m.castShadow = true;
  parent.add(m);
  return m;
}

function tuft(parent, mat, { n = 5, len = 0.3, w = 0.08, tilt = 0.8, y = 0, yaw0 = 0, r = 0, x = 0, z = 0, th = 0.025 } = {}) {
  for (let i = 0; i < n; i++) {
    const yaw = yaw0 + (i / n) * TAU;
    leaf(parent, mat, { p: [x + Math.sin(yaw) * r, y, z + Math.cos(yaw) * r], len, w, tilt, yaw, th });
  }
}

function group(parent, p = [0, 0, 0], s = 1, r = null) {
  const g = new THREE.Group();
  g.position.set(p[0], p[1], p[2]);
  g.scale.setScalar(s);
  if (r) g.rotation.set(r[0], r[1], r[2]);
  parent.add(g);
  return g;
}

const quatTo = (d) => new THREE.Quaternion().setFromUnitVectors(V(0, 0, 1), d);

/** Cute face on a roughly round body centred at `center`. */
function face(parent, look, center, radius, { blush = true, mouth = true, eyeScale = 1, up = 0 } = {}) {
  const eyeMat = plantMat('#2a1b2e', 'face', look, { roughness: 0.25 });
  const shineMat = plantMat('#ffffff', 'face', look, { roughness: 0.2, emissive: '#ffffff', emissiveIntensity: 0.4 });
  const blushMat = plantMat('#ff7f9e', 'face', look, { roughness: 0.6, opacity: 0.8 });
  const c = V(...center);
  const put = (right, upOff, depth = 1) =>
    FRONT.clone().addScaledVector(RIGHT, right).addScaledVector(UPV, upOff + up).normalize().multiplyScalar(radius * depth).add(c);
  for (const sgn of [-1, 1]) {
    const pe = put(sgn * 0.34, 0.1, 0.98);
    parent.add(mesh(SPHERE(), eyeMat, pe.toArray(), [radius * 0.12 * eyeScale, radius * 0.16 * eyeScale, radius * 0.12 * eyeScale]));
    const ps = put(sgn * 0.34 + 0.05, 0.17, 1.08);
    parent.add(mesh(SPHERE_LO(), shineMat, ps.toArray(), radius * 0.045 * eyeScale));
    if (blush) {
      const pb = put(sgn * 0.6, -0.1, 0.96);
      const b = mesh(SPHERE_LO(), blushMat, pb.toArray(), [radius * 0.13, radius * 0.08, radius * 0.035]);
      b.quaternion.copy(quatTo(pb.clone().sub(c).normalize()));
      b.castShadow = false;
      parent.add(b);
    }
  }
  if (mouth) {
    const pm = put(0, -0.14, 1.0);
    const m = mesh(TORUS(1, 0.25, Math.PI), eyeMat, pm.toArray(), radius * 0.1);
    m.quaternion.copy(quatTo(pm.clone().sub(c).normalize())).multiply(new THREE.Quaternion().setFromAxisAngle(V(0, 0, 1), Math.PI));
    parent.add(m);
  }
}

// ── Crop builders ─────────────────────────────────────────────
// Each builder adds meshes to g and returns the height of the plant's top.
// P(color, part, extra) returns a material styled for the current look.

const B = {};

B.radish = (g, P, crop) => {
  for (const [x, z, s] of [[-0.16, 0.1, 1], [0.17, -0.1, 0.82]]) {
    const r = group(g, [x, 0, z], s);
    r.add(mesh(SPHERE(), P(crop.color, 'produce'), [0, 0.18, 0], [0.2, 0.24, 0.2]));
    r.add(mesh(CONE(), P(crop.color, 'produce'), [0, 0.02, 0], [0.07, 0.2, 0.07], [Math.PI, 0, 0]));
    r.add(mesh(SPHERE(), P('#cfe8b0', 'accent'), [0, 0.37, 0], [0.11, 0.05, 0.11]));
    tuft(r, P(crop.leaf, 'leaf'), { n: 5, len: 0.34, w: 0.09, tilt: 1.05, y: 0.38 });
  }
  return 0.72;
};

B.carrot = (g, P, crop) => {
  for (const [x, z, s] of [[-0.14, 0.12, 1], [0.16, -0.08, 0.85]]) {
    const c = group(g, [x, 0, z], s);
    c.add(mesh(CONE(), P(crop.color, 'produce'), [0, 0.2, 0], [0.11, 0.44, 0.11], [Math.PI, 0, 0]));
    c.add(mesh(SPHERE(), P(crop.color, 'produce'), [0, 0.42, 0], [0.11, 0.05, 0.11]));
    for (let k = 0; k < 4; k++) c.add(mesh(TORUS(0.11, 0.008, TAU), P('#d9661a', 'accent'), [0, 0.12 + k * 0.07, 0], 1 - k * 0.2, [Math.PI / 2, 0, 0]));
    tuft(c, P(crop.leaf, 'leaf'), { n: 6, len: 0.36, w: 0.045, tilt: 1.2, y: 0.44 });
  }
  return 0.82;
};

B.tomato = (g, P, crop) => {
  const leafM = P(crop.leaf, 'leaf');
  g.add(mesh(CYL(0.6), P('#4f9a3a', 'stem'), [0, 0.3, 0], [0.025, 0.6, 0.025]));
  for (let i = 0; i < 7; i++) leaf(g, leafM, { p: [0, 0.12 + i * 0.07, 0], len: 0.26, w: 0.09, tilt: 0.35, yaw: i * 2.4 });
  const fruit = P(crop.color, 'produce');
  const calyx = P('#3f8a2e', 'accent');
  for (const [x, y, z, s] of [[0.14, 0.26, 0.1, 1], [-0.06, 0.42, 0.16, 0.85], [0.12, 0.5, -0.08, 0.75]]) {
    const t = group(g, [x, y, z], s);
    t.add(mesh(SPHERE(), fruit, [0, 0, 0], [0.13, 0.115, 0.13]));
    for (let k = 0; k < 5; k++) leaf(t, calyx, { p: [0, 0.1, 0], len: 0.08, w: 0.03, tilt: 0.1, yaw: (k / 5) * TAU });
  }
  return 0.7;
};

B.mushroom = (g, P, crop) => {
  const spot = P('#fff6e8', 'accent');
  for (const [x, z, s] of [[-0.08, 0.06, 1], [0.22, -0.16, 0.66], [-0.22, -0.2, 0.5]]) {
    const m = group(g, [x, 0, z], s);
    m.add(mesh(CYL(0.8), P(crop.leaf, 'accent'), [0, 0.13, 0], [0.08, 0.26, 0.08]));
    m.add(mesh(CYL(), P('#e9d6b4', 'accent'), [0, 0.26, 0], [0.2, 0.02, 0.2]));
    m.add(mesh(HEMI(), P(crop.color, 'produce'), [0, 0.26, 0], [0.25, 0.19, 0.25]));
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * TAU + 0.4;
      const el = k % 2 ? 0.5 : 0.95;
      const d = V(Math.cos(a) * Math.cos(el), Math.sin(el), Math.sin(a) * Math.cos(el));
      const p = V(d.x * 0.25, d.y * 0.19 + 0.26, d.z * 0.25);
      const sp = mesh(SPHERE_LO(), spot, p.toArray(), [0.04, 0.04, 0.012]);
      sp.quaternion.copy(quatTo(d));
      m.add(sp);
    }
  }
  return 0.5;
};

B.cucumber = (g, P, crop) => {
  const leafM = P(crop.leaf, 'leaf');
  for (let i = 0; i < 5; i++) leaf(g, leafM, { p: [0, 0.05, 0], len: 0.3, w: 0.17, tilt: 0.55, yaw: i * 1.3 + 0.6 });
  g.add(mesh(CYL(), P('#5aa646', 'stem'), [0, 0.2, 0], [0.02, 0.4, 0.02]));
  const flower = P('#ffd23f', 'accent');
  for (let k = 0; k < 5; k++) leaf(g, flower, { p: [-0.02, 0.4, 0.02], len: 0.06, w: 0.03, tilt: 0.8, yaw: (k / 5) * TAU });
  const fruit = P(crop.color, 'produce');
  const bump = P('#2f7a2a', 'accent');
  for (const [x, z, yaw] of [[0.12, 0.2, 0.3], [0.24, -0.04, 1.2]]) {
    const c = group(g, [x, 0.07, z], 1, [0, yaw, 0]);
    c.add(mesh(CAPS(0.06, 0.24), fruit, [0, 0, 0], 1, [0, 0, Math.PI / 2 - 0.15]));
    for (let k = 0; k < 4; k++) c.add(mesh(SPHERE_LO(), bump, [-0.1 + k * 0.07, 0.05, 0.03], 0.012));
  }
  return 0.5;
};

function flowerHead(parent, P, petalColor, centerColor, { petals = 14, r = 0.12, len = 0.1, w = 0.045, rings = 1 } = {}) {
  const head = new THREE.Group();
  head.quaternion.copy(quatTo(V(1, 0.45, 1).normalize()));
  parent.add(head);
  head.add(mesh(CYL(), P(centerColor, 'accent'), [0, 0, 0.01], [r * 0.95, 0.05, r * 0.95], [Math.PI / 2, 0, 0]));
  const petal = P(petalColor, 'produce');
  for (let ring = 0; ring < rings; ring++) {
    for (let i = 0; i < petals; i++) {
      const pv = new THREE.Group();
      pv.rotation.z = (i / petals) * TAU + ring * 0.2;
      head.add(pv);
      const m = mesh(LEAF(), petal, [0, r * (0.8 - ring * 0.15), -0.01 - ring * 0.012], [w, 0.02, (len * (1 - ring * 0.18)) / 2], [-Math.PI / 2 + 0.25 + ring * 0.25, 0, 0]);
      pv.add(m);
    }
  }
  return head;
}

B.sunflower = (g, P, crop) => {
  const stem = P('#4c9a3a', 'stem');
  const leafM = P(crop.leaf, 'leaf');
  for (const [x, z, h, s] of [[-0.1, -0.06, 0.82, 1], [0.18, 0.12, 0.6, 0.82]]) {
    const f = group(g, [x, 0, z], s);
    f.add(mesh(CYL(0.7), stem, [0, h / 2, 0], [0.03, h, 0.03]));
    leaf(f, leafM, { p: [0, h * 0.35, 0], len: 0.22, w: 0.12, tilt: 0.4, yaw: 0.5 });
    leaf(f, leafM, { p: [0, h * 0.55, 0], len: 0.2, w: 0.11, tilt: 0.4, yaw: 3.6 });
    const head = flowerHead(f, P, crop.color, '#6b3e1e', { petals: 14, r: 0.14, len: 0.14, w: 0.05 });
    head.position.set(0, h, 0);
  }
  return 0.98;
};

B.potato = (g, P, crop) => {
  const leafM = P(crop.leaf, 'leaf');
  g.add(mesh(SPHERE_LO(), leafM, [0, 0.3, -0.04], [0.2, 0.14, 0.2]));
  for (let i = 0; i < 9; i++) leaf(g, leafM, { p: [0, 0.18 + (i % 3) * 0.06, -0.04], len: 0.26, w: 0.1, tilt: 0.5 + (i % 3) * 0.2, yaw: i * 0.7 });
  const tuber = P(crop.color, 'produce');
  const eye = P('#b07a30', 'accent');
  for (const [x, z, s, a] of [[0.16, 0.18, 1, 0.3], [-0.12, 0.22, 0.85, 1.2], [0.27, -0.06, 0.75, 2]]) {
    const t = group(g, [x, 0.07, z], s, [0, a, 0.2]);
    t.add(mesh(SPHERE(), tuber, [0, 0, 0], [0.14, 0.1, 0.11]));
    t.add(mesh(SPHERE_LO(), eye, [0.06, 0.06, 0.06], 0.012));
    t.add(mesh(SPHERE_LO(), eye, [-0.05, 0.07, 0.04], 0.01));
  }
  return 0.5;
};

B.garlic = (g, P, crop) => {
  const bulb = P(crop.color, 'produce');
  const line = P('#e3c2d6', 'accent');
  for (const [x, z, s] of [[-0.12, 0.1, 1], [0.17, -0.1, 0.85]]) {
    const b = group(g, [x, 0, z], s);
    b.add(mesh(SPHERE(), bulb, [0, 0.15, 0], [0.17, 0.15, 0.17]));
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * TAU;
      b.add(mesh(SPHERE_LO(), line, [Math.cos(a) * 0.1, 0.16, Math.sin(a) * 0.1], [0.012, 0.12, 0.012], [Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5]));
    }
    b.add(mesh(CONE(), bulb, [0, 0.33, 0], [0.07, 0.14, 0.07]));
    tuft(b, P(crop.leaf, 'leaf'), { n: 4, len: 0.42, w: 0.035, tilt: 1.25, y: 0.38 });
  }
  return 0.8;
};

B.pepper = (g, P, crop) => {
  g.add(mesh(CYL(0.6), P('#4f9a3a', 'stem'), [0, 0.28, 0], [0.025, 0.56, 0.025]));
  for (let i = 0; i < 8; i++) leaf(g, P(crop.leaf, 'leaf'), { p: [0, 0.14 + i * 0.055, 0], len: 0.24, w: 0.1, tilt: 0.4, yaw: i * 2.3 });
  const fruit = P(crop.color, 'produce');
  for (const [x, y, z, s] of [[0.15, 0.16, 0.12, 1], [-0.08, 0.34, 0.17, 0.85]]) {
    const p = group(g, [x, y, z], s);
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * TAU;
      p.add(mesh(SPHERE(), fruit, [Math.cos(a) * 0.05, 0, Math.sin(a) * 0.05], [0.08, 0.13, 0.08]));
    }
    p.add(mesh(CYL(), P('#3f8a2e', 'accent'), [0, 0.14, 0], [0.02, 0.06, 0.02]));
    p.add(mesh(SPHERE_LO(), P('#3f8a2e', 'accent'), [0, 0.11, 0], [0.06, 0.02, 0.06]));
  }
  return 0.66;
};

B.banana = (g, P, crop) => {
  g.add(mesh(CYL(0.7), P('#8a9a4a', 'stem'), [0, 0.25, 0], [0.06, 0.5, 0.06]));
  const leafM = P(crop.leaf, 'leaf');
  for (let i = 0; i < 6; i++) leaf(g, leafM, { p: [0, 0.48, 0], len: 0.44, w: 0.13, tilt: 0.25 - (i % 2) * 0.35, yaw: i * 1.05 + 0.3 });
  const fruit = P(crop.color, 'produce');
  const tip = P('#6b4a2a', 'accent');
  const bunch = group(g, FRONT.clone().multiplyScalar(0.1).add(V(0, 0.32, 0)).toArray());
  bunch.add(mesh(CYL(), P('#7a8a3a', 'stem'), [0, 0.06, 0], [0.02, 0.14, 0.02]));
  for (let row = 0; row < 2; row++) {
    for (let k = 0; k < 4; k++) {
      const b = group(bunch, [0, -row * 0.08, 0], 1, [0, FY - 0.9 + k * 0.6, 0]);
      const arc = mesh(TORUS(0.15, 0.032, Math.PI * 0.5), fruit, [0, 0.02, 0.15], 1, [0, Math.PI / 2, Math.PI * 0.75]);
      b.add(arc);
      b.add(mesh(SPHERE_LO(), tip, [0, 0.13, 0.25], 0.025));
    }
  }
  return 0.75;
};

B.eggplant = (g, P, crop) => {
  g.add(mesh(CYL(0.6), P('#4c7a3a', 'stem'), [0, 0.28, 0], [0.025, 0.56, 0.025]));
  for (let i = 0; i < 7; i++) leaf(g, P(crop.leaf, 'leaf'), { p: [0, 0.18 + i * 0.06, 0], len: 0.26, w: 0.12, tilt: 0.3, yaw: i * 2.2 });
  const fruit = P(crop.color, 'produce', { roughness: 0.18 });
  const cap = P('#3f7a2e', 'accent');
  for (const [x, y, z, rz, s] of [[0.14, 0.2, 0.12, 0.35, 1], [-0.1, 0.3, 0.16, -0.3, 0.85]]) {
    const e = group(g, [x, y, z], s, [0, 0, rz]);
    e.add(mesh(CAPS(0.085, 0.14), fruit, [0, -0.08, 0], [1, 1, 1]));
    e.add(mesh(CONE(), cap, [0, 0.06, 0], [0.07, 0.07, 0.07], [Math.PI, 0, 0]));
    e.add(mesh(CYL(), cap, [0, 0.12, 0], [0.015, 0.06, 0.015]));
  }
  return 0.66;
};

B.ginger = (g, P, crop, look) => {
  const body = P(crop.color, 'produce');
  g.add(mesh(CAPS(0.14, 0.12), body, [0, 0.22, 0], 1));
  g.add(mesh(CAPS(0.07, 0.08), body, (RIGHT.clone().multiplyScalar(0.17).add(V(0, 0.16, 0))).toArray(), 1, [0, 0, -0.9]));
  g.add(mesh(CAPS(0.065, 0.06), body, (RIGHT.clone().multiplyScalar(-0.17).add(V(0, 0.2, 0))).toArray(), 1, [0, 0, 0.9]));
  g.add(mesh(SPHERE_LO(), body, [0.05, 0.42, -0.04], 0.06));
  face(g, look, [0, 0.24, 0], 0.14);
  tuft(g, P(crop.leaf, 'leaf'), { n: 3, len: 0.24, w: 0.04, tilt: 1.3, y: 0.42 });
  const scarfHot = P('#ff5a3c', 'deco', { roughness: 0.6 });
  const scarfCold = P('#5ab8ff', 'deco', { roughness: 0.6 });
  g.add(mesh(TORUS(0.14, 0.035, Math.PI), scarfHot, [0, 0.14, 0], 1, [Math.PI / 2, 0, 0]));
  g.add(mesh(TORUS(0.14, 0.035, Math.PI), scarfCold, [0, 0.14, 0], 1, [Math.PI / 2, 0, Math.PI]));
  return 0.62;
};

B.pumpkin = (g, P, crop) => {
  const leafM = P(crop.leaf, 'leaf');
  for (let i = 0; i < 4; i++) leaf(g, leafM, { p: [0, 0.02, 0], len: 0.36, w: 0.2, tilt: 0.15, yaw: i * 1.6 + 2.6 });
  const skin = P(crop.color, 'produce');
  const p = group(g, [0.04, 0.2, 0.04]);
  for (let k = 0; k < 9; k++) {
    const a = (k / 9) * TAU;
    p.add(mesh(SPHERE(), skin, [Math.cos(a) * 0.13, 0, Math.sin(a) * 0.13], [0.15, 0.19, 0.15]));
  }
  p.add(mesh(CYL(0.7), P('#6b4a2a', 'accent'), [0, 0.2, 0], [0.04, 0.12, 0.04], [0.2, 0, 0.25]));
  p.add(mesh(TORUS(0.05, 0.008, Math.PI * 1.5), P(crop.leaf, 'leaf'), [0.06, 0.2, 0], 1, [0, 0.6, 0]));
  return 0.62;
};

B.grape = (g, P, crop) => {
  const wood = P('#9a6a3e', 'stem');
  const a = RIGHT.clone().multiplyScalar(0.36);
  for (const s of [-1, 1]) g.add(mesh(CYL(), wood, a.clone().multiplyScalar(s).add(V(0, 0.38, 0)).add(FRONT.clone().multiplyScalar(-0.12)).toArray(), [0.03, 0.76, 0.03]));
  const bar = mesh(CYL(), wood, FRONT.clone().multiplyScalar(-0.12).add(V(0, 0.72, 0)).toArray(), [0.025, 0.8, 0.025]);
  bar.quaternion.setFromUnitVectors(UPV, RIGHT);
  g.add(bar);
  const leafM = P(crop.leaf, 'leaf');
  for (let i = 0; i < 6; i++) {
    const p = RIGHT.clone().multiplyScalar(-0.32 + i * 0.13).add(V(0, 0.72, 0)).add(FRONT.clone().multiplyScalar(-0.1));
    leaf(g, leafM, { p: p.toArray(), len: 0.2, w: 0.15, tilt: i % 2 ? -0.6 : 0.5, yaw: FY + (i % 2 ? 0 : Math.PI) });
  }
  const berry = P(crop.color, 'produce', { roughness: 0.25 });
  const rows = [[5, 0.09], [4, 0.075], [3, 0.055], [2, 0.035], [1, 0]];
  for (const [side, s] of [[-0.17, 1], [0.17, 0.85]]) {
    const cl = group(g, RIGHT.clone().multiplyScalar(side).add(V(0, 0.64, 0)).add(FRONT.clone().multiplyScalar(0.02)).toArray(), s);
    cl.add(mesh(CYL(), P('#7a6a3a', 'stem'), [0, 0.04, 0], [0.012, 0.1, 0.012]));
    rows.forEach(([n, r], ri) => {
      for (let k = 0; k < n; k++) {
        const ang = (k / n) * TAU + ri;
        cl.add(mesh(SPHERE(), berry, [Math.cos(ang) * r, -ri * 0.065, Math.sin(ang) * r], 0.05));
      }
    });
  }
  return 0.86;
};

B.corn = (g, P, crop) => {
  const stalkM = P('#6fb04a', 'stem');
  const leafM = P(crop.leaf, 'leaf');
  const cob = P('#ffffff', 'produce', { map: kernelTexture() });
  const husk = P('#9fd36a', 'accent');
  for (const [x, z, h, s] of [[-0.12, -0.08, 0.95, 1], [0.16, 0.1, 0.78, 0.9]]) {
    const st = group(g, [x, 0, z], s);
    st.add(mesh(CYL(0.6), stalkM, [0, h / 2, 0], [0.035, h, 0.035]));
    for (let i = 0; i < 6; i++) leaf(st, leafM, { p: [0, 0.12 + i * 0.13, 0], len: 0.38, w: 0.05, tilt: 0.35, yaw: i * 2.6 });
    const c = group(st, FRONT.clone().multiplyScalar(0.07).add(V(0, h * 0.55, 0)).toArray(), 1, [0.35, FY, 0]);
    c.add(mesh(CAPS(0.08, 0.2), cob, [0, 0.08, 0], 1));
    for (let k = 0; k < 3; k++) leaf(c, husk, { p: [0, -0.08, 0], len: 0.24, w: 0.055, tilt: 1.35, yaw: (k / 3) * TAU });
    tuft(c, P('#c98a3a', 'accent'), { n: 4, len: 0.08, w: 0.008, tilt: 1.2, y: 0.24 });
  }
  return 1.0;
};

B.lettuce = (g, P, crop) => {
  const outer = P(crop.leaf, 'produce');
  const mid = P(crop.color, 'produce');
  const heart = P('#d8f2a0', 'produce');
  for (let i = 0; i < 8; i++) leaf(g, outer, { p: [0, 0.03, 0], len: 0.3, w: 0.18, tilt: 0.45, yaw: i * 0.8, th: 0.05 });
  for (let i = 0; i < 7; i++) leaf(g, mid, { p: [0, 0.05, 0], len: 0.24, w: 0.16, tilt: 0.95, yaw: i * 0.9 + 0.3, th: 0.05 });
  g.add(mesh(SPHERE(), heart, [0, 0.16, 0], [0.13, 0.14, 0.13]));
  return 0.4;
};

B.onion = (g, P, crop) => {
  const pts = [[0, 0], [0.1, 0.02], [0.16, 0.1], [0.15, 0.18], [0.08, 0.26], [0.025, 0.32], [0, 0.33]];
  const bulb = P(crop.color, 'produce', { roughness: 0.25 });
  for (const [x, z, s] of [[-0.12, 0.1, 1], [0.17, -0.1, 0.85]]) {
    const o = group(g, [x, 0, z], s);
    o.add(mesh(LATHE('onion', pts), bulb, [0, 0, 0], 1));
    for (let k = 0; k < 3; k++) o.add(mesh(CYL(0.5), P(crop.leaf, 'leaf'), [Math.sin(k * 2) * 0.03, 0.5, Math.cos(k * 2) * 0.03], [0.018, 0.36, 0.018], [Math.sin(k * 2) * 0.2, 0, Math.cos(k * 2) * 0.2]));
  }
  return 0.72;
};

B.blueberry = (g, P, crop, look) => {
  const leafM = P(crop.leaf, 'leaf');
  for (let i = 0; i < 6; i++) leaf(g, leafM, { p: [0, 0.04, 0], len: 0.24, w: 0.1, tilt: 0.4, yaw: i * 1.05 });
  const skin = P(crop.color, 'produce', { roughness: 0.3 });
  const c = [0, 0.28, 0];
  g.add(mesh(SPHERE(), skin, c, 0.23));
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * TAU;
    g.add(mesh(CONE(), P('#2a2f7a', 'accent'), [Math.cos(a) * 0.06, 0.52, Math.sin(a) * 0.06], [0.035, 0.08, 0.035], [Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5]));
  }
  face(g, look, c, 0.23);
  for (const [x, z] of [[0.24, 0.12], [0.18, 0.24], [-0.22, 0.14]]) g.add(mesh(SPHERE(), skin, [x, 0.07, z], 0.06));
  const sword = group(g, RIGHT.clone().multiplyScalar(-0.3).add(V(0, 0.05, 0)).toArray(), 1, [0, FY, -0.25]);
  sword.add(mesh(BOX(), P('#dfe6ee', 'deco', { metalness: 0.9, roughness: 0.2 }), [0, 0.2, 0], [0.04, 0.32, 0.012]));
  sword.add(mesh(BOX(), P('#ffcc33', 'deco', { metalness: 0.8, roughness: 0.3 }), [0, 0.37, 0], [0.14, 0.025, 0.03]));
  sword.add(mesh(CYL(), P('#7a4a2a', 'deco'), [0, 0.43, 0], [0.018, 0.1, 0.018]));
  return 0.62;
};

B.strawberry = (g, P, crop) => {
  const leafM = P(crop.leaf, 'leaf');
  for (let i = 0; i < 7; i++) leaf(g, leafM, { p: [0, 0.06, 0], len: 0.26, w: 0.12, tilt: 0.6, yaw: i * 0.9 });
  const pts = [[0, 0], [0.045, 0.02], [0.095, 0.08], [0.12, 0.15], [0.11, 0.2], [0.06, 0.235], [0, 0.24]];
  const berry = P(crop.color, 'produce', { roughness: 0.3 });
  const seed = P('#ffe680', 'accent');
  const calyx = P('#3f9e3a', 'accent');
  for (const [x, z, s, tilt] of [[0.14, 0.16, 1, 0.3], [-0.12, 0.2, 0.85, -0.3], [0.24, -0.06, 0.8, 0.5]]) {
    const b = group(g, [x, 0.04, z], s, [tilt * 0.4, 0, tilt]);
    b.add(mesh(LATHE('berry', pts), berry, [0, 0, 0], 1));
    for (let k = 0; k < 9; k++) {
      const a = (k / 9) * TAU + (k % 2) * 0.3;
      const y = 0.06 + (k % 3) * 0.05;
      const r = y < 0.1 ? 0.08 : 0.11;
      b.add(mesh(SPHERE_LO(), seed, [Math.cos(a) * r, y, Math.sin(a) * r], [0.01, 0.014, 0.01]));
    }
    for (let k = 0; k < 6; k++) leaf(b, calyx, { p: [0, 0.23, 0], len: 0.08, w: 0.035, tilt: 0.15, yaw: (k / 6) * TAU });
  }
  return 0.5;
};

B.broccoli = (g, P, crop, look) => {
  g.add(mesh(CYL(0.75), P('#a9dc7a', 'accent'), [0, 0.12, 0], [0.1, 0.24, 0.1]));
  const floret = P(crop.color, 'produce', { roughness: 0.8 });
  const c = [0, 0.34, 0];
  g.add(mesh(SPHERE(), floret, c, 0.19));
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * TAU;
    g.add(mesh(SPHERE(), floret, [Math.cos(a) * 0.15, 0.36 + (k % 2) * 0.05, Math.sin(a) * 0.15], 0.1));
  }
  face(g, look, c, 0.21, { up: -0.15 });
  const bow = group(g, [-0.05, 0.56, -0.05], 1, [0, FY, 0.2]);
  const pink = P('#ff6fa8', 'deco', { roughness: 0.45 });
  for (const s of [-1, 1]) bow.add(mesh(CONE(), pink, [s * 0.07, 0, 0], [0.06, 0.12, 0.03], [0, 0, (s * Math.PI) / 2]));
  bow.add(mesh(SPHERE_LO(), pink, [0, 0, 0], 0.035));
  leaf(g, P('#4c9a3a', 'leaf'), { p: [0, 0.1, 0], len: 0.2, w: 0.08, tilt: 0.5, yaw: 3.5 });
  leaf(g, P('#4c9a3a', 'leaf'), { p: [0, 0.1, 0], len: 0.2, w: 0.08, tilt: 0.5, yaw: 5.5 });
  return 0.64;
};

B.watermelon = (g, P, crop) => {
  const leafM = P(crop.leaf, 'leaf');
  for (let i = 0; i < 5; i++) leaf(g, leafM, { p: [0, 0.02, 0], len: 0.32, w: 0.18, tilt: 0.12, yaw: i * 1.25 + 2.2 });
  const rind = P('#ffffff', 'produce', { map: stripeTexture(), roughness: 0.35 });
  g.add(mesh(SPHERE(), rind, [0.06, 0.2, 0.06], [0.27, 0.22, 0.24], [0, FY + Math.PI / 2, 0]));
  g.add(mesh(SPHERE(), rind, [-0.24, 0.11, -0.12], [0.14, 0.12, 0.13], [0, 0.4, 0]));
  g.add(mesh(TORUS(0.05, 0.01, Math.PI * 1.6), P(crop.leaf, 'leaf'), [0.1, 0.45, 0.06], 1, [0.3, 0.5, 0]));
  return 0.48;
};

B.pineapple = (g, P, crop, look) => {
  for (let i = 0; i < 8; i++) leaf(g, P('#3f9e3a', 'leaf'), { p: [0, 0.03, 0], len: 0.32, w: 0.05, tilt: 0.35, yaw: i * 0.8 });
  const c = [0, 0.27, 0];
  g.add(mesh(SPHERE(), P('#ffffff', 'produce', { map: pineappleTexture() }), c, [0.19, 0.25, 0.19]));
  const crownM = P(crop.leaf, 'accent');
  tuft(g, crownM, { n: 7, len: 0.24, w: 0.045, tilt: 1.1, y: 0.48 });
  tuft(g, crownM, { n: 5, len: 0.3, w: 0.04, tilt: 1.4, y: 0.48, yaw0: 0.5 });
  face(g, look, c, 0.2);
  return 0.82;
};

const PEAR_PTS = [[0, 0], [0.08, 0.02], [0.11, 0.08], [0.1, 0.14], [0.06, 0.19], [0.045, 0.25], [0.03, 0.29], [0, 0.3]];

B.pear = (g, P, crop) => {
  g.add(mesh(CYL(0.7), P('#8a5a3a', 'stem'), [0, 0.22, 0], [0.045, 0.44, 0.045]));
  const canopy = P(crop.leaf, 'leaf', { roughness: 0.8 });
  for (const [x, y, z, s] of [[0, 0.6, 0, 0.24], [-0.16, 0.52, 0.04, 0.17], [0.12, 0.54, -0.14, 0.18], [0.04, 0.72, -0.06, 0.15]]) {
    g.add(mesh(SPHERE_LO(), canopy, [x, y, z], s));
  }
  const fruit = P(crop.color, 'produce', { roughness: 0.35 });
  for (const [x, z, s] of [[0.16, 0.18, 1], [-0.12, 0.22, 0.85]]) {
    const pr = group(g, [x, 0.12, z], s, [0, 0, 0.15]);
    pr.add(mesh(LATHE('pear', PEAR_PTS), fruit, [0, 0, 0], 1));
    pr.add(mesh(CYL(), P('#6b4a2a', 'accent'), [0, 0.33, 0], [0.012, 0.07, 0.012]));
    leaf(pr, P(crop.leaf, 'leaf'), { p: [0, 0.32, 0], len: 0.08, w: 0.04, tilt: 0.4, yaw: 1 });
  }
  return 0.86;
};


// Small repeatable random numbers so every tree of a kind looks the same.
function rand(seed) {
  let a = 0;
  for (let i = 0; i < seed.length; i++) a = (Math.imul(a, 31) + seed.charCodeAt(i)) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CANOPY = [[0, 0.62, 0, 0.27], [-0.17, 0.54, 0.05, 0.19], [0.14, 0.55, -0.15, 0.2], [0.05, 0.77, -0.05, 0.17]];

/** A small round fruit tree. fruit(group, position, outward, index) adds one fruit. */
function fruitTree(g, P, crop, { canopy = CANOPY, trunk = 0.42, girth = 0.05, fruits = 7, hang = false, fruit }) {
  g.add(mesh(CYL(0.65), P('#9a6236', 'stem'), [0, trunk / 2, 0], [girth, trunk, girth]));
  const leafM = P(crop.leaf, 'leaf', { roughness: 0.7 });
  let top = 0;
  for (const [x, y, z, r] of canopy) {
    g.add(mesh(SPHERE_LO(), leafM, [x, y, z], r));
    top = Math.max(top, y + r);
  }
  const rnd = rand(crop.id);
  for (let k = 0; k < fruits; k++) {
    const [bx, by, bz, br] = canopy[k % canopy.length];
    let d;
    if (hang) {
      // Hanging fruit sits on the lower, camera-facing side of the leaves.
      d = V(rnd() * 2 - 1, 0, rnd() * 2 - 1).add(FRONT_FLAT.clone().multiplyScalar(1.6)).normalize();
      d.y = -0.45 - rnd() * 0.35;
      d.normalize();
    } else {
      d = V(rnd() * 2 - 1, rnd() * 1.3 - 0.4, rnd() * 2 - 1).normalize().add(FRONT.clone().multiplyScalar(1.15)).normalize();
    }
    fruit(g, V(bx, by, bz).addScaledVector(d, br * 0.9), d, k);
  }
  return top;
}

B.rice = (g, P, crop) => {
  tuft(g, P(crop.leaf, 'leaf'), { n: 9, len: 0.42, w: 0.035, tilt: 1.05 });
  const stalk = P('#9ad43a', 'stem');
  const grain = P(crop.color, 'produce');
  const spots = [[0, 0], [0.12, 0.06], [-0.1, 0.1], [0.06, -0.12], [-0.08, -0.1], [0.15, -0.06], [-0.15, 0]];
  spots.forEach(([x, z], i) => {
    const h = 0.5 + ((i * 37) % 10) / 60;
    const s = group(g, [x, 0, z], 1, [0, i * 2.1 + 0.4, 0]);
    s.add(mesh(CYL(), stalk, [0, h / 2, 0], [0.01, h, 0.01]));
    // the ear of rice droops over as it gets heavy
    for (let k = 0; k < 8; k++) {
      const t = k / 7;
      const y = h + 0.05 * Math.sin(t * Math.PI) - 0.16 * t * t;
      s.add(mesh(SPHERE_LO(), grain, [k % 2 ? 0.016 : -0.016, y, 0.18 * t], [0.024, 0.033, 0.024]));
    }
  });
  return 0.7;
};

B.waterSpinach = (g, P, crop) => {
  const stemM = P(crop.leaf, 'accent');
  const leafM = P(crop.color, 'produce');
  for (let i = 0; i < 9; i++) {
    const yaw = i * 2.4;
    const h = 0.4 + (i % 4) * 0.06;
    const s = group(g, [Math.sin(yaw) * 0.04, 0, Math.cos(yaw) * 0.04], 1, [0, yaw, 0]);
    const lean = group(s, [0, 0, 0], 1, [0.22 + (i % 3) * 0.12, 0, 0]);
    lean.add(mesh(CYL(), stemM, [0, h / 2, 0], [0.014, h, 0.014]));
    leaf(lean, leafM, { p: [0, h * 0.55, 0], len: 0.17, w: 0.05, tilt: 0.7, yaw: 0.9 });
    leaf(lean, leafM, { p: [0, h * 0.8, 0], len: 0.16, w: 0.045, tilt: 0.8, yaw: -0.9 });
    leaf(lean, leafM, { p: [0, h, 0], len: 0.14, w: 0.04, tilt: 1.2, yaw: 0 });
  }
  return 0.6;
};

B.cabbage = (g, P, crop) => {
  const outer = P(crop.leaf, 'leaf');
  for (let i = 0; i < 7; i++) leaf(g, outer, { p: [0, 0.04, 0], len: 0.3, w: 0.2, tilt: 0.3, yaw: i * 0.9, th: 0.045 });
  g.add(mesh(SPHERE(), P(crop.color, 'produce', { roughness: 0.45 }), [0, 0.21, 0], [0.19, 0.18, 0.19]));
  const wrap = P('#8fe04a', 'produce', { roughness: 0.5 });
  for (let i = 0; i < 6; i++) {
    const yaw = i * (TAU / 6) + 0.2;
    leaf(g, wrap, { p: [Math.sin(yaw) * 0.15, 0.05, Math.cos(yaw) * 0.15], len: 0.26, w: 0.17, tilt: 1.22, yaw, th: 0.03 });
  }
  return 0.42;
};

B.sweetPotato = (g, P, crop) => {
  const leafM = P(crop.leaf, 'leaf');
  for (let i = 0; i < 10; i++) {
    const yaw = i * 0.7 + 2.4;
    const r = 0.04 + (i % 3) * 0.08;
    leaf(g, leafM, { p: [Math.sin(yaw) * r, 0.08 + (i % 3) * 0.05, Math.cos(yaw) * r], len: 0.16, w: 0.13, tilt: 0.5, yaw });
  }
  const skin = P(crop.color, 'produce', { roughness: 0.45 });
  for (const [x, z, sc, a] of [[0.17, 0.16, 1, 0.5], [-0.1, 0.25, 0.85, 1.4], [0.27, -0.05, 0.75, 2.2]]) {
    const tuber = group(g, [x, 0.07, z], sc * 1.3, [0, a, Math.PI / 2 - 0.15]);
    tuber.add(mesh(CAPS(0.058, 0.14), skin, [0, 0, 0], 1));
    tuber.add(mesh(CONE(), skin, [0, 0.14, 0], [0.04, 0.08, 0.04]));
  }
  return 0.42;
};

B.greenBean = (g, P, crop) => {
  const pole = P('#e8b85a', 'stem', { roughness: 0.6 });
  const leafM = P(crop.leaf, 'leaf');
  const pod = P(crop.color, 'produce', { roughness: 0.35 });
  for (const [x, z] of [[-0.12, -0.1], [0.12, 0.1]]) {
    g.add(mesh(CYL(), pole, [x, 0.42, z], [0.018, 0.84, 0.018]));
    for (let k = 0; k < 5; k++) {
      const y = 0.15 + k * 0.14;
      for (const off of [-1, 0, 1]) leaf(g, leafM, { p: [x, y, z], len: 0.12, w: 0.07, tilt: 0.3 + off * 0.2, yaw: k * 1.9 + off * 0.8 });
    }
    for (let k = 0; k < 4; k++) {
      const at = V(x, 0.62 - k * 0.12, z).addScaledVector(FRONT, 0.06).addScaledVector(RIGHT, (k % 2 ? 1 : -1) * 0.035);
      const b = group(g, at.toArray(), 1, [0, FY, (k % 2 ? 1 : -1) * 0.12]);
      b.add(mesh(CAPS(0.024, 0.22), pod, [0, -0.12, 0], 1));
    }
  }
  return 0.86;
};

B.papaya = (g, P, crop) => {
  const trunk = P('#b5b87a', 'stem', { roughness: 0.8 });
  g.add(mesh(CYL(0.75), trunk, [0, 0.33, 0], [0.045, 0.66, 0.045]));
  for (let k = 0; k < 4; k++) g.add(mesh(TORUS(0.046, 0.007, TAU), P('#8f9660', 'stem'), [0, 0.1 + k * 0.12, 0], 1 - k * 0.06, [Math.PI / 2, 0, 0]));
  const leafM = P(crop.leaf, 'leaf');
  const stalk = P('#9ad45a', 'stem');
  for (let i = 0; i < 7; i++) {
    const st = group(g, [0, 0.66, 0], 1, [0, i * (TAU / 7), 0]);
    st.add(mesh(CYL(), stalk, [0, 0.02, 0.12], [0.01, 0.26, 0.01], [1.25, 0, 0]));
    for (const yaw of [-0.55, 0, 0.55]) leaf(st, leafM, { p: [0, 0.07, 0.24], len: 0.18, w: 0.08, tilt: -0.15, yaw });
  }
  const fruit = P(crop.color, 'produce', { roughness: 0.35 });
  const flat = FRONT.clone().setY(0).normalize();
  for (const [a, y] of [[0, 0.57], [0.9, 0.53], [-0.9, 0.54], [0.45, 0.44], [-0.45, 0.45]]) {
    const d = flat.clone().applyAxisAngle(UPV, a);
    g.add(mesh(SPHERE(), fruit, d.multiplyScalar(0.095).add(V(0, y, 0)).toArray(), [0.065, 0.095, 0.065]));
  }
  return 0.86;
};

B.beet = (g, P, crop, look) => {
  const body = P(crop.color, 'produce', { roughness: 0.35 });
  g.add(mesh(SPHERE(), body, [0, 0.25, 0], 0.24));
  g.add(mesh(CONE(), body, [0, 0.02, 0], [0.07, 0.16, 0.07], [Math.PI, 0, 0]));
  face(g, look, [0, 0.25, 0], 0.24);
  const stemM = P('#ff3d7f', 'accent');
  for (let k = 0; k < 5; k++) {
    const st = group(g, [0, 0.46, 0], 1, [0, (k / 5) * TAU + 0.3, 0]);
    st.add(mesh(CYL(), stemM, [0, 0.07, 0.03], [0.012, 0.15, 0.012], [0.4, 0, 0]));
    leaf(st, P(crop.leaf, 'leaf'), { p: [0, 0.13, 0.06], len: 0.2, w: 0.09, tilt: 0.9 });
  }
  for (const s of [-1, 1]) leaf(g, P(crop.leaf, 'leaf'), { p: RIGHT.clone().multiplyScalar(s * 0.21).add(V(0, 0.22, 0)).toArray(), len: 0.14, w: 0.05, tilt: 0.6, yaw: FY + (s * Math.PI) / 2 });
  return 0.82;
};

B.orange = (g, P, crop) => fruitTree(g, P, crop, {
  fruits: 8,
  fruit: (t, p) => {
    t.add(mesh(SPHERE(), P(crop.color, 'produce', { roughness: 0.5 }), p.toArray(), 0.07));
    t.add(mesh(SPHERE_LO(), P('#3f8a2e', 'accent'), p.clone().add(V(0, 0.066, 0)).toArray(), 0.014));
  },
});

B.apple = (g, P, crop) => fruitTree(g, P, crop, {
  fruits: 7,
  fruit: (t, p, d, k) => {
    const a = group(t, p.toArray());
    a.add(mesh(SPHERE(), P(crop.color, 'produce', { roughness: 0.28 }), [0, 0, 0], [0.075, 0.068, 0.075]));
    a.add(mesh(CYL(), P('#6b4a2a', 'accent'), [0, 0.07, 0], [0.008, 0.04, 0.008]));
    if (k % 2 === 0) leaf(a, P(crop.leaf, 'leaf'), { p: [0, 0.08, 0], len: 0.06, w: 0.03, tilt: 0.3, yaw: 0.8 });
  },
});

B.mango = (g, P, crop) => fruitTree(g, P, crop, {
  canopy: [[0, 0.64, 0, 0.3], [-0.2, 0.56, 0.06, 0.2], [0.16, 0.57, -0.17, 0.21], [0.06, 0.8, -0.04, 0.18]],
  fruits: 6,
  hang: true,
  fruit: (t, p, d, k) => {
    const m = group(t, p.toArray(), 1, [0, k * 1.3, 0.25]);
    m.add(mesh(CYL(), P('#5a7a2a', 'stem'), [0, 0.02, 0], [0.006, 0.06, 0.006]));
    m.add(mesh(SPHERE(), P(crop.color, 'produce', { roughness: 0.3 }), [0, -0.09, 0], [0.065, 0.1, 0.056]));
    m.add(mesh(SPHERE_LO(), P('#ff5a1f', 'accent', { roughness: 0.35 }), [0.024, -0.065, 0.024], [0.046, 0.06, 0.04]));
  },
});

B.avocado = (g, P, crop) => {
  const top = fruitTree(g, P, crop, {
    canopy: [[0, 0.66, 0, 0.28], [-0.18, 0.56, 0.05, 0.2], [0.15, 0.58, -0.16, 0.2], [0.04, 0.82, -0.04, 0.17]],
    fruits: 5,
    hang: true,
    fruit: (t, p, d, k) => {
      const a = group(t, p.toArray(), 1, [0, k, 0.15]);
      a.add(mesh(CYL(), P('#5a7a2a', 'stem'), [0, 0.02, 0], [0.006, 0.06, 0.006]));
      a.add(mesh(LATHE('avocado', [[0, 0], [0.05, 0.01], [0.065, 0.05], [0.058, 0.09], [0.035, 0.13], [0.02, 0.15], [0, 0.155]]),
        P('#2f6a0a', 'produce', { roughness: 0.55 }), [0, -0.19, 0], 1.2));
    },
  });
  // A cut half on the ground shows the creamy inside and the big seed.
  const half = group(g, FRONT_FLAT.clone().multiplyScalar(0.3).add(V(0, 0.05, 0)).toArray(), 1.6);
  half.quaternion.copy(quatTo(V(0.35, 1, 0.35).normalize()));
  half.add(mesh(CYL(), P('#2f5a10', 'accent'), [0, 0, 0], [0.085, 0.03, 0.12]));
  half.add(mesh(CYL(), P('#d6f06a', 'produce', { roughness: 0.5 }), [0, 0.012, 0], [0.072, 0.03, 0.105]));
  half.add(mesh(SPHERE(), P('#8a5326', 'deco', { roughness: 0.4 }), [0, 0.03, 0.02], 0.04));
  return top;
};

B.lychee = (g, P, crop) => fruitTree(g, P, crop, {
  canopy: [[0, 0.62, 0, 0.28], [-0.18, 0.55, 0.05, 0.2], [0.15, 0.56, -0.15, 0.2], [0.04, 0.78, -0.05, 0.17]],
  fruits: 5,
  hang: true,
  fruit: (t, p) => {
    const c = group(t, p.toArray());
    const skin = P(crop.color, 'produce', { roughness: 0.6, flatShading: true });
    for (const [x, y, z] of [[0, -0.02, 0], [0.045, -0.05, 0.02], [-0.035, -0.06, 0.03], [0.01, -0.095, 0.045], [0.05, -0.1, -0.02]]) {
      c.add(mesh(geo('bumpy', () => new THREE.IcosahedronGeometry(1, 1)), skin, [x, y, z], 0.034));
    }
  },
});

B.dragonFruit = (g, P, crop) => {
  g.add(mesh(BOX(), P('#d8cfc0', 'stem', { roughness: 0.9 }), [0, 0.3, 0], [0.07, 0.6, 0.07]));
  const armM = P(crop.leaf, 'leaf', { roughness: 0.55 });
  const tri = geo('tri', () => new THREE.CylinderGeometry(1, 1, 1, 3));
  const fruitArms = [0, 1, 5];
  for (let i = 0; i < 6; i++) {
    const yaw = i * (TAU / 6) + 0.3;
    const arm = group(g, [0, 0.6, 0], 1, [0, yaw, 0]);
    arm.add(mesh(tri, armM, [0, -0.08, 0.12], [0.035, 0.3, 0.035], [Math.PI / 2 + 0.6, 0, 0]));
    arm.add(mesh(tri, armM, [0, 0.06, 0.04], [0.03, 0.16, 0.03], [0.5, 0, 0]));
    if (!fruitArms.includes(i)) continue;
    const f = group(arm, [0, -0.25, 0.27]);
    f.add(mesh(SPHERE(), P(crop.color, 'produce', { roughness: 0.3 }), [0, 0, 0], [0.095, 0.12, 0.095]));
    const scale = P('#a6ef3a', 'accent');
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * TAU;
      const y = k % 2 ? 0.03 : -0.03;
      leaf(f, scale, { p: [Math.cos(a) * 0.085, y * 1.4, Math.sin(a) * 0.085], len: 0.075, w: 0.03, tilt: 0.9, yaw: Math.PI / 2 - a });
    }
  }
  return 0.82;
};

B.mangosteen = (g, P, crop, look) => {
  for (let i = 0; i < 5; i++) leaf(g, P(crop.leaf, 'leaf'), { p: [0, 0.03, 0], len: 0.24, w: 0.11, tilt: 0.35, yaw: i * 1.25 });
  const c = [0, 0.26, 0];
  g.add(mesh(SPHERE(), P(crop.color, 'produce', { roughness: 0.3 }), c, [0.23, 0.21, 0.23]));
  const cal = P('#52c23a', 'accent', { roughness: 0.5 });
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * TAU + 0.4;
    g.add(mesh(SPHERE(), cal, [Math.cos(a) * 0.07, 0.45, Math.sin(a) * 0.07], [0.08, 0.03, 0.05], [0, -a, 0]));
  }
  g.add(mesh(CYL(0.7), P('#6b4a2a', 'accent'), [0, 0.5, 0], [0.025, 0.08, 0.025]));
  face(g, look, c, 0.22);
  for (const s of [-1, 1]) {
    const arm = RIGHT.clone().multiplyScalar(s * 0.22).add(V(0, 0.2, 0));
    g.add(mesh(SPHERE(), P(crop.color, 'produce', { roughness: 0.3 }), arm.toArray(), 0.05));
  }
  return 0.56;
};

B.durian = (g, P, crop) => {
  for (let i = 0; i < 6; i++) leaf(g, P(crop.leaf, 'leaf'), { p: [0, 0.02, 0], len: 0.3, w: 0.13, tilt: 0.2, yaw: i * 1.05 });
  const skin = P(crop.color, 'produce', { roughness: 0.65 });
  const fruitAt = (c, rx, ry, n) => {
    g.add(mesh(SPHERE(), skin, c.toArray(), [rx, ry, rx]));
    for (let i = 0; i < n; i++) {
      const y = 1 - (i / (n - 1)) * 2;
      if (y < -0.7) continue;
      const r = Math.sqrt(1 - y * y);
      const a = i * 2.39996;
      const d = V(Math.cos(a) * r, y, Math.sin(a) * r);
      const spike = mesh(CONE(), skin, V(d.x * rx, d.y * ry, d.z * rx).add(c).toArray(), [rx * 0.14, rx * 0.3, rx * 0.14]);
      spike.quaternion.setFromUnitVectors(UPV, d);
      g.add(spike);
    }
    g.add(mesh(CYL(0.6), P('#6b4a2a', 'accent'), c.clone().add(V(0, ry + 0.02, 0)).toArray(), [0.022, 0.07, 0.022]));
  };
  fruitAt(V(-0.02, 0.24, -0.02), 0.2, 0.23, 48);
  fruitAt(V(0.24, 0.11, 0.16), 0.1, 0.11, 26);
  return 0.56;
};

// ── Fruits of levels 31–40 ────────────────────────────────────

/** Half a fruit lying cut side up, tipped toward the camera. Parts added to it sit on the cut face (y ≈ 0). */
function cutHalf(g, P, { at, r, skin, flesh, depth = 0.8 }) {
  const h = group(g, [at[0], r * depth * 0.8, at[1]]);
  h.quaternion.setFromUnitVectors(UPV, V(0.35, 1, 0.35).normalize());
  h.add(mesh(HEMI(), skin, [0, 0, 0], [r, r * depth, r], [Math.PI, 0, 0]));
  h.add(mesh(CYL(), skin, [0, -0.003, 0], [r, 0.006, r]));
  h.add(mesh(CYL(), flesh, [0, 0, 0], [r * 0.88, 0.008, r * 0.88]));
  return h;
}

/** Small dots scattered over the cut face of a half (seeds, pips). */
function pips(h, mat, { n, r, s, seed, ring = false }) {
  const rnd = rand(seed);
  for (let i = 0; i < n; i++) {
    const a = ring ? (i / n) * TAU : rnd() * TAU;
    const d = ring ? r : Math.sqrt(rnd()) * r;
    h.add(mesh(SPHERE_LO(), mat, [Math.cos(a) * d, 0.006, Math.sin(a) * d], [s, s * 0.6, s * 1.4], [0, -a, 0]));
  }
}

B.chili = (g, P, crop) => {
  g.add(mesh(CYL(0.6), P('#4f9a3a', 'stem'), [0, 0.2, 0], [0.025, 0.4, 0.025]));
  const leafM = P(crop.leaf, 'leaf');
  for (let i = 0; i < 10; i++) leaf(g, leafM, { p: [0, 0.08 + i * 0.04, 0], len: 0.2, w: 0.07, tilt: 0.25 + (i % 3) * 0.2, yaw: i * 2.4 });
  const pod = P(crop.color, 'produce', { roughness: 0.2 });
  const green = P('#4fae2a', 'accent', { roughness: 0.25 });
  const cap = P('#3f8a2e', 'accent');
  // Bird's-eye chillies grow pointing at the sky ("ớt chỉ thiên").
  for (let k = 0; k < 8; k++) {
    const a = k * (TAU / 8) + 0.2;
    const r = 0.11 + (k % 2) * 0.07;
    const c = group(g, [Math.sin(a) * r, 0.3 + ((k * 3) % 4) * 0.05, Math.cos(a) * r], 1 - (k % 3) * 0.1, [Math.cos(a) * 0.5, 0, -Math.sin(a) * 0.5]);
    c.add(mesh(CYL(), cap, [0, -0.02, 0], [0.007, 0.04, 0.007]));
    c.add(mesh(SPHERE_LO(), cap, [0, 0.005, 0], [0.024, 0.014, 0.024]));
    const m = k % 4 === 3 ? green : pod;
    c.add(mesh(CAPS(0.021, 0.08), m, [0, 0.062, 0], 1));
    c.add(mesh(CONE(), m, [0, 0.13, 0], [0.02, 0.05, 0.02]));
  }
  return 0.62;
};

B.lime = (g, P, crop) => {
  const skin = P(crop.color, 'produce', { roughness: 0.2 });
  // A low, bushy tree.
  const top = fruitTree(g, P, crop, {
    canopy: [[0, 0.44, 0, 0.25], [-0.2, 0.34, 0.06, 0.18], [0.16, 0.35, -0.16, 0.18], [0.14, 0.32, 0.15, 0.16], [0.02, 0.62, -0.03, 0.16]],
    trunk: 0.22,
    fruits: 9,
    fruit: (t, p, d) => {
      const l = group(t, p.toArray());
      l.quaternion.copy(quatTo(d));
      l.add(mesh(SPHERE(), skin, [0, 0, 0], [0.05, 0.05, 0.058]));
      l.add(mesh(SPHERE_LO(), skin, [0, 0, 0.056], 0.012));
    },
  });
  // A half shows the wheel of juicy segments.
  const h = cutHalf(g, P, { at: [0.24, 0.24], r: 0.075, skin, flesh: P('#d4f07a', 'accent', { roughness: 0.3 }) });
  const pith = P('#f6fbe0', 'accent');
  for (let i = 0; i < 4; i++) h.add(mesh(BOX(), pith, [0, 0.005, 0], [0.005, 0.004, 0.13], [0, (i * Math.PI) / 4, 0]));
  h.add(mesh(CYL(), pith, [0, 0.006, 0], [0.012, 0.004, 0.012]));
  return top;
};

B.tangerine = (g, P, crop) => {
  const top = fruitTree(g, P, crop, {
    canopy: [[0, 0.58, 0, 0.29], [-0.2, 0.5, 0.06, 0.2], [0.16, 0.5, -0.17, 0.2], [0.15, 0.48, 0.15, 0.18], [0.03, 0.77, -0.03, 0.18]],
    fruits: 12,
    fruit: (t, p, d, k) => {
      const q = group(t, p.toArray(), 1, [0, k, 0]);
      q.add(mesh(SPHERE(), P(crop.color, 'produce', { roughness: 0.45 }), [0, 0, 0], [0.056, 0.044, 0.056]));
      q.add(mesh(SPHERE_LO(), P('#3f8a2e', 'accent'), [0, 0.043, 0], [0.012, 0.006, 0.012]));
      if (k % 3 === 0) leaf(q, P(crop.leaf, 'leaf'), { p: [0, 0.044, 0], len: 0.07, w: 0.032, tilt: 0.3, yaw: 0.7 });
    },
  });
  // A red Tết envelope hangs from the tree, as on the tangerine trees sold for the new year.
  const env = group(g, FRONT_FLAT.clone().multiplyScalar(0.3).add(V(0, 0.3, 0)).toArray(), 1, [0, FY, 0.08]);
  env.add(mesh(CYL(), P('#c9a24a', 'deco'), [0, 0.06, 0], [0.003, 0.06, 0.003]));
  env.add(mesh(BOX(), P('#e8202a', 'deco', { roughness: 0.4 }), [0, 0, 0], [0.055, 0.075, 0.008]));
  env.add(mesh(SPHERE_LO(), P('#ffd23f', 'deco', { metalness: 0.6, roughness: 0.3 }), [0, 0.006, 0.005], [0.015, 0.015, 0.004]));
  return top;
};

const GUAVA_PTS = [[0, 0], [0.04, 0.004], [0.064, 0.03], [0.07, 0.065], [0.058, 0.1], [0.034, 0.124], [0, 0.13]];

B.guava = (g, P, crop) => {
  const skin = P(crop.color, 'produce', { roughness: 0.5 });
  const top = fruitTree(g, P, crop, {
    canopy: [[0, 0.64, 0, 0.28], [-0.19, 0.55, 0.06, 0.19], [0.15, 0.56, -0.16, 0.2], [0.05, 0.8, -0.05, 0.16]],
    fruits: 6,
    hang: true,
    fruit: (t, p, d, k) => {
      const f = group(t, p.toArray(), 1, [0, k, 0.12]);
      f.add(mesh(CYL(), P('#5a7a2a', 'stem'), [0, 0.01, 0], [0.006, 0.04, 0.006]));
      f.add(mesh(LATHE('guava', GUAVA_PTS), skin, [0, -0.13, 0], 1));
      f.add(mesh(SPHERE_LO(), P('#6b5a2a', 'accent'), [0, -0.128, 0], [0.016, 0.006, 0.016]));
    },
  });
  // A half shows the pink flesh and the ring of seeds.
  const h = cutHalf(g, P, { at: [0.24, 0.24], r: 0.085, skin, flesh: P('#ff9aa8', 'accent', { roughness: 0.45 }) });
  h.add(mesh(CYL(), P('#ff6f86', 'accent', { roughness: 0.45 }), [0, 0.003, 0], [0.045, 0.008, 0.045]));
  pips(h, P('#fbe7b8', 'accent'), { n: 9, r: 0.03, s: 0.007, seed: 'guava', ring: true });
  return top;
};

B.greenPear = (g, P, crop) => fruitTree(g, P, crop, {
  canopy: [[0, 0.66, 0, 0.27], [-0.18, 0.57, 0.05, 0.19], [0.15, 0.58, -0.15, 0.2], [0.05, 0.82, -0.05, 0.16]],
  fruits: 6,
  hang: true,
  fruit: (t, p, d, k) => {
    const f = group(t, p.toArray(), 1, [0, k, 0.1]);
    f.add(mesh(CYL(), P('#6b4a2a', 'accent'), [0, 0.01, 0], [0.007, 0.05, 0.007]));
    f.add(mesh(LATHE('pear', PEAR_PTS), P(crop.color, 'produce', { roughness: 0.35 }), [0, -0.205, 0], 0.68));
    if (k % 2) leaf(f, P(crop.leaf, 'leaf'), { p: [0, 0.01, 0], len: 0.07, w: 0.035, tilt: 0.2, yaw: 1 });
  },
});

/** Five ribs round the y axis: a whole starfruit, or a slice of one when it is thin. */
function starRibs(parent, mat, { r = 0.02, len = 0.075, rib = 0.042, w = 0.02 } = {}) {
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU;
    parent.add(mesh(SPHERE(), mat, [Math.cos(a) * r, 0, Math.sin(a) * r], [w, len, rib], [0, Math.PI / 2 - a, 0]));
  }
}

B.starfruit = (g, P, crop) => {
  const skin = P(crop.color, 'produce', { roughness: 0.25 });
  const top = fruitTree(g, P, crop, {
    canopy: [[0, 0.62, 0, 0.27], [-0.2, 0.55, 0.05, 0.2], [0.16, 0.56, -0.15, 0.2], [0.04, 0.78, -0.04, 0.17]],
    fruits: 6,
    hang: true,
    fruit: (t, p, d, k) => {
      const f = group(t, p.toArray(), 1, [0.15, k * 1.2, 0.3]);
      f.add(mesh(CYL(), P('#5a7a2a', 'stem'), [0, 0, 0], [0.005, 0.04, 0.005]));
      starRibs(group(f, [0, -0.085, 0]), skin);
    },
  });
  // Cut across, a starfruit is a star.
  const slice = group(g, FRONT_FLAT.clone().multiplyScalar(0.3).add(V(0, 0.02, 0)).toArray());
  slice.quaternion.setFromUnitVectors(UPV, V(0.35, 1, 0.35).normalize());
  starRibs(slice, skin, { r: 0.034, len: 0.014, rib: 0.05, w: 0.032 });
  slice.add(mesh(CYL(), P('#fff3b0', 'accent'), [0, 0.008, 0], [0.026, 0.012, 0.026]));
  return top;
};

B.passionFruit = (g, P, crop) => {
  // The vine winds up a bamboo stake.
  g.add(mesh(CYL(0.8), P('#d2b86e', 'stem', { roughness: 0.6 }), [0, 0.42, 0], [0.022, 0.84, 0.022]));
  const leafM = P(crop.leaf, 'leaf');
  const vine = P('#6aa83a', 'stem');
  const at = (t) => {
    const a = t * TAU * 1.75 + 0.6;
    return V(Math.sin(a) * 0.07, 0.08 + t * 0.74, Math.cos(a) * 0.07);
  };
  let prev = at(0);
  for (let i = 1; i <= 16; i++) {
    const p = at(i / 16);
    const seg = mesh(CYL(), vine, prev.clone().add(p).multiplyScalar(0.5).toArray(), [0.008, p.distanceTo(prev), 0.008]);
    seg.quaternion.setFromUnitVectors(UPV, p.clone().sub(prev).normalize());
    g.add(seg);
    leaf(g, leafM, { p: p.toArray(), len: 0.15, w: 0.1, tilt: 0.2, yaw: Math.atan2(p.x, p.z) + (i % 2 ? 0.5 : -0.5) });
    prev = p;
  }
  tuft(g, leafM, { n: 4, len: 0.14, w: 0.09, tilt: 0.7, y: 0.84 });
  const skin = P(crop.color, 'produce', { roughness: 0.4 });
  for (const t of [0.3, 0.5, 0.7, 0.88]) {
    const p = at(t);
    const f = group(g, p.clone().addScaledVector(V(p.x, 0, p.z).normalize(), 0.06).toArray());
    f.add(mesh(CYL(), vine, [0, -0.02, 0], [0.005, 0.05, 0.005]));
    f.add(mesh(SPHERE(), skin, [0, -0.09, 0], [0.055, 0.06, 0.055]));
  }
  const bloom = group(g, at(0.4).addScaledVector(FRONT_FLAT, 0.07).toArray());
  flowerHead(bloom, P, '#ffffff', '#7a3cc8', { petals: 10, r: 0.05, len: 0.055, w: 0.022 });
  // A half shows the golden juice full of black seeds.
  const h = cutHalf(g, P, { at: [0.24, 0.24], r: 0.075, skin, flesh: P('#ffc21f', 'accent', { roughness: 0.2 }) });
  pips(h, P('#2a1b10', 'accent', { roughness: 0.3 }), { n: 12, r: 0.05, s: 0.008, seed: 'passion' });
  return 0.9;
};

// Hundreds of red seeds in an open pomegranate, merged into one shape.
const ARILS = () =>
  geo('arils', () => {
    const rnd = rand('arils');
    const parts = [];
    for (let i = 0; i < 34; i++) {
      const a = rnd() * TAU;
      const d = Math.sqrt(rnd()) * 0.78;
      const s = new THREE.SphereGeometry(0.15, 7, 5);
      s.scale(1, 0.8, 1);
      s.translate(Math.cos(a) * d, 0.06 + rnd() * 0.06, Math.sin(a) * d);
      parts.push(s);
    }
    return mergeGeometries(parts);
  });

B.pomegranate = (g, P, crop) => {
  const skin = P(crop.color, 'produce', { roughness: 0.3 });
  const fruit = (parent, r) => {
    parent.add(mesh(SPHERE(), skin, [0, 0, 0], [r, r * 0.92, r]));
    parent.add(mesh(CYL(0.9), skin, [0, r * 0.95, 0], [r * 0.26, r * 0.25, r * 0.26]));
    // The little crown on top.
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU;
      parent.add(mesh(CONE(), skin, [Math.cos(a) * r * 0.22, r * 1.12, Math.sin(a) * r * 0.22], [r * 0.1, r * 0.3, r * 0.1], [Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5]));
    }
  };
  const top = fruitTree(g, P, crop, {
    canopy: [[0, 0.62, 0, 0.27], [-0.18, 0.54, 0.05, 0.19], [0.15, 0.55, -0.15, 0.2], [0.04, 0.78, -0.05, 0.16]],
    fruits: 6,
    fruit: (t, p, d, k) => fruit(group(t, p.toArray(), 1, [0.2, k, -0.15]), 0.068),
  });
  // An open one shows its jewels.
  const h = cutHalf(g, P, { at: [0.24, 0.24], r: 0.1, skin, flesh: P('#ffe6cf', 'accent', { roughness: 0.6 }) });
  h.add(mesh(ARILS(), P('#ff1f4f', 'accent', { roughness: 0.12 }), [0, 0, 0], 0.1));
  return top;
};

/** A unit ball with n parts spread evenly over it, merged into one shape. part(i) makes one standing on top of the ball. */
const studded = (key, n, part, [ws, hs] = [16, 12]) =>
  geo(key, () => {
    const parts = [new THREE.SphereGeometry(1, ws, hs)];
    for (let i = 0; i < n; i++) {
      const y = 1 - ((i + 0.5) / n) * 2;
      const r = Math.sqrt(1 - y * y);
      const a = i * 2.39996;
      const p = part(i);
      p.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UPV, V(Math.cos(a) * r, y, Math.sin(a) * r)));
      parts.push(p);
    }
    return mergeGeometries(parts);
  });

// A rambutan: a ball covered in soft hairs.
const RAMBUTAN = () => studded('rambutan', 40, () => new THREE.ConeGeometry(0.1, 0.55, 4).translate(0, 1.2, 0), [14, 10]);

B.rambutan = (g, P, crop) => {
  const skin = P(crop.color, 'produce', { roughness: 0.55 });
  return fruitTree(g, P, crop, {
    canopy: [[0, 0.64, 0, 0.29], [-0.19, 0.56, 0.06, 0.2], [0.16, 0.57, -0.16, 0.2], [0.05, 0.8, -0.04, 0.17]],
    fruits: 5,
    hang: true,
    fruit: (t, p, d, k) => {
      const c = group(t, p.toArray(), 1, [0, k * 1.7, 0]);
      c.add(mesh(CYL(), P('#6a7a3a', 'stem'), [0, -0.01, 0], [0.005, 0.05, 0.005]));
      for (const [x, y, z] of [[0, -0.05, 0], [0.05, -0.08, 0.02], [-0.045, -0.085, 0.03], [0.01, -0.12, 0.05]]) {
        c.add(mesh(RAMBUTAN(), skin, [x * 1.15, y * 1.15, z * 1.15], 0.037));
      }
    },
  });
};

const CASHEW_PTS = [[0, 0], [0.03, 0.006], [0.042, 0.03], [0.05, 0.07], [0.054, 0.105], [0.045, 0.13], [0.02, 0.142], [0, 0.145]];

B.cashew = (g, P, crop) => fruitTree(g, P, crop, {
  canopy: [[0, 0.64, 0, 0.29], [-0.2, 0.55, 0.05, 0.2], [0.16, 0.56, -0.16, 0.2], [0.05, 0.8, -0.05, 0.16]],
  fruits: 5,
  hang: true,
  fruit: (t, p, d, k) => {
    const f = group(t, p.toArray(), 1.25, [0, FY, 0.1 * (k % 2 ? 1 : -1)]);
    f.add(mesh(CYL(), P('#5a7a2a', 'stem'), [0, 0.01, 0], [0.006, 0.04, 0.006]));
    // Cashew apples are red or yellow.
    f.add(mesh(LATHE('cashew', CASHEW_PTS), P(k % 2 ? '#ffc21a' : crop.color, 'produce', { roughness: 0.25 }), [0, -0.145, 0], 1));
    // The nut hangs outside, under the fruit.
    f.add(mesh(TORUS(0.024, 0.015, Math.PI), P('#9aa46a', 'accent', { roughness: 0.6 }), [0, -0.184, 0], 1));
  },
});

B.cherry = (g, P, crop) => {
  const skin = P(crop.color, 'produce', { roughness: 0.15 });
  const stalk = P('#6a8a2a', 'stem');
  return fruitTree(g, P, crop, {
    canopy: [[0, 0.64, 0, 0.28], [-0.19, 0.56, 0.05, 0.2], [0.15, 0.57, -0.16, 0.2], [0.04, 0.8, -0.05, 0.17]],
    fruits: 6,
    hang: true,
    fruit: (t, p, d, k) => {
      // Cherries hang in pairs from one stalk.
      const c = group(t, p.toArray(), 1, [0, FY + ((k % 3) - 1) * 0.5, 0]);
      for (const s of [-1, 1]) {
        c.add(mesh(CYL(), stalk, [s * 0.022, -0.05, 0], [0.004, 0.11, 0.004], [0, 0, s * 0.42]));
        c.add(mesh(SPHERE(), skin, [s * 0.045, -0.125, 0], [0.04, 0.037, 0.04]));
      }
      if (k % 2 === 0) leaf(c, P(crop.leaf, 'leaf'), { p: [0, 0, 0], len: 0.08, w: 0.035, tilt: 0.3, yaw: Math.PI / 2 });
    },
  });
};

B.melon = (g, P, crop) => {
  const leafM = P(crop.leaf, 'leaf');
  for (let i = 0; i < 5; i++) leaf(g, leafM, { p: [0, 0.02, 0], len: 0.32, w: 0.2, tilt: 0.12, yaw: i * 1.25 + 2.2 });
  const skin = P('#ffffff', 'produce', { map: netTexture(), roughness: 0.6 });
  g.add(mesh(SPHERE(), skin, [-0.04, 0.22, -0.04], [0.23, 0.22, 0.23]));
  // The T-shaped stalk a good melon is sold with.
  const stalk = P('#7a8a3a', 'stem');
  g.add(mesh(CYL(0.8), stalk, [-0.04, 0.47, -0.04], [0.016, 0.07, 0.016]));
  g.add(mesh(CYL(), stalk, [-0.04, 0.5, -0.04], [0.012, 0.12, 0.012], [0, FY, Math.PI / 2]));
  g.add(mesh(TORUS(0.05, 0.008, Math.PI * 1.6), stalk, [-0.3, 0.06, 0.1], 1, [0.3, 0.5, 0]));
  // A half shows the orange flesh and the seeds in the middle.
  const h = cutHalf(g, P, { at: [0.25, 0.25], r: 0.11, skin, flesh: P('#ff9a3a', 'accent', { roughness: 0.4 }) });
  h.add(mesh(CYL(), P('#f6d58a', 'accent'), [0, 0.003, 0], [0.045, 0.008, 0.045]));
  pips(h, P('#fff1cf', 'accent'), { n: 10, r: 0.03, s: 0.007, seed: 'melon' });
  return 0.56;
};

// ── Fruits of levels 41–45 ────────────────────────────────────

B.kiwi = (g, P, crop) => {
  // Kiwi vines are trained over a T-shaped trellis and the fruit hangs underneath.
  const wood = P('#a8804e', 'stem', { roughness: 0.8 });
  g.add(mesh(CYL(), wood, [0, 0.3, 0], [0.02, 0.6, 0.02]));
  g.add(mesh(BOX(), wood, [0, 0.6, 0], [0.56, 0.024, 0.024], [0, FY, 0]));
  g.add(mesh(CYL(0.7), P('#7a5a3a', 'stem'), FRONT_FLAT.clone().multiplyScalar(0.025).setY(0.3).toArray(), [0.012, 0.6, 0.012]));
  const leafM = P(crop.leaf, 'leaf', { roughness: 0.7 });
  for (const s of [-0.18, 0, 0.18]) g.add(mesh(SPHERE_LO(), leafM, RIGHT.clone().multiplyScalar(s).setY(0.67).toArray(), [0.17, 0.08, 0.17]));
  const rnd = rand('kiwi');
  for (let i = 0; i < 12; i++) {
    const p = RIGHT.clone().multiplyScalar((i / 11 - 0.5) * 0.62).addScaledVector(FRONT_FLAT, rnd() * 0.16 - 0.08).setY(0.68 + rnd() * 0.04);
    leaf(g, leafM, { p: p.toArray(), len: 0.15, w: 0.12, tilt: -0.25 + rnd() * 0.5, yaw: rnd() * TAU });
  }
  const skin = P(crop.color, 'produce', { roughness: 0.95 });
  const stalk = P('#6b4a2a', 'stem');
  for (let k = 0; k < 7; k++) {
    const at = RIGHT.clone().multiplyScalar((k / 6 - 0.5) * 0.48).addScaledVector(FRONT_FLAT, k % 2 ? 0.08 : -0.02).setY(0.6);
    const f = group(g, at.toArray(), 1 - (k % 3) * 0.08, [0, k, 0.1]);
    f.add(mesh(CYL(), stalk, [0, -0.02, 0], [0.004, 0.04, 0.004]));
    f.add(mesh(SPHERE(), skin, [0, -0.08, 0], [0.034, 0.046, 0.034]));
  }
  // A half shows the green flesh, the pale heart and the ring of tiny black seeds.
  const h = cutHalf(g, P, { at: [0.24, 0.24], r: 0.06, skin, flesh: P('#7fc832', 'accent', { roughness: 0.3 }) });
  h.add(mesh(CYL(), P('#eef2c0', 'accent'), [0, 0.003, 0], [0.018, 0.008, 0.018]));
  pips(h, P('#1a1410', 'accent'), { n: 16, r: 0.027, s: 0.004, seed: 'kiwi', ring: true });
  return 0.76;
};

B.silverberry = (g, P, crop) => {
  const skin = P('#ffffff', 'produce', { map: speckleTexture(), roughness: 0.4 });
  const stalk = P('#9a8a5a', 'stem');
  return fruitTree(g, P, crop, {
    canopy: [[0, 0.6, 0, 0.27], [-0.19, 0.52, 0.05, 0.19], [0.15, 0.53, -0.15, 0.19], [0.04, 0.76, -0.04, 0.16]],
    trunk: 0.38,
    fruits: 9,
    hang: true,
    fruit: (t, p, d, k) => {
      // Long, oval berries dangle in twos on thin stalks.
      const c = group(t, p.toArray(), 1.3, [0, k * 1.9, 0]);
      for (const [x, z, l] of [[-0.014, 0, 0.05], [0.016, 0.012, 0.075]]) {
        c.add(mesh(CYL(), stalk, [x, -l / 2, z], [0.003, l, 0.003]));
        c.add(mesh(SPHERE(), skin, [x, -l - 0.034, z], [0.022, 0.038, 0.022]));
      }
    },
  });
};

B.fig = (g, P, crop) => {
  const top = fruitTree(g, P, crop, {
    canopy: [[0, 0.7, 0, 0.28], [-0.2, 0.62, 0.06, 0.2], [0.16, 0.63, -0.16, 0.2], [0.05, 0.86, -0.05, 0.16]],
    trunk: 0.56,
    girth: 0.06,
    fruits: 0,
  });
  const ripe = P(crop.color, 'produce', { roughness: 0.4 });
  const mats = [ripe, P('#f0902a', 'produce', { roughness: 0.4 }), ripe, P('#a8c43a', 'produce', { roughness: 0.4 })];
  // Cluster figs grow in bunches straight out of the trunk.
  const bunch = [[0, 0, 1], [1, 0.4, 0.5], [-1, 0.5, 0.5], [0.6, -0.9, 0.6], [-0.6, -0.8, 0.6], [0.1, 1, 0.3]];
  [[0.14, -0.5], [0.27, 0.35], [0.4, -0.15], [0.5, 0.6]].forEach(([y, a], j) => {
    const out = FRONT_FLAT.clone().applyAxisAngle(UPV, a);
    const side = V(-out.z, 0, out.x);
    const c = out.clone().multiplyScalar(0.06).setY(y);
    bunch.forEach(([s, u, o], i) => {
      const p = c.clone().addScaledVector(side, s * 0.03).addScaledVector(UPV, u * 0.03).addScaledVector(out, o * 0.03);
      g.add(mesh(SPHERE(), mats[(i + j) % mats.length], p.toArray(), [0.027, 0.025, 0.027]));
    });
  });
  // A half shows the pink inside full of tiny seeds.
  const h = cutHalf(g, P, { at: [0.25, 0.22], r: 0.045, skin: ripe, flesh: P('#f6dcb4', 'accent') });
  h.add(mesh(CYL(), P('#e8607a', 'accent', { roughness: 0.5 }), [0, 0.003, 0], [0.03, 0.008, 0.03]));
  pips(h, P('#fff2c0', 'accent'), { n: 14, r: 0.026, s: 0.004, seed: 'fig' });
  return top;
};

// A sugar apple: a ball of rounded knobs.
const SUGAR_APPLE = () => studded('sugarApple', 48, () => new THREE.SphereGeometry(0.3, 8, 6).scale(1, 0.5, 1).translate(0, 0.9, 0));

B.sugarApple = (g, P, crop) => {
  const skin = P(crop.color, 'produce', { roughness: 0.6 });
  const top = fruitTree(g, P, crop, {
    canopy: [[0, 0.62, 0, 0.27], [-0.19, 0.54, 0.05, 0.19], [0.15, 0.55, -0.15, 0.2], [0.04, 0.77, -0.05, 0.16]],
    fruits: 5,
    hang: true,
    fruit: (t, p, d, k) => {
      const f = group(t, p.toArray(), 1, [0, k * 1.3, 0.1]);
      f.add(mesh(CYL(), P('#6b5a2a', 'stem'), [0, -0.005, 0], [0.005, 0.04, 0.005]));
      f.add(mesh(SUGAR_APPLE(), skin, [0, -0.075, 0], [0.05, 0.056, 0.05]));
    },
  });
  // An open one shows the sweet white flesh and the black seeds.
  const h = cutHalf(g, P, { at: [0.24, 0.24], r: 0.075, skin, flesh: P('#fbf5e6', 'accent', { roughness: 0.6 }) });
  pips(h, P('#1a1410', 'accent', { roughness: 0.15 }), { n: 9, r: 0.05, s: 0.009, seed: 'sugarApple' });
  return top;
};

B.sapodilla = (g, P, crop) => {
  const skin = P(crop.color, 'produce', { roughness: 0.9 });
  const top = fruitTree(g, P, crop, {
    canopy: [[0, 0.64, 0, 0.29], [-0.2, 0.56, 0.06, 0.2], [0.16, 0.57, -0.16, 0.2], [0.05, 0.8, -0.05, 0.17]],
    fruits: 7,
    hang: true,
    fruit: (t, p, d, k) => {
      const f = group(t, p.toArray(), 1, [0.1, k * 1.5, 0.15]);
      f.add(mesh(CYL(), P('#6b5a3a', 'stem'), [0, -0.005, 0], [0.005, 0.04, 0.005]));
      f.add(mesh(SPHERE(), skin, [0, -0.07, 0], [0.046, 0.054, 0.046]));
      f.add(mesh(CONE(), P('#5a3a20', 'accent'), [0, -0.127, 0], [0.006, 0.012, 0.006], [Math.PI, 0, 0]));
    },
  });
  // A half shows the honey-brown flesh and the shiny black seeds.
  const h = cutHalf(g, P, { at: [0.24, 0.24], r: 0.065, skin, flesh: P('#d98a48', 'accent', { roughness: 0.5 }) });
  pips(h, P('#1f140c', 'accent', { roughness: 0.15 }), { n: 5, r: 0.022, s: 0.009, seed: 'sapodilla', ring: true });
  return top;
};

// A soursop: a ball of soft, bent spines.
const SOURSOP = () => studded('soursop', 70, () => new THREE.ConeGeometry(0.06, 0.24, 4).translate(0, 0.12, 0).rotateX(0.5).translate(0, 0.96, 0));

B.soursop = (g, P, crop) => {
  const skin = P(crop.color, 'produce', { roughness: 0.5 });
  const stalk = P('#5a6a2a', 'stem');
  const top = fruitTree(g, P, crop, {
    canopy: [[0, 0.66, 0, 0.28], [-0.2, 0.58, 0.06, 0.2], [0.16, 0.59, -0.16, 0.2], [0.05, 0.82, -0.05, 0.17]],
    trunk: 0.46,
    fruits: 4,
    hang: true,
    fruit: (t, p, d, k) => {
      const f = group(t, p.toArray(), 1, [0.1, k * 1.4, 0.2]);
      f.add(mesh(CYL(), stalk, [0, -0.005, 0], [0.006, 0.04, 0.006]));
      f.add(mesh(SOURSOP(), skin, [0, -0.095, 0], [0.055, 0.078, 0.055]));
    },
  });
  // A big ripe one picked and laid on the grass.
  const lying = group(g, FRONT_FLAT.clone().multiplyScalar(0.33).add(V(0, 0.06, 0)).toArray(), 1, [0, FY, 1.35]);
  lying.add(mesh(SOURSOP(), skin, [0, 0, 0], [0.062, 0.088, 0.062]));
  lying.add(mesh(CYL(), stalk, [0, 0.1, 0], [0.008, 0.03, 0.008]));
  return top;
};

const POMELO_PTS = [[0, 0], [0.05, 0.004], [0.085, 0.03], [0.098, 0.07], [0.094, 0.11], [0.074, 0.145], [0.048, 0.168], [0.028, 0.182], [0, 0.186]];

B.pomelo = (g, P, crop) => {
  const skin = P(crop.color, 'produce', { roughness: 0.45 });
  const top = fruitTree(g, P, crop, {
    canopy: [[0, 0.68, 0, 0.29], [-0.2, 0.6, 0.06, 0.2], [0.16, 0.61, -0.16, 0.21], [0.05, 0.85, -0.05, 0.17]],
    trunk: 0.46,
    fruits: 4,
    hang: true,
    fruit: (t, p, d, k) => {
      const f = group(t, p.toArray(), 0.9 + (k % 2) * 0.1, [0, k * 1.6, 0.08]);
      f.add(mesh(CYL(), P('#5a6a2a', 'stem'), [0, -0.005, 0], [0.007, 0.04, 0.007]));
      f.add(mesh(LATHE('pomelo', POMELO_PTS), skin, [0, -0.2, 0], 1));
      if (k % 2 === 0) leaf(f, P(crop.leaf, 'leaf'), { p: [0, -0.01, 0], len: 0.08, w: 0.04, tilt: 0.2, yaw: 1 });
    },
  });
  // A half shows the thick white pith round the pink segments.
  const pith = P('#fbf3da', 'accent', { roughness: 0.6 });
  const h = cutHalf(g, P, { at: [0.25, 0.25], r: 0.1, skin, flesh: pith });
  h.add(mesh(CYL(), P('#ff8a92', 'accent', { roughness: 0.35 }), [0, 0.003, 0], [0.066, 0.006, 0.066]));
  for (let i = 0; i < 6; i++) h.add(mesh(BOX(), pith, [0, 0.006, 0], [0.005, 0.004, 0.13], [0, (i * Math.PI) / 6, 0]));
  h.add(mesh(CYL(), pith, [0, 0.007, 0], [0.012, 0.004, 0.012]));
  return top;
};

// A jackfruit: a long ball covered in small blunt studs.
const JACKFRUIT = () => studded('jackfruit', 150, () => new THREE.ConeGeometry(0.14, 0.12, 6).translate(0, 0.99, 0), [20, 14]);

B.jackfruit = (g, P, crop) => {
  const top = fruitTree(g, P, crop, {
    canopy: [[0, 0.7, 0, 0.29], [-0.21, 0.62, 0.06, 0.2], [0.17, 0.63, -0.17, 0.21], [0.05, 0.86, -0.05, 0.17]],
    trunk: 0.56,
    girth: 0.065,
    fruits: 0,
  });
  const skin = P(crop.color, 'produce', { roughness: 0.7 });
  const stalk = P('#7a6a3a', 'stem');
  // Jackfruit grows straight out of the trunk, hugging it.
  for (const [y, a, s] of [[0.3, -0.4, 1], [0.5, 0.55, 0.8]]) {
    const out = FRONT_FLAT.clone().applyAxisAngle(UPV, a);
    const f = group(g, out.clone().multiplyScalar(0.05).setY(y).toArray(), s);
    f.add(mesh(CYL(), stalk, out.clone().multiplyScalar(0.012).setY(-0.005).toArray(), [0.01, 0.04, 0.01]));
    f.add(mesh(JACKFRUIT(), skin, out.clone().multiplyScalar(0.075).setY(-0.125).toArray(), [0.082, 0.125, 0.082]));
  }
  // An open one shows the golden bulbs round the pale core.
  const h = cutHalf(g, P, { at: [0.26, 0.24], r: 0.09, skin, flesh: P('#efe2a0', 'accent', { roughness: 0.6 }) });
  h.add(mesh(CYL(), P('#f8f2d6', 'accent'), [0, 0.004, 0], [0.022, 0.008, 0.022]));
  pips(h, P('#ffbf1a', 'accent', { roughness: 0.3 }), { n: 9, r: 0.055, s: 0.015, seed: 'jackfruit', ring: true });
  return top;
};

// ── Growth stages ─────────────────────────────────────────────

function seedStage(g, mystery) {
  g.add(mesh(SPHERE(), plantMat('#6b4128', 'stem'), [0, 0, 0], [0.24, 0.07, 0.24]));
  g.add(mesh(SPHERE(), plantMat(mystery ? '#c58cff' : '#f2d49b', 'stem'), [0.02, 0.07, 0.03], [0.05, 0.035, 0.05], [0.4, 0, 0.3]));
  g.add(mesh(CYL(0.3), plantMat('#7ed957', 'leaf'), [0.02, 0.1, 0.03], [0.01, 0.05, 0.01]));
  return 0.18;
}

function sproutStage(g, crop, mystery) {
  g.add(mesh(SPHERE(), plantMat('#6b4128', 'stem'), [0, 0, 0], [0.2, 0.05, 0.2]));
  const green = plantMat('#7ed957', 'leaf');
  g.add(mesh(CYL(0.8), green, [0, 0.1, 0], [0.02, 0.2, 0.02]));
  leaf(g, green, { p: [0, 0.19, 0], len: 0.13, w: 0.09, tilt: 0.45, yaw: FY + Math.PI / 2, th: 0.03 });
  leaf(g, green, { p: [0, 0.19, 0], len: 0.13, w: 0.09, tilt: 0.45, yaw: FY - Math.PI / 2, th: 0.03 });
  const bud = mystery ? '#b28cff' : crop.leaf;
  leaf(g, plantMat(bud, 'leaf'), { p: [0, 0.2, 0], len: 0.08, w: 0.04, tilt: 1.3, yaw: FY, th: 0.03 });
  return 0.32;
}

function mysteryYoung(g) {
  const green = plantMat('#6cc04a', 'leaf');
  g.add(mesh(CYL(0.7), plantMat('#4f9a3a', 'stem'), [0, 0.2, 0], [0.025, 0.4, 0.025]));
  for (let i = 0; i < 6; i++) leaf(g, green, { p: [0, 0.1 + i * 0.05, 0], len: 0.22, w: 0.1, tilt: 0.45, yaw: i * 2.3 });
  g.add(mesh(SPHERE(), plantMat('#c9a6ff', 'stem', { emissive: '#7a3cff', emissiveIntensity: 0.4 }), [0, 0.45, 0], 0.09));
  return 0.55;
}

// ── Mutation accessories ──────────────────────────────────────

function crown(g, top) {
  const gold = plantMat('#ffcc33', 'deco', {}, { metalness: 0.9, roughness: 0.25, emissive: '#a86b00', emissiveIntensity: 0.6, side: THREE.DoubleSide });
  const gem = plantMat('#ff3d7f', 'deco', {}, { roughness: 0.15, emissive: '#ff0055', emissiveIntensity: 1.1 });
  const c = group(g, [0, top + 0.02, 0], 1, [-0.12, 0, 0.14]);
  const r = 0.1;
  c.add(mesh(geo('crownBand', () => new THREE.CylinderGeometry(1, 0.9, 0.55, 20, 1, true)), gold, [0, 0, 0], [r, r, r]));
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU;
    c.add(mesh(CONE(), gold, [Math.cos(a) * r * 0.95, r * 0.5, Math.sin(a) * r * 0.95], [r * 0.25, r * 0.55, r * 0.25]));
    c.add(mesh(SPHERE_LO(), gem, [Math.cos(a) * r * 0.95, r * 0.82, Math.sin(a) * r * 0.95], r * 0.13));
  }
  return c;
}

function halo(g, top) {
  const m = mesh(TORUS(0.15, 0.016, TAU), plantMat('#fff2a8', 'deco', {}, { emissive: '#ffd84a', emissiveIntensity: 2.2 }), [0, top + 0.2, 0], 1, [Math.PI / 2, 0, 0]);
  m.castShadow = false;
  m.name = 'halo';
  g.add(m);
  return m;
}

// ── Public API ────────────────────────────────────────────────

/**
 * Build the model for a crop at a growth stage.
 * stage: 0 seed, 1 sprout, 2 growing, 3 ripe
 * Returns a Group with userData { top, look }.
 */
export function buildPlant(cropId, stage, variant = 0, mystery = false) {
  const crop = CROP_BY_ID[cropId];
  const g = new THREE.Group();
  let top;
  let look = null;
  if (stage === 0) top = seedStage(g, mystery);
  else if (stage === 1) top = sproutStage(g, crop, mystery);
  else if (stage === 2 && mystery) top = mysteryYoung(g);
  else {
    const unripe = stage === 2;
    look = unripe ? null : lookOf(crop, variant);
    const ctx = { style: look ? look.style : null, unripe };
    const P = (color, part, extra = {}) => plantMat(color, part, ctx, extra);
    top = B[crop.id](g, P, crop, ctx);
    if (unripe) {
      g.scale.setScalar(0.62);
      top *= 0.62;
    } else if (look) {
      if (look.crown) crown(g, top);
      if (look.halo) halo(g, top);
      if (look.crown) top += 0.18;
      g.scale.setScalar(1.06 + look.rank * 0.1);
      top *= 1.06 + look.rank * 0.1;
    }
  }
  g.userData.top = top;
  g.userData.look = look;
  return g;
}

export const hasBuilder = (id) => typeof B[id] === 'function';
