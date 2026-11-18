const { Pool } = require('pg');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';
if (isProduction && !process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL debe configurarse en producción.');
}
if (isProduction && (process.env.DB_SSL !== 'true' || !process.env.DB_SSL_CA)) {
  throw new Error('DB_SSL=true y DB_SSL_CA son obligatorios en producción.');
}
if (isProduction) {
  let databaseUrl;
  try {
    databaseUrl = new URL(process.env.DATABASE_URL);
  } catch {
    throw new Error('DATABASE_URL no es una URL válida.');
  }
  if (!['postgres:', 'postgresql:'].includes(databaseUrl.protocol)) {
    throw new Error('DATABASE_URL debe ser una URL de PostgreSQL.');
  }
  if (['ssl', 'sslmode', 'sslcert', 'sslkey', 'sslrootcert'].some((key) => databaseUrl.searchParams.has(key))) {
    throw new Error('Configura TLS con DB_SSL y DB_SSL_CA, sin parámetros SSL en DATABASE_URL.');
  }
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'taller_automotriz',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true'
    ? { rejectUnauthorized: true, ...(process.env.DB_SSL_CA ? { ca: process.env.DB_SSL_CA.replace(/\\n/g, '\n') } : {}) }
    : undefined,
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
