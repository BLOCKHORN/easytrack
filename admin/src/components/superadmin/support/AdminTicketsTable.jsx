import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { adminListTickets } from "../../../services/adminSupportService.js";
import MiniStatusBadge from "./MiniStatusBadge.jsx";

const LAST_SEEN_KEY = 'sa_support_last_seen';

const fmt = (d) => {
  try { return new Date(d).toLocaleString(); }
  catch { return "—"; }
};

export default function AdminTicketsTable() {
  const [items, setItems]   = useState([]);
  const [total, setTotal]   = useState(0);
  const [loading, setLoad]  = useState(true);

  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const abortRef = useRef(null);

  // ---- query params
  const q       = params.get("q")      || "";
  const estado  = params.get("estado") || "";
  const tipo    = params.get("tipo")   || "";
  const page    = Number(params.get("page") || 1);
  const pageSize = 20;

  // ---- marca "visto" al entrar en la bandeja
  useEffect(() => {
    localStorage.setItem(LAST_SEEN_KEY, String(Date.now()));
    // opcional: emitir evento si quieres refrescar el bubble de vuelta
    // window.dispatchEvent(new Event('support-seen'));
  }, []);

  // ---- estado local para debounce del input de búsqueda
  const [search, setSearch] = useState(q);
  useEffect(() => setSearch(q), [q]);

  // ---- cargar datos (con abort cuando cambian filtros)
  useEffect(() => {
    abortRef.current?.abort?.();
    const ac = new AbortController();
    abortRef.current = ac;

    (async () => {
      setLoad(true);
      try {
        const r = await adminListTickets({ q, estado, tipo, page, pageSize });
        if (ac.signal.aborted) return;
        setItems(r.items || []);
        setTotal(r.total || 0);
      } catch (err) {
        if (!ac.signal.aborted) {
          console.warn("[AdminTicketsTable] load error:", err?.message || err);
          setItems([]);
          setTotal(0);
        }
      } finally {
        if (!ac.signal.aborted) setLoad(false);
      }
    })();

    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, estado, tipo, page]);

  const pages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total]);

  // ---- helpers para setear params
  const set = (key, val) => setParams(prev => {
    const p = new URLSearchParams(prev);
    if (val) p.set(key, val); else p.delete(key);
    p.set("page", "1");
    return p;
  });
  const go = (next) => setParams(prev => {
    const p = new URLSearchParams(prev);
    p.set("page", String(next));
    return p;
  });

  // ---- debounce de búsqueda (300ms)
  useEffect(() => {
    const t = setTimeout(() => {
      if (search !== q) set("q", search.trim());
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const lastSeen = Number(localStorage.getItem(LAST_SEEN_KEY) || 0);

  function openTicket(tid) {
    // al abrir un ticket desde la lista, mantenemos "visto"
    localStorage.setItem(LAST_SEEN_KEY, String(Date.now()));
    navigate(`/superadmin/support/${tid}`);
  }

  return (
    <section className="admin-tickets">
      <header className="admin-tickets__hdr">
        <h2>Soporte (global)</h2>

        <div className="filters">
          <input
            placeholder="Buscar asunto/código/email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Buscar tickets por asunto, código o email"
          />

          {/* Estados válidos: pendiente | en_proceso | esperando_cliente | cerrado */}
          <select
            value={estado}
            onChange={(e) => set("estado", e.target.value)}
            aria-label="Filtrar por estado"
          >
            <option value="">Estado: todos</option>
            <option value="pendiente">Pendiente</option>
            <option value="en_proceso">En proceso</option>
            <option value="esperando_cliente">Esperando cliente</option>
            <option value="cerrado">Cerrado</option>
          </select>

          <select
            value={tipo}
            onChange={(e) => set("tipo", e.target.value)}
            aria-label="Filtrar por tipo"
          >
            <option value="">Tipo: todos</option>
            <option value="incidencia">Incidencia</option>
            <option value="mejora">Mejora</option>
            <option value="consultoria">Consultoría</option>
          </select>
        </div>
      </header>

      <div className="table" role="table" aria-label="Listado de tickets de soporte">
        <div className="thead" role="row">
          <div role="columnheader">Código</div>
          <div role="columnheader">Cliente</div>
          <div role="columnheader">Asunto</div>
          <div role="columnheader">Tipo</div>
          <div role="columnheader">Estado</div>
          <div role="columnheader">Actualizado</div>
          <div role="columnheader" aria-hidden="true"></div>
        </div>

        <div className="tbody" role="rowgroup">
          {loading ? (
            <>
              {Array.from({ length: 6 }).map((_, i) => (
                <div className="row is-skeleton" key={i} role="row">
                  <div><span className="sk w60" /></div>
                  <div><span className="sk w40" /></div>
                  <div><span className="sk w80" /></div>
                  <div><span className="sk w40" /></div>
                  <div><span className="sk w40" /></div>
                  <div><span className="sk w60" /></div>
                  <div><span className="sk w40" /></div>
                </div>
              ))}
            </>
          ) : items.length === 0 ? (
            <div className="row" role="row">
              <div data-label="">{q || estado || tipo ? "Sin resultados con los filtros aplicados." : "No hay tickets"}</div>
            </div>
          ) : (
            items.map((t) => {
              // usa updated_at como “última actividad”
              const latest = t.updated_at ? new Date(t.updated_at).getTime() : 0;
              const isNew = latest > lastSeen && t.estado !== 'cerrado';

              return (
                <div className={`row ${isNew ? 'is-new' : ''}`} key={t.id} role="row">
                  <div className="mono" data-label="Código">{t.codigo}</div>
                  <div data-label="Cliente">
                    {t.tenant?.nombre_empresa || t.tenant_nombre || t.tenant?.slug || t.tenant_id}
                  </div>
                  <div data-label="Asunto">{t.asunto || "—"}</div>
                  <div data-label="Tipo">{t.tipo || "—"}</div>
                  <div data-label="Estado">
                    <MiniStatusBadge estado={t.estado} />
                  </div>
                  <div data-label="Actualizado">{fmt(t.updated_at)}</div>
                  <div data-label="">
                    <button
                      className="btn btn--sm btn--primary"
                      onClick={() => openTicket(t.id)}
                      aria-label={`Abrir ticket ${t.codigo}`}
                    >
                      Abrir
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <footer className="pager" aria-label="Paginación">
        <button
          className="btn btn--sm"
          disabled={page <= 1 || loading}
          onClick={() => go(page - 1)}
        >
          Anterior
        </button>

        <span> Página {page} / {pages} </span>

        <button
          className="btn btn--sm"
          disabled={page >= pages || loading}
          onClick={() => go(page + 1)}
        >
          Siguiente
        </button>
      </footer>
    </section>
  );
}
