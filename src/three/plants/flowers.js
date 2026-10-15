// Flowers as the reference design draws them in clumps along the roads and the river: a mound of broad pointed leaves
// rising from the ground, and over it flowers on slender stems, their heads turned up to the sky and to the camera.
// One model for them all; the kinds (FLOWERS) differ in their heads and colours: the white daisies by the river at the
// front left, big heads of six broad rounded petals, cupped up a little, round an orange heart; and the pinks along the
// ring road, which stand alone in a row (flowerRow), each on its own tall stem, a round head of three rings of cupped
// petals, pink, magenta, purple or white flushed pink; and the yellow clumps along the roads, round heads of many short
// petals round a dark brown heart, like black-eyed susans, a few golden orange or dark red among them; and the low
// purple clumps by the river, like pansies, five broad flat petals, dark at the middle and pale at the edges, round a
// yellow eye; and spikes of small flowers rising from a lower mound, orange like gladioli on the well's left, purple
// like lupins by the bench beyond it.
import * as THREE from 'three';
import { seeded } from '../../util.js';
import { TAU, SOFT_MATERIAL, mesher, palette, tube, glowing } from './parts.js';
import { leaf } from './birch.js';
import { clump } from './roundTree.js';

const GOLDEN = Math.PI * (3 - Math.sqrt(5));
// Which way the heads face: up to the sky, and a little to the camera (FarmScene's camera looks from (1, 0.95, 1)).
const FACING = new THREE.Vector3(1, 2.2, 1).normalize();

/**
 * The kinds: their colours (the petals at the tip and at the foot, the heart and its top, the leaves and stems: shade,
 * dark, mid, light); their heads' petals (how many, how wide of the head's radius, how far they cup up, of it), and
 * `rings` more inside them, each [how many, how long of the outer ones, how far they cup up], deeper in colour; how
 * wide the heart is, of the head's radius (`eye`, 0.26 if not given); how many heads ([least, most]) and how big
 * (their radius, of the clump's height); how much it glows in its own colours, so the white stays white in the warm
 * sun (see glowing). A kind that stands in a row (flowerRow) gives its sizes in
 * world units: the heads' radius, the stems' radius, its leaves' length, how many plants to a unit of the row.
 * `mix`: the colours ([petals' tip, petals' foot, heart, heart's top, the foot's colour if not given]) each head takes
 * one of, in place of those in `colors`.
 */
export const FLOWERS = {
  daisy: {
    colors: { petal: '#eef3ff', petalFoot: '#e6ebf2', heart: '#ec8c1c', heartTop: '#ffc43a', shade: '#16420e', dark: '#24601a', mid: '#3f8a26', light: '#7ab844' },
    petals: 6, petalWide: 0.85, cup: 0.3, heads: [8, 10], head: 0.12, glow: 0.5,
  },
  pink: {
    colors: { petal: '#ff8cc0', petalFoot: '#d42c78', heart: '#8a1446', heartTop: '#d42c78', shade: '#173f10', dark: '#255c18', mid: '#3d8526', light: '#74b040' },
    mix: [['#ff8cc0', '#d42c78', '#8a1446'], ['#f05aa8', '#b0186a', '#6a0e3c'], ['#c46ae0', '#7e2aa8', '#4a1466'], ['#ffe8f2', '#f07aae', '#c43a78']],
    petals: 7, petalWide: 0.95, cup: 0.8, rings: [[6, 0.72, 1.1], [5, 0.48, 1.4]], head: 0.05, stem: 0.008, leaf: 0.09, perUnit: 5, glow: 0.3,
  },
  yellow: {
    colors: { petal: '#f6d000', petalFoot: '#f0b400', heart: '#3e220c', heartTop: '#6a4016', shade: '#1a4a10', dark: '#2a6618', mid: '#4a9228', light: '#86c246' },
    mix: [
      ...Array(4).fill(['#f6d000', '#f0b400', '#3e220c', '#6a4016']),
      ['#fae020', '#f2c400', '#4a2a0e', '#7a4a1a'],
      ['#f4a800', '#e07000', '#4a220a', '#7a3a12'],
      ['#d2401a', '#801a0c', '#2e1408', '#5a2a10'],
    ],
    petals: 9, petalWide: 0.6, cup: 0.35, rings: [[8, 0.72, 0.6]], heads: [7, 9], head: 0.16, glow: 0.4,
  },
  purple: {
    colors: { petal: '#b8a4f0', petalFoot: '#4a1a8a', heart: '#ffc61e', heartTop: '#ffe066', shade: '#18440f', dark: '#28621a', mid: '#468e28', light: '#80bc44' },
    mix: [
      ...Array(2).fill(['#b8a4f0', '#4a1a8a', '#ffc61e', '#ffe066']),
      ['#9a6ae0', '#2e0e5e', '#ffc61e', '#ffe066'],
      ['#ece4fc', '#6a3ab0', '#ffc61e', '#ffe066'],
      ['#a4aaf2', '#3a2a90', '#ffc61e', '#ffe066'],
    ],
    petals: 5, petalWide: 1.1, cup: 0.15, eye: 0.14, heads: [7, 9], head: 0.17, glow: 0.3,
  },
  // Spikes like gladioli, orange and yellow, the florets big and turned to the camera, on the well's left.
  orange: {
    colors: { petal: '#ffb020', petalFoot: '#e85a0a', heart: '#c83a06', heartTop: '#f08a10', shade: '#18440f', dark: '#28621a', mid: '#468e28', light: '#80bc44' },
    mix: [['#ffb020', '#e85a0a', '#c83a06'], ['#ffd040', '#f08a10', '#c85a08'], ['#ff8a20', '#d8400a', '#a02a06']],
    petals: 6, petalWide: 0.75, cup: 0.6, spikes: [1, 2], florets: 7, floret: 0.09, spike: 0.55, side: true, mound: 0.6, glow: 0.3,
  },
  // Spikes like lupins, purple and now and then pink, dense with small florets all round, by the bench beyond the well.
  lupin: {
    colors: { petal: '#b48af0', petalFoot: '#5a2ab0', heart: '#3a1680', heartTop: '#5a2ab0', shade: '#18440f', dark: '#28621a', mid: '#468e28', light: '#80bc44' },
    mix: [['#9a86f0', '#3e2aa0', '#2a1a70'], ['#9a86f0', '#3e2aa0', '#2a1a70'], ['#b48af0', '#5a2ab0', '#3a1680'], ['#e6a0e0', '#a03aa0', '#701a70']],
    petals: 4, petalWide: 1.1, cup: 1.3, spikes: [3, 5], florets: 14, floret: 0.055, spike: 0.5, mound: 0.6, glow: 0.3,
  },
};

/** `c` with the petals' and heart's colours from an entry of a kind's `mix`. */
const mixed = (c, [tip, deep, heart, top]) => ({ ...c, petal: new THREE.Color(tip), petalFoot: new THREE.Color(deep), heart: new THREE.Color(heart), heartTop: new THREE.Color(top ?? deep) });

// A bud: a head of five petals cupped up so far they close over it.
const BUD = { petals: 5, petalWide: 1, cup: 2.4 };

/**
 * How a clump grows, in units of its height: its leaves ([least, most], how long, how wide of their length), how far
 * out from its middle the heads spread, and the stems' radius.
 */
const FORM = { leaves: [40, 48], leaf: 0.34, wide: 0.62, spread: 0.6, stem: 0.012 };

/**
 * A head at `C` facing `F`, radius `R`: petals round a domed heart, each a broad oval with a rounded tip, cupped up
 * towards its tip and ridged a little down its middle, and the kind's rings of shorter, deeper petals inside them; a
 * small green cup behind.
 */
function head(m, rand, C, F, R, k, c) {
  const e1 = new THREE.Vector3().crossVectors(F, new THREE.Vector3(0, 0, 1)).normalize();
  const e2 = new THREE.Vector3().crossVectors(e1, F);
  const at = (r, a, up) => C.clone().addScaledVector(e1, Math.cos(a) * r).addScaledVector(e2, Math.sin(a) * r).addScaledVector(F, up * R);
  const front = () => F;
  const back = () => F.clone().negate();
  const r0 = R * (k.eye ?? 0.26);
  // The petals: along each, how far out (0 at its foot, 1 at its tip) and how wide there, of its widest.
  const edge = [[0, 0.35], [0.3, 0.85], [0.62, 1], [0.88, 0.7]];
  // A ring of n petals `scale` as long as the outer ones, cupped up `cup`, `deep` of the way to the foot's colour.
  const petals = (n, scale, cup, deep) => {
    const half = (R * scale * k.petalWide) / 2;
    const spin = rand() * TAU;
    for (let i = 0; i < n; i++) {
      const a = spin + (i / n) * TAU + (rand() - 0.5) * 0.15;
      const len = R * scale * (0.92 + rand() * 0.16);
      const r = (f) => r0 + (len - r0) * f;
      const rise = (f) => cup * f * f;
      const lit = c.petal.clone().lerp(c.petalFoot, rand() * 0.15);
      if (deep) lit.lerp(c.petalFoot, deep);
      const tone = (f) => c.petalFoot.clone().lerp(lit, THREE.MathUtils.smoothstep(f, 0, 0.5));
      const mids = edge.map(([f]) => at(r(f), a, rise(f) + 0.03 * Math.sin(Math.PI * f)));
      const tip = at(len, a, rise(1));
      for (const s of [1, -1]) {
        const rim = edge.map(([f, w]) => at(r(f), a + (s * w * half) / r(f), rise(f)));
        const cols = edge.map(([f]) => tone(f));
        for (let j = 0; j < edge.length - 1; j++) {
          m.tri(mids[j], rim[j], rim[j + 1], cols[j], cols[j], cols[j + 1], front);
          m.tri(mids[j], rim[j + 1], mids[j + 1], cols[j], cols[j + 1], cols[j + 1], front);
        }
        m.tri(mids[3], rim[3], tip, cols[3], cols[3], lit, front);
      }
    }
  };
  petals(k.petals, 1, k.cup, 0);
  (k.rings ?? []).forEach(([n, scale, cup], i) => petals(n, scale, cup, 0.35 * (i + 1)));
  // The heart, domed, in two rings of facets.
  const D = 8;
  const ring = Array.from({ length: D }, (_, j) => at(r0 * 1.15, (j / D) * TAU, 0.05));
  const inner = Array.from({ length: D }, (_, j) => at(r0 * 0.65, ((j + 0.5) / D) * TAU, 0.15));
  const top = at(0, 0, 0.2);
  for (let j = 0; j < D; j++) {
    const j1 = (j + 1) % D;
    const j0 = (j + D - 1) % D;
    m.tri(ring[j], ring[j1], inner[j], c.heart, c.heart, c.heartTop, front);
    m.tri(inner[j0], ring[j], inner[j], c.heartTop, c.heart, c.heartTop, front);
    m.tri(inner[j], top, inner[j0], c.heartTop, c.heartTop, c.heartTop, front);
  }
  // The green cup behind it.
  const tail = C.clone().addScaledVector(F, -R * 0.25);
  for (let j = 0; j < 6; j++) m.tri(at(r0 * 1.3, (j / 6) * TAU, -0.02), at(r0 * 1.3, ((j + 1) / 6) * TAU, -0.02), tail, c.dark, c.dark, c.shade, back);
}

/** The leaves' colour from `c`'s shade to its light, t from 0 to 1. */
function toner(c) {
  const ramp = [c.shade, c.dark, c.mid, c.light];
  return (t) => {
    const x = THREE.MathUtils.clamp(t, 0, 1) * 3;
    const i = Math.min(2, Math.floor(x));
    return ramp[i].clone().lerp(ramp[i + 1], x - i);
  };
}

/**
 * The leaves and stems (`m`, glowing a little, to soften their shade) and the heads (`hm`, glowing `glow`) as meshes,
 * scaled `scale`, in a group.
 */
function build(m, hm, scale, glow) {
  const group = new THREE.Group();
  for (const [mm, g0] of [[m, 0.12], [hm, glow]]) {
    const g = mm.geometry();
    g.scale(scale, scale, scale);
    const material = glowing(SOFT_MATERIAL, g0);
    // Thin petals and leaves show either face.
    material.side = THREE.DoubleSide;
    const mesh = new THREE.Mesh(g, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }
  return group;
}

/**
 * A kind's spikes, rising from the middle of its mound (in units of the clump's height): stalks, the middle ones
 * tallest, each a little out and leaning its own way, in one of the kind's colours (`mix`); up the top `spike` of each,
 * `florets` small heads (`floret` their radius at the foot of the spike), smaller and smaller towards its tip, the top
 * quarter of them buds; turned out round the stalk in a spiral, or, for a kind that turns them to one `side`, to either
 * side of the camera in turn; and a leaf or two low on the stalk.
 */
function spikes(m, hm, rand, k, c) {
  const tone = toner(c);
  const n = k.spikes[0] + Math.floor(rand() * (k.spikes[1] - k.spikes[0] + 1));
  const spin = rand() * TAU;
  const camera = Math.atan2(FACING.z, FACING.x);
  for (let j = 0; j < n; j++) {
    const a = spin + j * GOLDEN;
    const out = 0.2 * Math.sqrt((j + 0.5) / n);
    const top = 1 - 0.3 * (out / 0.2) ** 2 - rand() * 0.08;
    const foot = new THREE.Vector3(Math.cos(a) * 0.03, 0, Math.sin(a) * 0.03);
    const tip = new THREE.Vector3(Math.cos(a) * out + (rand() - 0.5) * 0.06, top, Math.sin(a) * out + (rand() - 0.5) * 0.06);
    const along = (t) => foot.clone().lerp(tip, t * t).setY(top * t);
    const path = [0, 0.4, 0.75, 1].map(along);
    tube(m, path, path.map((_, i) => FORM.stem * (1.3 - 0.5 * (i / 3))), { dark: c.dark, light: c.mid }, { sides: 4 });
    for (const t of [0.2, 0.32]) {
      const b = rand() * TAU;
      const dir = new THREE.Vector3(Math.cos(b), 0.6, Math.sin(b)).normalize();
      const face = new THREE.Vector3(0, 1, 0).addScaledVector(dir, -dir.y).normalize();
      leaf(m, along(t), dir, face, FORM.leaf * (0.5 + rand() * 0.2), tone(0.45 + 0.4 * face.y), FORM.wide * 0.7);
    }
    const cc = mixed(c, k.mix[Math.floor(rand() * k.mix.length)]);
    const turn = rand() * TAU;
    for (let i = 0; i < k.florets; i++) {
      const t = i / (k.florets - 1);
      const p = along(1 - k.spike * (1 - t));
      const R = k.floret * (1 - 0.55 * t) * (0.9 + rand() * 0.2);
      const b = k.side ? camera + (i % 2 ? 0.75 : -0.75) + (rand() - 0.5) * 0.3 : turn + i * 2.4;
      const F = new THREE.Vector3(Math.cos(b), 0.5 + t, Math.sin(b)).normalize();
      const C = p.clone().add(new THREE.Vector3(Math.cos(b), 0, Math.sin(b)).multiplyScalar(R * 0.4));
      head(hm, rand, C, F, R, t > 0.75 ? BUD : k, cc);
    }
  }
}

/**
 * A clump of flowers of a kind (a name in FLOWERS), `height` tall to the top of its heads (world units), laid out by
 * `seed`. Returns a group standing on the ground at the origin: the leaves and stems, and the heads.
 */
export function flowers(seed = 1, height = 0.6, kind = 'daisy') {
  const k = FLOWERS[kind];
  const rand = seeded(seed);
  const c = palette(k.colors, (rand() - 0.5) * 0.02, 1 + (rand() - 0.5) * 0.08, ['petal', 'petalFoot', 'heart', 'heartTop']);
  const tone = toner(c);
  const m = mesher();
  // The heads are a mesh of their own, which glows (see the kinds).
  const hm = mesher();
  const turn = rand() * TAU;
  // A dark core, so the gaps between the leaves show deep green rather than the grass.
  // A kind of spikes has a lower mound (`mound`, of the usual).
  const mound = k.mound ?? 1;
  const core = new THREE.Vector3(0, 0.18 * mound, 0);
  clump(m, rand, core, 0.26 * mound, seed * 31, { shade: c.shade, dark: c.shade, mid: c.dark, light: c.dark }, { mid: core, bottom: 0, top: 0.5, soft: 0.3 });
  // The leaves, a mound of them every way round: the inner ones from higher up and more upright, the outer ones low
  // and spreading; their faces turned up, coloured by how they face the sky and how far in they are.
  const n = FORM.leaves[0] + Math.floor(rand() * (FORM.leaves[1] - FORM.leaves[0] + 1));
  for (let i = 0; i < n; i++) {
    const v = (i + 0.5) / n;
    const a = turn + i * GOLDEN + (rand() - 0.5) * 0.3;
    const e = 1.3 - 0.85 * v + (rand() - 0.5) * 0.25;
    const along = new THREE.Vector3(Math.cos(a) * Math.cos(e), Math.sin(e), Math.sin(a) * Math.cos(e));
    const face = new THREE.Vector3(0, 1, 0).addScaledVector(along, -along.y).normalize().applyAxisAngle(along, (rand() - 0.5) * 0.8);
    const rb = 0.05 + 0.22 * v;
    const base = new THREE.Vector3(Math.cos(a) * rb * mound, (0.4 - 0.32 * v) * mound, Math.sin(a) * rb * mound);
    leaf(m, base, along, face, FORM.leaf * (1 - 0.15 * v) * (0.8 + rand() * 0.35) * mound, tone(0.28 + 0.4 * face.y + 0.3 * (1 - v) + (rand() - 0.5) * 0.25), FORM.wide);
  }
  if (k.spikes) {
    spikes(m, hm, rand, k, c);
    const group = build(m, hm, height, k.glow);
    group.userData.height = height;
    return group;
  }
  // The heads, spread over a low dome, the middle ones highest, each on its stem from the foot of the clump; turned up
  // and to the camera, and a little out the way they lie, each a little its own way.
  const heads = k.heads[0] + Math.floor(rand() * (k.heads[1] - k.heads[0] + 1));
  const spin = rand() * TAU;
  for (let j = 0; j < heads; j++) {
    const a = spin + j * GOLDEN;
    const out = FORM.spread * Math.sqrt((j + 0.5) / heads) * (0.85 + rand() * 0.3);
    const R = k.head * (0.85 + rand() * 0.3);
    const C = new THREE.Vector3(Math.cos(a) * out, 1 - R * 0.5 - 0.35 * (out / FORM.spread) ** 2 - rand() * 0.1, Math.sin(a) * out);
    const F = FACING.clone().add(new THREE.Vector3(Math.cos(a), 0, Math.sin(a)).multiplyScalar(0.5 * (out / FORM.spread))).add(new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).multiplyScalar(0.5)).normalize();
    const foot = new THREE.Vector3(Math.cos(a) * 0.03, 0, Math.sin(a) * 0.03);
    const end = C.clone().addScaledVector(F, -R * 0.2);
    // Up from the foot, bending out towards the head.
    const path = [0, 0.35, 0.7, 1].map((t) => foot.clone().lerp(end, t ** 1.6).setY(end.y * t ** 0.85));
    tube(m, path, path.map((_, i) => FORM.stem * (1.1 - 0.3 * (i / 3))), { dark: c.dark, light: c.mid }, { sides: 4 });
    // Two leaves up the stem, either side, out and up a little, so the heads sit among leaves.
    for (const [t, side] of [[0.5, 1], [0.72, -1]]) {
      const b = (a + side * (0.7 + rand() * 0.5));
      const along = new THREE.Vector3(Math.cos(b), 0.35 + rand() * 0.3, Math.sin(b)).normalize();
      const face = new THREE.Vector3(0, 1, 0).addScaledVector(along, -along.y).normalize().applyAxisAngle(along, (rand() - 0.5) * 0.6);
      const at = foot.clone().lerp(end, t ** 1.6).setY(end.y * t ** 0.85);
      leaf(m, at, along, face, FORM.leaf * (0.6 + rand() * 0.25), tone(0.45 + 0.4 * face.y + (rand() - 0.5) * 0.2), FORM.wide);
    }
    head(hm, rand, C, F, R, k, k.mix ? mixed(c, k.mix[Math.floor(rand() * k.mix.length)]) : c);
  }
  const group = build(m, hm, height, k.glow);
  group.userData.height = height;
  return group;
}

/**
 * A row of flowers of a kind that stands in a row (a name in FLOWERS), `length` long along x round the origin, about
 * `height` tall (world units), laid out by `seed`: each plant a little out of line and its own height, on a tall stem
 * leaning a little, a few narrow leaves at its foot and one up the stem, now and then a bud on a short stalk off it, and
 * a head turned up and to the camera, in one of the kind's colours. Returns a group standing on the ground.
 */
export function flowerRow(seed = 1, length = 2, height = 0.5, kind = 'pink') {
  const k = FLOWERS[kind];
  const rand = seeded(seed);
  const c = palette(k.colors, (rand() - 0.5) * 0.02, 1 + (rand() - 0.5) * 0.08);
  const tone = toner(c);
  const m = mesher();
  const hm = mesher();
  const n = Math.max(1, Math.round(length * k.perUnit));
  const upward = (along) => new THREE.Vector3(0, 1, 0).addScaledVector(along, -along.y).normalize().applyAxisAngle(along, (rand() - 0.5) * 0.6);
  for (let i = 0; i < n; i++) {
    const x = ((i + 0.5) / n - 0.5) * length + (rand() - 0.5) * (length / n) * 0.6;
    const foot = new THREE.Vector3(x, 0, (rand() - 0.5) * 0.14);
    const h = height * (0.7 + rand() * 0.45);
    const R = k.head * (0.85 + rand() * 0.3);
    const cc = mixed(c, k.mix[Math.floor(rand() * k.mix.length)]);
    const C = foot.clone().add(new THREE.Vector3((rand() - 0.5) * 0.12, 0, (rand() - 0.5) * 0.12)).setY(h - R * 0.4);
    const F = FACING.clone().add(new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).multiplyScalar(0.5)).normalize();
    const end = C.clone().addScaledVector(F, -R * 0.2);
    // Up from the foot, the lean coming in towards the top.
    const along = (t) => foot.clone().lerp(end, t * t).setY(end.y * t);
    const path = [0, 0.4, 0.75, 1].map(along);
    tube(m, path, path.map((_, j) => k.stem * (1.15 - 0.3 * (j / 3))), { dark: c.dark, light: c.mid }, { sides: 4 });
    // Narrow leaves at its foot, every way round, and one up the stem.
    const turn = rand() * TAU;
    for (let j = 0; j < 3; j++) {
      const a = turn + j * 2.1 + (rand() - 0.5) * 0.5;
      const out = new THREE.Vector3(Math.cos(a) * 0.6, 0.75, Math.sin(a) * 0.6).normalize();
      const face = upward(out);
      leaf(m, foot.clone().setY(0.01), out, face, k.leaf * (0.8 + rand() * 0.4), tone(0.3 + 0.4 * face.y + (rand() - 0.5) * 0.2), 0.38);
    }
    const a = turn + 1;
    const out = new THREE.Vector3(Math.cos(a), 0.5, Math.sin(a)).normalize();
    const face = upward(out);
    leaf(m, along(0.45), out, face, k.leaf * (0.6 + rand() * 0.3), tone(0.4 + 0.4 * face.y + (rand() - 0.5) * 0.2), 0.38);
    // Now and then a bud on a short stalk off the stem, nodding out.
    if (rand() < 0.4) {
      const b = rand() * TAU;
      const from = along(0.7);
      const dir = new THREE.Vector3(Math.cos(b) * 0.7, 1, Math.sin(b) * 0.7).normalize();
      const to = from.clone().addScaledVector(dir, h * 0.18);
      tube(m, [from, from.clone().lerp(to, 0.5).add(new THREE.Vector3(0, h * 0.02, 0)), to], [k.stem * 0.7, k.stem * 0.6, k.stem * 0.5], { dark: c.dark, light: c.mid }, { sides: 4 });
      head(hm, rand, to.clone().addScaledVector(dir, R * 0.1), dir, R * 0.4, BUD, cc);
    }
    head(hm, rand, C, F, R, k, cc);
  }
  const group = build(m, hm, 1, k.glow);
  group.userData.height = height;
  return group;
}
