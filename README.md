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

**API**：`api/create-payment.js`（Square 付款）、`api/admin.js`（商品後台：讀取／發佈到 GitHub）。皆為 Vercel Functions。`tour-schema.js` 為後台與 API 共用的資料檢查規則。

**共用程式**：`pricing.js`（報名規則與計價，前端與 API 共用——金額一律由伺服器依 `tours.json` 重算）、`payment-config.js`（付款模式設定）、`site.js`（三語 i18n 引擎 + 注入式頁首／頁尾 + 捲動浮現 + `window.HN` 工具）、`catalog.js`（行程卡片與列表）、`tour.js`、`custom.js`、`checkout.js`、`confirm.js`、`admin.js`。
**內容資料**：`data/tours.json`（行程）、`data/i18n.json`（介面文字三語）。

## 本機預覽

```bash
python3 -m http.server 8130    # 然後開 http://localhost:8130
```

---

## 維護方式（給非工程人員）

### A. 用商品後台（推薦，產品經理用這個）

網址：`https://hidden-north.jp/admin.html`

1. 輸入管理密碼登入。
2. 按「＋ 新增商品」（或選既有商品、或「複製成新商品」），照表單填寫：名稱、介紹、價格（可另設兒童價）、人數、出團日（每天／每週固定星期／指定日期、休團日、期間）、集合地點、飯店接送、照片、亮點、行程、費用含／不含、參加須知、結帳確認事項。
3. 文字欄位上方可切換 **繁中／日本語／EN**；翻成日文、英文時，欄位會淡淡顯示中文原文供參考，語言旁的紅字是尚未翻譯的欄位數。
4. 按「預覽商品頁」確認畫面。
5. 狀態選「上架中」，按右上角 **「發佈到網站」**，約 1 分鐘後網站更新。想暫時下架就改成「草稿」再發佈。

> 發佈時系統會自動檢查（必填欄位、價格、照片…），有問題會列出來，不會把壞掉的資料放上網站。若兩個人同時編輯，後發佈的人會收到提示，需重新載入後再改。

**首次設定（工程人員，一次即可）**：Vercel → Project → Settings → Environment Variables 新增

| 變數 | 內容 |
|---|---|
| `ADMIN_PASSWORD` | 後台密碼（至少 8 字，只給內部人員） |
| `GITHUB_TOKEN` | GitHub fine-grained token：只授權此 repo，權限 **Contents: Read and write** |
| `GITHUB_REPO` | `KateJC71/HiddenNorthWebsite-Bank` |
| `GITHUB_BRANCH` | 網站部署的分支（預設 `main`） |

原理：後台把 `data/tours.json` 與新照片以一個 commit 寫進 GitHub → Vercel 自動重新部署。所有修改都有 git 歷史可查、可還原。未設定上述變數時，後台會進入「離線模式」，只能編輯後匯出 `tours.json`。

### B. 直接改檔案
- 行程內容：`data/tours.json`
- 介面文字（選單、按鈕、表單標籤等）：`data/i18n.json`
- 首頁／會社情報的長段落文案：直接在對應 HTML 的 `.lang-ja` / `.lang-zh` / `.lang-en` 區塊

### 圖片
行程圖片放 `assets/tours/`，於 `tours.json` 的 `image` / `gallery` 指定路徑。建議 3:2、每張 ≤300KB。目前 `t1–t6.jpg` 為以官網照片裁切的**暫用示意圖**，請替換為實際行程照片。

---

## ⚠️ 上線前必做（依賴下週取得的旅行業登録號）

1. **行程與價格**：目前為**範例**，請以後台替換為真實方案、價格、日期、照片。頁面上的「範例／登録中」提示文字在 `data/i18n.json` 的 `notice.*`。
2. **付款金流（Square）**：目前為**可測試的 demo**，不會實際扣款。串接步驟見下方「串接 Square」。
3. **取得登録號後**：於 `about.html` 事業內容與会社概要補上登録番號，並移除／調整 `notice.registration`、`notice.demo`、`notice.sample`。
4. **表單送信**：客製化洽詢目前以 mailto 送出；結帳在串接 Square 後會記錄於 Square 付款，但**確認信**尚未自動寄送，上線前請接上 email 服務。
5. **後台安全**：密碼由伺服器（`api/admin.js`）驗證，存在 Vercel 環境變數，不在程式碼裡。請使用夠長的密碼，人員異動時更換 `ADMIN_PASSWORD`。

## 行程資料欄位（`data/tours.json`）

基本欄位：`id`、`type`、`status`（`draft` 不會出現在網站上，也不能下單）、`order`、`price`（成人／每人）、`capacity {min,max}`、`title`、`summary`、`area`、`duration`、`image`、`gallery`、`highlights`、`itinerary`、`included`、`excluded`。

選用欄位（後台「進階 JSON」可編輯）：

| 欄位 | 作用 |
|---|---|
| `child: { price, label{ja,zh,en} }` | 開啟「成人／兒童」分開計價（例：雪樂園＋動物園） |
| `season: { from, to }` | 可預約的出團期間（YYYY-MM-DD），日期選單自動限制 |
| `weekdays: [0–6]` | 每週固定出團的星期（0＝週日、6＝週六）；客人改用下拉選單選日期 |
| `dates: [YYYY-MM-DD]` | 只在這些日期出團（設定後 `weekdays` 無效） |
| `closed: [YYYY-MM-DD]` | 休團日 |
| `meeting {ja,zh,en}` | 集合・解散地點，顯示於行程頁、結帳、完成頁 |
| `hotelPickup: true` | 結帳時詢問住宿飯店（例：酒藏巡禮） |
| `notes [ ]` | 「參加須知」列表 |
| `confirmations [ ]` | 結帳時必須勾選的確認事項（例：全員滿 20 歲） |

報名期限：出發日 3 天前（`pricing.js` 的 `LEAD_DAYS`）。

## 串接 Square

前端與 API 已實作完成，只需設定金鑰：

1. 於 Square Developer Dashboard 建立應用程式，取得 **Application ID**、**Location ID**、**Access Token**（先用 Sandbox）。
2. Vercel → Project → Settings → Environment Variables 新增：
   - `SQUARE_ACCESS_TOKEN`（**機密**，只能放這裡，絕不可寫進程式碼）
   - `SQUARE_LOCATION_ID`
   - `SQUARE_ENVIRONMENT` = `sandbox`（正式上線改 `production`）
3. 編輯 `payment-config.js`：`provider: 'square'`，填入 `squareApplicationId`、`squareLocationId`，`environment` 與上面一致。
4. 部署後用 Square Sandbox 測試卡（如 `4111 1111 1111 1111`）完成一筆，於 Square Dashboard 確認付款與備註（預約編號、行程、日期、人數、聯絡資料）。
5. 正式上線：改用 Production 的 ID／Token，`environment` 與 `SQUARE_ENVIRONMENT` 改為 `production`。

流程：瀏覽器以 Square Web Payments SDK 將卡片轉為一次性 token（卡號不經過本站）→ `POST /api/create-payment` → 伺服器檢查行程／日期／人數／確認事項、依 `tours.json` 重算金額 → 呼叫 Square Payments API。訂單資訊記錄在該筆付款的 `reference_id` 與 `note`。

> 尚未包含：自動寄送確認信、訂單資料庫、名額（庫存）管理。目前訂單以 Square Dashboard 的付款紀錄為準。

## 部署

Vercel（Framework：Other，無 Build 指令，輸出為根目錄）。推到 `main` 後自動部署。`vercel.json` 已設定 `cleanUrls` 與 `assets` 快取。
