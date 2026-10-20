// Cattle let loose in a patch of grass (herd): the buffaloes by the river, the cows in the meadow.
import * as THREE from 'three';
import { TAU } from './parts.js';
import { inside, insideAll, spotIn } from './area.js';

// How much room an animal leaves round the others when it picks where to go, and how near it lets itself come.
const ROOM = 0.08;
const NEAREST = 0.02;

/**
 * How far apart two animals are, body to body, standing at p and q ([x, z, heading, size, body], body being the
 * circles the animal takes up before its size: [how far forward, radius]): below 0 when they overlap.
 */
export function gap(p, q) {
  let best = Infinity;
  for (const [fp, rp] of p[4]) {
    const px = p[0] + Math.sin(p[2]) * fp * p[3];
    const pz = p[1] + Math.cos(p[2]) * fp * p[3];
    for (const [fq, rq] of q[4]) {
      const qx = q[0] + Math.sin(q[2]) * fq * q[3];
      const qz = q[1] + Math.cos(q[2]) * fq * q[3];
      best = Math.min(best, Math.hypot(px - qx, pz - qz) - rp * p[3] - rq * q[3]);
    }
  }
  return best;
}

/**
 * Animals let loose in `area`, a polygon of world points, each made by make(name, phase) and starting at its spot
 * facing its way ([{ name, x, z, heading }]). An animal's userData says how big it is (`size`), the ground it takes
 * up (`body`, see gap), how fast it walks (`pace`) and whether it is a `calf`, and has its update(t, dt, speed). Each
 * grazes a while, then turns and walks slowly to another spot not far off and grazes there, never leaving the area on
 * the way (it may have corners cut out of it, like the plots' behind the pig). A calf keeps near the first grown one,
 * its mother, setting off soon after she gets where she was going. None walks into another: they
 * take turns, one walking while the others graze, and it goes only where it can turn and walk clear of them; a calf
 * stands out of its mother's reach as she turns about, so she can always turn. Returns the group and update(t, dt).
 */
export function herd(area, members, make) {
  const group = new THREE.Group();
  const animals = members.map(({ name, x, z, heading }, k) => {
    const a = make(name, k * 5.3);
    a.position.set(x, 0, z);
    a.rotation.y = heading;
    Object.assign(a.userData, { target: null, way: null, wait: 6 + Math.random() * 10, stuck: 0 });
    group.add(a);
    return a;
  });
  const mother = animals.find((a) => !a.userData.calf) ?? animals[0];
  const here = (a) => [a.position.x, a.position.z];
  const pose = (a, x = a.position.x, z = a.position.z, heading = a.rotation.y) => [x, z, heading, a.userData.size, a.userData.body];
  // How far an animal reaches from where it stands, whichever way it turns.
  const reach = (a) => Math.max(...a.userData.body.map(([f, r]) => Math.abs(f) + r)) * a.userData.size;
  // The poses `a` goes through to (x, z): turning on the spot towards it, the shorter way round or, with `long`, the
  // longer, then walking there. `spin` says which way it turns.
  const wayTo = (a, x, z, long = false) => {
    const [x0, z0, h0] = pose(a);
    const heading = Math.atan2(x - x0, z - z0);
    let turn = heading - h0;
    turn = Math.atan2(Math.sin(turn), Math.cos(turn));
    if (long) turn -= Math.sign(turn) * TAU;
    const way = [];
    const m = Math.ceil(Math.abs(turn) / 0.15);
    for (let k = 1; k <= m; k++) way.push(pose(a, x0, z0, h0 + (turn * k) / m));
    const n = Math.ceil(Math.hypot(x - x0, z - z0) / 0.1);
    for (let k = 1; k <= n; k++) way.push(pose(a, x0 + ((x - x0) * k) / n, z0 + ((z - z0) * k) / n, heading));
    way.spin = Math.sign(turn);
    return way;
  };
  // The way `a` can take to (x, z), inside the area all along, turning whichever way round keeps clear of the others
  // where they stand, and for a calf, ending out of its mother's reach; null if there is none. One already too near another only has to keep from
  // coming nearer.
  const clearWay = (a) => {
    const start = pose(a);
    const others = animals.filter((o) => o !== a).map((o) => pose(o));
    const room = others.map((o) => Math.min(ROOM, gap(start, o)));
    const turnsAbout = a.userData.calf && a !== mother ? [mother.position.x, mother.position.z, reach(mother)] : null;
    const outOfReach = ([x, z, h, size, body]) => body.every(([f, r]) => Math.hypot(x + Math.sin(h) * f * size - turnsAbout[0], z + Math.cos(h) * f * size - turnsAbout[1]) - r * size - turnsAbout[2] > ROOM);
    return (x, z) => {
      // One that has strayed outside only has to get back in.
      if (inside(area, start[0], start[1]) ? !insideAll(area, start[0], start[1], x, z) : !inside(area, x, z)) return null;
      for (const long of [false, true]) {
        const way = wayTo(a, x, z, long);
        if ((!turnsAbout || outOfReach(way.at(-1))) && way.every((p) => others.every((o, k) => gap(p, o) > room[k]))) return way;
      }
      return null;
    };
  };
  const go = (a, target, way = null) => {
    a.userData.target = target;
    a.userData.way = way;
  };
  const update = (t, dt) => {
    for (const a of animals) {
      const u = a.userData;
      let speed = 0;
      if (!u.target) {
        u.wait -= dt;
        // It waits for any other walking to get there first.
        if (u.wait <= 0 && animals.some((o) => o.userData.target)) u.wait = 0.5 + Math.random();
        if (u.wait <= 0) {
          const clear = clearWay(a);
          let spot;
          if (u.calf && a !== mother) {
            // Somewhere near its mother, out of her way, and not off across the grass.
            spot = spotIn(area, here(mother), [0, 2], clear);
            if (spot && Math.hypot(spot[0] - mother.position.x, spot[1] - mother.position.z) > 2.6) spot = null;
          } else {
            spot = spotIn(area, here(a), [0.6, 1.5], clear);
          }
          if (spot) go(a, spot, clear(...spot));
          // Nowhere clear to go: it grazes a little longer.
          else u.wait = 1 + Math.random() * 2;
        }
      } else {
        const dx = u.target[0] - a.position.x;
        const dz = u.target[1] - a.position.z;
        const d = Math.hypot(dx, dz);
        if (d < 0.05) {
          go(a, null);
          u.wait = u.calf ? 4 + Math.random() * 8 : 8 + Math.random() * 14;
          // The calf follows her before long.
          if (a === mother) for (const c of animals) if (c.userData.calf) c.userData.wait = Math.min(c.userData.wait, 1 + Math.random() * 2);
        } else {
          // Turn towards it, the way round it chose, walking on only once facing near enough its way.
          let turn = Math.atan2(dx, dz) - a.rotation.y;
          turn = Math.atan2(Math.sin(turn), Math.cos(turn));
          if (u.way.spin && Math.abs(turn) > 0.3 && Math.sign(turn) !== u.way.spin) turn -= Math.sign(turn) * TAU;
          const heading = a.rotation.y + Math.sign(turn) * Math.min(Math.abs(turn), dt * 0.9);
          speed = u.pace * Math.max(0, Math.cos(turn)) ** 2 * Math.min(1, d / 0.2 + 0.3);
          // Turning on the spot still takes steps.
          if (speed < 0.03 && Math.abs(turn) > 0.05) speed = 0.03;
          const step = Math.min(d, dt * speed * Math.max(0, Math.cos(turn)));
          // It steps along the straight way it planned, which keeps inside the area and clear of the others.
          const x = a.position.x + (dx / d) * step;
          const z = a.position.z + (dz / d) * step;
          // Should it still come too near another, it stops; kept back a while, it grazes where it is.
          const moved = pose(a, x, z, heading);
          if (animals.some((o) => o !== a && gap(moved, pose(o)) < Math.min(NEAREST, gap(pose(a), pose(o))))) {
            speed = 0;
            u.stuck += dt;
            if (u.stuck > 2) {
              go(a, null);
              u.wait = 1 + Math.random() * 3;
              u.stuck = 0;
            }
          } else {
            u.stuck = 0;
            a.rotation.y = heading;
            a.position.x = x;
            a.position.z = z;
          }
        }
      }
      u.update(t, dt, speed);
    }
  };
  return { group, update };
}
