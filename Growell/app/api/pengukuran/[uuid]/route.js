import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// PUT /api/pengukuran/[uuid] — update a measurement record
export async function PUT(request, { params }) {
  const { user, error } = await requireAuth(request, ['kader', 'puskesmas']);
  if (error) return error;

  try {
    const { uuid } = await params;
    const body = await request.json();

    const [existing] = await pool.query(
      'SELECT id FROM pengukuran WHERE uuid = ?', [uuid]
    );
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Data pengukuran tidak ditemukan' }, { status: 404 });
    }

    const allowedFields = [
      'tanggal_pengukuran', 'berat_badan', 'tinggi_badan',
      'lingkar_kepala', 'lingkar_lengan', 'kondisi_bb_bulan_lalu', 'catatan',
    ];

    // Optional prediction fields — if any are sent, save them; otherwise reset
    const predFields = [
      'status_gizi_bbu', 'status_gizi_tbu', 'status_gizi_bbtb',
      'rekomendasi_utama', 'rekomendasi_tambahan',
    ];

    const updates = [];
    const values = [];

    for (const [key, value] of Object.entries(body)) {
      if (allowedFields.includes(key) && value !== undefined) {
        updates.push(`${key} = ?`);
        values.push(value === '' ? null : value);
      }
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'Tidak ada data yang diubah' }, { status: 400 });
    }

    // If caller supplies prediction fields, save them; otherwise reset them so ML re-runs later
    const predProvided = predFields.some(f => body[f] !== undefined);
    if (predProvided) {
      for (const f of predFields) {
        updates.push(`${f} = ?`);
        const v = body[f];
        values.push(v === undefined || v === '' ? null : Array.isArray(v) ? JSON.stringify(v) : v);
      }
    } else {
      updates.push('status_gizi_bbu = NULL');
      updates.push('status_gizi_tbu = NULL');
      updates.push('status_gizi_bbtb = NULL');
      updates.push('rekomendasi_utama = NULL');
      updates.push('rekomendasi_tambahan = NULL');
      updates.push('catatan_rekomendasi = NULL');
    }

    values.push(uuid);
    await pool.query(
      `UPDATE pengukuran SET ${updates.join(', ')} WHERE uuid = ?`,
      values
    );

    return NextResponse.json({ message: 'Data pengukuran berhasil diperbarui' });
  } catch (err) {
    console.error('Update pengukuran error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
