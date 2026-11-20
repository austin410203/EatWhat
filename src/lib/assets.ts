import type { CuisineKey, Restaurant } from '../data/restaurants'

// 圖示與示意照片：ChatGPT 生成，切圖腳本在 _art/（slice_icons.py、slice_photos.py）。
// 正式版接 Google Places 後，店家照片改用 Places Photos（需附作者署名）。

const BASE = import.meta.env.BASE_URL

export type IconName =
  | CuisineKey
  | 'onigiri' | 'rice' | 'fortune'
  | 'dice' | 'pin' | 'ballot' | 'cards' | 'trophy' | 'shield' | 'heart' | 'clock' | 'coins' | 'sneaker' | 'popper' | 'slot'
  | 'bubbletea' | 'seafood' | 'twbreakfast' | 'noodles' | 'friedchicken' | 'shavedice' | 'pizza' | 'beer'

export const icon = (name: IconName) => `${BASE}img/icons/${name}.webp`

/** 東京店家用的日式示意照（_art/prompts_tokyo.py，img/photos/jp-<料理>-1/2.jpg） */
export const JP_PHOTOS = new Set(['sushi', 'ramen', 'bbq', 'japanese', 'izakaya', 'cafe', 'dessert', 'bar', 'bakery', 'finedining'])

/** 每種料理有兩張示意照片，依店家編號輪流用；東京的店有日式版就用日式版 */
export function photos(r: Restaurant): string[] {
  let seed = 0
  for (const ch of r.id) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0
  const k = r.city === 'tokyo' && JP_PHOTOS.has(r.cuisine) ? `jp-${r.cuisine}` : r.cuisine
  const a = `${BASE}img/photos/${k}-1.jpg`
  const b = `${BASE}img/photos/${k}-2.jpg`
  return seed % 2 ? [b, a] : [a, b]
}

export const cuisinePhoto = (k: CuisineKey, n: 1 | 2 = 1) => `${BASE}img/photos/${k}-${n}.jpg`
export const scenePhoto = (name: 'friends' | 'spread' | 'tokyo-hero' | 'tokyo-food' | 'tokyo-night' | 'tokyo-market') => `${BASE}img/photos/${name}.jpg`

/** 東京區域封面（img/areas/<區域代碼>.jpg） */
export const areaPhoto = (code: string) => `${BASE}img/areas/${code}.jpg`
