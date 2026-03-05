import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

/**
 * PUT /api/kelurahan/users/[uuid]
 * Update a kader or ahli_gizi account
 */
export async function PUT(request, { params }) {
  const { user, error } = await requireAuth(request, ['kelurahan', 'puskesmas']);
  if (error) return error;

  const { uuid } = params;

  try {
    const body = await request.json();
    const { nama, email, password, no_telepon, alamat } = body;

    if (!nama || !email) {
      return NextResponse.json({ error: 'Nama dan email wajib diisi' }, { status: 400 });
    }

    // Check target user exists and is editable role
    const [[target]] = await pool.query(
      'SELECT id, email FROM users WHERE uuid = ? AND role IN (\'kader\', \'ahli_gizi\')',
      [uuid]
    );
    if (!target) {
      return NextResponse.json({ error: 'Akun tidak ditemukan' }, { status: 404 });
    }

    // Check email uniqueness (excluding self)
    const [emailCheck] = await pool.query(
      'SELECT id FROM users WHERE email = ? AND uuid != ?',
      [email, uuid]
    );
    if (emailCheck.length > 0) {
      return NextResponse.json({ error: 'Email sudah digunakan akun lain' }, { status: 409 });
    }

    if (password) {
      if (password.length < 6) {
        return NextResponse.json({ error: 'Password minimal 6 karakter' }, { status: 400 });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      await pool.query(
        'UPDATE users SET nama = ?, email = ?, password = ?, no_telepon = ?, alamat = ? WHERE uuid = ?',
        [nama, email, hashedPassword, no_telepon || null, alamat || null, uuid]
      );
    } else {
      await pool.query(
        'UPDATE users SET nama = ?, email = ?, no_telepon = ?, alamat = ? WHERE uuid = ?',
        [nama, email, no_telepon || null, alamat || null, uuid]
      );
    }

    return NextResponse.json({ message: 'Akun berhasil diperbarui' });
  } catch (err) {
    console.error('PUT /api/kelurahan/users/[uuid] error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}

/**
 * DELETE /api/kelurahan/users/[uuid]
 * Delete a kader or ahli_gizi account
 */
export async function DELETE(request, { params }) {
  const { user, error } = await requireAuth(request, ['kelurahan', 'puskesmas']);
  if (error) return error;

  const { uuid } = params;

  try {
    const [[target]] = await pool.query(
      'SELECT id FROM users WHERE uuid = ? AND role IN (\'kader\', \'ahli_gizi\')',
      [uuid]
    );
    if (!target) {
      return NextResponse.json({ error: 'Akun tidak ditemukan' }, { status: 404 });
    }

    await pool.query('DELETE FROM users WHERE uuid = ?', [uuid]);

    return NextResponse.json({ message: 'Akun berhasil dihapus' });
  } catch (err) {
    console.error('DELETE /api/kelurahan/users/[uuid] error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
