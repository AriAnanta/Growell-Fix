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

    // 2. Fetch Parent and Balita Data (with survey)
    // We simplify raw scoring for attendance, parent_score, and child_score
    const [rows] = await pool.query(`
      SELECT 
        b.id AS balita_id,
        b.orang_tua_id,
        ot.nama AS orang_tua_nama,
        sb.id AS survey_balita_id,
        sb.frekuensi_posyandu_bulan,
        sb.skor_pengetahuan_ibu,
        sb.skor_pola_asuh_makan,
        sb.is_sakit_2_minggu,
        p.id AS pengukuran_id,
        p.status_gizi_bbtb, p.status_gizi_tbu, p.status_gizi_bbu,
        p.rekomendasi_utama, p.rekomendasi_tambahan
      FROM balita b
      JOIN users ot ON b.orang_tua_id = ot.id
      LEFT JOIN survey_balita sb ON sb.balita_id = b.id
      LEFT JOIN (
        SELECT id, balita_id, status_gizi_bbtb, status_gizi_tbu, status_gizi_bbu,
               rekomendasi_utama, rekomendasi_tambahan,
               ROW_NUMBER() OVER(PARTITION BY balita_id ORDER BY tanggal_pengukuran DESC) as rn
        FROM pengukuran
      ) p ON p.balita_id = b.id AND p.rn = 1
      WHERE ot.is_active = 1
    `);

    if (rows.length === 0) {
      return NextResponse.json({ message: 'No data to process' });
    }

    // 3. Prepare Batch Request Data
    const batchData = rows.map(row => {
      // Basic heuristic to match notebook scale (0-100)

      // Attendance (0-100)
      let att = 0;
      if (row.frekuensi_posyandu_bulan) {
        // e.g. "1 kali", "2 kali", "jarang"
        const freqStr = String(row.frekuensi_posyandu_bulan).toLowerCase();
        if (freqStr.includes('1') || freqStr.includes('rutin')) att = 100;
        else if (freqStr.includes('jarang')) att = 50;
        else att = 100;
      } else {
        att = 50; // default average
      }

      // Parent Activity Score (0-100)
      let parentScore = (Number(row.skor_pengetahuan_ibu) || 50) * 0.5 +
        (Number(row.skor_pola_asuh_makan) || 50) * 0.5;

      // Child Score using Notebook Weighting (Scale 1.0 - 4.0)
      const mapBBTB = { 'Gizi Baik': 1, 'Gizi Lebih': 2, 'Gizi Kurang': 3, 'Gizi Buruk': 4 };
      const mapTBU = { 'Normal': 1, 'Tinggi': 1, 'Pendek': 3, 'Sangat Pendek': 4 };
      const mapBBU = { 'Berat Badan Normal': 1, 'Berat Badan Lebih': 2, 'Berat Badan Kurang': 3, 'Berat Badan Sangat Kurang': 4 };

      const scoreBBTB = mapBBTB[row.status_gizi_bbtb] || 1;
      const scoreTBU = mapTBU[row.status_gizi_tbu] || 1;
      const scoreBBU = mapBBU[row.status_gizi_bbu] || 1;

      // child_score = (score_bbtb * 0.4) + (score_bbu * 0.3) + (score_tbu * 0.3)
      let childScore = (scoreBBTB * 0.4) + (scoreBBU * 0.3) + (scoreTBU * 0.3);

      return {
        user_id: String(row.balita_id),
        attendance: att,
        parent_activity_score: parentScore,
        child_score: childScore
      };
    });

    // 4. Send to ML Service
    const mlUrl = process.env.ML_SERVICE_URL || 'http://ml:8000';
    const mlResponse = await fetch(`${mlUrl}/predict-smart-reminder`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': process.env.ML_API_KEY || 'growell123'
      },
      body: JSON.stringify({ data: batchData })
    });

    if (!mlResponse.ok) {
      const err = await mlResponse.text();
      console.error('ML Error:', err);
      return NextResponse.json({ error: 'ML Service failed' }, { status: 500 });
    }

    const { results, best_k } = await mlResponse.json();
    let sentCount = 0;

    // 5. Process Results & Insert Auto Message
    for (const res of results) {
      const isHighPriority = res.priority_label.includes("TINGGI");
      
      const balitaId = Number(res.user_id);
      const rowData = rows.find(r => r.balita_id === balitaId);
      if (!rowData) continue;
      
      const orangTuaId = rowData.orang_tua_id;

      // Check if there is already a System Consultation for this parent
      const [existingConsul] = await pool.query(
        "SELECT id FROM konsultasi WHERE orang_tua_id = ? AND ahli_gizi_id = ? LIMIT 1",
        [orangTuaId, systemUserId]
      );

      let konsultasiId;
      if (existingConsul.length > 0) {
        konsultasiId = existingConsul[0].id;
      } else {
        // Create new consultation
        const uuid = uuidv4();
        const [insertConsul] = await pool.query(
          `INSERT INTO konsultasi (uuid, orang_tua_id, ahli_gizi_id, balita_id, topik, status) 
           VALUES (?, ?, ?, ?, 'Smart Reminder Growell', 'aktif')`,
          [uuid, orangTuaId, systemUserId, balitaId]
        );
        konsultasiId = insertConsul.insertId;
      }

      // Mencegah spam: Cek apakah sudah dikirim dalam beberapa hari terakhir
      const intervalCheck = isHighPriority ? 7 : 30; // 7 hari untuk prioritas tinggi, 30 hari untuk info berkala
      const [recentMsgs] = await pool.query(
        `SELECT id FROM pesan_konsultasi 
         WHERE konsultasi_id = ? AND pengirim_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
         LIMIT 1`,
        [konsultasiId, systemUserId, intervalCheck]
      );
      if (recentMsgs.length > 0) {
        continue; // Lewati pengiriman jika sudah ada notifikasi baru-baru ini
      }

      // Ambil rekomendasi gizi
      let rekomendasiText = "";
      if (rowData.rekomendasi_utama) {
        rekomendasiText += `\n\n*Rekomendasi Ahli Gizi (AI):*\n- ${rowData.rekomendasi_utama}`;
        
        // Parse rekomendasi tambahan jika ada
        if (rowData.rekomendasi_tambahan) {
          try {
            const parsed = typeof rowData.rekomendasi_tambahan === 'string' 
              ? JSON.parse(rowData.rekomendasi_tambahan) 
              : rowData.rekomendasi_tambahan;
            if (Array.isArray(parsed) && parsed.length > 0) {
              parsed.forEach(rt => {
                rekomendasiText += `\n- ${rt}`;
              });
            }
          } catch (e) {
            // Abaikan jika gagal parse
          }
        }
      }

      // Send Message
      const msgUuid = uuidv4();
      let autoMsg = "";
      let titleMsg = "";

      if (isHighPriority) {
        titleMsg = "Peringatan Prioritas";
        autoMsg = `🚨 [PRIORITAS TINGGI] Halo Ibu/Bapak ${rowData.orang_tua_nama}, berdasarkan analisis Growell AI, pertumbuhan ananda membutuhkan perhatian khusus.${rekomendasiText}\n\nKami menyarankan Ibu/Bapak untuk segera mengunjungi fasilitas kesehatan/Posyandu terdekat untuk konsultasi lebih lanjut.`;
      } else {
        titleMsg = "Info Perkembangan";
        autoMsg = `💡 [INFO BERKALA] Halo Ibu/Bapak ${rowData.orang_tua_nama}, terima kasih telah memantau kesehatan ananda.${rekomendasiText}\n\nTetap semangat memberikan gizi terbaik untuk si kecil.`;
      }
      
      await pool.query(
        `INSERT INTO pesan_konsultasi (uuid, konsultasi_id, pengirim_id, pesan, tipe_pesan, is_read)
         VALUES (?, ?, ?, ?, 'text', 0)`,
         [msgUuid, konsultasiId, systemUserId, autoMsg]
      );

      // Insert into reminder_priority
      const reminderStrategy = isHighPriority ? 'Aggressive' : 'Periodic';
      const [insertPriority] = await pool.query(
        `INSERT INTO reminder_priority (
          balita_id, pengukuran_id, survey_balita_id, 
          attendance_score, child_score, parent_score, final_score, 
          cluster_label, priority_level, reminder_strategy
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          balitaId, 
          rowData.pengukuran_id || null, 
          rowData.survey_balita_id || null,
          res.attendance_norm,
          res.child_norm,
          res.parent_norm,
          res.final_score,
          String(res.cluster),
          res.priority_label,
          reminderStrategy
        ]
      );
      const reminderPriorityId = insertPriority.insertId;

      // Insert into notifications
      const notifUuid = uuidv4();
      await pool.query(
        `INSERT INTO notifications (uuid, user_id, judul, pesan, tipe, is_read, reminder_priority_id)
         VALUES (?, ?, ?, ?, ?, 0, ?)`,
        [notifUuid, orangTuaId, titleMsg, autoMsg, isHighPriority ? 'warning' : 'info', reminderPriorityId]
      );

      sentCount++;
    }

    return NextResponse.json({
      message: 'Smart Reminder job completed',
      total_processed: batchData.length,
      messages_sent: sentCount,
      best_k
    });

  } catch (error) {
    console.error('Smart Reminder error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
