// Cheaper stand-ins for the trees' shadows. The shadow map (about 115 texels a unit, scene.js) cannot tell a crown
// of eighty lumpy clumps from its convex hull, so a tree casts the hull of its crown and the hull of its trunk, a
// few hundred triangles, in place of its thousands. Flowers, rocks and cattails keep their own shadows: a hull of
// them would be a solid blob where the real one is lace. The stand-ins are drawn with the scene, as the shadow pass
// only takes what the camera sees, but write neither colour nor depth, so they show nothing.
import * as THREE from 'three';
import { ConvexGeometry } from 'three/examples/jsm/geometries/ConvexGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/** For the stand-ins: nothing on the screen (the shadow pass draws depth with its own material). */
export const SHADOW_ONLY = new THREE.MeshBasicMaterial({ name: 'shadowOnly', colorWrite: false, depthWrite: false });
/**
 * The kinds whose biggest mesh casts a stand-in, and where the crown parts from the trunk, as a share of the model's
 * height ('whole' for one hull of it all: the tiered pines and firs are cones, the bushes balls). A plant's other
 * meshes (the fruit) cast nothing: their shadows fall inside the crown's.
 */
export const PROXIED = { pine: 'whole', fir: 'whole', bush: 'whole', round: 0.35, roundGreen: 0.35, apple: 0.35, orange: 0.35, blossom: 0.35, slim: 0.35 };

const hull = (points) => {
  if (points.length < 4) return null;
  const g = new ConvexGeometry(points);
  g.deleteAttribute('uv');
  return g;
};

/**
 * The stand-in for `geometry` (in its own space): one hull of it, or the hulls of its crown and its trunk, parted at
 * `split` of its height. Null when there is nothing to hull.
 */
export function shadowProxy(geometry, split) {
  const pos = geometry.attributes.position;
  const points = [];
  for (let i = 0; i < pos.count; i++) points.push(new THREE.Vector3().fromBufferAttribute(pos, i));
  if (split === 'whole') return hull(points);
  geometry.computeBoundingBox();
  const { min, max } = geometry.boundingBox;
  const cut = min.y + (max.y - min.y) * split;
  const parts = [points.filter((p) => p.y >= cut), points.filter((p) => p.y < cut)].map(hull).filter(Boolean);
  return parts.length ? mergeGeometries(parts, false) : null;
}
