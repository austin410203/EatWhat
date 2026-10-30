import { useMemo, useRef, useState } from 'react'
import { CUISINES, CUISINE_MAP, type Restaurant } from '../data/restaurants'
import { FilterPanel, BudgetSlider, DistanceChips } from '../components/FilterPanel'
import { Chip, Cover, Logo, ScoreBadge, Sheet, toast } from '../components/ui'
import { applyFilters, distanceKm, fmtDist, openStatus, pickN, walkMin } from '../lib/logic'
import { createRoom } from '../lib/room'
import { nav } from '../lib/router'
import { getState, markEaten, setFilters, useStore, useT } from '../lib/store'

type Phase = 'idle' | 'rolling' | 'picked'

export function mapsUrl(r: Restaurant) {
  return `https://www.google.com/maps/dir/?api=1&destination=${r.lat.toFixed(5)},${r.lng.toFixed(5)}&travelmode=walking`
}

export function DecisionSheet({ r, onClose }: { r: Restaurant | null; onClose: () => void }) {
  const t = useT()
  const lang = useStore(s => s.lang)
  if (!r) return null
  const km = distanceKm(r)
  return (
    <Sheet open onClose={onClose} title={t('就決定是你了！', "It's decided!")}>
      <div className="decided">
        <div className="confetti" aria-hidden>{['🎉', '✨', '🎊'].map((x, i) => <span key={i}>{x}</span>)}</div>
        <Cover r={r} h={150}><div className="cover-name"><b>{r.name[lang]}</b><span>{CUISINE_MAP[r.cuisine][lang]} · NT${r.price}</span></div></Cover>
        <p className="muted center">{fmtDist(km)} · {t(`走路約 ${walkMin(km)} 分鐘`, `about ${walkMin(km)} min walk`)}</p>
        <div className="btn-col">
          <a className="btn primary" href={mapsUrl(r)} target="_blank" rel="noreferrer" onClick={() => { markEaten(r.id); toast(t('已記到「最近吃過」', 'Saved to history')) }}>
            🧭 {t('出發！開啟導航', 'Go! Open directions')}
          </a>
          <button className="btn" onClick={() => { onClose(); nav('/r/' + r.id) }}>{t('看店家資訊', 'View details')}</button>
          <button className="btn ghost" onClick={() => { markEaten(r.id); toast(t('已記到「最近吃過」', 'Saved to history')); onClose() }}>✔ {t('就吃這家（只記錄）', 'Eat here (log only)')}</button>
        </div>
      </div>
    </Sheet>
  )
}

export function Decide() {
  const t = useT()
  const lang = useStore(s => s.lang)
  const f = useStore(s => s.filters)
  const s = useStore(s => s)
  const [phase, setPhase] = useState<Phase>('idle')
  const [picks, setPicks] = useState<Restaurant[]>([])
  const [seen, setSeen] = useState<Set<string>>(new Set())
  const [more, setMore] = useState(false)
  const [chosen, setChosen] = useState<Restaurant | null>(null)
  const [reel, setReel] = useState(['🍜', '🍱', '🍣'])
  const timer = useRef(0)

  const pool = useMemo(() => applyFilters(f, s), [f, s])

  function roll(n = 3) {
    if (!pool.length) return
    setPhase('rolling')
    const emojis = CUISINES.map(c => c.emoji)
    clearInterval(timer.current)
    timer.current = window.setInterval(() => {
      setReel([0, 1, 2].map(() => emojis[Math.floor(Math.random() * emojis.length)]))
    }, 80)
    const result = pickN(pool, n, getState())
    setTimeout(() => {
      clearInterval(timer.current)
      setPicks(result)
      setSeen(new Set(result.map(r => r.id)))
      setPhase('picked')
      if (n === 1 && result[0]) setChosen(result[0])
    }, 1100)
  }

  function swap(i: number) {
    const others = new Set([...seen, ...picks.map(p => p.id)])
    const [next] = pickN(pool, 1, getState(), others)
    if (!next) { toast(t('沒有其他符合條件的店了', 'No more matches')); return }
    setSeen(new Set([...others, next.id]))
    setPicks(p => p.map((x, k) => (k === i ? next : x)))
  }

  function toGroup() {
    const room = createRoom(t('等等吃什麼？', 'What to eat?'), picks.map(p => p.id))
    nav('/room/' + room.code)
  }

  return (
    <div className="screen decide">
      <div className="hero">
        <Logo />
        <p className="tagline">{t('30 秒決定吃什麼', 'Decide what to eat in 30s')}</p>
        <span className="loc">📍 {t('中山站附近（模擬位置）', 'Near Zhongshan Stn (mock)')}</span>
      </div>

      {phase !== 'picked' && (
        <div className="card filters-card">
          <BudgetSlider />
          <DistanceChips />
          <div className="chips scroll">
            <Chip on={!f.cuisines.length} onClick={() => setFilters({ cuisines: [] })}>{t('都可以', 'Anything')}</Chip>
            {CUISINES.map(c => (
              <Chip key={c.key} on={f.cuisines.includes(c.key)} onClick={() => setFilters({ cuisines: f.cuisines.includes(c.key) ? f.cuisines.filter(x => x !== c.key) : [...f.cuisines, c.key] })}>
                {c.emoji} {c[lang]}
              </Chip>
            ))}
          </div>
          <div className="chips">
            <Chip on={f.openNow} onClick={() => setFilters({ openNow: !f.openNow })}>🕒 {t('營業中', 'Open now')}</Chip>
            <Chip on={f.trusted} onClick={() => setFilters({ trusted: !f.trusted })}>🛡️ {t('推薦模式', 'Trusted')}</Chip>
            <button className="link-btn" onClick={() => setMore(true)}>{t('更多條件 ›', 'More ›')}</button>
          </div>
          <div className="pool-count">
            {pool.length
              ? <>{t('符合條件', 'Matches')} <b>{pool.length}</b> {t('家', '')} · <button className="link-btn" onClick={() => nav('/explore')}>{t('看全部', 'See all')}</button></>
              : <span className="warn-text">{t('沒有符合的店，放寬預算或距離試試', 'No matches — try a bigger budget or radius')}</span>}
          </div>
        </div>
      )}

      {phase === 'rolling' && (
        <div className="reel">{reel.map((e, i) => <span key={i}>{e}</span>)}</div>
      )}

      {phase === 'idle' && (
        <div className="cta">
          <button className="btn big primary" disabled={!pool.length} onClick={() => roll(3)}>🎲 {t('幫我決定！', 'Decide for me!')}</button>
          <button className="btn ghost" disabled={!pool.length} onClick={() => roll(1)}>{t('隨便啦，直接給我一家', 'Just pick one for me')}</button>
        </div>
      )}

      {phase === 'picked' && (
        <>
          <div className="picks-head">
            <h2>{t('今天就從這 3 家選一家', 'Pick one of these 3')}</h2>
            <button className="link-btn" onClick={() => setPhase('idle')}>{t('‹ 改條件', '‹ Filters')}</button>
          </div>
          <div className="picks">
            {picks.map((r, i) => {
              const km = distanceKm(r)
              const os = openStatus(r)
              return (
                <div className="pick flip-in" style={{ animationDelay: `${i * 120}ms` }} key={r.id}>
                  <div onClick={() => nav('/r/' + r.id)} role="button">
                    <Cover r={r} h={120}>
                      <div className="cover-name"><b>{r.name[lang]}</b><span>{CUISINE_MAP[r.cuisine][lang]}</span></div>
                      <div className="cover-score"><ScoreBadge r={r} /></div>
                    </Cover>
                  </div>
                  <div className="pick-meta">
                    <span>NT${r.price}</span><span>{fmtDist(km)}</span>
                    <span className={os.open ? 'ok' : 'bad'}>{lang === 'zh' ? os.text[0] : os.text[1]}</span>
                  </div>
                  <div className="pick-actions">
                    <button className="btn small" onClick={() => swap(i)}>🔄 {t('換一家', 'Swap')}</button>
                    <button className="btn small primary" onClick={() => setChosen(r)}>{t('就這家！', 'This one!')}</button>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="btn-row">
            <button className="btn" onClick={() => roll(3)}>🎲 {t('全部重抽', 'Reroll all')}</button>
            <button className="btn accent" onClick={toGroup}>👥 {t('丟到群組投票', 'Let friends vote')}</button>
          </div>
        </>
      )}

      <Sheet open={more} onClose={() => setMore(false)} title={t('篩選條件', 'Filters')}>
        <FilterPanel />
        <button className="btn primary block" onClick={() => setMore(false)}>{t(`套用（${pool.length} 家）`, `Apply (${pool.length})`)}</button>
      </Sheet>
      <DecisionSheet r={chosen} onClose={() => setChosen(null)} />
    </div>
  )
}

