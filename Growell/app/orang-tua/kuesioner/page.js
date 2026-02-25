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

  // ─── Form Structure ─────────────────────────────────
  const formStructure = useMemo(() => [
    {
      title: "Identitas & Lokasi", icon: "1", color: "cyan",
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
      title: "Riwayat Kelahiran", icon: "2", color: "emerald",
      questions: [
        { key: 'bbLahirRendah', label: '8. Berat lahir balita kurang dari 2.5 kg?', type: 'yesno' },
        { key: 'prematur', label: '9. Balita lahir prematur (kurang dari 9 bulan)?', type: 'yesno' },
        { key: 'imd', label: '10. Bayi langsung disusui dalam 1 jam pertama (IMD)?', type: 'yesno', helper: 'Inisiasi Menyusui Dini' },
        { key: 'komplikasiLahir', label: '11. Saat lahir terdapat komplikasi atau penyakit serius?', type: 'yesno' },
        { key: 'detailKomplikasi', label: '12. Jika ya, komplikasi apa yang diderita?', type: 'text' },
      ]
    },
    {
      title: "Kesehatan Orang Tua", icon: "3", color: "violet",
      questions: [
        { key: 'tinggiIbu', label: '13. Tinggi badan ibu (cm)', type: 'number', placeholder: '160' },
        { key: 'beratIbu', label: '14. Berat badan ibu (kg)', type: 'number', placeholder: '60' },
        { key: 'tinggiAyah', label: '15. Tinggi badan ayah (cm)', type: 'number', placeholder: '170' },
        { key: 'beratAyah', label: '16. Berat badan ayah (kg)', type: 'number', placeholder: '70' },
        { key: 'statusGiziIbuHamil', label: '17. Status gizi ibu saat hamil', type: 'select', options: ['Normal', 'Kurang Energi Kronis (KEK) (LILA < 23.5 cm)'] },
        { key: 'anemia', label: '18. Ibu pernah didiagnosis anemia?', type: 'yesno' },
        { key: 'hamilDiBawah20', label: '19. Ibu hamil saat usia di bawah 20 tahun?', type: 'yesno' },
        { key: 'jarakKelahiran', label: '20. Jarak kelahiran anak ini dengan kakak/adiknya?', type: 'select', options: ['Kurang dari 2 Tahun', '2-3 Tahun', 'Lebih dari 3 Tahun', 'Anak pertama'] },
        { key: 'tekananDarahTinggi', label: '21. Ibu tekanan darah tinggi saat hamil?', type: 'yesno' },
        { key: 'gulaDarahTinggi', label: '22. Ibu gula darah tinggi saat hamil?', type: 'yesno' },
        { key: 'infeksiHamil', label: '23. Selama hamil mengalami infeksi serius?', type: 'yesno' },
      ]
    },
    {
      title: "Suplemen & Kehamilan", icon: "4", color: "amber",
      questions: [
        { key: 'rutinSuplemen', label: '24. Ibu rutin mengonsumsi suplemen saat hamil?', type: 'select', options: ['Rutin setiap hari', 'Kadang-kadang', 'Tidak pernah'] },
        { key: 'hamilLagi', label: '25. Ibu sedang hamil kembali saat ini?', type: 'yesno' },
        { key: 'frekuensiSuplemen', label: '26. Frekuensi suplemen mingguan?', type: 'number' },
        { key: 'jenisSuplemen', label: '27. Suplemen yang dikonsumsi?', type: 'multiselect', options: ['Tablet tambah darah (zat besi)', 'Vitamin C', 'Vitamin D', 'Asam folat', 'Kalsium', 'Susu ibu hamil', 'Lainnya'] },
        { key: 'ttd90', label: '28. TTD minimal 90 tablet?', type: 'yesno' },
      ]
    },
    {
      title: "ASI & MP-ASI", icon: "5", color: "pink",
      questions: [
        { key: 'asiEksklusif', label: '29. ASI eksklusif 6 bulan?', type: 'yesno' },
        { key: 'usiaMpasi', label: '30. Usia mulai MP-ASI (bulan)', type: 'number' },
        { key: 'mpasiHewani', label: '31. MP-ASI mengandung bahan hewani?', type: 'select', options: ['Ya, setiap hari', 'Ya, namun tidak rutin', 'Tidak pernah'] },
        { key: 'frekuensiMakan', label: '32. Frekuensi makan utama per hari?', type: 'select', options: ['1 kali sehari', '2 kali sehari', '3 kali sehari', '4 kali sehari atau lebih'] },
        { key: 'susuLain', label: '33. Minum susu selain ASI?', type: 'yesno' },
        { key: 'frekuensiSusu', label: '34. Jika ya, berapa kali per hari?', type: 'number' },
      ]
    },
    {
      title: "Suplemen & Intervensi Balita", icon: "6", color: "teal",
      questions: [
        { key: 'vitaminA', label: '35. Terakhir vitamin A?', type: 'text', placeholder: 'Bulan/Tahun' },
        { key: 'tabletBesiAnak', label: '36. Tablet zat besi rutin?', type: 'select', options: ['Ya', 'Jarang', 'Tidak'] },
        { key: 'obatCacing', label: '37. Pernah obat cacing?', type: 'yesno' },
        { key: 'intervensiGizi', label: '38. Pernah intervensi gizi?', type: 'yesno' },
        { key: 'jenisIntervensi', label: '39. Jenis intervensi?', type: 'multiselect', options: ['Pemberian Makanan Tambahan', 'Makanan padat gizi (RUTF)', 'Edukasi gizi', 'Rujukan ke puskesmas/RS', 'Lainnya'] },
      ]
    },
    {
      title: "Kesehatan & Vaksinasi", icon: "7", color: "blue",
      questions: [
        { key: 'vaksin', label: '40. Vaksin yang sudah diterima?', fullWidth: true, type: 'multiselect', options: ['Hepatitis B (<24 Jam)', 'BCG', 'Polio Tetes 1', 'DPT-HB-Hib 1', 'Polio Tetes 2', 'Rota Virus (RV) 1', 'PCV 1', 'DPT-HB-Hib 2', 'Polio Tetes 3', 'Rota Virus (RV) 2', 'PCV 2', 'DPT-HB-Hib 3', 'Polio Tetes 4', 'Polio Suntik (IPV) 1', 'Rota Virus (RV) 3', 'Campak - Rubella (MR)', 'Polio Suntik (IPV) 2', 'Japanese Encephalitis (JE)', 'PCV 3', 'DPT-HB-Hib Lanjutan', 'Campak - Rubella (MR) Lanjutan'] },
        { key: 'sakit2Minggu', label: '41. Sakit dalam 2 minggu terakhir?', type: 'yesno' },
        { key: 'jenisPenyakit', label: '42. Jika ya, penyakit apa?', type: 'multiselect', options: ['Tidak sakit', 'Diare', 'ISPA', 'Demam/Malaria', 'Cacingan', 'Lainnya'] },
        { key: 'penyakitBawaan', label: '70. Penyakit bawaan saat lahir?', type: 'yesno' },
        { key: 'rawatInap', label: '54. Pernah rawat inap?', type: 'yesno' },
      ]
    },
    {
      title: "Konsumsi Makan (Kemarin)", icon: "8", color: "orange",
      questions: [
        { key: 'asiKemarin', label: '43. Mengonsumsi ASI kemarin?', type: 'yesno' },
        { key: 'makanPokok', label: '44. Makan makanan pokok?', type: 'yesno' },
        { key: 'makanKacang', label: '45. Makan kacang-kacangan?', type: 'yesno' },
        { key: 'produkSusu', label: '46. Makan olahan susu?', type: 'yesno' },
        { key: 'susuMurni', label: '47. Minum susu murni 100%?', fullWidth: true, type: 'yesno' },
        { key: 'proteinHewani', label: '48. Makan daging/ayam/ikan/jeroan?', type: 'yesno' },
        { key: 'telur', label: '49. Makan telur?', type: 'yesno' },
        { key: 'sayurVitA', label: '50. Makan sayur/buah kaya Vit A?', type: 'yesno' },
        { key: 'sayurLain', label: '51. Makan sayur/buah lainnya?', type: 'yesno' },
        { key: 'makananManis', label: '52. Konsumsi manis berlebihan?', type: 'select', options: ['Ya, sering', 'Kadang-kadang', 'Tidak'] },
        { key: 'bantuanGizi', label: '53. Pernah dapat bantuan makanan?', fullWidth: true, type: 'yesno' },
      ]
    },
    {
      title: "Pola Hidup & Lingkungan", icon: "9", color: "green",
      questions: [
        { key: 'jamTidur', label: '55. Rata-rata jam tidur per hari', type: 'number' },
        { key: 'aktivitasLuar', label: '56. Lama aktivitas luar ruangan?', type: 'select', options: ['Kurang dari 1 jam', '1-3 jam', 'Lebih dari 3 jam'] },
        { key: 'tipeAnak', label: '57. Tingkat aktivitas anak?', type: 'select', options: ['Sangat aktif', 'Cukup aktif', 'Cenderung diam'] },
        { key: 'ibuBekerja', label: '58. Apakah ibu bekerja?', type: 'yesno' },
        { key: 'pengetahuanGizi', label: '59. Pengetahuan gizi ibu?', type: 'select', options: ['Baik', 'Cukup', 'Kurang'] },
        { key: 'polaAsuh', label: '60. Pola asuh makan balita?', type: 'select', options: ['Responsive feeding', 'Pemaksaan makan', 'Dibiarkan makan sendiri'] },
        { key: 'bpjs', label: '61. Punya BPJS?', type: 'yesno' },
        { key: 'perokok', label: '62. Ada perokok di rumah?', type: 'yesno' },
        { key: 'sumberAir', label: '63. Sumber air minum utama?', type: 'select', options: ['PDAM', 'Sumur', 'Air Isi Ulang/Galon', 'Lainnya'] },
        { key: 'kualitasAir', label: '64. Kualitas air minum?', type: 'select', options: ['Diolah/dimasak', 'Bersih tanpa pengolahan (Galon)', 'Air tercemar/tidak layak'] },
        { key: 'sanitasi', label: '65. Jenis sanitasi keluarga?', fullWidth: true, type: 'select', options: ['Jamban dengan septic tank', 'Jamban langsung ke selokan', 'Buang air di sungai/kebun'] },
        { key: 'kebersihanRumah', label: '66. Kondisi kebersihan rumah?', type: 'select', options: ['Bersih dan terawat', 'Cukup bersih', 'Kurang bersih'] },
        { key: 'cuciTangan', label: '67. Kebiasaan cuci tangan?', type: 'select', options: ['Selalu', 'Sering', 'Kadang-kadang', 'Tidak Pernah'] },
      ]
    },
    {
      title: "Akses, Psikologi & Ekonomi", icon: "10", color: "indigo",
      questions: [
        { key: 'aksesFaskes', label: '68. Akses ke faskes?', type: 'select', options: ['Mudah (< 20 menit)', 'Sulit (> 30 menit)', 'Tidak ada akses'] },
        { key: 'rutinPosyandu', label: '69. Seberapa sering ke Posyandu?', type: 'select', options: ['Rutin setiap bulan', 'Tidak rutin', 'Jarang', 'Tidak pernah'] },
        { key: 'babyBlues', label: '71. Pernah sedih berlebihan pasca melahirkan?', fullWidth: true, type: 'yesno' },
        { key: 'depresi', label: '72. Sering sedih/hilang semangat belakangan ini?', fullWidth: true, type: 'yesno' },
        { key: 'pendidikanIbu', label: '73. Pendidikan terakhir Ibu?', type: 'select', options: ['SD/sederajat', 'SMP/sederajat', 'SMA/sederajat', 'Diploma (D1-D3)', 'S1', 'S2 ke atas'] },
        { key: 'pendidikanAyah', label: '74. Pendidikan terakhir Ayah?', type: 'select', options: ['SD/sederajat', 'SMP/sederajat', 'SMA/sederajat', 'Diploma (D1-D3)', 'S1', 'S2 ke atas'] },
        { key: 'pernahPenyuluhan', label: '75. Pernah dapat penyuluhan gizi?', type: 'yesno' },
        { key: 'frekPenyuluhan', label: '76. Frekuensi penyuluhan?', type: 'select', options: ['Setahun sekali', 'Setahun > sekali', 'Jarang', 'Belum pernah'] },
        { key: 'pahamGizi', label: '77. Paham makanan sehat balita?', type: 'select', options: ['Tidak paham', 'Kurang paham', 'Cukup paham', 'Paham'] },
        { key: 'pekerjaanAyah', label: '78. Pekerjaan utama kepala keluarga?', type: 'text' },
        { key: 'jumlahAnggota', label: '79. Jumlah anggota rumah tangga?', type: 'number' },
        { key: 'pendapatan', label: '80. Pendapatan bulanan keluarga?', type: 'select', options: ['Kurang dari Rp1.000.000', 'Rp1.000.000 - Rp2.999.999', 'Rp3.000.000 - Rp4.999.999', 'Rp5.000.000 ke atas'] },
        { key: 'jarakPasar', label: '81. Waktu tempuh ke pasar?', type: 'select', options: ['Kurang dari 10 menit', '10-30 menit', 'Lebih dari 30 menit'] },
        { key: 'pantangan', label: '82. Ada pantangan makanan?', fullWidth: true, type: 'yesno' },
        { key: 'pengambilKeputusan', label: '83. Siapa penentu makanan anak?', type: 'select', options: ['Ibu', 'Ayah', 'Nenek/Kakek', 'Bersama (Ibu & Ayah)'] },
      ]
    }
  ], []);

  const initialState = useMemo(() => {
    const state = {};
    formStructure.forEach(s => s.questions.forEach(q => { state[q.key] = q.type === 'multiselect' ? [] : ''; }));
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
          headers: { 'Authorization': `Bearer ${localStorage.getItem('growell_token')}` }
        });
        
        if (res.ok) {
          const d = await res.json();
          if (d.has_survey && d.survey) {
            setFormData(prev => ({ ...prev, ...d.survey }));
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

  const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const toggleMultiSelect = (key, option) => {
    setFormData(prev => {
      const c = Array.isArray(prev[key]) ? prev[key] : [];
      return { ...prev, [key]: c.includes(option) ? c.filter(i => i !== option) : [...c, option] };
    });
  };
  const handleReset = () => { setFormData(initialState); setIsComplete(false); setActiveSection(0); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  // ─── Submit ─────────────────────────
  const handleSubmit = async () => {
    setSubmitError('');
    setIsSubmitting(true);

    try {
      if (!formData.namaBalita || !formData.tanggalLahirBalita) {
        throw new Error('Nama balita dan tanggal lahir wajib diisi.');
      }

      // Send to Backend database for history tracking (safe across device/VPS)
      const dataToSave = { ...formData };

      // Push to backend for History / Laporan Tumbuh Kembang 
      // (This creates a new row safely keeping past histories)
      const res = await fetch('/api/survey', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('growell_token')}`
        },
        body: JSON.stringify({ data: dataToSave })
      });

      if (!res.ok) {
        const d = await res.json();
        console.warn('Backend history save error:', d);
      }

      setIsComplete(true);
      toast.success('Data Berhasil Disimpan!', 'Data kesehatan anak telah tercatat dan dapat ditarik oleh kader.', 7000);
    } catch (err) {
      setSubmitError(err.message);
      toast.error('Gagal Menyimpan', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = "w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-gray-900 focus:bg-white focus:ring-2 focus:ring-gray-900/5 outline-none transition-all text-sm text-gray-900 placeholder:text-gray-400";

  // Progress
  const totalQuestions = formStructure.reduce((sum, s) => sum + s.questions.length, 0);
  const answeredQuestions = formStructure.reduce((sum, s) => {
    return sum + s.questions.filter(q => {
      const v = formData[q.key];
      return v !== '' && v !== null && v !== undefined && !(Array.isArray(v) && v.length === 0);
    }).length;
  }, 0);
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

        {/* ─── Info Banner ─── */}
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-3.5 flex items-start gap-3">
          <Info size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-blue-700 leading-relaxed">
            <strong>Penting:</strong> Pastikan nama lengkap anak dan orang tua ditulis sama persis dengan yang dicatat oleh kader di Posyandu, agar data Anda tercocokan secara otomatis.
          </div>
        </div>

        {/* ─── Completion State ─── */}
        {isComplete ? (
          <div className="bg-white rounded-2xl border border-emerald-200 p-8 sm:p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 size={32} className="text-emerald-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Formulir Berhasil Dikirim!</h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto mb-6">
              Terima kasih telah mengisi formulir. Data Anda akan dicocokan otomatis berdasarkan nama anak dengan data dari kader untuk menghasilkan prediksi status gizi.
            </p>
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
                  onClick={() => setActiveSection(idx)}
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
                </button>
              ))}
            </div>

            {/* ─── Active Section ─── */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-8">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
                <div>
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Bagian {activeSection + 1} dari {formStructure.length}</p>
                  <h3 className="text-lg font-bold text-gray-900">{formStructure[activeSection].title}</h3>
                </div>
                <span className="text-xs text-gray-400 font-medium">{formStructure[activeSection].questions.length} pertanyaan</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                {formStructure[activeSection].questions.map((q) => {
                  let input;
                  if (q.type === 'date') {
                    input = <CustomDatePicker name={q.key} value={formData[q.key]} onChange={handleChange} placeholder="Pilih tanggal" defaultYear={new Date().getFullYear() - 2} />;
                  } else if (q.type === 'yesno') {
                    input = <CustomDropdown name={q.key} value={formData[q.key]} onChange={handleChange} placeholder="Pilih jawaban" options={[{ value: 'Ya', label: 'Ya' }, { value: 'Tidak', label: 'Tidak' }]} />;
                  } else if (q.type === 'select') {
                    input = <CustomDropdown name={q.key} value={formData[q.key]} onChange={handleChange} placeholder="Pilih jawaban" options={q.options.map(o => ({ value: o, label: o }))} />;
                  } else if (q.type === 'multiselect') {
                    const sel = Array.isArray(formData[q.key]) ? formData[q.key] : [];
                    input = (
                      <div className="space-y-1 mt-1 bg-gray-50 p-3 rounded-xl border border-gray-200 max-h-48 overflow-y-auto">
                        {q.options.map(opt => (
                          <label key={opt} className="flex items-center gap-2.5 text-sm text-gray-700 cursor-pointer hover:bg-white p-2 rounded-lg transition-colors">
                            <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900" checked={sel.includes(opt)} onChange={() => toggleMultiSelect(q.key, opt)} />
                            <span className="leading-snug">{opt}</span>
                          </label>
                        ))}
                      </div>
                    );
                  } else {
                    input = <input type={q.type === 'number' ? 'number' : 'text'} step={q.type === 'number' ? '0.1' : undefined} name={q.key} value={formData[q.key]} onChange={handleChange} className={inputClass} placeholder={q.placeholder || "Tulis jawaban..."} />;
                  }

                  return (
                    <div key={q.key} className={q.fullWidth ? 'sm:col-span-2' : ''}>
                      <label className="block text-sm font-medium text-gray-700 mb-2 leading-relaxed">{q.label}</label>
                      {input}
                      {q.helper && <p className="text-xs text-gray-400 mt-1.5 italic">{q.helper}</p>}
                    </div>
                  );
                })}
              </div>

              {submitError && (
                <div className="mt-4 bg-red-50 border border-red-200 text-red-600 rounded-xl p-4 text-sm font-medium flex items-start gap-2">
                  <AlertCircle size={16} className="mt-0.5 flex-shrink-0" /> {submitError}
                </div>
              )}

              {/* Navigation */}
              <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
                <button
                  onClick={() => { setActiveSection(Math.max(0, activeSection - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  disabled={activeSection === 0}
                  className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Sebelumnya
                </button>
                {activeSection < formStructure.length - 1 ? (
                  <button
                    onClick={() => { setActiveSection(activeSection + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className="px-5 py-2.5 text-sm font-medium text-white bg-gray-900 rounded-xl hover:bg-gray-800 transition-colors flex items-center gap-1.5"
                  >
                    Selanjutnya <ChevronRight size={14} />
                  </button>
                ) : (
                  <div className="flex gap-3">
                    <button onClick={handleReset} className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors flex items-center gap-2">
                      <RefreshCw size={14} /> Reset
                    </button>
                    <button onClick={handleSubmit} disabled={isSubmitting}
                      className="px-6 py-2.5 text-sm font-medium text-white bg-gray-900 rounded-xl hover:bg-gray-800 transition-colors flex items-center gap-2 disabled:opacity-50">
                      {isSubmitting ? <><Loader2 size={14} className="animate-spin" /> Menyimpan...</> : <><Save size={14} /> Simpan & Kirim</>}
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
