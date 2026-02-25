import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import pool from '@/lib/db';
import { generateToken } from '@/lib/auth';

export async function POST(request) {
  try {
    const body = await request.json();
    const { nama, email, password, no_telepon, alamat } = body;

    // Validation
    if (!nama || !email || !password) {
      return NextResponse.json(
        { error: 'Nama, email, dan password wajib diisi' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password minimal 6 karakter' }, { status: 400 });
    }

    // Check existing
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return NextResponse.json({ error: 'Email sudah terdaftar' }, { status: 409 });
    }

    // Public registration is ONLY for orang_tua (parents)
    // Other roles (kader, ahli_gizi, puskesmas, kelurahan) are created by admin/seed only
    const role = 'orang_tua';

    const hashedPassword = await bcrypt.hash(password, 10);
    const uuid = uuidv4();

    const [result] = await pool.query(
      'INSERT INTO users (uuid, nama, email, password, role, no_telepon, alamat) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [uuid, nama, email, hashedPassword, role, no_telepon || null, alamat || null]
    );

    // Create onboarding entry
    await pool.query(
      'INSERT INTO onboarding_progress (user_id, completed_steps) VALUES (?, ?)',
      [result.insertId, JSON.stringify([])]
    );

    const token = generateToken(result.insertId, role);

    return NextResponse.json({
      message: 'Registrasi berhasil',
      token,
      user: { id: result.insertId, uuid, nama, email, role, is_new_user: true }
    }, { status: 201 });
  } catch (err) {
    console.error('Register error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
