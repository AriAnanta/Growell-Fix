'use client';
import React, { useMemo, useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Save, RefreshCw, ArrowLeft, CheckCircle2, Loader2,
  AlertCircle, ChevronRight, Info
} from 'lucide-react';
import CustomDatePicker from '@/components/forms/CustomDatePicker';
import CustomDropdown from '@/components/forms/CustomDropdown';
import SearchableBalitaDropdown from '@/components/forms/SearchableBalitaDropdown';
import { useToast } from '@/components/common/Toast';
import { isAuthenticated, getUserData, clearAuth } from '@/utils/auth';

// Wrapper for Suspense (required by useSearchParams in Next.js 14)
export default function ParentFormPageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#fafafa] flex items-center justify-center"><Loader2 size={24} className="animate-spin text-gray-400" /></div>}>
      <ParentFormPage />
    </Suspense>
  );
}

function ParentFormPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();

  // Role guard — only orang_tua allowed
  useEffect(() => {
    if (!isAuthenticated()) { router.replace('/login'); return; }
    const role = getUserData()?.role;
    if (role !== 'orang_tua') {
      if (role === 'kader') router.replace('/kader');
      else if (role === 'ahli_gizi') router.replace('/konsultasi');
      else if (role === 'kelurahan' || role === 'puskesmas') router.replace('/kelurahan');
      else router.replace('/login');
    }
  }, []);

  const [activeSection, setActiveSection] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  // Balita dropdown & selection
  const [balitaList, setBalitaList] = useState([]);
  const [isLoadingBalita, setIsLoadingBalita] = useState(false);
  const [selectedBalita, setSelectedBalita] = useState(null); // full balita object

  // Post-submit prediction display & rekomendasi update
  const [predictionData, setPredictionData] = useState(null);   // { bbtb, bbu, tbu }
  const [rekomendasiData, setRekomendasiData] = useState(null); // { rekomendasi_utama, ... }
  const [isUpdatingRek, setIsUpdatingRek] = useState(false);

  // Track whether form was pre-filled from a previous visit
  const [lastSurveyDate, setLastSurveyDate] = useState(null); // ISO string or null

  // Section validation errors — set of question keys that are required but empty
  const [sectionErrors, setSectionErrors] = useState({}); // { [key]: true }

  // ─── Form Structure ─────────────────────────────────
  const formStructure = useMemo(() => [
    {
      title: "Identitas & Lokasi", icon: "1", color: "cyan",
      questions: [
        { key: 'namaBalita', label: '4. Nama lengkap balita *', type: 'balita_select', fullWidth: true, placeholder: 'Cari & pilih nama balita dari daftar...' },
        { key: 'namaOrangTua', label: '3. Nama lengkap orang tua balita *', type: 'text', placeholder: 'Terisi otomatis setelah pilih balita', readonly: true },
        { key: 'namaKecamatan', label: '1. Nama Kecamatan yang ditempati?', type: 'text', placeholder: 'Astananyar', readonly: true },
        { key: 'namaPosyandu', label: '2. Nama Posyandu yang dikunjungi?', type: 'text' },
        { key: 'namaKelurahan', label: '5. Nama Kelurahan', type: 'text', placeholder: 'Terisi otomatis setelah pilih balita', readonly: true },
        { key: 'tanggalLahirBalita', label: '7. Tanggal Lahir Balita', type: 'date', readonly: true },
      ]
    },
    {
      title: "Riwayat Kelahiran", icon: "2", color: "emerald",
      questions: [
        { key: 'bbLahirRendah', label: '8. Apakah berat lahir balita kurang dari 2,5 kg (berat lahir rendah)? *', type: 'yesno', required: true },
        { key: 'prematur', label: '9. Apakah balita lahir prematur (kurang dari 9 bulan)? *', type: 'yesno', required: true },
        { key: 'imd', label: '10. Apakah setelah melahirkan, bayi langsung diletakkan di dada ibu dan disusui dalam waktu sekitar satu jam pertama? *', type: 'yesno', required: true, helper: 'Tindakan ini disebut Inisiasi Menyusui Dini (IMD)', fullWidth: true },
        { key: 'komplikasiLahir', label: '11. Apakah saat lahir terdapat komplikasi atau penyakit serius? *', type: 'yesno', required: true },
        { key: 'detailKomplikasi', label: '12. Komplikasi atau penyakit serius apa yang diderita balita saat lahir? *', type: 'text', required: true, placeholder: 'Contoh: Asfiksia, Hiperbilirubinemia, dll.', showIf: { key: 'komplikasiLahir', value: 'Ya' }, fullWidth: true },
      ]
    },
    {
      title: "Kesehatan Orang Tua", icon: "3", color: "violet",
      questions: [
        { key: 'tinggiIbu', label: '13. Tinggi badan ibu (dalam sentimeter) *', type: 'number', placeholder: 'Contoh: 160 atau 160.5', required: true, helper: 'Gunakan tanda titik (.) jika ada angka desimal. Contoh: 160 atau 160.5' },
        { key: 'beratIbu', label: '14. Berat badan ibu (dalam kilogram) *', type: 'number', placeholder: 'Contoh: 60 atau 60.5', required: true, helper: 'Gunakan tanda titik (.) jika ada angka desimal. Contoh: 60 atau 60.5' },
        { key: 'tinggiAyah', label: '15. Tinggi badan ayah (dalam sentimeter) *', type: 'number', placeholder: 'Contoh: 170 atau 170.5', required: true, helper: 'Gunakan tanda titik (.) jika ada angka desimal. Contoh: 170 atau 170.5' },
        { key: 'beratAyah', label: '16. Berat badan ayah (dalam kilogram) *', type: 'number', placeholder: 'Contoh: 70 atau 70.5', required: true, helper: 'Gunakan tanda titik (.) jika ada angka desimal. Contoh: 70 atau 70.5' },
        { key: 'statusGiziIbuHamil', label: '17. Status gizi ibu saat hamil (berdasarkan catatan kesehatan) *', type: 'select', required: true, options: ['Normal', 'Kurang Energi Kronis (KEK) (Ukuran lingkar lengan atas kurang dari 23.5 cm atau IMT kurang dari 18.5)'] },
        { key: 'anemia', label: '18. Apakah ibu pernah didiagnosis anemia oleh tenaga kesehatan? *', type: 'yesno', required: true },
        { key: 'hamilDiBawah20', label: '19. Apakah ibu hamil saat usia di bawah 20 tahun? *', type: 'yesno', required: true },
        { key: 'jarakKelahiran', label: '20. Berapa lama jarak waktu antara kelahiran anak ini dengan kakak atau adiknya? *', type: 'select', required: true, options: ['Kurang dari 2 Tahun', '2 - 3 Tahun', 'Lebih dari 3 Tahun', 'Anak pertama (belum memiliki kakak atau adik)'], helper: 'Bila anak ini adalah anak pertama, pilih opsi "Anak pertama"', fullWidth: true },
        { key: 'tekananDarahTinggi', label: '21. Apakah ibu mengalami tekanan darah tinggi saat hamil? *', type: 'yesno', required: true },
        { key: 'gulaDarahTinggi', label: '22. Apakah ibu mengalami gula darah tinggi saat hamil? *', type: 'yesno', required: true },
        { key: 'infeksiHamil', label: '23. Apakah selama hamil Ibu pernah mengalami infeksi atau penyakit yang cukup serius? *', type: 'yesno', required: true, helper: 'Misalnya infeksi saluran kemih, demam tinggi karena infeksi, malaria, atau lainnya', fullWidth: true },
      ]
    },
    {
      title: "Suplemen & Kehamilan", icon: "4", color: "amber",
      questions: [
        { key: 'rutinSuplemen', label: '24. Apakah ibu rutin mengonsumsi suplemen saat hamil? *', type: 'select', required: true, options: ['Rutin setiap hari', 'Kadang-kadang', 'Tidak pernah'] },
        { key: 'frekuensiSuplemen', label: '26. Jika mengonsumsi suplemen, sebutkan frekuensinya (berapa kali dalam seminggu) *', type: 'number', required: true, placeholder: 'Contoh: 3', helper: 'Tulis angka saja. Contoh: 3 (berarti 3 kali seminggu)', showIf: { key: 'rutinSuplemen', value: ['Rutin setiap hari', 'Kadang-kadang'] } },
        { key: 'jenisSuplemen', label: '27. Suplemen apa yang Ibu konsumsi selama hamil atau setelah melahirkan? *', type: 'multiselect', required: true, options: ['Tablet tambah darah (zat besi)', 'Vitamin C', 'Vitamin D', 'Asam folat (vitamin untuk pertumbuhan janin)', 'Kalsium', 'Susu ibu hamil', 'Lainnya'], showIf: { key: 'rutinSuplemen', value: ['Rutin setiap hari', 'Kadang-kadang'] }, fullWidth: true },
        { key: 'ttd90', label: '28. Apakah ibu hamil mengonsumsi Tablet Tambah Darah (TTD) minimal 90 tablet selama kehamilan? *', type: 'yesno', required: true, showIf: { key: 'rutinSuplemen', value: ['Rutin setiap hari', 'Kadang-kadang'] }, fullWidth: true },
        { key: 'hamilLagi', label: '25. Apakah ibu sedang hamil kembali saat ini? *', type: 'yesno', required: true },
      ]
    },
    {
      title: "ASI & MP-ASI", icon: "5", color: "pink",
      questions: [
        { key: 'asiEksklusif', label: '29. Apakah bayi mendapat ASI eksklusif selama 6 bulan? *', type: 'yesno', required: true },
        { key: 'usiaMpasi', label: '30. Usia balita mulai diberi MP-ASI (bulan) *', type: 'number', required: true, placeholder: 'Contoh: 6', helper: 'Tulis angka saja dalam satuan bulan. Contoh: 6' },
        { key: 'mpasiHewani', label: '31. Apakah makanan pendamping ASI (MP-ASI) yang diberikan kepada anak mengandung bahan dari hewan? *', type: 'select', required: true, options: ['Ya, setiap hari', 'Ya, namun tidak rutin', 'Tidak pernah'], helper: 'Seperti telur, ikan, ayam, atau daging', fullWidth: true },
        { key: 'frekuensiMakan', label: '32. Dalam satu hari, berapa kali anak makan makanan utama? *', type: 'select', required: true, options: ['1 kali sehari', '2 kali sehari', '3 kali sehari', '4 kali sehari atau lebih'], helper: 'Seperti nasi, bubur, atau MP-ASI buatan rumah', fullWidth: true },
        { key: 'susuLain', label: '33. Apakah anak minum susu selain ASI? *', type: 'yesno', required: true, helper: 'Seperti susu formula, susu cair (UHT), atau susu bubuk biasa' },
        { key: 'frekuensiSusu', label: '34. Jika ya, berapa kali per hari? *', type: 'number', required: true, placeholder: 'Contoh: 2', helper: 'Tuliskan hanya angka saja. Contoh: 2', showIf: { key: 'susuLain', value: 'Ya' } },
      ]
    },
    {
      title: "Suplemen & Intervensi Balita", icon: "6", color: "teal",
      questions: [
        { key: 'vitaminA', label: '35. Kapan terakhir kali balita mendapat vitamin A? *', type: 'text', required: true, placeholder: 'Contoh: Agustus 2024', helper: 'Tuliskan bulan dan tahun. Contoh: Agustus 2024' },
        { key: 'tabletBesiAnak', label: '36. Apakah anak rutin minum tablet zat besi (tablet berwarna merah)? *', type: 'select', required: true, options: ['Ya', 'Jarang', 'Tidak'] },
        { key: 'obatCacing', label: '37. Apakah anak pernah minum obat cacing dari posyandu, puskesmas, atau apotek? *', type: 'yesno', required: true, fullWidth: true },
        { key: 'intervensiGizi', label: '38. Apakah anak pernah mendapatkan intervensi gizi dari posyandu atau puskesmas? *', type: 'yesno', required: true, helper: 'Misalnya: makanan tambahan dari posyandu (PMT), makanan padat gizi untuk anak gizi buruk (RUTF), penyuluhan gizi, atau rujukan ke puskesmas/RS', fullWidth: true },
        { key: 'jenisIntervensi', label: '39. Jika ya, intervensi gizi apa yang diterima? *', type: 'multiselect', required: true, options: ['Pemberian Makanan Tambahan', 'Makanan padat gizi untuk anak gizi buruk (RUTF)', 'Edukasi gizi', 'Rujukan ke puskesmas/rumah sakit', 'Lainnya'], helper: 'Dapat memilih lebih dari 1 jawaban', showIf: { key: 'intervensiGizi', value: 'Ya' }, fullWidth: true },
      ]
    },
    {
      title: "Kesehatan & Vaksinasi", icon: "7", color: "blue", dynamic: true,
      questions: [
        { key: 'vaksin', label: '40. Vaksin apa saja yang sudah diterima oleh balita? *', fullWidth: true, type: 'multiselect', required: true, helper: 'Dapat memilih lebih dari satu jawaban', options: ['Hepatitis B (<24 Jam)', 'BCG', 'Polio Tetes 1', 'DPT-HB-Hib 1', 'Polio Tetes 2', 'Rota Virus (RV) 1', 'PCV 1', 'DPT-HB-Hib 2', 'Polio Tetes 3', 'Rota Virus (RV) 2', 'PCV 2', 'DPT-HB-Hib 3', 'Polio Tetes 4', 'Polio Suntik (IPV) 1', 'Rota Virus (RV) 3', 'Campak - Rubella (MR)', 'Polio Suntik (IPV) 2', 'Japanese Encephalitis (JE)', 'PCV 3', 'DPT-HB-Hib Lanjutan', 'Campak - Rubella (MR) Lanjutan'] },
        { key: 'sakit2Minggu', label: '41. Apakah balita sakit dalam 2 minggu terakhir? *', type: 'yesno', required: true, helper: 'Contoh: batuk, diare, demam, dll.' },
        { key: 'jenisPenyakit', label: '42. Jika ya, penyakit apa yang diderita? *', type: 'multiselect', required: true, options: ['Tidak sakit', 'Diare', 'ISPA', 'Demam/Malaria', 'Cacingan', 'Lainnya'], helper: 'Dapat memilih lebih dari satu jawaban', showIf: { key: 'sakit2Minggu', value: 'Ya' }, fullWidth: true },
        { key: 'penyakitBawaan', label: '70. Apakah balita memiliki penyakit bawaan saat lahir? *', type: 'yesno', required: true },
        { key: 'rawatInap', label: '54. Apakah balita pernah dirawat inap? *', type: 'yesno', required: true },
      ]
    },
    {
      title: "Konsumsi Makan (Kemarin)", icon: "8", color: "orange", dynamic: true,
      questions: [
        { key: 'asiKemarin', label: '43. Apakah sehari sebelumnya anak mengonsumsi ASI? *', type: 'yesno', required: true },
        { key: 'makanPokok', label: '44. Apakah kemarin anak makan makanan pokok? *', type: 'yesno', required: true, helper: 'Seperti nasi, bubur, mie, jagung, roti, atau umbi-umbian seperti kentang dan ubi', fullWidth: true },
        { key: 'makanKacang', label: '45. Apakah kemarin anak makan makanan dari kacang-kacangan? *', type: 'yesno', required: true, helper: 'Seperti tempe, tahu, kacang hijau, atau kacang tanah', fullWidth: true },
        { key: 'produkSusu', label: '46. Apakah anak kemarin mengonsumsi minuman atau makanan yang terbuat dari susu hewani? *', type: 'yesno', required: true, helper: 'Seperti susu, yogurt, atau keju', fullWidth: true },
        { key: 'susuMurni', label: '47. Apakah anak minum susu murni 100%? *', fullWidth: true, type: 'yesno', required: true, helper: 'Susu murni 100% adalah susu yang berasal langsung dari hewan (sapi, kambing, atau kerbau) tanpa dicampur bahan lain seperti air, gula, perasa, atau pengawet. Contohnya: susu pasteurisasi dalam botol atau kemasan yang bertuliskan "susu segar murni" atau "100% susu sapi", bukan susu bubuk instan, susu formula, atau susu rasa cokelat/stroberi.' },
        { key: 'proteinHewani', label: '48. Apakah kemarin anak makan makanan yang mengandung daging, ayam, ikan, atau jeroan? *', type: 'yesno', required: true, fullWidth: true },
        { key: 'telur', label: '49. Apakah kemarin anak makan telur? *', type: 'yesno', required: true, helper: 'Misalnya telur ayam, telur bebek, atau telur puyuh — bisa direbus, digoreng, atau dicampur ke makanan seperti nasi, bubur', fullWidth: true },
        { key: 'sayurVitA', label: '50. Apakah anak kemarin makan buah dan sayuran kaya Vitamin A? *', type: 'yesno', required: true, helper: 'Seperti pepaya, mangga, wortel, dan sayuran berdaun hijau gelap seperti bayam, kangkung, daun katuk, daun singkong, daun kelor, brokoli, dll.', fullWidth: true },
        { key: 'sayurLain', label: '51. Apakah kemarin anak makan buah dan sayur lainnya? *', type: 'yesno', required: true, helper: 'Seperti pisang, jeruk, semangka, kol, buncis, atau terong', fullWidth: true },
        { key: 'makananManis', label: '52. Apakah anak sering mengonsumsi makanan/minuman manis berlebihan? *', type: 'select', required: true, options: ['Ya, sering', 'Kadang-kadang', 'Tidak'], helper: 'Contoh: permen, cokelat, minuman manis' },
        { key: 'bantuanGizi', label: '53. Apakah anak pernah mendapatkan bantuan atau makanan tambahan dari posyandu atau puskesmas karena masalah gizi? *', fullWidth: true, type: 'yesno', required: true, helper: 'Contohnya: bubur atau makanan tambahan balita dari posyandu, susu formula khusus, atau makanan bergizi siap saji' },
      ]
    },
    {
      title: "Pola Hidup & Lingkungan", icon: "9", color: "green", dynamic: true,
      questions: [
        { key: 'jamTidur', label: '55. Rata-rata jam tidur balita per hari *', type: 'number', required: true, placeholder: 'Contoh: 10 atau 10.5', helper: 'Tuliskan angka saja. Gunakan tanda titik (.) jika ada desimal. Contoh: 10 atau 10.5' },
        { key: 'aktivitasLuar', label: '56. Berapa lama aktivitas luar ruangan balita per hari? *', type: 'select', required: true, options: ['Kurang dari 1 jam per hari', '1 - 3 jam per hari', 'Lebih dari 3 jam per hari'] },
        { key: 'tipeAnak', label: '57. Apakah anak termasuk aktif atau cenderung diam? *', type: 'select', required: true, options: ['Sangat aktif (banyak bergerak/bermain)', 'Cukup aktif (kadang bermain, kadang diam)', 'Cenderung diam (lebih banyak duduk atau menonton)'] },
        { key: 'ibuBekerja', label: '58. Apakah ibu bekerja? *', type: 'yesno', required: true },
        { key: 'pengetahuanGizi', label: '59. Pengetahuan ibu tentang gizi balita *', type: 'select', required: true, options: ['Baik', 'Cukup', 'Kurang'] },
        { key: 'polaAsuh', label: '60. Pola asuh makan balita *', type: 'select', required: true, options: ['Responsive feeding (sabar, mengikuti tanda lapar/kenyang)', 'Pemaksaan makan', 'Dibiarkan makan sendiri tanpa pengawasan'] },
        { key: 'bpjs', label: '61. Apakah balita terdaftar dalam kepesertaan BPJS? *', type: 'yesno', required: true },
        { key: 'perokok', label: '62. Apakah ada anggota keluarga yang merokok di rumah? *', type: 'yesno', required: true },
        { key: 'sumberAir', label: '63. Sumber air minum utama di rumah *', type: 'select', required: true, options: ['PDAM', 'Sumur', 'Air Isi Ulang/Galon/Kemasan', 'Lainnya'] },
        { key: 'kualitasAir', label: '64. Kualitas air minum *', type: 'select', required: true, options: ['Diolah/dimasak', 'Bersih tanpa pengolahan (Galon/Air mineral kemasan)', 'Air tercemar/tidak layak'] },
        { key: 'sanitasi', label: '65. Jenis sanitasi yang digunakan keluarga *', fullWidth: true, type: 'select', required: true, options: ['Toilet atau jamban dengan tangki penampung kotoran (septic tank)', 'Toilet atau jamban tanpa tangki penampung, langsung keluar ke selokan', 'Buang air besar di sungai, kebun, atau tempat terbuka'] },
        { key: 'kebersihanRumah', label: '66. Kondisi kebersihan lingkungan rumah *', type: 'select', required: true, options: ['Bersih dan terawat', 'Cukup bersih', 'Kurang bersih'] },
        { key: 'cuciTangan', label: '67. Kebiasaan mencuci tangan sebelum memberi makan balita? *', type: 'select', required: true, options: ['Selalu', 'Sering', 'Kadang-kadang', 'Tidak Pernah'] },
      ]
    },
    {
      title: "Akses, Psikologi & Ekonomi", icon: "10", color: "indigo", dynamic: true,
      questions: [
        { key: 'aksesFaskes', label: '68. Akses ke fasilitas kesehatan (Posyandu/Puskesmas/Rumah Sakit) *', type: 'select', required: true, options: ['Mudah dijangkau (kurang dari 20 menit)', 'Sulit dijangkau (lebih dari 30 menit)', 'Tidak ada akses'] },
        { key: 'rutinPosyandu', label: '69. Seberapa sering melakukan kunjungan ke Posyandu per bulan? *', type: 'select', required: true, options: ['Rutin setiap bulan', 'Tidak rutin', 'Jarang', 'Tidak pernah'] },
        { key: 'babyBlues', label: '71. Apakah setelah melahirkan Ibu pernah merasa sedih berlebihan, mudah menangis, cemas, atau sulit tidur selama beberapa hari hingga minggu? *', fullWidth: true, type: 'yesno', required: true, helper: 'Kondisi ini sering disebut "baby blues" atau perasaan sedih setelah melahirkan' },
        { key: 'depresi', label: '72. Dalam beberapa bulan terakhir, apakah Ibu sering merasa sedih berkepanjangan, kehilangan semangat, atau sulit tidur karena banyak pikiran? *', fullWidth: true, type: 'yesno', required: true },
        { key: 'pendidikanIbu', label: '73. Pendidikan terakhir Ibu Balita *', type: 'select', required: true, options: ['SD/sederajat', 'SMP/sederajat', 'SMA/sederajat', 'Diploma (D1–D3)', 'S1', 'S2 ke atas'] },
        { key: 'pendidikanAyah', label: '74. Pendidikan terakhir Ayah Balita *', type: 'select', required: true, options: ['SD/sederajat', 'SMP/sederajat', 'SMA/sederajat', 'Diploma (D1–D3)', 'S1', 'S2 ke atas'] },
        { key: 'pernahPenyuluhan', label: '75. Apakah Ibu pernah mendapatkan penyuluhan tentang gizi anak di posyandu/puskesmas? *', type: 'yesno', required: true, fullWidth: true },
        { key: 'frekPenyuluhan', label: '76. Seberapa sering Ibu mengikuti kegiatan penyuluhan atau kelas ibu balita? *', type: 'select', required: true, options: ['Setahun sekali', 'Setahun lebih dari sekali', 'Jarang', 'Belum pernah'] },
        { key: 'pahamGizi', label: '77. Apakah Ibu merasa paham tentang makanan sehat untuk balita? *', type: 'select', required: true, options: ['Tidak paham', 'Kurang paham', 'Cukup paham', 'Paham'], helper: 'Porsi, variasi, dan frekuensi makan' },
        { key: 'pekerjaanAyah', label: '78. Pekerjaan utama kepala keluarga *', type: 'text', required: true, placeholder: 'Contoh: Wiraswasta, Buruh, PNS, dll.' },
        { key: 'jumlahAnggota', label: '79. Jumlah anggota rumah tangga (termasuk balita) *', type: 'number', required: true, placeholder: 'Contoh: 4', helper: 'Tuliskan jumlahnya saja. Contoh: 4 jika terdiri dari ayah, ibu, balita, dan nenek' },
        { key: 'pendapatan', label: '80. Perkiraan pendapatan bulanan keluarga *', type: 'select', required: true, options: ['Kurang dari Rp1.000.000', 'Rp1.000.000 – Rp2.999.999', 'Rp3.000.000 – Rp4.999.999', 'Rp5.000.000 ke atas'] },
        { key: 'jarakPasar', label: '81. Jarak atau waktu tempuh ke pasar/penjual makanan sehat terdekat *', type: 'select', required: true, options: ['Kurang dari 10 menit', '10 – 30 menit', 'Lebih dari 30 menit'] },
        { key: 'pantangan', label: '82. Apakah di keluarga Ibu ada makanan yang tidak boleh dimakan oleh anak (dilarang atau dipantang)? *', fullWidth: true, type: 'yesno', required: true, helper: 'Misalnya: tidak boleh makan ikan, telur, daging, atau makanan tertentu karena alasan adat atau kepercayaan' },
        { key: 'pengambilKeputusan', label: '83. Siapa yang biasanya menentukan makanan apa yang dimakan oleh anak di rumah? *', type: 'select', required: true, options: ['Ibu', 'Ayah', 'Nenek/Kakek', 'Bersama (Ibu dan Ayah)'] },
      ]
    }
  ], []);

  const initialState = useMemo(() => {
    const state = {};
    formStructure.forEach(s => s.questions.forEach(q => { state[q.key] = q.type === 'multiselect' ? [] : ''; }));
    // Fixed defaults
    state.namaKecamatan = 'Astananyar';
    return state;
  }, [formStructure]);

  const [formData, setFormData] = useState(initialState);

  // Auto-restore progress from database (Works across devices/VPS deployments)
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const ud = getUserData();
        if (!ud) return;

        const res = await fetch('/api/survey/me', {
          credentials: 'include'
        });
        
        if (res.ok) {
          const d = await res.json();
          if (d.has_survey && d.survey) {
            setFormData(prev => ({ ...prev, ...d.survey }));
            if (d.last_survey_date) setLastSurveyDate(d.last_survey_date);
            return; // We have restored from backend
          }
        }
        
        // Fallback: No survey in DB, pre-fill at least the parent name
        setFormData(prev => ({ ...prev, namaOrangTua: ud.nama }));
      } catch (e) {
        console.warn('Network error fetching history', e);
      }
    };
    fetchHistory();
  }, []);

  // Fetch balita list for the searchable dropdown
  useEffect(() => {
    const fetchBalitaList = async () => {
      setIsLoadingBalita(true);
      try {
        const res = await fetch('/api/balita/search', {
          credentials: 'include'
        });
        if (res.ok) {
          const d = await res.json();
          setBalitaList(d.data || []);
        }
      } catch (e) {
        console.warn('Gagal memuat daftar balita', e);
      } finally {
        setIsLoadingBalita(false);
      }
    };
    fetchBalitaList();
  }, []);

  // Auto-select balita from list when history is restored (formData.namaBalita already set)
  useEffect(() => {
    if (balitaList.length > 0 && formData.namaBalita && !selectedBalita) {
      const match = balitaList.find(
        (b) => b.nama.toLowerCase().trim() === formData.namaBalita.toLowerCase().trim()
      );
      if (match) setSelectedBalita(match);
    }
  }, [balitaList, formData.namaBalita]);

  // Handle balita selection from searchable dropdown
  const handleBalitaSelect = async (item) => {
    if (!item) {
      // Clear selection
      setSelectedBalita(null);
      setFormData(prev => ({
        ...prev,
        namaBalita: '',
        namaOrangTua: '',
        namaKecamatan: '',
        namaKelurahan: '',
        tanggalLahirBalita: '',
      }));
      setLastSurveyDate(null);
      return;
    }

    // Set identity fields immediately (always from balita record, not survey)
    const identityFields = {
      namaBalita: item.nama || '',
      namaOrangTua: item.nama_orang_tua || '',
      namaKecamatan: item.kecamatan || 'Astananyar',
      namaKelurahan: item.kelurahan || '',
      namaPosyandu: item.posyandu_nama || '',
      tanggalLahirBalita: item.tanggal_lahir || '',
    };
    setSelectedBalita(item);

    // Try to fetch the previous survey for this specific balita
    try {
      const res = await fetch(`/api/survey/me?balita_uuid=${item.uuid}`, { credentials: 'include' });
      if (res.ok) {
        const d = await res.json();
        if (d.has_survey && d.survey) {
          // Pre-fill from survey, but override identity fields with live balita data
          setFormData(prev => ({ ...prev, ...d.survey, ...identityFields }));
          if (d.last_survey_date) setLastSurveyDate(d.last_survey_date);
          setSectionErrors({});
          return;
        }
      }
    } catch (e) {
      console.warn('Could not fetch survey for balita', e);
    }

    // No prior survey — just fill identity fields
    setLastSurveyDate(null);
    setFormData(prev => ({ ...prev, ...identityFields }));
    setSectionErrors(prev => { const n = { ...prev }; delete n['namaBalita']; return n; });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (sectionErrors[name]) setSectionErrors(prev => { const n = { ...prev }; delete n[name]; return n; });
  };
  const toggleMultiSelect = (key, option) => {
    setFormData(prev => {
      const c = Array.isArray(prev[key]) ? prev[key] : [];
      const next = c.includes(option) ? c.filter(i => i !== option) : [...c, option];
      return { ...prev, [key]: next };
    });
    if (sectionErrors[key]) setSectionErrors(prev => { const n = { ...prev }; delete n[key]; return n; });
  };
  const handleReset = () => {
    setFormData(initialState);
    setIsComplete(false);
    setActiveSection(0);
    setSelectedBalita(null);
    setPredictionData(null);
    setRekomendasiData(null);
    setSubmitError('');
    setSectionErrors({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ─── Section Validation ──────────────────────────────
  const validateCurrentSection = () => {
    const section = formStructure[activeSection];
    const visibleQs = section.questions.filter(q => {
      if (!q.showIf) return true;
      const triggerVal = formData[q.showIf.key];
      if (Array.isArray(q.showIf.value)) return q.showIf.value.includes(triggerVal);
      return triggerVal === q.showIf.value;
    });

    const errors = {};
    visibleQs.forEach(q => {
      if (!q.required) return;
      const v = formData[q.key];
      const isEmpty = v === '' || v === null || v === undefined || (Array.isArray(v) && v.length === 0);
      if (isEmpty) errors[q.key] = true;
    });

    setSectionErrors(errors);

    if (Object.keys(errors).length > 0) {
      // Scroll to the first error field
      const firstKey = Object.keys(errors)[0];
      const el = document.getElementById(`field-${firstKey}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return false;
    }
    return true;
  };

  const handleNextSection = () => {
    if (!validateCurrentSection()) return;
    setSectionErrors({});
    setActiveSection(prev => prev + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSectionClick = (idx) => {
    // Allow going back freely; validate before going forward
    if (idx > activeSection) {
      if (!validateCurrentSection()) return;
      setSectionErrors({});
    } else {
      setSectionErrors({});
    }
    setActiveSection(idx);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ─── Submit ─────────────────────────
  const handleSubmit = async () => {
    setSubmitError('');
    setIsSubmitting(true);

    try {
      if (!selectedBalita) {
        throw new Error('Pilih nama balita terlebih dahulu dari daftar dropdown.');
      }

      // Send survey data with the resolved balita_uuid
      const dataToSave = { ...formData };

      const res = await fetch('/api/survey', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ balita_uuid: selectedBalita.uuid, data: dataToSave })
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || `Gagal menyimpan data (HTTP ${res.status}). Coba lagi.`);
      }

      // ── Show prediction result from selected balita's last measurement ──
      if (selectedBalita.status_gizi_bbtb || selectedBalita.status_gizi_bbu || selectedBalita.status_gizi_tbu) {
        setPredictionData({
          bbtb: selectedBalita.status_gizi_bbtb || null,
          bbu: selectedBalita.status_gizi_bbu || null,
          tbu: selectedBalita.status_gizi_tbu || null,
        });
      }

      // ── Call rekomendasi intervensi with full parent form data ──
      setIsUpdatingRek(true);
      try {
        const mlUrl = process.env.NEXT_PUBLIC_ML_SERVICE_URL || 'http://localhost:8000';

        // Map form long-text dropdown values to exact Python enum strings
        const _mapPolaAsuh = (v) => {
          if (!v) return 'Responsive feeding';
          const l = v.toLowerCase();
          if (l.includes('pemaksaan')) return 'Pemaksaan makan';
          if (l.includes('dibiarkan')) return 'Dibiarkan makan sendiri';
          return 'Responsive feeding';
        };
        const _mapSanitasi = (v) => {
          if (!v) return 'Toilet dengan septic tank';
          const l = v.toLowerCase();
          if (l.includes('sungai') || l.includes('kebun') || l.includes('terbuka')) return 'Buang air di sungai/kebun';
          if ((l.includes('tanpa') || l.includes('langsung')) && l.includes('selokan')) return 'Toilet tanpa septic tank (ke selokan)';
          return 'Toilet dengan septic tank';
        };

        const rekPayload = {
          usia_bulan: selectedBalita.tanggal_lahir
            ? Math.floor((Date.now() - new Date(selectedBalita.tanggal_lahir).getTime()) / (1000 * 60 * 60 * 24 * 30.44))
            : 12,
          berat_badan: 10, // Not in parent form; use placeholder
          status_gizi_bb_tb: selectedBalita.status_gizi_bbtb || 'Gizi Baik',
          status_gizi_tb_u: selectedBalita.status_gizi_tbu || 'Normal',
          asi_eksklusif: formData.asiEksklusif === 'Ya',
          konsumsi_protein_hewani: formData.mpasiHewani || 'Ya, setiap hari',
          pola_asuh_makan: _mapPolaAsuh(formData.polaAsuh),
          riwayat_sakit_2minggu: formData.sakit2Minggu === 'Ya',
          jenis_sanitasi: _mapSanitasi(formData.sanitasi),
          rutin_vitamin_a: !!formData.vitaminA,
          rutin_posyandu: formData.rutinPosyandu === 'Rutin setiap bulan',
        };

        const rekRes = await fetch(`${mlUrl}/predict-rekomendasi`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(rekPayload),
        });

        if (rekRes.ok) {
          const rekData = await rekRes.json();
          setRekomendasiData(rekData);

          // Save updated rekomendasi to database
          await fetch('/api/pengukuran/update-rekomendasi', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
              balita_uuid: selectedBalita.uuid,
              rekomendasi_utama: rekData.rekomendasi_utama,
              rekomendasi_tambahan: [
                ...(rekData.rekomendasi_tambahan || []),
              ],
              catatan_rekomendasi: rekData.catatan || null,
            }),
          });
        }
      } catch (rekErr) {
        console.warn('Rekomendasi update error (non-fatal):', rekErr);
      } finally {
        setIsUpdatingRek(false);
      }

      setIsComplete(true);
      toast.success('Data Berhasil Disimpan!', 'Data kesehatan anak telah tercatat. Rekomendasi intervensi telah diperbarui.', 7000);
    } catch (err) {
      setSubmitError(err.message);
      toast.error('Gagal Menyimpan', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = "w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-gray-900 focus:bg-white focus:ring-2 focus:ring-gray-900/5 outline-none transition-all text-sm text-gray-900 placeholder:text-gray-400";

  // Progress — only count visible (showIf-satisfied) questions
  const getVisibleQuestions = (sections, data) =>
    sections.flatMap(s =>
      s.questions.filter(q => {
        if (!q.showIf) return true;
        const triggerVal = data[q.showIf.key];
        if (Array.isArray(q.showIf.value)) return q.showIf.value.includes(triggerVal);
        return triggerVal === q.showIf.value;
      })
    );

  const visibleQuestions = getVisibleQuestions(formStructure, formData);
  const totalQuestions = visibleQuestions.length;
  const answeredQuestions = visibleQuestions.filter(q => {
    const v = formData[q.key];
    return v !== '' && v !== null && v !== undefined && !(Array.isArray(v) && v.length === 0);
  }).length;
  const progressPercent = totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0;

  // ────────────── RENDER ──────────────
  return (
    <div className="min-h-screen bg-[#fafafa] page-enter">
      {/* ─── Navbar ─── */}
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Link href="/" className="p-2 -ml-2 hover:bg-gray-100 rounded-xl transition-colors">
                <ArrowLeft size={20} className="text-gray-500" />
              </Link>
              <div className="h-5 w-px bg-gray-200" />
              <Link href="/" className="flex items-center gap-2.5 hover:opacity-70 transition-opacity">
                <img src="/growell-logo.png" alt="Growell" className="w-8 h-8 rounded-lg object-cover" />
                <span className="font-semibold text-gray-900 text-sm tracking-tight">Kuesioner Orang Tua</span>
              </Link>
            </div>
            {/* Progress badge */}
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500">
                <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gray-900 rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }} />
                </div>
                <span className="font-medium">{progressPercent}%</span>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
      </div>

      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {/* ─── Header ─── */}
        <div className="mt-4 mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Formulir Data Gizi & Kesehatan</h2>
          <p className="text-sm text-gray-500 mt-2 max-w-xl">Mohon isi data dengan jujur sesuai kondisi sebenarnya untuk keperluan prediksi status gizi balita.</p>
        </div>

        {/* ─── Pre-fill / Info Banner ─── */}
        {lastSurveyDate ? (
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-start gap-3">
            <RefreshCw size={16} className="text-amber-500 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-amber-800 leading-relaxed">
              <strong>Data dari kunjungan sebelumnya ({new Date(lastSurveyDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}) telah diisi otomatis.</strong>
              {' '}Periksa setiap bagian dan <u>perbarui data yang berubah</u> — terutama bagian bertanda <span className="inline-flex items-center gap-0.5 bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded text-[10px] font-bold">⟳ Perbarui</span> yang bersifat dinamis (berubah tiap kunjungan).
            </div>
          </div>
        ) : (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-3.5 flex items-start gap-3">
            <Info size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-blue-700 leading-relaxed">
              <strong>Cara Pengisian:</strong> Pilih nama balita dari dropdown di bagian pertama. Data tanggal lahir, kelurahan, dan kecamatan akan terisi otomatis dari catatan kader. Selanjutnya lengkapi semua pertanyaan kesehatan.
            </div>
          </div>
        )}

        {/* ─── Completion State ─── */}
        {isComplete ? (
          <div className="space-y-5">
            {/* Success header */}
            <div className="bg-white rounded-2xl border border-emerald-200 p-8 sm:p-10 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 size={32} className="text-emerald-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Formulir Berhasil Dikirim!</h3>
              <p className="text-sm text-gray-500 max-w-md mx-auto mb-2">
                Data kesehatan anak <strong>{selectedBalita?.nama || ''}</strong> telah berhasil disimpan.
                Rekomendasi intervensi gizi telah diperbarui berdasarkan data yang Anda isi.
              </p>
              {isUpdatingRek && (
                <p className="text-xs text-teal-600 flex items-center justify-center gap-1.5 mt-2">
                  <Loader2 size={12} className="animate-spin" /> Memperbarui rekomendasi...
                </p>
              )}
            </div>

            {/* Prediction result */}
            {predictionData && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-teal-50 text-teal-600 flex items-center justify-center text-[10px] font-bold">✓</span>
                  Status Gizi {selectedBalita?.nama || 'Balita'} (Hasil Terbaru)
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'BB/TB (Wasting)', value: predictionData.bbtb, sub: 'Berat ↔ Tinggi' },
                    { label: 'BB/U', value: predictionData.bbu, sub: 'Berat ↔ Umur' },
                    { label: 'TB/U (Stunting)', value: predictionData.tbu, sub: 'Tinggi ↔ Umur' },
                  ].map((r, i) => {
                    const s = (r.value || '').toLowerCase();
                    const color = s.includes('gizi baik') || s.includes('normal') || s.includes('berat badan normal')
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : s.includes('gizi buruk') || s.includes('sangat pendek') || s.includes('sangat kurang')
                      ? 'bg-red-50 text-red-700 border-red-200'
                      : s.includes('gizi kurang') || s.includes('pendek') || s.includes('kurang')
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : s.includes('gizi lebih') || s.includes('tinggi') || s.includes('lebih')
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-gray-50 text-gray-600 border-gray-200';
                    return (
                      <div key={i} className={`rounded-xl p-4 border ${r.value ? color : 'bg-gray-50 border-gray-200'}`}>
                        <p className="text-[10px] font-medium opacity-70 mb-1">{r.label}</p>
                        <p className="text-sm font-bold">{r.value || '-'}</p>
                        <p className="text-[10px] opacity-60 mt-0.5">{r.sub}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Rekomendasi intervensi */}
            {rekomendasiData && (
              <div className="bg-white rounded-2xl border border-violet-200 p-6">
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-violet-50 text-violet-600 flex items-center justify-center text-[10px] font-bold">R</span>
                  Rekomendasi Intervensi Gizi
                </h3>
                <div className="bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-200 rounded-xl p-5 space-y-4">
                  <div>
                    <p className="text-xs font-medium text-violet-500 uppercase tracking-wide mb-1">Rekomendasi Utama</p>
                    <p className="text-base font-bold text-violet-900">{rekomendasiData.rekomendasi_utama}</p>
                  </div>
                  {rekomendasiData.rekomendasi_tambahan?.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-violet-500 uppercase tracking-wide mb-2">Rekomendasi Tambahan</p>
                      <ul className="space-y-1.5">
                        {rekomendasiData.rekomendasi_tambahan.map((r, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-violet-800">
                            <span className="w-5 h-5 rounded-md bg-violet-100 text-violet-600 flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5">{i + 1}</span>
                            {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {rekomendasiData.catatan && (
                    <div className="pt-3 border-t border-violet-200/50">
                      <p className="text-xs font-medium text-violet-500 uppercase tracking-wide mb-1">Catatan</p>
                      <p className="text-sm text-violet-700">{rekomendasiData.catatan}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button onClick={handleReset} className="px-6 py-3 bg-gray-900 text-white rounded-xl font-semibold text-sm hover:bg-gray-800 transition">Isi Untuk Anak Lain</button>
              <Link href="/" className="px-6 py-3 border border-gray-200 text-gray-600 rounded-xl font-semibold text-sm hover:bg-gray-50 transition text-center">Kembali ke Beranda</Link>
            </div>
          </div>
        ) : (
          <>
            {/* ─── Section Navigation ─── */}
            <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
              {formStructure.map((section, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSectionClick(idx)}
                  className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                    activeSection === idx
                      ? 'bg-gray-900 text-white'
                      : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                    activeSection === idx ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                  }`}>{section.icon}</span>
                  <span className="hidden sm:inline">{section.title}</span>
                  <span className="sm:hidden">{section.icon}</span>
                  {section.dynamic && lastSurveyDate && (
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${activeSection === idx ? 'bg-amber-300' : 'bg-amber-400'}`} title="Perbarui setiap kunjungan" />
                  )}
                </button>
              ))}
            </div>

            {/* ─── Active Section ─── */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-8">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
                <div>
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Bagian {activeSection + 1} dari {formStructure.length}</p>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-gray-900">{formStructure[activeSection].title}</h3>
                    {formStructure[activeSection].dynamic && lastSurveyDate && (
                      <span className="inline-flex items-center gap-0.5 bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded text-[10px] font-bold border border-amber-200">
                        ⟳ Perbarui
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-xs text-gray-400 font-medium">{formStructure[activeSection].questions.filter(q => {
                  if (!q.showIf) return true;
                  const triggerVal = formData[q.showIf.key];
                  if (Array.isArray(q.showIf.value)) return q.showIf.value.includes(triggerVal);
                  return triggerVal === q.showIf.value;
                }).length} pertanyaan</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                {formStructure[activeSection].questions.filter((q) => {
                  if (!q.showIf) return true;
                  const triggerVal = formData[q.showIf.key];
                  if (Array.isArray(q.showIf.value)) {
                    return q.showIf.value.includes(triggerVal);
                  }
                  return triggerVal === q.showIf.value;
                }).map((q) => {
                  let input;
                  if (q.type === 'balita_select') {
                    // Special searchable dropdown for balita
                    input = (
                      <div>
                        <SearchableBalitaDropdown
                          items={balitaList}
                          selected={selectedBalita?.uuid || null}
                          onSelect={handleBalitaSelect}
                          placeholder={isLoadingBalita ? 'Memuat daftar balita...' : (q.placeholder || 'Cari & pilih nama balita...')}
                          disabled={isLoadingBalita}
                        />
                        {isLoadingBalita && (
                          <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
                            <Loader2 size={11} className="animate-spin" /> Memuat daftar balita…
                          </p>
                        )}
                        {!isLoadingBalita && balitaList.length === 0 && (
                          <p className="text-xs text-amber-600 mt-1.5">
                            Belum ada data balita. Pastikan kader sudah menginput data anak terlebih dahulu.
                          </p>
                        )}
                      </div>
                    );
                  } else if (q.type === 'date') {
                    // Format YYYY-MM-DD → dd/mm/yyyy without timezone offset bugs
                    const fmtDate = (iso) => {
                      if (!iso) return '';
                      const parts = String(iso).split('T')[0].split('-');
                      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
                      return iso;
                    };
                    input = q.readonly
                      ? <input type="text" value={fmtDate(formData[q.key])} readOnly className={`${inputClass} bg-gray-100 cursor-not-allowed`} placeholder={q.placeholder || 'Terisi otomatis'} />
                      : <CustomDatePicker name={q.key} value={formData[q.key]} onChange={handleChange} placeholder="Pilih tanggal" defaultYear={new Date().getFullYear() - 2} />;
                  } else if (q.type === 'yesno') {
                    input = <CustomDropdown name={q.key} value={formData[q.key]} onChange={handleChange} placeholder="Pilih jawaban" options={[{ value: 'Ya', label: 'Ya' }, { value: 'Tidak', label: 'Tidak' }]} error={!!sectionErrors[q.key]} />;
                  } else if (q.type === 'select') {
                    input = <CustomDropdown name={q.key} value={formData[q.key]} onChange={handleChange} placeholder="Pilih jawaban" options={q.options.map(o => ({ value: o, label: o }))} error={!!sectionErrors[q.key]} />;
                  } else if (q.type === 'multiselect') {
                    const sel = Array.isArray(formData[q.key]) ? formData[q.key] : [];
                    input = (
                      <div className={`space-y-1 mt-1 bg-gray-50 p-3 rounded-xl border max-h-48 overflow-y-auto ${sectionErrors[q.key] ? 'border-red-400 bg-red-50' : 'border-gray-200'}`}>
                        {q.options.map(opt => (
                          <label key={opt} className="flex items-center gap-2.5 text-sm text-gray-700 cursor-pointer hover:bg-white p-2 rounded-lg transition-colors">
                            <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900" checked={sel.includes(opt)} onChange={() => toggleMultiSelect(q.key, opt)} />
                            <span className="leading-snug">{opt}</span>
                          </label>
                        ))}
                      </div>
                    );
                  } else {
                    // text, number — with optional readonly
                    input = <input
                      type={q.type === 'number' ? 'number' : 'text'}
                      step={q.type === 'number' ? '0.1' : undefined}
                      name={q.key}
                      value={formData[q.key]}
                      onChange={q.readonly ? undefined : handleChange}
                      readOnly={!!q.readonly}
                      className={`${inputClass} ${q.readonly ? 'bg-gray-100 cursor-not-allowed' : ''} ${sectionErrors[q.key] ? '!border-red-400 !bg-red-50 focus:!border-red-500 focus:!ring-red-500/10' : ''}`}
                      placeholder={q.placeholder || (q.readonly ? 'Terisi otomatis' : 'Tulis jawaban...')}
                    />;
                  }

                  return (
                    <div key={q.key} id={`field-${q.key}`} className={q.fullWidth ? 'sm:col-span-2' : ''}>
                      <label className={`block text-sm font-medium mb-2 leading-relaxed ${sectionErrors[q.key] ? 'text-red-600' : 'text-gray-700'}`}>{q.label}</label>
                      {input}
                      {q.helper && !sectionErrors[q.key] && <p className="text-xs text-gray-400 mt-1.5 italic">{q.helper}</p>}
                      {sectionErrors[q.key] && (
                        <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1 font-medium">
                          <AlertCircle size={12} className="flex-shrink-0" /> Pertanyaan ini wajib diisi
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              {submitError && (
                <div className="mt-4 bg-red-50 border border-red-200 text-red-600 rounded-xl p-4 text-sm font-medium flex items-start gap-2">
                  <AlertCircle size={16} className="mt-0.5 flex-shrink-0" /> {submitError}
                </div>
              )}

              {/* Section validation error summary */}
              {Object.keys(sectionErrors).length > 0 && (
                <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                  <AlertCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-red-700 mb-1">
                      {Object.keys(sectionErrors).length} pertanyaan wajib belum diisi
                    </p>
                    <p className="text-xs text-red-500">Scroll ke atas untuk melihat pertanyaan yang ditandai merah, lalu isi sebelum melanjutkan.</p>
                  </div>
                </div>
              )}

              {/* Navigation */}
              <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
                <button
                  onClick={() => { setSectionErrors({}); setActiveSection(Math.max(0, activeSection - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  disabled={activeSection === 0}
                  className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Sebelumnya
                </button>
                {activeSection < formStructure.length - 1 ? (
                  <button
                    onClick={handleNextSection}
                    className="px-5 py-2.5 text-sm font-medium text-white bg-gray-900 rounded-xl hover:bg-gray-800 transition-colors flex items-center gap-1.5"
                  >
                    Selanjutnya <ChevronRight size={14} />
                  </button>
                ) : (
                  <div className="flex gap-3">
                    <button onClick={handleReset} className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors flex items-center gap-2">
                      <RefreshCw size={14} /> Reset
                    </button>
                    <button onClick={() => { if (!validateCurrentSection()) return; handleSubmit(); }} disabled={isSubmitting}
                      className="px-6 py-2.5 text-sm font-medium text-white bg-gray-900 rounded-xl hover:bg-gray-800 transition-colors flex items-center gap-2 disabled:opacity-50">
                      {isSubmitting
                        ? <><Loader2 size={14} className="animate-spin" /> Menyimpan...</>
                        : lastSurveyDate
                          ? <><Save size={14} /> Perbarui &amp; Simpan</>
                          : <><Save size={14} /> Simpan &amp; Kirim</>}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* ─── Progress Bar ─── */}
            <div className="mt-6 bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium text-gray-500">Progres Pengisian</p>
                <p className="text-xs font-medium text-gray-900">{answeredQuestions}/{totalQuestions} pertanyaan ({progressPercent}%)</p>
              </div>
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-gray-900 rounded-full transition-all duration-500 ease-out" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}