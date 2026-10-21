const { supabaseAdmin } = require('../utils/supabaseClient');
const { isDirectPg, query } = require('../utils/db');

async function checkAdmin(userId) {
  if (!userId) return false;
  if (isDirectPg()) {
    try {
      const { rows } = await query('SELECT 1 FROM public.superadmins WHERE user_id = $1 LIMIT 1', [userId]);
      return rows.length > 0;
    } catch (e) {
      console.error('[checkAdmin directPg error]', e);
    }
  }
  const { data } = await supabaseAdmin
    .from('superadmins')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();
  return !!data;
}

async function processCommissions() {
  const currentYearMonth = new Date().toISOString().slice(0, 7);
  const today = new Date();

  let partners = [];

  if (isDirectPg()) {
    const { rows: pRows } = await query('SELECT id, saldo_acumulado FROM public.partners');
    for (const p of pRows) {
      const { rows: tRows } = await query(
        `SELECT t.id, t.status, t.fecha_creacion,
                COALESCE(json_agg(json_build_object(
                  'status', s.status, 'plan_id', s.plan_id, 'current_period_start', s.current_period_start,
                  'current_period_end', s.current_period_end, 'cancel_at_period_end', s.cancel_at_period_end
                )) FILTER (WHERE s.id IS NOT NULL), '[]') as subscriptions
         FROM public.tenants t
         LEFT JOIN public.subscriptions s ON s.tenant_id = t.id
         WHERE t.partner_id = $1
         GROUP BY t.id`,
        [p.id]
      );
      p.tenants = tRows;
    }
    partners = pRows;
  } else {
    const { data, error: pErr } = await supabaseAdmin
      .from('partners')
      .select(`
        id, 
        saldo_acumulado,
        tenants (
          id, 
          status, 
          fecha_creacion,
          subscriptions (status, plan_id, current_period_start, current_period_end, cancel_at_period_end, provider_payment_method_id)
        )
      `);

    if (pErr) throw pErr;
    partners = data || [];
  }

  let totalComisionesGeneradas = 0;
  const report = [];

  for (const partner of partners) {
    const localesActivos = (partner.tenants || []).filter(t => {
      const sub = Array.isArray(t.subscriptions) ? t.subscriptions[0] : null;
      return t.status === 'active' && sub && sub.status === 'active' && !sub.cancel_at_period_end;
    });

    const activeCount = localesActivos.length;
    if (activeCount === 0) continue;

    let tier = 'Rookie';
    let bonoMensual = 10, mrrMensual = 5, bonoAnual = 60;

    if (activeCount >= 51) {
      tier = 'Elite'; bonoMensual = 30; mrrMensual = 10; bonoAnual = 100;
    } else if (activeCount >= 11) {
      tier = 'Pro'; bonoMensual = 20; mrrMensual = 7.5; bonoAnual = 80;
    }

    let saldoAIncrementar = 0;

    for (const local of localesActivos) {
      const sub = local.subscriptions[0];
      const diasDesdeCreacion = Math.floor((today - new Date(local.fecha_creacion)) / (1000 * 60 * 60 * 24));
      const planIdStr = String(sub.plan_id || '').toLowerCase();
      const esAnual = planIdStr.includes('anual') || planIdStr.includes('yearly');

      if (esAnual) {
        if (diasDesdeCreacion >= 15) {
          if (isDirectPg()) {
            try {
              await query(
                'INSERT INTO public.partner_commissions (partner_id, tenant_id, amount, concept, period) VALUES ($1, $2, $3, $4, $5)',
                [partner.id, local.id, bonoAnual, 'BONO_ANUAL', 'ALL_TIME']
              );
              saldoAIncrementar += bonoAnual;
            } catch (e) {}
          } else {
            const { error: insertErr } = await supabaseAdmin.from('partner_commissions').insert([{
              partner_id: partner.id, tenant_id: local.id, amount: bonoAnual,
              concept: 'BONO_ANUAL', period: 'ALL_TIME'
            }]);
            if (!insertErr) saldoAIncrementar += bonoAnual;
          }
        }
        continue;
      }

      if (diasDesdeCreacion >= 30) {
        if (isDirectPg()) {
          try {
            await query(
              'INSERT INTO public.partner_commissions (partner_id, tenant_id, amount, concept, period) VALUES ($1, $2, $3, $4, $5)',
              [partner.id, local.id, bonoMensual, 'BONO_ALTA', 'ALL_TIME']
            );
            saldoAIncrementar += bonoMensual;
          } catch (e) {}
        } else {
          const { error: bonoErr } = await supabaseAdmin.from('partner_commissions').insert([{
            partner_id: partner.id, tenant_id: local.id, amount: bonoMensual,
            concept: 'BONO_ALTA', period: 'ALL_TIME'
          }]);
          if (!bonoErr) saldoAIncrementar += bonoMensual;
        }
      }

      if (isDirectPg()) {
        try {
          await query(
            'INSERT INTO public.partner_commissions (partner_id, tenant_id, amount, concept, period) VALUES ($1, $2, $3, $4, $5)',
            [partner.id, local.id, mrrMensual, 'MRR_MENSUAL', currentYearMonth]
          );
          saldoAIncrementar += mrrMensual;
        } catch (e) {}
      } else {
        const { error: mrrErr } = await supabaseAdmin.from('partner_commissions').insert([{
          partner_id: partner.id, tenant_id: local.id, amount: mrrMensual,
          concept: 'MRR_MENSUAL', period: currentYearMonth
        }]);
        if (!mrrErr) saldoAIncrementar += mrrMensual;
      }
    }

    if (saldoAIncrementar > 0) {
      if (isDirectPg()) {
        await query('SELECT public.increment_partner_balance($1, $2)', [partner.id, saldoAIncrementar]);
      } else {
        await supabaseAdmin.rpc('increment_partner_balance', {
          p_partner_id: partner.id,
          p_amount: saldoAIncrementar
        });
      }
      
      totalComisionesGeneradas += saldoAIncrementar;
      report.push({ comercial: partner.id, sumado: saldoAIncrementar, nivel: tier });
    }
  }

  return { totalComisionesGeneradas, report };
}

exports.getAdminPartnersData = async (req, res) => {
  try {
    if (!(await checkAdmin(req.user.id))) {
      return res.status(403).json({ ok: false, error: 'Acceso denegado' });
    }

    if (isDirectPg()) {
      const [pRes, tRes, payRes] = await Promise.all([
        query('SELECT * FROM public.partners ORDER BY created_at DESC'),
        query('SELECT id, nombre_empresa, email, partner_id, status, fecha_creacion FROM public.tenants ORDER BY fecha_creacion ASC'),
        query(`SELECT p.*, json_build_object('nombre', part.nombre) as partners FROM public.partner_payouts p LEFT JOIN public.partners part ON part.id = p.partner_id ORDER BY p.created_at DESC`)
      ]);
      return res.json({ ok: true, partners: pRes.rows || [], tenants: tRes.rows || [], payouts: payRes.rows || [] });
    }

    const [resP, resT, resPay] = await Promise.all([
      supabaseAdmin.from('partners').select('*').order('created_at', { ascending: false }),
      supabaseAdmin.from('tenants').select('id, nombre_empresa, email, partner_id, status, fecha_creacion').order('fecha_creacion', { ascending: true }),
      supabaseAdmin.from('partner_payouts').select('*, partners(nombre)').order('created_at', { ascending: false })
    ]);

    if (resP.error) throw resP.error;
    if (resT.error) throw resT.error;
    if (resPay.error) throw resPay.error;

    return res.json({ ok: true, partners: resP.data, tenants: resT.data, payouts: resPay.data });
  } catch (error) {
    return res.status(500).json({ ok: false, error: 'Error interno del servidor' });
  }
};

exports.createPartner = async (req, res) => {
  try {
    if (!(await checkAdmin(req.user.id))) {
      return res.status(403).json({ ok: false, error: 'Acceso denegado' });
    }

    const { email, nombre, empresa_reparto, telefono } = req.body;
    if (!email || !nombre) return res.status(400).json({ ok: false, error: 'Faltan datos obligatorios' });

    if (isDirectPg()) {
      const { rows: tRows } = await query(
        `SELECT t.email, m.user_id 
         FROM public.tenants t 
         JOIN public.memberships m ON m.tenant_id = t.id 
         WHERE lower(t.email) = lower($1) 
         LIMIT 1`,
        [email.trim()]
      );

      if (tRows.length === 0) {
        return res.status(404).json({ ok: false, error: 'No existe ninguna cuenta registrada con este email.' });
      }

      const userId = tRows[0].user_id;

      try {
        const { rows: newP } = await query(
          'INSERT INTO public.partners (user_id, nombre, empresa_reparto, telefono) VALUES ($1, $2, $3, $4) RETURNING *',
          [userId, nombre, empresa_reparto || null, telefono || null]
        );
        return res.json({ ok: true, partner: newP[0] });
      } catch (partnerErr) {
        if (partnerErr.code === '23505') return res.status(400).json({ ok: false, error: 'Este usuario ya es un comercial activo.' });
        throw partnerErr;
      }
    }

    const { data: tenantData, error: tenantErr } = await supabaseAdmin
      .from('tenants')
      .select('email, memberships(user_id)')
      .ilike('email', email.trim())
      .limit(1)
      .maybeSingle();

    if (tenantErr || !tenantData || !tenantData.memberships || tenantData.memberships.length === 0) {
      return res.status(404).json({ ok: false, error: 'No existe ninguna cuenta registrada con este email.' });
    }

    const userId = tenantData.memberships[0].user_id;

    const { data: newPartner, error: partnerErr } = await supabaseAdmin
      .from('partners')
      .insert([{ 
        user_id: userId, 
        nombre, 
        empresa_reparto, 
        telefono 
      }])
      .select()
      .single();

    if (partnerErr) {
      if (partnerErr.code === '23505') return res.status(400).json({ ok: false, error: 'Este usuario ya es un comercial activo.' });
      throw partnerErr;
    }

    return res.json({ ok: true, partner: newPartner });
  } catch (error) {
    return res.status(500).json({ ok: false, error: 'Error al registrar comercial' });
  }
};

exports.assignPartnerToTenant = async (req, res) => {
  try {
    if (!(await checkAdmin(req.user.id))) {
      return res.status(403).json({ ok: false, error: 'Acceso denegado' });
    }

    const { tenant_id, partner_id } = req.body;

    if (isDirectPg()) {
      await query('UPDATE public.tenants SET partner_id = $1 WHERE id = $2', [partner_id || null, tenant_id]);
      return res.json({ ok: true });
    }

    const { error } = await supabaseAdmin
      .from('tenants')
      .update({ partner_id: partner_id || null })
      .eq('id', tenant_id);

    if (error) throw error;
    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ ok: false, error: 'Error al vincular negocio' });
  }
};

exports.liquidatePayout = async (req, res) => {
  try {
    if (!(await checkAdmin(req.user.id))) {
      return res.status(403).json({ ok: false, error: 'Acceso denegado' });
    }

    const { payout_id } = req.body;

    if (isDirectPg()) {
      await query('UPDATE public.partner_payouts SET status = $1, paid_at = NOW() WHERE id = $2', ['paid', payout_id]);
      return res.json({ ok: true });
    }

    const { error } = await supabaseAdmin
      .from('partner_payouts')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('id', payout_id);

    if (error) throw error;
    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ ok: false, error: 'Error al liquidar pago' });
  }
};

exports.getPartnerDashboard = async (req, res) => {
  try {
    const userId = req.user.id;

    if (isDirectPg()) {
      const { rows: pRows } = await query('SELECT * FROM public.partners WHERE user_id = $1 LIMIT 1', [userId]);
      const partner = pRows[0];
      if (!partner) return res.status(200).json({ ok: true, isPartner: false });

      const [tenantsRes, payoutsRes] = await Promise.all([
        query('SELECT id, nombre_empresa, status, fecha_creacion FROM public.tenants WHERE partner_id = $1 ORDER BY fecha_creacion ASC', [partner.id]),
        query('SELECT * FROM public.partner_payouts WHERE partner_id = $1 ORDER BY created_at DESC', [partner.id])
      ]);

      return res.json({
        ok: true,
        isPartner: true,
        partner,
        referredTenants: tenantsRes.rows || [],
        payouts: payoutsRes.rows || []
      });
    }

    const { data: partner, error: partnerErr } = await supabaseAdmin
      .from('partners')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (partnerErr || !partner) {
      return res.status(200).json({ ok: true, isPartner: false });
    }

    const [tenantsRes, payoutsRes] = await Promise.all([
      supabaseAdmin.from('tenants').select('id, nombre_empresa, status, fecha_creacion').eq('partner_id', partner.id).order('fecha_creacion', { ascending: true }),
      supabaseAdmin.from('partner_payouts').select('*').eq('partner_id', partner.id).order('created_at', { ascending: false })
    ]);

    if (tenantsRes.error) throw tenantsRes.error;
    if (payoutsRes.error) throw payoutsRes.error;

    return res.json({ 
      ok: true, 
      isPartner: true, 
      partner, 
      referredTenants: tenantsRes.data || [],
      payouts: payoutsRes.data || []
    });
  } catch (error) {
    return res.status(500).json({ ok: false, error: 'Error cargando dashboard comercial' });
  }
};

exports.requestPayout = async (req, res) => {
  try {
    const userId = req.user.id;

    if (isDirectPg()) {
      const { rows: pRows } = await query('SELECT * FROM public.partners WHERE user_id = $1 LIMIT 1', [userId]);
      const partner = pRows[0];
      if (!partner) return res.status(403).json({ ok: false, error: 'No eres comercial.' });
      if (Number(partner.saldo_acumulado || 0) < 20) return res.status(400).json({ ok: false, error: 'Saldo insuficiente.' });

      const { rows: pending } = await query('SELECT id FROM public.partner_payouts WHERE partner_id = $1 AND status = $2 LIMIT 1', [partner.id, 'pending']);
      if (pending.length > 0) return res.status(400).json({ ok: false, error: 'Ya tienes un retiro en proceso.' });

      await query('INSERT INTO public.partner_payouts (partner_id, amount, status, created_at) VALUES ($1, $2, $3, NOW())', [partner.id, partner.saldo_acumulado, 'pending']);
      await query('UPDATE public.partners SET saldo_acumulado = 0 WHERE id = $1', [partner.id]);

      return res.json({ ok: true });
    }
    
    const { data: partner } = await supabaseAdmin.from('partners').select('*').eq('user_id', userId).maybeSingle();
    if (!partner) return res.status(403).json({ ok: false, error: 'No eres comercial.' });
    if (partner.saldo_acumulado < 20) return res.status(400).json({ ok: false, error: 'Saldo insuficiente.' });

    const { data: pendingExists } = await supabaseAdmin.from('partner_payouts').select('id').eq('partner_id', partner.id).eq('status', 'pending').maybeSingle();
    if (pendingExists) return res.status(400).json({ ok: false, error: 'Ya tienes un retiro en proceso.' });

    const { error: insertErr } = await supabaseAdmin.from('partner_payouts').insert([{
      partner_id: partner.id,
      amount: partner.saldo_acumulado,
      status: 'pending'
    }]);

    if (insertErr) throw insertErr;

    const { error: updateErr } = await supabaseAdmin.from('partners').update({ saldo_acumulado: 0 }).eq('id', partner.id);
    if (updateErr) throw updateErr;

    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ ok: false, error: 'Error al solicitar retiro' });
  }
};

exports.runCommissionEngine = async (req, res) => {
  try {
    if (!(await checkAdmin(req.user.id))) {
      return res.status(403).json({ ok: false, error: 'Acceso denegado al Motor' });
    }
    const result = await processCommissions();
    return res.json({ ok: true, message: 'Motor ejecutado', total_generado: result.totalComisionesGeneradas, report: result.report });
  } catch (error) {
    return res.status(500).json({ ok: false, error: 'Error crítico en el motor de comisiones' });
  }
};

exports.processCommissionsAutomated = processCommissions;