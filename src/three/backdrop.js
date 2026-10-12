// The painted backdrop: an illustration of the valley's ground, drawn from the game's own camera, laid flat on the
// ground so it zooms and pans with everything else. Things that stand up (buildings, bridges, animals, plants) stay
// separate 3D objects on top of it. The painted water moves: a shader slides streaks of light down the river and
// the falls, and ripples the painting a little under them.
import * as THREE from 'three';

const S = 0.559; // how much of a step up the map shows as a step up the screen (sine of the camera's tilt)

/**
 * A backdrop image and where it sits: the screen pixel (cx, cy) the middle of the plots falls on, and how many pixels
 * one world unit takes across the screen (`scale`) and up it (`scaleY`), when the image is seen from the game's camera.
 * `water` is its water map (see art/backdrop/water-map.py).
 */
export const BACKDROP = {
  url: './backdrop-painted.webp',
  width: 1536,
  height: 1024,
  cx: 764,
  cy: 509.3,
  scale: 42.24,
  scaleY: 43.52,
  water: './backdrop-water.png',
};

/** The part of the screen plane the backdrop covers, in world units: u across, up the screen. */
export function backdropBounds({ width, height, cx, cy, scale, scaleY } = BACKDROP) {
  return { left: -cx / scale, right: (width - cx) / scale, bottom: (cy - height) / scaleY, top: cy / scaleY };
}

// Water: how far a streak drifts in a second, as a share of the water map's period (512 pixels of calm river), and
// how far the ripples nudge the painting, in pixels. The noise repeats once a period, so only the drift's fraction of
// a period matters, which keeps the number small however long the game runs.
const FLOW = 0.06;
const RIPPLE = 6;

const WATER_FRAGMENT = /* glsl */ `
#ifdef USE_MAP
	vec2 mapUv = vMapUv;
	vec3 water = texture2D( waterMap, vMapUv ).rgb;
	vec2 turn = water.rg * 2.0 - 1.0;
	float wet = smoothstep( 0.05, 0.5, length( turn ) );
	float shine = 0.0;
	if ( wet > 0.0 ) {
		// Where along the flow this is, slid downstream with time, and where across it, from bank to bank.
		float along = atan( turn.y, turn.x ) / 6.2831853 - waterDrift;
		float across = water.b * 2.0 - 1.0;
		float mid = 1.0 - abs( across );
		vec3 n1 = texture2D( waterNoise, vec2( along, across * 0.5 ) ).rgb;
		vec3 n2 = texture2D( waterNoise, vec2( along * 2.0 + 0.31, across * 1.1 + 0.57 ) ).rgb;
		mapUv += ( vec2( n1.b, n2.b ) - 0.5 ) * waterRipple * wet * ( 0.3 + 0.7 * mid );
		float streaks = smoothstep( 0.6, 0.75, n1.r ) * 0.6 + smoothstep( 0.62, 0.76, n2.r ) * 0.4;
		float glints = smoothstep( 0.76, 0.84, n2.g );
		shine = ( streaks * 0.35 + glints * 0.8 ) * wet;
	}
	vec4 sampledDiffuseColor = texture2D( map, mapUv );
	diffuseColor *= sampledDiffuseColor;
	diffuseColor.rgb = mix( diffuseColor.rgb, vec3( 0.86, 0.97, 1.0 ), shine );
#endif
`;

/**
 * Builds the backdrop: a plane on the ground whose every point shows the pixel the camera sees it at.
 * Returns the mesh and update(t), which moves the water.
 */
export function buildBackdrop(spec = BACKDROP) {
  const { url, width, height, cx, cy, scale, scaleY } = spec;
  // The map rectangle the image covers: u across, b up the screen.
  const { left: u0, right: u1, bottom, top } = backdropBounds(spec);
  const b0 = bottom / S;
  const b1 = top / S;
  const nu = 24;
  const nb = 24;
  const pos = [];
  const uv = [];
  const index = [];
  for (let j = 0; j <= nb; j++) {
    for (let i = 0; i <= nu; i++) {
      const u = u0 + ((u1 - u0) * i) / nu;
      const b = b0 + ((b1 - b0) * j) / nb;
      // Map to world, as xz in countryside.js.
      pos.push((u - b) * Math.SQRT1_2, 0, -(u + b) * Math.SQRT1_2);
      uv.push((cx + u * scale) / width, 1 - (cy - b * S * scaleY) / height);
      if (i && j) {
        const a = j * (nu + 1) + i;
        index.push(a - nu - 2, a - 1, a, a - nu - 2, a, a - nu - 1);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(index);
  const loader = new THREE.TextureLoader();
  const tex = loader.load(url);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  // Unlit and not tone mapped: the painting already has its light and colours.
  const material = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, side: THREE.DoubleSide });

  const uniforms = { waterDrift: { value: 0 } };
  if (spec.water) {
    const water = loader.load(spec.water);
    // The along-flow phase jumps once a period, so the noise has no mipmaps to pick a blurry level at the jump.
    const noise = loader.load('./water-noise.png');
    noise.wrapS = noise.wrapT = THREE.RepeatWrapping;
    noise.minFilter = THREE.LinearFilter;
    noise.generateMipmaps = false;
    Object.assign(uniforms, {
      waterMap: { value: water },
      waterNoise: { value: noise },
      waterRipple: { value: new THREE.Vector2(RIPPLE / width, RIPPLE / height) },
    });
    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform sampler2D waterMap;\nuniform sampler2D waterNoise;\nuniform float waterDrift;\nuniform vec2 waterRipple;')
        .replace('#include <map_fragment>', WATER_FRAGMENT);
    };
  }
  const mesh = new THREE.Mesh(g, material);
  mesh.renderOrder = -1;
  return {
    mesh,
    update(t) {
      uniforms.waterDrift.value = (t * FLOW) % 1;
    },
  };
}
