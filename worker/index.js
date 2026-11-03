// EAT WHAT Worker：只處理 /api/*，其他路徑都交給 dist/ 的靜態檔。
// 餐廳資料庫：KV（binding EDITS）key `places` = { ver, list }，網頁和 iOS App 開啟時都從 GET /api/places 讀，
// 所以增刪改店家只要在後台（App 裡的「管理餐廳」）操作，不用改程式、不用重送 App。
// 第一次讀時 KV 還沒有資料：用打包的 saved.json，套上舊版 `edits`（分類／價格修改）當起始資料，第一次寫入才存進 KV。
// 店家照片：後台上傳的存在 KV `photo:<id>`（GET /api/photo/<id>）；原本 348 張 Google 照片是靜態檔 /img/places/<id>.jpg。
// 寫入要帶管理員密碼（Authorization: Bearer <密碼>），Worker 用 ADMIN_SALT + 密碼的 SHA-256 比對 ADMIN_HASH。
// iOS App 從 capacitor://localhost 呼叫，所以 /api/* 都回 CORS 標頭。

import SEED from '../src/data/saved.json'

const PLACES = 'places'
const CUISINES = new Set([
  'taiwanese', 'bento', 'beefnoodle', 'dumpling', 'ramen', 'donburi', 'sushi', 'hotpot', 'bbq', 'korean', 'thai',
  'vietnamese', 'indian', 'italian', 'burger', 'brunch', 'cafe', 'vegetarian', 'dessert', 'bar', 'stirfry',
  'japanese', 'chinese', 'western', 'bakery', 'izakaya', 'finedining', 'bistro',
])
const TAGS = new Set(['solo', 'group', 'kids', 'pet', 'veg', 'private', 'quiet', 'late'])
const LISTS = new Set(['want', 'fav', 'star'])
const PHOTO_MAX = 3 * 1024 * 1024
const PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, If-None-Match',
  'Access-Control-Expose-Headers': 'ETag',
  'Access-Control-Max-Age': '86400',
}

const json = (data, status = 200, extra = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS, ...extra } })

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('')
}

async function isAdmin(req, env) {
  const m = (req.headers.get('Authorization') || '').match(/^Bearer (.+)$/)
  if (!m || !env.ADMIN_HASH) return false
  return (await sha256((env.ADMIN_SALT || '') + m[1])) === env.ADMIN_HASH
}

/** 價位區間的代表價（排序用）：有上限取中點，「以上」取下限 × 1.2 */
const midPrice = pr => (pr ? Math.round((pr[1] >= 99999 ? pr[0] * 1.2 : (pr[0] + pr[1]) / 2) / 10) * 10 : null)

async function readPlaces(env) {
  const kv = await env.EDITS.get(PLACES, 'json')
  if (kv) return kv
  const edits = (await env.EDITS.get('edits', 'json')) || {}
  const list = SEED.map(r => {
    const e = edits[r.id]
    if (!e) return r
    const priceRange = e.priceRange !== undefined ? e.priceRange : r.priceRange
    return { ...r, cuisine: e.cuisine ?? r.cuisine, priceRange, price: midPrice(priceRange) ?? r.price }
  })
  return { ver: 0, list }
}

async function writePlaces(env, list) {
  const data = { ver: Date.now(), list }
  await env.EDITS.put(PLACES, JSON.stringify(data))
  return data
}

const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
const num = (v, lo, hi) => (typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi ? v : null)

/** 檢查並整理一家店；回傳 [店家, null] 或 [null, 錯誤訊息] */
function clean(b, id, prev) {
  const name = str(b.name, 100)
  if (!name) return [null, 'name required']
  if (!CUISINES.has(b.cuisine)) return [null, 'bad cuisine']
  const lat = num(b.lat, -90, 90), lng = num(b.lng, -180, 180)
  if (lat === null || lng === null) return [null, 'bad lat/lng']
  let priceRange = null
  if (b.priceRange != null) {
    const p = b.priceRange
    if (!Array.isArray(p) || p.length !== 2 || !p.every(n => Number.isInteger(n) && n >= 0 && n <= 99999) || p[0] > p[1]) return [null, 'bad priceRange']
    priceRange = [p[0], p[1]]
  }
  let hours = null
  if (b.hours != null) {
    const h = b.hours
    const okDay = d => Array.isArray(d) && d.length <= 4 && d.every(s => Array.isArray(s) && s.length === 2 && Number.isInteger(s[0]) && Number.isInteger(s[1]) && s[0] >= 0 && s[0] < s[1] && s[1] <= 2880)
    if (!Array.isArray(h) || h.length !== 7 || !h.every(okDay)) return [null, 'bad hours']
    hours = h
  }
  return [{
    id,
    name,
    cuisine: b.cuisine,
    gcat: str(b.gcat, 40),
    list: LISTS.has(b.list) ? b.list : 'want',
    cid: typeof b.cid === 'string' && /^\d{1,24}$/.test(b.cid) ? b.cid : (prev?.cid ?? null),
    lat, lng,
    rating: num(b.rating, 0, 5) ?? 0,
    reviews: Number.isInteger(b.reviews) && b.reviews >= 0 ? b.reviews : 0,
    price: midPrice(priceRange),
    priceRange,
    addr: str(b.addr, 200),
    phone: str(b.phone, 40),
    hours,
    tags: Array.isArray(b.tags) ? b.tags.filter(t => TAGS.has(t)).slice(0, 8) : [],
    // 照片版本由上傳照片時設定，不讓一般修改覆蓋
    ...(prev?.photo ? { photo: prev.photo } : {}),
  }, null]
}

async function body(req) {
  try { return (await req.json()) || {} } catch { return null }
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url)
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(req)
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })
    const path = url.pathname

    if (path === '/api/places' && req.method === 'GET') {
      const data = await readPlaces(env)
      const etag = `"v${data.ver}"`
      if (req.headers.get('If-None-Match') === etag) return new Response(null, { status: 304, headers: { ...CORS, ETag: etag } })
      return json(data, 200, { 'Cache-Control': 'no-cache', ETag: etag })
    }

    const ph = path.match(/^\/api\/photo\/([a-z0-9]{1,16})$/)
    if (ph && req.method === 'GET') {
      const { value, metadata } = await env.EDITS.getWithMetadata('photo:' + ph[1], 'arrayBuffer')
      if (!value) return json({ error: 'not found' }, 404)
      return new Response(value, { headers: { 'Content-Type': metadata?.type || 'image/jpeg', 'Cache-Control': 'public, max-age=31536000, immutable', ...CORS } })
    }

    if (path === '/api/admin/check' && req.method === 'POST') {
      return (await isAdmin(req, env)) ? json({ ok: true }) : json({ ok: false }, 401)
    }

    // 以下都要管理員
    const one = path.match(/^\/api\/places\/([a-z0-9]{1,16})$/)
    const isWrite = (path === '/api/places' && req.method === 'POST') || (one && (req.method === 'PUT' || req.method === 'DELETE')) || (ph && req.method === 'PUT')
    if (!isWrite) return json({ error: 'not found' }, 404)
    if (!(await isAdmin(req, env))) return json({ error: 'unauthorized' }, 401)
    const data = await readPlaces(env)

    if (path === '/api/places') {
      const b = await body(req)
      if (!b) return json({ error: 'bad json' }, 400)
      const id = 'n' + Date.now().toString(36)
      const [place, err] = clean(b, id, null)
      if (err) return json({ error: err }, 400)
      return json(await writePlaces(env, [...data.list, place]), 201)
    }

    if (one) {
      const id = one[1]
      const i = data.list.findIndex(r => r.id === id)
      if (i < 0) return json({ error: 'no such place' }, 404)
      if (req.method === 'DELETE') {
        await env.EDITS.delete('photo:' + id)
        return json(await writePlaces(env, data.list.filter(r => r.id !== id)))
      }
      const b = await body(req)
      if (!b) return json({ error: 'bad json' }, 400)
      const [place, err] = clean({ ...data.list[i], ...b }, id, data.list[i])
      if (err) return json({ error: err }, 400)
      const list = data.list.slice(); list[i] = place
      return json(await writePlaces(env, list))
    }

    // PUT /api/photo/<id>：上傳店家照片（App 先縮到 900 px JPEG）
    const id = ph[1]
    const i = data.list.findIndex(r => r.id === id)
    if (i < 0) return json({ error: 'no such place' }, 404)
    const type = (req.headers.get('Content-Type') || '').split(';')[0]
    if (!PHOTO_TYPES.has(type)) return json({ error: 'jpeg/png/webp only' }, 415)
    const buf = await req.arrayBuffer()
    if (!buf.byteLength || buf.byteLength > PHOTO_MAX) return json({ error: 'photo too large (max 3 MB)' }, 413)
    await env.EDITS.put('photo:' + id, buf, { metadata: { type } })
    const list = data.list.slice(); list[i] = { ...list[i], photo: Date.now() }
    return json(await writePlaces(env, list))
  },
}
