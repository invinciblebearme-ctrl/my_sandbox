// Equipment and consumables (MVP set). Every item GLB:
//   <name> (root)
//   └─ item   the object; origin = grip / attach point.
//             swords: blade along +Y (put `item` inside the warrior's `weapon` group, zero transform)
//             shields: face +Z, origin at the handle (put it inside `shield`)
// Clip: drop (floats and spins on the floor). Rarity (normal/magic/rare/legendary) is not
// modelled: the game shows it with the icon border and the floor light beam (vfx).
import { finalizeMonster, TAU } from '../core/monster.js';
import { eduKit, glowMat, sizeSchema } from './common.js';

const Z = Math.PI / 2;
// 4-sided cone whose square base has edges along X and Z (so it can be flattened on Z)
const diamond = (k, r, h, m) => { const c = k.cone(r, h, m, 4); c.geometry.rotateY(Math.PI / 4); return c; };
// tier palettes: 1 basic (wood, iron), 2 steel + sapphire, 3 gold + glowing lantern gem
const TIERS = {
  1: { metal: '#9aa3ad', dark: '#5d6670', wood: '#9a6a3e', cloth: '#b8a27a', leather: '#8a5a32', gem: null, trim: '#7a6a58' },
  2: { metal: '#cfd8e2', dark: '#6f7c8c', wood: '#6e4a2a', cloth: '#5a7ab8', leather: '#6a4228', gem: '#4aa8ff', trim: '#3d6ad1' },
  3: { metal: '#eef3f8', dark: '#8a96a8', wood: '#4a2e1c', cloth: '#7a3ab0', leather: '#4a2a1a', gem: '#ffd34a', trim: '#f2c14e' },
};
const mats = (k, t) => {
  const c = TIERS[t];
  return {
    c,
    metal: k.mat(`metal${t}`, c.metal, { metalness: 0.6, roughness: 0.35 }),
    dark: k.mat(`darkMetal${t}`, c.dark, { metalness: 0.5, roughness: 0.5 }),
    wood: k.mat(`wood${t}`, c.wood),
    cloth: k.mat(`cloth${t}`, c.cloth),
    leather: k.mat(`leather${t}`, c.leather),
    trim: k.mat(`trim${t}`, c.trim, { metalness: t === 3 ? 0.7 : 0.2, roughness: 0.4 }),
    gem: c.gem ? glowMat(k, `gem${t}`, c.gem, t === 3 ? 2.2 : 1.2) : null,
  };
};

// ---- shape builders (used by the item GLBs and by the warrior's default gear) --------
export function swordShape(k, g, t = 1) {
  const m = mats(k, t);
  const len = [0, 0.56, 0.64, 0.72][t];
  g.add(k.at(k.cyl(0.022, 0.022, 0.16, t === 1 ? m.leather : m.leather, 5), 0, 0, 0)); // handle
  g.add(k.at(k.ball(0.035, m.trim, 0), 0, -0.1, 0)); // pommel
  const guardW = [0, 0.2, 0.24, 0.3][t];
  g.add(k.at(k.box(guardW, 0.04, 0.06, t === 1 ? m.dark : m.trim, 0), 0, 0.1, 0));
  if (t === 3) for (const s of [-1, 1]) g.add(k.at(k.rot(k.cone(0.03, 0.08, m.trim, 4), 0, 0, s * -Z), s * 0.17, 0.1, 0));
  g.add(k.at(k.scl(k.box(0.07, len, 0.018, m.metal, 0), 1, 1, 1), 0, 0.12 + len / 2, 0)); // blade
  g.add(k.at(k.scl(diamond(k, 0.05, 0.12, m.metal), 1, 1, 0.36), 0, 0.12 + len + 0.05, 0)); // tip
  g.add(k.at(k.box(0.014, len * 0.85, 0.022, m.dark, 0), 0, 0.12 + len * 0.45, 0)); // fuller
  if (m.gem) g.add(k.at(k.ball(0.028, m.gem, 0), 0, 0.1, 0.035));
  if (t === 3) g.add(k.at(k.box(0.02, len * 0.6, 0.024, glowMat(k, 'rune', '#ffe9a0', 1.6), 0), 0, 0.12 + len * 0.4, 0));
}

export function shieldShape(k, g, t = 1) {
  const m = mats(k, t);
  g.add(k.at(k.box(0.04, 0.12, 0.03, m.leather, 0), 0, 0, -0.01)); // handle
  if (t === 1) { // round wooden shield
    g.add(k.at(k.rot(k.cyl(0.24, 0.24, 0.04, m.wood, 10, 0.004), Z, 0, 0), 0, 0, 0.04));
    g.add(k.at(k.rot(k.mesh(new k.THREE.TorusGeometry(0.235, 0.02, 3, 12), m.dark), 0, 0, 0), 0, 0, 0.06));
    g.add(k.at(k.rot(k.dome(0.07, m.metal, 8), Z, 0, 0), 0, 0, 0.06));
    for (const x of [-0.08, 0.08]) g.add(k.at(k.box(0.012, 0.4, 0.01, k.mat('plank', '#7a5230'), 0), x, 0, 0.062));
    return;
  }
  // kite shield: wide top, pointed bottom
  const face = t === 2 ? m.metal : k.mat('shieldWhite', '#f2f0ea');
  g.add(k.at(k.box(0.42, 0.34, 0.04, face, 0), 0, 0.08, 0.04));
  g.add(k.at(k.rot(k.scl(diamond(k, 0.3, 0.32, face), 1, 1, 0.13), Math.PI, 0, 0), 0, -0.24, 0.04));
  g.add(k.at(k.box(0.44, 0.04, 0.05, m.trim, 0), 0, 0.25, 0.045)); // top rim
  // emblem: a lantern star
  const em = t === 3 ? glowMat(k, 'emblem', '#ffd34a', 1.6) : k.mat('emblem2', TIERS[2].trim);
  g.add(k.at(k.scl(k.mesh(new k.THREE.OctahedronGeometry(0.11, 0), em), 0.75, 1.15, 0.2), 0, 0.04, 0.07)); // four-point star
  g.add(k.at(k.rot(k.scl(k.mesh(new k.THREE.OctahedronGeometry(0.07, 0), em), 0.6, 1.1, 0.2), 0, 0, Math.PI / 4), 0, 0.04, 0.072));
  if (m.gem) g.add(k.at(k.ball(0.03, m.gem, 0), 0, 0.04, 0.09));
}

function helmetShape(k, g, t) {
  const m = mats(k, t);
  if (t === 1) { // padded leather cap
    g.add(k.scl(k.dome(0.17, m.leather, 8), 1, 0.9, 1.05));
    g.add(k.at(k.cyl(0.175, 0.175, 0.04, m.dark, 8), 0, 0.01, 0));
    for (const s of [-1, 1]) g.add(k.at(k.box(0.04, 0.1, 0.08, m.leather, 0), s * 0.16, -0.05, 0));
    return;
  }
  g.add(k.scl(k.dome(0.18, m.metal, 8), 1, 1.05, 1.05));
  g.add(k.at(k.cyl(0.185, 0.185, 0.05, m.trim, 8), 0, 0.02, 0));
  g.add(k.at(k.box(0.035, 0.14, 0.03, m.metal, 0), 0, -0.05, 0.18)); // nose guard
  for (const s of [-1, 1]) g.add(k.at(k.box(0.04, 0.14, 0.12, m.metal, 0), s * 0.17, -0.07, 0.02)); // cheek plates
  if (t === 2) g.add(k.at(k.box(0.03, 0.08, 0.3, m.trim, 0), 0, 0.17, -0.02)); // crest
  if (t === 3) {
    for (const s of [-1, 1]) { // little wings
      for (let i = 0; i < 3; i++) g.add(k.at(k.rot(k.box(0.025, 0.14 - i * 0.03, 0.05, k.mat('wing', '#ffffff'), 0), -0.5 - i * 0.25, 0, s * -0.4), s * 0.2, 0.12 - i * 0.03, -0.03 - i * 0.045));
    }
    g.add(k.at(k.ball(0.035, m.gem, 0), 0, 0.08, 0.18));
  }
}

function armorShape(k, g, t) {
  const m = mats(k, t);
  if (t === 1) { // quilted cloth tunic
    g.add(k.at(k.box(0.4, 0.42, 0.24, m.cloth, 0.004), 0, 0, 0));
    for (let i = 0; i < 3; i++) g.add(k.at(k.box(0.41, 0.015, 0.245, m.dark, 0), 0, -0.12 + i * 0.12, 0));
    g.add(k.at(k.box(0.4, 0.06, 0.25, m.leather, 0), 0, -0.2, 0));
    for (const s of [-1, 1]) g.add(k.at(k.box(0.12, 0.12, 0.22, m.cloth, 0.004), s * 0.25, 0.15, 0));
    return;
  }
  if (t === 2) { // leather vest with straps
    g.add(k.at(k.box(0.4, 0.42, 0.24, m.leather, 0.004), 0, 0, 0));
    g.add(k.at(k.rot(k.box(0.05, 0.5, 0.25, k.mat('strap', '#3a2a1e'), 0), 0, 0, 0.6), 0, 0.02, 0.005));
    for (const s of [-1, 1]) g.add(k.at(k.scl(k.ball(0.1, m.leather, 1), 1.1, 0.8, 1.1), s * 0.24, 0.17, 0));
    g.add(k.at(k.box(0.41, 0.06, 0.25, m.dark, 0), 0, -0.18, 0));
    g.add(k.at(k.box(0.06, 0.05, 0.02, m.trim, 0), 0, -0.18, 0.13));
    return;
  }
  // plate cuirass
  g.add(k.at(k.box(0.42, 0.42, 0.26, m.metal, 0.002), 0, 0, 0));
  g.add(k.at(k.box(0.3, 0.2, 0.04, m.metal, 0), 0, 0.06, 0.13)); // chest plate
  for (const s of [-1, 1]) g.add(k.at(k.scl(k.dome(0.14, m.metal, 6), 1, 0.7, 1.1), s * 0.26, 0.17, 0));
  for (const s of [-1, 1]) g.add(k.at(k.scl(k.mesh(new k.THREE.TorusGeometry(0.12, 0.012, 3, 8, Math.PI), m.trim), 1, 0.7, 1.1), s * 0.26, 0.17, 0));
  g.add(k.at(k.box(0.44, 0.05, 0.28, m.trim, 0), 0, -0.19, 0));
  g.add(k.at(k.ball(0.04, m.gem, 0), 0, 0.08, 0.16));
}

function pair(k, g, part) { for (const s of [-1, 1]) { const h = k.pivot(`side${s > 0 ? 'L' : 'R'}`, s * 0.11, 0, 0); part(h, s); g.add(h); } }

function glovesShape(k, g, t) {
  const m = mats(k, t);
  const mat = [null, m.cloth, m.leather, m.metal][t];
  pair(k, g, (h, s) => {
    h.add(k.at(k.box(0.09, 0.11, 0.05, mat, 0.003), 0, 0, 0)); // palm
    for (let i = 0; i < 3; i++) h.add(k.at(k.box(0.024, 0.06, 0.04, mat, 0), -0.03 + i * 0.03, 0.08, 0));
    h.add(k.at(k.rot(k.box(0.026, 0.05, 0.04, mat, 0), 0, 0, s * 0.6), s * 0.055, 0.03, 0)); // thumb
    h.add(k.at(k.cyl(0.06, 0.05, 0.07, t === 1 ? m.dark : m.trim, 6), 0, -0.08, 0)); // cuff
    if (t === 3) h.add(k.at(k.box(0.08, 0.05, 0.02, m.trim, 0), 0, 0.02, 0.03)); // knuckle plate
  });
}

function bootsShape(k, g, t) {
  const m = mats(k, t);
  const mat = [null, m.leather, m.leather, m.metal][t];
  pair(k, g, (h) => {
    h.add(k.at(k.box(0.1, 0.18, 0.11, mat, 0.003), 0, 0.09, 0)); // shaft
    h.add(k.at(k.box(0.105, 0.07, 0.2, mat, 0.003), 0, 0.035, 0.045)); // foot
    h.add(k.at(k.box(0.11, 0.02, 0.21, k.mat('sole', '#3a2a20'), 0), 0, 0.01, 0.045));
    h.add(k.at(k.box(0.115, 0.04, 0.12, t === 1 ? m.dark : m.trim, 0), 0, 0.17, 0)); // cuff
    if (t === 3) h.add(k.at(k.box(0.06, 0.05, 0.02, m.gem, 0), 0, 0.1, 0.06));
  });
}

function ringShape(k, g, t) {
  const band = [null, '#c27a4a', '#d8dde3', '#f2c14e', '#f2c14e'][t];
  const bm = k.mat(`ringBand${t}`, band, { metalness: 0.35, roughness: 0.35 });
  g.add(k.mesh(new k.THREE.TorusGeometry(0.06, 0.014, 4, 12), bm));
  if (t === 1) return;
  const gem = [null, null, '#4aa8ff', '#ff4a6a', '#fff3a0'][t];
  g.add(k.at(k.box(0.04, 0.02, 0.04, bm, 0), 0, 0.066, 0));
  g.add(k.at(k.scl(k.mesh(new k.THREE.OctahedronGeometry(0.03, 0), glowMat(k, `ringGem${t}`, gem, t === 4 ? 2.6 : 1.2)), 1, 0.9, 1), 0, 0.09, 0));
  if (t === 4) for (let i = 0; i < 4; i++) g.add(k.at(k.rot(k.box(0.008, 0.05, 0.008, glowMat(k, 'starRay', '#fffbe0', 2), 0), 0, 0, (i * Math.PI) / 4), 0, 0.09, 0));
}

function necklaceShape(k, g, t) {
  const chain = [null, '#7a5a3a', '#d8dde3', '#f2c14e'][t];
  const cm = k.mat(`chain${t}`, chain, { metalness: t > 1 ? 0.8 : 0, roughness: 0.4 });
  g.add(k.at(k.scl(k.mesh(new k.THREE.TorusGeometry(0.11, 0.008, 3, 16), cm), 1, 1.2, 1), 0, 0.1, 0));
  if (t === 1) { // carved wooden leaf charm
    g.add(k.at(k.scl(k.mesh(new k.THREE.OctahedronGeometry(0.04, 0), k.mat('charm', '#9a6a3e')), 0.8, 1.3, 0.35), 0, -0.04, 0));
    return;
  }
  if (t === 2) {
    g.add(k.at(k.box(0.05, 0.06, 0.015, cm, 0), 0, -0.04, 0));
    g.add(k.at(k.ball(0.022, glowMat(k, 'pendantGem', '#4aa8ff', 1.2), 0), 0, -0.04, 0.012));
    return;
  }
  // tiny lantern pendant (the game's symbol of knowledge)
  g.add(k.at(k.box(0.05, 0.012, 0.05, cm, 0), 0, -0.01, 0));
  g.add(k.at(k.box(0.04, 0.05, 0.04, glowMat(k, 'lanternGlow', '#ffd34a', 2.4), 0), 0, -0.045, 0));
  g.add(k.at(k.cone(0.035, 0.03, cm, 4), 0, 0.005, 0));
  g.add(k.at(k.box(0.05, 0.012, 0.05, cm, 0), 0, -0.075, 0));
}

function potionShape(k, g, kind, s) {
  const color = kind === 'hp' ? '#ff3a4a' : kind === 'mp' ? '#3a8aff' : '#b44aff';
  const r = [0, 0.05, 0.065, 0.08][s];
  const glass = k.mat('glass', '#e8f6ff', { transparent: true, opacity: 0.35, roughness: 0.1, depthWrite: false });
  const liquid = glowMat(k, `${kind}Liquid`, color, 0.9);
  if (s === 1) { // small round vial
    g.add(k.at(k.ball(r * 0.85, liquid, 1), 0, r, 0));
  } else if (s === 2) { // flask
    g.add(k.at(k.cone(r * 0.95, r * 1.6, liquid, 7), 0, r * 0.8, 0));
  } else { // big bottle
    g.add(k.at(k.cyl(r * 0.9, r * 0.9, r * 1.6, liquid, 7), 0, r * 0.8, 0));
  }
  g.add(k.at(k.ball(r, glass, 1), 0, r, 0));
  g.add(k.at(k.cyl(r * 0.35, r * 0.4, r * 0.8, glass, 6), 0, r * 2.1, 0)); // neck
  g.add(k.at(k.cyl(r * 0.3, r * 0.26, r * 0.45, k.mat('cork', '#c09060'), 6), 0, r * 2.6, 0));
  if (s === 3) g.add(k.at(k.cyl(r * 1.02, r * 1.02, r * 0.25, k.mat('label', '#f0e2c0'), 8), 0, r * 1.0, 0));
  g.add(k.at(k.ball(r * 0.18, k.mat('shine', '#ffffff', { emissive: '#ffffff', emissiveIntensity: 0.6 }), 0), r * 0.4, r * 1.35, r * 0.65));
}

function goldShape(k, g, big) {
  const gm = k.mat('gold', '#ffd23a', { metalness: 0.25, roughness: 0.35, emissive: '#a07000', emissiveIntensity: 0.5 });
  const coin = (x, y, z, rx = 0, rz = 0) => g.add(k.at(k.rot(k.cyl(0.04, 0.04, 0.012, gm, 6), rx, 0, rz), x, y, z));
  const n = big ? 14 : 4;
  for (let i = 0; i < n; i++) {
    const a = i * 2.4;
    const rr = big ? 0.03 + (i % 5) * 0.025 : 0.035 * i;
    coin(Math.cos(a) * rr, 0.006 + (big ? Math.max(0, 0.08 - rr) * 0.8 : 0), Math.sin(a) * rr, k.rand(-0.3, 0.3), k.rand(-0.3, 0.3));
  }
  if (big) {
    const bag = k.mat('bag', '#a0703a');
    g.add(k.at(k.scl(k.ball(0.09, bag, 1, 0.006), 1, 0.9, 1), -0.09, 0.08, -0.06));
    g.add(k.at(k.cyl(0.035, 0.05, 0.05, bag, 6), -0.09, 0.17, -0.06));
    g.add(k.at(k.cyl(0.04, 0.04, 0.015, k.mat('rope', '#e0c080'), 6), -0.09, 0.155, -0.06));
  }
}

// ---- item GLBs --------------------------------------------------------------------------
const ITEM_ANIMS = {
  drop: {
    label: '바닥 드랍 (둥실둥실 회전)',
    duration: 2.4,
    apply(r, u) {
      r.item.rotation.y += u * TAU;
      r.item.position.y += Math.sin(u * TAU) * 0.04;
    },
  },
};

function makeEduItem(name, label, role, hoverY, shape, { seed = 300, scale = 1 } = {}) {
  return {
    label, role, file: `items/${name}.glb`,
    defaults: { seed, size: 1 },
    schema: sizeSchema,
    build(p) {
      const k = eduKit(p.seed, 0.3);
      const root = k.pivot('root');
      root.name = name;
      const item = k.pivot('item', 0, hoverY, 0);
      shape(k, item);
      item.scale.setScalar(p.size * scale);
      root.add(item);
      const obj = finalizeMonster(root, { rig: { item }, params: p, animations: ITEM_ANIMS, clips: { idle: 'drop' } });
      obj.userData.eduItem = { file: `items/${name}.glb`, icon: `icons/items/${name}.png` };
      return obj;
    },
  };
}

const TIER_NAME = { 1: '초급', 2: '중급', 3: '상급' };
const list = {};
const add = (name, ...rest) => { list[name] = makeEduItem(name, ...rest); };
for (const t of [1, 2, 3]) {
  add(`weapon_sword_t${t}`, `한손검 ${TIER_NAME[t]}`, '🗡️ 무기', 0.25, (k, g) => swordShape(k, g, t), { seed: 310 + t });
  add(`shield_t${t}`, `${t === 1 ? '원형' : '카이트'} 방패 ${TIER_NAME[t]}`, '🛡️ 방패', 0.35, (k, g) => shieldShape(k, g, t), { seed: 320 + t });
  add(`helmet_t${t}`, `투구 ${TIER_NAME[t]}`, '⛑️ 투구', 0.3, (k, g) => helmetShape(k, g, t), { seed: 330 + t });
  add(`armor_t${t}`, `${['', '천', '가죽', '판금'][t]} 갑옷`, '🥋 갑옷', 0.35, (k, g) => armorShape(k, g, t), { seed: 340 + t });
  add(`gloves_t${t}`, `장갑 ${TIER_NAME[t]}`, '🧤 장갑', 0.25, (k, g) => glovesShape(k, g, t), { seed: 350 + t });
  add(`boots_t${t}`, `신발 ${TIER_NAME[t]}`, '👢 신발', 0.12, (k, g) => bootsShape(k, g, t), { seed: 360 + t });
}
for (const t of [1, 2, 3, 4]) add(`ring_t${t}`, `반지 ${t}단계`, '💍 반지', 0.25, (k, g) => ringShape(k, g, t), { seed: 370 + t, scale: 1.4 });
for (const t of [1, 2, 3]) add(`necklace_t${t}`, `목걸이 ${TIER_NAME[t]}`, '📿 목걸이', 0.3, (k, g) => necklaceShape(k, g, t), { seed: 380 + t, scale: 1.3 });
for (const kind of ['hp', 'mp']) {
  for (const [s, n] of [[1, 's'], [2, 'm'], [3, 'l']]) {
    add(`potion_${kind}_${n}`, `${kind === 'hp' ? '체력' : '마나'} 물약 (${'소중대'[s - 1]})`, '🧪 소모품', 0.15, (k, g) => potionShape(k, g, kind, s), { seed: 390 + s, scale: 1.5 });
  }
}
add('gold_small', '골드 (소량)', '🪙 골드', 0.02, (k, g) => goldShape(k, g, false), { seed: 398, scale: 1.5 });
add('gold_large', '골드 (다량)', '🪙 골드', 0.02, (k, g) => goldShape(k, g, true), { seed: 399, scale: 1.5 });

export const EDU_ITEMS = list;
