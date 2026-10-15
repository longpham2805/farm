// The plants on the painted valley: the trees and bushes round the farm, where TREES in valleyMap.js puts them, and the
// flowers and crops, where FLOWERS does, each standing as it was modelled to be seen from the camera, and the woods
// (woods.js), all swaying gently in the wind.
import * as THREE from 'three';
import { TREES, FLOWERS } from '../valleyMap.js';
import { pine } from './pine.js';
import { roundTree, ROUND_TREES } from './roundTree.js';
import { fruitTree, FRUIT_TREES } from './fruitTree.js';
import { blossomTree } from './blossomTree.js';
import { birch } from './birch.js';
import { slimTree } from './slimTree.js';
import { fir } from './fir.js';
import { bush } from './bush.js';
import { sunflower } from './sunflower.js';
import { tomatoRow } from './tomato.js';
import { flowers } from './flowers.js';
import { woods } from './woods.js';
import { sway } from './sway.js';

/** Each kind in TREES and FLOWERS: builds one from its seed, height and the rest of its entry (`more`). */
const KINDS = {
  pine: (seed, height) => pine(seed, height),
  round: (seed, height) => roundTree(seed, height, ROUND_TREES.lime),
  roundGreen: (seed, height) => roundTree(seed, height, ROUND_TREES.green),
  apple: (seed, height) => fruitTree(seed, height, FRUIT_TREES.apple),
  orange: (seed, height) => fruitTree(seed, height, FRUIT_TREES.orange),
  blossom: (seed, height) => blossomTree(seed, height),
  birch: (seed, height) => birch(seed, height),
  slim: (seed, height) => slimTree(seed, height),
  fir: (seed, height) => fir(seed, height),
  bush: (seed, height) => bush(seed, height),
  sunflower: (seed, height) => sunflower(seed, height),
  tomatoes: (seed, height, { length }) => tomatoRow(seed, length, height),
  // The clumps of flowers, each kind of them in plants/flowers.js.
  daisy: (seed, height) => flowers(seed, height, 'daisy'),
  yellow: (seed, height) => flowers(seed, height, 'yellow'),
  purple: (seed, height) => flowers(seed, height, 'purple'),
  orange: (seed, height) => flowers(seed, height, 'orange'),
  lupin: (seed, height) => flowers(seed, height, 'lupin'),
};

/** Puts the plants on the valley; at(u, b) is the map's point in the world. Returns the group and update(t). */
export function placePlants({ at }) {
  const group = new THREE.Group();
  for (const [kind, u, b, height, seed, more = {}] of [...TREES, ...FLOWERS]) {
    const plant = KINDS[kind](seed, height, more);
    plant.position.copy(at(u, b));
    if (more.turn) plant.rotation.y = more.turn;
    group.add(plant);
  }
  group.add(woods(at));
  return { group, update: sway(group) };
}
