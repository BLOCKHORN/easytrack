// Aviso global de nuevas respuestas de soporte (persistente por sesión + pub/sub simple)

const KEY = 'et_support_notice';
const subs = new Set();

function read() {
  try {
    return sessionStorage.getItem(KEY) === '1';
  } catch { return false; }
}

function write(v) {
  try {
    if (v) sessionStorage.setItem(KEY, '1');
    else sessionStorage.removeItem(KEY);
  } catch {}
}

export function hasNotice() {
  return read();
}

export function setNotice(on = true) {
  write(on);
  subs.forEach(cb => cb(on));
}

export function clearNotice() {
  write(false);
  subs.forEach(cb => cb(false));
}

export function subscribeNotice(cb) {
  subs.add(cb);
  return () => subs.delete(cb);
}
