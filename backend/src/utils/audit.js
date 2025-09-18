'use strict';
const { supabaseAdmin } = require('./supabaseAdmin');
async function auditLog({ actor_user_id, actor_role, tenant_id=null, action, target_table=null, target_id=null, diff=null, req }) {
  try {
    const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || null);
    const ua = (req.headers['user-agent'] || null);
    await supabaseAdmin.from('audit_log').insert([{
      actor_user_id, actor_role, tenant_id,
      action, target_table, target_id, diff,
      ip, user_agent: ua
    }]);
  } catch (e) { console.error('[auditLog]', e); }
}
module.exports = { auditLog };
