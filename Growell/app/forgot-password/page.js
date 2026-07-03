'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { apiFetch } from '@/utils/auth';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({ email: '', no_telepon: '', newPassword: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.newPassword !== formData.confirmPassword) {
      setError('Konfirmasi password tidak cocok');
      return;
    }

    if (formData.newPassword.length < 6) {
      setError('Password minimal 6 karakter');
      return;
    }

    setIsLoading(true);
    try {
      const res = await apiFetch('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          email: formData.email,
          no_telepon: formData.no_telepon,
          newPassword: formData.newPassword
        })
      });

      if (res.ok) {
        setSuccess(true);
      } else {
        const data = await res.json();
        setError(data.error || 'Gagal mereset kata sandi. Pastikan email dan no telepon benar.');
      }
    } catch (err) {
      setError('Gagal terhubung ke server');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50/50 p-4 font-sans selection:bg-teal-500/30">
      <div className="w-full max-w-[1000px] bg-white rounded-[2rem] shadow-[0_8px_40px_rgb(0,0,0,0.08)] overflow-hidden flex flex-col md:flex-row min-h-[600px] border border-gray-100">
        
        {/* Left Side - Illustration/Branding */}
        <div className="w-full md:w-5/12 bg-gray-900 relative p-8 sm:p-12 flex flex-col justify-between overflow-hidden">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-teal-500 rounded-full mix-blend-multiply filter blur-[80px] opacity-70 animate-pulse-slow"></div>
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-sky-500 rounded-full mix-blend-multiply filter blur-[80px] opacity-70 animate-pulse-slow"></div>
          
          <div className="relative z-10">
            <Link href="/" className="inline-flex items-center gap-3 group">
              <img src="/growell-logo.png" alt="Growell" className="w-9 h-9 rounded-xl object-cover" />
              <span className="text-xl font-extrabold text-white">Growell</span>
            </Link>
          </div>

          <div className="relative z-10 mt-12 md:mt-0">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-4">Pulihkan Akun Anda.</h2>
            <p className="text-gray-400 text-sm leading-relaxed">
              Karena aplikasi Growell digunakan secara lokal di komunitas Posyandu, verifikasi menggunakan No. Telepon yang terdaftar.
            </p>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="w-full md:w-7/12 p-8 sm:p-12 lg:p-16 flex flex-col justify-center">
          
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight mb-2">Reset Kata Sandi</h1>
            <p className="text-gray-500 text-sm">Masukkan detail di bawah untuk memverifikasi dan mengubah kata sandi.</p>
          </div>

          {success ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={32} />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Kata Sandi Diubah!</h2>
              <p className="text-gray-500 mb-8 text-sm">Anda sekarang dapat masuk menggunakan kata sandi baru Anda.</p>
              <Link href="/login" className="w-full py-3.5 bg-gray-900 text-white rounded-xl font-semibold text-sm hover:bg-gray-800 transition-colors inline-block">
                Kembali ke Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-1.5">Email Terdaftar</label>
                <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} required
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-teal-400 focus:ring-2 focus:ring-teal-400/10 outline-none transition-all text-gray-900 text-sm placeholder:text-gray-400"
                  placeholder="nama@email.com" />
              </div>
              <div>
                <label htmlFor="no_telepon" className="block text-sm font-semibold text-gray-700 mb-1.5">No. Telepon (WhatsApp)</label>
                <input type="tel" id="no_telepon" name="no_telepon" value={formData.no_telepon} onChange={handleChange}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-teal-400 focus:ring-2 focus:ring-teal-400/10 outline-none transition-all text-gray-900 text-sm placeholder:text-gray-400"
                  placeholder="Kosongkan jika tidak mendaftarkan nomor" />
              </div>
              
              <div className="pt-2 border-t border-gray-100"></div>

              <div>
                <label htmlFor="newPassword" className="block text-sm font-semibold text-gray-700 mb-1.5">Kata Sandi Baru</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} id="newPassword" name="newPassword" value={formData.newPassword} onChange={handleChange} required
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-teal-400 focus:ring-2 focus:ring-teal-400/10 outline-none transition-all text-gray-900 text-sm pr-12 placeholder:text-gray-400"
                    placeholder="Minimal 6 karakter" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 mb-1.5">Konfirmasi Kata Sandi Baru</label>
                <div className="relative">
                  <input type={showConfirmPassword ? 'text' : 'password'} id="confirmPassword" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} required
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-teal-400 focus:ring-2 focus:ring-teal-400/10 outline-none transition-all text-gray-900 text-sm pr-12 placeholder:text-gray-400"
                    placeholder="Ulangi kata sandi" />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition">
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">
                  {error}
                </div>
              )}

              <button type="submit" disabled={isLoading}
                className="w-full py-3.5 mt-2 bg-gradient-to-r from-teal-500 to-sky-600 text-white rounded-xl font-semibold text-sm hover:shadow-lg hover:shadow-teal-500/25 hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group">
                {isLoading ? 'Memproses...' : <>Reset Kata Sandi <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" /></>}
              </button>
            </form>
          )}

          <div className="mt-8 text-center">
            <Link href="/login" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors font-medium group">
              <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" /> Kembali ke Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
