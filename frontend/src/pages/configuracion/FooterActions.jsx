import { useRef, useState, useCallback } from 'react';
import { MdSave, MdInfo, MdFileUpload, MdFileDownload } from 'react-icons/md';
import './FooterActions.scss';

export default function FooterActions({ guardando = false, onGuardar, onExport, onImport }) {
  const fileRef = useRef(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [lastFileName, setLastFileName] = useState('');

  const toggleAdvanced = () => setAdvancedOpen(v => !v);

  const triggerBrowse = () => fileRef.current?.click();

  const handleFile = useCallback((file) => {
    if (!file) return;
    setLastFileName(file.name);
    onImport?.(file);
    // limpiar el input para poder re-importar el mismo archivo si hace falta
    if (fileRef.current) fileRef.current.value = '';
  }, [onImport]);

  const onInputChange = (e) => handleFile(e.target.files?.[0]);

  const onDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    handleFile(file);
  };

  const onDragOver = (e) => {
    e.preventDefault(); e.stopPropagation(); setDragOver(true);
  };
  const onDragLeave = (e) => {
    e.preventDefault(); e.stopPropagation(); setDragOver(false);
  };

  return (
    <footer className="footer-actions" role="contentinfo" aria-live="polite">
      <div className="footer-actions__hint">
        <MdInfo aria-hidden /> Los cambios se aplican a informes y al grid de estantes.
      </div>

      <div className="footer-actions__right">
        <button className="btn btn--ghost" onClick={toggleAdvanced} aria-expanded={advancedOpen}>
          Opciones avanzadas
        </button>

        <button
          className="btn btn--lg btn--primary"
          onClick={onGuardar}
          disabled={guardando}
          aria-busy={guardando}
        >
          {guardando && <span className="spinner" aria-hidden />}
          <MdSave /> {guardando ? 'Guardando…' : 'Guardar configuración'}
        </button>
      </div>

      {/* Panel avanzado plegable */}
      <div className={`fa-advanced ${advancedOpen ? 'open' : ''}`} aria-hidden={!advancedOpen}>
        <div className="fa-advanced__grid">
          <section className="fa-block">
            <h5><MdFileDownload /> Exportar configuración</h5>
            <p>Descarga un archivo <code>.json</code> con tu configuración actual para guardarla o moverla a otro equipo.</p>
            <button className="btn btn--outline" onClick={onExport}>
              <MdFileDownload /> Exportar JSON
            </button>
          </section>

          <section className="fa-block">
            <h5><MdFileUpload /> Importar configuración</h5>
            <p>Arrastra aquí un archivo <code>.json</code> exportado anteriormente o pulsa para seleccionarlo.</p>

            <div
              className={`dropzone ${dragOver ? 'is-dragover' : ''}`}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onClick={triggerBrowse}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && triggerBrowse()}
              aria-label="Zona para arrastrar y soltar archivo .json"
            >
              <div className="dz-inner">
                <MdFileUpload aria-hidden />
                <span className="dz-text">
                  Arrastra el archivo aquí o <u>examinar</u>
                </span>
              </div>

              {lastFileName && (
                <div className="dz-file">Último archivo: <strong>{lastFileName}</strong></div>
              )}
            </div>

            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              className="sr-only"
              onChange={onInputChange}
              aria-label="Seleccionar archivo .json"
            />
          </section>
        </div>
      </div>
    </footer>
  );
}
