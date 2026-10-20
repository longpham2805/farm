# Nông Trại Trên Mây · Cloud Farm

A single-player 3D farm game for my son, made with [three.js](https://threejs.org).
It is inspired by the farm minigame he loves: a 4×4 field where you plant, water and
harvest everyday fruits and vegetables, and ripe plants can mutate into rare, glowing
forms. Every crop also says which vitamins and minerals it has, in words a child understands.

The field sits in a green valley under a smiling sun. A dirt road runs round it, and inside the
road a fence with lamps, benches, flower beds and fruit trees. Round the road stand a farmhouse,
a barn, a silo and a windmill, with a meadow of cows and sheep on one side and fields of wheat,
cabbages and sunflowers over the river on the other. There are hens, ducks, a pig and a water
buffalo, a river with a waterfall and two wooden bridges, and forests and mountains all around.

Everything is in Vietnamese by default; English can be picked in Settings.

## How to play

1. **Plant**: tap an empty plot (or the 🌱 *Hạt giống* button). The plot glows; tap a seed
   to plant it there and the glow jumps to the next empty plot, so tapping a seed again and
   again fills the field. *Gieo hết* fills every empty plot at once. White radish seeds are
   free and never run out.
2. **Water**: plants ask for water (💧) once or twice while growing. Each watering gives
   +1 crop and a higher chance of a mutation. *Tưới nước* waters them all.
3. **Harvest**: tap ripe plants (🧺) or *Thu hoạch* to pick them all. Crops go to the barn.
4. **Sell** crops in the barn (*Kho*) for coins, and **buy** better seeds in the shop.
5. **Level up** the farm by tapping your name: it needs XP, coins and sometimes crops.
   Each level grows plants faster, raises prices and opens more plots and seeds.
6. **Mutations**: when a plant ripens it may turn into a rare look (golden, ruby, frost,
   pearl, shadow, rainbow…). The rarest ones wear a crown or a halo and shine with a beam.
7. **Collection** (*Bách khoa*): 38 fruits and vegetables with 148 looks to discover.
   A full set or a milestone gives a gift.
8. **Nutrition** (*Dinh dưỡng*): the shop, the barn and the new-plant card show what is
   good inside each crop (vitamin A, C, K, iron, fibre…). Tap a badge to hear what it does.
9. **Friends** (*Bạn bè*): visit pretend neighbours, water their plants for coins, and
   sneak-pick ripe crops (20 a day from friends, 3 a day from neighbours).
10. **Magic chests** (*Rương*): planting, watering and harvesting fill the magic bar.
   A full bar gives a chest with coins and seeds.
11. **Quests** (*Nhiệm vụ*): chapters of main quests plus daily quests.

Drag to look around the valley; pinch or use the mouse wheel to zoom. Zoom out to see the
mountains and the sky.
The game saves itself in the browser.

## Running it

```sh
npm install
npm run dev          # http://localhost:5173
npm test             # game rule tests
npm run build        # static site in dist/
npm run build:single # one self-contained file: dist-single/index.html
```

`dist/` is the installable app (PWA): put it on any HTTPS static host (GitHub Pages,
Netlify, Cloudflare Pages…). On a phone or computer, open it in the browser and choose
*Install app* / *Add to Home Screen* (Settings → *Cài lên màn hình chính* explains how).
After the first visit it also works offline.

### Publishing on GitHub Pages

`.github/workflows/deploy-pages.yml` builds the game and publishes it on every push to
`main`. One-time setup:

1. On GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
   (On a free account, Pages only works for public repositories.)
2. Merge the game into `main`. The workflow runs (see the **Actions** tab) and the game
   appears at `https://<user>.github.io/<repo>/`, here
   https://longpham2805.github.io/farm/.
3. To publish again without a code change: **Actions → Deploy to GitHub Pages → Run workflow**.

`dist-single/index.html` is the whole game in one file. It can be copied to a phone or
tablet and opened directly, but it cannot be installed as an app.

### Playing on several devices

Settings → *Đồng bộ & mã lưu* has two ways to share one farm:

- **Family code** (*Mã gia đình*): make a code on one device, type it on the others. The farm then
  syncs by itself when online. If two devices played before syncing, the farm with more play wins.
  Plants ripening on a device nobody touches never overwrite real play.
- **Save code** (*Mã lưu*): the whole farm as a line of text to copy, send and paste. No internet
  or setup needed; it is a one-time move, not a sync.

The family code keeps each farm in a free Firebase (Firestore) database. There is no server code:
the game talks to Firestore's REST API directly. One-time setup:

1. Go to https://console.firebase.google.com → **Create a project** (Google Analytics can be off).
2. **Build → Firestore Database → Create database**: *Standard edition*, location
   `asia-southeast1` (Singapore) or any near you, **production mode**.
3. In the database's **Rules** tab, replace everything with the contents of `firestore.rules`
   and press **Publish**.
4. **Project settings** (gear icon) → **Your apps** → the web icon `</>` → give it any name →
   **Register app** (no Hosting). Copy `apiKey` and `projectId` from the code it shows.
5. Put them in `CLOUD` in `src/config.js` and push. Firebase web keys are not secrets; the rules
   are what protect the data.

Until `CLOUD` is filled in, the family code part is hidden and only the save code shows.

Older saves are upgraded automatically: wheat becomes rice, and the removed flower and
candy crops become fruits of the same tier (see `RENAMED_CROPS`).

## Code map

| Path | What it holds |
|---|---|
| `src/config.js` | Balance numbers: levels, costs, plot unlocks, mutation and energy rates |
| `src/data/crops.js` | The seed catalog (prices, XP, yield, grow time, looks) and mystery packs |
| `src/data/nutrition.js` | Vitamins and minerals in each crop, with a fun fact |
| `src/data/styles.js` | Mutation looks and which looks each crop can get |
| `src/data/quests.js`, `src/data/npcs.js` | Quest chapters, daily quests, neighbours |
| `src/game/logic.js` | All game rules as plain functions (tested in `tests/`) |
| `src/game/cloud.js`, `src/game/sync.js` | Family-code sync through Firestore, and save codes |
| `src/three/models.js` | Procedural 3D model for every crop, growth stage and mutation |
| `src/three/scene.js` | Renderer, camera, lights, effects, picking, zoom and pan |
| `src/three/farm.js` | The farm in the middle: plots, barn, the fence with its lamps, benches and flower beds, the frog's pond (recoloured for neighbours), and the shape of the ring road round them |
| `src/three/countryside.js` | The valley around it: the map, ground, river and waterfall, roads, forest, mountains, clouds |
| `src/three/buildings.js`, `src/three/animals.js` | Farmhouse, silo, windmill, coops, well, bridges, fields, meadow…; hens, ducks, a pig, cows, sheep, buffalo, birds |
| `src/three/buildings/` | The buildings redone for the painted valley, one file each (farmhouse, barn, silo, windmill, stone shed, hen yard, well, cart and hay so far), and the parts they share |
| `src/three/animals/` | Animals for the painted valley, apart from where they live: chickens of several breeds, and a flock that wanders any patch of ground |
| `src/three/batch.js` | Merges many small still parts into one mesh, so the valley draws in a few calls |
| `src/three/stats.js` | `?stats` on the address shows what a frame costs: draw calls, triangles, ms, fps |
| `src/three/mist.js` | Mist round the farm's grounds, thickest at the corners of the opening view, with wisps of cloud drifting by |
| `src/three/trees.js` | Trees built in code: tiered pines, round trees with puffy crowns, birches and bushes, painted light on top and dark underneath |
| `src/three/nature.js`, `src/three/natureModels.js` | Grass, flowers, stones, boulders, stumps, logs, fences, the bench and signs from Cenji's LowPoly Nature pack, in the game's colours; `dev/nature-models.cjs` makes `natureModels.js` from the pack's `.glb` files |
| `src/three/plants/` | The painted valley's plants, built in code from a seed, one kind a file (pines, round and fruit trees, the blossom tree, birches, slim trees, firs, bushes, sunflowers, tomatoes, flowers, rocks, cattails, water lilies); `valley.js` places them, `woods.js` scatters the woods (their shadows cast by cheap stand-ins from `shadowProxy.js`), `edited.js` swaps in any model edited by hand in Blender |
| `dev/export-models.mjs`, `dev/edited-models.mjs` | Write every placed plant model out as a `.glb` for Blender (`art/models/export/`), and bake the ones edited by hand (`art/models/edited/`) into `src/three/plants/editedModels.js`; how in `art/models/README.md` |
| `src/ui/` | HUD, bottom bars and the menus (shop, barn, collection, quests, chests…) |
| `src/i18n.js` | Vietnamese and English text |
| `public/` | App manifest and icons; `vite.config.js` writes the offline service worker |
| `dev/gallery.html` | Shows every crop model (`?mode=thumbs` lists all 148 looks) |
| `dev/trees.html` | Shows the trees from `trees.js` |
| `dev/nature.html` | Shows the nature models (`?pack` in the pack's own colours) |
| `dev/animals.html` | Every chicken breed close up |
| `dev/buildings.html` | One building beside the reference design, where it stands on the painting (`?b=farmhouse`) |
| `dev/icons.cjs` | Redraws the app icons from `dev/icon-svg.cjs` |
| `docs/game-notes.md` | Notes taken from screenshots of the original game |

## Credits

- Grass, flowers, stones, stumps, fences, the bench and signs: LowPoly Nature Forest Mega Pack (free) by Cenji.
