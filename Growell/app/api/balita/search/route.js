import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

/**
 * GET /api/balita/search
 * Returns a list of active balita for the parent form searchable dropdown.
 * Includes latest nutrition status from pengukuran.
 * Accessible to all authenticated users (kader, orang_tua, etc.)
 *
 * Query params:
 *  - q: search string (optional) — filters by nama or nama_ibu
 *  - limit: max results (default 200)
 */
export async function GET(request) {
  const { user, error } = await requireAuth(request);
  if (error) return error;

  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const limit = Math.min(parseInt(searchParams.get('limit')) || 200, 500);

    let whereClause = 'WHERE b.is_active = TRUE';
    const params = [];

    if (q.trim()) {
      whereClause += ' AND (b.nama LIKE ? OR b.nama_ibu LIKE ?)';
      params.push(`%${q.trim()}%`, `%${q.trim()}%`);
    }

    const [rows] = await pool.query(
      `SELECT
         b.uuid,
         b.nama,
         b.nama_ibu,
         b.jenis_kelamin,
         b.tanggal_lahir,
         b.kelurahan,
         COALESCE(p.nama, b.nama_posyandu) AS posyandu_nama,
         p.kecamatan,
         p.kelurahan AS posyandu_kelurahan,
         latest.status_gizi_bbtb,
         latest.status_gizi_bbu,
         latest.status_gizi_tbu,
         latest.rekomendasi_utama,
         latest.rekomendasi_tambahan,
         latest.tanggal_pengukuran AS pengukuran_terakhir,
         latest.uuid AS pengukuran_uuid
       FROM balita b
       LEFT JOIN posyandu p ON b.posyandu_id = p.id
       LEFT JOIN (
         SELECT pk.balita_id, pk.status_gizi_bbtb, pk.status_gizi_bbu, pk.status_gizi_tbu,
                pk.rekomendasi_utama, pk.rekomendasi_tambahan, pk.tanggal_pengukuran, pk.uuid,
                ROW_NUMBER() OVER (PARTITION BY pk.balita_id ORDER BY pk.tanggal_pengukuran DESC, pk.id DESC) AS rn
         FROM pengukuran pk
       ) latest ON latest.balita_id = b.id AND latest.rn = 1
       ${whereClause}
       ORDER BY b.nama ASC
       LIMIT ?`,
      [...params, limit]
    );

    // Helper: read DATE as local time to avoid UTC-shift timezone bug
    const toLocalISO = (d) => {
      if (!d) return null;
      if (typeof d === 'string') return d.split('T')[0];
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    const data = rows.map((r) => ({
      uuid: r.uuid,
      nama: r.nama,
      nama_ibu: r.nama_ibu || '',
      jenis_kelamin: r.jenis_kelamin,
      tanggal_lahir: toLocalISO(r.tanggal_lahir),
      // Use balita.kelurahan if available, fallback to posyandu kelurahan
      kelurahan: r.kelurahan || r.posyandu_kelurahan || '',
      kecamatan: r.kecamatan || 'Astananyar',
      posyandu_nama: r.posyandu_nama || '',
      status_gizi_bbtb: r.status_gizi_bbtb || null,
      status_gizi_bbu: r.status_gizi_bbu || null,
      status_gizi_tbu: r.status_gizi_tbu || null,
      rekomendasi_utama: r.rekomendasi_utama || null,
      rekomendasi_tambahan: r.rekomendasi_tambahan || null,
      pengukuran_terakhir: r.pengukuran_terakhir || null,
      pengukuran_uuid: r.pengukuran_uuid || null,
    }));

    return NextResponse.json({ data, total: data.length });
  } catch (err) {
    console.error('Balita search error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
