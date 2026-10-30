import { useMemo, useRef, useState } from 'react'
import { CUISINES, CUISINE_MAP, type CuisineKey, type Restaurant } from '../data/restaurants'
import { FilterPanel, BudgetSlider, DistanceChips } from '../components/FilterPanel'
import { Art, Ico } from '../components/Ico'
import { Chip, Cover, OpenText, ScoreBadge, Sheet, toast } from '../components/ui'
import { applyFilters, distanceKm, fmtDist, pickN, walkMin } from '../lib/logic'
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
        <Art name="popper" size={64} className="decided-art pop-in" />
        <Cover r={r} h={180}>
          <div className="cover-name"><b>{r.name[lang]}</b><span>{CUISINE_MAP[r.cuisine][lang]} · NT${r.price} · {fmtDist(km)}</span></div>
        </Cover>
        <p className="muted center">{t(`走路約 ${walkMin(km)} 分鐘`, `About ${walkMin(km)} min on foot`)}</p>
        <div className="btn-col">
          <a className="btn primary big" href={mapsUrl(r)} target="_blank" rel="noreferrer" onClick={() => { markEaten(r.id); toast(t('已記到「最近吃過」', 'Saved to history')) }}>
            <Ico name="nav" size={18} />{t('出發！開啟導航', 'Go! Open directions')}
          </a>
          <button className="btn" onClick={() => { onClose(); nav('/r/' + r.id) }}>{t('看店家資訊', 'View details')}</button>
          <button className="btn ghost" onClick={() => { markEaten(r.id); toast(t('已記到「最近吃過」', 'Saved to history')); onClose() }}>
            <Ico name="check" size={16} />{t('就吃這家（只記錄）', 'Eat here (log only)')}
          </button>
        </div>
      </div>
    </Sheet>
  )
}

export function Decide() {
  const t = useT()
  const lang = useStore(s => s.lang)
  const nickname = useStore(s => s.nickname)
  const f = useStore(s => s.filters)
  const s = useStore(s => s)
  const [phase, setPhase] = useState<Phase>('idle')
  const [picks, setPicks] = useState<Restaurant[]>([])
  const [seen, setSeen] = useState<Set<string>>(new Set())
  const [more, setMore] = useState(false)
  const [chosen, setChosen] = useState<Restaurant | null>(null)
  const [reel, setReel] = useState<CuisineKey[]>(['ramen', 'bento', 'sushi'])
  const timer = useRef(0)

  const pool = useMemo(() => applyFilters(f, s), [f, s])
  const hour = new Date().getHours()
  const meal = hour < 10 ? t('早餐', 'breakfast') : hour < 14 ? t('午餐', 'lunch') : hour < 17 ? t('下午茶', 'a snack') : hour < 21 ? t('晚餐', 'dinner') : t('宵夜', 'a late bite')

  function roll(n = 3) {
    if (!pool.length) return
    setPhase('rolling')
    const keys = CUISINES.map(c => c.key)
    clearInterval(timer.current)
    timer.current = window.setInterval(() => {
      setReel([0, 1, 2].map(() => keys[Math.floor(Math.random() * keys.length)]))
    }, 90)
    const result = pickN(pool, n, getState())
    setTimeout(() => {
      clearInterval(timer.current)
      setPicks(result)
      setSeen(new Set(result.map(r => r.id)))
      setPhase('picked')
      if (n === 1 && result[0]) setChosen(result[0])
    }, 1200)
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

  const toggleCuisine = (k: CuisineKey) => setFilters({ cuisines: f.cuisines.includes(k) ? f.cuisines.filter(x => x !== k) : [...f.cuisines, k] })

  return (
    <div className="screen decide">
      <div className="top">
        <div>
          <small className="muted">{t(`嗨，${nickname || '朋友'}`, `Hi, ${nickname || 'there'}`)}</small>
          <h1 className="display">{t(`${meal}吃什麼？`, `What's for ${meal}?`)}</h1>
        </div>
        <span className="loc-pill"><Ico name="pin" size={14} />{t('中山站', 'Zhongshan')}</span>
      </div>

      {phase !== 'picked' && (
        <>
          <div className="hero-card">
            <div className="hero-text">
              <b>{t('30 秒幫你決定', 'Decided in 30 seconds')}</b>
              <small>{t(`附近有 ${pool.length} 家符合你的條件`, `${pool.length} places nearby match`)}</small>
            </div>
            <Art name="dice" size={92} className={`hero-art ${phase === 'rolling' ? 'shake' : 'float'}`} />
          </div>

          <div className="section-head"><h3>{t('想吃什麼', 'Craving')}</h3>{!!f.cuisines.length && <button className="link-btn" onClick={() => setFilters({ cuisines: [] })}>{t('清除', 'Clear')}</button>}</div>
          <div className="cat-row">
            <button className={`cat ${!f.cuisines.length ? 'on' : ''}`} onClick={() => setFilters({ cuisines: [] })}>
              <span className="cat-tile"><Art name="fortune" size={40} /></span><small>{t('都可以', 'Anything')}</small>
            </button>
            {CUISINES.map(c => (
              <button key={c.key} className={`cat ${f.cuisines.includes(c.key) ? 'on' : ''}`} onClick={() => toggleCuisine(c.key)}>
                <span className="cat-tile"><Art name={c.key} size={40} /></span><small>{c[lang]}</small>
              </button>
            ))}
          </div>

          <div className="card filters-card">
            <BudgetSlider />
            <div className="divider" />
            <div className="filter-line">
              <span className="filter-label">{t('距離', 'Distance')}</span>
              <DistanceChips />
            </div>
            <div className="chips">
              <Chip on={f.openNow} onClick={() => setFilters({ openNow: !f.openNow })}><Ico name="clock" size={15} />{t('營業中', 'Open now')}</Chip>
              <Chip on={f.trusted} onClick={() => setFilters({ trusted: !f.trusted })}><Ico name="check" size={15} />{t('推薦模式', 'Trusted')}</Chip>
              <button className="chip ghost" onClick={() => setMore(true)}><Ico name="sliders" size={15} />{t('更多', 'More')}</button>
            </div>
          </div>
        </>
      )}

      {phase === 'rolling' && (
        <div className="reel">{reel.map((k, i) => <span key={i}><Art name={k} size={58} /></span>)}</div>
      )}

      {phase === 'idle' && (
        <div className="cta">
          {pool.length
            ? <button className="btn primary big block" onClick={() => roll(3)}><Ico name="dice" size={20} />{t('幫我決定', 'Decide for me')}</button>
            : <p className="note warn">{t('沒有符合的店，放寬預算或距離試試', 'No matches — try a bigger budget or radius')}</p>}
          <div className="cta-sub">
            <button className="btn ghost small" disabled={!pool.length} onClick={() => roll(1)}><Ico name="sparkle" size={15} />{t('隨便啦，直接給我一家', 'Just pick one')}</button>
            <button className="btn ghost small" onClick={() => nav('/explore')}>{t(`看全部 ${pool.length} 家`, `See all ${pool.length}`)}<Ico name="chev" size={14} /></button>
          </div>
        </div>
      )}

      {phase === 'picked' && (
        <>
          <div className="picks-head">
            <div><small className="muted">{t('抽出 3 家', 'Your 3 picks')}</small><h2>{t('今天就選一家吧', 'Pick one for today')}</h2></div>
            <button className="chip ghost" onClick={() => setPhase('idle')}><Ico name="sliders" size={15} />{t('改條件', 'Filters')}</button>
          </div>
          <div className="picks">
            {picks.map((r, i) => {
              const km = distanceKm(r)
              return (
                <div className="pick flip-in" style={{ animationDelay: `${i * 120}ms` }} key={r.id}>
                  <div onClick={() => nav('/r/' + r.id)} role="button" className="pick-photo">
                    <Cover r={r} h={176}>
                      <span className="cover-tag"><Art name={r.cuisine} size={18} />{CUISINE_MAP[r.cuisine][lang]}</span>
                      <div className="cover-score"><ScoreBadge r={r} glass /></div>
                      <span className="pick-no">0{i + 1}</span>
                    </Cover>
                  </div>
                  <div className="pick-body">
                    <b className="pick-name">{r.name[lang]}</b>
                    <div className="pick-meta">
                      <span><Ico name="wallet" size={14} />NT${r.price}</span>
                      <span><Ico name="walk" size={14} />{fmtDist(km)} · {t(`${walkMin(km)} 分`, `${walkMin(km)} min`)}</span>
                    </div>
                    <OpenText r={r} />
                    <div className="pick-actions">
                      <button className="btn soft" onClick={() => swap(i)}><Ico name="refresh" size={16} />{t('換一家', 'Swap')}</button>
                      <button className="btn primary" onClick={() => setChosen(r)}>{t('就這家', 'This one')}</button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="btn-row">
            <button className="btn" onClick={() => roll(3)}><Ico name="dice" size={18} />{t('全部重抽', 'Reroll')}</button>
            <button className="btn accent" onClick={toGroup}><Ico name="users" size={18} />{t('丟到群組投票', 'Let friends vote')}</button>
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
