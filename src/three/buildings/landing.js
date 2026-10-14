// The little wooden landing at the end of the riverside road, beside the small fall: a jetty of planks laid across two
// beams, on posts standing in the water, running on from the road out over the river, a stouter post at its far
// corner with a coil of rope; and a rowing boat tied up alongside it, bobbing on the water.
//
// Modelled along x from the road's end (-x) out over the water (+x), its deck across z; placed, it turns to run between
// its ends (PLACES.landing in valleyMap.js). The water's surface is at y = 0; what is under it is hidden by the
// painted water.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { BOX, CYL10 } from './parts.js';
import { Batch } from '../batch.js';

const PLANKS = ['#c98545', '#bd7a3d', '#d39150', '#b8763a'];
const BEAM = '#8f5a30';
const POST = '#7a4c2a';
const ROPE = '#d9c08a';
const HULL = '#3f7fa8';
const RIM = '#f3eee2';
const INSIDE = '#b37844';
const DECK = 0.12;
const PLANK = new RoundedBoxGeometry(1, 0.035, 0.11, 2, 0.01);
const POLE = new RoundedBoxGeometry(0.06, 1, 0.06, 2, 0.012);

/**
 * A rowing boat along x, its bow at +x, floating on its origin: a hull painted blue outside with a white rim, plain
 * wood inside, two seats across it and a pair of oars laid in it. Its own mesh, to bob on the water.
 */
function rowboat() {
  const b = new Batch();
  const [L, W] = [0.78, 0.3];
  // The hull from the stern to the bow: half its width at the rim, how high the rim is, and where its keel lies.
  const n = 14;
  const at = (t) => {
    const half = (W / 2) * (t < 0.55 ? 1 - 0.15 * (1 - t / 0.55) ** 2 : Math.cos(((t - 0.55) / 0.45) * (Math.PI / 2)) ** 0.8);
    return { x: -L / 2 + L * t, half: Math.max(half, 0.004), rim: 0.07 + 0.05 * Math.max(0, t - 0.6) ** 2 * 6, keel: -0.07 + 0.03 * t * t };
  };
  // Each side: a strip from the rim down to the keel, drawn twice, painted outside and bare inside, each facing its way.
  const strip = (side, inside) => {
    const pos = [];
    for (let i = 0; i < n; i++) {
      const [p, q] = [at(i / n), at((i + 1) / n)];
      const top = (r) => [r.x, r.rim, side * r.half];
      const bottom = (r) => [r.x, r.keel, side * r.half * 0.35];
      const quad = [top(p), bottom(p), bottom(q), top(p), bottom(q), top(q)];
      // Facing out on the +z side as listed; turned round for the -z side or for the inside.
      const flip = (side < 0) !== inside;
      for (const v of flip ? [quad[0], quad[2], quad[1], quad[3], quad[5], quad[4]] : quad) pos.push(...v);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.computeVertexNormals();
    return g;
  };
  for (const side of [-1, 1]) {
    b.add(strip(side, false), HULL);
    b.add(strip(side, true), INSIDE);
    // The white rim along the top of the side.
    for (let i = 0; i < n; i++) {
      const [p, q] = [at(i / n), at((i + 1) / n)];
      const [dx, dz] = [q.x - p.x, side * (q.half - p.half)];
      b.add(BOX, RIM, [(p.x + q.x) / 2, (p.rim + q.rim) / 2 + 0.008, (side * (p.half + q.half)) / 2], [Math.hypot(dx, dz) + 0.01, 0.016, 0.022], [0, -Math.atan2(dz, dx), Math.atan2(q.rim - p.rim, dx)]);
    }
  }
  // The transom across the stern.
  const s = at(0);
  b.add(BOX, HULL, [s.x - 0.005, (s.rim + s.keel) / 2, 0], [0.02, s.rim - s.keel, W * 0.95]);
  // A floor of boards inside, just above the water: the painted water hides all that lies below it, and the boat
  // would show the river through its bottom. It runs out to the sides where they are at its height.
  const FLOOR = 0.015;
  const floor = [];
  for (let i = 0; i < n; i++) {
    const [p, q] = [at(i / n), at((i + 1) / n)];
    const wide = (r) => r.half * (0.35 + (0.65 * (FLOOR - r.keel)) / (r.rim - r.keel));
    const [a, c] = [[p.x, FLOOR, -wide(p)], [p.x, FLOOR, wide(p)]];
    const [d, e] = [[q.x, FLOOR, -wide(q)], [q.x, FLOOR, wide(q)]];
    floor.push(...a, ...c, ...e, ...a, ...e, ...d);
  }
  const floorGeometry = new THREE.BufferGeometry();
  floorGeometry.setAttribute('position', new THREE.Float32BufferAttribute(floor, 3));
  floorGeometry.computeVertexNormals();
  b.add(floorGeometry, INSIDE);
  for (const z of [-0.05, 0, 0.05]) b.add(BOX, '#9a6538', [-0.03, FLOOR + 0.002, z], [L * 0.7, 0.003, 0.006]);
  // Two seats across, and two oars laid along it.
  for (const x of [-0.18, 0.08]) b.add(BOX, '#c58a4e', [x, 0.04, 0], [0.07, 0.018, at((x + L / 2) / L).half * 2 - 0.02]);
  for (const side of [-1, 1]) {
    b.add(CYL10, '#d6a468', [0.02, 0.06, side * 0.06], [0.008, 0.6, 0.008], [0, 0, Math.PI / 2 + side * 0.04]);
    b.add(BOX, '#d6a468', [0.28, 0.06, side * 0.06], [0.14, 0.006, 0.04], [0, side * 0.04, 0]);
  }
  return b.build({ roughness: 0.7 });
}

/**
 * The landing, `span` long along x and `width` across, standing on the batch's origin: its wood goes into the batch.
 * Returns the boat tied up alongside it (on its `side`, +1 for +z), as a group of its own where the batch's origin
 * is, and update(t), which rocks it on the water.
 */
export function landing(batch, rand, { span, width, side = 1 }) {
  const plank = () => PLANKS[Math.floor(rand() * PLANKS.length)];
  // Planks across, each a little off from the next, on a beam down each side.
  const n = Math.round(span / 0.12);
  for (let k = 0; k < n; k++) {
    const x = -span / 2 + (k + 0.5) * (span / n);
    batch.add(PLANK, plank(), [x, DECK + (rand() - 0.5) * 0.006, (rand() - 0.5) * 0.02], [width + (rand() - 0.5) * 0.03, 1, (span / n - 0.012) / 0.11], [0, Math.PI / 2 + (rand() - 0.5) * 0.04, 0]);
  }
  for (const z of [-1, 1]) batch.add(BOX, BEAM, [0, DECK - 0.04, z * (width / 2 - 0.04)], [span, 0.05, 0.05]);
  // Posts down into the water under the beams; at the far end they stand up above the deck, the corner one on the
  // boat's side stouter, a coil of rope at its foot.
  for (const f of [-0.42, 0.05, 0.47]) {
    for (const z of [-1, 1]) {
      const up = f > 0.4 ? 0.16 : -0.01;
      batch.add(POLE, POST, [f * span, (DECK + up - 0.3) / 2, z * (width / 2 - 0.02)], [1, DECK + up + 0.3, 1], [0, rand() * 0.3, 0]);
    }
  }
  const corner = [0.47 * span, side * (width / 2 - 0.02)];
  batch.add(POLE, POST, [corner[0], 0.17, corner[1]], [1.25, 0.34, 1.25]);
  batch.add(CYL10, '#5a3a20', [corner[0], 0.345, corner[1]], [0.04, 0.012, 0.04]);
  for (let k = 0; k < 3; k++) batch.add(new THREE.TorusGeometry(0.045 - k * 0.008, 0.007, 5, 14).rotateX(Math.PI / 2), ROPE, [corner[0] - 0.09, DECK + 0.025 + k * 0.012, corner[1] - side * 0.06], 1);

  // The boat alongside, its bow towards the far end, tied to the corner post.
  const group = new THREE.Group();
  batch.origin.decompose(group.position, group.quaternion, group.scale);
  const boat = new THREE.Group();
  boat.position.set(0.12 * span, 0, side * (width / 2 + 0.2));
  boat.add(rowboat());
  // The rope from the bow up to the post, sagging a little.
  const from = new THREE.Vector3(0.39, 0.09, -side * 0.02);
  const to = new THREE.Vector3(corner[0] - boat.position.x, 0.3, corner[1] - boat.position.z);
  const rope = new THREE.QuadraticBezierCurve3(from, from.clone().lerp(to, 0.5).add(new THREE.Vector3(0, -0.08, 0)), to);
  const ropeMesh = new THREE.Mesh(new THREE.TubeGeometry(rope, 10, 0.006, 5), new THREE.MeshStandardMaterial({ color: ROPE, roughness: 0.9 }));
  boat.add(ropeMesh);
  group.add(boat);
  const update = (t) => {
    boat.position.y = 0.008 * Math.sin(t * 1.6);
    boat.rotation.x = 0.04 * Math.sin(t * 1.1 + 0.7);
    boat.rotation.z = 0.025 * Math.sin(t * 1.3);
    boat.rotation.y = 0.03 * Math.sin(t * 0.4);
  };
  update(0);
  return { group, update };
}
