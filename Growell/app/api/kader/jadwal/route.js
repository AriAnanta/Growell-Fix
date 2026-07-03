import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(request) {
  const { user, error } = await requireAuth(request, ['kader']);
  if (error) return error;

  try {
    const [usersRows] = await pool.query('SELECT posyandu_id FROM users WHERE id = ?', [user.id]);
    const posyanduId = usersRows[0]?.posyandu_id;

    if (!posyanduId) {
      return NextResponse.json({ data: [] });
    }

    const [schedules] = await pool.query(
      `SELECT * FROM jadwal_posyandu 
       WHERE posyandu_id = ? 
       ORDER BY tanggal ASC`,
      [posyanduId]
    );

    return NextResponse.json({ data: schedules });
  } catch (err) {
    console.error('Get kader jadwal error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}

export async function POST(request) {
  const { user, error } = await requireAuth(request, ['kader']);
  if (error) return error;

  try {
    const body = await request.json();
    const { tanggal, waktu_mulai, waktu_selesai, kegiatan, catatan } = body;

    if (!tanggal) {
      return NextResponse.json({ error: 'Tanggal wajib diisi' }, { status: 400 });
    }

    const [usersRows] = await pool.query('SELECT posyandu_id FROM users WHERE id = ?', [user.id]);
    const posyanduId = usersRows[0]?.posyandu_id;

    if (!posyanduId) {
      return NextResponse.json({ error: 'Posyandu belum diatur. Silakan isi informasi Posyandu terlebih dahulu.' }, { status: 400 });
    }

    const uuid = uuidv4();
    const [insertRes] = await pool.query(
      `INSERT INTO jadwal_posyandu (uuid, posyandu_id, tanggal, waktu_mulai, waktu_selesai, kegiatan, catatan, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [uuid, posyanduId, tanggal, waktu_mulai || null, waktu_selesai || null, kegiatan || null, catatan || null, user.id]
    );

    return NextResponse.json({
      message: 'Jadwal berhasil ditambahkan',
      data: { id: insertRes.insertId, uuid, tanggal, waktu_mulai, waktu_selesai, kegiatan, catatan }
    }, { status: 201 });
  } catch (err) {
    console.error('Create kader jadwal error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}

export async function DELETE(request) {
  const { user, error } = await requireAuth(request, ['kader']);
  if (error) return error;

  try {
    const url = new URL(request.url);
    const uuid = url.searchParams.get('uuid');

    if (!uuid) {
      return NextResponse.json({ error: 'UUID jadwal tidak diberikan' }, { status: 400 });
    }

    const [usersRows] = await pool.query('SELECT posyandu_id FROM users WHERE id = ?', [user.id]);
    const posyanduId = usersRows[0]?.posyandu_id;

    if (!posyanduId) {
       return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Verify it belongs to their posyandu
    const [delRes] = await pool.query(
      'DELETE FROM jadwal_posyandu WHERE uuid = ? AND posyandu_id = ?',
      [uuid, posyanduId]
    );

    if (delRes.affectedRows === 0) {
      return NextResponse.json({ error: 'Jadwal tidak ditemukan atau tidak berhak menghapus' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Jadwal berhasil dihapus' });
  } catch (err) {
    console.error('Delete kader jadwal error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
