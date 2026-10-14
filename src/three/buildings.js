// Farm buildings and everything else people made round the farm, merged into the countryside batch: the
// houses along the back of the ring road, the fields over the big bridge, the cows' meadow, the bridges,
// lamps and benches, and the stones and lily pads along the river. Only the windmill's sails and the
// chimney smoke move; they come back as their own objects.
import * as THREE from 'three';
import { Batch, shingleRoof } from './batch.js';
import { seeded } from '../util.js';
import { roundTree, fruitSpots, BLOSSOM } from './trees.js';
import { addNature, putNature, natureSize, railFence, steppingStones } from './nature.js';
import { streetLamp, buildGlow } from './farm.js';
import { PLACES, BRIDGES, MEADOW } from './valleyMap.js';
import { TAU, FACE, BOX, GABLE, BALL, ICO, cyl, CYL6, CYL10, CYL16, WOOD, PLANK, STRAW, FENCE, smokePuffs } from './buildings/parts.js';
import { farmhouse } from './buildings/farmhouse.js';
import { silo } from './buildings/silo.js';
import { windmill } from './buildings/windmill.js';
import { stoneShed } from './buildings/stoneShed.js';
import { henYard } from './buildings/coop.js';
import { well } from './buildings/well.js';
import { cart, hayBale, haystack } from './buildings/hay.js';
import { bridge as plankBridge } from './buildings/bridge.js';
import { woodFence } from './buildings/fence.js';
import { trough as waterTrough } from './buildings/trough.js';
import { fields as fieldBeds } from './buildings/fields.js';
import { landing } from './buildings/landing.js';
import { spray } from './buildings/spray.js';
import { BACKDROP, paintedPoint } from './backdrop.js';
import { flock } from './animals/chicken.js';
import { herd } from './animals/herd.js';
import { buffalo } from './animals/buffalo.js';
import { cow, COWS } from './animals/cow.js';
import { sheep } from './animals/sheep.js';
import { pig } from './animals/pig.js';
import { paddle } from './animals/duck.js';
import { wheel } from './animals/birds.js';

// A lily pad: a disc with a notch cut out.
const PAD = new THREE.CylinderGeometry(1, 1, 1, 12, 1, false, 0.35, TAU - 0.35);

// How much bigger than as modelled the buildings stand, now that they line the ring road.
const SIZE = { coop: 1.15, hutch: 0.8, fruitTree: 1.25 };

/** A hen house on legs; with `yard`, a little fenced run in front, whose middle and size it returns. */
function coop(batch, yard = true) {
  const wall = '#d9774a';
  for (const x of [-0.3, 0.3]) for (const z of [-0.22, 0.22]) batch.add(BOX, WOOD, [x, 0.12, z], [0.06, 0.24, 0.06]);
  batch.add(BOX, wall, [0, 0.46, 0], [0.72, 0.44, 0.56]);
  batch.add(GABLE, wall, [0, 0.68, 0], [0.72, 0.28, 0.56]);
  shingleRoof(batch, { y: 0.68, width: 0.86, depth: 0.72, rise: 0.28, tones: ['#7a4a2a', '#6b3f23', '#875632'], ridge: '#5e371f', rows: 4 });
  // weatherboards across the front
  for (let y = 0.29; y < 0.67; y += 0.065) batch.add(BOX, '#c4673f', [0, y, 0.282], [0.72, 0.012, 0.01]);
  batch.add(BOX, '#4a2a1a', [0.15, 0.36, 0.285], [0.16, 0.2, 0.02]);
  batch.add(BOX, '#ffe9a8', [-0.18, 0.52, 0.285], [0.13, 0.11, 0.02]);
  batch.add(BOX, PLANK, [0.15, 0.13, 0.47], [0.14, 0.02, 0.44], [0.55, 0, 0]);
  if (!yard) return null;
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

/** An arched plank bridge from bank to bank (world points a and b). */
function bridge(batch, a, b) {
  const dir = new THREE.Vector3().subVectors(b, a).setY(0);
  const len = dir.length() + 0.3;
  const mid = a.clone().add(b).multiplyScalar(0.5);
  // Level with the higher of the two banks' tops.
  const deck = Math.max(a.y, b.y);
  batch.push(mid.x, deck, mid.z, Math.atan2(-dir.z, dir.x));
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
  // Stone footings at either end, reaching down to the bank below.
  for (const [x, y] of [[-len / 2, a.y], [len / 2, b.y]]) {
    const foot = Math.min(0, y - deck) - 0.12;
    batch.add(BOX, '#b5ad9e', [x, (foot + 0.13) / 2, 0], [0.42, 0.13 - foot, 1.04], null, true);
  }
  batch.pop();
}

function signpost(batch) {
  batch.add(BOX, WOOD, [0, 0.36, 0], [0.06, 0.72, 0.06]);
  batch.add(BOX, '#e2bf8a', [0.14, 0.6, 0.04], [0.4, 0.14, 0.03]);
  batch.add(new THREE.ConeGeometry(1, 1, 3), '#e2bf8a', [0.38, 0.6, 0.04], [0.09, 0.1, 0.02], [0, 0, -Math.PI / 2]);
  batch.add(BOX, '#9a6638', [0.14, 0.6, 0.06], [0.24, 0.025, 0.01]);
}

/** A scarecrow in a straw hat. */
function scarecrow(batch) {
  batch.add(BOX, WOOD, [0, 0.45, 0], [0.05, 0.9, 0.05]);
  batch.add(BOX, '#e86a5a', [0, 0.56, 0], [0.24, 0.28, 0.13]);
  batch.add(BOX, '#e86a5a', [0, 0.64, 0], [0.56, 0.08, 0.08]);
  for (const x of [-0.3, 0.3]) batch.add(new THREE.ConeGeometry(1, 1, 5), STRAW, [x, 0.64, 0], [0.05, 0.1, 0.05], [0, 0, Math.sign(x) * -Math.PI / 2]);
  batch.add(BOX, '#5a7fb5', [0, 0.38, 0], [0.22, 0.1, 0.12]);
  batch.add(BALL, '#f2d8a6', [0, 0.8, 0], 0.09);
  batch.add(CYL16, '#ead49e', [0, 0.87, 0], [0.17, 0.015, 0.17]);
  batch.add(new THREE.ConeGeometry(1, 1, 14), '#ead49e', [0, 0.93, 0], [0.1, 0.12, 0.1]);
}

// Round trees (see trees.js) for the fruit trees, which take turns, and the cherry in blossom.
let fruitTrees = null;
let blossom = null;

/** Fruit tree k, turned `turn` from facing the camera, with seven fruits on the side the camera sees. */
function fruitTree(batch, k, fruit, rand, turn) {
  fruitTrees ||= [5, 6, 7].map((seed) => roundTree(seed, 1.2));
  const tree = fruitTrees[k % fruitTrees.length];
  batch.add(tree.geometry, null, [0, 0, 0], 1, null, false);
  // Unturned, a placed tree's +z side faces the camera.
  for (const [p, n] of fruitSpots(tree.puffs, 7, rand, Math.PI / 2 + turn)) {
    batch.add(BALL, fruit, [p.x + n.x * 0.03, p.y + n.y * 0.03 - 0.02, p.z + n.z * 0.03], 0.055);
  }
}

/** A cherry tree in pink blossom. */
function blossomTree(batch) {
  blossom ||= roundTree(2, 2.0, BLOSSOM);
  batch.add(blossom.geometry, null, [0, 0, 0], 1, null, false);
}

/** A chopping stump with a log and a branch beside it, and a red toadstool. */
function woodpile(batch) {
  addNature(batch, 'TREE_14_Stump', [0, 0, 0], 0.24);
  addNature(batch, 'TREE_16_FallenLog', [0.36, 0, 0.26], 0.17, -0.5);
  addNature(batch, 'DETAIL_02_FallenBranch', [-0.3, 0, 0.28], 0.22, 2.3);
  addNature(batch, 'MUSH_01_RedSmall', [-0.24, 0, -0.08], 0.42);
}

/** A wooden water trough. */
function trough(batch) {
  for (const x of [-0.25, 0.25]) batch.add(BOX, WOOD, [x, 0.05, 0], [0.06, 0.1, 0.24]);
  batch.add(BOX, PLANK, [0, 0.14, 0], [0.64, 0.09, 0.26]);
  batch.add(BOX, '#5cc6f6', [0, 0.19, 0], [0.56, 0.01, 0.18]);
  for (const z of [-0.11, 0.11]) batch.add(BOX, PLANK, [0, 0.21, z], [0.64, 0.06, 0.04]);
  for (const x of [-0.3, 0.3]) batch.add(BOX, PLANK, [x, 0.21, 0], [0.04, 0.06, 0.26]);
}

function sunflower(batch, rand, x, z) {
  const h = 0.6 + rand() * 0.25;
  batch.add(CYL6, '#5a9a3a', [x, h / 2, z], [0.014, h, 0.014]);
  for (const s of [-1, 1]) batch.add(ICO, '#6cb84a', [x + s * 0.06, h * (0.4 + s * 0.08), z], [0.08, 0.015, 0.035], [0, 0, s * 0.4], true);
  // The head, turned to the camera and tipped up a little.
  batch.push(x, h, z, FACE + (rand() - 0.5) * 0.6);
  batch.add(CYL10, '#ffc21f', [0, 0, 0], [0.12, 0.02, 0.12], [Math.PI / 2 - 0.3, 0, 0]);
  batch.add(CYL10, '#7a4a1f', [0, 0.005, 0.017], [0.06, 0.02, 0.06], [Math.PI / 2 - 0.3, 0, 0]);
  batch.pop();
}

/**
 * The fields over the bridge, in their own frame (sides along x and z, so they line up with the plots): beds of
 * wheat at the back, cabbages and greens either side and white flowers at the front, inside a rail fence open
 * towards the road, with a scarecrow at the back and sunflowers along the front right.
 */
function fields(batch, rand) {
  const bed = 1.5;
  const off = 0.95;
  const edge = 2.05;
  const jitter = (s) => (rand() - 0.5) * s;
  const beds = { wheat: [-off, -off], cabbage: [-off, off], greens: [off, -off], flowers: [off, off] };
  for (const [x, z] of Object.values(beds)) batch.add(BOX, '#8b5a3c', [x, 0.03, z], [bed, 0.06, bed]);
  // Calls plant(x, z) for an n × n grid over a bed.
  const grid = (name, n, plant) => {
    const [cx, cz] = beds[name];
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) plant(cx + ((i + 0.5) / n - 0.5) * (bed - 0.12), cz + ((j + 0.5) / n - 0.5) * (bed - 0.12));
  };
  // Ripe wheat, each stalk with its ear.
  grid('wheat', 11, (x, z) => {
    const h = 0.34 + rand() * 0.1;
    const px = x + jitter(0.04);
    const pz = z + jitter(0.04);
    const lean = [jitter(0.25), 0, jitter(0.25)];
    batch.add(BOX, '#d9b04a', [px, 0.06 + h / 2, pz], [0.018, h, 0.018], lean);
    batch.add(BOX, rand() < 0.5 ? '#f2cf5f' : '#e8c052', [px, 0.1 + h, pz], [0.04, 0.11, 0.04], lean);
  });
  // Cabbages: pale hearts in darker leaves.
  grid('cabbage', 4, (x, z) => {
    batch.add(ICO, '#5fb84a', [x, 0.12, z], [0.17, 0.08, 0.17], [0, rand() * 3, 0], true);
    batch.add(ICO, '#a8dc6e', [x, 0.17, z], 0.1, [rand(), rand(), 0], true);
  });
  grid('greens', 4, (x, z) => addNature(batch, 'PLANT_10_BroadleafPlant', [x, 0.05, z], 0.22 + rand() * 0.05, rand() * TAU));
  // White flowers: green clumps dotted with blooms.
  grid('flowers', 5, (x, z) => {
    batch.add(ICO, '#6cc152', [x, 0.1, z], [0.12, 0.07, 0.12], [0, rand() * 3, 0], true);
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * TAU + rand();
      batch.add(ICO, k % 3 ? '#ffffff' : '#fff3c4', [x + Math.cos(a) * 0.07, 0.17 + rand() * 0.03, z + Math.sin(a) * 0.07], 0.035, null, true);
    }
  });
  // The fence, with a gate in the side along the road (+z, the front left on screen).
  const v = (x, z) => new THREE.Vector3(x, 0, z);
  for (const [a, b] of [[v(-edge, -edge), v(edge, -edge)], [v(edge, -edge), v(edge, edge)], [v(edge, edge), v(0.45, edge)], [v(-0.45, edge), v(-edge, edge)], [v(-edge, edge), v(-edge, -edge)]]) {
    railFence(batch, a, b, FENCE, { height: 0.42 });
  }
  batch.push(0, 0, -edge + 0.3, FACE);
  scarecrow(batch);
  batch.pop();
  for (let z = -edge + 0.15; z < edge; z += 0.38) sunflower(batch, rand, edge + 0.3 + jitter(0.1), z);
}

/** A rail fence round the meadow's corners (world points), with a gate in the middle of the first side. */
function meadowFence(batch, corners) {
  corners.forEach((p, i) => {
    const q = corners[(i + 1) % corners.length];
    if (i > 0) {
      railFence(batch, p, q, FENCE, { height: 0.44, broken: i === 2 ? [2] : [] });
      return;
    }
    const mid = p.clone().lerp(q, 0.5);
    const half = q.clone().sub(p).setY(0).normalize().multiplyScalar(0.45);
    railFence(batch, p, mid.clone().sub(half), FENCE, { height: 0.44 });
    railFence(batch, mid.clone().add(half), q, FENCE, { height: 0.44 });
  });
}

/** Stones from the nature pack (see nature.js), each about 2s across. Takes seven values from rand per stone. */
function rocksAround(batch, rand, center, n, spread, groundY) {
  for (let k = 0; k < n; k++) {
    const px = center.x + (rand() - 0.5) * spread;
    const pz = center.z + (rand() - 0.5) * spread;
    const s = 0.08 + rand() * 0.12;
    const name = rand() < 0.5 ? 'ROCK_01_Small' : 'ROCK_02_Medium';
    const tilt = [(rand() - 0.5) * 0.3, rand() * TAU, (rand() - 0.5) * 0.3];
    putNature(batch, name, [px, groundY(px, pz) - 0.01, pz], (s * 2) / natureSize(name).width, tilt);
  }
}

// Points along the river that are in view and clear of the bridges.
const riverStretch = (river, bridges, from, every) => {
  const out = [];
  for (let i = from; i < river.pts.length; i += every) {
    const p = river.pts[i];
    if ((p.x - p.z) * Math.SQRT1_2 < -17) continue;
    if (bridges.some(([a, b]) => p.distanceTo(a.clone().lerp(b, 0.5)) < 1.2)) continue;
    out.push(i);
  }
  return out;
};

/** Grey boulders along both banks of the river, half in the water. */
function riverRocks(batch, rand, { river, riverHalf, groundY, bridges, waterY }) {
  const names = ['ROCK_03_BoulderLarge', 'ROCK_05_BoulderFlat', 'ROCK_06_BoulderMossy', 'ROCK_01_Small', 'ROCK_03_BoulderLarge'];
  for (const i of riverStretch(river, bridges, 20, 3)) {
    const { p, dir } = river.frame(i);
    for (const s of [-1, 1]) {
      // Most stretches of bank have a boulder, some a smaller stone beside it.
      for (let n = rand() < 0.3 ? 0 : rand() < 0.6 ? 1 : 2; n > 0; n--) {
        const off = s * (riverHalf(i) - 0.08 + rand() * 0.3);
        const x = p.x - dir.z * off + (rand() - 0.5) * 0.2;
        const z = p.z + dir.x * off + (rand() - 0.5) * 0.2;
        const name = names[Math.floor(rand() * names.length)];
        const size = n === 2 ? 0.08 + rand() * 0.07 : 0.14 + rand() * 0.2;
        putNature(batch, name, [x, Math.max(groundY(x, z), waterY - 0.06) - 0.04, z], (size * 2) / natureSize(name).width, [(rand() - 0.5) * 0.3, rand() * TAU, (rand() - 0.5) * 0.3]);
      }
    }
  }
}

/** Lily pads in the still water by the banks, some in flower. */
function lilyPads(batch, rand, { river, riverHalf, bridges, waterY }) {
  for (const i of riverStretch(river, bridges, 4, 10)) {
    if (rand() < 0.55) continue;
    const { p, dir } = river.frame(i);
    const off = (rand() < 0.5 ? -1 : 1) * (riverHalf(i) - 0.2 - rand() * 0.12);
    for (let k = 0; k < 3; k++) {
      const x = p.x - dir.z * off + (rand() - 0.5) * 0.3;
      const z = p.z + dir.x * off + (rand() - 0.5) * 0.3;
      const r = 0.06 + rand() * 0.05;
      batch.add(PAD, k % 2 ? '#5cb85a' : '#4fae52', [x, waterY + 0.012, z], [r, 0.01, r], [0, rand() * TAU, 0], true);
      if (k === 0 && rand() < 0.6) batch.add(ICO, '#ff9cc8', [x, waterY + 0.035, z], [0.035, 0.025, 0.035], [0, rand(), 0], true);
    }
  }
}

/** Reeds along the river banks, standing in the shallows or on the bank. */
function reeds(batch, rand, river, riverHalf, groundY, waterY, from, to, every) {
  const stalk = cyl(0.008, 0.012, 4);
  const head = new THREE.CapsuleGeometry(0.022, 0.08, 2, 5);
  for (let i = from; i < to; i += every) {
    const { p, dir } = river.frame(i);
    for (const s of [-1, 1]) {
      if (rand() < 0.4) continue;
      const off = s * (riverHalf(i) + 0.05 + rand() * 0.2);
      const x = p.x - dir.z * off;
      const z = p.z + dir.x * off;
      const y = Math.max(waterY, groundY(x, z));
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

/**
 * Puts the farm buildings round the ring road and the rest of what people made about the valley.
 * map: { layout, at(u, b, y), groundY(x, z), rand, bridges: [[a, b]], river, riverHalf, waterY }
 * Returns the moving parts, the chicken yard (world centre, size, turn) and update(t, dt).
 */
export function addBuildings(batch, { layout: L, at, groundY, rand, bridges, river, riverHalf, waterY, riverRocks: withRocks = true }) {
  const group = new THREE.Group();
  const glow = new Batch();
  const toWorld = (v) => v.clone().applyMatrix4(batch.origin);
  const place = ([u, b, turn = 0], build, size = 1) => {
    const p = at(u, b);
    batch.push(p.x, Math.max(0, groundY(p.x, p.z)), p.z, FACE + turn, size);
    const out = build();
    batch.pop();
    return out;
  };

  const smoke = smokePuffs(place(L.farmhouse, () => farmhouse(batch)));
  group.add(smoke.group);
  group.add(place(L.silo, () => silo(batch)));
  group.add(place(L.cart, () => cart(batch)));
  for (const spot of L.bales) group.add(place(spot, () => hayBale(batch)));
  for (const [u, b] of L.haystacks) group.add(place([u, b, rand() * TAU], () => haystack(batch)));
  group.add(place(L.well, () => well(batch)).group);
  place([...L.cherry, 0], () => blossomTree(batch));
  place(L.woodpile, () => woodpile(batch));
  // The buffalo's wallow, a sign where the road to the waterfall leaves the ring, and footpaths of stepping stones.
  place(L.mud, () => addNature(batch, 'GROUND_02_MudPatch', [0, 0, 0], 0.36, 0, { Mud: '#8d6a47', Dirt: '#b08a5e' }));
  place(L.sign, () => addNature(batch, 'PROP_04_DirectionSign', [0, 0, 0], 0.34));
  for (const path of L.footpaths) steppingStones(batch, path.map(([u, b]) => at(u, b)), groundY);
  for (const spot of L.benches) place(spot, () => addNature(batch, 'PROP_10_WoodenBench', [0, 0, 0], 0.36));

  const sails = place(L.windmill, () => windmill(batch));
  group.add(sails);

  const coopYard = place(L.coop, () => {
    const yard = coop(batch);
    return { center: toWorld(new THREE.Vector3(yard.x, 0, yard.z)), w: yard.w * SIZE.coop, d: yard.d * SIZE.coop, turn: FACE + L.coop[2] };
  }, SIZE.coop);
  place(L.hutch, () => coop(batch, false), SIZE.hutch);

  L.fruitTrees.forEach(([u, b, fruit], k) => {
    const turn = rand() * TAU;
    place([u, b, turn], () => fruitTree(batch, k, fruit, rand, turn), SIZE.fruitTree);
  });

  for (const [a, b] of bridges) bridge(batch, a, b);
  if (bridges.length) {
    // A signpost where the road comes off the big bridge by the fields, and a lamp either side of its farm end.
    const [a, b] = bridges[0];
    const d = new THREE.Vector3().subVectors(b, a).setY(0).normalize();
    const side = new THREE.Vector3(-d.z, 0, d.x);
    const p = b.clone().addScaledVector(d, 0.35).addScaledVector(side, 0.62);
    batch.push(p.x, 0, p.z, Math.atan2(-d.z, d.x) + Math.PI / 2);
    signpost(batch);
    batch.pop();
    for (const s of [1, -1]) streetLamp(batch, glow, a.clone().addScaledVector(d, 0.1).addScaledVector(side, s * 0.62).setY(0));
  }

  const fc = at(...L.fields);
  batch.push(fc.x, Math.max(0, groundY(fc.x, fc.z)), fc.z);
  fields(batch, rand);
  batch.pop();

  meadowFence(batch, L.meadow.map(([u, b]) => at(u, b)));
  place(L.trough, () => trough(batch));

  if (withRocks) {
    rocksAround(batch, rand, at(L.mud[0] + 0.5, L.mud[1] - 0.6), 5, 1.2, groundY);
    riverRocks(batch, rand, { river, riverHalf, groundY, bridges, waterY });
    lilyPads(batch, rand, { river, riverHalf, bridges, waterY });
  }
  if (withRocks) reeds(batch, rand, river, riverHalf, groundY, waterY, 30, river.pts.length - 40, 9);
  group.add(buildGlow(glow));

  const update = (t, dt) => {
    sails.children[0].rotation.z -= dt * 0.9;
    smoke.update(t);
  };
  return { group, coopYard, update };
}

/**
 * The buildings redone for the painted valley, each on its pad in the painting (PLACES in valleyMap.js), and the
 * animals that live in them. They join one at a time as each is redone (docs/redesign.md); until then addBuildings
 * keeps the old ones for the 3D valley. at(u, b) is the map's point in the world. Returns the group and
 * update(t, dt).
 */
export function placeBuildings({ at }) {
  const batch = new Batch();
  const place = ({ at: [u, b], turn = 0 }, build) => {
    const p = at(u, b);
    batch.push(p.x, 0, p.z, FACE + turn);
    const out = build();
    batch.pop();
    return out;
  };
  const smoke = smokePuffs(place(PLACES.farmhouse, () => farmhouse(batch)));
  const siloParts = place(PLACES.silo, () => silo(batch));
  const sails = place(PLACES.windmill, () => windmill(batch));
  place(PLACES.stoneShed, () => stoneShed(batch));
  const hens = flock(place(PLACES.henYard, () => henYard(batch)), PLACES.henYard.hens);
  const wellParts = place(PLACES.well, () => well(batch));
  const hay = [place(PLACES.cart, () => cart(batch)), place(PLACES.bale, () => hayBale(batch)), place(PLACES.haystack, () => haystack(batch))];
  // The meadow's fence on the painted meadow's edge, with a gate onto the road, and its water trough.
  woodFence(batch, MEADOW.map(([u, b]) => [at(u, b).x, at(u, b).z]), seeded(71), { closed: true, gates: PLACES.meadow.gates });
  const water = place(PLACES.trough, () => waterTrough(batch, seeded(29)));
  // The fields over the big bridge on their painted pad, square to the plots.
  const fieldsAt = at(...PLACES.fields.at);
  batch.push(fieldsAt.x, 0, fieldsAt.z);
  const crops = fieldBeds(batch, seeded(41), PLACES.fields.half);
  batch.pop();
  // The landing at the end of the riverside road, turned to run out over the river, and the boat tied up at it.
  const jetty = (() => {
    const { ends, width, side } = PLACES.landing;
    const [a, b] = ends.map(([u, v]) => at(u, v));
    const dir = b.clone().sub(a);
    const mid = a.clone().add(b).multiplyScalar(0.5);
    batch.push(mid.x, 0, mid.z, Math.atan2(-dir.z, dir.x));
    const out = landing(batch, seeded(53), { span: dir.length(), width, side });
    batch.pop();
    return out;
  })();
  // The buffalo and her calf by the river, grazing and wandering about their patch of grass.
  const buffaloes = herd(PLACES.buffalo.area.map(([u, b]) => at(u, b)), ['buffalo', 'calf'].map((name) => {
    const { at: [u, b], turn } = PLACES[name];
    const p = at(u, b);
    return { name, x: p.x, z: p.z, heading: FACE + turn };
  }), buffalo);
  // The cows and the sheep in the meadow, grazing and wandering about it, all in one herd so they keep out of each
  // other's way.
  const meadow = herd(PLACES.meadow.area.map(([u, b]) => at(u, b)), PLACES.meadow.herd.map(({ name, at: [u, b], turn }) => {
    const p = at(u, b);
    return { name, x: p.x, z: p.z, heading: FACE + turn };
  }), (name, phase) => (name in COWS ? cow : sheep)(name, phase));
  // The pig rooting about the grass behind the plots.
  const pigs = herd(PLACES.pig.area.map(([u, b]) => at(u, b)), [PLACES.pig].map(({ at: [u, b], turn }) => {
    const p = at(u, b);
    return { name: 'pig', x: p.x, z: p.z, heading: FACE + turn };
  }), pig);
  // Two brown hens pecking about the grass on the pig's right.
  const lawnHens = flock(PLACES.lawnHens.area.map(([u, b]) => at(u, b)), PLACES.lawnHens.hens);
  // The mother duck and her ducklings on the river above the big bridge.
  const ducks = paddle(PLACES.ducks.way.map(([u, b]) => at(u, b)), PLACES.ducks.half, ['duck', ...Array(5).fill('duckling')]);
  // Swallows wheeling over the hills behind the farm.
  const birds = wheel(at(...PLACES.birds.at, PLACES.birds.height), ['swallow', 'swallow', 'swallow']);
  // The bridges, each turned to run between its ends: the big one with a lamp at its farm end, the small one with
  // lanterns on its corners.
  const glow = new Batch();
  for (const [name, { ends, arch, width }] of Object.entries(BRIDGES)) {
    const [a, b] = ends.map(([u, v]) => at(u, v));
    const dir = b.clone().sub(a);
    const mid = a.clone().add(b).multiplyScalar(0.5);
    batch.push(mid.x, 0, mid.z, Math.atan2(-dir.z, dir.x));
    plankBridge(batch, glow, { span: dir.length(), width, arch, lamp: name === 'main', lanterns: name === 'small' });
    batch.pop();
  }
  // Spray thrown up along the small fall's lip, where the water rolls over, heading down and to the left on screen
  // as the water does, and a little mist over it.
  const lipSpray = (() => {
    const [[x0, y0], [x1, y1]] = BACKDROP.falls[1].lip;
    const line = [paintedPoint(x0 + 1, y0 + 0.7), paintedPoint(x1 - 1.5, y1 - 1)];
    const outward = new THREE.Vector3(0.6, 0, 1.4).normalize();
    const drops = spray(line, { count: 45, up: [0.22, 0.42], out: [0.06, 0.16], outward, spread: 0.03, gravity: 2.0, life: [0.45, 0.7], size: [0.035, 0.075], strength: 0.75, seed: 3 });
    const mist = spray(line, { count: 8, up: [0.04, 0.1], out: [0.02, 0.05], outward, gravity: 0.1, life: [1.4, 2.2], size: [0.12, 0.26], strength: 0.2, seed: 5 });
    const group = new THREE.Group();
    group.add(drops.group, mist.group);
    return { group, update: (t, dt) => (drops.update(t, dt), mist.update(t, dt)) };
  })();
  const group = new THREE.Group();
  group.add(lipSpray.group, batch.build(), buildGlow(glow), smoke.group, siloParts, sails, hens.group, wellParts.group, ...hay, water, crops.group, jetty.group, buffaloes.group, meadow.group, pigs.group, lawnHens.group, ducks.group, birds.group);
  const update = (t, dt) => {
    smoke.update(t);
    sails.children[0].rotation.z = -t * 0.9;
    hens.update(t, dt);
    buffaloes.update(t, dt);
    meadow.update(t, dt);
    pigs.update(t, dt);
    lawnHens.update(t, dt);
    ducks.update(t, dt);
    birds.update(t, dt);
    crops.update(t);
    jetty.update(t);
    lipSpray.update(t, dt);
    wellParts.update(t);
  };
  return { group, update };
}
