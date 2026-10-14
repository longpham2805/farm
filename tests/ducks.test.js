import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { paddle } from '../src/three/animals/duck.js';

test('the ducklings keep near their mother, apart from each other and on the river, each its own way', () => {
  // A stretch of river about as long as the one above the big bridge.
  const way = [[0, 0], [1, 1], [3, 1.5], [4, 3]].map(([x, z]) => new THREE.Vector3(x, 0, z));
  const half = 0.45;
  const { group, update } = paddle(way, half, ['duck', ...Array(5).fill('duckling')]);
  const [mother, ...young] = group.children.filter((c) => c.userData.rig);
  // How far a point is from the middle of the way, across the water (not counting how it bobs).
  const off = ({ x, z }) => {
    const p = new THREE.Vector3(x, 0, z);
    return Math.min(...way.slice(1).map((b, i) => new THREE.Line3(way[i], b).closestPointToPoint(p, true, new THREE.Vector3()).distanceTo(p)));
  };
  let farthest = 0;
  let closest = Infinity;
  let outside = 0;
  let travelled = 0;
  // How far each duckling's way strays from its mother's: they should not trace it exactly.
  let strayed = 0;
  const dt = 1 / 30;
  for (let t = 0; t < 10 * 60; t += dt) {
    const before = mother.position.clone();
    update(t, dt);
    travelled += mother.position.distanceTo(before);
    for (const d of young) {
      farthest = Math.max(farthest, d.position.distanceTo(mother.position));
      for (const o of young) if (o !== d) closest = Math.min(closest, d.position.distanceTo(o.position));
      if (off(d.position) > half + 1e-6) outside++;
      strayed += Math.abs(Math.sin(d.rotation.y - mother.rotation.y)) * dt;
    }
  }
  assert.ok(travelled > 3, `the mother hardly swam: ${travelled.toFixed(1)}`);
  assert.ok(farthest < 1.0, `a duckling strayed ${farthest.toFixed(2)} from her`);
  assert.ok(closest > 0.03, `two ducklings came ${closest.toFixed(3)} apart`);
  assert.equal(outside, 0, `ducklings left the river ${outside} times`);
  assert.ok(strayed > 5, 'the ducklings all face just as she does, as if towed');
});
