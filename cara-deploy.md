# 🚀 Panduan Deploy Growell ke DigitalOcean

Panduan lengkap step-by-step untuk deploy aplikasi Growell (Next.js + FastAPI ML + MySQL) ke DigitalOcean.

---

## Daftar Isi

1. [Arsitektur Deployment](#1-arsitektur-deployment)
2. [Buat Akun & Pilih Layanan DigitalOcean](#2-buat-akun--pilih-layanan-digitalocean)
3. [Buat Droplet](#3-buat-droplet)
4. [Setup Awal Server](#4-setup-awal-server)
5. [Install Docker & Docker Compose](#5-install-docker--docker-compose)
6. [Upload Project ke Server](#6-upload-project-ke-server)
7. [Konfigurasi Environment](#7-konfigurasi-environment)
8. [Build & Jalankan dengan Docker Compose](#8-build--jalankan-dengan-docker-compose)
9. [Setup Domain & SSL (HTTPS)](#9-setup-domain--ssl-https)
10. [Setup Nginx Reverse Proxy](#10-setup-nginx-reverse-proxy)
11. [Monitoring & Maintenance](#11-monitoring--maintenance)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. Arsitektur Deployment

```
Internet
   │
   ▼
┌─────────────────────────────────┐
│  DigitalOcean Droplet (Ubuntu)  │
│                                 │
│  ┌───────────┐                  │
│  │   Nginx   │ :80 / :443      │
│  │ (reverse  │                  │
│  │  proxy)   │                  │
│  └─────┬─────┘                  │
│        │                        │
│  ┌─────▼─────┐  ┌───────────┐  │
│  │  Next.js  │  │  FastAPI   │  │
│  │  App      │  │  ML Model  │  │
│  │  :3000    │  │  :8000     │  │
│  └─────┬─────┘  └───────────┘  │
│        │                        │
│  ┌─────▼─────┐  ┌───────────┐  │
│  │   MySQL   │  │ phpMyAdmin │  │
│  │   :3306   │  │  :8080     │  │
│  └───────────┘  └───────────┘  │
└─────────────────────────────────┘
```

Semua service berjalan dalam **Docker containers** di satu Droplet.

---

## 2. Buat Akun & Pilih Layanan DigitalOcean

### 2.1 Daftar Akun
1. Buka [https://www.digitalocean.com](https://www.digitalocean.com)
2. Klik **Sign Up** → daftar dengan email/Google/GitHub
3. Masukkan metode pembayaran (kartu kredit atau PayPal)
4. Verifikasi akun

### 2.2 Pilih Layanan: **Droplet** ✅

| Layanan | Cocok? | Alasan |
|---------|--------|--------|
| **Droplet** | ✅ **YA** | VPS Linux penuh, kontrol total, bisa jalankan Docker Compose dengan semua service |
| App Platform | ❌ | Tidak cocok untuk multi-container (Next.js + ML + MySQL sekaligus) |
| Kubernetes | ❌ | Terlalu kompleks dan mahal untuk skala ini |
| Managed Database | ⚠️ Opsional | Bisa dipakai untuk MySQL tapi menambah biaya ($15/bulan) |

**Rekomendasi: Pakai Droplet saja** — semua service dijalankan di satu server.

---

## 3. Buat Droplet

### 3.1 Langkah-Langkah di Dashboard DigitalOcean

1. Login ke [cloud.digitalocean.com](https://cloud.digitalocean.com)
2. Klik tombol hijau **Create** → pilih **Droplets**

### 3.2 Konfigurasi Droplet

| Setting | Pilihan | Penjelasan |
|---------|---------|------------|
| **Region** | **Singapore (SGP1)** | Paling dekat ke Indonesia, latency rendah |
| **OS Image** | **Ubuntu 22.04 (LTS) x64** | Stabil, support Docker |
| **Droplet Type** | **Basic** | Cukup untuk project ini |
| **CPU Options** | **Regular (SSD)** | Pilih yang regular, bukan premium |
| **Plan/Size** | **$12/bulan** (2 GB RAM / 1 vCPU / 50 GB SSD) | Minimum untuk ML model. Jika budget memungkinkan, pilih **$24/bulan** (4 GB RAM / 2 vCPU) agar ML service lebih cepat |
| **Backups** | ✅ Aktifkan ($2.40/bulan) | Backup otomatis mingguan |
| **Authentication** | **SSH Key** (direkomendasikan) | Lebih aman dari password |
| **Hostname** | `growell-production` | Nama server |

### 3.3 Setup SSH Key (jika belum punya)

Buka PowerShell di laptop dan jalankan:

```powershell
# Generate SSH key
ssh-keygen -t ed25519 -C "email@kamu.com"

# Tekan Enter 3x (default path, tanpa passphrase)

# Copy isi public key
Get-Content ~/.ssh/id_ed25519.pub | Set-Clipboard
```

Kemudian paste key tersebut di form SSH Key saat membuat Droplet.

### 3.4 Selesaikan
- Klik **Create Droplet**
- Tunggu ~60 detik sampai Droplet siap
- Catat **IP Address** yang muncul (contoh: `159.89.xxx.xxx`)

---

## 4. Setup Awal Server

### 4.1 Login ke Server

```powershell
# Dari PowerShell / Terminal lokal
ssh root@159.89.xxx.xxx
```

### 4.2 Update & Security Setup

```bash
# Update semua packages
apt update && apt upgrade -y

# Set timezone Jakarta
timedatectl set-timezone Asia/Jakarta

# Install essential tools
apt install -y curl wget git nano htop ufw

# Setup Firewall
ufw allow OpenSSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw --force enable

# Verifikasi firewall
ufw status
```

### 4.3 Buat User Non-Root (Opsional tapi Direkomendasikan)

```bash
# Buat user baru
adduser growell
usermod -aG sudo growell

# Copy SSH key ke user baru
rsync --archive --chown=growell:growell ~/.ssh /home/growell

# Dari sini, bisa login sebagai user growell:
# ssh growell@159.89.xxx.xxx
```

---

## 5. Install Docker & Docker Compose

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Tambahkan user ke docker group (jika pakai user non-root)
usermod -aG docker growell  # atau user kalian

# Install Docker Compose plugin
apt install -y docker-compose-plugin

# Verifikasi instalasi
docker --version
docker compose version

# Pastikan Docker berjalan
systemctl enable docker
systemctl start docker
```

---

## 6. Upload Project ke Server

### Opsi A: Upload via Git (Direkomendasikan) ✅

```bash
# Di server
cd /home/growell  # atau /root
mkdir -p /var/www
cd /var/www

# Clone dari GitHub
git clone https://github.com/USERNAME/REPO_NAME.git growell
cd growell
```

### Opsi B: Upload via SCP (dari laptop)

```powershell
# Di PowerShell laptop, dari folder project
# Compress dulu agar lebih cepat
Compress-Archive -Path "C:\Users\user\Downloads\Website Inno\*" -DestinationPath project.zip

# Upload ke server
scp project.zip root@159.89.xxx.xxx:/var/www/

# Di server, extract
cd /var/www
apt install -y unzip
unzip project.zip -d growell
cd growell
```

### Opsi C: Upload via SFTP (FileZilla)

1. Download dan install [FileZilla](https://filezilla-project.org/)
2. Buat koneksi:
   - Host: `sftp://159.89.xxx.xxx`
   - Username: `root`
   - Password: (atau gunakan key file)
   - Port: `22`
3. Upload seluruh folder project ke `/var/www/growell`

---

## 7. Konfigurasi Environment

### 7.1 Buat File .env.local untuk Next.js

```bash
cd /var/www/growell/Growell
nano .env.local
```

Isi dengan:

```env
# Database (sesuaikan dengan docker-compose.yml)
DB_HOST=db
DB_PORT=3306
DB_USER=growell_user
DB_PASSWORD=growell_password_2024
DB_NAME=growell_db

# JWT
JWT_SECRET=GANTI_DENGAN_STRING_RANDOM_PANJANG_MINIMAL_32_KARAKTER
JWT_EXPIRES_IN=7d

# ML Service
ML_SERVICE_URL=http://ml:8000
ML_API_KEY=growell123

# Public URLs (ganti dengan domain atau IP kamu)
NEXT_PUBLIC_APP_URL=http://159.89.xxx.xxx
NEXT_PUBLIC_ML_SERVICE_URL=http://159.89.xxx.xxx:8000

# Upload
UPLOAD_DIR=./uploads
```

> ⚠️ **PENTING:** Ganti `JWT_SECRET` dengan string random yang kuat!
> Bisa generate dengan: `openssl rand -base64 48`

### 7.2 Buat File .env untuk ML Service

```bash
cd /var/www/growell/ml_baru
nano .env
```

Isi dengan:

```env
API_KEY=growell123
```

### 7.3 Update docker-compose.yml untuk Production

```bash
cd /var/www/growell
nano docker-compose.yml
```

Ubah bagian environment di service `app`:

```yaml
    environment:
      - DB_HOST=db
      - DB_PORT=3306
      - DB_USER=growell_user
      - DB_PASSWORD=growell_password_2024
      - DB_NAME=growell_db
      - JWT_SECRET=GANTI_DENGAN_STRING_RANDOM_PANJANG
      - JWT_EXPIRES_IN=7d
      - ML_SERVICE_URL=http://ml:8000
      - ML_API_KEY=growell123
      - NEXT_PUBLIC_APP_URL=https://domain-kamu.com
      - NEXT_PUBLIC_ML_SERVICE_URL=https://domain-kamu.com/api/ml
      - UPLOAD_DIR=./uploads
```

> ⚠️ Ganti semua password default sebelum deploy production!

---

## 8. Build & Jalankan dengan Docker Compose

### 8.1 Build Semua Image

```bash
cd /var/www/growell

# Build semua service (pertama kali butuh ~10-15 menit)
docker compose build --no-cache
```

### 8.2 Jalankan Semua Service

```bash
# Jalankan di background
docker compose up -d
```

### 8.3 Cek Status

```bash
# Lihat semua container
docker compose ps

# Output yang diharapkan:
# NAME              STATUS              PORTS
# growell-db        Up (healthy)        3306
# growell-ml        Up (healthy)        8000
# growell-app       Up                  3000
# growell-phpmyadmin Up                 8080
```

### 8.4 Jalankan Migrasi Database

```bash
# Jalankan migrasi tabel
docker compose exec app node scripts/migrate.js

# (Opsional) Jalankan seeder untuk data awal
docker compose exec app node scripts/seed.js
```

### 8.5 Cek Log Jika Ada Error

```bash
# Lihat log semua service
docker compose logs -f

# Lihat log service tertentu
docker compose logs -f app
docker compose logs -f ml
docker compose logs -f db
```

### 8.6 Test Akses

- **Next.js App:** `http://159.89.xxx.xxx:3000`
- **ML API:** `http://159.89.xxx.xxx:8000/health`
- **phpMyAdmin:** `http://159.89.xxx.xxx:8080`

---

## 9. Setup Domain & SSL (HTTPS)

### 9.1 Beli Domain (jika belum punya)

Beli domain di registrar seperti:
- [Niagahoster](https://www.niagahoster.co.id) (Indonesia)
- [Namecheap](https://www.namecheap.com) (Internasional)
- [Cloudflare Registrar](https://www.cloudflare.com/products/registrar/)

### 9.2 Arahkan Domain ke Droplet

**Di dashboard DNS registrar/DigitalOcean:**

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | @ | `159.89.xxx.xxx` | 3600 |
| A | www | `159.89.xxx.xxx` | 3600 |

Atau bisa kelola DNS di DigitalOcean:
1. Dashboard → **Networking** → **Domains**
2. Tambahkan domain kamu
3. Buat A record pointing ke IP Droplet

### 9.3 Install Certbot untuk SSL

```bash
# Install certbot
apt install -y certbot python3-certbot-nginx
```

SSL akan di-setup setelah Nginx reverse proxy dikonfigurasi (lihat langkah 10).

---

## 10. Setup Nginx Reverse Proxy

### 10.1 Install Nginx

```bash
apt install -y nginx
systemctl enable nginx
systemctl start nginx
```

### 10.2 Konfigurasi Nginx

```bash
nano /etc/nginx/sites-available/growell
```

Isi dengan:

```nginx
# Redirect HTTP → HTTPS (aktifkan setelah SSL ada)
# server {
#     listen 80;
#     server_name domain-kamu.com www.domain-kamu.com;
#     return 301 https://$server_name$request_uri;
# }

server {
    listen 80;
    server_name domain-kamu.com www.domain-kamu.com;

    # Batas upload file 50MB
    client_max_body_size 50M;

    # Next.js App
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 120s;
        proxy_connect_timeout 120s;
    }

    # ML API (opsional: akses ML via /api/ml/)
    location /api/ml/ {
        rewrite ^/api/ml/(.*) /$1 break;
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 300s;  # ML bisa lama
    }

    # phpMyAdmin (HAPUS di production atau tambahkan auth!)
    location /phpmyadmin/ {
        proxy_pass http://localhost:8080/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Static files caching
    location /_next/static {
        proxy_pass http://localhost:3000;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
}
```

### 10.3 Aktifkan Konfigurasi

```bash
# Hapus default config
rm /etc/nginx/sites-enabled/default

# Aktifkan growell config
ln -s /etc/nginx/sites-available/growell /etc/nginx/sites-enabled/

# Test konfigurasi
nginx -t

# Restart nginx
systemctl restart nginx
```

### 10.4 Setup SSL dengan Certbot

```bash
# Generate SSL certificate
certbot --nginx -d domain-kamu.com -d www.domain-kamu.com

# Ikuti instruksi:
# 1. Masukkan email
# 2. Agree to ToS: Y
# 3. Share email: N (opsional)
# 4. Redirect HTTP to HTTPS: 2 (redirect)

# Certbot akan otomatis update konfigurasi Nginx

# Verifikasi auto-renewal
certbot renew --dry-run
```

### 10.5 Setelah SSL Aktif

Update `NEXT_PUBLIC_APP_URL` di docker-compose.yml:

```bash
cd /var/www/growell
nano docker-compose.yml

# Ubah:
# NEXT_PUBLIC_APP_URL=https://domain-kamu.com
```

Lalu rebuild:

```bash
docker compose up -d --build app
```

---

## 11. Monitoring & Maintenance

### 11.1 Perintah Penting Sehari-hari

```bash
# Cek status semua container
docker compose ps

# Restart satu service
docker compose restart app
docker compose restart ml
docker compose restart db

# Lihat log real-time
docker compose logs -f app

# Masuk ke container
docker compose exec app sh
docker compose exec db mysql -u growell_user -p growell_db

# Stop semua
docker compose down

# Stop & hapus semua data (BERBAHAYA)
docker compose down -v
```

### 11.2 Update Aplikasi

```bash
cd /var/www/growell

# Pull kode terbaru dari git
git pull origin main

# Rebuild & restart (tanpa downtime)
docker compose up -d --build app

# Jika ada perubahan database
docker compose exec app node scripts/migrate.js
```

### 11.3 Backup Database

```bash
# Backup manual
docker compose exec db mysqldump -u growell_user -pgrowell_password_2024 growell_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore dari backup
docker compose exec -T db mysql -u growell_user -pgrowell_password_2024 growell_db < backup_file.sql
```

### 11.4 Setup Auto-Backup (Cron Job)

```bash
# Buat script backup
nano /var/www/growell/backup.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/var/www/growell/backups"
mkdir -p $BACKUP_DIR
FILENAME="$BACKUP_DIR/growell_$(date +%Y%m%d_%H%M%S).sql.gz"
docker compose -f /var/www/growell/docker-compose.yml exec -T db mysqldump -u growell_user -pgrowell_password_2024 growell_db | gzip > $FILENAME
# Hapus backup lebih dari 7 hari
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete
echo "Backup selesai: $FILENAME"
```

```bash
chmod +x /var/www/growell/backup.sh

# Setup cron job (backup setiap hari jam 2 pagi)
crontab -e

# Tambahkan baris ini:
0 2 * * * /var/www/growell/backup.sh >> /var/log/growell-backup.log 2>&1
```

### 11.5 Monitor Resource

```bash
# Cek penggunaan CPU/RAM
htop

# Cek disk space
df -h

# Cek docker disk usage
docker system df

# Bersihkan docker cache (jika disk penuh)
docker system prune -a --volumes
```

---

## 12. Troubleshooting

### Error: Container keluar terus (Exit Code 1)

```bash
# Cek log detail
docker compose logs app

# Biasanya masalah:
# 1. .env.local tidak ada / salah → cek konfigurasi
# 2. Database belum ready → restart: docker compose restart app
# 3. Build error → rebuild: docker compose build --no-cache app
```

### Error: Database Connection Refused

```bash
# Cek apakah MySQL container healthy
docker compose ps db

# Cek log MySQL
docker compose logs db

# Restart database
docker compose restart db

# Tunggu ~30 detik, lalu restart app
docker compose restart app
```

### Error: ML Service Tidak Merespons

```bash
# Cek log ML
docker compose logs ml

# Test ML health
curl http://localhost:8000/health

# ML model butuh RAM cukup. Jika OOM:
# → Upgrade Droplet ke 4GB RAM
```

### Error: Port Already in Use

```bash
# Cek siapa yang pakai port
lsof -i :3000
lsof -i :8000

# Kill proses yang mengganggu
kill -9 <PID>
```

### Error: Nginx 502 Bad Gateway

```bash
# Pastikan container app berjalan
docker compose ps

# Restart Nginx
systemctl restart nginx

# Cek log Nginx
tail -f /var/log/nginx/error.log
```

### Error: SSL Certificate Expired

```bash
# Renew certificate
certbot renew

# Restart Nginx
systemctl restart nginx
```

### Disk Penuh

```bash
# Cek penggunaan
df -h
du -sh /var/www/growell/*

# Bersihkan Docker
docker system prune -a

# Hapus backup lama
find /var/www/growell/backups -mtime +30 -delete

# Bersihkan log
truncate -s 0 /var/log/nginx/access.log
```

---

## Rangkuman Biaya Bulanan

| Item | Biaya/bulan |
|------|------------|
| Droplet 2GB RAM | $12 |
| Droplet 4GB RAM (rekomendasi) | $24 |
| Backup otomatis | +$2.40 atau +$4.80 |
| Domain .com | ~$10-12/tahun (~$1/bulan) |
| SSL (Let's Encrypt) | **Gratis** |
| **Total minimum** | **~$14.40/bulan** |
| **Total rekomendasi** | **~$29.80/bulan** |

---

## Checklist Deploy ✅

- [ ] Buat akun DigitalOcean
- [ ] Buat Droplet (Ubuntu 22.04, Singapore, 2-4 GB RAM)
- [ ] Setup SSH dan firewall
- [ ] Install Docker dan Docker Compose
- [ ] Upload project ke server
- [ ] Konfigurasi environment variables
- [ ] Ganti semua password default!
- [ ] `docker compose build`
- [ ] `docker compose up -d`
- [ ] Jalankan migrasi database
- [ ] Test akses via IP
- [ ] Beli & arahkan domain
- [ ] Setup Nginx reverse proxy
- [ ] Setup SSL (HTTPS)
- [ ] Setup auto-backup database
- [ ] Hapus/protect phpMyAdmin di production

---

> **Catatan:** Panduan ini mengasumsikan semua service (Next.js, ML, MySQL) berjalan di satu Droplet menggunakan Docker Compose yang sudah ada di project. Untuk skala yang lebih besar (ribuan user), pertimbangkan untuk memisahkan database ke Managed Database dan menggunakan load balancer.
