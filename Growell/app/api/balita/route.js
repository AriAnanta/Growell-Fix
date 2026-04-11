import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// GET ALL BALITA (filtered by role)
export async function GET(request) {
  const { user, error } = await requireAuth(request);
  if (error) return error;

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 20;
    const search = searchParams.get('search');
    const posyandu_id = searchParams.get('posyandu_id');
    const status = searchParams.get('status'); // 'normal' | 'risiko'
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE b.is_active = TRUE';
    const params = [];

    // Role-based filtering
    if (user.role === 'orang_tua') {
      whereClause += ' AND b.orang_tua_id = ?';
      params.push(user.id);
    } else if (user.role === 'kader') {
      // Kader dapat melihat semua balita (posyandu_id tidak selalu terisi saat input)
    }

    if (search) {
      whereClause += ' AND (b.nama LIKE ? OR b.nik LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (posyandu_id) {
      whereClause += ' AND b.posyandu_id = ?';
      params.push(posyandu_id);
    }

    // Status filter — applied against the latest measurement join
    let statusClause = '';
    if (status === 'normal') {
      statusClause = `AND latest.status_gizi_bbu = 'Berat Badan Normal'
        AND latest.status_gizi_bbtb = 'Gizi Baik'
        AND latest.status_gizi_tbu = 'Normal'`;
    } else if (status === 'risiko') {
      statusClause = `AND (
        (latest.status_gizi_bbu  IS NOT NULL AND latest.status_gizi_bbu  != 'Berat Badan Normal') OR
        (latest.status_gizi_bbtb IS NOT NULL AND latest.status_gizi_bbtb != 'Gizi Baik') OR
        (latest.status_gizi_tbu  IS NOT NULL AND latest.status_gizi_tbu  != 'Normal')
      )`;
    }

    // Subquery used by both COUNT and SELECT so the status filter is applied consistently
    const latestJoin = `LEFT JOIN (
        SELECT pk.*, ROW_NUMBER() OVER (PARTITION BY pk.balita_id ORDER BY pk.tanggal_pengukuran DESC) as rn
        FROM pengukuran pk
      ) latest ON latest.balita_id = b.id AND latest.rn = 1`;

    const sort = searchParams.get('sort');
    const orderBy = sort === 'recent'
      ? 'ORDER BY latest.tanggal_pengukuran DESC'
      : 'ORDER BY b.nama ASC';

    // Total count (includes status filter so pagination is accurate)
    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total
       FROM balita b
       ${latestJoin}
       ${whereClause}
       ${statusClause}`,
      params
    );

    // Balita list with latest measurement
    const [balitaList] = await pool.query(
      `SELECT b.*, 
        p.nama AS posyandu_nama,
        u.nama AS nama_orang_tua_user,
        latest.berat_badan AS berat_terakhir,
        latest.tinggi_badan AS tinggi_terakhir,
        latest.status_gizi_bbu, latest.status_gizi_tbu, latest.status_gizi_bbtb,
        latest.tanggal_pengukuran AS pengukuran_terakhir
      FROM balita b
      LEFT JOIN posyandu p ON b.posyandu_id = p.id
      LEFT JOIN users u ON b.orang_tua_id = u.id
      ${latestJoin}
      ${whereClause}
      ${statusClause}
      ${orderBy}
      LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const total = Number(countResult[0].total);
    return NextResponse.json({
      data: balitaList,
      pagination: {
        page, limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('Get balita error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}

// CREATE BALITA
export async function POST(request) {
  const { user, error } = await requireAuth(request, ['kader', 'puskesmas', 'orang_tua']);
  if (error) return error;

  try {
    const body = await request.json();
    const { nama, nik, tanggal_lahir, jenis_kelamin, berat_lahir, panjang_lahir,
      nama_orang_tua, orang_tua_id, posyandu_id, alamat } = body;

    if (!nama || !tanggal_lahir || !jenis_kelamin) {
      return NextResponse.json({ error: 'Nama, tanggal lahir, dan jenis kelamin wajib diisi' }, { status: 400 });
    }

    if (!['Laki-Laki', 'Perempuan'].includes(jenis_kelamin)) {
      return NextResponse.json({ error: 'Jenis kelamin tidak valid' }, { status: 400 });
    }

    const uuid = uuidv4();
    const finalOrangTuaId = user.role === 'orang_tua' ? user.id : (orang_tua_id || null);

    const [result] = await pool.query(
      `INSERT INTO balita (uuid, nik, nama, tanggal_lahir, jenis_kelamin, berat_lahir, panjang_lahir,
        nama_orang_tua, orang_tua_id, posyandu_id, alamat)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [uuid, nik || null, nama, tanggal_lahir, jenis_kelamin, berat_lahir || null,
       panjang_lahir || null, nama_orang_tua || null,
       finalOrangTuaId, posyandu_id || null, alamat || null]
    );

    return NextResponse.json({
      message: 'Data balita berhasil ditambahkan',
      balita: { id: result.insertId, uuid, nama }
    }, { status: 201 });
  } catch (err) {
    console.error('Create balita error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
