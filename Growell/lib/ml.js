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
