// The valley around the farm: rolling grass, dirt roads, a river with a waterfall and a bridge,
// farm buildings, forests and mountains. It is built once; only the farm in the middle (plots,
// barn, fences, pond) is rebuilt when visiting a neighbour.
import * as THREE from 'three';
import { Batch } from './batch.js';
import { cloud, FARM_CLEAR } from './farm.js';
import { addBuildings } from './buildings.js';
import { addAnimals } from './animals.js';
import { glowTexture } from './textures.js';
import { treeGeometry, treeSize } from './trees.js';
import { natureModel } from './nature.js';
import { seeded } from '../util.js';

const S = Math.SQRT1_2;
const TAU = Math.PI * 2;

/**
 * Map position → world [x, z]. The camera looks from +x +z, so u runs left to right on screen
 * and b from the front (bottom of the screen) to the back (top).
 */
export const xz = (u, b) => [(u - b) * S, -(u + b) * S];
export const at = (u, b, y = 0) => {
  const [x, z] = xz(u, b);
  return new THREE.Vector3(x, y, z);
};
const toUB = (x, z) => [(x - z) * S, -(x + z) * S];

/** How far the player can look around, in screen units: u across, up the screen. */
export const VIEW_BOUNDS = { left: -16, right: 16, bottom: -13, top: 16 };

function hash(x, z) {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
function noise(x, z) {
  const xi = Math.floor(x);
  const zi = Math.floor(z);
  const xf = x - xi;
  const zf = z - zi;
  const u = xf * xf * (3 - 2 * xf);
  const v = zf * zf * (3 - 2 * zf);
  const a = hash(xi, zi);
  const b = hash(xi + 1, zi);
  const c = hash(xi, zi + 1);
  const d = hash(xi + 1, zi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
const fbm = (x, z) => noise(x, z) * 0.6 + noise(x * 2.03 + 5.2, z * 2.03 + 1.3) * 0.28 + noise(x * 4.1 + 9.1, z * 4.1 + 3.7) * 0.12;
const smooth = (e0, e1, x) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

// ── The map ─────────────────────────────────────────────────────
// Everything is placed in (u, b) map units. The plots are the diamond |u| + |b| < 3.7 and the
// old island's grass around them (barn, pond, fences) reaches |u| + |b| = 5.9.

// From the waterfall at the foot of the mountains, down the right side and away to the left.
const RIVER = [
  [7.6, 9.9], [7.3, 8.2], [8.6, 6.0], [9.6, 3.2], [9.2, 0.4], [7.9, -1.9], [5.7, -4.1], [2.7, -5.9],
  [-0.8, -7.3], [-4.4, -8.2], [-7.6, -10.0], [-10.4, -12.6], [-13.5, -15.5], [-17, -18], [-24, -21], [-34, -24],
];
const RIVER_HALF = 0.62;

const ROADS = [
  // The main road: from the rice paddies over the bridge, round the back of the farm and out to the left.
  [[11.5, -13], [9.2, -9.6], [7.2, -7.2], [5.4, -5.8], [4.2, -5.0], [3.2, -4.1], [3.7, -2.6], [5.4, -1.2], [5.8, 0.8],
    [4.2, 2.6], [2.4, 4.4], [0.3, 6.3], [-1.6, 5.4], [-3.5, 3.6], [-5.0, 1.8], [-6.0, -0.6], [-6.2, -2.8], [-7.8, -5.6],
    [-10.0, -8.6], [-12.3, -11.8], [-15, -16]],
  // Up the valley towards the waterfall.
  [[5.8, 0.8], [7.2, 3.0], [6.9, 5.6], [5.8, 7.6], [4.6, 9.4], [4.1, 11.2]],
];

/** Where things stand: [u, b, turn]. Turns are added to the face-the-camera angle. */
export const LAYOUT = {
  farmhouse: [-6.0, 3.5, 0.32],
  silo: [2.9, 5.4, 0],
  windmill: [5.7, 3.4, -0.25],
  coop: [-3.4, 6.0, 0.1],
  well: [-5.6, -4.2, 0.6],
  cart: [-1.8, 6.6, 0.9],
  scarecrow: [-4.1, 1.2, 0.2],
  buffalo: [5.7, -2.7, -1.2],
  cows: [[-10.0, -2.6, 2.2], [-11.2, -0.6, 0.6]],
  bales: [[1.9, 6.6, -0.2], [1.4, 6.2, 0.5]],
  haystacks: [[-7.4, 1.4, 1], [-8.2, 2.5, 0.85], [4.6, 5.6, 0.9]],
  fruitTrees: [[-4.2, -3.4, '#ff6b5a'], [-5.2, -2.5, '#ffa53a'], [-3.4, -4.5, '#ff6b5a'], [-6.4, -1.4, '#ffd23f']],
  bananas: [[-7.4, 3.0], [-6.9, 4.9], [-4.6, 4.6]],
  bamboo: [[-9.0, 4.8], [-9.6, 1.0], [10.6, 5.0], [-8.4, -6.8], [3.0, -8.4]],
  palms: [[9.6, -2.6, 0.3], [11.0, -4.0, 2.2], [10.1, -3.6, 4.0], [-4.8, -7.0, 1.1], [1.4, -8.3, 5.0]],
  paddies: [[8.6, -4.3], [10.4, -6.2], [6.2, -9.4], [7.6, -11.6], [11.6, -8.9]],
  // A chopping stump by the farmhouse, the buffalo's mud wallow and a sign where the road forks.
  woodpile: [-7.0, 2.3, 0.4],
  mud: [5.5, -2.5, 0.3],
  sign: [6.6, 0.4, -0.3],
  // Stepping stones from the farmhouse porch and from the well to the road.
  footpaths: [[[-5.37, 2.52], [-5.15, 2.36]], [[-6.05, -3.98], [-6.24, -3.88]]],
  // [from, to, sections with a fallen rail]
  fences: [[[-7.2, -4.6], [-9.0, -2.4]], [[-9.0, -2.4], [-10.6, 0.6], [1]], [[7.7, 1.4], [8.0, 4.4]]],
};

/** Open ground the forest keeps clear of, and that stays flat: [u, b, radius]. */
const CLEARINGS = [
  [0, 4.7, 1.4], // barn
  [LAYOUT.farmhouse[0], LAYOUT.farmhouse[1], 1.6],
  [LAYOUT.silo[0], LAYOUT.silo[1], 0.9],
  [LAYOUT.windmill[0], LAYOUT.windmill[1], 1.3],
  [LAYOUT.coop[0], LAYOUT.coop[1] - 0.4, 1.5],
  [LAYOUT.well[0], LAYOUT.well[1], 0.8],
  [LAYOUT.cart[0], LAYOUT.cart[1], 0.7],
  [LAYOUT.buffalo[0], LAYOUT.buffalo[1], 0.8],
  ...LAYOUT.cows.map(([u, b]) => [u, b, 0.8]),
  [RIVER[0][0], RIVER[0][1], 1.8], // waterfall pool
  ...LAYOUT.paddies.map(([u, b]) => [u, b, 1.5]),
  ...LAYOUT.haystacks.map(([u, b]) => [u, b, 0.7]),
  ...LAYOUT.fruitTrees.map(([u, b]) => [u, b, 0.7]),
  ...LAYOUT.bananas.map(([u, b]) => [u, b, 0.6]),
  ...LAYOUT.bamboo.map(([u, b]) => [u, b, 0.8]),
  ...LAYOUT.palms.map(([u, b]) => [u, b, 0.6]),
];

/** How far outside the open farmland a point is (negative inside). */
function farmEdge(u, b) {
  const qx = Math.abs(u) - 9.5;
  const qz = Math.abs(b + 1.2) - 5.2;
  const out = Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0) - 3.6;
  return out + (noise(u * 0.32 + 4, b * 0.32 + 9) - 0.5) * 2.4;
}

// ── Paths ───────────────────────────────────────────────────────

class Path {
  constructor(points, step = 0.15) {
    this.curve = new THREE.CatmullRomCurve3(points.map(([u, b]) => at(u, b)), false, 'centripetal');
    this.length = this.curve.getLength();
    this.pts = this.curve.getSpacedPoints(Math.ceil(this.length / step));
    this.step = this.length / (this.pts.length - 1);
    this.cell = 3;
    this.grid = new Map();
    this.pts.forEach((p, i) => {
      const k = this.key(Math.floor(p.x / this.cell), Math.floor(p.z / this.cell));
      if (!this.grid.has(k)) this.grid.set(k, []);
      this.grid.get(k).push(i);
    });
  }

  key(cx, cz) {
    return cx * 10007 + cz;
  }

  /** Nearest sample to (x, z): { d, i }. Exact up to 3 units away; farther returns d = Infinity. */
  nearest(x, z) {
    let best = Infinity;
    let bi = -1;
    const cx = Math.floor(x / this.cell);
    const cz = Math.floor(z / this.cell);
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        const list = this.grid.get(this.key(cx + i, cz + j));
        if (!list) continue;
        for (const k of list) {
          const p = this.pts[k];
          const d = (p.x - x) ** 2 + (p.z - z) ** 2;
          if (d < best) {
            best = d;
            bi = k;
          }
        }
      }
    }
    return { d: Math.sqrt(best), i: bi };
  }

  /** Point and flat unit direction at sample i. */
  frame(i) {
    const a = this.pts[Math.max(0, i - 1)];
    const b = this.pts[Math.min(this.pts.length - 1, i + 1)];
    return { p: this.pts[i], dir: new THREE.Vector3().subVectors(b, a).setY(0).normalize() };
  }
}

const river = new Path(RIVER);
// Wider at the waterfall's pool.
const riverHalf = (i) => RIVER_HALF + 0.55 * smooth(14, 0, i) + 0.08 * Math.sin(i * 0.05);
const roads = ROADS.map((pts) => new Path(pts, 0.2));

// ── Ground ──────────────────────────────────────────────────────

const GRID = { u0: -23, u1: 23, b0: -30, b1: 12.6, step: 0.33 };
const NU = Math.round((GRID.u1 - GRID.u0) / GRID.step) + 1;
const NB = Math.round((GRID.b1 - GRID.b0) / GRID.step) + 1;
const WATER_Y = -0.08;

/** Height of the land before the river is cut in. */
function landHeight(u, b) {
  const out = farmEdge(u, b);
  let h = out > 0 ? smooth(0, 6, out) * (0.25 + 1.3 * fbm(u * 0.15 + 3, b * 0.15 + 7)) : 0;
  h += smooth(7.4, 11.8, b) * (1.6 + 1.2 * fbm(u * 0.2, b * 0.2));
  for (const [cu, cb, r] of CLEARINGS) {
    const d = Math.abs(u - cu) + Math.abs(b - cb);
    if (d < r + 2.5) h *= smooth(r, r + 2.5, Math.hypot(u - cu, b - cb));
  }
  return h;
}

/** Cuts the river's bed and banks into the land. */
function cutRiver(h, x, z) {
  const { d, i } = river.nearest(x, z);
  if (d === Infinity) return { h, wet: 0 };
  const w = riverHalf(i);
  const bank = -0.3 + 0.75 * Math.max(0, d - (w - 0.3)) ** 1.15;
  return { h: Math.min(h, bank), wet: smooth(w + 0.3, w - 0.2, d) };
}

const heights = new Float32Array(NU * NB);
const wetness = new Float32Array(NU * NB);
for (let j = 0; j < NB; j++) {
  for (let i = 0; i < NU; i++) {
    const u = GRID.u0 + i * GRID.step;
    const b = GRID.b0 + j * GRID.step;
    const [x, z] = xz(u, b);
    const r = cutRiver(landHeight(u, b), x, z);
    heights[j * NU + i] = r.h;
    wetness[j * NU + i] = r.wet;
  }
}

/** Height of the drawn ground at world (x, z), matching its triangles exactly. */
export function groundY(x, z) {
  const [u, b] = toUB(x, z);
  const fu = Math.min(NU - 1.001, Math.max(0, (u - GRID.u0) / GRID.step));
  const fb = Math.min(NB - 1.001, Math.max(0, (b - GRID.b0) / GRID.step));
  const i = Math.floor(fu);
  const j = Math.floor(fb);
  const tu = fu - i;
  const tb = fb - j;
  const h = (a, c) => heights[(j + c) * NU + i + a];
  if (tu + tb <= 1) return h(0, 0) + (h(1, 0) - h(0, 0)) * tu + (h(0, 1) - h(0, 0)) * tb;
  return h(1, 1) + (h(0, 1) - h(1, 1)) * (1 - tu) + (h(1, 0) - h(1, 1)) * (1 - tb);
}

/** Builds the ground, darkened in [x, z, radius] spots under the trees. */
function buildGround(shadeSpots) {
  const pos = new Float32Array(NU * NB * 3);
  const col = new Float32Array(NU * NB * 3);
  const shade = new Float32Array(NU * NB);
  for (const [x, z, r] of shadeSpots) {
    // Shadows fall a little to the left of each tree, away from the sun.
    const [u, b] = toUB(x - r * 0.3, z + r * 0.1);
    const i0 = Math.max(0, Math.floor((u - r - GRID.u0) / GRID.step));
    const i1 = Math.min(NU - 1, Math.ceil((u + r - GRID.u0) / GRID.step));
    const j0 = Math.max(0, Math.floor((b - r - GRID.b0) / GRID.step));
    const j1 = Math.min(NB - 1, Math.ceil((b + r - GRID.b0) / GRID.step));
    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) {
        const d = Math.hypot(GRID.u0 + i * GRID.step - u, GRID.b0 + j * GRID.step - b);
        shade[j * NU + i] = Math.max(shade[j * NU + i], smooth(r, r * 0.35, d));
      }
    }
  }
  const light = new THREE.Color('#93da68');
  const deep = new THREE.Color('#79c759');
  const hill = new THREE.Color('#62ad4a');
  const sand = new THREE.Color('#e3c98f');
  const mud = new THREE.Color('#a98d5f');
  const under = new THREE.Color('#4f9440');
  const c = new THREE.Color();
  for (let j = 0; j < NB; j++) {
    for (let i = 0; i < NU; i++) {
      const k = j * NU + i;
      const u = GRID.u0 + i * GRID.step;
      const b = GRID.b0 + j * GRID.step;
      const [x, z] = xz(u, b);
      const h = heights[k];
      pos[k * 3] = x;
      pos[k * 3 + 1] = h;
      pos[k * 3 + 2] = z;
      c.copy(light).lerp(deep, smooth(0.35, 0.75, fbm(u * 0.22 + 11, b * 0.22 + 2)));
      c.lerp(hill, smooth(0.2, 2.2, h) * 0.8);
      c.lerp(under, shade[k] * 0.5);
      c.lerp(sand, Math.max(wetness[k] * 0.9, smooth(0.0, -0.06, h)));
      c.lerp(mud, smooth(-0.1, -0.26, h));
      col[k * 3] = c.r;
      col[k * 3 + 1] = c.g;
      col[k * 3 + 2] = c.b;
    }
  }
  const index = [];
  for (let j = 0; j < NB - 1; j++) {
    for (let i = 0; i < NU - 1; i++) {
      const a = j * NU + i;
      index.push(a, a + 1, a + NU, a + 1, a + NU + 1, a + NU);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setIndex(index);
  g.computeVertexNormals();
  // Smooth: flat facets on the gentle slopes would show as a chequerboard.
  const mesh = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }));
  mesh.receiveShadow = true;
  return mesh;
}

// ── Water ───────────────────────────────────────────────────────

/** A repeating canvas texture, drawn at twice the size of the w × h layout so it stays sharp on Retina screens. */
function streakTexture(w, h, base, draw) {
  const c = document.createElement('canvas');
  c.width = w * 2;
  c.height = h * 2;
  const g = c.getContext('2d');
  g.scale(2, 2);
  g.fillStyle = base;
  g.fillRect(0, 0, w, h);
  draw(g);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  // The camera looks down at a slant; without this the ripples blur.
  tex.anisotropy = 8;
  return tex;
}

// Light ripples drawn three times (shifted a tile up and down) so the texture repeats seamlessly.
const waterTexture = () => streakTexture(128, 128, '#5cc6f6', (g) => {
  const rand = seeded(11);
  g.lineCap = 'round';
  for (let k = 0; k < 26; k++) {
    const x = rand() * 128;
    const y = rand() * 128;
    const len = 10 + rand() * 22;
    g.strokeStyle = `rgba(214, 244, 255, ${0.35 + rand() * 0.45})`;
    g.lineWidth = 1.5 + rand() * 2;
    for (const dy of [0, 128, -128]) {
      g.beginPath();
      g.moveTo(x, y + dy);
      g.quadraticCurveTo(x + 3, y + dy + len / 2, x - 1, y + dy + len);
      g.stroke();
    }
  }
});

const fallTexture = () => streakTexture(64, 128, '#9fe0ff', (g) => {
  const rand = seeded(5);
  for (let k = 0; k < 22; k++) {
    const x = rand() * 64;
    const y = rand() * 128;
    const len = 20 + rand() * 40;
    const w = 2 + rand() * 3;
    g.fillStyle = `rgba(255, 255, 255, ${0.5 + rand() * 0.5})`;
    for (const dy of [0, 128, -128]) g.fillRect(x, y + dy, w, len);
  }
});

/** A flat ribbon along the river, a little wider than the water so the banks cut its edges. */
function buildRiver() {
  const pos = [];
  const uv = [];
  const index = [];
  let v = 0;
  river.pts.forEach((p, i) => {
    const { dir } = river.frame(i);
    const w = riverHalf(i) + 0.3;
    pos.push(p.x + dir.z * w, WATER_Y, p.z - dir.x * w, p.x - dir.z * w, WATER_Y, p.z + dir.x * w);
    if (i > 0) v += river.step / 1.6;
    uv.push(0, v, 1, v);
    if (i > 0) {
      const a = (i - 1) * 2;
      index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(index);
  g.computeVertexNormals();
  const tex = waterTexture();
  const mesh = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.25, metalness: 0.05, emissive: '#1f86c9', emissiveIntensity: 0.18 }));
  mesh.receiveShadow = true;
  return { mesh, tex };
}

/** A box whose corners are nudged about, for low-poly rock. */
function rockBlock(seed) {
  const g = new THREE.BoxGeometry(1, 1, 1, 3, 4, 2);
  const p = g.attributes.position;
  for (let k = 0; k < p.count; k++) {
    const x = p.getX(k);
    const y = p.getY(k);
    const z = p.getZ(k);
    const n = (o) => hash(Math.round(x * 100) + o + seed, Math.round(y * 100) * 3 + Math.round(z * 100) * 7) - 0.5;
    p.setXYZ(k, x + n(1) * 0.14, y > -0.49 ? y + n(2) * 0.1 : y, z + n(3) * 0.22);
  }
  g.computeVertexNormals();
  return g;
}

/** The waterfall pours over a rocky cliff at the foot of the mountains into the river's pool. */
function buildWaterfall(batch) {
  const start = river.frame(0);
  const back = start.dir.clone().negate();
  const side = new THREE.Vector3(-back.z, 0, back.x);
  const turn = Math.atan2(back.x, back.z);
  const top = 3.0;
  const base = start.p.clone().addScaledVector(back, 0.75);
  const rock = new THREE.DodecahedronGeometry(1, 0);
  const rand = seeded(31);
  // The cliff face, with lower steps either side.
  const wall = (offBack, offSide, w, h, d, color, seed) => {
    const p = base.clone().addScaledVector(back, offBack).addScaledVector(side, offSide);
    batch.add(rockBlock(seed), color, [p.x, h / 2 - 0.3, p.z], [w, h, d], [0, turn, 0], true);
  };
  wall(0.75, 0, 1.9, top + 0.3, 1.4, '#9a948a', 1);
  wall(0.65, -1.45, 1.3, 2.3, 1.3, '#a49e93', 2);
  wall(0.65, 1.45, 1.3, 2.0, 1.3, '#8f8a80', 3);
  wall(0.5, -2.4, 1.0, 1.2, 1.1, '#9a948a', 4);
  wall(0.5, 2.35, 1.0, 1.1, 1.1, '#a49e93', 5);
  // Boulders at its feet and moss on top.
  for (const [bk, sd, y, r] of [[-0.15, -1.1, 0.05, 0.36], [-0.3, 1.15, 0.0, 0.32], [0.05, -1.75, 0.1, 0.42], [0.0, 1.8, 0.05, 0.38], [-0.55, -0.85, -0.05, 0.22]]) {
    const p = base.clone().addScaledVector(back, bk).addScaledVector(side, sd);
    batch.add(rock, '#a39d91', [p.x, y, p.z], [r, r * 0.8, r], [rand() * 3, rand() * 3, rand() * 3], true);
  }
  for (const [bk, sd, y, w] of [[0.9, -0.7, top + 0.02, 0.5], [0.8, 0.75, top - 0.02, 0.45], [0.7, -1.5, 2.02, 0.45], [0.7, 1.45, 1.72, 0.45]]) {
    const p = base.clone().addScaledVector(back, bk).addScaledVector(side, sd);
    batch.add(rock, '#5fa64c', [p.x, y, p.z], [w, 0.12, w * 0.8], [0, rand() * 3, 0], true);
  }

  // Falling water: a gently curved sheet whose stripes scroll down.
  const tex = fallTexture();
  tex.repeat.set(1, 1.8);
  const sheet = new THREE.PlaneGeometry(0.8, 1, 1, 10);
  const p = sheet.attributes.position;
  for (let k = 0; k < p.count; k++) {
    const t = 0.5 - p.getY(k); // 0 at the lip, 1 at the pool
    p.setXYZ(k, p.getX(k) * (1 + t * 0.35), (1 - t) * (top - WATER_Y) + WATER_Y, 0.08 + 0.3 * Math.pow(t, 0.5));
  }
  sheet.computeVertexNormals();
  const group = new THREE.Group();
  const fall = new THREE.Mesh(sheet, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.3, emissive: '#c6f1ff', emissiveIntensity: 0.4, side: THREE.DoubleSide }));
  fall.position.copy(base);
  fall.rotation.y = turn + Math.PI;
  group.add(fall);

  // Foam where it lands, and a soft mist.
  const foamMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6, emissive: '#e6f8ff', emissiveIntensity: 0.4 });
  const foam = [];
  const ball = new THREE.SphereGeometry(1, 10, 6);
  for (let k = 0; k < 6; k++) {
    const f = new THREE.Mesh(ball, foamMat);
    const q = base.clone().addScaledVector(side, (k / 5 - 0.5) * 1.1).addScaledVector(back, -0.3 - (k % 2) * 0.22);
    f.position.set(q.x, WATER_Y + 0.02, q.z);
    f.userData.base = 0.12 + (k % 3) * 0.03;
    f.userData.phase = k * 1.7;
    group.add(f);
    foam.push(f);
  }
  const mist = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: '#ffffff', transparent: true, opacity: 0.45, depthWrite: false }));
  mist.position.copy(base).addScaledVector(back, -0.45).setY(0.4);
  mist.scale.set(1.9, 1.1, 1);
  group.add(mist);
  return { group, tex, foam, mist };
}

// ── Roads ───────────────────────────────────────────────────────

// Cross-section of a dirt road, [from, to, colour] across its middle: wheel ruts and a grassy crown.
const ROAD_STRIPS = [
  [-0.38, 0.38, '#d2a874'],
  [-0.25, -0.12, '#b3875a'],
  [0.12, 0.25, '#b3875a'],
  [-0.045, 0.045, '#a5c46c'],
];

const inWater = (p) => groundY(p.x, p.z) < -0.02;

function buildRoads(batch, rand) {
  roads.forEach((road, ri) => {
    const frames = road.pts.map((_, i) => road.frame(i));
    const edge = (f, off) => {
      const x = f.p.x - f.dir.z * off;
      const z = f.p.z + f.dir.x * off;
      return [x, z];
    };
    ROAD_STRIPS.forEach(([a, b, color], si) => {
      const pos = [];
      const lift = 0.012 + ri * 0.004 + si * 0.002;
      for (let i = 1; i < frames.length; i++) {
        const f0 = frames[i - 1];
        const f1 = frames[i];
        if (inWater(f0.p) || inWater(f1.p)) continue;
        for (const [f, off] of [[f0, a], [f1, b], [f1, a], [f0, a], [f0, b], [f1, b]]) {
          const [x, z] = edge(f, off);
          pos.push(x, Math.max(0, groundY(x, z)) + lift, z);
        }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.computeVertexNormals();
      batch.addRaw(paint(g, color));
    });
    // Pebbles and grass tufts along the edges (see nature.js), taking as many random numbers as they always have.
    for (let i = 0; i < frames.length; i += 3) {
      if (rand() < 0.45 || inWater(frames[i].p)) continue;
      const [x, z] = edge(frames[i], (rand() < 0.5 ? -1 : 1) * (0.42 + rand() * 0.12));
      const y = groundY(x, z);
      if (rand() < 0.5) {
        const name = rand() < 0.5 ? 'ROCK_01_Small' : 'ROCK_02_Medium';
        batch.add(natureModel(name), null, [x, y - 0.005, z], name === 'ROCK_01_Small' ? 0.15 : 0.09, [rand() * 0.2, rand() * TAU, 0], true);
      } else batch.add(natureModel(i % 2 ? 'PLANT_01_GrassShort' : 'PLANT_02_GrassMedium'), null, [x, y, z], i % 2 ? 0.4 : 0.22, [0, rand() * TAU, 0], true);
    }
  });
}

function paint(g, color) {
  const c = new THREE.Color(color);
  const n = g.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    arr[i * 3] = c.r;
    arr[i * 3 + 1] = c.g;
    arr[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return g;
}

/** Where a road crosses the river: the two bank ends of a bridge, in the road's direction. */
function bridgeSpans() {
  const spans = [];
  for (const road of roads) {
    let first = -1;
    road.pts.forEach((p, i) => {
      const wet = inWater(p);
      if (wet && first < 0) first = i;
      if (!wet && first >= 0) {
        spans.push([road.pts[Math.max(0, first - 2)].clone(), road.pts[Math.min(road.pts.length - 1, i + 1)].clone()]);
        first = -1;
      }
    });
  }
  return spans;
}

// ── Trees ───────────────────────────────────────────────────────

/** The tree models (see trees.js) pines and leafy trees are drawn with, and their heights. */
const TREE_KINDS = {
  pine: [['Type1 03', 1.4], ['Type1 04', 1.65], ['Type2 02', 1.5], ['Type2 03', 1.7]],
  round: [['Type0 05', 1.5], ['Type3 01', 1.35], ['Type3 02', 1.4], ['Type4 03', 1.55]],
};

/** A low shrub of three lumps. */
function bushGeometry() {
  const batch = new Batch();
  const ico = new THREE.IcosahedronGeometry(1, 0);
  batch.add(ico, '#5cb85a', [0, 0.17, 0], [0.28, 0.22, 0.28], null, true);
  batch.add(ico, '#68c362', [0.2, 0.13, 0.06], [0.21, 0.17, 0.21], [0.4, 0, 0], true);
  batch.add(ico, '#51ab50', [-0.19, 0.12, -0.05], [0.2, 0.16, 0.2], [0, 0.6, 0.3], true);
  return batch.build().children[0].geometry;
}

/**
 * Plants the forests: thick around the edges of the farmland, a few trees inside it.
 * extra: more [kind, x, y, z, scale, turn, tint] trees, such as the pines on the mountains.
 * Returns the tree meshes and the [x, z, radius] spots that darken the grass under them.
 */
function buildForest(rand, extra) {
  const spots = { pine: [], round: [], bush: [] };
  const clearOf = (u, b, x, z) => {
    if (Math.abs(u) + Math.abs(b) < 6.6) return false; // the farm itself
    for (const [cu, cb, r] of CLEARINGS) if (Math.hypot(u - cu, b - cb) < r + 0.3) return false;
    const rv = river.nearest(x, z);
    if (rv.d < riverHalf(rv.i) + 0.55) return false;
    for (const road of roads) if (road.nearest(x, z).d < 0.75) return false;
    return true;
  };
  // Just past what the view can reach (VIEW_BOUNDS): the lowest screen edge sees the ground 23.5 to the front.
  const cell = 0.95;
  for (let b = -26; b < 11.8; b += cell) {
    for (let u = VIEW_BOUNDS.left - 1.5; u < VIEW_BOUNDS.right + 1.5; u += cell) {
      const pu = u + (rand() - 0.5) * cell * 0.9;
      const pb = b + (rand() - 0.5) * cell * 0.9;
      const edge = farmEdge(pu, pb);
      const density = edge > 0 ? 0.25 + 0.7 * smooth(0, 2.5, edge) : 0.035;
      if (rand() > density) continue;
      const [x, z] = xz(pu, pb);
      if (!clearOf(pu, pb, x, z)) continue;
      const y = groundY(x, z);
      const r = rand();
      let kind;
      if (edge < 0) kind = r < 0.75 ? 'round' : 'bush';
      else if (y > 0.9 || pb > 8) kind = r < 0.7 ? 'pine' : 'round';
      else kind = r < 0.38 ? 'pine' : r < 0.85 ? 'round' : 'bush';
      const s = (kind === 'bush' ? 0.9 : 1.0) * (0.75 + rand() * 0.6) * (edge > 3 ? 1.2 : 1);
      spots[kind].push([x, y - 0.04, z, s, rand() * TAU, rand()]);
    }
  }
  for (const [kind, ...t] of extra) spots[kind].push(t);

  // Pines and leafy trees each pick one of their kind's models by where they stand. reach: canopy radius.
  const models = [{ geometry: bushGeometry(), reach: 0.38, list: spots.bush }];
  for (const [kind, list] of Object.entries(TREE_KINDS)) {
    list.forEach(([name, height], i) => {
      const size = treeSize(name);
      models.push({
        geometry: treeGeometry(name, height),
        reach: (size.radius / size.height) * height,
        list: spots[kind].filter(([x, , z]) => Math.floor(hash(x * 3.7, z * 5.3) * list.length) === i),
      });
    });
  }

  const group = new THREE.Group();
  const shade = [];
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, flatShading: true });
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const tint = new THREE.Color();
  // Only trees inside the sun's shadow box (see FarmScene) cast shadows; the rest skip the shadow pass.
  const nearFarm = ([x, , z]) => Math.abs(x) < 8.5 && Math.abs(z) < 8.5;
  for (const { geometry, reach, list: all } of models) {
    for (const near of [true, false]) {
      const list = all.filter((t) => nearFarm(t) === near);
      if (!list.length) continue;
      const mesh = new THREE.InstancedMesh(geometry, mat, list.length);
      list.forEach(([x, y, z, s, turn, k], i) => {
        m.compose(new THREE.Vector3(x, y, z), q.setFromAxisAngle(up, turn), new THREE.Vector3(s, s * (0.9 + k * 0.25), s));
        mesh.setMatrixAt(i, m);
        const br = 0.86 + k * 0.26;
        const hue = ((k * 7.13) % 1) - 0.5;
        mesh.setColorAt(i, tint.setRGB(br * (1 + hue * 0.12), br, br * (1 - hue * 0.16)));
        shade.push([x, z, s * (reach + 0.08)]);
      });
      mesh.castShadow = near;
      mesh.receiveShadow = near;
      group.add(mesh);
    }
  }
  return { group, shade };
}

// ── Ground cover ────────────────────────────────────────────────

/** Spots kept bare of plants: [u, b, radius] round the buildings, the animals and the paddies. */
const BARE = [
  [LAYOUT.farmhouse[0], LAYOUT.farmhouse[1], 1.0],
  [LAYOUT.silo[0], LAYOUT.silo[1], 0.5],
  [LAYOUT.windmill[0], LAYOUT.windmill[1], 0.6],
  [LAYOUT.coop[0], LAYOUT.coop[1] - 0.6, 1.3], // and the hens' run in front
  [LAYOUT.well[0], LAYOUT.well[1], 0.45],
  [LAYOUT.cart[0], LAYOUT.cart[1], 0.5],
  [LAYOUT.scarecrow[0], LAYOUT.scarecrow[1], 0.25],
  [LAYOUT.buffalo[0] - 0.35, LAYOUT.buffalo[1] + 0.2, 0.9], // and her calf
  [LAYOUT.woodpile[0], LAYOUT.woodpile[1], 0.45],
  [LAYOUT.mud[0], LAYOUT.mud[1], 0.75],
  [LAYOUT.sign[0], LAYOUT.sign[1], 0.25],
  ...LAYOUT.footpaths.flat().map(([u, b]) => [u, b, 0.2]),
  ...LAYOUT.cows.map(([u, b]) => [u, b, 0.6]),
  ...LAYOUT.bales.map(([u, b]) => [u, b, 0.3]),
  ...LAYOUT.haystacks.map(([u, b]) => [u, b, 0.5]),
  ...LAYOUT.bamboo.map(([u, b]) => [u, b, 0.35]),
  ...LAYOUT.paddies.map(([u, b]) => [u, b, 1.35]),
];

// Models from the nature pack (see nature.js) and the scale each is drawn at.
const GRASS = [['PLANT_01_GrassShort', 0.45], ['PLANT_02_GrassMedium', 0.3], ['PLANT_04_GrassSparse', 0.32]];
const FLOWERS = [['FLOWER_05_RedWildflower', 0.46], ['FLOWER_04_BlueBells', 0.44], ['FLOWER_02_YellowCluster', 0.46]];
const UNDERGROWTH = [['PLANT_10_BroadleafPlant', 0.34], ['PLANT_10_BroadleafPlant', 0.28], ['PLANT_09_WoodlandPlant', 0.45]];
const LOGS = [['TREE_14_Stump', 0.26], ['TREE_15_StumpBroken', 0.2], ['TREE_16_FallenLog', 0.22], ['TREE_18_HollowLog', 0.2]];
const MUSHROOMS = [['MUSH_01_RedSmall', 0.4], ['MUSH_02_BrownSmall', 0.4], ['MUSH_03_White', 0.32]];
const STONES = [['ROCK_01_Small', 0.28], ['ROCK_02_Medium', 0.17], ['ROCK_07_ClusterSmall', 0.14]];

/**
 * Grass, flowers and small plants over the open farmland, thicker along the roads, the river and the edge of
 * the forest, where stumps, logs and mushrooms lie as well. It draws its own random numbers, so nothing else moves.
 * trees: the forest's [x, z, radius] spots, which stumps and logs keep clear of.
 * Returns the group, and `plants`: the grass, flowers and leafy plants in it, which the fast graphics setting hides.
 */
function buildGroundCover(trees) {
  const rand = seeded(7070);
  const low = new Batch();
  // Stumps, logs and stones cast shadows only inside the sun's shadow box (see FarmScene), like the trees.
  const near = new Batch();
  const far = new Batch();
  const pick = (list, k) => list[Math.min(list.length - 1, Math.floor(k * list.length))];
  // across: lie across the view (the camera looks along x = z), as a log should to show its length.
  const put = (solid, [name, scale], x, z, across = false) => {
    const batch = !solid ? low : Math.abs(x) < 8.5 && Math.abs(z) < 8.5 ? near : far;
    const turn = across ? Math.PI / 4 + (rand() - 0.5) * 1.2 : rand() * TAU;
    batch.add(natureModel(name), null, [x, groundY(x, z) - 0.01, z], scale * (0.8 + rand() * 0.4), [0, turn, 0], true);
  };
  const cell = 0.5;
  for (let b = -12; b < 9; b += cell) {
    for (let u = VIEW_BOUNDS.left - 1; u < VIEW_BOUNDS.right + 1; u += cell) {
      const pu = u + (rand() - 0.5) * cell;
      const pb = b + (rand() - 0.5) * cell;
      const roll = rand();
      const edge = farmEdge(pu, pb);
      if (edge > 0.4) continue; // in the forest
      const [x, z] = xz(pu, pb);
      if (Math.abs(x) < 2.75 && Math.abs(z) < 2.75) continue; // the plots
      if (FARM_CLEAR.some(([cx, cz, r]) => Math.hypot(x - cx, z - cz) < r)) continue;
      if (BARE.some(([cu, cb, r]) => Math.hypot(pu - cu, pb - cb) < r)) continue;
      const rv = river.nearest(x, z);
      const bank = rv.d - riverHalf(rv.i);
      if (bank < 0.3) continue;
      const road = Math.min(...roads.map((r) => r.nearest(x, z).d));
      if (road < 0.5) continue;
      // Thickest by the roads, the water and the trees, in patches elsewhere.
      const nearby = Math.max(smooth(1.3, 0.55, road), smooth(1.4, 0.4, bank), smooth(-2.2, 0, edge));
      const patch = smooth(0.45, 0.72, fbm(pu * 0.5 + 21, pb * 0.5 + 4));
      if (roll > 0.03 + 0.2 * patch + 0.42 * nearby) continue;
      const k = rand();
      // 0 out in the open, 1 where the forest starts.
      const woods = smooth(-1.6, 0, edge);
      if (fbm(pu * 0.35 + 40, pb * 0.35 + 17) > 0.62 && k < 0.45) {
        // Flowers grow in drifts of one kind.
        put(false, pick(FLOWERS, hash(Math.round(pu / 3), Math.round(pb / 3))), x, z);
      } else if (k < 0.1 * smooth(0.3, 0.8, woods) && !trees.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < 0.5)) {
        // Stumps and logs at the edge of the forest, some with mushrooms.
        const log = pick(LOGS, rand());
        put(true, log, x, z, log[0].includes('Log'));
        for (let n = rand() < 0.6 ? 2 : 0; n > 0; n--) put(true, pick(MUSHROOMS, rand() * 0.7), x + (rand() - 0.5) * 0.5, z + (rand() - 0.5) * 0.5);
      } else if (k < 0.04 + 0.04 * woods) {
        put(true, pick(STONES, rand()), x, z);
      } else if (k < 0.08 + 0.3 * woods) {
        put(false, pick(UNDERGROWTH, rand()), x, z);
      } else {
        put(false, pick(GRASS, rand()), x, z);
      }
    }
  }
  const group = new THREE.Group();
  const plants = low.build({ castShadow: false });
  group.add(plants, near.build(), far.build({ castShadow: false }));
  return { group, plants };
}

// ── Mountains ───────────────────────────────────────────────────

const SLOPE_GREEN = ['#4c9a48', '#58a64e', '#4a9145'];

/** One jagged low-poly mountain, coloured by height: forest, then grass, then bare rock. */
function mountain(x, y, z, radius, height, haze, seed) {
  const g = new THREE.ConeGeometry(1, 1, 9, 5, true).toNonIndexed();
  const p = g.attributes.position;
  for (let k = 0; k < p.count; k++) {
    const vx = p.getX(k);
    const vy = p.getY(k) + 0.5; // 0 at the foot, 1 at the top
    const vz = p.getZ(k);
    // Same jitter for the copies of a shared corner, so the faces still meet.
    const n = hash(Math.round(vx * 1000) + seed, Math.round(vz * 1000) + Math.round(vy * 100));
    const n2 = hash(Math.round(vz * 1000) - seed, Math.round(vx * 1000) + 7);
    const r = vy > 0.99 ? 0 : 1 + (n - 0.5) * 0.28;
    const dy = vy > 0.02 && vy < 0.99 ? (n2 - 0.5) * 0.12 : 0;
    p.setXYZ(k, vx * r * radius + x, (vy + dy) * height + y, vz * r * radius + z);
  }
  g.deleteAttribute('uv');
  g.computeVertexNormals();
  const colors = new Float32Array(p.count * 3);
  const c = new THREE.Color();
  const sky = new THREE.Color('#a9cbe6');
  for (let k = 0; k < p.count; k += 3) {
    const f = ((p.getY(k) + p.getY(k + 1) + p.getY(k + 2)) / 3 - y) / height;
    const pick = hash(k, seed);
    if (f > 0.84) c.set(pick < 0.5 ? '#a39d8a' : '#938d7c');
    else if (f > 0.6) c.set(pick < 0.4 ? '#7aa75a' : '#6c9e51');
    else c.set(SLOPE_GREEN[Math.floor(pick * 3)]);
    c.lerp(sky, haze);
    for (let v = 0; v < 3; v++) colors.set([c.r, c.g, c.b], (k + v) * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return g;
}

/** Near range: green with forested slopes. Far range: lower and hazy blue behind it. */
function buildMountains(rand) {
  const batch = new Batch();
  const trees = [];
  const ray = new THREE.Raycaster();
  const down = new THREE.Vector3(0, -1, 0);
  for (let u = -27; u <= 27; u += 3.6 + rand() * 1.4) {
    const b = 11.6 + rand() * 1.6 + (Math.abs(u - RIVER[0][0]) < 3 ? 0.8 : 0);
    const [x, z] = xz(u, b);
    const radius = 3.2 + rand() * 1.4;
    const height = 3.4 + rand() * 2.2 + (Math.abs(u) > 12 ? 0.8 : 0);
    const g = mountain(x, -0.4, z, radius, height, 0, Math.floor(rand() * 1000));
    // Pines dotted over the slopes facing the camera, dropped onto the faces.
    const probe = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
    for (let k = 0; k < 16; k++) {
      const a = Math.PI / 4 + (rand() - 0.5) * 2.4;
      const r = radius * (0.38 + rand() * 0.55);
      const px = x + Math.cos(a) * r;
      const pz = z + Math.sin(a) * r;
      ray.set(new THREE.Vector3(px, height + 2, pz), down);
      const hit = ray.intersectObject(probe)[0];
      if (hit && hit.point.y < height * 0.6) trees.push(['pine', px, hit.point.y - 0.08, pz, 0.8 + rand() * 0.5, rand() * TAU, rand()]);
    }
    batch.addRaw(g, true);
  }
  for (let u = -30; u <= 30; u += 4.2 + rand() * 1.6) {
    const b = 16.5 + rand() * 2;
    const [x, z] = xz(u, b);
    batch.addRaw(mountain(x, -3, z, 4.6 + rand() * 1.8, 6.2 + rand() * 1.8, 0.55, Math.floor(rand() * 1000)), true);
  }
  return { group: batch.build({ castShadow: false }), trees };
}

// ── Clouds ──────────────────────────────────────────────────────

const CLOUDS = [
  // [u, b, height, size]: high in the sky, and lower ones resting between the peaks.
  [-12, 16, 5.5, 1.6], [-3, 18, 6.0, 1.3], [6, 17, 5.2, 1.8], [15, 16, 6.2, 1.4], [-20, 15, 5.0, 1.2],
  [-8, 13.6, 4.2, 1.5], [3, 14, 4.4, 1.7], [12, 13.4, 4.0, 1.4], [-17, 13.8, 4.3, 1.6], [20, 14, 4.1, 1.5],
];

// ── Assembly ────────────────────────────────────────────────────

export function buildCountryside() {
  const rand = seeded(20251010);
  const group = new THREE.Group();

  const roadBatch = new Batch();
  buildRoads(roadBatch, rand);
  group.add(roadBatch.build({ castShadow: false }));

  const water = buildRiver();
  group.add(water.mesh);

  const batch = new Batch();
  const fall = buildWaterfall(batch);
  group.add(fall.group);
  const built = addBuildings(batch, { layout: LAYOUT, at, groundY, rand, bridges: bridgeSpans(), river, riverHalf });
  group.add(built.group);
  group.add(batch.build());

  const mountains = buildMountains(rand);
  group.add(mountains.group);
  const forest = buildForest(rand, mountains.trees);
  group.add(forest.group);
  group.add(buildGround(forest.shade));
  const cover = buildGroundCover(forest.shade);
  group.add(cover.group);

  const animals = addAnimals({ layout: LAYOUT, at, groundY, river, riverHalf, waterY: WATER_Y, coopYard: built.coopYard });
  group.add(animals.group);

  const clouds = CLOUDS.map(([u, b, h, s]) => {
    const c = cloud(s);
    c.position.copy(at(u, b, h));
    group.add(c);
    return c;
  });

  const update = (t, dt) => {
    water.tex.offset.y -= dt * 0.18;
    fall.tex.offset.y += dt * 1.4;
    for (const f of fall.foam) {
      const s = f.userData.base;
      f.scale.set(s * 1.6, s * (0.7 + 0.25 * Math.sin(t * 5 + f.userData.phase)), s * 1.6);
    }
    fall.mist.material.opacity = 0.35 + 0.12 * Math.sin(t * 2.3);
    built.update(t, dt);
    animals.update(t, dt);
    for (const c of clouds) {
      // Drift to the right across the screen and come back round from the left.
      c.position.x += dt * 0.1;
      c.position.z -= dt * 0.1;
      if (toUB(c.position.x, c.position.z)[0] > 26) {
        c.position.x -= 52 * S;
        c.position.z += 52 * S;
      }
    }
  };
  return { group, update, plants: cover.plants };
}
