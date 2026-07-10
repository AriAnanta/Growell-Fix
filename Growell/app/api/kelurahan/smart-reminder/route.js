import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(request) {
  const { user, error } = await requireAuth(request, ['kelurahan', 'admin']);
  if (error) return error;

  try {
    // 1. Get or Create the System User
    let [sysUsers] = await pool.query(
      "SELECT id FROM users WHERE email = 'system@growell.com' LIMIT 1"
    );
    if (sysUsers.length === 0) {
      await pool.query(`
        INSERT INTO users (uuid, nama, email, password, role, is_active) 
        VALUES (UUID(), 'Sistem Growell', 'system@growell.com', '$2a$10$xyz', 'ahli_gizi', 1)
      `);
      [sysUsers] = await pool.query(
        "SELECT id FROM users WHERE email = 'system@growell.com' LIMIT 1"
      );
      if (sysUsers.length === 0) {
        return NextResponse.json({ data: [] });
      }
    }
    const systemUserId = sysUsers[0].id;

    // 2. Fetch all messages sent by the system (Smart Reminders)
    // and their read status, joined with the parents' info
    const [messages] = await pool.query(`
      SELECT 
        pk.id AS message_id,
        pk.uuid AS message_uuid,
        pk.pesan,
        pk.is_read,
        pk.created_at AS sent_at,
        k.uuid AS konsultasi_uuid,
        k.status AS konsultasi_status,
        ot.nama AS orang_tua_nama,
        b.nama AS balita_nama,
        -- subquery to check if there is a reply from the parent after this message
        (SELECT COUNT(*) FROM pesan_konsultasi pk2 
         WHERE pk2.konsultasi_id = k.id 
           AND pk2.pengirim_id = k.orang_tua_id 
           AND pk2.created_at > pk.created_at) > 0 AS is_replied
      FROM pesan_konsultasi pk
      JOIN konsultasi k ON pk.konsultasi_id = k.id
      JOIN users ot ON k.orang_tua_id = ot.id
      LEFT JOIN balita b ON k.balita_id = b.id
      WHERE pk.pengirim_id = ?
        AND k.topik = 'Smart Reminder Growell'
      ORDER BY pk.created_at DESC
    `, [systemUserId]);

    return NextResponse.json({ data: messages });
  } catch (err) {
    console.error('Get smart reminders error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
