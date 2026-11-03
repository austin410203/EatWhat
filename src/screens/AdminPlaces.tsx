import { useMemo, useState } from 'react'
import { Art, Ico } from '../components/Ico'
import { BackBtn, Header, toast } from '../components/ui'
import { rawPlace, rawPlaces, type SavedRow } from '../data/places'
import { CUISINE_MAP, CUISINES, TAGS, type CuisineKey, type TagKey } from '../data/restaurants'
import { createPlace, deletePlace, updatePlace, uploadPhoto, type PlaceInput } from '../lib/api'
import { locate } from '../lib/location'
import { placePhoto } from '../lib/officialPhoto'
import { nav } from '../lib/router'
import { useStore, useT } from '../lib/store'
import { place } from '../data/places'

// 後台：管理員增刪改餐廳資料（存在 Worker KV，網頁和 iOS App 開啟時讀最新版，不用改程式或重送 App）。
// #/admin 列表、#/admin/new 新增、#/admin/<id> 編輯。

const DAYS: [string, string][] = [['週日', 'Sun'], ['週一', 'Mon'], ['週二', 'Tue'], ['週三', 'Wed'], ['週四', 'Thu'], ['週五', 'Fri'], ['週六', 'Sat']]

const hm = (m: number) => `${String(Math.floor((m % 1440) / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

/** 一天的時段 → 「11:30-14:00, 17:30-21:00」；空字串 = 公休 */
function dayText(d: [number, number][]) {
  return d.map(([a, b]) => `${hm(a)}-${hm(b)}`).join(', ')
}

/** 「11:30-14:00, 17:30-02:00」→ 分鐘時段（跨夜的結束時間 +1440）；格式錯回傳 null */
function parseDay(s: string): [number, number][] | null {
  const parts = s.split(/[,，、;；]/).map(x => x.trim()).filter(Boolean)
  const out: [number, number][] = []
  for (const p of parts) {
    const m = p.match(/^(\d{1,2}):?(\d{2})\s*[-~～–]\s*(\d{1,2}):?(\d{2})$/)
    if (!m) return null
    const a = +m[1] * 60 + +m[2]
    let b = +m[3] * 60 + +m[4]
    if (a >= 1440 || b > 1440) return null
    if (b <= a) b += 1440
    out.push([a, b])
  }
  return out
}

/** 從 Google 地圖網址或「緯度, 經度」文字取出座標 */
function parseCoords(s: string): [number, number] | null {
  const pats = [/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/, /@(-?\d+\.\d+),(-?\d+\.\d+)/, /[?&](?:q|query|ll)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/, /^\s*(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)\s*$/]
  for (const p of pats) {
    const m = s.match(p)
    if (m) return [+m[1], +m[2]]
  }
  return null
}

interface Draft {
  name: string; cuisine: CuisineKey; list: SavedRow['list']; gcat: string
  lo: string; hi: string; addr: string; phone: string; lat: string; lng: string
  rating: string; reviews: string; hoursOn: boolean; days: string[]; tags: TagKey[]
}

function toDraft(r?: SavedRow): Draft {
  return {
    name: r?.name ?? '', cuisine: (r?.cuisine as CuisineKey) ?? 'taiwanese', list: r?.list ?? 'want', gcat: r?.gcat ?? '',
    lo: r?.priceRange ? String(r.priceRange[0]) : '', hi: r?.priceRange && r.priceRange[1] < 99999 ? String(r.priceRange[1]) : '',
    addr: r?.addr ?? '', phone: r?.phone ?? '', lat: r ? String(r.lat) : '', lng: r ? String(r.lng) : '',
    rating: r?.rating ? String(r.rating) : '', reviews: r?.reviews ? String(r.reviews) : '',
    hoursOn: !!r?.hours, days: r?.hours ? r.hours.map(dayText) : Array(7).fill('11:00-21:00'), tags: (r?.tags as TagKey[]) ?? [],
  }
}

/** 草稿 → 送給伺服器的資料；有錯回傳錯誤訊息 */
function fromDraft(d: Draft): PlaceInput | string {
  if (!d.name.trim()) return '請輸入店名'
  const lat = parseFloat(d.lat), lng = parseFloat(d.lng)
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return '座標不正確（可以貼 Google 地圖網址）'
  let priceRange: [number, number] | null = null
  if (d.lo || d.hi) {
    const lo = d.lo ? parseInt(d.lo, 10) : 1
    const hi = d.hi ? parseInt(d.hi, 10) : 99999
    if (!(lo >= 0 && hi >= lo)) return '價位不正確'
    priceRange = [lo, hi]
  }
  let hours: [number, number][][] | null = null
  if (d.hoursOn) {
    hours = []
    for (let i = 0; i < 7; i++) {
      const day = parseDay(d.days[i])
      if (!day) return `${DAYS[i][0]}的營業時間格式不對（例：11:30-14:00, 17:30-21:00）`
      hours.push(day)
    }
  }
  const rating = d.rating ? parseFloat(d.rating) : 0
  if (!(rating >= 0 && rating <= 5)) return '評分要在 0–5 之間'
  return {
    name: d.name.trim(), cuisine: d.cuisine, list: d.list, gcat: d.gcat.trim(), lat, lng,
    rating, reviews: d.reviews ? Math.max(0, parseInt(d.reviews, 10) || 0) : 0,
    priceRange, addr: d.addr.trim(), phone: d.phone.trim(), hours, tags: d.tags,
  }
}

export function AdminPlaces({ id }: { id?: string }) {
  const t = useT()
  const isAdmin = !!useStore(s => s.adminKey)
  useStore(s => s.placesVer)
  if (!isAdmin) {
    return (
      <div className="screen">
        <Header title={t('管理餐廳', 'Manage places')} left={<BackBtn to="/me" />} />
        <p className="empty">{t('請先到「我的 → 設定 → 管理員」登入', 'Sign in as admin in Me → Settings first')}</p>
      </div>
    )
  }
  if (id) return <PlaceEditor id={id === 'new' ? undefined : id} key={id} />
  return <PlaceList />
}

function PlaceList() {
  const t = useT()
  const lang = useStore(s => s.lang)
  const [q, setQ] = useState('')
  const all = rawPlaces()
  const list = useMemo(() => {
    const k = q.trim().toLowerCase()
    const rows = k ? all.filter(r => r.name.toLowerCase().includes(k) || r.addr.includes(k)) : all
    return [...rows].sort((a, b) => (b.id.startsWith('n') ? 1 : 0) - (a.id.startsWith('n') ? 1 : 0) || a.name.localeCompare(b.name, 'zh-Hant'))
  }, [q, all])
  return (
    <div className="screen adm">
      <Header title={t('管理餐廳', 'Manage places')} sub={t(`共 ${all.length} 家 · 改了全站和 App 立即生效`, `${all.length} places · changes go live everywhere`)} left={<BackBtn to="/me" />}
        right={<button className="btn small primary" onClick={() => nav('/admin/new')}><Ico name="plus" size={16} />{t('新增', 'Add')}</button>} />
      <div className="search"><Ico name="search" size={18} /><input placeholder={t('搜尋店名或地址', 'Search name or address')} value={q} onChange={e => setQ(e.target.value)} /></div>
      <ul className="adm-list">
        {list.map(r => {
          const c = CUISINE_MAP[r.cuisine as CuisineKey]
          return (
            <li key={r.id} onClick={() => nav('/admin/' + r.id)}>
              <Art name={(c?.key ?? 'taiwanese') as CuisineKey} size={30} />
              <div className="grow">
                <b>{r.name}</b>
                <small className="muted">{c?.[lang]}{r.addr ? ` · ${r.addr}` : ''}</small>
              </div>
              {r.id.startsWith('n') && <i className="adm-new">{t('新增', 'New')}</i>}
              <Ico name="chev" size={16} />
            </li>
          )
        })}
      </ul>
      {!list.length && <p className="empty">{t('找不到', 'No match')}</p>}
    </div>
  )
}

function PlaceEditor({ id }: { id?: string }) {
  const t = useT()
  const lang = useStore(s => s.lang)
  const orig = id ? rawPlace(id) : undefined
  const [d, setD] = useState<Draft>(() => toDraft(orig))
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [paste, setPaste] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (p: Partial<Draft>) => setD(x => ({ ...x, ...p }))
  const current = id ? placePhoto(place(id)) : null

  if (id && !orig) {
    return (
      <div className="screen">
        <Header title={t('找不到這家店', 'Not found')} left={<BackBtn to="/admin" />} />
      </div>
    )
  }

  function pickFile(f: File | null) {
    setFile(f)
    setPreview(f ? URL.createObjectURL(f) : null)
  }

  async function useHere() {
    try {
      const fix = await locate()
      set({ lat: fix.lat.toFixed(6), lng: fix.lng.toFixed(6) })
      toast(t(`已填入目前位置（±${fix.acc} m）`, `Filled in your location (±${fix.acc} m)`))
    } catch { toast(t('拿不到位置', 'Could not get location')) }
  }

  function applyPaste(s: string) {
    setPaste(s)
    const c = parseCoords(s)
    if (c) { set({ lat: c[0].toFixed(6), lng: c[1].toFixed(6) }); toast(t('已從網址取出座標', 'Coordinates found')) }
  }

  async function save() {
    const input = fromDraft(d)
    if (typeof input === 'string') { toast(input); return }
    setBusy(true)
    try {
      let pid = id
      if (pid) await updatePlace(pid, input)
      else pid = await createPlace(input)
      if (file) await uploadPhoto(pid, file)
      toast(t(id ? '已儲存，全站和 App 都會更新' : '已新增，全站和 App 都會看到', 'Saved for everyone'))
      nav(id ? '/r/' + pid : '/admin')
    } catch (e) {
      const m = (e as Error).message
      toast(m === 'unauthorized' ? t('管理員登入已失效，請重新登入', 'Admin session expired') : t(`儲存失敗：${m}`, `Save failed: ${m}`))
    } finally { setBusy(false) }
  }

  async function remove() {
    if (!id || !confirm(t(`確定刪除「${orig?.name}」？刪了就不能復原。`, `Delete "${orig?.name}"? This cannot be undone.`))) return
    setBusy(true)
    try { await deletePlace(id); toast(t('已刪除', 'Deleted')); nav('/admin') }
    catch (e) { toast(t(`刪除失敗：${(e as Error).message}`, 'Delete failed')) }
    finally { setBusy(false) }
  }

  const photoSrc = preview ?? current?.url
  return (
    <div className="screen adm">
      <Header title={id ? t('編輯餐廳', 'Edit place') : t('新增餐廳', 'Add place')} left={<BackBtn to="/admin" />} />

      <label className="adm-photo">
        {photoSrc ? <img src={photoSrc} alt="" /> : <span className="muted"><Ico name="plus" size={20} />{t('加照片', 'Add photo')}</span>}
        <input type="file" accept="image/*" onChange={e => pickFile(e.target.files?.[0] ?? null)} />
        {photoSrc && <small>{file ? t('儲存後上傳', 'Uploads on save') : t('點一下換照片', 'Tap to replace')}</small>}
      </label>

      <Field label={t('店名', 'Name')}><input className="input" value={d.name} onChange={e => set({ name: e.target.value })} /></Field>

      <Field label={t('分類', 'Category')}>
        <select className="input" value={d.cuisine} onChange={e => set({ cuisine: e.target.value as CuisineKey })}>
          {CUISINES.map(c => <option key={c.key} value={c.key}>{c[lang]}</option>)}
        </select>
      </Field>

      <div className="adm-row">
        <Field label={t('每人最低', 'Min / person')}><input className="input" inputMode="numeric" placeholder={t('空白＝未提供', 'blank = n/a')} value={d.lo} onChange={e => set({ lo: e.target.value.replace(/\D/g, '') })} /></Field>
        <Field label={t('每人最高', 'Max / person')}><input className="input" inputMode="numeric" placeholder={t('空白＝以上', 'blank = and up')} value={d.hi} onChange={e => set({ hi: e.target.value.replace(/\D/g, '') })} /></Field>
      </div>

      <Field label={t('地址', 'Address')}><input className="input" value={d.addr} onChange={e => set({ addr: e.target.value })} /></Field>

      <Field label={t('位置', 'Location')} hint={t('貼上 Google 地圖的店家網址會自動填座標', 'Paste a Google Maps link to fill coordinates')}>
        <input className="input" placeholder={t('貼上 Google 地圖網址', 'Paste Google Maps link')} value={paste} onChange={e => applyPaste(e.target.value)} />
        <div className="adm-row">
          <input className="input" inputMode="decimal" placeholder={t('緯度', 'Latitude')} value={d.lat} onChange={e => set({ lat: e.target.value })} />
          <input className="input" inputMode="decimal" placeholder={t('經度', 'Longitude')} value={d.lng} onChange={e => set({ lng: e.target.value })} />
        </div>
        <button type="button" className="btn small soft" onClick={useHere}><Ico name="nav" size={14} />{t('用我現在的位置', 'Use my location')}</button>
      </Field>

      <Field label={t('電話', 'Phone')}><input className="input" inputMode="tel" value={d.phone} onChange={e => set({ phone: e.target.value })} /></Field>

      <div className="adm-row">
        <Field label={t('評分（0–5）', 'Rating (0–5)')}><input className="input" inputMode="decimal" value={d.rating} onChange={e => set({ rating: e.target.value })} /></Field>
        <Field label={t('評論數', 'Reviews')}><input className="input" inputMode="numeric" value={d.reviews} onChange={e => set({ reviews: e.target.value.replace(/\D/g, '') })} /></Field>
      </div>

      <Field label={t('收藏標籤', 'List')}>
        <div className="seg wide">
          {([['want', '想去', 'Want'], ['fav', '喜愛', 'Favorite'], ['star', '星號', 'Starred']] as const).map(([k, zh, en]) => (
            <button key={k} type="button" className={d.list === k ? 'on' : ''} onClick={() => set({ list: k })}>{t(zh, en)}</button>
          ))}
        </div>
      </Field>

      <Field label={t('特色', 'Tags')}>
        <div className="chips wrap">
          {(Object.keys(TAGS) as TagKey[]).map(k => (
            <button key={k} type="button" className={`chip ${d.tags.includes(k) ? 'on' : ''}`} onClick={() => set({ tags: d.tags.includes(k) ? d.tags.filter(x => x !== k) : [...d.tags, k] })}>{TAGS[k][lang === 'zh' ? 0 : 1]}</button>
          ))}
        </div>
      </Field>

      <Field label={t('營業時間', 'Hours')} hint={t('格式 11:30-14:00, 17:30-21:00；空白＝公休；跨夜寫 18:00-02:00', 'e.g. 11:30-14:00, 17:30-21:00; blank = closed')}>
        <label className="adm-check"><input type="checkbox" checked={d.hoursOn} onChange={e => set({ hoursOn: e.target.checked })} />{t('有營業時間資料', 'Hours known')}</label>
        {d.hoursOn && (
          <>
            {DAYS.map(([zh, en], i) => (
              <div className="adm-day" key={i}>
                <span>{t(zh, en)}</span>
                <input className="input" placeholder={t('公休', 'Closed')} value={d.days[i]} onChange={e => set({ days: d.days.map((x, j) => (j === i ? e.target.value : x)) })} />
              </div>
            ))}
            <button type="button" className="btn small soft" onClick={() => set({ days: Array(7).fill(d.days[1]) })}>{t('全部套用週一的時間', 'Copy Monday to all days')}</button>
          </>
        )}
      </Field>

      <div className="btn-col adm-actions">
        <button className="btn primary big" disabled={busy} onClick={save}>{busy ? t('儲存中…', 'Saving…') : id ? t('儲存（全站和 App 生效）', 'Save for everyone') : t('新增餐廳', 'Add place')}</button>
        {id && <button className="btn ghost danger" disabled={busy} onClick={remove}><Ico name="x" size={16} />{t('刪除這家店', 'Delete this place')}</button>}
      </div>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="adm-field">
      <span className="adm-label">{label}</span>
      {children}
      {hint && <small className="muted">{hint}</small>}
    </div>
  )
}
