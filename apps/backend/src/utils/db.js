'use strict';

const { Pool } = require('pg');

let pool = null;

if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  pool.on('error', (err) => {
    console.error('[DB Pool] Error inesperado en cliente inactivo de PostgreSQL:', err);
  });
}

/**
 * Ejecuta una consulta SQL en la base de datos PostgreSQL local si DATABASE_URL está definido.
 * @param {string} text - Consulta SQL parametrizada
 * @param {Array} params - Parámetros de la consulta
 */
async function query(text, params) {
  if (!pool) {
    throw new Error('[DB] DATABASE_URL no está configurada para conexión directa a PostgreSQL.');
  }
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  if (process.env.NODE_ENV !== 'production' && duration > 100) {
    console.log('[DB Slow Query]', { text, duration, rows: res.rowCount });
  }
  return res;
}

module.exports = {
  pool,
  query,
  isDirectPg: () => !!pool
};
