# 切東京用的 2x2 圖（raw_tokyo/<id>.png，id 與檔名對照在 prompts_tokyo.json）
#  → public/img/photos/<name>.jpg（960x640）＋ native/Resources/Art/photos/<name>.jpg
# 區域封面（A13xx）另存 public/img/areas/、native/Resources/Art/areas/，縮成 640x427。
import json, shutil, sys
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).parent.parent
PROMPTS = {p['id']: p['names'] for p in json.load(open(Path(__file__).parent / 'prompts_tokyo.json', encoding='utf-8'))}


# 以下兩個函式和 slice_photos.py 相同（那支沒有 __main__ 保護，不能直接 import）
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
    im = Image.open(f'raw_tokyo/{sheet}.png').convert('RGB')
    import numpy as np
    a = np.asarray(im).astype(np.int16)
    H, W, _ = a.shape
    white = (a.min(axis=2) > 238)
    rows = white.mean(axis=1) > 0.96
    cols = white.mean(axis=0) > 0.96
    gy = white_runs(rows, H // 3, H * 2 // 3) or (H // 2, H // 2)
    gx = white_runs(cols, W // 3, W * 2 // 3) or (W // 2, W // 2)
    y0, y1 = edges(rows, H); x0, x1 = edges(cols, W)
    boxes = [(x0, y0, gx[0], gy[0]), (gx[1], y0, x1, gy[0]), (x0, gy[1], gx[0], y1), (gx[1], gy[1], x1, y1)]
    for name, (l, t, r, b) in zip(PROMPTS[sheet], boxes):
        crop = im.crop((l + 3, t + 3, r - 3, b - 3))
        w, h = crop.size
        if w / h > 1.5: nw = int(h * 1.5); crop = crop.crop(((w - nw) // 2, 0, (w - nw) // 2 + nw, h))
        else: nh = int(w / 1.5); crop = crop.crop((0, (h - nh) // 2, w, (h - nh) // 2 + nh))
        area = name.startswith('A13')
        sub, size = ('areas', (640, 427)) if area else ('photos', (960, 640))
        for out in (ROOT / 'public' / 'img' / sub, ROOT / 'native' / 'Resources' / 'Art' / sub):
            out.mkdir(parents=True, exist_ok=True)
            crop.resize(size, Image.LANCZOS).save(out / f'{name}.jpg', quality=80, optimize=True, progressive=True)
    print(sheet, PROMPTS[sheet], 'gutter y', gy, 'x', gx)


for s in (sys.argv[1:] or [k for k in PROMPTS if Path(f'raw_tokyo/{k}.png').exists()]):
    split(s)
