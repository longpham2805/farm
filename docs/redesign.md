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
  then made to follow the painting where the two differ (below).
- The art pipeline in `art/backdrop/` (see its README): layout image, prompt, and scripts to recolour the layout, fit
  a painting to the game and make the water map.
- The first painting, `painted-v1.webp`, in the game. Away from the upper right its roads lie within a pixel of the
  layout's once fitted (`BACKDROP` in `backdrop.js`). The game loads `painted-v1-fixed.webp`, mended by
  `art/backdrop/fix-v1.py`: the meadow's pale see-through rectangle has the grass round it (a faint line is left at
  its edge, where the 3D fence will stand, and `MEADOW` now runs along it), and the white square on the small fall is
  the top of the fall, fed by the river from the right.
- Upscaled ×4 with Upscayl's "Digital Art" model (6144×4096; sharper edges than "Standard" and "High Fidelity") and
  cut by `tile-backdrop.py` into `public/backdrop/`: four 3104×2080 tiles that overlap by 32 px, for the sharp
  setting ("Đẹp"), and one 3072×2048 picture for the fast one ("Nhanh"). The tiles still take about 140 MB of GPU
  memory with mipmaps, the half-size picture a quarter of that, which is why the fast setting gets its own. The
  backdrop loads the set for the setting (`setDetail`, called from `FarmScene.setQuality`) and keeps the old one up
  until the new one has loaded. Checked in the game: no seam shows where the tiles meet, even across the river, and
  the water still flows. Fitted again on the sharper picture, the layout's roads lie 0.5 px from the painted ones on
  average (at the layout's size), against 0.9 px before.
- Flowing water: `water-map.py` makes `public/backdrop-water.png` and `public/water-noise.png`; the shader is in
  `backdrop.js`. Checked in the game: the falls stream down and the river drifts.
- The view pans and zooms over exactly the painting (`VIEW_BOUNDS` comes from the backdrop); zoom stops at 1.6.
- `valleyMap.js` follows the painting (option A, chosen over asking the model to repaint it). Measured from the
  painting's water, roads and trees, in map units, by resampling it into the map's frame:
  - `RIVER`, the whole course: the layout's was up to 1.5 units off the painted river even at the front, not only in
    the upper right. It now comes down the right of the farm on a ledge and steps off it at the small fall
    (`WATERFALLS.side`, no stream of its own any more); `WATERFALLS.main` is at the painted fall.
  - `ROADS`: `waterfall` runs from the ring up to a junction with the new `riverside` road, which comes down the left
    bank from the edge of the woods to a landing by the small fall (`PLACES.landing`), then over the small bridge and
    along the far bank. The old `landing` road is `windmill`: it ends in the grass.
  - `BRIDGES`: the small one goes from that junction over a strip of grass and the river to where the far bank's road
    starts (3.2 long, was 1.9). The big one sat mostly on the near bank; it now spans the painted crossing.
  - `FOREST`: the dense forest at the back is where the painting has trees, which is 1 to 3 units farther back than
    the layout's; the front one starts past the new river's far bank; the far bank's open woods lie between its road
    and the river.
  - `LAND.cliff` and `rightLedge`, `ROCKY_BANKS`, and the `ROCKS` along the river and at the back, moved to match.
  Checked by drawing all of it over the painting. The old 3D scenery still reads these, so with `STAGE.painted` off
  it no longer lines up with its own buildings and bridges (`LAYOUT` and `ROADS` in `countryside.js`).
- With `STAGE.painted` on (as now), the valley shows only the painting, the clouds and the buildings redone so far
  (`placeBuildings` in `buildings.js`); the old 3D terrain, river, buildings, animals and bridges are taken out. The
  farm itself (`src/three/farm.js`: plots, fences, lamps, pond, barn) still stands on top and lines up with the
  painted ring road.
- Buildings are redone one at a time, each in its own file under `src/three/buildings/` (shared parts in
  `parts.js`), modelled beside the reference in `dev/buildings.html?b=<name in PLACES>`: left the reference, right
  the game's view of the building on the painting at the same scale, with a slider to lay one over the other. The
  page's `REF` (where the reference's plots are, about 55 px a world unit) was measured on the reference's plots.
  Once it looks right it goes into `placeBuildings` at its `PLACES` spot and is checked in the game.
- **Farmhouse** (`buildings/farmhouse.js`): walls of weatherboards painted cream on a stone footing, a big roof of
  orange clay tiles laid tile by tile, a smoking brick chimney, blue shutters, a window box, a long wooden planter of
  flowers in front, and a porch with its own tiled roof, a door, railings and steps. The reference draws it turned
  more towards the camera than the game's 45°, so it stands turned 30° (`PLACES.farmhouse.turn`), which also fits
  its painted pad, and in its middle (`[-6.4, 4.45]`, measured).
- **Barn** (`buildings/barn.js`, still placed by `buildFarm` in `farm.js`, since it takes each farm's colours and
  opens the warehouse when tapped): boarded red walls with white corners and trim, its gable end to the front with
  both doors swung open and a loft door above, a gambrel roof of thick wooden shingles (steep below the knees,
  gentle above, the upper part a little proud of the lower), a log along the ridge, an open chimney astride it, and
  two windows down its right side. The walls are hollow round a room you see through the doorway: a plank floor,
  hay, bales and a crate, which glow a little in their own colours so they read in the walls' shade. It stands on
  its pad (`BARN_SPOT` is `PLACES.barn.at`), turned 18° left of facing the camera: the reference draws its front
  nearly square to the camera yet shows its right side, and 18° is where the side's windows clear the eaves. The
  home farm's barn is a deeper red and its roof a lighter wood (`HOME_THEME`). The reference lights the roof's
  right slope; the game's sun, from the upper left, lights the left one.
- **Silo** (`buildings/silo.js`, in `placeBuildings`): a drum of grey corrugated sheet in courses (real ridges in
  the geometry, so each facet takes the light its own way), riveted bands with a few streaks below them, a ladder up
  its front, and a red dome of painted panels with raised seams and rivets round its foot, a little taller than
  round, with a grey cap; a round concrete footing and flowers at its foot. The drum and the dome are meshes of
  their own, a little glossy (`Batch.build` takes a roughness and metalness), where the rest of the valley is matt.
  It stands on the left of the pad it shares with the haystack (`PLACES.silo`), its ladder to the camera.
- **Windmill** (`buildings/windmill.js`) and **stone shed** (`buildings/stoneShed.js`), in `placeBuildings`: a
  tapering eight-sided tower of cream plaster with patches of stone showing through (more of them low down), on a
  stone plinth, a wooden door up two stone steps and small windows; a wooden cap roofed in shingles; four lattice
  sails of brown frames and cream canvas, turning (`update` in `placeBuildings`). Beside it a little shed of grey
  stones in courses under two broad slabs, with a low door and moss. They share one pad: the windmill in its middle,
  turned a little left of facing the camera, the shed in the bulge on its left (`PLACES`, moved to the pad).
- Shadows on the painting: the painting is unlit, so a plane just over it draws only the shadows of the 3D things
  (`shadowCatcher` in `backdrop.js`, also in `dev/buildings.html`). Only things inside the sun's shadow box
  (`SHADOW_BOX`, 10 units round the middle) cast them; the fields over the big bridge are outside it.

### Loose ends

- The olive areas came out as bright rolling grass, not dark woodland floor. Fine under 3D trees.
- Between the layout's dense forest and the painted one there is now open grass (behind the farmhouse and on the
  hillside at the back left). Step 2 can decide whether 3D trees go there.
- `countryside.js` still has its own older `LAYOUT` (where each building stands) and `ROADS`; they do not match
  `PLACES` and `ROADS` in `valleyMap.js`.

## Next steps

In this order:

1. **Bring back the 3D on top of the painting**, placed from `valleyMap.js` (`PLACES`, `BRIDGES`, `MEADOW`), one
   building at a time as above. Done: the farmhouse, the barn, the silo, the windmill and the stone shed. Next, in
   this order: the coop and hen house with their run (the old `coop` and `hutch` are one hut twice; the reference
   has two), the well, the cart and the hay. Then bridges, animals and fences (`addAnimals`,
   the old `LAYOUT` in `countryside.js` giving way to `PLACES`), the landing by the small fall, and spray and mist
   at the foot of each painted fall (`buildWaterfall` has them; put them at `WATERFALLS`).
2. **3D trees that sway** gently (wind in the vertex shader) in the olive areas and round the farm; bushes, flowers,
   rocks and reeds.
3. **Before merging:** the README's code map (`backdrop.js`, `valleyMap.js`, `art/backdrop`), the new public files in
   the offline cache (`backdrop/`, `backdrop-water.png`, `water-noise.png`; a device needs only one of the two sets
   of tiles, so perhaps cache what it loaded rather than list them all in `PUBLIC_FILES`), and the old 3D scenery's
   code either removed or kept behind its flags.

## Known bug

Not from this work and not fixed yet: if the page loads while the canvas is 0×0 (a hidden tab or panel), the zoom
becomes NaN in `FarmScene.resize` → `setZoom`, and the valley stays blank until the page is reloaded.

## Picking it up

- Run the game with `npm run dev`. In the Claude desktop app, the preview "farm-dev" (`.claude/launch.json`) serves it
  on port 5174.
- `src/three/backdrop.js`: the painting, where it sits, its tiles, and the water shader.
- `src/three/valleyMap.js`: where everything in the valley is, in map units, as the painting shows it.
- `src/three/countryside.js`: builds the valley from the map; `STAGE` says which parts are on.
- `src/three/farm.js`: the ring road's shape and the farm inside it.
- `art/backdrop/README.md`: coordinates, and how to make, fit and animate a new painting.
