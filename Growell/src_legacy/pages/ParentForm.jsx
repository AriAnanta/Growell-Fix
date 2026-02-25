import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Save, RefreshCw, Link2 } from 'lucide-react';
import growellLogo from '../assets/Growell (1).png';
import Breadcrumb from '../components/common/Breadcrumb';
import CustomDatePicker from '../components/forms/CustomDatePicker';
import CustomDropdown from '../components/forms/CustomDropdown';

export default function ParentForm() {
  const [isComplete, setIsComplete] = useState(false);

  const formStructure = useMemo(() => [
    {
      title: "Identitas & Lokasi",
      questions: [
        { key: 'namaKecamatan', label: '1. Nama Kecamatan yang ditempati?', type: 'text', placeholder: 'Tulis nama kecamatan...' },
        { key: 'namaPosyandu', label: '2. Nama Posyandu yang dikunjungi?', type: 'text' },
        { key: 'namaOrangTua', label: '3. Nama lengkap orang tua balita *', type: 'text', placeholder: 'Wajib nama lengkap (untuk pencocokan data)' },
        { key: 'namaBalita', label: '4. Nama lengkap balita *', type: 'text', placeholder: 'Wajib nama lengkap (untuk pencocokan data)' },
        { key: 'namaKelurahan', label: '5. Nama Kelurahan', type: 'select', options: ['Cibadak', 'Karanganyar', 'Nyengseret', 'Panjunan', 'Pelindung Hewan', 'Karasak'] },
        { key: 'tanggalLahirBalita', label: '7. Tanggal Lahir Balita', type: 'date' },
      ]
    },
    {
      title: "Riwayat Kelahiran & Kesehatan Awal",
      questions: [
        { key: 'bbLahirRendah', label: '8. Apakah berat lahir balita kurang dari 2.5 kg (berat lahir rendah)?', type: 'yesno' },
        { key: 'prematur', label: '9. Apakah balita lahir prematur (kurang dari 9 bulan)?', type: 'yesno' },
        { key: 'imd', label: '10. Apakah bayi langsung diletakkan di dada ibu dan disusui dalam 1 jam pertama (IMD)?', type: 'yesno', helper: '(Tindakan ini disebut Inisiasi Menyusui Dini atau IMD)' },
        { key: 'komplikasiLahir', label: '11. Apakah saat lahir terdapat komplikasi atau penyakit serius?', type: 'yesno' },
        { key: 'detailKomplikasi', label: '12. Jika ya, komplikasi atau penyakit serius apa yang diderita?', type: 'text' },
      ]
    },
    {
      title: "Status Kesehatan Orang Tua",
      questions: [
        { key: 'tinggiIbu', label: '13. Tinggi badan ibu (cm)', type: 'number', placeholder: 'Contoh: 160 atau 160.5', helper: '(Contoh: 160 atau 160.5 - gunakan tanda titik (.) jika ada angka desimal)' },
        { key: 'beratIbu', label: '14. Berat badan ibu (kg)', type: 'number', placeholder: 'Contoh: 60 atau 60.5', helper: '(Contoh: 60 atau 60.5 - gunakan tanda titik (.) jika ada angka desimal)' },
        { key: 'tinggiAyah', label: '15. Tinggi badan ayah (cm)', type: 'number', placeholder: 'Contoh: 170', helper: '(Contoh: 160 atau 160.5 - gunakan tanda titik (.) jika ada angka desimal)' },
        { key: 'beratAyah', label: '16. Berat badan ayah (kg)', type: 'number', placeholder: 'Contoh: 70', helper: '(Contoh: 60 atau 60.5 - gunakan tanda titik (.) jika ada angka desimal)' },
        { key: 'statusGiziIbuHamil', label: '17. Status gizi ibu saat hamil', type: 'select', options: ['Normal', 'Kurang Energi Kronis (KEK) (LILA < 23.5 cm)'], helper: 'Kurang Energi Kronis (KEK) (Ukuran lingkar lengan atas kurang dari 23.5 cm atau indeks massa tubuh (IMT) kurang dari 18.5' },
        { key: 'anemia', label: '18. Apakah ibu pernah didiagnosis anemia oleh tenaga kesehatan?', type: 'yesno' },
        { key: 'hamilDiBawah20', label: '19. Apakah ibu hamil saat usia di bawah 20 tahun?', type: 'yesno' },
        { key: 'jarakKelahiran', label: '20. Jarak waktu kelahiran anak ini dengan kakak/adiknya?', type: 'select', options: ['Kurang dari 2 Tahun', '2-3 Tahun', 'Lebih dari 3 Tahun', 'Anak pertama'], helper: '(Bila anak ini adalah anak pertama, pilih opsi "Anak pertama")' },
        { key: 'tekananDarahTinggi', label: '21. Apakah ibu mengalami tekanan darah tinggi saat hamil?', type: 'yesno' },
        { key: 'gulaDarahTinggi', label: '22. Apakah ibu mengalami gula darah tinggi saat hamil?', type: 'yesno' },
        { key: 'infeksiHamil', label: '23. Apakah selama hamil mengalami infeksi serius (ISK, Malaria, dll)?', type: 'yesno', helper: '(Misalnya infeksi saluran kemih, demam tinggi karena infeksi, malaria, atau lainnya)' },
      ]
    },
    {
      title: "Suplemen & Kehamilan",
      questions: [
        { key: 'rutinSuplemen', label: '24. Apakah ibu rutin mengonsumsi suplemen saat hamil?', type: 'select', options: ['Rutin setiap hari', 'Kadang-kadang', 'Tidak pernah'] },
        { key: 'hamilLagi', label: '25. Apakah ibu sedang hamil kembali saat ini?', type: 'yesno' },
        { key: 'frekuensiSuplemen', label: '26. Jika konsumsi suplemen, berapa kali dalam seminggu?', type: 'number' },
        { key: 'jenisSuplemen', label: '27. Suplemen apa yang dikonsumsi? (Pilih semua yang sesuai)', type: 'multiselect', options: [
            'Tablet tambah darah (zat besi)', 'Vitamin C', 'Vitamin D', 'Asam folat', 'Kalsium', 'Susu ibu hamil', 'Lainnya'
          ], helper: '(Contohnya: tablet tambah darah, vitamin C, vitamin D, kalsium, atau susu ibu hamil.)' },
        { key: 'ttd90', label: '28. Apakah ibu mengonsumsi Tablet Tambah Darah minimal 90 tablet?', type: 'yesno' },
      ]
    },
    {
      title: "Pemberian ASI & MP-ASI",
      questions: [
        { key: 'asiEksklusif', label: '29. Apakah bayi mendapat ASI eksklusif selama 6 bulan?', type: 'yesno' },
        { key: 'usiaMpasi', label: '30. Usia balita mulai diberi MP-ASI (bulan)', type: 'number' },
        { key: 'mpasiHewani', label: '31. Apakah MP-ASI mengandung bahan hewani (telur, ikan, ayam, daging)?', type: 'select', options: ['Ya, setiap hari', 'Ya, namun tidak rutin', 'Tidak pernah'] },
        { key: 'frekuensiMakan', label: '32. Berapa kali anak makan utama per hari?', type: 'select', options: ['1 kali sehari', '2 kali sehari', '3 kali sehari', '4 kali sehari atau lebih'] },
        { key: 'susuLain', label: '33. Apakah anak minum susu selain ASI (Formula/UHT/Bubuk)?', type: 'yesno' },
        { key: 'frekuensiSusu', label: '34. Jika ya, berapa kali per hari?', type: 'number' },
      ]
    },
    {
      title: "Suplemen & Riwayat Intervensi Balita",
      questions: [
        { key: 'vitaminA', label: '35. Kapan terakhir kali balita mendapat vitamin A?', type: 'text', placeholder: 'Bulan/Tahun' },
        { key: 'tabletBesiAnak', label: '36. Apakah anak rutin minum tablet zat besi (tablet merah)?', type: 'select', options: ['Ya', 'Jarang', 'Tidak'] },
        { key: 'obatCacing', label: '37. Apakah anak pernah minum obat cacing?', type: 'yesno' },
        { key: 'intervensiGizi', label: '38. Apakah pernah mendapat intervensi gizi (PMT, RUTF, Rujukan)?', type: 'yesno', helper: '(Misalnya: makanan tambahan dari posyandu (PMT), makanan padat gizi untuk anak gizi buruk (RUTF), penyuluhan gizi, atau rujukan ke puskesmas/RS untuk pemeriksaan lebih lanjut)' },
        { key: 'jenisIntervensi', label: '39. Jika ya, intervensi apa yang diterima? (Pilih semua yang sesuai)', type: 'multiselect', options: [
            'Pemberian Makanan Tambahan', 'Makanan padat gizi (RUTF)', 'Edukasi gizi', 'Rujukan ke puskesmas/RS', 'Lainnya'
          ] },
      ]
    },
    {
      title: "Riwayat Kesehatan & Vaksinasi",
      questions: [
        { key: 'vaksin', label: '40. Vaksin apa saja yang sudah diterima? (Pilih semua yang sesuai)', fullWidth: true, type: 'multiselect', options: [
            'Hepatitis B (<24 Jam)', 'BCG', 'Polio Tetes 1', 'DPT-HB-Hib 1', 'Polio Tetes 2', 'Rota Virus (RV) 1', 'PCV 1',
            'DPT-HB-Hib 2', 'Polio Tetes 3', 'Rota Virus (RV) 2', 'PCV 2', 'DPT-HB-Hib 3', 'Polio Tetes 4',
            'Polio Suntik (IPV) 1', 'Rota Virus (RV) 3', 'Campak - Rubella (MR)', 'Polio Suntik (IPV) 2', 
            'Japanese Encephalitis (JE)', 'PCV 3', 'DPT-HB-Hib Lanjutan', 'Campak - Rubella (MR) Lanjutan'
          ] },
        { key: 'sakit2Minggu', label: '41. Apakah balita sakit dalam 2 minggu terakhir?', type: 'yesno' },
        { key: 'jenisPenyakit', label: '42. Jika ya, penyakit apa yang diderita?', type: 'multiselect', options: [
            'Tidak sakit', 'Diare', 'ISPA', 'Demam/Malaria', 'Cacingan', 'Lainnya'
          ] },
        { key: 'penyakitBawaan', label: '70. Apakah balita memiliki penyakit bawaan saat lahir?', type: 'yesno' },
        { key: 'rawatInap', label: '54. Apakah balita pernah dirawat inap?', type: 'yesno' },
      ]
    },
    {
      title: "Riwayat Konsumsi Makan (Kemarin)",
      questions: [
        { key: 'asiKemarin', label: '43. Apakah sehari sebelumnya anak mengonsumsi ASI?', type: 'yesno' },
        { key: 'makanPokok', label: '44. Apakah kemarin makan makanan pokok (nasi, bubur, roti, umbi)?', type: 'yesno' },
        { key: 'makanKacang', label: '45. Apakah kemarin makan kacang-kacangan (tempe, tahu, kacang)?', type: 'yesno' },
        { key: 'produkSusu', label: '46. Apakah kemarin makan olahan susu (yogurt, keju, susu)?', type: 'yesno' },
        { key: 'susuMurni', label: '47. Apakah minum susu murni 100% tanpa gula/rasa?', fullWidth: true, type: 'yesno', helper: '"Susu murni 100% adalah susu yang berasal langsung dari hewan (sapi, kambing, atau kerbau) tanpa dicampur bahan lain seperti air, gula, perasa, atau pengawet. Contohnya: susu pasteurisasi dalam botol atau kemasan yang bertuliskan "susu segar murni" atau "100% susu sapi", bukan susu bubuk instan, susu formula, atau susu rasa cokelat/stroberi."' },
        { key: 'proteinHewani', label: '48. Apakah kemarin makan daging, ayam, ikan, atau jeroan?', type: 'yesno' },
        { key: 'telur', label: '49. Apakah kemarin makan telur?', type: 'yesno', helper: '(Misalnya telur ayam, telur bebek, atau telur puyuh - bisa direbus, digoreng, atau dicampur ke makanan seperti nasi, bubur)' },
        { key: 'sayurVitA', label: '50. Apakah kemarin makan sayur/buah kaya Vit A (bayam, wortel, pepaya)?', type: 'yesno', helper: 'Apakah anak kemaren makan buah dan sayuran kaya Vitamin A seperti pepaya, mangga, wortel, dan sayuran berdaun hijau gelap seperti bayam, kangkung, daun katuk, daun singkong, daun kelor, brokoli, dan lain-lain?' },
        { key: 'sayurLain', label: '51. Apakah kemarin makan sayur/buah lainnya (pisang, kol, buncis)?', type: 'yesno' },
        { key: 'makananManis', label: '52. Apakah sering konsumsi manis berlebihan (permen, cokelat)?', type: 'select', options: ['Ya, sering', 'Kadang-kadang', 'Tidak'] },
        { key: 'bantuanGizi', label: '53. Apakah pernah dapat bantuan makanan karena masalah gizi?', fullWidth: true, type: 'yesno', helper: '(Contohnya: bubur atau makanan tambahan balita dari posyandu, susu formula khusus, atau makanan bergizi siap saji)' },
      ]
    },
    {
      title: "Pola Hidup & Lingkungan",
      questions: [
        { key: 'jamTidur', label: '55. Rata-rata jam tidur balita per hari', type: 'number', helper: '(Contoh: 6 atau 6.5-gunakan tanda titik (.) jika ada angka desimal)' },
        { key: 'aktivitasLuar', label: '56. Lama aktivitas luar ruangan balita per hari?', type: 'select', options: ['Kurang dari 1 jam', '1-3 jam', 'Lebih dari 3 jam'] },
        { key: 'tipeAnak', label: '57. Apakah anak termasuk aktif atau diam?', type: 'select', options: ['Sangat aktif', 'Cukup aktif', 'Cenderung diam'] },
        { key: 'ibuBekerja', label: '58. Apakah ibu bekerja?', type: 'yesno' },
        { key: 'pengetahuanGizi', label: '59. Pengetahuan ibu tentang gizi balita', type: 'select', options: ['Baik', 'Cukup', 'Kurang'] },
        { key: 'polaAsuh', label: '60. Pola asuh makan balita', type: 'select', options: ['Responsive feeding', 'Pemaksaan makan', 'Dibiarkan makan sendiri'] },
        { key: 'bpjs', label: '61. Apakah balita punya BPJS?', type: 'yesno' },
        { key: 'perokok', label: '62. Apakah ada yang merokok di rumah?', type: 'yesno' },
        { key: 'sumberAir', label: '63. Sumber air minum utama', type: 'select', options: ['PDAM', 'Sumur', 'Air Isi Ulang/Galon', 'Lainnya'] },
        { key: 'kualitasAir', label: '64. Kualitas air minum', type: 'select', options: ['Diolah/dimasak', 'Bersih tanpa pengolahan (Galon)', 'Air tercemar/tidak layak'] },
        { key: 'sanitasi', label: '65. Jenis sanitasi keluarga', fullWidth: true, type: 'select', options: ['Jamban dengan septic tank', 'Jamban langsung ke selokan', 'Buang air di sungai/kebun'] },
        { key: 'kebersihanRumah', label: '66. Kondisi kebersihan lingkungan rumah', type: 'select', options: ['Bersih dan terawat', 'Cukup bersih', 'Kurang bersih'] },
        { key: 'cuciTangan', label: '67. Kebiasaan cuci tangan sebelum memberi makan?', type: 'select', options: ['Selalu', 'Sering', 'Kadang-kadang', 'Tidak Pernah'] },
      ]
    },
    {
      title: "Akses, Psikologi & Ekonomi",
      questions: [
        { key: 'aksesFaskes', label: '68. Akses ke fasilitas kesehatan', type: 'select', options: ['Mudah (< 20 menit)', 'Sulit (> 30 menit)', 'Tidak ada akses'] },
        { key: 'rutinPosyandu', label: '69. Seberapa sering ke Posyandu?', type: 'select', options: ['Rutin setiap bulan', 'Tidak rutin', 'Jarang', 'Tidak pernah'] },
        { key: 'babyBlues', label: '71. Apakah pernah merasa sedih berlebihan pasca melahirkan (Baby Blues)?', fullWidth: true, type: 'yesno', helper: '(Kondisi ini sering disebut "baby blues" atau perasaan sedih setelah melahirkan)' },
        { key: 'depresi', label: '72. Apakah sering merasa sedih/hilang semangat belakangan ini?', fullWidth: true, type: 'yesno', helper: 'Dalam beberapa bulan terakhir, apakah Ibu sering merasa sedih berkepanjangan, kehilangan semangat, atau sulit tidur karena banyak pikiran?' },
        { key: 'pendidikanIbu', label: '73. Pendidikan terakhir Ibu', type: 'select', options: ['SD/sederajat', 'SMP/sederajat', 'SMA/sederajat', 'Diploma (D1-D3)', 'S1', 'S2 ke atas'] },
        { key: 'pendidikanAyah', label: '74. Pendidikan terakhir Ayah', type: 'select', options: ['SD/sederajat', 'SMP/sederajat', 'SMA/sederajat', 'Diploma (D1-D3)', 'S1', 'S2 ke atas'] },
        { key: 'pernahPenyuluhan', label: '75. Pernah dapat penyuluhan gizi?', type: 'yesno' },
        { key: 'frekPenyuluhan', label: '76. Seberapa sering ikut penyuluhan?', type: 'select', options: ['Setahun sekali', 'Setahun > sekali', 'Jarang', 'Belum pernah'] },
        { key: 'pahamGizi', label: '77. Apakah paham tentang makanan sehat balita?', type: 'select', options: ['Tidak paham', 'Kurang paham', 'Cukup paham', 'Paham'], helper: 'Apakah Ibu merasa paham tentang makanan sehat untuk balita (porsi, variasi, dan frekuensi makan)?' },
        { key: 'pekerjaanAyah', label: '78. Pekerjaan utama kepala keluarga', type: 'text' },
        { key: 'jumlahAnggota', label: '79. Jumlah anggota rumah tangga', type: 'number', helper: '(Contoh: 3 jika terdiri dari ayah, ibu, dan balita)' },
        { key: 'pendapatan', label: '80. Pendapatan bulanan keluarga', type: 'select', options: ['Kurang dari Rp1.000.000', 'Rp1.000.000 - Rp2.999.999', 'Rp3.000.000 - Rp4.999.999', 'Rp5.000.000 ke atas'] },
        { key: 'jarakPasar', label: '81. Waktu tempuh ke pasar/penjual makanan sehat', type: 'select', options: ['Kurang dari 10 menit', '10-30 menit', 'Lebih dari 30 menit'] },
        { key: 'pantangan', label: '82. Apakah ada makanan yang dipantang/dilarang?', fullWidth: true, type: 'yesno', helper: '(Misalnya: tidak boleh makan ikan, telur, daging, atau makanan tertentu karena alasan adat atau kepercayaan)' },
        { key: 'pengambilKeputusan', label: '83. Siapa penentu makanan anak?', type: 'select', options: ['Ibu', 'Ayah', 'Nenek/Kakek', 'Bersama (Ibu & Ayah)'] },
      ]
    }
  ], []);

  const initialState = useMemo(() => {
    const state = {};
    formStructure.forEach(section => {
      section.questions.forEach(q => {
        state[q.key] = q.type === 'multiselect' ? [] : '';
      });
    });
    return state;
  }, [formStructure]);

  const [formData, setFormData] = useState(initialState);

  // Auto-restore progress from database (Works across devices/VPS deployments)
  React.useEffect(() => {
    const fetchHistory = async () => {
      try {
        const udStr = localStorage.getItem('user');
        if (!udStr) return;
        const ud = JSON.parse(udStr);

        const res = await fetch('http://localhost:3000/api/survey/me', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('growell_token') || ''}` }
        });

        if (res.ok) {
          const d = await res.json();
          if (d.has_survey && d.survey) {
            setFormData(prev => ({ ...prev, ...d.survey }));
            return;
          }
        }

        // Fallback: No survey in DB, pre-fill parent name
        setFormData(prev => ({ ...prev, namaOrangTua: ud.nama }));
      } catch (e) { console.warn('Network error fetching history', e); }
    };
    fetchHistory();
  }, []);

  const dummyData = useMemo(() => ({
    namaKecamatan: 'Karanganyar',
    namaPosyandu: 'Posyandu Mawar',
    namaOrangTua: 'Siti Aminah',
    namaBalita: 'Alya Putri',
    namaKelurahan: 'Sukamaju',
    tanggalLahirBalita: '2023-06-15',
    bbLahirRendah: 'Tidak',
    prematur: 'Tidak',
    imd: 'Ya',
    komplikasiLahir: 'Tidak',
    detailKomplikasi: '',
    tinggiIbu: '160',
    beratIbu: '55',
    tinggiAyah: '170',
    beratAyah: '68',
    statusGiziIbuHamil: 'Normal',
    anemia: 'Tidak',
    hamilDiBawah20: 'Tidak',
    jarakKelahiran: 'Anak pertama',
    tekananDarahTinggi: 'Tidak',
    gulaDarahTinggi: 'Tidak',
    infeksiHamil: 'Tidak',
    rutinSuplemen: 'Rutin setiap hari',
    hamilLagi: 'Tidak',
    frekuensiSuplemen: '7',
    jenisSuplemen: ['Tablet tambah darah (zat besi)', 'Asam folat'],
    ttd90: 'Ya',
    asiEksklusif: 'Ya',
    usiaMpasi: '6',
    mpasiHewani: 'Ya, setiap hari',
    frekuensiMakan: '3 kali sehari',
    susuLain: 'Tidak',
    frekuensiSusu: '',
    vitaminA: 'Agustus 2025',
    tabletBesiAnak: 'Ya',
    obatCacing: 'Ya',
    intervensiGizi: 'Tidak',
    jenisIntervensi: [],
    vaksin: ['BCG', 'Polio Tetes 1', 'DPT-HB-Hib 1'],
    sakit2Minggu: 'Tidak',
    jenisPenyakit: ['Tidak sakit'],
    penyakitBawaan: 'Tidak',
    rawatInap: 'Tidak',
    asiKemarin: 'Ya',
    makanPokok: 'Ya',
    makanKacang: 'Ya',
    produkSusu: 'Ya',
    susuMurni: 'Tidak',
    proteinHewani: 'Ya',
    telur: 'Ya',
    sayurVitA: 'Ya',
    sayurLain: 'Ya',
    makananManis: 'Kadang-kadang',
    bantuanGizi: 'Tidak',
    jamTidur: '10',
    aktivitasLuar: '1-3 jam',
    tipeAnak: 'Cukup aktif',
    ibuBekerja: 'Tidak',
    pengetahuanGizi: 'Cukup',
    polaAsuh: 'Responsive feeding',
    bpjs: 'Ya',
    perokok: 'Tidak',
    sumberAir: 'PDAM',
    kualitasAir: 'Diolah/dimasak',
    sanitasi: 'Jamban dengan septic tank',
    kebersihanRumah: 'Bersih dan terawat',
    cuciTangan: 'Selalu',
    aksesFaskes: 'Mudah (< 20 menit)',
    rutinPosyandu: 'Rutin setiap bulan',
    babyBlues: 'Tidak',
    depresi: 'Tidak',
    pendidikanIbu: 'SMA/sederajat',
    pendidikanAyah: 'SMA/sederajat',
    pernahPenyuluhan: 'Ya',
    frekPenyuluhan: 'Setahun sekali',
    pahamGizi: 'Cukup paham',
    pekerjaanAyah: 'Karyawan Swasta',
    jumlahAnggota: '3',
    pendapatan: 'Rp3.000.000 - Rp4.999.999',
    jarakPasar: '10-30 menit',
    pantangan: 'Tidak',
    pengambilKeputusan: 'Bersama (Ibu & Ayah)'
  }), []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const toggleMultiSelect = (key, option) => {
    setFormData((prev) => {
      const current = Array.isArray(prev[key]) ? prev[key] : [];
      const exists = current.includes(option);
      return {
        ...prev,
        [key]: exists ? current.filter((item) => item !== option) : [...current, option]
      };
    });
  };

  const handleReset = () => {
    setFormData(initialState);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async () => {
    try {
      if (!formData.namaBalita || !formData.tanggalLahirBalita) {
        alert('Nama balita dan tanggal lahir wajib diisi.');
        return;
      }

      // Remove local storage save entirely since backend takes over
      const dataToSave = { ...formData };
      
      // Hit Backend History if possible
      try {
        await fetch('http://localhost:3000/api/survey', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('growell_token') || ''}`
          },
          body: JSON.stringify({ data: dataToSave })
        });
      } catch (e) { console.log('Backend history save error'); }

      setIsComplete(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      alert(err.message);
    }
  };

  // handleFillDummy removed — replaced with Kode Hubung system

  const renderInput = (q) => {
    let inputComponent;

    if (q.type === 'date') {
      inputComponent = (
        <CustomDatePicker
          name={q.key}
          value={formData[q.key]}
          onChange={handleChange}
          placeholder="Pilih tanggal"
        />
      );
    } else if (q.type === 'yesno') {
      inputComponent = (
        <CustomDropdown
          name={q.key}
          value={formData[q.key]}
          onChange={handleChange}
          placeholder="Pilih jawaban"
          options={[
            { value: 'Ya', label: 'Ya' },
            { value: 'Tidak', label: 'Tidak' }
          ]}
        />
      );
    } else if (q.type === 'select') {
      inputComponent = (
        <CustomDropdown
          name={q.key}
          value={formData[q.key]}
          onChange={handleChange}
          placeholder="Pilih jawaban"
          options={q.options.map((opt) => ({ value: opt, label: opt }))}
        />
      );
    } else if (q.type === 'multiselect') {
      const selected = Array.isArray(formData[q.key]) ? formData[q.key] : [];
      inputComponent = (
        <div className="space-y-2 mt-2">
          {q.options.map((opt) => (
            <label key={opt} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50 p-2 rounded transition">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                checked={selected.includes(opt)}
                onChange={() => toggleMultiSelect(q.key, opt)}
              />
              <span>{opt}</span>
            </label>
          ))}
        </div>
      );
    } else {
      inputComponent = (
        <input
          type={q.type === 'number' ? 'number' : 'text'}
          step={q.type === 'number' ? '0.1' : undefined}
          name={q.key}
          value={formData[q.key]}
          onChange={handleChange}
          className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none transition-all shadow-sm hover:border-gray-300 hover:shadow-md text-gray-900 placeholder:text-gray-400"
          placeholder={q.placeholder || "Tulis jawaban..."}
        />
      );
    }

    // Menggunakan col-span-2 jika prop fullWidth true, jika tidak col-span-1
    const gridClass = q.fullWidth ? 'sm:col-span-2' : '';

    return (
      <div className={`mb-4 ${gridClass}`}>
        <label className="block text-sm font-semibold text-gray-800 mb-2 leading-relaxed">
            {q.label}
        </label>
        {inputComponent}
        {q.helper && (
          <p className="text-xs text-gray-500 mt-2 italic bg-yellow-50 p-2 rounded border border-yellow-100 flex gap-2 items-start">
            <span>ℹ️</span>
            <span>{q.helper}</span>
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white font-sans">
      <header className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 sm:h-20">
            <Link to="/" className="flex items-center space-x-3 sm:space-x-4 hover:opacity-80 transition-opacity">
              <img
                src={growellLogo}
                alt="Growell Logo"
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover"
              />
              <div>
                <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-cyan-500 to-blue-600 bg-clip-text text-transparent">
                  Growell Orang Tua
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">Kuesioner Pendataan Gizi Balita</p>
              </div>
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <Breadcrumb items={[{ label: 'Kuesioner Orang Tua', path: '/orang-tua' }]} />
      </div>

      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-10 mt-6">
          
          <div className="mb-8 text-center sm:text-left border-b pb-6">
            <h2 className="text-2xl font-bold text-gray-900">Formulir Data Gizi & Kesehatan</h2>
            <p className="text-gray-500 mt-2">
              Mohon isi data dengan jujur sesuai kondisi sebenarnya untuk keperluan penelitian.
            </p>
          </div>

          <div className="space-y-10">
            {formStructure.map((section, idx) => (
              <div key={idx} className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100">
                <h3 className="text-lg font-bold text-cyan-700 mb-6 uppercase tracking-wide border-b border-cyan-100 pb-2">
                  {section.title}
                </h3>
                {/* Grid Container 2 Kolom */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                  {section.questions.map((q) => {
                    // Render Logic dipindah kesini agar wrapper grid bekerja
                     let inputComponent;

                    if (q.type === 'date') {
                      inputComponent = (
                        <CustomDatePicker
                          name={q.key}
                          value={formData[q.key]}
                          onChange={handleChange}
                          placeholder="Pilih tanggal"
                        />
                      );
                    } else if (q.type === 'yesno') {
                      inputComponent = (
                        <CustomDropdown
                          name={q.key}
                          value={formData[q.key]}
                          onChange={handleChange}
                          placeholder="Pilih jawaban"
                          options={[
                            { value: 'Ya', label: 'Ya' },
                            { value: 'Tidak', label: 'Tidak' }
                          ]}
                        />
                      );
                    } else if (q.type === 'select') {
                      inputComponent = (
                        <CustomDropdown
                          name={q.key}
                          value={formData[q.key]}
                          onChange={handleChange}
                          placeholder="Pilih jawaban"
                          options={q.options.map((opt) => ({ value: opt, label: opt }))}
                        />
                      );
                    } else if (q.type === 'multiselect') {
                      const selected = Array.isArray(formData[q.key]) ? formData[q.key] : [];
                      inputComponent = (
                        <div className="space-y-2 mt-2 bg-white p-3 rounded border border-gray-200">
                          {q.options.map((opt) => (
                            <label key={opt} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50 p-1 rounded transition">
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                                checked={selected.includes(opt)}
                                onChange={() => toggleMultiSelect(q.key, opt)}
                              />
                              <span className="leading-snug">{opt}</span>
                            </label>
                          ))}
                        </div>
                      );
                    } else {
                      inputComponent = (
                        <input
                          type={q.type === 'number' ? 'number' : 'text'}
                          step={q.type === 'number' ? '0.1' : undefined}
                          name={q.key}
                          value={formData[q.key]}
                          onChange={handleChange}
                          className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none transition-all shadow-sm hover:border-gray-300 hover:shadow-md text-gray-900 placeholder:text-gray-400"
                          placeholder={q.placeholder || "Tulis jawaban..."}
                        />
                      );
                    }

                    return (
                        <div key={q.key} className={`${q.fullWidth ? 'sm:col-span-2' : 'sm:col-span-1'} flex flex-col`}>
                            <label className="block text-sm font-semibold text-gray-800 mb-2 leading-relaxed">
                                {q.label}
                            </label>
                            {inputComponent}
                            {q.helper && (
                            <p className="text-xs text-gray-500 mt-2 italic bg-yellow-50 p-2 rounded border border-yellow-100 flex gap-2 items-start">
                                <span className="text-yellow-600">ℹ️</span>
                                <span className="leading-relaxed">{q.helper}</span>
                            </p>
                            )}
                        </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-10 mt-8 border-t">
            <button
              onClick={handleSubmit}
              className="flex-1 px-8 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl font-bold hover:shadow-lg hover:scale-[1.01] transition-all flex items-center justify-center gap-3"
            >
              <Save size={22} />
              Simpan & Kirim
            </button>
            <button
              onClick={handleReset}
              className="px-8 py-4 border-2 border-gray-300 text-gray-600 rounded-xl font-bold hover:border-red-400 hover:text-red-500 hover:bg-red-50 transition-all flex items-center justify-center gap-3"
            >
              <RefreshCw size={22} />
              Reset
            </button>
          </div>

        </div>
      </section>
    </div>
  );
}