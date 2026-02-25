import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

/**
 * POST /api/pengukuran/simpan
 * Composite endpoint: find-or-create balita, then insert pengukuran with ML prediction results.
 */
export async function POST(request) {
  const { user, error } = await requireAuth(request, ['kader', 'puskesmas']);
  if (error) return error;

  try {
    const body = await request.json();
    const {
      // Identitas balita
      nama_balita,
      tanggal_lahir,
      jenis_kelamin,
      nama_ibu,
      berat_lahir,
      tinggi_lahir,
      // Data pengukuran
      tanggal_pengukuran,
      berat_badan,
      tinggi_badan,
      lingkar_lengan,
      lingkar_kepala,
      catatan,
      // Hasil prediksi ML
      status_gizi_bbu,
      status_gizi_tbu,
      status_gizi_bbtb,
      rekomendasi_utama,
      rekomendasi_tambahan,
    } = body;

    if (!nama_balita || !tanggal_lahir || !jenis_kelamin || !tanggal_pengukuran || !berat_badan || !tinggi_badan) {
      return NextResponse.json(
        { error: 'Data balita (nama, tgl lahir, JK) dan pengukuran (tanggal, BB, TB) wajib diisi' },
        { status: 400 }
      );
    }

    // Get kader's posyandu_id
    const [kaderRows] = await pool.query('SELECT posyandu_id FROM users WHERE id = ?', [user.id]);
    const posyandu_id = kaderRows[0]?.posyandu_id || null;

    // ── Find or create balita ──────────────────────────────────────
    let balitaId, balitaUuid;
    const [existing] = await pool.query(
      'SELECT id, uuid FROM balita WHERE nama = ? AND tanggal_lahir = ? LIMIT 1',
      [nama_balita, tanggal_lahir]
    );

    if (existing.length > 0) {
      balitaId = existing[0].id;
      balitaUuid = existing[0].uuid;
      // Assign posyandu if not yet set
      if (posyandu_id) {
        await pool.query(
          'UPDATE balita SET posyandu_id = COALESCE(posyandu_id, ?) WHERE id = ?',
          [posyandu_id, balitaId]
        );
      }
    } else {
      balitaUuid = uuidv4();
      const [newBalita] = await pool.query(
        `INSERT INTO balita
           (uuid, nama, tanggal_lahir, jenis_kelamin, nama_ibu, berat_lahir, panjang_lahir, posyandu_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          balitaUuid,
          nama_balita,
          tanggal_lahir,
          jenis_kelamin,
          nama_ibu || null,
          berat_lahir || null,
          tinggi_lahir || null,
          posyandu_id,
        ]
      );
      balitaId = newBalita.insertId;
    }

    // ── Insert pengukuran with prediction results ──────────────────
    const pengUuid = uuidv4();
    const [result] = await pool.query(
      `INSERT INTO pengukuran
         (uuid, balita_id, tanggal_pengukuran, berat_badan, tinggi_badan,
          lingkar_lengan, lingkar_kepala,
          status_gizi_bbu, status_gizi_tbu, status_gizi_bbtb,
          rekomendasi_utama, rekomendasi_tambahan,
          kader_id, catatan)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        pengUuid,
        balitaId,
        tanggal_pengukuran,
        berat_badan,
        tinggi_badan,
        lingkar_lengan || null,
        lingkar_kepala || null,
        status_gizi_bbu || null,
        status_gizi_tbu || null,
        status_gizi_bbtb || null,
        rekomendasi_utama || null,
        rekomendasi_tambahan ? JSON.stringify(rekomendasi_tambahan) : null,
        user.id,
        catatan || null,
      ]
    );

    return NextResponse.json(
      {
        message: 'Data berhasil disimpan',
        balita: { id: balitaId, uuid: balitaUuid, nama: nama_balita },
        pengukuran: { id: result.insertId, uuid: pengUuid },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('Save measurement error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
