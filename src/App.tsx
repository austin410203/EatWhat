import { useEffect, useState } from 'react'
import { Art, Ico, type IcoName } from './components/Ico'
import { Logo, Toaster } from './components/ui'
import { scenePhoto, type IconName } from './lib/assets'
import { loadEdits } from './lib/api'
import { refreshIfGranted } from './lib/location'
import { useRoute, nav } from './lib/router'
import { setState, useStore, useT } from './lib/store'
import { Decide } from './screens/Decide'
import { Explore } from './screens/Explore'
import { Detail } from './screens/Detail'
import { Group, RoomScreen } from './screens/Group'
import { Swipe } from './screens/Swipe'
import { Me } from './screens/Me'

const TABS: [string, IcoName, string, string][] = [
  ['decide', 'dice', '決定', 'Decide'],
  ['explore', 'compass', '探索', 'Explore'],
  ['group', 'users', '揪團', 'Group'],
  ['swipe', 'cards', '滑卡', 'Swipe'],
  ['me', 'user', '我的', 'Me'],
]

const FEATURES: [IconName, string, string, string, string][] = [
  ['dice', '一鍵抽 5 家', 'Five picks in one tap', '設好預算和距離，剩下交給骰子', 'Set budget & distance, let the dice do the rest'],
  ['ballot', '揪團投票', 'Group vote', '丟連結到群組，朋友不用裝 App 也能投', 'Share a link — friends vote without the app'],
  ['shield', '可信分數', 'Trust score', '評論太少的高分店，不會騙到你', "Few-review 5-stars won't fool you"],
]

function Welcome() {
  const t = useT()
  const lang = useStore(s => s.lang)
  const [name, setName] = useState('')
  return (
    <div className="welcome">
      <div className="welcome-photo" style={{ backgroundImage: `url(${scenePhoto('spread')})` }}>
        <div className="welcome-lang seg glass">
          <button className={lang === 'zh' ? 'on' : ''} onClick={() => setState({ lang: 'zh' })}>中文</button>
          <button className={lang === 'en' ? 'on' : ''} onClick={() => setState({ lang: 'en' })}>EN</button>
        </div>
      </div>
      <div className="welcome-card rise-in">
        <Logo />
        <h2>{t('午餐吃什麼？', 'What’s for lunch?')}<br /><span>{t('交給我就好。', 'Leave it to me.')}</span></h2>
        <ul className="feature-list">
          {FEATURES.map(([ic, zt, et, zd, ed]) => (
            <li key={ic}><Art name={ic} size={40} /><div><b>{t(zt, et)}</b><small>{t(zd, ed)}</small></div></li>
          ))}
        </ul>
        <input className="input" placeholder={t('你的暱稱（揪團時顯示）', 'Your nickname (shown in votes)')} value={name} onChange={e => setName(e.target.value.slice(0, 12))} />
        <button className="btn primary block big" onClick={() => setState({ onboarded: true, nickname: name.trim() })}>{t('開始使用', 'Get started')}<Ico name="chev" size={18} /></button>
        <p className="muted small center">{t('測試版：店家與評論都是假資料', 'Test build: all data is fake')}</p>
      </div>
    </div>
  )
}

export function App() {
  const route = useRoute()
  const t = useT()
  const onboarded = useStore(s => s.onboarded)
  // 位置一變，整個畫面重算距離
  useStore(s => s.location)
  // 之前允許過定位的話，開 App 時默默更新位置
  useEffect(() => { refreshIfGranted() }, [])
  // 管理員改過的分類／價格：全站共用，開 App 時讀一次；改了就重畫
  useEffect(() => { loadEdits() }, [])
  useStore(s => s.edits)
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
    <div className={`app at-${tab}`}>
      <main className="main">{screen}</main>
      {head !== 'r' && (
        <nav className="tabbar">
          {TABS.map(([k, icon, zh, en]) => (
            <button key={k} className={activeTab === k ? 'on' : ''} onClick={() => nav('/' + k)} aria-label={t(zh, en)}>
              <Ico name={icon} size={22} stroke={activeTab === k ? 2.2 : 1.8} />
              <small>{t(zh, en)}</small>
            </button>
          ))}
        </nav>
      )}
      {!onboarded && !roomLink && <Welcome />}
      <Toaster />
    </div>
  )
}
