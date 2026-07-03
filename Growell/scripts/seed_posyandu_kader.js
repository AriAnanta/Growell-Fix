const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config({ path: '.env.local' });

const posyanduData = {
  "Karanganyar": [
    "Posyandu Melati", "Posyandu Teratai", "Posyandu Bougenville", "Posyandu Mawar",
    "Posyandu Kenanga", "Posyandu Anggrek", "Posyandu Flamboyan", "Posyandu Cattelya",
    "Posyandu Cempaka", "Posbindu RW 09"
  ],
  "Karasak": [
    "Melati 1", "Anyeulir 1", "Anyeulir 2", "Teratai 2", "Melati", "Anggrek 2",
    "Melati 2", "Bugenvil 1", "Bugenvil 2", "Bugenvil 3", "Anggrek 1", "Mawar",
    "Teratai 1", "Anggrek 3"
  ],
  "Pelindung Hewan": [
    "Dahlia 1", "Cempaka 1", "Tunas Harapan", "Flamboyan 1", "Flamboyan 2",
    "Flamboyan 3", "Dahlia 2", "Beringin 1", "Beringin 2", "Cempaka 2",
    "Melati 1", "Melati 2", "Sakura 1", "Sakura 2", "Aster 1", "Aster 2",
    "Kartini 1", "Kartini 2", "Mawar"
  ],
  "Cibadak": [
    "Anggrek", "Sedap Malam", "Bakti Sepuh", "Kenaga", "Sejahtera",
    "Rahayu", "Saluyu", "Soka 1", "Soka 2", "Alamanda", "Melati"
  ]
};

function generateEmail(posyanduName, kelurahan) {
  // Membersihkan nama dari spasi dan karakter khusus, gabungkan nama posyandu dan kelurahan
  const cleanName = posyanduName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanKel = kelurahan.toLowerCase().replace(/[^a-z0-9]/g, '');
  return `${cleanName}_${cleanKel}@growell.id`;
}

async function seedPosyandu() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'growell_user',
    password: process.env.DB_PASSWORD || 'growell_password_2024',
    database: process.env.DB_NAME || 'growell_db',
  });

  console.log('🌱 Seeding Posyandu Data...\n');

  try {
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    for (const [kelurahan, posyandus] of Object.entries(posyanduData)) {
      for (let posyanduName of posyandus) {
        
        // Standarisasi nama posyandu, jika belum ada kata "Posyandu" di depan
        if (!posyanduName.toLowerCase().includes('posyandu') && !posyanduName.toLowerCase().includes('posbindu')) {
           posyanduName = `Posyandu ${posyanduName}`;
        }
        
        const email = generateEmail(posyanduName, kelurahan);
        const kaderName = `Kader ${posyanduName} ${kelurahan}`; // Nama generic karena data kader tidak ada
        
        // 1. Cek apakah user sudah ada
        const [existingUser] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
        
        let kaderId;
        if (existingUser.length === 0) {
          // 2. Insert User (Kader)
          const userUuid = uuidv4();
          const [userResult] = await pool.query(
            'INSERT INTO users (uuid, nama, email, password, role, no_telepon, is_new_user) VALUES (?, ?, ?, ?, ?, ?, FALSE)',
            [userUuid, kaderName, email, hashedPassword, 'kader', '-']
          );
          kaderId = userResult.insertId;
          
          // Insert onboarding progress
          await pool.query(
            'INSERT INTO onboarding_progress (user_id, completed_steps, is_completed) VALUES (?, ?, TRUE)',
            [kaderId, JSON.stringify([])]
          );
          
        } else {
           kaderId = existingUser[0].id;
        }

        const fullPosyanduName = `${posyanduName} - ${kelurahan}`;

        // 3. Cek apakah posyandu sudah ada di kelurahan yang sama (menggunakan nama aslinya)
        const [existingPosyandu] = await pool.query(
          'SELECT id FROM posyandu WHERE (nama = ? OR nama = ?) AND kelurahan = ?', 
          [posyanduName, fullPosyanduName, kelurahan]
        );

        if (existingPosyandu.length === 0) {
           // 4. Insert Posyandu
           const posyanduUuid = uuidv4();
           const [posyanduResult] = await pool.query(
             'INSERT INTO posyandu (uuid, nama, alamat, kelurahan, kecamatan, kota, kader_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
             [posyanduUuid, fullPosyanduName, '-', kelurahan, 'Astanaanyar', 'Bandung', kaderId] 
           );
           
           // Update user posyandu_id
           await pool.query('UPDATE users SET posyandu_id = ? WHERE id = ?', [posyanduResult.insertId, kaderId]);

           console.log(`  ✅ Inserted: ${fullPosyanduName}`);
           console.log(`     -> Email: ${email}`);
           console.log(`     -> Password: password123\n`);
        } else {
           // If posyandu exists, just make sure user's posyandu_id is set
           await pool.query('UPDATE users SET posyandu_id = ? WHERE id = ?', [existingPosyandu[0].id, kaderId]);
           
           // Update the posyandu name to include kelurahan if it doesn't already
           await pool.query('UPDATE posyandu SET nama = ? WHERE id = ?', [fullPosyanduName, existingPosyandu[0].id]);

           console.log(`  ⚠️ Skipped & Updated Name: ${fullPosyanduName}`);
        }
      }
    }

    console.log('\n🎉 Seeding Posyandu Selesai!');
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err);
    await pool.end();
    process.exit(1);
  }
}

seedPosyandu();
