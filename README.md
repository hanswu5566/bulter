# Butler. - 智慧租屋

Butler 是一個利用 Gemini AI 驅動的，旨在提供「AI 驅動的智慧租屋體驗」的平台。解決租屋市場中「資訊隱瞞」、「信任成本高」與「看房效率低下」的核心痛點。

## 核心功能

1.  **AI 對話面試 (Butler Interview)**: 透過首頁與 AI 管家對話，自動採集租屋意圖並標籤化，實現智慧匹配。
2.  **零摩擦遷移 (591 Migration)**: 貼上 591 網址或上傳 App 截圖，Gemini 自動 OCR 並結構化房源資料。
3.  **AI 實地看房清單 (On-site Checklist)**: 看房時由管家引導檢查水壓、隔音等細節，並透過 Gemini 視覺分析圖片瑕疵。
4.  **智慧匹配分數 (Match Score)**: 根據您的生活習慣與房源真實數據，由 AI 計算最適合您的房源。
5.  **信任事實回流 (Trust Loop)**: 房客實勘後的回報數據會更新至房源特徵，建立透明的租屋信任體系。
6.  **語意房源檢索 (Semantic Search)**: 用一句白話描述需求，系統以向量檢索找出語意最接近的房源，再套用既有的剛性條件評分排序。

## 技術棧

- **Frontend**: Next.js 14+ (App Router), React 18+
- **Styling**: Tailwind CSS, Material 3 Design Guidelines
- **AI Engine**: Gemini 2.5 Flash Lite (生成與視覺), gemini-embedding-001 (向量檢索)
- **ORM**: Prisma with PostgreSQL
- **Vector Search**: pgvector, 768 維 cosine HNSW 索引
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

## 語意檢索與檢索品質評估

房源在寫入時會產生一組 768 維向量（`gemini-embedding-001`），存在 `Listing.embedding`，並以 pgvector 的 cosine HNSW 索引支撐 `POST /api/listings/search`。

**1. 建立向量欄位與索引**

```bash
bun prisma migrate deploy
```

這會啟用 `vector` extension、建立 `Listing.embedding` 欄位與 `Listing_embedding_cosine_idx`。

**2. 回填既有房源**

只補沒有向量的房源：

```bash
bun run scripts/backfill-embeddings.ts
```

換過文字組成策略之後要整批重建，否則同一個索引裡會混到不同策略產生的向量，距離就失去意義：

```bash
bun run scripts/backfill-embeddings.ts --all --strategy=narrative
```

**3. 量測檢索品質**

這個專案沒有點擊紀錄可以當標準答案，所以評估題目是從房源本身生成的：對每一則房源請模型寫一句租客可能會打的搜尋句，並把該房源當作唯一正解。生成時刻意不給地址、要求換句話說，避免模型抄原文而讓每種策略都拿滿分。

```bash
bun run scripts/eval/generate-golden-set.ts --size=40
bun run scripts/eval-retrieval.ts
```

輸出會列出三種文字組成策略（`spec` / `spec_features` / `narrative`）在同一份語料與同一組題目下的 recall@1/3/5/10 與 MRR。加上 `--live` 會把同樣的題目丟進真正的 pgvector 查詢，用來確認線上索引跟離線排序的結果一致。

向量會快取在 `scripts/eval/.embedding-cache.json`，所以反覆調整策略時只會為真正變動的文字付費。

## 視覺設計

- **背景色**: 奶油白 (`#FFFDD0`)
- **主色**: 陶土紅 (`#D2691E`)
- **文字色**: 深炭灰 (`#333333`)
- **組件**: 遵循 Material 3 的 8dp 網格與 16dp 圓角規範。

---

*Powered by Gemini AI*
# Butler

