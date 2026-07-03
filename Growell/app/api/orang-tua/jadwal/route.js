import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(request) {
  const { user, error } = await requireAuth(request, ['orang_tua']);
  if (error) return error;

  try {
    // Get user's subscribed posyandus
    const [subRows] = await pool.query(
      'SELECT posyandu_id FROM user_notif_posyandu WHERE user_id = ?',
      [user.id]
    );
    const subscribedPosyandus = subRows.map(r => r.posyandu_id);

    // Fetch ALL upcoming schedules from ANY posyandu
    const [scheduleRows] = await pool.query(
      `SELECT j.*, p.nama AS posyandu_nama 
       FROM jadwal_posyandu j
       JOIN posyandu p ON j.posyandu_id = p.id
       WHERE j.tanggal >= CURDATE()
       ORDER BY j.tanggal ASC, j.waktu_mulai ASC
       LIMIT 10`
    );

    return NextResponse.json({
      data: scheduleRows,
      subscribed_posyandus: subscribedPosyandus
    });
  } catch (err) {
    console.error('Error fetching jadwal posyandu:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}

export async function POST(request) {
  const { user, error } = await requireAuth(request, ['orang_tua']);
  if (error) return error;

  try {
    const body = await request.json();
    const { posyandu_id, action } = body;

    if (!posyandu_id || !['add', 'remove'].includes(action)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    if (action === 'add') {
      await pool.query(
        'INSERT IGNORE INTO user_notif_posyandu (user_id, posyandu_id) VALUES (?, ?)',
        [user.id, posyandu_id]
      );
    } else {
      await pool.query(
        'DELETE FROM user_notif_posyandu WHERE user_id = ? AND posyandu_id = ?',
        [user.id, posyandu_id]
      );
    }

    return NextResponse.json({
      message: 'Preferensi notifikasi jadwal berhasil diperbarui'
    });
  } catch (err) {
    console.error('Error updating notif jadwal preference:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
