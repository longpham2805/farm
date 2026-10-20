# Makes 1-layout.png from layout-v1.png, the layout where the painting had every tree, rock and flower in it.
# In 1-layout.png the painting keeps only the ground and the dense forest at the back and the sides: the open
# woodland and the forest at the front (past the river) become bare forest floor, and the boulders along the river
# and among the front trees are taken out. The game adds those trees, bushes, flowers and rocks in 3D.
#
#   python3 recolor-layout.py
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

HERE = Path(__file__).parent

# The colours layout-v1.png is drawn in. Its edges are smoothed, so a pixel there is a mix of two of them.
PALETTE = {
    'dense': '#2f7d33', 'grass': '#8fcf4a', 'medium': '#5ba83c', 'lawn': '#a3db58', 'river': '#37bde8',
    'riverEdge': '#b78955', 'road': '#e8b65f', 'meadow': '#b9de70', 'pad': '#e9d6a6', 'fields': '#d6b27a',
    'clifftop': '#3e8a35', 'cliff': '#8f897d', 'falls': '#e8f9ff', 'rock': '#a4a098',
}
FOREST_FLOOR = '#7d8c3c'
# The boulder clusters kept in the painting, by their index in layout-marks.json's rocks (ROCKS in valleyMap.js):
# the outcrops in the forest at the back.
KEEP_ROCKS = {0, 1, 2, 3}


def rgb(hex_):
    return np.array([int(hex_[i:i + 2], 16) for i in (1, 3, 5)], float)


def polygon_mask(size, points, grow=0):
    img = Image.new('L', size, 0)
    ImageDraw.Draw(img).polygon([tuple(p) for p in points], fill=1)
    m = np.array(img, bool)
    return ndimage.binary_dilation(m, iterations=grow) if grow else m


def recolor(px, labels, names, where, old, new):
    """Shifts `old` to `new` inside `where`, and the share of `old` in the smoothed pixels along its edge."""
    a, b_new = rgb(PALETTE[old]), rgb(new)
    k = names.index(old)
    is_old = (labels == k) & where
    near = ndimage.binary_dilation(is_old, iterations=2) & where
    # Each pixel near the edge mixes `old` with the nearest colour that is not `old`.
    dist, idx = ndimage.distance_transform_edt(labels == k, return_indices=True)
    other = np.where(labels == k, labels[idx[0], idx[1]], labels)
    pal = np.stack([rgb(PALETTE[n]) for n in names])
    b = pal[other]
    ab = a - b
    w = np.clip(((px - b) * ab).sum(-1) / np.maximum((ab * ab).sum(-1), 1), 0, 1)
    w = np.where((labels == k) & (dist > 3), 1.0, w)
    w = np.where(other == k, 1.0, w)
    px[near] += w[near, None] * (b_new - a)


def main():
    marks = json.loads((HERE / 'layout-marks.json').read_text())
    src = Image.open(HERE / 'layout-v1.png').convert('RGB')
    size = src.size
    px = np.array(src, float)
    names = list(PALETTE)
    pal = np.stack([rgb(PALETTE[n]) for n in names])
    dist2 = np.stack([((px - c) ** 2).sum(-1) for c in pal], axis=-1)
    labels = np.argmin(dist2, axis=-1)
    pure = dist2.min(-1) < 10 ** 2  # one colour, not a mix along an edge

    everywhere = np.ones(labels.shape, bool)
    recolor(px, labels, names, everywhere, 'medium', FOREST_FLOOR)
    front = polygon_mask(size, marks['dense'][1], grow=4)
    recolor(px, labels, names, front, 'dense', FOREST_FLOOR)

    # Take the boulders out: fill each from the land round it, then draw the river back over the ones on its banks.
    yy, xx = np.mgrid[0:size[1], 0:size[0]]
    zone = np.zeros(labels.shape, bool)
    for i, (x, y, spread, _) in enumerate(marks['rocks']):
        if i not in KEEP_ROCKS:
            zone |= (xx - x) ** 2 + (yy - y) ** 2 < (spread + 28) ** 2
    is_ = lambda *ns: np.isin(labels, [names.index(n) for n in ns])
    in_river = polygon_mask(size, marks['river'])
    # Not the waterfalls, nor the stream feeding the small one (water outside the river's banks).
    rock = ndimage.binary_dilation(is_('rock'), iterations=2) & zone & ~is_('falls') & ~(is_('river') & ~in_river)
    land = pure & ~rock & ~is_('river', 'riverEdge', 'rock', 'falls', 'cliff')
    _, idx = ndimage.distance_transform_edt(~land, return_indices=True)
    px[rock] = px[idx[0][rock], idx[1][rock]]

    edge = np.median(px[(labels == names.index('riverEdge'))], axis=0)
    s = 4  # drawn 4 times larger, then shrunk, for smooth edges
    layer = Image.new('RGBA', (size[0] * s, size[1] * s), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    pts = [(x * s, y * s) for x, y in marks['river']]
    draw.line(pts + [pts[0]], fill=tuple(int(c) for c in edge) + (255,), width=6 * s, joint='curve')
    draw.polygon(pts, fill=PALETTE['river'])
    for _, foot, top, width in marks['falls']:
        draw.rectangle([(foot[0] - width / 2) * s, top[1] * s, (foot[0] + width / 2) * s, foot[1] * s], fill=PALETTE['falls'])
    layer = np.array(layer.resize(size, Image.BOX), float)
    redraw = ndimage.binary_dilation(rock, iterations=3)
    alpha = layer[:, :, 3:] / 255 * redraw[:, :, None]
    px = px * (1 - alpha) + layer[:, :, :3] * alpha

    Image.fromarray(np.clip(px + 0.5, 0, 255).astype(np.uint8)).save(HERE / '1-layout.png')


if __name__ == '__main__':
    main()
