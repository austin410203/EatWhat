"""東京各區 × 7 類，每類 20 家（2026-11-20 使用者要的範圍）：
餐廳（綜合排名，排除已在其他類的店）、壽司、燒肉、拉麵（必吃）、酒吧、咖啡廳、甜點（含麵包）。
咖啡廳和甜點在食べログ英文站是同一個列表（SC），要開店家頁看類別再分。
輸出 tokyo_raw2.json（每家帶 picks＝它入選的類別）。頁面快取在 raw/，可中斷重跑。
用法：python -X utf8 collect2.py"""
import json, re
import fetch
from collect import AREAS, detail

PER = 20
SIMPLE = [('sushi', 'RC010201'), ('yakiniku', 'RC13'), ('ramen', 'MC'), ('bar', 'BC01')]


def ranked(area, genre, page):
    base = f'https://tabelog.com/en/tokyo/{area}/rstLst/' + ('' if genre == 'RC' else genre + '/')
    url = base + (f'{page}/' if page > 1 else '') + '?SrtT=rt'
    s = fetch.get(url, f'raw/list_{area}_{genre}' + (f'_p{page}' if page > 1 else '') + '.html')
    # 第 1 頁有 JSON-LD ItemList，之後的頁沒有：直接抓店名連結（依排名順序）
    links = re.findall(r'class="list-rst__rst-name-target[^"]*"[^>]*href="(https://tabelog.com/en/tokyo/A13\d\d/A13\d{4}/\d+/)"', s)
    return list(dict.fromkeys(links))


def rid(u):
    return u.rstrip('/').split('/')[-1]


def is_cafe(genre):
    first = genre.split(',')[0]
    return bool(re.search(r'Cafe|Café|Kissa|Coffee|Tea', first, re.I))


def main():
    try:
        out = json.load(open('tokyo_raw2.json', encoding='utf-8'))
    except FileNotFoundError:
        out = []
    done = {r['area'] for r in out}
    for area, zh in AREAS.items():
        if area in done:
            continue
        got = {}   # tid -> record
        picks = {}  # tid -> [類別]

        def add(u, cat):
            t = rid(u)
            if t not in got:
                d = detail(u)
                if not d:
                    return None
                d.update(area=area, areaZh=zh)
                got[t] = d
            picks.setdefault(t, [])
            if cat not in picks[t]:
                picks[t].append(cat)
            return got[t]

        for cat, code in SIMPLE:
            n = 0
            for page in (1, 2):
                for u in ranked(area, code, page):
                    if n >= PER: break
                    if add(u, cat): n += 1
                if n >= PER: break
        # 咖啡廳／甜點：同一個 SC 列表，依店家類別分
        nc = ns = 0
        for page in range(1, 7):
            urls = ranked(area, 'SC', page)
            if not urls: break
            for u in urls:
                if nc >= PER and ns >= PER: break
                d = got.get(rid(u)) or detail(u)
                if not d: continue
                cat = 'cafe' if is_cafe(d['genre']) else 'sweets'
                if (cat == 'cafe' and nc < PER) or (cat == 'sweets' and ns < PER):
                    add(u, cat)
                    if cat == 'cafe': nc += 1
                    else: ns += 1
            if nc >= PER and ns >= PER: break
        # 餐廳：綜合排名，跳過已入選其他類的店，補滿 20
        n = 0
        for page in (1, 2, 3):
            for u in ranked(area, 'RC', page):
                if n >= PER: break
                if rid(u) in picks: continue
                if add(u, 'top'): n += 1
            if n >= PER: break
        for t, d in got.items():
            d['picks'] = picks.get(t, [])
            d['pick'] = d['picks'][0] if d['picks'] else 'top'
            out.append(d)
        json.dump(out, open('tokyo_raw2.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        cnt = {c: sum(1 for t in picks if c in picks[t]) for c in ['top', 'sushi', 'yakiniku', 'ramen', 'bar', 'cafe', 'sweets']}
        print(area, zh, len(got), cnt, 'total', len(out), flush=True)


if __name__ == '__main__':
    main()
