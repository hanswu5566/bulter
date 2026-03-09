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

# 3. Start New Container
echo "🚀 Starting new PostgreSQL container on port $DB_PORT..."
$DOCKER_CMD run --name $CONTAINER_NAME -e POSTGRES_PASSWORD=$DB_PASSWORD -e POSTGRES_DB=$DB_NAME -p $DB_PORT:5432 -d postgres

# 4. Wait
echo "⏳ Waiting for database to be ready..."
sleep 5

echo "✅ Database is ready on port $DB_PORT!"
echo "Please ensure .env has: DATABASE_URL=\"postgresql://$DB_USER:$DB_PASSWORD@localhost:$DB_PORT/$DB_NAME\""
