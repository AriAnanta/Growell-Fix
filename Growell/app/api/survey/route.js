import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// SAVE PARENT SURVEY DATA
export async function POST(request) {
  const { user, error } = await requireAuth(request);
  if (error) return error;

  try {
    const body = await request.json();
    const { balita_uuid, data } = body;

    // We can accept balita_uuid OR we can accept raw names from data to Find-or-Create
    const nama_balita = data?.namaBalita || data?.nama_balita;
    const tanggal_lahir = data?.tanggalLahirBalita || data?.tanggal_lahir;
    const nama_ibu = data?.namaOrangTua || data?.nama_ibu;

    if (!data) {
      return NextResponse.json({ error: 'data wajib diisi' }, { status: 400 });
    }

    let balitaId, balitaUuid;

    if (balita_uuid) {
      const [balitaRows] = await pool.query('SELECT id, uuid, nama FROM balita WHERE uuid = ?', [balita_uuid]);
      if (balitaRows.length === 0) return NextResponse.json({ error: 'Balita tidak ditemukan' }, { status: 404 });
      balitaId = balitaRows[0].id;
      balitaUuid = balitaRows[0].uuid;
      // Link this balita to the orang_tua account if not yet linked
      await pool.query('UPDATE balita SET orang_tua_id = ? WHERE id = ? AND orang_tua_id IS NULL', [user.id, balitaId]);
    } else {
      if (!nama_balita || !tanggal_lahir) {
        return NextResponse.json({ error: 'namaLengkapBalita dan tanggalLahirBalita wajib diisi jika balita_uuid kosong' }, { status: 400 });
      }
      // Find or Create
      const [existing] = await pool.query(
        'SELECT id, uuid FROM balita WHERE LOWER(nama) = LOWER(?) AND tanggal_lahir = ? LIMIT 1',
        [nama_balita.trim(), tanggal_lahir]
      );
      if (existing.length > 0) {
        balitaId = existing[0].id;
        balitaUuid = existing[0].uuid;
        // Optionally update the parent ID
        await pool.query('UPDATE balita SET orang_tua_id = ? WHERE id = ?', [user.id, balitaId]);
      } else {
        balitaUuid = uuidv4();
        const [newBalita] = await pool.query(
          `INSERT INTO balita (uuid, nama, tanggal_lahir, nama_ibu, orang_tua_id, jenis_kelamin) VALUES (?, ?, ?, ?, ?, 'Perempuan')`,
          [balitaUuid, nama_balita, tanggal_lahir, nama_ibu || null, user.id]
        );
        balitaId = newBalita.insertId;
      }
    }

    const surveyData = {
      balita_id: balitaId,
      usia_kehamilan_lahir: _toFloat(data.usiaKehamilan || data.usia_kehamilan_lahir),
      is_bblr: _toBool(data.bbLahirRendah || data.is_bblr),
      is_prematur: _toBool(data.prematur || data.is_prematur),
      is_imd: _toBool(data.imd || data.is_imd),
      is_komplikasi_lahir: _toBool(data.komplikasiLahir || data.is_komplikasi_lahir),
      jenis_komplikasi_lahir: data.detailKomplikasi || data.jenis_komplikasi_lahir || null,
      tinggi_ibu: _toFloat(data.tinggiIbu || data.tinggi_ibu),
      berat_ibu: _toFloat(data.beratIbu || data.berat_ibu),
      status_gizi_ibu_hamil: data.statusGiziIbuHamil || data.status_gizi_ibu_hamil || null,
      is_anemia_ibu: _toBool(data.anemia || data.is_anemia_ibu),
      is_hamil_muda: _toBool(data.hamilDiBawah20 || data.is_hamil_muda),
      jarak_kelahiran: data.jarakKelahiran || data.jarak_kelahiran || null,
      is_hipertensi_gestasional: _toBool(data.tekananDarahTinggi || data.is_hipertensi_gestasional),
      is_diabetes_gestasional: _toBool(data.gulaDarahTinggi || data.is_diabetes_gestasional),
      is_infeksi_kehamilan: _toBool(data.infeksiHamil || data.is_infeksi_kehamilan),
      is_suplemen_kehamilan: _toBool(data.rutinSuplemen || data.is_suplemen_kehamilan),
      frekuensi_suplemen_kehamilan: data.rutinSuplemen || data.frekuensi_suplemen_kehamilan || null,
      is_hamil_lagi: _toBool(data.hamilLagi || data.is_hamil_lagi),
      frekuensi_suplemen_minggu: data.frekuensiSuplemen || data.frekuensi_suplemen_minggu || null,
      jenis_suplemen_ibu: _joinArray(data.jenisSuplemen || data.jenis_suplemen_ibu),
      is_ttd_90_tablet: _toBool(data.ttd90 || data.is_ttd_90_tablet),
      tinggi_ayah: _toFloat(data.tinggiAyah || data.tinggi_ayah),
      berat_ayah: _toFloat(data.beratAyah || data.berat_ayah),
      is_asi_eksklusif: _toBool(data.asiEksklusif || data.is_asi_eksklusif),
      usia_mulai_mpasi: data.usiaMpasi || data.usia_mulai_mpasi || null,
      is_mpasi_hewani: _toBool(data.mpasiHewani || data.is_mpasi_hewani),
      frekuensi_mpasi_hewani: data.mpasiHewani || data.frekuensi_mpasi_hewani || null,
      frekuensi_makan_utama: _toInt(data.frekuensiMakan || data.frekuensi_makan_utama),
      is_susu_non_asi: _toBool(data.susuLain || data.is_susu_non_asi),
      frekuensi_susu_non_asi: _toInt(data.frekuensiSusu || data.frekuensi_susu_non_asi),
      terakhir_vitamin_a: data.vitaminA || data.terakhir_vitamin_a || null,
      is_tablet_besi_anak: _toBool(data.tabletBesiAnak || data.is_tablet_besi_anak),
      frekuensi_tablet_besi: data.tabletBesiAnak || data.frekuensi_tablet_besi || null,
      is_obat_cacing_anak: _toBool(data.obatCacing || data.is_obat_cacing_anak),
      is_intervensi_gizi: _toBool(data.intervensiGizi || data.is_intervensi_gizi),
      jenis_intervensi_gizi: _joinArray(data.jenisIntervensi || data.jenis_intervensi_gizi),
      riwayat_vaksinasi: _joinArray(data.vaksin || data.riwayat_vaksinasi),
      is_sakit_2_minggu: _toBool(data.sakit2Minggu || data.is_sakit_2_minggu),
      jenis_penyakit_balita: _joinArray(data.jenisPenyakit || data.jenis_penyakit_balita),
      konsumsi_asi_h1: _toBool(data.asiKemarin || data.konsumsi_asi_h1),
      konsumsi_karbohidrat_h1: _toBool(data.makanPokok || data.konsumsi_karbohidrat_h1),
      konsumsi_kacangan_h1: _toBool(data.makanKacang || data.konsumsi_kacangan_h1),
      konsumsi_susu_hewani_h1: _toBool(data.produkSusu || data.konsumsi_susu_hewani_h1),
      is_susu_murni_100: _toBool(data.susuMurni || data.is_susu_murni_100),
      konsumsi_daging_ikan_h1: _toBool(data.proteinHewani || data.konsumsi_daging_ikan_h1),
      konsumsi_telur_h1: _toBool(data.telur || data.konsumsi_telur_h1),
      konsumsi_vit_a_h1: _toBool(data.sayurVitA || data.konsumsi_vit_a_h1),
      konsumsi_buah_sayur_h1: _toBool(data.sayurLain || data.konsumsi_buah_sayur_h1),
      is_konsumsi_manis_berlebih: _toBool(data.makananManis || data.is_konsumsi_manis_berlebih),
      frekuensi_konsumsi_manis: data.makananManis || data.frekuensi_konsumsi_manis || null,
      is_pernah_pmt: _toBool(data.bantuanGizi || data.is_pernah_pmt),
      is_pernah_rawat_inap: _toBool(data.rawatInap || data.is_pernah_rawat_inap),
      jam_tidur_harian: _toFloat(data.jamTidur || data.jam_tidur_harian),
      durasi_aktivitas_luar: _toFloat(data.aktivitasLuar || data.durasi_aktivitas_luar),
      durasi_aktivitas_luar_ket: data.aktivitasLuar || data.durasi_aktivitas_luar_ket || null,
      tingkat_aktivitas_anak: data.tipeAnak || data.tingkat_aktivitas_anak || null,
      is_ibu_bekerja: _toBool(data.ibuBekerja || data.is_ibu_bekerja),
      skor_pengetahuan_ibu: _toFloat(data.pengetahuanGizi || data.skor_pengetahuan_ibu), // kept for backward compat; always null since value is text
      pengetahuan_gizi_ibu: data.pengetahuanGizi || data.pengetahuan_gizi_ibu || null,
      skor_pola_asuh_makan: null, // deprecated — use pola_asuh_makan instead
      pola_asuh_makan: data.polaAsuh || data.pola_asuh_makan || null,
      is_bpjs: _toBool(data.bpjs || data.is_bpjs),
      is_perokok_di_rumah: _toBool(data.perokok || data.is_perokok_di_rumah),
      sumber_air_minum: data.sumberAir || data.sumber_air_minum || null,
      kualitas_air_minum: data.kualitasAir || data.kualitas_air_minum || null,
      jenis_sanitasi: data.sanitasi || data.jenis_sanitasi || null,
      kebersihan_lingkungan: data.kebersihanRumah || data.kebersihan_lingkungan || null,
      kebiasaan_cuci_tangan: data.cuciTangan || data.kebiasaan_cuci_tangan || null,
      akses_faskes: data.aksesFaskes || data.akses_faskes || null,
      frekuensi_posyandu_bulan: _toInt(data.rutinPosyandu || data.frekuensi_posyandu_bulan),
      frekuensi_posyandu: data.rutinPosyandu || data.frekuensi_posyandu || null,
      is_penyakit_bawaan: _toBool(data.penyakitBawaan || data.is_penyakit_bawaan),
      is_baby_blues: _toBool(data.babyBlues || data.is_baby_blues),
      is_gejala_depresi: _toBool(data.depresi || data.is_gejala_depresi),
      pendidikan_ibu: data.pendidikanIbu || data.pendidikan_ibu || null,
      pendidikan_ayah: data.pendidikanAyah || data.pendidikan_ayah || null,
      is_pernah_penyuluhan: _toBool(data.pernahPenyuluhan || data.is_pernah_penyuluhan),
      frekuensi_kelas_ibu: _toInt(data.frekPenyuluhan || data.frekuensi_kelas_ibu),
      is_paham_makanan_sehat: _toBool(data.pahamGizi || data.is_paham_makanan_sehat),
      tingkat_paham_makanan: data.pahamGizi || data.tingkat_paham_makanan || null,
      pekerjaan_kk: data.pekerjaanAyah || data.pekerjaan_kk || null,
      jumlah_art: _toInt(data.jumlahAnggota || data.jumlah_art),
      pendapatan_bulanan: data.pendapatan || data.pendapatan_bulanan || null,
      jarak_akses_pangan: data.jarakPasar || data.jarak_akses_pangan || null,
      is_pantangan_makan: _toBool(data.pantangan || data.is_pantangan_makan),
      penentu_makanan: data.pengambilKeputusan || data.penentu_makanan || null,
    };

    let surveyId;
    // ALWAYS INSERT A NEW RECORD (to keep growth report history safe)
    const uuid = uuidv4();
    const columns = ['uuid', ...Object.keys(surveyData)];
    const placeholders = columns.map(() => '?').join(', ');
    const values = [uuid, ...Object.values(surveyData)];

    const [result] = await pool.query(
      `INSERT INTO survey_balita (${columns.join(', ')}) VALUES (${placeholders})`,
      values
    );
    surveyId = result.insertId;

    // Also save to localStorage format for backward compat
    // Check if there are pending measurements waiting for this survey
    const [pendingMeasurements] = await pool.query(
      `SELECT p.id, p.uuid FROM pengukuran p
       WHERE p.balita_id = ? AND p.status_gizi_bbtb IS NULL
       ORDER BY p.created_at DESC LIMIT 1`,
      [balitaId]
    );

    // Notify kader if they have pending measurements for this child
    const [kaderUsers] = await pool.query(
      `SELECT p.kader_id FROM pengukuran p
       WHERE p.balita_id = ? AND p.kader_id IS NOT NULL
       ORDER BY p.created_at DESC LIMIT 1`,
      [balitaId]
    );

    if (kaderUsers.length > 0 && kaderUsers[0].kader_id) {
      await pool.query(
        `INSERT INTO notifications (uuid, user_id, judul, pesan, tipe, link) VALUES (?, ?, ?, ?, 'success', ?)`,
        [
          uuidv4(),
          kaderUsers[0].kader_id,
          'Survey Orang Tua Terisi',
          `Form orang tua untuk ${nama_balita} telah diisi. Prediksi status gizi siap dilakukan.`,
          `/data-balita/${balitaUuid}`
        ]
      );
    }

    return NextResponse.json({
      message: 'Data survey berhasil disimpan',
      survey_id: surveyId,
      balita_uuid: balitaUuid,
      has_pending_measurement: pendingMeasurements.length > 0,
    }, { status: 201 });
  } catch (err) {
    console.error('Survey save error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server: ' + err.message }, { status: 500 });
  }
}

// GET survey data for a balita
export async function GET(request) {
  const { user, error } = await requireAuth(request);
  if (error) return error;

  try {
    const { searchParams } = new URL(request.url);
    const balitaUuid = searchParams.get('balita_uuid');
    const namaBalita = searchParams.get('nama_balita');

    if (!balitaUuid && !namaBalita) {
      return NextResponse.json({ error: 'balita_uuid atau nama_balita wajib diisi' }, { status: 400 });
    }

    let balitaRows = [];
    if (balitaUuid) {
      [balitaRows] = await pool.query('SELECT id FROM balita WHERE uuid = ?', [balitaUuid]);
    } else {
      [balitaRows] = await pool.query('SELECT id FROM balita WHERE LOWER(nama) = LOWER(?) LIMIT 1', [namaBalita.trim()]);
    }

    if (balitaRows.length === 0) {
      return NextResponse.json({ error: 'Balita tidak ditemukan' }, { status: 404 });
    }

    const [surveys] = await pool.query(
      'SELECT * FROM survey_balita WHERE balita_id = ? ORDER BY created_at DESC LIMIT 1',
      [balitaRows[0].id]
    );

    return NextResponse.json({
      has_survey: surveys.length > 0,
      survey: surveys[0] || null,
    });
  } catch (err) {
    console.error('Get survey error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}

// Helpers
function _toBool(v) {
  if (v === null || v === undefined || v === '') return false;
  if (typeof v === 'boolean') return v;
  const s = String(v).toLowerCase().trim();
  return s === 'ya' || s === 'true' || s === '1' || s === 'yes';
}

function _toFloat(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

function _toInt(v) {
  if (v === null || v === undefined || v === '') return null;
  // Handle string values like "Rutin setiap bulan" -> map to integer
  if (typeof v === 'string') {
    const n = parseInt(v, 10);
    if (!isNaN(n)) return n;
    // Map common string values  
    const mappings = {
      'rutin setiap bulan': 4,
      'tidak rutin': 2,
      'jarang': 1,
      'tidak pernah': 0,
      '1 kali sehari': 1,
      '2 kali sehari': 2,
      '3 kali sehari': 3,
      '4 kali sehari atau lebih': 4,
      'setahun sekali': 1,
      'setahun > sekali': 2,
      'belum pernah': 0,
    };
    return mappings[v.toLowerCase()] ?? null;
  }
  const n = parseInt(v, 10);
  return isNaN(n) ? null : n;
}

function _joinArray(v) {
  if (v === null || v === undefined) return null;
  if (Array.isArray(v)) return v.join(', ');
  return String(v);
}
