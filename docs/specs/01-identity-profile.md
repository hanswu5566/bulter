# Tech Spec 01: Identity, Auth & Profile System

## 1. Overview
本模組負責用戶的身份驗證、權限控制（房客/房東雙角色切換）以及個人畫像（Profile）的維護。它是平台建立「信任」的第一步。

## 2. Data Models (Prisma)

### 2.1 User & Identity
```prisma
enum UserRole {
  TENANT
  LANDLORD
}

model User {
  id            String    @id @default(cuid())
  name          String?
  email         String?   @unique
  emailVerified DateTime?
  image         String?
  role          UserRole  @default(TENANT) // 當前使用的角色
  
  // 核心畫像數據
  baseProfile   Json?     // 基礎資料: { "phone": string, "occupation": string, "birthday": string }
  aiTags        Json?     // Butler 提取的生活標籤: { "quietness": 5, "laundry": "daily", "pets": false }
  trustSummary  String?   @db.Text // AI 生成的信用推薦語 (用於緩解房東偏見)
  
  // 關聯
  accounts      Account[]
  sessions      Session[]
  listings      Listing[] @relation("LandlordListings")
  appointments  Appointment[]
  messages      ChatMessage[]
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}
```

## 3. Auth & Role Logic

### 3.1 Google OAuth 整合
- **Provider**: NextAuth.js (v5) + Google Provider.
- **Workflow**: 
    1. 用戶點擊登入 -> 導向 Google。
    2. 回傳後，若為新用戶，預設角色為 `TENANT`。
    3. 觸發「Butler Onboarding」對話。

### 3.2 角色切換 (Dual-Role Toggle)
- **邏輯**：單一帳號可同時擁有房客與房東權限，但 UI 層級需進行切換。
- **API**: `PATCH /api/user/role` -> 更新 `User.role` 欄位。

## 4. Butler Onboarding (Profile AI)

### 4.1 對話目標 (Dynamic Extraction Checkpoints)
Butler AI 不只是閒聊，其目標是收集以下資訊：
1. **基礎偏好**：預算、偏好區域、房型要求。
2. **生活習慣 (Trust Profile)**：
    - 噪音敏感度 (Noise Tolerance)
    - 清潔習慣 (Cleanliness)
    - 社區規約接受度 (Rule Compliance)
3. **搬遷動機**：為什麼現在要找房子？

### 4.2 AI Contract (Input/Output)
- **Prompt**: `Identity_Butler_System_Prompt` (定義 Butler 語氣與收集項目)。
- **Output Schema**: 
    ```json
    {
      "structured_tags": {
        "budget_range": [min, max],
        "habits": { "smoke": boolean, "pets": boolean, "quiet_hours": string }
      },
      "summary": "一位生活規律、重視安靜的軟體工程師，尋求近捷運站的單身公寓。"
    }
    ```

## 5. UI Requirements
- **Dashboard**: 顯示當前角色標誌、TrustScore 概覽。
- **Profile Editor**: 手動維護基礎資料 (電話、職業)。
- **Butler Chat Window**: 全螢幕或側邊欄對話介面，顯示即時提取出的標籤。

## 6. API Contracts
- `GET /api/user/me`: 取得目前用戶完整畫像（含 AI Tags）。
- `PATCH /api/user/profile`: 更新手動編輯的欄位。
- `POST /api/user/butler/sync`: 將 Butler 對話記錄傳送給 Gemini，並更新 `aiTags` 與 `trustSummary`。
