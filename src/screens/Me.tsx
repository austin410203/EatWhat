import { useRef, useState } from 'react'
import { BY_ID, CUISINE_MAP, type CuisineKey } from '../data/restaurants'
import { Art, Ico } from '../components/Ico'
import { Header, RestaurantRow, Toggle, toast } from '../components/ui'
import { nav } from '../lib/router'
import { exportData, importData, resetAll, setState, toggleIn, useStore, useT } from '../lib/store'

type Tab = 'fav' | 'history' | 'blocked'

function ago(ms: number, zh: boolean) {
  const m = Math.round((Date.now() - ms) / 60000)
  if (m < 60) return zh ? `${Math.max(1, m)} 分鐘前` : `${Math.max(1, m)}m ago`
  const h = Math.round(m / 60)
  if (h < 24) return zh ? `${h} 小時前` : `${h}h ago`
  const d = Math.round(h / 24)
  return zh ? `${d} 天前` : `${d}d ago`
}

export function Me() {
  const t = useT()
  const s = useStore(s => s)
  const [tab, setTab] = useState<Tab>('fav')
  const file = useRef<HTMLInputElement>(null)
  const zh = s.lang === 'zh'

  const tasteAll = (Object.entries(s.taste) as [CuisineKey, number][]).filter(([, v]) => v !== 0).sort((a, b) => b[1] - a[1])
  // 只列最愛 6 種＋最不想吃 3 種，避免一長串
  const taste = [...tasteAll.filter(([, v]) => v > 0).slice(0, 6), ...tasteAll.filter(([, v]) => v < 0).slice(-3)]

  function doExport() {
    const blob = new Blob([exportData()], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `eatwhat-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  async function doImport(f: File) {
    const ok = importData(await f.text())
    toast(ok ? t('資料已匯入', 'Imported') : t('檔案格式不對', 'Invalid file'))
  }

  const ids = tab === 'fav' ? s.favorites : tab === 'blocked' ? s.blocked : s.history.map(h => h.id)

  return (
    <div className="screen me">
      <Header title={t('我的', 'Me')} />

      <div className="card profile">
        <span className="profile-art"><Art name="onigiri" size={56} /></span>
        <div className="grow">
          <label className="muted small">{t('暱稱（揪團時顯示）', 'Nickname (shown in votes)')}</label>
          <input className="input" value={s.nickname} placeholder={t('輸入暱稱', 'Your name')} onChange={e => setState({ nickname: e.target.value.slice(0, 12) })} />
        </div>
      </div>

      <div className="card">
        <div className="card-head"><h3>{t('我的口味', 'My taste')}</h3><button className="link-btn" onClick={() => nav('/swipe')}>{t('滑卡調整', 'Swipe to tune')}<Ico name="chev" size={14} /></button></div>
        {taste.length ? (
          <div className="taste">
            {taste.map(([k, v]) => (
              <div key={k} className="taste-row">
                <span><Art name={k} size={22} />{CUISINE_MAP[k][s.lang]}</span>
                <div className="bar"><i className={v > 0 ? 'pos' : 'neg'} style={{ width: `${(Math.abs(v) / 3) * 50}%`, [v > 0 ? 'left' : 'right']: '50%' }} /></div>
              </div>
            ))}
          </div>
        ) : <p className="muted">{t('還沒有口味資料，去「滑卡」選幾張，推薦會更合你胃口。', 'No taste data yet — try Swipe to personalise picks.')}</p>}
      </div>

      <div className="seg wide">
        <button className={tab === 'fav' ? 'on' : ''} onClick={() => setTab('fav')}>{t('收藏', 'Saved')}{!!s.favorites.length && <i>{s.favorites.length}</i>}</button>
        <button className={tab === 'history' ? 'on' : ''} onClick={() => setTab('history')}>{t('吃過', 'History')}{!!s.history.length && <i>{s.history.length}</i>}</button>
        <button className={tab === 'blocked' ? 'on' : ''} onClick={() => setTab('blocked')}>{t('不想再去', 'Blocked')}{!!s.blocked.length && <i>{s.blocked.length}</i>}</button>
      </div>
      <div className="list">
        {ids.map((id, i) => {
          const r = BY_ID[id]
          if (!r) return null
          const right =
            tab === 'history' ? <small className="muted">{ago(s.history[i].at, zh)}</small>
            : tab === 'blocked' ? <button className="btn small" onClick={e => { e.stopPropagation(); toggleIn('blocked', id) }}>{t('解除', 'Undo')}</button>
            : undefined
          return <RestaurantRow key={id + i} r={r} right={right} />
        })}
        {!ids.length && (
          <div className="empty small">
            <Art name={tab === 'fav' ? 'heart' : tab === 'history' ? 'clock' : 'shield'} size={56} />
            {tab === 'fav' ? t('在店家頁按 ♡ 收藏', 'Tap ♡ on a place to save it')
              : tab === 'history' ? t('決定吃哪家之後會記在這裡，3 天內吃過的不會再推薦', 'Places you pick show up here')
              : t('按「不想再去」的店不會再出現', "Places you block won't be suggested")}
          </div>
        )}
      </div>

      <div className="card">
        <h3>{t('設定', 'Settings')}</h3>
        <div className="toggle-row">
          <span className="toggle-label">{t('語言', 'Language')}</span>
          <div className="seg">
            <button className={zh ? 'on' : ''} onClick={() => setState({ lang: 'zh' })}>中文</button>
            <button className={!zh ? 'on' : ''} onClick={() => setState({ lang: 'en' })}>English</button>
          </div>
        </div>
        <Toggle on={s.showAds} onChange={v => setState({ showAds: v })} label={t('顯示廣告版位（測試）', 'Show ad slots (test)')} hint={t('模擬免費版的版面', 'Preview the free-tier layout')} />
        <div className="btn-row">
          <button className="btn small" onClick={doExport}><Ico name="download" size={15} />{t('匯出資料', 'Export')}</button>
          <button className="btn small" onClick={() => file.current?.click()}><Ico name="upload" size={15} />{t('匯入資料', 'Import')}</button>
          <button className="btn small danger" onClick={() => { if (confirm(t('清除所有收藏、紀錄與設定？', 'Clear all data?'))) { resetAll(); toast(t('已清除', 'Cleared')) } }}>{t('清除資料', 'Reset')}</button>
        </div>
        <input ref={file} type="file" accept="application/json,.json" hidden onChange={e => { const f = e.target.files?.[0]; if (f) doImport(f); e.target.value = '' }} />
      </div>

      <div className="card about">
        <h3>{t('關於測試版', 'About this test build')}</h3>
        <p className="muted">{t(
          '目前店家、評分、評論都是程式產生的測試資料，位置固定在中山站附近。揪團投票只在同一個瀏覽器的分頁之間同步，可以用「模擬朋友加入」測試整個流程。',
          'All places, ratings and reviews are generated test data around Zhongshan Station. Group votes sync only between tabs in this browser — use “Simulate friends” to try the full flow.',
        )}</p>
        <p className="muted small">EAT WHAT v0.1 · Empty Office</p>
      </div>
    </div>
  )
}
