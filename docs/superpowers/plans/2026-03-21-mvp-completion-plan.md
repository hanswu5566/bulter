# Phase 1: MVP Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the remaining UI components and integration logic for Phase 1 (MVP) to achieve a full "Find -> Match -> Book -> Inspect" loop.

**Architecture:** Utilize existing Next.js App Router structure, Prisma schema, and Gemini AI integration. We will build the missing Chat and Booking UI and finalize the Inspection report generation.

**Tech Stack:** Next.js 14, Prisma, Tailwind CSS, Lucide React, Gemini 3 Flash API.

---

### Task 1: Milestone 3 - Booking UI (Tenant Flow)
**Files:**
- Create: `src/app/[locale]/listings/[id]/booking/page.tsx`
- Modify: `src/app/[locale]/listings/[id]/page.tsx` (Update "Book Viewing" button)

- [ ] **Step 1: Create the Booking page**
Implement a simple calendar/time-slot selection UI that calls `POST /api/bookings`.

- [ ] **Step 2: Connect the "Book Viewing" button**
Link the button in the listing detail page to the new booking page.

- [ ] **Step 3: Test the booking flow**
Verify that a booking record is created in the database with status `REQUESTED`.

### Task 2: Milestone 3 - Internal Chat UI (MVP)
**Files:**
- Create: `src/app/[locale]/messages/page.tsx`
- Create: `src/app/[locale]/messages/[sessionId]/page.tsx`
- Create: `src/components/ChatWindow.tsx`

- [ ] **Step 1: Create the Chat List and Chat Window**
Implement a basic chat interface to display messages and send new ones.

- [ ] **Step 2: Integrate Gemini Translation**
Ensure messages are translated if the user's language differs from the sender's.

### Task 3: Milestone 4 - Digital Evidence & PDF Report
**Files:**
- Modify: `src/app/[locale]/inspect/[id]/page.tsx` (Add digital hash/watermark logic)
- Create: `src/app/api/reports/[id]/pdf/route.ts` (Mock or real PDF generation)

- [ ] **Step 1: Add "Watermark" simulation**
Overlay time/location data on inspection photos before upload.

- [ ] **Step 2: Implement PDF Generation API**
Create an endpoint that generates a summary PDF using the `InspectionReport` data and Gemini summary.

### Task 4: Milestone 2 - Hybrid Search (Maps Coordination)
**Files:**
- Modify: `prisma/schema.prisma` (Add `lat`, `lng` fields to `Listing`)
- Modify: `src/lib/scrapers/taiwan-591.ts` (Add Geocoding)
- Modify: `src/app/[locale]/listings/page.tsx` (Use real coordinates)

- [ ] **Step 1: Add coordinates to Schema**
Add `lat` and `lng` to the `Listing` model and run migration.

- [ ] **Step 2: Implement Geocoding in Scraper**
Use Google Geocoding API (or Gemini to estimate) to convert addresses to coordinates during migration.

- [ ] **Step 3: Update Map View**
Replace random offsets with real database coordinates.
