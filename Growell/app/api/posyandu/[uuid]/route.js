import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// GET POSYANDU DETAIL WITH SCHEDULES
export async function GET(request, { params }) {
  const { user, error } = await requireAuth(request);
  if (error) return error;

  try {
    const { uuid } = await params;

    const [posyandu] = await pool.query(
      `SELECT p.*, u.nama AS kader_nama
      FROM posyandu p LEFT JOIN users u ON p.kader_id = u.id
      WHERE p.uuid = ?`, [uuid]
    );

    if (posyandu.length === 0) {
      return NextResponse.json({ error: 'Posyandu tidak ditemukan' }, { status: 404 });
    }

    const [schedules] = await pool.query(
      'SELECT * FROM jadwal_posyandu WHERE posyandu_id = ? AND tanggal >= CURDATE() ORDER BY tanggal ASC LIMIT 10',
      [posyandu[0].id]
    );

    return NextResponse.json({ posyandu: posyandu[0], schedules });
  } catch (err) {
    console.error('Get posyandu detail error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
