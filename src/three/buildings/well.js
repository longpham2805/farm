// The well by the ring road's front left side, as the reference design draws it: a round wall of big pale stones with
// a rim of broad flat stones round a shaft going down to water, two wooden posts holding up a little roof of thick
// orange clay tiles with boarded gables, and a winch across them with a rope wound round it down to a wooden bucket.
// The bucket goes on working: it is let down into the water, wound up full, tipped to pour the water back down the
// well, and again.
//
// Modelled with its roof's ridge along x, so its gables face ±x; placed, it turns so the camera sees its left gable
// and down into its mouth.
import * as THREE from 'three';
import { Batch } from '../batch.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { BOX, GABLE, ICO, cyl, tiledSlope } from './parts.js';
import { seeded } from '../../util.js';

// The wall: round, R across and H tall, in COURSES of stones DEPTH deep outside, and inside round the shaft (SHAFT
// across, down to water at WATER_Y) in courses of stones INNER deep; under a rim RIM thick that reaches out LIP.
const R = 0.53;
const COURSES = [0.11, 0.1, 0.1, 0.1, 0.1];
const H = COURSES.reduce((a, b) => a + b, 0);
const DEPTH = 0.07;
const INNER = 0.06;
const RIM = 0.06;
const LIP = 0.04;
const SHAFT = 0.36;
const WATER_Y = H - 0.2;
// The posts stand POST_X either side on the rim and hold the roof's eaves at EAVE, rising RISE to its ridge.
const POST_X = 0.45;
const EAVE = 1.2;
const RISE = 0.38;
const ROOF_W = 1.24;
const ROOF_D = 0.96;

const STONES = ['#d3cdc4', '#c8c1b6', '#dcd6cd', '#c2bbaf'];
const RIM_STONES = ['#e2ddd5', '#d6d0c6', '#e9e4dc', '#cdc6ba', '#dbd5cb'];
const MORTAR = '#8a8378';
const SHAFT_STONES = ['#a39c90', '#9a9387', '#aea79b', '#938c80'];
const MOSS = ['#6f9a3e', '#5f8a35', '#7aa648', '#86b351'];
const LEAVES = ['#4f9a3a', '#5fae45', '#3f8a32'];
const WOOD = '#9a5a32';
const DARK_WOOD = '#6e4026';
const TILES = ['#ff6f3c', '#ef5f33', '#ff8550', '#e95a30', '#f8743f'];

/** A round ring from radius r0 out to r1, from y0 up to y1. */
const RING = (r0, r1, y0, y1) => new THREE.LatheGeometry([[r0, y0], [r1, y0], [r1, y1], [r0, y1], [r0, y0]].map(([r, y]) => new THREE.Vector2(r, y)), 40);

// The winch's height and its drum's radius, how high the bucket's handle hangs at the top of its rope and down at
// the water, and how long a round of its work takes, in seconds.
const WINCH = H + RIM + 0.4;
const DRUM = 0.045;
const TOP_Y = WINCH - 0.07;
// The bucket hangs from its handle, BODY above the middle of its body, and tips about that middle.
const BODY = 0.14;
const LOW_Y = WATER_Y + BODY - 0.02;
const ROUND = 8;
// How much slower than the timings below the bucket works.
const PACE = 1.6;
const RIM_FRONT = new THREE.Vector3(0, 0.055, 0.075);
const X_AXIS = new THREE.Vector3(1, 0, 0);

const smooth = (x) => x * x * (3 - 2 * x);

/** A ripple `age` seconds old, spreading out to `reach` and fading over 0.9 s from opacity `strength`. */
function spread(ring, age, reach, strength) {
  ring.visible = age !== undefined && age >= 0 && age < 0.9;
  if (!ring.visible) return;
  ring.scale.setScalar(0.03 + (age / 0.9) * reach);
  ring.material.opacity = strength * (1 - age / 0.9);
}

// Light wavering over water: soft lighter bands that drift and bend, from where the fragment is in the world.
const WATER_LIGHT = /* glsl */ `
#include <color_fragment>
vec2 wq = vWaterPos.xz * 30.0;
float wc = sin(wq.x + waterTime * 1.6 + sin(wq.y * 0.8 + waterTime * 0.9)) + sin(wq.y * 1.15 - waterTime * 1.3 + sin(wq.x * 0.7 - waterTime * 0.6));
float waterLight = smoothstep(0.2, 1.9, wc);
diffuseColor.rgb = mix(diffuseColor.rgb * 0.92, vec3(0.62, 0.86, 0.96), waterLight * 0.3);
`;
const span = (t, a, b) => Math.min(1, Math.max(0, (t - a) / (b - a)));

/** A clump of moss: `n` small soft lumps of greens round p, strewn up to `spread` [x, y, z] from it. */
function moss(batch, rand, [x, y, z], spread, n) {
  for (let k = 0; k < n; k++) {
    const r = 0.012 + rand() * 0.012;
    batch.add(ICO, MOSS[Math.floor(rand() * MOSS.length)], [x + (rand() - 0.5) * 2 * spread[0], y + (rand() - 0.5) * 2 * spread[1], z + (rand() - 0.5) * 2 * spread[2]], [r, r * 0.7, r], [rand(), rand(), 0], true);
  }
}

/** Ivy along `path` (points [x, y, z] up a wall facing +z): a thin stem, and leaves either side of it by turns. */
function ivy(batch, rand, path) {
  for (let k = 1; k < path.length; k++) {
    const [ax, ay, az] = path[k - 1];
    const [bx, by, bz] = path[k];
    const len = Math.hypot(bx - ax, by - ay, bz - az);
    batch.add(BOX, '#5a7a2e', [(ax + bx) / 2, (ay + by) / 2, (az + bz) / 2], [0.008, len, 0.008], [Math.atan2(bz - az, Math.hypot(bx - ax, by - ay)), 0, -Math.atan2(bx - ax, by - ay)]);
    for (let t = 0.3; t < 1; t += 0.45) {
      const s = (k + t > 1.5 ? 1 : -1) * (Math.round(t * 2) % 2 ? 1 : -1);
      batch.add(ICO, LEAVES[Math.floor(rand() * LEAVES.length)], [ax + (bx - ax) * t + s * 0.025, ay + (by - ay) * t, az + (bz - az) * t + 0.006], [0.028, 0.024, 0.008], [0, 0, s * 0.6 + (rand() - 0.5) * 0.4], true);
    }
  }
}

/**
 * A stone w long round a ring, h tall and d deep from the inside of the ring out, its middle r from the ring's
 * middle: a block with rounded edges, wider on the outside than the inside, so a ring of them closes up.
 */
function stone(w, h, d, r) {
  const g = new RoundedBoxGeometry(w, h, d, 2, Math.min(0.025, Math.min(w, h, d) * 0.3));
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setX(i, (pos.getX(i) * (r + pos.getZ(i))) / r);
  g.computeVertexNormals();
  return g;
}

/**
 * A course of stones round a ring of radius r (to their middles), from y up h, each about `size` long and turned on
 * from the last course by `offset`: lengths, heights and how far each sits out vary a little, and each is a
 * colour of `colors`. Returns the angle of each stone's middle round the ring (0 towards +z, π/2 towards +x).
 */
function course(batch, rand, { r, y, h, d, size, offset, colors, gap = 0.016 }) {
  const n = Math.round((Math.PI * 2 * r) / size);
  // Where each stone ends, round the ring: even steps, each pushed on or back a little.
  const ends = Array.from({ length: n }, (_, k) => offset + ((k + (rand() - 0.5) * 0.5) / n) * Math.PI * 2);
  const middles = [];
  for (let k = 0; k < n; k++) {
    const a0 = ends[k];
    const a1 = k + 1 < n ? ends[k + 1] : ends[0] + Math.PI * 2;
    const a = (a0 + a1) / 2;
    middles.push(a);
    const w = (a1 - a0) * r - gap;
    const sh = h - gap - rand() * 0.012;
    const out = (rand() - 0.5) * 0.012;
    batch.push(Math.sin(a) * (r + out), y + h / 2, Math.cos(a) * (r + out), a);
    batch.add(stone(w, sh, d, r), colors[Math.floor(rand() * colors.length)], [0, 0, 0], 1, [(rand() - 0.5) * 0.04, 0, (rand() - 0.5) * 0.05]);
    batch.pop();
  }
  return middles;
}

/** One mesh of parts, built by build(batch). */
function merged(build) {
  const batch = new Batch();
  build(batch);
  return batch.build();
}

/** Rope: strands of fibre twisting round, as stripes on a texture that repeats along it. */
function ropeTexture() {
  const c = document.createElement('canvas');
  c.width = 16;
  c.height = 16;
  const g = c.getContext('2d');
  g.fillStyle = '#c9a774';
  g.fillRect(0, 0, 16, 16);
  g.strokeStyle = '#8f6d42';
  g.lineWidth = 3;
  for (const o of [-16, 0, 16]) {
    g.beginPath();
    g.moveTo(o, 16);
    g.lineTo(o + 16, 0);
    g.stroke();
  }
  g.strokeStyle = '#e3c897';
  g.lineWidth = 1;
  for (const o of [-12, 4, 20]) {
    g.beginPath();
    g.moveTo(o, 16);
    g.lineTo(o + 16, 0);
    g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** The bucket: staves of wood a shade apart round a slightly tapering tub, two iron hoops and an iron handle. */
function bucketMesh() {
  return merged((b) => {
    const staves = 12;
    for (let k = 0; k < staves; k++) {
      const a = ((k + 0.5) / staves) * Math.PI * 2;
      const r = 0.066;
      b.add(BOX, ['#a86a3c', '#9a5f34', '#b07444'][k % 3], [Math.sin(a) * r, 0, Math.cos(a) * r], [0.036, 0.11, 0.014], [0, a, 0]);
    }
    b.add(cyl(0.062, 0.058, 12), '#7a4a2a', [0, -0.05, 0], [1, 0.012, 1]);
    for (const y of [0.032, -0.03]) b.add(cyl(1, 1, 16), '#4f5359', [0, y, 0], [0.076, 0.012, 0.076]);
    b.add(new THREE.TorusGeometry(0.072, 0.005, 4, 12, Math.PI), '#4f5359', [0, 0.055, 0], 1);
  });
}

/**
 * Builds the well into the batch, standing on the batch's origin, and returns its moving parts (the winch, the
 * rope, the bucket and the water) as a group standing where the well does, and update(t), which works them.
 */
export function well(batch) {
  const rand = seeded(43);

  // The wall: stones with rounded edges in staggered, uneven courses, outside all the way up and inside round the
  // shaft from below the water, with mortar between them (a core of it, only showing in the joints); on top, a rim
  // of broad flat stones reaching out over the wall and a little in over the shaft.
  const tip = (k) => (rand() - 0.5) * k;
  // The core stops well under the water, so the water never meets its top as it rises and falls.
  batch.add(cyl(1, 1, 32), MORTAR, [0, (WATER_Y - 0.04) / 2, 0], [R - DEPTH + 0.01, WATER_Y - 0.04, R - DEPTH + 0.01]);
  batch.add(RING(SHAFT + INNER - 0.01, R - DEPTH + 0.01, WATER_Y - 0.01, H), MORTAR, [0, 0, 0], 1);
  let y = 0;
  COURSES.forEach((h, k) => {
    course(batch, rand, { r: R - DEPTH / 2, y, h, d: DEPTH, size: 0.2 - k * 0.01, offset: k * 0.7, colors: STONES });
    y += h;
  });
  for (let y = WATER_Y - 0.07, k = 0; y < H - 0.01; y += 0.09, k++) {
    course(batch, rand, { r: SHAFT + INNER / 2, y, h: Math.min(0.09, H - y), d: INNER, size: 0.15, offset: k * 0.5, colors: SHAFT_STONES });
  }
  const rim = course(batch, rand, { r: (SHAFT - 0.01 + R + LIP) / 2, y: H, h: RIM, d: R + LIP - SHAFT + 0.01, size: 0.18, offset: 0.4, colors: RIM_STONES, gap: 0.014 });

  // Moss: on the rim's stones here and there, along the wall's joints and in patches round its foot, on the sides
  // the camera sees; and ivy climbing two of them up onto the rim.
  const seen = () => -2.3 + rand() * 2.9;
  for (let k = 0; k < 12; k++) {
    const a = seen();
    const r = SHAFT + (R + LIP - SHAFT) * (0.25 + rand() * 0.65);
    moss(batch, rand, [Math.sin(a) * r, H + RIM + 0.004, Math.cos(a) * r], [0.05, 0.004, 0.04], 6);
  }
  for (let k = 0; k < 16; k++) {
    const a = seen();
    const at = k < 8 ? 0.02 + rand() * 0.03 : COURSES[0] + (k % 2) * COURSES[1] + tip(0.01);
    batch.push(Math.sin(a) * (R + 0.012), at, Math.cos(a) * (R + 0.012), a);
    moss(batch, rand, [0, 0, 0], k < 8 ? [0.06, 0.02, 0.01] : [0.06, 0.006, 0.006], k < 8 ? 7 : 5);
    batch.pop();
  }
  for (const [a, path] of [[-0.75, [[-0.08, 0], [-0.03, 0.13], [0.04, 0.24], [0.01, 0.36], [0.06, 0.47], [0.03, H + RIM + 0.01]]], [-2.3, [[0.07, 0], [0.03, 0.11], [-0.03, 0.2], [0.0, 0.3]]]]) {
    batch.push(0, 0, 0, a);
    ivy(batch, rand, path.map(([x, y]) => [x, y, R + 0.02 + (y > H ? LIP : 0)]));
    batch.pop();
  }

  // The posts, the roof over them and the winch between them turn together, so that the post nearer the camera
  // (at -x, an angle of 3π/2 round the rim) stands in the middle of the next rim stone round from it.
  const NEAR = (Math.PI * 3) / 2;
  const next = rim.map((a) => ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)).filter((a) => a > NEAR).sort((x, y) => x - y)[0] ?? NEAR;
  batch.push(0, 0, 0, next - NEAR);

  // Two posts on the rim.
  for (const s of [-1, 1]) batch.add(BOX, WOOD, [s * POST_X, (H + RIM + EAVE) / 2, 0], [0.07, EAVE - H - RIM + 0.04, 0.07]);

  // The roof: thick clay tiles down both slopes, a ridge of round tiles with a knob at each end, and boarded gables
  // under boards along their edges, each with a small iron hook below the ridge.
  const tiles = { w: ROOF_W, rows: 4, tones: TILES, under: '#8a3622', tile: 0.16, thick: 0.05, tilt: 0.2, wobble: 0.09, rise: 0.018 };
  for (const s of [1, -1]) tiledSlope(batch, rand, { ...tiles, z0: 0, y0: EAVE + RISE, z1: (s * ROOF_D) / 2, y1: EAVE });
  batch.add(cyl(1, 1, 10), '#c24a2c', [0, EAVE + RISE + 0.05, 0], [0.05, ROOF_W + 0.03, 0.05], [0, 0, Math.PI / 2]);
  for (let x = -ROOF_W / 2 + 0.1; x < ROOF_W / 2; x += 0.16) batch.add(cyl(1, 1, 10), '#a83f26', [x, EAVE + RISE + 0.05, 0], [0.056, 0.02, 0.056], [0, 0, Math.PI / 2]);
  const slope = Math.atan2(RISE, ROOF_D / 2);
  const slant = Math.hypot(RISE, ROOF_D / 2);
  for (const s of [-1, 1]) {
    const x = (s * ROOF_W) / 2;
    for (const side of [1, -1]) batch.add(BOX, DARK_WOOD, [x, EAVE + RISE / 2 + 0.015, (side * ROOF_D) / 4], [0.04, 0.075, slant + 0.04], [side * slope, 0, 0]);
    batch.add(BOX, DARK_WOOD, [x, EAVE + RISE + 0.07, 0], [0.05, 0.06, 0.05]);
    // The gable, boarded just inside the edge boards, its boards' seams up it.
    const gx = s * (ROOF_W / 2 - 0.035);
    batch.add(GABLE, WOOD, [gx, EAVE - 0.035, 0], [0.025, RISE + 0.01, ROOF_D - 0.06]);
    for (let z = -ROOF_D / 2 + 0.1; z < ROOF_D / 2 - 0.05; z += 0.09) {
      const h = (RISE + 0.01) * (1 - Math.abs(z) / ((ROOF_D - 0.06) / 2)) - 0.02;
      if (h > 0.02) batch.add(BOX, '#7e4a2a', [gx + s * 0.014, EAVE - 0.035 + h / 2, z], [0.004, h, 0.01]);
    }
    batch.add(BOX, DARK_WOOD, [gx, EAVE - 0.03, 0], [0.04, 0.04, ROOF_D - 0.04]);
    batch.add(BOX, '#5b6067', [gx + s * 0.03, EAVE + RISE - 0.1, 0], [0.04, 0.012, 0.012]);
    batch.add(cyl(1, 1, 8), '#5b6067', [gx + s * 0.05, EAVE + RISE - 0.135, 0], [0.012, 0.06, 0.012]);
  }

  // The moving parts, in a group standing where the well does.
  const group = new THREE.Group();
  batch.origin.decompose(group.position, group.quaternion, group.scale);
  batch.pop();
  // The winch's drum between the posts with rope wound round it, and a crank on the right; it turns as the rope
  // winds.
  const drum = merged((b) => {
    b.add(cyl(1, 1, 10), DARK_WOOD, [0, 0, 0], [DRUM, 2 * POST_X, DRUM], [0, 0, Math.PI / 2]);
    for (let x = -0.14; x <= 0.14; x += 0.022) b.add(new THREE.TorusGeometry(DRUM + 0.008, 0.009, 5, 12), '#bf9a66', [x, 0, 0], 1, [0, Math.PI / 2, 0]);
    b.add(BOX, DARK_WOOD, [POST_X + 0.06, -0.05, 0], [0.02, 0.12, 0.022]);
    b.add(cyl(1, 1, 6), DARK_WOOD, [POST_X + 0.09, -0.1, 0], [0.012, 0.07, 0.012], [0, 0, Math.PI / 2]);
  });
  drum.position.set(0, WINCH, 0);
  group.add(drum);
  // The rope: a unit long hanging down from the drum, stretched to the bucket, its strands repeating along it.
  const ropeMap = ropeTexture();
  const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 1, 8, 1, true).translate(0, -0.5, 0), new THREE.MeshStandardMaterial({ map: ropeMap, roughness: 0.95 }));
  rope.position.set(0.0, WINCH - DRUM - 0.008, 0);
  rope.castShadow = true;
  group.add(rope);
  // The bucket, hanging from its handle's top, tipping about its middle, with water in it when full.
  const bucket = new THREE.Group();
  const tilt = new THREE.Group();
  tilt.position.y = -BODY;
  tilt.add(bucketMesh());
  const waterMat = new THREE.MeshStandardMaterial({ color: '#5fb4e0', roughness: 0.12, metalness: 0.1, emissive: '#1d4f6e', emissiveIntensity: 0.35 });
  const waterTime = { value: 0 };
  waterMat.onBeforeCompile = (shader) => {
    shader.uniforms.waterTime = waterTime;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWaterPos;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWaterPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWaterPos;\nuniform float waterTime;')
      .replace('#include <color_fragment>', WATER_LIGHT);
  };
  const full = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.058, 0.006, 12), waterMat);
  full.position.y = 0.04;
  tilt.add(full);
  bucket.add(tilt);
  group.add(bucket);
  // The water down the shaft, bright and glossy, light wavering over it, rising and falling a little; a ripple
  // spreading where the bucket dips and where the water lands, and now and then one from a drip somewhere.
  const water = new THREE.Mesh(cyl(SHAFT + 0.03, SHAFT + 0.03, 32).scale(1, 0.004, 1), waterMat);
  water.position.y = WATER_Y;
  group.add(water);
  const RIPPLE = new THREE.RingGeometry(0.85, 1, 24).rotateX(-Math.PI / 2);
  const ripples = [0, 1, 2].map(() => {
    const r = new THREE.Mesh(RIPPLE, new THREE.MeshBasicMaterial({ color: '#e8f7ff', transparent: true, opacity: 0, depthWrite: false }));
    r.position.y = WATER_Y + 0.004;
    group.add(r);
    return r;
  });
  const [ripple] = ripples;
  // The water poured back: a stream from the bucket's lip down to the water.
  const stream = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.024, 1, 8, 1, true).translate(0, -0.5, 0), new THREE.MeshStandardMaterial({ color: '#9fdcf8', roughness: 0.15, transparent: true, opacity: 0.8 }));
  group.add(stream);
  for (const m of [rope, bucket, stream, drum, water, ...ripples]) m.traverse((o) => (o.userData.ownMaterial = true));

  const lip = new THREE.Vector3();
  const update = (t) => {
    const k = (t % (ROUND * PACE)) / PACE;
    // Down to the water, a moment there filling, up again full, tipped to pour it back down, upright, and a rest.
    const lower = smooth(span(k, 0, 2)) - smooth(span(k, 2.8, 4.8));
    const tip = smooth(span(k, 4.8, 5.5)) - smooth(span(k, 6.1, 6.7));
    const y = TOP_Y + (LOW_Y - TOP_Y) * lower;
    bucket.position.set(0, y, 0);
    tilt.rotation.x = tip * 1.7;
    full.visible = k > 2.1 && k < 5.6;
    drum.rotation.x = -(WINCH - y) / DRUM;
    rope.scale.y = WINCH - DRUM - 0.008 - y;
    ropeMap.repeat.set(1, rope.scale.y / 0.03);
    // Pouring while tipped well over: from the bucket's lip straight down to the water.
    stream.visible = tip > 0.7 && k < 6.2;
    if (stream.visible) {
      lip.copy(RIM_FRONT).applyAxisAngle(X_AXIS, tilt.rotation.x);
      lip.y += y - BODY;
      stream.position.copy(lip);
      stream.scale.y = Math.max(0.01, lip.y - WATER_Y);
    }
    // The water rising and falling a little, and the ripples on it.
    water.position.y = WATER_Y + Math.sin(t * 1.3) * 0.002;
    ripple.position.y = water.position.y + 0.004;
    // A ripple spreading as the bucket dips in, and again as the poured water lands.
    const age = [k - 1.85, k - 5.3].find((a) => a >= 0 && a < 0.9);
    spread(ripple, age, SHAFT - 0.06, 0.7);
    // Drips: a small ripple each round of its own, somewhere new each time.
    ripples.slice(1).forEach((r, i) => {
      const period = 2.3 + i * 0.9;
      const n = Math.floor(t / period + i * 0.5);
      const a = (n * 2.4 + i) % (Math.PI * 2);
      const d = (SHAFT - 0.1) * (0.3 + 0.6 * ((n * 0.618) % 1));
      r.position.set(Math.sin(a) * d, water.position.y + 0.004, Math.cos(a) * d);
      spread(r, (t / period + i * 0.5 - n) * period, 0.12, 0.45);
    });
    waterTime.value = t;
  };
  update(0);
  return { group, update };
}
