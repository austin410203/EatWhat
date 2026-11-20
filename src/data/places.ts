import { CUISINE_MAP, DEMO, type CuisineKey, type Restaurant, type TagKey } from './restaurants'
import bundled from './saved.json'

// 真實店家：來自後台資料庫（Worker /api/places，KV），網頁和 iOS App 開啟時都會讀最新版（src/lib/api.ts loadPlaces）。
// 讀到的資料存一份在 localStorage（eatwhat.places），離線或伺服器沒回應時用快取；第一次開又沒網路時用打包的 saved.json。
// 評分、評論數、營業時間是匯入當下從 Google 地圖抓的快照，之後由管理員在後台維護。

export interface SavedRow {
  id: string
  name: string
  cuisine: string
  gcat: string
  list: 'want' | 'fav' | 'star'
  cid?: string | null
  lat: number
  lng: number
  rating: number
  reviews: number
  price: number | null
  priceRange: [number, number] | null
  addr: string
  phone: string
  hours: [number, number][][] | null
  tags: string[]
  /** 後台上傳的照片版本（時間戳）；有值就用 /api/photo/<id> */
  photo?: number
  // 以下是 2026-11-20 加入東京店家時新增，台北的舊資料沒有
  city?: string
  area?: string
  areaName?: string
  desc?: string
  nameAlt?: string
  src?: 'google' | 'tabelog'
  tlUrl?: string
  badges?: string[]
  priceNote?: string
  hoursNote?: string
  access?: string
  gq?: string
}

export interface PlacesData { ver: number; list: SavedRow[] }

const CACHE = 'eatwhat.places'

function cached(): PlacesData {
  try {
    const c = JSON.parse(localStorage.getItem(CACHE) || 'null')
    if (c && Array.isArray(c.list)) return c
  } catch { /* 無痕或封鎖儲存 */ }
  return { ver: -1, list: bundled as SavedRow[] }
}

function toRestaurant(g: SavedRow): Restaurant {
  const c = CUISINE_MAP[g.cuisine as CuisineKey] ?? CUISINE_MAP.taiwanese
  return {
    id: g.id,
    name: { zh: g.name, en: g.nameAlt || g.name },
    cuisine: c.key,
    price: g.price ?? Math.round((c.price[0] + c.price[1]) / 20) * 10,
    priceRange: g.priceRange,
    lat: g.lat,
    lng: g.lng,
    rating: g.rating,
    reviews: g.reviews,
    hours: g.hours,
    phone: g.phone,
    address: { zh: g.addr, en: g.addr },
    tags: g.tags as TagKey[],
    dishes: [],
    sampleReviews: [],
    sponsored: false,
    google: g.src === 'tabelog' ? undefined : { cat: g.gcat, cid: g.cid ?? undefined, list: g.list },
    photo: g.photo,
    city: g.city || 'taipei',
    area: g.area,
    areaName: g.areaName,
    desc: g.desc,
    nameAlt: g.nameAlt,
    tabelog: g.src === 'tabelog' && g.tlUrl ? { url: g.tlUrl, badges: g.badges ?? [] } : undefined,
    priceNote: g.priceNote,
    hoursNote: g.hoursNote,
    access: g.access,
    gq: g.gq,
  }
}

export type Source = 'saved' | 'demo' | 'all'

let data = cached()
let saved: Restaurant[] = []
let byId: Record<string, Restaurant> = {}
let sources: Record<Source, Restaurant[]>

function rebuild() {
  saved = data.list.map(toRestaurant)
  sources = { saved, demo: DEMO, all: [...saved, ...DEMO] }
  byId = Object.fromEntries(sources.all.map(r => [r.id, r]))
}
rebuild()

/** 目前資料版本（-1 = 還沒從伺服器讀過） */
export function placesVersion() { return data.ver }

/** 原始資料（後台編輯用） */
export function rawPlace(id: string): SavedRow | undefined { return data.list.find(r => r.id === id) }
export function rawPlaces(): SavedRow[] { return data.list }

/** 換成伺服器的新資料 */
export function setPlaces(next: PlacesData) {
  data = next
  try { localStorage.setItem(CACHE, JSON.stringify(next)) } catch { /* 容量不足時只放記憶體 */ }
  rebuild()
}

/** 依 id 取店家 */
export function place(id: string): Restaurant | undefined {
  return byId[id]
}

/** 某個資料來源的全部店家 */
export function placesOf(src: Source): Restaurant[] {
  return sources[src]
}

/** 城市裡的區域（依店家資料整理），center = 該區店家座標平均 */
export function areasOf(city: string): { code: string; name: string; count: number; center: { lat: number; lng: number } }[] {
  const m = new Map<string, { code: string; name: string; count: number; lat: number; lng: number }>()
  for (const r of saved) {
    if (r.city !== city || !r.area) continue
    const a = m.get(r.area) ?? { code: r.area, name: r.areaName || r.area, count: 0, lat: 0, lng: 0 }
    a.count++; a.lat += r.lat; a.lng += r.lng
    m.set(r.area, a)
  }
  return [...m.values()].sort((a, b) => a.code.localeCompare(b.code))
    .map(a => ({ code: a.code, name: a.name, count: a.count, center: { lat: a.lat / a.count, lng: a.lng / a.count } }))
}

/** 每個城市有幾家 */
export function cityCounts(): Record<string, number> {
  const c: Record<string, number> = {}
  for (const r of saved) c[r.city] = (c[r.city] ?? 0) + 1
  return c
}
