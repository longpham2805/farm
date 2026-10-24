import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../src/game/logic.js';
import { setRng, seeded } from '../src/util.js';
import { CROPS, PACKS, TOTAL_VARIETIES } from '../src/data/crops.js';
import { MILESTONES, LEVEL_XP, LEVEL_COST, MAX_LEVEL, LEVEL_MATERIALS } from '../src/config.js';
import { NUTRIENTS, CROP_NUTRITION } from '../src/data/nutrition.js';
import { CHAPTERS } from '../src/data/quests.js';
import { variantLooks } from '../src/data/styles.js';
import { hasBuilder } from '../src/three/models.js';

const T0 = new Date(2026, 9, 10, 9, 0, 0).getTime();

function fresh() {
  setRng(seeded(42));
  return G.newGame(T0);
}

test('data tables are consistent', () => {
  assert.equal(LEVEL_XP.length, MAX_LEVEL - 1);
  assert.equal(LEVEL_COST.length, MAX_LEVEL - 1);
  assert.ok(MILESTONES.at(-2).n < TOTAL_VARIETIES);
  assert.equal(new Set(CROPS.map((c) => c.id)).size, CROPS.length);
  for (const c of CROPS) {
    const looks = variantLooks(c);
    assert.equal(looks.length, c.variants, c.id);
    assert.equal(new Set(looks.slice(1).map((l) => l.style)).size, c.variants - 1, `${c.id} has duplicate looks`);
  }
  for (const p of PACKS) assert.ok(G.CROPS.filter(p.pool).length > 0, p.id);
  const sets = CHAPTERS.at(-1).tasks.find((t) => t.kind === 'sets');
  assert.equal(sets.n, CROPS.length);
  for (const c of CROPS) {
    assert.ok(hasBuilder(c.id), `no 3D model for ${c.id}`);
    const info = CROP_NUTRITION[c.id];
    assert.ok(info && info.fact.vi && info.fact.en, `no nutrition for ${c.id}`);
    for (const n of info.n) assert.ok(NUTRIENTS[n], `${c.id}: unknown nutrient ${n}`);
  }
  for (const [level, m] of Object.entries(LEVEL_MATERIALS)) {
    assert.ok(G.CROP_BY_ID[m.crop], m.crop);
    assert.ok(G.CROP_BY_ID[m.crop].unlock < Number(level), `level ${level} needs ${m.crop} before it can be grown`);
  }
  for (const c of CROPS) assert.ok(c.unlock <= MAX_LEVEL, `${c.id} opens above the top level`);
  for (let level = 31; level <= MAX_LEVEL; level++) assert.ok(G.unlocksAt(level).seeds.length > 0, `level ${level} opens nothing`);
});

test('old saves keep their crops after the seed list changed', () => {
  const old = {
    level: 4,
    seeds: { wheat: 5, fox: 2, rice: 1, pack1: 1, nonsense: 3 },
    items: { 'wheat:0': 7, 'wheat:2': 1, 'candy:7': 2, 'purpleRadish:4': 1 },
    discovered: { 'wheat:0': 5, 'rice:0': 3, 'gentian:4': 9, 'lotus:1': 1 },
    plots: [{ crop: 'dahlia', plantedAt: 1, growMs: 5, waters: 0, variant: 4 }, ...Array(15).fill(null)],
    claimedSets: { wheat: true, fox: true },
    npcs: { meo: { plots: [{ crop: 'candy' }] } },
  };
  const s = G.hydrate(old, T0);
  assert.deepEqual(s.seeds, { rice: 6, papaya: 2, pack1: 1 });
  assert.deepEqual(s.items, { 'rice:0': 7, 'rice:2': 1, 'lychee:2': 2, 'beet:4': 1 });
  assert.deepEqual(s.discovered, { 'rice:0': 3, 'durian:4': 9, 'mangosteen:1': 1 });
  assert.equal(s.plots[0].crop, 'avocado');
  assert.equal(s.plots[0].variant, 2);
  assert.deepEqual(s.claimedSets, { rice: true });
  assert.deepEqual(s.npcs, {});
  assert.equal(s.v, 2);
});

test('plant, water, ripen, harvest', () => {
  const s = fresh();
  assert.equal(G.plotCount(1), 6);
  assert.deepEqual(G.plant(s, 0, 'rice', T0), { ok: false, err: 'locked' });
  assert.ok(G.plant(s, 5, 'rice', T0).ok);
  assert.equal(s.seeds.rice, 5);
  assert.deepEqual(G.plant(s, 5, 'rice', T0), { ok: false, err: 'occupied' });

  const plot = s.plots[5];
  assert.equal(plot.growMs, 8400); // 12 s, cut by 30%
  assert.equal(G.plotInfo(plot, T0).stage, 0);
  assert.equal(G.water(s, 5, T0).ok, false); // not thirsty yet
  assert.equal(G.plotInfo(plot, T0 + 6000).thirsty, true);
  assert.ok(G.water(s, 5, T0 + 6000).ok);
  assert.equal(G.plotInfo(plot, T0 + 6000).thirsty, false);

  assert.equal(G.harvest(s, 5, T0 + 8000).ok, false);
  const r = G.harvest(s, 5, T0 + 12000);
  assert.ok(r.ok);
  assert.equal(r.count, 4); // 3 + 1 watering
  assert.equal(s.plots[5], null);
  assert.equal(s.stats.harvested, 4);
  assert.ok(r.newDiscovery);
  assert.equal(G.discoveredCount(s), 1);
});

test('radish seeds never run out', () => {
  const s = fresh();
  for (const i of [1, 2, 5, 6, 9, 10]) assert.ok(G.plant(s, i, 'radish', T0).ok);
  assert.equal(G.seedCount(s, 'radish'), Infinity);
});

test('mystery pack picks a crop from its pool', () => {
  const s = fresh();
  s.seeds.pack1 = 1;
  assert.ok(G.plant(s, 5, 'pack1', T0).ok);
  const plot = s.plots[5];
  assert.equal(plot.pack, 'pack1');
  assert.ok(PACKS[0].pool(G.CROP_BY_ID[plot.crop]));
  assert.equal(s.seeds.pack1, undefined);
});

test('buy, sell and sell all keep upgrade materials', () => {
  const s = fresh();
  assert.equal(G.buySeed(s, 'carrot', 1).err, 'locked');
  assert.equal(G.buySeed(s, 'rice', 100).err, 'noCoins');
  assert.ok(G.buySeed(s, 'rice', 2).ok);
  assert.equal(s.coins, 500 - 166);

  s.level = 3; // level 3 → 4 needs 6 tomatoes
  s.items = { 'tomato:0': 4, 'tomato:1': 3, 'rice:0': 10 };
  assert.deepEqual(G.reservedItems(s), { 'tomato:0': 4, 'tomato:1': 2 });
  const preview = G.sellAllPreview(s);
  const r = G.sellAll(s);
  assert.equal(r.coins, preview.coins);
  assert.deepEqual(s.items, { 'tomato:0': 4, 'tomato:1': 2 });
  assert.equal(r.qty, 11);
});

test('upgrade needs xp, coins and materials', () => {
  const s = fresh();
  assert.equal(G.upgrade(s).ok, false);
  s.xp = 25;
  const r = G.upgrade(s);
  assert.ok(r.ok);
  assert.equal(s.level, 2);
  assert.equal(s.xp, 11);
  assert.equal(s.coins, 450);
  assert.deepEqual(r.unlocks.seeds.sort(), ['banana', 'carrot', 'tomato']);
  assert.equal(r.unlocks.plots, 2);

  s.level = 3;
  s.xp = 1000;
  s.coins = 1000;
  assert.equal(G.upgradeCheck(s).matOk, false);
  s.items['tomato:1'] = 2;
  s.items['tomato:0'] = 5;
  assert.ok(G.upgrade(s).ok);
  assert.deepEqual(s.items, { 'tomato:1': 1 }); // plain ones used first
});

test('energy turns into chests and chests open', () => {
  const s = fresh();
  const earned = G.addEnergy(s, 250);
  assert.equal(earned.length, 2);
  assert.equal(Object.values(s.chests).reduce((a, b) => a + b, 0), 2);
  for (const tier of ['green', 'blue', 'purple', 'red']) {
    s.chests[tier] = 5;
    const { rewards } = G.openChests(s, tier);
    assert.equal(rewards.length, 5);
    assert.equal(s.chests[tier], 0);
    for (const r of rewards) assert.ok(r.coins || r.seeds, `${tier} reward is empty`);
  }
  assert.equal(s.stats.chestsOpened, 20);
});

test('quests progress and chapters advance', () => {
  const s = fresh();
  assert.equal(G.claimTask(s, 'c1a').ok, false);
  s.stats.planted = 3;
  const r = G.claimTask(s, 'c1a');
  assert.ok(r.ok);
  assert.equal(s.coins, 550);
  assert.equal(G.claimTask(s, 'c1a').ok, false);
  s.stats.watered = 2;
  s.stats.harvested = 6;
  s.stats.sold = 5;
  s.level = 2;
  for (const id of ['c1b', 'c1c', 'c1d']) assert.ok(G.claimTask(s, id).ok);
  const last = G.claimTask(s, 'c1e');
  assert.ok(last.chapterDone);
  assert.equal(s.quests.chapter, 1);
});

test('daily quests reset on a new day', () => {
  const s = fresh();
  assert.ok(G.claimDaily(s, 'd_login').ok);
  assert.equal(G.claimDaily(s, 'd_login').ok, false);
  assert.ok(G.ensureDaily(s, T0 + 86400000));
  assert.ok(G.claimDaily(s, 'd_login').ok);
});

test('neighbour farms grow, can be watered and picked with limits', () => {
  const s = fresh();
  const npc = G.ensureNpc(s, 'meo', T0);
  assert.ok(npc.plots.filter(Boolean).length >= 6);
  // Make plot 5 ripe and plot 6 thirsty.
  npc.plots[5] = { crop: 'rice', plantedAt: T0 - 30000, growMs: 20000, variant: 1, waters: 0, stolen: false, linger: 3600000 };
  npc.plots[6] = { crop: 'tomato', plantedAt: T0 - 30000, growMs: 60000, variant: 0, waters: 0, stolen: false, linger: 3600000 };
  const w = G.npcWater(s, 'meo', 6, T0);
  assert.ok(w.ok && w.rewarded);
  const st = G.npcSteal(s, 'meo', 5, T0);
  assert.ok(st.ok);
  assert.equal(st.variant, 1);
  assert.equal(G.npcSteal(s, 'meo', 5, T0).err, 'taken');
  s.daily.stealStranger = 3;
  G.ensureNpc(s, 'heo', T0).plots[5] = { ...npc.plots[5], stolen: false };
  assert.equal(G.npcSteal(s, 'heo', 5, T0).err, 'limit');

  // Hours later the neighbour has harvested and replanted.
  const later = G.ensureNpc(s, 'meo', T0 + 30 * 3600000);
  assert.equal(later.plots[5].stolen, false);
});

test('mutations happen at ripening and are kept on the plot', () => {
  setRng(seeded(7));
  const s = G.newGame(T0);
  s.level = 30;
  let mutated = 0;
  for (let k = 0; k < 200; k++) {
    s.plots[5] = { crop: 'corn', pack: null, plantedAt: T0, growMs: 1000, waters: 2, variant: null };
    G.tick(s, T0 + 1000);
    if (s.plots[5].variant > 0) mutated++;
    assert.ok(s.plots[5].variant < 8);
  }
  // level 30 base 39% + 7% watering + 5% lucky ≈ 51%
  assert.ok(mutated > 70 && mutated < 140, `mutated ${mutated}`);
});

test('collection sets and milestones pay out once', () => {
  const s = fresh();
  for (let v = 0; v < 3; v++) s.discovered[`rice:${v}`] = T0;
  s.discovered['radish:0'] = T0;
  s.discovered['carrot:0'] = T0;
  assert.equal(G.bookClaimable(s), 2);
  assert.ok(G.claimSet(s, 'rice').ok);
  assert.equal(G.claimSet(s, 'rice').ok, false);
  assert.ok(G.claimMilestone(s, 0).ok);
  assert.equal(G.claimMilestone(s, 1).ok, false);
  assert.equal(G.bookClaimable(s), 0);
});

test('friends water your plants while you are away', () => {
  const s = fresh();
  G.plant(s, 5, 'rice', T0);
  s.plots[5].growMs = 3600000;
  s.lastSeen = T0;
  let total = 0;
  for (let k = 0; k < 20; k++) {
    s.plots[5].waters = 0;
    const helped = G.catchUp(s, T0 + 3600000);
    total += Object.values(helped).reduce((a, b) => a + b, 0);
  }
  assert.ok(total > 5 && total <= 40, `helped ${total}`);
});

test('hydrate fills missing fields from old saves', () => {
  const s = G.hydrate({ coins: 99, level: 3, settings: { lang: 'en' } }, T0);
  assert.equal(s.coins, 99);
  assert.equal(s.settings.lang, 'en');
  assert.equal(s.settings.sound, true);
  assert.equal(s.plots.length, 16);
});
