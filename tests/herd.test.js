import { test } from 'node:test';
import assert from 'node:assert/strict';
import { herd, gap } from '../src/three/animals/herd.js';
import { buffalo } from '../src/three/animals/buffalo.js';
import { cow, COWS } from '../src/three/animals/cow.js';
import { sheep } from '../src/three/animals/sheep.js';
import { pig } from '../src/three/animals/pig.js';
import { inside } from '../src/three/animals/area.js';
import { PLACES } from '../src/three/valleyMap.js';

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

test('the cows and the sheep wander about the meadow without ever walking into each other', () => {
  // A patch about the size of the meadow.
  const area = [{ x: 0, z: 0 }, { x: 5, z: 0 }, { x: 5.5, z: 3 }, { x: 3, z: 4.5 }, { x: 0, z: 4 }];
  for (let run = 0; run < 3; run++) {
    const { group, update } = herd(area, [
      { name: 'holstein', x: 1.5, z: 1.2, heading: 1.3 },
      { name: 'holstein', x: 2.0, z: 3.0, heading: 1.3 },
      { name: 'ewe', x: 3.6, z: 3.4, heading: 2.0 },
      { name: 'ewe', x: 0.7, z: 3.2, heading: 1.0 },
    ], (name, phase) => (name in COWS ? cow : sheep)(name, phase));
    const animals = group.children;
    const pose = (a) => [a.position.x, a.position.z, a.rotation.y, a.userData.size, a.userData.body];
    const walked = animals.map(() => 0);
    let nearest = Infinity;
    const dt = 1 / 30;
    for (let t = 0; t < 30 * 60; t += dt) {
      const before = animals.map((a) => a.position.clone());
      update(t, dt);
      animals.forEach((a, k) => (walked[k] += a.position.distanceTo(before[k])));
      for (const a of animals) for (const b of animals) if (a !== b) nearest = Math.min(nearest, gap(pose(a), pose(b)));
    }
    assert.ok(nearest > 0, `they came ${nearest.toFixed(3)} into each other`);
    assert.ok(walked.every((w) => w > 2), `some hardly moved: ${walked.map((w) => w.toFixed(1))}`);
  }
});

test('the pig roots about behind the plots without ever stepping out of its patch', () => {
  // Its patch has the plots' back corner cut out of it, so a straight walk across could cross the plots.
  const area = PLACES.pig.area.map(([u, b]) => ({ x: u, z: b }));
  for (let run = 0; run < 3; run++) {
    const { group, update } = herd(area, [{ name: 'pig', x: PLACES.pig.at[0], z: PLACES.pig.at[1], heading: 1.4 }], pig);
    const [p] = group.children;
    let walked = 0;
    let outside = 0;
    const dt = 1 / 30;
    for (let t = 0; t < 30 * 60; t += dt) {
      const before = p.position.clone();
      update(t, dt);
      walked += p.position.distanceTo(before);
      if (!inside(area, p.position.x, p.position.z)) outside++;
    }
    assert.equal(outside, 0, `it was outside its patch ${outside} times`);
    assert.ok(walked > 3, `it hardly moved: ${walked.toFixed(1)}`);
  }
});
