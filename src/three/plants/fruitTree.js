// A fruit tree as the reference design draws them inside the ring road: smaller than the trees of the woods, on a
// short stout trunk, its crown a deep, rich green dome of rounder clumps, hung all round with big glossy fruit, red
// and orange.
import * as THREE from 'three';
import { leafyTree } from './roundTree.js';

/** The kinds: their leaves (as ROUND_TREES) and the colours their fruit comes in, as often as each is listed. */
export const FRUIT_TREES = {
  apple: {
    leaves: { shade: '#0a360b', dark: '#185f15', mid: '#36962a', light: '#70c03c', bark: '#8a5a2e', barkDark: '#4a2f16' },
    fruit: ['#d81e22', '#d81e22', '#d81e22', '#e8402a', '#f08423'],
  },
  orange: {
    leaves: { shade: '#0a360b', dark: '#185f15', mid: '#36962a', light: '#70c03c', bark: '#8a5a2e', barkDark: '#4a2f16' },
    fruit: ['#f6871c', '#f6871c', '#ff9f24', '#e8622a'],
  },
};

// More, smaller clumps than the woods' trees, a crown wider for its height and hanging lower, on a stouter trunk
// forking a little lower, its edges rounded over a little (as ROUND_FORM).
const FORM = { crown: 0.36, clumps: [26, 32], size: [0.28, 0.36], core: 0.7, fork: 0.22, trunk: [0.06, 0.045], limbs: [0.036, 0.026, 0.014], soft: 0.4 };

const FRUIT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35 });
const BERRY = new THREE.IcosahedronGeometry(1, 2);

/**
 * A fruit tree `height` tall (world units), laid out by `seed`, of `kind` (one of FRUIT_TREES). Returns a group
 * standing on its foot at the origin: the tree and its fruit.
 */
export function fruitTree(seed = 1, height = 1.6, kind = FRUIT_TREES.apple) {
  const { mesh, clumps, mid, rand } = leafyTree(seed, height, kind.leaves, FORM);
  // The fruit sit on the outside of the crown's clumps, round its sides and underneath rather than on top, each
  // clear of the other clumps and of the other fruit.
  const r = 0.044;
  const placed = [];
  const want = 14 + Math.floor(rand() * 5);
  for (let tries = 0; placed.length < want && tries < want * 20; tries++) {
    const k = clumps[1 + Math.floor(rand() * (clumps.length - 1))];
    const dir = k.c.clone().sub(mid).add(new THREE.Vector3(rand() - 0.5, rand() - 0.6, rand() - 0.5).multiplyScalar(k.r * 2.4)).normalize();
    if (dir.y > 0.4) continue;
    const p = k.c.clone().addScaledVector(dir, k.r * 0.9);
    if (clumps.some((o) => o !== k && p.distanceTo(o.c) < o.r * 0.95)) continue;
    if (placed.some((q) => q.p.distanceTo(p) < r * 2.6)) continue;
    placed.push({ p, colour: new THREE.Color(kind.fruit[Math.floor(rand() * kind.fruit.length)]), size: r * (0.85 + rand() * 0.3) });
  }
  // All the fruit in one smooth, glossy mesh, each a ball a little flattened, as an apple or an orange is.
  const pos = [];
  const col = [];
  const norm = [];
  const src = BERRY.attributes.position;
  const n = new THREE.Vector3();
  for (const { p, colour, size } of placed) {
    for (let i = 0; i < src.count; i++) {
      n.fromBufferAttribute(src, i);
      pos.push((p.x + n.x * size) * height, (p.y + n.y * size * 0.9) * height, (p.z + n.z * size) * height);
      norm.push(n.x, n.y, n.z);
      col.push(colour.r, colour.g, colour.b);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(norm, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const fruit = new THREE.Mesh(g, FRUIT);
  fruit.castShadow = true;
  const tree = new THREE.Group();
  tree.add(mesh, fruit);
  tree.userData.height = height;
  return tree;
}
