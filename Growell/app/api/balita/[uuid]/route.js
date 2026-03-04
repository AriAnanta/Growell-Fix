import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// GET SINGLE BALITA WITH HISTORY
export async function GET(request, { params }) {
  const { user, error } = await requireAuth(request);
  if (error) return error;

  try {
    const { uuid } = await params;

    const [balita] = await pool.query(
      `SELECT b.*, p.nama AS posyandu_nama, u.nama AS nama_orang_tua_user
      FROM balita b
      LEFT JOIN posyandu p ON b.posyandu_id = p.id
      LEFT JOIN users u ON b.orang_tua_id = u.id
      WHERE b.uuid = ?`,
      [uuid]
    );

    if (balita.length === 0) {
      return NextResponse.json({ error: 'Balita tidak ditemukan' }, { status: 404 });
    }

    // Get measurements history
    const [measurements] = await pool.query(
      'SELECT * FROM pengukuran WHERE balita_id = ? ORDER BY tanggal_pengukuran DESC',
      [balita[0].id]
    );

    // Get latest survey
    const [surveys] = await pool.query(
      'SELECT * FROM survey_balita WHERE balita_id = ? ORDER BY created_at DESC LIMIT 1',
      [balita[0].id]
    );

    return NextResponse.json({
      balita: balita[0],
      measurements,
      latestSurvey: surveys[0] || null
    });
  } catch (err) {
    console.error('Get balita detail error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}

// UPDATE BALITA
export async function PUT(request, { params }) {
  const { user, error } = await requireAuth(request, ['kader', 'puskesmas', 'orang_tua']);
  if (error) return error;

  try {
    const { uuid } = await params;
    const body = await request.json();

    const [existing] = await pool.query('SELECT id FROM balita WHERE uuid = ?', [uuid]);
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Balita tidak ditemukan' }, { status: 404 });
    }

    const allowedFields = ['nama', 'nik', 'tanggal_lahir', 'jenis_kelamin', 'berat_lahir',
      'panjang_lahir', 'nama_ibu', 'nama_ayah', 'posyandu_id', 'alamat',
      'kelurahan', 'nama_posyandu'];

    const updates = [];
    const values = [];

    for (const [key, value] of Object.entries(body)) {
      if (allowedFields.includes(key)) {
        updates.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'Tidak ada data yang diubah' }, { status: 400 });
    }

    values.push(uuid);
    await pool.query(`UPDATE balita SET ${updates.join(', ')} WHERE uuid = ?`, values);

    return NextResponse.json({ message: 'Data balita berhasil diperbarui' });
  } catch (err) {
    console.error('Update balita error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}

// DELETE BALITA (soft delete)
export async function DELETE(request, { params }) {
  const { user, error } = await requireAuth(request, ['kader', 'puskesmas']);
  if (error) return error;

  try {
    const { uuid } = await params;
    const [result] = await pool.query(
      'UPDATE balita SET is_active = FALSE WHERE uuid = ?', [uuid]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: 'Balita tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Data balita berhasil dihapus' });
  } catch (err) {
    console.error('Delete balita error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
