# Market Pulse Board

一個可同時查看美股四大指數、台股指數、台股個股的金融資訊網站。

## 技術棧

- Frontend: Vite + React + TypeScript + React Router + Tailwind CSS
- Chart: lightweight-charts
- Backend: Node.js + Express
- Deployment target: Vercel
- Data strategy: backend proxy + provider abstraction + demo fallback

## 功能

- 首頁顯示美股四大指數
- 首頁顯示台股主要指數
- 台股個股搜尋
- 自選股與最近搜尋紀錄
- 個股詳細頁 `/stock/:symbol`
- 走勢圖區間切換 `1D / 5D / 1M / 3M / 1Y`
- 資料來源狀態標記：`realtime`、`delayed`、`end-of-day`、`demo`
- 上游失敗時自動退回 demo fallback，並明確顯示 `DEMO DATA`

## 安裝

```bash
npm install
```

## 本機開發

```bash
npm run dev
```

- 前端頁面：http://localhost:5173
- 後端 API：http://localhost:8787

## Production 啟動

```bash
npm run build
npm start
```

`npm start` 會用 Express 提供 `dist/` 靜態頁面與 `/api/*` 路由。

## 環境變數

專案根目錄請放一個 `.env` 檔案。現在建議先用這一組：

```env
US_MARKET_PROVIDER=public
TW_MARKET_PROVIDER=public
CACHE_TTL_SECONDS=600
```

如果你要完整版本，可以用：

```env
PORT=8787
US_MARKET_PROVIDER=public
TW_MARKET_PROVIDER=public
US_API_KEY=
TW_API_KEY=
CACHE_TTL_SECONDS=600
```

### 每個變數是做什麼的

- `US_MARKET_PROVIDER=public`
  - 美股資料使用公開來源 provider
  - 現在主要用在美股四大指數
  - 不需要 API key

- `TW_MARKET_PROVIDER=public`
  - 台股資料使用公開來源 provider
  - 現在主要用在台股指數、台股個股摘要、歷史圖與搜尋
  - 不需要 API key

- `CACHE_TTL_SECONDS=600`
  - 後端快取秒數
  - `600` 代表快取 10 分鐘
  - 可減少重複打外部資料源

- `PORT=8787`
  - 本機後端啟動的埠號
  - 在 Vercel 上通常不需要自己設定

- `US_API_KEY` / `TW_API_KEY`
  - 目前預設 `public` provider 不需要
  - 之後如果接正式授權資料源，可以把 key 放這裡

## 本機要怎麼設定

1. 在專案根目錄建立 `.env`
2. 填入以下內容：

```env
US_MARKET_PROVIDER=public
TW_MARKET_PROVIDER=public
CACHE_TTL_SECONDS=600
```

3. 啟動開發環境：

```bash
npm run dev
```

## Vercel 要怎麼設定

部署到 Vercel 時，不是上傳 `.env` 檔，而是在 Vercel 專案設定裡加入環境變數。

路徑：

`Project Settings` → `Environment Variables`

請新增這三筆：

```env
US_MARKET_PROVIDER=public
TW_MARKET_PROVIDER=public
CACHE_TTL_SECONDS=600
```

### Vercel 設定重點

- Framework Preset: `Vite`
- Install Command: `npm install`
- Build Command: `npm run build`
- Output Directory: `dist`
- 不要手動加 `NODE_ENV=production`，避免部署時跳過 `devDependencies` 導致找不到 `vite`

## Provider 切換

目前支援兩種 provider：

- `public`
  - 使用公開來源資料
  - 適合現在直接上線測試

- `demo`
  - 使用展示資料
  - 當上游失敗時也會 fallback 到這個模式

如果你想強制進入 demo mode，可以這樣設：

```env
US_MARKET_PROVIDER=demo
TW_MARKET_PROVIDER=demo
```

## API 路由

- `GET /api/market/summary`
- `GET /api/us/index/:id`
- `GET /api/tw/index/:id`
- `GET /api/tw/stock/search?q=`
- `GET /api/tw/stock/:symbol`
- `GET /api/tw/stock/:symbol/history?range=1M`

所有 API 都統一回傳：

- `success`
- `data`
- `source`
- `freshness`
- `updatedAt`
- `error`

## Vercel 部署

1. 把專案推到 GitHub
2. 到 Vercel 匯入 repo
3. 設定環境變數
4. 點 `Deploy`

部署完成後可測：

- `/`
- `/stock/2330`
- `/api/market/summary`
- `/api/tw/stock/2330`

## 已知限制

- 預設不是官方逐筆即時行情
- 公開資料源可能有延遲
- 部分區間資料受上游來源限制
- 若外部資料源異常，系統會改用 demo fallback，避免整站失效

## 未來換成正式授權資料源

如果之後要改成正式 provider，只需要：

1. 在 `server/providers/` 新增新的 provider
2. 在 `server/providers/index.ts` 接上環境變數切換
3. 保持前端 API 與型別不變

這樣可以在不大改前端的情況下替換資料源。
