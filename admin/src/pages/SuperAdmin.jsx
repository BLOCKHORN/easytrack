import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import {
  // Tenants
  listTenants, getTenant, extendSubscription, setPlan,
  assumeTenant, endAssume,
  // Data / logs / users
  listTables, queryTable, patchRow,
  listAudit, searchUsers, sendReset, makeImpersonateLink,
  // Suscripción extra
  cancelSubscription, resumeSubscription, setSubscriptionDates
} from '../services/adminService';
import AdminRequests from './AdminRequests.jsx';
import '../styles/superadmin.scss';

/* ===== Iconos inline (sin dependencias) ===== */
function Icon({ name, className = '', size = 18 }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', className: `icon ${className}` };
  switch (name) {
    case 'menu':     return (<svg {...common}><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>);
    case 'dot':      return (<svg {...common}><circle cx="12" cy="12" r="5" fill="currentColor" stroke="none"/></svg>);
    case 'user':     return (<svg {...common}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>);
    case 'gauge':    return (<svg {...common}><path d="M12 14v-4"/><path d="M10 14h4"/><path d="M13.41 10.59 16 8"/><path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/></svg>);
    case 'db':       return (<svg {...common}><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v6c0 1.7 4 3 9 3s9-1.3 9-3V5"/><path d="M3 11v6c0 1.7 4 3 9 3s9-1.3 9-3v-6"/></svg>);
    case 'list':     return (<svg {...common}><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/></svg>);
    case 'shield':   return (<svg {...common}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/></svg>);
    case 'switch':   return (<svg {...common}><path d="M3 12h6"/><path d="M21 12h-6"/><path d="M8 7l-5 5 5 5"/><path d="m16 17 5-5-5-5"/></svg>);
    case 'search':   return (<svg {...common}><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>);
    case 'calendar': return (<svg {...common}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>);
    case 'log':      return (<svg {...common}><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 7h10M7 12h10M7 17h6"/></svg>);
    case 'edit':     return (<svg {...common}><path d="M11 4h2M12 2v6M4 13v7h7l9-9-7-7-9 9Z"/></svg>);
    case 'logout':   return (<svg {...common}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>);
    case 'back':     return (<svg {...common}><polyline points="15 18 9 12 15 6"/></svg>);
    default:         return null;
  }
}

export default function SuperAdmin() {
  /* ---------- responsive guard ---------- */
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 1024);
  useEffect(() => {
    const onR = () => setIsMobile(window.innerWidth <= 1024);
    window.addEventListener('resize', onR);
    return () => window.removeEventListener('resize', onR);
  }, []);

  // --------- modo global ----------  'tenants' | 'requests'
  const [mode, setMode] = useState('tenants');

  // --------- estado general ----------
  const [userEmail, setUserEmail] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);

  // --------- lista tenants ----------
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // --------- tenant seleccionado ----------
  const [selected, setSelected] = useState(null);
  const [assumeSession, setAssumeSession] = useState(null);

  // --------- tabs de detalle ----------
  const [tab, setTab] = useState('overview'); // 'overview' | 'users' | 'data' | 'logs'

  // --------- users (auth) ----------
  const [users, setUsers] = useState([]);
  const [userQ, setUserQ] = useState('');

  // --------- data explorer ----------
  const [tables, setTables] = useState([]);
  const [tableSel, setTableSel] = useState('');
  const [tableQ, setTableQ] = useState('');
  const [tablePage, setTablePage] = useState(1);
  const [tableRows, setTableRows] = useState([]);
  const [tableCount, setTableCount] = useState(0);

  // --------- auditoría ----------
  const [audit, setAudit] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);

  // --------- modal fechas suscripción ----------
  const [datesOpen, setDatesOpen] = useState(false);
  const [dates, setDates] = useState({ start: '', end: '', trial: '' });

  // --------- mobile sheet ----------
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => { supabase.auth.getUser().then(({ data }) => setUserEmail(data?.user?.email || '')); }, []);

  // bloquear scroll del body si abrimos sheet o sidebar en móvil
  useEffect(() => {
    const lock = (sheetOpen || (isMobile && sidebarOpen)) ? 'hidden' : '';
    document.body.style.overflow = lock;
    return () => { document.body.style.overflow = ''; };
  }, [sheetOpen, isMobile, sidebarOpen]);

  // Carga lista de tenants (solo en modo tenants)
  useEffect(() => {
    if (mode !== 'tenants') return;
    (async () => {
      setLoading(true);
      try {
        const { data, count } = await listTenants({ q, page, pageSize: 20 });
        setRows(data || []);
        setCount(count || 0);
      } finally { setLoading(false); }
    })();
  }, [mode, q, page]);

  // Carga por tab dentro de detalle
  useEffect(() => {
    if (mode !== 'tenants') return;
    if (!selected) return;

    if (tab === 'data') {
      if (!tables.length) {
        listTables().then(({ tables }) => {
          setTables(tables || []);
          setTableSel(tables?.[0] || '');
        });
      } else if (!tableSel && tables[0]) {
        setTableSel(tables[0]);
      } else {
        refreshTable();
      }
    } else if (tab === 'users') {
      refreshUsers(userQ);
    } else if (tab === 'logs') {
      refreshAudit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, tab, tableSel, selected?.id]);

  // ---------- helpers ----------
  async function openTenant(t) {
    const { tenant, subscription } = await getTenant(t.id);
    setSelected({ ...tenant, subscription });
    setTab('overview');

    if (isMobile) {
      setSheetOpen(true);
    } else if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  }

  async function onExtend(days) {
    if (!selected) return;
    const { subscription } = await extendSubscription(selected.id, days);
    setSelected(p => ({ ...p, subscription }));
  }

  async function onSetPlan(payloadOrPlan, status = 'active') {
    if (!selected) return;
    const payload = typeof payloadOrPlan === 'object' ? payloadOrPlan : { plan_code: payloadOrPlan, status };
    const { subscription } = await setPlan(selected.id, payload);
    setSelected(p => ({ ...p, subscription }));
  }

  async function onAssume(reason = 'Soporte') {
    if (!selected) return;
    const { session } = await assumeTenant(selected.id, reason, 60);
    setAssumeSession(session);
  }

  async function onEndAssume() {
    if (!assumeSession) return;
    await endAssume(assumeSession.id);
    setAssumeSession(null);
  }

  // --- USERS
  async function refreshUsers(text = '') {
    const { users } = await searchUsers(text);
    setUsers(users || []);
  }
  function onUserSearch(e) {
    const v = e.target.value;
    setUserQ(v);
    refreshUsers(v);
  }
  async function onReset(email) {
    try {
      const { link } = await sendReset(email);
      alert('Enlace de recuperación generado.\n' + (link || 'Se envió por email'));
    } catch { alert('No se pudo generar el reset.'); }
  }
  async function onImpersonate(email) {
    try {
      const { link } = await makeImpersonateLink(email, selected?.id || null, 30);
      if (link) window.open(link, '_blank', 'noopener');
    } catch { alert('No se pudo generar el magic link.'); }
  }

  // --- DATA EXPLORER
  const visibleCols = useMemo(() => {
    if (!tableRows?.length) return [];
    const keys = Object.keys(tableRows[0] || {});
    const idKey = keys.find(k => k === 'id') ? ['id'] : [];
    const rest = keys.filter(k => k !== 'id').slice(0, 3);
    return [...idKey, ...rest];
  }, [tableRows]);

  async function refreshTable() {
    if (!tableSel) return;
    const { data, count } = await queryTable(tableSel, { q: tableQ, page: tablePage, pageSize: 20 });
    setTableRows(data || []);
    setTableCount(count || 0);
  }
  function onTableSearch(e) {
    setTableQ(e.target.value);
    setTablePage(1);
    clearTimeout(onTableSearch._t);
    onTableSearch._t = setTimeout(refreshTable, 250);
  }
  async function onQuickEdit(row) {
    const field = prompt(`Campo a editar en ${tableSel}\n(permitidos según whitelist backend)`, visibleCols.find(c => c !== 'id') || '');
    if (!field) return;
    const value = prompt(`Nuevo valor para "${field}":`, row?.[field] ?? '');
    if (value == null) return;
    try {
      const { row: updated } = await patchRow(tableSel, row.id ?? row?.uuid ?? row?.[visibleCols[0]], { [field]: value });
      setTableRows(prev => prev.map(r => ((r.id ?? r?.uuid) === (updated.id ?? updated?.uuid) ? updated : r)));
    } catch { alert('Campo no permitido o error en la actualización.'); }
  }

  // --- AUDIT
  async function refreshAudit() {
    setAuditLoading(true);
    try {
      const params = { tenant_id: selected?.id, page: 1, pageSize: 50 };
      const { data } = await listAudit(params);
      setAudit(data || []);
    } finally { setAuditLoading(false); }
  }

  // --- helpers fechas (modal)
  const toInput = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    const p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  };
  const fromInput = (v) => (v ? new Date(v).toISOString() : null);

  function openDates() {
    const s = selected?.subscription;
    setDates({
      start: toInput(s?.current_period_start),
      end:   toInput(s?.current_period_end),
      trial: toInput(s?.trial_ends_at),
    });
    setDatesOpen(true);
  }
  async function saveDates() {
    const payload = {
      current_period_start: dates.start ? fromInput(dates.start) : null,
      current_period_end:   dates.end   ? fromInput(dates.end)   : null,
      trial_ends_at:        dates.trial ? fromInput(dates.trial) : null,
    };
    const { subscription } = await setSubscriptionDates(selected.id, payload);
    setSelected(p => ({ ...p, subscription }));
    setDatesOpen(false);
  }

  const planLabelMap = { monthly: 'Mensual', anual: 'Anual', annual: 'Anual', yearly: 'Anual', biennial: 'Bianual', bianual: 'Bianual', '24m': 'Bianual' };
  const planText = selected?.subscription?.plan_code
    ? (planLabelMap[String(selected.subscription.plan_code).toLowerCase()] || selected.subscription.plan_code)
    : (selected?.subscription?.plan_id ? `#${String(selected.subscription.plan_id).slice(0, 8)}` : '—');

  /* ---------- detail (reutilizable desktop + sheet) ---------- */
  function TenantDetail() {
    if (!selected) return null;
    return (
      <div className="sa__panel">
        <div className="sa__heading">
          <h2>{selected.nombre_empresa || selected.slug || 'Tenant'}</h2>
          {selected.slug && <span className="chip chip--muted">@{selected.slug}</span>}
        </div>

        {/* TABS */}
        <div className="sa__tabs">
          <button className={tab === 'overview' ? 'is-active' : ''} onClick={() => setTab('overview')}>
            <Icon name="gauge" /> <span>Resumen</span>
          </button>
          <button className={tab === 'users' ? 'is-active' : ''} onClick={() => setTab('users')}>
            <Icon name="user" /> <span>Usuarios</span>
          </button>
          <button className={tab === 'data' ? 'is-active' : ''} onClick={() => setTab('data')}>
            <Icon name="db" /> <span>Datos</span>
          </button>
          <button className={tab === 'logs' ? 'is-active' : ''} onClick={() => setTab('logs')}>
            <Icon name="log" /> <span>Auditoría</span>
          </button>
        </div>

        {/* OVERVIEW */}
        {tab === 'overview' && (
          <div className="sa__grid">
            <section className="card">
              <header className="card__head">
                <Icon name="calendar" />
                <h3>Suscripción</h3>
              </header>

              <div className="kv">
                <div><span>Plan</span><strong>{planText}</strong></div>
                <div>
                  <span>Estado</span>
                  <strong className={`chip ${selected.subscription?.status ? 'chip--info' : 'chip--muted'}`}>
                    {selected.subscription?.status || '—'}
                  </strong>
                </div>
                <div><span>Renovación</span><strong>
                  {selected.subscription?.current_period_end ? new Date(selected.subscription.current_period_end).toLocaleString() : '—'}
                </strong></div>
              </div>

              {selected.subscription?.cancel_at_period_end && (
                <div className="row">
                  <span className="chip chip--muted">Se cancelará al final del periodo</span>
                </div>
              )}

              <div className="row">
                <button className="btn" onClick={() => onExtend(30)}>+30 días</button>
                <button className="btn" onClick={() => onExtend(90)}>+90 días</button>
                <button className="btn" onClick={() => onExtend(365)}>+365 días</button>
                <button className="btn btn--ghost" onClick={openDates}>Editar fechas…</button>
              </div>

              <div className="row">
                <button className="btn btn--ghost" onClick={() => onSetPlan({ plan_code: 'monthly',  status: 'active' })}>Mensual</button>
                <button className="btn btn--ghost" onClick={() => onSetPlan({ plan_code: 'yearly',   status: 'active' })}>Anual</button>
                <button className="btn btn--ghost" onClick={() => onSetPlan({ plan_code: 'biennial', status: 'active' })}>Bianual</button>
              </div>

              <div className="row">
                {selected.subscription?.cancel_at_period_end ? (
                  <button className="btn" onClick={async () => {
                    const { subscription } = await resumeSubscription(selected.id);
                    setSelected(p => ({ ...p, subscription }));
                  }}>
                    Reanudar suscripción
                  </button>
                ) : (
                  <>
                    <button className="btn btn--ghost" onClick={async () => {
                      const { subscription } = await cancelSubscription(selected.id, true);
                      setSelected(p => ({ ...p, subscription }));
                    }}>
                      Cancelar al final del periodo
                    </button>
                    <button className="btn" onClick={async () => {
                      if (!confirm('¿Cancelar inmediatamente esta suscripción?')) return;
                      const { subscription } = await cancelSubscription(selected.id, false);
                      setSelected(p => ({ ...p, subscription }));
                    }}>
                      Cancelación inmediata
                    </button>
                  </>
                )}
              </div>
            </section>

            <section className="card">
              <header className="card__head">
                <Icon name="switch" />
                <h3>Soporte</h3>
              </header>
              {!assumeSession ? (
                <button className="btn" onClick={() => onAssume('Soporte al cliente')}>Entrar como este tenant</button>
              ) : (
                <button className="btn" onClick={onEndAssume}>Finalizar impersonación</button>
              )}
              <p className="muted">Todas las acciones quedan registradas en el audit log.</p>
            </section>
          </div>
        )}

        {/* USERS */}
        {tab === 'users' && (
          <section className="card">
            <header className="card__head">
              <Icon name="user" />
              <h3>Usuarios (Supabase)</h3>
            </header>

            <div className="row" style={{ marginBottom: 8, gap: 8, flexWrap: 'wrap' }}>
              <div className="input-icon" style={{ flex: 1, minWidth: 220 }}>
                <Icon name="search" />
                <input placeholder="Buscar email…" value={userQ} onChange={onUserSearch} />
              </div>
            </div>

            <div className="table">
              <div className="thead grid-3">
                <div>Email</div>
                <div>Último login</div>
                <div style={{ textAlign: 'right' }}>Acciones</div>
              </div>

              {users.map(u => (
                <div key={u.id} className="tr grid-3">
                  <div>{u.email}</div>
                  <div>{u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString() : '—'}</div>
                  <div className="actions">
                    <button className="btn btn--ghost" onClick={() => onReset(u.email)}><Icon name="edit" />Reset pass</button>
                    <button className="btn" onClick={() => onImpersonate(u.email)}><Icon name="switch" />Impersonar</button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* DATA */}
        {tab === 'data' && (
          <section className="card">
            <header className="card__head">
              <Icon name="db" />
              <h3>Explorador de datos</h3>
            </header>

            <div className="row" style={{ gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
              <select value={tableSel} onChange={e => { setTableSel(e.target.value); setTablePage(1); }}>
                {tables.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <div className="input-icon" style={{ flex: 1, minWidth: 180 }}>
                <Icon name="search" />
                <input placeholder="Buscar…" value={tableQ} onChange={onTableSearch} />
              </div>
              <button className="btn btn--ghost" onClick={refreshTable}>Refrescar</button>
            </div>

            {tableRows.length === 0 ? (
              <div className="muted">Sin filas.</div>
            ) : (
              <>
                <div className="thead" style={{ display: 'grid', gridTemplateColumns: `repeat(${visibleCols.length + 1}, minmax(0,1fr))`, gap: 6 }}>
                  {visibleCols.map(c => <div key={c}>{c}</div>)}
                  <div style={{ textAlign: 'right' }}>Acciones</div>
                </div>

                {tableRows.map((r, idx) => (
                  <div key={r.id ?? r.uuid ?? idx} className="tr" style={{ display: 'grid', gridTemplateColumns: `repeat(${visibleCols.length + 1}, minmax(0,1fr))`, gap: 6, alignItems: 'center' }}>
                    {visibleCols.map(k => <div key={k}>{String(r?.[k] ?? '')}</div>)}
                    <div className="actions">
                      <button className="btn btn--ghost" onClick={() => onQuickEdit(r)}><Icon name="edit" />Editar</button>
                    </div>
                  </div>
                ))}

                <div className="sa__pager" style={{ marginTop: 8 }}>
                  <button className="btn btn--ghost" disabled={tablePage <= 1} onClick={() => { setTablePage(p => p - 1); setTimeout(refreshTable, 0); }}>Anterior</button>
                  <span>Página {tablePage}</span>
                  <button className="btn btn--ghost" disabled={(tablePage * 20) >= tableCount} onClick={() => { setTablePage(p => p + 1); setTimeout(refreshTable, 0); }}>Siguiente</button>
                </div>
              </>
            )}
            <p className="muted">Solo puedes editar los campos whitelisted en <code>admin.tables.js</code>.</p>
          </section>
        )}

        {/* LOGS */}
        {tab === 'logs' && (
          <section className="card">
            <header className="card__head">
              <Icon name="list" />
              <h3>Audit log {selected?.id ? `— Tenant ${selected.id}` : ''}</h3>
            </header>

            {auditLoading ? (
              <div className="muted">Cargando…</div>
            ) : (
              <div className="table">
                <div className="thead grid-5">
                  <div>Fecha</div>
                  <div>Acción</div>
                  <div>Tabla</div>
                  <div>Target</div>
                  <div>Actor</div>
                </div>

                {audit.map(a => (
                  <div key={a.id} className="tr grid-5">
                    <div>{new Date(a.created_at).toLocaleString()}</div>
                    <div>{a.action}</div>
                    <div>{a.target_table || '—'}</div>
                    <div className="mono">{a.target_id || '—'}</div>
                    <div className="mono">{a.actor_user_id ? a.actor_user_id.slice(0, 8) : '—'}</div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    );
  }

  /* ---------- UI ---------- */
  return (
    <div className={`sa ${sidebarOpen ? 'is-sidebar-open' : ''}`}>
      {/* TOPBAR */}
      <header className="sa__topbar">
        {!isMobile && (
          <button className="hamburger" onClick={() => setSidebarOpen(v => !v)} aria-label="Abrir/cerrar menú">
            <Icon name="menu" />
          </button>
        )}

        <div className="sa__brand">
          <Icon name="dot" className="brand-dot" />
          <span>EasyTrack — Superadmin</span>
        </div>

        <div className="sa__right">
          {/* Conmutador (solo desktop/tablet) */}
          {!isMobile && (
            <div className="sa__pill" role="tablist" aria-label="Vista">
              <button className={`btn btn--ghost ${mode==='tenants'?'is-on':''}`} onClick={() => setMode('tenants')}>Tenants</button>
              <button className={`btn btn--ghost ${mode==='requests'?'is-on':''}`} onClick={() => setMode('requests')}>Solicitudes</button>
            </div>
          )}

          {assumeSession && mode==='tenants' && (
            <div className="sa__pill">
              <Icon name="switch" />
              <span>Impersonando: {assumeSession.tenant_id}</span>
              <button className="btn btn--ghost" onClick={onEndAssume}>Finalizar</button>
            </div>
          )}

          <div className="sa__user"><Icon name="user" />{userEmail}</div>
          <button className="btn" onClick={() => supabase.auth.signOut()} title="Salir"><Icon name="logout" /> <span className="hide-sm">Salir</span></button>
        </div>
      </header>

      {/* Conmutador (versión móvil, debajo de la topbar) */}
      {isMobile && (
        <div className="sa__modes">
          <button className={`pill ${mode==='tenants'?'is-active':''}`} onClick={() => setMode('tenants')}>Tenants</button>
          <button className={`pill ${mode==='requests'?'is-active':''}`} onClick={() => setMode('requests')}>Solicitudes</button>
        </div>
      )}

      {/* overlay móvil para sidebar (solo desktop lo usa) */}
      <div
        className={`sa__mask ${sidebarOpen ? 'is-open' : ''}`}
        onClick={() => { if (window.innerWidth < 1024) setSidebarOpen(false); }}
      />

      {/* ===== Vista SOLICITUDES ===== */}
      {mode === 'requests' && (
        <main className="sa__main">
          <div className="sa__panel">
            <AdminRequests />
          </div>
        </main>
      )}

      {/* ===== Vista TENANTS ===== */}
      {mode === 'tenants' && (
        <>
          {/* Desktop / Tablet >= 1025px: sidebar + main */}
          {!isMobile ? (
            <div className="sa__body">
              {/* SIDEBAR */}
              <aside className="sa__sidebar">
                <div className="sa__search input-icon">
                  <Icon name="search" />
                  <input
                    placeholder="Buscar empresa…"
                    value={q}
                    onChange={e => { setPage(1); setQ(e.target.value); }}
                  />
                </div>

                <div className="sa__list">
                  {loading ? (
                    <div className="sa__loading">Cargando…</div>
                  ) : rows.length === 0 ? (
                    <div className="muted" style={{ padding: 12 }}>Sin resultados.</div>
                  ) : rows.map(t => (
                    <div
                      key={t.id}
                      className={`sa__item ${selected?.id === t.id ? 'is-active' : ''}`}
                      onClick={() => openTenant(t)}
                    >
                      <div className="sa__item-row">
                        <div className="avatar">{(t.nombre_empresa || t.slug || '?').slice(0,1).toUpperCase()}</div>
                        <div className="sa__item-texts" style={{ minWidth: 0 }}>
                          <div className="sa__item-title">{t.nombre_empresa || t.slug || '—'}</div>
                          <div className="sa__item-sub">{t.email || t.slug}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="sa__pager">
                  <button className="btn btn--ghost" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Anterior</button>
                  <span>Página {page}</span>
                  <button className="btn btn--ghost" disabled={(page * 20) >= count} onClick={() => setPage(p => p + 1)}>Siguiente</button>
                </div>
              </aside>

              {/* MAIN */}
              <main className="sa__main">
                {!selected ? (
                  <div className="sa__empty">
                    <div className="sa__illustration"><Icon name="shield" size={44} /></div>
                    <h2>Bienvenido</h2>
                    <p>Busca y selecciona un tenant para gestionarlo.</p>
                  </div>
                ) : <TenantDetail/>}
              </main>
            </div>
          ) : (
            /* Móvil ≤1024px: lista full + sheet detalle */
            <main className="sa__main">
              <div className="card" style={{ padding: 12 }}>
                <div className="input-icon" style={{ marginBottom: 10 }}>
                  <Icon name="search" />
                  <input
                    placeholder="Buscar empresa…"
                    value={q}
                    onChange={e => { setPage(1); setQ(e.target.value); }}
                  />
                </div>

                {loading ? (
                  <div className="muted">Cargando…</div>
                ) : rows.length === 0 ? (
                  <div className="muted">Sin resultados.</div>
                ) : rows.map(t => (
                  <div
                    key={t.id}
                    className="sa__item"
                    onClick={() => openTenant(t)}
                    style={{ display:'flex', alignItems:'center', gap:10 }}
                  >
                    <div className="avatar">{(t.nombre_empresa || t.slug || '?').slice(0,1).toUpperCase()}</div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="sa__item-title">{t.nombre_empresa || t.slug || '—'}</div>
                      <div className="sa__item-sub">{t.email || t.slug}</div>
                    </div>
                  </div>
                ))}

                <div className="sa__pager">
                  <button className="btn btn--ghost" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Anterior</button>
                  <span>Página {page}</span>
                  <button className="btn btn--ghost" disabled={(page * 20) >= count} onClick={() => setPage(p => p + 1)}>Siguiente</button>
                </div>
              </div>

              {/* SHEET detalle */}
              {sheetOpen && (
                <div className="sheet" role="dialog" aria-modal="true" onClick={() => setSheetOpen(false)}>
                  <div className="sheet__card" onClick={e => e.stopPropagation()}>
                    <div className="sheet__head">
                      <button className="btn btn--ghost btn--icon" onClick={() => setSheetOpen(false)} aria-label="Volver">
                        <Icon name="back" />
                      </button>
                      <div className="sheet__title">{selected?.nombre_empresa || selected?.slug || 'Detalle'}</div>
                      <div className="sheet__spacer" />
                    </div>
                    <div className="sheet__content">
                      <TenantDetail/>
                    </div>
                  </div>
                </div>
              )}
            </main>
          )}
        </>
      )}

      {/* MODAL EDITAR FECHAS */}
      {datesOpen && (
        <div className="modal" onClick={() => setDatesOpen(false)}>
          <div className="modal__card" onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: 8 }}>Editar fechas de suscripción</h3>
            <div className="modal__row">
              <label style={{ flex: 1, minWidth: 220 }}>
                <span className="muted" style={{ display:'block', marginBottom:4 }}>Inicio periodo</span>
                <input type="datetime-local" value={dates.start} onChange={e => setDates({ ...dates, start: e.target.value })}/>
              </label>
              <label style={{ flex: 1, minWidth: 220 }}>
                <span className="muted" style={{ display:'block', marginBottom:4 }}>Fin periodo</span>
                <input type="datetime-local" value={dates.end} onChange={e => setDates({ ...dates, end: e.target.value })}/>
              </label>
              <label style={{ flex: 1, minWidth: 220 }}>
                <span className="muted" style={{ display:'block', marginBottom:4 }}>Fin trial</span>
                <input type="datetime-local" value={dates.trial} onChange={e => setDates({ ...dates, trial: e.target.value })}/>
              </label>
            </div>
            <div className="modal__footer">
              <button className="btn btn--ghost" onClick={() => setDatesOpen(false)}>Cancelar</button>
              <button className="btn" onClick={saveDates}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
