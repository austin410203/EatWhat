import { Fragment, useCallback, useMemo, useState } from 'react'
import { BY_ID } from '../data/places'
import { CUISINE_MAP } from '../data/restaurants'
import { FilterPanel } from '../components/FilterPanel'
import { Art, Ico } from '../components/Ico'
import { MapView } from '../components/MapView'
import { AdSlot, Cover, Header, RestaurantRow, ScoreBadge, Sheet } from '../components/ui'
import { applyFilters, distanceKm, fmtDist, lowConfidence, sortList, trustScore, type SortKey } from '../lib/logic'
import { nav } from '../lib/router'
import { useStore, useT } from '../lib/store'

export function Explore() {
  const t = useT()
  const s = useStore(s => s)
  const lang = s.lang
  const f = s.filters
  const [mode, setMode] = useState<'list' | 'map'>('list')
  const [sort, setSort] = useState<SortKey>('smart')
  const [open, setOpen] = useState(false)
  const [sel, setSel] = useState<string | null>(null)
  const [q, setQ] = useState('')

  const base = useMemo(() => applyFilters(f, s), [f, s])
  const list = useMemo(() => {
    let l = base
    if (q.trim()) {
      const k = q.trim().toLowerCase()
      l = l.filter(r => r.name.zh.includes(k) || r.name.en.toLowerCase().includes(k) || r.dishes.some(d => d[0].includes(k) || d[1].toLowerCase().includes(k)))
    }
    const sorted = sortList(l, sort, s)
    // 付費曝光店家（測試資料）在綜合排序時排第一，並標示「廣告」
    if (sort === 'smart') {
      const sp = sorted.filter(r => r.sponsored).slice(0, 1)
      return [...sp, ...sorted.filter(r => !sp.includes(r))]
    }
    return sorted
  }, [base, s, sort, q])

  // 精選：可信分數最高、評論夠多的 6 家
  const featured = useMemo(() => base.filter(r => !lowConfidence(r)).sort((a, b) => trustScore(b) - trustScore(a)).slice(0, 6), [base])

  const onSelect = useCallback((id: string) => setSel(id), [])
  const activeCount = (f.cuisines.length ? 1 : 0) + f.tags.length + (f.minScore ? 1 : 0) + (f.openNow ? 1 : 0) + (f.trusted ? 1 : 0)
  const selected = sel ? BY_ID[sel] : null

  const sorts: [SortKey, string, string][] = [
    ['smart', '綜合推薦', 'Best match'], ['score', '可信分數', 'Trust score'], ['distance', '距離', 'Distance'], ['price', '價格', 'Price'],
  ]

  return (
    <div className={`screen explore ${mode}`}>
      <Header
        title={t('探索餐廳', 'Explore')}
        sub={t(`中山站附近 · ${list.length} 家`, `Near Zhongshan · ${list.length}`)}
        right={
          <div className="seg icon-seg">
            <button className={mode === 'list' ? 'on' : ''} onClick={() => setMode('list')} aria-label="list"><Ico name="list" size={18} /></button>
            <button className={mode === 'map' ? 'on' : ''} onClick={() => setMode('map')} aria-label="map"><Ico name="map" size={18} /></button>
          </div>
        }
      />
      <div className="toolbar">
        <label className="search">
          <Ico name="search" size={18} />
          <input placeholder={t('搜尋店名或菜色', 'Search name or dish')} value={q} onChange={e => setQ(e.target.value)} />
          {q && <button className="search-x" onClick={() => setQ('')} aria-label="clear"><Ico name="x" size={14} /></button>}
        </label>
        <button className="icon-btn dark filter-btn" onClick={() => setOpen(true)} aria-label={t('篩選', 'Filter')}>
          <Ico name="sliders" size={20} />{!!activeCount && <i>{activeCount}</i>}
        </button>
      </div>
      <div className="sortbar chips scroll">
        {sorts.map(([k, zh, en]) => (
          <button key={k} className={`chip ${sort === k ? 'on' : ''}`} onClick={() => setSort(k)}>{t(zh, en)}</button>
        ))}
        <span className="chip static">≤ NT${f.budget}</span>
        <span className="chip static">{f.distance >= 99 ? t('不限距離', 'Any distance') : f.distance < 1 ? `${f.distance * 1000} m` : `${f.distance} km`}</span>
      </div>

      {mode === 'list' ? (
        <>
          {!q && featured.length > 2 && (
            <>
              <div className="section-head"><h3>{t('附近評價最高', 'Top rated nearby')}</h3><small className="muted">{t('依可信分數', 'by trust score')}</small></div>
              <div className="feat-row">
                {featured.map(r => (
                  <button key={r.id} className="feat" onClick={() => nav('/r/' + r.id)}>
                    <Cover r={r} h={150}>
                      <div className="cover-score"><ScoreBadge r={r} glass /></div>
                      <div className="cover-name"><b>{r.name[lang]}</b><span>{CUISINE_MAP[r.cuisine][lang]} · {fmtDist(distanceKm(r))}</span></div>
                    </Cover>
                  </button>
                ))}
              </div>
              <div className="section-head"><h3>{t('全部餐廳', 'All places')}</h3></div>
            </>
          )}
          <div className="list">
            {list.map((r, i) => (
              <Fragment key={r.id}>
                <RestaurantRow r={r} />
                {i === 5 && <AdSlot />}
              </Fragment>
            ))}
            {!list.length && <div className="empty"><Art name="fortune" size={88} /><p>{t('沒有符合的店，試試放寬條件', 'Nothing matches. Try loosening filters.')}</p></div>}
          </div>
        </>
      ) : (
        <div className="map-mode">
          <MapView list={list} selected={sel} onSelect={onSelect} radiusKm={f.distance} />
          <div className="map-legend">
            <span><i style={{ background: 'var(--green)' }} />4.3+</span>
            <span><i style={{ background: 'var(--blue)' }} />3.9+</span>
            <span><i style={{ background: '#9a958c' }} />{t('其他', 'other')}</span>
            <span><i style={{ background: 'var(--amber)' }} />{t('評論少', 'few reviews')}</span>
          </div>
          {selected && <div className="map-card"><RestaurantRow r={selected} /></div>}
        </div>
      )}

      <Sheet open={open} onClose={() => setOpen(false)} title={t('篩選條件', 'Filters')}>
        <FilterPanel />
        <button className="btn primary block" onClick={() => setOpen(false)}>{t(`看 ${list.length} 家`, `Show ${list.length}`)}</button>
      </Sheet>
    </div>
  )
}
