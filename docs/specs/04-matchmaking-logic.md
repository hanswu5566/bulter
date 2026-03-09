# Tech Spec 04: The Matchmaking Contract

## 1. Overview
本模組定義了平台如何將「房客需求」與「房源特徵」進行自動化比對。媒合並非單一的分數，而是一個分層的過濾與評估流程，旨在極大化看房成功率。

## 2. The 3-Level Matching Strategy

### Level 1: 硬性過濾 (Hard Filters) - [SQL Layer]
在進入 AI 運算前，必須滿足資料庫層級的條件。
- **租金**: `Listing.price` 必須在 `User.preferences.budget_range` 內。
- **地點**: 必須在用戶指定的搜尋區域內。
- **物理红線**: 若用戶標註「一定要有對外窗」，不具備此特徵的房源直接排除。

### Level 2: 彈性標籤比對 (Fuzzy Tag-Matching) - [Logic Layer]
計算各項標籤的重合度。
- **設施匹配**: (用戶需要的設施 / 房源提供的設施) 的加權比例。
- **政策匹配**: 比較 `User.aiTags` 與 `Listing.marketTags`（如：寵物、租補）。
- **權重邏輯**: 
    - 關鍵標籤（如：租補可否）未匹配，扣 30 分。
    - 次要標籤（如：洗衣機新舊）未匹配，扣 5 分。

### Level 3: AI 語義適配與理由生成 (AI Layer) - [Gemini Layer]
最精確的「感性適配」。
- **輸入**: `User.aiTags` (生活習慣) + `Listing.butlerInsight` (房源分析)。
- **AI 任務**: 判斷「這位用戶的生活方式」與「這間房屋的靈魂」是否契合。
- **範例**: 房客習慣晚上 11 點後洗衣服，AI 偵測到房源的「陽台在主臥旁且隔音普普」，將此視為「中度不適配 (Medium Risk)」。

## 3. Data Schema: The Match Result

每次媒合產生的 JSON 物件結構：
```json
{
  "total_score": 88, // 0-100
  "level_results": {
    "hard_passed": true,
    "tag_score": 92,
    "semantic_score": 85
  },
  "ai_insights": {
    "strengths": ["高樓層採光好，符合你重視光線的偏好", "台電計費，幫你省下大筆電費"],
    "risks": ["樓下為餐廳，晚上可能較吵雜，對你安靜度的需求有挑戰"],
    "butler_verdict": "這是目前該區最契合你生活節律的房源。"
  }
}
```

## 4. Matchmaking Trigger Points
1. **主動搜尋**: 在房客瀏覽列表時，即時計算 Summary。
2. **房東收件箱**: 當房客點擊「預約」時，房東端會看到這份「媒合分析報告」，作為是否接受預約的參考（AI Gatekeeper）。

## 5. UI Requirements
- **Match Score Donut**: 圓環圖顯示適配百分比。
- **Strength/Risk Cards**: 以對照方式顯示亮點與風險。
- **"The Butler's Take"**: 用斜體文字顯示管家的最終語義判斷。

## 6. API Contracts
- `POST /api/matchmaking/evaluate`: 輸入 `userId` 與 `listingId`，回傳 `MatchResult`。
- `GET /api/user/matches`: 為房客列出該區域適配度 > 70% 的推薦清單。
