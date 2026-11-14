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
import { swordShape, shieldShape } from './items.js';

const HIP = 0.72;
export const WARRIOR_ATTACK_HIT = 0.5; // fraction of `attack` when the blade lands
export const WARRIOR_CAST_RELEASE = 0.5;

const lift = (r, dy) => { r.torso.position.y += dy; r.legL.position.y += dy; r.legR.position.y += dy; };

const ANIMS = {
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

export const warrior = {
  label: '수호기사', role: '🛡️ 플레이어', file: 'characters/warrior.glb',
  defaults: {
    seed: 101, size: 1, weaponTier: 1, shieldTier: 1,
    armorColor: '#c9d3de', tabardColor: '#3b6fd1', trimColor: '#f2c14e', skinColor: '#ffd2b0',
    hairColor: '#7a4a2a', plumeColor: '#e8433a', pantsColor: '#4a3a5a', bootColor: '#6a4428',
  },
  schema: {
    ...sizeSchema,
    weaponTier: { label: '검 단계', min: 1, max: 3, step: 1 },
    shieldTier: { label: '방패 단계', min: 1, max: 3, step: 1 },
    ...colorSchema({ armorColor: '갑옷 색', tabardColor: '겉옷 색', trimColor: '장식 색', skinColor: '피부 색', hairColor: '머리 색', plumeColor: '깃털 장식 색', pantsColor: '바지 색', bootColor: '장화 색' }),
  },
  build(p) {
    const k = eduKit(p.seed, 0.3);
    const armor = k.mat('armor', p.armorColor, { metalness: 0.5, roughness: 0.45 });
    const tabard = k.mat('tabard', p.tabardColor);
    const trim = k.mat('trim', p.trimColor, { metalness: 0.6, roughness: 0.4 });
    const skin = k.mat('skin', p.skinColor);
    const pants = k.mat('pants', p.pantsColor);
    const boot = k.mat('boots', p.bootColor);
    const leather = k.mat('leather', '#5a3a22');

    const root = k.pivot('root');
    root.name = 'warrior';
    root.scale.setScalar(p.size);
    blobShadow(k, root, 0.32);

    // legs
    const legs = {};
    for (const [n, s] of [['L', 1], ['R', -1]]) {
      const leg = k.pivot(`leg${n}`, s * 0.11, HIP, 0);
      leg.add(k.at(k.box(0.15, 0.36, 0.16, pants, 0.004), 0, -0.18, 0));
      leg.add(k.at(k.box(0.17, 0.3, 0.19, boot, 0.004), 0, -0.55, 0.01));
      leg.add(k.at(k.box(0.17, 0.08, 0.26, boot, 0.004), 0, -0.68, 0.05)); // toe
      leg.add(k.at(k.box(0.19, 0.05, 0.2, trim, 0), 0, -0.4, 0.01)); // boot cuff
      leg.add(k.at(k.box(0.12, 0.1, 0.04, armor, 0), 0, -0.36, 0.1)); // knee plate
      root.add(leg);
      legs[n] = leg;
    }

    // torso
    const torso = k.pivot('torso', 0, HIP, 0);
    root.add(torso);
    torso.add(k.at(k.box(0.36, 0.16, 0.24, pants, 0.004), 0, 0.05, 0)); // hips
    torso.add(k.at(k.box(0.42, 0.34, 0.27, armor, 0.004), 0, 0.3, 0)); // chest
    torso.add(k.at(k.box(0.3, 0.46, 0.03, tabard, 0), 0, 0.14, 0.135)); // tabard front
    torso.add(k.at(k.box(0.3, 0.42, 0.03, tabard, 0), 0, 0.16, -0.135)); // tabard back
    torso.add(k.at(k.box(0.4, 0.06, 0.28, leather, 0), 0, 0.1, 0)); // belt
    torso.add(k.at(k.box(0.07, 0.06, 0.03, trim, 0), 0, 0.1, 0.145)); // buckle
    // emblem: a small lantern (the village's sign)
    torso.add(k.at(k.box(0.08, 0.1, 0.02, trim, 0), 0, 0.3, 0.155));
    torso.add(k.at(k.box(0.04, 0.05, 0.022, k.mat('emblemGlow', '#fff2a8', { emissive: '#ffd34a', emissiveIntensity: 1.2, keepColor: true }), 0), 0, 0.3, 0.158));
    torso.add(k.at(k.cyl(0.11, 0.13, 0.06, armor, 8), 0, 0.48, 0)); // gorget

    // head
    const head = k.pivot('head', 0, 0.5, 0);
    torso.add(head);
    head.add(k.at(k.box(0.3, 0.28, 0.28, skin, 0.004), 0, 0.16, 0.01)); // face
    head.add(k.at(k.box(0.32, 0.1, 0.3, k.mat('hair', p.hairColor), 0.006), 0, 0.12, -0.03)); // hair at the sides
    head.add(k.at(k.scl(k.dome(0.2, armor, 8), 1, 0.9, 1), 0, 0.24, 0)); // helmet
    head.add(k.at(k.cyl(0.205, 0.205, 0.05, trim, 8), 0, 0.25, 0)); // helmet band
    head.add(k.at(k.box(0.035, 0.1, 0.03, armor, 0), 0, 0.22, 0.2)); // nose guard
    for (let i = 0; i < 3; i++) head.add(k.at(k.rot(k.cone(0.035, 0.22, k.mat('plume', p.plumeColor), 5), -0.6 - i * 0.3, 0, 0), 0, 0.46 - i * 0.02, -0.04 - i * 0.07));
    cuteEyes(k, head, { y: 0.15, z: 0.16, spacing: 0.07, size: 0.035 });
    cuteCheeks(k, head, { y: 0.09, z: 0.155, spacing: 0.1, size: 0.03 });
    k.smile(head, { y: 0.07, z: 0.16, width: 0.07, thick: 0.015, segs: 4 });

    // arms
    const arms = {};
    for (const [n, s] of [['L', 1], ['R', -1]]) {
      const arm = k.pivot(`arm${n}`, s * 0.27, 0.42, 0);
      arm.add(k.at(k.scl(k.ball(0.11, armor, 1), 1.15, 0.8, 1.1), s * 0.02, 0.02, 0)); // pauldron
      arm.add(k.at(k.box(0.11, 0.26, 0.12, tabard, 0.004), 0, -0.16, 0));
      arm.add(k.at(k.box(0.13, 0.22, 0.14, armor, 0.004), 0, -0.38, 0)); // vambrace
      arm.add(k.at(k.box(0.11, 0.1, 0.12, leather, 0.004), 0, -0.53, 0.01)); // glove
      torso.add(arm);
      arms[n] = arm;
    }
    // resting ready stance: sword forward and up, shield in front
    arms.R.rotation.x = -0.35;
    arms.L.rotation.x = -0.45;
    arms.L.rotation.y = -0.3;

    const weapon = k.pivot('weapon', 0, -0.55, 0.03);
    weapon.rotation.x = 1.4;
    swordShape(k, weapon, p.weaponTier);
    arms.R.add(weapon);
    const shield = k.pivot('shield', 0.06, -0.38, 0.1);
    shield.rotation.set(0.45, 0.2, 0);
    shieldShape(k, shield, p.shieldTier);
    arms.L.add(shield);
    const potion = k.pivot('potion', 0.05, -0.62, 0.1);
    potion.add(k.at(k.ball(0.055, k.mat('potionLiquid', '#ff3a4a', { emissive: '#ff3a4a', emissiveIntensity: 0.8, keepColor: true }), 1), 0, -0.02, 0));
    potion.add(k.at(k.cyl(0.02, 0.025, 0.07, k.mat('potionGlass', '#e8f6ff', { transparent: true, opacity: 0.5 }), 6), 0, 0.05, 0));
    potion.scale.setScalar(0.001);
    arms.R.add(potion);

    const frags = fragments(k, root, { y: 0.8, count: 14, spread: 1.1 });

    return finalizeMonster(root, {
      rig: { torso, head, armL: arms.L, armR: arms.R, legL: legs.L, legR: legs.R, weapon, shield, potion, frags },
      params: p, animations: ANIMS,
      clips: Object.fromEntries(Object.keys(ANIMS).map((c) => [c, c])),
    });
  },
};
