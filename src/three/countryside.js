// The valley around the farm: rolling grass, a dirt road round the farm and roads off it, a river with
// a waterfall and two bridges, farm buildings, fields, a meadow, forests and mountains. It is built once;
// only the farm inside the ring road (plots, fence, pond) and the barn are rebuilt when visiting a neighbour.
import * as THREE from 'three';
import { Batch } from './batch.js';
import { cloud, FARM_CLEAR, BARN_SPOT, ringAt, ringDistance, ringPath } from './farm.js';
import { addBuildings } from './buildings.js';
import { addAnimals } from './animals.js';
import { glowTexture } from './textures.js';
import { pineTree, roundTree, birchTree, bush, LEAVES, YELLOW_LEAVES, DEEP_LEAVES, PINE_NEEDLES, FRESH_PINE } from './trees.js';
import { putNature, natureSize, railFence } from './nature.js';
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
export const VIEW_BOUNDS = { left: -17, right: 17, bottom: -13.5, top: 16.5 };

/** Where the sun shines from: up and to the left on screen, a little towards the camera. */
export const SUN_DIR = new THREE.Vector3(-0.414, 1.11, 0.91).normalize();

/** Half the width of the sun's shadow box (see FarmScene): only things this close to the middle cast shadows. */
export const SHADOW_BOX = 10;
const SHADOW_REACH = SHADOW_BOX + 0.5;

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
// Everything is placed in (u, b) map units. The plots are the diamond |u| + |b| < 3.7; the ring road round them
// (RING in farm.js) is square to them, so it makes a bigger diamond with rounded corners about 7 out.

// From the waterfall at the foot of the mountains, past the ring road's right corner, along its front right side
// and round its front corner, then away to the left.
const RIVER = [
  [9.42, 10.12], [9.4, 7.56], [9.82, 5.02], [10.33, 2.12], [9.9, 0], [8.84, -2.05], [6.52, -4.4], [4.59, -6.29],
  [2.02, -8.38], [-0.21, -9.12], [-2.7, -9.2], [-6.42, -9.92], [-9.62, -11.32], [-12.82, -13.42], [-15.82, -16.22],
  [-19.42, -18.92], [-26.42, -21.92], [-34.85, -24],
];
const RIVER_HALF = 0.8;

// The roads off the ring road, each from where it leaves the ring (see ringAt in farm.js).
const ROADS = [
  // From the ring's front right side over the big bridge, past the fields and away to the front right.
  [ringAt(-1.04), [3.67, -5.79], [5.23, -7.49], [6.43, -8.83], [7.84, -10.81], [9.33, -13.43], [11.24, -17.18]],
  // From its back right side past the windmill, over a little bridge below the waterfall and into the woods.
  [ringAt(0.62), [5.79, 4.38], [7.56, 5.44], [10.6, 7.21], [13.01, 7.07], [15.7, 7.21], [18.81, 6.93]],
  // From its left corner out past the cows' meadow.
  [ringAt(Math.PI), [-8.85, 0.6], [-11.25, 1.4], [-13.85, 1.8], [-18.35, 2.4]],
  // From its front left side down along the river.
  [ringAt(-2.85), [-7.42, -3.02], [-9.42, -4.82], [-11.62, -7.02], [-13.92, -9.82], [-17.92, -14.32]],
];

const FACE_SIDE = Math.PI / 4; // added to the face-the-camera angle, turns a front to face the ring's back left side

/** Where things stand: [u, b, turn]. Turns are added to the face-the-camera angle. */
export const LAYOUT = {
  // Along the ring's back left side, facing it: the farmhouse, the hen house with its run and a hutch, and the cart.
  farmhouse: [-6.29, 3.88, FACE_SIDE],
  coop: [-4.73, 6.15, FACE_SIDE],
  hutch: [-2.97, 6.93, FACE_SIDE],
  cart: [-1.84, 8.2, 0.9],
  // The barn stands behind the back corner (BARN_SPOT in farm.js); along the back right side are bales, the silo,
  // a haystack and, near the right corner, the windmill.
  bales: [[1.2, 7.99, -0.2], [1.91, 7.85, 0.5]],
  silo: [3.39, 6.64, 0],
  haystacks: [[4.52, 5.37, 1]],
  windmill: [7.42, 2.75, -0.2],
  // A pink blossom tree by the farmhouse and a chopping stump behind it, and the well by the front left side.
  cherry: [-7.92, 1.56],
  woodpile: [-7.77, 4.38, 0.4],
  well: [-5.65, -3.96, 0.6],
  // Fruit trees inside the ring: [u, b, fruit colour].
  fruitTrees: [[-1.98, 3.25, '#ffa53a'], [-3.96, 1.27, '#ff6b5a'], [-3.67, -1.55, '#ff6b5a'], [-1.84, -3.39, '#ffd23f'], [3.96, 1.27, '#ffa53a'], [3.67, -1.55, '#ffa53a']],
  pig: [-0.42, 4.67, 0.6],
  // The buffalo and her calf by the river past the right corner, with their mud wallow, and a sign where the road to
  // the waterfall leaves the ring.
  buffalo: [8.2, -0.28, -1.2],
  calf: [8.98, 0.21, -0.3],
  mud: [8.05, -0.1, 0.3],
  sign: [5.72, 3.04, -0.3],
  // The meadow on the left: its fence's corners, the cows, the sheep and their water trough.
  meadow: [[-9.25, -0.6], [-14.15, 0.2], [-14.75, -3.9], [-11.25, -4.0]],
  cows: [[-11.85, -1.0, 2.2], [-13.15, -2.6, 0.6]],
  sheep: [[-11.25, -3.0, 1.0], [-10.75, -0.9, 2.0], [-13.45, -0.3, 0.3]],
  trough: [-10.45, -1.8, 0.5],
  // The fenced fields over the big bridge.
  fields: [9.33, -6.5],
  // Benches by the river, the meadow road and the windmill: [u, b, turn].
  benches: [[-4.38, -5.79, -Math.PI / 4], [-10.05, 2.4, 0.2], [8.82, 4.02, -0.6]],
  // Stepping stones from the well to the ring road.
  footpaths: [[[-5.37, -3.67], [-5.02, -3.32]]],
};

/** Open ground the forest keeps clear of, and that stays flat: [u, b, radius]. */
const CLEARINGS = [
  [BARN_SPOT[0], BARN_SPOT[1], 1.6],
  [LAYOUT.farmhouse[0], LAYOUT.farmhouse[1], 1.8],
  [LAYOUT.silo[0], LAYOUT.silo[1], 0.9],
  [LAYOUT.windmill[0], LAYOUT.windmill[1], 1.3],
  [LAYOUT.coop[0], LAYOUT.coop[1] - 0.5, 1.6],
  [LAYOUT.hutch[0], LAYOUT.hutch[1], 0.8],
  [LAYOUT.well[0], LAYOUT.well[1], 0.8],
  [LAYOUT.cart[0], LAYOUT.cart[1], 0.7],
  [LAYOUT.cherry[0], LAYOUT.cherry[1], 0.8],
  [LAYOUT.woodpile[0], LAYOUT.woodpile[1], 0.6],
  [LAYOUT.buffalo[0], LAYOUT.buffalo[1], 0.8],
  [LAYOUT.calf[0], LAYOUT.calf[1], 0.6],
  [LAYOUT.fields[0], LAYOUT.fields[1], 3.2],
  [RIVER[0][0], RIVER[0][1], 2.1], // waterfall pool, and open in front so the fall shows
  [RIVER[0][0] - 0.3, RIVER[0][1] - 1.6, 1.3],
  ...LAYOUT.haystacks.map(([u, b]) => [u, b, 0.7]),
  ...LAYOUT.bales.map(([u, b]) => [u, b, 0.5]),
];

/** Whether a map point is inside the meadow's fence, `margin` further out. */
function inMeadow(u, b, margin = 0) {
  const c = LAYOUT.meadow;
  let inside = false;
  for (let i = 0, j = c.length - 1; i < c.length; j = i++) {
    const [ui, bi] = c[i];
    const [uj, bj] = c[j];
    if (bi > b !== bj > b && u < ((uj - ui) * (b - bi)) / (bj - bi) + ui) inside = !inside;
  }
  if (inside || !margin) return inside;
  return c.some((p, i) => {
    const q = c[(i + 1) % c.length];
    const du = q[0] - p[0];
    const db = q[1] - p[1];
    const t = Math.max(0, Math.min(1, ((u - p[0]) * du + (b - p[1]) * db) / (du * du + db * db)));
    return Math.hypot(u - p[0] - du * t, b - p[1] - db * t) < margin;
  });
}

/** How far outside the open farmland a point is (negative inside). */
function farmEdge(u, b) {
  const qx = Math.abs(u) - 10.3;
  const qz = Math.abs(b + 1.0) - 5.9;
  const out = Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0) - 3.6;
  return out + (noise(u * 0.32 + 4, b * 0.32 + 9) - 0.5) * 2.4;
}

// ── Paths ───────────────────────────────────────────────────────

class Path {
  /** closed: the path comes back round to its start, whose point it repeats at the end of pts. */
  constructor(points, step = 0.15, closed = false) {
    this.closed = closed;
    this.curve = new THREE.CatmullRomCurve3(points.map(([u, b]) => at(u, b)), closed, 'centripetal');
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
    const n = this.pts.length - 1;
    const a = this.closed ? this.pts[(i - 1 + n) % n] : this.pts[Math.max(0, i - 1)];
    const b = this.closed ? this.pts[(i + 1) % n] : this.pts[Math.min(n, i + 1)];
    return { p: this.pts[i], dir: new THREE.Vector3().subVectors(b, a).setY(0).normalize() };
  }
}

const river = new Path(RIVER);
// Wider at the waterfall's pool.
const riverHalf = (i) => RIVER_HALF + 0.55 * smooth(14, 0, i) + 0.08 * Math.sin(i * 0.05);
// The ring road round the farm first, then the roads off it.
const roads = [
  new Path(ringPath(0, 0.35), 0.2, true),
  ...ROADS.map((pts) => new Path(pts, 0.2)),
];

// ── Ground ──────────────────────────────────────────────────────

const GRID = { u0: -23, u1: 23, b0: -30, b1: 13.5, step: 0.33 };
const NU = Math.round((GRID.u1 - GRID.u0) / GRID.step) + 1;
const NB = Math.round((GRID.b1 - GRID.b0) / GRID.step) + 1;
const WATER_Y = -0.32;

// Behind the farm the land climbs in two steps with steep rocky faces, each wavering along its length:
// [how far back its face is, how high it climbs, how much it wavers].
const RISES = [[10.07, 0.75, 1], [11.57, 0.7, 1.4]];
const riseWave = (u, k) => (noise(u * 0.3 + 3, 1.7) - 0.5) * 0.9 * k;

/** Height of the land before the river is cut in. */
function landHeight(u, b) {
  const out = farmEdge(u, b);
  let h = out > 0 ? smooth(0, 6, out) * (0.25 + 1.3 * fbm(u * 0.15 + 3, b * 0.15 + 7)) : 0;
  // The feet of the mountains.
  h += smooth(11.8, 14.5, b) * (1.2 + 1.0 * fbm(u * 0.2, b * 0.2));
  for (const [cu, cb, r] of CLEARINGS) {
    const d = Math.abs(u - cu) + Math.abs(b - cb);
    if (d < r + 2.5) h *= smooth(r, r + 2.5, Math.hypot(u - cu, b - cb));
  }
  for (const [face, rise, k] of RISES) h += rise * smooth(face - 0.1, face + 0.1, b + riseWave(u, k));
  return h;
}

/**
 * Cuts the river's bed into the land: level grass right to the water's edge, a sheer drop there (faced with earth by
 * buildBanks) and the bed shelving deeper.
 */
function cutRiver(h, x, z) {
  const { d, i } = river.nearest(x, z);
  if (d === Infinity) return { h, wet: 0 };
  const w = riverHalf(i);
  const out = d - w; // from the water's edge, outwards
  const bank = 0.6 * Math.max(0, out - 0.1) - 0.42 * smooth(0.1, -0.02, out) - 0.15 * smooth(-0.1, -0.6, out);
  return { h: Math.min(h, bank), wet: smooth(w + 0.3, w + 0.1, d) };
}

/** Whether a map point is on or near the face of one of the rises, `margin` either side of it. */
const onRise = (u, b, margin) => RISES.some(([face, , k]) => Math.abs(b + riseWave(u, k) - face) < margin);

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
  // Shadows fall a little away from the sun.
  const away = new THREE.Vector2(-SUN_DIR.x, -SUN_DIR.z).normalize().multiplyScalar(0.3);
  for (const [x, z, r] of shadeSpots) {
    const [u, b] = toUB(x + away.x * r, z + away.y * r);
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
  const light = new THREE.Color('#8ad25a');
  const deep = new THREE.Color('#6cbd4a');
  const meadow = new THREE.Color('#b4d85c');
  const hill = new THREE.Color('#559e42');
  const sand = new THREE.Color('#e3c98f');
  const mud = new THREE.Color('#a98d5f');
  const under = new THREE.Color('#3b7a33');
  const rock = new THREE.Color('#a29d93');
  const earth = new THREE.Color('#9b8261');
  const trodden = new THREE.Color('#b9b56a');
  const cliff = new THREE.Color();
  const c = new THREE.Color();
  for (let j = 0; j < NB; j++) {
    for (let i = 0; i < NU; i++) {
      const k = j * NU + i;
      const u = GRID.u0 + i * GRID.step;
      const b = GRID.b0 + j * GRID.step;
      const [x, z] = xz(u, b);
      const h = heights[k];
      // How steep the ground is here: the faces of the rises and the river banks show bare rock and earth.
      const hu = heights[j * NU + Math.min(NU - 1, i + 1)] - heights[j * NU + Math.max(0, i - 1)];
      const hb = heights[Math.min(NB - 1, j + 1) * NU + i] - heights[Math.max(0, j - 1) * NU + i];
      const slope = Math.hypot(hu, hb) / (2 * GRID.step);
      pos[k * 3] = x;
      pos[k * 3 + 1] = h;
      pos[k * 3 + 2] = z;
      // Patches of deeper green and of sunny yellow-green grass.
      c.copy(light).lerp(deep, smooth(0.35, 0.75, fbm(u * 0.22 + 11, b * 0.22 + 2)));
      c.lerp(meadow, smooth(0.5, 0.78, fbm(u * 0.15 + 47, b * 0.15 + 13)) * 0.75);
      c.lerp(hill, smooth(0.2, 2.2, h) * 0.8);
      c.lerp(under, shade[k] * 0.75);
      // Trodden grass either side of the roads, so they fade into it.
      const road = Math.min(...roads.map((r) => r.nearest(x, z).d));
      c.lerp(trodden, smooth(0.75, 0.35, road) * 0.45);
      c.lerp(sand, wetness[k] * 0.6);
      cliff.copy(rock).lerp(earth, smooth(0.3, 0.7, fbm(u * 0.6 + 5, b * 0.6 + 2)));
      c.lerp(cliff, smooth(0.55, 1.2, slope) * 0.9);
      c.lerp(mud, smooth(-0.22, -0.4, h));
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

/**
 * Rock walls along the faces of the rises behind the farm, so they stand up as cliffs, with moss on some tops and
 * fallen stones at their feet; the river's gorge and the waterfall's cliff are left open.
 */
function buildCliffs(batch, rand) {
  const lump = new THREE.DodecahedronGeometry(1, 0);
  const greys = ['#a3a7a8', '#9a9fa2', '#b0b4b5', '#959a9c'];
  for (const [face, , k] of RISES) {
    for (let u = VIEW_BOUNDS.left - 2; u < VIEW_BOUNDS.right + 2;) {
      const w = 0.8 + rand() * 0.7;
      const mid = u + w / 2;
      u += w * 0.8;
      // Here and there a grassy break in the cliff.
      if (rand() < 0.16) continue;
      // Points along the face, and on the low and high ground either side of it.
      const line = (du, db = 0) => xz(mid + du, face - riseWave(mid + du, k) + db);
      const [x, z] = line(0);
      const rv = river.nearest(x, z);
      if (rv.d - riverHalf(rv.i) < 1.3 || Math.hypot(mid - RIVER[0][0], face - riseWave(mid, k) - RIVER[0][1]) < 2.4) continue;
      const [x0, z0] = line(-0.4);
      const [x1, z1] = line(0.4);
      const turn = Math.atan2(-(z1 - z0), x1 - x0);
      const low = groundY(...line(0, -0.35));
      const high = groundY(...line(0, 0.35));
      const h = high - low + 0.02 + rand() * 0.26;
      const depth = 0.34 + rand() * 0.2;
      // Some stand forward of the face and some back, so the cliff does not run like a wall.
      const [cx, cz] = line(0, (rand() - 0.5) * 0.2);
      batch.add(rockBlock(Math.floor(rand() * 1000)), greys[Math.floor(rand() * greys.length)], [cx, low - 0.08 + h / 2, cz], [w, h, depth], [0, turn + (rand() - 0.5) * 0.25, 0], true);
      if (rand() < 0.5) batch.add(lump, '#5fa64c', [x, low - 0.06 + h, z], [w * 0.38, 0.06, depth * 0.45], [0, turn, 0], true);
      if (rand() < 0.45) {
        const [fx, fz] = line((rand() - 0.5) * w, -0.4 - rand() * 0.2);
        const name = OUTCROPS[Math.floor(rand() * OUTCROPS.length)];
        const size = 0.1 + rand() * 0.12;
        putNature(batch, name, [fx, groundY(fx, fz) - 0.03, fz], (size * 2) / natureSize(name).width, [rand() * 0.3, rand() * TAU, 0]);
      }
    }
  }
}

/** Earth banks standing out of the water along both sides of the river, so the land reads as higher than it. */
function buildBanks() {
  const pos = [];
  const col = [];
  const top = new THREE.Color('#8f7250');
  const foot = new THREE.Color('#5c4834');
  const bottom = WATER_Y - 0.08;
  const quad = (a, b, inward) => {
    const corners = [[a, a.y, top], [b, b.y, top], [b, bottom, foot], [a, a.y, top], [b, bottom, foot], [a, bottom, foot]];
    // Face the water: flip the winding when the first triangle faces away from it.
    const ab = new THREE.Vector3(b.x - a.x, b.y - a.y, b.z - a.z);
    const ad = new THREE.Vector3(b.x - a.x, bottom - a.y, b.z - a.z);
    if (ab.cross(ad).dot(inward) < 0) [corners[1], corners[2], corners[4], corners[5]] = [corners[2], corners[1], corners[5], corners[4]];
    for (const [p, y, c] of corners) {
      pos.push(p.x, y, p.z);
      col.push(c.r, c.g, c.b);
    }
  };
  for (const s of [-1, 1]) {
    let prev = null;
    river.pts.forEach((p, i) => {
      const { dir } = river.frame(i);
      // In and out a little, so the bank is not drawn with a ruler.
      const off = s * (riverHalf(i) + 0.05 + (hash(i * 0.37, s * 3.1) - 0.5) * 0.06);
      const q = new THREE.Vector3(p.x - dir.z * off, 0, p.z + dir.x * off);
      q.y = Math.max(groundY(q.x, q.z), WATER_Y + 0.03) + 0.005;
      if (prev) quad(prev, q, new THREE.Vector3(p.x - q.x, 0, p.z - q.z));
      prev = q;
    });
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  const mesh = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }));
  mesh.receiveShadow = true;
  return mesh;
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
  wall(0.75, 0, 1.9, top + 0.3, 1.4, '#9a9fa2', 1);
  wall(0.65, -1.45, 1.3, 2.8, 1.3, '#aab0b2', 2);
  wall(0.65, 1.45, 1.3, 2.6, 1.3, '#8f9598', 3);
  wall(0.5, -2.4, 1.0, 1.8, 1.1, '#9a9fa2', 4);
  wall(0.5, 2.35, 1.0, 1.6, 1.1, '#aab0b2', 5);
  // Boulders at its feet and moss on top.
  for (const [bk, sd, y, r] of [[-0.15, -1.1, 0.05, 0.36], [-0.3, 1.15, 0.0, 0.32], [0.05, -1.75, 0.1, 0.42], [0.0, 1.8, 0.05, 0.38], [-0.55, -0.85, -0.05, 0.22]]) {
    const p = base.clone().addScaledVector(back, bk).addScaledVector(side, sd);
    batch.add(rock, '#a3a7a8', [p.x, y, p.z], [r, r * 0.8, r], [rand() * 3, rand() * 3, rand() * 3], true);
  }
  for (const [bk, sd, y, w] of [[0.9, -0.7, top + 0.02, 0.5], [0.8, 0.75, top - 0.02, 0.45], [0.7, -1.5, 2.52, 0.45], [0.7, 1.45, 2.32, 0.45]]) {
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

// A dirt road: worn earth, paler down the middle where most feet go, its ragged edges fading into the grass.
const ROAD_HALF = 0.34;
const VERGE = 0.16;
const DIRT = new THREE.Color('#cf9d66');
const WORN = new THREE.Color('#e0b987');
const GRASSY = new THREE.Color('#a3c35e');

const inWater = (p) => groundY(p.x, p.z) < -0.02;

/** Across road ri at sample i: [offset, colour] from its left verge to its right, the edges wandering in and out. */
function roadSection(ri, i) {
  const wander = (side) => ROAD_HALF * (0.8 + 0.4 * noise(i * 0.11 + side * 23.7 + ri * 7.3, ri * 3.1 + side * 5));
  const left = wander(0);
  const right = wander(1);
  const middle = (noise(i * 0.07 + ri * 11, 5.5) - 0.5) * 0.1;
  return [[-left - VERGE, GRASSY], [-left, DIRT], [middle, WORN], [right, DIRT], [right + VERGE, GRASSY]];
}

// What grows and lies along the road's edges, by how often: grass tufts mostly, pebbles, now and then a weed or a flower.
const ROADSIDE = [
  [0.5, ['PLANT_01_GrassShort', 0.4], ['PLANT_02_GrassMedium', 0.24]],
  [0.28, ['ROCK_01_Small', 0.07]],
  [0.13, ['PLANT_03_GrassTall', 0.24], ['PLANT_04_GrassSparse', 0.3]],
  [0.09, ['FLOWER_05_RedWildflower', 0.36], ['FLOWER_04_BlueBells', 0.34]],
];

/** Lays the roads into `batch`, with the stones along them; the grass, weeds and flowers go into `plants`. */
function buildRoads(batch, plants, rand) {
  roads.forEach((road, ri) => {
    const frames = road.pts.map((_, i) => road.frame(i));
    const sections = frames.map((_, i) => roadSection(ri, i));
    const edge = (f, off) => [f.p.x - f.dir.z * off, f.p.z + f.dir.x * off];
    const pos = [];
    const col = [];
    const lift = 0.012 + ri * 0.003;
    const corner = (i, k) => {
      const [off, color] = sections[i][k];
      const [x, z] = edge(frames[i], off);
      // The verges' outer edges lie down on the grass.
      pos.push(x, Math.max(0, groundY(x, z)) + (k === 0 || k === 4 ? 0.004 : lift), z);
      col.push(color.r, color.g, color.b);
    };
    for (let i = 1; i < frames.length; i++) {
      if (inWater(frames[i - 1].p) || inWater(frames[i].p)) continue;
      for (let k = 0; k < 4; k++) {
        for (const [a, b] of [[i - 1, k], [i, k + 1], [i, k], [i - 1, k], [i - 1, k + 1], [i, k + 1]]) corner(a, b);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.computeVertexNormals();
    batch.addRaw(g);
    // Along both edges: grass, pebbles, now and then a weed or a flower, and a few stones out on the road itself.
    for (let i = 1; i < frames.length; i += 2) {
      if (inWater(frames[i].p)) continue;
      for (const side of [-1, 1]) {
        if (rand() < 0.4) continue;
        const sec = sections[i];
        const [x, z] = edge(frames[i], side * (Math.abs(sec[side < 0 ? 1 : 3][0]) + 0.02 + rand() * 0.14));
        let roll = rand();
        const [, ...kinds] = ROADSIDE.find(([chance]) => (roll -= chance) < 0) || ROADSIDE[0];
        const [name, scale] = kinds[Math.floor(rand() * kinds.length)];
        for (let n = name.startsWith('ROCK') ? 2 + Math.floor(rand() * 2) : 1; n > 0; n--) {
          const px = x + (rand() - 0.5) * 0.12;
          const pz = z + (rand() - 0.5) * 0.12;
          putNature(name.startsWith('ROCK') ? batch : plants, name, [px, Math.max(0, groundY(px, pz)), pz], scale * (0.75 + rand() * 0.5), [0, rand() * TAU, 0]);
        }
      }
      if (rand() < 0.12) {
        const [x, z] = edge(frames[i], (rand() - 0.5) * ROAD_HALF);
        putNature(batch, 'ROCK_01_Small', [x, Math.max(0, groundY(x, z)) + lift - 0.01, z], 0.05 + rand() * 0.03, [0, rand() * TAU, 0]);
      }
    }
  });
}

/** Rail fences beside stretches of road: [road, from, to (fractions of its length), side (as edge offsets go)]. */
const ROAD_FENCES = [[3, 0.25, 0.7, 1], [4, 0.15, 0.55, -1], [1, 0.55, 0.85, 1]];

function roadFences(batch) {
  for (const [ri, from, to, side] of ROAD_FENCES) {
    const road = roads[ri];
    const last = road.pts.length - 1;
    const step = Math.max(1, Math.round(1.05 / road.step));
    let prev = null;
    for (let i = Math.round(from * last); i <= Math.round(to * last); i += step) {
      const { p, dir } = road.frame(i);
      const q = new THREE.Vector3(p.x - dir.z * side * 0.7, 0, p.z + dir.x * side * 0.7);
      q.y = Math.max(0, groundY(q.x, q.z));
      if (prev) railFence(batch, prev, q, '#c98a4b', { height: 0.42 });
      prev = q;
    }
  }
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

/**
 * The trees (see trees.js) each kind is drawn with: a few of each, in their own heights and greens. lite: the leafy
 * ones with cheaper crowns, for the trees out beyond the farm.
 */
const treeKinds = (lite) => ({
  pine: [[1, 1.6, PINE_NEEDLES], [2, 1.85, FRESH_PINE], [3, 1.7, PINE_NEEDLES], [4, 1.95, PINE_NEEDLES]].map(([seed, height, colors]) => pineTree(seed, height, colors)),
  round: [[1, 1.55, LEAVES], [2, 1.45, YELLOW_LEAVES], [3, 1.6, DEEP_LEAVES], [4, 1.5, LEAVES]].map(([seed, height, colors]) => roundTree(seed, height, colors, lite)),
  birch: [[1, 1.8], [2, 2.0]].map(([seed, height]) => birchTree(seed, height, lite)),
  bush: [[1, LEAVES], [2, YELLOW_LEAVES]].map(([seed, colors]) => bush(seed, 0.42, colors, lite)),
});

/**
 * Plants the forests: thick around the edges of the farmland, a few trees inside it.
 * extra: more [kind, x, y, z, scale, turn, tint] trees, such as the pines on the mountains.
 * Returns the tree meshes and the [x, z, radius] spots that darken the grass under them.
 */
function buildForest(rand, extra) {
  const spots = { pine: [], round: [], birch: [], bush: [] };
  // How far from the water's edge a point is.
  const bank = (x, z) => {
    const rv = river.nearest(x, z);
    return rv.d - riverHalf(rv.i);
  };
  const clearOf = (u, b, x, z) => {
    if (ringDistance(u, b) < 0.9) return false; // the farm and the ring road
    if (inMeadow(u, b, 0.5)) return false;
    for (const [cu, cb, r] of CLEARINGS) if (Math.hypot(u - cu, b - cb) < r + 0.3) return false;
    if (bank(x, z) < 0.55) return false;
    for (const road of roads) if (road.nearest(x, z).d < 0.75) return false;
    // Not on the faces of the rises or near their edges, nor anywhere else too steep to stand on.
    if (onRise(u, b, 0.7)) return false;
    const slope = Math.hypot(groundY(x + 0.2, z) - groundY(x - 0.2, z), groundY(x, z + 0.2) - groundY(x, z - 0.2)) / 0.4;
    return slope < 0.45;
  };
  // Just past what the view can reach (VIEW_BOUNDS): the lowest screen edge sees the ground 23.5 to the front.
  const cell = 0.95;
  for (let b = -26; b < 12.7; b += cell) {
    for (let u = VIEW_BOUNDS.left - 1.5; u < VIEW_BOUNDS.right + 1.5; u += cell) {
      const pu = u + (rand() - 0.5) * cell * 0.9;
      const pb = b + (rand() - 0.5) * cell * 0.9;
      const [x, z] = xz(pu, pb);
      const edge = farmEdge(pu, pb);
      // Out on the farmland, trees stand mostly along the river.
      const wet = edge > 0 ? 0 : smooth(2.8, 0.9, bank(x, z));
      const density = edge > 0 ? 0.25 + 0.7 * smooth(0, 2.5, edge) : 0.08 + 0.45 * wet + 0.25 * smooth(-2.5, 0, edge);
      if (rand() > density) continue;
      if (!clearOf(pu, pb, x, z)) continue;
      const y = groundY(x, z);
      const r = rand();
      let kind;
      if (edge < 0) kind = r < 0.08 + 0.35 * wet ? 'birch' : r < 0.45 ? 'pine' : r < 0.88 ? 'round' : 'bush';
      else if (y > 0.9 || pb > 8) kind = r < 0.7 ? 'pine' : 'round';
      else kind = r < 0.42 ? 'pine' : r < 0.86 ? 'round' : 'bush';
      const s = (kind === 'bush' ? 0.9 : 1.0) * (0.75 + rand() * 0.6) * (edge > 3 ? 1.2 : 1);
      spots[kind].push([x, y - 0.04, z, s, rand() * TAU, rand()]);
    }
  }
  for (const [kind, ...t] of extra) spots[kind].push(t);

  // Each tree takes one of its kind's models by where it stands. reach: canopy radius.
  const models = [];
  const lite = treeKinds(true);
  for (const [kind, list] of Object.entries(treeKinds(false))) {
    list.forEach(({ geometry, reach }, i) => {
      models.push({ geometry, far: lite[kind][i].geometry, reach, list: spots[kind].filter(([x, , z]) => Math.floor(hash(x * 3.7, z * 5.3) * list.length) === i) });
    });
  }

  const group = new THREE.Group();
  const shade = [];
  // The trees carry a normal for each face, so they look faceted without flat shading (see putNature in nature.js).
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 });
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const tint = new THREE.Color();
  // Only trees inside the sun's shadow box (see FarmScene) cast shadows, and only they get the full crowns.
  const nearFarm = ([x, , z]) => Math.abs(x) < SHADOW_REACH && Math.abs(z) < SHADOW_REACH;
  for (const { geometry, far, reach, list: all } of models) {
    for (const near of [true, false]) {
      const list = all.filter((t) => nearFarm(t) === near);
      if (!list.length) continue;
      const mesh = new THREE.InstancedMesh(near ? geometry : far, mat, list.length);
      list.forEach(([x, y, z, s, turn, k], i) => {
        m.compose(new THREE.Vector3(x, y, z), q.setFromAxisAngle(up, turn), new THREE.Vector3(s, s * (0.9 + k * 0.25), s));
        mesh.setMatrixAt(i, m);
        // Stretches of forest lean yellow-green or deep green, and each tree is a little lighter or darker.
        const br = 0.88 + k * 0.24;
        const lean = fbm(x * 0.16 + 31, z * 0.16 + 7);
        const yellow = smooth(0.55, 0.78, lean);
        const deep = smooth(0.42, 0.22, lean);
        mesh.setColorAt(i, tint.setRGB(br * (1 + 0.08 * yellow - 0.06 * deep), br * (1 + 0.02 * yellow - 0.05 * deep), br * (1 - 0.2 * yellow + 0.02 * deep)));
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

/** Spots kept bare of plants: [u, b, radius] round the buildings, the animals and the fields. */
const BARE = [
  [BARN_SPOT[0], BARN_SPOT[1], 1.3],
  [LAYOUT.farmhouse[0], LAYOUT.farmhouse[1], 1.4],
  [LAYOUT.silo[0], LAYOUT.silo[1], 0.65],
  [LAYOUT.windmill[0], LAYOUT.windmill[1], 0.8],
  [LAYOUT.coop[0], LAYOUT.coop[1] - 0.8, 1.5], // and the hens' run in front
  [LAYOUT.hutch[0], LAYOUT.hutch[1], 0.5],
  [LAYOUT.well[0], LAYOUT.well[1], 0.55],
  [LAYOUT.cart[0], LAYOUT.cart[1], 0.6],
  [LAYOUT.cherry[0], LAYOUT.cherry[1], 0.35],
  [LAYOUT.buffalo[0], LAYOUT.buffalo[1], 0.6],
  [LAYOUT.calf[0], LAYOUT.calf[1], 0.45],
  [LAYOUT.woodpile[0], LAYOUT.woodpile[1], 0.45],
  [LAYOUT.mud[0], LAYOUT.mud[1], 0.75],
  [LAYOUT.sign[0], LAYOUT.sign[1], 0.25],
  [LAYOUT.trough[0], LAYOUT.trough[1], 0.4],
  [LAYOUT.fields[0], LAYOUT.fields[1], 3.0],
  ...LAYOUT.footpaths.flat().map(([u, b]) => [u, b, 0.2]),
  ...LAYOUT.benches.map(([u, b]) => [u, b, 0.4]),
  ...LAYOUT.cows.map(([u, b]) => [u, b, 0.6]),
  ...LAYOUT.sheep.map(([u, b]) => [u, b, 0.4]),
  ...LAYOUT.bales.map(([u, b]) => [u, b, 0.35]),
  ...LAYOUT.haystacks.map(([u, b]) => [u, b, 0.55]),
];

// Models from the nature pack (see nature.js) and the scale each is drawn at.
const GRASS = [['PLANT_01_GrassShort', 0.45], ['PLANT_02_GrassMedium', 0.3], ['PLANT_04_GrassSparse', 0.32]];
// Colours for the grass in sunny yellow-green and in deeper green patches (see PALETTE in nature.js).
const GRASS_SUNNY = { Grass: '#a9d45a', GrassLight: '#d2e77e' };
const GRASS_DEEP = { Grass: '#62b44a', GrassLight: '#94d064' };
const FLOWERS = [['FLOWER_05_RedWildflower', 0.46], ['FLOWER_04_BlueBells', 0.44], ['FLOWER_02_YellowCluster', 0.46]];
const UNDERGROWTH = [['PLANT_10_BroadleafPlant', 0.34], ['PLANT_10_BroadleafPlant', 0.28], ['PLANT_09_WoodlandPlant', 0.45]];
const LOGS = [['TREE_14_Stump', 0.26], ['TREE_15_StumpBroken', 0.2], ['TREE_16_FallenLog', 0.22], ['TREE_18_HollowLog', 0.2]];
const MUSHROOMS = [['MUSH_01_RedSmall', 0.4], ['MUSH_02_BrownSmall', 0.4], ['MUSH_03_White', 0.32]];
const STONES = [['ROCK_01_Small', 0.28], ['ROCK_02_Medium', 0.17], ['ROCK_07_ClusterSmall', 0.14]];
// The boulders that break out of the faces of the rises.
const OUTCROPS = ['ROCK_03_BoulderLarge', 'ROCK_06_BoulderMossy', 'ROCK_05_BoulderFlat', 'ROCK_03_BoulderLarge'];

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
  const put = (solid, [name, scale], x, z, across = false, colors = undefined) => {
    const batch = !solid ? low : Math.abs(x) < SHADOW_REACH && Math.abs(z) < SHADOW_REACH ? near : far;
    const turn = across ? Math.PI / 4 + (rand() - 0.5) * 1.2 : rand() * TAU;
    putNature(batch, name, [x, groundY(x, z) - 0.01, z], scale * (0.8 + rand() * 0.4), [0, turn, 0], colors);
  };
  const cell = 0.5;
  for (let b = -12.5; b < 9.9; b += cell) {
    for (let u = VIEW_BOUNDS.left - 1; u < VIEW_BOUNDS.right + 1; u += cell) {
      const pu = u + (rand() - 0.5) * cell;
      const pb = b + (rand() - 0.5) * cell;
      const roll = rand();
      const edge = farmEdge(pu, pb);
      if (edge > 0.4) continue; // in the forest
      const [x, z] = xz(pu, pb);
      if (ringDistance(pu, pb) < -0.3) continue; // the farm inside the ring road has its own flower beds
      if (FARM_CLEAR.some(([cx, cz, r]) => Math.hypot(x - cx, z - cz) < r)) continue;
      if (BARE.some(([cu, cb, r]) => Math.hypot(pu - cu, pb - cb) < r)) continue;
      const rv = river.nearest(x, z);
      const bank = rv.d - riverHalf(rv.i);
      if (bank < 0.3) continue;
      const road = Math.min(...roads.map((r) => r.nearest(x, z).d));
      if (road < 0.5 || onRise(pu, pb, 0.45)) continue;
      // Thickest by the roads, the water and the trees, in patches elsewhere.
      const nearby = Math.max(smooth(1.3, 0.55, road), smooth(1.4, 0.4, bank), smooth(-2.2, 0, edge));
      const patch = smooth(0.45, 0.72, fbm(pu * 0.5 + 21, pb * 0.5 + 4));
      if (roll > 0.03 + 0.2 * patch + 0.42 * nearby) continue;
      const k = rand();
      // 0 out in the open, 1 where the forest starts.
      const woods = smooth(-1.6, 0, edge);
      if (fbm(pu * 0.35 + 40, pb * 0.35 + 17) > 0.62 - 0.22 * smooth(1.6, 0.5, bank) && k < 0.45) {
        // Flowers grow in drifts of one kind, more of them by the water.
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
        // The grass is sunnier or deeper green in patches, like the ground under it.
        const lean = fbm(pu * 0.15 + 47, pb * 0.15 + 13);
        put(false, pick(GRASS, rand()), x, z, false, lean > 0.6 ? GRASS_SUNNY : lean < 0.38 ? GRASS_DEEP : undefined);
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
    const b = 12.5 + rand() * 1.6 + (Math.abs(u - RIVER[0][0]) < 3 ? 0.8 : 0);
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
    const b = 17.4 + rand() * 2;
    const [x, z] = xz(u, b);
    batch.addRaw(mountain(x, -3, z, 4.6 + rand() * 1.8, 6.2 + rand() * 1.8, 0.55, Math.floor(rand() * 1000)), true);
  }
  return { group: batch.build({ castShadow: false }), trees };
}

// ── Clouds ──────────────────────────────────────────────────────

const CLOUDS = [
  // [u, b, height, size]: high in the sky, and lower ones resting between the peaks.
  [-12, 16.9, 5.5, 1.6], [-3, 18.9, 6.0, 1.3], [6, 17.9, 5.2, 1.8], [15, 16.9, 6.2, 1.4], [-20, 15.9, 5.0, 1.2],
  [-8, 14.5, 4.2, 1.5], [3, 14.9, 4.4, 1.7], [12, 14.3, 4.0, 1.4], [-17, 14.7, 4.3, 1.6], [20, 14.9, 4.1, 1.5],
];

// ── Assembly ────────────────────────────────────────────────────

export function buildCountryside() {
  const rand = seeded(20251010);
  const group = new THREE.Group();

  const roadBatch = new Batch();
  const roadside = new Batch();
  buildRoads(roadBatch, roadside, rand);
  group.add(roadBatch.build({ castShadow: false }));

  const water = buildRiver();
  group.add(water.mesh);

  const batch = new Batch();
  const fall = buildWaterfall(batch);
  group.add(fall.group);
  buildCliffs(batch, rand);
  roadFences(batch);
  group.add(buildBanks());
  const bridges = bridgeSpans();
  const built = addBuildings(batch, { layout: LAYOUT, at, groundY, rand, bridges, river, riverHalf, waterY: WATER_Y });
  group.add(built.group);
  group.add(batch.build());

  const mountains = buildMountains(rand);
  group.add(mountains.group);
  const forest = buildForest(rand, mountains.trees);
  group.add(forest.group);
  group.add(buildGround(forest.shade));
  const cover = buildGroundCover(forest.shade);
  // The roadside grass and flowers go with the rest of the plants, which the fast setting hides.
  cover.plants.add(roadside.build({ castShadow: false }));
  group.add(cover.group);

  const animals = addAnimals({ layout: LAYOUT, at, groundY, river, riverHalf, waterY: WATER_Y, coopYard: built.coopYard, bridges });
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
