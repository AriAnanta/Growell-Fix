import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// GET ONBOARDING STATUS
export async function GET(request) {
  const { user, error } = await requireAuth(request);
  if (error) return error;

  try {
    const [progress] = await pool.query(
      'SELECT * FROM onboarding_progress WHERE user_id = ?', [user.id]
    );

    const steps = getStepsForRole(user.role);

    if (progress.length === 0) {
      await pool.query(
        'INSERT INTO onboarding_progress (user_id, total_steps, completed_steps) VALUES (?, ?, ?)',
        [user.id, steps.length, JSON.stringify([])]
      );
      return NextResponse.json({
        is_completed: false, step_completed: 0,
        total_steps: steps.length, completed_steps: [], steps
      });
    }

    const completedSteps = typeof progress[0].completed_steps === 'string'
      ? JSON.parse(progress[0].completed_steps)
      : (progress[0].completed_steps || []);

    return NextResponse.json({
      is_completed: progress[0].is_completed,
      step_completed: progress[0].step_completed,
      total_steps: steps.length,
      completed_steps: completedSteps,
      steps: steps.map(step => ({ ...step, completed: completedSteps.includes(step.id) }))
    });
  } catch (err) {
    console.error('Get onboarding error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}

// COMPLETE A STEP
export async function POST(request) {
  const { user, error } = await requireAuth(request);
  if (error) return error;

  try {
    const body = await request.json();
    const { step_id, action } = body;

    // Skip onboarding
    if (action === 'skip') {
      await pool.query('UPDATE onboarding_progress SET is_completed = TRUE WHERE user_id = ?', [user.id]);
      await pool.query('UPDATE users SET is_new_user = FALSE WHERE id = ?', [user.id]);
      return NextResponse.json({ message: 'Onboarding dilewati' });
    }

    if (!step_id) {
      return NextResponse.json({ error: 'step_id wajib diisi' }, { status: 400 });
    }

    const [progress] = await pool.query(
      'SELECT * FROM onboarding_progress WHERE user_id = ?', [user.id]
    );

    if (progress.length === 0) {
      return NextResponse.json({ error: 'Data onboarding tidak ditemukan' }, { status: 404 });
    }

    let completedSteps = typeof progress[0].completed_steps === 'string'
      ? JSON.parse(progress[0].completed_steps)
      : (progress[0].completed_steps || []);

    if (!completedSteps.includes(step_id)) {
      completedSteps.push(step_id);
    }

    const steps = getStepsForRole(user.role);
    const isCompleted = completedSteps.length >= steps.length;

    await pool.query(
      'UPDATE onboarding_progress SET step_completed = ?, completed_steps = ?, is_completed = ? WHERE user_id = ?',
      [completedSteps.length, JSON.stringify(completedSteps), isCompleted, user.id]
    );

    if (isCompleted) {
      await pool.query('UPDATE users SET is_new_user = FALSE WHERE id = ?', [user.id]);
    }

    return NextResponse.json({
      message: 'Step selesai', step_completed: completedSteps.length,
      total_steps: steps.length, is_completed: isCompleted
    });
  } catch (err) {
    console.error('Complete step error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}

function getStepsForRole(role) {
  const common = [
    { id: 'welcome', title: 'Selamat Datang di Growell!', description: 'Growell adalah platform digital untuk memantau tumbuh kembang balita. Mari kenali fitur-fitur utama.', icon: '👋', target: null },
    { id: 'profile', title: 'Lengkapi Profil Anda', description: 'Pastikan data profil Anda sudah lengkap agar fitur bekerja optimal.', icon: '👤', target: '/profile' },
  ];

  const roleSteps = {
    orang_tua: [
      ...common,
      { id: 'view_balita', title: 'Lihat Data Anak Anda', description: 'Pantau data pertumbuhan anak termasuk BB, TB, dan status gizi.', icon: '👶', target: '/data-balita' },
      { id: 'konsultasi', title: 'Konsultasi Online', description: 'Konsultasi langsung dengan ahli gizi jika anak memiliki masalah gizi.', icon: '💬', target: '/konsultasi' },
      { id: 'notifikasi', title: 'Pantau Notifikasi', description: 'Dapatkan notifikasi jadwal posyandu, hasil pengukuran, dan info penting.', icon: '🔔', target: '/notifications' },
    ],
    kader: [
      ...common,
      { id: 'input_data', title: 'Input Data Balita', description: 'Masukkan data pengukuran balita. Status gizi otomatis diprediksi AI.', icon: '📝', target: '/kader' },
      { id: 'prediksi', title: 'Prediksi Status Gizi', description: 'Sistem AI memprediksi status gizi dan rekomendasi intervensi otomatis.', icon: '🤖', target: '/kader' },
      { id: 'laporan', title: 'Buat Laporan', description: 'Download laporan bulanan/tahunan dalam PDF atau Excel.', icon: '📊', target: '/laporan' },
    ],
    puskesmas: [
      ...common,
      { id: 'dashboard', title: 'Dashboard Monitoring', description: 'Pantau statistik gizi seluruh posyandu wilayah Anda.', icon: '📊', target: '/dashboard' },
      { id: 'laporan', title: 'Manajemen Laporan', description: 'Buat dan unduh laporan komprehensif untuk administrasi.', icon: '📋', target: '/laporan' },
      { id: 'konsultasi_manage', title: 'Kelola Konsultasi', description: 'Pantau sesi konsultasi orang tua dan ahli gizi.', icon: '🏥', target: '/konsultasi' },
    ],
    kelurahan: [
      ...common,
      { id: 'dashboard', title: 'Dashboard Wilayah', description: 'Statistik gizi balita di seluruh posyandu kelurahan.', icon: '📊', target: '/dashboard' },
      { id: 'laporan', title: 'Unduh Laporan', description: 'Unduh laporan gizi balita untuk administrasi kelurahan.', icon: '📋', target: '/laporan' },
    ],
    ahli_gizi: [
      ...common,
      { id: 'konsultasi', title: 'Konsultasi dengan Orang Tua', description: 'Terima dan jawab konsultasi terkait masalah gizi balita.', icon: '💬', target: '/konsultasi' },
      { id: 'data_balita', title: 'Akses Data Balita', description: 'Lihat data lengkap balita untuk rekomendasi tepat.', icon: '📊', target: '/data-balita' },
    ]
  };

  return roleSteps[role] || common;
}
