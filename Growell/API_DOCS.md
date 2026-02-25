# Growell API Documentation

## 📌 Base URL
```
http://localhost:3000/api
```

## 🔐 Authentication
Semua endpoint yang dilindungi memerlukan token JWT di header:
```
Authorization: Bearer <token>
```

---

## 1. AUTH

### POST /api/auth/register
Registrasi user baru.

**Body:**
```json
{
  "nama": "string (wajib)",
  "email": "string (wajib)",
  "password": "string (min 6, wajib)",
  "role": "kader | orang_tua | puskesmas | kelurahan | ahli_gizi (wajib)",
  "no_telepon": "string (opsional)",
  "alamat": "string (opsional)"
}
```

**Response (201):**
```json
{
  "message": "Registrasi berhasil",
  "token": "jwt_token",
  "user": { "id": 1, "uuid": "...", "nama": "...", "email": "...", "role": "...", "is_new_user": true }
}
```

### POST /api/auth/login
Login user.

**Body:**
```json
{ "email": "string", "password": "string" }
```

**Response (200):**
```json
{
  "message": "Login berhasil",
  "token": "jwt_token",
  "user": { ... , "onboarding": { ... } }
}
```

### GET /api/auth/profile 🔒
Get profil user yang sedang login.

### PUT /api/auth/profile 🔒
Update profil (nama, no_telepon, alamat) atau ganti password (currentPassword + newPassword).

---

## 2. BALITA

### GET /api/balita 🔒
Daftar balita (difilter berdasarkan role).

**Query Params:** `page`, `limit`, `search`, `posyandu_id`

### POST /api/balita 🔒 (kader, puskesmas, orang_tua)
Tambah balita baru.

### GET /api/balita/[uuid] 🔒
Detail balita + riwayat pengukuran + survey terbaru.

### PUT /api/balita/[uuid] 🔒 (kader, puskesmas, orang_tua)
Update data balita.

### DELETE /api/balita/[uuid] 🔒 (kader, puskesmas)
Soft delete balita.

---

## 3. PENGUKURAN

### POST /api/pengukuran 🔒 (kader, puskesmas)
Tambah pengukuran + **otomatis prediksi ML** status gizi.

**Body:**
```json
{
  "balita_id": "int atau uuid",
  "tanggal_pengukuran": "YYYY-MM-DD",
  "berat_badan": "float (kg)",
  "tinggi_badan": "float (cm)",
  "lingkar_lengan": "float (cm, opsional)",
  "lingkar_kepala": "float (cm, opsional)",
  "catatan": "string (opsional)"
}
```

**Response:** Prediksi BB/U, TB/U, BB/TB + rekomendasi intervensi.

### GET /api/pengukuran/balita/[balitaUuid] 🔒
Riwayat pengukuran per balita.

### GET /api/pengukuran/stats/dashboard 🔒 (kader, puskesmas, kelurahan)
Statistik dashboard: total balita, balita berisiko, distribusi status gizi, tren bulanan.

---

## 4. KONSULTASI (Telemedicine)

### GET /api/konsultasi 🔒
Daftar konsultasi saya.

**Query Params:** `status` (menunggu, aktif, selesai, dibatalkan), `page`, `limit`

### POST /api/konsultasi 🔒 (orang_tua)
Buat permintaan konsultasi baru (otomatis assign ke ahli gizi tersedia).

**Body:**
```json
{
  "topik": "string (wajib)",
  "jadwal_konsultasi": "ISO 8601 datetime (opsional)",
  "balita_id": "int (opsional)"
}
```

### GET /api/konsultasi/[uuid] 🔒
Detail konsultasi + riwayat chat.

### PUT /api/konsultasi/[uuid] 🔒 (ahli_gizi, puskesmas)
Update status konsultasi.

### POST /api/konsultasi/[uuid]/message 🔒
Kirim pesan chat.

**Body:**
```json
{ "pesan": "string (wajib)", "tipe_pesan": "text | image | file", "file_url": "string" }
```

### POST /api/konsultasi/[uuid]/rate 🔒 (orang_tua)
Beri rating konsultasi (1-5).

---

## 5. LAPORAN

### GET /api/laporan 🔒 (kader, puskesmas, kelurahan)
Daftar laporan yang sudah dibuat.

### POST /api/laporan/generate 🔒 (kader, puskesmas, kelurahan)
Generate laporan baru (PDF/Excel).

**Body:**
```json
{
  "tipe": "bulanan | tahunan | custom",
  "format_file": "pdf | excel",
  "periode_mulai": "YYYY-MM-DD",
  "periode_selesai": "YYYY-MM-DD",
  "posyandu_id": "int (opsional)"
}
```

### GET /api/laporan/download/[uuid] 🔒
Download file laporan.

---

## 6. ONBOARDING

### GET /api/onboarding 🔒
Status onboarding + daftar step berdasarkan role.

### POST /api/onboarding 🔒
Complete step atau skip onboarding.

**Body:**
```json
{ "step_id": "string" }          // complete step
{ "action": "skip" }             // skip all
```

---

## 7. NOTIFICATIONS

### GET /api/notifications 🔒
Daftar notifikasi.

**Query Params:** `page`, `limit`, `unread_only` (true/false)

### PUT /api/notifications 🔒
Mark semua notifikasi as read.

### PUT /api/notifications/[uuid] 🔒
Mark satu notifikasi as read.

---

## 8. POSYANDU

### GET /api/posyandu 🔒
Daftar posyandu.

### POST /api/posyandu 🔒 (puskesmas, kelurahan)
Tambah posyandu baru.

### GET /api/posyandu/[uuid] 🔒
Detail posyandu + jadwal mendatang.

---

## 9. HEALTH CHECK

### GET /api/health
Cek status API dan ML service (tanpa auth).

---

## 🐳 Docker Commands

```bash
# Start semua services
docker-compose up -d

# Jalankan migrasi database
docker exec growell-app node scripts/migrate.js

# Seed data demo
docker exec growell-app node scripts/seed.js

# Lihat logs
docker-compose logs -f app
docker-compose logs -f ml
docker-compose logs -f db

# Stop semua
docker-compose down

# Stop + hapus data
docker-compose down -v
```

## 🔧 Local Development

```bash
# 1. Install dependencies
cd Growell && npm install

# 2. Setup MySQL lokal atau pakai Docker
docker-compose up -d db

# 3. Jalankan migrasi
npm run db:migrate

# 4. Seed data demo (opsional)
npm run db:seed

# 5. Start ML service
cd ml_baru && pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 8000

# 6. Start Next.js dev server
cd Growell && npm run dev
```
