// Mist round the valley: a sheet of fog on the ground round the whole of it, as far as the view can travel, thick
// at its rim, over the woods at the top, the bottom and the sides, thinning towards the farm, thickest in its four
// corners, with soft white puffs over it at the corners and
// along the sides and a few thin wisps of cloud drifting along its top and bottom. It all stands in the world, so
// panning or zooming moves past it; the farm in the middle stays clear. The sheet shifts slowly as noise rolls
// over it; each puff breathes, sways and drifts on its own beat. Two draw calls: the sheet, and one instanced quad
// for all the puffs (the puff's opacity in its instance colour), both facing the camera, drawn last over everything.
import * as THREE from 'three';
import { seeded } from '../util.js';

const TAU = Math.PI * 2;
// How big the mist is, of what it first was (the user took it down by 30%): how far in from the rim its sheet
// reaches, how big its puffs are and how far in from a corner they stand.
const SIZE = 0.7;
// The sheet, by how far out a point stands (d: 1 at the rim of the valley, measured so the corners count as
// further out than the sides, see `far`): clear inside INNER, full from RIM out (over the woods), gone again past
// OUTER; FULL how white. The view the game opens on reaches about 0.4.
const INNER = 1 - 0.5 * SIZE;
const RIM = 1 - 0.12 * SIZE;
const OUTER = 1.3;
const FULL = 0.9;
// The fog along the sides (left and right) reaches this much as far in as along the top and the bottom: the woods
// there are nearer (the user took it in a fifth, twice).
const SIDES = 0.64;
const GRID = 30;
// A corner's bank of puffs: how far in from the corner along the frame's width and height (of the half-frame), the
// size (of the opening view's height) and how white, and the beat of its breathing (seconds).
const BANK = [
  { dx: 0.0, dy: 0.0, size: 1.0, alpha: 0.42, beat: 23 },
  { dx: 0.32, dy: -0.04, size: 0.7, alpha: 0.3, beat: 31 },
  { dx: -0.05, dy: 0.3, size: 0.62, alpha: 0.28, beat: 27 },
  { dx: 0.2, dy: 0.18, size: 0.44, alpha: 0.16, beat: 19 },
];
// Along each side between the corners, a band: puffs at these points of the side (of the half-view), centred a
// little outside it so mostly their inner half shows.
const BAND = [-0.75, -0.45, -0.15, 0.15, 0.45, 0.75];
const BAND_PUFF = { size: 0.5, alpha: 0.16 };
// The wisps: which side (1 top, -1 bottom), how far along it they start (of 2.6 half-widths, wrapping), size, how
// white, and how many half-widths they travel a second.
const WISPS = [
  { edge: 1, start: 0.2, size: 0.46, alpha: 0.22, speed: 0.012 },
  { edge: 1, start: 1.5, size: 0.38, alpha: 0.18, speed: 0.009 },
  { edge: -1, start: 0.9, size: 0.42, alpha: 0.2, speed: 0.01 },
  { edge: -1, start: 2.1, size: 0.36, alpha: 0.16, speed: 0.014 },
];
// How far a puff sways (of the half-view), how much it swells and brightens as it breathes, and how high over the
// ground it floats (world units).
const SWAY = 0.025;
const SWELL = 0.06;
const BREATH = 0.3;
const LIFT = 0.6;

/** How far out (nx, ny) stands: 1 along the rim, more in the corners (a 4-norm: (1, 1) is 1.19). */
const far = (nx, ny) => (nx ** 4 + ny ** 4) ** 0.25;
// Where the sides' fog begins (of the half-width): as far from the rim as SIDES of the top and bottom's band.
const SIDE_INNER = 1 - SIDES * (1 - INNER);
/** |nx| squeezed so the sides' fog begins at SIDE_INNER and is full at the rim: the same profile, narrower. */
const squeeze = (nx) => {
  const v = Math.abs(nx);
  return v < SIDE_INNER ? (v * INNER) / SIDE_INNER : INNER + ((v - SIDE_INNER) * (1 - INNER)) / (1 - SIDE_INNER);
};

/** How white the sheet is at `d`. */
function sheetAlpha(d) {
  const smooth = (t) => t * t * (3 - 2 * t);
  if (d <= INNER) return 0;
  if (d < RIM) return FULL * smooth((d - INNER) / (RIM - INNER));
  if (d < 1.1) return FULL;
  if (d < OUTER) return FULL * (1 - smooth((d - 1.1) / (OUTER - 1.1)));
  return 0;
}

/** A soft cloud: a few overlapping blurs of white, faded out well inside the edge of the picture. */
function puffTexture(seed) {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const g = canvas.getContext('2d');
  const rand = seeded(seed);
  for (let i = 0; i < 7; i++) {
    const x = size * (0.3 + rand() * 0.4);
    const y = size * (0.32 + rand() * 0.36);
    const r = size * (0.14 + rand() * 0.16);
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, 'rgba(255,255,255,0.7)');
    grad.addColorStop(0.5, 'rgba(255,255,255,0.28)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);
  }
  // Nothing reaches the quad's edge.
  g.globalCompositeOperation = 'destination-in';
  const mask = g.createRadialGradient(size / 2, size / 2, size * 0.2, size / 2, size / 2, size * 0.5);
  mask.addColorStop(0, 'rgba(0,0,0,1)');
  mask.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = mask;
  g.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const NOISE = `
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
  }`;

const PUFF_MATERIAL = (map) => new THREE.ShaderMaterial({
  uniforms: { map: { value: map }, color: { value: new THREE.Color('#fbfdff') } },
  vertexShader: `
    varying vec2 vUv;
    varying float vAlpha;
    void main() {
      vUv = uv;
      vAlpha = instanceColor.r;
      gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: `
    uniform sampler2D map;
    uniform vec3 color;
    varying vec2 vUv;
    varying float vAlpha;
    void main() {
      gl_FragColor = vec4(color, texture2D(map, vUv).a * vAlpha);
    }`,
  transparent: true,
  depthTest: false,
  depthWrite: false,
});

/** The sheet: white by the vertex's `alpha`, drifting a little thicker and thinner as two layers of noise roll by. */
const SHEET_MATERIAL = (time) => new THREE.ShaderMaterial({
  uniforms: { time, color: { value: new THREE.Color('#fbfdff') } },
  vertexShader: `
    attribute float alpha;
    varying vec2 vUv;
    varying float vAlpha;
    void main() {
      vUv = uv;
      vAlpha = alpha;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: `
    uniform float time;
    uniform vec3 color;
    varying vec2 vUv;
    varying float vAlpha;
    ${NOISE}
    void main() {
      float n = noise(vUv * 5.0 + vec2(time * 0.012, -time * 0.008)) * 0.6 + noise(vUv * 11.0 - vec2(time * 0.02, time * 0.005)) * 0.4;
      gl_FragColor = vec4(color, vAlpha * (0.7 + 0.6 * (n - 0.5)));
    }`,
  transparent: true,
  depthTest: false,
  depthWrite: false,
});

/**
 * The sheet of fog on the ground: a grid over the frame (nx, ny in ±OUTER), the alpha at each corner by how far
 * out it stands, the clear middle left out.
 */
function sheet(frame, time) {
  const positions = [];
  const alphas = [];
  const uvs = [];
  const index = [];
  const at = (i) => -OUTER + (2 * OUTER * i) / GRID;
  for (let j = 0; j <= GRID; j++) {
    for (let i = 0; i <= GRID; i++) {
      const [nx, ny] = [at(i), at(j)];
      positions.push(...frame.ground(nx, ny).toArray());
      alphas.push(sheetAlpha(far(squeeze(nx), ny)));
      uvs.push(i / GRID, j / GRID);
    }
  }
  for (let j = 0; j < GRID; j++) {
    for (let i = 0; i < GRID; i++) {
      const a = j * (GRID + 1) + i;
      const corners = [a, a + 1, a + GRID + 1, a + GRID + 2];
      if (corners.every((k) => alphas[k] === 0)) continue;
      index.push(a, a + 1, a + GRID + 2, a, a + GRID + 2, a + GRID + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('alpha', new THREE.Float32BufferAttribute(alphas, 1));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(index);
  const mesh = new THREE.Mesh(g, SHEET_MATERIAL(time));
  mesh.frustumCulled = false;
  mesh.renderOrder = 999;
  return mesh;
}

/**
 * The mist for `camera` (orthographic, fixed in direction): a group to add to the scene. `opening()` gives the
 * frame to lay it round (left, right, top, bottom in the camera's plane: the whole valley) and `unit`, the height
 * of the view the game opens on, which sizes the puffs; null before the screen has a size. update(t), t in
 * seconds, lays the mist out the first time it can, then moves it.
 */
export function farmMist(camera, opening) {
  const group = new THREE.Group();
  const time = { value: 0 };
  const puffs = [];
  const rand = seeded(7);
  for (const [sx, sy] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
    // A corner's puffs stand nearer the side than the top or bottom, as the sides' fog is narrower.
    for (const p of BANK) puffs.push({ ...p, dx: p.dx * SIDES * SIZE, dy: p.dy * SIZE, sx, sy, phase: rand() * TAU, turn: (rand() - 0.5) * 0.6, spin: (rand() - 0.5) * 0.01, stretch: 1.15 + rand() * 0.35 });
  }
  for (const [ex, ey] of [[0, 1], [0, -1], [-1, 0], [1, 0]]) {
    for (const k of BAND) {
      // Each its own size, whiteness and distance out, so the band is ragged, not a straight strip.
      puffs.push({ ex, ey, along: k + (rand() - 0.5) * 0.2, out: 1.0 + rand() * 0.14, size: BAND_PUFF.size * (0.75 + rand() * 0.5) * (ex ? SIDES : 1), alpha: BAND_PUFF.alpha * (0.7 + rand() * 0.6), beat: 20 + rand() * 15, phase: rand() * TAU, turn: (ex ? Math.PI / 2 : 0) + (rand() - 0.5) * 0.3, spin: 0, stretch: 1.5 + rand() * 0.4 });
    }
  }
  for (const w of WISPS) puffs.push({ ...w, phase: rand() * TAU, turn: (rand() - 0.5) * 0.3, spin: 0, stretch: 2.2 + rand() * 0.6, beat: 37 });
  // Only in a browser (the tests build the scene without one).
  const map = typeof document === 'undefined' ? null : puffTexture(3);
  const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), PUFF_MATERIAL(map), puffs.length);
  mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(puffs.length * 3), 3);
  mesh.frustumCulled = false;
  mesh.renderOrder = 1000;
  mesh.count = 0;
  group.add(mesh);

  // The opening view's frame on the ground, laid out once and kept: the ground point under its middle, the ground
  // run of its half-width and half-height (so ground(nx, ny) is where its view point (nx, ny) meets the ground, by
  // the frame it opened with, not where the camera looks now), the camera's right and up, which way the puffs
  // face, and half the view's height, by which they are sized.
  let frame = null;
  const layOut = () => {
    const view = opening();
    if (!view) return null;
    const halfW = (view.right - view.left) / 2;
    const halfH = (view.top - view.bottom) / 2;
    if (!(halfW > 2 && halfH > 2)) return null;
    const dir = camera.getWorldDirection(new THREE.Vector3());
    // Where the view's point (nx, ny) meets the ground: out of the camera's plane, down the line of sight.
    const hit = (nx, ny) => {
      const p = new THREE.Vector3((view.left + view.right) / 2 + nx * halfW, (view.top + view.bottom) / 2 + ny * halfH, -10).applyMatrix4(camera.matrixWorld);
      return p.addScaledVector(dir, -p.y / dir.y);
    };
    const origin = hit(0, 0);
    const runX = hit(1, 0).sub(origin);
    const runY = hit(0, 1).sub(origin);
    const ground = (nx, ny) => origin.clone().addScaledVector(runX, nx).addScaledVector(runY, ny);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
    return { ground, right, up, unit: view.unit ?? halfH * 2, facing: camera.quaternion.clone() };
  };

  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const spin = new THREE.Quaternion();
  const z = new THREE.Vector3(0, 0, 1);
  const pos = new THREE.Vector3();
  const scale = new THREE.Vector3();
  const tint = new THREE.Color();
  const update = (t) => {
    if (!frame) {
      frame = layOut();
      if (!frame) return;
      group.add(sheet(frame, time));
      mesh.count = puffs.length;
    }
    time.value = t;
    const { ground, up, unit, facing } = frame;
    puffs.forEach((p, i) => {
      const breath = Math.sin((t / p.beat) * TAU + p.phase);
      let nx;
      let ny;
      if (p.edge) {
        // Along the top or the bottom, left to right and round again, a little outside the side.
        nx = ((p.start + t * p.speed) % 2.6) - 1.3;
        ny = p.edge * (1.0 + 0.04 * Math.sin((t / 41) * TAU + p.phase));
      } else if (p.ex !== undefined) {
        // The band: swaying along its side, breathing a little in and out.
        const along = p.along + SWAY * Math.sin((t / 33) * TAU + p.phase);
        const out = p.out + 0.02 * breath;
        nx = p.ex ? p.ex * out : along;
        ny = p.ey ? p.ey * out : along;
      } else {
        nx = p.sx * (1 - p.dx) + SWAY * Math.sin((t / 29) * TAU + p.phase);
        ny = p.sy * (1 - p.dy) + SWAY * 0.7 * Math.cos((t / 37) * TAU + p.phase * 1.7);
      }
      const size = p.size * SIZE * unit * (1 + SWELL * breath);
      pos.copy(ground(nx, ny)).addScaledVector(up, LIFT + size * 0.25);
      scale.set(size * p.stretch, size, 1);
      q.copy(facing).multiply(spin.setFromAxisAngle(z, p.turn + t * p.spin));
      mesh.setMatrixAt(i, m.compose(pos, q, scale));
      mesh.setColorAt(i, tint.setScalar(p.alpha * (1 + BREATH * breath)));
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.instanceColor.needsUpdate = true;
  };
  return { group, update };
}
