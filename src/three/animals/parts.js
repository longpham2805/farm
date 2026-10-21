// What the grazing animals (buffalo.js, cow.js, sheep.js, pig.js) are built from: the shapes, the hide (smooth, with
// big round patches of another colour if they have them, or a fleece in round puffs), a smooth body round a spine
// (loft), horns, and the way they graze, look about and walk (grazing).
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Batch, paint } from '../batch.js';
import { seeded } from '../../util.js';

export const TAU = Math.PI * 2;
export const BALL = new THREE.SphereGeometry(1, 16, 12);
// A ball fine enough to be puffy (a fleece, see Coat).
export const FINE_BALL = new THREE.SphereGeometry(1, 36, 26);
export const CYL = new THREE.CylinderGeometry(1, 0.8, 1, 10);
export const HOOF = new THREE.CylinderGeometry(0.85, 1, 1, 10);

// A number from 0 to 1 for each cell of space, the same every time.
function hash(i, j, k) {
  let h = Math.imul(i, 374761393) + Math.imul(j, 668265263) + Math.imul(k, 1440662683);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// Round puffs packed together, from 0 between them to 1 at their tops, one about each unit, for a fleece as fluffy as a
// cloud: each cell of space holds a puff's middle somewhere in it, and a point is as high as the highest dome over it.
function puffs(x, y, z) {
  const [i, j, k] = [Math.floor(x), Math.floor(y), Math.floor(z)];
  let top = 0;
  for (let a = i - 1; a <= i + 1; a++) {
    for (let b = j - 1; b <= j + 1; b++) {
      for (let c = k - 1; c <= k + 1; c++) {
        const d = Math.hypot(a + hash(a, b, c) - x, b + hash(b, c, a) - y, c + hash(c, a, b) - z) / 1.05;
        if (d < 1) top = Math.max(top, Math.sqrt(1 - d * d));
      }
    }
  }
  return top;
}

// Smooth noise in three dimensions, for where the patches lie.
const NOISE = /* glsl */ `
float patchHash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1) * 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float patchNoise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(patchHash(i), patchHash(i + vec3(1, 0, 0)), f.x), mix(patchHash(i + vec3(0, 1, 0)), patchHash(i + vec3(1, 1, 0)), f.x), f.y),
    mix(mix(patchHash(i + vec3(0, 0, 1)), patchHash(i + vec3(1, 0, 1)), f.x), mix(patchHash(i + vec3(0, 1, 1)), patchHash(i + vec3(1, 1, 1)), f.x), f.y),
    f.z);
}
`;

/**
 * A material for the hide, smooth and matt, its colour in its corners; with `patches` ({ color, size, edge, seed }),
 * big round patches of that colour lie over it where its pieces let them (`spots`), crisp edged, about `size` model
 * units across (fewer the higher `edge`, 0.5 covering about half), falling differently for each `seed`. One mesh, as
 * the reference draws them: the hair laid over it before, three shells standing off it and streaks in it, came out as
 * grain and ragged edges at the size the game shows them, and drew each animal four times over.
 */
function hideMaterial(patches) {
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 });
  if (!patches) return material;
  material.onBeforeCompile = (shader) => {
    const r = seeded(patches.seed * 7919 + 1);
    shader.uniforms.patchColor = { value: new THREE.Color(patches.color) };
    shader.uniforms.patchAt = { value: new THREE.Vector3(r() * 100, r() * 100, r() * 100) };
    shader.uniforms.patchScale = { value: 1 / patches.size };
    shader.uniforms.patchEdge = { value: patches.edge ?? 0.52 };
    shader.vertexShader = `attribute float spots;\nvarying float vSpots;\nvarying vec3 vPatchAt;\n${shader.vertexShader}`.replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\n  vSpots = spots;\n  vPatchAt = position;',
    );
    shader.fragmentShader = `uniform vec3 patchColor;\nuniform vec3 patchAt;\nuniform float patchScale;\nuniform float patchEdge;\nvarying float vSpots;\nvarying vec3 vPatchAt;\n${NOISE}${shader.fragmentShader}`.replace(
      '#include <color_fragment>',
      `#include <color_fragment>
  {
    vec3 q = vPatchAt * patchScale + patchAt;
    float n = 0.72 * patchNoise(q) + 0.28 * patchNoise(q * 2.1 + 11.0);
    float w = fwidth(n) * 0.75;
    float m = smoothstep(patchEdge - w, patchEdge + w, n) * vSpots;
    diffuseColor.rgb = mix(diffuseColor.rgb, patchColor, m);
  }`,
    );
  };
  material.customProgramCacheKey = () => 'hide patches';
  return material;
}

/**
 * Pieces of hide, added as to a Batch, merged into one mesh, with `patches` over it if given (see hideMaterial). With
 * `puffs` ({ size, height, seed }), the hide swells out in round puffs about `size` model units across, up to `height`
 * high, as a fleece does.
 */
export class Coat {
  constructor({ patches = null, puffs = null } = {}) {
    this.parts = [];
    Object.assign(this, { patches, puffs });
  }

  /** As Batch.add; `spots` (0 to 1) says how much the patches show on this piece. */
  add(geometry, color, p = [0, 0, 0], s = 1, r = null, spots = 1) {
    const [sx, sy, sz] = typeof s === 'number' ? [s, s, s] : s;
    let g = geometry.clone();
    g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...p), new THREE.Quaternion().setFromEuler(new THREE.Euler(...(r ?? [0, 0, 0]))), new THREE.Vector3(sx, sy, sz)));
    if (this.puffs) {
      const { size, height, seed = 0 } = this.puffs;
      const pos = g.attributes.position;
      const normal = g.attributes.normal;
      for (let i = 0; i < pos.count; i++) {
        const d = height * puffs(...[pos.getX(i), pos.getY(i), pos.getZ(i)].map((v) => v / size + seed * 12.36));
        pos.setXYZ(i, pos.getX(i) + normal.getX(i) * d, pos.getY(i) + normal.getY(i) * d, pos.getZ(i) + normal.getZ(i) * d);
      }
      g.computeVertexNormals();
    }
    if (g.index) g = g.toNonIndexed();
    g.deleteAttribute('uv');
    paint(g, color);
    if (this.patches) g.setAttribute('spots', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count).fill(spots), 1));
    this.parts.push(g);
  }

  build() {
    const geometry = mergeGeometries(this.parts, false);
    for (const g of this.parts) g.dispose();
    const mesh = new THREE.Mesh(geometry, hideMaterial(this.patches));
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.userData.ownMaterial = true;
    return mesh;
  }
}

/**
 * A part of an animal: `build(b, coat)` adds its hide to the coat and the rest (eyes, horns, hooves) to b. `coat` says
 * how the hide is (see Coat).
 */
export function merged(build, coat = {}) {
  const batch = new Batch();
  coat = new Coat(coat);
  build(batch, coat);
  const group = batch.build({ roughness: 0.62 });
  if (coat.parts.length) group.add(coat.build());
  return group;
}

/** A horn: a tube along `points` (a smooth curve through them), r0 thick at its root narrowing to r1 at its tip. */
export function hornGeometry(points, r0, r1, n = 16, round = 8) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  const { normals, binormals } = curve.computeFrenetFrames(n, false);
  const pos = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const p = curve.getPointAt(t);
    const r = r0 + (r1 - r0) * t ** 0.8;
    for (let j = 0; j <= round; j++) {
      const a = (j / round) * TAU;
      pos.push(...p.clone().addScaledVector(normals[i], Math.cos(a) * r).addScaledVector(binormals[i], Math.sin(a) * r).toArray());
    }
  }
  const index = [];
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < round; j++) {
      const a = i * (round + 1) + j;
      const b = a + round + 1;
      index.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(index);
  g.computeVertexNormals();
  return g;
}

/**
 * A smooth body round a spine along z: `rings` are [z, y, half width, height above y, depth below y], each a rounded
 * square in section (squarer the bigger `n`), eased from one to the next; a ring of no size closes an end.
 */
export function loft(rings, steps = 5, round = 28, n = 2.6) {
  const ease = (i, t) => {
    const [p0, p1, p2, p3] = [i - 1, i, i + 1, i + 2].map((k) => rings[Math.min(rings.length - 1, Math.max(0, k))]);
    return p1.map((_, k) => 0.5 * (2 * p1[k] + (p2[k] - p0[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t * t + (3 * p1[k] - p0[k] - 3 * p2[k] + p3[k]) * t * t * t));
  };
  const sections = [];
  for (let i = 0; i < rings.length - 1; i++) for (let k = 0; k < steps; k++) sections.push(ease(i, k / steps));
  sections.push(rings.at(-1));
  const pos = [];
  const uv = [];
  for (const [z, y, w, top, bottom] of sections) {
    for (let j = 0; j <= round; j++) {
      // From under the belly round, so the seam of the hair's picture lies underneath.
      const a = (j / round) * TAU - Math.PI / 2;
      uv.push(j / round, z);
      const c = Math.cos(a);
      const s = Math.sin(a);
      pos.push(w * Math.sign(c) * Math.abs(c) ** (2 / n), y + (s > 0 ? top : bottom) * Math.sign(s) * Math.abs(s) ** (2 / n), z);
    }
  }
  const index = [];
  for (let i = 0; i < sections.length - 1; i++) {
    for (let j = 0; j < round; j++) {
      const a = i * (round + 1) + j;
      const b = a + round + 1;
      index.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(index);
  g.computeVertexNormals();
  return g;
}

/**
 * Has an animal built of `parts` (its rig, neck, head, legs, tail and ears, as buffalo() makes them) graze and walk:
 * sets g.userData.update(t, dt, speed). Standing, it grazes most of the time, its muzzle down in the grass, nibbling,
 * then lifts its head to look about for a few seconds every fourteen; walking (at `speed`, world units a second), it
 * carries its head low and nods in time with its steps, its legs stepping in diagonal pairs, `stride` world units to
 * both pairs' steps. The tail swishes and now and then an ear flicks. `poses` are how far the neck and the head are
 * turned down ([neck, head]) to `graze`, to `look` about and to `walk`; the ears hang `droop` down from level.
 */
export function grazing(g, { rig, neck, head, legs, tail, ears }, { phase, stride, poses, droop }) {
  const ease = (a, b, t) => {
    const k = Math.min(1, Math.max(0, (t - a) / (b - a)));
    return k * k * (3 - 2 * k);
  };
  const { graze, look, walk: carry } = poses;
  let walk = 0;
  let pace = 0;
  g.userData.update = (t, dt = 0, speed = 0) => {
    walk = Math.min(1, Math.max(0, walk + (speed > 0 ? 1 : -1) * dt * 2.5));
    pace += (dt * speed * TAU) / stride;
    const still = 1 - walk;
    const c = (t + phase) % 14;
    const up = ease(9.5, 10.6, c) * (1 - ease(12.8, 13.9, c)) * still;
    const nod = 0.04 * Math.sin(pace * 2);
    const nibble = (1 - up) * 0.05 * Math.max(0, Math.sin(t * 4.5 + phase)) ** 2;
    neck.rotation.x = still * (graze[0] + (look[0] - graze[0]) * up + nibble) + walk * (carry[0] + nod);
    neck.rotation.y = up * 0.35 * Math.sin((c - 9.5) * 0.9);
    head.rotation.x = still * (graze[1] + (look[1] - graze[1]) * up) + walk * (carry[1] - nod);
    for (const l of legs) l.rotation.x = walk * 0.38 * Math.sin(pace + l.userData.step);
    rig.position.y = walk * 0.012 * Math.abs(Math.cos(pace));
    tail.rotation.z = 0.28 * Math.sin(t * 1.3 + phase) + 0.1 * Math.sin(t * 3.1 + phase);
    tail.rotation.x = 0.1 + 0.08 * Math.sin(t * 0.9 + phase);
    ears.forEach((ear, k) => {
      const flick = Math.max(0, Math.sin(t * 0.7 + phase * 3 + k * 2.4)) ** 24;
      ear.rotation.x = -0.6 * flick;
      ear.rotation.z = (k ? 1 : -1) * (-droop + 0.4 * flick);
    });
  };
  g.userData.update(0);
}
