import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const REPORTS_DIR = path.join(UPLOAD_DIR, 'reports');

// Ensure dir exists
if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

/**
 * Status gizi categories:
 *   TB/U  : Sangat Pendek, Pendek, Normal, Tinggi
 *   BB/TB : Gizi Buruk, Gizi Kurang, Gizi Baik, Gizi Lebih
 *   BB/U  : Berat Badan Sangat Kurang, Berat Badan Kurang, Berat Badan Normal, Berat Badan Lebih
 */

export async function POST(request) {
  const { user, error } = await requireAuth(request, ['kader', 'puskesmas', 'kelurahan']);
  if (error) return error;

  try {
    const body = await request.json();
    const { tipe = 'bulanan', format_file = 'excel', periode_mulai, periode_selesai, posyandu_id } = body;

    if (!periode_mulai || !periode_selesai) {
      return NextResponse.json({ error: 'Periode laporan wajib diisi' }, { status: 400 });
    }

    const uuid = uuidv4();
    const ext = format_file === 'pdf' ? 'pdf' : 'xlsx';
    const fileName = `laporan_${tipe}_${periode_mulai}_${periode_selesai}_${uuid.substring(0, 8)}.${ext}`;
    const filePath = path.join(REPORTS_DIR, fileName);

    // Create report record
    const [reportResult] = await pool.query(
      `INSERT INTO laporan (uuid, judul, tipe, format_file, periode_mulai, periode_selesai, posyandu_id, file_path, generated_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [uuid, `Laporan ${tipe.charAt(0).toUpperCase() + tipe.slice(1)} Gizi Balita`, tipe, format_file,
       periode_mulai, periode_selesai, posyandu_id || null, fileName, user.id]
    );

    // Get report data — include posyandu fallback from balita.nama_posyandu
    let posyanduFilter = '';
    const dataParams = [periode_mulai, periode_selesai];

    if (posyandu_id) {
      posyanduFilter = 'AND b.posyandu_id = ?';
      dataParams.push(posyandu_id);
    }

    const [reportData] = await pool.query(
      `SELECT 
        b.nama AS nama_balita, b.tanggal_lahir, b.jenis_kelamin, b.nama_orang_tua,
        COALESCE(p.nama, b.nama_posyandu) AS posyandu_nama,
        COALESCE(p.kecamatan, 'Astananyar') AS kecamatan,
        pk.tanggal_pengukuran, pk.berat_badan, pk.tinggi_badan, pk.lingkar_lengan,
        pk.status_gizi_bbu, pk.status_gizi_tbu, pk.status_gizi_bbtb, pk.rekomendasi_utama
      FROM pengukuran pk
      JOIN balita b ON pk.balita_id = b.id
      LEFT JOIN posyandu p ON b.posyandu_id = p.id
      WHERE pk.tanggal_pengukuran BETWEEN ? AND ? AND b.is_active = TRUE ${posyanduFilter}
      ORDER BY pk.tanggal_pengukuran DESC, b.nama ASC`,
      dataParams
    );

    const [summaryResult] = await pool.query(
      `SELECT 
        COUNT(DISTINCT b.id) as total_balita,
        COUNT(pk.id) as total_pengukuran,
        /* BB/TB */
        SUM(CASE WHEN pk.status_gizi_bbtb = 'Gizi Baik'   THEN 1 ELSE 0 END) as bbtb_baik,
        SUM(CASE WHEN pk.status_gizi_bbtb = 'Gizi Kurang'  THEN 1 ELSE 0 END) as bbtb_kurang,
        SUM(CASE WHEN pk.status_gizi_bbtb = 'Gizi Buruk'   THEN 1 ELSE 0 END) as bbtb_buruk,
        SUM(CASE WHEN pk.status_gizi_bbtb = 'Gizi Lebih'   THEN 1 ELSE 0 END) as bbtb_lebih,
        /* TB/U */
        SUM(CASE WHEN pk.status_gizi_tbu = 'Normal'        THEN 1 ELSE 0 END) as tbu_normal,
        SUM(CASE WHEN pk.status_gizi_tbu = 'Pendek'        THEN 1 ELSE 0 END) as tbu_pendek,
        SUM(CASE WHEN pk.status_gizi_tbu = 'Sangat Pendek' THEN 1 ELSE 0 END) as tbu_sangat_pendek,
        SUM(CASE WHEN pk.status_gizi_tbu = 'Tinggi'        THEN 1 ELSE 0 END) as tbu_tinggi,
        /* BB/U */
        SUM(CASE WHEN pk.status_gizi_bbu = 'Berat Badan Normal'        THEN 1 ELSE 0 END) as bbu_normal,
        SUM(CASE WHEN pk.status_gizi_bbu = 'Berat Badan Kurang'        THEN 1 ELSE 0 END) as bbu_kurang,
        SUM(CASE WHEN pk.status_gizi_bbu = 'Berat Badan Sangat Kurang' THEN 1 ELSE 0 END) as bbu_sangat_kurang,
        SUM(CASE WHEN pk.status_gizi_bbu = 'Berat Badan Lebih'         THEN 1 ELSE 0 END) as bbu_lebih,
        /* combined */
        SUM(CASE WHEN pk.status_gizi_tbu  IN ('Pendek','Sangat Pendek') THEN 1 ELSE 0 END) as stunting,
        SUM(CASE WHEN pk.status_gizi_bbtb IN ('Gizi Buruk','Gizi Kurang') THEN 1 ELSE 0 END) as wasting,
        SUM(CASE WHEN pk.status_gizi_bbu  IN ('Berat Badan Sangat Kurang','Berat Badan Kurang') THEN 1 ELSE 0 END) as underweight
      FROM pengukuran pk
      JOIN balita b ON pk.balita_id = b.id
      WHERE pk.tanggal_pengukuran BETWEEN ? AND ? AND b.is_active = TRUE ${posyanduFilter}`,
      dataParams
    );

    const meta = { tipe, periode_mulai, periode_selesai };

    if (format_file === 'pdf') {
      await generatePDF(filePath, reportData, summaryResult[0], meta);
    } else {
      await generateExcel(filePath, reportData, summaryResult[0], meta);
    }

    // Update status
    await pool.query("UPDATE laporan SET status = 'completed' WHERE id = ?", [reportResult.insertId]);

    return NextResponse.json({
      message: 'Laporan berhasil dibuat',
      laporan: { uuid, fileName, format_file }
    });
  } catch (err) {
    console.error('Generate report error:', err);
    return NextResponse.json({ error: 'Gagal membuat laporan' }, { status: 500 });
  }
}

// ── Helpers ─────────────────────────────────────────────────────────
const isAbnormalBBTB = (s) => s && ['Gizi Buruk', 'Gizi Kurang', 'Gizi Lebih'].includes(s);
const isAbnormalTBU  = (s) => s && ['Sangat Pendek', 'Pendek', 'Tinggi'].includes(s);
const isAbnormalBBU  = (s) => s && ['Berat Badan Sangat Kurang', 'Berat Badan Kurang', 'Berat Badan Lebih'].includes(s);
const isSevere       = (s) => s && (/Buruk|Sangat Pendek|Sangat Kurang/i).test(s);

// PDF GENERATOR
async function generatePDF(filePath, data, summary, meta) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // Header
    doc.fontSize(18).font('Helvetica-Bold').text('LAPORAN STATUS GIZI BALITA', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(14).font('Helvetica').text(`Laporan ${meta.tipe.charAt(0).toUpperCase() + meta.tipe.slice(1)}`, { align: 'center' });
    doc.fontSize(11).text(`Periode: ${meta.periode_mulai} s/d ${meta.periode_selesai}`, { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(9).fillColor('#666').text(`Dicetak: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, { align: 'center' });
    doc.fillColor('#000');
    doc.moveDown(1);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.5);

    // Summary
    doc.fontSize(13).font('Helvetica-Bold').text('Ringkasan');
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica');
    doc.text(`Total Balita Terdata     : ${summary.total_balita || 0}`);
    doc.text(`Total Pengukuran         : ${summary.total_pengukuran || 0}`);
    doc.moveDown(0.3);
    doc.font('Helvetica-Bold').text('BB/TB (Wasting)');
    doc.font('Helvetica');
    doc.text(`  Gizi Baik              : ${summary.bbtb_baik || 0}`);
    doc.text(`  Gizi Kurang            : ${summary.bbtb_kurang || 0}`);
    doc.text(`  Gizi Buruk             : ${summary.bbtb_buruk || 0}`);
    doc.text(`  Gizi Lebih             : ${summary.bbtb_lebih || 0}`);
    doc.moveDown(0.3);
    doc.font('Helvetica-Bold').text('TB/U (Stunting)');
    doc.font('Helvetica');
    doc.text(`  Normal                 : ${summary.tbu_normal || 0}`);
    doc.text(`  Pendek                 : ${summary.tbu_pendek || 0}`);
    doc.text(`  Sangat Pendek          : ${summary.tbu_sangat_pendek || 0}`);
    doc.text(`  Tinggi                 : ${summary.tbu_tinggi || 0}`);
    doc.moveDown(0.3);
    doc.font('Helvetica-Bold').text('BB/U (Underweight)');
    doc.font('Helvetica');
    doc.text(`  BB Normal              : ${summary.bbu_normal || 0}`);
    doc.text(`  BB Kurang              : ${summary.bbu_kurang || 0}`);
    doc.text(`  BB Sangat Kurang       : ${summary.bbu_sangat_kurang || 0}`);
    doc.text(`  BB Lebih               : ${summary.bbu_lebih || 0}`);
    doc.moveDown(0.3);
    doc.fillColor('#c00').font('Helvetica-Bold');
    doc.text(`Stunting Total           : ${summary.stunting || 0}`);
    doc.text(`Wasting Total            : ${summary.wasting || 0}`);
    doc.text(`Underweight Total        : ${summary.underweight || 0}`);
    doc.fillColor('#000').font('Helvetica');
    doc.moveDown(1);

    // Table header
    doc.fontSize(13).font('Helvetica-Bold').text('Detail Pengukuran');
    doc.moveDown(0.5);

    const tableTop = doc.y;
    const headers = ['Nama', 'JK', 'Tgl Ukur', 'BB', 'TB', 'BB/TB', 'TB/U', 'BB/U'];
    const colWidths = [85, 25, 65, 35, 35, 65, 55, 70];
    let xPos = 50;

    doc.fontSize(8).font('Helvetica-Bold');
    headers.forEach((h, i) => {
      doc.text(h, xPos, tableTop, { width: colWidths[i] });
      xPos += colWidths[i] + 5;
    });
    doc.moveTo(50, tableTop + 12).lineTo(545, tableTop + 12).stroke();

    let yPos = tableTop + 16;
    doc.font('Helvetica').fontSize(7);

    data.forEach((row) => {
      if (yPos > 750) { doc.addPage(); yPos = 50; }

      // Highlight abnormal rows
      const hasAbnormal = isAbnormalBBTB(row.status_gizi_bbtb) || isAbnormalTBU(row.status_gizi_tbu) || isAbnormalBBU(row.status_gizi_bbu);
      const severe = isSevere(row.status_gizi_bbtb) || isSevere(row.status_gizi_tbu) || isSevere(row.status_gizi_bbu);

      if (hasAbnormal) {
        doc.save();
        doc.rect(48, yPos - 2, 500, 14).fill(severe ? '#fee2e2' : '#fffbeb');
        doc.fillColor('#000');
        doc.restore();
      }

      xPos = 50;
      const cells = [
        (row.nama_balita || '').substring(0, 15),
        row.jenis_kelamin === 'Laki-Laki' ? 'L' : 'P',
        row.tanggal_pengukuran ? new Date(row.tanggal_pengukuran).toLocaleDateString('id-ID') : '-',
        row.berat_badan || '-', row.tinggi_badan || '-',
        (row.status_gizi_bbtb || '-').substring(0, 12),
        (row.status_gizi_tbu || '-').substring(0, 12),
        (row.status_gizi_bbu || '-').substring(0, 20)
      ];

      // Use red for severe, dark for normal
      if (severe) doc.fillColor('#991b1b');
      else if (hasAbnormal) doc.fillColor('#92400e');
      else doc.fillColor('#000');

      cells.forEach((c, i) => {
        doc.text(String(c), xPos, yPos, { width: colWidths[i] });
        xPos += colWidths[i] + 5;
      });
      doc.fillColor('#000');
      yPos += 14;
    });

    doc.fontSize(8).fillColor('#999').text(
      'Laporan dibuat otomatis oleh Growell - Platform Posyandu Digital',
      50, 780, { align: 'center' }
    );

    doc.end();
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
}

// EXCEL GENERATOR
async function generateExcel(filePath, data, summary, meta) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Growell - Platform Posyandu Digital';

  const GREEN_BG  = 'FFdcfce7';
  const RED_BG    = 'FFfee2e2';
  const YELLOW_BG = 'FFfef9c3';
  const BLUE_BG   = 'FFdbeafe';
  const ROW_RED   = 'FFfef2f2';
  const ROW_AMBER = 'FFfffbeb';

  // Status cell fill helper
  const statusFill = (val) => {
    if (!val) return null;
    const s = val.toLowerCase();
    if (s.includes('gizi baik') || s === 'normal' || s.includes('berat badan normal')) return GREEN_BG;
    if (s.includes('gizi buruk') || s.includes('sangat pendek') || s.includes('sangat kurang')) return RED_BG;
    if (s.includes('gizi kurang') || s.includes('pendek') || s.includes('berat badan kurang')) return YELLOW_BG;
    if (s.includes('lebih') || s.includes('tinggi')) return BLUE_BG;
    return null;
  };

  // ── Summary sheet ──
  const summarySheet = workbook.addWorksheet('Ringkasan');
  summarySheet.columns = [
    { header: 'Kategori', key: 'kategori', width: 35 },
    { header: 'Jumlah', key: 'jumlah', width: 15 }
  ];
  summarySheet.getRow(1).font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
  summarySheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E7D32' } };

  const summaryRows = [
    { kategori: 'Total Balita Terdata', jumlah: summary.total_balita || 0 },
    { kategori: 'Total Pengukuran', jumlah: summary.total_pengukuran || 0 },
    { kategori: '', jumlah: '' },
    { kategori: '── BB/TB (Wasting) ──', jumlah: '' },
    { kategori: 'Gizi Baik', jumlah: summary.bbtb_baik || 0 },
    { kategori: 'Gizi Kurang', jumlah: summary.bbtb_kurang || 0 },
    { kategori: 'Gizi Buruk', jumlah: summary.bbtb_buruk || 0 },
    { kategori: 'Gizi Lebih', jumlah: summary.bbtb_lebih || 0 },
    { kategori: '', jumlah: '' },
    { kategori: '── TB/U (Stunting) ──', jumlah: '' },
    { kategori: 'Normal', jumlah: summary.tbu_normal || 0 },
    { kategori: 'Pendek', jumlah: summary.tbu_pendek || 0 },
    { kategori: 'Sangat Pendek', jumlah: summary.tbu_sangat_pendek || 0 },
    { kategori: 'Tinggi', jumlah: summary.tbu_tinggi || 0 },
    { kategori: '', jumlah: '' },
    { kategori: '── BB/U (Underweight) ──', jumlah: '' },
    { kategori: 'Berat Badan Normal', jumlah: summary.bbu_normal || 0 },
    { kategori: 'Berat Badan Kurang', jumlah: summary.bbu_kurang || 0 },
    { kategori: 'Berat Badan Sangat Kurang', jumlah: summary.bbu_sangat_kurang || 0 },
    { kategori: 'Berat Badan Lebih', jumlah: summary.bbu_lebih || 0 },
    { kategori: '', jumlah: '' },
    { kategori: '⚠️  Stunting (Pendek + Sangat Pendek)', jumlah: summary.stunting || 0 },
    { kategori: '⚠️  Wasting (Gizi Buruk + Kurang)', jumlah: summary.wasting || 0 },
    { kategori: '⚠️  Underweight (BB Kurang + Sangat Kurang)', jumlah: summary.underweight || 0 },
    { kategori: '', jumlah: '' },
    { kategori: `Periode: ${meta.periode_mulai} s/d ${meta.periode_selesai}`, jumlah: '' },
  ];
  summaryRows.forEach(r => summarySheet.addRow(r));

  // ── Detail sheet ──
  const detailSheet = workbook.addWorksheet('Detail Pengukuran');
  detailSheet.columns = [
    { header: 'No', key: 'no', width: 5 },
    { header: 'Nama Balita', key: 'nama', width: 20 },
    { header: 'Tgl Lahir', key: 'tgl_lahir', width: 14 },
    { header: 'JK', key: 'jk', width: 12 },
    { header: 'Nama Orang Tua', key: 'ortu', width: 18 },
    { header: 'Kecamatan', key: 'kecamatan', width: 15 },
    { header: 'Posyandu', key: 'posyandu', width: 18 },
    { header: 'Tgl Ukur', key: 'tgl_ukur', width: 14 },
    { header: 'BB (kg)', key: 'bb', width: 10 },
    { header: 'TB (cm)', key: 'tb', width: 10 },
    { header: 'LiLA (cm)', key: 'lila', width: 10 },
    { header: 'Status BB/TB', key: 'bbtb', width: 15 },
    { header: 'Status TB/U', key: 'tbu', width: 14 },
    { header: 'Status BB/U', key: 'bbu', width: 24 },
    { header: 'Rekomendasi', key: 'rek', width: 30 }
  ];
  detailSheet.getRow(1).font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
  detailSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E7D32' } };

  data.forEach((row, idx) => {
    const r = detailSheet.addRow({
      no: idx + 1,
      nama: row.nama_balita,
      tgl_lahir: row.tanggal_lahir ? new Date(row.tanggal_lahir).toLocaleDateString('id-ID') : '-',
      jk: row.jenis_kelamin, ortu: row.nama_orang_tua || '-',
      kecamatan: row.kecamatan || '-',
      posyandu: row.posyandu_nama || '-',
      tgl_ukur: row.tanggal_pengukuran ? new Date(row.tanggal_pengukuran).toLocaleDateString('id-ID') : '-',
      bb: row.berat_badan, tb: row.tinggi_badan,
      lila: row.lingkar_lengan || '-',
      bbtb: row.status_gizi_bbtb || '-',
      tbu: row.status_gizi_tbu || '-',
      bbu: row.status_gizi_bbu || '-',
      rek: row.rekomendasi_utama || '-'
    });

    // Check abnormal status
    const hasAbnormal = isAbnormalBBTB(row.status_gizi_bbtb) || isAbnormalTBU(row.status_gizi_tbu) || isAbnormalBBU(row.status_gizi_bbu);
    const severe = isSevere(row.status_gizi_bbtb) || isSevere(row.status_gizi_tbu) || isSevere(row.status_gizi_bbu);

    // Highlight entire row if abnormal
    if (hasAbnormal) {
      const rowBg = severe ? ROW_RED : ROW_AMBER;
      r.eachCell({ includeEmpty: true }, (cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
      });
    }

    // Color-code status columns more prominently
    ['bbtb', 'tbu', 'bbu'].forEach((key) => {
      const cell = r.getCell(key);
      const fill = statusFill(cell.value);
      if (fill) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } };
        cell.font = { bold: true };
      }
    });
  });

  detailSheet.views = [{ state: 'frozen', ySplit: 1 }];

  await workbook.xlsx.writeFile(filePath);
}
