require('dotenv').config({ path: './apps/backend/.env' });
const { supabaseAdmin } = require('./apps/backend/src/utils/supabaseClient');

async function checkLabData() {
  const { data: tenant } = await supabaseAdmin.from('tenants').select('*').eq('slug', 'lab').maybeSingle();
  console.log('--- Tenant Data ---');
  console.log(JSON.stringify(tenant, null, 2));

  if (tenant) {
    const { data: sub } = await supabaseAdmin.from('subscriptions').select('*').eq('tenant_id', tenant.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
    console.log('\n--- Latest Subscription Data ---');
    console.log(JSON.stringify(sub, null, 2));
  }
}

checkLabData();
