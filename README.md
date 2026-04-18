# Market Pulse Board

一個可查看美股四大指數、台股主要指數、台股個股搜尋、自選股與個股走勢圖的金融資訊網站。

## 技術棧

- Frontend: Vite + React + TypeScript + React Router + Tailwind CSS
- Chart: lightweight-charts
- Backend: Node.js + Express
- Deployment target: Vercel static frontend + serverless API
- Data strategy: backend proxy + provider abstraction + demo fallback

## 功能概要

- 首頁同時顯示美股四大指數與台股主要指數
- 台股個股搜尋，支援代號與名稱關鍵字
- 自選股 localStorage 保存
- 個股詳細頁 `/stock/:symbol`
- 走勢圖支援 `1D / 5D / 1M / 3M / 1Y`
- 顯示最後更新時間、資料來源狀態、錯誤提示
- 上游資料失敗時會進入 demo fallback，並明確標示 `DEMO DATA`

## 專案結構

```text
/
  api/
  server/
    providers/
    routes/
    utils/
  shared/
  src/
    app/
    components/
    config/
    hooks/
    pages/
    services/
    styles/
    types/
```

## 安裝方式

```bash
npm install
```

## 開發模式啟動

```bash
npm run dev
```

- 前端網址: `http://localhost:5173`
- 後端 API: `http://localhost:8787`

## Production build / 啟動

```bash
npm run build
npm start
```

`npm start` 會在本機用 Express 提供 `dist/` 與 `/api/*` 路由。

## Vercel 部署架構

這個專案已整理成適合 Vercel 的形態：

- 前端：Vite build 輸出到 `dist/`
- API：`api/[...route].ts` 作為 Vercel serverless function 入口
- 共用商業邏輯：放在 `server/app.ts`、`server/routes/*`、`server/providers/*`
- SPA 路由：由 `vercel.json` 把 `/stock/:symbol` rewrite 到 `/index.html`

也就是說，在 Vercel 上不需要跑一整台長駐 Node server：

- 靜態頁面由 `dist/` 直接提供
- `/api/*` 由 Vercel Functions 執行

## Vercel 部署步驟

1. 把專案推到 GitHub
2. 到 Vercel 匯入該 repo
3. Framework Preset 選 `Vite`
4. Build Command 使用：

```bash
npm run build
```

5. Output Directory 使用：

```bash
dist
```

6. 加入環境變數：

```env
PORT=8787
US_MARKET_PROVIDER=public
TW_MARKET_PROVIDER=public
US_API_KEY=
TW_API_KEY=
CACHE_TTL_SECONDS=600
```

在 Vercel 上，`PORT` 不一定會真的被平台使用，但保留它可讓本機與其他平台一致。

## Provider 策略

目前內建兩類 provider 模式：

- `public`
  - 美股四大指數: Yahoo Finance public chart endpoint
  - 台股主要指數: Yahoo Finance public chart endpoint
  - 台股個股報價與歷史: Yahoo Finance public chart endpoint
  - 台股搜尋清單: TWSE OpenAPI + TPEx daily quotes catalog

- `demo`
  - 不連外，直接回傳 demo data
  - UI 會明確顯示 `DEMO DATA`

可透過環境變數切換：

```env
US_MARKET_PROVIDER=demo
TW_MARKET_PROVIDER=demo
```

## 沒有 API Key 時會怎麼運作

這個版本預設不需要 API key 就能啟動，因為走的是公開可取得資料來源。

在以下情況會進入 demo mode：

- 你手動把 provider 設成 `demo`
- 公開資料來源失敗
- 指定股票或圖表資料取不到

進入 demo mode 時：

- 不會偽裝成真實盤中資料
- 狀態 badge 會顯示 `DEMO DATA`
- README 與 UI 都會清楚提醒

## API 路由

- `GET /api/market/summary`
- `GET /api/us/index/:id`
- `GET /api/tw/index/:id`
- `GET /api/tw/stock/search?q=`
- `GET /api/tw/stock/:symbol`
- `GET /api/tw/stock/:symbol/history?range=1M`

所有 API 回傳格式統一包含：

- `success`
- `data`
- `source`
- `freshness`
- `updatedAt`
- `error`

## 已知限制

- 目前不是官方授權即時重分發版本，預設應視為 `delayed` 或 `demo`
- 台股與美股使用的公開資料來源在可用性與延遲程度上可能不同
- `1D` 與 `5D` 圖表在某些標的上可能會退回較粗粒度資料
- 搜尋清單優先來自官方公開清單，但價格與歷史資料目前走公開第三方延遲來源

## 未來換成正式授權資料源的方法

因為資料層已抽成 `server/providers/*`，後續可以：

1. 新增正式 provider，例如券商授權 feed 或付費市場資料
2. 在 `server/providers/index.ts` 依環境變數切換
3. 保持前端 API 與 UI 不變

## 驗證指令

```bash
npm run check
npm run build
```
