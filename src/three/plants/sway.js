// Trees and plants swaying gently in the wind. Each leans with the gusts, the more the higher a part of it stands, the
// whole of it on one beat (set by where it stands), so it bends rather than wobbles. The gusts roll across the valley
// as they do over the wheat (wind in buildings/fields.js), and downwind the same way.
const time = { value: 0 };
// How far a part leans for each unit it stands high, squared: the top of a tree 2.5 tall moves about 0.06.
const STRENGTH = 0.01;
const swaying = new Map();

/** A copy of `material` that sways, doing all its own onBeforeCompile does too. One copy for each material. */
function swayingMaterial(material) {
  if (swaying.has(material)) return swaying.get(material);
  const m = material.clone();
  const own = material.onBeforeCompile;
  const key = material.customProgramCacheKey();
  m.onBeforeCompile = (shader, renderer) => {
    own.call(m, shader, renderer);
    shader.uniforms.swayTime = time;
    shader.vertexShader = `uniform float swayTime;\n${shader.vertexShader}`.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
  {
    vec4 foot = modelMatrix * vec4(0.0, 0.0, 0.0, 1.0);
#ifdef USE_INSTANCING
    foot = modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
#endif
    float gust = sin(swayTime * 1.3 + foot.x * 1.1 + foot.z * 0.7) * 0.6 + sin(swayTime * 2.9 + foot.x * 2.3 - foot.z * 1.7) * 0.4;
    float bend = ${STRENGTH.toFixed(3)} * position.y * position.y * (0.3 + 0.7 * gust);
    transformed.x += bend * 0.8;
    transformed.z -= bend * 0.6;
  }`,
    );
  };
  m.customProgramCacheKey = () => `${key} sway`;
  swaying.set(material, m);
  return m;
}

/** Makes every mesh in `group` sway, each standing on its own origin. Returns update(t), t in seconds. */
export function sway(group) {
  group.traverse((m) => {
    if (m.isMesh) m.material = swayingMaterial(m.material);
  });
  return (t) => (time.value = t);
}
