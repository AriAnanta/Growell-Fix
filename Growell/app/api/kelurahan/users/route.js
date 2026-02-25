import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

/**
 * GET /api/kelurahan/users
 * List all kader & ahli_gizi accounts
 */
export async function GET(request) {
  const { user, error } = await requireAuth(request, ['kelurahan', 'puskesmas']);
  if (error) return error;

  try {
    const [rows] = await pool.query(
      `SELECT uuid, nama, email, role, no_telepon, alamat, created_at, is_active
       FROM users
       WHERE role IN ('kader', 'ahli_gizi')
       ORDER BY created_at DESC`
    );
    return NextResponse.json({ data: rows });
  } catch (err) {
    console.error('GET /api/kelurahan/users error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}

/**
 * POST /api/kelurahan/users
 * Create a new kader or ahli_gizi account
 */
export async function POST(request) {
  const { user, error } = await requireAuth(request, ['kelurahan', 'puskesmas']);
  if (error) return error;

  try {
    const body = await request.json();
    const { nama, email, password, role, no_telepon, alamat } = body;

    if (!nama || !email || !password || !role) {
      return NextResponse.json({ error: 'Nama, email, password, dan role wajib diisi' }, { status: 400 });
    }

    if (!['kader', 'ahli_gizi'].includes(role)) {
      return NextResponse.json({ error: 'Role hanya boleh kader atau ahli_gizi' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password minimal 6 karakter' }, { status: 400 });
    }

    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return NextResponse.json({ error: 'Email sudah terdaftar' }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const uuid = uuidv4();

    const [result] = await pool.query(
      'INSERT INTO users (uuid, nama, email, password, role, no_telepon, alamat, is_new_user) VALUES (?, ?, ?, ?, ?, ?, ?, FALSE)',
      [uuid, nama, email, hashedPassword, role, no_telepon || null, alamat || null]
    );

    // Create onboarding entry
    await pool.query(
      'INSERT INTO onboarding_progress (user_id, completed_steps, is_completed) VALUES (?, ?, TRUE)',
      [result.insertId, JSON.stringify([])]
    );

    return NextResponse.json({
      message: 'Akun berhasil dibuat',
      user: { uuid, nama, email, role }
    }, { status: 201 });
  } catch (err) {
    console.error('POST /api/kelurahan/users error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
