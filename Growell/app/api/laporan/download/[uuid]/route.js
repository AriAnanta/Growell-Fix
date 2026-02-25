import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const REPORTS_DIR = path.join(UPLOAD_DIR, 'reports');

export async function GET(request, { params }) {
  const { user, error } = await requireAuth(request);
  if (error) return error;

  try {
    const { uuid } = await params;

    const [report] = await pool.query(
      "SELECT * FROM laporan WHERE uuid = ? AND status = 'completed'", [uuid]
    );

    if (report.length === 0) {
      return NextResponse.json({ error: 'Laporan tidak ditemukan' }, { status: 404 });
    }

    const filePath = path.join(REPORTS_DIR, report[0].file_path);
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'File laporan tidak ditemukan' }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);
    const contentType = report[0].format_file === 'pdf'
      ? 'application/pdf'
      : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    return new Response(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${report[0].file_path}"`,
      },
    });
  } catch (err) {
    console.error('Download report error:', err);
    return NextResponse.json({ error: 'Gagal mengunduh laporan' }, { status: 500 });
  }
}
