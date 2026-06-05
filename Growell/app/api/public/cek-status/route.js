import { NextResponse } from 'next/server';
import pool from '@/lib/db';

/**
 * GET /api/public/cek-status
 * Returns basic info of a balita based on an EXACT full name match.
 * Provides limited info to protect data privacy.
 * Accessible to unauthenticated users.
 *
 * Query params:
 *  - nama: exact full name of the balita
 *  - tanggal_lahir: date of birth (YYYY-MM-DD)
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const nama = searchParams.get('nama');
        const tanggal_lahir = searchParams.get('tanggal_lahir');

        if (!nama || nama.trim() === '') {
            return NextResponse.json({ error: 'Nama balita harus diisi' }, { status: 400 });
        }
        if (!tanggal_lahir || tanggal_lahir.trim() === '') {
            return NextResponse.json({ error: 'Tanggal lahir harus diisi' }, { status: 400 });
        }

        // Exact match for name and date of birth
        const [rows] = await pool.query(
            `SELECT
          b.uuid,
          b.nama,
          b.jenis_kelamin,
          b.tanggal_lahir,
          COALESCE(p.nama, b.nama_posyandu) AS posyandu_nama,
          latest.status_gizi_bbtb,
          latest.status_gizi_bbu,
          latest.status_gizi_tbu,
          latest.tanggal_pengukuran AS pengukuran_terakhir
        FROM balita b
        LEFT JOIN posyandu p ON b.posyandu_id = p.id
        LEFT JOIN (
          SELECT pk.balita_id, pk.status_gizi_bbtb, pk.status_gizi_bbu, pk.status_gizi_tbu,
                 pk.tanggal_pengukuran,
                 ROW_NUMBER() OVER (PARTITION BY pk.balita_id ORDER BY pk.tanggal_pengukuran DESC, pk.id DESC) AS rn
          FROM pengukuran pk
        ) latest ON latest.balita_id = b.id AND latest.rn = 1
        WHERE b.is_active = TRUE AND b.nama = ? AND b.tanggal_lahir = ?
        ORDER BY b.id DESC
        LIMIT 1`,
            [nama.trim(), tanggal_lahir.trim()]
        );

        if (rows.length === 0) {
            return NextResponse.json({ error: 'Data balita tidak ditemukan. Pastikan nama lengkap dan tanggal lahir sesuai.' }, { status: 404 });
        }

        const r = rows[0];

        // Helper to format date
        const toLocalISO = (d) => {
            if (!d) return null;
            if (typeof d === 'string') return d.split('T')[0];
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        };

        const data = {
            uuid: r.uuid,
            nama: r.nama,
            jenis_kelamin: r.jenis_kelamin,
            tanggal_lahir: toLocalISO(r.tanggal_lahir),
            posyandu_nama: r.posyandu_nama || '-',
            status_gizi_bbtb: r.status_gizi_bbtb || 'Belum ada data',
            status_gizi_bbu: r.status_gizi_bbu || 'Belum ada data',
            status_gizi_tbu: r.status_gizi_tbu || 'Belum ada data',
            pengukuran_terakhir: toLocalISO(r.pengukuran_terakhir) || 'Belum ada data',
        };

        return NextResponse.json({ data });
    } catch (err) {
        console.error('Public cek status error:', err);
        return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
    }
}
