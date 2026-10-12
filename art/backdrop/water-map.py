# Makes the maps the backdrop's water shader reads (see backdrop.js), from the painted backdrop:
#
#   water map (RGB, same frame as the painting):
#     R, G  0.5 + 0.5 * m * (cos, sin) of where the pixel is along the flow: the time water takes to get there from
#           the top of the waterfall, at a period of PERIOD pixels of calm river. m is how much of the pixel is water.
#     B     0.5 + 0.5 * across: -1 on one bank, 0 mid-stream, 1 on the other bank.
#   noise (RGB, 256 square, tiles): three smooth noises the shader streaks along the flow.
#
#   python3 water-map.py painted-v1.webp ../../public/backdrop-water.png ../../public/water-noise.png [debug.png]
import sys

import numpy as np
from PIL import Image
from scipy import ndimage
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import dijkstra

PERIOD = 512  # pixels of calm river per turn of the along-flow phase; the shader's noise repeats a whole number of times in it

# Where the water is fast and falls straight down, in painting pixels: [x0, y0, x1, y1].
MAIN_FALL = [1195, 0, 1266, 132]
SIDE_FALL = [1264, 494, 1298, 546]
FALL_SPEED = 5.0
# A pixel of each body of water to keep: the river, the main fall.
SEEDS = [(600, 720), (1230, 60)]


def water_mask(rgb):
    r, g, b = (rgb[..., i].astype(float) for i in range(3))
    blue = (b > 170) & (b - r > 50) & (b >= g - 12)
    foam = (r > 195) & (g > 215) & (b > 225) & (b >= r)
    water = ndimage.binary_closing(blue | foam, iterations=2)
    water = ndimage.binary_fill_holes(water)
    labels, _ = ndimage.label(water)
    keep = {labels[y, x] for x, y in SEEDS} - {0}
    return np.isin(labels, list(keep))


def box(shape, x0, y0, x1, y1):
    m = np.zeros(shape, bool)
    m[y0:y1, x0:x1] = True
    return m


def travel_time(water, slowness, sources):
    """Shortest time from `sources` to each water pixel, stepping between neighbours (8 ways)."""
    h, w = water.shape
    idx = -np.ones((h, w), int)
    ys, xs = np.nonzero(water)
    idx[ys, xs] = np.arange(len(ys))
    rows, cols, cost = [], [], []
    for dy, dx in [(0, 1), (1, 0), (1, 1), (1, -1)]:
        y2, x2 = ys + dy, xs + dx
        ok = (y2 < h) & (x2 >= 0) & (x2 < w)
        ok[ok] &= water[y2[ok], x2[ok]]
        a = idx[ys[ok], xs[ok]]
        b = idx[y2[ok], x2[ok]]
        step = np.hypot(dy, dx)
        rows.append(a)
        cols.append(b)
        cost.append(step * 0.5 * (slowness[ys[ok], xs[ok]] + slowness[y2[ok], x2[ok]]))
    n = len(ys)
    graph = coo_matrix((np.concatenate(cost), (np.concatenate(rows), np.concatenate(cols))), shape=(n, n)).tocsr()
    src = idx[sources & water]
    t = dijkstra(graph, directed=False, indices=src, min_only=True)
    out = np.full(water.shape, np.nan)
    out[ys, xs] = t
    return out


def tile_noise(size, freq, seed):
    """Smooth noise that tiles, with features about size / freq across."""
    rng = np.random.default_rng(seed)
    f = np.fft.fft2(rng.standard_normal((size, size)))
    k = np.hypot(*np.meshgrid(np.fft.fftfreq(size) * size, np.fft.fftfreq(size) * size))
    n = np.real(np.fft.ifft2(f * np.exp(-((k / freq) ** 2))))
    n = (n - n.mean()) / n.std()
    return np.clip(0.5 + n * 0.18, 0, 1)


def main(painting, out_water, out_noise, debug=None):
    rgb = np.array(Image.open(painting).convert('RGB'))
    h, w = rgb.shape[:2]
    water = water_mask(rgb)

    # Distance to the nearest bank, and the river's half width round about.
    dist, near = ndimage.distance_transform_edt(water, return_indices=True)
    half = ndimage.grey_dilation(dist, size=41)
    half = np.maximum(ndimage.uniform_filter(half, 31), 2)

    # Faster where the river narrows and down the falls.
    ref = np.median(half[water])
    speed = np.clip((ref / half) ** 0.6, 0.6, 1.8)
    falls = box(water.shape, *MAIN_FALL) | box(water.shape, *SIDE_FALL)
    speed[falls & water] = FALL_SPEED
    # Ease from the river's pace to the falls' over a few pixels, or the streaks show the boxes' edges.
    slowness = ndimage.gaussian_filter(1 / speed, 6)

    # The river from the top of the main fall. The small fall is where the river itself steps down a ledge.
    top = box(water.shape, MAIN_FALL[0], 0, MAIN_FALL[2], 3)
    s = travel_time(water, slowness, top)
    # Any water the walk could not reach takes the time of the nearest water it did.
    lost = water & ~np.isfinite(s)
    _, src = ndimage.distance_transform_edt(lost | ~water, return_indices=True)
    s[lost] = s[src[0][lost], src[1][lost]]
    s = np.where(water, s, 0)

    # Smooth the steps of the 8-way walk out of the times, inside the water only.
    wf = water.astype(float)
    s_smooth = ndimage.gaussian_filter(s * wf, 2) / np.maximum(ndimage.gaussian_filter(wf, 2), 1e-6)
    s = np.where(water, s_smooth, 0)

    # Across the flow: which bank is nearer, by the side of the flow it lies on.
    gy, gx = np.gradient(ndimage.gaussian_filter(s, 3))
    # Down the falls the flow is straight down the picture (at the top of the main one the times barely change).
    gx[falls], gy[falls] = 0, 1
    by, bx = near[0] - np.arange(h)[:, None], near[1] - np.arange(w)[None, :]
    side_sign = np.sign(gx * by - gy * bx)
    across = side_sign * np.clip(1 - dist / half, 0, 1)

    m = np.clip(ndimage.gaussian_filter(wf, 0.8), 0, 1)
    theta = 2 * np.pi * s / PERIOD
    out = np.stack([0.5 + 0.5 * m * np.cos(theta), 0.5 + 0.5 * m * np.sin(theta), np.where(water, 0.5 + 0.5 * across, 0.5)], -1)
    Image.fromarray(np.round(out * 255).astype(np.uint8)).save(out_water)

    noise = np.stack([tile_noise(256, 9, 1), tile_noise(256, 30, 2), tile_noise(256, 14, 3)], -1)
    Image.fromarray(np.round(noise * 255).astype(np.uint8)).save(out_noise)

    if debug:
        # The phase as bands of colour over the painting, the banks from across.
        band = (s / 40) % 1
        vis = rgb.astype(float) * 0.45
        hue = np.stack([band, 1 - band, 0.5 + 0.5 * across], -1) * 255
        vis[water] = hue[water]
        Image.fromarray(vis.astype(np.uint8)).save(debug)
    print('water pixels', int(water.sum()), 'longest time', round(float(s.max())), 'half width median', round(float(ref), 1))


if __name__ == '__main__':
    main(*sys.argv[1:])
