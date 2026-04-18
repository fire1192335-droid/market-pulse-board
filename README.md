# Market Pulse Board

一個可查看美股四大指數、台股主要指數、台股個股搜尋、自選股與個股走勢圖的金融資訊網站。

## 技術棧

- Frontend: Vite + React + TypeScript + React Router + Tailwind CSS
- Chart: lightweight-charts
- Backend: Node.js + Express
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
  src/
    app/
    pages/
    components/
    config/
    hooks/
    services/
    styles/
    types/
  server/
    providers/
    routes/
    utils/
  shared/
  public/
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

`npm start` 會用 Express 直接提供 `dist/` 內容與 `/api/*` 路由。

## 環境變數

請先建立 `.env`，內容可參考 `.env.example`：

```env
PORT=8787
US_MARKET_PROVIDER=public
TW_MARKET_PROVIDER=public
US_API_KEY=
TW_API_KEY=
CACHE_TTL_SECONDS=600
```

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
- `GET /api/market/us/index/:id`
- `GET /api/market/tw/index/:id`
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

## 我這次的合理假設

- 預設先做「公開延遲可用版」，不把官方授權即時資料當成前提
- 台股搜尋清單優先使用官方公開來源
- 沒有 API key 時仍要可啟動，因此內建 demo fallback
- SOX 仍保留在設定檔，可之後依 provider 支援狀況替換

## 驗證指令

```bash
npm run check
npm run build
```
