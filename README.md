# Hidden North — 官方網站

Hidden North 株式会社（北海道旭川）的官方網站。多頁式、三語（日本語預設／繁體中文／English）、純靜態（無後端、無建置步驟），部署於 Vercel。

---

## 頁面結構

| 檔案 | 說明 |
|---|---|
| `index.html` | 首頁（Hero、理念、兩種旅行方式、精選行程、理由、CTA） |
| `about.html` | 會社情報（事業內容、会社概要、代表挨拶、聯絡）— 銀行審查用內容 |
| `tours.html` | 募集行程列表（可依一日／二日篩選） |
| `tour.html?id=<id>` | 行程詳情 + 預約元件（日期、人數、即時小計） |
| `custom.html` | 客製化行程洽詢（表單，demo 送出） |
| `checkout.html` | 結帳流程（確認 → 聯絡資料 → 付款）|
| `confirmation.html` | 預約完成 |
| `admin.html` | **行程後台**（維護行程／價格／圖片，密碼保護） |

**共用程式**：`site.js`（三語 i18n 引擎 + 注入式頁首／頁尾 + 捲動浮現 + `window.HN` 工具）、`catalog.js`（行程卡片與列表）、`tour.js`、`custom.js`、`checkout.js`、`confirm.js`、`admin.js`。
**內容資料**：`data/tours.json`（行程）、`data/i18n.json`（介面文字三語）。

## 本機預覽

```bash
python3 -m http.server 8130    # 然後開 http://localhost:8130
```

---

## 維護方式（給非工程人員）

### A. 用後台維護行程（推薦）
1. 開 `網址/admin.html`，輸入密碼（預設 `hidden-north`，可在 `admin.js` 最上方 `PASS` 修改）。
2. 新增／編輯／刪除行程，切換 繁中／日本語／EN 分別填寫。
3. 按 **「匯出 tours.json」** 下載檔案 → 覆蓋專案中的 `data/tours.json` → push 到 GitHub（Vercel 會自動重新部署）。
4. 進階欄位（相簿、亮點、逐時行程、費用含／不含）在後台下方的 JSON 區塊編輯。

> 編輯中的內容會暫存在該瀏覽器；按「重新載入」會捨棄草稿、重抓線上檔案。

### B. 直接改檔案
- 行程內容：`data/tours.json`
- 介面文字（選單、按鈕、表單標籤等）：`data/i18n.json`
- 首頁／會社情報的長段落文案：直接在對應 HTML 的 `.lang-ja` / `.lang-zh` / `.lang-en` 區塊

### 圖片
行程圖片放 `assets/tours/`，於 `tours.json` 的 `image` / `gallery` 指定路徑。建議 3:2、每張 ≤300KB。目前 `t1–t6.jpg` 為以官網照片裁切的**暫用示意圖**，請替換為實際行程照片。

---

## ⚠️ 上線前必做（依賴下週取得的旅行業登録號）

1. **行程與價格**：目前為**範例**，請以後台替換為真實方案、價格、日期、照片。頁面上的「範例／登録中」提示文字在 `data/i18n.json` 的 `notice.*`。
2. **付款金流（Square）**：目前為**可測試的 demo**，不會實際扣款。接上 Square 的步驟見 `checkout.js` 檔尾的說明：
   - 載入 Square Web Payments SDK；
   - 以 `payments.card()` 取代 demo 卡號欄位；
   - 實作 `SquarePaymentAdapter.charge()`，呼叫**你的伺服器端**（serverless function）建立付款；
   - 將 `checkout.js` 中 `var Payment = DemoPaymentAdapter;` 改為 `SquarePaymentAdapter`。
   - 需要 Square 的 Application ID / Location ID 與一個後端端點（Vercel Functions 可）。
3. **取得登録號後**：於 `about.html` 事業內容與会社概要補上登録番號，並移除／調整 `notice.registration`、`notice.demo`、`notice.sample`。
4. **表單送信**：客製化洽詢與結帳目前不送到任何後端。上線前請接上 email/API（`custom.js` 與 `checkout.js` 內有標註位置）。
5. **後台安全**：`admin.html` 的密碼為前端簡易保護，非真正的安全機制。正式上線建議改用 Vercel 的 Password Protection 或驗證代理保護此頁。

## 部署

Vercel（Framework：Other，無 Build 指令，輸出為根目錄）。推到 `main` 後自動部署。`vercel.json` 已設定 `cleanUrls` 與 `assets` 快取。
