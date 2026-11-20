"""把 tokyo_places.json 用 POST /api/places/bulk 匯入（每次 1000 筆，Worker 上限 2000）。
用法：python -X utf8 upload.py <網址> [密碼檔]   （密碼從檔案讀，不印出）"""
import json, sys, urllib.request
base = sys.argv[1].rstrip('/')
# 密碼檔第 2 行是密碼（第 1 行是說明文字）；不印出
pw = open(sys.argv[2], encoding='utf-8').read().splitlines()[1].strip() if len(sys.argv) > 2 else 'test-only-pw'
ALL = json.load(open('tokyo_places.json', encoding='utf-8'))
for i in range(0, len(ALL), 1000):
    places = ALL[i:i + 1000]
    req = urllib.request.Request(base + '/api/places/bulk', data=json.dumps({'list': places}, ensure_ascii=False).encode('utf-8'), method='POST',
                                 headers={'Authorization': 'Bearer ' + pw, 'Content-Type': 'application/json', 'User-Agent': 'EatWhat-admin/1.0 CFNetwork'})
    try:
        d = json.load(urllib.request.urlopen(req, timeout=120))
        cities = {}
        for p in d['list']:
            cities[p.get('city', 'taipei')] = cities.get(p.get('city', 'taipei'), 0) + 1
        print('ok ver', d['ver'], cities)
    except urllib.error.HTTPError as e:
        print('HTTP', e.code, e.read().decode()[:300])
        sys.exit(1)
