// Player character: a healthy survivor built in the same boxy low-poly style as
// the zombies, with outfits per theme and grip points for every player item.
//
// Joints: hips > legL/R > kneeL/R, spine > neck > head, spine > armL/R > elbowL/R > handL/R > gripL/R
// Grip convention (matches the item GLBs): attach an item's `item` node to gripR
// with zero position/rotation. With the arm raised forward, the grip's +Z points
// forward (gun barrels, flashlight) and +Y points up (bats, torches).
import { createKit } from '../core/kit.js';
import { finalizeMonster } from '../core/monster.js';
import { PLAYER_ANIMS } from './animations.js';

export const PLAYER_DEFAULTS = {
  seed: 1, height: 1, build: 1,
  skinColor: '#e0b494', hairColor: '#3a2a20', shirtColor: '#5a6a5a', pantsColor: '#3a4a6a', shoeColor: '#2a2420',
  headgear: 'hair', // hair | beanie | hood | cowboy | headset | cap
  headgearColor: '#2a2a2a', backpack: true, backpackColor: '#6a5a3a', vest: false, vestColor: '#8a6a3a',
  scarf: false, scarfColor: '#b03a2a', gloves: false, gloveColor: '#3a3a3a',
};

export const PLAYER_SCHEMA = {
  seed: { label: '시드', min: 1, max: 999, step: 1 },
  height: { label: '키', min: 0.8, max: 1.2, step: 0.01 },
  build: { label: '체격', min: 0.8, max: 1.3, step: 0.01 },
  headgear: { label: '머리', options: { 머리카락: 'hair', 비니: 'beanie', 후드: 'hood', 카우보이모자: 'cowboy', 헤드셋: 'headset', 야구모자: 'cap' } },
  backpack: { label: '배낭' }, vest: { label: '조끼' }, scarf: { label: '목도리' }, gloves: { label: '장갑' },
  skinColor: { label: '피부 색' }, hairColor: { label: '머리카락 색' }, shirtColor: { label: '상의 색' },
  pantsColor: { label: '바지 색' }, shoeColor: { label: '신발 색' }, headgearColor: { label: '모자 색' },
  backpackColor: { label: '배낭 색' }, vestColor: { label: '조끼 색' }, scarfColor: { label: '목도리 색' }, gloveColor: { label: '장갑 색' },
};

const CLIPS = Object.fromEntries(Object.keys(PLAYER_ANIMS).map((k) => [k, k]));

export function createPlayer(input = {}) {
  const p = { ...PLAYER_DEFAULTS, ...input };
  const k = createKit(p.seed, 0.4, 0); // never zombie-styled
  const b = p.build;
  const skin = k.mat('skin', p.skinColor);
  const shirt = k.mat('shirt', p.shirtColor);
  const pants = k.mat('pants', p.pantsColor);
  const shoe = k.mat('shoes', p.shoeColor);
  const hair = k.mat('hair', p.hairColor);
  const gear = k.mat('headgear', p.headgearColor);
  const handMat = p.gloves ? k.mat('gloves', p.gloveColor) : skin;
  const box = (w, h, d, m, j = 0.006) => k.box(w, h, d, m, j);

  const root = k.pivot('root');
  root.name = 'Player';
  root.scale.setScalar(p.height);
  const hips = k.pivot('hips', 0, 0.95, 0);
  root.add(hips);

  const legs = {};
  for (const [n, s] of [['L', 1], ['R', -1]]) {
    const leg = k.pivot(`leg${n}`, s * 0.1 * b, 0, 0);
    leg.add(k.at(box(0.16 * b, 0.47, 0.18 * b, pants), 0, -0.22, 0));
    const knee = k.pivot(`knee${n}`, 0, -0.45, 0);
    knee.add(k.at(box(0.14 * b, 0.42, 0.15 * b, pants), 0, -0.2, 0));
    knee.add(k.at(box(0.15 * b, 0.09, 0.27, shoe), 0, -0.45, 0.05));
    leg.add(knee);
    hips.add(leg);
    legs[n] = { leg, knee };
  }

  const spine = k.pivot('spine');
  hips.add(spine);
  spine.add(k.at(box(0.36 * b, 0.2, 0.22 * b, pants), 0, 0.02, 0));
  spine.add(k.at(box(0.42 * b, 0.55, 0.25 * b, shirt, 0.008), 0, 0.37, 0));
  spine.add(k.at(box(0.38 * b, 0.05, 0.23 * b, k.mat('belt', '#2a2018')), 0, 0.12, 0));
  if (p.vest) {
    const vest = k.mat('vest', p.vestColor);
    for (const s of [-1, 1]) spine.add(k.at(box(0.15 * b, 0.42, 0.27 * b, vest), s * 0.12 * b, 0.4, 0));
    spine.add(k.at(box(0.06, 0.08, 0.02, vest), 0.12 * b, 0.45, 0.14 * b)); // pocket
  }
  if (p.backpack) {
    const pack = k.mat('backpack', p.backpackColor);
    spine.add(k.at(box(0.32 * b, 0.4, 0.16, pack, 0.01), 0, 0.38, -0.2 * b));
    spine.add(k.at(box(0.26 * b, 0.12, 0.06, pack), 0, 0.25, -0.3 * b));
    const strap = k.mat('strap', '#2a2420');
    for (const s of [-1, 1]) spine.add(k.at(box(0.04, 0.5, 0.02, strap, 0), s * 0.11 * b, 0.4, 0.13 * b));
  }

  const neck = k.pivot('neck', 0, 0.65, 0);
  spine.add(neck);
  neck.add(k.at(box(0.1, 0.1, 0.1, skin), 0, 0.03, 0));
  if (p.scarf) {
    const scarf = k.mat('scarf', p.scarfColor);
    neck.add(k.at(box(0.2, 0.08, 0.18, scarf), 0, 0.02, 0));
    neck.add(k.at(k.rot(box(0.07, 0.22, 0.03, scarf), 0.15, 0, 0.2), 0.06, -0.1, 0.11));
  }
  const head = k.pivot('head', 0, 0.08, 0);
  neck.add(head);
  head.add(k.at(box(0.24, 0.27, 0.25, skin, 0.004), 0, 0.15, 0));
  // face: eyes, brows, nose, mouth (calm, alert expression)
  const white = k.mat('eyeWhite', '#f4f0e8');
  const iris = k.mat('iris', '#3a2a1a');
  for (const s of [-1, 1]) {
    head.add(k.at(box(0.05, 0.03, 0.01, white, 0), s * 0.055, 0.17, 0.126));
    head.add(k.at(box(0.022, 0.026, 0.01, iris, 0), s * 0.05, 0.17, 0.13));
    head.add(k.at(k.rot(box(0.06, 0.014, 0.012, hair, 0), 0, 0, s * 0.12), s * 0.055, 0.205, 0.127));
  }
  head.add(k.at(box(0.035, 0.05, 0.03, skin, 0), 0, 0.13, 0.135));
  head.add(k.at(box(0.07, 0.012, 0.01, k.mat('mouth', '#7a3a3a'), 0), 0, 0.075, 0.126));
  for (const s of [-1, 1]) head.add(k.at(box(0.025, 0.05, 0.04, skin, 0), s * 0.125, 0.15, 0));
  // headgear
  if (p.headgear === 'hair' || p.headgear === 'headset') {
    head.add(k.at(box(0.26, 0.07, 0.27, hair, 0.01), 0, 0.3, -0.005));
    head.add(k.at(box(0.26, 0.15, 0.06, hair, 0.01), 0, 0.22, -0.11));
    for (let i = 0; i < 4; i++) head.add(k.at(box(0.06, 0.04, 0.05, hair, 0.01), -0.09 + i * 0.06, 0.27, 0.11));
  }
  if (p.headgear === 'headset') {
    head.add(k.at(k.rot(k.mesh(new k.THREE.TorusGeometry(0.14, 0.012, 4, 10, Math.PI), gear), 0, 0, 0), 0, 0.17, 0));
    for (const s of [-1, 1]) head.add(k.at(box(0.04, 0.08, 0.07, gear), s * 0.14, 0.16, 0));
    head.add(k.at(k.rot(box(0.012, 0.012, 0.12, gear, 0), 0, 0.5, 0), 0.12, 0.1, 0.07));
  }
  if (p.headgear === 'beanie') {
    head.add(k.at(box(0.27, 0.13, 0.27, gear, 0.012), 0, 0.29, 0));
    head.add(k.at(k.ball(0.04, gear, 0), 0, 0.37, 0));
  }
  if (p.headgear === 'hood') {
    head.add(k.at(box(0.3, 0.2, 0.3, gear, 0.012), 0, 0.26, -0.02));
    for (const s of [-1, 1]) head.add(k.at(box(0.04, 0.24, 0.28, gear, 0.008), s * 0.15, 0.14, -0.02));
    head.add(k.at(box(0.3, 0.06, 0.04, k.mat('fur', '#e8e0d0'), 0.01), 0, 0.33, 0.13));
  }
  if (p.headgear === 'cowboy') {
    head.add(k.at(k.rot(k.cyl(0.25, 0.26, 0.02, gear, 10, 0.006), -0.08, 0, 0), 0, 0.29, 0));
    head.add(k.at(k.cyl(0.13, 0.15, 0.15, gear, 8, 0.006), 0, 0.37, -0.01));
    head.add(k.at(box(0.26, 0.05, 0.02, hair, 0.01), 0, 0.22, -0.12));
  }
  if (p.headgear === 'cap') {
    head.add(k.at(box(0.27, 0.08, 0.27, gear, 0.006), 0, 0.3, 0));
    head.add(k.at(box(0.22, 0.015, 0.12, gear, 0), 0, 0.27, -0.18)); // brim worn backwards
    head.add(k.at(box(0.26, 0.1, 0.05, hair, 0.01), 0, 0.22, -0.11));
  }

  const arms = {};
  for (const [n, s] of [['L', 1], ['R', -1]]) {
    const arm = k.pivot(`arm${n}`, s * (0.21 * b + 0.05), 0.6, 0);
    arm.add(k.at(box(0.12 * b, 0.32, 0.12 * b, shirt), 0, -0.15, 0));
    const elbow = k.pivot(`elbow${n}`, 0, -0.3, 0);
    elbow.add(k.at(box(0.1 * b, 0.27, 0.1 * b, p.vest ? skin : shirt), 0, -0.13, 0));
    const hand = k.pivot(`hand${n}`, 0, -0.28, 0);
    hand.add(k.at(box(0.09 * b, 0.1, 0.06, handMat), 0, -0.04, 0));
    hand.add(k.at(box(0.03, 0.05, 0.03, handMat, 0), s * -0.045 * b, -0.02, 0.03)); // thumb
    const grip = k.pivot(`grip${n}`, 0, -0.06, 0.01);
    grip.rotation.x = Math.PI / 2; // see the grip convention at the top
    hand.add(grip);
    elbow.add(hand);
    arm.add(elbow);
    spine.add(arm);
    arm.rotation.z = s * 0.08;
    elbow.rotation.x = -0.12;
    arms[n] = { arm, elbow, hand, grip };
  }

  return finalizeMonster(root, {
    rig: { hips, spine, neck, head, legs, arms }, params: p, animations: PLAYER_ANIMS, clips: CLIPS,
  });
}
