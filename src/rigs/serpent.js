// Segmented rig rising out of the ground (eels, sand worms, tentacles...).
// Joints: base > seg0 > seg1 > ... > head > jaw. The chain points up (+Y),
// the face looks +Z. `base` slides below ground to hide / emerge.
import { TAU, keys, blink, smooth } from '../core/monster.js';

export function buildSerpent(k, o) {
  const {
    segs = 6, segLen = 0.18, radius = 0.13, taper = 0.25, mats, headR = 0.2, eyeSize = 0.075,
    headScale = [1, 0.95, 1.05],
  } = o;
  const root = k.pivot('root');
  root.name = o.name ?? 'Monster';
  const base = k.pivot('base');
  root.add(base);
  const chain = [];
  let parent = base;
  for (let i = 0; i < segs; i++) {
    const t = i / (segs - 1);
    const r = radius * (1 - taper * t);
    const seg = k.pivot(`seg${i}`, 0, i === 0 ? -segLen * 0.5 : segLen, 0);
    seg.add(k.at(k.scl(k.ball(r, mats[i % mats.length], 1, 0.01), 1, (segLen / (2 * r)) * 1.35, 1), 0, segLen / 2, 0));
    parent.add(seg);
    chain.push(seg);
    parent = seg;
  }
  const head = k.pivot('head', 0, segLen, 0);
  parent.add(head);
  head.add(k.at(k.scl(k.ball(headR, mats[0], 2, 0.012), ...headScale), 0, headR * 0.7, 0));
  const jaw = k.pivot('jaw', 0, headR * 0.45, headR * 0.35);
  head.add(jaw);
  const eyes = k.eyes(head, { y: headR * 1.0, z: headR * 0.8, spacing: headR * 0.42, size: eyeSize });
  const rig = { base, chain, head, jaw, eyes, dims: { segs, segLen, height: segs * segLen + headR * 1.6 } };
  return { root, rig };
}

const blinkEyes = (rig, a) => rig.eyes.forEach((e) => { e.scale.y = Math.max(0.08, 1 - a); });

export const SERPENT_ANIMS = {
  idle: {
    label: '대기 (흔들흔들)',
    duration: 3,
    apply(rig, u) {
      const w = u * TAU;
      rig.chain.forEach((s, i) => {
        s.rotation.z += Math.sin(w + i * 0.7) * 0.1;
        s.rotation.x += Math.sin(w * 2 + i * 0.5) * 0.03;
      });
      rig.head.rotation.z -= Math.sin(w + rig.chain.length * 0.7) * 0.25;
      blinkEyes(rig, blink(u, [0.25, 0.7]));
    },
  },
  swim: {
    label: '헤엄치기',
    duration: 1.2,
    apply(rig, u) {
      const w = u * TAU;
      rig.chain.forEach((s, i) => {
        s.rotation.x += Math.sin(w - i * 0.9) * 0.18 + (i ? 0.06 : 0);
        s.rotation.z += Math.sin(w * 2 - i * 0.6) * 0.05;
      });
      rig.base.position.y += Math.sin(w) * 0.04;
      rig.head.rotation.x -= 0.25;
      rig.jaw.rotation.x += Math.abs(Math.sin(w)) * 0.1;
    },
  },
  strike: {
    label: '튀어나와 물기',
    duration: 1.3,
    apply(rig, u) {
      const coil = keys(u, [[0, 0], [0.35, 1], [0.45, -1], [0.7, -1], [1, 0]]);
      // coil > 0: lean back to wind up, coil < 0: lunge forward
      rig.chain.forEach((s) => { s.rotation.x -= coil * (coil > 0 ? 0.12 : 0.16); });
      rig.head.rotation.x += Math.max(0, -coil) * 0.3 - Math.max(0, coil) * 0.4;
      rig.jaw.rotation.x += Math.max(0, -coil) * (0.6 + Math.sin(u * TAU * 6) * 0.15);
      blinkEyes(rig, Math.max(0, coil) * 0.4);
    },
  },
  hit: {
    label: '피격',
    duration: 0.6,
    loop: false,
    apply(rig, u) {
      const h = keys(u, [[0, 0], [0.15, 1], [1, 0]]);
      rig.chain.forEach((s, i) => { s.rotation.x -= h * 0.12 * (i + 1) / rig.chain.length * 2; });
      rig.head.rotation.x -= h * 0.4;
      rig.base.position.y -= h * 0.05;
      blinkEyes(rig, h * 0.85);
    },
  },
  death: {
    label: '물속으로 가라앉기',
    duration: 1.8,
    loop: false,
    apply(rig, u) {
      const droop = keys(u, [[0, 0], [0.4, 1], [1, 1]]);
      const sink = keys(u, [[0, 0], [0.35, 0], [1, 1]]);
      rig.chain.forEach((s) => { s.rotation.x += droop * 0.25; s.rotation.z += droop * 0.05; });
      rig.base.position.y -= sink * rig.dims.height * 1.1;
      blinkEyes(rig, smooth(u / 0.4) * 0.92);
    },
  },
  emerge: {
    label: '쑥 튀어나오기',
    duration: 1.2,
    loop: false,
    apply(rig, u) {
      const up = keys(u, [[0, 0], [0.55, 1.08], [0.75, 0.96], [1, 1]]);
      rig.base.position.y -= (1 - up) * rig.dims.height * 1.1;
      rig.chain.forEach((s, i) => { s.rotation.z += Math.sin(u * TAU * 2 + i) * 0.12 * (1 - u); });
      blinkEyes(rig, u < 0.6 ? 0.9 : 0);
    },
  },
};
