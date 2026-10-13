import { test } from 'node:test';
import assert from 'node:assert/strict';
import { herd, gap } from '../src/three/animals/buffalo.js';

test('the buffalo and her calf wander about without ever walking into each other', () => {
  // A patch of grass about the size of the one by the river.
  const area = [{ x: 0, z: 0 }, { x: 4, z: 0 }, { x: 4.5, z: 2 }, { x: 3, z: 3.5 }, { x: 0.5, z: 3 }];
  for (let run = 0; run < 3; run++) {
    const { group, update } = herd(area, [
      { name: 'buffalo', x: 2, z: 1.5, heading: -1.5 },
      { name: 'calf', x: 2.6, z: 2.4, heading: -1.4 },
    ]);
    const [mother, calf] = group.children;
    const pose = (a) => [a.position.x, a.position.z, a.rotation.y, a.scale.x];
    const walked = [0, 0];
    let nearest = Infinity;
    const dt = 1 / 30;
    for (let t = 0; t < 30 * 60; t += dt) {
      const before = [mother, calf].map((a) => a.position.clone());
      update(t, dt);
      [mother, calf].forEach((a, k) => (walked[k] += a.position.distanceTo(before[k])));
      nearest = Math.min(nearest, gap(pose(mother), pose(calf)));
    }
    assert.ok(nearest > 0, `they came ${nearest.toFixed(3)} into each other`);
    assert.ok(walked[0] > 3 && walked[1] > 3, `they hardly moved: ${walked.map((w) => w.toFixed(1))}`);
  }
});
