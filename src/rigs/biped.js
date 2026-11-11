// Chubby, friendly two-legged rig: round body, optional head, stubby limbs.
// Used by bears, swamp blobs, snowmen, robots... Facing +Z.
//
// Joints: hips > legL/legR, body > armL/armR, head (optional)
import { TAU, keys, blink, smooth } from '../core/monster.js';

export function buildBiped(k, o) {
  const {
    bodyR = 0.4, bodyScale = [1, 1.1, 0.95], bodyMat,
    headR = 0, headMat = bodyMat, legLen = 0.22, legR = 0.09, legMat = bodyMat, footMat = legMat,
    armLen = 0.32, armR = 0.07, armMat = bodyMat, handMat = armMat, legSpread = 0.45,
  } = o;
  const [sx, sy, sz] = bodyScale;
  const root = k.pivot('root'); // the Group returned to the caller
  root.name = o.name ?? 'Monster';
  const hips = k.pivot('hips', 0, legLen, 0);
  root.add(hips);

  const legs = {};
  for (const [n, side] of [['L', 1], ['R', -1]]) {
    const leg = k.pivot(`leg${n}`, side * bodyR * sx * legSpread, 0.02, 0);
    leg.add(k.at(k.cyl(legR, legR * 1.1, legLen + 0.04, legMat, 7, 0.006), 0, -legLen / 2, 0));
    leg.add(k.at(k.scl(k.ball(legR * 1.35, footMat, 1, 0.008), 1.1, 0.55, 1.5), 0, -legLen, legR * 0.45));
    hips.add(leg);
    legs[n] = leg;
  }

  const body = k.pivot('body');
  hips.add(body);
  const cy = bodyR * sy * 0.85;
  body.add(k.at(k.scl(k.ball(bodyR, bodyMat, 2, 0.02), sx, sy, sz), 0, cy, 0));

  const arms = {};
  for (const [n, side] of [['L', 1], ['R', -1]]) {
    const arm = k.pivot(`arm${n}`, side * bodyR * sx * 0.92, cy + bodyR * sy * 0.15, 0);
    arm.add(k.at(k.cyl(armR, armR * 0.9, armLen, armMat, 6, 0.005), 0, -armLen / 2, 0));
    arm.add(k.at(k.ball(armR * 1.5, handMat, 1, 0.006), 0, -armLen, 0));
    arm.rotation.z = side * 0.35;
    body.add(arm);
    arms[n] = arm;
  }

  let head = null;
  let face = { parent: body, cy, r: bodyR * sz, ry: bodyR * sy };
  if (headR > 0) {
    head = k.pivot('head', 0, cy + bodyR * sy * 0.8, 0);
    head.add(k.at(k.ball(headR, headMat, 2, 0.015), 0, headR * 0.85, 0));
    body.add(head);
    face = { parent: head, cy: headR * 0.85, r: headR, ry: headR };
  }

  const rig = { hips, body, head, legs, arms, eyes: [], dims: { legLen, bodyR, sx, sy, sz, cy } };
  return { root, rig, face };
}

const sides = [['L', 1], ['R', -1]];
const blinkEyes = (rig, amount) => rig.eyes.forEach((e) => { e.scale.y = Math.max(0.08, 1 - amount); });

export const BIPED_ANIMS = {
  idle: {
    label: '대기 (숨쉬기)',
    duration: 3,
    apply(rig, u) {
      const s = Math.sin(u * TAU);
      rig.body.scale.set(1 - s * 0.015, 1 + s * 0.03, 1 - s * 0.015);
      for (const [n, side] of sides) rig.arms[n].rotation.z += side * s * 0.06;
      if (rig.head) rig.head.rotation.z += Math.sin(u * TAU) * 0.06;
      else rig.body.rotation.z += Math.sin(u * TAU) * 0.03;
      blinkEyes(rig, blink(u));
    },
  },
  waddle: {
    label: '뒤뚱 걷기',
    duration: 1.0,
    apply(rig, u) {
      const w = u * TAU;
      const s = Math.sin(w);
      const land = Math.abs(Math.cos(w));
      rig.hips.position.y += Math.abs(s) * 0.05;
      rig.hips.rotation.z += s * 0.1;
      rig.legs.L.rotation.x += s * 0.5;
      rig.legs.R.rotation.x -= s * 0.5;
      rig.arms.L.rotation.x -= s * 0.5;
      rig.arms.R.rotation.x += s * 0.5;
      rig.body.scale.set(1 + land * 0.03, 1 - land * 0.04, 1 + land * 0.03);
      rig.body.rotation.z -= s * 0.05;
      if (rig.head) rig.head.rotation.z -= s * 0.08;
      blinkEyes(rig, blink(u, [0.6]));
    },
  },
  clap: {
    label: '박수 공격',
    duration: 1.2,
    apply(rig, u) {
      const up = keys(u, [[0, 0], [0.35, 1], [0.5, 0], [1, 0]]);
      const clap = keys(u, [[0, 0], [0.35, 0], [0.5, 1], [0.75, 1], [1, 0]]);
      for (const [n, side] of sides) {
        rig.arms[n].rotation.z += side * up * 1.2 - side * clap * 0.75;
        rig.arms[n].rotation.x -= clap * 1.3 + up * 0.3;
      }
      rig.body.scale.set(1 + clap * 0.08, 1 - clap * 0.08, 1 + clap * 0.08);
      rig.body.rotation.x += clap * 0.12 - up * 0.1;
      blinkEyes(rig, clap > 0.9 ? 0.6 : 0);
    },
  },
  pound: {
    label: '점프 내려찍기',
    duration: 1.6,
    apply(rig, u, p) {
      const crouch = keys(u, [[0, 0], [0.2, 1], [0.3, 0], [0.55, 0], [0.62, 1], [0.8, 0.3], [1, 0]]);
      const air = Math.sin(Math.PI * Math.min(1, Math.max(0, (u - 0.28) / 0.32)));
      const armsUp = keys(u, [[0, 0], [0.25, 1], [0.5, 1], [0.6, 0], [1, 0]]);
      rig.hips.position.y += air * 0.45 - crouch * 0.08;
      rig.body.scale.set(1 + crouch * 0.12, 1 - crouch * 0.15, 1 + crouch * 0.12);
      for (const [n, side] of sides) {
        rig.arms[n].rotation.x -= armsUp * 2.6;
        rig.arms[n].rotation.z -= side * armsUp * 0.2;
        rig.legs[n].rotation.x -= air * 0.3;
      }
      blinkEyes(rig, crouch > 0.8 ? 0.7 : 0);
    },
  },
  hit: {
    label: '피격',
    duration: 0.6,
    loop: false,
    apply(rig, u) {
      const h = keys(u, [[0, 0], [0.15, 1], [1, 0]]);
      rig.body.rotation.x -= h * 0.3;
      rig.body.scale.set(1 + h * 0.1, 1 - h * 0.1, 1 + h * 0.1);
      rig.hips.position.z -= h * 0.06;
      for (const [n, side] of sides) rig.arms[n].rotation.z += side * h * 0.8;
      blinkEyes(rig, h * 0.85);
    },
  },
  flop: {
    label: '뒤로 벌러덩',
    duration: 1.4,
    loop: false,
    apply(rig, u) {
      const f = keys(u, [[0, 0], [0.15, -0.1], [0.6, 1], [0.72, 0.92], [0.85, 1], [1, 1]]);
      const d = rig.dims;
      rig.hips.rotation.x -= f * (Math.PI / 2 - 0.1);
      rig.hips.position.y += f * (d.bodyR * d.sz * 0.9 - d.legLen);
      for (const [n, side] of sides) {
        rig.arms[n].rotation.z += side * f * 0.9;
        rig.legs[n].rotation.x -= f * 0.4;
      }
      blinkEyes(rig, smooth(u / 0.5) * 0.92);
    },
  },
  melt: {
    label: '녹아내리기',
    duration: 1.8,
    loop: false,
    apply(rig, u) {
      const f = keys(u, [[0, 0], [0.15, -0.08], [0.85, 1], [1, 1]]);
      const d = rig.dims;
      rig.body.scale.set(1 + f * 0.7, 1 - f * 0.72, 1 + f * 0.7);
      rig.hips.position.y -= f * d.legLen * 0.95;
      for (const [n, side] of sides) {
        rig.arms[n].rotation.z += side * f * 0.9;
        rig.arms[n].scale.setScalar(1 - f * 0.6);
        rig.legs[n].scale.set(1 + f * 0.5, 1 - f * 0.85, 1 + f * 0.5);
      }
      blinkEyes(rig, f * 0.5);
    },
  },
};
