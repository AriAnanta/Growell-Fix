# 🌱 Growell - Platform Posyandu Digital

Platform digital untuk pemantauan tumbuh kembang balita dengan prediksi status gizi berbasis AI (Machine Learning), konsultasi online dengan ahli gizi (telemedicine), dan manajemen laporan otomatis.

---

## 📋 Daftar Isi

1. [Arsitektur Sistem](#arsitektur-sistem)
2. [Prasyarat](#prasyarat)
3. [Setup dengan Docker (Recommended)](#setup-dengan-docker)
4. [Setup Manual (Development)](#setup-manual-development)
5. [Sistem Autentikasi & Peran](#sistem-autentikasi--peran)
6. [Fitur Utama](#fitur-utama)
7. [API Documentation](#api-documentation)
8. [Troubleshooting](#troubleshooting)

---

## 🏗️ Arsitektur Sistem

```
┌─────────────────────────────────────────────────────┐
│                   Docker Compose                     │
│                                                      │
│  ┌──────────┐   ┌──────────────┐   ┌──────────────┐ │
│  │  MySQL    │   │  Next.js App │   │  ML Service  │ │
│  │  :3306    │◄──│  :3000       │──►│  FastAPI     │ │
│  │  Database │   │  Frontend +  │   │  :8000       │ │
│  │           │   │  Backend API │   │  Prediction  │ │
│  └──────────┘   └──────────────┘   └──────────────┘ │
│                                                      │
└─────────────────────────────────────────────────────┘
```

| Service | Teknologi | Port | Deskripsi |
|---------|-----------|------|-----------|
| **db** | MySQL 8.0 | 3306 | Database utama |
| **app** | Next.js 14 + React 18 | 3000 | Frontend + Backend API |
| **ml** | FastAPI + Python | 8000 | Model ML prediksi gizi |

---

## ⚙️ Prasyarat

### Untuk Docker (Recommended):
- **Docker Desktop** versi 20.10+ ([Download](https://www.docker.com/products/docker-desktop))
- **Docker Compose** v2+ (sudah termasuk di Docker Desktop)
- **RAM minimal:** 4 GB
- **Storage minimal:** 5 GB

### Untuk Development Manual:
- **Node.js** versi 18+ ([Download](https://nodejs.org))
- **MySQL** versi 8.0+ ([Download](https://dev.mysql.com/downloads/))
- **Python** 3.9+ (untuk ML Service)
- **Git**

---

## 🐳 Setup dengan Docker

### Langkah 1: Clone / Download Repository

```bash
# Pastikan Anda berada di root folder "Website Inno"
cd "Website Inno"
```

Struktur folder harus seperti ini:
```
Website Inno/
├── Growell/              # Next.js App (Frontend + Backend)
│   ├── app/              # Next.js App Router pages
│   ├── components/       # React components
│   ├── lib/              # Backend utilities (db, auth)
│   ├── scripts/          # Migration & seed scripts
│   ├── utils/            # Frontend utilities
│   ├── Dockerfile
│   └── package.json
├── ml_baru/              # ML Service (FastAPI)
│   ├── Dockerfile
│   └── ...
└── docker-compose.yml
```

### Langkah 2: Build dan Jalankan

```bash
# Build semua container (pertama kali akan memakan waktu 5-10 menit)
docker-compose build

# Jalankan semua service
docker-compose up -d
```

### Langkah 3: Verifikasi

```bash
# Cek status semua container
docker-compose ps

# Output yang diharapkan:
# NAME            STATUS              PORTS
# growell-db      Up (healthy)        0.0.0.0:3306->3306/tcp
# growell-app     Up                  0.0.0.0:3000->3000/tcp
# growell-ml      Up                  0.0.0.0:8000->8000/tcp
```

### Langkah 4: Akses Aplikasi

| URL | Deskripsi |
|-----|-----------|
| http://localhost:3000 | 🌐 Aplikasi Growell |
| http://localhost:8000/docs | 📄 ML API Docs (Swagger) |

### Langkah 5: Login dengan Akun Demo

Setelah container berjalan, database akan otomatis di-migrate dan di-seed. Gunakan akun demo berikut:

| Peran | Email | Password |
|-------|-------|----------|
| **Kader Posyandu** | kader@growell.id | password123 |
| **Orang Tua** | orangtua@growell.id | password123 |
| **Ahli Gizi** | ahligizi@growell.id | password123 |
| **Puskesmas** | puskesmas@growell.id | password123 |
| **Kelurahan** | kelurahan@growell.id | password123 |

### Perintah Docker Berguna

```bash
# Lihat log aplikasi
docker-compose logs -f app

# Lihat log database
docker-compose logs -f db

# Lihat log ML service
docker-compose logs -f ml

# Restart semua service
docker-compose restart

# Stop semua service
docker-compose down

# Stop dan hapus semua data (HATI-HATI: database dihapus!)
docker-compose down -v

# Rebuild setelah ada perubahan kode
docker-compose build --no-cache
docker-compose up -d
```

---

## 🛠️ Setup Manual (Development)

### Langkah 1: Setup Database MySQL

```bash
# Login ke MySQL
mysql -u root -p

# Buat database dan user
CREATE DATABASE growell_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'growell_user'@'localhost' IDENTIFIED BY 'growell_password_2024';
GRANT ALL PRIVILEGES ON growell_db.* TO 'growell_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### Langkah 2: Install Dependencies

```bash
cd Growell
npm install
```

### Langkah 3: Konfigurasi Environment

File `.env.local` sudah tersedia dengan konfigurasi default:

```env
# MySQL Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=growell_user
DB_PASSWORD=growell_password_2024
DB_NAME=growell_db

# JWT
JWT_SECRET=growell_jwt_secret_key_2024_very_secure
JWT_EXPIRES_IN=7d

# ML Service
ML_SERVICE_URL=http://localhost:8000
ML_API_KEY=growell123
NEXT_PUBLIC_ML_SERVICE_URL=http://localhost:8000

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
UPLOAD_DIR=./uploads
```

### Langkah 4: Migrasi dan Seed Database

```bash
# Migrasi (buat tabel)
npm run db:migrate

# Seed (isi data demo)
npm run db:seed
```

### Langkah 5: Jalankan Development Server

```bash
npm run dev
```

Buka http://localhost:3000 di browser.

### Langkah 6: (Opsional) Jalankan ML Service

```bash
cd ../ml_baru
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

---

## 🔐 Sistem Autentikasi & Peran

### Skema Pendaftaran

**Keamanan penting:** Registrasi publik (halaman `/register`) **hanya membuat akun Orang Tua**. Hal ini mencegah orang tidak berwenang mendaftarkan diri sebagai Kader, Ahli Gizi, dll.

| Metode | Peran yang Dibuat | Cara Akses |
|--------|------------------|------------|
| Halaman Register | `orang_tua` saja | Publik, siapa saja bisa daftar |
| Seed Script | Semua peran | `npm run db:seed` oleh admin |
| Database langsung | Semua peran | Akses MySQL oleh admin |

### Daftar Peran & Hak Akses

| Peran | Kode | Hak Akses |
|-------|------|-----------|
| **Orang Tua** | `orang_tua` | Kuesioner gizi, konsultasi online, lihat hasil prediksi anak |
| **Kader Posyandu** | `kader` | Input data antropometri, prediksi gizi AI, buat laporan, kelola data balita |
| **Ahli Gizi** | `ahli_gizi` | Terima & jawab konsultasi online, berikan rekomendasi intervensi |
| **Puskesmas** | `puskesmas` | Dashboard monitoring, laporan wilayah, kelola konsultasi |
| **Kelurahan** | `kelurahan` | Dashboard statistik, laporan tahunan, monitoring |

### Cara Menambah Akun Non-Orang Tua

```bash
# Opsi 1: Melalui seed script
npm run db:seed

# Opsi 2: Langsung via MySQL
mysql -u growell_user -p growell_db

INSERT INTO users (uuid, nama, email, password, role, is_new_user)
VALUES (UUID(), 'Nama Kader Baru', 'kaderbaru@email.com',
        '$2a$10$xxxxx', -- hash dari bcrypt (gunakan script node untuk generate)
        'kader', FALSE);
```

Untuk generate password hash:
```bash
node -e "const bcrypt=require('bcryptjs'); bcrypt.hash('password123',10).then(h=>console.log(h))"
```

---

## ✨ Fitur Utama

### 1. 🤖 Prediksi Status Gizi (AI/ML)
- Prediksi status gizi BB/U, TB/U, BB/TB menggunakan model Machine Learning
- Support dua mode: prediksi cepat (data antropometri saja) dan predict-ta (dengan kuesioner lengkap)
- Integrasi dengan ML Service FastAPI

### 2. 💬 Konsultasi Online (Telemedicine)
- **Orang Tua** dapat membuat permintaan konsultasi baru
- **Ahli Gizi** menerima notifikasi dan dapat membalas
- Chat real-time dengan polling setiap 5 detik
- Status konsultasi: Menunggu → Aktif → Selesai
- Notifikasi untuk pesan baru

**Cara Menggunakan:**
1. Login sebagai Orang Tua
2. Buka menu **Konsultasi** → Klik **Konsultasi Baru**
3. Tuliskan topik/keluhan → Kirim
4. Ahli Gizi akan menerima notifikasi dan membalas
5. Chat berlangsung hingga Ahli Gizi mengakhiri konsultasi

### 3. 📊 Manajemen Laporan & Ekspor Data
- Generate laporan **Bulanan**, **Tahunan**, atau **Custom**
- Format: **PDF** atau **Excel (XLSX)**
- Isi laporan: Ringkasan status gizi + detail pengukuran per balita
- Color-coded untuk status gizi (hijau=baik, kuning=kurang, merah=buruk)
- Download file langsung dari browser

**Cara Menggunakan:**
1. Login sebagai Kader/Puskesmas/Kelurahan
2. Buka menu **Laporan** dari sidebar atau dashboard
3. Pilih tipe, format, dan periode
4. Klik **Buat Laporan**
5. Download dari riwayat laporan

### 4. 📝 Kuesioner Orang Tua (83 Pertanyaan)
- Form komprehensif faktor risiko stunting
- Mencakup: riwayat kelahiran, gizi ibu, ASI/MPASI, vaksinasi, lingkungan, ekonomi
- Data disimpan untuk prediksi ML yang lebih akurat

### 5. 📋 Dashboard Kader
- Input data antropometri balita (BB, TB, Lingkar Kepala, LiLA)
- Statistik real-time dari database
- Hasil prediksi AI ditampilkan langsung
- Daftar data balita terbaru

---

## 📡 API Documentation

### Authentication

Semua endpoint yang membutuhkan autentikasi menggunakan header:
```
Authorization: Bearer <jwt_token>
```

### Endpoints

#### Auth
| Method | Endpoint | Deskripsi | Auth |
|--------|----------|-----------|------|
| `POST` | `/api/auth/register` | Registrasi (orang_tua saja) | ❌ |
| `POST` | `/api/auth/login` | Login | ❌ |
| `GET` | `/api/auth/profile` | Get profile | ✅ |
| `PUT` | `/api/auth/profile` | Update profile | ✅ |

#### Balita
| Method | Endpoint | Deskripsi | Auth |
|--------|----------|-----------|------|
| `GET` | `/api/balita` | List semua balita | ✅ |
| `POST` | `/api/balita` | Tambah balita baru | ✅ Kader |
| `GET` | `/api/balita/[uuid]` | Detail balita | ✅ |

#### Pengukuran
| Method | Endpoint | Deskripsi | Auth |
|--------|----------|-----------|------|
| `GET` | `/api/pengukuran` | List pengukuran | ✅ |
| `POST` | `/api/pengukuran` | Tambah pengukuran | ✅ Kader |
| `GET` | `/api/pengukuran/stats/dashboard` | Dashboard stats | ✅ |

#### Konsultasi (Telemedicine)
| Method | Endpoint | Deskripsi | Auth |
|--------|----------|-----------|------|
| `GET` | `/api/konsultasi` | List konsultasi | ✅ |
| `POST` | `/api/konsultasi` | Buat konsultasi baru | ✅ Orang Tua |
| `GET` | `/api/konsultasi/[uuid]` | Detail + pesan | ✅ |
| `PUT` | `/api/konsultasi/[uuid]` | Update status | ✅ Ahli Gizi |
| `POST` | `/api/konsultasi/[uuid]/message` | Kirim pesan | ✅ |

#### Laporan
| Method | Endpoint | Deskripsi | Auth |
|--------|----------|-----------|------|
| `GET` | `/api/laporan` | List laporan | ✅ Kader/Puskesmas/Kelurahan |
| `POST` | `/api/laporan/generate` | Buat laporan baru | ✅ Kader/Puskesmas/Kelurahan |
| `GET` | `/api/laporan/download/[uuid]` | Download file | ✅ |

#### ML Prediction
| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| `POST` | `ML_URL/predict` | Prediksi cepat (data antropometri) |
| `POST` | `ML_URL/predict-ta` | Prediksi lengkap (dengan kuesioner) |

---

## 🔧 Troubleshooting

### 1. Container tidak bisa start

```bash
# Cek log error
docker-compose logs app

# Pastikan port 3000, 3306, 8000 tidak dipakai
netstat -ano | findstr :3000
netstat -ano | findstr :3306
```

### 2. Database connection refused

```bash
# Pastikan container database sudah healthy
docker-compose ps

# Cek log database
docker-compose logs db

# Restart database
docker-compose restart db
```

### 3. ML Service tidak bisa diakses

```bash
# Cek status ML container
docker-compose logs ml

# ML service mungkin butuh waktu untuk load model
# Tunggu 30-60 detik setelah container start
```

### 4. Rebuild setelah perubahan kode

```bash
# Stop semua
docker-compose down

# Build ulang tanpa cache
docker-compose build --no-cache

# Jalankan kembali
docker-compose up -d
```

### 5. Reset database (hapus semua data)

```bash
# Stop dan hapus volume
docker-compose down -v

# Jalankan ulang (akan migrate & seed otomatis)
docker-compose up -d
```

---

## 📁 Struktur Proyek

```
Growell/
├── app/                          # Next.js App Router
│   ├── page.js                   # Landing page
│   ├── layout.js                 # Root layout
│   ├── globals.css               # Global styles + Tailwind
│   ├── login/page.js             # Halaman login
│   ├── register/page.js          # Halaman registrasi (orang_tua only)
│   ├── kader/page.js             # Dashboard kader
│   ├── profile/page.js           # Profil user
│   ├── data-balita/page.js       # Daftar data balita
│   ├── orang-tua/page.js         # Form kuesioner orang tua
│   ├── konsultasi/               # Telemedicine
│   │   ├── page.js               # Daftar konsultasi
│   │   └── [uuid]/page.js        # Chat konsultasi
│   ├── laporan/page.js           # Manajemen laporan
│   └── api/                      # Backend API routes
│       ├── auth/                 # Login, Register, Profile
│       ├── balita/               # CRUD Balita
│       ├── pengukuran/           # CRUD Pengukuran
│       ├── konsultasi/           # Konsultasi & Chat
│       ├── laporan/              # Generate & Download
│       └── health/               # Health check
├── components/                   # Shared React components
│   ├── common/                   # Breadcrumb, SuccessModal
│   └── forms/                    # CustomDatePicker, CustomDropdown
├── lib/                          # Backend utilities
│   ├── db.js                     # MySQL connection pool
│   └── auth.js                   # JWT auth helpers
├── utils/                        # Frontend utilities
│   └── auth.js                   # Client-side auth (localStorage)
├── scripts/                      # Database scripts
│   ├── migrate.js                # Create tables
│   └── seed.js                   # Insert demo data
├── public/                       # Static assets
├── Dockerfile                    # Docker build config
├── docker-entrypoint.sh          # Docker entrypoint (wait for db)
├── next.config.mjs               # Next.js configuration
├── tailwind.config.js            # Tailwind CSS configuration
└── package.json                  # Dependencies
```

---

## 📄 Lisensi

© 2025 Growell Indonesia. All rights reserved.
