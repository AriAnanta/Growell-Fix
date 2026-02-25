const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

const TABLES = [
  // ========================
  // 1. USERS TABLE
  // ========================
  `CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(36) UNIQUE NOT NULL,
    nama VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('kader', 'orang_tua', 'puskesmas', 'kelurahan', 'ahli_gizi') NOT NULL DEFAULT 'orang_tua',
    no_telepon VARCHAR(20),
    alamat TEXT,
    foto_profil VARCHAR(255),
    posyandu_id INT,
    is_active BOOLEAN DEFAULT TRUE,
    is_new_user BOOLEAN DEFAULT TRUE,
    last_login DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ========================
  // 2. POSYANDU TABLE
  // ========================
  `CREATE TABLE IF NOT EXISTS posyandu (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(36) UNIQUE NOT NULL,
    nama VARCHAR(100) NOT NULL,
    alamat TEXT,
    kelurahan VARCHAR(100),
    kecamatan VARCHAR(100),
    kota VARCHAR(100),
    kader_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (kader_id) REFERENCES users(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ========================
  // 3. BALITA TABLE
  // ========================
  `CREATE TABLE IF NOT EXISTS balita (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(36) UNIQUE NOT NULL,
    nik VARCHAR(16) UNIQUE,
    nama VARCHAR(100) NOT NULL,
    tanggal_lahir DATE NOT NULL,
    jenis_kelamin ENUM('Laki-Laki', 'Perempuan') NOT NULL,
    berat_lahir FLOAT,
    panjang_lahir FLOAT,
    nama_ibu VARCHAR(100),
    nama_ayah VARCHAR(100),
    orang_tua_id INT,
    posyandu_id INT,
    alamat TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (orang_tua_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (posyandu_id) REFERENCES posyandu(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ========================
  // 4. PENGUKURAN (MEASUREMENTS) TABLE
  // ========================
  `CREATE TABLE IF NOT EXISTS pengukuran (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(36) UNIQUE NOT NULL,
    balita_id INT NOT NULL,
    tanggal_pengukuran DATE NOT NULL,
    berat_badan FLOAT NOT NULL COMMENT 'kg',
    tinggi_badan FLOAT NOT NULL COMMENT 'cm',
    lingkar_lengan FLOAT COMMENT 'cm - LiLA',
    lingkar_kepala FLOAT COMMENT 'cm',
    
    zs_bb_u FLOAT COMMENT 'Z-Score BB/U',
    zs_tb_u FLOAT COMMENT 'Z-Score TB/U',
    zs_bb_tb FLOAT COMMENT 'Z-Score BB/TB',
    
    status_gizi_bbu VARCHAR(50),
    status_gizi_tbu VARCHAR(50),
    status_gizi_bbtb VARCHAR(50),
    
    rekomendasi_utama TEXT,
    rekomendasi_tambahan JSON,
    catatan_rekomendasi TEXT,
    
    kader_id INT,
    catatan TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (balita_id) REFERENCES balita(id) ON DELETE CASCADE,
    FOREIGN KEY (kader_id) REFERENCES users(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ========================
  // 5. SURVEY BALITA (detailed parent form data)
  // ========================
  `CREATE TABLE IF NOT EXISTS survey_balita (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(36) UNIQUE NOT NULL,
    balita_id INT NOT NULL,
    pengukuran_id INT,
    
    usia_kehamilan_lahir FLOAT,
    is_bblr BOOLEAN DEFAULT FALSE,
    is_prematur BOOLEAN DEFAULT FALSE,
    is_imd BOOLEAN DEFAULT FALSE,
    is_komplikasi_lahir BOOLEAN DEFAULT FALSE,
    jenis_komplikasi_lahir VARCHAR(255),
    
    tinggi_ibu FLOAT,
    berat_ibu FLOAT,
    status_gizi_ibu_hamil VARCHAR(100),
    is_anemia_ibu BOOLEAN DEFAULT FALSE,
    is_hamil_muda BOOLEAN DEFAULT FALSE,
    jarak_kelahiran VARCHAR(100),
    is_hipertensi_gestasional BOOLEAN DEFAULT FALSE,
    is_diabetes_gestasional BOOLEAN DEFAULT FALSE,
    is_infeksi_kehamilan BOOLEAN DEFAULT FALSE,
    is_suplemen_kehamilan BOOLEAN DEFAULT FALSE,
    is_hamil_lagi BOOLEAN DEFAULT FALSE,
    frekuensi_suplemen_minggu VARCHAR(255),
    jenis_suplemen_ibu VARCHAR(255),
    is_ttd_90_tablet BOOLEAN DEFAULT FALSE,
    
    tinggi_ayah FLOAT,
    berat_ayah FLOAT,
    
    is_asi_eksklusif BOOLEAN DEFAULT FALSE,
    usia_mulai_mpasi VARCHAR(100),
    is_mpasi_hewani BOOLEAN DEFAULT FALSE,
    frekuensi_makan_utama INT,
    is_susu_non_asi BOOLEAN DEFAULT FALSE,
    frekuensi_susu_non_asi INT,
    
    terakhir_vitamin_a VARCHAR(255),
    is_tablet_besi_anak BOOLEAN DEFAULT FALSE,
    is_obat_cacing_anak BOOLEAN DEFAULT FALSE,
    is_intervensi_gizi BOOLEAN DEFAULT FALSE,
    jenis_intervensi_gizi VARCHAR(255),
    riwayat_vaksinasi TEXT,
    
    is_sakit_2_minggu BOOLEAN DEFAULT FALSE,
    jenis_penyakit_balita VARCHAR(255),
    
    konsumsi_asi_h1 BOOLEAN DEFAULT FALSE,
    konsumsi_karbohidrat_h1 BOOLEAN DEFAULT FALSE,
    konsumsi_kacangan_h1 BOOLEAN DEFAULT FALSE,
    konsumsi_susu_hewani_h1 BOOLEAN DEFAULT FALSE,
    is_susu_murni_100 BOOLEAN DEFAULT FALSE,
    konsumsi_daging_ikan_h1 BOOLEAN DEFAULT FALSE,
    konsumsi_telur_h1 BOOLEAN DEFAULT FALSE,
    konsumsi_vit_a_h1 BOOLEAN DEFAULT FALSE,
    konsumsi_buah_sayur_h1 BOOLEAN DEFAULT FALSE,
    is_konsumsi_manis_berlebih BOOLEAN DEFAULT FALSE,
    is_pernah_pmt BOOLEAN DEFAULT FALSE,
    is_pernah_rawat_inap BOOLEAN DEFAULT FALSE,
    
    jam_tidur_harian FLOAT,
    durasi_aktivitas_luar FLOAT,
    tingkat_aktivitas_anak VARCHAR(50),
    
    is_ibu_bekerja BOOLEAN DEFAULT FALSE,
    skor_pengetahuan_ibu FLOAT,
    skor_pola_asuh_makan FLOAT,
    pola_asuh_makan VARCHAR(100),
    is_bpjs BOOLEAN DEFAULT FALSE,
    
    is_perokok_di_rumah BOOLEAN DEFAULT FALSE,
    sumber_air_minum VARCHAR(100),
    kualitas_air_minum VARCHAR(100),
    jenis_sanitasi VARCHAR(100),
    kebersihan_lingkungan VARCHAR(100),
    kebiasaan_cuci_tangan VARCHAR(100),
    akses_faskes VARCHAR(100),
    frekuensi_posyandu_bulan INT,
    
    is_penyakit_bawaan BOOLEAN DEFAULT FALSE,
    is_baby_blues BOOLEAN DEFAULT FALSE,
    is_gejala_depresi BOOLEAN DEFAULT FALSE,
    
    pendidikan_ibu VARCHAR(100),
    pendidikan_ayah VARCHAR(100),
    is_pernah_penyuluhan BOOLEAN DEFAULT FALSE,
    frekuensi_kelas_ibu INT,
    is_paham_makanan_sehat BOOLEAN DEFAULT FALSE,
    pekerjaan_kk VARCHAR(100),
    jumlah_art INT,
    pendapatan_bulanan VARCHAR(100),
    jarak_akses_pangan VARCHAR(100),
    is_pantangan_makan BOOLEAN DEFAULT FALSE,
    penentu_makanan VARCHAR(255),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (balita_id) REFERENCES balita(id) ON DELETE CASCADE,
    FOREIGN KEY (pengukuran_id) REFERENCES pengukuran(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ========================
  // 6. JADWAL POSYANDU
  // ========================
  `CREATE TABLE IF NOT EXISTS jadwal_posyandu (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(36) UNIQUE NOT NULL,
    posyandu_id INT NOT NULL,
    tanggal DATE NOT NULL,
    waktu_mulai TIME,
    waktu_selesai TIME,
    kegiatan VARCHAR(255),
    catatan TEXT,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (posyandu_id) REFERENCES posyandu(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ========================
  // 7. KONSULTASI (Telemedicine)
  // ========================
  `CREATE TABLE IF NOT EXISTS konsultasi (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(36) UNIQUE NOT NULL,
    orang_tua_id INT NOT NULL,
    ahli_gizi_id INT,
    balita_id INT,
    topik VARCHAR(255) NOT NULL,
    status ENUM('menunggu', 'aktif', 'selesai', 'dibatalkan') DEFAULT 'menunggu',
    jadwal_konsultasi DATETIME,
    catatan_ahli_gizi TEXT,
    rating INT CHECK (rating >= 1 AND rating <= 5),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (orang_tua_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (ahli_gizi_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (balita_id) REFERENCES balita(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ========================
  // 8. PESAN KONSULTASI (Chat Messages)
  // ========================
  `CREATE TABLE IF NOT EXISTS pesan_konsultasi (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(36) UNIQUE NOT NULL,
    konsultasi_id INT NOT NULL,
    pengirim_id INT NOT NULL,
    pesan TEXT NOT NULL,
    tipe_pesan ENUM('text', 'image', 'file') DEFAULT 'text',
    file_url VARCHAR(255),
    is_read BOOLEAN DEFAULT FALSE,
    is_edited BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (konsultasi_id) REFERENCES konsultasi(id) ON DELETE CASCADE,
    FOREIGN KEY (pengirim_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ========================
  // 9. LAPORAN (Reports)
  // ========================
  `CREATE TABLE IF NOT EXISTS laporan (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(36) UNIQUE NOT NULL,
    judul VARCHAR(255) NOT NULL,
    tipe ENUM('bulanan', 'tahunan', 'custom') NOT NULL,
    format_file ENUM('pdf', 'excel') NOT NULL,
    periode_mulai DATE NOT NULL,
    periode_selesai DATE NOT NULL,
    posyandu_id INT,
    file_path VARCHAR(255),
    generated_by INT,
    status ENUM('generating', 'completed', 'failed') DEFAULT 'generating',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (posyandu_id) REFERENCES posyandu(id) ON DELETE SET NULL,
    FOREIGN KEY (generated_by) REFERENCES users(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ========================
  // 10. ONBOARDING PROGRESS
  // ========================
  `CREATE TABLE IF NOT EXISTS onboarding_progress (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    step_completed INT DEFAULT 0,
    total_steps INT DEFAULT 5,
    is_completed BOOLEAN DEFAULT FALSE,
    completed_steps JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ========================
  // 11. NOTIFICATIONS
  // ========================
  `CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(36) UNIQUE NOT NULL,
    user_id INT NOT NULL,
    judul VARCHAR(255) NOT NULL,
    pesan TEXT NOT NULL,
    tipe ENUM('info', 'warning', 'success', 'konsultasi', 'jadwal', 'laporan') DEFAULT 'info',
    is_read BOOLEAN DEFAULT FALSE,
    link VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ========================
  // INDEXES
  // ========================
  `CREATE INDEX idx_pengukuran_balita ON pengukuran(balita_id, tanggal_pengukuran)`,
  `CREATE INDEX idx_users_role ON users(role)`,
  `CREATE INDEX idx_balita_posyandu ON balita(posyandu_id)`,
  `CREATE INDEX idx_konsultasi_status ON konsultasi(status)`,
  `CREATE INDEX idx_pesan_konsultasi ON pesan_konsultasi(konsultasi_id, created_at)`,
  `CREATE INDEX idx_notifications_user ON notifications(user_id, is_read)`,

  // ALTER for existing databases (add is_edited if missing)
  `ALTER TABLE pesan_konsultasi ADD COLUMN is_edited BOOLEAN DEFAULT FALSE`
];

async function migrate() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'growell_user',
    password: process.env.DB_PASSWORD || 'growell_password_2024',
    database: process.env.DB_NAME || 'growell_db',
  });

  console.log('🚀 Starting database migration...\n');

  for (let i = 0; i < TABLES.length; i++) {
    const sql = TABLES[i];
    const match = sql.match(/(?:TABLE|INDEX)\s+(?:IF NOT EXISTS\s+)?(?:`?(\w+)`?)/i);
    const name = match ? match[1] : `Statement ${i + 1}`;

    try {
      await pool.query(sql);
      console.log(`  ✅ ${name}`);
    } catch (err) {
      if (err.code === 'ER_DUP_KEYNAME' || err.code === 'ER_DUP_FIELDNAME') {
        console.log(`  ⏭️  ${name} (already exists)`);
      } else {
        console.error(`  ❌ ${name}: ${err.message}`);
      }
    }
  }

  console.log('\n✅ Migration completed!');
  await pool.end();
  process.exit(0);
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
