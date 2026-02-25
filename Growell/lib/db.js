import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'growell_user',
  password: process.env.DB_PASSWORD || 'growell_password_2024',
  database: process.env.DB_NAME || 'growell_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

export default pool;

/**
 * Helper to execute a query and return results
 */
export async function query(sql, params = []) {
  const [results] = await pool.query(sql, params);
  return results;
}

/**
 * Helper to execute a query and return first row
 */
export async function queryOne(sql, params = []) {
  const [results] = await pool.query(sql, params);
  return results[0] || null;
}
