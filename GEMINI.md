# AI House Rent - 智慧租屋管家平台

AI House Rent 是一個利用 Gemini AI 驅動的「智慧租屋管家」平台。解決租屋市場中「資訊隱瞞」、「信任成本高」與「看房效率低下」的核心痛點。

## 項目概述 (Project Overview)

本項目是一個基於 Next.js 16 (App Router) 與 React 19 的現代化 Web 應用，深度集成了 Google Gemini 1.5 Flash API。它為房客提供智慧化的房源匹配與看房引導，為房東提供自動化的房源管理與優化建議。

### 核心功能

1.  **AI 對話面試 (Butler Interview)**: 透過首頁與 AI 管家對話，自動採集租屋意圖並標籤化，實現智慧匹配。
2.  **零摩擦遷移 (591 Migration)**: 貼上 591 網址或上傳 App 截圖，Gemini 自動 OCR 並結構化房源資料。
3.  **AI 實地看房清單 (On-site Checklist)**: 看房時由管家引導檢查水壓、隔音等細節，並透過 Gemini 視覺分析圖片瑕疵。
4.  **智慧匹配分數 (Match Score)**: 根據您的生活習慣與房源真實數據，由 AI 計算最適合您的房源。
5.  **信任事實回流 (Trust Loop)**: 房客實勘後的回報數據會更新至房源特徵，建立透明的租屋信任體系。

## 技術棧 (Tech Stack)

- **Frontend**: Next.js 16+, React 19+
- **Styling**: Tailwind CSS 4, Material 3 Design Guidelines
- **AI Engine**: Gemini 1.5 Flash API (`@google/generative-ai`)
- **ORM**: Prisma 7+ with PostgreSQL
- **Auth**: NextAuth.js v5 (Beta)
- **i18n**: `next-intl` (支持 `en`, `zh-TW`, `ja`, `zh-CN`)
- **Asset Storage**: Google Cloud Storage (GCS)
- **Image Processing**: `sharp` (用於圖片最佳化與 WebP 轉換)

## 項目結構 (Project Structure)

- `src/app/[locale]`: 多語言 App Router 路由。
- `src/components`: React 組件庫，包括全局 `AIButler` 和 `ChatWindow`。
- `src/lib`: 核心邏輯層。
    - `ai.ts`: 所有 Gemini API 調用邏輯（文本提取、匹配診斷、視覺分析）。
    - `db.ts`: Prisma Client 實例。
    - `storage.ts`: GCS 上傳與圖片處理邏輯。
- `prisma/schema.prisma`: 數據庫模型定義。
- `messages/`: 多語言翻譯文件 JSON。

## 開發規範 (Development Conventions)

### 1. 國際化 (i18n)
項目使用 `next-intl`。新增頁面或組件時，請確保文案定義在 `messages/` 目錄下，並使用 `useTranslations` 或 `getTranslations` 獲取。

### 2. AI 邏輯
所有 AI 相關的操作應集中在 `src/lib/ai.ts` 中。調用 Gemini API 時請注意：
- 使用 `MODELS.STANDARD` (`gemini-3-flash-preview`) 進行複雜推理。
- 使用 `MODELS.LITE` (`gemini-3.1-flash-lite-preview`) 進行快速對話。
- 使用 `MODELS.VISION` 進行圖片分析。

### 3. UI 設計
遵循 Material 3 規範：
- **背景色**: 奶油白 (`#FFFDD0`)
- **主色**: 陶土紅 (`#D2691E`)
- **文字色**: 深炭灰 (`#333333`)
- **佈局**: 使用 8dp 網格與 16dp 圓角。

### 4. 資料庫
每次修改 `prisma/schema.prisma` 後，請執行：
```bash
bun prisma generate
bun prisma migrate dev --name <description>
```

## 快速啟動 (Quick Start)

### 1. 安裝依賴
```bash
bun install
```

### 2. 環境變數
確保 `.env` 文件包含以下核心變數：
- `DATABASE_URL`: 例如 `postgresql://postgres:password123@localhost:5433/ai_house_rent`
- `GEMINI_API_KEY`: Google AI Studio API Key
- `AUTH_SECRET`: NextAuth 密鑰
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`: Google OAuth
- `GCP_PROJECT_ID`, `GCP_CLIENT_EMAIL`, `GCP_PRIVATE_KEY`: 用於 GCS 上傳

### 3. 本地資料庫設定 (Docker)
可以使用項目提供的腳本快速啟動本地 PostgreSQL（默認端口 5433）：
```bash
./setup_db.sh
```

### 4. 啟動開發伺服器
建議使用 `start_dev.sh` 啟動，它會自動清理舊進程、驗證環境變數並生成 Prisma Client：
```bash
./start_dev.sh
```
或者手動執行：
```bash
bun prisma generate
bun dev
```

---
*Powered by Gemini AI*
