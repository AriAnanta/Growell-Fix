'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Edit2, Mail, Phone, MapPin, Shield } from 'lucide-react';
import { getUserData, apiFetch, isAuthenticated } from '@/utils/auth';

export default function ProfilePage() {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({ nama: '', email: '', no_telepon: '', alamat: '' });
  const [userMeta, setUserMeta] = useState({ role: '', uuid: '' });

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/login'); return; }
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await apiFetch('/api/auth/profile');
      if (res.ok) {
        const data = await res.json();
        const u = data.user || data;
        setFormData({ nama: u.nama || '', email: u.email || '', no_telepon: u.no_telepon || '', alamat: u.alamat || '' });
        setUserMeta({ role: u.role || '', uuid: u.uuid || '' });
      }
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await apiFetch('/api/auth/profile', { method: 'PUT', body: JSON.stringify(formData) });
      if (res.ok) {
        setIsEditing(false);
        // growell_user cookie is refreshed by the API route after save
        await fetchProfile();
      }
    } catch (e) { console.error(e); }
    finally { setIsSaving(false); }
  };

  const roleLabels = { kader: 'Kader Posyandu', orang_tua: 'Orang Tua', ahli_gizi: 'Ahli Gizi', puskesmas: 'Puskesmas', kelurahan: 'Kelurahan' };
  const roleColors = { kader: 'bg-teal-50 text-teal-700 border-teal-100', orang_tua: 'bg-sky-50 text-sky-700 border-sky-100', ahli_gizi: 'bg-emerald-50 text-emerald-700 border-emerald-100', puskesmas: 'bg-indigo-50 text-indigo-700 border-indigo-100', kelurahan: 'bg-violet-50 text-violet-700 border-violet-100' };

  const inputClass = "w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-gray-900 focus:bg-white focus:ring-0 outline-none transition-all text-sm text-gray-900";

  if (isLoading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-t-teal-500 border-gray-200 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 page-enter mesh-bg bg-orbs relative">
      {/* Decorative blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-32 -right-32 w-80 h-80 bg-teal-400/[0.04] rounded-full blur-[100px] animate-float-slow" />
        <div className="absolute bottom-20 -left-32 w-96 h-96 bg-sky-400/[0.03] rounded-full blur-[100px] animate-float-slow-reverse" />
      </div>
      {/* Navbar */}
      <div className="sticky top-0 z-40 bg-gray-50/80 backdrop-blur-md px-3 sm:px-4 pt-3 pb-2">
        <nav className="max-w-4xl mx-auto rounded-2xl bg-white/95 backdrop-blur-xl shadow-lg shadow-black/[0.05] border border-gray-100 px-4 sm:px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-2 -ml-1 hover:bg-gray-100 rounded-xl transition-colors text-gray-500">
              <ArrowLeft size={18} />
            </button>
            <div className="h-5 w-px bg-gray-200" />
            <Link href="/" className="flex items-center gap-2.5 group hover:opacity-80 transition-opacity">
              <div className="w-9 h-9 rounded-xl overflow-hidden shadow-sm group-hover:shadow-teal-200 transition-shadow duration-300">
                <img src="/growell-logo.png" alt="Growell" className="w-full h-full object-cover" />
              </div>
              <span className="text-base font-bold text-gray-900 tracking-tight hidden sm:block">Profil Saya</span>
            </Link>
          </div>
          {isEditing ? (
            <div className="flex gap-2">
              <button onClick={() => { setIsEditing(false); fetchProfile(); }} className="px-3.5 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">Batal</button>
              <button onClick={handleSave} disabled={isSaving} className="px-3.5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-teal-500 to-sky-600 rounded-xl hover:shadow-lg hover:shadow-teal-500/20 transition-all disabled:opacity-50 flex items-center gap-1.5">
                <Save size={14} />{isSaving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          ) : (
            <button onClick={() => setIsEditing(true)} className="px-3.5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-teal-500 to-sky-600 rounded-xl hover:shadow-lg hover:shadow-teal-500/20 transition-all flex items-center gap-1.5">
              <Edit2 size={14} /><span className="hidden sm:inline">Edit Profil</span>
            </button>
          )}
        </nav>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Profile Header Card */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-gray-200 p-6 sm:p-8 mb-6 shadow-sm section-appear card-shine">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-teal-400 to-sky-600 flex items-center justify-center text-white text-3xl font-bold shrink-0 shadow-lg shadow-teal-500/20">
              {formData.nama.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">{formData.nama}</h2>
              <p className="text-sm text-gray-500 mt-1">{formData.email}</p>
              <span className={`inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full text-xs font-semibold border ${roleColors[userMeta.role] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                <Shield size={10} />
                {roleLabels[userMeta.role] || userMeta.role}
              </span>
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-gray-200 p-6 sm:p-8 shadow-sm section-appear section-appear-delay-1">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-6">Informasi Pribadi</p>
          <div className="grid sm:grid-cols-2 gap-5">
            {[
              { label: 'Nama Lengkap', name: 'nama', type: 'text' },
              { label: 'Email', name: 'email', type: 'email', icon: <Mail size={13} className="text-gray-400" /> },
              { label: 'Nomor Telepon', name: 'no_telepon', type: 'tel', icon: <Phone size={13} className="text-gray-400" /> },
              { label: 'Alamat', name: 'alamat', type: 'textarea', icon: <MapPin size={13} className="text-gray-400" />, full: true },
            ].map(f => (
              <div key={f.name} className={f.full ? 'sm:col-span-2' : ''}>
                <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-2">{f.icon}{f.label}</label>
                {isEditing ? (
                  f.type === 'textarea'
                    ? <textarea name={f.name} value={formData[f.name]} onChange={handleChange} rows={3} className={`${inputClass} resize-none`} />
                    : <input type={f.type} name={f.name} value={formData[f.name]} onChange={handleChange} className={inputClass} />
                ) : (
                  <div className="px-4 py-3 bg-gray-50 rounded-xl text-sm text-gray-900 border border-gray-100">{formData[f.name] || <span className="text-gray-400">Belum diisi</span>}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
