# Valley redesign

Work on branch `feat/spec-redesign`: make the valley round the farm look like the reference design
(`art/backdrop/2-style-reference.png`). This file is where the work stands; keep it current when a step lands.

## Approach

Decided on 2026-10-12, after building most of the valley in 3D (the earlier commits on this branch).

- The camera looks down from a fixed angle (orthographic, never turns); the player only zooms and pans. So a picture
  painted from that angle looks exactly like a 3D scene would. The valley's ground is now such a painting, laid flat
  on the ground under everything else (`src/three/backdrop.js`). Things that stand up are 3D, on top of it.
- **Painted:** ground, grass, dirt roads, the river and its banks, the cliffs and waterfalls, and the dense forest at
  the back and the sides.
- **3D:** the plots and crops, buildings (the barn takes each friend's colours when visiting), bridges, fences, lamps,
  animals, the scattered woodland trees, the forest at the front (past the river), the trees near the farm, bushes,
  flowers, rocks by the roads and the river, reeds, and spray at the foot of the falls.
- Why that split: a painted tree lies flat, so anything 3D behind it would draw over it. The forest at the back has
  nothing behind it and would cost the most to build in 3D. 3D trees can sway (wanted), hide what is behind them and
  cast shadows that match the buildings'.
- The water stays in the painting and a shader makes it flow: streaks of light and glints drift downstream, and the
  painting ripples a pixel or so under them. It is only ambience for now: nothing happens when the player taps it.
- Not chosen: rebuilding the whole valley in 3D. That code is still there, switched off by the `STAGE` flags in
  `src/three/countryside.js`.

## Done

- The design's layout as data: `src/three/valleyMap.js` (river, ring road with its own radius at each corner, roads,
  bridges, where each building stands, forest areas, the lie of the land). It was traced from the reference design,
  so its upper right no longer matches the painting (see the next steps).
- The art pipeline in `art/backdrop/` (see its README): layout image, prompt, and scripts to recolour the layout, fit
  a painting to the game and make the water map.
- The first painting, `painted-v1.webp`, in the game as `public/backdrop-painted.webp`. Away from the upper right its
  roads lie within a pixel of the layout's once fitted (`BACKDROP` in `backdrop.js`).
- Flowing water: `water-map.py` makes `public/backdrop-water.png` and `public/water-noise.png`; the shader is in
  `backdrop.js`. Checked in the game: the falls stream down and the river drifts.
- The view pans and zooms over exactly the painting (`VIEW_BOUNDS` comes from the backdrop); zoom stops at 1.6.
- With `STAGE.painted` on (as now), the valley shows only the painting and the clouds: the old 3D terrain, river,
  buildings, animals and bridges are taken out. The farm itself (`src/three/farm.js`: plots, fences, lamps, pond,
  barn) still stands on top and lines up with the painted ring road.

### What is wrong with painted-v1

- The upper right is not as in the layout: the waterfall is about 120 px right and 90 px up, the upper river runs up
  to 200 px further right, a road was added along its left bank, and the road on the far bank starts higher. No two
  road ends face each other across the river any more, so the small bridge has nowhere to go as planned.
- The meadow is a see-through rectangle with hard edges.
- A white square sits on top of the small waterfall (copied from the layout).
- The olive areas came out as bright rolling grass, not dark woodland floor. Fine under 3D trees.
- 1536 px wide is too small: blurry when zoomed in until it is upscaled.

## Next steps

In this order:

1. **Upscale** painted-v1 ×4 with Real-ESRGAN (the Upscayl app runs on the Mac mini). Try its "Digital Art" and
   "Standard" models. Phones may not load a texture over 4096 px, so cut the result into four 3072×2048 tiles, as WebP,
   and scale `BACKDROP` up ×4 (`fit-backdrop.py` does it for an upscaled painting). The water map can stay 1536 wide.
2. **Follow the painting in the upper right** (option A, chosen over asking the model to repaint it): re-trace in
   `valleyMap.js` the river's course, the main waterfall, the cliff and the road on the far bank. Move the small bridge
   up by the waterfall's pool, from the road along the left bank to the road on the far bank (it gets longer); the
   lower end of the left-bank road becomes a landing by the small waterfall. Fix the meadow and the white square in
   the image.
3. **Bring back the 3D on top of the painting**, placed from `valleyMap.js`: buildings, bridges, animals and fences
   (`addBuildings`, `addAnimals` and the `STAGE` flags in `countryside.js`), and spray and mist at the foot of each
   painted fall (`buildWaterfall` has them, at the old fall's place).
4. **3D trees that sway** gently (wind in the vertex shader) in the olive areas and round the farm; bushes, flowers,
   rocks and reeds.
5. **Shadows on the painting**: the backdrop is unlit, so it needs a shadow-only plane over it for the 3D things'
   shadows.
6. **Before merging:** the README's code map (`backdrop.js`, `valleyMap.js`, `art/backdrop`), the new public files in
   the offline cache, and the old 3D scenery's code either removed or kept behind its flags.

## Known bug

Not from this work and not fixed yet: if the page loads while the canvas is 0×0 (a hidden tab or panel), the zoom
becomes NaN in `FarmScene.resize` → `setZoom`, and the valley stays blank until the page is reloaded.

## Picking it up

- Run the game with `npm run dev`. In the Claude desktop app, the preview "farm-dev" (`.claude/launch.json`) serves it
  on port 5174.
- `src/three/backdrop.js`: the painting, where it sits, and the water shader.
- `src/three/valleyMap.js`: where everything in the valley is, in map units.
- `src/three/countryside.js`: builds the valley from the map; `STAGE` says which parts are on.
- `src/three/farm.js`: the ring road's shape and the farm inside it.
- `art/backdrop/README.md`: coordinates, and how to make, fit and animate a new painting.
