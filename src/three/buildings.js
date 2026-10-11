// Farm buildings and everything else people made around the field, merged into the countryside
// batch. Only the windmill's sails and the chimney smoke move; they come back as their own objects.
import * as THREE from 'three';
import { Batch, gableGeometry } from './batch.js';
import { glowTexture } from './textures.js';
import { treeGeometry, leafSpots } from './trees.js';
import { addNature, natureModel, natureSize, railFence, steppingStones } from './nature.js';

const TAU = Math.PI * 2;
const FACE = Math.PI / 4; // turned to face the camera

const BOX = new THREE.BoxGeometry(1, 1, 1);
const GABLE = gableGeometry();
const BALL = new THREE.SphereGeometry(1, 10, 7);
const ICO = new THREE.IcosahedronGeometry(1, 0);
const cyl = (top, bottom, seg) => new THREE.CylinderGeometry(top, bottom, 1, seg);
const CYL6 = cyl(1, 1, 6);
const CYL10 = cyl(1, 1, 10);
const CYL16 = cyl(1, 1, 16);

const WOOD = '#8a5a3a';
const PLANK = '#b98450';
const STONE = '#c9c2b4';
const TRIM = '#fff8ef';
const GLASS = '#a9dcff';
const STRAW = '#ecc95c';

/** A gable roof of two slabs from eaves at y to a ridge `rise` higher; depth is eave to eave. */
function roof(batch, y, width, depth, rise, color, ridge) {
  const d = depth / 2;
  const slant = Math.hypot(d, rise);
  const angle = Math.atan2(rise, d);
  for (const s of [1, -1]) batch.add(BOX, color, [0, y + rise / 2 + 0.03, (s * d) / 2], [width, 0.07, slant + 0.06], [s * angle, 0, 0]);
  batch.add(BOX, ridge, [0, y + rise + 0.04, 0], [width + 0.04, 0.08, 0.12]);
}

function windowAt(batch, x, y, z, w = 0.26, h = 0.21, side = false) {
  const [fw, fd] = side ? [0.03, w + 0.06] : [w + 0.06, 0.03];
  const [gw, gd] = side ? [0.02, w] : [w, 0.02];
  const out = side ? Math.sign(x) * 0.01 : 0;
  const zo = side ? 0 : 0.01;
  batch.add(BOX, TRIM, [x, y, z], [fw, h + 0.06, fd]);
  batch.add(BOX, GLASS, [x + out, y, z + zo], [gw, h, gd]);
}

// A cosy country house: yellow walls, red tile roof, a porch and a smoking chimney.
function farmhouse(batch) {
  const wall = '#fbe1a2';
  batch.add(BOX, STONE, [0, 0.05, 0], [1.62, 0.1, 1.12]);
  batch.add(BOX, wall, [0, 0.45, 0], [1.5, 0.7, 1.0]);
  batch.add(GABLE, wall, [0, 0.8, 0], [1.5, 0.5, 1.0]);
  roof(batch, 0.8, 1.8, 1.32, 0.52, '#e0673f', '#b84f2f');
  batch.add(BOX, TRIM, [0.3, 0.35, 0.505], [0.34, 0.54, 0.03]);
  batch.add(BOX, WOOD, [0.3, 0.33, 0.515], [0.26, 0.47, 0.03]);
  batch.add(BALL, '#ffd36b', [0.39, 0.33, 0.535], 0.018);
  windowAt(batch, -0.35, 0.52, 0.505);
  for (const x of [-0.56, -0.14]) batch.add(BOX, '#5fa8d3', [x, 0.52, 0.51], [0.07, 0.27, 0.03]);
  windowAt(batch, 0.755, 0.52, -0.1, 0.26, 0.21, true);
  windowAt(batch, -0.755, 0.52, 0.1, 0.26, 0.21, true);
  // flower box under the front window
  batch.add(BOX, WOOD, [-0.35, 0.36, 0.55], [0.34, 0.07, 0.09]);
  ['#ff7a7a', '#ff8fc1', '#ffd23f', '#ff7a7a'].forEach((c, k) => batch.add(BALL, c, [-0.48 + k * 0.09, 0.41, 0.56], 0.035));
  // porch
  batch.add(BOX, '#a8703f', [0.3, 0.12, 0.68], [0.62, 0.06, 0.32]);
  batch.add(BOX, STONE, [0.3, 0.04, 0.9], [0.42, 0.08, 0.16]);
  for (const x of [0.04, 0.56]) batch.add(BOX, WOOD, [x, 0.38, 0.8], [0.05, 0.48, 0.05]);
  batch.add(BOX, '#e0673f', [0.3, 0.64, 0.7], [0.72, 0.05, 0.38], [0.28, 0, 0]);
  // chimney
  batch.add(BOX, '#b5523b', [-0.45, 1.2, -0.18], [0.17, 0.56, 0.17]);
  batch.add(BOX, '#8d3f2d', [-0.45, 1.5, -0.18], [0.21, 0.05, 0.21]);
  return new THREE.Vector3(-0.45, 1.58, -0.18);
}

function silo(batch) {
  batch.add(CYL16, STONE, [0, 0.04, 0], [0.42, 0.08, 0.42]);
  batch.add(CYL16, '#dfe5ec', [0, 0.68, 0], [0.34, 1.2, 0.34]);
  for (const y of [0.35, 0.68, 1.01]) batch.add(CYL16, '#b9c3cf', [0, y, 0], [0.352, 0.035, 0.352]);
  batch.add(new THREE.SphereGeometry(1, 16, 8, 0, TAU, 0, Math.PI / 2), '#ef6461', [0, 1.28, 0], 0.35);
  batch.add(new THREE.ConeGeometry(1, 1, 10), '#c9c2b4', [0, 1.66, 0], [0.07, 0.1, 0.07]);
  for (const x of [-0.07, 0.07]) batch.add(BOX, '#8f9aa6', [x, 0.7, 0.36], [0.025, 1.2, 0.025]);
  for (let y = 0.2; y < 1.25; y += 0.14) batch.add(BOX, '#8f9aa6', [0, y, 0.36], [0.16, 0.02, 0.02]);
}

/** The windmill's tower goes into the batch; its sails are a separate mesh that turns. */
function windmill(batch) {
  batch.add(cyl(0.46, 0.5, 8), STONE, [0, 0.06, 0], [1, 0.12, 1], null, true);
  batch.add(cyl(0.27, 0.42, 8), '#f6ead0', [0, 0.87, 0], [1, 1.5, 1], null, true);
  batch.add(cyl(0.3, 0.3, 8), '#c98a4b', [0, 1.62, 0], [1, 0.06, 1], null, true);
  batch.add(new THREE.ConeGeometry(0.36, 1, 8), '#8a4b3a', [0, 1.9, 0], [1, 0.5, 1], null, true);
  batch.add(BOX, WOOD, [0, 0.3, 0.405], [0.2, 0.34, 0.04]);
  windowAt(batch, 0, 1.05, 0.335, 0.13, 0.15);
  const sails = new Batch();
  sails.add(BALL, '#6b4a2a', [0, 0, 0.02], 0.075);
  // Turns (x, y) by angle a in the sails' plane.
  const turn = (x, y, a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2;
    const part = (x, y, z, size, color) => sails.add(BOX, color, [...turn(x, y, a), z], size, [0, 0, a]);
    part(0, 0.5, 0.03, [0.05, 0.98, 0.04], '#7a4f32');
    part(0.13, 0.58, 0.04, [0.22, 0.74, 0.02], '#fff3dc');
    for (let y = 0.3; y < 0.95; y += 0.16) part(0.13, y, 0.055, [0.23, 0.02, 0.01], '#c98a4b');
  }
  return sails.build();
}

function coop(batch) {
  const wall = '#d9774a';
  for (const x of [-0.3, 0.3]) for (const z of [-0.22, 0.22]) batch.add(BOX, WOOD, [x, 0.12, z], [0.06, 0.24, 0.06]);
  batch.add(BOX, wall, [0, 0.46, 0], [0.72, 0.44, 0.56]);
  batch.add(GABLE, wall, [0, 0.68, 0], [0.72, 0.28, 0.56]);
  roof(batch, 0.68, 0.86, 0.72, 0.28, '#7a4a2a', '#5e371f');
  batch.add(BOX, '#4a2a1a', [0.15, 0.36, 0.285], [0.16, 0.2, 0.02]);
  batch.add(BOX, '#ffe9a8', [-0.18, 0.52, 0.285], [0.13, 0.11, 0.02]);
  batch.add(BOX, PLANK, [0.15, 0.13, 0.47], [0.14, 0.02, 0.44], [0.55, 0, 0]);
  // a little fenced yard in front
  const posts = [];
  for (let x = -0.9; x <= 0.91; x += 0.3) posts.push([x, 1.55]);
  for (let z = 0.35; z < 1.55; z += 0.3) posts.push([-0.9, z], [0.9, z]);
  for (const [x, z] of posts) batch.add(BOX, '#d9b38c', [x, 0.16, z], [0.05, 0.32, 0.05]);
  for (const y of [0.12, 0.26]) {
    batch.add(BOX, '#d9b38c', [0, y, 1.55], [1.8, 0.03, 0.03]);
    for (const x of [-0.9, 0.9]) batch.add(BOX, '#d9b38c', [x, y, 0.95], [0.03, 0.03, 1.2]);
  }
  batch.add(BOX, WOOD, [-0.45, 0.06, 1.05], [0.42, 0.08, 0.13]);
  batch.add(BOX, '#e8cf7a', [-0.45, 0.1, 1.05], [0.36, 0.02, 0.08]);
  return { x: 0, z: 0.95, w: 1.6, d: 1.05 };
}

function well(batch) {
  batch.add(cyl(0.3, 0.33, 10), '#b8b0a0', [0, 0.17, 0], [1, 0.34, 1], null, true);
  batch.add(CYL10, '#a39b8c', [0, 0.36, 0], [0.33, 0.05, 0.33], null, true);
  batch.add(CYL10, '#3b7fae', [0, 0.37, 0], [0.25, 0.02, 0.25]);
  for (const x of [-0.28, 0.28]) batch.add(BOX, WOOD, [x, 0.62, 0], [0.06, 0.62, 0.06]);
  batch.add(CYL6, '#7a4f32', [0, 0.78, 0], [0.03, 0.62, 0.03], [0, 0, Math.PI / 2]);
  batch.add(GABLE, '#8a4b3a', [0, 0.93, 0], [0.78, 0.26, 0.56]);
  batch.add(BOX, '#d9c4a0', [0, 0.66, 0], [0.012, 0.24, 0.012]);
  batch.add(cyl(0.07, 0.055, 8), WOOD, [0, 0.5, 0], [1, 0.11, 1]);
}

/** A Vietnamese straw stack: a dome of rice straw round a pole. */
function haystack(batch, s = 1) {
  batch.add(new THREE.SphereGeometry(1, 9, 6), STRAW, [0, 0.28 * s, 0], [0.42 * s, 0.56 * s, 0.42 * s], null, true);
  batch.add(new THREE.ConeGeometry(1, 1, 9), '#d9b24a', [0, 0.9 * s, 0], [0.29 * s, 0.34 * s, 0.29 * s], null, true);
  batch.add(CYL6, '#7a4f32', [0, 1.1 * s, 0], [0.02, 0.36 * s, 0.02]);
}

function hayBale(batch) {
  batch.add(CYL16, '#e6c65e', [0, 0.2, 0], [0.2, 0.32, 0.2], [0, 0, Math.PI / 2]);
  for (const x of [-0.162, 0.162]) batch.add(CYL16, '#d4b04a', [x, 0.2, 0], [0.185, 0.01, 0.185], [0, 0, Math.PI / 2]);
}

function cart(batch) {
  batch.add(BOX, '#b07a48', [0, 0.3, 0], [0.7, 0.07, 0.44]);
  for (const z of [-0.2, 0.2]) batch.add(BOX, '#9a6638', [0, 0.4, z], [0.7, 0.14, 0.04]);
  for (const x of [-0.35, 0.35]) batch.add(BOX, '#9a6638', [x, 0.4, 0], [0.04, 0.14, 0.44]);
  for (const z of [-0.26, 0.26]) {
    batch.add(CYL16, '#6b4a2a', [0.02, 0.18, z], [0.18, 0.05, 0.18], [Math.PI / 2, 0, 0]);
    batch.add(CYL10, '#c9a06a', [0.02, 0.18, z * 1.12], [0.04, 0.04, 0.04], [Math.PI / 2, 0, 0]);
  }
  for (const z of [-0.15, 0.15]) batch.add(BOX, '#9a6638', [0.6, 0.26, z], [0.5, 0.035, 0.035], [0, 0, -0.18]);
  batch.add(new THREE.SphereGeometry(1, 8, 5), STRAW, [0, 0.45, 0], [0.32, 0.14, 0.19], null, true);
}

/** An arched plank bridge from bank to bank (world points a and b). */
function bridge(batch, a, b) {
  const dir = new THREE.Vector3().subVectors(b, a).setY(0);
  const len = dir.length() + 0.3;
  const mid = a.clone().add(b).multiplyScalar(0.5);
  batch.push(mid.x, 0, mid.z, Math.atan2(-dir.z, dir.x));
  const n = Math.round(len / 0.17);
  const arch = (x) => 0.1 + 0.3 * (1 - ((2 * x) / len) ** 2);
  const slope = (x) => Math.atan((0.3 * -8 * x) / (len * len));
  const tops = [];
  for (let i = 0; i < n; i++) {
    const x = -len / 2 + ((i + 0.5) * len) / n;
    batch.add(BOX, i % 2 ? PLANK : '#a8733f', [x, arch(x), 0], [len / n - 0.015, 0.05, 0.92], [0, 0, slope(x)]);
    for (const z of [-0.36, 0.36]) batch.add(BOX, '#7a4f32', [x, arch(x) - 0.06, z], [len / n + 0.01, 0.07, 0.07], [0, 0, slope(x)]);
    if (i % 3 === 0 || i === n - 1) tops.push([x, arch(x) + 0.32]);
  }
  for (const z of [-0.44, 0.44]) {
    tops.forEach(([x, y], k) => {
      batch.add(BOX, WOOD, [x, y - 0.15, z], [0.055, 0.32, 0.055]);
      if (k === 0) return;
      const [px, py] = tops[k - 1];
      batch.add(BOX, PLANK, [(x + px) / 2, (y + py) / 2, z], [Math.hypot(x - px, y - py) + 0.04, 0.045, 0.05], [0, 0, Math.atan2(y - py, x - px)]);
    });
  }
  for (const x of [-len / 2, len / 2]) batch.add(BOX, '#b5ad9e', [x, 0.04, 0], [0.42, 0.18, 1.04], null, true);
  batch.pop();
}

function signpost(batch) {
  batch.add(BOX, WOOD, [0, 0.36, 0], [0.06, 0.72, 0.06]);
  batch.add(BOX, '#e2bf8a', [0.14, 0.6, 0.04], [0.4, 0.14, 0.03]);
  batch.add(new THREE.ConeGeometry(1, 1, 3), '#e2bf8a', [0.38, 0.6, 0.04], [0.09, 0.1, 0.02], [0, 0, -Math.PI / 2]);
  batch.add(BOX, '#9a6638', [0.14, 0.6, 0.06], [0.24, 0.025, 0.01]);
}

/** A scarecrow in a conical palm-leaf hat. */
function scarecrow(batch) {
  batch.add(BOX, WOOD, [0, 0.45, 0], [0.05, 0.9, 0.05]);
  batch.add(BOX, '#e86a5a', [0, 0.56, 0], [0.24, 0.28, 0.13]);
  batch.add(BOX, '#e86a5a', [0, 0.64, 0], [0.56, 0.08, 0.08]);
  for (const x of [-0.3, 0.3]) batch.add(new THREE.ConeGeometry(1, 1, 5), STRAW, [x, 0.64, 0], [0.05, 0.1, 0.05], [0, 0, Math.sign(x) * -Math.PI / 2]);
  batch.add(BOX, '#5a7fb5', [0, 0.38, 0], [0.22, 0.1, 0.12]);
  batch.add(BALL, '#f2d8a6', [0, 0.8, 0], 0.09);
  batch.add(new THREE.ConeGeometry(1, 1, 14), '#ead49e', [0, 0.93, 0], [0.2, 0.13, 0.2]);
}

function bamboo(batch, rand, n = 9) {
  const up = new THREE.Vector3(0, 1, 0);
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  for (let k = 0; k < n; k++) {
    const a = (k / n) * TAU + rand();
    const r = 0.04 + rand() * 0.16;
    const h = 1.5 + rand() * 0.9;
    const tilt = 0.05 + rand() * 0.14;
    const d = new THREE.Vector3(Math.sin(tilt) * Math.cos(a), Math.cos(tilt), Math.sin(tilt) * Math.sin(a));
    e.setFromQuaternion(q.setFromUnitVectors(up, d));
    const base = new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r);
    const mid = base.clone().addScaledVector(d, h / 2);
    batch.add(cyl(0.028, 0.038, 5), k % 2 ? '#9bc24f' : '#86b043', [mid.x, mid.y, mid.z], [1, h, 1], [e.x, e.y, e.z], true);
    for (let j = 0; j < 3; j++) {
      const t = 0.55 + j * 0.17;
      const p = base.clone().addScaledVector(d, h * t);
      batch.add(ICO, j % 2 ? '#6dbb48' : '#5aa83f', [p.x + Math.cos(a) * 0.1, p.y, p.z + Math.sin(a) * 0.1], [0.2, 0.09, 0.2], [rand(), rand() * 3, rand()], true);
    }
  }
}

function banana(batch, rand) {
  batch.add(cyl(0.05, 0.07, 6), '#a3b65a', [0, 0.32, 0], [1, 0.64, 1], null, true);
  const leaf = new THREE.SphereGeometry(1, 6, 4);
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * TAU + rand() * 0.5;
    batch.push(0, 0.62, 0, -a);
    batch.add(leaf, k % 2 ? '#7ccf5a' : '#68bf4c', [0.3, 0.06, 0], [0.34, 0.025, 0.08], [0, 0, -0.45 - rand() * 0.3], true);
    batch.pop();
  }
  batch.add(new THREE.SphereGeometry(1, 6, 5), '#b9d14f', [0.08, 0.5, 0.04], [0.06, 0.1, 0.06], null, true);
}

// Tree models (see trees.js) and their heights.
const FRUIT_TREE = ['Type0 06', 1.2];
const PALMS = [['Type7 02', 2.1], ['Type7 03', 1.9]];
let fruitTreeGeometry = null;
let palmGeometries = null;

/** A round tree, turned `turn` from facing the camera, with seven fruits on the side the camera sees. */
function fruitTree(batch, fruit, rand, turn) {
  fruitTreeGeometry ||= treeGeometry(...FRUIT_TREE);
  batch.add(fruitTreeGeometry, null, [0, 0, 0], 1, null, true);
  // Unturned, a placed tree's +z side faces the camera.
  for (const [p, n] of leafSpots(...FRUIT_TREE, 7, rand, Math.PI / 2 + turn)) {
    batch.add(BALL, fruit, [p.x + n.x * 0.03, p.y + n.y * 0.03 - 0.02, p.z + n.z * 0.03], 0.055);
  }
}

/** A coconut palm; the two models take turns. */
function palm(batch, k) {
  palmGeometries ||= PALMS.map(([name, height]) => treeGeometry(name, height));
  batch.add(palmGeometries[k % palmGeometries.length], null, [0, 0, 0], 1, null, true);
}

/** Flowers and leafy plants along the front of the farmhouse, left of the porch, in the house's frame. */
function frontGarden(batch) {
  [['FLOWER_02_YellowCluster', -0.74, 0.4], ['PLANT_10_BroadleafPlant', -0.52, 0.3], ['FLOWER_05_RedWildflower', -0.3, 0.42], ['FLOWER_01_WhiteCluster', -0.08, 0.36]]
    .forEach(([name, x, s], k) => addNature(batch, name, [x, 0, 0.74 + (k % 2) * 0.07], s, k * 1.3));
  addNature(batch, 'PLANT_10_BroadleafPlant', [0.82, 0, 0.45], 0.28, 2);
}

/** A chopping stump with a log and a branch beside it, and a red toadstool. */
function woodpile(batch) {
  addNature(batch, 'TREE_14_Stump', [0, 0, 0], 0.24);
  addNature(batch, 'TREE_16_FallenLog', [0.36, 0, 0.26], 0.17, -0.5);
  addNature(batch, 'DETAIL_02_FallenBranch', [-0.3, 0, 0.28], 0.22, 2.3);
  addNature(batch, 'MUSH_01_RedSmall', [-0.24, 0, -0.08], 0.42);
}

/** Rice paddies: flooded plots with grassy dikes and rows of young rice. */
function paddies(batch, rand, cells) {
  for (const [x, z, w, d] of cells) {
    batch.add(BOX, '#77bfae', [x, 0.01, z], [w, 0.02, d]);
    for (const [px, pz, sw, sd] of [[x, z - d / 2, w + 0.14, 0.14], [x, z + d / 2, w + 0.14, 0.14], [x - w / 2, z, 0.14, d], [x + w / 2, z, 0.14, d]]) {
      batch.add(BOX, '#8cc65a', [px, 0.04, pz], [sw, 0.08, sd]);
    }
    for (let rz = z - d / 2 + 0.18; rz < z + d / 2 - 0.1; rz += 0.2) {
      batch.add(BOX, rand() < 0.5 ? '#9ee05c' : '#8fd655', [x, 0.06, rz], [w - 0.24, 0.1, 0.06]);
    }
  }
}

/** Stones from the nature pack (see nature.js), each about 2s across. Takes seven values from rand per stone. */
function rocksAround(batch, rand, center, n, spread, groundY) {
  for (let k = 0; k < n; k++) {
    const px = center.x + (rand() - 0.5) * spread;
    const pz = center.z + (rand() - 0.5) * spread;
    const s = 0.08 + rand() * 0.12;
    const name = rand() < 0.5 ? 'ROCK_01_Small' : 'ROCK_02_Medium';
    const tilt = [(rand() - 0.5) * 0.3, rand() * TAU, (rand() - 0.5) * 0.3];
    batch.add(natureModel(name), null, [px, groundY(px, pz) - 0.01, pz], (s * 2) / natureSize(name).width, tilt, true);
  }
}

/** Reeds along the river banks. */
function reeds(batch, rand, river, riverHalf, groundY, from, to, every) {
  const stalk = cyl(0.008, 0.012, 4);
  const head = new THREE.CapsuleGeometry(0.022, 0.08, 2, 5);
  for (let i = from; i < to; i += every) {
    const { p, dir } = river.frame(i);
    for (const s of [-1, 1]) {
      if (rand() < 0.4) continue;
      const off = s * (riverHalf(i) + 0.05 + rand() * 0.2);
      const x = p.x - dir.z * off;
      const z = p.z + dir.x * off;
      const y = Math.max(-0.08, groundY(x, z));
      for (let k = 0; k < 4; k++) {
        const h = 0.25 + rand() * 0.2;
        const px = x + (rand() - 0.5) * 0.14;
        const pz = z + (rand() - 0.5) * 0.14;
        batch.add(stalk, '#7fae4a', [px, y + h / 2, pz], [1, h, 1], [(rand() - 0.5) * 0.3, 0, (rand() - 0.5) * 0.3], true);
        if (k % 2 === 0) batch.add(head, '#8a5a3a', [px, y + h, pz], 1, null, true);
      }
    }
  }
}

function smokePuffs(origin) {
  const group = new THREE.Group();
  const puffs = [];
  for (let k = 0; k < 6; k++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: '#f4f1ea', transparent: true, depthWrite: false, opacity: 0 }));
    s.userData.phase = k / 6;
    group.add(s);
    puffs.push(s);
  }
  return {
    group,
    update(t) {
      for (const s of puffs) {
        const k = (t * 0.22 + s.userData.phase) % 1;
        s.position.set(origin.x + k * 0.35 + Math.sin(k * 6 + s.userData.phase * 9) * 0.06, origin.y + k * 1.3, origin.z - k * 0.12);
        s.scale.setScalar(0.18 + k * 0.5);
        s.material.opacity = Math.min(1, k * 6) * (1 - k) * 0.75;
      }
    },
  };
}

/**
 * Puts the farm buildings around the field.
 * map: { layout, at(u, b, y), groundY(x, z), rand, bridges: [[a, b]], river, riverHalf }
 * Returns the moving parts, the chicken yard (world centre, size, turn) and update(t, dt).
 */
export function addBuildings(batch, { layout: L, at, groundY, rand, bridges, river, riverHalf }) {
  const group = new THREE.Group();
  const toWorld = (v) => v.clone().applyMatrix4(batch.origin);
  const place = ([u, b, turn = 0], build) => {
    const p = at(u, b);
    batch.push(p.x, Math.max(0, groundY(p.x, p.z)), p.z, FACE + turn);
    const out = build();
    batch.pop();
    return out;
  };

  const smoke = smokePuffs(place(L.farmhouse, () => {
    const chimney = toWorld(farmhouse(batch));
    frontGarden(batch);
    return chimney;
  }));
  group.add(smoke.group);
  place(L.silo, () => silo(batch));
  place(L.cart, () => cart(batch));
  for (const spot of L.bales) place(spot, () => hayBale(batch));
  for (const [u, b, s] of L.haystacks) place([u, b, rand() * TAU], () => haystack(batch, s));
  place(L.scarecrow, () => scarecrow(batch));
  place(L.well, () => {
    well(batch);
    addNature(batch, 'PLANT_10_BroadleafPlant', [-0.48, 0, 0.05], 0.3, 0.8);
    addNature(batch, 'ROCK_01_Small', [0.42, 0, -0.18], 0.24, 2);
  });
  place(L.woodpile, () => woodpile(batch));
  // The buffalo's wallow, a sign where the road forks, and footpaths of stepping stones.
  place(L.mud, () => addNature(batch, 'GROUND_02_MudPatch', [0, 0, 0], 0.36, 0, { Mud: '#8d6a47', Dirt: '#b08a5e' }));
  place(L.sign, () => addNature(batch, 'PROP_04_DirectionSign', [0, 0, 0], 0.34));
  for (const path of L.footpaths) steppingStones(batch, path.map(([u, b]) => at(u, b)), groundY);

  const sails = place(L.windmill, () => {
    const blades = windmill(batch);
    const hub = new THREE.Group();
    batch.origin.clone().multiply(new THREE.Matrix4().makeTranslation(0, 1.62, 0.36)).decompose(hub.position, hub.quaternion, hub.scale);
    hub.add(blades);
    return hub;
  });
  group.add(sails);

  const coopYard = place(L.coop, () => {
    const yard = coop(batch);
    return { center: toWorld(new THREE.Vector3(yard.x, 0, yard.z)), w: yard.w, d: yard.d, turn: FACE + L.coop[2] };
  });

  for (const [u, b, fruit] of L.fruitTrees) {
    const turn = rand() * TAU;
    place([u, b, turn], () => fruitTree(batch, fruit, rand, turn));
  }
  for (const [u, b] of L.bananas) place([u, b, rand() * TAU], () => banana(batch, rand));
  for (const [u, b] of L.bamboo) place([u, b, 0], () => bamboo(batch, rand));
  L.palms.forEach((spot, k) => place(spot, () => palm(batch, k)));

  for (const [a, b] of bridges) bridge(batch, a, b);
  if (bridges.length) {
    // A signpost where the main road comes off the bridge into the farm.
    const [a, b] = bridges[0];
    const d = new THREE.Vector3().subVectors(b, a).setY(0).normalize();
    const p = b.clone().addScaledVector(d, 0.35).add(new THREE.Vector3(-d.z, 0, d.x).multiplyScalar(0.62));
    batch.push(p.x, 0, p.z, Math.atan2(-d.z, d.x) + Math.PI / 2);
    signpost(batch);
    batch.pop();
    // Lanterns either side of that end of the bridge, their lamps hanging over the road.
    const side = new THREE.Vector3(-d.z, 0, d.x);
    for (const s of [1, -1]) {
      const q = b.clone().addScaledVector(d, -0.05).addScaledVector(side, s * 0.6);
      addNature(batch, 'PROP_12_LanternPost', [q.x, 0, q.z], 0.32, Math.atan2(s * side.z, -s * side.x));
    }
  }

  paddies(batch, rand, L.paddies.map(([u, b]) => {
    const p = at(u, b);
    return [p.x, p.z, 1.9, 1.4];
  }));
  for (const [a, b, broken] of L.fences) railFence(batch, at(...a), at(...b), '#c98a4b', { height: 0.44, broken });

  rocksAround(batch, rand, at(6.3, -2.6), 5, 1.2, groundY);
  rocksAround(batch, rand, at(-1.6, -8.4), 6, 1.6, groundY);
  reeds(batch, rand, river, riverHalf, groundY, 30, river.pts.length - 40, 9);

  const update = (t, dt) => {
    sails.children[0].rotation.z -= dt * 0.9;
    smoke.update(t);
  };
  return { group, coopYard, update };
}
