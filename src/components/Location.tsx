import { useState } from 'react'
import { HOME } from '../data/restaurants'
import { clearLocation, isStale, locate, locateErrorText } from '../lib/location'
import { distanceKm, fmtDist } from '../lib/logic'
import { useStore, useT } from '../lib/store'
import { Art, Ico } from './Ico'
import { Sheet, toast } from './ui'

/** 跟瀏覽器要位置，成功／失敗都跳提示；回傳是否成功 */
export function useLocate() {
  const t = useT()
  const [busy, setBusy] = useState(false)
  async function run() {
    setBusy(true)
    try {
      const fix = await locate()
      toast(t(`已定位 ±${fix.acc} m`, `Located ±${fix.acc} m`))
      return true
    } catch (e) {
      const [zh, en] = locateErrorText(e)
      toast(t(zh, en))
      return false
    } finally { setBusy(false) }
  }
  return { busy, run }
}

/** 位置名稱：目前位置／上次位置／中山站（示意） */
export function useLocationLabel(): string {
  const t = useT()
  const loc = useStore(s => s.location)
  if (!loc) return t('中山站（示意）', 'Zhongshan (demo)')
  return isStale(loc) ? t('上次位置', 'Last location') : t('目前位置', 'Your location')
}

/** 頁首右上的位置膠囊：沒定位時按一下就定位，有定位時打開位置設定 */
export function LocationPill() {
  const t = useT()
  const loc = useStore(s => s.location)
  const label = useLocationLabel()
  const { busy, run } = useLocate()
  const [open, setOpen] = useState(false)
  const mins = loc ? Math.max(0, Math.round((Date.now() - loc.at) / 60000)) : 0
  return (
    <>
      <button className={`loc-pill ${loc ? 'live' : ''} ${busy ? 'busy' : ''}`} onClick={() => (loc ? setOpen(true) : run())}>
        <Ico name={loc ? 'nav' : 'pin'} size={14} />{busy ? t('定位中…', 'Locating…') : label}
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title={t('我的位置', 'My location')}>
        {loc && (
          <div className="loc-info">
            <Art name="pin" size={56} />
            <div>
              <b>{label}</b>
              <small className="muted">{t(`誤差約 ${loc.acc} 公尺 · ${mins ? `${mins} 分鐘前更新` : '剛剛更新'}`, `±${loc.acc} m · ${mins ? `${mins} min ago` : 'just now'}`)}</small>
              <small className="muted">{loc.lat.toFixed(5)}, {loc.lng.toFixed(5)}</small>
            </div>
          </div>
        )}
        <div className="btn-col">
          <button className="btn primary" disabled={busy} onClick={async () => { if (await run()) setOpen(false) }}><Ico name="nav" size={16} />{busy ? t('定位中…', 'Locating…') : t('重新定位', 'Update location')}</button>
          <button className="btn ghost" onClick={() => { clearLocation(); setOpen(false); toast(t('改用測試位置（中山站）', 'Using demo location')) }}>{t('改用測試位置（中山站）', 'Use demo location (Zhongshan)')}</button>
        </div>
      </Sheet>
    </>
  )
}

/** 手機開 App 時的定位說明：按「允許」才跳系統權限視窗（iOS／Android 都會先問） */
export function LocationAsk({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT()
  const { busy, run } = useLocate()
  return (
    <Sheet open={open} onClose={onClose} title={t('使用你的位置', 'Use your location')}>
      <div className="loc-ask">
        <Art name="pin" size={72} />
        <p>{t('EAT WHAT 會用你手機的位置，推薦你附近、走得到的餐廳。位置只留在你的手機上，不會上傳。', 'EAT WHAT uses your phone’s location to suggest places you can walk to. It stays on your phone.')}</p>
      </div>
      <div className="btn-col">
        <button className="btn primary big" disabled={busy} onClick={async () => { await run(); onClose() }}><Ico name="nav" size={18} />{busy ? t('定位中…', 'Locating…') : t('允許使用位置', 'Allow location')}</button>
        <button className="btn ghost" onClick={onClose}>{t('先不要，用中山站', 'Not now (use Zhongshan)')}</button>
      </div>
    </Sheet>
  )
}

/** 還沒定位時，決定頁上方的提示卡；人不在台北時提醒距離設定 */
export function LocateCard() {
  const t = useT()
  const loc = useStore(s => s.location)
  const distance = useStore(s => s.filters.distance)
  const { busy, run } = useLocate()
  if (!loc) {
    return (
      <div className="locate-card">
        <Art name="pin" size={48} />
        <div className="grow">
          <b>{t('開啟定位，距離才準', 'Turn on location')}</b>
          <small>{t('目前用中山站當起點計算距離', 'Distances are from Zhongshan Stn for now')}</small>
        </div>
        <button className="btn primary small" disabled={busy} onClick={run}>{busy ? t('定位中', 'Locating') : t('使用我的位置', 'Use my location')}</button>
      </div>
    )
  }
  const away = distanceKm(HOME, loc)
  if (away > 20 && distance < 99) {
    return (
      <div className="note warn"><Ico name="info" size={16} />{t(`你距離台北約 ${fmtDist(away)}，收藏的店都在台北。想看全部可以把距離改成「不限」。`, `You're ${fmtDist(away)} from Taipei, where your saved places are. Set distance to "Any" to see them.`)}</div>
    )
  }
  return null
}
