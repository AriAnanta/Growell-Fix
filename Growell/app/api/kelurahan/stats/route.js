import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

/**
 * GET /api/kelurahan/stats
 * Comprehensive stats for the kelurahan dashboard — all posyandu, all children
 */
export async function GET(request) {
  const { user, error } = await requireAuth(request, ['kelurahan', 'puskesmas']);
  if (error) return error;

  try {
    // 1. Total balita
    const [totals] = await pool.query('SELECT COUNT(*) as total FROM balita WHERE is_active = TRUE');

    // 2. Status gizi distribution (latest pengukuran per balita)
    const [statusBBTB] = await pool.query(`
      SELECT COALESCE(latest.status_gizi_bbtb, 'Belum Diukur') as status, COUNT(*) as jumlah
      FROM balita b
      LEFT JOIN (
        SELECT pk.*, ROW_NUMBER() OVER (PARTITION BY pk.balita_id ORDER BY pk.tanggal_pengukuran DESC) as rn
        FROM pengukuran pk
      ) latest ON latest.balita_id = b.id AND latest.rn = 1
      WHERE b.is_active = TRUE
      GROUP BY latest.status_gizi_bbtb
    `);

    const [statusTBU] = await pool.query(`
      SELECT COALESCE(latest.status_gizi_tbu, 'Belum Diukur') as status, COUNT(*) as jumlah
      FROM balita b
      LEFT JOIN (
        SELECT pk.*, ROW_NUMBER() OVER (PARTITION BY pk.balita_id ORDER BY pk.tanggal_pengukuran DESC) as rn
        FROM pengukuran pk
      ) latest ON latest.balita_id = b.id AND latest.rn = 1
      WHERE b.is_active = TRUE
      GROUP BY latest.status_gizi_tbu
    `);

    const [statusBBU] = await pool.query(`
      SELECT COALESCE(latest.status_gizi_bbu, 'Belum Diukur') as status, COUNT(*) as jumlah
      FROM balita b
      LEFT JOIN (
        SELECT pk.*, ROW_NUMBER() OVER (PARTITION BY pk.balita_id ORDER BY pk.tanggal_pengukuran DESC) as rn
        FROM pengukuran pk
      ) latest ON latest.balita_id = b.id AND latest.rn = 1
      WHERE b.is_active = TRUE
      GROUP BY latest.status_gizi_bbu
    `);

    // 3. At-risk children (stunting + wasting + underweight)
    const [atRisk] = await pool.query(`
      SELECT COUNT(DISTINCT b.id) as total
      FROM balita b
      INNER JOIN (
        SELECT pk.*, ROW_NUMBER() OVER (PARTITION BY pk.balita_id ORDER BY pk.tanggal_pengukuran DESC) as rn
        FROM pengukuran pk
      ) latest ON latest.balita_id = b.id AND latest.rn = 1
      WHERE b.is_active = TRUE
        AND (latest.status_gizi_bbtb IN ('Gizi Buruk', 'Gizi Kurang')
          OR latest.status_gizi_tbu IN ('Sangat Pendek', 'Pendek'))
    `);

    // 4. Gender distribution
    const [genderDist] = await pool.query(
      `SELECT jenis_kelamin, COUNT(*) as jumlah FROM balita WHERE is_active = TRUE GROUP BY jenis_kelamin`
    );

    // 5. Monthly measurement trend (last 12 months)
    const [monthlyTrend] = await pool.query(`
      SELECT DATE_FORMAT(p.tanggal_pengukuran, '%Y-%m') as bulan,
             COUNT(*) as total_pengukuran,
             COUNT(DISTINCT p.balita_id) as total_balita
      FROM pengukuran p
      JOIN balita b ON p.balita_id = b.id
      WHERE b.is_active = TRUE
      GROUP BY DATE_FORMAT(p.tanggal_pengukuran, '%Y-%m')
      ORDER BY bulan DESC LIMIT 12
    `);

    // 6. Per-posyandu summary
    const [posyanduSummary] = await pool.query(`
      SELECT p.nama as posyandu, p.kelurahan,
             COUNT(DISTINCT b.id) as total_balita,
             SUM(CASE WHEN latest.status_gizi_bbtb IN ('Gizi Buruk','Gizi Kurang') THEN 1 ELSE 0 END) as berisiko_wasting,
             SUM(CASE WHEN latest.status_gizi_tbu IN ('Sangat Pendek','Pendek') THEN 1 ELSE 0 END) as berisiko_stunting
      FROM posyandu p
      LEFT JOIN balita b ON b.posyandu_id = p.id AND b.is_active = TRUE
      LEFT JOIN (
        SELECT pk.*, ROW_NUMBER() OVER (PARTITION BY pk.balita_id ORDER BY pk.tanggal_pengukuran DESC) as rn
        FROM pengukuran pk
      ) latest ON latest.balita_id = b.id AND latest.rn = 1
      GROUP BY p.id, p.nama, p.kelurahan
      ORDER BY p.nama
    `);

    // 7. Top rekomendasi intervensi
    const [topRekomendasi] = await pool.query(`
      SELECT rekomendasi_utama, COUNT(*) as jumlah
      FROM pengukuran
      WHERE rekomendasi_utama IS NOT NULL AND rekomendasi_utama != ''
      GROUP BY rekomendasi_utama
      ORDER BY jumlah DESC LIMIT 10
    `);

    // 8. Age distribution (0-6, 7-12, 13-24, 25-36, 37-48, 49-60)
    const [ageDist] = await pool.query(`
      SELECT
        CASE
          WHEN TIMESTAMPDIFF(MONTH, b.tanggal_lahir, CURDATE()) BETWEEN 0 AND 6 THEN '0-6'
          WHEN TIMESTAMPDIFF(MONTH, b.tanggal_lahir, CURDATE()) BETWEEN 7 AND 12 THEN '7-12'
          WHEN TIMESTAMPDIFF(MONTH, b.tanggal_lahir, CURDATE()) BETWEEN 13 AND 24 THEN '13-24'
          WHEN TIMESTAMPDIFF(MONTH, b.tanggal_lahir, CURDATE()) BETWEEN 25 AND 36 THEN '25-36'
          WHEN TIMESTAMPDIFF(MONTH, b.tanggal_lahir, CURDATE()) BETWEEN 37 AND 48 THEN '37-48'
          ELSE '49-60'
        END as kelompok_usia,
        COUNT(*) as jumlah
      FROM balita b WHERE b.is_active = TRUE
      GROUP BY kelompok_usia ORDER BY kelompok_usia
    `);

    // 9. Children needing urgent intervention
    const [urgentCases] = await pool.query(`
      SELECT b.uuid, b.nama, b.tanggal_lahir, b.jenis_kelamin, b.nama_ibu,
             latest.berat_badan, latest.tinggi_badan, latest.tanggal_pengukuran,
             latest.status_gizi_bbtb, latest.status_gizi_tbu, latest.status_gizi_bbu,
             latest.rekomendasi_utama,
             p.nama as posyandu_nama
      FROM balita b
      INNER JOIN (
        SELECT pk.*, ROW_NUMBER() OVER (PARTITION BY pk.balita_id ORDER BY pk.tanggal_pengukuran DESC) as rn
        FROM pengukuran pk
      ) latest ON latest.balita_id = b.id AND latest.rn = 1
      LEFT JOIN posyandu p ON b.posyandu_id = p.id
      WHERE b.is_active = TRUE
        AND (latest.status_gizi_bbtb IN ('Gizi Buruk', 'Gizi Kurang')
          OR latest.status_gizi_tbu IN ('Sangat Pendek', 'Pendek'))
      ORDER BY
        CASE latest.status_gizi_bbtb WHEN 'Gizi Buruk' THEN 0 WHEN 'Gizi Kurang' THEN 1 ELSE 2 END,
        CASE latest.status_gizi_tbu WHEN 'Sangat Pendek' THEN 0 WHEN 'Pendek' THEN 1 ELSE 2 END
      LIMIT 20
    `);

    return NextResponse.json({
      totalBalita: totals[0].total,
      balitaBerisiko: atRisk[0].total,
      statusBBTB,
      statusTBU,
      statusBBU,
      genderDistribution: genderDist,
      monthlyTrend: monthlyTrend.reverse(),
      posyanduSummary,
      topRekomendasi,
      ageDistribution: ageDist,
      urgentCases,
    });
  } catch (err) {
    console.error('Kelurahan stats error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
