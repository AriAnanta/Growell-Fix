import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// GET ALL POSYANDU
export async function GET(request) {
  const { user, error } = await requireAuth(request);
  if (error) return error;

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const kelurahan = searchParams.get('kelurahan');

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (search) {
      whereClause += ' AND (p.nama LIKE ? OR p.kelurahan LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    if (kelurahan) {
      whereClause += ' AND p.kelurahan = ?';
      params.push(kelurahan);
    }

    const [list] = await pool.query(
      `SELECT p.*, u.nama AS kader_nama,
        (SELECT COUNT(*) FROM balita WHERE posyandu_id = p.id AND is_active = TRUE) AS total_balita
      FROM posyandu p
      LEFT JOIN users u ON p.kader_id = u.id
      ${whereClause}
      ORDER BY p.nama ASC`,
      params
    );

    return NextResponse.json({ data: list });
  } catch (err) {
    console.error('Get posyandu error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}

// CREATE POSYANDU
export async function POST(request) {
  const { user, error } = await requireAuth(request, ['puskesmas', 'kelurahan']);
  if (error) return error;

  try {
    const body = await request.json();
    const { nama, alamat, kelurahan, kecamatan, kota, kader_id } = body;

    if (!nama) {
      return NextResponse.json({ error: 'Nama posyandu wajib diisi' }, { status: 400 });
    }

    const uuid = uuidv4();
    const [result] = await pool.query(
      'INSERT INTO posyandu (uuid, nama, alamat, kelurahan, kecamatan, kota, kader_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [uuid, nama, alamat || null, kelurahan || null, kecamatan || null, kota || null, kader_id || null]
    );

    return NextResponse.json({
      message: 'Posyandu berhasil ditambahkan',
      posyandu: { id: result.insertId, uuid, nama }
    }, { status: 201 });
  } catch (err) {
    console.error('Create posyandu error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
