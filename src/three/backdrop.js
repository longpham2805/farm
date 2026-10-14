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
  // The falls, where the water drops down the picture, in the painting's 1536 × 1024 pixels from its top left
  // (MAIN_FALL and SIDE_FALL in art/backdrop/water-map.py): from x[0] to x[1] across at its top, down to the foot.
  // The water goes over the `lip`, from [x, y] to [x, y], the top level to the left of it, and pours down leaning
  // `lean` pixels across for each pixel down (to the left if below 0), its left side leaning with it.
  falls: [
    { x: [1195, 1266], lip: [[1195, 0], [1266, 0]], foot: 132, lean: 0 },
    { x: [1267.1, 1294.5], lip: [[1273.8, 499], [1294.1, 513]], foot: 546, lean: -0.33 },
  ],
};

/**
 * The point on the ground the painting's pixel (px, py) lies on, in its 1536 × 1024 pixels from its top left (as
 * `falls` gives them), with y set to `y`.
 */
export function paintedPoint(px, py, y = 0, { width, cx, cy, scale, scaleY } = BACKDROP) {
  const k = width / 1536;
  const u = (px * k - cx) / scale;
  const b = (cy - py * k) / (S * scaleY);
  return new THREE.Vector3((u - b) * Math.SQRT1_2, y, -(u + b) * Math.SQRT1_2);
}

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
	vec2 paintUv = tileRect.xy + vMapUv * tileRect.zw;
	vec3 water = texture2D( waterMap, paintUv ).rgb;
	vec2 turn = water.rg * 2.0 - 1.0;
	float wet = smoothstep( 0.05, 0.5, length( turn ) );
	float shine = 0.0;
	// Where across the flow this is, from bank to bank. Where it jumps from one bank to the other between two of the
	// water map's pixels (in narrow water), the streaks would break in steps along the jump: nothing moves there.
	// Towards the banks the water's movement eases off with wet, which the map ramps up from the bank. (Worked out
	// outside the branch below, as derivatives need every pixel round about.)
	float across = water.b * 2.0 - 1.0;
	// How far one of the water map's pixels spans on screen, to measure the jumps by.
	float texel = max( fwidth( paintUv.x ) * float( textureSize( waterMap, 0 ).x ), 1e-4 );
	float steady = ( 1.0 - smoothstep( 0.15, 0.5, fwidth( across ) / texel ) ) * ( 1.0 - smoothstep( 0.1, 0.4, length( fwidth( turn ) ) / texel ) );
	if ( wet > 0.0 ) {
		// Where along the flow this is, slid downstream with time.
		float along = atan( turn.y, turn.x ) / 6.2831853 - waterDrift;
		float mid = 1.0 - abs( across );
		vec3 n1 = texture2D( waterNoise, vec2( along, across * 0.5 ) ).rgb;
		vec3 n2 = texture2D( waterNoise, vec2( along * 2.0 + 0.31, across * 1.1 + 0.57 ) ).rgb;
		vec2 ripple = ( vec2( n1.b, n2.b ) - 0.5 ) * ( 0.4 + 0.6 * mid );
		float streaks = smoothstep( 0.6, 0.75, n1.r ) * 0.6 + smoothstep( 0.62, 0.76, n2.r ) * 0.4;
		float glints = smoothstep( 0.76, 0.84, n2.g );
		shine = streaks * 0.35 + glints * 0.8;
		// Where the falls are. A fall's top is level to the left of its lip, then runs down the lip to its right;
		// just over the lip the water rolls over the edge: a thin bright band along it, shimmering as it slides.
		// Just above the top the river's streaks would bunch up into little eddies: the water there slides
		// smoothly to the edge.
		float fall = 0.0;
		float lip = 0.0;
		float calm = 0.0;
		float bend = 0.0;
		for ( int k = 0; k < 2; k++ ) {
			vec4 box = waterFalls[ k ];
			vec4 edge = waterLips[ k ];
			float top = mix( edge.y, edge.w, clamp( ( paintUv.x - edge.x ) / ( edge.z - edge.x ), 0.0, 1.0 ) );
			float below = top - paintUv.y;
			// The water leans box.w pixels across for each pixel down, and the fall's left side with it.
			float lean = box.w * max( below, 0.0 ) * 1024.0 / 1536.0;
			float wide = smoothstep( box.x + lean - 0.002, box.x + lean + 0.002, paintUv.x ) * ( 1.0 - smoothstep( box.y - 0.002, box.y + 0.002, paintUv.x ) );
			float here = wide * smoothstep( -0.001, 0.003, below ) * smoothstep( box.z - 0.004, box.z + 0.004, paintUv.y );
			if ( here > fall ) bend = -lean;
			fall = max( fall, here );
			float onLip = smoothstep( edge.x - 0.001, edge.x + 0.002, paintUv.x ) * ( 1.0 - smoothstep( edge.z - 0.002, edge.z + 0.001, paintUv.x ) );
			lip = max( lip, onLip * smoothstep( -0.0015, 0.0, below ) * ( 1.0 - smoothstep( 0.0, 0.002, below ) ) );
			float near = smoothstep( box.x - 0.004, box.x + 0.004, paintUv.x ) * ( 1.0 - smoothstep( box.y - 0.004, box.y + 0.004, paintUv.x ) );
			calm = max( calm, near * ( 1.0 - smoothstep( 0.006, 0.016, -below ) ) * step( 0.0, -below ) );
		}
		ripple *= 1.0 - 0.85 * calm;
		shine *= 1.0 - calm;
		// Down a fall the river's streaks would stretch the whole height of it and blink: there, thin streaks run
		// down the picture instead, fast, leaning as the water does, and the water only shivers up and down.
		if ( fall > 0.0 ) {
			vec2 down = vec2( ( paintUv.x + bend ) * 24.0, paintUv.y * 6.5 + waterDrift * 4.0 );
			vec3 f1 = texture2D( waterNoise, down ).rgb;
			vec3 f2 = texture2D( waterNoise, down * vec2( 1.7, 1.3 ) + vec2( 0.37, waterDrift * 3.0 ) ).rgb;
			float lines = smoothstep( 0.58, 0.72, f1.r ) * 0.6 + smoothstep( 0.6, 0.74, f2.g ) * 0.5;
			shine = mix( shine, lines * 0.55, fall );
			ripple = mix( ripple, vec2( 0.0, f1.b - 0.5 ) * 0.5, fall );
		}
		if ( lip > 0.0 ) {
			float roll = texture2D( waterNoise, vec2( paintUv.x * 40.0, waterDrift * 6.0 ) ).g;
			shine = max( shine, lip * ( 0.35 + 0.4 * smoothstep( 0.45, 0.7, roll ) ) );
		}
		mapUv += ripple * waterRipple * wet * steady;
		shine *= wet * steady;
	}
	vec4 sampledDiffuseColor = texture2D( map, mapUv );
	diffuseColor *= sampledDiffuseColor;
	diffuseColor.rgb = mix( diffuseColor.rgb, vec3( 0.86, 0.97, 1.0 ), shine );
#endif
`;

/**
 * The painting is unlit, so the 3D things' shadows fall on this instead: a square `size` across, just over the
 * painting, that draws nothing but the shadows, darkening the painting under them.
 */
export function shadowCatcher(size) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size, size).rotateX(-Math.PI / 2), new THREE.ShadowMaterial({ color: '#1f3a22', opacity: 0.36 }));
  mesh.position.y = 0.002;
  mesh.receiveShadow = true;
  return mesh;
}

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
    // The falls as the water map's UVs see them, from its bottom left: [x0, x1, the foot, the lean] and the lip's ends.
    const falls = spec.falls.map(({ x, foot, lean }) => new THREE.Vector4(x[0] / 1536, x[1] / 1536, 1 - foot / 1024, lean));
    const lips = spec.falls.map(({ lip: [[x0, y0], [x1, y1]] }) => new THREE.Vector4(x0 / 1536, 1 - y0 / 1024, x1 / 1536, 1 - y1 / 1024));
    Object.assign(uniforms, { waterMap: { value: loader.load(spec.water) }, waterNoise: { value: noise }, waterFalls: { value: falls }, waterLips: { value: lips } });
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
          .replace('#include <common>', '#include <common>\nuniform sampler2D waterMap;\nuniform sampler2D waterNoise;\nuniform float waterDrift;\nuniform vec2 waterRipple;\nuniform vec4 tileRect;\nuniform vec4 waterFalls[2];\nuniform vec4 waterLips[2];')
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
