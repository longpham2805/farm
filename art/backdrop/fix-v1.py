# Mends two faults the image model copied from the layout into painted-v1, before it is upscaled:
#   - the meadow is a see-through pale rectangle with hard edges: its grass gets the colour of the grass round it
#     and its fine detail back, and its rim is blended away (the meadow's 3D fence stands on that line);
#   - a white square (the layout's marker) sits on the small fall: the river's surface comes in from the right over
#     its top and the fall's own water, moved up, fills the rest, so the fall starts a little higher;
#   - above the small fall a narrow bar of sand, with a thin arm of water caught behind it, lies along the river's
#     bank, so that water and land looked muddled there and the river seemed to reach the fall round it: the bar and
#     the arm become the river, which now runs straight down to the grass and over the fall;
#   - a patch of yellow-green, like grass, lies on the small fall's lip, in the water rolling over it: it becomes
#     that water, from the crest above it down to the falling curtain below;
#   - the small fall's curtain was narrow, a darker strip down its left side made it look like two streams, and a
#     dark gap showed between it and the rocks on its right: the curtain is drawn again, stretched out to the rocks on
#     its right and out over the pool on its left (CURTAIN, as the user outlined it), as one stream from its lip to
#     its foot, its left side running down and to the left from its top corner as the water pours that way; the
#     painted crest's corner that stuck out left of that becomes the bank beside it.
# The places are painted-v1's own; another painting needs its own fixes.
#
#   python3 fix-v1.py painted-v1.webp painted-v1-fixed.webp
import sys

import numpy as np
from PIL import Image
from scipy import ndimage


def mend_meadow(rgb):
    r, g, b = (rgb[..., i] for i in range(3))
    yy, xx = np.mgrid[0:rgb.shape[0], 0:rgb.shape[1]]
    pale = (g > 215) & (r > 185) & (r < 228) & (b > 45) & (b < 90) & (g - r > 12)
    pale = ndimage.median_filter(pale.astype(np.uint8), 5).astype(bool)
    pale &= (xx > 120) & (xx < 470) & (yy > 440) & (yy < 660)
    labels, n = ndimage.label(pale)
    sizes = ndimage.sum(pale, labels, range(1, n + 1))
    m = ndimage.binary_fill_holes(labels == 1 + np.argmax(sizes))
    m = ndimage.binary_dilation(ndimage.binary_closing(m, iterations=3), iterations=2)

    # The colour of the grass round about, spread smoothly in from outside (wider spreads reach the middle).
    keep = ~ndimage.binary_dilation(m, iterations=3)

    def spread(sigma):
        w = ndimage.gaussian_filter(keep.astype(float), sigma)
        f = np.stack([ndimage.gaussian_filter(rgb[..., c] * keep, sigma) for c in range(3)], -1)
        return f / np.maximum(w, 1e-6)[..., None], np.clip(w / 0.15, 0, 1)[..., None]

    (f1, a1), (f2, a2), (f3, _) = spread(14), spread(40), spread(90)
    around = f1 * a1 + (1 - a1) * (f2 * a2 + (1 - a2) * f3)

    # The meadow's own detail, brought up to the fine detail of the grass outside it, and none at the rim.
    mean_in = ndimage.gaussian_filter(rgb * m[..., None], (6, 6, 0)) / np.maximum(ndimage.gaussian_filter(m.astype(float), 6), 1e-6)[..., None]
    detail = rgb - mean_in
    fine = rgb - ndimage.gaussian_filter(rgb, (6, 6, 0))
    ring = ndimage.binary_dilation(m, iterations=10) & keep
    core = ndimage.binary_erosion(m, iterations=5)
    gain = np.minimum(fine[ring].std(0) / np.maximum(fine[core].std(0), 1e-3), 3.0)
    fade = np.clip(ndimage.distance_transform_edt(m) / 6, 0, 1)[..., None]
    mended = around + detail * gain * fade

    a = np.clip(ndimage.gaussian_filter(ndimage.binary_dilation(m, iterations=2).astype(float), 2.0) * 2.0 - 0.5, 0, 1)
    return rgb * (1 - a[..., None]) + mended * a[..., None]


def mend_square(rgb):
    x0, x1, y0, y1 = 1261, 1292, 494, 519  # the square and a pixel or two round it
    top = 505  # where the river's surface gives way to the falling water
    fill = rgb.copy()
    fill[y0:top, x0:x1] = rgb[y0:top, x0 + 32:x1 + 32]
    fill[top:y1, x0:x1] = rgb[top + 14:y1 + 14, x0:x1]
    for i, y in enumerate(range(top - 2, top + 2)):
        t = (i + 0.5) / 4
        fill[y, x0:x1] = rgb[y, x0 + 32:x1 + 32] * (1 - t) + rgb[y + 14, x0:x1] * t
    # Round the top left corner off into the bank: the grass beside it carries on there.
    for y in range(y0, top):
        edge = x0 + int(round((top - y) * 0.9))
        fill[y, x0:edge] = rgb[y, x0 - 9:edge - 9]
    # Ease the moved fall into the original one at the bottom.
    for i, y in enumerate(range(y1 - 4, y1)):
        t = (i + 1) / 5
        fill[y, x0:x1] = fill[y, x0:x1] * (1 - t) + rgb[y, x0:x1] * t
    square = np.zeros(rgb.shape[:2], bool)
    square[495:519, 1262:1291] = True
    a = np.clip(ndimage.gaussian_filter(square.astype(float), 1.2) * 2.2 - 0.4, 0, 1)
    return rgb * (1 - a[..., None]) + fill * a[..., None]


def mend_bar(rgb):
    from PIL import ImageDraw

    # The bar and the arm behind it, a pixel or two into the river above them; the grass bank below stays.
    outline = [(1340, 485), (1346, 482), (1360, 477), (1375, 471), (1390, 466), (1400, 464), (1412, 462), (1425, 462),
               (1436, 464), (1441, 468), (1436, 472), (1430, 476), (1415, 480), (1400, 484), (1380, 487), (1360, 490),
               (1343, 493), (1338, 491)]
    m = Image.new('L', (rgb.shape[1], rgb.shape[0]), 0)
    ImageDraw.Draw(m).polygon(outline, fill=255)
    m = np.array(m) > 0
    ys, xs = np.nonzero(m)
    # The river's water from up and to the right of the left end, and up and to the left of the right end, where it
    # is clear of the rocks on either bank, eased from one to the other along the bar.
    t = np.clip((xs - 1375) / 20, 0, 1)[:, None]
    t = t * t * (3 - 2 * t)
    fill = rgb.copy()
    fill[ys, xs] = rgb[ys - 30, xs + 20] * (1 - t) + rgb[ys - 18, xs - 45] * t
    a = np.clip(ndimage.gaussian_filter(m.astype(float), 1.0) * 2.0 - 0.5, 0, 1)[..., None]
    return rgb * (1 - a) + fill * a


def mend_lip(rgb):
    from PIL import ImageDraw

    outline = [(1275, 502.5), (1283, 500.5), (1292, 500.5), (1292, 507.5), (1285, 508), (1275, 505.5)]
    m = Image.new('L', (rgb.shape[1], rgb.shape[0]), 0)
    ImageDraw.Draw(m).polygon(outline, fill=255)
    m = np.array(m) > 0
    ys, xs = np.nonzero(m)
    # Each pixel blends the crest's colour, just above it, into the curtain's, just below it.
    top, bottom = 499, 509
    t = np.clip((ys - top) / (bottom - top), 0, 1)[:, None]
    fill = rgb.copy()
    fill[ys, xs] = rgb[top, xs] * (1 - t) + rgb[bottom, xs] * t
    a = np.clip(ndimage.gaussian_filter(m.astype(float), 0.8) * 2.0 - 0.4, 0, 1)[..., None]
    return rgb * (1 - a) + fill * a


# The small fall's curtain, from its top corner down its lip on the right to its foot, [(x, y) round it]; its left
# side runs down and to the left. water-map.py's SIDE_FALL is the same.
CURTAIN = [(1270.2, 496.3), (1294, 510.9), (1294.4, 513.1), (1287.5, 543.4), (1283.2, 545.7), (1259.4, 540.1),
           (1255.5, 536.7), (1255.5, 531.1), (1258.3, 524.4), (1261.5, 516.5), (1263, 510.9), (1266.9, 499.7)]
# Left of it, where the painted crest's corner stuck out over the bank.
BULGE = [(1259, 493), (1271, 493), (1270.2, 496.3), (1266.9, 499.7), (1263, 510.9), (1261.5, 516.5), (1259, 516.5)]


def mend_curtain(rgb):
    from PIL import ImageDraw

    def inside(points):
        m = Image.new('L', (rgb.shape[1], rgb.shape[0]), 0)
        ImageDraw.Draw(m).polygon(points, fill=255)
        return np.array(m) > 0

    m = inside(CURTAIN)
    # The bank, and its line of foam, carried on a few pixels from the left over the crest's corner.
    bulge = inside(BULGE) & ~m
    ys, xs = np.nonzero(bulge)
    bank = rgb.copy()
    bank[ys, xs] = rgb[ys, xs - 6]
    a = np.clip(ndimage.gaussian_filter(bulge.astype(float), 0.8) * 2.0 - 0.5, 0, 1)[..., None]
    source = rgb
    rgb = rgb * (1 - a) + bank * a
    ys, xs = np.nonzero(m)
    # Each row of it is the painted curtain's row stretched across: from its clean part, inside the dark strip on
    # its left and the gap on its right. Near the top, where the row is only a few pixels between the corner and
    # the lip, it keeps its own pixels.
    x0, x1 = 1266.5, 1289.5
    fill = rgb.copy()
    for y in np.unique(ys):
        row = xs[ys == y]
        s0, s1 = max(x0, row.min()), min(x1, row.max())
        if s1 - s0 < 4:
            s0, s1 = row.min(), row.max()
        u = (row - row.min()) / max(row.max() - row.min(), 1)
        sx = s0 + u * (s1 - s0)
        i = np.floor(sx).astype(int)
        f = (sx - i)[:, None]
        fill[y, row] = source[y, i] * (1 - f) + source[y, i + 1] * f
    a = np.clip(ndimage.gaussian_filter(m.astype(float), 0.7) * 2.0 - 0.5, 0, 1)[..., None]
    return rgb * (1 - a) + fill * a


def main(painting, out):
    rgb = np.array(Image.open(painting).convert('RGB')).astype(float)
    rgb = mend_curtain(mend_lip(mend_bar(mend_square(mend_meadow(rgb)))))
    Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8)).save(out, quality=95, method=6)


if __name__ == '__main__':
    main(*sys.argv[1:])
