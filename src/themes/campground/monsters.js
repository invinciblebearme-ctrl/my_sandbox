// Campground & Lake: 7 friendly monsters, one per role.
import { createKit } from '../../core/kit.js';
import { finalizeMonster, TAU, keys, blink, smooth, clamp01 } from '../../core/monster.js';
import { buildBiped, BIPED_ANIMS } from '../../rigs/biped.js';
import { buildQuadruped, QUAD_ANIMS } from '../../rigs/quadruped.js';
import { buildSerpent, SERPENT_ANIMS } from '../../rigs/serpent.js';

const sides = [['L', 1], ['R', -1]];
const blinkEyes = (rig, a) => rig.eyes.forEach((e) => { e.scale.y = Math.max(0.08, 1 - a); });
// z of the surface of a (scaled) sphere face at height offset dy
const surf = (face, dy) => face.r * Math.sqrt(Math.max(0, 1 - (dy / face.ry) ** 2));
const common = {
  seed: { label: '시드', min: 1, max: 999, step: 1 },
  size: { label: '크기', min: 0.5, max: 2, step: 0.01 },
};

// ---- ① 기본형: 늪지 괴물 "개굴덩이" ------------------------------------------------
export const swampy = {
  label: '늪지 덩이',
  role: '① 기본형',
  defaults: {
    seed: 3, size: 1, lumpy: 1, chubby: 1, bodyColor: '#6cc06a', mossColor: '#3f8f4e',
    bellyColor: '#c9eba0', flowerColor: '#ff8fc2',
  },
  schema: {
    ...common,
    lumpy: { label: '울퉁불퉁', min: 0, max: 3, step: 0.01 },
    chubby: { label: '통통함', min: 0.7, max: 1.4, step: 0.01 },
    bodyColor: { label: '몸 색' }, mossColor: { label: '이끼 색' },
    bellyColor: { label: '배 색' }, flowerColor: { label: '꽃 색' },
  },
  build(p) {
    const k = createKit(p.seed, p.lumpy);
    const body = k.mat('body', p.bodyColor);
    const moss = k.mat('moss', p.mossColor);
    const { root, rig, face } = buildBiped(k, {
      name: 'Swampy', bodyR: 0.42, bodyScale: [p.chubby, 1.05, 0.92 * p.chubby], bodyMat: body,
      legLen: 0.16, legR: 0.09, armLen: 0.28, armR: 0.075, footMat: moss,
    });
    const f = face.parent;
    f.add(k.at(k.scl(k.ball(0.27, k.mat('belly', p.bellyColor), 1, 0.01), p.chubby, 0.85, 0.3), 0, face.cy - 0.13, surf(face, -0.13) - 0.05));
    // moss lumps on the back and shoulders
    for (let i = 0; i < 7; i++) {
      const a = k.rand(Math.PI * 0.55, Math.PI * 1.45);
      const y = k.rand(-0.1, 0.35);
      const rr = Math.sqrt(1 - (y / face.ry) ** 2);
      f.add(k.at(k.scl(k.ball(k.rand(0.06, 0.11), moss, 1, 0.01), 1, 0.6, 1),
        Math.sin(a) * face.r * rr * p.chubby, face.cy + y, Math.cos(a) * face.r * rr));
    }
    // slime drips around the bottom
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU + 0.3;
      f.add(k.at(k.rot(k.cone(0.035, 0.12, body, 5), Math.PI, 0, 0),
        Math.sin(a) * face.r * 0.85 * p.chubby, face.cy - face.ry * 0.55, Math.cos(a) * face.r * 0.85));
    }
    // lily-pad hat with a flower
    const hat = k.pivot('hat', 0.05, face.cy + face.ry * 0.93, 0);
    hat.rotation.z = -0.18;
    hat.add(k.cyl(0.25, 0.25, 0.025, k.mat('lily', '#3fae5a'), 10));
    const petal = k.mat('flower', p.flowerColor);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU;
      hat.add(k.at(k.rot(k.scl(k.ball(0.05, petal, 0), 1, 0.5, 1.6), 0, a, 0), Math.sin(a) * 0.05, 0.04, Math.cos(a) * 0.05));
    }
    hat.add(k.at(k.ball(0.03, k.mat('flowerCenter', '#ffd54a'), 0), 0, 0.06, 0));
    f.add(hat);
    // face
    rig.eyes = k.eyes(f, { y: face.cy + 0.15, z: surf(face, 0.15) - 0.03, spacing: 0.14, size: 0.1 });
    k.smile(f, { y: face.cy - 0.0, z: surf(face, 0) + 0.005, width: 0.2 });
    k.cheeks(f, { y: face.cy + 0.03, z: surf(face, 0.03) - 0.01, spacing: 0.25 });
    root.scale.setScalar(p.size);
    return finalizeMonster(root, {
      rig, params: p, animations: BIPED_ANIMS,
      clips: { idle: 'idle', move: 'waddle', attack: 'clap', hit: 'hit', death: 'melt' },
    });
  },
};

// ---- ② 돌격형: 장난꾸러기 늑대 ---------------------------------------------------
export const wolfPup = {
  label: '장난꾸러기 늑대',
  role: '② 돌격형',
  defaults: { seed: 5, size: 1, headSize: 0.32, furColor: '#8fa3c4', bellyColor: '#eef0f5', bandanaColor: '#ff6b5a' },
  schema: {
    ...common,
    headSize: { label: '머리 크기', min: 0.22, max: 0.42, step: 0.01 },
    furColor: { label: '털 색' }, bellyColor: { label: '배 색' }, bandanaColor: { label: '두건 색' },
  },
  build(p) {
    const k = createKit(p.seed, 1);
    const fur = k.mat('fur', p.furColor);
    const { root, rig } = buildQuadruped(k, {
      name: 'WolfPup', len: 0.62, width: 0.34, height: 0.3, legLen: 0.26, headSize: p.headSize, snout: 0.13,
      furMat: fur, bellyMat: k.mat('belly', p.bellyColor), pawMat: k.mat('belly', p.bellyColor),
      noseMat: k.mat('nose', '#2d2a35'), earInnerMat: k.mat('earInner', '#ffb3c4'), eyeSize: p.headSize * 0.22,
    });
    // bandana around the neck
    const band = k.mat('bandana', p.bandanaColor);
    rig.neck.add(k.at(k.box(0.24, 0.07, 0.2, band, 0.004), 0, 0.02, 0.02));
    rig.neck.add(k.at(k.rot(k.cone(0.09, 0.14, band, 3), Math.PI, 0, 0), 0, -0.05, 0.1));
    k.cheeks(rig.head, { y: -p.headSize * 0.05, z: p.headSize * 0.5, spacing: p.headSize * 0.36, size: 0.035 });
    // fluffy cheek tufts
    for (const [, s] of sides) rig.head.add(k.at(k.rot(k.cone(0.05, 0.12, fur, 4), 0, 0, s * 1.9), s * p.headSize * 0.55, -p.headSize * 0.15, 0));
    root.scale.setScalar(p.size);
    return finalizeMonster(root, {
      rig, params: p, animations: QUAD_ANIMS,
      clips: { idle: 'idle', move: 'gallop', attack: 'pounce', hit: 'hit', death: 'death', special: 'howl' },
    });
  },
};

// ---- ③ 탱커: 대장곰 ---------------------------------------------------------------
export const bigBear = {
  label: '대장곰',
  role: '③ 탱커',
  defaults: { seed: 11, size: 1.25, chubby: 1, furColor: '#a8744a', bellyColor: '#f0d2a4', scarfColor: '#e8453c' },
  schema: {
    ...common,
    chubby: { label: '통통함', min: 0.8, max: 1.4, step: 0.01 },
    furColor: { label: '털 색' }, bellyColor: { label: '배·주둥이 색' }, scarfColor: { label: '목도리 색' },
  },
  build(p) {
    const k = createKit(p.seed, 0.6);
    const fur = k.mat('fur', p.furColor);
    const light = k.mat('belly', p.bellyColor);
    const { root, rig, face } = buildBiped(k, {
      name: 'BigBear', bodyR: 0.48, bodyScale: [1.05 * p.chubby, 1.05, 0.95 * p.chubby], bodyMat: fur,
      headR: 0.3, legLen: 0.2, legR: 0.12, armLen: 0.34, armR: 0.1, handMat: light, footMat: light,
    });
    const d = rig.dims;
    rig.body.add(k.at(k.scl(k.ball(0.32, light, 1, 0.01), p.chubby, 0.95, 0.35), 0, d.cy - 0.05, 0.48 * 0.95 * p.chubby * 0.82));
    // scarf
    const scarf = k.mat('scarf', p.scarfColor);
    rig.body.add(k.at(k.cyl(0.27, 0.31, 0.09, scarf, 10, 0.006), 0, d.cy + 0.47, 0));
    rig.body.add(k.at(k.rot(k.box(0.09, 0.22, 0.03, scarf, 0.004), 0.2, 0, 0.25), 0.12, d.cy + 0.36, 0.3));
    // tail
    rig.body.add(k.at(k.ball(0.08, fur, 1), 0, d.cy - 0.25, -0.45));
    // head: ears, snout, nose
    const h = face.parent;
    for (const [, s] of sides) {
      h.add(k.at(k.scl(k.ball(0.1, fur, 1), 1, 1, 0.6), s * 0.21, face.cy + 0.22, -0.02));
      h.add(k.at(k.scl(k.ball(0.06, light, 1), 1, 1, 0.4), s * 0.21, face.cy + 0.22, 0.03));
    }
    h.add(k.at(k.scl(k.ball(0.13, light, 1), 1, 0.75, 0.8), 0, face.cy - 0.08, 0.24));
    h.add(k.at(k.scl(k.ball(0.045, k.mat('nose', '#3a2a22'), 1), 1.3, 0.9, 1), 0, face.cy - 0.04, 0.34));
    k.smile(h, { y: face.cy - 0.12, z: 0.335, width: 0.08, segs: 4, thick: 0.018 });
    rig.eyes = k.eyes(h, { y: face.cy + 0.07, z: 0.25, spacing: 0.11, size: 0.065 });
    k.cheeks(h, { y: face.cy - 0.04, z: 0.24, spacing: 0.19, size: 0.045 });
    root.scale.setScalar(p.size);
    return finalizeMonster(root, {
      rig, params: p, animations: BIPED_ANIMS,
      clips: { idle: 'idle', move: 'waddle', attack: 'pound', hit: 'hit', death: 'flop' },
    });
  },
};

// ---- ④ 변칙형: 텐트 미믹 -----------------------------------------------------------
const TENT_ANIMS = {
  idle: {
    label: '대기 (숨쉬는 텐트)',
    duration: 2.6,
    apply(rig, u) {
      const w = u * TAU;
      rig.roof.rotation.x -= (0.5 + 0.5 * Math.sin(w)) * 0.06;
      rig.roof.scale.y = 1 + Math.sin(w) * 0.02;
      rig.flag.rotation.y += Math.sin(w * 3) * 0.5;
      rig.tongue.rotation.x += Math.sin(w * 2) * 0.1;
      blinkEyes(rig, blink(u, [0.35, 0.85]));
    },
  },
  hop: {
    label: '깡총 뛰기',
    duration: 0.8,
    apply(rig, u) {
      const air = Math.sin(Math.PI * u);
      const land = 1 - smooth(Math.min(u, 1 - u) / 0.12);
      rig.body.position.y += air * 0.35;
      rig.body.scale.set(1 + land * 0.12 - air * 0.04, 1 - land * 0.15 + air * 0.08, 1 + land * 0.12 - air * 0.04);
      rig.roof.rotation.x -= air * 0.15;
      rig.pegs.forEach((peg, i) => { peg.rotation.x += air * (i < 2 ? -0.6 : 0.6); });
      rig.flag.rotation.y += Math.sin(u * TAU * 2) * 0.6;
    },
  },
  chomp: {
    label: '와앙 물기',
    duration: 1.1,
    apply(rig, u) {
      const open = keys(u, [[0, 0], [0.3, 1], [0.42, 0.05], [0.55, 0.8], [0.66, 0], [1, 0]]);
      const tongue = keys(u, [[0, 0], [0.2, 0], [0.32, 1], [0.42, 0], [1, 0]]);
      rig.roof.rotation.x -= open * 0.75;
      rig.tongue.scale.z = 1 + tongue * 1.6;
      rig.tongue.rotation.x -= tongue * 0.3;
      rig.body.position.z += Math.max(0, 0.42 - Math.abs(u - 0.42)) * 0.3;
      blinkEyes(rig, open < 0.1 && u > 0.4 && u < 0.7 ? 0.6 : 0);
    },
  },
  hit: {
    label: '피격 (부르르)',
    duration: 0.6,
    loop: false,
    apply(rig, u) {
      const h = keys(u, [[0, 0], [0.12, 1], [1, 0]]);
      rig.body.rotation.z += Math.sin(u * TAU * 5) * 0.18 * h;
      rig.body.scale.set(1 + h * 0.08, 1 - h * 0.1, 1 + h * 0.08);
      rig.flag.rotation.z += h * 0.6;
      blinkEyes(rig, h * 0.85);
    },
  },
  collapse: {
    label: '폭삭 무너짐',
    duration: 1.3,
    loop: false,
    apply(rig, u) {
      const f = keys(u, [[0, 0], [0.2, -0.1], [0.65, 1], [0.78, 0.9], [0.9, 1], [1, 1]]);
      rig.roof.scale.y = 1 - f * 0.82;
      rig.roof.scale.x = 1 + f * 0.15;
      rig.body.position.y -= f * 0.11;
      rig.pegs.forEach((peg, i) => { peg.rotation.z += f * (i % 2 ? -1.2 : 1.2); });
      rig.flag.rotation.z += f * 1.3;
      blinkEyes(rig, smooth(u / 0.5) * 0.92);
    },
  },
};

export const tentMimic = {
  label: '텐트 미믹',
  role: '④ 변칙형',
  defaults: { seed: 9, size: 1, tentColor: '#f29b4b', stripeColor: '#ffd56a', flagColor: '#5ab4ff' },
  schema: { ...common, tentColor: { label: '텐트 색' }, stripeColor: { label: '줄무늬 색' }, flagColor: { label: '깃발 색' } },
  build(p) {
    const k = createKit(p.seed, 0.5);
    const tent = k.mat('tent', p.tentColor);
    const stripe = k.mat('stripe', p.stripeColor);
    const r = 0.42;
    const depth = 0.8;
    const root = k.pivot('root');
    root.name = 'TentMimic';
    const body = k.pivot('body', 0, 0.14, 0);
    root.add(body);
    // ground sheet + mouth floor, teeth and tongue
    body.add(k.at(k.box(0.84, 0.06, depth + 0.04, k.mat('floor', '#4e7a45'), 0.004), 0, 0.03, 0));
    body.add(k.at(k.box(0.6, 0.02, depth * 0.9, k.mat('mouth', '#5a2236'), 0), 0, 0.065, 0));
    const tooth = k.mat('teeth', '#fffaf0');
    for (let i = 0; i < 4; i++) body.add(k.at(k.cone(0.03, 0.07, tooth, 4), -0.21 + i * 0.14, 0.1, depth / 2 - 0.03));
    const tongue = k.pivot('tongue', 0, 0.08, 0.05);
    tongue.add(k.at(k.scl(k.ball(0.13, k.mat('tongue', '#ff7a9a'), 1), 1, 0.3, 1.5), 0, 0, 0.1));
    body.add(tongue);
    // roof (the whole tent shell) hinged at the back edge so it can open like a mouth
    const roof = k.pivot('roof', 0, 0.06, -depth / 2);
    body.add(roof);
    roof.add(k.at(k.rot(k.cyl(r, r, depth, tent, 3, 0.01), -Math.PI / 2, 0, 0), 0, r / 2, depth / 2));
    roof.add(k.at(k.rot(k.cyl(r * 0.25, r * 0.25, depth + 0.01, stripe, 3), -Math.PI / 2, 0, 0), 0, r * 1.33, depth / 2));
    // front door: darker triangle with a zipper line
    roof.add(k.at(k.rot(k.cyl(r * 0.62, r * 0.62, 0.02, k.mat('door', '#c46a2c'), 3), -Math.PI / 2, 0, 0), 0, r * 0.36, depth + 0.005));
    roof.add(k.at(k.box(0.012, r * 0.55, 0.01, k.mat('zip', '#7a3a12'), 0), 0, r * 0.3, depth + 0.02));
    for (let i = 0; i < 4; i++) roof.add(k.at(k.rot(k.cone(0.03, 0.07, tooth, 4), Math.PI, 0, 0), -0.21 + i * 0.14, 0.0, depth - 0.02));
    const eyes = k.eyes(roof, { y: r * 0.82, z: depth + 0.02, spacing: 0.09, size: 0.075 });
    // flag on the ridge
    const flag = k.pivot('flag', 0, r * 1.5, depth * 0.15);
    flag.add(k.at(k.cyl(0.012, 0.012, 0.3, k.mat('pole', '#6b4a2b'), 5), 0, 0.15, 0));
    flag.add(k.at(k.rot(k.scl(k.cone(0.07, 0.16, k.mat('flag', p.flagColor), 3), 1, 1, 0.2), 0, 0, -Math.PI / 2), 0.08, 0.26, 0));
    roof.add(flag);
    // tent-peg legs
    const pegs = [];
    for (const [n, x, z] of [['FL', 1, 1], ['FR', -1, 1], ['BL', 1, -1], ['BR', -1, -1]]) {
      const peg = k.pivot(`peg${n}`, x * 0.34, 0.02, z * 0.33);
      peg.add(k.at(k.cyl(0.025, 0.012, 0.16, k.mat('metal', '#b8c2cc', { metalness: 0.4 }), 5), 0, -0.07, 0));
      body.add(peg);
      pegs.push(peg);
    }
    root.scale.setScalar(p.size);
    return finalizeMonster(root, {
      rig: { body, roof, tongue, flag, pegs, eyes }, params: p, animations: TENT_ANIMS,
      clips: { idle: 'idle', move: 'hop', attack: 'chomp', hit: 'hit', death: 'collapse' },
    });
  },
};

// ---- ⑤ 매복형: 호수 장어 -----------------------------------------------------------
export const lakeEel = {
  label: '호수 장어',
  role: '⑤ 매복형',
  defaults: { seed: 4, size: 1, segments: 6, bodyColor: '#4fc1b4', stripeColor: '#2f8fa3', finColor: '#ffcf5a', waterColor: '#6ec6ff' },
  schema: {
    ...common, segments: { label: '몸 마디', min: 4, max: 9, step: 1 },
    bodyColor: { label: '몸 색' }, stripeColor: { label: '줄무늬 색' }, finColor: { label: '지느러미 색' }, waterColor: { label: '물웅덩이 색' },
  },
  build(p) {
    const k = createKit(p.seed, 0.6);
    const { root, rig } = buildSerpent(k, {
      name: 'LakeEel', segs: p.segments, segLen: 0.19, radius: 0.13, taper: 0.2, headR: 0.21,
      mats: [k.mat('body', p.bodyColor), k.mat('stripe', p.stripeColor)],
    });
    const fin = k.mat('fin', p.finColor);
    const h = rig.head;
    for (const [, s] of sides) h.add(k.at(k.rot(k.scl(k.cone(0.07, 0.16, fin, 4), 1, 1, 0.3), 0, 0, -s * 1.2), s * 0.22, 0.18, -0.02));
    h.add(k.at(k.rot(k.scl(k.cone(0.08, 0.16, fin, 4), 0.3, 1, 1), 0, 0, 0), 0, 0.38, -0.05)); // head crest
    k.smile(h, { y: 0.1, z: 0.21, width: 0.14 });
    k.cheeks(h, { y: 0.13, z: 0.17, spacing: 0.15, size: 0.035 });
    rig.jaw.add(k.at(k.scl(k.ball(0.05, k.mat('tongue', '#ff7a9a'), 1), 1, 0.4, 1), 0, -0.04, 0.0));
    // puddle (static, on the root so it stays when the eel dives)
    root.add(k.at(k.cyl(0.5, 0.52, 0.02, k.mat('water', p.waterColor, { roughness: 0.15, metalness: 0.1 }), 14), 0, 0.01, 0));
    const pebble = k.mat('pebble', '#9aa3a8');
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * TAU + k.rand(-0.2, 0.2);
      root.add(k.at(k.scl(k.ball(k.rand(0.04, 0.07), pebble, 0, 0.01), 1, 0.6, 1), Math.sin(a) * 0.55, 0.02, Math.cos(a) * 0.55));
    }
    root.scale.setScalar(p.size);
    return finalizeMonster(root, {
      rig, params: p, animations: SERPENT_ANIMS,
      clips: { idle: 'idle', move: 'swim', attack: 'strike', hit: 'hit', death: 'death', special: 'emerge' },
    });
  },
};

// ---- ⑥ 자폭/원거리: 포자 버섯 ------------------------------------------------------
const SPORES = 8;
const MUSH_ANIMS = {
  idle: {
    label: '대기 (갓 흔들기)',
    duration: 2.4,
    apply(rig, u) {
      const w = u * TAU;
      rig.cap.rotation.z += Math.sin(w) * 0.08;
      rig.cap.rotation.x += Math.sin(w * 2) * 0.03;
      rig.body.scale.y = 1 + Math.sin(w) * 0.025;
      for (const [n, s] of sides) rig.arms[n].rotation.z += s * Math.sin(w + s) * 0.15;
      blinkEyes(rig, blink(u, [0.5]));
    },
  },
  hop: {
    label: '통통 뛰기',
    duration: 0.7,
    apply(rig, u) {
      const air = Math.sin(Math.PI * u);
      const land = 1 - smooth(Math.min(u, 1 - u) / 0.12);
      rig.body.position.y += air * 0.25;
      rig.body.scale.set(1 + land * 0.12, 1 - land * 0.16 + air * 0.06, 1 + land * 0.12);
      rig.cap.position.y -= land * 0.04;
      rig.cap.scale.set(1 + land * 0.06, 1 - land * 0.08, 1 + land * 0.06);
      for (const [n, s] of sides) {
        rig.feet[n].rotation.x -= air * 0.6;
        rig.arms[n].rotation.z += s * air * 0.6;
      }
    },
  },
  puff: {
    label: '포자 뿜기',
    duration: 1.5,
    apply(rig, u) {
      const squash = keys(u, [[0, 0], [0.35, 1], [0.45, -0.6], [0.6, 0], [1, 0]]);
      rig.body.scale.set(1 + squash * 0.12, 1 - squash * 0.2, 1 + squash * 0.12);
      rig.cap.position.y += Math.max(0, -squash) * 0.1;
      rig.cap.scale.setScalar(1 + Math.max(0, -squash) * 0.15);
      const out = clamp01((u - 0.42) / 0.5);
      rig.spores.forEach((sp, i) => {
        const a = (i / SPORES) * TAU;
        const reach = 0.25 + 0.45 * out;
        sp.position.set(Math.cos(a) * reach * out, 0.25 + out * 0.35 + Math.sin(out * Math.PI) * 0.15, Math.sin(a) * reach * out + out * 0.25);
        sp.scale.setScalar(out > 0 && out < 1 ? Math.max(0.001, Math.sin(Math.PI * out)) : 0.001);
      });
      blinkEyes(rig, squash > 0.6 ? 0.85 : 0);
    },
  },
  hit: {
    label: '피격 (빙글)',
    duration: 0.7,
    loop: false,
    apply(rig, u) {
      const h = keys(u, [[0, 0], [0.12, 1], [1, 0]]);
      rig.cap.rotation.z += Math.sin(u * TAU * 3) * 0.4 * (1 - u);
      rig.body.scale.set(1 + h * 0.1, 1 - h * 0.12, 1 + h * 0.1);
      rig.body.rotation.x -= h * 0.2;
      blinkEyes(rig, h * 0.85);
    },
  },
  death: {
    label: '갓이 툭 떨어짐',
    duration: 1.5,
    loop: false,
    apply(rig, u) {
      const pop = keys(u, [[0, 0], [0.25, 1], [1, 1]]);
      const fall = keys(u, [[0, 0], [0.2, 0], [0.6, 1], [0.7, 0.92], [0.8, 1], [1, 1]]);
      rig.cap.position.y += Math.sin(Math.PI * clamp01(u / 0.6)) * 0.25 - fall * 0.38;
      rig.cap.position.x += fall * 0.45;
      rig.cap.rotation.z -= fall * 1.45;
      rig.body.scale.y = 1 - pop * 0.25;
      rig.body.rotation.z += fall * 0.15;
      blinkEyes(rig, smooth(u / 0.4) * 0.92);
    },
  },
};

export const sporeShroom = {
  label: '포자 버섯',
  role: '⑥ 자폭/원거리',
  defaults: { seed: 2, size: 1, capSize: 1, capColor: '#ff5b5b', spotColor: '#fff7e8', stemColor: '#fbe7c6', sporeColor: '#d6ff6b' },
  schema: {
    ...common, capSize: { label: '갓 크기', min: 0.7, max: 1.5, step: 0.01 },
    capColor: { label: '갓 색' }, spotColor: { label: '점 색' }, stemColor: { label: '기둥 색' }, sporeColor: { label: '포자 색' },
  },
  build(p) {
    const k = createKit(p.seed, 0.6);
    const stem = k.mat('stem', p.stemColor);
    const root = k.pivot('root');
    root.name = 'SporeShroom';
    const body = k.pivot('body', 0, 0.06, 0);
    root.add(body);
    body.add(k.at(k.cyl(0.19, 0.24, 0.42, stem, 9, 0.01), 0, 0.21, 0));
    const eyes = k.eyes(body, { y: 0.26, z: 0.19, spacing: 0.085, size: 0.06 });
    k.smile(body, { y: 0.15, z: 0.215, width: 0.1, segs: 4, thick: 0.02 });
    k.cheeks(body, { y: 0.18, z: 0.2, spacing: 0.15, size: 0.035 });
    const feet = {};
    const arms = {};
    for (const [n, s] of sides) {
      const foot = k.pivot(`foot${n}`, s * 0.11, 0.02, 0.03);
      foot.add(k.at(k.scl(k.ball(0.07, stem, 1), 1, 0.6, 1.3), 0, -0.02, 0.02));
      body.add(foot);
      feet[n] = foot;
      const arm = k.pivot(`arm${n}`, s * 0.2, 0.24, 0);
      arm.add(k.at(k.cyl(0.03, 0.03, 0.12, stem, 5), 0, -0.06, 0));
      arm.add(k.at(k.ball(0.045, stem, 1), 0, -0.13, 0));
      arm.rotation.z = s * 0.5;
      body.add(arm);
      arms[n] = arm;
    }
    const cap = k.pivot('cap', 0, 0.4, 0);
    body.add(cap);
    const cr = 0.4 * p.capSize;
    cap.add(k.scl(k.dome(cr, k.mat('cap', p.capColor), 10, 0.015), 1, 0.75, 1));
    cap.add(k.at(k.cyl(cr * 0.95, cr * 0.9, 0.04, k.mat('gills', '#f2d6b3'), 12), 0, -0.01, 0));
    const spot = k.mat('spot', p.spotColor);
    for (let i = 0; i < 7; i++) {
      const a = k.rand(0, TAU);
      const el = k.rand(0.25, 1.2);
      const d = k.scl(k.ball(k.rand(0.04, 0.07) * p.capSize, spot, 1), 1, 0.35, 1);
      d.position.set(Math.cos(a) * Math.cos(el) * cr, Math.sin(el) * cr * 0.75, Math.sin(a) * Math.cos(el) * cr);
      d.lookAt(d.position.clone().multiply({ x: 2, y: 2.6, z: 2 }));
      d.rotateX(Math.PI / 2);
      cap.add(d);
    }
    const spores = [];
    const sporeMat = k.glow('spore', p.sporeColor, 0.8);
    for (let i = 0; i < SPORES; i++) {
      const sp = k.pivot(`spore${i}`, 0, 0.25, 0);
      sp.add(k.ball(0.05, sporeMat, 0));
      sp.scale.setScalar(0.001);
      cap.add(sp);
      spores.push(sp);
    }
    root.scale.setScalar(p.size);
    return finalizeMonster(root, {
      rig: { body, cap, feet, arms, spores, eyes }, params: p, animations: MUSH_ANIMS,
      clips: { idle: 'idle', move: 'hop', attack: 'puff', hit: 'hit', death: 'death' },
    });
  },
};

// ---- ⑦ 지휘형: 캠프파이어 도깨비불 -------------------------------------------------
const SPARKS = 4;
const orbit = (rig, u, radius, height, speed = 1) => rig.sparks.forEach((sp, i) => {
  const a = (i / SPARKS) * TAU + u * TAU * speed;
  sp.position.set(Math.cos(a) * radius, height + Math.sin(a * 2) * 0.05, Math.sin(a) * radius);
});
const WISP_ANIMS = {
  idle: {
    label: '대기 (둥실둥실)',
    duration: 2.4,
    apply(rig, u) {
      const w = u * TAU;
      rig.float.position.y += Math.sin(w) * 0.06;
      rig.tip.scale.y = 1 + Math.sin(w * 3) * 0.12;
      rig.tip.rotation.z += Math.sin(w * 2) * 0.12;
      for (const [n, s] of sides) rig.hands[n].position.y += Math.sin(w + s) * 0.03;
      orbit(rig, u, 0.5, 0.05);
      blinkEyes(rig, blink(u, [0.6]));
    },
  },
  drift: {
    label: '날아가기',
    duration: 1.2,
    apply(rig, u) {
      const w = u * TAU;
      rig.float.rotation.x += 0.3;
      rig.float.position.y += Math.sin(w * 2) * 0.05;
      rig.tip.rotation.x -= 0.5 + Math.sin(w * 2) * 0.1;
      rig.tip.scale.y = 1.1 + Math.sin(w * 4) * 0.1;
      for (const [n] of sides) rig.hands[n].position.z -= 0.12;
      rig.sparks.forEach((sp, i) => sp.position.set(Math.sin(w + i * 1.6) * 0.15, 0.1 * i - 0.1, -0.4 - i * 0.12));
    },
  },
  fireball: {
    label: '불꽃 던지기',
    duration: 1.2,
    apply(rig, u) {
      const wind = keys(u, [[0, 0], [0.35, 1], [0.45, -1], [0.7, -0.6], [1, 0]]);
      rig.hands.R.position.z -= Math.max(0, wind) * 0.25 - Math.max(0, -wind) * 0.3;
      rig.hands.R.position.y += Math.max(0, wind) * 0.2;
      rig.float.rotation.x += -wind * 0.2;
      rig.tip.scale.setScalar(1 + Math.max(0, -wind) * 0.3);
      orbit(rig, u, 0.5, 0.05);
      const fly = clamp01((u - 0.42) / 0.45);
      const sp = rig.sparks[0];
      if (u < 0.42) sp.position.set(-0.36, 0.1 + Math.max(0, wind) * 0.2, 0.05 - Math.max(0, wind) * 0.25);
      else sp.position.set(-0.36 + fly * 0.3, 0.1, 0.3 + fly * 1.6);
      sp.scale.setScalar(u < 0.42 ? 1 + wind * 0.8 : Math.max(0.001, 1.8 * (1 - fly)));
    },
  },
  hit: {
    label: '피격 (깜빡)',
    duration: 0.6,
    loop: false,
    apply(rig, u) {
      const h = keys(u, [[0, 0], [0.12, 1], [1, 0]]);
      rig.float.scale.setScalar(1 - h * 0.25);
      rig.float.position.x += Math.sin(u * TAU * 6) * 0.06 * h;
      rig.tip.scale.y = 1 - h * 0.5;
      orbit(rig, u, 0.5 + h * 0.2, 0.05);
      blinkEyes(rig, h * 0.85);
    },
  },
  fizzle: {
    label: '피식 꺼짐',
    duration: 1.6,
    loop: false,
    apply(rig, u) {
      const f = keys(u, [[0, 0], [0.15, -0.1], [0.85, 1], [1, 1]]);
      rig.float.scale.setScalar(Math.max(0.05, 1 - f * 0.75));
      rig.float.position.y -= f * 0.8;
      rig.tip.scale.y = Math.max(0.05, 1 - f);
      rig.sparks.forEach((sp, i) => {
        const a = (i / SPARKS) * TAU;
        sp.position.set(Math.cos(a) * (0.5 + f * 0.2), 0.05 - f * 0.25, Math.sin(a) * (0.5 + f * 0.2));
        sp.scale.setScalar(Math.max(0.001, 1 - f));
      });
      blinkEyes(rig, smooth(u / 0.5) * 0.92);
    },
  },
  rally: {
    label: '응원하기 (동료 강화)',
    duration: 2.0,
    apply(rig, u) {
      const cheer = keys(u, [[0, 0], [0.2, 1], [0.8, 1], [1, 0]]);
      rig.float.rotation.y += u * TAU;
      rig.float.position.y += Math.abs(Math.sin(u * TAU * 2)) * 0.15 * cheer;
      rig.tip.scale.setScalar(1 + cheer * 0.35 + Math.sin(u * TAU * 6) * 0.05);
      for (const [n, s] of sides) {
        rig.hands[n].position.y += cheer * 0.3;
        rig.hands[n].position.x += s * cheer * 0.05;
      }
      orbit(rig, u, 0.5 + cheer * 0.45, 0.05 + cheer * 0.4, 2);
      rig.sparks.forEach((sp) => sp.scale.setScalar(1 + cheer * 0.5));
    },
  },
};

export const campfireWisp = {
  label: '모닥불 도깨비',
  role: '⑦ 지휘형',
  defaults: { seed: 6, size: 1, flameColor: '#ff9a3c', tipColor: '#ffd15c', sparkColor: '#fff27a', glow: 1.2 },
  schema: {
    ...common, flameColor: { label: '불꽃 색' }, tipColor: { label: '불꽃 끝 색' }, sparkColor: { label: '불티 색' },
    glow: { label: '발광', min: 0, max: 3, step: 0.05 },
  },
  build(p) {
    const k = createKit(p.seed, 0.4);
    const flame = k.glow('flame', p.flameColor, p.glow);
    const tipMat = k.glow('tip', p.tipColor, p.glow);
    const root = k.pivot('root');
    root.name = 'CampfireWisp';
    const float = k.pivot('float', 0, 0.95, 0);
    root.add(float);
    float.add(k.scl(k.ball(0.28, flame, 2, 0.01), 1, 1.02, 0.95));
    const tip = k.pivot('tip', 0, 0.16, -0.02);
    tip.add(k.at(k.cone(0.24, 0.5, flame, 7, 0.01), 0, 0.22, 0));
    tip.add(k.at(k.cone(0.13, 0.32, tipMat, 6), 0, 0.33, 0.06));
    for (const [, s] of sides) tip.add(k.at(k.rot(k.cone(0.09, 0.22, flame, 5), 0, 0, -s * 0.6), s * 0.18, 0.05, 0));
    float.add(tip);
    const eyes = k.eyes(float, { y: 0.04, z: 0.22, spacing: 0.09, size: 0.07 });
    k.smile(float, { y: -0.07, z: 0.265, width: 0.11, segs: 4, thick: 0.022, color: '#7a2a10' });
    k.cheeks(float, { y: -0.03, z: 0.245, spacing: 0.15, size: 0.035, color: '#ff5f3c' });
    const hands = {};
    for (const [n, s] of sides) {
      const hand = k.pivot(`hand${n}`, s * 0.36, -0.05, 0.05);
      hand.add(k.ball(0.07, tipMat, 1));
      float.add(hand);
      hands[n] = hand;
    }
    const sparkMat = k.glow('spark', p.sparkColor, p.glow * 1.5);
    const sparks = [];
    for (let i = 0; i < SPARKS; i++) {
      const sp = k.pivot(`spark${i}`);
      sp.add(k.ball(0.045, sparkMat, 0));
      float.add(sp);
      sparks.push(sp);
    }
    // rest pose: sparks on their orbit
    orbit({ sparks }, 0, 0.5, 0.05);
    // a little shadow disc on the ground so it reads as floating
    root.add(k.at(k.scl(k.cyl(0.25, 0.25, 0.005, k.mat('shadow', '#1d2a1a', { roughness: 1 }), 12), 1, 1, 1), 0, 0.005, 0));
    root.scale.setScalar(p.size);
    return finalizeMonster(root, {
      rig: { float, tip, hands, sparks, eyes }, params: p, animations: WISP_ANIMS,
      clips: { idle: 'idle', move: 'drift', attack: 'fireball', hit: 'hit', death: 'fizzle', special: 'rally' },
    });
  },
};
