'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Search, Users, CheckCircle2, AlertCircle } from 'lucide-react';
import CustomDropdown from '@/components/forms/CustomDropdown';
import { apiFetch, isAuthenticated } from '@/utils/auth';

export default function ListDataBalita() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [dataBalita, setDataBalita] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [dashStats, setDashStats] = useState({ total_balita: 0, normal: 0, risiko: 0 });

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/login'); return; }
    fetchDashStats();
    fetchBalita();
  }, []);

  useEffect(() => {
    fetchBalita();
  }, [page, searchTerm]);

  const fetchDashStats = async () => {
    try {
      const res = await apiFetch('/api/pengukuran/stats/dashboard');
      if (res.ok) {
        const data = await res.json();
        setDashStats({
          total_balita: data.totalBalita || 0,
          normal: data.normalBalita || 0,
          risiko: data.balitaBerisiko || 0,
        });
      }
    } catch (e) { console.error('Stats error:', e); }
  };

  const fetchBalita = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: '15' });
      if (searchTerm) params.set('search', searchTerm);
      const res = await apiFetch(`/api/balita?${params}`);
      if (res.ok) {
        const data = await res.json();
        setDataBalita(data.data || []);
        setTotalPages(data.pagination?.totalPages || 1);
      }
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  };

  const isNormalBbu  = (s) => s === 'Berat Badan Normal';
  const isNormalBbtb = (s) => s === 'Gizi Baik';
  const isNormalTbu  = (s) => s === 'Normal';
  const isAllNormal  = (d) => isNormalBbu(d.status_gizi_bbu) && isNormalBbtb(d.status_gizi_bbtb) && isNormalTbu(d.status_gizi_tbu);
  const hasAnyRisiko = (d) => (
    (d.status_gizi_bbu  && !isNormalBbu(d.status_gizi_bbu)) ||
    (d.status_gizi_bbtb && !isNormalBbtb(d.status_gizi_bbtb)) ||
    (d.status_gizi_tbu  && !isNormalTbu(d.status_gizi_tbu))
  );

  const filteredData = dataBalita.filter(item => {
    if (filterStatus === 'normal') return isAllNormal(item);
    if (filterStatus === 'risiko') return hasAnyRisiko(item);
    return true;
  });

  // Palet warna berdasarkan label status gizi
  const GIZI_COLOR = {
    // TB/U
    'Sangat Pendek':           'bg-red-50 text-red-700 ring-red-200',
    'Pendek':                  'bg-orange-50 text-orange-700 ring-orange-200',
    'Normal':                  'bg-emerald-50 text-emerald-700 ring-emerald-200',
    'Tinggi':                  'bg-blue-50 text-blue-700 ring-blue-200',
    // BB/TB
    'Gizi Buruk':              'bg-red-50 text-red-700 ring-red-200',
    'Gizi Kurang':             'bg-orange-50 text-orange-700 ring-orange-200',
    'Gizi Baik':               'bg-emerald-50 text-emerald-700 ring-emerald-200',
    'Gizi Lebih':              'bg-amber-50 text-amber-700 ring-amber-200',
    // BB/U
    'Berat Badan Sangat Kurang': 'bg-red-50 text-red-700 ring-red-200',
    'Berat Badan Kurang':      'bg-orange-50 text-orange-700 ring-orange-200',
    'Berat Badan Normal':      'bg-emerald-50 text-emerald-700 ring-emerald-200',
    'Berat Badan Lebih':       'bg-amber-50 text-amber-700 ring-amber-200',
  };
  const DOT_COLOR = {
    'bg-red-50 text-red-700 ring-red-200':     'bg-red-400',
    'bg-orange-50 text-orange-700 ring-orange-200': 'bg-orange-400',
    'bg-emerald-50 text-emerald-700 ring-emerald-200': 'bg-emerald-400',
    'bg-blue-50 text-blue-700 ring-blue-200':  'bg-blue-400',
    'bg-amber-50 text-amber-700 ring-amber-200': 'bg-amber-400',
  };

  const giziBadge = (status) => {
    if (!status) return <span className="text-gray-300 text-xs">—</span>;
    const palette = GIZI_COLOR[status] || 'bg-gray-100 text-gray-600 ring-gray-200';
    const dot     = DOT_COLOR[palette]  || 'bg-gray-400';
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ring-1 ring-inset ${palette}`}>
        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 flex-shrink-0 ${dot}`} />
        {status}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 page-enter mesh-bg bg-orbs relative">
      {/* Decorative blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-40 -right-32 w-80 h-80 bg-teal-400/[0.04] rounded-full blur-[100px] animate-float-slow" />
        <div className="absolute bottom-0 -left-32 w-96 h-96 bg-sky-400/[0.03] rounded-full blur-[120px] animate-float-slow-reverse" />
      </div>
      {/* Minimal Nav */}
      <div className="sticky top-0 z-40 bg-gray-50 px-3 sm:px-4 pt-3 pb-2">
        <nav className="max-w-7xl mx-auto rounded-2xl bg-white/95 backdrop-blur-xl shadow-lg shadow-black/[0.05] border border-gray-100 px-4 sm:px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/kader')} className="p-2 -ml-1 hover:bg-gray-100 rounded-xl transition-colors">
              <ArrowLeft size={18} className="text-gray-500" />
            </button>
            <div className="h-5 w-px bg-gray-200" />
            <Link href="/" className="flex items-center gap-2.5 group hover:opacity-80 transition-opacity">
              <div className="w-9 h-9 rounded-xl overflow-hidden shadow-sm group-hover:shadow-teal-200 transition-shadow duration-300">
                <img src="/growell-logo.png" alt="Growell" className="w-full h-full object-cover" />
              </div>
              <span className="text-base font-bold text-gray-900 tracking-tight hidden sm:block">Data Balita</span>
            </Link>
          </div>
        </nav>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
      </div>

      {/* Stats Row */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 section-appear section-appear-delay-1">
        <div className="grid grid-cols-3 gap-4 stagger-grid">
          {[
            { icon: <Users size={20} />, label: 'Total Balita', value: dashStats.total_balita, color: 'text-cyan-600', bg: 'bg-cyan-50', glow: 'hover:shadow-cyan-100/60' },
            { icon: <CheckCircle2 size={20} />, label: 'Status Normal', value: dashStats.normal, color: 'text-emerald-600', bg: 'bg-emerald-50', glow: 'hover:shadow-emerald-100/60' },
            { icon: <AlertCircle size={20} />, label: 'Perlu Perhatian', value: dashStats.risiko, color: 'text-orange-600', bg: 'bg-orange-50', glow: 'hover:shadow-orange-100/60' },
          ].map((s, i) => (
            <div key={i} className={`stat-card card-shine bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-xl ${s.glow} transition-all duration-500 hover:-translate-y-1`}>
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center ${s.color}`}>{s.icon}</div>
                <span className="text-2xl sm:text-3xl font-extrabold text-gray-900 count-up tabular-nums">{s.value}</span>
              </div>
              <p className="text-xs sm:text-sm text-gray-500 font-medium">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Table Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 section-appear section-appear-delay-2">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-lg transition-shadow duration-500">
          {/* Search & Filter Bar */}
          <div className="p-5 sm:p-6 border-b border-gray-100">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Cari nama balita..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-gray-900 focus:bg-white focus:ring-0 outline-none transition-all text-sm text-gray-900 placeholder:text-gray-400"
                />
              </div>
              <div className="sm:w-48">
                <CustomDropdown
                  name="filterStatus"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  placeholder="Semua Status"
                  options={[
                    { value: 'all', label: 'Semua Status' },
                    { value: 'normal', label: 'Normal' },
                    { value: 'risiko', label: 'Perlu Perhatian' },
                  ]}
                />
              </div>
            </div>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-sm text-gray-500">Memuat data...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left py-3 px-5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">No</th>
                    <th className="text-left py-3 px-5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Nama Balita</th>
                    <th className="text-left py-3 px-5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Jenis Kelamin</th>
                    <th className="text-left py-3 px-5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Tanggal Lahir</th>
                    <th className="text-left py-3 px-5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Status BB/TB</th>
                    <th className="text-left py-3 px-5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Status BB/U</th>
                    <th className="text-left py-3 px-5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Status TB/U</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredData.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center py-20">
                        <Users size={40} className="mx-auto mb-3 text-gray-200" />
                        <p className="text-sm font-medium text-gray-400">Tidak ada data ditemukan</p>
                      </td>
                    </tr>
                  ) : filteredData.map((item, index) => (
                    <tr key={item.uuid || index} className="hover:bg-teal-50/30 transition-colors duration-300 group">
                      <td className="py-3.5 px-5 text-sm text-gray-400 tabular-nums">{(page - 1) * 15 + index + 1}</td>
                      <td className="py-3.5 px-5">
                        <p className="text-sm font-medium text-gray-900">{item.nama || '—'}</p>
                        <p className="text-xs text-gray-400 mt-0.5">Ibu: {item.nama_ibu || '—'}</p>
                      </td>
                      <td className="py-3.5 px-5 text-sm text-gray-600 hidden md:table-cell">{item.jenis_kelamin || '—'}</td>
                      <td className="py-3.5 px-5 text-sm text-gray-600 tabular-nums">
                        {item.tanggal_lahir ? new Date(item.tanggal_lahir).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                        <td className="py-3.5 px-5 hidden lg:table-cell">{giziBadge(item.status_gizi_bbtb)}</td>
                        <td className="py-3.5 px-5 hidden lg:table-cell">{giziBadge(item.status_gizi_bbu)}</td>
                        <td className="py-3.5 px-5 hidden lg:table-cell">{giziBadge(item.status_gizi_tbu)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100">
              <p className="text-sm text-gray-500">
                Halaman <span className="font-medium text-gray-900">{page}</span> dari <span className="font-medium text-gray-900">{totalPages}</span>
              </p>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Sebelumnya
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => p + 1)}
                  className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Selanjutnya
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
