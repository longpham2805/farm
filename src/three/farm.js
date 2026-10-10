// The farm in the middle of the valley: the plots, the barn, the fences and the frog's pond.
// It is rebuilt with other colours when visiting a neighbour; the valley around stays.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { worldMat } from './materials.js';
import { Batch } from './batch.js';

export const SPACING = 1.32;
export const PLOT = 1.16;
export const PLANT_SCALE = 1.16;
export const SOIL_TOP = 0.14;

const TAU = Math.PI * 2;

function m(geometry, material, p, s = 1, r = null, shadow = true) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...p);
  if (typeof s === 'number') mesh.scale.setScalar(s);
  else mesh.scale.set(...s);
  if (r) mesh.rotation.set(...r);
  mesh.castShadow = shadow;
  mesh.receiveShadow = true;
  return mesh;
}

export const plotCenter = (index) => {
  const r = Math.floor(index / 4);
  const c = index % 4;
  return new THREE.Vector3((c - 1.5) * SPACING, 0, (r - 1.5) * SPACING);
};

// Trees, flowers, rocks and fences go into one merged mesh each, so they draw in a single call.
const TRUNK = new THREE.CylinderGeometry(0.08, 0.12, 0.7, 7);
const BLOB = new THREE.IcosahedronGeometry(1, 1);
const STEM = new THREE.CylinderGeometry(0.012, 0.012, 0.16, 5);
const PETAL = new THREE.SphereGeometry(1, 6, 4);
const POST = new THREE.BoxGeometry(0.1, 0.5, 0.1);
const POST_TOP = new THREE.ConeGeometry(0.075, 0.08, 4);
const RAIL = new THREE.BoxGeometry(0.05, 0.07, 1);
const ROCK = new THREE.DodecahedronGeometry(1, 0);

function tree(batch, x, z, s, leafColor) {
  batch.push(x, 0, z, 0, s);
  batch.add(TRUNK, '#8a5a3a', [0, 0.35, 0]);
  batch.add(BLOB, leafColor, [0, 0.9, 0], 0.42, null, true);
  batch.add(BLOB, leafColor, [0.22, 0.75, 0.1], 0.3, null, true);
  batch.add(BLOB, leafColor, [-0.2, 0.78, -0.08], 0.3, null, true);
  batch.add(BLOB, leafColor, [0.02, 1.18, 0.02], 0.26, null, true);
  batch.pop();
}

function flower(batch, x, z, color) {
  batch.add(STEM, '#4f9a3a', [x, 0.08, z]);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU;
    batch.add(PETAL, color, [x + Math.cos(a) * 0.035, 0.17, z + Math.sin(a) * 0.035], [0.03, 0.015, 0.03]);
  }
  batch.add(PETAL, '#ffe066', [x, 0.175, z], 0.022);
}

function fence(batch, from, to, color) {
  const dir = new THREE.Vector3().subVectors(to, from);
  const len = dir.length();
  const posts = Math.round(len / 0.7);
  for (let i = 0; i <= posts; i++) {
    const p = from.clone().addScaledVector(dir, i / posts);
    batch.add(POST, color, [p.x, 0.25, p.z]);
    batch.add(POST_TOP, color, [p.x, 0.54, p.z], 1, [0, Math.PI / 4, 0]);
  }
  const angle = Math.atan2(dir.x, dir.z);
  const mid = from.clone().add(to).multiplyScalar(0.5);
  for (const y of [0.18, 0.38]) batch.add(RAIL, color, [mid.x, y, mid.z], [1, 1, len], [0, angle, 0]);
}

function barn(theme) {
  const g = new THREE.Group();
  g.add(m(new THREE.BoxGeometry(1.1, 0.75, 0.95), worldMat(theme.barn), [0, 0.375, 0]));
  const roofShape = new THREE.Shape();
  roofShape.moveTo(-0.66, 0);
  roofShape.lineTo(0, 0.5);
  roofShape.lineTo(0.66, 0);
  roofShape.lineTo(-0.66, 0);
  const roofGeo = new THREE.ExtrudeGeometry(roofShape, { depth: 1.1, bevelEnabled: false });
  roofGeo.translate(0, 0, -0.55);
  g.add(m(roofGeo, worldMat(theme.roof), [0, 0.74, 0]));
  const white = worldMat('#fff8ef');
  g.add(m(new THREE.BoxGeometry(0.42, 0.5, 0.04), worldMat('#7a3a2a'), [0.2, 0.25, 0.49]));
  g.add(m(new THREE.BoxGeometry(0.04, 0.6, 0.05), white, [0.2, 0.25, 0.5], 1, [0, 0, 0.7]));
  g.add(m(new THREE.BoxGeometry(0.04, 0.6, 0.05), white, [0.2, 0.25, 0.5], 1, [0, 0, -0.7]));
  g.add(m(new THREE.BoxGeometry(0.2, 0.2, 0.04), white, [0.56, 0.48, 0.0], 1, [0, Math.PI / 2, 0]));
  g.add(m(new THREE.CircleGeometry(0.11, 16), worldMat('#ffe9a8', { emissive: '#ffd36b', emissiveIntensity: 0.3 }), [0.23, 0.95, 0.56], 1, null, false));
  return g;
}

function frog() {
  const g = new THREE.Group();
  const green = worldMat('#6fd36a', { roughness: 0.5 });
  const sph = new THREE.SphereGeometry(1, 16, 12);
  g.add(m(sph, green, [0, 0.1, 0], [0.16, 0.12, 0.14]));
  g.add(m(sph, worldMat('#d9ffb0'), [0.06, 0.07, 0.06], [0.1, 0.07, 0.1]));
  for (const s of [-1, 1]) {
    const p = new THREE.Vector3(1, 0, -1).normalize().multiplyScalar(s * 0.08);
    g.add(m(sph, green, [p.x, 0.2, p.z], 0.055));
    g.add(m(sph, worldMat('#ffffff'), [p.x + 0.03, 0.215, p.z + 0.03], 0.035));
    g.add(m(sph, worldMat('#1d1d2a'), [p.x + 0.05, 0.22, p.z + 0.05], 0.018));
  }
  return g;
}

let cloudGeometry = null;
export function cloud(scale = 1) {
  cloudGeometry ||= mergeGeometries([[0, 0, 0, 0.6], [0.55, -0.08, 0.1, 0.45], [-0.55, -0.1, 0, 0.42], [0.2, 0.25, -0.05, 0.42], [-0.25, 0.18, 0.1, 0.36]]
    .map(([x, y, z, s]) => new THREE.SphereGeometry(1, 14, 10).scale(s, s * 0.8, s).translate(x, y, z)));
  const c = new THREE.Mesh(cloudGeometry, worldMat('#ffffff', { roughness: 1, emissive: '#fff4d6', emissiveIntensity: 0.4 }));
  c.scale.setScalar(scale);
  return c;
}

export function butterfly(color) {
  const g = new THREE.Group();
  const wingGeo = new THREE.CircleGeometry(0.09, 12);
  wingGeo.translate(0.08, 0, 0);
  const mat = new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide, roughness: 0.5, emissive: color, emissiveIntensity: 0.25 });
  const left = new THREE.Mesh(wingGeo, mat);
  const right = new THREE.Mesh(wingGeo, mat);
  right.rotation.y = Math.PI;
  const lw = new THREE.Group();
  const rw = new THREE.Group();
  lw.add(left);
  rw.add(right);
  g.add(lw, rw);
  g.add(new THREE.Mesh(new THREE.CapsuleGeometry(0.012, 0.08, 4, 6), worldMat('#3a2a3a')));
  g.userData.wings = [lw, rw];
  g.rotation.x = Math.PI / 2;
  return g;
}

/**
 * Builds the farm. theme: { fence, barn, roof, tree, tree2 }
 * Returns { group, plots: [{ tile, hit }], clickables }
 */
export function buildFarm(theme) {
  const group = new THREE.Group();
  const clickables = [];

  // plots
  const plots = [];
  const soilGeo = new RoundedBoxGeometry(PLOT, 0.18, PLOT, 2, 0.05);
  const hitGeo = new THREE.BoxGeometry(SPACING, 1.3, SPACING);
  for (let i = 0; i < 16; i++) {
    const c = plotCenter(i);
    const tile = m(soilGeo, new THREE.MeshStandardMaterial({ color: '#9b6440', roughness: 0.95 }), [c.x, 0.05, c.z]);
    tile.castShadow = false;
    group.add(tile);
    const hit = new THREE.Mesh(hitGeo, new THREE.MeshBasicMaterial());
    hit.visible = false;
    hit.position.set(c.x, 0.6, c.z);
    hit.userData.plot = i;
    group.add(hit);
    plots.push({ tile, hit });
  }

  const deco = new Batch();
  const flowers = new Batch();

  // fences along the back edges
  const e = 4.0;
  fence(deco, new THREE.Vector3(-e, 0, -e + 1.4), new THREE.Vector3(-e, 0, e - 0.3), theme.fence);
  fence(deco, new THREE.Vector3(-e + 1.4, 0, -e), new THREE.Vector3(e - 0.3, 0, -e), theme.fence);

  const b = barn(theme);
  b.position.set(-3.3, 0, -3.3);
  b.rotation.y = Math.PI / 4;
  b.traverse((o) => (o.userData.action = 'barn'));
  group.add(b);
  clickables.push(b);

  tree(deco, -3.55, 0.7, 1.0, theme.tree || '#4fb35a');
  tree(deco, 0.8, -3.55, 0.9, theme.tree2 || '#6cc35a');
  tree(deco, 3.5, -3.0, 0.8, theme.tree || '#4fb35a');
  tree(deco, -3.5, 3.2, 0.65, theme.tree2 || '#6cc35a');

  // pond with a frog
  const pond = m(new THREE.CylinderGeometry(0.62, 0.62, 0.04, 28), worldMat('#5ec8ff', { roughness: 0.15, metalness: 0.1 }), [3.45, 0.0, 1.0], [0.85, 1, 0.75]);
  pond.castShadow = false;
  group.add(pond);
  group.add(m(new THREE.TorusGeometry(0.62, 0.07, 6, 28), worldMat('#c9c2b4', { flatShading: true }), [3.45, 0.02, 1.0], [0.85, 0.75, 1], [Math.PI / 2, 0, 0]));
  const pad = m(new THREE.CylinderGeometry(0.17, 0.17, 0.02, 16), worldMat('#4fb35a'), [3.5, 0.03, 1.1]);
  group.add(pad);
  const f = frog();
  f.position.set(3.5, 0.03, 1.1);
  f.rotation.y = Math.PI / 4;
  f.traverse((o) => (o.userData.action = 'frog'));
  group.add(f);
  clickables.push(f);

  for (const [x, z, s] of [[3.4, -0.8, 0.16], [-3.4, -1.2, 0.13], [1.8, 3.5, 0.12], [-1.3, 3.55, 0.1]]) {
    deco.add(ROCK, '#c9c2b4', [x, 0.05, z], [s, s * 0.7, s], null, true);
  }

  const flowerColors = ['#ff8fc1', '#fff3f8', '#ffd23f', '#b48aff', '#ff7a7a'];
  let k = 0;
  for (let t = -3.6; t <= 3.6; t += 0.34) {
    if (t < -2.6 || Math.abs(t - 1.0) > 0.75) flower(flowers, 3.85, t + Math.sin(t * 7) * 0.08, flowerColors[k++ % 5]);
    flower(flowers, t + Math.cos(t * 5) * 0.08, 3.85, flowerColors[k++ % 5]);
  }
  for (const [x, z] of [[3.0, 3.0], [3.15, 2.8], [2.85, 3.2], [-3.0, 2.0], [2.0, -3.0]]) flower(flowers, x, z, flowerColors[k++ % 5]);
  group.add(deco.build(), flowers.build({ castShadow: false }));

  return { group, plots, clickables };
}
