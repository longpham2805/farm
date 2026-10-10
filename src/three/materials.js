import * as THREE from 'three';
import { STYLES } from '../data/styles.js';

const cache = new Map();

/** Materials that cycle through the rainbow every frame. */
export const rainbowMats = new Set();

const UNRIPE = new THREE.Color('#9bd36a');

/**
 * Material for one part of a plant.
 * part: produce (the crop itself), accent (other crop parts), leaf, stem,
 *       face (eyes etc., never restyled), deco (accessories, never restyled)
 * look: { style, unripe }
 */
export function plantMat(color, part, look = {}, extra = {}) {
  const style = look.style ? STYLES[look.style] : null;
  const styled = !!style && (part === 'produce' || (style.whole && part !== 'face' && part !== 'deco'));
  const key = [color, part, styled ? look.style : '', look.unripe && part === 'produce' ? 'u' : '',
    extra.map ? extra.map.uuid : '', extra.roughness ?? '', extra.emissive ?? '', extra.metalness ?? '', extra.opacity ?? ''].join('|');
  const hit = cache.get(key);
  if (hit) return hit;

  let mat;
  if (styled) {
    const s = style.mat;
    const physical = !!(s.clearcoat || s.iridescence);
    mat = new (physical ? THREE.MeshPhysicalMaterial : THREE.MeshStandardMaterial)({
      color: s.color,
      metalness: s.metalness,
      roughness: s.roughness,
      emissive: s.emissive,
      emissiveIntensity: s.emissiveIntensity * (part === 'produce' ? 1 : 0.6),
      map: extra.map || null,
    });
    if (physical) {
      mat.clearcoat = s.clearcoat || 0;
      mat.clearcoatRoughness = 0.12;
      if (s.iridescence) {
        mat.iridescence = 1;
        mat.iridescenceIOR = 1.7;
        mat.iridescenceThicknessRange = [200, 600];
      }
    }
    if (s.opacity) {
      mat.transparent = true;
      mat.opacity = s.opacity;
    }
    if (part !== 'produce') mat.color.lerp(new THREE.Color(color), 0.2);
    if (style.rainbow) rainbowMats.add(mat);
  } else {
    const c = new THREE.Color(color);
    if (look.unripe && part === 'produce') c.lerp(UNRIPE, 0.65);
    mat = new THREE.MeshStandardMaterial({
      color: c,
      roughness: extra.roughness ?? (part === 'leaf' || part === 'stem' ? 0.75 : 0.42),
      metalness: extra.metalness ?? 0,
      map: extra.map || null,
    });
    if (extra.emissive) {
      mat.emissive = new THREE.Color(extra.emissive);
      mat.emissiveIntensity = extra.emissiveIntensity ?? 0.6;
    }
    if (extra.opacity) {
      mat.transparent = true;
      mat.opacity = extra.opacity;
    }
  }
  if (extra.side) mat.side = extra.side;
  cache.set(key, mat);
  return mat;
}

export function updateRainbow(t) {
  let i = 0;
  for (const mat of rainbowMats) {
    const h = (t * 0.12 + i * 0.13) % 1;
    mat.color.setHSL(h, 0.85, 0.62);
    mat.emissive.setHSL((h + 0.5) % 1, 0.8, 0.18);
    i++;
  }
}

// Plain materials for the world (not plants).
const worldCache = new Map();
export function worldMat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!worldCache.has(key)) {
    worldCache.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...opts }));
  }
  return worldCache.get(key);
}
