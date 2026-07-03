'use client';
import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Baby, Calendar, FileText, CheckCircle2, AlertCircle, TrendingUp, User, LineChart as LineChartIcon, Info } from 'lucide-react';
import { apiFetch, isAuthenticated } from '@/utils/auth';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function DetailBalitaPage() {
    const params = useParams();
    const router = useRouter();
    const { uuid } = params;

    const [data, setData] = useState(null);
    const [measurements, setMeasurements] = useState([]);
    const [latestSurvey, setLatestSurvey] = useState(null);
    const [forecast, setForecast] = useState([null]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!isAuthenticated()) {
            router.push('/login');
            return;
        }

        if (!uuid) return;

        const fetchData = async () => {
            try {
                const [res, forecastRes] = await Promise.all([
                    apiFetch(`/api/balita/${uuid}`),
                    apiFetch(`/api/forecast?balita_uuid=${uuid}`)
                ]);
                const result = await res.json();
                
                let forecastData = null;
                if (forecastRes.ok) {
                    forecastData = await forecastRes.json();
                }

                if (!res.ok) {
                    setError(result.error || 'Terjadi kesalahan saat mengambil data');
                } else {
                    setData(result.balita);
                    setMeasurements(result.measurements || []);
                    setLatestSurvey(result.latestSurvey || null);
                    setForecast(forecastData);
                }
            } catch (err) {
                setError('Gagal terhubung ke server');
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [uuid, router]);

    const getStatusColor = (status) => {
        if (!status) return 'bg-gray-100 text-gray-500 border-gray-200';
        const s = status.toLowerCase();
        if (s.includes('gizi baik') || s.includes('normal') || s.includes('berat badan normal')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
        if (s.includes('gizi buruk') || s.includes('sangat pendek') || s.includes('sangat kurang')) return 'bg-red-50 text-red-700 border-red-200';
        if (s.includes('gizi kurang') || s.includes('pendek') || s.includes('kurang')) return 'bg-orange-50 text-orange-700 border-orange-200';
        if (s.includes('gizi lebih') || s.includes('tinggi') || s.includes('lebih')) return 'bg-blue-50 text-blue-700 border-blue-200';
        return 'bg-gray-100 text-gray-600 border-gray-200';
    };

    const formatDate = (dateStr) => {
        if (!dateStr || dateStr === '-') return '-';
        return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 page-enter">
                <div className="w-12 h-12 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin mb-4"></div>
                <p className="text-gray-500 font-medium">Memuat data balita...</p>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center page-enter">
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6 text-red-500">
                    <AlertCircle size={40} />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Data Tidak Ditemukan</h2>
                <p className="text-gray-500 mb-8 max-w-md">{error || 'Data balita yang Anda cari tidak tersedia.'}</p>
                <button onClick={() => router.push('/data-balita')} className="px-6 py-3 bg-teal-600 text-white font-bold rounded-xl shadow-md hover:bg-teal-700 transition-colors flex items-center gap-2">
                    <ArrowLeft size={18} /> Kembali ke Data Balita
                </button>
            </div>
        );
    }

    const latest = measurements.length > 0 ? measurements[0] : null;

    return (
        <div className="min-h-screen bg-gray-50 font-sans pb-20 page-enter mesh-bg bg-orbs relative">
            {/* Decorative blobs */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute -top-40 -right-40 w-96 h-96 bg-teal-400/[0.04] rounded-full blur-[100px] animate-float-slow" />
            </div>

            {/* Header */}
            <div className="sticky top-0 z-40 bg-gray-50 px-3 sm:px-4 pt-3 pb-2">
                <nav className="max-w-5xl mx-auto rounded-2xl bg-white/95 backdrop-blur-xl shadow-lg shadow-black/[0.05] border border-gray-100 px-4 sm:px-5 h-14 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => router.back()} className="p-2 -ml-1 hover:bg-gray-100 rounded-xl transition-colors">
                            <ArrowLeft size={18} className="text-gray-500" />
                        </button>
                        <div className="h-5 w-px bg-gray-200" />
                        <span className="text-base font-bold text-gray-900 tracking-tight">Detail Balita</span>
                    </div>
                </nav>
            </div>

            <div className="max-w-5xl mx-auto px-4 pt-6 relative z-10 section-appear section-appear-delay-1">

                {/* Profile Card */}
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 mb-6 flex flex-col md:flex-row gap-6 items-start hover:shadow-lg transition-shadow duration-500">
                    <div className="w-24 h-24 bg-gradient-to-br from-teal-400 to-sky-600 rounded-2xl flex items-center justify-center text-white text-4xl font-extrabold shadow-lg flex-shrink-0">
                        {data.nama.charAt(0)}
                    </div>
                    <div className="flex-1">
                        <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-2">{data.nama}</h1>
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-y-3 gap-x-6 text-sm">
                            <div className="flex flex-col">
                                <span className="text-gray-400 font-medium text-xs mb-0.5">Jenis Kelamin</span>
                                <span className="font-semibold text-gray-800 flex items-center gap-1.5"><Baby size={14} className="text-teal-500" /> {data.jenis_kelamin}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-gray-400 font-medium text-xs mb-0.5">Tanggal Lahir</span>
                                <span className="font-semibold text-gray-800 flex items-center gap-1.5"><Calendar size={14} className="text-sky-500" /> {formatDate(data.tanggal_lahir)}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-gray-400 font-medium text-xs mb-0.5">Orang Tua</span>
                                <span className="font-semibold text-gray-800 flex items-center gap-1.5"><User size={14} className="text-indigo-500" /> {data.nama_ibu || data.nama_orang_tua_user || '-'}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-gray-400 font-medium text-xs mb-0.5">Posyandu</span>
                                <span className="font-semibold text-gray-800 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> {data.posyandu_nama || '-'}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-gray-400 font-medium text-xs mb-0.5">Alamat</span>
                                <span className="font-semibold text-gray-800">{data.alamat || '-'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        {/* Latest Status */}
                        <div>
                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <TrendingUp size={16} className="text-teal-600" /> Tumbuh Kembang Terkini
                            </h3>

                            {latest ? (
                                <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                                    <div className="flex items-center justify-between mb-5 pb-4 border-b border-gray-100">
                                        <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Pengukuran Terakhir</div>
                                        <div className="text-xs font-bold text-gray-800 bg-gray-100 px-3 py-1.5 rounded-lg">{formatDate(latest.tanggal_pengukuran)}</div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                        {[
                                            { label: 'BB / TB', value: latest.status_gizi_bbtb, desc: 'Berat thd Tinggi' },
                                            { label: 'BB / Umur', value: latest.status_gizi_bbu, desc: 'Berat thd Umur' },
                                            { label: 'TB / Umur', value: latest.status_gizi_tbu, desc: 'Tinggi thd Umur' },
                                        ].map((stat, i) => (
                                            <div key={i} className={`p-4 rounded-2xl border ${getStatusColor(stat.value)}`}>
                                                <div className="text-[10px] font-bold uppercase tracking-wider opacity-70 mb-1">{stat.label}</div>
                                                <div className="text-lg font-bold mb-1">{stat.value || '-'}</div>
                                                <div className="text-[10px] font-medium opacity-60">{stat.desc}</div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="flex flex-wrap gap-4 text-sm font-medium">
                                        <div className="flex-1 bg-gray-50 border border-gray-100 p-4 rounded-2xl min-w-[120px]">
                                            <span className="text-gray-400 block text-[10px] font-bold uppercase tracking-wider mb-1">Berat Badan</span>
                                            <span className="font-black text-gray-900 text-xl">{latest.berat_badan} <span className="text-sm font-semibold text-gray-500">kg</span></span>
                                        </div>
                                        <div className="flex-1 bg-gray-50 border border-gray-100 p-4 rounded-2xl min-w-[120px]">
                                            <span className="text-gray-400 block text-[10px] font-bold uppercase tracking-wider mb-1">Tinggi Badan</span>
                                            <span className="font-black text-gray-900 text-xl">{latest.tinggi_badan} <span className="text-sm font-semibold text-gray-500">cm</span></span>
                                        </div>
                                        <div className="flex-1 bg-gray-50 border border-gray-100 p-4 rounded-2xl min-w-[120px]">
                                            <span className="text-gray-400 block text-[10px] font-bold uppercase tracking-wider mb-1">Lingkar Kepala</span>
                                            <span className="font-black text-gray-900 text-xl">{latest.lingkar_kepala || '-'} <span className="text-sm font-semibold text-gray-500">cm</span></span>
                                        </div>
                                    </div>

                                    {(latest.rekomendasi_utama || latest.catatan) && (
                                        <div className="mt-6 pt-5 border-t border-gray-100">
                                            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">Catatan Kader / Ahli Gizi:</h4>
                                            {latest.rekomendasi_utama && <p className="text-sm text-gray-700 font-medium mb-2"><span className="text-violet-600 font-bold">Rekomendasi Utama:</span> {latest.rekomendasi_utama}</p>}
                                            {latest.catatan && <p className="text-sm text-gray-600 bg-amber-50 rounded-xl p-3 border border-amber-100 break-words">{latest.catatan}</p>}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 text-center">
                                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                                        <FileText size={28} />
                                    </div>
                                    <p className="text-gray-500 font-medium text-sm">Belum ada data pengukuran.</p>
                                </div>
                            )}
                        </div>

                        {/* Growth Chart */}
                        {measurements.length > 0 && (
                            <div className="section-appear section-appear-delay-1 mb-8">
                                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <LineChartIcon size={16} className="text-sky-500" /> Grafik Pertumbuhan & Prediksi
                                </h3>
                                <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 overflow-x-auto">
                                    <div className="min-w-[500px] h-[300px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            {(() => {
                                                // Build ascending history series
                                                const histAsc = [...measurements].reverse().map((h, idx, arr) => {
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

                                                return (
                                                    <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                                        <XAxis dataKey="tanggal_pengukuran" tickFormatter={formatDate} stroke="#94a3b8" fontSize={12} tickMargin={10} />
                                                        <YAxis yAxisId="left" stroke="#14b8a6" fontSize={12} tickFormatter={(val) => `${val}kg`} />
                                                        <YAxis yAxisId="right" orientation="right" stroke="#6366f1" fontSize={12} tickFormatter={(val) => `${val}cm`} />
                                                        <Tooltip
                                                            labelFormatter={formatDate}
                                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                                                        />
                                                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                                        <Line yAxisId="left" type="monotone" dataKey="berat_badan" name="Berat Badan (kg)" stroke="#14b8a6" strokeWidth={3} dot={{ r: 4, fill: '#14b8a6', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} connectNulls={false} />
                                                        <Line yAxisId="right" type="monotone" dataKey="tinggi_badan" name="Tinggi Badan (cm)" stroke="#818cf8" strokeWidth={3} dot={{ r: 4, fill: '#818cf8', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} connectNulls={false} />
                                                        {forecastPoints.length > 0 && (
                                                            <>
                                                                <Line yAxisId="left" type="monotone" dataKey="berat_proyeksi" name="Proyeksi Berat (kg)" stroke="#14b8a6" strokeWidth={2} strokeDasharray="6 4" dot={{ r: 3, fill: '#fff', strokeWidth: 2, stroke: '#14b8a6' }} connectNulls />
                                                                <Line yAxisId="right" type="monotone" dataKey="tinggi_proyeksi" name="Proyeksi Tinggi (cm)" stroke="#818cf8" strokeWidth={2} strokeDasharray="6 4" dot={{ r: 3, fill: '#fff', strokeWidth: 2, stroke: '#818cf8' }} connectNulls />
                                                            </>
                                                        )}
                                                    </LineChart>
                                                );
                                            })()}
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                                {forecast?.eligible === false && (
                                    <div className="bg-sky-50 border border-sky-200 text-sky-700 rounded-2xl p-4 text-sm font-medium flex items-start gap-2 mt-4">
                                        <Info size={16} className="mt-0.5 flex-shrink-0" />
                                        <div>
                                            {forecast.message || 'Data pengukuran belum cukup untuk membuat proyeksi pertumbuhan.'}
                                            <p className="text-xs text-sky-500 mt-1">
                                                Proyeksi membutuhkan minimal 4 kali pengukuran ({forecast.jumlah_pengukuran ?? 0}/4 saat ini).
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* History Table */}
                        {measurements.length > 1 && (
                            <div className="section-appear section-appear-delay-2">
                                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <Calendar size={16} className="text-indigo-500" /> Riwayat Pengukuran
                                </h3>
                                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-gray-50 border-b border-gray-100 text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                                                    <th className="p-4 pl-6">Tanggal</th>
                                                    <th className="p-4">BB (kg)</th>
                                                    <th className="p-4">TB (cm)</th>
                                                    <th className="p-4">BB/TB</th>
                                                    <th className="p-4">TB/U</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 text-sm">
                                                {measurements.slice(1).map((m, i) => (
                                                    <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                                                        <td className="p-4 pl-6 font-semibold text-gray-800 whitespace-nowrap">{formatDate(m.tanggal_pengukuran)}</td>
                                                        <td className="p-4 font-medium text-gray-600">{m.berat_badan || '-'}</td>
                                                        <td className="p-4 font-medium text-gray-600">{m.tinggi_badan || '-'}</td>
                                                        <td className="p-4">
                                                            <span className={`px-2 py-1 rounded-md text-[10px] font-bold border ${getStatusColor(m.status_gizi_bbtb)} whitespace-nowrap`}>{m.status_gizi_bbtb || '-'}</span>
                                                        </td>
                                                        <td className="p-4">
                                                            <span className={`px-2 py-1 rounded-md text-[10px] font-bold border ${getStatusColor(m.status_gizi_tbu)} whitespace-nowrap`}>{m.status_gizi_tbu || '-'}</span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="lg:col-span-1 space-y-6">
                        {/* Survey Info */}
                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <FileText size={16} className="text-sky-500" /> Data Formulir Orang Tua
                        </h3>
                        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
                            {latestSurvey ? (
                                <div className="space-y-4">
                                    <div className="pb-3 border-b border-gray-100">
                                        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Tanggal Pengisian</div>
                                        <div className="font-semibold text-gray-800 text-sm">{formatDate(latestSurvey.created_at)}</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Ringkasan Respon:</div>
                                        <ul className="space-y-2.5 text-sm">
                                            <li className="flex justify-between items-start gap-2">
                                                <span className="text-gray-500">ASI Eksklusif</span>
                                                <span className="font-semibold text-gray-900 text-right">{latestSurvey.is_asi_eksklusif ? 'Ya' : 'Tidak / Belum'}</span>
                                            </li>
                                            <li className="flex justify-between items-start gap-2">
                                                <span className="text-gray-500">MPASI Protein Hewani</span>
                                                <span className="font-semibold text-gray-900 text-right">{latestSurvey.is_mpasi_hewani ? 'Ya' : 'Tidak'}</span>
                                            </li>
                                            <li className="flex justify-between items-start gap-2">
                                                <span className="text-gray-500">Pola Asuh Makan</span>
                                                <span className="font-semibold text-gray-900 text-right capitalize">{latestSurvey.pola_asuh_makan?.replace(/_/g, ' ') || '-'}</span>
                                            </li>
                                            <li className="flex justify-between items-start gap-2">
                                                <span className="text-gray-500">Sakit 2 Minggu Terakhir</span>
                                                <span className={`font-semibold text-right ${latestSurvey.is_sakit_2_minggu ? 'text-amber-600' : 'text-emerald-600'}`}>
                                                    {latestSurvey.is_sakit_2_minggu ? 'Ya' : 'Tidak'}
                                                </span>
                                            </li>
                                            <li className="flex justify-between items-start gap-2">
                                                <span className="text-gray-500">Akses Sanitasi Layak</span>
                                                <span className={`font-semibold text-right ${latestSurvey.jenis_sanitasi?.includes('sungai') || latestSurvey.jenis_sanitasi?.includes('terbuka') ? 'text-amber-600' : 'text-gray-900'}`}>
                                                    {latestSurvey.jenis_sanitasi?.includes('sungai') ? 'Kurang Baik' : 'Baik'}
                                                </span>
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-6">
                                    <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3 text-gray-300">
                                        <AlertCircle size={20} />
                                    </div>
                                    <p className="text-gray-500 font-medium text-sm">Orang tua balita ini belum mengisi survei/formulir profil kesehatan lengkap.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
