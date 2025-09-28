// src/utils/planIntent.js
const PLAN_KEY = 'preferred_plan';
const LOGIN_INTENT_KEY = 'login_intent';

export function savePlanIntent(code, source = 'pricing') {
  try {
    localStorage.setItem(PLAN_KEY, JSON.stringify({ code, source, ts: Date.now() }));
  } catch {}
}

export function readPlanIntent() {
  try {
    const raw = localStorage.getItem(PLAN_KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (obj && obj.code) return obj;
  } catch {}
  return null;
}

export function consumePlanIntent() {
  const prev = readPlanIntent();
  try { localStorage.removeItem(PLAN_KEY); } catch {}
  return prev;
}

export function flagLoginIntent() {
  try { localStorage.setItem(LOGIN_INTENT_KEY, '1'); } catch {}
}

export function consumeLoginIntent() {
  let v = false;
  try {
    v = localStorage.getItem(LOGIN_INTENT_KEY) === '1';
    localStorage.removeItem(LOGIN_INTENT_KEY);
  } catch {}
  return v;
}
