// The farm in the middle of the valley: the plots, the barn, the fence round them with its gates, lamps,
// benches and flower beds, and the frog's pond. It is rebuilt with other colours when visiting a neighbour;
// the valley around it, the ring road included, stays.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { worldMat } from './materials.js';
import { Batch, gableGeometry, shingleRoof } from './batch.js';
import { addNature, railFence, steppingStones } from './nature.js';
import { seeded } from '../util.js';

export const SPACING = 1.32;
export const PLOT = 1.16;
export const PLANT_SCALE = 1.16;
export const SOIL_TOP = 0.14;

const TAU = Math.PI * 2;
const S = Math.SQRT1_2;

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

// ── The ring road ───────────────────────────────────────────────
// countryside.js lays the road and the farm fences its inside. The ring is square to the plots, so on screen it
// is a big diamond round them like a plot, with rounded corners at the back, the front and either side. The map
// places things in units u across the screen and b up it (see xz in countryside.js).

/** The ring road's middle line: a square `half` from the middle to each side, its corners rounded to `corner`. */
export const RING = { half: 5.35, corner: 1.3 };

const toWorld = (u, b) => [(u - b) * S, -(u + b) * S];
const toMap = (x, z) => [(x - z) * S, -(x + z) * S];

/** How far a map point [u, b] is outside the ring road's middle line (negative inside). */
export function ringDistance(u, b) {
  const [x, z] = toWorld(u, b);
  const qx = Math.abs(x) - (RING.half - RING.corner);
  const qz = Math.abs(z) - (RING.half - RING.corner);
  return Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0) - RING.corner;
}

/**
 * Where the ring `inset` in from the road's middle crosses the line from the middle of the farm towards screen
 * angle a (0 = the right corner, π/2 = the back corner, π = the left one): [u, b].
 */
export function ringAt(a, inset = 0) {
  let lo = 0;
  let hi = 2 * RING.half;
  for (let k = 0; k < 40; k++) {
    const mid = (lo + hi) / 2;
    if (ringDistance(Math.cos(a) * mid, Math.sin(a) * mid) < -inset) lo = mid;
    else hi = mid;
  }
  return [Math.cos(a) * lo, Math.sin(a) * lo];
}

/** Points about `step` apart all round the ring `inset` in from the road's middle, as [u, b]. */
export function ringPath(inset = 0, step = 0.3) {
  const c = RING.half - RING.corner;
  const h = RING.half - inset;
  const r = RING.corner - inset;
  const out = [];
  const line = (x0, z0, x1, z1) => {
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, z1 - z0) / step));
    for (let k = 0; k < n; k++) out.push(toMap(x0 + ((x1 - x0) * k) / n, z0 + ((z1 - z0) * k) / n));
  };
  // A quarter of a circle round (cx, cz), from angle a in the world's x-z plane on to a - π/2.
  const arc = (cx, cz, a) => {
    const n = Math.max(2, Math.ceil((r * Math.PI) / 2 / step));
    for (let k = 0; k < n; k++) out.push(toMap(cx + r * Math.cos(a - (Math.PI / 2) * (k / n)), cz + r * Math.sin(a - (Math.PI / 2) * (k / n))));
  };
  line(-h, -c, -h, c);
  arc(-c, c, Math.PI);
  line(-c, h, c, h);
  arc(c, c, Math.PI / 2);
  line(h, c, h, -c);
  arc(c, -c, 0);
  line(c, -h, -c, -h);
  arc(-c, -c, -Math.PI / 2);
  return out;
}

/**
 * The ring's four straight sides `inset` in from the road's middle, each stopping `margin` short of the corners:
 * world [from, to] pairs, from the back left side (top left on screen) round by the front.
 */
function ringSides(inset, margin) {
  const e = RING.half - RING.corner - margin;
  const h = RING.half - inset;
  return [[-h, -e, -h, e], [-e, h, e, h], [h, e, h, -e], [e, -h, -e, -h]]
    .map(([x0, z0, x1, z1]) => [new THREE.Vector3(x0, 0, z0), new THREE.Vector3(x1, 0, z1)]);
}

// The fence stands this far in from the road's middle, open at the four corners: each run stops GATE short of the
// corner's curve.
const FENCE = 0.62;
const GATE = 0.25;

/** Where the barn stands, in map units: across the ring road from the back corner. */
export const BARN_SPOT = [0, 8.3];
const BARN_SIZE = 1.5;

const BARN_AT = toWorld(...BARN_SPOT);
// The frog's pond, just inside the front corner: world x, z.
const POND = [3.65, 3.65];
/** Where the pond and the barn stand: [x, z, radius] spots the valley's grass and flowers keep off. */
export const FARM_CLEAR = [[POND[0], POND[1], 0.8], [BARN_AT[0], BARN_AT[1], 1.5]];

export const plotCenter = (index) => {
  const r = Math.floor(index / 4);
  const c = index % 4;
  return new THREE.Vector3((c - 1.5) * SPACING, 0, (r - 1.5) * SPACING);
};

// Trees, flowers, rocks and fences go into one merged mesh each, so they draw in a single call. The flower beds
// hold a few hundred flowers, so each is cut down to what shows at its size.
const STEM = new THREE.CylinderGeometry(0.012, 0.012, 0.16, 5, 1, true);
const PETAL = new THREE.SphereGeometry(1, 5, 3);
const BOX = new THREE.BoxGeometry(1, 1, 1);
const GABLE = gableGeometry();
const POST = new THREE.CylinderGeometry(1, 1, 1, 6);
const CAP = new THREE.ConeGeometry(1, 1, 4);

function flower(batch, x, z, color) {
  batch.add(STEM, '#4f9a3a', [x, 0.08, z]);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU;
    batch.add(PETAL, color, [x + Math.cos(a) * 0.035, 0.17, z + Math.sin(a) * 0.035], [0.03, 0.015, 0.03]);
  }
  batch.add(PETAL, '#ffe066', [x, 0.175, z], 0.022);
}

/** A black street lamp at p (a world point): its post goes into `batch` and the lantern's glass into `glow`. */
export function streetLamp(batch, glow, p) {
  const dark = '#3d4148';
  batch.push(p.x, p.y, p.z, Math.PI / 4);
  batch.add(POST, dark, [0, 0.04, 0], [0.06, 0.08, 0.06], null, true);
  batch.add(POST, dark, [0, 0.42, 0], [0.02, 0.8, 0.02], null, true);
  batch.add(BOX, dark, [0, 0.82, 0], [0.13, 0.025, 0.13]);
  batch.add(BOX, dark, [0, 0.94, 0], [0.14, 0.025, 0.14]);
  batch.add(CAP, dark, [0, 1.0, 0], [0.11, 0.09, 0.11], [0, Math.PI / 4, 0], true);
  batch.pop();
  glow.push(p.x, p.y, p.z, Math.PI / 4);
  glow.add(BOX, '#fff1b8', [0, 0.88, 0], [0.1, 0.11, 0.1]);
  glow.pop();
}

/** Builds the lamps' glass (see streetLamp), lit from inside. */
export function buildGlow(glow) {
  const group = glow.build({ castShadow: false });
  group.traverse((o) => {
    if (!o.material) return;
    o.material.emissive.set('#ffc85a');
    o.material.emissiveIntensity = 0.65;
  });
  return group;
}

/** The big barn: its gable end to the front with a loft door, boarded walls, white trim and crossed double doors. */
function barn(theme) {
  const batch = new Batch();
  const white = '#fff8ef';
  const shadeOf = (color, k) => `#${new THREE.Color(color).multiplyScalar(k).getHexString()}`;
  const door = shadeOf(theme.barn, 0.72);
  const w = 1.1;
  const d = 0.95;
  const h = 0.75;
  const rise = 0.5;
  batch.add(BOX, '#c9c2b4', [0, 0.03, 0], [w + 0.08, 0.06, d + 0.08]);
  batch.add(BOX, theme.barn, [0, h / 2, 0], [w, h, d]);
  batch.add(GABLE, theme.barn, [0, h, 0], [d, rise, w], [0, Math.PI / 2, 0], true);
  // The walls are boarded: battens up them every 0.1, round the doors, the loft door and the windows.
  const batten = shadeOf(theme.barn, 0.84);
  for (let x = -w / 2 + 0.09; x < w / 2 - 0.05; x += 0.1) {
    for (const s of [-1, 1]) {
      const z = s * (d / 2 + 0.004);
      const front = s === 1 && Math.abs(x) < 0.32;
      if (front) batch.add(BOX, batten, [x, (0.6 + h) / 2, z], [0.018, h - 0.6, 0.01]);
      else batch.add(BOX, batten, [x, h / 2, z], [0.018, h - 0.02, 0.01]);
      const gable = rise * (1 - Math.abs(x) / (w / 2)) - 0.03;
      if (gable > 0.04 && !(s === 1 && Math.abs(x) < 0.16)) batch.add(BOX, batten, [x, h + gable / 2, z], [0.018, gable, 0.01]);
    }
  }
  for (let z = -d / 2 + 0.09; z < d / 2 - 0.05; z += 0.1) {
    for (const s of [-1, 1]) {
      const x = s * (w / 2 + 0.004);
      if (Math.abs(z) < 0.15) {
        batch.add(BOX, batten, [x, 0.17, z], [0.01, 0.3, 0.018]);
        batch.add(BOX, batten, [x, 0.66, z], [0.01, 0.15, 0.018]);
      } else batch.add(BOX, batten, [x, h / 2, z], [0.01, h - 0.02, 0.018]);
    }
  }
  // The roof, its ridge front to back, shingled in rows, with white boards along its front edge.
  const half = w / 2 + 0.08;
  const slant = Math.hypot(half, rise);
  const tilt = Math.atan2(rise, half);
  batch.push(0, 0, 0, Math.PI / 2);
  shingleRoof(batch, { y: h, width: d + 0.16, depth: 2 * half, rise, tones: [theme.roof, shadeOf(theme.roof, 0.86), shadeOf(theme.roof, 1.1)], ridge: shadeOf(theme.roof, 0.75), rows: 6 });
  batch.pop();
  for (const s of [-1, 1]) {
    batch.add(BOX, white, [(s * half) / 2, h + rise / 2 + 0.04, d / 2 + 0.095], [slant + 0.04, 0.05, 0.03], [0, 0, -s * tilt]);
  }
  for (const x of [-w / 2, w / 2]) for (const z of [-d / 2, d / 2]) batch.add(BOX, white, [x, h / 2, z], [0.05, h, 0.05]);
  // Double doors, each leaf crossed with white braces.
  const dw = 0.52;
  const dh = 0.52;
  batch.add(BOX, white, [0, dh / 2 + 0.02, d / 2 + 0.005], [dw + 0.06, dh + 0.04, 0.02]);
  for (const s of [-1, 1]) {
    const x = (s * dw) / 4;
    batch.add(BOX, door, [x, dh / 2 + 0.02, d / 2 + 0.017], [dw / 2 - 0.03, dh - 0.03, 0.012]);
    const reach = Math.hypot(dw / 2 - 0.06, dh - 0.08);
    const angle = Math.atan2(dh - 0.08, dw / 2 - 0.06);
    for (const r of [angle, -angle]) batch.add(BOX, white, [x, dh / 2 + 0.02, d / 2 + 0.027], [reach, 0.035, 0.012], [0, 0, r]);
  }
  // A loft door up in the gable, and a window in each side.
  const ly = h + 0.17;
  batch.add(BOX, white, [0, ly, d / 2 + 0.005], [0.27, 0.25, 0.02]);
  batch.add(BOX, door, [0, ly, d / 2 + 0.017], [0.2, 0.18, 0.012]);
  for (const r of [0.73, -0.73]) batch.add(BOX, white, [0, ly, d / 2 + 0.026], [0.25, 0.028, 0.01], [0, 0, r]);
  for (const s of [-1, 1]) {
    batch.add(BOX, white, [s * (w / 2 + 0.006), 0.45, 0], [0.02, 0.24, 0.24]);
    batch.add(BOX, '#a9dcff', [s * (w / 2 + 0.014), 0.45, 0], [0.012, 0.18, 0.18]);
  }
  return batch.build();
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

const FLOWER_COLORS = ['#ff8fc1', '#fff3f8', '#ffd23f', '#b48aff', '#ff7a7a', '#ffa53a'];

/**
 * Builds the farm. theme: { fence, barn, roof }
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
  // Flowers, grass and other low plants, which cast no shadow.
  const flowers = new Batch();
  const glow = new Batch();
  // Grass, stones and flowers are strewn the same on every farm.
  const rand = seeded(7);
  const GRASS = ['PLANT_01_GrassShort', 'PLANT_02_GrassMedium', 'PLANT_04_GrassSparse'];
  const tuft = (x, z, s = 0.3) => addNature(flowers, GRASS[Math.floor(rand() * GRASS.length)], [x, 0, z], s * (0.8 + rand() * 0.4), rand() * TAU);

  // The fence just inside the ring road: a straight run along each side, open at the corners, with a lamp either
  // side of each opening and grass at some of the posts.
  for (const [from, to] of ringSides(FENCE, GATE)) {
    for (const p of railFence(deco, from, to, theme.fence, { height: 0.42 })) {
      if (rand() < 0.4) tuft(p.x + (rand() - 0.5) * 0.25, p.z + (rand() - 0.5) * 0.25);
    }
    const along = to.clone().sub(from).normalize();
    streetLamp(deco, glow, from.clone().addScaledVector(along, -0.14));
    streetLamp(deco, glow, to.clone().addScaledVector(along, 0.14));
  }

  // Flower beds in two rows along the inside of the fence, in patches of one colour, with a leafy plant now and then.
  let color = FLOWER_COLORS[0];
  let k = 0;
  for (const [from, to] of ringSides(FENCE + 0.27, GATE + 0.2)) {
    const inward = from.clone().add(to).normalize().negate();
    const n = Math.round(from.distanceTo(to) / 0.17);
    for (let j = 0; j <= n; j++, k++) {
      if (k % 4 === 0) color = FLOWER_COLORS[Math.floor(rand() * FLOWER_COLORS.length)];
      const p = from.clone().lerp(to, j / n).addScaledVector(inward, (k % 2) * 0.16 + (rand() - 0.5) * 0.06);
      if (k % 9 === 4) addNature(flowers, 'PLANT_10_BroadleafPlant', [p.x, 0, p.z], 0.24, rand() * TAU);
      else flower(flowers, p.x, p.z, color);
    }
  }

  // Benches in front of the flower beds, looking in at the plots.
  for (const [x, z, turn] of [[-0.2, 3.8, Math.PI], [3.8, -0.4, -Math.PI / 2], [0.8, -3.8, 0]]) addNature(deco, 'PROP_10_WoodenBench', [x, 0, z], 0.36, turn);

  const b = new THREE.Group();
  b.add(barn(theme));
  b.position.set(BARN_AT[0], 0, BARN_AT[1]);
  b.rotation.y = Math.PI / 4;
  b.scale.setScalar(BARN_SIZE);
  b.updateMatrix();
  b.traverse((o) => (o.userData.action = 'barn'));
  group.add(b);
  clickables.push(b);
  // leafy plants at the barn's front corners
  for (const [x, s, turn] of [[-0.66, 0.3, 0.5], [0.66, 0.27, 2.6]]) {
    const p = new THREE.Vector3(x, 0, 0.5).applyMatrix4(b.matrix);
    addNature(deco, 'PLANT_10_BroadleafPlant', [p.x, 0, p.z], s, turn);
  }

  // pond with a frog
  const [px, pz] = POND;
  const pond = m(new THREE.CylinderGeometry(0.62, 0.62, 0.04, 28), worldMat('#5ec8ff', { roughness: 0.15, metalness: 0.1 }), [px, 0.0, pz], [0.85, 1, 0.75]);
  pond.castShadow = false;
  group.add(pond);
  group.add(m(new THREE.TorusGeometry(0.62, 0.07, 6, 28), worldMat('#c9c2b4', { flatShading: true }), [px, 0.02, pz], [0.85, 0.75, 1], [Math.PI / 2, 0, 0]));
  const pad = m(new THREE.CylinderGeometry(0.17, 0.17, 0.02, 16), worldMat('#4fb35a'), [px + 0.05, 0.03, pz + 0.1]);
  group.add(pad);
  const f = frog();
  f.position.set(px + 0.05, 0.03, pz + 0.1);
  f.rotation.y = Math.PI / 4;
  f.traverse((o) => (o.userData.action = 'frog'));
  group.add(f);
  clickables.push(f);
  // Stones at the back of the pond, tall grass and bluebells at its sides. a: angle round the pond from +x.
  const rim = (a, r) => [px + Math.cos(a) * 0.53 * r, 0, pz + Math.sin(a) * 0.47 * r];
  for (const [a, s] of [[3.55, 0.3], [3.9, 0.22], [4.25, 0.27]]) addNature(deco, 'ROCK_01_Small', rim(a, 1.3), s, a * 3);
  addNature(flowers, 'PLANT_03_GrassTall', rim(5.0, 1.35), 0.32, 1);
  addNature(flowers, 'PLANT_03_GrassTall', rim(5.4, 1.4), 0.26, 2.5);
  addNature(flowers, 'FLOWER_04_BlueBells', rim(2.2, 1.45), 0.36, 2);
  // Stepping stones from the pond out through the front corner to the road.
  steppingStones(deco, [new THREE.Vector3(px + 0.42, 0, pz + 0.42), new THREE.Vector3(4.65, 0, 4.65)]);

  // rocks about the grass, each with a tuft beside it
  for (const [name, x, z, s, turn] of [['ROCK_07_ClusterSmall', 3.9, 1.3, 0.2, 0.6], ['ROCK_02_Medium', -3.95, 0.45, 0.2, 2.2], ['ROCK_01_Small', -0.9, -3.9, 0.32, 4.0]]) {
    addNature(deco, name, [x, 0, z], s, turn);
    tuft(x + 0.16, z + 0.08, 0.25);
  }
  group.add(deco.build(), flowers.build({ castShadow: false }), buildGlow(glow));

  return { group, plots, clickables };
}
