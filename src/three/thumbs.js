// Renders crop pictures for the menus with a small offscreen renderer.
// Pictures are made one per animation frame so menus never freeze.
import * as THREE from 'three';
import { buildPlant } from './models.js';
import { STYLES } from '../data/styles.js';
import { lookOf } from '../data/styles.js';
import { CROP_BY_ID } from '../data/crops.js';
import { glowTexture } from './textures.js';

const SIZE = 160;
const cache = new Map();
const queue = [];
let renderer = null;
let scene = null;
let camera = null;
let busy = false;

function setup() {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(SIZE, SIZE, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.setClearColor(0x000000, 0);
  scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight('#ffffff', '#9ab87a', 1.6));
  const sun = new THREE.DirectionalLight('#fff4e0', 2.2);
  sun.position.set(3, 6, 4);
  scene.add(sun);
  camera = new THREE.OrthographicCamera(-0.62, 0.62, 0.62, -0.62, 0.1, 50);
  camera.position.set(4, 2.6, 4);
  camera.lookAt(0, 0.3, 0);
}

function render(cropId, variant) {
  if (!renderer) setup();
  const model = buildPlant(cropId, 3, variant);
  const top = model.userData.top;
  const look = lookOf(CROP_BY_ID[cropId], variant);
  const holder = new THREE.Group();
  holder.add(model);
  if (look) {
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: STYLES[look.style].aura, transparent: true, opacity: 0.6, depthWrite: false }));
    glow.scale.set(1.3, 1.3, 1);
    glow.position.set(-0.4, top * 0.45, -0.4);
    holder.add(glow);
  }
  // Fit the camera to the plant's bounding box as seen from the camera.
  camera.position.set(4, 2.9, 4);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model);
  const inv = camera.matrixWorldInverse;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (let k = 0; k < 8; k++) {
    const p = new THREE.Vector3(k & 1 ? box.max.x : box.min.x, k & 2 ? box.max.y : box.min.y, k & 4 ? box.max.z : box.min.z).applyMatrix4(inv);
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
  }
  const half = Math.max(maxX - minX, maxY - minY) * 0.5 * 0.92;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  camera.left = cx - half;
  camera.right = cx + half;
  camera.top = cy + half;
  camera.bottom = cy - half;
  camera.updateProjectionMatrix();
  scene.add(holder);
  renderer.render(scene, camera);
  scene.remove(holder);
  holder.traverse((o) => {
    if (o.isSprite) o.material.dispose();
  });
  return renderer.domElement.toDataURL('image/png');
}

function pump() {
  if (busy) return;
  busy = true;
  requestAnimationFrame(() => {
    const started = performance.now();
    while (queue.length && performance.now() - started < 12) {
      const job = queue.shift();
      let url = cache.get(job.key);
      if (typeof url !== 'string') {
        url = render(job.crop, job.variant);
        cache.set(job.key, url);
      }
      for (const img of job.imgs) img.src = url;
    }
    busy = false;
    if (queue.length) pump();
  });
}

const BLANK = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';

/** Returns an <img> that fills in with the crop picture. */
export function cropImg(cropId, variant = 0, className = 'thumb') {
  const img = document.createElement('img');
  img.className = className;
  img.alt = '';
  img.draggable = false;
  const key = `${cropId}:${variant}`;
  const url = cache.get(key);
  if (typeof url === 'string') {
    img.src = url;
    return img;
  }
  img.src = BLANK;
  // Pictures on screen go ahead of the background pre-rendering.
  const at = queue.findIndex((j) => j.key === key);
  const job = at >= 0 ? queue.splice(at, 1)[0] : { key, crop: cropId, variant, imgs: [] };
  job.imgs.push(img);
  const firstBackground = queue.findIndex((j) => !j.imgs.length);
  queue.splice(firstBackground < 0 ? queue.length : firstBackground, 0, job);
  pump();
  return img;
}

/** Renders the plain look of every crop in idle time so menus open with pictures ready. */
export function prewarm(cropIds) {
  for (const id of cropIds) {
    const key = `${id}:0`;
    if (!cache.has(key) && !queue.find((j) => j.key === key)) queue.push({ key, crop: id, variant: 0, imgs: [] });
  }
  pump();
}
