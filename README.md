# Nông Trại Trên Mây · Cloud Farm

A single-player 3D farm game for my son, made with [three.js](https://threejs.org).
It is inspired by the farm minigame he loves: a small floating island with a 4×4 field
where you plant, water and harvest crops, and ripe plants can mutate into rare,
glowing forms.

Everything is in Vietnamese by default; English can be picked in Settings.

## How to play

1. **Plant**: tap an empty plot (or the 🌱 *Hạt giống* button), pick a seed, tap plots.
   *Gieo hết* fills every empty plot. White radish seeds are free and never run out.
2. **Water**: plants ask for water (💧) once or twice while growing. Each watering gives
   +1 crop and a higher chance of a mutation. *Tưới nước* waters them all.
3. **Harvest**: tap ripe plants (🧺) or *Thu hoạch* to pick them all. Crops go to the barn.
4. **Sell** crops in the barn (*Kho*) for coins, and **buy** better seeds in the shop.
5. **Level up** the farm by tapping your name: it needs XP, coins and sometimes crops.
   Each level grows plants faster, raises prices and opens more plots and seeds.
6. **Mutations**: when a plant ripens it may turn into a rare look (golden, ruby, frost,
   pearl, shadow, rainbow…). The rarest ones wear a crown or a halo and shine with a beam.
7. **Collection** (*Bách khoa*): 31 plants with 133 looks to discover. A full set or a
   milestone gives a gift.
8. **Friends** (*Bạn bè*): visit pretend neighbours, water their plants for coins, and
   sneak-pick ripe crops (20 a day from friends, 3 a day from neighbours).
9. **Magic chests** (*Rương*): planting, watering and harvesting fill the magic bar.
   A full bar gives a chest with coins and seeds.
10. **Quests** (*Nhiệm vụ*): chapters of main quests plus daily quests.

Drag to move around the island; pinch or use the mouse wheel to zoom.
The game saves itself in the browser.

## Running it

```sh
npm install
npm run dev          # http://localhost:5173
npm test             # game rule tests
npm run build        # static site in dist/
npm run build:single # one self-contained file: dist-single/index.html
```

`dist-single/index.html` can be copied to a phone or tablet and opened directly,
or put on any static host.

## Code map

| Path | What it holds |
|---|---|
| `src/config.js` | Balance numbers: levels, costs, plot unlocks, mutation and energy rates |
| `src/data/crops.js` | The seed catalog (prices, XP, yield, grow time, looks) and mystery packs |
| `src/data/styles.js` | Mutation looks and which looks each crop can get |
| `src/data/quests.js`, `src/data/npcs.js` | Quest chapters, daily quests, neighbours |
| `src/game/logic.js` | All game rules as plain functions (tested in `tests/`) |
| `src/three/models.js` | Procedural 3D model for every crop, growth stage and mutation |
| `src/three/scene.js` | Renderer, camera, lights, effects, picking, zoom and pan |
| `src/three/island.js` | The floating island, barn, pond, trees and fences |
| `src/ui/` | HUD, bottom bars and the menus (shop, barn, collection, quests, chests…) |
| `src/i18n.js` | Vietnamese and English text |
| `dev/gallery.html` | Shows every crop model (`?mode=thumbs` lists all 133 looks) |
| `docs/game-notes.md` | Notes taken from screenshots of the original game |
