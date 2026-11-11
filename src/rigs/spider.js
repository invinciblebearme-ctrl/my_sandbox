// Many-legged rig (spiders, bugs). Facing +Z.
// Joints: body > head, leg<i><L|R> > knee<i><L|R>  (i = 0 is the front pair)
import { TAU, keys, blink, smooth } from '../core/monster.js';

const LIFT = 2.214; // upper leg: outward and up
const DROP = 1.86; // knee bends the lower leg back down

export function buildSpider(k, o) {
  const {
    pairs = 4, bodyR = 0.22, abdomenR = 0.3, headR = 0.17, legLen = 0.5, legR = 0.03,
    bodyMat, legMat = bodyMat, headMat = bodyMat, eyeSize = 0.06,
  } = o;
  const upper = legLen * 0.5;
  const lower = legLen * 0.7;
  const bodyY = lower * Math.cos(LIFT - DROP) - upper * 0.6 + 0.02;
  const root = k.pivot('root');
  root.name = o.name ?? 'Monster';
  const body = k.pivot('body', 0, bodyY, 0);
  root.add(body);
  body.add(k.scl(k.ball(bodyR, bodyMat, 1, 0.01), 1, 0.8, 1));
  body.add(k.at(k.scl(k.ball(abdomenR, bodyMat, 1, 0.015), 1, 0.85, 1.1), 0, abdomenR * 0.35, -bodyR - abdomenR * 0.7));
  const head = k.pivot('head', 0, bodyR * 0.2, bodyR * 0.85);
  head.add(k.at(k.ball(headR, headMat, 1, 0.01), 0, 0, headR * 0.5));
  body.add(head);
  const eyes = k.eyes(head, { y: headR * 0.35, z: headR * 1.35, spacing: headR * 0.45, size: eyeSize });

  const legs = [];
  for (let i = 0; i < pairs; i++) {
    const t = pairs === 1 ? 0 : i / (pairs - 1); // 0 front .. 1 back
    for (const [n, side] of [['L', 1], ['R', -1]]) {
      const leg = k.pivot(`leg${i}${n}`, side * bodyR * 0.8, 0, bodyR * (0.5 - t));
      leg.add(k.at(k.cyl(legR * 1.2, legR, upper, legMat, 5, 0.004), 0, -upper / 2, 0));
      const knee = k.pivot(`knee${i}${n}`, 0, -upper, 0);
      knee.add(k.ball(legR * 1.5, legMat, 0));
      knee.add(k.at(k.cyl(legR, legR * 0.5, lower, legMat, 5, 0.004), 0, -lower / 2, 0));
      leg.add(knee);
      leg.rotation.set(0, side * (0.7 - t * 1.4), side * LIFT);
      knee.rotation.z = -side * DROP;
      body.add(leg);
      legs.push({ leg, knee, i, side, group: (i + (side > 0 ? 0 : 1)) % 2 });
    }
  }
  return { root, rig: { body, head, legs, eyes, dims: { bodyY, pairs } } };
}

const blinkEyes = (rig, a) => rig.eyes.forEach((e) => { e.scale.y = Math.max(0.08, 1 - a); });

export const SPIDER_ANIMS = {
  idle: {
    label: '대기 (다리 톡톡)',
    duration: 2.4,
    apply(rig, u) {
      const w = u * TAU;
      rig.body.position.y += Math.sin(w) * 0.01;
      rig.legs.forEach((l) => { l.knee.rotation.z += l.side * Math.pow(Math.sin(w * 2 + l.i * 1.3 + l.side), 16) * 0.25; });
      rig.head.rotation.y += Math.sin(w) * 0.15;
      blinkEyes(rig, blink(u, [0.3, 0.75]));
    },
  },
  scuttle: {
    label: '종종걸음',
    duration: 0.5,
    apply(rig, u) {
      const w = u * TAU;
      rig.legs.forEach((l) => {
        const ph = l.group ? Math.PI : 0;
        const s = Math.sin(w + ph);
        l.leg.rotation.y += l.side * s * 0.3;
        l.leg.rotation.z += l.side * Math.max(0, Math.cos(w + ph)) * 0.35;
      });
      rig.body.position.y += Math.abs(Math.sin(w * 2)) * 0.015;
      rig.body.rotation.z += Math.sin(w) * 0.04;
    },
  },
  stab: {
    label: '앞다리 찌르기',
    duration: 1.2,
    apply(rig, u) {
      const rear = keys(u, [[0, 0], [0.35, 1], [0.5, 0.2], [0.7, 0.2], [1, 0]]);
      const strike = keys(u, [[0, 0], [0.35, 0], [0.48, 1], [0.7, 1], [1, 0]]);
      rig.body.rotation.x -= rear * 0.45 - strike * 0.1;
      rig.body.position.y += rear * 0.08;
      rig.legs.filter((l) => l.i === 0).forEach((l) => {
        l.leg.rotation.z += l.side * rear * 0.6;
        l.leg.rotation.y -= l.side * (rear * 0.3 + strike * 0.5);
        l.knee.rotation.z += l.side * strike * 0.6;
      });
      blinkEyes(rig, strike > 0.9 ? 0.5 : 0);
    },
  },
  hit: {
    label: '피격',
    duration: 0.6,
    loop: false,
    apply(rig, u) {
      const h = keys(u, [[0, 0], [0.15, 1], [1, 0]]);
      rig.body.position.z -= h * 0.08;
      rig.body.rotation.x += h * 0.2;
      rig.legs.forEach((l) => { l.knee.rotation.z -= l.side * h * 0.4; });
      blinkEyes(rig, h * 0.85);
    },
  },
  curl: {
    label: '뒤집혀 다리 오므리기',
    duration: 1.4,
    loop: false,
    apply(rig, u) {
      const flip = keys(u, [[0, 0], [0.2, 0.1], [0.6, 1], [0.7, 0.95], [0.8, 1], [1, 1]]);
      const curl = smooth(u / 0.9);
      rig.body.rotation.z += flip * Math.PI;
      rig.body.position.y += Math.sin(flip * Math.PI) * 0.2 + flip * 0.05;
      rig.legs.forEach((l) => {
        l.leg.rotation.z -= l.side * curl * 0.9;
        l.knee.rotation.z -= l.side * curl * 0.6;
      });
      blinkEyes(rig, curl * 0.92);
    },
  },
};
