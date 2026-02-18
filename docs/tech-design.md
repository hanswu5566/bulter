# Technical Design: AI House Rent - 智慧租屋管家平台

**Self link:** [docs/tech-design.md](./tech-design.md)  
**Status**: Draft  
**Authors**: User, Gemini CLI  
**PRD**: [ai-house-rent-prd-v2.md](./ai-house-rent-prd-v2.md)  
**Last major revision**: 2026-02-18

# Context

## Objective
建立一個高效、透明且低成本的智慧租屋平台。利用 Gemini AI 作為「虛擬管家」，在看房前進行資料預審與遷移，並在實地看房時透過全螢幕引導 (Guided Flow) 迫使房客進行物理事實驗證，從而打破租屋市場的資訊不對稱。

## Background
租屋市場長期存在資訊不對稱（如隱瞞漏水、噪音）與溝通成本高的問題。現有平台（如 591）多為單向佈告欄。本計畫旨在透過 AI 技術將看房過程轉化為「不可竄改的事實數據」，建立信任護城河。

# Design

## Overview
系統採用 Next.js 14 (App Router) 搭配 Bun 環境，部署於 GCP Cloud Run。核心邏輯集中於 Next.js API Routes。AI 運算由 Gemini 3 Flash 驅動，資料存儲結合 Cloud SQL (PostgreSQL) 與 GCS。

## Infrastructure
*   **Next.js 14 (App Router)**: 作為全棧框架，處理 UI 與 API 邏輯。
*   **Cloud SQL (PostgreSQL)**: 存儲用戶、房源及看房報告等結構化資料。
*   **NextAuth.js**: 處理身份驗證與角色權限。
*   **Google Cloud Storage (GCS)**: 儲存大量看房照片，採用 Signed URL 機制。
*   **Gemini API (Google AI Studio)**: 執行 OCR、多模態照片辨識與語義匹配。

## Detailed design

### 1. 資料模型 (Database Schema)
*   **Users**: 包含 `role` (TENANT/LANDLORD) 與 `profile_tags` (JSONB)。
*   **Listings**: 存儲房源特徵、租金及 591 原始數據 (JSONB)。
*   **Inspection_Reports**: 儲存每次實勘的 Checklist 結果 (JSONB) 與照片路徑。

### 2. 身份驗證與角色管理
實作 NextAuth.js 的 `jwt` 與 `session` callbacks，將資料庫中的角色資訊擴展至客戶端 Session 中，以便進行介面權限控制。

### 3. GCS Signed URL 上傳機制
前端請求 API 生成簽署 URL -> 客戶端直接 PUT 檔案至 GCS。避免照片流經後端，降低延遲與頻寬成本。

### 4. 591 遷移與 AI 內容增強
*   使用 `cheerio` 進行後端 Scraping 解析 591 URL。
*   利用 Gemini 3 Flash 進行截圖 OCR，一次性完成資料提取與 JSON 格式化。

### 5. PWA 與離線看房支援
整合 `next-pwa`，使用 `IndexedDB` 暫存檢查數據。確保在地下室或網路不佳環境下，房客仍能完成看房拍照，待連線後自動背景同步至 GCS。

## Alternatives considered
| 維度 | 建議方案 | 替代方案 | 理由 |
| :--- | :--- | :--- | :--- |
| 資料庫 | **Cloud SQL** | Firestore | SQL 處理複雜的房源關聯查詢更為穩健。 |
| 緩存 | **Next.js Cache** | Redis | MVP 階段無需額外負擔 Redis 成本。 |

## Dependencies
*   **Google AI Studio API**: 核心 AI 能力依賴。
*   **GCP Cloud Run / SQL**: 基礎建設依賴。
*   **NextAuth.js**: 身份驗證核心。

## Migrations
本專案為新啟動計畫，暫無舊系統遷移需求。但預留 591 數據導入接口。

## Technical debt
1. **Scraping 穩定性**: 591 網頁結構變動可能導致 Parser 失效，需定期維護。
2. **AI 費用**: 目前使用免費層級，隨流量增長需遷移至 Vertex AI 付費版。

# Quality attributes

## Security
*   使用 GCS Signed URL 保護私有圖片存取。
*   實作 API Route 端的 Row Level Security (RLS) 邏輯。

## Reliability
*   PWA 提供離線操作能力，確保核心流程（實地看房）不因斷網中斷。

## Data integrity
*   使用 SQL Transaction 確保房源更新與報告生成的一致性。

## Privacy
*   遵守 Google Data Security Policy。用戶標籤僅用於匿名匹配，不對外洩露。

## Scalability
*   Cloud Run Serverless 架構，支援依流量自動水平擴展。

## Latency
*   Next.js Edge Runtime 處理部分 API，Signed URL 減少後端處理時間。

## Accessibility
*   遵循 Material 3 的無障礙色彩與字體規範。

## Testability
*   核心邏輯（Parser, Score Calculation）實作單元測試。
*   看房流程實作 Playwright 端到端測試。

# Project management

## Work estimates
*   **Week 1**: 基礎架構、Auth、Schema。
*   **Week 2**: 591 遷移工具實作。
*   **Week 3**: 看房 Checklist 與 PWA。
*   **Week 4**: AI 對話管家與系統優化。

## Documentation plan
*   提供 API 文件、DB Schema 字典與視覺設計規範。

# Operations

## Monitoring & alerting
*   整合 GCP Cloud Logging 與 Monitoring 監控 API 錯誤率與 AI 回應延遲。

## Rollback strategy
*   Cloud Run 支援版本滾動與快速復原 (Traffic Split/Rollback)。

# Document history
*   **v1.0**: 初始骨架。
*   **v1.1**: 整合技術選型與成本估算。
*   **v1.2**: 補強實作細節（Schema, Signed URL, Auth）。
