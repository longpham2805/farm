// Seed catalog. Numbers follow the original game's shop where we had them.
//  price  – coins per seed
//  xp     – farm XP per harvested plant
//  yield  – items per harvest (watering adds +1 each, up to +2)
//  sell   – coins per item when sold (before level bonus / mutation multiplier)
//  grow   – seconds to grow (before level reduction)
//  variants – number of looks in the encyclopedia (index 0 = normal)
//  tags: exp (lots of XP), special (cute creature crop), lucky (+5% mutation)
//  colors: used by the 3D models and UI

export const CROPS = [
  // ── Tier 1 · green ──────────────────────────────────────────
  { id: 'radish', tier: 1, unlock: 1, price: 0, xp: 1, yield: 2, sell: 1, grow: 6, variants: 3,
    name: { vi: 'Củ cải trắng', en: 'White Radish' }, color: '#f4f1ea', leaf: '#5cc25a' },
  { id: 'wheat', tier: 1, unlock: 1, price: 83, xp: 2, yield: 3, sell: 33, grow: 20, variants: 3,
    name: { vi: 'Lúa mì', en: 'Wheat' }, color: '#f2b538', leaf: '#8cc63f' },
  { id: 'carrot', tier: 1, unlock: 2, price: 251, xp: 3, yield: 3, sell: 101, grow: 41, variants: 3,
    name: { vi: 'Cà rốt', en: 'Carrot' }, color: '#ff8a1f', leaf: '#4cb848' },
  { id: 'tomato', tier: 1, unlock: 2, price: 224, xp: 4, yield: 3, sell: 90, grow: 60, variants: 3,
    name: { vi: 'Cà chua', en: 'Tomato' }, color: '#ec3b2f', leaf: '#3f9e3a' },
  { id: 'mushroom', tier: 1, unlock: 3, price: 298, xp: 8, yield: 3, sell: 119, grow: 180, variants: 3,
    name: { vi: 'Nấm', en: 'Mushroom' }, color: '#c8502b', leaf: '#f3e4c8' },

  // ── Tier 2 · blue ───────────────────────────────────────────
  { id: 'cucumber', tier: 2, unlock: 3, price: 199, xp: 25, yield: 3, sell: 155, grow: 360, variants: 3,
    name: { vi: 'Dưa leo', en: 'Cucumber' }, color: '#4caf3f', leaf: '#3d8f37' },
  { id: 'sunflower', tier: 2, unlock: 4, price: 137, xp: 70, yield: 4, sell: 121, grow: 2460, variants: 3, tags: ['exp'],
    name: { vi: 'Hoa hướng dương', en: 'Sunflower' }, color: '#ffc81e', leaf: '#4caf3f' },
  { id: 'potato', tier: 2, unlock: 4, price: 357, xp: 25, yield: 4, sell: 209, grow: 600, variants: 3, tags: ['lucky'],
    name: { vi: 'Khoai tây', en: 'Potato' }, color: '#e9b85c', leaf: '#5aa646' },
  { id: 'garlic', tier: 2, unlock: 5, price: 225, xp: 30, yield: 4, sell: 198, grow: 1800, variants: 3,
    name: { vi: 'Tỏi', en: 'Garlic' }, color: '#f6e9f0', leaf: '#7cbf4f' },
  { id: 'fox', tier: 2, unlock: 5, price: 302, xp: 25, yield: 4, sell: 161, grow: 780, variants: 5, tags: ['special'],
    name: { vi: 'Bé Cáo Hoa', en: 'Fox Blossom' }, color: '#ff9a5c', leaf: '#4caf3f' },
  { id: 'pepper', tier: 2, unlock: 6, price: 266, xp: 35, yield: 4, sell: 234, grow: 2460, variants: 3,
    name: { vi: 'Ớt chuông', en: 'Bell Pepper' }, color: '#e52b2b', leaf: '#3f9e3a' },
  { id: 'banana', tier: 2, unlock: 7, price: 247, xp: 40, yield: 5, sell: 243, grow: 4920, variants: 3,
    name: { vi: 'Chuối', en: 'Banana' }, color: '#ffdd33', leaf: '#46a83a' },
  { id: 'eggplant', tier: 2, unlock: 8, price: 285, xp: 45, yield: 5, sell: 279, grow: 7380, variants: 3,
    name: { vi: 'Cà tím', en: 'Eggplant' }, color: '#7b3fa6', leaf: '#4c9a3c' },

  // ── Tier 3 · purple ─────────────────────────────────────────
  { id: 'ginger', tier: 3, unlock: 7, price: 255, xp: 61, yield: 5, sell: 229, grow: 3660, variants: 5, tags: ['special'],
    name: { vi: 'Bé Gừng Nóng Lạnh', en: 'Hot-Cold Ginger' }, color: '#d9a35b', leaf: '#62b545' },
  { id: 'pumpkin', tier: 3, unlock: 9, price: 285, xp: 61, yield: 5, sell: 360, grow: 12360, variants: 3,
    name: { vi: 'Bí ngô', en: 'Pumpkin' }, color: '#ff8c1a', leaf: '#4a9a3a' },
  { id: 'purpleRadish', tier: 3, unlock: 9, price: 328, xp: 67, yield: 5, sell: 378, grow: 14820, variants: 5, tags: ['special'],
    name: { vi: 'Bé Củ Cải Tím', en: 'Purple Radish' }, color: '#9b4fd1', leaf: '#3fb28a' },
  { id: 'grape', tier: 3, unlock: 10, price: 199, xp: 180, yield: 5, sell: 306, grow: 24720, variants: 3, tags: ['exp'],
    name: { vi: 'Nho', en: 'Grape' }, color: '#8e44c9', leaf: '#5aa646' },
  { id: 'corn', tier: 3, unlock: 10, price: 385, xp: 65, yield: 5, sell: 406, grow: 9900, variants: 8, tags: ['lucky'],
    name: { vi: 'Ngô', en: 'Corn' }, color: '#ffd23f', leaf: '#5aa646' },
  { id: 'lotus', tier: 3, unlock: 11, price: 314, xp: 73, yield: 5, sell: 442, grow: 24720, variants: 5, tags: ['special'],
    name: { vi: 'Bé Sen Hồng', en: 'Lotus Baby' }, color: '#ff8fc1', leaf: '#3faa6a' },
  { id: 'lettuce', tier: 3, unlock: 12, price: 317, xp: 73, yield: 6, sell: 409, grow: 29700, variants: 3,
    name: { vi: 'Xà lách', en: 'Lettuce' }, color: '#8fd14f', leaf: '#5cb83c' },
  { id: 'lantern', tier: 3, unlock: 12, price: 367, xp: 79, yield: 6, sell: 430, grow: 29700, variants: 5, tags: ['special'],
    name: { vi: 'Bông Đèn Lồng', en: 'Lantern Bloom' }, color: '#7fb8ff', leaf: '#3faa6a' },
  { id: 'onion', tier: 3, unlock: 13, price: 344, xp: 79, yield: 6, sell: 483, grow: 39600, variants: 3,
    name: { vi: 'Hành tây', en: 'Onion' }, color: '#a8327a', leaf: '#5cb83c' },
  { id: 'blueberry', tier: 3, unlock: 14, price: 393, xp: 90, yield: 6, sell: 504, grow: 39600, variants: 5, tags: ['special'],
    name: { vi: 'Bé Việt Quất Hiệp Sĩ', en: 'Blueberry Knight' }, color: '#4b5bd6', leaf: '#4c9a3c' },

  // ── Tier 4 · red ────────────────────────────────────────────
  { id: 'strawberry', tier: 4, unlock: 16, price: 369, xp: 350, yield: 6, sell: 504, grow: 59400, variants: 8, tags: ['exp'],
    name: { vi: 'Dâu tây', en: 'Strawberry' }, color: '#f2304f', leaf: '#3f9e3a' },
  { id: 'gentian', tier: 4, unlock: 18, price: 408, xp: 200, yield: 6, sell: 609, grow: 49500, variants: 5, tags: ['special'],
    name: { vi: 'Hoa Long Đởm Đêm', en: 'Night Gentian' }, color: '#6a3fd6', leaf: '#2f8a5a' },
  { id: 'dahlia', tier: 4, unlock: 20, price: 459, xp: 240, yield: 6, sell: 685, grow: 54480, variants: 5, tags: ['special'],
    name: { vi: 'Bé Thược Dược', en: 'Dahlia Baby' }, color: '#ff6f91', leaf: '#3f9e5a' },
  { id: 'broccoli', tier: 4, unlock: 22, price: 502, xp: 260, yield: 6, sell: 750, grow: 59400, variants: 5, tags: ['special'],
    name: { vi: 'Bé Bông Cải Nơ Hồng', en: 'Bow Broccoli' }, color: '#5dbb4a', leaf: '#3f9e3a' },
  { id: 'watermelon', tier: 4, unlock: 24, price: 480, xp: 280, yield: 6, sell: 720, grow: 54000, variants: 3,
    name: { vi: 'Dưa hấu', en: 'Watermelon' }, color: '#3d9b3a', leaf: '#4caf3f' },
  { id: 'pineapple', tier: 4, unlock: 25, price: 520, xp: 300, yield: 6, sell: 790, grow: 61200, variants: 5, tags: ['special'],
    name: { vi: 'Bé Dứa Rừng', en: 'Wild Pineapple' }, color: '#f5b82e', leaf: '#3f9e3a' },
  { id: 'pear', tier: 4, unlock: 28, price: 540, xp: 320, yield: 6, sell: 820, grow: 64800, variants: 8, tags: ['lucky'],
    name: { vi: 'Lê vàng', en: 'Golden Pear' }, color: '#d7d93a', leaf: '#4caf3f' },
  { id: 'candy', tier: 4, unlock: 30, price: 600, xp: 400, yield: 7, sell: 950, grow: 72000, variants: 8, tags: ['special'],
    name: { vi: 'Cây Kẹo Mút', en: 'Lollipop Tree' }, color: '#ff5fb4', leaf: '#4caf3f' },
];

// Mystery packs: plant one and a random crop from the pool grows.
// The crop stays a surprise until it is ripe.
export const PACKS = [
  { id: 'pack1', tier: 1, unlock: 1, price: 130, mutation: 0,
    name: { vi: 'Gói ngẫu nhiên thường', en: 'Common Mystery Pack' },
    pool: (c) => c.tier <= 2 && !hasTag(c, 'special') && c.price > 0 },
  { id: 'pack2', tier: 2, unlock: 5, price: 225, mutation: 0.04,
    name: { vi: 'Gói ngẫu nhiên hiếm', en: 'Rare Mystery Pack' },
    pool: (c) => c.tier >= 2 && c.tier <= 3 },
  { id: 'pack3', tier: 3, unlock: 12, price: 375, mutation: 0.08,
    name: { vi: 'Gói ngẫu nhiên cực hiếm', en: 'Super-Rare Mystery Pack' },
    pool: (c) => c.tier >= 3 },
  { id: 'pack4', tier: 4, unlock: 27, price: 600, mutation: 0.15,
    name: { vi: 'Gói ngẫu nhiên huyền thoại', en: 'Legendary Mystery Pack' },
    pool: (c) => c.tier === 4 },
];

export function hasTag(crop, tag) {
  return !!crop.tags && crop.tags.includes(tag);
}

export const CROP_BY_ID = Object.fromEntries(CROPS.map((c) => [c.id, c]));
export const PACK_BY_ID = Object.fromEntries(PACKS.map((p) => [p.id, p]));

export const isPack = (id) => id in PACK_BY_ID;
export const seedDef = (id) => CROP_BY_ID[id] || PACK_BY_ID[id];

export function packPool(packId) {
  const pack = PACK_BY_ID[packId];
  return CROPS.filter(pack.pool);
}

export const TOTAL_VARIETIES = CROPS.reduce((n, c) => n + c.variants, 0);
