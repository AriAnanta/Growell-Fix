const mysql = require('mysql2/promise');

async function run() {
  const db = await mysql.createConnection({
    host: 'localhost',
    user: 'growell_user',
    password: 'growell_password_2024',
    database: 'growell_db'
  });

  const [u] = await db.query('SELECT * FROM users WHERE email="system@growell.com"');
  if (u.length === 0) {
    // Generate UUID via DB or JS, here we use DB UUID() function
    await db.query(`
      INSERT INTO users (uuid, nama, email, password, role, is_active) 
      VALUES (UUID(), 'Sistem Growell', 'system@growell.com', '$2a$10$xyz', 'ahli_gizi', 1)
    `);
    console.log('Created System User');
  } else {
    console.log('System user exists: ', u[0].id);
  }
  process.exit();
}
run();
