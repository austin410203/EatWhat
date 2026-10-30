# EAT WHAT 吃什麼（網頁版原型）

規劃書：`Gaming/Company/proposals/2026-10-30_eatwhat/PLAN.md`。目前是**假資料版**，用來看功能和流程，還沒接任何店家資料或後端。

## 啟動
- Node 不在 PATH：`export PATH="/c/Users/Administrator/tools/node-v22.23.4-win-x64:$PATH"`
- 預覽：`Gaming/.claude/launch.json` 的 `eatwhat`（port 5481）→ http://localhost:5481/
- 型別檢查 `npx tsc --noEmit`；建置 `npm run build` → `dist/`

## 結構
- `src/data/restaurants.ts`：96 家假店家（固定亂數種子，散布在中山站附近 3 km 內）。換真資料時產出同樣的 `Restaurant` 結構即可。
- `src/lib/logic.ts`：距離、可信分數（貝氏平均，PRIOR 3.9 / 權重 40）、營業時間、篩選、加權抽選。
- `src/lib/store.ts`：使用者狀態（localStorage `eatwhat.v1`），`useT()` 回傳 `t('中文','English')`。
- `src/lib/room.ts`：揪團投票房。測試版存 localStorage＋BroadcastChannel，只在同一個瀏覽器的分頁之間同步；每個分頁算一個人（sessionStorage）。正式版換 Durable Object，介面不變。
- `src/lib/router.ts`：hash 路由（`#/decide`、`#/explore`、`#/r/<id>`、`#/group?add=<id>`、`#/room/<code>?c=<ids>&t=<title>`、`#/swipe`、`#/me`）。
- `src/screens/*`：決定、探索（列表＋Leaflet/OSM 地圖）、店家頁、揪團（開房＋投票房）、滑卡、我的。

## 坑
- Windows Server 的 emoji 字型缺新版 emoji（🫕、🫓 會變方框），料理圖示只用舊的 emoji。
- 字串拆 emoji 不能用 `.split('')`（會拆壞代理字元），要寫成陣列。
- 內建瀏覽器隱藏時截圖會落後一張，連拍兩次確認。
- 正式版接 Google Places 時，地圖必須改用 Google 地圖（條款不准把 Places 資料畫在別家地圖上）。
