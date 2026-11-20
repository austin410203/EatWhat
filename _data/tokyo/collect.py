"""東京各區 Tabelog 推薦店：每區 20 家（綜合 6、壽司 3、燒肉 3、咖啡甜點 4、酒吧 2、拉麵 2），
抓英文站列表（依評分排序）＋店家頁的結構化資料，輸出 tokyo_raw.json。
用法：python -X utf8 collect.py   （頁面快取在 raw/，中斷後重跑會接著抓）"""
import html, json, re, sys
import fetch

AREAS = {
    'A1301': '銀座・新橋・有樂町', 'A1302': '東京車站・日本橋', 'A1303': '澀谷・惠比壽・代官山', 'A1304': '新宿・代代木・大久保',
    'A1305': '池袋・高田馬場・早稻田', 'A1306': '原宿・表參道・青山', 'A1307': '六本木・麻布・廣尾', 'A1308': '赤坂・永田町・溜池',
    'A1309': '四谷・市谷・飯田橋', 'A1310': '秋葉原・神田・水道橋', 'A1311': '上野・淺草・日暮里', 'A1312': '兩國・錦糸町・小岩',
    'A1313': '築地・灣岸・台場', 'A1314': '濱松町・田町・品川', 'A1315': '大井町・蒲田', 'A1316': '目黑・白金・五反田',
    'A1317': '東急沿線（自由之丘・中目黑・二子玉川）', 'A1318': '京王・小田急沿線（下北澤・明大前）', 'A1319': '中野・高圓寺・西荻窪',
    'A1320': '吉祥寺・三鷹', 'A1321': '西武沿線（練馬・石神井）', 'A1322': '板橋・東武沿線', 'A1323': '大塚・巢鴨・駒込・赤羽',
    'A1324': '北千住・綾瀨・葛飾',
}
# (Tabelog 分類, 名額, 我們的類別標籤)
QUOTA = [('RC', 6, 'top'), ('RC010201', 3, 'sushi'), ('RC13', 3, 'yakiniku'), ('SC', 4, 'cafe'), ('BC01', 2, 'bar'), ('MC', 2, 'ramen')]


def ranked(area, genre):
    url = f'https://tabelog.com/en/tokyo/{area}/rstLst/' + ('' if genre == 'RC' else genre + '/') + '?SrtT=rt'
    s = fetch.get(url, f'raw/list_{area}_{genre}.html')
    m = re.search(r'"@type":"ItemList","itemListElement":(\[.*?\])}', s)
    return [x['url'] for x in json.loads(m.group(1))] if m else []


def text(s):
    return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', s))).strip()


def row(s, th):
    m = re.search(r'<th>\s*' + th + r'\s*</th>\s*<td[^>]*>(.*?)</td>', s, re.S)
    return text(m.group(1)) if m else ''


def detail(url):
    rid = url.rstrip('/').split('/')[-1]
    s = fetch.get(url, f'raw/d_{rid}.html')
    if not s:
        return None
    ld = next((json.loads(m) for m in re.findall(r'<script type="application/ld\+json">(.*?)</script>', s, re.S)
               if '"@type":"Restaurant"' in m), {})
    alias = re.search(r'<span class="alias">\((.*?)\)</span>', s)
    head = s[s.find('rdheader-budget'):][:3000]
    budget = [(k, text(v)) for k, v in re.findall(r'c-rating-v3__time--(dinner|lunch)"[^>]*></i><span class="c-rating-v3__val">(.*?)</span>', head, re.S)]
    awards = sorted(set(text(a) for a in re.findall(r'<span class="c-badge-[^"]*"[^>]*>(.*?)</span>', s) if text(a)))
    hyaku = re.findall(r'食べログ ([^<]*?百名店 \d{4}) 選出店', s)
    award = re.findall(r'The Tabelog Award (\d{4}) (Gold|Silver|Bronze)', s)
    desc = re.search(r'<meta content="Check out [^"]*? on Tabelog! (.*?) Discover Japanese restaurants', s, re.S)
    geo = ld.get('geo', {})
    return {
        'tid': rid, 'url': url.replace('/en/', '/'), 'name_en': ld.get('name') or row(s, 'Restaurant name'),
        'name_ja': alias.group(1) if alias else '', 'lat': geo.get('latitude'), 'lng': geo.get('longitude'),
        'score': float(ld.get('aggregateRating', {}).get('ratingValue') or 0),
        'reviews': int(ld.get('aggregateRating', {}).get('ratingCount') or 0),
        'priceLD': ld.get('priceRange', ''), 'budget': budget, 'genre': row(s, 'Categories') or ld.get('servesCuisine', ''),
        'addr': row(s, 'Address').split(' Show larger map')[0].split(' 大きな地図')[0], 'access': row(s, 'Transportation'),
        'hours': row(s, 'Business hours'), 'closed': row(s, 'Closed') or row(s, 'Regular holiday'),
        'phone': row(s, 'Phone number') or row(s, 'Reservation/ Inquiry') or row(s, 'Reservation/Inquiry'),
        'reserve': row(s, 'Reservation availability'),
        'award': [' '.join(a) for a in sorted(set(award))], 'hyaku': sorted(set(hyaku)),
        'pr': html.unescape(desc.group(1)).strip() if desc else '',
    }


def main():
    out, seen = [], set()
    try:
        out = json.load(open('tokyo_raw.json', encoding='utf-8'))
        seen = {(r['area'], r['tid']) for r in out}
    except FileNotFoundError:
        pass
    done_areas = {r['area'] for r in out}
    for area, zh in AREAS.items():
        if area in done_areas:
            continue
        picked, ids = [], set()
        lists = {g: ranked(area, g) for g, _, _ in QUOTA}
        for g, n, tag in QUOTA:
            for u in lists[g]:
                if sum(1 for p in picked if p[1] == tag) >= n:
                    break
                rid = u.rstrip('/').split('/')[-1]
                if rid not in ids:
                    ids.add(rid); picked.append((u, tag))
        for u in lists['RC'] + lists['SC'] + lists['MC']:   # 不足 20 家時用綜合排名補
            if len(picked) >= 20:
                break
            rid = u.rstrip('/').split('/')[-1]
            if rid not in ids:
                ids.add(rid); picked.append((u, 'top'))
        for u, tag in picked[:20]:
            d = detail(u)
            if d:
                d.update(area=area, areaZh=zh, pick=tag)
                out.append(d)
        json.dump(out, open('tokyo_raw.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        print(area, zh, len([r for r in out if r['area'] == area]), 'total', len(out), flush=True)


if __name__ == '__main__':
    if len(sys.argv) > 1:
        print(json.dumps(detail(sys.argv[1]), ensure_ascii=False, indent=1))
    else:
        main()
