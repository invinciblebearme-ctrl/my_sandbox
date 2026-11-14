// 등불 마을 NPCs and the quiz mascot 부엉이 루미 (Lumi the owl).
// NPC parts: torso, head, armL, armR, legL, legR, prop (item in the right hand).
// NPC clips: idle, talk (when the shop / dialogue opens), wave (greeting).
// Lumi parts: body, head, browL/R, lidL/R, pupilL/R, beak, wingL/R, cap (graduation cap).
// Lumi clips: idle, fly, and the six quiz expressions face_default, face_think, face_happy,
// face_sad, face_surprised, face_cheer (each loops while held).
import { finalizeMonster, TAU, keys, clamp01, smooth, win } from '../core/monster.js';
import { eduKit, glowMat, blobShadow, sizeSchema, colorSchema, cuteEyes, cuteCheeks } from './common.js';

const Z = Math.PI / 2;
const HIP = 0.62;

const NPC_ANIMS = {
  idle: {
    label: '대기 (숨쉬기, 두리번)', duration: 3,
    apply(r, u) { const b = Math.sin(u * TAU); r.torso.position.y += b * 0.01; r.head.rotation.y += Math.sin(u * TAU * 0.5) * 0.25; r.head.rotation.x -= b * 0.03; r.armL.rotation.z += b * 0.03; },
  },
  talk: {
    label: '말하기 (손짓)', duration: 1.6,
    apply(r, u) { const w = u * TAU; r.head.rotation.x += Math.sin(w * 3) * 0.06; r.head.rotation.z += Math.sin(w) * 0.06; r.armL.rotation.x -= 0.6 + Math.sin(w * 2) * 0.25; r.armL.rotation.z -= 0.2; r.torso.rotation.y += Math.sin(w) * 0.06; },
  },
  wave: {
    label: '인사 (손 흔들기)', duration: 1.4, loop: false,
    apply(r, u) { const up = keys(u, [[0, 0], [0.2, 1], [0.85, 1], [1, 0]]); r.armL.rotation.z += up * 2.4; r.armL.rotation.x += Math.sin(u * TAU * 3) * 0.3 * up; r.head.rotation.z -= up * 0.12; r.torso.rotation.z -= up * 0.04; },
  },
};

// opts: hat ('cap' | 'bandana' | 'beret' | 'hood' | 'none'), apron, beard, glasses, prop(k, group)
function villager(name, label, defaults, opts) {
  return {
    label, role: '🏘️ NPC', file: `characters/${name}.glb`,
    defaults: { seed: 900, size: 1, ...defaults },
    schema: { ...sizeSchema, ...colorSchema({ shirtColor: '옷 색', apronColor: '앞치마·조끼 색', hatColor: '모자 색', skinColor: '피부 색', hairColor: '머리·수염 색', pantsColor: '바지 색' }) },
    build(p) {
      const k = eduKit(p.seed, 0.3);
      const shirt = k.mat('shirt', p.shirtColor);
      const apron = k.mat('apron', p.apronColor);
      const hatM = k.mat('hat', p.hatColor);
      const skin = k.mat('skin', p.skinColor);
      const hair = k.mat('hair', p.hairColor);
      const pants = k.mat('pants', p.pantsColor);
      const shoe = k.mat('shoes', '#4a3020');
      const root = k.pivot('root');
      root.name = name;
      root.scale.setScalar(p.size * (opts.height ?? 1));
      blobShadow(k, root, 0.3);
      const legs = {};
      for (const [n, s] of [['L', 1], ['R', -1]]) {
        const leg = k.pivot(`leg${n}`, s * 0.1, HIP, 0);
        leg.add(k.at(k.box(0.15, 0.5, 0.16, pants, 0.004), 0, -0.27, 0));
        leg.add(k.at(k.box(0.16, 0.1, 0.24, shoe, 0.004), 0, -0.57, 0.04));
        root.add(leg);
        legs[n] = leg;
      }
      const torso = k.pivot('torso', 0, HIP, 0);
      root.add(torso);
      const wide = opts.wide ?? 1;
      torso.add(k.at(k.box(0.4 * wide, 0.5, 0.28 * wide, shirt, 0.004), 0, 0.25, 0));
      torso.add(k.at(k.box(0.42 * wide, 0.06, 0.3 * wide, k.mat('belt', '#5a3a22'), 0), 0, 0.05, 0));
      if (opts.apron) torso.add(k.at(k.box(0.32, 0.6, 0.03, apron, 0.003), 0, 0.12, 0.15 * wide));
      if (opts.vest) for (const s of [-1, 1]) torso.add(k.at(k.box(0.14, 0.48, 0.3 * wide, apron, 0.003), s * 0.14 * wide, 0.26, 0.005));
      const head = k.pivot('head', 0, 0.5, 0);
      torso.add(head);
      head.add(k.at(k.box(0.3, 0.28, 0.28, skin, 0.004), 0, 0.16, 0.01));
      head.add(k.at(k.box(0.32, 0.12, 0.3, hair, 0.006), 0, 0.26, -0.02));
      head.add(k.at(k.box(0.32, 0.18, 0.08, hair, 0.006), 0, 0.15, -0.13));
      cuteEyes(k, head, { y: 0.17, z: 0.16, spacing: 0.07, size: 0.033 });
      cuteCheeks(k, head, { y: 0.1, z: 0.155, spacing: 0.1, size: 0.028 });
      if (opts.beard) {
        head.add(k.at(k.box(0.26, 0.14, 0.06, hair, 0.006), 0, 0.03, 0.15));
        head.add(k.at(k.rot(k.cone(0.1, 0.18, hair, 5), Math.PI, 0, 0), 0, -0.07, 0.15));
        head.add(k.at(k.box(0.14, 0.03, 0.04, hair, 0), 0, 0.09, 0.17)); // moustache
      } else k.smile(head, { y: 0.08, z: 0.16, width: 0.07, thick: 0.015, segs: 4 });
      if (opts.glasses) { const g = k.mat('glasses', '#3a3a4a'); for (const s of [-1, 1]) head.add(k.at(k.mesh(new k.THREE.TorusGeometry(0.045, 0.008, 3, 8), g), s * 0.07, 0.17, 0.165)); }
      if (opts.hat === 'cap') { head.add(k.at(k.scl(k.dome(0.18, hatM, 8), 1, 0.7, 1), 0, 0.3, 0)); head.add(k.at(k.box(0.22, 0.02, 0.14, hatM, 0), 0, 0.31, 0.18)); }
      if (opts.hat === 'bandana') { head.add(k.at(k.box(0.33, 0.07, 0.31, hatM, 0.004), 0, 0.3, 0)); head.add(k.at(k.rot(k.box(0.05, 0.14, 0.03, hatM, 0), 0.3, 0, 0.3), 0.05, 0.2, -0.17)); }
      if (opts.hat === 'beret') head.add(k.at(k.rot(k.scl(k.ball(0.19, hatM, 1), 1.1, 0.35, 1.1), 0, 0, 0.2), -0.03, 0.34, 0));
      if (opts.hat === 'top') { head.add(k.at(k.cyl(0.24, 0.24, 0.02, hatM, 10), 0, 0.31, 0)); head.add(k.at(k.cyl(0.14, 0.15, 0.24, hatM, 10), 0, 0.44, 0)); head.add(k.at(k.cyl(0.152, 0.152, 0.04, k.mat('hatBand', '#f2c14e'), 10), 0, 0.35, 0)); }
      const arms = {};
      for (const [n, s] of [['L', 1], ['R', -1]]) {
        const arm = k.pivot(`arm${n}`, s * (0.25 * wide), 0.44, 0);
        arm.add(k.at(k.box(0.11, 0.42, 0.12, shirt, 0.004), 0, -0.2, 0));
        arm.add(k.at(k.box(0.1, 0.1, 0.11, skin, 0.004), 0, -0.46, 0.01));
        torso.add(arm);
        arms[n] = arm;
      }
      arms.R.rotation.x = -0.4;
      const prop = k.pivot('prop', 0, -0.48, 0.04);
      opts.prop?.(k, prop, p);
      arms.R.add(prop);
      return finalizeMonster(root, {
        rig: { torso, head, armL: arms.L, armR: arms.R, legL: legs.L, legR: legs.R, prop },
        params: p, animations: NPC_ANIMS, clips: { idle: 'idle', talk: 'talk', wave: 'wave' },
      });
    },
  };
}

const metal = (k) => k.mat('propMetal', '#9aa3ad', { metalness: 0.6, roughness: 0.35 });
const wood = (k) => k.mat('propWood', '#8a5a32');
export const EDU_NPCS = {
  npcMerchant: villager('npc_merchant', '상인 (상점)', { shirtColor: '#e8a03a', apronColor: '#f2eada', hatColor: '#3a6ab8', skinColor: '#ffd2b0', hairColor: '#5a3a22', pantsColor: '#5a4a3a' }, {
    hat: 'beret', apron: true, wide: 1.1,
    prop: (k, g) => { g.add(k.at(k.scl(k.ball(0.08, k.mat('coinBag', '#a0703a'), 1), 1, 0.9, 1), 0, -0.04, 0)); g.add(k.at(k.cyl(0.03, 0.04, 0.04, k.mat('coinBag', '#a0703a'), 5), 0, 0.05, 0)); },
  }),
  npcBlacksmith: villager('npc_blacksmith', '대장장이', { shirtColor: '#c8503a', apronColor: '#5a3a22', hatColor: '#3a3a3a', skinColor: '#e8b090', hairColor: '#3a2418', pantsColor: '#3a3a44' }, {
    hat: 'bandana', apron: true, beard: true, wide: 1.25,
    prop: (k, g) => { g.rotation.x = Math.PI / 2 - 0.4; g.add(k.at(k.cyl(0.02, 0.02, 0.35, wood(k), 5), 0, 0.1, 0)); g.add(k.at(k.box(0.16, 0.08, 0.08, metal(k), 0.004), 0, 0.28, 0)); },
  }),
  npcStorekeeper: villager('npc_storekeeper', '창고지기', { shirtColor: '#5a8a5a', apronColor: '#8a6a4a', hatColor: '#8a6a4a', skinColor: '#ffd8b8', hairColor: '#c8a070', pantsColor: '#4a4a5a' }, {
    hat: 'cap', vest: true,
    prop: (k, g) => { const gold = k.mat('keyRing', '#f2c14e', { metalness: 0.4 }); g.add(k.mesh(new k.THREE.TorusGeometry(0.05, 0.01, 3, 10), gold)); for (let i = 0; i < 3; i++) g.add(k.at(k.rot(k.box(0.015, 0.09, 0.012, gold, 0), 0, 0, (i - 1) * 0.4), (i - 1) * 0.03, -0.08, 0)); },
  }),
  npcArchivist: villager('npc_archivist', '기록관 (오답노트·학습 리포트)', { shirtColor: '#5a4ab8', apronColor: '#2a2a5a', hatColor: '#2a2a5a', skinColor: '#ffe0c8', hairColor: '#8a8a96', pantsColor: '#2a2a44' }, {
    hat: 'none', glasses: true, vest: true,
    prop: (k, g) => { g.rotation.x = -0.6; g.add(k.box(0.2, 0.26, 0.05, k.mat('ledger', '#7a3a2a'), 0)); g.add(k.at(k.box(0.18, 0.24, 0.052, k.mat('ledgerPages', '#f6eed8'), 0), 0.012, 0, 0)); },
  }),
  npcChief: villager('npc_chief', '마을 촌장 (퀘스트)', { shirtColor: '#8a3a5a', apronColor: '#f2c14e', hatColor: '#3a2a3a', skinColor: '#f2c8a8', hairColor: '#f2f0ea', pantsColor: '#3a2a3a' }, {
    hat: 'top', beard: true, height: 0.95,
    prop: (k, g) => { g.add(k.at(k.cyl(0.02, 0.025, 1.0, wood(k), 5), 0, -0.1, 0)); g.add(k.at(k.box(0.06, 0.1, 0.06, glowMat(k, 'caneLantern', '#ffd34a', 2), 0), 0, 0.45, 0)); g.add(k.at(k.cone(0.05, 0.05, metal(k), 4), 0, 0.53, 0)); },
  }),
};

// ---- 부엉이 루미 ----------------------------------------------------------------------------
// expression helpers (additive on top of the rest pose)
const brows = (r, lift, tilt) => { r.browL.position.y += lift; r.browR.position.y += lift; r.browL.rotation.z += tilt; r.browR.rotation.z -= tilt; };
const lids = (r, cover) => { const s = Math.max(0.05, cover); r.lidL.scale.y = s; r.lidR.scale.y = s; }; // 0 = wide open, 1 = shut
const blinkAt = (u) => (Math.abs(u - 0.7) < 0.03 ? 0.9 : 0);
const FACES = {
  face_default: { label: '표정: 기본', duration: 2.4, apply(r, u) { lids(r, 0.25 + blinkAt(u)); r.body.rotation.z += Math.sin(u * TAU) * 0.04; } },
  face_think: {
    label: '표정: 생각 중 (갸웃, 날개로 턱)', duration: 2.4,
    apply(r, u) { r.head.rotation.z += 0.3; brows(r, 0.02, -0.2); r.browR.position.y += 0.03; lids(r, 0.35); r.pupilL.position.x += 0.02; r.pupilR.position.x += 0.02; r.pupilL.position.y += 0.02; r.pupilR.position.y += 0.02; r.wingR.rotation.z -= 1.6; r.wingR.rotation.x -= 0.6; r.head.rotation.x += Math.sin(u * TAU) * 0.04; },
  },
  face_happy: {
    label: '표정: 기쁨 (정답!)', duration: 1.2,
    apply(r, u) { brows(r, 0.03, 0.1); lids(r, 0.6); r.beak.rotation.x += 0.4; r.body.position.y += Math.abs(Math.sin(u * TAU)) * 0.08; r.wingL.rotation.z += 0.8 + Math.sin(u * TAU * 2) * 0.3; r.wingR.rotation.z -= 0.8 + Math.sin(u * TAU * 2) * 0.3; },
  },
  face_sad: {
    label: '표정: 아쉬움 (오답)', duration: 2.4,
    apply(r, u) { brows(r, 0.01, -0.45); lids(r, 0.45); r.head.rotation.x += 0.2; r.body.rotation.x += 0.1; r.wingL.rotation.z -= 0.15; r.wingR.rotation.z += 0.15; r.pupilL.position.y -= 0.02; r.pupilR.position.y -= 0.02; r.body.position.y += Math.sin(u * TAU) * 0.01; },
  },
  face_surprised: {
    label: '표정: 놀람 (퍼펙트·콤보)', duration: 1.2,
    apply(r, u) { brows(r, 0.06, 0.15); lids(r, 0); r.eyeL.scale.setScalar(1.15); r.eyeR.scale.setScalar(1.15); r.beak.rotation.x += 0.6; r.wingL.rotation.z += 1.2; r.wingR.rotation.z -= 1.2; r.body.position.y += win(u, 0, 0.4, 0.1) * 0.1; r.cap.position.y += win(u, 0, 0.5, 0.1) * 0.06; },
  },
  face_cheer: {
    label: '표정: 응원 (화이팅)', duration: 1,
    apply(r, u) { brows(r, 0.02, 0.25); lids(r, 0.3); r.beak.rotation.x += 0.3; r.wingR.rotation.z -= 2.2 + Math.sin(u * TAU * 2) * 0.25; r.wingL.rotation.z += 0.3; r.body.rotation.y += Math.sin(u * TAU) * 0.15; r.body.position.y += Math.abs(Math.sin(u * TAU * 2)) * 0.04; },
  },
};
const OWL_ANIMS = {
  idle: { label: '대기 (꾸벅, 두리번)', duration: 3, apply(r, u) { const w = u * TAU; lids(r, 0.25 + blinkAt(u)); r.head.rotation.y += Math.sin(w) * 0.35; r.body.position.y += Math.sin(w * 2) * 0.01; } },
  fly: { label: '날기 (화면으로 날아옴)', duration: 0.6, apply(r, u) { const w = u * TAU; lids(r, 0.2); r.wingL.rotation.z += 0.6 + Math.sin(w * 2) * 0.9; r.wingR.rotation.z -= 0.6 + Math.sin(w * 2) * 0.9; r.body.position.y += 0.2 + Math.sin(w * 2) * 0.05; r.feet.scale.y = 0.5; } },
  ...FACES,
};
export const lumi = {
  label: '부엉이 루미 (퀴즈 마스코트)', role: '🦉 마스코트', file: 'characters/mascot_lumi.glb',
  defaults: { seed: 950, size: 1, featherColor: '#a07a5a', bellyColor: '#f2e2c8', eyeRingColor: '#fff6e0', capColor: '#2a2a4a', tasselColor: '#f2c14e' },
  schema: { ...sizeSchema, ...colorSchema({ featherColor: '깃털 색', bellyColor: '배 색', eyeRingColor: '눈 둘레 색', capColor: '학사모 색', tasselColor: '술 색' }) },
  build(p) {
    const k = eduKit(p.seed, 0.25);
    const fea = k.mat('feather', p.featherColor);
    const belly = k.mat('belly', p.bellyColor);
    const ring = k.mat('eyeRing', p.eyeRingColor);
    const root = k.pivot('root');
    root.name = 'mascot_lumi';
    root.scale.setScalar(p.size);
    blobShadow(k, root, 0.2);
    const body = k.pivot('body');
    root.add(body);
    body.add(k.at(k.scl(k.ball(0.2, fea, 2), 1, 1.05, 0.95), 0, 0.22, 0));
    body.add(k.at(k.scl(k.ball(0.15, belly, 1), 1, 1.05, 0.5), 0, 0.19, 0.1));
    for (let i = 0; i < 3; i++) body.add(k.at(k.scl(k.cone(0.025, 0.04, k.mat('bellyMark', '#c8a888'), 3), 1, 1, 0.4), (i - 1) * 0.05, 0.2 - (i % 2) * 0.04, 0.17));
    const feet = k.pivot('feet', 0, 0.02, 0.05);
    for (const s of [-1, 1]) feet.add(k.at(k.box(0.06, 0.03, 0.06, k.mat('feet', '#f2a03a'), 0), s * 0.06, 0, 0));
    body.add(feet);
    const head = k.pivot('head', 0, 0.38, 0);
    body.add(head);
    head.add(k.scl(k.ball(0.19, fea, 2), 1.1, 0.95, 1));
    for (const s of [-1, 1]) head.add(k.at(k.rot(k.cone(0.05, 0.12, fea, 4), 0, 0, s * -0.4), s * 0.13, 0.17, -0.02)); // ear tufts
    const eyes = {};
    for (const [n, s] of [['L', 1], ['R', -1]]) {
      const e = k.pivot(`eye${n}`, s * 0.085, 0.02, 0.14);
      e.add(k.scl(k.cyl(0.085, 0.085, 0.03, ring, 10), 1, 1, 1));
      e.children[0].rotation.x = Z;
      e.add(k.at(k.scl(k.ball(0.06, k.mat('eyeWhite', '#ffffff'), 1), 1, 1, 0.5), 0, 0, 0.02));
      const pupil = k.pivot(`pupil${n}`, 0, 0, 0.045);
      pupil.add(k.scl(k.ball(0.038, k.mat('pupil', '#1d1b26'), 1), 1, 1, 0.5));
      pupil.add(k.at(k.box(0.015, 0.015, 0.01, k.mat('shine', '#ffffff', { emissive: '#ffffff', emissiveIntensity: 0.6 }), 0), 0.012, 0.014, 0.02));
      e.add(pupil);
      const lid = k.pivot(`lid${n}`, 0, 0.07, 0.04); // upper lid, scaled down in Y to open
      lid.add(k.at(k.box(0.14, 0.08, 0.02, fea, 0), 0, -0.04, 0));
      lid.scale.y = 0.25;
      e.add(lid);
      const brow = k.pivot(`brow${n}`, s * 0.085, 0.11, 0.17);
      brow.add(k.box(0.09, 0.022, 0.03, k.mat('brow', '#5a3a22'), 0));
      brow.rotation.z = s * 0.15;
      head.add(brow);
      head.add(e);
      eyes[n] = { e, pupil, lid, brow };
    }
    const beak = k.pivot('beak', 0, -0.05, 0.18);
    beak.add(k.at(k.rot(k.cone(0.03, 0.07, k.mat('beak', '#f2a03a'), 4), Math.PI + 0.3, 0, 0), 0, -0.02, 0.01));
    head.add(beak);
    cuteCheeks(k, head, { y: -0.04, z: 0.15, spacing: 0.13, size: 0.025 });
    // graduation cap with a tassel (knowledge mascot)
    const cap = k.pivot('cap', 0, 0.17, 0);
    cap.add(k.at(k.cyl(0.11, 0.12, 0.06, k.mat('capBase', p.capColor), 8), 0, 0, 0));
    cap.add(k.at(k.rot(k.box(0.3, 0.02, 0.3, k.mat('capBoard', p.capColor), 0), 0, Math.PI / 4, 0), 0, 0.04, 0));
    cap.add(k.at(k.cyl(0.004, 0.004, 0.12, k.mat('tassel', p.tasselColor), 3), 0.12, -0.01, 0.05));
    cap.add(k.at(k.box(0.025, 0.04, 0.025, k.mat('tassel', p.tasselColor), 0), 0.12, -0.08, 0.05));
    cap.rotation.z = -0.12;
    head.add(cap);
    const wings = {};
    for (const [n, s] of [['L', 1], ['R', -1]]) {
      const w = k.pivot(`wing${n}`, s * 0.18, 0.3, -0.01);
      w.add(k.at(k.scl(k.ball(0.1, fea, 1), 0.45, 1.2, 0.9), s * 0.02, -0.08, 0));
      w.add(k.at(k.scl(k.ball(0.06, k.mat('wingTip', '#7a5a3a'), 0), 0.4, 1, 0.8), s * 0.03, -0.18, 0));
      body.add(w);
      wings[n] = w;
    }
    return finalizeMonster(root, {
      rig: {
        body, head, feet, beak, cap, wingL: wings.L, wingR: wings.R,
        eyeL: eyes.L.e, eyeR: eyes.R.e, pupilL: eyes.L.pupil, pupilR: eyes.R.pupil, lidL: eyes.L.lid, lidR: eyes.R.lid, browL: eyes.L.brow, browR: eyes.R.brow,
      },
      params: p, animations: OWL_ANIMS, clips: Object.fromEntries(Object.keys(OWL_ANIMS).map((c) => [c, c])),
    });
  },
};
