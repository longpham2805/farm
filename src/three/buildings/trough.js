// The meadow's water trough, as the reference draws it: a long box of planks, three to a side with seams between,
// on two beams, posts at its corners and a lip along its top, full of water that catches the light.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { BOX } from './parts.js';

const PLANKS = ['#a8723f', '#9b6838', '#b37b46', '#a06c3b'];
const POST = '#87582f';
const INSIDE = '#5d3a1e';
const WATER = '#5fbfe8';
const [LONG, WIDE, HIGH, THICK] = [1.0, 0.36, 0.26, 0.035];
const PLANK = new RoundedBoxGeometry(1, 1, THICK, 2, 0.008);
const CORNER = new RoundedBoxGeometry(0.05, 1, 0.05, 2, 0.01);

/**
 * The trough, along x, standing on the batch's origin: its wood goes into the batch. Returns its water, a glossy
 * surface a little below the rim, as a mesh of its own where the batch's origin is.
 */
export function trough(batch, rand) {
  const plank = () => PLANKS[Math.floor(rand() * PLANKS.length)];
  // Two beams across under it, and the floor, dark inside.
  for (const x of [-0.36, 0.36]) batch.add(BOX, POST, [x, 0.025, 0], [0.07, 0.05, WIDE + 0.08]);
  batch.add(BOX, INSIDE, [0, 0.07, 0], [LONG - 0.04, 0.03, WIDE - 0.04]);
  // The sides and the ends, three planks high, a seam between each.
  const h = (HIGH - 0.05) / 3;
  for (let k = 0; k < 3; k++) {
    const y = 0.05 + h * (k + 0.5);
    for (const s of [-1, 1]) {
      batch.add(PLANK, plank(), [0, y, s * (WIDE / 2 - THICK / 2)], [LONG, h - 0.006, 1]);
      batch.add(PLANK, plank(), [s * (LONG / 2 - THICK / 2), y, 0], [WIDE - THICK * 2, h - 0.006, 1], [0, Math.PI / 2, 0]);
    }
  }
  // A lip along the top of each side, and a post at each corner, a little taller.
  for (const s of [-1, 1]) batch.add(BOX, plank(), [0, HIGH + 0.008, s * (WIDE / 2 - THICK / 2)], [LONG + 0.02, 0.016, THICK + 0.02]);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) batch.add(CORNER, POST, [sx * (LONG / 2 - 0.01), (HIGH + 0.04) / 2, sz * (WIDE / 2 - 0.01)], [1, HIGH + 0.04, 1]);

  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(LONG - THICK * 2, WIDE - THICK * 2).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: WATER, roughness: 0.1, metalness: 0.05 }),
  );
  water.position.y = HIGH - 0.045;
  water.receiveShadow = true;
  const group = new THREE.Group();
  batch.origin.decompose(group.position, group.quaternion, group.scale);
  group.add(water);
  return group;
}
