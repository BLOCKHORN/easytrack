import { useEffect, useMemo, useState } from 'react';
import { listTenants, listAudit } from '../../services/adminService';
import Icon from './Icon.jsx';
import '../../styles/SuperAdminHome.scss';

const nf = (n) => Intl.NumberFormat('es-ES').format(n);
const fmtDate = (d) => { try { return new Date(d).toLocaleString(); } catch { return '—'; } };
const daysBetween = (a, b = Date.now()) =>
  Math.round((new Date(a).getTime() - (typeof b === 'number' ? b : new Date(b).getTime())) / 86400000);

export default function SuperAdminHome() {
  const [loading, setLoading] = useState(true);
  const [tenants, setTenants] = useState([]);
  const [audit, setAudit] = useState([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [{ data: tData = [] }, { data: aData = [] }] = await Promise.all([
          listTenants({ q: '', page: 1, pageSize: 200 }),
          listAudit({ page: 1, pageSize: 80 })
        ]);
        setTenants(tData || []);
        setAudit(aData || []);
      } finally { setLoading(false); }
    })();
  }, []);

  const stats = useMemo(() => {
    const total  = tenants.length;
    const activos = tenants.filter(t => t.subscription?.status === 'active').length;
    const trial   = tenants.filter(t => t.subscription?.status === 'trialing').length;
    const canceladosNow = tenants.filter(t => t.subscription?.status === 'canceled').length;
    const cancelAtPeriodEnd = tenants.filter(t => !!t.subscription?.cancel_at_period_end).length;

    const today = Date.now();
    const dleft = tenants
      .map(t => t.subscription?.current_period_end ? (new Date(t.subscription.current_period_end).getTime() - today) / 86400000 : null)
      .filter(v => typeof v === 'number');
    const mediaRestante = dleft.length ? Math.max(0, Math.round(dleft.reduce((a,b)=>a+b,0) / dleft.length)) : 0;

    const proximas = tenants
      .filter(t => t.subscription?.current_period_end)
      .map(t => ({
        id: t.id,
        name: t.nombre_empresa || t.slug || '—',
        end: t.subscription.current_period_end,
        inDays: daysBetween(t.subscription.current_period_end, today),
        status: t.subscription?.status || '—',
      }))
      .filter(x => x.inDays >= 0 && x.inDays <= 30)
      .sort((a,b) => a.inDays - b.inDays)
      .slice(0, 10);

    const expiradas = tenants.filter(t => {
      const end = t.subscription?.current_period_end;
      return end && new Date(end).getTime() < today && t.subscription?.status !== 'canceled';
    }).length;

    return {
      total, activos, trial, canceladosNow, cancelAtPeriodEnd,
      mediaRestante, proximas, expiradas,
      ultimos: (audit || []).slice(0, 12)
    };
  }, [tenants, audit]);

  return (
    <div className="sa-home">
      {/* HERO */}
      <section className="sa-hero card">
        <div className="sa-hero__texts">
          <div className="brand">
            <span className="dot"><Icon name="dot" /></span>
            <strong>EasyTrack</strong> <span className="sep">/</span> <span className="sub">Superadmin</span>
          </div>
          <h1>Panel de Administración</h1>
          <p className="muted">Una vista clara de empresas, suscripciones y actividad del sistema.</p>
          <div className="sa-hero__quick">
            <a className="quick-link" href="/superadmin/tenants" title="Ir a gestión de tenants"><Icon name="db" /> Gestionar Tenants</a>
            <a className="quick-link" href="/superadmin/requests" title="Ir a solicitudes"><Icon name="list" /> Revisar Solicitudes</a>
          </div>
        </div>
        <div className="sa-hero__illus" aria-hidden="true">
          <Icon name="gauge" size={80} />
        </div>
      </section>

      {/* KPIs */}
      <section className="kpis">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <article key={i} className="kpi card is-skeleton">
              <div className="sk-line w40" />
              <div className="sk-line w60 big" />
              <div className="sk-line w80" />
            </article>
          ))
        ) : (
          <>
            <Kpi title="Tenants Totales" icon="db" tone="primary" value={nf(stats.total)} meta="Empresas registradas." />
            <Kpi title="Activos" icon="calendar" tone="ok" value={nf(stats.activos)} meta="Suscripciones en activo."
                 frac={stats.activos / Math.max(1, stats.total)} />
            <Kpi title="En Trial" icon="calendar" tone="info" value={nf(stats.trial)} meta="Periodo de prueba."
                 frac={stats.trial / Math.max(1, stats.total)} />
            <Kpi title="Media días restantes" icon="calendar" tone="warn" value={nf(stats.mediaRestante)} meta="Promedio hasta renovación." />
            <Kpi title="Expiradas" icon="calendar" tone="danger" value={nf(stats.expiradas)} meta="Con periodo vencido." />
            <Kpi title="Canceladas / Fin de periodo" icon="calendar" tone="muted"
                 value={<><span>{nf(stats.canceladosNow)}</span><span className="slash">/</span><span>{nf(stats.cancelAtPeriodEnd)}</span></>}
                 meta="Canceladas ya / se cancelarán." />
          </>
        )}
      </section>

      {/* Próximas renovaciones */}
      <section className="card">
        <header className="card__head">
          <Icon name="calendar" />
          <h3>Próximas renovaciones (<span className="mono">≤ 30 días</span>)</h3>
        </header>

        {loading ? (
          <div className="timeline">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="tl-item is-skeleton">
                <div className="tl-dot" />
                <div className="tl-card">
                  <div className="sk-line w60" />
                  <div className="sk-line w40 small" />
                </div>
              </div>
            ))}
          </div>
        ) : stats.proximas.length === 0 ? (
          <div className="empty muted">Nada pendiente en los próximos 30 días.</div>
        ) : (
          <div className="timeline">
            {stats.proximas.map(p => {
              const sev = p.inDays <= 7 ? 'danger' : p.inDays <= 15 ? 'warn' : 'ok';
              const pillClass =
                p.status === 'active' ? 'pill--ok' :
                p.status === 'trialing' ? 'pill--info' : 'pill--muted';
              return (
                <div key={p.id} className={`tl-item sev-${sev}`}>
                  <div className="tl-dot" />
                  <div className="tl-card">
                    <div className="tl-row">
                      <div className="tl-title ell">{p.name}</div>
                      <div className="tl-days">
                        <span className={`pill ${pillClass}`}>{p.status}</span>
                        <span className="days">{p.inDays} días</span>
                      </div>
                    </div>
                    <div className="tl-meta">Renueva: {fmtDate(p.end)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Actividad reciente */}
      <section className="card">
        <header className="card__head"><Icon name="list" /><h3>Actividad reciente</h3></header>

        {loading ? (
          <div className="log">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="log-row is-skeleton">
                <div className="log-bar" />
                <div className="log-cols">
                  <div className="sk-line w30 small" />
                  <div className="sk-line w20 small" />
                  <div className="sk-line w40 small" />
                </div>
              </div>
            ))}
          </div>
        ) : stats.ultimos.length === 0 ? (
          <div className="empty muted">Sin eventos recientes.</div>
        ) : (
          <div className="log">
            <div className="log-head">
              <div>Fecha</div><div>Acción</div><div>Tabla</div><div>Target</div><div>Actor</div>
            </div>
            {stats.ultimos.map(a => {
              const sev =
                /DECLINE|CANCEL|ERROR|FAIL/i.test(a.action) ? 'danger' :
                /ASSUME|IMPERSONATE/i.test(a.action) ? 'info' :
                /SUBSCRIPTION|ACCEPT|CREATE|UPDATE/i.test(a.action) ? 'ok' : 'muted';
              return (
                <div key={a.id} className={`log-row sev-${sev}`}>
                  <span className="log-bar" />
                  <div className="log-cols">
                    <div className="muted">{fmtDate(a.created_at)}</div>
                    <div><span className={`pill pill--${sev}`}>{a.action}</span></div>
                    <div className="ell">{a.target_table || '—'}</div>
                    <div className="mono ell">{a.target_id || '—'}</div>
                    <div className="mono">{a.actor_user_id ? a.actor_user_id.slice(0,8) : '—'}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

/* ---------- Small KPI subcomponent ---------- */
function Kpi({ title, icon, tone = 'muted', value, meta, frac }) {
  return (
    <article className={`kpi card tone-${tone}`}>
      <header><Icon name={icon} /><span>{title}</span></header>
      <div className="kpi__value">{value}</div>
      {typeof frac === 'number' ? (
        <div className="kpi__bar" aria-hidden="true">
          <div className="kpi__bar-fill" style={{ width: `${Math.min(100, Math.max(0, frac * 100))}%` }} />
        </div>
      ) : null}
      <div className="kpi__meta">{meta}</div>
    </article>
  );
}
