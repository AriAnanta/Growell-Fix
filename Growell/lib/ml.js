import axios from 'axios';

const ML_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';
const ML_API_KEY = process.env.ML_API_KEY || 'growell123';

const mlClient = axios.create({
  baseURL: ML_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-API-KEY': ML_API_KEY,
  },
  timeout: 30000,
});

/**
 * Predict nutrition status using the basic model (BB/TB, BB/U, TB/U)
 */
export async function predictNutritionStatus({ tanggalLahir, tanggalPengukuran, jenisKelamin, berat, tinggi, lila }) {
  try {
    const response = await mlClient.post('/predict', {
      Tgl_Lahir: tanggalLahir,
      Tanggal_Pengukuran: tanggalPengukuran,
      Jenis_Kelamin_Balita: jenisKelamin,
      Berat: berat,
      Tinggi: tinggi,
      LiLA: lila || null,
    });
    return response.data;
  } catch (err) {
    console.error('ML prediction failed:', err.message);
    return null;
  }
}

/**
 * Predict nutrition status using the TA enhanced model
 */
export async function predictNutritionStatusTA(data) {
  try {
    const response = await mlClient.post('/predict-ta', { data });
    return response.data;
  } catch (err) {
    console.error('TA ML prediction failed:', err.message);
    return null;
  }
}

// ── ML Status Gizi (LightGBM) — separate service for final prediction ──
const ML_STATUS_GIZI_URL = process.env.ML_STATUS_GIZI_URL || 'http://localhost:8001';

const mlStatusGiziClient = axios.create({
  baseURL: ML_STATUS_GIZI_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

/**
 * Predict nutrition status using the ml_status_gizi LightGBM model.
 * Called after parent fills the questionnaire (final prediction).
 * @param {Object} featureData - flat dict of ALL features (kader + parent survey)
 * @returns {{ status, total_data, predictions: [{ Prediksi_TBU, Prediksi_BBTB, Prediksi_BBU }] }}
 */
export async function predictStatusGiziFinal(featureData) {
  try {
    const response = await mlStatusGiziClient.post('/predict', {
      data: [featureData],   // API expects List[Dict]
    });
    return response.data;
  } catch (err) {
    console.error('ML Status Gizi (final) prediction failed:', err.message);
    return null;
  }
}

/**
 * Get intervention recommendation
 */
export async function getInterventionRecommendation({
  usiaBulan, beratBadan, statusGiziBBTB, statusGiziTBU,
  asiEksklusif = true, konsumsiProtein = 'Ya, setiap hari',
  polaAsuh = 'Responsive feeding', riwayatSakit = false,
  jenisSanitasi = 'Toilet dengan septic tank',
  rutinVitaminA = true, rutinPosyandu = true
}) {
  try {
    const response = await mlClient.post('/predict-rekomendasi', {
      usia_bulan: usiaBulan,
      berat_badan: beratBadan,
      status_gizi_bb_tb: statusGiziBBTB,
      status_gizi_tb_u: statusGiziTBU,
      asi_eksklusif: asiEksklusif,
      konsumsi_protein_hewani: konsumsiProtein,
      pola_asuh_makan: polaAsuh,
      riwayat_sakit_2minggu: riwayatSakit,
      jenis_sanitasi: jenisSanitasi,
      rutin_vitamin_a: rutinVitaminA,
      rutin_posyandu: rutinPosyandu,
    });
    return response.data;
  } catch (err) {
    console.error('Intervention recommendation failed:', err.message);
    return null;
  }
}

/**
 * Get intervention recommendation from the new ML Recommendation model
 */
export async function getMLInterventionRecommendation(data) {
  try {
    // Determine the ML_REKOMENDASI_URL, fallback to localhost:8000 or same as ML_URL if not set
    const recUrl = process.env.ML_REKOMENDASI_URL || 'http://localhost:8000';
    const response = await axios.post(`${recUrl}/api/v1/predict`, data, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000,
    });
    return response.data;
  } catch (err) {
    console.error('ML Intervention recommendation failed:', err.message);
    return null;
  }
}

/**
 * Check ML service health
 */
export async function checkMLHealth() {
  try {
    const response = await mlClient.get('/health');
    return response.data;
  } catch (err) {
    return { status: 'error', message: err.message };
  }
}

// ── Forecasting (Growth Projection t+1..t+6) ──
const FORECAST_URL = process.env.ML_FORECASTING_URL || 'http://localhost:8003';
const FORECAST_API_KEY = process.env.ML_FORECASTING_API_KEY || 'growell123';

const forecastClient = axios.create({
  baseURL: FORECAST_URL,
  headers: { 'Content-Type': 'application/json', 'x-api-key': FORECAST_API_KEY },
  timeout: 30000,
});

export async function predictForecast(features) {
  try {
    const response = await forecastClient.post('/forecast', features);
    return response.data;
  } catch (err) {
    console.error('Forecast prediction failed:', err.message);
    return null;
  }
}

export async function getZScore({ berat, tinggi, usia_bulan, jenis_kelamin }) {
  try {
    const response = await forecastClient.post('/zscore', {
      berat, tinggi, usia_bulan, jenis_kelamin,
    });
    return response.data;
  } catch (err) {
    console.error('Z-score calculation failed:', err.message);
    return null;
  }
}

export async function checkForecastHealth() {
  try {
    const response = await forecastClient.get('/health');
    return response.data;
  } catch (err) {
    return { status: 'error', message: err.message };
  }
}

// ── Shared helper: build forecast from measurement history ──
/**
 * @param {{tanggal_lahir: string|Date, jenis_kelamin: string}} balita
 * @param {Array} measurements - sorted DESC by tanggal_pengukuran, each item:
 *   { tanggal_pengukuran, berat_badan, tinggi_badan, zs_bb_u, zs_tb_u, zs_bb_tb }
 */
export async function buildForecastFromHistory(balita, measurements) {
  if (!measurements || measurements.length < 4) {
    return {
      eligible: false,
      message: `Data pengukuran belum cukup. Forecasting membutuhkan minimal 4 kali pengukuran (saat ini: ${measurements?.length || 0}).`,
      jumlah_pengukuran: measurements?.length || 0,
    };
  }

  const [t0, t1, t2, t3] = measurements;

  const birthDate = new Date(balita.tanggal_lahir);
  const t0Date = new Date(t0.tanggal_pengukuran);
  const usiaBulan = Math.floor((t0Date - birthDate) / (1000 * 60 * 60 * 24 * 30.44));

  const t1Date = new Date(t1.tanggal_pengukuran);
  const usiaBulanT1 = Math.floor((t1Date - birthDate) / (1000 * 60 * 60 * 24 * 30.44));

  const jk = (balita.jenis_kelamin || '').toLowerCase().startsWith('l') ? 0 : 1;

  const bb_t1 = t1.berat_badan;
  const bb_t2 = t2.berat_badan;
  const bb_t3 = t3.berat_badan;
  const tb_t1 = t1.tinggi_badan;
  const tb_t2 = t2.tinggi_badan;
  const tb_t3 = t3.tinggi_badan;

  const delta_bb = t0.berat_badan - bb_t1;
  const delta_tb = t0.tinggi_badan - tb_t1;
  const delta_bb_t1 = bb_t1 - bb_t2;
  const delta_tb_t1 = tb_t1 - tb_t2;
  const accel_bb = delta_bb - delta_bb_t1;
  const accel_tb = delta_tb - delta_tb_t1;

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

  zs_bbu = zs_bbu ?? 0;
  zs_tbu = zs_tbu ?? 0;
  zs_bbtb = zs_bbtb ?? 0;
  zs_bbu_t1 = zs_bbu_t1 ?? 0;
  zs_tbu_t1 = zs_tbu_t1 ?? 0;

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

  const forecastResult = await predictForecast(features);
  if (!forecastResult) {
    return { eligible: false, message: 'Gagal melakukan forecasting.', jumlah_pengukuran: measurements.length };
  }

  return {
    eligible: true,
    tanggal_acuan: t0.tanggal_pengukuran,
    usia_bulan: usiaBulan,
    ...forecastResult,
  };
}