import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import ExcelJS from 'exceljs';

/**
 * GET /api/kelurahan/export
 * Export all measurement + survey data as Excel (.xlsx) for download
 */
export async function GET(request) {
  const { user, error } = await requireAuth(request, ['kelurahan', 'puskesmas']);
  if (error) return error;

  try {
    // Get all data with latest measurement per child, joined with survey + posyandu
    const [rows] = await pool.query(`
      SELECT
        b.nama AS nama_balita,
        b.jenis_kelamin,
        b.tanggal_lahir,
        b.nama_ibu,
        b.nama_ayah,
        TIMESTAMPDIFF(MONTH, b.tanggal_lahir, COALESCE(pk.tanggal_pengukuran, CURDATE())) AS usia_bulan,
        pk.tanggal_pengukuran,
        pk.berat_badan,
        pk.tinggi_badan,
        pk.lingkar_lengan AS lila,
        pk.lingkar_kepala,
        pk.status_gizi_bbu,
        pk.status_gizi_tbu,
        pk.status_gizi_bbtb,
        pk.rekomendasi_utama,
        pk.rekomendasi_tambahan,
        pk.catatan_rekomendasi,
        p.nama AS posyandu,
        p.kelurahan,
        p.kecamatan,
        sv.is_bblr,
        sv.is_prematur,
        sv.is_imd,
        sv.tinggi_ibu,
        sv.berat_ibu,
        sv.tinggi_ayah,
        sv.berat_ayah,
        sv.status_gizi_ibu_hamil,
        sv.is_anemia_ibu,
        sv.is_asi_eksklusif,
        sv.pola_asuh_makan,
        sv.jenis_sanitasi,
        sv.sumber_air_minum,
        sv.pendidikan_ibu,
        sv.pendidikan_ayah,
        sv.pendapatan_bulanan,
        sv.is_perokok_di_rumah
      FROM balita b
      LEFT JOIN (
        SELECT pk2.*, ROW_NUMBER() OVER (PARTITION BY pk2.balita_id ORDER BY pk2.tanggal_pengukuran DESC) as rn
        FROM pengukuran pk2
      ) pk ON pk.balita_id = b.id AND pk.rn = 1
      LEFT JOIN posyandu p ON b.posyandu_id = p.id
      LEFT JOIN (
        SELECT sv2.*, ROW_NUMBER() OVER (PARTITION BY sv2.balita_id ORDER BY sv2.updated_at DESC) as rn
        FROM survey_balita sv2
      ) sv ON sv.balita_id = b.id AND sv.rn = 1
      WHERE b.is_active = TRUE
      ORDER BY p.nama, b.nama
    `);

    const boolLabel = (v) => v === 1 || v === true ? 'Ya' : v === 0 || v === false ? 'Tidak' : '';
    const parseJSON = (v) => {
      if (!v) return '';
      try {
        const arr = typeof v === 'string' ? JSON.parse(v) : v;
        return Array.isArray(arr) ? arr.join('; ') : String(v);
      } catch { return String(v); }
    };
    const fmt = (v) => v ?? '';
    const fmtDate = (v) => v ? new Date(v).toISOString().split('T')[0] : '';

    // Build Excel workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Growell';
    workbook.created = new Date();

    const ws = workbook.addWorksheet('Laporan Gizi Balita');

    // Headers
    const headers = [
      'Nama Balita', 'Jenis Kelamin', 'Tanggal Lahir', 'Nama Ibu', 'Nama Ayah',
      'Usia (Bulan)', 'Tanggal Pengukuran', 'Berat Badan (kg)', 'Tinggi Badan (cm)',
      'LiLA (cm)', 'Lingkar Kepala (cm)',
      'Status Gizi BB/U', 'Status Gizi TB/U', 'Status Gizi BB/TB',
      'Rekomendasi Utama', 'Rekomendasi Tambahan', 'Catatan Rekomendasi',
      'Posyandu', 'Kelurahan', 'Kecamatan',
      'BBLR', 'Prematur', 'IMD',
      'Tinggi Ibu (cm)', 'Berat Ibu (kg)', 'Tinggi Ayah (cm)', 'Berat Ayah (kg)',
      'Status Gizi Ibu Hamil', 'Anemia Ibu', 'ASI Eksklusif',
      'Pola Asuh Makan', 'Jenis Sanitasi', 'Sumber Air',
      'Pendidikan Ibu', 'Pendidikan Ayah', 'Pendapatan', 'Perokok di Rumah',
    ];

    // Header row styling
    ws.addRow(headers);
    const headerRow = ws.getRow(1);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1e293b' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = { bottom: { style: 'thin', color: { argb: 'FF94a3b8' } } };
    });
    headerRow.height = 36;

    // Status gizi color helper
    const getStatusFill = (val) => {
      if (!val) return null;
      const s = val.toLowerCase();
      if (s.includes('gizi baik') || s.includes('normal') || s.includes('berat badan normal'))
        return 'FFd1fae5'; // emerald
      if (s.includes('gizi buruk') || s.includes('sangat pendek') || s.includes('sangat kurang'))
        return 'FFfee2e2'; // red
      if (s.includes('gizi kurang') || s.includes('pendek') || s.includes('kurang'))
        return 'FFfef9c3'; // yellow
      if (s.includes('gizi lebih') || s.includes('lebih'))
        return 'FFdbeafe'; // blue
      return null;
    };

    // Data rows
    for (const r of rows) {
      const rowData = [
        fmt(r.nama_balita), fmt(r.jenis_kelamin), fmtDate(r.tanggal_lahir),
        fmt(r.nama_ibu), fmt(r.nama_ayah),
        r.usia_bulan ?? '', fmtDate(r.tanggal_pengukuran),
        r.berat_badan ?? '', r.tinggi_badan ?? '',
        r.lila ?? '', r.lingkar_kepala ?? '',
        fmt(r.status_gizi_bbu), fmt(r.status_gizi_tbu), fmt(r.status_gizi_bbtb),
        fmt(r.rekomendasi_utama), parseJSON(r.rekomendasi_tambahan),
        fmt(r.catatan_rekomendasi),
        fmt(r.posyandu), fmt(r.kelurahan), fmt(r.kecamatan),
        boolLabel(r.is_bblr), boolLabel(r.is_prematur), boolLabel(r.is_imd),
        r.tinggi_ibu ?? '', r.berat_ibu ?? '', r.tinggi_ayah ?? '', r.berat_ayah ?? '',
        fmt(r.status_gizi_ibu_hamil), boolLabel(r.is_anemia_ibu), boolLabel(r.is_asi_eksklusif),
        fmt(r.pola_asuh_makan), fmt(r.jenis_sanitasi), fmt(r.sumber_air_minum),
        fmt(r.pendidikan_ibu), fmt(r.pendidikan_ayah),
        fmt(r.pendapatan_bulanan), boolLabel(r.is_perokok_di_rumah),
      ];
      const dataRow = ws.addRow(rowData);

      // Color-code status gizi cells (columns 12, 13, 14 = index 11,12,13)
      [12, 13, 14].forEach((colIdx) => {
        const cell = dataRow.getCell(colIdx);
        const fill = getStatusFill(cell.value);
        if (fill) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } };
          cell.font = { bold: true };
        }
      });

      dataRow.eachCell({ includeEmpty: true }, (cell) => {
        cell.alignment = { vertical: 'middle', wrapText: false };
      });
    }

    // Set column widths based on header length
    ws.columns.forEach((col, i) => {
      col.width = Math.min(Math.max((headers[i]?.length || 10) + 4, 12), 40);
    });
    // Override specific columns
    ws.getColumn(1).width = 22;  // Nama Balita
    ws.getColumn(15).width = 35; // Rekomendasi Utama
    ws.getColumn(16).width = 45; // Rekomendasi Tambahan

    // Freeze top header row
    ws.views = [{ state: 'frozen', ySplit: 1 }];

    // Output as buffer
    const buffer = await workbook.xlsx.writeBuffer();
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
