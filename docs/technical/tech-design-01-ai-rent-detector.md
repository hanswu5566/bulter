# 技術設計文件 (Tech Design)：AI 租屋探照燈 (MVP 1)

## 1. 系統架構概述 (System Architecture Overview)

本產品採用「寄生式 UI」架構，主要由 Chrome 擴充功能（前端）與 Next.js 後端 API 組成，並深度整合 Google Gemini API 與 Google Maps API。

*   **Frontend**: Chrome Extension (Manifest V3) - 負責網頁數據抓取與 UI 注入。
*   **Backend**: Next.js API Routes - 負責處理業務邏輯、快取與調用外部 API。
*   **AI Engine**: Google Gemini 1.5 Flash - 負責文本結構化與圖片視覺分析。
*   **Geo Services**: Google Maps API - 負責計算真實通勤時間。
*   **Database**: Prisma + PostgreSQL - 儲存用戶配置與房源快取數據。

---

## 2. Chrome Extension 設計 (Client-Side)

擴充功能將專注於 591 租屋網與 Facebook 租屋社團，採用 Manifest V3 規範。

### 2.1 數據抓取引擎 (Content Script: `content.js`)
*   **觸發時機**：當用戶瀏覽 591 詳情頁、591 列表頁、或 FB 社團貼文時。
*   **抓取策略**：
    *   **591 詳情頁**：優先抓取 `window.__NUXT__` 中的結構化 JSON 數據（若存在）。為防範宿主網站頻繁改版（DOM 脆弱性），後備策略為**直接截取整頁純文字 (`document.body.innerText`)** 送回後端，利用 LLM 進行無語境結構化提取，降低對特定 DOM 結構的依賴。
    *   **FB 社團**：抓取貼文的純文字內容與附加圖片的 URL。
*   **防爬蟲對策**：完全基於用戶主動瀏覽的行為觸發，不進行背景自動輪詢，降低被平台封鎖的風險。

### 2.2 注入式 UI (Injectable Overlay)
*   **列表頁注入**：在 591 搜尋列表的每個房源卡片上，注入極少量的「例外過濾標籤」（如頂加、租期限制），絕不重複 591 已有標籤。
*   **詳情頁注入**：在頁面最上方注入全螢幕寬度的 **黃金分割警告橫幅 (The Instant Verdict Banner)**，給予『勸退/提示/推薦』指令；並在原文進行**語義消音（Semantic Dimming）**與高亮。
*   **技術實現**：使用 Shadow DOM 隔離樣式，避免被宿主網站（591）的 CSS 污染。

---

## 3. 後端 API 設計 (Server-Side)

後端主要提供一個核心端點供 Extension 調用。

### 3.1 核心 API：`POST /api/extension/analyze`
*   **功能**：接收 Extension 抓取到的原始數據，進行分析並返回結構化報告。
*   **Request Payload**:
    ```json
    {
      "platform": "591" | "facebook",
      "url": "string",
      "rawText": "string", // 包含描述、電費等文字
      "images": ["string"], // 圖片 URL 陣列
      "userPreferences": {
        "workAddress": "string", // 用戶公司地址
        "budgetLimit": 20000
      }
    }
    ```
*   **處理流程 (Pipeline)**:
    1.  **Cache Check**：檢查資料庫中是否已有該 URL 的近期分析結果，若有則直接返回。
    2.  **Commute Calculation**：調用 Google Maps Distance Matrix API，計算從房源地址到 `workAddress` 的大眾運輸時間。
    3.  **AI Text Analysis**：將 `rawText` 送至 Gemini 1.5 Flash，進行費用提取、法規合規性檢查（電費、補貼）與風險識別。
    4.  **AI Vision Analysis (P1)**：將圖片 URL 送至 Gemini Vision，分析採光與屋況（可非同步處理或延遲載入）。
    5.  **Save Cache**：將分析結果存入 PostgreSQL。

*   **Response Payload**:
    ```json
    {
      "matchScore": 85,
      "estimatedTotalCost": {
        "rent": 15000,
        "electricity": "夏季約 1500/月 (一度6元，注意可能超收)",
        "management": 1000,
        "isCompliant": false
      },
      "commuteTime": {
        "duration": 25,
        "isFakeMrt": false
      },
      "risks": [
        { "type": "頂加", "severity": "HIGH", "content": "描述提及頂樓獨立空間，疑似頂加。" }
      ],
      "visionInsight": {
        "hasWindow": true,
        "lighting": "GOOD"
      }
    }
    ```

---

## 4. AI Prompt 設計 (Gemini 1.5 Flash)

這是產品的核心競爭力，我們需要設計高精準度的 Prompt。

### 4.1 文本分析 Prompt (文字段落解析)
```text
你是一位台灣租屋市場的法律與數據專家。
請從以下租屋描述中，提取關鍵數據並識別風險。

【分析規則】：
1. 提取租金、電費（一度幾元）、水費。
2. 檢查電費是否超過台電當期最高級距（夏季約 7.69 元，非夏季約 6.03 元），若超過或寫死高價，請標記 isCompliant: false。
3. 檢查是否提及「不可補貼」、「不可報稅」，若有請標記為高風險。
4. 識別台灣特有風險術語：頂加、魔術空間（夾層）、獨立露台（疑似頂加）、防火巷外推。
5. 識別 FB 詐騙話術：要求看房前先付定金/押金。

【回傳格式】：嚴格的 JSON 格式（如 API 設計所示）。
```

---

## 5. 資料庫 Schema 擴展

我們將沿用現有的 `Listing` 模型，但需要確保以下欄位被正確使用或擴展以支援快取：

```prisma
// 現有 Listing 模型中需重點使用的欄位
model Listing {
  id            String    @id @default(cuid())
  sourceUrl     String?   @unique // 用於 API 判斷快取
  rawScrapedData Json?    // 儲存原始抓取的資料
  butlerInsight Json?     // 儲存 AI 生成的診斷報告 (JSON 格式)
  createdAt     DateTime  @default(now())
}
```

---

## 6. 執行階段與里程碑 (Milestones)

配合 Roadmap 的 Horizon 1，技術開發分為以下階段：
1.  **Sprint 1**：完成 `content.js` 在 591 詳情頁的 DOM 抓取與基本的側邊欄 UI 注入。
2.  **Sprint 2**：完成 `/api/extension/analyze` 後端 API，串接 Gemini 進行文本分析與電費合規檢查。
3.  **Sprint 3**：整合 Google Maps API，實現真·通勤時間計算。
4.  **Sprint 4**：加入 Gemini Vision 照片診斷（P1 需求）。

eof
