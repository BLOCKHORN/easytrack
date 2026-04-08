'use strict';
const { createClient } = require('@supabase/supabase-js');

const {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY,
} = process.env;

if (!SUPABASE_URL)              throw new Error('❌ Falta SUPABASE_URL');
if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error('❌ Falta SUPABASE_SERVICE_ROLE_KEY (service role)');
if (!SUPABASE_ANON_KEY)         console.warn('⚠️ Falta SUPABASE_ANON_KEY (solo afecta a clientes públicos)');

/**
 * Server-to-server (service role). Bypassa RLS: úsalo en controladores.
 */
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/**
 * Alias admin (mismo service role).
 */
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/**
 * Cliente ANON para middlewares (verificar tokens de usuario).
 */
const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

module.exports = { supabase, supabaseAdmin, supabaseAuth };
