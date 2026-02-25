import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// GET RECENT MEASUREMENTS (with balita info)
export async function GET(request) {
  const { user, error } = await requireAuth(request);
  if (error) return error;

  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit')) || 10;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (user.role === 'kader') {
      whereClause += ' AND pk.kader_id = ?';
      params.push(user.id);
    } else if (user.role === 'orang_tua') {
      whereClause += ' AND b.orang_tua_id = ?';
      params.push(user.id);
    }

    const [rows] = await pool.query(
      `SELECT pk.uuid, pk.tanggal_pengukuran, pk.berat_badan, pk.tinggi_badan,
              pk.status_gizi_bbu, pk.status_gizi_tbu, pk.status_gizi_bbtb,
              b.uuid AS balita_uuid, b.nama AS nama_balita, b.jenis_kelamin, b.tanggal_lahir
       FROM pengukuran pk
       JOIN balita b ON pk.balita_id = b.id
       ${whereClause}
       ORDER BY pk.created_at DESC
       LIMIT ?`,
      [...params, limit]
    );

    return NextResponse.json({ data: rows });
  } catch (err) {
    console.error('Get pengukuran error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}

// ADD MEASUREMENT (save without prediction — prediction runs separately via /api/predict)
export async function POST(request) {
  const { user, error } = await requireAuth(request, ['kader', 'puskesmas']);
  if (error) return error;

  try {
    const body = await request.json();
    const { balita_id, tanggal_pengukuran, berat_badan, tinggi_badan,
      lingkar_lengan, lingkar_kepala, catatan } = body;

    if (!balita_id || !tanggal_pengukuran || !berat_badan || !tinggi_badan) {
      return NextResponse.json({ error: 'Data pengukuran wajib lengkap' }, { status: 400 });
    }

    // Get balita data
    const [balitaData] = await pool.query(
      'SELECT * FROM balita WHERE id = ? OR uuid = ?',
      [balita_id, balita_id]
    );

    if (balitaData.length === 0) {
      return NextResponse.json({ error: 'Balita tidak ditemukan' }, { status: 404 });
    }

    const balita = balitaData[0];

    // Save measurement (without prediction — prediction happens later via /api/predict)
    const uuid = uuidv4();
    const [result] = await pool.query(
      `INSERT INTO pengukuran (uuid, balita_id, tanggal_pengukuran, berat_badan, tinggi_badan,
        lingkar_lengan, lingkar_kepala,
        kader_id, catatan)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        uuid, balita.id, tanggal_pengukuran, berat_badan, tinggi_badan,
        lingkar_lengan || null, lingkar_kepala || null,
        user.id, catatan || null
      ]
    );

    // Notify parent that measurement has been recorded
    if (balita.orang_tua_id) {
      await pool.query(
        `INSERT INTO notifications (uuid, user_id, judul, pesan, tipe, link)
        VALUES (?, ?, ?, ?, 'info', ?)`,
        [
          uuidv4(), balita.orang_tua_id,
          'Data Pengukuran Dicatat',
          `Data pengukuran ${balita.nama} pada ${tanggal_pengukuran} telah dicatat oleh kader. Pastikan Anda sudah mengisi form orang tua untuk mendapatkan hasil prediksi.`,
          `/orang-tua?balita=${balita.uuid}`
        ]
      );
    }

    return NextResponse.json({
      message: 'Data pengukuran berhasil disimpan',
      pengukuran: { id: result.insertId, uuid }
    }, { status: 201 });
  } catch (err) {
    console.error('Create measurement error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
