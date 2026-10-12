// The painted backdrop: an illustration of the valley's ground, drawn from the game's own camera, laid flat on the
// ground so it zooms and pans with everything else. Things that stand up (buildings, bridges, animals, plants) stay
// separate 3D objects on top of it. The painted water moves: a shader slides streaks of light down the river and
// the falls, and ripples the painting a little under them.
import * as THREE from 'three';

const S = 0.559; // how much of a step up the map shows as a step up the screen (sine of the camera's tilt)

/**
 * The backdrop painting and where it sits: the pixel (cx, cy) the middle of the plots falls on, and how many pixels
 * one world unit takes across the screen (`scale`) and up it (`scaleY`), when the painting is seen from the game's
 * camera; all at the painting's full size. `water` is its water map (see art/backdrop/water-map.py).
 *
 * The painting comes cut into tiles no bigger than 4096 px, the most some phones load (art/backdrop/tile-backdrop.py):
 * 2×2 at full size for the sharp setting, and one at half size for the fast one, which takes a quarter of the memory.
 * Each tile overlaps its neighbours by `gutter` pixels of the full size, so the ripples and the blurrier mipmaps
 * reach across a seam.
 */
export const BACKDROP = {
  width: 6144,
  height: 4096,
  cx: 3062,
  cy: 2035.3,
  scale: 169.813,
  scaleY: 175.616,
  tiles: {
    high: { grid: 2, url: (col, row) => `./backdrop/high-${col}${row}.webp` },
    low: { grid: 1, url: () => './backdrop/low.webp' },
  },
  gutter: 32,
  water: './backdrop-water.png',
};

/** The part of the screen plane the backdrop covers, in world units: u across, up the screen. */
export function backdropBounds({ width, height, cx, cy, scale, scaleY } = BACKDROP) {
  return { left: -cx / scale, right: (width - cx) / scale, bottom: (cy - height) / scaleY, top: cy / scaleY };
}

// Water: how far a streak drifts in a second, as a share of the water map's period (512 pixels of calm river), and
// how far the ripples nudge the painting, in world units. The noise repeats once a period, so only the drift's
// fraction of a period matters, which keeps the number small however long the game runs.
const FLOW = 0.06;
const RIPPLE = 0.14;

const WATER_FRAGMENT = /* glsl */ `
#ifdef USE_MAP
	vec2 mapUv = vMapUv;
	vec3 water = texture2D( waterMap, tileRect.xy + vMapUv * tileRect.zw ).rgb;
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
 * Builds the backdrop: planes on the ground, one per tile, whose every point shows the pixel the camera sees it at.
 * Returns the group, setDetail(high), which loads the tiles for the sharp or the fast setting (nothing shows until it
 * is called), and update(t), which moves the water.
 */
export function buildBackdrop(spec = BACKDROP) {
  const { width, height, cx, cy, scale, scaleY, gutter } = spec;
  const group = new THREE.Group();
  const loader = new THREE.TextureLoader();
  const uniforms = { waterDrift: { value: 0 } };
  if (spec.water) {
    // The along-flow phase jumps once a period, so the noise has no mipmaps to pick a blurry level at the jump.
    const noise = loader.load('./water-noise.png');
    noise.wrapS = noise.wrapT = THREE.RepeatWrapping;
    noise.minFilter = THREE.LinearFilter;
    noise.generateMipmaps = false;
    Object.assign(uniforms, { waterMap: { value: loader.load(spec.water) }, waterNoise: { value: noise } });
  }

  // One tile: its content (without the gutter) as a plane, with UVs into its image, gutter and all.
  const tile = (tex, grid, col, row) => {
    // The image's rectangle in the painting and the plane's, as shares of the painting, from its top left.
    const x0 = Math.max(0, col / grid - gutter / width);
    const x1 = Math.min(1, (col + 1) / grid + gutter / width);
    const y0 = Math.max(0, row / grid - gutter / height);
    const y1 = Math.min(1, (row + 1) / grid + gutter / height);
    const n = 12;
    const pos = [];
    const uv = [];
    const index = [];
    for (let j = 0; j <= n; j++) {
      for (let i = 0; i <= n; i++) {
        const s = (col + i / n) / grid;
        const t = (row + 1 - j / n) / grid;
        // The painting's pixel to the map's u across and b up, then to world, as xz in countryside.js.
        const u = (s * width - cx) / scale;
        const b = (cy - t * height) / (S * scaleY);
        pos.push((u - b) * Math.SQRT1_2, 0, -(u + b) * Math.SQRT1_2);
        uv.push((s - x0) / (x1 - x0), 1 - (t - y0) / (y1 - y0));
        if (i && j) {
          const a = j * (n + 1) + i;
          index.push(a - n - 2, a - 1, a, a - n - 2, a, a - n - 1);
        }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(index);
    // Unlit and not tone mapped: the painting already has its light and colours.
    const material = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, side: THREE.DoubleSide });
    if (spec.water) {
      const own = {
        // Where the tile's UVs fall on the water map, which covers the whole painting: offset and size.
        tileRect: { value: new THREE.Vector4(x0, 1 - y1, x1 - x0, y1 - y0) },
        waterRipple: { value: new THREE.Vector2((RIPPLE * scale) / width / (x1 - x0), (RIPPLE * scale) / height / (y1 - y0)) },
      };
      material.onBeforeCompile = (shader) => {
        Object.assign(shader.uniforms, uniforms, own);
        shader.fragmentShader = shader.fragmentShader
          .replace('#include <common>', '#include <common>\nuniform sampler2D waterMap;\nuniform sampler2D waterNoise;\nuniform float waterDrift;\nuniform vec2 waterRipple;\nuniform vec4 tileRect;')
          .replace('#include <map_fragment>', WATER_FRAGMENT);
      };
    }
    const mesh = new THREE.Mesh(g, material);
    mesh.renderOrder = -1;
    return mesh;
  };

  const dispose = (mesh) => {
    mesh.geometry.dispose();
    mesh.material.map.dispose();
    mesh.material.dispose();
  };

  let wanted = null;
  return {
    mesh: group,
    async setDetail(high) {
      const level = high ? 'high' : 'low';
      if (wanted === level) return;
      wanted = level;
      const { grid, url } = spec.tiles[level];
      const cells = [];
      for (let col = 0; col < grid; col++) for (let row = 0; row < grid; row++) cells.push([col, row]);
      let textures;
      try {
        textures = await Promise.all(cells.map(([col, row]) => loader.loadAsync(url(col, row))));
      } catch (err) {
        console.warn('backdrop: could not load the painting', err);
        if (wanted === level) wanted = null;
        return;
      }
      // The setting changed again while these loaded.
      if (wanted !== level) {
        for (const tex of textures) tex.dispose();
        return;
      }
      // The old tiles stay up until the new ones have loaded, so the valley never goes blank.
      for (const mesh of [...group.children]) {
        group.remove(mesh);
        dispose(mesh);
      }
      textures.forEach((tex, i) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 8;
        group.add(tile(tex, grid, ...cells[i]));
      });
    },
    update(t) {
      uniforms.waterDrift.value = (t * FLOW) % 1;
    },
  };
}
