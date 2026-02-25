'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, FileText, Download, Calendar, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import CustomDropdown from '@/components/forms/CustomDropdown';
import CustomDatePicker from '@/components/forms/CustomDatePicker';
import { apiFetch, isAuthenticated, getUserData } from '@/utils/auth';

export default function LaporanPage() {
  const router = useRouter();
  const [userData, setUserData] = useState(null);
  const [reports, setReports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState('');
  const [generateSuccess, setGenerateSuccess] = useState('');

  const [tipe, setTipe] = useState('bulanan');
  const [formatFile, setFormatFile] = useState('excel');
  const [periodeMulai, setPeriodeMulai] = useState('');
  const [periodeSelesai, setPeriodeSelesai] = useState('');

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/login'); return; }
    const ud = getUserData();
    setUserData(ud);
    if (!['kader', 'puskesmas', 'kelurahan'].includes(ud?.role)) { router.push('/'); return; }
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch('/api/laporan');
      if (res.ok) { const data = await res.json(); setReports(data.data || []); }
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  };

  const handleGenerate = async () => {
    setGenerateError(''); setGenerateSuccess(''); setIsGenerating(true);
    if (!periodeMulai || !periodeSelesai) { setGenerateError('Pilih periode mulai dan selesai'); setIsGenerating(false); return; }
    try {
      const res = await apiFetch('/api/laporan/generate', {
        method: 'POST',
        body: JSON.stringify({ tipe, format_file: formatFile, periode_mulai: periodeMulai, periode_selesai: periodeSelesai }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal membuat laporan');
      setGenerateSuccess(`Laporan berhasil dibuat: ${data.laporan?.fileName}`);
      fetchReports();
    } catch (e) { setGenerateError(e.message); }
    finally { setIsGenerating(false); }
  };

  const handleDownload = async (uuid, fileName) => {
    try {
      const res = await apiFetch(`/api/laporan/download/${uuid}`);
      if (!res.ok) throw new Error('Download gagal');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = fileName || 'laporan'; document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url);
    } catch (e) { alert(e.message); }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  return (
    <div className="min-h-screen bg-gray-50 page-enter mesh-bg bg-orbs relative">
      {/* Decorative blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-32 -right-40 w-96 h-96 bg-teal-400/[0.04] rounded-full blur-[100px] animate-float-slow" />
        <div className="absolute top-1/2 -left-32 w-80 h-80 bg-sky-400/[0.03] rounded-full blur-[100px] animate-float-slow-reverse" />
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
              <span className="text-base font-bold text-gray-900 tracking-tight hidden sm:block">Laporan</span>
            </Link>
          </div>
        </nav>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
      </div>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-16">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Generate Report Form */}
          <div className="lg:col-span-1">
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-gray-200 p-6 sticky top-24 card-shine hover:shadow-lg transition-all duration-500">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Buat Baru</p>
              <h2 className="text-lg font-bold text-gray-900 mb-6">Generate Laporan</h2>

              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-2">Tipe Laporan</label>
                  <CustomDropdown name="tipe" value={tipe} onChange={(e) => setTipe(e.target.value)} options={[{value:'bulanan',label:'Bulanan'},{value:'tahunan',label:'Tahunan'},{value:'custom',label:'Custom'}]} />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-2">Format File</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setFormatFile('excel')}
                      className={`px-4 py-3 rounded-xl border text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                        formatFile === 'excel'
                          ? 'border-gray-900 bg-gray-900 text-white'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <FileText size={16} />Excel
                    </button>
                    <button
                      onClick={() => setFormatFile('pdf')}
                      className={`px-4 py-3 rounded-xl border text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                        formatFile === 'pdf'
                          ? 'border-gray-900 bg-gray-900 text-white'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <FileText size={16} />PDF
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-2">Periode Mulai</label>
                  <CustomDatePicker name="periodeMulai" value={periodeMulai} onChange={(e) => setPeriodeMulai(e.target.value)} placeholder="Pilih tanggal mulai" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-2">Periode Selesai</label>
                  <CustomDatePicker name="periodeSelesai" value={periodeSelesai} onChange={(e) => setPeriodeSelesai(e.target.value)} placeholder="Pilih tanggal selesai" />
                </div>

                {generateError && (
                  <div className="bg-red-50 border border-red-100 text-red-600 rounded-xl p-3 text-sm flex items-start gap-2">
                    <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />{generateError}
                  </div>
                )}
                {generateSuccess && (
                  <div className="bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-xl p-3 text-sm flex items-start gap-2">
                    <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0" />{generateSuccess}
                  </div>
                )}

                <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="w-full px-6 py-3.5 text-sm font-medium text-white bg-gradient-to-r from-teal-500 to-sky-600 rounded-xl hover:shadow-lg hover:shadow-teal-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isGenerating ? <><Loader2 size={18} className="animate-spin" />Membuat...</> : 'Buat Laporan'}
                </button>
              </div>
            </div>
          </div>

          {/* Reports List */}
          <div className="lg:col-span-2">
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-500">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-900">Riwayat Laporan</h2>
                <span className="text-xs text-gray-400 font-medium">{reports.length} laporan</span>
              </div>

              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin mb-4" />
                  <p className="text-sm text-gray-500">Memuat data...</p>
                </div>
              ) : reports.length === 0 ? (
                <div className="text-center py-20 px-6">
                  <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <FileText size={24} className="text-gray-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Belum ada laporan</p>
                  <p className="text-xs text-gray-400">Buat laporan pertama menggunakan form di samping</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {reports.map((report) => (
                    <div key={report.uuid || report.id} className="px-6 py-4 hover:bg-teal-50/30 transition-all duration-300">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${report.format_file === 'pdf' ? 'bg-red-50' : 'bg-emerald-50'}`}>
                            <FileText size={20} className={report.format_file === 'pdf' ? 'text-red-500' : 'text-emerald-500'} />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{report.judul}</p>
                            <div className="flex flex-wrap items-center gap-2 mt-1.5">
                              <span className="inline-flex items-center gap-1 text-[11px] text-gray-400">
                                <Calendar size={11} />{formatDate(report.periode_mulai)} – {formatDate(report.periode_selesai)}
                              </span>
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                                report.status === 'completed' ? 'bg-emerald-50 text-emerald-600' :
                                report.status === 'failed' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
                              }`}>
                                <span className={`w-1 h-1 rounded-full ${
                                  report.status === 'completed' ? 'bg-emerald-400' :
                                  report.status === 'failed' ? 'bg-red-400' : 'bg-amber-400'
                                }`} />
                                {report.status === 'completed' ? 'Selesai' : report.status === 'failed' ? 'Gagal' : 'Proses'}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${report.format_file === 'pdf' ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-500'}`}>
                                {report.format_file?.toUpperCase()}
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-300 mt-1">Oleh: {report.generated_by_nama || '—'} &middot; {formatDate(report.created_at)}</p>
                          </div>
                        </div>
                        {report.status === 'completed' && (
                          <button
                            onClick={() => handleDownload(report.uuid, report.file_path)}
                            className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-teal-500 to-sky-600 rounded-lg hover:shadow-lg hover:shadow-teal-500/20 transition-all flex items-center gap-2 self-end sm:self-center"
                          >
                            <Download size={14} />Download
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
