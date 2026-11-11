// Neighborhood Pathways: 7 monsters in the same rotten style as the zombies.
import { createKit } from '../../core/kit.js';
import { finalizeMonster, TAU, keys, blink, smooth, clamp01 } from '../../core/monster.js';
import { buildBiped, BIPED_ANIMS } from '../../rigs/biped.js';
import { buildQuadruped, QUAD_ANIMS } from '../../rigs/quadruped.js';
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

// ---- ① 기본형: 마네킹 ------------------------------------------------------------
export const mannequin = {
  label: '마네킹',
  role: '① 기본형',
  defaults: {
    ...ZOMBIE, seed: 71, clips: zclips({ move: 'lurch' }), bulk: 0.85, hunch: 0.1, armReach: 0.7, headTilt: 0.4,
    jawOpen: 0.3, rot: 0.15, wounds: 0, hair: 0, tornClothes: true, skinColor: '#d9cfc2', shirtColor: '#6a7f9a',
    pantsColor: '#3a3a44', eyeColor: '#ff3a2a', eyeGlow: 2.5, bloodColor: '#2a2224',
  },
  schema: zombieSchema,
  build(p) {
    return createZombie({ ...p, name: 'Mannequin' }, ({ rig, box, mat, at, mesh, THREE, b, L }) => {
      const crack = mat('crack', '#2a2224');
      const joint = mat('joint', '#9a9088');
      // ball joints at shoulders and elbows, cracks on the face, stand pole
      for (const [n] of sides) {
        rig.arms[n].shoulder.add(mesh(new THREE.IcosahedronGeometry(0.075 * b, 1), joint));
        rig.arms[n].elbow.add(mesh(new THREE.IcosahedronGeometry(0.06 * b, 1), joint));
      }
      rig.head.add(at(box(0.012, 0.14, 0.01, crack, 0).rotateZ(0.4), 0.06, 0.2, 0.14));
      rig.head.add(at(box(0.012, 0.08, 0.01, crack, 0).rotateZ(-0.6), 0.03, 0.1, 0.14));
      rig.head.add(at(box(0.08, 0.06, 0.02, crack, 0), -0.08, 0.27, 0.12)); // chipped hole
      rig.spine.add(at(box(0.1, 0.012, 0.01, crack, 0).rotateZ(0.3), 0.05, 0.3, 0.135 * b));
      rig.hips.add(at(mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 6), mat('pole', '#5a5a62', { metalness: 0.5 })), 0, -0.2, -0.12));
      // a price tag hanging from the wrist
      rig.arms.L.elbow.add(at(box(0.05, 0.07, 0.005, mat('tag', '#f0e8d8'), 0), 0.05, -0.3 * L, 0));
    });
  },
};

// ---- ② 돌격형: 들개 -------------------------------------------------------------
export const strayDog = {
  label: '광견 들개',
  role: '② 돌격형',
  defaults: { seed: 73, size: 1, furColor: '#5a4636', bellyColor: '#8a7058', collarColor: '#c0392b' },
  schema: { ...common, furColor: { label: '털 색' }, bellyColor: { label: '배 색' }, collarColor: { label: '목줄 색' } },
  build(p) {
    const k = createKit(p.seed, 1.6, p.horror, { eyeColor: '#ff3a2a' });
    const fur = k.mat('fur', p.furColor);
    const { root, rig } = buildQuadruped(k, {
      name: 'StrayDog', len: 0.62, width: 0.3, height: 0.28, legLen: 0.3, headSize: 0.28, snout: 0.17, ears: 'round',
      furMat: fur, bellyMat: k.mat('belly', p.bellyColor), pawMat: fur, noseMat: k.mat('nose', '#141010'), eyeSize: 0.05, tail: 'thin',
    });
    // mangy fur spikes along the back
    for (let i = 0; i < 9; i++) rig.body.add(k.at(k.rot(k.cone(0.03, 0.1, fur, 4), k.rand(-0.4, 0.4), 0, k.rand(-0.4, 0.4)), k.rand(-0.08, 0.08), 0.16, 0.25 - i * 0.06));
    // studded collar with a tag
    const collar = k.mat('collar', p.collarColor);
    rig.neck.add(k.at(k.box(0.2, 0.05, 0.18, collar, 0.004), 0, 0.03, 0.01));
    rig.neck.add(k.at(k.cyl(0.025, 0.025, 0.008, k.mat('tag', '#c9b45a', { metalness: 0.6 }), 8).rotateX(Math.PI / 2), 0, -0.02, 0.11));
    // drool
    rig.jaw.add(k.at(k.box(0.012, 0.08, 0.012, k.mat('drool', '#cfe8e0', { transparent: true, opacity: 0.6, keepColor: true }), 0), 0.03, -0.05, 0.14));
    k.smile(rig.head, { y: -0.11, z: 0.31, width: 0.12 });
    k.decay(root);
    root.scale.setScalar(p.size);
    return finalizeMonster(root, {
      rig, params: p, animations: QUAD_ANIMS,
      clips: { idle: 'idle', move: 'gallop', attack: 'pounce', hit: 'hit', death: 'death', special: 'howl' },
    });
  },
};

// ---- ③ 탱커: 쓰레기통 골렘 -------------------------------------------------------
const CAN_ANIMS = {
  ...BIPED_ANIMS,
  // lid flaps open and shut while it walks
  canWalk: {
    label: '쿵쿵 걷기 (뚜껑 덜컹)',
    duration: 1.0,
    apply(rig, u, p) {
      BIPED_ANIMS.waddle.apply(rig, u, p);
      rig.head.rotation.x -= Math.abs(Math.sin(u * TAU * 2)) * 0.35;
    },
  },
  lidSlam: {
    label: '뚜껑 열고 덮치기',
    duration: 1.6,
    apply(rig, u, p) {
      BIPED_ANIMS.pound.apply(rig, u, p);
      rig.head.rotation.x -= keys(u, [[0, 0], [0.25, 1.4], [0.55, 1.4], [0.62, 0], [1, 0]]);
    },
  },
};

export const trashGolem = {
  label: '쓰레기통 골렘',
  role: '③ 탱커',
  defaults: { seed: 75, size: 1.25, canColor: '#5f6b5a', trashColor: '#8a7a50', bootColor: '#2e2a26' },
  schema: { ...common, canColor: { label: '통 색' }, trashColor: { label: '쓰레기 색' }, bootColor: { label: '발 색' } },
  build(p) {
    const k = createKit(p.seed, 0.8, p.horror, { eyeColor: '#ffd23a' });
    const can = k.mat('can', p.canColor, { metalness: 0.4, roughness: 0.55 });
    const { root, rig } = buildBiped(k, {
      name: 'TrashGolem', bodyR: 0.42, bodyScale: [1, 1.1, 1], bodyMat: can, bodyShape: 'can', headR: 0.3, headShape: 'none',
      legLen: 0.24, legR: 0.1, footMat: k.mat('boots', p.bootColor), armLen: 0.4, armR: 0.07,
      armMat: k.mat('pipe', '#7a828a', { metalness: 0.5 }), handMat: k.mat('glove', '#c9a23a'),
    });
    const d = rig.dims;
    // ribs on the can, dents
    const rib = k.mat('canRib', '#4a5446', { metalness: 0.4 });
    for (let i = 0; i < 3; i++) rig.body.add(k.at(k.cyl(0.41, 0.41, 0.03, rib, 10), 0, d.cy - 0.3 + i * 0.3, 0));
    // dark opening with eyes peeking out under the lid
    rig.head.position.set(0, d.cy + 0.46, -0.38); // hinge at the back rim
    rig.body.add(k.at(k.cyl(0.38, 0.38, 0.02, k.mat('mouthDark', '#120a0a', { keepColor: true }), 10), 0, d.cy + 0.465, 0));
    rig.eyes = k.eyes(rig.body, { y: d.cy + 0.36, z: 0.36, spacing: 0.13, size: 0.07 });
    k.smile(rig.body, { y: d.cy + 0.17, z: 0.4, width: 0.3, segs: 7 });
    // lid on the head pivot (opens by rotating back)
    rig.head.add(k.at(k.cyl(0.44, 0.44, 0.04, can, 10, 0.006), 0, 0.02, 0.38));
    rig.head.add(k.at(k.box(0.14, 0.04, 0.04, rib, 0), 0, 0.07, 0.38));
    // trash spilling out
    const trash = k.mat('trash', p.trashColor);
    const peel = k.mat('peel', '#d8c24a');
    for (let i = 0; i < 5; i++) rig.body.add(k.at(k.rot(k.box(k.rand(0.06, 0.12), 0.04, k.rand(0.06, 0.12), trash, 0.01), k.rand(0, 1), k.rand(0, 3), 0), k.rand(-0.25, 0.25), d.cy + 0.46, k.rand(-0.25, 0.2)));
    rig.body.add(k.at(k.rot(k.scl(k.cone(0.04, 0.16, peel, 4), 1, 1, 0.4), 0, 0, 2.2), 0.36, d.cy + 0.42, 0.1));
    k.decay(root, 0.7);
    root.scale.setScalar(p.size);
    return finalizeMonster(root, {
      rig, params: p, animations: CAN_ANIMS,
      clips: { idle: 'idle', move: 'canWalk', attack: 'lidSlam', hit: 'hit', death: 'flop' },
    });
  },
};

// ---- ④ 변칙형: 그림자 고양이 ------------------------------------------------------
const CAT_ANIMS = {
  ...QUAD_ANIMS,
  hiss: {
    label: '등 세우고 하악',
    duration: 1.6,
    apply(rig, u) {
      const arch = keys(u, [[0, 0], [0.2, 1], [0.8, 1], [1, 0]]);
      rig.body.position.y += arch * 0.08;
      rig.body.scale.y = 1 + arch * 0.25;
      for (const n of ['FL', 'FR', 'BL', 'BR']) rig.legs[n].leg.rotation.z += (n[1] === 'L' ? 1 : -1) * arch * 0.15;
      rig.tail.rotation.x += arch * 0.8;
      rig.tail2.rotation.x -= arch * 0.4;
      rig.head.rotation.x += arch * 0.2;
      rig.jaw.rotation.x += arch * (0.55 + Math.sin(u * TAU * 10) * 0.05);
      for (const e of ['L', 'R']) rig.ears[e].rotation.x -= arch * 0.9;
    },
  },
};

export const shadowCat = {
  label: '그림자 고양이',
  role: '④ 변칙형',
  defaults: { seed: 77, size: 1, furColor: '#1e1b24', glow: 0.6 },
  schema: { ...common, furColor: { label: '털 색' }, glow: { label: '그림자 빛', min: 0, max: 2, step: 0.05 } },
  build(p) {
    const k = createKit(p.seed, 0.8, p.horror, { eyeColor: '#c8ff3a' });
    const fur = k.mat('fur', p.furColor, { emissive: '#3a1a5a', emissiveIntensity: p.glow * 0.4, transparent: true, opacity: 0.88 });
    const { root, rig } = buildQuadruped(k, {
      name: 'ShadowCat', len: 0.52, width: 0.24, height: 0.24, legLen: 0.3, legR: 0.035, headSize: 0.22, snout: 0.06,
      furMat: fur, bellyMat: fur, pawMat: fur, noseMat: k.mat('nose', '#5a2a4a'), earInnerMat: k.mat('earInner', '#3a1a3a'),
      eyeSize: 0.05, tail: 'thin',
    });
    for (const [n] of sides) rig.ears[n].scale.set(1.1, 1.4, 1.1);
    rig.tail2.add(k.at(k.rot(k.cyl(0.02, 0.025, 0.3, fur, 5), Math.PI / 2 - 0.6, 0, 0), 0, 0.12, -0.15)); // long curling tail
    for (const [, s] of sides) for (let i = 0; i < 3; i++) rig.head.add(k.at(k.rot(k.box(0.12, 0.005, 0.005, k.mat('whisker', '#8a8a9a'), 0), 0, 0, s * (i - 1) * 0.2), s * 0.15, -0.06 + i * 0.015, 0.14));
    k.smile(rig.head, { y: -0.08, z: 0.16, width: 0.1 });
    // shadow trail puddle under it
    root.add(k.scl(k.cyl(0.4, 0.4, 0.005, k.mat('shadowPool', '#0a0810', { roughness: 1 }), 12), 1, 1, 1.4));
    k.decay(root, 0.4);
    root.scale.setScalar(p.size);
    return finalizeMonster(root, {
      rig, params: p, animations: CAT_ANIMS,
      clips: { idle: 'idle', move: 'gallop', attack: 'pounce', hit: 'hit', death: 'death', special: 'hiss' },
    });
  },
};

// ---- ⑤ 매복형: 하수구 악어 -------------------------------------------------------
const GATOR_ANIMS = {
  ...QUAD_ANIMS,
  crawlWalk: {
    label: '어슬렁 기어가기',
    duration: 1.2,
    apply(rig, u) {
      const w = u * TAU;
      for (const [n, ph] of [['FL', 0], ['BR', 0], ['FR', Math.PI], ['BL', Math.PI]]) {
        rig.legs[n].leg.rotation.x += Math.sin(w + ph) * 0.45;
        rig.legs[n].knee.rotation.x += Math.max(0, Math.cos(w + ph)) * 0.4;
      }
      rig.body.rotation.y += Math.sin(w) * 0.12;
      rig.tail.rotation.y -= Math.sin(w) * 0.35;
      rig.tail2.rotation.y -= Math.sin(w - 0.8) * 0.4;
      rig.head.rotation.y -= Math.sin(w) * 0.1;
    },
  },
  snap: {
    label: '턱 콱 물기',
    duration: 1.1,
    apply(rig, u) {
      const open = keys(u, [[0, 0], [0.3, 1], [0.42, 0], [0.55, 0.6], [0.65, 0], [1, 0]]);
      const lunge = keys(u, [[0, 0], [0.3, -0.3], [0.42, 1], [0.7, 0.6], [1, 0]]);
      rig.jaw.rotation.x += open * 0.9;
      rig.head.rotation.x -= open * 0.25;
      rig.body.position.z += lunge * 0.2;
      rig.tail.rotation.y += Math.sin(u * TAU * 2) * 0.3;
    },
  },
};

export const sewerGator = {
  label: '하수구 악어',
  role: '⑤ 매복형',
  defaults: { seed: 79, size: 1, scaleColor: '#4a5a3a', bellyColor: '#a8a878' },
  schema: { ...common, scaleColor: { label: '비늘 색' }, bellyColor: { label: '배 색' } },
  build(p) {
    const k = createKit(p.seed, 1, p.horror, { eyeColor: '#ffd23a' });
    const scale = k.mat('scales', p.scaleColor);
    const belly = k.mat('belly', p.bellyColor);
    const { root, rig } = buildQuadruped(k, {
      name: 'SewerGator', len: 1.0, width: 0.36, height: 0.2, legLen: 0.13, legR: 0.05, headSize: 0.24, snout: 0.38,
      ears: 'none', tail: 'none', furMat: scale, bellyMat: belly, pawMat: scale, noseMat: k.mat('nose', '#2a3020'), eyeSize: 0.045,
    });
    // legs splay out to the sides like a reptile
    for (const n of ['FL', 'FR', 'BL', 'BR']) rig.legs[n].leg.rotation.z = (n[1] === 'L' ? 1 : -1) * 0.6;
    // ridges on the back, teeth along the snout, long tail
    for (let i = 0; i < 8; i++) rig.body.add(k.at(k.rot(k.scl(k.cone(0.05, 0.08, scale, 3), 1, 1, 0.5), 0, 0, 0), (i % 2 ? 1 : -1) * 0.08, 0.12, 0.4 - i * 0.11));
    const tooth = k.mat('fang', '#e8dcc0', { keepColor: true });
    for (let i = 0; i < 6; i++) for (const [, s] of sides) rig.head.add(k.at(k.rot(k.cone(0.012, 0.04, tooth, 3), Math.PI, 0, 0), s * 0.11, -0.09, 0.18 + i * 0.055));
    rig.tail.position.set(0, 0, -0.5);
    rig.tail.rotation.x = 0.1;
    rig.tail.add(k.at(k.rot(k.cyl(0.08, 0.13, 0.4, scale, 6, 0.01), Math.PI / 2, 0, 0), 0, 0, -0.2));
    rig.tail2.position.set(0, 0, -0.4);
    rig.tail2.add(k.at(k.rot(k.cone(0.08, 0.45, scale, 6, 0.01), -Math.PI / 2, 0, 0), 0, 0, -0.22));
    // eyes bulging on top of the head
    rig.eyes.forEach((e, i) => e.position.set((i ? -1 : 1) * 0.08, 0.14, 0.05));
    // open manhole next to it
    root.add(k.at(k.cyl(0.42, 0.42, 0.02, k.mat('manholeHole', '#0c0d0e'), 12), 0, 0.01, 0.1));
    root.add(k.at(k.rot(k.cyl(0.45, 0.45, 0.04, k.mat('manhole', '#4a4e52', { metalness: 0.5 }), 12), 0, 0, 0.15), 0.75, 0.05, 0.3));
    k.decay(root, 0.6);
    root.scale.setScalar(p.size);
    return finalizeMonster(root, {
      rig, params: p, animations: GATOR_ANIMS,
      clips: { idle: 'idle', move: 'crawlWalk', attack: 'snap', hit: 'hit', death: 'death', special: 'emerge' },
    });
  },
};

// ---- ⑥ 자폭/원거리: 풍선 괴물 ----------------------------------------------------
const SHREDS = 7;
const BALLOON_ANIMS = {
  idle: {
    label: '대기 (흔들흔들)',
    duration: 2.6,
    apply(rig, u) {
      const w = u * TAU;
      rig.balloon.position.y += Math.sin(w) * 0.06;
      rig.balloon.rotation.z += Math.sin(w) * 0.1;
      rig.string.rotation.z -= Math.sin(w - 0.6) * 0.15;
      blinkEyes(rig, blink(u, [0.45]));
    },
  },
  drift: {
    label: '둥실 다가오기',
    duration: 1.6,
    apply(rig, u) {
      const w = u * TAU;
      rig.balloon.rotation.x += 0.25;
      rig.balloon.position.y += Math.sin(w * 2) * 0.05;
      rig.string.rotation.x -= 0.4 + Math.sin(w) * 0.1;
    },
  },
  pop: {
    label: '부풀다 펑!',
    duration: 1.5,
    loop: false,
    apply(rig, u) {
      const grow = keys(u, [[0, 0], [0.5, 1]]);
      const popped = u > 0.52;
      rig.balloon.scale.setScalar(popped ? 0.001 : 1 + grow * 0.5 + Math.sin(u * TAU * 30) * 0.02 * grow);
      const f = clamp01((u - 0.52) / 0.48);
      rig.shreds.forEach((s, i) => {
        const a = (i / SHREDS) * TAU;
        s.position.set(Math.cos(a) * (0.1 + f * 1.1), 1.2 + Math.sin(f * Math.PI) * 0.3 - f * 1.1, Math.sin(a) * (0.1 + f * 1.1));
        s.rotation.set(f * 6 + i, f * 4, 0);
        s.scale.setScalar(popped ? 1 : 0.001);
      });
      rig.string.position.y -= f * 0.6;
    },
  },
  hit: {
    label: '피격',
    duration: 0.6,
    loop: false,
    apply(rig, u) {
      const h = keys(u, [[0, 0], [0.12, 1], [1, 0]]);
      rig.balloon.scale.set(1 + h * 0.2, 1 - h * 0.2, 1 + h * 0.2);
      rig.balloon.position.z -= h * 0.2;
      blinkEyes(rig, h * 0.85);
    },
  },
  deflate: {
    label: '피융~ 바람 빠짐',
    duration: 1.8,
    loop: false,
    apply(rig, u) {
      const f = smooth(u);
      const zig = (1 - f) * 0.6;
      rig.balloon.scale.setScalar(Math.max(0.25, 1 - f * 0.75));
      rig.balloon.position.set(Math.sin(u * TAU * 3) * zig, -f * 1.05, Math.cos(u * TAU * 3) * zig);
      rig.balloon.rotation.set(u * 9, u * 7, 0);
      rig.string.position.y -= f * 0.9;
      blinkEyes(rig, f * 0.9);
    },
  },
};

export const balloonMonster = {
  label: '풍선 괴물',
  role: '⑥ 자폭/원거리',
  defaults: { seed: 81, size: 1, balloonColor: '#c0392b', stringColor: '#e8e0d0' },
  schema: { ...common, balloonColor: { label: '풍선 색' }, stringColor: { label: '끈 색' } },
  build(p) {
    const k = createKit(p.seed, 0.4, p.horror, { eyeColor: '#fff23a' });
    const skinMat = k.mat('balloonSkin', p.balloonColor, { roughness: 0.25 });
    const root = k.pivot('root');
    root.name = 'BalloonMonster';
    const balloon = k.pivot('balloon', 0, 1.25, 0);
    root.add(balloon);
    balloon.add(k.scl(k.ball(0.3, skinMat, 2, 0.008), 1, 1.15, 1));
    balloon.add(k.at(k.cone(0.05, 0.07, skinMat, 6), 0, -0.36, 0)); // knot
    const eyes = k.eyes(balloon, { y: 0.08, z: 0.27, spacing: 0.1, size: 0.06 });
    k.smile(balloon, { y: -0.1, z: 0.29, width: 0.22, segs: 7 });
    // patches of tape
    for (let i = 0; i < 3; i++) balloon.add(k.at(k.rot(k.box(0.1, 0.03, 0.01, k.mat('tape', '#c9c0a8'), 0), 0, k.rand(-1, 1), k.rand(-1, 1)), k.rand(-0.2, 0.2), k.rand(-0.1, 0.2), 0.26));
    // string hanging down, swings from the knot
    const string = k.pivot('string', 0, 0.86, 0);
    const sm = k.mat('string', p.stringColor);
    for (let i = 0; i < 5; i++) string.add(k.at(k.rot(k.cyl(0.006, 0.006, 0.18, sm, 4), 0, 0, Math.sin(i) * 0.25), Math.sin(i * 1.3) * 0.03, -0.09 - i * 0.16, 0));
    root.add(string);
    const shreds = [];
    for (let i = 0; i < SHREDS; i++) {
      const s = k.pivot(`shred${i}`, 0, 1.25, 0);
      s.add(k.scl(k.box(0.12, 0.08, 0.01, skinMat, 0.01), 1, 1, 1));
      s.scale.setScalar(0.001);
      root.add(s);
      shreds.push(s);
    }
    root.add(k.cyl(0.2, 0.2, 0.005, k.mat('shadow', '#141414', { roughness: 1 }), 12));
    k.decay(root, 0.3);
    root.scale.setScalar(p.size);
    return finalizeMonster(root, {
      rig: { balloon, string, shreds, eyes }, params: p, animations: BALLOON_ANIMS,
      clips: { idle: 'idle', move: 'drift', attack: 'pop', hit: 'hit', death: 'deflate' },
    });
  },
};

// ---- ⑦ 지휘형: 확성기 로봇 -------------------------------------------------------
export const megaphoneBot = {
  label: '확성기 로봇',
  role: '⑦ 지휘형',
  defaults: {
    ...ZOMBIE, seed: 83, clips: zclips({ move: 'lurch', attack: 'smash', special: 'scream' }), height: 1.05, bulk: 1.0,
    hunch: 0.15, armReach: 0.3, armLength: 1.1, headTilt: 0.2, jawOpen: 0.2, rot: 0.2, wounds: 3, hair: 0, tornClothes: false,
    skinColor: '#9aa2aa', shirtColor: '#d8a83a', pantsColor: '#3a3f48', eyeColor: '#7dfff0', eyeGlow: 3,
    bloodColor: '#1a1a1a', hornColor: '#e8e0d0',
  },
  schema: { ...zombieSchema, hornColor: { label: '확성기 색' }, bloodColor: { label: '기름 얼룩 색' } },
  build(p) {
    return createZombie({ ...p, name: 'MegaphoneBot' }, ({ rig, box, mat, at, mesh, THREE, b }) => {
      const metal = mat('metal', '#6a727a', { metalness: 0.5, roughness: 0.45 });
      const horn = mat('horn', p.hornColor);
      // megaphone sticking out of the mouth
      const cone = mesh(new THREE.CylinderGeometry(0.15, 0.05, 0.28, 10, 1, true), horn, 0.004);
      cone.material.side = THREE.DoubleSide;
      cone.rotation.x = Math.PI / 2;
      rig.jaw.add(at(cone, 0, 0.01, 0.26));
      rig.jaw.add(at(mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.06, 8), metal), 0, 0.01, 0.12).rotateX(Math.PI / 2));
      // loudspeakers on the shoulders, antenna, reflective safety vest stripes
      for (const [n] of sides) {
        const spk = mesh(new THREE.CylinderGeometry(0.09, 0.06, 0.1, 8), metal, 0.004);
        rig.arms[n].shoulder.add(at(spk, 0, 0.08, 0));
        rig.arms[n].shoulder.add(at(mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.01, 8), mat('grille', '#1a1c20')), 0, 0.135, 0));
      }
      rig.head.add(at(mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.25, 4), metal), -0.08, 0.42, 0));
      rig.head.add(at(box(0.04, 0.04, 0.04, mat('antennaLight', '#ff3a2a', { emissive: '#ff3a2a', emissiveIntensity: 3 }), 0), -0.08, 0.55, 0));
      const reflect = mat('reflect', '#e8f0f0', { emissive: '#a8b8b8', emissiveIntensity: 0.4 });
      rig.spine.add(at(box(0.46 * b, 0.04, 0.27 * b, reflect, 0), 0, 0.4, 0));
      rig.spine.add(at(box(0.46 * b, 0.04, 0.27 * b, reflect, 0), 0, 0.25, 0));
    });
  },
};
