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
    </footer>
  );
}
