import { MAX_PTS } from './constants.js';

export const toMB = b => b / 1048576;
export const fmtMB = mb => mb.toFixed(1);
export const push = (arr, v) => { arr.push(v); if (arr.length > MAX_PTS) arr.shift(); };

export function fmtUptime(ms) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sc = s % 60;
  return `${h}:${String(m).padStart(2,'0')}:${String(sc).padStart(2,'0')}`;
}

export function fmtTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit', second:'2-digit' });
}

export function fmtHost(url) {
  try { return new URL(url).hostname; } catch { return url.slice(0, 30); }
}
