import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// DASHBOARD STATISTICS
export async function GET(request) {
  const { user, error } = await requireAuth(request, ['kader', 'puskesmas', 'kelurahan']);
  if (error) return error;

  try {
    let posyanduFilter = '';
    const params = [];

    if (user.role === 'kader') {
      // Kader dapat melihat semua balita (posyandu_id tidak selalu terisi saat input)
      posyanduFilter = '';
    }

    // Total balita
    const [totalBalita] = await pool.query(
      `SELECT COUNT(*) as total FROM balita b WHERE b.is_active = TRUE ${posyanduFilter}`, params
    );

    // Status distribution (latest measurements)
    const [statusDistribution] = await pool.query(
      `SELECT latest.status_gizi_bbtb, COUNT(*) as jumlah
      FROM balita b
      INNER JOIN (
        SELECT pk.*, ROW_NUMBER() OVER (PARTITION BY pk.balita_id ORDER BY pk.tanggal_pengukuran DESC) as rn
        FROM pengukuran pk
      ) latest ON latest.balita_id = b.id AND latest.rn = 1
      WHERE b.is_active = TRUE ${posyanduFilter}
      GROUP BY latest.status_gizi_bbtb`,
      params
    );

    // Monthly measurements
    const [monthlyMeasurements] = await pool.query(
      `SELECT DATE_FORMAT(p.tanggal_pengukuran, '%Y-%m') as bulan, COUNT(*) as jumlah
      FROM pengukuran p
      JOIN balita b ON p.balita_id = b.id
      WHERE b.is_active = TRUE ${posyanduFilter}
      GROUP BY DATE_FORMAT(p.tanggal_pengukuran, '%Y-%m')
      ORDER BY bulan DESC LIMIT 12`,
      params
    );

    // At risk count
    const [atRisk] = await pool.query(
      `SELECT COUNT(DISTINCT b.id) as total
      FROM balita b
      INNER JOIN (
        SELECT pk.*, ROW_NUMBER() OVER (PARTITION BY pk.balita_id ORDER BY pk.tanggal_pengukuran DESC) as rn
        FROM pengukuran pk
      ) latest ON latest.balita_id = b.id AND latest.rn = 1
      WHERE b.is_active = TRUE ${posyanduFilter}
        AND (latest.status_gizi_bbtb IN ('Gizi Buruk', 'Gizi Kurang')
          OR latest.status_gizi_tbu IN ('Sangat Pendek', 'Pendek'))`,
      params
    );

    // Normal balita: all three gizi statuses are normal
    const [normalBalita] = await pool.query(
      `SELECT COUNT(DISTINCT b.id) as total
      FROM balita b
      INNER JOIN (
        SELECT pk.*, ROW_NUMBER() OVER (PARTITION BY pk.balita_id ORDER BY pk.tanggal_pengukuran DESC) as rn
        FROM pengukuran pk
      ) latest ON latest.balita_id = b.id AND latest.rn = 1
      WHERE b.is_active = TRUE ${posyanduFilter}
        AND latest.status_gizi_bbu = 'Berat Badan Normal'
        AND latest.status_gizi_bbtb = 'Gizi Baik'
        AND latest.status_gizi_tbu = 'Normal'`,
      params
    );

    return NextResponse.json({
      totalBalita: Number(totalBalita[0].total),
      normalBalita: Number(normalBalita[0].total),
      balitaBerisiko: Number(atRisk[0].total),
      statusDistribution,
      monthlyMeasurements
    });
  } catch (err) {
    console.error('Dashboard stats error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
