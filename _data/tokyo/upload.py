"""把 tokyo_places.json 用 POST /api/places/bulk 匯入。
用法：python -X utf8 upload.py <網址> [密碼檔]   （密碼從檔案讀，不印出）"""
import json, sys, urllib.request
base = sys.argv[1].rstrip('/')
pw = open(sys.argv[2], encoding='utf-8').read().strip() if len(sys.argv) > 2 else 'test-only-pw'
places = json.load(open('tokyo_places.json', encoding='utf-8'))
req = urllib.request.Request(base + '/api/places/bulk', data=json.dumps({'list': places}, ensure_ascii=False).encode('utf-8'), method='POST',
                             headers={'Authorization': 'Bearer ' + pw, 'Content-Type': 'application/json', 'User-Agent': 'EatWhat-admin/1.0 CFNetwork'})
try:
    d = json.load(urllib.request.urlopen(req, timeout=60))
    cities = {}
    for p in d['list']:
        cities[p.get('city', 'taipei')] = cities.get(p.get('city', 'taipei'), 0) + 1
    print('ok ver', d['ver'], cities)
except urllib.error.HTTPError as e:
    print('HTTP', e.code, e.read().decode()[:300])
