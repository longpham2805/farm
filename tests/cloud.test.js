import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newCode, parseCode, showCode, farmHash, progress, exportSave, importSave } from '../src/game/cloud.js';
import { newGame } from '../src/game/logic.js';

test('family codes are 12 easy-to-read characters and survive messy typing', () => {
  for (let i = 0; i < 50; i++) {
    const code = newCode();
    assert.match(code, /^[2-9A-HJ-NP-Z]{12}$/);
    assert.equal(parseCode(showCode(code).toLowerCase().replace(/-/g, ' ')), code);
  }
  assert.equal(parseCode('K7PM-3QXD-9HW'), null, 'too short');
  assert.equal(parseCode('K7PM-3QXD-9HWO'), null, 'O is not used');
});

test('the farm fingerprint ignores last-seen time and graphics, not play', () => {
  const s = newGame(1000);
  const h = farmHash(s);
  assert.equal(farmHash({ ...s, lastSeen: 99999, settings: { ...s.settings, quality: 'low' } }), h);
  assert.notEqual(farmHash({ ...s, coins: s.coins + 1 }), h);
});

test('progress grows with level and with every counted action', () => {
  const s = newGame(1000);
  const p = progress(s);
  assert.ok(progress({ ...s, stats: { planted: 3 } }) > p);
  assert.ok(progress({ ...s, level: 2 }) > progress({ ...s, stats: { planted: 5000 } }));
});

test('a save code gives back the same farm', async () => {
  const s = newGame(1000);
  s.coins = 4321;
  s.profile.name = 'Tý';
  const code = await exportSave(s);
  assert.match(code, /^NT[01]\.[A-Za-z0-9_-]+$/);
  assert.deepEqual(await importSave(` ${code.slice(0, 20)}\n${code.slice(20)} `), s);
  await assert.rejects(importSave('hello'));
  await assert.rejects(importSave('NT0.aGVsbG8'));
});
