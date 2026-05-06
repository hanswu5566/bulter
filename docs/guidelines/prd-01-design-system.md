# 設計系統 (Design System)："Truth & Clarity" (真實與清晰)

## 1. 設計哲學 (Design Philosophy)

本設計系統融合了 **Airbnb 的乾淨優雅** 與 **Apple 的細節打磨**，專為 Butler 智慧租屋管家 打造。

*   **不干擾，只增強**：我們不破壞宿主網站（如 591）原有的瀏覽體驗，而是在對的時機與位置提供決策輔助。
*   **數據即視覺**：房租、電費、通勤時間等數據是核心，UI 應服務於數據的清晰呈現，避免多餘的裝飾。
*   **絕對的信任感**：透過優雅的圓角、精緻的陰影與流暢的微互動，營造高價值的專業工具質感。

---

## 2. 核心設計原則 (Core Principles)

### 2.1 樣式隔離 (Visual Isolation)
*   **Shadow DOM**：所有擴充功能注入的 UI 必須包裹在 Shadow DOM 中，完全隔絕宿主網站的 CSS 污染，確保 UI 視覺的一致性。

### 2.2 語意化顏色 (Semantic Colors)
延續專案基礎色調，並賦予明確的語意：
*   **Surface (表面底色)**：`#FFFDD0` (奶油白) - 營造溫暖、安全感，用於側邊欄與卡片背景。
*   **Primary (主色/行動)**：`#D2691E` (陶土紅) - 代表專業、積極與警示。用於主要按鈕與重大風險提示。
*   **Text (文字色)**：`#333333` (深炭灰) - 提供舒適的閱讀對比度。
*   **Status - Success (合規/匹配)**：`#00E676` (極光綠) - 用於「符合法規」、「通勤時間達標」。
*   **Status - Warning (風險/超收)**：`#FF9100` (琥珀橘) - 用於「疑似頂加」、「電費可能超收」。

---

## 3. 基礎原子設計 (Design Tokens)

### 3.1 字體與排版 (Typography)
*   **Font Family**：優先使用系統預設的現代無襯線字體（iOS: `San Francisco`, Android/Web: `Roboto` 或 `Inter`）。
*   **數據強調**：價格、通勤時間、匹配分數等關鍵數字，一律使用 **Bold (700+)** 或 **Heavy (900)** 的字重。

### 3.2 圓角與陰影 (Radius & Shadows)
*   **圓角 (Border Radius)**：
    *   Card / Panel: `16px`
    *   Badge / Button: `8px`
*   **陰影 (Shadows)**：採用多層疊加的柔和陰影，營造卡片漂浮於網頁之上的層次感。
    *   *CSS*: `box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06);`

---

## 4. 核心組件庫 (Core Components - MVP 1)

### 4.1 The Badge (列表頁快速標籤)
*   **設計**：藥丸型 (Pill) 標籤，背景微透明（Glassmorphism），內含 Icon 與簡短數據。
*   **範例**：`[🚶 25 min]` (綠底)、`[⚡️ 電費 6元]` (橘底)。

### 4.2 The Side Panel (詳情頁 AI 診斷面板)
*   **設計**：從右側滑出的抽屜式面板（Drawer）。
*   **佈局**：
    *   **Header**：大字顯示 Match Score 與關閉按鈕。
    *   **Body**：採用卡片式模組化（Card-based）排列，區分為「真實成本」、「法規合規性」、「通勤時間」與「風險清單」。

---

## 5. 微互動與動態 (Motion & Micro-interactions)

*   **滑出動畫**：側邊欄出現時，使用 `cubic-bezier(0.25, 0.1, 0.25, 1.0)` 的貝茲曲線，達到類似 iOS 的流暢彈性滑出效果。
*   **Hover 反饋**：當滑鼠懸停在可互動元素（如風險標籤、按鈕）上時，微幅放大並加深陰影，給予明確的視覺反饋。

---
*地位：草案 / 由 AI 資深 UI/UX 設計師生成*
*eof*
