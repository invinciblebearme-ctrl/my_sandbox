// Neighborhood playground: 7 monsters in the same rotten style as the zombies.
import { createKit } from '../../core/kit.js';
import { finalizeMonster, TAU, keys, blink, smooth } from '../../core/monster.js';
import { buildBiped, BIPED_ANIMS } from '../../rigs/biped.js';
import { buildSerpent, SERPENT_ANIMS } from '../../rigs/serpent.js';
import { createZombie, DEFAULT_PARAMS as ZOMBIE } from '../graveyard/zombie.js';
import { strayDog, balloonMonster } from '../alley/monsters.js';

const sides = [['L', 1], ['R', -1]];
const blinkEyes = (rig, a) => rig.eyes.forEach((e) => { e.scale.y = Math.max(0.08, 1 - a); });
const common = {
  seed: { label: '시드', min: 1, max: 999, step: 1 },
  size: { label: '크기', min: 0.5, max: 2, step: 0.01 },
};
const Z = Math.PI / 2;

// ---- ① 기본형: 고장 난 인형 ------------------------------------------------------
export const brokenDoll = {
  label: '고장 난 인형',
  role: '① 기본형',
  defaults: {
    ...ZOMBIE, seed: 91, clips: { idle: 'idle', move: 'lurch', attack: 'bite', hit: 'hit', death: 'death' },
    height: 1.1, bulk: 0.9, hunch: 0.15, armReach: 0.75, headTilt: 0.5, jawOpen: 0.35, rot: 0.4, wounds: 2, hair: 0,
    tornClothes: true, skinColor: '#e6d6c4', shirtColor: '#c25a7a', pantsColor: '#f0e6d8', eyeColor: '#ff3a2a',
    bloodColor: '#5a2a2a', yarnColor: '#d88a3a',
  },
  schema: {
    seed: common.seed,
    height: { label: '키', min: 0.7, max: 1.5, step: 0.01 },
    headTilt: { label: '고개 꺾임', min: -0.8, max: 0.8, step: 0.01 },
    skinColor: { label: '도자기 피부 색' }, shirtColor: { label: '드레스 색' }, pantsColor: { label: '스타킹 색' },
    yarnColor: { label: '털실 머리 색' }, eyeColor: { label: '눈 색' },
  },
  build(p) {
    return createZombie({ ...p, name: 'BrokenDoll' }, ({ rig, box, mat, at, mesh, THREE, rand }) => {
      const yarn = mat('yarn', p.yarnColor);
      // yarn pigtails and fringe
      for (let i = 0; i < 9; i++) rig.head.add(at(box(0.05, 0.05, 0.05, yarn, 0.01), -0.12 + i * 0.03, 0.31, -0.02 + Math.sin(i) * 0.02));
      for (const s of [-1, 1]) {
        const tail = mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.25, 5), yarn, 0.01);
        tail.rotation.z = s * 0.3;
        rig.head.add(at(tail, s * 0.17, 0.12, -0.04));
        rig.head.add(at(box(0.05, 0.04, 0.04, mat('ribbon', '#3a7aff'), 0), s * 0.15, 0.25, -0.03));
      }
      // a big sewn-on button over one eye, stitched mouth, painted cheeks
      const button = mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.015, 8), mat('button', '#1a1a22'));
      button.rotation.x = Z;
      rig.head.add(at(button, 0.06, 0.2, 0.15));
      for (const [x, y] of [[0.045, 0.21], [0.075, 0.21], [0.045, 0.185], [0.075, 0.185]]) rig.head.add(at(box(0.01, 0.01, 0.01, mat('buttonHole', '#5a5a66'), 0), x, y, 0.16));
      const thread = mat('thread', '#2a1a1a');
      for (let i = 0; i < 5; i++) rig.head.add(at(box(0.006, 0.05, 0.006, thread, 0), -0.05 + i * 0.025, 0.075, 0.145));
      for (const s of [-1, 1]) rig.head.add(at(box(0.04, 0.03, 0.005, mat('paintedCheek', '#e87a8a'), 0), s * 0.09, 0.12, 0.14));
      // skirt and a crack across the face
      const skirt = mesh(new THREE.ConeGeometry(0.32, 0.35, 8, 1, true), mat('skirt', p.shirtColor), 0.01);
      skirt.material.side = THREE.DoubleSide;
      rig.spine.add(at(skirt, 0, 0.05, 0));
      rig.head.add(at(box(0.01, 0.16, 0.008, thread, 0).rotateZ(0.5 + rand(-0.1, 0.1)), -0.05, 0.2, 0.145));
    });
  },
};

// ---- ③ 탱커: 정글짐 골렘 ---------------------------------------------------------
export const jungleGymGolem = {
  label: '정글짐 골렘',
  role: '③ 탱커',
  defaults: { seed: 93, size: 1.35, barColor: '#d84a3a', barColor2: '#3a7ad8', tireColor: '#1e1e22' },
  schema: { ...common, barColor: { label: '철봉 색 1' }, barColor2: { label: '철봉 색 2' }, tireColor: { label: '타이어 색' } },
  build(p) {
    const k = createKit(p.seed, 0.6, p.horror, { eyeColor: '#ffd23a' });
    const barA = k.mat('barA', p.barColor, { metalness: 0.4, roughness: 0.5 });
    const barB = k.mat('barB', p.barColor2, { metalness: 0.4, roughness: 0.5 });
    const tire = k.mat('tire', p.tireColor);
    const { root, rig } = buildBiped(k, {
      name: 'JungleGymGolem', bodyR: 0.45, bodyScale: [1, 1.15, 0.85], bodyMat: barA, bodyShape: 'none',
      headR: 0.22, headShape: 'none', legLen: 0.28, legR: 0.04, legMat: barB, footMat: tire,
      armLen: 0.45, armR: 0.035, armMat: barB, handMat: tire,
    });
    const d = rig.dims;
    // cube frame: 12 bars + ladder rungs on the front
    const W = 0.4;
    const H = 0.5;
    const D = 0.32;
    const bar = (x, y, z, len, axis, m) => {
      const c = k.cyl(0.025, 0.025, len, m, 6, 0.004);
      if (axis === 'x') c.rotation.z = Z;
      if (axis === 'z') c.rotation.x = Z;
      rig.body.add(k.at(c, x, d.cy + y, z));
    };
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) bar(sx * W, 0, sz * D, H * 2, 'y', barA);
    for (const sy of [-1, 1]) for (const sz of [-1, 1]) bar(0, sy * H, sz * D, W * 2, 'x', barB);
    for (const sy of [-1, 1]) for (const sx of [-1, 1]) bar(sx * W, sy * H, 0, D * 2, 'z', barB);
    for (let i = 1; i < 4; i++) bar(0, -H + i * 0.25, D, W * 2, 'x', barA);
    // a dark core inside with glowing eyes and a grin
    rig.body.add(k.at(k.ball(0.2, k.mat('core', '#1a1416'), 1, 0.02), 0, d.cy, 0));
    rig.eyes = k.eyes(rig.body, { y: d.cy + 0.06, z: 0.17, spacing: 0.07, size: 0.05 });
    k.smile(rig.body, { y: d.cy - 0.06, z: 0.19, width: 0.13 });
    // head: a small dome of bars
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI;
      const arc = k.mesh(new k.THREE.TorusGeometry(0.2, 0.02, 4, 10, Math.PI), i % 2 ? barA : barB);
      arc.rotation.y = a;
      rig.head.add(k.at(arc, 0, 0.0, 0));
    }
    // tire hands
    for (const [n] of sides) {
      const t = k.mesh(new k.THREE.TorusGeometry(0.09, 0.04, 5, 10), tire);
      t.rotation.y = Z;
      rig.arms[n].add(k.at(t, 0, -0.47, 0));
    }
    k.decay(root, 0.5);
    root.scale.setScalar(p.size);
    return finalizeMonster(root, {
      rig, params: p, animations: BIPED_ANIMS,
      clips: { idle: 'idle', move: 'waddle', attack: 'pound', hit: 'hit', death: 'flop' },
    });
  },
};

// ---- ④ 변칙형: 그네 미믹 ---------------------------------------------------------
const SWING_ANIMS = {
  idle: {
    label: '대기 (삐걱삐걱)',
    duration: 2.6,
    apply(rig, u) {
      const w = u * TAU;
      rig.swing.rotation.x += Math.sin(w) * 0.25;
      rig.jaw.rotation.x += Math.abs(Math.sin(w)) * 0.1;
      rig.frame.rotation.z += Math.sin(w * 2) * 0.01;
      blinkEyes(rig, blink(u, [0.4]));
    },
  },
  stalk: {
    label: '다리로 걸어오기',
    duration: 1.2,
    apply(rig, u) {
      const w = u * TAU;
      const s = Math.sin(w);
      rig.legs.FL.rotation.x += s * 0.3;
      rig.legs.BR.rotation.x += s * 0.3;
      rig.legs.FR.rotation.x -= s * 0.3;
      rig.legs.BL.rotation.x -= s * 0.3;
      rig.frame.position.y += Math.abs(Math.cos(w)) * 0.05;
      rig.frame.rotation.z += s * 0.05;
      rig.swing.rotation.x += Math.sin(w - 0.6) * 0.4;
    },
  },
  whip: {
    label: '그네로 후려치기',
    duration: 1.2,
    apply(rig, u) {
      const arc = keys(u, [[0, 0], [0.3, -0.9], [0.5, 1.5], [0.65, 1.3], [1, 0]]);
      rig.swing.rotation.x += arc;
      rig.jaw.rotation.x += Math.max(0, arc) * 0.5;
      rig.frame.rotation.x -= arc * 0.05;
    },
  },
  hit: {
    label: '피격 (덜컹)',
    duration: 0.6,
    loop: false,
    apply(rig, u) {
      const h = keys(u, [[0, 0], [0.12, 1], [1, 0]]);
      rig.frame.rotation.z += Math.sin(u * TAU * 5) * 0.08 * h;
      rig.swing.rotation.x -= h * 0.6;
      blinkEyes(rig, h * 0.85);
    },
  },
  topple: {
    label: '옆으로 쓰러짐',
    duration: 1.4,
    loop: false,
    apply(rig, u) {
      const f = keys(u, [[0, 0], [0.2, -0.05], [0.65, 1], [0.75, 0.95], [0.85, 1], [1, 1]]);
      rig.frame.rotation.z += f * (Math.PI / 2 - 0.05);
      rig.frame.position.x += f * 0.1;
      rig.swing.rotation.z -= f * 1.2;
      blinkEyes(rig, smooth(u / 0.6) * 0.92);
    },
  },
};

export const swingMimic = {
  label: '그네 미믹',
  role: '④ 변칙형',
  defaults: { seed: 95, size: 1, frameColor: '#3a8a5a', seatColor: '#d8b03a' },
  schema: { ...common, frameColor: { label: '기둥 색' }, seatColor: { label: '의자 색' } },
  build(p) {
    const k = createKit(p.seed, 0.6, p.horror, { eyeColor: '#ff3a2a' });
    const metal = k.mat('frame', p.frameColor, { metalness: 0.4, roughness: 0.55 });
    const chain = k.mat('chain', '#8a9098', { metalness: 0.7 });
    const root = k.pivot('root');
    root.name = 'SwingMimic';
    const frame = k.pivot('frame');
    root.add(frame);
    const top = 1.5;
    frame.add(k.at(k.rot(k.cyl(0.035, 0.035, 1.3, metal, 6, 0.004), 0, 0, Z), 0, top, 0)); // top bar
    // A-frame legs that walk (pivot at the top bar ends)
    const legs = {};
    for (const [n, x, z] of [['FL', 1, 1], ['BL', 1, -1], ['FR', -1, 1], ['BR', -1, -1]]) {
      const leg = k.pivot(`leg${n}`, x * 0.62, top, 0);
      leg.rotation.x = z * 0.32;
      leg.add(k.at(k.cyl(0.03, 0.035, top / Math.cos(0.32), metal, 6, 0.004), 0, -top / Math.cos(0.32) / 2, 0));
      leg.add(k.at(k.box(0.09, 0.03, 0.09, metal, 0), 0, -top / Math.cos(0.32) + 0.01, 0));
      frame.add(leg);
      legs[n] = leg;
    }
    // eyes on the top bar
    const eyes = k.eyes(frame, { y: top + 0.02, z: 0.05, spacing: 0.17, size: 0.1 });
    // the swing: chains + seat that is also a toothy mouth
    const swing = k.pivot('swing', 0, top, 0);
    frame.add(swing);
    for (const s of [-1, 1]) swing.add(k.at(k.cyl(0.008, 0.008, 0.9, chain, 4), s * 0.2, -0.45, 0));
    const seat = k.mat('seat', p.seatColor);
    swing.add(k.at(k.box(0.48, 0.04, 0.2, seat, 0.006), 0, -0.92, 0));
    const tooth = k.mat('fang', '#e8dcc0', { keepColor: true });
    for (let i = 0; i < 6; i++) swing.add(k.at(k.cone(0.02, 0.06, tooth, 4), -0.2 + i * 0.08, -0.87, 0.08));
    const jaw = k.pivot('jaw', 0, -0.94, -0.1);
    jaw.add(k.at(k.box(0.46, 0.03, 0.2, k.mat('seatUnder', '#8a6a2a'), 0.004), 0, -0.015, 0.1));
    for (let i = 0; i < 5; i++) jaw.add(k.at(k.rot(k.cone(0.018, 0.05, tooth, 4), Math.PI, 0, 0), -0.16 + i * 0.08, -0.045, 0.18));
    swing.add(jaw);
    k.decay(root, 0.4);
    root.scale.setScalar(p.size);
    return finalizeMonster(root, {
      rig: { frame, legs, swing, jaw, eyes }, params: p, animations: SWING_ANIMS,
      clips: { idle: 'idle', move: 'stalk', attack: 'whip', hit: 'hit', death: 'topple' },
    });
  },
};

// ---- ⑤ 매복형: 모래밭 벌레 -------------------------------------------------------
export const sandboxWorm = {
  label: '모래밭 벌레',
  role: '⑤ 매복형',
  defaults: { seed: 97, size: 1.1, segments: 7, bodyColor: '#c98a8a', ringColor: '#9a5a62', bucketColor: '#3a9ad8' },
  schema: { ...common, segments: { label: '몸 마디', min: 4, max: 10, step: 1 }, bodyColor: { label: '몸 색' }, ringColor: { label: '고리 색' }, bucketColor: { label: '양동이 색' } },
  build(p) {
    const k = createKit(p.seed, 1, p.horror, { eyeColor: '#ffef3a' });
    const { root, rig } = buildSerpent(k, {
      name: 'SandboxWorm', segs: p.segments, segLen: 0.16, radius: 0.15, taper: 0.1, headR: 0.18, eyeSize: 0.05,
      mats: [k.mat('body', p.bodyColor), k.mat('ring', p.ringColor)],
    });
    k.smile(rig.head, { y: 0.07, z: 0.17, width: 0.16 });
    // toy bucket stuck on its head like a helmet
    const bucket = k.mat('bucket', p.bucketColor);
    rig.head.add(k.at(k.rot(k.cyl(0.15, 0.12, 0.16, bucket, 8, 0.006), 0.25, 0, 0.15), 0.02, 0.34, -0.03));
    rig.head.add(k.at(k.rot(k.mesh(new k.THREE.TorusGeometry(0.12, 0.008, 4, 10, Math.PI), k.mat('handle', '#e8e0d0')), 0.25, 0, 0.15), 0.02, 0.4, -0.03));
    // sandbox frame and sand
    const wood = k.mat('wood', '#a8743a');
    root.add(k.at(k.box(1.1, 0.04, 1.1, k.mat('sand', '#e0c08a', { roughness: 1 }), 0.01), 0, 0.05, 0));
    for (const [x, z, w, d] of [[0, 0.55, 1.2, 0.08], [0, -0.55, 1.2, 0.08], [0.55, 0, 0.08, 1.2], [-0.55, 0, 0.08, 1.2]]) root.add(k.at(k.box(w, 0.16, d, wood, 0.005), x, 0.08, z));
    root.add(k.at(k.rot(k.box(0.04, 0.2, 0.08, k.mat('toyShovel', '#ff5a3a'), 0), 0.4, 0, 0.3), 0.35, 0.15, 0.3));
    k.decay(root, 0.5);
    root.scale.setScalar(p.size);
    return finalizeMonster(root, {
      rig, params: p, animations: SERPENT_ANIMS,
      clips: { idle: 'idle', move: 'swim', attack: 'strike', hit: 'hit', death: 'death', special: 'emerge' },
    });
  },
};

// ---- ⑦ 지휘형: 오르골 광대 상자 --------------------------------------------------
const BOX_ANIMS = {
  idle: {
    label: '대기 (흔들흔들 스프링)',
    duration: 2,
    apply(rig, u) {
      const w = u * TAU;
      rig.spring.rotation.z += Math.sin(w) * 0.15;
      rig.spring.scale.y = 1 + Math.sin(w * 2) * 0.05;
      rig.head.rotation.z -= Math.sin(w) * 0.2;
      rig.crank.rotation.x = u * TAU;
      blinkEyes(rig, blink(u, [0.5]));
    },
  },
  hop: {
    label: '통통 뛰어오기',
    duration: 0.8,
    apply(rig, u) {
      const air = Math.sin(Math.PI * u);
      rig.box.position.y += air * 0.2;
      rig.spring.rotation.x -= air * 0.25;
      rig.spring.scale.y = 1 - air * 0.15 + (1 - air) * 0.1;
      rig.head.rotation.x += air * 0.2;
    },
  },
  lunge: {
    label: '튀어나와 물기',
    duration: 1.1,
    apply(rig, u) {
      const out = keys(u, [[0, 0], [0.25, -0.5], [0.4, 1], [0.7, 1], [1, 0]]);
      rig.spring.scale.y = 1 + out * 0.9;
      rig.spring.rotation.x += Math.max(0, out) * 0.6;
      rig.jaw.rotation.x += Math.max(0, out) * Math.abs(Math.sin(u * TAU * 4)) * 0.5;
    },
  },
  hit: {
    label: '피격',
    duration: 0.6,
    loop: false,
    apply(rig, u) {
      const h = keys(u, [[0, 0], [0.12, 1], [1, 0]]);
      rig.spring.rotation.x -= h * 0.6;
      rig.spring.scale.y = 1 - h * 0.3;
      rig.box.rotation.z += Math.sin(u * TAU * 4) * 0.1 * h;
      blinkEyes(rig, h * 0.85);
    },
  },
  shutIn: {
    label: '상자 속으로 쏙 (닫힘)',
    duration: 1.4,
    loop: false,
    apply(rig, u) {
      const f = keys(u, [[0, 0], [0.2, 0.2], [0.6, 1], [1, 1]]);
      rig.spring.scale.y = Math.max(0.08, 1 - f * 0.95);
      rig.spring.rotation.z += (1 - f) * Math.sin(u * TAU * 3) * 0.3;
      rig.lid.rotation.x += f * 1.9; // swing shut
      blinkEyes(rig, f * 0.9);
    },
  },
  music: {
    label: '오르골 연주 (동료 호출)',
    duration: 2.4,
    apply(rig, u) {
      const c = keys(u, [[0, 0], [0.15, 1], [0.85, 1], [1, 0]]);
      rig.crank.rotation.x = u * TAU * 4;
      rig.head.rotation.y += Math.sin(u * TAU * 2) * 0.8 * c;
      rig.spring.rotation.z += Math.sin(u * TAU * 4) * 0.25 * c;
      rig.spring.scale.y = 1 + c * 0.2;
      rig.jaw.rotation.x += Math.abs(Math.sin(u * TAU * 6)) * 0.4 * c;
      rig.box.rotation.y += Math.sin(u * TAU * 2) * 0.1 * c;
    },
  },
};

export const jackInTheBox = {
  label: '오르골 광대 상자',
  role: '⑦ 지휘형',
  defaults: { seed: 99, size: 1, boxColor: '#7a3aa8', panelColor: '#ffd24a', faceColor: '#e8e0d4', hatColor: '#d8302a' },
  schema: { ...common, boxColor: { label: '상자 색' }, panelColor: { label: '무늬 색' }, faceColor: { label: '얼굴 색' }, hatColor: { label: '모자 색' } },
  build(p) {
    const k = createKit(p.seed, 0.6, p.horror, { eyeColor: '#ff3a2a' });
    const boxMat = k.mat('box', p.boxColor);
    const panel = k.mat('panel', p.panelColor);
    const root = k.pivot('root');
    root.name = 'JackInTheBox';
    const box = k.pivot('box');
    root.add(box);
    box.add(k.at(k.box(0.5, 0.5, 0.5, boxMat, 0.008), 0, 0.25, 0));
    for (const [x, z, ry] of [[0, 0.252, 0], [0, -0.252, 0], [0.252, 0, Z], [-0.252, 0, Z]]) {
      box.add(k.at(k.rot(k.box(0.28, 0.28, 0.01, panel, 0), 0, ry, Math.PI / 4), x, 0.25, z));
    }
    // crank on the side
    const crank = k.pivot('crank', 0.26, 0.25, 0);
    crank.add(k.at(k.box(0.04, 0.02, 0.02, k.mat('crankMetal', '#c9a23a', { metalness: 0.6 }), 0), 0.02, 0, 0));
    crank.add(k.at(k.box(0.02, 0.14, 0.02, k.mat('crankMetal', '#c9a23a', { metalness: 0.6 }), 0), 0.04, 0.06, 0));
    crank.add(k.at(k.ball(0.025, k.mat('knob', '#d8302a'), 0), 0.06, 0.12, 0));
    box.add(crank);
    // lid, open (hinged at the back)
    const lid = k.pivot('lid', 0, 0.5, -0.25);
    lid.add(k.at(k.box(0.52, 0.03, 0.52, boxMat, 0.006), 0, 0.015, 0.26));
    lid.rotation.x = -1.9;
    box.add(lid);
    // spring with the clown head on top
    const spring = k.pivot('spring', 0, 0.48, 0);
    const coil = k.mat('coil', '#c0c8d0', { metalness: 0.7 });
    for (let i = 0; i < 6; i++) {
      const ring = k.mesh(new k.THREE.TorusGeometry(0.07, 0.012, 4, 10), coil);
      ring.rotation.x = Z;
      spring.add(k.at(ring, 0, 0.03 + i * 0.05, 0));
    }
    box.add(spring);
    const head = k.pivot('head', 0, 0.33, 0);
    head.add(k.at(k.ball(0.16, k.mat('face', p.faceColor), 2, 0.01), 0, 0.12, 0));
    head.add(k.at(k.ball(0.04, k.mat('nose', '#d8302a'), 1), 0, 0.11, 0.16));
    const eyes = k.eyes(head, { y: 0.17, z: 0.13, spacing: 0.06, size: 0.045 });
    for (const s of [-1, 1]) head.add(k.at(k.box(0.015, 0.06, 0.005, k.mat('tearPaint', '#2a2a5a'), 0), s * 0.06, 0.1, 0.15)); // painted tears
    const jaw = k.pivot('jaw', 0, 0.05, 0.02);
    k.smile(head, { y: 0.06, z: 0.15, width: 0.16, segs: 6 });
    head.add(jaw);
    jaw.add(k.at(k.box(0.14, 0.03, 0.08, k.mat('face', p.faceColor), 0), 0, -0.01, 0.1));
    // jester hat with bells
    const hat = k.mat('hat', p.hatColor);
    for (const s of [-1, 1]) {
      head.add(k.at(k.rot(k.cone(0.07, 0.2, hat, 5, 0.01), 0, 0, -s * 0.9), s * 0.12, 0.3, 0));
      head.add(k.at(k.ball(0.025, k.mat('bell', '#ffd24a', { metalness: 0.7 }), 0), s * 0.21, 0.36, 0));
    }
    head.add(k.at(k.cyl(0.16, 0.16, 0.05, panel, 10), 0, 0.24, 0));
    // ruffled collar
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      head.add(k.at(k.scl(k.ball(0.05, i % 2 ? panel : hat, 0), 1, 0.5, 1), Math.cos(a) * 0.12, -0.02, Math.sin(a) * 0.12));
    }
    spring.add(head);
    k.decay(root, 0.4);
    root.scale.setScalar(p.size);
    return finalizeMonster(root, {
      rig: { box, crank, lid, spring, head, jaw, eyes }, params: p, animations: BOX_ANIMS,
      clips: { idle: 'idle', move: 'hop', attack: 'lunge', hit: 'hit', death: 'shutIn', special: 'music' },
    });
  },
};

export { strayDog, balloonMonster };
