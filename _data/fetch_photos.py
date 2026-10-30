# 一次性：每家店抓一張 Google Places 照片存到 public/img/places/<id>.jpg，拍攝者署名存 src/data/place_photos.json。
# 使用者決定（2026-10-31）：App 自用，照片載下來後關掉 Places API、刪掉金鑰。
# place_id 讀 _data/place_ids.json；金鑰讀 .dev.vars。已經有的照片不重抓。
import io, json, sys, time, urllib.request
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).parent.parent
KEY = next(l.split('=', 1)[1].strip() for l in (ROOT / '.dev.vars').read_text().splitlines() if l.startswith('GOOGLE_PLACES_KEY='))
PIDS = json.loads((ROOT / '_data' / 'place_ids.json').read_text(encoding='utf-8'))
OUT = ROOT / 'public' / 'img' / 'places'
CRED = ROOT / 'src' / 'data' / 'place_photos.json'
OUT.mkdir(parents=True, exist_ok=True)
cred = json.loads(CRED.read_text(encoding='utf-8')) if CRED.exists() else {}
limit = int(sys.argv[1]) if len(sys.argv) > 1 else 10**9


def get(url, headers):
    return urllib.request.urlopen(urllib.request.Request(url, headers=headers), timeout=30).read()


done = 0
for rid, pid in PIDS.items():
    if rid in cred or done >= limit:
        continue
    done += 1
    try:
        d = json.loads(get(f'https://places.googleapis.com/v1/places/{pid}', {'X-Goog-Api-Key': KEY, 'X-Goog-FieldMask': 'photos'}))
        ph = (d.get('photos') or [None])[0]
        if not ph:
            print('NO PHOTO', rid); continue
        img = get(f'https://places.googleapis.com/v1/{ph["name"]}/media?maxWidthPx=1000', {'X-Goog-Api-Key': KEY})
        im = Image.open(io.BytesIO(img)).convert('RGB')
        if im.width > 900:
            im = im.resize((900, round(im.height * 900 / im.width)), Image.LANCZOS)
        im.save(OUT / f'{rid}.jpg', 'JPEG', quality=80, optimize=True, progressive=True)
        a = (ph.get('authorAttributions') or [{}])[0]
        cred[rid] = {'author': a.get('displayName', ''), 'uri': a.get('uri', '')}
    except Exception as e:
        print('ERR', rid, e); continue
    if done % 25 == 0:
        CRED.write_text(json.dumps(cred, ensure_ascii=False, indent=0), encoding='utf-8'); print(done, 'done')
    time.sleep(0.05)

CRED.write_text(json.dumps(cred, ensure_ascii=False, indent=0), encoding='utf-8')
print(f'fetched {done}, have {len(cred)}/{len(PIDS)}')
