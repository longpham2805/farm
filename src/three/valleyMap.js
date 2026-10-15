// The valley's layout, traced from the reference design (which matches the game seen at zoom 0.543), and in the
// upper right, the river and the edges of the forest from the painted backdrop (art/backdrop/painted-v1.webp), which
// strayed from the design there.
// Everything is in (u, b) map units like countryside.js: u across the screen, b up it, the plots |u| + |b| < 3.6.
// A place on the painting is where the painting shows it, as if on level ground: the top of a cliff included.
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
  [9.0, 12.9, 1.2], [11.3, 7.6, 1.6], [12.4, 3.6, 1.6], [14.2, 7.2, 1.4], [15.0, 4.0, 1.8], [13.6, -1.6, 1.5],
  [3.7, -6.1, 1.4], [-2.3, -7.5, 1.3], [-6.1, -8.1, 1.5], [-10.4, -9.7, 1.6],
];

/**
 * The ring road round the farm: a square to the plots, `half` from the middle to each side's centre line, with each
 * corner rounded to its own radius. The back and front corners (top and bottom of the screen) are rounded almost to
 * a half circle, the left and right ones only a little, where the other roads leave it.
 */
export const RING = { half: 5.3, width: 0.85, corners: { back: 4.1, front: 5.3, left: 1.6, right: 2.0 } };

/**
 * The river from the foot of the main waterfall to where it leaves the valley: [u, b, half width]. It comes down the
 * right of the farm on a ledge and steps off it at the small fall, then runs along the front.
 */
export const RIVER = [
  [10.9, 14.8, 0.8], // where the main fall lands
  [11.0, 13.9, 1.3], // its pool
  [10.9, 13.1, 1.3],
  [10.1, 12.0, 1.15],
  [10.2, 10.9, 0.8],
  [10.5, 10.2, 0.85], // under the small bridge
  [10.6, 9.5, 0.9],
  [10.9, 9.2, 0.85],
  [11.6, 8.7, 0.85],
  [11.9, 8.1, 0.9],
  [13.0, 6.8, 0.85],
  [13.7, 5.8, 1.05],
  [14.0, 5.2, 1.05],
  [13.9, 4.1, 0.85],
  [14.3, 3.2, 0.9],
  [14.5, 2.3, 0.85],
  [14.3, 1.9, 0.65],
  [13.3, 1.2, 0.55],
  [12.8, 0.4, 0.3],
  [12.2, 0.1, 0.3], // over the lip of the small fall
  [12.1, -0.4, 0.4],
  [11.5, -1.3, 0.75], // and into its pool
  [10.5, -1.9, 0.95],
  [9.5, -2.9, 0.9],
  [7.4, -4.8, 0.85],
  [6.3, -5.6, 1.05],
  [5.9, -6.1, 1.1], // under the big bridge
  [4.5, -7.0, 1.0],
  [3.8, -7.2, 0.95],
  [3.0, -7.8, 0.9],
  [2.4, -8.1, 0.85],
  [0.7, -8.2, 1.05],
  [-0.2, -8.4, 1.0],
  [-2.4, -8.2, 0.8],
  [-3.2, -8.0, 0.85],
  [-4.8, -8.4, 0.95],
  [-5.7, -8.7, 0.8],
  [-6.7, -8.9, 1.0],
  [-7.7, -9.8, 0.95],
  [-8.3, -10.0, 1.1],
  [-9.1, -10.5, 1.0],
  [-10.1, -10.8, 0.95],
  [-11.9, -12.3, 1.0],
  [-12.6, -12.5, 1.05],
  [-13.4, -13.0, 1.05],
  [-14.3, -13.3, 1.15],
  [-15.4, -13.9, 1.1],
  [-17.0, -14.5, 1.05],
  [-24, -18.4, 1.0],
];

/**
 * The waterfalls: where the water lands [u, b], how high the lip is above the water, and how wide the fall is.
 * The main one pours off the cliff at the back; the side one is where the river itself steps off its ledge.
 */
export const WATERFALLS = {
  main: { at: [10.9, 14.8], drop: 4.0, width: 1.5 },
  side: { at: [12.0, -1.3], drop: 1.2, width: 0.7 },
};

/** Bridges from end to end: [[u, b], [u, b]], and how high the deck arches above the banks. */
export const BRIDGES = {
  // From the junction on the left bank, over a strip of grass and the river, to where the far bank's road starts.
  small: { ends: [[8.5, 9.9], [11.5, 11.0]], arch: 0.3, width: 0.7 },
  main: { ends: [[4.7, -5.05], [7.0, -6.95]], arch: 0.35, width: 1.0 },
};

/**
 * The roads off the ring, each a list of [u, b] from where it leaves the ring. A road that runs over a bridge goes
 * through both of its ends.
 */
export const ROADS = {
  // From the ring's front right side over the big bridge, past the fields and away to the front right.
  bridge: [[3.0, -4.2], [3.3, -4.5], [3.9, -4.65], [4.7, -5.05], [7.0, -6.95], [7.4, -7.4], [8.1, -8.1], [8.9, -9.0], [11.2, -11.5], [13.5, -14], [16, -17]],
  // From its left corner down past the meadow and away to the left.
  meadow: [[-6.8, 0.6], [-6.6, -0.7], [-7.1, -2.75], [-8.4, -4.6], [-10.3, -6.2], [-12.5, -6.8], [-15, -7.3], [-19, -8.5]],
  // From its left corner up to the gate at the side of the farmhouse.
  farmhouse: [[-6.8, 1.0], [-8.4, 2.3], [-9.7, 3.3], [-9.9, 4.3]],
  // From its back right side between the silo and the haystack, up to the riverside road, over the small bridge and
  // on along the far bank.
  waterfall: [
    [2.0, 5.0], [3.4, 5.25], [4.4, 5.4], [5.6, 6.3], [6.4, 7.75], [7.1, 8.4], [7.7, 8.95], [8.05, 9.7], [8.5, 9.9],
    [11.5, 11.0], [11.9, 10.6], [12.6, 9.8], [13.4, 9.25], [13.9, 8.7], [14.55, 8.05], [15.2, 7.45], [16.0, 7.0],
    [16.9, 6.75], [18.2, 6.5], [21, 6.3],
  ],
  // Down the left bank of the river from the edge of the woods, past where the waterfall road joins it, to a landing
  // by the small fall.
  riverside: [
    [6.6, 12.1], [7.1, 11.35], [7.55, 10.5], [8.05, 9.7], [8.6, 9.1], [9.2, 8.45], [9.75, 7.85], [10.3, 7.15],
    [10.8, 6.35], [11.1, 5.7], [11.3, 5.1], [11.5, 4.35], [11.55, 3.45], [11.5, 2.6], [11.45, 1.85], [11.2, 1.0],
    [11.05, 0.35], [10.8, -0.15],
  ],
  // From its right corner round the windmill's yard, ending in the grass.
  windmill: [[6.6, 1.4], [7.5, 1.95], [8.0, 2.7], [8.4, 3.5], [8.6, 4.3], [8.6, 5.0], [8.5, 5.4]],
};

/**
 * Where things stand: [u, b], with a footprint or size where the design shows one, and a turn where it does not face
 * the camera (added to the angle that does).
 */
export const PLACES = {
  // Turned 30° from facing the camera, so its porch faces the ring's back left side.
  farmhouse: { at: [-6.4, 4.45], size: [2.6, 1.8], turn: Math.PI / 6 },
  cherry: { at: [-8.0, 2.7] },
  // The hens' place on its pad of two lobes, turned 37° from facing the camera: a fenced yard with the hen house
  // at its back and the small coop on its left, and `hens`, the breeds (animals/chicken.js) let loose in it.
  henYard: { at: [-3.9, 6.04], turn: 0.65, hens: ['white', 'white', 'brown', 'gold', 'speckled', 'rooster', 'chick', 'chick'] },
  // The hay cart on its pad beside the hen yard, its shafts out to the back right.
  cart: { at: [-1.6, 6.6], turn: 0.6 },
  // Just behind the ring's back corner, its doors turned 18° left of facing the camera, so its right side shows.
  barn: { at: [0.8, 6.9], size: [1.9, 1.9], turn: -0.32 },
  // A round bale at the barn's front right corner, lying across the way the barn faces, forward of its shadow.
  bale: { at: [2.2, 5.75], turn: 0.4 },
  silo: { at: [3.3, 6.3], radius: 0.55, height: 2.75 },
  // On the right of the pad it shares with the silo, forward of the silo's shadow.
  haystack: { at: [4.75, 5.9] },
  // Sharing a pad: the windmill, turned a little left of facing the camera, and the stone shed on its left.
  windmill: { at: [6.4, 4.5], turn: -0.3 },
  stoneShed: { at: [5.0, 4.4], turn: -0.2 },
  // On its pad by the ring road's front left side, turned 54° so its left gable and its mouth show.
  well: { at: [-5.9, -3.65], turn: 0.94 },
  // The buffalo grazing on the grass at the top of the river's rocky bank, facing left and a little towards the
  // camera, and her calf behind her by the road (animals/buffalo.js). They wander about `area`, the grass between
  // the road to the big bridge and the river, up into the meadow below the small fall.
  buffalo: {
    at: [6.9, -3.2], turn: -1.45,
    area: [[5.35, -3.53], [6.06, -2.71], [6.82, -1.49], [7.35, -0.37], [8.29, 0.14], [9.24, -0.01], [9.59, -0.47], [8.59, -1.45], [7.24, -3.1], [6.06, -3.63]],
  },
  calf: { at: [6.4, -2.3], turn: -1.35 },
  // The pig on the grass behind the plots, side on, facing right (animals/pig.js). It roots about `area`, the grass
  // between the back plots and the row of tomatoes behind them (FLOWERS), keeping off both, and leaving the grass on
  // the row's right to two brown hens (`lawnHens`, animals/chicken.js), as the reference draws them.
  pig: {
    at: [-0.34, 3.88], turn: 1.4,
    area: [[-1.3, 2.85], [-0.21, 3.9], [-0.85, 4.11], [-1.12, 4.24], [-1.5, 3.4]],
  },
  lawnHens: { area: [[1.25, 3.05], [2.1, 2.2], [2.6, 2.6], [2.3, 3.9], [1.85, 4.2]], hens: ['brown', 'brown'] },
  // A mother duck and her ducklings (animals/duck.js) paddling about the river between the small fall's pool and the
  // big bridge: `way` down the middle of that stretch, `half` how far either side of it they swim.
  ducks: { way: [[10.2, -2.2], [9.5, -2.9], [7.4, -4.8], [6.75, -5.25]], half: 0.45 },
  // Swallows (animals/birds.js) wheeling high over the hills behind the farm, round this spot and `height` up.
  birds: { at: [0, 9.4], height: 3.8 },
  // The fenced fields over the big bridge (buildings/fields.js, with their scarecrow) on their painted pad: square to
  // the plots, `half` from the middle to the pad's edges along world x and z (measured on the painting).
  fields: { at: [11.8, -6.78], half: [2.38, 2.8] },
  // A little wooden landing at the end of the riverside road, beside the small fall (buildings/landing.js): a jetty
  // running on from the road out over the river between its `ends`, `width` across, a boat tied up on its `side` (1:
  // its left looking out over the water), away from the fall.
  landing: { ends: [[10.62, -0.3], [10.86, -1.2]], width: 0.5, side: 1 },
  // The animals grazing in the meadow, where the reference draws them: two black and white cows, side on, facing
  // right and a little towards the camera (animals/cow.js), and two ewes, the one in view walking away to the back
  // right (animals/sheep.js). They wander about `area`, the meadow inside its fence, clear of the trough, the hay
  // rack, the bench and the round tree inside its right side (TREES). The fence (MEADOW) has `gates`: [side, how far
  // along it, how wide], here one onto the road at its front right (the right side, square to the camera, would show
  // a gate only edge on).
  meadow: {
    gates: [[3, 0.5, 0.62]],
    herd: [
      { name: 'holstein', at: [-11.9, -2.75], turn: 1.3 },
      { name: 'holstein', at: [-11.5, -0.6], turn: 1.3 },
      { name: 'ewe', at: [-10.4, 0.1], turn: 2.0 },
      { name: 'ewe', at: [-12.9, 0.3], turn: 1.0 },
    ],
    area: [[-14.0, 0.8], [-10.85, 1.45], [-10.45, 1.25], [-10.18, 0.8], [-9.4, 0.4], [-9.05, 0.53], [-8.2, 0.1], [-8.5, 0.0], [-9.0, -0.8], [-9.9, -1.2], [-10.15, -1.75], [-9.9, -2.3], [-9.1, -2.3], [-8.2, -2.0], [-9.4, -3.3], [-10.0, -2.85], [-12.1, -2.85], [-12.5, -3.8], [-13.9, -4.4]],
  },
  // The meadow's water trough, by its fence at the front, along it (buildings/trough.js).
  trough: { at: [-11.35, -3.45], turn: 0.17 },
  // Its hay rack, inside its back right fence, along it, beside the ewe in view (buildings/hay.js).
  hayRack: { at: [-9.58, 1.03], turn: -0.48 },
  // A bench in its right corner, against the right fence, under the lamp, its back to the back right (buildings/bench.js).
  meadowBench: { at: [-8.09, -0.85], turn: -0.65 },
  // A lamp post of two lanterns behind the bench, its arm across the screen (buildings/lamp.js).
  meadowLamp: { at: [-8.04, -0.38] },
};

/** The meadow's fence, corner to corner, on the painted meadow's edge (it shows as a faint line). */
export const MEADOW = [[-14.5, 1.2], [-10.8, 2.0], [-7.7, 0.4], [-7.7, -2.2], [-9.3, -4.1], [-14.4, -5.0]];

/**
 * How thick the trees grow. Dense forest frames the valley at the back and the front; medium woods are open, with
 * clearings and flowers; everywhere else (the farm, the yard, the meadow, the fields) only has the trees placed by hand.
 */
export const FOREST = {
  dense: [
    // The back, as painted: behind the farmyard's meadows, round the cliff and the waterfall and above the far bank's
    // road.
    [
      [-24, 8.3], [-18.2, 8.3], [-15, 8.8], [-13, 9.2], [-11, 9.6], [-9.5, 10.2], [-8, 11.2], [-6, 11.4], [-4.5, 11.5],
      [-3, 11.0], [-1, 11.0], [1, 11.3], [3, 11.8], [4.5, 12.3], [6, 12.7], [7.5, 13.0], [8.6, 13.1], [9.4, 13.7],
      [9.8, 15.1], [10.3, 15.6], [11.7, 15.6], [12.4, 14.8], [12.9, 13.6], [13.6, 12.5], [14.5, 11.4], [16, 10.3],
      [17, 9.5], [18.2, 9.0], [24, 9.0], [24, 30], [-24, 30],
    ],
    // The front: everything past the river's far bank and the road beyond the big bridge.
    [
      [-24, -19.8], [-15.2, -15.4], [-13.7, -14.7], [-11.9, -13.8], [-10.5, -13.0], [-9.1, -11.9], [-7.6, -11.3],
      [-6.2, -10.1], [-4.5, -9.7], [-2.7, -9.4], [-0.8, -9.7], [1.0, -9.6], [2.7, -9.3], [4.5, -8.4], [6.0, -7.7],
      [8.6, -9.6], [11.2, -12.2], [13.5, -14.5], [24, -16], [24, -30], [-24, -30],
    ],
  ],
  medium: [
    // The far bank on the right, below its road and down to the fields.
    [
      [13.0, 8.9], [13.8, 8.2], [14.6, 7.4], [15.4, 6.8], [16.3, 6.4], [17.3, 6.1], [24, 5.9], [24, -3.6], [15.6, -3.5],
      [13.5, -1.4], [13.4, 0.3], [14.0, 1.0], [15.2, 1.9], [15.3, 3.2], [15.1, 4.6], [14.6, 6.2], [13.9, 7.5],
    ],
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
  cliff: {
    kind: 'shelf', height: 4.0, edge: 0.4, wobble: 0.25,
    poly: [[6.2, 12.9], [7.6, 13.2], [8.7, 13.0], [9.5, 13.6], [10.0, 15.0], [10.4, 15.4], [11.6, 15.4], [12.1, 14.9], [12.6, 13.9], [13.4, 13.2], [14.6, 13.8], [15.2, 27], [5.8, 27]],
  },
  rightLedge: {
    kind: 'shelf', height: 0.8, edge: 1.0, wobble: 0.7,
    poly: [[13.3, -0.9], [13.8, 0.6], [15.1, 1.5], [15.3, 3.0], [15.1, 4.6], [14.7, 6.0], [24, 6.0], [24, -3.2], [15.6, -3.4]],
  },
  front: { kind: 'ramp', along: 'b', from: -9.5, to: -14, h0: 0, h1: 0.5, within: [-24, 24] },
};

/** Boulders in clusters: [u, b, spread, how many]. The banks also get a scatter along the water's edge. */
export const ROCKS = [
  // Outcrops along the edge of the painted forest at the back, and in the woods on the left.
  [-6.3, 11.1, 0.9, 4], [-11.6, 9.2, 1.2, 5], [-9.5, 9.9, 0.6, 3], [1.6, 11.1, 0.9, 4], [-13.1, -6.6, 0.7, 4],
  // Along the river.
  [-10.5, -9.2, 0.9, 4], [-6.4, -7.8, 0.5, 3], [-5.3, -7.7, 0.4, 2], [-2.3, -7.4, 0.5, 3], [-0.3, -7.5, 0.4, 2],
  [3.5, -5.9, 0.6, 4], [10.0, -0.9, 0.4, 3], [9.4, 9.2, 0.5, 3], [11.7, 6.4, 0.5, 3], [12.6, 3.2, 0.5, 3],
  [15.7, 2.4, 0.6, 4], [15.2, 5.6, 0.5, 3],
  // Big boulders among the trees at the front.
  [3.8, -11.0, 0.7, 3],
];

/**
 * The trees and bushes the reference design draws round the farm, each where it stands there (u = (x − 806) / 55,
 * b = (502 − y) / 32.98 from its foot in the reference's pixels), moved where the painting's roads or river, or the
 * farm's flower beds, are not where the reference has them: [kind, u, b, height, seed] (kinds in plants/valley.js).
 */
export const TREES = [
  // Between the buildings along the back of the ring road and the painted forest: round trees and a pine, and a bush at
  // a round tree's foot behind the hen yard.
  ['round', -3.67, 7.73, 2.4, 2], ['pine', -2.42, 8.1, 2.2, 3], ['round', -1.29, 8.7, 2.0, 3], ['bush', -1.96, 8.82, 0.35, 1],
  ['round', 4.56, 8.64, 2.3, 4],
  // A pine by the windmill, between its road and the riverside road.
  ['pine', 9.3, 3.6, 2.3, 4],
  // Fruit trees inside the ring road, apples and oranges by turns, clear of the farm's flower beds.
  ['apple', -3.25, 1.39, 1.7, 3], ['orange', -4.74, -0.91, 1.4, 4], ['apple', -3.07, -2.59, 1.6, 1],
  ['orange', -2.01, -3.5, 1.6, 2], ['apple', 3.69, 1.7, 1.6, 2], ['orange', 4.69, -0.96, 1.7, 5],
  // The pink blossom tree beside the farmhouse, on its pad above the road.
  ['blossom', -8.4, 3.3, 1.9, 1],
  // Round the meadow: a round tree in the woods beyond it on the left, one inside its fence by its right side (the
  // herd keeps clear of it), and pines and two birches together between its road and the river.
  ['round', -13.33, 2.73, 2.5, 1], ['round', -9.51, -1.76, 1.65, 5],
  ['pine', -13.3, -8.2, 3.0, 6], ['pine', -11.04, -8.7, 1.39, 1], ['birch', -10.0, -8.67, 2.4, 1], ['birch', -9.47, -8.58, 2.2, 2],
  // A pine in front of the well, on its right.
  ['pine', -5.47, -5.85, 1.75, 5],
  // By the fields over the big bridge: two slim trees with a bush at their foot, by the river at the fields' back left
  // corner; and a birch up on the ledge over the small fall, on its grass back from the edge (where the reference has
  // it, past the fields' back right corner, the painting has the cliff's foot by the fall's pool).
  ['slim', 10.27, -4.49, 2.3, 1], ['slim', 10.67, -4.18, 1.85, 2], ['bush', 10.25, -4.28, 0.4, 2], ['birch', 15.0, -1.4, 2.5, 3],
  // The fir on the upper riverbank, between the riverside road and the water.
  ['fir', 11.2, 2.4, 1.6, 1],
];

/**
 * The flowers and crops the reference design draws round the farm, each where it stands there (as TREES), moved to fit
 * the painting: [kind, u, b, height, seed, more] (kinds in plants/valley.js), `more` giving the way a row runs (`turn`,
 * its rotation.y in the world, as dev/plants.html turns it) and how long it is (`length`).
 */
export const FLOWERS = [
  // Sunflowers round the fields over the big bridge, as far from the painting's fence as the reference draws them from
  // its own (the reference's fields lie a little off the painted pad): a cluster outside the front right side, round
  // the front corner, two more along that side, two behind the back fence by the right corner and a small one behind
  // it by the slim trees.
  ['sunflower', 12.14, -10.83, 1.05, 3], ['sunflower', 12.73, -10.68, 1.4, 4], ['sunflower', 13.29, -10.77, 1.65, 1],
  ['sunflower', 13.93, -10.0, 1.7, 5], ['sunflower', 13.75, -10.73, 1.45, 6], ['sunflower', 14.3, -10.45, 1.5, 7],
  ['sunflower', 14.4, -8.82, 1.3, 8], ['sunflower', 15.1, -7.9, 1.2, 10],
  ['sunflower', 14.63, -5.37, 1.1, 2], ['sunflower', 15.34, -6.07, 1.0, 9],
  ['sunflower', 11.15, -3.78, 0.8, 11],
  // A row of tomatoes on the grass behind the plots, along the ring road there, the pig rooting in front of it.
  ['tomatoes', 0.4, 4.12, 0.65, 1, { length: 2, turn: Math.atan2(0.45, 0.89) }],
];

/**
 * The woods of 3D trees (plants/woods.js), where the painting left grass the reference fills with trees. Each is an
 * area, how far apart its trees stand, how often each kind grows there and the range of their heights. `water`: how
 * far from the river its tall trees begin; nearer, they stand lower, so the river and its banks still show over them.
 * `shore`: how far from the river its nearest trees stand (0.6 if not given); `shade`: how light or dark its trees
 * are, from a little darker to a little lighter than their models if not given; `bushes`: how many bushes grow under
 * them, for each square unit; `fields`: how far from the fields' fence they keep (0.8 if not given).
 */
export const WOODS = [
  // Behind the farm, up to the painted trees' feet: left of the farmhouse above the meadow, and behind the buildings
  // along the back of the ring road, as far as the road up to the small bridge. Where the painted forest stands back
  // (between u -9 and -5, and between 0 and 6), the woods reach back to it. Mostly pines, as the reference draws them,
  // with firs, slim trees, birches and round trees among them.
  {
    poly: [
      [-19, 1.9], [-14.5, 1.9], [-10.8, 2.7], [-10.6, 4.2], [-10.4, 5.4], [-9.6, 6.6], [-7.0, 7.0], [-4.5, 7.3],
      [-2.5, 7.6], [-1.2, 8.5], [2.0, 8.5], [3.3, 7.9], [5.5, 7.6], [6.6, 8.2], [6.9, 9.6], [6.2, 11.6], [5.6, 11.9],
      [4.6, 12.6], [3.4, 12.6], [2.2, 12.2], [1.2, 12.0], [0.2, 12.1], [-1.0, 11.4], [-1.8, 10.8], [-3.0, 10.8],
      [-4.0, 11.6], [-4.8, 12.5], [-5.8, 13.6], [-7.0, 14.2], [-8.0, 13.6], [-8.6, 12.0], [-8.9, 10.6], [-10.0, 9.1],
      [-12.0, 8.7], [-13.5, 8.4], [-15.0, 8.1], [-15.8, 6.9], [-16.6, 6.4], [-19, 6.2],
    ],
    spacing: 1.1, height: [1.4, 2.9], bushes: 0.12,
    kinds: { pine: 0.3, fir: 0.17, slim: 0.15, birch: 0.1, roundGreen: 0.18, round: 0.1 },
  },
  // The front, past the river: mostly big pines, some round trees among them, deeper green than elsewhere, as the
  // reference draws them, the first of them small and a way back from the water, leaving its bank open.
  {
    poly: FOREST.dense[1], spacing: 1.35, kinds: { pine: 0.55, roundGreen: 0.25, fir: 0.1, slim: 0.1 }, height: [2.4, 3.6],
    water: 4.5, shore: 1.5, shade: [0.78, 0.95],
  },
  // The far bank on the right, down to the fields.
  {
    poly: FOREST.medium[0], spacing: 1.3, height: [1.5, 2.7], bushes: 0.1,
    kinds: { pine: 0.3, round: 0.25, birch: 0.15, slim: 0.15, fir: 0.15 },
  },
  // Right of the fields, below the ledge over the small fall, down to the front woods on both sides of the road, clear
  // of a strip along the fields' right sides for the sunflowers.
  {
    poly: [[13.0, -2.6], [15.6, -3.5], [24, -3.6], [24, -16], [13.5, -14.5], [11.2, -12.2]],
    spacing: 1.35, height: [1.6, 3.0], bushes: 0.1, fields: 1.8,
    kinds: { pine: 0.3, round: 0.2, roundGreen: 0.15, birch: 0.12, slim: 0.1, fir: 0.13 },
  },
  // Between the meadow road and the river on the left, open, with birches by the water.
  {
    poly: FOREST.medium[1], spacing: 1.7, height: [1.5, 2.6], water: 2.5, bushes: 0.1,
    kinds: { pine: 0.3, round: 0.25, birch: 0.3, slim: 0.15 },
  },
  // Along the left edge, past the meadow.
  {
    poly: FOREST.medium[2], spacing: 1.3, height: [1.6, 2.8], bushes: 0.06,
    kinds: { pine: 0.35, round: 0.25, roundGreen: 0.15, birch: 0.1, fir: 0.15 },
  },
];
