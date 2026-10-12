# Backdrop art

The valley's ground is a painted illustration laid flat under the 3D farm (`src/three/backdrop.js`). This folder holds
what it is made from and the scripts that turn a painting into what the game loads. Why it is done this way, and what
is left to do, is in [docs/redesign.md](../../docs/redesign.md).

## Files

| File | What it is |
|---|---|
| `2-style-reference.png` | The reference design: the look the painting copies. |
| `layout-v1.png` | The first colour-coded layout, traced from `src/three/valleyMap.js`, in which every tree was to be painted. The script that drew it is not kept; its shapes, in pixels, are in `layout-marks.json`. |
| `1-layout.png` | The layout the image model follows, made from `layout-v1.png` by `recolor-layout.py`: the olive areas are bare woodland floor, where the game puts 3D trees, and the boulders along the river are gone. |
| `layout-marks.json` | The layout's shapes in pixels: forest areas, ring road, roads, river, falls, building pads, rocks, and named marks with their map (u, b). |
| `layout-annotated.png` | The layout (old colours) with a u grid and the named marks, for matching coordinates by eye. |
| `prompt.txt` | How to ask an image model for the painting, and what to reply when it strays. |
| `painted-v1.webp` | The first painting (1536×1024). The game loads it upscaled ×4 and cut into tiles, in `public/backdrop/`. |

## Coordinates

Map units are `u` across the screen and `b` up it (the plots are `|u| + |b| < 3.6`); see `xz` in `countryside.js` for
the world's x, z. A step `b` up the map is `b × 0.559` up the screen.

- Layout pixel: `(768 + 42.667 u, 533.33 − 0.559 × 42.667 b)`.
- Painting pixel: `(cx + scale u, cy − 0.559 × scaleY b)`, with `cx`, `cy`, `scale`, `scaleY` from `BACKDROP` in
  `src/three/backdrop.js`. They are for the upscaled painting (6144 px wide); divide by 4 for `painted-vN.webp`.

## Making a backdrop

The scripts need Python 3 with numpy, scipy and Pillow. Run them from this folder.

1. **Layout.** `python3 recolor-layout.py` remakes `1-layout.png` from `layout-v1.png`. To keep a boulder cluster in
   the painting, add its index (in `layout-marks.json`'s `rocks`) to `KEEP_ROCKS`.
2. **Painting.** Give the image model `1-layout.png` then `2-style-reference.png`, and paste the prompt from
   `prompt.txt`. Save the result here as `painted-vN.webp`.
3. **Upscaling.** At 1536 px wide the painting has about 42 px per world unit, while a phone needs about 90 at zoom 1
   and a retina desktop about 200. Upscale it ×4 with the Upscayl app's "Digital Art" model (Real-ESRGAN; it kept the
   edges cleaner than "Standard" and "High Fidelity" on v1). The app has a command line inside; the result is too big
   to keep in git, so make it somewhere outside the repo:
   ```
   R=/Applications/Upscayl.app/Contents/Resources
   $R/bin/upscayl-bin -i painted-vN.webp -o /tmp/painted-vN-x4.png -m $R/models -n digital-art-4x -s 4 -f png
   ```
4. **Fitting.** `python3 fit-backdrop.py painted-vN-x4.png overlay.png [x0,y0,x1,y1 ...]` fits the layout's roads to
   the painting's and prints `cx`, `cy`, `scale`, `scaleY` for `BACKDROP` (scaled up for an upscaled painting). The boxes,
   in layout pixels, leave out parts where the painting differs from the layout; by default the upper right, where
   v1 moved the waterfall. Check `overlay.png`: the layout's outlines drawn over the painting.
5. **Water.** `python3 water-map.py painted-vN.webp ../../public/backdrop-water.png ../../public/water-noise.png [debug.png]`
   finds the water by its colour and writes the map the water shader reads. `MAIN_FALL` and `SIDE_FALL` are boxes
   round the falls (in painting pixels), where the water runs five times as fast; `SEEDS` are a pixel of each body of
   water to keep. `debug.png` shows the flow as colour bands, which should cross the river square to its banks.
6. **Into the game.** `python3 tile-backdrop.py /tmp/painted-vN-x4.png ../../public/backdrop` cuts the upscaled
   painting into four tiles of at most 4096 px, the most some phones load (`high-*.webp`, for the sharp setting), and
   makes one at half size (`low.webp`, for the fast setting, a quarter of the memory). Then set `BACKDROP` in
   `src/three/backdrop.js`: `width`, `height` of the upscaled painting and the numbers from step 4.
