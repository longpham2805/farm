// All game rules. No DOM, no three.js: every function takes the state object
// and the current time, so the rules can be tested in Node.

import * as C from '../config.js';
import { CROPS, CROP_BY_ID, PACK_BY_ID, isPack, seedDef, packPool, hasTag, TOTAL_VARIETIES } from '../data/crops.js';
import { CHAPTERS, DAILY } from '../data/quests.js';
import { NPCS, NPC_BY_ID } from '../data/npcs.js';
import { rng, randInt, pick, pickWeighted, dayKey } from '../util.js';

// ── New game ──────────────────────────────────────────────────

export function newGame(now) {
  const state = {
    v: 1,
    createdAt: now,
    lastSeen: now,
    profile: { name: '', avatar: '🧑‍🌾' },
    settings: { lang: 'vi', sound: true, music: true, quality: 'high' },
    coins: C.START.coins,
    xp: 0,
    level: 1,
    energy: 0,
    chests: { green: 0, blue: 0, purple: 0, red: 0 },
    seeds: { ...C.START.seeds },
    items: {},
    discovered: {},
    plots: Array(C.GRID * C.GRID).fill(null),
    stats: {},
    quests: { chapter: 0, claimed: {} },
    daily: { day: '', counters: {}, claimed: {} },
    claimedSets: {},
    claimedMilestones: {},
    npcs: {},
    seenIntro: false,
  };
  ensureDaily(state, now);
  return state;
}

/** Fill in any fields an older save is missing. */
export function hydrate(saved, now) {
  const base = newGame(now);
  const state = { ...base, ...saved };
  for (const key of ['profile', 'settings', 'chests', 'quests', 'daily']) {
    state[key] = { ...base[key], ...(saved[key] || {}) };
  }
  if (!Array.isArray(state.plots) || state.plots.length !== C.GRID * C.GRID) state.plots = base.plots;
  ensureDaily(state, now);
  return state;
}

// ── Counters ──────────────────────────────────────────────────

export function bump(state, kind, n = 1) {
  state.stats[kind] = (state.stats[kind] || 0) + n;
  state.daily.counters[kind] = (state.daily.counters[kind] || 0) + n;
}

export function ensureDaily(state, now) {
  const day = dayKey(now);
  if (state.daily.day === day) return false;
  state.daily = { day, counters: {}, claimed: {}, stealFriend: 0, stealStranger: 0, waterFriend: 0 };
  state.daily.counters.login = 1;
  return true;
}

// ── Level ─────────────────────────────────────────────────────

export const plotUnlocked = (level, index) => C.PLOT_UNLOCK[index] <= level;
export const plotCount = (level) => C.PLOT_UNLOCK.filter((l) => l <= level).length;

export function levelNeeds(state) {
  if (state.level >= C.MAX_LEVEL) return null;
  const L = state.level;
  return { xp: C.LEVEL_XP[L - 1], coins: C.LEVEL_COST[L - 1], material: C.LEVEL_MATERIALS[L] || null };
}

export function cropCount(state, cropId) {
  let n = 0;
  for (const [key, count] of Object.entries(state.items)) {
    if (key.split(':')[0] === cropId) n += count;
  }
  return n;
}

export function upgradeCheck(state) {
  const need = levelNeeds(state);
  if (!need) return { ok: false, max: true };
  const xpOk = state.xp >= need.xp;
  const coinsOk = state.coins >= need.coins;
  const matOk = !need.material || cropCount(state, need.material.crop) >= need.material.n;
  return { ok: xpOk && coinsOk && matOk, xpOk, coinsOk, matOk, need };
}

/** What the next level opens: new seeds and plots. */
export function unlocksAt(level) {
  return {
    seeds: [...CROPS, ...Object.values(PACK_BY_ID)].filter((s) => s.unlock === level).map((s) => s.id),
    plots: C.PLOT_UNLOCK.filter((l) => l === level).length,
  };
}

export function upgrade(state) {
  const check = upgradeCheck(state);
  if (!check.ok) return { ok: false, check };
  const { need } = check;
  state.xp -= need.xp;
  state.coins -= need.coins;
  if (need.material) consumeCrop(state, need.material.crop, need.material.n);
  state.level += 1;
  return { ok: true, level: state.level, unlocks: unlocksAt(state.level) };
}

// Uses the plainest variants first so mutated crops are kept.
function consumeCrop(state, cropId, n) {
  const crop = CROP_BY_ID[cropId];
  for (let v = 0; v < crop.variants && n > 0; v++) {
    const key = varietyKey(cropId, v);
    const have = state.items[key] || 0;
    const take = Math.min(have, n);
    if (take) {
      state.items[key] = have - take;
      if (!state.items[key]) delete state.items[key];
      n -= take;
    }
  }
}

// ── Energy and chests ─────────────────────────────────────────

/** Adds magic energy. Every full bar becomes a chest. Returns the chests earned. */
export function addEnergy(state, amount) {
  state.energy += amount * (1 + C.energyBonus(state.level));
  const earned = [];
  while (state.energy >= C.ENERGY_PER_CHEST) {
    state.energy -= C.ENERGY_PER_CHEST;
    const tier = pickWeighted(Object.entries(C.CHEST_WEIGHTS));
    state.chests[tier] += 1;
    earned.push(tier);
  }
  return earned;
}

export function grant(state, reward) {
  if (!reward) return [];
  const chests = [];
  if (reward.coins) state.coins += reward.coins;
  if (reward.xp) state.xp += reward.xp;
  if (reward.seeds) {
    for (const [id, n] of Object.entries(reward.seeds)) state.seeds[id] = (state.seeds[id] || 0) + n;
  }
  if (reward.energy) chests.push(...addEnergy(state, reward.energy / (1 + C.energyBonus(state.level))));
  return chests;
}

function availableCrops(state, maxTier, minTier = 1) {
  return CROPS.filter((c) => c.price > 0 && c.unlock <= state.level && c.tier <= maxTier && c.tier >= minTier);
}

function chestReward(state, tier) {
  const s = 1 + state.level * 0.5;
  const r = rng();
  const packFor = (wanted) => (state.level >= PACK_BY_ID[wanted].unlock || wanted === 'pack3' || wanted === 'pack4' ? wanted : 'pack1');
  if (tier === 'green') {
    if (r < 0.75) {
      if (rng() < 0.5) return { coins: Math.round((30 + rng() * 50) * s) };
      return { seeds: { [pick(availableCrops(state, 2)).id]: randInt(3, 5) } };
    }
    return { seeds: state.level >= 5 ? { pack2: 1 } : { pack1: 2 } };
  }
  if (tier === 'blue') {
    if (r < 0.7) {
      if (rng() < 0.5) return { coins: Math.round((100 + rng() * 150) * s) };
      return { seeds: { [pick(availableCrops(state, 3)).id]: randInt(3, 6) } };
    }
    if (rng() < 0.2) return { seeds: { pack3: 1 } };
    return { seeds: { [packFor('pack2')]: randInt(1, 2) } };
  }
  if (tier === 'purple') {
    if (r < 0.6) {
      if (rng() < 0.5) return { seeds: { pack3: 1 } };
      return { seeds: { [pick(CROPS.filter((c) => c.tier >= 3)).id]: 3 } };
    }
    if (rng() < 0.5) return { seeds: { pack4: 1 } };
    return { seeds: { [pick(CROPS.filter((c) => hasTag(c, 'special'))).id]: 2 } };
  }
  // red · legendary
  if (r < 0.4) return { coins: Math.round(500 * s), seeds: { pack3: 3 } };
  return { seeds: { pack4: 2, [pick(CROPS.filter((c) => c.tier === 4 && hasTag(c, 'special'))).id]: 3 } };
}

export function openChests(state, tier, count = state.chests[tier]) {
  count = Math.min(count, state.chests[tier]);
  const rewards = [];
  for (let i = 0; i < count; i++) {
    state.chests[tier] -= 1;
    const reward = chestReward(state, tier);
    grant(state, reward);
    rewards.push(reward);
    bump(state, 'chestsOpened');
  }
  const chests = count ? addEnergy(state, C.ENERGY.chest * count) : [];
  return { rewards, chests };
}

// ── Plots ─────────────────────────────────────────────────────

export function thirstPoints(growMs) {
  if (growMs < 20000) return [];
  if (growMs < 300000) return [0.45];
  return [0.3, 0.65];
}

export function plotInfo(plot, now) {
  const progress = Math.min(1, Math.max(0, (now - plot.plantedAt) / plot.growMs));
  const mature = progress >= 1;
  const points = thirstPoints(plot.growMs);
  const next = points[plot.waters];
  const thirsty = !mature && next !== undefined && progress >= next;
  return {
    progress,
    mature,
    thirsty,
    stage: mature ? 3 : progress < 0.2 ? 0 : progress < 0.5 ? 1 : 2,
    remainingMs: Math.max(0, plot.plantedAt + plot.growMs - now),
    waterInMs: !mature && next !== undefined && !thirsty ? plot.plantedAt + plot.growMs * next - now : null,
    maxWaters: points.length,
  };
}

export const seedCount = (state, id) => (id === 'radish' ? Infinity : state.seeds[id] || 0);

export function growMsFor(crop, level) {
  return Math.round(crop.grow * 1000 * (1 - C.growReduction(level)));
}

export function mutationChance(state, plot) {
  const crop = CROP_BY_ID[plot.crop];
  let p = C.mutationBase(state.level) + plot.waters * C.WATER_MUTATION_BONUS;
  if (hasTag(crop, 'lucky')) p += C.LUCKY_MUTATION_BONUS;
  if (plot.pack) p += PACK_BY_ID[plot.pack].mutation;
  return Math.min(0.9, p);
}

/** 0 = normal. Rarer variants (higher index) are less likely. */
export function rollVariant(crop, chance) {
  if (rng() >= chance) return 0;
  const entries = [];
  for (let v = 1; v < crop.variants; v++) entries.push([v, 1 / Math.pow(v, 1.2)]);
  return pickWeighted(entries);
}

export const expectedYield = (plot) => CROP_BY_ID[plot.crop].yield + plot.waters;

export function plant(state, index, seedId, now) {
  if (!plotUnlocked(state.level, index)) return { ok: false, err: 'locked' };
  if (state.plots[index]) return { ok: false, err: 'occupied' };
  if (seedCount(state, seedId) <= 0) return { ok: false, err: 'noSeeds' };
  let crop;
  let pack = null;
  if (isPack(seedId)) {
    pack = seedId;
    crop = pick(packPool(seedId));
  } else {
    crop = CROP_BY_ID[seedId];
  }
  state.plots[index] = { crop: crop.id, pack, plantedAt: now, growMs: growMsFor(crop, state.level), waters: 0, variant: null };
  if (seedId !== 'radish') {
    state.seeds[seedId] -= 1;
    if (!state.seeds[seedId]) delete state.seeds[seedId];
  }
  bump(state, 'planted');
  const chests = addEnergy(state, C.ENERGY.plant);
  return { ok: true, chests };
}

export function water(state, index, now) {
  const plot = state.plots[index];
  if (!plot) return { ok: false, err: 'empty' };
  if (!plotInfo(plot, now).thirsty) return { ok: false, err: 'notThirsty' };
  plot.waters += 1;
  bump(state, 'watered');
  const chests = addEnergy(state, C.ENERGY.water);
  return { ok: true, chests };
}

/** Rolls the mutation for plants that just ripened. Returns their indexes. */
export function tick(state, now) {
  const ripened = [];
  state.plots.forEach((plot, i) => {
    if (plot && plot.variant == null && plotInfo(plot, now).mature) {
      plot.variant = rollVariant(CROP_BY_ID[plot.crop], mutationChance(state, plot));
      ripened.push(i);
    }
  });
  return ripened;
}

export const varietyKey = (cropId, variant) => `${cropId}:${variant}`;

function discover(state, cropId, variant, now) {
  const key = varietyKey(cropId, variant);
  if (state.discovered[key]) return false;
  state.discovered[key] = now;
  return true;
}

export function harvest(state, index, now) {
  const plot = state.plots[index];
  if (!plot) return { ok: false, err: 'empty' };
  if (!plotInfo(plot, now).mature) return { ok: false, err: 'notRipe' };
  if (plot.variant == null) tick(state, now);
  const crop = CROP_BY_ID[plot.crop];
  const variant = plot.variant;
  const count = expectedYield(plot);
  const key = varietyKey(crop.id, variant);
  state.items[key] = (state.items[key] || 0) + count;
  const xp = Math.round(crop.xp * (variant ? 1.5 : 1));
  state.xp += xp;
  bump(state, 'harvested', count);
  bump(state, 'harvestPlants');
  if (variant) bump(state, 'mutations');
  if (crop.tier === 4) bump(state, 'tier4');
  const newDiscovery = discover(state, crop.id, variant, now);
  state.plots[index] = null;
  const chests = addEnergy(state, C.ENERGY.harvest);
  return { ok: true, crop: crop.id, variant, count, xp, newDiscovery, pack: plot.pack, chests };
}

export function removePlant(state, index) {
  if (!state.plots[index]) return { ok: false, err: 'empty' };
  state.plots[index] = null;
  return { ok: true };
}

// ── Shop and warehouse ────────────────────────────────────────

export function buySeed(state, id, qty) {
  const def = seedDef(id);
  if (!def || qty < 1) return { ok: false, err: 'bad' };
  if (def.unlock > state.level) return { ok: false, err: 'locked' };
  const cost = def.price * qty;
  if (cost > state.coins) return { ok: false, err: 'noCoins' };
  state.coins -= cost;
  state.seeds[id] = (state.seeds[id] || 0) + qty;
  bump(state, 'bought', qty);
  return { ok: true, cost };
}

export function sellPrice(state, cropId, variant) {
  const crop = CROP_BY_ID[cropId];
  return Math.max(1, Math.round(crop.sell * (1 + C.priceBonus(state.level)) * C.VARIANT_SELL_MULT[variant]));
}

export function sell(state, key, qty) {
  const have = state.items[key] || 0;
  qty = Math.min(qty, have);
  if (qty < 1) return { ok: false, err: 'none' };
  const [cropId, v] = key.split(':');
  const coins = sellPrice(state, cropId, Number(v)) * qty;
  state.items[key] = have - qty;
  if (!state.items[key]) delete state.items[key];
  state.coins += coins;
  bump(state, 'sold', qty);
  bump(state, 'earned', coins);
  return { ok: true, coins, qty };
}

/** How many of each item are kept back as upgrade material. */
export function reservedItems(state) {
  const need = levelNeeds(state);
  const reserved = {};
  if (!need || !need.material) return reserved;
  let n = need.material.n;
  const crop = CROP_BY_ID[need.material.crop];
  for (let v = 0; v < crop.variants && n > 0; v++) {
    const key = varietyKey(crop.id, v);
    const take = Math.min(state.items[key] || 0, n);
    if (take) reserved[key] = take;
    n -= take;
  }
  return reserved;
}

export function sellAllPreview(state) {
  const reserved = reservedItems(state);
  let coins = 0;
  let qty = 0;
  for (const [key, have] of Object.entries(state.items)) {
    const n = have - (reserved[key] || 0);
    if (n <= 0) continue;
    const [cropId, v] = key.split(':');
    coins += sellPrice(state, cropId, Number(v)) * n;
    qty += n;
  }
  return { coins, qty };
}

export function sellAll(state) {
  const reserved = reservedItems(state);
  let coins = 0;
  let qty = 0;
  for (const [key, have] of Object.entries({ ...state.items })) {
    const n = have - (reserved[key] || 0);
    if (n <= 0) continue;
    const r = sell(state, key, n);
    coins += r.coins;
    qty += r.qty;
  }
  return { ok: qty > 0, coins, qty };
}

// ── Encyclopedia ──────────────────────────────────────────────

export const discoveredCount = (state) => Object.keys(state.discovered).length;

export function cropDiscovered(state, crop) {
  let n = 0;
  for (let v = 0; v < crop.variants; v++) if (state.discovered[varietyKey(crop.id, v)]) n++;
  return n;
}

export const completedSets = (state) => CROPS.filter((c) => cropDiscovered(state, c) === c.variants);

export function setReward(crop) {
  return { coins: Math.round(crop.sell * crop.variants * 4), seeds: { [`pack${Math.min(crop.tier, 4)}`]: 1 } };
}

export function claimSet(state, cropId) {
  const crop = CROP_BY_ID[cropId];
  if (state.claimedSets[cropId] || cropDiscovered(state, crop) < crop.variants) return { ok: false };
  state.claimedSets[cropId] = true;
  const reward = setReward(crop);
  const chests = grant(state, reward);
  return { ok: true, reward, chests };
}

export function claimMilestone(state, index) {
  const m = C.MILESTONES[index];
  const n = Math.min(m.n, TOTAL_VARIETIES);
  if (!m || state.claimedMilestones[index] || discoveredCount(state) < n) return { ok: false };
  state.claimedMilestones[index] = true;
  const chests = grant(state, m.reward);
  return { ok: true, reward: m.reward, chests };
}

// ── Quests ────────────────────────────────────────────────────

export function taskProgress(state, task, daily = false) {
  switch (task.kind) {
    case 'level': return state.level;
    case 'discovered': return discoveredCount(state);
    case 'sets': return completedSets(state).length;
    default: return (daily ? state.daily.counters : state.stats)[task.kind] || 0;
  }
}

export const currentChapter = (state) => CHAPTERS[state.quests.chapter] || null;

export function claimTask(state, taskId) {
  const chapter = currentChapter(state);
  const task = chapter && chapter.tasks.find((t) => t.id === taskId);
  if (!task || state.quests.claimed[taskId] || taskProgress(state, task) < task.n) return { ok: false };
  state.quests.claimed[taskId] = true;
  const chests = grant(state, task.reward);
  let chapterDone = false;
  if (chapter.tasks.every((t) => state.quests.claimed[t.id])) {
    state.quests.chapter += 1;
    chapterDone = true;
  }
  return { ok: true, reward: task.reward, chapterDone, chests };
}

export function claimDaily(state, id) {
  const task = DAILY.find((t) => t.id === id);
  if (!task || state.daily.claimed[id] || taskProgress(state, task, true) < task.n) return { ok: false };
  state.daily.claimed[id] = true;
  const chests = grant(state, task.reward);
  return { ok: true, reward: task.reward, chests };
}

export function claimableCount(state) {
  let n = 0;
  const chapter = currentChapter(state);
  if (chapter) for (const t of chapter.tasks) if (!state.quests.claimed[t.id] && taskProgress(state, t) >= t.n) n++;
  for (const t of DAILY) if (!state.daily.claimed[t.id] && taskProgress(state, t, true) >= t.n) n++;
  return n;
}

export function bookClaimable(state) {
  let n = completedSets(state).filter((c) => !state.claimedSets[c.id]).length;
  const found = discoveredCount(state);
  C.MILESTONES.forEach((m, i) => {
    if (!state.claimedMilestones[i] && found >= Math.min(m.n, TOTAL_VARIETIES)) n++;
  });
  return n;
}

// ── Neighbours ────────────────────────────────────────────────

function npcPlant(def, at) {
  const pool = CROPS.filter((c) => c.unlock <= def.level && c.price > 0);
  const crop = pick(pool);
  const mutateChance = 0.18 + def.level * 0.01;
  return {
    crop: crop.id,
    plantedAt: at,
    growMs: growMsFor(crop, def.level),
    variant: rollVariant(crop, mutateChance),
    waters: rng() < 0.4 ? 1 : 0,
    stolen: false,
    linger: (1 + rng() * 5) * 3600000,
  };
}

/** Creates or advances a neighbour's farm to `now`. */
export function ensureNpc(state, id, now) {
  const def = NPC_BY_ID[id];
  let npc = state.npcs[id];
  if (!npc) {
    npc = { plots: Array(C.GRID * C.GRID).fill(null) };
    for (let i = 0; i < npc.plots.length; i++) {
      if (!plotUnlocked(def.level, i)) continue;
      const p = npcPlant(def, now);
      p.plantedAt = now - rng() * (p.growMs + p.linger * 0.6);
      npc.plots[i] = p;
    }
    state.npcs[id] = npc;
  }
  npc.plots = npc.plots.map((p) => {
    let guard = 0;
    while (p && now >= p.plantedAt + p.growMs + p.linger && guard++ < 200) {
      p = npcPlant(def, p.plantedAt + p.growMs + p.linger);
    }
    return p;
  });
  return npc;
}

function stealLeft(state, def) {
  return def.stranger
    ? C.DAILY_LIMITS.stealStranger - state.daily.stealStranger
    : C.DAILY_LIMITS.stealFriend - state.daily.stealFriend;
}

export function npcStatus(state, id, now) {
  const def = NPC_BY_ID[id];
  const npc = ensureNpc(state, id, now);
  let ripe = 0;
  let thirsty = 0;
  for (const p of npc.plots) {
    if (!p) continue;
    const info = plotInfo(p, now);
    if (info.mature && !p.stolen) ripe++;
    if (info.thirsty) thirsty++;
  }
  return { canSteal: ripe > 0 && stealLeft(state, def) > 0, ripe, thirsty, stealLeft: stealLeft(state, def) };
}

export function npcWater(state, id, index, now) {
  const npc = ensureNpc(state, id, now);
  const plot = npc.plots[index];
  if (!plot || !plotInfo(plot, now).thirsty) return { ok: false, err: 'notThirsty' };
  plot.waters += 1;
  bump(state, 'friendWater');
  const rewarded = state.daily.waterFriend < C.DAILY_LIMITS.waterFriend;
  let coins = 0;
  let chests = [];
  if (rewarded) {
    state.daily.waterFriend += 1;
    coins = 5 + state.level * 2;
    state.coins += coins;
    state.xp += 2;
    chests = addEnergy(state, C.ENERGY.friendWater);
  }
  return { ok: true, rewarded, coins, chests };
}

export function npcSteal(state, id, index, now) {
  const def = NPC_BY_ID[id];
  const npc = ensureNpc(state, id, now);
  const plot = npc.plots[index];
  if (!plot || !plotInfo(plot, now).mature) return { ok: false, err: 'notRipe' };
  if (plot.stolen) return { ok: false, err: 'taken' };
  if (stealLeft(state, def) <= 0) return { ok: false, err: 'limit' };
  plot.stolen = true;
  if (def.stranger) state.daily.stealStranger += 1;
  else state.daily.stealFriend += 1;
  const count = rng() < 0.3 ? 2 : 1;
  const key = varietyKey(plot.crop, plot.variant);
  state.items[key] = (state.items[key] || 0) + count;
  bump(state, 'stolen');
  const newDiscovery = discover(state, plot.crop, plot.variant, now);
  const chests = addEnergy(state, C.ENERGY.steal);
  return { ok: true, crop: plot.crop, variant: plot.variant, count, newDiscovery, chests };
}

/** A friend waters one of your thirsty plants. Returns { npc, index } or null. */
export function friendHelp(state, now) {
  const thirsty = [];
  state.plots.forEach((p, i) => p && plotInfo(p, now).thirsty && thirsty.push(i));
  if (!thirsty.length) return null;
  const index = pick(thirsty);
  const npc = pick(NPCS.filter((n) => !n.stranger));
  state.plots[index].waters += 1;
  return { npc: npc.id, index };
}

/** While the player was away, friends sometimes watered their plants. */
export function catchUp(state, now) {
  const helped = {};
  if (now - state.lastSeen < 120000) return helped;
  for (const plot of state.plots) {
    if (!plot) continue;
    const points = thirstPoints(plot.growMs);
    while (plot.waters < points.length) {
      const due = plot.plantedAt + plot.growMs * points[plot.waters];
      if (due < state.lastSeen || due > now || rng() < 0.5) break;
      plot.waters += 1;
      const npc = pick(NPCS.filter((n) => !n.stranger)).id;
      helped[npc] = (helped[npc] || 0) + 1;
    }
  }
  return helped;
}

export { CROPS, CROP_BY_ID, TOTAL_VARIETIES };
