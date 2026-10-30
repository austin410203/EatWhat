import type { CuisineKey, Restaurant } from '../data/restaurants'

// 圖示與示意照片：ChatGPT 生成，切圖腳本在 _art/（slice_icons.py、slice_photos.py）。
// 正式版接 Google Places 後，店家照片改用 Places Photos（需附作者署名）。

const BASE = import.meta.env.BASE_URL

export type IconName =
  | CuisineKey
  | 'onigiri' | 'rice' | 'fortune'
  | 'dice' | 'pin' | 'ballot' | 'cards' | 'trophy' | 'shield' | 'heart' | 'clock' | 'coins' | 'sneaker' | 'popper' | 'slot'

export const icon = (name: IconName) => `${BASE}img/icons/${name}.webp`

/** 每種料理有兩張示意照片，依店家編號輪流用 */
export function photos(r: Restaurant): string[] {
  const seed = parseInt(r.id.slice(1), 10)
  const a = `${BASE}img/photos/${r.cuisine}-1.jpg`
  const b = `${BASE}img/photos/${r.cuisine}-2.jpg`
  return seed % 2 ? [b, a] : [a, b]
}

export const cuisinePhoto = (k: CuisineKey, n: 1 | 2 = 1) => `${BASE}img/photos/${k}-${n}.jpg`
export const scenePhoto = (name: 'friends' | 'spread') => `${BASE}img/photos/${name}.jpg`
