'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Users, TrendingUp, AlertTriangle, Activity, Download, ChevronDown,
  BarChart3, PieChart, LogOut, User, Search, ArrowRight, Baby,
  Heart, Shield, FileText, Loader2, AlertCircle, CheckCircle2,
  ChevronRight, ExternalLink, MapPin, Calendar, Scale, Ruler, Clock, UserPlus
} from 'lucide-react';
import { useToast } from '@/components/common/Toast';
import { clearAuth, getUserData, apiFetch, isAuthenticated } from '@/utils/auth';

// ─── Mini Bar Chart (pure CSS) ─────────────────────
function MiniBar({ data, colors, maxVal }) {
  const max = maxVal || Math.max(...data.map(d => d.value), 1);
  return (
    <div className="flex items-end gap-1.5 h-20">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <span className="text-[9px] font-bold text-gray-500">{d.value}</span>
          <div className="w-full rounded-t-md transition-all duration-700" style={{ height: `${Math.max((d.value / max) * 100, 4)}%`, background: colors[i % colors.length] }} />
          <span className="text-[8px] text-gray-400 truncate max-w-full text-center leading-tight" title={d.label}>{d.label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Donut Chart (SVG) ─────────────────────
function DonutChart({ data, colors, size = 120 }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const r = (size - 16) / 2;
  const cx = size / 2, cy = size / 2;
  const circumference = 2 * Math.PI * r;
  let cumulativePercent = 0;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      {data.map((d, i) => {
        const percent = d.value / total;
        const strokeDasharray = `${circumference * percent} ${circumference * (1 - percent)}`;
        const strokeDashoffset = -circumference * cumulativePercent;
        cumulativePercent += percent;
        return (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none" strokeWidth="14" stroke={colors[i % colors.length]}
            strokeDasharray={strokeDasharray} strokeDashoffset={strokeDashoffset} strokeLinecap="round"
            className="transition-all duration-1000"
          />
        );
      })}
    </svg>
  );
}

// ─── Severity badge ────────────────────────
function StatusBadge({ status }) {
  if (!status) return <span className="text-xs text-gray-400">-</span>;
  const s = status.toLowerCase();
  let cls = 'bg-gray-100 text-gray-500 border-gray-200';
  if (s.includes('gizi baik') || s.includes('normal') || s.includes('berat badan normal')) cls = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  else if (s.includes('gizi buruk') || s.includes('sangat pendek') || s.includes('sangat kurang')) cls = 'bg-red-50 text-red-700 border-red-200';
  else if (s.includes('gizi kurang') || s.includes('pendek') || s.includes('kurang')) cls = 'bg-amber-50 text-amber-700 border-amber-200';
  else if (s.includes('gizi lebih') || s.includes('tinggi') || s.includes('lebih')) cls = 'bg-blue-50 text-blue-700 border-blue-200';
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cls}`}>{status}</span>;
}

export default function KelurahanDashboard() {
  const router = useRouter();
  const toast = useToast();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [searchUrgent, setSearchUrgent] = useState('');
  const profileRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/login'); return; }
    const u = getUserData();
    const role = u?.role;
    if (role !== 'kelurahan' && role !== 'puskesmas') {
      if (role === 'orang_tua') router.replace('/orang-tua');
      else if (role === 'ahli_gizi') router.replace('/konsultasi');
      else router.replace('/kader');
      return;
    }
    setUserData(u);
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/kelurahan/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      } else {
        toast.error('Gagal Memuat', 'Tidak berhasil mengambil data dashboard.');
      }
    } catch (e) {
      console.error(e);
      toast.error('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const res = await apiFetch('/api/kelurahan/export');
      if (!res.ok) throw new Error('Gagal mengunduh');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `laporan_gizi_balita_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Berhasil', 'Laporan Excel berhasil diunduh.');
    } catch (e) {
      toast.error('Gagal', e.message);
    } finally {
      setIsDownloading(false);
    }
  };

  // Click outside
  useEffect(() => {
    const h = (e) => { if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false); };
    if (profileOpen) document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [profileOpen]);

  const handleLogout = () => { clearAuth(); router.push('/login'); };

  // ── Chart color themes ──
  const wastingColors = ['#10b981', '#fbbf24', '#ef4444', '#3b82f6', '#9ca3af'];
  const stuntingColors = ['#06b6d4', '#f97316', '#ef4444', '#8b5cf6', '#9ca3af'];
  const trendColor = '#3b82f6';

  // ── Process stats data ──
  const totalBalita = stats?.totalBalita || 0;
  const balitaBerisiko = stats?.balitaBerisiko || 0;
  const prevalensiRisiko = totalBalita > 0 ? ((balitaBerisiko / totalBalita) * 100).toFixed(1) : '0.0';

  const filteredUrgent = (stats?.urgentCases || []).filter(c =>
    !searchUrgent || (c.nama || '').toLowerCase().includes(searchUrgent.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={32} className="animate-spin text-gray-400 mx-auto mb-3" />
          <p className="text-sm text-gray-500 font-medium">Memuat dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa] page-enter mesh-bg bg-orbs relative">
      {/* Decorative blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-32 -right-40 w-96 h-96 bg-violet-400/[0.04] rounded-full blur-[100px] animate-float-slow" />
        <div className="absolute top-1/2 -left-40 w-[500px] h-[500px] bg-teal-400/[0.03] rounded-full blur-[120px] animate-float-slow-reverse" />
        <div className="absolute -bottom-40 right-1/4 w-80 h-80 bg-sky-400/[0.03] rounded-full blur-[100px] animate-float-slow" />
      </div>
      {/* ─── Header ─── */}
      <div className="sticky top-0 z-40 bg-[#fafafa] px-3 sm:px-4 pt-3 pb-2">
        <header className="max-w-[1400px] mx-auto rounded-2xl bg-white/95 backdrop-blur-xl shadow-lg shadow-black/[0.05] border border-gray-100 px-4 sm:px-6 h-14 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2.5 group hover:opacity-80 transition-opacity">
            <div className="w-9 h-9 rounded-xl overflow-hidden shadow-sm group-hover:shadow-violet-200 transition-shadow duration-300">
              <img src="/growell-logo.png" alt="Growell" className="w-full h-full object-cover" />
            </div>
            <span className="text-base font-bold text-gray-900 tracking-tight">Growell</span>
            <span className="hidden sm:block text-sm text-gray-400 font-normal">&middot; Kelurahan</span>
          </Link>
          <div className="flex items-center gap-3">
            <button onClick={handleDownload} disabled={isDownloading}
              className="hidden sm:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-500 to-sky-600 text-white rounded-xl text-sm font-medium hover:shadow-lg hover:shadow-teal-500/25 transition-all disabled:opacity-50">
              {isDownloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              <span className="hidden md:inline">Unduh Laporan</span>
            </button>
            <div className="relative" ref={profileRef}>
              <button onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-violet-500 to-indigo-600 text-white rounded-xl text-sm font-semibold hover:shadow-lg hover:shadow-violet-500/25 transition-all">
                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
                  {(userData?.nama || 'K').charAt(0)}
                </div>
                <span className="hidden sm:block max-w-[100px] truncate">{userData?.nama?.split(' ')[0] || 'Kelurahan'}</span>
                <ChevronDown size={13} className={`transition-transform duration-200 ${profileOpen ? 'rotate-180' : ''}`} />
              </button>
              {profileOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl shadow-black/10 border border-gray-100 overflow-hidden z-50">
                  <div className="p-1.5">
                    <button onClick={() => { setProfileOpen(false); router.push('/profile'); }} className="w-full px-3 py-2.5 text-left rounded-xl hover:bg-gray-50 flex items-center gap-3 text-sm text-gray-700 transition font-medium"><User size={15} className="text-violet-600" />Profil Saya</button>
                    <div className="my-1 border-t border-gray-100" />
                    <button onClick={handleLogout} className="w-full px-3 py-2.5 text-left rounded-xl hover:bg-red-50 flex items-center gap-3 text-sm text-red-600 transition font-medium"><LogOut size={15} />Keluar</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-6">
      </div>

      {/* ─── Hero Section ─── */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Dashboard <span className="gradient-text-static">Pemantauan Gizi</span></h1>
            <p className="text-sm text-gray-500 mt-1.5">Ringkasan status gizi balita di wilayah kelurahan. Diperbarui: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => router.push('/kelurahan/buat-akun')}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-500 to-indigo-600 text-white rounded-xl text-sm font-semibold hover:shadow-lg hover:shadow-violet-500/25 hover:opacity-90 transition-all">
              <UserPlus size={15} /> Kelola Akun Petugas
            </button>
            <button onClick={handleDownload} disabled={isDownloading}
              className="sm:hidden flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-800 transition-all disabled:opacity-50 justify-center">
              {isDownloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Unduh Laporan CSV
            </button>
          </div>
        </div>

        {/* ─── KPI Cards ─── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8 stagger-grid">
          {[
            { icon: <Baby size={20} />, label: 'Total Balita', value: totalBalita, color: 'text-cyan-600', bg: 'bg-cyan-50', sub: 'Terdaftar aktif', glow: 'hover:shadow-cyan-100/60' },
            { icon: <AlertTriangle size={20} />, label: 'Balita Berisiko', value: balitaBerisiko, color: 'text-red-600', bg: 'bg-red-50', sub: `${prevalensiRisiko}% prevalensi`, glow: 'hover:shadow-red-100/60' },
            { icon: <Shield size={20} />, label: 'Balita Normal', value: Math.max(0, totalBalita - balitaBerisiko), color: 'text-emerald-600', bg: 'bg-emerald-50', sub: 'Status gizi baik', glow: 'hover:shadow-emerald-100/60' },
            { icon: <MapPin size={20} />, label: 'Posyandu', value: stats?.posyanduSummary?.length || 0, color: 'text-violet-600', bg: 'bg-violet-50', sub: 'Titik pantau aktif', glow: 'hover:shadow-violet-100/60' },
          ].map((s, i) => (
            <div key={i} className={`stat-card card-shine bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-xl ${s.glow} transition-all duration-500 hover:-translate-y-1`}>
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center ${s.color} glow-pulse`}>{s.icon}</div>
                <span className="text-2xl sm:text-3xl font-extrabold text-gray-900 count-up tabular-nums">{s.value}</span>
              </div>
              <p className="text-xs sm:text-sm font-semibold text-gray-700">{s.label}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* ─── Charts Row 1: Status Gizi ─── */}
        <div className="grid lg:grid-cols-3 gap-4 sm:gap-5 mb-6 section-appear section-appear-delay-1">
          {/* Wasting (BB/TB) */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-gray-100 p-6 hover:shadow-lg transition-all duration-500">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Status Gizi BB/TB</h3>
                <p className="text-[11px] text-gray-400 mt-0.5">Wasting · Berat terhadap Tinggi</p>
              </div>
              <Scale size={16} className="text-gray-300" />
            </div>
            {stats?.statusBBTB?.length > 0 ? (
              <div className="flex items-center gap-6">
                <DonutChart data={stats.statusBBTB.map(s => ({ label: s.status, value: s.jumlah }))} colors={wastingColors} size={100} />
                <div className="flex-1 space-y-2">
                  {stats.statusBBTB.map((s, i) => (
                    <div key={s.status} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: wastingColors[i % wastingColors.length] }} />
                        <span className="text-gray-600 font-medium">{s.status}</span>
                      </div>
                      <span className="font-bold text-gray-900">{s.jumlah}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-400 text-center py-8">Belum ada data</p>
            )}
          </div>

          {/* Stunting (TB/U) */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Status Gizi TB/U</h3>
                <p className="text-[11px] text-gray-400 mt-0.5">Stunting · Tinggi terhadap Umur</p>
              </div>
              <Ruler size={16} className="text-gray-300" />
            </div>
            {stats?.statusTBU?.length > 0 ? (
              <div className="flex items-center gap-6">
                <DonutChart data={stats.statusTBU.map(s => ({ label: s.status, value: s.jumlah }))} colors={stuntingColors} size={100} />
                <div className="flex-1 space-y-2">
                  {stats.statusTBU.map((s, i) => (
                    <div key={s.status} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: stuntingColors[i % stuntingColors.length] }} />
                        <span className="text-gray-600 font-medium">{s.status}</span>
                      </div>
                      <span className="font-bold text-gray-900">{s.jumlah}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-400 text-center py-8">Belum ada data</p>
            )}
          </div>

          {/* Age Distribution */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-gray-100 p-6 hover:shadow-lg transition-all duration-500">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Distribusi Usia</h3>
                <p className="text-[11px] text-gray-400 mt-0.5">Kelompok usia balita (bulan)</p>
              </div>
              <Calendar size={16} className="text-gray-300" />
            </div>
            {stats?.ageDistribution?.length > 0 ? (
              <MiniBar
                data={stats.ageDistribution.map(a => ({ label: a.kelompok_usia, value: a.jumlah }))}
                colors={['#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#10b981']}
              />
            ) : (
              <p className="text-xs text-gray-400 text-center py-8">Belum ada data</p>
            )}
          </div>
        </div>

        {/* ─── Charts Row 2: Trend + Posyandu ─── */}
        <div className="grid lg:grid-cols-5 gap-4 sm:gap-5 mb-6 section-appear section-appear-delay-2">
          {/* Monthly Trend */}
          <div className="lg:col-span-3 bg-white/90 backdrop-blur-sm rounded-2xl border border-gray-100 p-6 hover:shadow-lg transition-all duration-500">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Tren Pengukuran Bulanan</h3>
                <p className="text-[11px] text-gray-400 mt-0.5">Jumlah pengukuran per bulan</p>
              </div>
              <TrendingUp size={16} className="text-gray-300" />
            </div>
            {stats?.monthlyTrend?.length > 0 ? (
              <div className="overflow-x-auto">
                <MiniBar
                  data={stats.monthlyTrend.map(m => ({
                    label: new Date(m.bulan + '-01').toLocaleDateString('id-ID', { month: 'short', year: '2-digit' }),
                    value: m.total_pengukuran
                  }))}
                  colors={['#3b82f6']}
                />
              </div>
            ) : (
              <p className="text-xs text-gray-400 text-center py-8">Belum ada data pengukuran</p>
            )}
          </div>

          {/* Gender Distribution */}
          <div className="lg:col-span-2 bg-white/90 backdrop-blur-sm rounded-2xl border border-gray-100 p-6 hover:shadow-lg transition-all duration-500">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Jenis Kelamin</h3>
                <p className="text-[11px] text-gray-400 mt-0.5">Distribusi balita</p>
              </div>
              <Users size={16} className="text-gray-300" />
            </div>
            {stats?.genderDistribution?.length > 0 ? (
              <div className="space-y-4">
                {stats.genderDistribution.map((g, i) => {
                  const pct = totalBalita > 0 ? ((g.jumlah / totalBalita) * 100).toFixed(0) : 0;
                  const color = g.jenis_kelamin === 'Laki-Laki' ? '#3b82f6' : '#ec4899';
                  return (
                    <div key={g.jenis_kelamin}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-medium text-gray-600">{g.jenis_kelamin}</span>
                        <span className="text-xs font-bold text-gray-900">{g.jumlah} ({pct}%)</span>
                      </div>
                      <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-gray-400 text-center py-8">Belum ada data</p>
            )}
          </div>
        </div>

        {/* ─── Row 3: Per-Posyandu + Top Rekomendasi ─── */}
        <div className="grid lg:grid-cols-5 gap-4 sm:gap-5 mb-6 section-appear section-appear-delay-3">
          {/* Per-Posyandu Table */}
          <div className="lg:col-span-3 bg-white/90 backdrop-blur-sm rounded-2xl border border-gray-100 p-6 hover:shadow-lg transition-all duration-500">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Ringkasan per Posyandu</h3>
                <p className="text-[11px] text-gray-400 mt-0.5">Distribusi balita dan risiko di setiap posyandu</p>
              </div>
              <MapPin size={16} className="text-gray-300" />
            </div>
            {stats?.posyanduSummary?.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-2.5 px-2 font-semibold text-gray-500 uppercase tracking-wider">Posyandu</th>
                      <th className="text-center py-2.5 px-2 font-semibold text-gray-500 uppercase tracking-wider">Balita</th>
                      <th className="text-center py-2.5 px-2 font-semibold text-gray-500 uppercase tracking-wider">Wasting</th>
                      <th className="text-center py-2.5 px-2 font-semibold text-gray-500 uppercase tracking-wider">Stunting</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.posyanduSummary.map((p, i) => (
                      <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
                        <td className="py-3 px-2">
                          <p className="font-semibold text-gray-900">{p.posyandu}</p>
                          {p.kelurahan && <p className="text-[10px] text-gray-400 mt-0.5">{p.kelurahan}</p>}
                        </td>
                        <td className="text-center py-3 px-2 font-bold text-gray-900">{p.total_balita}</td>
                        <td className="text-center py-3 px-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${p.berisiko_wasting > 0 ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                            {p.berisiko_wasting || 0}
                          </span>
                        </td>
                        <td className="text-center py-3 px-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${p.berisiko_stunting > 0 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
                            {p.berisiko_stunting || 0}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-gray-400 text-center py-8">Belum ada data posyandu</p>
            )}
          </div>

          {/* Top Rekomendasi */}
          <div className="lg:col-span-2 bg-white/90 backdrop-blur-sm rounded-2xl border border-gray-100 p-6 hover:shadow-lg transition-all duration-500">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Top Rekomendasi Intervensi</h3>
                <p className="text-[11px] text-gray-400 mt-0.5">Intervensi paling sering direkomendasikan</p>
              </div>
              <Heart size={16} className="text-gray-300" />
            </div>
            {stats?.topRekomendasi?.length > 0 ? (
              <div className="space-y-3">
                {stats.topRekomendasi.map((r, i) => {
                  const maxJumlah = stats.topRekomendasi[0]?.jumlah || 1;
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-700 font-medium leading-tight flex-1 mr-2">{r.rekomendasi_utama}</span>
                        <span className="text-xs font-bold text-gray-900 flex-shrink-0">{r.jumlah}</span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-violet-400 to-indigo-500 transition-all duration-700" style={{ width: `${(r.jumlah / maxJumlah) * 100}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <Heart size={24} className="mx-auto text-gray-200 mb-2" />
                <p className="text-xs text-gray-400">Belum ada rekomendasi yang dihasilkan</p>
              </div>
            )}
          </div>
        </div>

        {/* ─── Urgent Cases Table ─── */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-gray-100 p-6 mb-8 section-appear section-appear-delay-4 hover:shadow-lg transition-all duration-500">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <div>
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <AlertTriangle size={14} className="text-red-500" />
                Balita Memerlukan Intervensi Segera
              </h3>
              <p className="text-[11px] text-gray-400 mt-0.5">Status gizi buruk/kurang, stunting, atau underweight — prioritas tertinggi</p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input type="text" placeholder="Cari nama..." value={searchUrgent} onChange={(e) => setSearchUrgent(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:border-gray-900 focus:ring-2 focus:ring-gray-900/5 outline-none transition-all placeholder:text-gray-400" />
            </div>
          </div>

          {filteredUrgent.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2.5 px-3 font-semibold text-gray-500 uppercase tracking-wider">Nama Balita</th>
                    <th className="text-left py-2.5 px-3 font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Ibu</th>
                    <th className="text-center py-2.5 px-3 font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Usia</th>
                    <th className="text-center py-2.5 px-3 font-semibold text-gray-500 uppercase tracking-wider">BB/TB</th>
                    <th className="text-center py-2.5 px-3 font-semibold text-gray-500 uppercase tracking-wider">TB/U</th>
                    <th className="text-left py-2.5 px-3 font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Rekomendasi</th>
                    <th className="text-left py-2.5 px-3 font-semibold text-gray-500 uppercase tracking-wider hidden xl:table-cell">Posyandu</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUrgent.map((c, i) => {
                    const usia = c.tanggal_lahir ? Math.floor((new Date() - new Date(c.tanggal_lahir)) / (1000 * 60 * 60 * 24 * 30.44)) : '-';
                    return (
                      <tr key={c.uuid || i} className="border-b border-gray-50 hover:bg-red-50/30 transition group">
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center text-red-600 text-[10px] font-bold flex-shrink-0">
                              {(c.nama || '?').charAt(0)}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">{c.nama}</p>
                              <p className="text-[10px] text-gray-400">{c.jenis_kelamin}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-3 text-gray-600 hidden sm:table-cell">{c.nama_ibu || '-'}</td>
                        <td className="py-3.5 px-3 text-center text-gray-900 font-medium hidden md:table-cell">{usia} bln</td>
                        <td className="py-3.5 px-3 text-center"><StatusBadge status={c.status_gizi_bbtb} /></td>
                        <td className="py-3.5 px-3 text-center"><StatusBadge status={c.status_gizi_tbu} /></td>
                        <td className="py-3.5 px-3 hidden lg:table-cell">
                          <span className="text-[11px] text-violet-700 font-medium">{c.rekomendasi_utama || '-'}</span>
                        </td>
                        <td className="py-3.5 px-3 text-gray-500 hidden xl:table-cell">{c.posyandu_nama || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <CheckCircle2 size={32} className="mx-auto text-emerald-300 mb-2" />
              <p className="text-sm text-gray-500 font-medium">
                {searchUrgent ? 'Tidak ditemukan' : 'Tidak ada balita dengan status berisiko'}
              </p>
              <p className="text-xs text-gray-400 mt-1">Semua balita dalam kondisi gizi baik 🎉</p>
            </div>
          )}
        </div>

        {/* ─── Insight Cards ─── */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-16 stagger-grid">
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-2xl p-6 card-shine hover:shadow-xl hover:-translate-y-1 transition-all duration-500">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center"><BarChart3 size={18} className="text-blue-600" /></div>
              <h4 className="text-sm font-bold text-blue-900">Insight Prevalensi</h4>
            </div>
            <p className="text-[13px] text-blue-800 leading-relaxed">
              Dari <strong>{totalBalita}</strong> balita, <strong>{balitaBerisiko}</strong> ({prevalensiRisiko}%) teridentifikasi berisiko.
              {parseFloat(prevalensiRisiko) > 20 ? ' Prevalensi di atas 20% memerlukan perhatian khusus.' : parseFloat(prevalensiRisiko) > 10 ? ' Lanjutkan pemantauan rutin.' : ' Angka ini menunjukkan status yang relatif baik.'}
            </p>
          </div>

          <div className="bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-200 rounded-2xl p-6 card-shine hover:shadow-xl hover:-translate-y-1 transition-all duration-500">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center"><Heart size={18} className="text-violet-600" /></div>
              <h4 className="text-sm font-bold text-violet-900">Intervensi Prioritas</h4>
            </div>
            <p className="text-[13px] text-violet-800 leading-relaxed">
              {stats?.topRekomendasi?.[0]
                ? <>Intervensi yang paling sering dibutuhkan: <strong>{stats.topRekomendasi[0].rekomendasi_utama}</strong> ({stats.topRekomendasi[0].jumlah} kasus).</>
                : 'Belum ada data intervensi yang cukup untuk analisis.'}
            </p>
          </div>

          <div className="bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200 rounded-2xl p-6 sm:col-span-2 lg:col-span-1 card-shine hover:shadow-xl hover:-translate-y-1 transition-all duration-500">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center"><FileText size={18} className="text-emerald-600" /></div>
              <h4 className="text-sm font-bold text-emerald-900">Laporan & Evaluasi</h4>
            </div>
            <p className="text-[13px] text-emerald-800 leading-relaxed mb-3">
              Unduh laporan lengkap untuk evaluasi kelurahan dan intervensi spesifik per anak.
            </p>
            <button onClick={handleDownload} disabled={isDownloading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition disabled:opacity-50">
              {isDownloading ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />} Download Excel
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
