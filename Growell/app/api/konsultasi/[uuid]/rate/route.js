import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// RATE CONSULTATION
export async function POST(request, { params }) {
  const { user, error } = await requireAuth(request, ['orang_tua']);
  if (error) return error;

  try {
    const { uuid } = await params;
    const body = await request.json();
    const { rating } = body;

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating harus antara 1-5' }, { status: 400 });
    }

    await pool.query(
      'UPDATE konsultasi SET rating = ? WHERE uuid = ? AND orang_tua_id = ?',
      [rating, uuid, user.id]
    );

    return NextResponse.json({ message: 'Rating berhasil diberikan' });
  } catch (err) {
    console.error('Rate consultation error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
