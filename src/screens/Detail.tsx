import { useState } from 'react'
import { BY_ID, CUISINE_MAP, TAGS } from '../data/restaurants'
import { MapView } from '../components/MapView'
import { Cover, ScoreBadge, Sheet, Stars, toast } from '../components/ui'
import { DecisionSheet, mapsUrl } from './Decide'
import { distanceKm, fmtDist, hoursText, lowConfidence, openStatus, priceLevel, trustScore, walkMin } from '../lib/logic'
import { myRooms, updateRoom } from '../lib/room'
import { back, nav } from '../lib/router'
import { toggleIn, useStore, useT } from '../lib/store'

const WD: [string, string][] = [['日', 'Sun'], ['一', 'Mon'], ['二', 'Tue'], ['三', 'Wed'], ['四', 'Thu'], ['五', 'Fri'], ['六', 'Sat']]

export function Detail({ id }: { id: string }) {
  const t = useT()
  const lang = useStore(s => s.lang)
  const fav = useStore(s => s.favorites.includes(id))
  const blocked = useStore(s => s.blocked.includes(id))
  const eatenCount = useStore(s => s.history.filter(h => h.id === id).length)
  const [showHours, setShowHours] = useState(false)
  const [scoreInfo, setScoreInfo] = useState(false)
  const [groupPick, setGroupPick] = useState(false)
  const [decided, setDecided] = useState(false)
  const r = BY_ID[id]
  if (!r) return <div className="screen"><p className="empty">{t('找不到這家店', 'Not found')}</p></div>

  const c = CUISINE_MAP[r.cuisine]
  const km = distanceKm(r)
  const os = openStatus(r)
  const today = new Date().getDay()
  const openRooms = myRooms().filter(x => !x.closed)

  function addToRoom(code?: string) {
    if (code) {
      updateRoom(code, rr => { if (!rr.candidates.includes(id)) rr.candidates.push(id) })
      nav('/room/' + code)
    } else {
      nav('/group?add=' + id)
    }
  }

  return (
    <div className="screen detail">
      <Cover r={r} h={230} round={false}>
        <button className="icon-btn float-l" onClick={() => back('/explore')} aria-label="back">‹</button>
        <button className={`icon-btn float-r ${fav ? 'fav' : ''}`} onClick={() => { toggleIn('favorites', id); toast(fav ? t('已取消收藏', 'Removed') : t('已加入收藏', 'Saved')) }} aria-label="favorite">{fav ? '♥' : '♡'}</button>
        <div className="cover-name big">
          <span className="tag">{c.emoji} {c[lang]}</span>
          <b>{r.name[lang]}</b>
          <span><Stars v={r.rating} /> {r.rating.toFixed(1)} · {t(`${r.reviews} 則評論`, `${r.reviews} reviews`)}</span>
        </div>
      </Cover>

      <div className="detail-body">
        {r.sponsored && <div className="note ad">{t('此店家為付費曝光（測試資料）', 'Sponsored listing (test data)')}</div>}

        <div className="stat-row">
          <button className="stat" onClick={() => setScoreInfo(true)}>
            <ScoreBadge r={r} big />
          </button>
          <div className="stat"><b>NT${r.price}</b><small>{t('每人均消', 'Avg / person')} {priceLevel(r.price)}</small></div>
          <div className="stat"><b>{fmtDist(km)}</b><small>{t(`走路 ${walkMin(km)} 分`, `${walkMin(km)} min walk`)}</small></div>
        </div>

        {lowConfidence(r) && (
          <div className="note warn">⚠️ {t(`只有 ${r.reviews} 則評論，評分參考價值低，推薦模式會隱藏這家。`, `Only ${r.reviews} reviews — hidden in trusted mode.`)}</div>
        )}

        <div className="actions4">
          <a className="act" href={mapsUrl(r)} target="_blank" rel="noreferrer"><span>🧭</span>{t('導航', 'Directions')}</a>
          <a className="act" href={`tel:${r.phone}`}><span>📞</span>{t('打電話', 'Call')}</a>
          <button className="act" onClick={() => setGroupPick(true)}><span>👥</span>{t('加入揪團', 'Add to vote')}</button>
          <a className="act" href={`https://www.google.com/search?q=${encodeURIComponent(r.name.zh + ' 食記')}`} target="_blank" rel="noreferrer"><span>📝</span>{t('搜尋食記', 'Blog reviews')}</a>
        </div>

        <section className="info">
          <div className="info-row" onClick={() => setShowHours(!showHours)} role="button">
            <span>🕒</span>
            <div>
              <b className={os.open ? 'ok' : 'bad'}>{os.open ? t('營業中', 'Open') : t('休息中', 'Closed')}</b> · {lang === 'zh' ? os.text[0] : os.text[1]}
              {showHours && (
                <ul className="hours">
                  {WD.map((w, i) => (
                    <li key={i} className={i === today ? 'today' : ''}><span>{t('週' + w[0], w[1])}</span><span>{hoursText(r, i)[lang === 'zh' ? 0 : 1]}</span></li>
                  ))}
                </ul>
              )}
            </div>
            <span className="chev">{showHours ? '▴' : '▾'}</span>
          </div>
          <div className="info-row"><span>📍</span><div>{r.address[lang]}</div></div>
          <div className="info-row"><span>📞</span><div>{r.phone}</div></div>
          {!!r.tags.length && (
            <div className="info-row"><span>🏷️</span><div className="chips wrap">{r.tags.map(k => <span key={k} className="chip static">{TAGS[k][lang === 'zh' ? 0 : 1]}</span>)}</div></div>
          )}
        </section>

        <section>
          <h3>{t('招牌菜', 'Signature dishes')}</h3>
          <div className="dishes">{r.dishes.map(d => <span key={d[0]} className="dish">{c.emoji} {lang === 'zh' ? d[0] : d[1]}</span>)}</div>
        </section>

        <section>
          <h3>{t('位置', 'Location')}</h3>
          <div className="mini-map"><MapView list={[r]} selected={r.id} single height={170} /></div>
        </section>

        <section>
          <h3>{t('評論', 'Reviews')} <small className="muted">{t('（測試資料）', '(test data)')}</small></h3>
          {r.sampleReviews.map((v, i) => (
            <div key={i} className="review">
              <span className="avatar">{v.avatar}</span>
              <div>
                <div className="review-top"><b>{v.who}</b><Stars v={v.stars} size={11} /><small className="muted">{t(`${v.daysAgo} 天前`, `${v.daysAgo}d ago`)}</small></div>
                <p>{lang === 'zh' ? v.zh : v.en}</p>
              </div>
            </div>
          ))}
        </section>

        <div className="btn-col">
          <button className="btn primary big" onClick={() => setDecided(true)}>🍽️ {t('就吃這家！', 'Eat here!')}</button>
          {eatenCount > 0 && <p className="muted center">{t(`你來吃過 ${eatenCount} 次`, `You've eaten here ${eatenCount}×`)}</p>}
          <button className="btn ghost" onClick={() => { toggleIn('blocked', id); toast(blocked ? t('已移出黑名單', 'Unblocked') : t('不會再推薦這家', "Won't suggest again")) }}>
            {blocked ? t('移出「不想再去」', 'Remove from blocklist') : `🚫 ${t('不想再去', "Don't suggest again")}`}
          </button>
        </div>
      </div>

      <Sheet open={scoreInfo} onClose={() => setScoreInfo(false)} title={t('什麼是可信分數？', 'What is the trust score?')}>
        <p>{t('評論很少的店，評分很容易被親友灌高。可信分數會把評分往大家的平均值拉，評論越少拉得越多。', 'Ratings with few reviews are easy to inflate. The trust score pulls them toward the average — the fewer the reviews, the stronger the pull.')}</p>
        <div className="score-calc">
          <div><small>{t('原始評分', 'Rating')}</small><b>{r.rating.toFixed(1)}</b></div>
          <div><small>{t('評論數', 'Reviews')}</small><b>{r.reviews}</b></div>
          <div><small>{t('可信分數', 'Trust')}</small><b className="accent">{trustScore(r).toFixed(1)}</b></div>
        </div>
        <p className="muted">{t('推薦模式會隱藏評論少於 30 則的店。', 'Trusted mode hides places with < 30 reviews.')}</p>
      </Sheet>

      <Sheet open={groupPick} onClose={() => setGroupPick(false)} title={t('加入哪個投票？', 'Add to which vote?')}>
        <div className="btn-col">
          <button className="btn primary" onClick={() => addToRoom()}>＋ {t('開新的揪團投票', 'Start a new vote')}</button>
          {openRooms.map(x => (
            <button key={x.code} className="btn" onClick={() => addToRoom(x.code)}>{x.title} · {x.code} ({t(`${x.candidates.length} 家`, `${x.candidates.length}`)})</button>
          ))}
        </div>
      </Sheet>

      <DecisionSheet r={decided ? r : null} onClose={() => setDecided(false)} />
    </div>
  )
}
