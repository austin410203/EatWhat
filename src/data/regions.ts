// 地區：國家 → 城市 → 區域。店家的 city 欄位對應這裡的 key；區域（東京 = Tabelog 區域）由店家資料自己帶 area／areaName。
// 原生 App 的 native/Sources/Regions.swift 是同一份表，改這裡要一起改。

export type Country = 'TW' | 'JP'

export interface City { key: string; country: Country; name: string; en: string; center: { lat: number; lng: number }; centerName: string }

export const COUNTRIES: { key: Country; name: string; en: string; flag: string }[] = [
  { key: 'TW', name: '台灣', en: 'Taiwan', flag: '🇹🇼' },
  { key: 'JP', name: '日本', en: 'Japan', flag: '🇯🇵' },
]

export const CITIES: City[] = [
  { key: 'taipei', country: 'TW', name: '台北', en: 'Taipei', center: { lat: 25.0526, lng: 121.5204 }, centerName: '中山站' },
  { key: 'tokyo', country: 'JP', name: '東京', en: 'Tokyo', center: { lat: 35.6812, lng: 139.7671 }, centerName: '東京車站' },
]

export const CITY = Object.fromEntries(CITIES.map(c => [c.key, c])) as Record<string, City>

/** 使用者選的地區；null = 自動（跟著手機位置找最近的城市） */
export interface Region { city: string; area: string | null }

function km(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371, rad = Math.PI / 180
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(x))
}

/** 離這個位置最近、80 km 內的城市 */
export function cityNear(p: { lat: number; lng: number } | null): City | null {
  if (!p) return null
  let best: City | null = null, d = 80
  for (const c of CITIES) { const k = km(p, c.center); if (k < d) { d = k; best = c } }
  return best
}

export { km as regionKm }
