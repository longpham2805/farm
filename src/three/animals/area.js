// Patches of ground animals are let loose in: polygons of world points, walked about inside.

/** Whether the world point (x, z) is inside the polygon of world points `area`. */
export function inside(area, x, z) {
  let hit = false;
  for (let i = 0, j = area.length - 1; i < area.length; j = i++) {
    const a = area[i];
    const b = area[j];
    if (a.z > z !== b.z > z && x < ((b.x - a.x) * (z - a.z)) / (b.z - a.z) + a.x) hit = !hit;
  }
  return hit;
}

/** Whether the straight way from (x0, z0) to (x1, z1) keeps inside the polygon `area` all along. */
export function insideAll(area, x0, z0, x1, z1) {
  if (!inside(area, x0, z0) || !inside(area, x1, z1)) return false;
  // Which side of the line from a to b the point (x, z) is on.
  const side = (a, b, x, z) => Math.sign((b.x - a.x) * (z - a.z) - (b.z - a.z) * (x - a.x));
  const p = { x: x0, z: z0 };
  const q = { x: x1, z: z1 };
  for (let i = 0, j = area.length - 1; i < area.length; j = i++) {
    const a = area[i];
    const b = area[j];
    // It crosses this edge if each lies across the other's line.
    if (side(a, b, x0, z0) * side(a, b, x1, z1) < 0 && side(p, q, a.x, a.z) * side(p, q, b.x, b.z) < 0) return false;
  }
  return true;
}

/**
 * A spot [x, z] picked at random inside `area`; with `near` ([x, z]) and `reach`, one between `reach[0]` and
 * `reach[1]` from it, if there is one. With `ok(x, z)`, only a spot it accepts, or null when none is found.
 */
export function spotIn(area, near = null, reach = [0, Infinity], ok = null) {
  const xs = area.map((p) => p.x);
  const zs = area.map((p) => p.z);
  const [x0, x1, z0, z1] = [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)];
  let fallback = null;
  for (let k = 0; k < 200; k++) {
    const x = x0 + Math.random() * (x1 - x0);
    const z = z0 + Math.random() * (z1 - z0);
    if (!inside(area, x, z)) continue;
    const d = near ? Math.hypot(x - near[0], z - near[1]) : 0;
    const within = d >= reach[0] && d <= reach[1];
    if ((within || !fallback) && ok && !ok(x, z)) continue;
    if (within) return [x, z];
    fallback ||= [x, z];
  }
  return fallback ?? (ok ? null : [(x0 + x1) / 2, (z0 + z1) / 2]);
}
