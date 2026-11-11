// Alpine & Snow village: 7 friendly monsters, one per role.
import { createKit } from '../../core/kit.js';
import { finalizeMonster, TAU, keys, blink, smooth, clamp01 } from '../../core/monster.js';
import { buildBiped, BIPED_ANIMS } from '../../rigs/biped.js';
import { buildQuadruped, QUAD_ANIMS } from '../../rigs/quadruped.js';
import { buildSpider, SPIDER_ANIMS } from '../../rigs/spider.js';

const sides = [['L', 1], ['R', -1]];
const blinkEyes = (rig, a) => rig.eyes.forEach((e) => { e.scale.y = Math.max(0.08, 1 - a); });
const common = {
  seed: { label: '시드', min: 1, max: 999, step: 1 },
  size: { label: '크기', min: 0.5, max: 2, step: 0.01 },
};

// ---- ① 기본형: 장난꾸러기 눈사람 -------------------------------------------------
export const snowman = {
  label: '장난꾸러기 눈사람',
  role: '① 기본형',
  defaults: { seed: 8, size: 1, snowColor: '#f6fbff', scarfColor: '#ff5d73', hatColor: '#4a6fa5', noseColor: '#ff9a2e' },
  schema: { ...common, snowColor: { label: '눈 색' }, scarfColor: { label: '목도리 색' }, hatColor: { label: '양동이 모자 색' }, noseColor: { label: '당근 코 색' } },
  build(p) {
    const k = createKit(p.seed, 0.6, p.horror);
    const snow = k.mat('snow', p.snowColor, { roughness: 1 });
    const stick = k.mat('stick', '#7a4e2d');
    const coal = k.mat('coal', '#2b2b33');
    const { root, rig, face } = buildBiped(k, {
      name: 'Snowman', bodyR: 0.32, bodyScale: [1, 0.95, 1], bodyMat: snow, headR: 0.22,
      legLen: 0.34, legR: 0.04, armLen: 0.34, armR: 0.022, armMat: stick, handMat: stick,
    });
    const d = rig.dims;
    rig.body.add(k.at(k.ball(0.42, snow, 2, 0.02), 0, -0.08, 0)); // bottom ball
    for (let i = 0; i < 3; i++) rig.body.add(k.at(k.ball(0.03, coal, 0), 0, d.cy + 0.12 - i * 0.11, 0.31 - Math.abs(i - 1) * 0.01));
    // twig fingers
    for (const [n] of sides) {
      for (const a of [-0.5, 0.5]) rig.arms[n].add(k.at(k.rot(k.cyl(0.01, 0.014, 0.1, stick, 4), 0, 0, a), a * 0.06, -0.38, 0));
    }
    // scarf
    const scarf = k.mat('scarf', p.scarfColor);
    rig.body.add(k.at(k.cyl(0.2, 0.24, 0.08, scarf, 10, 0.006), 0, d.cy + 0.3, 0));
    rig.body.add(k.at(k.rot(k.box(0.08, 0.2, 0.03, scarf, 0.004), 0.15, 0, 0.2), -0.1, d.cy + 0.18, 0.22));
    // head: carrot nose, bucket hat, coal smile
    const h = face.parent;
    h.add(k.at(k.rot(k.cone(0.04, 0.18, k.mat('carrot', p.noseColor), 6), Math.PI / 2, 0, 0), 0, face.cy - 0.02, 0.28));
    const hat = k.mat('hat', p.hatColor);
    h.add(k.rot(k.at(k.cyl(0.13, 0.16, 0.16, hat, 8, 0.005), 0.02, face.cy + 0.25, -0.01), -0.1, 0, -0.15));
    h.add(k.rot(k.at(k.cyl(0.18, 0.18, 0.02, hat, 10), 0.01, face.cy + 0.17, 0), -0.1, 0, -0.15));
    rig.eyes = k.eyes(h, { y: face.cy + 0.06, z: 0.17, spacing: 0.085, size: 0.06 });
    k.smile(h, { y: face.cy - 0.09, z: 0.205, width: 0.12, color: '#2b2b33', thick: 0.022 });
    k.cheeks(h, { y: face.cy - 0.04, z: 0.19, spacing: 0.14, size: 0.035 });
    // snowball in the right hand + the one that gets thrown
    rig.held = k.pivot('heldBall', 0, -0.4, 0.03);
    rig.held.add(k.ball(0.07, snow, 1));
    rig.arms.R.add(rig.held);
    rig.projectile = k.pivot('snowball');
    rig.projectile.add(k.ball(0.07, snow, 1));
    rig.projectile.scale.setScalar(0.001);
    rig.hips.add(rig.projectile);
    root.scale.setScalar(p.size);
    k.decay(root);
    return finalizeMonster(root, {
      rig, params: p, animations: BIPED_ANIMS,
      clips: { idle: 'idle', move: 'waddle', attack: 'throw', hit: 'hit', death: 'melt' },
    });
  },
};

// ---- ② 돌격형: 서리 여우 ---------------------------------------------------------
export const frostFox = {
  label: '서리 여우',
  role: '② 돌격형',
  defaults: { seed: 12, size: 1, headSize: 0.3, furColor: '#f2f6fb', bellyColor: '#d7e8f7', tipColor: '#7cc7ff' },
  schema: { ...common, headSize: { label: '머리 크기', min: 0.22, max: 0.42, step: 0.01 }, furColor: { label: '털 색' }, bellyColor: { label: '배 색' }, tipColor: { label: '귀·꼬리 끝 색' } },
  build(p) {
    const k = createKit(p.seed, 1, p.horror);
    const fur = k.mat('fur', p.furColor);
    const tip = k.mat('tip', p.tipColor);
    const { root, rig } = buildQuadruped(k, {
      name: 'FrostFox', len: 0.6, width: 0.3, height: 0.27, legLen: 0.26, headSize: p.headSize, snout: 0.16,
      furMat: fur, bellyMat: k.mat('belly', p.bellyColor), pawMat: tip, noseMat: k.mat('nose', '#2d2a35'),
      earInnerMat: tip, eyeSize: p.headSize * 0.21, tail: 'none',
    });
    // big fluffy tail with an icy tip
    rig.tail.add(k.at(k.rot(k.scl(k.ball(0.11, fur, 1, 0.01), 1, 1, 1.8), 0, 0, 0), 0, 0, -0.14));
    rig.tail2.position.z = -0.3;
    rig.tail2.add(k.at(k.rot(k.cone(0.1, 0.18, tip, 6, 0.01), -Math.PI / 2, 0, 0), 0, 0, -0.04));
    // bigger ears
    for (const [n] of sides) rig.ears[n].scale.setScalar(1.35);
    k.cheeks(rig.head, { y: -p.headSize * 0.05, z: p.headSize * 0.5, spacing: p.headSize * 0.36, size: 0.03 });
    root.scale.setScalar(p.size);
    k.decay(root);
    return finalizeMonster(root, {
      rig, params: p, animations: QUAD_ANIMS,
      clips: { idle: 'idle', move: 'gallop', attack: 'pounce', hit: 'hit', death: 'death', special: 'howl' },
    });
  },
};

// ---- ③ 탱커: 설인 ---------------------------------------------------------------
export const yeti = {
  label: '포근한 설인',
  role: '③ 탱커',
  defaults: { seed: 21, size: 1.35, furColor: '#eef3f8', faceColor: '#9fcbea', hornColor: '#c9d2db' },
  schema: { ...common, furColor: { label: '털 색' }, faceColor: { label: '얼굴·손 색' }, hornColor: { label: '뿔 색' } },
  build(p) {
    const k = createKit(p.seed, 1, p.horror);
    const fur = k.mat('fur', p.furColor);
    const skin = k.mat('face', p.faceColor);
    const { root, rig, face } = buildBiped(k, {
      name: 'Yeti', bodyR: 0.5, bodyScale: [1.05, 1.12, 0.95], bodyMat: fur, headR: 0.28,
      legLen: 0.22, legR: 0.12, armLen: 0.46, armR: 0.11, handMat: skin, footMat: skin,
    });
    const d = rig.dims;
    // fur tufts
    for (let i = 0; i < 14; i++) {
      const a = k.rand(0, TAU);
      const y = k.rand(-0.35, 0.4);
      const rr = 0.5 * Math.sqrt(1 - (y / 0.56) ** 2);
      const t = k.cone(0.06, 0.14, fur, 4);
      t.position.set(Math.sin(a) * rr * 1.05, d.cy + y, Math.cos(a) * rr * 0.95);
      // point the tuft away from the body centre
      t.lookAt(t.position.x * 2, d.cy + y * 2, t.position.z * 2);
      t.rotateX(Math.PI / 2);
      rig.body.add(t);
    }
    const h = face.parent;
    h.add(k.at(k.scl(k.ball(0.2, skin, 1, 0.01), 1, 0.85, 0.5), 0, face.cy - 0.02, 0.18));
    for (const [, s] of sides) h.add(k.at(k.rot(k.cone(0.05, 0.16, k.mat('horn', p.hornColor), 5), 0, 0, -s * 0.5), s * 0.17, face.cy + 0.27, 0));
    rig.eyes = k.eyes(h, { y: face.cy + 0.04, z: 0.25, spacing: 0.08, size: 0.06 });
    k.smile(h, { y: face.cy - 0.09, z: 0.275, width: 0.12 });
    const fang = k.mat('fang', '#ffffff');
    for (const [, s] of sides) h.add(k.at(k.cone(0.015, 0.04, fang, 4), s * 0.035, face.cy - 0.1, 0.275));
    k.cheeks(h, { y: face.cy - 0.04, z: 0.25, spacing: 0.15, size: 0.035 });
    root.scale.setScalar(p.size);
    k.decay(root);
    return finalizeMonster(root, {
      rig, params: p, animations: BIPED_ANIMS,
      clips: { idle: 'idle', move: 'waddle', attack: 'pound', hit: 'hit', death: 'flop' },
    });
  },
};

// ---- ④ 변칙형: 고드름 거미 -------------------------------------------------------
export const icicleSpider = {
  label: '고드름 거미',
  role: '④ 변칙형',
  defaults: { seed: 14, size: 1, legLength: 0.5, bodyColor: '#8fd3f2', legColor: '#5aa9d6', crystalColor: '#d8f6ff' },
  schema: { ...common, legLength: { label: '다리 길이', min: 0.35, max: 0.8, step: 0.01 }, bodyColor: { label: '몸 색' }, legColor: { label: '다리 색' }, crystalColor: { label: '고드름 색' } },
  build(p) {
    const k = createKit(p.seed, 0.6, p.horror);
    const { root, rig } = buildSpider(k, {
      name: 'IcicleSpider', pairs: 4, legLen: p.legLength, bodyMat: k.mat('body', p.bodyColor), legMat: k.mat('legs', p.legColor),
    });
    const ice = k.glow('crystal', p.crystalColor, 0.35);
    for (let i = 0; i < 6; i++) {
      const c = k.cone(k.rand(0.03, 0.05), k.rand(0.12, 0.22), ice, 5);
      c.position.set(k.rand(-0.15, 0.15), 0.25 + k.rand(0, 0.05), -0.42 + k.rand(-0.12, 0.12));
      c.rotation.set(k.rand(-0.5, 0.2), 0, k.rand(-0.6, 0.6));
      rig.body.add(c);
    }
    // little extra eyes + smile
    const dot = k.mat('dot', '#1d1b26');
    for (const [, s] of sides) rig.head.add(k.at(k.ball(0.018, dot, 0), s * 0.05, 0.14, 0.23));
    k.smile(rig.head, { y: -0.02, z: 0.25, width: 0.08, segs: 4, thick: 0.016 });
    k.cheeks(rig.head, { y: 0.02, z: 0.22, spacing: 0.11, size: 0.025 });
    root.scale.setScalar(p.size);
    k.decay(root);
    return finalizeMonster(root, {
      rig, params: p, animations: SPIDER_ANIMS,
      clips: { idle: 'idle', move: 'scuttle', attack: 'stab', hit: 'hit', death: 'curl' },
    });
  },
};

// ---- ⑤ 매복형: 눈 속 상어 --------------------------------------------------------
const SUB = -0.46; // how deep the shark hides under the snow
const SHARK_ANIMS = {
  lurk: {
    label: '숨어서 맴돌기 (지느러미만)',
    duration: 3,
    apply(rig, u) {
      const w = u * TAU;
      rig.base.position.y = SUB + Math.sin(w * 2) * 0.02;
      rig.base.rotation.y = Math.sin(w) * 0.6;
      rig.tail.rotation.y += Math.sin(w * 3) * 0.4;
      blinkEyes(rig, 0.9);
    },
  },
  swim: {
    label: '눈 속 헤엄 (지느러미 가르기)',
    duration: 1.0,
    apply(rig, u) {
      const w = u * TAU;
      rig.base.position.y = SUB + 0.03;
      rig.body.rotation.y += Math.sin(w) * 0.15;
      rig.tail.rotation.y += Math.sin(w - 0.8) * 0.6;
      rig.body.rotation.z += Math.sin(w) * 0.05;
      blinkEyes(rig, 0.9);
    },
  },
  leap: {
    label: '튀어올라 와앙',
    duration: 1.6,
    apply(rig, u) {
      const jump = Math.sin(Math.PI * clamp01((u - 0.15) / 0.6));
      const out = keys(u, [[0, 0], [0.15, 1], [0.75, 1], [0.9, 0], [1, 0]]);
      rig.base.position.y = SUB * (1 - out) + jump * 0.5;
      rig.base.position.z = jump * 0.3;
      rig.body.rotation.x = -0.6 * (1 - 2 * clamp01((u - 0.15) / 0.6)) * jump;
      rig.jaw.rotation.x += Math.abs(Math.sin(u * TAU * 3)) * 0.6 * jump;
      rig.tail.rotation.y += Math.sin(u * TAU * 4) * 0.5;
      blinkEyes(rig, out < 0.5 ? 0.9 : 0);
    },
  },
  hit: {
    label: '피격',
    duration: 0.6,
    loop: false,
    apply(rig, u) {
      const h = keys(u, [[0, 0], [0.15, 1], [1, 0]]);
      rig.body.rotation.z += Math.sin(u * TAU * 4) * 0.2 * h;
      rig.body.position.z -= h * 0.1;
      rig.tail.rotation.y += h * 0.6;
      blinkEyes(rig, h * 0.85);
    },
  },
  bellyUp: {
    label: '배 뒤집고 기절',
    duration: 1.4,
    loop: false,
    apply(rig, u) {
      const f = keys(u, [[0, 0], [0.25, 0.2], [0.7, 1], [0.8, 0.95], [0.9, 1], [1, 1]]);
      rig.base.position.y = Math.sin(f * Math.PI) * 0.25;
      rig.body.rotation.z += f * Math.PI;
      rig.body.position.y += f * 0.05;
      rig.tail.rotation.x -= f * 0.3;
      blinkEyes(rig, smooth(u / 0.5) * 0.92);
    },
  },
  emerge: {
    label: '눈 밖으로 쑥',
    duration: 1.0,
    loop: false,
    apply(rig, u) {
      const up = keys(u, [[0, 0], [0.6, 1.12], [0.8, 0.95], [1, 1]]);
      rig.base.position.y = SUB * (1 - up);
      rig.body.rotation.z += Math.sin(u * TAU * 2) * 0.1 * (1 - u);
      blinkEyes(rig, u < 0.6 ? 0.9 : 0);
    },
  },
};

export const snowShark = {
  label: '눈 속 상어',
  role: '⑤ 매복형',
  defaults: { seed: 17, size: 1, bodyColor: '#9fb9d3', bellyColor: '#f4f8fc', finColor: '#6f93b8' },
  schema: { ...common, bodyColor: { label: '몸 색' }, bellyColor: { label: '배 색' }, finColor: { label: '지느러미 색' } },
  build(p) {
    const k = createKit(p.seed, 0.6, p.horror);
    const skin = k.mat('body', p.bodyColor);
    const fin = k.mat('fin', p.finColor);
    const root = k.pivot('root');
    root.name = 'SnowShark';
    root.add(k.scl(k.ball(0.6, k.mat('snowPile', '#ffffff', { roughness: 1 }), 1, 0.03), 1, 0.12, 1.3)); // snow mound
    const base = k.pivot('base');
    root.add(base);
    const body = k.pivot('body', 0, 0.3, 0);
    base.add(body);
    body.add(k.scl(k.ball(0.3, skin, 2, 0.01), 0.85, 0.75, 1.55));
    body.add(k.at(k.scl(k.ball(0.25, k.mat('belly', p.bellyColor), 1), 0.8, 0.45, 1.5), 0, -0.1, 0.02));
    body.add(k.at(k.rot(k.scl(k.cone(0.13, 0.3, fin, 3), 0.35, 1, 1), -0.35, 0, 0), 0, 0.3, -0.05)); // dorsal fin
    for (const [, s] of sides) body.add(k.at(k.rot(k.scl(k.cone(0.07, 0.2, fin, 3), 0.3, 1, 1), 0.3, 0, -s * 1.9), s * 0.25, -0.08, 0.12));
    const tail = k.pivot('tail', 0, 0, -0.42);
    tail.add(k.at(k.rot(k.scl(k.cone(0.1, 0.25, fin, 3), 0.3, 1, 1), -0.9, 0, 0), 0, 0.1, -0.1));
    tail.add(k.at(k.rot(k.scl(k.cone(0.08, 0.18, fin, 3), 0.3, 1, 1), -2.3, 0, 0), 0, -0.06, -0.09));
    body.add(tail);
    const eyes = k.eyes(body, { y: 0.08, z: 0.4, spacing: 0.12, size: 0.065 });
    k.cheeks(body, { y: -0.01, z: 0.4, spacing: 0.17, size: 0.03 });
    const jaw = k.pivot('jaw', 0, -0.06, 0.32);
    jaw.add(k.at(k.scl(k.ball(0.12, k.mat('belly', p.bellyColor), 1), 1, 0.35, 1), 0, -0.02, 0.04));
    const tooth = k.mat('tooth', '#ffffff');
    for (let i = 0; i < 4; i++) body.add(k.at(k.rot(k.cone(0.018, 0.04, tooth, 4), Math.PI, 0, 0), -0.045 + i * 0.03, -0.06, 0.43));
    k.smile(body, { y: -0.035, z: 0.445, width: 0.14, curve: 0.3 });
    body.add(jaw);
    root.scale.setScalar(p.size);
    k.decay(root);
    return finalizeMonster(root, {
      rig: { base, body, tail, jaw, eyes }, params: p, animations: SHARK_ANIMS,
      clips: { idle: 'lurk', move: 'swim', attack: 'leap', hit: 'hit', death: 'bellyUp', special: 'emerge' },
    });
  },
};

// ---- ⑥ 자폭/원거리: 폭탄 눈덩이 ---------------------------------------------------
const CHUNKS = 7;
const BOMB_ANIMS = {
  idle: {
    label: '대기 (불꽃 지글지글)',
    duration: 1.6,
    apply(rig, u) {
      const w = u * TAU;
      rig.body.scale.set(1 + Math.sin(w * 2) * 0.03, 1 - Math.sin(w * 2) * 0.04, 1 + Math.sin(w * 2) * 0.03);
      rig.spark.scale.setScalar(1 + Math.abs(Math.sin(w * 6)) * 0.6);
      rig.fuse.rotation.z += Math.sin(w * 2) * 0.15;
      blinkEyes(rig, blink(u, [0.5]));
    },
  },
  roll: {
    label: '데굴데굴 깡총',
    duration: 0.7,
    apply(rig, u) {
      const air = Math.sin(Math.PI * u);
      const land = 1 - smooth(Math.min(u, 1 - u) / 0.12);
      rig.body.position.y += air * 0.22;
      rig.body.rotation.x += Math.sin(u * TAU) * 0.25;
      rig.body.scale.set(1 + land * 0.12, 1 - land * 0.16, 1 + land * 0.12);
      rig.spark.scale.setScalar(1 + Math.abs(Math.sin(u * TAU * 4)) * 0.6);
    },
  },
  boom: {
    label: '부풀다 펑!',
    duration: 1.6,
    loop: false,
    apply(rig, u) {
      const grow = keys(u, [[0, 0], [0.5, 1]]);
      const shake = Math.sin(u * TAU * 25) * 0.04 * grow;
      const popped = u > 0.52;
      rig.body.scale.setScalar(popped ? 0.001 : 1 + grow * 0.4);
      rig.body.rotation.z += shake;
      rig.spark.scale.setScalar(1 + grow * 1.5);
      const f = clamp01((u - 0.52) / 0.48);
      rig.chunks.forEach((c, i) => {
        const a = (i / CHUNKS) * TAU;
        const r = 0.15 + f * 0.9;
        c.position.set(Math.cos(a) * r, 0.3 + Math.sin(f * Math.PI) * 0.5 - f * 0.25, Math.sin(a) * r);
        c.scale.setScalar(popped ? 1 - f * 0.4 : 0.001);
        c.rotation.set(f * 4 + i, f * 3, 0);
      });
      blinkEyes(rig, 0);
      rig.eyes.forEach((e) => e.scale.setScalar(1 + grow * 0.3));
    },
  },
  hit: {
    label: '피격',
    duration: 0.6,
    loop: false,
    apply(rig, u) {
      const h = keys(u, [[0, 0], [0.15, 1], [1, 0]]);
      rig.body.scale.set(1 + h * 0.15, 1 - h * 0.2, 1 + h * 0.15);
      rig.body.position.z -= h * 0.08;
      rig.spark.scale.setScalar(1 - h * 0.7);
      blinkEyes(rig, h * 0.85);
    },
  },
  crumble: {
    label: '와르르 부서짐',
    duration: 1.4,
    loop: false,
    apply(rig, u) {
      const f = keys(u, [[0, 0], [0.2, -0.1], [0.8, 1], [1, 1]]);
      rig.body.scale.set(1 + f * 0.3, Math.max(0.05, 1 - f * 0.85), 1 + f * 0.3);
      rig.body.position.y -= f * 0.22;
      rig.spark.scale.setScalar(Math.max(0.001, 1 - f * 1.5));
      rig.chunks.forEach((c, i) => {
        const a = (i / CHUNKS) * TAU;
        const r = 0.2 + f * 0.25;
        c.position.set(Math.cos(a) * r, 0.06, Math.sin(a) * r);
        c.scale.setScalar(clamp01(f * 2) * 0.8 + 0.001);
      });
      blinkEyes(rig, smooth(u / 0.5) * 0.92);
    },
  },
};

export const bombSnowball = {
  label: '폭탄 눈덩이',
  role: '⑥ 자폭/원거리',
  defaults: { seed: 19, size: 1, snowColor: '#f7fbff', fuseColor: '#4a3a30', sparkColor: '#ffb43a' },
  schema: { ...common, snowColor: { label: '눈 색' }, fuseColor: { label: '심지 색' }, sparkColor: { label: '불꽃 색' } },
  build(p) {
    const k = createKit(p.seed, 1, p.horror);
    const snow = k.mat('snow', p.snowColor, { roughness: 1 });
    const root = k.pivot('root');
    root.name = 'BombSnowball';
    const body = k.pivot('body', 0, 0.3, 0);
    root.add(body);
    body.add(k.ball(0.3, snow, 2, 0.02));
    const eyes = k.eyes(body, { y: 0.05, z: 0.25, spacing: 0.09, size: 0.065 });
    k.smile(body, { y: -0.07, z: 0.295, width: 0.12 });
    k.cheeks(body, { y: -0.03, z: 0.27, spacing: 0.16, size: 0.035 });
    const fuse = k.pivot('fuse', 0, 0.28, 0);
    fuse.add(k.at(k.rot(k.cyl(0.015, 0.02, 0.14, k.mat('fuseMat', p.fuseColor), 5), 0, 0, 0.3), -0.02, 0.06, 0));
    const spark = k.pivot('spark', -0.045, 0.14, 0);
    spark.add(k.ball(0.04, k.glow('spark', p.sparkColor, 2.5), 0));
    fuse.add(spark);
    body.add(fuse);
    const chunks = [];
    for (let i = 0; i < CHUNKS; i++) {
      const c = k.pivot(`chunk${i}`, 0, 0.3, 0);
      c.add(k.ball(k.rand(0.06, 0.1), snow, 0, 0.02));
      c.scale.setScalar(0.001);
      root.add(c);
      chunks.push(c);
    }
    root.scale.setScalar(p.size);
    k.decay(root);
    return finalizeMonster(root, {
      rig: { body, fuse, spark, chunks, eyes }, params: p, animations: BOMB_ANIMS,
      clips: { idle: 'idle', move: 'roll', attack: 'boom', hit: 'hit', death: 'crumble' },
    });
  },
};

// ---- ⑦ 지휘형: 눈보라 요정 -------------------------------------------------------
const FLAKES = 6;
const swirl = (rig, u, radius, height, speed = 1) => rig.flakes.forEach((f, i) => {
  const a = (i / FLAKES) * TAU + u * TAU * speed;
  f.position.set(Math.cos(a) * radius, height + Math.sin(a * 2 + i) * 0.08, Math.sin(a) * radius);
  f.rotation.y = a * 2;
});
const flap = (rig, u, speed = 8, amount = 0.5) => {
  const s = Math.sin(u * TAU * speed);
  rig.wings.L.rotation.y = 0.5 + s * amount;
  rig.wings.R.rotation.y = -0.5 - s * amount;
};
const FAIRY_ANIMS = {
  idle: {
    label: '대기 (팔랑팔랑)',
    duration: 2,
    apply(rig, u) {
      rig.float.position.y += Math.sin(u * TAU) * 0.06;
      flap(rig, u, 8);
      swirl(rig, u, 0.45, 0);
      rig.hands.R.position.y += Math.sin(u * TAU) * 0.02;
      blinkEyes(rig, blink(u, [0.55]));
    },
  },
  fly: {
    label: '날아가기',
    duration: 1,
    apply(rig, u) {
      rig.float.rotation.x += 0.35;
      rig.float.position.y += Math.sin(u * TAU * 2) * 0.04;
      flap(rig, u, 6, 0.7);
      rig.flakes.forEach((f, i) => f.position.set(Math.sin(u * TAU + i) * 0.12, 0.05 * i - 0.1, -0.35 - i * 0.1));
    },
  },
  zap: {
    label: '지팡이 눈꽃 발사',
    duration: 1.2,
    apply(rig, u) {
      const wind = keys(u, [[0, 0], [0.35, 1], [0.45, -1], [0.7, -0.5], [1, 0]]);
      rig.hands.R.position.z += -Math.max(0, wind) * 0.12 + Math.max(0, -wind) * 0.2;
      rig.hands.R.position.y += Math.max(0, wind) * 0.15;
      rig.hands.R.rotation.x = -Math.max(0, -wind) * 1.2;
      flap(rig, u, 8);
      swirl(rig, u, 0.45, 0);
      const fly = clamp01((u - 0.42) / 0.45);
      const f0 = rig.flakes[0];
      if (u > 0.42) {
        f0.position.set(-0.2, 0.05, 0.3 + fly * 1.8);
        f0.scale.setScalar(Math.max(0.001, 2 * (1 - fly)));
      }
      rig.star.scale.setScalar(1 + Math.max(0, wind) * 0.8);
    },
  },
  hit: {
    label: '피격',
    duration: 0.6,
    loop: false,
    apply(rig, u) {
      const h = keys(u, [[0, 0], [0.12, 1], [1, 0]]);
      rig.float.position.z -= h * 0.15;
      rig.float.rotation.x -= h * 0.4;
      flap(rig, u, 10, 0.2);
      swirl(rig, u, 0.45 + h * 0.15, 0);
      blinkEyes(rig, h * 0.85);
    },
  },
  fall: {
    label: '빙글빙글 떨어짐',
    duration: 1.6,
    loop: false,
    apply(rig, u) {
      const f = keys(u, [[0, 0], [0.7, 1], [0.8, 0.96], [0.9, 1], [1, 1]]);
      rig.float.position.y -= f * 0.78;
      rig.float.rotation.y += f * TAU * 0.75;
      rig.float.rotation.z += f * 1.4;
      flap(rig, u, 3 * (1 - u), 0.3 * (1 - f));
      rig.flakes.forEach((fl, i) => {
        const a = (i / FLAKES) * TAU;
        fl.position.set(Math.cos(a) * 0.5, -f * 0.7, Math.sin(a) * 0.5);
        fl.scale.setScalar(Math.max(0.001, 1 - f));
      });
      blinkEyes(rig, smooth(u / 0.5) * 0.92);
    },
  },
  blizzard: {
    label: '눈보라 부르기 (동료 강화)',
    duration: 2,
    apply(rig, u) {
      const c = keys(u, [[0, 0], [0.2, 1], [0.8, 1], [1, 0]]);
      rig.float.rotation.y += u * TAU;
      rig.float.position.y += c * 0.15;
      flap(rig, u, 12, 0.6);
      for (const [n, s] of sides) {
        rig.hands[n].position.y += c * 0.2;
        rig.hands[n].position.x += s * c * 0.05;
      }
      swirl(rig, u, 0.45 + c * 0.6, c * 0.3, 3);
      rig.flakes.forEach((f) => f.scale.setScalar(1 + c * 0.8));
      rig.star.scale.setScalar(1 + c * 0.6);
    },
  },
};

export const blizzardFairy = {
  label: '눈보라 요정',
  role: '⑦ 지휘형',
  defaults: { seed: 23, size: 1, dressColor: '#8fd0ff', hairColor: '#e9f6ff', wingColor: '#c8f1ff', glow: 1 },
  schema: { ...common, dressColor: { label: '옷 색' }, hairColor: { label: '머리 색' }, wingColor: { label: '날개 색' }, glow: { label: '발광', min: 0, max: 3, step: 0.05 } },
  build(p) {
    const k = createKit(p.seed, 0.4, p.horror);
    const skin = k.mat('skin', '#ffe9dc');
    const dress = k.mat('dress', p.dressColor);
    const root = k.pivot('root');
    root.name = 'BlizzardFairy';
    const float = k.pivot('float', 0, 1.0, 0);
    root.add(float);
    float.add(k.at(k.cone(0.16, 0.3, dress, 8, 0.008), 0, -0.12, 0));
    float.add(k.at(k.ball(0.15, skin, 2, 0.006), 0, 0.12, 0));
    float.add(k.at(k.scl(k.ball(0.165, k.mat('hair', p.hairColor), 1, 0.01), 1, 0.85, 1), 0, 0.18, -0.025));
    const eyes = k.eyes(float, { y: 0.12, z: 0.12, spacing: 0.055, size: 0.04 });
    k.smile(float, { y: 0.06, z: 0.15, width: 0.06, segs: 4, thick: 0.014 });
    k.cheeks(float, { y: 0.085, z: 0.135, spacing: 0.09, size: 0.022 });
    // snowflake crown
    const crown = k.glow('crown', '#e8fbff', p.glow);
    for (let i = 0; i < 5; i++) float.add(k.at(k.rot(k.cone(0.02, 0.08, crown, 4), 0, 0, (i - 2) * 0.35), (i - 2) * 0.035, 0.31 - Math.abs(i - 2) * 0.012, 0));
    // wings
    const wingMat = k.glow('wing', p.wingColor, p.glow * 0.3);
    const wings = {};
    for (const [n, s] of sides) {
      const wing = k.pivot(`wing${n}`, s * 0.05, 0.02, -0.08);
      wing.add(k.at(k.scl(k.ball(0.14, wingMat, 1), 1.3, 0.9, 0.12), s * 0.16, 0.06, 0));
      wing.add(k.at(k.scl(k.ball(0.09, wingMat, 1), 1.2, 0.8, 0.12), s * 0.12, -0.1, 0));
      wing.rotation.y = s * 0.5;
      float.add(wing);
      wings[n] = wing;
    }
    // hands and wand
    const hands = {};
    for (const [n, s] of sides) {
      const hand = k.pivot(`hand${n}`, s * 0.17, -0.06, 0.06);
      hand.add(k.ball(0.035, skin, 1));
      float.add(hand);
      hands[n] = hand;
    }
    hands.R.add(k.at(k.cyl(0.01, 0.01, 0.18, k.mat('wand', '#b9e3ff'), 5), 0, 0.08, 0));
    const star = k.pivot('star', 0, 0.18, 0);
    star.add(k.ball(0.04, k.glow('wandStar', '#ffffff', p.glow * 2), 0));
    hands.R.add(star);
    const flakeMat = k.glow('flake', '#e8fbff', p.glow * 1.2);
    const flakes = [];
    for (let i = 0; i < FLAKES; i++) {
      const f = k.pivot(`flake${i}`);
      f.add(k.scl(k.ball(0.045, flakeMat, 0), 1, 1, 0.35));
      float.add(f);
      flakes.push(f);
    }
    swirl({ flakes }, 0, 0.45, 0);
    root.add(k.cyl(0.18, 0.18, 0.005, k.mat('shadow', '#9ab0c4', { roughness: 1 }), 12));
    root.scale.setScalar(p.size);
    k.decay(root);
    return finalizeMonster(root, {
      rig: { float, wings, hands, star, flakes, eyes }, params: p, animations: FAIRY_ANIMS,
      clips: { idle: 'idle', move: 'fly', attack: 'zap', hit: 'hit', death: 'fall', special: 'blizzard' },
    });
  },
};
