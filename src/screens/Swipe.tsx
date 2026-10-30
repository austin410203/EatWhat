import { useMemo, useRef, useState } from 'react'
import { CUISINES, type Cuisine } from '../data/restaurants'
import { Art, Ico } from '../components/Ico'
import { Header } from '../components/ui'
import { cuisinePhoto } from '../lib/assets'
import { nav } from '../lib/router'
import { setState, useStore, useT } from '../lib/store'

function shuffle<T>(a: T[]) {
  const b = [...a]
  for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]] }
  return b
}

export function Swipe() {
  const t = useT()
  const lang = useStore(s => s.lang)
  const [round, setRound] = useState(0)
  const deck = useMemo(() => shuffle(CUISINES).map(c => ({ c, dish: c.dishes[Math.floor(Math.random() * c.dishes.length)] })), [round])
  const [idx, setIdx] = useState(0)
  const [dx, setDx] = useState(0)
  const [leaving, setLeaving] = useState<0 | 1 | -1 | 2>(0)
  const [liked, setLiked] = useState<Cuisine[]>([])
  const start = useRef<number | null>(null)

  const card = deck[idx]
  const next = deck[idx + 1]

  function decide(v: 1 | -1 | 2) {
    if (!card || leaving) return
    setLeaving(v)
    setState(s => {
      const cur = s.taste[card.c.key] ?? 0
      return { taste: { ...s.taste, [card.c.key]: Math.max(-3, Math.min(3, cur + (v === 2 ? 2 : v))) } }
    })
    if (v > 0) setLiked(l => [...l, card.c])
    setTimeout(() => { setIdx(i => i + 1); setDx(0); setLeaving(0) }, 260)
  }

  const onDown = (e: React.PointerEvent) => { start.current = e.clientX; (e.target as HTMLElement).setPointerCapture?.(e.pointerId) }
  const onMove = (e: React.PointerEvent) => { if (start.current !== null) setDx(e.clientX - start.current) }
  const onUp = () => {
    if (start.current === null) return
    start.current = null
    if (dx > 90) decide(1)
    else if (dx < -90) decide(-1)
    else setDx(0)
  }

  const tx = leaving === 1 ? 480 : leaving === -1 ? -480 : leaving === 2 ? 0 : dx
  const ty = leaving === 2 ? -600 : 0

  return (
    <div className="screen swipe">
      <Header title={t('滑卡選口味', 'Swipe your taste')} sub={card ? `${idx + 1} / ${deck.length}` : t('完成！', 'Done!')} />
      {card ? (
        <>
          <p className="muted center">{t('右滑想吃、左滑不想，推薦會越來越合你胃口', 'Right = yum, left = nah. Picks adapt to you.')}</p>
          <div className="deck">
            {next && (
              <div className="swipe-card under">
                <img className="swipe-photo" src={cuisinePhoto(next.c.key)} alt="" draggable={false} />
              </div>
            )}
            <div
              className="swipe-card"
              style={{
                transform: `translate(${tx}px, ${ty}px) rotate(${tx / 18}deg)`,
                transition: start.current !== null ? 'none' : 'transform .26s ease',
              }}
              onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
            >
              <span className="stamp yes" style={{ opacity: Math.max(0, dx / 90) }}>{t('想吃', 'YUM')}</span>
              <span className="stamp no" style={{ opacity: Math.max(0, -dx / 90) }}>{t('不要', 'NAH')}</span>
              <img className="swipe-photo" src={cuisinePhoto(card.c.key)} alt="" draggable={false} />
              <div className="swipe-text">
                <Art name={card.c.key} size={64} className="swipe-art" />
                <b>{card.c[lang]}</b>
                <span>{lang === 'zh' ? card.dish[0] : card.dish[1]}</span>
                <small>{t(`每人約 NT$${card.c.price[0]}–${card.c.price[1]}`, `~NT$${card.c.price[0]}–${card.c.price[1]} pp`)}</small>
              </div>
            </div>
          </div>
          <div className="swipe-btns">
            <button className="round no" onClick={() => decide(-1)} aria-label="no"><Ico name="x" size={28} stroke={2.4} /></button>
            <button className="round star" onClick={() => decide(2)} aria-label="love"><Ico name="star" size={22} fill stroke={0} /></button>
            <button className="round yes" onClick={() => decide(1)} aria-label="yes"><Ico name="heart" size={28} fill stroke={0} /></button>
          </div>
        </>
      ) : (
        <div className="card swipe-done pop-in">
          <Art name="heart" size={88} className="join-art pop-in" />
          <h3>{t('口味記下來了！', 'Taste saved!')}</h3>
          {liked.length
            ? <><p className="muted">{t('你最近想吃', 'You are into')}</p><div className="liked">{liked.slice(0, 8).map(c => <span key={c.key} className="chip static"><Art name={c.key} size={20} />{c[lang]}</span>)}</div></>
            : <p className="muted">{t('好像都不太想吃…那就交給骰子吧！', 'Nothing caught your eye — let the dice decide!')}</p>}
          <div className="btn-col">
            <button className="btn primary" onClick={() => nav('/decide')}><Ico name="dice" size={18} />{t('用新口味幫我決定', 'Decide with my taste')}</button>
            <button className="btn" onClick={() => { setIdx(0); setLiked([]); setRound(r => r + 1) }}>{t('再滑一輪', 'Swipe again')}</button>
            <button className="btn ghost" onClick={() => nav('/me')}>{t('看我的口味', 'See my taste')}</button>
          </div>
        </div>
      )}
    </div>
  )
}
