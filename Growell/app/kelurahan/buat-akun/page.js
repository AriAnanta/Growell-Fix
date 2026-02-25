'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Plus, Users, UserCheck, User, Mail, Phone, MapPin,
  Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2, Trash2, Key
} from 'lucide-react';
import { apiFetch, isAuthenticated, getUserData } from '@/utils/auth';

const ROLE_OPTIONS = [
  { value: 'kader', label: 'Kader Posyandu', desc: 'Input data balita & prediksi status gizi', color: 'teal' },
  { value: 'ahli_gizi', label: 'Ahli Gizi', desc: 'Terima & jawab konsultasi orang tua', color: 'emerald' },
];

const inputClass = 'w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-teal-400 focus:ring-2 focus:ring-teal-400/10 outline-none transition-all';

export default function BuatAkunPage() {
  const router = useRouter();
  const [userData, setUserData] = useState(null);

  // Form state
  const [form, setForm] = useState({ nama: '', email: '', password: '', role: 'kader', no_telepon: '', alamat: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Account list
  const [accounts, setAccounts] = useState([]);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [filterRole, setFilterRole] = useState('all');

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/login'); return; }
    const u = getUserData();
    if (!['kelurahan', 'puskesmas'].includes(u?.role)) { router.push('/kelurahan'); return; }
    setUserData(u);
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    setIsLoadingList(true);
    try {
      const res = await apiFetch('/api/kelurahan/users');
      if (res.ok) {
        const data = await res.json();
        setAccounts(data.data || []);
      }
    } catch (e) { console.error(e); }
    finally { setIsLoadingList(false); }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await apiFetch('/api/kelurahan/users', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal membuat akun');
      setSuccessMsg(`Akun ${data.user.nama} (${data.user.role === 'kader' ? 'Kader' : 'Ahli Gizi'}) berhasil dibuat!`);
      setForm({ nama: '', email: '', password: '', role: 'kader', no_telepon: '', alamat: '' });
      fetchAccounts();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredAccounts = accounts.filter(a => filterRole === 'all' || a.role === filterRole);

  const roleStyle = (role) =>
    role === 'kader'
      ? 'bg-teal-50 text-teal-700 border-teal-100'
      : 'bg-emerald-50 text-emerald-700 border-emerald-100';

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  return (
    <div className="min-h-screen bg-gray-50 mesh-bg bg-orbs relative">
      {/* Decorative blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-32 -right-40 w-96 h-96 bg-teal-400/[0.04] rounded-full blur-[100px] animate-float-slow" />
        <div className="absolute top-1/2 -left-40 w-[500px] h-[500px] bg-sky-400/[0.03] rounded-full blur-[120px] animate-float-slow-reverse" />
      </div>
      {/* Floating Pill Navbar */}
      <div className="sticky top-0 z-40 bg-gray-50 px-3 sm:px-4 pt-3 pb-2">
        <nav className="max-w-7xl mx-auto rounded-2xl bg-white/95 backdrop-blur-xl shadow-lg shadow-black/[0.05] border border-gray-100 px-4 sm:px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/kelurahan')} className="p-2 -ml-1 hover:bg-gray-100 rounded-xl transition-colors">
              <ArrowLeft size={18} className="text-gray-500" />
            </button>
            <div className="h-5 w-px bg-gray-200" />
            <Link href="/" className="flex items-center gap-2.5 group hover:opacity-80 transition-opacity">
              <div className="w-9 h-9 rounded-xl overflow-hidden shadow-sm group-hover:shadow-teal-200 transition-shadow duration-300">
                <img src="/growell-logo.png" alt="Growell" className="w-full h-full object-cover" />
              </div>
              <div className="hidden sm:block">
                <span className="text-base font-bold text-gray-900 tracking-tight">Kelola Akun</span>
              </div>
            </Link>
          </div>
          <span className="text-xs font-medium text-gray-400 hidden sm:block">Kader &amp; Ahli Gizi</span>
        </nav>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Buat Akun <span className="gradient-text-static">Petugas</span></h1>
          <p className="text-sm text-gray-500 mt-1">Buat akun untuk Kader Posyandu dan Ahli Gizi di wilayah Anda.</p>
        </div>

        <div className="grid lg:grid-cols-5 gap-6">
          {/* ── Form Panel ── */}
          <div className="lg:col-span-2">
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-gray-100 shadow-sm overflow-hidden sticky top-24 card-shine">
              <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-teal-500 to-sky-600">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                    <Plus size={20} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">Buat Akun Baru</h2>
                    <p className="text-xs text-white/70 mt-0.5">Isi informasi akun petugas</p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                {/* Role selector */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Role Petugas *</label>
                  <div className="grid grid-cols-2 gap-2">
                    {ROLE_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => { setForm({ ...form, role: opt.value }); setErrorMsg(''); }}
                        className={`flex flex-col items-start p-3.5 rounded-xl border-2 text-left transition-all ${
                          form.role === opt.value
                            ? opt.color === 'teal'
                              ? 'border-teal-500 bg-teal-50'
                              : 'border-emerald-500 bg-emerald-50'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <span className={`text-sm font-bold ${form.role === opt.value ? (opt.color === 'teal' ? 'text-teal-700' : 'text-emerald-700') : 'text-gray-700'}`}>
                          {opt.label}
                        </span>
                        <span className="text-[11px] text-gray-400 mt-0.5 leading-tight">{opt.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Nama */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Nama Lengkap *</label>
                  <div className="relative">
                    <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input name="nama" value={form.nama} onChange={handleChange} required
                      className={`${inputClass} pl-10`} placeholder="Nama lengkap petugas" />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Email *</label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="email" name="email" value={form.email} onChange={handleChange} required
                      className={`${inputClass} pl-10`} placeholder="email@contoh.com" />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Password *</label>
                  <div className="relative">
                    <Key size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password" value={form.password} onChange={handleChange} required
                      className={`${inputClass} pl-10 pr-10`} placeholder="Min. 6 karakter" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* No. Telepon */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">No. Telepon</label>
                  <div className="relative">
                    <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input name="no_telepon" value={form.no_telepon} onChange={handleChange}
                      className={`${inputClass} pl-10`} placeholder="08xxxxxxxxxx" />
                  </div>
                </div>

                {/* Alamat */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Alamat</label>
                  <div className="relative">
                    <MapPin size={15} className="absolute left-3.5 top-3.5 text-gray-400" />
                    <textarea name="alamat" value={form.alamat} onChange={handleChange} rows={2}
                      className={`${inputClass} pl-10 resize-none`} placeholder="Alamat lengkap" />
                  </div>
                </div>

                {/* Feedback */}
                {errorMsg && (
                  <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 rounded-xl p-3.5 text-sm">
                    <AlertCircle size={16} className="flex-shrink-0 mt-0.5" /> {errorMsg}
                  </div>
                )}
                {successMsg && (
                  <div className="flex items-start gap-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl p-3.5 text-sm">
                    <CheckCircle2 size={16} className="flex-shrink-0 mt-0.5" /> {successMsg}
                  </div>
                )}

                <button type="submit" disabled={isSubmitting}
                  className="w-full py-3.5 bg-gradient-to-r from-teal-500 to-sky-600 text-white rounded-xl font-semibold text-sm hover:shadow-lg hover:shadow-teal-500/25 hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {isSubmitting ? <><Loader2 size={16} className="animate-spin" /> Membuat Akun...</> : <><Plus size={16} /> Buat Akun</>}
                </button>
              </form>
            </div>
          </div>

          {/* ── Account List Panel ── */}
          <div className="lg:col-span-3">
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-lg transition-all duration-500">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h2 className="text-base font-bold text-gray-900">Daftar Akun Petugas</h2>
                    <p className="text-xs text-gray-400 mt-0.5">{accounts.length} akun terdaftar</p>
                  </div>
                  <div className="flex gap-2">
                    {[
                      { key: 'all', label: 'Semua' },
                      { key: 'kader', label: 'Kader' },
                      { key: 'ahli_gizi', label: 'Ahli Gizi' },
                    ].map(tab => (
                      <button key={tab.key} onClick={() => setFilterRole(tab.key)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                          filterRole === tab.key
                            ? 'bg-gradient-to-r from-teal-500 to-sky-600 text-white shadow-sm'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}>
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="divide-y divide-gray-50">
                {isLoadingList ? (
                  <div className="py-16 flex flex-col items-center gap-3 text-gray-400">
                    <Loader2 size={28} className="animate-spin" />
                    <p className="text-sm">Memuat daftar akun...</p>
                  </div>
                ) : filteredAccounts.length === 0 ? (
                  <div className="py-16 flex flex-col items-center gap-3 text-gray-400">
                    <Users size={36} className="opacity-30" />
                    <p className="text-sm font-medium">Belum ada akun petugas</p>
                    <p className="text-xs text-gray-400">Buat akun baru menggunakan form di sebelah kiri</p>
                  </div>
                ) : filteredAccounts.map((acc) => (
                  <div key={acc.uuid} className="p-5 flex items-start justify-between gap-4 hover:bg-teal-50/30 transition-all duration-300">
                    <div className="flex items-start gap-3.5 min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${acc.role === 'kader' ? 'bg-gradient-to-br from-teal-400 to-teal-600' : 'bg-gradient-to-br from-emerald-400 to-emerald-600'}`}>
                        {(acc.nama || '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 text-sm truncate">{acc.nama}</p>
                        <p className="text-xs text-gray-400 mt-0.5 truncate">{acc.email}</p>
                        {acc.no_telepon && (
                          <p className="text-xs text-gray-400 mt-0.5">{acc.no_telepon}</p>
                        )}
                        <p className="text-[11px] text-gray-300 mt-1">Dibuat: {formatDate(acc.created_at)}</p>
                      </div>
                    </div>
                    <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold border flex-shrink-0 ${roleStyle(acc.role)}`}>
                      {acc.role === 'kader' ? 'Kader' : 'Ahli Gizi'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
