import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// GET CONSULTATION DETAIL WITH MESSAGES
export async function GET(request, { params }) {
  const { user, error } = await requireAuth(request);
  if (error) return error;

  try {
    const { uuid } = await params;

    const [consultation] = await pool.query(
      `SELECT k.*,
        ot.nama AS orang_tua_nama, ot.foto_profil AS orang_tua_foto,
        ag.nama AS ahli_gizi_nama, ag.foto_profil AS ahli_gizi_foto,
        b.nama AS balita_nama
      FROM konsultasi k
      LEFT JOIN users ot ON k.orang_tua_id = ot.id
      LEFT JOIN users ag ON k.ahli_gizi_id = ag.id
      LEFT JOIN balita b ON k.balita_id = b.id
      WHERE k.uuid = ?`,
      [uuid]
    );

    if (consultation.length === 0) {
      return NextResponse.json({ error: 'Konsultasi tidak ditemukan' }, { status: 404 });
    }

    // Get messages
    const [messages] = await pool.query(
      `SELECT pm.*, u.nama AS pengirim_nama, u.foto_profil AS pengirim_foto, u.role AS pengirim_role
      FROM pesan_konsultasi pm
      JOIN users u ON pm.pengirim_id = u.id
      WHERE pm.konsultasi_id = ?
      ORDER BY pm.created_at ASC`,
      [consultation[0].id]
    );

    // Mark messages as read
    await pool.query(
      'UPDATE pesan_konsultasi SET is_read = TRUE WHERE konsultasi_id = ? AND pengirim_id != ?',
      [consultation[0].id, user.id]
    );

    return NextResponse.json({ konsultasi: consultation[0], messages });
  } catch (err) {
    console.error('Get consultation detail error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}

// DELETE CONSULTATION (any participant, or admin)
export async function DELETE(request, { params }) {
  const { user, error } = await requireAuth(request);
  if (error) return error;

  try {
    const { uuid } = await params;

    const [consultation] = await pool.query(
      'SELECT * FROM konsultasi WHERE uuid = ?', [uuid]
    );
    if (consultation.length === 0) {
      return NextResponse.json({ error: 'Konsultasi tidak ditemukan' }, { status: 404 });
    }
    const k = consultation[0];
    // Only participants or supervisors may delete
    const isParticipant = user.id === k.orang_tua_id || user.id === k.ahli_gizi_id;
    const isSupervisor = ['puskesmas', 'kelurahan'].includes(user.role);
    if (!isParticipant && !isSupervisor) {
      return NextResponse.json({ error: 'Tidak diizinkan' }, { status: 403 });
    }

    await pool.query('DELETE FROM pesan_konsultasi WHERE konsultasi_id = ?', [k.id]);
    await pool.query('DELETE FROM konsultasi WHERE id = ?', [k.id]);

    return NextResponse.json({ message: 'Konsultasi berhasil dihapus' });
  } catch (err) {
    console.error('Delete consultation error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}

// UPDATE CONSULTATION STATUS
export async function PUT(request, { params }) {
  const { user, error } = await requireAuth(request, ['ahli_gizi', 'puskesmas']);
  if (error) return error;

  try {
    const { uuid } = await params;
    const body = await request.json();
    const { status, catatan_ahli_gizi } = body;

    if (!['aktif', 'selesai', 'dibatalkan'].includes(status)) {
      return NextResponse.json({ error: 'Status tidak valid' }, { status: 400 });
    }

    const updates = ['status = ?'];
    const values = [status];
    if (catatan_ahli_gizi) {
      updates.push('catatan_ahli_gizi = ?');
      values.push(catatan_ahli_gizi);
    }

    values.push(uuid);
    await pool.query(`UPDATE konsultasi SET ${updates.join(', ')} WHERE uuid = ?`, values);

    return NextResponse.json({ message: 'Status konsultasi berhasil diperbarui' });
  } catch (err) {
    console.error('Update consultation error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
