import { useEffect, useState, type ReactNode } from 'react'
import { CUISINE_MAP, type Restaurant } from '../data/restaurants'
import { distanceKm, fmtDist, lowConfidence, openStatus, trustScore, walkMin } from '../lib/logic'
import { nav } from '../lib/router'
import { useStore, useT } from '../lib/store'

/** 店家封面：測試版沒有照片，用料理配色＋圖示畫一張 */
export function Cover({ r, h = 140, children, round = true }: { r: Restaurant; h?: number; children?: ReactNode; round?: boolean }) {
  const c = CUISINE_MAP[r.cuisine]
  const seed = parseInt(r.id.slice(1), 10)
  const hue = c.hue + ((seed * 7) % 16) - 8
  return (
    <div
      className="cover"
      style={{
        height: h,
        borderRadius: round ? 16 : 0,
        background: `radial-gradient(circle at ${20 + (seed * 13) % 60}% 30%, hsl(${hue} 85% 72%), hsl(${hue + 18} 70% 48%))`,
      }}
    >
      <div className="cover-dots" />
      <span className="cover-emoji" style={{ fontSize: h * 0.42, transform: `rotate(${(seed % 5) * 6 - 12}deg)` }}>{c.emoji}</span>
      {children}
    </div>
  )
}

export function Stars({ v, size = 13 }: { v: number; size?: number }) {
  const full = Math.round(v * 2) / 2
  return (
    <span className="stars" style={{ fontSize: size }} aria-label={`${v} / 5`}>
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} className={i <= full ? 'on' : i - 0.5 === full ? 'half' : ''}>★</span>
      ))}
    </span>
  )
}

export function ScoreBadge({ r, big }: { r: Restaurant; big?: boolean }) {
  const t = useT()
  const s = trustScore(r)
  const tone = lowConfidence(r) ? 'warn' : s >= 4.3 ? 'great' : s >= 3.9 ? 'good' : 'meh'
  return (
    <span className={`score ${tone} ${big ? 'big' : ''}`} title={t('可信分數', 'Trust score')}>
      <b>{s.toFixed(1)}</b>
      {big && <small>{t('可信分數', 'Trust score')}</small>}
    </span>
  )
}

export function Chip({ on, children, onClick }: { on?: boolean; children: ReactNode; onClick?: () => void }) {
  return <button type="button" className={`chip ${on ? 'on' : ''}`} onClick={onClick}>{children}</button>
}

export function Toggle({ on, onChange, label, hint }: { on: boolean; onChange: (v: boolean) => void; label: ReactNode; hint?: ReactNode }) {
  return (
    <label className="toggle-row">
      <span><span className="toggle-label">{label}</span>{hint && <small className="hint">{hint}</small>}</span>
      <button type="button" role="switch" aria-checked={on} className={`switch ${on ? 'on' : ''}`} onClick={() => onChange(!on)}><i /></button>
    </label>
  )
}

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode }) {
  if (!open) return null
  return (
    <div className="sheet-wrap" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet-grip" />
        <div className="sheet-head"><h3>{title}</h3><button className="icon-btn" onClick={onClose} aria-label="close">✕</button></div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  )
}

/** 列表上的一列店家 */
export function RestaurantRow({ r, right }: { r: Restaurant; right?: ReactNode }) {
  const t = useT()
  const lang = useStore(s => s.lang)
  const fav = useStore(s => s.favorites.includes(r.id))
  const c = CUISINE_MAP[r.cuisine]
  const km = distanceKm(r)
  const os = openStatus(r)
  return (
    <div className="row-card" onClick={() => nav('/r/' + r.id)} role="button" tabIndex={0}>
      <Cover r={r} h={84}>{r.sponsored && <span className="ad-tag">{t('廣告', 'Ad')}</span>}</Cover>
      <div className="row-main">
        <div className="row-title">
          <b>{r.name[lang]}</b>
          {fav && <span className="heart">♥</span>}
        </div>
        <div className="row-sub">
          <Stars v={r.rating} /> <span className="muted">{r.rating.toFixed(1)} ({r.reviews})</span>
        </div>
        <div className="row-meta">
          <span>{c[lang]}</span>·<span>NT${r.price}</span>·<span>{fmtDist(km)} · {t(`走路 ${walkMin(km)} 分`, `${walkMin(km)} min walk`)}</span>
        </div>
        <div className={`row-open ${os.open ? (os.closingSoon ? 'soon' : 'open') : 'closed'}`}>
          {os.open ? (os.closingSoon ? t('快打烊・', 'Closing soon · ') : t('營業中・', 'Open · ')) : t('休息中・', 'Closed · ')}
          {lang === 'zh' ? os.text[0] : os.text[1]}
        </div>
      </div>
      <div className="row-right">{right ?? <ScoreBadge r={r} />}</div>
    </div>
  )
}

export function AdSlot({ kind = 'banner' }: { kind?: 'banner' | 'card' }) {
  const t = useT()
  const show = useStore(s => s.showAds)
  if (!show) return null
  return (
    <div className={`ad-slot ${kind}`}>
      <span>{t('廣告版位（測試）', 'Ad slot (test)')}</span>
      <small>{t('免費版顯示，購買通行證後移除', 'Removed with EAT WHAT Pass')}</small>
    </div>
  )
}

// ---- toast ----
let pushToast: (m: string) => void = () => {}
export function toast(m: string) { pushToast(m) }

export function Toaster() {
  const [msg, setMsg] = useState<string | null>(null)
  useEffect(() => {
    let timer = 0
    pushToast = m => { setMsg(m); clearTimeout(timer); timer = window.setTimeout(() => setMsg(null), 2200) }
  }, [])
  return msg ? <div className="toast">{msg}</div> : null
}

export function Header({ title, left, right, sub }: { title: ReactNode; left?: ReactNode; right?: ReactNode; sub?: ReactNode }) {
  return (
    <header className="hdr">
      <div className="hdr-l">{left}</div>
      <div className="hdr-c"><h1>{title}</h1>{sub && <small>{sub}</small>}</div>
      <div className="hdr-r">{right}</div>
    </header>
  )
}

export function Logo({ small }: { small?: boolean }) {
  return (
    <span className={`logo ${small ? 'small' : ''}`}>
      <span className="eat">EAT</span> <span className="what">WHAT</span>
      <svg viewBox="0 0 40 26" className="cloche" aria-hidden><path d="M4 20a16 16 0 0 1 32 0z" fill="none" stroke="currentColor" strokeWidth="3" /><rect x="1" y="20" width="38" height="3.5" rx="1.75" fill="currentColor" /><circle cx="20" cy="4.5" r="2.2" fill="currentColor" /></svg>
    </span>
  )
}
