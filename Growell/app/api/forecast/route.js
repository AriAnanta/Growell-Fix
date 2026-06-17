import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { predictForecast, getZScore } from '@/lib/ml';

const toLocalISO = (d) => {
  if (!d) return null;
  if (typeof d === 'string') return d.split('T')[0];
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/**
 * GET /api/forecast?balita_uuid=xxx
 *
 * Returns 6-month growth forecast (BB & TB) for a balita.
 * Requires at least 4 historical measurements.
 */
export async function GET(request) {
  const { user, error } = await requireAuth(request, ['kader', 'puskesmas', 'ahli_gizi', 'orang_tua']);
  if (error) return error;

  try {
    const { searchParams } = new URL(request.url);
    const balitaUuid = searchParams.get('balita_uuid');

    if (!balitaUuid) {
      return NextResponse.json({ error: 'balita_uuid wajib diisi' }, { status: 400 });
    }

    // 1. Get balita data
    const [balitaRows] = await pool.query(
      'SELECT * FROM balita WHERE uuid = ?', [balitaUuid]
    );
    if (balitaRows.length === 0) {
      return NextResponse.json({ error: 'Balita tidak ditemukan' }, { status: 404 });
    }
    const balita = balitaRows[0];

    // 2. Get 4 latest measurements (t0, t-1, t-2, t-3)
    const [measurements] = await pool.query(
      'SELECT * FROM pengukuran WHERE balita_id = ? ORDER BY tanggal_pengukuran DESC LIMIT 4',
      [balita.id]
    );

    if (measurements.length < 4) {
      return NextResponse.json({
        eligible: false,
        message: `Data pengukuran belum cukup. Forecasting membutuhkan minimal 4 kali pengukuran (saat ini: ${measurements.length}).`,
        jumlah_pengukuran: measurements.length,
      });
    }

    const [t0, t1, t2, t3] = measurements;

    // 3. Calculate usia_bulan at t0
    const birthDate = new Date(balita.tanggal_lahir);
    const t0Date = new Date(t0.tanggal_pengukuran);
    const usiaBulan = Math.floor((t0Date - birthDate) / (1000 * 60 * 60 * 24 * 30.44));

    const t1Date = new Date(t1.tanggal_pengukuran);
    const usiaBulanT1 = Math.floor((t1Date - birthDate) / (1000 * 60 * 60 * 24 * 30.44));

    // 4. jk: L=0, P=1
    const jk = (balita.jenis_kelamin || '').toLowerCase().startsWith('l') ? 0 : 1;

    // 5. Lag features
    const bb_t1 = t1.berat_badan;
    const bb_t2 = t2.berat_badan;
    const bb_t3 = t3.berat_badan;
    const tb_t1 = t1.tinggi_badan;
    const tb_t2 = t2.tinggi_badan;
    const tb_t3 = t3.tinggi_badan;

    // 6. Delta & acceleration
    const delta_bb = t0.berat_badan - bb_t1;
    const delta_tb = t0.tinggi_badan - tb_t1;
    const delta_bb_t1 = bb_t1 - bb_t2;
    const delta_tb_t1 = tb_t1 - tb_t2;
    const accel_bb = delta_bb - delta_bb_t1;
    const accel_tb = delta_tb - delta_tb_t1;

    // 7. Z-scores — use stored value if available, else compute via /zscore
    let zs_bbu = t0.zs_bb_u;
    let zs_tbu = t0.zs_tb_u;
    let zs_bbtb = t0.zs_bb_tb;

    if (zs_bbu == null || zs_tbu == null || zs_bbtb == null) {
      const z0 = await getZScore({
        berat: t0.berat_badan,
        tinggi: t0.tinggi_badan,
        usia_bulan: usiaBulan,
        jenis_kelamin: balita.jenis_kelamin,
      });
      if (z0) {
        zs_bbu = zs_bbu ?? z0.zs_bb_u;
        zs_tbu = zs_tbu ?? z0.zs_tb_u;
        zs_bbtb = zs_bbtb ?? z0.zs_bb_tb;
      }
    }

    let zs_bbu_t1 = t1.zs_bb_u;
    let zs_tbu_t1 = t1.zs_tb_u;

    if (zs_bbu_t1 == null || zs_tbu_t1 == null) {
      const z1 = await getZScore({
        berat: t1.berat_badan,
        tinggi: t1.tinggi_badan,
        usia_bulan: usiaBulanT1,
        jenis_kelamin: balita.jenis_kelamin,
      });
      if (z1) {
        zs_bbu_t1 = zs_bbu_t1 ?? z1.zs_bb_u;
        zs_tbu_t1 = zs_tbu_t1 ?? z1.zs_tb_u;
      }
    }

    // Fallback if z-score still null (e.g. pygrowup failed for edge-case age)
    zs_bbu = zs_bbu ?? 0;
    zs_tbu = zs_tbu ?? 0;
    zs_bbtb = zs_bbtb ?? 0;
    zs_bbu_t1 = zs_bbu_t1 ?? 0;
    zs_tbu_t1 = zs_tbu_t1 ?? 0;

    // 8. Build features payload
    const features = {
      usia_bulan: usiaBulan,
      jk,
      berat: t0.berat_badan,
      tinggi: t0.tinggi_badan,
      bb_t1, bb_t2, bb_t3,
      tb_t1, tb_t2, tb_t3,
      delta_bb, delta_tb,
      delta_bb_t1, delta_tb_t1,
      accel_bb, accel_tb,
      zs_bbu, zs_tbu, zs_bbtb,
      zs_bbu_t1, zs_tbu_t1,
    };

    // 9. Call forecasting ML service
    const forecastResult = await predictForecast(features);

    if (!forecastResult) {
      return NextResponse.json({
        error: 'Gagal melakukan forecasting. Silakan coba lagi.',
      }, { status: 502 });
    }

    const riwayat = [t3, t2, t1, t0].map(m => ({
      tanggal_pengukuran: toLocalISO(m.tanggal_pengukuran),
      berat_badan: m.berat_badan,
      tinggi_badan: m.tinggi_badan,
    }));

    return NextResponse.json({
      eligible: true,
      balita: { uuid: balita.uuid, nama: balita.nama },
      tanggal_acuan: toLocalISO(t0.tanggal_pengukuran),
      usia_bulan: usiaBulan,
      riwayat,
      ...forecastResult,
    });

  } catch (err) {
    console.error('Forecast error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server: ' + err.message }, { status: 500 });
  }
}