// The woods of 3D trees on the painted valley (WOODS in valleyMap.js): trees scattered over each area no nearer each
// other than its spacing, and bushes under them, clear of the roads, the river, the bridges, the buildings and their
// yards, the fields, the meadow, the rocks still to be placed and the trees placed by hand, and leaving the flowers in
// view. A few models of each kind, drawn many times over (instanced), each tree turned (all but the birches and slim
// trees, whose leaves face the camera), sized and a little lighter or darker than the next.
import * as THREE from 'three';
import { WOODS, TREES, FLOWERS, RIVER, ROADS, BRIDGES, PLACES, MEADOW, ROCKS, LAND, WATERFALLS } from '../valleyMap.js';
import { ringDistance } from '../farm.js';
import { seeded } from '../../util.js';
import { pine } from './pine.js';
import { roundTree, ROUND_TREES } from './roundTree.js';
import { birch } from './birch.js';
import { slimTree } from './slimTree.js';
import { fir } from './fir.js';
import { bush } from './bush.js';
import { edited } from './edited.js';
import { PROXIED, SHADOW_ONLY, shadowProxy } from './shadowProxy.js';

const TAU = Math.PI * 2;
// The models of each kind: how many, the height they are built at, whether a tree of it may be turned, and how tall
// it grows against the wood's heights (the round trees' broad crowns smaller than the pines, the firs shorter still).
export const MODELS = {
  pine: { make: (seed, h) => pine(seed, h), seeds: 6, height: 2.6, turn: true, size: 1 },
  round: { make: (seed, h) => roundTree(seed, h, ROUND_TREES.lime), seeds: 4, height: 2.4, turn: true, size: 0.8 },
  roundGreen: { make: (seed, h) => roundTree(seed, h, ROUND_TREES.green), seeds: 4, height: 2.6, turn: true, size: 0.85 },
  birch: { make: (seed, h) => birch(seed, h), seeds: 2, height: 2.4, turn: false, size: 1 },
  slim: { make: (seed, h) => slimTree(seed, h), seeds: 2, height: 2.2, turn: false, size: 0.95 },
  fir: { make: (seed, h) => fir(seed, h), seeds: 3, height: 1.8, turn: true, size: 0.75 },
  bush: { make: (seed, h) => bush(seed, h), seeds: 3, height: 0.4, turn: true, size: 1 },
};
// How far from each building's spot the trees keep (the rest of PLACES: 0.7); `birds` fly over the hills.
const KEEP = { farmhouse: 2.0, barn: 2.0, henYard: 1.7, silo: 1.0, windmill: 1.4, stoneShed: 1.0, cart: 0.9, haystack: 0.9, well: 1.0, birds: 0 };
// How far up the map's b a world unit of height reaches on the screen, as the camera looks down ((1, 0.95, 1) in
// FarmScene).
const UP = Math.SQRT2 / 0.95;

/** Whether (u, b) is inside the polygon. */
function inPoly(poly, u, b) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [ui, bi] = poly[i];
    const [uj, bj] = poly[j];
    if (bi > b !== bj > b && u < ((uj - ui) * (b - bi)) / (bj - bi) + ui) inside = !inside;
  }
  return inside;
}

/** How far (u, b) is from the segment a–b, and how far along it (0 to 1) the nearest point is. */
function toSegment(u, b, [u0, b0], [u1, b1]) {
  const du = u1 - u0;
  const db = b1 - b0;
  const t = Math.max(0, Math.min(1, ((u - u0) * du + (b - b0) * db) / (du * du + db * db || 1)));
  return [Math.hypot(u - u0 - t * du, b - b0 - t * db), t];
}

const toLine = (u, b, line) => Math.min(...line.slice(1).map((p, i) => toSegment(u, b, line[i], p)[0]));

/** How far (u, b) is from the river's edge (negative in the water). */
function fromWater(u, b) {
  let best = Infinity;
  for (let i = 1; i < RIVER.length; i++) {
    const [d, t] = toSegment(u, b, RIVER[i - 1], RIVER[i]);
    best = Math.min(best, d - (RIVER[i - 1][2] + t * (RIVER[i][2] - RIVER[i - 1][2])));
  }
  return best;
}

/**
 * Whether a tree may stand at (u, b): clear of everything the woods keep out of, and `fields` from the fields' fence.
 * at(u, b) is the world point.
 */
function clear(u, b, at, fields = 0.8) {
  if (fromWater(u, b) < 0.6 || ringDistance(u, b) < 1.0 || inPoly(MEADOW, u, b) || inPoly(LAND.cliff.poly, u, b)) return false;
  if (Object.values(ROADS).some((road) => toLine(u, b, road) < 0.9)) return false;
  if (Object.values(BRIDGES).some(({ ends }) => toSegment(u, b, ...ends)[0] < 1.0)) return false;
  if (Object.values(WATERFALLS).some(({ at: [fu, fb] }) => Math.hypot(u - fu, b - fb) < 1.2)) return false;
  // The first four clusters were left in the painting's layout, but it painted no rocks there.
  if (ROCKS.slice(4).some(([ru, rb, spread]) => Math.hypot(u - ru, b - rb) < spread + 0.3)) return false;
  for (const [name, place] of Object.entries(PLACES)) {
    if (place.at && Math.hypot(u - place.at[0], b - place.at[1]) < (KEEP[name] ?? 0.7)) return false;
    if (place.area && inPoly(place.area, u, b)) return false;
  }
  if (toSegment(u, b, ...PLACES.landing.ends)[0] < 0.8) return false;
  // The fields stand square to the world's x and z.
  const p = at(u, b);
  const f = at(...PLACES.fields.at);
  const [hx, hz] = PLACES.fields.half;
  return !(Math.abs(p.x - f.x) < hx + fields && Math.abs(p.z - f.z) < hz + fields);
}

/**
 * Whether a tree `height` tall at (u, b) would stand on one of the flowers (FLOWERS) or hide its head: in front of it
 * (lower down the map), near enough across the screen for its crown to cover it, and tall enough to reach up over the
 * head's lower edge, about two thirds of the flower's height. A flower growing among the trees (`inWoods`) only keeps
 * them off its spot, so the woods stay thick round it.
 */
function hidesFlower(u, b, height) {
  return FLOWERS.some(([, fu, fb, fh, , more]) => Math.hypot(u - fu, b - fb) < 0.7 || (!more?.inWoods && b < fb && Math.abs(u - fu) < 0.3 * height + 0.15 && b + UP * height > fb + UP * 0.65 * fh));
}

/**
 * Where the woods' trees stand: [{ kind, model, u, b, height, turn, shade }], the same every time. at(u, b) is the
 * world point.
 */
export function woodsSpots(at) {
  const rand = seeded(97);
  const taken = TREES.map(([, u, b]) => [u, b, 1.0]);
  const spots = [];
  for (const { poly, spacing, kinds, height: [h0, h1], water, shore = 0.6, shade: [s0, s1] = [0.9, 1.1], bushes = 0, fields } of WOODS) {
    const us = poly.map(([u]) => u);
    const bs = poly.map(([, b]) => b);
    // Only as far out as the painting goes, and a little past its bottom for the crowns that reach up into it.
    const [u0, u1] = [Math.max(-19, Math.min(...us)), Math.min(19, Math.max(...us))];
    const [b0, b1] = [Math.max(-23, Math.min(...bs)), Math.min(21, Math.max(...bs))];
    const tries = Math.round((((u1 - u0) * (b1 - b0)) / (spacing * spacing)) * 12);
    const names = Object.keys(kinds);
    let inside = 0;
    for (let i = 0; i < tries; i++) {
      const u = u0 + rand() * (u1 - u0);
      const b = b0 + rand() * (b1 - b0);
      if (!inPoly(poly, u, b)) continue;
      inside++;
      if (taken.some(([tu, tb, r]) => Math.hypot(u - tu, b - tb) < Math.max(r, spacing))) continue;
      if (fromWater(u, b) < shore || !clear(u, b, at, fields)) continue;
      let pick = rand();
      const kind = names.find((k) => (pick -= kinds[k]) < 0) ?? names[names.length - 1];
      // Near the river the trees stand lower, rising to their full height `water` from it.
      const near = water ? Math.min(1, Math.max(0, (fromWater(u, b) - shore) / (water - shore))) : 1;
      const height = (h0 + rand() * (h1 - h0)) * (0.45 + 0.55 * near) * MODELS[kind].size;
      spots.push({ kind, model: Math.floor(rand() * MODELS[kind].seeds), u, b, height, turn: rand() * TAU, shade: s0 + rand() * (s1 - s0) });
      taken.push([u, b, spacing]);
    }
    // Bushes under the trees and between them, clear of their trunks and of each other: `bushes` to each square unit
    // of the area inside the painting's bounds.
    const shrubs = [];
    const many = bushes * (u1 - u0) * (b1 - b0) * (inside / tries);
    for (let i = 0; i < tries && shrubs.length < many; i++) {
      const u = u0 + rand() * (u1 - u0);
      const b = b0 + rand() * (b1 - b0);
      if (!inPoly(poly, u, b) || fromWater(u, b) < shore || !clear(u, b, at, fields)) continue;
      if (spots.some((s) => Math.hypot(u - s.u, b - s.b) < 0.55) || shrubs.some((s) => Math.hypot(u - s.u, b - s.b) < 0.9)) continue;
      if (TREES.some(([, tu, tb]) => Math.hypot(u - tu, b - tb) < 0.55)) continue;
      shrubs.push({ kind: 'bush', model: Math.floor(rand() * 3), u, b, height: 0.3 + rand() * 0.2, turn: rand() * TAU, shade: s0 + rand() * (s1 - s0) });
    }
    spots.push(...shrubs);
  }
  // Left out only now, so the trees elsewhere stand where they did before the flowers came.
  return spots.filter(({ u, b, height }) => !hidesFlower(u, b, height));
}

/** The woods' trees, each kind's models drawn once for all their trees. Returns a group. */
export function woods(at) {
  const group = new THREE.Group();
  const spots = woodsSpots(at);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const tint = new THREE.Color();
  for (const [kind, { make, seeds, height, turn }] of Object.entries(MODELS)) {
    for (let k = 0; k < seeds; k++) {
      const list = spots.filter((s) => s.kind === kind && s.model === k);
      if (!list.length) continue;
      // As edited by hand (dev/export-models.mjs writes it out as `woods-<kind>-<n>`), if it was.
      const parts = [];
      (edited(`woods-${kind}-${k + 1}`, height) ?? make(k + 1, height)).traverse((part) => part.isMesh && parts.push(part));
      // The trees' shadows are cast by a stand-in of a few hundred triangles (shadowProxy.js), instanced the same.
      const big = PROXIED[kind] ? parts.reduce((a, p) => (p.geometry.attributes.position.count > a.geometry.attributes.position.count ? p : a)) : null;
      const proxy = big ? shadowProxy(big.geometry, PROXIED[kind]) : null;
      const place = (mesh, shaded) => {
        list.forEach((s, i) => {
          const scale = s.height / height;
          m.compose(at(s.u, s.b), q.setFromAxisAngle(up, turn ? s.turn : 0), new THREE.Vector3(scale, scale, scale));
          mesh.setMatrixAt(i, m);
          if (shaded) mesh.setColorAt(i, tint.setScalar(s.shade));
        });
        mesh.computeBoundingSphere();
        group.add(mesh);
      };
      for (const part of parts) {
        const mesh = new THREE.InstancedMesh(part.geometry, part.material, list.length);
        mesh.castShadow = proxy ? false : part.castShadow;
        mesh.receiveShadow = part.receiveShadow;
        place(mesh, true);
      }
      if (proxy) {
        const mesh = new THREE.InstancedMesh(proxy, SHADOW_ONLY, list.length);
        mesh.userData.proxy = true;
        mesh.castShadow = true;
        mesh.receiveShadow = false;
        place(mesh, false);
      }
    }
  }
  return group;
}
