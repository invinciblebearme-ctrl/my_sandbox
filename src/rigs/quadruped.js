// Friendly four-legged rig (wolves, coyotes, dogs, bugs...). Facing +Z.
//
// Joints: body > legFL/FR/BL/BR > kneeXX, neck > head > jaw, earL/earR, tail > tail2
import { TAU, keys, blink, smooth, clamp01 } from '../core/monster.js';

export function buildQuadruped(k, o) {
  const {
    len = 0.7, width = 0.36, height = 0.32, legLen = 0.32, legR = 0.055, headSize = 0.28,
    snout = 0.14, ears = 'pointy', tail = 'fluffy', furMat, bellyMat = furMat, pawMat = furMat,
    noseMat, earInnerMat, eyeSize = 0.065,
  } = o;
  const root = k.pivot('root');
  root.name = o.name ?? 'Monster';
  const body = k.pivot('body', 0, legLen + height * 0.45, 0);
  root.add(body);
  body.add(k.box(width, height, len, furMat, 0.02, 2));
  body.add(k.at(k.box(width * 0.8, height * 0.3, len * 0.8, bellyMat, 0.01), 0, -height * 0.38, 0));

  const legs = {};
  for (const [n, x, z] of [['FL', 1, 1], ['FR', -1, 1], ['BL', 1, -1], ['BR', -1, -1]]) {
    const leg = k.pivot(`leg${n}`, x * width * 0.32, -height * 0.3, z * len * 0.36);
    const half = (legLen + height * 0.15) / 2;
    leg.add(k.at(k.cyl(legR * 1.15, legR, half, furMat, 6, 0.005), 0, -half / 2, 0));
    const knee = k.pivot(`knee${n}`, 0, -half, 0);
    knee.add(k.at(k.cyl(legR, legR * 0.95, half, furMat, 6, 0.005), 0, -half / 2, 0));
    knee.add(k.at(k.scl(k.ball(legR * 1.4, pawMat, 1, 0.005), 1, 0.6, 1.3), 0, -half, legR * 0.4));
    leg.add(knee);
    body.add(leg);
    legs[n] = { leg, knee };
  }

  const neck = k.pivot('neck', 0, height * 0.3, len * 0.45);
  body.add(neck);
  neck.add(k.at(k.box(width * 0.55, height * 0.6, height * 0.45, furMat, 0.01), 0, height * 0.1, 0));
  const head = k.pivot('head', 0, height * 0.45, headSize * 0.25);
  neck.add(head);
  head.add(k.box(headSize, headSize * 0.9, headSize, furMat, 0.02, 2));
  // snout + nose + jaw (tongue sticking out)
  head.add(k.at(k.box(headSize * 0.5, headSize * 0.32, snout, bellyMat, 0.008), 0, -headSize * 0.18, headSize * 0.5 + snout / 2));
  head.add(k.at(k.ball(headSize * 0.09, noseMat, 1), 0, -headSize * 0.06, headSize * 0.5 + snout));
  const jaw = k.pivot('jaw', 0, -headSize * 0.33, headSize * 0.45);
  head.add(jaw);
  jaw.add(k.at(k.box(headSize * 0.42, headSize * 0.1, snout * 0.95, bellyMat, 0.006), 0, -0.01, snout / 2));
  jaw.add(k.at(k.scl(k.ball(headSize * 0.1, k.mat('tongue', '#ff7a95'), 1), 1, 0.35, 1.4), 0, -0.01, snout * 0.95));
  const eyes = k.eyes(head, { y: headSize * 0.12, z: headSize * 0.48, spacing: headSize * 0.24, size: eyeSize });
  // ears
  const earNodes = {};
  for (const [n, x] of [['L', 1], ['R', -1]]) {
    const ear = k.pivot(`ear${n}`, x * headSize * 0.3, headSize * 0.42, -headSize * 0.05);
    if (ears === 'none') { /* empty pivot so animations still work */ } else if (ears === 'round') ear.add(k.at(k.scl(k.ball(headSize * 0.16, furMat, 1), 1, 1, 0.5), 0, headSize * 0.08, 0));
    else {
      ear.add(k.at(k.cone(headSize * 0.14, headSize * 0.32, furMat, 4), 0, headSize * 0.14, 0));
      if (earInnerMat) ear.add(k.at(k.cone(headSize * 0.08, headSize * 0.2, earInnerMat, 4), 0, headSize * 0.11, headSize * 0.05));
    }
    ear.rotation.z = -x * 0.15;
    head.add(ear);
    earNodes[n] = ear;
  }
  // tail
  const tailA = k.pivot('tail', 0, height * 0.25, -len * 0.5);
  const tailB = k.pivot('tail2', 0, 0, -0.14);
  tailA.add(tailB);
  body.add(tailA);
  if (tail === 'fluffy') {
    tailA.add(k.at(k.rot(k.cyl(0.05, 0.07, 0.16, furMat, 6, 0.01), Math.PI / 2, 0, 0), 0, 0, -0.07));
    tailB.add(k.at(k.rot(k.cone(0.08, 0.22, bellyMat, 6, 0.01), -Math.PI / 2, 0, 0), 0, 0, -0.1));
  } else if (tail === 'thin') {
    tailA.add(k.at(k.rot(k.cyl(0.025, 0.035, 0.16, furMat, 5), Math.PI / 2, 0, 0), 0, 0, -0.07));
    tailB.add(k.at(k.rot(k.cone(0.03, 0.18, furMat, 5), -Math.PI / 2, 0, 0), 0, 0, -0.09));
  }
  tailA.rotation.x = 0.5; // tail up

  const rig = { body, neck, head, jaw, legs, ears: earNodes, tail: tailA, tail2: tailB, eyes, dims: { legLen, height, width, len } };
  return { root, rig };
}

const blinkEyes = (rig, a) => rig.eyes.forEach((e) => { e.scale.y = Math.max(0.08, 1 - a); });
const LEGS = ['FL', 'FR', 'BL', 'BR'];

export const QUAD_ANIMS = {
  idle: {
    label: '대기 (꼬리 흔들기)',
    duration: 2.4,
    apply(rig, u) {
      const w = u * TAU;
      rig.body.scale.y = 1 + Math.sin(w) * 0.02;
      rig.tail.rotation.y += Math.sin(w * 4) * 0.5;
      rig.tail2.rotation.y += Math.sin(w * 4 - 1) * 0.4;
      rig.head.rotation.z += Math.sin(w) * 0.15;
      rig.ears.L.rotation.z += Math.pow(Math.sin(w * 2), 12) * 0.4;
      blinkEyes(rig, blink(u, [0.4]));
    },
  },
  gallop: {
    label: '달리기',
    duration: 0.55,
    apply(rig, u) {
      const w = u * TAU;
      const ph = { FL: 0, FR: 0.4, BL: Math.PI + 0.2, BR: Math.PI + 0.6 };
      for (const n of LEGS) {
        const s = Math.sin(w + ph[n]);
        rig.legs[n].leg.rotation.x += s * 0.7;
        rig.legs[n].knee.rotation.x += (n[0] === 'F' ? 1 : -1) * Math.max(0, -s) * 0.8; // paw tucks while the leg swings back
      }
      rig.body.position.y += Math.abs(Math.sin(w)) * 0.06;
      rig.body.rotation.x += Math.sin(w) * 0.1;
      rig.head.rotation.x -= Math.sin(w) * 0.12;
      rig.tail.rotation.x += 0.3 + Math.sin(w) * 0.2;
      for (const e of ['L', 'R']) rig.ears[e].rotation.x -= 0.4;
      rig.jaw.rotation.x += 0.2;
    },
  },
  pounce: {
    label: '덮치기',
    duration: 1.2,
    apply(rig, u) {
      const crouch = keys(u, [[0, 0], [0.3, 1], [0.4, 0], [0.7, 0], [0.78, 0.6], [1, 0]]);
      const air = Math.sin(Math.PI * Math.min(1, Math.max(0, (u - 0.35) / 0.35)));
      rig.body.position.y += air * 0.3 - crouch * 0.1;
      rig.body.position.z += air * 0.25;
      rig.body.rotation.x += air * 0.25 - crouch * 0.15;
      for (const n of LEGS) {
        const front = n[0] === 'F';
        rig.legs[n].leg.rotation.x += crouch * (front ? -0.3 : 0.4) + air * (front ? -0.9 : 0.8);
        rig.legs[n].knee.rotation.x += crouch * (front ? -0.6 : 0.7);
      }
      rig.tail.rotation.x += crouch * 0.6;
      rig.tail.rotation.y += Math.sin(u * TAU * 6) * crouch * 0.5; // excited wiggle
      rig.jaw.rotation.x += air * 0.5;
    },
  },
  hit: {
    label: '피격',
    duration: 0.6,
    loop: false,
    apply(rig, u) {
      const h = keys(u, [[0, 0], [0.15, 1], [1, 0]]);
      rig.body.rotation.z += h * 0.25;
      rig.body.position.x -= h * 0.08;
      rig.body.position.z -= h * 0.06;
      rig.head.rotation.x -= h * 0.3;
      for (const e of ['L', 'R']) rig.ears[e].rotation.x -= h * 0.8;
      rig.tail.rotation.x -= h * 0.9;
      blinkEyes(rig, h * 0.85);
    },
  },
  death: {
    label: '옆으로 쓰러짐',
    duration: 1.3,
    loop: false,
    apply(rig, u) {
      const f = keys(u, [[0, 0], [0.15, -0.1], [0.6, 1], [0.72, 0.94], [0.85, 1], [1, 1]]);
      const d = rig.dims;
      rig.body.rotation.z += f * (Math.PI / 2 - 0.05);
      rig.body.position.y -= f * (d.legLen + d.height * 0.45 - d.width * 0.5);
      rig.body.position.x += f * 0.05;
      for (const n of LEGS) rig.legs[n].leg.rotation.x += f * (n[0] === 'F' ? -0.3 : 0.3);
      rig.head.rotation.z -= f * 0.3;
      rig.tail.rotation.x -= f * 0.6;
      blinkEyes(rig, smooth(u / 0.5) * 0.92);
    },
  },
  // Rises out of a hole in the ground (sewer, burrow...).
  emerge: {
    label: '구멍에서 기어나오기',
    duration: 1.4,
    loop: false,
    apply(rig, u) {
      const up = keys(u, [[0, 0], [0.6, 1.05], [0.8, 0.97], [1, 1]]);
      const d = rig.dims;
      rig.body.position.y -= (1 - up) * (d.legLen + d.height * 1.5);
      rig.body.rotation.x -= (1 - up) * 0.9;
      rig.jaw.rotation.x += Math.sin(Math.PI * clamp01(u)) * 0.5;
      blinkEyes(rig, u < 0.4 ? 0.9 : 0);
    },
  },
  howl: {
    label: '하울링',
    duration: 2.6,
    apply(rig, u) {
      const sit = keys(u, [[0, 0], [0.2, 1], [0.85, 1], [1, 0]]);
      const sing = keys(u, [[0, 0], [0.3, 0], [0.4, 1], [0.8, 1], [0.9, 0], [1, 0]]);
      rig.body.rotation.x -= sit * 0.55;
      rig.body.position.y -= sit * 0.1;
      rig.body.position.z += sit * 0.08;
      for (const n of ['BL', 'BR']) {
        rig.legs[n].leg.rotation.x -= sit * 1.0;
        rig.legs[n].knee.rotation.x += sit * 1.4;
      }
      for (const n of ['FL', 'FR']) rig.legs[n].leg.rotation.x += sit * 0.55;
      rig.neck.rotation.x -= sing * 0.5;
      rig.head.rotation.x -= sing * 0.5 - sit * 0.15;
      rig.jaw.rotation.x += sing * (0.45 + Math.sin(u * TAU * 8) * 0.05);
      rig.tail.rotation.y += Math.sin(u * TAU * 3) * 0.3;
      blinkEyes(rig, sing * 0.9);
    },
  },
};
