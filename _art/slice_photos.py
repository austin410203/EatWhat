# Split the 2x2 photo sheets (raw/04-14.png) at their white gutters into ../public/img/photos/<name>.jpg (960x640).
import sys
from pathlib import Path
import numpy as np
from PIL import Image

NAMES = {
  '04': ['taiwanese-1', 'taiwanese-2', 'bento-1', 'bento-2'],
  '05': ['beefnoodle-1', 'beefnoodle-2', 'dumpling-1', 'dumpling-2'],
  '06': ['ramen-1', 'ramen-2', 'donburi-1', 'donburi-2'],
  '07': ['sushi-1', 'sushi-2', 'hotpot-1', 'hotpot-2'],
  '08': ['bbq-1', 'bbq-2', 'korean-1', 'korean-2'],
  '09': ['thai-1', 'thai-2', 'vietnamese-1', 'vietnamese-2'],
  '10': ['indian-1', 'indian-2', 'italian-1', 'italian-2'],
  '11': ['burger-1', 'burger-2', 'brunch-1', 'brunch-2'],
  '12': ['cafe-1', 'cafe-2', 'vegetarian-1', 'vegetarian-2'],
  '13': ['dessert-1', 'dessert-2', 'bar-1', 'bar-2'],
  '14': ['stirfry-1', 'stirfry-2', 'friends', 'spread'],
  '16': ['japanese-1', 'japanese-2', 'chinese-1', 'chinese-2'],
  '17': ['western-1', 'western-2', 'bakery-1', 'bakery-2'],
  '19': ['izakaya-1', 'izakaya-2', 'finedining-1', 'finedining-2'],
}
OUT = Path(__file__).parent.parent / 'public' / 'img' / 'photos'
OUT.mkdir(parents=True, exist_ok=True)

def white_runs(profile, lo, hi):
    """Return the white band [a, b) closest to the middle of the profile slice lo..hi."""
    idx = [i for i in range(lo, hi) if profile[i]]
    if not idx: return None
    mid = (lo + hi) / 2
    best = min(idx, key=lambda i: abs(i - mid))
    a = b = best
    while a > lo and profile[a - 1]: a -= 1
    while b < hi - 1 and profile[b + 1]: b += 1
    return a, b + 1

def edges(profile, n):
    """Strip white margins at the outer edges."""
    a = 0
    while a < n // 4 and profile[a]: a += 1
    b = n
    while b > n * 3 // 4 and profile[b - 1]: b -= 1
    return a, b

def split(sheet):
    im = Image.open(f'raw/{sheet}.png').convert('RGB')
    a = np.asarray(im).astype(np.int16)
    H, W, _ = a.shape
    white = (a.min(axis=2) > 238)
    rows = white.mean(axis=1) > 0.96
    cols = white.mean(axis=0) > 0.96
    gy = white_runs(rows, H // 3, H * 2 // 3) or (H // 2, H // 2)
    gx = white_runs(cols, W // 3, W * 2 // 3) or (W // 2, W // 2)
    y0, y1 = edges(rows, H); x0, x1 = edges(cols, W)
    boxes = [(x0, y0, gx[0], gy[0]), (gx[1], y0, x1, gy[0]), (x0, gy[1], gx[0], y1), (gx[1], gy[1], x1, y1)]
    for name, (l, t, r, b) in zip(NAMES[sheet], boxes):
        l, t, r, b = l + 3, t + 3, r - 3, b - 3  # drop anti-aliased gutter edge
        crop = im.crop((l, t, r, b))
        # centre-crop to 3:2, then resize
        w, h = crop.size
        if w / h > 1.5: nw = int(h * 1.5); crop = crop.crop(((w - nw) // 2, 0, (w - nw) // 2 + nw, h))
        else: nh = int(w / 1.5); crop = crop.crop((0, (h - nh) // 2, w, (h - nh) // 2 + nh))
        crop.resize((960, 640), Image.LANCZOS).save(OUT / f'{name}.jpg', quality=80, optimize=True, progressive=True)
    print(sheet, 'gutter y', gy, 'x', gx, 'outer', (x0, y0, x1, y1))

for s in (sys.argv[1:] or [k for k in NAMES if Path(f'raw/{k}.png').exists()]):
    split(s)
