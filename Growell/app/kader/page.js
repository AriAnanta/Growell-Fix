'use client';
import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  User, Save, RefreshCw, AlertCircle, CheckCircle2, TrendingUp, Users, Calendar,
  Search, Plus, FileText, BarChart3, ChevronDown, LogOut, ArrowRight, Clock,
  Loader2, Info, ClipboardList, Sparkles, Copy, Check, Link2, Settings2
} from 'lucide-react';
import CustomDatePicker from '@/components/forms/CustomDatePicker';
import CustomDropdown from '@/components/forms/CustomDropdown';
import SuccessModal from '@/components/common/SuccessModal';
import { useToast } from '@/components/common/Toast';
import { clearAuth, getUserData, apiFetch, isAuthenticated } from '@/utils/auth';

// Generate a 6-character alphanumeric link code
function generateLinkCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I,O,0,1 to avoid confusion
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export default function KaderDashboard() {
  const router = useRouter();
  const toast = useToast();

  // API yang dipakai — hardcoded, tidak perlu pilihan UI
  const API_Dipakai = 'predict';

  const [activeTab, setActiveTab] = useState('input');
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const profileDropdownRef = useRef(null);
  const resultSectionRef = useRef(null);
  const [userData, setUserData] = useState(null);
  const [dashStats, setDashStats] = useState({ total_balita: 0, normal: 0, risiko: 0, bulan_ini: 0 });
  const [recentData, setRecentData] = useState([]);
  const [searchRecent, setSearchRecent] = useState('');

  // Form
  const emptyForm = {
    namaKelurahan: '', namaPosyandu: '', namaBalita: '', namaIbu: '',
    tanggalPengukuran: '', tanggalLahir: '', jenisKelamin: '', usiaBulan: '',
    beratBadan: '', tinggiBadan: '', lingkarKepala: '', lila: '',
    kondisiBeratBadan: '', usiaKehamilan: '', beratLahir: '', tinggiLahir: '', rekomendasiGizi: ''
  };
  const [formData, setFormData] = useState(emptyForm);

  // Prediction
  const [predictionResult, setPredictionResult] = useState(null);
  const [rekomendasiResult, setRekomendasiResult] = useState(null);
  const [isPredicting, setIsPredicting] = useState(false);
  const [predictError, setPredictError] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Link code for matching kader+parent forms
  const [linkCode, setLinkCode] = useState('');
  const [codeCopied, setCodeCopied] = useState(false);
  const [showLinkCodeModal, setShowLinkCodeModal] = useState(false);

  // Pending queue
  const [pendingQueue, setPendingQueue] = useState([]);

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/login'); return; }
    const u = getUserData();
    const role = u?.role;
    if (role !== 'kader') {
      if (role === 'orang_tua') router.replace('/orang-tua');
      else if (role === 'ahli_gizi') router.replace('/konsultasi');
      else if (role === 'kelurahan' || role === 'puskesmas') router.replace('/kelurahan');
      else router.replace('/login');
      return;
    }
    setUserData(u);
    fetchDashboardStats();
    fetchRecentData();
    const saved = localStorage.getItem('kader_pending_queue');
    if (saved) { try { setPendingQueue(JSON.parse(saved)); } catch {} }
  }, []);

  useEffect(() => {
    localStorage.setItem('kader_pending_queue', JSON.stringify(pendingQueue));
  }, [pendingQueue]);

  const fetchDashboardStats = async () => {
    try {
      const res = await apiFetch('/api/pengukuran/stats/dashboard');
      if (res.ok) {
        const data = await res.json();
        // API returns: totalBalita, balitaBerisiko, statusDistribution[{status_gizi_bbtb, jumlah}], monthlyMeasurements[{bulan, jumlah}]
        const thisMonth = new Date().toISOString().substring(0, 7); // 'YYYY-MM'
        const bulanIni = data.monthlyMeasurements?.find(m => m.bulan === thisMonth)?.jumlah || 0;
        setDashStats({
          total_balita: data.totalBalita || 0,
          normal: data.normalBalita || 0,
          risiko: data.balitaBerisiko || 0,
          bulan_ini: bulanIni,
        });
      }
    } catch (e) { console.error('Stats error:', e); }
  };

  const fetchRecentData = async () => {
    try {
      const res = await apiFetch('/api/balita?limit=5&sort=recent');
      if (res.ok) {
        const data = await res.json();
        // Map balita fields to match existing template field names
        const mapped = (data.data || []).map(b => ({
          uuid: b.uuid,
          nama_balita: b.nama,
          jenis_kelamin: b.jenis_kelamin,
          tanggal_lahir: b.tanggal_lahir,
          tanggal_pengukuran: b.pengukuran_terakhir,
          status_gizi_bbtb: b.status_gizi_bbtb,
          status_gizi_bbu: b.status_gizi_bbu,
          status_gizi_tbu: b.status_gizi_tbu,
        }));
        setRecentData(mapped);
      }
    } catch (e) { console.error('Recent error:', e); }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      if ((name === 'tanggalLahir' || name === 'tanggalPengukuran') && updated.tanggalLahir && updated.tanggalPengukuran) {
        const birth = new Date(updated.tanggalLahir), measure = new Date(updated.tanggalPengukuran);
        const months = Math.floor((measure - birth) / (1000 * 60 * 60 * 24 * 30.44));
        if (months >= 0) updated.usiaBulan = months.toString();
      }
      return updated;
    });
  };

  const toNumber = (v) => {
    if (v === '' || v === null || v === undefined) return null;
    const n = Number(v);
    return isNaN(n) ? null : n;
  };

  /**
   * Match parent form data by: (1) nama anak, (2) nama orang tua, (3) tanggal lahir.
   * All name comparisons are case-insensitive (lowercase + trim).
   */
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

      return null; // No match found
    } catch { return null; }
  };

  const joinMulti = (v) => Array.isArray(v) ? v.join(', ') : v;

  // ─── Submit ────────────────────────────────────
  const handleSubmit = async () => {
    setPredictError('');
    setIsPredicting(true);

    const required = [
      { key: 'tanggalLahir', label: 'Tanggal Lahir' },
      { key: 'tanggalPengukuran', label: 'Tanggal Pengukuran' },
      { key: 'jenisKelamin', label: 'Jenis Kelamin' },
      { key: 'beratBadan', label: 'Berat Badan' },
      { key: 'tinggiBadan', label: 'Tinggi Badan' },
    ];
    const missing = required.filter(f => !formData[f.key]);
    if (missing.length > 0) {
      setPredictError(`Lengkapi: ${missing.map(m => m.label).join(', ')}`);
      setIsPredicting(false);
      return;
    }

    try {
      // ━━━ Mode 'predict' — Kader only, direct to ML ━━━
      if (API_Dipakai === 'predict') {
        const payload = {
          Tgl_Lahir: formData.tanggalLahir,
          Tanggal_Pengukuran: formData.tanggalPengukuran,
          Jenis_Kelamin_Balita: formData.jenisKelamin,
          Berat: toNumber(formData.beratBadan),
          Tinggi: toNumber(formData.tinggiBadan),
          LiLA: toNumber(formData.lila),
        };

        const mlUrl = process.env.NEXT_PUBLIC_ML_SERVICE_URL || 'http://localhost:8000';
        const response = await fetch(`${mlUrl}/predict`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-API-KEY': 'growell123' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.detail || 'Gagal memproses prediksi.');
        }
        const data = await response.json();
        const predResult = { bbtb: data['BB/TB'], bbu: data['BB/U'], tbu: data['TB/U'] };
        setPredictionResult(predResult);

        // Call rekomendasi intervensi — use defaults for parent-form fields since we only have kader data
        try {
          const rekPayload = {
            usia_bulan: toNumber(formData.usiaBulan) || 12,
            berat_badan: toNumber(formData.beratBadan) || 10,
            status_gizi_bb_tb: predResult.bbtb || 'Gizi Baik',
            status_gizi_tb_u: predResult.tbu || 'Normal',
            // Defaults when parent form is not available (conservative: assume some risk)
            asi_eksklusif: false,
            konsumsi_protein_hewani: 'Ya, namun tidak rutin',
            pola_asuh_makan: 'Responsive feeding',
            riwayat_sakit_2minggu: false,
            jenis_sanitasi: 'Toilet dengan septic tank',
            rutin_vitamin_a: true,
            rutin_posyandu: true,
          };
          const rekRes = await fetch(`${mlUrl}/predict-rekomendasi`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(rekPayload),
          });
          if (rekRes.ok) {
            const rekData = await rekRes.json();
            setRekomendasiResult(rekData);
          }
        } catch (rekErr) {
          console.error('Rekomendasi error (non-fatal):', rekErr);
          setRekomendasiResult(null);
        }

        setActiveTab('result');
        toast.success('Prediksi Berhasil!', `Status gizi telah diprediksi.`);
        setTimeout(() => resultSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
        return;
      }

      // ━━━ Mode 'predict-ta' — Needs parent form, matched by name ━━━
      const parentData = getParentFormData();

      if (!parentData) {
        // No matching parent form found — save kader data for pending, warn user
        localStorage.setItem('kader_form_data', JSON.stringify(formData));
        // Add to pending queue for retry later
        setPendingQueue(prev => {
          const key = `${(formData.namaBalita || '').toLowerCase().trim()}_${formData.tanggalLahir || ''}`;
          const filtered = prev.filter(p => p.key !== key);
          return [{
            key,
            namaBalita: formData.namaBalita,
            namaIbu: formData.namaIbu,
            tanggalLahir: formData.tanggalLahir,
            tanggalPengukuran: formData.tanggalPengukuran,
            timestamp: new Date().toISOString(),
          }, ...filtered];
        });
        toast.warning('Form Orang Tua Belum Cocok', `Tidak ditemukan form orang tua yang cocok dengan nama "${formData.namaBalita}". Pastikan orang tua sudah mengisi form dengan nama anak yang sama (nama lengkap).`, 10000);
        setIsPredicting(false);
        return;
      }

      // Both forms matched! Build TA payload
      const taPayload = {
        data: {
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
          Siapa_yang_biasanya_menentukan_makanan_apa_yang_dimakan_oleh_anak_di_rumah_: parentData.pengambilKeputusan,
        }
      };

      const mlUrl = process.env.NEXT_PUBLIC_ML_SERVICE_URL || 'http://localhost:8000';
      const response = await fetch(`${mlUrl}/predict-ta`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-KEY': 'growell123' },
        body: JSON.stringify(taPayload),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || 'Gagal memproses prediksi.');
      }
      const data = await response.json();
      const p = data?.predictions || {};
      setPredictionResult({
        bbtb: p.status_gizi_bbtb?.label || '-',
        bbu: p.status_gizi_bbu?.label || '-',
        tbu: p.status_gizi_tbu?.label || '-',
      });

      // Get rekomendasi intervensi
      try {
        const statusBBTB = p.status_gizi_bbtb?.label || 'Gizi Baik';
        const statusTBU = p.status_gizi_tbu?.label || 'Normal';
        const rekRes = await fetch(`${mlUrl}/predict-rekomendasi`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            usia_bulan: toNumber(formData.usiaBulan) || 12,
            berat_badan: toNumber(formData.beratBadan) || 10,
            status_gizi_bb_tb: statusBBTB,
            status_gizi_tb_u: statusTBU,
            asi_eksklusif: parentData.asiEksklusif === 'Ya',
            konsumsi_protein_hewani: parentData.mpasiHewani || 'Ya, setiap hari',
            pola_asuh_makan: parentData.polaAsuh || 'Responsive feeding',
            riwayat_sakit_2minggu: parentData.sakit2Minggu === 'Ya',
            jenis_sanitasi: parentData.sanitasi || 'Toilet dengan septic tank',
            rutin_vitamin_a: !!parentData.vitaminA,
            rutin_posyandu: parentData.rutinPosyandu === 'Rutin setiap bulan',
          }),
        });
        if (rekRes.ok) setRekomendasiResult(await rekRes.json());
      } catch (rekErr) {
        console.error('Rekomendasi error:', rekErr);
      }

      // Remove from pending
      const key = `${(formData.namaBalita || '').toLowerCase().trim()}_${formData.tanggalLahir || ''}`;
      setPendingQueue(prev => prev.filter(q => q.key !== key));
      localStorage.removeItem('parent_form_data');

      setActiveTab('result');
      toast.success('Prediksi Berhasil!', `Status gizi ${formData.namaBalita || 'balita'} telah diprediksi.`);
      setTimeout(() => resultSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);

    } catch (err) {
      setPredictError(err.message || 'Terjadi kesalahan.');
      toast.error('Error', err.message);
    } finally {
      setIsPredicting(false);
    }
  };

  /** Retry prediction for a pending item */
  const retryPrediction = (item) => {
    // Restore kader data for this child then re-check parent match
    try {
      const kaderData = localStorage.getItem('kader_form_data');
      if (kaderData) {
        const parsed = JSON.parse(kaderData);
        const pKey = `${(parsed.namaBalita || '').toLowerCase().trim()}_${parsed.tanggalLahir || ''}`;
        if (pKey === item.key) {
          setFormData(parsed);
          toast.info('Data Dimuat', 'Form kader berhasil dimuat. Klik "Prediksi Status Gizi" untuk memproses.');
        }
      }
    } catch {}
  };

  const handleReset = () => {
    setFormData(emptyForm);
    setPredictionResult(null);
    setRekomendasiResult(null);
    setPredictError('');
    setLinkCode('');
    setCodeCopied(false);
    localStorage.removeItem('active_link_code');
  };

  const handleCopyCode = (code) => {
    navigator.clipboard?.writeText(code).then(() => {
      setCodeCopied(true);
      toast.success('Disalin!', `Kode "${code}" berhasil disalin.`);
      setTimeout(() => setCodeCopied(false), 2000);
    }).catch(() => {
      toast.info('Kode Hubung', `Kode: ${code}`);
    });
  };

  // Click outside dropdown
  useEffect(() => {
    const h = (e) => { if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target)) setProfileDropdownOpen(false); };
    if (profileDropdownOpen) document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [profileDropdownOpen]);

  const handleLogout = () => { clearAuth(); router.push('/login'); };
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
      toast.error('Gagal Menyimpan', err.message);
    } finally {
      setIsSaving(false);
    }
  };
  const handleCloseModal = () => { setShowSuccessModal(false); handleReset(); setActiveTab('input'); };
  const filteredRecent = recentData.filter(d => !searchRecent || (d.nama_balita || d.nama || '').toLowerCase().includes(searchRecent.toLowerCase()));

  const getStatusColor = (status) => {
    if (!status) return 'bg-gray-100 text-gray-500';
    const s = status.toLowerCase();
    if (s.includes('gizi baik') || s.includes('normal') || s.includes('berat badan normal')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (s.includes('gizi buruk') || s.includes('sangat pendek') || s.includes('sangat kurang')) return 'bg-red-50 text-red-700 border-red-200';
    if (s.includes('gizi kurang') || s.includes('pendek') || s.includes('kurang')) return 'bg-amber-50 text-amber-700 border-amber-200';
    if (s.includes('gizi lebih') || s.includes('tinggi') || s.includes('lebih')) return 'bg-blue-50 text-blue-700 border-blue-200';
    return 'bg-gray-100 text-gray-600';
  };

  const inputClass = "w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-gray-900 focus:ring-2 focus:ring-gray-900/5 outline-none transition-all text-gray-900 text-sm placeholder:text-gray-400";

  // ──────────────────── RENDER ────────────────────
  return (
    <div className="min-h-screen bg-[#fafafa] page-enter bg-orbs mesh-bg relative">
      {/* Decorative gradient blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-teal-400/[0.04] rounded-full blur-[100px] animate-float-slow" />
        <div className="absolute top-1/2 -left-40 w-[500px] h-[500px] bg-sky-400/[0.04] rounded-full blur-[120px] animate-float-slow-reverse" />
        <div className="absolute -bottom-40 right-1/4 w-80 h-80 bg-violet-400/[0.03] rounded-full blur-[100px] animate-float-slow" />
      </div>

      {/* ─── Header ─── */}
      <div className="sticky top-0 z-40 bg-[#fafafa] px-3 sm:px-4 pt-3 pb-2">
        <nav className="max-w-7xl mx-auto rounded-2xl bg-white/95 backdrop-blur-xl shadow-lg shadow-black/[0.05] border border-gray-100 px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group hover:opacity-80 transition-opacity">
            <div className="w-9 h-9 rounded-xl overflow-hidden shadow-sm group-hover:shadow-teal-200 transition-shadow duration-300">
              <img src="/growell-logo.png" alt="Growell" className="w-full h-full object-cover" />
            </div>
            <span className="text-base font-bold text-gray-900 tracking-tight">Growell</span>
            <span className="hidden sm:block text-sm text-gray-400 font-normal">&middot; Kader</span>
          </Link>
          <div className="relative" ref={profileDropdownRef}>
            <button onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              className="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-teal-500 to-sky-600 text-white rounded-xl text-sm font-semibold hover:shadow-lg hover:shadow-teal-500/25 transition-all">
              <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">{(userData?.nama || 'U').charAt(0).toUpperCase()}</div>
              <span className="hidden sm:block max-w-[100px] truncate">{userData?.nama?.split(' ')[0] || 'Profil'}</span>
              <ChevronDown size={13} className={`transition-transform duration-200 ${profileDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {profileDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl shadow-black/10 border border-gray-100 overflow-hidden z-50 animate-fade-in-down">
                <div className="p-1.5">
                  <button onClick={() => { setProfileDropdownOpen(false); router.push('/profile'); }} className="w-full px-3 py-2.5 text-left rounded-xl hover:bg-gray-50 flex items-center gap-3 text-sm text-gray-700 transition font-medium"><User size={15} className="text-teal-500" />Profil Saya</button>
                  <div className="my-1 border-t border-gray-100" />
                  <button onClick={handleLogout} className="w-full px-3 py-2.5 text-left rounded-xl hover:bg-red-50 flex items-center gap-3 text-sm text-red-600 transition font-medium"><LogOut size={15} />Keluar</button>
                </div>
              </div>
            )}
          </div>
        </nav>
      </div>


      {/* ─── Stats ─── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 stagger-grid">
          {[
            { icon: <Users size={20} />, label: 'Total Balita', value: dashStats.total_balita, color: 'text-cyan-600', bg: 'bg-cyan-50', glow: 'hover:shadow-cyan-100/60' },
            { icon: <CheckCircle2 size={20} />, label: 'Status Normal', value: dashStats.normal, color: 'text-emerald-600', bg: 'bg-emerald-50', glow: 'hover:shadow-emerald-100/60' },
            { icon: <AlertCircle size={20} />, label: 'Berisiko', value: dashStats.risiko, color: 'text-orange-600', bg: 'bg-orange-50', glow: 'hover:shadow-orange-100/60' },
            { icon: <TrendingUp size={20} />, label: 'Bulan Ini', value: dashStats.bulan_ini, color: 'text-blue-600', bg: 'bg-blue-50', glow: 'hover:shadow-blue-100/60' },
          ].map((s, i) => (
            <div key={i} className={`stat-card card-shine bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-xl ${s.glow} transition-all duration-500 hover:-translate-y-1`}>
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center ${s.color} transition-transform duration-300 group-hover:scale-110`}>{s.icon}</div>
                <span className="text-2xl sm:text-3xl font-extrabold text-gray-900 count-up tabular-nums">{s.value}</span>
              </div>
              <p className="text-xs sm:text-sm text-gray-500 font-medium">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Pending Queue ─── */}
      {pendingQueue.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4">
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center"><Clock size={20} className="text-amber-600" /></div>
              <div>
                <h3 className="text-sm font-bold text-amber-900">Menunggu Form Orang Tua ({pendingQueue.length})</h3>
                <p className="text-xs text-amber-600 mt-0.5">Berikan Kode Hubung ke orang tua untuk mengisi form</p>
              </div>
            </div>
            <div className="space-y-2">
              {pendingQueue.map((item, i) => (
                <div key={item.code || i} className="flex items-center justify-between bg-white/70 backdrop-blur-sm rounded-xl p-3.5 border border-amber-100">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 text-xs font-bold flex-shrink-0">{(item.namaBalita || '?').charAt(0)}</div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{item.namaBalita || '-'}</p>
                      <p className="text-xs text-gray-500">Kode: <span className="font-mono font-bold text-amber-700">{item.code}</span></p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => handleCopyCode(item.code)} className="p-2 hover:bg-amber-50 rounded-lg transition" title="Salin kode">
                      <Copy size={14} className="text-amber-600" />
                    </button>
                    <button onClick={() => retryPrediction(item)} className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap">
                      <Sparkles size={12} /> Cek
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── Main Content ─── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 section-appear section-appear-delay-2">
        <div className="grid lg:grid-cols-3 gap-5 sm:gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-lg transition-shadow duration-500">
              {/* Tabs */}
              <div className="flex border-b border-gray-100">
                {[
                  { key: 'input', label: 'Input Data', icon: <Plus size={16} /> },
                  { key: 'result', label: 'Hasil Prediksi', icon: <FileText size={16} />, disabled: !predictionResult },
                ].map(tab => (
                  <button key={tab.key} onClick={() => !tab.disabled && setActiveTab(tab.key)} disabled={tab.disabled}
                    className={`flex items-center gap-2 px-5 sm:px-6 py-4 font-semibold text-sm transition-all ${activeTab === tab.key ? 'text-gray-900 border-b-2 border-gray-900' : 'text-gray-400 hover:text-gray-600'} ${tab.disabled ? 'opacity-40 cursor-not-allowed' : ''}`}>
                    {tab.icon} {tab.label}
                  </button>
                ))}
              </div>

              <div className="p-5 sm:p-8">
                {activeTab === 'input' && (
                  <div className="space-y-7">
                    {/* ─── Identity ─── */}
                    <div>
                      <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2"><span className="w-5 h-5 rounded-md bg-teal-50 text-teal-600 flex items-center justify-center text-[10px] font-bold">1</span> Data Identitas</h3>
                      <div className="grid sm:grid-cols-2 gap-4">
                        {[{ n: 'namaKelurahan', l: 'Nama Kelurahan', p: 'Contoh: Sukamaju' }, { n: 'namaPosyandu', l: 'Nama Posyandu', p: 'Contoh: Mawar' }, { n: 'namaBalita', l: 'Nama Lengkap Balita *', p: 'Wajib nama lengkap (untuk pencocokan)' }, { n: 'namaIbu', l: 'Nama Lengkap Ibu *', p: 'Wajib nama lengkap (untuk pencocokan)' }].map(f => (
                          <div key={f.n}><label className="block text-sm font-medium text-gray-600 mb-1.5">{f.l}</label><input type="text" name={f.n} value={formData[f.n]} onChange={handleInputChange} className={inputClass} placeholder={f.p} /></div>
                        ))}
                        <div><label className="block text-sm font-medium text-gray-600 mb-1.5">Tanggal Pengukuran *</label><CustomDatePicker name="tanggalPengukuran" value={formData.tanggalPengukuran} onChange={handleInputChange} placeholder="Pilih tanggal" /></div>
                        <div><label className="block text-sm font-medium text-gray-600 mb-1.5">Tanggal Lahir *</label><CustomDatePicker name="tanggalLahir" value={formData.tanggalLahir} onChange={handleInputChange} placeholder="Pilih tanggal" defaultYear={new Date().getFullYear() - 2} /></div>
                        <div><label className="block text-sm font-medium text-gray-600 mb-1.5">Jenis Kelamin *</label><CustomDropdown name="jenisKelamin" value={formData.jenisKelamin} onChange={handleInputChange} placeholder="Pilih" options={[{ value: 'Laki-Laki', label: 'Laki-Laki' }, { value: 'Perempuan', label: 'Perempuan' }]} /></div>
                        <div><label className="block text-sm font-medium text-gray-600 mb-1.5">Umur (bulan)</label><input type="number" name="usiaBulan" value={formData.usiaBulan} className={`${inputClass} bg-gray-100`} placeholder="Terhitung Otomatis" readOnly /></div>
                      </div>
                    </div>

                    <div className="border-t border-gray-100" />

                    {/* ─── Anthropometry ─── */}
                    <div>
                      <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2"><span className="w-5 h-5 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center text-[10px] font-bold">2</span> Antropometri</h3>
                      <div className="grid sm:grid-cols-2 gap-4">
                        {[{ n: 'beratBadan', l: 'Berat badan (kg) *', p: '12.5' }, { n: 'tinggiBadan', l: 'Tinggi badan (cm) *', p: '85.5' }, { n: 'lingkarKepala', l: 'Lingkar kepala (cm)', p: '46.5' }, { n: 'lila', l: 'LiLA (cm)', p: '14.0' }].map(f => (
                          <div key={f.n}><label className="block text-sm font-medium text-gray-600 mb-1.5">{f.l}</label><input type="number" step="0.1" name={f.n} value={formData[f.n]} onChange={handleInputChange} className={inputClass} placeholder={f.p} /></div>
                        ))}
                        <div className="sm:col-span-2"><label className="block text-sm font-medium text-gray-600 mb-1.5">Kondisi BB dari bulan lalu</label><CustomDropdown name="kondisiBeratBadan" value={formData.kondisiBeratBadan} onChange={handleInputChange} placeholder="Pilih kondisi" options={[{ value: 'naik', label: 'Naik' }, { value: 'turun', label: 'Turun' }, { value: 'tetap', label: 'Tetap' }]} /></div>
                      </div>
                    </div>

                    <div className="border-t border-gray-100" />

                    {/* ─── Birth ─── */}
                    <div>
                      <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2"><span className="w-5 h-5 rounded-md bg-violet-50 text-violet-600 flex items-center justify-center text-[10px] font-bold">3</span> Data Kelahiran</h3>
                      <div className="grid sm:grid-cols-2 gap-4">
                        {[{ n: 'usiaKehamilan', l: 'Usia kehamilan (bulan)', p: '9' }, { n: 'beratLahir', l: 'Berat lahir (kg)', p: '3.2' }, { n: 'tinggiLahir', l: 'Panjang lahir (cm)', p: '49.5' }].map(f => (
                          <div key={f.n}><label className="block text-sm font-medium text-gray-600 mb-1.5">{f.l}</label><input type="number" step="0.1" name={f.n} value={formData[f.n]} onChange={handleInputChange} className={inputClass} placeholder={f.p} /></div>
                        ))}
                        <div className="sm:col-span-2"><label className="block text-sm font-medium text-gray-600 mb-1.5">Catatan <span className="text-gray-400">(opsional)</span></label><textarea name="rekomendasiGizi" value={formData.rekomendasiGizi} onChange={handleInputChange} className={`${inputClass} resize-none`} rows="3" placeholder="Catatan tambahan" /></div>
                      </div>
                    </div>

                    {/* Error */}
                    {predictError && (
                      <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl p-4 text-sm font-medium flex items-start gap-2">
                        <AlertCircle size={16} className="mt-0.5 flex-shrink-0" /> {predictError}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                      <button onClick={handleSubmit} disabled={isPredicting}
                        className="flex-1 py-3.5 bg-gradient-to-r from-teal-500 to-sky-600 text-white rounded-xl font-semibold text-sm hover:opacity-90 transition-all hover:shadow-lg hover:shadow-teal-500/25 flex items-center justify-center gap-2 disabled:opacity-50">
                        {isPredicting ? (
                          <><Loader2 size={16} className="animate-spin" /> Memproses...</>
                        ) : (
                          <><BarChart3 size={16} /> Prediksi Status Gizi</>
                        )}
                      </button>
                      <button onClick={handleReset} className="px-6 py-3.5 border border-gray-200 text-gray-600 rounded-xl font-semibold text-sm hover:bg-gray-50 transition-all flex items-center justify-center gap-2">
                        <RefreshCw size={16} /> Reset
                      </button>
                    </div>
                  </div>
                )}

                {/* ─── Result Tab ─── */}
                {activeTab === 'result' && predictionResult && (
                  <div ref={resultSectionRef} className="space-y-6">
                    <div>
                      <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2"><Sparkles size={14} className="text-teal-500" /> Prediksi Status Gizi</h3>
                      <div className="grid sm:grid-cols-3 gap-3">
                        {[
                          { label: 'BB/TB (Wasting)', value: predictionResult.bbtb, sub: 'Berat terhadap Tinggi' },
                          { label: 'BB/U', value: predictionResult.bbu, sub: 'Berat terhadap Umur' },
                          { label: 'TB/U (Stunting)', value: predictionResult.tbu, sub: 'Tinggi terhadap Umur' },
                        ].map((r, i) => (
                          <div key={i} className={`rounded-2xl p-5 border ${getStatusColor(r.value)}`}>
                            <p className="text-xs font-medium opacity-70 mb-1">{r.label}</p>
                            <p className="text-lg font-bold">{r.value || '-'}</p>
                            <p className="text-[11px] opacity-60 mt-1">{r.sub}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {rekomendasiResult && (
                      <div>
                        <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2"><ClipboardList size={14} className="text-violet-500" /> Rekomendasi Intervensi</h3>
                        <div className="bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-200 rounded-2xl p-5 sm:p-6 space-y-4">
                          <div>
                            <p className="text-xs font-medium text-violet-500 uppercase tracking-wide mb-1">Rekomendasi Utama</p>
                            <p className="text-base font-bold text-violet-900">{rekomendasiResult.rekomendasi_utama}</p>
                          </div>
                          {rekomendasiResult.rekomendasi_tambahan?.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-violet-500 uppercase tracking-wide mb-2">Rekomendasi Tambahan</p>
                              <ul className="space-y-1.5">
                                {rekomendasiResult.rekomendasi_tambahan.map((r, i) => (
                                  <li key={i} className="flex items-start gap-2 text-sm text-violet-800">
                                    <span className="w-5 h-5 rounded-md bg-violet-100 text-violet-600 flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5">{i + 1}</span>
                                    {r}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {rekomendasiResult.catatan && (
                            <div className="pt-3 border-t border-violet-200/50">
                              <p className="text-xs font-medium text-violet-500 uppercase tracking-wide mb-1">Catatan</p>
                              <p className="text-sm text-violet-700">{rekomendasiResult.catatan}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-3">
                      <button onClick={handleSaveData} disabled={isSaving} className="flex-1 py-3.5 bg-gradient-to-r from-teal-500 to-sky-600 text-white rounded-xl font-semibold text-sm hover:opacity-90 transition-all hover:shadow-lg hover:shadow-teal-500/25 flex items-center justify-center gap-2 disabled:opacity-60">{isSaving ? <><Loader2 size={16} className="animate-spin" /> Menyimpan...</> : <><Save size={16} /> Simpan Data</>}</button>
                      <button onClick={() => { handleReset(); setActiveTab('input'); }} className="flex-1 py-3.5 border border-gray-200 text-gray-600 rounded-xl font-semibold text-sm hover:bg-gray-50 transition-all flex items-center justify-center gap-2"><Plus size={16} /> Input Anak Berikutnya</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ─── Sidebar ─── */}
          <div className="lg:col-span-1">
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-gray-100 p-6 sticky top-24 shadow-sm hover:shadow-lg transition-shadow duration-500">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Data Terbaru</h3>
                <Calendar size={16} className="text-gray-400" />
              </div>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input type="text" placeholder="Cari nama..." value={searchRecent} onChange={(e) => setSearchRecent(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-gray-900 focus:ring-2 focus:ring-gray-900/5 outline-none transition-all placeholder:text-gray-400" />
              </div>
              <div className="space-y-2 max-h-[360px] overflow-y-auto">
                {filteredRecent.length === 0 ? (
                  <div className="text-center py-10 text-gray-400">
                    <Users size={28} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Belum ada data</p>
                  </div>
                ) : filteredRecent.map((d) => {
                  const usiaBulan = (d.tanggal_lahir && d.tanggal_pengukuran)
                    ? Math.floor((new Date(d.tanggal_pengukuran) - new Date(d.tanggal_lahir)) / (1000 * 60 * 60 * 24 * 30.44))
                    : null;
                  const usiaTeks = usiaBulan !== null
                    ? usiaBulan >= 12 ? `${Math.floor(usiaBulan / 12)} th ${usiaBulan % 12} bln` : `${usiaBulan} bulan`
                    : null;
                  const giziRows = [
                    { label: 'BB/TB', value: d.status_gizi_bbtb },
                    { label: 'BB/U',  value: d.status_gizi_bbu },
                    { label: 'TB/U',  value: d.status_gizi_tbu },
                  ].filter(r => r.value);
                  return (
                    <div key={d.uuid || d.id} className="p-3.5 rounded-xl hover:bg-gray-50 transition cursor-pointer group border border-transparent hover:border-gray-100">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h4 className="font-semibold text-gray-900 text-sm truncate">{d.nama_balita || d.nama}</h4>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {d.jenis_kelamin}{usiaTeks ? ` · ${usiaTeks}` : ''}
                            {d.tanggal_pengukuran ? ` · ${new Date(d.tanggal_pengukuran).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}` : ''}
                          </p>
                          {giziRows.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {giziRows.map(r => (
                                <div key={r.label} className="flex items-center gap-1.5">
                                  <span className="text-[10px] font-bold text-gray-400 w-8 flex-shrink-0">{r.label}</span>
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getStatusColor(r.value)}`}>{r.value}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <ArrowRight size={14} className="text-gray-300 group-hover:text-gray-500 transition flex-shrink-0 mt-1" />
                      </div>
                    </div>
                  );
                })}
              </div>
              <button onClick={() => router.push('/data-balita')} className="w-full mt-4 py-3 bg-gray-50 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-100 transition flex items-center justify-center gap-1.5">
                Lihat Semua <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Link Code Modal ─── */}
      {showLinkCodeModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-8 text-center shadow-2xl animate-scale-in">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-400 to-sky-600 flex items-center justify-center mx-auto mb-5">
              <Link2 size={28} className="text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Kode Hubung</h3>
            <p className="text-sm text-gray-500 mb-6">Berikan kode ini kepada orang tua agar mereka mengisi form yang terhubung ke anak yang sama.</p>

            <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-2xl p-6 mb-6">
              <p className="text-4xl font-mono font-extrabold text-gray-900 tracking-[0.3em]">{linkCode}</p>
            </div>

            <button onClick={() => handleCopyCode(linkCode)}
              className="w-full py-3.5 bg-gradient-to-r from-teal-500 to-sky-600 text-white rounded-xl font-semibold text-sm hover:opacity-90 transition-all hover:shadow-lg hover:shadow-teal-500/25 flex items-center justify-center gap-2 mb-3">
              {codeCopied ? <><Check size={16} /> Disalin!</> : <><Copy size={16} /> Salin Kode</>}
            </button>
            <button onClick={() => { setShowLinkCodeModal(false); handleReset(); setActiveTab('input'); }}
              className="w-full py-3 text-gray-500 text-sm font-medium hover:text-gray-700 transition">
              Lanjut Input Anak Berikutnya →
            </button>
          </div>
        </div>
      )}

      <SuccessModal isOpen={showSuccessModal} onClose={handleCloseModal} onViewAll={() => { setShowSuccessModal(false); router.push('/data-balita'); }} title="Data Berhasil Disimpan!" message="Data pertumbuhan anak telah berhasil direkam ke dalam sistem." />
    </div>
  );
}
