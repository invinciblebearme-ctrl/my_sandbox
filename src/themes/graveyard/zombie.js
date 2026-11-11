// Parametric low-poly zombie.
// createZombie(params) builds a THREE.Group from plain parameters, so changing
// a value and calling it again rebuilds the model (size, colour, variant...).
// Animations live in ./animations.js; play them with setPose() from core/monster.js.
import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { mulberry32 } from '../../core/kit.js';
import { finalizeMonster } from '../../core/monster.js';
import { ANIMATIONS } from './animations.js';

// Which animation plays for each standard Unity clip name.
const BASE_CLIPS = { idle: 'idle', move: 'shamble', attack: 'bite', hit: 'hit', death: 'death' };
const clips = (over = {}) => ({ ...BASE_CLIPS, ...over });

export const DEFAULT_PARAMS = {
  seed: 7,
  clips: clips(),
  height: 1.0, // overall scale (1 = ~1.8 m)
  bulk: 1.0, // body width / limb thickness
  hunch: 0.25, // forward lean of the spine (radians)
  armReach: 0.85, // 0 = arms hanging, 1 = arms straight forward
  armLength: 1.0, // arm length multiplier
  neckLength: 0, // 0 = normal, 1 = long, unnatural neck
  headTilt: 0.25, // sideways head tilt (radians)
  jawOpen: 0.25, // 0..0.6
  belly: 0, // 0 = none, 1 = huge bloated belly
  legs: 'full', // 'full' | 'none' (torso only, for crawlers)
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

// Zombie types. Each one is just a set of parameters plus its own animation.
export const PRESETS = {
  walker: { clips: clips() },
  runner: {
    clips: clips({ move: 'sprint', attack: 'lunge' }), height: 0.95, bulk: 0.75, hunch: 0.55, armReach: 1.0, armLength: 1.1,
    headTilt: 0.35, jawOpen: 0.55, skinColor: '#9aa58a', shirtColor: '#8a2c2c',
    pantsColor: '#3b4a5c', eyeColor: '#ff2b2b', eyeGlow: 2.5, hair: 0.8, rot: 0.7,
  },
  brute: {
    clips: clips({ attack: 'smash' }), height: 1.15, bulk: 1.55, hunch: 0.35, armReach: 0.55, armLength: 1.15,
    headTilt: 0.1, jawOpen: 0.35, skinColor: '#5f7a48', shirtColor: '#6b5d4a',
    pantsColor: '#2f3540', eyeColor: '#ff5a1f', hair: 0.1, wounds: 6,
  },
  rotten: {
    clips: clips({ move: 'lurch' }), bulk: 0.9, hunch: 0.4, armReach: 0.7, headTilt: 0.45, jawOpen: 0.6,
    rot: 1.0, missingArm: 'left', wounds: 10, hair: 0.25,
    skinColor: '#6d7d4d', shirtColor: '#4d5a3d', pantsColor: '#3a3127', eyeColor: '#b7ff00',
  },
  crawler: {
    clips: clips({ idle: 'crawlIdle', move: 'crawl', attack: 'crawlBite', hit: 'crawlHit', death: 'crawlDeath' }), legs: 'none', bulk: 0.85, hunch: 0, armReach: 0.3, headTilt: 0.15,
    jawOpen: 0.45, rot: 0.9, wounds: 8, hair: 0.4, skinColor: '#8a9470',
    shirtColor: '#3d4a5a', eyeColor: '#e8ff4a',
  },
  bloater: {
    clips: clips({ move: 'waddle', attack: 'burp' }), belly: 1, height: 1.05, bulk: 1.35, hunch: 0.05, armReach: 0.2,
    headTilt: 0.15, jawOpen: 0.3, hair: 0.05, wounds: 5, skinColor: '#8c9a4a',
    shirtColor: '#b8ae8c', pantsColor: '#4a4a3a', eyeColor: '#ffd400',
  },
  screamer: {
    clips: clips({ special: 'scream' }), height: 1.1, bulk: 0.7, neckLength: 0.8, armLength: 1.25, hunch: 0.15,
    armReach: 0.3, headTilt: 0.2, jawOpen: 0.6, hair: 1, hairColor: '#111111',
    skinColor: '#b0b8a8', shirtColor: '#2a2a2a', pantsColor: '#1f1f24',
    eyeColor: '#9ad9ff', eyeGlow: 3, wounds: 3,
  },
};

// decorate(parts): optional callback used by other themes to add outfits and
// props (hats, guns, badges...) before the model is finalized.
export function createZombie(input = {}, decorate = null) {
  const p = { ghost: 0, ...DEFAULT_PARAMS, ...input };
  const rng = mulberry32(p.seed);
  const rand = (a, b) => a + (b - a) * rng();
  const b = p.bulk;
  const L = p.armLength;

  const mats = {};
  // ghost > 0: every surface glows faintly and turns see-through
  const ghostly = (color) => (p.ghost > 0
    ? { emissive: color, emissiveIntensity: 0.45 * p.ghost, transparent: true, opacity: 1 - 0.35 * p.ghost }
    : {});
  const mat = (name, color, extra = {}) =>
    (mats[name] ??= new THREE.MeshStandardMaterial({
      name, color, flatShading: true, roughness: 0.9, metalness: 0, ...ghostly(color), ...extra,
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
  root.name = p.name ?? 'Zombie';
  root.scale.setScalar(p.height);

  // ---- Hips & legs ----------------------------------------------------------
  const hips = pivot('hips', 0, 0.95, 0);
  root.add(hips);

  const legs = {};
  for (const side of [-1, 1]) {
    const name = side < 0 ? 'R' : 'L';
    const leg = pivot(`leg${name}`, side * 0.11 * b, 0, 0);
    const knee = pivot(`knee${name}`, 0, -0.45, 0);
    leg.add(knee);
    hips.add(leg);
    legs[name] = { leg, knee };
    if (p.legs === 'ghost') continue; // the misty tail is added below
    if (p.legs === 'none') {
      // ragged stump with a bone sticking out
      leg.add(at(box(0.17 * b, 0.12, 0.19 * b, pants, 0.02), 0, -0.05, 0));
      leg.add(at(box(0.15 * b, 0.03, 0.17 * b, blood, 0.01), 0, -0.12, 0));
      leg.add(at(mesh(new THREE.CylinderGeometry(0.02, 0.028, 0.1, 5), bone), 0, -0.17, 0));
      continue;
    }
    leg.add(at(box(0.17 * b, 0.47, 0.19 * b, pants, 0.015), 0, -0.22, 0));
    knee.add(at(box(0.15 * b, 0.42, 0.16 * b, pants, 0.015), 0, -0.2, 0));
    // torn trouser leg showing a bit of skin
    if (p.tornClothes && rng() < 0.5) {
      knee.add(at(box(0.11 * b, 0.12, 0.12 * b, skin, 0.01), 0, -0.36, 0));
    }
    knee.add(at(box(0.15 * b, 0.08, 0.27, mat('shoes', '#231d18'), 0.012), 0, -0.45, 0.05));
  }

  if (p.legs === 'ghost') {
    // misty tail instead of legs
    const tail = mesh(new THREE.ConeGeometry(0.22 * b, 0.75, 7), shirt, 0.02);
    tail.rotation.x = Math.PI;
    hips.add(at(tail, 0, -0.42, 0));
    const tip = mesh(new THREE.ConeGeometry(0.08 * b, 0.3, 5), shirt, 0.01);
    tip.rotation.set(Math.PI, 0, 0.5);
    hips.add(at(tip, 0.06, -0.85, -0.03));
  }

  // ---- Spine, torso ---------------------------------------------------------
  const spine = pivot('spine', 0, 0, 0);
  hips.add(spine);
  spine.add(at(box(0.38 * b, 0.2, 0.23 * b, pants, 0.015), 0, 0.02, 0));
  spine.add(at(box(0.44 * b, 0.55, 0.26 * b, shirt, 0.025, 2), 0, 0.37, 0));

  // bloated belly (its own pivot so animations can make it wobble)
  const belly = pivot('belly', 0, 0.26, 0.06 * b);
  spine.add(belly);
  if (p.belly > 0) {
    const r = 0.2 * b * (0.6 + 0.6 * p.belly);
    const blob = mesh(new THREE.IcosahedronGeometry(r, 1), skin, 0.03);
    blob.scale.set(1.05, 0.95, 1);
    belly.add(blob);
    // stretched shirt over the top half
    const cover = mesh(new THREE.IcosahedronGeometry(r * 1.02, 1), shirt, 0.02);
    cover.scale.set(1.08, 0.5, 1.02);
    belly.add(at(cover, 0, r * 0.45, 0));
    // pustules
    const pus = mat('pustules', '#c9d23a', { emissive: '#6b7a10', emissiveIntensity: 0.6, roughness: 0.3 });
    for (let i = 0; i < 4 + Math.round(p.belly * 6); i++) {
      const a = rand(-1.5, 1.5);
      const y = rand(-0.7, 0.3);
      const pz = mesh(new THREE.IcosahedronGeometry(rand(0.025, 0.05), 0), pus);
      belly.add(at(pz, Math.sin(a) * r * Math.sqrt(1 - y * y), y * r, Math.cos(a) * r * Math.sqrt(1 - y * y)));
    }
  }

  if (p.tornClothes) {
    spine.add(at(box(0.3 * b, 0.12, 0.2 * b, skin, 0.015), 0, 0.12, 0.05));
    for (let i = 0; i < 6; i++) {
      const shard = mesh(new THREE.ConeGeometry(rand(0.03, 0.05) * b, rand(0.08, 0.16), 3), shirt);
      shard.rotation.x = Math.PI; // point down
      spine.add(at(shard, (-0.18 + i * 0.072) * b, 0.06, (rng() < 0.5 ? -1 : 1) * 0.11 * b));
    }
    // exposed ribs on the chest (hidden behind a big belly)
    if (p.belly < 0.3) {
      for (let i = 0; i < 3; i++) {
        spine.add(at(box(0.16 * b, 0.022, 0.02, bone, 0), -0.08 * b, 0.42 + i * 0.05, 0.135 * b));
      }
      spine.add(at(box(0.2 * b, 0.17, 0.012, dark, 0), -0.08 * b, 0.47, 0.128 * b));
    }
  }
  // dragging spine/guts behind a legless torso
  if (p.legs === 'none') {
    spine.add(at(box(0.2 * b, 0.06, 0.15 * b, blood, 0.015), 0, -0.1, 0));
    for (let i = 0; i < 3; i++) {
      spine.add(at(box(0.05, 0.045, 0.05, bone, 0.006), 0, -0.13 - i * 0.06, -0.03));
    }
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
  const neckH = 0.12 + p.neckLength * 0.22;
  const neck = pivot('neck', 0, 0.65, 0.01);
  spine.add(neck);
  neck.add(at(mesh(new THREE.CylinderGeometry(0.055, 0.07, neckH, 5), skin, 0.008), 0, neckH / 2 - 0.02, 0));
  const head = pivot('head', 0, neckH - 0.03, 0.01);
  neck.add(head);
  head.add(at(box(0.26, 0.28, 0.27, skin, 0.018, 2), 0, 0.17, 0));
  // brow ridge and nose
  head.add(at(box(0.25, 0.04, 0.05, skin, 0.01), 0, 0.235, 0.125));
  const nose = mesh(new THREE.ConeGeometry(0.03, 0.07, 3), skin);
  nose.rotation.x = Math.PI / 2;
  head.add(at(nose, 0, 0.18, 0.15));
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
    const t = mesh(new THREE.ConeGeometry(rand(0.025, 0.045), rand(0.06, 0.14) * (1 + p.hair * 0.5), 4), hairMat);
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
    const elbow = pivot(`elbow${name}`, 0, -0.32 * L, 0);
    shoulder.add(elbow);
    arms[name] = { shoulder, elbow };

    const missing = (p.missingArm === 'left' && name === 'L') || (p.missingArm === 'right' && name === 'R');
    if (missing) {
      // stump: bone poking out of a bloody sleeve
      shoulder.add(at(box(0.1 * b, 0.04, 0.1 * b, blood, 0.01), 0, -0.14, 0));
      shoulder.add(at(mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.12, 5), bone), 0, -0.2, 0));
      continue;
    }
    shoulder.add(at(box(0.1 * b, 0.32 * L, 0.1 * b, skin, 0.015), 0, -0.17 * L, 0));
    elbow.add(at(box(0.09 * b, 0.3 * L, 0.09 * b, skin, 0.015), 0, -0.15 * L, 0));
    elbow.add(at(box(0.1 * b, 0.11, 0.05, skin, 0.01), 0, -0.3 * L - 0.04, 0));
    // claw-like fingers
    for (let f = 0; f < 3; f++) {
      const finger = mesh(new THREE.ConeGeometry(0.014, 0.08 * L, 4), skin);
      finger.rotation.x = Math.PI;
      elbow.add(at(finger, (-0.03 + f * 0.03) * b, -0.3 * L - 0.13, 0));
    }
    if (rng() < 0.5) elbow.add(at(box(0.05, 0.06, 0.02, blood, 0.008), 0, -0.12 * L, 0.05 * b));
  }

  // ---- Rest pose (from parameters), snapshotted so animations stay additive --
  spine.rotation.x = p.hunch;
  head.rotation.set(0.1, 0, p.headTilt);
  jaw.rotation.x = p.jawOpen;
  legs.L.leg.rotation.z = -0.04;
  legs.R.leg.rotation.z = 0.04;
  const reach = -p.armReach * Math.PI * 0.47;
  for (const [name, arm] of Object.entries(arms)) {
    const sign = name === 'L' ? 1 : -1;
    arm.shoulder.rotation.set(reach + rand(-0.1, 0.1), 0, sign * 0.05);
    arm.elbow.rotation.x = -0.15 - p.armReach * 0.1;
  }

  const rig = { hips, spine, belly, neck, head, jaw, legs, arms };
  decorate?.({ THREE, rig, p, mat, mesh, box, at, pivot, rand, rng, skin, shirt, pants, bone, blood, dark, b, L });
  return finalizeMonster(root, {
    rig,
    params: p,
    animations: ANIMATIONS,
    clips: p.clips,
  });
}
