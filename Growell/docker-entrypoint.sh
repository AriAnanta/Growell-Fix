#!/bin/sh
set -e

echo "🚀 Growell - Starting application..."
echo "⏳ Waiting for database to be ready..."

# Wait for MySQL
MAX_RETRIES=30
RETRY_COUNT=0
until node -e "
const mysql = require('mysql2/promise');
(async()=>{
  try{
    const c = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'growell_user',
      password: process.env.DB_PASSWORD || 'growell_password_2024',
      database: process.env.DB_NAME || 'growell_db'
    });
    await c.query('SELECT 1');
    await c.end();
    process.exit(0);
  }catch(e){process.exit(1)}
})()
" 2>/dev/null; do
  RETRY_COUNT=$((RETRY_COUNT + 1))
  if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
    echo "  ❌ Database connection failed after $MAX_RETRIES retries"
    break
  fi
  echo "  ⏳ Database not ready, retrying in 3s... ($RETRY_COUNT/$MAX_RETRIES)"
  sleep 3
done

echo "✅ Database connected!"

# Run migrations
echo "📦 Running migrations..."
node scripts/migrate.js || true

# Run seed (only inserts if not exists via INSERT IGNORE)
echo "🌱 Running seed..."
node scripts/seed.js || true

echo "🚀 Starting Next.js server..."
exec node server.js
