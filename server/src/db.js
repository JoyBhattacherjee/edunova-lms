require('dotenv').config();
const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  console.error('\n[EduNova] DATABASE_URL is missing. Copy server/.env.example to server/.env and set it.\n');
  process.exit(1);
}

const useSsl = String(process.env.PG_SSL).toLowerCase() === 'true';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: useSsl ? { rejectUnauthorized: false } : false,
  max: 10,
});

pool.on('error', (err) => console.error('Unexpected PG pool error', err));

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
