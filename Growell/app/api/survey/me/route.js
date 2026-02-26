import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(request) {
  const { user, error } = await requireAuth(request);
  if (error) return error;

  try {
    const { searchParams } = new URL(request.url);
    const balitaUuid = searchParams.get('balita_uuid');

    let latestSurvey;
    if (balitaUuid) {
      // Fetch latest survey for a specific balita — used when parent selects child from dropdown
      [latestSurvey] = await pool.query(
        `SELECT sb.*, b.nama as nama_balita, b.tanggal_lahir as tanggal_lahir_balita, b.nama_ibu
         FROM survey_balita sb
         JOIN balita b ON sb.balita_id = b.id
         WHERE b.uuid = ?
         ORDER BY sb.created_at DESC LIMIT 1`,
        [balitaUuid]
      );
    } else {
      // Fallback: latest survey for any balita linked to this orang_tua account
      [latestSurvey] = await pool.query(
        `SELECT sb.*, b.nama as nama_balita, b.tanggal_lahir as tanggal_lahir_balita, b.nama_ibu
         FROM survey_balita sb
         JOIN balita b ON sb.balita_id = b.id
         WHERE b.orang_tua_id = ?
         ORDER BY sb.created_at DESC LIMIT 1`,
        [user.id]
      );
    }

    if (latestSurvey.length === 0) {
      return NextResponse.json({ has_survey: false });
    }

    const s = latestSurvey[0];
    
    // Reverse map exactly like how POST /api/survey mapped it, 
    // so the frontend state (formData) can pre-fill correctly.
    const mappedForm = {
      namaBalita: s.nama_balita || '',
      tanggalLahirBalita: s.tanggal_lahir_balita ? new Date(s.tanggal_lahir_balita).toISOString().split('T')[0] : '',
      namaOrangTua: s.nama_ibu || user.nama || '',
      
      // Riwayat Kelahiran
      bbLahirRendah: s.is_bblr ? 'Ya' : 'Tidak',
      prematur: s.is_prematur ? 'Ya' : 'Tidak',
      imd: s.is_imd ? 'Ya' : 'Tidak',
      komplikasiLahir: s.is_komplikasi_lahir ? 'Ya' : 'Tidak',
      detailKomplikasi: s.jenis_komplikasi_lahir || '',
      
      // Kesehatan Orang Tua
      tinggiIbu: s.tinggi_ibu || '',
      beratIbu: s.berat_ibu || '',
      tinggiAyah: s.tinggi_ayah || '',
      beratAyah: s.berat_ayah || '',
      statusGiziIbuHamil: s.status_gizi_ibu_hamil || '',
      anemia: s.is_anemia_ibu ? 'Ya' : 'Tidak',
      hamilDiBawah20: s.is_hamil_muda ? 'Ya' : 'Tidak',
      jarakKelahiran: s.jarak_kelahiran || '',
      tekananDarahTinggi: s.is_hipertensi_gestasional ? 'Ya' : 'Tidak',
      gulaDarahTinggi: s.is_diabetes_gestasional ? 'Ya' : 'Tidak',
      infeksiHamil: s.is_infeksi_kehamilan ? 'Ya' : 'Tidak',
      
      // Suplemen & Kehamilan — prefer text columns (added via ALTER) over boolean fallback
      rutinSuplemen: s.frekuensi_suplemen_kehamilan || (s.is_suplemen_kehamilan ? 'Rutin setiap hari' : 'Tidak pernah'),
      hamilLagi: s.is_hamil_lagi ? 'Ya' : 'Tidak',
      frekuensiSuplemen: s.frekuensi_suplemen_minggu || '',
      jenisSuplemen: s.jenis_suplemen_ibu ? s.jenis_suplemen_ibu.split(', ') : [],
      ttd90: s.is_ttd_90_tablet ? 'Ya' : 'Tidak',
      
      // ASI & MP-ASI
      asiEksklusif: s.is_asi_eksklusif ? 'Ya' : 'Tidak',
      usiaMpasi: s.usia_mulai_mpasi || '',
      mpasiHewani: s.frekuensi_mpasi_hewani || (s.is_mpasi_hewani ? 'Ya, setiap hari' : 'Tidak pernah'),
      frekuensiMakan: s.frekuensi_makan_utama ? `${s.frekuensi_makan_utama} kali sehari` : '',
      susuLain: s.is_susu_non_asi ? 'Ya' : 'Tidak',
      frekuensiSusu: s.frekuensi_susu_non_asi || '',
      
      // Suplemen & Intervensi Balita
      vitaminA: s.terakhir_vitamin_a || '',
      tabletBesiAnak: s.frekuensi_tablet_besi || (s.is_tablet_besi_anak ? 'Ya' : 'Tidak'),
      obatCacing: s.is_obat_cacing_anak ? 'Ya' : 'Tidak',
      intervensiGizi: s.is_intervensi_gizi ? 'Ya' : 'Tidak',
      jenisIntervensi: s.jenis_intervensi_gizi ? s.jenis_intervensi_gizi.split(', ') : [],
      
      // Kesehatan & Vaksinasi
      vaksin: s.riwayat_vaksinasi ? s.riwayat_vaksinasi.split(', ') : [],
      sakit2Minggu: s.is_sakit_2_minggu ? 'Ya' : 'Tidak',
      jenisPenyakit: s.jenis_penyakit_balita ? s.jenis_penyakit_balita.split(', ') : [],
      penyakitBawaan: s.is_penyakit_bawaan ? 'Ya' : 'Tidak',
      rawatInap: s.is_pernah_rawat_inap ? 'Ya' : 'Tidak',
      
      // Konsumsi Makan (Kemarin)
      asiKemarin: s.konsumsi_asi_h1 ? 'Ya' : 'Tidak',
      makanPokok: s.konsumsi_karbohidrat_h1 ? 'Ya' : 'Tidak',
      makanKacang: s.konsumsi_kacangan_h1 ? 'Ya' : 'Tidak',
      produkSusu: s.konsumsi_susu_hewani_h1 ? 'Ya' : 'Tidak',
      susuMurni: s.is_susu_murni_100 ? 'Ya' : 'Tidak',
      proteinHewani: s.konsumsi_daging_ikan_h1 ? 'Ya' : 'Tidak',
      telur: s.konsumsi_telur_h1 ? 'Ya' : 'Tidak',
      sayurVitA: s.konsumsi_vit_a_h1 ? 'Ya' : 'Tidak',
      sayurLain: s.konsumsi_buah_sayur_h1 ? 'Ya' : 'Tidak',
      makananManis: s.frekuensi_konsumsi_manis || (s.is_konsumsi_manis_berlebih ? 'Ya, sering' : 'Tidak'),
      bantuanGizi: s.is_pernah_pmt ? 'Ya' : 'Tidak',
      
      // Pola Hidup & Lingkungan
      jamTidur: s.jam_tidur_harian || '',
      aktivitasLuar: s.durasi_aktivitas_luar_ket || (s.durasi_aktivitas_luar > 3 ? 'Lebih dari 3 jam per hari' : (s.durasi_aktivitas_luar >= 1 ? '1 - 3 jam per hari' : 'Kurang dari 1 jam per hari')),
      tipeAnak: s.tingkat_aktivitas_anak || '',
      ibuBekerja: s.is_ibu_bekerja ? 'Ya' : 'Tidak',
      pengetahuanGizi: s.pengetahuan_gizi_ibu || (s.skor_pengetahuan_ibu > 80 ? 'Baik' : (s.skor_pengetahuan_ibu > 50 ? 'Cukup' : 'Kurang')),
      polaAsuh: s.pola_asuh_makan || '',
      bpjs: s.is_bpjs ? 'Ya' : 'Tidak',
      perokok: s.is_perokok_di_rumah ? 'Ya' : 'Tidak',
      sumberAir: s.sumber_air_minum || '',
      kualitasAir: s.kualitas_air_minum || '',
      sanitasi: s.jenis_sanitasi || '',
      kebersihanRumah: s.kebersihan_lingkungan || '',
      cuciTangan: s.kebiasaan_cuci_tangan || '',
      
      // Akses, Psikologi & Ekonomi
      aksesFaskes: s.akses_faskes || '',
      rutinPosyandu: s.frekuensi_posyandu || (s.frekuensi_posyandu_bulan >= 4 ? 'Rutin setiap bulan' : (s.frekuensi_posyandu_bulan >= 2 ? 'Tidak rutin' : (s.frekuensi_posyandu_bulan >= 1 ? 'Jarang' : 'Tidak pernah'))),
      babyBlues: s.is_baby_blues ? 'Ya' : 'Tidak',
      depresi: s.is_gejala_depresi ? 'Ya' : 'Tidak',
      pendidikanIbu: s.pendidikan_ibu || '',
      pendidikanAyah: s.pendidikan_ayah || '',
      pernahPenyuluhan: s.is_pernah_penyuluhan ? 'Ya' : 'Tidak',
      frekPenyuluhan: s.frekuensi_kelas_ibu > 1 ? 'Setahun lebih dari sekali' : (s.frekuensi_kelas_ibu === 1 ? 'Setahun sekali' : (s.frekuensi_kelas_ibu === 0 ? 'Belum pernah' : 'Jarang')),
      pahamGizi: s.tingkat_paham_makanan || (s.is_paham_makanan_sehat ? 'Paham' : 'Tidak paham'),
      pekerjaanAyah: s.pekerjaan_kk || '',
      jumlahAnggota: s.jumlah_art || '',
      pendapatan: s.pendapatan_bulanan || '',
      jarakPasar: s.jarak_akses_pangan || '',
      pantangan: s.is_pantangan_makan ? 'Ya' : 'Tidak',
      pengambilKeputusan: s.penentu_makanan || ''
    };

    return NextResponse.json({
      has_survey: true,
      last_survey_date: s.created_at || null,
      survey: mappedForm
    });
  } catch (err) {
    console.error('Get survey me error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
