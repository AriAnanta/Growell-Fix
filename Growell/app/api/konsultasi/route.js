import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// GET MY CONSULTATIONS
export async function GET(request) {
  const { user, error } = await requireAuth(request);
  if (error) return error;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 20;
    const offset = (page - 1) * limit;

    let whereClause = '';
    const params = [];

    if (user.role === 'orang_tua') {
      whereClause = 'WHERE k.orang_tua_id = ?';
      params.push(user.id);
    } else if (user.role === 'ahli_gizi') {
      whereClause = 'WHERE (k.ahli_gizi_id = ? OR (k.ahli_gizi_id IS NULL AND k.status = "menunggu"))';
      params.push(user.id);
    } else {
      whereClause = 'WHERE 1=1';
    }

    if (status) {
      whereClause += ' AND k.status = ?';
      params.push(status);
    }

    const [consultations] = await pool.query(
      `SELECT k.*, 
        ot.nama AS orang_tua_nama, ot.foto_profil AS orang_tua_foto,
        ag.nama AS ahli_gizi_nama, ag.foto_profil AS ahli_gizi_foto,
        b.nama AS balita_nama,
        (SELECT COUNT(*) FROM pesan_konsultasi WHERE konsultasi_id = k.id AND is_read = FALSE AND pengirim_id != ?) as unread_count
      FROM konsultasi k
      LEFT JOIN users ot ON k.orang_tua_id = ot.id
      LEFT JOIN users ag ON k.ahli_gizi_id = ag.id
      LEFT JOIN balita b ON k.balita_id = b.id
      ${whereClause}
      ORDER BY 
        CASE k.status 
          WHEN 'aktif' THEN 1 
          WHEN 'menunggu' THEN 2 
          WHEN 'selesai' THEN 3 
          WHEN 'dibatalkan' THEN 4 
        END,
        k.updated_at DESC
      LIMIT ? OFFSET ?`,
      [user.id, ...params, limit, offset]
    );

    return NextResponse.json({ data: consultations });
  } catch (err) {
    console.error('Get consultations error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}

// CREATE CONSULTATION REQUEST
export async function POST(request) {
  const { user, error } = await requireAuth(request, ['orang_tua']);
  if (error) return error;

  try {
    const body = await request.json();
    const { jadwal_konsultasi, balita_id, ahli_gizi_id } = body;
    const topik = body.topik || 'Konsultasi Gizi';

    if (!ahli_gizi_id) {
      return NextResponse.json({ error: 'Pilih Ahli Gizi terlebih dahulu' }, { status: 400 });
    }

    const uuid = uuidv4();

    // Verify ahli gizi exists
    const [ahliGizi] = await pool.query(
      `SELECT id, nama FROM users WHERE role = 'ahli_gizi' AND id = ? AND is_active = TRUE`,
      [ahli_gizi_id]
    );

    if (ahliGizi.length === 0) {
      return NextResponse.json({ error: 'Ahli Gizi tidak ditemukan atau tidak aktif' }, { status: 404 });
    }

    const [result] = await pool.query(
      `INSERT INTO konsultasi (uuid, orang_tua_id, ahli_gizi_id, balita_id, topik, jadwal_konsultasi)
      VALUES (?, ?, ?, ?, ?, ?)`,
      [uuid, user.id, ahliGizi[0].id, balita_id || null, topik, jadwal_konsultasi || null]
    );

    // Notify ahli gizi
    if (ahliGizi[0]) {
      await pool.query(
        `INSERT INTO notifications (uuid, user_id, judul, pesan, tipe, link)
        VALUES (?, ?, ?, ?, 'konsultasi', ?)`,
        [uuidv4(), ahliGizi[0].id, 'Permintaan Konsultasi Baru',
         `${user.nama} mengajukan permintaan konsultasi gizi`,
         `/konsultasi/${uuid}`]
      );
    }

    return NextResponse.json({
      message: 'Permintaan konsultasi berhasil dibuat',
      konsultasi: { id: result.insertId, uuid, status: 'menunggu', ahli_gizi: ahliGizi[0]?.nama || 'Menunggu penugasan' }
    }, { status: 201 });
  } catch (err) {
    console.error('Create consultation error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
