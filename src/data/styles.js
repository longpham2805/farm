// Mutation looks. When a ripe plant mutates it takes one of these looks.
// The 3D renderer reads the material settings; the UI reads name/aura.

export const STYLES = {
  gold: {
    name: { vi: 'Vàng Kim', en: 'Golden' }, aura: '#ffd23f',
    mat: { color: '#ffcf3a', metalness: 0.85, roughness: 0.28, emissive: '#7a4a00', emissiveIntensity: 0.35 },
  },
  ruby: {
    name: { vi: 'Hồng Ngọc', en: 'Ruby' }, aura: '#ff4f9a',
    mat: { color: '#ff3d7f', metalness: 0.2, roughness: 0.2, emissive: '#8a0035', emissiveIntensity: 0.35, clearcoat: 1 },
  },
  amethyst: {
    name: { vi: 'Tử Tinh', en: 'Amethyst' }, aura: '#b06cff',
    mat: { color: '#a45cff', metalness: 0.25, roughness: 0.22, emissive: '#3c0a8a', emissiveIntensity: 0.45, clearcoat: 1 },
  },
  frost: {
    name: { vi: 'Băng Giá', en: 'Frost' }, aura: '#7fe3ff',
    mat: { color: '#bff2ff', metalness: 0.1, roughness: 0.08, emissive: '#2a9fd0', emissiveIntensity: 0.45, opacity: 0.86, clearcoat: 1 },
    whole: true,
  },
  jade: {
    name: { vi: 'Ngọc Bích', en: 'Jade' }, aura: '#41e6a0',
    mat: { color: '#38d99a', metalness: 0.15, roughness: 0.25, emissive: '#00603a', emissiveIntensity: 0.4, clearcoat: 1 },
  },
  blaze: {
    name: { vi: 'Hỏa Diệm', en: 'Blaze' }, aura: '#ff7a1a',
    mat: { color: '#ff6a10', metalness: 0.1, roughness: 0.4, emissive: '#ff3b00', emissiveIntensity: 0.9 },
  },
  pearl: {
    name: { vi: 'Ngọc Trai', en: 'Pearl' }, aura: '#ffd6f2',
    mat: { color: '#fff6fb', metalness: 0.1, roughness: 0.18, emissive: '#5a4a66', emissiveIntensity: 0.25, clearcoat: 1, iridescence: 1 },
    whole: true,
  },
  shadow: {
    name: { vi: 'Bóng Đêm', en: 'Shadow' }, aura: '#8a5cff',
    mat: { color: '#3a2466', metalness: 0.4, roughness: 0.3, emissive: '#6a2cff', emissiveIntensity: 0.7 },
    whole: true,
  },
  rainbow: {
    name: { vi: 'Cầu Vồng', en: 'Rainbow' }, aura: '#ff9ff3',
    mat: { color: '#ff7ad9', metalness: 0.3, roughness: 0.2, emissive: '#552255', emissiveIntensity: 0.5, clearcoat: 1 },
    rainbow: true,
  },
};

const BASIC = ['gold', 'ruby', 'amethyst', 'frost', 'jade', 'blaze'];

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Looks for every variant of a crop. Index 0 is the normal crop (null).
// Rarer variants (higher index) get a crown, then a halo.
export function variantLooks(crop) {
  const n = crop.variants;
  const offset = hash(crop.id) % BASIC.length;
  const basics = BASIC.map((_, i) => BASIC[(i + offset) % BASIC.length]);
  let ids;
  if (n === 3) ids = [basics[0], basics[1]];
  else if (n === 5) ids = [basics[0], basics[1], basics[2], 'pearl'];
  else ids = [basics[0], basics[1], basics[2], basics[3], 'pearl', 'shadow', 'rainbow'];
  const looks = [null];
  ids.forEach((id, i) => {
    const v = i + 1;
    looks.push({
      style: id,
      crown: n >= 5 && v >= n - 2,
      halo: n >= 8 && v >= n - 2,
      rank: v / (n - 1), // 0..1, drives glow strength
    });
  });
  return looks;
}

const lookCache = new Map();
export function lookOf(crop, variant) {
  if (!variant) return null;
  if (!lookCache.has(crop.id)) lookCache.set(crop.id, variantLooks(crop));
  return lookCache.get(crop.id)[variant] || null;
}

// The sunflower in the original game mutates into red and purple, so pin it.
lookCache.set('sunflower', [null,
  { style: 'ruby', crown: false, halo: false, rank: 0.5 },
  { style: 'amethyst', crown: false, halo: false, rank: 1 }]);
