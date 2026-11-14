// 수호기사 (Guardian Knight), the MVP player class. Height about 1.6 m, front +Z.
//
// Part groups (pivots at the joints, as the spec asks):
//   warrior (root)
//   ├─ legL, legR             at the hips (y 0.72)
//   ├─ torso                  at the hips; body, belt, tabard
//   │  ├─ head                at the neck
//   │  ├─ armL > shield
//   │  └─ armR > weapon, potion (potion only shows while drinking)
//   └─ fragments              light shards + letters (death only)
// To change gear: empty `weapon` / `shield` and put an item GLB's `item` node inside
// with zero position and rotation (swords point along the weapon group's +Y).
// Clips: idle, walk, attack, cast, hit, death, drink, victory.
import { finalizeMonster, TAU, keys, clamp01, smooth, win } from '../core/monster.js';
import { eduKit, fragments, burst, blobShadow, sizeSchema, colorSchema, cuteEyes, cuteCheeks } from './common.js';
import { swordShape, shieldShape, bowShape, staffShape, bookShape } from './items.js';

const HIP = 0.72;
export const WARRIOR_ATTACK_HIT = 0.5; // fraction of `attack` when the blade lands
export const WARRIOR_CAST_RELEASE = 0.5;

const lift = (r, dy) => { r.torso.position.y += dy; r.legL.position.y += dy; r.legR.position.y += dy; };

export const KNIGHT_ANIMS = {
  idle: {
    label: '대기 (숨쉬기)',
    duration: 2,
    apply(r, u) {
      const b = Math.sin(u * TAU);
      r.torso.position.y += b * 0.012;
      r.torso.rotation.x += b * 0.015;
      r.head.rotation.x -= b * 0.02;
      r.armL.rotation.z += b * 0.03;
      r.armR.rotation.z -= b * 0.03;
      r.armR.rotation.x += b * 0.03;
    },
  },
  walk: {
    label: '걷기',
    duration: 0.8,
    apply(r, u) {
      const w = u * TAU;
      r.legL.rotation.x += Math.sin(w) * 0.6;
      r.legR.rotation.x -= Math.sin(w) * 0.6;
      lift(r, Math.abs(Math.cos(w)) * 0.035 - 0.02);
      r.armL.rotation.x -= Math.sin(w) * 0.15;
      r.armR.rotation.x += Math.sin(w) * 0.3;
      r.torso.rotation.y += Math.sin(w) * 0.08;
      r.torso.rotation.x += 0.06;
      r.head.rotation.y -= Math.sin(w) * 0.06;
    },
  },
  attack: {
    label: '기본 공격 (내려 베기)',
    duration: 0.6,
    loop: false,
    apply(r, u) {
      // wind up over the right shoulder, slash down across the body (hit at 0.5)
      r.armR.rotation.x += keys(u, [[0, 0], [0.3, -2.3], [0.5, -0.4], [0.62, 0.1], [1, 0]]);
      r.armR.rotation.z += keys(u, [[0, 0], [0.3, -0.5], [0.5, 0.35], [1, 0]]);
      r.weapon.rotation.x += keys(u, [[0, 0], [0.3, -0.6], [0.5, 0.3], [1, 0]]);
      r.torso.rotation.y += keys(u, [[0, 0], [0.3, 0.45], [0.5, -0.4], [1, 0]]);
      r.torso.rotation.x += keys(u, [[0, 0], [0.3, -0.1], [0.5, 0.18], [1, 0]]);
      r.armL.rotation.x += keys(u, [[0, 0], [0.3, -0.3], [0.5, 0.2], [1, 0]]);
      r.legL.rotation.x -= keys(u, [[0, 0], [0.45, 0.35], [1, 0]]); // step in
      r.legR.rotation.x += keys(u, [[0, 0], [0.45, 0.25], [1, 0]]);
      lift(r, -keys(u, [[0, 0], [0.5, 0.05], [1, 0]]));
    },
  },
  cast: {
    label: '스킬 시전 (검을 하늘로)',
    duration: 0.9,
    loop: false,
    apply(r, u) {
      const up = keys(u, [[0, 0], [0.35, 1], [0.7, 1], [1, 0]]);
      const pulse = win(u, 0.45, 0.7, 0.08);
      r.armR.rotation.x -= up * 2.6;
      r.armR.rotation.z += up * 0.2;
      r.weapon.rotation.x -= up * 1.2; // blade straight up
      r.armL.rotation.x -= up * 0.2 + pulse * 0.1; // shield stays in front as a guard
      r.armL.rotation.z += up * 0.25;
      r.torso.rotation.x -= up * 0.12;
      r.head.rotation.x -= up * 0.25;
      lift(r, pulse * 0.05 - up * 0.03);
      r.legL.rotation.z += up * 0.12;
      r.legR.rotation.z -= up * 0.12;
    },
  },
  hit: {
    label: '피격',
    duration: 0.35,
    loop: false,
    apply(r, u) {
      const k = keys(u, [[0, 0], [0.2, 1], [1, 0]]);
      r.torso.rotation.x -= k * 0.3;
      r.head.rotation.x -= k * 0.25;
      r.armL.rotation.x -= k * 0.5; // shield up
      r.armR.rotation.x += k * 0.4;
      r.armR.rotation.z -= k * 0.3;
      lift(r, -k * 0.04);
    },
  },
  death: {
    label: '쓰러짐 (빛으로 흩어짐)',
    duration: 1.8,
    loop: false,
    apply(r, u) {
      const kneel = keys(u, [[0, 0], [0.3, 1], [1, 1]]);
      const fall = keys(u, [[0, 0], [0.3, 0], [0.55, 1], [1, 1]]);
      lift(r, -kneel * 0.3 - fall * 0.1);
      r.legL.rotation.x -= kneel * 1.2;
      r.legR.rotation.x += kneel * 0.4;
      r.torso.rotation.x += kneel * 0.35 - fall * 1.5;
      r.head.rotation.x += kneel * 0.4;
      r.armL.rotation.x -= fall * 1.0;
      r.armR.rotation.x -= fall * 1.4;
      r.armR.rotation.z -= fall * 0.6;
      const fade = Math.max(0.001, 1 - smooth(clamp01((u - 0.55) / 0.3)));
      r.torso.scale.setScalar(fade);
      r.legL.scale.setScalar(fade);
      r.legR.scale.setScalar(fade);
      burst(r.frags, clamp01((u - 0.5) / 0.5));
    },
  },
  drink: {
    label: '물약 마시기',
    duration: 1.2,
    loop: false,
    apply(r, u) {
      // right hand brings the potion to the mouth, the sword tips back out of the way
      const up = keys(u, [[0, 0], [0.25, 1], [0.75, 1], [1, 0]]);
      const gulp = win(u, 0.3, 0.75, 0.1) * Math.sin(u * TAU * 5) * 0.05;
      r.potion.scale.setScalar(Math.max(0.001, win(u, 0.05, 0.95, 0.1)));
      r.armR.rotation.x -= up * 1.6 + gulp;
      r.armR.rotation.z += up * 0.6;
      r.armR.rotation.y -= up * 0.3;
      r.weapon.rotation.x -= up * 1.9; // blade points back and down
      r.potion.rotation.x -= up * 0.9;
      r.head.rotation.x -= up * 0.4;
      r.torso.rotation.x -= up * 0.05;
      r.armL.rotation.x += up * 0.3; // shield lowered
    },
  },
  victory: {
    label: '환호 (보스 처치)',
    duration: 1.6,
    loop: false,
    apply(r, u) {
      const jump = Math.max(0, Math.sin(clamp01((u - 0.1) / 0.35) * Math.PI));
      const raise = keys(u, [[0, 0], [0.15, 1], [0.85, 1], [1, 0]]);
      const crouch = keys(u, [[0, 0], [0.1, 1], [0.15, 0], [0.45, 0], [0.52, 0.6], [0.65, 0], [1, 0]]);
      lift(r, jump * 0.35 - crouch * 0.08);
      r.legL.rotation.x -= jump * 0.5;
      r.legR.rotation.x += jump * 0.2;
      r.armR.rotation.x -= raise * 2.9;
      r.weapon.rotation.x -= raise * 1.3;
      r.armR.rotation.z += raise * 0.15 + Math.sin(u * TAU * 3) * 0.08 * raise;
      r.armL.rotation.z += raise * 0.55;
      r.armL.rotation.x += raise * 0.35; // shield down at the side
      r.head.rotation.x -= raise * 0.3;
      r.torso.rotation.x -= raise * 0.1;
    },
  },
};


// ---- shared body ------------------------------------------------------------------------
// style: 'knight' (helmet, plume, armour) | 'hunter' (hood, leather, cape, quiver)
//        'sage' (pointed hat, long robe, wide sleeves)
function buildHero(p, style, name) {
  const k = eduKit(p.seed, 0.3);
  const main = k.mat('main', p.mainColor, style === 'knight' ? { metalness: 0.5, roughness: 0.45 } : {});
  const cloth = k.mat('cloth', p.clothColor);
  const trim = k.mat('trim', p.trimColor, { metalness: 0.6, roughness: 0.4 });
  const skin = k.mat('skin', p.skinColor);
  const pants = k.mat('pants', p.pantsColor);
  const boot = k.mat('boots', p.bootColor);
  const leather = k.mat('leather', '#5a3a22');

  const root = k.pivot('root');
  root.name = name;
  root.scale.setScalar(p.size);
  blobShadow(k, root, 0.32);

  const legs = {};
  for (const [n, s] of [['L', 1], ['R', -1]]) {
    const leg = k.pivot(`leg${n}`, s * 0.11, HIP, 0);
    leg.add(k.at(k.box(0.15, 0.36, 0.16, pants, 0.004), 0, -0.18, 0));
    leg.add(k.at(k.box(0.17, 0.3, 0.19, boot, 0.004), 0, -0.55, 0.01));
    leg.add(k.at(k.box(0.17, 0.08, 0.26, boot, 0.004), 0, -0.68, 0.05));
    leg.add(k.at(k.box(0.19, 0.05, 0.2, style === 'knight' ? trim : leather, 0), 0, -0.4, 0.01));
    if (style === 'knight') leg.add(k.at(k.box(0.12, 0.1, 0.04, main, 0), 0, -0.36, 0.1));
    root.add(leg);
    legs[n] = leg;
  }

  const torso = k.pivot('torso', 0, HIP, 0);
  root.add(torso);
  torso.add(k.at(k.box(0.36, 0.16, 0.24, pants, 0.004), 0, 0.05, 0));
  torso.add(k.at(k.box(0.42, 0.34, 0.27, main, 0.004), 0, 0.3, 0));
  torso.add(k.at(k.box(0.4, 0.06, 0.28, leather, 0), 0, 0.1, 0));
  torso.add(k.at(k.box(0.07, 0.06, 0.03, trim, 0), 0, 0.1, 0.145));
  const emblem = k.mat('emblemGlow', '#fff2a8', { emissive: '#ffd34a', emissiveIntensity: 1.2, keepColor: true });
  if (style === 'knight') {
    torso.add(k.at(k.box(0.3, 0.46, 0.03, cloth, 0), 0, 0.14, 0.135));
    torso.add(k.at(k.box(0.3, 0.42, 0.03, cloth, 0), 0, 0.16, -0.135));
    torso.add(k.at(k.box(0.08, 0.1, 0.02, trim, 0), 0, 0.3, 0.155));
    torso.add(k.at(k.box(0.04, 0.05, 0.022, emblem, 0), 0, 0.3, 0.158));
    torso.add(k.at(k.cyl(0.11, 0.13, 0.06, main, 8), 0, 0.48, 0));
  } else if (style === 'hunter') {
    torso.add(k.at(k.rot(k.box(0.05, 0.46, 0.29, leather, 0), 0, 0, 0.55), 0, 0.3, 0)); // bandolier
    torso.add(k.at(k.box(0.44, 0.5, 0.04, cloth, 0.004), 0, 0.12, -0.16)); // short cape
    // quiver on the back with feathered arrows
    const quiver = k.pivot('quiver', -0.08, 0.32, -0.2);
    quiver.rotation.z = 0.35;
    quiver.add(k.cyl(0.07, 0.06, 0.4, leather, 6));
    for (let i = 0; i < 3; i++) quiver.add(k.at(k.box(0.025, 0.08, 0.05, k.mat('fletch', '#f2f2f2'), 0), -0.03 + i * 0.03, 0.24, 0));
    torso.add(quiver);
    torso.add(k.at(k.mesh(new k.THREE.OctahedronGeometry(0.035, 0), emblem), 0.1, 0.38, 0.14)); // star brooch
  } else { // sage: long robe over the legs, star clasp
    torso.add(k.at(k.cyl(0.24, 0.34, 0.62, cloth, 8, 0.004), 0, -0.22, 0)); // robe skirt (hides the thighs)
    torso.add(k.at(k.box(0.1, 0.6, 0.03, trim, 0), 0, 0.12, 0.145)); // front trim
    torso.add(k.at(k.mesh(new k.THREE.OctahedronGeometry(0.045, 0), emblem), 0, 0.38, 0.16));
    torso.add(k.at(k.cyl(0.12, 0.15, 0.06, cloth, 8), 0, 0.48, 0)); // collar
  }

  const head = k.pivot('head', 0, 0.5, 0);
  torso.add(head);
  head.add(k.at(k.box(0.3, 0.28, 0.28, skin, 0.004), 0, 0.16, 0.01));
  const hair = k.mat('hair', p.hairColor);
  head.add(k.at(k.box(0.32, 0.1, 0.3, hair, 0.006), 0, 0.12, -0.03));
  if (style === 'knight') {
    head.add(k.at(k.scl(k.dome(0.2, main, 8), 1, 0.9, 1), 0, 0.24, 0));
    head.add(k.at(k.cyl(0.205, 0.205, 0.05, trim, 8), 0, 0.25, 0));
    head.add(k.at(k.box(0.035, 0.1, 0.03, main, 0), 0, 0.22, 0.2));
    for (let i = 0; i < 3; i++) head.add(k.at(k.rot(k.cone(0.035, 0.22, k.mat('plume', p.accentColor), 5), -0.6 - i * 0.3, 0, 0), 0, 0.46 - i * 0.02, -0.04 - i * 0.07));
  } else if (style === 'hunter') {
    head.add(k.at(k.box(0.33, 0.12, 0.3, hair, 0.006), 0, 0.3, -0.01)); // fringe
    head.add(k.at(k.scl(k.dome(0.22, cloth, 8), 1, 1, 1.05), 0, 0.22, -0.03)); // hood
    head.add(k.at(k.rot(k.cone(0.12, 0.22, cloth, 4), -2.2, 0, 0), 0, 0.2, -0.24)); // hood tip
    head.add(k.at(k.rot(k.cone(0.02, 0.16, k.mat('feather', p.accentColor), 4), -0.5, 0, -0.5), 0.17, 0.34, -0.02));
  } else {
    head.add(k.at(k.box(0.34, 0.16, 0.1, hair, 0.006), 0, 0.12, -0.13));
    head.add(k.at(k.cyl(0.3, 0.3, 0.03, cloth, 10), 0, 0.3, 0)); // hat brim
    head.add(k.at(k.rot(k.cone(0.18, 0.42, cloth, 8, 0.01), -0.25, 0, 0), 0, 0.5, -0.04)); // pointed hat
    head.add(k.at(k.cyl(0.185, 0.185, 0.05, trim, 8), 0, 0.33, 0));
    head.add(k.at(k.mesh(new k.THREE.OctahedronGeometry(0.04, 0), emblem), 0, 0.42, 0.15)); // star on the hat
    // round glasses
    const glass = k.mat('glasses', '#3a3a4a');
    for (const s of [-1, 1]) head.add(k.at(k.mesh(new k.THREE.TorusGeometry(0.045, 0.008, 3, 8), glass), s * 0.07, 0.15, 0.165));
  }
  cuteEyes(k, head, { y: 0.15, z: 0.16, spacing: 0.07, size: 0.035 });
  cuteCheeks(k, head, { y: 0.09, z: 0.155, spacing: 0.1, size: 0.03 });
  k.smile(head, { y: 0.07, z: 0.16, width: 0.07, thick: 0.015, segs: 4 });

  const arms = {};
  for (const [n, s] of [['L', 1], ['R', -1]]) {
    const arm = k.pivot(`arm${n}`, s * 0.27, 0.42, 0);
    if (style === 'knight') arm.add(k.at(k.scl(k.ball(0.11, main, 1), 1.15, 0.8, 1.1), s * 0.02, 0.02, 0));
    else arm.add(k.at(k.scl(k.ball(0.085, main, 0), 1, 0.9, 1), 0, 0, 0));
    arm.add(k.at(k.box(0.11, 0.26, 0.12, style === 'knight' ? cloth : main, 0.004), 0, -0.16, 0));
    if (style === 'sage') arm.add(k.at(k.cyl(0.08, 0.11, 0.26, cloth, 6), 0, -0.4, 0)); // wide sleeve
    else arm.add(k.at(k.box(0.13, 0.22, 0.14, style === 'knight' ? main : leather, 0.004), 0, -0.38, 0));
    arm.add(k.at(k.box(0.11, 0.1, 0.12, style === 'sage' ? skin : leather, 0.004), 0, -0.53, 0.01));
    torso.add(arm);
    arms[n] = arm;
  }
  const potion = k.pivot('potion', 0.05, -0.62, 0.1);
  potion.add(k.at(k.ball(0.055, k.mat('potionLiquid', '#ff3a4a', { emissive: '#ff3a4a', emissiveIntensity: 0.8, keepColor: true }), 1), 0, -0.02, 0));
  potion.add(k.at(k.cyl(0.02, 0.025, 0.07, k.mat('potionGlass', '#e8f6ff', { transparent: true, opacity: 0.5 }), 6), 0, 0.05, 0));
  potion.scale.setScalar(0.001);
  arms.R.add(potion);
  const frags = fragments(k, root, { y: 0.8, count: 14, spread: 1.1 });
  return { k, root, rig: { torso, head, armL: arms.L, armR: arms.R, legL: legs.L, legR: legs.R, potion, frags } };
}

const heroSchema = (extra) => ({
  ...sizeSchema, ...extra,
  ...colorSchema({ mainColor: '주 색 (갑옷·조끼)', clothColor: '옷감 색', trimColor: '장식 색', accentColor: '포인트 색', skinColor: '피부 색', hairColor: '머리 색', pantsColor: '바지 색', bootColor: '신발 색' }),
});
const clipsOf = (a) => Object.fromEntries(Object.keys(a).map((c) => [c, c]));

export const warrior = {
  label: '수호기사', role: '🛡️ 플레이어', file: 'characters/warrior.glb',
  release: { attack: WARRIOR_ATTACK_HIT, cast: WARRIOR_CAST_RELEASE },
  defaults: {
    seed: 101, size: 1, weaponTier: 1, shieldTier: 1,
    mainColor: '#c9d3de', clothColor: '#3b6fd1', trimColor: '#f2c14e', accentColor: '#e8433a',
    skinColor: '#ffd2b0', hairColor: '#7a4a2a', pantsColor: '#4a3a5a', bootColor: '#6a4428',
  },
  schema: heroSchema({ weaponTier: { label: '검 단계', min: 1, max: 3, step: 1 }, shieldTier: { label: '방패 단계', min: 1, max: 3, step: 1 } }),
  build(p) {
    const { k, root, rig } = buildHero(p, 'knight', 'warrior');
    rig.armR.rotation.x = -0.35; // ready stance: sword forward and up, shield in front
    rig.armL.rotation.x = -0.45;
    rig.armL.rotation.y = -0.3;
    const weapon = k.pivot('weapon', 0, -0.55, 0.03);
    weapon.rotation.x = 1.4;
    swordShape(k, weapon, p.weaponTier);
    rig.armR.add(weapon);
    const shield = k.pivot('shield', 0.06, -0.38, 0.1);
    shield.rotation.set(0.45, 0.2, 0);
    shieldShape(k, shield, p.shieldTier);
    rig.armL.add(shield);
    return finalizeMonster(root, { rig: { ...rig, weapon, shield }, params: p, animations: KNIGHT_ANIMS, clips: clipsOf(KNIGHT_ANIMS) });
  },
};

// ---- 별사냥꾼 (Star Hunter): bow in the LEFT hand (`weapon` is a child of armL) ------------
export const HUNTER_RELEASE = 0.55; // fraction of `attack` when the arrow leaves (spawn vfx/fx_arrow)
const aim = (r, a) => { // bow arm straight forward, string hand across the chest at the left shoulder
  r.torso.rotation.y -= a * 0.3;
  r.head.rotation.y += a * 0.25;
  r.armL.rotation.x -= a * 1.2; // rest -0.3 -> about -1.5 (forward)
  r.weapon.rotation.x += a * 1.5; // bow upright, belly toward the target
  r.armR.rotation.x -= a * 0.1;
  r.armR.rotation.z += a * 1.45; // across the chest
  r.legL.rotation.x -= a * 0.15;
  r.legR.rotation.x += a * 0.15;
};
export const HUNTER_ANIMS = {
  ...KNIGHT_ANIMS,
  attack: {
    label: '기본 공격 (활 쏘기)',
    duration: 0.8,
    loop: false,
    apply(r, u) {
      const a = keys(u, [[0, 0], [0.2, 1], [0.8, 1], [1, 0]]);
      const draw = keys(u, [[0, 0], [0.2, 0], [0.5, 1], [0.55, 0], [1, 0]]);
      aim(r, a);
      r.armR.rotation.y += draw * 0.35; // pull the string back
      r.arrow.scale.setScalar(u > 0.12 && u < HUNTER_RELEASE ? 1 : 0.001);
      r.string.position.z -= draw * 0.12;
      r.torso.rotation.x -= keys(u, [[0, 0], [0.55, 0], [0.62, 0.08], [1, 0]]); // recoil
    },
  },
  cast: {
    label: '스킬 시전 (활을 하늘로, 별빛)',
    duration: 0.9,
    loop: false,
    apply(r, u) {
      const up = keys(u, [[0, 0], [0.35, 1], [0.7, 1], [1, 0]]);
      r.armL.rotation.x -= up * 2.2;
      r.armR.rotation.x -= up * 0.9;
      r.armR.rotation.z += up * 0.5;
      r.head.rotation.x -= up * 0.3;
      r.torso.rotation.x -= up * 0.1;
      lift(r, win(u, 0.45, 0.7, 0.08) * 0.05);
      r.star.scale.setScalar(Math.max(0.001, win(u, 0.3, 0.85, 0.1) * (1 + Math.sin(u * TAU * 4) * 0.15)));
    },
  },
};
export const starHunter = {
  label: '별사냥꾼', role: '🏹 플레이어', file: 'characters/star_hunter.glb',
  release: { attack: HUNTER_RELEASE, cast: 0.5 },
  defaults: {
    seed: 102, size: 1, weaponTier: 1,
    mainColor: '#8a5a32', clothColor: '#3a8a5a', trimColor: '#e8d070', accentColor: '#ffd34a',
    skinColor: '#f6c8a0', hairColor: '#d89a4a', pantsColor: '#5a4a3a', bootColor: '#4a3020',
  },
  schema: heroSchema({ weaponTier: { label: '활 단계', min: 1, max: 3, step: 1 } }),
  build(p) {
    const { k, root, rig } = buildHero(p, 'hunter', 'star_hunter');
    rig.armL.rotation.x = -0.3;
    rig.armR.rotation.x = -0.15;
    const weapon = k.pivot('weapon', 0, -0.55, 0.02); // bow limbs along +Y, belly toward +Z
    bowShape(k, weapon, p.weaponTier);
    rig.armL.add(weapon);
    const string = weapon.getObjectByName('bowString');
    const arrow = k.pivot('arrow', 0, -0.56, 0.02); // nocked arrow in the right hand, points +Z while aiming
    arrow.add(k.at(k.rot(k.cyl(0.008, 0.008, 0.6, k.mat('arrowShaft', '#c8a070'), 4), Math.PI / 2, 0, 0), 0, 0, 0.3));
    arrow.add(k.at(k.rot(k.cone(0.02, 0.06, k.mat('arrowHead', '#d8e0e8', { metalness: 0.6 }), 4), Math.PI / 2, 0, 0), 0, 0, 0.62));
    arrow.scale.setScalar(0.001);
    rig.armR.add(arrow);
    const star = k.pivot('star', 0, -0.55, 0); // star glow on the bow hand when casting
    star.add(k.mesh(new k.THREE.OctahedronGeometry(0.09, 0), k.mat('starGlow', '#fff3a0', { emissive: '#ffd34a', emissiveIntensity: 2.4, keepColor: true })));
    star.scale.setScalar(0.001);
    rig.armL.add(star);
    return finalizeMonster(root, { rig: { ...rig, weapon, shield: weapon, arrow, string, star }, params: p, animations: HUNTER_ANIMS, clips: clipsOf(HUNTER_ANIMS) });
  },
};

// ---- 현자 (Sage): staff in the right hand, spellbook (`offhand`) in the left ------------
export const SAGE_RELEASE = 0.5; // fraction of `attack` / `cast` when the spell leaves the staff tip
export const SAGE_ANIMS = {
  ...KNIGHT_ANIMS,
  attack: {
    label: '기본 공격 (지팡이 휘둘러 마력탄)',
    duration: 0.7,
    loop: false,
    apply(r, u) {
      r.armR.rotation.x += keys(u, [[0, 0], [0.3, -1.6], [0.5, -0.9], [0.7, -0.8], [1, 0]]);
      r.armR.rotation.z += keys(u, [[0, 0], [0.3, -0.3], [0.5, 0.15], [1, 0]]);
      r.torso.rotation.y += keys(u, [[0, 0], [0.3, 0.3], [0.5, -0.2], [1, 0]]);
      r.orb.scale.setScalar(1 + keys(u, [[0, 0], [0.45, 1], [0.55, 0.2], [1, 0]]));
      r.legL.rotation.x -= keys(u, [[0, 0], [0.45, 0.25], [1, 0]]);
    },
  },
  cast: {
    label: '스킬 시전 (마법서 펼치고 지팡이 들기)',
    duration: 1,
    loop: false,
    apply(r, u) {
      const up = keys(u, [[0, 0], [0.35, 1], [0.75, 1], [1, 0]]);
      r.armR.rotation.x -= up * 2.0;
      r.armL.rotation.x -= up * 1.1;
      r.armL.rotation.z -= up * 0.3;
      r.cover.rotation.y -= up * 2.6; // book opens
      r.pages.rotation.y += Math.sin(u * TAU * 3) * 0.3 * up;
      r.orb.scale.setScalar(1 + up * 0.8 + Math.sin(u * TAU * 5) * 0.15 * up);
      r.head.rotation.x -= up * 0.15;
      lift(r, win(u, 0.4, 0.75, 0.08) * 0.06);
    },
  },
};
export const sage = {
  label: '현자', role: '🔮 플레이어', file: 'characters/sage.glb',
  release: { attack: SAGE_RELEASE, cast: SAGE_RELEASE },
  defaults: {
    seed: 103, size: 1, weaponTier: 1, bookTier: 1,
    mainColor: '#e8e0f0', clothColor: '#5a4ab8', trimColor: '#f2c14e', accentColor: '#8ad8ff',
    skinColor: '#ffd8b8', hairColor: '#e8e8f0', pantsColor: '#3a3060', bootColor: '#5a3a2a',
  },
  schema: heroSchema({ weaponTier: { label: '지팡이 단계', min: 1, max: 3, step: 1 }, bookTier: { label: '마법서 단계', min: 1, max: 2, step: 1 } }),
  build(p) {
    const { k, root, rig } = buildHero(p, 'sage', 'sage');
    rig.armR.rotation.x = -0.3;
    rig.armL.rotation.x = -0.6;
    rig.armL.rotation.z = -0.25;
    const weapon = k.pivot('weapon', 0, -0.55, 0.03); // staff along +Y
    weapon.rotation.x = 0.3;
    staffShape(k, weapon, p.weaponTier);
    rig.armR.add(weapon);
    const offhand = k.pivot('offhand', 0, -0.58, 0.08); // spellbook resting on the left hand
    offhand.rotation.x = 0.6 - Math.PI / 2; // lying open-side up
    bookShape(k, offhand, p.bookTier);
    rig.armL.add(offhand);
    const orb = weapon.getObjectByName('staffOrb');
    const cover = offhand.getObjectByName('bookCover');
    const pages = offhand.getObjectByName('bookPages');
    return finalizeMonster(root, { rig: { ...rig, weapon, shield: offhand, orb, cover, pages }, params: p, animations: SAGE_ANIMS, clips: clipsOf(SAGE_ANIMS) });
  },
};
