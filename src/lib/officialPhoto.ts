import { useEffect, useState } from 'react'
import type { Restaurant } from '../data/restaurants'

// Google 官方店家照片（worker /api/photo/<id>）。每張照片都要附拍攝者署名。
// 照片每張都算錢，所以只在店家頁和抽出來的店用；同一個分頁內記住結果，不重複要。
// 拿不到（沒對到店、超過每月上限、本機 vite 沒有 Worker）就回 null，畫面沿用示意圖。

export interface OfficialPhoto { url: string; author: string; authorUri: string }

const KEY = 'eatwhat.photos'
const mem = new Map<string, Promise<OfficialPhoto | null>>()
let stored: Record<string, OfficialPhoto | null> = {}
try { stored = JSON.parse(sessionStorage.getItem(KEY) || '{}') } catch { /* 無痕或封鎖儲存 */ }

function remember(id: string, p: OfficialPhoto | null) {
  stored[id] = p
  try { sessionStorage.setItem(KEY, JSON.stringify(stored)) } catch { /* 同上 */ }
}

function load(id: string): Promise<OfficialPhoto | null> {
  if (id in stored) return Promise.resolve(stored[id])
  let p = mem.get(id)
  if (!p) {
    p = fetch('/api/photo/' + id)
      .then(async r => {
        if (!r.ok || !(r.headers.get('content-type') || '').includes('json')) return null
        const j = await r.json()
        return j.url ? (j as OfficialPhoto) : null
      })
      .catch(() => null)
      .then(v => { remember(id, v); return v })
    mem.set(id, p)
  }
  return p
}

/** 只有 Google 收藏的店才有官方照片；enabled=false 時不發請求 */
export function useOfficialPhoto(r: Restaurant | undefined, enabled = true): OfficialPhoto | null {
  const id = r?.google && enabled ? r.id : null
  const [photo, setPhoto] = useState<OfficialPhoto | null>(() => (id && stored[id]) || null)
  useEffect(() => {
    if (!id) { setPhoto(null); return }
    let live = true
    load(id).then(p => { if (live) setPhoto(p) })
    return () => { live = false }
  }, [id])
  return photo
}
