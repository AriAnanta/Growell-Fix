import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Save, RefreshCw, AlertCircle, CheckCircle2, TrendingUp, Users, Calendar, Search, Plus, FileText, BarChart3, ChevronDown, LogOut, Link2, Copy, Check, Settings2, Loader2, ClipboardList, Sparkles, Clock } from 'lucide-react';
import growellLogo from '../assets/Growell (1).png';
import Breadcrumb from '../components/common/Breadcrumb';
import CustomDatePicker from '../components/forms/CustomDatePicker';
import CustomDropdown from '../components/forms/CustomDropdown';
import { clearAuth, getUserData, apiFetch } from '../utils/auth';
import SuccessModal from '../components/common/SuccessModal';



export default function KaderDashboard() {
  const navigate = useNavigate();
  // Mode prediksi: 'predict' (kader saja) atau 'predict-ta' (kader + orang tua)
  const [API_Dipakai, setAPI_Dipakai] = useState('predict-ta');
  const [pendingQueue, setPendingQueue] = useState(() => {
    try { return JSON.parse(localStorage.getItem('kader_pending_queue') || '[]'); } catch { return []; }
  });
  const [activeTab, setActiveTab] = useState('input');
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const profileDropdownRef = useRef(null);
  const resultSectionRef = useRef(null);
  const [formData, setFormData] = useState({
    namaKelurahan: '',
    namaPosyandu: '',
    namaBalita: '',
    namaIbu: '',
    tanggalPengukuran: '',
    tanggalLahir: '',
    jenisKelamin: '',
    usiaBulan: '',
    beratBadan: '',
    tinggiBadan: '',
    lingkarKepala: '',
    lila: '',
    kondisiBeratBadan: '',
    usiaKehamilan: '',
    beratLahir: '',
    tinggiLahir: '',
    rekomendasiGizi: ''
  });
  const [predictionResult, setPredictionResult] = useState(null);
  const [isPredicting, setIsPredicting] = useState(false);
  const [predictError, setPredictError] = useState('');
  const [recentData, setRecentData] = useState([]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [dashStats, setDashStats] = useState({ total_balita: 0, normal: 0, risiko: 0, bulan_ini: 0 });
  const [searchRecent, setSearchRecent] = useState('');
  const [rekomendasiResult, setRekomendasiResult] = useState(null);

  // Fetch dashboard stats from DB
  const fetchDashboardStats = async () => {
    try {
      const res = await apiFetch('/api/pengukuran/stats/dashboard');
      if (res.ok) {
        const data = await res.json();
        const thisMonth = new Date().toISOString().substring(0, 7);
        const bulanIni = data.monthlyMeasurements?.find(m => m.bulan === thisMonth)?.jumlah || 0;
        const normalStatuses = ['Gizi Baik', 'Normal'];
        const normal = (data.statusDistribution || [])
          .filter(s => normalStatuses.includes(s.status_gizi_bbtb))
          .reduce((sum, s) => sum + (s.jumlah || 0), 0);
        setDashStats({
          total_balita: data.totalBalita || 0,
          normal,
          risiko: data.balitaBerisiko || 0,
          bulan_ini: bulanIni,
        });
      }
    } catch (e) { console.error('Stats error:', e); }
  };

  // Fetch recent measurements from DB
  const fetchRecentData = async () => {
    try {
      const res = await apiFetch('/api/pengukuran?limit=5');
      if (res.ok) {
        const data = await res.json();
        setRecentData(data.data || []);
      }
    } catch (e) { console.error('Recent error:', e); }
  };

  useEffect(() => {
    fetchDashboardStats();
    fetchRecentData();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = {
        ...prev,
        [name]: value
      };
      
      // Auto-calculate age in months when birth date or measurement date changes
      if ((name === 'tanggalLahir' || name === 'tanggalPengukuran') && updated.tanggalLahir && updated.tanggalPengukuran) {
        const birthDate = new Date(updated.tanggalLahir);
        const measureDate = new Date(updated.tanggalPengukuran);
        const ageInMonths = Math.floor((measureDate - birthDate) / (1000 * 60 * 60 * 24 * 30.44));
        if (ageInMonths >= 0) {
          updated.usiaBulan = ageInMonths.toString();
        }
      }
      
      return updated;
    });
  };

  const toNumber = (value) => {
    if (value === '' || value === null || value === undefined) return null;
    const num = Number(value);
    return Number.isNaN(num) ? null : num;
  };

  const buildPredictPayload = () => ({
    Tgl_Lahir: formData.tanggalLahir,
    Tanggal_Pengukuran: formData.tanggalPengukuran,
    Jenis_Kelamin_Balita: formData.jenisKelamin,
    Berat: toNumber(formData.beratBadan),
    Tinggi: toNumber(formData.tinggiBadan),
    LiLA: toNumber(formData.lila)
  });

  const getParentFormData = () => {
    try {
      const raw = localStorage.getItem('parent_form_data');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;

      const norm = (s) => (s || '').toString().toLowerCase().trim();
      const kaderNamaAnak = norm(formData.namaBalita);
      const kaderNamaIbu = norm(formData.namaIbu);
      const kaderTglLahir = norm(formData.tanggalLahir);

      const parentNamaAnak = norm(parsed.namaBalita);
      const parentNamaOrtu = norm(parsed.namaOrangTua);
      const parentTglLahir = norm(parsed.tanggalLahirBalita);

      // Match by child name first
      if (kaderNamaAnak && parentNamaAnak && kaderNamaAnak === parentNamaAnak) return parsed;
      // Then by parent name
      if (kaderNamaIbu && parentNamaOrtu && kaderNamaIbu === parentNamaOrtu) return parsed;
      // Then by birth date
      if (kaderTglLahir && parentTglLahir && kaderTglLahir === parentTglLahir) return parsed;

      return null; // No match
    } catch {
      return null;
    }
  };

  const joinMulti = (value) => Array.isArray(value) ? value.join(', ') : value;

  const buildPredictPayloadTA = (parentData) => ({
    data: {
      // Kader form
      umur_balita_bulan: toNumber(formData.usiaBulan),
      jenis_kelamin: formData.jenisKelamin,
      berat_badan_kg: toNumber(formData.beratBadan),
      tinggi_badan_cm: toNumber(formData.tinggiBadan),
      lingkar_kepala_cm: toNumber(formData.lingkarKepala),
      lila_cm: toNumber(formData.lila),
      tren_bb_bulan_lalu: formData.kondisiBeratBadan,
      usia_kehamilan_lahir: toNumber(formData.usiaKehamilan),
      berat_lahir_kg: toNumber(formData.beratLahir),
      panjang_lahir_cm: toNumber(formData.tinggiLahir),
      Tanggal_Lahir_Balita_kader: formData.tanggalLahir,

      // Parent form
      is_bblr: parentData.bbLahirRendah,
      is_prematur: parentData.prematur,
      is_imd: parentData.imd,
      is_komplikasi_lahir: parentData.komplikasiLahir,
      jenis_komplikasi_lahir: parentData.detailKomplikasi,
      tinggi_ibu_cm: toNumber(parentData.tinggiIbu),
      berat_ibu_kg: toNumber(parentData.beratIbu),
      tinggi_ayah_cm: toNumber(parentData.tinggiAyah),
      berat_ayah_kg: toNumber(parentData.beratAyah),
      status_gizi_ibu_hamil: parentData.statusGiziIbuHamil,
      is_anemia_ibu: parentData.anemia,
      is_hamil_muda_u20: parentData.hamilDiBawah20,
      jarak_kelahiran: parentData.jarakKelahiran,
      is_hipertensi_gestasional: parentData.tekananDarahTinggi,
      is_diabetes_gestasional: parentData.gulaDarahTinggi,
      is_infeksi_kehamilan: parentData.infeksiHamil,
      is_suplemen_kehamilan: parentData.rutinSuplemen,
      is_hamil_lagi: parentData.hamilLagi,
      frekuensi_suplemen_minggu: parentData.frekuensiSuplemen,
      jenis_suplemen_ibu: joinMulti(parentData.jenisSuplemen),
      is_ttd_90_tablet: parentData.ttd90,
      is_asi_eksklusif: parentData.asiEksklusif,
      usia_mulai_mpasi: toNumber(parentData.usiaMpasi),
      is_mpasi_hewani: parentData.mpasiHewani,
      frekuensi_makan_utama: parentData.frekuensiMakan,
      is_susu_non_asi: parentData.susuLain,
      frekuensi_susu_non_asi: toNumber(parentData.frekuensiSusu),
      terakhir_vitamin_a: parentData.vitaminA,
      is_tablet_besi_anak: parentData.tabletBesiAnak,
      is_obat_cacing_anak: parentData.obatCacing,
      is_intervensi_gizi: parentData.intervensiGizi,
      jenis_intervensi_gizi: joinMulti(parentData.jenisIntervensi),
      riwayat_vaksinasi: joinMulti(parentData.vaksin),
      is_sakit_2_minggu: parentData.sakit2Minggu,
      jenis_penyakit_balita: joinMulti(parentData.jenisPenyakit),
      konsumsi_asi_h_1: parentData.asiKemarin,
      konsumsi_karbohidrat_h_1: parentData.makanPokok,
      konsumsi_kacangan_h_1: parentData.makanKacang,
      konsumsi_susu_hewani_h_1: parentData.produkSusu,
      is_susu_murni_100: parentData.susuMurni,
      konsumsi_daging_ikan_h_1: parentData.proteinHewani,
      konsumsi_telur_h_1: parentData.telur,
      konsumsi_vit_a_h_1: parentData.sayurVitA,
      konsumsi_buah_sayur_lain_h_1: parentData.sayurLain,
      is_konsumsi_manis_berlebih: parentData.makananManis,
      is_pernah_pmt: parentData.bantuanGizi,
      is_pernah_rawat_inap: parentData.rawatInap,
      jam_tidur_harian: toNumber(parentData.jamTidur),
      durasi_aktivitas_luar: parentData.aktivitasLuar,
      tingkat_aktivitas_anak: parentData.tipeAnak,
      is_ibu_bekerja: parentData.ibuBekerja,
      skor_pengetahuan_ibu: parentData.pengetahuanGizi,
      skor_pola_asuh_makan: parentData.polaAsuh,
      is_bpjs: parentData.bpjs,
      is_perokok_di_rumah: parentData.perokok,
      sumber_air_minum: parentData.sumberAir,
      kualitas_air_minum: parentData.kualitasAir,
      jenis_sanitasi: parentData.sanitasi,
      kebersihan_lingkungan: parentData.kebersihanRumah,
      kebiasaan_cuci_tangan: parentData.cuciTangan,
      akses_faskes: parentData.aksesFaskes,
      frekuensi_posyandu_bulan: parentData.rutinPosyandu,
      is_penyakit_bawaan: parentData.penyakitBawaan,
      is_baby_blues: parentData.babyBlues,
      is_gejala_depresi: parentData.depresi,
      pendidikan_ibu: parentData.pendidikanIbu,
      pendidikan_ayah: parentData.pendidikanAyah,
      is_pernah_penyuluhan_gizi: parentData.pernahPenyuluhan,
      frekuensi_ikut_kelas_ibu: parentData.frekPenyuluhan,
      is_paham_makanan_sehat: parentData.pahamGizi,
      pekerjaan_kepala_keluarga: parentData.pekerjaanAyah,
      jumlah_art: toNumber(parentData.jumlahAnggota),
      pendapatan_bulanan: parentData.pendapatan,
      jarak_akses_pangan: parentData.jarakPasar,
      is_pantangan_makan: parentData.pantangan,
      Siapa_yang_biasanya_menentukan_makanan_apa_yang_dimakan_oleh_anak_di_rumah_: parentData.pengambilKeputusan
    }
  });

  const handleSubmit = async () => {
    setPredictError('');
    setIsPredicting(true);
    const requiredFields = [
      { key: 'tanggalLahir', label: 'Tanggal Lahir Balita' },
      { key: 'tanggalPengukuran', label: 'Tanggal pengukuran' },
      { key: 'jenisKelamin', label: 'Jenis Kelamin Balita' },
      { key: 'beratBadan', label: 'Berat badan' },
      { key: 'tinggiBadan', label: 'Tinggi badan' }
    ];

    const missing = requiredFields.filter((f) => !formData[f.key]);
    if (missing.length > 0) {
      setPredictError(`Lengkapi dulu: ${missing.map((m) => m.label).join(', ')}`);
      setIsPredicting(false);
      return;
    }
    try {
      let payload;
      let endpoint = API_Dipakai;
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

      if (API_Dipakai === 'predict-ta') {
        const parentData = getParentFormData();
        if (!parentData) {
          // No matching parent form — save kader data for pending, warn user
          localStorage.setItem('kader_form_data', JSON.stringify(formData));
          const key = `${(formData.namaBalita || '').toLowerCase().trim()}_${formData.tanggalLahir || ''}`;
          const newQueue = [{ key, namaBalita: formData.namaBalita, namaIbu: formData.namaIbu, tanggalLahir: formData.tanggalLahir, tanggalPengukuran: formData.tanggalPengukuran, timestamp: new Date().toISOString() }, ...pendingQueue.filter(p => p.key !== key)];
          setPendingQueue(newQueue);
          localStorage.setItem('kader_pending_queue', JSON.stringify(newQueue));
          setPredictError(`Tidak ditemukan form orang tua yang cocok dengan nama "${formData.namaBalita}". Pastikan orang tua sudah mengisi form dengan nama anak yang sama (nama lengkap).`);
          setIsPredicting(false);
          return;
        }

        payload = buildPredictPayloadTA(parentData);
        endpoint = 'predict-ta';
      } else {
        payload = buildPredictPayload();
        endpoint = 'predict';
      }

      const response = await fetch(`${baseUrl}/${endpoint}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-API-KEY': import.meta.env.VITE_API_KEY || 'growell123'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Gagal memproses prediksi.');
      }

      const data = await response.json();
      const mlUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

      if (API_Dipakai === 'predict-ta') {
        const predictions = data?.predictions || {};
        const statusBBTB = predictions?.status_gizi_bbtb?.label || '-';
        const statusTBU = predictions?.status_gizi_tbu?.label || '-';
        setPredictionResult({
          bbtb: statusBBTB,
          bbu: predictions?.status_gizi_bbu?.label || '-',
          tbu: statusTBU,
        });

        // Get rekomendasi intervensi (with real parent data)
        const parentData = getParentFormData();
        try {
          const rekRes = await fetch(`${mlUrl}/predict-rekomendasi`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              usia_bulan: toNumber(formData.usiaBulan) || 12,
              berat_badan: toNumber(formData.beratBadan) || 10,
              status_gizi_bb_tb: statusBBTB,
              status_gizi_tb_u: statusTBU,
              asi_eksklusif: parentData?.asiEksklusif === 'Ya',
              konsumsi_protein_hewani: parentData?.mpasiHewani || 'Ya, setiap hari',
              pola_asuh_makan: parentData?.polaAsuh || 'Responsive feeding',
              riwayat_sakit_2minggu: parentData?.sakit2Minggu === 'Ya',
              jenis_sanitasi: parentData?.sanitasi || 'Toilet dengan septic tank',
              rutin_vitamin_a: !!parentData?.vitaminA,
              rutin_posyandu: parentData?.rutinPosyandu === 'Rutin setiap bulan',
            }),
          });
          if (rekRes.ok) setRekomendasiResult(await rekRes.json());
        } catch (rekErr) { console.error('Rekomendasi error:', rekErr); }

        // Cleanup parent form after matching
        const key = `${(formData.namaBalita || '').toLowerCase().trim()}_${formData.tanggalLahir || ''}`;
        const newQueue = pendingQueue.filter(q => q.key !== key);
        setPendingQueue(newQueue);
        localStorage.setItem('kader_pending_queue', JSON.stringify(newQueue));
        localStorage.removeItem('parent_form_data');
      } else {
        const statusBBTB = data['BB/TB'] || '-';
        const statusTBU = data['TB/U'] || '-';
        setPredictionResult({
          bbtb: statusBBTB,
          bbu: data['BB/U'] || '-',
          tbu: statusTBU,
        });

        // Get rekomendasi intervensi with conservative defaults
        try {
          const rekRes = await fetch(`${mlUrl}/predict-rekomendasi`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              usia_bulan: toNumber(formData.usiaBulan) || 12,
              berat_badan: toNumber(formData.beratBadan) || 10,
              status_gizi_bb_tb: statusBBTB,
              status_gizi_tb_u: statusTBU,
              asi_eksklusif: false,
              konsumsi_protein_hewani: 'Ya, namun tidak rutin',
              pola_asuh_makan: 'Responsive feeding',
              riwayat_sakit_2minggu: false,
              jenis_sanitasi: 'Toilet dengan septic tank',
              rutin_vitamin_a: true,
              rutin_posyandu: true,
            }),
          });
          if (rekRes.ok) setRekomendasiResult(await rekRes.json());
        } catch (rekErr) { console.error('Rekomendasi error:', rekErr); }
      }
      setActiveTab('result');
      setTimeout(() => {
        if (resultSectionRef.current) {
          resultSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 150);
    } catch (err) {
      setPredictError(err.message || 'Terjadi kesalahan pada prediksi.');
    } finally {
      setIsPredicting(false);
    }
  };

  const handleReset = () => {
    setFormData({
      namaKelurahan: '',
      namaPosyandu: '',
      namaBalita: '',
      namaIbu: '',
      tanggalPengukuran: '',
      tanggalLahir: '',
      jenisKelamin: '',
      usiaBulan: '',
      beratBadan: '',
      tinggiBadan: '',
      lingkarKepala: '',
      lila: '',
      kondisiBeratBadan: '',
      usiaKehamilan: '',
      beratLahir: '',
      tinggiLahir: '',
      rekomendasiGizi: ''
    });
    setPredictionResult(null);
    setPredictError('');
  };

  // Handle click outside for profile dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
        setProfileDropdownOpen(false);
      }
    }
    if (profileDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [profileDropdownOpen]);

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  const handleProfile = () => {
    setProfileDropdownOpen(false);
    navigate('/profile');
  };

  const handleSaveData = async () => {
    if (!predictionResult || isSaving) return;
    setIsSaving(true);
    try {
      const res = await apiFetch('/api/pengukuran/simpan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nama_balita: formData.namaBalita,
          tanggal_lahir: formData.tanggalLahir,
          jenis_kelamin: formData.jenisKelamin,
          nama_ibu: formData.namaIbu,
          berat_lahir: toNumber(formData.beratLahir),
          tinggi_lahir: toNumber(formData.tinggiLahir),
          tanggal_pengukuran: formData.tanggalPengukuran,
          berat_badan: toNumber(formData.beratBadan),
          tinggi_badan: toNumber(formData.tinggiBadan),
          lingkar_lengan: toNumber(formData.lila),
          lingkar_kepala: toNumber(formData.lingkarKepala),
          catatan: formData.rekomendasiGizi || null,
          status_gizi_bbu: predictionResult.bbu,
          status_gizi_tbu: predictionResult.tbu,
          status_gizi_bbtb: predictionResult.bbtb,
          rekomendasi_utama: rekomendasiResult?.rekomendasi_utama || null,
          rekomendasi_tambahan: rekomendasiResult
            ? [rekomendasiResult.rekomendasi_utama, ...(rekomendasiResult.rekomendasi_tambahan || [])].filter(Boolean)
            : null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Gagal menyimpan data');
      }
      setShowSuccessModal(true);
      fetchRecentData();
      fetchDashboardStats();
    } catch (err) {
      setPredictError('Gagal menyimpan: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCloseModal = () => {
    setShowSuccessModal(false);
    handleReset();
    setActiveTab('input');
  };

  const handleViewAllData = () => {
    setShowSuccessModal(false);
    navigate('/data-balita');
  };

  return (
    <div className="min-h-screen page-enter" style={{ background: 'var(--gw-grad-subtle)' }}>
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/40" style={{ background: 'rgba(255,255,255,0.78)', backdropFilter: 'blur(20px) saturate(180%)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
              <img src={growellLogo} alt="Growell" className="w-9 h-9 rounded-xl object-cover" />
              <div>
                <h1 className="text-lg sm:text-xl font-bold gw-text-gradient">Growell Kader</h1>
                <p className="text-[11px] text-gray-500 hidden sm:block">Dashboard Pemantauan Stunting</p>
              </div>
            </Link>
            <div className="relative" ref={profileDropdownRef}>
              <button onClick={() => setProfileDropdownOpen(!profileDropdownOpen)} className="px-3 py-2 text-gray-500 hover:text-teal-600 transition flex items-center gap-2 text-sm hover:bg-gray-50 rounded-xl">
                <User size={18} />
                <span className="hidden sm:inline font-medium">Profile</span>
                <ChevronDown className={`text-gray-400 transition-transform duration-200 ${profileDropdownOpen ? 'rotate-180' : ''}`} size={14} />
              </button>
              {profileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden gw-scale-in z-[9999]">
                  <button onClick={handleProfile} className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 text-sm text-gray-700"><User size={16} className="text-teal-600" /><span className="font-medium">Profile</span></button>
                  <div className="border-t border-gray-100"></div>
                  <button onClick={handleLogout} className="w-full px-4 py-3 text-left hover:bg-red-50 flex items-center gap-3 text-sm text-red-600"><LogOut size={16} /><span className="font-medium">Logout</span></button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5">
        <Breadcrumb items={[{ label: 'Dashboard', path: '/kader' }]} />
      </div>

      {/* Stats Cards */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[
            { icon: <Users className="text-teal-600" size={20} />, label: 'Total Balita', value: dashStats.total_balita, bg: 'rgba(13,148,136,0.06)' },
            { icon: <CheckCircle2 className="text-emerald-600" size={20} />, label: 'Status Normal', value: dashStats.normal, bg: 'rgba(5,150,105,0.06)' },
            { icon: <AlertCircle className="text-orange-600" size={20} />, label: 'Berisiko', value: dashStats.risiko, bg: 'rgba(234,88,12,0.06)' },
            { icon: <TrendingUp className="text-sky-600" size={20} />, label: 'Bulan Ini', value: dashStats.bulan_ini, bg: 'rgba(14,165,233,0.06)' }
          ].map((stat, idx) => (
            <div key={idx} className="gw-card !shadow-none p-4 sm:p-5" style={{ background: stat.bg }}>
              <div className="flex items-center justify-between mb-1.5">
                {stat.icon}
                <span className="text-xl sm:text-2xl font-bold text-gray-900">{stat.value}</span>
              </div>
              <p className="text-xs text-gray-500 font-medium">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Main Content */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="grid lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Form Section */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8">
              {/* Tabs */}
              <div className="flex gap-2 sm:gap-4 mb-6 sm:mb-8 border-b overflow-x-auto">
                <button
                  onClick={() => setActiveTab('input')}
                  className={`px-4 sm:px-6 py-3 font-semibold transition whitespace-nowrap text-sm sm:text-base ${activeTab === 'input'
                    ? 'text-cyan-600 border-b-2 border-cyan-600'
                    : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                  <Plus className="inline mr-2" size={18} />
                  Input Data
                </button>
                <button
                  onClick={() => setActiveTab('result')}
                  className={`px-4 sm:px-6 py-3 font-semibold transition whitespace-nowrap text-sm sm:text-base ${activeTab === 'result'
                    ? 'text-cyan-600 border-b-2 border-cyan-600'
                    : 'text-gray-500 hover:text-gray-700'
                    }`}
                  disabled={!predictionResult}
                >
                  <FileText className="inline mr-2" size={18} />
                  Hasil Prediksi
                </button>
              </div>

              {/* Input Form */}
              {activeTab === 'input' && (
                <div className="space-y-6">
                  <div className="bg-gradient-to-r from-cyan-50 to-blue-50 p-4 sm:p-6 rounded-xl">
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">Data Identitas Balita</h3>
                    <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Nama Kelurahan yang balita tempati?</label>
                        <input
                          type="text"
                          name="namaKelurahan"
                          value={formData.namaKelurahan}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none transition-all shadow-sm hover:border-gray-300 hover:shadow-md text-gray-900"
                          placeholder="Contoh: Sukamaju"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Nama Posyandu yang dikunjungi?</label>
                        <input
                          type="text"
                          name="namaPosyandu"
                          value={formData.namaPosyandu}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none transition-all shadow-sm hover:border-gray-300 hover:shadow-md text-gray-900"
                          placeholder="Contoh: Posyandu Mawar"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Nama Lengkap Balita</label>
                        <input
                          type="text"
                          name="namaBalita"
                          value={formData.namaBalita}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none transition-all shadow-sm hover:border-gray-300 hover:shadow-md text-gray-900"
                          placeholder="Masukkan nama lengkap"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Nama Lengkap Ibu Balita</label>
                        <input
                          type="text"
                          name="namaIbu"
                          value={formData.namaIbu}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none transition-all shadow-sm hover:border-gray-300 hover:shadow-md text-gray-900"
                          placeholder="Masukkan nama ibu"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Tanggal pengukuran atau kunjungan ke posyandu</label>
                        <CustomDatePicker
                          name="tanggalPengukuran"
                          value={formData.tanggalPengukuran}
                          onChange={handleInputChange}
                          placeholder="Pilih tanggal pengukuran"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Tanggal Lahir Balita <span className="text-red-500">*</span>
                        </label>
                        <CustomDatePicker
                          name="tanggalLahir"
                          value={formData.tanggalLahir}
                          onChange={handleInputChange}
                          placeholder="Pilih Tanggal Lahir"
                          defaultYear={new Date().getFullYear() - 2}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Jenis Kelamin Balita</label>
                        <CustomDropdown
                          name="jenisKelamin"
                          value={formData.jenisKelamin}
                          onChange={handleInputChange}
                          placeholder="Pilih Jenis Kelamin"
                          options={[
                            { value: 'Laki-Laki', label: 'Laki-Laki' },
                            { value: 'Perempuan', label: 'Perempuan' }
                          ]}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Umur Balita (bulan) — terhitung otomatis</label>
                        <input
                          type="number"
                          name="usiaBulan"
                          value={formData.usiaBulan}
                          readOnly
                          className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 bg-gray-50 text-gray-500 outline-none shadow-sm cursor-not-allowed"
                          placeholder="Otomatis dari tanggal lahir"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 sm:p-6 rounded-xl">
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">Data Antropometri</h3>
                    <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Berat badan balita saat ini (kg)</label>
                        <input
                          type="number"
                          step="0.1"
                          name="beratBadan"
                          value={formData.beratBadan}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none transition-all shadow-sm hover:border-gray-300 hover:shadow-md text-gray-900"
                          placeholder="Contoh: 12.5"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Tinggi/Panjang badan balita saat ini (cm)</label>
                        <input
                          type="number"
                          step="0.1"
                          name="tinggiBadan"
                          value={formData.tinggiBadan}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none transition-all shadow-sm hover:border-gray-300 hover:shadow-md text-gray-900"
                          placeholder="Contoh: 85.5"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Lingkar kepala balita saat ini (cm)</label>
                        <input
                          type="number"
                          step="0.1"
                          name="lingkarKepala"
                          value={formData.lingkarKepala}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none transition-all shadow-sm hover:border-gray-300 hover:shadow-md text-gray-900"
                          placeholder="Contoh: 46.5"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Lingkar lengan atas balita saat ini (LiLA) (cm)</label>
                        <input
                          type="number"
                          step="0.1"
                          name="lila"
                          value={formData.lila}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none transition-all shadow-sm hover:border-gray-300 hover:shadow-md text-gray-900"
                          placeholder="Contoh: 14.0"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Kondisi berat badan balita saat ini dari 1 bulan lalu?</label>
                        <CustomDropdown
                          name="kondisiBeratBadan"
                          value={formData.kondisiBeratBadan}
                          onChange={handleInputChange}
                          placeholder="Pilih kondisi"
                          options={[
                            { value: 'naik', label: 'Naik' },
                            { value: 'turun', label: 'Turun' },
                            { value: 'tetap', label: 'Tetap' }
                          ]}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 sm:p-6 rounded-xl">
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">Data Kelahiran</h3>
                    <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Usia kehamilan saat balita lahir (bulan)</label>
                        <input
                          type="number"
                          name="usiaKehamilan"
                          value={formData.usiaKehamilan}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none transition-all shadow-sm hover:border-gray-300 hover:shadow-md text-gray-900"
                          placeholder="Contoh: 9"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Berat badan balita saat lahir (kg)</label>
                        <input
                          type="number"
                          step="0.1"
                          name="beratLahir"
                          value={formData.beratLahir}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none transition-all shadow-sm hover:border-gray-300 hover:shadow-md text-gray-900"
                          placeholder="Contoh: 3.2"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Tinggi/Panjang badan balita saat lahir (cm)</label>
                        <input
                          type="number"
                          step="0.1"
                          name="tinggiLahir"
                          value={formData.tinggiLahir}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none transition-all shadow-sm hover:border-gray-300 hover:shadow-md text-gray-900"
                          placeholder="Contoh: 49.5"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Rekomendasi Gizi Untuk Balita</label>
                        <textarea
                          name="rekomendasiGizi"
                          value={formData.rekomendasiGizi}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none transition-all shadow-sm hover:border-gray-300 hover:shadow-md text-gray-900"
                          rows="3"
                          placeholder="Opsional"
                        />
                      </div>
                    </div>
                  </div>
                  {predictError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">
                      {predictError}
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4">
                    <button
                      onClick={handleSubmit}
                      disabled={isPredicting}
                      className="flex-1 px-6 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-bold hover:shadow-xl transition flex items-center justify-center gap-2 text-sm sm:text-base"
                    >
                      <BarChart3 size={20} />
                      {isPredicting ? 'Memproses...' : 'Prediksi Status Gizi'}
                    </button>
                    <button
                      onClick={handleReset}
                      className="px-6 py-4 border-2 border-gray-300 text-gray-700 rounded-xl font-bold hover:border-cyan-500 hover:text-cyan-600 transition flex items-center justify-center gap-2 text-sm sm:text-base"
                    >
                      <RefreshCw size={20} />
                      Reset Form
                    </button>
                  </div>
                </div>
              )}

              {/* Result Tab */}
              {activeTab === 'result' && predictionResult && (
                <div ref={resultSectionRef} className="space-y-6">
                  {/* Status Cards */}
                  <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 sm:p-8">
                    <h4 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <FileText className="text-cyan-600" />
                      Hasil Prediksi Status Gizi
                    </h4>
                    <div className="grid sm:grid-cols-3 gap-4">
                      <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-100">
                        <p className="text-sm text-gray-600">Status gizi BB/TB</p>
                        <p className="text-lg font-bold text-gray-900 mt-1">{predictionResult.bbtb}</p>
                      </div>
                      <div className="p-4 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 border border-green-100">
                        <p className="text-sm text-gray-600">Status gizi BB/U</p>
                        <p className="text-lg font-bold text-gray-900 mt-1">{predictionResult.bbu}</p>
                      </div>
                      <div className="p-4 rounded-xl bg-gradient-to-r from-orange-50 to-red-50 border border-orange-100">
                        <p className="text-sm text-gray-600">Status gizi TB/U</p>
                        <p className="text-lg font-bold text-gray-900 mt-1">{predictionResult.tbu}</p>
                      </div>
                    </div>
                  </div>

                  {/* Rekomendasi Intervensi */}
                  {rekomendasiResult && (
                    <div className="bg-white border-2 border-emerald-100 rounded-2xl p-6 sm:p-8">
                      <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Sparkles className="text-emerald-500" size={20} />
                        Rekomendasi Intervensi
                      </h4>
                      {rekomendasiResult.rekomendasi_utama && (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-3">
                          <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-1">Rekomendasi Utama</p>
                          <p className="text-sm font-semibold text-emerald-900">{rekomendasiResult.rekomendasi_utama}</p>
                        </div>
                      )}
                      {rekomendasiResult.rekomendasi_tambahan?.length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Rekomendasi Tambahan</p>
                          <ul className="space-y-1.5">
                            {rekomendasiResult.rekomendasi_tambahan.map((r, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                                <span className="w-4 h-4 rounded-full bg-cyan-100 text-cyan-600 flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">{i + 1}</span>
                                {r}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {rekomendasiResult.catatan && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                          <p className="text-xs font-semibold text-amber-700 mb-1">Catatan</p>
                          <p className="text-sm text-amber-800">{rekomendasiResult.catatan}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <button
                      onClick={handleSaveData}
                      disabled={isSaving}
                      className="flex-1 px-6 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-bold hover:shadow-xl transition flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      {isSaving ? <><Loader2 size={20} className="animate-spin" /> Menyimpan...</> : <><Save size={20} /> Simpan Data</>}
                    </button>
                    <button
                      onClick={() => setActiveTab('input')}
                      className="flex-1 px-6 py-4 border-2 border-gray-300 text-gray-700 rounded-xl font-bold hover:border-cyan-500 hover:text-cyan-600 transition flex items-center justify-center gap-2"
                    >
                      <Plus size={20} />
                      Input Data Baru
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar - Recent Data */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-24">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900">Data Terbaru</h3>
                <Calendar className="text-cyan-600" size={20} />
              </div>

              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    placeholder="Cari nama..."
                    value={searchRecent}
                    onChange={(e) => setSearchRecent(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {recentData
                  .filter(d => !searchRecent || (d.nama_balita || d.nama || '').toLowerCase().includes(searchRecent.toLowerCase()))
                  .map((data, idx) => {
                    const statusBBTB = data.status_gizi_bbtb;
                    const isNormal = !statusBBTB || statusBBTB === 'Gizi Baik' || statusBBTB === 'Normal';
                    return (
                      <div key={data.uuid || idx} className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition cursor-pointer">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 text-sm">{data.nama_balita || data.nama || '—'}</h4>
                            <p className="text-xs text-gray-500 mt-1">
                              {data.jenis_kelamin} · {data.tanggal_pengukuran ? new Date(data.tanggal_pengukuran).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                            </p>
                          </div>
                          {statusBBTB && (
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${isNormal ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                              {statusBBTB}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                {recentData.length === 0 && (
                  <p className="text-center text-sm text-gray-400 py-6">Belum ada data pengukuran</p>
                )}
              </div>

              <button
                onClick={() => navigate('/data-balita')}
                className="w-full mt-4 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition text-sm"
              >
                Lihat Semua Data
              </button>
            </div>
          </div>
        </div>
      </section>

      <SuccessModal
        isOpen={showSuccessModal}
        onClose={handleCloseModal}
        onViewAll={handleViewAllData}
        title="Data Berhasil Disimpan!"
        message="Data pertumbuhan anak telah berhasil direkam ke dalam sistem."
      />
    </div>
  );
}