import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import pool from '@/lib/db';
import { generateToken } from '@/lib/auth';

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email dan password wajib diisi' }, { status: 400 });
    }

    const [users] = await pool.query(
      'SELECT * FROM users WHERE email = ? AND is_active = TRUE',
      [email]
    );

    if (users.length === 0) {
      return NextResponse.json({ error: 'Email atau password salah' }, { status: 401 });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return NextResponse.json({ error: 'Email atau password salah' }, { status: 401 });
    }

    // Update last login
    await pool.query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);

    const token = generateToken(user.id, user.role);

    // Get onboarding status
    const [onboarding] = await pool.query(
      'SELECT * FROM onboarding_progress WHERE user_id = ?',
      [user.id]
    );

    return NextResponse.json({
      message: 'Login berhasil',
      token,
      user: {
        id: user.id,
        uuid: user.uuid,
        nama: user.nama,
        email: user.email,
        role: user.role,
        no_telepon: user.no_telepon,
        alamat: user.alamat,
        foto_profil: user.foto_profil,
        posyandu_id: user.posyandu_id,
        is_new_user: user.is_new_user,
        onboarding: onboarding[0] || null,
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
