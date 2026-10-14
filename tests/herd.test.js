import { test } from 'node:test';
import assert from 'node:assert/strict';
import { herd, gap } from '../src/three/animals/herd.js';
import { buffalo } from '../src/three/animals/buffalo.js';
import { cow } from '../src/three/animals/cow.js';

test('the buffalo and her calf wander about without ever walking into each other', () => {
  // A patch of grass about the size of the one by the river.
  const area = [{ x: 0, z: 0 }, { x: 4, z: 0 }, { x: 4.5, z: 2 }, { x: 3, z: 3.5 }, { x: 0.5, z: 3 }];
  for (let run = 0; run < 3; run++) {
    const { group, update } = herd(area, [
      { name: 'buffalo', x: 2, z: 1.5, heading: -1.5 },
      { name: 'calf', x: 2.6, z: 2.4, heading: -1.4 },
    ], buffalo);
    const [mother, calf] = group.children;
    const pose = (a) => [a.position.x, a.position.z, a.rotation.y, a.userData.size, a.userData.body];
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

test('the cows wander about the meadow without ever walking into each other', () => {
  // A patch about the size of the meadow.
  const area = [{ x: 0, z: 0 }, { x: 5, z: 0 }, { x: 5.5, z: 3 }, { x: 3, z: 4.5 }, { x: 0, z: 4 }];
  for (let run = 0; run < 3; run++) {
    const { group, update } = herd(area, [
      { name: 'holstein', x: 1.5, z: 1.2, heading: 1.3 },
      { name: 'holstein', x: 2.0, z: 3.0, heading: 1.3 },
    ], cow);
    const cows = group.children;
    const pose = (a) => [a.position.x, a.position.z, a.rotation.y, a.userData.size, a.userData.body];
    const walked = [0, 0];
    let nearest = Infinity;
    const dt = 1 / 30;
    for (let t = 0; t < 30 * 60; t += dt) {
      const before = cows.map((a) => a.position.clone());
      update(t, dt);
      cows.forEach((a, k) => (walked[k] += a.position.distanceTo(before[k])));
      nearest = Math.min(nearest, gap(pose(cows[0]), pose(cows[1])));
    }
    assert.ok(nearest > 0, `they came ${nearest.toFixed(3)} into each other`);
    assert.ok(walked[0] > 3 && walked[1] > 3, `they hardly moved: ${walked.map((w) => w.toFixed(1))}`);
  }
});
