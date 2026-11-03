import { Capacitor } from '@capacitor/core'
import { placesVersion, setPlaces, type PlacesData, type SavedRow } from '../data/places'
import { getState, setState } from './store'

// 和 worker/index.js（餐廳資料庫）溝通。網頁走同一個網域；iOS App 從 capacitor://localhost 開，要連正式網址。
// 本機 vite 開發時沒有 Worker：讀不到就沿用快取／打包的資料。

export const API = Capacitor.isNativePlatform() ? 'https://eat.emptyoffice.app' : ''

function apply(d: PlacesData) {
  setPlaces(d)
  setState(s => ({ placesVer: s.placesVer + 1 }))
}

/** App 開啟時讀最新餐廳資料；資料沒變（304）就不動 */
export async function loadPlaces() {
  try {
    const ver = placesVersion()
    const r = await fetch(API + '/api/places', { cache: 'no-cache', headers: ver >= 0 ? { 'If-None-Match': `"v${ver}"` } : {} })
    if (r.status === 304 || !r.ok || !(r.headers.get('content-type') || '').includes('json')) return
    apply((await r.json()) as PlacesData)
  } catch { /* 離線：用快取 */ }
}

function auth(json = true): HeadersInit {
  return { Authorization: `Bearer ${getState().adminKey ?? ''}`, ...(json ? { 'Content-Type': 'application/json' } : {}) }
}

/** 管理員登入：密碼對了才存在這台裝置 */
export async function adminLogin(key: string): Promise<boolean> {
  try {
    const r = await fetch(API + '/api/admin/check', { method: 'POST', headers: { Authorization: `Bearer ${key}` } })
    if (!r.ok) return false
    setState({ adminKey: key })
    return true
  } catch { return false }
}

export function adminLogout() {
  setState({ adminKey: null })
}

async function write(path: string, init: RequestInit, json = true): Promise<PlacesData> {
  const r = await fetch(API + path, { ...init, headers: auth(json) })
  if (r.status === 401) { setState({ adminKey: null }); throw new Error('unauthorized') }
  if (!r.ok) {
    let msg = `HTTP ${r.status}`
    try { msg = (await r.json()).error || msg } catch { /* 非 JSON */ }
    throw new Error(msg)
  }
  const d = (await r.json()) as PlacesData
  apply(d)
  return d
}

export type PlaceInput = Omit<SavedRow, 'id' | 'price' | 'photo'>

/** 新增一家店；回傳新店的 id */
export async function createPlace(p: PlaceInput): Promise<string> {
  const d = await write('/api/places', { method: 'POST', body: JSON.stringify(p) })
  return d.list[d.list.length - 1].id
}

/** 修改一家店（只送要改的欄位也可以） */
export function updatePlace(id: string, patch: Partial<PlaceInput>) {
  return write(`/api/places/${id}`, { method: 'PUT', body: JSON.stringify(patch) })
}

export function deletePlace(id: string) {
  return write(`/api/places/${id}`, { method: 'DELETE' })
}

/** 上傳店家照片（先縮成 900 px 寬的 JPEG） */
export async function uploadPhoto(id: string, file: Blob) {
  const jpeg = await shrink(file, 900)
  // 不手動設 Content-Type：瀏覽器會用 Blob 的 image/jpeg
  return write(`/api/photo/${id}`, { method: 'PUT', body: jpeg }, false)
}

async function shrink(file: Blob, width: number): Promise<Blob> {
  const bmp = await createImageBitmap(file)
  const scale = Math.min(1, width / bmp.width)
  const c = document.createElement('canvas')
  c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale)
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height)
  return new Promise((ok, no) => c.toBlob(b => (b ? ok(b) : no(new Error('encode failed'))), 'image/jpeg', 0.82))
}
