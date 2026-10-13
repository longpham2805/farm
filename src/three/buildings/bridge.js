// The bridges over the river, as the reference design draws them: a deck of planks laid across it, arching from bank
// to bank on a thick beam down each side; a railing of square posts under a round rail that follows the arch, with
// taller posts at the corners; and footings of grey stones at each end, where the deck meets the road. The big bridge
// has a lamp post of two lanterns at its farm end; the small one carries a lantern on each of its back corner posts.
//
// Modelled along x from one end to the other, its deck across z; placed, it turns to run between its ends (BRIDGES in
// valleyMap.js), and its back (-z) is the side away from the camera.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { BOX, BALL, cyl } from './parts.js';
import { seeded } from '../../util.js';

const PLANKS = ['#d08a45', '#c47f3e', '#da9852', '#bf7a3a'];
const BEAM = '#a5622f';
const RAIL = '#a8642f';
const UNDER = '#5e3519';
const STONES = ['#d3cdbf', '#c4beb0', '#dcd6c9', '#b8b2a5'];
const IRON = '#3b3a3c';
const FLAME = '#ffe9a6';

// The deck's ends rest END above the ground on their footings, and it reaches OVER past each of the bridge's ends onto
// the road. Its planks are PLANK wide and THICK thick; the rail runs RAIL_H above it, on posts about POSTS apart.
const END = 0.13;
const OVER = 0.15;
const PLANK = 0.22;
const THICK = 0.045;
const RAIL_H = 0.36;
const POSTS = 0.55;

/** A box `len` long along x, h tall and d deep, bent so that its middle follows y(x). */
function bentBox(len, h, d, y) {
  const g = new THREE.BoxGeometry(len, h, d, 24, 1, 1);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setY(i, pos.getY(i) + y(pos.getX(i)));
  g.computeVertexNormals();
  return g;
}

/** A round rail `len` long along x, r thick, bent so that its middle follows y(x). */
function bentRail(len, r, y) {
  const g = new THREE.CylinderGeometry(r, r, len, 8, 24).rotateZ(Math.PI / 2);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setY(i, pos.getY(i) + y(pos.getX(i)));
  g.computeVertexNormals();
  return g;
}

const stone = (w, h, d) => new RoundedBoxGeometry(w, h, d, 2, Math.min(0.03, Math.min(w, h, d) * 0.3));

/** A lantern standing on its base at the origin: an iron frame round a lit glass, under a little pointed roof. */
function lantern(batch, glow, s = 1) {
  batch.add(BOX, IRON, [0, 0.012 * s, 0], [0.1 * s, 0.024 * s, 0.1 * s]);
  for (const x of [-1, 1]) for (const z of [-1, 1]) batch.add(BOX, IRON, [x * 0.04 * s, 0.085 * s, z * 0.04 * s], [0.01 * s, 0.13 * s, 0.01 * s]);
  batch.add(new THREE.ConeGeometry(1, 1, 4), IRON, [0, 0.175 * s, 0], [0.068 * s, 0.055 * s, 0.068 * s], [0, Math.PI / 4, 0], true);
  batch.add(BALL, IRON, [0, 0.21 * s, 0], 0.012 * s);
  // The glass goes into the glow batch, placed and turned as the lantern is.
  glow.stack.push(batch.origin.clone());
  glow.add(BOX, FLAME, [0, 0.085 * s, 0], [0.074 * s, 0.13 * s, 0.074 * s]);
  glow.pop();
}

/** A lamp post on a stone at the origin, two lanterns hanging from the arm across its top. */
function lampPost(batch, glow) {
  batch.add(stone(0.16, 0.08, 0.16), STONES[1], [0, 0.03, 0]);
  batch.add(cyl(1, 1, 8), IRON, [0, 0.5, 0], [0.024, 0.9, 0.024]);
  batch.add(BOX, IRON, [0, 0.95, 0], [0.36, 0.025, 0.025]);
  batch.add(BALL, IRON, [0, 0.98, 0], 0.025);
  for (const s of [-1, 1]) {
    batch.add(BOX, IRON, [s * 0.15, 0.92, 0], [0.008, 0.05, 0.008]);
    batch.push(s * 0.15, 0.72, 0);
    lantern(batch, glow, 0.95);
    batch.pop();
  }
}

/**
 * A bridge `span` long between its ends and `width` across, its deck rising `arch` from its ends to its middle. With
 * `lamp`, a lamp post stands behind its first end; with `lanterns`, its back corner posts carry lanterns.
 */
export function bridge(batch, glow, { span, width, arch, lamp = false, lanterns = false }) {
  const rand = seeded(Math.round(span * 1000));
  const len = span + 2 * OVER;
  const deck = (x) => END + arch * (1 - ((2 * x) / len) ** 2);
  const slope = (x) => Math.atan((-8 * arch * x) / (len * len));
  const side = width / 2 + 0.02;

  // The planks across, each a little off from the next in length, colour and lie, over a dark floor that shows
  // between them, on a beam down each side.
  const n = Math.round(len / PLANK);
  for (let k = 0; k < n; k++) {
    const x = -len / 2 + ((k + 0.5) * len) / n;
    const d = width - 0.02 + (rand() - 0.5) * 0.05;
    batch.add(stone(len / n - 0.014, THICK, d), PLANKS[Math.floor(rand() * PLANKS.length)], [x, deck(x) - THICK / 2, (rand() - 0.5) * 0.025], 1, [(rand() - 0.5) * 0.02, 0, slope(x) + (rand() - 0.5) * 0.03]);
  }
  batch.add(bentBox(len - 0.02, 0.03, width - 0.08, (x) => deck(x) - THICK - 0.01), UNDER);
  for (const s of [-1, 1]) {
    batch.push(0, 0, s * (width / 2 - 0.035));
    batch.add(bentBox(len + 0.02, 0.14, 0.07, (x) => deck(x) - 0.075), BEAM);
    batch.pop();
  }

  // The railings: a post at each corner, taller and thicker, and posts between them under a round rail.
  const corner = len / 2 - 0.09;
  const between = Math.max(1, Math.round((2 * corner) / POSTS));
  for (const s of [-1, 1]) {
    for (let k = 1; k < between; k++) {
      const x = -corner + (2 * corner * k) / between;
      const top = deck(x) + RAIL_H;
      const foot = deck(x) - 0.12;
      batch.add(BOX, RAIL, [x, (top + foot) / 2, s * side], [0.07, top - foot, 0.07]);
    }
    batch.push(0, 0, s * side);
    batch.add(bentRail(2 * corner, 0.04, (x) => deck(x) + RAIL_H + 0.01), RAIL);
    batch.pop();
    for (const e of [-1, 1]) {
      const x = e * corner;
      const top = deck(x) + RAIL_H + 0.12;
      batch.add(BOX, RAIL, [x, (top + END) / 2, s * side], [0.1, top - END, 0.1]);
      batch.add(BOX, BEAM, [x, top + 0.015, s * side], [0.125, 0.03, 0.125]);
      if (lanterns && s < 0) {
        batch.push(x, top + 0.03, s * side);
        lantern(batch, glow);
        batch.pop();
      } else {
        batch.add(new THREE.ConeGeometry(1, 1, 4), BEAM, [x, top + 0.05, s * side], [0.08, 0.04, 0.08], [0, Math.PI / 4, 0], true);
      }
    }
  }

  // The footings: a slab of stones across under each end of the deck, reaching out past it onto the road, and a
  // block under each corner post.
  for (const e of [-1, 1]) {
    const x = e * (len / 2 - 0.02);
    const across = width + 0.2;
    for (let k = 0; k < 3; k++) {
      const h = END - 0.01 - rand() * 0.02;
      const z = -across / 2 + ((k + 0.5) * across) / 3;
      batch.add(stone(0.36 + rand() * 0.06, h + 0.03, across / 3 - 0.02), STONES[Math.floor(rand() * STONES.length)], [x + (rand() - 0.5) * 0.04, (h - 0.03) / 2, z], 1, [0, (rand() - 0.5) * 0.1, 0]);
    }
    for (const s of [-1, 1]) {
      batch.add(stone(0.19, END + 0.08, 0.19), STONES[Math.floor(rand() * STONES.length)], [e * corner, (END + 0.08) / 2 - 0.04, s * side], 1, [0, (rand() - 0.5) * 0.2, 0]);
    }
  }

  if (lamp) {
    batch.push(-len / 2 - 0.05, 0, -side - 0.3);
    lampPost(batch, glow);
    batch.pop();
  }
}
