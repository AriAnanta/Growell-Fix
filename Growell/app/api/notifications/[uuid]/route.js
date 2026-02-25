import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// MARK SINGLE NOTIFICATION AS READ
export async function PUT(request, { params }) {
  const { user, error } = await requireAuth(request);
  if (error) return error;

  try {
    const { uuid } = await params;
    await pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE uuid = ? AND user_id = ?',
      [uuid, user.id]
    );
    return NextResponse.json({ message: 'Notifikasi telah dibaca' });
  } catch (err) {
    console.error('Mark notification read error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
