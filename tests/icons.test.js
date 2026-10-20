import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CROPS } from '../src/data/crops.js';
import { cropIconSvg, ICON_CROPS } from '../src/ui/cropIcons.js';

test('every crop has a drawn picture for the menus, and every picture is of a crop', () => {
  for (const c of CROPS) {
    const svg = cropIconSvg(c.id);
    assert.ok(svg, `${c.id} has no picture`);
    assert.doesNotMatch(svg, /NaN|undefined|null/, `${c.id}'s picture has a broken number`);
  }
  const ids = new Set(CROPS.map((c) => c.id));
  assert.deepEqual(ICON_CROPS.filter((id) => !ids.has(id)), []);
});
