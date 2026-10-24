// Seed catalog: everyday fruits and vegetables, plus the sunflower.
//  price  – coins per seed
//  xp     – farm XP per harvested plant
//  yield  – items per harvest (watering adds +1 each, up to +2)
//  sell   – coins per item when sold (before level bonus / mutation multiplier)
//  grow   – seconds to grow (before level reduction)
//  variants – number of looks in the encyclopedia (index 0 = normal)
//  tags: exp (lots of XP), special (cute character crop), lucky (+5% mutation)
//  colors: used by the 3D models and UI

export const CROPS = [
  // ── Tier 1 · green ──────────────────────────────────────────
  { id: 'radish', tier: 1, unlock: 1, price: 0, xp: 1, yield: 2, sell: 1, grow: 4, variants: 3,
    name: { vi: 'Củ cải trắng', en: 'White Radish' }, color: '#fbfaf2', leaf: '#4fd14a' },
  { id: 'rice', tier: 1, unlock: 1, price: 83, xp: 2, yield: 3, sell: 33, grow: 12, variants: 3,
    name: { vi: 'Lúa', en: 'Rice' }, color: '#ffc928', leaf: '#6fd62f' },
  { id: 'carrot', tier: 1, unlock: 2, price: 251, xp: 3, yield: 3, sell: 101, grow: 25, variants: 3,
    name: { vi: 'Cà rốt', en: 'Carrot' }, color: '#ff7a00', leaf: '#3fcf3a' },
  { id: 'tomato', tier: 1, unlock: 2, price: 224, xp: 4, yield: 3, sell: 90, grow: 36, variants: 3,
    name: { vi: 'Cà chua', en: 'Tomato' }, color: '#ff2a1a', leaf: '#33b833' },
  { id: 'banana', tier: 1, unlock: 2, price: 240, xp: 5, yield: 3, sell: 96, grow: 45, variants: 3,
    name: { vi: 'Chuối', en: 'Banana' }, color: '#ffe11a', leaf: '#3cb835' },
  { id: 'waterSpinach', tier: 1, unlock: 3, price: 160, xp: 5, yield: 4, sell: 60, grow: 54, variants: 3,
    name: { vi: 'Rau muống', en: 'Water Spinach' }, color: '#38d438', leaf: '#a6ec5a' },
  { id: 'mushroom', tier: 1, unlock: 3, price: 298, xp: 8, yield: 3, sell: 119, grow: 108, variants: 3,
    name: { vi: 'Nấm', en: 'Mushroom' }, color: '#ef4a1f', leaf: '#fff0d2' },
  { id: 'strawberry', tier: 1, unlock: 3, price: 280, xp: 7, yield: 3, sell: 112, grow: 90, variants: 8,
    name: { vi: 'Dâu tây', en: 'Strawberry' }, color: '#ff1a45', leaf: '#33b833' },

  // ── Tier 2 · blue ───────────────────────────────────────────
  { id: 'cucumber', tier: 2, unlock: 3, price: 199, xp: 25, yield: 3, sell: 155, grow: 216, variants: 3,
    name: { vi: 'Dưa leo', en: 'Cucumber' }, color: '#2fbf2a', leaf: '#33a92f' },
  { id: 'cabbage', tier: 2, unlock: 4, price: 230, xp: 28, yield: 3, sell: 170, grow: 290, variants: 3,
    name: { vi: 'Bắp cải', en: 'Cabbage' }, color: '#b6f26a', leaf: '#4fc23a' },
  { id: 'sunflower', tier: 2, unlock: 4, price: 137, xp: 70, yield: 4, sell: 121, grow: 1480, variants: 3, tags: ['exp'],
    name: { vi: 'Hoa hướng dương', en: 'Sunflower' }, color: '#ffd000', leaf: '#3fbf3a' },
  { id: 'potato', tier: 2, unlock: 4, price: 357, xp: 25, yield: 4, sell: 209, grow: 360, variants: 3, tags: ['lucky'],
    name: { vi: 'Khoai tây', en: 'Potato' }, color: '#f2bb4e', leaf: '#4cbf3a' },
  { id: 'sweetPotato', tier: 2, unlock: 5, price: 240, xp: 30, yield: 4, sell: 190, grow: 720, variants: 3,
    name: { vi: 'Khoai lang', en: 'Sweet Potato' }, color: '#d83a7a', leaf: '#45c23a' },
  { id: 'garlic', tier: 2, unlock: 5, price: 225, xp: 30, yield: 4, sell: 198, grow: 1080, variants: 3,
    name: { vi: 'Tỏi', en: 'Garlic' }, color: '#fff2f8', leaf: '#6fcf3f' },
  { id: 'greenBean', tier: 2, unlock: 6, price: 210, xp: 32, yield: 5, sell: 150, grow: 900, variants: 3,
    name: { vi: 'Đậu que', en: 'Green Beans' }, color: '#45d62e', leaf: '#2fae3a' },
  { id: 'pepper', tier: 2, unlock: 6, price: 266, xp: 35, yield: 4, sell: 234, grow: 1480, variants: 3,
    name: { vi: 'Ớt chuông', en: 'Bell Pepper' }, color: '#ff1f1f', leaf: '#33b833' },
  { id: 'papaya', tier: 2, unlock: 7, price: 290, xp: 38, yield: 4, sell: 260, grow: 2160, variants: 3,
    name: { vi: 'Đu đủ', en: 'Papaya' }, color: '#ff9a00', leaf: '#3fc23a' },
  { id: 'eggplant', tier: 2, unlock: 8, price: 285, xp: 45, yield: 5, sell: 279, grow: 4440, variants: 3,
    name: { vi: 'Cà tím', en: 'Eggplant' }, color: '#8a2be2', leaf: '#3fae35' },

  // ── Tier 3 · purple ─────────────────────────────────────────
  { id: 'ginger', tier: 3, unlock: 7, price: 255, xp: 61, yield: 5, sell: 229, grow: 2200, variants: 5, tags: ['special'],
    name: { vi: 'Bé Gừng Nóng Lạnh', en: 'Hot-Cold Ginger' }, color: '#f0b04a', leaf: '#4fcf3a' },
  { id: 'pumpkin', tier: 3, unlock: 9, price: 285, xp: 61, yield: 5, sell: 360, grow: 7440, variants: 3,
    name: { vi: 'Bí đỏ', en: 'Pumpkin' }, color: '#ff7f00', leaf: '#3cb835' },
  { id: 'beet', tier: 3, unlock: 9, price: 328, xp: 67, yield: 5, sell: 378, grow: 8880, variants: 5, tags: ['special'],
    name: { vi: 'Bé Củ Dền', en: 'Beetroot Buddy' }, color: '#d81b72', leaf: '#3fc23a' },
  { id: 'grape', tier: 3, unlock: 10, price: 199, xp: 180, yield: 5, sell: 306, grow: 14820, variants: 3, tags: ['exp'],
    name: { vi: 'Nho', en: 'Grapes' }, color: '#9b2fe0', leaf: '#4cbf3a' },
  { id: 'corn', tier: 3, unlock: 10, price: 385, xp: 65, yield: 5, sell: 406, grow: 5940, variants: 8, tags: ['lucky'],
    name: { vi: 'Ngô', en: 'Corn' }, color: '#ffd400', leaf: '#4cbf3a' },
  { id: 'orange', tier: 3, unlock: 11, price: 314, xp: 73, yield: 5, sell: 442, grow: 14820, variants: 3,
    name: { vi: 'Cam', en: 'Orange' }, color: '#ff8c00', leaf: '#2fa83a' },
  { id: 'lettuce', tier: 3, unlock: 12, price: 317, xp: 73, yield: 6, sell: 409, grow: 17820, variants: 3,
    name: { vi: 'Xà lách', en: 'Lettuce' }, color: '#8ee83a', leaf: '#4fd13a' },
  { id: 'apple', tier: 3, unlock: 12, price: 367, xp: 79, yield: 6, sell: 430, grow: 17820, variants: 3,
    name: { vi: 'Táo', en: 'Apple' }, color: '#f2182a', leaf: '#3cb83a' },
  { id: 'onion', tier: 3, unlock: 13, price: 344, xp: 79, yield: 6, sell: 483, grow: 23760, variants: 3,
    name: { vi: 'Hành tây', en: 'Onion' }, color: '#c2287a', leaf: '#4fd13a' },
  { id: 'blueberry', tier: 3, unlock: 14, price: 393, xp: 90, yield: 6, sell: 504, grow: 23760, variants: 5, tags: ['special'],
    name: { vi: 'Bé Việt Quất Hiệp Sĩ', en: 'Blueberry Knight' }, color: '#3b4ff0', leaf: '#3fae35' },
  { id: 'mango', tier: 3, unlock: 15, price: 380, xp: 95, yield: 6, sell: 520, grow: 25920, variants: 3,
    name: { vi: 'Xoài', en: 'Mango' }, color: '#ffb800', leaf: '#2fa83a' },
  { id: 'purpleCabbage', tier: 3, unlock: 16, price: 390, xp: 100, yield: 6, sell: 540, grow: 27000, variants: 3,
    name: { vi: 'Bắp cải tím', en: 'Purple Cabbage' }, color: '#9a3fd6', leaf: '#7a62cc' },

  // ── Tier 4 · red ────────────────────────────────────────────
  { id: 'dragonFruit', tier: 4, unlock: 17, price: 420, xp: 210, yield: 6, sell: 640, grow: 30240, variants: 5,
    name: { vi: 'Thanh long', en: 'Dragon Fruit' }, color: '#ff2d95', leaf: '#3fcf4a' },
  { id: 'mangosteen', tier: 4, unlock: 18, price: 408, xp: 200, yield: 6, sell: 609, grow: 29700, variants: 5, tags: ['special'],
    name: { vi: 'Bé Măng Cụt', en: 'Mangosteen Buddy' }, color: '#7a1f8a', leaf: '#3fb83a' },
  { id: 'cauliflower', tier: 4, unlock: 19, price: 432, xp: 220, yield: 6, sell: 645, grow: 31200, variants: 3,
    name: { vi: 'Súp lơ trắng', en: 'Cauliflower' }, color: '#fbf4dc', leaf: '#45b83a' },
  { id: 'avocado', tier: 4, unlock: 20, price: 459, xp: 240, yield: 6, sell: 685, grow: 32700, variants: 3,
    name: { vi: 'Bơ', en: 'Avocado' }, color: '#4f9a1f', leaf: '#2fa83a' },
  { id: 'lemongrass', tier: 4, unlock: 21, price: 480, xp: 250, yield: 7, sell: 690, grow: 34200, variants: 3,
    name: { vi: 'Củ sả', en: 'Lemongrass' }, color: '#e2eda0', leaf: '#62c24a' },
  { id: 'broccoli', tier: 4, unlock: 22, price: 502, xp: 260, yield: 6, sell: 750, grow: 35640, variants: 5, tags: ['special'],
    name: { vi: 'Bé Bông Cải Nơ Hồng', en: 'Bow Broccoli' }, color: '#3fc23a', leaf: '#33b833' },
  { id: 'bambooShoot', tier: 4, unlock: 23, price: 495, xp: 270, yield: 6, sell: 745, grow: 34560, variants: 3,
    name: { vi: 'Củ măng', en: 'Bamboo Shoot' }, color: '#a8825a', leaf: '#5aae3a' },
  { id: 'watermelon', tier: 4, unlock: 24, price: 480, xp: 280, yield: 6, sell: 720, grow: 32400, variants: 3,
    name: { vi: 'Dưa hấu', en: 'Watermelon' }, color: '#2fae2a', leaf: '#45c23a' },
  { id: 'pineapple', tier: 4, unlock: 25, price: 520, xp: 300, yield: 6, sell: 790, grow: 36720, variants: 5, tags: ['special'],
    name: { vi: 'Bé Dứa', en: 'Pineapple Pal' }, color: '#ffbf1a', leaf: '#33b833' },
  { id: 'lychee', tier: 4, unlock: 26, price: 500, xp: 290, yield: 7, sell: 700, grow: 34560, variants: 3,
    name: { vi: 'Vải thiều', en: 'Lychee' }, color: '#f21d4a', leaf: '#2f9e35' },
  { id: 'lotusRoot', tier: 4, unlock: 27, price: 525, xp: 305, yield: 6, sell: 790, grow: 37800, variants: 3,
    name: { vi: 'Củ sen', en: 'Lotus Root' }, color: '#f2dcc2', leaf: '#3faa6a' },
  { id: 'pear', tier: 4, unlock: 28, price: 540, xp: 320, yield: 6, sell: 820, grow: 38880, variants: 8, tags: ['lucky'],
    name: { vi: 'Lê vàng', en: 'Golden Pear' }, color: '#e6e81a', leaf: '#3fbf3a' },
  { id: 'lotusFlower', tier: 4, unlock: 29, price: 430, xp: 800, yield: 6, sell: 660, grow: 41040, variants: 5, tags: ['exp'],
    name: { vi: 'Hoa sen', en: 'Lotus' }, color: '#ff7fb2', leaf: '#3faa6a' },
  { id: 'durian', tier: 4, unlock: 30, price: 600, xp: 400, yield: 5, sell: 1200, grow: 43200, variants: 8,
    name: { vi: 'Sầu riêng', en: 'Durian' }, color: '#b5cf1a', leaf: '#33a835' },

  // Levels 31–40: one new fruit (or two) for every level.
  { id: 'chili', tier: 4, unlock: 31, price: 560, xp: 330, yield: 7, sell: 760, grow: 36720, variants: 3,
    name: { vi: 'Ớt', en: 'Chilli' }, color: '#f0141c', leaf: '#33b833' },
  { id: 'lime', tier: 4, unlock: 31, price: 580, xp: 340, yield: 7, sell: 780, grow: 37800, variants: 3,
    name: { vi: 'Chanh', en: 'Lime' }, color: '#58c21f', leaf: '#1e7f2c' },
  { id: 'tangerine', tier: 4, unlock: 32, price: 610, xp: 360, yield: 6, sell: 900, grow: 39960, variants: 3,
    name: { vi: 'Quýt', en: 'Tangerine' }, color: '#ff6a00', leaf: '#2f9e35' },
  { id: 'guava', tier: 4, unlock: 33, price: 630, xp: 380, yield: 6, sell: 940, grow: 41040, variants: 3,
    name: { vi: 'Ổi', en: 'Guava' }, color: '#d2ea72', leaf: '#3fb83a' },
  { id: 'greenPear', tier: 4, unlock: 33, price: 650, xp: 390, yield: 6, sell: 960, grow: 41040, variants: 3,
    name: { vi: 'Lê xanh', en: 'Green Pear' }, color: '#9ed83a', leaf: '#3fbf3a' },
  { id: 'starfruit', tier: 4, unlock: 34, price: 450, xp: 900, yield: 6, sell: 700, grow: 47520, variants: 5, tags: ['exp'],
    name: { vi: 'Khế', en: 'Starfruit' }, color: '#ffd21f', leaf: '#3cb835' },
  { id: 'passionFruit', tier: 4, unlock: 35, price: 680, xp: 420, yield: 6, sell: 1020, grow: 43200, variants: 5,
    name: { vi: 'Chanh dây', en: 'Passion Fruit' }, color: '#7a2a6a', leaf: '#3fb83a' },
  { id: 'pomegranate', tier: 4, unlock: 36, price: 720, xp: 450, yield: 6, sell: 1080, grow: 45360, variants: 8, tags: ['lucky'],
    name: { vi: 'Lựu', en: 'Pomegranate' }, color: '#d81e3a', leaf: '#3fae35' },
  { id: 'rambutan', tier: 4, unlock: 37, price: 740, xp: 470, yield: 7, sell: 1000, grow: 45360, variants: 5,
    name: { vi: 'Chôm chôm', en: 'Rambutan' }, color: '#f0282a', leaf: '#2fa83a' },
  { id: 'cashew', tier: 4, unlock: 38, price: 780, xp: 500, yield: 6, sell: 1180, grow: 47520, variants: 5,
    name: { vi: 'Đào lộn hột', en: 'Cashew' }, color: '#ff7a1a', leaf: '#3fae35' },
  { id: 'cherry', tier: 4, unlock: 39, price: 820, xp: 540, yield: 6, sell: 1260, grow: 49680, variants: 8,
    name: { vi: 'Cherry', en: 'Cherry' }, color: '#c8102e', leaf: '#3fbf3a' },
  { id: 'melon', tier: 4, unlock: 40, price: 900, xp: 600, yield: 5, sell: 1600, grow: 51840, variants: 8,
    name: { vi: 'Dưa lưới', en: 'Melon' }, color: '#a8b860', leaf: '#45c23a' },

  // Levels 41–45.
  { id: 'kiwi', tier: 4, unlock: 41, price: 860, xp: 570, yield: 7, sell: 1180, grow: 52920, variants: 3,
    name: { vi: 'Kiwi', en: 'Kiwi' }, color: '#8a6234', leaf: '#3fae35' },
  { id: 'silverberry', tier: 4, unlock: 41, price: 840, xp: 560, yield: 8, sell: 1020, grow: 52200, variants: 3,
    name: { vi: 'Nhót', en: 'Silverberry' }, color: '#e8361f', leaf: '#5a9e4a' },
  { id: 'fig', tier: 4, unlock: 42, price: 900, xp: 600, yield: 7, sell: 1240, grow: 54000, variants: 8, tags: ['lucky'],
    name: { vi: 'Sung', en: 'Cluster Fig' }, color: '#e0503f', leaf: '#33a835' },
  { id: 'sugarApple', tier: 4, unlock: 42, price: 920, xp: 610, yield: 6, sell: 1480, grow: 54000, variants: 5,
    name: { vi: 'Na', en: 'Sugar Apple' }, color: '#a8c86a', leaf: '#3fb83a' },
  { id: 'sapodilla', tier: 4, unlock: 43, price: 520, xp: 1300, yield: 6, sell: 780, grow: 62640, variants: 5, tags: ['exp'],
    name: { vi: 'Hồng xiêm', en: 'Sapodilla' }, color: '#9a6a3a', leaf: '#2f9e35' },
  { id: 'soursop', tier: 4, unlock: 44, price: 980, xp: 650, yield: 5, sell: 1900, grow: 58320, variants: 5,
    name: { vi: 'Mãng cầu', en: 'Soursop' }, color: '#4f8a2a', leaf: '#2f9e35' },
  { id: 'pomelo', tier: 4, unlock: 44, price: 960, xp: 640, yield: 5, sell: 1860, grow: 58320, variants: 5,
    name: { vi: 'Bưởi', en: 'Pomelo' }, color: '#b8d83a', leaf: '#2f9e35' },
  { id: 'jackfruit', tier: 4, unlock: 45, price: 1050, xp: 720, yield: 4, sell: 2500, grow: 60480, variants: 8,
    name: { vi: 'Mít', en: 'Jackfruit' }, color: '#a8b43a', leaf: '#2f9e35' },
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

// Crops from older saves and what they became.
export const RENAMED_CROPS = {
  wheat: 'rice',
  purpleRadish: 'beet',
  fox: 'papaya',
  lotus: 'mangosteen', // so today's lotus is lotusFlower
  lantern: 'orange',
  gentian: 'durian',
  dahlia: 'avocado',
  candy: 'lychee',
};

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
