// Parametric low-poly zombie.
// createZombie(params) builds a THREE.Group from plain parameters, so changing
// a value and calling it again rebuilds the model (size, colour, variant...).
import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export const DEFAULT_PARAMS = {
  seed: 7,
  height: 1.0, // overall scale (1 = ~1.8 m)
  bulk: 1.0, // body width / limb thickness
  hunch: 0.25, // forward lean of the spine (radians)
  armReach: 0.85, // 0 = arms hanging, 1 = arms straight forward
  headTilt: 0.25, // sideways head tilt (radians)
  jawOpen: 0.25, // 0..0.6
  rot: 0.5, // vertex jitter: how lumpy / decayed the body looks
  missingArm: 'none', // 'none' | 'left' | 'right'
  tornClothes: true,
  wounds: 4, // number of wound patches
  hair: 0.5, // 0 = bald, 1 = messy hair
  skinColor: '#7a9a5a',
  shirtColor: '#5b6b80',
  pantsColor: '#4a3b2e',
  hairColor: '#2b2620',
  eyeColor: '#d8ff3a',
  eyeGlow: 1.5,
  bloodColor: '#6e1212',
};

export const PRESETS = {
  walker: {},
  brute: {
    height: 1.15, bulk: 1.55, hunch: 0.35, armReach: 0.55, headTilt: 0.1,
    jawOpen: 0.35, skinColor: '#5f7a48', shirtColor: '#6b5d4a', pantsColor: '#2f3540',
    eyeColor: '#ff5a1f', hair: 0.1, wounds: 6,
  },
  runner: {
    height: 0.95, bulk: 0.75, hunch: 0.55, armReach: 1.0, headTilt: 0.35,
    jawOpen: 0.55, skinColor: '#9aa58a', shirtColor: '#8a2c2c', pantsColor: '#3b4a5c',
    eyeColor: '#ff2b2b', eyeGlow: 2.5, hair: 0.8, rot: 0.7,
  },
  rotten: {
    bulk: 0.9, hunch: 0.4, armReach: 0.7, headTilt: 0.45, jawOpen: 0.6,
    rot: 1.0, missingArm: 'left', wounds: 10, hair: 0.25,
    skinColor: '#6d7d4d', shirtColor: '#4d5a3d', pantsColor: '#3a3127', eyeColor: '#b7ff00',
  },
};

// Small deterministic RNG so the same seed always gives the same zombie.
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createZombie(input = {}) {
  const p = { ...DEFAULT_PARAMS, ...input };
  const rng = mulberry32(p.seed);
  const rand = (a, b) => a + (b - a) * rng();
  const b = p.bulk;

  const mats = {};
  const mat = (name, color, extra = {}) =>
    (mats[name] ??= new THREE.MeshStandardMaterial({
      name, color, flatShading: true, roughness: 0.9, metalness: 0, ...extra,
    }));
  const skin = mat('skin', p.skinColor);
  const shirt = mat('shirt', p.shirtColor);
  const pants = mat('pants', p.pantsColor);
  const hairMat = mat('hair', p.hairColor);
  const blood = mat('blood', p.bloodColor, { roughness: 0.4 });
  const dark = mat('mouth', '#1a0b0b');
  const bone = mat('bone', '#d9d2b6');
  const teethMat = mat('teeth', '#c9be8a');
  const eyeMat = mat('eyes', p.eyeColor, { emissive: p.eyeColor, emissiveIntensity: p.eyeGlow });

  // Low-poly mesh helper: welds vertices, then jitters them for a lumpy look.
  const jitterGeo = (geo, amount) => {
    geo.deleteAttribute('normal');
    geo.deleteAttribute('uv');
    geo = mergeVertices(geo);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      pos.setXYZ(i,
        pos.getX(i) + rand(-amount, amount),
        pos.getY(i) + rand(-amount, amount),
        pos.getZ(i) + rand(-amount, amount));
    }
    geo.computeVertexNormals();
    return geo;
  };
  const mesh = (geo, material, jitter = 0) => {
    const m = new THREE.Mesh(jitter > 0 ? jitterGeo(geo, jitter * p.rot) : geo, material);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  };
  const box = (w, h, d, material, jitter = 0.012, seg = 1) =>
    mesh(new THREE.BoxGeometry(w, h, d, seg, seg, seg), material, jitter);
  const at = (obj, x, y, z) => (obj.position.set(x, y, z), obj);
  const pivot = (name, x, y, z) => at(Object.assign(new THREE.Group(), { name }), x, y, z);

  const root = new THREE.Group();
  root.name = 'Zombie';
  root.scale.setScalar(p.height);

  // ---- Hips & legs ----------------------------------------------------------
  const hips = pivot('hips', 0, 0.95, 0);
  root.add(hips);

  const legs = {};
  for (const side of [-1, 1]) {
    const name = side < 0 ? 'R' : 'L';
    const leg = pivot(`leg${name}`, side * 0.11 * b, 0, 0);
    leg.add(at(box(0.17 * b, 0.47, 0.19 * b, pants, 0.015), 0, -0.22, 0));
    const knee = pivot(`knee${name}`, 0, -0.45, 0);
    knee.add(at(box(0.15 * b, 0.42, 0.16 * b, pants, 0.015), 0, -0.2, 0));
    // torn trouser leg showing a bit of skin
    if (p.tornClothes && rng() < 0.5) {
      knee.add(at(box(0.11 * b, 0.12, 0.12 * b, skin, 0.01), 0, -0.36, 0));
    }
    knee.add(at(box(0.15 * b, 0.08, 0.27, mat('shoes', '#231d18'), 0.012), 0, -0.45, 0.05));
    leg.add(knee);
    hips.add(leg);
    legs[name] = { leg, knee };
  }

  // ---- Spine, torso ---------------------------------------------------------
  const spine = pivot('spine', 0, 0, 0);
  hips.add(spine);
  spine.add(at(box(0.38 * b, 0.2, 0.23 * b, pants, 0.015), 0, 0.02, 0));
  const torsoH = 0.55;
  spine.add(at(box(0.44 * b, torsoH, 0.26 * b, shirt, 0.025, 2), 0, 0.37, 0));
  // belly skin visible through the torn shirt
  if (p.tornClothes) {
    spine.add(at(box(0.3 * b, 0.12, 0.2 * b, skin, 0.015), 0, 0.12, 0.05));
    for (let i = 0; i < 6; i++) {
      const shard = mesh(new THREE.ConeGeometry(rand(0.03, 0.05) * b, rand(0.08, 0.16), 3), shirt);
      shard.rotation.x = Math.PI; // point down
      spine.add(at(shard, (-0.18 + i * 0.072) * b, 0.06, (rng() < 0.5 ? -1 : 1) * 0.11 * b));
    }
    // exposed ribs on the chest
    for (let i = 0; i < 3; i++) {
      spine.add(at(box(0.16 * b, 0.022, 0.02, bone, 0), -0.08 * b, 0.42 + i * 0.05, 0.135 * b));
    }
    spine.add(at(box(0.2 * b, 0.17, 0.012, dark, 0), -0.08 * b, 0.47, 0.128 * b));
  }
  // wound patches on the torso
  for (let i = 0; i < p.wounds; i++) {
    const w = box(rand(0.04, 0.09), rand(0.03, 0.08), 0.02, blood, 0.008);
    const front = rng() < 0.7;
    at(w, rand(-0.18, 0.18) * b, rand(0.15, 0.6), (front ? 1 : -1) * 0.132 * b);
    w.rotation.z = rand(-0.6, 0.6);
    spine.add(w);
  }

  // ---- Neck & head ----------------------------------------------------------
  const neck = pivot('neck', 0, 0.65, 0.01);
  spine.add(neck);
  neck.add(at(mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.12, 5), skin, 0.008), 0, 0.04, 0));
  const head = pivot('head', 0, 0.09, 0.01);
  neck.add(head);
  head.add(at(box(0.26, 0.28, 0.27, skin, 0.018, 2), 0, 0.17, 0));
  // brow ridge and nose
  head.add(at(box(0.25, 0.04, 0.05, skin, 0.01), 0, 0.235, 0.125));
  head.add(at(mesh(new THREE.ConeGeometry(0.03, 0.07, 3), skin), 0, 0.18, 0.15));
  head.children.at(-1).rotation.x = Math.PI / 2;
  // eyes: dark sockets + glowing pupils (one slightly droopy)
  for (const side of [-1, 1]) {
    const droop = side < 0 ? rand(0, 0.025) : 0;
    head.add(at(box(0.075, 0.05, 0.02, dark, 0), side * 0.06, 0.2 - droop, 0.135));
    head.add(at(box(0.045, 0.03, 0.02, eyeMat, 0), side * 0.06, 0.2 - droop, 0.142));
  }
  // ears (one may be missing)
  for (const side of [-1, 1]) {
    if (rng() < 0.25) continue;
    head.add(at(box(0.03, 0.08, 0.05, skin, 0.01), side * 0.14, 0.17, 0));
  }
  // mouth & upper teeth
  head.add(at(box(0.16, 0.05, 0.03, dark, 0), 0, 0.075, 0.125));
  for (let i = 0; i < 5; i++) {
    if (rng() < 0.2) continue; // missing tooth
    head.add(at(box(0.022, rand(0.02, 0.035), 0.015, teethMat, 0), -0.05 + i * 0.025, 0.088, 0.135));
  }
  // jaw
  const jaw = pivot('jaw', 0, 0.06, -0.02);
  head.add(jaw);
  jaw.add(at(box(0.22, 0.07, 0.25, skin, 0.015), 0, -0.03, 0.03));
  for (let i = 0; i < 4; i++) {
    if (rng() < 0.25) continue;
    jaw.add(at(box(0.02, 0.025, 0.015, teethMat, 0), -0.04 + i * 0.027, 0.012, 0.145));
  }
  // hair tufts
  const tufts = Math.round(p.hair * 14);
  for (let i = 0; i < tufts; i++) {
    const t = mesh(new THREE.ConeGeometry(rand(0.025, 0.045), rand(0.06, 0.14), 4), hairMat);
    at(t, rand(-0.11, 0.11), 0.31, rand(-0.12, 0.09));
    t.rotation.set(rand(-0.6, 0.6), rand(0, Math.PI), rand(-0.6, 0.6));
    head.add(t);
  }
  // a head wound
  if (p.wounds > 2) head.add(at(box(0.07, 0.05, 0.02, blood, 0.008), rand(-0.07, 0.07), 0.27, 0.13));

  // ---- Arms -----------------------------------------------------------------
  const arms = {};
  for (const side of [-1, 1]) {
    const name = side < 0 ? 'R' : 'L';
    const shoulder = pivot(`arm${name}`, side * (0.22 * b + 0.05), 0.6, 0);
    spine.add(shoulder);
    shoulder.add(at(box(0.14 * b, 0.15, 0.14 * b, shirt, 0.015), 0, -0.06, 0));

    const missing = (p.missingArm === 'left' && name === 'L') || (p.missingArm === 'right' && name === 'R');
    if (missing) {
      // stump: bone poking out of a bloody sleeve
      shoulder.add(at(box(0.1 * b, 0.04, 0.1 * b, blood, 0.01), 0, -0.14, 0));
      shoulder.add(at(mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.12, 5), bone), 0, -0.2, 0));
      arms[name] = { shoulder, elbow: null };
      continue;
    }
    shoulder.add(at(box(0.1 * b, 0.32, 0.1 * b, skin, 0.015), 0, -0.17, 0));
    const elbow = pivot(`elbow${name}`, 0, -0.32, 0);
    shoulder.add(elbow);
    elbow.add(at(box(0.09 * b, 0.3, 0.09 * b, skin, 0.015), 0, -0.15, 0));
    elbow.add(at(box(0.1 * b, 0.11, 0.05, skin, 0.01), 0, -0.34, 0));
    // claw-like fingers
    for (let f = 0; f < 3; f++) {
      const finger = mesh(new THREE.ConeGeometry(0.014, 0.08, 4), skin);
      finger.rotation.x = Math.PI;
      elbow.add(at(finger, (-0.03 + f * 0.03) * b, -0.43, 0));
    }
    if (rng() < 0.5) elbow.add(at(box(0.05, 0.06, 0.02, blood, 0.008), 0, -0.12, 0.05 * b));
    arms[name] = { shoulder, elbow };
  }

  // ---- Rest pose ------------------------------------------------------------
  const reach = -p.armReach * Math.PI * 0.47;
  const base = {
    hunch: p.hunch,
    headTilt: p.headTilt,
    jawOpen: p.jawOpen,
    armR: reach + rand(-0.1, 0.1),
    armL: reach + rand(-0.1, 0.1),
    elbow: -0.15 - p.armReach * 0.1,
  };
  root.userData.rig = { hips, spine, neck, head, jaw, legs, arms };
  root.userData.base = base;
  root.userData.params = p;
  setPose(root, 0, 0);
  return root;
}

// Applies the shambling walk cycle. `amount` 0 gives the rest pose.
export function setPose(zombie, time, amount = 1) {
  const { rig, base } = zombie.userData;
  const ph = time * 3.2;
  const s = Math.sin(ph);
  const a = amount;

  rig.legs.L.leg.rotation.x = s * 0.35 * a;
  rig.legs.R.leg.rotation.x = -s * 0.35 * a;
  rig.legs.L.knee.rotation.x = Math.max(0, -s) * 0.6 * a;
  rig.legs.R.knee.rotation.x = Math.max(0, s) * 0.6 * a;
  // drag one leg a little: the classic limp
  rig.legs.R.leg.rotation.z = 0.04;
  rig.legs.L.leg.rotation.z = -0.04;

  rig.hips.position.y = 0.95 - Math.abs(Math.cos(ph)) * 0.03 * a;
  rig.hips.rotation.y = s * 0.12 * a;
  rig.spine.rotation.x = base.hunch + Math.abs(s) * 0.05 * a;
  rig.spine.rotation.z = s * 0.08 * a;
  rig.spine.rotation.y = -s * 0.1 * a;

  rig.head.rotation.z = base.headTilt + Math.sin(ph * 0.5) * 0.12 * a;
  rig.head.rotation.x = 0.1 + Math.sin(ph * 0.7) * 0.08 * a;
  rig.jaw.rotation.x = base.jawOpen + Math.abs(Math.sin(time * 5)) * 0.15 * a;

  for (const name of ['L', 'R']) {
    const arm = rig.arms[name];
    const sign = name === 'L' ? 1 : -1;
    arm.shoulder.rotation.x = base[`arm${name}`] + Math.sin(ph * 2 + sign) * 0.06 * a;
    arm.shoulder.rotation.z = sign * (0.05 + Math.sin(ph) * 0.04 * a);
    if (arm.elbow) arm.elbow.rotation.x = base.elbow + Math.sin(ph * 2) * 0.05 * a;
  }
}

// Frees geometry and materials of a zombie that is no longer used.
export function disposeZombie(zombie) {
  const mats = new Set();
  zombie.traverse((o) => {
    if (o.isMesh) {
      o.geometry.dispose();
      mats.add(o.material);
    }
  });
  mats.forEach((m) => m.dispose());
}
