// Reads and writes .glb files (glTF 2.0, binary) of the plants' meshes: triangles with positions, normals, colours at
// their corners and the rock's `moss` at each, a named material each and a few extras; no textures or animation.
// Blender opens and saves them; the game gets the plants' materials back by name (materialNamed in
// src/three/plants/parts.js).
import * as THREE from 'three';

const MAGIC = 0x46546c67;
const CHUNK = { json: 0x4e4f534a, bin: 0x004e4942 };
// Three's attribute names and glTF's; `_MOSS` is this game's own, named with the underscore glTF asks of such.
const SEMANTICS = { position: 'POSITION', normal: 'NORMAL', color: 'COLOR_0', uv: 'TEXCOORD_0', moss: '_MOSS' };
const TYPES = ['SCALAR', 'VEC2', 'VEC3', 'VEC4'];
const FLOAT = 5126;
const UINT32 = 5125;
const ARRAY_BUFFER = 34962;
const INDEX_BUFFER = 34963;
// Bytes, reader and the largest value of each component type, for reading what others wrote (normalized integers).
const COMPONENTS = {
  5120: [1, (b, o) => b.readInt8(o), 127],
  5121: [1, (b, o) => b.readUInt8(o), 255],
  5122: [2, (b, o) => b.readInt16LE(o), 32767],
  5123: [2, (b, o) => b.readUInt16LE(o), 65535],
  5125: [4, (b, o) => b.readUInt32LE(o), 1],
  5126: [4, (b, o) => b.readFloatLE(o), 1],
};

const pad4 = (n) => (4 - (n % 4)) % 4;

/**
 * The .glb (a Buffer) of the meshes under `root`: a node for each, its world transform baked into its corners so the
 * root stands at the origin unturned, named as the mesh is and carrying its material's name and shadow flags in its
 * extras; `extras` go on the root node (the model's height, for one).
 */
export function writeGlb(root, extras = {}) {
  root.updateMatrixWorld(true);
  const json = {
    asset: { version: '2.0', generator: 'farm dev/glb.mjs' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ name: root.name || 'model', extras, children: [] }],
    meshes: [],
    materials: [],
    accessors: [],
    bufferViews: [],
    buffers: [],
  };
  const chunks = [];
  let offset = 0;
  const accessor = (array, size, componentType, target, bounds = false) => {
    const bytes = Buffer.from(array.buffer, array.byteOffset, array.byteLength);
    json.bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: bytes.length, target });
    chunks.push(bytes, Buffer.alloc(pad4(bytes.length)));
    offset += bytes.length + pad4(bytes.length);
    const a = { bufferView: json.bufferViews.length - 1, componentType, count: array.length / size, type: TYPES[size - 1] };
    if (bounds) {
      a.min = Array(size).fill(Infinity);
      a.max = Array(size).fill(-Infinity);
      array.forEach((v, i) => {
        a.min[i % size] = Math.min(a.min[i % size], v);
        a.max[i % size] = Math.max(a.max[i % size], v);
      });
    }
    json.accessors.push(a);
    return json.accessors.length - 1;
  };
  const materials = new Map();
  const material = (m) => {
    if (!materials.has(m.name)) {
      materials.set(m.name, json.materials.length);
      json.materials.push({
        name: m.name,
        pbrMetallicRoughness: { baseColorFactor: [1, 1, 1, 1], metallicFactor: 0, roughnessFactor: m.roughness ?? 1 },
        doubleSided: m.side === THREE.DoubleSide,
      });
    }
    return materials.get(m.name);
  };
  root.traverse((o) => {
    if (!o.isMesh) return;
    if (!o.material.name) throw new Error(`${o.name || 'a mesh'} of ${root.name || 'the model'} has an unnamed material`);
    const g = o.geometry.clone().applyMatrix4(o.matrixWorld);
    const attributes = {};
    for (const [name, semantic] of Object.entries(SEMANTICS)) {
      const attr = g.getAttribute(name);
      if (attr) attributes[semantic] = accessor(Float32Array.from(attr.array), attr.itemSize, FLOAT, ARRAY_BUFFER, name === 'position');
    }
    const primitive = { attributes, material: material(o.material) };
    if (g.index) primitive.indices = accessor(Uint32Array.from(g.index.array), 1, UINT32, INDEX_BUFFER);
    const name = o.name || `part ${json.meshes.length + 1}`;
    json.meshes.push({ name, primitives: [primitive] });
    json.nodes.push({ name, mesh: json.meshes.length - 1, extras: { material: o.material.name, castShadow: o.castShadow, receiveShadow: o.receiveShadow } });
    json.nodes[0].children.push(json.nodes.length - 1);
  });
  json.buffers.push({ byteLength: offset });
  const text = Buffer.from(JSON.stringify(json));
  const bin = Buffer.concat(chunks);
  const head = (length, type) => {
    const b = Buffer.alloc(8);
    b.writeUInt32LE(length, 0);
    b.writeUInt32LE(type, 4);
    return b;
  };
  const header = Buffer.alloc(12);
  header.writeUInt32LE(MAGIC, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(12 + 8 + text.length + pad4(text.length) + 8 + bin.length, 8);
  return Buffer.concat([header, head(text.length + pad4(text.length), CHUNK.json), text, Buffer.alloc(pad4(text.length), 0x20), head(bin.length, CHUNK.bin), bin]);
}

/** What a .glb holds: its JSON, and `accessor(i)` as { array, size }: floats (normalized integers scaled) or indices. */
export function readGlb(buffer) {
  const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  if (buf.length < 12 || buf.readUInt32LE(0) !== MAGIC) throw new Error('not a .glb file');
  let json = null;
  let bin = null;
  for (let off = 12; off < buf.length;) {
    const length = buf.readUInt32LE(off);
    const type = buf.readUInt32LE(off + 4);
    const data = buf.subarray(off + 8, off + 8 + length);
    if (type === CHUNK.json) json = JSON.parse(data.toString('utf8'));
    else if (type === CHUNK.bin) bin = data;
    off += 8 + length;
  }
  if (!json) throw new Error('a .glb without a JSON chunk');
  const accessor = (i) => {
    const a = json.accessors[i];
    if (a.sparse || a.bufferView === undefined) throw new Error('sparse or empty accessors are not supported');
    const size = TYPES.indexOf(a.type) + 1;
    if (!size) throw new Error(`accessors of ${a.type} are not supported`);
    const view = json.bufferViews[a.bufferView];
    const [bytes, get, largest] = COMPONENTS[a.componentType];
    const stride = view.byteStride || size * bytes;
    const base = (view.byteOffset || 0) + (a.byteOffset || 0);
    const array = a.componentType === UINT32 ? new Uint32Array(a.count * size) : new Float32Array(a.count * size);
    for (let n = 0; n < a.count; n++) {
      for (let k = 0; k < size; k++) {
        const v = get(bin, base + n * stride + k * bytes);
        array[n * size + k] = a.normalized ? Math.max(v / largest, -1) : v;
      }
    }
    return { array, size };
  };
  return { json, accessor };
}

/**
 * The meshes in a .glb read by readGlb: [{ name, extras, material, position, normal, color, colorSize, moss, index }],
 * each node's transform (and its parents') baked into its corners, the material by the name in the node's extras
 * (as writeGlb leaves it) or else its material's (less any ".001" Blender adds); and `extras`: those of the nodes
 * without meshes (the root's), merged. Only triangle lists.
 */
export function meshesOf({ json, accessor }) {
  const meshes = [];
  const extras = {};
  const walk = (i, parent) => {
    const node = json.nodes[i];
    const local = node.matrix
      ? new THREE.Matrix4().fromArray(node.matrix)
      : new THREE.Matrix4().compose(
          new THREE.Vector3(...(node.translation ?? [0, 0, 0])),
          new THREE.Quaternion(...(node.rotation ?? [0, 0, 0, 1])),
          new THREE.Vector3(...(node.scale ?? [1, 1, 1])),
        );
    const world = parent.clone().multiply(local);
    if (node.mesh === undefined) Object.assign(extras, node.extras);
    else {
      const normals = new THREE.Matrix3().getNormalMatrix(world);
      const v = new THREE.Vector3();
      for (const prim of json.meshes[node.mesh].primitives) {
        if ((prim.mode ?? 4) !== 4) throw new Error(`${node.name}: only triangle lists are supported`);
        const attr = (semantic) => (prim.attributes[semantic] === undefined ? null : accessor(prim.attributes[semantic]));
        const position = attr('POSITION').array;
        for (let k = 0; k < position.length; k += 3) v.fromArray(position, k).applyMatrix4(world).toArray(position, k);
        const normal = attr('NORMAL')?.array ?? null;
        if (normal) for (let k = 0; k < normal.length; k += 3) v.fromArray(normal, k).applyMatrix3(normals).normalize().toArray(normal, k);
        const color = attr('COLOR_0');
        const material = prim.material === undefined ? null : json.materials[prim.material].name.replace(/\.\d+$/, '');
        meshes.push({
          name: node.name ?? '',
          extras: node.extras ?? {},
          material: node.extras?.material ?? material,
          position,
          normal,
          color: color?.array ?? null,
          colorSize: color?.size ?? 0,
          moss: attr('_MOSS')?.array ?? null,
          index: prim.indices === undefined ? null : Uint32Array.from(accessor(prim.indices).array),
        });
      }
    }
    for (const c of node.children ?? []) walk(c, world);
  };
  for (const i of json.scenes[json.scene ?? 0].nodes) walk(i, new THREE.Matrix4());
  return { meshes, extras };
}
