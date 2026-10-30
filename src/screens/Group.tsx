import { useEffect, useMemo, useRef, useState } from 'react'
import { BY_ID, CUISINE_MAP, RESTAURANTS } from '../data/restaurants'
import { Cover, Header, ScoreBadge, toast } from '../components/ui'
import { DecisionSheet, mapsUrl } from './Decide'
import { applyFilters, distanceKm, fmtDist, pickN } from '../lib/logic'
import {
  VOTE_LABEL, addBots, botsRevote, createRoom, ensureRoomFromLink, joinRoom, myId, myRooms, shareUrl, tally, topTies, updateRoom, useRoom, type Vote,
} from '../lib/room'
import { nav } from '../lib/router'
import { getState, markEaten, useStore, useT } from '../lib/store'

// ---------- 開房 ----------

export function Group({ query }: { query: URLSearchParams }) {
  const t = useT()
  const lang = useStore(s => s.lang)
  const s = useStore(s => s)
  const [title, setTitle] = useState('')
  const [picked, setPicked] = useState<string[]>(() => (query.get('add') || '').split(',').filter(id => BY_ID[id]))
  const [q, setQ] = useState('')
  const rooms = myRooms()

  const pool = useMemo(() => applyFilters(s.filters, s), [s])
  const search = useMemo(() => {
    const k = q.trim().toLowerCase()
    if (!k) return []
    return RESTAURANTS.filter(r => r.name.zh.includes(k) || r.name.en.toLowerCase().includes(k) || CUISINE_MAP[r.cuisine].zh.includes(k)).slice(0, 8)
  }, [q])

  const add = (id: string) => setPicked(p => (p.includes(id) || p.length >= 6 ? p : [...p, id]))
  const auto = () => {
    const got = pickN(pool, 4 - Math.min(picked.length, 4), getState(), new Set(picked)).map(r => r.id)
    if (!got.length) toast(t('目前條件下沒有店可以挑，去「決定」頁放寬條件', 'No matches with current filters'))
    setPicked(p => [...p, ...got].slice(0, 6))
  }

  function create() {
    const room = createRoom(title.trim() || t('等等吃什麼？', 'What to eat?'), picked)
    nav('/room/' + room.code)
  }

  return (
    <div className="screen group">
      <Header title={t('揪團投票', 'Group vote')} sub={t('丟連結到群組，大家一起選', 'Share a link, everyone votes')} />

      <div className="card">
        <h3>{t('開一個新投票', 'Start a new vote')}</h3>
        <input className="input" placeholder={t('例如：週五部門聚餐', 'e.g. Friday team dinner')} value={title} onChange={e => setTitle(e.target.value.slice(0, 20))} />
        <div className="card-head"><h4>{t(`候選餐廳（${picked.length}/6）`, `Candidates (${picked.length}/6)`)}</h4></div>
        <div className="cand-list">
          {picked.map(id => {
            const r = BY_ID[id]
            return (
              <div key={id} className="cand">
                <span className="cand-emoji">{CUISINE_MAP[r.cuisine].emoji}</span>
                <span className="grow">{r.name[lang]} <small className="muted">NT${r.price} · {fmtDist(distanceKm(r))}</small></span>
                <button className="icon-btn small" onClick={() => setPicked(p => p.filter(x => x !== id))} aria-label="remove">✕</button>
              </div>
            )
          })}
          {!picked.length && <p className="muted small">{t('至少選 2 家。可以自動挑、從收藏加，或搜尋店名。', 'Pick at least 2: auto-pick, from saved, or search.')}</p>}
        </div>
        <div className="btn-row">
          <button className="btn small" onClick={auto}>🎲 {t('依我的條件自動挑', 'Auto-pick')}</button>
          {!!s.favorites.length && <button className="btn small" onClick={() => s.favorites.slice(0, 6).forEach(add)}>♥ {t('從收藏加入', 'From saved')}</button>}
        </div>
        <input className="input" placeholder={t('🔍 搜尋店名或料理加入', '🔍 Search to add')} value={q} onChange={e => setQ(e.target.value)} />
        {!!search.length && (
          <div className="search-results">
            {search.map(r => (
              <button key={r.id} className="search-item" onClick={() => { add(r.id); setQ('') }}>
                {CUISINE_MAP[r.cuisine].emoji} {r.name[lang]} <small className="muted">NT${r.price}</small>
              </button>
            ))}
          </div>
        )}
        <button className="btn primary block" disabled={picked.length < 2} onClick={create}>{t('建立投票房間', 'Create vote')}</button>
      </div>

      {!!rooms.length && (
        <div className="card">
          <h3>{t('最近的投票', 'Recent votes')}</h3>
          {rooms.slice(0, 8).map(r => {
            const w = r.winner ? BY_ID[r.winner] : null
            return (
              <button key={r.code} className="room-item" onClick={() => nav('/room/' + r.code)}>
                <b>{r.title}</b>
                <small className="muted">{r.code} · {t(`${r.members.length} 人`, `${r.members.length} people`)} · {r.closed ? (w ? `🏆 ${w.name[lang]}` : t('已結束', 'Closed')) : t('投票中', 'Voting')}</small>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ---------- 投票房 ----------

export function RoomScreen({ code, query }: { code: string; query: URLSearchParams }) {
  const t = useT()
  const lang = useStore(s => s.lang)
  const nickname = useStore(s => s.nickname)
  const [created] = useState(() => ensureRoomFromLink(code, (query.get('c') || '').split(',').filter(id => BY_ID[id]), query.get('t') || ''))
  const room = useRoom(code)
  const [name, setName] = useState(nickname)
  const [spinning, setSpinning] = useState<string | null>(null)
  const [decided, setDecided] = useState(false)
  const spinTimer = useRef(0)
  useEffect(() => () => clearInterval(spinTimer.current), [])

  if (!room && !created) {
    return (
      <div className="screen"><Header title={t('找不到投票', 'Vote not found')} left={<button className="icon-btn" onClick={() => nav('/group')}>‹</button>} />
        <div className="empty">🤔<p>{t('這個投票連結無效或已過期', 'This vote link is invalid or expired')}</p><button className="btn primary" onClick={() => nav('/group')}>{t('開新的投票', 'Start a new vote')}</button></div>
      </div>
    )
  }
  if (!room) return null

  const me = room.members.find(m => m.id === myId())
  const isHost = room.hostId === myId()
  const results = tally(room)
  const ties = topTies(results)
  const doneCount = room.members.filter(m => m.done).length
  const url = shareUrl(room)
  const winner = room.winner ? BY_ID[room.winner] : null

  // 尚未加入：輸入暱稱
  if (!me) {
    return (
      <div className="screen room">
        <Header title={room.title || t('揪團投票', 'Group vote')} sub={t(`房號 ${room.code}`, `Room ${room.code}`)} />
        <div className="card join">
          <div className="join-emoji">🍽️</div>
          <h3>{t('朋友邀請你一起決定吃什麼', 'Your friends want you to help pick')}</h3>
          <p className="muted">{t(`有 ${room.candidates.length} 家候選、${room.members.length} 人已加入`, `${room.candidates.length} options · ${room.members.length} joined`)}</p>
          <input className="input" placeholder={t('你的暱稱', 'Your name')} value={name} onChange={e => setName(e.target.value.slice(0, 12))} />
          <button className="btn primary block" onClick={() => joinRoom(code, name.trim() || t('匿名', 'Guest'))}>{t('加入投票', 'Join')}</button>
          <p className="muted small center">{t('不用下載 App，用瀏覽器就能投', 'No app needed')}</p>
        </div>
      </div>
    )
  }

  const vote = (rid: string, v: Vote) => updateRoom(code, r => {
    const m = r.members.find(x => x.id === myId())
    if (!m || r.closed) return
    if (m.votes[rid] === v) delete m.votes[rid]
    else m.votes[rid] = v
  })
  const allVoted = room.candidates.every(c => me.votes[c] !== undefined)

  function submit() {
    updateRoom(code, r => { const m = r.members.find(x => x.id === myId()); if (m) m.done = true })
  }
  function close() {
    if (ties.length > 1) {
      // 平手：抽籤
      let k = 0
      clearInterval(spinTimer.current)
      spinTimer.current = window.setInterval(() => setSpinning(ties[k++ % ties.length]), 110)
      setTimeout(() => {
        clearInterval(spinTimer.current)
        const w = ties[Math.floor(Math.random() * ties.length)]
        setSpinning(null)
        updateRoom(code, r => { r.closed = true; r.winner = w })
      }, 1800)
    } else {
      updateRoom(code, r => { r.closed = true; r.winner = results[0]?.id })
    }
  }
  function reopen() {
    updateRoom(code, r => { r.closed = false; r.winner = undefined; r.members.forEach(m => { m.votes = {}; m.done = false }) })
    botsRevote(code)
  }
  async function copy() {
    try { await navigator.clipboard.writeText(url); toast(t('連結已複製，貼到 LINE 群組吧', 'Link copied')) } catch { prompt(t('複製這個連結', 'Copy this link'), url) }
  }
  async function nativeShare() {
    if (navigator.share) {
      try { await navigator.share({ title: 'EAT WHAT', text: t(`「${room!.title}」一起來投票吃什麼！`, `Vote: ${room!.title}`), url }) } catch { /* 取消分享 */ }
    } else copy()
  }

  const maxScore = Math.max(1, ...results.map(x => Math.abs(x.score)))

  return (
    <div className="screen room">
      <Header
        title={room.title || t('揪團投票', 'Group vote')}
        sub={t(`房號 ${room.code} · ${doneCount}/${room.members.length} 人投完`, `Room ${room.code} · ${doneCount}/${room.members.length} voted`)}
        left={<button className="icon-btn" onClick={() => nav('/group')} aria-label="back">‹</button>}
      />

      {!room.closed && (
        <div className="card share">
          <div className="share-row">
            <code className="share-url">{url.replace(/^https?:\/\//, '')}</code>
          </div>
          <div className="btn-row">
            <button className="btn small primary" onClick={nativeShare}>📤 {t('分享', 'Share')}</button>
            <a className="btn small line" href={`https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}`} target="_blank" rel="noreferrer">LINE</a>
            <button className="btn small" onClick={copy}>{t('複製連結', 'Copy')}</button>
            <button className="btn small ghost" onClick={() => { addBots(code, 3); toast(t('3 位模擬朋友正在加入…', 'Adding 3 simulated friends…')) }}>🤖 {t('模擬朋友加入', 'Simulate friends')}</button>
          </div>
          <p className="muted small">{t('測試版：投票只會在同一個瀏覽器的分頁間同步。可以複製連結開新分頁，扮演另一個人。', 'Test build: votes sync only between tabs of this browser. Open the link in a new tab to act as another person.')}</p>
        </div>
      )}

      <div className="members">
        {room.members.map(m => (
          <span key={m.id} className={`member ${m.done ? 'done' : ''}`} title={m.name}>
            <span className="avatar">{m.avatar}</span>
            <small>{m.id === myId() ? t('我', 'Me') : m.name}</small>
            {m.done && <i>✓</i>}
          </span>
        ))}
      </div>

      {room.closed && winner && (
        <div className="card winner pop-in">
          <div className="confetti" aria-hidden>{['🎉', '🍽️', '🎊'].map((x, i) => <span key={i}>{x}</span>)}</div>
          <p className="muted center">{t('大家決定吃', 'The group picked')}</p>
          <Cover r={winner} h={150}><div className="cover-name"><b>{winner.name[lang]}</b><span>{CUISINE_MAP[winner.cuisine][lang]} · NT${winner.price} · {fmtDist(distanceKm(winner))}</span></div></Cover>
          <div className="btn-row">
            <a className="btn primary" href={mapsUrl(winner)} target="_blank" rel="noreferrer" onClick={() => markEaten(winner.id)}>🧭 {t('出發', 'Go')}</a>
            <button className="btn" onClick={() => nav('/r/' + winner.id)}>{t('店家資訊', 'Details')}</button>
            <button className="btn" onClick={() => setDecided(true)}>✔ {t('記錄', 'Log')}</button>
            {isHost && <button className="btn ghost" onClick={reopen}>{t('重新投票', 'Revote')}</button>}
          </div>
        </div>
      )}

      {spinning && (
        <div className="card spin">
          <p>{t('平手！抽籤中…', 'Tie! Drawing lots…')}</p>
          <b>{CUISINE_MAP[BY_ID[spinning].cuisine].emoji} {BY_ID[spinning].name[lang]}</b>
        </div>
      )}

      <h3 className="section-title">{room.closed ? t('投票結果', 'Results') : me.done ? t('目前票數', 'Live results') : t('每家都投一票', 'Vote on each')}</h3>
      <div className="vote-list">
        {(me.done || room.closed ? results.map(x => x.id) : room.candidates).map(rid => {
          const r = BY_ID[rid]
          const tl = results.find(x => x.id === rid)!
          const mine = me.votes[rid]
          return (
            <div key={rid} className={`vote-card ${room.winner === rid ? 'win' : ''}`}>
              <div className="vote-top" onClick={() => nav('/r/' + rid)} role="button">
                <Cover r={r} h={56} />
                <div className="grow">
                  <b>{r.name[lang]}</b>
                  <small className="muted">{CUISINE_MAP[r.cuisine][lang]} · NT${r.price} · {fmtDist(distanceKm(r))}</small>
                </div>
                <ScoreBadge r={r} />
              </div>
              {!me.done && !room.closed ? (
                <div className="vote-btns">
                  {([2, 1, -2] as Vote[]).map(v => (
                    <button key={v} className={`vote-btn v${v} ${mine === v ? 'on' : ''}`} onClick={() => vote(rid, v)}>
                      {VOTE_LABEL[v][0]} {t(VOTE_LABEL[v][1], VOTE_LABEL[v][2])}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="tally">
                  <div className="tally-bar"><i style={{ width: `${(Math.max(0, tl.score) / maxScore) * 100}%` }} /></div>
                  <span>😋{tl.yes} 🙂{tl.ok} 🙅{tl.no}</span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {!room.closed && (
        <div className="btn-col sticky-cta">
          {!me.done
            ? <button className="btn primary big" disabled={!allVoted} onClick={submit}>{allVoted ? t('送出我的投票', 'Submit my vote') : t(`還有 ${room.candidates.filter(c => me.votes[c] === undefined).length} 家沒投`, `${room.candidates.filter(c => me.votes[c] === undefined).length} left`)}</button>
            : <button className="btn ghost" onClick={() => updateRoom(code, r => { const m = r.members.find(x => x.id === myId()); if (m) m.done = false })}>{t('修改我的投票', 'Change my vote')}</button>}
          {isHost && <button className="btn accent" disabled={!doneCount || !!spinning} onClick={close}>🏁 {t('結束投票，公布結果', 'Close vote & reveal')}</button>}
          {!isHost && <p className="muted small center">{t('等主揪結束投票就會公布結果', 'The host will reveal the result')}</p>}
        </div>
      )}

      <DecisionSheet r={decided ? winner : null} onClose={() => setDecided(false)} />
    </div>
  )
}
