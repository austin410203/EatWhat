# EAT WHAT 吃什麼（網頁＋原生 iOS App）

規劃書：`Gaming/Company/proposals/2026-10-30_eatwhat/PLAN.md`。真實店家來自使用者的 Google 地圖收藏，由後台資料庫維護（見「餐廳資料庫」）。

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
- 網頁＋App 圖示（2026-11-03 改版，ChatGPT 生成：深藍門簾＋米色底＋藍白條紋飯碗，食堂風；舊版是番茄橘底）：原圖 `_art/app_icon_source.png` → `public/favicon.ico`（16/32/48）、`favicon.png`（64 圓角）、`apple-touch-icon.png`（180 滿版）、`icon-192/512.png`＋`manifest.webmanifest`。ChatGPT 圖片：內建瀏覽器會擋 clipboard 寫入，改用圖片檢視器右上角的下載鍵（存到 ~/Downloads）；Chrome 擴充可用「頁面注入按鈕＋navigator.clipboard」＋clip_watch（門檻 1000）。
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
- 手機（`isMobile()`：pointer coarse 或 iPhone/Android UA）一開就用手機定位：新使用者按「開始使用」直接要權限（使用者手勢，iOS 才會跳）；之後每次開 App `startupLocate()`：已授權→默默更新、被拒絕→不再問、還沒問過→跳 `LocationAsk` 說明（同一分頁只問一次，sessionStorage `eatwhat.askedLocation`）。桌機維持原本（按「使用我的位置」才問）。
- `src/components/Location.tsx`：決定頁右上位置膠囊（重新定位／改回測試位置）、還沒定位時的提示卡、人在台北 20 km 外時的提醒。
- 瀏覽器只在 HTTPS／localhost 給定位。之後包 iOS App 要改用 Capacitor Geolocation，並在 Info.plist 加 NSLocationWhenInUseUsageDescription。
- 預覽測試：在 console 蓋掉 `navigator.geolocation.getCurrentPosition` 模擬成功／拒絕。內建瀏覽器預設拒絕定位；要測啟動流程可 `await import('/src/lib/store.ts')` 拿 setState，蓋掉 `navigator.permissions.query` 後把 onboarded 切 false→true 重跑。

## 餐廳資料庫（後台，2026-11-03 起）
- 店家資料不在程式裡：Worker KV（binding `EDITS`，namespace `eatwhat-edits`）key `places` = `{ ver, list }`。網頁和 iOS App 開啟、回到前景時 `loadPlaces()` 讀 `GET /api/places`（ETag `"v<ver>"`，沒變回 304），存 localStorage `eatwhat.places`；離線／本機 vite 沒 Worker 時用快取，再不行用打包的 `src/data/saved.json`。
- KV 還沒資料時，Worker 用打包的 saved.json＋舊 `edits`（分類／價格修改）當起始資料，第一次寫入才存進 KV。**之後 saved.json 只是離線備援**，重跑 build_saved.py 不會改到線上資料。
- API（`worker/index.js`，寫入要 Bearer 管理員密碼）：`POST /api/places` 新增（id = `n` + 時間 36 進位）、`PUT /api/places/<id>` 修改（可只送部分欄位）、`DELETE /api/places/<id>`、`PUT /api/photo/<id>` 上傳照片（jpeg/png/webp ≤3 MB，App 先縮 900 px JPEG）→ KV `photo:<id>`，`GET /api/photo/<id>`；`POST /api/admin/check`。`/api/*` 都有 CORS（iOS App 從 capacitor://localhost 呼叫）。
- 後台 UI：「我的 → 設定 → 管理員 → 管理餐廳」= `#/admin`（`src/screens/AdminPlaces.tsx`）：搜尋、新增、編輯（貼 Google 地圖網址自動填座標、用目前位置、營業時間文字格式 `11:30-14:00, 17:30-21:00`、空白＝公休、跨夜 `18:00-02:00`）、上傳照片、刪除。店家頁的「修改分類／價格」快速修改也走 `PUT /api/places/<id>`。
- 密碼只存雜湊：wrangler `vars.ADMIN_SALT` / `ADMIN_HASH` = SHA-256(salt + 密碼)。密碼在 `_data/admin_password.txt`（不進 git）。
- 本機測 Worker：`npx wrangler dev --port 8811 --ip 127.0.0.1 --var ADMIN_SALT:testsalt --var ADMIN_HASH:<sha256(testsalt+測試密碼)>`（KV 是本機模擬，不會動到正式資料；8798/8799 這台常被別的程式佔用）。
- 店家 id：Google 收藏是 `g` + cid 36 進位，後台新增的是 `n…`。

## iOS App（原生 SwiftUI，2026-11-06 起；取代 Capacitor 殼）
- `native/`：`project.yml`（XcodeGen，bundle `com.austin410203.eatwhat`、iOS 17、只做 iPhone、直向、版本 1.1）、`Sources/*.swift`、`Resources/`（Art/icons 料理插圖 webp、Art/photos 示意照片、saved.json 離線備援、place_photos.json 署名、AppIcon、PrivacyInfo）。`EatWhat.xcodeproj`／`Info.plist` 由 XcodeGen 產生，不進 git。
- 和網頁同一個後台：`API.base = https://eat.emptyoffice.app`，開 App／回前景讀 `/api/places`（ETag），快取在 Application Support/places.json；照片 `/api/photo/<id>?v=` 或 `/img/places/<id>.jpg`（ImageStore 磁碟快取），讀不到用料理示意圖。Cloudflare 會擋 Python UA，CFNetwork UA 沒問題。
- 畫面：決定（骰子抽 5 家／換一家／就決定是你了 → Apple 或 Google 地圖導航）、探索（列表＋MapKit 地圖、搜尋、排序）、揪團（**傳手機輪流投票**，不需伺服器；店家頁「加入投票」加候選）、滑卡（口味分數）、我的（收藏／吃過／不想再去、定位、管理員登入→管理餐廳）。只有中文介面。
- 邏輯 `Logic.swift` 是 `src/lib/logic.ts` 的移植（可信分數、營業時間、篩選、加權抽選、營業時間文字解析、Google 地圖網址取座標）。改規則兩邊都要改。
- 管理員密碼存 Keychain；後台編輯器 `PlaceEditor`（照片 PhotosPicker 縮 900 px JPEG）。
- 本機沒有 Mac：Swift 語法可用 Docker `swift:6.2-noble` 跑 `swiftc -parse native/Sources/*.swift`；Models+Logic 可在 Linux 編譯測試（CoreLocation 用一行 struct 代替）。SwiftUI 只能靠 CI。
- 坑：doc 註解裡寫 `icons/*.webp` 會開巢狀註解；`if let (a, b) = 可選元組` 不合法（用 `.0/.1`）。
- 雲端建置：`.github/workflows/ios.yml` 手動 Run workflow → XcodeGen → 模擬器建置 → 7 頁截圖推到 `native-ci` 分支（`git fetch origin native-ci` 後看 shots/*.png、*.log）；勾 testflight 再 Archive＋Xcode 雲端簽章＋上傳（build 號 = 100 + run_number）。**跑之前 repo 要先改公開、跑完改回私人**（公司規則，私人 repo 的 macOS 額度已用完）。
- App Store Connect App ID 6830219160（吃什麼 EAT WHAT），TestFlight 內部群組「內部測試」（自動派發）。Secrets：APPLE_TEAM_ID、ASC_KEY_ID=2VJNPQU64M（Admin，和果凍世界共用）、ASC_KEY_P8；ASC_ISSUER_ID 打錯名字，workflow 有預設值。團隊在 Apple 3 張發佈憑證上限，只能用雲端簽章。舊的 Capacitor 版 build 1–4 已在 TestFlight。
- 網頁版仍是 Vite＋React（`src/`），`@capacitor/*` 套件留著不影響網頁。

## 店家照片（Google，已離線）
- 2026-10-31 使用者決定：App 自用，從 Google Places 每家抓一張照片存起來，之後**關掉 Places API、刪掉金鑰**（Google Cloud 專案「EAT WHAT」my-project-1542392540958）。執行期不再呼叫任何 Google API。
- 照片：`public/img/places/<店家 id>.jpg`（900 px 寬，約 42 MB／348 張）；署名：`src/data/place_photos.json`（author、uri）。`src/lib/officialPhoto.ts` 的 `placePhoto(r)`；`<Cover>` 有照片就用，高度 ≥120 的封面右下角顯示「拍攝者 · Google Maps」，列表小縮圖不放署名。
- 對應：`_data/resolve_place_ids.py`（店名＋地址＋座標 Text Search，150 m 內最近一家）→ `_data/place_ids.json`；`_data/fetch_photos.py` 抓照片。348/350 對上；Kohinoor（原址已是 Fumo，SKIP）、本願豆花店信義店（Google 上找不到）用示意圖。
- 要補新店的照片得重新開 Places API＋建金鑰放 `.dev.vars`（不進 git），跑完兩支腳本再關掉。Windows 命令列 curl 送中文查詢會變空結果，一律用 `python -X utf8`。
