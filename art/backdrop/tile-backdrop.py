# Cuts an upscaled painting into the tiles the game loads (see `tiles` in BACKDROP, src/three/backdrop.js): 2x2 at
# full size for the sharp picture, and one at half size for the fast one. A tile overlaps its neighbours by GUTTER
# pixels of the full size, so the water's ripples and the blurrier mipmaps reach across a seam.
#
#   python3 tile-backdrop.py painted-vN-x4.png ../../public/backdrop
import sys
from pathlib import Path

from PIL import Image

GRID = 2
GUTTER = 32  # as `gutter` in BACKDROP
QUALITY = 88
MAX_SIZE = 4096  # the largest texture some phones load


def main(painting, out_dir):
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    im = Image.open(painting).convert('RGB')
    w, h = im.size
    for col in range(GRID):
        for row in range(GRID):
            x0, x1 = max(0, col * w // GRID - GUTTER), min(w, (col + 1) * w // GRID + GUTTER)
            y0, y1 = max(0, row * h // GRID - GUTTER), min(h, (row + 1) * h // GRID + GUTTER)
            assert max(x1 - x0, y1 - y0) <= MAX_SIZE, 'tile too big for some phones'
            tile = im.crop((x0, y0, x1, y1))
            tile.save(out / f'high-{col}{row}.webp', quality=QUALITY, method=6)
            print(f'high-{col}{row}.webp', tile.size)
    low = im.resize((w // 2, h // 2), Image.LANCZOS)
    assert max(low.size) <= MAX_SIZE, 'half size too big for some phones'
    low.save(out / 'low.webp', quality=QUALITY, method=6)
    print('low.webp', low.size)
    print('BACKDROP width, height:', w, h)


if __name__ == '__main__':
    main(*sys.argv[1:])
