const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config({ path: '.env.local' });

async function seed() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'growell_user',
    password: process.env.DB_PASSWORD || 'growell_password_2024',
    database: process.env.DB_NAME || 'growell_db',
  });

  console.log('🌱 Seeding database...\n');

  try {
    const hashedPassword = await bcrypt.hash('password123', 10);

    const users = [
      { uuid: uuidv4(), nama: 'Admin Puskesmas', email: 'puskesmas@growell.id', password: hashedPassword, role: 'puskesmas', no_telepon: '081234567890' },
      { uuid: uuidv4(), nama: 'Admin Kelurahan', email: 'kelurahan@growell.id', password: hashedPassword, role: 'kelurahan', no_telepon: '081234567891' },
      { uuid: uuidv4(), nama: 'Ibu Sari (Kader)', email: 'kader@growell.id', password: hashedPassword, role: 'kader', no_telepon: '081234567892' },
      { uuid: uuidv4(), nama: 'Ibu Dewi', email: 'orangtua@growell.id', password: hashedPassword, role: 'orang_tua', no_telepon: '081234567893' },
      { uuid: uuidv4(), nama: 'Dr. Rina Susanti', email: 'ahligizi@growell.id', password: hashedPassword, role: 'ahli_gizi', no_telepon: '081234567894' },
    ];

    for (const user of users) {
      await pool.query(
        'INSERT IGNORE INTO users (uuid, nama, email, password, role, no_telepon, is_new_user) VALUES (?, ?, ?, ?, ?, ?, FALSE)',
        [user.uuid, user.nama, user.email, user.password, user.role, user.no_telepon]
      );
    }
    console.log('  ✅ Users seeded');

    // Create posyandu
    const [kaderRows] = await pool.query("SELECT id FROM users WHERE email = 'kader@growell.id'");
    const kaderId = kaderRows[0]?.id;

    await pool.query(
      'INSERT IGNORE INTO posyandu (uuid, nama, alamat, kelurahan, kecamatan, kota, kader_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [uuidv4(), 'Posyandu Mawar', 'Jl. Melati No. 5', 'Sukajadi', 'Cicendo', 'Bandung', kaderId]
    );
    console.log('  ✅ Posyandu seeded');

    // Create onboarding entries
    const [allUsers] = await pool.query('SELECT id FROM users');
    for (const u of allUsers) {
      await pool.query(
        'INSERT IGNORE INTO onboarding_progress (user_id, completed_steps, is_completed) VALUES (?, ?, TRUE)',
        [u.id, JSON.stringify([])]
      );
    }
    console.log('  ✅ Onboarding entries seeded');

    console.log('\n✅ Seeding completed!');
    console.log('\n📋 Demo Login Credentials:');
    console.log('  Puskesmas  : puskesmas@growell.id / password123');
    console.log('  Kelurahan  : kelurahan@growell.id / password123');
    console.log('  Kader      : kader@growell.id / password123');
    console.log('  Orang Tua  : orangtua@growell.id / password123');
    console.log('  Ahli Gizi  : ahligizi@growell.id / password123');

    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err);
    await pool.end();
    process.exit(1);
  }
}

seed();
