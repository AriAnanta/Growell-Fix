import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

/**
 * GET /api/kelurahan/stats
 * Comprehensive stats for the kelurahan dashboard — all posyandu, all children.
 *
 * Key fix: Uses a single CTE `latest_pengukuran` to avoid inconsistent
 * ROW_NUMBER() sub-queries that could cause count mismatches.
 * Posyandu summary now also includes children linked by `nama_posyandu` text fallback.
 */
export async function GET(request) {
  const { user, error } = await requireAuth(request, ['kelurahan', 'puskesmas']);
  if (error) return error;

  try {
    // ─────────────────────────────────────────────────────
    // Subquery for latest pengukuran per balita (reused across all queries)
    // ─────────────────────────────────────────────────────
    const latestPengukuranCTE = `
      SELECT pk.*
      FROM pengukuran pk
      INNER JOIN (
        SELECT balita_id, MAX(tanggal_pengukuran) as max_tgl
        FROM pengukuran
        GROUP BY balita_id
      ) mx ON pk.balita_id = mx.balita_id AND pk.tanggal_pengukuran = mx.max_tgl
    `;

    // ─────────────────────────────────────────────────────
    // Run all independent queries in parallel via Promise.all
    // Previously: 13 sequential awaits → now: 1 parallel batch
    // ─────────────────────────────────────────────────────
    const [
      [totals],
      [statusBBTB],
      [statusTBU],
      [statusBBU],
      [atRisk],
      [genderDist],
      [monthlyTrend],
      [posyanduSummary],
      [topRekomendasi],
      [ageDist],
      [urgentCases],
      [userCounts],
      [noMeasurement],
      [riskByAge],
      [severeWasting],
      [severeStunting],
    ] = await Promise.all([
      // 1. Total balita
      pool.query('SELECT COUNT(*) as total FROM balita WHERE is_active = TRUE'),

      // 2a. Status BB/TB
      pool.query(`
        SELECT COALESCE(lp.status_gizi_bbtb, 'Belum Diukur') as status, COUNT(DISTINCT b.id) as jumlah
        FROM balita b
        LEFT JOIN (${latestPengukuranCTE}) lp ON lp.balita_id = b.id
        WHERE b.is_active = TRUE
        GROUP BY COALESCE(lp.status_gizi_bbtb, 'Belum Diukur')
        ORDER BY jumlah DESC
      `),

      // 2b. Status TB/U
      pool.query(`
        SELECT COALESCE(lp.status_gizi_tbu, 'Belum Diukur') as status, COUNT(DISTINCT b.id) as jumlah
        FROM balita b
        LEFT JOIN (${latestPengukuranCTE}) lp ON lp.balita_id = b.id
        WHERE b.is_active = TRUE
        GROUP BY COALESCE(lp.status_gizi_tbu, 'Belum Diukur')
        ORDER BY jumlah DESC
      `),

      // 2c. Status BB/U
      pool.query(`
        SELECT COALESCE(lp.status_gizi_bbu, 'Belum Diukur') as status, COUNT(DISTINCT b.id) as jumlah
        FROM balita b
        LEFT JOIN (${latestPengukuranCTE}) lp ON lp.balita_id = b.id
        WHERE b.is_active = TRUE
        GROUP BY COALESCE(lp.status_gizi_bbu, 'Belum Diukur')
        ORDER BY jumlah DESC
      `),

      // 3. At-risk count
      pool.query(`
        SELECT COUNT(DISTINCT b.id) as total
        FROM balita b
        INNER JOIN (${latestPengukuranCTE}) lp ON lp.balita_id = b.id
        WHERE b.is_active = TRUE
          AND (lp.status_gizi_bbtb IN ('Gizi Buruk', 'Gizi Kurang')
            OR lp.status_gizi_tbu IN ('Sangat Pendek', 'Pendek'))
      `),

      // 4. Gender distribution
      pool.query(`SELECT jenis_kelamin, COUNT(*) as jumlah FROM balita WHERE is_active = TRUE GROUP BY jenis_kelamin`),

      // 5. Monthly trend (last 12 months)
      pool.query(`
        SELECT DATE_FORMAT(p.tanggal_pengukuran, '%Y-%m') as bulan,
               COUNT(*) as total_pengukuran,
               COUNT(DISTINCT p.balita_id) as total_balita
        FROM pengukuran p
        JOIN balita b ON p.balita_id = b.id
        WHERE b.is_active = TRUE
        GROUP BY DATE_FORMAT(p.tanggal_pengukuran, '%Y-%m')
        ORDER BY bulan DESC LIMIT 12
      `),

      // 6. Per-posyandu summary
      pool.query(`
        SELECT
          posyandu_label as posyandu,
          kelurahan_label as kelurahan,
          COUNT(DISTINCT balita_id) as total_balita,
          SUM(CASE WHEN status_bbtb = 'Gizi Buruk' THEN 1 ELSE 0 END) as gizi_buruk,
          SUM(CASE WHEN status_bbtb = 'Gizi Kurang' THEN 1 ELSE 0 END) as gizi_kurang,
          SUM(CASE WHEN status_bbtb = 'Gizi Lebih' THEN 1 ELSE 0 END) as gizi_lebih,
          SUM(CASE WHEN status_bbtb IN ('Gizi Buruk','Gizi Kurang') THEN 1 ELSE 0 END) as berisiko_wasting,
          SUM(CASE WHEN status_tbu = 'Sangat Pendek' THEN 1 ELSE 0 END) as sangat_pendek,
          SUM(CASE WHEN status_tbu = 'Pendek' THEN 1 ELSE 0 END) as pendek,
          SUM(CASE WHEN status_tbu = 'Tinggi' THEN 1 ELSE 0 END) as tbu_tinggi,
          SUM(CASE WHEN status_tbu IN ('Sangat Pendek','Pendek') THEN 1 ELSE 0 END) as berisiko_stunting,
          SUM(CASE WHEN status_bbu = 'Berat Badan Sangat Kurang' THEN 1 ELSE 0 END) as bbu_sangat_kurang,
          SUM(CASE WHEN status_bbu = 'Berat Badan Kurang' THEN 1 ELSE 0 END) as bbu_kurang,
          SUM(CASE WHEN status_bbu = 'Berat Badan Lebih' THEN 1 ELSE 0 END) as bbu_lebih,
          SUM(CASE WHEN status_bbu IN ('Berat Badan Sangat Kurang','Berat Badan Kurang') THEN 1 ELSE 0 END) as berisiko_bbu,
          SUM(CASE WHEN (
            status_bbtb IN ('Gizi Buruk','Gizi Kurang')
            OR status_tbu IN ('Sangat Pendek','Pendek')
            OR status_bbu IN ('Berat Badan Sangat Kurang','Berat Badan Kurang')
          ) THEN 1 ELSE 0 END) as berisiko_any
        FROM (
          SELECT
            COALESCE(p.nama, b.nama_posyandu, 'Tanpa Posyandu') as posyandu_label,
            COALESCE(p.kelurahan, b.kelurahan) as kelurahan_label,
            b.id as balita_id,
            lp.status_gizi_bbtb as status_bbtb,
            lp.status_gizi_tbu as status_tbu,
            lp.status_gizi_bbu as status_bbu
          FROM balita b
          LEFT JOIN posyandu p ON b.posyandu_id = p.id
          LEFT JOIN (${latestPengukuranCTE}) lp ON lp.balita_id = b.id
          WHERE b.is_active = TRUE
        ) combined
        GROUP BY posyandu_label, kelurahan_label
        ORDER BY posyandu_label
      `),

      // 7. Top rekomendasi
      pool.query(`
        SELECT lp.rekomendasi_utama, COUNT(DISTINCT lp.balita_id) as jumlah
        FROM (${latestPengukuranCTE}) lp
        JOIN balita b ON lp.balita_id = b.id
        WHERE b.is_active = TRUE
          AND lp.rekomendasi_utama IS NOT NULL AND lp.rekomendasi_utama != ''
        GROUP BY lp.rekomendasi_utama
        ORDER BY jumlah DESC LIMIT 10
      `),

      // 8. Age distribution
      pool.query(`
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
      `),

      // 9. Urgent cases
      pool.query(`
        SELECT b.uuid, b.nama, b.tanggal_lahir, b.jenis_kelamin, b.nama_ibu,
               lp.berat_badan, lp.tinggi_badan, lp.tanggal_pengukuran,
               lp.status_gizi_bbtb, lp.status_gizi_tbu, lp.status_gizi_bbu,
               lp.rekomendasi_utama,
               COALESCE(p.nama, b.nama_posyandu) as posyandu_nama
        FROM balita b
        INNER JOIN (${latestPengukuranCTE}) lp ON lp.balita_id = b.id
        LEFT JOIN posyandu p ON b.posyandu_id = p.id
        WHERE b.is_active = TRUE
          AND (lp.status_gizi_bbtb IN ('Gizi Buruk', 'Gizi Kurang')
            OR lp.status_gizi_tbu IN ('Sangat Pendek', 'Pendek'))
        ORDER BY
          CASE lp.status_gizi_bbtb WHEN 'Gizi Buruk' THEN 0 WHEN 'Gizi Kurang' THEN 1 ELSE 2 END,
          CASE lp.status_gizi_tbu WHEN 'Sangat Pendek' THEN 0 WHEN 'Pendek' THEN 1 ELSE 2 END
        LIMIT 50
      `),

      // 10. User counts by role
      pool.query(`
        SELECT role, COUNT(*) as jumlah
        FROM users
        WHERE role IN ('kader', 'ahli_gizi') AND is_active = TRUE
        GROUP BY role
      `),

      // 11. Balita without any measurement
      pool.query(`
        SELECT COUNT(*) as total
        FROM balita b
        LEFT JOIN pengukuran p ON p.balita_id = b.id
        WHERE b.is_active = TRUE AND p.id IS NULL
      `),

      // 12. Risk by age group
      pool.query(`
        SELECT
          CASE
            WHEN TIMESTAMPDIFF(MONTH, b.tanggal_lahir, CURDATE()) BETWEEN 0 AND 12 THEN '0-12 bln'
            WHEN TIMESTAMPDIFF(MONTH, b.tanggal_lahir, CURDATE()) BETWEEN 13 AND 24 THEN '13-24 bln'
            WHEN TIMESTAMPDIFF(MONTH, b.tanggal_lahir, CURDATE()) BETWEEN 25 AND 36 THEN '25-36 bln'
            WHEN TIMESTAMPDIFF(MONTH, b.tanggal_lahir, CURDATE()) BETWEEN 37 AND 48 THEN '37-48 bln'
            ELSE '49-60 bln'
          END as kelompok_usia,
          COUNT(DISTINCT b.id) as total_balita,
          COUNT(DISTINCT CASE WHEN lp.status_gizi_bbtb IN ('Gizi Buruk','Gizi Kurang')
                     OR lp.status_gizi_tbu IN ('Sangat Pendek','Pendek') THEN b.id END) as berisiko
        FROM balita b
        LEFT JOIN (${latestPengukuranCTE}) lp ON lp.balita_id = b.id
        WHERE b.is_active = TRUE
        GROUP BY kelompok_usia
        ORDER BY kelompok_usia
      `),

      // 13. Severe wasting count
      pool.query(`
        SELECT COUNT(DISTINCT b.id) as total
        FROM balita b
        INNER JOIN (${latestPengukuranCTE}) lp ON lp.balita_id = b.id
        WHERE b.is_active = TRUE AND lp.status_gizi_bbtb = 'Gizi Buruk'
      `),

      // 14. Severe stunting count
      pool.query(`
        SELECT COUNT(DISTINCT b.id) as total
        FROM balita b
        INNER JOIN (${latestPengukuranCTE}) lp ON lp.balita_id = b.id
        WHERE b.is_active = TRUE AND lp.status_gizi_tbu = 'Sangat Pendek'
      `),
    ]);

    const totalKader = userCounts.find(u => u.role === 'kader')?.jumlah || 0;
    const totalAhliGizi = userCounts.find(u => u.role === 'ahli_gizi')?.jumlah || 0;

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
      totalKader,
      totalAhliGizi,
      noMeasurementCount: noMeasurement[0].total,
      riskByAge,
      severeWasting: severeWasting[0].total,
      severeStunting: severeStunting[0].total,
    });
  } catch (err) {
    console.error('Kelurahan stats error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
