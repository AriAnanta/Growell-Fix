import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(request) {
  const { user, error } = await requireAuth(request);
  if (error) return error;

  try {
    const [ahliGizi] = await pool.query(
      `SELECT users.id, users.uuid, users.nama, users.foto_profil, users.no_telepon 
       FROM users 
       WHERE role = 'ahli_gizi' AND is_active = TRUE`
    );

    return NextResponse.json({ data: ahliGizi });
  } catch (err) {
    console.error('Get ahli gizi error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
