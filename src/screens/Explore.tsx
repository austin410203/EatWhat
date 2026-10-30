import { Fragment, useCallback, useMemo, useState } from 'react'
import { BY_ID } from '../data/restaurants'
import { FilterPanel } from '../components/FilterPanel'
import { MapView } from '../components/MapView'
import { AdSlot, Header, RestaurantRow, Sheet } from '../components/ui'
import { applyFilters, sortList, type SortKey } from '../lib/logic'
import { useStore, useT } from '../lib/store'

export function Explore() {
  const t = useT()
  const s = useStore(s => s)
  const f = s.filters
  const [mode, setMode] = useState<'list' | 'map'>('list')
  const [sort, setSort] = useState<SortKey>('smart')
  const [open, setOpen] = useState(false)
  const [sel, setSel] = useState<string | null>(null)
  const [q, setQ] = useState('')

  const list = useMemo(() => {
    let l = applyFilters(f, s)
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
  }, [f, s, sort, q])

  const onSelect = useCallback((id: string) => setSel(id), [])
  const activeCount = (f.cuisines.length ? 1 : 0) + f.tags.length + (f.minScore ? 1 : 0) + (f.openNow ? 1 : 0) + (f.trusted ? 1 : 0)
  const selected = sel ? BY_ID[sel] : null

  const sorts: [SortKey, string, string][] = [
    ['smart', '綜合推薦', 'Best match'], ['score', '可信分數', 'Trust score'], ['distance', '距離', 'Distance'], ['price', '價格', 'Price'],
  ]

  return (
    <div className={`screen explore ${mode}`}>
      <Header title={t('探索餐廳', 'Explore')} sub={t(`${list.length} 家符合`, `${list.length} matches`)} />
      <div className="toolbar">
        <input className="search" placeholder={t('搜尋店名或菜色', 'Search name or dish')} value={q} onChange={e => setQ(e.target.value)} />
        <button className="btn small" onClick={() => setOpen(true)}>⚙️ {t('篩選', 'Filter')}{activeCount ? ` ${activeCount}` : ''}</button>
        <div className="seg">
          <button className={mode === 'list' ? 'on' : ''} onClick={() => setMode('list')}>☰</button>
          <button className={mode === 'map' ? 'on' : ''} onClick={() => setMode('map')}>🗺️</button>
        </div>
      </div>
      <div className="sortbar chips scroll">
        <span className="budget-pill">≤ NT${f.budget}</span>
        <span className="budget-pill">{f.distance < 1 ? `${f.distance * 1000} m` : `${f.distance} km`}</span>
        {sorts.map(([k, zh, en]) => (
          <button key={k} className={`chip ${sort === k ? 'on' : ''}`} onClick={() => setSort(k)}>{t(zh, en)}</button>
        ))}
      </div>

      {mode === 'list' ? (
        <div className="list">
          {list.map((r, i) => (
            <Fragment key={r.id}>
              <RestaurantRow r={r} />
              {i === 5 && <AdSlot />}
            </Fragment>
          ))}
          {!list.length && <div className="empty">🍽️<p>{t('沒有符合的店，試試放寬條件', 'Nothing matches. Try loosening filters.')}</p></div>}
        </div>
      ) : (
        <div className="map-mode">
          <MapView list={list} selected={sel} onSelect={onSelect} radiusKm={f.distance} />
          <div className="map-legend">
            <span><i style={{ background: '#22b14c' }} />4.3+</span>
            <span><i style={{ background: '#4f8df5' }} />3.9+</span>
            <span><i style={{ background: '#8a8f98' }} />{t('其他', 'other')}</span>
            <span><i style={{ background: '#f0a020' }} />{t('評論少', 'few reviews')}</span>
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
