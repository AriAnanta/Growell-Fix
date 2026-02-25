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

    // Get report data
    let posyanduFilter = '';
    const dataParams = [periode_mulai, periode_selesai];

    if (posyandu_id) {
      posyanduFilter = 'AND b.posyandu_id = ?';
      dataParams.push(posyandu_id);
    } else if (user.role === 'kader') {
      // Kader dapat melihat semua balita (posyandu_id tidak selalu terisi saat input)
    }

    const [reportData] = await pool.query(
      `SELECT 
        b.nama AS nama_balita, b.tanggal_lahir, b.jenis_kelamin, b.nama_ibu,
        p.nama AS posyandu_nama,
        pk.tanggal_pengukuran, pk.berat_badan, pk.tinggi_badan, pk.lingkar_lengan,
        pk.status_gizi_bbu, pk.status_gizi_tbu, pk.status_gizi_bbtb, pk.rekomendasi_utama
      FROM pengukuran pk
      JOIN balita b ON pk.balita_id = b.id
      LEFT JOIN posyandu p ON b.posyandu_id = p.id
      WHERE pk.tanggal_pengukuran BETWEEN ? AND ? AND b.is_active = TRUE ${posyanduFilter}
      ORDER BY pk.tanggal_pengukuran DESC, b.nama ASC`,
      dataParams
    );

    const [summary] = await pool.query(
      `SELECT 
        COUNT(DISTINCT b.id) as total_balita,
        COUNT(pk.id) as total_pengukuran,
        SUM(CASE WHEN pk.status_gizi_bbtb = 'Gizi Baik' THEN 1 ELSE 0 END) as gizi_baik,
        SUM(CASE WHEN pk.status_gizi_bbtb = 'Gizi Kurang' THEN 1 ELSE 0 END) as gizi_kurang,
        SUM(CASE WHEN pk.status_gizi_bbtb = 'Gizi Buruk' THEN 1 ELSE 0 END) as gizi_buruk,
        SUM(CASE WHEN pk.status_gizi_bbtb = 'Gizi Lebih' THEN 1 ELSE 0 END) as gizi_lebih,
        SUM(CASE WHEN pk.status_gizi_tbu IN ('Pendek', 'Sangat Pendek') THEN 1 ELSE 0 END) as stunting
      FROM pengukuran pk
      JOIN balita b ON pk.balita_id = b.id
      WHERE pk.tanggal_pengukuran BETWEEN ? AND ? AND b.is_active = TRUE ${posyanduFilter}`,
      dataParams
    );

    const meta = { tipe, periode_mulai, periode_selesai };

    if (format_file === 'pdf') {
      await generatePDF(filePath, reportData, summary[0], meta);
    } else {
      await generateExcel(filePath, reportData, summary[0], meta);
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
    doc.text(`Gizi Baik                : ${summary.gizi_baik || 0}`);
    doc.text(`Gizi Kurang              : ${summary.gizi_kurang || 0}`);
    doc.text(`Gizi Buruk               : ${summary.gizi_buruk || 0}`);
    doc.text(`Gizi Lebih               : ${summary.gizi_lebih || 0}`);
    doc.text(`Stunting                 : ${summary.stunting || 0}`);
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
      xPos = 50;
      const cells = [
        (row.nama_balita || '').substring(0, 15),
        row.jenis_kelamin === 'Laki-Laki' ? 'L' : 'P',
        row.tanggal_pengukuran ? new Date(row.tanggal_pengukuran).toLocaleDateString('id-ID') : '-',
        row.berat_badan || '-', row.tinggi_badan || '-',
        (row.status_gizi_bbtb || '-').substring(0, 12),
        (row.status_gizi_tbu || '-').substring(0, 10),
        (row.status_gizi_bbu || '-').substring(0, 12)
      ];
      cells.forEach((c, i) => {
        doc.text(String(c), xPos, yPos, { width: colWidths[i] });
        xPos += colWidths[i] + 5;
      });
      yPos += 12;
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

  // Summary sheet
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
    { kategori: 'Gizi Baik', jumlah: summary.gizi_baik || 0 },
    { kategori: 'Gizi Kurang', jumlah: summary.gizi_kurang || 0 },
    { kategori: 'Gizi Buruk', jumlah: summary.gizi_buruk || 0 },
    { kategori: 'Gizi Lebih', jumlah: summary.gizi_lebih || 0 },
    { kategori: 'Stunting', jumlah: summary.stunting || 0 },
    { kategori: '', jumlah: '' },
    { kategori: `Periode: ${meta.periode_mulai} s/d ${meta.periode_selesai}`, jumlah: '' },
  ];
  summaryRows.forEach(r => summarySheet.addRow(r));

  // Detail sheet
  const detailSheet = workbook.addWorksheet('Detail Pengukuran');
  detailSheet.columns = [
    { header: 'No', key: 'no', width: 5 },
    { header: 'Nama Balita', key: 'nama', width: 20 },
    { header: 'Tgl Lahir', key: 'tgl_lahir', width: 14 },
    { header: 'JK', key: 'jk', width: 12 },
    { header: 'Nama Ibu', key: 'ibu', width: 18 },
    { header: 'Posyandu', key: 'posyandu', width: 18 },
    { header: 'Tgl Ukur', key: 'tgl_ukur', width: 14 },
    { header: 'BB (kg)', key: 'bb', width: 10 },
    { header: 'TB (cm)', key: 'tb', width: 10 },
    { header: 'LiLA (cm)', key: 'lila', width: 10 },
    { header: 'Status BB/TB', key: 'bbtb', width: 15 },
    { header: 'Status TB/U', key: 'tbu', width: 14 },
    { header: 'Status BB/U', key: 'bbu', width: 20 },
    { header: 'Rekomendasi', key: 'rek', width: 30 }
  ];
  detailSheet.getRow(1).font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
  detailSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E7D32' } };

  data.forEach((row, idx) => {
    const r = detailSheet.addRow({
      no: idx + 1,
      nama: row.nama_balita,
      tgl_lahir: row.tanggal_lahir ? new Date(row.tanggal_lahir).toLocaleDateString('id-ID') : '-',
      jk: row.jenis_kelamin, ibu: row.nama_ibu || '-',
      posyandu: row.posyandu_nama || '-',
      tgl_ukur: row.tanggal_pengukuran ? new Date(row.tanggal_pengukuran).toLocaleDateString('id-ID') : '-',
      bb: row.berat_badan, tb: row.tinggi_badan,
      lila: row.lingkar_lengan || '-',
      bbtb: row.status_gizi_bbtb || '-',
      tbu: row.status_gizi_tbu || '-',
      bbu: row.status_gizi_bbu || '-',
      rek: row.rekomendasi_utama || '-'
    });

    // Color code
    const cell = r.getCell('bbtb');
    if (row.status_gizi_bbtb === 'Gizi Buruk') {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEF5350' } };
      cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
    } else if (row.status_gizi_bbtb === 'Gizi Kurang') {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFA726' } };
    } else if (row.status_gizi_bbtb === 'Gizi Baik') {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF66BB6A' } };
    }
  });

  await workbook.xlsx.writeFile(filePath);
}
