import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// GET NOTIFICATIONS
export async function GET(request) {
  const { user, error } = await requireAuth(request);
  if (error) return error;

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 20;
    const unread_only = searchParams.get('unread_only');
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE n.user_id = ?';
    const params = [user.id];

    if (unread_only === 'true') {
      whereClause += ' AND n.is_read = FALSE';
    }

    const [notifications] = await pool.query(
      `SELECT n.* FROM notifications n ${whereClause} ORDER BY n.created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const [unreadCount] = await pool.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = FALSE',
      [user.id]
    );

    return NextResponse.json({ data: notifications, unread_count: unreadCount[0].count });
  } catch (err) {
    console.error('Get notifications error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}

// MARK ALL AS READ
export async function PUT(request) {
  const { user, error } = await requireAuth(request);
  if (error) return error;

  try {
    await pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE',
      [user.id]
    );
    return NextResponse.json({ message: 'Semua notifikasi telah dibaca' });
  } catch (err) {
    console.error('Mark all read error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
