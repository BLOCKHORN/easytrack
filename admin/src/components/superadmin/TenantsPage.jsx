import { useEffect, useMemo, useRef, useState } from "react";
import {
  listTenants, getTenant,
  extendSubscription, setPlan, cancelSubscription, resumeSubscription,
  assumeTenant, endAssume,
  listTables, queryTable, patchRow,
  listAudit, searchUsers, sendReset, makeImpersonateLink
} from "../../services/adminService";
import "../../styles/TenantsPage.scss";
import Icon from "./Icon.jsx";

/* ====== Etiquetas de planes ====== */
const PLAN_LABEL = {
  monthly: "Mensual", mensual: "Mensual", monthlyy: "Mensual",
  quarterly: "Trimestral", trimestral: "Trimestral",
  yearly: "Anual", annual: "Anual", anual: "Anual",
  biennial: "Anual", bianual: "Anual", "24m": "Anual",
};
const normalize = (v) => String(v ?? "").toLowerCase();

/* ===== Helpers UI ===== */
const Chip = ({ tone = "ghost", children, title }) => (
  <span title={title} className={`tz-chip tz-chip--${tone}`}>{children}</span>
);
const KV = ({ label, value, mono }) => (
  <div className="tz-kv__row">
    <span className="tz-kv__label">{label}</span>
    <strong className={`tz-kv__value ${mono ? "mono" : ""}`}>{value ?? "—"}</strong>
  </div>
);
const Empty = ({ title, sub, icon = "shield" }) => (
  <div className="tz-empty">
    <Icon name={icon} size={36} />
    <h2>{title}</h2>
    <p className="muted">{sub}</p>
  </div>
);

export default function TenantsPage() {
  /* ===================== SIDEBAR ===================== */
  const [q, setQ] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const [statusFilter, setStatusFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [sortBy, setSortBy] = useState("renew");
  const [page, setPage] = useState(1);
  const pageSize = 18;

  const rplan = (sub) => {
    const k = normalize(sub?.plan_code || sub?.plan_id);
    if (k.includes("quarter") || k.includes("trim")) return "quarterly";
    if (k.includes("year") || k.includes("anual") || k.includes("annual")) return "yearly";
    if (k.includes("month") || k.includes("mensual")) return "monthly";
    return k || "—";
  };
  const labelPlan = (code) => PLAN_LABEL[normalize(code)] || code || "—";

  // carga inicial
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data } = await listTenants({ q: "", page: 1, pageSize: 500 });
        setRows(data || []);
      } finally { setLoading(false); }
    })();
  }, []);

  // debounce búsqueda sidebar
  const qRef = useRef();
  useEffect(() => {
    clearTimeout(qRef.current);
    qRef.current = setTimeout(() => setPage(1), 180);
    return () => clearTimeout(qRef.current);
  }, [q, statusFilter, planFilter, sortBy]);

  const filtered = useMemo(() => {
    let list = rows;
    if (statusFilter !== "all") list = list.filter((r) => normalize(r?.subscription?.status) === statusFilter);
    if (planFilter !== "all") list = list.filter((r) => rplan(r?.subscription) === planFilter);
    const qq = normalize(q);
    if (qq) {
      list = list.filter((r) =>
        normalize(r?.nombre_empresa).includes(qq) ||
        normalize(r?.slug).includes(qq) ||
        normalize(r?.email).includes(qq)
      );
    }
    list = [...list].sort((a, b) => {
      if (sortBy === "name") return normalize(a?.nombre_empresa || a?.slug).localeCompare(normalize(b?.nombre_empresa || b?.slug));
      if (sortBy === "created") return new Date(b?.created_at || 0) - new Date(a?.created_at || 0);
      const ea = new Date(a?.subscription?.current_period_end || 0).getTime();
      const eb = new Date(b?.subscription?.current_period_end || 0).getTime();
      return (ea || Infinity) - (eb || Infinity);
    });
    return list;
  }, [rows, q, statusFilter, planFilter, sortBy]);

  const total = filtered.length;
  const start = (page - 1) * pageSize;
  const pageRows = filtered.slice(start, start + pageSize);

  /* ===================== DETALLE ===================== */
  const [selected, setSelected] = useState(null);
  const [assumeSession, setAssumeSession] = useState(null);

  // pestañas internas
  const [tab, setTab] = useState("data");

  async function openTenant(t) {
    const { tenant, subscription } = await getTenant(t.id);
    setSelected({ ...tenant, subscription });
    setTab("data");
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  /* ===================== SUSCRIPCIONES ===================== */
  async function onExtend(days) {
    if (!selected) return;
    const { subscription } = await extendSubscription(selected.id, days);
    setSelected((p) => ({ ...p, subscription }));
  }
  async function onSetPlan(code, status = "active") {
    if (!selected) return;
    const { subscription } = await setPlan(selected.id, { plan_code: code, status });
    setSelected((p) => ({ ...p, subscription }));
  }
  async function onCancel(atPeriodEnd = true) {
    if (!selected) return;
    const { subscription } = await cancelSubscription(selected.id, atPeriodEnd);
    setSelected((p) => ({ ...p, subscription }));
  }
  async function onResume() {
    if (!selected) return;
    const { subscription } = await resumeSubscription(selected.id);
    setSelected((p) => ({ ...p, subscription }));
  }

  /* ===================== IMPERSONACIÓN ===================== */
  async function onAssume(reason = "Soporte") {
    if (!selected) return;
    const { session } = await assumeTenant(selected.id, reason, 60);
    setAssumeSession(session);
  }
  async function onEndAssume() {
    if (!assumeSession) return;
    await endAssume(assumeSession.id);
    setAssumeSession(null);
  }

  // acceso rápido
  async function onQuickAccess() {
    if (!selected) return;
    try {
      const candidateEmail = selected.owner_email || selected.email || null;
      if (!candidateEmail) {
        alert("No encuentro email principal del tenant. Busca un usuario y usa 'Magic link'.");
        return;
      }
      const { link } = await makeImpersonateLink(candidateEmail, selected.id, 60);
      if (link) window.open(link, "_blank", "noopener");
      else alert("No se generó el enlace de acceso.");
    } catch {
      alert("No se pudo crear el magic link de acceso rápido.");
    }
  }

  /* ===================== USERS ===================== */
  const [userQ, setUserQ] = useState("");
  const [users, setUsers] = useState([]);
  const userRef = useRef();
  async function refreshUsers(text = "") {
    try { const { users: found } = await searchUsers(text); setUsers(found || []); }
    catch { setUsers([]); }
  }
  useEffect(() => {
    clearTimeout(userRef.current);
    userRef.current = setTimeout(() => refreshUsers(userQ), 220);
    return () => clearTimeout(userRef.current);
  }, [userQ]);

  async function onReset(email) {
    try {
      const { link } = await sendReset(email);
      alert("Enlace de recuperación generado.\n" + (link || "Se envió por email"));
    } catch { alert("No se pudo generar el reset."); }
  }
  async function onImpersonate(email) {
    try {
      const { link } = await makeImpersonateLink(email, selected?.id || null, 30);
      if (link) window.open(link, "_blank", "noopener");
    } catch { alert("No se pudo generar el magic link."); }
  }

  /* ===================== AUDITORÍA ===================== */
  const [audit, setAudit] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  async function refreshAudit() {
    if (!selected) return;
    setAuditLoading(true);
    try {
      const { data } = await listAudit({ tenant_id: selected.id, page: 1, pageSize: 120 });
      setAudit(data || []);
    } finally { setAuditLoading(false); }
  }

  /* ===================== DATA ===================== */
  const [tables, setTables] = useState([]);
  const [tableSel, setTableSel] = useState("");
  const [tableQ, setTableQ] = useState("");
  const [tablePage, setTablePage] = useState(1);
  const [tableRows, setTableRows] = useState([]);
  const [tableCount, setTableCount] = useState(0);
  const [tableLoading, setTableLoading] = useState(false);

  async function refreshTable() {
    if (!selected || !tableSel) return;
    setTableLoading(true);
    try {
      const { data, count } = await queryTable(tableSel, {
        q: tableQ, page: tablePage, pageSize: 20, tenant_id: selected.id,
      });
      const hasTid =
        Array.isArray(data) && data[0] &&
        Object.prototype.hasOwnProperty.call(data[0], "tenant_id");
      const scoped = hasTid ? (data || []).filter((r) => r.tenant_id === selected.id) : (data || []);
      setTableRows(scoped);
      setTableCount(hasTid ? scoped.length : count || 0);
    } finally { setTableLoading(false); }
  }
  const visibleCols = useMemo(() => {
    if (!tableRows?.length) return [];
    const keys = Object.keys(tableRows[0] || {});
    const idKey = keys.includes("id") ? ["id"] : keys.includes("uuid") ? ["uuid"] : [];
    const rest = keys.filter((k) => !idKey.includes(k)).slice(0, 4);
    return [...idKey, ...rest];
  }, [tableRows]);
  function onTableSearch(e) {
    setTableQ(e.target.value);
    setTablePage(1);
    clearTimeout(onTableSearch._t);
    onTableSearch._t = setTimeout(refreshTable, 250);
  }

  /* ====== Editor de fila (Datos) ====== */
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null); // { tableSel, row, idKey, field, value }

  // bloquear scroll de fondo con modal
  useEffect(() => {
    if (!editOpen) return;
    document.body.classList.add("no-scroll");
    return () => document.body.classList.remove("no-scroll");
  }, [editOpen]);

  function openEdit(row) {
    const idKey = row.id != null ? "id" : row.uuid != null ? "uuid" : visibleCols[0];
    const blocked = new Set(["id","uuid","tenant_id","created_at","updated_at","inserted_at","created","modified"]);
    const fields = visibleCols.filter((c) => !blocked.has(String(c).toLowerCase()));
    setEditTarget({
      tableSel,
      row,
      idKey,
      field: fields[0] || "",
      value: fields[0] ? row[fields[0]] ?? "" : "",
      fields,
    });
    setEditOpen(true);
  }
  async function applyEdit() {
    if (!editTarget?.field) { alert("Selecciona un campo editable."); return; }
    try {
      const { row: updated } = await patchRow(
        editTarget.tableSel,
        editTarget.row[editTarget.idKey],
        { [editTarget.field]: editTarget.value }
      );
      setTableRows((prev) =>
        prev.map((x) => ((x.id ?? x.uuid) === (updated.id ?? updated.uuid) ? updated : x))
      );
      setEditOpen(false);
    } catch { alert("Campo no permitido por backend o error al actualizar."); }
  }

  /* ===================== EFECTOS POR TAB ===================== */
  useEffect(() => {
    if (!selected) return;
    if (tab === "logs") refreshAudit();
    if (tab === "data") {
      (async () => {
        if (!tables.length) {
          const { tables: ts } = await listTables();
          setTables(ts || []);
          setTableSel(ts?.[0] || "");
        } else if (!tableSel && tables[0]) {
          setTableSel(tables[0]);
        } else {
          await refreshTable();
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, tableSel, selected?.id]);

  const planText = selected?.subscription?.plan_code
    ? PLAN_LABEL[normalize(selected.subscription.plan_code)] || selected.subscription.plan_code
    : selected?.subscription?.plan_id
    ? `#${String(selected.subscription.plan_id).slice(0, 8)}`
    : "—";

  /* ===================== RENDER ===================== */
  return (
    <div className="tenants tenants--clean">
      {/* ===== Sidebar ===== */}
      <aside className="tz-side" aria-label="Listado y filtros de tenants">
        <div className="tz-side__head">
          <h3><Icon name="building" /> Tenants</h3>

          <div className="tz-input-icon">
            <Icon name="search" />
            <input
              placeholder="Buscar empresa / email / slug…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Buscar tenants"
            />
          </div>

          <div className="tz-filters">
            <label className="tz-select">
              <span className="muted tiny">Estado</span>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                aria-label="Filtrar por estado"
              >
                <option value="all">Todos</option>
                <option value="active">Activa</option>
                <option value="trialing">En trial</option>
                <option value="past_due">Impago</option>
                <option value="canceled">Cancelada</option>
              </select>
            </label>

            <label className="tz-select">
              <span className="muted tiny">Plan</span>
              <select
                value={planFilter}
                onChange={(e) => { setPlanFilter(e.target.value); setPage(1); }}
                aria-label="Filtrar por plan"
              >
                <option value="all">Todos</option>
                <option value="monthly">Mensual</option>
                <option value="quarterly">Trimestral</option>
                <option value="yearly">Anual</option>
              </select>
            </label>

            <label className="tz-select">
              <span className="muted tiny">Orden</span>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} aria-label="Ordenar">
                <option value="renew">Próx. renovación</option>
                <option value="created">Más recientes</option>
                <option value="name">Nombre</option>
              </select>
            </label>
          </div>
        </div>

        <div className="tz-side__list">
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="tz-item tz-item--sk">
                <div className="sk-line w40" />
                <div className="sk-line w60" />
              </div>
            ))
          ) : pageRows.length === 0 ? (
            <div className="muted p12">Sin resultados.</div>
          ) : (
            pageRows.map((t) => {
              const active = selected?.id === t.id;
              const s = t.subscription?.status || "—";
              const renew = t.subscription?.current_period_end
                ? new Date(t.subscription.current_period_end).toLocaleDateString()
                : "—";
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => openTenant(t)}
                  className={`tz-item ${active ? "is-active" : ""}`}
                  title={`Renueva: ${renew}`}
                  aria-current={active ? "true" : "false"}
                >
                  <div className="tz-avatar">
                    {(t.nombre_empresa || t.slug || "?").slice(0, 1).toUpperCase()}
                  </div>
                  <div className="tz-txts">
                    <div className="title ell">{t.nombre_empresa || t.slug || "—"}</div>
                    <div className="sub mono ell">{t.email || t.slug}</div>
                    <div className="meta">
                      <Chip tone="ghost">
                        {labelPlan(t?.subscription?.plan_code || t?.subscription?.plan_id)}
                      </Chip>
                      <Chip
                        tone={s === "active" ? "ok" : s === "trialing" ? "info" : s === "past_due" ? "warn" : "muted"}
                      >
                        {s}
                      </Chip>
                    </div>
                  </div>
                  <span className="muted tiny">{renew}</span>
                </button>
              );
            })
          )}
        </div>

        <div className="tz-side__pager" role="navigation" aria-label="Paginación de tenants">
          <span className="muted tiny">Total: {total}</span>
          <div className="spacer" />
          <button className="tz-btn tz-btn--ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Anterior
          </button>
          <span>Página {page}</span>
          <button
            className="tz-btn tz-btn--ghost"
            disabled={page * pageSize >= total}
            onClick={() => setPage((p) => p + 1)}
          >
            Siguiente
          </button>
        </div>
      </aside>

      {/* ===== Main ===== */}
      <main className="tz-main">
        {!selected ? (
          <Empty title="Selecciona un tenant" sub="Usa la búsqueda y los filtros." />
        ) : (
          <>
            {/* HEADER */}
            <header className="tz-main__head">
              <div className="h-left">
                <h2 className="ell">{selected.nombre_empresa || selected.slug || "Tenant"}</h2>
                {selected.slug && <Chip tone="muted">@{selected.slug}</Chip>}
                {selected.email && <Chip tone="ghost">{selected.email}</Chip>}
              </div>
              <div className="h-right">
                <Chip tone="info">{planText}</Chip>
                <Chip
                  tone={
                    selected.subscription?.status === "active"
                      ? "ok"
                      : selected.subscription?.status === "trialing"
                      ? "info"
                      : selected.subscription?.status === "past_due"
                      ? "warn"
                      : "muted"
                  }
                >
                  {selected.subscription?.status || "—"}
                </Chip>
                {selected.subscription?.current_period_end && (
                  <Chip tone="ghost">
                    Renueva: {new Date(selected.subscription.current_period_end).toLocaleDateString()}
                  </Chip>
                )}
              </div>
            </header>

            {/* Pestañas */}
            <div className="tz-tabs" role="tablist" aria-label="Vistas">
              <button className={`tz-tab ${tab === "data" ? "is-active" : ""}`} onClick={() => setTab("data")} role="tab" aria-selected={tab==="data"}>
                <Icon name="db" /> Datos
              </button>
              <button className={`tz-tab ${tab === "logs" ? "is-active" : ""}`} onClick={() => setTab("logs")} role="tab" aria-selected={tab==="logs"}>
                <Icon name="list" /> Auditoría
              </button>
            </div>

            {/* Resumen SIEMPRE visible */}
            <section className="tz-summary">
              <div className="tz-cards-3 tz-same">
                {/* Estado */}
                <section className="tz-card">
                  <header className="tz-card__head"><Icon name="id" /><h3>Estado</h3></header>
                  <div className="tz-kv">
                    <KV label="Plan" value={planText} />
                    <KV label="Estado" value={<span className={`pill pill--${selected.subscription?.status || "muted"}`}>{selected.subscription?.status || "—"}</span>} />
                    <KV label="Inicio periodo" value={selected.subscription?.current_period_start ? new Date(selected.subscription.current_period_start).toLocaleString() : "—"} />
                    <KV label="Fin periodo" value={selected.subscription?.current_period_end ? new Date(selected.subscription.current_period_end).toLocaleString() : "—"} />
                    <KV label="Fin trial" value={selected.subscription?.trial_ends_at ? new Date(selected.subscription.trial_ends_at).toLocaleString() : "—"} />
                  </div>
                </section>

                {/* Acciones */}
                <section className="tz-card">
                  <header className="tz-card__head"><Icon name="zap" /><h3>Acciones</h3></header>
                  <div className="tz-row wrap gap8">
                    <button className="tz-btn" onClick={() => onExtend(30)}>+30 días</button>
                    <button className="tz-btn" onClick={() => onExtend(90)}>+90 días</button>
                    <button className="tz-btn" onClick={() => onExtend(365)}>+365 días</button>
                    <button className="tz-btn tz-btn--ghost" onClick={() => {
                      const s = selected?.subscription;
                      alert(`Periodo actual:\nInicio: ${s?.current_period_start ? new Date(s.current_period_start).toLocaleString() : "—"}\nFin: ${s?.current_period_end ? new Date(s.current_period_end).toLocaleString() : "—"}\nTrial: ${s?.trial_ends_at ? new Date(s.trial_ends_at).toLocaleString() : "—"}`);
                    }}>Ver fechas</button>
                  </div>
                  <div className="tz-row wrap gap8">
                    <button className="tz-btn tz-btn--ghost" onClick={() => onSetPlan("monthly")}>Mensual</button>
                    <button className="tz-btn tz-btn--ghost" onClick={() => onSetPlan("quarterly")}>Trimestral</button>
                    <button className="tz-btn tz-btn--ghost" onClick={() => onSetPlan("yearly")}>Anual</button>
                  </div>
                  <div className="tz-row wrap gap8">
                    {selected.subscription?.cancel_at_period_end ? (
                      <button className="tz-btn" onClick={onResume}>Reanudar</button>
                    ) : (
                      <>
                        <button className="tz-btn tz-btn--ghost" onClick={() => onCancel(true)}>Cancelar al final</button>
                        <button className="tz-btn" onClick={() => { if (!confirm("¿Cancelar inmediatamente?")) return; onCancel(false); }}>
                          Cancelar ahora
                        </button>
                      </>
                    )}
                  </div>
                </section>

                {/* Acceso rápido */}
                <section className="tz-card">
                  <header className="tz-card__head"><Icon name="switch" /><h3>Acceso rápido</h3></header>
                  <div className="tz-row wrap gap8">
                    <button className="tz-btn tz-btn--primary" onClick={onQuickAccess}><Icon name="login" /> Acceder con Magic Link</button>
                    {!assumeSession ? (
                      <button className="tz-btn tz-btn--ghost" onClick={() => onAssume("Soporte al cliente")}><Icon name="user-check" /> Asumir sesión (legacy)</button>
                    ) : (
                      <button className="tz-btn tz-btn--ghost" onClick={onEndAssume}><Icon name="logout" /> Finalizar asunción</button>
                    )}
                  </div>

                  <p className="muted tiny mt8">Todas las acciones quedan registradas en el audit log.</p>
                  <div className="tz-divider" />
                  <h4 className="muted">Usuarios</h4>
                  <div className="tz-input-icon">
                    <Icon name="search" />
                    <input
                      placeholder="Buscar email…"
                      value={userQ}
                      onChange={(e) => setUserQ(e.target.value)}
                      aria-label="Buscar usuarios del tenant"
                    />
                  </div>

                  {userQ && (
                    <div className="tz-table mt8">
                      <div className="tz-thead tz-grid-3">
                        <div>Email</div>
                        <div>Último login</div>
                        <div className="ta-r">Acciones</div>
                      </div>
                      {users.map((u) => (
                        <div key={u.id} className="tz-tr tz-grid-3">
                          <div className="ell">{u.email}</div>
                          <div>{u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString() : "—"}</div>
                          <div className="actions">
                            <button className="tz-btn tz-btn--ghost" onClick={() => onReset(u.email)}>Reset pass</button>
                            <button className="tz-btn" onClick={() => onImpersonate(u.email)}>Magic link</button>
                          </div>
                        </div>
                      ))}
                      {users.length === 0 && <div className="muted tiny p8">Sin resultados.</div>}
                    </div>
                  )}
                </section>
              </div>
            </section>

            {/* Paneles de pestañas */}
            <section className="tz-tabpanels">
              {tab === "data" && (
                <section className="tz-card" aria-label="Datos del tenant">
                  <header className="tz-card__head"><Icon name="db" /><h3>Datos del tenant</h3></header>

                  <div className="tz-toolbar">
                    <label className="tz-select">
                      <select
                        value={tableSel}
                        onChange={(e) => { setTableSel(e.target.value); setTablePage(1); }}
                        aria-label="Tabla"
                      >
                        {tables.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </label>

                    <div className="tz-input-icon">
                      <Icon name="search" />
                      <input placeholder="Buscar en tabla…" value={tableQ} onChange={onTableSearch} aria-label="Buscar en datos" />
                    </div>

                    <div className="spacer" />
                    <button className="tz-btn tz-btn--ghost" onClick={refreshTable}><Icon name="refresh" /> Refrescar</button>
                  </div>

                  <p className="muted tiny">{tableLoading ? "Cargando…" : `Mostrando datos para tenant_id = ${selected.id}`}</p>

                  <div className="tz-scroll">
                    {tableRows.length === 0 ? (
                      <div className="muted">Sin filas.</div>
                    ) : (
                      <>
                        <div className="tz-thead tz-grid-auto">
                          {visibleCols.map((c) => <div key={c}>{c}</div>)}
                          <div className="ta-r">Acciones</div>
                        </div>

                        {tableRows.map((r, idx) => (
                          <div key={r.id ?? r.uuid ?? idx} className="tz-tr tz-grid-auto">
                            {visibleCols.map((k) => <div key={k} className="ell">{String(r?.[k] ?? "")}</div>)}
                            <div className="actions">
                              <button className="tz-btn tz-btn--ghost" onClick={() => openEdit(r)}>Editar</button>
                            </div>
                          </div>
                        ))}

                        <div className="tz-pager">
                          <button className="tz-btn tz-btn--ghost" disabled={tablePage <= 1}
                            onClick={() => { setTablePage((p) => p - 1); setTimeout(refreshTable, 0); }}>
                            Anterior
                          </button>
                          <span>Página {tablePage}</span>
                          <button className="tz-btn tz-btn--ghost" disabled={tablePage * 20 >= tableCount}
                            onClick={() => { setTablePage((p) => p + 1); setTimeout(refreshTable, 0); }}>
                            Siguiente
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </section>
              )}

              {tab === "logs" && (
                <section className="tz-card" aria-label="Auditoría">
                  <header className="tz-card__head"><Icon name="list" /><h3>Auditoría</h3></header>
                  <div className="tz-scroll">
                    {auditLoading ? (
                      <div className="muted">Cargando…</div>
                    ) : audit.length === 0 ? (
                      <div className="muted">Sin eventos.</div>
                    ) : (
                      <div className="tz-timeline">
                        {audit.map((a) => (
                          <div key={a.id} className="tz-tl__item">
                            <div className="tz-tl__dot" />
                            <div className="tz-tl__card">
                              <div className="tz-tl__head">
                                <strong>{a.action}</strong>
                                <span className="muted tiny">{new Date(a.created_at).toLocaleString()}</span>
                              </div>
                              <div className="tz-tl__body">
                                <span className="muted tiny">Tabla:</span> {a.target_table || "—"} ·{" "}
                                <span className="muted tiny">Target:</span> <span className="mono">{a.target_id || "—"}</span> ·{" "}
                                <span className="muted tiny">Actor:</span> <span className="mono">{a.actor_user_id ? a.actor_user_id.slice(0, 8) : "—"}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </section>
              )}
            </section>
          </>
        )}
      </main>

      {/* ===== MODAL EDITAR FILA ===== */}
      {editOpen && (
        <div className="tz-modal" onClick={() => setEditOpen(false)} role="dialog" aria-modal="true" aria-label="Editar fila">
          <div className="tz-modal__card" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: 8 }}>Editar fila</h3>
            <p className="muted tiny">
              Tabla: <strong className="mono">{editTarget?.tableSel}</strong> · ID:{" "}
              <span className="mono">{editTarget?.row?.[editTarget?.idKey]}</span>
            </p>

            <div className="tz-modal__row">
              <label>
                <span className="muted tiny">Campo</span>
                <select
                  value={editTarget?.field || ""}
                  onChange={(e) =>
                    setEditTarget((p) => ({
                      ...p,
                      field: e.target.value,
                      value: editTarget?.row?.[e.target.value] ?? "",
                    }))
                  }
                >
                  {(editTarget?.fields || []).map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </label>
              <label>
                <span className="muted tiny">Valor</span>
                <input
                  value={String(editTarget?.value ?? "")}
                  onChange={(e) => setEditTarget((p) => ({ ...p, value: e.target.value }))}
                />
              </label>
            </div>

            <div className="tz-modal__footer">
              <button className="tz-btn tz-btn--ghost" onClick={() => setEditOpen(false)}>Cancelar</button>
              <button className="tz-btn" onClick={applyEdit}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
