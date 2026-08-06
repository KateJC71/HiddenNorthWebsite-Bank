# Hidden North 株式会社 — 公司介紹網站

Hidden North株式会社（北海道旭川）的單頁公司介紹網站，供銀行開戶／融資審查時查閱。
定位「安靜的可信」：資訊清楚、層級分明、無促銷感。**不含商品、價格、預訂功能。**

- 網域：`hidden-north.jp`（信箱 `info@hidden-north.jp` 同網域）
- 雙語：日本語（預設）｜繁體中文，右上角切換（`localStorage` 記憶）
- 單頁滾動：Hero → 理念 → 事業內容 → 会社概要 → 代表挨拶 → 聯絡 → Footer

## 技術

純靜態網站，**無建置步驟、無後端、無表單**。

| 檔案 | 說明 |
|---|---|
| `index.html` | 單頁，日／中文案皆內嵌，`.lang-ja` / `.lang-zh` 控制顯示 |
| `styles.css` | 全部設計 token（顏色、字體、字級、間距）依交付規格 |
| `app.js` | 語言切換（唯一狀態 `lang: 'ja' | 'zh'`，預設 `ja`） |
| `assets/` | Logo SVG × 3、Hero 背景圖 |
| `vercel.json` | Vercel 靜態部署設定 |

## 本機預覽

```bash
python3 -m http.server 8000
# 開啟 http://localhost:8000
```

## 部署到 Vercel

1. 將此 repo 推上 GitHub（已完成）。
2. 到 [vercel.com](https://vercel.com) 用 GitHub 登入 → **Add New → Project → Import** 本 repo。
3. Framework Preset 選 **Other**，Build Command 留空，Output Directory 留空（根目錄即輸出）。
4. Deploy。之後綁定自訂網域 `hidden-north.jp`。

## 設計規格（摘要）

**色彩（全品牌四值）**
| 角色 | HEX |
|---|---|
| 墨黑 | `#141312` |
| 雪白 | `#FBFAF8` |
| 七竈紅（晝） | `#A5303A` |
| 七竈紅（夜） | `#C4444F` |

紅色只出現在三處：眉標＋編號＋重點線、Email CTA、Logo。照片上一律全白 Logo。

**字體（Google Fonts）**：Noto Serif/Sans JP・TC、Fraunces、DM Sans。

## ⚠️ 上線前檢查清單（銀行審查用）

1. **Hero 照片** — 目前使用 CSS 繪製的黑白山稜背景（非占位圖）。若業主提供滿版黑白風景照（美瑛丘陵／旭岳等），
   放入 `assets/`，並在 `styles.css` 的 `:root` 或 `.hero__bg` 設定：
   ```css
   .hero__bg { background-image: var(--hero-image); background-size: cover; background-position: center; }
   ```
   或直接在 `index.html` 給 `.hero__bg` 加上 `data-photo="true"` 並設 `--hero-image: url("assets/你的照片.jpg")`。
2. `info@hidden-north.jp` 已啟用可收發；網站掛在 `hidden-north.jp` 同一網域。
3. 会社概要與登記簿謄本（履歴事項全部証明書）內容完全一致（全形字元照抄）。
4. 日文由母語者過一輪敬語與商務表現。
5. 取得旅行業登錄後，於「事業內容」與「会社概要」補上登錄號。

## Logo 說明

`assets/symbol-*.svg` 為依品牌規格（山稜＋北極星、七竈紅）製作的臨時標誌，
若已有正式 Logo，直接以同名檔覆蓋即可（白版／彩色版／深色版）。
