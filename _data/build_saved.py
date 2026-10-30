# Turn the Google Maps saved-places dump (_data/google_saved.json, collected in the user's Chrome)
# into src/data/saved.json: Taipei City food places only, mapped to the app's cuisine keys.
import json, re
from pathlib import Path

ROOT = Path(__file__).parent
raw = json.loads((ROOT / 'google_saved.json').read_text(encoding='utf-8'))
jobs, det = raw['jobs'], raw['det']

# Google category (zh-TW) or store name -> cuisine key; first match wins, so specific rules go first.
RULES = [
    ('ramen', r'拉麵|ラーメン|沾麵'),
    ('beefnoodle', r'牛肉麵'),
    ('sushi', r'壽司|omakase|割烹|無菜單'),
    ('hotpot', r'火鍋|涮涮鍋|麻辣鍋|壽喜燒|鍋物|關東煮'),
    ('bbq', r'燒肉|烤肉|燒烤|串燒|燒鳥|烤雞串|牛舌|蒙古烤肉|BBQ'),
    ('korean', r'韓國|韓式|冷麵|部隊鍋'),
    ('thai', r'泰國|泰式'),
    ('vietnamese', r'越南|河粉|法國麵包'),
    ('indian', r'印度|尼泊爾|南亞|斯里蘭卡'),
    ('donburi', r'丼'),
    ('japanese', r'日本|日式|居酒屋|烏龍麵|蕎麥|豬排|天婦羅|鰻魚|定食|御好燒|大阪燒|和食|懷石|燒鳥'),
    ('dumpling', r'餃|鍋貼|小籠|包點|包子'),
    ('chinese', r'中菜|中式|中國|粵菜|港式|茶餐廳|點心|飲茶|川菜|四川|湘菜|滬菜|上海|江浙|蘇菜|江蘇|北京|烤鴨|酒樓|麵食'),
    ('italian', r'意大利|義大利|義式|意式|披薩|薄餅'),
    ('burger', r'漢堡'),
    ('western', r'法國|法式|西班牙|墨西哥|美式|歐陸|歐式|歐洲|西式|西餐|扒房|牛排|地中海|希臘|德國|融合|新派|小酒館'),
    ('vegetarian', r'素食|蔬食|純素'),
    ('brunch', r'早午餐|早餐'),
    ('bakery', r'麵包|烘焙|餅店|糕餅|貝果|可頌'),
    ('dessert', r'甜品|甜點|冰品|冰淇淋|蛋糕|刨冰|豆花|雪糕|巧克力|朱古力|泡芙|奶茶|珍珠|飲料|果汁'),
    ('cafe', r'咖啡|Coffee|Café|Cafe|咖啡館'),
    ('bar', r'酒吧|酒館|啤酒|葡萄酒|雞尾酒|威士忌|精釀|Bar|bar|酒舖|酒鋪'),
    ('stirfry', r'熱炒|快炒|海鮮'),
    ('bento', r'便當|自助餐'),
    ('taiwanese', r'台灣|台式|臺灣|小吃|滷肉|魯肉|麵店|麵館|粥|夜市|雞排|米粉|切仔麵|擔仔麵'),
]
FOOD = re.compile(r'菜館|菜|餃|包點|館|餐|食|料理|麵|飯|咖啡|甜|麵包|餅|酒吧|酒館|居酒屋|燒|鍋|壽司|小吃|早餐|便當|牛排|披薩|漢堡|茶|冰|點心|海鮮|素|熱炒|丼|bar|Bar|酒舖|扒房|小館')
NOT_FOOD = re.compile(r'酒店|飯店|旅館|零售|專賣|超市|超級市場|市場|公寓|球場|練習場|批發|食品店|雜貨|商店$|百貨|公園|博物館|攤販市集')
TAIPEI = re.compile(r'(^|[^新])[臺台]北市')

def cuisine_for(cats, name):
    for text in [' '.join(cats[:1]), ' '.join(cats), name]:
        for key, pat in RULES:
            if re.search(pat, text):
                return key
    return None

def price_of(p):
    if not p: return None
    nums = [int(x.replace(',', '')) for x in re.findall(r'[\d,]+', p)]
    if not nums: return None
    if len(nums) >= 2: return round((nums[0] + nums[1]) / 2 / 10) * 10
    return round(nums[0] * (1.2 if '超過' in p or '+' in p else 1) / 10) * 10

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
    key = cuisine_for(cats, name if cats else re.sub(r'\d+號.*', '', name))
    if not key:
        if not cats:
            skipped.append((name, 'no category')); continue
        key = 'western' if '小餐館' in cats[0] or '餐廳' == cats[0] else 'taiwanese'
    ident = j.get('cid') or name
    if ident in seen: continue
    seen.add(ident)
    price = price_of(d.get('price'))
    hours = d.get('hours')
    if hours:  # drop segments Google gave without clock times
        hours = [[seg for seg in day if seg and None not in seg] for day in hours]
        if not any(hours): hours = None
    tags = []
    if (price or 300) < 250 or key in ('ramen', 'cafe', 'bakery', 'beefnoodle'): tags.append('solo')
    if key in ('hotpot', 'bbq', 'stirfry', 'korean', 'chinese', 'bar', 'western'): tags.append('group')
    if key == 'vegetarian': tags.append('veg')
    if key in ('cafe', 'dessert', 'bakery'): tags.append('quiet')
    if hours and any(b > 23 * 60 + 30 for day in hours for _, b in day): tags.append('late')
    addr = re.sub(r'^\d{3,6}', '', addr).replace('台灣', '')
    addr = re.sub(r'(區)[^區路街段巷號]{1,4}里', r'\1', addr)
    rows.append({
        'name': name, 'cuisine': key, 'gcat': cats[0] if cats else '', 'list': j['src'], 'cid': str(int(j['cid']) % 2**64) if j.get('cid') else None,
        'lat': round(d['lat'], 6), 'lng': round(d['lng'], 6),
        'rating': d.get('rating') or 0, 'reviews': d.get('reviews') or 0, 'price': price,
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
