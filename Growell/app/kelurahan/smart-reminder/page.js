'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, CheckCircle2, MessageSquare, Clock, ArrowRight, Loader2 } from 'lucide-react';

export default function SmartReminderDashboard() {
  const router = useRouter();
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);

  useEffect(() => {
    fetchReminders();
  }, []);

  const fetchReminders = async () => {
    try {
      const res = await fetch('/api/kelurahan/smart-reminder');
      if (res.ok) {
        const data = await res.json();
        setReminders(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch reminders:', error);
      alert('Gagal memuat data reminder');
    } finally {
      setLoading(false);
    }
  };

  const handleTrigger = async () => {
    setTriggering(true);
    try {
      const res = await fetch('/api/smart-reminder/trigger', { method: 'POST' });
      const data = await res.json();
      
      if (res.ok) {
        alert(`Berhasil! ${data.messages_sent || data.high_priority_found} pesan baru terkirim.`);
        fetchReminders();
      } else {
        alert(data.error || 'Gagal menjalankan job');
      }
    } catch (error) {
      alert('Terjadi kesalahan sistem');
    } finally {
      setTriggering(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bell className="text-brand-600" />
            Pemantauan Smart Reminder
          </h1>
          <p className="text-gray-500 mt-1">
            Pantau status pesan otomatis yang dikirim oleh Sistem Growell AI ke orang tua.
          </p>
        </div>
        
        <button
          onClick={handleTrigger}
          disabled={triggering}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-sm shadow-brand-200 disabled:opacity-70"
        >
          {triggering ? <Loader2 className="animate-spin w-5 h-5" /> : <Clock className="w-5 h-5" />}
          {triggering ? 'Menjalankan AI...' : 'Jalankan Manual Sekarang'}
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 rounded-tl-2xl">Waktu Kirim</th>
                <th className="px-6 py-4">Orang Tua & Balita</th>
                <th className="px-6 py-4">Status Pesan</th>
                <th className="px-6 py-4 rounded-tr-2xl">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-gray-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-brand-500" />
                  </td>
                </tr>
              ) : reminders.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-gray-500">
                    Belum ada pesan Smart Reminder yang terkirim.
                  </td>
                </tr>
              ) : (
                reminders.map((r) => (
                  <tr key={r.message_id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                      {formatDate(r.sent_at)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{r.orang_tua_nama}</div>
                      <div className="text-gray-500 text-xs mt-0.5">Anak: {r.balita_nama || '-'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1.5">
                        {r.is_replied ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 px-2.5 py-1 rounded-full w-fit">
                            <MessageSquare className="w-3.5 h-3.5" /> Dibalas
                          </span>
                        ) : r.is_read ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full w-fit">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Dibaca
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-gray-100 px-2.5 py-1 rounded-full w-fit">
                            <CheckCircle2 className="w-3.5 h-3.5 text-gray-400" /> Terkirim
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => router.push(`/kelurahan/konsultasi/${r.konsultasi_uuid}`)}
                        className="text-brand-600 hover:text-brand-700 font-medium inline-flex items-center gap-1 text-sm"
                      >
                        Lihat Chat <ArrowRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
