import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, User, Mail, Phone, MapPin, Calendar, Save, Camera, Edit2, Lock, Shield, Bell } from 'lucide-react';
import growellLogo from '../assets/Growell (1).png';
import Breadcrumb from '../components/common/Breadcrumb';

export default function Profile() {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    nama: 'Kader Posyandu',
    email: 'kader@posyandu.com',
    phone: '+62 812-3456-7890',
    alamat: 'Jl. Posyandu No. 123, Jakarta Selatan',
    tanggalLahir: '1990-01-15',
    posyandu: 'Posyandu Melati',
    wilayah: 'Kelurahan Sukamaju',
    kodeKader: 'KDR-2024-001'
  });

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handleSave = () => { setIsEditing(false); console.log('Profile saved:', formData); };
  const handleCancel = () => setIsEditing(false);

  const inputCls = "w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 outline-none transition-all text-sm text-gray-900";
  const displayCls = "px-4 py-3 bg-gray-50 rounded-xl text-sm text-gray-900";

  return (
    <div className="min-h-screen page-enter" style={{ background: 'var(--gw-grad-subtle)' }}>
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/40" style={{ background: 'rgba(255,255,255,0.78)', backdropFilter: 'blur(20px) saturate(180%)' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/kader')} className="p-2 hover:bg-gray-100 rounded-xl transition"><ArrowLeft size={20} className="text-gray-500" /></button>
              <Link to="/" className="flex items-center gap-2.5">
                <img src={growellLogo} alt="Growell" className="w-8 h-8 rounded-lg object-cover" />
                <span className="text-lg font-bold gw-text-gradient">Profile</span>
              </Link>
            </div>
            {isEditing ? (
              <div className="flex gap-2">
                <button onClick={handleCancel} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition font-medium">Batal</button>
                <button onClick={handleSave} className="gw-btn-primary !py-2 !px-4 !text-sm !rounded-xl flex items-center gap-1.5"><Save size={15} /> Simpan</button>
              </div>
            ) : (
              <button onClick={() => setIsEditing(true)} className="gw-btn-primary !py-2 !px-4 !text-sm !rounded-xl flex items-center gap-1.5"><Edit2 size={15} /> <span className="hidden sm:inline">Edit</span></button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumb items={[{ label: 'Profile', path: '/profile' }]} />

        {/* Profile Header */}
        <div className="gw-card p-6 sm:p-8 mb-5 mt-2">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
            <div className="relative">
              <div className="w-24 h-24 rounded-2xl flex items-center justify-center text-white text-3xl font-bold shadow-lg" style={{ background: 'var(--gw-grad)' }}>
                {formData.nama.charAt(0).toUpperCase()}
              </div>
              {isEditing && (
                <button className="absolute -bottom-1 -right-1 p-1.5 bg-white rounded-full shadow-lg border border-gray-200 hover:shadow-xl transition"><Camera size={14} className="text-gray-600" /></button>
              )}
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight">{formData.nama}</h2>
              <p className="text-sm text-gray-500 mt-0.5">{formData.email}</p>
              <div className="flex flex-wrap gap-2 mt-3 justify-center sm:justify-start">
                <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{ background: 'rgba(13,148,136,0.08)', color: '#0d9488' }}>Kader Posyandu</span>
                <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold">{formData.posyandu}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          {[
            { v: '156', l: 'Total Anak', bg: 'rgba(13,148,136,0.06)' },
            { v: '142', l: 'Status Normal', bg: 'rgba(5,150,105,0.06)' },
            { v: '14', l: 'Risiko Stunting', bg: 'rgba(234,88,12,0.06)' },
            { v: '48', l: 'Bulan Ini', bg: 'rgba(14,165,233,0.06)' }
          ].map((s, i) => (
            <div key={i} className="gw-card !shadow-none p-4 text-center" style={{ background: s.bg }}>
              <div className="text-xl font-bold text-gray-900">{s.v}</div>
              <div className="text-xs text-gray-500 mt-0.5">{s.l}</div>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          {/* Personal Info */}
          <div className="gw-card p-6">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(13,148,136,0.08)' }}><User className="text-teal-600" size={16} /></div>
              <h3 className="text-base font-bold text-gray-900">Informasi Pribadi</h3>
            </div>
            <div className="space-y-3.5">
              {[
                { label: 'Nama Lengkap', name: 'nama', icon: null, type: 'text' },
                { label: 'Email', name: 'email', icon: <Mail size={14} className="text-gray-400" />, type: 'email' },
                { label: 'Nomor Telepon', name: 'phone', icon: <Phone size={14} className="text-gray-400" />, type: 'tel' },
                { label: 'Tanggal Lahir', name: 'tanggalLahir', icon: <Calendar size={14} className="text-gray-400" />, type: 'date' },
                { label: 'Alamat', name: 'alamat', icon: <MapPin size={14} className="text-gray-400" />, type: 'textarea' },
              ].map((field, i) => (
                <div key={i}>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">{field.icon}{field.label}</label>
                  {isEditing ? (
                    field.type === 'textarea' ? <textarea name={field.name} value={formData[field.name]} onChange={handleChange} rows={2} className={`${inputCls} resize-none`} />
                    : <input type={field.type} name={field.name} value={formData[field.name]} onChange={handleChange} className={inputCls} />
                  ) : (
                    <div className={displayCls}>{field.name === 'tanggalLahir' ? new Date(formData[field.name]).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : formData[field.name]}</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Professional Info */}
          <div className="gw-card p-6">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-50"><Shield className="text-blue-600" size={16} /></div>
              <h3 className="text-base font-bold text-gray-900">Informasi Profesional</h3>
            </div>
            <div className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1.5 block uppercase tracking-wider">Kode Kader</label>
                <div className="px-4 py-3 rounded-xl font-mono font-semibold text-sm border" style={{ background: 'rgba(13,148,136,0.04)', borderColor: 'rgba(13,148,136,0.15)', color: '#0d9488' }}>{formData.kodeKader}</div>
              </div>
              {['posyandu', 'wilayah'].map((name, i) => (
                <div key={i}>
                  <label className="text-xs font-semibold text-gray-500 mb-1.5 block uppercase tracking-wider">{name === 'posyandu' ? 'Nama Posyandu' : 'Wilayah'}</label>
                  {isEditing ? <input type="text" name={name} value={formData[name]} onChange={handleChange} className={inputCls} /> : <div className={displayCls}>{formData[name]}</div>}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Security */}
        <div className="gw-card p-6 mt-5">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-purple-50"><Lock className="text-purple-600" size={16} /></div>
            <h3 className="text-base font-bold text-gray-900">Keamanan & Pengaturan</h3>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button className="flex-1 sm:flex-initial px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2"><Lock size={16} /> Ubah Kata Sandi</button>
            <button className="flex-1 sm:flex-initial px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2"><Bell size={16} /> Pengaturan Notifikasi</button>
          </div>
        </div>
      </div>
    </div>
  );
}
