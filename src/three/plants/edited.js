// Plants edited by hand in Blender (docs/redesign.md, "Editing a model by hand"): dev/export-models.mjs writes each
// placed model out as a .glb, and dev/edited-models.mjs bakes the ones edited (art/models/edited/<key>.glb) into
// editedModels.js, from which this builds them in the generators' place, with the generators' own materials.
import * as THREE from 'three';
import { EDITED_MODELS } from './editedModels.js';
import { materialNamed } from './parts.js';

/** A colour channel stored as 8-bit sRGB, back to linear, as the generators' colours are. */
const linear = (v) => {
  const s = v / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

/** The model `data` holds (one entry of editedModels.js), scaled from the height it was edited at to `height`. */
export function fromData(data, height = data.height) {
  const group = new THREE.Group();
  const scale = height / data.height;
  for (const part of data.parts) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(part.p.map((v) => (v / 1000) * scale), 3));
    if (part.n) g.setAttribute('normal', new THREE.Float32BufferAttribute(part.n.map((v) => v / 1000), 3));
    // Alpha, where there is one, is kept as it is.
    if (part.c) g.setAttribute('color', new THREE.Float32BufferAttribute(part.c.map((v, k) => (part.cs === 4 && k % 4 === 3 ? v / 255 : linear(v))), part.cs));
    if (part.m) g.setAttribute('moss', new THREE.Float32BufferAttribute(part.m.map((v) => v / 1000), 1));
    if (part.i) g.setIndex(part.i);
    const mesh = new THREE.Mesh(g, materialNamed(part.material));
    mesh.name = part.name;
    mesh.castShadow = part.cast;
    mesh.receiveShadow = part.receive;
    group.add(mesh);
  }
  group.userData.height = height;
  return group;
}

/** The hand-edited model with this key at `height`, or null when none was edited. */
export function edited(key, height) {
  const data = EDITED_MODELS[key];
  return data ? fromData(data, height) : null;
}
