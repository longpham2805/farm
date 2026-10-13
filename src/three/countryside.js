// The valley around the farm: rolling grass, a dirt road round the farm and roads off it, a river with
// a waterfall and two bridges, farm buildings, fields, a meadow, forests and mountains. It is built once;
// only the farm inside the ring road (plots, fence, pond) and the barn are rebuilt when visiting a neighbour.
import * as THREE from 'three';
import { Batch } from './batch.js';
import { cloud, FARM_CLEAR, BARN_SPOT, ringAt, ringDistance, ringPath } from './farm.js';
import { addBuildings, placeBuildings } from './buildings.js';
import { addAnimals } from './animals.js';
import { glowTexture } from './textures.js';
import { pineTree, roundTree, birchTree, bush, LEAVES, YELLOW_LEAVES, DEEP_LEAVES, PINE_NEEDLES, FRESH_PINE } from './trees.js';
import { putNature, natureSize, railFence } from './nature.js';
import { seeded } from '../util.js';
import { buildBackdrop, backdropBounds, shadowCatcher } from './backdrop.js';
import { RIVER as RIVER_MAP, WATER_Y as MAP_WATER_Y, CHANNEL, ROCKY_BANKS, LAND, FOREST, WATERFALLS } from './valleyMap.js';

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

/** How far the player can look around, in screen units: u across, up the screen. It is the painted backdrop's frame. */
export const VIEW_BOUNDS = backdropBounds();

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

// The river's course, from the foot of the waterfall to where it leaves the valley (RIVER in valleyMap.js).
const RIVER = RIVER_MAP.map(([u, b]) => [u, b]);

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

// While the valley is rebuilt step by step to the reference design, the old scenery is switched off here. Each step
// that rewrites a part turns it back on (or deletes the old code and its flag).
const STAGE = { forest: false, groundCover: false, roadside: false, riverRocks: false, painted: true };

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
  /**
   * closed: the path comes back round to its start, whose point it repeats at the end of pts.
   * cell: nearest() is exact up to this far from the path.
   */
  constructor(points, step = 0.15, closed = false, cell = 3) {
    this.closed = closed;
    this.curve = new THREE.CatmullRomCurve3(points.map(([u, b]) => at(u, b)), closed, 'centripetal');
    this.length = this.curve.getLength();
    this.pts = this.curve.getSpacedPoints(Math.ceil(this.length / step));
    this.step = this.length / (this.pts.length - 1);
    this.cell = cell;
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

  /** Nearest sample to (x, z): { d, i }. Exact up to `cell` away; farther may return d = Infinity. */
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

const river = new Path(RIVER, 0.15, false, 5);
// Half the river's width at each sample, eased between the widths the map gives at its points.
const riverHalves = river.pts.map((p) => {
  const [u, b] = toUB(p.x, p.z);
  let best = Infinity;
  let half = RIVER_MAP[0][2];
  for (let k = 1; k < RIVER_MAP.length; k++) {
    const [u0, b0, w0] = RIVER_MAP[k - 1];
    const [u1, b1, w1] = RIVER_MAP[k];
    const du = u1 - u0;
    const db = b1 - b0;
    const t = Math.max(0, Math.min(1, ((u - u0) * du + (b - b0) * db) / (du * du + db * db)));
    const d = Math.hypot(u - u0 - du * t, b - b0 - db * t);
    if (d < best) {
      best = d;
      half = w0 + (w1 - w0) * smooth(0, 1, t);
    }
  }
  return half;
});
const riverHalf = (i) => riverHalves[i] + 0.05 * Math.sin(i * 0.05);

/** Which bank of the river world point (x, z) is on, as seen from sample i: 1 or -1, the way bank offsets go. */
function riverSide(i, x, z) {
  const { p, dir } = river.frame(i);
  return (z - p.z) * dir.x - (x - p.x) * dir.z >= 0 ? 1 : -1;
}
/** Height of the grassy lip of bank s at sample i, wandering between the bounds in CHANNEL. */
const lipHeight = (i, s) => CHANNEL.lip[0] + (CHANNEL.lip[1] - CHANNEL.lip[0]) * smooth(0.25, 0.75, noise(i * 0.035 + (s > 0 ? 11 : 37), 2.1));
/** How far the lip of bank s is from the river's middle at sample i. */
const lipOffset = (i, s) => riverHalf(i) + CHANNEL.face + (noise(i * 0.05 + s * 5.3, 7.7) - 0.5) * 0.3;
// The ring road round the farm first, then the roads off it.
const roads = [
  new Path(ringPath(0, 0.35), 0.2, true),
  ...ROADS.map((pts) => new Path(pts, 0.2)),
];

// ── Ground ──────────────────────────────────────────────────────

const GRID = { u0: -23, u1: 23, b0: -30, b1: 27, step: 0.25 };
const NU = Math.round((GRID.u1 - GRID.u0) / GRID.step) + 1;
const NB = Math.round((GRID.b1 - GRID.b0) / GRID.step) + 1;
const WATER_Y = MAP_WATER_Y;

/** Whether map point (u, b) is inside a [[u, b], …] polygon. */
function inPoly(poly, u, b) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [ui, bi] = poly[i];
    const [uj, bj] = poly[j];
    if (bi > b !== bj > b && u < ((uj - ui) * (b - bi)) / (bj - bi) + ui) inside = !inside;
  }
  return inside;
}

/** How far map point (u, b) is from the nearest edge of a polygon. */
function polyEdge(poly, u, b) {
  let best = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [u0, b0] = poly[j];
    const du = poly[i][0] - u0;
    const db = poly[i][1] - b0;
    const t = Math.max(0, Math.min(1, ((u - u0) * du + (b - b0) * db) / (du * du + db * db)));
    best = Math.min(best, Math.hypot(u - u0 - du * t, b - b0 - db * t));
  }
  return best;
}

/** How far inside any of the polygons (u, b) is: 0 outside them. */
const depthIn = (polys, u, b) => Math.max(0, ...polys.map((poly) => (inPoly(poly, u, b) ? polyEdge(poly, u, b) : 0)));

/** 1 on top of the cliff round the waterfall, easing to 0 at the foot of its face. */
function onCliff(u, b) {
  const { poly, edge, height, wobble } = LAND.cliff;
  const d = (inPoly(poly, u, b) ? -1 : 1) * polyEdge(poly, u, b) + (noise(u * 0.7 + height * 5, b * 0.7 + 1.3) - 0.5) * 2 * wobble;
  return 1 - smooth(0, edge, d);
}

/**
 * Height of the land before the river is cut in (LAND in valleyMap.js): level round the farm, climbing into hills at
 * the back, the left and the front, rolling in low mounds under the forest, with the cliff round the waterfall and a
 * low ledge along the far bank.
 */
function landHeight(u, b) {
  let h = 0;
  for (const L of Object.values(LAND)) {
    if (L.kind === 'ramp') {
      const [a, o] = L.along === 'b' ? [b, u] : [u, b];
      // Fading out over a few steps past either end of its stretch.
      const span = smooth(L.within[0] - 3, L.within[0], o) * smooth(L.within[1] + 3, L.within[1], o);
      if (span <= 0) continue;
      // The foot of each slope wanders, and the hills swell and dip along it.
      const t = smooth(L.from, L.to, a + (noise(o * 0.22 + L.from, 3.3) - 0.5) * 2.4);
      if (t <= 0 && L.h0 > 0) continue;
      h = Math.max(h, (L.h0 + (L.h1 - L.h0) * t) * span * (0.8 + 0.45 * fbm(u * 0.18 + 2, b * 0.18 + 5)));
    } else {
      // The edge wanders in and out, so the shelf does not look cut with a ruler.
      const wobble = (noise(u * 0.7 + L.height * 5, b * 0.7 + 1.3) - 0.5) * 2 * L.wobble;
      const d = (inPoly(L.poly, u, b) ? -1 : 1) * polyEdge(L.poly, u, b) + wobble;
      h = Math.max(h, L.height * (1 - smooth(0, L.edge, d)));
    }
  }
  h += smooth(0, 3, depthIn(FOREST.dense, u, b)) * 0.6 * fbm(u * 0.35 + 9, b * 0.35 + 4);
  h += smooth(0, 2, depthIn(FOREST.medium, u, b)) * 0.3 * fbm(u * 0.4 + 1, b * 0.4 + 8);
  return h;
}

/**
 * Cuts the river's channel into the land (CHANNEL in valleyMap.js). Outside the lip of each bank the ground dips gently
 * towards it; inside, under the steep face that buildBankFaces stands there, it drops away to the bed. The farm inside
 * the ring and the cliff round the waterfall stand untouched.
 * Returns the height and how close the point is to a bank's lip (1 at the lip): the ground there stays grassy, as its
 * steep drop is hidden under the bank's face.
 */
function cutRiver(h, u, b) {
  const [x, z] = xz(u, b);
  const { d, i } = river.nearest(x, z);
  if (d === Infinity) return { h, lip: 0 };
  const s = riverSide(i, x, z);
  const top = lipHeight(i, s);
  const out = d - lipOffset(i, s); // from the lip, outwards
  let cut;
  if (out >= 0) cut = Math.min(h, top + 0.1 * out + 0.05 * out * out);
  else if (out > -0.25) cut = top + (top - WATER_Y) * 1.8 * out; // just under the face's top, below it
  else cut = WATER_Y - CHANNEL.bed;
  cut = Math.min(h, cut);
  const keep = Math.max(smooth(0.5, 0.9, onCliff(u, b)), smooth(-0.4, -1.2, ringDistance(u, b)));
  return { h: cut + (h - cut) * keep, lip: smooth(0.45, 0, Math.abs(out)) };
}

const heights = new Float32Array(NU * NB);
const lipness = new Float32Array(NU * NB);
for (let j = 0; j < NB; j++) {
  for (let i = 0; i < NU; i++) {
    const u = GRID.u0 + i * GRID.step;
    const b = GRID.b0 + j * GRID.step;
    const r = cutRiver(landHeight(u, b), u, b);
    heights[j * NU + i] = r.h;
    lipness[j * NU + i] = r.lip;
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

/** How steep the drawn ground is at world (x, z): rise over run. */
const slopeAt = (x, z) => Math.hypot(groundY(x + 0.2, z) - groundY(x - 0.2, z), groundY(x, z + 0.2) - groundY(x, z - 0.2)) / 0.4;

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
  // The design's greens: bright round the farm, plainer out on the meadows, forest green up the hills and darker
  // still on the forest floor, with sunny yellow-green patches in the open.
  const farm = new THREE.Color('#91cd45');
  const meadow = new THREE.Color('#75b936');
  const sunny = new THREE.Color('#a4d84d');
  const hill = new THREE.Color('#5a9d30');
  const floor = new THREE.Color('#367d35');
  const under = new THREE.Color('#2f6d2e');
  const trodden = new THREE.Color('#c2b46a');
  const mud = new THREE.Color('#9c8458');
  const rock = new THREE.Color('#a4a098');
  const earth = new THREE.Color('#9b8261');
  const dark = new THREE.Color('#625f53');
  const cliff = new THREE.Color();
  const c = new THREE.Color();
  for (let j = 0; j < NB; j++) {
    for (let i = 0; i < NU; i++) {
      const k = j * NU + i;
      const u = GRID.u0 + i * GRID.step;
      const b = GRID.b0 + j * GRID.step;
      const [x, z] = xz(u, b);
      const h = heights[k];
      // How steep the ground is here: the cliff, the ledge and the river banks show bare rock and earth.
      const hu = heights[j * NU + Math.min(NU - 1, i + 1)] - heights[j * NU + Math.max(0, i - 1)];
      const hb = heights[Math.min(NB - 1, j + 1) * NU + i] - heights[Math.max(0, j - 1) * NU + i];
      const slope = Math.hypot(hu, hb) / (2 * GRID.step);
      pos[k * 3] = x;
      pos[k * 3 + 1] = h;
      pos[k * 3 + 2] = z;
      const ring = ringDistance(u, b);
      c.copy(farm).lerp(meadow, smooth(1, 4.5, ring));
      c.lerp(sunny, smooth(0.55, 0.8, fbm(u * 0.16 + 47, b * 0.16 + 13)) * 0.55 * smooth(0.5, 3, ring));
      c.lerp(hill, smooth(0.15, 1.6, h) * 0.8);
      c.lerp(hill, smooth(0, 1.5, depthIn(FOREST.medium, u, b)) * 0.6);
      c.lerp(floor, smooth(0, 2.5, depthIn(FOREST.dense, u, b)) * 0.85);
      c.lerp(under, shade[k] * 0.6);
      // Trodden grass either side of the roads, so they fade into it.
      const road = Math.min(...roads.map((r) => r.nearest(x, z).d));
      c.lerp(trodden, smooth(0.75, 0.35, road) * 0.45);
      cliff.copy(rock).lerp(earth, smooth(0.3, 0.7, fbm(u * 0.6 + 5, b * 0.6 + 2)) * 0.6).lerp(dark, smooth(2, 5, slope) * 0.5);
      c.lerp(cliff, smooth(1.1, 2.0, slope) * 0.9 * (1 - lipness[k]));
      c.lerp(mud, smooth(WATER_Y + 0.02, WATER_Y - 0.12, h));
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
 * The cliff round the waterfall (LAND.cliff in valleyMap.js): pillars of warm grey rock stood shoulder to shoulder
 * along its face, some short of the top so it climbs in steps, with moss on some tops and a gap for the fall.
 */
function buildCliffFaces(batch, rand) {
  const { poly, height } = LAND.cliff;
  const greys = ['#b3aa9a', '#a4a098', '#9b9385', '#c2b8a5', '#aaa294'];
  const moss = new THREE.DodecahedronGeometry(1, 0);
  const fall = WATERFALLS.main.at;
  for (let e = 0; e < poly.length; e++) {
    const [u0, b0] = poly[e];
    const [u1, b1] = poly[(e + 1) % poly.length];
    const len = Math.hypot(u1 - u0, b1 - b0);
    // Outwards, away from the cliff top: the polygon runs counter-clockwise on the map.
    const nu = (b1 - b0) / len;
    const nb = -(u1 - u0) / len;
    for (let t = 0; t < len;) {
      const w = 0.6 + rand() * 0.5;
      const mu = u0 + ((u1 - u0) * (t + w / 2)) / len;
      const mb = b0 + ((b1 - b0) * (t + w / 2)) / len;
      t += w * 0.75;
      if (Math.hypot(mu - fall[0], mb - fall[1] - 0.5) < WATERFALLS.main.width * 0.55 + 0.2) continue;
      const out = 0.15 + rand() * 0.15;
      const [x, z] = xz(mu + nu * out, mb + nb * out);
      const low = groundY(...xz(mu + nu * 0.7, mb + nb * 0.7));
      if (height - low < 0.4) continue;
      // Most reach the top; some stop short and some stand a little proud of it.
      const top = height + (rand() < 0.3 ? -0.5 - rand() * 0.9 : (rand() - 0.3) * 0.35);
      const h = top - low + 0.15;
      const [ax, az] = xz(u0, b0);
      const [bx, bz] = xz(u1, b1);
      const turn = Math.atan2(-(bz - az), bx - ax) + (rand() - 0.5) * 0.3;
      batch.add(rockBlock(Math.floor(rand() * 1000)), greys[Math.floor(rand() * greys.length)], [x, low - 0.15 + h / 2, z], [w * 1.15, h, 0.55 + rand() * 0.25], [0, turn, 0], true);
      if (rand() < 0.35) batch.add(moss, '#5a9d30', [x, low - 0.15 + h + 0.02, z], [w * 0.45, 0.07, 0.25], [0, turn, 0], true);
    }
  }
}

/**
 * The river's banks: a steep, faceted face down each side from the grassy lip into the water, bare earth or, along
 * the ROCKY_BANKS stretches, grey rock with boulders at its foot. The ground's own triangles drop away beneath it
 * (see cutRiver), so this is what the camera sees of the channel.
 */
function buildBankFaces(batch) {
  const pos = [];
  const col = [];
  // One flat colour to each band of facets, lip to water: dry earth, darker earth, wet earth (or rock).
  const soil = ['#b08455', '#916a44', '#6d5036'].map((h) => new THREE.Color(h));
  const stone = ['#b3ada1', '#9c968a', '#7a756b'].map((h) => new THREE.Color(h));
  // Rows across the face: [fraction of the way from the water's edge out to the lip, fraction of the way up to it].
  const ROWS = [[1.06, 1.0], [0.62, 0.9], [0.2, 0.5], [-0.25, -0.35]];
  const rocky = (u, b) => Math.max(0, ...ROCKY_BANKS.map(([cu, cb, r]) => smooth(r, r * 0.45, Math.hypot(u - cu, b - cb))));
  const rand = seeded(4242);
  const lump = new THREE.DodecahedronGeometry(1, 0);
  const tri = new THREE.Vector3();
  const e1 = new THREE.Vector3();
  const e2 = new THREE.Vector3();
  for (const s of [-1, 1]) {
    // Every third sample, so the face breaks into broad low-poly facets.
    const rows = [];
    for (let i = 0; i < river.pts.length; i += 3) {
      const { p, dir } = river.frame(i);
      const [u, b] = toUB(p.x, p.z);
      const w = riverHalf(i);
      const lip = lipOffset(i, s);
      const top = lipHeight(i, s);
      const nx = -dir.z * s;
      const nz = dir.x * s;
      const rk = rocky(u, b);
      rows.push(ROWS.map(([f, g], r) => {
        const inner = r === 1 || r === 2;
        const off = w + (lip - w) * f + (inner ? (hash(i * 0.31 + r, s * 7.7) - 0.5) * 0.1 : 0);
        const y = WATER_Y + (top - WATER_Y) * g + (inner ? (hash(i * 0.53, r + s * 3) - 0.5) * 0.08 : 0) + (r === 0 ? 0.012 : 0);
        return { v: new THREE.Vector3(p.x + nx * off, y, p.z + nz * off), rk, inward: new THREE.Vector3(-nx, 0, -nz) };
      }));
      // Boulders along the rocky stretches, and now and then a stone at the waterline elsewhere.
      if (rand() < 0.15 + 0.75 * rk) {
        const off = w + (lip - w) * (rand() * 0.75) - 0.05;
        const r = (0.1 + rand() * 0.2) * (0.6 + 0.6 * rk);
        const shade = stone[Math.floor(rand() * 3)];
        batch.add(lump, `#${shade.getHexString()}`, [p.x + nx * off, WATER_Y + (top - WATER_Y) * rand() * 0.45, p.z + nz * off], [r, r * 0.75, r * 0.9], [rand() * 3, rand() * 3, rand() * 3], true);
      }
    }
    for (let k = 1; k < rows.length; k++) {
      for (let r = 0; r < ROWS.length - 1; r++) {
        const tris = [[rows[k - 1][r], rows[k][r], rows[k][r + 1]], [rows[k - 1][r], rows[k][r + 1], rows[k - 1][r + 1]]];
        tris.forEach(([a, b2, c], t) => {
          // Each facet a little lighter or darker than its neighbours.
          const color = soil[r].clone().lerp(stone[r], (a.rk + b2.rk + c.rk) / 3).multiplyScalar(0.9 + 0.2 * hash(k * 1.7 + t, r * 3.1 + s));
          // Face the water.
          e1.subVectors(b2.v, a.v);
          e2.subVectors(c.v, a.v);
          tri.crossVectors(e1, e2);
          const corners = tri.dot(a.inward) + tri.y * 0.2 >= 0 ? [a, b2, c] : [a, c, b2];
          for (const q of corners) {
            pos.push(q.v.x, q.v.y, q.v.z);
            col.push(color.r, color.g, color.b);
          }
        });
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  const mesh = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }));
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  return mesh;
}

/** The main waterfall (WATERFALLS.main in valleyMap.js) pours from a gap in the cliff into the river's pool. */
function buildWaterfall(batch) {
  const { at: [fu, fb], drop, width } = WATERFALLS.main;
  // Into the cliff: up the map.
  const back = at(0, 1).normalize();
  const side = new THREE.Vector3(-back.z, 0, back.x);
  const turn = Math.atan2(back.x, back.z);
  const top = WATER_Y + drop;
  const base = at(fu, fb + 0.15);
  const rock = new THREE.DodecahedronGeometry(1, 0);
  const rand = seeded(31);
  // Boulders where it lands.
  for (const [bk, sd, y, r] of [[-0.15, -0.95, 0.0, 0.34], [-0.3, 1.0, -0.05, 0.3], [0.05, -1.5, 0.05, 0.4], [0.0, 1.55, 0.0, 0.36], [-0.55, -0.8, -0.1, 0.22]]) {
    const p = base.clone().addScaledVector(back, bk).addScaledVector(side, sd);
    batch.add(rock, '#a4a098', [p.x, y, p.z], [r, r * 0.8, r], [rand() * 3, rand() * 3, rand() * 3], true);
  }

  // Falling water: a gently curved sheet whose stripes scroll down.
  const tex = fallTexture();
  tex.repeat.set(1, 1.8);
  const sheet = new THREE.PlaneGeometry(width * 0.8, 1, 1, 10);
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
    const q = base.clone().addScaledVector(side, (k / 5 - 0.5) * width).addScaledVector(back, -0.3 - (k % 2) * 0.22);
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

// Down in the river's channel: the roads cross it on bridges.
const inWater = (p) => groundY(p.x, p.z) < WATER_Y + 0.1;

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
      pos.push(x, groundY(x, z) + (k === 0 || k === 4 ? 0.004 : lift), z);
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
          putNature(name.startsWith('ROCK') ? batch : plants, name, [px, groundY(px, pz), pz], scale * (0.75 + rand() * 0.5), [0, rand() * TAU, 0]);
        }
      }
      if (rand() < 0.12) {
        const [x, z] = edge(frames[i], (rand() - 0.5) * ROAD_HALF);
        putNature(batch, 'ROCK_01_Small', [x, groundY(x, z) + lift - 0.01, z], 0.05 + rand() * 0.03, [0, rand() * TAU, 0]);
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
      q.y = groundY(q.x, q.z);
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
        const ends = [road.pts[Math.max(0, first - 2)].clone(), road.pts[Math.min(road.pts.length - 1, i + 1)].clone()];
        for (const e of ends) e.y = groundY(e.x, e.z);
        spans.push(ends);
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
    // Not on the cliff's face nor anywhere else too steep to stand on.
    return slopeAt(x, z) < 0.45;
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
      if (road < 0.5 || slopeAt(x, z) > 0.6) continue;
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
  buildCliffFaces(batch, rand);
  group.add(buildBankFaces(batch));
  roadFences(batch);
  const bridges = bridgeSpans();
  const built = addBuildings(batch, { layout: LAYOUT, at, groundY, rand, bridges, river, riverHalf, waterY: WATER_Y, riverRocks: STAGE.riverRocks });
  group.add(built.group);
  group.add(batch.build());

  const forest = STAGE.forest ? buildForest(rand, []) : { group: new THREE.Group(), shade: [] };
  group.add(forest.group);
  group.add(buildGround(forest.shade));
  const cover = STAGE.groundCover ? buildGroundCover(forest.shade) : { group: new THREE.Group(), plants: new THREE.Group() };
  if (!STAGE.groundCover) cover.group.add(cover.plants);
  // The roadside grass and flowers go with the rest of the plants, which the fast setting hides.
  if (STAGE.roadside) cover.plants.add(roadside.build({ castShadow: false }));
  group.add(cover.group);

  const animals = addAnimals({ layout: LAYOUT, at, groundY, river, riverHalf, waterY: WATER_Y, coopYard: built.coopYard, bridges });
  group.add(animals.group);

  // Trying out a painted backdrop: it stands in for everything built above, which is kept out of view.
  // The buildings redone for it stand on it, and shadows fall on it wherever the sun works them out (SHADOW_BOX).
  const backdrop = STAGE.painted ? buildBackdrop() : null;
  const placed = backdrop ? placeBuildings({ at }) : null;
  if (backdrop) {
    for (const child of [...group.children]) group.remove(child);
    group.add(backdrop.mesh, shadowCatcher(SHADOW_BOX * 3), placed.group);
  }

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
    backdrop?.update(t);
    placed?.update(t);
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
  // The painting's tiles load for the sharp or the fast setting.
  const setDetail = (high) => backdrop?.setDetail(high);
  return { group, update, plants: cover.plants, setDetail };
}
