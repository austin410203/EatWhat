import { useEffect, useState } from 'react'
import { getState } from './store'

// 揪團投票房（測試版）：存在 localStorage，用 BroadcastChannel 在同一個瀏覽器的分頁之間即時同步。
// 正式版會換成 Cloudflare Durable Object（WebSocket），介面維持不變：getRoom / updateRoom / useRoom。

export type Vote = 2 | 1 | -2 // 想吃 / 可以 / 不要
export const VOTE_LABEL: Record<Vote, [string, string, string]> = {
  2: ['😋', '想吃', 'Yes!'],
  1: ['🙂', '可以', 'OK'],
  [-2]: ['🙅', '不要', 'Nope'],
}

export interface Member {
  id: string
  name: string
  avatar: string
  bot?: boolean
  votes: Record<string, Vote>
  done: boolean
}

export interface Room {
  code: string
  title: string
  hostId: string
  createdAt: number
  candidates: string[]
  members: Member[]
  closed: boolean
  winner?: string
}

const PREFIX = 'eatwhat.room.'
const chan: BroadcastChannel | null = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('eatwhat-room') : null
const local = new Set<(code: string) => void>()

// 測試版每個分頁算一個人（sessionStorage），才能在同一台電腦開兩個分頁扮演兩個人。
// 正式版改成帳號或裝置 ID。
export function myId(): string {
  try {
    let id = sessionStorage.getItem('eatwhat.me')
    if (!id) { id = 'u' + Math.random().toString(36).slice(2, 9); sessionStorage.setItem('eatwhat.me', id) }
    return id
  } catch { return 'u-anon' }
}

export function getRoom(code: string): Room | null {
  try { const raw = localStorage.getItem(PREFIX + code); return raw ? JSON.parse(raw) : null } catch { return null }
}

function save(room: Room) {
  try { localStorage.setItem(PREFIX + room.code, JSON.stringify(room)) } catch { /* ignore */ }
  chan?.postMessage(room.code)
  local.forEach(f => f(room.code))
}

export function updateRoom(code: string, fn: (r: Room) => void) {
  const r = getRoom(code)
  if (!r) return
  fn(r)
  save(r)
}

const AV = ['🐻', '🐼', '🦊', '🐱', '🐶', '🐰', '🐸', '🐨', '🐯', '🐧', '🐹', '🦁']

export function createRoom(title: string, candidates: string[]): Room {
  const code = Math.random().toString(36).slice(2, 7).toUpperCase()
  const s = getState()
  const room: Room = {
    code, title, hostId: myId(), createdAt: Date.now(), candidates, closed: false,
    members: [{ id: myId(), name: s.nickname || '我', avatar: '🍙', votes: {}, done: false }],
  }
  save(room)
  return room
}

/** 從分享連結開啟：本機沒有這個房間就依連結內容建一個（不同裝置的測試情境） */
export function ensureRoomFromLink(code: string, candidates: string[], title: string): Room | null {
  const r = getRoom(code)
  if (r) return r
  if (!candidates.length) return null
  const room: Room = { code, title, hostId: 'remote', createdAt: Date.now(), candidates, closed: false, members: [] }
  save(room)
  return room
}

export function joinRoom(code: string, name: string) {
  updateRoom(code, r => {
    if (r.members.some(m => m.id === myId())) return
    const used = new Set(r.members.map(m => m.avatar))
    r.members.push({ id: myId(), name, avatar: AV.find(a => !used.has(a)) ?? AV[0], votes: {}, done: false })
  })
}

export function shareUrl(r: Room) {
  const base = location.href.split('#')[0]
  const q = new URLSearchParams({ c: r.candidates.join(','), t: r.title })
  return `${base}#/room/${r.code}?${q}`
}

function botVoteLater(code: string, id: string) {
  setTimeout(() => {
    updateRoom(code, rr => {
      const m = rr.members.find(x => x.id === id)
      if (!m || rr.closed) return
      rr.candidates.forEach(c => {
        const x = Math.random()
        m.votes[c] = x < 0.45 ? 2 : x < 0.85 ? 1 : -2
      })
      m.done = true
    })
  }, 1500 + Math.random() * 3500)
}

/** 重新投票時，模擬朋友也再投一次 */
export function botsRevote(code: string) {
  getRoom(code)?.members.filter(m => m.bot).forEach(m => botVoteLater(code, m.id))
}

const BOT_NAMES = ['阿哲', '小美', 'Kevin', '珊珊', '胖虎', 'Yuki', '大雄', '靜香']

/** 模擬朋友加入並投票，方便一個人測試整個流程 */
export function addBots(code: string, n: number) {
  const r = getRoom(code)
  if (!r) return
  const taken = new Set(r.members.map(m => m.name))
  const names = BOT_NAMES.filter(x => !taken.has(x)).slice(0, n)
  names.forEach((name, i) => {
    const id = 'bot' + Math.random().toString(36).slice(2, 7)
    setTimeout(() => {
      updateRoom(code, rr => { const used = new Set(rr.members.map(m => m.avatar)); rr.members.push({ id, name, avatar: AV.find(a => !used.has(a)) ?? AV[0], bot: true, votes: {}, done: false }) })
      botVoteLater(code, id)
    }, 400 + i * 700)
  })
}

export interface Tally { id: string; score: number; yes: number; ok: number; no: number }

export function tally(r: Room): Tally[] {
  return r.candidates
    .map(id => {
      let yes = 0, ok = 0, no = 0
      r.members.forEach(m => { const v = m.votes[id]; if (v === 2) yes++; else if (v === 1) ok++; else if (v === -2) no++ })
      return { id, yes, ok, no, score: yes * 2 + ok - no * 2 }
    })
    .sort((a, b) => b.score - a.score || b.yes - a.yes || a.no - b.no)
}

export function topTies(t: Tally[]) {
  if (!t.length) return []
  const best = t[0]
  return t.filter(x => x.score === best.score && x.yes === best.yes && x.no === best.no).map(x => x.id)
}

export function myRooms(): Room[] {
  const out: Room[] = []
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k?.startsWith(PREFIX)) { const r = getRoom(k.slice(PREFIX.length)); if (r) out.push(r) }
    }
  } catch { /* ignore */ }
  return out.sort((a, b) => b.createdAt - a.createdAt)
}

export function useRoom(code: string) {
  const [room, setRoom] = useState<Room | null>(() => getRoom(code))
  useEffect(() => {
    setRoom(getRoom(code))
    const f = (c: string) => { if (c === code) setRoom(getRoom(code)) }
    const onMsg = (e: MessageEvent) => f(e.data)
    const onStorage = (e: StorageEvent) => { if (e.key === PREFIX + code) setRoom(getRoom(code)) }
    local.add(f)
    chan?.addEventListener('message', onMsg)
    window.addEventListener('storage', onStorage)
    return () => { local.delete(f); chan?.removeEventListener('message', onMsg); window.removeEventListener('storage', onStorage) }
  }, [code])
  return room
}
