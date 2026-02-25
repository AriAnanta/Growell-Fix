import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

/**
 * POST /api/pengukuran/update-rekomendasi
 * Called after parent form submission to update the rekomendasi intervensi
 * on the latest pengukuran record for a given balita.
 *
 * Body: {
 *   balita_uuid: string,          // UUID of the balita
 *   rekomendasi_utama: string,
 *   rekomendasi_tambahan: string[],
 *   catatan_rekomendasi: string (optional),
 * }
 */
export async function POST(request) {
  // Allow orang_tua, kader, puskesmas
  const { user, error } = await requireAuth(request);
  if (error) return error;

  try {
    const body = await request.json();
    const { balita_uuid, rekomendasi_utama, rekomendasi_tambahan, catatan_rekomendasi } = body;

    if (!balita_uuid) {
      return NextResponse.json({ error: 'balita_uuid wajib diisi' }, { status: 400 });
    }

    // Resolve balita id
    const [balitaRows] = await pool.query(
      'SELECT id FROM balita WHERE uuid = ? AND is_active = TRUE LIMIT 1',
      [balita_uuid]
    );
    if (balitaRows.length === 0) {
      return NextResponse.json({ error: 'Balita tidak ditemukan' }, { status: 404 });
    }
    const balitaId = balitaRows[0].id;

    // Get latest pengukuran for this balita
    const [pengRows] = await pool.query(
      `SELECT id, uuid FROM pengukuran
       WHERE balita_id = ?
       ORDER BY tanggal_pengukuran DESC, id DESC
       LIMIT 1`,
      [balitaId]
    );

    if (pengRows.length === 0) {
      return NextResponse.json({ error: 'Belum ada data pengukuran untuk balita ini' }, { status: 404 });
    }

    const pengId = pengRows[0].id;

    // Update rekomendasi fields on latest pengukuran
    await pool.query(
      `UPDATE pengukuran
       SET rekomendasi_utama = ?,
           rekomendasi_tambahan = ?,
           catatan_rekomendasi = ?,
           updated_at = NOW()
       WHERE id = ?`,
      [
        rekomendasi_utama || null,
        rekomendasi_tambahan ? JSON.stringify(rekomendasi_tambahan) : null,
        catatan_rekomendasi || null,
        pengId,
      ]
    );

    return NextResponse.json({
      message: 'Rekomendasi intervensi berhasil diperbarui',
      pengukuran_id: pengId,
      pengukuran_uuid: pengRows[0].uuid,
    });
  } catch (err) {
    console.error('Update rekomendasi error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
