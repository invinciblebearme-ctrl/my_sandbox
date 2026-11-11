// Frontier Town (desert): 7 monsters in the same rotten style as the zombies.
import { createKit } from '../../core/kit.js';
import { finalizeMonster, TAU, keys, blink, smooth, clamp01 } from '../../core/monster.js';
import { buildBiped, BIPED_ANIMS } from '../../rigs/biped.js';
import { buildQuadruped, QUAD_ANIMS } from '../../rigs/quadruped.js';
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
  bulk: { label: '덩치', min: 0.6, max: 1.6, step: 0.01 },
  hunch: { label: '구부정함', min: 0, max: 0.8, step: 0.01 },
  rot: { label: '울퉁불퉁함', min: 0, max: 1.5, step: 0.01 },
  wounds: { label: '상처 수', min: 0, max: 14, step: 1 },
  skinColor: { label: '피부(뼈) 색' }, shirtColor: { label: '옷 색' }, pantsColor: { label: '바지 색' },
  eyeColor: { label: '눈 색' },
};
const zclips = (over) => ({ idle: 'idle', move: 'shamble', attack: 'shoot', hit: 'hit', death: 'death', ...over });

// Cowboy hat on a zombie head.
function cowboyHat({ rig, mesh, mat, at, THREE }, color, scale = 1) {
  const felt = mat('hat', color);
  const brim = mesh(new THREE.CylinderGeometry(0.26 * scale, 0.27 * scale, 0.025, 10), felt, 0.008);
  brim.rotation.set(-0.1, 0, 0.08);
  rig.head.add(at(brim, 0, 0.31, 0));
  rig.head.add(at(mesh(new THREE.CylinderGeometry(0.13 * scale, 0.15 * scale, 0.17 * scale, 8), felt, 0.008), 0, 0.39, -0.01));
  rig.head.add(at(mesh(new THREE.CylinderGeometry(0.152 * scale, 0.152 * scale, 0.03, 8), mat('hatBand', '#3a2416')), 0, 0.33, -0.01));
}
// Revolver in the right hand, with a muzzle-flash node for the shoot animation.
function revolver({ rig, box, mat, at, pivot, mesh, THREE, L }) {
  const metal = mat('gunMetal', '#4a4d52', { metalness: 0.5, roughness: 0.4 });
  // the barrel follows the forearm (local -Y), so it points ahead when the arm is raised
  const hand = rig.arms.R.elbow;
  const y = -0.3 * L - 0.05;
  hand.add(at(box(0.04, 0.05, 0.09, mat('grip', '#5a3a22'), 0), 0, y, 0.03));
  hand.add(at(box(0.05, 0.08, 0.05, metal, 0), 0, y - 0.06, 0));
  hand.add(at(box(0.025, 0.16, 0.025, metal, 0), 0, y - 0.14, 0));
  const muzzle = pivot('muzzle', 0, y - 0.23, 0);
  const flash = mesh(new THREE.ConeGeometry(0.05, 0.14, 6), mat('flash', '#ffcf5a', { emissive: '#ffb020', emissiveIntensity: 3 }));
  flash.rotation.x = Math.PI; // point down the barrel
  muzzle.add(at(flash, 0, -0.06, 0));
  muzzle.scale.setScalar(0.001);
  hand.add(muzzle);
  rig.muzzle = muzzle;
}

// ---- ① 기본형: 해골 카우보이 ------------------------------------------------------
export const skeletonCowboy = {
  label: '해골 카우보이',
  role: '① 기본형',
  defaults: {
    ...ZOMBIE, seed: 31, clips: zclips(), height: 1, bulk: 0.8, hunch: 0.2, armReach: 0.35, headTilt: 0.2,
    jawOpen: 0.35, rot: 0.8, wounds: 2, hair: 0, tornClothes: true, skinColor: '#e3d8bd', shirtColor: '#7a4a2a',
    pantsColor: '#4a5a78', eyeColor: '#ff8a2a', hatColor: '#6b4a2e', bandanaColor: '#9a2a22',
  },
  schema: { ...zombieSchema, hatColor: { label: '모자 색' }, bandanaColor: { label: '두건 색' } },
  build(p) {
    return createZombie({ ...p, name: 'SkeletonCowboy' }, (z) => {
      const { rig, box, mat, at } = z;
      cowboyHat(z, p.hatColor);
      revolver(z);
      // skull details: nose hole, cheek bones
      rig.head.add(at(box(0.05, 0.05, 0.02, z.dark, 0), 0, 0.14, 0.15));
      for (const s of [-1, 1]) rig.head.add(at(box(0.05, 0.03, 0.03, z.bone, 0), s * 0.09, 0.13, 0.13));
      // bandana + belt with holster
      const band = mat('bandana', p.bandanaColor);
      rig.neck.add(at(box(0.18, 0.05, 0.16, band, 0.006), 0, 0.02, 0.02));
      rig.spine.add(at(box(0.4 * z.b, 0.05, 0.25 * z.b, mat('belt', '#3a2416'), 0.004), 0, 0.1, 0));
      rig.spine.add(at(box(0.07, 0.14, 0.05, mat('holster', '#5a3a22'), 0.004), -0.21 * z.b, 0.02, 0.05));
    });
  },
};

// ---- ② 돌격형: 좀비 코요테 --------------------------------------------------------
export const zombieCoyote = {
  label: '좀비 코요테',
  role: '② 돌격형',
  defaults: { seed: 33, size: 1, furColor: '#a5835a', bellyColor: '#d9c39a' },
  schema: { ...common, furColor: { label: '털 색' }, bellyColor: { label: '배 색' } },
  build(p) {
    const k = createKit(p.seed, 1.4, p.horror, { eyeColor: '#ffb02a' });
    const fur = k.mat('fur', p.furColor);
    const { root, rig } = buildQuadruped(k, {
      name: 'ZombieCoyote', len: 0.64, width: 0.27, height: 0.25, legLen: 0.32, legR: 0.045, headSize: 0.25, snout: 0.2,
      furMat: fur, bellyMat: k.mat('belly', p.bellyColor), pawMat: fur, noseMat: k.mat('nose', '#1f1a1a'),
      earInnerMat: k.mat('earInner', '#7a4a3a'), eyeSize: 0.05, tail: 'thin',
    });
    // exposed ribs on one flank
    const bone = k.mat('bone', '#d9d2b6', { keepColor: true });
    for (let i = 0; i < 4; i++) rig.body.add(k.at(k.box(0.012, 0.16, 0.025, bone, 0), 0.14, -0.02, 0.12 - i * 0.07));
    rig.body.add(k.at(k.box(0.01, 0.17, 0.3, k.mat('mouthDark', '#1a0b0b', { keepColor: true }), 0), 0.132, -0.02, 0.02));
    k.smile(rig.head, { y: -0.12, z: 0.33, width: 0.1 });
    k.decay(root);
    root.scale.setScalar(p.size);
    return finalizeMonster(root, {
      rig, params: p, animations: QUAD_ANIMS,
      clips: { idle: 'idle', move: 'gallop', attack: 'pounce', hit: 'hit', death: 'death', special: 'howl' },
    });
  },
};

// ---- ③ 탱커: 선인장 골렘 ---------------------------------------------------------
export const cactusGolem = {
  label: '선인장 골렘',
  role: '③ 탱커',
  defaults: { seed: 35, size: 1.3, cactusColor: '#5d8a48', spineColor: '#e8dfb0', flowerColor: '#a8465a' },
  schema: { ...common, cactusColor: { label: '선인장 색' }, spineColor: { label: '가시 색' }, flowerColor: { label: '꽃 색' } },
  build(p) {
    const k = createKit(p.seed, 1, p.horror, { eyeColor: '#ffe14a' });
    const green = k.mat('cactus', p.cactusColor);
    const dark = k.mat('ridge', '#3f6634');
    const { root, rig, face } = buildBiped(k, {
      name: 'CactusGolem', bodyR: 0.42, bodyScale: [0.95, 1.35, 0.9], bodyMat: green,
      legLen: 0.24, legR: 0.12, armLen: 0.42, armR: 0.1, footMat: k.mat('rock', '#8a7a68'),
    });
    const d = rig.dims;
    // vertical ridges
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      const r = k.rot(k.box(0.04, 0.9, 0.04, dark, 0.01), 0, -a, 0);
      rig.body.add(k.at(r, Math.sin(a) * 0.39, d.cy, Math.cos(a) * 0.37));
    }
    // spines all over (pointing outward)
    const spine = k.mat('spine', p.spineColor);
    for (let i = 0; i < 40; i++) {
      const a = k.rand(0, TAU);
      const y = k.rand(-0.5, 0.5);
      const rr = Math.sqrt(1 - (y / 0.58) ** 2);
      const c = k.cone(0.012, 0.08, spine, 3);
      c.position.set(Math.sin(a) * 0.41 * rr, d.cy + y, Math.cos(a) * 0.39 * rr);
      c.lookAt(c.position.x * 2, d.cy + y * 2, c.position.z * 2);
      c.rotateX(Math.PI / 2);
      rig.body.add(c);
    }
    // cactus arms: branches pointing up from the hanging arms
    for (const [n, s] of sides) {
      rig.arms[n].add(k.at(k.rot(k.cyl(0.07, 0.08, 0.25, green, 6, 0.01), 0, 0, s * 0.6), s * 0.08, -0.2, 0));
      for (let i = 0; i < 5; i++) rig.arms[n].add(k.at(k.rot(k.cone(0.01, 0.06, spine, 3), 0, 0, s * k.rand(1, 2)), s * 0.1, -0.1 - i * 0.07, 0));
    }
    // embedded rocks + withered flower on top
    const rock = k.mat('rock', '#8a7a68');
    for (let i = 0; i < 4; i++) rig.body.add(k.at(k.ball(k.rand(0.06, 0.1), rock, 0, 0.02), k.rand(-0.3, 0.3), d.cy + k.rand(-0.4, 0.2), 0.32));
    const flower = k.mat('flower', p.flowerColor);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU;
      rig.body.add(k.at(k.rot(k.scl(k.ball(0.05, flower, 0), 1, 0.4, 1.6), 0.6, a, 0), Math.sin(a) * 0.05, d.cy + 0.6, Math.cos(a) * 0.05));
    }
    rig.eyes = k.eyes(face.parent, { y: face.cy + 0.22, z: 0.36, spacing: 0.12, size: 0.07 });
    k.smile(face.parent, { y: face.cy + 0.04, z: 0.4, width: 0.24, segs: 6 });
    k.decay(root, 0.6);
    root.scale.setScalar(p.size);
    return finalizeMonster(root, {
      rig, params: p, animations: BIPED_ANIMS,
      clips: { idle: 'idle', move: 'waddle', attack: 'pound', hit: 'hit', death: 'flop' },
    });
  },
};

// ---- ④ 변칙형: 방울뱀 ------------------------------------------------------------
// Serpent animations + a rattle on the ground that shakes.
const withRattle = (anim, amount) => ({
  ...anim,
  apply(rig, u, p) {
    anim.apply(rig, u, p);
    rig.rattle.rotation.z += Math.sin(u * TAU * 24) * 0.25 * amount;
    rig.rattle.rotation.x += Math.sin(u * TAU * 24 + 1) * 0.1 * amount;
  },
});
const SNAKE_ANIMS = {
  idle: withRattle(SERPENT_ANIMS.idle, 0.3),
  swim: withRattle(SERPENT_ANIMS.swim, 0.5),
  strike: withRattle(SERPENT_ANIMS.strike, 1),
  hit: SERPENT_ANIMS.hit,
  death: SERPENT_ANIMS.death,
  rattle: {
    label: '꼬리 흔들며 위협',
    duration: 1.6,
    apply(rig, u) {
      const w = u * TAU;
      const rear = keys(u, [[0, 0], [0.2, 1], [0.8, 1], [1, 0]]);
      rig.chain.forEach((s, i) => { s.rotation.x -= rear * 0.12 * (i < 3 ? 1 : -0.5); s.rotation.z += Math.sin(w * 2 + i) * 0.04; });
      rig.head.rotation.x += rear * 0.3;
      rig.jaw.rotation.x += rear * (0.6 + Math.sin(w * 12) * 0.05);
      rig.rattle.rotation.z += Math.sin(w * 30) * 0.4 * rear;
      rig.rattle.position.y += rear * 0.15;
    },
  },
};

export const rattlesnake = {
  label: '방울뱀',
  role: '④ 변칙형',
  defaults: { seed: 37, size: 1, segments: 7, bodyColor: '#c4a06a', patternColor: '#6e4a2c', rattleColor: '#d8c49a' },
  schema: {
    ...common, segments: { label: '몸 마디', min: 4, max: 10, step: 1 },
    bodyColor: { label: '몸 색' }, patternColor: { label: '무늬 색' }, rattleColor: { label: '방울 색' },
  },
  build(p) {
    const k = createKit(p.seed, 0.8, p.horror, { eyeColor: '#ffd23a' });
    const { root, rig } = buildSerpent(k, {
      name: 'Rattlesnake', segs: p.segments, segLen: 0.16, radius: 0.1, taper: 0.3, headR: 0.15, eyeSize: 0.05,
      headScale: [1.25, 0.7, 1.35], mats: [k.mat('body', p.bodyColor), k.mat('pattern', p.patternColor)],
    });
    const fang = k.mat('fang', '#f0ead8', { keepColor: true });
    for (const [, s] of sides) rig.head.add(k.at(k.rot(k.cone(0.012, 0.06, fang, 4), Math.PI, 0, 0), s * 0.04, 0.05, 0.17));
    const tongue = k.mat('tongue', '#a8203a', { keepColor: true });
    for (const [, s] of sides) rig.jaw.add(k.at(k.rot(k.box(0.008, 0.008, 0.09, tongue, 0), 0, s * 0.25, 0), s * 0.012, 0, 0.14));
    rig.jaw.add(k.at(k.box(0.01, 0.01, 0.08, tongue, 0), 0, 0, 0.08));
    // burrow hole + rattle poking out of the sand
    root.add(k.at(k.cyl(0.26, 0.3, 0.02, k.mat('hole', '#4a3524'), 10), 0, 0.01, 0));
    const rattle = k.pivot('rattle', 0.3, 0.05, -0.15);
    const rm = k.mat('rattleMat', p.rattleColor);
    for (let i = 0; i < 5; i++) rattle.add(k.at(k.scl(k.ball(0.035 - i * 0.004, rm, 1), 1, 0.7, 1), 0, i * 0.04, 0));
    root.add(rattle);
    rig.rattle = rattle;
    k.decay(root, 0.5);
    root.scale.setScalar(p.size);
    return finalizeMonster(root, {
      rig, params: p, animations: SNAKE_ANIMS,
      clips: { idle: 'idle', move: 'swim', attack: 'strike', hit: 'hit', death: 'death', special: 'rattle' },
    });
  },
};

// ---- ⑤ 매복형: 모래 벌레 ---------------------------------------------------------
export const sandworm = {
  label: '모래 벌레',
  role: '⑤ 매복형',
  defaults: { seed: 39, size: 1.3, segments: 8, bodyColor: '#c48e6a', ringColor: '#9a6648' },
  schema: { ...common, segments: { label: '몸 마디', min: 5, max: 11, step: 1 }, bodyColor: { label: '몸 색' }, ringColor: { label: '고리 색' } },
  build(p) {
    const k = createKit(p.seed, 1.2, p.horror, { eyeColor: '#ff5a2a' });
    const { root, rig } = buildSerpent(k, {
      name: 'Sandworm', segs: p.segments, segLen: 0.17, radius: 0.17, taper: 0.05, headR: 0.2, eyeSize: 0.035,
      headScale: [1, 0.9, 1], mats: [k.mat('body', p.bodyColor), k.mat('ring', p.ringColor)],
    });
    // round mouth full of teeth on the front of the head
    const h = rig.head;
    h.add(k.at(k.rot(k.cyl(0.13, 0.13, 0.04, k.mat('mouthDark', '#1a0608', { keepColor: true }), 10), Math.PI / 2, 0, 0), 0, 0.15, 0.18));
    const tooth = k.mat('fang', '#e8dcc0', { keepColor: true });
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU;
      const t = k.cone(0.018, 0.07, tooth, 4);
      t.position.set(Math.cos(a) * 0.11, 0.15 + Math.sin(a) * 0.11, 0.2);
      t.rotation.set(0, 0, a + Math.PI / 2); // point toward the middle
      h.add(t);
    }
    // eyes in a small cluster above the mouth
    rig.eyes.forEach((e, i) => e.position.set((i ? -1 : 1) * 0.06, 0.32, 0.12));
    // sand mound
    root.add(k.scl(k.ball(0.55, k.mat('sand', '#d9b27a', { roughness: 1 }), 1, 0.04), 1.1, 0.18, 1.1));
    k.decay(root, 0.6);
    root.scale.setScalar(p.size);
    return finalizeMonster(root, {
      rig, params: p, animations: SERPENT_ANIMS,
      clips: { idle: 'idle', move: 'swim', attack: 'strike', hit: 'hit', death: 'death', special: 'emerge' },
    });
  },
};

// ---- ⑥ 자폭/원거리: 회전초 괴물 ---------------------------------------------------
const THORNS = 8;
const WEED_ANIMS = {
  idle: {
    label: '대기 (바스락)',
    duration: 2.4,
    apply(rig, u) {
      const w = u * TAU;
      rig.body.rotation.y += Math.sin(w) * 0.2;
      rig.body.position.y += Math.abs(Math.sin(w)) * 0.03;
      rig.core.position.y += Math.abs(Math.sin(w)) * 0.03;
      blinkEyes(rig, blink(u, [0.4]));
    },
  },
  roll: {
    label: '데굴데굴 굴러가기',
    duration: 0.9,
    apply(rig, u) {
      const bounce = Math.abs(Math.sin(u * TAU));
      rig.body.rotation.x += u * TAU; // full turn per loop
      rig.body.position.y += bounce * 0.12;
      rig.core.position.y += bounce * 0.12;
      rig.core.rotation.x += Math.sin(u * TAU) * 0.15;
    },
  },
  thornBurst: {
    label: '가시 발사',
    duration: 1.5,
    apply(rig, u) {
      const puff = keys(u, [[0, 0], [0.35, 1], [0.45, -0.3], [0.7, 0], [1, 0]]);
      rig.body.scale.setScalar(1 + puff * 0.25);
      rig.body.rotation.y += puff * 0.5;
      const f = clamp01((u - 0.42) / 0.5);
      rig.thorns.forEach((t, i) => {
        const a = (i / THORNS) * Math.PI - Math.PI / 2; // fan out forward
        t.position.set(Math.sin(a) * f * 1.4, 0.35 + Math.sin(f * Math.PI) * 0.3 - f * 0.2, 0.2 + Math.cos(a) * f * 1.6);
        t.rotation.set(0, a, 0);
        t.scale.setScalar(f > 0 && f < 1 ? 1 : 0.001);
      });
      blinkEyes(rig, puff > 0.8 ? 0.6 : 0);
    },
  },
  hit: {
    label: '피격',
    duration: 0.6,
    loop: false,
    apply(rig, u) {
      const h = keys(u, [[0, 0], [0.12, 1], [1, 0]]);
      rig.body.rotation.z += Math.sin(u * TAU * 5) * 0.25 * h;
      rig.body.position.z -= h * 0.1;
      rig.core.position.z -= h * 0.1;
      blinkEyes(rig, h * 0.85);
    },
  },
  scatter: {
    label: '흩어져 버림',
    duration: 1.4,
    loop: false,
    apply(rig, u) {
      const f = keys(u, [[0, 0], [0.2, -0.1], [0.8, 1], [1, 1]]);
      rig.body.scale.set(1 + f * 0.6, Math.max(0.05, 1 - f * 0.8), 1 + f * 0.6);
      rig.body.position.y -= f * 0.25;
      rig.core.scale.setScalar(Math.max(0.001, 1 - f));
      rig.core.position.y -= f * 0.2;
    },
  },
};

export const tumbleweed = {
  label: '회전초 괴물',
  role: '⑥ 자폭/원거리',
  defaults: { seed: 41, size: 1, twigs: 45, twigColor: '#9a7a4a', thornColor: '#e8d8a8' },
  schema: { ...common, twigs: { label: '잔가지 수', min: 20, max: 80, step: 1 }, twigColor: { label: '가지 색' }, thornColor: { label: '가시 색' } },
  build(p) {
    const k = createKit(p.seed, 0.5, p.horror, { eyeColor: '#ff4a2a' });
    const twig = k.mat('twig', p.twigColor);
    const root = k.pivot('root');
    root.name = 'Tumbleweed';
    const body = k.pivot('body', 0, 0.36, 0);
    root.add(body);
    for (let i = 0; i < p.twigs; i++) {
      const c = k.cyl(0.008, 0.012, k.rand(0.3, 0.6), twig, 4);
      c.position.set(k.rand(-0.18, 0.18), k.rand(-0.18, 0.18), k.rand(-0.18, 0.18));
      c.rotation.set(k.rand(0, Math.PI), k.rand(0, Math.PI), k.rand(0, Math.PI));
      body.add(c);
    }
    // dark core with eyes and mouth, stays upright while the twigs roll
    const core = k.pivot('core', 0, 0.36, 0);
    core.add(k.ball(0.17, k.mat('core', '#2a1e14'), 1));
    const eyes = k.eyes(core, { y: 0.04, z: 0.15, spacing: 0.07, size: 0.05 });
    k.smile(core, { y: -0.06, z: 0.16, width: 0.11 });
    root.add(core);
    const thornMat = k.mat('thorn', p.thornColor);
    const thorns = [];
    for (let i = 0; i < THORNS; i++) {
      const t = k.pivot(`thorn${i}`, 0, 0.36, 0);
      t.add(k.rot(k.cone(0.02, 0.12, thornMat, 4), Math.PI / 2, 0, 0));
      t.scale.setScalar(0.001);
      root.add(t);
      thorns.push(t);
    }
    root.scale.setScalar(p.size);
    return finalizeMonster(root, {
      rig: { body, core, thorns, eyes }, params: p, animations: WEED_ANIMS,
      clips: { idle: 'idle', move: 'roll', attack: 'thornBurst', hit: 'hit', death: 'scatter' },
    });
  },
};

// ---- ⑦ 지휘형: 유령 보안관 -------------------------------------------------------
export const ghostSheriff = {
  label: '유령 보안관',
  role: '⑦ 지휘형',
  defaults: {
    ...ZOMBIE, seed: 43, ghost: 1, legs: 'ghost',
    clips: zclips({ idle: 'hoverIdle', move: 'hover', death: 'vanish', special: 'scream' }),
    height: 1.05, bulk: 0.95, hunch: 0.1, armReach: 0.2, headTilt: 0.1, jawOpen: 0.4, rot: 0.6, wounds: 0,
    hair: 0.2, tornClothes: true, skinColor: '#a9d8cf', shirtColor: '#5a6f78', pantsColor: '#4a5a60',
    eyeColor: '#9dfff0', eyeGlow: 3, hatColor: '#3d4a52',
  },
  schema: {
    ...zombieSchema, ghost: { label: '유령 빛', min: 0, max: 1, step: 0.01 }, hatColor: { label: '모자 색' },
  },
  build(p) {
    return createZombie({ ...p, name: 'GhostSheriff' }, (z) => {
      const { rig, box, mat, at, mesh, THREE } = z;
      cowboyHat(z, p.hatColor, 1.1);
      revolver(z);
      // sheriff star badge
      const gold = mat('badge', '#ffd24a', { emissive: '#ffb020', emissiveIntensity: 1.2 });
      const star = mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.015, 5), gold);
      star.rotation.x = Math.PI / 2;
      rig.spine.add(at(star, 0.1 * z.b, 0.5, 0.14 * z.b));
      // lantern in the left hand
      const lamp = mat('lantern', '#bfffe8', { emissive: '#7dffd0', emissiveIntensity: 2 });
      rig.arms.L.elbow.add(at(box(0.07, 0.09, 0.07, lamp, 0), 0, -0.3 * z.L - 0.1, 0.02));
      rig.arms.L.elbow.add(at(box(0.08, 0.02, 0.08, mat('lanternTop', '#3a3a3a'), 0), 0, -0.3 * z.L - 0.05, 0.02));
    });
  },
};
