import { useState } from 'react'
import { BY_ID, CUISINE_MAP, TAGS } from '../data/restaurants'
import { Art, Ico } from '../components/Ico'
import { MapView } from '../components/MapView'
import { Avatar, Cover, OpenText, ScoreBadge, Sheet, Stars, toast } from '../components/ui'
import { DecisionSheet, mapsUrl } from './Decide'
import { photos } from '../lib/assets'
import { distanceKm, fmtDist, hoursText, lowConfidence, priceLevel, trustScore, walkMin } from '../lib/logic'
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
  const [photo, setPhoto] = useState<string | null>(null)
  const r = BY_ID[id]
  if (!r) return <div className="screen"><p className="empty">{t('找不到這家店', 'Not found')}</p></div>

  const c = CUISINE_MAP[r.cuisine]
  const km = distanceKm(r)
  const today = new Date().getDay()
  const openRooms = myRooms().filter(x => !x.closed)
  const gallery = photos(r)

  function addToRoom(code?: string) {
    if (code) {
      updateRoom(code, rr => { if (!rr.candidates.includes(id)) rr.candidates.push(id) })
      nav('/room/' + code)
    } else {
      nav('/group?add=' + id)
    }
  }
  const toggleFav = () => { toggleIn('favorites', id); toast(fav ? t('已取消收藏', 'Removed') : t('已加入收藏', 'Saved')) }

  return (
    <div className="screen detail">
      <div className="detail-hero">
        <Cover r={r} h={320} round={false} />
        <button className="icon-btn glass float-l" onClick={() => back('/explore')} aria-label="back"><Ico name="back" size={22} /></button>
        <button className={`icon-btn glass float-r ${fav ? 'fav' : ''}`} onClick={toggleFav} aria-label="favorite"><Ico name="heart" size={20} fill={fav} /></button>
      </div>

      <div className="detail-body">
        <div className="detail-title">
          <span className="cuisine-pill"><Art name={r.cuisine} size={20} />{c[lang]}</span>
          <h1>{r.name[lang]}</h1>
          <div className="row-sub"><Stars v={r.rating} size={14} /><b>{r.rating.toFixed(1)}</b><span className="muted">{t(`${r.reviews} 則評論`, `${r.reviews} reviews`)}</span></div>
          <OpenText r={r} />
        </div>

        {r.sponsored && <div className="note ad">{t('此店家為付費曝光（測試資料）', 'Sponsored listing (test data)')}</div>}

        <div className="stat-row">
          <button className="stat" onClick={() => setScoreInfo(true)}>
            <Art name="shield" size={34} />
            <b>{trustScore(r).toFixed(1)}</b><small>{t('可信分數', 'Trust score')} <Ico name="info" size={11} /></small>
          </button>
          <div className="stat"><Art name="coins" size={34} /><b>NT${r.price}</b><small>{t('每人均消', 'Per person')} · {priceLevel(r.price)}</small></div>
          <div className="stat"><Art name="sneaker" size={34} /><b>{fmtDist(km)}</b><small>{t(`走路 ${walkMin(km)} 分`, `${walkMin(km)} min walk`)}</small></div>
        </div>

        {lowConfidence(r) && (
          <div className="note warn"><Ico name="info" size={16} />{t(`只有 ${r.reviews} 則評論，評分參考價值低，推薦模式會隱藏這家。`, `Only ${r.reviews} reviews — hidden in trusted mode.`)}</div>
        )}

        <div className="actions4">
          <a className="act" href={mapsUrl(r)} target="_blank" rel="noreferrer"><span><Ico name="nav" size={20} /></span>{t('導航', 'Directions')}</a>
          <a className="act" href={`tel:${r.phone}`}><span><Ico name="phone" size={20} /></span>{t('打電話', 'Call')}</a>
          <button className="act" onClick={() => setGroupPick(true)}><span><Ico name="users" size={20} /></span>{t('加入揪團', 'Add to vote')}</button>
          <a className="act" href={`https://www.google.com/search?q=${encodeURIComponent(r.name.zh + ' 食記')}`} target="_blank" rel="noreferrer"><span><Ico name="note" size={20} /></span>{t('搜尋食記', 'Blog reviews')}</a>
        </div>

        <section>
          <div className="section-head"><h3>{t('照片', 'Photos')}</h3><small className="muted">{t('示意圖', 'Illustrative')}</small></div>
          <div className="gallery">
            {gallery.map(src => <button key={src} onClick={() => setPhoto(src)}><img src={src} alt="" loading="lazy" /></button>)}
          </div>
        </section>

        <section className="info">
          <div className="info-row" onClick={() => setShowHours(!showHours)} role="button">
            <span className="info-ic"><Ico name="clock" size={18} /></span>
            <div>
              <b>{t('營業時間', 'Hours')}</b>
              <small className="muted">{hoursText(r, today)[lang === 'zh' ? 0 : 1]} {t('（今天）', '(today)')}</small>
              {showHours && (
                <ul className="hours">
                  {WD.map((w, i) => (
                    <li key={i} className={i === today ? 'today' : ''}><span>{t('週' + w[0], w[1])}</span><span>{hoursText(r, i)[lang === 'zh' ? 0 : 1]}</span></li>
                  ))}
                </ul>
              )}
            </div>
            <Ico name="down" size={18} className={`chev ${showHours ? 'up' : ''}`} />
          </div>
          <div className="info-row"><span className="info-ic"><Ico name="pin" size={18} /></span><div><b>{t('地址', 'Address')}</b><small className="muted">{r.address[lang]}</small></div></div>
          <div className="info-row"><span className="info-ic"><Ico name="phone" size={18} /></span><div><b>{t('電話', 'Phone')}</b><small className="muted">{r.phone}</small></div></div>
          {!!r.tags.length && (
            <div className="info-row"><span className="info-ic"><Ico name="tag" size={18} /></span><div className="chips wrap">{r.tags.map(k => <span key={k} className="chip static">{TAGS[k][lang === 'zh' ? 0 : 1]}</span>)}</div></div>
          )}
        </section>

        <section>
          <div className="section-head"><h3>{t('招牌菜', 'Signature dishes')}</h3></div>
          <div className="dishes">{r.dishes.map(d => <span key={d[0]} className="dish"><Art name={r.cuisine} size={22} />{lang === 'zh' ? d[0] : d[1]}</span>)}</div>
        </section>

        <section>
          <div className="section-head"><h3>{t('位置', 'Location')}</h3><a className="link-btn" href={mapsUrl(r)} target="_blank" rel="noreferrer">{t('開啟地圖', 'Open map')}</a></div>
          <div className="mini-map"><MapView list={[r]} selected={r.id} single height={180} /></div>
        </section>

        <section>
          <div className="section-head"><h3>{t('評論', 'Reviews')}</h3><small className="muted">{t('測試資料', 'test data')}</small></div>
          <div className="reviews">
            {r.sampleReviews.map((v, i) => (
              <div key={i} className="review">
                <Avatar name={v.who} size={36} />
                <div className="grow">
                  <div className="review-top"><b>{v.who}</b><small className="muted">{t(`${v.daysAgo} 天前`, `${v.daysAgo}d ago`)}</small></div>
                  <Stars v={v.stars} size={11} />
                  <p>{lang === 'zh' ? v.zh : v.en}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="detail-foot">
          {eatenCount > 0 && <p className="muted center small">{t(`你來吃過 ${eatenCount} 次`, `You've eaten here ${eatenCount}×`)}</p>}
          <button className="btn ghost small" onClick={() => { toggleIn('blocked', id); toast(blocked ? t('已移出黑名單', 'Unblocked') : t('不會再推薦這家', "Won't suggest again")) }}>
            <Ico name="ban" size={15} />{blocked ? t('移出「不想再去」', 'Remove from blocklist') : t('不想再去', "Don't suggest again")}
          </button>
        </div>
      </div>

      <div className="bottom-bar">
        <button className={`icon-btn outline ${fav ? 'fav' : ''}`} onClick={toggleFav} aria-label="favorite"><Ico name="heart" size={22} fill={fav} /></button>
        <ScoreBadge r={r} />
        <button className="btn primary grow" onClick={() => setDecided(true)}>{t('就吃這家', 'Eat here')}<Ico name="chev" size={18} /></button>
      </div>

      <Sheet open={scoreInfo} onClose={() => setScoreInfo(false)} title={t('什麼是可信分數？', 'What is the trust score?')}>
        <p>{t('評論很少的店，評分很容易被親友灌高。可信分數會把評分往大家的平均值拉，評論越少拉得越多。', 'Ratings with few reviews are easy to inflate. The trust score pulls them toward the average — the fewer the reviews, the stronger the pull.')}</p>
        <div className="score-calc">
          <div><small>{t('原始評分', 'Rating')}</small><b>{r.rating.toFixed(1)}</b></div>
          <div><small>{t('評論數', 'Reviews')}</small><b>{r.reviews}</b></div>
          <div className="hl"><small>{t('可信分數', 'Trust')}</small><b>{trustScore(r).toFixed(1)}</b></div>
        </div>
        <p className="muted">{t('推薦模式會隱藏評論少於 30 則的店。', 'Trusted mode hides places with < 30 reviews.')}</p>
      </Sheet>

      <Sheet open={groupPick} onClose={() => setGroupPick(false)} title={t('加入哪個投票？', 'Add to which vote?')}>
        <div className="btn-col">
          <button className="btn primary" onClick={() => addToRoom()}><Ico name="plus" size={18} />{t('開新的揪團投票', 'Start a new vote')}</button>
          {openRooms.map(x => (
            <button key={x.code} className="btn" onClick={() => addToRoom(x.code)}>{x.title} · {x.code} ({t(`${x.candidates.length} 家`, `${x.candidates.length}`)})</button>
          ))}
        </div>
      </Sheet>

      {photo && <div className="lightbox" onClick={() => setPhoto(null)}><img src={photo} alt="" /></div>}
      <DecisionSheet r={decided ? r : null} onClose={() => setDecided(false)} />
    </div>
  )
}
