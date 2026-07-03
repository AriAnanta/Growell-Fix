'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Edit2, Mail, Phone, MapPin, Shield, Calendar, Clock, Plus, Trash2, X, Info, Lock, Eye, EyeOff } from 'lucide-react';
import { getUserData, apiFetch, isAuthenticated } from '@/utils/auth';
import CustomDatePicker from '@/components/forms/CustomDatePicker';
import AppNavbar from '@/components/common/AppNavbar';

export default function ProfilePage() {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({ nama: '', email: '', no_telepon: '', alamat: '', posyandu_nama: '', posyandu_alamat: '', currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [userMeta, setUserMeta] = useState({ role: '', uuid: '' });

  const [jadwalList, setJadwalList] = useState([]);
  const [isJadwalLoading, setIsJadwalLoading] = useState(false);
  const [showJadwalModal, setShowJadwalModal] = useState(false);
  const [newJadwal, setNewJadwal] = useState({ tanggal: '', waktu_mulai: '', waktu_selesai: '', kegiatan: '', catatan: '' });

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
        setFormData({ 
          nama: u.nama || '', 
          email: u.email || '', 
          no_telepon: u.no_telepon || '', 
          alamat: u.alamat || '',
          posyandu_nama: u.posyandu_nama || '',
          posyandu_alamat: u.posyandu_alamat || '',
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        setUserMeta({ role: u.role || '', uuid: u.uuid || '' });
        
        if (u.role === 'kader') {
          fetchJadwal();
        }
      }
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSave = async () => {
    if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
      alert("Konfirmasi password baru tidak cocok!");
      return;
    }
    setIsSaving(true);
    try {
      const res = await apiFetch('/api/auth/profile', { method: 'PUT', body: JSON.stringify(formData) });
      if (res.ok) {
        setIsEditing(false);
        // growell_user cookie is refreshed by the API route after save
        await fetchProfile();
        alert('Profil berhasil diperbarui!');
      } else {
        const data = await res.json();
        alert(data.error || 'Gagal menyimpan profil');
      }
    } catch (e) { console.error(e); }
    finally { setIsSaving(false); }
  };

  const fetchJadwal = async () => {
    setIsJadwalLoading(true);
    try {
      const res = await apiFetch('/api/kader/jadwal');
      if (res.ok) {
        const json = await res.json();
        setJadwalList(json.data || []);
      }
    } catch (e) { console.error(e); }
    finally { setIsJadwalLoading(false); }
  };

  const handleAddJadwal = async (e) => {
    e.preventDefault();
    if (!newJadwal.tanggal) return;
    try {
      const res = await apiFetch('/api/kader/jadwal', {
        method: 'POST',
        body: JSON.stringify(newJadwal)
      });
      if (res.ok) {
        setShowJadwalModal(false);
        setNewJadwal({ tanggal: '', waktu_mulai: '', waktu_selesai: '', kegiatan: '', catatan: '' });
        fetchJadwal();
      } else {
        const data = await res.json();
        alert(data.error || 'Gagal menambahkan jadwal');
      }
    } catch (e) { console.error(e); }
  };

  const handleDeleteJadwal = async (uuid) => {
    if (!confirm('Apakah Anda yakin ingin menghapus jadwal ini?')) return;
    try {
      const res = await apiFetch(`/api/kader/jadwal?uuid=${uuid}`, { method: 'DELETE' });
      if (res.ok) fetchJadwal();
    } catch (e) { console.error(e); }
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
      {/* Modal Tambah Jadwal */}
      {showJadwalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowJadwalModal(false)} />
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-teal-500 to-sky-600 px-6 py-5">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-bold text-lg">Tambah Jadwal Baru</h3>
                <button onClick={() => setShowJadwalModal(false)} className="text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-lg transition-colors">
                  <X size={18} />
                </button>
              </div>
            </div>
            <form onSubmit={handleAddJadwal} className="p-6 space-y-4">
              <div>
                <CustomDatePicker
                  name="tanggal"
                  value={newJadwal.tanggal}
                  onChange={(e) => setNewJadwal({ ...newJadwal, tanggal: e.target.value })}
                  placeholder="Tanggal Jadwal"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1.5 block">Jam Mulai</label>
                  <input type="time" value={newJadwal.waktu_mulai} onChange={(e) => setNewJadwal({ ...newJadwal, waktu_mulai: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1.5 block">Jam Selesai</label>
                  <input type="time" value={newJadwal.waktu_selesai} onChange={(e) => setNewJadwal({ ...newJadwal, waktu_selesai: e.target.value })} className={inputClass} />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Kegiatan</label>
                <input type="text" placeholder="Contoh: Penimbangan, Imunisasi" value={newJadwal.kegiatan} onChange={(e) => setNewJadwal({ ...newJadwal, kegiatan: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Catatan Tambahan</label>
                <textarea placeholder="Contoh: Bawa buku KIA" value={newJadwal.catatan} onChange={(e) => setNewJadwal({ ...newJadwal, catatan: e.target.value })} rows={2} className={`${inputClass} resize-none`} />
              </div>
              <button type="submit" disabled={!newJadwal.tanggal} className="w-full py-3 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-xl transition-all disabled:opacity-50">
                Simpan Jadwal
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Decorative blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-32 -right-32 w-80 h-80 bg-teal-400/[0.04] rounded-full blur-[100px] animate-float-slow" />
        <div className="absolute bottom-20 -left-32 w-96 h-96 bg-sky-400/[0.03] rounded-full blur-[100px] animate-float-slow-reverse" />
      </div>
      {/* Navbar */}
      <AppNavbar maxWidth="max-w-4xl">
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
      </AppNavbar>

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

        {/* Keamanan & Kata Sandi */}
        {isEditing && (
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-gray-200 p-6 sm:p-8 shadow-sm section-appear mt-6">
            <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4">
              <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100">
                <Lock size={18} className="text-slate-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-base">Keamanan & Kata Sandi</h3>
                <p className="text-xs text-gray-500 mt-0.5">Kosongkan jika tidak ingin mengubah kata sandi</p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-5 mb-2">
              <div className="sm:col-span-2">
                <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-2">Password Lama</label>
                <div className="relative">
                  <input type={showCurrentPassword ? 'text' : 'password'} name="currentPassword" value={formData.currentPassword} onChange={handleChange} className={inputClass} placeholder="Masukkan password lama" />
                  <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)} className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition">
                    {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-2">Password Baru</label>
                <div className="relative">
                  <input type={showNewPassword ? 'text' : 'password'} name="newPassword" value={formData.newPassword} onChange={handleChange} className={inputClass} placeholder="Minimal 6 karakter" />
                  <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition">
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-2">Konfirmasi Password Baru</label>
                <input type={showNewPassword ? 'text' : 'password'} name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} className={inputClass} placeholder="Ulangi password baru" />
              </div>
            </div>
          </div>
        )}

        {/* Informasi Posyandu Khusus Kader */}
        {userMeta.role === 'kader' && (
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-gray-200 p-6 sm:p-8 shadow-sm section-appear mt-6">
            <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4">
              <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center">
                <MapPin size={18} className="text-teal-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-lg">Informasi Posyandu</h3>
                <p className="text-xs text-gray-500 mt-0.5">Data Posyandu yang Anda kelola</p>
              </div>
            </div>
            
            <div className="grid sm:grid-cols-2 gap-5 mb-8">
              {[
                { label: 'Nama Posyandu', name: 'posyandu_nama', type: 'text' },
                { label: 'Alamat Posyandu', name: 'posyandu_alamat', type: 'textarea', full: true },
              ].map(f => (
                <div key={f.name} className={f.full ? 'sm:col-span-2' : ''}>
                  <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-2">{f.label}</label>
                  {isEditing ? (
                    f.type === 'textarea'
                      ? <textarea name={f.name} value={formData[f.name]} onChange={handleChange} rows={2} className={`${inputClass} resize-none`} placeholder="Opsional" />
                      : <input type={f.type} name={f.name} value={formData[f.name]} onChange={handleChange} className={inputClass} placeholder="Contoh: Posyandu Melati 1" />
                  ) : (
                    <div className="px-4 py-3 bg-gray-50 rounded-xl text-sm text-gray-900 border border-gray-100">{formData[f.name] || <span className="text-gray-400">Belum diisi</span>}</div>
                  )}
                </div>
              ))}
            </div>

            {/* Manajemen Jadwal */}
            <div className="border-t border-gray-100 pt-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 gap-3">
                <div>
                  <h3 className="font-bold text-gray-900 text-base">Manajemen Jadwal</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Atur jadwal kegiatan Posyandu Anda</p>
                </div>
                {formData.posyandu_nama ? (
                  <button onClick={() => setShowJadwalModal(true)} className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-900 hover:bg-gray-800 text-white text-xs font-semibold rounded-lg transition-colors">
                    <Plus size={14} /> Tambah Jadwal
                  </button>
                ) : (
                  <p className="text-[10px] text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-100">Simpan nama posyandu terlebih dahulu.</p>
                )}
              </div>

              {isJadwalLoading ? (
                <div className="py-8 text-center text-gray-400"><span className="animate-pulse">Memuat jadwal...</span></div>
              ) : jadwalList.length === 0 ? (
                <div className="bg-gray-50 rounded-xl border border-dashed border-gray-200 p-6 text-center">
                  <Calendar size={24} className="text-gray-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-gray-600">Belum ada jadwal tersimpan</p>
                  <p className="text-xs text-gray-400 mt-1">Tambahkan jadwal kegiatan posyandu Anda agar orang tua dapat melihatnya.</p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-4">
                  {jadwalList.map((jadwal) => (
                    <div key={jadwal.uuid} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm relative group flex items-start gap-3">
                      <div className="w-12 h-12 bg-teal-50 rounded-xl flex flex-col items-center justify-center flex-shrink-0 border border-teal-100">
                        <span className="text-[10px] font-semibold text-teal-600 uppercase leading-none mt-1">
                          {new Date(jadwal.tanggal).toLocaleString('id-ID', { month: 'short' })}
                        </span>
                        <span className="text-lg font-bold text-teal-700 leading-none my-0.5">
                          {new Date(jadwal.tanggal).getDate()}
                        </span>
                      </div>
                      <div className="flex-1 pr-6">
                        <h4 className="font-bold text-gray-800 text-sm">{jadwal.kegiatan || 'Kegiatan Rutin'}</h4>
                        <div className="flex items-center gap-1 text-[11px] text-gray-500 mt-1 mb-0.5">
                          <Clock size={10} />
                          <span>{jadwal.waktu_mulai ? jadwal.waktu_mulai.substring(0, 5) : '-'} - {jadwal.waktu_selesai ? jadwal.waktu_selesai.substring(0, 5) : 'Selesai'}</span>
                        </div>
                        {jadwal.catatan && (
                          <div className="flex items-start gap-1 text-[11px] text-gray-400 mt-1 line-clamp-2">
                            <Info size={10} className="shrink-0 mt-0.5" />
                            <span>{jadwal.catatan}</span>
                          </div>
                        )}
                      </div>
                      <button 
                        onClick={() => handleDeleteJadwal(jadwal.uuid)}
                        className="absolute top-3 right-3 p-1.5 text-gray-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                        title="Hapus jadwal"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
