import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STRINGS } from '../src/i18n.js';
import { CROPS, PACKS } from '../src/data/crops.js';
import { CHAPTERS, DAILY } from '../src/data/quests.js';
import { STYLES } from '../src/data/styles.js';

test('every text has Vietnamese and English', () => {
  for (const [key, entry] of Object.entries(STRINGS)) {
    assert.ok(entry.vi && entry.en, `missing language in "${key}"`);
    const params = (s) => (s.match(/\{\w+\}/g) || []).sort().join();
    assert.equal(params(entry.vi), params(entry.en), `placeholders differ in "${key}"`);
  }
  for (const def of [...CROPS, ...PACKS, ...Object.values(STYLES), ...CHAPTERS.map((c) => ({ name: c.title }))]) {
    assert.ok(def.name.vi && def.name.en, JSON.stringify(def.name));
  }
});

test('every quest kind has a description', () => {
  for (const task of [...CHAPTERS.flatMap((c) => c.tasks), ...DAILY]) {
    assert.ok(STRINGS[`q_${task.kind}`], `no text for quest kind "${task.kind}"`);
  }
});
