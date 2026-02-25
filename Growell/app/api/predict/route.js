import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { predictNutritionStatusTA, getInterventionRecommendation } from '@/lib/ml';

/**
 * POST /api/predict
 * 
 * Run prediction for a balita using combined Kader measurement + Parent survey data.
 * Optionally links to an existing pengukuran record.
 * 
 * Body: { balita_uuid, pengukuran_uuid? }
 */
export async function POST(request) {
  const { user, error } = await requireAuth(request, ['kader', 'puskesmas', 'ahli_gizi']);
  if (error) return error;

  try {
    const body = await request.json();
    const { balita_uuid, pengukuran_uuid } = body;

    if (!balita_uuid) {
      return NextResponse.json({ error: 'balita_uuid wajib diisi' }, { status: 400 });
    }

    // 1. Get balita data
    const [balitaRows] = await pool.query(
      'SELECT * FROM balita WHERE uuid = ?', [balita_uuid]
    );
    if (balitaRows.length === 0) {
      return NextResponse.json({ error: 'Balita tidak ditemukan' }, { status: 404 });
    }
    const balita = balitaRows[0];

    // 2. Get latest measurement (or specific one)
    let measurement;
    if (pengukuran_uuid) {
      const [rows] = await pool.query(
        'SELECT * FROM pengukuran WHERE uuid = ? AND balita_id = ?',
        [pengukuran_uuid, balita.id]
      );
      measurement = rows[0];
    } else {
      const [rows] = await pool.query(
        'SELECT * FROM pengukuran WHERE balita_id = ? ORDER BY tanggal_pengukuran DESC LIMIT 1',
        [balita.id]
      );
      measurement = rows[0];
    }

    if (!measurement) {
      return NextResponse.json({ 
        error: 'Data pengukuran belum ada. Kader harus mengisi form pengukuran terlebih dahulu.',
        status_form: { kader: false, orang_tua: false }
      }, { status: 400 });
    }

    // 3. Get latest survey
    const [surveyRows] = await pool.query(
      'SELECT * FROM survey_balita WHERE balita_id = ? ORDER BY created_at DESC LIMIT 1',
      [balita.id]
    );

    if (surveyRows.length === 0) {
      return NextResponse.json({
        error: 'Form orang tua belum diisi untuk balita ini. Prediksi memerlukan data dari kedua form.',
        status_form: { kader: true, orang_tua: false }
      }, { status: 400 });
    }

    const survey = surveyRows[0];

    // 4. Build TA prediction payload from combined data
    const birthDate = new Date(balita.tanggal_lahir);
    const measureDate = new Date(measurement.tanggal_pengukuran);
    const ageMonths = Math.floor((measureDate - birthDate) / (1000 * 60 * 60 * 24 * 30.44));

    const taPayload = {
      umur_balita_bulan: ageMonths,
      jenis_kelamin: balita.jenis_kelamin,
      berat_badan_kg: measurement.berat_badan,
      tinggi_badan_cm: measurement.tinggi_badan,
      lingkar_kepala_cm: measurement.lingkar_kepala || null,
      lila_cm: measurement.lingkar_lengan || null,
      tren_bb_bulan_lalu: null, // Could derive from previous measurements
      usia_kehamilan_lahir: survey.usia_kehamilan_lahir,
      berat_lahir_kg: balita.berat_lahir,
      panjang_lahir_cm: balita.panjang_lahir,
      Tanggal_Lahir_Balita_kader: balita.tanggal_lahir,
      is_bblr: survey.is_bblr,
      is_prematur: survey.is_prematur,
      is_imd: survey.is_imd,
      is_komplikasi_lahir: survey.is_komplikasi_lahir,
      jenis_komplikasi_lahir: survey.jenis_komplikasi_lahir,
      tinggi_ibu_cm: survey.tinggi_ibu,
      berat_ibu_kg: survey.berat_ibu,
      tinggi_ayah_cm: survey.tinggi_ayah,
      berat_ayah_kg: survey.berat_ayah,
      status_gizi_ibu_hamil: survey.status_gizi_ibu_hamil,
      is_anemia_ibu: survey.is_anemia_ibu,
      is_hamil_muda_u20: survey.is_hamil_muda,
      jarak_kelahiran: survey.jarak_kelahiran,
      is_hipertensi_gestasional: survey.is_hipertensi_gestasional,
      is_diabetes_gestasional: survey.is_diabetes_gestasional,
      is_infeksi_kehamilan: survey.is_infeksi_kehamilan,
      is_suplemen_kehamilan: survey.is_suplemen_kehamilan,
      is_hamil_lagi: survey.is_hamil_lagi,
      frekuensi_suplemen_minggu: survey.frekuensi_suplemen_minggu,
      jenis_suplemen_ibu: survey.jenis_suplemen_ibu,
      is_ttd_90_tablet: survey.is_ttd_90_tablet,
      is_asi_eksklusif: survey.is_asi_eksklusif,
      usia_mulai_mpasi: survey.usia_mulai_mpasi,
      is_mpasi_hewani: survey.is_mpasi_hewani,
      frekuensi_makan_utama: survey.frekuensi_makan_utama,
      is_susu_non_asi: survey.is_susu_non_asi,
      frekuensi_susu_non_asi: survey.frekuensi_susu_non_asi,
      terakhir_vitamin_a: survey.terakhir_vitamin_a,
      is_tablet_besi_anak: survey.is_tablet_besi_anak,
      is_obat_cacing_anak: survey.is_obat_cacing_anak,
      is_intervensi_gizi: survey.is_intervensi_gizi,
      jenis_intervensi_gizi: survey.jenis_intervensi_gizi,
      riwayat_vaksinasi: survey.riwayat_vaksinasi,
      is_sakit_2_minggu: survey.is_sakit_2_minggu,
      jenis_penyakit_balita: survey.jenis_penyakit_balita,
      konsumsi_asi_h_1: survey.konsumsi_asi_h1,
      konsumsi_karbohidrat_h_1: survey.konsumsi_karbohidrat_h1,
      konsumsi_kacangan_h_1: survey.konsumsi_kacangan_h1,
      konsumsi_susu_hewani_h_1: survey.konsumsi_susu_hewani_h1,
      is_susu_murni_100: survey.is_susu_murni_100,
      konsumsi_daging_ikan_h_1: survey.konsumsi_daging_ikan_h1,
      konsumsi_telur_h_1: survey.konsumsi_telur_h1,
      konsumsi_vit_a_h_1: survey.konsumsi_vit_a_h1,
      konsumsi_buah_sayur_lain_h_1: survey.konsumsi_buah_sayur_h1,
      is_konsumsi_manis_berlebih: survey.is_konsumsi_manis_berlebih,
      is_pernah_pmt: survey.is_pernah_pmt,
      is_pernah_rawat_inap: survey.is_pernah_rawat_inap,
      jam_tidur_harian: survey.jam_tidur_harian,
      durasi_aktivitas_luar: survey.durasi_aktivitas_luar,
      tingkat_aktivitas_anak: survey.tingkat_aktivitas_anak,
      is_ibu_bekerja: survey.is_ibu_bekerja,
      skor_pengetahuan_ibu: survey.skor_pengetahuan_ibu,
      skor_pola_asuh_makan: survey.skor_pola_asuh_makan,
      is_bpjs: survey.is_bpjs,
      is_perokok_di_rumah: survey.is_perokok_di_rumah,
      sumber_air_minum: survey.sumber_air_minum,
      kualitas_air_minum: survey.kualitas_air_minum,
      jenis_sanitasi: survey.jenis_sanitasi,
      kebersihan_lingkungan: survey.kebersihan_lingkungan,
      kebiasaan_cuci_tangan: survey.kebiasaan_cuci_tangan,
      akses_faskes: survey.akses_faskes,
      frekuensi_posyandu_bulan: survey.frekuensi_posyandu_bulan,
      is_penyakit_bawaan: survey.is_penyakit_bawaan,
      is_baby_blues: survey.is_baby_blues,
      is_gejala_depresi: survey.is_gejala_depresi,
      pendidikan_ibu: survey.pendidikan_ibu,
      pendidikan_ayah: survey.pendidikan_ayah,
      is_pernah_penyuluhan_gizi: survey.is_pernah_penyuluhan,
      frekuensi_ikut_kelas_ibu: survey.frekuensi_kelas_ibu,
      is_paham_makanan_sehat: survey.is_paham_makanan_sehat,
      pekerjaan_kepala_keluarga: survey.pekerjaan_kk,
      jumlah_art: survey.jumlah_art,
      pendapatan_bulanan: survey.pendapatan_bulanan,
      jarak_akses_pangan: survey.jarak_akses_pangan,
      is_pantangan_makan: survey.is_pantangan_makan,
      Siapa_yang_biasanya_menentukan_makanan_apa_yang_dimakan_oleh_anak_di_rumah_: survey.penentu_makanan,
    };

    // 5. Call ML prediction
    const prediction = await predictNutritionStatusTA(taPayload);

    if (!prediction || !prediction.predictions) {
      return NextResponse.json({
        error: 'Gagal melakukan prediksi. Silakan coba lagi.',
        detail: 'ML service returned null'
      }, { status: 502 });
    }

    const p = prediction.predictions;
    const statusBBTB = p.status_gizi_bbtb?.label || null;
    const statusBBU = p.status_gizi_bbu?.label || null;
    const statusTBU = p.status_gizi_tbu?.label || null;

    // 6. Get intervention recommendation
    let rekomendasi = null;
    try {
      // Map status to enum values expected by rekomendasi API
      const bbtbMap = { 'Gizi Buruk': 'Gizi Buruk', 'Gizi Kurang': 'Gizi Kurang', 'Gizi Baik': 'Gizi Baik', 'Gizi Lebih': 'Gizi Lebih' };
      const tbuMap = { 'Sangat Pendek': 'Sangat Pendek', 'Pendek': 'Pendek', 'Normal': 'Normal', 'Tinggi': 'Tinggi' };

      // Map protein consumption
      let proteinHewani = 'Ya, setiap hari';
      if (survey.is_mpasi_hewani === false || survey.is_mpasi_hewani === 0) {
        proteinHewani = 'Tidak pernah';
      }

      // Map pola asuh
      let polaAsuh = survey.pola_asuh_makan || 'Responsive feeding';

      // Map sanitasi
      let sanitasi = 'Toilet dengan septic tank';
      const sanitasiVal = (survey.jenis_sanitasi || '').toLowerCase();
      if (sanitasiVal.includes('selokan')) {
        sanitasi = 'Toilet tanpa septic tank (ke selokan)';
      } else if (sanitasiVal.includes('sungai') || sanitasiVal.includes('kebun')) {
        sanitasi = 'Buang air di sungai/kebun';
      }

      rekomendasi = await getInterventionRecommendation({
        usiaBulan: ageMonths,
        beratBadan: measurement.berat_badan,
        statusGiziBBTB: bbtbMap[statusBBTB] || 'Gizi Baik',
        statusGiziTBU: tbuMap[statusTBU] || 'Normal',
        asiEksklusif: !!survey.is_asi_eksklusif,
        konsumsiProtein: proteinHewani,
        polaAsuh: polaAsuh,
        riwayatSakit: !!survey.is_sakit_2_minggu,
        jenisSanitasi: sanitasi,
        rutinVitaminA: !!survey.terakhir_vitamin_a,
        rutinPosyandu: survey.frekuensi_posyandu_bulan > 0,
      });
    } catch (rekErr) {
      console.error('Intervention recommendation error:', rekErr);
    }

    // 7. Update the pengukuran record with prediction results
    await pool.query(
      `UPDATE pengukuran SET 
        status_gizi_bbu = ?, status_gizi_tbu = ?, status_gizi_bbtb = ?,
        rekomendasi_utama = ?, rekomendasi_tambahan = ?, catatan_rekomendasi = ?
       WHERE id = ?`,
      [
        statusBBU, statusTBU, statusBBTB,
        rekomendasi?.rekomendasi_utama || null,
        rekomendasi?.rekomendasi_tambahan ? JSON.stringify(rekomendasi.rekomendasi_tambahan) : null,
        rekomendasi?.catatan || null,
        measurement.id
      ]
    );

    // 8. Link survey to measurement
    await pool.query(
      'UPDATE survey_balita SET pengukuran_id = ? WHERE id = ?',
      [measurement.id, survey.id]
    );

    // 9. Notify parent
    if (balita.orang_tua_id) {
      await pool.query(
        `INSERT INTO notifications (uuid, user_id, judul, pesan, tipe, link) VALUES (?, ?, ?, ?, 'success', ?)`,
        [
          uuidv4(),
          balita.orang_tua_id,
          'Hasil Prediksi Status Gizi',
          `Prediksi status gizi ${balita.nama} telah selesai. BB/TB: ${statusBBTB || '-'}, TB/U: ${statusTBU || '-'}. Klik untuk melihat detail dan rekomendasi.`,
          `/data-balita/${balita.uuid}`
        ]
      );
    }

    return NextResponse.json({
      message: 'Prediksi berhasil',
      balita: { uuid: balita.uuid, nama: balita.nama },
      prediction: {
        bbtb: statusBBTB,
        bbu: statusBBU,
        tbu: statusTBU,
        raw: prediction.predictions,
      },
      rekomendasi: rekomendasi || null,
      pengukuran_uuid: measurement.uuid,
    });
  } catch (err) {
    console.error('Predict error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server: ' + err.message }, { status: 500 });
  }
}

/**
 * GET /api/predict?balita_uuid=xxx
 * 
 * Check the form completion status and latest prediction for a balita.
 */
export async function GET(request) {
  const { user, error } = await requireAuth(request);
  if (error) return error;

  try {
    const { searchParams } = new URL(request.url);
    const balitaUuid = searchParams.get('balita_uuid');

    if (!balitaUuid) {
      return NextResponse.json({ error: 'balita_uuid wajib diisi' }, { status: 400 });
    }

    const [balitaRows] = await pool.query(
      'SELECT id, uuid, nama FROM balita WHERE uuid = ?', [balitaUuid]
    );
    if (balitaRows.length === 0) {
      return NextResponse.json({ error: 'Balita tidak ditemukan' }, { status: 404 });
    }
    const balita = balitaRows[0];

    // Check measurement
    const [measurements] = await pool.query(
      'SELECT * FROM pengukuran WHERE balita_id = ? ORDER BY tanggal_pengukuran DESC LIMIT 1',
      [balita.id]
    );

    // Check survey
    const [surveys] = await pool.query(
      'SELECT id FROM survey_balita WHERE balita_id = ? ORDER BY created_at DESC LIMIT 1',
      [balita.id]
    );

    const hasMeasurement = measurements.length > 0;
    const hasSurvey = surveys.length > 0;
    const latestMeasurement = measurements[0] || null;
    const hasPrediction = !!(latestMeasurement?.status_gizi_bbtb);

    return NextResponse.json({
      balita: { uuid: balita.uuid, nama: balita.nama },
      status_form: {
        kader: hasMeasurement,
        orang_tua: hasSurvey,
        complete: hasMeasurement && hasSurvey,
      },
      has_prediction: hasPrediction,
      prediction: hasPrediction ? {
        bbtb: latestMeasurement.status_gizi_bbtb,
        bbu: latestMeasurement.status_gizi_bbu,
        tbu: latestMeasurement.status_gizi_tbu,
        rekomendasi_utama: latestMeasurement.rekomendasi_utama,
        rekomendasi_tambahan: latestMeasurement.rekomendasi_tambahan ? JSON.parse(latestMeasurement.rekomendasi_tambahan) : [],
        catatan: latestMeasurement.catatan_rekomendasi,
      } : null,
    });
  } catch (err) {
    console.error('Predict status error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
