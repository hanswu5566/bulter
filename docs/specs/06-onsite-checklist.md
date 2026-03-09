# Tech Spec 06: On-site Manual Checklist & Digital Evidence

## 1. Overview
本模組是產品的核心 USP。它引導房客在實地看房時，按部就班地執行細緻的物理事實檢查，並提供數位存證（照片+時戳）功能，作為日後退租或合約判定「原狀恢復」的中立依據。

## 2. Checklist Structure (The Scenario Items)

系統將檢查項拆解為多個場景，每個項目均包含：手動動作、預期結果、以及「有疑慮」時的存證介面。

### 2.1 靜態場景 (安穩睡眠)
- **Item**: 隔音環境驗證。
- **Action**: 靜止 30 秒。
- **Data**: `Normal / Noisy` (房客主觀描述)。
- **Evidence**: 若 Noisy，引導拍攝「窗縫/門縫」照片，紀錄外部干擾來源。

### 2.2 水力場景 (衛浴廚食)
- **Item**: 水壓與排水。
- **Action**: 同時開啟所有龍頭。
- **Evidence**: 若排水緩慢或水壓不足，拍照紀錄水流現況與排水孔狀態。

### 2.3 安全紅線 (關鍵點名)
- **Item**: 消防與熱水器。
- **Action**: 查看住警器、確認熱水器是否具備強制排氣。
- **Evidence**: 拍攝熱水器標籤與消防設備。

## 3. Fact-First Recording Logic

### 3.1 互動流程
1. **載入清單**: 進入現場後，點擊「開始實勘」。
2. **手動勾選**: 逐項操作。
3. **反應式拍照**: 
    - 點選「正常」: 略過拍照，直接紀錄狀態。
    - 點選「有疑慮」: 強制啟動相機，拍攝現況。
4. **全屋快照**: 結束前，引導拍攝室內 360 度概覽，作為「入駐前基準點」。

## 4. Condition Report (PDF Generation)

### 4.1 報告結構
- **Header**: 房源地址、實勘時間、房客/房東 ID。
- **Manual Summary**: 列表顯示所有手動檢查結果（OK/Warning）。
- **Annotated Evidence**: 顯示所有「有疑慮」的照片，附帶 GPS 與數位簽章雜湊值。
- **AI Summary**: 
    - **觸發**: 實勘結束後。
    - **Gemini Task**: 讀取上述事實，總結該房源的「居住實錄與風險」，生成 PDF。

## 5. Data Models (Prisma)
```prisma
model InspectionReport {
  id            String      @id @default(cuid())
  appointmentId String      @unique
  appointment   Appointment @relation(fields: [appointmentId], references: [id])
  
  checklistData Json        // 結構化事實: { "noise": "ok", "water": "warning" }
  photos        String[]    // GCS paths
  aiSummary     String?     @db.Text
  digitalHash   String?     // 用於驗證報告未被竄改
  
  createdAt     DateTime    @default(now())
}
```

## 6. UI Requirements
- **Focus Mode Interface**: 簡潔的按鈕介面，減少打字，以勾選為主。
- **Camera Overlay**: 拍照時顯示水平儀，確保存證照角度清晰。
- **Report Preview**: 即時生成 Web 版報告，供房客一鍵轉寄。

## 7. API Contracts
- `GET /api/reports/template/:listingId`: 取得該房源專屬的檢查清單。
- `POST /api/reports/save`: 暫存或提交實勘數據與照片。
- `POST /api/reports/:id/finalize`: 觸發 Gemini 總結並生成 PDF 下載連結。
