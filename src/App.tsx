import { useState } from 'react'
import { Logo, Toaster } from './components/ui'
import { useRoute, nav } from './lib/router'
import { setState, useStore, useT } from './lib/store'
import { Decide } from './screens/Decide'
import { Explore } from './screens/Explore'
import { Detail } from './screens/Detail'
import { Group, RoomScreen } from './screens/Group'
import { Swipe } from './screens/Swipe'
import { Me } from './screens/Me'

const TABS: [string, string, string, string][] = [
  ['decide', '🎲', '決定', 'Decide'],
  ['explore', '🧭', '探索', 'Explore'],
  ['group', '👥', '揪團', 'Group'],
  ['swipe', '🃏', '滑卡', 'Swipe'],
  ['me', '🍙', '我的', 'Me'],
]

function Welcome() {
  const t = useT()
  const [name, setName] = useState('')
  return (
    <div className="welcome">
      <div className="welcome-card pop-in">
        <Logo />
        <h2>{t('午餐吃什麼？交給我。', "Lunch? Leave it to me.")}</h2>
        <ul>
          <li>🎲 {t('設好預算和距離，一鍵抽出 3 家', 'Set budget & distance, get 3 picks')}</li>
          <li>👥 {t('丟連結到群組，大家投票決定', 'Share a link, let friends vote')}</li>
          <li>🛡️ {t('可信分數幫你避開灌分的店', 'Trust score filters inflated ratings')}</li>
        </ul>
        <input className="input" placeholder={t('你的暱稱（揪團時顯示）', 'Your nickname')} value={name} onChange={e => setName(e.target.value.slice(0, 12))} />
        <button className="btn primary block" onClick={() => setState({ onboarded: true, nickname: name.trim() })}>{t('開始', 'Start')}</button>
        <p className="muted small">{t('測試版：店家與評論都是假資料', 'Test build: all data is fake')}</p>
        <div className="seg center-seg">
          <button onClick={() => setState({ lang: 'zh' })}>中文</button>
          <button onClick={() => setState({ lang: 'en' })}>English</button>
        </div>
      </div>
    </div>
  )
}

export function App() {
  const route = useRoute()
  const t = useT()
  const onboarded = useStore(s => s.onboarded)
  const [head, arg] = route.path
  const tab = head || 'decide'
  const roomLink = head === 'room'

  let screen
  switch (head) {
    case 'explore': screen = <Explore />; break
    case 'r': screen = <Detail id={arg} key={arg} />; break
    case 'group': screen = <Group query={route.query} key={route.query.get('add') || ''} />; break
    case 'room': screen = <RoomScreen code={arg} query={route.query} key={arg} />; break
    case 'swipe': screen = <Swipe />; break
    case 'me': screen = <Me />; break
    default: screen = <Decide />
  }

  const activeTab = tab === 'r' ? null : tab === 'room' ? 'group' : tab

  return (
    <div className="app">
      <main className="main">{screen}</main>
      <nav className="tabbar">
        {TABS.map(([k, icon, zh, en]) => (
          <button key={k} className={activeTab === k ? 'on' : ''} onClick={() => nav('/' + k)}>
            <span>{icon}</span><small>{t(zh, en)}</small>
          </button>
        ))}
      </nav>
      {!onboarded && !roomLink && <Welcome />}
      <Toaster />
    </div>
  )
}
