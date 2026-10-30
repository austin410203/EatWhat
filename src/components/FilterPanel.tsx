import { CUISINES, TAGS, type CuisineKey, type TagKey } from '../data/restaurants'
import { DEFAULT_FILTERS, setFilters, useStore, useT } from '../lib/store'
import { Art } from './Ico'
import { Chip, Toggle } from './ui'

const DISTANCES = [0.5, 1, 1.5, 2, 3, 5, 99]
const SCORES = [0, 3.5, 3.8, 4.0, 4.2]

export function BudgetSlider() {
  const t = useT()
  const budget = useStore(s => s.filters.budget)
  return (
    <div className="budget">
      <div className="budget-top">
        <span className="budget-label">{t('每人預算', 'Budget / person')}</span>
        <span className="budget-val">{budget >= 1500 ? t('不限', 'Any') : <>NT$ <b>{budget}</b> {t('以內', 'max')}</>}</span>
      </div>
      <input
        type="range" min={100} max={1500} step={50} value={budget}
        onChange={e => setFilters({ budget: +e.target.value })}
        style={{ ['--p' as string]: `${((budget - 100) / 1400) * 100}%` }}
        aria-label={t('每人預算', 'Budget')}
      />
      <div className="budget-ticks"><span>100</span><span>500</span><span>1000</span><span>1500+</span></div>
    </div>
  )
}

export function DistanceChips() {
  const t = useT()
  const d = useStore(s => s.filters.distance)
  return (
    <div className="chips scroll">
      {DISTANCES.map(x => (
        <Chip key={x} on={d === x} onClick={() => setFilters({ distance: x })}>
          {x >= 99 ? t('不限', 'Any') : x < 1 ? `${x * 1000} m` : `${x} km`}
        </Chip>
      ))}
    </div>
  )
}

export function CuisineChips() {
  const t = useT()
  const lang = useStore(s => s.lang)
  const sel = useStore(s => s.filters.cuisines)
  const toggle = (k: CuisineKey) => setFilters({ cuisines: sel.includes(k) ? sel.filter(x => x !== k) : [...sel, k] })
  return (
    <div className="chips wrap">
      <Chip on={!sel.length} onClick={() => setFilters({ cuisines: [] })}>{t('都可以', 'Anything')}</Chip>
      {CUISINES.map(c => (
        <Chip key={c.key} on={sel.includes(c.key)} onClick={() => toggle(c.key)}><Art name={c.key} size={20} />{c[lang]}</Chip>
      ))}
    </div>
  )
}

export function FilterPanel({ compact }: { compact?: boolean }) {
  const t = useT()
  const lang = useStore(s => s.lang)
  const f = useStore(s => s.filters)
  const toggleTag = (k: TagKey) => setFilters({ tags: f.tags.includes(k) ? f.tags.filter(x => x !== k) : [...f.tags, k] })
  return (
    <div className="filters">
      <BudgetSlider />
      <h4>{t('距離', 'Distance')}</h4>
      <DistanceChips />
      <h4>{t('想吃什麼', 'Cuisine')}</h4>
      <CuisineChips />
      {!compact && (
        <>
          <h4>{t('情境', 'Occasion')}</h4>
          <div className="chips wrap">
            {(Object.keys(TAGS) as TagKey[]).map(k => (
              <Chip key={k} on={f.tags.includes(k)} onClick={() => toggleTag(k)}>{TAGS[k][lang === 'zh' ? 0 : 1]}</Chip>
            ))}
          </div>
          <h4>{t('可信分數至少', 'Min trust score')}</h4>
          <div className="chips">
            {SCORES.map(x => (
              <Chip key={x} on={f.minScore === x} onClick={() => setFilters({ minScore: x })}>{x ? x.toFixed(1) : t('不限', 'Any')}</Chip>
            ))}
          </div>
        </>
      )}
      <div className="toggles">
        <Toggle on={f.openNow} onChange={v => setFilters({ openNow: v })} label={t('只看營業中', 'Open now')} />
        <Toggle
          on={f.trusted} onChange={v => setFilters({ trusted: v })}
          label={t('推薦模式', 'Trusted mode')}
          hint={t('排除評論太少、可能灌分的店', 'Hide places with too few reviews')}
        />
        <Toggle on={f.avoidRecent} onChange={v => setFilters({ avoidRecent: v })} label={t('避開 3 天內吃過的', 'Skip places eaten in last 3 days')} />
      </div>
      <button type="button" className="link-btn" onClick={() => setFilters(DEFAULT_FILTERS)}>{t('重設條件', 'Reset filters')}</button>
    </div>
  )
}
