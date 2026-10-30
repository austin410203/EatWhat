import type { Restaurant } from '../data/restaurants'
import { home } from './location'
import { placesOf } from '../data/places'
import type { Filters, State } from './store'

export function distanceKm(r: { lat: number; lng: number }, from = home()) {
  const R = 6371, rad = Math.PI / 180
  const dLat = (r.lat - from.lat) * rad, dLng = (r.lng - from.lng) * rad
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(from.lat * rad) * Math.cos(r.lat * rad) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

export const walkMin = (km: number) => Math.max(1, Math.round((km * 1.25 * 1000) / 75))

export function fmtDist(km: number) {
  return km < 1 ? `${Math.round(km * 100) * 10} m` : `${km.toFixed(1)} km`
}

/**
 * 可信分數：把評分往全體平均值拉，評論數越少拉得越多（貝氏平均）。
 * 5.0 分但只有 6 則評論的店，可信分數會掉到 4 以下。
 */
const PRIOR_MEAN = 3.9
const PRIOR_WEIGHT = 40
export function trustScore(r: Restaurant) {
  const v = r.reviews
  return Math.round(((v * r.rating + PRIOR_WEIGHT * PRIOR_MEAN) / (v + PRIOR_WEIGHT)) * 10) / 10
}

/** 推薦模式要排除的店：評論數太少，或高分但評論極少（疑似灌分） */
export function lowConfidence(r: Restaurant) {
  return r.reviews < 30 && !noRating(r)
}

/** 匯入的 Google 收藏裡，沒抓到評分資料的店（評分顯示「—」，不算灌分嫌疑） */
export function noRating(r: Restaurant) {
  return !!r.google && !r.reviews
}

/** 在 Google 地圖打開這家店（真實店家用 cid，假店家用座標） */
export function googleUrl(r: Restaurant) {
  return r.google?.cid ? `https://maps.google.com/?cid=${r.google.cid}` : `https://www.google.com/maps/search/?api=1&query=${r.lat},${r.lng}`
}

export interface OpenStatus { open: boolean; closingSoon: boolean; unknown?: boolean; text: [string, string] }

const hm = (m: number) => {
  const mm = ((m % 1440) + 1440) % 1440
  return `${String(Math.floor(mm / 60)).padStart(2, '0')}:${String(mm % 60).padStart(2, '0')}`
}

export function openStatus(r: Restaurant, now = new Date()): OpenStatus {
  if (!r.hours) return { open: false, closingSoon: false, unknown: true, text: ['營業時間未提供', 'Hours unknown'] }
  const hours = r.hours
  const day = now.getDay()
  const min = now.getHours() * 60 + now.getMinutes()
  // 前一天跨夜的時段
  const prev = hours[(day + 6) % 7]
  for (const [a, b] of prev) {
    if (b > 1440 && min < b - 1440) {
      const left = b - 1440 - min
      return { open: true, closingSoon: left <= 45, text: [`營業到 ${hm(b)}`, `Open until ${hm(b)}`] }
    }
    void a
  }
  for (const [a, b] of hours[day]) {
    if (min >= a && min < b) {
      const left = b - min
      return { open: true, closingSoon: left <= 45, text: [`營業到 ${hm(b)}`, `Open until ${hm(b)}`] }
    }
  }
  const later = hours[day].find(([a]) => a > min)
  if (later) return { open: false, closingSoon: false, text: [`${hm(later[0])} 開門`, `Opens ${hm(later[0])}`] }
  for (let k = 1; k <= 7; k++) {
    const d = hours[(day + k) % 7]
    if (d.length) {
      const wd = ['日', '一', '二', '三', '四', '五', '六'][(day + k) % 7]
      const wdEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][(day + k) % 7]
      return k === 1
        ? { open: false, closingSoon: false, text: [`明天 ${hm(d[0][0])} 開門`, `Opens tomorrow ${hm(d[0][0])}`] }
        : { open: false, closingSoon: false, text: [`週${wd} ${hm(d[0][0])} 開門`, `Opens ${wdEn} ${hm(d[0][0])}`] }
    }
  }
  return { open: false, closingSoon: false, text: ['暫停營業', 'Closed'] }
}

export function hoursText(r: Restaurant, day: number): [string, string] {
  if (!r.hours) return ['未提供', 'Unknown']
  const d = r.hours[day]
  if (!d.length) return ['公休', 'Closed']
  const s = d.map(([a, b]) => `${hm(a)}–${hm(b)}`).join('、')
  return [s, s.replace(/、/g, ', ')]
}

const THREE_DAYS = 3 * 24 * 3600 * 1000

export function recentIds(s: State) {
  const cut = Date.now() - THREE_DAYS
  return new Set(s.history.filter(h => h.at > cut).map(h => h.id))
}

export function applyFilters(f: Filters, s: State, now = new Date()) {
  const recent = f.avoidRecent ? recentIds(s) : new Set<string>()
  return placesOf(s.source).filter(r => {
    if (s.blocked.includes(r.id)) return false
    // 價位：Google 店家用區間判斷（和預算有重疊就算），沒有價位資料的不因預算被排除
    const pr = priceBounds(r)
    if (pr && f.budget < 1500 && pr[0] > f.budget) return false
    if (pr && pr[1] < f.budgetMin) return false
    if (distanceKm(r) > f.distance) return false
    if (f.cuisines.length && !f.cuisines.includes(r.cuisine)) return false
    if (f.tags.length && !f.tags.every(t => r.tags.includes(t))) return false
    // 沒有營業時間資料的店不因「營業中」被排除
    if (f.openNow) { const os = openStatus(r, now); if (!os.open && !os.unknown) return false }
    if (f.trusted && lowConfidence(r)) return false
    if (trustScore(r) < f.minScore) return false
    if (recent.has(r.id)) return false
    return true
  })
}

export type SortKey = 'smart' | 'score' | 'distance' | 'price'

/** 綜合分：可信分數為主，距離近、合口味加分 */
export function smartScore(r: Restaurant, s: State) {
  const taste = s.taste[r.cuisine] ?? 0
  const fav = s.favorites.includes(r.id) ? 0.3 : 0
  return trustScore(r) - distanceKm(r) * 0.18 + taste * 0.12 + fav
}

export function sortList(list: Restaurant[], key: SortKey, s: State) {
  const a = [...list]
  switch (key) {
    case 'score': return a.sort((x, y) => trustScore(y) - trustScore(x))
    case 'distance': return a.sort((x, y) => distanceKm(x) - distanceKm(y))
    case 'price': return a.sort((x, y) => (priceBounds(x) ? x.price : 1e9) - (priceBounds(y) ? y.price : 1e9))
    default: return a.sort((x, y) => smartScore(y, s) - smartScore(x, s))
  }
}

/** 加權隨機抽 n 家，不同料理盡量不重複，讓選項有變化 */
export function pickN(list: Restaurant[], n: number, s: State, exclude: Set<string> = new Set()) {
  const pool = list.filter(r => !exclude.has(r.id))
  const out: Restaurant[] = []
  const usedCuisine = new Set<string>()
  while (out.length < n && pool.length) {
    const weights = pool.map(r => {
      const base = Math.exp((smartScore(r, s) - 3.5) * 1.6)
      return usedCuisine.has(r.cuisine) ? base * 0.15 : base
    })
    const total = weights.reduce((a, b) => a + b, 0)
    let x = Math.random() * total, k = 0
    while (k < pool.length - 1 && (x -= weights[k]) > 0) k++
    const [r] = pool.splice(k, 1)
    usedCuisine.add(r.cuisine)
    out.push(r)
  }
  return out
}

/** 價位區間；Google 店家沒有價位資料時回傳 null */
export function priceBounds(r: Restaurant): [number, number] | null {
  if (r.priceRange) return r.priceRange
  if (r.google) return null
  return [r.price, r.price]
}

/** 顯示用價位：「NT$200–400」「NT$200 以內」「NT$2,000 以上」「價位未提供」 */
export function priceText(r: Restaurant, lang: 'zh' | 'en') {
  const b = priceBounds(r)
  const n = (v: number) => v.toLocaleString()
  if (!b) return lang === 'zh' ? '價位未提供' : 'Price n/a'
  const [lo, hi] = b
  if (hi >= 99999) return lang === 'zh' ? `NT$${n(lo)} 以上` : `NT$${n(lo)}+`
  if (lo <= 1) return lang === 'zh' ? `NT$${n(hi)} 以內` : `Under NT$${n(hi)}`
  if (lo === hi) return `NT$${n(lo)}`
  return `NT$${n(lo)}–${n(hi)}`
}

export function priceLevel(p: number) {
  return p < 200 ? '$' : p < 400 ? '$$' : p < 800 ? '$$$' : '$$$$'
}
