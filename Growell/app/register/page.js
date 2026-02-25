'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, ArrowRight, ArrowLeft, Check } from 'lucide-react';
import { saveAuth } from '@/utils/auth';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({ nama: '', email: '', password: '', confirmPassword: '', no_telepon: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const passwordChecks = [
    { label: 'Minimal 6 karakter', ok: formData.password.length >= 6 },
    { label: 'Mengandung huruf', ok: /[a-zA-Z]/.test(formData.password) },
    { label: 'Mengandung angka', ok: /[0-9]/.test(formData.password) }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) { setError('Kata sandi tidak cocok!'); return; }
    if (!agreedToTerms) { setError('Anda harus menyetujui syarat dan ketentuan'); return; }
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nama: formData.nama, email: formData.email, password: formData.password, no_telepon: formData.no_telepon }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registrasi gagal');
      saveAuth(data.user, data.token);
      router.push('/orang-tua');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex page-enter">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-[45%] bg-gray-950 relative overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0">
          <div className="absolute top-1/3 left-1/4 w-[450px] h-[450px] bg-teal-500/10 rounded-full blur-[120px] animate-float-slow" />
          <div className="absolute bottom-1/4 right-1/3 w-[320px] h-[320px] bg-sky-600/10 rounded-full blur-[100px] animate-float-slow-reverse" />
          <div className="absolute top-[10%] right-[15%] w-[180px] h-[180px] bg-violet-500/[0.06] rounded-full blur-[80px] animate-float-slow" />
          <div className="absolute inset-0 bg-hero-grid opacity-[0.03]" />
        </div>
        <div className="relative z-10 max-w-md">
          <Link href="/" className="flex items-center gap-2.5 mb-12">
            <div className="w-10 h-10 rounded-xl overflow-hidden">
              <img src="/growell-logo.png" alt="Growell" className="w-full h-full object-cover" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">Growell</span>
          </Link>
          <h2 className="text-4xl xl:text-5xl font-extrabold text-white leading-tight tracking-tight mb-5">
            Mulai pantau<br />gizi si kecil.
          </h2>
          <p className="text-gray-400 text-lg leading-relaxed mb-8">
            Daftarkan diri sebagai orang tua untuk memantau pertumbuhan balita, berkonsultasi ahli gizi, dan mengakses laporan gizi secara real-time.
          </p>
          <div className="bg-white/[0.04] rounded-2xl p-5 border border-white/[0.06]">
            <p className="text-sm text-gray-300 leading-relaxed">
              <span className="text-teal-400 font-semibold">⚠️ Info:</span> Registrasi ini khusus untuk <strong className="text-white">orang tua balita</strong>. Akun kader, ahli gizi, dan kelurahan dibuat oleh administrator sistem.
            </p>
          </div>
        </div>
      </div>

      {/* Right panel — Form */}
      <div className="flex-1 flex items-center justify-center px-5 sm:px-8 lg:px-16 py-12 bg-white">
        <div className="w-full max-w-[420px]">
          <div className="lg:hidden mb-8">
            <Link href="/" className="flex items-center gap-2.5">
              <img src="/growell-logo.png" alt="Growell" className="w-9 h-9 rounded-xl object-cover" />
              <span className="text-xl font-extrabold text-gray-900">Growell</span>
            </Link>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight mb-2">Buat Akun</h1>
            <p className="text-gray-500">Daftar sebagai orang tua balita.</p>
          </div>

          {/* Mobile info */}
          <div className="lg:hidden bg-gray-50 rounded-xl p-4 mb-6 border border-gray-100">
            <p className="text-sm text-gray-600"><span className="font-semibold text-gray-900">Info:</span> Registrasi khusus orang tua. Akun lainnya dibuat oleh administrator.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="nama" className="block text-sm font-semibold text-gray-700 mb-2">Nama Lengkap</label>
              <input type="text" id="nama" name="nama" value={formData.nama} onChange={handleChange} required
                className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-gray-900 focus:ring-2 focus:ring-gray-900/5 outline-none transition-all text-gray-900 text-sm placeholder:text-gray-400"
                placeholder="Nama lengkap Anda" />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
              <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} required
                className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-gray-900 focus:ring-2 focus:ring-gray-900/5 outline-none transition-all text-gray-900 text-sm placeholder:text-gray-400"
                placeholder="nama@email.com" />
            </div>
            <div>
              <label htmlFor="no_telepon" className="block text-sm font-semibold text-gray-700 mb-2">Nomor Telepon <span className="text-gray-400 font-normal">(opsional)</span></label>
              <input type="tel" id="no_telepon" name="no_telepon" value={formData.no_telepon} onChange={handleChange}
                className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-gray-900 focus:ring-2 focus:ring-gray-900/5 outline-none transition-all text-gray-900 text-sm placeholder:text-gray-400"
                placeholder="08xxxxxxxxxx" />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">Kata Sandi</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} id="password" name="password" value={formData.password} onChange={handleChange} required
                  className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-gray-900 focus:ring-2 focus:ring-gray-900/5 outline-none transition-all text-gray-900 text-sm pr-12 placeholder:text-gray-400"
                  placeholder="Minimal 6 karakter" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {formData.password && (
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {passwordChecks.map((c, i) => (
                    <span key={i} className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md ${c.ok ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-50 text-gray-400'} transition-colors`}>
                      <Check size={12} className={c.ok ? 'opacity-100' : 'opacity-30'} /> {c.label}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 mb-2">Konfirmasi Kata Sandi</label>
              <div className="relative">
                <input type={showConfirmPassword ? 'text' : 'password'} id="confirmPassword" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} required
                  className={`w-full px-4 py-3.5 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-gray-900/5 outline-none transition-all text-gray-900 text-sm pr-12 placeholder:text-gray-400 ${formData.confirmPassword && formData.password !== formData.confirmPassword ? 'border-red-300 focus:border-red-500' : formData.confirmPassword && formData.password === formData.confirmPassword ? 'border-emerald-300 focus:border-emerald-500' : 'border-gray-200 focus:border-gray-900'}`}
                  placeholder="Ulangi kata sandi" />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition">
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                <p className="mt-1.5 text-xs text-red-500 font-medium">Kata sandi tidak cocok</p>
              )}
            </div>

            <div className="flex items-start pt-1">
              <input type="checkbox" id="terms" checked={agreedToTerms} onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900" />
              <label htmlFor="terms" className="ml-2.5 text-sm text-gray-500">
                Saya menyetujui <span className="text-gray-900 font-medium">Syarat & Ketentuan</span> dan <span className="text-gray-900 font-medium">Kebijakan Privasi</span>
              </label>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">{error}</div>
            )}

            <button type="submit" disabled={isLoading || !agreedToTerms}
              className="w-full py-3.5 bg-gradient-to-r from-teal-500 to-sky-600 text-white rounded-xl font-semibold text-sm hover:shadow-lg hover:shadow-teal-500/25 hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group">
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
                  Memproses...
                </span>
              ) : (
                <>Daftar Sekarang <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" /></>
              )}
            </button>
          </form>

          <div className="mt-6">
            <div className="relative flex items-center">
              <div className="flex-1 border-t border-gray-100"></div>
              <span className="px-4 text-xs text-gray-400 uppercase tracking-wider">atau</span>
              <div className="flex-1 border-t border-gray-100"></div>
            </div>
          </div>

          <p className="mt-5 text-center text-sm text-gray-500">
            Sudah punya akun?{' '}
            <Link href="/login" className="font-semibold text-teal-600 hover:text-teal-700 transition-colors">Masuk</Link>
          </p>

          <Link href="/" className="mt-6 flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors font-medium group">
            <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" /> Kembali ke Beranda
          </Link>
        </div>
      </div>
    </div>
  );
}
