// The avatars, the player's and the friends', drawn in the look of draw.js. A save keeps an avatar as its emoji
// (s.profile.avatar, NPCS[].avatar), so the emoji stays the key and only how it is shown changes.

import { OL, f, circle, ellipse, rrect, body, stroke, line, scallop, star, face, gloss, svgDoc, svgImg } from './draw.js';

const SKIN = '#ffd8b0';
const SKIN_DARK = '#f2bc8e';
const GOLD = '#ffd23a';
const GOLD_DARK = '#eda400';
const PINK = '#ff9ab4';

const head = (base, dark, extra = '', cx = 50, cy = 58, r = 32) => body(circle(cx, cy, r), base, dark, extra);
const kidHead = (cy = 60, r = 30) => body(circle(17, cy + 4, 6), SKIN, SKIN_DARK, '', { dx: 1, dy: -1, sw: 3 })
  + body(circle(83, cy + 4, 6), SKIN, SKIN_DARK, '', { dx: 1, dy: -1, sw: 3 }) + head(SKIN, SKIN_DARK, '', 50, cy, r);
const roundEar = (x, y, r, base, dark, inner) => body(circle(x, y, r), base, dark, `<circle cx="${x}" cy="${y + 1}" r="${f(r * 0.55)}" fill="${inner}"/>`, { dx: 2, dy: -2, sw: 3 });
const pointEar = (x, base, dark, inner, flip = false) => {
  const k = flip ? -1 : 1;
  const d = `M${50 - k * 32} 46L${50 - k * 28} ${12}L${50 - k * 6} 30Z`;
  const di = `M${50 - k * 28} 40L${50 - k * 26.5} 20L${50 - k * 13} 31Z`;
  return body(d, base, dark, `<path d="${di}" fill="${inner}"/>`, { sw: 3 });
};
const nose = (x, y, rx = 5, ry = 3.6, fill = OL) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fill}"/>`;

const ART = {
  // ── The player's ──
  '🧑‍🌾'() {
    return body('M20 54Q18 40 30 36L70 36Q82 40 80 54Q74 46 66 46L34 46Q26 46 20 54Z', '#8a5a2b', '#6b4420')
      + kidHead(62, 29)
      + body('M28 36Q28 10 50 10Q72 10 72 36Z', '#f5d36a', '#e0b440', '<rect x="20" y="27" width="60" height="8" fill="#e8483a"/>')
      + body(ellipse(50, 38, 45, 9), '#f5d36a', '#e0b440', line('M14 38Q50 44 86 38', '#e0b440', 1.6))
      + face(50, 64, 0.85);
  },
  '👦'() {
    return kidHead()
      + body('M17 58Q14 24 50 22Q86 24 83 58Q80 44 72 40Q64 48 50 42Q36 48 28 40Q20 44 17 58Z', '#7a4a2a', '#5a3418')
      + stroke('M50 23Q54 13 62 14', '#7a4a2a', 3) + face(50, 64, 0.85);
  },
  '👧'() {
    const bow = (x, r) => `<g transform="rotate(${r} ${x} 40)">${body(`M${x} 40L${x - 10} 33L${x - 10} 47Z`, '#ff6fa8', '#e04a88', '', { sw: 2.6 })}${body(`M${x} 40L${x + 10} 33L${x + 10} 47Z`, '#ff6fa8', '#e04a88', '', { sw: 2.6 })}<circle cx="${x}" cy="40" r="3.4" fill="#ff8fbe" stroke="${OL}" stroke-width="2.4"/></g>`;
    return body(circle(15, 68, 12), '#5a3418', '#3e2410') + body(circle(85, 68, 12), '#5a3418', '#3e2410')
      + head(SKIN, SKIN_DARK, '', 50, 60, 30)
      + body('M18 60Q14 22 50 20Q86 22 82 60Q78 40 64 36Q50 44 36 36Q22 40 18 60Z', '#5a3418', '#3e2410')
      + bow(20, -20) + bow(80, 20) + face(50, 64, 0.85);
  },
  '🧒'() {
    return kidHead()
      + body('M20 56Q22 44 30 42L70 42Q78 44 80 56Q72 48 50 48Q28 48 20 56Z', '#e8803a', '#c8642a')
      + body('M18 46Q18 16 50 16Q82 16 82 46Z', '#4ab4ff', '#2a86dc', '<circle cx="50" cy="17" r="3.5" fill="#2a86dc"/>')
      + body('M48 40Q78 34 95 43Q93 52 74 50Q60 48 48 48Z', '#2a86dc', '#1f6cb8', '', { sw: 3 })
      + face(50, 64, 0.85);
  },
  '🐣'() {
    return stroke('M50 16Q47 7 40 7', '#f5c518', 3) + stroke('M52 16Q56 8 62 9', '#f5c518', 3)
      + head('#ffe066', '#f5c518', '', 50, 42, 28) + face(50, 40, 0.78, OL, { mouth: false })
      + body('M44 48L56 48L50 56Z', '#ff9a2a', '#e8780a', '', { sw: 2.6 })
      + body('M16 66L25 58L33 66L42 57L50 66L58 57L67 66L75 58L84 66Q88 94 50 94Q12 94 16 66Z', '#fffaf0', '#e8e0cf',
        `<circle cx="34" cy="80" r="2" fill="#e0d4bc"/><circle cx="62" cy="84" r="2.4" fill="#e0d4bc"/>`);
  },
  '🦖'() {
    const spike = (x, top) => body(`M${x - 7} 30L${x} ${top}L${x + 7} 30Z`, '#ff9a2a', '#e8780a', '', { sw: 2.8 });
    return spike(36, 16) + spike(50, 9) + spike(64, 16)
      + body(rrect(12, 26, 76, 66, 30), '#6fcf4a', '#4cae38',
        `<ellipse cx="50" cy="84" rx="28" ry="12" fill="#bff07a"/><circle cx="26" cy="44" r="3.5" fill="#8fe066"/><circle cx="74" cy="40" r="3" fill="#8fe066"/><circle cx="78" cy="56" r="2.4" fill="#8fe066"/>`)
      + nose(43, 50, 1.8, 1.4) + nose(57, 50, 1.8, 1.4)
      + gloss(70, 34, 2, 5, -50) + face(50, 62, 0.9);
  },
  '🤖'() {
    return stroke('M50 26L50 12', '#8ea0b4', 3) + body(circle(50, 10, 5.5), '#ff5a5a', '#d83a3a', '', { dx: 1, dy: -1, sw: 2.6 })
      + body(rrect(5, 48, 11, 20, 3), '#8ea0b4', '#6e8094', '', { sw: 3 }) + body(rrect(84, 48, 11, 20, 3), '#8ea0b4', '#6e8094', '', { sw: 3 })
      + body(rrect(13, 24, 74, 66, 16), '#c4d0dc', '#94a6b8')
      + body(rrect(23, 36, 54, 40, 9), '#2e3a4a', '#2e3a4a', '', { sw: 2.8 })
      + `<circle cx="39" cy="52" r="5.5" fill="#6ff0ff"/><circle cx="61" cy="52" r="5.5" fill="#6ff0ff"/><circle cx="37.5" cy="50" r="1.6" fill="#fff"/><circle cx="59.5" cy="50" r="1.6" fill="#fff"/>`
      + line('M42 63Q50 70 58 63', '#6ff0ff', 3)
      + `<ellipse cx="20" cy="80" rx="3.4" ry="2" fill="#ff8fb3"/><ellipse cx="80" cy="80" rx="3.4" ry="2" fill="#ff8fb3"/>`
      + gloss(74, 30, 1.8, 4, -60);
  },
  '🦸'() {
    return body('M60 76Q80 72 92 92L60 92Z', '#e8483a', '#c03228', '', { sw: 3 }) + body('M40 76Q20 72 8 92L40 92Z', '#e8483a', '#c03228', '', { sw: 3 })
      + kidHead(56, 30)
      + body('M18 52Q14 20 50 20Q86 20 82 52Q78 36 66 32L60 40L52 30L44 40L36 30Q22 36 18 52Z', '#2e2a3a', '#1e1a28')
      + body('M14 50Q50 40 86 50L86 60Q50 52 14 60Z', '#e8483a', '#c03228', '', { sw: 3 })
      + face(50, 55, 0.82, OL, { whites: true, mouthDy: 6 });
  },
  '🧙'() {
    const stars = `<path d="${star(46, 24, 4.5, 2, 5, 0.1)}" fill="#ffe066"/><path d="${star(58, 34, 3.5, 1.6, 5, 0.1)}" fill="#ffe066"/>`;
    return kidHead(64, 28)
      + body('M18 44L46 6Q50 1 54 6L82 44Z', '#8a5cf5', '#6a3ed8', stars)
      + body(ellipse(50, 44, 42, 8), '#7a4ce8', '#5a2ec8', '', { sw: 3 })
      + face(50, 68, 0.8);
  },
  '🐻'() {
    return roundEar(22, 30, 11, '#c8884a', '#a86a32', '#f2d0a0') + roundEar(78, 30, 11, '#c8884a', '#a86a32', '#f2d0a0')
      + head('#c8884a', '#a86a32', `<ellipse cx="50" cy="70" rx="13" ry="10" fill="#f2d0a0"/>`)
      + nose(50, 65) + gloss(68, 38, 2.4, 6, -45) + face(50, 55, 0.85, OL, { mouthDy: 12 });
  },
  '🐨'() {
    return roundEar(17, 40, 16, '#a8b4c0', '#8a96a4', '#f0e8f0') + roundEar(83, 40, 16, '#a8b4c0', '#8a96a4', '#f0e8f0')
      + head('#a8b4c0', '#8a96a4') + body(ellipse(50, 66, 6.5, 10), '#3b3f4a', '#2a2e38', '', { dx: 1, dy: -1, sw: 2.4 })
      + face(50, 50, 0.95, OL, { mouthDy: 22 });
  },
  '🦁'() {
    return body(scallop(50, 56, 38, 14, 3.4), '#d9862e', '#b8681e')
      + roundEar(26, 28, 8, '#ffc85a', '#f0a83a', '#ffe0a0') + roundEar(74, 28, 8, '#ffc85a', '#f0a83a', '#ffe0a0')
      + head('#ffc85a', '#f0a83a', `<ellipse cx="50" cy="69" rx="12" ry="8.5" fill="#fff0d0"/>`, 50, 58, 27)
      + nose(50, 64, 4.4, 3.2) + face(50, 53, 0.8, OL, { mouthDy: 10 });
  },

  // ── The friends' ──
  '🐱'() {
    const ear = (flip) => pointEar(0, '#4a4a5a', '#36364a', PINK, flip);
    return ear(false) + ear(true)
      + head('#4a4a5a', '#36364a', `<ellipse cx="50" cy="70" rx="14" ry="10" fill="#f4eef8"/>`)
      + `<path d="M46 64L54 64L50 68Z" fill="${PINK}"/>` + line('M14 66L28 68M14 74L28 72M86 66L72 68M86 74L72 72', '#c8c8d8', 1.8)
      + gloss(68, 38, 2.2, 6, -45) + face(50, 54, 0.85, OL, { whites: true, mouthDy: 10 });
  },
  '🐼'() {
    return roundEar(22, 30, 11, '#3b3f4a', '#2a2e38', '#3b3f4a') + roundEar(78, 30, 11, '#3b3f4a', '#2a2e38', '#3b3f4a')
      + head('#ffffff', '#e2e6ec', `<ellipse cx="38" cy="56" rx="9" ry="11" transform="rotate(30 38 56)" fill="#3b3f4a"/><ellipse cx="62" cy="56" rx="9" ry="11" transform="rotate(-30 62 56)" fill="#3b3f4a"/>`)
      + nose(50, 66, 4.4, 3.2) + face(50, 56, 0.82, OL, { whites: true, mouthDy: 9 });
  },
  '🐰'() {
    const ear = (x, r) => `<g transform="rotate(${r} ${x} 40)">${body(ellipse(x, 22, 8, 20), '#fff6f0', '#ecd6cc', `<ellipse cx="${x}" cy="24" rx="3.6" ry="13" fill="#ffb3c6"/>`, { dx: 2, dy: -2, sw: 3 })}</g>`;
    return ear(38, -12) + ear(62, 12) + head('#fff6f0', '#ecd6cc', '', 50, 62, 30)
      + `<path d="M47 66L53 66L50 69Z" fill="${PINK}"/>` + face(50, 60, 0.85, OL, { mouthDy: 4 });
  },
  '🐶'() {
    const ear = (x, r) => `<g transform="rotate(${r} ${x} 40)">${body(ellipse(x, 52, 11, 21), '#b07a3a', '#8a5a28', '', { dx: 2, dy: -2, sw: 3 })}</g>`;
    return head('#f5c870', '#e0a850', `<ellipse cx="50" cy="69" rx="13" ry="10" fill="#fff0d8"/>`, 50, 56, 31)
      + ear(18, 20) + ear(82, -20)
      + nose(50, 63) + gloss(66, 36, 2.2, 6, -45) + face(50, 52, 0.85, OL, { mouthDy: 12 });
  },
  '🐸'() {
    const bump = (x) => body(circle(x, 32, 14), '#6fcf4a', '#4cae38')
      + `<circle cx="${x}" cy="31" r="8.5" fill="#fff" stroke="${OL}" stroke-width="2"/><circle cx="${x + 1}" cy="32" r="4.8" fill="${OL}"/><circle cx="${x - 0.6}" cy="30" r="1.8" fill="#fff"/>`;
    return body(ellipse(50, 64, 40, 27), '#6fcf4a', '#4cae38', `<ellipse cx="50" cy="82" rx="26" ry="10" fill="#bff07a"/>`)
      + bump(30) + bump(70)
      + line('M34 64Q50 76 66 64', OL, 3.2)
      + `<ellipse cx="22" cy="64" rx="5" ry="3" fill="#ff8fb3" opacity="0.85"/><ellipse cx="78" cy="64" rx="5" ry="3" fill="#ff8fb3" opacity="0.85"/>`
      + nose(45, 54, 1.6, 1.2) + nose(55, 54, 1.6, 1.2);
  },
  '🐵'() {
    return roundEar(15, 54, 11, '#a8683a', '#8a5028', '#f2d0a0') + roundEar(85, 54, 11, '#a8683a', '#8a5028', '#f2d0a0')
      + head('#a8683a', '#8a5028', `<path d="M50 44Q58 35 68 39Q79 45 75 60Q72 77 50 81Q28 77 25 60Q21 45 32 39Q42 35 50 44Z" fill="#f2d0a0"/>`, 50, 56, 32)
      + stroke('M48 25Q46 16 54 15', '#a8683a', 3) + nose(46, 63, 1.6, 1.2) + nose(54, 63, 1.6, 1.2)
      + face(50, 55, 0.82, OL, { mouthDy: 10 });
  },
  '🐯'() {
    const stripes = line('M40 30L44 38M50 27L50 36M60 30L56 38M18 54L28 56M18 64L28 62M82 54L72 56M82 64L72 62', '#5a3418', 3.4);
    return roundEar(22, 32, 10, '#ff9a2a', '#e8780a', '#fff0d8') + roundEar(78, 32, 10, '#ff9a2a', '#e8780a', '#fff0d8')
      + head('#ff9a2a', '#e8780a', `<ellipse cx="50" cy="70" rx="15" ry="10" fill="#fff6ea"/>${stripes}`)
      + nose(50, 64, 4.4, 3.2, '#5a3418') + face(50, 54, 0.85, OL, { mouthDy: 10 });
  },
  '🐧'() {
    return head('#3b4a6a', '#2a3650', `<path d="M50 40Q58 30 70 34Q82 42 78 60Q74 80 50 84Q26 80 22 60Q18 42 30 34Q42 30 50 40Z" fill="#ffffff"/>`, 50, 56, 34)
      + face(50, 54, 0.85, OL, { mouth: false })
      + body('M42 62L58 62L50 72Z', '#ff9a2a', '#e8780a', '', { sw: 2.6 });
  },
  '🦄'() {
    const mane = [[28, 34, 12, '#ffb3d9'], [20, 52, 11, '#c3a6ff'], [24, 70, 10, '#8fd3ff'], [42, 26, 9, '#ffb3d9']];
    return mane.map(([x, y, r, c]) => body(circle(x, y, r), c, c, '', { sw: 3 })).join('')
      + pointEar(0, '#ffffff', '#ece6f4', PINK, true)
      + head('#ffffff', '#ece6f4', '', 52, 60, 30)
      + body('M45 34L54 4L60 34Z', GOLD, GOLD_DARK, line('M47 28L58 24M49 20L57 17', GOLD_DARK, 1.8), { sw: 3 })
      + body(circle(40, 34, 8), '#ffb3d9', '#ff8fc4', '', { sw: 3 })
      + face(53, 62, 0.85);
  },
  '🐷'() {
    const ear = (flip) => pointEar(0, '#ffb3c6', '#f08aa6', '#ff8fae', flip);
    return ear(false) + ear(true) + head('#ffb3c6', '#f08aa6')
      + body(ellipse(50, 66, 12, 8.5), PINK, '#f07a98', `${nose(46, 66, 2, 3, '#c04a6a')}${nose(54, 66, 2, 3, '#c04a6a')}`, { dx: 1, dy: -1, sw: 2.8 })
      + gloss(68, 38, 2.2, 6, -45) + face(50, 52, 0.85, OL, { mouthDy: 18 });
  },
};

export const AVATARS = Object.keys(ART);

/** The ones the player can pick in the settings (the rest are the friends'). */
export const PLAYER_AVATARS = ['🧑‍🌾', '👦', '👧', '🧒', '🐣', '🦖', '🤖', '🦸', '🧙', '🐻', '🐨', '🦁'];

/** The SVG markup of an avatar, or null for an emoji that has no drawing. */
export const avatarSvg = (emoji) => (ART[emoji] ? svgDoc(ART[emoji]) : null);

/** An avatar's picture, or the emoji itself if it has none. */
export const avatarImg = (emoji, className = 'av') => (ART[emoji] ? svgImg(`avatar:${emoji}`, () => avatarSvg(emoji), className) : document.createTextNode(emoji));
