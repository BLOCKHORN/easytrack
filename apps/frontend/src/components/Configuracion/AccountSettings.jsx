import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "../../utils/supabaseClient";

const IconKey = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>;
const IconShield = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
const IconEye = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>;
const IconEyeOff = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61M2 2l20 20"/></svg>;
const IconSpinner = () => <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>;
const IconLaptop = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="2" y1="20" x2="22" y2="20"/></svg>;
const IconPhone = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>;
const IconEdit = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const IconTrash = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>;
const IconCheck = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const IconX = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const IconAlert = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;

async function reauthWithPassword(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data?.session;
}

export async function applyEmailDraft({ currentEmail, nextEmail }) {
  if (!nextEmail || nextEmail === currentEmail) return { ok: true };
  const pwd = window.prompt("Confirma tu contraseña para cambiar el email:");
  if (!pwd) return { error: new Error("Operación cancelada por el usuario") };
  await reauthWithPassword(currentEmail, pwd);
  const { error } = await supabase.auth.updateUser({ email: nextEmail });
  if (error) return { error };
  return { ok: true, notice: "Te hemos enviado un correo de confirmación. El cambio se aplicará cuando lo confirmes." };
}

export async function applyPasswordDraft({ currentEmail, pwd1, pwd2 }) {
  if (!pwd1 && !pwd2) return { ok: true };
  if (!pwd1 || !pwd2) return { error: new Error("Rellena ambos campos de contraseña.") };
  if (pwd1.length < 8) return { error: new Error("La contraseña debe tener al menos 8 caracteres.") };
  if (pwd1 !== pwd2) return { error: new Error("Las contraseñas no coinciden.") };

  const pwd = window.prompt("Introduce tu contraseña actual:");
  if (!pwd) return { error: new Error("Operación cancelada por el usuario") };
  await reauthWithPassword(currentEmail, pwd);
  const { error } = await supabase.auth.updateUser({ password: pwd1 });
  if (error) return { error };
  return { ok: true, notice: "Contraseña actualizada correctamente." };
}

const isValidEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v).trim());

function scorePassword(pwd) {
  let score = 0; if (!pwd) return { score: 0, label: "Muy débil" };
  const len = pwd.length, hasLower = /[a-z]/.test(pwd), hasUpper = /[A-Z]/.test(pwd), hasDigit = /[0-9]/.test(pwd), hasSymb = /[^A-Za-z0-9]/.test(pwd);
  score += Math.min(len, 12) + (hasLower ? 2 : 0) + (hasUpper ? 3 : 0) + (hasDigit ? 3 : 0) + (hasSymb ? 4 : 0);
  const pct = Math.min(100, Math.round((score / 24) * 100));
  const label = pct >= 75 ? "Fuerte" : pct >= 50 ? "Media" : pct >= 25 ? "Débil" : "Muy débil";
  return { score: pct, label };
}

const strengthClass = (label) => label === "Fuerte" ? "bg-emerald-500" : label === "Media" ? "bg-amber-500" : label === "Débil" ? "bg-orange-500" : "bg-red-500";

const parseDevice = (ua) => {
  if (!ua) return "Terminal Nuevo";
  let os = "Dispositivo";
  if (/Android/i.test(ua)) os = "Android";
  else if (/iPhone/i.test(ua)) os = "iPhone";
  else if (/iPad/i.test(ua)) os = "iPad";
  else if (/Windows/i.test(ua)) os = "Windows PC";
  else if (/Mac OS X|Macintosh/i.test(ua)) os = "Mac";
  else if (/CrOS/i.test(ua)) os = "Chrome OS";
  else if (/Linux/i.test(ua)) os = "Linux";

  let browser = "";
  if (/Edg/i.test(ua)) browser = "Edge";
  else if (/OPR|Opera/i.test(ua)) browser = "Opera";
  else if (/Firefox/i.test(ua)) browser = "Firefox";
  else if (/Chrome/i.test(ua)) browser = "Chrome";
  else if (/Safari/i.test(ua)) browser = "Safari";

  if (browser) return `${os} • ${browser}`;
  return os;
};

const CustomModal = ({ isOpen, title, message, onConfirm, onCancel, confirmText = "Confirmar", danger = false }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl border border-zinc-200 w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${danger ? 'bg-red-100 text-red-600' : 'bg-brand-100 text-brand-600'}`}>
              <IconAlert />
            </div>
            <h3 className="text-base font-black text-zinc-900 tracking-tight">{title}</h3>
          </div>
          <p className="text-sm font-medium text-zinc-500 leading-relaxed pl-13">
            {message}
          </p>
        </div>
        <div className="px-6 py-4 bg-zinc-50 border-t border-zinc-100 flex gap-3 justify-end">
          <button onClick={onCancel} className="px-4 py-2 text-xs font-black text-zinc-600 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-100 uppercase tracking-widest transition-colors">
            Cancelar
          </button>
          <button onClick={onConfirm} className={`px-4 py-2 text-xs font-black rounded-lg uppercase tracking-widest transition-colors shadow-sm ${danger ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-zinc-950 text-white hover:bg-zinc-800'}`}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default function AccountSettings({ usuario = null, onDraftChange }) {
  const [user, setUser] = useState(usuario);
  const [loading, setLoading] = useState(!usuario);
  const [signingOutOthers, setSigningOutOthers] = useState(false);

  const [emailDraft, setEmailDraft] = useState(usuario?.email || "");
  const [emailMsg, setEmailMsg] = useState("");

  const [pwd1, setPwd1] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [pwdMsg, setPwdMsg] = useState("");
  const [showPwd1, setShowPwd1] = useState(false);
  const [showPwd2, setShowPwd2] = useState(false);

  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [editingSession, setEditingSession] = useState(null);
  const [editName, setEditName] = useState("");

  const [modalConfig, setModalConfig] = useState({ isOpen: false, title: "", message: "", onConfirm: null, danger: false, confirmText: "" });

  const pwdStrength = useMemo(() => scorePassword(pwd1), [pwd1]);
  const pwdStrengthCls = strengthClass(pwdStrength.label);

  const provider = useMemo(() => user?.app_metadata?.provider || user?.identities?.[0]?.provider || "email", [user]);

  const loadSessions = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    let currentId = null;
    if (session?.access_token) {
      try {
        const payload = JSON.parse(atob(session.access_token.split('.')[1]));
        currentId = payload.session_id;
        setCurrentSessionId(currentId);
      } catch (e) {}
    }

    const { data } = await supabase.rpc("get_my_active_sessions");
    if (data) setSessions(data);
  };

  useEffect(() => {
    let mounted = true;
    if (!usuario) {
      (async () => {
        const { data } = await supabase.auth.getUser();
        if (mounted) {
          setUser(data?.user || null);
          setEmailDraft(data?.user?.email || "");
          setLoading(false);
        }
      })();
    } else {
      setUser(usuario);
      setLoading(false);
    }
    loadSessions();
    return () => { mounted = false; };
  }, [usuario]);

  useEffect(() => {
    onDraftChange?.({ emailDraft, pwd1, pwd2, provider });
    setEmailMsg(() => (!emailDraft || emailDraft === (user?.email || "") || isValidEmail(emailDraft)) ? "" : "Introduce un email válido.");
    setPwdMsg(() => {
      if (!pwd1 && !pwd2) return "";
      if (pwd1 && pwd1.length < 8) return "La contraseña debe tener al menos 8 caracteres.";
      if (pwd1 !== pwd2) return "Las contraseñas no coinciden.";
      return "";
    });
  }, [emailDraft, pwd1, pwd2, provider, user?.email, onDraftChange]);

  const handleSaveName = async (sessionId) => {
    if (!editName.trim()) {
      setEditingSession(null);
      return;
    }
    await supabase.from("device_names").upsert({
      session_id: sessionId,
      user_id: user.id,
      custom_name: editName.trim()
    });
    setEditingSession(null);
    loadSessions();
  };

  const requestKillSession = (sessionId) => {
    const isCurrent = sessionId === currentSessionId;
    setModalConfig({
      isOpen: true,
      title: isCurrent ? "Destruir sesión actual" : "Revocar dispositivo",
      message: isCurrent 
        ? "Cerrarás la sesión en este dispositivo y tendrás que volver a loguearte. ¿Proceder?" 
        : "Este dispositivo perderá el acceso inmediatamente hasta que vuelvas a iniciar sesión en él.",
      danger: true,
      confirmText: "Revocar Acceso",
      onConfirm: async () => {
        setModalConfig({ ...modalConfig, isOpen: false });
        await supabase.rpc("kill_my_session", { target_session_id: sessionId });
        if (isCurrent) {
          await supabase.auth.signOut();
          window.location.reload();
        } else {
          loadSessions();
        }
      }
    });
  };

  const requestSignOutOthers = () => {
    setModalConfig({
      isOpen: true,
      title: "Cerrar otras sesiones",
      message: "Se revocará el acceso de todos los dispositivos excepto el que estás utilizando ahora mismo.",
      danger: true,
      confirmText: "Cerrar Sesiones",
      onConfirm: async () => {
        setModalConfig({ ...modalConfig, isOpen: false });
        setSigningOutOthers(true);
        try {
          const { error } = await supabase.auth.signOut({ scope: 'others' });
          if (error) throw error;
          await loadSessions();
        } catch (err) {
          alert(err.message);
        } finally {
          setSigningOutOthers(false);
        }
      }
    });
  };

  if (loading) return null;

  return (
    <>
      <CustomModal 
        isOpen={modalConfig.isOpen} 
        title={modalConfig.title} 
        message={modalConfig.message} 
        danger={modalConfig.danger}
        confirmText={modalConfig.confirmText}
        onConfirm={modalConfig.onConfirm} 
        onCancel={() => setModalConfig({ ...modalConfig, isOpen: false })} 
      />

      <div className="space-y-6 max-w-4xl mx-auto pb-12">
        
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
          <div className="border-b border-zinc-100 px-6 py-5 flex items-center justify-between bg-zinc-50/50">
            <div>
              <h2 className="text-base font-black text-zinc-900 tracking-tight">Identidad y Credenciales</h2>
              <p className="text-[13px] font-bold text-zinc-500 mt-0.5">Gestiona tu método de acceso al sistema.</p>
            </div>
            <div className="w-10 h-10 bg-white border border-zinc-200 rounded-xl flex items-center justify-center text-zinc-700 shadow-sm shrink-0">
              <IconKey />
            </div>
          </div>

          <div className="p-6 md:p-8 space-y-8">
            <div className="max-w-xl">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 block">Correo de Acceso (Login)</label>
              <input 
                type="email" value={emailDraft} onChange={(e)=>setEmailDraft(e.target.value)} disabled={provider !== "email"}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none font-bold text-sm text-zinc-900 transition-all disabled:opacity-60"
              />
              {emailMsg && <p className="text-xs font-bold text-red-500 mt-2">{emailMsg}</p>}
              {provider !== "email" && (
                 <p className="text-[11px] font-bold text-zinc-500 mt-3 bg-zinc-100 p-2.5 rounded-lg border border-zinc-200 inline-block">
                   Tu cuenta está vinculada mediante <strong>{provider.toUpperCase()}</strong>.
                 </p>
              )}
            </div>

            {provider === "email" && (
              <div className="max-w-2xl pt-6 border-t border-zinc-100">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 block">Seguridad de la Contraseña</label>
                <div className="flex flex-col md:flex-row gap-4 mb-4">
                  <div className="flex-1 relative">
                    <input type={showPwd1 ? "text" : "password"} value={pwd1} onChange={e=>setPwd1(e.target.value)} placeholder="Nueva contraseña" className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none font-bold text-sm text-zinc-900 pr-12 transition-all" />
                    <button onClick={() => setShowPwd1(!showPwd1)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 transition-colors">
                      {showPwd1 ? <IconEyeOff /> : <IconEye />}
                    </button>
                  </div>
                  <div className="flex-1 relative">
                    <input type={showPwd2 ? "text" : "password"} value={pwd2} onChange={e=>setPwd2(e.target.value)} placeholder="Repetir contraseña" className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none font-bold text-sm text-zinc-900 pr-12 transition-all" />
                    <button onClick={() => setShowPwd2(!showPwd2)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 transition-colors">
                      {showPwd2 ? <IconEyeOff /> : <IconEye />}
                    </button>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-zinc-100 rounded-full h-1.5 overflow-hidden">
                    <div className={`h-full transition-all duration-300 ${pwdStrengthCls}`} style={{ width: `${pwdStrength.score}%` }} />
                  </div>
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest min-w-[60px] text-right">{pwdStrength.label}</span>
                </div>
                
                {pwdMsg && <p className="text-xs font-bold text-red-500 mt-3">{pwdMsg}</p>}
                
                {(pwd1 || pwd2 || (emailDraft && emailDraft !== user?.email)) && (
                  <div className="mt-5 text-[11px] font-black text-brand-600 bg-brand-50 px-3 py-2 rounded-lg border border-brand-200 uppercase tracking-widest inline-flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
                    Cambios pendientes de guardar
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
          <div className="border-b border-zinc-100 px-6 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-50/50">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-zinc-950 text-white rounded-xl flex items-center justify-center shadow-md shrink-0">
                <IconShield />
              </div>
              <div>
                <h2 className="text-base font-black text-zinc-900 tracking-tight">Auditoría de Sesiones</h2>
                <p className="text-[13px] font-bold text-zinc-500 mt-0.5">Renombra o revoca el acceso de los terminales activos.</p>
              </div>
            </div>
            <button 
              onClick={requestSignOutOthers} 
              disabled={signingOutOthers}
              className="shrink-0 px-4 py-2.5 bg-zinc-950 text-white disabled:bg-zinc-200 disabled:text-zinc-500 hover:bg-zinc-800 font-black text-[10px] uppercase tracking-widest rounded-lg transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
            >
              {signingOutOthers ? <IconSpinner /> : 'Revocar Otros Accesos'}
            </button>
          </div>

          <div className="divide-y divide-zinc-100">
            {sessions.length === 0 ? (
              <div className="p-8 text-center text-sm font-bold text-zinc-400">Cargando sesiones...</div>
            ) : (
              sessions.map(s => {
                const isCurrent = s.session_id === currentSessionId;
                const defaultName = parseDevice(s.user_agent);
                const isMobile = /Mobile|Android|iPhone|iPad/i.test(s.user_agent);

                return (
                  <div key={s.session_id} className={`flex flex-col sm:flex-row sm:items-center justify-between p-6 transition-colors ${isCurrent ? 'bg-zinc-50/80 border-l-[3px] border-l-brand-500' : 'hover:bg-zinc-50/50 border-l-[3px] border-l-transparent'}`}>
                    <div className="flex items-center gap-4 mb-4 sm:mb-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isCurrent ? 'bg-brand-100 text-brand-600' : 'bg-zinc-100 text-zinc-500'}`}>
                        {isMobile ? <IconPhone /> : <IconLaptop />}
                      </div>
                      <div className="flex flex-col">
                        {editingSession === s.session_id ? (
                          <div className="flex items-center gap-2 mb-1">
                            <input 
                              type="text" 
                              value={editName} 
                              onChange={e => setEditName(e.target.value)} 
                              onKeyDown={e => e.key === 'Enter' && handleSaveName(s.session_id)}
                              className="px-2.5 py-1 text-sm font-bold bg-white border border-brand-300 rounded-md outline-none focus:ring-2 focus:ring-brand-500/20 w-full max-w-[220px]"
                              autoFocus
                              placeholder="Ej: PC Recepción..."
                            />
                            <button onClick={() => handleSaveName(s.session_id)} className="w-6 h-6 flex items-center justify-center bg-brand-500 text-white rounded-md hover:bg-brand-600 transition-colors"><IconCheck /></button>
                            <button onClick={() => setEditingSession(null)} className="w-6 h-6 flex items-center justify-center bg-zinc-200 text-zinc-600 rounded-md hover:bg-zinc-300 transition-colors"><IconX /></button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-sm font-black text-zinc-900">{s.custom_name || defaultName}</span>
                            <button 
                              onClick={() => { setEditingSession(s.session_id); setEditName(s.custom_name || defaultName); }} 
                              className="text-zinc-400 hover:text-brand-500 transition-colors"
                              title="Renombrar terminal"
                            >
                              <IconEdit />
                            </button>
                            {isCurrent && (
                              <span className="flex items-center gap-1.5 ml-2 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-600 text-[9px] font-black uppercase tracking-widest">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Sesión Actual
                              </span>
                            )}
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-500">
                          <span>IP: {s.ip_address}</span>
                          <span className="text-zinc-300">•</span>
                          <span>{new Date(s.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => requestKillSession(s.session_id)} 
                      className="group flex items-center justify-center sm:w-10 sm:h-10 py-2 sm:py-0 text-zinc-400 hover:text-white hover:bg-red-600 sm:rounded-xl rounded-lg border border-zinc-200 hover:border-red-600 sm:border-transparent transition-all shrink-0"
                      title={isCurrent ? "Cerrar tu sesión actual" : "Revocar este dispositivo"}
                    >
                      <span className="sm:hidden text-xs font-bold mr-2 text-zinc-600 group-hover:text-white">Cerrar Sesión</span>
                      <IconTrash />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </>
  );
}