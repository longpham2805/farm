// Trees built from the Low Poly Tree Pack models in treeModels.js, recoloured in the game's brighter greens.
import * as THREE from 'three';
import { TREE_MODELS } from './treeModels.js';

/**
 * The pack paints every face with one block of a 4 × 4 colour sheet. The same blocks in the game's colours,
 * row by row from the top left: bark (darkest to palest), fresh leaves, leaves (dark, mid, light, mid-light),
 * then birch bark, grey bark, dark needles and an unused block.
 */
export const SHEET = [
  '#4a3226', '#7a4f32', '#9a6c48', '#d9b48a',
  '#a6d65a', '#b8e070', '#8fc84e', '#cfd85a',
  '#3f9a4a', '#4fae52', '#72c75e', '#5cb957',
  '#f4efe4', '#8a7464', '#3c8a47', '#ff00ff',
];

// The sheet's leaf blocks; the rest are bark.
const LEAVES = new Set([4, 5, 6, 7, 8, 9, 10, 11, 14]);

/** Size of a model as made, in metres: { height, radius } (radius = farthest reach from the trunk). */
export function treeSize(name) {
  const { v } = TREE_MODELS[name];
  let height = 0;
  let radius = 0;
  for (let i = 0; i < v.length; i += 3) {
    height = Math.max(height, v[i + 1]);
    radius = Math.max(radius, Math.hypot(v[i], v[i + 2]));
  }
  return { height: height / 1000, radius: radius / 1000 };
}

/** An angle brought into -π to π. */
const wrapAngle = (a) => a - Math.PI * 2 * Math.floor((a + Math.PI) / (Math.PI * 2));

/** Calls fn(a, b, c, block) for each triangle of a model, scaled so the model is `height` tall. */
function eachTriangle(name, height, fn) {
  const { v, t, c } = TREE_MODELS[name];
  const scale = height / treeSize(name).height / 1000;
  const corner = (k) => new THREE.Vector3(v[t[k] * 3], v[t[k] * 3 + 1], v[t[k] * 3 + 2]).multiplyScalar(scale);
  let k = 0;
  for (let r = 0; r < c.length; r += 2) {
    for (let n = 0; n < c[r + 1]; n++, k += 3) fn(corner(k), corner(k + 1), corner(k + 2), c[r]);
  }
}

/**
 * A model as a vertex-coloured geometry (position, normal, color) standing on y = 0 and `height` tall.
 * Non-indexed, so every face keeps its own colour; draw it with flatShading.
 */
export function treeGeometry(name, height = 1, sheet = SHEET) {
  const pos = [];
  const col = [];
  const color = new THREE.Color();
  eachTriangle(name, height, (a, b, c, block) => {
    color.set(sheet[block]);
    for (const p of [a, b, c]) {
      pos.push(p.x, p.y, p.z);
      col.push(color.r, color.g, color.b);
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}

/**
 * n spots on the sides of a model's leaves (not the top or underneath) for fruit to hang on, spread over the
 * side that faces `facing` (an angle round the trunk, as atan2(z, x)): [point, outward normal] pairs for the
 * model at `height` as treeGeometry draws it. Takes exactly two values from rand per spot.
 */
export function leafSpots(name, height, n, rand, facing) {
  const faces = [];
  const center = new THREE.Vector3();
  eachTriangle(name, height, (a, b, c, block) => {
    if (!LEAVES.has(block)) return;
    const mid = a.clone().add(b).add(c).divideScalar(3);
    const normal = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a)).normalize();
    faces.push({ mid, normal });
    center.add(mid);
  });
  center.divideScalar(faces.length);
  const sides = faces.filter(({ mid, normal }) => normal.y > -0.6 && normal.y < 0.5 && normal.dot(mid.clone().sub(center)) > 0);
  for (const f of sides) f.angle = Math.atan2(f.mid.z - center.z, f.mid.x - center.x);
  const lo = Math.min(...sides.map((f) => f.mid.y));
  const hi = Math.max(...sides.map((f) => f.mid.y));
  const size = treeSize(name);
  const reach = (size.radius / size.height) * height;
  return Array.from({ length: n }, (_, k) => {
    // Aim at a point round the canopy, up to 120° either side of `facing`, and take the side face nearest to it.
    const angle = facing + ((k + rand()) / n - 0.5) * Math.PI * 1.33;
    const y = lo + (hi - lo) * (0.15 + rand() * 0.65);
    let best = sides[0];
    let bestD = Infinity;
    for (const f of sides) {
      const turn = Math.abs(wrapAngle(f.angle - angle));
      const d = turn * reach + Math.abs(f.mid.y - y);
      if (d < bestD) {
        bestD = d;
        best = f;
      }
    }
    return [best.mid, best.normal];
  });
}
