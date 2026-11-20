import { useState } from 'react'
import { areasOf, cityCounts } from '../data/places'
import { CITIES, COUNTRIES, cityNear, type Country } from '../data/regions'
import { currentArea, currentCity, inCurrentCity, isStale, locate, locateErrorText } from '../lib/location'
import { getState, setState, useStore, useT } from '../lib/store'
import { areaPhoto, scenePhoto } from '../lib/assets'
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

/** 位置名稱：「台北・目前位置」「東京・銀座・新橋・有樂町」「東京・東京車站」 */
export function useLocationLabel(): string {
  const t = useT()
  const loc = useStore(s => s.location)
  useStore(s => s.region)
  useStore(s => s.placesVer)
  const city = currentCity()
  const area = currentArea()
  const name = t(city.name, city.en)
  if (area) return `${name}・${area.name}`
  if (loc && inCurrentCity()) return `${name}・${isStale(loc) ? t('上次位置', 'last location') : t('目前位置', 'here')}`
  return `${name}・${t(city.centerName, 'center')}`
}

/** 頁首右上的位置膠囊：打開地區選擇（國家 → 城市 → 區域）與定位 */
export function LocationPill() {
  const t = useT()
  const loc = useStore(s => s.location)
  const region = useStore(s => s.region)
  useStore(s => s.placesVer)
  const label = useLocationLabel()
  const { busy, run } = useLocate()
  const [open, setOpen] = useState(false)
  const city = currentCity()
  const [country, setCountry] = useState<Country>(city.country)
  const counts = cityCounts()
  const mins = loc ? Math.max(0, Math.round((Date.now() - loc.at) / 60000)) : 0
  const pick = (cityKey: string, area: string | null) => {
    setState({ region: { city: cityKey, area } })
    setOpen(false)
    toast(t('已切換地區', 'Region changed'))
  }
  return (
    <>
      <button className={`loc-pill ${loc && inCurrentCity() ? 'live' : ''} ${busy ? 'busy' : ''}`} onClick={() => { setCountry(currentCity().country); setOpen(true) }}>
        <Ico name={loc && inCurrentCity() ? 'nav' : 'pin'} size={14} />{busy ? t('定位中…', 'Locating…') : label}
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title={t('選擇地區', 'Choose region')}>
        <button className={`region-auto ${region ? '' : 'on'}`} onClick={async () => {
          setState({ region: null })
          if (await run()) {
            const c = cityNear(getState().location)
            toast(c ? t(`自動：${c.name}`, `Auto: ${c.en}`) : t('你不在支援的城市，先顯示台北', 'Not near a supported city — showing Taipei'))
          }
          setOpen(false)
        }}>
          <Ico name="nav" size={18} />
          <span className="grow"><b>{t('自動（用手機位置）', 'Auto (use my location)')}</b>
            <small className="muted">{loc ? t(`誤差約 ${loc.acc} 公尺 · ${mins ? `${mins} 分鐘前` : '剛剛'}`, `±${loc.acc} m · ${mins ? `${mins} min ago` : 'just now'}`) : t('還沒定位', 'Not located yet')}</small></span>
          {!region && <Ico name="check" size={18} />}
        </button>
        <div className="seg wide region-countries">
          {COUNTRIES.map(c => <button key={c.key} className={country === c.key ? 'on' : ''} onClick={() => setCountry(c.key)}>{c.flag} {t(c.name, c.en)}</button>)}
        </div>
        {CITIES.filter(c => c.country === country).map(c => {
          const cityAreas = areasOf(c.key)
          const onCity = region?.city === c.key
          return (
            <div key={c.key} className="region-city">
              <button className={`region-row ${onCity && !region?.area ? 'on' : ''} ${c.key === 'tokyo' ? 'hero' : ''}`} onClick={() => pick(c.key, null)}
                style={c.key === 'tokyo' ? { backgroundImage: `linear-gradient(90deg, rgba(10,14,30,.75), rgba(10,14,30,.15)), url(${scenePhoto('tokyo-hero')})` } : undefined}>
                <b>{t(c.name, c.en)}</b><small className="muted">{t(`全部 · ${counts[c.key] ?? 0} 家 · 沒定位時從${c.centerName}算距離`, `All · ${counts[c.key] ?? 0}`)}</small>
              </button>
              {!!cityAreas.length && (
                <div className="region-areas">
                  {cityAreas.map(a => (
                    <button key={a.code} className={`area-card ${onCity && region?.area === a.code ? 'on' : ''}`} onClick={() => pick(c.key, a.code)}
                      style={{ backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0) 35%, rgba(0,0,0,.72)), url(${areaPhoto(a.code)})` }}>
                      <b>{a.name.split('（')[0]}</b><i>{a.count} 家</i>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}
        <button className="btn ghost block" disabled={busy} onClick={async () => { if (await run()) setOpen(false) }}><Ico name="nav" size={16} />{busy ? t('定位中…', 'Locating…') : t('重新定位', 'Update location')}</button>
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
        <button className="btn ghost" onClick={onClose}>{t('先不要（可在右上角選地區）', 'Not now (pick a region top-right)')}</button>
      </div>
    </Sheet>
  )
}

/** 還沒定位時，決定頁上方的提示卡；人不在選的城市時說明距離從哪裡算 */
export function LocateCard() {
  const t = useT()
  const loc = useStore(s => s.location)
  useStore(s => s.region)
  const { busy, run } = useLocate()
  const city = currentCity()
  const area = currentArea()
  if (!loc) {
    return (
      <div className="locate-card">
        <Art name="pin" size={48} />
        <div className="grow">
          <b>{t('開啟定位，距離才準', 'Turn on location')}</b>
          <small>{area ? t(`目前從${area.name}中心計算距離`, `Distances from ${area.name}`) : t(`目前用${city.name}${city.centerName}當起點計算距離`, `Distances from ${city.en} center`)}</small>
        </div>
        <button className="btn primary small" disabled={busy} onClick={run}>{busy ? t('定位中', 'Locating') : t('使用我的位置', 'Use my location')}</button>
      </div>
    )
  }
  if (!inCurrentCity() && !area) {
    return (
      <div className="note"><Ico name="info" size={16} />{t(`你現在不在${city.name}，距離從${city.centerName}計算；可在右上角選區域。`, `You're not in ${city.en}; distances are from the city center.`)}</div>
    )
  }
  return null
}
