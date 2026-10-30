# 把 saved.json 的每家店對到 Google Places 的 place_id，存成 worker/place_ids.json（Worker 用來抓官方照片）。
# place_id 是 Google 條款允許長期保存的唯一欄位。只查還沒有的店，可以重複執行補新店。
# 金鑰讀 .dev.vars 的 GOOGLE_PLACES_KEY（不進 git）。每次查詢算 Text Search Pro（每月前 5,000 次免費）。
import json, math, sys, time, urllib.request
from pathlib import Path

ROOT = Path(__file__).parent.parent
KEY = next(l.split('=', 1)[1].strip() for l in (ROOT / '.dev.vars').read_text().splitlines() if l.startswith('GOOGLE_PLACES_KEY='))
OUT = ROOT / '_data' / 'place_ids.json'
saved = json.loads((ROOT / 'src' / 'data' / 'saved.json').read_text(encoding='utf-8'))
pids = json.loads(OUT.read_text(encoding='utf-8')) if OUT.exists() else {}
# 人工確認對錯的店：不對應（Kohinoor 原址在 Google 上已是別家 Fumo）
SKIP = {'g1cm3t7w49sgy'}
limit = int(sys.argv[1]) if len(sys.argv) > 1 else 10**9


def search(r):
    body = {
        'textQuery': f"{r['name']} {r['addr']}",
        'languageCode': 'zh-TW',
        'locationBias': {'circle': {'center': {'latitude': r['lat'], 'longitude': r['lng']}, 'radius': 300.0}},
        'pageSize': 5,
    }
    req = urllib.request.Request('https://places.googleapis.com/v1/places:searchText', json.dumps(body).encode(), {
        'Content-Type': 'application/json', 'X-Goog-Api-Key': KEY,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.location',
    })
    return json.loads(urllib.request.urlopen(req, timeout=20).read()).get('places', [])


def meters(a, b):
    dy = (a[0] - b[0]) * 111320
    dx = (a[1] - b[1]) * 111320 * math.cos(math.radians(a[0]))
    return math.hypot(dx, dy)


done = miss = 0
for r in saved:
    if r['id'] in pids or r['id'] in SKIP or done >= limit:
        continue
    done += 1
    try:
        res = search(r)
    except Exception as e:
        print('ERR', r['name'], e); miss += 1; continue
    best = min(res, key=lambda p: meters((r['lat'], r['lng']), (p['location']['latitude'], p['location']['longitude']))) if res else None
    d = meters((r['lat'], r['lng']), (best['location']['latitude'], best['location']['longitude'])) if best else 1e9
    if d > 150:
        print(f"MISS {r['name']}  (nearest {best['displayName']['text'] if best else '-'} {d:.0f} m)"); miss += 1; continue
    pids[r['id']] = best['id']
    print(f"OK  {r['name']}  →  {best['displayName']['text']}  ({d:.0f} m)")
    if done % 25 == 0:
        OUT.write_text(json.dumps(pids, indent=0), encoding='utf-8'); print(done, 'queried')
    time.sleep(0.1)

OUT.write_text(json.dumps(pids, indent=0), encoding='utf-8')
print(f'queried {done}, matched {len(pids)}/{len(saved)}, missed {miss}')
