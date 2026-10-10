// Main quests come in chapters; finish every task in a chapter to open the next.
// `kind` is a stat counter (see game/logic.js bump()) or one of:
//   level, discovered, sets
// `go` tells the UI which screen helps with the task.

import { CROPS, TOTAL_VARIETIES } from './crops.js';

export const CHAPTERS = [
  {
    title: { vi: 'Nông trại đầu tiên', en: 'My First Farm' },
    tasks: [
      { id: 'c1a', kind: 'planted', n: 3, go: 'seeds', reward: { coins: 50 } },
      { id: 'c1b', kind: 'watered', n: 2, go: 'farm', reward: { seeds: { rice: 3 } } },
      { id: 'c1c', kind: 'harvested', n: 6, go: 'farm', reward: { coins: 100 } },
      { id: 'c1d', kind: 'sold', n: 5, go: 'warehouse', reward: { seeds: { pack1: 1 } } },
      { id: 'c1e', kind: 'level', n: 2, go: 'upgrade', reward: { coins: 200 } },
    ],
  },
  {
    title: { vi: 'Bàn tay xanh', en: 'Green Thumb' },
    tasks: [
      { id: 'c2a', kind: 'bought', n: 5, go: 'shop', reward: { coins: 150 } },
      { id: 'c2b', kind: 'harvested', n: 40, go: 'farm', reward: { seeds: { carrot: 4 } } },
      { id: 'c2c', kind: 'mutations', n: 1, go: 'farm', reward: { seeds: { pack1: 2 } } },
      { id: 'c2d', kind: 'visits', n: 1, go: 'friends', reward: { coins: 100 } },
      { id: 'c2e', kind: 'friendWater', n: 3, go: 'friends', reward: { energy: 20 } },
      { id: 'c2f', kind: 'level', n: 4, go: 'upgrade', reward: { coins: 500 } },
    ],
  },
  {
    title: { vi: 'Thợ săn đột biến', en: 'Mutation Hunter' },
    tasks: [
      { id: 'c3a', kind: 'discovered', n: 10, go: 'book', reward: { seeds: { pack2: 1 } } },
      { id: 'c3b', kind: 'stolen', n: 3, go: 'friends', reward: { coins: 300 } },
      { id: 'c3c', kind: 'chestsOpened', n: 2, go: 'chests', reward: { coins: 400 } },
      { id: 'c3d', kind: 'earned', n: 5000, go: 'warehouse', reward: { seeds: { sunflower: 8 } } },
      { id: 'c3e', kind: 'level', n: 6, go: 'upgrade', reward: { coins: 1500 } },
    ],
  },
  {
    title: { vi: 'Mùa bội thu', en: 'Bumper Harvest' },
    tasks: [
      { id: 'c4a', kind: 'harvested', n: 400, go: 'farm', reward: { coins: 2000 } },
      { id: 'c4b', kind: 'discovered', n: 25, go: 'book', reward: { seeds: { pack2: 3 } } },
      { id: 'c4c', kind: 'mutations', n: 15, go: 'farm', reward: { energy: 50 } },
      { id: 'c4d', kind: 'sets', n: 1, go: 'book', reward: { coins: 3000 } },
      { id: 'c4e', kind: 'level', n: 10, go: 'upgrade', reward: { seeds: { pack2: 5 } } },
    ],
  },
  {
    title: { vi: 'Vườn kỳ diệu', en: 'Magic Garden' },
    tasks: [
      { id: 'c5a', kind: 'discovered', n: 45, go: 'book', reward: { seeds: { pack3: 2 } } },
      { id: 'c5b', kind: 'chestsOpened', n: 20, go: 'chests', reward: { coins: 8000 } },
      { id: 'c5c', kind: 'sets', n: 5, go: 'book', reward: { seeds: { pack3: 3 } } },
      { id: 'c5d', kind: 'level', n: 15, go: 'upgrade', reward: { coins: 20000 } },
    ],
  },
  {
    title: { vi: 'Huyền thoại nông trại', en: 'Farm Legend' },
    tasks: [
      { id: 'c6a', kind: 'tier4', n: 10, go: 'shop', reward: { seeds: { pack3: 5 } } },
      { id: 'c6b', kind: 'discovered', n: 80, go: 'book', reward: { coins: 50000 } },
      { id: 'c6c', kind: 'harvested', n: 5000, go: 'farm', reward: { energy: 200 } },
      { id: 'c6d', kind: 'level', n: 22, go: 'upgrade', reward: { seeds: { pack4: 3 } } },
    ],
  },
  {
    title: { vi: 'Vua nông trại', en: 'Farm Royalty' },
    tasks: [
      { id: 'c7a', kind: 'discovered', n: TOTAL_VARIETIES, go: 'book', reward: { coins: 300000 } },
      { id: 'c7b', kind: 'sets', n: CROPS.length, go: 'book', reward: { seeds: { pack4: 10 } } },
      { id: 'c7c', kind: 'level', n: 30, go: 'upgrade', reward: { coins: 500000 } },
    ],
  },
];

// Daily quests reset at local midnight.
export const DAILY = [
  { id: 'd_login', kind: 'login', n: 1, go: 'farm', reward: { coins: 60 } },
  { id: 'd_plant', kind: 'planted', n: 10, go: 'seeds', reward: { seeds: { pack1: 1 } } },
  { id: 'd_water', kind: 'watered', n: 8, go: 'farm', reward: { coins: 120 } },
  { id: 'd_harvest', kind: 'harvested', n: 30, go: 'farm', reward: { energy: 20 } },
  { id: 'd_sell', kind: 'sold', n: 20, go: 'warehouse', reward: { coins: 150 } },
  { id: 'd_help', kind: 'friendWater', n: 5, go: 'friends', reward: { seeds: { pack1: 1 } } },
  { id: 'd_steal', kind: 'stolen', n: 3, go: 'friends', reward: { coins: 120 } },
  { id: 'd_chest', kind: 'chestsOpened', n: 1, go: 'chests', reward: { energy: 15 } },
];
