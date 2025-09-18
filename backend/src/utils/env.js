// src/utils/env.js
function assertEnv() {
  const missing = [];
  [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
  ].forEach((k) => {
    if (!process.env[k]) missing.push(k);
  });
  if (missing.length) {
    console.warn('⚠️ Variables .env faltantes:', missing.join(', '));
  }
}
module.exports = { assertEnv };
