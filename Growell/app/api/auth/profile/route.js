import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// GET Profile
export async function GET(request) {
  const { user, error } = await requireAuth(request);
  if (error) return error;

  try {
    const [users] = await pool.query(
      `SELECT u.id, u.uuid, u.nama, u.email, u.role, u.no_telepon, u.alamat, 
        u.foto_profil, u.posyandu_id, u.is_new_user, u.created_at,
        p.nama AS posyandu_nama
      FROM users u
      LEFT JOIN posyandu p ON u.posyandu_id = p.id
      WHERE u.id = ?`,
      [user.id]
    );

    const [onboarding] = await pool.query(
      'SELECT * FROM onboarding_progress WHERE user_id = ?',
      [user.id]
    );

    return NextResponse.json({
      user: { ...users[0], onboarding: onboarding[0] || null }
    });
  } catch (err) {
    console.error('Get profile error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}

// UPDATE Profile
export async function PUT(request) {
  const { user, error } = await requireAuth(request);
  if (error) return error;

  try {
    const body = await request.json();
    const { nama, no_telepon, alamat, currentPassword, newPassword } = body;

    // Handle password change
    if (currentPassword && newPassword) {
      const [users] = await pool.query('SELECT password FROM users WHERE id = ?', [user.id]);
      const isMatch = await bcrypt.compare(currentPassword, users[0].password);
      if (!isMatch) {
        return NextResponse.json({ error: 'Password lama salah' }, { status: 400 });
      }
      if (newPassword.length < 6) {
        return NextResponse.json({ error: 'Password baru minimal 6 karakter' }, { status: 400 });
      }
      const hashed = await bcrypt.hash(newPassword, 10);
      await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashed, user.id]);
    }

    // Handle profile update
    const updates = [];
    const values = [];
    if (nama) { updates.push('nama = ?'); values.push(nama); }
    if (no_telepon !== undefined) { updates.push('no_telepon = ?'); values.push(no_telepon); }
    if (alamat !== undefined) { updates.push('alamat = ?'); values.push(alamat); }

    if (updates.length > 0) {
      values.push(user.id);
      await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);
    }

    return NextResponse.json({ message: 'Profil berhasil diperbarui' });
  } catch (err) {
    console.error('Update profile error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
