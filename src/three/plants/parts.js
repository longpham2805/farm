// What the plants share: flat-faceted meshes coloured at their corners, as the reference design's low-poly trees,
// and the pieces they are built from.
import * as THREE from 'three';

export const TAU = Math.PI * 2;

/** One material for the plants: the colours are in the mesh, each facet lit flat. */
export const MATERIAL = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.92 });
/** For plants whose edges are softened: lit by the normals in the mesh, which bend smoothly round its corners. */
export const SOFT_MATERIAL = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92 });

/**
 * Triangles with a colour at each corner, each turned to face the way `facing(a, b, c)` gives; lit flat, or by
 * `normals` at its corners when given.
 */
export function mesher() {
  const pos = [];
  const col = [];
  const nor = [];
  const n = new THREE.Vector3();
  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();
  const tri = (a, b, c, ca, cb, cc, facing, normals = null) => {
    ab.subVectors(b, a);
    ac.subVectors(c, a);
    n.crossVectors(ab, ac).normalize();
    let [na, nb, nc] = normals ?? [n, n, n];
    if (n.dot(facing(a, b, c)) < 0) {
      [b, c, cb, cc, nb, nc] = [c, b, cc, cb, nc, nb];
      if (!normals) na = nb = nc = n.negate();
    }
    for (const p of [a, b, c]) pos.push(p.x, p.y, p.z);
    for (const k of [ca, cb, cc]) col.push(k.r, k.g, k.b);
    for (const k of [na, nb, nc]) nor.push(k.x, k.y, k.z);
  };
  const geometry = () => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    return g;
  };
  return { tri, geometry };
}

// Which way a face should look: out from the trunk, or down.
export const OUT = (a, b, c) => new THREE.Vector3(a.x + b.x + c.x, 0, a.z + b.z + c.z);
export const DOWN = () => new THREE.Vector3(0, -1, 0);

/** A palette of hex colours as THREE.Colors, each a little shifted in hue (`hue`) and scaled in value (`value`). */
export function palette(colors, hue = 0, value = 1, keep = []) {
  return Object.fromEntries(Object.entries(colors).map(([k, v]) => {
    const c = new THREE.Color(v);
    return [k, keep.includes(k) ? c : c.offsetHSL(hue, 0, 0).multiplyScalar(value)];
  }));
}

// The game's sun (SUN_DIR in countryside.js), for colouring what faces it.
const SUN = new THREE.Vector3(-0.414, 1.11, 0.91).normalize();

/**
 * A limb of `sides` flat sides from `a` (radius ra) to `b` (radius rb), its sides coloured between `dark` and
 * `light` by how they face the sun (from the upper left of the screen); `smooth`, round rather than flat-sided.
 */
export function limb(m, a, b, ra, rb, { dark, light }, sides = 6, smooth = false) {
  const axis = new THREE.Vector3().subVectors(b, a).normalize();
  const side = Math.abs(axis.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
  const u = new THREE.Vector3().crossVectors(axis, side).normalize();
  const v = new THREE.Vector3().crossVectors(axis, u);
  const ring = (p, r) => Array.from({ length: sides }, (_, k) => {
    const t = (k / sides) * TAU;
    return p.clone().addScaledVector(u, Math.cos(t) * r).addScaledVector(v, Math.sin(t) * r);
  });
  const lo = ring(a, ra);
  const hi = ring(b, rb);
  // Each side faces out from the limb's axis.
  const away = (p, q, r) => {
    const c = new THREE.Vector3().addVectors(p, q).add(r).divideScalar(3).sub(a);
    return c.addScaledVector(axis, -c.dot(axis));
  };
  const tone = (d) => dark.clone().lerp(light, THREE.MathUtils.clamp(0.5 + 0.5 * d.dot(SUN), 0, 1));
  for (let k = 0; k < sides; k++) {
    const k1 = (k + 1) % sides;
    if (smooth) {
      const [d0, d1] = [k, k1].map((i) => lo[i].clone().sub(a).normalize());
      const [c0, c1] = [tone(d0), tone(d1)];
      m.tri(lo[k], lo[k1], hi[k1], c0, c1, c1, away, [d0, d1, d1]);
      m.tri(lo[k], hi[k1], hi[k], c0, c1, c0, away, [d0, d1, d0]);
      continue;
    }
    const col = tone(lo[k].clone().add(lo[k1]).multiplyScalar(0.5).sub(a).normalize());
    m.tri(lo[k], lo[k1], hi[k1], col, col, col, away);
    m.tri(lo[k], hi[k1], hi[k], col, col, col, away);
  }
}

/** A value in -0.5..0.5 that is the same for every copy of a point, so faces meeting there stay joined when it moves. */
export function pointNoise(p, seed) {
  const s = Math.sin(Math.round(p.x * 1000) * 12.9898 + Math.round(p.y * 1000) * 78.233 + Math.round(p.z * 1000) * 37.719 + seed * 19.19) * 43758.5453;
  return s - Math.floor(s) - 0.5;
}
