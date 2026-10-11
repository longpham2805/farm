// Turns models from Cenji's LowPoly Nature Forest Mega Pack (.glb files whose materials are plain colours)
// into src/three/natureModels.js, which the game builds its grass, flowers, rocks, logs and fences from.
// Usage: node dev/nature-models.cjs <folder with the .glb files> [all]
// Converts the models in MODELS below; "all" converts every model in the folder, to compare them in dev/nature.html.
const fs = require('node:fs');
const path = require('node:path');

const MODELS = [
  // Grass, flowers and plants
  'PLANT_01_GrassShort', 'PLANT_02_GrassMedium', 'PLANT_03_GrassTall', 'PLANT_04_GrassSparse',
  'FLOWER_01_WhiteCluster', 'FLOWER_02_YellowCluster', 'FLOWER_04_BlueBells', 'FLOWER_05_RedWildflower',
  'PLANT_09_WoodlandPlant', 'PLANT_10_BroadleafPlant',
  // Stumps, logs and mushrooms
  'TREE_14_Stump', 'TREE_15_StumpBroken', 'TREE_16_FallenLog', 'TREE_18_HollowLog', 'DETAIL_02_FallenBranch',
  'MUSH_01_RedSmall', 'MUSH_02_BrownSmall', 'MUSH_03_White',
  // Stones
  'ROCK_01_Small', 'ROCK_02_Medium', 'ROCK_07_ClusterSmall', 'ROCK_14_SteppingStone',
  'ROCK_03_BoulderLarge', 'ROCK_05_BoulderFlat', 'ROCK_06_BoulderMossy',
  // Fences and other things people made, and the buffalo's mud
  'PROP_05_FenceStraight', 'PROP_07_FenceBroken', 'PROP_10_WoodenBench', 'PROP_04_DirectionSign',
  'GROUND_02_MudPatch',
];

const OUT = path.join(__dirname, '../src/three/natureModels.js');

/** The JSON and binary chunks of a .glb file. */
function readGlb(file) {
  const buf = fs.readFileSync(file);
  if (buf.readUInt32LE(0) !== 0x46546c67) throw new Error(`${file} is not a .glb file`);
  let json = null;
  let bin = null;
  for (let off = 12; off < buf.length;) {
    const length = buf.readUInt32LE(off);
    const type = buf.readUInt32LE(off + 4);
    const data = buf.subarray(off + 8, off + 8 + length);
    if (type === 0x4e4f534a) json = JSON.parse(data.toString('utf8'));
    else if (type === 0x004e4942) bin = data;
    off += 8 + length;
  }
  return { json, bin };
}

/** An accessor's values as a flat array of numbers. */
function read({ json, bin }, index) {
  const a = json.accessors[index];
  const view = json.bufferViews[a.bufferView];
  const size = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[a.type];
  const [bytes, get] = {
    5121: [1, (o) => bin.readUInt8(o)],
    5123: [2, (o) => bin.readUInt16LE(o)],
    5125: [4, (o) => bin.readUInt32LE(o)],
    5126: [4, (o) => bin.readFloatLE(o)],
  }[a.componentType];
  const stride = view.byteStride || size * bytes;
  const base = (view.byteOffset || 0) + (a.byteOffset || 0);
  const out = [];
  for (let i = 0; i < a.count; i++) {
    for (let k = 0; k < size; k++) out.push(get(base + i * stride + k * bytes));
  }
  return out;
}

/** "CENJI | Bark.001" → "Bark" */
const materialName = (m) => m.name.replace(/^.*\|\s*/, '').replace(/\.\d+$/, '');

const hex = (factor) => '#' + factor.slice(0, 3).map((c) => {
  const s = c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055;
  return Math.round(s * 255).toString(16).padStart(2, '0');
}).join('');

// The flower heads are finely made; corners within this many mm of each other merge, which keeps their look at
// the game's size with a fraction of the triangles.
const SIMPLER = { FLOWER_01_WhiteCluster: 30, FLOWER_02_YellowCluster: 30, FLOWER_04_BlueBells: 30, FLOWER_05_RedWildflower: 30 };
const HEADS = new Set(['White', 'Yellow', 'Red', 'Purple', 'Blue']);

/**
 * One model: m = the names of its colours, v = corner positions in mm (y up), t = triangles as corner indices,
 * c = [colour, triangle count] runs over the triangles in order, the colour as an index into m.
 */
function convert(file, packColors, cell) {
  const glb = readGlb(file);
  const { json } = glb;
  const m = [];
  const tris = [];
  for (const node of json.nodes) {
    if (node.mesh === undefined) continue;
    if (node.matrix || node.translation || node.rotation || node.scale || node.children) {
      throw new Error(`${file}: moved or nested nodes are not supported`);
    }
    for (const prim of json.meshes[node.mesh].primitives) {
      if ((prim.mode ?? 4) !== 4) throw new Error(`${file}: only triangle lists are supported`);
      const material = json.materials[prim.material];
      const name = materialName(material);
      packColors[name] ||= hex(material.pbrMetallicRoughness.baseColorFactor);
      if (!m.includes(name)) m.push(name);
      const pos = read(glb, prim.attributes.POSITION);
      const index = prim.indices === undefined ? pos.map((_, i) => i).filter((i) => i < pos.length / 3) : read(glb, prim.indices);
      const mm = (i) => [0, 1, 2].map((k) => Math.round(pos[i * 3 + k] * 1000) || 0);
      for (let i = 0; i < index.length; i += 3) {
        tris.push({ colour: m.indexOf(name), head: HEADS.has(name), p: [mm(index[i]), mm(index[i + 1]), mm(index[i + 2])] });
      }
    }
  }
  if (cell) {
    // Each flower-head corner moves to the average of the corners in its cell.
    const key = (p) => p.map((n) => Math.floor(n / cell)).join(',');
    const sums = new Map();
    for (const tri of tris.filter((t) => t.head)) {
      for (const p of tri.p) {
        const s = sums.get(key(p)) || [0, 0, 0, 0];
        sums.set(key(p), [s[0] + p[0], s[1] + p[1], s[2] + p[2], s[3] + 1]);
      }
    }
    for (const tri of tris.filter((t) => t.head)) {
      tri.p = tri.p.map((p) => {
        const s = sums.get(key(p));
        return [0, 1, 2].map((k) => Math.round(s[k] / s[3]));
      });
    }
  }
  const v = [];
  const t = [];
  const c = [];
  const corners = new Map();
  const corner = (p) => {
    const k = p.join(',');
    if (!corners.has(k)) {
      corners.set(k, v.length / 3);
      v.push(...p);
    }
    return corners.get(k);
  };
  const seen = new Set();
  for (const { colour, p } of tris) {
    const tri = p.map(corner);
    if (new Set(tri).size < 3) continue;
    // Merged corners can leave the same triangle twice.
    const k = `${colour}:${tri.join(',')}`;
    if (seen.has(k)) continue;
    seen.add(k);
    t.push(...tri);
    if (c.length && c[c.length - 2] === colour) c[c.length - 1]++;
    else c.push(colour, 1);
  }
  return { m, v, t, c };
}

const [dir, which] = process.argv.slice(2);
if (!dir) {
  console.error('Usage: node dev/nature-models.cjs <folder with the .glb files> [all]');
  process.exit(1);
}
const names = which === 'all'
  ? fs.readdirSync(dir).filter((f) => f.endsWith('.glb')).map((f) => f.replace(/\.glb$/, '')).sort()
  : MODELS;
const packColors = {};
const lines = names.map((name) => {
  const { m, v, t, c } = convert(path.join(dir, `${name}.glb`), packColors, SIMPLER[name]);
  console.log(`${name}: ${t.length / 3} triangles, ${v.length / 3} corners`);
  return `  ${name}: {\n    m: ${JSON.stringify(m).replace(/,/g, ', ')},\n    v: [${v.join(',')}],\n    t: [${t.join(',')}],\n    c: [${c.join(',')}],\n  },`;
});
fs.writeFileSync(OUT, `// Generated by dev/nature-models.cjs from Cenji's LowPoly Nature Forest Mega Pack; do not edit by hand.
// Per model: m = its colours by name (see PALETTE in nature.js), v = corner positions in mm (y up),
// t = triangles as corner indices, and c = [colour, triangle count] runs over the triangles in order.
export const NATURE_MODELS = {
${lines.join('\n')}
};
`);
console.log(`Wrote ${path.relative(process.cwd(), OUT)} (${(fs.statSync(OUT).size / 1024).toFixed(1)} KB)`);
console.log('Pack colours:', JSON.stringify(packColors));
