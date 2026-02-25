import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// GET MEASUREMENTS BY BALITA
export async function GET(request, { params }) {
  const { user, error } = await requireAuth(request);
  if (error) return error;

  try {
    const { balitaUuid } = await params;

    const [balita] = await pool.query(
      'SELECT id, uuid, nama FROM balita WHERE uuid = ?', [balitaUuid]
    );
    if (balita.length === 0) {
      return NextResponse.json({ error: 'Balita tidak ditemukan' }, { status: 404 });
    }

    const [measurements] = await pool.query(
      `SELECT p.*, u.nama AS kader_nama
      FROM pengukuran p
      LEFT JOIN users u ON p.kader_id = u.id
      WHERE p.balita_id = ?
      ORDER BY p.tanggal_pengukuran DESC`,
      [balita[0].id]
    );

    return NextResponse.json({ balita: balita[0], measurements });
  } catch (err) {
    console.error('Get measurements error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
