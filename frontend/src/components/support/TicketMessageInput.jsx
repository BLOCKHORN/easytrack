import { useRef, useState } from "react";

export default function TicketMessageInput({ disabled, onSend }) {
  const [text, setText] = useState("");
  const [files, setFiles] = useState([]);
  const fileRef = useRef(null);

  function pickFiles() { fileRef.current?.click(); }
  function onFiles(e) {
    const list = Array.from(e.target.files || []);
    setFiles((arr) => [...arr, ...list].slice(0, 6));
    e.target.value = "";
  }
  function removeFile(i) { setFiles((arr) => arr.filter((_, idx) => idx !== i)); }

  async function submit() {
    const clean = (text ?? "").trim();
    if (!clean && files.length === 0) return;
    // Enviar con las claves canónicas que espera el handler del detalle
    await onSend({ text: clean, files });
    setText("");
    setFiles([]);
  }

  function onKey(e) {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault(); submit();
    }
  }

  return (
    <div className="msgbox">
      <textarea
        placeholder="Escribe tu mensaje (Ctrl/⌘ + Enter para enviar)"
        value={text}
        onChange={(e)=>setText(e.target.value)}
        onKeyDown={onKey}
        disabled={disabled}
      />
      {files.length>0 && (
        <div className="msgbox__files">
          {files.map((f, i) => (
            <div key={i} className="chip">
              <span className="name">{f.name}</span>
              <button onClick={()=>removeFile(i)} aria-label="Eliminar adjunto">×</button>
            </div>
          ))}
        </div>
      )}
      <div className="msgbox__actions">
        <input ref={fileRef} type="file" multiple onChange={onFiles} hidden />
        <button className="btn" onClick={pickFiles}>Adjuntar</button>
        <div className="grow" />
        <button className="btn btn--primary" onClick={submit} disabled={disabled}>Enviar</button>
      </div>
    </div>
  );
}
