const { createClient } = require('@supabase/supabase-js');
const supa = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
supa.from('ubicaciones_meta').select('*').limit(1).then(r => console.log(r));
