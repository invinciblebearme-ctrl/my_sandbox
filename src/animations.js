// Procedural animations for the parametric zombie.
// Each animation: { label, duration (seconds per loop), apply(rig, u, params) }.
// `u` runs 0..1 over one loop and every motion uses whole-number frequencies of
// it, so loops are seamless (and can be baked into GLB clips).
// apply() starts from the rest pose and mostly ADDS rotations on top of it.
//
// Axis notes (zombie faces +Z):
//   rotation.x > 0 on spine/hips  -> lean forward
//   rotation.x < 0 on an arm/leg  -> swing it forward
//   rotation.x > 0 on a knee      -> bend the shin backwards

const TAU = Math.PI * 2;
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smooth = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); };
// 0 outside [a, b], 1 inside, with smooth ramps of length r.
const window01 = (u, a, b, r) => smooth((u - a) / r) * (1 - smooth((u - (b - r)) / r));
const sides = [['L', 1], ['R', -1]];

export const ANIMATIONS = {
  // Classic slow shuffle with arms reaching forward.
  shamble: {
    label: '비틀비틀 걷기',
    duration: 2.0,
    apply(rig, u) {
      const w = u * TAU;
      const s = Math.sin(w);
      rig.legs.L.leg.rotation.x += s * 0.35;
      rig.legs.R.leg.rotation.x -= s * 0.35;
      rig.legs.L.knee.rotation.x += Math.max(0, -s) * 0.6;
      rig.legs.R.knee.rotation.x += Math.max(0, s) * 0.6;
      rig.hips.position.y -= Math.abs(Math.cos(w)) * 0.03;
      rig.hips.rotation.y += s * 0.12;
      rig.spine.rotation.x += Math.abs(s) * 0.05;
      rig.spine.rotation.z += s * 0.08;
      rig.spine.rotation.y -= s * 0.1;
      rig.head.rotation.z += s * 0.12;
      rig.head.rotation.x += Math.sin(2 * w) * 0.06;
      rig.jaw.rotation.x += Math.abs(Math.sin(3 * w)) * 0.15;
      for (const [n, sign] of sides) {
        rig.arms[n].shoulder.rotation.x += Math.sin(2 * w + sign) * 0.06;
        rig.arms[n].shoulder.rotation.z += sign * s * 0.04;
        rig.arms[n].elbow.rotation.x += Math.sin(2 * w) * 0.05;
      }
    },
  },

  // Limping: one stiff leg is dragged, head twitches violently.
  lurch: {
    label: '절뚝이며 걷기',
    duration: 2.6,
    apply(rig, u) {
      const w = u * TAU;
      const s = Math.sin(w);
      const drag = Math.max(0, -s); // weight on the bad leg
      rig.legs.L.leg.rotation.x += s * 0.45;
      rig.legs.L.knee.rotation.x += Math.max(0, -s) * 0.7;
      rig.legs.R.leg.rotation.x -= s * 0.15; // stiff, no knee bend
      rig.legs.R.leg.rotation.z += drag * 0.12;
      rig.hips.position.y -= drag * 0.07;
      rig.hips.rotation.z -= drag * 0.12;
      rig.hips.rotation.y += s * 0.2;
      rig.spine.rotation.z += drag * 0.2 - 0.05;
      rig.spine.rotation.x += drag * 0.15;
      // sharp twitches
      const twitch = Math.pow(Math.sin(3 * w), 12);
      rig.head.rotation.z += twitch * 0.45 + s * 0.08;
      rig.head.rotation.y += Math.pow(Math.sin(2 * w + 1), 16) * 0.5;
      rig.jaw.rotation.x += Math.abs(Math.sin(2 * w)) * 0.2;
      for (const [n, sign] of sides) {
        rig.arms[n].shoulder.rotation.x += 0.35 + Math.sin(w + sign) * 0.15; // hang lower
        rig.arms[n].shoulder.rotation.z += sign * drag * 0.15;
        rig.arms[n].elbow.rotation.x += Math.sin(2 * w + sign) * 0.1;
      }
    },
  },

  // Fast, frantic sprint with flailing arms.
  sprint: {
    label: '전력 질주',
    duration: 0.7,
    apply(rig, u) {
      const w = u * TAU;
      const s = Math.sin(w);
      rig.legs.L.leg.rotation.x -= s * 0.85;
      rig.legs.R.leg.rotation.x += s * 0.85;
      rig.legs.L.knee.rotation.x += 0.25 + Math.max(0, s) * 1.2;
      rig.legs.R.knee.rotation.x += 0.25 + Math.max(0, -s) * 1.2;
      rig.hips.position.y += Math.abs(Math.sin(w)) * 0.06 - 0.06;
      rig.hips.rotation.y += s * 0.15;
      rig.spine.rotation.x += 0.2;
      rig.spine.rotation.y -= s * 0.25;
      rig.head.rotation.x -= 0.35; // keep looking ahead despite the hunch
      rig.head.rotation.z += Math.sin(2 * w) * 0.1;
      rig.jaw.rotation.x += Math.abs(Math.sin(2 * w)) * 0.25;
      rig.arms.L.shoulder.rotation.x += s * 0.75;
      rig.arms.R.shoulder.rotation.x -= s * 0.75;
      for (const [n, sign] of sides) {
        rig.arms[n].shoulder.rotation.z += sign * (0.15 + Math.sin(2 * w) * 0.1);
        rig.arms[n].elbow.rotation.x -= 0.6 + Math.sin(2 * w + sign) * 0.2;
      }
    },
  },

  // Two-handed overhead ground slam.
  smash: {
    label: '내려찍기',
    duration: 2.4,
    apply(rig, u) {
      let up = 0;
      let down = 0;
      if (u < 0.4) up = smooth(u / 0.4); // wind up
      else if (u < 0.48) { const a = Math.pow((u - 0.4) / 0.08, 2); up = 1 - a; down = a; } // slam
      else if (u < 0.7) down = 1; // impact, hold
      else down = 1 - smooth((u - 0.7) / 0.3); // recover
      const shake = u > 0.48 && u < 0.6 ? Math.sin(u * TAU * 40) * 0.03 * (1 - (u - 0.48) / 0.12) : 0;

      for (const [n, sign] of sides) {
        const sh = rig.arms[n].shoulder;
        const rest = sh.rotation.x;
        sh.rotation.x = rest + up * (-2.9 - rest) + down * (-0.7 - rest);
        sh.rotation.z += sign * -0.3 * (up + down);
        rig.arms[n].elbow.rotation.x += -0.6 * up + 0.1 * down;
      }
      rig.spine.rotation.x += -0.4 * up + 0.55 * down + shake;
      rig.head.rotation.x += -0.35 * up + 0.15 * down;
      rig.jaw.rotation.x += 0.35 * up + Math.abs(Math.sin(u * TAU * 3)) * 0.1;
      // squat into the hit
      rig.hips.position.y -= 0.12 * down + 0.02 * up;
      for (const [n] of sides) {
        rig.legs[n].leg.rotation.x -= 0.45 * down + 0.05 * up;
        rig.legs[n].knee.rotation.x += 0.8 * down + 0.1 * up;
      }
      // idle breathing between hits
      rig.spine.rotation.z += Math.sin(u * TAU) * 0.04;
    },
  },

  // Dragging itself along the ground with its arms.
  crawl: {
    label: '기어가기',
    duration: 2.2,
    apply(rig, u, p) {
      const w = u * TAU;
      const s = Math.sin(w);
      const legless = p.legs === 'none';
      // lie face down: torso along +Z, belly to the ground
      rig.hips.rotation.x = 1.38;
      rig.hips.position.y = legless ? 0.24 : 0.22;
      rig.hips.position.z = -0.35 + Math.max(0, Math.sin(w * 2 - 1)) * 0.05;
      rig.hips.rotation.y += s * 0.15; // roll side to side
      rig.spine.rotation.x = 0.05;
      rig.spine.rotation.z = 0;
      rig.head.rotation.x = -1.15 + Math.sin(2 * w) * 0.08; // look forward
      rig.head.rotation.z += s * 0.15;
      rig.jaw.rotation.x += Math.abs(Math.sin(2 * w)) * 0.25;
      for (const [n, sign] of sides) {
        const ph = sign * s; // arms alternate
        const sh = rig.arms[n].shoulder;
        sh.rotation.x = -2.0 - ph * 0.55;
        sh.rotation.z = sign * 0.35;
        rig.arms[n].elbow.rotation.x = -0.3 - Math.max(0, -ph) * 0.9;
      }
      // trailing legs twitch
      rig.legs.L.leg.rotation.x += 0.1 + s * 0.08;
      rig.legs.R.leg.rotation.x += 0.1 - s * 0.08;
      rig.legs.L.knee.rotation.x += 0.15 + Math.max(0, s) * 0.3;
      rig.legs.R.knee.rotation.x += 0.15 + Math.max(0, -s) * 0.3;
    },
  },

  // Heavy side-to-side waddle with a wobbling belly.
  waddle: {
    label: '뒤뚱뒤뚱',
    duration: 2.4,
    apply(rig, u) {
      const w = u * TAU;
      const s = Math.sin(w);
      rig.hips.rotation.z += s * 0.12;
      rig.hips.position.x += s * 0.04;
      rig.hips.position.y -= Math.abs(s) * 0.03;
      rig.spine.rotation.z -= s * 0.16;
      rig.spine.rotation.x -= 0.05; // lean back to carry the belly
      for (const [n, sign] of sides) {
        rig.legs[n].leg.rotation.z += sign * 0.1 - s * 0.12;
        rig.legs[n].leg.rotation.x += sign * s * 0.2;
        rig.legs[n].knee.rotation.x += Math.max(0, sign * -s) * 0.3;
        rig.arms[n].shoulder.rotation.z += sign * (0.45 + Math.sin(w + sign) * 0.08);
        rig.arms[n].shoulder.rotation.x += Math.sin(w) * 0.1 * sign;
      }
      const j = Math.sin(2 * w - 0.8); // jiggle lags behind the steps
      rig.belly.scale.set(1 - j * 0.05, 1 + j * 0.07, 1 - j * 0.04);
      rig.belly.position.x -= s * 0.02;
      rig.head.rotation.z += s * 0.12;
      rig.jaw.rotation.x += Math.abs(Math.sin(4 * w)) * 0.1;
    },
  },

  // Rears back, throws arms wide and screams, body shaking.
  scream: {
    label: '비명',
    duration: 3.2,
    apply(rig, u) {
      const inhale = window01(u, 0.2, 0.42, 0.1);
      const yell = window01(u, 0.38, 0.85, 0.07);
      const shake = Math.sin(u * TAU * 48) * 0.035 * yell;
      const sway = Math.sin(u * TAU) * (1 - yell);

      rig.spine.rotation.x += 0.25 * inhale - 0.45 * yell + shake;
      rig.spine.rotation.z += sway * 0.06;
      rig.neck.rotation.x += 0.2 * inhale - 0.35 * yell;
      rig.head.rotation.x += 0.3 * inhale - 0.6 * yell + shake * 2;
      rig.head.rotation.z += sway * 0.12 + shake;
      rig.jaw.rotation.x += 0.45 * yell + Math.abs(shake) * 4 - 0.15 * inhale;
      for (const [n, sign] of sides) {
        const sh = rig.arms[n].shoulder;
        sh.rotation.x += (-0.9 - sh.rotation.x) * yell * 0.6 + 0.2 * inhale;
        sh.rotation.z += sign * (1.15 * yell + 0.1 * inhale) + shake;
        rig.arms[n].elbow.rotation.x += -0.5 * yell + Math.sin(u * TAU * 2 + sign) * 0.05;
      }
      rig.hips.position.y -= 0.04 * inhale;
      for (const [n] of sides) rig.legs[n].knee.rotation.x += 0.12 * inhale;
    },
  },

  // Standing still: breathing, swaying and the occasional twitch.
  idle: {
    label: '대기',
    duration: 3.0,
    apply(rig, u) {
      const w = u * TAU;
      rig.spine.rotation.x += Math.sin(w) * 0.03;
      rig.spine.rotation.z += Math.sin(w) * 0.04;
      rig.head.rotation.z += Math.sin(w) * 0.08;
      rig.head.rotation.y += Math.pow(Math.sin(2 * w), 16) * 0.4;
      rig.jaw.rotation.x += Math.abs(Math.sin(w)) * 0.1;
      for (const [n, sign] of sides) {
        rig.arms[n].shoulder.rotation.x += 0.4 + Math.sin(w + sign) * 0.05;
      }
    },
  },
};
