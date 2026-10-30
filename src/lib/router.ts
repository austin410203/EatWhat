import { useSyncExternalStore } from 'react'

// 用 hash 路由：網頁、iOS 殼都不需要伺服器設定。
// #/decide  #/explore  #/r/<id>  #/group  #/room/<code>?c=...  #/swipe  #/me

export interface Route { path: string[]; query: URLSearchParams }

function parse(): Route {
  const h = location.hash.replace(/^#\/?/, '')
  const [p, q = ''] = h.split('?')
  return { path: p.split('/').filter(Boolean), query: new URLSearchParams(q) }
}

let current = parse()
const subs = new Set<() => void>()
window.addEventListener('hashchange', () => {
  current = parse()
  subs.forEach(f => f())
  window.scrollTo(0, 0)
})

export function useRoute(): Route {
  return useSyncExternalStore(cb => { subs.add(cb); return () => subs.delete(cb) }, () => current)
}

export function nav(to: string) {
  location.hash = to.startsWith('#') ? to : '#' + to
}

export function back(fallback = '/decide') {
  if (history.length > 1) history.back()
  else nav(fallback)
}
