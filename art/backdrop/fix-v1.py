# Mends two faults the image model copied from the layout into painted-v1, before it is upscaled:
#   - the meadow is a see-through pale rectangle with hard edges: its grass gets the colour of the grass round it
#     and its fine detail back, and its rim is blended away (the meadow's 3D fence stands on that line);
#   - a white square (the layout's marker) sits on the small fall: the river's surface comes in from the right over
#     its top and the fall's own water, moved up, fills the rest, so the fall starts a little higher.
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


def main(painting, out):
    rgb = np.array(Image.open(painting).convert('RGB')).astype(float)
    rgb = mend_square(mend_meadow(rgb))
    Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8)).save(out, quality=95, method=6)


if __name__ == '__main__':
    main(*sys.argv[1:])
