import pool from '../lib/db.js';

async function updateSchema() {
    try {
        // Check if columns exist
        const [columns] = await pool.query('SHOW COLUMNS FROM posyandu LIKE "latitude"');

        if (columns.length === 0) {
            console.log('Adding latitude and longitude columns to posyandu table...');
            await pool.query('ALTER TABLE posyandu ADD COLUMN latitude DECIMAL(10,8) NULL AFTER kelurahan');
            await pool.query('ALTER TABLE posyandu ADD COLUMN longitude DECIMAL(11,8) NULL AFTER latitude');
            console.log('Columns added successfully.');
        } else {
            console.log('Columns already exist.');
        }

        console.log('Seeding dummy coordinates...');

        // Fetch posyandu
        const [posyandus] = await pool.query('SELECT id, nama FROM posyandu');

        // Base center of Bandung (approximate)
        const baseLat = -6.9174639;
        const baseLng = 107.6191228;

        for (let posyandu of posyandus) {
            // Create random offset (approx a few KMs)
            // 0.01 deg is approx 1km
            const latOffset = (Math.random() - 0.5) * 0.05;
            const lngOffset = (Math.random() - 0.5) * 0.05;

            const newLat = baseLat + latOffset;
            const newLng = baseLng + lngOffset;

            await pool.query(
                'UPDATE posyandu SET latitude = ?, longitude = ? WHERE id = ?',
                [newLat, newLng, posyandu.id]
            );
        }

        console.log(`Seeded coordinates for ${posyandus.length} posyandus.`);

    } catch (error) {
        console.error('Error updating schema:', error);
    } finally {
        process.exit();
    }
}

updateSchema();
