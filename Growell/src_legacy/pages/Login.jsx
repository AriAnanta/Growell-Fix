import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowRight, ArrowLeft } from 'lucide-react';
import growellLogo from '../assets/Growell (1).png';
import { saveAuth } from '../utils/auth';

export default function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const KADER_ACCOUNTS = [
    { email: 'kader@posyandu.com', password: 'kader123', role: 'kader' },
    { email: 'kader@growell.com', password: 'posyandu123', role: 'kader' }
  ];

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setTimeout(() => {
      const kaderAccount = KADER_ACCOUNTS.find(a => a.email === formData.email && a.password === formData.password);
      if (kaderAccount) {
        saveAuth({ email: kaderAccount.email, role: kaderAccount.role, name: 'Kader Posyandu' });
        navigate('/kader');
      } else if (formData.email && formData.password) {
        setError('Email atau password salah. Gunakan akun demo di bawah.');
      } else {
        setError('Mohon lengkapi email dan password');
      }
      setIsLoading(false);
    }, 800);
  };

  return (
    <div className="min-h-screen flex page-enter" style={{ background: 'var(--gw-grad-subtle)' }}>
      {/* Left Branding Panel (desktop only) */}
      <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden items-center justify-center p-12" style={{ background: 'var(--gw-grad-hero)' }}>
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 30% 70%, rgba(255,255,255,0.2), transparent 50%), radial-gradient(circle at 70% 30%, rgba(255,255,255,0.15), transparent 50%)' }}></div>
        <div className="relative z-10 max-w-md">
          <Link to="/" className="flex items-center gap-3 mb-10">
            <img src={growellLogo} alt="Growell" className="w-12 h-12 rounded-xl object-cover" />
            <span className="text-2xl font-bold text-white">Growell</span>
          </Link>
          <h2 className="text-4xl font-extrabold text-white mb-4 leading-tight tracking-tight">
            Pantau Tumbuh Kembang Anak dengan Cerdas
          </h2>
          <p className="text-white/70 text-base leading-relaxed">
            Sistem pemantauan gizi berbasis AI untuk kader Posyandu dan orang tua. Deteksi dini risiko stunting, dapatkan rekomendasi personal.
          </p>
          <div className="mt-10 flex gap-6">
            {[{ v: '25K+', l: 'Keluarga' }, { v: '150+', l: 'Posyandu' }, { v: '90%+', l: 'Akurasi AI' }].map((s, i) => (
              <div key={i}>
                <div className="text-2xl font-bold text-white">{s.v}</div>
                <div className="text-xs text-white/60 mt-0.5">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="flex-1 flex items-center justify-center px-5 sm:px-8 py-12">
        <div className="w-full max-w-[420px]">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2.5">
              <img src={growellLogo} alt="Growell" className="w-10 h-10 rounded-xl object-cover" />
              <span className="text-xl font-bold gw-text-gradient">Growell</span>
            </Link>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">Masuk ke Akun Anda</h1>
            <p className="text-gray-500 mt-2 text-sm">Selamat datang kembali. Silakan masuk untuk melanjutkan.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input type="email" name="email" value={formData.email} onChange={handleChange} required
                  className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 outline-none transition-all text-sm text-gray-900"
                  placeholder="nama@email.com" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Kata Sandi</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input type={showPassword ? 'text' : 'password'} name="password" value={formData.password} onChange={handleChange} required
                  className="w-full pl-11 pr-11 py-3 bg-white border border-gray-200 rounded-xl focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 outline-none transition-all text-sm text-gray-900"
                  placeholder="Masukkan kata sandi" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-teal-600 transition">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500" />
                <span className="text-sm text-gray-600">Ingat saya</span>
              </label>
              <Link to="/forgot-password" className="text-sm font-semibold text-teal-600 hover:text-teal-700 transition">Lupa sandi?</Link>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm gw-scale-in">{error}</div>
            )}

            {/* Demo account info */}
            <div className="bg-teal-50 border border-teal-200/60 rounded-xl p-4 text-sm">
              <p className="font-semibold text-teal-800 mb-1.5">🔑 Akun Demo Kader:</p>
              <p className="text-teal-700">Email: <code className="font-mono bg-teal-100/60 px-1.5 py-0.5 rounded text-xs">kader@posyandu.com</code></p>
              <p className="text-teal-700 mt-0.5">Password: <code className="font-mono bg-teal-100/60 px-1.5 py-0.5 rounded text-xs">kader123</code></p>
            </div>

            <button type="submit" disabled={isLoading}
              className="w-full gw-btn-primary flex items-center justify-center gap-2 text-base disabled:opacity-50 disabled:cursor-not-allowed">
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  Memproses...
                </span>
              ) : (<>Masuk <ArrowRight size={18} /></>)}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">Belum punya akun? <Link to="/register" className="font-semibold text-teal-600 hover:text-teal-700 transition">Daftar Sekarang</Link></p>
          </div>

          <div className="mt-5 text-center">
            <Link to="/" className="text-sm text-gray-400 hover:text-teal-600 transition inline-flex items-center gap-1"><ArrowLeft size={14} /> Kembali ke Beranda</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
