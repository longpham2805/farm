// Trees and plants swaying gently in the wind. Each leans with the gusts, the more the higher a part of it stands, the
// whole of it on one beat (set by where it stands), so it bends rather than wobbles. The gusts roll across the valley
// as they do over the wheat (wind in buildings/fields.js), and downwind the same way.
const time = { value: 0 };
// How far a part leans for each unit it stands high, squared: the top of a tree 2.5 tall moves about 0.06.
const STRENGTH = 0.01;
const swaying = new Map();

/**
 * A copy of `material` that sways, doing all its own onBeforeCompile does too. One copy for each material, and one
 * more for the meshes whose corners carry a `foot` (many plants merged into one mesh, placePlants in valley.js):
 * those take their plant's foot, and how high they stand above it, from the attribute; the others from their mesh's
 * (or instance's) origin.
 */
function swayingMaterial(material, footed) {
  const cache = `${material.uuid}${footed ? ' foot' : ''}`;
  if (swaying.has(cache)) return swaying.get(cache);
  const m = material.clone();
  const own = material.onBeforeCompile;
  const key = material.customProgramCacheKey();
  m.onBeforeCompile = (shader, renderer) => {
    own.call(m, shader, renderer);
    shader.uniforms.swayTime = time;
    shader.vertexShader = `uniform float swayTime;\n${footed ? 'attribute vec3 foot;\n' : ''}${shader.vertexShader}`.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
  {
    vec4 root = modelMatrix * vec4(${footed ? 'foot' : 'vec3(0.0)'}, 1.0);
    float rise = position.y${footed ? ' - foot.y' : ''};
#ifdef USE_INSTANCING
    root = modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
#endif
    float gust = sin(swayTime * 1.3 + root.x * 1.1 + root.z * 0.7) * 0.6 + sin(swayTime * 2.9 + root.x * 2.3 - root.z * 1.7) * 0.4;
    float bend = ${STRENGTH.toFixed(3)} * rise * rise * (0.3 + 0.7 * gust);
    transformed.x += bend * 0.8;
    transformed.z -= bend * 0.6;
  }`,
    );
  };
  m.customProgramCacheKey = () => `${key} sway${footed ? ' foot' : ''}`;
  swaying.set(cache, m);
  return m;
}

/** Makes every mesh in `group` sway, each plant standing on its own foot. Returns update(t), t in seconds. */
export function sway(group) {
  group.traverse((m) => {
    if (m.isMesh) m.material = swayingMaterial(m.material, Boolean(m.geometry.attributes.foot));
  });
  return (t) => (time.value = t);
}
