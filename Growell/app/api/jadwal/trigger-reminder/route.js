import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import pool from '@/lib/db';

export async function POST(request) {
  try {
    // 1. Get the System User
    const [sysUsers] = await pool.query(
      "SELECT id FROM users WHERE email = 'system@growell.com' LIMIT 1"
    );
    if (sysUsers.length === 0) {
      return NextResponse.json({ error: 'System user not found' }, { status: 500 });
    }
    const systemUserId = sysUsers[0].id;

    // 2. Cari jadwal posyandu H-1 dan Hari H
    const today = new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" });
    const todayDate = new Date(today);
    
    const yyyy = todayDate.getFullYear();
    const mm = String(todayDate.getMonth() + 1).padStart(2, '0');
    const dd = String(todayDate.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;
    
    const tomorrowDate = new Date(todayDate);
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tmrwY = tomorrowDate.getFullYear();
    const tmrwM = String(tomorrowDate.getMonth() + 1).padStart(2, '0');
    const tmrwD = String(tomorrowDate.getDate()).padStart(2, '0');
    const tmrwStr = `${tmrwY}-${tmrwM}-${tmrwD}`;

    const [jadwalRows] = await pool.query(`
      SELECT j.id as jadwal_id, j.tanggal, j.waktu_mulai, p.nama as posyandu_nama, p.id as posyandu_id,
             DATEDIFF(j.tanggal, ?) as diff_days
      FROM jadwal_posyandu j
      JOIN posyandu p ON j.posyandu_id = p.id
      WHERE j.tanggal IN (?, ?)
    `, [todayStr, todayStr, tmrwStr]);

    if (jadwalRows.length === 0) {
      return NextResponse.json({ message: 'No upcoming schedules today or tomorrow' });
    }

    let sentCount = 0;

    // 3. Loop per jadwal
    for (const jadwal of jadwalRows) {
      const isHariH = jadwal.diff_days === 0;
      const tgl = new Date(jadwal.tanggal).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      const jam = jadwal.waktu_mulai ? jadwal.waktu_mulai.substring(0, 5) : '-';

      let autoMsg = "";
      if (isHariH) {
        const jktTime = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
        const currentH = String(jktTime.getHours()).padStart(2, '0');
        const currentM = String(jktTime.getMinutes()).padStart(2, '0');
        const currentTimeStr = `${currentH}:${currentM}`;

        if (jadwal.waktu_mulai) {
          const waktuMulaiStr = jadwal.waktu_mulai.substring(0, 5);
          if (currentTimeStr > waktuMulaiStr) {
            continue; // Sudah lewat jam mulai, jangan kirim PENGINGAT HARI INI lagi
          }
        }
        autoMsg = `📢 [HARI INI] Halo Ibu/Bapak! Sekadar mengingatkan bahwa jadwal Posyandu di *${jadwal.posyandu_nama}* sedang berlangsung hari ini (${tgl}) mulai jam ${jam}. Jangan lupa bawa buku KIA si kecil ya!`;
      } else {
        autoMsg = `📌 [PENGINGAT H-1] Halo Ibu/Bapak! Besok (${tgl}) jam ${jam} ada jadwal penimbangan dan pemeriksaan di *${jadwal.posyandu_nama}*. Yuk, persiapkan waktu untuk memantau tumbuh kembang ananda.`;
      }

      // 4. Cari orang tua yang subscribe ke posyandu ini
      const [parentRows] = await pool.query(`
        SELECT u.id as orang_tua_id, u.nama, MAX(b.id) as balita_id
        FROM user_notif_posyandu unp
        JOIN users u ON unp.user_id = u.id
        LEFT JOIN balita b ON b.orang_tua_id = u.id
        WHERE unp.posyandu_id = ? AND u.is_active = 1
        GROUP BY u.id, u.nama
      `, [jadwal.posyandu_id]);

      for (const parent of parentRows) {
        // Cek konsultasi aktif dengan system
        const [existingConsul] = await pool.query(
          "SELECT id FROM konsultasi WHERE orang_tua_id = ? AND ahli_gizi_id = ? LIMIT 1",
          [parent.orang_tua_id, systemUserId]
        );

        let konsultasiId;
        if (existingConsul.length > 0) {
          konsultasiId = existingConsul[0].id;
        } else {
          const uuid = uuidv4();
          const [insertConsul] = await pool.query(
            `INSERT INTO konsultasi (uuid, orang_tua_id, ahli_gizi_id, balita_id, topik, status) 
             VALUES (?, ?, ?, ?, 'Jadwal Posyandu Growell', 'aktif')`,
            [uuid, parent.orang_tua_id, systemUserId, parent.balita_id || null]
          );
          konsultasiId = insertConsul.insertId;
        }

        // Cek apakah pesan untuk jadwal ini sudah dikirim hari ini
        // Menggunakan rentang 24 jam terakhir daripada CURDATE() untuk menghindari masalah timezone UTC MySQL
        const [recentMsgs] = await pool.query(
          `SELECT id FROM pesan_konsultasi 
           WHERE konsultasi_id = ? AND pengirim_id = ? AND pesan LIKE ? AND created_at >= NOW() - INTERVAL 24 HOUR
           LIMIT 1`,
          [konsultasiId, systemUserId, `%${jadwal.posyandu_nama}%${tgl}%`]
        );

        if (recentMsgs.length > 0) {
          continue; // Sudah dikirim dalam 24 jam terakhir
        }

        // Insert Pesan
        const msgUuid = uuidv4();
        await pool.query(
          `INSERT INTO pesan_konsultasi (uuid, konsultasi_id, pengirim_id, pesan, tipe_pesan, is_read)
           VALUES (?, ?, ?, ?, 'text', 0)`,
           [msgUuid, konsultasiId, systemUserId, autoMsg]
        );

        // Insert Notifikasi Global
        const notifUuid = uuidv4();
        await pool.query(
          `INSERT INTO notifications (uuid, user_id, judul, pesan, tipe, is_read)
           VALUES (?, ?, ?, ?, 'info', 0)`,
          [notifUuid, parent.orang_tua_id, "Pengingat Jadwal Posyandu", autoMsg]
        );

        sentCount++;
      }
    }

    return NextResponse.json({
      message: 'Jadwal reminder job completed',
      schedules_found: jadwalRows.length,
      messages_sent: sentCount
    });

  } catch (error) {
    console.error('Jadwal Reminder error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
