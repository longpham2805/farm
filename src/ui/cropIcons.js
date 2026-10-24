// Pictures of each crop's fruit, flower or vegetable for the menus, drawn as SVG so they stay sharp at any size and
// work in the single-file build, in the look of draw.js with a smiling face (after the art reference the user picked,
// a cute watermelon slice). The 3D renders in thumbs.js are still used for the mutated looks, which have their own
// colours and auras.

import {
  OL, DEEP, LEAF, LEAF_DARK, WOOD, f, TAU, circle, ellipse, body, stroke, line, leaf, drop, dots, scatter, grid, scallop, star,
  cloud, face, gloss, svgDoc, svgImg,
} from './draw.js';

// Shapes used by more than one picture.
const BERRY = 'M50 28C66 22 86 30 86 48C86 68 64 88 50 92C36 88 14 68 14 48C14 30 34 22 50 28Z';
const PEAR = 'M50 16C58 16 62 24 62 33C62 41 74 48 78 62C82 80 68 92 50 92C32 92 18 80 22 62C26 48 38 41 38 33C38 24 42 16 50 16Z';
const CARROT = 'M31 37C31 25 69 25 69 37C69 57 57 79 50 94C43 79 31 57 31 37Z';
const BULB = 'M50 14C54 24 58 28 66 34C82 44 86 62 78 76C72 86 60 90 50 90C40 90 28 86 22 76C14 62 18 44 34 34C42 28 46 24 50 14Z';

// The bottom edge of the watermelon wedge, as a parabola through its corners, lifted by c.
const wedgeBand = (c) => `M-10 ${f(61.2 - c)}Q50 ${f(116.8 - c)} 110 ${f(61.2 - c)}L110 110L-10 110Z`;

/** A round fruit with a stalk and leaf on top (orange, lime, tangerine...). */
function roundFruit(base, dark, { cx = 50, cy = 56, rx = 33, ry = rx, pores = null, faceY = cy + 3, s = 0.9, top = true, leafRot = -28 } = {}) {
  const pts = pores ? dots(scatter(cx, cy, rx * 0.85, ry * 0.85, 14, [cx, faceY + 3, 22 * s, 13 * s]), 1.1, pores, 0.8) : '';
  return body(ellipse(cx, cy, rx, ry), base, dark, pts)
    + gloss(cx + rx * 0.5, cy - ry * 0.52, 3.6, 8.5, -45, [cx + rx * 0.76, cy - ry * 0.12, 1.8])
    + face(cx, faceY, s)
    + (top ? stroke(`M${cx - 1} ${cy - ry + 1}Q${cx - 1} ${cy - ry - 4} ${cx + 2} ${cy - ry - 6}`, WOOD, 2.6) + leaf(cx + 1, cy - ry - 3, 22, 7.5, leafRot) : '');
}

/** A head of cabbage between two outer leaves, each given as [colour, dark side, veins]. */
function cabbageHead([head, headDark, vein], [side, sideDark, sideVein], eyes = OL) {
  const veins = line('M50 86L50 66M50 86Q36 74 30 60M50 86Q64 74 70 60', vein, 2, 0.8);
  const d = 'M50 92C24 92 8 74 12 52C14 40 22 32 30 32C22 50 26 76 50 92Z';
  return body(circle(50, 56, 32), head, headDark, veins + line('M20 46Q34 32 50 42Q66 32 80 46', OL, 2.2))
    + body(d, side, sideDark, line('M14 56Q20 74 40 86', sideVein, 1.6))
    + body(d, side, sideDark, line('M14 56Q20 74 40 86', sideVein, 1.6), { transform: 'translate(100 0) scale(-1 1)' })
    + gloss(64, 34, 2.4, 6, -50) + face(50, 56, 0.85, eyes);
}

/** A lotus petal from the flower's foot at (50, 80), turned rot degrees, its tip a deeper pink. */
function lotusPetal(rot, len, w, [base, dark, tip]) {
  const d = `M0 0C${-w} ${f(-len * 0.3)} ${f(-w * 0.85)} ${f(-len * 0.72)} 0 ${-len}C${f(w * 0.85)} ${f(-len * 0.72)} ${w} ${f(-len * 0.3)} 0 0Z`;
  return body(d, base, dark, `<ellipse cx="0" cy="${-len}" rx="${w}" ry="${f(len * 0.34)}" fill="${tip}"/>`,
    { transform: `translate(50 80) rotate(${rot})`, dx: 3, dy: -3 });
}

const ICONS = {
  // ── Tier 1 ──
  radish() {
    const hairs = line('M38 58l-5 1M63 66l5 0M44 78l-4 2M57 82l4 1', '#cfc8b0', 1.6);
    return `<g transform="rotate(-18 50 58)">`
      + leaf(50, 32, 26, 8, -125) + leaf(50, 32, 30, 8.5, -90, '#5cd04a') + leaf(50, 32, 26, 8, -55)
      + body('M32 40C32 28 68 28 68 40C68 60 61 80 53 91C51 94 48 94 47 91C39 79 32 60 32 40Z', '#fbfaf2', '#e0dccb',
        `<path d="M20 20L80 20L80 40Q50 47 20 40Z" fill="#d6efae"/>${hairs}`)
      + line('M50 93Q50 98 46 99', OL, 2)
      + gloss(61, 44, 2.4, 6.5, -8) + face(50, 52, 0.75) + '</g>';
  },

  rice() {
    const sprig = (x, flip) => {
      const k = flip ? -1 : 1;
      const grains = [[10, 4, -20], [16, 12, 15], [7, 15, -30], [15, 24, 20], [5, 28, -35]]
        .map(([dx, y, r]) => `<ellipse cx="${x + k * (dx - 8)}" cy="${y + 12}" rx="3.4" ry="5.8" transform="rotate(${k * r} ${x + k * (dx - 8)} ${y + 12})" fill="#ffd54a" stroke="${OL}" stroke-width="2"/>`).join('');
      return stroke(`M${x - k * 2} 92Q${x + k * 4} 60 ${x + k * 2} 16`, '#c9a23a', 2.4) + grains;
    };
    return sprig(78, false) + sprig(22, true) + leaf(74, 82, 24, 4.5, -64, '#6fd62f') + leaf(26, 82, 24, 4.5, -116, '#6fd62f')
      + stroke('M50 13L53 4', '#d9a020', 1.8)
      + body('M50 12C62 20 66 40 65 60C64 78 58 90 50 93C42 90 36 78 35 60C34 40 38 20 50 12Z', '#ffcf3d', '#eaa81c',
        line('M41 28Q36 58 43 86', '#e2a01a', 2) + line('M59 28Q64 58 57 86', '#e2a01a', 2))
      + gloss(57, 30, 2.2, 6.5, -15) + face(50, 56, 0.7);
  },

  carrot() {
    const ridges = line('M35 52L41 53M59 61L64 59.5M42 74L47 75M54 82L57.5 81', '#c9550a', 2.2);
    return `<g transform="rotate(-24 50 58)">`
      + leaf(50, 31, 22, 7.5, -122, '#45b83c') + leaf(50, 31, 26, 7.5, -90, '#5cd04a') + leaf(50, 31, 22, 7.5, -58, '#45b83c')
      + body(CARROT, '#ff8a1f', '#e8680f', ridges) + gloss(61, 38, 2.6, 7, -10) + face(50, 43, 0.75) + '</g>';
  },

  tomato() {
    return body('M50 27C70 25 88 37 88 57C88 77 70 90 50 90C30 90 12 77 12 57C12 37 30 25 50 27Z', '#ff3b2f', '#d62418')
      + gloss(70, 40, 3.6, 8, -45, [79, 54, 1.8]) + face(50, 60, 0.9)
      + `<path d="${star(50, 30, 15, 5, 6, 0.12)}" fill="${LEAF}" stroke="${OL}" stroke-width="2.4" stroke-linejoin="round"/>`
      + stroke('M50 29Q50 20 55 16', LEAF_DARK, 3);
  },

  banana() {
    return body('M24 22C10 52 30 92 82 84C88 83 90 78 86 72C56 70 44 50 40 22C39 18 27 17 24 22Z', '#ffe14a', '#f2bd1f',
      line('M30 30Q26 60 56 76', '#fff6b0', 3, 0.7))
      + `<path d="M84 73C88 76 89 81 85 83C83 80 82 77 84 73Z" fill="#6b4a2a"/>`
      + stroke('M31 21L29 12', '#9bbf3a', 5) + `<rect x="26" y="8" width="6" height="4" rx="1.5" fill="#6b4a2a" transform="rotate(-12 29 10)"/>`
      + face(41, 58, 0.72);
  },

  waterSpinach() {
    const arrow = 'M50 12C62 22 68 38 66 52L58 48L50 58L42 48L34 52C32 38 38 22 50 12Z';
    const stems = ['M50 56L49 93', 'M33 48L43 93', 'M67 48L56 93', 'M42 58L46 93', 'M58 58L53 93']
      .map((d) => stroke(d, '#9ae05a', 2.6)).join('');
    return stems
      + body(arrow, '#4fd14a', '#36ae38', line('M50 18L50 54', '#7ae46a', 1.6), { transform: 'translate(-20 6) rotate(-30 50 40) scale(0.72) translate(19 15)' })
      + body(arrow, '#4fd14a', '#36ae38', line('M50 18L50 54', '#7ae46a', 1.6), { transform: 'translate(20 6) rotate(30 50 40) scale(0.72) translate(19 15)' })
      + body(arrow, '#5cd94a', '#3cb838', '')
      + `<rect x="37" y="72" width="26" height="9" rx="3" fill="#ff6b6b" stroke="${OL}" stroke-width="2.4"/>`
      + gloss(58, 24, 2, 5.5, -30) + face(50, 36, 0.66);
  },

  mushroom() {
    const spots = dots([[32, 32, 6], [56, 24, 5], [73, 42, 5.5], [24, 49, 3.6], [47, 44, 4.2], [64, 54, 3]], 0, '#fff6ea');
    return body('M35 60C33 74 31 86 37 91C44 96 56 96 63 91C69 86 67 74 65 60Z', '#fff1d8', '#ecd2a8')
      + line('M24 62Q50 70 76 62', '#d9b07a', 2.4)
      + body('M14 54C14 26 34 14 50 14C66 14 86 26 86 54C86 60 80 62 72 62L28 62C20 62 14 60 14 54Z', '#ff4a2a', '#d8321a', spots)
      + gloss(72, 30, 2.6, 7, -45) + face(50, 74, 0.72);
  },

  strawberry() {
    const seeds = [[31, 40], [42, 35], [58, 35], [24, 52], [77, 50], [33, 69], [67, 69], [50, 79], [43, 86], [57, 86]]
      .map(([x, y]) => drop(x, y, 0, 0.9, '#ffe27a')).join('');
    return body(BERRY, '#ff3b5c', '#d81f45', seeds)
      + gloss(70, 38, 3.4, 7.5, -40, [77, 60, 1.6]) + face(50, 54, 0.85)
      + stroke('M50 26Q50 17 57 12', '#3fae3a', 3)
      + [160, 200, 245, 295, 340, 20].map((r) => leaf(50, 27, 17, 6, r, LEAF, null)).join('')
      + `<circle cx="50" cy="27" r="4" fill="#3fae3a" stroke="${OL}" stroke-width="2.2"/>`;
  },

  // ── Tier 2 ──
  cucumber() {
    const stripes = line('M20 46Q50 40 84 46M18 56Q50 62 84 56', '#7ad35a', 2.2, 0.8);
    const bumps = dots([[26, 42], [40, 39], [70, 40], [82, 50], [30, 60], [68, 61], [56, 64]], 1.2, '#1f7a24');
    return `<g transform="rotate(-35 50 52)">`
      + body('M14 52C12 40 24 34 38 34L64 34C80 34 90 40 89 52C88 62 80 68 64 68L36 68C22 68 15 62 14 52Z', '#3fb83a', '#2a9030', stripes + bumps)
      + `<circle cx="90" cy="52" r="3.4" fill="#ffd84a" stroke="${OL}" stroke-width="2"/>` + stroke('M13 52L7 51', '#7a8a2a', 3)
      + gloss(62, 39, 2.2, 7, 82) + face(50, 47, 0.72) + '</g>';
  },

  cabbage() {
    return cabbageHead(['#b6f26a', '#93d64a', '#eaffcf'], ['#72d040', '#56b83a', '#9ae866']);
  },

  sunflower() {
    const petal = (off, i, col, rad) => `<ellipse cx="50" cy="${50 - rad}" rx="6.6" ry="13" transform="rotate(${f((i / 13) * 360 + off)} 50 50)" fill="${col}" stroke="${OL}" stroke-width="2.4"/>`;
    const ring = Array.from({ length: 16 }, (_, i) => [50 + Math.cos((i / 16) * TAU) * 15.5, 50 + Math.sin((i / 16) * TAU) * 15.5]);
    return Array.from({ length: 13 }, (_, i) => petal(360 / 26, i, '#ffb01f', 24)).join('')
      + Array.from({ length: 13 }, (_, i) => petal(0, i, '#ffd52b', 22.5)).join('')
      + body(circle(50, 50, 19), '#a5652a', '#86491b', dots(ring, 1.3, '#5e3110', 0.7), { dx: 4, dy: -3 })
      + gloss(58, 40, 2, 4.5, -45) + face(50, 49, 0.78);
  },

  potato() {
    const eyes = line('M30 46q3 -2 5 0M70 70q3 -2 5 0M64 34q3 -2 5 0M36 74q3 -2 5 0', '#b47a2a', 1.8);
    return body('M24 40C26 26 46 22 60 26C78 30 88 42 86 58C84 74 70 84 52 84C34 84 18 74 16 60C14 50 20 46 24 40Z', '#f2bb4e', '#d6992f',
      eyes + dots([[44, 32], [80, 52], [24, 62], [56, 78]], 1, '#c58a30'))
      + gloss(72, 38, 3, 7, -55) + face(51, 54, 0.9);
  },

  sweetPotato() {
    const hairs = line('M30 48l-3 -3M68 62l2 4M44 64l-1 4M76 44l3 -2', '#9a1f52', 1.6);
    return `<g transform="rotate(-22 50 52)">` + line('M8 54L3 57M92 49L97 46', OL, 2)
      + body('M8 52C18 36 38 32 52 32C70 32 86 40 93 50C86 62 70 70 52 70C36 70 18 64 8 52Z', '#d83a7a', '#b02862', hairs)
      + gloss(66, 38, 2.2, 6.5, 80) + face(51, 47, 0.75, DEEP) + '</g>';
  },

  garlic() {
    const cloves = line('M41 36Q29 58 36 87M59 36Q71 58 64 87', '#e0c2d4', 2.2) + line('M30 50Q26 64 30 78M70 50Q74 64 70 78', '#c9a0c8', 1.8, 0.8);
    return line('M42 89l-3 6M47 90l-1 6M53 90l1 6M58 89l3 6', '#c8b48a', 2)
      + body(BULB, '#fff6fa', '#e6d2e0', cloves)
      + gloss(62, 40, 2.6, 7, -40) + face(50, 64, 0.8);
  },

  greenBean() {
    const pod = 'M12 50C12 38 22 36 30 38Q38 34 46 38Q54 34 62 38Q70 34 78 38C88 40 93 48 90 54C86 62 78 62 70 62L30 62C20 62 12 60 12 50Z';
    return `<g transform="translate(8 -16) rotate(-52 50 50) scale(0.84)">${stroke('M13 50Q6 48 3 42', '#6fae3a', 2.6)}${body(pod, '#3cc22a', '#2a9a22')}</g>`
      + `<g transform="translate(0 10) rotate(-28 50 50)">${stroke('M13 50Q6 48 3 42', '#6fae3a', 2.6)}`
      + body(pod, '#45d62e', '#30ae26', line('M24 44Q50 40 80 44', '#8ae86a', 1.8, 0.8))
      + gloss(70, 42, 1.8, 4.5, 80) + face(50, 50, 0.66) + '</g>';
  },

  pepper() {
    return body('M50 30C60 24 76 24 82 36C88 48 86 66 80 78C76 88 66 90 60 86C56 90 44 90 40 86C34 90 24 88 20 78C14 66 12 48 18 36C24 24 40 24 50 30Z', '#ff2f24', '#d01c14',
      line('M40 86Q39 80 40 74M60 86Q61 80 60 74', '#b0120c', 2))
      + gloss(72, 40, 3, 8, -30, [80, 56, 1.7]) + face(50, 58, 0.85)
      + `<path d="M36 31Q50 20 64 31Q50 37 36 31Z" fill="${LEAF}" stroke="${OL}" stroke-width="2.4" stroke-linejoin="round"/>`
      + stroke('M50 28Q50 18 56 14', LEAF_DARK, 3.6);
  },

  papaya() {
    const seeds = dots(scatter(50, 68, 7.5, 12, 16), 1.9, '#2a1a1a');
    return `<g transform="rotate(-14 50 54)">`
      + body('M50 8C72 10 82 36 82 58C82 80 68 93 50 93C32 93 18 80 18 58C18 36 28 10 50 8Z', '#8cc83a', '#6aa82a',
        `<path d="M50 14C67 16 75 38 75 58C75 77 64 87 50 87C36 87 25 77 25 58C25 38 33 16 50 14Z" fill="#ff8a2a"/>`
        + `<ellipse cx="50" cy="68" rx="11" ry="16" fill="#ffb35a"/>` + seeds)
      + gloss(70, 30, 2.4, 7, -25) + face(50, 40, 0.68) + '</g>';
  },

  eggplant() {
    return body('M38 30C50 26 62 32 66 44C72 60 84 68 82 80C80 92 66 94 56 90C40 84 30 70 28 54C26 42 30 32 38 30Z', '#8a2be2', '#6a1cb8')
      + gloss(70, 62, 2.6, 7, -40) + face(58, 64, 0.82, DEEP)
      + `<path d="M22 32Q28 22 40 24Q52 21 58 30Q52 36 46 34Q42 42 36 36Q28 41 22 32Z" fill="${LEAF}" stroke="${OL}" stroke-width="2.4" stroke-linejoin="round"/>`
      + stroke('M38 26Q34 16 28 12', LEAF_DARK, 3.6);
  },

  // ── Tier 3 ──
  ginger() {
    const skin = '#f0b04a';
    const dark = '#d18f2c';
    const rings = line('M34 44q4 -3 8 0M60 38q4 -3 8 0M64 80q-4 3 -8 0', '#c27e22', 1.8);
    return leaf(52, 28, 22, 4.5, -110, '#6fd04a') + leaf(52, 28, 24, 4.5, -80, '#4fcf3a') + leaf(52, 28, 20, 4.5, -55, '#6fd04a')
      + body(ellipse(22, 58, 10, 7.5), skin, dark, '', { transform: 'rotate(-25 22 58)' })
      + body(ellipse(80, 50, 10, 7.5), skin, dark, '', { transform: 'rotate(25 80 50)' })
      + body('M30 44C30 30 44 26 54 28C68 30 74 42 72 56C76 66 72 82 58 86C46 90 32 84 28 72C24 62 28 54 30 44Z', skin, dark, rings)
      + gloss(64, 38, 2.4, 6, -35) + face(50, 50, 0.8)
      + `<path d="M28 68Q50 76 50 76L50 84Q30 80 27 76Z" fill="#ff5a3c" stroke="${OL}" stroke-width="2.4" stroke-linejoin="round"/>`
      + `<path d="M72 66Q50 76 50 76L50 84Q70 80 74 74Z" fill="#5ab8ff" stroke="${OL}" stroke-width="2.4" stroke-linejoin="round"/>`
      + `<path d="M44 80L40 94L48 92L50 82Z" fill="#ff5a3c" stroke="${OL}" stroke-width="2.4" stroke-linejoin="round"/>`;
  },

  pumpkin() {
    const skin = '#ff8a1a';
    const dark = '#e8680a';
    return stroke('M58 26Q70 18 74 26Q76 32 70 32', '#5cbf45', 2) + leaf(56, 28, 18, 7, -20)
      + body(ellipse(30, 61, 20, 27), skin, dark) + body(ellipse(70, 61, 20, 27), skin, dark)
      + body(ellipse(50, 60, 22, 30), skin, dark)
      + stroke('M50 32Q49 22 55 17', '#7a5a2a', 4)
      + gloss(62, 42, 2.4, 6.5, -30) + face(50, 62, 0.8);
  },

  beet() {
    const stems = ['M50 32Q44 22 34 18', 'M50 32Q50 20 52 12', 'M50 32Q58 22 68 18'].map((d) => stroke(d, '#ff3d7f', 2.2)).join('');
    return stems + leaf(36, 19, 20, 8, -150) + leaf(52, 13, 20, 8, -95) + leaf(66, 19, 20, 8, -30)
      + leaf(26, 62, 16, 6, 160) + leaf(74, 62, 16, 6, 20)
      + stroke('M50 86Q50 94 46 98', OL, 1.6)
      + body('M50 30C68 30 79 44 79 60C79 76 64 86 50 90C36 86 21 76 21 60C21 44 32 30 50 30Z', '#d81b72', '#b0105a',
        line('M30 48Q28 60 34 72M70 48Q72 60 66 72', '#e85a9a', 1.8, 0.7))
      + gloss(66, 42, 2.8, 7, -45) + face(50, 60, 0.85, DEEP);
  },

  grape() {
    const back = [[30, 40, 11], [50, 32, 11], [70, 40, 11], [24, 60, 10], [76, 60, 10], [36, 78, 10], [64, 78, 10], [50, 86, 9]];
    const grape = ([x, y, r], col, dk) => body(circle(x, y, r), col, dk, '', { dx: 2.5, dy: -2, sw: 3 })
      + `<circle cx="${f(x + r * 0.4)}" cy="${f(y - r * 0.45)}" r="${f(r * 0.18)}" fill="#fff" opacity="0.6"/>`;
    return stroke('M50 22Q50 14 46 8', WOOD, 3) + leaf(52, 16, 20, 8, -15)
      + back.map((g) => grape(g, '#8a26d0', '#6a14a8')).join('')
      + grape([50, 58, 19], '#9b2fe0', '#7418b8') + face(50, 59, 0.68, DEEP);
  },

  corn() {
    const kernels = grid(36, 16, 66, 86, 6, 5.6).map(([x, y]) =>
      `<rect x="${f(x - 2.5)}" y="${f(y - 2.3)}" width="5" height="4.6" rx="1.8" fill="#ffe45a" stroke="#e0a800" stroke-width="0.6"/>`).join('');
    return body('M50 10C63 10 69 28 69 46C69 66 63 84 50 88C37 84 31 66 31 46C31 28 37 10 50 10Z', '#ffd400', '#eab000', kernels)
      + face(50, 42, 0.74)
      + body('M50 94C28 92 14 72 18 44C28 56 38 72 50 94Z', '#6fcf4a', '#4cae38', line('M24 56Q32 74 46 88', '#9ae870', 1.6))
      + body('M50 94C72 92 86 72 82 44C72 56 62 72 50 94Z', '#5cc23f', '#3f9e32', line('M76 56Q68 74 54 88', '#8ade66', 1.6));
  },

  orange() {
    return roundFruit('#ffa21f', '#f07c0c', { pores: '#e5700c' });
  },

  lettuce() {
    const veins = line('M50 90L50 64M50 90Q36 80 28 64M50 90Q64 80 72 64', '#e2ffc0', 2.2, 0.85);
    return body(scallop(50, 56, 32, 14, 2.6, 0.2), '#8ee83a', '#6cc82a', veins
      + line(scallop(50, 50, 20, 9, 2, 0.5).replace(/Z$/, ''), '#6cc82a', 1.8))
      + gloss(66, 36, 2.4, 6, -45) + face(50, 56, 0.85);
  },

  apple() {
    return stroke('M50 30Q50 20 54 14', WOOD, 3) + leaf(53, 20, 20, 7, -20)
      + body('M50 30C58 22 80 20 86 42C92 64 76 90 60 88C55 87 52 85 50 85C48 85 45 87 40 88C24 90 8 64 14 42C20 20 42 22 50 30Z', '#f2182a', '#c40c1c')
      + gloss(70, 40, 3.4, 8, -40, [79, 56, 1.8]) + face(50, 58, 0.9);
  },

  onion() {
    const lines = line('M40 36Q24 56 36 86M60 36Q76 56 64 86', '#e070aa', 2, 0.8);
    return line('M42 89l-3 6M47 90l-1 6M53 90l1 6M58 89l3 6', '#e0cfa8', 2)
      + leaf(50, 16, 16, 4, -115, '#6fd04a') + leaf(50, 16, 18, 4, -70, '#4fcf3a')
      + body(BULB, '#c2287a', '#9a1660', lines)
      + gloss(62, 40, 2.6, 7, -40) + face(50, 62, 0.85, DEEP);
  },

  blueberry() {
    return `<g transform="rotate(18 80 60)"><rect x="77" y="20" width="6" height="40" rx="2" fill="#dfe6ee" stroke="${OL}" stroke-width="2.2"/>`
      + `<rect x="70" y="58" width="20" height="5" rx="2" fill="#ffcc33" stroke="${OL}" stroke-width="2.2"/>`
      + `<rect x="77.5" y="63" width="5" height="12" rx="2" fill="#7a4a2a" stroke="${OL}" stroke-width="2.2"/></g>`
      + body(circle(46, 58, 30), '#3b4ff0', '#2836c0')
      + `<path d="${star(46, 30, 11, 4.5, 5, 0.15)}" fill="#2a2f7a" stroke="${OL}" stroke-width="2.2" stroke-linejoin="round"/>`
      + gloss(62, 42, 3.4, 8, -45, [70, 58, 1.8]) + face(46, 60, 0.9, DEEP)
      + body(circle(78, 72, 6), '#3b4ff0', '#2836c0', '', { dx: 2, dy: -2, sw: 2.6 });
  },

  mango() {
    return stroke('M30 24Q28 16 32 12', WOOD, 2.6) + leaf(31, 16, 20, 7, -150)
      + body('M30 26C44 16 70 18 82 34C92 48 88 72 72 84C58 94 34 90 22 76C12 64 16 38 30 26Z', '#ffb800', '#f08a00',
        `<ellipse cx="70" cy="34" rx="18" ry="13" fill="#ff6a3a" opacity="0.45"/>`)
      + gloss(72, 44, 3, 8, -40) + face(52, 58, 0.9);
  },

  // ── Tier 4 ──
  dragonFruit() {
    const flap = (x, y, r, s = 1) => `<g transform="translate(${x} ${y}) rotate(${r}) scale(${s})">`
      + `<path d="M-6 2Q-4 -10 0 -16Q4 -10 6 2Z" fill="#ff5ab0" stroke="${OL}" stroke-width="2.2" stroke-linejoin="round"/>`
      + `<path d="M-2.4 -9Q0 -14 0 -16Q2 -12 2.4 -9Z" fill="#7ad84a"/></g>`;
    return '<g transform="translate(50 54) scale(0.86) translate(-50 -54)">'
      + [[24, 34, -40], [76, 34, 40], [16, 60, -80], [84, 60, 80], [26, 84, -130], [74, 84, 130], [50, 16, 0, 1.1], [40, 18, -20], [60, 18, 20]]
        .map(([x, y, r, s]) => flap(x, y, r, s)).join('')
      + body('M50 16C70 20 82 40 80 60C78 80 64 92 50 92C36 92 22 80 20 60C18 40 30 20 50 16Z', '#ff2d95', '#d81a78')
      + flap(30, 52, -30, 0.8) + flap(70, 50, 30, 0.8) + flap(36, 80, -20, 0.7) + flap(64, 80, 20, 0.7)
      + gloss(64, 32, 2.6, 6.5, -35) + face(50, 60, 0.85) + '</g>';
  },

  mangosteen() {
    const petal = (r) => `<ellipse cx="50" cy="20" rx="6" ry="9" transform="rotate(${r} 50 29)" fill="#52c23a" stroke="${OL}" stroke-width="2.2"/>`;
    return body(circle(18, 68, 7), '#7a1f8a', '#5a1268', '', { dx: 2, dy: -2, sw: 2.6 })
      + body(circle(82, 68, 7), '#7a1f8a', '#5a1268', '', { dx: 2, dy: -2, sw: 2.6 })
      + body(ellipse(50, 60, 31, 29), '#7a1f8a', '#5a1268')
      + [-60, -20, 20, 60].map(petal).join('') + stroke('M50 26L50 18', '#6b4a2a', 3)
      + gloss(66, 44, 3, 7.5, -45, [75, 58, 1.7]) + face(50, 63, 0.9, DEEP);
  },

  avocado() {
    return body('M50 10C62 10 68 22 70 34C72 44 84 52 84 68C84 85 68 94 50 94C32 94 16 85 16 68C16 52 28 44 30 34C32 22 38 10 50 10Z', '#3f7a1f', '#2f5e14',
      `<path d="M50 16C59 16 63 26 64 36C66 46 78 54 78 68C78 81 65 88 50 88C35 88 22 81 22 68C22 54 34 46 36 36C37 26 41 16 50 16Z" fill="#b6dc4a"/>`
      + `<path d="M50 21C57 21 60 29 61 38C62 48 73 55 73 68C73 78 63 84 50 84C37 84 27 78 27 68C27 55 38 48 39 38C40 29 43 21 50 21Z" fill="#e2f29a"/>`)
      + body(circle(50, 70, 13), '#a8642a', '#80461a', '', { dx: 3, dy: -3, sw: 3 })
      + `<ellipse cx="55" cy="65" rx="2.4" ry="4" transform="rotate(-40 55 65)" fill="#fff" opacity="0.55"/>`
      + face(50, 43, 0.62);
  },

  broccoli() {
    const florets = [[28, 44, 14], [50, 34, 17], [72, 44, 14], [38, 56, 14], [62, 56, 14]];
    const texture = dots([[24, 38], [32, 32], [44, 26], [58, 26], [68, 34], [78, 40], [22, 50], [80, 52]], 2.2, '#2f9a2a', 0.8);
    return body('M40 58L60 58L65 90Q50 95 35 90Z', '#a9dc7a', '#86c25a', line('M50 64L50 88', '#c8eea0', 2))
      + cloud(florets, '#3fc23a') + texture
      + gloss(64, 30, 2.6, 6, -45) + face(50, 48, 0.82)
      + `<g transform="translate(26 22) rotate(-20)"><path d="M0 0L-12 -7L-12 7Z" fill="#ff6fa8" stroke="${OL}" stroke-width="2.2" stroke-linejoin="round"/>`
      + `<path d="M0 0L12 -7L12 7Z" fill="#ff6fa8" stroke="${OL}" stroke-width="2.2" stroke-linejoin="round"/>`
      + `<circle r="3.6" fill="#ff8fbe" stroke="${OL}" stroke-width="2.2"/></g>`;
  },

  watermelon() {
    const d = 'M50 11C53.5 11 55.5 13.5 57.5 17L87 69C89.5 73.5 88.5 77 85 79.5C64 92 36 92 15 79.5C11.5 77 10.5 73.5 13 69L42.5 17C44.5 13.5 46.5 11 50 11Z';
    const seeds = [[50, 24, 0], [45, 36, -10], [58, 37, 10], [36, 52, -15], [72, 66, 20], [30, 64, -20], [44, 72, -5], [60, 72, 8], [78, 68, 25]]
      .map(([x, y, r]) => drop(x, y, r, 1.15, '#2d1a4a')).join('');
    const inside = `<path d="${wedgeBand(10)}" fill="#fdfdf3"/><path d="${wedgeBand(6.5)}" fill="#5cc25a"/><path d="${wedgeBand(3)}" fill="#2f9444"/>`
      + `<path d="M50 11L35 92L-5 92L-5 11Z" fill="#5a0b3a" opacity="0.2"/>${seeds}`;
    return body(d, '#ff4d5e', '#ff4d5e', inside) + line('M50 13L35.5 88', OL, 2.4)
      + gloss(63, 34, 2.6, 8, -30, [69.5, 46, 1.7]) + face(55, 53, 0.85);
  },

  pineapple() {
    const diag = Array.from({ length: 9 }, (_, i) => `M${-10 + i * 12} 30L${30 + i * 12} 100M${110 - i * 12} 30L${70 - i * 12} 100`).join('');
    const crown = [[-118, 20], [-100, 26], [-80, 28], [-62, 24], [-140, 16], [-40, 16]]
      .map(([r, len], i) => leaf(50, 36, len, 5.5, r, i % 2 ? LEAF : '#3fae3a', null)).join('');
    return crown
      + body(ellipse(50, 64, 27, 29), '#ffbf1a', '#e89a0a', line(diag, '#d88a0a', 1.6, 0.75) + dots(grid(30, 40, 72, 90, 12, 8.5), 1.2, '#c87a0a', 0.8))
      + gloss(66, 48, 2.6, 7, -40) + face(50, 64, 0.82);
  },

  lychee() {
    const bumps = grid(20, 26, 82, 90, 7, 6).map(([x, y]) => `M${f(x - 2)} ${f(y + 1)}L${f(x)} ${f(y - 1.6)}L${f(x + 2)} ${f(y + 1)}`).join('');
    return stroke('M50 24Q50 14 56 10', WOOD, 2.6) + leaf(54, 14, 20, 7, -10) + leaf(50, 16, 18, 6.5, -160)
      + body('M50 24C68 22 84 36 84 56C84 76 68 90 50 92C32 90 16 76 16 56C16 36 32 22 50 24Z', '#f21d4a', '#c40c34', line(bumps, '#b00a2e', 1.3, 0.7))
      + gloss(68, 38, 3, 7.5, -45, [77, 54, 1.7]) + face(50, 58, 0.9);
  },

  pear() {
    return stroke('M50 17Q50 9 54 5', WOOD, 2.8) + leaf(52, 10, 18, 6.5, -15)
      + body(PEAR, '#f2d81a', '#d0b20c', dots([[34, 70], [66, 74], [44, 84], [60, 50], [40, 52]], 0.9, '#b8960a', 0.8))
      + gloss(58, 34, 2.4, 6, -30, [70, 62, 1.6]) + face(50, 66, 0.85);
  },

  durian() {
    const spikes = Array.from({ length: 18 }, (_, i) => {
      const a = (i / 18) * TAU;
      const p = (r, da) => `${f(50 + Math.cos(a + da) * r * 1.0)} ${f(58 + Math.sin(a + da) * r * 1.06)}`;
      return `<path d="M${p(29, -0.12)}L${p(37, 0)}L${p(29, 0.12)}Z" fill="#a8c418" stroke="${OL}" stroke-width="2.2" stroke-linejoin="round"/>`;
    }).join('');
    const inner = grid(26, 34, 76, 86, 10, 9).filter(([x, y]) => !(Math.abs(x - 50) < 20 && Math.abs(y - 63) < 12))
      .map(([x, y]) => `<path d="M${x - 3} ${y + 2}L${x} ${y - 3}L${x + 3} ${y + 2}Z" fill="#8fa810"/><path d="M${x} ${y - 3}L${x + 3} ${y + 2}L${x} ${y + 1}Z" fill="#c8de4a"/>`).join('');
    return spikes + body(ellipse(50, 58, 29, 31), '#b5cf1a', '#92aa10', inner)
      + stroke('M50 28L52 16', '#6b4a2a', 4) + face(50, 62, 0.82);
  },

  chili() {
    return body('M34 26C44 20 56 24 58 36C60 54 66 72 84 86C86 90 82 94 76 92C48 86 30 64 28 42C28 34 30 28 34 26Z', '#f0141c', '#c00810')
      + gloss(52, 40, 2, 6, -10, [60, 64, 1.4]) + face(44, 46, 0.6)
      + `<path d="M30 30Q44 18 58 30Q46 36 30 30Z" fill="${LEAF}" stroke="${OL}" stroke-width="2.4" stroke-linejoin="round"/>`
      + stroke('M44 27Q44 16 52 10', LEAF_DARK, 3.4);
  },

  lime() {
    return roundFruit('#58c21f', '#3a9a14', { rx: 33, ry: 31, pores: '#3a9a14', leafRot: -24 })
      + `<ellipse cx="50" cy="89" rx="3" ry="2" fill="#3a9a14" stroke="${OL}" stroke-width="2"/>`;
  },

  tangerine() {
    return roundFruit('#ff6a00', '#e04e00', { cy: 60, rx: 35, ry: 28, pores: '#d04a00', s: 0.88, top: false })
      + stroke('M50 33Q50 26 53 23', WOOD, 2.6) + leaf(51, 27, 20, 7, -30) + leaf(49, 28, 18, 6.5, -150);
  },

  guava() {
    return stroke('M50 21Q50 13 54 9', WOOD, 2.8) + leaf(52, 14, 20, 7, -20)
      + body('M50 20C66 20 82 32 84 52C86 72 70 90 50 90C30 90 14 72 16 52C18 32 34 20 50 20Z', '#d2ea72', '#aacb48',
        dots([[30, 40], [70, 70], [34, 72], [64, 36]], 1, '#9ab83a', 0.8))
      + `<path d="${star(50, 88, 5, 2, 5, 0.2)}" fill="#6b5a2a" stroke="${OL}" stroke-width="1.6"/>`
      + gloss(68, 36, 3, 7.5, -45, [77, 52, 1.7]) + face(50, 56, 0.9);
  },

  greenPear() {
    return stroke('M50 17Q50 9 54 5', WOOD, 2.8) + leaf(52, 10, 18, 6.5, -15)
      + body(PEAR, '#9ed83a', '#78b820', dots([[34, 70], [66, 74], [44, 84], [60, 50], [40, 52]], 0.9, '#5a9a1a', 0.8))
      + gloss(58, 34, 2.4, 6, -30, [70, 62, 1.6]) + face(50, 66, 0.85);
  },

  starfruit() {
    const ridges = Array.from({ length: 5 }, (_, k) => {
      const a = ((-90 + k * 72) * Math.PI) / 180;
      return `M${f(50 + Math.cos(a) * 12)} ${f(55 + Math.sin(a) * 12)}L${f(50 + Math.cos(a) * 30)} ${f(55 + Math.sin(a) * 30)}`;
    }).join('');
    return body(star(50, 55, 42, 22, 5, 0.24), '#ffd21f', '#f0ae00', line(ridges, '#fff0a0', 2.2, 0.8))
      + gloss(62, 30, 2, 5.5, -30) + face(50, 55, 0.78);
  },

  passionFruit() {
    const seeds = dots(scatter(50, 42, 22, 13, 18), 1.6, '#2a1a10');
    return body('M17 44C17 70 31 91 50 91C69 91 83 70 83 44Z', '#7a2a6a', '#5a1a4e',
      dots([[26, 60], [72, 58], [30, 78], [68, 80], [50, 86]], 1.1, '#b46aa4', 0.8))
      + body(ellipse(50, 44, 33, 20), '#7a2a6a', '#7a2a6a',
        `<ellipse cx="50" cy="44" rx="30" ry="17.5" fill="#fff1dc"/><ellipse cx="50" cy="44" rx="26" ry="15" fill="#ffcf33"/>`
        + dots(scatter(50, 44, 22, 12, 9), 3, '#ffb000', 0.7) + seeds)
      + face(50, 66, 0.72) + gloss(70, 62, 2, 5.5, -20);
  },

  pomegranate() {
    return `<path d="M38 34L35 18L43 25L50 13L57 25L65 18L62 34Z" fill="#b0102a" stroke="${OL}" stroke-width="2.4" stroke-linejoin="round"/>`
      + body(circle(50, 60, 31), '#d81e3a', '#b0102a')
      + gloss(68, 44, 3.4, 8, -45, [77, 60, 1.8]) + face(50, 62, 0.9);
  },

  rambutan() {
    const hairs = Array.from({ length: 18 }, (_, i) => {
      const a = (i / 18) * TAU;
      const p = (r, da = 0) => `${f(50 + Math.cos(a + da) * r)} ${f(56 + Math.sin(a + da) * r)}`;
      const d = `M${p(24)}Q${p(34, 0.05)} ${p(38, 0.28)}`;
      return `<path d="${d}" fill="none" stroke="${OL}" stroke-width="6" stroke-linecap="round"/>`
        + `<path d="${d}" fill="none" stroke="#f0282a" stroke-width="2.8" stroke-linecap="round"/>`
        + `<circle cx="${p(38, 0.28).split(' ')[0]}" cy="${p(38, 0.28).split(' ')[1]}" r="1.5" fill="#b8d840"/>`;
    }).join('');
    return hairs + body(circle(50, 56, 27), '#f0282a', '#c41418', line('M30 40q3 -3 6 -2M66 74q3 -1 5 -4M70 42q2 3 1 6', '#ff7a6a', 1.8))
      + gloss(64, 42, 2.6, 6.5, -45) + face(50, 58, 0.8);
  },

  cashew() {
    return body('M41 66C35 72 34 86 43 91C51 95 59 91 58 85C57 81 52 80 52 75C52 70 47 65 41 66Z', '#a8a87a', '#86865a', '', { dx: 3, dy: -2, sw: 3 })
      + body('M30 18C40 12 60 12 70 18C78 24 78 38 74 50C70 62 62 70 50 70C38 70 30 62 26 50C22 38 22 24 30 18Z', '#ff7a1a', '#e4580a',
        `<ellipse cx="62" cy="30" rx="14" ry="10" fill="#ffc12a" opacity="0.5"/>`)
      + stroke('M50 15L50 9', '#6b4a2a', 3)
      + gloss(66, 30, 2.6, 6.5, -40) + face(50, 42, 0.82);
  },

  cherry() {
    return stroke('M34 48Q38 24 58 12', '#6b8a2a', 2.6) + stroke('M66 54Q62 30 58 12', '#6b8a2a', 2.6) + leaf(58, 12, 20, 7.5, -10)
      + body(circle(34, 64, 18), '#c8102e', '#9a0820') + gloss(42, 54, 2, 5, -45) + face(34, 66, 0.55)
      + body(circle(66, 70, 18), '#c8102e', '#9a0820') + gloss(74, 60, 2, 5, -45) + face(66, 72, 0.55);
  },

  melon() {
    const net = Array.from({ length: 7 }, (_, i) => {
      const o = -36 + i * 12;
      return `M${f(50 + o - 20)} 18Q${f(50 + o + 4)} 50 ${f(50 + o - 6)} 94M18 ${f(56 + o - 10)}Q50 ${f(56 + o + 6)} 84 ${f(56 + o - 12)}`;
    }).join('');
    return body(circle(50, 57, 33), '#b8c46a', '#98a44a', line(net, '#eef2c8', 1.6, 0.85))
      + stroke('M44 25L56 25M50 25L50 18', '#7a8a3a', 3)
      + gloss(68, 40, 3, 7.5, -45) + face(50, 60, 0.88);
  },

  kiwi() {
    const seeds = Array.from({ length: 12 }, (_, i) => {
      const a = (i / 12) * TAU;
      return drop(50 + Math.cos(a) * 12, 34 + Math.sin(a) * 9, (a * 180) / Math.PI - 90, 0.8, '#2a1a10');
    }).join('');
    return body(ellipse(50, 56, 36, 36), '#8a6234', '#6a4820', '', { sw: 3.4 })
      + body(ellipse(50, 52, 33, 33), '#8fd03a', '#7cc02a',
        `<ellipse cx="50" cy="34" rx="16" ry="12" fill="#b8e86a"/><ellipse cx="50" cy="34" rx="7.5" ry="5.5" fill="#fff8d8"/>${seeds}`, { dx: 0, dy: 0, sw: 2.6 })
      + face(50, 62, 0.82);
  },

  silverberry() {
    return stroke('M50 22Q50 12 58 8', WOOD, 2.6) + leaf(56, 12, 22, 6.5, -5, '#8ab87a', '#6a9a5a')
      + body(ellipse(50, 56, 23, 33), '#e8361f', '#c02210',
        dots(scatter(50, 56, 20, 30, 26, [50, 62, 18, 10]), 1.1, '#ffd8c8', 0.85))
      + stroke('M50 89L50 95', '#8a6a4a', 1.6)
      + gloss(62, 38, 2.4, 6.5, -20) + face(50, 60, 0.75);
  },

  fig() {
    const fig = (cx, cy, r, base, dark) => body(`M${cx} ${cy - r * 1.1}C${cx + r * 0.6} ${cy - r * 1.1} ${cx + r} ${cy - r * 0.4} ${cx + r} ${cy + r * 0.1}C${cx + r} ${cy + r * 0.7} ${cx + r * 0.5} ${cy + r} ${cx} ${cy + r}C${cx - r * 0.5} ${cy + r} ${cx - r} ${cy + r * 0.7} ${cx - r} ${cy + r * 0.1}C${cx - r} ${cy - r * 0.4} ${cx - r * 0.6} ${cy - r * 1.1} ${cx} ${cy - r * 1.1}Z`,
      base, dark, dots(scatter(cx, cy, r * 0.8, r * 0.8, 10), 0.9, '#ffc0a0', 0.8));
    return fig(23, 74, 14, '#f08a4a', '#d06a30') + fig(77, 74, 14, '#f08a4a', '#d06a30')
      + stroke('M50 32Q50 22 55 17', '#7a6a3a', 3) + leaf(53, 22, 20, 8, -25)
      + fig(50, 62, 28, '#e0503f', '#b8382a')
      + gloss(66, 50, 2.6, 6.5, -40) + face(50, 66, 0.82);
  },

  sugarApple() {
    const bumps = grid(20, 26, 80, 92, 11, 9).map(([x, y]) => `M${x - 5} ${y + 2}Q${x} ${y - 6} ${x + 5} ${y + 2}`).join('');
    return stroke('M50 24Q50 14 55 10', WOOD, 3)
      + body('M50 22C70 20 86 34 84 56C82 76 66 92 50 92C34 92 18 76 16 56C14 34 30 20 50 22Z', '#a8c86a', '#86a84a', line(bumps, '#6a8a32', 1.6, 0.7))
      + gloss(66, 38, 3, 7, -45) + face(50, 60, 0.9);
  },

  sapodilla() {
    return stroke('M50 24Q50 15 55 11', '#6b4a2a', 2.6)
      + body(ellipse(50, 58, 30, 33), '#9a6a3a', '#7a4e26', dots(scatter(50, 58, 26, 29, 22, [50, 62, 20, 12]), 1.1, '#c49a6a', 0.8))
      + stroke('M50 91L50 95', '#6b4a2a', 2)
      + gloss(66, 40, 3, 7.5, -40) + face(50, 60, 0.88, DEEP);
  },

  soursop() {
    const spine = (x, y, r) => `<path d="M${x} ${y}q${f(Math.cos(r) * 4)} ${f(Math.sin(r) * 4)} ${f(Math.cos(r + 0.6) * 6)} ${f(Math.sin(r + 0.6) * 6)}" fill="none" stroke="#2e5a14" stroke-width="1.6" stroke-linecap="round"/>`;
    const outer = Array.from({ length: 16 }, (_, i) => {
      const a = (i / 16) * TAU;
      return `<path d="M${f(50 + Math.cos(a - 0.1) * 30)} ${f(58 + Math.sin(a - 0.1) * 33)}Q${f(50 + Math.cos(a) * 37)} ${f(58 + Math.sin(a) * 39)} ${f(50 + Math.cos(a + 0.18) * 37)} ${f(58 + Math.sin(a + 0.18) * 40)}Q${f(50 + Math.cos(a + 0.1) * 31)} ${f(58 + Math.sin(a + 0.1) * 34)} ${f(50 + Math.cos(a + 0.12) * 29)} ${f(58 + Math.sin(a + 0.12) * 32)}Z" fill="#4f8a2a" stroke="${OL}" stroke-width="2" stroke-linejoin="round"/>`;
    }).join('');
    const inner = grid(26, 32, 76, 88, 11, 9).filter(([x, y]) => !(Math.abs(x - 50) < 20 && Math.abs(y - 63) < 12)).map(([x, y], i) => spine(x, y, i * 1.3)).join('');
    return outer + body('M50 24C70 24 82 40 80 60C78 80 64 92 50 92C36 92 22 80 20 60C18 40 30 24 50 24Z', '#5a9a30', '#437a1e', inner)
      + stroke('M50 25L50 16', '#6b4a2a', 3)
      + gloss(66, 40, 2.6, 7, -40) + face(50, 62, 0.85, DEEP);
  },

  pomelo() {
    return stroke('M50 16Q50 8 54 4', WOOD, 2.8) + leaf(53, 9, 20, 7, -15) + leaf(48, 10, 18, 6.5, -165)
      + body('M50 14C60 14 66 20 70 28C82 36 90 50 88 64C86 82 70 94 50 94C30 94 14 82 12 64C10 50 18 36 30 28C34 20 40 14 50 14Z', '#c2dc3a', '#9cba20',
        dots(scatter(50, 62, 32, 26, 16, [50, 66, 22, 12]), 1.1, '#94b020', 0.8))
      + gloss(70, 40, 3.4, 8, -45, [80, 58, 1.8]) + face(50, 64, 0.9);
  },

  jackfruit() {
    const knobs = grid(22, 18, 80, 94, 6.5, 5.6).filter(([x, y]) => !(Math.abs(x - 50) < 19 && Math.abs(y - 61) < 11))
      .map(([x, y]) => `M${f(x - 1.6)} ${y}L${f(x + 1.6)} ${y}M${x} ${f(y - 1.6)}L${x} ${f(y + 1.6)}`).join('');
    return stroke('M50 16L50 6', '#6b4a2a', 4.4)
      + body(ellipse(50, 56, 30, 39), '#a8b43a', '#86922a', line(knobs, '#6f7c1c', 1.2, 0.75))
      + gloss(66, 34, 2.8, 8, -30) + face(50, 60, 0.85);
  },

  // ── Levels 16–29 ──
  purpleCabbage() {
    return cabbageHead(['#a952e6', '#8434c8', '#f1dcff'], ['#7a62d6', '#5c46b8', '#a896ec'], DEEP);
  },

  cauliflower() {
    const curd = [[28, 50, 13], [38, 36, 14], [62, 36, 14], [72, 50, 13], [50, 30, 14], [50, 50, 18]];
    const knobs = line('M31 42q4 -4 8 0M57 29q4 -4 8 0M43 22q4 -4 8 0M66 45q4 -4 8 0M19 52q4 -4 8 0M72 56q4 -4 8 0', '#e4d2a2', 1.8);
    const wrap = 'M52 94C30 94 12 82 8 60C8 55 12 53 17 56C26 63 38 66 56 66Z';
    const vein = line('M14 62Q28 76 50 84', '#7ad866', 1.6);
    return leaf(30, 64, 34, 10, -145) + leaf(70, 64, 34, 10, -35)
      + cloud(curd, '#fff8e8') + knobs
      + body(wrap, LEAF, LEAF_DARK, vein) + body(wrap, LEAF, LEAF_DARK, vein, { transform: 'translate(100 0) scale(-1 1)' })
      + gloss(66, 28, 2.4, 5.5, -45) + face(50, 50, 0.8);
  },

  lemongrass() {
    const side = 'M45 40C45 36 55 36 55 40L56 86C56 93 44 93 44 86Z';
    const main = 'M40 34C40 28 60 28 60 34L62 84C62 94 38 94 38 84Z';
    const pink = '<path d="M20 86L80 86L80 100L20 100Z" fill="#efc4d4"/>';
    return leaf(31, 42, 34, 4.5, -125, '#4fb83a') + leaf(69, 42, 34, 4.5, -55, '#4fb83a')
      + leaf(50, 32, 38, 4.5, -101, '#62c24a') + leaf(50, 32, 32, 4, -77, '#6fd04a')
      + body(side, '#eaf4b8', '#c8d884', pink, { transform: 'rotate(-22 50 88)' })
      + body(side, '#eaf4b8', '#c8d884', pink, { transform: 'rotate(22 50 88)' })
      + body(main, '#f2f8cc', '#d4e294', pink + line('M45 36L46 62', '#fbffe6', 2.2, 0.8))
      + `<rect x="31" y="66" width="38" height="7" rx="3" fill="#ff5a5a" stroke="${OL}" stroke-width="2.4"/>`
      + gloss(56, 38, 1.6, 4.5, -4) + face(50, 48, 0.56);
  },

  bambooShoot() {
    const sheaths = line('M40 30Q50 37 60 30M33 46Q50 57 67 46M24 82Q50 95 76 82', '#8a5426', 2.4);
    const hairs = dots([[42, 34], [56, 34], [36, 51], [48, 54], [62, 51], [30, 86], [44, 90], [58, 90], [70, 86]], 1.1, '#7a4a22');
    return leaf(50, 12, 12, 4, -60, '#b8cf4a') + leaf(50, 12, 11, 3.6, -118, '#a6c044')
      + body('M50 8C55 20 62 34 70 52C78 70 82 82 76 88C66 96 34 96 24 88C18 82 22 70 30 52C38 34 45 20 50 8Z', '#e2a85c', '#c08040', sheaths + hairs)
      + gloss(62, 40, 2.2, 6.5, -25) + face(50, 66, 0.8);
  },

  lotusRoot() {
    const rings = line('M26 34Q21 46 26 58M75 34Q80 46 75 58', '#d0a67e', 2);
    const holes = Array.from({ length: 7 }, (_, i) => [68 + Math.cos((i / 7) * TAU - 1.2) * 9, 74 + Math.sin((i / 7) * TAU - 1.2) * 9]);
    return `<g transform="rotate(-16 50 46)">`
      + body(ellipse(13, 46, 8, 11), '#f2d8b8', '#d8b48e')
      + body(ellipse(50, 46, 34, 19), '#f8e4c8', '#dfbc94', rings + dots([[34, 34], [62, 58], [70, 36]], 1, '#c8a07a'))
      + gloss(68, 33, 2.4, 6.5, -70) + face(46, 46, 0.78) + '</g>'
      + body(circle(68, 74, 17), '#fff6e8', '#efd8b6', `<circle cx="68" cy="74" r="14.5" fill="none" stroke="#e6c69c" stroke-width="1.6"/>`
        + dots(holes, 3.2, '#c49a72') + dots([[68, 74]], 2.4, '#c49a72'));
  },

  lotusFlower() {
    const back = ['#ffd6e6', '#f4aac8', '#ff8cbc'];
    const front = ['#ffc8de', '#f498c0', '#ff74aa'];
    return body(ellipse(50, 84, 42, 12), '#3fae6a', '#2a8a52', line('M50 84L74 77', '#2a8a52', 2) + line('M50 84L28 76M50 84L62 94', '#5cc888', 1.4))
      + lotusPetal(-62, 38, 12, back) + lotusPetal(62, 38, 12, back)
      + lotusPetal(-34, 46, 14, back) + lotusPetal(34, 46, 14, back) + lotusPetal(0, 52, 14, back)
      + lotusPetal(-14, 40, 16, front) + lotusPetal(14, 40, 16, front) + lotusPetal(0, 44, 21, front)
      + gloss(59, 48, 1.8, 5, -20) + face(50, 60, 0.62);
  },
};

/** The SVG markup of a crop's picture, or null if it has none. */
export function cropIconSvg(cropId) {
  const draw = ICONS[cropId];
  return draw ? svgDoc(draw) : null;
}

export const ICON_CROPS = Object.keys(ICONS);

/** An <img> of a crop's picture. */
export const cropIcon = (cropId, className = 'thumb') => svgImg(`crop:${cropId}`, () => cropIconSvg(cropId), className);
