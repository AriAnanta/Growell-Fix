import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// SEND MESSAGE IN CONSULTATION
export async function POST(request, { params }) {
  const { user, error } = await requireAuth(request);
  if (error) return error;

  try {
    const { uuid } = await params;
    const body = await request.json();
    const { pesan, tipe_pesan = 'text', file_url } = body;

    if (!pesan) {
      return NextResponse.json({ error: 'Pesan tidak boleh kosong' }, { status: 400 });
    }

    const [consultation] = await pool.query(
      'SELECT * FROM konsultasi WHERE uuid = ?', [uuid]
    );

    if (consultation.length === 0) {
      return NextResponse.json({ error: 'Konsultasi tidak ditemukan' }, { status: 404 });
    }

    const konsultasi = consultation[0];

    // Auto-activate if menunggu
    if (konsultasi.status === 'menunggu') {
      await pool.query("UPDATE konsultasi SET status = 'aktif' WHERE id = ?", [konsultasi.id]);
    }

    // Save message
    const messageUuid = uuidv4();
    await pool.query(
      `INSERT INTO pesan_konsultasi (uuid, konsultasi_id, pengirim_id, pesan, tipe_pesan, file_url)
      VALUES (?, ?, ?, ?, ?, ?)`,
      [messageUuid, konsultasi.id, user.id, pesan, tipe_pesan, file_url || null]
    );

    // Notify other party
    const recipientId = user.id === konsultasi.orang_tua_id
      ? konsultasi.ahli_gizi_id
      : konsultasi.orang_tua_id;

    if (recipientId) {
      await pool.query(
        `INSERT INTO notifications (uuid, user_id, judul, pesan, tipe, link)
        VALUES (?, ?, ?, ?, 'konsultasi', ?)`,
        [uuidv4(), recipientId, 'Pesan Baru',
         `${user.nama}: ${pesan.substring(0, 100)}`,
         `/konsultasi/${uuid}`]
      );
    }

    return NextResponse.json({
      message: 'Pesan berhasil dikirim',
      data: {
        uuid: messageUuid,
        pengirim_id: user.id,
        pengirim_nama: user.nama,
        pengirim_role: user.role,
        pesan,
        tipe_pesan,
        created_at: new Date()
      }
    }, { status: 201 });
  } catch (err) {
    console.error('Send message error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}

// CLEAR ALL MESSAGES (delete history)
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
    if (user.id !== k.orang_tua_id && user.id !== k.ahli_gizi_id) {
      return NextResponse.json({ error: 'Tidak diizinkan' }, { status: 403 });
    }

    await pool.query('DELETE FROM pesan_konsultasi WHERE konsultasi_id = ?', [k.id]);
    return NextResponse.json({ message: 'Riwayat chat berhasil dihapus' });
  } catch (err) {
    console.error('Clear messages error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
