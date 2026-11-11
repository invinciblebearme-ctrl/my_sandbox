// Space Base: 7 monsters in the same rotten style as the zombies.
import { createKit } from '../../core/kit.js';
import { finalizeMonster, TAU, keys, blink, smooth, clamp01 } from '../../core/monster.js';
import { buildSpider, SPIDER_ANIMS } from '../../rigs/spider.js';
import { buildSerpent, SERPENT_ANIMS } from '../../rigs/serpent.js';
import { createZombie, DEFAULT_PARAMS as ZOMBIE } from '../graveyard/zombie.js';

const sides = [['L', 1], ['R', -1]];
const blinkEyes = (rig, a) => rig.eyes.forEach((e) => { e.scale.y = Math.max(0.08, 1 - a); });
const common = {
  seed: { label: '시드', min: 1, max: 999, step: 1 },
  size: { label: '크기', min: 0.5, max: 2, step: 0.01 },
};
const zombieSchema = {
  seed: common.seed,
  height: { label: '키', min: 0.7, max: 1.4, step: 0.01 },
  bulk: { label: '덩치', min: 0.6, max: 1.8, step: 0.01 },
  hunch: { label: '구부정함', min: 0, max: 0.8, step: 0.01 },
  rot: { label: '울퉁불퉁함', min: 0, max: 1.5, step: 0.01 },
  wounds: { label: '상처 수', min: 0, max: 14, step: 1 },
  skinColor: { label: '피부 색' }, shirtColor: { label: '옷 색' }, pantsColor: { label: '바지 색' },
  eyeColor: { label: '눈 색' },
};
const zclips = (over) => ({ idle: 'idle', move: 'shamble', attack: 'bite', hit: 'hit', death: 'death', ...over });

// ---- ① 기본형: 감염된 우주인 ------------------------------------------------------
export const infectedAstronaut = {
  label: '감염된 우주인',
  role: '① 기본형',
  defaults: {
    ...ZOMBIE, seed: 51, clips: zclips(), bulk: 1.1, hunch: 0.3, armReach: 0.8, headTilt: 0.3, jawOpen: 0.45,
    rot: 0.6, wounds: 5, hair: 0, tornClothes: true, skinColor: '#8fb38a', shirtColor: '#d8dde2', pantsColor: '#c9ced4',
    eyeColor: '#7dff6a', bloodColor: '#3f7a2a', suitColor: '#e87a2a',
  },
  schema: { ...zombieSchema, suitColor: { label: '우주복 줄 색' }, bloodColor: { label: '감염 체액 색' } },
  build(p) {
    return createZombie({ ...p, name: 'InfectedAstronaut' }, ({ rig, box, mat, at, mesh, THREE, b }) => {
      const stripe = mat('suitStripe', p.suitColor);
      const metal = mat('suitMetal', '#8a9098', { metalness: 0.4, roughness: 0.5 });
      // cracked helmet: collar ring + broken glass shell around the head
      rig.neck.add(at(mesh(new THREE.CylinderGeometry(0.17, 0.19, 0.06, 10), metal, 0.004), 0, 0.03, 0));
      const glass = mat('helmetGlass', '#a8d8ff', { transparent: true, opacity: 0.35, roughness: 0.1, metalness: 0.2 });
      const shell = mesh(new THREE.IcosahedronGeometry(0.25, 1), glass, 0.02);
      rig.head.add(at(shell, 0, 0.16, 0.01));
      rig.head.add(at(box(0.12, 0.012, 0.012, mat('crack', '#e8f6ff'), 0), 0.07, 0.25, 0.22));
      // oxygen tanks, chest panel, stripes
      for (const s of [-1, 1]) rig.spine.add(at(mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.4, 8), metal, 0.004), s * 0.08 * b, 0.4, -0.18 * b));
      rig.spine.add(at(box(0.16, 0.1, 0.03, mat('panel', '#3a3f48'), 0), 0.06 * b, 0.48, 0.14 * b));
      rig.spine.add(at(box(0.03, 0.03, 0.02, mat('panelLight', '#ff3a2a', { emissive: '#ff3a2a', emissiveIntensity: 2 }), 0), 0.1 * b, 0.48, 0.16 * b));
      rig.spine.add(at(box(0.45 * b, 0.05, 0.27 * b, stripe, 0.004), 0, 0.3, 0));
      for (const [n] of sides) rig.arms[n].shoulder.add(at(box(0.15 * b, 0.05, 0.15 * b, stripe, 0.004), 0, -0.14, 0));
      // alien growth bursting out of the back
      const growth = mat('growth', '#5aa84a');
      for (let i = 0; i < 5; i++) rig.spine.add(at(mesh(new THREE.IcosahedronGeometry(0.04 + i * 0.01, 0), growth, 0.01), (i - 2) * 0.05, 0.55 - i * 0.03, -0.2 * b));
    });
  },
};

// ---- ② 돌격형: 외계 벌레 ---------------------------------------------------------
export const alienBug = {
  label: '외계 벌레',
  role: '② 돌격형',
  defaults: { seed: 53, size: 1, legLength: 0.55, shellColor: '#6a3f8a', legColor: '#3f2a55', glowColor: '#9dff5a' },
  schema: { ...common, legLength: { label: '다리 길이', min: 0.35, max: 0.8, step: 0.01 }, shellColor: { label: '껍질 색' }, legColor: { label: '다리 색' }, glowColor: { label: '발광 색' } },
  build(p) {
    const k = createKit(p.seed, 1, p.horror, { eyeColor: '#9dff5a' });
    const shell = k.mat('shell', p.shellColor);
    const { root, rig } = buildSpider(k, {
      name: 'AlienBug', pairs: 3, bodyR: 0.2, abdomenR: 0.26, headR: 0.15, legLen: p.legLength, legR: 0.028,
      bodyMat: shell, legMat: k.mat('legs', p.legColor), eyeSize: 0.045,
    });
    // ridged carapace plates + glowing spots
    const plate = k.mat('plate', '#4a2a66');
    for (let i = 0; i < 4; i++) rig.body.add(k.at(k.scl(k.box(0.34 - i * 0.04, 0.05, 0.1, plate, 0.01), 1, 1, 1), 0, 0.2 + i * 0.01, -0.3 - i * 0.1));
    const glow = k.glow('spots', p.glowColor, 1.2);
    for (let i = 0; i < 6; i++) rig.body.add(k.at(k.ball(0.025, glow, 0), k.rand(-0.16, 0.16), 0.22, -0.3 - k.rand(0, 0.3)));
    // mandibles
    for (const [, s] of sides) rig.head.add(k.at(k.rot(k.cone(0.025, 0.12, k.mat('mandible', '#2a1a33'), 4), Math.PI / 2 + 0.3, 0, -s * 0.5), s * 0.06, -0.06, 0.24));
    k.smile(rig.head, { y: -0.02, z: 0.22, width: 0.08, segs: 4, thick: 0.016 });
    k.decay(root, 0.5);
    root.scale.setScalar(p.size);
    return finalizeMonster(root, {
      rig, params: p, animations: SPIDER_ANIMS,
      clips: { idle: 'idle', move: 'scuttle', attack: 'stab', hit: 'hit', death: 'curl' },
    });
  },
};

// ---- ③ 탱커: 폭주한 경비 로봇 -----------------------------------------------------
export const securityBot = {
  label: '폭주한 경비 로봇',
  role: '③ 탱커',
  defaults: {
    ...ZOMBIE, seed: 55, clips: zclips({ attack: 'smash', move: 'lurch' }), height: 1.2, bulk: 1.6, hunch: 0.2,
    armReach: 0.4, armLength: 1.15, headTilt: 0.12, jawOpen: 0.15, rot: 0.25, wounds: 6, hair: 0, tornClothes: false,
    skinColor: '#8b939c', shirtColor: '#3d4652', pantsColor: '#2f353e', eyeColor: '#ff2a2a', eyeGlow: 3,
    bloodColor: '#16181c', accentColor: '#f2c23a',
  },
  schema: { ...zombieSchema, accentColor: { label: '경고 줄무늬 색' }, bloodColor: { label: '기름 얼룩 색' } },
  build(p) {
    return createZombie({ ...p, name: 'SecurityBot' }, ({ rig, box, mat, at, mesh, THREE, b, L }) => {
      const metal = mat('armor', '#a8b0b8', { metalness: 0.5, roughness: 0.45 });
      const warn = mat('warning', p.accentColor);
      // helmet + visor over the head
      rig.head.add(at(box(0.3, 0.16, 0.3, metal, 0.004), 0, 0.29, 0));
      rig.head.add(at(box(0.27, 0.06, 0.05, mat('visor', '#ff2a2a', { emissive: '#ff2a2a', emissiveIntensity: 2.5 }), 0), 0, 0.2, 0.15));
      rig.head.add(at(mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.22, 4), metal), 0.1, 0.45, -0.05));
      rig.head.add(at(box(0.03, 0.03, 0.03, mat('beacon', '#ff3a2a', { emissive: '#ff3a2a', emissiveIntensity: 3 }), 0), 0.1, 0.57, -0.05));
      // chest plate with hazard stripes, shoulder pads, back vents
      rig.spine.add(at(box(0.48 * b, 0.32, 0.06, metal, 0.004), 0, 0.45, 0.14 * b));
      for (let i = 0; i < 4; i++) rig.spine.add(at(box(0.06, 0.25, 0.01, warn, 0).rotateZ(0.6), (-0.15 + i * 0.1) * b, 0.45, 0.175 * b));
      for (const [n, s] of sides) {
        rig.arms[n].shoulder.add(at(box(0.2 * b, 0.12, 0.2 * b, metal, 0.004), s * 0.02, 0.0, 0));
        rig.arms[n].elbow.add(at(box(0.14 * b, 0.12, 0.14 * b, metal, 0.004), 0, -0.3 * L - 0.02, 0)); // fists
      }
      for (let i = 0; i < 3; i++) rig.spine.add(at(box(0.3 * b, 0.025, 0.02, mat('vent', '#1a1d22'), 0), 0, 0.35 + i * 0.07, -0.135 * b));
    });
  },
};

// ---- ④ 변칙형: 변신 슬라임 -------------------------------------------------------
const SPIKES = 6;
const SLIME_ANIMS = {
  idle: {
    label: '대기 (꿀렁꿀렁)',
    duration: 2.4,
    apply(rig, u) {
      const w = u * TAU;
      rig.body.scale.set(1 + Math.sin(w) * 0.05, 1 - Math.sin(w) * 0.06, 1 + Math.cos(w) * 0.04);
      rig.inner.rotation.y += Math.sin(w) * 0.4;
      rig.eyes.forEach((e, i) => { e.position.y += Math.sin(w + i * 2) * 0.02; });
      blinkEyes(rig, blink(u, [0.3, 0.8]));
    },
  },
  ooze: {
    label: '꿈틀꿈틀 기어가기',
    duration: 1.2,
    apply(rig, u) {
      const w = u * TAU;
      const s = Math.sin(w);
      rig.body.scale.set(1 - s * 0.08, 1 + s * 0.1, 1 - s * 0.12 + Math.max(0, -s) * 0.2);
      rig.body.position.z += Math.max(0, -s) * 0.06;
      rig.body.rotation.x += s * 0.08;
      rig.inner.position.y += s * 0.03;
    },
  },
  morph: {
    label: '가시 촉수 뻗기',
    duration: 1.4,
    apply(rig, u) {
      const out = keys(u, [[0, 0], [0.3, -0.3], [0.45, 1], [0.7, 1], [1, 0]]);
      rig.body.scale.setScalar(1 + Math.min(0, out) * 0.2 + Math.max(0, out) * 0.1);
      rig.spikes.forEach((sp, i) => {
        sp.scale.set(1, Math.max(0.001, out) * (1 + (i % 2) * 0.4), 1);
      });
      blinkEyes(rig, out < 0 ? 0.6 : 0);
    },
  },
  hit: {
    label: '피격 (철퍽)',
    duration: 0.6,
    loop: false,
    apply(rig, u) {
      const h = keys(u, [[0, 0], [0.12, 1], [1, 0]]);
      rig.body.scale.set(1 + h * 0.25, 1 - h * 0.3, 1 + h * 0.25);
      rig.body.position.z -= h * 0.08;
      blinkEyes(rig, h * 0.85);
    },
  },
  melt: {
    label: '웅덩이로 녹음',
    duration: 1.6,
    loop: false,
    apply(rig, u) {
      const f = keys(u, [[0, 0], [0.15, -0.1], [0.85, 1], [1, 1]]);
      rig.body.scale.set(1 + f * 0.9, Math.max(0.06, 1 - f * 0.9), 1 + f * 0.9);
      rig.inner.position.y -= f * 0.2;
      rig.inner.rotation.z += f * 1.4;
      rig.eyes.forEach((e) => { e.position.y -= f * 0.25; });
      blinkEyes(rig, f * 0.7);
    },
  },
};

export const morphSlime = {
  label: '변신 슬라임',
  role: '④ 변칙형',
  defaults: { seed: 57, size: 1, slimeColor: '#7dd65a', glow: 0.6 },
  schema: { ...common, slimeColor: { label: '슬라임 색' }, glow: { label: '발광', min: 0, max: 2, step: 0.05 } },
  build(p) {
    const k = createKit(p.seed, 1, p.horror, { eyeColor: '#ffef3a' });
    const slime = k.mat('slime', p.slimeColor, { emissive: p.slimeColor, emissiveIntensity: p.glow * 0.4, transparent: true, opacity: 0.55, roughness: 0.2 });
    const root = k.pivot('root');
    root.name = 'MorphSlime';
    const body = k.pivot('body');
    root.add(body);
    body.add(k.at(k.scl(k.ball(0.38, slime, 2, 0.03), 1.1, 0.8, 1.05), 0, 0.3, 0));
    // victims inside: a skull and some bones
    const inner = k.pivot('inner', 0, 0.28, 0);
    const bone = k.mat('bone', '#d9d2b6', { keepColor: true });
    inner.add(k.at(k.box(0.12, 0.12, 0.13, bone, 0.01), 0.05, 0.02, 0));
    inner.add(k.at(k.box(0.025, 0.025, 0.02, k.mat('mouthDark', '#1a0b0b', { keepColor: true }), 0), 0.03, 0.04, 0.066));
    inner.add(k.at(k.box(0.025, 0.025, 0.02, k.mat('mouthDark', '#1a0b0b', { keepColor: true }), 0), 0.08, 0.04, 0.066));
    inner.add(k.at(k.rot(k.cyl(0.015, 0.015, 0.22, bone, 5), 0, 0, 1.2), -0.12, -0.05, 0.05));
    inner.add(k.at(k.rot(k.cyl(0.015, 0.015, 0.18, bone, 5), 0.6, 0, -0.4), -0.05, -0.08, -0.1));
    body.add(inner);
    // floating eyes on the surface
    const eyes = k.eyes(body, { y: 0.46, z: 0.32, spacing: 0.11, size: 0.06 });
    const extra = k.eye('eye3', 0.045);
    extra.position.set(0.25, 0.36, 0.25);
    body.add(extra);
    eyes.push(extra);
    k.smile(body, { y: 0.32, z: 0.4, width: 0.2 });
    const spikes = [];
    for (let i = 0; i < SPIKES; i++) {
      const a = (i / SPIKES) * TAU;
      const sp = k.pivot(`spike${i}`, Math.cos(a) * 0.32, 0.3, Math.sin(a) * 0.32 + 0.05);
      sp.add(k.at(k.cone(0.05, 0.35, slime, 5), 0, 0.17, 0));
      sp.rotation.set(Math.sin(a) * 1.2, 0, -Math.cos(a) * 1.2);
      sp.scale.set(1, 0.001, 1);
      body.add(sp);
      spikes.push(sp);
    }
    root.scale.setScalar(p.size);
    return finalizeMonster(root, {
      rig: { body, inner, spikes, eyes }, params: p, animations: SLIME_ANIMS,
      clips: { idle: 'idle', move: 'ooze', attack: 'morph', hit: 'hit', death: 'melt' },
    });
  },
};

// ---- ⑤ 매복형: 환풍구 촉수 -------------------------------------------------------
export const ventTentacle = {
  label: '환풍구 촉수',
  role: '⑤ 매복형',
  defaults: { seed: 59, size: 1.2, segments: 8, skinColor: '#8a4a7a', suckerColor: '#e8b8c8' },
  schema: { ...common, segments: { label: '마디', min: 5, max: 11, step: 1 }, skinColor: { label: '촉수 색' }, suckerColor: { label: '빨판 색' } },
  build(p) {
    const k = createKit(p.seed, 0.8, p.horror, { eyeColor: '#ffef3a' });
    const skin = k.mat('skin', p.skinColor);
    const { root, rig } = buildSerpent(k, {
      name: 'VentTentacle', segs: p.segments, segLen: 0.16, radius: 0.12, taper: 0.55, headR: 0.14, eyeSize: 0.05,
      headScale: [1, 1.1, 1], mats: [skin, k.mat('skin2', '#6e3a62')],
    });
    // suckers along the front of every segment
    const sucker = k.mat('sucker', p.suckerColor);
    rig.chain.forEach((s, i) => {
      const r = 0.12 * (1 - 0.55 * (i / (p.segments - 1)));
      s.add(k.at(k.scl(k.ball(r * 0.35, sucker, 1), 1, 1, 0.4), 0, 0.08, r * 0.92));
    });
    k.smile(rig.head, { y: 0.06, z: 0.13, width: 0.12 });
    // floor vent grate
    const metal = k.mat('grate', '#5a6068', { metalness: 0.4 });
    root.add(k.at(k.box(0.7, 0.04, 0.7, k.mat('ventHole', '#121418'), 0), 0, 0.02, 0));
    for (let i = 0; i < 2; i++) root.add(k.at(k.box(0.74, 0.05, 0.05, metal, 0), 0, 0.03, i ? 0.35 : -0.35));
    for (let i = 0; i < 2; i++) root.add(k.at(k.box(0.05, 0.05, 0.74, metal, 0), i ? 0.35 : -0.35, 0.03, 0));
    // a bent slat knocked loose
    root.add(k.at(k.rot(k.box(0.5, 0.02, 0.06, metal, 0), 0.3, 0.4, 0.5), 0.45, 0.08, 0.3));
    k.decay(root, 0.5);
    root.scale.setScalar(p.size);
    return finalizeMonster(root, {
      rig, params: p, animations: SERPENT_ANIMS,
      clips: { idle: 'idle', move: 'swim', attack: 'strike', hit: 'hit', death: 'death', special: 'emerge' },
    });
  },
};

// ---- ⑥ 자폭/원거리: 산성 알 ------------------------------------------------------
const PETALS = 4;
const EGG_ANIMS = {
  idle: {
    label: '대기 (꿈틀대는 알)',
    duration: 2,
    apply(rig, u) {
      const w = u * TAU;
      const beat = Math.pow(Math.max(0, Math.sin(w * 2)), 4);
      rig.egg.scale.set(1 + beat * 0.05, 1 + beat * 0.03, 1 + beat * 0.05);
      rig.petals.forEach((pt, i) => { pt.rotation.x -= beat * 0.1 + Math.sin(w + i) * 0.03; });
      blinkEyes(rig, blink(u, [0.5]));
    },
  },
  creep: {
    label: '촉수로 기어가기',
    duration: 1.4,
    apply(rig, u) {
      const w = u * TAU;
      rig.egg.rotation.z += Math.sin(w) * 0.12;
      rig.egg.position.y += Math.abs(Math.sin(w)) * 0.04;
      rig.roots.forEach((r, i) => { r.rotation.x += Math.sin(w + i * 1.6) * 0.3; });
    },
  },
  spit: {
    label: '산성액 뱉기',
    duration: 1.4,
    apply(rig, u) {
      const open = keys(u, [[0, 0], [0.3, 1], [0.7, 1], [1, 0]]);
      const pump = keys(u, [[0, 0], [0.3, 1], [0.42, -0.4], [0.6, 0], [1, 0]]);
      rig.petals.forEach((pt) => { pt.rotation.x -= open * 0.9; });
      rig.egg.scale.set(1 + pump * 0.1, 1 - Math.min(0, pump) * 0.15 + Math.max(0, pump) * 0.05, 1 + pump * 0.1);
      const f = clamp01((u - 0.4) / 0.45);
      rig.acid.position.set(0, 0.75 + Math.sin(f * Math.PI) * 0.5, f * 1.8);
      rig.acid.scale.setScalar(u > 0.4 && f < 1 ? 1 : 0.001);
    },
  },
  hit: {
    label: '피격',
    duration: 0.6,
    loop: false,
    apply(rig, u) {
      const h = keys(u, [[0, 0], [0.12, 1], [1, 0]]);
      rig.egg.rotation.x -= h * 0.3;
      rig.egg.scale.set(1 + h * 0.12, 1 - h * 0.12, 1 + h * 0.12);
      blinkEyes(rig, h * 0.85);
    },
  },
  burst: {
    label: '터져서 쭈그러짐',
    duration: 1.5,
    loop: false,
    apply(rig, u) {
      const pop = keys(u, [[0, 0], [0.25, 1], [1, 1]]);
      const sag = keys(u, [[0, 0], [0.25, 0], [0.9, 1], [1, 1]]);
      rig.petals.forEach((pt) => { pt.rotation.x -= pop * 1.9; });
      rig.egg.scale.set(1 + sag * 0.25, Math.max(0.15, 1 + pop * 0.1 - sag * 0.7), 1 + sag * 0.25);
      rig.puddle.scale.setScalar(0.001 + sag * 1.2);
      blinkEyes(rig, smooth(u / 0.5) * 0.92);
    },
  },
};

export const acidEgg = {
  label: '산성 알',
  role: '⑥ 자폭/원거리',
  defaults: { seed: 61, size: 1, shellColor: '#6a7a4a', veinColor: '#3a2a3a', acidColor: '#b6ff3a' },
  schema: { ...common, shellColor: { label: '껍질 색' }, veinColor: { label: '핏줄 색' }, acidColor: { label: '산성액 색' } },
  build(p) {
    const k = createKit(p.seed, 1, p.horror, { eyeColor: '#ffef3a' });
    const shell = k.mat('shell', p.shellColor);
    const acidMat = k.glow('acid', p.acidColor, 1.6);
    const root = k.pivot('root');
    root.name = 'AcidEgg';
    const egg = k.pivot('egg', 0, 0.12, 0);
    root.add(egg);
    egg.add(k.at(k.scl(k.ball(0.3, shell, 2, 0.02), 1, 1.3, 1), 0, 0.33, 0));
    egg.add(k.at(k.ball(0.17, acidMat, 1), 0, 0.68, 0)); // glowing core at the opening
    const vein = k.mat('vein', p.veinColor);
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * TAU;
      egg.add(k.at(k.rot(k.box(0.02, 0.5, 0.02, vein, 0.01), Math.sin(a) * 0.25, 0, Math.cos(a) * 0.25), Math.sin(a) * 0.28, 0.33, Math.cos(a) * 0.28));
    }
    // top petals that open
    const petals = [];
    for (let i = 0; i < PETALS; i++) {
      const a = (i / PETALS) * TAU + 0.4;
      const pt = k.pivot(`petal${i}`, Math.sin(a) * 0.12, 0.66, Math.cos(a) * 0.12);
      pt.rotation.y = a;
      pt.add(k.at(k.rot(k.scl(k.cone(0.12, 0.22, shell, 4), 1, 1, 0.35), 0.35, 0, 0), 0, 0.08, -0.03));
      egg.add(pt);
      petals.push(pt);
    }
    const eyes = k.eyes(egg, { y: 0.4, z: 0.27, spacing: 0.09, size: 0.05 });
    k.smile(egg, { y: 0.25, z: 0.29, width: 0.14 });
    // root tendrils holding it to the floor
    const roots = [];
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU;
      const r = k.pivot(`root${i}`, Math.sin(a) * 0.2, 0.12, Math.cos(a) * 0.2);
      r.rotation.y = a;
      r.add(k.at(k.rot(k.cyl(0.02, 0.035, 0.3, vein, 5, 0.01), 1.1, 0, 0), 0, -0.06, 0.12));
      root.add(r);
      roots.push(r);
    }
    const acid = k.pivot('acidBlob', 0, 0.75, 0);
    acid.add(k.ball(0.08, acidMat, 1));
    acid.scale.setScalar(0.001);
    root.add(acid);
    const puddle = k.pivot('puddle', 0, 0.01, 0);
    puddle.add(k.cyl(0.5, 0.5, 0.01, acidMat, 12));
    puddle.scale.setScalar(0.001);
    root.add(puddle);
    k.decay(root, 0.5);
    root.scale.setScalar(p.size);
    return finalizeMonster(root, {
      rig: { egg, petals, roots, acid, puddle, eyes }, params: p, animations: EGG_ANIMS,
      clips: { idle: 'idle', move: 'creep', attack: 'spit', hit: 'hit', death: 'burst' },
    });
  },
};

// ---- ⑦ 지휘형: 지휘 드론 ---------------------------------------------------------
const spin = (rig, u, speed) => rig.rotors.forEach((r, i) => { r.rotation.y = (i % 2 ? -1 : 1) * u * TAU * speed; });
const DRONE_ANIMS = {
  idle: {
    label: '대기 (호버링)',
    duration: 2,
    apply(rig, u) {
      rig.hull.position.y += Math.sin(u * TAU) * 0.05;
      rig.hull.rotation.z += Math.sin(u * TAU) * 0.04;
      rig.lens.rotation.y += Math.sin(u * TAU) * 0.3;
      spin(rig, u, 12);
    },
  },
  fly: {
    label: '날아가기',
    duration: 1,
    apply(rig, u) {
      rig.hull.rotation.x += 0.3;
      rig.hull.position.y += Math.sin(u * TAU * 2) * 0.03;
      spin(rig, u, 16);
    },
  },
  laser: {
    label: '레이저 발사',
    duration: 1.4,
    apply(rig, u) {
      const charge = keys(u, [[0, 0], [0.35, 1], [0.4, 0.6], [0.75, 0.6], [1, 0]]);
      const fire = u > 0.4 && u < 0.78 ? 1 : 0;
      rig.lens.scale.setScalar(1 + charge * 0.4);
      rig.beam.scale.set(1, 1, fire ? 1 + Math.sin(u * TAU * 20) * 0.1 : 0.001);
      rig.hull.position.z -= fire * 0.05;
      rig.hull.rotation.x -= charge * 0.1;
      spin(rig, u, 12);
    },
  },
  hit: {
    label: '피격 (지지직)',
    duration: 0.6,
    loop: false,
    apply(rig, u) {
      const h = keys(u, [[0, 0], [0.12, 1], [1, 0]]);
      rig.hull.rotation.z += Math.sin(u * TAU * 6) * 0.35 * h;
      rig.hull.position.x += Math.sin(u * TAU * 9) * 0.05 * h;
      rig.lens.scale.setScalar(1 - h * 0.5);
      spin(rig, u, 8);
    },
  },
  crash: {
    label: '추락',
    duration: 1.5,
    loop: false,
    apply(rig, u) {
      const f = keys(u, [[0, 0], [0.7, 1], [0.78, 0.94], [0.88, 1], [1, 1]]);
      rig.hull.position.y -= f * (rig.height - 0.12);
      rig.hull.rotation.z += f * 0.9;
      rig.hull.rotation.x += f * 0.4;
      rig.lens.scale.setScalar(Math.max(0.2, 1 - f * 0.8));
      spin(rig, u * (1 - u), 10); // rotors spin down
    },
  },
  alarm: {
    label: '경보 (동료 호출)',
    duration: 2,
    apply(rig, u) {
      const c = keys(u, [[0, 0], [0.15, 1], [0.85, 1], [1, 0]]);
      rig.hull.position.y += c * 0.25;
      rig.hull.rotation.y += u * TAU;
      rig.siren.scale.setScalar(1 + c * (0.5 + Math.abs(Math.sin(u * TAU * 8)) * 0.8));
      rig.lens.scale.setScalar(1 + c * 0.3);
      spin(rig, u, 18);
    },
  },
};

export const commandDrone = {
  label: '지휘 드론',
  role: '⑦ 지휘형',
  defaults: { seed: 63, size: 1, hullColor: '#5a626e', lensColor: '#ff2a2a', glow: 2 },
  schema: { ...common, hullColor: { label: '몸체 색' }, lensColor: { label: '렌즈 색' }, glow: { label: '발광', min: 0, max: 4, step: 0.05 } },
  build(p) {
    const k = createKit(p.seed, 0.6, p.horror);
    const hullMat = k.mat('hull', p.hullColor, { metalness: 0.5, roughness: 0.45 });
    const darkMat = k.mat('hullDark', '#2a2e35', { metalness: 0.4 });
    const lensMat = k.mat('lensGlow', p.lensColor, { emissive: p.lensColor, emissiveIntensity: p.glow });
    const height = 1.2;
    const root = k.pivot('root');
    root.name = 'CommandDrone';
    const hull = k.pivot('hull', 0, height, 0);
    root.add(hull);
    hull.add(k.scl(k.ball(0.26, hullMat, 1, 0.015), 1, 0.65, 1));
    hull.add(k.at(k.cyl(0.3, 0.3, 0.05, darkMat, 8, 0.005), 0, -0.02, 0));
    // eye lens
    const lens = k.pivot('lens', 0, -0.02, 0.24);
    lens.add(k.at(k.rot(k.cyl(0.1, 0.11, 0.06, darkMat, 10), Math.PI / 2, 0, 0), 0, 0, -0.01));
    lens.add(k.at(k.rot(k.cyl(0.07, 0.07, 0.04, lensMat, 10), Math.PI / 2, 0, 0), 0, 0, 0.02));
    hull.add(lens);
    const beam = k.pivot('beam', 0, -0.02, 0.28);
    beam.add(k.at(k.box(0.04, 0.04, 2.4, k.mat('beamGlow', p.lensColor, { emissive: p.lensColor, emissiveIntensity: p.glow * 1.5 }), 0), 0, 0, 1.2));
    beam.scale.set(1, 1, 0.001);
    hull.add(beam);
    // siren light on top + antenna
    const siren = k.pivot('siren', 0, 0.17, 0);
    siren.add(k.ball(0.05, k.mat('sirenGlow', '#ff8a2a', { emissive: '#ff6a1a', emissiveIntensity: p.glow }), 1));
    hull.add(siren);
    hull.add(k.at(k.cyl(0.006, 0.006, 0.25, darkMat, 4), -0.1, 0.25, -0.05));
    // four rotor arms
    const rotors = [];
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU + Math.PI / 4;
      hull.add(k.at(k.rot(k.box(0.3, 0.03, 0.04, darkMat, 0), 0, -a, 0), Math.cos(a) * 0.32, 0.02, Math.sin(a) * 0.32));
      const r = k.pivot(`rotor${i}`, Math.cos(a) * 0.46, 0.06, Math.sin(a) * 0.46);
      r.add(k.box(0.28, 0.01, 0.04, hullMat, 0));
      r.add(k.cyl(0.03, 0.03, 0.04, darkMat, 6));
      hull.add(r);
      rotors.push(r);
    }
    // dangling cables + a claw
    for (const s of [-1, 1]) hull.add(k.at(k.cyl(0.008, 0.008, 0.25, darkMat, 4), s * 0.08, -0.25, 0));
    root.add(k.cyl(0.25, 0.25, 0.005, k.mat('shadow', '#111318', { roughness: 1 }), 12));
    root.scale.setScalar(p.size);
    return finalizeMonster(root, {
      rig: { hull, lens, beam, siren, rotors, height, eyes: [] }, params: p, animations: DRONE_ANIMS,
      clips: { idle: 'idle', move: 'fly', attack: 'laser', hit: 'hit', death: 'crash', special: 'alarm' },
    });
  },
};
