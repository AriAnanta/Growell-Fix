import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import ExcelJS from 'exceljs';

/**
 * GET /api/kelurahan/export
 * Export comprehensive 3-sheet Excel with:
 *   Sheet 1 — Ringkasan   : summary stats & status gizi distribution
 *   Sheet 2 — Pengukuran  : kader-form data (balita + measurements)
 *   Sheet 3 — Survey OT   : parent-form data (survey_balita)
 *
 * Status gizi categories:
 *   TB/U  : Sangat Pendek, Pendek, Normal, Tinggi
 *   BB/TB : Gizi Buruk, Gizi Kurang, Gizi Baik, Gizi Lebih
 *   BB/U  : Berat Badan Sangat Kurang, Berat Badan Kurang, Berat Badan Normal, Berat Badan Lebih
 */
export async function GET(request) {
  const { user, error } = await requireAuth(request, ['kelurahan', 'puskesmas']);
  if (error) return error;

  try {
    // ── Shared CTE: latest pengukuran per balita ─────────────────
    const latestCTE = `
      SELECT pk.*
      FROM pengukuran pk
      INNER JOIN (
        SELECT balita_id, MAX(tanggal_pengukuran) as max_tgl
        FROM pengukuran
        GROUP BY balita_id
      ) mx ON pk.balita_id = mx.balita_id AND pk.tanggal_pengukuran = mx.max_tgl
    `;

    // ── 1. Summary stats (based on latest pengukuran per balita) ─
    const [[summary]] = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM balita WHERE is_active = TRUE) AS total_balita,
        COUNT(DISTINCT lp.balita_id) AS total_balita_diukur,
        /* BB/U */
        COUNT(DISTINCT CASE WHEN lp.status_gizi_bbu = 'Berat Badan Normal'        THEN b.id END) AS bbu_normal,
        COUNT(DISTINCT CASE WHEN lp.status_gizi_bbu = 'Berat Badan Kurang'        THEN b.id END) AS bbu_kurang,
        COUNT(DISTINCT CASE WHEN lp.status_gizi_bbu = 'Berat Badan Sangat Kurang' THEN b.id END) AS bbu_sangat_kurang,
        COUNT(DISTINCT CASE WHEN lp.status_gizi_bbu = 'Berat Badan Lebih'         THEN b.id END) AS bbu_lebih,
        /* TB/U */
        COUNT(DISTINCT CASE WHEN lp.status_gizi_tbu = 'Normal'        THEN b.id END) AS tbu_normal,
        COUNT(DISTINCT CASE WHEN lp.status_gizi_tbu = 'Pendek'        THEN b.id END) AS tbu_pendek,
        COUNT(DISTINCT CASE WHEN lp.status_gizi_tbu = 'Sangat Pendek' THEN b.id END) AS tbu_sangat_pendek,
        COUNT(DISTINCT CASE WHEN lp.status_gizi_tbu = 'Tinggi'        THEN b.id END) AS tbu_tinggi,
        /* BB/TB */
        COUNT(DISTINCT CASE WHEN lp.status_gizi_bbtb = 'Gizi Baik'   THEN b.id END) AS bbtb_baik,
        COUNT(DISTINCT CASE WHEN lp.status_gizi_bbtb = 'Gizi Kurang'  THEN b.id END) AS bbtb_kurang,
        COUNT(DISTINCT CASE WHEN lp.status_gizi_bbtb = 'Gizi Buruk'   THEN b.id END) AS bbtb_buruk,
        COUNT(DISTINCT CASE WHEN lp.status_gizi_bbtb = 'Gizi Lebih'   THEN b.id END) AS bbtb_lebih,
        /* combined */
        COUNT(DISTINCT CASE WHEN lp.status_gizi_tbu  IN ('Pendek','Sangat Pendek') THEN b.id END) AS stunting,
        COUNT(DISTINCT CASE WHEN lp.status_gizi_bbtb IN ('Gizi Buruk','Gizi Kurang') THEN b.id END) AS wasting,
        COUNT(DISTINCT CASE WHEN lp.status_gizi_bbu  IN ('Berat Badan Sangat Kurang','Berat Badan Kurang') THEN b.id END) AS underweight
      FROM balita b
      LEFT JOIN (${latestCTE}) lp ON lp.balita_id = b.id
      WHERE b.is_active = TRUE
    `);

    // ── 2. All pengukuran rows (kader form data) ─────────────────
    const [pengRows] = await pool.query(`
      SELECT
        b.nama                  AS nama_balita,
        b.jenis_kelamin,
        b.tanggal_lahir,
        b.nama_ibu,
        b.nama_ayah,
        b.berat_lahir,
        b.panjang_lahir         AS tinggi_lahir,
        COALESCE(b.kelurahan, p.kelurahan) AS kelurahan_balita,
        COALESCE(p.nama, b.nama_posyandu) AS posyandu,
        p.kecamatan,
        TIMESTAMPDIFF(MONTH, b.tanggal_lahir, pk.tanggal_pengukuran) AS usia_bulan,
        pk.tanggal_pengukuran,
        pk.berat_badan,
        pk.tinggi_badan,
        pk.lingkar_lengan       AS lila,
        pk.lingkar_kepala,
        pk.kondisi_bb_bulan_lalu,
        pk.status_gizi_bbu,
        pk.status_gizi_tbu,
        pk.status_gizi_bbtb,
        pk.rekomendasi_utama,
        pk.rekomendasi_tambahan,
        pk.catatan_rekomendasi,
        pk.catatan
      FROM pengukuran pk
      JOIN balita b ON pk.balita_id = b.id
      LEFT JOIN posyandu p ON b.posyandu_id = p.id
      WHERE b.is_active = TRUE
      ORDER BY COALESCE(p.nama, b.nama_posyandu), b.nama, pk.tanggal_pengukuran DESC
    `);

    // ── 3. Survey rows (parent form data) ────────────────────────
    const [surveyRows] = await pool.query(`
      SELECT
        b.nama                          AS nama_balita,
        b.jenis_kelamin,
        b.tanggal_lahir,
        b.nama_ibu,
        COALESCE(p.nama, b.nama_posyandu) AS posyandu,
        COALESCE(p.kelurahan, b.kelurahan) AS kelurahan,
        p.kecamatan,
        sv.created_at                   AS tanggal_survey,
        /* Riwayat Kelahiran */
        sv.usia_kehamilan_lahir,
        sv.is_bblr,
        sv.is_prematur,
        sv.is_imd,
        sv.is_komplikasi_lahir,
        sv.jenis_komplikasi_lahir,
        /* Kesehatan Orang Tua */
        sv.tinggi_ibu,
        sv.berat_ibu,
        sv.tinggi_ayah,
        sv.berat_ayah,
        sv.status_gizi_ibu_hamil,
        sv.is_anemia_ibu,
        sv.is_hamil_muda,
        sv.jarak_kelahiran,
        sv.is_hipertensi_gestasional,
        sv.is_diabetes_gestasional,
        sv.is_infeksi_kehamilan,
        /* Suplemen Kehamilan */
        sv.frekuensi_suplemen_kehamilan,
        sv.is_suplemen_kehamilan,
        sv.is_hamil_lagi,
        sv.frekuensi_suplemen_minggu,
        sv.jenis_suplemen_ibu,
        sv.is_ttd_90_tablet,
        /* ASI & MP-ASI */
        sv.is_asi_eksklusif,
        sv.usia_mulai_mpasi,
        sv.frekuensi_mpasi_hewani,
        sv.is_mpasi_hewani,
        sv.frekuensi_makan_utama,
        sv.is_susu_non_asi,
        sv.frekuensi_susu_non_asi,
        /* Suplemen & Intervensi */
        sv.terakhir_vitamin_a,
        sv.frekuensi_tablet_besi,
        sv.is_tablet_besi_anak,
        sv.is_obat_cacing_anak,
        sv.is_intervensi_gizi,
        sv.jenis_intervensi_gizi,
        /* Kesehatan & Vaksinasi */
        sv.riwayat_vaksinasi,
        sv.is_sakit_2_minggu,
        sv.jenis_penyakit_balita,
        sv.is_penyakit_bawaan,
        sv.is_pernah_rawat_inap,
        /* Konsumsi Makan (Recall H-1) */
        sv.konsumsi_asi_h1,
        sv.konsumsi_karbohidrat_h1,
        sv.konsumsi_kacangan_h1,
        sv.konsumsi_susu_hewani_h1,
        sv.is_susu_murni_100,
        sv.konsumsi_daging_ikan_h1,
        sv.konsumsi_telur_h1,
        sv.konsumsi_vit_a_h1,
        sv.konsumsi_buah_sayur_h1,
        sv.frekuensi_konsumsi_manis,
        sv.is_konsumsi_manis_berlebih,
        sv.is_pernah_pmt,
        /* Pola Hidup & Lingkungan */
        sv.jam_tidur_harian,
        sv.durasi_aktivitas_luar_ket,
        sv.durasi_aktivitas_luar,
        sv.tingkat_aktivitas_anak,
        sv.is_ibu_bekerja,
        sv.pengetahuan_gizi_ibu,
        sv.pola_asuh_makan,
        sv.is_bpjs,
        sv.is_perokok_di_rumah,
        sv.sumber_air_minum,
        sv.kualitas_air_minum,
        sv.jenis_sanitasi,
        sv.kebersihan_lingkungan,
        sv.kebiasaan_cuci_tangan,
        /* Akses, Psikologi & Ekonomi */
        sv.akses_faskes,
        sv.frekuensi_posyandu,
        sv.frekuensi_posyandu_bulan,
        sv.is_baby_blues,
        sv.is_gejala_depresi,
        sv.pendidikan_ibu,
        sv.pendidikan_ayah,
        sv.is_pernah_penyuluhan,
        sv.frekuensi_kelas_ibu,
        sv.tingkat_paham_makanan,
        sv.pekerjaan_kk,
        sv.jumlah_art,
        sv.pendapatan_bulanan,
        sv.jarak_akses_pangan,
        sv.is_pantangan_makan,
        sv.penentu_makanan
      FROM survey_balita sv
      JOIN balita b ON sv.balita_id = b.id
      LEFT JOIN posyandu p ON b.posyandu_id = p.id
      WHERE b.is_active = TRUE
      ORDER BY COALESCE(p.nama, b.nama_posyandu), b.nama, sv.created_at DESC
    `);

    // ── Helpers ─────────────────────────────────────────────────────
    const bool = (v) => v === 1 || v === true ? 'Ya' : v === 0 || v === false ? 'Tidak' : '';
    const fmt  = (v) => v ?? '';
    const fmtD = (v) => v ? new Date(v).toISOString().split('T')[0] : '';
    const arr  = (v) => {
      if (!v) return '';
      try { const a = typeof v === 'string' ? JSON.parse(v) : v; return Array.isArray(a) ? a.join('; ') : String(v); }
      catch { return String(v); }
    };

    const pct = (n) => {
      const measured = summary.total_balita_diukur || 0;
      return measured > 0 ? ` (${((n / measured) * 100).toFixed(1)}%)` : '';
    };

    // ── Colors ──────────────────────────────────────────────────────
    const GREEN_BG  = 'FFdcfce7';
    const RED_BG    = 'FFfee2e2';
    const YELLOW_BG = 'FFfef9c3';
    const BLUE_BG   = 'FFdbeafe';
    const ROW_RED   = 'FFfef2f2';  // light pink for full-row highlight
    const ROW_AMBER = 'FFfffbeb';  // light amber for full-row highlight
    const HEADER_DARK = 'FF1e293b';
    const HEADER_TEAL = 'FF0f766e';
    const HEADER_VIOLET = 'FF4c1d95';

    const styleHeader = (row, bgArgb) => {
      row.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        cell.border = { bottom: { style: 'thin', color: { argb: 'FFcbd5e1' } } };
      });
      row.height = 32;
    };

    // Check if a status is abnormal
    const isAbnormalBBTB = (s) => s && ['Gizi Buruk', 'Gizi Kurang', 'Gizi Lebih'].includes(s);
    const isAbnormalTBU  = (s) => s && ['Sangat Pendek', 'Pendek', 'Tinggi'].includes(s);
    const isAbnormalBBU  = (s) => s && ['Berat Badan Sangat Kurang', 'Berat Badan Kurang', 'Berat Badan Lebih'].includes(s);
    const isSevere       = (s) => s && (/Buruk|Sangat Pendek|Sangat Kurang/i).test(s);

    // Status cell fill
    const statusFill = (val) => {
      if (!val) return null;
      const s = val.toLowerCase();
      if (s.includes('gizi baik') || s === 'normal' || s.includes('berat badan normal')) return GREEN_BG;
      if (s.includes('gizi buruk') || s.includes('sangat pendek') || s.includes('sangat kurang')) return RED_BG;
      if (s.includes('gizi kurang') || s.includes('pendek') || s.includes('berat badan kurang')) return YELLOW_BG;
      if (s.includes('lebih') || s.includes('tinggi')) return BLUE_BG;
      return null;
    };

    // ── Build workbook ──────────────────────────────────────────────
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Growell – Platform Posyandu Digital';
    wb.created = new Date();

    // ════════════════════════════════════════════════════════════════
    // SHEET 1 — RINGKASAN
    // ════════════════════════════════════════════════════════════════
    const ws1 = wb.addWorksheet('Ringkasan');
    ws1.getColumn(1).width = 40;
    ws1.getColumn(2).width = 20;
    ws1.getColumn(3).width = 20;

    const addSection = (ws, title) => {
      ws.addRow([]);
      const r = ws.addRow([title]);
      r.getCell(1).font = { bold: true, size: 12, color: { argb: HEADER_DARK } };
      r.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFf1f5f9' } };
      ws.mergeCells(r.number, 1, r.number, 3);
      r.height = 22;
    };
    const addStat = (ws, label, val, colorArgb) => {
      const r = ws.addRow([label, val]);
      r.getCell(1).alignment = { vertical: 'middle' };
      r.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };
      r.getCell(2).font = { bold: true };
      if (colorArgb) {
        r.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colorArgb } };
      }
    };

    // Title block
    ws1.mergeCells('A1:C1');
    const titleRow = ws1.getRow(1);
    titleRow.getCell(1).value = 'LAPORAN REKAPITULASI STATUS GIZI BALITA';
    titleRow.getCell(1).font = { bold: true, size: 14, color: { argb: HEADER_DARK } };
    titleRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
    titleRow.height = 30;

    ws1.mergeCells('A2:C2');
    ws1.getRow(2).getCell(1).value = `Dicetak: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`;
    ws1.getRow(2).getCell(1).alignment = { horizontal: 'center' };
    ws1.getRow(2).getCell(1).font = { color: { argb: 'FF64748b' }, size: 10 };

    ws1.addRow([]);
    const hdrRow = ws1.addRow(['Metrik', 'Jumlah', 'Keterangan']);
    styleHeader(hdrRow, HEADER_DARK);

    addStat(ws1, 'Total Balita Terdaftar', summary.total_balita || 0);
    addStat(ws1, 'Total Balita Sudah Diukur', summary.total_balita_diukur || 0);

    // BB/U — Berat Badan / Umur
    addSection(ws1, '📊 Distribusi Status Gizi BB/U (Berat Badan / Umur)');
    addStat(ws1, 'Berat Badan Normal',        (summary.bbu_normal        || 0) + pct(summary.bbu_normal        || 0), GREEN_BG);
    addStat(ws1, 'Berat Badan Kurang',        (summary.bbu_kurang        || 0) + pct(summary.bbu_kurang        || 0), YELLOW_BG);
    addStat(ws1, 'Berat Badan Sangat Kurang', (summary.bbu_sangat_kurang || 0) + pct(summary.bbu_sangat_kurang || 0), RED_BG);
    addStat(ws1, 'Berat Badan Lebih',         (summary.bbu_lebih         || 0) + pct(summary.bbu_lebih         || 0), BLUE_BG);
    addStat(ws1, '⚠️  Underweight (Kurang + Sangat Kurang)', summary.underweight || 0, RED_BG);

    // TB/U — Tinggi Badan / Umur
    addSection(ws1, '📊 Distribusi Status Gizi TB/U (Tinggi Badan / Umur)');
    addStat(ws1, 'Normal',        (summary.tbu_normal       || 0) + pct(summary.tbu_normal       || 0), GREEN_BG);
    addStat(ws1, 'Pendek',        (summary.tbu_pendek       || 0) + pct(summary.tbu_pendek       || 0), YELLOW_BG);
    addStat(ws1, 'Sangat Pendek', (summary.tbu_sangat_pendek|| 0) + pct(summary.tbu_sangat_pendek|| 0), RED_BG);
    addStat(ws1, 'Tinggi',        (summary.tbu_tinggi       || 0) + pct(summary.tbu_tinggi       || 0), BLUE_BG);
    addStat(ws1, '⚠️  Stunting (Pendek + Sangat Pendek)', summary.stunting || 0, RED_BG);

    // BB/TB — Berat Badan / Tinggi Badan
    addSection(ws1, '📊 Distribusi Status Gizi BB/TB (Berat Badan / Tinggi Badan)');
    addStat(ws1, 'Gizi Baik',   (summary.bbtb_baik   || 0) + pct(summary.bbtb_baik   || 0), GREEN_BG);
    addStat(ws1, 'Gizi Kurang', (summary.bbtb_kurang || 0) + pct(summary.bbtb_kurang || 0), YELLOW_BG);
    addStat(ws1, 'Gizi Buruk',  (summary.bbtb_buruk  || 0) + pct(summary.bbtb_buruk  || 0), RED_BG);
    addStat(ws1, 'Gizi Lebih',  (summary.bbtb_lebih  || 0) + pct(summary.bbtb_lebih  || 0), BLUE_BG);
    addStat(ws1, '⚠️  Wasting (Gizi Buruk + Kurang BB/TB)', summary.wasting || 0, RED_BG);

    ws1.views = [{ state: 'frozen', ySplit: 4 }];

    // ════════════════════════════════════════════════════════════════
    // SHEET 2 — DATA PENGUKURAN (Kader Form)
    // ════════════════════════════════════════════════════════════════
    const ws2 = wb.addWorksheet('Data Pengukuran');
    const pengHeaders = [
      'No', 'Nama Balita', 'Jenis Kelamin', 'Tanggal Lahir', 'Usia (Bln)',
      'Nama Ibu', 'Nama Ayah', 'BB Lahir (kg)', 'Tinggi Lahir (cm)',
      'Kelurahan', 'Posyandu', 'Kecamatan',
      'Tgl Pengukuran', 'Berat Badan (kg)', 'Tinggi Badan (cm)', 'LiLA (cm)', 'Lingkar Kepala (cm)',
      'Kondisi BB Bln Lalu',
      'Status BB/U', 'Status TB/U', 'Status BB/TB',
      'Rekomendasi Utama', 'Rekomendasi Tambahan', 'Catatan Rekomendasi', 'Catatan Kader'
    ];
    ws2.addRow(pengHeaders);
    styleHeader(ws2.getRow(1), HEADER_TEAL);

    const pengColWidths = [5,22,14,14,10,20,20,12,13,18,20,16,14,14,14,10,14,16,22,16,18,30,40,30,25];
    pengColWidths.forEach((w,i) => ws2.getColumn(i+1).width = w);

    pengRows.forEach((r, idx) => {
      const row = ws2.addRow([
        idx + 1, fmt(r.nama_balita), fmt(r.jenis_kelamin),
        fmtD(r.tanggal_lahir), r.usia_bulan ?? '',
        fmt(r.nama_ibu), fmt(r.nama_ayah),
        r.berat_lahir ?? '', r.tinggi_lahir ?? '',
        fmt(r.kelurahan_balita), fmt(r.posyandu), fmt(r.kecamatan),
        fmtD(r.tanggal_pengukuran),
        r.berat_badan ?? '', r.tinggi_badan ?? '', r.lila ?? '', r.lingkar_kepala ?? '',
        fmt(r.kondisi_bb_bulan_lalu),
        fmt(r.status_gizi_bbu), fmt(r.status_gizi_tbu), fmt(r.status_gizi_bbtb),
        fmt(r.rekomendasi_utama), arr(r.rekomendasi_tambahan),
        fmt(r.catatan_rekomendasi), fmt(r.catatan),
      ]);

      // Determine if this row has any abnormal status
      const hasAbnormal = isAbnormalBBTB(r.status_gizi_bbtb) || isAbnormalTBU(r.status_gizi_tbu) || isAbnormalBBU(r.status_gizi_bbu);
      const hasSevere = isSevere(r.status_gizi_bbtb) || isSevere(r.status_gizi_tbu) || isSevere(r.status_gizi_bbu);

      // Highlight entire row if status is abnormal
      if (hasAbnormal) {
        const rowBg = hasSevere ? ROW_RED : ROW_AMBER;
        row.eachCell({ includeEmpty: true }, (cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
        });
      }

      // Additionally, colour-code the three status columns more prominently
      const statusCols = [19, 20, 21]; // Status BB/U, TB/U, BB/TB
      statusCols.forEach((ci) => {
        const cell = row.getCell(ci);
        const fill = statusFill(cell.value);
        if (fill) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } };
          cell.font = { bold: true };
        }
      });

      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.alignment = { vertical: 'middle', wrapText: false };
      });
    });

    ws2.views = [{ state: 'frozen', ySplit: 1 }];

    // ════════════════════════════════════════════════════════════════
    // SHEET 3 — SURVEY ORANG TUA (Parent Form)
    // ════════════════════════════════════════════════════════════════
    const ws3 = wb.addWorksheet('Survey Orang Tua');
    const surveyHeaders = [
      // Identitas
      'No', 'Nama Balita', 'JK', 'Tgl Lahir', 'Nama Ibu',
      'Posyandu', 'Kelurahan', 'Kecamatan', 'Tgl Survey',
      // Sec 2 – Riwayat Kelahiran
      'Usia Kehamilan (mgg)', 'BBLR', 'Prematur', 'IMD', 'Komplikasi Lahir', 'Jenis Komplikasi',
      // Sec 3 – Kesehatan Ortu
      'Tinggi Ibu (cm)', 'Berat Ibu (kg)', 'Tinggi Ayah (cm)', 'Berat Ayah (kg)',
      'Status Gizi Ibu Hamil', 'Anemia Ibu', 'Hamil < 20 Thn',
      'Jarak Kelahiran', 'Hipertensi Gestasional', 'Diabetes Gestasional', 'Infeksi Kehamilan',
      // Sec 4 – Suplemen
      'Rutinitas Suplemen Kehamilan', 'Suplemen Rutin (Bool)', 'Hamil Lagi',
      'Frek Suplemen (×/mgg)', 'Jenis Suplemen Ibu', 'TTD 90 Tablet',
      // Sec 5 – ASI & MPASI
      'ASI Eksklusif', 'Usia Mulai MPASI (bln)', 'Frekuensi MPASI Hewani', 'MPASI Hewani (Bool)',
      'Frek Makan Utama (/hari)', 'Susu Selain ASI', 'Frek Susu Non-ASI',
      // Sec 6 – Suplemen & Intervensi
      'Terakhir Vitamin A', 'Frek Tablet Besi Anak', 'Tablet Besi Anak (Bool)',
      'Obat Cacing', 'Intervensi Gizi', 'Jenis Intervensi',
      // Sec 7 – Kesehatan & Vaksin
      'Riwayat Vaksinasi', 'Sakit 2 Mgg Terakhir', 'Jenis Penyakit', 'Penyakit Bawaan', 'Pernah Rawat Inap',
      // Sec 8 – Konsumsi Makan (H-1)
      'ASI Kemarin', 'Makan Pokok', 'Kacang-kacangan', 'Produk Susu', 'Susu Murni 100%',
      'Protein Hewani', 'Telur', 'Sayur Vit A', 'Buah & Sayur Lain',
      'Frekuensi Manis', 'Manis Berlebih (Bool)', 'Bantuan Gizi (PMT)',
      // Sec 9 – Pola Hidup & Lingkungan
      'Jam Tidur Harian', 'Durasi Aktivitas Luar', 'Durasi Luar (jam)',
      'Tingkat Aktivitas Anak', 'Ibu Bekerja',
      'Pengetahuan Gizi Ibu', 'Pola Asuh Makan',
      'BPJS', 'Perokok di Rumah', 'Sumber Air', 'Kualitas Air',
      'Sanitasi', 'Kebersihan Lingkungan', 'Cuci Tangan',
      // Sec 10 – Akses, Psikologi & Ekonomi
      'Akses Faskes', 'Frekuensi Posyandu', 'Frek Posyandu (×/bln)',
      'Baby Blues', 'Gejala Depresi',
      'Pendidikan Ibu', 'Pendidikan Ayah',
      'Pernah Penyuluhan', 'Frek Kelas Ibu (×/thn)', 'Tingkat Paham Makanan Sehat',
      'Pekerjaan KK', 'Jumlah ART', 'Pendapatan Bulanan',
      'Jarak Akses Pangan', 'Pantangan Makan', 'Penentu Makanan',
    ];

    ws3.addRow(surveyHeaders);
    styleHeader(ws3.getRow(1), HEADER_VIOLET);

    // auto width
    surveyHeaders.forEach((h, i) => ws3.getColumn(i+1).width = Math.min(Math.max(h.length + 4, 14), 35));
    ws3.getColumn(1).width = 5;
    ws3.getColumn(2).width = 22;

    surveyRows.forEach((r, idx) => {
      const row = ws3.addRow([
        // Identitas
        idx + 1, fmt(r.nama_balita), fmt(r.jenis_kelamin),
        fmtD(r.tanggal_lahir), fmt(r.nama_ibu),
        fmt(r.posyandu), fmt(r.kelurahan), fmt(r.kecamatan), fmtD(r.tanggal_survey),
        // Riwayat Kelahiran
        r.usia_kehamilan_lahir ?? '', bool(r.is_bblr), bool(r.is_prematur),
        bool(r.is_imd), bool(r.is_komplikasi_lahir), fmt(r.jenis_komplikasi_lahir),
        // Kesehatan Ortu
        r.tinggi_ibu ?? '', r.berat_ibu ?? '', r.tinggi_ayah ?? '', r.berat_ayah ?? '',
        fmt(r.status_gizi_ibu_hamil), bool(r.is_anemia_ibu), bool(r.is_hamil_muda),
        fmt(r.jarak_kelahiran), bool(r.is_hipertensi_gestasional),
        bool(r.is_diabetes_gestasional), bool(r.is_infeksi_kehamilan),
        // Suplemen Kehamilan
        fmt(r.frekuensi_suplemen_kehamilan), bool(r.is_suplemen_kehamilan), bool(r.is_hamil_lagi),
        fmt(r.frekuensi_suplemen_minggu), arr(r.jenis_suplemen_ibu), bool(r.is_ttd_90_tablet),
        // ASI & MPASI
        bool(r.is_asi_eksklusif), fmt(r.usia_mulai_mpasi),
        fmt(r.frekuensi_mpasi_hewani), bool(r.is_mpasi_hewani),
        r.frekuensi_makan_utama ?? '', bool(r.is_susu_non_asi), r.frekuensi_susu_non_asi ?? '',
        // Suplemen & Intervensi
        fmt(r.terakhir_vitamin_a), fmt(r.frekuensi_tablet_besi), bool(r.is_tablet_besi_anak),
        bool(r.is_obat_cacing_anak), bool(r.is_intervensi_gizi), arr(r.jenis_intervensi_gizi),
        // Kesehatan & Vaksin
        arr(r.riwayat_vaksinasi), bool(r.is_sakit_2_minggu), arr(r.jenis_penyakit_balita),
        bool(r.is_penyakit_bawaan), bool(r.is_pernah_rawat_inap),
        // Konsumsi Makan H-1
        bool(r.konsumsi_asi_h1), bool(r.konsumsi_karbohidrat_h1), bool(r.konsumsi_kacangan_h1),
        bool(r.konsumsi_susu_hewani_h1), bool(r.is_susu_murni_100),
        bool(r.konsumsi_daging_ikan_h1), bool(r.konsumsi_telur_h1),
        bool(r.konsumsi_vit_a_h1), bool(r.konsumsi_buah_sayur_h1),
        fmt(r.frekuensi_konsumsi_manis), bool(r.is_konsumsi_manis_berlebih), bool(r.is_pernah_pmt),
        // Pola Hidup & Lingkungan
        r.jam_tidur_harian ?? '', fmt(r.durasi_aktivitas_luar_ket), r.durasi_aktivitas_luar ?? '',
        fmt(r.tingkat_aktivitas_anak), bool(r.is_ibu_bekerja),
        fmt(r.pengetahuan_gizi_ibu), fmt(r.pola_asuh_makan),
        bool(r.is_bpjs), bool(r.is_perokok_di_rumah),
        fmt(r.sumber_air_minum), fmt(r.kualitas_air_minum),
        fmt(r.jenis_sanitasi), fmt(r.kebersihan_lingkungan), fmt(r.kebiasaan_cuci_tangan),
        // Akses, Psikologi & Ekonomi
        fmt(r.akses_faskes), fmt(r.frekuensi_posyandu), r.frekuensi_posyandu_bulan ?? '',
        bool(r.is_baby_blues), bool(r.is_gejala_depresi),
        fmt(r.pendidikan_ibu), fmt(r.pendidikan_ayah),
        bool(r.is_pernah_penyuluhan), r.frekuensi_kelas_ibu ?? '', fmt(r.tingkat_paham_makanan),
        fmt(r.pekerjaan_kk), r.jumlah_art ?? '', fmt(r.pendapatan_bulanan),
        fmt(r.jarak_akses_pangan), bool(r.is_pantangan_makan), fmt(r.penentu_makanan),
      ]);

      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.alignment = { vertical: 'middle', wrapText: false };
      });
    });

    ws3.views = [{ state: 'frozen', ySplit: 1 }];

    // ── Output ──────────────────────────────────────────────────────
    const buffer = await wb.xlsx.writeBuffer();
    const today = new Date().toISOString().split('T')[0];

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="laporan_gizi_balita_${today}.xlsx"`,
      },
    });
  } catch (err) {
    console.error('Export error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
