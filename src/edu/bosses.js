// Bosses (one per stage). Big, readable silhouettes, still friendly-looking (no gore).
// Clips: intro, idle, walk, attack1..attack3 (attack4 for the final boss), phase, hit, death.
// `BOSS_TIMING` (manifest) gives the fraction of each attack when it hits / spawns its effect.
//   b01_oldroot          고목 수호자 올드루트     root slam (fx_boss_root_spike), summon acorns, spinning branches
//   b02_forbidden_lord   금서의 군주              page storm (fx_boss_page_storm), ink rain (fx_boss_ink_pool), summon books
//   b03_time_keeper      얼어붙은 시간지기         time stop (fx_boss_time_zone), pendulum swing, ice slam
//   b04_oblivion_source  망각의 근원 (3 phases)   all of the above mixed; `phase` = 1->2, `phase3` = 2->3
import { finalizeMonster, TAU, keys, clamp01, smooth, win } from '../core/monster.js';
import { eduKit, glowMat, fragments, burst, blobShadow, sizeSchema, colorSchema, cuteEyes, cuteCheeks } from './common.js';
import { spawnRing } from './monsters.js';

const Z = Math.PI / 2;

const COMMON = {
  hit: { label: '피격', duration: 0.4, loop: false, apply(r, u) { const k = keys(u, [[0, 0], [0.2, 1], [1, 0]]); r.body.rotation.x -= k * 0.08; r.body.position.z -= k * 0.06; } },
  death: {
    label: '쓰러짐 (거대한 빛 폭발)', duration: 2.6, loop: false,
    apply(r, u) {
      r.body.rotation.z += Math.sin(u * TAU * 4) * 0.05 * (1 - u);
      r.body.position.y -= smooth(clamp01((u - 0.2) / 0.5)) * 0.3;
      r.body.scale.setScalar(Math.max(0.001, 1 - smooth(clamp01((u - 0.5) / 0.3))));
      burst(r.frags, clamp01((u - 0.4) / 0.6));
      r.ring.scale.setScalar(Math.max(0.001, win(u, 0.4, 1, 0.15) * 2.5));
    },
  },
  intro: {
    label: '등장 연출', duration: 2.4, loop: false,
    apply(r, u) {
      r.body.position.y -= (1 - smooth(clamp01(u / 0.6))) * 2;
      r.ring.scale.setScalar(Math.max(0.001, win(u, 0, 0.75, 0.15) * 2.2));
      r.ring.rotation.y += u * TAU;
      const roar = win(u, 0.65, 0.95, 0.08);
      r.body.scale.setScalar(1 + roar * 0.06);
      r.body.rotation.x -= roar * 0.12;
    },
  },
};

function boss({ name, label, role, defaults, schema, timing, hover = 0, fragY = 1.5, ringColor, build, anims }) {
  const animations = { ...COMMON, ...anims };
  return {
    label, role, file: `monsters/${name}.glb`, timing,
    defaults: { seed: 800, size: 1, ...defaults },
    schema: { ...sizeSchema, ...colorSchema(schema) },
    build(p) {
      const k = eduKit(p.seed, 0.5);
      const root = k.pivot('root');
      root.name = name;
      root.scale.setScalar(p.size);
      blobShadow(k, root, 1.1);
      const body = k.pivot('body', 0, hover, 0);
      root.add(body);
      const rig = { body };
      build(k, p, body, rig, root);
      rig.ring = spawnRing(k, root, ringColor, 1.1);
      rig.frags = fragments(k, root, { y: fragY, count: 20, spread: 2.2 });
      return finalizeMonster(root, { rig, params: p, animations, clips: Object.fromEntries(Object.keys(animations).map((c) => [c, c])) });
    },
  };
}
const glowPulse = (obj, u, a = 0.2, f = 4) => obj.scale.setScalar(1 + Math.sin(u * TAU * f) * a);

// ---- 1. 고목 수호자 올드루트 ----------------------------------------------------------------
const oldroot = boss({
  name: 'b01_oldroot', label: '고목 수호자 올드루트', role: '👑 보스 (숲)', ringColor: '#9aff6a',
  timing: { attack1: 0.5, attack2: 0.55, attack3: [0.3, 0.8] },
  defaults: { seed: 801, barkColor: '#7a5236', leafColor: '#3fa05c', mossColor: '#6aa84a', glowColor: '#d8ff6a' },
  schema: { barkColor: '나무껍질 색', leafColor: '잎 색', mossColor: '이끼 색', glowColor: '빛 색' },
  build(k, p, body, rig) {
    // Parts: body (trunk), face, brows, canopy, armL, armR (branch arms), rootL, rootR
    const bark = k.mat('bark', p.barkColor);
    const leaf = k.mat('leaf', p.leafColor);
    const moss = k.mat('moss', p.mossColor);
    const glow = glowMat(k, 'oldGlow', p.glowColor, 1.8);
    for (const [n, s] of [['L', 1], ['R', -1]]) {
      const rt = k.pivot(`root${n}`, s * 0.35, 0.3, 0);
      rt.add(k.at(k.rot(k.cyl(0.12, 0.2, 0.6, bark, 6, 0.02), 0, 0, s * -0.5), s * 0.15, -0.18, 0.05));
      rt.add(k.at(k.rot(k.cone(0.1, 0.4, bark, 5), Z, s * 0.3, 0), s * 0.2, -0.28, 0.3));
      body.add(rt);
      rig[`root${n}`] = rt;
    }
    body.add(k.at(k.cyl(0.55, 0.7, 1.8, bark, 8, 0.04), 0, 1.2, 0)); // trunk
    body.add(k.at(k.scl(k.ball(0.35, moss, 0, 0.03), 1.6, 0.5, 1.2), 0.2, 2.1, 0.15));
    const face = k.pivot('face', 0, 1.45, 0.66);
    face.add(k.at(k.scl(k.ball(0.32, k.mat('faceBark', '#9a6a46'), 1, 0.02), 1.3, 1, 0.35), 0, 0, -0.04));
    for (const s of [-1, 1]) face.add(k.at(k.scl(k.ball(0.09, glow, 1), 1, 1.2, 0.5), s * 0.17, 0.06, 0.08)); // glowing eyes
    for (const s of [-1, 1]) face.add(k.at(k.ball(0.035, k.mat('pupilDark', '#2a3a1a'), 0), s * 0.17, 0.05, 0.13));
    k.smile(face, { y: -0.15, z: 0.1, width: 0.22, color: '#3a2a1a', thick: 0.04, segs: 5 });
    const brows = k.pivot('brows', 0, 0.2, 0.1);
    for (const s of [-1, 1]) brows.add(k.at(k.rot(k.box(0.18, 0.05, 0.06, moss, 0), 0, 0, s * 0.1), s * 0.17, 0, 0));
    face.add(brows);
    body.add(face);
    const canopy = k.pivot('canopy', 0, 2.2, 0);
    for (const [x, y, z, r] of [[0, 0.5, 0, 0.9], [0.7, 0.2, 0.1, 0.6], [-0.7, 0.25, -0.1, 0.6], [0.1, 0.35, -0.6, 0.6], [0, 0.95, 0.1, 0.5]]) canopy.add(k.at(k.ball(r, leaf, 1, 0.05), x, y, z));
    for (let i = 0; i < 5; i++) canopy.add(k.at(k.ball(0.06, glow, 0), Math.cos(i * 1.3) * 0.9, 0.3 + (i % 2) * 0.4, 0.3 + Math.sin(i * 1.3) * 0.5)); // glowing acorns
    body.add(canopy);
    for (const [n, s] of [['L', 1], ['R', -1]]) {
      const arm = k.pivot(`arm${n}`, s * 0.6, 1.75, 0);
      arm.add(k.at(k.rot(k.cyl(0.08, 0.14, 1.0, bark, 6, 0.015), 0, 0, s * -1.1), s * 0.45, -0.25, 0));
      arm.add(k.at(k.ball(0.28, leaf, 1, 0.03), s * 0.95, -0.5, 0.05)); // leafy hand
      for (let i = 0; i < 3; i++) arm.add(k.at(k.rot(k.cone(0.04, 0.3, bark, 4), 0, 0, s * (-2 - i * 0.3)), s * (1.0 + i * 0.05), -0.75, 0.1 - i * 0.1));
      body.add(arm);
      rig[`arm${n}`] = arm;
    }
    Object.assign(rig, { face, brows, canopy });
  },
  anims: {
    idle: { label: '대기 (잎이 살랑)', duration: 3, apply(r, u) { const w = u * TAU; r.canopy.rotation.z += Math.sin(w) * 0.04; r.armL.rotation.z += Math.sin(w) * 0.05; r.armR.rotation.z -= Math.sin(w) * 0.05; r.body.position.y += Math.sin(w) * 0.02; } },
    walk: { label: '걷기 (뿌리로 성큼)', duration: 1.8, apply(r, u) { const w = u * TAU; r.rootL.rotation.x += Math.sin(w) * 0.4; r.rootR.rotation.x -= Math.sin(w) * 0.4; r.rootL.position.y += Math.max(0, Math.sin(w)) * 0.15; r.rootR.position.y += Math.max(0, -Math.sin(w)) * 0.15; r.body.rotation.z += Math.sin(w) * 0.05; r.canopy.rotation.z -= Math.sin(w) * 0.06; } },
    attack1: {
      label: '패턴 1: 뿌리 솟구치기 (땅 내려찍기)', duration: 1.4, loop: false,
      apply(r, u) {
        const up = keys(u, [[0, 0], [0.4, 1], [0.5, -0.3], [0.75, -0.3], [1, 0]]);
        r.armL.rotation.z += up * 0.9; r.armR.rotation.z -= up * 0.9;
        r.body.position.y += keys(u, [[0, 0], [0.4, 0.2], [0.5, -0.1], [0.75, -0.1], [1, 0]]);
        r.brows.rotation.z += up * 0.1;
      },
    },
    attack2: {
      label: '패턴 2: 도토리병사 소환 (가지를 흔듦)', duration: 1.6, loop: false,
      apply(r, u) {
        const shake = win(u, 0.15, 0.8, 0.1);
        r.canopy.rotation.z += Math.sin(u * TAU * 8) * 0.12 * shake;
        r.canopy.position.y += shake * 0.1;
        r.armL.rotation.z += shake * 0.6 + Math.sin(u * TAU * 8) * 0.1 * shake;
        r.armR.rotation.z -= shake * 0.6 + Math.sin(u * TAU * 8) * 0.1 * shake;
      },
    },
    attack3: {
      label: '패턴 3: 회전 가지 공격', duration: 1.8, loop: false,
      apply(r, u) {
        const out = win(u, 0.1, 0.9, 0.15);
        r.armL.rotation.z += out * 0.9; r.armR.rotation.z -= out * 0.9;
        r.body.rotation.y += smooth(clamp01((u - 0.2) / 0.65)) * TAU * 2;
      },
    },
    phase: {
      label: '페이즈 전환 (화난 표정, 잎이 빛남)', duration: 1.6, loop: false,
      apply(r, u) {
        const a = keys(u, [[0, 0], [0.3, 1], [1, 1]]);
        r.brows.position.y -= a * 0.05;
        r.brows.children.forEach((b, i) => { b.rotation.z += (i ? 1 : -1) * a * 0.35; });
        r.body.scale.setScalar(1 + win(u, 0.3, 0.7, 0.1) * 0.08);
        r.canopy.scale.setScalar(1 + a * 0.12 + Math.sin(u * TAU * 6) * 0.03 * a);
      },
    },
  },
});

// ---- 2. 금서의 군주 -------------------------------------------------------------------------
const forbiddenLord = boss({
  name: 'b02_forbidden_lord', label: '금서의 군주', role: '👑 보스 (도서관)', hover: 0.6, ringColor: '#d8a0ff',
  timing: { attack1: [0.25, 0.85], attack2: 0.5, attack3: 0.55 },
  defaults: { seed: 802, robeColor: '#5a2a7a', pageColor: '#f6eed8', goldColor: '#f2c14e', inkColor: '#2a2d5a', glowColor: '#d8a0ff' },
  schema: { robeColor: '망토 색', pageColor: '종이 색', goldColor: '왕관 색', inkColor: '잉크 색', glowColor: '빛 색' },
  build(k, p, body, rig) {
    // Parts: body, torso, head (crowned book head), armL, armR, cape, orbit (floating books)
    const robe = k.mat('robe', p.robeColor);
    const page = k.mat('page', p.pageColor);
    const gold = k.mat('gold', p.goldColor, { metalness: 0.5, roughness: 0.35 });
    const glow = glowMat(k, 'lordGlow', p.glowColor, 2);
    body.add(k.at(k.cone(0.7, 1.4, robe, 8, 0.02), 0, 0.5, 0)); // floating robe (no legs)
    body.add(k.at(k.rot(k.cone(0.7, 0.3, robe, 8), Math.PI, 0, 0), 0, -0.3, 0));
    const torso = k.pivot('torso', 0, 1.2, 0);
    torso.add(k.at(k.box(0.8, 0.7, 0.5, robe, 0.01), 0, 0.2, 0));
    torso.add(k.at(k.box(0.5, 0.62, 0.06, page, 0), 0, 0.2, 0.27)); // big open book on the chest
    for (let i = 0; i < 4; i++) torso.add(k.at(k.box(0.36, 0.02, 0.01, k.mat('ink', p.inkColor), 0), 0, 0.38 - i * 0.1, 0.305));
    torso.add(k.at(k.box(0.86, 0.1, 0.56, gold, 0), 0, 0.55, 0)); // collar
    body.add(torso);
    const cape = k.pivot('cape', 0, 0.55, -0.27);
    for (let i = 0; i < 5; i++) cape.add(k.at(k.rot(k.box(0.22, 1.3, 0.03, i % 2 ? page : robe, 0.006), 0.1, 0, (i - 2) * 0.12), (i - 2) * 0.2, -0.6, -0.05));
    torso.add(cape);
    const head = k.pivot('head', 0, 0.62, 0);
    head.add(k.at(k.box(0.46, 0.5, 0.18, k.mat('bookHead', '#3a1a5a'), 0.006), 0, 0.28, 0)); // a closed book for a head
    head.add(k.at(k.box(0.4, 0.46, 0.06, page, 0), 0, 0.28, -0.11));
    cuteEyes(k, head, { y: 0.32, z: 0.1, spacing: 0.1, size: 0.06 });
    k.smile(head, { y: 0.15, z: 0.1, width: 0.12, color: p.goldColor, thick: 0.025, segs: 5, curve: -0.3 }); // haughty frown
    for (let i = 0; i < 5; i++) head.add(k.at(k.rot(k.cone(0.05, 0.18, gold, 4), 0, 0, 0), -0.2 + i * 0.1, 0.62, 0)); // crown
    head.add(k.at(k.box(0.5, 0.06, 0.22, gold, 0), 0, 0.54, 0));
    head.add(k.at(k.mesh(new k.THREE.OctahedronGeometry(0.06, 0), glow), 0, 0.6, 0.12));
    torso.add(head);
    for (const [n, s] of [['L', 1], ['R', -1]]) {
      const arm = k.pivot(`arm${n}`, s * 0.48, 0.45, 0);
      arm.add(k.at(k.cyl(0.12, 0.2, 0.7, robe, 6), 0, -0.35, 0));
      arm.add(k.at(k.ball(0.11, k.mat('glove', '#f2eaff'), 1), 0, -0.75, 0.02));
      torso.add(arm);
      rig[`arm${n}`] = arm;
    }
    const orbit = k.pivot('orbit', 0, 1.3, 0);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU;
      const b = k.pivot(`orbitBook${i}`, Math.cos(a) * 1.2, Math.sin(a * 2) * 0.2, Math.sin(a) * 1.2);
      b.add(k.box(0.22, 0.05, 0.28, k.mat(`bookC${i % 3}`, ['#a03a3a', '#3a6ab8', '#3a8a5a'][i % 3]), 0));
      b.add(k.at(k.box(0.2, 0.04, 0.26, page, 0), 0, 0.01, 0));
      orbit.add(b);
    }
    body.add(orbit);
    Object.assign(rig, { torso, head, cape, orbit });
  },
  anims: {
    idle: { label: '대기 (책이 주위를 돎)', duration: 4, apply(r, u) { const w = u * TAU; r.orbit.rotation.y += w; r.body.position.y += Math.sin(w * 2) * 0.06; r.cape.rotation.x -= Math.sin(w * 2) * 0.05; r.armL.rotation.z += Math.sin(w) * 0.05; } },
    walk: { label: '떠서 이동', duration: 2, apply(r, u) { const w = u * TAU; r.orbit.rotation.y += w; r.body.rotation.x += 0.12; r.cape.rotation.x -= 0.25; r.body.position.y += Math.sin(w * 2) * 0.04; } },
    attack1: {
      label: '패턴 1: 페이지 폭풍 (회전)', duration: 2, loop: false,
      apply(r, u) {
        const on = win(u, 0.1, 0.9, 0.15);
        r.armL.rotation.z += on * 1.4; r.armR.rotation.z -= on * 1.4;
        r.orbit.rotation.y += smooth(u) * TAU * 3;
        r.orbit.scale.setScalar(1 + on * 0.6);
        r.body.rotation.y += Math.sin(u * TAU * 2) * 0.2 * on;
      },
    },
    attack2: {
      label: '패턴 2: 잉크 웅덩이 (손을 들어 잉크비)', duration: 1.4, loop: false,
      apply(r, u) {
        const up = keys(u, [[0, 0], [0.4, 1], [0.55, 0.3], [1, 0]]);
        r.armR.rotation.x -= up * 2.8;
        r.head.rotation.x -= up * 0.2;
      },
    },
    attack3: {
      label: '패턴 3: 마법서 소환 (책을 펼침)', duration: 1.6, loop: false,
      apply(r, u) {
        const open = win(u, 0.2, 0.85, 0.12);
        r.armL.rotation.x -= open * 1.2; r.armR.rotation.x -= open * 1.2;
        r.armL.rotation.z += open * 0.6; r.armR.rotation.z -= open * 0.6;
        r.orbit.children.forEach((b, i) => { b.position.y += open * 0.4 + Math.sin(u * TAU * 3 + i) * 0.05; b.rotation.z += open * 0.6; });
      },
    },
    phase: { label: '페이즈 전환 (왕관이 빛나고 책이 불어남)', duration: 1.6, loop: false, apply(r, u) { const a = keys(u, [[0, 0], [0.3, 1], [1, 1]]); r.orbit.scale.setScalar(1 + a * 0.3); r.head.scale.setScalar(1 + win(u, 0.3, 0.7, 0.1) * 0.1); r.armL.rotation.z += win(u, 0.2, 0.9, 0.1) * 1.2; r.armR.rotation.z -= win(u, 0.2, 0.9, 0.1) * 1.2; } },
  },
});

// ---- 3. 얼어붙은 시간지기 -------------------------------------------------------------------
const timeKeeper = boss({
  name: 'b03_time_keeper', label: '얼어붙은 시간지기', role: '👑 보스 (시계탑)', ringColor: '#bff0ff',
  timing: { attack1: 0.5, attack2: 0.55, attack3: 0.5 },
  defaults: { seed: 803, iceColor: '#bfe8ff', brassColor: '#d8a84a', faceColor: '#fff6d8', glowColor: '#8ad8ff' },
  schema: { iceColor: '얼음 갑옷 색', brassColor: '황동 색', faceColor: '시계판 색', glowColor: '빛 색' },
  build(k, p, body, rig) {
    // Parts: body, torso, head, clockHand (hour hand on the chest), armL, armR (> pendulum), legL, legR
    const ice = k.mat('ice', p.iceColor, { roughness: 0.25, emissive: p.iceColor, emissiveIntensity: 0.15 });
    const brass = k.mat('brass', p.brassColor, { metalness: 0.5, roughness: 0.35 });
    const glow = glowMat(k, 'keeperGlow', p.glowColor, 2);
    for (const [n, s] of [['L', 1], ['R', -1]]) {
      const leg = k.pivot(`leg${n}`, s * 0.32, 0.9, 0);
      leg.add(k.at(k.box(0.32, 0.9, 0.34, ice, 0.02), 0, -0.45, 0));
      leg.add(k.at(k.box(0.36, 0.14, 0.44, brass, 0), 0, -0.84, 0.04));
      body.add(leg);
      rig[`leg${n}`] = leg;
    }
    const torso = k.pivot('torso', 0, 0.9, 0);
    torso.add(k.at(k.box(1.0, 0.95, 0.6, ice, 0.02), 0, 0.5, 0));
    torso.add(k.at(k.rot(k.cyl(0.36, 0.36, 0.08, brass, 12), Z, 0, 0), 0, 0.52, 0.31)); // clock face rim
    torso.add(k.at(k.rot(k.cyl(0.31, 0.31, 0.06, k.mat('clockFace', p.faceColor, { emissive: p.faceColor, emissiveIntensity: 0.3 }), 12), Z, 0, 0), 0, 0.52, 0.33));
    for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; torso.add(k.at(k.box(0.025, 0.05, 0.02, brass, 0), Math.cos(a) * 0.25, 0.52 + Math.sin(a) * 0.25, 0.37)); }
    const hand = k.pivot('clockHand', 0, 0.52, 0.38);
    hand.add(k.at(k.box(0.04, 0.24, 0.02, k.mat('clockHandMat', '#3a3a4a'), 0), 0, 0.1, 0));
    torso.add(hand);
    for (let i = 0; i < 5; i++) torso.add(k.at(k.rot(k.cone(0.08, 0.3, ice, 4), 0, 0, (i - 2) * 0.35), (i - 2) * 0.2, 1.05, -0.1)); // icicle crown on the back
    body.add(torso);
    const head = k.pivot('head', 0, 1.0, 0.05);
    head.add(k.at(k.box(0.44, 0.38, 0.4, ice, 0.015), 0, 0.2, 0));
    head.add(k.at(k.cyl(0.24, 0.3, 0.12, brass, 8), 0, 0.44, 0)); // brass cap
    head.add(k.at(k.cone(0.08, 0.2, brass, 6), 0, 0.6, 0));
    cuteEyes(k, head, { y: 0.24, z: 0.2, spacing: 0.1, size: 0.05 });
    k.smile(head, { y: 0.1, z: 0.205, width: 0.1, thick: 0.02, segs: 4, curve: -0.2 });
    for (const s of [-1, 1]) head.add(k.at(k.box(0.1, 0.03, 0.03, k.mat('frost', '#ffffff'), 0), s * 0.1, 0.32, 0.21)); // frosty brows
    torso.add(head);
    for (const [n, s] of [['L', 1], ['R', -1]]) {
      const arm = k.pivot(`arm${n}`, s * 0.62, 0.85, 0);
      arm.add(k.at(k.scl(k.ball(0.22, brass, 1), 1, 0.8, 1), 0, 0.02, 0));
      arm.add(k.at(k.box(0.24, 0.7, 0.26, ice, 0.015), 0, -0.4, 0));
      arm.add(k.at(k.box(0.3, 0.26, 0.3, brass, 0.01), 0, -0.85, 0.02));
      torso.add(arm);
      rig[`arm${n}`] = arm;
    }
    // giant pendulum held in the right hand (swing weapon)
    const pend = k.pivot('pendulum', 0, -0.9, 0.1);
    pend.rotation.x = 0.35; // held up like a mace, bob above the head
    pend.add(k.at(k.cyl(0.04, 0.04, 1.4, brass, 5), 0, 0.65, 0));
    pend.add(k.at(k.rot(k.cyl(0.32, 0.32, 0.1, brass, 10), Z, 0, 0), 0, 1.4, 0));
    pend.add(k.at(k.rot(k.cyl(0.2, 0.2, 0.12, glow, 10), Z, 0, 0), 0, 1.4, 0));
    rig.armR.add(pend);
    Object.assign(rig, { torso, head, hand, pend });
  },
  anims: {
    idle: { label: '대기 (시계바늘 째깍)', duration: 2, apply(r, u) { r.hand.rotation.z -= Math.floor(u * 8) / 8 * TAU * 0.25; r.torso.position.y += Math.sin(u * TAU) * 0.02; r.pend.rotation.z += Math.sin(u * TAU) * 0.1; } },
    walk: { label: '걷기 (쿵, 째깍)', duration: 1.6, apply(r, u) { const w = u * TAU; r.legL.rotation.x += Math.sin(w) * 0.35; r.legR.rotation.x -= Math.sin(w) * 0.35; r.armL.rotation.x -= Math.sin(w) * 0.2; r.torso.rotation.z += Math.sin(w) * 0.04; r.hand.rotation.z -= u * TAU * 0.25; } },
    attack1: {
      label: '패턴 1: 시간 정지 (시계를 멈춤)', duration: 1.6, loop: false,
      apply(r, u) {
        const up = keys(u, [[0, 0], [0.4, 1], [0.85, 1], [1, 0]]);
        r.armL.rotation.x -= up * 2.6;
        r.hand.rotation.z -= keys(u, [[0, 0], [0.45, TAU], [1, TAU]]);
        r.torso.scale.setScalar(1 + win(u, 0.45, 0.6, 0.05) * 0.06);
      },
    },
    attack2: {
      label: '패턴 2: 시계추 휘두르기', duration: 1.4, loop: false,
      apply(r, u) {
        r.armR.rotation.x += keys(u, [[0, 0], [0.35, -2.4], [0.55, 0.5], [0.75, 0.4], [1, 0]]);
        r.armR.rotation.z += keys(u, [[0, 0], [0.35, -0.6], [0.55, 0.4], [1, 0]]);
        r.torso.rotation.y += keys(u, [[0, 0], [0.35, 0.5], [0.55, -0.6], [1, 0]]);
      },
    },
    attack3: {
      label: '패턴 3: 얼음 내려찍기', duration: 1.3, loop: false,
      apply(r, u) {
        const up = keys(u, [[0, 0], [0.4, 1], [0.5, -0.2], [0.75, -0.2], [1, 0]]);
        r.armL.rotation.x -= up * 2.4; r.armR.rotation.x -= up * 1.2;
        r.body.position.y += keys(u, [[0, 0], [0.4, 0.3], [0.5, -0.05], [0.75, -0.05], [1, 0]]);
      },
    },
    phase: { label: '페이즈 전환 (시계가 거꾸로 돎)', duration: 1.8, loop: false, apply(r, u) { r.hand.rotation.z += smooth(u) * TAU * 3; r.torso.scale.setScalar(1 + win(u, 0.2, 0.8, 0.1) * 0.06); r.armL.rotation.z += win(u, 0.2, 0.9, 0.1) * 0.8; r.armR.rotation.z -= win(u, 0.2, 0.9, 0.1) * 0.6; } },
  },
});

// ---- 4. 망각의 근원 (3 phases) ------------------------------------------------------------
const oblivionSource = boss({
  name: 'b04_oblivion_source', label: '망각의 근원', role: '👑 최종 보스 (심연, 3페이즈)', hover: 2.0, fragY: 2, ringColor: '#b48aff',
  timing: { attack1: [0.35, 0.8], attack2: 0.5, attack3: 0.5, attack4: [0.25, 0.85] },
  defaults: { seed: 804, voidColor: '#2a1a4a', shellColor: '#5a4a8a', eyeColor: '#f2eaff', irisColor: '#8a4aff', glowColor: '#d8a0ff' },
  schema: { voidColor: '공허 색', shellColor: '껍질 색', eyeColor: '눈 색', irisColor: '눈동자 색', glowColor: '빛 색' },
  build(k, p, body, rig) {
    // Parts: body, core (void orb), shell0..3 (outer plates, break off in phase3), eye > iris, lid,
    //        ribbons (4 trailing arms: ribbon0..3), halo (erased letters crown), beam
    const vd = k.mat('void', p.voidColor, { emissive: p.glowColor, emissiveIntensity: 0.15 });
    const shellM = k.mat('shell', p.shellColor, { metalness: 0.3, roughness: 0.5 });
    const glow = glowMat(k, 'sourceGlow', p.glowColor, 2);
    const core = k.pivot('core');
    core.add(k.ball(0.75, vd, 2, 0.02));
    body.add(core);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU + 0.4;
      const sh = k.pivot(`shell${i}`, Math.cos(a) * 0.55, (i % 2 ? 0.35 : -0.3), Math.sin(a) * 0.55 - 0.1);
      sh.add(k.scl(k.mesh(new k.THREE.OctahedronGeometry(0.4, 0), shellM), 1, 1.3, 0.45));
      sh.lookAt(0, sh.position.y, 0);
      core.add(sh);
    }
    const eye = k.pivot('eye', 0, 0.05, 0.74);
    eye.add(k.scl(k.ball(0.32, k.mat('eyeWhite', p.eyeColor), 1), 1, 1, 0.5));
    const iris = k.pivot('iris', 0, 0, 0.13);
    iris.add(k.scl(k.ball(0.15, glowMat(k, 'iris', p.irisColor, 1.4), 1), 1, 1, 0.4));
    iris.add(k.at(k.scl(k.ball(0.07, k.mat('pupil', '#120a20'), 0), 1, 1, 0.4), 0, 0, 0.05));
    iris.add(k.at(k.box(0.05, 0.05, 0.01, k.mat('shine', '#ffffff', { emissive: '#ffffff', emissiveIntensity: 0.6 }), 0), 0.05, 0.05, 0.07));
    eye.add(iris);
    const lid = k.pivot('lid');
    lid.add(k.scl(k.dome(0.34, shellM, 10), 1, 1, 0.55));
    lid.rotation.x = -0.5;
    eye.add(lid);
    core.add(eye);
    const ribbons = k.pivot('ribbons', 0, -0.4, -0.2);
    for (let i = 0; i < 4; i++) {
      const rb = k.pivot(`ribbon${i}`, (i - 1.5) * 0.35, 0, 0);
      let parent = rb;
      for (let j = 0; j < 4; j++) { const seg = k.pivot(`ribbon${i}_${j}`, 0, j ? -0.32 : 0, 0); seg.add(k.at(k.box(0.14 - j * 0.025, 0.34, 0.04, j % 2 ? glow : vd, 0.004), 0, -0.16, 0)); parent.add(seg); parent = seg; }
      ribbons.add(rb);
    }
    body.add(ribbons);
    const halo = k.pivot('halo', 0, 0.95, 0);
    const lm = glowMat(k, 'haloLetters', p.glowColor, 2.2);
    for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU; halo.add(k.at(k.rot(k.box(0.1, 0.025, 0.02, lm, 0), 0, -a, i % 2 ? 0.8 : 0), Math.cos(a) * 0.55, 0, Math.sin(a) * 0.55)); halo.add(k.at(k.rot(k.box(0.025, 0.1, 0.02, lm, 0), 0, -a, 0), Math.cos(a) * 0.55, 0.04, Math.sin(a) * 0.55)); }
    body.add(halo);
    const beam = k.pivot('beam', 0, 0.05, 0.92);
    beam.add(k.at(k.rot(k.cyl(0.12, 0.2, 6, glowMat(k, 'beam', p.glowColor, 2, 0.5), 8), Z, 0, 0), 0, 0, 3));
    beam.add(k.at(k.rot(k.cyl(0.05, 0.07, 6, glowMat(k, 'beamCore', '#ffffff', 2.6), 6), Z, 0, 0), 0, 0, 3));
    beam.scale.setScalar(0.001);
    body.add(beam);
    const shells = [0, 1, 2, 3].map((i) => core.getObjectByName(`shell${i}`));
    Object.assign(rig, { core, eye, iris, lid, ribbons, halo, beam, shells, segs: ribbons.children });
  },
  anims: {
    idle: { label: '대기 (리본이 일렁임)', duration: 3, apply(r, u) { const w = u * TAU; r.halo.rotation.y += w; r.core.rotation.y += Math.sin(w) * 0.1; r.body.position.y += Math.sin(w) * 0.08; r.iris.position.x += Math.sin(w) * 0.06; r.segs.forEach((rb, i) => { let s = rb; while (s) { s.rotation.x += Math.sin(w - i) * 0.1; s.rotation.z += Math.sin(w * 2 + i) * 0.08; s = s.children.find((c) => !c.isMesh); } }); } },
    walk: { label: '떠서 이동', duration: 2.4, apply(r, u) { const w = u * TAU; r.body.rotation.x += 0.1; r.halo.rotation.y += w; r.segs.forEach((rb) => { rb.rotation.x -= 0.5; }); r.body.position.y += Math.sin(w * 2) * 0.05; } },
    attack1: {
      label: '패턴 1: 망각 광선 (휩쓸기)', duration: 2.2, loop: false,
      apply(r, u) {
        const open = keys(u, [[0, 0], [0.3, 1], [0.85, 1], [1, 0]]);
        r.lid.rotation.x -= open * 0.7;
        const on = u > 0.35 && u < 0.8;
        r.beam.scale.set(on ? 1 : 0.001, on ? 1 : 0.001, on ? 1 : 0.001);
        r.body.rotation.y += on ? Math.sin((u - 0.35) / 0.45 * Math.PI * 2) * 0.6 : 0;
      },
    },
    attack2: {
      label: '패턴 2: 그림자 가시 (뿌리 패턴 섞음)', duration: 1.4, loop: false,
      apply(r, u) { const up = keys(u, [[0, 0], [0.4, 1], [0.5, -0.4], [1, 0]]); r.body.position.y += up * 0.5; r.segs.forEach((rb) => { rb.rotation.x += up * 0.8; }); },
    },
    attack3: {
      label: '패턴 3: 망각의 눈 소환', duration: 1.6, loop: false,
      apply(r, u) { const c = win(u, 0.15, 0.85, 0.12); r.lid.rotation.x += c * 1.1; r.halo.scale.setScalar(1 + c * 0.8); r.halo.rotation.y += u * TAU * 2; },
    },
    attack4: {
      label: '패턴 4: 글자 폭풍 (페이지 폭풍 + 시간 정지 섞음)', duration: 2.4, loop: false,
      apply(r, u) { const on = win(u, 0.15, 0.9, 0.15); r.halo.scale.setScalar(1 + on * 2); r.halo.rotation.y += smooth(u) * TAU * 4; r.core.rotation.y += smooth(u) * TAU; r.segs.forEach((rb, i) => { rb.rotation.z += on * (i - 1.5) * 0.5; }); },
    },
    phase: { label: '페이즈 1→2 (눈이 크게 뜨임, 리본이 펼쳐짐)', duration: 2, loop: false, apply(r, u) { const a = keys(u, [[0, 0], [0.4, 1], [1, 1]]); r.lid.rotation.x -= a * 0.6; r.iris.scale.setScalar(1 + a * 0.25); r.segs.forEach((rb, i) => { rb.rotation.z += a * (i - 1.5) * 0.4; }); r.body.scale.setScalar(1 + win(u, 0.3, 0.7, 0.1) * 0.08); } },
    phase3: {
      label: '페이즈 2→3 (껍질이 깨져 날아감)', duration: 2.2, loop: false,
      apply(r, u) {
        const f = smooth(clamp01((u - 0.3) / 0.5));
        r.shells.forEach((s, i) => { s.position.multiplyScalar(1 + f * 1.5); s.position.y += f * (i % 2 ? 0.6 : -0.6); s.rotation.z += f * 3; s.scale.setScalar(Math.max(0.001, 1 - smooth(clamp01((u - 0.6) / 0.35)))); });
        r.core.scale.setScalar(1 + win(u, 0.2, 0.5, 0.08) * 0.15);
        r.halo.scale.setScalar(1 + f * 0.4);
      },
    },
  },
});

export const EDU_BOSSES = { oldroot, forbiddenLord, timeKeeper, oblivionSource };
