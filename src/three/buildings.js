// The farm's buildings and the animals that live in them, set on their pads in the painted valley (PLACES in
// valleyMap.js): the houses along the back of the ring road, the fields over the big bridge, the cows' meadow, the
// bridges, lamps, benches, fences and the landing, with the spray at the falls. Their parts merge into one batch, a mesh
// for each square of the world; the windmill's sails, the smoke, the animals and the lanterns' glow move as their own
// objects.
import * as THREE from 'three';
import { Batch } from './batch.js';
import { seeded } from '../util.js';
import { buildGlow } from './farm.js';
import { PLACES, BRIDGES } from './valleyMap.js';
import { FACE, smokePuffs } from './buildings/parts.js';
import { farmhouse } from './buildings/farmhouse.js';
import { silo } from './buildings/silo.js';
import { windmill } from './buildings/windmill.js';
import { stoneShed } from './buildings/stoneShed.js';
import { henYard } from './buildings/coop.js';
import { well } from './buildings/well.js';
import { cart, hayBale, haystack, hayRack } from './buildings/hay.js';
import { bridge as plankBridge } from './buildings/bridge.js';
import { lamp, lanternGlows } from './buildings/lamp.js';
import { woodFence } from './buildings/fence.js';
import { table } from './buildings/table.js';
import { trough as waterTrough } from './buildings/trough.js';
import { bench } from './buildings/bench.js';
import { fields as fieldBeds } from './buildings/fields.js';
import { landing } from './buildings/landing.js';
import { birdPost } from './buildings/birdPost.js';
import { spray } from './buildings/spray.js';
import { BACKDROP, paintedPoint } from './backdrop.js';
import { flock } from './animals/chicken.js';
import { herd } from './animals/herd.js';
import { buffalo } from './animals/buffalo.js';
import { cow, COWS } from './animals/cow.js';
import { sheep } from './animals/sheep.js';
import { pig } from './animals/pig.js';
import { paddle } from './animals/duck.js';
import { wheel } from './animals/birds.js';

// How wide a square of the world the batch's meshes each take (Batch.build): the renderer leaves out the squares off
// the screen, which on a phone is most of the valley.
const BATCH_CELL = 8;

/**
 * A fence along a smooth curve through `way` (map points), a post about every `spacing`, and a gate `width` across
 * where the curve passes nearest `gate.at`: the gate stands in the middle of one straight side two spacings long.
 */
function arcFence(batch, at, { way, gate }, rand, spacing = 0.6) {
  const curve = new THREE.CatmullRomCurve3(way.map(([u, b]) => at(u, b).setY(0)), false, 'centripetal');
  const length = curve.getLength();
  const g = at(...gate.at);
  let mid = 0;
  let best = Infinity;
  for (let i = 0; i <= 400; i++) {
    const p = curve.getPointAt(i / 400);
    const d = Math.hypot(p.x - g.x, p.z - g.z);
    if (d < best) [best, mid] = [d, i / 400];
  }
  const half = spacing / length;
  const run = (from, to) => {
    const n = Math.max(1, Math.round(((to - from) * length) / spacing));
    return Array.from({ length: n + 1 }, (_, k) => curve.getPointAt(from + ((to - from) * k) / n));
  };
  const before = run(0, mid - half);
  const points = [...before, ...run(mid + half, 1)].map((p) => [p.x, p.z]);
  woodFence(batch, points, rand, { spacing, gates: [[before.length - 1, 0.5, gate.width]] });
}

/**
 * The buildings redone for the painted valley, each on its pad in the painting (PLACES in valleyMap.js), and the
 * animals that live in them. at(u, b) is the map's point in the world. Returns the group and update(t, dt).
 */
export function placeBuildings({ at }) {
  const batch = new Batch();
  const place = ({ at: [u, b], turn = 0 }, build) => {
    const p = at(u, b);
    batch.push(p.x, 0, p.z, FACE + turn);
    const out = build();
    batch.pop();
    return out;
  };
  const smoke = smokePuffs(place(PLACES.farmhouse, () => farmhouse(batch)));
  const siloParts = place(PLACES.silo, () => silo(batch));
  const sails = place(PLACES.windmill, () => windmill(batch));
  place(PLACES.stoneShed, () => stoneShed(batch));
  const hens = flock(place(PLACES.henYard, () => henYard(batch)), PLACES.henYard.hens);
  const wellParts = place(PLACES.well, () => well(batch));
  const hay = [place(PLACES.cart, () => cart(batch)), place(PLACES.bale, () => hayBale(batch)), place(PLACES.haystack, () => haystack(batch))];
  // The meadow's fence round its right side, with a gate onto the road, its water trough, hay rack and bench.
  arcFence(batch, at, PLACES.meadow.fence, seeded(71));
  const water = place(PLACES.trough, () => waterTrough(batch, seeded(29)));
  hay.push(place(PLACES.hayRack, () => hayRack(batch)));
  const paper = place(PLACES.meadowBench, () => bench(batch, seeded(73), { paper: true }));
  // A bench by the ring road in front of the farm, and a short fence behind it along the road.
  place(PLACES.frontBench, () => bench(batch, seeded(79)));
  woodFence(batch, PLACES.frontFence.ends.map(([u, b]) => [at(u, b).x, at(u, b).z]), seeded(83));
  // By the windmill's road above the small fall: a fence along it, a bench in front of it and a table across the road.
  woodFence(batch, PLACES.fallFence.points.map(([u, b]) => [at(u, b).x, at(u, b).z]), seeded(89));
  place(PLACES.fallBench, () => bench(batch, seeded(97)));
  place(PLACES.fallTable, () => table(batch, seeded(101)));
  // The fields over the big bridge on their painted pad, square to the plots.
  const fieldsAt = at(...PLACES.fields.at);
  batch.push(fieldsAt.x, 0, fieldsAt.z);
  const crops = fieldBeds(batch, seeded(41), PLACES.fields.half);
  batch.pop();
  // The post with a birdhouse and a robin on it just behind their back fence, left of the scarecrow (which stands a
  // quarter of the way along from the middle): as far along the fence from it, and behind it, as the reference draws it.
  const post = birdPost(1, 1.13);
  post.position.set(fieldsAt.x + PLACES.fields.half[0] * 0.25 - 1.24, 0, fieldsAt.z - PLACES.fields.half[1] - 0.06);
  // The landing at the end of the riverside road, turned to run out over the river, and the boat tied up at it.
  const jetty = (() => {
    const { ends, width, side } = PLACES.landing;
    const [a, b] = ends.map(([u, v]) => at(u, v));
    const dir = b.clone().sub(a);
    const mid = a.clone().add(b).multiplyScalar(0.5);
    batch.push(mid.x, 0, mid.z, Math.atan2(-dir.z, dir.x));
    const out = landing(batch, seeded(53), { span: dir.length(), width, side });
    batch.pop();
    return out;
  })();
  // The buffalo and her calf by the river, grazing and wandering about their patch of grass.
  const buffaloes = herd(PLACES.buffalo.area.map(([u, b]) => at(u, b)), ['buffalo', 'calf'].map((name) => {
    const { at: [u, b], turn } = PLACES[name];
    const p = at(u, b);
    return { name, x: p.x, z: p.z, heading: FACE + turn };
  }), buffalo);
  // The cows and the sheep in the meadow, grazing and wandering about it, all in one herd so they keep out of each
  // other's way.
  const meadow = herd(PLACES.meadow.area.map(([u, b]) => at(u, b)), PLACES.meadow.herd.map(({ name, at: [u, b], turn }) => {
    const p = at(u, b);
    return { name, x: p.x, z: p.z, heading: FACE + turn };
  }), (name, phase) => (name in COWS ? cow : sheep)(name, phase));
  // The pig rooting about the grass behind the plots.
  const pigs = herd(PLACES.pig.area.map(([u, b]) => at(u, b)), [PLACES.pig].map(({ at: [u, b], turn }) => {
    const p = at(u, b);
    return { name: 'pig', x: p.x, z: p.z, heading: FACE + turn };
  }), pig);
  // Two brown hens pecking about the grass on the pig's right.
  const lawnHens = flock(PLACES.lawnHens.area.map(([u, b]) => at(u, b)), PLACES.lawnHens.hens);
  // The mother duck and her ducklings on the river above the big bridge.
  const ducks = paddle(PLACES.ducks.way.map(([u, b]) => at(u, b)), PLACES.ducks.half, ['duck', ...Array(5).fill('duckling')]);
  // Swallows wheeling over the hills behind the farm.
  const birds = wheel(at(...PLACES.birds.at, PLACES.birds.height), ['swallow', 'swallow', 'swallow']);
  // The bridges, each turned to run between its ends: the big one with a lamp at its farm end, the small one with
  // lanterns on its corners. The lanterns' glass goes into `glow`, the glows over them into `glows`.
  const glow = new Batch();
  const glows = lanternGlows();
  for (const [name, { ends, arch, width }] of Object.entries(BRIDGES)) {
    const [a, b] = ends.map(([u, v]) => at(u, v));
    const dir = b.clone().sub(a);
    const mid = a.clone().add(b).multiplyScalar(0.5);
    batch.push(mid.x, 0, mid.z, Math.atan2(-dir.z, dir.x));
    plankBridge(batch, glow, { span: dir.length(), width, arch, lamp: name === 'main', lanterns: name === 'small', glows });
    batch.pop();
  }
  // The meadow's lamp behind its bench, and a bigger one behind the bench by the ring road in front of the farm.
  place(PLACES.meadowLamp, () => lamp(batch, glow, glows));
  place(PLACES.frontLamp, () => lamp(batch, glow, glows, PLACES.frontLamp.size));
  place(PLACES.fallLamp, () => lamp(batch, glow, glows, PLACES.fallLamp.size));
  // Spray off a line of the painting's pixels along a fall, heading `outward`: droplets, and a mist over them.
  const fallSpray = (pixels, outward, drops, mist) => {
    const line = pixels.map(([x, y]) => paintedPoint(x, y));
    const parts = [spray(line, { outward, ...drops }), spray(line, { outward, ...mist })];
    const group = new THREE.Group();
    group.add(...parts.map((p) => p.group));
    return { group, update: (t, dt) => parts.forEach((p) => p.update(t, dt)) };
  };
  const [[x0, y0], [x1, y1]] = BACKDROP.falls[1].lip;
  const falls = [
    // Along the small fall's lip, where the water rolls over, heading down and to the left on screen as the water
    // does, and a little mist.
    fallSpray([[x0 + 1, y0 + 0.7], [x1 - 1.5, y1 - 1]], new THREE.Vector3(0.6, 0, 1.4).normalize(),
      { count: 130, up: [0.6, 1.5], out: [0.15, 0.6], spread: 0.28, gravity: 3.2, life: [0.6, 1.1], size: [0.05, 0.11], strength: 0.95, seed: 3 },
      { count: 14, up: [0.08, 0.2], out: [0.03, 0.1], gravity: 0.1, life: [1.4, 2.2], size: [0.16, 0.36], strength: 0.22, seed: 5 }),
    // Where each fall lands, along the foam at its foot: droplets thrown up out of the pool, mostly towards the
    // camera and fanning out to the sides, and a mist rising slowly over them; more and higher under the main fall,
    // which drops farther.
    fallSpray([[1196, 137], [1230, 141], [1265, 137]], new THREE.Vector3(1, 0, 1).normalize(),
      { count: 70, up: [1.2, 2.4], out: [0.1, 1.0], spread: 0.9, gravity: 3.5, life: [0.8, 1.4], size: [0.08, 0.14], strength: 0.9, seed: 7 },
      { count: 14, up: [0.2, 0.4], out: [0.05, 0.2], spread: 0.15, gravity: 0, life: [2.2, 3.4], size: [0.4, 1.0], strength: 0.07, seed: 11 }),
    fallSpray([[1258, 541], [1272, 545], [1288, 545]], new THREE.Vector3(0.8, 0, 1.2).normalize(),
      { count: 40, up: [0.9, 1.7], out: [0.1, 0.8], spread: 0.7, gravity: 3.5, life: [0.6, 1.0], size: [0.06, 0.1], strength: 0.9, seed: 13 },
      { count: 8, up: [0.1, 0.25], out: [0.03, 0.12], spread: 0.1, gravity: 0, life: [1.8, 2.8], size: [0.25, 0.55], strength: 0.08, seed: 17 }),
  ];
  const group = new THREE.Group();
  group.add(...falls.map((f) => f.group), batch.build({ cell: BATCH_CELL }), buildGlow(glow), glows.group, paper, smoke.group, siloParts, sails, hens.group, wellParts.group, ...hay, water, crops.group, post, jetty.group, buffaloes.group, meadow.group, pigs.group, lawnHens.group, ducks.group, birds.group);
  const update = (t, dt) => {
    smoke.update(t);
    sails.children[0].rotation.z = -t * 0.9;
    hens.update(t, dt);
    buffaloes.update(t, dt);
    meadow.update(t, dt);
    pigs.update(t, dt);
    lawnHens.update(t, dt);
    ducks.update(t, dt);
    birds.update(t, dt);
    crops.update(t);
    post.userData.robin.userData.update(t);
    jetty.update(t);
    for (const f of falls) f.update(t, dt);
    wellParts.update(t);
    glows.update(t);
  };
  return { group, update };
}
