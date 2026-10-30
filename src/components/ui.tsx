import { useEffect, useState, type ReactNode } from 'react'
import { CUISINE_MAP, type Restaurant } from '../data/restaurants'
import { photos } from '../lib/assets'
import { distanceKm, fmtDist, lowConfidence, noRating, openStatus, trustScore, walkMin } from '../lib/logic'
import { nav } from '../lib/router'
import { useStore, useT } from '../lib/store'
import { Art, Ico } from './Ico'

/** 店家封面：示意照片＋底部漸層（放店名用） */
export function Cover({ r, h = 140, children, round = true, shade = true, alt }: {
  r: Restaurant; h?: number | string; children?: ReactNode; round?: boolean; shade?: boolean; alt?: 1
}) {
  const src = photos(r)[alt ?? 0]
  return (
    <div className={`cover ${round ? 'rounded' : ''}`} style={{ height: h }}>
      <img src={src} alt="" loading="lazy" draggable={false} />
      {shade && <div className="cover-shade" />}
      {children}
    </div>
  )
}

export function Stars({ v, size = 12 }: { v: number; size?: number }) {
  return (
    <span className="stars" aria-label={`${v} / 5`}>
      {[1, 2, 3, 4, 5].map(i => {
        const fill = Math.max(0, Math.min(1, v - i + 1))
        return (
          <span key={i} className="star" style={{ width: size, height: size }}>
            <Ico name="star" size={size} fill stroke={0} className="star-bg" />
            <span className="star-fg" style={{ width: `${fill * 100}%` }}><Ico name="star" size={size} fill stroke={0} /></span>
          </span>
        )
      })}
    </span>
  )
}

export function scoreTone(r: Restaurant) {
  if (noRating(r)) return 'meh'
  const s = trustScore(r)
  return lowConfidence(r) ? 'warn' : s >= 4.3 ? 'great' : s >= 3.9 ? 'good' : 'meh'
}

export function ScoreBadge({ r, big, glass }: { r: Restaurant; big?: boolean; glass?: boolean }) {
  const t = useT()
  const s = trustScore(r)
  return (
    <span className={`score ${scoreTone(r)} ${big ? 'big' : ''} ${glass ? 'glass' : ''}`} title={t('可信分數', 'Trust score')}>
      <Ico name="star" size={big ? 16 : 11} fill stroke={0} />
      <b>{noRating(r) ? '—' : s.toFixed(1)}</b>
      {big && <small>{t('可信分數', 'Trust score')}</small>}
    </span>
  )
}

export function Chip({ on, children, onClick, className }: { on?: boolean; children: ReactNode; onClick?: () => void; className?: string }) {
  return <button type="button" className={`chip ${on ? 'on' : ''} ${className ?? ''}`} onClick={onClick}>{children}</button>
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
        <div className="sheet-head"><h3>{title}</h3><button className="icon-btn soft" onClick={onClose} aria-label="close"><Ico name="x" size={18} /></button></div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  )
}

export function OpenText({ r }: { r: Restaurant }) {
  const t = useT()
  const lang = useStore(s => s.lang)
  const os = openStatus(r)
  if (os.unknown) return <span className="open-text unknown"><i />{t('營業時間未提供', 'Hours unknown')}</span>
  return (
    <span className={`open-text ${os.open ? (os.closingSoon ? 'soon' : 'open') : 'closed'}`}>
      <i />{os.open ? (os.closingSoon ? t('快打烊', 'Closing soon') : t('營業中', 'Open')) : t('休息中', 'Closed')}
      <span className="muted"> · {lang === 'zh' ? os.text[0] : os.text[1]}</span>
    </span>
  )
}

/** 評論數縮寫：25549 → 2.6萬 / 25.5k */
export function fmtCount(n: number, lang: 'zh' | 'en') {
  if (n < 10000) return n.toLocaleString()
  return lang === 'zh' ? `${(n / 10000).toFixed(1)}萬` : `${(n / 1000).toFixed(1)}k`
}

/** 列表上的一列店家 */
export function RestaurantRow({ r, right }: { r: Restaurant; right?: ReactNode }) {
  const t = useT()
  const lang = useStore(s => s.lang)
  const fav = useStore(s => s.favorites.includes(r.id))
  const c = CUISINE_MAP[r.cuisine]
  const km = distanceKm(r)
  return (
    <div className="row-card" onClick={() => nav('/r/' + r.id)} role="button" tabIndex={0}>
      <div className="row-thumb">
        <Cover r={r} h="100%" shade={false} />
        {r.sponsored && <span className="ad-tag">{t('廣告', 'Ad')}</span>}
        {fav && <span className="row-fav"><Ico name="heart" size={12} fill stroke={0} /></span>}
      </div>
      <div className="row-main">
        <div className="row-title"><b>{r.name[lang]}</b>{r.google && <GoogleTag list={r.google.list} />}</div>
        <div className="row-sub">
          <Art name={r.cuisine} size={16} /> <span>{c[lang]}</span>
          <span className="dot" />
          <span>NT${r.price}</span>
        </div>
        <div className="row-sub">
          {noRating(r)
            ? <span className="muted">{t('尚無評分資料', 'No rating yet')}</span>
            : <><Stars v={r.rating} size={11} /> <span className="muted">{r.rating.toFixed(1)} ({fmtCount(r.reviews, lang)})</span></>}
        </div>
        <div className="row-meta">
          <OpenText r={r} />
          <span className="row-dist"><Ico name="walk" size={13} />{fmtDist(km)} · {t(`${walkMin(km)} 分`, `${walkMin(km)} min`)}</span>
        </div>
      </div>
      <div className="row-right">{right ?? <ScoreBadge r={r} />}</div>
    </div>
  )
}

/** 「我的 Google 收藏」小標籤：想去／喜愛／星號 */
export function GoogleTag({ list, long }: { list: 'want' | 'fav' | 'star'; long?: boolean }) {
  const t = useT()
  const [zh, en] = list === 'fav' ? ['喜愛', 'Favorite'] : list === 'star' ? ['星號', 'Starred'] : ['想去', 'Want to go']
  return (
    <span className={`gtag ${list}`}>
      <Ico name={list === 'fav' ? 'heart' : list === 'star' ? 'star' : 'flag'} size={10} fill={list !== 'want'} stroke={list === 'want' ? 2.4 : 0} />
      {long ? t(`我的 Google 收藏・${zh}`, `My Google saves · ${en}`) : t(zh, en)}
    </span>
  )
}

export function AdSlot({ kind = 'banner' }: { kind?: 'banner' | 'card' }) {
  const t = useT()
  const show = useStore(s => s.showAds)
  if (!show) return null
  return (
    <div className={`ad-slot ${kind}`}>
      <span className="ad-label">AD</span>
      <div><b>{t('廣告版位（測試）', 'Ad slot (test)')}</b><small>{t('免費版顯示，購買通行證後移除', 'Removed with EAT WHAT Pass')}</small></div>
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
    pushToast = m => { setMsg(m); clearTimeout(timer); timer = window.setTimeout(() => setMsg(null), Math.max(2200, m.length * 110)) }
  }, [])
  return msg ? <div className="toast">{msg}</div> : null
}

/** 頁首：大標題靠左（iOS 風格），left 放返回鍵 */
export function Header({ title, left, right, sub }: { title: ReactNode; left?: ReactNode; right?: ReactNode; sub?: ReactNode }) {
  return (
    <header className="hdr">
      {left && <div className="hdr-l">{left}</div>}
      <div className="hdr-c">{sub && <small>{sub}</small>}<h1>{title}</h1></div>
      {right && <div className="hdr-r">{right}</div>}
    </header>
  )
}

export function BackBtn({ to }: { to: string }) {
  return <button className="icon-btn soft" onClick={() => nav(to)} aria-label="back"><Ico name="back" size={20} /></button>
}

const AV_COLORS = ['#ff6b3d', '#2bb673', '#4c7dff', '#f2a516', '#b05cff', '#ff4f8b', '#16a3b8', '#7a8b2f']

/** 文字頭像：取名字第一個字，顏色由名字決定 */
export function Avatar({ name, size = 38, me }: { name: string; size?: number; me?: boolean }) {
  let h = 0
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return (
    <span className={`avatar ${me ? 'me' : ''}`} style={{ width: size, height: size, fontSize: size * 0.42, background: AV_COLORS[h % AV_COLORS.length] }}>
      {[...name.trim()][0]?.toUpperCase() || '?'}
    </span>
  )
}

export function Logo({ small, light }: { small?: boolean; light?: boolean }) {
  return (
    <span className={`logo ${small ? 'small' : ''} ${light ? 'light' : ''}`}>
      <Art name="rice" size={small ? 26 : 40} />
      <span className="logo-word"><b>EAT</b>WHAT</span>
    </span>
  )
}
