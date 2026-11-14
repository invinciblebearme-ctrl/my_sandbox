// 속삭이는 숲 (Whispering Forest) monsters, MVP set. Cute, round, a little mischievous.
// No blood: when defeated they scatter into light shards and letter fragments.
// Every monster has: idle, walk (fly for flyers), attack, hit, death, spawn.
//
//   m01_inkslime     blob > eyes                            hops, splats on the target
//   m02_acornsoldier nut > head, armL, armR (> spear), legL, legR  charges and stabs
//   m03_firefly      core > wingL, wingR                    hovers, shoots a light orb
//   m03_firefly_orb  projectile (orb flies +Z): charge, fly, impact
import { finalizeMonster, TAU, keys, clamp01, smooth, win } from '../core/monster.js';
import { eduKit, glowMat, fragments, burst, blobShadow, sizeSchema, colorSchema, cuteEyes, cuteCheeks } from './common.js';

const Z = Math.PI / 2;
const CLIPS = (m) => Object.fromEntries(m.map((c) => [c, c]));

// spawn: rises out of a glowing ring (scale up with a little overshoot)
const spawnScale = (u) => Math.max(0.001, keys(u, [[0, 0], [0.6, 1.15], [0.8, 0.95], [1, 1]]));
const ringPulse = (ring, u) => ring.scale.setScalar(Math.max(0.001, Math.sin(Math.PI * clamp01(u * 1.2)) * 1.2));
function spawnRing(k, parent, color, r = 0.4) {
  const ring = k.pivot('spawnRing', 0, 0.02, 0);
  ring.add(k.rot(k.mesh(new k.THREE.TorusGeometry(r, 0.025, 3, 16), glowMat(k, 'spawnGlow', color, 2)), Z, 0, 0));
  ring.scale.setScalar(0.001);
  parent.add(ring);
  return ring;
}

// ---- m01 잉크 슬라임 ----------------------------------------------------------------------
const SLIME_ANIMS = {
  idle: {
    label: '대기 (말랑말랑)', duration: 1.6,
    apply(r, u) {
      const b = Math.sin(u * TAU);
      r.blob.scale.set(1 + b * 0.05, 1 - b * 0.06, 1 + b * 0.05);
      r.eyes.position.y += b * 0.01;
      r.eyes.rotation.y += Math.sin(u * TAU * 0.5) * 0.15;
    },
  },
  walk: {
    label: '이동 (통통 튀기)', duration: 0.7,
    apply(r, u) {
      const air = Math.max(0, Math.sin(clamp01((u - 0.2) / 0.6) * Math.PI));
      const squash = keys(u, [[0, 0.8], [0.15, 1], [0.2, 0], [0.8, 0], [0.88, 1], [1, 0.8]]);
      r.blob.position.y += air * 0.22;
      r.blob.scale.set(1 + squash * 0.18 - air * 0.08, 1 - squash * 0.22 + air * 0.12, 1 + squash * 0.18 - air * 0.08);
      r.blob.rotation.x += (air - 0.5) * 0.15;
      r.shadow.scale.setScalar(1 - air * 0.35);
    },
  },
  attack: {
    label: '공격 (뛰어올라 덮치기)', duration: 0.8, loop: false,
    apply(r, u) {
      const crouch = keys(u, [[0, 0], [0.25, 1], [0.32, 0], [0.75, 0], [0.85, 1.3], [1, 0]]);
      const air = Math.max(0, Math.sin(clamp01((u - 0.3) / 0.45) * Math.PI));
      const fwd = keys(u, [[0, 0], [0.3, 0], [0.75, 0.45], [1, 0]]);
      r.blob.position.y += air * 0.38;
      r.blob.position.z += fwd;
      r.blob.scale.set(1 + crouch * 0.3, 1 - crouch * 0.35 + air * 0.15, 1 + crouch * 0.3);
      r.blob.rotation.x += air * 0.4;
      r.splash.scale.setScalar(Math.max(0.001, win(u, 0.72, 1, 0.08) * 1.2));
      r.splash.position.z += fwd;
    },
  },
  hit: {
    label: '피격 (찌그러짐)', duration: 0.35, loop: false,
    apply(r, u) {
      const k = keys(u, [[0, 0], [0.2, 1], [1, 0]]);
      r.blob.scale.set(1 + k * 0.25, 1 - k * 0.3, 1 + k * 0.1);
      r.blob.position.z -= k * 0.08;
      r.eyes.scale.set(1, 1 - k * 0.8, 1); // eyes squeezed shut
    },
  },
  death: {
    label: '소멸 (빛 조각으로 흩어짐)', duration: 1.2, loop: false,
    apply(r, u) {
      const melt = smooth(clamp01(u / 0.45));
      r.blob.scale.set(1 + melt * 0.5, Math.max(0.001, 1 - melt), 1 + melt * 0.5);
      r.blob.scale.multiplyScalar(Math.max(0.001, 1 - smooth(clamp01((u - 0.35) / 0.3))));
      r.shadow.scale.setScalar(Math.max(0.001, 1 - smooth(clamp01((u - 0.4) / 0.4))));
      burst(r.frags, clamp01((u - 0.25) / 0.75));
    },
  },
  spawn: {
    label: '등장 (잉크 웅덩이에서 솟음)', duration: 1, loop: false,
    apply(r, u) {
      r.blob.scale.setScalar(spawnScale(u));
      r.blob.scale.y *= 0.6 + 0.4 * smooth(clamp01(u / 0.8));
      ringPulse(r.ring, u);
      r.shadow.scale.setScalar(spawnScale(u));
    },
  },
};

export const inkSlime = {
  label: '잉크 슬라임', role: '① 근접 무리형', file: 'monsters/m01_inkslime.glb',
  defaults: { seed: 201, size: 1, bodyColor: '#2d3270', shineColor: '#6a74d8', dripColor: '#1d2050', eyeColor: '#ffffff' },
  schema: { ...sizeSchema, ...colorSchema({ bodyColor: '잉크 색', shineColor: '광택 색', dripColor: '방울 색' }) },
  build(p) {
    const k = eduKit(p.seed, 0.4);
    const ink = k.mat('ink', p.bodyColor, { roughness: 0.5, metalness: 0.05 });
    const shine = k.mat('inkShine', p.shineColor, { roughness: 0.2 });
    const drip = k.mat('inkDrip', p.dripColor, { roughness: 0.5 });
    const root = k.pivot('root');
    root.name = 'm01_inkslime';
    root.scale.setScalar(p.size);
    const shadow = k.pivot('shadow');
    blobShadow(k, shadow, 0.34);
    root.add(shadow);

    const blob = k.pivot('blob');
    root.add(blob);
    blob.add(k.at(k.scl(k.ball(0.32, ink, 2, 0.015), 1.1, 0.85, 1), 0, 0.27, 0));
    blob.add(k.at(k.cyl(0.3, 0.38, 0.14, ink, 10, 0.008), 0, 0.07, 0)); // spread base
    blob.add(k.at(k.scl(k.ball(0.08, shine, 1), 1.4, 0.6, 0.8), -0.12, 0.47, 0.12)); // gloss highlight
    blob.add(k.at(k.ball(0.05, k.mat('glint', '#ffffff', { emissive: '#ffffff', emissiveIntensity: 0.3 }), 0), -0.17, 0.48, 0.15));
    // a curl on top like a drop of ink, and ink drops around the base
    blob.add(k.at(k.rot(k.cone(0.07, 0.16, ink, 6), -0.4, 0, 0), 0.02, 0.58, -0.03));
    for (let i = 0; i < 5; i++) {
      const a = 0.6 + i * 1.25;
      blob.add(k.at(k.scl(k.ball(0.05 + (i % 2) * 0.02, drip, 1), 1, 0.6, 1), Math.cos(a) * 0.38, 0.03, Math.sin(a) * 0.36));
    }
    // a faded letter on its side (it ate a word)
    blob.add(k.at(k.rot(k.box(0.12, 0.025, 0.02, shine, 0), 0, 0.5, 0), 0.24, 0.28, 0.2));
    blob.add(k.at(k.rot(k.box(0.025, 0.1, 0.02, shine, 0), 0, 0.5, 0), 0.27, 0.24, 0.17));

    const eyes = k.pivot('eyes', 0, 0.33, 0.28);
    blob.add(eyes);
    cuteEyes(k, eyes, { y: 0, z: 0, spacing: 0.1, size: 0.07, look: 0.2 });
    k.smile(eyes, { y: -0.1, z: 0.02, width: 0.09, color: '#c8d0ff', thick: 0.02, segs: 4 });

    const splash = k.pivot('splash', 0, 0.03, 0.25); // ink splat when landing on the target
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU;
      splash.add(k.at(k.scl(k.ball(0.06, drip, 0), 1, 0.4, 1), Math.cos(a) * 0.18, 0, Math.sin(a) * 0.18));
    }
    splash.scale.setScalar(0.001);
    root.add(splash);
    const ring = spawnRing(k, root, '#8a7aff');
    const frags = fragments(k, root, { y: 0.3, count: 10, spread: 0.8, letter: '#b8c0ff' });
    return finalizeMonster(root, { rig: { blob, eyes, shadow, splash, ring, frags }, params: p, animations: SLIME_ANIMS, clips: CLIPS(Object.keys(SLIME_ANIMS)) });
  },
};

// ---- m02 가시 도토리병사 -------------------------------------------------------------------
const ACORN_ANIMS = {
  idle: {
    label: '대기 (경계 자세)', duration: 1.4,
    apply(r, u) {
      const b = Math.sin(u * TAU);
      r.nut.position.y += Math.abs(b) * 0.015;
      r.nut.rotation.z += b * 0.04;
      r.head.rotation.z -= b * 0.05;
      r.armR.rotation.x += b * 0.06;
    },
  },
  walk: {
    label: '달리기 (종종걸음 돌격)', duration: 0.45,
    apply(r, u) {
      const w = u * TAU;
      r.legL.rotation.x += Math.sin(w) * 0.9;
      r.legR.rotation.x -= Math.sin(w) * 0.9;
      r.nut.position.y += Math.abs(Math.cos(w)) * 0.05;
      r.nut.rotation.x += 0.25; // leaning into the charge
      r.nut.rotation.z += Math.sin(w) * 0.08;
      r.head.rotation.x -= 0.1;
      r.armR.rotation.x -= 0.3; // spear levelled
      r.armL.rotation.x += Math.sin(w) * 0.5;
    },
  },
  attack: {
    label: '공격 (창 찌르기)', duration: 0.6, loop: false,
    apply(r, u) {
      const back = keys(u, [[0, 0], [0.3, 1], [0.42, 0], [1, 0]]);
      const thrust = keys(u, [[0, 0], [0.3, 0], [0.45, 1], [0.65, 1], [1, 0]]);
      r.armR.rotation.x += back * 0.6 - thrust * 0.9;
      r.armR.position.z += thrust * 0.12 - back * 0.06;
      r.nut.rotation.x += thrust * 0.35 - back * 0.15;
      r.nut.position.z += thrust * 0.12;
      r.legR.rotation.x += thrust * 0.5;
      r.legL.rotation.x -= thrust * 0.4;
      r.head.rotation.x += thrust * 0.1;
    },
  },
  hit: {
    label: '피격 (모자가 들썩)', duration: 0.35, loop: false,
    apply(r, u) {
      const k = keys(u, [[0, 0], [0.2, 1], [1, 0]]);
      r.nut.rotation.x -= k * 0.3;
      r.nut.position.z -= k * 0.06;
      r.head.position.y += k * 0.08;
      r.head.rotation.z += k * 0.3;
      r.armR.rotation.x += k * 0.4;
    },
  },
  death: {
    label: '소멸 (모자 날아가고 흩어짐)', duration: 1.3, loop: false,
    apply(r, u) {
      const pop = smooth(clamp01(u / 0.4));
      r.head.position.y += pop * 0.35;
      r.head.rotation.x -= pop * 2;
      r.nut.rotation.x -= keys(u, [[0, 0], [0.3, 0.5], [1, 0.5]]);
      r.nut.rotation.z += Math.sin(u * TAU * 3) * 0.2 * (1 - u);
      const fade = Math.max(0.001, 1 - smooth(clamp01((u - 0.35) / 0.35)));
      r.nut.scale.setScalar(fade);
      r.legL.scale.setScalar(fade);
      r.legR.scale.setScalar(fade);
      burst(r.frags, clamp01((u - 0.3) / 0.7));
    },
  },
  spawn: {
    label: '등장 (땅에서 쏙)', duration: 0.9, loop: false,
    apply(r, u) {
      const s = spawnScale(u);
      for (const p of [r.nut, r.legL, r.legR]) p.scale.setScalar(s);
      r.nut.position.y -= (1 - smooth(u)) * 0.3;
      r.head.rotation.y += (1 - smooth(u)) * TAU;
      ringPulse(r.ring, u);
    },
  },
};

export const acornSoldier = {
  label: '가시 도토리병사', role: '② 근접 돌격형', file: 'monsters/m02_acornsoldier.glb',
  defaults: { seed: 202, size: 1, nutColor: '#c98a4a', capColor: '#7a5230', spikeColor: '#e8d0a0', spearColor: '#8a6a3a', faceColor: '#f2c896' },
  schema: { ...sizeSchema, ...colorSchema({ nutColor: '도토리 색', capColor: '모자 색', spikeColor: '가시 색', spearColor: '창 색', faceColor: '얼굴 색' }) },
  build(p) {
    const k = eduKit(p.seed, 0.4);
    const nutM = k.mat('nut', p.nutColor);
    const cap = k.mat('cap', p.capColor);
    const spike = k.mat('spike', p.spikeColor);
    const root = k.pivot('root');
    root.name = 'm02_acornsoldier';
    root.scale.setScalar(p.size);
    blobShadow(k, root, 0.26);

    const legs = {};
    for (const [n, s] of [['L', 1], ['R', -1]]) {
      const leg = k.pivot(`leg${n}`, s * 0.09, 0.2, 0);
      leg.add(k.at(k.cyl(0.035, 0.03, 0.16, cap, 5), 0, -0.09, 0));
      leg.add(k.at(k.scl(k.ball(0.06, cap, 0), 1, 0.6, 1.4), 0, -0.17, 0.03));
      root.add(leg);
      legs[n] = leg;
    }
    const nut = k.pivot('nut', 0, 0.2, 0); // body pivots at the hips
    root.add(nut);
    nut.add(k.at(k.scl(k.ball(0.24, nutM, 2, 0.006), 1, 1.1, 0.95), 0, 0.22, 0));
    nut.add(k.at(k.rot(k.cone(0.12, 0.14, nutM, 7), Math.PI, 0, 0), 0, 0.02, 0)); // pointed bottom
    nut.add(k.at(k.scl(k.ball(0.15, k.mat('face', p.faceColor), 0), 1, 0.8, 0.5), 0, 0.24, 0.17)); // face patch
    cuteEyes(k, nut, { y: 0.27, z: 0.24, spacing: 0.065, size: 0.04 });
    // determined little brows (not scary)
    for (const s of [-1, 1]) nut.add(k.at(k.rot(k.box(0.06, 0.015, 0.02, k.mat('brow', '#4a2e18'), 0), 0, 0, s * 0.3), s * 0.065, 0.33, 0.25));
    k.smile(nut, { y: 0.19, z: 0.25, width: 0.06, thick: 0.015, segs: 4, curve: -0.3 });
    cuteCheeks(k, nut, { y: 0.21, z: 0.235, spacing: 0.11, size: 0.025 });
    nut.add(k.at(k.box(0.36, 0.05, 0.3, k.mat('belt', '#5a3a22'), 0), 0, 0.08, 0)); // belt

    // cap = head: scaly acorn cap with thorny spikes and a stalk
    const head = k.pivot('head', 0, 0.38, 0);
    nut.add(head);
    head.add(k.scl(k.dome(0.27, cap, 9, 0.01), 1, 0.6, 1));
    head.add(k.at(k.cyl(0.27, 0.27, 0.04, cap, 9), 0, 0, 0));
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * TAU;
      head.add(k.at(k.rot(k.cone(0.035, 0.12, spike, 4), Math.sin(a) * 1.2, 0, -Math.cos(a) * 1.2), Math.cos(a) * 0.22, 0.06, Math.sin(a) * 0.22));
    }
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU + 0.4;
      head.add(k.at(k.rot(k.cone(0.03, 0.1, spike, 4), Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6), Math.cos(a) * 0.12, 0.14, Math.sin(a) * 0.12));
    }
    head.add(k.at(k.rot(k.cyl(0.025, 0.035, 0.12, k.mat('stalk', '#5a3a22'), 5), 0.3, 0, 0), 0, 0.2, -0.02));

    // arms: little stick arms; the right one holds a thorn spear
    const arms = {};
    for (const [n, s] of [['L', 1], ['R', -1]]) {
      const arm = k.pivot(`arm${n}`, s * 0.23, 0.22, 0);
      arm.add(k.at(k.cyl(0.028, 0.025, 0.16, cap, 5), 0, -0.08, 0));
      arm.add(k.at(k.ball(0.04, nutM, 1), 0, -0.17, 0));
      nut.add(arm);
      arms[n] = arm;
    }
    arms.R.rotation.x = -0.5;
    arms.R.rotation.z = -0.2;
    const spear = k.pivot('spear', 0, -0.17, 0);
    spear.rotation.x = 1.0; // points forward and up
    spear.add(k.at(k.cyl(0.018, 0.018, 0.75, k.mat('spear', p.spearColor), 5), 0, 0.12, 0));
    spear.add(k.at(k.scl(k.cone(0.045, 0.16, spike, 4), 1, 1, 0.5), 0, 0.57, 0));
    spear.add(k.at(k.scl(k.ball(0.04, k.mat('leafTuft', '#5aa84a'), 0), 1, 0.6, 1), 0, 0.47, 0));
    arms.R.add(spear);

    const ring = spawnRing(k, root, '#ffd36a', 0.32);
    const frags = fragments(k, root, { y: 0.45, count: 10, spread: 0.8, shard: '#fff3b0', letter: '#ffe0a8' });
    return finalizeMonster(root, {
      rig: { nut, head, armL: arms.L, armR: arms.R, legL: legs.L, legR: legs.R, spear, ring, frags },
      params: p, animations: ACORN_ANIMS, clips: CLIPS(Object.keys(ACORN_ANIMS)),
    });
  },
};

// ---- m03 반딧불 정령 ----------------------------------------------------------------------
export const FIREFLY_RELEASE = 0.45; // fraction of `attack` when the orb leaves
const HOVER = 1.0;
const FIREFLY_ANIMS = {
  idle: {
    label: '대기 (둥실둥실 날갯짓)', duration: 1.2,
    apply(r, u) {
      const w = u * TAU;
      r.core.position.y += Math.sin(w) * 0.06;
      r.core.rotation.z += Math.sin(w * 0.5) * 0.08;
      r.wingL.rotation.z += Math.sin(w * 4) * 0.6;
      r.wingR.rotation.z -= Math.sin(w * 4) * 0.6;
      r.lamp.scale.setScalar(1 + Math.sin(w) * 0.12);
    },
  },
  fly: {
    label: '날기 (빠르게 날갯짓)', duration: 0.8,
    apply(r, u) {
      const w = u * TAU;
      r.core.position.y += Math.sin(w * 2) * 0.05;
      r.core.rotation.x += 0.3;
      r.core.rotation.z += Math.sin(w) * 0.12;
      r.wingL.rotation.z += Math.sin(w * 6) * 0.75;
      r.wingR.rotation.z -= Math.sin(w * 6) * 0.75;
      r.lamp.scale.setScalar(1 + Math.sin(w * 2) * 0.1);
    },
  },
  attack: {
    label: '공격 (빛 구슬 발사)', duration: 0.9, loop: false,
    apply(r, u) {
      const charge = keys(u, [[0, 0], [0.4, 1], [0.45, 0], [1, 0]]);
      const recoil = keys(u, [[0, 0], [0.42, 0], [0.5, 1], [1, 0]]);
      r.core.rotation.x -= charge * 0.4 - recoil * 0.3;
      r.core.position.z -= recoil * 0.15;
      r.lamp.scale.setScalar(1 + charge * 0.6);
      r.charge.scale.setScalar(Math.max(0.001, charge));
      r.wingL.rotation.z += Math.sin(u * TAU * 7) * 0.7;
      r.wingR.rotation.z -= Math.sin(u * TAU * 7) * 0.7;
    },
  },
  hit: {
    label: '피격 (빙글)', duration: 0.4, loop: false,
    apply(r, u) {
      const k = keys(u, [[0, 0], [0.2, 1], [1, 0]]);
      r.core.rotation.z += k * 0.7;
      r.core.position.z -= k * 0.12;
      r.core.position.y -= k * 0.05;
      r.lamp.scale.setScalar(1 - k * 0.5);
    },
  },
  death: {
    label: '소멸 (빛이 꺼지며 흩어짐)', duration: 1.3, loop: false,
    apply(r, u) {
      const drop = smooth(clamp01(u / 0.5));
      r.core.position.y -= drop * 0.4;
      r.core.rotation.z += drop * 2.5;
      r.wingL.rotation.z += Math.sin(u * TAU * 3) * 0.4 * (1 - u);
      r.wingR.rotation.z -= Math.sin(u * TAU * 3) * 0.4 * (1 - u);
      r.core.scale.setScalar(Math.max(0.001, 1 - smooth(clamp01((u - 0.4) / 0.3))));
      burst(r.frags, clamp01((u - 0.35) / 0.65));
    },
  },
  spawn: {
    label: '등장 (빛 점에서 피어남)', duration: 1, loop: false,
    apply(r, u) {
      r.core.scale.setScalar(spawnScale(u));
      r.core.position.y -= (1 - smooth(u)) * 0.5;
      r.core.rotation.y += (1 - smooth(u)) * TAU;
      ringPulse(r.ring, u);
    },
  },
};

export const fireflySpirit = {
  label: '반딧불 정령', role: '③ 원거리형', file: 'monsters/m03_firefly.glb',
  defaults: { seed: 203, size: 1, bodyColor: '#3a8a7a', glowColor: '#d8ff6a', wingColor: '#bff4ff', bellyColor: '#2a5a6a' },
  schema: { ...sizeSchema, ...colorSchema({ bodyColor: '몸 색', glowColor: '빛 색', wingColor: '날개 색', bellyColor: '배 색' }) },
  build(p) {
    const k = eduKit(p.seed, 0.3);
    const body = k.mat('body', p.bodyColor);
    const root = k.pivot('root');
    root.name = 'm03_firefly';
    root.scale.setScalar(p.size);
    blobShadow(k, root, 0.2);

    const core = k.pivot('core', 0, HOVER, 0);
    root.add(core);
    core.add(k.scl(k.ball(0.17, body, 2), 1, 0.95, 1));
    cuteEyes(k, core, { y: 0.03, z: 0.14, spacing: 0.065, size: 0.05 });
    cuteCheeks(k, core, { y: -0.03, z: 0.15, spacing: 0.1, size: 0.025 });
    k.smile(core, { y: -0.05, z: 0.165, width: 0.05, thick: 0.014, segs: 4 });
    for (const s of [-1, 1]) { // antennae with glowing tips
      core.add(k.at(k.rot(k.cyl(0.008, 0.01, 0.16, k.mat('antenna', '#2a3a3a'), 4), 0.4, 0, s * -0.4), s * 0.05, 0.2, 0.04));
      core.add(k.at(k.ball(0.022, glowMat(k, 'tip', p.glowColor, 2), 0), s * 0.085, 0.28, 0.08));
    }
    // glowing lantern tail (its "light" that it shoots)
    const lamp = k.pivot('lamp', 0, -0.06, -0.17);
    lamp.add(k.scl(k.ball(0.12, glowMat(k, 'lampGlow', p.glowColor, 2.2), 1), 1, 0.9, 1.2));
    lamp.add(k.scl(k.ball(0.17, glowMat(k, 'lampHalo', p.glowColor, 1, 0.3), 1), 1, 0.9, 1.2));
    lamp.add(k.at(k.cyl(0.11, 0.1, 0.03, k.mat('band', p.bellyColor), 7), 0, 0, 0.09)); // stripe
    core.add(lamp);
    const wings = {};
    for (const [n, s] of [['L', 1], ['R', -1]]) {
      const wing = k.pivot(`wing${n}`, s * 0.1, 0.1, -0.03);
      const wm = k.mat('wing', p.wingColor, { transparent: true, opacity: 0.6, emissive: p.wingColor, emissiveIntensity: 0.4, depthWrite: false });
      wing.add(k.at(k.rot(k.scl(k.ball(0.14, wm, 1), 1.3, 0.12, 0.6), 0, 0.3 * s, s * 0.35), s * 0.16, 0.05, -0.02));
      wing.add(k.at(k.rot(k.scl(k.ball(0.1, wm, 1), 1.2, 0.12, 0.5), 0, -0.4 * s, s * 0.1), s * 0.12, 0, -0.1));
      core.add(wing);
      wings[n] = wing;
    }
    const charge = k.pivot('charge', 0, -0.02, 0.24); // orb gathering in front of the face
    charge.add(k.ball(0.06, glowMat(k, 'chargeGlow', p.glowColor, 2.5), 1));
    charge.scale.setScalar(0.001);
    core.add(charge);

    const ring = spawnRing(k, root, p.glowColor, 0.3);
    const frags = fragments(k, root, { y: HOVER, count: 10, spread: 0.8, shard: p.glowColor });
    return finalizeMonster(root, {
      rig: { core, wingL: wings.L, wingR: wings.R, lamp, charge, ring, frags },
      params: p, animations: FIREFLY_ANIMS, clips: CLIPS(Object.keys(FIREFLY_ANIMS)),
    });
  },
};

// ---- the firefly's light orb (projectile) -----------------------------------------------
const ORB_ANIMS = {
  charge: { label: '모이기', duration: 0.4, loop: false, apply(r, u) { r.orb.scale.setScalar(Math.max(0.001, smooth(u))); r.trail.scale.setScalar(0.001); } },
  fly: {
    label: '날아가기 (반복)', duration: 0.5,
    apply(r, u) {
      r.orb.scale.setScalar(1 + Math.sin(u * TAU * 2) * 0.1);
      r.orb.rotation.z += u * TAU;
      r.trail.children.forEach((t, i) => t.scale.setScalar(0.6 + Math.abs(Math.sin(u * TAU + i)) * 0.5));
    },
  },
  impact: {
    label: '터짐', duration: 0.5, loop: false,
    apply(r, u) {
      r.orb.scale.setScalar(Math.max(0.001, keys(u, [[0, 1], [0.2, 1.8], [1, 0]])));
      r.trail.scale.setScalar(0.001);
      r.pop.scale.setScalar(u > 0.95 ? 0.001 : 0.3 + smooth(u) * 2);
    },
  },
};
export const fireflyOrb = {
  label: '반딧불 빛 구슬 (투사체)', role: '③ 투사체', file: 'monsters/m03_firefly_orb.glb',
  defaults: { seed: 204, size: 1, glowColor: '#d8ff6a' },
  schema: { ...sizeSchema, ...colorSchema({ glowColor: '빛 색' }) },
  build(p) {
    const k = eduKit(p.seed, 0);
    const root = k.pivot('root');
    root.name = 'm03_firefly_orb';
    const orb = k.pivot('orb', 0, HOVER, 0); // same height as the firefly's mouth
    orb.scale.setScalar(p.size);
    orb.add(k.ball(0.07, glowMat(k, 'orbCore', '#ffffff', 2.5), 1));
    orb.add(k.ball(0.11, glowMat(k, 'orbGlow', p.glowColor, 1.8, 0.6), 1));
    root.add(orb);
    const trail = k.pivot('trail', 0, HOVER, 0);
    for (let i = 0; i < 3; i++) {
      const t = k.pivot(`trail${i}`, 0, 0, -0.12 - i * 0.1);
      t.add(k.ball(0.06 - i * 0.015, glowMat(k, 'orbGlow', p.glowColor, 1.8, 0.6), 0));
      trail.add(t);
    }
    root.add(trail);
    const pop = k.pivot('pop', 0, HOVER, 0);
    pop.add(k.mesh(new k.THREE.TorusGeometry(0.12, 0.02, 3, 12), glowMat(k, 'popGlow', p.glowColor, 2)));
    pop.scale.setScalar(0.001);
    root.add(pop);
    return finalizeMonster(root, { rig: { orb, trail, pop }, params: p, animations: ORB_ANIMS, clips: CLIPS(Object.keys(ORB_ANIMS)) });
  },
};

export const EDU_MONSTERS = { inkSlime, acornSoldier, fireflySpirit };
export const EDU_PROJECTILES = { fireflyOrb };
