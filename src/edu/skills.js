// Skill effects (8 per class), basic projectiles, status effects, town portal and elite auras.
// Every skill GLB has `cast` (a ring + rising sparkles at the caster's feet) and then either
//   kind 'projectile': fly (loop, travels along +Z in game code) + impact
//   kind 'area' | 'melee' | 'move': play (one-shot, spawned where the skill lands)
//   kind 'aura':  play (loop while the buff lasts, follow the character)
// The manifest lists each skill's kind, class and colour.
import { finalizeMonster, TAU, keys, clamp01, smooth, win } from '../core/monster.js';
import { eduKit, glowMat, sizeSchema, colorSchema } from './common.js';

const Z = Math.PI / 2;
const one = (d) => ({ duration: d, loop: false });

const castAnim = {
  label: '시전 (발밑 마법진)', ...one(0.5),
  apply(r, u) {
    r.castRing.scale.setScalar(Math.max(0.001, keys(u, [[0, 0.2], [0.4, 1.1], [0.8, 1], [1, 0]])));
    r.castRing.rotation.y += u * TAU;
    r.castSparks.children.forEach((s, i) => { const f = (u * 1.5 + i / 6) % 1; s.position.y += f * 1.2; s.scale.setScalar(Math.max(0.001, Math.sin(Math.PI * f) * (1 - u * 0.5))); });
  },
};
function castParts(k, root, color) {
  const ring = k.pivot('castRing', 0, 0.02, 0);
  ring.add(k.rot(k.mesh(new k.THREE.TorusGeometry(0.5, 0.025, 3, 16), glowMat(k, 'castRing', color, 2)), Z, 0, 0));
  for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU; ring.add(k.at(k.rot(k.box(0.12, 0.012, 0.03, glowMat(k, 'castRing', color, 2), 0), 0, -a, 0), Math.cos(a) * 0.38, 0, Math.sin(a) * 0.38)); }
  ring.scale.setScalar(0.001);
  root.add(ring);
  const sparks = k.pivot('castSparks');
  for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; const s = k.pivot(`castSpark${i}`, Math.cos(a) * 0.4, 0.1, Math.sin(a) * 0.4); s.add(k.scl(k.mesh(new k.THREE.OctahedronGeometry(0.035, 0), glowMat(k, 'castSpark', '#ffffff', 2.4)), 1, 1.6, 1)); s.scale.setScalar(0.001); sparks.add(s); }
  root.add(sparks);
  return { castRing: ring, castSparks: sparks };
}

// ---- reusable shapes ---------------------------------------------------------------------
const orb = (k, g, color, r = 0.15) => { g.add(k.ball(r * 0.55, glowMat(k, 'orbCore', '#ffffff', 2.6), 1)); g.add(k.ball(r, glowMat(k, 'orbGlow', color, 1.8, 0.65), 1)); };
const arrowMesh = (k, g, color, len = 0.7) => {
  g.add(k.at(k.rot(k.cyl(0.012, 0.012, len, glowMat(k, 'arrowShaft', color, 1.2), 4), Z, 0, 0), 0, 0, -len / 2));
  g.add(k.at(k.rot(k.cone(0.035, 0.1, glowMat(k, 'arrowTip', '#ffffff', 2.4), 4), Z, 0, 0), 0, 0, 0.04));
  g.add(k.at(k.box(0.06, 0.06, 0.1, glowMat(k, 'arrowFletch', color, 1.6, 0.7), 0), 0, 0, -len + 0.05));
};
const trailPivots = (k, g, color, n = 3, gap = 0.14, r = 0.07) => {
  const t = k.pivot('trail');
  for (let i = 0; i < n; i++) { const p = k.pivot(`trail${i}`, 0, 0, -0.15 - i * gap); p.add(k.ball(r * (1 - i * 0.22), glowMat(k, 'trailGlow', color, 1.6, 0.5), 0)); t.add(p); }
  g.add(t);
  return t;
};
const ringMesh = (k, r, color, tube = 0.04, name = 'ring') => k.rot(k.mesh(new k.THREE.TorusGeometry(r, tube, 3, 20), glowMat(k, name, color, 2)), Z, 0, 0);
const flame = (k, color, h = 0.4, r = 0.12) => k.cone(r, h, glowMat(k, 'flame', color, 2, 0.85), 5);

// projectile clips shared by most projectile skills (r.shot = flying group, r.trail, r.boom)
const projAnims = (spin = 0) => ({
  fly: { label: '날아가기 (반복)', duration: 0.5, apply(r, u) { r.shot.rotation.z += spin * u * TAU; r.shot.scale.setScalar(1 + Math.sin(u * TAU * 2) * 0.06); r.trail?.children.forEach((t, i) => t.scale.setScalar(0.7 + Math.abs(Math.sin(u * TAU + i)) * 0.4)); r.boom.scale.setScalar(0.001); } },
  impact: { label: '착탄', ...one(0.6), apply(r, u) { r.shot.scale.setScalar(Math.max(0.001, keys(u, [[0, 1], [0.15, 1.6], [0.5, 0]]))); r.trail?.scale.setScalar(0.001); r.boom.scale.setScalar(u > 0.95 ? 0.001 : 0.2 + smooth(u) * 1.6); r.boom.rotation.y += u * 2; } },
});
function projectile(k, root, rig, color, shapeFn, y = 1.0) {
  const shot = k.pivot('shot', 0, y, 0);
  shapeFn(k, shot);
  root.add(shot);
  rig.trail = trailPivots(k, shot, color);
  const boom = k.pivot('boom', 0, y, 0);
  boom.add(k.ball(0.25, glowMat(k, 'boomGlow', color, 1.6, 0.45), 1));
  boom.add(k.rot(k.mesh(new k.THREE.TorusGeometry(0.3, 0.03, 3, 14), glowMat(k, 'boomRing', '#ffffff', 2.2)), 0, 0, 0));
  boom.scale.setScalar(0.001);
  root.add(boom);
  Object.assign(rig, { shot, boom });
}

// ---- skill definitions -------------------------------------------------------------------
// each: [id, label, class, kind, colour, build(k, root, rig, p), anims]
const S = [];
const def = (...a) => S.push(a);

// 수호기사
def('whirlwind', '회전베기', 'knight', 'melee', '#bfe8ff', (k, root, r, p) => {
  const arc = k.pivot('arc', 0, 0.9, 0);
  for (let i = 0; i < 3; i++) arc.add(k.at(k.rot(k.mesh(new k.THREE.TorusGeometry(0.9 - i * 0.12, 0.05 - i * 0.012, 3, 20, Math.PI * 1.3), glowMat(k, `arc${i}`, i ? p.color : '#ffffff', 2, 0.75 - i * 0.15)), Z, 0, 0), 0, -i * 0.1, 0));
  root.add(arc); r.arc = arc;
}, { play: { label: '회전 베기 (0.8초)', ...one(0.8), apply(r, u) { r.arc.rotation.y += smooth(u) * TAU * 2; r.arc.scale.setScalar(Math.max(0.001, win(u, 0, 1, 0.15))); } } });
def('shield_charge', '방패 돌진', 'knight', 'move', '#8ad8ff', (k, root, r, p) => {
  const g = k.pivot('dash', 0, 0.8, 0);
  for (let i = 0; i < 5; i++) g.add(k.at(k.box(0.05, 0.9 - i * 0.12, 0.6, glowMat(k, 'dashLine', p.color, 1.6, 0.5), 0), (i - 2) * 0.12, 0, -0.5 - Math.abs(i - 2) * 0.2));
  g.add(k.at(k.scl(k.dome(0.5, glowMat(k, 'dashFront', '#ffffff', 1.6, 0.4), 10), 1, 1, 0.4), 0, 0, 0.3)); g.children.at(-1).rotation.x = Z;
  root.add(g); r.dash = g;
}, { play: { label: '돌진 잔상 (캐릭터를 따라감)', ...one(0.6), apply(r, u) { r.dash.scale.set(1, 1, Math.max(0.001, win(u, 0, 1, 0.2) * (1 + u))); } } });
def('ground_slam', '대지 강타', 'knight', 'area', '#ffd36a', (k, root, r, p) => {
  const wave = k.pivot('wave', 0, 0.03, 0); wave.add(ringMesh(k, 1, p.color, 0.08)); root.add(wave);
  const rocks = k.pivot('rocks');
  for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; const rk = k.pivot(`rock${i}`, Math.cos(a) * 0.6, 0, Math.sin(a) * 0.6); rk.add(k.at(k.ball(0.1, k.mat('rock', '#8a7a6a'), 0, 0.02), 0, 0.08, 0)); rocks.add(rk); }
  root.add(rocks);
  const crack = k.pivot('crack', 0, 0.01, 0); for (let i = 0; i < 6; i++) crack.add(k.at(k.rot(k.box(0.9, 0.01, 0.05, glowMat(k, 'crackGlow', p.color, 2), 0), 0, (i / 6) * Math.PI, 0), 0, 0, 0)); root.add(crack);
  Object.assign(r, { wave, rocks, crack });
}, { play: { label: '충격파 + 돌 튐', ...one(1), apply(r, u) { r.wave.scale.setScalar(u > 0.95 ? 0.001 : 0.2 + smooth(u) * 2); r.crack.scale.setScalar(Math.max(0.001, keys(u, [[0, 0], [0.1, 1.2], [0.7, 1], [1, 0]]))); r.rocks.children.forEach((rk, i) => { rk.position.y += Math.sin(Math.PI * clamp01(u * 1.4)) * (0.4 + (i % 3) * 0.15); rk.scale.setScalar(Math.max(0.001, 1 - smooth(clamp01((u - 0.6) / 0.4)))); }); } } });
def('war_cry', '수호의 함성 (버프)', 'knight', 'aura', '#ffb43a', (k, root, r, p) => {
  const shout = k.pivot('shout', 0, 1.3, 0); for (let i = 0; i < 3; i++) { const s = k.pivot(`shout${i}`); s.add(ringMesh(k, 0.4, p.color, 0.03)); shout.add(s); } root.add(shout);
  const aura = k.pivot('aura', 0, 0.03, 0); aura.add(ringMesh(k, 0.55, p.color, 0.03)); for (let i = 0; i < 4; i++) aura.add(k.at(k.box(0.04, 0.5, 0.04, glowMat(k, 'auraBeam', p.color, 1.6, 0.6), 0), Math.cos(i * Z) * 0.5, 0.25, Math.sin(i * Z) * 0.5)); root.add(aura);
  Object.assign(r, { shout, aura });
}, { play: { label: '함성 파동 + 오라 (반복)', duration: 1.2, apply(r, u) { r.shout.children.forEach((s, i) => { const f = (u + i / 3) % 1; s.scale.setScalar(0.3 + f * 2.2); s.position.y += 0; }); r.aura.rotation.y += u * TAU; r.aura.scale.setScalar(1 + Math.sin(u * TAU * 2) * 0.05); } } });
def('counter_stance', '반격 태세', 'knight', 'aura', '#ffffff', (k, root, r, p) => {
  const g = k.pivot('guard', 0, 0.9, 0);
  for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; g.add(k.at(k.rot(k.scl(k.mesh(new k.THREE.OctahedronGeometry(0.18, 0), glowMat(k, 'guardShard', '#bfe8ff', 1.6, 0.6)), 0.3, 1, 0.08), 0, -a, 0), Math.cos(a) * 0.6, 0, Math.sin(a) * 0.6)); }
  root.add(g); r.guard = g;
}, { play: { label: '빛 방패 조각이 맴돎 (반복)', duration: 2, apply(r, u) { r.guard.rotation.y += u * TAU; r.guard.position.y += Math.sin(u * TAU * 2) * 0.05; } } });
def('light_blade', '빛의 검', 'knight', 'melee', '#fff3a0', (k, root, r, p) => {
  const b = k.pivot('blade', 0, 0, 0.3);
  b.add(k.at(k.box(0.22, 2.2, 0.05, glowMat(k, 'lightBlade', p.color, 2, 0.7), 0), 0, 1.1, 0));
  b.add(k.at(k.box(0.08, 2.2, 0.06, glowMat(k, 'lightCore', '#ffffff', 2.6), 0), 0, 1.1, 0));
  b.add(k.at(k.box(0.7, 0.12, 0.08, glowMat(k, 'lightGuard', p.color, 2), 0), 0, 0.05, 0));
  root.add(b); r.blade = b;
}, { play: { label: '거대한 빛의 검이 내려침', ...one(1), apply(r, u) { r.blade.rotation.x += keys(u, [[0, -0.6], [0.35, -0.6], [0.5, 1.5], [1, 1.5]]); r.blade.scale.setScalar(Math.max(0.001, keys(u, [[0, 0], [0.25, 1], [0.8, 1], [1, 0]]))); } } });
def('taunt', '도발', 'knight', 'aura', '#ff6a4a', (k, root, r, p) => {
  const mark = k.pivot('mark', 0, 2.0, 0);
  mark.add(k.at(k.box(0.08, 0.3, 0.04, glowMat(k, 'tauntMark', p.color, 2.2), 0), 0, 0.08, 0)); mark.add(k.at(k.box(0.08, 0.08, 0.04, glowMat(k, 'tauntMark', p.color, 2.2), 0), 0, -0.17, 0));
  root.add(mark);
  const pulse = k.pivot('pulse', 0, 0.03, 0); pulse.add(ringMesh(k, 0.5, p.color, 0.03)); root.add(pulse);
  Object.assign(r, { mark, pulse });
}, { play: { label: '머리 위 느낌표 + 파동 (반복)', duration: 1, apply(r, u) { r.mark.position.y += Math.abs(Math.sin(u * TAU)) * 0.1; r.mark.scale.setScalar(1 + Math.sin(u * TAU * 2) * 0.1); r.pulse.scale.setScalar(0.3 + u * 3); } } });
def('sanctuary', '성역', 'knight', 'area', '#fff3a0', (k, root, r, p) => {
  const g = k.pivot('holy', 0, 0.02, 0);
  g.add(ringMesh(k, 2, p.color, 0.05)); g.add(k.scl(k.cyl(2, 2, 0.01, glowMat(k, 'holyFloor', p.color, 0.8, 0.25), 24), 1, 1, 1));
  for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; g.add(k.at(k.cyl(0.04, 0.08, 1.2, glowMat(k, 'holyPillar', '#ffffff', 1.8, 0.5), 5), Math.cos(a) * 1.8, 0.6, Math.sin(a) * 1.8)); }
  root.add(g); r.holy = g;
}, { play: { label: '빛의 영역 (반복, 안에서 회복)', duration: 2.4, apply(r, u) { r.holy.rotation.y += u * TAU * 0.5; r.holy.scale.setScalar(1 + Math.sin(u * TAU) * 0.02); } } });

// 별사냥꾼
def('multi_shot', '다중 사격', 'hunter', 'projectile', '#ffd34a', (k, root, r, p) => projectile(k, root, r, p.color, (k2, g) => { for (const a of [-0.35, -0.17, 0, 0.17, 0.35]) { const s = k2.pivot(`arrow${Math.round(a * 100)}`); s.rotation.y = a; arrowMesh(k2, s, p.color, 0.5); g.add(s); } }), projAnims());
def('piercing_arrow', '관통 화살', 'hunter', 'projectile', '#8ad8ff', (k, root, r, p) => projectile(k, root, r, p.color, (k2, g) => { arrowMesh(k2, g, p.color, 1.0); g.add(k2.at(k2.rot(k2.mesh(new k2.THREE.TorusGeometry(0.12, 0.02, 3, 12), glowMat(k2, 'pierceRing', p.color, 2)), 0, 0, 0), 0, 0, -0.2)); }), projAnims(1));
def('trap', '덫 설치', 'hunter', 'area', '#a0ff6a', (k, root, r, p) => {
  const t = k.pivot('trapBase', 0, 0.02, 0);
  t.add(k.scl(k.cyl(0.35, 0.35, 0.04, k.mat('trapWood', '#8a5a32'), 10), 1, 1, 1));
  t.add(ringMesh(k, 0.4, p.color, 0.025));
  const jaws = k.pivot('jaws', 0, 0.04, 0);
  for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; jaws.add(k.at(k.rot(k.cone(0.04, 0.15, glowMat(k, 'trapTooth', p.color, 1.4), 4), 0, 0, 0), Math.cos(a) * 0.28, 0.06, Math.sin(a) * 0.28)); }
  t.add(jaws); root.add(t);
  const net = k.pivot('net', 0, 0.5, 0); for (let i = 0; i < 4; i++) net.add(k.rot(k.box(1.2, 0.02, 0.02, glowMat(k, 'trapNet', p.color, 1.8), 0), 0, (i / 4) * Math.PI, 0)); net.scale.setScalar(0.001); root.add(net);
  Object.assign(r, { jaws, net });
}, { play: { label: '발동 (덩굴 그물이 덮침)', ...one(1), apply(r, u) { r.jaws.scale.set(1, 1 + keys(u, [[0, 0], [0.2, 1.5], [1, 1.2]]), 1); r.net.scale.setScalar(Math.max(0.001, keys(u, [[0, 0], [0.2, 1.4], [0.4, 1], [0.85, 1], [1, 0]]))); r.net.position.y -= smooth(clamp01(u / 0.4)) * 0.4; r.net.rotation.y += u; } } });
def('roll', '구르기', 'hunter', 'move', '#e8d8b8', (k, root, r, p) => {
  const dust = k.pivot('dust');
  for (let i = 0; i < 6; i++) { const d = k.pivot(`dust${i}`, (i % 2 ? 0.2 : -0.2), 0.1, -i * 0.2); d.add(k.ball(0.12, k.mat('dustPuff', p.color, { transparent: true, opacity: 0.7 }), 0)); dust.add(d); }
  root.add(dust); r.dust = dust;
}, { play: { label: '흙먼지 (뒤에 남김)', ...one(0.7), apply(r, u) { r.dust.children.forEach((d, i) => { const f = clamp01(u * 1.5 - i * 0.08); d.scale.setScalar(Math.max(0.001, Math.sin(Math.PI * f) * (1 + f))); d.position.y += f * 0.2; }); } } });
def('poison_arrow', '독화살', 'hunter', 'projectile', '#8aff4a', (k, root, r, p) => projectile(k, root, r, p.color, (k2, g) => { arrowMesh(k2, g, p.color, 0.7); for (let i = 0; i < 3; i++) g.add(k2.at(k2.ball(0.04, glowMat(k2, 'poisonDrop', p.color, 1.6), 0), Math.sin(i * 2) * 0.06, Math.cos(i * 2) * 0.06, -0.3 - i * 0.12)); }), projAnims());
def('arrow_rain', '화살비', 'hunter', 'area', '#ffd34a', (k, root, r, p) => {
  const rain = k.pivot('rain', 0, 4, 0);
  for (let i = 0; i < 12; i++) { const a = i * 2.4; const rr = 0.3 + (i % 4) * 0.35; const ar = k.pivot(`rainArrow${i}`, Math.cos(a) * rr, (i % 3) * 0.6, Math.sin(a) * rr); ar.rotation.x = Z; arrowMesh(k, ar, p.color, 0.5); rain.add(ar); }
  root.add(rain);
  const mark = k.pivot('rainMark', 0, 0.02, 0); mark.add(ringMesh(k, 1.5, p.color, 0.04)); root.add(mark);
  Object.assign(r, { rain, mark });
}, { play: { label: '하늘에서 화살이 쏟아짐 (반복)', duration: 0.8, apply(r, u) { r.rain.children.forEach((a, i) => { const f = (u + i / 12) % 1; a.position.y -= f * 4; a.scale.setScalar(f > 0.95 ? 0.001 : 1); }); r.mark.scale.setScalar(1 + Math.sin(u * TAU) * 0.03); } } });
def('hawk', '매 소환', 'hunter', 'aura', '#c89a5a', (k, root, r, p) => {
  const orbit = k.pivot('hawkOrbit', 0, 1.8, 0);
  const hawk = k.pivot('hawk', 1, 0, 0);
  const fea = k.mat('hawkFeather', p.color); const belly = k.mat('hawkBelly', '#f2e6c8');
  hawk.add(k.scl(k.ball(0.12, fea, 1), 0.9, 0.8, 1.4)); hawk.add(k.at(k.scl(k.ball(0.08, belly, 0), 0.8, 0.7, 1), 0, -0.04, 0.03));
  hawk.add(k.at(k.ball(0.08, fea, 1), 0, 0.06, 0.15)); hawk.add(k.at(k.rot(k.cone(0.025, 0.06, k.mat('hawkBeak', '#f2c14e'), 4), Z, 0, 0), 0, 0.05, 0.25));
  for (const s of [-1, 1]) hawk.add(k.at(k.ball(0.018, k.mat('hawkEye', '#1d1b26'), 0), s * 0.045, 0.09, 0.21));
  const wings = [];
  for (const [n, s] of [['L', 1], ['R', -1]]) { const w = k.pivot(`hawkWing${n}`, s * 0.08, 0.03, 0); w.add(k.at(k.scl(k.ball(0.12, fea, 0), 1.6, 0.15, 0.6), s * 0.18, 0, 0)); hawk.add(w); wings.push(w); }
  hawk.rotation.y = Math.PI; // flies counter-clockwise around the hunter
  orbit.add(hawk); root.add(orbit);
  Object.assign(r, { orbit, hawk, wings });
}, { play: { label: '매가 주위를 선회 (반복)', duration: 2, apply(r, u) { r.orbit.rotation.y += u * TAU; r.hawk.position.y += Math.sin(u * TAU * 2) * 0.1; r.wings[0].rotation.z += Math.sin(u * TAU * 8) * 0.6; r.wings[1].rotation.z -= Math.sin(u * TAU * 8) * 0.6; } } });
def('snipe', '저격', 'hunter', 'projectile', '#ffffff', (k, root, r, p) => projectile(k, root, r, '#fff3a0', (k2, g) => { arrowMesh(k2, g, '#fff3a0', 1.0); g.add(k2.at(k2.rot(k2.cyl(0.03, 0.03, 3, glowMat(k2, 'snipeLine', '#fff3a0', 1.6, 0.35), 5), Z, 0, 0), 0, 0, -1.6)); }), projAnims());

// 현자
def('fireball', '화염구', 'sage', 'projectile', '#ff7a2a', (k, root, r, p) => projectile(k, root, r, p.color, (k2, g) => { orb(k2, g, p.color, 0.2); for (let i = 0; i < 5; i++) { const f = flame(k2, i % 2 ? '#ffd34a' : p.color, 0.35, 0.08); f.rotation.x = -Z; f.position.set(Math.cos(i * 1.3) * 0.08, Math.sin(i * 1.3) * 0.08, -0.2); g.add(f); } }), projAnims(1));
def('ice_spear', '얼음 창', 'sage', 'projectile', '#8ad8ff', (k, root, r, p) => projectile(k, root, r, p.color, (k2, g) => { g.add(k2.rot(k2.cone(0.08, 0.9, glowMat(k2, 'iceSpear', p.color, 1.4, 0.85), 5), Z, 0, 0)); g.children.at(-1).position.z = -0.1; for (let i = 0; i < 3; i++) g.add(k2.at(k2.scl(k2.mesh(new k2.THREE.OctahedronGeometry(0.05, 0), glowMat(k2, 'iceChip', '#ffffff', 2)), 1, 1, 2), Math.cos(i * 2.1) * 0.12, Math.sin(i * 2.1) * 0.12, -0.4)); }), projAnims(0.5));
def('chain_lightning', '연쇄 번개', 'sage', 'area', '#fff36a', (k, root, r, p) => {
  // a zig-zag bolt from the origin forward to +Z 4 m; game code can stretch it between targets
  const bolt = k.pivot('bolt', 0, 1, 0);
  let x = 0; let y = 0;
  for (let i = 0; i < 8; i++) { const nx = (i % 2 ? 1 : -1) * 0.18; const ny = Math.sin(i * 1.7) * 0.15; const len = Math.hypot(nx - x, ny - y, 0.5); const seg = k.box(0.05, 0.05, len, glowMat(k, 'bolt', p.color, 2.4), 0); seg.position.set((x + nx) / 2, (y + ny) / 2, i * 0.5 + 0.25); seg.lookAt(nx, ny, (i + 1) * 0.5); bolt.add(seg); x = nx; y = ny; }
  root.add(bolt); r.bolt = bolt;
}, { play: { label: '번쩍이며 이어짐 (+Z로 4m)', ...one(0.6), apply(r, u) { r.bolt.scale.set(1 + Math.sin(u * TAU * 10) * 0.3, 1 + Math.sin(u * TAU * 13) * 0.3, Math.max(0.001, keys(u, [[0, 0], [0.15, 1], [0.8, 1], [1, 0]]))); } } });
def('teleport', '순간이동', 'sage', 'move', '#d8a0ff', (k, root, r, p) => {
  const col = k.pivot('poof', 0, 0, 0);
  col.add(k.at(k.cyl(0.4, 0.5, 2, glowMat(k, 'teleCol', p.color, 1.4, 0.35), 10), 0, 1, 0));
  for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; col.add(k.at(k.mesh(new k.THREE.OctahedronGeometry(0.05, 0), glowMat(k, 'teleStar', '#ffffff', 2.4)), Math.cos(a) * 0.5, 0.3 + (i % 4) * 0.4, Math.sin(a) * 0.5)); }
  root.add(col); r.poof = col;
}, { play: { label: '빛 기둥으로 사라졌다 나타남 (출발·도착 지점에 하나씩)', ...one(0.8), apply(r, u) { r.poof.scale.set(Math.max(0.001, keys(u, [[0, 0.2], [0.3, 1], [1, 0]])), Math.max(0.001, keys(u, [[0, 0], [0.25, 1.2], [1, 1.5]])), Math.max(0.001, keys(u, [[0, 0.2], [0.3, 1], [1, 0]]))); r.poof.rotation.y += u * TAU; } } });
def('mana_shield', '마나 보호막', 'sage', 'aura', '#6aa8ff', (k, root, r, p) => {
  const sh = k.pivot('bubble', 0, 0.85, 0);
  sh.add(k.scl(k.mesh(new k.THREE.IcosahedronGeometry(0.85, 1), glowMat(k, 'manaBubble', p.color, 0.8, 0.25)), 1, 1.1, 1));
  for (let i = 0; i < 3; i++) sh.add(k.rot(k.mesh(new k.THREE.TorusGeometry(0.86, 0.015, 3, 24), glowMat(k, 'manaBand', p.color, 2)), i * 1.05, i * 0.7, 0)); // glowing bands (glTF has no wireframe)
  root.add(sh); r.bubble = sh;
}, { play: { label: '푸른 보호막 (반복)', duration: 2, apply(r, u) { r.bubble.rotation.y += u * TAU * 0.5; r.bubble.scale.setScalar(1 + Math.sin(u * TAU * 2) * 0.03); } } });
def('fire_wall', '화염 벽', 'sage', 'area', '#ff7a2a', (k, root, r, p) => {
  const wall = k.pivot('wall');
  for (let i = 0; i < 9; i++) { const f = k.pivot(`wallFlame${i}`, (i - 4) * 0.35, 0, 0); f.add(k.at(flame(k, i % 2 ? '#ffd34a' : p.color, 0.9, 0.2), 0, 0.45, 0)); f.add(k.at(flame(k, '#ffffff', 0.4, 0.08), 0, 0.2, 0.05)); wall.add(f); }
  root.add(wall); r.wall = wall;
}, { play: { label: '불꽃 벽 (반복, X축 3m)', duration: 0.9, apply(r, u) { r.wall.children.forEach((f, i) => { f.scale.set(1, 0.85 + Math.abs(Math.sin(u * TAU + i * 1.3)) * 0.35, 1); }); } } });
def('blizzard', '눈보라', 'sage', 'area', '#bff0ff', (k, root, r, p) => {
  const storm = k.pivot('storm');
  for (let i = 0; i < 16; i++) { const a = i * 2.4; const rr = 0.3 + (i % 5) * 0.35; const f = k.pivot(`flake${i}`, Math.cos(a) * rr, 0.3 + (i % 4) * 0.5, Math.sin(a) * rr); f.add(k.mesh(new k.THREE.OctahedronGeometry(0.06, 0), glowMat(k, 'snowflake', '#ffffff', 2))); storm.add(f); }
  storm.add(k.at(k.cyl(1.8, 1.4, 2.2, glowMat(k, 'blizzardWind', p.color, 0.8, 0.18), 12), 0, 1.1, 0));
  root.add(storm);
  const ice = k.pivot('frostFloor', 0, 0.02, 0); ice.add(k.cyl(1.8, 1.8, 0.01, glowMat(k, 'frost', p.color, 0.8, 0.35), 18)); root.add(ice);
  Object.assign(r, { storm });
}, { play: { label: '회오리 눈보라 (반복)', duration: 1.6, apply(r, u) { r.storm.rotation.y += u * TAU; r.storm.children.forEach((f, i) => { if (f.name.startsWith('flake')) f.position.y -= ((u * 2 + i / 16) % 1) * 0.4; }); } } });
def('meteor', '유성', 'sage', 'area', '#ff8a3a', (k, root, r, p) => {
  const rock = k.pivot('meteorRock', 0, 6, -2);
  rock.add(k.ball(0.45, k.mat('meteorStone', '#6a4a3a', { emissive: '#ff5a1a', emissiveIntensity: 0.6 }), 1, 0.05));
  for (let i = 0; i < 4; i++) { const f = flame(k, i % 2 ? '#ffd34a' : p.color, 1.2, 0.3); f.rotation.x = Z * 0.65; f.position.set(Math.cos(i * 1.6) * 0.15, 0.3, -0.4 + Math.sin(i * 1.6) * 0.15); rock.add(f); }
  root.add(rock);
  const mark = k.pivot('meteorMark', 0, 0.02, 0); mark.add(ringMesh(k, 1.4, p.color, 0.05)); root.add(mark);
  const blast = k.pivot('blast', 0, 0.3, 0); blast.add(k.scl(k.ball(1.2, glowMat(k, 'blast', p.color, 1.6, 0.5), 1), 1, 0.6, 1)); blast.scale.setScalar(0.001); root.add(blast);
  Object.assign(r, { rock, mark, blast });
}, { play: { label: '경고 원 → 떨어짐 → 폭발', ...one(1.8), apply(r, u) { const fall = smooth(clamp01((u - 0.3) / 0.3)); r.rock.position.y -= fall * 5.6; r.rock.position.z += fall * 2; r.rock.scale.setScalar(u < 0.6 ? 1 : 0.001); r.mark.scale.setScalar(Math.max(0.001, keys(u, [[0, 0.3], [0.3, 1], [0.6, 1], [0.7, 0]]))); r.blast.scale.setScalar(Math.max(0.001, keys(u, [[0, 0], [0.6, 0], [0.7, 1.2], [1, 0]]))); } } });

// ---- builder -------------------------------------------------------------------------------
const CLASS_LABEL = { knight: '🛡️ 수호기사 스킬', hunter: '🏹 별사냥꾼 스킬', sage: '🔮 현자 스킬' };
const KIND_LABEL = { projectile: '투사체', area: '범위', melee: '근접', move: '이동', aura: '버프' };
function makeSkill([id, label, cls, kind, color, build, anims]) {
  const name = `skill_${cls}_${id}`;
  const animations = { cast: castAnim, ...anims };
  return {
    label: `${label} (${KIND_LABEL[kind]})`, role: CLASS_LABEL[cls], file: `vfx/skills/${name}.glb`, skill: { id, cls, kind, color },
    defaults: { seed: 1000, size: 1, color },
    schema: { ...sizeSchema, ...colorSchema({ color: '스킬 색' }) },
    build(p) {
      const k = eduKit(p.seed, 0);
      const root = k.pivot('root');
      root.name = name;
      root.scale.setScalar(p.size);
      const rig = castParts(k, root, p.color);
      build(k, root, rig, p);
      return finalizeMonster(root, { rig, params: p, animations, clips: Object.fromEntries(Object.keys(animations).map((c) => [c, c])) });
    },
  };
}
export const EDU_SKILLS = Object.fromEntries(S.map((s) => { const sk = makeSkill(s); return [`skill_${s[2]}_${s[0]}`, sk]; }));

// ---- basic attack projectiles --------------------------------------------------------------
function basicProjectile(name, label, color, shapeFn) {
  return {
    label, role: '🎯 기본 공격 투사체', file: `vfx/${name}.glb`,
    defaults: { seed: 1100, size: 1, color }, schema: { ...sizeSchema, ...colorSchema({ color: '색' }) },
    build(p) {
      const k = eduKit(p.seed, 0);
      const root = k.pivot('root');
      root.name = name;
      root.scale.setScalar(p.size);
      const rig = {};
      projectile(k, root, rig, p.color, (k2, g) => shapeFn(k2, g, p.color));
      const anims = projAnims(name === 'fx_magic_bolt' ? 1 : 0);
      return finalizeMonster(root, { rig, params: p, animations: anims, clips: { fly: 'fly', impact: 'impact' } });
    },
  };
}
export const EDU_BASIC_PROJECTILES = {
  fx_arrow: basicProjectile('fx_arrow', '화살 (별사냥꾼 기본 공격)', '#ffe08a', (k, g, c) => arrowMesh(k, g, c, 0.6)),
  fx_magic_bolt: basicProjectile('fx_magic_bolt', '마력탄 (현자 기본 공격)', '#b48aff', (k, g, c) => orb(k, g, c, 0.11)),
};

// ---- status effects, portal, elite auras (all loop: attach to the character) ---------------
function loopFx(name, label, role, color, build, apply, duration = 1.2) {
  return {
    label, role, file: `vfx/${name}.glb`,
    defaults: { seed: 1200, size: 1, color }, schema: { ...sizeSchema, ...colorSchema({ color: '색' }) },
    build(p) {
      const k = eduKit(p.seed, 0);
      const root = k.pivot('root');
      root.name = name;
      root.scale.setScalar(p.size);
      const rig = {};
      build(k, root, rig, p.color);
      return finalizeMonster(root, { rig, params: p, animations: { play: { label: '재생 (반복)', duration, apply } }, clips: { play: 'play' } });
    },
  };
}
const motes = (k, root, rig, color, shape, n = 6, r = 0.35, name = 'motes') => {
  const g = k.pivot(name);
  for (let i = 0; i < n; i++) { const a = (i / n) * TAU; const m = k.pivot(`${name}${i}`, Math.cos(a) * r, 0.2 + (i % 3) * 0.3, Math.sin(a) * r); m.add(shape(k, i)); g.add(m); }
  root.add(g);
  rig[name] = g;
  return g;
};
const rise = (g, u, h = 1.2) => g.children.forEach((m, i) => { const f = (u + i / g.children.length) % 1; m.position.y += f * h; m.scale.setScalar(Math.max(0.001, Math.sin(Math.PI * f))); });

export const EDU_STATUS = {
  fx_status_burn: loopFx('fx_status_burn', '상태 이상: 화상', '🔥 상태 이상', '#ff7a2a', (k, root, r, c) => motes(k, root, r, c, (k2, i) => flame(k2, i % 2 ? '#ffd34a' : c, 0.25, 0.07)), (r, u) => rise(r.motes, u, 1.0)),
  fx_status_freeze: loopFx('fx_status_freeze', '상태 이상: 빙결', '❄️ 상태 이상', '#8ad8ff', (k, root, r, c) => {
    const ice = k.pivot('iceBlock', 0, 0.6, 0);
    ice.add(k.scl(k.mesh(new k.THREE.IcosahedronGeometry(0.55, 0), glowMat(k, 'iceBlock', c, 0.6, 0.35)), 1, 1.4, 1));
    for (let i = 0; i < 5; i++) ice.add(k.at(k.rot(k.scl(k.mesh(new k.THREE.OctahedronGeometry(0.12, 0), glowMat(k, 'iceSpike', '#ffffff', 1.4, 0.7)), 0.5, 1.5, 0.5), 0, 0, (i - 2) * 0.4), (i - 2) * 0.2, 0.6, 0.2));
    root.add(ice); r.ice = ice;
  }, (r, u) => { r.ice.scale.setScalar(1 + Math.sin(u * TAU) * 0.02); }, 2),
  fx_status_poison: loopFx('fx_status_poison', '상태 이상: 중독', '☠️ 상태 이상', '#8aff4a', (k, root, r, c) => motes(k, root, r, c, (k2) => k2.ball(0.06, glowMat(k2, 'bubble', c, 1.4, 0.7), 0)), (r, u) => rise(r.motes, u, 1.4)),
  fx_status_stun: loopFx('fx_status_stun', '상태 이상: 기절 (머리 위 별)', '💫 상태 이상', '#ffe14a', (k, root, r, c) => {
    const ring = k.pivot('stars', 0, 1.75, 0);
    for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU; const s = k.pivot(`star${i}`, Math.cos(a) * 0.28, 0, Math.sin(a) * 0.28); s.add(k.mesh(new k.THREE.OctahedronGeometry(0.07, 0), glowMat(k, 'stunStar', c, 2.4))); ring.add(s); }
    root.add(ring); r.stars = ring;
  }, (r, u) => { r.stars.rotation.y += u * TAU; r.stars.children.forEach((s, i) => { s.position.y += Math.sin(u * TAU * 2 + i) * 0.04; s.rotation.y += u * TAU * 2; }); }),
  fx_portal: loopFx('fx_portal', '마을 포탈', '🌀 포탈', '#8ad8ff', (k, root, r, c) => {
    const p = k.pivot('portal', 0, 1.2, 0);
    p.add(k.scl(k.mesh(new k.THREE.TorusGeometry(0.75, 0.07, 4, 24), glowMat(k, 'portalRim', c, 2.2)), 1, 1.3, 1));
    p.add(k.scl(k.cyl(0.72, 0.72, 0.02, glowMat(k, 'portalFace', '#3a5ab8', 1.2, 0.7), 20), 1, 1, 1.3)); p.children.at(-1).rotation.x = Z;
    const swirl = k.pivot('swirl');
    for (let i = 0; i < 3; i++) swirl.add(k.rot(k.mesh(new k.THREE.TorusGeometry(0.25 + i * 0.15, 0.02, 3, 16, Math.PI * 1.2), glowMat(k, 'portalSwirl', '#ffffff', 2, 0.7)), 0, 0, i * 2));
    swirl.position.z = 0.02; swirl.scale.y = 1.3;
    p.add(swirl);
    p.add(k.at(k.box(1.8, 0.1, 0.6, k.mat('portalBase', '#8f9a96'), 0.01), 0, -1.2, 0));
    root.add(p);
    Object.assign(r, { portal: p, swirl });
  }, (r, u) => { r.swirl.rotation.z -= u * TAU; r.portal.scale.setScalar(1 + Math.sin(u * TAU) * 0.02); }, 2),
};

const footRing = (k, root, c, r = 0.6, name = 'auraRing') => { const g = k.pivot(name, 0, 0.03, 0); g.add(ringMesh(k, r, c, 0.04)); root.add(g); return g; };
export const EDU_ELITE = {
  fx_elite_giant: loopFx('fx_elite_giant', '엘리트: 거대화 (몬스터를 1.5배로 키우고 함께 사용)', '⭐ 엘리트 오라', '#ff4a4a', (k, root, r, c) => {
    r.ring = footRing(k, root, c, 0.8);
    r.arrows = motes(k, root, r, c, (k2) => k2.rot(k2.cone(0.08, 0.16, glowMat(k2, 'giantArrow', c, 2), 3), 0, 0, 0), 4, 0.8, 'arrows');
  }, (r, u) => { r.ring.scale.setScalar(1 + Math.sin(u * TAU) * 0.05); rise(r.arrows, u, 0.6); }),
  fx_elite_haste: loopFx('fx_elite_haste', '엘리트: 신속 (잔상)', '⭐ 엘리트 오라', '#6affd8', (k, root, r, c) => {
    const g = k.pivot('streaks', 0, 0.5, -0.3);
    for (let i = 0; i < 5; i++) g.add(k.at(k.box(0.03, 0.03, 0.8, glowMat(k, 'streak', c, 2, 0.6), 0), (i - 2) * 0.15, (i % 3) * 0.25, -i * 0.05));
    root.add(g); r.streaks = g; r.ring = footRing(k, root, c, 0.5);
  }, (r, u) => { r.streaks.children.forEach((s, i) => { s.position.z -= ((u * 2 + i / 5) % 1) * 0.6; }); }, 0.6),
  fx_elite_fire: loopFx('fx_elite_fire', '엘리트: 화염 오라 (발밑 불꽃 링)', '⭐ 엘리트 오라', '#ff7a2a', (k, root, r, c) => {
    const g = k.pivot('fireRing');
    for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU; const f = k.pivot(`ringFlame${i}`, Math.cos(a) * 0.7, 0, Math.sin(a) * 0.7); f.add(k.at(flame(k, i % 2 ? '#ffd34a' : c, 0.35, 0.09), 0, 0.17, 0)); g.add(f); }
    root.add(g); r.fire = g; footRing(k, root, c, 0.7);
  }, (r, u) => { r.fire.rotation.y += u * TAU * 0.5; r.fire.children.forEach((f, i) => f.scale.set(1, 0.7 + Math.abs(Math.sin(u * TAU * 2 + i)) * 0.5, 1)); }),
  fx_elite_frost: loopFx('fx_elite_frost', '엘리트: 냉기 (얼음 결정 오라)', '⭐ 엘리트 오라', '#8ad8ff', (k, root, r, c) => {
    r.crystals = motes(k, root, r, c, (k2) => k2.scl(k2.mesh(new k2.THREE.OctahedronGeometry(0.1, 0), glowMat(k2, 'frostCrystal', c, 1.6, 0.8)), 0.6, 1.4, 0.6), 6, 0.7, 'crystals');
    footRing(k, root, c, 0.7);
  }, (r, u) => { r.crystals.rotation.y += u * TAU; r.crystals.children.forEach((m, i) => { m.position.y += Math.sin(u * TAU + i) * 0.1; }); }, 3),
  fx_elite_split: loopFx('fx_elite_split', '엘리트: 분열 (처치하면 2마리로 나뉜다는 표시)', '⭐ 엘리트 오라', '#d8a0ff', (k, root, r, c) => {
    const g = k.pivot('splitMark', 0, 1.6, 0);
    for (const s of [-1, 1]) g.add(k.at(k.ball(0.08, glowMat(k, 'splitOrb', c, 2), 0), s * 0.1, 0, 0));
    g.add(k.box(0.03, 0.2, 0.03, glowMat(k, 'splitLine', '#ffffff', 2), 0));
    root.add(g); r.mark = g; r.ring = footRing(k, root, c, 0.55);
  }, (r, u) => { r.mark.children.forEach((m, i) => { if (i < 2) m.position.x += (i ? 1 : -1) * Math.abs(Math.sin(u * TAU)) * 0.08; }); r.mark.position.y += Math.sin(u * TAU) * 0.04; }),
  fx_elite_shield: loopFx('fx_elite_shield', '엘리트: 보호막 (반투명 구체)', '⭐ 엘리트 오라', '#6aa8ff', (k, root, r, c) => {
    const b = k.pivot('shieldBubble', 0, 0.6, 0);
    b.add(k.mesh(new k.THREE.IcosahedronGeometry(0.75, 1), glowMat(k, 'eliteBubble', c, 0.8, 0.25)));
    for (let i = 0; i < 3; i++) b.add(k.rot(k.mesh(new k.THREE.TorusGeometry(0.76, 0.012, 3, 24), glowMat(k, 'eliteBand', c, 2)), i * 1.05, i * 0.7, 0));
    root.add(b); r.bubble = b;
  }, (r, u) => { r.bubble.rotation.y += u * TAU * 0.5; r.bubble.scale.setScalar(1 + Math.sin(u * TAU * 2) * 0.03); }, 2),
};
