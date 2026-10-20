// What the grazing animals (buffalo.js, cow.js, sheep.js) are built from: the shapes, the coat of hair or wool laid
// over their hide (with big patches of another colour if they have them), a smooth body round a spine (loft), horns,
// and the way they graze, look about and walk (grazing).
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Batch, paint } from '../batch.js';
import { seeded } from '../../util.js';

export const TAU = Math.PI * 2;
export const BALL = new THREE.SphereGeometry(1, 16, 12);
// A ball fine enough to be lumpy (a fleece, see Coat).
export const FINE_BALL = new THREE.SphereGeometry(1, 36, 26);
export const CYL = new THREE.CylinderGeometry(1, 0.8, 1, 10);
export const HOOF = new THREE.CylinderGeometry(0.85, 1, 1, 10);
// How long a piece of each shape is round it and along it, at a size of 1, for laying hair on it (Coat).
BALL.userData.hair = FINE_BALL.userData.hair = [TAU, Math.PI];
CYL.userData.hair = [TAU * 0.9, 1];

// The coats: for each, a picture laid over the hide's colour to streak it darker and lighter, and raised by a bump, on
// a matt hide; and, for the coat standing off the hide, a mask, brighter where it stands farther. Hair is tufts of
// strands lying one way (up and down the picture); wool is curls packed together, each lit on top and shaded round its
// edge. The pictures cover SPAN model units of hide.
const SPAN = { hair: 0.26, wool: 0.2 };
const coatPictures = {};
function coatTextures(kind) {
  if (kind in coatPictures) return coatPictures[kind];
  // None outside a browser (the tests), where nothing is drawn.
  if (typeof document === 'undefined') return (coatPictures[kind] = null);
  const size = 256;
  // Anything drawn is drawn again a picture's width or height away, so it runs on across the edges.
  const WRAP = [[0, 0], [-size, 0], [0, -size], [size, 0], [0, size]];
  const canvas = (fill) => {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    g.fillStyle = fill;
    g.fillRect(0, 0, size, size);
    g.lineCap = 'round';
    return [c, g];
  };
  const [coatCanvas, coat] = canvas(kind === 'wool' ? '#bdbdbd' : '#dedede');
  const [maskCanvas, mask] = canvas('#000000');
  const rand = seeded(53);
  const texture = (c) => {
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 4;
    return tex;
  };
  if (kind === 'wool') {
    for (let k = 0; k < 520; k++) {
      // A curl, overlapping those drawn before it: a dome of wool lit from above, with a curled line in it.
      const x = rand() * size;
      const y = rand() * size;
      const r = 8 + rand() * 9;
      const turn = rand() * TAU;
      const stand = Math.round(150 + rand() * 105);
      for (const [ox, oy] of WRAP) {
        const cx = x + ox;
        const cy = y + oy;
        const lit = coat.createRadialGradient(cx - r * 0.25, cy - r * 0.3, r * 0.1, cx, cy, r);
        lit.addColorStop(0, '#ffffff');
        lit.addColorStop(0.55, '#e4e4e4');
        lit.addColorStop(1, '#a6a6a6');
        coat.fillStyle = lit;
        coat.beginPath();
        coat.arc(cx, cy, r, 0, TAU);
        coat.fill();
        coat.strokeStyle = 'rgba(140, 140, 140, 0.55)';
        coat.lineWidth = 1.4;
        coat.beginPath();
        coat.arc(cx, cy, r * 0.5, turn, turn + 4);
        coat.stroke();
        const dome = mask.createRadialGradient(cx, cy, 0, cx, cy, r);
        dome.addColorStop(0, `rgb(${stand}, ${stand}, ${stand})`);
        dome.addColorStop(1, '#000000');
        mask.fillStyle = dome;
        mask.beginPath();
        mask.arc(cx, cy, r, 0, TAU);
        mask.fill();
      }
    }
    return (coatPictures[kind] = { coat: texture(coatCanvas), mask: texture(maskCanvas) });
  }
  const strand = (g, x, y, a, len, bend, width, style) => {
    g.strokeStyle = style;
    g.lineWidth = width;
    for (const [ox, oy] of WRAP) {
      g.beginPath();
      g.moveTo(x + ox, y + oy);
      g.quadraticCurveTo(x + ox + Math.cos(a) * len * 0.5 - Math.sin(a) * bend, y + oy + Math.sin(a) * len * 0.5 + Math.cos(a) * bend, x + ox + Math.cos(a) * len, y + oy + Math.sin(a) * len);
      g.stroke();
    }
  };
  for (let k = 0; k < 700; k++) {
    // A tuft: a few strands side by side, dark ones with a light one among them, all bending the same way.
    const x = rand() * size;
    const y = rand() * size;
    const a = Math.PI / 2 + (rand() - 0.5) * 0.6;
    const len = 16 + rand() * 26;
    const bend = (rand() - 0.5) * 8;
    const stand = 0.25 + rand() * 0.75;
    for (let i = 0; i < 3 + rand() * 4; i++) {
      const dx = (rand() - 0.5) * 7;
      const l = len * (0.7 + rand() * 0.3);
      const v = i % 3 === 2 ? Math.round(225 + rand() * 30) : Math.round(130 + rand() * 60);
      strand(coat, x + dx, y, a, l, bend, 1 + rand() * 1.4, `rgb(${v}, ${v}, ${v})`);
      const m = Math.round(255 * stand * (0.6 + rand() * 0.4));
      strand(mask, x + dx, y, a, l, bend, 1.2 + rand() * 1.2, `rgb(${m}, ${m}, ${m})`);
    }
  }
  return (coatPictures[kind] = { coat: texture(coatCanvas), mask: texture(maskCanvas) });
}

// Smooth noise in three dimensions, from 0 to 1, for lumps in a fleece.
function hash(i, j, k) {
  let h = Math.imul(i, 374761393) + Math.imul(j, 668265263) + Math.imul(k, 1440662683);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function noise(x, y, z) {
  const [i, j, k] = [Math.floor(x), Math.floor(y), Math.floor(z)];
  const [u, v, w] = [x - i, y - j, z - k].map((f) => f * f * (3 - 2 * f));
  const lerp = (a, b, t) => a + (b - a) * t;
  const row = (dj, dk) => lerp(hash(i, j + dj, k + dk), hash(i + 1, j + dj, k + dk), u);
  return lerp(lerp(row(0, 0), row(1, 0), v), lerp(row(0, 1), row(1, 1), v), w);
}

// The hair standing off the hide: the coat drawn again a little way out (in model units), showing only the strands of
// the mask brighter than its threshold, fewer the farther out, so the hide's edges look soft.
const SHELLS = [[0.004, 0.45], [0.008, 0.6], [0.012, 0.75]];

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
 * A material for the hide: with `out`, drawn that far out along its normals (a shell of hair); the strands streaking
 * its colour only `streak` as much as on a buffalo (1); with `patches` ({ color, size, edge, seed }), big patches of
 * that colour lie over it where its pieces let them (`spots`), about `size` model units across (fewer the higher
 * `edge`, 0.5 covering about half), their edges ragged with the hair, falling differently for each `seed`.
 */
function hideMaterial(options, { out = 0, streak = 1, patches = null }) {
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, ...options });
  if (!out && streak === 1 && !patches) return material;
  material.onBeforeCompile = (shader) => {
    if (out) shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>\n  transformed += normalize(objectNormal) * ${out.toFixed(4)};`);
    if (streak !== 1) {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <map_fragment>',
        `vec4 sampledDiffuseColor = texture2D(map, vMapUv);\n  sampledDiffuseColor.rgb = mix(vec3(1.0), sampledDiffuseColor.rgb, ${streak.toFixed(3)});\n  diffuseColor *= sampledDiffuseColor;`,
      );
    }
    if (!patches) return;
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
    float n = 0.6 * patchNoise(q) + 0.28 * patchNoise(q * 2.2 + 11.0) + 0.12 * patchNoise(q * 5.0 + 23.0);
    // The strands of the coat run across the edge.
    n += (sampledDiffuseColor.g - 0.8) * 0.12;
    float w = fwidth(n) * 0.75;
    float m = smoothstep(patchEdge - w, patchEdge + w, n) * vSpots;
    diffuseColor.rgb = mix(diffuseColor.rgb, patchColor * sampledDiffuseColor.rgb, m);
  }`,
    );
  };
  material.customProgramCacheKey = () => `hide ${out} ${streak} ${!!patches}`;
  return material;
}

/**
 * Pieces of hide, added as to a Batch, merged into one mesh wearing a coat of hair (or `wool`), with the coat
 * standing off it unless `flat`, and `patches` over it if given (see hideMaterial). A shorter, sleeker coat than a
 * buffalo's has the hair standing off only `stand` as far and the strands streaking and raising it only `streak` as
 * much; a fleece stands farther. With `lumps` ({ size, height, seed }), the hide swells out in lumps about `size`
 * model units across, up to `height` high, as a fleece does. Each piece keeps its texture coordinates, scaled to its
 * size so the coat comes out the same size all over: lying down a leg, down the neck and the head, back along the body.
 */
export class Coat {
  constructor({ flat = false, patches = null, stand = 1, streak = 1, wool = false, lumps = null } = {}) {
    this.parts = [];
    Object.assign(this, { flat, patches, stand, streak, kind: wool ? 'wool' : 'hair', lumps });
  }

  /** As Batch.add; `spots` (0 to 1) says how much the patches show on this piece. */
  add(geometry, color, p = [0, 0, 0], s = 1, r = null, spots = 1) {
    const [sx, sy, sz] = typeof s === 'number' ? [s, s, s] : s;
    let g = geometry.clone();
    g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...p), new THREE.Quaternion().setFromEuler(new THREE.Euler(...(r ?? [0, 0, 0]))), new THREE.Vector3(sx, sy, sz)));
    if (this.lumps) {
      const { size, height, seed = 0 } = this.lumps;
      const pos = g.attributes.position;
      const normal = g.attributes.normal;
      for (let i = 0; i < pos.count; i++) {
        const [x, y, z] = [pos.getX(i), pos.getY(i), pos.getZ(i)].map((v) => v / size + seed * 17.3);
        const d = height * (0.7 * noise(x, y, z) + 0.3 * noise(x * 2.3, y * 2.3, z * 2.3));
        pos.setXYZ(i, pos.getX(i) + normal.getX(i) * d, pos.getY(i) + normal.getY(i) * d, pos.getZ(i) + normal.getZ(i) * d);
      }
      g.computeVertexNormals();
    }
    if (g.index) g = g.toNonIndexed();
    const [round, along] = geometry.userData.hair;
    const span = SPAN[this.kind];
    const ru = Math.max(1, Math.round((round * (sx + sz)) / 2 / span));
    const rv = (along * sy) / span;
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * ru, uv.getY(i) * rv);
    paint(g, color);
    if (this.patches) g.setAttribute('spots', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count).fill(spots), 1));
    this.parts.push(g);
  }

  build() {
    const pictures = coatTextures(this.kind);
    const geometry = mergeGeometries(this.parts, false);
    for (const g of this.parts) g.dispose();
    const { patches, streak } = pictures ? this : {};
    const mesh = new THREE.Mesh(geometry, hideMaterial(pictures ? { map: pictures.coat, bumpMap: pictures.coat, bumpScale: 2 * this.streak } : {}, { streak, patches }));
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.userData.ownMaterial = true;
    if (!pictures || this.flat) return mesh;
    for (const [out, threshold] of SHELLS) {
      const shell = new THREE.Mesh(geometry, hideMaterial({ map: pictures.coat, alphaMap: pictures.mask, alphaTest: threshold }, { out: out * this.stand, streak, patches }));
      shell.receiveShadow = true;
      shell.userData.ownMaterial = true;
      mesh.add(shell);
    }
    return mesh;
  }
}

/**
 * A part of an animal: `build(b, coat)` adds its hairy hide to the coat and the rest (eyes, horns, hooves) to b.
 * `coat` says how the coat is (see Coat): a small part's hair lies `flat`.
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
