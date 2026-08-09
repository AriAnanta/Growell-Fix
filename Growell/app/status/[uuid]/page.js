    'use client';
import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Baby, Activity, Calendar, FileText, AlertCircle, LineChart as LineChartIcon, Info } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function StatusBalitaPage() {
    const params = useParams();
    const router = useRouter();
    const { uuid } = params;

    const [data, setData] = useState(null);
    const [history, setHistory] = useState([]);
    const [forecast, setForecast] = useState([null]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!uuid) return;

        const fetchData = async () => {
            try {
                const res = await fetch(`/api/public/status/${uuid}`);
                const result = await res.json();

                if (!res.ok) {
                    setError(result.error || 'Terjadi kesalahan saat mengambil data');
                } else {
                    setData(result.data);
                    setHistory(result.history || []);
                    setForecast(result.forecast || null);
                }
            } catch (err) {
                setError('Gagal terhubung ke server');
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [uuid]);

    const getStatusColor = (status) => {
        if (!status) return 'bg-gray-100 text-gray-500';
        const s = status.toLowerCase();
        if (s.includes('gizi baik') || s.includes('normal') || s.includes('berat badan normal')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
        if (s.includes('gizi buruk') || s.includes('sangat pendek') || s.includes('sangat kurang')) return 'bg-red-50 text-red-700 border-red-200';
        if (s.includes('gizi kurang') || s.includes('pendek') || s.includes('kurang')) return 'bg-amber-50 text-amber-700 border-amber-200';
        if (s.includes('gizi lebih') || s.includes('tinggi') || s.includes('lebih')) return 'bg-blue-50 text-blue-700 border-blue-200';
        return 'bg-gray-100 text-gray-600';
    };

    const formatDate = (dateStr) => {
        if (!dateStr || dateStr === '-') return '-';
        return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
                <div className="w-12 h-12 border-4 border-teal-200 border-t-teal-500 rounded-full animate-spin mb-4"></div>
                <p className="text-slate-500 font-medium">Memuat data balita...</p>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-20 h-20 bg-rose-100 rounded-full flex items-center justify-center mb-6 text-rose-500">
                    <AlertCircle size={40} />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Data Tidak Ditemukan</h2>
                <p className="text-slate-500 mb-8 max-w-md">{error || 'Data balita yang Anda cari tidak tersedia atau URL tidak valid.'}</p>
                <button onClick={() => router.push('/')} className="px-6 py-3 bg-teal-500 text-white font-bold rounded-xl shadow-md hover:bg-teal-600 transition-colors flex items-center gap-2">
                    <ArrowLeft size={18} /> Kembali ke Beranda
                </button>
            </div>
        );
    }

    const latest = history.length > 0 ? history[0] : null;

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-20">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
                <div className="max-w-3xl mx-auto px-4 h-16 flex items-center gap-4">
                    <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                        <ArrowLeft size={20} />
                    </button>
                    <div className="font-bold text-slate-800 text-lg">Detail Status Gizi</div>
                </div>
            </div>

            <div className="max-w-3xl mx-auto px-4 pt-6 md:pt-10">

                {/* Profile Card */}
                <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100 mb-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-teal-50 rounded-bl-full pointer-events-none" />

                    <div className="flex flex-col md:flex-row gap-6 items-start relative z-10">
                        <div className="w-20 h-20 bg-gradient-to-br from-teal-400 to-indigo-500 rounded-full flex items-center justify-center text-white text-3xl font-extrabold shadow-lg flex-shrink-0">
                            {data.nama.charAt(0)}
                        </div>

                        <div className="flex-1">
                            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 mb-2">{data.nama}</h1>
                            <div className="flex flex-wrap gap-y-2 gap-x-4 text-sm font-medium text-slate-500">
                                <span className="flex items-center gap-1.5"><Baby size={16} className="text-teal-500" /> {data.jenis_kelamin}</span>
                                <span className="flex items-center gap-1.5"><Calendar size={16} className="text-indigo-400" /> Lahir: {formatDate(data.tanggal_lahir)}</span>
                                <span className="flex items-center gap-1.5 bg-slate-100 px-2 py-0.5 rounded-md text-slate-600">Posyandu {data.posyandu_nama}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Latest Status */}
                <h3 className="text-lg font-bold text-slate-800 mb-4 px-1 flex items-center gap-2">
                    <Activity size={20} className="text-teal-500" /> Status Gizi Terkini
                </h3>

                {latest ? (
                    <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100 mb-8">
                        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                            <div className="text-sm font-bold text-slate-500">Pengukuran Terakhir</div>
                            <div className="text-sm font-bold text-slate-800 bg-slate-100 px-3 py-1 rounded-full">{formatDate(latest.tanggal_pengukuran)}</div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            {[
                                { label: 'BB / TB', value: latest.status_gizi_bbtb, desc: 'Berat thd Tinggi' },
                                { label: 'BB / Umur', value: latest.status_gizi_bbu, desc: 'Berat thd Umur' },
                                { label: 'TB / Umur', value: latest.status_gizi_tbu, desc: 'Tinggi thd Umur' },
                            ].map((stat, i) => (
                                <div key={i} className={`p-4 rounded-2xl border ${getStatusColor(stat.value)}`}>
                                    <div className="text-xs font-bold opacity-70 mb-1">{stat.label}</div>
                                    <div className="text-lg font-bold mb-1">{stat.value}</div>
                                    <div className="text-[11px] font-medium opacity-60">{stat.desc}</div>
                                </div>
                            ))}
                        </div>

                        <div className="flex flex-wrap gap-4 text-sm font-medium text-slate-600 bg-slate-50 p-4 rounded-2xl">
                            <div className="flex-1 min-w-[120px]">
                                <span className="text-slate-400 block text-xs mb-1">Berat Badan:</span>
                                <span className="font-bold text-slate-800 text-lg">{latest.berat_badan} <span className="text-sm">kg</span></span>
                            </div>
                            <div className="flex-1 min-w-[120px]">
                                <span className="text-slate-400 block text-xs mb-1">Tinggi Badan:</span>
                                <span className="font-bold text-slate-800 text-lg">{latest.tinggi_badan} <span className="text-sm">cm</span></span>
                            </div>
                        </div>

                        {/* Recommendations / Advice */}
                        {(latest.rekomendasi_utama || latest.catatan) && (
                            <div className="mt-8">
                                <h4 className="flex items-center gap-2 text-sm font-bold text-indigo-700 mb-3 bg-indigo-50 inline-block px-3 py-1.5 rounded-lg">
                                    <Info size={16} /> Rekomendasi Ahli
                                </h4>
                                <div className="space-y-3">
                                    {latest.rekomendasi_utama && (
                                        <div className="bg-gradient-to-r from-indigo-50 to-white border border-indigo-100 p-4 rounded-xl shadow-sm">
                                            <p className="text-sm font-semibold text-slate-800 leading-relaxed">{latest.rekomendasi_utama}</p>
                                        </div>
                                    )}
                                    {latest.catatan && (
                                        <div className="bg-amber-50/50 border border-amber-100/50 p-4 rounded-xl text-sm text-slate-700 leading-relaxed italic">
                                            "{latest.catatan}"
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                    </div>
                ) : (
                    <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 mb-8 text-center">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                            <FileText size={24} />
                        </div>
                        <p className="text-slate-500 font-medium">Belum ada data pengukuran untuk balita ini.</p>
                    </div>
                )}

                {/* Growth Chart */}
                {history.length > 0 && (
                    <>
                        <h3 className="text-lg font-bold text-slate-800 mb-4 px-1 flex items-center gap-2 mt-2">
                            <LineChartIcon size={20} className="text-sky-500" /> Grafik Pertumbuhan
                        </h3>
                        <div className="flex flex-col gap-4 mb-8">
                            {(() => {
                                // Build ascending history series
                                const histAsc = [...history].reverse().map((h, idx, arr) => {
                                    const isLast = idx === arr.length - 1;
                                    return {
                                        tanggal_pengukuran: h.tanggal_pengukuran,
                                        berat_badan: h.berat_badan,
                                        tinggi_badan: h.tinggi_badan,
                                        // Connect projection line starting from the last actual point
                                        berat_proyeksi: isLast ? h.berat_badan : null,
                                        tinggi_proyeksi: isLast ? h.tinggi_badan : null,
                                    };
                                });

                                // Append forecast points (t+1..t+6) with computed future dates
                                let forecastPoints = [];
                                if (forecast?.eligible && forecast.prediksi?.length > 0) {
                                    const baseDate = new Date(forecast.tanggal_acuan);
                                    forecastPoints = forecast.prediksi.map((p, idx) => {
                                        const d = new Date(baseDate);
                                        d.setMonth(d.getMonth() + (idx + 1));
                                        return {
                                            tanggal_pengukuran: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
                                            berat_badan: null,
                                            tinggi_badan: null,
                                            berat_proyeksi: p.bb,
                                            tinggi_proyeksi: p.tb,
                                        };
                                    });
                                }

                                const chartData = [...histAsc, ...forecastPoints];
                                const tooltipStyle = { borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' };

                                return (
                                    <>
                                        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 overflow-x-auto">
                                            <h4 className="text-sm font-bold text-slate-700 mb-3">Proyeksi Berat Badan</h4>
                                            <div className="min-w-[320px] h-[260px]">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                                        <XAxis dataKey="tanggal_pengukuran" tickFormatter={formatDate} stroke="#94a3b8" fontSize={12} tickMargin={10} />
                                                        <YAxis stroke="#14b8a6" fontSize={12} tickFormatter={(val) => `${val}kg`} />
                                                        <Tooltip labelFormatter={formatDate} contentStyle={tooltipStyle} />
                                                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                                        <Line type="monotone" dataKey="berat_badan" name="Berat Badan (kg)" stroke="#14b8a6" strokeWidth={3} dot={{ r: 4, fill: '#14b8a6', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} connectNulls={false} />
                                                        {forecastPoints.length > 0 && (
                                                            <Line type="monotone" dataKey="berat_proyeksi" name="Proyeksi Berat (kg)" stroke="#14b8a6" strokeWidth={2} strokeDasharray="6 4" dot={{ r: 3, fill: '#fff', strokeWidth: 2, stroke: '#14b8a6' }} connectNulls />
                                                        )}
                                                    </LineChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>
                                        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 overflow-x-auto">
                                            <h4 className="text-sm font-bold text-slate-700 mb-3">Proyeksi Tinggi Badan</h4>
                                            <div className="min-w-[320px] h-[260px]">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                                        <XAxis dataKey="tanggal_pengukuran" tickFormatter={formatDate} stroke="#94a3b8" fontSize={12} tickMargin={10} />
                                                        <YAxis stroke="#6366f1" fontSize={12} tickFormatter={(val) => `${val}cm`} />
                                                        <Tooltip labelFormatter={formatDate} contentStyle={tooltipStyle} />
                                                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                                        <Line type="monotone" dataKey="tinggi_badan" name="Tinggi Badan (cm)" stroke="#818cf8" strokeWidth={3} dot={{ r: 4, fill: '#818cf8', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} connectNulls={false} />
                                                        {forecastPoints.length > 0 && (
                                                            <Line type="monotone" dataKey="tinggi_proyeksi" name="Proyeksi Tinggi (cm)" stroke="#818cf8" strokeWidth={2} strokeDasharray="6 4" dot={{ r: 3, fill: '#fff', strokeWidth: 2, stroke: '#818cf8' }} connectNulls />
                                                        )}
                                                    </LineChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                        {forecast?.eligible === false && (
                            <div className="bg-sky-50 border border-sky-200 text-sky-700 rounded-2xl p-4 text-sm font-medium flex items-start gap-2 mb-8 -mt-2">
                                <Info size={16} className="mt-0.5 flex-shrink-0" />
                                <div>
                                    {forecast.message || 'Data pengukuran belum cukup untuk membuat proyeksi pertumbuhan.'}
                                    <p className="text-xs text-sky-500 mt-1">
                                        Proyeksi membutuhkan minimal 4 kali pengukuran ({forecast.jumlah_pengukuran ?? 0}/4 saat ini).
                                    </p>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* History */}
                {history.length > 1 && (
                    <>
                        <h3 className="text-lg font-bold text-slate-800 mb-4 px-1 flex items-center gap-2">
                            <Calendar size={20} className="text-indigo-500" /> Riwayat Terdahulu
                        </h3>
                        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                            <div className="divide-y divide-slate-100">
                                {history.slice(1).map((h, i) => (
                                    <div key={i} className="p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                                        <div>
                                            <div className="font-bold text-slate-800 mb-1">{formatDate(h.tanggal_pengukuran)}</div>
                                            <div className="text-sm text-slate-500 font-medium">BB: {h.berat_badan} kg | TB: {h.tinggi_badan} cm</div>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${getStatusColor(h.status_gizi_bbtb)}`}>BB/TB: {h.status_gizi_bbtb}</span>
                                            <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${getStatusColor(h.status_gizi_tbu)}`}>TB/U: {h.status_gizi_tbu}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}

                {/* Footer info */}
                <div className="mt-10 text-center">
                    <p className="text-sm text-slate-400 font-medium">
                        Data ini ditampilkan secara terbatas. Untuk informasi lebih lengkap, silakan masuk ke sistem Growell atau hubungi Posyandu terkait.
                    </p>
                </div>

            </div>
        </div>
    );
}
