import { CUISINE_MAP, DEMO, type CuisineKey, type Restaurant, type TagKey } from './restaurants'
import saved from './saved.json'

// 使用者 Google 地圖收藏（台北市）匯入的真實店家。saved.json 由 _data/build_saved.py 產生。
// 評分、評論數、營業時間是匯入當下從 Google 地圖抓的快照；正式版要改成 Places API 即時查詢（條款不允許長期快取評分）。

interface SavedRow {
  id: string
  name: string
  cuisine: string
  gcat: string
  list: 'want' | 'fav' | 'star'
  cid?: string
  lat: number
  lng: number
  rating: number
  reviews: number
  price: number | null
  addr: string
  phone: string
  hours: [number, number][][] | null
  tags: string[]
}

export const SAVED: Restaurant[] = (saved as SavedRow[]).map(g => {
  const c = CUISINE_MAP[g.cuisine as CuisineKey]
  return {
    id: g.id,
    name: { zh: g.name, en: g.name },
    cuisine: c.key,
    price: g.price ?? Math.round((c.price[0] + c.price[1]) / 20) * 10,
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
    google: { cat: g.gcat, cid: g.cid, list: g.list },
  }
})

export type Source = 'saved' | 'demo' | 'all'

export const SOURCES: Record<Source, Restaurant[]> = { saved: SAVED, demo: DEMO, all: [...SAVED, ...DEMO] }
export const BY_ID: Record<string, Restaurant> = Object.fromEntries(SOURCES.all.map(r => [r.id, r]))
