// 測試用假資料：店名、評分、營業時間都是程式產生的，不對應真實店家。
// 之後接 Google Places／開放資料時，只要產出同樣的 Restaurant 結構即可替換。

export type CuisineKey =
  | 'taiwanese' | 'bento' | 'beefnoodle' | 'dumpling' | 'ramen' | 'donburi' | 'sushi'
  | 'hotpot' | 'bbq' | 'korean' | 'thai' | 'vietnamese' | 'indian' | 'italian'
  | 'burger' | 'brunch' | 'cafe' | 'vegetarian' | 'dessert' | 'bar' | 'stirfry'
  | 'japanese' | 'chinese' | 'western' | 'bakery' | 'izakaya' | 'finedining'

export interface Cuisine {
  key: CuisineKey
  zh: string
  en: string
  emoji: string
  hue: number
  price: [number, number] // 每人均消範圍
  hours: HoursPattern
  suffix: [string, string][]
  dishes: [string, string][]
}

type HoursPattern = 'split' | 'allday' | 'brunch' | 'cafe' | 'night' | 'late'

export const CUISINES: Cuisine[] = [
  { key: 'taiwanese', zh: '台式小吃', en: 'Taiwanese', emoji: '🥢', hue: 28, price: [80, 200], hours: 'allday',
    suffix: [['小吃部', 'Snack Bar'], ['滷肉飯', 'Braised Pork Rice'], ['古早味', 'Old Taste']],
    dishes: [['滷肉飯', 'Braised pork rice'], ['蚵仔煎', 'Oyster omelette'], ['貢丸湯', 'Meatball soup'], ['燙青菜', 'Blanched greens']] },
  { key: 'bento', zh: '便當', en: 'Bento', emoji: '🍱', hue: 40, price: [90, 160], hours: 'split',
    suffix: [['便當', 'Bento'], ['飯包', 'Rice Box'], ['食堂', 'Diner']],
    dishes: [['排骨便當', 'Pork chop bento'], ['雞腿便當', 'Chicken leg bento'], ['鯖魚便當', 'Mackerel bento']] },
  { key: 'beefnoodle', zh: '牛肉麵', en: 'Beef Noodles', emoji: '🍜', hue: 14, price: [150, 320], hours: 'split',
    suffix: [['牛肉麵', 'Beef Noodles'], ['麵館', 'Noodle House']],
    dishes: [['紅燒牛肉麵', 'Braised beef noodles'], ['清燉牛肉麵', 'Clear broth beef noodles'], ['滷味拼盤', 'Braised sides']] },
  { key: 'dumpling', zh: '水餃鍋貼', en: 'Dumplings', emoji: '🥟', hue: 46, price: [70, 160], hours: 'allday',
    suffix: [['水餃館', 'Dumpling House'], ['鍋貼', 'Potstickers']],
    dishes: [['高麗菜水餃', 'Cabbage dumplings'], ['韭菜鍋貼', 'Chive potstickers'], ['酸辣湯', 'Hot & sour soup']] },
  { key: 'ramen', zh: '拉麵', en: 'Ramen', emoji: '🍥', hue: 4, price: [220, 380], hours: 'split',
    suffix: [['拉麵', 'Ramen'], ['麵屋', 'Menya']],
    dishes: [['豚骨拉麵', 'Tonkotsu ramen'], ['雞白湯拉麵', 'Chicken paitan'], ['溏心蛋', 'Ajitama egg']] },
  { key: 'donburi', zh: '日式丼飯', en: 'Donburi', emoji: '🍚', hue: 34, price: [160, 300], hours: 'split',
    suffix: [['丼飯', 'Donburi'], ['食堂', 'Shokudo']],
    dishes: [['親子丼', 'Oyakodon'], ['炙燒鮭魚丼', 'Seared salmon don'], ['豬排丼', 'Katsudon']] },
  { key: 'sushi', zh: '壽司', en: 'Sushi', emoji: '🍣', hue: 350, price: [300, 1200], hours: 'split',
    suffix: [['壽司', 'Sushi'], ['鮨', 'Sushi-ya']],
    dishes: [['握壽司拼盤', 'Nigiri set'], ['海膽軍艦', 'Uni gunkan'], ['味噌湯', 'Miso soup']] },
  { key: 'hotpot', zh: '火鍋', en: 'Hot Pot', emoji: '🍲', hue: 0, price: [350, 900], hours: 'late',
    suffix: [['鍋物', 'Hot Pot'], ['麻辣鍋', 'Mala Pot'], ['涮涮鍋', 'Shabu']],
    dishes: [['麻辣鴨血', 'Mala duck blood'], ['手切牛五花', 'Hand-cut beef'], ['豆腐拼盤', 'Tofu platter']] },
  { key: 'bbq', zh: '燒肉', en: 'BBQ', emoji: '🥩', hue: 10, price: [500, 1400], hours: 'night',
    suffix: [['燒肉', 'Yakiniku'], ['炭火燒', 'Charcoal Grill']],
    dishes: [['和牛拼盤', 'Wagyu platter'], ['厚切牛舌', 'Thick beef tongue'], ['石鍋拌飯', 'Stone pot rice']] },
  { key: 'korean', zh: '韓式料理', en: 'Korean', emoji: '🌶️', hue: 356, price: [200, 450], hours: 'split',
    suffix: [['韓食堂', 'Korean Kitchen'], ['炸雞', 'Fried Chicken']],
    dishes: [['韓式炸雞', 'Korean fried chicken'], ['部隊鍋', 'Army stew'], ['海鮮煎餅', 'Seafood pancake']] },
  { key: 'thai', zh: '泰式料理', en: 'Thai', emoji: '🥥', hue: 52, price: [200, 450], hours: 'split',
    suffix: [['泰式廚房', 'Thai Kitchen'], ['泰味', 'Thai Taste']],
    dishes: [['打拋豬', 'Pad kra pao'], ['綠咖哩', 'Green curry'], ['月亮蝦餅', 'Shrimp cake']] },
  { key: 'vietnamese', zh: '越南料理', en: 'Vietnamese', emoji: '🥖', hue: 96, price: [130, 260], hours: 'allday',
    suffix: [['河粉', 'Pho'], ['越式小館', 'Viet Bistro']],
    dishes: [['生牛肉河粉', 'Rare beef pho'], ['法國麵包', 'Banh mi'], ['春捲', 'Spring rolls']] },
  { key: 'indian', zh: '印度料理', en: 'Indian', emoji: '🍛', hue: 30, price: [250, 500], hours: 'split',
    suffix: [['印度廚房', 'Indian Kitchen'], ['咖哩屋', 'Curry House']],
    dishes: [['奶油雞', 'Butter chicken'], ['蒜味烤餅', 'Garlic naan'], ['印度奶茶', 'Masala chai']] },
  { key: 'italian', zh: '義式料理', en: 'Italian', emoji: '🍝', hue: 120, price: [300, 800], hours: 'split',
    suffix: [['義式餐館', 'Trattoria'], ['披薩', 'Pizzeria']],
    dishes: [['瑪格麗特披薩', 'Margherita pizza'], ['青醬燉飯', 'Pesto risotto'], ['提拉米蘇', 'Tiramisu']] },
  { key: 'burger', zh: '美式漢堡', en: 'Burgers', emoji: '🍔', hue: 22, price: [220, 450], hours: 'allday',
    suffix: [['漢堡', 'Burgers'], ['美式餐館', 'Diner']],
    dishes: [['招牌牛肉堡', 'Signature burger'], ['松露薯條', 'Truffle fries'], ['奶昔', 'Milkshake']] },
  { key: 'brunch', zh: '早午餐', en: 'Brunch', emoji: '🥞', hue: 44, price: [180, 380], hours: 'brunch',
    suffix: [['早午餐', 'Brunch'], ['晨光', 'Morning']],
    dishes: [['班尼迪克蛋', 'Eggs Benedict'], ['鬆餅', 'Pancakes'], ['拿鐵', 'Latte']] },
  { key: 'cafe', zh: '咖啡廳', en: 'Café', emoji: '☕', hue: 26, price: [150, 350], hours: 'cafe',
    suffix: [['咖啡', 'Coffee'], ['珈琲', 'Kissa']],
    dishes: [['手沖咖啡', 'Pour-over coffee'], ['肉桂捲', 'Cinnamon roll'], ['鹹派', 'Quiche']] },
  { key: 'vegetarian', zh: '蔬食', en: 'Vegetarian', emoji: '🥗', hue: 110, price: [150, 400], hours: 'split',
    suffix: [['蔬食', 'Veggie'], ['植物廚房', 'Plant Kitchen']],
    dishes: [['蔬菜咖哩', 'Veggie curry'], ['藜麥沙拉', 'Quinoa salad'], ['豆腐排', 'Tofu steak']] },
  { key: 'dessert', zh: '甜點', en: 'Desserts', emoji: '🍰', hue: 330, price: [120, 300], hours: 'cafe',
    suffix: [['甜點', 'Patisserie'], ['豆花', 'Douhua']],
    dishes: [['芒果冰', 'Mango shaved ice'], ['檸檬塔', 'Lemon tart'], ['花生豆花', 'Peanut douhua']] },
  { key: 'bar', zh: '酒吧', en: 'Bar', emoji: '🍸', hue: 268, price: [400, 900], hours: 'late',
    suffix: [['酒吧', 'Bar'], ['餐酒館', 'Bistro']],
    dishes: [['招牌調酒', 'Signature cocktail'], ['炸物拼盤', 'Fried platter'], ['精釀啤酒', 'Craft beer']] },
  { key: 'stirfry', zh: '熱炒', en: 'Stir-fry', emoji: '🍤', hue: 18, price: [250, 500], hours: 'late',
    suffix: [['熱炒', 'Stir-fry'], ['快炒', 'Wok House']],
    dishes: [['三杯雞', 'Three-cup chicken'], ['炒水蓮', 'Stir-fried water lily'], ['鹽酥蝦', 'Salt & pepper shrimp']] },
  // 以下 4 類是匯入 Google 收藏時加的，測試假店家不會用到
  { key: 'japanese', zh: '日式料理', en: 'Japanese', emoji: '🍶', hue: 4, price: [300, 900], hours: 'split',
    suffix: [['居酒屋', 'Izakaya'], ['食堂', 'Shokudo']],
    dishes: [['燒鳥', 'Yakitori'], ['生魚片', 'Sashimi'], ['定食', 'Set meal']] },
  { key: 'chinese', zh: '中式料理', en: 'Chinese', emoji: '🥢', hue: 8, price: [300, 800], hours: 'split',
    suffix: [['小館', 'Bistro'], ['酒樓', 'Restaurant']],
    dishes: [['小籠包', 'Xiaolongbao'], ['港式點心', 'Dim sum'], ['紅燒獅子頭', 'Braised meatballs']] },
  { key: 'western', zh: '西式餐廳', en: 'Western', emoji: '🍽️', hue: 20, price: [500, 1500], hours: 'split',
    suffix: [['餐酒館', 'Bistro'], ['小館', 'Brasserie']],
    dishes: [['牛排', 'Steak'], ['燉飯', 'Risotto'], ['油封鴨', 'Duck confit']] },
  { key: 'bakery', zh: '麵包烘焙', en: 'Bakery', emoji: '🥐', hue: 36, price: [80, 250], hours: 'cafe',
    suffix: [['麵包店', 'Bakery'], ['烘焙坊', 'Bakehouse']],
    dishes: [['可頌', 'Croissant'], ['肉桂捲', 'Cinnamon roll'], ['酸種麵包', 'Sourdough']] },
  { key: 'izakaya', zh: '居酒屋', en: 'Izakaya', emoji: '🏮', hue: 6, price: [400, 1000], hours: 'late',
    suffix: [['居酒屋', 'Izakaya'], ['串燒', 'Yakitori']],
    dishes: [['串燒', 'Yakitori'], ['唐揚雞', 'Karaage'], ['生啤酒', 'Draft beer']] },
  { key: 'finedining', zh: 'Fine Dining', en: 'Fine Dining', emoji: '🍷', hue: 340, price: [2000, 5000], hours: 'night',
    suffix: [['餐廳', 'Restaurant']],
    dishes: [['主廚套餐', "Chef's tasting menu"], ['餐酒搭配', 'Wine pairing']] },
]

export const CUISINE_MAP = Object.fromEntries(CUISINES.map(c => [c.key, c])) as Record<CuisineKey, Cuisine>

export type TagKey = 'solo' | 'group' | 'kids' | 'pet' | 'veg' | 'private' | 'quiet' | 'late'
export const TAGS: Record<TagKey, [string, string]> = {
  solo: ['一人食', 'Solo-friendly'],
  group: ['適合聚餐', 'Good for groups'],
  kids: ['親子友善', 'Kid-friendly'],
  pet: ['寵物友善', 'Pet-friendly'],
  veg: ['有素食選項', 'Veg options'],
  private: ['可包場', 'Private events'],
  quiet: ['安靜好聊', 'Quiet'],
  late: ['宵夜', 'Late night'],
}

export interface Review { who: string; avatar: string; stars: number; daysAgo: number; zh: string; en: string }

export interface Restaurant {
  id: string
  name: { zh: string; en: string }
  cuisine: CuisineKey
  price: number
  lat: number
  lng: number
  rating: number
  reviews: number
  /** 每週營業時間，index 0 = 週日；每段是 [開始分鐘, 結束分鐘]，結束可大於 1440 表示跨夜。null = 沒有資料 */
  hours: [number, number][][] | null
  phone: string
  address: { zh: string; en: string }
  tags: TagKey[]
  dishes: [string, string][]
  sampleReviews: Review[]
  sponsored: boolean
  /** 從使用者 Google 地圖收藏匯入的真實店家 */
  google?: { cat: string; cid?: string; list: 'want' | 'fav' | 'star' }
}

/** 模擬的使用者位置（中山站附近）。假資料都散布在這一帶。 */
export const HOME = { lat: 25.0526, lng: 121.5204 }

function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const PREFIX: [string, string][] = [
  ['阿明', 'A-Ming'], ['巷口', 'Alley'], ['小樹', 'Little Tree'], ['晴天', 'Sunny'], ['森川', 'Morikawa'],
  ['好日', 'Good Day'], ['金魚', 'Goldfish'], ['老街', 'Old Street'], ['月見', 'Tsukimi'], ['山丘', 'Hillside'],
  ['橘子', 'Orange'], ['胖胖', 'Chubby'], ['白鷺', 'Egret'], ['青田', 'Green Field'], ['小島', 'Islet'],
  ['燈塔', 'Lighthouse'], ['雨天', 'Rainy Day'], ['大稻', 'Dadao'], ['北門', 'North Gate'], ['貓咪', 'Kitty'],
  ['初二', 'Day Two'], ['藍屋', 'Blue House'], ['紅磚', 'Red Brick'], ['七號', 'No.7'], ['南風', 'South Wind'],
  ['木木', 'Mumu'], ['阿嬤', "Grandma's"], ['鐵道', 'Railway'], ['晚安', 'Goodnight'], ['滿月', 'Full Moon'],
]

const STREETS: [string, string][] = [
  ['中山北路二段', 'Sec. 2, Zhongshan N. Rd.'], ['南京西路', 'Nanjing W. Rd.'], ['長安西路', "Chang'an W. Rd."],
  ['林森北路', 'Linsen N. Rd.'], ['赤峰街', 'Chifeng St.'], ['民生西路', 'Minsheng W. Rd.'],
  ['承德路二段', 'Sec. 2, Chengde Rd.'], ['錦州街', 'Jinzhou St.'], ['天津街', 'Tianjin St.'], ['新生北路', 'Xinsheng N. Rd.'],
]

const REVIEW_POOL: { s: number; zh: string; en: string }[] = [
  { s: 5, zh: '湯頭很濃，下次還會再來', en: 'Rich broth, will come back' },
  { s: 5, zh: '老闆很親切，份量大', en: 'Friendly owner, big portions' },
  { s: 4, zh: '好吃但要排隊，建議早點來', en: 'Tasty but there is a queue, come early' },
  { s: 4, zh: 'CP 值高，適合午餐', en: 'Great value, good for lunch' },
  { s: 4, zh: '環境乾淨，上菜快', en: 'Clean and fast service' },
  { s: 3, zh: '普通，沒有特別驚艷', en: 'Okay, nothing special' },
  { s: 3, zh: '口味偏鹹，價格稍高', en: 'A bit salty and pricey' },
  { s: 2, zh: '等太久了，服務要加強', en: 'Waited too long' },
  { s: 5, zh: '朋友聚餐首選，氣氛很好', en: 'Great vibe for friends' },
  { s: 4, zh: '甜點意外地好吃', en: 'Desserts were a surprise' },
]
const AVATARS = ['🐻', '🐼', '🦊', '🐱', '🐶', '🐰', '🐸', '🐨', '🐯', '🐧']
const NAMES = ['小熊', 'Panda', '阿狐', 'Mia', '大頭', 'Kevin', '蛙蛙', 'Yuki', '老虎', 'Penny']

function hoursFor(p: HoursPattern, rnd: () => number): [number, number][][] {
  const h = (a: number, b: number): [number, number] => [a * 60, b * 60]
  let day: [number, number][]
  switch (p) {
    case 'split': day = [h(11, 14.5), h(17, 21)]; break
    case 'allday': day = [h(10.5, 20.5 + Math.round(rnd() * 2))]; break
    case 'brunch': day = [h(7.5 + Math.round(rnd()), 15)]; break
    case 'cafe': day = [h(10, 19 + Math.round(rnd() * 3))]; break
    case 'night': day = [h(17, 23)]; break
    case 'late': day = [h(17.5, 25 + Math.round(rnd() * 2))]; break
  }
  const closed = Math.floor(rnd() * 9) // 0..6 某天公休，7..8 全年無休
  return Array.from({ length: 7 }, (_, i) => (i === closed ? [] : day.map(s => [...s] as [number, number])))
}

// 假店家只用原本 21 類，新增料理類別時測試資料不會變
const DEMO_CUISINES = CUISINES.slice(0, 21)

function build(): Restaurant[] {
  const rnd = mulberry32(20210410)
  const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)]
  const out: Restaurant[] = []
  const used = new Set<string>()
  const N = 96
  for (let i = 0; i < N; i++) {
    const c = DEMO_CUISINES[i % DEMO_CUISINES.length]
    let pre = pick(PREFIX), suf = pick(c.suffix)
    while (used.has(pre[0] + suf[0])) { pre = pick(PREFIX); suf = pick(c.suffix) }
    used.add(pre[0] + suf[0])

    // 距離偏向近處：0.1–3 km
    const dist = 0.1 + Math.pow(rnd(), 1.3) * 2.9
    const ang = rnd() * Math.PI * 2
    const lat = HOME.lat + (dist / 111) * Math.sin(ang)
    const lng = HOME.lng + (dist / (111 * Math.cos((HOME.lat * Math.PI) / 180))) * Math.cos(ang)

    // 評分與評論數；少數店家是「評論很少卻滿分」，用來測試可信分數
    let reviews = Math.round(20 + Math.pow(rnd(), 2) * 2400)
    let rating = Math.round((3.4 + rnd() * 1.5) * 10) / 10
    if (i % 13 === 5) { reviews = 3 + Math.floor(rnd() * 9); rating = 5.0 }
    if (i % 17 === 3) { reviews = 8 + Math.floor(rnd() * 10); rating = 4.9 }
    rating = Math.min(5, rating)

    const price = Math.round((c.price[0] + rnd() * (c.price[1] - c.price[0])) / 10) * 10

    const tags = new Set<TagKey>()
    if (price < 200 || c.key === 'ramen') tags.add('solo')
    if (['hotpot', 'bbq', 'stirfry', 'korean', 'bar', 'italian'].includes(c.key)) tags.add('group')
    if (c.key === 'vegetarian' || rnd() < 0.2) tags.add('veg')
    if (c.hours === 'late') tags.add('late')
    if (rnd() < 0.18) tags.add('kids')
    if (rnd() < 0.12) tags.add('pet')
    if (['bar', 'italian', 'bbq'].includes(c.key) && rnd() < 0.5) tags.add('private')
    if (['cafe', 'dessert', 'brunch'].includes(c.key) && rnd() < 0.5) tags.add('quiet')

    const st = pick(STREETS)
    const no = 1 + Math.floor(rnd() * 180)
    const sampleReviews: Review[] = Array.from({ length: Math.min(reviews, 4 + Math.floor(rnd() * 3)) }, () => {
      const r = pick(REVIEW_POOL)
      const k = Math.floor(rnd() * AVATARS.length)
      const stars = Math.max(1, Math.min(5, Math.round(r.s + (rating - 4.1))))
      return { who: NAMES[k], avatar: AVATARS[k], stars, daysAgo: 1 + Math.floor(rnd() * 200), zh: r.zh, en: r.en }
    }).sort((a, b) => a.daysAgo - b.daysAgo)

    out.push({
      id: 'r' + String(i + 1).padStart(3, '0'),
      name: { zh: pre[0] + suf[0], en: `${pre[1]} ${suf[1]}` },
      cuisine: c.key,
      price,
      lat, lng, rating, reviews,
      hours: hoursFor(c.hours, rnd),
      phone: `02-25${String(10 + Math.floor(rnd() * 90))}-${String(Math.floor(rnd() * 1e4)).padStart(4, '0')}`,
      address: { zh: `台北市中山區${st[0]}${no}號`, en: `No.${no}, ${st[1]}, Zhongshan Dist., Taipei` },
      tags: [...tags],
      dishes: c.dishes,
      sampleReviews,
      sponsored: i % 23 === 7,
    })
  }
  return out
}

/** 測試用假店家 */
export const DEMO: Restaurant[] = build()
