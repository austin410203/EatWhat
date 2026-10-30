import { CUISINE_MAP, DEMO, type CuisineKey, type Restaurant, type TagKey } from './restaurants'
import saved from './saved.json'
import { getState } from '../lib/store'

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
  priceRange: [number, number] | null
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
    google: { cat: g.gcat, cid: g.cid, list: g.list },
  }
})

export type Source = 'saved' | 'demo' | 'all'

export const SOURCES: Record<Source, Restaurant[]> = { saved: SAVED, demo: DEMO, all: [...SAVED, ...DEMO] }
const BASE: Record<string, Restaurant> = Object.fromEntries(SOURCES.all.map(r => [r.id, r]))

// 套上管理員修改後的店家資料；edits 物件換了才重算
let cacheFor: object | null = null
let cache: Record<string, Restaurant> = BASE
function edited(): Record<string, Restaurant> {
  const edits = getState().edits
  if (edits === cacheFor) return cache
  cacheFor = edits
  cache = { ...BASE }
  for (const [id, e] of Object.entries(edits)) {
    const r = BASE[id]
    if (!r) continue
    const pr = e.priceRange !== undefined ? e.priceRange : r.priceRange
    cache[id] = {
      ...r,
      cuisine: e.cuisine ?? r.cuisine,
      priceRange: pr,
      price: pr ? Math.round((pr[1] >= 99999 ? pr[0] * 1.2 : (pr[0] + pr[1]) / 2) / 10) * 10 : r.price,
      edited: true,
    }
  }
  return cache
}

/** 依 id 取店家（含管理員修改） */
export function place(id: string): Restaurant | undefined {
  return edited()[id]
}

/** 某個資料來源的全部店家（含管理員修改） */
export function placesOf(src: Source): Restaurant[] {
  const all = edited()
  return SOURCES[src].map(r => all[r.id])
}
