/**
 * Anti-Gravity PostgreSQL Database Pool
 * Specification v1.0 Database Adapter (Supabase / Cloud PostgreSQL)
 */

const { Pool } = require('pg');

const hasPgUrl = process.env.DATABASE_URL && (
  process.env.DATABASE_URL.startsWith('postgres://') || 
  process.env.DATABASE_URL.startsWith('postgresql://')
);

const poolConfig = hasPgUrl
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false }
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'antigravity',
      port: parseInt(process.env.DB_PORT, 10) || 5432,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
    };

const pool = new Pool(poolConfig);

pool.on('connect', () => {
  console.log('Connected to the PostgreSQL database.');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client:', err.message);
});

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params)
};
