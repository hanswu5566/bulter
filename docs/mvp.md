# Milestone Roadmap: Phase 1 (MVP)

**Objective**: 建立具備「信任驗證」與「實地看房存證」的核心工具，解決台日租屋市場冷啟動與資訊失靈問題。
**Success Criteria**: 用戶能完成「找房 -> 溝通 -> 看房 -> 拿到存證報告」的完整體驗。

---

## Milestone 1: 數據與身分地基 (The Foundation)
*   [ ] **Auth & Identity**: 
    *   Google OAuth 2.0 登入整合。
    *   房客/房東雙角色切換 (Dual-Role Toggle) 介面。
*   [ ] **Database Setup**: 
    *   實作 Prisma Schema (Spec 01 & 02)。
    *   支援台日市場特定標籤 (Json) 與多語系欄位。
*   [ ] **591 Migration Tool**: 
    *   URL Scraper: 解析 591 網址獲取基礎設施數據。
    *   Vision OCR: 利用 Gemini 解析 App 截圖內容並自動填表。

## Milestone 2: 意圖採集與智慧搜尋 (Discovery)
*   [ ] **Butler AI Onboarding**: 
    *   動態對話收集生活習慣（噪音、清潔、規約）。
    *   自動提取並儲存「AI 畫像標籤」與「信用摘要」。
*   [ ] **Hybrid Search Engine**: 
    *   Google Maps 整合：PIN 點顯示與半徑搜尋。
    *   進階過濾：租金、地點、房型、政策標籤（租補、外籍友善）。
*   [ ] **AI Match Analysis**: 
    *   搜尋結果顯示適配百分比。
    *   「管家理由」顯示：自動總結該房源對該用戶的亮點與風險。

## Milestone 3: 溝通媒合與預約系統 (Engagement)
*   [ ] **Internal Chat System**: 
    *   自建即時對話介面。
    *   自動翻譯整合：基於用戶語系自動觸發 Gemini 雙向翻譯。
*   [ ] **Booking Matchmaker**: 
    *   房東時段管理 (TimeSlots)。
    *   房客預約流程與狀態流轉 (Pending/Confirmed)。
    *   媒合確認後自動生成「看房提醒包」指南。

## Milestone 4: 信任存證與報告生成 (Verification)
*   [ ] **Manual-First Checklist**: 
    *   場景化文字引導（靜態隔音、動態水壓、安全紅線）。
    *   手動勾選正常/有疑慮狀態介面。
*   [ ] **Digital Evidence Recording**: 
    *   反應式照片拍照：僅在有疑慮時強制啟動。
    *   存證浮水印：紀錄時間、地點與防偽雜湊值。
*   [ ] **Inspection Report**: 
    *   Gemini 總結實勘結果與原始現況。
    *   自動生成 PDF 存證報告。
*   [ ] **Data Feedback Loop**: 
    *   實勘後的物理事實自動回流修正房源資料。
