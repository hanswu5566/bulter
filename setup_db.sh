#!/bin/bash

# AI House Rent - Database Setup (Port 5433 Edition)

CONTAINER_NAME="ai-rent-db-new"
DB_USER="postgres"
DB_PASSWORD="password123"
DB_NAME="ai_house_rent"
DB_PORT="5433" # 改用 5433 避免衝突

echo "🐘 Setting up Local PostgreSQL on Port $DB_PORT..."

# 1. Determine if sudo is needed
if docker ps >/dev/null 2>&1; then
    DOCKER_CMD="docker"
else
    DOCKER_CMD="sudo docker"
fi

# 2. Kill existing if exists
$DOCKER_CMD rm -f $CONTAINER_NAME >/dev/null 2>&1

# 3. Start New Containers
echo "🚀 Starting new PostgreSQL container on port $DB_PORT with official pgvector..."
$DOCKER_CMD run --name $CONTAINER_NAME -e POSTGRES_PASSWORD=$DB_PASSWORD -e POSTGRES_DB=$DB_NAME -p $DB_PORT:5432 -d pgvector/pgvector:pg18

REDIS_CONTAINER="butler-redis"
echo "🔴 Starting new Redis container on port 6379..."
$DOCKER_CMD rm -f $REDIS_CONTAINER >/dev/null 2>&1
$DOCKER_CMD run --name $REDIS_CONTAINER -p 6379:6379 -d redis:alpine

# 4. Wait
echo "⏳ Waiting for services to be ready..."
sleep 5

# 4.5 Enable pgvector extension inside container
echo "🛠 Enabling pgvector extension inside container..."
$DOCKER_CMD exec $CONTAINER_NAME psql -U postgres -d $DB_NAME -c "CREATE EXTENSION IF NOT EXISTS vector;"

# 5. Sync Prisma Schema
echo "🛠 Synchronizing Prisma Schema..."
export DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@localhost:$DB_PORT/$DB_NAME"

if command -v bun >/dev/null 2>&1; then
    bun prisma generate
    bun prisma db push --accept-data-loss
else
    npx prisma generate
    npx prisma db push --accept-data-loss
fi

echo "✅ Infrastructure is ready!"
echo "Please ensure .env has:"
echo "DATABASE_URL=\"postgresql://$DB_USER:$DB_PASSWORD@localhost:$DB_PORT/$DB_NAME\""
echo "REDIS_URL=\"redis://localhost:6379\""
