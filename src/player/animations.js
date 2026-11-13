// Player animations. Clip names are what Unity plays (see models/items.json for
// which clips go with each item).
//
// Axis notes (player faces +Z):
//   arm.rotation.x < 0   -> raise the arm forward / up (-PI/2 = straight ahead)
//   elbow.rotation.x < 0 -> bend the forearm up
//   arm.rotation.z: + moves the LEFT arm outward, - moves the RIGHT arm outward
//   spine.rotation.y > 0 -> turn the upper body to the left
import { TAU, keys, clamp01 } from '../core/monster.js';

const sides = [['L', 1], ['R', -1]];
const lerp = (a, b, t) => a + (b - a) * t;
const breathe = (rig, u, amount = 1) => {
  rig.spine.rotation.x += Math.sin(u * TAU) * 0.02 * amount;
  rig.head.rotation.x += Math.sin(u * TAU + 1) * 0.02 * amount;
};
// Sets an arm pose (absolute) blended by `t` from the current pose.
function armPose(rig, n, { x = null, z = null, elbow = null, twist = null }, t = 1) {
  const a = rig.arms[n];
  if (x !== null) a.arm.rotation.x = lerp(a.arm.rotation.x, x, t);
  if (z !== null) a.arm.rotation.z = lerp(a.arm.rotation.z, z, t);
  if (elbow !== null) a.elbow.rotation.x = lerp(a.elbow.rotation.x, elbow, t);
  if (twist !== null) a.arm.rotation.y = lerp(a.arm.rotation.y, twist, t);
}
// Simple walk cycle on the legs only (used under upper-body poses too).
function legsWalk(rig, u, amount = 0.45) {
  const s = Math.sin(u * TAU);
  rig.legs.L.leg.rotation.x += s * amount;
  rig.legs.R.leg.rotation.x -= s * amount;
  rig.legs.L.knee.rotation.x += Math.max(0, -s) * amount * 1.4;
  rig.legs.R.knee.rotation.x += Math.max(0, s) * amount * 1.4;
  rig.hips.position.y -= Math.abs(Math.cos(u * TAU)) * 0.025;
}
// Pistol aim: right arm straight, left hand supporting.
function pistolAim(rig, t = 1) {
  armPose(rig, 'R', { x: -1.52, z: 0.12, elbow: 0 }, t);
  armPose(rig, 'L', { x: -1.3, z: -0.42, elbow: -0.35 }, t);
  rig.head.rotation.y += -0.08 * t;
}
// Rifle/shotgun aim: right forearm level at chest height (the gun follows it),
// left arm reaching further forward to hold the barrel.
function rifleAim(rig, t = 1) {
  armPose(rig, 'R', { x: -0.95, z: 0.3, elbow: -0.62 }, t);
  armPose(rig, 'L', { x: -1.4, z: -0.42, elbow: -0.12 }, t);
  rig.spine.rotation.y += 0.3 * t;
  rig.head.rotation.y -= 0.3 * t;
  rig.head.rotation.x += 0.05 * t;
}

// Staff held upright in front: forearm level and forward, so the staff (+Y of the grip) stands vertical.
function staffHold(rig, t = 1) {
  armPose(rig, 'R', { x: -0.32, z: 0.05, elbow: -1.25 }, t);
  armPose(rig, 'L', { x: -0.1, z: 0.12, elbow: -0.25 }, t);
}

// Fireball cast timing (fraction of castFireball): the fireball leaves the staff here.
export const CAST_RELEASE = 0.55;

export const PLAYER_ANIMS = {
  // ---- basics -----------------------------------------------------------------
  idle: {
    label: '대기',
    duration: 3,
    apply(rig, u) {
      breathe(rig, u);
      rig.head.rotation.y += Math.sin(u * TAU) * 0.25;
      for (const [n, s] of sides) rig.arms[n].arm.rotation.z += s * Math.sin(u * TAU) * 0.02;
    },
  },
  walk: {
    label: '걷기',
    duration: 1.1,
    apply(rig, u) {
      const s = Math.sin(u * TAU);
      legsWalk(rig, u, 0.45);
      rig.arms.L.arm.rotation.x -= s * 0.35;
      rig.arms.R.arm.rotation.x += s * 0.35;
      for (const [n] of sides) rig.arms[n].elbow.rotation.x -= 0.15;
      rig.spine.rotation.y += s * 0.08;
      rig.hips.rotation.y -= s * 0.06;
    },
  },
  run: {
    label: '달리기',
    duration: 0.7,
    apply(rig, u) {
      const s = Math.sin(u * TAU);
      rig.legs.L.leg.rotation.x += s * 0.85;
      rig.legs.R.leg.rotation.x -= s * 0.85;
      rig.legs.L.knee.rotation.x += 0.2 + Math.max(0, -s) * 1.3;
      rig.legs.R.knee.rotation.x += 0.2 + Math.max(0, s) * 1.3;
      rig.hips.position.y += Math.abs(Math.sin(u * TAU)) * 0.05 - 0.04;
      rig.spine.rotation.x += 0.22;
      rig.spine.rotation.y += s * 0.15;
      rig.head.rotation.x -= 0.15;
      rig.arms.L.arm.rotation.x -= s * 0.8;
      rig.arms.R.arm.rotation.x += s * 0.8;
      for (const [n] of sides) rig.arms[n].elbow.rotation.x -= 1.2;
    },
  },
  hit: {
    label: '피격',
    duration: 0.5,
    loop: false,
    apply(rig, u) {
      const h = keys(u, [[0, 0], [0.15, 1], [1, 0]]);
      rig.spine.rotation.x -= h * 0.35;
      rig.head.rotation.x -= h * 0.3;
      rig.hips.position.z -= h * 0.06;
      for (const [n, s] of sides) {
        rig.arms[n].arm.rotation.z += s * h * 0.35;
        rig.legs[n].knee.rotation.x += h * 0.2;
      }
    },
  },
  death: {
    label: '쓰러짐',
    duration: 1.6,
    loop: false,
    apply(rig, u) {
      const buckle = keys(u, [[0, 0], [0.15, 1], [0.5, 0.3], [1, 0.2]]);
      const f = keys(u, [[0, 0], [0.12, 0], [0.6, 1], [0.7, 0.93], [0.8, 1], [1, 1]]);
      rig.hips.rotation.x -= f * (Math.PI / 2 - 0.04);
      rig.hips.position.y -= buckle * 0.1 * (1 - f) + f * 0.8;
      for (const [n, s] of sides) {
        rig.legs[n].knee.rotation.x += buckle * 0.6 + f * 0.15;
        rig.legs[n].leg.rotation.x -= buckle * 0.3 * (1 - f) + f * 0.15;
        rig.arms[n].arm.rotation.z += s * f * 1.2;
      }
      rig.head.rotation.z += f * 0.35;
    },
  },
  pickup: {
    label: '아이템 줍기',
    duration: 1.1,
    loop: false,
    apply(rig, u) {
      const c = keys(u, [[0, 0], [0.4, 1], [0.55, 1], [1, 0]]);
      rig.hips.position.y -= c * 0.32;
      for (const [n] of sides) {
        rig.legs[n].leg.rotation.x -= c * 0.9;
        rig.legs[n].knee.rotation.x += c * 1.5;
      }
      rig.spine.rotation.x += c * 0.65;
      rig.head.rotation.x += c * 0.2;
      armPose(rig, 'R', { x: -0.55, z: 0.1, elbow: -0.15 }, c);
      rig.arms.R.hand.rotation.x += keys(u, [[0, 0], [0.45, 0], [0.55, -0.6], [1, 0]]); // grab
    },
  },

  // ---- guns -------------------------------------------------------------------
  aimPistol: {
    label: '권총 조준 (대기)',
    duration: 2,
    apply(rig, u) {
      breathe(rig, u, 0.5);
      pistolAim(rig);
      rig.arms.R.arm.rotation.x += Math.sin(u * TAU) * 0.015;
    },
  },
  shootPistol: {
    label: '권총 쏘기',
    duration: 0.5,
    apply(rig, u) {
      const kick = keys(u, [[0, 0], [0.08, 1], [0.5, 0], [1, 0]]);
      pistolAim(rig);
      rig.arms.R.arm.rotation.x -= kick * 0.2;
      rig.arms.R.elbow.rotation.x -= kick * 0.15;
      rig.arms.L.arm.rotation.x -= kick * 0.12;
      rig.spine.rotation.x -= kick * 0.05;
      rig.head.rotation.x -= kick * 0.05;
    },
  },
  aimRifle: {
    label: '장총 조준 (대기)',
    duration: 2,
    apply(rig, u) {
      breathe(rig, u, 0.5);
      rifleAim(rig);
    },
  },
  shootRifle: {
    label: '장총 쏘기 + 펌프',
    duration: 0.9,
    apply(rig, u) {
      const kick = keys(u, [[0, 0], [0.06, 1], [0.35, 0], [1, 0]]);
      const pump = keys(u, [[0, 0], [0.4, 0], [0.55, 1], [0.7, 0], [1, 0]]);
      rifleAim(rig);
      rig.spine.rotation.x -= kick * 0.12;
      rig.spine.rotation.y -= kick * 0.06;
      rig.arms.R.arm.rotation.x -= kick * 0.25;
      rig.arms.L.arm.rotation.x -= kick * 0.25;
      rig.hips.position.z -= kick * 0.04;
      rig.arms.L.elbow.rotation.x -= pump * 0.5;
      rig.arms.L.arm.rotation.x += pump * 0.25;
    },
  },

  // ---- melee ------------------------------------------------------------------
  meleeSwing: {
    label: '한손 휘두르기',
    duration: 0.8,
    apply(rig, u) {
      const up = keys(u, [[0, 0], [0.3, 1], [0.42, 0], [1, 0]]);
      const hit = keys(u, [[0, 0], [0.3, 0], [0.45, 1], [0.7, 0.8], [1, 0]]);
      armPose(rig, 'R', { x: -2.6, z: -0.35, elbow: -1.0 }, up);
      armPose(rig, 'R', { x: -0.55, z: 0.25, elbow: -0.1 }, hit);
      rig.spine.rotation.y += up * 0.45 - hit * 0.35;
      rig.spine.rotation.x += hit * 0.2;
      rig.legs.L.leg.rotation.x -= hit * 0.35;
      rig.legs.R.leg.rotation.x += hit * 0.2;
      rig.legs.L.knee.rotation.x += hit * 0.2;
      armPose(rig, 'L', { x: -0.4, z: 0.3 }, Math.max(up, hit));
    },
  },
  meleeHeavy: {
    label: '양손 내려찍기',
    duration: 1.2,
    apply(rig, u) {
      const up = keys(u, [[0, 0], [0.35, 1], [0.45, 0], [1, 0]]);
      const hit = keys(u, [[0, 0], [0.35, 0], [0.48, 1], [0.75, 1], [1, 0]]);
      for (const [n, s] of sides) {
        armPose(rig, n, { x: -2.9, z: -s * 0.25, elbow: -0.7 }, up);
        armPose(rig, n, { x: -0.8, z: -s * 0.3, elbow: -0.1 }, hit);
      }
      rig.spine.rotation.x += -0.3 * up + 0.45 * hit;
      rig.hips.position.y -= hit * 0.1;
      for (const [n] of sides) rig.legs[n].knee.rotation.x += hit * 0.4;
      rig.legs.L.leg.rotation.x -= hit * 0.45;
    },
  },

  // ---- throw / use --------------------------------------------------------------
  throw: {
    label: '던지기',
    duration: 1.0,
    loop: false,
    apply(rig, u) {
      const wind = keys(u, [[0, 0], [0.4, 1], [0.5, 0], [1, 0]]);
      const rel = keys(u, [[0, 0], [0.4, 0], [0.52, 1], [0.75, 0.7], [1, 0]]);
      armPose(rig, 'R', { x: -2.7, z: -0.5, elbow: -1.5 }, wind);
      armPose(rig, 'R', { x: -1.0, z: 0.2, elbow: -0.1 }, rel);
      armPose(rig, 'L', { x: -1.3, z: 0.1, elbow: -0.2 }, wind);
      armPose(rig, 'L', { x: -0.2, z: 0.3 }, rel);
      rig.spine.rotation.y += wind * 0.6 - rel * 0.45;
      rig.spine.rotation.x += -wind * 0.15 + rel * 0.25;
      rig.legs.L.leg.rotation.x -= (wind + rel) * 0.3;
      rig.legs.R.leg.rotation.x += rel * 0.3;
    },
  },
  useHeal: {
    label: '회복 아이템 사용 (마시기)',
    duration: 1.6,
    apply(rig, u) {
      const lift = keys(u, [[0, 0], [0.25, 1], [0.8, 1], [1, 0]]);
      armPose(rig, 'R', { x: -1.15, z: 0.45, elbow: -2.05 }, lift);
      rig.head.rotation.x -= keys(u, [[0, 0], [0.3, 0], [0.45, 0.35], [0.7, 0.35], [0.8, 0], [1, 0]]);
      rig.spine.rotation.x -= lift * 0.06;
      breathe(rig, u, 0.6);
    },
  },
  holdLight: {
    label: '불빛 비추며 살피기',
    duration: 3,
    apply(rig, u) {
      const look = Math.sin(u * TAU);
      armPose(rig, 'R', { x: -1.3, z: 0.1, elbow: -0.35 });
      rig.spine.rotation.y += look * 0.35;
      rig.head.rotation.y += look * 0.25;
      rig.arms.R.arm.rotation.x += Math.sin(u * TAU * 2) * 0.08;
      armPose(rig, 'L', { x: -0.3, z: 0.25, elbow: -0.6 });
      breathe(rig, u, 0.5);
    },
  },
  useSpecial: {
    label: '특수 아이템 사용 (들어 보이기)',
    duration: 1.4,
    apply(rig, u) {
      const lift = keys(u, [[0, 0], [0.25, 1], [0.8, 1], [1, 0]]);
      const swipe = clamp01((u - 0.35) / 0.35);
      armPose(rig, 'R', { x: -1.75, z: 0.2, elbow: -0.45 }, lift);
      rig.arms.R.arm.rotation.z -= Math.sin(swipe * Math.PI) * 0.35 * lift;
      rig.spine.rotation.y -= lift * 0.15;
      rig.head.rotation.x += lift * 0.08;
    },
  },

  // ---- magic (healing staff) ---------------------------------------------------------
  holdStaff: {
    label: '지팡이 들고 대기',
    duration: 3,
    apply(rig, u) {
      breathe(rig, u);
      staffHold(rig);
      rig.head.rotation.y += Math.sin(u * TAU) * 0.2;
      rig.arms.R.arm.rotation.x += Math.sin(u * TAU) * 0.03;
      // left hand drifts as if feeling for magic
      rig.arms.L.hand.rotation.z += Math.sin(u * TAU * 2) * 0.15;
    },
  },
  castFireball: {
    label: '치유 파이어볼 시전',
    duration: 1.3,
    loop: false,
    apply(rig, u) {
      // 0-0.45 raise the staff and gather power, 0.5 thrust (release), then recover
      const charge = keys(u, [[0, 0], [0.4, 1], [0.48, 1], [0.55, 0], [1, 0]]);
      const thrust = keys(u, [[0, 0], [0.42, 0], [0.52, 1], [0.75, 1], [1, 0]]);
      const rest = 1 - Math.max(charge, thrust);
      staffHold(rig, rest);
      armPose(rig, 'R', { x: -2.5, z: -0.15, elbow: -0.35 }, charge);
      armPose(rig, 'L', { x: -1.1, z: -0.3, elbow: -1.3 }, charge); // palm toward the orb
      armPose(rig, 'R', { x: -1.5, z: 0.05, elbow: -0.05 }, thrust);
      armPose(rig, 'L', { x: -1.45, z: -0.25, elbow: -0.1 }, thrust); // open palm pushes forward
      rig.arms.R.hand.rotation.x -= thrust * 0.6; // tip the orb toward the target
      rig.arms.L.hand.rotation.x += thrust * 0.9;
      rig.spine.rotation.x += -charge * 0.18 + thrust * 0.22;
      rig.spine.rotation.y += charge * 0.2 - thrust * 0.1;
      rig.head.rotation.x += charge * 0.1 - thrust * 0.1;
      rig.hips.position.y -= thrust * 0.05;
      rig.legs.L.leg.rotation.x -= thrust * 0.4;
      rig.legs.L.knee.rotation.x += thrust * 0.3;
      rig.legs.R.leg.rotation.x += thrust * 0.2;
      rig.arms.R.arm.rotation.z += Math.sin(u * TAU * 8) * 0.02 * charge; // trembling with power
    },
  },
  walkStaff: {
    label: '지팡이 짚으며 걷기',
    duration: 1.1,
    apply(rig, u) {
      const s = Math.sin(u * TAU);
      legsWalk(rig, u, 0.42);
      staffHold(rig);
      rig.arms.R.arm.rotation.x += s * 0.12; // staff swings with the steps
      rig.arms.L.arm.rotation.x -= s * 0.3;
      rig.spine.rotation.y += s * 0.06;
    },
  },

  // ---- moving while holding (lower body walks, upper body keeps the pose) ---------
  walkAimPistol: {
    label: '권총 조준하며 걷기',
    duration: 1.1,
    apply(rig, u) {
      legsWalk(rig, u, 0.4);
      pistolAim(rig);
      rig.arms.R.arm.rotation.x += Math.sin(u * TAU * 2) * 0.03;
    },
  },
  walkAimRifle: {
    label: '장총 조준하며 걷기',
    duration: 1.1,
    apply(rig, u) {
      legsWalk(rig, u, 0.4);
      rifleAim(rig);
      rig.spine.rotation.x += Math.sin(u * TAU * 2) * 0.02;
    },
  },
};
