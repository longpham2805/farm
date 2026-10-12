// The valley's layout, traced from the reference design (which matches the game seen at zoom 0.543).
// Everything is in (u, b) map units like countryside.js: u across the screen, b up it, the plots |u| + |b| < 3.6.
// Heights are in world units; the plots stand at 0 and the river's surface at WATER_Y.
// Nothing here draws anything: the terrain, river, roads and forest builders read it.

export const WATER_Y = -0.75;

/**
 * The river's channel, cut down into the land: the banks drop from a grassy lip (`lip` gives the range of its height,
 * which wanders along each bank) down a steep face about `face` wide to the water, and the bed lies `bed` below the
 * water. Above the lip the ground climbs back up to the land's level over a couple of steps.
 */
export const CHANNEL = { lip: [-0.3, 0.02], face: 0.5, bed: 0.35 };

/** Stretches of bank that are bare rock rather than earth, with boulders along them: [u, b, radius]. */
export const ROCKY_BANKS = [
  [8.0, 10.2, 1.8], [9.5, 6.5, 1.8], [10.8, 3.5, 1.6], [11.0, 0.0, 1.5], [7.6, -1.8, 1.3], [3.2, -5.6, 1.4],
  [-2.3, -7.1, 1.3], [-6.2, -7.6, 1.5], [-11.0, -9.7, 1.6],
];

/**
 * The ring road round the farm: a square to the plots, `half` from the middle to each side's centre line, with each
 * corner rounded to its own radius. The back and front corners (top and bottom of the screen) are rounded almost to
 * a half circle, the left and right ones only a little, where the other roads leave it.
 */
export const RING = { half: 5.3, width: 0.85, corners: { back: 4.1, front: 5.3, left: 1.6, right: 2.0 } };

/** The river from the foot of the waterfall to where it leaves the valley: [u, b, half width]. */
export const RIVER = [
  [8.1, 11.2, 0.6], // where the waterfall lands
  [7.9, 10.5, 1.2], // the pool
  [7.5, 9.2, 0.7], // under the small bridge
  [7.6, 7.8, 0.7],
  [8.5, 7.0, 0.75],
  [9.3, 6.0, 0.8],
  [10.0, 4.8, 0.8],
  [10.2, 3.2, 0.75],
  [10.6, 1.6, 0.8],
  [10.5, 0.3, 0.85],
  [9.9, -0.7, 0.9],
  [8.9, -1.6, 0.9],
  [7.8, -2.8, 0.95],
  [6.6, -3.8, 1.0],
  [5.6, -5.3, 1.0], // under the big bridge
  [4.4, -6.2, 1.0],
  [2.8, -7.2, 1.0],
  [0.8, -8.0, 1.0],
  [-1.2, -8.1, 1.0],
  [-3.2, -7.9, 1.0],
  [-5.2, -8.2, 1.0],
  [-6.8, -8.6, 1.0],
  [-8.3, -9.6, 1.0],
  [-9.9, -10.2, 0.95],
  [-11.4, -11.5, 0.95],
  [-14, -12.6, 1.0],
  [-18, -14.0, 1.0],
  [-24, -16.3, 1.0],
];

/**
 * The waterfalls: where the water lands [u, b], how high the lip is above the water, and how wide the fall is.
 * The side one is a stream off the ledge on the right bank, falling into the river; `stream` is its course above.
 */
export const WATERFALLS = {
  main: { at: [8.1, 11.2], drop: 4.0, width: 1.1 },
  side: { at: [11.6, -0.5], drop: 0.9, width: 0.5, stream: [[15, 0.4], [13.4, 0], [11.6, -0.5]] },
};

/** Bridges from end to end: [[u, b], [u, b]], and how high the deck arches above the banks. */
export const BRIDGES = {
  small: { ends: [[6.6, 8.9], [8.5, 8.6]], arch: 0.25, width: 0.7 },
  main: { ends: [[3.3, -4.5], [6.5, -6.5]], arch: 0.35, width: 1.0 },
};

/**
 * The roads off the ring, each a list of [u, b] from where it leaves the ring. A road that runs over a bridge goes
 * through both of its ends.
 */
export const ROADS = {
  // From the ring's front right side over the big bridge, past the fields and away to the front right.
  bridge: [[3.0, -4.2], [3.3, -4.5], [6.5, -6.5], [8.9, -9.0], [11.2, -11.5], [13.5, -14], [16, -17]],
  // From its left corner down past the meadow and away to the left.
  meadow: [[-6.8, 0.6], [-6.6, -0.7], [-7.1, -2.75], [-8.4, -4.6], [-10.3, -6.2], [-12.5, -6.8], [-15, -7.3], [-19, -8.5]],
  // From its left corner up to the gate at the side of the farmhouse.
  farmhouse: [[-6.8, 1.0], [-8.4, 2.3], [-9.7, 3.3], [-9.9, 4.3]],
  // From its back right side between the silo and the haystack, up to the small bridge and on along the far bank.
  waterfall: [[2.0, 5.0], [3.4, 5.25], [4.4, 5.4], [5.4, 6.4], [5.9, 8.0], [6.6, 8.9], [8.5, 8.6], [10.5, 7.2], [11.6, 6.2], [13.9, 6.3], [17, 6.6]],
  // From its right corner past the windmill to a landing on the river bank.
  landing: [[6.6, 1.4], [8.1, 2.7], [8.6, 4.3], [8.5, 5.3]],
};

/** Where things stand: [u, b], with a footprint or size where the design shows one. */
export const PLACES = {
  farmhouse: { at: [-6.3, 4.6], size: [2.6, 1.8] }, // its porch faces the ring's back left side
  cherry: { at: [-8.0, 2.7] },
  coop: { at: [-4.4, 6.3] },
  henHouse: { at: [-3.5, 7.0] },
  chickenRun: { at: [-3.6, 5.8], radius: 1.0 },
  cart: { at: [-1.8, 7.0] },
  barn: { at: [0.8, 6.9], size: [1.9, 1.9] }, // its doors face the camera, just behind the ring's back corner
  bale: { at: [1.9, 6.1] },
  silo: { at: [3.3, 6.3], radius: 0.55, height: 2.75 },
  haystack: { at: [4.7, 6.3] },
  windmill: { at: [6.1, 4.8] },
  stoneShed: { at: [4.9, 4.6] },
  well: { at: [-6.0, -3.8] },
  buffalo: { at: [6.3, -2.6] },
  // The fenced fields over the big bridge: square to the plots, `half` along each of their sides.
  fields: { at: [11.0, -6.7], half: [2.25, 2.8] },
  scarecrow: { at: [12.2, -3.8] },
  cows: [[-11.3, -2.4], [-11.0, -0.3]],
  sheep: [[-10.0, 0.3], [-12.6, 0.6]],
  trough: { at: [-10.9, -3.5] },
};

/** The meadow's fence, corner to corner. */
export const MEADOW = [[-14, 1.2], [-10.5, 1.6], [-7.6, 0.0], [-7.6, -2.6], [-9.3, -4.8], [-14, -5.2]];

/**
 * How thick the trees grow. Dense forest frames the valley at the back and the front; medium woods are open, with
 * clearings and flowers; everywhere else (the farm, the yard, the meadow, the fields) only has the trees placed by hand.
 */
export const FOREST = {
  dense: [
    // The back: hugging the farmyard, round the waterfall's pool and down to the far bank's path.
    [[-24, 0.5], [-13.9, 0.5], [-11.9, 1.4], [-9.7, 4.4], [-8.3, 6.7], [-5.1, 7.6], [-2.9, 8.0], [-1.0, 8.6], [1.0, 9.4], [2.4, 9.2], [4.7, 8.4], [6.2, 9.8], [7.0, 11.8], [9.2, 11.8], [9.4, 9.6], [11.5, 7.6], [13.9, 7.0], [24, 7.0], [24, 30], [-24, 30]],
    // The front: everything past the river's far bank and the road beyond the big bridge.
    [[-24, -17.5], [-18, -15.3], [-14, -13.8], [-11.4, -12.7], [-9.6, -11.4], [-7.5, -10.0], [-5.5, -9.5], [-3.5, -9.2], [-1.5, -9.4], [0.5, -9.3], [2.5, -8.5], [4.5, -7.6], [6.0, -7.6], [8.6, -9.6], [11.2, -12.2], [13.5, -14.5], [24, -16], [24, -30], [-24, -30]],
  ],
  medium: [
    // The far bank on the right, up to the fields.
    [[10.9, 7.2], [14, 6.6], [24, 6.6], [24, -4], [13.5, -3.6], [11.3, -2.2], [11.4, 1.5], [11.0, 4.5]],
    // Between the meadow road and the river, on the left.
    [[-3.2, -5.6], [-6.2, -4.6], [-8.2, -5.0], [-10.3, -6.7], [-12.6, -7.3], [-15, -7.8], [-24, -9.6], [-24, -15.8], [-14, -11.4], [-11.4, -10.3], [-9.9, -9.0], [-8.3, -8.4], [-6.8, -7.4], [-5.2, -7.0], [-3.2, -6.7]],
    // Along the left edge, past the meadow.
    [[-24, 0.5], [-13.6, 0.5], [-13.2, -5.6], [-14.5, -7.4], [-24, -9.6]],
  ],
};

/**
 * The lie of the land. The farm, the yard and the meadow are level at 0; from there the ground climbs into forested
 * hills at the back and the left, a rocky cliff stands round the waterfall, the far bank on the right is a low ledge
 * and the land past the river at the front rises a little.
 * ramp: height h0 → h1 as the map coordinate `along` goes from `from` to `to`, only inside `within` ([lo, hi] of the
 * other coordinate), fading out past its ends. shelf: `height` inside `poly`, easing down over `edge` outside it, the
 * edge wandering in and out by up to `wobble`.
 */
export const LAND = {
  backHills: { kind: 'ramp', along: 'b', from: 8.5, to: 13.5, h0: 0, h1: 2.2, within: [-24, 24] },
  // Farther back, beyond the design's top edge, the hills keep climbing so the view never runs out of land.
  backRidge: { kind: 'ramp', along: 'b', from: 14, to: 22, h0: 2.2, h1: 4.2, within: [-24, 24] },
  leftHills: { kind: 'ramp', along: 'u', from: -13, to: -17, h0: 0, h1: 1.2, within: [-6, 24] },
  cliff: { kind: 'shelf', height: 4.0, edge: 0.4, wobble: 0.25, poly: [[5.5, 10.3], [6.4, 11.1], [7.0, 11.6], [8.1, 11.8], [9.0, 11.4], [9.6, 10.6], [10.0, 27], [5.2, 27]] },
  rightLedge: { kind: 'shelf', height: 0.8, edge: 1.0, wobble: 0.7, poly: [[11.0, 5.5], [11.3, 4.5], [11.6, 1.5], [12.0, -0.6], [12.4, -2.4], [24, -3.0], [24, 5.5]] },
  front: { kind: 'ramp', along: 'b', from: -9.5, to: -14, h0: 0, h1: 0.5, within: [-24, 24] },
};

/** Boulders in clusters: [u, b, spread, how many]. The banks also get a scatter along the water's edge. */
export const ROCKS = [
  // Outcrops in the forest at the back and the left.
  [-6.3, 9.7, 0.9, 4], [-11.6, 7.4, 1.2, 5], [-9.5, 7.9, 0.6, 3], [1.6, 12.8, 0.9, 4], [-13.1, -6.6, 0.7, 4],
  // Along the river.
  [-11.2, -9.2, 0.9, 4], [-6.5, -7.4, 0.5, 3], [-5.3, -7.3, 0.4, 2], [-2.3, -7.0, 0.5, 3], [-0.4, -7.1, 0.4, 2],
  [2.9, -5.5, 0.6, 4], [7.5, -1.5, 0.5, 3], [9.5, 0.9, 0.5, 3], [9.2, 7.2, 1.2, 6], [10.8, 5.0, 0.5, 3],
  [11.5, 3.5, 0.5, 3], [11.8, -0.2, 0.6, 4],
  // Big boulders among the trees at the front.
  [3.8, -11.0, 0.7, 3],
];
