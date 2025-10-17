import { useState } from "react";
import { createTicket } from "../../services/ticketsService.js";

export default function NewTicketModal({ onClose, onCreated }) {
  const [tipo, setTipo] = useState("incidencia");
  const [asunto, setAsunto] = useState("");
  const [desc, setDesc] = useState("");
  const [files, setFiles] = useState([]);
  const [sending, setSending] = useState(false);

  async function submit() {
    if (!desc.trim() && !asunto.trim()) return;
    setSending(true);
    try {
      const t = await createTicket({ tipo, asunto: asunto.trim(), descripcion: desc.trim(), files });
      onCreated?.(t.id);
    } finally { setSending(false); }
  }

  return (
    <div className="modal" role="dialog" aria-modal="true">
      <div className="modal__panel">
        <header className="modal__hdr">
          <h3>Nuevo ticket</h3>
          <button className="icon" onClick={onClose} aria-label="Cerrar">×</button>
        </header>
        <div className="modal__body">
          <div className="grid">
            <div className="field">
              <label>Tipo</label>
              <select value={tipo} onChange={(e)=>setTipo(e.target.value)}>
                <option value="incidencia">Incidencia</option>
                <option value="mejora">Mejora</option>
                <option value="consultoria">Consultoría</option>
              </select>
            </div>
            <div className="field field--grow">
              <label>Asunto</label>
              <input value={asunto} onChange={(e)=>setAsunto(e.target.value)} placeholder="Resumen breve" />
            </div>
          </div>
          <div className="field">
            <label>Descripción</label>
            <textarea rows={6} value={desc} onChange={(e)=>setDesc(e.target.value)} placeholder="Describe el caso con detalle" />
          </div>
          <div className="field">
            <label>Adjuntos (opcional)</label>
            <input type="file" multiple onChange={(e)=>setFiles(Array.from(e.target.files||[]))} />
            {files?.length>0 && (
              <ul className="attached">
                {files.map((f,i)=>(<li key={i}>{f.name}</li>))}
              </ul>
            )}
          </div>
        </div>
        <footer className="modal__ftr">
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn btn--primary" onClick={submit} disabled={sending}>Crear ticket</button>
        </footer>
      </div>
    </div>
  );
}
