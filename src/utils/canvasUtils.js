import { MAX_PTS } from './constants.js';

// Canvas: Sparkline
export function drawSpark(canvas, data, color = '#111111') {
  if (!canvas) return;
  const W = canvas.parentElement.offsetWidth || 160;
  const H = 28;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, W, H);
  if (data.length < 2) return;

  const lo = Math.min(...data), hi = Math.max(...data);
  const range = hi - lo || 1;
  const norm = v => H - 2 - ((v - lo) / range) * (H - 4);

  ctx.beginPath();
  data.forEach((v, i) => {
    const x = (i / (data.length - 1)) * W;
    i === 0 ? ctx.moveTo(x, norm(v)) : ctx.lineTo(x, norm(v));
  });

  // Fill
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, color + '18');
  grad.addColorStop(1, color + '00');
  ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath();
  ctx.fillStyle = grad; ctx.fill();

  // Stroke
  ctx.beginPath();
  data.forEach((v, i) => {
    const x = (i / (data.length - 1)) * W;
    i === 0 ? ctx.moveTo(x, norm(v)) : ctx.lineTo(x, norm(v));
  });
  ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.lineJoin = 'round'; ctx.stroke();
}

// Canvas: Waveform
export function drawWave(canvas, data) {
  if (!canvas) return;
  const W = canvas.parentElement.offsetWidth - 32 || 328;
  const H = 36;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, W, H);

  if (data.length < 2) {
    ctx.beginPath();
    ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2);
    ctx.strokeStyle = '#e8e8e8'; ctx.lineWidth = 1; ctx.stroke();
    return;
  }

  const lo = Math.min(...data) * 0.94, hi = Math.max(...data) * 1.06 || 1;
  const norm = v => H - 1 - ((v - lo) / (hi - lo)) * (H - 2);
  const step = W / (MAX_PTS - 1);

  ctx.beginPath();
  data.forEach((v, i) => {
    const x = i * step, y = norm(v);
    if (i === 0) { ctx.moveTo(x, y); return; }
    const px = (i - 1) * step, py = norm(data[i - 1]);
    const mx = (px + x) / 2;
    ctx.bezierCurveTo(mx, py, mx, y, x, y);
  });

  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, 'rgba(17,17,17,0.06)');
  grad.addColorStop(1, 'rgba(17,17,17,0)');
  ctx.lineTo(data.length * step, H); ctx.lineTo(0, H); ctx.closePath();
  ctx.fillStyle = grad; ctx.fill();

  ctx.beginPath();
  data.forEach((v, i) => {
    const x = i * step, y = norm(v);
    if (i === 0) { ctx.moveTo(x, y); return; }
    const px = (i - 1) * step, py = norm(data[i - 1]);
    const mx = (px + x) / 2;
    ctx.bezierCurveTo(mx, py, mx, y, x, y);
  });
  ctx.strokeStyle = '#111111'; ctx.lineWidth = 1; ctx.lineJoin = 'round'; ctx.stroke();
}
