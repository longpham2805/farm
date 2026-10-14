// The fields over the big bridge, as the reference draws them on their painted pad of dirt: four raised beds, two by
// two, with paths of the pad between them (ripe wheat at the back, lettuces on the left, bushy beans on the right and
// white-flowering plants at the front); a rail fence all round, with a gate onto the road; and a scarecrow by the
// back fence. The reference's sunflowers along the front right are left for the plants still to come.
//
// The fields lie square to the plots, their sides along x and z: the back corner at -x -z (the top of the screen),
// the front one at +x +z, the left at -x +z.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { Batch } from '../batch.js';
import { BOX, BALL, ICO, CYL10, FACE, TAU } from './parts.js';
import { woodFence } from './fence.js';

const SOIL = '#6b4327';
const RIDGE = '#7a4e2e';
const WHEAT = ['#f7d466', '#ffe08a', '#f2c958', '#ffe9a6'];
const STALK = '#e6bf5c';
const LETTUCE = ['#7cc653', '#69b545', '#8fd462'];
const HEART = '#c4e88a';
const BEANS = ['#4f9a3a', '#5aa843', '#447f33', '#63b14a'];
const LEAF = ['#5aa83f', '#68b84a', '#4c9636'];
const PETAL = '#fbf8ef';
const PATH = 0.32;
const MARGIN = 0.3;
const BED = new RoundedBoxGeometry(1, 1, 1, 2, 0.12);

/**
 * Sways a field's plants in the wind: every vertex of `group`'s meshes leans downwind, more the higher it stands,
 * in gusts that roll across the field. Returns update(t).
 */
function wind(group, strength) {
  const time = { value: 0 };
  group.traverse((m) => {
    if (!m.isMesh) return;
    m.material.onBeforeCompile = (shader) => {
      shader.uniforms.windTime = time;
      shader.vertexShader = `uniform float windTime;\n${shader.vertexShader}`.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
  {
    vec4 w = modelMatrix * vec4(position, 1.0);
    float gust = sin(windTime * 1.3 + w.x * 1.1 + w.z * 0.7) * 0.6 + sin(windTime * 2.9 + w.x * 2.3 - w.z * 1.7) * 0.4;
    float high = min(position.y, 0.7);
    float bend = ${strength.toFixed(3)} * high * high * (0.6 + 0.4 * gust);
    transformed.x += bend * 0.8;
    transformed.z -= bend * 0.6;
  }`,
      );
    };
    m.material.customProgramCacheKey = () => `wind ${strength}`;
  });
  return (t) => (time.value = t);
}

/** Calls plant(x, z, i, j) for points in rows `step` apart over a bed `w` × `d` round (cx, cz), a little jittered. */
function rows(rand, [cx, cz], [w, d], step, plant) {
  const nx = Math.max(1, Math.floor(w / step));
  const nz = Math.max(1, Math.floor(d / step));
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < nz; j++) {
      plant(cx + ((i + 0.5) / nx - 0.5) * w + (rand() - 0.5) * step * 0.3, cz + ((j + 0.5) / nz - 0.5) * d + (rand() - 0.5) * step * 0.3, i, j);
    }
  }
}

/** A raised bed of dark soil w × d round (x, z), ridged along x. */
function bed(batch, rand, [x, z], [w, d]) {
  batch.add(BED, SOIL, [x, 0.035, z], [w, 0.07, d]);
  for (let k = 0; k < Math.floor(d / 0.16); k++) {
    batch.add(BOX, RIDGE, [x, 0.072, z - d / 2 + 0.1 + k * 0.16 + (rand() - 0.5) * 0.01], [w - 0.1, 0.012, 0.05]);
  }
}

// Each plant is drawn round its own origin on the soil, then set down at (x, z) turned its own way and `s` times
// its size.
const plant = (batch, rand, x, z, s, draw) => {
  batch.push(x, 0.07, z, rand() * TAU, s);
  draw();
  batch.pop();
};

/** A clump of ripe wheat: stalks, each a little different, an ear on each. */
function wheat(batch, rand, x, z) {
  plant(batch, rand, x, z, 1, () => {
    for (let k = 0; k < 9; k++) {
      const h = 0.38 + rand() * 0.14;
      const a = rand() * TAU;
      const r = Math.sqrt(rand()) * 0.06;
      const [px, pz] = [Math.cos(a) * r, Math.sin(a) * r];
      const lean = [(rand() - 0.5) * 0.45, 0, (rand() - 0.5) * 0.45];
      batch.add(BOX, STALK, [px, h / 2, pz], [0.014, h, 0.014], lean);
      // The ear, above the stalk as it leans.
      batch.add(ICO, WHEAT[Math.floor(rand() * WHEAT.length)], [px - Math.sin(lean[2]) * h * 0.5, h + 0.06, pz + Math.sin(lean[0]) * h * 0.5], [0.036, 0.095, 0.036], lean);
    }
  });
}

/** A lettuce: an open rosette of broad leaves round a tighter one and a pale heart. */
function lettuce(batch, rand, x, z) {
  plant(batch, rand, x, z, 0.9 + rand() * 0.2, () => {
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * TAU;
      batch.add(ICO, LETTUCE[k % LETTUCE.length], [Math.cos(a) * 0.1, 0.04, Math.sin(a) * 0.1], [0.12, 0.035, 0.08], [0, -a, 0.55], true);
    }
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * TAU + 0.6;
      batch.add(ICO, LETTUCE[(k + 1) % LETTUCE.length], [Math.cos(a) * 0.05, 0.08, Math.sin(a) * 0.05], [0.08, 0.03, 0.06], [0, -a, 0.95], true);
    }
    batch.add(ICO, HEART, [0, 0.1, 0], 0.065, [rand(), rand(), 0], true);
  });
}

/** A bushy bean plant: leafy clumps of a few greens, lighter ones on top. */
function beans(batch, rand, x, z) {
  plant(batch, rand, x, z, 0.9 + rand() * 0.25, () => {
    for (let k = 0; k < 8; k++) {
      const a = rand() * TAU;
      const r = k ? 0.06 + rand() * 0.07 : 0;
      const y = 0.12 + rand() * 0.14 - r * 0.5;
      batch.add(ICO, BEANS[y > 0.18 ? 3 : Math.floor(rand() * 3)], [Math.cos(a) * r, y, Math.sin(a) * r], 0.09 + rand() * 0.03, [rand(), rand(), rand()], true);
    }
  });
}

/** A flowering plant: a green clump dotted with white flowers, gold in their middles. */
function flowering(batch, rand, x, z) {
  plant(batch, rand, x, z, 0.9 + rand() * 0.2, () => {
    batch.add(ICO, LEAF[Math.floor(rand() * LEAF.length)], [0, 0.07, 0], [0.15, 0.09, 0.15], [0, rand() * 3, 0], true);
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * TAU + rand();
      batch.add(ICO, LEAF[k % LEAF.length], [Math.cos(a) * 0.1, 0.05, Math.sin(a) * 0.1], [0.08, 0.04, 0.06], [0, -a, 0.4], true);
    }
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * TAU + rand();
      const r = 0.05 + rand() * 0.06;
      const [fx, fy, fz] = [Math.cos(a) * r, 0.13 + rand() * 0.05, Math.sin(a) * r];
      batch.add(ICO, PETAL, [fx, fy, fz], [0.05, 0.014, 0.05], [rand() * 0.3, rand(), 0], true);
      batch.add(BALL, '#f2c94c', [fx, fy + 0.01, fz], 0.017);
    }
  });
}

/** A scarecrow on its pole: a sack of a head under a straw hat, a blue shirt, arms out on a crossbar, straw hands. */
function scarecrow(batch) {
  const SHIRT = '#4f7fbf';
  const STRAW = '#e9c766';
  batch.add(BOX, '#7a4f2c', [0, 0.45, 0], [0.04, 0.9, 0.04]);
  batch.add(BOX, '#7a4f2c', [0, 0.66, -0.02], [0.62, 0.035, 0.035]);
  // The shirt, its sleeves along the crossbar, and patched trousers stuffed at the bottom.
  batch.add(BALL, SHIRT, [0, 0.6, 0], [0.12, 0.15, 0.08]);
  for (const s of [-1, 1]) {
    batch.add(BOX, SHIRT, [s * 0.18, 0.66, 0], [0.22, 0.08, 0.08], [0, 0, s * -0.05]);
    for (let k = 0; k < 4; k++) batch.add(BOX, STRAW, [s * (0.3 + k * 0.012), 0.66 + (k - 1.5) * 0.018, 0.01], [0.07, 0.01, 0.012], [0, 0, s * (k - 1.5) * 0.25]);
  }
  batch.add(BOX, '#c0392b', [0.05, 0.56, 0.075], [0.05, 0.05, 0.01]);
  batch.add(BOX, '#6d5a3a', [0, 0.43, 0], [0.18, 0.12, 0.1]);
  for (let k = 0; k < 5; k++) batch.add(BOX, STRAW, [(k - 2) * 0.03, 0.36, 0.02], [0.012, 0.06, 0.012], [0, 0, (k - 2) * 0.2]);
  // The head: a sack with button eyes and a stitched smile, under a wide straw hat.
  batch.add(BALL, '#e1c79a', [0, 0.82, 0], [0.085, 0.09, 0.08]);
  for (const s of [-1, 1]) batch.add(BALL, '#2b2420', [s * 0.03, 0.835, 0.07], 0.012);
  batch.add(BOX, '#6b4a2b', [0, 0.79, 0.075], [0.06, 0.008, 0.006]);
  batch.add(CYL10, STRAW, [0, 0.89, 0], [0.17, 0.014, 0.17]);
  batch.add(CYL10, STRAW, [0, 0.93, 0], [0.085, 0.07, 0.085]);
  batch.add(CYL10, '#c0392b', [0, 0.905, 0], [0.088, 0.018, 0.088]);
}

/**
 * The fields, built round the batch's origin, `half` [along x, along z] in from it to the pad's edges: the beds,
 * plants, fence and scarecrow. The wheat goes in a group of its own, swaying in the wind (where the batch's origin
 * is). Returns that group and update(t).
 */
export function fields(batch, rand, [hx, hz]) {
  // The beds, two by two, a path between them and a margin round them.
  const [bw, bd] = [hx - MARGIN - PATH / 2, hz - MARGIN - PATH / 2];
  const at = (sx, sz) => [sx * (PATH / 2 + bw / 2), sz * (PATH / 2 + bd / 2)];
  const size = [bw, bd];
  const inner = [bw - 0.16, bd - 0.16];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) bed(batch, rand, at(sx, sz), size);
  rows(rand, at(-1, 1), inner, 0.36, (x, z) => lettuce(batch, rand, x, z));
  rows(rand, at(1, -1), inner, 0.34, (x, z) => beans(batch, rand, x, z));
  rows(rand, at(1, 1), inner, 0.32, (x, z) => flowering(batch, rand, x, z));

  // The wheat sways, so it is a mesh of its own.
  const swaying = new Batch();
  swaying.stack[0].copy(batch.origin);
  rows(rand, at(-1, -1), inner, 0.26, (x, z) => wheat(swaying, rand, x, z));
  const plants = swaying.build();
  const group = new THREE.Group();
  group.add(plants);
  const update = wind(plants, 0.1);

  // The fence all round, a little in from the pad's edge, with a gate in the middle of the side along the road.
  const e = [hx - 0.1, hz - 0.1];
  woodFence(batch, [[e[0], -e[1]], [-e[0], -e[1]], [-e[0], e[1]], [e[0], e[1]]], rand, { closed: true, gates: [[2, 0.5, 0.62]] });
  // The scarecrow by the back fence, towards the right corner, facing the camera.
  batch.push(hx * 0.25, 0, -hz + 0.2, FACE);
  scarecrow(batch);
  batch.pop();
  return { group, update };
}
