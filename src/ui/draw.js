// The drawing kit shared by the menus' SVG pictures (crops in cropIcons.js, the interface's icons in icons.js): one
// look for all of them, bright colours with a darker side, a thick dark outline, a shine, lit from the upper right,
// each drawn in a 100×100 box.

export const OL = '#3b1f5e'; // the outline and the eyes
export const DEEP = '#1a0a1e'; // eyes on dark skins
export const LEAF = '#4cc24a';
export const LEAF_DARK = '#36a83a';
export const WOOD = '#8a5a2b';
export const f = (n) => +n.toFixed(2);
export const TAU = Math.PI * 2;

export const circle = (cx, cy, r) => `M${f(cx - r)} ${f(cy)}A${r} ${r} 0 1 0 ${f(cx + r)} ${f(cy)}A${r} ${r} 0 1 0 ${f(cx - r)} ${f(cy)}Z`;
/** A rectangle with rounded corners, as a path. */
export const rrect = (x, y, w, h, r) =>
  `M${x + r} ${y}H${x + w - r}Q${x + w} ${y} ${x + w} ${y + r}V${y + h - r}Q${x + w} ${y + h} ${x + w - r} ${y + h}H${x + r}Q${x} ${y + h} ${x} ${y + h - r}V${y + r}Q${x} ${y} ${x + r} ${y}Z`;
export const ellipse = (cx, cy, rx, ry) => `M${f(cx - rx)} ${f(cy)}A${rx} ${ry} 0 1 0 ${f(cx + rx)} ${f(cy)}A${rx} ${ry} 0 1 0 ${f(cx - rx)} ${f(cy)}Z`;

let clipN = 0;

/** A shape in its colour, darker on the side away from the light (the shape again, moved toward the light, is the
 * lit part), with extra drawn inside it and the dark outline round it. */
export function body(d, base, dark, extra = '', { dx = 5, dy = -4, sw = 3.4, transform = '' } = {}) {
  const id = `k${clipN++}`;
  const tr = transform ? ` transform="${transform}"` : '';
  return `<g${tr}><clipPath id="${id}"><path d="${d}"/></clipPath>`
    + `<g clip-path="url(#${id})"><path d="${d}" fill="${dark}"/><path d="${d}" fill="${base}" transform="translate(${dx} ${dy})"/>${extra}</g>`
    + `<path d="${d}" fill="none" stroke="${OL}" stroke-width="${sw}" stroke-linejoin="round"/></g>`;
}

/** A line drawn with the outline round it (stems, stalks). */
export const stroke = (d, color, w = 3) =>
  `<path d="${d}" fill="none" stroke="${OL}" stroke-width="${f(w + 3.2)}" stroke-linecap="round" stroke-linejoin="round"/>`
  + `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;

/** A thin line inside a shape (creases, veins). */
export const line = (d, color, w = 2, op = 1) =>
  `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round"${op < 1 ? ` opacity="${op}"` : ''}/>`;

/** A leaf from (x, y), len long, pointing rot degrees clockwise from +x, with its midrib. */
export function leaf(x, y, len, w, rot, fill = LEAF, vein = LEAF_DARK) {
  return `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(rot)})">`
    + `<path d="M0 0Q${f(len / 2)} ${f(-w)} ${len} 0Q${f(len / 2)} ${w} 0 0Z" fill="${fill}" stroke="${OL}" stroke-width="2.4" stroke-linejoin="round"/>`
    + (vein ? `<path d="M2 0Q${f(len / 2)} ${f(-w * 0.12)} ${f(len * 0.78)} 0" fill="none" stroke="${vein}" stroke-width="1.3" stroke-linecap="round"/>` : '')
    + '</g>';
}

/** A seed or pip: a little teardrop, tip up at rot 0. */
export const drop = (x, y, rot, s, fill) =>
  `<path d="M0 -3.2C1.9 -1 2.1 1.8 0 2.8C-2.1 1.8 -1.9 -1 0 -3.2Z" fill="${fill}" transform="translate(${f(x)} ${f(y)}) rotate(${f(rot)}) scale(${s})"/>`;

export const dots = (pts, r, fill, op = 1) => pts.map(([x, y, rr]) =>
  `<circle cx="${f(x)}" cy="${f(y)}" r="${rr ?? r}" fill="${fill}"${op < 1 ? ` opacity="${op}"` : ''}/>`).join('');

/** Points spread evenly over an ellipse (a sunflower's spiral), leaving out those within the face's box. */
export function scatter(cx, cy, rx, ry, n, keepOut = null) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = i * 2.39996;
    const r = Math.sqrt((i + 0.5) / n);
    const p = [cx + Math.cos(a) * r * rx, cy + Math.sin(a) * r * ry];
    if (keepOut && Math.abs(p[0] - keepOut[0]) < keepOut[2] && Math.abs(p[1] - keepOut[1]) < keepOut[3]) continue;
    out.push(p);
  }
  return out;
}

/** Points on a staggered grid over a box. */
export function grid(x0, y0, x1, y1, dx, dy) {
  const out = [];
  for (let y = y0, row = 0; y <= y1; y += dy, row++) {
    for (let x = x0 + (row % 2 ? dx / 2 : 0); x <= x1; x += dx) out.push([x, y]);
  }
  return out;
}

/** A round shape with a scalloped edge (lettuce, cabbage leaves). */
export function scallop(cx, cy, r, n, amp, rot = 0, ry = r) {
  let d = '';
  for (let i = 0; i <= n; i++) {
    const a = rot + (i / n) * TAU;
    const p = [cx + Math.cos(a) * r, cy + Math.sin(a) * ry];
    if (!i) {
      d = `M${f(p[0])} ${f(p[1])}`;
      continue;
    }
    const m = rot + ((i - 0.5) / n) * TAU;
    d += `Q${f(cx + Math.cos(m) * (r + amp * 2))} ${f(cy + Math.sin(m) * (ry + amp * 2))} ${f(p[0])} ${f(p[1])}`;
  }
  return `${d}Z`;
}

/** A star with rounded points (the starfruit, calyxes). */
export function star(cx, cy, ro, ri, n, round = 0.22, rot = -90) {
  const pts = [];
  for (let k = 0; k < n * 2; k++) {
    const a = ((rot + (k * 180) / n) * Math.PI) / 180;
    const r = k % 2 ? ri : ro;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  const lerp = (a, b, s) => [a[0] + (b[0] - a[0]) * s, a[1] + (b[1] - a[1]) * s];
  let d = '';
  pts.forEach((v, k) => {
    const s = k % 2 ? round * 0.6 : round;
    const p1 = lerp(v, pts[(k + pts.length - 1) % pts.length], s);
    const p2 = lerp(v, pts[(k + 1) % pts.length], s);
    d += `${k ? 'L' : 'M'}${f(p1[0])} ${f(p1[1])}Q${f(v[0])} ${f(v[1])} ${f(p2[0])} ${f(p2[1])}`;
  });
  return `${d}Z`;
}

/** Circles merged into one outlined shape (broccoli florets, bunches). */
export const cloud = (circles, fill) =>
  circles.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${OL}" stroke="${OL}" stroke-width="6.8"/>`).join('')
  + circles.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`).join('');

/** The face: eyes with a shine, an open smile and pink cheeks, centred on (x, y). whites puts the eyes on white (for
 * dark fur), mouth: false leaves the mouth out (a beak instead), mouthDy moves it down (below a nose or snout). */
export function face(x, y, s = 1, eyes = OL, { mouth = true, whites = false, mouthDy = 0 } = {}) {
  const eye = (ex) => (whites ? `<ellipse cx="${f(ex)}" cy="${f(y)}" rx="${f(6 * s)}" ry="${f(6.8 * s)}" fill="#fff" stroke="${OL}" stroke-width="${f(1.6 * s)}"/>` : '')
    + `<ellipse cx="${f(ex)}" cy="${f(y)}" rx="${f(4 * s)}" ry="${f(4.8 * s)}" fill="${eyes}"/>`
    + `<circle cx="${f(ex - 1.3 * s)}" cy="${f(y - 1.8 * s)}" r="${f(1.6 * s)}" fill="#fff"/>`
    + `<circle cx="${f(ex + 1.4 * s)}" cy="${f(y + 1.6 * s)}" r="${f(0.8 * s)}" fill="#fff"/>`;
  const my = y + mouthDy;
  const lips = mouth
    ? `<path d="M${f(x - 4 * s)} ${f(my + 5 * s)}Q${f(x)} ${f(my + 13 * s)} ${f(x + 4 * s)} ${f(my + 5 * s)}Z" fill="${eyes}" stroke="${eyes}" stroke-width="${f(0.8 * s)}" stroke-linejoin="round"/>`
      + `<ellipse cx="${f(x)}" cy="${f(my + 7.9 * s)}" rx="${f(1.9 * s)}" ry="${f(1.1 * s)}" fill="#ff7a9a"/>`
    : '';
  const cheeks = [-1, 1].map((k) => `<ellipse cx="${f(x + k * 13.5 * s)}" cy="${f(y + 5.5 * s)}" rx="${f(3.6 * s)}" ry="${f(2.2 * s)}" fill="#ff8fb3" opacity="0.85"/>`).join('');
  return eye(x - 10 * s) + eye(x + 10 * s) + lips + cheeks;
}

/** The shine: a white streak (rot turns it) and maybe a dot. */
export const gloss = (x, y, rx, ry, rot, dot = null) =>
  `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" transform="rotate(${rot} ${x} ${y})" fill="#fff" opacity="0.6"/>`
  + (dot ? `<circle cx="${dot[0]}" cy="${dot[1]}" r="${dot[2]}" fill="#fff" opacity="0.6"/>` : '');

/** A whole picture: the SVG round what draw() returns (its clip ids start again for each picture). */
export function svgDoc(draw) {
  clipN = 0;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${draw()}</svg>`;
}

/** An <img> showing a picture, its data URL made once per key. */
const urls = new Map();
export function svgImg(key, make, className) {
  let url = urls.get(key);
  if (!url) {
    url = `data:image/svg+xml,${encodeURIComponent(make())}`;
    urls.set(key, url);
  }
  const img = document.createElement('img');
  img.className = className;
  img.alt = '';
  img.draggable = false;
  img.src = url;
  return img;
}
