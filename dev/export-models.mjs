// Writes every placed plant model out as a .glb to open in Blender: each TREES and FLOWERS entry's model by its key
// (placedModels in src/three/plants/valley.js) at the entry's height, and each of the woods' models
// (`woods-<kind>-<n>`) at the height it is built at; as the generators build them, not as edited by hand. A model
// edited and saved to art/models/edited/<key>.glb comes back into the game through dev/edited-models.mjs.
// Usage: node dev/export-models.mjs [--out <dir>] [key ...]     (every model to art/models/export/ when none given)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { KINDS, placedModels } from '../src/three/plants/valley.js';
import { MODELS } from '../src/three/plants/woods.js';
import { writeGlb } from './glb.mjs';

const args = process.argv.slice(2);
const at = args.indexOf('--out');
const out = at >= 0 ? args.splice(at, 2)[1] : path.join(path.dirname(fileURLToPath(import.meta.url)), '../art/models/export');
const wanted = new Set(args);

const models = placedModels().map(({ key, kind, seed, height, more }) => ({ key, kind, seed, height, build: () => KINDS[kind](seed, height, more) }));
for (const [kind, { make, seeds, height }] of Object.entries(MODELS)) {
  for (let k = 1; k <= seeds; k++) models.push({ key: `woods-${kind}-${k}`, kind, seed: k, height, build: () => make(k, height) });
}
for (const key of wanted) if (!models.some((m) => m.key === key)) console.warn(`no model is called ${key}`);

fs.mkdirSync(out, { recursive: true });
let n = 0;
let bytes = 0;
for (const { key, kind, seed, height, build } of models) {
  if (wanted.size && !wanted.has(key)) continue;
  const model = build();
  model.name = key;
  const glb = writeGlb(model, { key, kind, seed, height });
  fs.writeFileSync(path.join(out, `${key}.glb`), glb);
  n++;
  bytes += glb.length;
}
console.log(`${n} models, ${(bytes / 1048576).toFixed(1)} MB, in ${path.relative(process.cwd(), out) || '.'}`);
