import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

/**
 * POST /api/balita/klaim
 *
 * Mencari balita berdasarkan nama & tanggal_lahir lalu menghubungkannya
 * ke akun orang tua yang sedang login (mengisi kolom orang_tua_id).
 *
 * Body: { nama: string, tanggal_lahir: string "YYYY-MM-DD" }
 *
 * Rules:
 *  - Hanya boleh diakses oleh role orang_tua.
 *  - Balita yang sudah ter-link ke akun lain TIDAK bisa diklaim.
 *  - Balita yang sudah ter-link ke akun yang SAMA dianggap sukses (idempotent).
 */
export async function POST(request) {
  const { user, error } = await requireAuth(request, ['orang_tua']);
  if (error) return error;

  try {
    const { nama, tanggal_lahir } = await request.json();

    if (!nama?.trim() || !tanggal_lahir?.trim()) {
      return NextResponse.json(
        { error: 'Nama lengkap dan tanggal lahir wajib diisi.' },
        { status: 400 }
      );
    }

    // Find balita by exact name + DOB
    const [rows] = await pool.query(
      `SELECT
        b.id, b.uuid, b.nama, b.jenis_kelamin, b.tanggal_lahir,
        b.orang_tua_id,
        COALESCE(p.nama, b.nama_posyandu) AS posyandu_nama,
        latest.status_gizi_bbu, latest.status_gizi_tbu, latest.status_gizi_bbtb,
        latest.berat_badan AS berat_terakhir, latest.tinggi_badan AS tinggi_terakhir,
        latest.tanggal_pengukuran AS pengukuran_terakhir
      FROM balita b
      LEFT JOIN posyandu p ON b.posyandu_id = p.id
      LEFT JOIN (
        SELECT pk.balita_id, pk.status_gizi_bbu, pk.status_gizi_tbu, pk.status_gizi_bbtb,
               pk.berat_badan, pk.tinggi_badan, pk.tanggal_pengukuran,
               ROW_NUMBER() OVER (PARTITION BY pk.balita_id ORDER BY pk.tanggal_pengukuran DESC, pk.id DESC) AS rn
        FROM pengukuran pk
      ) latest ON latest.balita_id = b.id AND latest.rn = 1
      WHERE b.is_active = TRUE AND b.nama = ? AND b.tanggal_lahir = ?
      LIMIT 1`,
      [nama.trim(), tanggal_lahir.trim()]
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'Data balita tidak ditemukan. Pastikan nama lengkap dan tanggal lahir sesuai data Posyandu.' },
        { status: 404 }
      );
    }

    const balita = rows[0];

    // Already linked to this account — idempotent success
    if (balita.orang_tua_id === user.id) {
      return NextResponse.json({
        message: 'Data anak sudah terhubung ke akun Anda.',
        already_linked: true,
        balita,
      });
    }

    // Linked to a DIFFERENT account — refuse
    if (balita.orang_tua_id !== null) {
      return NextResponse.json(
        { error: 'Data anak ini sudah terhubung ke akun orang tua lain. Hubungi admin Posyandu jika ini adalah kesalahan.' },
        { status: 409 }
      );
    }

    // Link to this account
    await pool.query(
      'UPDATE balita SET orang_tua_id = ? WHERE id = ?',
      [user.id, balita.id]
    );

    return NextResponse.json({
      message: `Data ${balita.nama} berhasil dihubungkan ke akun Anda.`,
      already_linked: false,
      balita,
    }, { status: 200 });

  } catch (err) {
    console.error('Klaim balita error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server.' }, { status: 500 });
  }
}

/**
 * GET /api/balita/klaim?nama=&tanggal_lahir=
 *
 * Cari pratinjau balita sebelum diklaim (tanpa langsung melakukan link).
 */
export async function GET(request) {
  const { user, error } = await requireAuth(request, ['orang_tua']);
  if (error) return error;

  try {
    const { searchParams } = new URL(request.url);
    const nama = searchParams.get('nama');
    const tanggal_lahir = searchParams.get('tanggal_lahir');

    if (!nama?.trim() || !tanggal_lahir?.trim()) {
      return NextResponse.json(
        { error: 'Nama dan tanggal lahir wajib diisi.' },
        { status: 400 }
      );
    }

    const [rows] = await pool.query(
      `SELECT
        b.uuid, b.nama, b.jenis_kelamin, b.tanggal_lahir,
        b.orang_tua_id,
        COALESCE(p.nama, b.nama_posyandu) AS posyandu_nama,
        latest.status_gizi_bbu, latest.status_gizi_tbu, latest.status_gizi_bbtb,
        latest.berat_badan AS berat_terakhir, latest.tinggi_badan AS tinggi_terakhir,
        latest.tanggal_pengukuran AS pengukuran_terakhir
      FROM balita b
      LEFT JOIN posyandu p ON b.posyandu_id = p.id
      LEFT JOIN (
        SELECT pk.balita_id, pk.status_gizi_bbu, pk.status_gizi_tbu, pk.status_gizi_bbtb,
               pk.berat_badan, pk.tinggi_badan, pk.tanggal_pengukuran,
               ROW_NUMBER() OVER (PARTITION BY pk.balita_id ORDER BY pk.tanggal_pengukuran DESC, pk.id DESC) AS rn
        FROM pengukuran pk
      ) latest ON latest.balita_id = b.id AND latest.rn = 1
      WHERE b.is_active = TRUE AND b.nama = ? AND b.tanggal_lahir = ?
      LIMIT 1`,
      [nama.trim(), tanggal_lahir.trim()]
    );

    if (rows.length === 0) {
      return NextResponse.json({ found: false, balita: null });
    }

    const balita = rows[0];
    const status =
      balita.orang_tua_id === user.id ? 'mine'
      : balita.orang_tua_id !== null  ? 'taken'
      : 'available';

    return NextResponse.json({ found: true, balita, status });

  } catch (err) {
    console.error('Cari balita klaim error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server.' }, { status: 500 });
  }
}
