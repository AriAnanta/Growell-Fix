import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { buildForecastFromHistory } from '@/lib/ml';

/**
 * GET /api/public/status/[uuid]
 * Returns public info of a balita based on UUID and their measurement history.
 * Provides limited info to protect data privacy.
 * Accessible to unauthenticated users.
 */
export async function GET(request, { params }) {
    try {
        const { uuid } = await params;

        if (!uuid) {
            return NextResponse.json({ error: 'ID Balita tidak valid' }, { status: 400 });
        }

        // Get basic balita info
        const [balitaRows] = await pool.query(
            `SELECT
         b.uuid,
         b.nama,
         b.jenis_kelamin,
         b.tanggal_lahir,
         COALESCE(p.nama, b.nama_posyandu) AS posyandu_nama
       FROM balita b
       LEFT JOIN posyandu p ON b.posyandu_id = p.id
       WHERE b.is_active = TRUE AND b.uuid = ?
       LIMIT 1`,
            [uuid]
        );

        if (balitaRows.length === 0) {
            return NextResponse.json({ error: 'Data balita tidak ditemukan' }, { status: 404 });
        }

        const balita = balitaRows[0];

        // Get measurement history (limited data)
        const [measurements] = await pool.query(
            `SELECT
         tanggal_pengukuran,
         berat_badan,
         tinggi_badan,
         status_gizi_bbtb,
         status_gizi_bbu,
         status_gizi_tbu,
         rekomendasi_utama,
         catatan,
         zs_bb_u,
         zs_tb_u,
         zs_bb_tb
       FROM pengukuran 
       WHERE balita_id = (SELECT id FROM balita WHERE uuid = ?)
       ORDER BY tanggal_pengukuran DESC`,
            [uuid]
        );

        // Helper to format date
        const toLocalISO = (d) => {
            if (!d) return null;
            if (typeof d === 'string') return d.split('T')[0];
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        };

        const formattedBalita = {
            uuid: balita.uuid,
            nama: balita.nama,
            jenis_kelamin: balita.jenis_kelamin,
            tanggal_lahir: toLocalISO(balita.tanggal_lahir),
            posyandu_nama: balita.posyandu_nama || '-',
        };

        const formattedMeasurements = measurements.map(m => ({
            tanggal_pengukuran: toLocalISO(m.tanggal_pengukuran),
            berat_badan: m.berat_badan,
            tinggi_badan: m.tinggi_badan,
            status_gizi_bbtb: m.status_gizi_bbtb || 'Belum ada data',
            status_gizi_bbu: m.status_gizi_bbu || 'Belum ada data',
            status_gizi_tbu: m.status_gizi_tbu || 'Belum ada data',
            rekomendasi_utama: m.rekomendasi_utama || '',
            catatan: m.catatan || '',
        }));

        const forecast = await buildForecastFromHistory(balita, measurements);

        return NextResponse.json({
            data: formattedBalita,
            history: formattedMeasurements,
            forecast,
        });

    } catch (err) {
        console.error('Public detail status error:', err);
        return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
    }
}
