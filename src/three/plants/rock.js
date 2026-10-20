// A boulder as the reference design draws them along the river's banks, by the roads and among the trees at the
// front, cut as the low-poly rocks the user found: a chunky lump of warm grey stone about as tall as it is wide, its
// top bulging in a few broad faces, every edge bevelled off in a thin strip that catches the light, often with a
// smaller lump or two grown into its side; lit pale on top, darker down its sides, darker still where it spreads into
// the ground. Its stone is lightly grained and blotched; some are mossy on top, and some have small plants growing at
// their foot and in the cracks between their lumps.
import * as THREE from 'three';
import { ConvexHull } from 'three/examples/jsm/math/ConvexHull.js';
import { seeded } from '../../util.js';
import { TAU, MATERIAL, SOFT_MATERIAL, MATERIAL_MAKERS, glowing, twoSided, mesher, palette, pointNoise } from './parts.js';
import { leaf } from './birch.js';

/**
 * Stone: its sides, its top, its foot where it meets the ground, and the bevels along its edges; moss; and the small
 * plants' leaves, deep to light. The stone glows a little (`glow` of its colours), so the sides in the shade keep
 * their warmth.
 */
export const ROCK = {
  foot: '#4f4e48', side: '#a0969a', top: '#c8beba', edge: '#ddd5cf', moss: '#94bd3c', mossDark: '#5f8c2a',
  leafDark: '#3a7a1e', leafMid: '#5eac30', leafLight: '#a8d856', glow: 0.18,
};

/**
 * How a lump is cut, in units of its height: how wide it is (along x) and how deep (along z), of its width; how many
 * corners go round its foot, its middle and its upper part ([least, most]), how high the middle and the upper part
 * are and how wide the upper part and the foot are, of the middle's width (the foot spreads a little, so it sits in
 * the ground rather than on it); how far its foot is sunk into the ground; how far its top may lean; and how wide its
 * bevels are, of its height. Then how many smaller lumps grow into its side (the chance of none, of one, else two) and
 * how big they are, of it.
 */
const FORM = {
  wide: [1.2, 2.1], deep: [0.7, 0.95], corners: [5, 7], middle: [0.3, 0.5], upper: [0.72, 0.88], narrow: [0.5, 0.72],
  foot: 1.08, sink: 0.12, lean: 0.12, bevel: 0.022, lumps: [0.3, 0.75], lump: [0.5, 0.72],
};

/**
 * The look of each, unless asked for: the chance it is mossy, and how mossy then ([least, most], 0 to 1); the chance
 * it has small plants, and how many then ([least, most]); how tall they are, of the rock's height, and the chance one
 * has broad leaves rather than blades of grass. Then the shadow round its foot: how dark at its foot, and how far out it
 * fades, of the rock's height (half as dark a third of the way out).
 */
const LOOK = { mossy: 0.4, moss: [0.5, 1], planted: 0.5, plants: [1, 3], plant: [0.35, 0.55], broad: 0.5, shadow: [0.62, 0.16] };

const between = ([a, b], t) => a + (b - a) * t;

/**
 * The stone's material: lit flat, coloured at its corners, its colours glowing a little (`glow`), lightly grained
 * and blotched, with fine dark cracks here and there, and mossed (its `moss` at each corner, 0 to 1) in patches on
 * what faces up. The grain follows the mesh's own positions, so it stays put on the stone.
 */
const MATERIALS = new Map();
function stone(glow, moss, mossDark) {
  const key = `${glow} ${moss.getHexString()} ${mossDark.getHexString()}`;
  if (MATERIALS.has(key)) return MATERIALS.get(key);
  const m = MATERIAL.clone();
  m.name = `stone ${key}`;
  const rgb = (c) => `vec3(${c.r.toFixed(4)}, ${c.g.toFixed(4)}, ${c.b.toFixed(4)})`;
  m.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
attribute float moss;
varying vec3 vStone;
varying vec3 vStoneUp;
varying float vMoss;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
vStone = position;
vStoneUp = normal;
vMoss = moss;`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec3 vStone;
varying vec3 vStoneUp;
varying float vMoss;
float stoneHash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float stoneNoise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(stoneHash(i), stoneHash(i + vec3(1, 0, 0)), f.x), mix(stoneHash(i + vec3(0, 1, 0)), stoneHash(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(stoneHash(i + vec3(0, 0, 1)), stoneHash(i + vec3(1, 0, 1)), f.x), mix(stoneHash(i + vec3(0, 1, 1)), stoneHash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
{
  // Blotches a hand wide, a fine grain, and thin cracks where a broad noise crosses its middle.
  float blotch = stoneNoise(vStone * 9.0) * 0.65 + stoneNoise(vStone * 21.0) * 0.35;
  float grain = stoneNoise(vStone * 70.0);
  float crack = 1.0 - smoothstep(0.0, 0.035, abs(stoneNoise(vStone * 6.0 + 7.3) - 0.5));
  crack *= smoothstep(0.45, 0.6, stoneNoise(vStone * 3.0 + 1.7));
  diffuseColor.rgb *= (1.0 + (blotch - 0.5) * 0.22 + (grain - 0.5) * 0.12) * (1.0 - crack * 0.3);
  // Moss in soft patches over what faces up, thickest on top, none down its sides.
  float patches = stoneNoise(vStone * 4.0 + 3.1) * 0.75 + stoneNoise(vStone * 11.0 + 5.3) * 0.25;
  float up = normalize(vStoneUp).y;
  float mossy = vMoss * smoothstep(0.4, 0.85, up + (patches - 0.5) * 0.6) * smoothstep(0.58 - 0.2 * vMoss, 0.72 - 0.2 * vMoss, patches + up * 0.2);
  vec3 mossColor = mix(${rgb(mossDark)}, ${rgb(moss)}, smoothstep(0.35, 0.75, patches + (grain - 0.5) * 0.3));
  diffuseColor.rgb = mix(diffuseColor.rgb, mossColor, mossy);
}`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
  totalEmissiveRadiance += diffuseColor.rgb * ${glow.toFixed(3)};`);
  };
  m.customProgramCacheKey = () => `stone ${key}`;
  MATERIALS.set(key, m);
  return m;
}

MATERIAL_MAKERS.stone = (glow, moss, mossDark) => stone(parseFloat(glow), new THREE.Color(`#${moss}`), new THREE.Color(`#${mossDark}`));

/** The small plants' leaves: soft, either face showing, glowing a little as the flowers' leaves do. */
const PLANTS = twoSided(glowing(SOFT_MATERIAL, 0.12));

/**
 * The shadow round its foot, darkening whatever ground it sits on (fading out by the alpha at its corners). The sun's
 * shadow alone leaves a thin lit line along the foot where the sun grazes a side, as it is cast a little off the
 * ground (normalBias in scene.js), and the stone looked set on the ground rather than in it.
 */
const SHADOW = new THREE.MeshBasicMaterial({ name: 'rockShadow', color: '#1a2410', vertexColors: true, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
MATERIAL_MAKERS.rockShadow = () => SHADOW;

// The way the game's camera looks from, level (CAM_DIR in scene.js), so the plants grow on the side it sees.
const CAMERA = new THREE.Vector3(1, 0, 1).normalize();

// Directions round a corner, for rounding it off: an icosahedron's twelve corners.
const ROUND = (() => {
  const t = (1 + Math.sqrt(5)) / 2;
  return [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]]
    .map(([x, y, z]) => new THREE.Vector3(x, y, z).normalize());
})();

/**
 * The corners of a rough lump `h` tall with its foot's middle at `at`, `w` wide along x: rings of them round its
 * foot, its middle and its upper part, each ring turned a little its own way so the faces between are folded, and
 * a small face on its top.
 */
function corners(rand, at, w, h) {
  const deep = between(FORM.deep, rand());
  const turn = rand() * TAU;
  const lean = [(rand() - 0.5) * 2 * FORM.lean, (rand() - 0.5) * 2 * FORM.lean];
  const points = [];
  const ring = (y, r, leans) => {
    const n = FORM.corners[0] + Math.floor(rand() * (FORM.corners[1] - FORM.corners[0] + 1));
    const twist = rand();
    for (let i = 0; i < n; i++) {
      const a = turn + ((i + twist + (rand() - 0.5) * 0.5) / n) * TAU;
      const s = (w / 2) * r * (0.85 + rand() * 0.3);
      const p = new THREE.Vector3(Math.cos(a) * s, y + (rand() - 0.5) * 0.1 * h, Math.sin(a) * s * deep);
      if (leans) p.y += (lean[0] * p.x + lean[1] * p.z) * h;
      points.push(p);
    }
  };
  ring(-FORM.sink * h, FORM.foot, false);
  ring(between(FORM.middle, rand()) * h, 1, true);
  ring(between(FORM.upper, rand()) * h, between(FORM.narrow, rand()), true);
  // Its top: a small face of three corners, nearly level, set off its middle, so it does not rise to a point.
  const a = rand() * TAU;
  const at0 = new THREE.Vector3((rand() - 0.5) * w * 0.2, 0, (rand() - 0.5) * w * deep * 0.2);
  for (let i = 0; i < 3; i++) {
    const b = a + (i / 3) * TAU + (rand() - 0.5) * 0.6;
    const s = w * (0.12 + rand() * 0.1);
    const p = new THREE.Vector3(at0.x + Math.cos(b) * s, h * (0.98 + rand() * 0.04), at0.z + Math.sin(b) * s * deep);
    p.y += (lean[0] * p.x + lean[1] * p.z) * h;
    points.push(p);
  }
  return points.map((p) => p.add(at));
}

/**
 * The lump round `points`, its corners rounded off by `r`: each corner drawn in by `r` towards its middle and
 * replaced by a little ball of points round it, turned its own way. The hull round them all has the lump's faces,
 * thin bevels along its edges and small facets at its corners; each point is tagged with the corner it came from,
 * so a face can tell which it is.
 */
function rounded(rand, points, r) {
  const hull = new ConvexHull().setFromPoints(points);
  const outer = new Set(hull.faces.flatMap((f) => [f.edge, f.edge.next, f.edge.next.next].map((e) => e.head().point)));
  const middle = new THREE.Vector3();
  for (const p of points) middle.add(p);
  middle.divideScalar(points.length);
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rand() * TAU, rand() * TAU, rand() * TAU));
  const ball = ROUND.map((d) => d.clone().applyQuaternion(q));
  const out = [];
  [...outer].forEach((point, k) => {
    const towards = middle.clone().sub(point);
    const inner = point.clone().addScaledVector(towards, Math.min(0.5, r / towards.length()));
    for (const d of ball) {
      const p = inner.clone().addScaledVector(d, r);
      p.corner = k;
      out.push(p);
    }
  });
  return new ConvexHull().setFromPoints(out);
}

/** Where `hull`'s side crosses the ground the way `dir` (level, from `from`) leaves `from`: how far out. */
function reach(hull, from, dir) {
  let far = Infinity;
  for (const face of hull.faces) {
    const along = face.normal.x * dir.x + face.normal.z * dir.z;
    if (along <= 1e-6) continue;
    // The face's plane, taken at the ground: n·p = constant.
    far = Math.min(far, (face.constant - face.normal.x * from.x - face.normal.z * from.z) / along);
  }
  return far;
}

/** Whether `p` is inside `hull`, a little above the ground. */
function inside(hull, p) {
  return hull.faces.every((f) => f.normal.x * p.x + f.normal.y * 0.02 + f.normal.z * p.z < f.constant);
}

/**
 * A small plant at `at` on the ground, `size` tall: a tuft of grass blades, or a few broad leaves (`broad`), fanned
 * out round its foot and leaning `away` (level) from the stone, coloured deep at their foot to light at their tips.
 */
function plant(m, rand, at, size, away, broad, c) {
  const n = broad ? 5 + Math.floor(rand() * 3) : 14 + Math.floor(rand() * 7);
  const turn = rand() * TAU;
  for (let i = 0; i < n; i++) {
    const a = turn + (i / n) * TAU + (rand() - 0.5) * 0.6;
    const out = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
    // Leaning out, more so away from the stone, the broad leaves lower.
    const tilt = (broad ? 0.75 : 0.15) + rand() * (broad ? 0.45 : 0.7) + Math.max(0, out.dot(away)) * 0.3;
    const along = out.clone().multiplyScalar(Math.sin(tilt)).setY(Math.cos(tilt)).normalize();
    const face = new THREE.Vector3(0, 1, 0).addScaledVector(along, -along.y).normalize();
    if (face.lengthSq() < 0.5) face.copy(out);
    const sideways = new THREE.Vector3().crossVectors(along, face).multiplyScalar((rand() - 0.5) * 0.6);
    face.add(sideways).normalize();
    const len = size * (broad ? 0.6 + rand() * 0.3 : 0.5 + rand() * 0.6);
    const col = c.leafDark.clone().lerp(c.leafMid, 0.4 + rand() * 0.4).lerp(c.leafLight, rand() * (broad ? 0.6 : 0.45));
    leaf(m, at.clone().addScaledVector(out, size * 0.04), along, face, len, col, broad ? 0.5 : 0.09);
  }
}

/**
 * A boulder `height` tall (world units), cut by `seed`, longest along x before it is turned `look.turn` (radians, as a
 * rotation.y; turn it so, rather than turning what it returns, so its plants grow on the side the camera sees).
 * `look` may also set how mossy it is (`moss`, 0 to 1) and how many small plants grow at its foot (`plants`); the
 * seed picks them otherwise. Returns a group sitting on the ground at the origin: the stone, the shadow round its
 * foot, and its plants if it has any.
 */
export function rock(seed = 1, height = 0.5, look = {}, colors = ROCK) {
  const rand = seeded(seed);
  const { glow, ...hues } = colors;
  const c = palette(hues, (rand() - 0.5) * 0.02, 1 + (rand() - 0.5) * 0.08, ['moss', 'mossDark', 'leafDark', 'leafMid', 'leafLight']);
  // The main lump, and the smaller ones grown into its side, low and a little apart round it.
  const w = between(FORM.wide, rand());
  const lumps = [{ at: new THREE.Vector3(), points: corners(rand, new THREE.Vector3(), w, 1) }];
  const more = rand() < FORM.lumps[0] ? 0 : rand() < FORM.lumps[1] ? 1 : 2;
  const side = rand() * TAU;
  for (let i = 0; i < more; i++) {
    const s = between(FORM.lump, rand());
    const a = side + i * Math.PI * (0.7 + rand() * 0.6);
    const out = (w / 2) * (0.55 + rand() * 0.25);
    const at = new THREE.Vector3(Math.cos(a) * out, 0, Math.sin(a) * out * 0.8);
    lumps.push({ at, points: corners(rand, at, w * s * (0.9 + rand() * 0.3), s) });
  }
  for (const l of lumps) l.hull = rounded(rand, l.points, FORM.bevel);
  const high = Math.max(...lumps.flatMap(({ hull }) => hull.faces.flatMap((f) => [f.edge, f.edge.next, f.edge.next.next].map((e) => e.head().point.y))));
  const moss = look.moss ?? (rand() < LOOK.mossy ? between(LOOK.moss, rand()) : 0);
  const plants = look.plants ?? (rand() < LOOK.planted ? LOOK.plants[0] + Math.floor(rand() * (LOOK.plants[1] - LOOK.plants[0] + 1)) : 0);
  // Each face coloured by how it lies, the top's colour where it faces up and the sides' where it stands up, a little
  // lighter or darker than the next; a bevel lighter, most of all along the top; every corner darkened towards the
  // foot's colour the nearer the ground it is, so it sinks into its shadow.
  const m = mesher();
  const shade = (base, y) => base.clone().lerp(c.foot, 0.85 * (1 - THREE.MathUtils.smoothstep(y / high, -0.12, 0.42)));
  for (const { hull } of lumps) {
    for (const face of hull.faces) {
      const ps = [face.edge, face.edge.next, face.edge.next.next].map((e) => e.head().point);
      const n = face.normal;
      const mid = ps[0].clone().add(ps[1]).add(ps[2]).divideScalar(3);
      const base = c.side.clone().lerp(c.top, THREE.MathUtils.smoothstep(n.y, 0.35, 0.9)).multiplyScalar(1 + pointNoise(mid, seed) * 0.12);
      const corners = new Set(ps.map((p) => p.corner)).size;
      if (corners < 3) base.lerp(c.edge, 0.08 + 0.2 * Math.max(0, n.y));
      m.tri(ps[0], ps[1], ps[2], shade(base, ps[0].y), shade(base, ps[1].y), shade(base, ps[2].y), () => n);
    }
  }
  const g = m.geometry();
  g.setAttribute('moss', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count).fill(moss), 1));
  const k = height / high;
  g.scale(k, k, k);
  const body = new THREE.Mesh(g, stone(glow, c.moss, c.mossDark));
  body.castShadow = true;
  body.receiveShadow = true;
  const group = new THREE.Group();
  group.add(body);
  // The shadow round its foot: a ring round each lump where it meets the ground, dark from a little in under it to
  // its foot, fading out beyond; darker where two meet.
  const pos = [];
  const col = [];
  const [dark, spread] = LOOK.shadow;
  for (const { at, hull } of lumps) {
    const ring = Array.from({ length: 18 }, (_, i) => {
      const dir = new THREE.Vector3(Math.cos((i / 18) * TAU), 0, Math.sin((i / 18) * TAU));
      const r = reach(hull, at, dir);
      return [0.85 * r, r, r + spread * 0.35, r + spread].map((d) => at.clone().addScaledVector(dir, d));
    });
    const alpha = [dark, dark, dark * 0.5, 0];
    for (let i = 0; i < 18; i++) {
      const [a, b] = [ring[i], ring[(i + 1) % 18]];
      for (const j of [0, 1, 2]) {
        for (const [p, t] of [[a[j], j], [b[j], j], [b[j + 1], j + 1], [a[j], j], [b[j + 1], j + 1], [a[j + 1], j + 1]]) {
          pos.push(p.x, 0.008, p.z);
          col.push(1, 1, 1, alpha[t]);
        }
      }
    }
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  sg.setAttribute('color', new THREE.Float32BufferAttribute(col, 4));
  sg.scale(k, k, k);
  group.add(new THREE.Mesh(sg, SHADOW));
  // Its plants: in the crack where a smaller lump meets the main one, then round its foot, just out from it; those
  // the camera sees first.
  const turn = look.turn ?? 0;
  const seen = CAMERA.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), -turn);
  if (plants > 0) {
    const spots = [];
    for (const l of lumps.slice(1)) {
      const dir = l.at.clone().setY(0).normalize();
      const across = new THREE.Vector3(-dir.z, 0, dir.x);
      if (across.dot(seen) < 0) across.negate();
      const from = l.at.clone().multiplyScalar(0.5);
      spots.push({ at: from.clone().addScaledVector(across, Math.min(reach(lumps[0].hull, from, across), reach(l.hull, from, across))), away: across });
    }
    const start = Math.atan2(seen.z, seen.x);
    for (let i = 0; i < 7; i++) {
      // Fanning out from the way the camera looks from, to either side by turns.
      const a = start + Math.ceil(i / 2) * (i % 2 ? 1 : -1) * 0.55 + (rand() - 0.5) * 0.4;
      const dir = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
      const at = dir.clone().multiplyScalar(reach(lumps[0].hull, new THREE.Vector3(), dir));
      if (!lumps.slice(1).some((l) => inside(l.hull, at))) spots.push({ at, away: dir });
    }
    const pm = mesher();
    spots.slice(0, plants).forEach(({ at, away }) => {
      const size = between(LOOK.plant, rand());
      plant(pm, rand, at.addScaledVector(away, size * 0.1).setY(0), size, away, rand() < LOOK.broad, c);
    });
    const pg = pm.geometry();
    pg.scale(k, k, k);
    const leaves = new THREE.Mesh(pg, PLANTS);
    leaves.castShadow = true;
    leaves.receiveShadow = true;
    group.add(leaves);
  }
  for (const child of group.children) child.geometry.rotateY(turn);
  group.userData.height = height;
  return group;
}
