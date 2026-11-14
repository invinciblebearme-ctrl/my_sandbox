// 2D UI generator for the educational ARPG. Every asset is drawn on a canvas from code.
// window.ASSETS: [{ path, w, h, frames?, slice?, note? , draw(ctx, w, h, frame, frames, images) }]
// `images` carries 3D renders passed in by the runner (portraits, cards, skill art).
const C = {
  parch: '#f3e6c4', parch2: '#e6d3a4', parchEdge: '#b8945a', ink: '#3a2a1a',
  gold: '#f2c14e', goldD: '#a8761e', goldL: '#fff0b0',
  night: '#1b2638', night2: '#26344c', steel: '#4a6a8a', cyan: '#8ad8ff',
  ok: '#4ac86a', okD: '#1f7a3a', bad: '#e8524a', badD: '#8a2a24', hover: '#ffd36a',
  hp: '#e8425a', hpD: '#7a1a2a', mp: '#3a8aff', mpD: '#1a3a7a', exp: '#b48aff',
  rar: { common: '#b8b8b8', magic: '#4a8aff', rare: '#ffd34a', legendary: '#ff8a2a' },
};
const FONT = "'Pretendard', sans-serif";
const PIX = "'Galmuri11', monospace";
const TAU = Math.PI * 2;

const path = (ctx, l, t, w, h, r) => { ctx.beginPath(); ctx.roundRect(l, t, w, h, r); };
function grad(ctx, x0, y0, x1, y1, stops) { const g = ctx.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; }
function rgrad(ctx, x, y, r0, r1, stops) { const g = ctx.createRadialGradient(x, y, r0, x, y, r1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; }
function star(ctx, x, y, r1, r2, n = 5, rot = -Math.PI / 2) { ctx.beginPath(); for (let i = 0; i < n * 2; i++) { const r = i % 2 ? r2 : r1; const a = rot + (i / (n * 2)) * TAU; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } ctx.closePath(); }
function text(ctx, s, x, y, { size = 24, weight = 800, color = '#fff', stroke = null, sw = 4, font = FONT, align = 'center', base = 'middle', shadow = null } = {}) {
  ctx.font = `${weight} ${size}px ${font}`; ctx.textAlign = align; ctx.textBaseline = base;
  if (shadow) { ctx.shadowColor = shadow; ctx.shadowBlur = size * 0.4; }
  if (stroke) { ctx.lineJoin = 'round'; ctx.lineWidth = sw; ctx.strokeStyle = stroke; ctx.strokeText(s, x, y); }
  ctx.fillStyle = color; ctx.fillText(s, x, y); ctx.shadowBlur = 0;
}
function glow(ctx, color, blur, fn) { ctx.save(); ctx.shadowColor = color; ctx.shadowBlur = blur; fn(); ctx.restore(); }
const ease = (x) => 1 - (1 - x) ** 3;
const clamp = (x) => Math.max(0, Math.min(1, x));

// ---- shared panel styles ----------------------------------------------------------------------
function parchment(ctx, l, t, w, h, r = 18) {
  glow(ctx, 'rgba(0,0,0,0.45)', 10, () => { path(ctx, l, t, w, h, r); ctx.fillStyle = C.parchEdge; ctx.fill(); });
  path(ctx, l + 4, t + 4, w - 8, h - 8, r - 3); ctx.fillStyle = rgrad(ctx, l + w / 2, t + h / 2, 10, Math.max(w, h) * 0.7, [[0, C.parch], [1, C.parch2]]); ctx.fill();
  ctx.strokeStyle = 'rgba(120,80,30,0.35)'; ctx.lineWidth = 2; path(ctx, l + 10, t + 10, w - 20, h - 20, r - 8); ctx.stroke();
}
function goldCorners(ctx, l, t, w, h, s = 22) {
  for (const [x, y, sx, sy] of [[l, t, 1, 1], [l + w, t, -1, 1], [l, t + h, 1, -1], [l + w, t + h, -1, -1]]) {
    ctx.save(); ctx.translate(x, y); ctx.scale(sx, sy);
    ctx.beginPath(); ctx.moveTo(2, 2); ctx.lineTo(s, 2); ctx.lineTo(s - 6, 8); ctx.lineTo(8, 8); ctx.lineTo(8, s - 6); ctx.lineTo(2, s); ctx.closePath();
    ctx.fillStyle = grad(ctx, 0, 0, s, s, [[0, C.goldL], [1, C.gold]]); ctx.fill(); ctx.strokeStyle = C.goldD; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.beginPath(); ctx.arc(9, 9, 4, 0, TAU); ctx.fillStyle = C.cyan; ctx.fill();
    ctx.restore();
  }
}
function darkPanel(ctx, l, t, w, h, r = 14, border = C.steel) {
  glow(ctx, 'rgba(0,0,0,0.5)', 10, () => { path(ctx, l, t, w, h, r); ctx.fillStyle = '#0f1724'; ctx.fill(); });
  path(ctx, l + 3, t + 3, w - 6, h - 6, r - 2); ctx.fillStyle = grad(ctx, 0, t, 0, t + h, [[0, C.night2], [1, C.night]]); ctx.fill();
  ctx.strokeStyle = border; ctx.lineWidth = 3; path(ctx, l + 3, t + 3, w - 6, h - 6, r - 2); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 2; path(ctx, l + 8, t + 8, w - 16, h - 16, r - 6); ctx.stroke();
}
function button(ctx, w, h, state, { r = 16, label = null, size = 26, mark = true } = {}) {
  const base = { normal: ['#f6ead0', '#e2cc98', C.parchEdge], hover: ['#fff6d8', '#ffe08a', C.gold], correct: ['#c8f2c8', '#5ad86a', C.okD], wrong: ['#ffd0c8', '#f06a5a', C.badD], pressed: ['#e2cc98', '#cdb070', C.parchEdge], disabled: ['#d0ccc4', '#a8a49c', '#7a766e'] }[state];
  const dy = state === 'pressed' ? 3 : 0;
  glow(ctx, state === 'hover' ? 'rgba(255,211,106,0.9)' : state === 'correct' ? 'rgba(90,216,106,0.9)' : state === 'wrong' ? 'rgba(240,106,90,0.9)' : 'rgba(0,0,0,0.35)', state === 'normal' || state === 'pressed' || state === 'disabled' ? 6 : 14, () => { path(ctx, 6, 6 + dy, w - 12, h - 14, r); ctx.fillStyle = base[2]; ctx.fill(); });
  path(ctx, 9, 8 + dy, w - 18, h - 20, r - 3); ctx.fillStyle = grad(ctx, 0, 8, 0, h - 12, [[0, base[0]], [1, base[1]]]); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.35)'; path(ctx, 14, 11 + dy, w - 28, (h - 20) * 0.35, r - 6); ctx.fill();
  if (mark && state === 'correct') { ctx.strokeStyle = '#fff'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(w - 58, h / 2 - 4); ctx.lineTo(w - 46, h / 2 + 8); ctx.lineTo(w - 26, h / 2 - 14); ctx.stroke(); }
  if (mark && state === 'wrong') { ctx.strokeStyle = '#fff'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(w - 50, h / 2 - 14); ctx.lineTo(w - 30, h / 2 + 6); ctx.moveTo(w - 30, h / 2 - 14); ctx.lineTo(w - 50, h / 2 + 6); ctx.stroke(); }
  if (label) text(ctx, label, w / 2, h / 2 - 3 + dy, { size, color: C.ink, weight: 800 });
}
function iconBadge(ctx, s, color, fn) { // round badge with a glyph drawn by fn(ctx, cx, cy, r)
  glow(ctx, 'rgba(0,0,0,0.45)', 6, () => { ctx.beginPath(); ctx.arc(s / 2, s / 2, s / 2 - 3, 0, TAU); ctx.fillStyle = C.goldD; ctx.fill(); });
  ctx.beginPath(); ctx.arc(s / 2, s / 2, s / 2 - 6, 0, TAU); ctx.fillStyle = rgrad(ctx, s * 0.4, s * 0.35, 2, s / 2, [[0, '#ffffff'], [0.25, color], [1, shade(color, -0.45)]]); ctx.fill();
  ctx.strokeStyle = C.gold; ctx.lineWidth = 3; ctx.stroke();
  ctx.save(); fn(ctx, s / 2, s / 2, s / 2 - 10); ctx.restore();
}
function shade(hex, amt) { const n = parseInt(hex.slice(1), 16); const f = (v) => Math.max(0, Math.min(255, Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt))); return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`; }

// ---- glyphs (simple vector icons) ------------------------------------------------------------
const G = {
  sword(ctx, x, y, r, col = '#fff') { ctx.save(); ctx.translate(x, y); ctx.rotate(-Math.PI / 4); ctx.fillStyle = col; ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(r * 0.16, -r * 0.72); ctx.lineTo(r * 0.16, r * 0.3); ctx.lineTo(-r * 0.16, r * 0.3); ctx.lineTo(-r * 0.16, -r * 0.72); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = C.gold; ctx.fillRect(-r * 0.45, r * 0.3, r * 0.9, r * 0.14); ctx.fillStyle = '#8a5a32'; ctx.fillRect(-r * 0.09, r * 0.44, r * 0.18, r * 0.4); ctx.restore(); },
  wand(ctx, x, y, r) { ctx.save(); ctx.translate(x, y); ctx.rotate(Math.PI / 5); ctx.fillStyle = '#8a5a32'; ctx.fillRect(-r * 0.08, -r * 0.4, r * 0.16, r * 1.3); star(ctx, 0, -r * 0.6, r * 0.42, r * 0.18); ctx.fillStyle = '#fff6b0'; ctx.fill(); ctx.restore(); },
  potion(ctx, x, y, r, col = C.hp) { ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillRect(x - r * 0.18, y - r * 0.9, r * 0.36, r * 0.4); ctx.fillStyle = '#c09060'; ctx.fillRect(x - r * 0.22, y - r * 1.02, r * 0.44, r * 0.18); ctx.beginPath(); ctx.arc(x, y + r * 0.15, r * 0.65, 0, TAU); ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke(); ctx.beginPath(); ctx.arc(x - r * 0.22, y - r * 0.05, r * 0.14, 0, TAU); ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fill(); },
  chest(ctx, x, y, r) { ctx.fillStyle = '#9a5a2a'; ctx.fillRect(x - r * 0.8, y - r * 0.2, r * 1.6, r * 0.8); ctx.beginPath(); ctx.ellipse(x, y - r * 0.2, r * 0.8, r * 0.45, 0, Math.PI, 0); ctx.fill(); ctx.fillStyle = C.gold; ctx.fillRect(x - r * 0.8, y - r * 0.22, r * 1.6, r * 0.12); ctx.fillRect(x - r * 0.12, y - r * 0.3, r * 0.24, r * 0.34); },
  portal(ctx, x, y, r) { for (let i = 3; i > 0; i--) { ctx.beginPath(); ctx.ellipse(x, y, r * 0.3 * i, r * 0.38 * i, 0, 0, TAU); ctx.strokeStyle = i === 3 ? '#fff' : C.cyan; ctx.lineWidth = 3; ctx.stroke(); } },
  book(ctx, x, y, r, col = '#7a3a2a') { ctx.fillStyle = col; ctx.fillRect(x - r * 0.75, y - r * 0.6, r * 1.5, r * 1.2); ctx.fillStyle = '#f6eed8'; ctx.fillRect(x - r * 0.68, y - r * 0.52, r * 0.62, r * 1.04); ctx.fillRect(x + r * 0.06, y - r * 0.52, r * 0.62, r * 1.04); ctx.fillStyle = 'rgba(80,60,120,0.6)'; for (let i = 0; i < 4; i++) { ctx.fillRect(x - r * 0.6, y - r * 0.38 + i * r * 0.22, r * 0.46, r * 0.06); ctx.fillRect(x + r * 0.14, y - r * 0.38 + i * r * 0.22, r * 0.46, r * 0.06); } },
};

// ---- asset list ---------------------------------------------------------------------------------
const A = [];
const add = (path, w, h, draw, extra = {}) => A.push({ path, w, h, draw, ...extra });

// == quiz ==
add('quiz/quiz_panel.png', 192, 192, (ctx, w, h) => { parchment(ctx, 4, 4, w - 8, h - 8, 22); goldCorners(ctx, 4, 4, w - 8, h - 8, 34); }, { slice: [48, 48, 48, 48], note: '9-slice 퀴즈 팝업 패널 (양피지)' });
for (const st of ['normal', 'hover', 'correct', 'wrong']) add(`quiz/quiz_choice_${st}.png`, 420, 84, (ctx, w, h) => button(ctx, w, h, st), { slice: [24, 28, 24, 28], note: '보기 버튼 (9-slice, 글자는 게임에서)' });
for (const ox of ['o', 'x']) for (const st of ['normal', 'hover', 'correct', 'wrong']) add(`quiz/quiz_ox_${ox}_${st}.png`, 140, 140, (ctx, w, h) => {
  button(ctx, w, h, st, { r: 26, mark: false });
  ctx.lineCap = 'round'; ctx.lineWidth = 14; ctx.strokeStyle = ox === 'o' ? '#3a8aff' : '#e8524a';
  if (st === 'correct' || st === 'wrong') ctx.strokeStyle = '#ffffff';
  ctx.beginPath(); if (ox === 'o') ctx.arc(w / 2, h / 2 - 4, 34, 0, TAU); else { ctx.moveTo(w / 2 - 30, h / 2 - 34); ctx.lineTo(w / 2 + 30, h / 2 + 26); ctx.moveTo(w / 2 + 30, h / 2 - 34); ctx.lineTo(w / 2 - 30, h / 2 + 26); } ctx.stroke();
});
for (const k of ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', 'ok']) for (const st of ['normal', 'pressed']) add(`quiz/keypad_${k}_${st}.png`, 96, 96, (ctx, w, h) => {
  button(ctx, w, h, k === 'ok' && st === 'normal' ? 'correct' : st, { r: 18, mark: false });
  if (k === 'del') { ctx.fillStyle = C.ink; ctx.beginPath(); const y = h / 2 - 3 + (st === 'pressed' ? 3 : 0); ctx.moveTo(26, y); ctx.lineTo(40, y - 14); ctx.lineTo(70, y - 14); ctx.lineTo(70, y + 14); ctx.lineTo(40, y + 14); ctx.closePath(); ctx.fill(); text(ctx, '×', 55, y, { size: 26, color: '#fff' }); }
  else text(ctx, k === 'ok' ? '확인' : k, w / 2, h / 2 - 3 + (st === 'pressed' ? 3 : 0), { size: k === 'ok' ? 26 : 40, color: k === 'ok' && st === 'normal' ? '#fff' : C.ink, stroke: k === 'ok' && st === 'normal' ? C.okD : null });
});
add('quiz/timer_ring_bg.png', 128, 128, (ctx, w) => { ctx.beginPath(); ctx.arc(w / 2, w / 2, 54, 0, TAU); ctx.fillStyle = 'rgba(20,28,44,0.85)'; ctx.fill(); ctx.lineWidth = 12; ctx.strokeStyle = '#3a4a64'; ctx.beginPath(); ctx.arc(w / 2, w / 2, 48, 0, TAU); ctx.stroke(); ctx.lineWidth = 4; ctx.strokeStyle = C.gold; ctx.beginPath(); ctx.arc(w / 2, w / 2, 58, 0, TAU); ctx.stroke(); }, { note: '원형 타이머 배경' });
add('quiz/timer_ring_fill.png', 128, 128, (ctx, w) => { ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.strokeStyle = grad(ctx, 0, 0, w, w, [[0, '#8affd8'], [0.6, '#ffd36a'], [1, '#ff6a4a']]); ctx.beginPath(); ctx.arc(w / 2, w / 2, 48, -Math.PI / 2, Math.PI * 1.5); ctx.stroke(); }, { note: '남은 시간 비율만큼 원호를 잘라서(마스크) 표시' });
add('quiz/timer_hourglass.png', 64, 64, (ctx, w) => { ctx.fillStyle = '#8a5a32'; ctx.fillRect(14, 6, 36, 6); ctx.fillRect(14, 52, 36, 6); ctx.beginPath(); ctx.moveTo(18, 12); ctx.lineTo(46, 12); ctx.lineTo(34, 32); ctx.lineTo(46, 52); ctx.lineTo(18, 52); ctx.lineTo(30, 32); ctx.closePath(); ctx.fillStyle = 'rgba(220,240,255,0.8)'; ctx.fill(); ctx.strokeStyle = '#5a3a22'; ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = C.gold; ctx.beginPath(); ctx.moveTo(22, 52); ctx.lineTo(42, 52); ctx.lineTo(32, 40); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(24, 16); ctx.lineTo(40, 16); ctx.lineTo(32, 28); ctx.closePath(); ctx.fill(); });
const ACTIONS = { attack: ['#e8524a', (ctx, x, y, r) => G.sword(ctx, x, y, r)], magic: ['#8a5aff', (ctx, x, y, r) => G.wand(ctx, x, y, r)], potion: ['#e8425a', (ctx, x, y, r) => G.potion(ctx, x, y, r * 0.8, '#ff6a8a')], chest: ['#ffb43a', (ctx, x, y, r) => G.chest(ctx, x, y, r)], return: ['#3a8aff', (ctx, x, y, r) => G.portal(ctx, x, y, r)] };
for (const [k, [col, fn]] of Object.entries(ACTIONS)) add(`quiz/action_${k}.png`, 80, 80, (ctx, w) => iconBadge(ctx, w, col, fn), { note: '이 퀴즈가 무엇을 위한 것인지 (공격·마법·물약·상자·귀환)' });
const JUDGE = { perfect: ['PERFECT', '#fff36a', '#ff8a2a'], good: ['GOOD', '#8affd8', '#1f7a6a'], safe: ['SAFE', '#bfe0ff', '#3a5a9a'], miss: ['MISS', '#ffb0a8', '#8a2a24'] };
for (const [k, [word, fill, edge]] of Object.entries(JUDGE)) add(`quiz/judge_${k}.png`, 320, 120, (ctx, w, h, f, n) => {
  const t = f / (n - 1); const s = k === 'miss' ? 1 - 0.15 * Math.sin(t * Math.PI) : 0.6 + ease(clamp(t * 2.2)) * 0.5 - (t > 0.5 ? (t - 0.5) * 0.2 : 0);
  ctx.globalAlpha = t > 0.8 ? 1 - (t - 0.8) * 3 : 1;
  ctx.translate(w / 2 + (k === 'miss' ? Math.sin(t * 30) * 6 : 0), h / 2 + (k === 'miss' ? t * 14 : 0)); ctx.scale(s, s); ctx.rotate(k === 'perfect' ? -0.06 : 0);
  if (k === 'perfect') for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU + t * 2; star(ctx, Math.cos(a) * 140, Math.sin(a) * 42, 10, 4); ctx.fillStyle = '#fff6b0'; ctx.fill(); }
  text(ctx, word, 0, 0, { size: 64, weight: 900, color: fill, stroke: edge, sw: 10, shadow: fill });
}, { frames: 6, note: '판정 텍스트 애니메이션 6프레임 (가로 스트립)' });
add('quiz/fx_correct.png', 192, 192, (ctx, w, h, f, n) => {
  const t = f / (n - 1); ctx.translate(w / 2, h / 2);
  ctx.globalAlpha = 1 - clamp((t - 0.6) / 0.4);
  ctx.beginPath(); ctx.arc(0, 0, 20 + ease(t) * 70, 0, TAU); ctx.strokeStyle = '#8affd8'; ctx.lineWidth = 8 * (1 - t) + 1; ctx.stroke();
  for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU + i; const d = 10 + ease(t) * 80; star(ctx, Math.cos(a) * d, Math.sin(a) * d, 12 * (1 - t * 0.7), 5 * (1 - t * 0.7), 4, a); ctx.fillStyle = i % 2 ? '#fff36a' : '#ffffff'; ctx.fill(); }
  if (t < 0.4) { ctx.beginPath(); ctx.arc(0, 0, 40 * (1 - t * 2.5), 0, TAU); ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fill(); }
}, { frames: 8, note: '정답 반짝임 폭발 8프레임' });
add('quiz/fx_wrong_crack.png', 512, 288, (ctx, w, h, f, n) => {
  const t = f / (n - 1); ctx.globalAlpha = t < 0.2 ? t * 5 : 1 - clamp((t - 0.6) / 0.4) * 0.9;
  ctx.fillStyle = `rgba(232,82,74,${0.25 * (1 - t)})`; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 3; const cx = w * 0.55; const cy = h * 0.45;
  const grow = ease(clamp(t * 2));
  for (let i = 0; i < 9; i++) { const a = (i / 9) * TAU + 0.3; ctx.beginPath(); ctx.moveTo(cx, cy); let x = cx; let y = cy; for (let j = 1; j <= 4; j++) { x += Math.cos(a + Math.sin(i * 7 + j) * 0.4) * 40 * grow; y += Math.sin(a + Math.sin(i * 5 + j) * 0.4) * 40 * grow; ctx.lineTo(x, y); } ctx.stroke(); }
  for (let ring = 1; ring <= 2; ring++) { ctx.beginPath(); for (let i = 0; i <= 9; i++) { const a = (i / 9) * TAU + 0.3; const d = ring * 55 * grow + Math.sin(i * 3) * 8; ctx.lineTo(cx + Math.cos(a) * d, cy + Math.sin(a) * d); } ctx.stroke(); }
}, { frames: 6, note: '오답: 금 간 유리 오버레이 6프레임 (화면 흔들림은 코드로)' });
add('quiz/combo_digits.png', 64, 80, (ctx, w, h, f) => { const ch = f < 10 ? String(f) : f === 10 ? 'x' : '!'; text(ctx, ch, w / 2, h / 2 + 2, { size: 64, weight: 900, color: grad(ctx, 0, 10, 0, 70, [[0, '#fff6b0'], [1, '#ff8a2a']]), stroke: '#7a2a0a', sw: 8 }); }, { frames: 12, note: '콤보 숫자 0~9, x, ! (가로 스트립 12칸)' });
add('quiz/combo_flame.png', 96, 128, (ctx, w, h, f, n) => {
  const t = f / n;
  for (let i = 0; i < 3; i++) { const s = 1 - i * 0.28; const wob = Math.sin((t + i * 0.2) * TAU) * 6; ctx.beginPath(); ctx.moveTo(w / 2 + wob, 10 + i * 18); ctx.quadraticCurveTo(w / 2 + 40 * s, h * 0.55, w / 2, h - 10); ctx.quadraticCurveTo(w / 2 - 40 * s, h * 0.55, w / 2 + wob, 10 + i * 18); ctx.fillStyle = ['#ff5a1a', '#ffa83a', '#fff6b0'][i]; ctx.fill(); }
}, { frames: 6, note: '콤보 숫자 뒤 불꽃 루프 6프레임' });
add('quiz/focus_gauge_frame.png', 420, 48, (ctx, w, h) => { darkPanel(ctx, 2, 2, w - 4, h - 4, 20, C.gold); G.book(ctx, 26, h / 2, 14, '#3a6ad8'); }, { slice: [44, 22, 22, 22], note: '집중 게이지 틀 (왼쪽 책 아이콘)' });
add('quiz/focus_gauge_fill.png', 360, 24, (ctx, w, h) => { path(ctx, 0, 0, w, h, 12); ctx.fillStyle = grad(ctx, 0, 0, w, 0, [[0, '#5aa8ff'], [0.5, '#8a5aff'], [1, '#ff8ad8']]); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.35)'; path(ctx, 4, 3, w - 8, h * 0.35, 6); ctx.fill(); }, { note: '가로로 잘라서 채움' });
add('quiz/focus_gauge_glow.png', 360, 24, (ctx, w, h, f, n) => { const x = (f / n) * w * 1.4 - w * 0.2; ctx.fillStyle = grad(ctx, x - 60, 0, x + 60, 0, [[0, 'rgba(255,255,255,0)'], [0.5, 'rgba(255,255,255,0.8)'], [1, 'rgba(255,255,255,0)']]); path(ctx, 0, 0, w, h, 12); ctx.fill(); }, { frames: 6, note: '게이지가 가득 찼을 때 지나가는 빛 6프레임' });
add('quiz/fx_wisdom_burst.png', 256, 256, (ctx, w, h, f, n) => {
  const t = f / (n - 1); ctx.translate(w / 2, h / 2);
  ctx.globalAlpha = t < 0.15 ? t / 0.15 : 1 - clamp((t - 0.6) / 0.4);
  ctx.fillStyle = rgrad(ctx, 0, 0, 0, 30 + ease(t) * 110, [[0, '#ffffff'], [0.4, 'rgba(255,240,160,0.9)'], [1, 'rgba(180,140,255,0)']]); ctx.beginPath(); ctx.arc(0, 0, 30 + ease(t) * 110, 0, TAU); ctx.fill();
  for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU + t; ctx.save(); ctx.rotate(a); ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillRect(20 + t * 40, -3, 40 + t * 80, 6); ctx.restore(); }
  const letters = ['가', 'A', '+', '?', 'ㄱ', '∑', 'B', '나'];
  letters.forEach((l, i) => { const a = (i / 8) * TAU - t * 1.5; const d = 30 + ease(t) * 90; text(ctx, l, Math.cos(a) * d, Math.sin(a) * d, { size: 24, color: '#fff6b0', stroke: '#8a5aff', sw: 4 }); });
}, { frames: 12, note: '"지혜 폭발" 화면 전체 빛 폭발 12프레임 (화면 크기로 늘려서)' });
add('quiz/quiz_explain_panel.png', 192, 192, (ctx, w, h) => { darkPanel(ctx, 4, 4, w - 8, h - 8, 18, C.gold); goldCorners(ctx, 4, 4, w - 8, h - 8, 30); }, { slice: [44, 44, 44, 44], note: '해설 창 (9-slice)' });
for (const [k, col, label] of [['correct', C.ok, '정답!'], ['wrong', C.bad, '아쉬워요'], ['answer', '#3a8aff', '정답과 해설']]) add(`quiz/explain_ribbon_${k}.png`, 320, 72, (ctx, w, h) => {
  ctx.fillStyle = shade(col, -0.35); ctx.beginPath(); ctx.moveTo(0, 14); ctx.lineTo(30, 14); ctx.lineTo(30, h - 6); ctx.lineTo(0, h - 6); ctx.lineTo(12, h / 2 + 4); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(w, 14); ctx.lineTo(w - 30, 14); ctx.lineTo(w - 30, h - 6); ctx.lineTo(w, h - 6); ctx.lineTo(w - 12, h / 2 + 4); ctx.closePath(); ctx.fill();
  path(ctx, 20, 4, w - 40, h - 18, 8); ctx.fillStyle = grad(ctx, 0, 4, 0, h - 14, [[0, shade(col, 0.25)], [1, col]]); ctx.fill();
  text(ctx, label, w / 2, h / 2 - 5, { size: 30, color: '#fff', stroke: shade(col, -0.5), sw: 6 });
});
add('quiz/notebook_panel.png', 1024, 640, (ctx, w, h) => {
  glow(ctx, 'rgba(0,0,0,0.5)', 16, () => { path(ctx, 16, 16, w - 32, h - 32, 26); ctx.fillStyle = '#6a2a3a'; ctx.fill(); });
  for (const s of [0, 1]) { const l = s ? w / 2 + 4 : 40; path(ctx, l, 40, w / 2 - 44, h - 80, 12); ctx.fillStyle = grad(ctx, l, 0, l + w / 2, 0, s ? [[0, '#e8dcbc'], [0.1, C.parch], [1, C.parch2]] : [[0, C.parch2], [0.9, C.parch], [1, '#e8dcbc']]); ctx.fill(); ctx.strokeStyle = 'rgba(120,150,200,0.35)'; ctx.lineWidth = 2; for (let y = 110; y < h - 60; y += 40) { ctx.beginPath(); ctx.moveTo(l + 24, y); ctx.lineTo(l + w / 2 - 70, y); ctx.stroke(); } }
  ctx.fillStyle = '#4a1a2a'; ctx.fillRect(w / 2 - 6, 30, 12, h - 60);
  for (let i = 0; i < 4; i++) { ctx.fillStyle = ['#e8524a', '#3a8aff', '#4ac86a', '#ffb43a'][i]; path(ctx, w - 44, 80 + i * 70, 40, 56, 8); ctx.fill(); }
  text(ctx, '오답노트', 160, 76, { size: 34, color: C.ink, weight: 900 });
}, { note: '오답노트 책 배경 (오른쪽 탭 4개 = 과목)' });
add('quiz/report_panel.png', 1024, 640, (ctx, w, h) => {
  darkPanel(ctx, 8, 8, w - 16, h - 16, 24, C.gold); goldCorners(ctx, 8, 8, w - 16, h - 16, 40);
  text(ctx, '학습 리포트', w / 2, 62, { size: 40, color: C.goldL, stroke: '#3a2a0a', sw: 6, weight: 900 });
  ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 2; for (let i = 0; i <= 4; i++) { const y = 140 + i * 90; ctx.beginPath(); ctx.moveTo(90, y); ctx.lineTo(w - 90, y); ctx.stroke(); }
  ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.beginPath(); ctx.moveTo(90, 130); ctx.lineTo(90, 500); ctx.lineTo(w - 90, 500); ctx.stroke();
}, { note: '학습 리포트 배경 (그래프 눈금 포함, 값은 게임에서 그림)' });
for (const [k, col] of [['math', '#3a8aff'], ['english', '#e8524a'], ['korean', '#4ac86a'], ['science', '#8a5aff'], ['social', '#ffb43a']]) add(`quiz/report_bar_${k}.png`, 48, 256, (ctx, w, h) => { path(ctx, 4, 0, w - 8, h, 10); ctx.fillStyle = grad(ctx, 0, 0, w, 0, [[0, shade(col, 0.3)], [0.5, col], [1, shade(col, -0.3)]]); ctx.fill(); }, { note: '과목별 막대 (세로로 잘라서 사용)' });
const SUBJ = {
  math: ['#3a8aff', (ctx, x, y, r) => { text(ctx, '+−', x, y - r * 0.28, { size: r * 0.8, color: '#fff' }); text(ctx, '×÷', x, y + r * 0.42, { size: r * 0.8, color: '#fff' }); }],
  english: ['#e8524a', (ctx, x, y, r) => text(ctx, 'Aa', x, y + 2, { size: r * 1.15, color: '#fff', weight: 900 })],
  korean: ['#4ac86a', (ctx, x, y, r) => text(ctx, '가', x, y + 2, { size: r * 1.3, color: '#fff', weight: 900 })],
  science: ['#8a5aff', (ctx, x, y, r) => { ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(x, y, r * 0.85, r * 0.32, (i / 3) * Math.PI, 0, TAU); ctx.stroke(); } ctx.beginPath(); ctx.arc(x, y, r * 0.16, 0, TAU); ctx.fillStyle = '#fff'; ctx.fill(); }],
  social: ['#ffb43a', (ctx, x, y, r) => { ctx.beginPath(); ctx.arc(x, y, r * 0.78, 0, TAU); ctx.fillStyle = '#5ab8ff'; ctx.fill(); ctx.fillStyle = '#4ac86a'; ctx.beginPath(); ctx.ellipse(x - r * 0.2, y - r * 0.1, r * 0.32, r * 0.42, 0.4, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(x + r * 0.36, y + r * 0.26, r * 0.2, r * 0.26, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, r * 0.78, 0, TAU); ctx.stroke(); }],
};
for (const [k, [col, fn]] of Object.entries(SUBJ)) add(`quiz/subject_${k}.png`, 80, 80, (ctx, w) => iconBadge(ctx, w, col, fn), { note: '과목 아이콘 (수학·영어·국어·과학·사회)' });

// == HUD ==
for (const [k, col, dark] of [['hp', C.hp, C.hpD], ['mp', C.mp, C.mpD]]) {
  add(`hud/orb_${k}_fill.png`, 160, 160, (ctx, w) => { ctx.beginPath(); ctx.arc(w / 2, w / 2, 66, 0, TAU); ctx.fillStyle = rgrad(ctx, w * 0.4, w * 0.35, 6, 80, [[0, shade(col, 0.5)], [0.4, col], [1, dark]]); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.18)'; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(40 + i * 15, 60 + Math.sin(i) * 30, 4 + (i % 3), 0, TAU); ctx.fill(); } }, { note: '체력·마나 구슬 내용물 (아래에서부터 세로로 잘라 채움)' });
}
add('hud/orb_frame.png', 160, 160, (ctx, w) => { ctx.lineWidth = 12; ctx.strokeStyle = grad(ctx, 0, 0, w, w, [[0, C.goldL], [0.5, C.gold], [1, C.goldD]]); ctx.beginPath(); ctx.arc(w / 2, w / 2, 70, 0, TAU); ctx.stroke(); ctx.lineWidth = 3; ctx.strokeStyle = '#5a3a0a'; ctx.beginPath(); ctx.arc(w / 2, w / 2, 76, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.arc(w / 2, w / 2, 64, 0, TAU); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.ellipse(w * 0.4, w * 0.3, 30, 14, -0.5, 0, TAU); ctx.fill(); for (const a of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) { ctx.beginPath(); ctx.arc(w / 2 + Math.cos(a) * 70, w / 2 + Math.sin(a) * 70, 7, 0, TAU); ctx.fillStyle = C.cyan; ctx.fill(); } }, { note: '구슬 틀 (내용물 위에 겹침)' });
add('hud/orb_empty.png', 160, 160, (ctx, w) => { ctx.beginPath(); ctx.arc(w / 2, w / 2, 66, 0, TAU); ctx.fillStyle = 'rgba(15,20,32,0.9)'; ctx.fill(); });
add('hud/exp_bar_frame.png', 640, 28, (ctx, w, h) => { path(ctx, 1, 1, w - 2, h - 2, 12); ctx.fillStyle = 'rgba(15,20,32,0.9)'; ctx.fill(); ctx.strokeStyle = C.gold; ctx.lineWidth = 2; ctx.stroke(); for (let i = 1; i < 10; i++) { ctx.fillStyle = 'rgba(242,193,78,0.35)'; ctx.fillRect((w / 10) * i, 6, 2, h - 12); } }, { slice: [14, 14, 14, 14] });
add('hud/exp_bar_fill.png', 620, 18, (ctx, w, h) => { path(ctx, 0, 0, w, h, 9); ctx.fillStyle = grad(ctx, 0, 0, 0, h, [[0, '#e8d0ff'], [0.5, C.exp], [1, '#6a3ab8']]); ctx.fill(); });
add('hud/skill_slot.png', 72, 72, (ctx, w) => { darkPanel(ctx, 2, 2, w - 4, w - 4, 12, C.gold); }, { note: '스킬바 칸 (6칸, 아이콘은 icons/skills)' });
add('hud/skill_cooldown.png', 64, 64, (ctx, w) => { path(ctx, 0, 0, w, w, 10); ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fill(); }, { note: '재사용 대기 덮개 (원형으로 잘라 표시)' });
add('hud/potion_slot.png', 64, 64, (ctx, w) => { darkPanel(ctx, 2, 2, w - 4, w - 4, 10, C.steel); }, { note: '물약 벨트 칸 (4칸)' });
add('hud/key_badge.png', 28, 28, (ctx, w) => { path(ctx, 1, 1, w - 2, w - 2, 6); ctx.fillStyle = '#0f1724'; ctx.fill(); ctx.strokeStyle = C.gold; ctx.lineWidth = 2; ctx.stroke(); }, { note: '단축키 숫자 배지 (숫자는 게임에서)' });
for (const [k, col, border, wdt] of [['normal', '#e8425a', '#3a2a2a', 96], ['elite', '#ffb43a', '#f2c14e', 128], ['boss', '#e8425a', '#f2c14e', 720]]) {
  add(`hud/monster_hp_${k}_frame.png`, wdt, k === 'boss' ? 40 : 16, (ctx, w, h) => { path(ctx, 1, 1, w - 2, h - 2, h / 2); ctx.fillStyle = 'rgba(15,20,32,0.85)'; ctx.fill(); ctx.strokeStyle = border; ctx.lineWidth = k === 'normal' ? 2 : 3; ctx.stroke(); if (k === 'boss') { for (const x of [18, w - 18]) { star(ctx, x, h / 2, 12, 5, 4); ctx.fillStyle = C.gold; ctx.fill(); } } if (k === 'elite') { star(ctx, 8, h / 2, 7, 3, 5); ctx.fillStyle = C.gold; ctx.fill(); } }, { slice: k === 'boss' ? [20, 20, 20, 20] : [8, 8, 8, 8] });
  add(`hud/monster_hp_${k}_fill.png`, wdt - 8, k === 'boss' ? 28 : 10, (ctx, w, h) => { path(ctx, 0, 0, w, h, h / 2); ctx.fillStyle = grad(ctx, 0, 0, 0, h, [[0, shade(col, 0.4)], [0.5, col], [1, shade(col, -0.35)]]); ctx.fill(); });
}
// inventory
add('hud/panel_dark.png', 192, 192, (ctx, w, h) => { darkPanel(ctx, 4, 4, w - 8, h - 8, 18, C.gold); goldCorners(ctx, 4, 4, w - 8, h - 8, 28); }, { slice: [40, 40, 40, 40], note: '공용 어두운 패널 (인벤토리·상점·창고·캐릭터 정보·스킬 트리)' });
add('hud/panel_title.png', 360, 64, (ctx, w, h) => { path(ctx, 2, 6, w - 4, h - 12, 12); ctx.fillStyle = grad(ctx, 0, 0, 0, h, [[0, '#4a3a6a'], [1, '#2a2040']]); ctx.fill(); ctx.strokeStyle = C.gold; ctx.lineWidth = 3; ctx.stroke(); }, { slice: [20, 20, 20, 20], note: '창 제목 띠' });
add('hud/slot_empty.png', 56, 56, (ctx, w) => { path(ctx, 2, 2, w - 4, w - 4, 6); ctx.fillStyle = 'rgba(10,14,24,0.85)'; ctx.fill(); ctx.strokeStyle = '#3a4a64'; ctx.lineWidth = 2; ctx.stroke(); ctx.strokeStyle = 'rgba(255,255,255,0.06)'; path(ctx, 6, 6, w - 12, w - 12, 4); ctx.stroke(); }, { note: '인벤토리 격자 칸 (10 x 4)' });
for (const [k, col] of Object.entries(C.rar)) add(`hud/slot_${k}.png`, 56, 56, (ctx, w) => { path(ctx, 2, 2, w - 4, w - 4, 6); ctx.fillStyle = rgrad(ctx, w / 2, w / 2, 4, w * 0.7, [[0, shade(col, -0.55)], [1, 'rgba(10,14,24,0.9)']]); ctx.fill(); glow(ctx, k === 'legendary' ? col : 'transparent', 8, () => { ctx.strokeStyle = col; ctx.lineWidth = 3; path(ctx, 3, 3, w - 6, w - 6, 6); ctx.stroke(); }); }, { note: '등급 배경 (아이템 아이콘 뒤)' });
add('hud/slot_legendary_glow.png', 64, 64, (ctx, w, h, f, n) => { const a = (f / n) * TAU; glow(ctx, C.rar.legendary, 12, () => { ctx.strokeStyle = `rgba(255,${150 + Math.round(Math.sin(a) * 60)},60,1)`; ctx.lineWidth = 3; path(ctx, 6, 6, w - 12, w - 12, 8); ctx.stroke(); }); const x = w / 2 + Math.cos(a) * (w / 2 - 8); const y = w / 2 + Math.sin(a) * (w / 2 - 8); star(ctx, x, y, 6, 2.5, 4); ctx.fillStyle = '#fff6b0'; ctx.fill(); }, { frames: 8, note: '전설 아이템 빛나는 테두리 8프레임' });
const SIL = {
  helmet: (ctx, x, y, r) => { ctx.beginPath(); ctx.arc(x, y + r * 0.1, r * 0.7, Math.PI, 0); ctx.lineTo(x + r * 0.7, y + r * 0.5); ctx.lineTo(x - r * 0.7, y + r * 0.5); ctx.closePath(); ctx.fill(); },
  armor: (ctx, x, y, r) => { ctx.beginPath(); ctx.moveTo(x - r * 0.4, y - r * 0.7); ctx.lineTo(x - r * 0.9, y - r * 0.4); ctx.lineTo(x - r * 0.7, y); ctx.lineTo(x - r * 0.5, y - r * 0.1); ctx.lineTo(x - r * 0.5, y + r * 0.8); ctx.lineTo(x + r * 0.5, y + r * 0.8); ctx.lineTo(x + r * 0.5, y - r * 0.1); ctx.lineTo(x + r * 0.7, y); ctx.lineTo(x + r * 0.9, y - r * 0.4); ctx.lineTo(x + r * 0.4, y - r * 0.7); ctx.lineTo(x, y - r * 0.45); ctx.closePath(); ctx.fill(); },
  gloves: (ctx, x, y, r) => { ctx.fillRect(x - r * 0.4, y - r * 0.2, r * 0.8, r * 0.8); for (let i = 0; i < 4; i++) ctx.fillRect(x - r * 0.4 + i * r * 0.21, y - r * 0.7, r * 0.17, r * 0.55); ctx.fillRect(x + r * 0.4, y, r * 0.3, r * 0.2); },
  boots: (ctx, x, y, r) => { ctx.beginPath(); ctx.moveTo(x - r * 0.4, y - r * 0.8); ctx.lineTo(x + r * 0.15, y - r * 0.8); ctx.lineTo(x + r * 0.15, y + r * 0.2); ctx.lineTo(x + r * 0.8, y + r * 0.4); ctx.lineTo(x + r * 0.8, y + r * 0.75); ctx.lineTo(x - r * 0.4, y + r * 0.75); ctx.closePath(); ctx.fill(); },
  belt: (ctx, x, y, r) => { ctx.fillRect(x - r * 0.9, y - r * 0.2, r * 1.8, r * 0.4); ctx.clearRect(x - r * 0.2, y - r * 0.1, r * 0.4, r * 0.2); ctx.strokeRect(x - r * 0.25, y - r * 0.3, r * 0.5, r * 0.6); },
  ring: (ctx, x, y, r) => { ctx.lineWidth = r * 0.25; ctx.beginPath(); ctx.arc(x, y + r * 0.15, r * 0.5, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x, y - r * 0.75); ctx.lineTo(x + r * 0.25, y - r * 0.45); ctx.lineTo(x, y - r * 0.25); ctx.lineTo(x - r * 0.25, y - r * 0.45); ctx.closePath(); ctx.fill(); },
  necklace: (ctx, x, y, r) => { ctx.lineWidth = r * 0.12; ctx.beginPath(); ctx.arc(x, y - r * 0.3, r * 0.6, 0.2, Math.PI - 0.2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x, y + r * 0.25); ctx.lineTo(x + r * 0.25, y + r * 0.55); ctx.lineTo(x, y + r * 0.85); ctx.lineTo(x - r * 0.25, y + r * 0.55); ctx.closePath(); ctx.fill(); },
  weapon: (ctx, x, y, r) => { ctx.save(); ctx.translate(x, y); ctx.rotate(-Math.PI / 4); ctx.fillRect(-r * 0.12, -r * 0.95, r * 0.24, r * 1.3); ctx.fillRect(-r * 0.45, r * 0.3, r * 0.9, r * 0.14); ctx.fillRect(-r * 0.08, r * 0.44, r * 0.16, r * 0.45); ctx.restore(); },
  offhand: (ctx, x, y, r) => { ctx.beginPath(); ctx.moveTo(x - r * 0.7, y - r * 0.7); ctx.lineTo(x + r * 0.7, y - r * 0.7); ctx.lineTo(x + r * 0.7, y); ctx.quadraticCurveTo(x + r * 0.6, y + r * 0.6, x, y + r * 0.9); ctx.quadraticCurveTo(x - r * 0.6, y + r * 0.6, x - r * 0.7, y); ctx.closePath(); ctx.fill(); },
  amulet: (ctx, x, y, r) => { star(ctx, x, y, r * 0.8, r * 0.35, 4); ctx.fill(); },
};
for (const [k, fn] of Object.entries(SIL)) add(`hud/equip_${k}.png`, 56, 56, (ctx, w) => { path(ctx, 2, 2, w - 4, w - 4, 6); ctx.fillStyle = 'rgba(10,14,24,0.85)'; ctx.fill(); ctx.strokeStyle = '#3a4a64'; ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = 'rgba(160,180,210,0.28)'; ctx.strokeStyle = 'rgba(160,180,210,0.28)'; fn(ctx, w / 2, w / 2, 18); }, { note: '장비 칸 실루엣 (투구·갑옷·장갑·신발·허리띠·반지·목걸이·무기·보조무기·부적)' });
for (const [k, col] of Object.entries(C.rar)) add(`hud/tooltip_${k}.png`, 128, 128, (ctx, w, h) => { path(ctx, 2, 2, w - 4, h - 4, 10); ctx.fillStyle = 'rgba(12,16,28,0.94)'; ctx.fill(); glow(ctx, k === 'legendary' ? col : 'transparent', 10, () => { ctx.strokeStyle = col; ctx.lineWidth = 3; path(ctx, 3, 3, w - 6, h - 6, 10); ctx.stroke(); }); ctx.fillStyle = shade(col, -0.6); ctx.fillRect(10, 10, w - 20, 26); }, { slice: [40, 16, 16, 16], note: '툴팁 9-slice (등급별 테두리, 위쪽 이름 띠)' });
for (const st of ['normal', 'hover', 'pressed', 'disabled']) add(`hud/button_${st}.png`, 240, 72, (ctx, w, h) => button(ctx, w, h, st), { slice: [24, 28, 24, 28], note: '공용 버튼 9-slice' });
add('hud/minimap_frame.png', 220, 220, (ctx, w) => { ctx.beginPath(); ctx.arc(w / 2, w / 2, 100, 0, TAU); ctx.fillStyle = 'rgba(10,14,24,0.6)'; ctx.fill(); ctx.lineWidth = 10; ctx.strokeStyle = grad(ctx, 0, 0, w, w, [[0, C.goldL], [1, C.goldD]]); ctx.stroke(); text(ctx, 'N', w / 2, 14, { size: 16, color: C.goldL, stroke: '#3a2a0a', sw: 4 }); }, { note: '미니맵 원형 틀' });
const MM = { player: ['#ffffff', (ctx, x, y) => { ctx.beginPath(); ctx.moveTo(x, y - 9); ctx.lineTo(x + 7, y + 8); ctx.lineTo(x, y + 4); ctx.lineTo(x - 7, y + 8); ctx.closePath(); ctx.fill(); }], stairs: ['#8ad8ff', (ctx, x, y) => { for (let i = 0; i < 3; i++) ctx.fillRect(x - 8 + i * 5, y + 4 - i * 5, 16 - i * 5, 4); }], boss: ['#ff5a4a', (ctx, x, y) => { star(ctx, x, y, 10, 4, 5); ctx.fill(); }], npc: ['#4ac86a', (ctx, x, y) => { ctx.beginPath(); ctx.arc(x, y - 3, 4, 0, TAU); ctx.fill(); ctx.fillRect(x - 5, y + 2, 10, 6); }], chest: ['#ffd34a', (ctx, x, y) => { ctx.fillRect(x - 8, y - 4, 16, 10); }], portal: ['#b48aff', (ctx, x, y) => { ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x, y, 6, 9, 0, 0, TAU); ctx.stroke(); }] };
for (const [k, [col, fn]] of Object.entries(MM)) add(`hud/minimap_${k}.png`, 24, 24, (ctx, w) => { ctx.fillStyle = col; ctx.strokeStyle = col; glow(ctx, 'rgba(0,0,0,0.8)', 3, () => fn(ctx, w / 2, w / 2)); });
const CUR = {
  default: (ctx) => { ctx.beginPath(); ctx.moveTo(3, 2); ctx.lineTo(3, 26); ctx.lineTo(9, 20); ctx.lineTo(14, 30); ctx.lineTo(18, 28); ctx.lineTo(13, 18); ctx.lineTo(21, 18); ctx.closePath(); ctx.fillStyle = C.goldL; ctx.fill(); ctx.strokeStyle = '#3a2a0a'; ctx.lineWidth = 2; ctx.stroke(); },
  attack: (ctx) => { G.sword(ctx, 15, 15, 14); },
  pickup: (ctx) => { ctx.fillStyle = '#ffd8b8'; ctx.strokeStyle = '#3a2a0a'; ctx.lineWidth = 2; path(ctx, 8, 12, 16, 16, 6); ctx.fill(); ctx.stroke(); for (let i = 0; i < 4; i++) { path(ctx, 8 + i * 4, 3 + (i === 0 ? 4 : 0), 4, 12, 2); ctx.fill(); ctx.stroke(); } },
  talk: (ctx) => { path(ctx, 2, 4, 26, 18, 8); ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.strokeStyle = '#3a2a0a'; ctx.lineWidth = 2; ctx.stroke(); ctx.beginPath(); ctx.moveTo(8, 22); ctx.lineTo(6, 29); ctx.lineTo(14, 22); ctx.fill(); for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(9 + i * 6, 13, 2, 0, TAU); ctx.fillStyle = '#3a2a0a'; ctx.fill(); } },
};
for (const [k, fn] of Object.entries(CUR)) add(`hud/cursor_${k}.png`, 32, 32, (ctx) => fn(ctx), { note: '마우스 커서 (핫스팟: default 3,2 / 나머지 가운데)' });
for (const [k, top, bot, edge] of [['normal', '#ffffff', '#e0e0e0', '#3a3a3a'], ['crit', '#fff36a', '#ff8a2a', '#7a2a0a'], ['heal', '#c8ffb8', '#4ac86a', '#1f5a2a'], ['mana', '#c8e8ff', '#3a8aff', '#1a2a6a']]) add(`hud/damage_digits_${k}.png`, 32, 40, (ctx, w, h, f) => {
  // hand-made bitmap digits: chunky 5x7 pixel font scaled x4 (+ '+' for heal, '!' for crit)
  const P = { 0: ['01110', '10001', '10011', '10101', '11001', '10001', '01110'], 1: ['00100', '01100', '00100', '00100', '00100', '00100', '01110'], 2: ['01110', '10001', '00001', '00110', '01000', '10000', '11111'], 3: ['11110', '00001', '00001', '01110', '00001', '00001', '11110'], 4: ['00010', '00110', '01010', '10010', '11111', '00010', '00010'], 5: ['11111', '10000', '11110', '00001', '00001', '10001', '01110'], 6: ['00110', '01000', '10000', '11110', '10001', '10001', '01110'], 7: ['11111', '00001', '00010', '00100', '01000', '01000', '01000'], 8: ['01110', '10001', '10001', '01110', '10001', '10001', '01110'], 9: ['01110', '10001', '10001', '01111', '00001', '00010', '01100'], 10: ['00000', '00100', '00100', '11111', '00100', '00100', '00000'], 11: ['00100', '00100', '00100', '00100', '00100', '00000', '00100'] }[f];
  const px = 5; const ox = (w - 5 * px) / 2; const oy = (h - 7 * px) / 2;
  for (const pass of [0, 1]) P.forEach((row, y) => [...row].forEach((b, x) => { if (b !== '1') return; if (pass === 0) { ctx.fillStyle = edge; ctx.fillRect(ox + x * px - 2, oy + y * px - 2, px + 4, px + 4); } else { ctx.fillStyle = y < 3 ? top : bot; ctx.fillRect(ox + x * px, oy + y * px, px, px); } }));
}, { frames: 12, note: '데미지 숫자 비트맵 폰트: 0~9, +, ! (가로 12칸, 직접 그린 픽셀 숫자)' });

// == title ==
add('title/logo.png', 1024, 360, (ctx, w, h) => {
  glow(ctx, 'rgba(138,216,255,0.9)', 30, () => text(ctx, '망각의 그림자', w / 2, h * 0.45, { size: 128, weight: 900, color: grad(ctx, 0, 80, 0, 220, [[0, '#ffffff'], [0.5, C.goldL], [1, C.gold]]), stroke: '#2a1a3a', sw: 16 }));
  text(ctx, '지식의 등불을 지켜라', w / 2, h * 0.8, { size: 40, weight: 700, color: '#bfe8ff', stroke: '#1a2a3a', sw: 8 });
  for (let i = 0; i < 9; i++) { star(ctx, 120 + i * 100 + (i % 2) * 20, 40 + (i % 3) * 18, 10, 4, 4); ctx.fillStyle = '#fff6b0'; ctx.fill(); }
});

window.ASSETS = A;
window.render = (i, images = {}) => {
  const a = A[i];
  const n = a.frames ?? 1;
  const c = document.createElement('canvas');
  c.width = a.w * n; c.height = a.h;
  const ctx = c.getContext('2d');
  for (let f = 0; f < n; f++) { ctx.save(); ctx.translate(a.w * f, 0); ctx.beginPath(); ctx.rect(0, 0, a.w, a.h); ctx.clip(); a.draw(ctx, a.w, a.h, f, n, images); ctx.restore(); }
  return c.toDataURL('image/png');
};
window.manifest = () => A.map(({ path: p, w, h, frames, slice, note }) => ({ file: `ui/${p}`, w, h, ...(frames ? { frames } : {}), ...(slice ? { slice } : {}), ...(note ? { note } : {}) }));
