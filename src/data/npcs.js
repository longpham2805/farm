// Pretend neighbours. Their farms grow on their own while you play.
// Friends can be visited any time; strangers ("suggested") only give 3 picks a day.

export const NPCS = [
  { id: 'meo', name: 'Mèo Mun', avatar: '🐱', level: 6, fence: '#c98a4b', roof: '#ff8fa3' },
  { id: 'gau', name: 'Gấu Trúc Bông', avatar: '🐼', level: 9, fence: '#9c6b3f', roof: '#7fc8a9' },
  { id: 'tho', name: 'Thỏ Ngọc', avatar: '🐰', level: 13, fence: '#e0b07a', roof: '#c3a6ff' },
  { id: 'cun', name: 'Cún Vàng', avatar: '🐶', level: 4, fence: '#b07a45', roof: '#ffd166' },
  { id: 'ech', name: 'Ếch Xanh', avatar: '🐸', level: 19, fence: '#8a5a32', roof: '#9be564' },
  { id: 'khi', name: 'Khỉ Con', avatar: '🐵', level: 11, fence: '#a8743f', roof: '#ffb26b' },
  { id: 'ho', name: 'Hổ Con', avatar: '🐯', level: 17, fence: '#94612f', roof: '#ff9f43', stranger: true },
  { id: 'chim', name: 'Cánh Cụt Nhỏ', avatar: '🐧', level: 24, fence: '#7d8fa3', roof: '#74c0fc', stranger: true },
  { id: 'lan', name: 'Kỳ Lân', avatar: '🦄', level: 29, fence: '#b48ad6', roof: '#ffc6ff', stranger: true },
  { id: 'heo', name: 'Heo Hồng', avatar: '🐷', level: 8, fence: '#c27b5b', roof: '#ffafcc', stranger: true },
];

export const NPC_BY_ID = Object.fromEntries(NPCS.map((n) => [n.id, n]));
