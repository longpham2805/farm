// Spray thrown up off falling water, over the painted falls: droplets that leap from along a line (a fall's lip, or
// the foot where it lands), arc out and fall back, glinting, and fade; a few bigger, slower puffs make a mist.
//
// The droplets are soft white spots on little squares facing the camera (which never turns), added to what is
// behind them, so they brighten the water rather than cover it.
import * as THREE from 'three';

// The camera's direction from what it looks at (as in FarmScene).
const CAM_DIR = new THREE.Vector3(1, 0.95, 1).normalize();
const FACING = new THREE.Object3D();
FACING.lookAt(CAM_DIR);

let spot;
function spotTexture() {
  if (spot !== undefined) return spot;
  if (typeof document === 'undefined') return (spot = null);
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
  grad.addColorStop(0.35, 'rgba(255, 255, 255, 0.75)');
  grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return (spot = new THREE.CanvasTexture(c));
}

/**
 * Spray off `line` (world points along the water, on the ground): `count` droplets at a time, each leaping from a
 * spot along it with a speed `up` (world units a second, [least, most]) upward and `out` along `outward` (the way the
 * water goes over), spreading `spread` sideways, pulled down by `gravity`, living `life` seconds, `size` across
 * ([at the start, at the end]) and `strength` bright. Returns the group and update(t, dt).
 */
export function spray(line, { count = 50, up = [0.2, 0.4], out = [0.05, 0.15], outward = new THREE.Vector3(1, 0, 1).normalize(), spread = 0.05, gravity = 1.2, life = [0.6, 1.0], size = [0.03, 0.06], strength = 0.8, seed = 1 } = {}) {
  let r = seed * 9973;
  const rand = () => ((r = (r * 16807) % 2147483647) / 2147483647);
  const lengths = [0];
  for (let i = 1; i < line.length; i++) lengths.push(lengths[i - 1] + line[i].distanceTo(line[i - 1]));
  const along = (s) => {
    let i = 1;
    while (i < line.length - 1 && lengths[i] < s) i++;
    const f = (s - lengths[i - 1]) / Math.max(1e-6, lengths[i] - lengths[i - 1]);
    return line[i - 1].clone().lerp(line[i], Math.min(1, Math.max(0, f)));
  };
  const side = new THREE.Vector3(-outward.z, 0, outward.x);
  const between = ([a, b]) => a + rand() * (b - a);
  const drops = Array.from({ length: count }, () => ({ from: new THREE.Vector3(), v: new THREE.Vector3(), age: 0, life: 1 }));
  const launch = (d, age = 0) => {
    d.from.copy(along(rand() * lengths.at(-1)));
    d.v.copy(outward).multiplyScalar(between(out)).addScaledVector(side, (rand() - 0.5) * 2 * spread).setY(between(up));
    d.life = between(life);
    d.age = age;
  };
  // Started at every moment of their lives, so the spray is full from the first frame.
  for (const d of drops) launch(d, rand() * life[1]);

  const material = new THREE.MeshBasicMaterial({ map: spotTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), material, count);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;
  mesh.userData.ownMaterial = true;
  const group = new THREE.Group();
  group.add(mesh);
  const m = new THREE.Matrix4();
  const p = new THREE.Vector3();
  const s = new THREE.Vector3();
  const c = new THREE.Color();
  const update = (t, dt = 0) => {
    drops.forEach((d, k) => {
      d.age += dt;
      if (d.age > d.life) launch(d);
      const f = d.age / d.life;
      p.copy(d.from).addScaledVector(d.v, d.age);
      p.y -= 0.5 * gravity * d.age * d.age;
      // Below the water it is gone; it glints in and fades out.
      const shown = p.y < 0 ? 0 : Math.sin(Math.PI * Math.min(1, f * 1.4)) * (1 - f * 0.5) * strength;
      s.setScalar(size[0] + (size[1] - size[0]) * f);
      m.compose(p, FACING.quaternion, s);
      mesh.setMatrixAt(k, m);
      mesh.setColorAt(k, c.setScalar(shown));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  };
  update(0);
  return { group, update };
}
