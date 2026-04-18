# Production Rollout

## 現況

專案目前已改接台股官方資料，並補回美股四大指數。

- 個股資料：`/exchangeReport/STOCK_DAY_ALL`
- 指數資料：`/exchangeReport/MI_INDEX`
- 上櫃資料：`https://www.tpex.org.tw/www/zh-tw/afterTrading/dailyQuotes`
- 美股四大指數：Yahoo Finance chart endpoint
- Provider：`src/providers/hybrid-market-provider.js`

## 這版能做的事

- 顯示 TWSE 上市股票日成交資訊
- 顯示 TPEx 上櫃股票日行情
- 顯示加權指數日資料
- 顯示道瓊、Nasdaq、S&P 500、費半
- 用同一套前端 UI 看台股 watchlist 與焦點標的

## 這版不能宣稱的事

- 逐筆即時
- 零延遲
- 可下單等級報價

原因是台股這次接上的官方端點屬於日資料，而美股四大指數則來自另一個第三方來源。

## 下一步

1. 若要補更多指數，再新增更多 TWSE / TPEx 官方端點
2. 若要盤中資料，再找有正式授權的即時 feed
3. 若要下單，再另外串券商交易 API
