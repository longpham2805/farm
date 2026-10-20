// The interface's icons (HUD buttons, coins, XP, locks...), drawn in the same look as the crop pictures (draw.js) but
// without faces, in place of emoji, which every phone draws in its own style.

import { OL, LEAF, LEAF_DARK, f, TAU, circle, ellipse, rrect, body, stroke, line, leaf, dots, star, face, gloss, svgDoc, svgImg } from './draw.js';

const GOLD = '#ffd23a';
const GOLD_DARK = '#eda400';
const WOOD_LIGHT = '#d9944f';
const WOOD_MID = '#b8763a';
const RED = '#ff5a5a';
const RED_DARK = '#d83a3a';

/** A gear's outline: n square teeth round a ring. */
function gearPath(cx, cy, rOut, rIn, n) {
  let d = '';
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const p = (r, da) => `${f(cx + Math.cos(a + da) * r)} ${f(cy + Math.sin(a + da) * r)}`;
    const half = Math.PI / n;
    d += `${i ? 'L' : 'M'}${p(rIn, -half * 0.62)}L${p(rOut, -half * 0.42)}L${p(rOut, half * 0.42)}L${p(rIn, half * 0.62)}`
      + `A${rIn} ${rIn} 0 0 1 ${p(rIn, half * 1.38)}`;
  }
  return `${d}Z`;
}

// A heart pointing its tip at (0, 0), lobes up: one leaf of the clover.
const HEART = 'M0 0C-4 -6 -14 -8 -16 -16C-18 -26 -6 -30 0 -21C6 -30 18 -26 16 -16C14 -8 4 -6 0 0Z';

/** A chest; the HUD's is wooden, the chests you win are in their tier's colours. */
function chestArt([base, dark, lid] = [WOOD_LIGHT, WOOD_MID, '#e0a060'], [trim, trimDark] = [GOLD, GOLD_DARK]) {
  const band = (x) => body(rrect(x, 24, 9, 62, 2), trim, trimDark, '', { dx: 2, dy: -2, sw: 2.8 });
  return body(rrect(14, 48, 72, 40, 6), base, dark, line('M14 68L86 68', dark, 2.2))
    + body('M14 50L14 40Q14 18 50 18Q86 18 86 40L86 50Z', lid, dark, line('M18 34Q50 26 82 34', dark, 2))
    + band(25) + band(66)
    + body(rrect(10, 44, 80, 9, 4), trim, trimDark, '', { dx: 2, dy: -2, sw: 2.8 })
    + body(rrect(41, 40, 18, 22, 5), trim, trimDark, `<circle cx="50" cy="49" r="3" fill="${OL}"/><path d="M48.5 50L47.5 57L52.5 57L51.5 50Z" fill="${OL}"/>`, { dx: 2, dy: -2, sw: 2.8 })
    + gloss(70, 27, 2.4, 6, -60);
}

const CHEST_TIERS = {
  green: [['#5cc46a', '#3a9a4a', '#72d67e'], ['#e4e8ee', '#b8c0cc']],
  blue: [['#4aa8ff', '#2a74c9', '#6cbcff'], [GOLD, GOLD_DARK]],
  purple: [['#a066ff', '#6c3ccf', '#b688ff'], [GOLD, GOLD_DARK]],
  red: [['#ff4f6d', '#c22a48', '#ff7088'], [GOLD, GOLD_DARK]],
};

/** A hand: fingers as [x, top, height], a thumb turned by thumbRot, the palm. */
function hand(fingers, thumbRot) {
  const SKIN = '#ffd2a8';
  const SKIN_DARK = '#f0b282';
  return fingers.map(([x, y, h]) => body(rrect(x, y, 11, h, 5.5), SKIN, SKIN_DARK, '', { dx: 2, dy: -2, sw: 3 })).join('')
    + body(rrect(14, 52, 30, 12, 6), SKIN, SKIN_DARK, '', { transform: `rotate(${thumbRot} 40 60)`, dx: 2, dy: -2, sw: 3 })
    + body(rrect(26, 42, 50, 50, 18), SKIN, SKIN_DARK);
}

/** A curved arrow (the sync icon): from angle a0 to a1 (degrees) round (50, 50), its head at a1. */
function arcArrow(a0, a1, r, color, dark) {
  const rad = (a) => (a * Math.PI) / 180;
  const at = (a, rr = r) => [50 + Math.cos(rad(a)) * rr, 50 + Math.sin(rad(a)) * rr];
  const [x0, y0] = at(a0);
  const [x1, y1] = at(a1);
  const dir = [Math.sin(rad(a1)), -Math.cos(rad(a1))];
  const perp = [-dir[1], dir[0]];
  const tip = [x1 + dir[0] * 17, y1 + dir[1] * 17];
  const b1 = [x1 + perp[0] * 13, y1 + perp[1] * 13];
  const b2 = [x1 - perp[0] * 13, y1 - perp[1] * 13];
  return stroke(`M${f(x0)} ${f(y0)}A${r} ${r} 0 0 0 ${f(x1)} ${f(y1)}`, color, 9)
    + body(`M${f(tip[0])} ${f(tip[1])}L${f(b1[0])} ${f(b1[1])}L${f(b2[0])} ${f(b2[1])}Z`, color, dark, '', { dx: 1.5, dy: -1.5, sw: 3 });
}

const CLOUD = 'M24 78Q8 78 8 63Q8 49 23 48Q25 30 44 28Q58 26 65 38Q72 32 80 36Q93 42 91 56Q97 60 95 68Q93 78 82 78Z';
const TRAY = 'M8 60L30 60L36 70L64 70L70 60L92 60L92 86Q92 93 85 93L15 93Q8 93 8 86Z';

const ICONS = {
  earth() {
    const land = 'M20 30Q30 20 41 25Q47 30 42 38Q35 43 38 51Q41 59 31 61Q22 56 18 46Q15 36 20 30Z'
      + 'M57 15Q71 17 78 29Q71 34 64 30Q57 25 57 15Z'
      + 'M56 52Q67 45 77 51Q86 58 81 71Q74 84 63 79Q59 71 61 65Q53 60 56 52Z'
      + 'M28 74Q36 70 42 76Q40 84 32 82Q26 79 28 74Z';
    const clouds = `<ellipse cx="34" cy="16" rx="9" ry="3.2" fill="#fff" opacity="0.85"/><ellipse cx="74" cy="42" rx="8" ry="3" fill="#fff" opacity="0.85"/>`
      + `<ellipse cx="24" cy="66" rx="7" ry="2.6" fill="#fff" opacity="0.85"/>`;
    return body(circle(50, 50, 43), '#4ab4ff', '#2a86dc', `<path d="${land}" fill="#3aa83a"/><path d="${land}" fill="#62d24e" transform="translate(2 -2)"/>${clouds}`)
      + gloss(68, 24, 4, 9.5, -45, [81, 40, 2.4]);
  },

  shop() {
    const n = 6;
    const w = 88 / n;
    let edge = '';
    for (let i = 0; i < n; i++) edge += `Q${f(94 - (i + 0.5) * w)} 53 ${f(94 - (i + 1) * w)} 42`;
    const awning = `M10 22L90 22L94 42${edge}Z`;
    const stripes = Array.from({ length: n }, (_, i) => (i % 2 ? '' : `<rect x="${f(6 + i * w)}" y="0" width="${f(w)}" height="60" fill="${RED}"/>`)).join('');
    return stroke('M22 44L22 84', '#a8683a', 5) + stroke('M78 44L78 84', '#a8683a', 5)
      + body(circle(34, 60, 10), '#ff4a3a', '#d8301e') + body(circle(52, 58, 10), '#ffa21f', '#f07c0c') + body(circle(69, 60, 9), '#7ad84a', '#52b83a')
      + body(rrect(10, 66, 80, 24, 5), WOOD_LIGHT, WOOD_MID, line('M12 78L88 78', '#a8683a', 2.2))
      + body(awning, '#fff6ea', '#f0e2cc', stripes)
      + body(rrect(6, 12, 88, 12, 6), '#e8483a', '#c03228')
      + gloss(80, 18, 1.6, 4, -70);
  },

  chest() {
    return chestArt();
  },

  quests() {
    return body(rrect(22, 16, 56, 68, 4), '#fff3cf', '#f0dca0', line('M32 34L68 34M32 46L68 46M32 58L56 58', '#c8a46a', 3.2))
      + body(rrect(14, 8, 72, 14, 7), '#f5d690', '#e0b868') + body(rrect(14, 78, 72, 14, 7), '#f5d690', '#e0b868')
      + body(circle(66, 66, 10), RED, RED_DARK, '', { dx: 2, dy: -2, sw: 3 })
      + stroke('M61 66L65 70L72 62', '#fff', 2.6);
  },

  settings() {
    return body(gearPath(50, 50, 43, 33, 8), '#b8c6d4', '#8ea0b4', `<circle cx="50" cy="50" r="24" fill="none" stroke="#9aacbf" stroke-width="3"/>`)
      + `<circle cx="50" cy="50" r="12" fill="#fffbe8" stroke="${OL}" stroke-width="3.4"/>`
      + gloss(70, 28, 2.6, 6, -45);
  },

  barn() {
    const door = body(rrect(33, 56, 34, 32, 2), '#fff6ea', '#e8dccb',
      `<rect x="37.5" y="60.5" width="25" height="23" fill="#e8483a"/>${line('M38 61L62 83M62 61L38 83', '#fff6ea', 3.6)}`);
    return body('M10 54L22 30L50 14L78 30L90 54L88 88L12 88Z', '#e8483a', '#c03228', line('M24 50V88M76 50V88', '#d03a2e', 2))
      + line('M14 52L25 32L50 19L75 32L86 52', '#fff6ea', 4.4)
      + door
      + body(rrect(42, 30, 16, 16, 2), '#6b3a20', '#5a2e18', `<rect x="40" y="39" width="20" height="8" fill="${GOLD}"/>`, { sw: 2.8 });
  },

  seeds() {
    return body('M12 80Q12 64 50 64Q88 64 88 80Q88 90 78 90L22 90Q12 90 12 80Z', '#a8683a', '#8a5028', dots([[28, 76], [44, 82], [64, 78], [74, 84]], 1.8, '#c88a5a'))
      + stroke('M50 70Q50 56 52 42', LEAF, 4)
      + leaf(52, 44, 36, 15, -30, '#5cd04a') + leaf(50, 52, 32, 14, -158, LEAF)
      + gloss(70, 30, 2, 5, -60);
  },

  friends() {
    const ear = (x, y, r) => `<g transform="rotate(${r} ${x} ${y + 14})">${body(ellipse(x, y, 7, 17), '#fff6f0', '#ecd6cc', `<ellipse cx="${x}" cy="${y + 2}" rx="3" ry="11" fill="#ffb3c6"/>`, { dx: 2, dy: -2, sw: 3 })}</g>`;
    return body(circle(18, 32, 9), '#c8884a', '#a86a32', '', { dx: 2, dy: -2, sw: 3 }) + body(circle(46, 28, 9), '#c8884a', '#a86a32', '', { dx: 2, dy: -2, sw: 3 })
      + body(circle(32, 50, 23), '#c8884a', '#a86a32', `<ellipse cx="32" cy="60" rx="10" ry="7.5" fill="#f2d0a0"/>`)
      + `<ellipse cx="32" cy="56.5" rx="3.4" ry="2.4" fill="${OL}"/>` + face(32, 47, 0.52)
      + ear(60, 30, -12) + ear(78, 32, 14)
      + body(circle(68, 62, 23), '#fff6f0', '#ecd6cc') + face(68, 61, 0.55);
  },

  book() {
    const emblem = `<circle cx="48" cy="44" r="15" fill="#fff6d8" stroke="${OL}" stroke-width="2.6"/>`
      + leaf(48, 52, 15, 6.5, -55, '#5cd04a') + leaf(48, 52, 13, 6, -135, LEAF);
    return body(rrect(28, 16, 56, 72, 6), '#fff6dc', '#eadcb8', line('M80 22V82', '#d8c8a0', 2))
      + body(rrect(16, 12, 60, 72, 6), '#4cb860', '#2f8a43', `<rect x="16" y="12" width="10" height="72" fill="#3a9a4e"/>`)
      + emblem
      + `<path d="M58 82V95L63 91L68 95V82Z" fill="${RED}" stroke="${OL}" stroke-width="2.6" stroke-linejoin="round"/>`
      + gloss(66, 22, 2, 5, -50);
  },

  home() {
    return body(rrect(64, 16, 11, 22, 2), '#c8684a', '#a8503a')
      + body(rrect(20, 46, 60, 42, 3), '#fff1d8', '#ecd6b0')
      + body('M10 52L50 16L90 52Q92 58 86 58L14 58Q8 58 10 52Z', '#e8483a', '#c03228')
      + body(rrect(42, 64, 16, 24, 3), '#a8683a', '#8a5028', `<circle cx="54" cy="77" r="1.6" fill="${GOLD}"/>`, { sw: 2.8 })
      + body(rrect(25, 64, 12, 12, 2), '#8fd3ff', '#5ab4ec', line('M31 64V76M25 70H37', '#fff', 1.6), { sw: 2.6 })
      + body(rrect(63, 64, 12, 12, 2), '#8fd3ff', '#5ab4ec', line('M69 64V76M63 70H75', '#fff', 1.6), { sw: 2.6 });
  },

  basket() {
    const weave = line('M18 64L82 64M20 74L80 74M30 56L33 86M50 56V88M70 56L67 86', '#a8683a', 2);
    return stroke('M24 52Q50 4 76 52', '#c98a4b', 5)
      + body(circle(38, 46, 12), '#ff4a3a', '#d8301e') + body(circle(62, 46, 12), '#ffa21f', '#f07c0c')
      + body('M14 54L86 54L78 86Q50 94 22 86Z', WOOD_LIGHT, WOOD_MID, weave)
      + body(rrect(10, 48, 80, 11, 5.5), '#e8a860', '#c98a4b')
      + gloss(44, 40, 1.6, 3.6, -45) + gloss(68, 40, 1.6, 3.6, -45);
  },

  water() {
    return body('M50 8C60 26 80 44 80 63C80 81 66 92 50 92C34 92 20 81 20 63C20 44 40 26 50 8Z', '#4ab4ff', '#2a8ae0')
      + gloss(64, 60, 4, 10, -15, [58, 80, 2.2]);
  },

  star() {
    return body(star(50, 53, 45, 21, 5, 0.16), GOLD, GOLD_DARK) + gloss(61, 38, 2.6, 6.5, -35);
  },

  energy() {
    return body('M60 4L18 56L45 56L35 96L82 40L55 40Z', '#b07aff', '#8a4ee8') + gloss(58, 22, 2, 7, 35);
  },

  mutation() {
    return body(star(46, 56, 40, 11, 4, 0.1), '#ffe066', '#ffbe1a')
      + body(star(80, 22, 15, 4.5, 4, 0.1), '#ffe066', '#ffbe1a', '', { dx: 2, dy: -2, sw: 2.8 })
      + body(circle(20, 20, 5), '#ffe066', '#ffbe1a', '', { dx: 1, dy: -1, sw: 2.4 });
  },

  lock() {
    return stroke('M31 48V34Q31 14 50 14Q69 14 69 34V48', '#b8c6d4', 7)
      + body(rrect(18, 42, 64, 48, 10), GOLD, GOLD_DARK, `<circle cx="50" cy="61" r="6.5" fill="${OL}"/><path d="M47 63L45 78L55 78L53 63Z" fill="${OL}"/>`)
      + gloss(70, 52, 2.2, 6, -20);
  },

  gift() {
    return `<g transform="rotate(-22 38 28)">${body(ellipse(36, 28, 14, 9), GOLD, GOLD_DARK, '', { sw: 3 })}</g>`
      + `<g transform="rotate(22 62 28)">${body(ellipse(64, 28, 14, 9), GOLD, GOLD_DARK, '', { sw: 3 })}</g>`
      + body(rrect(16, 48, 68, 42, 5), '#ff5a6a', '#d83a4a', `<rect x="44" y="40" width="12" height="60" fill="${GOLD}"/>`)
      + body(rrect(10, 34, 80, 17, 5), '#ff6a7a', '#e04858', `<rect x="43" y="30" width="14" height="30" fill="${GOLD}"/>`)
      + body(circle(50, 33, 6.5), GOLD, GOLD_DARK, '', { dx: 1, dy: -1, sw: 2.8 })
      + gloss(76, 40, 1.6, 3.4, -70);
  },

  lucky() {
    const heart = (r) => body(HEART, '#4cc24a', '#36a83a', line('M0 -2L0 -16', '#36a83a', 1.6), { transform: `translate(50 44) rotate(${r}) scale(1.15)`, dx: 2, dy: -2, sw: 3 });
    return stroke('M52 50Q58 74 72 90', '#3fae3a', 4.4) + heart(-45) + heart(45) + heart(135) + heart(225) + gloss(62, 26, 1.8, 4.5, -40);
  },

  check() {
    return body(circle(50, 50, 40), '#4cc24a', '#36a83a') + stroke('M30 52L44 66L70 36', '#fff', 8);
  },

  close() {
    return line('M28 28L72 72M72 28L28 72', OL, 13);
  },

  up() {
    return body('M50 6L90 48L66 48L66 92L34 92L34 48L10 48Z', '#4cc24a', '#36a83a') + gloss(62, 26, 2, 7, -45);
  },

  hand() {
    return hand([[28, 16, 40], [40, 8, 46], [52, 10, 44], [64, 18, 38]], 50);
  },

  point() {
    return body(rrect(42, 4, 14, 52, 7), '#ffd2a8', '#f0b282', '', { dx: 2, dy: -2, sw: 3 })
      + body(rrect(26, 40, 48, 52, 18), '#ffd2a8', '#f0b282', line('M40 52Q48 50 56 52M42 62Q50 60 58 62', '#e8a070', 2))
      + body(rrect(14, 52, 28, 12, 6), '#ffd2a8', '#f0b282', '', { transform: 'rotate(40 40 60)', dx: 2, dy: -2, sw: 3 });
  },

  mystery() {
    return stroke('M33 34Q33 12 50 12Q69 12 69 31Q69 43 57 49Q50 53 50 64', '#a066ff', 13)
      + body(circle(50, 83, 8), '#a066ff', '#7a40e0', '', { dx: 1.5, dy: -1.5, sw: 3 });
  },

  shovel() {
    return stroke('M40 60L76 24', '#c98a4b', 6) + stroke('M68 14L86 32', '#a8683a', 7)
      + body('M12 88Q6 66 24 54L46 76Q34 94 12 88Z', '#c4d0dc', '#94a6b8', line('M18 80L32 66', '#e8eef4', 2.4))
      + body(rrect(36, 56, 14, 10, 3), '#8ea0b4', '#6e8094', '', { transform: 'rotate(45 43 61)', sw: 2.8 });
  },

  trophy() {
    return stroke('M28 24Q10 24 12 38Q14 50 30 52', GOLD, 5) + stroke('M72 24Q90 24 88 38Q86 50 70 52', GOLD, 5)
      + body('M24 12L76 12L74 44Q72 64 50 66Q28 64 26 44Z', GOLD, GOLD_DARK, `<path d="${star(50, 36, 12, 5.5, 5, 0.15)}" fill="#ffe680"/>`)
      + body(rrect(43, 64, 14, 12, 2), GOLD, GOLD_DARK, '', { sw: 3 })
      + body(rrect(26, 76, 48, 14, 4), '#c98a4b', '#a8683a', `<rect x="40" y="80" width="20" height="6" rx="2" fill="${GOLD}"/>`)
      + gloss(64, 22, 2.4, 7, -20);
  },

  sunrise() {
    const rays = Array.from({ length: 7 }, (_, i) => {
      const a = Math.PI + (i / 6) * Math.PI;
      return `M${f(50 + Math.cos(a) * 32)} ${f(66 + Math.sin(a) * 32)}L${f(50 + Math.cos(a) * 42)} ${f(66 + Math.sin(a) * 42)}`;
    }).join('');
    return stroke(rays, '#ffb02e', 4.4)
      + body(circle(50, 66, 25), '#ffb02e', '#f08a00')
      + body('M2 80Q28 60 54 74Q76 62 98 74L98 94L2 94Z', '#62d24e', '#3fae3a');
  },

  plot() {
    return body('M8 46L50 70L50 84L8 60Z', '#7a4520', '#7a4520') + body('M50 70L92 46L92 60L50 84Z', '#8a5028', '#8a5028')
      + body('M50 22L92 46L50 70L8 46Z', '#b0703e', '#965a2e', line('M22 46L50 30M32 52L60 36M42 58L70 42M52 64L80 48', '#8a5028', 2.6))
      + stroke('M50 46Q50 38 52 32', LEAF, 3) + leaf(51, 36, 14, 6, -30, '#5cd04a') + leaf(51, 38, 12, 5, -160);
  },

  apple() {
    return stroke('M50 30Q50 20 54 14', '#8a5a2b', 3) + leaf(53, 20, 20, 7, -20)
      + body('M50 30C58 22 80 20 86 42C92 64 76 90 60 88C55 87 52 85 50 85C48 85 45 87 40 88C24 90 8 64 14 42C20 20 42 22 50 30Z', '#f2182a', '#c40c1c')
      + gloss(70, 40, 3.4, 8, -40, [79, 56, 1.8]);
  },

  bulb() {
    return body('M50 8C69 8 82 22 82 40C82 53 72 58 68 68L32 68C28 58 18 53 18 40C18 22 31 8 50 8Z', '#ffe066', '#ffc21a', line('M40 54Q44 40 50 52Q56 40 60 54', '#e8a000', 2.6))
      + body(rrect(32, 66, 36, 18, 4), '#c4d0dc', '#94a6b8', line('M34 72H66M34 78H66', '#8ea0b4', 2))
      + body(rrect(41, 84, 18, 8, 4), '#8ea0b4', '#6e8094', '', { sw: 3 })
      + gloss(64, 24, 3.6, 8, -40);
  },

  cloud() {
    return body(CLOUD, '#ffffff', '#d6e6f5') + gloss(70, 42, 2.4, 5.5, -60);
  },

  offline() {
    return body(CLOUD, '#e6ecf2', '#c4ced8') + stroke('M16 16L84 84', RED, 7);
  },

  warning() {
    return body('M50 8Q55 8 58 14L93 78Q96 88 86 88L14 88Q4 88 7 78L42 14Q45 8 50 8Z', GOLD, GOLD_DARK)
      + line('M50 34L50 58', OL, 9) + `<circle cx="50" cy="72" r="5.5" fill="${OL}"/>`;
  },

  hourglass() {
    return body('M28 16L72 16Q72 40 55 50Q72 60 72 84L28 84Q28 60 45 50Q28 40 28 16Z', '#e8f6ff', '#c4e0f4',
      `<path d="M36 28L64 28Q60 41 50 47Q40 41 36 28Z" fill="${GOLD}"/><path d="M32 82Q50 62 68 82Z" fill="${GOLD}"/>${line('M50 50L50 70', GOLD, 2.4)}`)
      + body(rrect(18, 6, 64, 12, 5), WOOD_LIGHT, WOOD_MID) + body(rrect(18, 82, 64, 12, 5), WOOD_LIGHT, WOOD_MID);
  },

  copy() {
    return body(rrect(18, 14, 64, 80, 8), WOOD_LIGHT, WOOD_MID)
      + body(rrect(26, 24, 48, 62, 3), '#ffffff', '#e4ecf4', line('M34 40H66M34 52H66M34 64H56', '#b8c6d4', 3))
      + body(rrect(35, 6, 30, 15, 6), '#c4d0dc', '#94a6b8');
  },

  load() {
    return body(TRAY, '#4ab4ff', '#2a86dc') + body('M38 4L62 4L62 30L78 30L50 60L22 30L38 30Z', '#4cc24a', '#36a83a');
  },

  share() {
    return body(TRAY, '#4ab4ff', '#2a86dc') + body('M50 2L78 32L62 32L62 60L38 60L38 32L22 32Z', '#ff8a1f', '#e8680f');
  },

  box() {
    return body('M12 30L50 46L50 92L12 76Z', '#c98a4b', '#c98a4b') + body('M50 46L88 30L88 76L50 92Z', '#b0703a', '#b0703a')
      + body('M50 12L88 30L50 46L12 30Z', '#e8b070', '#e8b070', '<path d="M30 21L68 38L60 42L22 25Z" fill="#f5d690"/>')
      + line('M30 52L30 80', '#f5d690', 4);
  },

  key() {
    return `<g transform="rotate(40 50 50)">`
      + body(rrect(40, 44, 52, 12, 4), GOLD, GOLD_DARK) + body(rrect(70, 54, 8, 14, 2), GOLD, GOLD_DARK, '', { sw: 3 }) + body(rrect(82, 54, 8, 10, 2), GOLD, GOLD_DARK, '', { sw: 3 })
      + body(circle(28, 50, 20), GOLD, GOLD_DARK) + `<circle cx="28" cy="50" r="7.5" fill="#fffbe8" stroke="${OL}" stroke-width="3.2"/>`
      + '</g>' + gloss(30, 22, 2.4, 6, -45);
  },

  sync() {
    return arcArrow(-15, -150, 32, '#4cc24a', '#36a83a') + arcArrow(165, 30, 32, '#4cc24a', '#36a83a');
  },

  save() {
    return body(rrect(12, 12, 76, 76, 9), '#4ab4ff', '#2a86dc')
      + body(rrect(28, 12, 44, 26, 3), '#dfe8f0', '#b8c6d4', `<rect x="56" y="17" width="9" height="16" rx="2" fill="#6e8094"/>`, { sw: 3 })
      + body(rrect(22, 52, 56, 36, 4), '#ffffff', '#e4ecf4', line('M30 64H70M30 74H62', '#b8c6d4', 3), { sw: 3 });
  },

  install() {
    return body(rrect(36, 6, 44, 88, 9), '#5a6a80', '#44526a', `<rect x="41" y="16" width="34" height="62" rx="3" fill="#8fd3ff"/><circle cx="58" cy="86" r="3" fill="#2e3a4a"/>`)
      + body('M4 42L22 42L22 30L44 50L22 70L22 58L4 58Z', '#4cc24a', '#36a83a');
  },

  wheat() {
    const ear = (x, flip) => {
      const k = flip ? -1 : 1;
      return stroke(`M${x} 94Q${x + k * 2} 60 ${x + k * 6} 16`, '#c9a23a', 2.6)
        + [[0, 18, -20], [8, 26, 20], [-2, 30, -25], [7, 38, 25], [-3, 42, -30], [5, 50, 30]]
          .map(([dx, y, r]) => `<ellipse cx="${x + k * (dx + 4)}" cy="${y}" rx="4" ry="7" transform="rotate(${k * r} ${x + k * (dx + 4)} ${y})" fill="${GOLD}" stroke="${OL}" stroke-width="2.2"/>`).join('');
    };
    return ear(28, false) + ear(70, true) + ear(48, false);
  },

  bolt() {
    return body('M60 4L18 56L45 56L35 96L82 40L55 40Z', GOLD, GOLD_DARK) + gloss(58, 22, 2, 7, 35);
  },

  strong() {
    const plate = (x) => body(rrect(x, 22, 14, 56, 6), '#5a6a80', '#44526a', '', { sw: 3 });
    return body(rrect(20, 44, 60, 12, 4), '#c4d0dc', '#94a6b8') + plate(14) + plate(72)
      + body(rrect(6, 32, 10, 36, 4), '#7a8aa0', '#5a6a80', '', { sw: 3 }) + body(rrect(84, 32, 10, 36, 4), '#7a8aa0', '#5a6a80', '', { sw: 3 })
      + gloss(80, 34, 1.6, 6, 0);
  },

  shield() {
    return body('M50 6L88 19Q88 64 50 94Q12 64 12 19Z', GOLD, GOLD_DARK)
      + body('M50 17L78 27Q77 61 50 83Q23 61 22 27Z', '#4ab4ff', '#2a86dc', '', { sw: 2.8 })
      + leaf(50, 62, 22, 9, -60, '#62d24e') + leaf(50, 62, 18, 8, -125, LEAF)
      + gloss(66, 30, 2, 5.5, -30);
  },
};

export const ICON_NAMES = Object.keys(ICONS);

/** The SVG markup of an interface icon. */
export const iconSvg = (name) => svgDoc(ICONS[name]);

/** An <img> of an interface icon; with the class 'i' it sits in a line of text, the size of its letters. */
export const icon = (name, className = 'i') => svgImg(`icon:${name}`, () => iconSvg(name), className);

/** The SVG markup of a chest in a tier's colours (green, blue, purple, red). */
export const chestSvg = (tier) => svgDoc(() => chestArt(...CHEST_TIERS[tier]));
