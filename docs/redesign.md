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
  `backdrop.js`. The river drifts and the falls stream down. Mended later, at the user's word, where it looked odd
  close up:
  - The banks: the water map is a quarter of the upscaled painting's size, so where the ripples and streaks ran right
    up to a bank its edge showed in steps, rocks and foam nudged into the water, streaks drawn over the sand. The
    map's m now ramps up from 0 at a bank to 1 five pixels in (`EDGE`) and the shader eases the water in over that; it
    calms the water wherever the map's across or flow jumps between two of its pixels (measured per map pixel, so at
    any zoom); and across fades where the flow heads into a bank and the side it lies on flickers.
  - The flow: from the top of the main fall alone, it spread out from where the river came into a pool, into a bay
    and against the bank. It is now half the time from the top of the main fall less half the time on to where the
    river leaves the picture: the same along the river (less a constant), heading for the way out in a pool, and
    barely moving in a bay.
  - Above the small fall the painting had a narrow bar of sand with an arm of water behind it, and water and land
    looked muddled: `fix-v1.py` fills both with the river's water (`mend_bar`), so the river runs straight down to
    the grass and over the fall. A patch of yellow-green like grass on the fall's lip is that water now (`mend_lip`).
    The curtain was narrow, a darker strip down its left side made it look like two streams, and a dark gap showed by
    the rocks on its right: `mend_curtain` draws it again, its painted rows stretched across as one stream, out to the
    rocks and out over the pool (`CURTAIN`, as the user outlined it), its left side running down and to the left
    from its top corner; the painted crest's corner that stuck out left of that is the bank now (`BULGE`). The painting was upscaled and tiled again after each.
  - The falls (`falls` in `BACKDROP`, `MAIN_FALL` and `SIDE_FALL` in `water-map.py`): the river's streaks stretched
    the whole height of the small fall and blinked; there, thin streaks run down the picture instead, fast, and the
    water only shivers up and down. Each fall has a `lip`, from [x, y] to [x, y], its top level to the left of it, and
    a thin bright band shimmers along the lip where the water rolls over. The small fall's lip is short and steep, from
    the middle of its top down to the corner of the rocks on its right, as the user marked it (a level lip, one
    slanting the other way, then a longer, gentler one all across, looked wrong). The water comes in from the right,
    goes over it down and to the left, and pours down leaning left all the way, 0.3 pixels across for each pixel down,
    the fall's left side with it (`lean`; it first leaned only at the top, and the wrong way). Just above the top the
    river's streaks bunched into little eddies; they fade out there now.
  - Spray (`spray` in `buildings/spray.js`: soft white spots on squares facing the camera, added to the painting, from
    a line of the painting's pixels made ground points by `paintedPoint` in `backdrop.js`; `fallSpray` in
    `placeBuildings`): along the small fall's lip it splashes up thick, about a quarter of the fall's height (the
    user wanted it strong), and falls back over the curtain, with a little mist. At the foot of each fall, along
    its painted foam, droplets leap out of the pool, mostly towards the camera and fanning out to the sides, and a
    faint mist rises slowly over the curtain's foot; more and higher under the main fall. Over the painted foam,
    already white, the droplets hardly show; they read where they fly out over the dark rocks and the blue pool.
    None along the main fall's top, which lies on the painting's top edge.
- The view pans and zooms over exactly the painting (`VIEW_BOUNDS` comes from the backdrop); zoom stops at 1.6 (3.2 under `npm run dev`,
  to look at the models close up).
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
- **Hen yard** (`henYard` in `buildings/coop.js`, in `placeBuildings`): one square unit, as the reference draws
  it, not following the pad's curves: a yard fenced on all four sides with short sections (posts at most 0.3 apart,
  two rails), the hen house at its back on the right (boards on short legs, a shingled roof, a door with a ramp and
  a white sign), the small coop on its left (a round window in its gable, straw in its doorway), bales of straw
  stacked between them and straw strewn about, a feeder and a water dish, and grass round the fence, thicker at the
  corners. It stands on the pad of two lobes (`PLACES.henYard`), turned 37° from facing the camera.
- **Well** (`buildings/well.js`, in `placeBuildings`): a round wall of pale stones with rounded edges, five staggered
  courses of uneven stones outside and darker ones lining the shaft inside from below the water (`course`, each stone
  a little wider outside than in so a ring closes up), mortar only in the joints, under a rim of broad flat stones
  reaching out over the wall and a little in over the shaft; bright, glossy water well below the rim, the wall's core
  of mortar stopping under it (soft light wavering over it in a shader, a slow bob, and now and then a ripple from a
  drip); clumps of moss on the rim, along the joints and round the foot, and ivy climbing two sides; two wooden posts
  (turned with the roof and the winch so the one nearer the camera stands in the middle of a rim stone) holding a roof
  of thick orange clay tiles, no two quite level (`rise` in `tiledSlope`), with boarded gables (seams up the boards, a
  small iron hook under the ridge); and a winch with a twisted rope wound round it down to a bucket of wooden staves
  and iron hoops. The bucket works slowly, on a loop of about thirteen seconds: let down into the water while the
  winch turns, a ripple as it dips, wound up full to just under the winch (so it does not hide the water), tipped to
  pour the water back down the well (a stream, and a ripple where it lands), and upright again (`update` in
  `placeBuildings`). Flowers at its foot are left for the small things to come. On its pad by the ring road's front
  left side (`PLACES.well`), turned 54°. `dev/buildings.html?t=9` holds what moves at that moment (there, the bucket
  pouring), to look at it.
- **Hay** (`buildings/hay.js`, in `placeBuildings`): a cart of planks with flared sides on two big spoked wheels, its
  shafts out behind and a leg under its front, heaped with hay, on its pad beside the hen yard; a round bale lying at
  the barn's front right corner, rings on its ends and twine round it; and a haystack of two faceted tiers round a
  pole on the right of the silo's pad. The hay is drawn as straw: a canvas texture of hundreds of strands, also used
  as a bump map, lying down the stack, round the bale and every which way on the cart; loose straws stick out of it,
  and scraps of straw lie on the ground round each (`strawScraps`, for anywhere else hay lies about). The bale and the
  haystack stand forward of the barn's and the silo's shadows, which turned them olive (`PLACES.cart`, `bale`,
  `haystack`).
- **Bridges** (`buildings/bridge.js`, in `placeBuildings`, each turned to run between its `BRIDGES` ends): a deck of
  wide planks laid across, arching from end to end, each a little off from the next in length, colour and lie, over a
  dark floor that shows between them, on a deep beam down each side; a railing of square posts about 0.55 apart under
  a round rail that follows the arch, with thicker, taller posts at the corners; and footings of pale stones at each
  end, a slab reaching out onto the road and a block under each corner post. The big bridge has a lamp post of two
  lanterns behind its farm end, as the reference draws it; the small one, under the main fall, a lantern on each of
  its four corner posts (only the back two had one at first, which looked odd). Their glass is the meadow lamp's deep
  orange, lit, with the same soft glow over it (`lanternGlows` in `buildings/lamp.js`). `dev/buildings.html?b=main` (or `small`, names in
  `BRIDGES`) shows one; `?at=u,b` looks at any spot of the map. The old `bridge` in `buildings.js` belongs to the old
  3D valley.
- **Animals apart from where they live**: the chickens are `src/three/animals/chicken.js`, breeds in `CHICKENS`
  (white, brown, gold, black and speckled hens, a rooster, a chick), and `flock(area, breeds)` lets them loose to
  wander and peck in any polygon. The hen yard has a flock (`henYard` returns where, `PLACES.henYard.hens` which);
  the same birds can be let loose anywhere. `dev/animals.html` shows every breed close up. The old `hen` in
  `animals.js` belongs to the old 3D valley.
- **Buffalo** (`src/three/animals/buffalo.js`, kinds in `BUFFALOES`: a grown buffalo and a calf), built like a Cape
  buffalo from two pictures the user gave: a slate grey body in one smooth piece round its spine (`loft` through
  `TRUNK`), the back rising to a hump over the shoulders and falling away to a smaller rump, a deep chest with a fold
  of skin under the throat and the belly tucked up behind; a thick neck carrying the head low in front; a long face
  down to a broad, dark muzzle, eyes with whites; the horns meeting in a broad boss over the forehead and sweeping
  out and down beside the head, then up, the tips turning in; drooping ears under them, pink inside; sturdy legs,
  darker below the knee (buds for horns on the calf, whose head and legs are longer for its size). An earlier white
  chevron round the throat looked odd and went. The hide wears a coat of hair, as it looked too smooth (`Coat`): a
  drawn picture of tufts of strands, streaking the hide's colour and raised by a bump on a matt hide, lying back
  along the body and down the neck, head and legs, the same size all over; and on the body, neck and legs the coat
  drawn three times more a little way out (`SHELLS`), showing only strand tips, fewer the farther out, so the edges
  look soft. The face, ears and tail have only the flat coat. They graze with the muzzle down in the grass, nibbling, lift the head
  to look about for a few seconds every fourteen, swish the tail and flick the ears. Every so often one turns and
  walks slowly to another spot not far off, its legs stepping in diagonal pairs and its head nodding, and grazes
  there; the calf follows its mother soon after she stops (`herd(area, members, make)` in `animals/herd.js`, which
  lets any cattle loose in a polygon; `inside` and `spotIn` in `animals/area.js` serve the chickens too). They never walk into each other: each
  takes up a few circles along its back (`BODY`, `gap`), they take turns to walk, and one sets off only on a way it
  can turn (either way round) and walk clear of the others standing; the calf stands out of its mother's reach as she
  turns about, so she can always turn. The patch they wander is narrow, so they cannot pass each other: an earlier
  version that let both walk at once wedged them together for minutes at a time. `tests/herd.test.js` runs them for
  half an hour and checks. They start where the reference draws them: the buffalo on the grass at the top of the
  river's rocky bank near the big bridge, side on, facing left, the calf behind her towards the road, and wander the
  grass between the road to the big bridge and the river, up into the meadow below the small fall (`PLACES.buffalo`
  and its `area`, `calf`, placed by `placeBuildings`). `dev/animals.html?set=buffaloes` shows them close up (`?cols=2`
  bigger), `?t=11.5` with the head up, `?walk=1` walking on the spot. What the grazing animals share is in
  `animals/parts.js`: the shapes, `Coat`, `loft`, `hornGeometry` and `grazing` (how they graze, look about and walk).
- **Cows** (`src/three/animals/cow.js`, kinds in `COWS`: a Holstein), black and white as the reference draws them in
  the meadow, built like the buffalo: a chunky body in one smooth piece (`loft` through its own `TRUNK`), square at
  the rump, level along the back, the barrel deep; a slimmer neck; a big black head (scaled 1.45) with a pale pink
  muzzle, short pale horns and black ears out sideways, pink inside; a pink udder; short, stout white legs on dark
  hooves. The coat is sleeker than the buffalo's (`Coat`'s `stand` and `streak`: the hair stands off half as far and
  streaks the white less, which looked dirty and woolly at full strength). Big black patches lie over the white
  (`patches` in `Coat`, drawn in the hide's shader from noise in each piece's own space, so they move with it, sharp
  and ragged with the hair at their edges): about 0.3 model units across, on the body, neck and legs above the knee,
  each cow's and each leg's laid out by its own seed (the herd's phase). An earlier, longer and slimmer body with
  smaller patches looked spindly beside the reference, and a white blaze on the face stuck out like a bar, so it went.
  They graze, look about and walk like the buffalo (`grazing`, their head lifted higher to look about) and wander the
  meadow with `herd`: two of them, starting where the reference draws them, side on, facing right and a little
  towards the camera, and wandering `PLACES.meadow.area`, the meadow inside its fence and clear of the trough (the
  trees in the meadow, still to come, are not kept clear of yet).
  `dev/animals.html?set=cows` shows two close up (`?view=1.2` closer), and
  `dev/buildings.html?at=-11.75,-2.75&span=2.2&t=11.5&up=0.4` sets one beside the reference (`?t` now also holds the
  animals where they start).
- **Sheep** (`src/three/animals/sheep.js`, kinds in `SHEEP`: a ewe), white as the reference draws them: a plump round
  body of wool (`loft` through `FLEECE`), a woolly tuft of a tail, a woolly neck; a long, narrow pale face under a cap
  of wool, a pink nose, ears out sideways, pink inside; slender pale legs, wool at their tops, on dark hooves. The
  fleece is `Coat` with `wool`: a picture of curls packed together, each lit on top and shaded round its edge, its
  mask a dome per curl so the shells (standing off 1.8 times as far as hair) show the curls' tops; and `lumps`, the
  hide swelling out in lumps a few hundredths of a unit high (noise along the normals, on finer balls and a finer
  loft), so the outline is a fleece's. Each sheep's fleece lies differently (its phase). They graze, look about and
  walk like the cattle. The cows and the sheep are one herd (`PLACES.meadow`, each member naming its kind), so they
  keep out of each other's way: the two cows where they were, a ewe at the right of the meadow walking away to the
  back right, as the reference draws her, and another on the left, where the reference's sheep is hidden behind the
  harvest button. `tests/herd.test.js` runs the four of them. `dev/animals.html?set=sheep` shows two close up.
- **Pig** (`src/three/animals/pig.js`, kinds in `PIGS`), pink as the reference draws it: a plump round body on short,
  stout legs, a big head straight off the shoulders with full cheeks and a flat round snout, ears flopping forward
  over the eyes, a curly tail (a tube wound a ring and a half), and a coat of fine bristles that hardly shows
  (`stand` 0.3, `streak` 0.25). A paler pink looked salmon and dusty in the game's warm light and green bounce, so the
  pink leans to magenta. It roots about with its snout in the grass (`grazing`) on the lawn behind the plots, where
  the reference draws it beside a vegetable patch (not built yet), side on, facing right (`PLACES.pig` and its
  `area`, between the back plots and the ring road; the plots' back corner is cut out of it, so the player's plots
  stay clear). `herd` now keeps every walk inside the area all along (`insideAll` in `area.js`), not only where it
  ends, and an animal steps along the straight way it planned while it turns to face it: before, a walk past the
  corner could cut across the plots. `tests/herd.test.js` checks the pig never leaves its patch.
  `dev/animals.html?set=pigs` shows it close up, `dev/buildings.html?at=-0.1,3.8&span=2.4&t=11.5&up=0.3` beside the
  reference. On its right two brown hens peck about (`PLACES.lawnHens`, the chickens' `flock`), where the reference
  draws two small brown birds; the pig's area stops short of theirs.
- **Ducks and swallows**, which the reference does not draw but the old valley had (the user chose to keep them):
  - Ducks (`src/three/animals/duck.js`, kinds in `DUCKS`), built smooth like the chickens: a white mother duck riding
    low in the water, a full breast, wings folded along her sides, her tail turned up, an orange bill broad and flat;
    yellow ducklings, round, with stubs of wings. What lies under the surface is hidden by the painted water.
    `paddle(way, half, names)` lets a family loose on a stretch of river: the mother swims to a spot along it, rests,
    now and then tips up to feed (head under, tail in the air), and swims on. Her five ducklings keep near her, each
    swimming after a spot of its own that it picks afresh every few seconds, behind her as she swims and all round her
    as she rests, speeding up and slowing down, keeping off each other and inside the river, and pecking at the water
    when still (they first followed her trail exactly, in a line, and looked towed). Rings of ripples spread from
    each and fade. They paddle the river between the small fall's pool and the big bridge, by the buffalo
    (`PLACES.ducks`). `tests/ducks.test.js` checks the ducklings keep near her, apart and on the river.
  - Swallows (`src/three/animals/birds.js`, `BIRDS`): a slim dark blue body, pale beneath, a rufous throat, a forked
    tail in one flat piece from inside the body, and long swept wings, each one strip that turns at the shoulder and
    curves gradually about the wrist as it beats (`bendWing`): wings of two flat halves hinged at the wrist, and a
    tail of two separate spikes, looked broken. `wheel(centre, names)` has a few fly circles of their own
    round a spot high over the hills behind the farm (`PLACES.birds`), beating their wings for a few seconds, then
    gliding, banking into the turn. Drawn about twice a swallow's size against the farm (`size` 1.8): at their true
    size they were a few pixels over the dark forest. They cast no shadows.
  - `dev/animals.html?set=ducks` and `?set=birds` show them close up. The old `addAnimals` in `animals.js` belongs to
    the old 3D valley.
- **The meadow's fence and trough**: a rail fence (`woodFence` in `buildings/fence.js`, for the fields' fences too)
  round the painted meadow's edge (`MEADOW`, the faint line in the painting, which runs a little differently from the
  reference's fence): square posts of weathered wood at most 0.42 apart and at every corner, no two quite the same
  height or quite upright, each with a lighter cap, two rails from post to post, each a little off level. A gate of
  three boards and a brace, between two stouter posts, opens onto the road at the front right (`PLACES.meadow.gates`;
  on the right side, square to the camera, it showed only edge on). The trough (`buildings/trough.js`) stands where
  the reference draws it, along the front fence (`PLACES.trough`): a box of planks three to a side on two beams, posts
  at its corners, a lip along the top, glossy water a little below it; the meadow's animals keep clear of it (a notch
  in `PLACES.meadow.area`), a cow grazing just behind it looks to be drinking. The hay rack (`hayRack` in
  `buildings/hay.js`) stands inside the back right fence, along it, beside the ewe in view, where the reference draws a
  pale heap on a wooden stand (read as hay; the other reading, a basket of shorn wool, was offered): a crib of upright
  slats of pale golden wood between rails, on four legs splayed a little, 0.46 by 0.3, heaped over its rim with hay
  dried pale (`straw` and `strawTexture` take `pale`; the golden hay is unchanged), a few straws hanging out of it and
  scraps on the grass round it. The herd keeps clear of it (a notch in `PLACES.meadow.area`). Built at first a third
  bigger, its wood orange and its hay beige. A bench (`buildings/bench.js`, `PLACES.meadowBench`) stands in the meadow's
  right corner, its end against the right fence, under where the reference's lamp stands, as it draws one there and
  another beside the well: no back, a seat of four narrow planks along it, each its own width, length, thickness, lie
  and tone, wide gaps between them, their rounded ends out past the legs, on a bearer at each end and four round legs
  splayed out a little, in light warm wood; the herd keeps clear of it (a notch in `PLACES.meadow.area`). On its seat,
  towards its right end and front, a folded newspaper, the user's reading of the white patch the reference draws there
  (a folded cloth, or only sunlight, were the others): two sheets, the upper a little short of the lower, rounded over
  at the fold, a faint headline along it and columns of print, a mesh of its own (`bench(…, { paper: true })`) that
  glows a little (0.35) so the warm sun does not turn its white to cream. Tried first:
  a back of two rails and arms (a park bench, the user said the reference's has no back), then planks broad and
  close together, and planks rounded over along their whole length (skis). Behind the bench, near the right fence, a
  lamp post (`buildings/lamp.js`, `PLACES.meadowLamp`), as the reference draws it there and beside the well: a dark
  iron post on a flared foot, a collar low down, a pointed finial, an arm across its top (across the screen) curving
  down at each end, and from each end a round lantern of deep orange glass between four bars under a pointed cap,
  hanging close to the post (the glass in the bridges' glow batch). Over each lantern a soft glow, two sprites added
  to what is behind them (`glowTexture`): a wide orange halo and a small yellow core, set a little towards the camera
  so the glass does not hide them. Tried first: the big bridge's lamp post (a T of an arm with small square lanterns,
  pale glass), and a core near white (an electric bulb). The bridges' lanterns and the farm's street lamps
  (`streetLamp` in `farm.js`) take the same glass and glows, a little smaller over their smaller glass (`lanternGlows`
  in `buildings/lamp.js`); their glass was pale yellow, which under the core looked like a bulb. Every glow flickers
  a little, each on a beat of its own: three slow waves over each other, up to about a tenth brighter or dimmer, the
  halo swelling a little with it. `buildFarm` returns an `update(t)` for its lamps.
- **The fields over the big bridge** (`buildings/fields.js`, in `placeBuildings`), on the painting's pad of dirt,
  which was measured again on the painting (`PLACES.fields`: its middle had been 0.8 units off), square to the plots:
  four raised beds of dark ridged soil, two by two, with paths of the pad between them, as the reference draws them:
  ripe wheat at the back (clumps of stalks, each with a golden ear), lettuces on the left (an open rosette of broad
  leaves round a tighter one and a pale heart), bushy beans on the right and white-flowering plants at the front.
  Plants are drawn a few to a bed and big, as in the reference: drawn small and many, they read as a texture. A rail
  fence (`woodFence`) runs all round, with a gate in the side along the road (the reference leaves the front right
  side open, and the user wanted it fenced); a scarecrow (sack head, straw hat with a red band, blue shirt, arms out
  on a crossbar, straw hands) stands by the back fence. The wheat sways in gusts of wind that roll across the field
  (`wind`: a vertex shader bending it by its height). Left for step 2, with the other plants: the reference's big
  sunflowers along the front right side and round the front corner (they were built here, then taken out to come
  with the plants), and its post with a bird on it by the back fence (now `buildings/birdPost.js`, not placed yet).
- **The landing** (`buildings/landing.js`, in `placeBuildings`) at the end of the riverside road, beside the small
  fall, where the painted road runs down to the water (the reference draws only rocks there): a jetty of planks laid
  across two beams, running on from the road out over the river between `PLACES.landing.ends`, on posts standing in
  the water, those at the far end up above the deck, the corner one stouter with a coil of rope; and a rowing boat
  tied up alongside it, away from the fall, rocking gently: a hull painted blue outside with a white rim, a floor of
  boards just above the water (the painted water hides all below it, and the boat showed the river through its
  bottom), a transom, two seats and a pair of oars, and a rope from its bow to the post.
- **Trees** (step 2), each kind modelled in its own file under `src/three/plants/` and looked at in
  `dev/plants.html?set=<kind>`: the reference cut round each place it draws one, beside the model at the same scale
  in the game's light and from its camera (a slider lays one over the other), then a few seeds close up. They go into
  the valley once every kind is done, swaying then.
  - **Pine** (`plants/pine.js`, `?set=pines`): five or six tiers stacked into a narrow cone, each a skirt of five to
    seven broad panels of needles, each folded down its middle so one half takes the light, their tips drooping a
    little over the tier below, darker up under the tier above, dark underneath; flat facets, as the reference's
    low-poly trees. A cool green (in the game's warm light a yellower one looked olive). The lowest tier stands a
    quarter of the height up, so a brown trunk shows under it from the camera, as the reference draws it, on four
    short roots (`trunk` in `plants/parts.js`, plainer than the leafy trees'). Each seed gives a tree a little
    different in tiers, turn, width and shade.
  - **Round tree** (`plants/roundTree.js`, `?set=round`): a brown trunk, leaning a little on flaring roots, forking a
    quarter of the way up into three limbs out to the lowest clumps and one up the middle; a crown a little wider
    than tall of twenty-odd clumps of leaves over a flattened ball round a big one in the middle, the lower ones
    further out so the crown spreads at its foot. Each clump is a twelve-sided ball turned, stretched and roughened
    its own way, so its facets are broad, as the reference draws them, yet no two alike (balls of many small facets
    looked like bunches of grapes or boulders, plain twelve-sided ones like gems), from yellow-green on top to deep
    green under the crown and in the gaps. The edges are rounded over a little, as the user wanted (`soft` 0.4 in the
    form: each facet split in four, the middles of its edges pushed out towards the ball, the light and colour
    bending round the corners; 0.6 was too round); the wood (below) is rounded over a little too. Two sets of colours in
    `ROUND_TREES`: `lime`, as most of the woods, and `green`, darker, as in front (`?leaves=green`). `leafyTree` grows
    it from a form (`ROUND_FORM`), and the fruit tree from its own. What the plants share is in `plants/parts.js`: the
    materials (flat, and soft), faces coloured at their corners, the wood, a palette shifted per tree.
  - **Fruit tree** (`plants/fruitTree.js`, `?set=fruit`), as inside the ring road: smaller (1.6 tall), on a short
    stout trunk forking low, its crown wider for its height and hanging lower, of more and smaller clumps, a deep,
    rich green, rounded over as the round tree. Fourteen to eighteen big glossy fruit, a little flattened, round the
    sides and underneath rather than on top, each clear of the other clumps and fruit (more, and further out, looked
    like pompoms). Kinds in `FRUIT_TREES`: `apple`, mostly red with a few orange, and `orange` (`?fruit=orange`).
    Returns a group, the tree and its fruit (a smooth, glossy mesh of its own).
  - **Wood** (`wood` and `trunk` in `plants/parts.js`), for every tree, redone from low-poly cherry trees the user
    found drawn (their trunks and branches were better than ours): a trunk leaning a little and kinked on the way up,
    twisted a little so its ridges wind round it (every other side a little darker), on roots flaring out into the
    ground as ridges running out of its foot (two sides of the trunk to a root); forking into two or three limbs that
    fork again, two ways at a time, until one bough reaches each point the crown asks for, each as thick as the number
    of points it carries, setting off the way its parent went and bending round to where it goes. At a fork the bough
    carries on into its biggest share and the others leave it from inside, through its side (ending the bough at the
    fork and starting its boughs from its end left a rim, or splinters on a short trunk). Each tree lays its wood out
    with random numbers of its own, so the round and fruit trees' crowns and fruit stayed as they were. Under a crown
    the limbs are mostly in its shadow, as they should be.
  - **Blossom tree** (`plants/blossomTree.js`, `?set=blossom`), the pink tree the reference draws by the farmhouse, a
    cherry in flower, made as the cherry trees the user found: 1.9 tall, a crown as wide as the tree is tall of twelve
    lobes in three rings (two on top, four, then six further out and lower), the lowest ring turned so the camera
    looks between two of its lobes at the limbs under the crown; a bough of the wood ending inside each lobe. Each
    lobe is a core and five to seven clumps round its outer side (as the round tree's, rounded over less), and a dark
    clump deep in the middle of the crown so the gaps show deep rose, not the sky. Five-petalled flowers, each petal
    folded down its middle and cupped up, pale pink to near white where the light falls, a deep pink eye, one or two
    on every facet of the clumps that shows (the clumps' own facets, from `clump`'s `facets`), so the crown is all
    flowers, as in the user's pictures: set at first over round balls round each lobe, some sank into the clumps'
    lumps and left them bare. About 22,000 triangles a tree, a thousand-odd flowers. And thirty-odd petals fallen on
    the grass under it. The pinks glow
    a little in their own colours (`glowing` in `parts.js`), or the warm sun turns them salmon and grey. A first try,
    a big core with small clumps stuck over it, looked like a blob with warts, on a plain post of a trunk.
  - **Birch** (`plants/birch.js`, `?set=birch`), as the reference draws two together by the river at the front left
    and one by the fields on the right, made as a low-poly tree the user found: 2.4 to 2.5 tall, a straight, slender
    white trunk (grey-white in its shade, not grey) on short roots, its bark dashed across with thin black marks, more
    of them at its foot (`marks` in `tube`, the tube cut in short pieces, `step`, so a mark is a dash and not a band;
    thicker marks looked like a zebra's). It forks three tenths of the way up into limbs that fork again and again out
    to thirty-odd twigs ending over the outer part of an egg-shaped crown, none underneath, so the boughs show all
    through it. On each twig's end eight to eleven leaves, off the twig round its end and spread out about the way out
    of the crown, their faces turned up to the light: each a pointed oval, widest below its middle, folded down its
    middle and arched so its tip droops, so one half takes the light; both faces drawn. A fresh green, not yellow,
    its shade soft (a little glow). About 8,700 triangles a tree. Tried first, and the user did not like them: a
    crown of lobes (as the blossom tree's) of bare clumps in lime, too yellow and too contrasty; the clumps covered in
    small leaves sticking out every way (a spiky bush), then in leaves lying down them as scales (too thick, and the
    leaves' shape not pretty); twenty-odd twigs of six to nine leaves each from one point (a sapling, its leaves in
    stars).
  - **Slim tree** (`plants/slimTree.js`, `?set=slim`), the two slim upright trees the reference draws together by the
    river on the right, by the fields' fence (a kind of their own: slimmer, lighter and more open than the pine): 2.3
    and 1.85 tall, a long slender trunk on four short roots, bare about two fifths of the way up, and five tiers of
    leafy lobes hanging out from it, three to five to a tier, smaller up the tree, then a narrow pointed top of five
    sides; the trunk shows between the tiers, and a lobe or two of the lowest is often missing. Each lobe is a thick
    leaf shape from the bark, widest a little before its middle and drooping to a point, folded down its middle, its
    edges gently notched, so one half takes the light, yellow-green, and the other is a deep green; each facet one
    colour, by how it faces the sky and the sun. About a thousand triangles a tree. Tried first: clumps as the round tree's
    stretched out along each lobe (lumpy, and the top a big egg); long lobes drooping steeply (a weeping tree); many
    lobes with deep notches (crumpled paper).
  - **Fir** (`plants/fir.js`, `?set=fir`), the full light green tree the reference draws on the upper riverbank,
    between the riverside road's fence and the water (foot about px (1371, 455)), a kind of its own as the user chose:
    1.6 tall and about 0.95 across, a short brown trunk showing under six tiers of the slim tree's lobes, five or six
    to a tier, broader (`width` 0.66), folded less and drooping late (`curl`), smaller up the tree to a pointed top,
    over a dark cone round the trunk (`core`) so the gaps between lobes and under each tier show deep green. Bluer
    greens than the slim tree's: in the warm sun yellower ones looked olive. About 1,600 triangles a tree. It grows as
    the slim tree does (`tieredTree` in `slimTree.js`, whose `lobe` now takes the form's `width`, `fold`, `edge` and
    `curl`; the slim trees are unchanged). Tried first: many small lobes with finely scalloped edges and shorter ones
    between them (a smooth cone); lobes folded deeply (spiky, as a pine's skirt); fewer, broader lobes (stacked
    skirts hiding the trunk).
  - **Bush** (`plants/bush.js`, `?set=bushes`): the reference draws only a few, small, round and deep green, about
    0.45 across (behind the hen yard at the foot of a tree, under the slim trees behind the fields' fence); the round
    green masses along the front, past the river, are round trees with their trunks hidden. A low dome sitting on the
    grass, no stem showing, swelling into a middle lobe and two or three round it, so no two are the same shape; over
    a dark core (a deep clump in each lobe, so the gaps show deep green, not the grass), a hundred-odd broad leaves
    laid like shingles, as in the user's pictures (below): each the birch's leaf (`leaf` in `birch.js`) made wider,
    its face out of the lobe and its tip down its slope, pale on top, a deep green further down. About 1,700
    triangles a bush. Tried first: the round tree's clumps piled up, and then more and smaller ones over a dome (a
    heap of green boulders); long narrow leaves hanging down it (a fern); one round dome (a helmet).
  - **Sunflower** (`plants/sunflower.js`, `?set=sunflowers`), as the reference draws them along the front right of the
    fields over the big bridge, round their front corner and by their back fence: 1.1 to 1.65 tall, a slender green
    stem bending at the top into the back of a big head, half a unit across, turned to face the camera and tipped up a
    little, each a little its own way; eight broad pointed leaves up the stem (the birch's leaf made wider), the
    biggest at its foot, drooping. The head: a domed dark brown disc with a warmer brown rim, twelve to fourteen broad
    golden petals with blunt points, a shorter, more orange layer showing between them, a green cup behind. It glows a
    little in its own colours, so the yellow stays clear in the warm sun. About 450 triangles a flower. Tried first:
    many narrow pointed petals (a saw blade, orange), a deep fold down each petal (two strips to a petal), pale
    leaves (washed out).
  - **Tomatoes** (`plants/tomato.js`, `?set=tomatoes`), the row the reference draws on the grass behind the plots,
    beside the pig, along the ring road: about two units long, a low dense hedge of leaves with a few tomatoes
    showing. One plant (`tomato`, 0.65 tall, about 1,300 triangles): a thin green stem, most tied to a wooden stake
    that the leaves all but hide, eight to ten bunches of pointed leaves up it on short stalks, spread out and
    drooping, a deep green; ones to threes of round tomatoes under a few bunches, towards their outer edge where they
    show, most ripe red, some orange, a few green; a few small yellow flowers. `tomatoRow` sets eight of them close
    along a line, a little out of line as planted by hand (about 11,400 triangles a row); placing them, turn the row
    along the road. On `dev/plants.html` a place can make its own model (the row, here). Tried first: thin plants
    with few leaves (all stakes), pale leaves, many tomatoes (the row all red).
  - **Post with a bird** (`buildings/birdPost.js`, `?set=post`), by the fields' back fence just left of the
    scarecrow, where the back fence's line runs (foot about painting px (1502, 640)). The reference is blurred there:
    a tall post with a brown mass on top that comes to a point, as big as a birdhouse, and an orange spot on its
    right about three fifths of the way up, read as a robin's breast. So: a post of the fence's wood, a good deal
    taller, leaning a little, 1.13 tall to the top of a birdhouse on it (a box of boards on a base board, a steep roof
    of three courses of boards a side and a bar along the ridge, a round door and a perch under it), turned to the
    camera; and a peg out of the post's side to the right of the screen, 0.48 up, with a robin on it. Tried first: a
    plain post with the robin on its top, which left the reference's brown mass unexplained. `?set=post` also shows
    the place wider, beside the reference's scarecrow.
  - **Robin** (`animals/robin.js`, kinds in `ROBIN`'s colours), built smooth like the chickens: a round body tipped up
    at the front, brown over the back, an orange breast and face, a pale belly, wings folded close, a flat oval of a
    tail down behind, big dark eyes; 0.2 tall, drawn 1.4 times that on the post (bigger than life, as the swallows).
    It holds each look for most of a second, then turns its head quickly to the next, now and then cocking it
    (`update`). As it may be placed facing any way, `dev/animals.html?set=robins` shows it from the game's camera
    turned eight ways. Seen only from the front at first, the tail was a thin plank and the wings stuck out like
    ears from behind.
  - **Flowers** (`plants/flowers.js`), one model for every kind the reference draws in clumps along the roads and
    the river (kinds in `FLOWERS`, which differ in their heads and colours): a mound of broad pointed leaves (the
    birch's `leaf`), the inner ones from higher up and more upright, the outer ones low and spreading, over a dark
    core (a `clump`) so the gaps show deep green; over it heads on slender stems from its foot, each stem with two
    leaves up it so the heads sit among leaves, spread over a low dome (the middle ones highest), turned up to the sky
    and a little to the camera. The heads are a mesh of their own that glows (in the warm sun the whites turned
    cream); the leaves glow a little.
    - **Daisies** (`daisy`, `?set=daisies`), the white clump by the river at the front left: 0.7 tall and about 0.8
      across, eight to ten heads of six broad rounded petals, cupped up a little, round a domed orange heart; about
      2,000 triangles a clump. Tried first: a rosette of narrow leaves and long bare stems (daffodils); the heads
      bunched on top (a bouquet); heads on long stems over a round tuft of leaves (a pot).
    - **Pinks** (`pink`, `?set=pinks`), the row on the grass between the ring road and the plots, on the left:
      plants standing alone, not in clumps (`flowerRow`, about five to a unit, each a little out of line and its own
      height, its stem leaning a little), about 0.3 tall: a tall stem, three narrow leaves at its foot and one up it,
      a bud on a short stalk off four stems in ten, and a head of three rings of cupped petals (`rings` in the kind),
      the inner ones shorter and deeper in colour, like a small rose or peony, each plant pink, magenta, purple or
      white flushed pink (`mix`). About 5,500 triangles a row three units long; turn it along the road when placing
      it. The reference's heads are rounder, like pompoms; these open more, like cups. Tried first at twice the size.
    - **Yellow** (`yellow`, `?set=yellow`), the low clumps in front of the well on the left and at the left edge: 0.5
      tall, seven to nine heads like black-eyed susans, nine broad petals and a ring of eight shorter ones inside
      round a domed dark brown heart; each head takes its colours from the kind's `mix` (as the pinks do), mostly
      lemon yellow, now and then golden orange or dark red. About 3,100 triangles a clump. Tried first: many small
      heads of narrow petals (stars, peach in the warm sun); orange at the petals' foot (the heads read orange).
    - **Purple** (`purple`, `?set=purple`), the low clump beside a rock by the river on the right, like pansies:
      0.35 tall, seven to nine heads of five broad, nearly flat petals, deep purple at the middle and pale at the
      edges, round a small yellow eye (`eye` in the kind, the heart's width); each head pale violet, deep purple,
      white flushed violet or blue-violet (`mix`). About 1,750 triangles a clump. Tried first with the daisies' big
      heart (violets, not pansies). The white ones turn cream and pink in the warm sun.
    - **Spikes** (a kind with `spikes`): the mound lower (`mound`, of the usual), and rising from it stalks, the middle
      ones tallest, each leaning its own way, a leaf or two low on it and one of the kind's colours; up the top
      `spike` of each, `florets` heads smaller and smaller towards the tip, the top quarter buds, turned out round
      the stalk in a spiral or (`side`) to either side of the camera in turn.
      - **Orange** (`orange`, `?set=orange`), on the well's left, like gladioli: 0.6 tall, one or two stalks of seven
        big six-petalled florets turned to the camera, orange, golden or red-orange. About 2,200 triangles.
      - **Lupins** (`lupin`, `?set=lupins`), by the bench beyond the well: 0.55 tall, three to five spikes of
        fourteen small four-petalled florets cupped nearly shut, packed close round the stalk, blue-violet and now
        and then pink. About 5,800 triangles, heavy for a clump: fewer florets, or none of their hearts, if need be.
        Tried first with five open petals, further out (loose and spiky, not columns).
    - **Mixed beds** (`flowerBed`, `?set=beds`), curving round the front of the well and along the fence by the road
      below the farmhouse: a low mound of deep green about 0.3 tall dotted with small five-petalled heads of every
      colour (pink, magenta, white with a pink eye, purple, red, yellow, blue-violet), along any path of points:
      clumps of the `bed` kind every 0.22 or so, a little to either side and each its own height, overlapping, merged
      into two meshes. The clumps are not turned, so the heads keep facing the camera. About 7,200 triangles a bed
      1.2 long, heavy: fewer leaves to a clump if need be. Tried first: the clumps turned every way (heads edge on),
      further apart (gaps) and with more heads (a carpet of flowers, where the reference shows green between them).
  - **Rocks** (`plants/rock.js`, `?set=rocks`), the boulders the reference draws along the river's banks (it has
    hardly any by the roads). Of `ROCKS` in `valleyMap.js` only the first four clusters, the outcrops in the painted
    forest at the back (`KEEP_ROCKS` in `art/backdrop/recolor-layout.py`), are in the painting; the rest (along the
    river, the one in the woods on the left and the one among the front trees) were taken out of it for 3D rocks, and
    the painted banks show only a lip of small stones there. A chunky lump of warm grey stone, 1.2 to 2.1 times as
    wide as it is tall, longest along x: the hull round rings of corners at its foot (spreading a little, sunk into
    the ground), its middle and its upper part, and a small face on top, each corner rounded off by a little ball of
    points, so every edge has a thin bevel that catches the light, lighter along the top; often one or two smaller
    lumps grown into its side. Pale on top, darker down its sides, darker still to its foot, glowing a little (0.18).
    Its material grains and blotches the stone, with faint cracks, and lays moss in soft patches over what faces up
    (a `moss` value at each corner). Round the foot of each lump a shadow fades out over the ground (alpha at its
    corners): the sun's shadow alone left a thin lit line where it grazes a side (normalBias) and the stone looked set
    on the ground, not in it. About four in ten are mossy and half have one to three small plants (a tuft of grass
    blades or a few broad leaves, the birch's `leaf`) in the crack between two lumps and round the foot. `rock(seed,
    h, { moss, plants, turn })` sets them; give it `turn` rather than turning what it returns, so the plants grow on
    the side the camera sees. 110 to 370 triangles of stone, 70 to 220 of shadow, 90 to 300 of plants. Tried first: a
    squat block with a broad flat top and upright sides (it lay flat on the ground and showed no volume; the user's
    pictures of low-poly rocks show chunky lumps with bevelled edges); then wide bright bevels (a net of lines) and a
    peak on top (a gem). The foot's shadow is darker than the painting's shadows (`shadowCatcher`, 0.36): look at it
    there when placing.
  - **Cattails** (`plants/reeds.js`, `?set=reeds`), as the reference draws them at the water's edge: three on the
    bank below the frog's pond (1.27 tall), a big clump of six on the river's near bank at the front (1.75), two slim
    ones on the upper riverbank above the fir (0.8). Two to six slender green stalks, the first the tallest and nearly
    upright, the others shorter and fanning out to either side of the camera, each leaning out most near its foot and
    straightening up, so its head stands nearly upright; each head a slim dark brown sausage about a quarter of the
    clump's height, rounded at either end, with a short spike above it. Round their foot four to nine long strap
    leaves rising and arching over, their faces turned to the camera. `reeds(seed, h, { stalks, leaves })`; about 420
    to 740 triangles a clump. Tried first: fat orange-rust heads; stalks leaning most near the top (the heads slanted);
    leaves turned edge on to the camera (blades of grass lying on the ground).
  - Pictures of low-poly leafy trees the user found, kept for later on the user's machine in `art/plants/found/` (not
    in git: stock previews): crowns of big separate leaves, pointed or rounded, laid over a few lobes like shingles,
    pale on top and deep under the crown, on twisted trunks forking into a few limbs that show under it; and one of
    faceted gem-like clumps on a ridged, twisted trunk.
- Shadows on the painting: the painting is unlit, so a plane just over it draws only the shadows of the 3D things
  (`shadowCatcher` in `backdrop.js`, also in `dev/buildings.html`, `SHADOW_GROUND` wide). Only things inside the
  sun's shadow box cast them. The box now follows the view (`fitShadow` in `countryside.js`, called from
  `FarmScene.applyView` and in `dev/buildings.html`): it takes in the ground in view and whatever stands up to 4 above
  it, as the sun sees them, moves in steps of one texel so the shadows stay still while the view pans, and keeps a
  bias of 0.017 in the world whatever depth it takes. On a wide screen at the usual zoom it is about 26 × 16 units,
  some 115 texels a unit on "Đẹp"; zoomed out it grows, but its texels take no more of the screen. Before, it was a
  fixed box round the farm (first a square 10 units round the middle, which cut the small bridge's shadow in half,
  then 23.5 × 25 round everything in `PLACES`, `BRIDGES` and `TREES`), and with the woods four trees in five stood
  outside it with no shadow. `SHADOW_GROUND` is 60, all of the painting.
- **Placing the plants** (`plants/valley.js`, `placePlants`, in `countryside.js` beside `placeBuildings` and in
  `dev/buildings.html`), in groups, each looked at before the next. First the trees and bushes round the farm
  (`TREES` in `valleyMap.js`: `[kind, u, b, height, seed]`), each where the reference draws it, its foot's pixel
  turned into the map by u = (x − 806) / 55, b = (502 − y) / 32.98. The buildings in `PLACES` stand where the
  reference draws them, so this holds round the farm; where the painting's roads or river differ, or the farm's flower
  beds are in the way, a tree is moved: the fruit trees just inside the ring road are pulled in to 1.3 inside the
  road's middle (`ringDistance`), past the beds; the blossom tree onto the farmhouse's pad above its road; the pine by
  the windmill and the one beyond the meadow off their roads; the fir between the riverside road and the water; the
  birch past the fields up onto the ledge over the small fall (at the reference's spot it stood in the fall's pool). Each
  stands as modelled, unturned, as `dev/plants.html` shows it to the camera. The round tree inside the meadow's fence
  has a notch in the herd's `area`. They sway (`sway` in `plants/sway.js`): a copy of each material that keeps what
  its own `onBeforeCompile` does and leans every vertex downwind as the wheat does, by 0.01 × its height squared, on a
  beat set by where the tree stands, so a tree bends rather than wobbles; instanced meshes sway too. The shadows stay
  still.
  Then the woods (`plants/woods.js`, `WOODS` in `valleyMap.js`), where the painting left grass the reference fills
  with trees: behind the farm up to the painted forest's edge (left of the farmhouse above the meadow, and behind the
  buildings along the back of the ring road), the front past the river (`FOREST.dense[1]`), the far bank on the right,
  the grass right of the fields below the ledge over the small fall, down to the front woods (keeping 1.8 from the
  fields' fence, for the sunflowers to come), the strip between the meadow road and the river, and the left edge (the
  three `FOREST.medium`). Each area has a
  spacing (1.1 behind the farm to 1.7 by the meadow road), how often each kind grows (pines, firs, slim trees,
  birches, round trees lime or green), a range of heights (each kind grown to its own share of it: the round trees'
  broad crowns 0.8 of a pine's, the firs 0.75) and how many bushes grow under the trees. Trees are thrown at random
  (seeded) and kept if no nearer another than the spacing and clear of the river, the roads, the ring road, the
  bridges, the falls, the cliff, every building's spot and yard, the meadow, the fields, the landing, the rock clusters
  still to be placed (`ROCKS` from 4 on; the first four were in the painting's layout but it painted no rocks there)
  and the trees placed by hand; bushes then keep 0.55 from a trunk. About 250 trees and 37 bushes. A few models of
  each kind are built once and drawn for all their trees (`InstancedMesh`), each tree sized, a little lighter or
  darker, and turned (not the birches and slim trees, whose leaves face the camera). At the front the trees stand back
  from the water (`shore` 1.5) and low near it, rising to full height (2.4 to 3.6) 4.5 from it (`water`), so the river
  and its bank show as in the reference; the first try, as thick as behind the farm and up to the water, hid the bank.
  The front is mostly pines (cheap, 400 triangles against a round tree's 3,400) and a little darker. Behind the farm
  the woods reach back to the painted trees' feet: where the painted forest stands back (u -9 to -5 and 0 to 6) the
  first outline left bare grass the user saw as a hole. Behind the farm the reference draws mostly pines with round
  trees among them; a first mix of pines and big lime round trees alone looked heavy and samey, so firs, slim trees and
  birches came in and the lime ones went down to a tenth. About 550,000 triangles in all.
  Then the flowers, crops and props, one at a time (`FLOWERS` in `valleyMap.js`, the same `[kind, u, b, height,
  seed]` as `TREES`, built by `placePlants` too). First the sunflowers round the fields over the big bridge, eleven,
  0.8 to 1.7 tall: the reference's fields lie a little off the painted pad, so each stands as far from the fence as
  the reference draws it from its own (fields' frame, not its pixel turned into the map): six in a cluster outside
  the front right side round the front corner, two more along that side (where the reference is cut off), two
  behind the back fence by the right corner and a small one behind it by the slim trees. The woods leave the flowers in view (`hidesFlower` in `woods.js`): a tree is left out where it stands within
  0.7 of a flower, or in front of one, near enough across the screen for its crown and tall enough to reach over the
  head's lower edge (two thirds of the flower's height; a world unit of height reaches √2 / 0.95 of b up the screen);
  lower trees in front, which only hide the stems, stay, as in the reference. They are left out after the woods are
  laid out, so every other tree stands where it did; two pines went. The reference draws bigger heads and fuller
  leaves than the approved model; kept as it is.
  Then the row of tomatoes behind the plots, along the ring road where the reference draws it (two units long, turned
  as `dev/plants.html` turns it; a `FLOWERS` entry's last item, `more`, gives a row its `turn` and `length`). The pig's
  patch ran across it: it is now the grass between the plots' back corner and the front of the row, about 0.84
  square units, the pig standing in front of the row's left end as in the reference (moved 0.08 to be inside it),
  and the lawn hens' patch keeps off the row's right end.
  Then the clumps of flowers (`flowers` in `flowers.js`, a kind each: `daisy`, `yellow`, `purple`, `orange`, `lupin`),
  area by area, every clump the reference draws, not only the ones `dev/plants.html` cut out to model them from (the
  user's choice: it draws dozens). First the river's bank in front of the farm, from the pine in front of the well to
  the big bridge: fifteen on the grass between the ring road and the bank's edge (seven yellow, four lupins standing
  together as the reference's one broad clump of them, two orange, two daisies), about 45,000 triangles. The
  painting's bank stands up to 0.7 further back than the reference's on the left, so the clumps at its edge moved
  back onto its grass, and the red spikes beside the bench (still to come) off the ring road. The reference also
  draws broad green leaves among them, which the game does not have.
  Then round the well and along the meadow road. The painting's well stands 0.85 further back than the reference's,
  so what hugs it is placed as far from it as the reference draws it from its own: the mixed bed curving round its
  front (`bed`, `flowerBed` with the path `dev/plants.html` measured), orange spikes on its left beside a small pine
  with orange flowers at its foot, and a little yellow clump at its right side. The meadow's fence too stands further
  out than the reference's, so the pink and the orange clumps in front of its right side are placed by it, either
  side of its gate (the pink one a short mixed bed: a row of pinks read as three bare stems); pink spikes (a lupin)
  beyond the road where it bends, a yellow clump below the trough between the front fence and the road, and on the
  bank left of the well the big clump of daisies with a smaller one and yellow clumps among the birches. The small
  pine is in `FLOWERS`, not `TREES`: the woods keep clear of `TREES` while they are laid out, so a new tree there moves
  every woods tree laid out after it, while `FLOWERS` are only left out afterwards (`hidesFlower`).
  Then the left edge: in the clearings of the woods left of the farmhouse and behind it, orange, red, white and pink
  clumps and small mixed beds; red ones by the road's end at the farmhouse's gate (off the painted road, which ends
  further up), the bed along the fence below the farmhouse (moved back off the road onto the grass between its two
  branches) and a yellow clump past the meadow. Clearing the woods in front of each of them as on the bank took 14
  trees and left the woods behind the farm bare, where the reference is thick with flowers peeping out; so a flower
  among the trees (`inWoods`) only keeps them off its own spot, and the woods lose 7. The orange and red ones by the
  road's end, which the reference shows in the open, still clear the trees in front. The reference's orange clumps
  there are round like marigolds and its red ones like tulips; the game has neither kind, so they are orange spikes.
  Then across the river at the front, where the reference draws few: a little mixed clump at the water's edge on the
  left (out of the painted water onto the bank), on the open bank below the big bridge a mixed bed with a tall orange
  spike behind it (the reference's is a pink-red torch), daisies and a small white clump, and two clumps deep in the
  woods beyond (`inWoods`); the woods lose 5 trees. The reference's lily pads on the river there are left for the
  cattails.
  Then the right: a long bed in front of the windmill curving with its road (placed from the windmill as the reference
  draws it from its own), and on the grass between the windmill's road and the riverside road down to the small fall,
  purple pansies (one by the bank's edge, where the reference has it by a rock), a little mixed clump, a yellow and an
  orange one; the reference's riverside road and river stand two units further left there, so these follow the
  painting's bank, and a pink clump by the ring road's fence, which fell on the painted road, was left out. Across
  the small bridge, two mixed beds above the far bank's road. The reference also draws a bench, a fence along the
  road, a table and a lamp on that grass, which no list has yet.

### Loose ends

- The olive areas came out as bright rolling grass, not dark woodland floor. Fine under 3D trees.
- Between the layout's dense forest and the painted one there is now open grass (behind the farmhouse and on the
  hillside at the back left). Step 2 can decide whether 3D trees go there.
- `countryside.js` still has its own older `LAYOUT` (where each building stands) and `ROADS`; they do not match
  `PLACES` and `ROADS` in `valleyMap.js`.

## Next steps

In this order:

1. **Bring back the 3D on top of the painting**, placed from `valleyMap.js` (`PLACES`, `BRIDGES`, `MEADOW`), one
   building at a time as above. Done: every building along the back of the ring road (farmhouse, hen yard and hens,
   cart, barn, bale, silo, haystack, windmill and stone shed), the well, the bridges, the buffalo, the cows and the
   sheep, the pig, the ducks and the swallows, the meadow's fence and trough, the fields over the big bridge, the
   landing by the small fall, and spray and mist at the foot of each painted fall. Step 1 is done.
2. **3D trees that sway** gently (wind in the vertex shader; `wind` in `buildings/fields.js` sways the wheat) in the
   olive areas and round the farm; bushes, flowers (the sunflowers along the fields' front right side among them),
   rocks and reeds. The trees are designed one kind at a time first (above), then placed all together. Done: the
   pine, the round tree, the fruit tree, the wood they all grow on, redone, and the pink blossom tree by the
   farmhouse, the birch, the slim upright trees by the river on the right, the fir on the upper riverbank, the bush,
   the sunflower, the
   tomatoes by the pig, the post with a birdhouse and a robin by the fields' back fence, the white daisies, the
   row of pinks along the ring road, the yellow clumps, the purple ones, the orange and purple spikes by the well,
   the mixed beds, the rocks by the river and the cattails. Placed, swaying: the trees round the farm, the woods and
   the sunflowers round the fields and the tomatoes by the pig and the flowers along the front bank, round the well, on the left edge, across the river and on the right. Next: the rest of the flowers, crops and props, then the rocks and the cattails.
3. **Before merging:** the README's code map (`backdrop.js`, `valleyMap.js`, `art/backdrop`), the new public files in
   the offline cache (`backdrop/`, `backdrop-water.png`, `water-noise.png`; a device needs only one of the two sets
   of tiles, so perhaps cache what it loaded rather than list them all in `PUBLIC_FILES`), and the old 3D scenery's
   code either removed or kept behind its flags.

## Known bug

Not from this work and not fixed yet: if the page loads while the canvas is 0×0 (a hidden tab or panel), the zoom
becomes NaN in `FarmScene.resize` → `setZoom`, and the valley stays blank until the page is reloaded.

## Picking it up

- Run the game with `npm run dev`. In the Claude desktop app, the preview "farm-dev" (`.claude/launch.json`) serves it
  on port 5174, or on a free port the app picks when another session already has 5174.
- `src/three/backdrop.js`: the painting, where it sits, its tiles, and the water shader.
- `src/three/valleyMap.js`: where everything in the valley is, in map units, as the painting shows it.
- `src/three/countryside.js`: builds the valley from the map; `STAGE` says which parts are on.
- `src/three/farm.js`: the ring road's shape and the farm inside it.
- `art/backdrop/README.md`: coordinates, and how to make, fit and animate a new painting.
