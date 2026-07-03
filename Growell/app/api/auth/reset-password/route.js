import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import pool from '@/lib/db';

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, no_telepon, newPassword } = body;

    if (!email || !newPassword) {
      return NextResponse.json(
        { error: 'Email dan password baru wajib diisi' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Password minimal 6 karakter' },
        { status: 400 }
      );
    }

    // Find user by email
    const [users] = await pool.query('SELECT id, no_telepon FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return NextResponse.json({ error: 'Data verifikasi tidak cocok' }, { status: 400 });
    }

    const user = users[0];

    // Verification check: no_telepon must match (if it exists in DB)
    if (user.no_telepon) {
      if (!no_telepon || user.no_telepon !== no_telepon) {
        return NextResponse.json({ error: 'Data verifikasi tidak cocok' }, { status: 400 });
      }
    } else {
        // if user never set phone number, maybe we require them to have no phone number typed
        if (no_telepon && no_telepon.trim() !== "") {
             return NextResponse.json({ error: 'Data verifikasi tidak cocok' }, { status: 400 });
        }
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, user.id]);

    return NextResponse.json({ message: 'Password berhasil diubah' }, { status: 200 });
  } catch (err) {
    console.error('Reset password error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
