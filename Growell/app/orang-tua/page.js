'use client';
import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ClipboardList, MessageCircle, LogOut, User, ChevronDown, Utensils,
  HeartPulse, Baby, ChevronRight, Sparkles, Loader2, AlertTriangle,
  Scale, Ruler, Calendar, Search, X, CheckCircle2, LinkIcon, AlertCircle,
  PlusCircle, BookOpen, ExternalLink, Bell, MapPin, Clock, Info,
} from 'lucide-react';
import { isAuthenticated, getUserData, clearAuth } from '@/utils/auth';
import AppNavbar from '@/components/common/AppNavbar';
import CustomDatePicker from '@/components/forms/CustomDatePicker';
import CustomDropdown from '@/components/forms/CustomDropdown';

// ── Status Gizi badge ─────────────────────────────────────────────────────────
function StatusBadge({ label }) {
  if (!label) return <span className="text-xs text-gray-400 italic">Belum diukur</span>;
  const config = {
    'Gizi Baik':                 { bg: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-200', dot: 'bg-emerald-500' },
    'Berat Badan Normal':        { bg: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-200', dot: 'bg-emerald-500' },
    'Normal':                    { bg: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-200', dot: 'bg-emerald-500' },
    'Gizi Kurang':               { bg: 'bg-amber-50',   text: 'text-amber-700',   ring: 'ring-amber-200',   dot: 'bg-amber-500'   },
    'Berat Badan Kurang':        { bg: 'bg-amber-50',   text: 'text-amber-700',   ring: 'ring-amber-200',   dot: 'bg-amber-500'   },
    'Pendek':                    { bg: 'bg-amber-50',   text: 'text-amber-700',   ring: 'ring-amber-200',   dot: 'bg-amber-500'   },
    'Kurus':                     { bg: 'bg-amber-50',   text: 'text-amber-700',   ring: 'ring-amber-200',   dot: 'bg-amber-500'   },
    'Gizi Buruk':                { bg: 'bg-rose-50',    text: 'text-rose-700',    ring: 'ring-rose-200',    dot: 'bg-rose-500'    },
    'Berat Badan Sangat Kurang': { bg: 'bg-rose-50',    text: 'text-rose-700',    ring: 'ring-rose-200',    dot: 'bg-rose-500'    },
    'Sangat Pendek':             { bg: 'bg-rose-50',    text: 'text-rose-700',    ring: 'ring-rose-200',    dot: 'bg-rose-500'    },
    'Sangat Kurus':              { bg: 'bg-rose-50',    text: 'text-rose-700',    ring: 'ring-rose-200',    dot: 'bg-rose-500'    },
    'Gizi Lebih':                { bg: 'bg-sky-50',     text: 'text-sky-700',     ring: 'ring-sky-200',     dot: 'bg-sky-500'     },
    'Obesitas':                  { bg: 'bg-indigo-50',  text: 'text-indigo-700',  ring: 'ring-indigo-200',  dot: 'bg-indigo-500'  },
  };
  const c = config[label] ?? { bg: 'bg-gray-50', text: 'text-gray-600', ring: 'ring-gray-200', dot: 'bg-gray-400' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ring-1 ${c.bg} ${c.text} ${c.ring}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${c.dot}`} />
      {label}
    </span>
  );
}

// ── Age from DOB ──────────────────────────────────────────────────────────────
function hitungUsia(tanggalLahir) {
  if (!tanggalLahir) return null;
  const lahir = new Date(tanggalLahir);
  const now = new Date();
  const totalBulan = (now.getFullYear() - lahir.getFullYear()) * 12 + (now.getMonth() - lahir.getMonth());
  if (totalBulan < 1) return 'Baru lahir';
  if (totalBulan < 24) return `${totalBulan} bulan`;
  const tahun = Math.floor(totalBulan / 12);
  const sisa = totalBulan % 12;
  return sisa > 0 ? `${tahun} thn ${sisa} bln` : `${tahun} tahun`;
}

// ── Balita Card ───────────────────────────────────────────────────────────────
function BalitaCard({ balita }) {
  const usia = hitungUsia(balita.tanggal_lahir);
  const hasStatus = balita.status_gizi_bbu || balita.status_gizi_tbu || balita.status_gizi_bbtb;
  const isGirl = balita.jenis_kelamin === 'Perempuan';
  const gradFrom = isGirl ? 'from-pink-400 to-rose-500' : 'from-sky-400 to-indigo-500';
  const shadowColor = isGirl ? 'shadow-pink-500/20' : 'shadow-sky-500/20';
  const borderHover = isGirl ? 'hover:border-pink-200' : 'hover:border-sky-200';
  const accentBg = isGirl ? 'bg-pink-50' : 'bg-sky-50';
  const accentText = isGirl ? 'text-pink-400' : 'text-sky-400';

  return (
    <Link
      href={`/status/${balita.uuid}`}
      className={`group block bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl ${shadowColor} ${borderHover} hover:-translate-y-1 transition-all duration-300 overflow-hidden`}
    >
      <div className={`h-1.5 w-full bg-gradient-to-r ${gradFrom}`} />
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${gradFrom} flex items-center justify-center shadow-lg ${shadowColor} flex-shrink-0 group-hover:scale-105 transition-transform duration-300`}>
              <Baby className="text-white" size={20} />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-base leading-tight">{balita.nama}</p>
              <p className="text-xs text-gray-400 font-medium mt-0.5">{balita.jenis_kelamin} · {usia}</p>
            </div>
          </div>
          <div className={`flex-shrink-0 w-7 h-7 rounded-full ${accentBg} flex items-center justify-center group-hover:translate-x-0.5 transition-transform`}>
            <ChevronRight size={14} className="text-gray-400" />
          </div>
        </div>

        {(balita.berat_terakhir || balita.tinggi_terakhir) && (
          <div className="flex gap-3 mb-4">
            {balita.berat_terakhir && (
              <div className={`flex-1 flex items-center gap-2 ${accentBg} rounded-xl px-3 py-2.5`}>
                <Scale size={14} className={accentText} />
                <div>
                  <p className="text-xs text-gray-400 font-medium leading-none">Berat</p>
                  <p className="text-sm font-bold text-gray-800 mt-0.5">{balita.berat_terakhir} kg</p>
                </div>
              </div>
            )}
            {balita.tinggi_terakhir && (
              <div className={`flex-1 flex items-center gap-2 ${accentBg} rounded-xl px-3 py-2.5`}>
                <Ruler size={14} className={accentText} />
                <div>
                  <p className="text-xs text-gray-400 font-medium leading-none">Tinggi</p>
                  <p className="text-sm font-bold text-gray-800 mt-0.5">{balita.tinggi_terakhir} cm</p>
                </div>
              </div>
            )}
          </div>
        )}

        {hasStatus ? (
          <div>
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-2">Status Gizi Terbaru</p>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {balita.status_gizi_bbu  && <StatusBadge label={balita.status_gizi_bbu}  />}
              {balita.status_gizi_tbu  && <StatusBadge label={balita.status_gizi_tbu}  />}
              {balita.status_gizi_bbtb && <StatusBadge label={balita.status_gizi_bbtb} />}
            </div>
            {balita.rekomendasi_intervensi && (
              <div className="mt-3 bg-violet-50 rounded-xl p-3 border border-violet-100">
                <p className="text-[10px] text-violet-500 font-bold uppercase tracking-wider mb-1">Rekomendasi Intervensi</p>
                <p className="text-xs font-semibold text-violet-800 leading-snug">{balita.rekomendasi_intervensi}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-amber-50 rounded-xl px-3 py-2.5 border border-amber-100">
            <AlertTriangle size={14} className="text-amber-500 flex-shrink-0" />
            <p className="text-xs text-amber-700 font-medium">Belum ada pengukuran tercatat</p>
          </div>
        )}

        {balita.pengukuran_terakhir && (
          <div className="mt-4 pt-4 border-t border-gray-50 flex items-center gap-1.5 text-xs text-gray-400">
            <Calendar size={12} />
            <span>Diukur: {new Date(balita.pengukuran_terakhir).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
          </div>
        )}
      </div>
    </Link>
  );
}

// ── Klaim Modal ───────────────────────────────────────────────────────────────
function KlaimModal({ onClose, onSuccess }) {
  const [nama, setNama] = useState('');
  const [tanggalLahir, setTanggalLahir] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [preview, setPreview] = useState(null); // { balita, status }
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!nama.trim() || !tanggalLahir) { setError('Nama dan tanggal lahir wajib diisi.'); return; }
    setError(''); setPreview(null); setSuccessMsg('');
    setIsSearching(true);
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(
        `/api/balita/klaim?nama=${encodeURIComponent(nama.trim())}&tanggal_lahir=${tanggalLahir}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Terjadi kesalahan.'); return; }
      if (!data.found) { setError('Data balita tidak ditemukan. Pastikan nama lengkap dan tanggal lahir sesuai data Posyandu.'); return; }
      setPreview(data);
    } catch {
      setError('Gagal terhubung ke server.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleKlaim = async () => {
    setError(''); setIsClaiming(true);
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch('/api/balita/klaim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ nama: nama.trim(), tanggal_lahir: tanggalLahir }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Gagal menghubungkan data.'); return; }
      setSuccessMsg(data.message);
      setTimeout(() => { onSuccess(data.balita); }, 1200);
    } catch {
      setError('Gagal terhubung ke server.');
    } finally {
      setIsClaiming(false);
    }
  };

  const balita = preview?.balita;
  const status = preview?.status;
  const usia = balita ? hitungUsia(balita.tanggal_lahir) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl shadow-black/20 animate-fade-in-down">
        {/* Header — clipped independently so dropdown can overflow below */}
        <div className="bg-gradient-to-r from-teal-500 to-sky-600 px-6 py-5 rounded-t-3xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
                <LinkIcon size={18} className="text-white" />
              </div>
              <div>
                <h2 className="text-white font-bold text-base">Temukan Data Anak</h2>
                <p className="text-white/70 text-xs mt-0.5">Hubungkan data Posyandu ke akun Anda</p>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-colors">
              <X size={16} className="text-white" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Search Form */}
          <form onSubmit={handleSearch} className="space-y-3">
            <div className="relative">
              <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-gray-400">
                <User size={16} />
              </div>
              <input
                type="text"
                value={nama}
                onChange={(e) => { setNama(e.target.value); setPreview(null); setError(''); setSuccessMsg(''); }}
                placeholder="Nama lengkap balita (sesuai data Posyandu)"
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-teal-400 focus:bg-white focus:ring-2 focus:ring-teal-500/10 outline-none transition-all text-sm text-gray-800 placeholder:text-gray-400"
              />
            </div>
            <div>
              <CustomDatePicker
                name="tanggalLahirKlaim"
                value={tanggalLahir}
                onChange={(e) => { setTanggalLahir(e.target.value); setPreview(null); setError(''); setSuccessMsg(''); }}
                placeholder="Tanggal lahir balita"
                defaultYear={new Date().getFullYear() - 2}
              />
            </div>
            <button
              type="submit"
              disabled={isSearching}
              className="w-full py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {isSearching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              {isSearching ? 'Mencari...' : 'Cari Data Anak'}
            </button>
          </form>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2.5 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">
              <AlertCircle size={15} className="text-rose-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-rose-700 font-medium">{error}</p>
            </div>
          )}

          {/* Success */}
          {successMsg && (
            <div className="flex items-start gap-2.5 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
              <CheckCircle2 size={15} className="text-emerald-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-emerald-700 font-semibold">{successMsg}</p>
            </div>
          )}

          {/* Preview Card */}
          {balita && !successMsg && (
            <div className="border border-gray-100 rounded-2xl">
              {/* Mini preview header — clipped independently */}
              <div className={`h-1.5 w-full bg-gradient-to-r rounded-t-2xl ${balita.jenis_kelamin === 'Perempuan' ? 'from-pink-400 to-rose-400' : 'from-sky-400 to-indigo-400'}`} />
              <div className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${balita.jenis_kelamin === 'Perempuan' ? 'from-pink-400 to-rose-500' : 'from-sky-400 to-indigo-500'} flex items-center justify-center flex-shrink-0`}>
                    <Baby className="text-white" size={18} />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-sm">{balita.nama}</p>
                    <p className="text-xs text-gray-400">{balita.jenis_kelamin} · {usia}</p>
                  </div>
                </div>

                {balita.posyandu_nama && (
                  <p className="text-xs text-gray-500 mb-3 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-teal-400 rounded-full flex-shrink-0" />
                    Posyandu: <span className="font-semibold text-gray-700">{balita.posyandu_nama}</span>
                  </p>
                )}

                {/* Status */}
                {status === 'mine' && (
                  <div className="flex items-center gap-2 bg-sky-50 border border-sky-100 rounded-xl px-3 py-2.5 mb-3">
                    <CheckCircle2 size={14} className="text-sky-500 flex-shrink-0" />
                    <p className="text-xs text-sky-700 font-medium">Data ini sudah terhubung ke akun Anda.</p>
                  </div>
                )}
                {status === 'taken' && (
                  <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5 mb-3">
                    <AlertTriangle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700 font-medium">Data ini sudah terhubung ke akun orang tua lain. Hubungi admin Posyandu jika ada kesalahan.</p>
                  </div>
                )}

                {/* Claim button */}
                {status === 'available' && (
                  <button
                    onClick={handleKlaim}
                    disabled={isClaiming}
                    className="w-full py-2.5 bg-gradient-to-r from-teal-500 to-sky-600 hover:from-teal-600 hover:to-sky-700 text-white text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-teal-500/20 disabled:opacity-60"
                  >
                    {isClaiming ? <Loader2 size={15} className="animate-spin" /> : <LinkIcon size={15} />}
                    {isClaiming ? 'Menghubungkan...' : 'Hubungkan ke Akun Saya'}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Info note */}
          <p className="text-xs text-gray-400 text-center leading-relaxed">
            Gunakan nama lengkap dan tanggal lahir <strong>sesuai data yang dicatat di Posyandu</strong>.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function OrangTuaDashboard() {
  const router = useRouter();
  const [userData, setUserData] = useState(null);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const profileDropdownRef = useRef(null);

  const [balitaList, setBalitaList] = useState([]);
  const [balitaLoading, setBalitaLoading] = useState(true);
  const [showKlaimModal, setShowKlaimModal] = useState(false);
  const [showTambahModal, setShowTambahModal] = useState(false);
  const [unreadKonsultasi, setUnreadKonsultasi] = useState(0);

  const [articles, setArticles] = useState([]);
  const [articlesLoading, setArticlesLoading] = useState(true);

  const [jadwalPosyandu, setJadwalPosyandu] = useState([]);
  const [jadwalLoading, setJadwalLoading] = useState(true);
  const [subscribedPosyandus, setSubscribedPosyandus] = useState([]);
  const [notifLoading, setNotifLoading] = useState(null);

  // ── Auth guard ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated()) { router.replace('/login'); return; }
    const ud = getUserData();
    if (ud?.role !== 'orang_tua') { router.replace('/login'); return; }
    setUserData(ud);
  }, []);

  // ── Fetch linked balita ───────────────────────────────────────────────────
  const fetchBalita = async () => {
    setBalitaLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch('/api/balita?limit=10', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setBalitaList(json.data || []);
      }
    } catch (e) {
      console.error('Fetch balita error:', e);
    } finally {
      setBalitaLoading(false);
    }
  };

  const fetchArticles = async () => {
    try {
      const res = await fetch('/api/artikel');
      if (res.ok) {
        const json = await res.json();
        setArticles(json.data?.slice(0, 3) || []); // Ambil 3 aja buat dashboard
      }
    } catch (e) {
      console.error('Fetch articles error:', e);
    } finally {
      setArticlesLoading(false);
    }
  };

  useEffect(() => { 
    if (userData) {
      fetchBalita();
      fetchKonsultasi();
      fetchArticles();
      fetchJadwal();
    }
  }, [userData]);

  const fetchJadwal = async () => {
    setJadwalLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch('/api/orang-tua/jadwal', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setJadwalPosyandu(json.data || []);
        setSubscribedPosyandus(json.subscribed_posyandus || []);
      }
    } catch (e) {
      console.error('Fetch jadwal error:', e);
    } finally {
      setJadwalLoading(false);
    }
  };

  const toggleNotifPosyandu = async (posyanduId) => {
    setNotifLoading(posyanduId);
    const isSubscribed = subscribedPosyandus.includes(posyanduId);
    const action = isSubscribed ? 'remove' : 'add';
    
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch('/api/orang-tua/jadwal', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ posyandu_id: posyanduId, action }),
      });
      if (res.ok) {
        if (action === 'add') {
          setSubscribedPosyandus([...subscribedPosyandus, posyanduId]);
        } else {
          setSubscribedPosyandus(subscribedPosyandus.filter(id => id !== posyanduId));
        }
      }
    } catch (e) {
      console.error('Toggle notif error:', e);
    } finally {
      setNotifLoading(null);
    }
  };

  const fetchKonsultasi = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch('/api/konsultasi?status=aktif', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        const activeCons = json.data || [];
        const totalUnread = activeCons.reduce((sum, item) => sum + (item.unread_count || 0), 0);
        setUnreadKonsultasi(totalUnread);
      }
    } catch (e) {
      console.error('Fetch konsultasi error:', e);
    }
  };

  // ── Profile dropdown outside click ───────────────────────────────────────
  useEffect(() => {
    function handleOutside(e) {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target))
        setProfileDropdownOpen(false);
    }
    if (profileDropdownOpen) document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [profileDropdownOpen]);

  const handleLogout = async () => { await clearAuth(); router.replace('/login'); };

  // Called after successful klaim
  const handleKlaimSuccess = () => {
    setShowKlaimModal(false);
    fetchBalita(); // refresh list
  };

  if (!userData) return null;
  const firstName = userData.nama?.split(' ')[0] || 'Bunda';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col mesh-bg bg-orbs relative">
      {/* Decorative blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-32 -right-32 w-80 h-80 bg-teal-400/[0.05] rounded-full blur-[100px] animate-float-slow" />
        <div className="absolute top-1/3 -left-32 w-96 h-96 bg-sky-400/[0.04] rounded-full blur-[120px] animate-float-slow-reverse" />
        <div className="absolute -bottom-32 right-1/3 w-72 h-72 bg-emerald-400/[0.03] rounded-full blur-[100px] animate-float-slow" />
      </div>

      {/* Klaim Modal */}
      {showKlaimModal && (
        <KlaimModal
          onClose={() => setShowKlaimModal(false)}
          onSuccess={handleKlaimSuccess}
        />
      )}

      {showTambahModal && (
        <TambahAnakModal 
          onClose={() => setShowTambahModal(false)}
          onSuccess={() => {
            setShowTambahModal(false);
            fetchBalita();
          }}
        />
      )}

      {/* Navbar */}
      <AppNavbar maxWidth="max-w-5xl">
        <Link href="/" className="flex items-center gap-2.5 group hover:opacity-80 transition-opacity">
          <div className="w-9 h-9 rounded-xl overflow-hidden shadow-sm group-hover:shadow-teal-200 transition-shadow duration-300">
            <img src="/growell-logo.png" alt="Growell" className="w-full h-full object-cover" />
          </div>
          <span className="text-base font-bold text-gray-900 tracking-tight hidden sm:block">Growell</span>
        </Link>
        <div className="relative" ref={profileDropdownRef}>
          <button
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            className="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-teal-500 to-sky-600 text-white rounded-xl text-sm font-semibold hover:shadow-lg hover:shadow-teal-500/25 transition-all"
          >
            <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
              {(userData?.nama || 'U').charAt(0).toUpperCase()}
            </div>
            <span className="hidden sm:block">{firstName}</span>
            <ChevronDown size={13} className={`transition-transform duration-200 ${profileDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          {profileDropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl shadow-black/10 border border-gray-100 overflow-hidden z-50 animate-fade-in-down">
              <div className="p-1.5">
                <button onClick={() => { setProfileDropdownOpen(false); router.push('/profile'); }}
                  className="w-full px-3 py-2.5 text-left rounded-xl hover:bg-gray-50 flex items-center gap-3 text-sm text-gray-700 transition font-medium">
                  <User size={15} className="text-teal-500" /> Profil Saya
                </button>
                <div className="border-t border-gray-100 my-1" />
                <button onClick={handleLogout}
                  className="w-full px-3 py-2.5 text-left rounded-xl hover:bg-red-50 flex items-center gap-3 text-sm text-red-600 transition font-medium">
                  <LogOut size={15} /> Keluar
                </button>
              </div>
            </div>
          )}
        </div>
      </AppNavbar>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12 relative z-10">

        {/* Greeting */}
        <div className="mb-8 section-appear">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Halo, <span className="gradient-text-static">{firstName}</span> 👋
          </h1>
          <p className="text-gray-500 mt-2 text-sm sm:text-base">Pantau tumbuh kembang si kecil dan konsultasikan kebutuhan gizi bersama ahli kami.</p>
        </div>

        {/* ── ANAK SAYA SECTION ──────────────────────────────────────────────── */}
        <div className="mb-10 section-appear section-appear-delay-1">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Anak Saya</h2>
              <p className="text-xs text-gray-400 mt-0.5">Data balita yang terhubung ke akun Anda</p>
            </div>
            {balitaList.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowTambahModal(true)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-sky-600 hover:text-sky-700 bg-sky-50 hover:bg-sky-100 px-3 py-1.5 rounded-xl transition-all"
                >
                  <PlusCircle size={14} /> Anak Baru
                </button>
                <button
                  onClick={() => setShowKlaimModal(true)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-teal-600 hover:text-teal-700 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-xl transition-all"
                >
                  <LinkIcon size={14} /> Klaim Anak
                </button>
              </div>
            )}
          </div>

          {/* Loading */}
          {balitaLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="text-teal-500 animate-spin" />
            </div>
          )}

          {/* Balita grid */}
          {!balitaLoading && balitaList.length > 0 && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {balitaList.map((b) => <BalitaCard key={b.uuid} balita={b} />)}
            </div>
          )}

          {/* Empty state */}
          {!balitaLoading && balitaList.length === 0 && (
            <div className="bg-white border border-dashed border-gray-200 rounded-2xl px-6 py-10 flex flex-col items-center text-center">
              <div className="w-14 h-14 bg-teal-50 rounded-2xl flex items-center justify-center mb-4">
                <Baby size={26} className="text-teal-500" />
              </div>
              <h3 className="font-bold text-gray-800 text-base mb-1">Belum ada data anak</h3>
              <p className="text-sm text-gray-400 max-w-xs mb-6">
                Data anak Anda belum terhubung ke akun ini. Ada dua cara untuk menghubungkannya:
              </p>

              {/* Two options */}
              <div className="w-full max-w-sm space-y-3 text-left mb-2">
                {/* Option A: Klaim */}
                <div className="bg-teal-50 border border-teal-100 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-6 h-6 bg-teal-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs font-bold">A</span>
                    </div>
                    <p className="text-sm font-bold text-teal-800">Hubungkan data dari Posyandu</p>
                  </div>
                  <p className="text-xs text-teal-600 mb-3 pl-8">
                    Jika kader sudah menginput data anak Anda sebelumnya, hubungkan langsung tanpa perlu isi ulang.
                  </p>
                  <button
                    onClick={() => setShowKlaimModal(true)}
                    className="w-full py-2.5 bg-gradient-to-r from-teal-500 to-sky-600 text-white text-sm font-semibold rounded-xl shadow-lg shadow-teal-500/20 hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
                  >
                    <LinkIcon size={15} /> Klaim Data Anak
                  </button>
                </div>

                {/* Divider */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 border-t border-gray-200" />
                  <span className="text-xs text-gray-400 font-medium">atau</span>
                  <div className="flex-1 border-t border-gray-200" />
                </div>

                {/* Option B: Tambah Anak */}
                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-6 h-6 bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs font-bold">B</span>
                    </div>
                    <p className="text-sm font-bold text-gray-800">Daftarkan anak baru</p>
                  </div>
                  <p className="text-xs text-gray-500 mb-3 pl-8">
                    Jika anak Anda belum pernah didata di Posyandu manapun, Anda bisa membuat profilnya sendiri.
                  </p>
                  <button
                    onClick={() => setShowTambahModal(true)}
                    className="w-full py-2.5 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2 hover:shadow-md"
                  >
                    <PlusCircle size={15} className="text-teal-500" /> Tambah Anak Baru
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── JADWAL POSYANDU SECTION ──────────────────────────────────────────────── */}
        <div className="mb-10 section-appear section-appear-delay-1">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 gap-3">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Jadwal Posyandu Terdekat</h2>
              <p className="text-xs text-gray-400 mt-0.5">Pilih posyandu (🔔) untuk memantau dan mendapatkan pengingat H-1</p>
            </div>
          </div>

          {/* Loading */}
          {jadwalLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="text-teal-500 animate-spin" />
            </div>
          )}

          {/* Jadwal Grid */}
          {!jadwalLoading && jadwalPosyandu.length > 0 && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {jadwalPosyandu.map((jadwal) => {
                const isSubscribed = subscribedPosyandus.includes(jadwal.posyandu_id);
                return (
                <div key={jadwal.uuid} className={`bg-white rounded-2xl p-5 shadow-sm hover:-translate-y-1 transition-all duration-300 relative border-2 ${isSubscribed ? 'border-teal-400 shadow-teal-500/20' : 'border-gray-100 hover:shadow-xl'}`}>
                  <button 
                    onClick={() => toggleNotifPosyandu(jadwal.posyandu_id)}
                    disabled={notifLoading === jadwal.posyandu_id}
                    title={isSubscribed ? 'Matikan Notifikasi' : 'Nyalakan Notifikasi'}
                    className={`absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition-all ${isSubscribed ? 'bg-teal-500 text-white shadow-md shadow-teal-500/30' : 'bg-gray-100 text-gray-400 hover:bg-teal-50 hover:text-teal-500'} ${notifLoading === jadwal.posyandu_id ? 'opacity-50 cursor-not-allowed animate-pulse' : ''}`}
                  >
                    <Bell size={14} className={isSubscribed ? 'fill-current' : ''} />
                  </button>
                  <div className="flex items-start gap-4 mt-1">
                    <div className="w-12 h-12 bg-teal-50 rounded-xl flex flex-col items-center justify-center flex-shrink-0 border border-teal-100">
                      <span className="text-xs font-semibold text-teal-600 uppercase">
                        {new Date(jadwal.tanggal).toLocaleString('id-ID', { month: 'short' })}
                      </span>
                      <span className="text-lg font-bold text-teal-700 leading-none mt-0.5">
                        {new Date(jadwal.tanggal).getDate()}
                      </span>
                    </div>
                    <div className="pr-6">
                      <h3 className="font-bold text-gray-900 text-sm mb-1">{jadwal.posyandu_nama}</h3>
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                        <Clock size={12} />
                        <span>{jadwal.waktu_mulai ? jadwal.waktu_mulai.substring(0, 5) : '-'} - {jadwal.waktu_selesai ? jadwal.waktu_selesai.substring(0, 5) : 'Selesai'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Info size={12} />
                        <span className="line-clamp-1">{jadwal.kegiatan || 'Penimbangan rutin'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )})}
            </div>
          )}

          {/* Empty state */}
          {!jadwalLoading && jadwalPosyandu.length === 0 && (
            <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-8 text-center flex flex-col items-center">
              <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                <Calendar size={20} className="text-gray-400" />
              </div>
              <p className="text-sm font-semibold text-gray-700">Belum ada jadwal terdekat</p>
              <p className="text-xs text-gray-400 mt-1">Jadwal posyandu untuk anak Anda belum tersedia bulan ini.</p>
            </div>
          )}
        </div>

        {/* ── Main Action Cards ─────────────────────────────────────────────── */}
        <div className="grid sm:grid-cols-2 gap-4 sm:gap-6 section-appear section-appear-delay-2">
          <Link href="/orang-tua/kuesioner"
            className="group card-3d card-shine bg-white rounded-2xl p-6 sm:p-8 border border-gray-200 shadow-sm hover:shadow-2xl hover:border-teal-200 hover:-translate-y-2 transition-all duration-500 relative overflow-hidden">
            <div className="absolute -right-8 -top-8 w-32 h-32 bg-teal-50 rounded-full blur-2xl group-hover:bg-teal-100 transition-colors" />
            <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-sky-600 rounded-2xl flex items-center justify-center mb-5 shadow-lg shadow-teal-500/20 relative z-10 group-hover:scale-105 transition-transform">
              <ClipboardList className="text-white" size={22} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2 relative z-10">Isi Kuesioner Balita</h3>
            <p className="text-sm text-gray-500 leading-relaxed relative z-10">
              Catat data riwayat kesehatan, gizi, dan lingkungan hidup si kecil. Dipadukan sistem AI untuk menghasilkan prediksi status gizi yang akurat.
            </p>
            <div className="mt-5 inline-flex items-center text-sm font-semibold text-teal-600 group-hover:text-teal-700 relative z-10">
              Isi Kuesioner <span className="ml-1.5 group-hover:translate-x-1 transition-transform inline-block">→</span>
            </div>
          </Link>

          <Link href="/konsultasi"
            className="group card-3d card-shine bg-white rounded-2xl p-6 sm:p-8 border border-gray-200 shadow-sm hover:shadow-2xl hover:border-emerald-200 hover:-translate-y-2 transition-all duration-500 relative overflow-hidden">
            <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-emerald-50 rounded-full blur-2xl group-hover:bg-emerald-100 transition-colors" />
            <div className="relative inline-block mb-5 z-10 group-hover:scale-105 transition-transform">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <MessageCircle className="text-white" size={22} />
              </div>
              {unreadKonsultasi > 0 && (
                <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 border-2 border-white rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-md animate-pulse">
                  {unreadKonsultasi > 9 ? '9+' : unreadKonsultasi}
                </div>
              )}
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2 relative z-10">Konsultasi Ahli Gizi</h3>
            <p className="text-sm text-gray-500 leading-relaxed relative z-10">
              Tanyakan masalah asupan makan, berat badan, atau gangguan pertumbuhan langsung ke Ahli Gizi terverifikasi — kapan saja dan di mana saja.
            </p>
            <div className="mt-5 inline-flex items-center text-sm font-semibold text-emerald-600 group-hover:text-emerald-700 relative z-10">
              Mulai Konsultasi <span className="ml-1.5 group-hover:translate-x-1 transition-transform inline-block">→</span>
            </div>
          </Link>
        </div>

        {/* ── Edukasi Section ───────────────────────────────────────────────── */}
        <div className="mt-12 section-appear section-appear-delay-3">
          <div className="mb-5">
            <h2 className="text-xl font-bold text-gray-900">Tips Gizi &amp; Tumbuh Kembang</h2>
            <p className="text-sm text-gray-500 mt-1">Panduan ringkas untuk mendukung pertumbuhan balita yang optimal.</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-4 stagger-grid">
            {[
              { bg: 'bg-orange-50', icon: <Utensils className="text-orange-500" size={18} />, title: 'Isi Piringku (MP-ASI)', desc: 'Penuhi gizi balita dengan porsi seimbang: karbohidrat, protein hewani (telur/ikan/ayam), lemak sehat, serta buah & sayur warna-warni setiap hari.' },
              { bg: 'bg-pink-50', icon: <HeartPulse className="text-pink-500" size={18} />, title: 'Pola Asuh Responsif', desc: 'Jangan paksa anak makan. Ciptakan jadwal makan teratur dengan suasana yang menyenangkan dan biarkan anak mengenal makanan dengan eksplorasi.' },
              { bg: 'bg-sky-50', icon: <Baby className="text-sky-500" size={18} />, title: 'Sanitasi & Kebersihan', desc: 'Selalu cuci tangan menggunakan sabun sebelum memberi makan anak. Kebersihan lingkungan mencegah diare dan penyakit yang merusak status gizi.' },
            ].map((card, i) => (
              <div key={i} className="bg-white/90 backdrop-blur-sm border border-gray-100 rounded-2xl p-5 hover:border-gray-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-500 card-shine">
                <div className={`w-10 h-10 ${card.bg} rounded-xl flex items-center justify-center mb-4`}>{card.icon}</div>
                <h4 className="font-bold text-gray-900 text-sm mb-2">{card.title}</h4>
                <p className="text-xs text-gray-500 leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Artikel & Berita Terpercaya ───────────────────────────────────────────────── */}
        <div className="mt-12 mb-8 section-appear section-appear-delay-4">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Artikel Pilihan</h2>
              <p className="text-sm text-gray-500 mt-1">Berita terbaru seputar stunting dan gizi anak.</p>
            </div>
            <Link 
              href="/artikel" 
              className="flex items-center gap-1.5 text-sm font-semibold text-teal-600 hover:text-teal-700 bg-teal-50 hover:bg-teal-100 px-3 py-2 rounded-xl transition-all"
            >
              Lihat Lainnya <ChevronRight size={16} />
            </Link>
          </div>
          
          {articlesLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 size={24} className="text-teal-500 animate-spin" />
            </div>
          ) : (
            <div className="grid sm:grid-cols-3 gap-4 stagger-grid">
              {articles.map((article, i) => (
                <a key={i} href={article.url} target="_blank" rel="noopener noreferrer" className="group flex flex-col justify-between bg-white/90 backdrop-blur-sm border border-gray-100 rounded-2xl p-5 hover:border-teal-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-500 card-shine relative overflow-hidden">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-teal-600 bg-teal-50 px-2 py-1 rounded-md">{article.source}</span>
                      <ExternalLink size={14} className="text-gray-400 group-hover:text-teal-500 transition-colors" />
                    </div>
                    <h4 className="font-bold text-gray-900 text-sm mb-2 group-hover:text-teal-700 transition-colors">{article.title}</h4>
                    <p className="text-xs text-gray-500 leading-relaxed line-clamp-3">{article.desc}</p>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// ── Tambah Anak Modal ────────────────────────────────────────────────────────
function TambahAnakModal({ onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    nama: '',
    tanggal_lahir: '',
    jenis_kelamin: '',
    berat_lahir: '',
    panjang_lahir: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nama.trim() || !formData.tanggal_lahir || !formData.jenis_kelamin) {
      setError('Nama, tanggal lahir, dan jenis kelamin wajib diisi.');
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch('/api/balita', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Terjadi kesalahan.'); return; }
      onSuccess(data.balita);
    } catch {
      setError('Gagal terhubung ke server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl shadow-black/20 animate-fade-in-down max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-teal-500 to-sky-600 px-6 py-5 rounded-t-3xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
                <PlusCircle size={18} className="text-white" />
              </div>
              <div>
                <h2 className="text-white font-bold text-base">Tambah Data Anak</h2>
                <p className="text-white/70 text-xs mt-0.5">Daftarkan profil dasar balita Anda</p>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-colors">
              <X size={16} className="text-white" />
            </button>
          </div>
        </div>

        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Nama Lengkap Balita *</label>
              <input
                type="text"
                value={formData.nama}
                onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                placeholder="Contoh: Budi Santoso"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-teal-400 focus:bg-white focus:ring-2 focus:ring-teal-500/10 outline-none transition-all text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Tanggal Lahir *</label>
              <CustomDatePicker
                name="tanggalLahirTambah"
                value={formData.tanggal_lahir}
                onChange={(e) => setFormData({ ...formData, tanggal_lahir: e.target.value })}
                placeholder="Pilih Tanggal"
                defaultYear={new Date().getFullYear() - 1}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Jenis Kelamin *</label>
              <CustomDropdown
                name="jenis_kelamin"
                value={formData.jenis_kelamin}
                onChange={(e) => setFormData({ ...formData, jenis_kelamin: e.target.value })}
                placeholder="-- Pilih --"
                options={[
                  { value: 'Laki-Laki', label: 'Laki-Laki' },
                  { value: 'Perempuan', label: 'Perempuan' }
                ]}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Berat Lahir (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.berat_lahir}
                  onChange={(e) => setFormData({ ...formData, berat_lahir: e.target.value })}
                  placeholder="Contoh: 3.2"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-teal-400 focus:bg-white focus:ring-2 focus:ring-teal-500/10 outline-none transition-all text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Panjang Lahir (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.panjang_lahir}
                  onChange={(e) => setFormData({ ...formData, panjang_lahir: e.target.value })}
                  placeholder="Contoh: 49.5"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-teal-400 focus:bg-white focus:ring-2 focus:ring-teal-500/10 outline-none transition-all text-sm"
                />
              </div>
            </div>

            {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 mt-2 bg-gradient-to-r from-teal-500 to-sky-600 hover:from-teal-600 hover:to-sky-700 text-white text-sm font-semibold rounded-xl transition-all shadow-md flex justify-center items-center disabled:opacity-70"
            >
              {isSubmitting ? 'Menyimpan...' : 'Simpan Data'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
