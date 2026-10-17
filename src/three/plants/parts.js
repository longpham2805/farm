// What the plants share: flat-faceted meshes coloured at their corners, as the reference design's low-poly trees,
// and the pieces they are built from.
import * as THREE from 'three';

export const TAU = Math.PI * 2;

// Every material a plant uses has a name, so a model edited by hand in Blender (edited.js) gets its materials back
// by name: the maker's word (MATERIAL_MAKERS) and its words, then what glowing() and twoSided() add.
/** One material for the plants: the colours are in the mesh, each facet lit flat. */
export const MATERIAL = new THREE.MeshStandardMaterial({ name: 'flat', vertexColors: true, flatShading: true, roughness: 0.92 });
/** For plants whose edges are softened: lit by the normals in the mesh, which bend smoothly round its corners. */
export const SOFT_MATERIAL = new THREE.MeshStandardMaterial({ name: 'soft', vertexColors: true, roughness: 0.92 });

/**
 * A copy of `material` that also glows a little in its own colours (`glow` of them), so a bright colour the game's
 * warm sun would dull (a pink, which it turns salmon and grey) keeps its hue in the light and in the shade.
 */
export function glowing(material, glow) {
  const m = material.clone();
  m.name = `${material.name} glow ${glow}`;
  m.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
  totalEmissiveRadiance += vColor.rgb * ${glow.toFixed(3)};`);
  };
  m.customProgramCacheKey = () => `glow ${glow}`;
  return m;
}

/** `material` (a plant's own copy) showing either face of its thin leaves. */
export function twoSided(material) {
  material.side = THREE.DoubleSide;
  material.name += ' double';
  return material;
}

/**
 * The materials by the first word of their names, each made from the rest of its words (none for these two; the
 * rock's stone adds its colours). The other plant files add theirs.
 */
export const MATERIAL_MAKERS = { flat: () => MATERIAL, soft: () => SOFT_MATERIAL };
const named = new Map();

/** The material called `name`, as the plant it was exported from had it; the same one each time it is asked for. */
export function materialNamed(name) {
  if (named.has(name)) return named.get(name);
  const words = name.split(' ');
  const glow = words.indexOf('glow');
  const double = words.at(-1) === 'double';
  const make = MATERIAL_MAKERS[words[0]];
  if (!make) throw new Error(`no plant material is called "${name}"`);
  let m = make(...words.slice(1, glow >= 0 ? glow : double ? -1 : undefined));
  if (glow >= 0) m = glowing(m, parseFloat(words[glow + 1]));
  if (double) m = twoSided(glow >= 0 ? m : m.clone());
  named.set(name, m);
  return m;
}

/**
 * Triangles with a colour at each corner, each turned to face the way `facing(a, b, c)` gives; lit flat, or by
 * `normals` at its corners when given.
 */
export function mesher() {
  const pos = [];
  const col = [];
  const nor = [];
  const n = new THREE.Vector3();
  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();
  const tri = (a, b, c, ca, cb, cc, facing, normals = null) => {
    ab.subVectors(b, a);
    ac.subVectors(c, a);
    n.crossVectors(ab, ac).normalize();
    let [na, nb, nc] = normals ?? [n, n, n];
    if (n.dot(facing(a, b, c)) < 0) {
      [b, c, cb, cc, nb, nc] = [c, b, cc, cb, nc, nb];
      if (!normals) na = nb = nc = n.negate();
    }
    for (const p of [a, b, c]) pos.push(p.x, p.y, p.z);
    for (const k of [ca, cb, cc]) col.push(k.r, k.g, k.b);
    for (const k of [na, nb, nc]) nor.push(k.x, k.y, k.z);
  };
  const geometry = () => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    return g;
  };
  return { tri, geometry };
}

// Which way a face should look: out from the trunk, or down.
export const OUT = (a, b, c) => new THREE.Vector3(a.x + b.x + c.x, 0, a.z + b.z + c.z);
export const DOWN = () => new THREE.Vector3(0, -1, 0);

/** A palette of hex colours as THREE.Colors, each a little shifted in hue (`hue`) and scaled in value (`value`). */
export function palette(colors, hue = 0, value = 1, keep = []) {
  return Object.fromEntries(Object.entries(colors).map(([k, v]) => {
    const c = new THREE.Color(v);
    return [k, keep.includes(k) ? c : c.offsetHSL(hue, 0, 0).multiplyScalar(value)];
  }));
}

// The game's sun (SUN_DIR in countryside.js), for colouring what faces it.
const SUN = new THREE.Vector3(-0.414, 1.11, 0.91).normalize();

/**
 * A tube along `path` (points) with `radii` at them, of `sides` flat sides, coloured between `dark` and `light` by how its
 * sides face the sun (from the upper left of the screen). Its rings are carried along the bends without turning, then turned `twist` (radians) more by its end, so
 * its edges wind round it as a twisted trunk's ridges do; `shape(i, t)` scales ring i's radius at angle t round it
 * (to flare roots out of it; i counts only the points given, not those `step` adds); its end is closed with a short
 * point. `step`: no longer a side than that, its path cut shorter where need be, so `marks` can be short. `marks`:
 * dark dashes across it, as on a birch's bark: { colour, chance (of a dash round each piece of it), run ([least,
 * most] sides a dash goes round), low (below that height, three times the chance) }. `soft` (0 to 1) bends its light round its edges, so it looks round rather than flat-sided; `ridges`, how much
 * darker every other side is, so the ridges read.
 */
export function tube(m, path, radii, { dark, light }, { sides = 6, twist = 0, shape = null, soft = 0, ridges = 0, step = 0, marks = null } = {}) {
  let index = path.map((_, i) => i);
  if (step) {
    const [p, r, x] = [[path[0]], [radii[0]], [0]];
    for (let i = 1; i < path.length; i++) {
      const pieces = Math.max(1, Math.ceil(path[i].distanceTo(path[i - 1]) / step - 1e-6));
      for (let j = 1; j <= pieces; j++) {
        p.push(path[i - 1].clone().lerp(path[i], j / pieces));
        r.push(THREE.MathUtils.lerp(radii[i - 1], radii[i], j / pieces));
        x.push(j === pieces ? i : Infinity);
      }
    }
    [path, radii, index] = [p, r, x];
  }
  const n = path.length;
  const tangent = (i) => {
    const a = path[Math.max(0, i - 1)];
    const b = path[Math.min(n - 1, i + 1)];
    return new THREE.Vector3().subVectors(b, a).normalize();
  };
  // Each ring's two directions across the tube, carried from ring to ring by the turn between their tangents.
  let t = tangent(0);
  let u = new THREE.Vector3().crossVectors(t, Math.abs(t.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)).normalize();
  const turn = new THREE.Quaternion();
  const rings = [];
  const outs = [];
  for (let i = 0; i < n; i++) {
    const ti = tangent(i);
    u.applyQuaternion(turn.setFromUnitVectors(t, ti)).addScaledVector(ti, -u.dot(ti)).normalize();
    t = ti;
    const v = new THREE.Vector3().crossVectors(t, u);
    const spin = (twist * i) / Math.max(1, n - 1);
    const ring = [];
    const out = [];
    for (let k = 0; k < sides; k++) {
      const a = (k / sides) * TAU;
      const d = u.clone().multiplyScalar(Math.cos(a + spin)).addScaledVector(v, Math.sin(a + spin));
      ring.push(path[i].clone().addScaledVector(d, radii[i] * (shape ? shape(index[i], a) : 1)));
      out.push(d);
    }
    rings.push(ring);
    outs.push(out);
  }
  const tone = (d, k) => dark.clone().lerp(light, THREE.MathUtils.clamp(0.5 + 0.5 * d.dot(SUN), 0, 1)).multiplyScalar(k % 2 ? 1 - ridges : 1);
  for (let i = 0; i + 1 < n; i++) {
    const axis = new THREE.Vector3().subVectors(path[i + 1], path[i]).normalize();
    const mid = path[i].clone().add(path[i + 1]).multiplyScalar(0.5);
    // A dash round this piece, or none: where it starts round it and how many sides it goes.
    let dash = null;
    if (marks && pointNoise(mid, 11) + 0.5 < marks.chance * (mid.y < (marks.low ?? 0) ? 3 : 1)) {
      const [least, most] = marks.run;
      dash = { from: Math.floor((pointNoise(mid, 12) + 0.5) * sides), run: least + Math.floor((pointNoise(mid, 13) + 0.5) * (most - least + 1)) };
    }
    const marked = (k, col) => (dash && (k - dash.from + sides) % sides < dash.run ? marks.colour.clone().lerp(col, 0.2) : col);
    const away = (p, q, r) => {
      const c = new THREE.Vector3().addVectors(p, q).add(r).divideScalar(3).sub(mid);
      return c.addScaledVector(axis, -c.dot(axis));
    };
    for (let k = 0; k < sides; k++) {
      const k1 = (k + 1) % sides;
      const [a, b, c, d] = [rings[i][k], rings[i][k1], rings[i + 1][k1], rings[i + 1][k]];
      const face = new THREE.Vector3().subVectors(c, a).cross(new THREE.Vector3().subVectors(b, d)).normalize();
      if (face.dot(away(a, b, c)) < 0) face.negate();
      const col = marked(k, tone(face, k));
      if (!soft) {
        m.tri(a, b, c, col, col, col, away);
        m.tri(a, c, d, col, col, col, away);
        continue;
      }
      const [na, nb, nc, nd] = [outs[i][k], outs[i][k1], outs[i + 1][k1], outs[i + 1][k]].map((o) => face.clone().lerp(o, soft).normalize());
      const [ca, cb, cc, cd] = [na, nb, nc, nd].map((o) => marked(k, tone(o, k)));
      m.tri(a, b, c, ca, cb, cc, away, [na, nb, nc]);
      m.tri(a, c, d, ca, cc, cd, away, [na, nc, nd]);
    }
  }
  const tip = path[n - 1].clone().addScaledVector(t, radii[n - 1] * 0.5);
  const cap = (p, q, r) => new THREE.Vector3().addVectors(p, q).add(r).divideScalar(3).sub(path[n - 1]);
  for (let k = 0; k < sides; k++) {
    const [a, b] = [rings[n - 1][k], rings[n - 1][(k + 1) % sides]];
    const col = tone(outs[n - 1][k].clone().add(t).normalize(), k);
    m.tri(a, b, tip, col, col, col, cap);
  }
}

/** A path from `a` to `b`, setting off along `dir` and bending round to `b`, kinked at its joints by `kink` of its length. */
function bough(rand, a, dir, b, segments, kink) {
  const len = a.distanceTo(b);
  const pull = a.clone().addScaledVector(dir, len * 0.4);
  const path = [a.clone()];
  for (let i = 1; i < segments; i++) {
    const s = i / segments;
    const p = a.clone().multiplyScalar((1 - s) ** 2).addScaledVector(pull, 2 * s * (1 - s)).addScaledVector(b, s * s);
    path.push(p.add(new THREE.Vector3(rand() - 0.5, (rand() - 0.5) * 0.5, rand() - 0.5).multiplyScalar(kink * len)));
  }
  path.push(b.clone());
  return path;
}

/**
 * Points split into k groups by which way round `axis` from `from` they lie: sorted by that angle, and cut at the k
 * widest gaps between them.
 */
function split(points, from, axis, k) {
  const u = new THREE.Vector3().crossVectors(axis, Math.abs(axis.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)).normalize();
  const v = new THREE.Vector3().crossVectors(axis, u);
  const d = new THREE.Vector3();
  const sorted = points.map((p) => (d.subVectors(p, from), { p, a: Math.atan2(d.dot(v), d.dot(u)) })).sort((x, y) => x.a - y.a);
  const gaps = sorted.map((s, i) => ({ i, gap: i === 0 ? sorted[0].a + TAU - sorted[sorted.length - 1].a : s.a - sorted[i - 1].a }));
  const cuts = gaps.sort((x, y) => y.gap - x.gap).slice(0, k).map((g) => g.i).sort((x, y) => x - y);
  return cuts.map((c, j) => {
    const end = j + 1 < cuts.length ? cuts[j + 1] : cuts[0] + sorted.length;
    return Array.from({ length: end - c }, (_, i) => sorted[(c + i) % sorted.length].p);
  });
}

/**
 * How a tree's wood grows, in units of its height: where its trunk forks (`fork`, how high), its radius at its foot
 * and at the fork (`trunk`), the radius its branches end at (`tip`), how many roots flare out of its foot and how far
 * (`roots`, `flare`: the roots reach out that many times the trunk's radius; the trunk has two sides to a root), how
 * kinked its boughs are (`kink`, of their length), how far its trunk twists (`twist`, in turns), how many sides its
 * thickest boughs have (`sides`, the thinner ones fewer), how far its light bends round its edges (`soft`), how
 * much darker every other side is (`ridges`), and dashes across its bark (`marks`, cut in pieces `step` long; see
 * tube; none if not given).
 */
export const WOOD = { fork: 0.3, trunk: [0.05, 0.036], tip: 0.01, roots: 5, flare: 1.6, kink: 0.1, twist: 0.15, sides: 8, soft: 0.35, ridges: 0.1 };

/**
 * The line of a trunk from the ground up to `top` (a point, in units of the height), leaning that way and kinked a
 * little on the way, grown as `form` says (see WOOD): the points along its middle, its radii there, and its shape
 * and number of sides, for tube, to flare roots out of its foot.
 */
function stem(rand, top, { trunk: [foot, neck], roots, flare, kink }) {
  // Rings close together low down, where the roots flare out of it, then kinked on up to the top.
  const lean = (y) => top.clone().multiplyScalar(y / top.y).setY(y);
  const low = [-0.02, 0.012, 0.04, 0.08].map(lean);
  const path = [...low, ...bough(rand, low[3], new THREE.Vector3(0, 1, 0), top, 3, kink * 0.6).slice(1)];
  const radii = path.map((p) => THREE.MathUtils.lerp(foot, neck, THREE.MathUtils.clamp((p.y - 0.08) / (top.y - 0.08), 0, 1)));
  // Two sides to a root, so each root is a ridge running out of the trunk.
  const spread = [1, 0.56, 0.26, 0.09];
  const shape = (i, a) => (i < spread.length ? 1 + flare * spread[i] * Math.max(0, Math.cos(roots * a)) ** 2 : 1);
  return { path, radii, shape, sides: roots * 2 };
}

/**
 * A trunk from the ground up to `top` (a point, in units of the height), leaning that way and kinked a little on the
 * way, on roots flaring out into the ground; grown as `form` says (see WOOD). Returns the points along its middle.
 */
export function trunk(m, rand, top, bark, form = WOOD) {
  const f = { ...WOOD, ...form };
  const { path, radii, shape, sides } = stem(rand, top, f);
  tube(m, path, radii, bark, { sides, twist: f.twist * TAU, shape, soft: f.soft, ridges: f.ridges });
  return path;
}

/**
 * A tree's wood: a trunk (see trunk) forking into two or three limbs that fork again, two ways at a time, until one
 * bough reaches each of `tips` (points in the crown, in units of the height); each bough as thick as the number of
 * tips it carries asks (the trunk at the fork carries them all), setting off the way its parent was going and bending
 * round to where it goes. At each fork the bough carries on into the biggest share of the tips, and the others leave
 * it from its side, so a fork has no seam. `bark` is { dark, light }.
 */
export function wood(m, rand, tips, bark, form = WOOD) {
  const f = { ...WOOD, ...form };
  const { trunk: [, neck], tip, kink, sides, soft, ridges } = f;
  const all = tips.length;
  const thick = (n) => Math.max(tip, neck * (n / all) ** 0.6);
  const fork = new THREE.Vector3((rand() - 0.5) * 0.06, f.fork, (rand() - 0.5) * 0.06);
  const draw = (line) => tube(m, line.path, line.radii, bark, { sides: line.sides, twist: line.twist ?? 0, shape: line.shape, soft, ridges, step: f.step, marks: f.marks });
  // A bough's line carried on from its end to `end`, narrowing to r1 on the way.
  const extend = (line, end, r1) => {
    const from = line.path[line.path.length - 1];
    const dir = from.clone().sub(line.path[line.path.length - 2]).normalize();
    const r = line.radii[line.radii.length - 1];
    const more = bough(rand, from, dir, end, from.distanceTo(end) > 0.18 ? 3 : 2, kink).slice(1);
    line.path.push(...more);
    line.radii.push(...more.map((_, i) => THREE.MathUtils.lerp(r, r1, (i + 1) / more.length)));
  };
  // A bough grown on from the end of its line until it has reached all of `points`.
  const grow = (line, points, depth) => {
    if (points.length === 1) {
      extend(line, points[0], tip * 0.7);
      draw(line);
      return;
    }
    const from = line.path[line.path.length - 1];
    const dir = from.clone().sub(line.path[line.path.length - 2]).normalize();
    const r = line.radii[line.radii.length - 1];
    const middle = (group) => group.reduce((s, p) => s.add(p), new THREE.Vector3()).divideScalar(group.length);
    const inLine = (group) => middle(group).sub(from).normalize().dot(dir);
    const groups = split(points, from, dir, Math.min(points.length, depth === 0 && points.length > 3 && rand() < 0.6 ? 3 : 2))
      .sort((p, q) => q.length - p.length || inLine(q) - inLine(p));
    groups.forEach((group, j) => {
      const n = group.length;
      const end = n === 1 ? group[0] : from.clone().lerp(middle(group), 0.38 + rand() * 0.14);
      let next = line;
      if (j > 0) {
        // From inside the bough, a little below the fork, out through its side.
        const start = from.clone().addScaledVector(dir, -r * 1.2);
        next = { path: [start.clone().addScaledVector(dir, -0.01), start], radii: [], sides: Math.max(4, Math.round(sides * (n === 1 ? 0.5 : 0.7))) };
        const r0 = Math.min(r * 0.8, thick(n) * 1.15);
        next.radii.push(r0, r0);
      }
      if (n === 1) return grow(next, group, depth + 1);
      extend(next, end, thick(n));
      grow(next, group, depth + 1);
    });
  };
  const line = stem(rand, fork, f);
  line.twist = f.twist * TAU;
  grow(line, tips, 0);
}

/** A value in -0.5..0.5 that is the same for every copy of a point, so faces meeting there stay joined when it moves. */
export function pointNoise(p, seed) {
  const s = Math.sin(Math.round(p.x * 1000) * 12.9898 + Math.round(p.y * 1000) * 78.233 + Math.round(p.z * 1000) * 37.719 + seed * 19.19) * 43758.5453;
  return s - Math.floor(s) - 0.5;
}
