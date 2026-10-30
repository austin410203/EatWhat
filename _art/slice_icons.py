# Cut the 4x3 icon sheets (raw/01-03.png) into transparent 256px WebP in ../public/img/icons/.
# Background = near-white pixels connected to the sheet border (flood fill), so white parts
# inside an icon (rice, plates) stay opaque. Edges get a 1px feather.
import sys
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage

NAMES = {
  '01': ['taiwanese', 'bento', 'beefnoodle', 'dumpling', 'ramen', 'donburi', 'sushi', 'hotpot', 'bbq', 'korean', 'thai', 'vietnamese'],
  '02': ['indian', 'italian', 'burger', 'brunch', 'cafe', 'vegetarian', 'dessert', 'bar', 'stirfry', 'onigiri', 'rice', 'fortune'],
  '15': ['japanese', 'chinese', 'western', 'bakery', 'bubbletea', 'seafood', 'twbreakfast', 'noodles', 'friedchicken', 'shavedice', 'pizza', 'beer'],
  '03': ['dice', 'pin', 'ballot', 'cards', 'trophy', 'shield', 'heart', 'clock', 'coins', 'sneaker', 'popper', 'slot'],
}
OUT = Path(__file__).parent.parent / 'public' / 'img' / 'icons'
OUT.mkdir(parents=True, exist_ok=True)
SIZE = 256

def cut(sheet: str):
    im = np.asarray(Image.open(f'raw/{sheet}.png').convert('RGB')).astype(np.int16)
    H, W, _ = im.shape
    # near-white: all channels high and nearly grey
    near = (im.min(axis=2) > 236) & (im.max(axis=2) - im.min(axis=2) < 12)
    lab, _ = ndimage.label(near)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    bg = np.isin(lab, list(border))
    fg = ~bg
    fg = ndimage.binary_opening(fg, iterations=1)
    # alpha: solid foreground, soft 1px edge
    alpha = ndimage.gaussian_filter(fg.astype(np.float32), 0.8)
    alpha = np.clip((alpha - 0.15) / 0.7, 0, 1)
    rgba = np.dstack([im.astype(np.uint8), (alpha * 255).astype(np.uint8)])
    objs, n = ndimage.label(fg)
    sizes = ndimage.sum(fg, objs, range(1, n + 1))
    boxes = ndimage.find_objects(objs)
    cw, ch = W / 4, H / 3
    cells = {}
    for i, (sl, sz) in enumerate(zip(boxes, sizes)):
        if sz < 400: continue
        cy = (sl[0].start + sl[0].stop) / 2; cx = (sl[1].start + sl[1].stop) / 2
        k = int(cy // ch) * 4 + int(cx // cw)
        y0, y1, x0, x1 = sl[0].start, sl[0].stop, sl[1].start, sl[1].stop
        if k in cells:
            a = cells[k]; cells[k] = (min(a[0], y0), max(a[1], y1), min(a[2], x0), max(a[3], x1))
        else:
            cells[k] = (y0, y1, x0, x1)
    for k, name in enumerate(NAMES[sheet]):
        if k not in cells: print('missing', sheet, k, name); continue
        y0, y1, x0, x1 = cells[k]
        side = int(max(y1 - y0, x1 - x0) * 1.08)
        cy, cx = (y0 + y1) // 2, (x0 + x1) // 2
        canvas = Image.new('RGBA', (side, side), (0, 0, 0, 0))
        crop = Image.fromarray(rgba[y0:y1, x0:x1], 'RGBA')
        canvas.paste(crop, ((side - (x1 - x0)) // 2, (side - (y1 - y0)) // 2))
        canvas.resize((SIZE, SIZE), Image.LANCZOS).save(OUT / f'{name}.webp', quality=88, method=6)
    print(sheet, 'cells', len(cells))

for s in (sys.argv[1:] or [k for k in NAMES if Path(f'raw/{k}.png').exists()]):
    cut(s)
