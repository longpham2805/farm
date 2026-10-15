// The plants on the painted valley: the trees and bushes round the farm, where TREES in valleyMap.js puts them, each
// standing as it was modelled to be seen from the camera, and the woods (woods.js), all swaying gently in the wind.
import * as THREE from 'three';
import { TREES } from '../valleyMap.js';
import { pine } from './pine.js';
import { roundTree, ROUND_TREES } from './roundTree.js';
import { fruitTree, FRUIT_TREES } from './fruitTree.js';
import { blossomTree } from './blossomTree.js';
import { birch } from './birch.js';
import { slimTree } from './slimTree.js';
import { fir } from './fir.js';
import { bush } from './bush.js';
import { woods } from './woods.js';
import { sway } from './sway.js';

/** Each kind in TREES: builds one from its seed and height. */
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
};

/** Puts the plants on the valley; at(u, b) is the map's point in the world. Returns the group and update(t). */
export function placePlants({ at }) {
  const group = new THREE.Group();
  for (const [kind, u, b, height, seed] of TREES) {
    const plant = KINDS[kind](seed, height);
    plant.position.copy(at(u, b));
    group.add(plant);
  }
  group.add(woods(at));
  return { group, update: sway(group) };
}
