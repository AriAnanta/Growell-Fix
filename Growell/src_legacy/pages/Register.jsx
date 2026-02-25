import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Lock, User, Eye, EyeOff, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react';
import growellLogo from '../assets/Growell (1).png';

export default function Register() {
  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) { alert('Kata sandi tidak cocok!'); return; }
    if (!agreedToTerms) { alert('Anda harus menyetujui syarat dan ketentuan'); return; }
    setIsLoading(true);
    setTimeout(() => { setIsLoading(false); console.log('Register:', formData); }, 800);
  };

  const pwReqs = [
    { text: 'Minimal 8 karakter', met: formData.password.length >= 8 },
    { text: 'Mengandung huruf besar', met: /[A-Z]/.test(formData.password) },
    { text: 'Mengandung angka', met: /[0-9]/.test(formData.password) }
  ];

  const inputCls = "w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 outline-none transition-all text-sm text-gray-900";

  return (
    <div className="min-h-screen flex page-enter" style={{ background: 'var(--gw-grad-subtle)' }}>
      {/* Left Branding Panel */}
      <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden items-center justify-center p-12" style={{ background: 'var(--gw-grad-hero)' }}>
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 30% 70%, rgba(255,255,255,0.2), transparent 50%), radial-gradient(circle at 70% 30%, rgba(255,255,255,0.15), transparent 50%)' }}></div>
        <div className="relative z-10 max-w-md">
          <Link to="/" className="flex items-center gap-3 mb-10">
            <img src={growellLogo} alt="Growell" className="w-12 h-12 rounded-xl object-cover" />
            <span className="text-2xl font-bold text-white">Growell</span>
          </Link>
          <h2 className="text-4xl font-extrabold text-white mb-4 leading-tight tracking-tight">
            Bergabunglah dengan Keluarga Growell
          </h2>
          <p className="text-white/70 text-base leading-relaxed">
            Daftarkan akun Anda dan mulai pantau tumbuh kembang balita dengan sistem cerdas berbasis AI. Gratis selamanya.
          </p>
          <div className="mt-10 space-y-3">
            {['Pendaftaran cepat, hanya 1 menit', 'Gratis tanpa batas waktu', 'Data terenkripsi & aman'].map((t, i) => (
              <div key={i} className="flex items-center gap-2.5 text-white/80 text-sm">
                <CheckCircle2 size={16} className="text-emerald-300 flex-shrink-0" />{t}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="flex-1 flex items-center justify-center px-5 sm:px-8 py-12">
        <div className="w-full max-w-[420px]">
          <div className="lg:hidden text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2.5">
              <img src={growellLogo} alt="Growell" className="w-10 h-10 rounded-xl object-cover" />
              <span className="text-xl font-bold gw-text-gradient">Growell</span>
            </Link>
          </div>

          <div className="mb-7">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">Buat Akun Baru</h1>
            <p className="text-gray-500 mt-2 text-sm">Mulai perjalanan parenting digital Anda hari ini.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nama Lengkap</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input type="text" name="name" value={formData.name} onChange={handleChange} required className={inputCls} placeholder="Nama lengkap Anda" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input type="email" name="email" value={formData.email} onChange={handleChange} required className={inputCls} placeholder="nama@email.com" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Kata Sandi</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input type={showPassword ? 'text' : 'password'} name="password" value={formData.password} onChange={handleChange} required className={`${inputCls} !pr-11`} placeholder="Minimal 8 karakter" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-teal-600 transition">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
              </div>
              {formData.password && (
                <div className="mt-2 space-y-1">
                  {pwReqs.map((r, i) => (
                    <div key={i} className="flex items-center text-xs gap-1.5">
                      <CheckCircle2 className={`flex-shrink-0 ${r.met ? 'text-emerald-500' : 'text-gray-300'}`} size={14} />
                      <span className={r.met ? 'text-emerald-600' : 'text-gray-500'}>{r.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Konfirmasi Kata Sandi</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input type={showConfirmPassword ? 'text' : 'password'} name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} required
                  className={`${inputCls} !pr-11 ${formData.confirmPassword && formData.password !== formData.confirmPassword ? '!border-red-300 focus:!border-red-500' : formData.confirmPassword && formData.password === formData.confirmPassword ? '!border-emerald-300 focus:!border-emerald-500' : ''}`}
                  placeholder="Ulangi kata sandi" />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-teal-600 transition">{showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
              </div>
              {formData.confirmPassword && formData.password !== formData.confirmPassword && <p className="mt-1 text-xs text-red-600">Kata sandi tidak cocok</p>}
            </div>

            <div className="flex items-start gap-2.5">
              <input type="checkbox" id="terms" checked={agreedToTerms} onChange={(e) => setAgreedToTerms(e.target.checked)} className="mt-0.5 w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500" />
              <label htmlFor="terms" className="text-sm text-gray-600 leading-relaxed">
                Saya menyetujui <Link to="/terms" className="text-teal-600 hover:text-teal-700 font-semibold">Syarat & Ketentuan</Link> dan <Link to="/privacy" className="text-teal-600 hover:text-teal-700 font-semibold">Kebijakan Privasi</Link>
              </label>
            </div>

            <button type="submit" disabled={isLoading || !agreedToTerms}
              className="w-full gw-btn-primary flex items-center justify-center gap-2 text-base disabled:opacity-50 disabled:cursor-not-allowed !mt-5">
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  Memproses...
                </span>
              ) : (<>Daftar Sekarang <ArrowRight size={18} /></>)}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">Sudah punya akun? <Link to="/login" className="font-semibold text-teal-600 hover:text-teal-700 transition">Masuk di sini</Link></p>
          </div>

          <div className="mt-5 text-center">
            <Link to="/" className="text-sm text-gray-400 hover:text-teal-600 transition inline-flex items-center gap-1"><ArrowLeft size={14} /> Kembali ke Beranda</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
