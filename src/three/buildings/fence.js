// Wooden rail fences, as the reference draws them round the meadow and the fields over the big bridge: square posts of
// weathered wood, no two quite the same height or quite upright, a lighter cap on each, two rails from post to post,
// each a little off from the next, and a gate of boards with a brace across it where one is wanted.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { BOX } from './parts.js';

const POSTS = ['#8f5d36', '#875632', '#97643b'];
const CAP = '#b0814f';
const RAILS = ['#a8723f', '#9e6a3a', '#b17a45'];
const GATE = '#b37b46';
const HINGE = '#3b3a3c';
// A post 1 tall and a rail 1 long, a little rounded so the light catches their edges, stretched to length.
const POST_W = 0.05;
const POST = new RoundedBoxGeometry(POST_W, 1, POST_W, 2, 0.012);
const RAIL = new RoundedBoxGeometry(1, 0.034, 0.022, 2, 0.009);

/**
 * A rail fence through `points` ([x, z] in the batch's frame) at ground level, closed back to the first if `closed`:
 * posts at every corner and at most `spacing` apart between, `height` tall, two rails between each pair. `gates`
 * lists [side, along, width]: a gate `width` wide in the side from points[side] to the next, its middle `along` it
 * (0 to 1), in place of the posts and rails there. `rand` makes the small differences.
 */
export function woodFence(batch, points, rand, { closed = false, spacing = 0.42, height = 0.38, gates = [] } = {}) {
  const sides = closed ? points.length : points.length - 1;
  // The posts, and between which of them the rails run.
  const posts = [];
  const bays = [];
  const post = (x, z, gate = false) => {
    posts.push({ x, z, h: height * (gate ? 1.12 : 0.94 + rand() * 0.12), lean: [(rand() - 0.5) * 0.06, (rand() - 0.5) * 0.06], gate });
    return posts.length - 1;
  };
  let first = null;
  for (let i = 0; i < sides; i++) {
    const [ax, az] = points[i];
    const [bx, bz] = points[(i + 1) % points.length];
    const len = Math.hypot(bx - ax, bz - az);
    // The stretches of this side between gates, as fractions of it.
    const cuts = gates.filter(([side]) => side === i).map(([, along, width]) => [along - width / 2 / len, along + width / 2 / len]).sort((p, q) => p[0] - q[0]);
    let from = 0;
    let last = i === 0 ? (first = post(ax, az)) : posts.length - 1;
    for (const [g0, g1] of [...cuts, [1, 1]]) {
      const n = Math.max(1, Math.ceil(((g0 - from) * len) / spacing));
      for (let k = 1; k <= n; k++) {
        const f = from + ((g0 - from) * k) / n;
        const closing = closed && i === sides - 1 && g0 === 1 && k === n;
        const next = closing ? first : post(ax + (bx - ax) * f, az + (bz - az) * f, g0 < 1 && k === n);
        bays.push([last, next]);
        last = next;
      }
      if (g0 < 1) {
        // The gate between its two posts, and on past it.
        const far = post(ax + (bx - ax) * g1, az + (bz - az) * g1, true);
        gate(batch, posts[last], posts[far], height);
        last = far;
        from = g1;
      }
    }
  }
  for (const { x, z, h, lean, gate: big } of posts) {
    const w = big ? 0.065 : POST_W;
    batch.add(POST, POSTS[Math.floor(rand() * POSTS.length)], [x, h / 2, z], [w / POST_W, h, w / POST_W], [lean[0], rand() * 0.4, lean[1]]);
    batch.add(BOX, CAP, [x + lean[1] * h * 0.5, h + 0.006, z - lean[0] * h * 0.5], [w + 0.012, 0.014, w + 0.012]);
  }
  for (const [a, b] of bays) rails(batch, posts[a], posts[b], height, rand);
}

/** The two rails between posts a and b, each a little off from level and from where the last one was. */
function rails(batch, a, b, height, rand) {
  const len = Math.hypot(b.x - a.x, b.z - a.z);
  batch.push((a.x + b.x) / 2, 0, (a.z + b.z) / 2, Math.atan2(-(b.z - a.z), b.x - a.x));
  for (const y of [0.34, 0.74]) {
    const tilt = (rand() - 0.5) * 0.05;
    batch.add(RAIL, RAILS[Math.floor(rand() * RAILS.length)], [0, height * y + (rand() - 0.5) * 0.015, 0.028], [len + 0.04, 1, 1], [0, 0, tilt]);
  }
  batch.pop();
}

/** A gate shut between posts a and b: a frame of boards, three across and a brace from corner to corner, on hinges. */
function gate(batch, a, b, height) {
  const len = Math.hypot(b.x - a.x, b.z - a.z);
  const w = len - 0.08;
  batch.push((a.x + b.x) / 2, 0, (a.z + b.z) / 2, Math.atan2(-(b.z - a.z), b.x - a.x));
  const [y0, y1] = [0.07, height * 0.92];
  for (const s of [-1, 1]) batch.add(BOX, GATE, [s * (w / 2 - 0.02), (y0 + y1) / 2, 0.02], [0.04, y1 - y0, 0.03]);
  for (const f of [0, 0.5, 1]) batch.add(BOX, GATE, [0, y0 + (y1 - y0) * f, 0.022], [w, 0.045, 0.026]);
  const brace = Math.hypot(w - 0.04, y1 - y0);
  batch.add(BOX, GATE, [0, (y0 + y1) / 2, 0.036], [brace, 0.04, 0.02], [0, 0, Math.atan2(y1 - y0, w - 0.04)]);
  for (const y of [y0 + 0.06, y1 - 0.06]) batch.add(BOX, HINGE, [-w / 2 + 0.03, y, 0.04], [0.08, 0.014, 0.008]);
  batch.add(BOX, HINGE, [w / 2 - 0.01, (y0 + y1) / 2 + 0.06, 0.04], [0.05, 0.02, 0.012]);
  batch.pop();
}
