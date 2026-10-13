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
