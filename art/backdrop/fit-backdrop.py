# Finds where a painting sits in the game: BACKDROP's cx, cy, scale and scaleY in src/three/backdrop.js.
# It scales and shifts 1-layout.png's dirt roads until they lie on the painting's, leaving out boxes where the
# painting is known to differ from the layout, and draws the layout's outlines over the painting to check by eye.
#
#   python3 fit-backdrop.py painted-v1.webp overlay.png [x0,y0,x1,y1 ...]
#   (boxes in the layout's pixels; default: the upper right, where painted-v1 moved the waterfall)
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

HERE = Path(__file__).parent
S = 0.559  # sine of the camera's tilt, as in backdrop.js


def layout_projection(marks):
    """The layout's own cx, cy and pixels per unit, from its marks: px = cx + u k, py = cy - b S k."""
    pts = np.array([[m[1], m[2], m[3], m[4]] for m in marks['marks']], float)
    px, py, u, b = pts.T
    a = np.stack([np.ones_like(u), np.zeros_like(u), u], -1)
    c = np.stack([np.zeros_like(b), np.ones_like(b), -b * S], -1)
    (cx, cy, k), *_ = np.linalg.lstsq(np.concatenate([a, c]), np.concatenate([px, py]), rcond=None)
    return cx, cy, k


def painted_roads(rgb):
    r, g, b = (rgb[..., i].astype(float) for i in range(3))
    return (r > 200) & (g > 130) & (g < 200) & (b < 140) & (r - b > 90) & (r - g > 25)


def main(painting, overlay, *boxes):
    marks = json.loads((HERE / 'layout-marks.json').read_text())
    cx, cy, k = layout_projection(marks)
    w, h = marks['size']
    src = Image.open(painting).convert('RGB')
    factor = src.width / w  # an upscaled painting is fitted at the layout's size, then scaled back up
    rgb = np.array(src.resize((w, h), Image.LANCZOS))

    layout = np.array(Image.open(HERE / '1-layout.png').convert('RGB')).astype(float)
    roads = np.abs(layout - [232, 182, 95]).sum(-1) < 40
    yy, xx = np.mgrid[0:h, 0:w]
    trust = np.ones((h, w), bool)
    for bx in boxes or ['950,0,1536,560']:
        x0, y0, x1, y1 = map(float, bx.split(','))
        trust &= ~((xx >= x0) & (xx < x1) & (yy >= y0) & (yy < y1))
    ys, xs = np.nonzero(roads & trust)
    pick = np.random.default_rng(0).choice(len(xs), min(6000, len(xs)), replace=False)
    ys, xs = ys[pick].astype(float), xs[pick].astype(float)
    far = ndimage.distance_transform_edt(~painted_roads(rgb))

    def miss(sx, sy, dx, dy):
        X = cx + (xs - cx) * sx + dx
        Y = cy + (ys - cy) * sy + dy
        ok = (X >= 0) & (X < w) & (Y >= 0) & (Y < h)
        d = np.full(len(X), 60.0)
        d[ok] = np.minimum(far[Y[ok].astype(int), X[ok].astype(int)], 60)
        return d.mean()

    # Coarse to fine.
    best = (miss(1, 1, 0, 0), 1.0, 1.0, 0.0, 0.0)
    for step_s, step_d, reach in [(0.02, 4, 4), (0.005, 1, 4), (0.002, 0.5, 3)]:
        _, sx0, sy0, dx0, dy0 = best
        if step_s == 0.02:
            grid_s, grid_d = np.arange(0.9, 1.12, step_s), np.arange(-60, 61, step_d)
            cands = [(sx, sy, dx, dy) for sx in grid_s for sy in grid_s for dx in grid_d for dy in grid_d]
        else:
            r = np.arange(-reach, reach + 1)
            cands = [(sx0 + i * step_s, sy0 + j * step_s, dx0 + m * step_d, dy0 + n * step_d) for i in r for j in r for m in r for n in r]
        for c in cands:
            e = miss(*c)
            if e < best[0]:
                best = (e, *c)
    e, sx, sy, dx, dy = best

    out = {
        'cx': round((cx + dx) * factor, 1),
        'cy': round((cy + dy) * factor, 1),
        'scale': round(k * sx * factor, 3),
        'scaleY': round(k * sy * factor, 3),
    }
    print(f'mean distance from layout roads to painted roads: {e:.2f} px (at the layout\'s size)')
    print('BACKDROP:', json.dumps({'width': src.width, 'height': src.height, **out}))

    # The layout's outlines over the painting: roads magenta, river blue, pads yellow, falls red.
    T = lambda p: (cx + (p[0] - cx) * sx + dx, cy + (p[1] - cy) * sy + dy)
    o = Image.fromarray(rgb)
    d = ImageDraw.Draw(o)
    for _, pts in marks['roads']:
        d.line([T(p) for p in pts], fill=(255, 0, 255), width=2)
    d.line([T(p) for p in marks['ringMid'] + marks['ringMid'][:1]], fill=(255, 0, 255), width=2)
    d.line([T(p) for p in marks['river'] + marks['river'][:1]], fill=(0, 0, 255), width=2)
    for _, x, y, rx, ry in marks['pads']:
        px, py = T((x, y))
        d.ellipse([px - rx * sx, py - ry * sy, px + rx * sx, py + ry * sy], outline=(255, 255, 0), width=2)
    d.polygon([T(p) for p in marks['meadow']], outline=(255, 255, 0), width=2)
    d.polygon([T(p) for p in marks['fields']], outline=(255, 255, 0), width=2)
    for _, foot, top, fw in marks['falls']:
        d.rectangle([T((foot[0] - fw / 2, top[1])), T((foot[0] + fw / 2, foot[1]))], outline=(255, 0, 0), width=2)
    o.save(overlay)


if __name__ == '__main__':
    main(*sys.argv[1:])
