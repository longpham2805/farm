// The lamp post the reference design draws in the meadow's right corner (and beside the well): a dark iron post on a
// flared foot, a collar low down and a pointed finial on top; an arm across its top curving down at each end, and
// hanging from each end a round lantern of warm glowing glass between thin bars, under a dark cap. Over each lantern
// a soft glow, as the reference draws them: a wide orange halo and a bright yellow core, added to what is behind them.
// The bridges' and the farm's lanterns take the same glass and glows (lanternGlows), and the glows flicker a little.
import * as THREE from 'three';
import { BOX, BALL, cyl } from './parts.js';
import { glowTexture } from '../textures.js';

const IRON = '#2f2b2a';
// A deep orange, as the warm sun and the glow together wash a paler one out to cream.
export const GLASS = '#f08c1c';
const SPREAD = 0.13; // how far out each lantern hangs
const L = 1.2; // the lanterns' size
const TOP = 0.88; // the arm's height at the post
// The glows: [colour, how wide, how bright], the halo and the core.
const GLOWS = [['#ff9a2a', 0.5, 0.6], ['#ffd27a', 0.17, 0.7]];
// The camera's direction from what it looks at (as in FarmScene): the glows sit a little towards it, in front of the
// glass, so it does not hide them.
const CAM_DIR = new THREE.Vector3(1, 0.95, 1).normalize();

const BULB = new THREE.LatheGeometry(
  [[0, -0.07], [0.034, -0.064], [0.047, -0.03], [0.05, 0], [0.045, 0.04], [0.03, 0.064], [0, 0.07]].map(([r, y]) => new THREE.Vector2(r, y)),
  10,
);
const ARM = new THREE.TubeGeometry(
  new THREE.CatmullRomCurve3([[-SPREAD, TOP - 0.06], [-SPREAD + 0.015, TOP - 0.015], [-0.06, TOP + 0.012], [0, TOP], [0.06, TOP + 0.012], [SPREAD - 0.015, TOP - 0.015], [SPREAD, TOP - 0.06]].map(([x, y]) => new THREE.Vector3(x, y, 0))),
  24,
  0.016,
  6,
);

/**
 * The soft glows over lit lanterns, added to what is behind them. add(p, s) puts a halo and a core over the glass at p
 * (a world point), s times as wide as the meadow lamp's, a little towards the camera so the glass does not hide them;
 * update(t) makes each lantern's glow flicker a little, on a beat of its own.
 */
export function lanternGlows() {
  const group = new THREE.Group();
  const lights = [];
  const add = (p, s = 1) => {
    const at = p.clone().addScaledVector(CAM_DIR, 0.12);
    const sprites = GLOWS.map(([color, size, opacity]) => {
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color, opacity, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      sprite.position.copy(at);
      sprite.scale.setScalar(size * s);
      sprite.userData.ownMaterial = true;
      group.add(sprite);
      return sprite;
    });
    lights.push({ sprites, s, phase: lights.length * 2.4 });
  };
  const update = (t) => {
    for (const { sprites, s, phase } of lights) {
      // Three waves of their own speeds over each other, so the beat never quite repeats: brighter and dimmer by
      // up to about a tenth, the halo swelling a little with it.
      const k = 1 + 0.05 * Math.sin(t * 2.3 + phase) + 0.03 * Math.sin(t * 5.9 + phase * 1.7) + 0.02 * Math.sin(t * 13.1 + phase * 2.9);
      sprites.forEach((sprite, i) => (sprite.material.opacity = GLOWS[i][2] * k));
      sprites[0].scale.setScalar(GLOWS[0][1] * s * (1 + (k - 1) * 0.5));
    }
  };
  return { group, add, update };
}

/**
 * A lantern hanging from the origin, L times the size it is drawn at: a hook, a cap, the glass between four bars, and a
 * little cup under it. `size`: how much bigger than the meadow lamp's it is, for its glow.
 */
function lantern(batch, glow, glows, size = 1) {
  batch.push(0, 0, 0, 0, L);
  batch.add(cyl(1, 1, 6), IRON, [0, -0.015, 0], [0.006, 0.03, 0.006]);
  batch.add(new THREE.ConeGeometry(1, 1, 8), IRON, [0, -0.05, 0], [0.062, 0.045, 0.062], null, true);
  batch.add(BALL, IRON, [0, -0.026, 0], 0.012);
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
    batch.add(BOX, IRON, [Math.cos(a) * 0.047, -0.14, Math.sin(a) * 0.047], [0.008, 0.13, 0.008]);
  }
  batch.add(cyl(1, 0.55, 8), IRON, [0, -0.215, 0], [0.04, 0.025, 0.04], null, true);
  // The glass goes into the glow batch, placed and turned as the lantern is.
  glow.stack.push(batch.origin.clone());
  glow.add(BULB, GLASS, [0, -0.14, 0]);
  glow.pop();
  glows.add(new THREE.Vector3(0, -0.14, 0).applyMatrix4(batch.origin), size);
  batch.pop();
}

/**
 * The lamp post standing at the origin, its arm along x, `size` times as big as the meadow's; the lanterns' glass goes
 * into `glow`, their glows into `glows`.
 */
export function lamp(batch, glow, glows, size = 1) {
  batch.push(0, 0, 0, 0, size);
  batch.add(cyl(1, 1.5, 8), IRON, [0, 0.04, 0], [0.045, 0.08, 0.045], null, true);
  batch.add(cyl(1, 1.12, 8), IRON, [0, (0.08 + TOP) / 2, 0], [0.024, TOP - 0.08, 0.024]);
  batch.add(cyl(1, 1, 8), IRON, [0, 0.3, 0], [0.034, 0.03, 0.034], null, true);
  batch.add(ARM, IRON);
  batch.add(BALL, IRON, [0, TOP + 0.03, 0], 0.026);
  batch.add(new THREE.ConeGeometry(1, 1, 8), IRON, [0, TOP + 0.085, 0], [0.018, 0.07, 0.018], null, true);
  for (const s of [-1, 1]) {
    batch.push(s * SPREAD, TOP - 0.06, 0);
    lantern(batch, glow, glows, size);
    batch.pop();
  }
  batch.pop();
}
