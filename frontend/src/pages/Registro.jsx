// src/pages/Registro.jsx
// Requiere: npm i @doncicuto/es-provinces @doncicuto/es-municipalities i18n-iso-countries
import { useEffect, useMemo, useRef, useState } from 'react';
import { useModal } from '../context/ModalContext';
import countriesISO from 'i18n-iso-countries';
import esLocale from 'i18n-iso-countries/langs/es.json';
import '../styles/registro.scss';

countriesISO.registerLocale(esLocale);

const API = (import.meta.env.VITE_API_URL || 'http://localhost:3001').replace(/\/$/,'');

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRe = /^[0-9+()\-\s]{7,}$/;
const cifRe   = /^[A-Za-z0-9\-]{8,15}$/;
const zipRe   = /^[A-Za-z0-9\- ]{3,10}$/;

const norm = (s='') => s.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase();

/* ---------- Fallback ciudades (Nominatim, ES) ---------- */
async function searchCitiesFallback({ q, country = 'España', province = '' }) {
  const query = [q, province, country].filter(Boolean).join(', ');
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=20&accept-language=es&q=${encodeURIComponent(query)}`;
  try {
    const r = await fetch(url, { headers: { 'Accept':'application/json' } });
    const arr = await r.json();
    if (!Array.isArray(arr)) return [];
    return arr
      .map(x => x?.address?.city || x?.address?.town || x?.address?.village || x?.address?.municipality || '')
      .filter(Boolean)
      .filter((v, i, a) => a.indexOf(v) === i);
  } catch {
    return [];
  }
}

/* ---------- Carga dinámica de provincias y municipios (INE) ---------- */
async function loadESProvinces() {
  const mod = await import('@doncicuto/es-provinces');
  const arr = mod.default || mod || [];
  const mapES = {
    'Alicante/Alacant':'Alicante', 'Castellón/Castelló':'Castellón', 'València/Valencia':'Valencia',
    'Gipuzkoa':'Guipúzcoa', 'Bizkaia':'Vizcaya', 'Araba/Álava':'Álava', 'Illes Balears':'Islas Baleares',
    'Girona':'Gerona', 'Lleida':'Lérida', 'Ourense':'Orense'
  };
  // ↙️ Devolvemos ya ordenadas alfabéticamente en español (sensibilidad base para tildes)
  return arr
    .map(p => ({ ...p, name: mapES[p.name] || p.name }))
    .sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
}

async function makeESCityProvider() {
  try {
    const [provMod, muniMod] = await Promise.all([
      import('@doncicuto/es-provinces'),
      import('@doncicuto/es-municipalities')
    ]);
    const provinces = (provMod.default || provMod || []).map(p => ({ ...p, _norm: norm(p.name) }));
    const munis = muniMod.default || muniMod || [];

    const byProv = new Map();
    for (const m of munis) {
      const provCode = String(m.code || '').slice(0,2);
      const list = byProv.get(provCode) || [];
      const display = String(m.name || '').split('/')[0].trim();
      if (display) list.push(display);
      byProv.set(provCode, list);
    }
    for (const [k, list] of byProv.entries()) {
      const uniq = Array.from(new Set(list)).sort((a,b) => a.localeCompare(b, 'es'));
      byProv.set(k, uniq);
    }

    const nameToCode = new Map();
    for (const p of provinces) nameToCode.set(p.name, p.code);

    return async function listCities({ q, province }) {
      const code = nameToCode.get(province);
      if (!code) return [];
      const list = byProv.get(code) || [];
      if (!q || q.trim().length < 2) return list.slice(0, 20);
      const qn = norm(q);
      return list.filter(n => norm(n).includes(qn)).slice(0, 20);
    };
  } catch {
    return null; // fallback a Nominatim
  }
}

/* ---------- Envío de solicitud ---------- */
async function submitDemoRequest(payload) {
  const res = await fetch(`${API}/api/demo/requests`, {
    method: 'POST',
    headers: { 'Content-Type':'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.error || `HTTP ${res.status}`);
    err.code = data?.code;
    err.issues = data?.issues || null;
    throw err;
  }
  return data;
}

/* ---------- Autocomplete de ciudad ---------- */
function CityAutocomplete({ value, onChange, required, disabled, provider, countryName, province }) {
  const [q, setQ] = useState(value || '');
  const [list, setList] = useState([]);
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(-1);
  const [busy, setBusy] = useState(false);
  const tRef = useRef(null);

  useEffect(() => { setQ(value || ''); }, [value]);

  async function refresh(query) {
    if (disabled || !province || !query || query.trim().length < 2) {
      setList([]); setOpen(false); return;
    }
    setBusy(true);
    let cities = [];
    if (provider) cities = await provider({ q: query, province });
    else cities = await searchCitiesFallback({ q: query, province, country: countryName || 'España' });
    setList(cities);
    setOpen(true);
    setBusy(false);
  }

  function handleChange(val) {
    setQ(val);
    onChange?.(val);
    setHi(-1);
    if (tRef.current) clearTimeout(tRef.current);
    tRef.current = setTimeout(() => refresh(val), 160);
  }

  function selectItem(name) {
    onChange?.(name);
    setQ(name); setList([]); setOpen(false);
  }

  function onKeyDown(e) {
    if (!open || !list.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setHi(h => Math.min(list.length - 1, h + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi(h => Math.max(0, h - 1)); }
    else if (e.key === 'Enter' && hi >= 0) { e.preventDefault(); selectItem(list[hi]); }
    else if (e.key === 'Escape') setOpen(false);
  }

  return (
    <div className="city-ac">
      <input
        type="text"
        required={required}
        placeholder={disabled ? "Selecciona país y provincia primero" : "Ciudad / Localidad"}
        disabled={disabled}
        value={q}
        onChange={e => handleChange(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={() => { if (list.length) setOpen(true); }}
        onBlur={() => { setTimeout(() => setOpen(false), 120); onChange?.(q.trim()); }}
        autoComplete="off"
      />
      {busy && <div className="ac-spinner" aria-hidden="true" />}
      {open && (
        <ul className="ac-list" role="listbox">
          {list.length ? list.map((name, idx) => (
            <li
              key={`${name}-${idx}`}
              role="option"
              aria-selected={idx===hi}
              className={idx===hi ? 'hi' : ''}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setHi(idx)}
              onClick={() => selectItem(name)}
            >
              <span className="t">{name}</span>
              <span className="s">{province}</span>
            </li>
          )) : <li className="empty">Empieza a escribir (mín. 2 letras)</li>}
        </ul>
      )}
    </div>
  );
}

/* ---------- Selector volumen ---------- */
function VolumeSelect({ value, onChange }) {
  const OPTIONS = [
    { value: 'lt_200',   label: 'Menos de 200' },
    { value: '200_400',  label: '200 – 400' },
    { value: '400_600',  label: '400 – 600' },
    { value: '600_800',  label: '600 – 800' },
    { value: '800_1000', label: '800 – 1000' },
    { value: 'gt_1000',  label: 'Más de 1000' },
  ];

  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(-1);
  const rootRef = useRef(null);
  const btnRef = useRef(null);

  const selected = OPTIONS.find(o => o.value === value) || null;

  useEffect(() => {
    const onDoc = (e) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  function toggleOpen() {
    setOpen(o => {
      const next = !o;
      if (next) {
        const idx = Math.max(0, OPTIONS.findIndex(o => o.value === value));
        setHi(idx);
      }
      return next;
    });
  }

  function selectIdx(i) {
    const opt = OPTIONS[i];
    if (!opt) return;
    onChange?.(opt.value);
    setOpen(false);
    btnRef.current?.focus({ preventScroll: true });
  }

  function onKeyDown(e) {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleOpen();
      }
      return;
    }
    if (e.key === 'ArrowDown') { e.preventDefault(); setHi(h => Math.min(OPTIONS.length - 1, h + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi(h => Math.max(0, h - 1)); }
    else if (e.key === 'Home') { e.preventDefault(); setHi(0); }
    else if (e.key === 'End') { e.preventDefault(); setHi(OPTIONS.length - 1); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectIdx(hi >= 0 ? hi : 0); }
    else if (e.key === 'Escape') { e.preventDefault(); setOpen(false); btnRef.current?.focus({ preventScroll: true }); }
  }

  function clearSelection(e) {
    e.stopPropagation();
    onChange?.('');
    btnRef.current?.focus({ preventScroll: true });
  }

  return (
    <div className={`nice-select ${open ? 'is-open' : ''}`} ref={rootRef}>
      <button
        type="button"
        ref={btnRef}
        className="ns-control"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls="ns-pop"
        onClick={toggleOpen}
        onKeyDown={onKeyDown}
      >
        <span className={`ns-value ${selected ? '' : 'is-placeholder'}`}>
          {selected ? selected.label : 'Selecciona un rango (opcional)'}
        </span>
        {selected ? (
          <span className="ns-clear" onClick={clearSelection} aria-label="Limpiar selección" title="Limpiar">×</span>
        ) : null}
        <span className="ns-caret" aria-hidden>▾</span>
      </button>

      {open && (
        <div id="ns-pop" role="listbox" className="ns-pop" tabIndex={-1}>
          <ul className="ns-list">
            {OPTIONS.map((opt, i) => {
              const sel = opt.value === value;
              const hit = i === hi;
              return (
                <li
                  key={opt.value}
                  role="option"
                  aria-selected={sel}
                  className={`ns-item ${sel ? 'is-selected' : ''} ${hit ? 'is-hi' : ''}`}
                  onMouseEnter={() => setHi(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selectIdx(i)}
                >
                  <span className="ns-text">{opt.label}</span>
                  {sel ? <span className="ns-check">✓</span> : null}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

/* --------------------------------- Página --------------------------------- */
export default function Registro() {
  const { openLogin } = useModal(); // modal de login

  // Obligatorios
  const [fullName,   setFullName]   = useState('');
  const [email,      setEmail]      = useState('');
  const [phone,      setPhone]      = useState('');
  const [company,    setCompany]    = useState('');
  const [cif,        setCif]        = useState('');
  const [address,    setAddress]    = useState('');
  const [postalCode, setPostalCode] = useState('');

  const [countryCode, setCountryCode] = useState('ES');
  const [province,    setProvince]    = useState('');
  const [city,        setCity]        = useState('');

  const [volumeBand, setVolumeBand] = useState(''); // opcional

  const [terms,   setTerms]   = useState(true);
  const [website, setWebsite] = useState(''); // honeypot

  const [loading, setLoading] = useState(false);
  const [tried,   setTried]   = useState(false);

  // errores por campo (devueltos por backend)
  const [fieldErrs, setFieldErrs] = useState({}); // { email:'...' , province:'...' ... }

  // Toast
  const [toast, setToast] = useState({ show:false, kind:'ok', text:'' });
  const showToast = (text, kind='ok', ms=2800) => {
    setToast({ show:true, kind, text });
    if (showToast._t) window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast({ show:false, kind, text:'' }), ms);
  };

  // Países (español)
  const countriesOptions = useMemo(() => {
    const names = countriesISO.getNames('es', { select: 'official' }) || {};
    return Object.entries(names)
      .map(([iso2, label]) => ({ value: iso2, label }))
      .sort((a,b) => a.label.localeCompare(b.label, 'es'));
  }, []);

  // Provincias y proveedor de ciudades para ES
  const [esProvinces, setEsProvinces] = useState([]);
  const [esCityProvider, setEsCityProvider] = useState(null);

  useEffect(() => {
    (async () => {
      if (countryCode === 'ES') {
        try {
          const provs = await loadESProvinces(); // ya vienen ordenadas
          setEsProvinces(provs);
          const provider = await makeESCityProvider();
          setEsCityProvider(() => provider);
        } catch {
          setEsProvinces([]);
          setEsCityProvider(null);
        }
      } else {
        setEsProvinces([]);
        setEsCityProvider(null);
      }
    })();
  }, [countryCode]);

  useEffect(() => { setProvince(''); setCity(''); }, [countryCode]);
  useEffect(() => { setCity(''); }, [province]);

  const v = {
    fullName:   fullName.trim().length >= 3,
    email:      emailRe.test(email),
    phone:      phoneRe.test(phone),
    company:    company.trim().length >= 2,
    cif:        cifRe.test(cif),
    address:    address.trim().length >= 5,
    country:    !!countryCode,
    province:   countryCode !== 'ES' ? true : !!province,
    city:       countryCode !== 'ES' ? true : !!city,
    postalCode: zipRe.test(postalCode),
    terms:      !!terms,
  };
  const allValid = Object.values(v).every(Boolean);

  function firstInvalidSelector() {
    return (
      '.reg-card .is-invalid,' +
      '.reg-card [aria-invalid="true"],' +
      '.reg-card input[required]:invalid,' +
      '.reg-card select[required]:invalid'
    );
  }

  async function onSubmit(e) {
    e.preventDefault();
    setFieldErrs({});
    if (website) { setTried(true); showToast('Error de validación', 'err'); return; }
    if (!allValid) {
      setTried(true);
      showToast('Revisa los campos obligatorios.', 'err');
      setTimeout(() => {
        document.querySelector(firstInvalidSelector())?.scrollIntoView({ behavior:'smooth', block:'center' });
      }, 30);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        company_name: company.trim(),
        cif: cif.trim(),
        address: address.trim(),
        country_code: countryCode,
        country_name: countriesISO.getName(countryCode, 'es') || countryCode,
        province: countryCode === 'ES' ? province : '',
        city: countryCode === 'ES' ? city : '',
        postal_code: postalCode.trim(),
        declared_monthly_volume_band: volumeBand || null,
        source: 'landing_registro_demo',
        tos_accepted: !!terms,
        website, // honeypot
      };

      const res = await submitDemoRequest(payload);

      // éxito -> guardamos email; reseteamos parte del formulario
      try { localStorage.setItem('signup_email', email); } catch {}
      showToast(res?.message || 'Solicitud enviada. La revisaremos en breve.', 'ok', 4200);

      setTried(false);
      setFieldErrs({});
      setCompany('');
      setCif('');
      setAddress('');
      setPostalCode('');
      // province/city se quedan por si quiere corregir algo
    } catch (e2) {
      if (e2.code === 'VALIDATION_ERROR' && Array.isArray(e2.issues)) {
        const map = {};
        for (const it of e2.issues) {
          if (it.path) map[it.path] = it.message || 'Campo inválido';
        }
        setFieldErrs(map);
        showToast('Revisa los campos marcados.', 'err');
        setTimeout(() => {
          document.querySelector(firstInvalidSelector())?.scrollIntoView({ behavior:'smooth', block:'center' });
        }, 30);
      } else if (e2.code === 'ALREADY_EXISTS') {
        showToast('Ya hay una solicitud pendiente para este email.', 'warn');
      } else {
        showToast(e2.message || 'No se pudo enviar la solicitud.', 'err');
      }
    } finally {
      setLoading(false);
    }
  }

  const countryName = useMemo(() => countriesISO.getName(countryCode, 'es') || countryCode, [countryCode]);

  return (
    <div className="reg-shell">
      {/* TOAST */}
      {toast.show && (
        <div className={`toast toast--${toast.kind}`} role="status" aria-live="polite">
          {toast.text}
        </div>
      )}

      {/* HERO */}
      <aside className="reg-hero">
        <div className="hero-center">
          <header className="hero-head">
            <div className="logo-dot" />
            <span className="brand">EASYTRACK</span>
          </header>

          <h1 className="hero-title">Solicitar <span className="grad">DEMO</span></h1>
          <p className="hero-sub">
            Rellena el formulario para solicitar tu DEMO. Verificaremos que el negocio es real y te enviaremos
            por email el acceso al aprobarla.
          </p>

          <div className="hero-points">
            <div className="point">Verificación manual de negocio</div>
            <div className="point">Método selecto · Sin bots</div>
            <div className="point">Soporte humano cercano</div>
          </div>

          <div className="hero-anim">
            <div className="blob blob-a" />
            <div className="blob blob-b" />
            <div className="ribbon ribbon-1" />
            <div className="ribbon ribbon-2" />
          </div>
        </div>
      </aside>

      {/* CARD */}
      <main className="reg-card">
        <form onSubmit={onSubmit} noValidate>
          <div className="card-head">
            <h2>Solicitar DEMO</h2>
            <p>Rellena los datos de tu empresa. Te avisaremos por email.</p>
          </div>

          <div className="honeypot" aria-hidden="true">
            <label>Website
              <input type="text" value={website} onChange={e=>setWebsite(e.target.value)} tabIndex={-1} autoComplete="off"/>
            </label>
          </div>

          {/* Grid 2 col */}
          <div className="grid grid-2">
            <div className="field">
              <label>Nombre y Apellidos <span className="req">*</span></label>
              <input
                type="text"
                required
                value={fullName}
                onChange={e=>setFullName(e.target.value)}
                placeholder="Nombre Apellido"
                className={( (!fullName && tried) || fieldErrs.full_name ) ? 'is-invalid' : ''}
                aria-invalid={!!((!fullName && tried) || fieldErrs.full_name)}
              />
              {fieldErrs.full_name && <small className="err">{fieldErrs.full_name}</small>}
            </div>

            <div className="field">
              <label>Email <span className="req">*</span></label>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={e=>setEmail(e.target.value)}
                placeholder="tu@email.com"
                className={( (!emailRe.test(email) && tried) || fieldErrs.email ) ? 'is-invalid' : ''}
                aria-invalid={!!((!emailRe.test(email) && tried) || fieldErrs.email)}
              />
              {fieldErrs.email && <small className="err">{fieldErrs.email}</small>}
            </div>

            <div className="field">
              <label>Teléfono <span className="req">*</span></label>
              <input
                type="tel"
                autoComplete="tel"
                required
                value={phone}
                onChange={e=>setPhone(e.target.value)}
                placeholder="+34 600 000 000"
                className={( (!phoneRe.test(phone) && tried) || fieldErrs.phone ) ? 'is-invalid' : ''}
                aria-invalid={!!((!phoneRe.test(phone) && tried) || fieldErrs.phone)}
              />
              {fieldErrs.phone && <small className="err">{fieldErrs.phone}</small>}
            </div>

            <div className="field">
              <label>Nombre de la empresa <span className="req">*</span></label>
              <input
                type="text"
                required
                value={company}
                onChange={e=>setCompany(e.target.value)}
                placeholder="Mi Negocio S.L."
                className={( (!company && tried) || fieldErrs.company_name ) ? 'is-invalid' : ''}
                aria-invalid={!!((!company && tried) || fieldErrs.company_name)}
              />
              {fieldErrs.company_name && <small className="err">{fieldErrs.company_name}</small>}
            </div>

            <div className="field">
              <label>CIF <span className="req">*</span></label>
              <input
                type="text"
                required
                value={cif}
                onChange={e=>setCif(e.target.value.toUpperCase())}
                placeholder="B12345678"
                className={( (!cifRe.test(cif) && tried) || fieldErrs.cif ) ? 'is-invalid' : ''}
                aria-invalid={!!((!cifRe.test(cif) && tried) || fieldErrs.cif)}
              />
              {fieldErrs.cif && <small className="err">{fieldErrs.cif}</small>}
            </div>

            <div className="field">
              <label>Dirección <span className="req">*</span></label>
              <input
                type="text"
                required
                value={address}
                onChange={e=>setAddress(e.target.value)}
                placeholder="Calle, número, planta…"
                className={( (!address && tried) || fieldErrs.address ) ? 'is-invalid' : ''}
                aria-invalid={!!((!address && tried) || fieldErrs.address)}
              />
              {fieldErrs.address && <small className="err">{fieldErrs.address}</small>}
            </div>

            <div className="field">
              <label>País <span className="req">*</span></label>
              <select
                required
                value={countryCode}
                onChange={e => setCountryCode(e.target.value)}
                className={(!countryCode && tried) ? 'is-invalid' : ''}
                aria-invalid={!countryCode && tried}
              >
                {countriesOptions.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>

            <div className="field">
              <label>Provincia / Estado <span className="req">*</span></label>
              <select
                required={countryCode==='ES'}
                value={province}
                onChange={e => setProvince(e.target.value)}
                disabled={countryCode!=='ES'}
                className={( (countryCode==='ES' && !province && tried) || fieldErrs.province ) ? 'is-invalid' : ''}
                aria-invalid={!!((countryCode==='ES' && !province && tried) || fieldErrs.province)}
              >
                <option value="">{countryCode==='ES' ? 'Selecciona provincia' : 'Disponible para España'}</option>
                {countryCode === 'ES' && esProvinces.map(p => <option key={p.code} value={p.name}>{p.name}</option>)}
              </select>
              {fieldErrs.province && <small className="err">{fieldErrs.province}</small>}
            </div>

            <div className="field">
              <label>Ciudad / Localidad <span className="req">*</span></label>
              <CityAutocomplete
                required={countryCode==='ES'}
                disabled={countryCode!=='ES' || !province}
                provider={countryCode==='ES' ? esCityProvider : null}
                countryName={countriesISO.getName(countryCode, 'es') || countryCode}
                province={province}
                value={city}
                onChange={setCity}
              />
              {( (countryCode==='ES' && !city && tried) || fieldErrs.city ) && (
                <small className="err">{fieldErrs.city || 'Indica tu ciudad.'}</small>
              )}
            </div>

            <div className="field">
              <label>Código Postal <span className="req">*</span></label>
              <input
                type="text"
                required
                value={postalCode}
                onChange={e=>setPostalCode(e.target.value)}
                placeholder="28001"
                className={( (!zipRe.test(postalCode) && tried) || fieldErrs.postal_code ) ? 'is-invalid' : ''}
                aria-invalid={!!((!zipRe.test(postalCode) && tried) || fieldErrs.postal_code)}
              />
              {fieldErrs.postal_code && <small className="err">{fieldErrs.postal_code}</small>}
            </div>

            <div className="field" style={{ gridColumn: '1 / -1' }}>
              <label>¿Qué media de paquetes entregas al mes? <span className="muted">(opcional)</span></label>
              <VolumeSelect value={volumeBand} onChange={setVolumeBand} />
            </div>
          </div>

          <label className="checkline">
            <input type="checkbox" checked={terms} onChange={e=>setTerms(e.target.checked)} />
            <span>
              Acepto los <a href="/legal/terminos" target="_blank" rel="noreferrer">Términos y Condiciones</a> y la{' '}
              <a href="/legal/privacidad" target="_blank" rel="noreferrer">Política de Privacidad</a>.
            </span>
          </label>

          {/* Acciones */}
          <div className="form-actions-sticky">
            <button type="submit" className="cta" disabled={loading} aria-disabled={loading || !allValid}>
              {loading ? 'Enviando solicitud…' : 'Enviar solicitud'}
            </button>

            <button
              type="button"
              className="cta cta--dark"
              onClick={() => (typeof openLogin === 'function' ? openLogin() : window.__openLoginModal?.())}
            >
              ¿Ya tienes cuenta? Inicia sesión
            </button>

            <p className="tiny italic-note">
              Tras revisar la solicitud, recibirás un email con el enlace para acceder. Si no cumple los criterios,
              también te lo comunicaremos por correo.
            </p>
          </div>
        </form>
      </main>
    </div>
  );
}
