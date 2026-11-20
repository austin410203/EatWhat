"""列出要寫介紹的店（精簡）：python -X utf8 brief.py 起 迄"""
import json, sys
raw = {r['tid']: r for r in json.load(open('tokyo_raw.json', encoding='utf-8'))}
places = json.load(open('tokyo_places.json', encoding='utf-8'))
import glob
descs = {}
for f in glob.glob('descs_*.json'): descs.update(json.load(open(f, encoding='utf-8')))
a, b = int(sys.argv[1]), int(sys.argv[2])
for p in places[a:b]:
    tid = p['id'][1:]
    if tid in descs: continue
    r = raw[tid]
    print(f"{tid}|{p['name']}|{p['gcat']}|{p['areaName'].split('（')[0].split('・')[0]}|{r['score']}|{p.get('priceNote','')}|{';'.join(p.get('badges',[]))[:40]}|{r['pr'][:170]}")
