# AI House Rent 視覺設計準則 (Visual Design Guideline)

**版本**: 1.1 (Developer-Ready)
**核心調性**: 專業管家 (Butler Service)、暖心 (Warmth)、現代簡約 (Airbnb Aesthetic)
**基礎框架**: Material 3 (M3) Design System

---

## 1. 設計核心理念 (Design Philosophy)

*   **非侵入式管家服務 (Non-intrusive Service)**: AI 管家平時靜止於懸浮球 (FAB)，不主動打擾使用者。
*   **極簡資訊層級 (Minimalist Information Hierarchy)**: 借鑒 Airbnb 的資訊減法，一張卡片僅承載一個核心訊息。
*   **真實物理感 (Physicality & Soft Elevation)**: 使用 M3 的層級規範，建立清晰的視覺深度。

## 2. 色彩系統 (Color System - Butler Warmth)

| 用途 | 顏色名稱 | 色碼 (Hex) | M3 角色 | 說明 |
| :--- | :--- | :--- | :--- | :--- |
| **背景色** | Surface | `#FFFDD0` | Surface | **奶油白 (Cream)**。主要背景色。 |
| **主色** | Primary | `#D2691E` | Primary | **陶土紅 (Terracotta)**。重點操作與 FAB。 |
| **文字色** | On-Surface | `#333333` | On-Surface | **深炭灰 (Deep Charcoal)**。 |
| **成功狀態** | Success | `#8A9A5B` | Tertiary | **鼠尾草綠 (Sage Green)**。 |
| **卡片底色** | Card Surface | `#FFFFFF` | Surface Bright | 純白色，在奶油色背景上形成微小對比。 |

*   **Dynamic Color 限制**: 若使用動態配色，請將 **Hue (色相)** 鎖定在 `20° (橘紅)` 至 `50° (金黃)` 區間。

## 3. 字體與排版 (Typography)

*   **英文字體**: `Inter` (Variable font)。
*   **中文字體**: `Noto Sans TC`。
*   **字級規範**: 
    *   **Title**: 20sp, Bold, Line-height 1.2
    *   **Body**: 16sp, Regular, Line-height 1.6
    *   **Label**: 12sp, Medium, Letter-spacing 0.5

## 4. 核心組件規範 (Core Components)

### 4.1 卡片佈局 (Card System)
*   **圓角 (Radius)**: `16dp`。
*   **層級 (Elevation)**: **Level 1** (Shadow Blur: 4dp, Y-offset: 2dp)。
*   **邊框**: `1px solid #E0E0E0`。
*   **間距 (Padding)**: 全域 `16dp`。

### 4.2 AI 懸浮管家 (AI FAB)
*   **圖示**: 建議使用 `Lucide-React: ChefHat` (樣式接近管家帽) 或自定義 SVG，顏色為 `Primary`。
*   **層級 (Elevation)**: **Level 3** (具有顯著的懸浮感)。
*   **脈衝動畫 (Pulse Animation)**:
    *   **效果**: `scale(1.05)`, `opacity: 0.8`。
    *   **週期**: `2.5s` 無限循環。
    *   **曲線**: `ease-in-out`。

### 4.3 引導式看房流程 (Guided Flow UI)
*   **呈現模式**: 全螢幕覆蓋 (Z-index: 1000)。
*   **轉場動畫**: 自 FAB 位置以 **圓形遮罩擴散 (Circular Reveal)** 開啟。
*   **組件**: 頂部 `LinearProgress` (分段式)，中間 `Container` 承載引導內容。

## 5. AI 互動與加載狀態 (AI Interaction & Loading)

*   **Circular Spinner**:
    *   **粗細**: `3dp`。
    *   **顏色**: `Primary`。
    *   **位置**: 執行圖片分析時，Spinner 應圍繞在 FAB 圓周邊緣。
*   **反饋震動**: 任務完成時觸發 `Light Impact (Haptic)`。
*   **狀態過渡**: 轉化為「Check」圖示時，過渡時間為 `300ms`。

## 6. 佈局與層級 (Layout & Grids)

*   **基數**: `8dp` 網格系統。
*   **全域邊距**: Mobile `16dp`, Tablet/Desktop `24dp`。
*   **垂直間距 (Gaps)**: 組件間固定為 `16dp`。
