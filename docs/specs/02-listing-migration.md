# Tech Spec 02: Listing & Migration Engine

## 1. Overview
本模組負責房源的資料儲存、管理，以及從外部平台（如台灣 591）一鍵遷移數據的自動化流程。支援多市場（台/日）的特徵標籤，為後續的「媒合」提供高品質的事實數據。

## 2. Data Models (Prisma)

### 2.1 Listing Core Schema
```prisma
model Listing {
  id            String    @id @default(cuid())
  title         String
  description   String?   @db.Text
  address       String
  price         Int
  currency      String    @default("TWD") // TWD, JPY
  images        String[]  // GCS paths
  
  // 市場特有屬性 (JSON 結構)
  // TW: { "rent_subsidy": boolean, "tax_declaration": boolean, "electric_fee": number }
  // JP: { "reikin": number, "shikikin": number, "guarantor": string, "foreigner_friendly": boolean }
  marketTags    Json?     
  
  // 設施屬性: { "elevator": boolean, "balcony": boolean, "appliances": string[] }
  features      Json?     
  
  // 原始來源紀錄 (Scraping Metadata)
  sourceUrl     String?   @unique
  rawScrapedData Json?    
  
  landlordId    String
  landlord      User      @relation("LandlordListings", fields: [landlordId], references: [id])
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}
```

## 3. Migration Logic (The "Zero Friction" Engine)

### 3.1 URL 解析流程 (Backend Scraper)
- **技術棧**: `cheerio` (用於靜態 HTML 解析) 或 `Puppeteer` (若需處理 JS 渲染)。
- **目標平台**: 591 房屋交易 (tw.591.com.tw)。
- **核心邏輯**:
    1. 後端接收 URL -> 抓取網頁原始碼。
    2. 提取 Meta Tags, Title, Price, Description 以及設備清單。
    3. 將非結構化文字傳送給 Gemini 進行「欄位校準 (Field Alignment)」。

### 3.2 Vision OCR 流程 (App 截圖解析)
- **模型**: Gemini 1.5 Flash / Gemini 3 Flash。
- **Prompt Spec**:
    > "你是一個專業的租屋管家，請分析這張手機 App 截圖中的房源資訊。將其中的租金、坪數、樓層、押金規則、以及任何關於『租補』、『外籍人士』或『寵物』的描述轉化為結構化 JSON。"
- **Output Schema**: 必須精確映射至 `Listing` 的資料欄位。

## 4. Multi-Market Tag Specification

### 4.1 台灣市場 (TW Tags)
- **必填標籤**:
    - `rent_subsidy`: 是否可報稅、申請租金補貼。
    - `address_reg`: 是否可遷入戶籍。
    - `meter_type`: 獨立電表或分租共用。
    - `fee_logic`: 台電計費、固定單價 (每度 X 元)。

### 4.2 日本市場 (JP Tags)
- **必填標籤**:
    - `reikin` (禮金): 通常為 0-2 個月。
    - `shikikin` (敷金): 押金性質。
    - `guarantor_company`: 是否強制加入保證公司。
    - `viewing_logic`: 是否需要管理公司預約。

## 5. UI Requirements (Landlord Flow)
- **URL Paste Input**: 快速解析介面，顯示解析進度條。
- **Verification UI**: AI 解析後，彈出 Form 表單供房東校對並補齊「AI 信心分數較低」的欄位。
- **Image Editor**: 預覽上傳的照片，並顯示 AI 自動偵測到的亮點標籤。

## 6. API Contracts
- `POST /api/listings/migrate`: 傳送 URL 或 Base64 截圖，回傳結構化預覽。
- `POST /api/listings`: 建立房源（正式寫入 DB）。
- `GET /api/listings/:id`: 取得房源詳情（含市場專屬標籤）。
