# Draws src/three/valleyMap.js over a painting, where the game puts it (BACKDROP in src/three/backdrop.js), with a
# grid of map units, to check by eye that the map follows the painting: the river's banks blue, roads magenta,
# bridges orange, falls red, forest edges green (dense dark, open light), the cliff and the ledge orange and yellow,
# rocky banks grey, boulder clusters white, places yellow.
#
#   python3 map-overlay.py painted-v1-fixed.webp overlay.png [x0,y0,x1,y1]
#   (the box in the painting's own pixels; the whole painting by default)
import json
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
S = 0.559  # sine of the camera's tilt, as in backdrop.js


def load(module, expr):
    js = f"import('{ROOT / module}').then((m) => console.log(JSON.stringify({expr})))"
    return json.loads(subprocess.check_output(['node', '-e', js], cwd=ROOT))


def main(painting, out, box=None):
    m = load('src/three/valleyMap.js', 'm')
    bd = load('src/three/backdrop.js', '{ ...m.BACKDROP, tiles: undefined }')
    im = Image.open(painting).convert('RGB')
    k = im.width / bd['width']  # the painting may be the upscaled one or not
    x0, y0, x1, y1 = map(float, box.split(',')) if box else (0, 0, im.width, im.height)
    zoom = max(1, round(1000 / (x1 - x0)))
    im = im.crop((int(x0), int(y0), int(x1), int(y1))).resize((int((x1 - x0) * zoom), int((y1 - y0) * zoom)), Image.LANCZOS)
    d = ImageDraw.Draw(im, 'RGBA')
    font = ImageFont.load_default(size=12)

    def P(u, b):
        return ((bd['cx'] + bd['scale'] * u) * k - x0) * zoom, ((bd['cy'] - S * bd['scaleY'] * b) * k - y0) * zoom

    def ellipse(u, b, r, **kw):
        x, y = P(u, b)
        rx, ry = r * bd['scale'] * k * zoom, r * S * bd['scaleY'] * k * zoom
        d.ellipse([x - rx, y - ry, x + rx, y + ry], **kw)

    u_lo, u_hi = int(np.floor((x0 / k - bd['cx']) / bd['scale'])), int(np.ceil((x1 / k - bd['cx']) / bd['scale']))
    b_lo, b_hi = int(np.floor((bd['cy'] - y1 / k) / (S * bd['scaleY']))), int(np.ceil((bd['cy'] - y0 / k) / (S * bd['scaleY'])))
    for u in range(u_lo, u_hi + 1):
        d.line([P(u, b_lo), P(u, b_hi)], fill=(255, 255, 255, 120))
    for b in range(b_lo, b_hi + 1):
        d.line([P(u_lo, b), P(u_hi, b)], fill=(255, 255, 255, 120))
    for u in range(u_lo, u_hi + 1, 2):
        for b in range(b_lo, b_hi + 1, 2):
            d.text(P(u + 0.05, b - 0.05), f'{u},{b}', fill=(255, 255, 255), font=font)

    river = np.array(m['RIVER'], float)
    tangent = np.gradient(river[:, :2], axis=0)
    tangent /= np.linalg.norm(tangent, axis=1, keepdims=True)
    normal = np.stack([-tangent[:, 1], tangent[:, 0]], 1)
    for side in (1, -1):
        d.line([P(*p) for p in river[:, :2] + side * normal * river[:, 2:3]], fill=(0, 0, 255), width=2)
    d.line([P(*p) for p in river[:, :2]], fill=(0, 0, 160), width=1)
    for poly in m['FOREST']['dense']:
        d.polygon([P(*p) for p in poly], outline=(0, 110, 0))
    for poly in m['FOREST']['medium']:
        d.polygon([P(*p) for p in poly], outline=(140, 220, 0))
    d.polygon([P(*p) for p in m['LAND']['cliff']['poly']], outline=(255, 110, 0))
    d.polygon([P(*p) for p in m['LAND']['rightLedge']['poly']], outline=(255, 210, 0))
    d.polygon([P(*p) for p in m['MEADOW']], outline=(255, 255, 0))
    for u, b, r in m['ROCKY_BANKS']:
        ellipse(u, b, r, outline=(150, 150, 150))
    for u, b, r, _ in m['ROCKS']:
        ellipse(u, b, r, outline=(255, 255, 255), width=2)
    for name, road in m['ROADS'].items():
        d.line([P(*p) for p in road], fill=(255, 0, 255), width=3)
        d.text(P(*road[-1]), name, fill=(255, 0, 255), font=font)
    for bridge in m['BRIDGES'].values():
        d.line([P(*p) for p in bridge['ends']], fill=(255, 130, 0), width=5)
    for fall in m['WATERFALLS'].values():
        ellipse(*fall['at'], 0.15, outline=(255, 0, 0), width=3)
    for name, place in m['PLACES'].items():
        for at in [place['at']] if isinstance(place, dict) else place:
            x, y = P(*at)
            d.rectangle([x - 4, y - 4, x + 4, y + 4], fill=(255, 255, 0))
            d.text((x + 6, y - 6), name, fill=(255, 255, 0), font=font)
    im.save(out)


if __name__ == '__main__':
    main(*sys.argv[1:])
