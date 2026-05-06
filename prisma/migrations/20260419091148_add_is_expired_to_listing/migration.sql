/*
  Warnings:

  - You are about to drop the column `role` on the `ChatMessage` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `ChatMessage` table. All the data in the column will be lost.
  - You are about to drop the column `raw591Data` on the `Listing` table. All the data in the column will be lost.
  - You are about to drop the column `profileTags` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[appointmentId]` on the table `InspectionReport` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[sourceUrl]` on the table `Listing` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `senderId` to the `ChatMessage` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sessionId` to the `ChatMessage` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('REQUESTED', 'CONFIRMED', 'REJECTED', 'VISITED', 'CANCELLED');

-- DropForeignKey
ALTER TABLE "ChatMessage" DROP CONSTRAINT "ChatMessage_userId_fkey";

-- AlterTable
ALTER TABLE "ChatMessage" DROP COLUMN "role",
DROP COLUMN "userId",
ADD COLUMN     "senderId" TEXT NOT NULL,
ADD COLUMN     "sessionId" TEXT NOT NULL,
ADD COLUMN     "translatedContent" JSONB;

-- AlterTable
ALTER TABLE "InspectionReport" ADD COLUMN     "appointmentId" TEXT,
ADD COLUMN     "digitalHash" TEXT;

-- AlterTable
ALTER TABLE "Listing" DROP COLUMN "raw591Data",
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'TWD',
ADD COLUMN     "isExpired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lat" DOUBLE PRECISION,
ADD COLUMN     "lng" DOUBLE PRECISION,
ADD COLUMN     "marketTags" JSONB,
ADD COLUMN     "rawScrapedData" JSONB,
ADD COLUMN     "sourceUrl" TEXT;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "profileTags",
ADD COLUMN     "aiTags" JSONB,
ADD COLUMN     "baseProfile" JSONB,
ADD COLUMN     "trustSummary" TEXT;

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "landlordId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'REQUESTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatSession" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IoTDevice" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "lastHeartbeat" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,

    CONSTRAINT "IoTDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimit" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiConversation" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "sessionId" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'TENANT',
    "currentStep" INTEGER NOT NULL DEFAULT 0,
    "summary" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "toolCalls" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ChatSessionToUser" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ChatSessionToUser_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "RateLimit_identifier_action_timestamp_idx" ON "RateLimit"("identifier", "action", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "AiConversation_sessionId_key" ON "AiConversation"("sessionId");

-- CreateIndex
CREATE INDEX "AiConversation_userId_idx" ON "AiConversation"("userId");

-- CreateIndex
CREATE INDEX "AiConversation_sessionId_idx" ON "AiConversation"("sessionId");

-- CreateIndex
CREATE INDEX "AiMessage_conversationId_idx" ON "AiMessage"("conversationId");

-- CreateIndex
CREATE INDEX "_ChatSessionToUser_B_index" ON "_ChatSessionToUser"("B");

-- CreateIndex
CREATE UNIQUE INDEX "InspectionReport_appointmentId_key" ON "InspectionReport"("appointmentId");

-- CreateIndex
CREATE UNIQUE INDEX "Listing_sourceUrl_key" ON "Listing"("sourceUrl");

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionReport" ADD CONSTRAINT "InspectionReport_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatSession" ADD CONSTRAINT "ChatSession_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ChatSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiMessage" ADD CONSTRAINT "AiMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "AiConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ChatSessionToUser" ADD CONSTRAINT "_ChatSessionToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "ChatSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ChatSessionToUser" ADD CONSTRAINT "_ChatSessionToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
