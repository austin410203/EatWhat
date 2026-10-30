import type { Restaurant } from '../data/restaurants'
import credits from '../data/place_photos.json'

// 店家照片：2026-10-31 從 Google Places 一次抓下來（_data/fetch_photos.py），存在 public/img/places/<id>.jpg。
// 使用者決定 App 自用，抓完就關掉 Places API。每張照片都要顯示拍攝者署名。

export interface OfficialPhoto { url: string; author: string; authorUri: string }

const CREDITS = credits as Record<string, { author: string; uri: string }>
const BASE = import.meta.env.BASE_URL

/** 這家店有沒有 Google 照片；沒有（假店家、沒對到的店）回 null，畫面用示意圖 */
export function placePhoto(r: Restaurant | undefined): OfficialPhoto | null {
  const c = r && CREDITS[r.id]
  return c ? { url: `${BASE}img/places/${r.id}.jpg`, author: c.author, authorUri: c.uri } : null
}
