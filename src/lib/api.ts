import { getState, setState, type PlaceEdit } from './store'

// 和 worker/index.js 溝通。本機 vite 開發時沒有 Worker，讀不到就沿用本機快取的修改。

type Edits = Record<string, PlaceEdit>

/** App 開啟時讀取管理員修改 */
export async function loadEdits() {
  try {
    const r = await fetch('/api/edits', { cache: 'no-store' })
    if (!r.ok || !(r.headers.get('content-type') || '').includes('json')) return
    setState({ edits: (await r.json()) as Edits })
  } catch { /* 離線或本機開發：用快取 */ }
}

function auth(): HeadersInit {
  return { Authorization: `Bearer ${getState().adminKey ?? ''}`, 'Content-Type': 'application/json' }
}

/** 管理員登入：密碼對了才存在這台裝置 */
export async function adminLogin(key: string): Promise<boolean> {
  try {
    const r = await fetch('/api/admin/check', { method: 'POST', headers: { Authorization: `Bearer ${key}` } })
    if (!r.ok) return false
    setState({ adminKey: key })
    return true
  } catch { return false }
}

export function adminLogout() {
  setState({ adminKey: null })
}

async function write(id: string, init: RequestInit): Promise<void> {
  const r = await fetch(`/api/edits/${id}`, { ...init, headers: auth() })
  if (r.status === 401) { setState({ adminKey: null }); throw new Error('unauthorized') }
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  setState({ edits: (await r.json()) as Edits })
}

/** 存一家店的修改（分類、價格區間；priceRange: null = 價位未提供） */
export function saveEdit(id: string, patch: PlaceEdit) {
  return write(id, { method: 'PUT', body: JSON.stringify(patch) })
}

/** 還原成原始資料 */
export function resetEdit(id: string) {
  return write(id, { method: 'DELETE' })
}
