import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// LIST REPORTS
export async function GET(request) {
  const { user, error } = await requireAuth(request, ['kader', 'puskesmas', 'kelurahan']);
  if (error) return error;

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 20;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (user.role === 'kader') {
      whereClause += ' AND l.generated_by = ?';
      params.push(user.id);
    }

    const [reports] = await pool.query(
      `SELECT l.*, u.nama AS generated_by_nama
      FROM laporan l
      LEFT JOIN users u ON l.generated_by = u.id
      ${whereClause}
      ORDER BY l.created_at DESC
      LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return NextResponse.json({ data: reports });
  } catch (err) {
    console.error('List reports error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
