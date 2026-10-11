// Merges many small static meshes into one mesh per shading kind, so the whole countryside
// draws in a few calls. Each part keeps its own colour as vertex colours.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const Y_AXIS = new THREE.Vector3(0, 1, 0);
const tmpM = new THREE.Matrix4();
const tmpQ = new THREE.Quaternion();
const tmpE = new THREE.Euler();
const tmpP = new THREE.Vector3();
const tmpS = new THREE.Vector3();
const tmpC = new THREE.Color();

/** Gives every vertex of g the same colour. */
export function paint(g, color) {
  tmpC.set(color);
  const n = g.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    arr[i * 3] = tmpC.r;
    arr[i * 3 + 1] = tmpC.g;
    arr[i * 3 + 2] = tmpC.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return g;
}

export class Batch {
  constructor() {
    this.parts = { smooth: [], flat: [] };
    this.stack = [new THREE.Matrix4()];
  }

  get origin() {
    return this.stack[this.stack.length - 1];
  }

  /** Moves the origin of the next parts (until pop): position, turn around y, scale. */
  push(x, y, z, ry = 0, s = 1) {
    tmpM.compose(tmpP.set(x, y, z), tmpQ.setFromAxisAngle(Y_AXIS, ry), tmpS.setScalar(s));
    this.stack.push(this.origin.clone().multiply(tmpM));
    return this;
  }

  pop() {
    this.stack.pop();
    return this;
  }

  /**
   * Same placement arguments as the farm's m(): position, scale (number or [x, y, z]), rotation.
   * A null colour keeps the geometry's own vertex colours (a tree model, say).
   */
  add(geometry, color, p = [0, 0, 0], s = 1, r = null, flat = false) {
    tmpP.set(...p);
    if (typeof s === 'number') tmpS.setScalar(s);
    else tmpS.set(...s);
    tmpQ.setFromEuler(r ? tmpE.set(...r) : tmpE.set(0, 0, 0));
    tmpM.compose(tmpP, tmpQ, tmpS).premultiply(this.origin);
    const g = geometry.index ? geometry.toNonIndexed() : geometry.clone();
    for (const name of Object.keys(g.attributes)) {
      if (name !== 'position' && name !== 'normal' && (color !== null || name !== 'color')) g.deleteAttribute(name);
    }
    g.applyMatrix4(tmpM);
    if (color !== null) paint(g, color);
    this.parts[flat ? 'flat' : 'smooth'].push(g);
  }

  /** Adds a non-indexed geometry that is already placed and has position, normal and color. */
  addRaw(g, flat = false) {
    this.parts[flat ? 'flat' : 'smooth'].push(g);
  }

  build({ castShadow = true, receiveShadow = true } = {}) {
    const group = new THREE.Group();
    for (const kind of ['smooth', 'flat']) {
      const list = this.parts[kind];
      if (!list.length) continue;
      const geometry = mergeGeometries(list, false);
      for (const g of list) g.dispose();
      const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, flatShading: kind === 'flat' }));
      mesh.castShadow = castShadow;
      mesh.receiveShadow = receiveShadow;
      mesh.userData.ownMaterial = true;
      group.add(mesh);
    }
    this.parts = { smooth: [], flat: [] };
    return group;
  }
}

/**
 * A roof-like prism: a 1 × 1 base on y = 0 (x and z from -0.5 to 0.5) and a ridge along x at y = 1.
 * Non-indexed so every face shades flat.
 */
export function gableGeometry() {
  const a = [-0.5, 0, -0.5], b = [0.5, 0, -0.5], c = [0.5, 0, 0.5], d = [-0.5, 0, 0.5];
  const e = [-0.5, 1, 0], f = [0.5, 1, 0];
  const tris = [
    d, c, f, d, f, e, // front slope
    b, a, e, b, e, f, // back slope
    a, d, e, // left end
    c, b, f, // right end
    a, b, c, a, c, d, // bottom
  ];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(tris.flat(), 3));
  g.computeVertexNormals();
  return g;
}
