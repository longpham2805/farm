import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { CROPS } from '../src/data/crops.js';
import { NPCS } from '../src/data/npcs.js';
import { NUTRIENTS } from '../src/data/nutrition.js';
import { newGame } from '../src/game/logic.js';
import { cropIconSvg, ICON_CROPS } from '../src/ui/cropIcons.js';
import { iconSvg, chestSvg, ICON_NAMES } from '../src/ui/icons.js';
import { avatarSvg, PLAYER_AVATARS } from '../src/ui/avatars.js';

const broken = /NaN|undefined|null/;

test('every crop has a drawn picture for the menus, and every picture is of a crop', () => {
  for (const c of CROPS) {
    const svg = cropIconSvg(c.id);
    assert.ok(svg, `${c.id} has no picture`);
    assert.doesNotMatch(svg, broken, `${c.id}'s picture has a broken number`);
  }
  const ids = new Set(CROPS.map((c) => c.id));
  assert.deepEqual(ICON_CROPS.filter((id) => !ids.has(id)), []);
});

test('every icon the interface asks for is drawn', () => {
  for (const name of ICON_NAMES) assert.doesNotMatch(iconSvg(name), broken, `${name} has a broken number`);
  for (const tier of ['green', 'blue', 'purple', 'red']) assert.doesNotMatch(chestSvg(tier), broken, tier);
  // icon('name'), icon(x ? 'a' : 'b') and icon = 'name' (the plot bubbles) in the interface's code, and the nutrients' icons.
  const asked = new Set(Object.values(NUTRIENTS).map((n) => n.icon).filter((n) => n && n !== 'avocado'));
  for (const dir of ['src/ui', 'src']) {
    for (const file of readdirSync(dir).filter((f) => f.endsWith('.js'))) {
      const code = readFileSync(`${dir}/${file}`, 'utf8');
      for (const m of code.matchAll(/\b(?:icon|drawIcon)\(([^()]*?)[,)]/g)) {
        for (const q of m[1].matchAll(/'([a-z]+)'/gi)) asked.add(q[1]);
      }
      for (const m of code.matchAll(/\bicon = '([a-z]+)'/gi)) asked.add(m[1]);
    }
  }
  const missing = [...asked].filter((name) => !ICON_NAMES.includes(name));
  assert.deepEqual(missing, [], `icons used but not drawn: ${missing.join(', ')}`);
  assert.ok(asked.size > 30, `found only ${asked.size} icon names; did the pattern above stop matching?`);
});

test('every avatar a farm can have is drawn', () => {
  for (const emoji of [...PLAYER_AVATARS, ...NPCS.map((n) => n.avatar), newGame(0).profile.avatar]) {
    const svg = avatarSvg(emoji);
    assert.ok(svg, `${emoji} has no drawing`);
    assert.doesNotMatch(svg, broken, `${emoji}'s drawing has a broken number`);
  }
});
