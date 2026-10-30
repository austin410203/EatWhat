import { useSyncExternalStore } from 'react'
import type { CuisineKey, TagKey } from '../data/restaurants'
import type { Source } from '../data/places'

export interface Filters {
  budget: number // 每人均消上限（1500 = 不限）
  budgetMin: number // 每人均消下限（0 = 不限）
  distance: number // 公里
  minScore: number // 可信分數下限
  cuisines: CuisineKey[] // 空陣列 = 全部
  tags: TagKey[]
  openNow: boolean
  trusted: boolean // 推薦模式：排除評論太少的店
  avoidRecent: boolean // 避開 3 天內吃過的
}

export interface HistoryItem { id: string; at: number }

/** 裝置定位結果；acc = 誤差（公尺），at = 取得時間 */
export interface GeoFix { lat: number; lng: number; acc: number; at: number }

export interface State {
  lang: 'zh' | 'en'
  nickname: string
  favorites: string[]
  blocked: string[]
  history: HistoryItem[]
  /** 滑卡累積的口味分數，-3..+3 */
  taste: Partial<Record<CuisineKey, number>>
  filters: Filters
  showAds: boolean
  onboarded: boolean
  /** 餐廳資料來源：我的 Google 收藏／測試資料／全部 */
  source: Source
  /** 使用者位置；null = 用測試位置（中山站） */
  location: GeoFix | null
}

export const DEFAULT_FILTERS: Filters = {
  budget: 500, budgetMin: 0, distance: 3, minScore: 3.5, cuisines: [], tags: [],
  openNow: true, trusted: true, avoidRecent: true,
}

const DEFAULT: State = {
  lang: 'zh', nickname: '', favorites: [], blocked: [], history: [], taste: {},
  filters: DEFAULT_FILTERS, showAds: true, onboarded: false, source: 'saved', location: null,
}

const KEY = 'eatwhat.v1'

function load(): State {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const s = JSON.parse(raw)
      const filters = { ...DEFAULT_FILTERS, ...(s.filters || {}) }
      // 匯入 Google 收藏前的舊設定：收藏的店散在全台北，距離至少放寬到 3 km
      if (!s.source) filters.distance = Math.max(filters.distance, 3)
      return { ...DEFAULT, ...s, filters }
    }
  } catch { /* 私密模式或被封鎖時用預設值 */ }
  return { ...DEFAULT }
}

let state: State = load()
const subs = new Set<() => void>()

export function getState() { return state }

export function setState(patch: Partial<State> | ((s: State) => Partial<State>)) {
  const p = typeof patch === 'function' ? patch(state) : patch
  state = { ...state, ...p }
  try { localStorage.setItem(KEY, JSON.stringify(state)) } catch { /* ignore */ }
  subs.forEach(f => f())
}

export function useStore<T>(sel: (s: State) => T): T {
  return useSyncExternalStore(
    cb => { subs.add(cb); return () => subs.delete(cb) },
    () => sel(state),
  )
}

export function setFilters(p: Partial<Filters>) {
  setState(s => ({ filters: { ...s.filters, ...p } }))
}

export function toggleIn(list: 'favorites' | 'blocked', id: string) {
  setState(s => {
    const has = s[list].includes(id)
    const next = has ? s[list].filter(x => x !== id) : [id, ...s[list]]
    // 收藏和黑名單互斥
    const other = list === 'favorites' ? 'blocked' : 'favorites'
    return { [list]: next, [other]: has ? s[other] : s[other].filter(x => x !== id) } as Partial<State>
  })
}

export function markEaten(id: string) {
  setState(s => ({ history: [{ id, at: Date.now() }, ...s.history].slice(0, 100) }))
}

export function exportData(): string {
  return JSON.stringify({ app: 'eatwhat', version: 1, exportedAt: new Date().toISOString(), data: state }, null, 2)
}

export function importData(text: string): boolean {
  try {
    const j = JSON.parse(text)
    if (j?.app !== 'eatwhat' || !j.data) return false
    state = { ...DEFAULT, ...j.data, filters: { ...DEFAULT_FILTERS, ...(j.data.filters || {}) } }
    setState({})
    return true
  } catch { return false }
}

export function resetAll() {
  try { localStorage.removeItem(KEY) } catch { /* ignore */ }
  state = { ...DEFAULT, onboarded: true }
  setState({})
}

/** 介面文字：t('中文', 'English') */
export function useT() {
  const lang = useStore(s => s.lang)
  return (zh: string, en: string) => (lang === 'zh' ? zh : en)
}
