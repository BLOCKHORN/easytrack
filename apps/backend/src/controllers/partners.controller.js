'use strict';

const { supabaseAdmin } = require('../utils/supabaseClient');

async function checkAdmin(userId) {
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

  const { data: partners, error: pErr } = await supabaseAdmin
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

  let totalComisionesGeneradas = 0;
  const report = [];

  for (const partner of partners) {
    const localesActivos = (partner.tenants || []).filter(t => {
      const sub = t.subscriptions?.[0];
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
      const esAnual = sub.plan_id.includes('anual') || sub.plan_id.includes('yearly');

      if (esAnual) {
        if (diasDesdeCreacion >= 15) {
          const { error: insertErr } = await supabaseAdmin.from('partner_commissions').insert([{
            partner_id: partner.id, tenant_id: local.id, amount: bonoAnual,
            concept: 'BONO_ANUAL', period: 'ALL_TIME'
          }]);
          
          if (!insertErr) saldoAIncrementar += bonoAnual;
        }
        continue;
      }

      if (diasDesdeCreacion >= 30) {
        const { error: bonoErr } = await supabaseAdmin.from('partner_commissions').insert([{
          partner_id: partner.id, tenant_id: local.id, amount: bonoMensual,
          concept: 'BONO_ALTA', period: 'ALL_TIME'
        }]);
        if (!bonoErr) saldoAIncrementar += bonoMensual;
      }

      const { error: mrrErr } = await supabaseAdmin.from('partner_commissions').insert([{
        partner_id: partner.id, tenant_id: local.id, amount: mrrMensual,
        concept: 'MRR_MENSUAL', period: currentYearMonth
      }]);
      
      if (!mrrErr) saldoAIncrementar += mrrMensual;
    }

    if (saldoAIncrementar > 0) {
      await supabaseAdmin.rpc('increment_partner_balance', {
        p_partner_id: partner.id,
        p_amount: saldoAIncrementar
      });
      
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

    const { data: partner, error: partnerErr } = await supabaseAdmin
      .from('partners')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (partnerErr || !partner) {
      return res.status(403).json({ ok: false, isPartner: false, error: 'No eres comercial.' });
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