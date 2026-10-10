import { CROP_BY_ID, PACK_BY_ID } from './data/crops.js';
import { lookOf, STYLES } from './data/styles.js';

let lang = 'vi';
export const getLang = () => lang;
export function setLang(l) {
  lang = l === 'en' ? 'en' : 'vi';
  document.documentElement.lang = lang;
}

const S = {
  // general
  gameName: { vi: 'Nông Trại Trên Mây', en: 'Cloud Farm' },
  myFarm: { vi: 'Nông trại của {name}', en: "{name}'s Farm" },
  defaultName: { vi: 'Bé', en: 'Little Farmer' },
  level: { vi: 'Cấp', en: 'Lv' },
  close: { vi: 'Đóng', en: 'Close' },
  ok: { vi: 'Tuyệt vời!', en: 'Awesome!' },
  cancel: { vi: 'Thôi', en: 'Cancel' },
  yes: { vi: 'Đồng ý', en: 'Yes' },
  back: { vi: 'Về nhà', en: 'Home' },
  max: { vi: 'Tối đa', en: 'Max' },

  // hud
  shop: { vi: 'Cửa hàng', en: 'Shop' },
  chests: { vi: 'Rương', en: 'Chests' },
  quests: { vi: 'Nhiệm vụ', en: 'Quests' },
  settings: { vi: 'Cài đặt', en: 'Settings' },
  warehouse: { vi: 'Kho', en: 'Barn' },
  seeds: { vi: 'Hạt giống', en: 'Seeds' },
  friends: { vi: 'Bạn bè', en: 'Friends' },
  book: { vi: 'Bách khoa', en: 'Collection' },
  waterAll: { vi: 'Tưới nước ({n})', en: 'Water ({n})' },
  harvestAll: { vi: 'Thu hoạch ({n})', en: 'Harvest ({n})' },
  questDone: { vi: 'Xong rồi! Bấm để nhận quà', en: 'Done! Tap to get your reward' },
  allQuestsDone: { vi: 'Bé đã làm hết nhiệm vụ chính!', en: 'You finished every main quest!' },
  upgradeReady: { vi: 'Có thể nâng cấp!', en: 'Ready to level up!' },

  // plots
  plotLocked: { vi: 'Ô đất này mở ở cấp {n}', en: 'This plot opens at level {n}' },
  noSeeds: { vi: 'Hết hạt giống rồi. Mua thêm ở Cửa hàng nhé!', en: 'Out of seeds. Buy more in the Shop!' },
  pickSeed: { vi: 'Chọn hạt giống rồi chạm vào ô đất trống', en: 'Pick a seed, then tap an empty plot' },
  noEmpty: { vi: 'Không còn ô đất trống', en: 'No empty plots left' },
  planted: { vi: 'Đã gieo {n} hạt', en: 'Planted {n} seeds' },
  plantAll: { vi: 'Gieo hết', en: 'Plant all' },
  grows: { vi: 'Chín sau', en: 'Ripe in' },
  waterIn: { vi: 'Tưới nước sau', en: 'Water in' },
  needsWater: { vi: 'Cần tưới nước!', en: 'Needs water!' },
  watered: { vi: 'Đã tưới', en: 'Watered' },
  mutationChance: { vi: 'Xác suất đột biến', en: 'Mutation chance' },
  output: { vi: 'Sản lượng', en: 'Harvest' },
  ripeNow: { vi: 'Đã chín! Chạm để thu hoạch', en: 'Ripe! Tap to harvest' },
  mysteryPlant: { vi: 'Cây bí ẩn', en: 'Mystery plant' },
  removePlant: { vi: 'Nhổ cây này?', en: 'Pull up this plant?' },
  removed: { vi: 'Đã nhổ cây', en: 'Plant removed' },
  stageSeed: { vi: 'Hạt giống', en: 'Seed' },
  stageSprout: { vi: 'Nảy mầm', en: 'Sprout' },
  stageGrow: { vi: 'Đang lớn', en: 'Growing' },
  stageRipe: { vi: 'Chín', en: 'Ripe' },
  friendHelped: { vi: '{name} đã tưới cây giúp bé!', en: '{name} watered your plants!' },
  whileAway: { vi: 'Khi bé đi vắng, {name} đã tưới {n} cây giúp bé', en: 'While you were away, {name} watered {n} plants for you' },
  newChest: { vi: 'Bé nhận được {chest}!', en: 'You got a {chest}!' },

  // stats
  price: { vi: 'Giá', en: 'Price' },
  variants: { vi: 'Số kiểu dáng', en: 'Looks to collect' },
  xpGain: { vi: 'Kinh nghiệm', en: 'XP' },
  yield: { vi: 'Sản lượng', en: 'Harvest' },
  sellEach: { vi: 'Giá bán mỗi quả', en: 'Sells for (each)' },
  growTime: { vi: 'Thời gian lớn', en: 'Grow time' },
  mutations: { vi: 'Kiểu đột biến', en: 'Mutations' },
  random: { vi: 'Ngẫu nhiên', en: 'Random' },
  packPool: { vi: 'Có thể ra {n} loại cây', en: 'Can grow {n} kinds of plant' },
  packBonus: { vi: 'Đột biến +{n}%', en: 'Mutation +{n}%' },
  tagExp: { vi: 'Nhiều EXP', en: 'Lots of XP' },
  tagSpecial: { vi: 'Đặc biệt', en: 'Special' },
  tagLucky: { vi: 'Dễ đột biến', en: 'Lucky' },
  tagMutation: { vi: 'Đột biến', en: 'Mutated' },
  qty: { vi: 'Số lượng', en: 'Amount' },

  // shop
  shopTitle: { vi: 'Mua hạt giống', en: 'Buy Seeds' },
  buy: { vi: 'Mua', en: 'Buy' },
  bought: { vi: 'Đã mua {n} {name}', en: 'Bought {n} {name}' },
  notEnoughCoins: { vi: 'Chưa đủ xu', en: 'Not enough coins' },
  unlockAt: { vi: 'Mở ở cấp {n}', en: 'Opens at level {n}' },
  owned: { vi: 'Đang có', en: 'You have' },
  tabAll: { vi: 'Tất cả', en: 'All' },
  tabNormal: { vi: 'Thường', en: 'Normal' },
  tabSpecial: { vi: 'Đặc biệt', en: 'Special' },
  tabPacks: { vi: 'Gói bí ẩn', en: 'Mystery' },
  free: { vi: 'Miễn phí', en: 'Free' },
  infinite: { vi: 'Không giới hạn', en: 'Unlimited' },

  // warehouse
  barnTitle: { vi: 'Kho', en: 'Barn' },
  crops: { vi: 'Nông sản', en: 'Crops' },
  useful: { vi: 'Hữu ích', en: 'Useful' },
  sell: { vi: 'Bán', en: 'Sell' },
  sellAll: { vi: 'Bán hết', en: 'Sell all' },
  sellAllConfirm: { vi: 'Bán {n} nông sản được {coins} xu?', en: 'Sell {n} crops for {coins} coins?' },
  sold: { vi: 'Đã bán được {coins} xu', en: 'Sold for {coins} coins' },
  barnEmpty: { vi: 'Kho đang trống. Thu hoạch cây để có nông sản nhé!', en: 'The barn is empty. Harvest plants to fill it!' },
  keptForUpgrade: { vi: 'Giữ lại để nâng cấp', en: 'Kept for the upgrade' },
  usefulNote: { vi: 'Những nông sản này cần cho lần nâng cấp trang trại tiếp theo. Nút "Bán hết" sẽ giữ lại chúng.', en: 'These crops are needed for your next farm upgrade. "Sell all" keeps them.' },
  usefulNone: { vi: 'Lần nâng cấp tiếp theo không cần nông sản.', en: 'Your next upgrade needs no crops.' },
  need: { vi: 'Cần', en: 'Need' },

  // book
  bookTitle: { vi: 'Bách khoa cây trồng', en: 'Plant Collection' },
  discovered: { vi: 'đã khám phá', en: 'discovered' },
  claim: { vi: 'Nhận', en: 'Claim' },
  claimed: { vi: 'Đã nhận', en: 'Claimed' },
  setDone: { vi: 'Đủ bộ!', en: 'Complete!' },
  bookHint: { vi: 'Thu hoạch đủ mọi kiểu của một loại cây để nhận quà.', en: 'Collect every look of a plant to get a gift.' },

  // quests
  questsTitle: { vi: 'Nhiệm vụ', en: 'Quests' },
  mainQuests: { vi: 'Nhiệm vụ chính', en: 'Main' },
  dailyQuests: { vi: 'Hằng ngày', en: 'Daily' },
  chapter: { vi: 'Chương {n}', en: 'Chapter {n}' },
  goTo: { vi: 'Đi đến', en: 'Go' },
  chapterDone: { vi: 'Hoàn thành chương! Mở chương mới', en: 'Chapter complete! A new one begins' },
  dailyReset: { vi: 'Nhiệm vụ mới mỗi ngày', en: 'New quests every day' },
  q_planted: { vi: 'Gieo {n} hạt giống', en: 'Plant {n} seeds' },
  q_watered: { vi: 'Tưới nước {n} lần', en: 'Water plants {n} times' },
  q_harvested: { vi: 'Thu hoạch {n} nông sản', en: 'Harvest {n} crops' },
  q_sold: { vi: 'Bán {n} nông sản', en: 'Sell {n} crops' },
  q_level: { vi: 'Nâng trang trại lên cấp {n}', en: 'Reach farm level {n}' },
  q_bought: { vi: 'Mua {n} hạt giống', en: 'Buy {n} seeds' },
  q_mutations: { vi: 'Thu hoạch {n} cây đột biến', en: 'Harvest {n} mutated plants' },
  q_visits: { vi: 'Đến thăm nông trại bạn bè {n} lần', en: "Visit a friend's farm {n} times" },
  q_friendWater: { vi: 'Tưới cây giúp bạn bè {n} lần', en: "Water friends' plants {n} times" },
  q_stolen: { vi: 'Hái trộm nông sản {n} lần', en: 'Sneak-pick crops {n} times' },
  q_discovered: { vi: 'Khám phá {n} kiểu cây trong Bách khoa', en: 'Discover {n} plant looks' },
  q_chestsOpened: { vi: 'Mở {n} rương thần kỳ', en: 'Open {n} magic chests' },
  q_earned: { vi: 'Kiếm {n} xu từ bán nông sản', en: 'Earn {n} coins selling crops' },
  q_sets: { vi: 'Hoàn thành {n} bộ sưu tập', en: 'Complete {n} collection sets' },
  q_tier4: { vi: 'Thu hoạch {n} cây hạng đỏ', en: 'Harvest {n} red-tier plants' },
  q_login: { vi: 'Vào nông trại hôm nay', en: 'Visit your farm today' },

  // chests
  chestsTitle: { vi: 'Thần kỳ', en: 'Magic' },
  chestsIntro: { vi: 'Gieo hạt, tưới nước, thu hoạch và mở rương để tích Năng lượng thần kỳ. Đầy thanh năng lượng sẽ nhận được rương.', en: 'Planting, watering, harvesting and opening chests fill the magic bar. A full bar gives you a chest.' },
  energy: { vi: 'Năng lượng', en: 'Energy' },
  chest_green: { vi: 'Rương thần kỳ', en: 'Magic Chest' },
  chest_blue: { vi: 'Rương thần kỳ hiếm', en: 'Rare Magic Chest' },
  chest_purple: { vi: 'Rương thần kỳ cực hiếm', en: 'Epic Magic Chest' },
  chest_red: { vi: 'Rương thần kỳ huyền thoại', en: 'Legendary Magic Chest' },
  chestDesc_green: { vi: '75% nhận xu hoặc hạt giống thường, 25% nhận vật phẩm hiếm.', en: '75% coins or common seeds, 25% a rare item.' },
  chestDesc_blue: { vi: '70% nhận nhiều xu hoặc hạt giống, 30% nhận gói bí ẩn.', en: '70% lots of coins or seeds, 30% a mystery pack.' },
  chestDesc_purple: { vi: '60% nhận gói cực hiếm hoặc hạt quý, 40% nhận vật phẩm huyền thoại.', en: '60% a super-rare pack or rare seeds, 40% a legendary item.' },
  chestDesc_red: { vi: '40% nhận vật phẩm cực hiếm, 60% nhận vật phẩm huyền thoại.', en: '40% a super-rare item, 60% a legendary item.' },
  openAll: { vi: 'Mở tất cả x{n}', en: 'Open all x{n}' },
  noChests: { vi: 'Chưa có rương loại này', en: 'No chests of this kind yet' },
  youGot: { vi: 'Bé nhận được', en: 'You got' },

  // upgrade
  upgradeTitle: { vi: 'Nâng cấp trang trại', en: 'Farm Upgrade' },
  current: { vi: 'Hiện tại', en: 'Now' },
  next: { vi: 'Cấp tiếp', en: 'Next' },
  bonusGrow: { vi: 'Cây lớn nhanh hơn', en: 'Plants grow faster' },
  bonusPrice: { vi: 'Giá nông sản tăng', en: 'Crop price bonus' },
  bonusEnergy: { vi: 'Năng lượng tăng', en: 'Energy bonus' },
  bonusMutation: { vi: 'Đột biến cơ bản', en: 'Base mutation' },
  plots: { vi: 'Ô đất', en: 'Plots' },
  newUnlocks: { vi: 'Mở khóa mới', en: 'New unlocks' },
  morePlots: { vi: '+{n} ô đất', en: '+{n} plots' },
  upgrade: { vi: 'Nâng cấp', en: 'Upgrade' },
  needXp: { vi: 'Cần thêm {n} kinh nghiệm', en: 'Need {n} more XP' },
  maxLevel: { vi: 'Trang trại đã đạt cấp cao nhất!', en: 'Your farm is at the top level!' },
  levelUp: { vi: 'Lên cấp {n}!', en: 'Level {n}!' },
  levelUpSub: { vi: 'Trang trại của bé lớn hơn rồi', en: 'Your farm just grew' },

  // friends
  friendsTab: { vi: 'Bạn bè', en: 'Friends' },
  strangersTab: { vi: 'Gợi ý', en: 'Neighbours' },
  canSteal: { vi: 'Có thể hái', en: 'Can pick' },
  canWater: { vi: 'Tưới nước', en: 'Needs water' },
  nothing: { vi: 'Đang lớn', en: 'Growing' },
  stealLeftFriend: { vi: 'Hôm nay bé còn hái được ở nhà bạn bè: {n}/{max}', en: 'Picks left today at friends: {n}/{max}' },
  stealLeftStranger: { vi: 'Hôm nay bé còn hái được ở nhà hàng xóm: {n}/{max}', en: 'Picks left today at neighbours: {n}/{max}' },
  visiting: { vi: 'Nông trại của {name}', en: "{name}'s farm" },
  stoleOk: { vi: 'Hái được {n} {name}!', en: 'Picked {n} {name}!' },
  stealTaken: { vi: 'Cây này bé đã hái rồi', en: 'You already picked this one' },
  stealLimit: { vi: 'Hôm nay bé đã hái đủ rồi, mai quay lại nhé!', en: "That's enough picking for today. Come back tomorrow!" },
  helpedFriend: { vi: 'Cảm ơn bé đã tưới cây!', en: 'Thanks for watering!' },
  notRipeFriend: { vi: 'Cây chưa chín', en: 'Not ripe yet' },

  // reveal
  newVariety: { vi: 'Loại cây mới!', en: 'New plant!' },
  newMutation: { vi: 'Đột biến mới!', en: 'New mutation!' },
  addedToBook: { vi: 'Đã thêm vào Bách khoa', en: 'Added to your collection' },
  mysteryWas: { vi: 'Gói bí ẩn đã mọc thành', en: 'The mystery seed grew into' },

  // settings & welcome
  settingsTitle: { vi: 'Cài đặt', en: 'Settings' },
  farmerName: { vi: 'Tên của bé', en: 'Your name' },
  avatar: { vi: 'Hình đại diện', en: 'Avatar' },
  language: { vi: 'Ngôn ngữ', en: 'Language' },
  sound: { vi: 'Âm thanh', en: 'Sound' },
  music: { vi: 'Nhạc nền', en: 'Music' },
  graphics: { vi: 'Đồ họa', en: 'Graphics' },
  gfxHigh: { vi: 'Đẹp', en: 'Pretty' },
  gfxLow: { vi: 'Nhanh', en: 'Fast' },
  on: { vi: 'Bật', en: 'On' },
  off: { vi: 'Tắt', en: 'Off' },
  resetGame: { vi: 'Chơi lại từ đầu', en: 'Start over' },
  resetConfirm: { vi: 'Xóa hết nông trại và chơi lại?', en: 'Erase the whole farm and start over?' },
  resetYes: { vi: 'Xóa và chơi lại', en: 'Erase and restart' },
  saveNote: { vi: 'Trò chơi tự lưu trên trình duyệt này.', en: 'The game saves itself in this browser.' },
  welcomeTitle: { vi: 'Chào mừng bé!', en: 'Welcome!' },
  welcomeText: { vi: 'Đây là hòn đảo nông trại trên mây của bé. Trồng cây, chăm sóc và săn những cây đột biến thật đẹp nhé!', en: 'This is your farm island in the clouds. Grow plants, look after them and hunt for amazing mutations!' },
  how1: { vi: 'Gieo hạt vào ô đất', en: 'Plant seeds in the soil' },
  how2: { vi: 'Tưới nước để được thêm quả và dễ đột biến', en: 'Water for extra crops and more mutations' },
  how3: { vi: 'Thu hoạch rồi bán ở Kho', en: 'Harvest, then sell in the Barn' },
  how4: { vi: 'Sưu tầm cây đột biến lấp lánh', en: 'Collect sparkly mutated plants' },
  start: { vi: 'Bắt đầu chơi', en: "Let's play" },
  credits: { vi: 'Mô hình 3D vẽ bằng three.js. Làm tặng bé với tình yêu.', en: '3D models drawn with three.js. Made with love.' },

  // durations
  d_s: { vi: '{s} giây', en: '{s}s' },
  d_m: { vi: '{m} phút', en: '{m}m' },
  d_ms: { vi: '{m} phút {s} giây', en: '{m}m {s}s' },
  d_h: { vi: '{h} giờ', en: '{h}h' },
  d_hm: { vi: '{h} giờ {m} phút', en: '{h}h {m}m' },
};

export function t(key, params) {
  const entry = S[key];
  let str = entry ? entry[lang] ?? entry.vi : key;
  if (params) for (const [k, v] of Object.entries(params)) str = str.replaceAll(`{${k}}`, v);
  return str;
}

export const hasKey = (key) => key in S;
export const allKeys = () => Object.keys(S);
export const STRINGS = S;

export const fmtNum = (n) => Math.floor(n).toLocaleString(lang === 'vi' ? 'vi-VN' : 'en-US');

export function fmtDur(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return m ? t('d_hm', { h, m }) : t('d_h', { h });
  if (m > 0) return s && m < 10 ? t('d_ms', { m, s }) : t('d_m', { m });
  return t('d_s', { s });
}

export function fmtClock(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const p = (n) => String(n).padStart(2, '0');
  return h ? `${p(h)}:${p(m)}:${p(s)}` : `${p(m)}:${p(s)}`;
}

/** Name of a crop variety, e.g. "Hoa hướng dương Hồng Ngọc" / "Ruby Sunflower". */
export function cropName(cropId, variant = 0) {
  const crop = CROP_BY_ID[cropId];
  const base = crop.name[lang];
  const look = lookOf(crop, variant);
  if (!look) return base;
  const style = STYLES[look.style].name[lang];
  return lang === 'vi' ? `${base} ${style}` : `${style} ${base}`;
}

export function seedName(id) {
  const def = CROP_BY_ID[id] || PACK_BY_ID[id];
  return def ? def.name[lang] : id;
}
