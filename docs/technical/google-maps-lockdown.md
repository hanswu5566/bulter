# 🛡️ Google Maps API Key 安全鎖定與防護手冊

曝露於前端的 API Key (`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`) 容易被第三方竊取並惡意盜刷。為了防範高額的信用卡帳單爆炸，請在上線前嚴格執行以下 **Google Cloud Console (GCP)** 鎖定步驟。

---

## 🔑 一、 前端金鑰與後端金鑰的分離原則

本專案落實 **前後端金鑰隔離防禦**：
1.  **前端金鑰 (`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`)**：
    *   **唯一作用**：僅用於瀏覽器端渲染互動式地圖與房源標記。
    *   **限制要求**：只能啟用 `Maps JavaScript API`，其餘權限全部封鎖。
2.  **後端金鑰 (`GOOGLE_MAPS_API_KEY`)**：
    *   **作用**：由伺服器後端呼叫 Places Nearby Search 進行嫌惡設施掃描。
    *   **防護方式**：以私密環境變數儲存在伺服器端，完全不曝露給任何瀏覽器。

---

## 🛠️ 二、 GCP 憑證鎖定 Step-by-Step 操作指南

### 第一步：前往 GCP API 與服務憑證頁面
1.  登入 [Google Cloud Console](https://console.cloud.google.com/)。
2.  切換至您本專案的 Google Cloud Project。
3.  左側選單導航至：**「API 與服務」** (APIs & Services) > **「憑證」** (Credentials)。

---

### 第二步：配置前端金鑰 (`NEXT_PUBLIC_` 專用)
1.  在「API 金鑰」清單中，找到您用於前端渲染的金鑰（或點擊「建立憑證」新建一把專門給前端使用）。
2.  點擊該金鑰右側的 **「編輯金鑰」** (Edit Key)。
3.  進行 **應用程式限制 (Application Restrictions)** 設定：
    *   選擇 **「網站」** (Websites / HTTP referrers)。
    *   在「網站限制」中點擊「新增」，精確填入允許呼叫的網域：
        *   本地開發環境：`http://localhost:7788/*` (或您 Next.js 運行的 Port)
        *   正式生產網域：`https://your-domain.com/*` (例如 `https://butler.rent/*`)
        *   測試環境網域（如有）：`https://*.run.app/*` (例如 GCP Cloud Run 的預設 URL)
4.  進行 **API 限制 (API Restrictions)** 設定：
    *   選擇 **「限制金鑰」** (Restrict key)。
    *   在 API 下拉選單中，**僅勾選** 以下服務：
        *   ✅ `Maps JavaScript API`
    *   **其餘所有服務（例如 Places API、Geocoding API）請勿勾選！**
5.  點擊 **「儲存」** (Save)。

---

### 第三步：配置後端金鑰 (`GOOGLE_MAPS_API_KEY` 專用)
1.  在同一憑證頁面，點擊 **「建立憑證」** (Create credentials) > **「API 金鑰」** (API Key) 來建立一把新金鑰。
2.  將其命名為 `butler-backend-maps-key`（這把將作為伺服器後端 `.env` 中的 `GOOGLE_MAPS_API_KEY`）。
3.  點擊 **「編輯金鑰」**：
    *   **應用程式限制**：選擇 **「無」** (None) 或 **「IP 位址」** (IP addresses)（限制為您的伺服器生產主機 IP）。
    *   **API 限制**：
        *   選擇 **「限制金鑰」** (Restrict key)。
        *   在選單中**僅勾選**：
            *   ✅ `Places API`
            *   ✅ `Geocoding API` (未來若地址轉座標需要)
4.  點擊 **「儲存」**。

---

## 🔬 三、 上線前安全自我檢驗表格

請在上線前逐一勾選此清單，確保安全性百分之百無漏水：

- [ ] 前端網頁的 HTML / JS 中只能看見帶有 `NEXT_PUBLIC_` 前綴的前端金鑰。
- [ ] 使用無痕視窗在 localhost 以外的未授權網域上，前端地圖無法渲染（會顯示 API Key 限制錯誤），這代表參照網址限制已生效。
- [ ] 嘗試將前端的金鑰複製出來，丟入 Postman 呼叫後端 Places API：
    ```bash
    curl "https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=25.04,121.50&radius=100&key=YOUR_NEXT_PUBLIC_KEY"
    ```
    確認回傳狀態為 **`REQUEST_DENIED`**，這代表 Places API 限制已完美隔離前端金鑰。
- [ ] 後端的 `GOOGLE_MAPS_API_KEY` 完全沒有填入任何帶有 `NEXT_PUBLIC_` 的環境變數中。

---
*本安全防禦守冊為 AI House Rent (Butler) 生產部署的核心資產，請嚴格遵守配置。*
