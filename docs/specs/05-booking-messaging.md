# Tech Spec 05: Internal Booking & Messaging System

## 1. Overview
本模組負責房客與房東之間的即時通訊 (IM) 以及看房時段的媒合。我們自建一套輕量級的預約系統，整合對話流程，並透過 AI 進行跨國即時翻譯。

## 2. Data Models (Prisma)

### 2.1 Chat & Messages
```prisma
model ChatSession {
  id          String        @id @default(cuid())
  listingId   String
  listing     Listing       @relation(fields: [listingId], references: [id])
  users       User[]        // [Tenant, Landlord]
  messages    ChatMessage[]
  createdAt   DateTime      @default(now())
}

model ChatMessage {
  id          String      @id @default(cuid())
  sessionId   String
  session     ChatSession @relation(fields: [sessionId], references: [id])
  senderId    String
  content     String      @db.Text
  translatedContent Json? // { "en": "...", "ja": "..." }
  createdAt   DateTime    @default(now())
}
```

### 2.2 Booking & TimeSlots
```prisma
enum BookingStatus {
  REQUESTED   // 房客發出請求
  CONFIRMED   // 房東接受
  REJECTED    // 房東拒絕
  VISITED     // 已完成實勘
  CANCELLED   // 已取消
}

model Appointment {
  id          String        @id @default(cuid())
  tenantId    String
  landlordId  String
  listingId   String
  scheduledAt DateTime      // 預約的時段
  status      BookingStatus @default(REQUESTED)
  
  // 實勘報告連結 (Visited 後產生)
  reportId    String?       
  
  createdAt   DateTime      @default(now())
}
```

## 3. Communication Logic

### 3.1 AI-Powered Chat
- **即時翻譯**: 當雙方 `baseProfile.language` 不同時，觸發翻譯。
- **Butler 提示注入**: AI 在對話視窗上方提供建議，例如：「這間房源標註不可寵物，記得確認是否有例外」。

### 3.2 預約流轉 (Matchmaking Flow)
1. **時段發布**: 房東在後台標記可看房的「Time Slots」。
2. **預約請求**: 房客在 Listing 頁面點擊「預約看房」，選擇一個時段。
3. **媒合通知**: 系統推播通知給房東（附帶房客的 `MatchResult`）。
4. **確認/拒絕**: 房東一鍵操作。若確認，自動鎖定時段並加入雙方看板。

## 4. Notification Strategy
- **In-app Notification**: 預約狀態變更、新訊息。
- **Browser Push**: 重要時間提醒（如：看房前 1 小時）。

## 5. UI Requirements
- **Chat Interface**: 支援圖片傳送、預約小卡嵌入。
- **Booking Dashboard**: 月曆視圖，區分已確認與待處理預約。
- **Match Card**: 在對話中懸浮顯示「雙方契合度總結」。

## 6. API Contracts
- `POST /api/chat/sessions`: 啟動新對話。
- `POST /api/chat/:sessionId/messages`: 發送訊息（觸發後端翻譯）。
- `GET /api/bookings/available-slots/:listingId`: 取得房源可預約時段。
- `POST /api/bookings`: 提交預約請求。
- `PATCH /api/bookings/:id/status`: 更新預約狀態（房東確認或標記 VISITED）。
