"""tokyo_raw.json（collect.py）＋ descs.json（店家介紹）→ tokyo_places.json（後台 /api/places/bulk 的格式）。
用法：python -X utf8 build_tokyo.py   → 印出類別統計與解析不了營業時間的店"""
import collections, glob, json, re

JPY_TO_TWD = 0.21  # 2026-11 匯率約 1 日圓 = 0.21 台幣（預算篩選用，顯示仍是日圓）

# 食べログ英文類別 → App 料理類別（依序比對，先中先贏）
CUISINE_RULES = [
    (r'Ramen|Tsukemen|Abura soba|Tantanmen', 'ramen'),
    (r'Kaiten sushi|Stand-up sushi|Sushi|Kaisendon', 'sushi'),
    (r'Yakiniku|Horumon|Tripe|Jingisukan', 'bbq'),
    (r'Bar|Pub|Wine bar|Beer bar|Japanese sake bar|shochu', 'bar'),
    (r'Bakery|Bread|Sandwich|Bagel', 'bakery'),
    (r'Cake|Sweets|Japanese sweets|Ice cream|Gelato|Parfait|Crepe|Pancake|Chocolate|Dessert|Shaved ice|Donut|Pudding|Fruit parlor', 'dessert'),
    (r'Cafe|Café|Coffee|Kissaten|Tea house|Teahouse|Tea', 'cafe'),
    (r'Izakaya|Yakitori|Kushiage|Robatayaki|Oden|Kushiyaki|Motsunabe', 'izakaya'),
    (r'Hot pot|Shabu|Sukiyaki|Nabe', 'hotpot'),
    (r'Udon|Soba|Noodles', 'japanese'),
    (r'Tonkatsu|Katsu|Beef cutlet|Tempura|Unagi|Eel|Kaiseki|Japanese cuisine|Kappo|Ryotei|Okonomiyaki|Monjayaki|Teishoku|Gyutan|Fugu|Crab|Seafood|Donburi|Oyakodon', 'japanese'),
    (r'Chinese|Dim sum|Gyoza|Dumpling|Szechuan|Cantonese|Shanghai', 'chinese'),
    (r'Korean', 'korean'),
    (r'Thai', 'thai'),
    (r'Vietnam', 'vietnamese'),
    (r'Indian|Curry|Nepal|Sri Lanka', 'indian'),
    (r'Italian|Pizza|Pasta', 'italian'),
    (r'Hamburger', 'burger'),
    (r'Vegetarian|Vegan', 'vegetarian'),
    (r'French|Innovative|Spanish|Western|Steak|Teppanyaki|Bistro|European|Modern', 'western'),
]
GENRE_ZH = {
    'Sushi': '壽司', 'Kaiten sushi (Conveyor belt sushi)': '迴轉壽司', 'Stand-up sushi': '立食壽司', 'Ramen': '拉麵', 'Tsukemen': '沾麵',
    'Yakiniku (Japanese BBQ)': '燒肉', 'Horumon (Grilled offal)': '內臟燒肉', 'Bar': '酒吧', 'Pub': '小酒館', 'Wine bar': '葡萄酒吧',
    'Beer bar': '啤酒吧', 'Japanese sake bar': '日本酒吧', 'Cafe': '咖啡廳', 'Kissaten (Japanese style coffee shop)': '喫茶店',
    'Bakery': '麵包店', 'Cake': '蛋糕', 'Sweets': '甜點', 'Japanese sweets': '和菓子', 'Ice cream': '冰淇淋', 'Gelato': '義式冰淇淋',
    'Parfait': '芭菲', 'Chocolate': '巧克力', 'Japanese cuisine': '日本料理', 'Kaiseki (Traditional Japanese course)': '懷石料理',
    'Kappo (Japanese counter dining)': '割烹', 'Tempura': '天婦羅', 'Tonkatsu (Pork cutlet)': '炸豬排', 'Unagi (Freshwater eel)': '鰻魚',
    'Yakitori (Grilled chicken skewers)': '燒鳥', 'Izakaya (Japanese style tavern)': '居酒屋', 'Soba (Buckwheat noodles)': '蕎麥麵',
    'Udon (Wheat noodles)': '烏龍麵', 'French': '法式料理', 'Innovative': '創新料理', 'Italian': '義式料理', 'Spanish': '西班牙料理',
    'Steak': '牛排', 'Teppanyaki': '鐵板燒', 'Chinese': '中式料理', 'Szechuan cuisine': '川菜', 'Dim sum': '港式點心', 'Gyoza (Dumplings)': '煎餃',
    'Curry': '咖哩', 'Hamburger': '漢堡', 'Okonomiyaki': '大阪燒', 'Monjayaki': '文字燒', 'Sukiyaki (Japanese sweet soy hotpot)': '壽喜燒',
    'Shabu shabu (Japanese hotpot)': '涮涮鍋', 'Gyutan (Beef tongue)': '牛舌', 'Beef cutlet': '炸牛排', 'Pizza': '披薩', 'Western': '洋食',
    'Seafood': '海鮮', 'Kaisendon (Seafood rice bowl)': '海鮮丼', 'Crepe, Galette': '可麗餅', 'Pancake': '鬆餅', 'Fruit parlor': '水果店甜點',
    'Abura soba (Oil noodles)': '油拌麵', 'Tantanmen': '擔擔麵', 'Oden (Japanese hotpot)': '關東煮', 'Kushiage (Deep-fried skewers)': '炸串',
    'Bistro': '小酒館', 'Wine': '葡萄酒', 'Coffee stand': '咖啡站', 'Tea': '茶館', 'Japanese tea house': '日式茶屋', 'Sandwich': '三明治',
    'Donuts': '甜甜圈', 'Tripe': '內臟燒肉', 'Bread': '麵包', 'Tsukemen (Dipping noodles)': '沾麵', 'Japanese traditional sweets': '和菓子',
    'Sweets (Western style)': '西式甜點', 'Kakigori (Shaved ice)': '刨冰', 'Cafe featuring Japanese sweets': '和風甜點咖啡廳', 'Korean': '韓式料理',
    'Beef dishes': '牛肉料理', 'Grilled tripe': '烤內臟', 'Kissa (Japanese coffee shop)': '喫茶店', 'Sichuan': '川菜',
    'Tantan-men (Spicy noodle soup)': '擔擔麵', 'Taiwanese': '台灣料理', 'Baru (Spanish style bar)': '西班牙酒館', 'Unagi (Eel)': '鰻魚',
    'Macaroon': '馬卡龍', 'Dorayaki (Japanese sweet pancake)': '銅鑼燒', 'Jingisukan (Grilled lamb)': '成吉思汗烤羊肉', 'Soup Curry': '湯咖哩',
    'Yoshoku (Japanese style western cuisine)': '日式洋食', 'Creative': '創意料理', 'Daifuku (Red bean paste rice cake)': '大福',
    'Vietnamese': '越南料理', 'Asian': '亞洲料理', 'Ethnic': '異國料理', 'Taiyaki': '鯛魚燒', 'Obanyaki': '今川燒', 'Pasta': '義大利麵',
    'Chicken dishes': '雞肉料理', 'Thai': '泰式料理', 'Indian': '印度料理', 'Yakiniku': '燒肉', 'Coffee': '咖啡', 'Tea': '茶',
    'Japanese Cuisine': '日本料理', 'Yakitori': '燒鳥', 'Tonkatsu': '炸豬排', 'Soba': '蕎麥麵', 'Udon': '烏龍麵', 'Gyoza': '煎餃', 'Shaved ice': '刨冰', 'Pudding': '布丁', 'Tea house': '茶館', 'Hot pot': '火鍋', 'Motsunabe (Offal hotpot)': '牛腸鍋',
}
GZ = {k.lower(): v for k, v in GENRE_ZH.items()}
WD = {'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6, 'Sun': 0}
WD_ZH = {'Mon': '週一', 'Tue': '週二', 'Wed': '週三', 'Thu': '週四', 'Fri': '週五', 'Sat': '週六', 'Sun': '週日',
         'Public Holiday': '國定假日', 'Day before public holiday': '假日前一天', 'Day after public holiday': '假日隔天'}


def cuisine(genre, pick, price_jpy):
    for pat, key in CUISINE_RULES:
        if re.search(pat, genre, re.I):
            if key == 'western' and price_jpy and price_jpy >= 25000:
                return 'finedining'
            if key == 'japanese' and price_jpy and price_jpy >= 30000:
                return 'finedining'
            return key
    return {'sushi': 'sushi', 'yakiniku': 'bbq', 'cafe': 'cafe', 'bar': 'bar', 'ramen': 'ramen'}.get(pick, 'japanese')


def yen_range(s):
    """'JPY 1,000 - JPY 1,999' / '～JPY 999' / 'JPY 100,000 -' → (lo, hi)"""
    nums = [int(x.replace(',', '')) for x in re.findall(r'JPY\s*([\d,]+)', s)]
    if not nums:
        return None
    if s.strip().startswith(('～', '~', '-')):
        return (1, nums[0])
    if len(nums) == 1:
        return (nums[0], 99999 if re.search(r'-\s*$|～\s*$', s.strip()) else nums[0])
    return (nums[0], nums[1])


def yen_text(r):
    lo, hi = r
    f = lambda v: f'{v:,}'
    if lo <= 1:
        return f'¥{f(hi)} 以內'
    if hi >= 99999 or hi == lo and lo >= 100000:
        return f'¥{f(lo)} 以上'
    return f'¥{f(lo)}–{f(hi)}'


def to_min(t, ap):
    h, m = map(int, t.split(':'))
    if ap == 'PM' and h != 12:
        h += 12
    if ap == 'AM' and h == 12:
        h = 0
    return h * 60 + m


DAYRUN = r'(?:(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun|Public Holiday|Day before public holiday|Day after public holiday)(?:,\s*|\s+(?=Mon|Tue|Wed|Thu|Fri|Sat|Sun|Public|Day)|))+'


def parse_hours(text):
    """食べログ英文營業時間 → 7 天 [[開始, 結束]]；看不懂回 None"""
    if not text:
        return None
    segs = [(m.start(), m.end(), m.group()) for m in re.finditer(DAYRUN, text) if re.search(r'Mon|Tue|Wed|Thu|Fri|Sat|Sun', m.group())]
    if not segs:
        return None
    week = [None] * 7
    for i, (a, b, days) in enumerate(segs):
        body = text[b: segs[i + 1][0] if i + 1 < len(segs) else len(text)]
        body = re.sub(r'L\.?O\.?[^0-9]*\d{1,2}:\d{2}\s*[AP]M', '', body)
        slots = []
        for t1, a1, t2, a2 in re.findall(r'(\d{1,2}:\d{2})\s*(AM|PM)\s*-\s*(\d{1,2}:\d{2})\s*(AM|PM)', body):
            s, e = to_min(t1, a1), to_min(t2, a2)
            if e <= s:
                e += 1440
            slots.append([s, e])
        if not slots and 'Closed' not in body and '24 hours' not in body:
            continue
        if '24 hours' in body and not slots:
            slots = [[0, 1440]]
        for d in re.findall(r'Mon|Tue|Wed|Thu|Fri|Sat|Sun', days):
            week[WD[d]] = (week[WD[d]] or []) + slots[:4] if slots else (week[WD[d]] or [])
    if all(w is None for w in week):
        return None
    return [sorted(w)[:4] if w else [] for w in week]


def hours_zh(text, parsed):
    # 解析得了就只留結構化那段（■ 後面是英文補充說明）；解析不了留英文原文
    t = text.split('■')[0].strip() if parsed and text.split('■')[0].strip() else text
    if not parsed:
        return t[:380]
    for k in sorted(WD_ZH, key=len, reverse=True):
        t = re.sub(r'(?<![A-Za-z])' + k + r'(?![a-z])', WD_ZH[k], t)
    t = re.sub(r'(\d{1,2}:\d{2})\s*(AM|PM)', lambda m: hm(to_min(m.group(1), m.group(2))), t)
    t = t.replace(' - ', '–').replace('Closed', '公休').replace('L.O.', '最後點餐').replace('Before', '').strip()
    return t[:380]


def hm(m):
    return f'{m // 60 % 24:02d}:{m % 60:02d}'


def access_zh(s):
    m = re.search(r'(\d+)\s*minutes? walk from ([A-Za-z\-\' ]+?) Station', s)
    if m:
        return f'{m.group(2).strip()} 站步行 {m.group(1)} 分鐘'
    m = re.search(r'([\d,]+) meters from ([A-Za-z\-\' ]+)', s)
    if m:
        return f'距 {m.group(2).strip()} 站 {m.group(1)} 公尺'
    return s[:120]


HY = {'寿司': '壽司', '焼肉': '燒肉', 'ラーメン': '拉麵', 'スイーツ': '甜點', 'カフェ': '咖啡', 'パン': '麵包', 'バー': '酒吧',
      'フレンチ': '法式', 'イタリアン': '義式', '日本料理': '日本料理', '中国料理': '中國料理', '焼き鳥': '燒鳥', '焼鳥': '燒鳥',
      'うなぎ': '鰻魚', 'そば': '蕎麥麵', '天ぷら': '天婦羅', 'カレー': '咖哩', 'ハンバーガー': '漢堡', '喫茶店': '喫茶店',
      '和菓子・甘味処': '和菓子', 'すき焼き・しゃぶしゃぶ': '壽喜燒・涮涮鍋', '創作料理・イノベーティブ': '創新料理', 'ビストロ': '小酒館',
      'アジア・エスニック': '亞洲料理', 'スペイン料理': '西班牙料理', '鳥料理': '雞肉料理', 'とんかつ': '炸豬排', '居酒屋': '居酒屋',
      'うどん': '烏龍麵', '餃子': '餃子', 'ステーキ・鉄板焼': '牛排・鐵板燒', 'お好み焼き': '大阪燒', 'ホルモン': '內臟燒肉'}


def badges(r):
    out = []
    medal = {'Gold': '金賞', 'Silver': '銀賞', 'Bronze': '銅賞'}
    if r.get('award'):
        y, k = max(a.split() for a in r['award'])
        out.append(f'食べログ Award {y} {medal.get(k, k)}')
    latest = {}
    for h in r.get('hyaku', []):
        cat, yr = h.rsplit(' ', 1)
        latest[cat] = max(latest.get(cat, ''), yr)
    for h in [f'{c} {y}' for c, y in sorted(latest.items(), key=lambda x: x[1], reverse=True)][:2]:
        cat, rest = h.split(' ', 1)
        out.append(f"{HY.get(cat, cat)} {rest}")
    return out[:6]


def tags(r, key, hours):
    t = set()
    if key in ('ramen', 'cafe', 'bakery', 'dessert'):
        t.add('solo')
    if key in ('bbq', 'izakaya', 'hotpot', 'chinese'):
        t.add('group')
    if key == 'cafe':
        t.add('quiet')
    if hours and any(s[1] >= 1380 for d in hours for s in d):
        t.add('late')
    return sorted(t)


def build():
    raw = json.load(open('tokyo_raw.json', encoding='utf-8'))
    descs = {}
    for f in sorted(glob.glob('descs_*.json')):
        descs.update(json.load(open(f, encoding='utf-8')))
    out, seen, bad_hours, stats = [], set(), [], collections.Counter()
    for r in raw:
        if r['tid'] in seen or not r.get('lat'):
            continue
        seen.add(r['tid'])
        b = dict(r['budget'])
        dinner = yen_range(b.get('dinner', '')) if b.get('dinner') else None
        lunch = yen_range(b.get('lunch', '')) if b.get('lunch') else None
        main = dinner or lunch or yen_range(r.get('priceLD', ''))
        key = cuisine(r['genre'], r['pick'], main[0] if main else None)
        stats[key] += 1
        notes = []
        if dinner: notes.append('晚餐 ' + yen_text(dinner))
        if lunch: notes.append('午餐 ' + yen_text(lunch))
        hours = parse_hours(r['hours'])
        if hours is None and r['hours']:
            bad_hours.append((r['tid'], r['hours'][:100]))
        genres = [g.strip() for g in r['genre'].split(',') if g.strip()]
        out.append({
            'id': 't' + r['tid'],
            'name': r['name_ja'] or r['name_en'],
            'nameAlt': r['name_en'] if r['name_ja'] else None,
            'cuisine': key,
            'gcat': '、'.join(GZ.get(g.lower(), g) for g in genres[:3]),
            'list': 'want',
            'lat': round(r['lat'], 6), 'lng': round(r['lng'], 6),
            'rating': r['score'], 'reviews': r['reviews'],
            'priceRange': [max(1, round(main[0] * JPY_TO_TWD)) if main[0] > 1 else 1, 99999 if main[1] >= 99999 else round(main[1] * JPY_TO_TWD)] if main else None,
            'addr': r['addr'], 'phone': (re.search(r'\+?[\d][\d\-]{7,}', r['phone'] or '') or [''])[0],
            'hours': hours, 'hoursNote': hours_zh(r['hours'], hours is not None) if r['hours'] else None,
            'tags': tags(r, key, hours),
            'city': 'tokyo', 'area': r['area'], 'areaName': r['areaZh'],
            'desc': descs.get(r['tid']),
            'src': 'tabelog', 'tlUrl': r['url'], 'badges': badges(r),
            'priceNote': '・'.join(notes) or None,
            'access': access_zh(r['access']) if r['access'] else None,
            'gq': f"{r['name_ja'] or r['name_en']} {r['addr']}",
        })
    out = [{k: v for k, v in p.items() if v is not None} for p in out]
    json.dump(out, open('tokyo_places.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(len(out), 'places', dict(stats))
    print('hours unparsed:', len(bad_hours))
    for x in bad_hours[:8]:
        print('  ', x)
    print('no desc:', sum(1 for p in out if not p.get('desc')))


if __name__ == '__main__':
    build()
