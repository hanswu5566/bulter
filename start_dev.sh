#!/bin/bash

# AI House Rent Local Dev Starter (Cleanup & Google Env Compatible)

echo "🧹 Cleaning up previous instances..."
# 強制殺掉可能殘留的 Next.js 或 Bun 進程
pkill -f "next-dev" >/dev/null 2>&1
pkill -f "next" >/dev/null 2>&1
# 移除 Next.js 的 lock 檔案
rm -rf .next/dev/lock

echo "🚀 Checking environment variables..."

# 1. Check if .env exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    exit 1
fi

# 2. Load .env properly
set -a
source .env
set +a

# 3. Define mandatory variables
MANDATORY_VARS=("DATABASE_URL" "NEXTAUTH_SECRET" "GOOGLE_CLIENT_ID" "GOOGLE_CLIENT_SECRET" "GEMINI_API_KEY")
for VAR in "${MANDATORY_VARS[@]}"; do
    if [ -z "${!VAR}" ]; then
        echo "   - Missing: $VAR"
        exit 1
    fi
done

echo "✅ Environment variables verified."

# 4. Prisma Generate
echo "🛠 Generating Prisma Client..."
npx prisma generate

# 5. Start Dev Server (Disable Turbopack if SWC issues persist)
echo "🔥 Starting AI House Rent Dev Server..."
# 在 Google 環境下，有時關掉 --turbo 會更穩定
npm run dev
