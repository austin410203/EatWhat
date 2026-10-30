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
- `src/components/Ico.tsx`：`<Ico>` 細線介面圖示（SVG path 表）、`<Art>` 3D 插圖圖示（`public/img/icons/*.webp`）。
- `src/lib/assets.ts`：圖示與示意照片路徑。每種料理 2 張照片（`public/img/photos/<料理>-1/2.jpg`），依店家編號輪流。

## 設計系統 v2（styles.css 開頭的 token）
暖白底 `#f6f4f0`、黑色主按鈕、番茄橘 `#ff5a2c` 點綴、照片主導卡片、浮動深色分頁列。字型 Plus Jakarta Sans（英數）＋ Noto Sans TC。

## 圖片產線（`_art/`）
- `prompts.py` → `prompts.json`：3 張圖示表（4×3、白底 3D 黏土風）＋ 11 張照片表（2×2 白色分隔線）。用 ChatGPT（使用者 Chrome，Go 方案）生成，「Copy image」→ `clip_watch.ps1`（只收寬 ≥1400 的剪貼簿圖，存 `raw/NN.png`；剪貼簿是所有 session 共用的）。
- `slice_icons.py`：從邊緣做 flood fill 去白底（圖示內部的白飯不會被挖掉），輸出 256px WebP。`slice_photos.py`：找白色分隔線切 4 張，960×640 JPG。
- `raw/` 原圖不進 git（約 30 MB）。
- 正式版接 Google Places 後，店家照片改用 Places Photos（要附作者署名），不能直接抓 Google 地圖上的照片。

## 坑
- Windows Server 的 emoji 字型缺新版 emoji（🫕、🫓 會變方框），料理圖示只用舊的 emoji。
- 字串拆 emoji 不能用 `.split('')`（會拆壞代理字元），要寫成陣列。
- 內建瀏覽器隱藏時截圖會落後一張，連拍兩次確認。
- 正式版接 Google Places 時，地圖必須改用 Google 地圖（條款不准把 Places 資料畫在別家地圖上）。
- class 名稱 `.round` 已被滑卡圓形按鈕用掉（display:grid; 寬 68px），封面圓角要用 `.cover.rounded`。
- CARTO 底圖現在要 API key（會蓋浮水印），地圖用 OSM 圖磚＋ `.leaflet-tile-pane` CSS 濾鏡降飽和。

## 部署
- GitHub 私有 repo `austin410203/EatWhat` → Cloudflare Workers `eatwhat`（push main 自動建置），網址 https://eat.emptyoffice.app 與 https://eatwhat.austin410203.workers.dev。
- 2026-10-30 起公開（使用者要求取消測試密碼），wrangler 只剩靜態 assets。要再上鎖就把 `Company/playbooks/templates/lab_lock/worker.js` 放回 `lock/`，wrangler 加回 `main`、`assets.binding: ASSETS`、`run_worker_first: true`、`vars.LAB_NAME`。
- 注意：公開後任何人都看得到 `saved.json`（使用者 Google 收藏的店名、分類、地址）。

## 我的 Google 收藏（真實店家）
- `src/data/places.ts`：`SAVED`（`saved.json`）＋ `DEMO`（假店家），`SOURCES[state.source]` 決定 App 用哪一組（「我的」頁可切換，預設 saved）。`BY_ID` 含全部。
- `_data/build_saved.py`：把 `_data/google_saved.json`（在使用者 Chrome 的 Google 地圖頁收集，不進 git）轉成 `src/data/saved.json`。只留臺北市、餐飲類；Google 分類 → 料理類別的規則在 RULES。
- 收集方式：Google 地圖 `entitylist/getlist`（`!4i500` 改成 `!4i3000` 一次拿完整清單、含座標地址）；分類／評分／營業時間／電話靠每家一次 `/maps/search/<店名 地址>` 頁裡預載的 `search?tbm=map` 結果（店家陣列 [11] 名稱、[13] 分類、[4][7] 評分、[4][8] 評論數、[4][2] 價位、[9] 座標、[178] 電話、[203] 營業時間）。
- 分類：`build_saved.py` 先套 OVERRIDES（人工確認），Google 給籠統分類（餐廳／小餐館／日本餐廳…）時先看店名；判斷不了的不收（skipped.txt 標 unclassified），不再預設成西式。
- 坑：連續查約 230 家後 Google 回 429 + 驗證碼（sorry 頁），**不要繞過**；隔一段時間再慢慢補。2026-10-30 這輪：338 家入庫，其中約 117 家只靠店名分類、沒有評分／營業時間；另有 129 家沒資料無法分類、13 家「已加星號」沒拿到座標，都還沒入庫（清單在 `_data/skipped.txt`）。
- 評分、評論數、營業時間是匯入當下的快照，正式版要改 Places API 即時查（條款不允許長期快取評分）。

## 定位
- `src/lib/location.ts`：`home()` = 裝置位置（state.location）或中山站（測試位置）；`distanceKm` 預設從 `home()` 算。`locate()` 跟瀏覽器要位置，`refreshIfGranted()` 在 App 啟動時若已授權就默默更新。
- `src/components/Location.tsx`：決定頁右上位置膠囊（重新定位／改回測試位置）、還沒定位時的提示卡、人在台北 20 km 外時的提醒。
- 瀏覽器只在 HTTPS／localhost 給定位。之後包 iOS App 要改用 Capacitor Geolocation，並在 Info.plist 加 NSLocationWhenInUseUsageDescription。
- 預覽測試：在 console 蓋掉 `navigator.geolocation.getCurrentPosition` 模擬成功／拒絕。

## 管理員修改（全站共用）
- `worker/index.js`：只處理 `/api/*`。`GET /api/edits` 全部修改；`PUT/DELETE /api/edits/<id>`（Bearer 管理員密碼）改／還原一家；`POST /api/admin/check` 驗密碼。資料存在 KV `eatwhat-edits`（binding `EDITS`）的單一 key `edits`。
- 密碼只存雜湊：wrangler `vars.ADMIN_SALT` / `ADMIN_HASH` = SHA-256(salt + 密碼)。密碼在 `_data/admin_password.txt`（不進 git）。
- App：`src/lib/api.ts`（loadEdits、adminLogin、saveEdit、resetEdit），`src/components/Admin.tsx`（「我的」登入列、店家頁「修改分類／價格」）。修改套用在 `places.ts` 的 `place()` / `placesOf()`。
- 店家 id 改成固定的 `g` + cid 36 進位（build_saved.py），重建資料或補新店都不會讓修改對錯店。舊的 g001 式 id 已作廢。
- 本機測 Worker：`npx wrangler dev --port 8799 --var ADMIN_SALT:testsalt --var ADMIN_HASH:<sha256(testsalt+測試密碼)>`（KV 是本機模擬，不會動到正式資料）。vite dev（5481）沒有 Worker，讀不到修改時沿用快取。
