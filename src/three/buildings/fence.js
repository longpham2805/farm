// Wooden rail fences, as the reference draws them round the meadow, the fields over the big bridge and the hens' yard,
// inside the ring road and along it in front of the farm: posts of rough round wood, a little thicker at the foot and
// rounded over at the top, no two quite the same height, quite upright or quite in line; two rails of round poles
// from post to post, nailed on one side of them, each sagging a little and a little off level, running on a little
// past the post at either end. The wood warm orange-brown, lit on top and dark underneath, streaked along its grain,
// each piece a shade of its own and some greyer with weather, a dark knot here and there, the rails' cut ends pale.
// And a gate of boards with a brace across it where one is wanted.
import * as THREE from 'three';
import { BOX } from './parts.js';
import { mesher } from '../plants/parts.js';

const TAU = Math.PI * 2;
/** The wood as the reference draws it on its fences (sampled from the meadow's and the ring's). */
export const FENCE_WOOD = '#b8722f';
const HINGE = '#3b3a3c';
// The game's sun (SUN_DIR in countryside.js), for colouring what faces it.
const SUN = new THREE.Vector3(-0.414, 1.11, 0.91).normalize();

/**
 * How a fence is built, in world units: its posts' radius at the foot and at the top, how far they lean and stray
 * from the line (either way), how much taller or shorter they are (either way, of the height); its rails' radius,
 * their heights (of the fence's), how far they sag in the middle, how far each end strays from level, how far they
 * run past a post.
 */
const FORM = {
  post: [0.044, 0.038], lean: 0.05, stray: 0.014, tall: 0.07,
  rail: 0.026, rails: [0.4, 0.82], sag: [0.004, 0.014], level: 0.012, past: 0.035,
};

/**
 * The colours of a piece of wood of colour `base`: lit and in shade, its cut ends and its knots, shifted a little
 * piece by piece in hue and lightness, some greyer with weather.
 */
function woodColors(base, rand) {
  const c = new THREE.Color(base).offsetHSL((rand() - 0.5) * 0.03, 0, 0).multiplyScalar(0.9 + rand() * 0.18);
  if (rand() < 0.3) c.lerp(new THREE.Color('#8f8070'), 0.12 + rand() * 0.18);
  return {
    light: c.clone().lerp(new THREE.Color('#ffd9a0'), 0.22),
    dark: c.clone().multiplyScalar(0.48),
    cut: c.clone().lerp(new THREE.Color('#f4d6a6'), 0.5),
    knot: c.clone().multiplyScalar(0.3),
  };
}

/**
 * A piece of rough round wood along `path` (points) with `radii` there, into the mesher `m`: `sides` faces, each a
 * little wider or narrower and further out or in than the next, the same all along, so it looks hewn rather than
 * turned; each face a shade of its own, so the grain streaks along it, each length of it a little lighter or darker,
 * `knots` dark knots on it; each face lit by how it faces `sun` (in the mesher's frame), from `c.dark` to `c.light`.
 * Its start is left open (in the ground) unless `cutStart`; its end is cut flat and pale (`end` 'cut') or rounded
 * over to a low point ('round'; narrow `radii` there for that).
 */
function log(m, rand, path, radii, c, sun, { sides = 6, cutStart = false, end = 'cut', knots = 0 } = {}) {
  const n = path.length;
  const axis = path[n - 1].clone().sub(path[0]).normalize();
  const u = new THREE.Vector3().crossVectors(axis, Math.abs(axis.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)).normalize();
  const v = new THREE.Vector3().crossVectors(axis, u);
  const spin = rand() * TAU;
  const faces = Array.from({ length: sides }, (_, k) => ({ a: spin + ((k + (rand() - 0.5) * 0.4) / sides) * TAU, r: 0.88 + rand() * 0.22, grain: 0.74 + rand() * 0.36 }));
  const rings = path.map((p, i) => faces.map(({ a, r }) => p.clone().addScaledVector(u, Math.cos(a) * radii[i] * r).addScaledVector(v, Math.sin(a) * radii[i] * r)));
  const lengths = path.map(() => 0.93 + rand() * 0.12);
  const knotted = new Set(Array.from({ length: knots }, () => `${Math.floor(rand() * (n - 1))},${Math.floor(rand() * sides)}`));
  const lit = (normal) => c.dark.clone().lerp(c.light, THREE.MathUtils.clamp(0.5 + 0.5 * normal.dot(sun), 0, 1));
  for (let i = 0; i + 1 < n; i++) {
    const mid = path[i].clone().add(path[i + 1]).multiplyScalar(0.5);
    const out = (p, q, r) => p.clone().add(q).add(r).divideScalar(3).sub(mid);
    for (let k = 0; k < sides; k++) {
      const k1 = (k + 1) % sides;
      const [a, b, cc, d] = [rings[i][k], rings[i][k1], rings[i + 1][k1], rings[i + 1][k]];
      const normal = new THREE.Vector3().subVectors(cc, a).cross(new THREE.Vector3().subVectors(b, d)).normalize();
      if (normal.dot(out(a, b, cc)) < 0) normal.negate();
      const col = knotted.has(`${i},${k}`) ? c.knot.clone() : lit(normal).multiplyScalar(faces[k].grain * lengths[i]);
      m.tri(a, b, cc, col, col, col, out);
      m.tri(a, cc, d, col, col, col, out);
    }
  }
  // Its ends: a flat pale cut, or rounded over to a low point.
  const close = (i, outward, round) => {
    const tip = path[i].clone().addScaledVector(outward, round ? radii[i] * 0.7 : radii[i] * 0.08);
    const away = () => outward;
    for (let k = 0; k < sides; k++) {
      const [a, b] = [rings[i][k], rings[i][(k + 1) % sides]];
      const normal = new THREE.Vector3().subVectors(a, tip).cross(new THREE.Vector3().subVectors(b, tip)).normalize();
      if (normal.dot(outward) < 0) normal.negate();
      const col = round ? lit(normal).multiplyScalar(faces[k].grain) : c.cut.clone().multiplyScalar(0.92 + 0.08 * Math.max(0, normal.dot(sun)));
      m.tri(a, b, tip, col, col, col, away);
    }
  };
  if (cutStart) close(0, axis.clone().negate(), false);
  close(n - 1, axis, end === 'round');
}

/**
 * A rail fence through `points` ([x, z] in the batch's frame) at ground level, closed back to the first if `closed`:
 * posts at every corner and at most `spacing` apart between, `height` tall, two rails between each pair. `gates`
 * lists [side, along, width]: a gate `width` wide in the side from points[side] to the next, its middle `along` it
 * (0 to 1), in place of the posts and rails there. `wood` is its colour; `rand` makes the small differences. Returns
 * where its posts stand, [x, z].
 */
export function woodFence(batch, points, rand, { closed = false, spacing = 0.6, height = 0.4, gates = [], wood = FENCE_WOOD } = {}) {
  const sides = closed ? points.length : points.length - 1;
  // The sun in the batch's frame, so the wood is lit from where the sun is however the batch is turned.
  const sun = SUN.clone().transformDirection(batch.origin.clone().invert());
  const m = mesher();
  // The posts, and between which of them the rails run.
  const posts = [];
  const bays = [];
  const post = (x, z, { gate = false, across = null } = {}) => {
    // A post between corners strays a little off the line, either way.
    const off = across ? (rand() - 0.5) * 2 * FORM.stray : 0;
    const lean = [(rand() - 0.5) * 2 * FORM.lean, (rand() - 0.5) * 2 * FORM.lean];
    posts.push({ x: x + (across?.[0] ?? 0) * off, z: z + (across?.[1] ?? 0) * off, h: height * (gate ? 1.12 : 1 + (rand() - 0.5) * 2 * FORM.tall), lean, gate });
    return posts.length - 1;
  };
  // Where post p's middle is at height y, leaning as it does.
  const at = (p, y) => new THREE.Vector3(p.x + p.lean[0] * y, y, p.z + p.lean[1] * y);
  let first = null;
  for (let i = 0; i < sides; i++) {
    const [ax, az] = points[i];
    const [bx, bz] = points[(i + 1) % points.length];
    const len = Math.hypot(bx - ax, bz - az);
    const across = [-(bz - az) / len, (bx - ax) / len];
    // The stretches of this side between gates, as fractions of it.
    const cuts = gates.filter(([side]) => side === i).map(([, along, width]) => [along - width / 2 / len, along + width / 2 / len]).sort((p, q) => p[0] - q[0]);
    let from = 0;
    let last = i === 0 ? (first = post(ax, az)) : posts.length - 1;
    for (const [g0, g1] of [...cuts, [1, 1]]) {
      const n = Math.max(1, Math.ceil(((g0 - from) * len) / spacing));
      for (let k = 1; k <= n; k++) {
        // Between the ends of a stretch, each post a little along from where it would stand evenly.
        const f = from + ((g0 - from) * (k + (k < n ? (rand() - 0.5) * 0.25 : 0))) / n;
        const closing = closed && i === sides - 1 && g0 === 1 && k === n;
        const end = k === n;
        const next = closing ? first : post(ax + (bx - ax) * f, az + (bz - az) * f, { gate: g0 < 1 && end, across: end ? null : across });
        bays.push([last, next]);
        last = next;
      }
      if (g0 < 1) {
        // The gate between its two posts, and on past it.
        const far = post(ax + (bx - ax) * g1, az + (bz - az) * g1, { gate: true });
        gate(batch, posts[last], posts[far], height, wood, rand);
        last = far;
        from = g1;
      }
    }
  }
  for (const p of posts) {
    // From a little under the ground up, kinked a little halfway, rounded over at the top.
    const [r0, r1] = FORM.post.map((r) => r * (p.gate ? 1.3 : 0.9 + rand() * 0.2));
    const kink = [(rand() - 0.5) * 0.012, (rand() - 0.5) * 0.012];
    const path = [-0.02, p.h * 0.5, p.h - 0.03, p.h - 0.008].map((y, j) => at(p, y).add(new THREE.Vector3(j === 1 ? kink[0] : 0, 0, j === 1 ? kink[1] : 0)));
    log(m, rand, path, [r0, (r0 + r1) / 2, r1, r1 * 0.75], woodColors(wood, rand), sun, { sides: 7, end: 'round', knots: rand() < 0.5 ? 1 : 0 });
  }
  for (const [a, b] of bays) rails(m, rand, posts[a], posts[b], at, wood, sun);
  batch.add(m.geometry(), null, [0, 0, 0], 1, null, true);
  return posts.map(({ x, z }) => [x, z]);
}

/**
 * The two rails between posts a and b, nailed on one side of them: each running on a little past either post, a
 * little off level at either end and sagging between.
 */
function rails(m, rand, a, b, at, wood, sun) {
  const dir = new THREE.Vector3(b.x - a.x, 0, b.z - a.z).normalize();
  const across = new THREE.Vector3(-dir.z, 0, dir.x);
  const side = across.clone().multiplyScalar(FORM.post[0] + FORM.rail * 0.8);
  const h = Math.min(a.h, b.h);
  for (const f of FORM.rails) {
    const r = FORM.rail * (0.9 + rand() * 0.2);
    const ends = [a, b].map((p) => at(p, h * f + (rand() - 0.5) * 2 * FORM.level).add(side));
    const len = ends[0].distanceTo(ends[1]);
    const sag = FORM.sag[0] + rand() * (FORM.sag[1] - FORM.sag[0]);
    const bow = (rand() - 0.5) * 0.012;
    const path = [-FORM.past / len, 0.33, 0.67, 1 + FORM.past / len].map((t, j) => {
      const p = ends[0].clone().lerp(ends[1], t);
      // Sagging between the posts, and bowed a little to one side.
      if (j === 1 || j === 2) p.setY(p.y - sag).addScaledVector(across, bow);
      return p;
    });
    log(m, rand, path, [r, r * 1.02, r * 0.98, r * 0.96], woodColors(wood, rand), sun, { sides: 6, cutStart: true, end: 'cut', knots: rand() < 0.25 ? 1 : 0 });
  }
}

/** A gate shut between posts a and b: a frame of boards, three across and a brace from corner to corner, on hinges. */
function gate(batch, a, b, height, wood, rand) {
  const len = Math.hypot(b.x - a.x, b.z - a.z);
  const w = len - 0.08;
  const board = () => `#${woodColors(wood, rand).light.clone().lerp(new THREE.Color(wood), 0.4).getHexString()}`;
  batch.push((a.x + b.x) / 2, 0, (a.z + b.z) / 2, Math.atan2(-(b.z - a.z), b.x - a.x));
  const [y0, y1] = [0.07, height * 0.92];
  for (const s of [-1, 1]) batch.add(BOX, board(), [s * (w / 2 - 0.02), (y0 + y1) / 2, 0.02], [0.04, y1 - y0, 0.03]);
  for (const f of [0, 0.5, 1]) batch.add(BOX, board(), [0, y0 + (y1 - y0) * f, 0.022], [w, 0.045, 0.026]);
  const brace = Math.hypot(w - 0.04, y1 - y0);
  batch.add(BOX, board(), [0, (y0 + y1) / 2, 0.036], [brace, 0.04, 0.02], [0, 0, Math.atan2(y1 - y0, w - 0.04)]);
  for (const y of [y0 + 0.06, y1 - 0.06]) batch.add(BOX, HINGE, [-w / 2 + 0.03, y, 0.04], [0.08, 0.014, 0.008]);
  batch.add(BOX, HINGE, [w / 2 - 0.01, (y0 + y1) / 2 + 0.06, 0.04], [0.05, 0.02, 0.012]);
  batch.pop();
}
