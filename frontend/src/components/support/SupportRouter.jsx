import { useEffect, useState } from "react";
import TicketsList from "./TicketsList.jsx";
import TicketDetail from "./TicketDetail.jsx";
import NewTicketModal from "./NewTicketModal.jsx";
import "../../styles/support.scss";

// 🔔 limpiar aviso al entrar
import { clearNotice } from "../../utils/supportNotice";

export default function SupportRouter() {
  const [view, setView] = useState("list"); // list | detail
  const [activeId, setActiveId] = useState(null);
  const [newOpen, setNewOpen] = useState(false);
  const [filters, setFilters] = useState({ estado: "", q: "", tipo: "" });

  useEffect(() => {
    // Al cargar la sección Soporte, lo damos por visto
    clearNotice();
  }, []);

  function openTicket(id) {
    setActiveId(id);
    setView("detail");
    clearNotice(); // también al abrir un ticket
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function goList() {
    setActiveId(null);
    setView("list");
  }

  return (
    <div className="support">
      <header className="support__header">
        <div>
          <h1 className="support__title">Soporte y Consultoría</h1>
          <p className="support__subtitle">Abre casos, consulta su estado y chatea con soporte.</p>
        </div>
        <div className="support__actions">
          <button className="btn btn--primary" onClick={() => setNewOpen(true)}>
            Nuevo ticket
          </button>
        </div>
      </header>

      {view === "list" ? (
        <TicketsList filters={filters} setFilters={setFilters} onOpen={openTicket} />
      ) : (
        <TicketDetail id={activeId} onBack={goList} />
      )}

      {newOpen && (
        <NewTicketModal
          onClose={() => setNewOpen(false)}
          onCreated={(id) => {
            setNewOpen(false);
            openTicket(id);
          }}
        />
      )}
    </div>
  );
}
