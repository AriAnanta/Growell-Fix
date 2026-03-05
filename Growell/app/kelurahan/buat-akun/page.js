'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Plus, Users, UserCheck, User, Mail, Phone, MapPin,
  Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2, Trash2, Key, X,
  ChevronDown, LogOut, Search, Shield, Stethoscope, UserPlus, Edit3
} from 'lucide-react';
import { apiFetch, isAuthenticated, getUserData, clearAuth } from '@/utils/auth';
import AppNavbar from '@/components/common/AppNavbar';

const ROLE_OPTIONS = [
  { value: 'kader', label: 'Kader Posyandu', desc: 'Input data balita & prediksi status gizi', icon: Shield, gradient: 'from-teal-500 to-cyan-500', bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200', activeBorder: 'border-teal-500', activeBg: 'bg-teal-50/80' },
  { value: 'ahli_gizi', label: 'Ahli Gizi', desc: 'Terima & jawab konsultasi orang tua', icon: Stethoscope, gradient: 'from-emerald-500 to-green-500', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', activeBorder: 'border-emerald-500', activeBg: 'bg-emerald-50/80' },
];

const inputClass = 'w-full px-4 py-3 bg-gray-50/80 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-teal-400 focus:ring-2 focus:ring-teal-400/10 outline-none transition-all duration-300';

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
  const [searchQuery, setSearchQuery] = useState('');

  // Edit state
  const [editingAcc, setEditingAcc] = useState(null);
  const [editForm, setEditForm] = useState({ nama: '', email: '', no_telepon: '', alamat: '', password: '' });
  const [editError, setEditError] = useState('');
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);

  // Delete state
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Profile dropdown
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  // Toggle create form panel
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    const handler = (e) => { if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => { clearAuth(); router.push('/login'); };

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
      setShowCreateForm(false);
      fetchAccounts();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEdit = (acc) => {
    setEditingAcc(acc);
    setEditForm({ nama: acc.nama, email: acc.email, no_telepon: acc.no_telepon || '', alamat: acc.alamat || '', password: '' });
    setEditError('');
    setShowEditPassword(false);
  };

  const handleUpdateAcc = async (e) => {
    e.preventDefault();
    setIsEditSubmitting(true);
    setEditError('');
    try {
      const res = await apiFetch(`/api/kelurahan/users/${editingAcc.uuid}`, {
        method: 'PUT',
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memperbarui akun');
      setEditingAcc(null);
      fetchAccounts();
    } catch (err) {
      setEditError(err.message);
    } finally {
      setIsEditSubmitting(false);
    }
  };

  const handleDeleteAcc = async () => {
    if (!deleteConfirm) return;
    setIsDeleting(true);
    try {
      const res = await apiFetch(`/api/kelurahan/users/${deleteConfirm.uuid}`, { method: 'DELETE' });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      setDeleteConfirm(null);
      fetchAccounts();
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredAccounts = accounts.filter(a => {
    const matchRole = filterRole === 'all' || a.role === filterRole;
    const matchSearch = !searchQuery || (a.nama || '').toLowerCase().includes(searchQuery.toLowerCase()) || (a.email || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchRole && matchSearch;
  });

  const kaderCount = accounts.filter(a => a.role === 'kader').length;
  const ahliGiziCount = accounts.filter(a => a.role === 'ahli_gizi').length;

  const roleStyle = (role) =>
    role === 'kader'
      ? 'bg-teal-50 text-teal-700 border-teal-200'
      : 'bg-emerald-50 text-emerald-700 border-emerald-200';

  const roleIconBg = (role) =>
    role === 'kader'
      ? 'bg-gradient-to-br from-teal-400 to-cyan-500'
      : 'bg-gradient-to-br from-emerald-400 to-green-500';

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  return (
    <div className="min-h-screen bg-[#fafafa] mesh-bg bg-orbs relative page-enter">
      {/* Decorative blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-32 -right-40 w-96 h-96 bg-teal-400/[0.04] rounded-full blur-[100px] animate-float-slow" />
        <div className="absolute top-1/2 -left-40 w-[500px] h-[500px] bg-sky-400/[0.03] rounded-full blur-[120px] animate-float-slow-reverse" />
        <div className="absolute -bottom-32 right-1/3 w-80 h-80 bg-emerald-400/[0.03] rounded-full blur-[100px] animate-float-slow" />
      </div>

      {/* Floating Pill Navbar */}
      <AppNavbar maxWidth="max-w-7xl">
        <Link href="/" className="flex items-center gap-2.5 group hover:opacity-80 transition-opacity">
          <div className="w-9 h-9 rounded-xl overflow-hidden shadow-sm group-hover:shadow-violet-200 transition-shadow duration-300">
            <img src="/growell-logo.png" alt="Growell" className="w-full h-full object-cover" />
          </div>
          <span className="text-base font-bold text-gray-900 tracking-tight">Growell</span>
          <span className="hidden sm:block text-sm text-gray-400 font-normal">&middot; Kelola Akun</span>
        </Link>
        <div className="flex items-center gap-2">
          <button onClick={() => router.push('/kelurahan')} className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-xl transition-colors font-medium">
            <ArrowLeft size={14} /> Kembali
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
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl shadow-black/10 border border-gray-100 overflow-hidden z-50 animate-fade-in-down">
                <div className="p-1.5">
                  <button onClick={() => { setProfileOpen(false); router.push('/profile'); }} className="w-full px-3 py-2.5 text-left rounded-xl hover:bg-gray-50 flex items-center gap-3 text-sm text-gray-700 transition font-medium"><User size={15} className="text-violet-600" />Profil Saya</button>
                  <div className="my-1 border-t border-gray-100" />
                  <button onClick={handleLogout} className="w-full px-3 py-2.5 text-left rounded-xl hover:bg-red-50 flex items-center gap-3 text-sm text-red-600 transition font-medium"><LogOut size={15} />Keluar</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </AppNavbar>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ── Page Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-teal-500/20 flex-shrink-0">
              <UserPlus size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Kelola Akun <span className="gradient-text-static">Petugas</span></h1>
              <p className="text-sm text-gray-500 mt-0.5">Kelola akun Kader Posyandu dan Ahli Gizi di wilayah Anda.</p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateForm(v => !v)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all self-start sm:self-auto flex-shrink-0 ${
              showCreateForm
                ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                : 'bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-sm hover:shadow-lg hover:shadow-teal-500/25 hover:opacity-90'
            }`}>
            {showCreateForm ? <><X size={15} /> Tutup Form</> : <><Plus size={15} /> Buat Akun Baru</>}
          </button>
        </div>

        {/* ── Stats Summary Cards ── */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6 stagger-grid">
          <div className="stat-card card-shine bg-white rounded-2xl border border-gray-100 p-3 sm:p-5 hover:shadow-xl hover:shadow-teal-100/40 transition-all duration-500 hover:-translate-y-1">
            <div className="flex flex-col items-center gap-1 sm:flex-row sm:gap-3 text-center sm:text-left">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow-md shadow-blue-500/20 flex-shrink-0">
                <Users size={15} className="text-white" />
              </div>
              <div>
                <p className="text-lg sm:text-2xl font-extrabold text-gray-900 tabular-nums count-up">{accounts.length}</p>
                <p className="text-[9px] sm:text-xs text-gray-500 font-medium leading-tight">Total Akun</p>
              </div>
            </div>
          </div>
          <div className="stat-card card-shine bg-white rounded-2xl border border-gray-100 p-3 sm:p-5 hover:shadow-xl hover:shadow-teal-100/40 transition-all duration-500 hover:-translate-y-1">
            <div className="flex flex-col items-center gap-1 sm:flex-row sm:gap-3 text-center sm:text-left">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center shadow-md shadow-teal-400/20 flex-shrink-0">
                <Shield size={15} className="text-white" />
              </div>
              <div>
                <p className="text-lg sm:text-2xl font-extrabold text-gray-900 tabular-nums count-up">{kaderCount}</p>
                <p className="text-[9px] sm:text-xs text-gray-500 font-medium leading-tight">Kader</p>
              </div>
            </div>
          </div>
          <div className="stat-card card-shine bg-white rounded-2xl border border-gray-100 p-3 sm:p-5 hover:shadow-xl hover:shadow-emerald-100/40 transition-all duration-500 hover:-translate-y-1">
            <div className="flex flex-col items-center gap-1 sm:flex-row sm:gap-3 text-center sm:text-left">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center shadow-md shadow-emerald-400/20 flex-shrink-0">
                <Stethoscope size={15} className="text-white" />
              </div>
              <div>
                <p className="text-lg sm:text-2xl font-extrabold text-gray-900 tabular-nums count-up">{ahliGiziCount}</p>
                <p className="text-[9px] sm:text-xs text-gray-500 font-medium leading-tight">Ahli Gizi</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Collapsible Create Form ── */}
        <div className={`grid transition-all duration-500 ease-in-out mb-6 ${showCreateForm ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
          <div className="overflow-hidden">
            <div className="pb-1">
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-gray-100 shadow-sm overflow-hidden card-shine">

                {/* Form Header */}
                <div className="relative px-6 py-4 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-teal-500 via-cyan-500 to-sky-600" />
                  <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 80%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/20 flex-shrink-0">
                        <UserPlus size={18} className="text-white" />
                      </div>
                      <div>
                        <h2 className="text-base font-bold text-white">Buat Akun Baru</h2>
                        <p className="text-xs text-white/70">Isi informasi akun petugas baru</p>
                      </div>
                    </div>
                    <button type="button" onClick={() => setShowCreateForm(false)}
                      className="p-1.5 hover:bg-white/20 rounded-lg transition flex-shrink-0">
                      <X size={16} className="text-white" />
                    </button>
                  </div>
                </div>

                {/* Form Body: 2-col on md+ */}
                <form onSubmit={handleSubmit} className="p-6">
                  <div className="grid md:grid-cols-2 gap-6">

                    {/* LEFT: Role selector */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Role Petugas *</label>
                      <div className="grid grid-cols-2 gap-3 md:h-[calc(100%-28px)]">
                        {ROLE_OPTIONS.map(opt => {
                          const Icon = opt.icon;
                          const isActive = form.role === opt.value;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => { setForm({ ...form, role: opt.value }); setErrorMsg(''); }}
                              className={`group flex flex-col items-center justify-center p-3 sm:p-5 rounded-xl border-2 text-center transition-all duration-300 ${
                                isActive
                                  ? `${opt.activeBorder} ${opt.activeBg} shadow-md`
                                  : 'border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50'
                              }`}
                            >
                              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center mb-2 sm:mb-3 transition-all duration-300 ${
                                isActive ? `bg-gradient-to-br ${opt.gradient} shadow-md` : 'bg-gray-100 group-hover:bg-gray-200'
                              }`}>
                                <Icon size={20} className={isActive ? 'text-white' : 'text-gray-500'} />
                              </div>
                              <span className={`text-xs sm:text-sm font-bold transition-colors ${isActive ? opt.text : 'text-gray-700'}`}>
                                {opt.label}
                              </span>
                              <span className="text-[10px] text-gray-400 mt-1 leading-tight">{opt.desc}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* RIGHT: Form fields */}
                    <div className="flex flex-col gap-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Nama */}
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Nama Lengkap *</label>
                          <div className="relative">
                            <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input name="nama" value={form.nama} onChange={handleChange} required
                              className={`${inputClass} pl-10`} placeholder="Nama lengkap" />
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
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Password */}
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Password *</label>
                          <div className="relative">
                            <Key size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input type={showPassword ? 'text' : 'password'} name="password" value={form.password} onChange={handleChange} required
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

                      <button type="submit" disabled={isSubmitting}
                        className="w-full py-3 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-xl font-semibold text-sm hover:shadow-lg hover:shadow-teal-500/25 hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-auto">
                        {isSubmitting ? <><Loader2 size={16} className="animate-spin" /> Membuat Akun...</> : <><Plus size={16} /> Buat Akun</>}
                      </button>
                    </div>

                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>

        {/* ── Success toast (shown outside form after auto-close) ── */}
        {successMsg && (
          <div className="flex items-start gap-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl p-3.5 text-sm mb-5 animate-in">
            <CheckCircle2 size={16} className="flex-shrink-0 mt-0.5" /> {successMsg}
          </div>
        )}

        {/* ── Account List (full-width, always visible) ── */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-lg transition-all duration-500">
          {/* List Header */}
          <div className="p-5 sm:p-6 border-b border-gray-100">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div>
                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Users size={16} className="text-teal-600" />
                  Daftar Akun Petugas
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">{accounts.length} akun terdaftar</p>
              </div>
              <div className="flex gap-1.5 flex-shrink-0">
                {[
                  { key: 'all', label: 'Semua', count: accounts.length },
                  { key: 'kader', label: 'Kader', count: kaderCount },
                  { key: 'ahli_gizi', label: 'Ahli Gizi', count: ahliGiziCount },
                ].map(tab => (
                  <button key={tab.key} onClick={() => setFilterRole(tab.key)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                      filterRole === tab.key
                        ? 'bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}>
                    {tab.label}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${filterRole === tab.key ? 'bg-white/20' : 'bg-gray-200/80'}`}>{tab.count}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Cari nama atau email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:border-teal-400 focus:ring-2 focus:ring-teal-400/10 outline-none transition-all placeholder:text-gray-400"
              />
            </div>
          </div>

          {/* Account Cards */}
          <div className="p-4">
            {isLoadingList ? (
              <div className="py-16 flex flex-col items-center gap-3 text-gray-400">
                <Loader2 size={28} className="animate-spin" />
                <p className="text-sm">Memuat daftar akun...</p>
              </div>
            ) : filteredAccounts.length === 0 ? (
              <div className="py-16 flex flex-col items-center gap-3 text-gray-400">
                <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-1">
                  <Users size={28} className="text-gray-300" />
                </div>
                <p className="text-sm font-medium text-gray-500">
                  {searchQuery ? 'Tidak ditemukan' : 'Belum ada akun petugas'}
                </p>
                <p className="text-xs text-gray-400">
                  {searchQuery ? `Tidak ada hasil untuk "${searchQuery}"` : 'Klik "Buat Akun Baru" di atas untuk menambahkan petugas'}
                </p>
                {!searchQuery && (
                  <button onClick={() => setShowCreateForm(true)}
                    className="mt-2 flex items-center gap-2 px-4 py-2 bg-teal-50 text-teal-600 rounded-xl text-sm font-semibold hover:bg-teal-100 transition-colors">
                    <Plus size={15} /> Buat Akun Baru
                  </button>
                )}
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3 slide-in-stagger">
                {filteredAccounts.map((acc) => (
                  <div key={acc.uuid}
                    className="group bg-white rounded-xl border border-gray-100 p-4 hover:shadow-lg hover:border-gray-200 hover:-translate-y-0.5 transition-all duration-300">
                    <div className="flex items-start gap-3.5">
                      {/* Avatar */}
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-md ${roleIconBg(acc.role)}`}>
                        {(acc.nama || '?').charAt(0).toUpperCase()}
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <p className="font-semibold text-gray-900 text-sm truncate">{acc.nama}</p>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border ${roleStyle(acc.role)}`}>
                            {acc.role === 'kader' ? <Shield size={9} /> : <Stethoscope size={9} />}
                            {acc.role === 'kader' ? 'Kader' : 'Ahli Gizi'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 flex items-center gap-1 truncate">
                          <Mail size={10} className="flex-shrink-0" />{acc.email}
                        </p>
                        {acc.no_telepon && (
                          <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                            <Phone size={10} className="flex-shrink-0" />{acc.no_telepon}
                          </p>
                        )}
                        <p className="text-[11px] text-gray-300 mt-1">Dibuat: {formatDate(acc.created_at)}</p>
                      </div>
                      {/* Actions */}
                      <div className="flex gap-1.5 flex-shrink-0">
                        <button onClick={() => handleOpenEdit(acc)}
                          className="p-2.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-600 transition-all hover:shadow-sm" title="Edit akun">
                          <Edit3 size={14} />
                        </button>
                        <button onClick={() => setDeleteConfirm({ uuid: acc.uuid, nama: acc.nama })}
                          className="p-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-500 transition-all hover:shadow-sm" title="Hapus akun">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </main>

      {/* ── EDIT MODAL ── */}
      {editingAcc && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setEditingAcc(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}
            style={{ animation: 'scale-in 0.25s cubic-bezier(0.34,1.56,0.64,1)' }}>
            {/* Header */}
            <div className="relative px-6 pt-5 pb-4 flex items-center justify-between border-b border-gray-100 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-teal-500 via-cyan-500 to-sky-600" />
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 80%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
              <div className="relative">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Edit3 size={16} /> Edit Akun
                </h3>
                <p className="text-xs text-white/70 mt-0.5 truncate max-w-[220px]">{editingAcc.nama}</p>
              </div>
              <button onClick={() => setEditingAcc(null)} className="relative p-1.5 hover:bg-white/20 rounded-lg transition">
                <X size={18} className="text-white" />
              </button>
            </div>

            <form onSubmit={handleUpdateAcc} className="p-6 space-y-4">
              {/* Nama */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Nama Lengkap *</label>
                <div className="relative">
                  <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input value={editForm.nama} onChange={e => setEditForm({...editForm, nama: e.target.value})} required
                    className={`${inputClass} pl-10`} placeholder="Nama lengkap" />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Email *</label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="email" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} required
                    className={`${inputClass} pl-10`} placeholder="email@contoh.com" />
                </div>
              </div>

              {/* No. Telepon */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">No. Telepon</label>
                <div className="relative">
                  <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input value={editForm.no_telepon} onChange={e => setEditForm({...editForm, no_telepon: e.target.value})}
                    className={`${inputClass} pl-10`} placeholder="08xxxxxxxxxx" />
                </div>
              </div>

              {/* Alamat */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Alamat</label>
                <div className="relative">
                  <MapPin size={15} className="absolute left-3.5 top-3.5 text-gray-400" />
                  <textarea value={editForm.alamat} onChange={e => setEditForm({...editForm, alamat: e.target.value})} rows={2}
                    className={`${inputClass} pl-10 resize-none`} placeholder="Alamat lengkap" />
                </div>
              </div>

              {/* New Password (optional) */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Password Baru <span className="normal-case font-normal text-gray-400">(kosongkan jika tidak diubah)</span>
                </label>
                <div className="relative">
                  <Key size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showEditPassword ? 'text' : 'password'}
                    value={editForm.password}
                    onChange={e => setEditForm({...editForm, password: e.target.value})}
                    className={`${inputClass} pl-10 pr-10`} placeholder="Min. 6 karakter" />
                  <button type="button" onClick={() => setShowEditPassword(!showEditPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                    {showEditPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {editError && (
                <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 rounded-xl p-3.5 text-sm">
                  <AlertCircle size={16} className="flex-shrink-0 mt-0.5" /> {editError}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditingAcc(null)}
                  className="flex-1 py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">
                  Batal
                </button>
                <button type="submit" disabled={isEditSubmitting}
                  className="flex-1 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-teal-500 to-cyan-600 rounded-xl hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-teal-500/20">
                  {isEditSubmitting ? <><Loader2 size={15} className="animate-spin" /> Menyimpan...</> : <><CheckCircle2 size={15} /> Simpan</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRM MODAL ── */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => !isDeleting && setDeleteConfirm(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}
            style={{ animation: 'scale-in 0.25s cubic-bezier(0.34,1.56,0.64,1)' }}>
            <div className="px-6 pt-6 pb-4 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mb-4">
                <Trash2 size={28} className="text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1.5">Hapus Akun?</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                Akun <strong className="text-gray-800">{deleteConfirm.nama}</strong> akan dihapus permanen dan tidak dapat dipulihkan.
              </p>
            </div>
            <div className="h-px bg-gray-100 mx-6" />
            <div className="px-6 py-4 flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} disabled={isDeleting}
                className="flex-1 py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors disabled:opacity-50">
                Batal
              </button>
              <button onClick={handleDeleteAcc} disabled={isDeleting}
                className="flex-1 py-2.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-red-500/20">
                {isDeleting ? <><Loader2 size={15} className="animate-spin" /> Menghapus...</> : <><Trash2 size={15} /> Hapus Akun</>}
              </button>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes scale-in { from { transform: scale(0.88); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      `}} />
    </div>
  );
}
