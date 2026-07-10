require('dotenv').config();
const cron = require('node-cron');

console.log('🤖 Growell Cron Service: Initializing...');

const port = process.env.PORT || 3000;
const appUrl = process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${port}`;
const triggerUrl = `${appUrl}/api/smart-reminder/trigger`;
const jadwalUrl = `${appUrl}/api/jadwal/trigger-reminder`;

// Jadwal Cron untuk Smart Reminder
const smartReminderCron = '* * * * *'; 

// Jadwal Cron untuk Jadwal Posyandu
const jadwalPosyanduCron = '* * * * *';

console.log(`⏰ Smart Reminder Cron dijadwalkan jalan pada: ${smartReminderCron}`);
console.log(`⏰ Jadwal Posyandu Cron dijadwalkan jalan pada: ${jadwalPosyanduCron} (Setiap 5 menit untuk testing)`);

// 1. Cron Smart Reminder
cron.schedule(smartReminderCron, async () => {
  console.log(`\n[${new Date().toISOString()}] 🚀 Menjalankan Auto Smart Reminder...`);
  
  try {
    const res = await fetch(triggerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    const data = await res.text();
    console.log(`[${new Date().toISOString()}] ✅ Response Smart Reminder: ${res.status}`);
    
    try {
      const json = JSON.parse(data);
      console.log(`   Processed: ${json.total_processed || 0}, Messages Sent: ${json.messages_sent || 0}`);
    } catch (e) {
      console.log(`   Response body: ${data}`);
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Gagal trigger Smart Reminder:`, error.message);
  }
}, {
  scheduled: true,
  timezone: "Asia/Jakarta"
});

// 2. Cron Jadwal Posyandu
cron.schedule(jadwalPosyanduCron, async () => {
  console.log(`\n[${new Date().toISOString()}] 🚀 Menjalankan Jadwal Posyandu Reminder...`);
  
  try {
    const res = await fetch(jadwalUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    const data = await res.text();
    console.log(`[${new Date().toISOString()}] ✅ Response Jadwal Reminder: ${res.status}`);
    
    try {
      const json = JSON.parse(data);
      console.log(`   Schedules Found: ${json.schedules_found || 0}, Messages Sent: ${json.messages_sent || 0}`);
    } catch (e) {
      console.log(`   Response body: ${data}`);
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Gagal trigger Jadwal Reminder:`, error.message);
  }
}, {
  scheduled: true,
  timezone: "Asia/Jakarta"
});

console.log('🤖 Growell Cron Service: Running in background.');
