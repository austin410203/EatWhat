# Turn the Google Maps saved-places dump (_data/google_saved.json, collected in the user's Chrome)
# into src/data/saved.json: Taipei City food places only, mapped to the app's cuisine keys.
import json, re
from pathlib import Path

ROOT = Path(__file__).parent
raw = json.loads((ROOT / 'google_saved.json').read_text(encoding='utf-8'))
jobs, det = raw['jobs'], raw['det']

# Google category (zh-TW) or store name -> cuisine key; first match wins, so specific rules go first.
RULES = [
    ('izakaya', r'居酒屋|烤雞串|燒鳥|串燒|串焼|Yakitori|yakitori|やきとり|關東煮|おでん'),
    ('ramen', r'拉麵|ラ.?メン|つけ麺|沾麵|Soba$|鶏白湯'),
    ('beefnoodle', r'牛肉麵|牛腩麵'),
    ('sushi', r'壽司|鮨|omakase|割烹|無菜單|スシ'),
    ('hotpot', r'火鍋|涮涮鍋|麻辣|鴛鴦|壽喜燒|鍋物|涮|shabu'),
    ('bbq', r'燒肉|烤肉|燒烤|牛舌|蒙古烤肉|BBQ|Smokehouse'),
    ('korean', r'韓國|韓式|부대|部隊鍋'),
    ('thai', r'泰國|泰式|南洋'),
    ('vietnamese', r'越南|河粉'),
    ('indian', r'印度|尼泊爾|南亞|斯里蘭卡'),
    ('donburi', r'丼|松屋|吉野家|すき家'),
    ('japanese', r'日本|日式|烏龍麵|蕎麥|豬排|天婦羅|鰻|定食|御好燒|大阪燒|和食|懷石|洋食'),
    ('dessert', r'甜品|甜點|冰品|冰淇淋|GELATO|[Gg]elato|蛋糕|刨冰|豆花|雪糕|巧克力|朱古力|泡芙|奶茶|珍珠|冰菓|SWEETS|[Dd]onut|鬆餅'),
    ('italian', r'意大利|義大利|義式|意式|披薩|薄餅|[Pp]izz|[Pp]asta'),
    ('burger', r'漢堡|[Bb]urger'),
    ('dumpling', r'餃|鍋貼|小籠|包點|包子|饅頭|湯包'),
    ('chinese', r'中菜|中式(?!麵食)|中國|粵菜|港式|茶餐廳|冰室|點心|飲茶|川菜|四川|湘菜|滬菜|上海|江浙|蘇菜|江蘇|北京|烤鴨|酒樓|餡餅'),
    ('western', r'法國|法式|西班牙|墨西哥|美式|歐陸|歐式|歐洲|西式|西餐|扒房|牛排|地中海|希臘|德國|融合|新派|小酒館|[Bb]istro'),
    ('vegetarian', r'素食|蔬食|純素'),
    ('brunch', r'早午餐|早餐|[Bb]runch'),
    ('bakery', r'麵包|烘焙|餅店|糕餅|貝果|可頌|[Bb]akery|BAKERY|[Bb]aking|BAKING'),
    ('cafe', r'咖啡|Coffee|COFFEE|Café|Cafe|CAFE|咖啡館|珈琲'),
    ('bar', r'酒吧|酒館|啤酒|葡萄酒|雞尾酒|威士忌|精釀|Bar\b|BAR\b|bar\b'),
    ('stirfry', r'熱炒|快炒|海鮮'),
    ('bento', r'便當|自助餐'),
    ('taiwanese', r'台灣|台式|臺灣|小吃|滷肉|魯肉|麵店|麵館|粥|夜市|雞排|米粉|切仔麵|擔仔麵|涼麵|中式麵食|豬腳|台菜'),
]

# Google 只給籠統分類時，先看店名，再看分類
GENERIC = re.compile(r'^(餐廳|小餐館|日本餐廳|台灣餐廳|中菜館|美式餐廳|西餐廳|外送速遞餐廳|小食/零食吧|意大利麵食店|現代美式餐廳)$')

# 規則判斷不了、人工確認過的店（店名包含左邊字串就套用右邊類別；None = 不是餐廳，排除）
OVERRIDES = {
    '仕紳品麵': 'beefnoodle', '劉山東': 'beefnoodle', '御牛殿': 'beefnoodle',
    '咖一味咖哩': 'japanese', '奇跡咖哩': 'japanese', '野毛食所': 'japanese',
    '大院子': 'chinese', '雙月食品社': 'taiwanese', '大吉團': 'taiwanese', '雞窩餐廳': 'taiwanese',
    'M One Cafe A11': 'brunch', 'Leaves Cafe&Dining': 'brunch', '饗旅 Brunch': 'brunch', '美好年代 珍珠鬆餅': 'brunch', 'woosa': 'brunch',
    'NEVERLAND Bakery': 'bakery', 'Muhei Bakery': 'bakery', 'Supranormal Bakery': 'bakery', '旭穗': 'bakery',
    '合興壹玖肆柒': 'dessert', '紅葉蛋糕': 'dessert',
    'rén bistronomy': 'western', 'Pattie-O 樂緹歐美式': 'burger', 'PATTIE-O': 'burger', 'Patty Addy': 'burger',
    '五之神': 'ramen', '溫度小館': 'western', 'The Public House': 'bar', 'INDULGE': 'bistro', 'Poetry 如詩': 'brunch',
    '蘋果肉桂': 'cafe', '週末炸雞': 'burger',
    '初の鮨': 'sushi', '知心寮': 'izakaya', 'Neverland Noodle': 'ramen',
    '小莫商行': None,
    # 2026-10-31 使用者確認
    '人間半醒': 'chinese', '那邊 THERE': 'bistro', '嵩 sung': 'bistro', '心潮仙宮': 'bistro',
    '習瑞鎮商行': None, '潤滿堂': 'taiwanese',
}
FOOD = re.compile(r'菜館|菜|餃|包點|館|餐|食|料理|麵|飯|咖啡|甜|麵包|餅|酒吧|酒館|居酒屋|燒|鍋|壽司|小吃|早餐|便當|牛排|披薩|漢堡|茶|冰|點心|海鮮|素|熱炒|丼|bar|Bar|酒舖|扒房|小館')
NOT_FOOD = re.compile(r'酒舖|酒店|飯店|旅館|零售|超市|超級市場|市場|公寓|球場|練習場|批發|食品店|雜貨|商店$|百貨|公園|博物館|攤販市集')
TAIPEI = re.compile(r'(^|[^新])[臺台]北市')

def cuisine_for(cats, name):
    first = cats[0] if cats else ''
    texts = [name, ' '.join(cats)] if (not first or GENERIC.match(first)) else [first, ' '.join(cats), name]
    for text in texts:
        for key, pat in RULES:
            if re.search(pat, text):
                return key
    return None

def price_range(p):
    """Google 價位字串 → (最低, 最高)；「超過 $2,000」最高記成 99999（不封頂）"""
    if not p: return None
    nums = [int(x.replace(',', '')) for x in re.findall(r'[\d,]+', p)]
    if not nums: return None
    if len(nums) >= 2: return (nums[0], nums[1])
    if '超過' in p or '+' in p: return (nums[0], 99999)
    return (nums[0], nums[0])

def price_of(p):
    r = price_range(p)
    if not r: return None
    lo, hi = r
    return round((lo * 1.2 if hi >= 99999 else (lo + hi) / 2) / 10) * 10

rows, skipped = [], []
seen = set()
for j in jobs:
    d = det.get(j.get('cid') or 'star:' + j['name']) or {}
    looks_like_address = re.search(r'\d+號', j['name']) and re.search(r'路|街|巷', j['name'])
    if looks_like_address and not (det.get(j.get('cid') or '') or {}).get('cat'):
        skipped.append((j['name'], 'unnamed pin')); continue
    if not d.get('cat') and not d.get('name'):
        # no Google detail (throttled / not found): keep only if the saved name clearly looks like food
        d = {'name': j['name'], 'cat': [], 'addr': j['addr'], 'lat': j.get('lat'), 'lng': j.get('lng')}
    cats = d.get('cat') or []
    name = j['name'] if j['src'] != 'star' else d.get('name') or j['name']
    addr = d.get('addr') or j.get('addr') or ''
    if not TAIPEI.search(addr) or d.get('lat') is None:
        skipped.append((name, 'not Taipei / no coords')); continue
    if cats and NOT_FOOD.search(cats[0]):
        skipped.append((name, cats[0])); continue
    if cats and not FOOD.search(' '.join(cats)):
        skipped.append((name, cats[0])); continue
    over = next((v for k, v in OVERRIDES.items() if k in name), 'none')
    if over is None:
        skipped.append((name, 'override: not a restaurant')); continue
    key = over if over != 'none' else cuisine_for(cats, name if cats else re.sub(r'\d+號.*', '', name))
    price = price_of(d.get('price'))
    # 沒有特定菜系的餐酒館／小酒館（原本落在西式或酒吧）歸到「餐酒館」
    if key in ('western', 'bar') and re.search(r'餐酒館|小酒館|[Bb]istro|BISTRO', name):
        key = 'bistro'
    # Fine Dining：Google 價位「超過 $2,000」、法式 NT$1,200 以上，或店名直接寫 Fine Dining（酒吧除外）
    if key != 'bar' and ((price or 0) >= 2000 or ((price or 0) >= 1200 and re.search(r'法國|法式', ' '.join(cats))) or re.search(r'fine ?dining', name, re.I)):
        key = 'finedining'
    if not key:
        if not cats:
            skipped.append((name, 'no category')); continue
        skipped.append((name, 'unclassified: ' + cats[0])); continue
    ident = j.get('cid') or name
    if ident in seen: continue
    seen.add(ident)
    hours = d.get('hours')
    if hours:  # drop segments Google gave without clock times
        hours = [[seg for seg in day if seg and None not in seg] for day in hours]
        if not any(hours): hours = None
    tags = []
    if (price or 300) < 250 or key in ('ramen', 'cafe', 'bakery', 'beefnoodle'): tags.append('solo')
    if key in ('hotpot', 'bbq', 'stirfry', 'korean', 'chinese', 'bar', 'western', 'izakaya', 'bistro'): tags.append('group')
    if key == 'finedining': tags.append('quiet')
    if key == 'vegetarian': tags.append('veg')
    if key in ('cafe', 'dessert', 'bakery'): tags.append('quiet')
    if hours and any(b > 23 * 60 + 30 for day in hours for _, b in day): tags.append('late')
    addr = re.sub(r'^\d{3,6}', '', addr).replace('台灣', '')
    addr = re.sub(r'(區)[^區路街段巷號]{1,4}里', r'\1', addr)
    rows.append({
        'name': name, 'cuisine': key, 'gcat': cats[0] if cats else '', 'list': j['src'], 'cid': str(int(j['cid']) % 2**64) if j.get('cid') else None,
        'lat': round(d['lat'], 6), 'lng': round(d['lng'], 6),
        'rating': d.get('rating') or 0, 'reviews': d.get('reviews') or 0, 'price': price,
        'priceRange': price_range(d.get('price')),
        'addr': addr, 'phone': d.get('phone') or '', 'hours': hours, 'tags': tags,
    })

rows.sort(key=lambda r: (r['list'] != 'fav', r['name']))
for i, r in enumerate(rows):
    r['id'] = f'g{i + 1:03d}'
out = ROOT.parent / 'src' / 'data' / 'saved.json'
out.write_text(json.dumps(rows, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')

from collections import Counter
print('kept', len(rows), 'skipped', len(skipped))
print(Counter(r['cuisine'] for r in rows).most_common())
print('no hours', sum(1 for r in rows if not r['hours']), 'no rating', sum(1 for r in rows if not r['rating']))
(ROOT / 'skipped.txt').write_text('\n'.join(f'{n}\t{why}' for n, why in skipped), encoding='utf-8')
