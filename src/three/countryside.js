// The painted valley's assembly: the painted backdrop with the 3D buildings and plants standing on it, a plane that
// shows their shadows on the painting, and the clouds drifting over. It also holds the map's coordinates (xz, at),
// the sun's direction and the fit of its shadow box to the view.
import * as THREE from 'three';
import { cloud } from './farm.js';
import { placeBuildings } from './buildings.js';
import { placePlants } from './plants/valley.js';
import { buildBackdrop, backdropBounds, shadowCatcher } from './backdrop.js';

const S = Math.SQRT1_2;

/**
 * Map position → world [x, z]. The camera looks from +x +z, so u runs left to right on screen
 * and b from the front (bottom of the screen) to the back (top).
 */
export const xz = (u, b) => [(u - b) * S, -(u + b) * S];
export const at = (u, b, y = 0) => {
  const [x, z] = xz(u, b);
  return new THREE.Vector3(x, y, z);
};
const toUB = (x, z) => [(x - z) * S, -(x + z) * S];

/** How far the player can look around, in screen units: u across, up the screen. It is the painted backdrop's frame. */
export const VIEW_BOUNDS = backdropBounds();

/** Where the sun shines from: up and to the left on screen, a little towards the camera. */
export const SUN_DIR = new THREE.Vector3(-0.414, 1.11, 0.91).normalize();

/**
 * Fits the sun's shadow box round what `camera` sees, so everything in view casts its shadow and the shadow map's
 * texels go where they show: the box takes in the ground in view and whatever stands up to 4 above it, as the sun
 * sees them, and reaches up the sun's rays far enough for anything tall standing outside the view to cast its shadow
 * in. The sun keeps its direction; the box moves in steps of one texel, so the shadows stay still while the view
 * pans. Call it whenever the view changes. The sun's target must be in the scene.
 */
export function fitShadow(sun, camera) {
  camera.updateMatrixWorld();
  const toSun = SUN_DIR;
  const across = new THREE.Vector3(0, 1, 0).cross(toSun).normalize();
  const up = toSun.clone().cross(across);
  const look = new THREE.Vector3(0, 0, -1).transformDirection(camera.matrixWorld);
  const box = { left: Infinity, right: -Infinity, bottom: Infinity, top: -Infinity, near: Infinity, far: -Infinity };
  const p = new THREE.Vector3();
  for (const x of [camera.left, camera.right]) {
    for (const y of [camera.bottom, camera.top]) {
      for (const h of [0, 4]) {
        // Where the view's corner meets the height h.
        p.set(x, y, 0).applyMatrix4(camera.matrixWorld);
        p.addScaledVector(look, (h - p.y) / look.y);
        box.left = Math.min(box.left, p.dot(across) - 0.5);
        box.right = Math.max(box.right, p.dot(across) + 0.5);
        box.bottom = Math.min(box.bottom, p.dot(up) - 0.5);
        box.top = Math.max(box.top, p.dot(up) + 0.5);
        box.near = Math.min(box.near, p.dot(toSun));
        box.far = Math.max(box.far, p.dot(toSun));
      }
    }
  }
  const size = sun.shadow.mapSize.x;
  const step = (v, texel) => Math.round(v / texel) * texel;
  const w = box.right - box.left;
  const h = box.top - box.bottom;
  const cx = step((box.left + box.right) / 2, w / size);
  const cy = step((box.bottom + box.top) / 2, h / size);
  // The sun stands 6 past the highest point in the box, towards itself, and sees down to 1 past the lowest.
  const top = box.far + 6;
  sun.target.position.copy(across).multiplyScalar(cx).addScaledVector(up, cy).addScaledVector(toSun, box.near);
  sun.position.copy(sun.target.position).addScaledVector(toSun, top - box.near);
  Object.assign(sun.shadow.camera, { left: -w / 2, right: w / 2, bottom: -h / 2, top: h / 2, near: 0.5, far: top - box.near + 1 });
  sun.shadow.camera.updateProjectionMatrix();
  // A bias of 0.017 in the world, whatever the depth the box takes.
  sun.shadow.bias = -0.017 / (sun.shadow.camera.far - sun.shadow.camera.near);
}

/** How wide a square round the middle the plane that shows the shadows on the painting takes: all of the painting. */
export const SHADOW_GROUND = 60;

// ── Clouds ──────────────────────────────────────────────────────

const CLOUDS = [
  // [u, b, height, size]: high in the sky, and lower ones resting between the peaks.
  [-12, 16.9, 5.5, 1.6], [-3, 18.9, 6.0, 1.3], [6, 17.9, 5.2, 1.8], [15, 16.9, 6.2, 1.4], [-20, 15.9, 5.0, 1.2],
  [-8, 14.5, 4.2, 1.5], [3, 14.9, 4.4, 1.7], [12, 14.3, 4.0, 1.4], [-17, 14.7, 4.3, 1.6], [20, 14.9, 4.1, 1.5],
];

// ── Assembly ────────────────────────────────────────────────────

export function buildCountryside() {
  const group = new THREE.Group();

  // The painted backdrop; the buildings and plants redone for it stand on it, and shadows fall on it wherever the sun
  // works them out (fitShadow).
  const backdrop = buildBackdrop();
  const placed = placeBuildings({ at });
  const plants = placePlants({ at });
  group.add(backdrop.mesh, shadowCatcher(SHADOW_GROUND), placed.group, plants.group);

  const clouds = CLOUDS.map(([u, b, h, s]) => {
    const c = cloud(s);
    c.position.copy(at(u, b, h));
    group.add(c);
    return c;
  });

  const update = (t, dt) => {
    backdrop.update(t);
    placed.update(t, dt);
    plants.update(t);
    for (const c of clouds) {
      // Drift to the right across the screen and come back round from the left.
      c.position.x += dt * 0.1;
      c.position.z -= dt * 0.1;
      if (toUB(c.position.x, c.position.z)[0] > 26) {
        c.position.x -= 52 * S;
        c.position.z += 52 * S;
      }
    }
  };
  // The painting's tiles load for the sharp or the fast setting.
  const setDetail = (high) => backdrop.setDetail(high);
  return { group, update, valleyPlants: plants.group, setDetail };
}
