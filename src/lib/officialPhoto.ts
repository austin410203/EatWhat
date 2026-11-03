import type { Restaurant } from '../data/restaurants'
import credits from '../data/place_photos.json'
import { API } from './api'

// 店家照片，優先順序：
// 1. 後台上傳的照片（KV，/api/photo/<id>?v=<版本>），不顯示署名
// 2. 2026-10-31 從 Google Places 抓下來的照片（public/img/places/<id>.jpg，_data/fetch_photos.py），要顯示拍攝者署名
// 3. 都沒有就回 null，畫面用料理示意圖

export interface OfficialPhoto { url: string; author: string; authorUri: string }

const CREDITS = credits as Record<string, { author: string; uri: string }>
const BASE = import.meta.env.BASE_URL

export function placePhoto(r: Restaurant | undefined): OfficialPhoto | null {
  if (!r) return null
  if (r.photo) return { url: `${API}/api/photo/${r.id}?v=${r.photo}`, author: '', authorUri: '' }
  const c = CREDITS[r.id]
  return c ? { url: `${BASE}img/places/${r.id}.jpg`, author: c.author, authorUri: c.uri } : null
}
