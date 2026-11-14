// Regular monsters of stages 2-4 (library, clock tower, abyss). Same rules as the forest set:
// cute and round, no gore, clips idle / walk (fly) / attack / hit / death / spawn, plus a few
// special clips (teleport, flicker, summon). Every monster has a `body` pivot that the shared
// hit / death / spawn clips move; the part names the game needs are listed per monster.
import { finalizeMonster, TAU, keys, clamp01, smooth, win } from '../core/monster.js';
import { eduKit, glowMat, fragments, burst, blobShadow, sizeSchema, colorSchema, cuteEyes, cuteCheeks } from './common.js';
import { spawnScale, ringPulse, spawnRing } from './monsters.js';

const Z = Math.PI / 2;

// shared clips: they only touch r.body, r.ring, r.frags (+ r.shadow if present)
const COMMON = {
  hit: {
    label: '피격', duration: 0.35, loop: false,
    apply(r, u) {
      const k = keys(u, [[0, 0], [0.2, 1], [1, 0]]);
      r.body.rotation.x -= k * 0.25;
      r.body.position.z -= k * 0.08;
      r.body.scale.set(1 + k * 0.08, 1 - k * 0.1, 1 + k * 0.08);
    },
  },
  death: {
    label: '소멸 (빛 조각 + 글자)', duration: 1.3, loop: false,
    apply(r, u) {
      r.body.rotation.z += smooth(clamp01(u / 0.4)) * 0.5;
      r.body.position.y -= smooth(clamp01(u / 0.5)) * (r.hover ?? 0) * 0.4;
      r.body.scale.setScalar(Math.max(0.001, 1 - smooth(clamp01((u - 0.3) / 0.35))));
      burst(r.frags, clamp01((u - 0.25) / 0.75));
    },
  },
  spawn: {
    label: '등장 (빛 고리에서)', duration: 1, loop: false,
    apply(r, u) {
      r.body.scale.setScalar(spawnScale(u));
      r.body.position.y -= (1 - smooth(u)) * 0.3;
      ringPulse(r.ring, u);
    },
  },
};

function monster({ name, label, role, defaults, schema, hover = 0, fragY = 0.4, ringColor, letter, build, anims, release }) {
  const animations = { ...anims, ...COMMON, ...(anims.hit ? { hit: anims.hit } : {}) };
  return {
    label, role, file: `monsters/${name}.glb`, release,
    defaults: { seed: 600, size: 1, ...defaults },
    schema: { ...sizeSchema, ...colorSchema(schema) },
    build(p) {
      const k = eduKit(p.seed, 0.35);
      const root = k.pivot('root');
      root.name = name;
      root.scale.setScalar(p.size);
      blobShadow(k, root, 0.3);
      const body = k.pivot('body', 0, hover, 0);
      root.add(body);
      const rig = { body, hover };
      build(k, p, body, rig, root);
      rig.ring = spawnRing(k, root, ringColor ?? '#8ad8ff', 0.4);
      rig.frags = fragments(k, root, { y: hover || fragY, count: 10, spread: 0.9, letter: letter ?? '#bfe4ff' });
      return finalizeMonster(root, { rig, params: p, animations, clips: Object.fromEntries(Object.keys(animations).map((c) => [c, c])) });
    },
  };
}
const face = (k, parent, { y, z, spacing, size, mouth = true, cheeks = true }) => {
  cuteEyes(k, parent, { y, z, spacing, size });
  if (cheeks) cuteCheeks(k, parent, { y: y - size * 1.4, z: z - size * 0.1, spacing: spacing * 1.5, size: size * 0.6 });
  if (mouth) k.smile(parent, { y: y - size * 1.8, z: z + size * 0.1, width: size * 1.4, thick: size * 0.35, segs: 4 });
};

// ---- 도서관 ---------------------------------------------------------------------------------
const bookworm = monster({
  name: 'm04_bookworm', label: '책벌레 애벌레', role: '④ 근접 무리형 (도서관)', ringColor: '#ffd36a', letter: '#ffe0a8',
  defaults: { seed: 604, bodyColor: '#8acc5a', stripeColor: '#f2e6c8', glassColor: '#3a3a4a' },
  schema: { bodyColor: '몸 색', stripeColor: '줄무늬 (종이) 색', glassColor: '안경 색' },
  build(k, p, body, rig) {
    // body > seg0..4 chained backwards (-Z), head at the front.  Parts: body, head, seg0..seg4
    const skin = k.mat('wormSkin', p.bodyColor);
    const paper = k.mat('wormStripe', p.stripeColor);
    const head = k.pivot('head', 0, 0.14, 0.12);
    head.add(k.ball(0.13, skin, 1));
    face(k, head, { y: 0.02, z: 0.11, spacing: 0.05, size: 0.035 });
    const g = k.mat('glasses', p.glassColor);
    for (const s of [-1, 1]) head.add(k.at(k.mesh(new k.THREE.TorusGeometry(0.04, 0.007, 3, 8), g), s * 0.05, 0.02, 0.13));
    for (const s of [-1, 1]) head.add(k.at(k.rot(k.cyl(0.006, 0.008, 0.1, g, 3), -0.4, 0, s * 0.3), s * 0.04, 0.14, 0.02));
    body.add(head);
    rig.head = head;
    rig.segs = [];
    let parent = body;
    for (let i = 0; i < 5; i++) {
      const r = 0.11 - i * 0.012;
      const seg = k.pivot(`seg${i}`, 0, i === 0 ? r : 0, i === 0 ? 0 : -r * 1.6);
      seg.add(k.ball(r, skin, 1));
      seg.add(k.at(k.scl(k.ball(r * 1.02, paper, 0), 1, 0.4, 0.5), 0, r * 0.4, 0)); // paper stripe on the back
      for (const s of [-1, 1]) seg.add(k.at(k.box(0.035, 0.03, 0.035, k.mat('feet', '#5a8a3a'), 0), s * r * 0.75, -r * 0.85, 0));
      parent.add(seg);
      rig.segs.push(seg);
      parent = seg;
    }
  },
  anims: {
    idle: { label: '대기 (꼬물꼬물)', duration: 1.6, apply(r, u) { r.segs.forEach((s, i) => { s.position.y += Math.sin(u * TAU - i) * 0.01; }); r.head.rotation.y += Math.sin(u * TAU) * 0.2; } },
    walk: { label: '기어가기 (자벌레 물결)', duration: 0.8, apply(r, u) { r.segs.forEach((s, i) => { s.position.y += Math.max(0, Math.sin(u * TAU - i * 0.9)) * 0.05; s.rotation.y += Math.sin(u * TAU - i) * 0.12; }); r.head.position.y += Math.max(0, Math.sin(u * TAU + 0.9)) * 0.04; } },
    attack: {
      label: '공격 (일어서서 냠)', duration: 0.7, loop: false,
      apply(r, u) {
        const up = keys(u, [[0, 0], [0.35, 1], [0.5, 0.2], [1, 0]]);
        r.head.position.y += up * 0.18;
        r.head.position.z += keys(u, [[0, 0], [0.35, 0], [0.5, 0.18], [1, 0]]);
        r.head.rotation.x -= up * 0.4 - keys(u, [[0, 0], [0.4, 0], [0.5, 0.6], [1, 0]]);
        r.segs[0].rotation.x -= up * 0.5;
      },
    },
  },
});

export const PAGE_RELEASE = 0.5;
const grimoire = monster({
  name: 'm05_grimoire', label: '날개 달린 마법서', role: '⑤ 원거리형 (도서관)', hover: 1.0, ringColor: '#d8a0ff', letter: '#e8d0ff', release: PAGE_RELEASE,
  defaults: { seed: 605, coverColor: '#7a3a8a', pageColor: '#f6eed8', wingColor: '#ffffff', runeColor: '#ffd36a' },
  schema: { coverColor: '표지 색', pageColor: '종이 색', wingColor: '날개 색', runeColor: '룬 색' },
  build(k, p, body, rig) {
    // Parts: body (= core), cover (upper half, opens like a mouth), wingL, wingR
    const cov = k.mat('cover', p.coverColor);
    const page = k.mat('page', p.pageColor);
    const book = k.pivot('book'); // spine at the back (-Z), the cover opens toward +Z like a mouth
    book.rotation.y = -Z;
    body.add(book);
    book.add(k.at(k.box(0.36, 0.04, 0.28, cov, 0.004), 0, -0.04, 0)); // back cover (bottom)
    book.add(k.at(k.box(0.34, 0.05, 0.26, page, 0), 0, 0, 0));
    book.add(k.at(k.box(0.04, 0.1, 0.28, cov, 0), -0.18, 0, 0)); // spine
    const cover = k.pivot('cover', -0.18, 0.03, 0); // hinge at the spine
    cover.add(k.at(k.box(0.36, 0.04, 0.28, cov, 0.004), 0.18, 0.02, 0));
    cover.add(k.at(k.box(0.34, 0.03, 0.26, page, 0), 0.18, -0.01, 0));
    cover.add(k.at(k.mesh(new k.THREE.OctahedronGeometry(0.04, 0), glowMat(k, 'rune', p.runeColor, 2)), 0.3, 0.05, 0));
    const coverFace = k.pivot('coverFace', 0.16, 0.045, 0.04); // eyes on top of the cover, looking up and forward
    coverFace.rotation.order = 'YXZ'; // tilt the eyes up, then turn them toward the book's front (+X here)
    coverFace.rotation.set(-Z + 0.6, Z, 0);
    cuteEyes(k, coverFace, { y: 0, z: 0, spacing: 0.06, size: 0.04 });
    k.smile(coverFace, { y: -0.06, z: 0.01, width: 0.05, thick: 0.012, segs: 4 });
    cover.add(coverFace);
    book.add(cover);
    rig.cover = cover;
    const wm = k.mat('wing', p.wingColor);
    for (const [n, s] of [['L', 1], ['R', -1]]) {
      const w = k.pivot(`wing${n}`, s * 0.15, 0, -0.02);
      for (let i = 0; i < 3; i++) w.add(k.at(k.rot(k.scl(k.ball(0.07, wm, 0), 1.6 - i * 0.3, 0.2, 0.6), 0, 0, s * (0.3 + i * 0.25)), s * (0.1 + i * 0.03), 0.04 + i * 0.05, -i * 0.04));
      body.add(w);
      rig[`wing${n}`] = w;
    }
    const pageOut = k.pivot('pageCharge', 0.05, 0.08, 0.12);
    pageOut.add(k.box(0.12, 0.005, 0.16, page, 0));
    pageOut.scale.setScalar(0.001);
    body.add(pageOut);
    rig.pageOut = pageOut;
  },
  anims: {
    idle: { label: '대기 (팔락팔락)', duration: 1.2, apply(r, u) { const w = u * TAU; r.body.position.y += Math.sin(w) * 0.05; r.wingL.rotation.z += Math.sin(w * 3) * 0.5; r.wingR.rotation.z -= Math.sin(w * 3) * 0.5; r.cover.rotation.z += 0.15 + Math.sin(w * 2) * 0.08; } },
    fly: { label: '날기', duration: 0.7, apply(r, u) { const w = u * TAU; r.body.rotation.x += 0.25; r.body.position.y += Math.sin(w * 2) * 0.04; r.wingL.rotation.z += Math.sin(w * 4) * 0.7; r.wingR.rotation.z -= Math.sin(w * 4) * 0.7; r.cover.rotation.z += 0.1; } },
    attack: {
      label: '공격 (책장이 열리며 페이지 발사)', duration: 0.9, loop: false,
      apply(r, u) {
        r.cover.rotation.z += keys(u, [[0, 0.1], [0.4, 1.1], [0.55, 1.3], [0.8, 0.3], [1, 0.1]]);
        r.pageOut.scale.setScalar(u < PAGE_RELEASE ? Math.max(0.001, smooth(clamp01(u / 0.4))) : 0.001);
        r.body.position.z -= keys(u, [[0, 0], [0.5, 0], [0.6, 0.12], [1, 0]]);
        r.wingL.rotation.z += Math.sin(u * TAU * 5) * 0.6;
        r.wingR.rotation.z -= Math.sin(u * TAU * 5) * 0.6;
      },
    },
  },
});

const inkGolem = monster({
  name: 'm06_inkgolem', label: '잉크 골렘', role: '⑥ 근접 탱커 (도서관)', fragY: 0.8, ringColor: '#6a74d8', letter: '#b8c0ff',
  defaults: { seed: 606, size: 1, stoneColor: '#3a3e6a', inkColor: '#2a2d5a', glowColor: '#8ad8ff', bookColor: '#a05a3a' },
  schema: { stoneColor: '몸 색', inkColor: '잉크 색', glowColor: '빛 색', bookColor: '책 색' },
  build(k, p, body, rig) {
    // Parts: body (hips), torso, head, armL, armR, legL, legR
    const stone = k.mat('golemStone', p.stoneColor);
    const ink = k.mat('golemInk', p.inkColor, { roughness: 0.4 });
    const glow = glowMat(k, 'golemGlow', p.glowColor, 1.8);
    for (const [n, s] of [['L', 1], ['R', -1]]) {
      const leg = k.pivot(`leg${n}`, s * 0.18, 0.45, 0);
      leg.add(k.at(k.box(0.24, 0.45, 0.26, stone, 0.02), 0, -0.22, 0));
      body.add(leg);
      rig[`leg${n}`] = leg;
    }
    const torso = k.pivot('torso', 0, 0.45, 0);
    torso.add(k.at(k.box(0.66, 0.55, 0.45, stone, 0.03), 0, 0.3, 0));
    torso.add(k.at(k.scl(k.ball(0.2, ink, 0, 0.02), 1.4, 0.5, 1.1), 0.05, 0.6, 0)); // ink pooled on the shoulders
    for (let i = 0; i < 3; i++) torso.add(k.at(k.rot(k.box(0.1, 0.03, 0.14, k.mat('book', p.bookColor), 0), 0, 0, (i - 1) * 0.15), -0.2 + i * 0.2, 0.12 + (i % 2) * 0.1, 0.23)); // books stuck in it
    torso.add(k.at(k.mesh(new k.THREE.OctahedronGeometry(0.06, 0), glow), 0, 0.38, 0.23)); // glowing core letter
    body.add(torso);
    const head = k.pivot('head', 0, 0.6, 0.02);
    head.add(k.at(k.box(0.34, 0.26, 0.3, stone, 0.02), 0, 0.12, 0));
    for (const s of [-1, 1]) head.add(k.at(k.box(0.07, 0.05, 0.03, glow, 0), s * 0.08, 0.14, 0.15));
    k.smile(head, { y: 0.06, z: 0.155, width: 0.1, color: p.glowColor, thick: 0.02, segs: 4 }); // friendly glowing smile
    head.add(k.at(k.rot(k.cone(0.06, 0.14, ink, 5), 0, 0, 0), 0.06, 0.32, 0)); // ink drip on top
    torso.add(head);
    for (const [n, s] of [['L', 1], ['R', -1]]) {
      const arm = k.pivot(`arm${n}`, s * 0.4, 0.5, 0);
      arm.add(k.at(k.box(0.18, 0.4, 0.2, stone, 0.02), s * 0.04, -0.2, 0));
      arm.add(k.at(k.box(0.26, 0.24, 0.26, ink, 0.02), s * 0.04, -0.5, 0.02)); // big ink fist
      torso.add(arm);
      rig[`arm${n}`] = arm;
    }
    Object.assign(rig, { torso, head });
  },
  anims: {
    idle: { label: '대기 (묵직하게)', duration: 2.2, apply(r, u) { const b = Math.sin(u * TAU); r.torso.position.y += b * 0.015; r.armL.rotation.z += b * 0.04; r.armR.rotation.z -= b * 0.04; } },
    walk: { label: '걷기 (쿵쿵)', duration: 1.4, apply(r, u) { const w = u * TAU; r.legL.rotation.x += Math.sin(w) * 0.4; r.legR.rotation.x -= Math.sin(w) * 0.4; r.torso.rotation.z += Math.sin(w) * 0.06; r.armL.rotation.x -= Math.sin(w) * 0.25; r.armR.rotation.x += Math.sin(w) * 0.25; r.body.position.y -= Math.abs(Math.sin(w)) * 0.03; } },
    attack: {
      label: '공격 (양손 내려찍기)', duration: 1.2, loop: false,
      apply(r, u) {
        const up = keys(u, [[0, 0], [0.45, 1], [0.55, -0.15], [0.75, -0.15], [1, 0]]);
        r.armL.rotation.x -= up * 2.6;
        r.armR.rotation.x -= up * 2.6;
        r.torso.rotation.x -= up * 0.2 - keys(u, [[0, 0], [0.5, 0], [0.56, 0.35], [0.8, 0.35], [1, 0]]);
        r.body.position.y -= keys(u, [[0, 0], [0.5, 0], [0.56, 0.08], [0.8, 0.08], [1, 0]]);
      },
    },
  },
});

// ---- 시계탑 ---------------------------------------------------------------------------------
const clockMouse = monster({
  name: 'm07_clockmouse', label: '태엽 쥐', role: '⑦ 근접 무리형 (시계탑)', ringColor: '#ffd36a',
  defaults: { seed: 607, furColor: '#b8c0cc', brassColor: '#d8a84a', earColor: '#ffb0c0' },
  schema: { furColor: '몸 색', brassColor: '태엽 색', earColor: '귀 색' },
  build(k, p, body, rig) {
    // Parts: body, head, windKey (spins), tail, wheelL, wheelR
    const fur = k.mat('tin', p.furColor, { metalness: 0.4, roughness: 0.4 });
    const brass = k.mat('brass', p.brassColor, { metalness: 0.5, roughness: 0.35 });
    body.add(k.at(k.scl(k.ball(0.15, fur, 1), 1, 0.85, 1.3), 0, 0.13, 0));
    const head = k.pivot('head', 0, 0.15, 0.17);
    head.add(k.scl(k.cone(0.1, 0.2, fur, 7), 1, 1, 1));
    head.children[0].rotation.x = Z;
    head.add(k.at(k.ball(0.025, k.mat('nose', '#ff7a9a'), 0), 0, 0, 0.11));
    for (const s of [-1, 1]) head.add(k.at(k.rot(k.scl(k.cyl(0.07, 0.07, 0.015, k.mat('ear', p.earColor), 8), 1, 1, 1), Z, 0, 0), s * 0.08, 0.09, -0.05));
    cuteEyes(k, head, { y: 0.04, z: 0.03, spacing: 0.045, size: 0.025 });
    body.add(head);
    const windKey = k.pivot('windKey', 0, 0.28, -0.03);
    windKey.add(k.at(k.cyl(0.012, 0.012, 0.08, brass, 4), 0, 0.03, 0));
    for (const s of [-1, 1]) windKey.add(k.at(k.scl(k.mesh(new k.THREE.TorusGeometry(0.035, 0.012, 3, 8), brass), 1, 1, 0.6), s * 0.04, 0.08, 0));
    body.add(windKey);
    const tail = k.pivot('tail', 0, 0.1, -0.18);
    for (let i = 0; i < 3; i++) tail.add(k.at(k.rot(k.cyl(0.008, 0.01, 0.1, k.mat('tailWire', '#8a8a96'), 3), Z + i * 0.3, 0, 0), 0, 0.02 + i * 0.03, -0.05 - i * 0.08));
    body.add(tail);
    for (const [n, s] of [['L', 1], ['R', -1]]) {
      const w = k.pivot(`wheel${n}`, s * 0.13, 0.04, 0);
      w.add(k.rot(k.cyl(0.04, 0.04, 0.02, brass, 6), 0, 0, Z));
      body.add(w);
      rig[`wheel${n}`] = w;
    }
    Object.assign(rig, { head, windKey, tail });
  },
  anims: {
    idle: { label: '대기 (태엽 째깍)', duration: 1, apply(r, u) { r.windKey.rotation.y += Math.floor(u * 4) / 4 * TAU / 4; r.head.rotation.y += Math.sin(u * TAU) * 0.2; r.tail.rotation.y += Math.sin(u * TAU * 2) * 0.3; } },
    walk: { label: '달리기 (드르륵)', duration: 0.3, apply(r, u) { r.wheelL.rotation.x += u * TAU; r.wheelR.rotation.x += u * TAU; r.windKey.rotation.y += u * TAU; r.body.position.y += Math.abs(Math.sin(u * TAU * 2)) * 0.02; r.tail.rotation.y += Math.sin(u * TAU) * 0.4; } },
    attack: { label: '공격 (뛰어들어 깨물기)', duration: 0.5, loop: false, apply(r, u) { const l = keys(u, [[0, 0], [0.4, 1], [1, 0]]); r.body.position.z += l * 0.3; r.body.position.y += Math.sin(Math.PI * clamp01(u / 0.5)) * 0.1; r.head.rotation.x += keys(u, [[0, 0], [0.35, -0.4], [0.45, 0.3], [1, 0]]); } },
  },
});

const snowGuard = monster({
  name: 'm08_snowguard', label: '눈사람 경비병', role: '⑧ 근접 탱커 (시계탑)', fragY: 0.7, ringColor: '#bff0ff', letter: '#dff6ff',
  defaults: { seed: 608, snowColor: '#f2f8ff', iceColor: '#8ad8ff', helmetColor: '#8a96a8', scarfColor: '#d84a3a' },
  schema: { snowColor: '눈 색', iceColor: '얼음 색', helmetColor: '투구 색', scarfColor: '목도리 색' },
  build(k, p, body, rig) {
    // Parts: body (base ball), torso, head, armL > iceShield, armR > icicle spear
    const snow = k.mat('snow', p.snowColor);
    const ice = k.mat('ice', p.iceColor, { transparent: true, opacity: 0.8, emissive: p.iceColor, emissiveIntensity: 0.4 });
    body.add(k.at(k.ball(0.34, snow, 1, 0.015), 0, 0.3, 0));
    const torso = k.pivot('torso', 0, 0.58, 0);
    torso.add(k.at(k.ball(0.25, snow, 1, 0.012), 0, 0.15, 0));
    for (let i = 0; i < 2; i++) torso.add(k.at(k.ball(0.025, k.mat('coal', '#2a2a32'), 0), 0, 0.08 + i * 0.1, 0.24));
    torso.add(k.at(k.cyl(0.17, 0.2, 0.07, k.mat('scarf', p.scarfColor), 8), 0, 0.35, 0));
    body.add(torso);
    const head = k.pivot('head', 0, 0.48, 0);
    head.add(k.at(k.ball(0.18, snow, 1, 0.01), 0, 0.12, 0));
    head.add(k.at(k.rot(k.cone(0.03, 0.12, k.mat('carrot', '#ff8a2a'), 5), Z, 0, 0), 0, 0.1, 0.22));
    cuteEyes(k, head, { y: 0.16, z: 0.16, spacing: 0.06, size: 0.03 });
    head.add(k.at(k.cyl(0.15, 0.18, 0.16, k.mat('helmet', p.helmetColor, { metalness: 0.5, roughness: 0.4 }), 8), 0, 0.3, 0)); // bucket helmet
    torso.add(head);
    for (const [n, s] of [['L', 1], ['R', -1]]) {
      const arm = k.pivot(`arm${n}`, s * 0.22, 0.2, 0);
      arm.add(k.at(k.rot(k.cyl(0.015, 0.02, 0.3, k.mat('twig', '#6a4a30'), 4), 0, 0, s * 0.3), s * 0.05, -0.12, 0));
      torso.add(arm);
      rig[`arm${n}`] = arm;
    }
    const shield = k.pivot('iceShield', 0.12, -0.26, 0.16);
    shield.add(k.scl(k.mesh(new k.THREE.OctahedronGeometry(0.2, 0), ice), 0.9, 1.1, 0.22));
    rig.armL.add(shield);
    const spear = k.pivot('spear', -0.1, -0.25, 0.05);
    spear.add(k.at(k.cyl(0.015, 0.015, 0.7, k.mat('twig', '#6a4a30'), 4), 0, 0.2, 0));
    spear.add(k.at(k.cone(0.04, 0.2, ice, 4), 0, 0.62, 0));
    rig.armR.add(spear);
    Object.assign(rig, { torso, head, shield, spear });
  },
  anims: {
    idle: { label: '대기 (방패 들고 경계)', duration: 2, apply(r, u) { const b = Math.sin(u * TAU); r.torso.rotation.z += b * 0.04; r.head.rotation.y += b * 0.15; r.armL.rotation.x -= 0.6; } },
    walk: { label: '미끄러지듯 전진', duration: 1, apply(r, u) { const w = u * TAU; r.body.rotation.z += Math.sin(w) * 0.1; r.body.position.y += Math.abs(Math.sin(w)) * 0.03; r.armL.rotation.x -= 0.6; r.torso.rotation.y += Math.sin(w) * 0.08; } },
    attack: {
      label: '공격 (얼음 방패 밀치기)', duration: 0.8, loop: false,
      apply(r, u) {
        const bash = keys(u, [[0, 0], [0.3, -0.3], [0.5, 1], [0.7, 1], [1, 0]]);
        r.armL.rotation.x -= 0.6 + bash * 0.9;
        r.torso.rotation.y += bash * 0.3;
        r.body.position.z += bash * 0.2;
        r.shield.position.z += bash * 0.1;
      },
    },
  },
});

const pendulumBat = monster({
  name: 'm09_pendulumbat', label: '시계추 박쥐', role: '⑨ 비행 돌진형 (시계탑)', hover: 1.3, ringColor: '#ffd36a',
  defaults: { seed: 609, bodyColor: '#5a4a7a', wingColor: '#3a3050', brassColor: '#e8b84a' },
  schema: { bodyColor: '몸 색', wingColor: '날개 색', brassColor: '시계추 색' },
  build(k, p, body, rig) {
    // Parts: body (= core), wingL, wingR, pendulum (swinging brass bob)
    const fur = k.mat('batFur', p.bodyColor);
    body.add(k.ball(0.14, fur, 1));
    for (const s of [-1, 1]) body.add(k.at(k.rot(k.cone(0.04, 0.1, fur, 4), 0, 0, s * -0.3), s * 0.07, 0.15, 0));
    cuteEyes(k, body, { y: 0.03, z: 0.12, spacing: 0.05, size: 0.035 });
    for (const s of [-1, 1]) body.add(k.at(k.rot(k.cone(0.01, 0.03, k.mat('fang', '#ffffff'), 3), Math.PI, 0, 0), s * 0.02, -0.04, 0.13)); // tiny cute fangs
    const wm = k.mat('batWing', p.wingColor);
    for (const [n, s] of [['L', 1], ['R', -1]]) {
      const w = k.pivot(`wing${n}`, s * 0.12, 0.02, 0);
      w.add(k.at(k.scl(k.mesh(new k.THREE.ConeGeometry(0.2, 0.36, 3), wm), 1, 1, 0.12), s * 0.18, -0.04, 0));
      w.children[0].rotation.z = s * Z;
      body.add(w);
      rig[`wing${n}`] = w;
    }
    const pend = k.pivot('pendulum', 0, -0.12, 0);
    const brass = k.mat('bob', p.brassColor, { metalness: 0.5, roughness: 0.35 });
    pend.add(k.at(k.cyl(0.008, 0.008, 0.25, brass, 4), 0, -0.12, 0));
    pend.add(k.at(k.rot(k.cyl(0.07, 0.07, 0.02, brass, 8), Z, 0, 0), 0, -0.27, 0));
    pend.add(k.at(k.rot(k.cyl(0.04, 0.04, 0.022, glowMat(k, 'clockFace', '#fff6d8', 0.8), 8), Z, 0, 0), 0, -0.27, 0.005));
    body.add(pend);
    rig.pend = pend;
  },
  anims: {
    idle: { label: '대기 (똑딱 흔들림)', duration: 1.2, apply(r, u) { const w = u * TAU; r.pend.rotation.z += Math.sin(w) * 0.5; r.body.position.y += Math.sin(w * 2) * 0.04; r.wingL.rotation.z += Math.sin(w * 4) * 0.6; r.wingR.rotation.z -= Math.sin(w * 4) * 0.6; } },
    fly: { label: '날기', duration: 0.6, apply(r, u) { const w = u * TAU; r.pend.rotation.x += Math.sin(w) * 0.3 + 0.3; r.body.rotation.x += 0.2; r.wingL.rotation.z += Math.sin(w * 3) * 0.8; r.wingR.rotation.z -= Math.sin(w * 3) * 0.8; } },
    attack: {
      label: '공격 (급강하 돌진)', duration: 1, loop: false,
      apply(r, u) {
        const dive = keys(u, [[0, 0], [0.2, -0.2], [0.5, 1], [0.7, 1], [1, 0]]);
        r.body.position.y -= dive * 0.8;
        r.body.position.z += dive * 0.6;
        r.body.rotation.x += dive * 0.6;
        r.pend.rotation.x -= dive * 1.2;
        r.wingL.rotation.z -= dive * 0.7;
        r.wingR.rotation.z += dive * 0.7;
      },
    },
  },
});

// ---- 심연 -----------------------------------------------------------------------------------
const shadowEcho = monster({
  name: 'm10_shadowecho', label: '그림자 메아리', role: '⑩ 근접 순간이동 (심연)', ringColor: '#b48aff', letter: '#d8c0ff',
  defaults: { seed: 610, shadowColor: '#2a1a4a', glowColor: '#b48aff', eyeGlow: '#e8d8ff' },
  schema: { shadowColor: '그림자 색', glowColor: '테두리 빛', eyeGlow: '눈 빛' },
  build(k, p, body, rig) {
    // Parts: body (= core), head, armL, armR, wisps (tail).  Special clip: teleport
    const sh = k.mat('shadow', p.shadowColor, { transparent: true, opacity: 0.85, emissive: p.glowColor, emissiveIntensity: 0.25 });
    body.add(k.at(k.scl(k.ball(0.24, sh, 1, 0.01), 1, 1.3, 0.9), 0, 0.42, 0));
    const wisps = k.pivot('wisps', 0, 0.15, 0);
    for (let i = 0; i < 4; i++) { const a = i * 1.6; wisps.add(k.at(k.rot(k.cone(0.07, 0.25, sh, 5), Math.PI, 0, 0), Math.cos(a) * 0.1, 0, Math.sin(a) * 0.1)); }
    body.add(wisps);
    const head = k.pivot('head', 0, 0.72, 0);
    head.add(k.ball(0.17, sh, 1, 0.01));
    for (const s of [-1, 1]) head.add(k.at(k.rot(k.cone(0.05, 0.12, sh, 4), 0, 0, s * -0.4), s * 0.1, 0.15, 0)); // little horn tufts
    for (const s of [-1, 1]) head.add(k.at(k.scl(k.ball(0.035, glowMat(k, 'echoEye', p.eyeGlow, 2.4), 0), 1, 1.4, 0.5), s * 0.06, 0.01, 0.15));
    body.add(head);
    for (const [n, s] of [['L', 1], ['R', -1]]) {
      const arm = k.pivot(`arm${n}`, s * 0.22, 0.52, 0);
      arm.add(k.at(k.rot(k.cone(0.06, 0.32, sh, 5), Math.PI, 0, s * 0.2), s * 0.03, -0.15, 0.02));
      body.add(arm);
      rig[`arm${n}`] = arm;
    }
    Object.assign(rig, { head, wisps });
  },
  anims: {
    idle: { label: '대기 (일렁임)', duration: 1.8, apply(r, u) { const w = u * TAU; r.body.position.y += Math.sin(w) * 0.03; r.wisps.rotation.y += u * TAU; r.head.rotation.z += Math.sin(w) * 0.08; } },
    walk: { label: '미끄러지듯 이동', duration: 1, apply(r, u) { const w = u * TAU; r.body.rotation.x += 0.2; r.wisps.rotation.y += u * TAU * 2; r.wisps.scale.set(1, 1.2 + Math.sin(w * 2) * 0.1, 1); r.armL.rotation.x += 0.5; r.armR.rotation.x += 0.5; } },
    attack: { label: '공격 (그림자 할퀴기)', duration: 0.6, loop: false, apply(r, u) { r.armR.rotation.x += keys(u, [[0, 0], [0.35, -2.2], [0.55, 0.4], [1, 0]]); r.armL.rotation.x += keys(u, [[0, 0], [0.45, -1.8], [0.65, 0.4], [1, 0]]); r.body.position.z += keys(u, [[0, 0], [0.5, 0.15], [1, 0]]); } },
    teleport: {
      label: '순간이동 (그림자로 녹았다가 솟음)', duration: 1, loop: false,
      apply(r, u) {
        const gone = keys(u, [[0, 1], [0.35, 0], [0.6, 0], [1, 1]]);
        r.body.scale.set(1 + (1 - gone) * 0.6, Math.max(0.001, gone), 1 + (1 - gone) * 0.6);
        ringPulse(r.ring, u < 0.5 ? u : u - 0.5);
      },
    },
  },
});

const erasedKnight = monster({
  name: 'm11_erasedknight', label: '지워진 기사', role: '⑪ 근접 탱커, 깜빡임 (심연)', fragY: 0.8, ringColor: '#b48aff', letter: '#d8c0ff',
  defaults: { seed: 611, armorColor: '#9a96b8', voidColor: '#6a4ab8', glowColor: '#d8c0ff' },
  schema: { armorColor: '갑옷 색', voidColor: '빈 곳 색', glowColor: '눈 빛' },
  build(k, p, body, rig) {
    // empty, half-erased suit of armour (nobody inside, eraser crumbs drifting off)
    // Parts: body, torso, head, armL, armR (> blade), legL, legR.  Special clip: flicker
    const armor = k.mat('ghostArmor', p.armorColor, { transparent: true, opacity: 0.85, metalness: 0.4, roughness: 0.4 });
    const vd = glowMat(k, 'void', p.voidColor, 0.8, 0.6);
    for (const [n, s] of [['L', 1], ['R', -1]]) {
      const leg = k.pivot(`leg${n}`, s * 0.12, 0.62, 0);
      leg.add(k.at(k.box(0.15, 0.58, 0.17, armor, 0.004), 0, -0.3, 0));
      body.add(leg);
      rig[`leg${n}`] = leg;
    }
    const torso = k.pivot('torso', 0, 0.62, 0);
    torso.add(k.at(k.box(0.44, 0.5, 0.28, armor, 0.004), 0, 0.28, 0));
    torso.add(k.at(k.box(0.2, 0.18, 0.02, vd, 0), 0.08, 0.22, 0.145)); // erased hole in the chest
    for (let i = 0; i < 4; i++) torso.add(k.at(k.box(0.04, 0.04, 0.04, k.mat('crumb', '#f2e8ff'), 0), 0.15 + i * 0.05, 0.1 + i * 0.07, 0.17)); // eraser crumbs
    body.add(torso);
    const head = k.pivot('head', 0, 0.56, 0);
    head.add(k.at(k.box(0.28, 0.3, 0.28, armor, 0.004), 0, 0.15, 0));
    head.add(k.at(k.box(0.2, 0.04, 0.02, vd, 0), 0, 0.17, 0.145)); // visor slit
    for (const s of [-1, 1]) head.add(k.at(k.box(0.04, 0.03, 0.02, glowMat(k, 'knightEye', p.glowColor, 2.4), 0), s * 0.05, 0.17, 0.15));
    head.add(k.at(k.box(0.04, 0.12, 0.2, k.mat('crest', '#7a6ab8'), 0), 0, 0.36, 0));
    torso.add(head);
    for (const [n, s] of [['L', 1], ['R', -1]]) {
      const arm = k.pivot(`arm${n}`, s * 0.29, 0.46, 0);
      arm.add(k.at(k.box(0.13, 0.5, 0.14, armor, 0.004), 0, -0.25, 0));
      torso.add(arm);
      rig[`arm${n}`] = arm;
    }
    const blade = k.pivot('blade', 0, -0.5, 0.04);
    blade.rotation.x = Z;
    blade.add(k.at(k.box(0.07, 0.75, 0.02, glowMat(k, 'voidBlade', p.glowColor, 1.2, 0.7), 0), 0, 0.42, 0));
    blade.add(k.at(k.box(0.2, 0.04, 0.05, armor, 0), 0, 0.04, 0));
    rig.armR.add(blade);
    rig.armR.rotation.x = -0.3;
    Object.assign(rig, { torso, head, blade });
  },
  anims: {
    idle: { label: '대기 (흐릿하게 떠 있음)', duration: 2, apply(r, u) { const b = Math.sin(u * TAU); r.body.position.y += b * 0.02; r.head.rotation.y += Math.sin(u * TAU * 0.5) * 0.15; } },
    walk: { label: '걷기 (덜컥덜컥)', duration: 1, apply(r, u) { const w = u * TAU; r.legL.rotation.x += Math.sin(w) * 0.45; r.legR.rotation.x -= Math.sin(w) * 0.45; r.armL.rotation.x -= Math.sin(w) * 0.3; r.torso.rotation.z += Math.sin(w) * 0.05; } },
    attack: { label: '공격 (공허의 검 베기)', duration: 0.8, loop: false, apply(r, u) { r.armR.rotation.x += keys(u, [[0, 0], [0.35, -2.4], [0.55, -0.2], [1, 0]]); r.torso.rotation.y += keys(u, [[0, 0], [0.35, 0.4], [0.55, -0.4], [1, 0]]); } },
    flicker: {
      label: '깜빡임 (부분적으로 지워졌다 돌아옴)', duration: 1.2, loop: false,
      apply(r, u) {
        const on = (t) => (Math.sin(u * TAU * 6 + t) > 0.2 ? 1 : 0.001);
        r.head.scale.setScalar(on(0));
        r.armL.scale.setScalar(on(2));
        r.legR.scale.setScalar(on(4));
        r.body.position.x += Math.sin(u * TAU * 9) * 0.03;
      },
    },
  },
});

export const EYE_BEAM = { start: 0.35, end: 0.8 }; // fraction of `attack` while the beam hurts
const oblivionEye = monster({
  name: 'm12_oblivioneye', label: '망각의 눈', role: '⑫ 원거리 레이저·소환 (심연)', hover: 1.4, ringColor: '#b48aff', letter: '#d8c0ff', release: EYE_BEAM,
  defaults: { seed: 612, eyeColor: '#f2eaff', irisColor: '#8a4aff', rockColor: '#4a3a6a', beamColor: '#d8a0ff' },
  schema: { eyeColor: '눈 흰자 색', irisColor: '눈동자 색', rockColor: '돌 색', beamColor: '광선 색' },
  build(k, p, body, rig) {
    // Parts: body (= core), lid (blinks), iris, rocks (orbit), beam (laser, +Z).  Special clip: summon
    body.add(k.ball(0.24, k.mat('eyeball', p.eyeColor), 2));
    const iris = k.pivot('iris', 0, 0, 0.2);
    iris.add(k.scl(k.ball(0.1, glowMat(k, 'iris', p.irisColor, 1.2), 1), 1, 1, 0.4));
    iris.add(k.at(k.scl(k.ball(0.05, k.mat('pupil', '#1a1030'), 0), 1, 1, 0.4), 0, 0, 0.035));
    iris.add(k.at(k.box(0.03, 0.03, 0.01, k.mat('shine', '#ffffff', { emissive: '#ffffff', emissiveIntensity: 0.6 }), 0), 0.03, 0.03, 0.05));
    body.add(iris);
    const lid = k.pivot('lid');
    lid.add(k.at(k.scl(k.dome(0.255, k.mat('eyelid', p.rockColor), 10), 1, 1, 1), 0, 0, 0));
    lid.rotation.x = -0.45; // upper lid covers the top of the eye (sleepy look)
    for (let i = 0; i < 5; i++) lid.add(k.at(k.rot(k.cone(0.012, 0.08, k.mat('lash', '#2a1a3a'), 3), 0.4, 0, (i - 2) * 0.3), (i - 2) * 0.08, 0.22, 0.12)); // lashes
    body.add(lid);
    const rocks = k.pivot('rocks');
    for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU; rocks.add(k.at(k.ball(0.06, k.mat('rock', p.rockColor), 0, 0.01), Math.cos(a) * 0.4, Math.sin(a * 2) * 0.08, Math.sin(a) * 0.4)); }
    body.add(rocks);
    const beam = k.pivot('beam', 0, 0, 0.24);
    beam.add(k.at(k.rot(k.cyl(0.05, 0.08, 4, glowMat(k, 'beam', p.beamColor, 2, 0.55), 6), Z, 0, 0), 0, 0, 2));
    beam.add(k.at(k.rot(k.cyl(0.02, 0.03, 4, glowMat(k, 'beamCore', '#ffffff', 2.6), 5), Z, 0, 0), 0, 0, 2));
    beam.scale.setScalar(0.001);
    body.add(beam);
    const portal = k.pivot('summonCircle', 0, -1.38, 0.8); // on the floor in front: a small minion appears here
    portal.add(k.rot(k.mesh(new k.THREE.TorusGeometry(0.3, 0.025, 3, 16), glowMat(k, 'summonGlow', p.beamColor, 2)), Z, 0, 0));
    portal.scale.setScalar(0.001);
    body.add(portal);
    Object.assign(rig, { iris, lid, rocks, beam, portal });
  },
  anims: {
    idle: { label: '대기 (두리번, 돌이 돎)', duration: 3, apply(r, u) { const w = u * TAU; r.rocks.rotation.y += w; r.iris.position.x += Math.sin(w) * 0.05; r.body.position.y += Math.sin(w * 2) * 0.04; r.lid.rotation.x += u > 0.6 && u < 0.66 ? 1.1 : 0; } },
    fly: { label: '날기', duration: 1.5, apply(r, u) { r.rocks.rotation.y += u * TAU * 2; r.body.rotation.x += 0.15; r.body.position.y += Math.sin(u * TAU * 2) * 0.04; } },
    attack: {
      label: '공격 (망각 광선)', duration: 1.4, loop: false,
      apply(r, u) {
        const open = keys(u, [[0, 0], [0.3, 1], [0.85, 1], [1, 0]]);
        r.lid.rotation.x -= open * 0.6;
        r.iris.scale.setScalar(1 + open * 0.3);
        const on = u > EYE_BEAM.start && u < EYE_BEAM.end;
        r.beam.scale.set(on ? 1 + Math.sin(u * TAU * 8) * 0.15 : 0.001, on ? 1 + Math.sin(u * TAU * 8) * 0.15 : 0.001, on ? 1 : 0.001);
        r.rocks.rotation.y += u * TAU * 2;
      },
    },
    summon: {
      label: '소환 (바닥에 마법진, 작은 그림자 소환)', duration: 1.4, loop: false,
      apply(r, u) {
        r.lid.rotation.x += 1.1 * win(u, 0.1, 0.8, 0.1); // eyes closed while summoning
        r.portal.scale.setScalar(Math.max(0.001, win(u, 0.15, 0.95, 0.15) * 1.2));
        r.portal.rotation.y += u * TAU;
        r.rocks.rotation.y += u * TAU * 3;
        r.body.position.y += win(u, 0.1, 0.9, 0.2) * 0.15;
      },
    },
  },
});

// ---- projectile: the grimoire's paper page ----------------------------------------------
const PAGE_ANIMS = {
  charge: { label: '모이기', duration: 0.3, loop: false, apply(r, u) { r.page.scale.setScalar(Math.max(0.001, smooth(u))); } },
  fly: { label: '날아가기 (빙글빙글)', duration: 0.4, apply(r, u) { r.page.rotation.y += u * TAU * 2; r.page.rotation.z += Math.sin(u * TAU) * 0.3; } },
  impact: { label: '맞으면 흩날림', duration: 0.5, loop: false, apply(r, u) { r.page.scale.setScalar(Math.max(0.001, 1 - u)); r.page.rotation.x += u * 4; r.page.position.y += u * 0.3; } },
};
const grimoirePage = {
  label: '마법서 페이지 (투사체)', role: '⑤ 투사체', file: 'monsters/m05_grimoire_page.glb',
  defaults: { seed: 615, size: 1 }, schema: sizeSchema,
  build(p) {
    const k = eduKit(p.seed, 0);
    const root = k.pivot('root');
    root.name = 'm05_grimoire_page';
    const page = k.pivot('page', 0, 1.0, 0);
    page.scale.setScalar(p.size);
    page.add(k.rot(k.box(0.2, 0.26, 0.006, k.mat('page', '#f6eed8'), 0), 0.3, 0, 0));
    for (let i = 0; i < 4; i++) page.add(k.at(k.rot(k.box(0.14, 0.012, 0.008, k.mat('lines', '#7a6ab8'), 0), 0.3, 0, 0), 0, 0.08 - i * 0.05, 0.004));
    page.add(k.at(k.mesh(new k.THREE.OctahedronGeometry(0.03, 0), glowMat(k, 'pageRune', '#d8a0ff', 2)), 0, 0, 0.02));
    root.add(page);
    return finalizeMonster(root, { rig: { page }, params: p, animations: PAGE_ANIMS, clips: { charge: 'charge', fly: 'fly', impact: 'impact' } });
  },
};

export const EDU_MONSTERS_2 = { bookworm, grimoire, inkGolem, clockMouse, snowGuard, pendulumBat, shadowEcho, erasedKnight, oblivionEye, grimoirePage };
