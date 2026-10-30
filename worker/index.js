// EAT WHAT Worker：只處理 /api/*，其他路徑都交給 dist/ 的靜態檔。
// 管理員對店家的修改（分類、價格）存在 KV 的一個 JSON 裡，所有使用者開 App 時讀取並套用。
// 寫入要帶管理員密碼（Authorization: Bearer <密碼>），Worker 用 ADMIN_SALT + 密碼的 SHA-256 比對 ADMIN_HASH。
// /api/photo/<id>：用 Google Places 官方照片（place_id 在 place_ids.json，由 _data/resolve_place_ids.py 產生）。
// 照片每月前 1,000 張免費，之後每 1,000 張 US$7；KV 記每月用量，到 PHOTO_CAP 就停，App 改回示意圖。

import PIDS from './place_ids.json'

const KEY = 'edits'
const CUISINES = new Set([
  'taiwanese', 'bento', 'beefnoodle', 'dumpling', 'ramen', 'donburi', 'sushi', 'hotpot', 'bbq', 'korean', 'thai',
  'vietnamese', 'indian', 'italian', 'burger', 'brunch', 'cafe', 'vegetarian', 'dessert', 'bar', 'stirfry',
  'japanese', 'chinese', 'western', 'bakery', 'izakaya', 'finedining', 'bistro',
])

const PHOTO_CAP = 950
const PLACES = 'https://places.googleapis.com/v1/'

const json = (data, status = 200, extra = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...extra } })

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('')
}

async function isAdmin(req, env) {
  const m = (req.headers.get('Authorization') || '').match(/^Bearer (.+)$/)
  if (!m || !env.ADMIN_HASH) return false
  return (await sha256((env.ADMIN_SALT || '') + m[1])) === env.ADMIN_HASH
}

async function readEdits(env) {
  return (await env.EDITS.get(KEY, 'json')) || {}
}

/** 一家店的官方照片：Place Details 只要 photos 欄位（免費級別），再拿第一張照片的網址和拍攝者 */
async function photo(id, env) {
  const pid = PIDS[id]
  if (!pid || !env.GOOGLE_PLACES_KEY) return json({ error: 'no photo' }, 404)
  const counter = 'photos:' + new Date().toISOString().slice(0, 7)
  const used = parseInt((await env.EDITS.get(counter)) || '0', 10)
  if (used >= PHOTO_CAP) return json({ error: 'monthly cap' }, 429)

  const key = { 'X-Goog-Api-Key': env.GOOGLE_PLACES_KEY }
  const d = await fetch(PLACES + 'places/' + pid, { headers: { ...key, 'X-Goog-FieldMask': 'photos' } })
  if (!d.ok) return json({ error: 'details ' + d.status }, 502)
  const p = ((await d.json()).photos || [])[0]
  if (!p) return json({ error: 'no photo' }, 404, { 'Cache-Control': 'private, max-age=86400' })

  await env.EDITS.put(counter, String(used + 1), { expirationTtl: 40 * 86400 })
  const m = await fetch(PLACES + p.name + '/media?maxWidthPx=960&skipHttpRedirect=true', { headers: key })
  if (!m.ok) return json({ error: 'media ' + m.status }, 502)
  const a = (p.authorAttributions || [])[0] || {}
  return json({ url: (await m.json()).photoUri, author: a.displayName || '', authorUri: a.uri || '' }, 200,
    { 'Cache-Control': 'private, max-age=3600' })
}

/** 檢查並整理一筆修改；回傳 null 表示格式不對 */
function clean(body) {
  const out = {}
  if (body.cuisine !== undefined) {
    if (!CUISINES.has(body.cuisine)) return null
    out.cuisine = body.cuisine
  }
  if (body.priceRange !== undefined) {
    const p = body.priceRange
    if (p !== null) {
      if (!Array.isArray(p) || p.length !== 2 || !p.every(n => Number.isInteger(n) && n >= 0 && n <= 99999) || p[0] > p[1]) return null
    }
    out.priceRange = p
  }
  return Object.keys(out).length ? out : null
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url)
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(req)

    if (url.pathname === '/api/edits' && req.method === 'GET') {
      return json(await readEdits(env), 200, { 'Cache-Control': 'no-store' })
    }

    if (url.pathname === '/api/admin/check' && req.method === 'POST') {
      return (await isAdmin(req, env)) ? json({ ok: true }) : json({ ok: false }, 401)
    }

    const ph = url.pathname.match(/^\/api\/photo\/([a-z0-9]{1,16})$/)
    if (ph && req.method === 'GET') return photo(ph[1], env)

    const m = url.pathname.match(/^\/api\/edits\/([a-z0-9]{1,16})$/)
    if (m && (req.method === 'PUT' || req.method === 'DELETE')) {
      if (!(await isAdmin(req, env))) return json({ error: 'unauthorized' }, 401)
      const edits = await readEdits(env)
      if (req.method === 'DELETE') {
        delete edits[m[1]]
      } else {
        let body
        try { body = await req.json() } catch { return json({ error: 'bad json' }, 400) }
        const e = clean(body || {})
        if (!e) return json({ error: 'invalid edit' }, 400)
        edits[m[1]] = { ...edits[m[1]], ...e, at: Date.now() }
      }
      await env.EDITS.put(KEY, JSON.stringify(edits))
      return json(edits)
    }

    return json({ error: 'not found' }, 404)
  },
}
