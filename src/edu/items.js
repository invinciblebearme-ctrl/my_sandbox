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

export function greatswordShape(k, g, t = 1) {
  const m = mats(k, t);
  const len = [0, 0.9, 1.0, 1.1][t];
  g.add(k.at(k.cyl(0.025, 0.025, 0.3, m.leather, 5), 0, -0.05, 0)); // long two-hand grip
  g.add(k.at(k.ball(0.045, m.trim, 0), 0, -0.22, 0));
  g.add(k.at(k.box([0, 0.3, 0.36, 0.42][t], 0.05, 0.07, t === 1 ? m.dark : m.trim, 0), 0, 0.12, 0));
  g.add(k.at(k.box(0.11, len, 0.022, m.metal, 0), 0, 0.15 + len / 2, 0));
  g.add(k.at(k.scl(diamond(k, 0.078, 0.18, m.metal), 1, 1, 0.28), 0, 0.15 + len + 0.09, 0));
  g.add(k.at(k.box(0.02, len * 0.85, 0.026, m.dark, 0), 0, 0.15 + len * 0.45, 0));
  if (m.gem) g.add(k.at(k.ball(0.035, m.gem, 0), 0, 0.12, 0.04));
  if (t === 3) g.add(k.at(k.box(0.03, len * 0.6, 0.028, glowMat(k, 'rune', '#ffe9a0', 1.6), 0), 0, 0.15 + len * 0.4, 0));
}

// bow: riser at the origin (the grip), limbs along +-Y, belly bulging toward +Z, string behind
export function bowShape(k, g, t = 1) {
  const m = mats(k, t);
  const half = [0, 0.38, 0.5, 0.55][t]; // short bow, long bow, star bow
  const wood = t === 3 ? k.mat('starWood', '#f2e6c0') : m.wood;
  g.add(k.box(0.04, 0.14, 0.05, m.leather, 0)); // grip wrap
  const segs = 4;
  for (const s of [-1, 1]) {
    for (let i = 0; i < segs; i++) {
      const a0 = (i / segs) * 1.0; const a1 = ((i + 1) / segs) * 1.0;
      const y0 = Math.sin(a0) * half; const y1 = Math.sin(a1) * half;
      const z0 = (Math.cos(a0) - 1) * half * 0.35; const z1 = (Math.cos(a1) - 1) * half * 0.35;
      const len = Math.hypot(y1 - y0, z1 - z0);
      const limb = k.box(0.03, len, 0.035 - i * 0.004, wood, 0);
      limb.position.set(0, s * (y0 + y1) / 2, (z0 + z1) / 2 + 0.03);
      limb.rotation.x = s * Math.atan2(z1 - z0, y1 - y0) * -1;
      g.add(limb);
    }
    g.add(k.at(k.ball(0.022, t === 1 ? m.dark : m.trim, 0), 0, s * Math.sin(1) * half, (Math.cos(1) - 1) * half * 0.35 + 0.03));
  }
  const tipZ = (Math.cos(1) - 1) * half * 0.35 + 0.03;
  const string = k.pivot('bowString', 0, 0, tipZ);
  string.add(k.box(0.006, Math.sin(1) * half * 2, 0.006, k.mat('string', '#f2f0e8'), 0));
  g.add(string);
  if (m.gem) g.add(k.at(k.ball(0.025, m.gem, 0), 0, 0.09, 0.04));
  if (t === 3) for (const s of [-1, 1]) g.add(k.at(k.mesh(new k.THREE.OctahedronGeometry(0.04, 0), glowMat(k, 'bowStar', '#fff3a0', 2.2)), 0, s * Math.sin(1) * half, tipZ));
}

// crossbow: grip at the origin, stock along +Z, limbs across X at the front
export function crossbowShape(k, g, t = 1) {
  const m = mats(k, t);
  g.add(k.at(k.box(0.05, 0.06, 0.5, m.wood, 0.003), 0, 0.03, 0.15));
  g.add(k.at(k.rot(k.box(0.04, 0.12, 0.05, m.wood, 0), 0.3, 0, 0), 0, -0.04, 0)); // pistol grip
  g.add(k.at(k.box(0.06, 0.07, 0.14, m.dark, 0), 0, 0.03, -0.12)); // butt
  for (const s of [-1, 1]) g.add(k.at(k.rot(k.box(0.24, 0.03, 0.03, t === 2 ? m.metal : m.wood, 0), 0, s * -0.35, 0), s * 0.11, 0.05, 0.36));
  g.add(k.at(k.box(0.4, 0.006, 0.006, k.mat('string', '#f2f0e8'), 0), 0, 0.06, 0.29));
  g.add(k.at(k.box(0.012, 0.012, 0.34, k.mat('bolt', '#c8a070'), 0), 0, 0.075, 0.25));
  if (m.gem) g.add(k.at(k.ball(0.025, m.gem, 0), 0, 0.07, 0.05));
}

// staff: grip at the origin, shaft along +Y, glowing orb on top (`staffOrb`)
export function staffShape(k, g, t = 1) {
  const m = mats(k, t);
  const orbColor = ['', '#ff9a4a', '#8ad8ff', '#d8a0ff'][t];
  g.add(k.at(k.cyl(0.02, 0.026, 1.25, m.wood, 6, 0.004), 0, 0.22, 0));
  g.add(k.at(k.cyl(0.03, 0.03, 0.03, m.trim, 6), 0, 0.1, 0));
  g.add(k.at(k.cone(0.026, 0.07, m.trim, 5), 0, -0.42, 0));
  if (t === 1) { // twisted branch top
    for (const s of [-1, 1]) g.add(k.at(k.rot(k.cyl(0.012, 0.018, 0.16, m.wood, 4), 0, 0, s * 0.5), s * 0.04, 0.9, 0));
  } else {
    g.add(k.at(k.cyl(0.05, 0.03, 0.06, m.trim, 6), 0, 0.85, 0));
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      g.add(k.at(k.rot(k.cone(0.012, 0.16, m.trim, 4), Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35), Math.cos(a) * 0.05, 0.94, Math.sin(a) * 0.05));
    }
  }
  const orb = k.pivot('staffOrb', 0, 0.98, 0);
  orb.add(k.ball(0.06, glowMat(k, `staffOrb${t}`, orbColor, 2.2), 1));
  if (t === 3) orb.add(k.ball(0.09, glowMat(k, 'staffHalo', orbColor, 1.2, 0.35), 1));
  g.add(orb);
}

// spellbook: a sheet in the XY plane facing +Z, spine at -X; `bookCover` opens around the spine
export function bookShape(k, g, t = 1) {
  const coverMat = k.mat(`bookCover${t}`, t === 1 ? '#7a3a2a' : '#2a3a8a');
  const trimMat = k.mat(`bookTrim${t}`, '#f2c14e', { metalness: 0.6, roughness: 0.35 });
  g.add(k.at(k.box(0.22, 0.28, 0.015, coverMat, 0), 0, 0, -0.025)); // back cover
  const pages = k.pivot('bookPages');
  pages.add(k.box(0.2, 0.26, 0.035, k.mat('pages', '#f6eed8'), 0));
  g.add(pages);
  const cover = k.pivot('bookCover', -0.11, 0, 0.025);
  cover.add(k.at(k.box(0.22, 0.28, 0.015, coverMat, 0), 0.11, 0, 0));
  cover.add(k.at(k.box(0.06, 0.06, 0.01, t === 2 ? glowMat(k, 'bookRune', '#8ad8ff', 2) : trimMat, 0), 0.11, 0, 0.01));
  for (const y of [-0.12, 0.12]) cover.add(k.at(k.box(0.05, 0.03, 0.017, trimMat, 0), 0.19, y, 0)); // corners
  g.add(cover);
  g.add(k.at(k.box(0.025, 0.28, 0.07, coverMat, 0), -0.11, 0, 0)); // spine
}

function beltShape(k, g, t) {
  const m = mats(k, t);
  g.add(k.scl(k.mesh(new k.THREE.TorusGeometry(0.15, 0.025, 3, 12), t === 1 ? m.leather : m.dark), 1, 0.8, 1));
  g.add(k.at(k.box(0.07, 0.06, 0.03, m.trim, 0), 0, 0, 0.12));
  for (const a of [1.2, 1.9, -1.2]) g.add(k.at(k.box(0.06, 0.07, 0.04, m.leather, 0), Math.sin(a) * 0.14, -0.03, Math.cos(a) * 0.11)); // pouches
  if (m.gem) g.add(k.at(k.ball(0.018, m.gem, 0), 0, 0, 0.14));
}

// ---- consumables and quiz helpers ----------------------------------------------------------
function scrollShape(k, g, kind) {
  const paper = k.mat('scrollPaper', '#f2e6c8');
  const seal = kind === 'return' ? glowMat(k, 'sealReturn', '#ffb43a', 1.6) : glowMat(k, 'sealIdentify', '#8ad8ff', 1.6);
  g.add(k.at(k.rot(k.cyl(0.035, 0.035, 0.2, paper, 6), 0, 0, Math.PI / 2), 0, 0.035, 0));
  for (const s of [-1, 1]) g.add(k.at(k.rot(k.cyl(0.015, 0.015, 0.04, k.mat('rod', '#8a5a32'), 5), 0, 0, Math.PI / 2), s * 0.12, 0.035, 0));
  g.add(k.at(k.rot(k.cyl(0.036, 0.036, 0.03, k.mat('ribbon', kind === 'return' ? '#d84a3a' : '#3a6ad8'), 6), 0, 0, Math.PI / 2), 0, 0.035, 0));
  g.add(k.at(k.cyl(0.02, 0.02, 0.012, seal, 6), 0, 0.072, 0));
}
function featherShape(k, g) {
  const f = k.mat('featherWhite', '#f6f2ff');
  g.add(k.at(k.rot(k.cyl(0.005, 0.007, 0.32, k.mat('quill', '#c8b080'), 4), 0, 0, 0.4), 0, 0.15, 0));
  for (let i = 0; i < 6; i++) for (const s of [-1, 1]) g.add(k.at(k.rot(k.box(0.06 - i * 0.006, 0.028, 0.006, f, 0), 0, 0, s * 0.6 + 0.4), -Math.sin(0.4) * (0.04 + i * 0.04) * -1 + s * 0.02, 0.06 + i * 0.04, 0));
  g.add(k.at(k.mesh(new k.THREE.OctahedronGeometry(0.02, 0), glowMat(k, 'hintSpark', '#fff3a0', 2.4)), -0.08, 0.3, 0));
}
function hourglassShape(k, g) {
  const wood = k.mat('hgWood', '#8a5a32');
  const glass = k.mat('hgGlass', '#e8f6ff', { transparent: true, opacity: 0.35, depthWrite: false });
  const sand = glowMat(k, 'hgSand', '#ffd36a', 0.8);
  for (const y of [0, 0.28]) g.add(k.at(k.cyl(0.08, 0.08, 0.025, wood, 6), 0, y, 0));
  for (const a of [0, 2.1, 4.2]) g.add(k.at(k.cyl(0.008, 0.008, 0.28, wood, 4), Math.cos(a) * 0.065, 0.14, Math.sin(a) * 0.065));
  g.add(k.at(k.cone(0.055, 0.12, glass, 7), 0, 0.075, 0));
  g.add(k.at(k.rot(k.cone(0.055, 0.12, glass, 7), Math.PI, 0, 0), 0, 0.205, 0));
  g.add(k.at(k.cone(0.045, 0.05, sand, 7), 0, 0.04, 0));
  g.add(k.at(k.rot(k.cone(0.03, 0.05, sand, 7), Math.PI, 0, 0), 0, 0.235, 0));
}
function charmShape(k, g) {
  const gold = k.mat('charmGold', '#f2c14e', { metalness: 0.35, roughness: 0.35 });
  g.add(k.at(k.mesh(new k.THREE.TorusGeometry(0.02, 0.006, 3, 8), gold), 0, 0.2, 0));
  g.add(k.at(k.scl(k.ball(0.07, glowMat(k, 'charmClover', '#6aff8a', 1.2), 0), 1, 1, 0.35), 0, 0.12, 0));
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; g.add(k.at(k.scl(k.ball(0.04, glowMat(k, 'charmClover', '#6aff8a', 1.2), 0), 1, 1, 0.4), Math.cos(a) * 0.045, 0.12 + Math.sin(a) * 0.045, 0.01)); }
  g.add(k.at(k.box(0.035, 0.035, 0.02, gold, 0), 0, 0.12, 0.03));
}
function keyShape(k, g) {
  const gold = k.mat('keyGold', '#f2c14e', { metalness: 0.35, roughness: 0.35 });
  g.add(k.at(k.mesh(new k.THREE.TorusGeometry(0.04, 0.012, 3, 8), gold), 0, 0.2, 0));
  g.add(k.at(k.box(0.018, 0.18, 0.018, gold, 0), 0, 0.07, 0));
  g.add(k.at(k.box(0.05, 0.02, 0.018, gold, 0), 0.025, -0.01, 0));
  g.add(k.at(k.box(0.035, 0.02, 0.018, gold, 0), 0.018, 0.03, 0));
  g.add(k.at(k.ball(0.014, glowMat(k, 'keyGem', '#8ad8ff', 2), 0), 0, 0.2, 0.01));
}

// generic floor-drop bundles (shown before the exact item is identified)
function dropShape(k, g, kind) {
  const cloth = k.mat('dropCloth', '#8a6a4a');
  const tie = k.mat('dropTie', '#e8d070');
  if (kind === 'weapon') { swordShape(k, g, 1); g.rotation.z = 1.2; return; }
  if (kind === 'armor') { g.add(k.at(k.scl(k.ball(0.16, cloth, 0, 0.01), 1.3, 0.6, 1), 0, 0.08, 0)); g.add(k.at(k.box(0.3, 0.03, 0.04, tie, 0), 0, 0.12, 0)); return; }
  if (kind === 'jewelry') { g.add(k.at(k.box(0.16, 0.1, 0.12, k.mat('jewelBox', '#7a3a6a'), 0.003), 0, 0.05, 0)); g.add(k.at(k.box(0.17, 0.02, 0.13, tie, 0), 0, 0.1, 0)); g.add(k.at(k.mesh(new k.THREE.OctahedronGeometry(0.03, 0), glowMat(k, 'jewelSpark', '#ff8ad8', 2)), 0, 0.14, 0)); return; }
  if (kind === 'potion') { potionShape(k, g, 'hp', 2); return; }
  if (kind === 'scroll') { scrollShape(k, g, 'identify'); return; }
  goldShape(k, g, false);
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
for (const t of [1, 2, 3]) {
  add(`weapon_greatsword_t${t}`, `양손검 ${TIER_NAME[t]}`, '⚔️ 무기', 0.3, (k, g) => greatswordShape(k, g, t), { seed: 410 + t });
  add(`weapon_bow_t${t}`, `${['', '단궁', '장궁', '별빛 활'][t]}`, '🏹 무기', 0.4, (k, g) => bowShape(k, g, t), { seed: 420 + t });
  add(`weapon_staff_t${t}`, `지팡이 ${TIER_NAME[t]}`, '🪄 무기', 0.5, (k, g) => staffShape(k, g, t), { seed: 430 + t });
}
for (const t of [1, 2]) {
  add(`weapon_crossbow_t${t}`, `석궁 ${TIER_NAME[t]}`, '🏹 무기', 0.2, (k, g) => crossbowShape(k, g, t), { seed: 440 + t });
  add(`offhand_spellbook_t${t}`, `마법서 ${TIER_NAME[t]}`, '📖 보조무기', 0.3, (k, g) => bookShape(k, g, t), { seed: 450 + t, scale: 1.2 });
  add(`belt_t${t}`, `허리띠 ${TIER_NAME[t]}`, '🎗️ 허리띠', 0.15, (k, g) => beltShape(k, g, t), { seed: 460 + t });
}
add('potion_spring', '회복의 샘물 (체력+마나)', '🧪 소모품', 0.15, (k, g) => potionShape(k, g, 'both', 3), { seed: 470, scale: 1.5 });
add('scroll_return', '마을 귀환 두루마리', '📜 소모품', 0.1, (k, g) => scrollShape(k, g, 'return'), { seed: 471, scale: 1.4 });
add('scroll_identify', '감정 두루마리', '📜 소모품', 0.1, (k, g) => scrollShape(k, g, 'identify'), { seed: 472, scale: 1.4 });
add('quiz_hint_feather', '힌트 깃털 (오답 2개 제거)', '🪶 퀴즈 도구', 0.1, (k, g) => featherShape(k, g), { seed: 473, scale: 1.3 });
add('quiz_hourglass', '시간의 모래시계 (+5초)', '⏳ 퀴즈 도구', 0.1, (k, g) => hourglassShape(k, g), { seed: 474, scale: 1.3 });
add('quiz_second_chance', '두 번째 기회 부적', '🍀 퀴즈 도구', 0.1, (k, g) => charmShape(k, g), { seed: 475, scale: 1.4 });
add('key', '열쇠', '🗝️ 열쇠', 0.15, (k, g) => keyShape(k, g), { seed: 476, scale: 1.4 });
for (const kind of ['weapon', 'armor', 'jewelry', 'potion', 'scroll', 'gold']) {
  add(`drop_${kind}`, `바닥 드랍 (${{ weapon: '무기', armor: '방어구', jewelry: '장신구', potion: '물약', scroll: '두루마리', gold: '골드' }[kind]})`, '📦 바닥 드랍', 0.05, (k, g) => dropShape(k, g, kind), { seed: 480, scale: kind === 'weapon' ? 1 : 1.3 });
}

// ---- legendary items (unique look: tier-3 base + its own flair + orbiting sparks) -----------
const LEG = '#ff9a2a';
function legendary(base, flair) {
  return (k, g) => {
    base(k, g);
    flair(k, g, glowMat(k, 'legendGlow', LEG, 2.2), glowMat(k, 'legendWhite', '#fff6d8', 2.6));
    for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; g.add(k.at(k.mesh(new k.THREE.OctahedronGeometry(0.022, 0), glowMat(k, 'legendSpark', '#ffd34a', 2.6)), Math.cos(a) * 0.16, 0.12 + i * 0.12, Math.sin(a) * 0.16)); }
  };
}
const LEGENDS = [
  ['legend_sword_dawnstar', '새벽별 검', '🗡️ 전설 무기', 0.25, legendary((k, g) => swordShape(k, g, 3), (k, g, glow, white) => { g.add(k.at(k.mesh(new k.THREE.OctahedronGeometry(0.07, 0), white), 0, 0.1, 0.05)); for (const s of [-1, 1]) g.add(k.at(k.rot(k.box(0.02, 0.18, 0.02, glow, 0), 0, 0, s * 0.8), s * 0.12, 0.16, 0)); })],
  ['legend_shield_wisdom', '지혜의 방패', '🛡️ 전설 방패', 0.35, legendary((k, g) => shieldShape(k, g, 3), (k, g, glow) => { g.add(k.at(k.rot(k.mesh(new k.THREE.TorusGeometry(0.16, 0.02, 3, 16), glow), 0, 0, 0), 0, 0.04, 0.08)); })],
  ['legend_greatsword_oblivion', '망각을 가르는 대검', '⚔️ 전설 무기', 0.3, legendary((k, g) => greatswordShape(k, g, 3), (k, g, glow) => { for (let i = 0; i < 4; i++) g.add(k.at(k.box(0.13, 0.03, 0.03, glow, 0), 0, 0.35 + i * 0.22, 0)); })],
  ['legend_bow_oldroot', '올드루트의 활 (살아 있는 가지)', '🏹 전설 무기', 0.4, legendary((k, g) => bowShape(k, g, 3), (k, g, glow) => { const leaf = k.mat('legendLeaf', '#5ad86a', { emissive: '#3aa84a', emissiveIntensity: 0.6 }); for (const s of [-1, 1]) for (let i = 0; i < 2; i++) g.add(k.at(k.scl(k.ball(0.04, leaf, 0), 1, 0.4, 1.6), 0.03, s * (0.2 + i * 0.15), 0.02)); g.add(k.at(k.ball(0.03, glow, 0), 0, 0, 0.05)); })],
  ['legend_staff_timekeeper', '시간지기의 지팡이', '🪄 전설 무기', 0.5, legendary((k, g) => staffShape(k, g, 3), (k, g, glow, white) => { g.add(k.at(k.rot(k.mesh(new k.THREE.TorusGeometry(0.11, 0.012, 3, 16), glow), Math.PI / 2, 0, 0), 0, 0.98, 0)); g.add(k.at(k.box(0.012, 0.08, 0.012, white, 0), 0, 1.01, 0.02)); })],
  ['legend_book_forbidden', '봉인 풀린 금서', '📖 전설 보조무기', 0.3, legendary((k, g) => bookShape(k, g, 2), (k, g, glow) => { for (const s of [-1, 1]) g.add(k.at(k.box(0.24, 0.02, 0.02, glow, 0), 0, s * 0.08, 0.04)); })],
  ['legend_helmet_lumi', '루미의 깃털 투구', '⛑️ 전설 투구', 0.3, legendary((k, g) => helmetShape(k, g, 3), (k, g, glow) => { for (let i = 0; i < 3; i++) g.add(k.at(k.rot(k.scl(k.cone(0.04, 0.2, k.mat('legendFeather', '#f6f2ff'), 4), 1, 1, 0.3), -0.3 - i * 0.2, 0, (i - 1) * 0.3), (i - 1) * 0.05, 0.25, -0.05)); g.add(k.at(k.ball(0.03, glow, 0), 0, 0.2, 0.15)); })],
  ['legend_armor_lantern', '등불 수호 갑옷', '🥋 전설 갑옷', 0.35, legendary((k, g) => armorShape(k, g, 3), (k, g, glow) => { g.add(k.at(k.box(0.09, 0.11, 0.04, glow, 0), 0, 0.02, 0.15)); })],
  ['legend_gloves_candle', '촛불 장갑', '🧤 전설 장갑', 0.25, legendary((k, g) => glovesShape(k, g, 3), (k, g, glow) => { for (const s of [-1, 1]) g.add(k.at(k.scl(k.ball(0.025, glow, 0), 1, 1.6, 1), s * 0.11, 0.15, 0)); })],
  ['legend_boots_wind', '바람 장화', '👢 전설 신발', 0.12, legendary((k, g) => bootsShape(k, g, 3), (k, g, glow) => { for (const s of [-1, 1]) for (let i = 0; i < 2; i++) g.add(k.at(k.rot(k.scl(k.cone(0.03, 0.12, k.mat('legendWing', '#ffffff'), 3), 1, 1, 0.3), 0, 0, s * (1.2 + i * 0.3)), s * 0.18, 0.14 + i * 0.03, -0.03)); })],
  ['legend_ring_starlight', '별빛 반지', '💍 전설 반지', 0.25, legendary((k, g) => ringShape(k, g, 4), (k, g, glow) => { g.add(k.at(k.rot(k.mesh(new k.THREE.TorusGeometry(0.075, 0.006, 3, 14), glow), 0, 0, 0), 0, 0, 0)); })],
  ['legend_necklace_memory', '기억의 목걸이', '📿 전설 목걸이', 0.3, legendary((k, g) => necklaceShape(k, g, 3), (k, g, glow) => { g.add(k.at(k.mesh(new k.THREE.OctahedronGeometry(0.03, 0), glow), 0, -0.1, 0)); })],
];
for (const [name, label, role, hover, shape] of LEGENDS) add(name, label, role, hover, shape, { seed: 490, scale: name.includes('ring') || name.includes('necklace') ? 1.4 : 1 });

export const EDU_ITEMS = list;
