// The plants on the painted valley: the trees and bushes round the farm, where TREES in valleyMap.js puts them, and the
// flowers, crops, boulders and cattails, where FLOWERS does, each standing as it was modelled to be seen from the
// camera, and the woods (woods.js), all swaying gently in the wind.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { TREES, FLOWERS } from '../valleyMap.js';
import { materialNamed } from './parts.js';
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
import { flowers, flowerRow, flowerBed } from './flowers.js';
import { rock } from './rock.js';
import { reeds } from './reeds.js';
import { woods } from './woods.js';
import { sway } from './sway.js';
import { edited } from './edited.js';

/** Each kind in TREES and FLOWERS: builds one from its seed, height and the rest of its entry (`more`). */
export const KINDS = {
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
  // The orange spikes (the kind 'orange' in flowers.js); `orange` is the fruit tree.
  gladiolus: (seed, height) => flowers(seed, height, 'orange'),
  lupin: (seed, height) => flowers(seed, height, 'lupin'),
  pinks: (seed, height, { length }) => flowerRow(seed, length, height, 'pink'),
  bed: (seed, height, { path }) => flowerBed(seed, path, height),
  // A boulder, turned as dev/plants.html shows it (longest across the screen, a little its own way), and a clump of
  // cattails.
  rock: (seed, height, { plants }) => rock(seed, height, { turn: Math.PI / 4 + Math.sin(seed * 2.4) * 0.4, plants }),
  reeds: (seed, height, { stalks, leaves }) => reeds(seed, height, { stalks, leaves }),
};

/**
 * Each TREES and FLOWERS entry with its model's key: `kind-seed`, and `-2`, `-3`… where the same kind and seed come
 * again. dev/export-models.mjs writes each model out by it, and editedModels.js holds it by it once edited by hand.
 */
export function placedModels() {
  const seen = {};
  return [...TREES, ...FLOWERS].map(([kind, u, b, height, seed, more = {}]) => {
    const k = `${kind}-${seed}`;
    const n = (seen[k] = (seen[k] ?? 0) + 1);
    return { key: n > 1 ? `${k}-${n}` : k, kind, u, b, height, seed, more };
  });
}

/**
 * Puts the plants on the valley; at(u, b) is the map's point in the world. Returns the group and update(t).
 * Each plant is built where it stands, then all the plants of one material (and the same shadow flags) are merged
 * into one mesh, so the hundred and fifty of them draw in a score of calls rather than one each, and as many again
 * for their shadows; each corner carries its plant's `foot` for the wind (sway.js). The woods are instanced instead.
 */
export function placePlants({ at }) {
  const group = new THREE.Group();
  // How wide a cell of merged plants is, in map units: smaller cells make more draw calls but leave more off the
  // screen out of the frame (measured 2026-10-17 at the default view, docs/redesign.md: "Fewer draw calls").
  const CELL = 8;
  const batches = new Map();
  for (const { key, kind, u, b, height, seed, more } of placedModels()) {
    // As edited by hand, if it was; else built from its seed.
    const plant = edited(key, height) ?? KINDS[kind](seed, height, more);
    plant.position.copy(at(u, b));
    if (more.turn) plant.rotation.y = more.turn;
    plant.updateMatrixWorld(true);
    plant.traverse((m) => {
      if (!m.isMesh) return;
      let g = m.geometry.clone().applyMatrix4(m.matrixWorld);
      if (g.index) g = g.toNonIndexed();
      const foot = new Float32Array(g.attributes.position.count * 3);
      for (let i = 0; i < foot.length; i += 3) plant.position.toArray(foot, i);
      g.setAttribute('foot', new THREE.BufferAttribute(foot, 3));
      // Only geometries with the same attributes merge, and only within one cell of the map (CELL units square), so
      // the renderer still leaves out the cells off the screen, as it did each plant.
      const batch = `${Math.floor(u / CELL)},${Math.floor(b / CELL)}|${m.material.name}|${m.castShadow}|${m.receiveShadow}|${Object.keys(g.attributes).sort().join()}|${g.attributes.color?.itemSize ?? 0}`;
      if (!batches.has(batch)) batches.set(batch, { material: materialNamed(m.material.name), castShadow: m.castShadow, receiveShadow: m.receiveShadow, geometries: [] });
      batches.get(batch).geometries.push(g);
    });
  }
  for (const { material, castShadow, receiveShadow, geometries } of batches.values()) {
    const mesh = new THREE.Mesh(mergeGeometries(geometries, false), material);
    mesh.castShadow = castShadow;
    mesh.receiveShadow = receiveShadow;
    group.add(mesh);
  }
  group.add(woods(at));
  return { group, update: sway(group) };
}
