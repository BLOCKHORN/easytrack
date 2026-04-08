'use strict';
const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../utils/supabaseAdmin');

router.get('/', async (req, res) => {
  try {
    const { tenant_id=null, actor_user_id=null, action=null, from=null, to=null, page=1, pageSize=50 } = req.query;
    const fromIdx = (Number(page)-1)*Number(pageSize);
    const toIdx = fromIdx + Number(pageSize) - 1;

    let qy = supabaseAdmin.from('audit_log').select('*', { count:'exact' })
      .order('created_at', { ascending:false })
      .range(fromIdx, toIdx);

    if (tenant_id) qy = qy.eq('tenant_id', tenant_id);
    if (actor_user_id) qy = qy.eq('actor_user_id', actor_user_id);
    if (action) qy = qy.ilike('action', `%${action}%`);
    if (from) qy = qy.gte('created_at', from);
    if (to) qy = qy.lte('created_at', to);

    const { data, count, error } = await qy;
    if (error) throw error;
    res.json({ data, count });
  } catch (e) { console.error(e); res.status(500).json({ error:'AUDIT_LIST_FAILED' }); }
});

module.exports = router;
