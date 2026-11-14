// Compositing of 3D renders into finished 2D art (portraits, cards, skill icons, title, loading).
// window.composeArt(kind, images[], opts) -> PNG data URL. Uses helpers from gen.js.
const load = (src) => new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.src = src; });
const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };
function emote(ctx, kind, x, y, s) {
  if (kind === 'think') { // thought bubble with ?
    for (const [dx, dy, r] of [[-s * 0.55, s * 0.55, s * 0.08], [-s * 0.35, s * 0.35, s * 0.12]]) { ctx.beginPath(); ctx.arc(x + dx, y + dy, r, 0, TAU); ctx.fillStyle = '#fff'; ctx.fill(); }
    ctx.beginPath(); ctx.arc(x, y, s * 0.32, 0, TAU); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#3a4a64'; ctx.lineWidth = 3; ctx.stroke();
    text(ctx, '?', x, y + 2, { size: s * 0.42, color: '#3a6ad8', weight: 900 });
  } else if (kind === 'correct') {
    for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i - 2) * 0.5; star(ctx, x + Math.cos(a) * s * 0.4, y + Math.sin(a) * s * 0.4 + s * 0.2, s * (i % 2 ? 0.1 : 0.15), s * 0.05, 4); ctx.fillStyle = i % 2 ? '#fff6b0' : '#ffd34a'; ctx.fill(); }
    ctx.beginPath(); ctx.arc(x, y + s * 0.15, s * 0.24, 0, TAU); ctx.fillStyle = C.ok; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = s * 0.06; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x - s * 0.1, y + s * 0.15); ctx.lineTo(x - s * 0.02, y + s * 0.24); ctx.lineTo(x + s * 0.12, y + s * 0.05); ctx.stroke();
  } else if (kind === 'wrong') { // sweat drop + gloomy lines
    ctx.beginPath(); ctx.moveTo(x, y - s * 0.25); ctx.quadraticCurveTo(x + s * 0.2, y + s * 0.05, x, y + s * 0.15); ctx.quadraticCurveTo(x - s * 0.2, y + s * 0.05, x, y - s * 0.25); ctx.fillStyle = '#8ad8ff'; ctx.fill(); ctx.strokeStyle = '#3a6ad8'; ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = 'rgba(90,110,180,0.8)'; ctx.lineWidth = 3; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(x - s * 1.5 + i * s * 0.18, y - s * 0.2); ctx.lineTo(x - s * 1.5 + i * s * 0.18, y + s * 0.3); ctx.stroke(); }
  }
}
function frameRound(ctx, w, h, col, r = 28) {
  ctx.save(); path(ctx, 6, 6, w - 12, h - 12, r); ctx.clip();
  ctx.fillStyle = rgrad(ctx, w / 2, h * 0.4, 10, w * 0.8, [[0, shade(col, 0.35)], [1, shade(col, -0.55)]]); ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 8; i++) { star(ctx, (i * 73) % w, (i * 47) % (h * 0.6), 4, 1.5, 4); ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fill(); }
  ctx.restore();
}
function frameBorder(ctx, w, h, r = 28) { ctx.lineWidth = 8; ctx.strokeStyle = grad(ctx, 0, 0, w, h, [[0, C.goldL], [0.5, C.gold], [1, C.goldD]]); path(ctx, 6, 6, w - 12, h - 12, r); ctx.stroke(); ctx.lineWidth = 2; ctx.strokeStyle = '#3a2a0a'; path(ctx, 2, 2, w - 4, h - 4, r + 3); ctx.stroke(); }

window.composeArt = async (kind, srcs, o = {}) => {
  const ims = await Promise.all(srcs.map(load));
  if (kind === 'portrait') { // 256 x 256 rounded portrait, optional emote
    const [c, ctx] = canvas(256, 256);
    frameRound(ctx, 256, 256, o.color ?? '#3a6ad8');
    ctx.save(); path(ctx, 6, 6, 244, 244, 28); ctx.clip(); ctx.drawImage(ims[0], 0, 0, 256, 256); ctx.restore();
    if (o.emote) emote(ctx, o.emote, 200, 60, 90);
    if (o.emote === 'wrong') { ctx.fillStyle = 'rgba(60,80,160,0.18)'; path(ctx, 6, 6, 244, 244, 28); ctx.fill(); }
    if (o.emote === 'correct') { ctx.fillStyle = 'rgba(255,240,160,0.12)'; path(ctx, 6, 6, 244, 244, 28); ctx.fill(); }
    frameBorder(ctx, 256, 256);
    return c.toDataURL('image/png');
  }
  if (kind === 'card') { // character select card 400 x 600
    const [c, ctx] = canvas(400, 600);
    frameRound(ctx, 400, 600, o.color, 30);
    ctx.save(); path(ctx, 6, 6, 388, 588, 30); ctx.clip();
    ctx.fillStyle = rgrad(ctx, 200, 520, 10, 140, [[0, 'rgba(255,240,180,0.5)'], [1, 'rgba(255,240,180,0)']]); ctx.fillRect(0, 380, 400, 220);
    ctx.drawImage(ims[0], 0, 20, 400, 480); ctx.restore();
    path(ctx, 20, 470, 360, 110, 18); ctx.fillStyle = 'rgba(12,16,28,0.82)'; ctx.fill(); ctx.strokeStyle = C.gold; ctx.lineWidth = 2; ctx.stroke();
    text(ctx, o.name, 200, 505, { size: 40, weight: 900, color: C.goldL, stroke: '#2a1a0a', sw: 6 });
    text(ctx, o.desc, 200, 552, { size: 20, weight: 700, color: '#d8e8ff' });
    frameBorder(ctx, 400, 600, 30);
    return c.toDataURL('image/png');
  }
  if (kind === 'skillIcon') { // 48 x 48 (and 96 x 96 for HiDPI)
    const s = o.size ?? 48;
    const [c, ctx] = canvas(s, s);
    path(ctx, 1, 1, s - 2, s - 2, s * 0.18); ctx.fillStyle = rgrad(ctx, s / 2, s / 2, 2, s * 0.75, [[0, shade(o.color, -0.2)], [1, '#0c1220']]); ctx.fill();
    ctx.save(); path(ctx, 2, 2, s - 4, s - 4, s * 0.16); ctx.clip(); ctx.drawImage(ims[0], -s * 0.1, -s * 0.1, s * 1.2, s * 1.2); ctx.restore();
    ctx.lineWidth = Math.max(2, s / 24); ctx.strokeStyle = o.border; path(ctx, 1.5, 1.5, s - 3, s - 3, s * 0.18); ctx.stroke();
    return c.toDataURL('image/png');
  }
  if (kind === 'title') {
    const [c, ctx] = canvas(1920, 1080);
    ctx.drawImage(ims[0], 0, 0);
    ctx.fillStyle = grad(ctx, 0, 0, 0, 1080, [[0, 'rgba(10,16,30,0.55)'], [0.35, 'rgba(10,16,30,0)'], [0.75, 'rgba(10,16,30,0)'], [1, 'rgba(10,16,30,0.6)']]); ctx.fillRect(0, 0, 1920, 1080);
    ctx.drawImage(ims[1], (1920 - 1024) / 2, 40);
    return c.toDataURL('image/png');
  }
  if (kind === 'loading') {
    const [c, ctx] = canvas(1920, 1080);
    ctx.drawImage(ims[0], 0, 0);
    ctx.fillStyle = grad(ctx, 0, 700, 0, 1080, [[0, 'rgba(10,16,30,0)'], [1, 'rgba(10,16,30,0.85)']]); ctx.fillRect(0, 700, 1920, 380);
    text(ctx, o.title, 120, 900, { size: 84, weight: 900, color: C.goldL, stroke: '#1a1020', sw: 12, align: 'left' });
    text(ctx, o.sub, 124, 975, { size: 34, weight: 700, color: '#d8e8ff', stroke: '#1a1020', sw: 6, align: 'left' });
    path(ctx, 1320, 990, 480, 22, 11); ctx.fillStyle = 'rgba(12,16,28,0.8)'; ctx.fill(); ctx.strokeStyle = C.gold; ctx.lineWidth = 2; ctx.stroke();
    return c.toDataURL('image/png');
  }
  throw new Error(`unknown art kind ${kind}`);
};
