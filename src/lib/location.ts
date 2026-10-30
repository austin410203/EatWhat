import { HOME } from '../data/restaurants'
import { getState, setState, type GeoFix } from './store'

// 使用者位置：有定位就用裝置位置，沒有就退回中山站（測試位置）。
// 瀏覽器只在 HTTPS（或 localhost）下給定位；之後包成 iOS App 時改用 Capacitor Geolocation 外掛。

/** 超過 30 分鐘的定位視為過期，畫面上會提示「上次位置」 */
const STALE_MS = 30 * 60 * 1000

export function home(): { lat: number; lng: number } {
  return getState().location ?? HOME
}

export function isStale(fix: GeoFix | null) {
  return !!fix && Date.now() - fix.at > STALE_MS
}

export type LocateError = 'denied' | 'unavailable' | 'timeout' | 'unsupported'

let pending: Promise<GeoFix> | null = null

/** 跟瀏覽器要一次目前位置（第一次會跳出權限詢問） */
export function locate(): Promise<GeoFix> {
  if (pending) return pending
  pending = new Promise<GeoFix>((resolve, reject) => {
    if (!('geolocation' in navigator)) { reject('unsupported' as LocateError); return }
    navigator.geolocation.getCurrentPosition(
      p => {
        const fix: GeoFix = { lat: p.coords.latitude, lng: p.coords.longitude, acc: Math.round(p.coords.accuracy), at: Date.now() }
        setState({ location: fix })
        resolve(fix)
      },
      e => reject((e.code === e.PERMISSION_DENIED ? 'denied' : e.code === e.TIMEOUT ? 'timeout' : 'unavailable') as LocateError),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    )
  }).finally(() => { pending = null })
  return pending
}

/** 已經授權過就默默更新位置（不會跳權限視窗）；回傳目前的權限狀態 */
export async function refreshIfGranted(): Promise<PermissionState | 'unknown'> {
  try {
    const st = await navigator.permissions.query({ name: 'geolocation' })
    if (st.state === 'granted') locate().catch(() => {})
    return st.state
  } catch {
    return 'unknown'
  }
}

/** 改回測試位置（中山站） */
export function clearLocation() {
  setState({ location: null })
}

export function locateErrorText(e: unknown): [string, string] {
  switch (e as LocateError) {
    case 'denied': return ['定位權限被拒絕。請到瀏覽器或手機設定，允許這個網站使用位置。', 'Location permission denied. Allow it for this site in your browser settings.']
    case 'timeout': return ['定位逾時，請到戶外或開啟 Wi-Fi 後再試一次。', 'Location timed out. Try again.']
    case 'unsupported': return ['這個瀏覽器不支援定位。', 'This browser does not support location.']
    default: return ['目前抓不到位置，請稍後再試。', 'Could not get your location.']
  }
}
