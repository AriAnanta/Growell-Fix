const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function runMigration() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'growell_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  try {
    console.log('Running migration: add user_notif_posyandu table...');
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_notif_posyandu (
        user_id INT NOT NULL,
        posyandu_id INT NOT NULL,
        PRIMARY KEY (user_id, posyandu_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (posyandu_id) REFERENCES posyandu(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log('✅ Table user_notif_posyandu created successfully!');

    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
