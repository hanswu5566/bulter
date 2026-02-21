# AI House Rent - 智慧租屋管家平台

AI House Rent 是一個利用 Gemini AI 驅動的「智慧租屋管家」平台。解決租屋市場中「資訊隱瞞」、「信任成本高」與「看房效率低下」的核心痛點。

## 核心功能

1.  **AI 對話面試 (Butler Interview)**: 透過首頁與 AI 管家對話，自動採集租屋意圖並標籤化，實現智慧匹配。
2.  **零摩擦遷移 (591 Migration)**: 貼上 591 網址或上傳 App 截圖，Gemini 自動 OCR 並結構化房源資料。
3.  **AI 實地看房清單 (On-site Checklist)**: 看房時由管家引導檢查水壓、隔音等細節，並透過 Gemini 視覺分析圖片瑕疵。
4.  **智慧匹配分數 (Match Score)**: 根據您的生活習慣與房源真實數據，由 AI 計算最適合您的房源。
5.  **信任事實回流 (Trust Loop)**: 房客實勘後的回報數據會更新至房源特徵，建立透明的租屋信任體系。

## 技術棧

- **Frontend**: Next.js 14+ (App Router), React 18+
- **Styling**: Tailwind CSS, Material 3 Design Guidelines
- **AI Engine**: Gemini 1.5 Flash API
- **ORM**: Prisma with PostgreSQL
- **Auth**: NextAuth.js v5 (Beta)
- **Deployment**: Google Cloud Run, Cloud SQL, Cloud Storage

## 快速啟動

1.  **安裝依賴**:
    ```bash
    bun install
    ```

2.  **環境變數**:
    複製 `.env.example` 並重新命名為 `.env`，填入您的 API Key 與資料庫連線資訊。

3.  **資料庫初始化**:
    ```bash
    bun prisma generate
    # 如果有資料庫連線，可以執行 migrate
    # bun prisma migrate dev
    ```

4.  **啟動開發伺服器**:
    ```bash
    bun dev
    ```

## 視覺設計

- **背景色**: 奶油白 (`#FFFDD0`)
- **主色**: 陶土紅 (`#D2691E`)
- **文字色**: 深炭灰 (`#333333`)
- **組件**: 遵循 Material 3 的 8dp 網格與 16dp 圓角規範。

---

*Powered by Gemini AI*
# bulter
