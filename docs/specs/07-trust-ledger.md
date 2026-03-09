# Tech Spec 07: Trust Ledger & FinTech Integration

## 1. Overview
本模組將「物理事實」轉化為「數位信用」。它負責計算房源與用戶的 TrustScore，處理具備法律效力的電子簽章，並為日本市場的高齡租屋提供 IoT 安全監測數據接入。

## 2. TrustScore Algorithm (事實驅動評分)

### 2.1 房源信任分 (Listing Trust)
- **基礎分**: 100 分。
- **加分項**:
    - `Verified by Visitor`: 每有一份 Visited 狀態的實勘報告且回報「與描述相符」，+10 分。
    - `Clear History`: 歷史退租無糾紛紀錄。
- **扣分項**:
    - `Fact Mismatch`: 實勘報告回報「無對外窗」但標註為「有對外窗」，-50 分且系統自動修正標籤。

### 2.2 用戶信任分 (User Trust)
- **基礎分**: 80 分 (New User)。
- **加分項**:
    - `Butler Verification`: 完成 Butler Profile 對話。
    - `History`: 準時交租紀錄、無噪音投訴紀錄。

## 3. FinTech: Electronic Signature (電子簽章)

### 3.1 數位合約流程
1. **合約生成**: 預約狀態轉為 `VISITED` 且雙方有意願後，系統自動抓取房源特徵、租金與房客資料生成 HTML 合約。
2. **證據綁定**: 自動將最新的 `InspectionReport` 作為合約附件。
3. **簽署**: 整合第三方 API (如 DocuSign 或 台灣本地電子簽章服務)。
4. **存證**: 簽署後的 PDF 雜湊值 (Hash) 存入資料庫，確保不可竄改。

## 4. Safety Monitoring: IoT Integration (JP Market Focus)

針對日本「2025 問題」與孤獨死風險提供的加值服務：
- **數據接入**: 整合智慧電表 (Smart Meter) 或 門窗感應器。
- **異常偵測**: 
    - 若電表連續 24 小時無波動，觸發「安否確認」對話通知。
    - 若無回應，自動通知緊急聯絡人與管理公司。
- **資料模型**:
```prisma
model IoTDevice {
  id          String   @id @default(cuid())
  listingId   String
  type        String   // "ELECTRIC_METER", "MOTION_SENSOR"
  lastHeartbeat DateTime
  status      String   // "NORMAL", "ALERT"
}
```

## 5. Verified Data Feedback Loop (數據回流)

這是打破 591/SUUMO 資訊失靈的關鍵：
- **自動更新**: 當 `InspectionReport` 提交且包含「事實修正」時，系統自動更新 `Listing.marketTags`。
- **透明化紀錄**: 房源頁面顯示「*本房源已於 2026/03/05 由房客實測驗證：隔音優良、水壓正常*」。

## 6. UI Requirements
- **Trust Badge**: 房源與個人畫像上的信用標章。
- **Contract Workspace**: 雙方查看、審閱合約草案的介面。
- **Safety Dashboard (Landlord)**: 房東查看高齡租客安全狀態的看板（隱私保護模式，僅顯示 OK/Alert）。

## 7. API Contracts
- `GET /api/trust/score/:id`: 取得用戶或房源的信任分析。
- `POST /api/fintech/contract/generate`: 生成合約草案。
- `POST /api/iot/heartbeat`: 接收硬體設備的回傳數據。
