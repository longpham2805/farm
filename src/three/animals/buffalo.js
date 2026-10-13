// Buffaloes, built in code like the chickens: a grown buffalo and a calf (BUFFALOES), heavy in the forequarters like
// a Cape buffalo: the back rising to a hump over the shoulders and falling away to a smaller rump, a deep chest with a
// fold of skin under the throat, a thick neck carrying the head low in front, a long face down to a broad dark muzzle,
// horns meeting in a boss over the forehead and sweeping out and down, then up at the tips, drooping ears under them,
// and sturdy legs, darker below the knee. They graze, now and then lift their heads to look about, swish their tails
// and flick their ears, and every so often walk slowly to another spot (herd).
//
// A buffalo faces +z, standing on its origin. Its legs, neck and head, tail and ears are children of their own, so
// they can move; userData.update(t, dt, speed) moves them.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Batch, paint } from '../batch.js';
import { seeded } from '../../util.js';
import { spotIn } from './area.js';

const TAU = Math.PI * 2;
const BALL = new THREE.SphereGeometry(1, 16, 12);
const CYL = new THREE.CylinderGeometry(1, 0.8, 1, 10);
const HOOF = new THREE.CylinderGeometry(0.85, 1, 1, 10);
// How long a piece of each shape is round it and along it, at a size of 1, for laying hair on it (Coat).
BALL.userData.hair = [TAU, Math.PI];
CYL.userData.hair = [TAU * 0.9, 1];

const EYE = '#1d1d2a';

/**
 * The kinds: hide, the darker legs below the knee, the muzzle, the horns' colour, the inside of the ears, and how big
 * it stands. A calf has only buds for horns, a bigger head for its body and longer legs.
 */
export const BUFFALOES = {
  buffalo: { hide: '#686e7a', dark: '#41444c', muzzle: '#2f3137', horn: '#c4bdb0', ear: '#b88e8b', size: 1.3 },
  calf: { hide: '#757c88', dark: '#4d5059', muzzle: '#3a3c43', horn: '#cfc6b6', ear: '#c39895', calf: true, size: 0.72 },
};

// The coat of hair: a picture of tufts of strands lying one way (up and down it), laid over the hide's colour to
// streak it darker and lighter, and raised by a bump, on a matt hide; and, for the hair standing off the hide, a mask
// of the same strands, brighter where they stand longer. The pictures cover HAIR model units of hide.
const HAIR = 0.26;
let hairPictures;
function hairTextures() {
  if (hairPictures !== undefined) return hairPictures;
  // None outside a browser (the tests), where nothing is drawn.
  if (typeof document === 'undefined') return (hairPictures = null);
  const size = 256;
  const canvas = (fill) => {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    g.fillStyle = fill;
    g.fillRect(0, 0, size, size);
    g.lineCap = 'round';
    return [c, g];
  };
  const [coatCanvas, coat] = canvas('#dedede');
  const [maskCanvas, mask] = canvas('#000000');
  const rand = seeded(53);
  const strand = (g, x, y, a, len, bend, width, style) => {
    g.strokeStyle = style;
    g.lineWidth = width;
    // Drawn again a picture's width or height away, so the strands run on across its edges.
    for (const [ox, oy] of [[0, 0], [-size, 0], [0, -size], [size, 0], [0, size]]) {
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
  const texture = (c) => {
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 4;
    return tex;
  };
  return (hairPictures = { coat: texture(coatCanvas), mask: texture(maskCanvas) });
}

// The hair standing off the hide: the coat drawn again a little way out (in model units), showing only the strands of
// the mask brighter than its threshold, fewer the farther out, so the hide's edges look soft.
const SHELLS = [[0.004, 0.45], [0.008, 0.6], [0.012, 0.75]];

/**
 * Pieces of hide, added as to a Batch, merged into one mesh wearing the coat of hair, with the hair standing off it
 * unless `flat`. Each piece keeps its texture coordinates, scaled to its size so the strands come out the same size
 * all over: lying down a leg, down the neck and the head, back along the body.
 */
class Coat {
  constructor(flat = false) {
    this.parts = [];
    this.flat = flat;
  }

  add(geometry, color, p = [0, 0, 0], s = 1, r = null) {
    const [sx, sy, sz] = typeof s === 'number' ? [s, s, s] : s;
    const g = geometry.index ? geometry.toNonIndexed() : geometry.clone();
    const [round, along] = geometry.userData.hair;
    const ru = Math.max(1, Math.round((round * (sx + sz)) / 2 / HAIR));
    const rv = (along * sy) / HAIR;
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * ru, uv.getY(i) * rv);
    g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...p), new THREE.Quaternion().setFromEuler(new THREE.Euler(...(r ?? [0, 0, 0]))), new THREE.Vector3(sx, sy, sz)));
    paint(g, color);
    this.parts.push(g);
  }

  build() {
    const pictures = hairTextures();
    const geometry = mergeGeometries(this.parts, false);
    for (const g of this.parts) g.dispose();
    const hide = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, ...(pictures && { map: pictures.coat, bumpMap: pictures.coat, bumpScale: 2 }) });
    const mesh = new THREE.Mesh(geometry, hide);
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.userData.ownMaterial = true;
    if (!pictures || this.flat) return mesh;
    for (const [out, threshold] of SHELLS) {
      const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, map: pictures.coat, alphaMap: pictures.mask, alphaTest: threshold });
      material.onBeforeCompile = (shader) => {
        shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>\n  transformed += normalize(objectNormal) * ${out.toFixed(4)};`);
      };
      material.customProgramCacheKey = () => `hair ${out}`;
      const shell = new THREE.Mesh(geometry, material);
      shell.receiveShadow = true;
      shell.userData.ownMaterial = true;
      mesh.add(shell);
    }
    return mesh;
  }
}

/**
 * A part of a buffalo: `build(b, coat)` adds its hairy hide to the coat and the rest (eyes, horns, hooves) to b. A
 * small part's hair lies `flat`.
 */
function merged(build, flat = false) {
  const batch = new Batch();
  const coat = new Coat(flat);
  build(batch, coat);
  const group = batch.build({ roughness: 0.62 });
  if (coat.parts.length) group.add(coat.build());
  return group;
}

/** A horn: a tube along `points` (a smooth curve through them), r0 thick at its root narrowing to r1 at its tip. */
function hornGeometry(points, r0, r1, n = 16, round = 8) {
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
 * square in section, eased from one to the next; a ring of no size closes an end.
 */
function loft(rings, steps = 5, round = 28, n = 2.6) {
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

// The body along its back, from the rump to the chest, about the height it stands at: the rump smaller and lower, the
// barrel with its belly tucked up, the deep chest, and the hump over the shoulders the highest point.
const TRUNK = [
  [-0.45, 0.01, 0, 0, 0],
  [-0.44, 0.01, 0.07, 0.07, 0.07],
  [-0.41, 0.01, 0.12, 0.13, 0.12],
  [-0.34, 0.01, 0.155, 0.16, 0.155],
  [-0.23, 0.01, 0.17, 0.165, 0.165],
  [-0.09, 0.0, 0.185, 0.19, 0.18],
  [0.04, 0.02, 0.2, 0.235, 0.205],
  [0.14, 0.03, 0.2, 0.265, 0.225],
  [0.24, 0.03, 0.185, 0.225, 0.22],
  [0.32, 0.02, 0.15, 0.16, 0.19],
  [0.37, 0.0, 0.09, 0.09, 0.12],
  [0.385, 0.0, 0, 0, 0],
];
const TRUNK_GEOMETRY = loft(TRUNK);
// Round its middle, and along it in model units.
TRUNK_GEOMETRY.userData.hair = [1.3, 1];

/** A leg `h` long and `w` thick hanging from its top at the origin, darker below the knee. */
function leg(kind, h, w) {
  return merged((b, coat) => {
    coat.add(CYL, kind.hide, [0, -h * 0.3, 0], [w * 1.1, h * 0.6, w * 1.15]);
    coat.add(BALL, kind.dark, [0, -h * 0.58, 0], [w * 0.85, w * 0.85, w * 0.9]);
    coat.add(CYL, kind.dark, [0, -h * 0.78, 0], [w * 0.78, h * 0.4, w * 0.82]);
    b.add(HOOF, '#222226', [0, -h + 0.02, 0.006], [w * 0.92, 0.04, w]);
  });
}

// How far a buffalo goes in one stride (both pairs of legs stepping), as modelled, before its size.
const STRIDE = 0.42;

/**
 * A buffalo of the given kind (a name in BUFFALOES), facing +z on its origin. userData.update(t, dt, speed) moves it:
 * at a standstill it grazes, at `speed` (world units a second) it walks, its legs stepping in time.
 */
export function buffalo(name, phase = 0) {
  const kind = BUFFALOES[name];
  const calf = !!kind.calf;
  const g = new THREE.Group();
  // Everything bobs a little as it walks.
  const rig = new THREE.Group();
  g.add(rig);
  // Where the body sits: the legs up to it are `len` long, longer for a calf.
  const len = calf ? 0.31 : 0.25;
  const y = len + 0.18;

  rig.add(merged((b, coat) => {
    coat.add(TRUNK_GEOMETRY, kind.hide, [0, y, 0]);
    // The fold of skin hanging under the throat.
    coat.add(BALL, kind.hide, [0, y - 0.13, 0.27], [0.05, 0.11, 0.075]);
    // Shoulders and haunches, swelling a little out of the body down to the legs.
    for (const s of [-1, 1]) {
      coat.add(BALL, kind.hide, [s * 0.1, y - 0.07, 0.17], [0.085, 0.17, 0.12]);
      coat.add(BALL, kind.hide, [s * 0.09, y - 0.04, -0.25], [0.085, 0.17, 0.14]);
    }
  }));
  // The legs swing from the top: front left with back right, then front right with back left. The front ones, under
  // the weight of the forequarters, are the stouter.
  const legs = [[-0.1, 0.17, 0.056, 0], [0.1, 0.17, 0.056, Math.PI], [-0.1, -0.24, 0.052, Math.PI], [0.1, -0.24, 0.052, 0]].map(([x, z, w, step]) => {
    const l = leg(kind, len + 0.06, w);
    l.position.set(x, len + 0.06, z);
    l.userData.step = step;
    rig.add(l);
    return l;
  });

  // The tail hangs from the top of the rump to the hocks, a tuft at its end.
  const tail = new THREE.Group();
  tail.position.set(0, y + 0.12, -0.38);
  tail.add(merged((b, coat) => {
    coat.add(CYL, kind.hide, [0, -0.15, -0.01], [0.012, 0.3, 0.012], [0.08, 0, 0]);
    coat.add(BALL, '#26272b', [0, -0.31, -0.02], [0.024, 0.055, 0.024]);
  }, true));
  rig.add(tail);

  // The thick neck swings down from the shoulders to graze, carrying the head.
  const neck = new THREE.Group();
  neck.position.set(0, y + 0.08, 0.26);
  neck.add(merged((b, coat) => coat.add(BALL, kind.hide, [0, -0.03, 0.08], [0.13, 0.15, 0.16], [0.35, 0, 0])));
  // The head turns about the top of the skull. Its long face slopes down and forward to a broad dark muzzle; a calf's
  // head is bigger for its body.
  const head = new THREE.Group();
  head.position.set(0, -0.02, 0.24);
  head.scale.setScalar(calf ? 1.3 : 1.15);
  head.add(merged((b, coat) => {
    coat.add(BALL, kind.hide, [0, -0.01, 0.02], [0.092, 0.085, 0.085]);
    coat.add(BALL, kind.hide, [0, -0.1, 0.075], [0.07, 0.12, 0.068], [-0.4, 0, 0]);
    b.add(BALL, kind.muzzle, [0, -0.19, 0.125], [0.076, 0.058, 0.066], [-0.2, 0, 0]);
    for (const s of [-1, 1]) {
      b.add(BALL, '#1d1d22', [s * 0.032, -0.2, 0.18], [0.015, 0.011, 0.01]);
      b.add(BALL, '#ece8e0', [s * 0.07, -0.035, 0.07], 0.019);
      b.add(BALL, EYE, [s * 0.076, -0.035, 0.08], 0.012);
      b.add(BALL, '#ffffff', [s * 0.08, -0.03, 0.088], 0.004);
    }
    if (!calf) {
      // The boss: the horns' broad bases meeting in one over the forehead; from it each horn sweeps out and down
      // beside the head, then up, its tip turning in a little.
      b.add(BALL, kind.horn, [0, 0.058, 0.0], [0.11, 0.038, 0.068]);
      for (const s of [-1, 1]) {
        b.add(hornGeometry([[s * 0.08, 0.058, -0.005], [s * 0.145, 0.03, -0.01], [s * 0.195, -0.01, -0.015], [s * 0.24, 0.0, -0.025], [s * 0.265, 0.05, -0.045], [s * 0.245, 0.095, -0.075]], 0.04, 0.007), kind.horn);
      }
    } else {
      // A calf's horns are only buds, in a tuft of hair.
      coat.add(BALL, kind.dark, [0, 0.065, 0.0], [0.05, 0.025, 0.05]);
      for (const s of [-1, 1]) b.add(BALL, kind.horn, [s * 0.05, 0.06, 0.0], [0.018, 0.022, 0.018]);
    }
  }, true));
  // The ears, broad and drooping under the horns, pink inside, flicking now and then.
  const ears = [-1, 1].map((s) => {
    const ear = merged((b, coat) => {
      coat.add(BALL, kind.hide, [s * 0.055, 0, 0], [0.062, 0.036, 0.016]);
      b.add(BALL, kind.ear, [s * 0.058, -0.002, 0.008], [0.046, 0.025, 0.01]);
    }, true);
    ear.position.set(s * 0.08, -0.04, 0.0);
    ear.rotation.z = s * -0.5;
    head.add(ear);
    return ear;
  });
  neck.add(head);
  rig.add(neck);

  // Standing, it grazes most of the time, its muzzle down in the grass, nibbling, then lifts its head to look about for
  // a few seconds; walking, it carries its head low and nods in time with its steps. The tail swishes and now and then
  // an ear flicks.
  const ease = (a, b, t) => {
    const k = Math.min(1, Math.max(0, (t - a) / (b - a)));
    return k * k * (3 - 2 * k);
  };
  let walk = 0;
  let stride = 0;
  g.userData.update = (t, dt = 0, speed = 0) => {
    walk = Math.min(1, Math.max(0, walk + (speed > 0 ? 1 : -1) * dt * 2.5));
    stride += (dt * speed * Math.PI * 2) / (STRIDE * kind.size);
    const still = 1 - walk;
    const c = (t + phase) % 14;
    const up = ease(9.5, 10.6, c) * (1 - ease(12.8, 13.9, c)) * still;
    const nod = 0.04 * Math.sin(stride * 2);
    neck.rotation.x = still * (0.9 - 0.8 * up + (1 - up) * 0.05 * Math.max(0, Math.sin(t * 4.5 + phase)) ** 2) + walk * (0.3 + nod);
    neck.rotation.y = up * 0.35 * Math.sin((c - 9.5) * 0.9);
    head.rotation.x = still * (-0.3 + 0.45 * up) + walk * (0.1 - nod);
    for (const l of legs) l.rotation.x = walk * 0.38 * Math.sin(stride + l.userData.step);
    rig.position.y = walk * 0.012 * Math.abs(Math.cos(stride));
    tail.rotation.z = 0.28 * Math.sin(t * 1.3 + phase) + 0.1 * Math.sin(t * 3.1 + phase);
    tail.rotation.x = 0.1 + 0.08 * Math.sin(t * 0.9 + phase);
    ears.forEach((ear, k) => {
      const flick = Math.max(0, Math.sin(t * 0.7 + phase * 3 + k * 2.4)) ** 24;
      ear.rotation.x = -0.6 * flick;
      ear.rotation.z = (k ? 1 : -1) * (-0.5 + 0.4 * flick);
    });
  };
  g.userData.update(0);
  g.scale.setScalar(kind.size);
  return g;
}

// The ground a buffalo takes up, before its size: circles along its back from the tail to the muzzle, [how far
// forward, radius], wide enough for the horns and for the head lifted and turned to look about.
const BODY = [[-0.27, 0.2], [0.07, 0.22], [0.5, 0.36], [0.7, 0.13]];
// How much room a buffalo leaves round the others when it picks where to go, and how near it lets itself come.
const ROOM = 0.08;
const NEAREST = 0.02;

/**
 * How far apart two buffaloes are, body to body, standing at p and q ([x, z, heading, size]): below 0 when they
 * overlap.
 */
export function gap(p, q) {
  let best = Infinity;
  for (const [fp, rp] of BODY) {
    const px = p[0] + Math.sin(p[2]) * fp * p[3];
    const pz = p[1] + Math.cos(p[2]) * fp * p[3];
    for (const [fq, rq] of BODY) {
      const qx = q[0] + Math.sin(q[2]) * fq * q[3];
      const qz = q[1] + Math.cos(q[2]) * fq * q[3];
      best = Math.min(best, Math.hypot(px - qx, pz - qz) - rp * p[3] - rq * q[3]);
    }
  }
  return best;
}

/**
 * Buffaloes let loose in `area`, a polygon of world points, each starting at its spot facing its way ([{ name, x, z,
 * heading }]): each grazes a while, then turns and walks slowly to another spot not far off and grazes there. A calf
 * keeps near the first of them, its mother, setting off soon after she gets where she was going. None walks into
 * another: they take turns, one walking while the others graze, and it goes only where it can turn and walk clear of
 * them; a calf stands out of its mother's reach as she turns about, so she can always turn. Returns the group and
 * update(t, dt).
 */
export function herd(area, members) {
  const group = new THREE.Group();
  const animals = members.map(({ name, x, z, heading }, k) => {
    const a = buffalo(name, k * 5.3);
    a.position.set(x, 0, z);
    a.rotation.y = heading;
    const kind = BUFFALOES[name];
    Object.assign(a.userData, { calf: !!kind.calf, size: kind.size, target: null, way: null, wait: 6 + Math.random() * 10, pace: kind.calf ? 0.15 : 0.11, stuck: 0 });
    group.add(a);
    return a;
  });
  const mother = animals.find((a) => !a.userData.calf) ?? animals[0];
  const here = (a) => [a.position.x, a.position.z];
  const pose = (a, x = a.position.x, z = a.position.z, heading = a.rotation.y) => [x, z, heading, a.userData.size];
  // How far a buffalo reaches from where it stands, whichever way it turns.
  const reach = (a) => Math.max(...BODY.map(([f, r]) => Math.abs(f) + r)) * a.userData.size;
  // The poses `a` goes through to (x, z): turning on the spot towards it, the shorter way round or, with `long`, the
  // longer, then walking there. `spin` says which way it turns.
  const wayTo = (a, x, z, long = false) => {
    const [x0, z0, h0] = pose(a);
    const heading = Math.atan2(x - x0, z - z0);
    let turn = heading - h0;
    turn = Math.atan2(Math.sin(turn), Math.cos(turn));
    if (long) turn -= Math.sign(turn) * TAU;
    const way = [];
    const m = Math.ceil(Math.abs(turn) / 0.15);
    for (let k = 1; k <= m; k++) way.push(pose(a, x0, z0, h0 + (turn * k) / m));
    const n = Math.ceil(Math.hypot(x - x0, z - z0) / 0.1);
    for (let k = 1; k <= n; k++) way.push(pose(a, x0 + ((x - x0) * k) / n, z0 + ((z - z0) * k) / n, heading));
    way.spin = Math.sign(turn);
    return way;
  };
  // The way `a` can take to (x, z), turning whichever way round keeps clear of the others where they stand, and for a
  // calf, ending out of its mother's reach; null if there is none. One already too near another only has to keep from
  // coming nearer.
  const clearWay = (a) => {
    const start = pose(a);
    const others = animals.filter((o) => o !== a).map((o) => pose(o));
    const room = others.map((o) => Math.min(ROOM, gap(start, o)));
    const turnsAbout = a.userData.calf && a !== mother ? [mother.position.x, mother.position.z, reach(mother)] : null;
    const outOfReach = ([x, z, h, size]) => BODY.every(([f, r]) => Math.hypot(x + Math.sin(h) * f * size - turnsAbout[0], z + Math.cos(h) * f * size - turnsAbout[1]) - r * size - turnsAbout[2] > ROOM);
    return (x, z) => {
      for (const long of [false, true]) {
        const way = wayTo(a, x, z, long);
        if ((!turnsAbout || outOfReach(way.at(-1))) && way.every((p) => others.every((o, k) => gap(p, o) > room[k]))) return way;
      }
      return null;
    };
  };
  const go = (a, target, way = null) => {
    a.userData.target = target;
    a.userData.way = way;
  };
  const update = (t, dt) => {
    for (const a of animals) {
      const u = a.userData;
      let speed = 0;
      if (!u.target) {
        u.wait -= dt;
        // It waits for any other walking to get there first.
        if (u.wait <= 0 && animals.some((o) => o.userData.target)) u.wait = 0.5 + Math.random();
        if (u.wait <= 0) {
          const clear = clearWay(a);
          let spot;
          if (u.calf && a !== mother) {
            // Somewhere near its mother, out of her way, and not off across the grass.
            spot = spotIn(area, here(mother), [0, 2], clear);
            if (spot && Math.hypot(spot[0] - mother.position.x, spot[1] - mother.position.z) > 2.6) spot = null;
          } else {
            spot = spotIn(area, here(a), [0.6, 1.5], clear);
          }
          if (spot) go(a, spot, clear(...spot));
          // Nowhere clear to go: it grazes a little longer.
          else u.wait = 1 + Math.random() * 2;
        }
      } else {
        const dx = u.target[0] - a.position.x;
        const dz = u.target[1] - a.position.z;
        const d = Math.hypot(dx, dz);
        if (d < 0.05) {
          go(a, null);
          u.wait = u.calf ? 4 + Math.random() * 8 : 8 + Math.random() * 14;
          // The calf follows her before long.
          if (a === mother) for (const c of animals) if (c.userData.calf) c.userData.wait = Math.min(c.userData.wait, 1 + Math.random() * 2);
        } else {
          // Turn towards it, the way round it chose, walking on only once facing near enough its way.
          let turn = Math.atan2(dx, dz) - a.rotation.y;
          turn = Math.atan2(Math.sin(turn), Math.cos(turn));
          if (u.way.spin && Math.abs(turn) > 0.3 && Math.sign(turn) !== u.way.spin) turn -= Math.sign(turn) * TAU;
          const heading = a.rotation.y + Math.sign(turn) * Math.min(Math.abs(turn), dt * 0.9);
          speed = u.pace * Math.max(0, Math.cos(turn)) ** 2 * Math.min(1, d / 0.2 + 0.3);
          // Turning on the spot still takes steps.
          if (speed < 0.03 && Math.abs(turn) > 0.05) speed = 0.03;
          const step = Math.min(d, dt * speed * Math.max(0, Math.cos(turn)));
          const x = a.position.x + Math.sin(heading) * step;
          const z = a.position.z + Math.cos(heading) * step;
          // Should it still come too near another, it stops; kept back a while, it grazes where it is.
          const moved = pose(a, x, z, heading);
          if (animals.some((o) => o !== a && gap(moved, pose(o)) < Math.min(NEAREST, gap(pose(a), pose(o))))) {
            speed = 0;
            u.stuck += dt;
            if (u.stuck > 2) {
              go(a, null);
              u.wait = 1 + Math.random() * 3;
              u.stuck = 0;
            }
          } else {
            u.stuck = 0;
            a.rotation.y = heading;
            a.position.x = x;
            a.position.z = z;
          }
        }
      }
      u.update(t, dt, speed);
    }
  };
  return { group, update };
}
