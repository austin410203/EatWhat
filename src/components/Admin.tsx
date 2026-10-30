import { useState } from 'react'
import { CUISINES, type CuisineKey, type Restaurant } from '../data/restaurants'
import { adminLogin, adminLogout, resetEdit, saveEdit } from '../lib/api'
import { priceText } from '../lib/logic'
import { useStore, useT } from '../lib/store'
import { Art, Ico } from './Ico'
import { Sheet, toast } from './ui'

// 管理員功能：登入後可以在店家頁修改分類和價格，改了全站使用者都會看到。

const PRESETS: [number, number][] = [[1, 200], [200, 400], [400, 600], [600, 800], [800, 1000], [1000, 2000], [2000, 99999]]

export function useIsAdmin() {
  return !!useStore(s => s.adminKey)
}

/** 「我的」頁的管理員登入／登出 */
export function AdminRow() {
  const t = useT()
  const isAdmin = useIsAdmin()
  const [open, setOpen] = useState(false)
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState(false)
  async function login() {
    setBusy(true)
    const ok = await adminLogin(pw.trim())
    setBusy(false)
    if (ok) { setOpen(false); setPw(''); toast(t('已用管理員身分登入', 'Signed in as admin')) }
    else toast(t('密碼不對，或目前連不到伺服器', 'Wrong password or server unreachable'))
  }
  return (
    <>
      <div className="toggle-row">
        <span>
          <span className="toggle-label">{t('管理員', 'Admin')}</span>
          <small className="hint">{isAdmin ? t('已登入：店家頁可以修改分類和價格', 'Signed in: edit category and price on place pages') : t('登入後可以修改店家的分類和價格', 'Sign in to edit categories and prices')}</small>
        </span>
        {isAdmin
          ? <button className="btn small" onClick={() => { adminLogout(); toast(t('已登出管理員', 'Signed out')) }}>{t('登出', 'Sign out')}</button>
          : <button className="btn small" onClick={() => setOpen(true)}>{t('登入', 'Sign in')}</button>}
      </div>
      <Sheet open={open} onClose={() => setOpen(false)} title={t('管理員登入', 'Admin sign-in')}>
        <input className="input" type="password" autoComplete="current-password" placeholder={t('管理員密碼', 'Admin password')} value={pw}
          onChange={e => setPw(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && pw.trim()) login() }} />
        <button className="btn primary block" disabled={!pw.trim() || busy} onClick={login}>{busy ? t('確認中…', 'Checking…') : t('登入', 'Sign in')}</button>
      </Sheet>
    </>
  )
}

/** 店家頁上的「修改分類／價格」（只有管理員看得到） */
export function EditPlaceButton({ r }: { r: Restaurant }) {
  const t = useT()
  const lang = useStore(s => s.lang)
  const [open, setOpen] = useState(false)
  const [cuisine, setCuisine] = useState<CuisineKey>(r.cuisine)
  const [range, setRange] = useState<[number, number] | null>(r.priceRange ?? null)
  const [lo, setLo] = useState('')
  const [hi, setHi] = useState('')
  const [busy, setBusy] = useState(false)

  function openSheet() {
    setCuisine(r.cuisine); setRange(r.priceRange ?? null); setLo(''); setHi(''); setOpen(true)
  }
  function custom() {
    const a = parseInt(lo, 10), b = parseInt(hi, 10)
    if (Number.isFinite(a) && Number.isFinite(b) && a >= 0 && b >= a) setRange([a, b])
    else if (Number.isFinite(a) && !hi) setRange([a, 99999])
    else toast(t('請輸入正確的金額', 'Enter a valid amount'))
  }
  async function save() {
    setBusy(true)
    try {
      await saveEdit(r.id, { cuisine, priceRange: range })
      toast(t('已更新，所有人都會看到', 'Saved for everyone'))
      setOpen(false)
    } catch (e) {
      toast((e as Error).message === 'unauthorized' ? t('管理員登入已失效，請重新登入', 'Admin session expired') : t('存檔失敗，請稍後再試', 'Save failed'))
    } finally { setBusy(false) }
  }
  async function reset() {
    setBusy(true)
    try { await resetEdit(r.id); toast(t('已還原成原始資料', 'Restored')); setOpen(false) }
    catch { toast(t('還原失敗', 'Restore failed')) }
    finally { setBusy(false) }
  }
  const same = (a: [number, number] | null, b: [number, number] | null) => (a === null && b === null) || (!!a && !!b && a[0] === b[0] && a[1] === b[1])
  const preview = { ...r, priceRange: range, google: r.google }

  return (
    <>
      <button className="admin-edit" onClick={openSheet}><Ico name="sliders" size={15} />{t('修改分類／價格', 'Edit category / price')}{r.edited && <i>{t('已修改', 'edited')}</i>}</button>
      <Sheet open={open} onClose={() => setOpen(false)} title={t('修改店家資料', 'Edit place')}>
        <p className="muted small">{r.name[lang]}{r.google?.cat ? ` · Google：${r.google.cat}` : ''}</p>
        <h4 className="edit-h">{t('分類', 'Category')}</h4>
        <div className="edit-cats">
          {CUISINES.map(c => (
            <button key={c.key} className={`chip ${cuisine === c.key ? 'on' : ''}`} onClick={() => setCuisine(c.key)}><Art name={c.key} size={20} />{c[lang]}</button>
          ))}
        </div>
        <h4 className="edit-h">{t('每人價位', 'Price per person')} <span className="muted">{priceText(preview, lang)}</span></h4>
        <div className="chips wrap">
          {PRESETS.map(p => (
            <button key={p.join('-')} className={`chip ${same(range, p) ? 'on' : ''}`} onClick={() => setRange(p)}>{priceText({ ...r, priceRange: p }, lang)}</button>
          ))}
          <button className={`chip ${range === null ? 'on' : ''}`} onClick={() => setRange(null)}>{t('未提供', 'Unknown')}</button>
        </div>
        <div className="edit-custom">
          <input className="input" inputMode="numeric" placeholder={t('最低', 'Min')} value={lo} onChange={e => setLo(e.target.value.replace(/\D/g, ''))} />
          <span>–</span>
          <input className="input" inputMode="numeric" placeholder={t('最高（空白＝以上）', 'Max (blank = and up)')} value={hi} onChange={e => setHi(e.target.value.replace(/\D/g, ''))} />
          <button className="btn small" onClick={custom}>{t('套用', 'Use')}</button>
        </div>
        <button className="btn primary block" disabled={busy} onClick={save}>{busy ? t('儲存中…', 'Saving…') : t('儲存（全站生效）', 'Save for everyone')}</button>
        {r.edited && <button className="btn ghost block" disabled={busy} onClick={reset}>{t('還原成原始資料', 'Restore original')}</button>}
      </Sheet>
    </>
  )
}
