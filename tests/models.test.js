// The way out to Blender and back (dev/export-models.mjs, dev/edited-models.mjs, plants/edited.js): every placed
// model has its own key and materials that come back by name, and a model baked from its .glb is the model.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { KINDS, placedModels } from '../src/three/plants/valley.js';
import { MODELS } from '../src/three/plants/woods.js';
import { MATERIAL, SOFT_MATERIAL, materialNamed } from '../src/three/plants/parts.js';
import { fromData } from '../src/three/plants/edited.js';
import { writeGlb } from '../dev/glb.mjs';
import { bake } from '../dev/edited-models.mjs';

const meshesOf = (model) => {
  const list = [];
  model.updateMatrixWorld(true);
  model.traverse((o) => o.isMesh && list.push(o));
  return list;
};

test('every placed model has a key of its own', () => {
  const keys = placedModels().map((m) => m.key);
  assert.equal(new Set(keys).size, keys.length);
  assert.ok(keys.every((k) => /^[a-zA-Z]+-\d+(-\d+)?$/.test(k)), keys.join(' '));
  assert.ok(keys.includes('bed-2') && keys.includes('bed-2-2'));
});

test('every material a placed model uses comes back by its name', () => {
  const models = placedModels().map(({ kind, seed, height, more }) => KINDS[kind](seed, height, more));
  for (const { make, seeds, height } of Object.values(MODELS)) for (let k = 1; k <= seeds; k++) models.push(make(k, height));
  const names = new Set();
  for (const mesh of models.flatMap(meshesOf)) {
    const m = mesh.material;
    assert.ok(m.name, `${mesh.name || 'a mesh'} has an unnamed ${m.type}`);
    names.add(m.name);
    const back = materialNamed(m.name);
    assert.equal(back.type, m.type, m.name);
    assert.equal(back.side, m.side, m.name);
    assert.equal(back.roughness, m.roughness, m.name);
    assert.equal(back.customProgramCacheKey(), m.customProgramCacheKey(), m.name);
    assert.equal(back.onBeforeCompile.toString(), m.onBeforeCompile.toString(), m.name);
  }
  assert.equal(materialNamed('flat'), MATERIAL);
  assert.equal(materialNamed('soft'), SOFT_MATERIAL);
  assert.ok(names.size >= 6, [...names].join(', '));
});

test('a model baked from its .glb is the model, at any height', () => {
  const srgb8 = (c) => Math.round((c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055) * 255);
  // A rock (moss, a shadow with alpha, small plants), a flower row (merged parts) and a birch (soft normals, glow).
  for (const [kind, seed, height, more] of [['rock', 3, 0.5, { plants: 2 }], ['pinks', 1, 0.3, { length: 2 }], ['birch', 1, 2.4, {}]]) {
    const original = KINDS[kind](seed, height, more);
    const data = bake(writeGlb(original, { height }), 1);
    assert.equal(data.height, height);
    const copy = fromData(data, height * 2);
    const parts = meshesOf(original);
    assert.equal(copy.children.length, parts.length, kind);
    parts.forEach((o, i) => {
      const c = copy.children[i];
      assert.equal(c.material, materialNamed(o.material.name), `${kind} ${i}`);
      assert.equal(c.castShadow, o.castShadow);
      assert.equal(c.receiveShadow, o.receiveShadow);
      const g = o.geometry.clone().applyMatrix4(o.matrixWorld);
      // Each attribute the original has, the copy has within the tolerance (and none it has not).
      const near = (name, tolerance, as = (v) => v) => {
        const want = g.attributes[name];
        const got = c.geometry.attributes[name];
        if (!want) return assert.equal(got, undefined, `${kind} ${i} ${name}`);
        assert.equal(got.itemSize, want.itemSize, `${kind} ${i} ${name}`);
        assert.equal(got.count, want.count, `${kind} ${i} ${name}`);
        for (let k = 0; k < want.array.length; k++) assert.ok(Math.abs(as(got.array[k], k) - as(want.array[k], k)) <= tolerance, `${kind} ${i} ${name}[${k}]: ${got.array[k]} for ${want.array[k]}`);
      };
      assert.equal(c.geometry.attributes.position.count, g.attributes.position.count);
      g.attributes.position.array.forEach((v, k) => assert.ok(Math.abs(c.geometry.attributes.position.array[k] - v * 2) <= 0.0011, `${kind} ${i} position[${k}]`));
      near('normal', 0.0006);
      const alpha = (k) => g.attributes.color?.itemSize === 4 && k % 4 === 3;
      near('color', 1, (v, k) => (alpha(k) ? Math.round(v * 255) : srgb8(v)));
      near('moss', 0.0006);
      if (g.index) assert.deepEqual(Array.from(c.geometry.index.array), Array.from(g.index.array));
      else assert.equal(c.geometry.index, null);
    });
  }
});
