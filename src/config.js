// Game balance. All numbers in one place so they are easy to tune.

export const SAVE_KEY = 'nong-trai-vui-ve-save-v1';

// Family-code sync (Firestore). Leave empty to turn the cloud part off; the save code still works.
// Both values come from Firebase console → Project settings → Your apps → Web app. They are not secrets.
export const CLOUD = {
  projectId: 'boyfarm-598e3',
  apiKey: 'AIzaSyDk4jPGMPCexnoq5iHEfmul6zoe-2BiMpM',
};
export const GRID = 4; // 4 × 4 plots
export const MAX_LEVEL = 45;

// XP needed to upgrade from level L to L+1 is LEVEL_XP[L - 1].
export const LEVEL_XP = [
  14, 42, 105, 280, 560, 980, 1540, 2240, 3150, 4200,
  5460, 6860, 8400, 10150, 12250, 14700, 17500, 20650, 24150, 28000,
  32200, 36750, 41650, 46900, 52500, 58800, 65800, 73500, 81900, 91000,
  100800, 111300, 122500, 134400, 147000, 160300, 174300, 189000, 204400, 220500,
  237300, 254800, 273000, 291900,
];

// Coins needed to upgrade from level L to L+1 is LEVEL_COST[L - 1].
export const LEVEL_COST = [
  50, 150, 400, 800, 1500, 2500, 4000, 6000, 8500, 11500,
  15000, 19000, 24000, 30000, 37000, 45000, 54000, 64000, 75000, 87000,
  100000, 115000, 130000, 150000, 170000, 195000, 220000, 250000, 280000, 315000,
  350000, 390000, 430000, 475000, 520000, 570000, 620000, 675000, 730000, 790000,
  850000, 915000, 980000, 1050000,
];

// Some upgrades also need crops from the warehouse ("materials").
// Key = the level you upgrade FROM.
export const LEVEL_MATERIALS = {
  3: { crop: 'tomato', n: 6 },
  5: { crop: 'cucumber', n: 6 },
  7: { crop: 'sunflower', n: 10 },
  9: { crop: 'banana', n: 10 },
  11: { crop: 'corn', n: 12 },
  13: { crop: 'lettuce', n: 12 },
  15: { crop: 'onion', n: 15 },
  18: { crop: 'strawberry', n: 15 },
  21: { crop: 'mangosteen', n: 9 },
  24: { crop: 'broccoli', n: 9 },
  27: { crop: 'pineapple', n: 9 },
  30: { crop: 'pear', n: 12 },
  33: { crop: 'lime', n: 12 },
  36: { crop: 'passionFruit', n: 12 },
  39: { crop: 'rambutan', n: 12 },
  42: { crop: 'kiwi', n: 12 },
};

// Level at which each plot (row-major index) opens.
export const PLOT_UNLOCK = [
  7, 1, 1, 8,
  2, 1, 1, 2,
  3, 1, 1, 4,
  10, 5, 5, 12,
];

export const growReduction = (level) => Math.min(0.4, (level - 1) * 0.0125);
export const priceBonus = (level) => (level - 1) * 0.036;
export const energyBonus = (level) => (level - 1) * 0.012;
export const mutationBase = (level) => Math.min(0.4, 0.08 + (level - 1) * 0.011);

export const WATER_MUTATION_BONUS = 0.035; // per watering, up to 2 waterings
export const LUCKY_MUTATION_BONUS = 0.05;

export const ENERGY_PER_CHEST = 100;
export const ENERGY = { plant: 1, water: 2, harvest: 3, friendWater: 2, steal: 1, chest: 1 };

export const DAILY_LIMITS = { stealFriend: 20, stealStranger: 3, waterFriend: 30 };

// Sell price multiplier by variant index (0 = normal).
export const VARIANT_SELL_MULT = [1, 2, 3, 4, 5, 6, 8, 10];

export const CHEST_TIERS = ['green', 'blue', 'purple', 'red'];
export const CHEST_WEIGHTS = { green: 60, blue: 28, purple: 10, red: 2 };

export const START = { coins: 500, seeds: { rice: 6 } };

// Encyclopedia milestones: number of discovered varieties → reward.
// The last milestone is every variety (see TOTAL_VARIETIES).
export const MILESTONES = [
  { n: 5, reward: { coins: 300, seeds: { pack1: 2 } } },
  { n: 15, reward: { coins: 1000, seeds: { pack2: 2 } } },
  { n: 30, reward: { coins: 3000, seeds: { pack2: 4 } } },
  { n: 50, reward: { coins: 8000, seeds: { pack3: 3 } } },
  { n: 75, reward: { coins: 20000, seeds: { pack3: 5 } } },
  { n: 100, reward: { coins: 50000, seeds: { pack4: 3 } } },
  { n: 125, reward: { coins: 90000, seeds: { pack4: 5 } } },
  { n: 150, reward: { coins: 120000, seeds: { pack4: 6 } } },
  { n: 180, reward: { coins: 160000, seeds: { pack4: 8 } } },
  { n: 220, reward: { coins: 200000, seeds: { pack4: 10 } } },
  { n: Infinity, reward: { coins: 300000, seeds: { pack4: 15 } } },
];
