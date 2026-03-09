# Tech Spec 03: Search & Discovery Engine

## 1. Overview
本模組負責房客端的房源搜尋、地圖瀏覽與篩選。除了傳統的條件篩選外，我們引入了「AI 理由生成（AI Reasoning UI）」，在搜尋結果中直接告訴房客：這間房源為何適合（或不適合）他的生活畫像。

## 2. Core Search Capabilities

### 2.1 傳統過濾器 (Hard Filters)
系統必須支援基於資料庫索引的精確過濾：
- **基礎條件**: 地點 (Radius/City/District)、租金範圍 (Min/Max)、房型 (Room Type)。
- **物理特徵**: 樓層、電梯、對外窗、坪數。
- **市場標籤**: 租補 (TW)、禮金 (JP) 等 Spec 02 中定義的欄位。

### 2.2 地圖整合 (Geospatial Search)
- **技術棧**: Google Maps API / React Google Maps.
- **邏輯**: 
    1. 當地圖視角移動時，觸發 `GET /api/search`。
    2. 回傳當前視窗座標範圍內的房源 PIN 點。
    3. 點擊 PIN 點顯示房源簡卡 (Summary Card)。

## 3. AI Reasoning UI (管家點評)

### 3.1 適配理由生成
當房客進入搜尋頁面時，系統會自動比對其 **Butler Profile (Spec 01)** 與房源數據。
- **AI 角色**: Butler。
- **輸入**: `User.aiTags` + `Listing.marketTags` + `Listing.features`。
- **Prompt**:
    > "比對用戶對噪音的低耐受度與該房源位於巷弄內的特徵，給出一段 20 字內的管家短語。"
- **範例輸出**: "這間在靜巷內，完美符合你對安靜的要求。"

### 3.2 風險提示
- 如果房客標籤中有 `Pets: True` 而房源標籤為 `Pets: False`，搜尋結果會自動標註「紅字提醒」。

## 4. Discovery Strategy (探索策略)

### 4.1 排序邏輯 (Sort Options)
1. **Match Score**: 預設選項，基於 Spec 04 的媒合契約進行排序。
2. **Newest**: 依發佈時間。
3. **Price**: 低至高或高至低。

### 4.2 儲存與追蹤 (Saved Searches)
- 支持「追蹤此區域」功能。當有新房源搬移進來且符合用戶 Match Score > 80% 時，發送通知。

## 5. UI Requirements
- **Search Sidebar**: 精緻的 M3 選項清單。
- **Hybrid View**: 左側列表，右側地圖（PC 版）或 上下滑動切換（Mobile 版）。
- **Reasoning Badge**: 房源卡片右上方的小標誌，顯示 AI 推薦理由。

## 6. API Contracts
- `GET /api/search`: 
    - Query Params: `lat, lng, radius, minPrice, maxPrice, tags[]`.
    - Returns: `ListingSummary[]` (含 AI 推薦理由字段 `recommendationReason`)。
- `GET /api/listings/:id/recommendation`: 針對特定房源，生成更深入的管家建議。
