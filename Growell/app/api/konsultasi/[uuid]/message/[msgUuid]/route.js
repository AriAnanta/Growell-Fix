import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// EDIT A MESSAGE (only sender, within 15 min)
export async function PUT(request, { params }) {
  const { user, error } = await requireAuth(request);
  if (error) return error;

  try {
    const { uuid, msgUuid } = await params;
    const { pesan } = await request.json();

    if (!pesan?.trim()) {
      return NextResponse.json({ error: 'Pesan tidak boleh kosong' }, { status: 400 });
    }

    // Verify message belongs to this consultation and user is sender
    const [messages] = await pool.query(
      `SELECT pm.*, k.uuid AS konsultasi_uuid FROM pesan_konsultasi pm
       JOIN konsultasi k ON pm.konsultasi_id = k.id
       WHERE pm.uuid = ? AND k.uuid = ? AND pm.pengirim_id = ?`,
      [msgUuid, uuid, user.id]
    );

    if (messages.length === 0) {
      return NextResponse.json({ error: 'Pesan tidak ditemukan atau bukan milik Anda' }, { status: 404 });
    }

    await pool.query(
      'UPDATE pesan_konsultasi SET pesan = ?, is_edited = TRUE WHERE uuid = ?',
      [pesan.trim(), msgUuid]
    );

    return NextResponse.json({ message: 'Pesan berhasil diedit', data: { uuid: msgUuid, pesan: pesan.trim() } });
  } catch (err) {
    console.error('Edit message error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}

// DELETE A SINGLE MESSAGE (only sender)
export async function DELETE(request, { params }) {
  const { user, error } = await requireAuth(request);
  if (error) return error;

  try {
    const { uuid, msgUuid } = await params;

    const [messages] = await pool.query(
      `SELECT pm.* FROM pesan_konsultasi pm
       JOIN konsultasi k ON pm.konsultasi_id = k.id
       WHERE pm.uuid = ? AND k.uuid = ? AND pm.pengirim_id = ?`,
      [msgUuid, uuid, user.id]
    );

    if (messages.length === 0) {
      return NextResponse.json({ error: 'Pesan tidak ditemukan atau bukan milik Anda' }, { status: 404 });
    }

    await pool.query('DELETE FROM pesan_konsultasi WHERE uuid = ?', [msgUuid]);
    return NextResponse.json({ message: 'Pesan berhasil dihapus' });
  } catch (err) {
    console.error('Delete message error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
