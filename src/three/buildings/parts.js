// What the buildings round the farm are made of: shared shapes, colours, stone footings, windows and chimney smoke.
import * as THREE from 'three';
import { gableGeometry } from '../batch.js';
import { glowTexture } from '../textures.js';

export const TAU = Math.PI * 2;
export const FACE = Math.PI / 4; // turned to face the camera

export const BOX = new THREE.BoxGeometry(1, 1, 1);
export const GABLE = gableGeometry();
export const BALL = new THREE.SphereGeometry(1, 10, 7);
export const ICO = new THREE.IcosahedronGeometry(1, 0);
export const cyl = (top, bottom, seg) => new THREE.CylinderGeometry(top, bottom, 1, seg);
export const CYL6 = cyl(1, 1, 6);
export const CYL10 = cyl(1, 1, 10);
export const CYL16 = cyl(1, 1, 16);

/**
 * A prism: a convex outline in x, y (points in order round it) stood on z = -depth/2 and drawn out to depth/2.
 * Non-indexed so every face shades flat.
 */
export function prismGeometry(outline, depth) {
  const z0 = -depth / 2;
  const z1 = depth / 2;
  const tris = [];
  for (let k = 1; k < outline.length - 1; k++) {
    const [a, b, c] = [outline[0], outline[k], outline[k + 1]];
    tris.push([...a, z1], [...b, z1], [...c, z1], [...a, z0], [...c, z0], [...b, z0]);
  }
  outline.forEach((p, k) => {
    const q = outline[(k + 1) % outline.length];
    tris.push([...p, z0], [...q, z0], [...q, z1], [...p, z0], [...q, z1], [...p, z1]);
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(tris.flat(), 3));
  g.computeVertexNormals();
  return g;
}

export const WOOD = '#8a5a3a';
export const PLANK = '#b98450';
export const STONE = '#c9c2b4';
export const TRIM = '#fff8ef';
export const GLASS = '#a9dcff';
export const STRAW = '#ecc95c';
export const FENCE = '#c98a4b';

export const GREYS = ['#c9c2b4', '#b8b0a0', '#d6d0c2', '#aaa292'];

/** A footing of rough stones of a few greys round a w × d base, about h tall. */
export function stoneFooting(batch, w, d, h, rand) {
  // Lays stones along a side `len` long; place(t, width, colour, height) puts one centred t along it.
  const lay = (len, place) => {
    for (let t = -len / 2; t < len / 2 - 0.02;) {
      const sw = Math.min(0.1 + rand() * 0.1, len / 2 - t);
      place(t + sw / 2, sw, GREYS[Math.floor(rand() * GREYS.length)], h * (0.8 + rand() * 0.4));
      t += sw + 0.008;
    }
  };
  for (const s of [-1, 1]) {
    lay(w, (t, sw, c, sh) => batch.add(BOX, c, [t, sh / 2, (s * d) / 2], [sw, sh, 0.06]));
    lay(d, (t, sw, c, sh) => batch.add(BOX, c, [(s * w) / 2, sh / 2, t], [0.06, sh, sw]));
  }
}

/** Courses of stones round a round wall: `rows` rings from y0 up, `step` apart, `n` stones a ring, radius r(y). */
export function stoneCourses(batch, rows, y0, step, n, r, height = step - 0.02) {
  for (let row = 0; row < rows; row++) {
    const y = y0 + row * step;
    const rr = r(y);
    for (let k = 0; k < n; k++) {
      const a = ((k + (row % 2) * 0.5) / n) * TAU;
      batch.add(BOX, GREYS[(k * 3 + row) % GREYS.length], [Math.sin(a) * rr, y, Math.cos(a) * rr], [((TAU * rr) / n) * 0.92, height, 0.03], [0, a, 0]);
    }
  }
}

export function windowAt(batch, x, y, z, w = 0.26, h = 0.21, side = false) {
  const [fw, fd] = side ? [0.03, w + 0.06] : [w + 0.06, 0.03];
  const [gw, gd] = side ? [0.02, w] : [w, 0.02];
  const out = side ? Math.sign(x) * 0.01 : 0;
  const zo = side ? 0 : 0.01;
  batch.add(BOX, TRIM, [x, y, z], [fw, h + 0.06, fd]);
  batch.add(BOX, GLASS, [x + out, y, z + zo], [gw, h, gd]);
}

/**
 * Tiles or shingles on a slope from its top edge (height y0 at z0) down to its bottom edge (y1 at z1), w across in
 * x: staggered rows of them, `tile` wide (varied by up to `jitter`) and `thick` thick, in colours picked from
 * `tones`, each `tilt` flatter than the slope so its lower edge stands proud, tipped at random by up to `wobble` and
 * lifted off the slope by up to `rise`, so no two lie quite level, on an underlay of colour `under` that shows
 * between them.
 */
export function tiledSlope(batch, rand, { w, z0, y0, z1, y1, rows, tones, under, tile = 0.15, jitter = 0, thick = 0.035, tilt = 0.07, wobble = 0, rise = 0 }) {
  const dz = z1 - z0;
  const dy = y1 - y0;
  const len = Math.hypot(dz, dy);
  const s = Math.sign(dz);
  const a = Math.atan2(-dy, Math.abs(dz));
  // Along the slope (down it) and out of it.
  const down = [dz / len, dy / len];
  const out = [s * Math.sin(a), Math.cos(a)];
  const on = (t, lift) => [z0 + down[0] * t + out[0] * lift, y0 + down[1] * t + out[1] * lift];
  const [mz, my] = on(len / 2, 0.005);
  batch.add(BOX, under, [0, my, mz], [w, 0.02, len], [s * a, 0, 0]);
  const n = rows ?? Math.max(2, Math.round(len / 0.12));
  const step = len / n;
  for (let k = 0; k < n; k++) {
    const [z, y] = on((k + 0.5) * step, 0.0125 + thick / 2);
    for (let x = -w / 2 - ((k % 2) * tile) / 2; x < w / 2;) {
      const next = x + tile * (jitter ? 1 + (rand() - 0.5) * jitter : 1);
      const left = Math.max(-w / 2, x);
      const right = Math.min(w / 2, next);
      x = next;
      if (right - left < 0.04) continue;
      const color = tones[Math.floor(rand() * tones.length)];
      const tip = () => (wobble ? (rand() - 0.5) * wobble : 0);
      const up = rise ? rand() * rise : 0;
      batch.add(BOX, color, [(left + right) / 2, y + out[1] * up, z + out[0] * up], [right - left - 0.014, thick, step * 1.3], [s * (a - tilt) + tip(), tip(), tip()]);
    }
  }
}

/** Puffs of smoke rising from a chimney top (a world point) and drifting to the right; update(t) moves them. */
export function smokePuffs(origin) {
  const group = new THREE.Group();
  const puffs = [];
  for (let k = 0; k < 6; k++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: '#f4f1ea', transparent: true, depthWrite: false, opacity: 0 }));
    s.userData.phase = k / 6;
    group.add(s);
    puffs.push(s);
  }
  return {
    group,
    update(t) {
      for (const s of puffs) {
        const k = (t * 0.22 + s.userData.phase) % 1;
        s.position.set(origin.x + k * 0.35 + Math.sin(k * 6 + s.userData.phase * 9) * 0.06, origin.y + k * 1.3, origin.z - k * 0.12);
        s.scale.setScalar(0.18 + k * 0.5);
        s.material.opacity = Math.min(1, k * 6) * (1 - k) * 0.75;
      }
    },
  };
}
