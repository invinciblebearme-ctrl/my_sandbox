// 속삭이는 숲 tileset (stage 1). 1 unit = 1 m = one tile.
//   floor tiles: 1 x 1, top surface at y = 0 (slab goes 0.1 below)
//   walls: centre-line pieces, 1.4 high, 0.5 thick, along X through the tile centre
//          corner = arms to +X and +Z, tee = arms to -X, +X and +Z, end = arm to +X
//   lights: a `lightPoint` node marks where the game should put a PointLight
//           (colour and range in models/edu/manifest.json)
import { finalizeMonster, TAU, keys, clamp01, smooth } from '../core/monster.js';
import { eduKit, glowMat, sizeSchema } from './common.js';

const Z = Math.PI / 2;
const C = {
  grass: '#5aa05a', grass2: '#4a8a52', dirt: '#8a6a48', stone: '#8f9a96', stone2: '#7a8682', moss: '#6aa84a',
  hedge: '#3f8a4f', hedge2: '#4fa05c', bark: '#7a5236', leaf: '#4fae5c', leaf2: '#3a9a5a', leafTeal: '#3aa894',
};

function prop(name, label, role, build, { anims = {}, clips = {}, light = null, seed = 500 } = {}) {
  return {
    label, role, file: `props/${name}.glb`, light,
    defaults: { seed, size: 1 },
    schema: sizeSchema,
    build(p) {
      const k = eduKit(p.seed, 0.5);
      const root = k.pivot('root');
      root.name = name;
      root.scale.setScalar(p.size);
      const rig = {};
      build(k, root, rig);
      if (light) root.add(k.pivot('lightPoint', ...light.at));
      return finalizeMonster(root, { rig, params: p, animations: anims, clips });
    },
  };
}
const m = (k, name, opts) => k.mat(name, C[name] ?? name, opts);

// ---- floors -------------------------------------------------------------------------------
function slab(k, g, top) {
  g.add(k.at(k.box(1, 0.1, 1, m(k, 'dirt'), 0), 0, -0.05, 0));
  g.add(k.at(k.box(0.98, 0.02, 0.98, top, 0.006, 2), 0, -0.01, 0));
}
const floors = {
  stage1_floor_01: ['풀밭', (k, g) => slab(k, g, m(k, 'grass'))],
  stage1_floor_02: ['짙은 풀밭', (k, g) => { slab(k, g, m(k, 'grass2')); for (let i = 0; i < 3; i++) g.add(k.at(k.scl(k.ball(0.12, m(k, 'grass'), 0), 1, 0.15, 1), k.rand(-0.35, 0.35), 0.005, k.rand(-0.35, 0.35))); }],
  stage1_floor_03: ['돌길', (k, g) => {
    slab(k, g, m(k, 'dirt'));
    for (let i = 0; i < 6; i++) g.add(k.at(k.rot(k.box(k.rand(0.22, 0.32), 0.04, k.rand(0.2, 0.28), m(k, i % 2 ? 'stone' : 'stone2'), 0.01), 0, k.rand(0, 1), 0), -0.25 + (i % 3) * 0.25 + k.rand(-0.04, 0.04), 0.005, i < 3 ? -0.2 : 0.2));
  }],
  stage1_floor_04: ['갈라진 땅', (k, g) => {
    slab(k, g, m(k, 'dirt'));
    const crack = k.mat('crack', '#4a3826');
    for (const [x, z, l, a] of [[0, 0, 0.5, 0.4], [0.2, 0.15, 0.25, -0.6], [-0.18, -0.12, 0.3, 1.2]]) g.add(k.at(k.rot(k.box(l, 0.012, 0.025, crack, 0), 0, a, 0), x, 0.001, z));
  }],
  stage1_floor_05: ['이끼 낀 땅', (k, g) => {
    slab(k, g, m(k, 'grass'));
    for (let i = 0; i < 4; i++) g.add(k.at(k.scl(k.ball(0.15, m(k, 'moss'), 0), 1, 0.2, 1), k.rand(-0.3, 0.3), 0.01, k.rand(-0.3, 0.3)));
  }],
  stage1_floor_06: ['낙엽 바닥', (k, g) => {
    slab(k, g, m(k, 'grass2'));
    const leaves = [k.mat('leafOrange', '#e08a3a'), k.mat('leafYellow', '#e8c04a'), k.mat('leafRed', '#c8503a')];
    for (let i = 0; i < 8; i++) g.add(k.at(k.rot(k.box(0.08, 0.008, 0.05, leaves[i % 3], 0), 0, k.rand(0, 3), 0), k.rand(-0.4, 0.4), 0.004, k.rand(-0.4, 0.4)));
  }],
};

// ---- walls --------------------------------------------------------------------------------
// one wall arm from the tile centre along +X (rotate it for the other directions)
function wallArm(k, g, len = 0.5, x0 = 0, ry = 0, roots = false) {
  const a = k.pivot('arm');
  a.add(k.at(k.box(len, 0.55, 0.5, m(k, 'stone'), 0.015), len / 2, 0.275, 0));
  for (let i = 0; i < Math.round(len / 0.25); i++) {
    a.add(k.at(k.box(0.2, 0.14, 0.04, m(k, 'stone2'), 0.01), 0.12 + i * 0.25, 0.15 + (i % 2) * 0.22, 0.25));
    a.add(k.at(k.box(0.2, 0.14, 0.04, m(k, 'stone2'), 0.01), 0.12 + i * 0.25, 0.2 + (i % 2) * 0.18, -0.25));
  }
  a.add(k.at(k.box(len, 0.85, 0.56, m(k, 'hedge'), 0.03), len / 2, 0.97, 0)); // hedge on top
  a.add(k.at(k.scl(k.ball(0.22, m(k, 'hedge2'), 0, 0.02), 1.2, 0.8, 1.2), len * 0.5, 1.38, 0.05));
  if (roots) for (const s of [-1, 1]) a.add(k.at(k.rot(k.cyl(0.03, 0.05, 0.5, m(k, 'bark'), 5), s * 0.5, 0, 0.6), len * 0.5, 0.35, s * 0.27));
  // mossy patch
  a.add(k.at(k.scl(k.ball(0.12, m(k, 'moss'), 0), 1.4, 0.5, 0.4), len * 0.4, 0.55, 0.26));
  // the arm geometry is static: unwrap it into g with the transform baked
  a.position.x = x0;
  a.rotation.y = ry;
  g.add(a);
  return a;
}
// merge wrapper groups (they are not animated, so they should not become nodes)
function bakeGroups(root) {
  root.updateMatrixWorld(true);
  for (const grp of root.children.filter((c) => !c.isMesh && c.name === 'arm')) {
    for (const mesh of [...grp.children]) {
      mesh.applyMatrix4(grp.matrix);
      root.add(mesh);
    }
    root.remove(grp);
  }
}
const walls = {
  stage1_wall_straight: ['벽 (직선)', (k, g) => { wallArm(k, g, 1, -0.5); }],
  stage1_wall_straight_02: ['벽 (직선, 뿌리)', (k, g) => { wallArm(k, g, 1, -0.5, 0, true); }],
  stage1_wall_corner: ['벽 (모서리: +X, +Z)', (k, g) => { wallArm(k, g, 0.75, -0.25); wallArm(k, g, 0.5, 0, -Z); }],
  stage1_wall_tee: ['벽 (T자)', (k, g) => { wallArm(k, g, 1, -0.5); wallArm(k, g, 0.5, 0, -Z); }],
  stage1_wall_end: ['벽 (끝)', (k, g) => {
    wallArm(k, g, 0.75, -0.25);
    g.add(k.at(k.cyl(0.3, 0.32, 1.5, m(k, 'stone'), 7, 0.015), -0.25, 0.75, 0));
    g.add(k.at(k.scl(k.ball(0.3, m(k, 'hedge2'), 0, 0.02), 1, 0.7, 1), -0.25, 1.55, 0));
  }],
  stage1_wall_pillar: ['벽 기둥', (k, g) => {
    g.add(k.at(k.cyl(0.3, 0.34, 1.5, m(k, 'stone'), 7, 0.015), 0, 0.75, 0));
    g.add(k.at(k.scl(k.ball(0.32, m(k, 'hedge2'), 0, 0.02), 1, 0.7, 1), 0, 1.55, 0));
  }],
  stage1_wall_door: ['벽 (문 프레임)', (k, g) => {
    // posts at the tile edges, a mossy stone arch over a 0.7 m opening
    for (const s of [-1, 1]) {
      g.add(k.at(k.box(0.15, 1.5, 0.5, m(k, 'stone'), 0.012), s * 0.425, 0.75, 0));
      g.add(k.at(k.box(0.17, 0.12, 0.54, m(k, 'stone2'), 0.01), s * 0.425, 0.06, 0));
    }
    g.add(k.at(k.box(1, 0.2, 0.5, m(k, 'stone'), 0.012), 0, 1.55, 0));
    g.add(k.at(k.scl(k.ball(0.3, m(k, 'hedge2'), 0, 0.02), 2, 0.6, 1), 0, 1.72, 0));
    g.add(k.at(k.box(0.12, 0.12, 0.04, glowMat(k, 'keystone', '#ffd36a', 1.2), 0), 0, 1.55, 0.26));
  }],
};

// ---- props ----------------------------------------------------------------------------------
const sway = (key = 'canopy', amount = 0.04) => ({
  idle: { label: '바람에 살랑', duration: 3, apply(r, u) { r[key].rotation.z += Math.sin(u * TAU) * amount; r[key].rotation.x += Math.sin(u * TAU * 2 + 1) * amount * 0.5; } },
});
const glowPulse = (key, amount = 0.12, duration = 2) => ({
  idle: { label: '빛이 일렁임', duration, apply(r, u) { r[key].scale.setScalar(1 + Math.sin(u * TAU) * amount + Math.sin(u * TAU * 3) * amount * 0.3); } },
});

const props = {
  stage1_tree_01: ['둥근 나무', (k, g, r) => {
    g.add(k.at(k.cyl(0.12, 0.18, 1.2, m(k, 'bark'), 6, 0.01), 0, 0.6, 0));
    for (const s of [-1, 1]) g.add(k.at(k.rot(k.cyl(0.04, 0.08, 0.35, m(k, 'bark'), 5), 0, s, s * 1.1), s * 0.18, 0.1, 0));
    const c = k.pivot('canopy', 0, 1.1, 0);
    c.add(k.at(k.ball(0.6, m(k, 'leaf'), 1, 0.05), 0, 0.5, 0));
    c.add(k.at(k.ball(0.42, m(k, 'leaf2'), 1, 0.04), 0.38, 0.3, 0.1));
    c.add(k.at(k.ball(0.4, m(k, 'leaf2'), 1, 0.04), -0.35, 0.35, -0.12));
    g.add(c);
    r.canopy = c;
  }, { anims: sway(), clips: { idle: 'idle' }, seed: 511 }],
  stage1_tree_02: ['속삭이는 나무 (청록 잎)', (k, g, r) => {
    g.add(k.at(k.cyl(0.1, 0.16, 1.6, m(k, 'bark'), 6, 0.012), 0, 0.8, 0));
    const c = k.pivot('canopy', 0, 1.2, 0);
    for (let i = 0; i < 3; i++) c.add(k.at(k.cone(0.6 - i * 0.14, 0.75, m(k, i % 2 ? 'leafTeal' : 'leaf2'), 7, 0.03), 0, 0.2 + i * 0.42, 0));
    for (let i = 0; i < 3; i++) c.add(k.at(k.ball(0.035, glowMat(k, 'firefly', '#e8ff7a', 2.2), 0), Math.cos(i * 2.1) * 0.5, 0.4 + i * 0.3, Math.sin(i * 2.1) * 0.5));
    g.add(c);
    r.canopy = c;
  }, { anims: sway('canopy', 0.03), clips: { idle: 'idle' }, seed: 512 }],
  stage1_stump: ['그루터기', (k, g) => {
    g.add(k.at(k.cyl(0.26, 0.32, 0.35, m(k, 'bark'), 8, 0.012), 0, 0.175, 0));
    g.add(k.at(k.cyl(0.24, 0.24, 0.02, k.mat('ring', '#d8b07a'), 8), 0, 0.355, 0));
    g.add(k.at(k.scl(k.ball(0.08, k.mat('shroom', '#e8604a'), 0), 1, 0.5, 1), 0.2, 0.3, 0.15));
  }, { seed: 513 }],
  stage1_rock_01: ['바위', (k, g) => {
    g.add(k.at(k.scl(k.ball(0.4, m(k, 'stone'), 1, 0.06), 1.2, 0.75, 1), 0, 0.25, 0));
    g.add(k.at(k.scl(k.ball(0.22, m(k, 'moss'), 0, 0.02), 1.3, 0.35, 1.1), -0.05, 0.5, 0.05));
  }, { seed: 514 }],
  stage1_rock_02: ['작은 바위 무리', (k, g) => {
    for (const [x, z, s] of [[0, 0, 0.22], [0.28, 0.1, 0.14], [-0.22, 0.15, 0.12]]) g.add(k.at(k.scl(k.ball(s, m(k, 'stone2'), 0, 0.03), 1.1, 0.8, 1), x, s * 0.7, z));
  }, { seed: 515 }],
  stage1_bush: ['덤불', (k, g) => {
    for (const [x, y, z, s] of [[0, 0.22, 0, 0.3], [0.25, 0.16, 0.05, 0.22], [-0.24, 0.15, -0.05, 0.22]]) g.add(k.at(k.ball(s, m(k, 'leaf'), 1, 0.03), x, y, z));
    for (let i = 0; i < 4; i++) g.add(k.at(k.ball(0.035, k.mat('berry', '#e84a6a'), 0), Math.cos(i * 1.6) * 0.3, 0.25 + (i % 2) * 0.1, 0.18 + Math.sin(i * 1.6) * 0.05));
  }, { seed: 516 }],
  stage1_log: ['쓰러진 통나무', (k, g) => {
    g.add(k.at(k.rot(k.cyl(0.18, 0.2, 1.4, m(k, 'bark'), 7, 0.012), 0, 0, Z), 0, 0.18, 0));
    for (const s of [-1, 1]) g.add(k.at(k.rot(k.cyl(0.16, 0.16, 0.02, k.mat('ring', '#d8b07a'), 7), 0, 0, Z), s * 0.71, 0.18, 0));
    g.add(k.at(k.scl(k.ball(0.2, m(k, 'moss'), 0), 1.6, 0.4, 0.9), 0.1, 0.34, 0));
  }, { seed: 517 }],
  stage1_rune_stone: ['글자 비석 (지식의 돌)', (k, g, r) => {
    g.add(k.at(k.box(0.5, 1.0, 0.22, m(k, 'stone'), 0.02), 0, 0.5, 0));
    g.add(k.at(k.scl(k.ball(0.28, m(k, 'stone2'), 0, 0.02), 1, 0.5, 0.6), 0, 1.0, 0));
    g.add(k.at(k.box(0.6, 0.12, 0.3, m(k, 'stone2'), 0.01), 0, 0.06, 0));
    const glyphs = k.pivot('glyphs', 0, 0.55, 0.115);
    const gm = glowMat(k, 'runeGlow', '#8ad8ff', 1.6);
    for (let i = 0; i < 3; i++) {
      glyphs.add(k.at(k.box(0.22, 0.03, 0.02, gm, 0), 0, 0.18 - i * 0.16, 0));
      glyphs.add(k.at(k.box(0.03, 0.08, 0.02, gm, 0), -0.06 + (i % 2) * 0.12, 0.13 - i * 0.16, 0));
    }
    g.add(glyphs);
    r.glyphs = glyphs;
  }, { anims: glowPulse('glyphs', 0.04, 2.5), clips: { idle: 'idle' }, seed: 518 }],
  stage1_signpost: ['표지판', (k, g) => {
    g.add(k.at(k.cyl(0.04, 0.05, 1.2, m(k, 'bark'), 5), 0, 0.6, 0));
    g.add(k.at(k.rot(k.box(0.5, 0.16, 0.04, k.mat('plank', '#b08050'), 0.005), 0, 0, 0.08), 0.1, 1.0, 0.04));
    g.add(k.at(k.rot(k.box(0.4, 0.14, 0.04, k.mat('plank', '#b08050'), 0.005), 0, 0.3, -0.1), -0.06, 0.78, 0.04));
  }, { seed: 519 }],
  stage1_mushroom_glow: ['빛나는 버섯 (조명)', (k, g, r) => {
    const glow = k.pivot('glow');
    for (const [x, z, h, s] of [[0, 0, 0.32, 0.16], [0.18, 0.1, 0.2, 0.11], [-0.14, 0.12, 0.16, 0.09]]) {
      g.add(k.at(k.cyl(0.03 * s * 8, 0.04 * s * 8, h, k.mat('stem', '#f2ead0'), 5), x, h / 2, z));
      glow.add(k.at(k.scl(k.dome(s, glowMat(k, 'capGlow', '#5ae8ff', 1.4), 7), 1, 0.7, 1), x, h, z));
    }
    g.add(glow);
    r.glow = glow;
  }, { anims: glowPulse('glow', 0.06), clips: { idle: 'idle' }, light: { at: [0, 0.4, 0], color: '#5ae8ff', intensity: 1.2, range: 3 }, seed: 520 }],
  stage1_lantern_post: ['등불 기둥 (조명)', (k, g, r) => {
    const iron = k.mat('iron', '#3a3a44', { metalness: 0.6, roughness: 0.4 });
    g.add(k.at(k.cyl(0.04, 0.06, 1.6, k.mat('post', '#6a4a30'), 6), 0, 0.8, 0));
    g.add(k.at(k.box(0.35, 0.04, 0.04, iron, 0), 0.15, 1.55, 0));
    g.add(k.at(k.cyl(0.015, 0.015, 0.1, iron, 4), 0.3, 1.5, 0));
    g.add(k.at(k.cone(0.12, 0.1, iron, 4), 0.3, 1.38, 0));
    g.add(k.at(k.box(0.16, 0.03, 0.16, iron, 0), 0.3, 1.13, 0));
    const flame = k.pivot('flame', 0.3, 1.24, 0);
    flame.add(k.box(0.13, 0.17, 0.13, glowMat(k, 'lanternGlass', '#ffd36a', 2.2, 0.85), 0));
    flame.add(k.at(k.scl(k.ball(0.04, glowMat(k, 'wick', '#ffffff', 3), 0), 1, 1.6, 1), 0, 0, 0));
    g.add(flame);
    r.flame = flame;
  }, { anims: glowPulse('flame', 0.05, 1.3), clips: { idle: 'idle' }, light: { at: [0.3, 1.24, 0], color: '#ffc36a', intensity: 1.6, range: 5 }, seed: 521 }],
  stage1_crystal: ['빛 수정 (조명)', (k, g, r) => {
    g.add(k.at(k.scl(k.ball(0.22, m(k, 'stone2'), 0, 0.02), 1.2, 0.5, 1), 0, 0.08, 0));
    const glow = k.pivot('glow', 0, 0.1, 0);
    for (const [x, z, h, a] of [[0, 0, 0.6, 0], [0.12, 0.05, 0.4, -0.4], [-0.1, 0.06, 0.35, 0.45], [0.02, -0.1, 0.3, 0.3]]) {
      glow.add(k.at(k.rot(k.scl(k.mesh(new k.THREE.OctahedronGeometry(0.1, 0), glowMat(k, 'crystalGlow', '#9a8aff', 1.6, 0.9)), 0.8, h * 3, 0.8), a * 0.5, 0, a), x, h * 0.5, z));
    }
    g.add(glow);
    r.glow = glow;
  }, { anims: glowPulse('glow', 0.04, 2.6), clips: { idle: 'idle' }, light: { at: [0, 0.5, 0], color: '#9a8aff', intensity: 1.2, range: 4 }, seed: 522 }],
  stage1_candle_stand: ['촛대 (조명)', (k, g, r) => {
    const brass = k.mat('brass', '#c8a04a', { metalness: 0.7, roughness: 0.35 });
    g.add(k.at(k.cyl(0.14, 0.16, 0.04, brass, 7), 0, 0.02, 0));
    g.add(k.at(k.cyl(0.025, 0.03, 0.9, brass, 5), 0, 0.47, 0));
    g.add(k.at(k.cyl(0.1, 0.06, 0.04, brass, 7), 0, 0.93, 0));
    g.add(k.at(k.cyl(0.035, 0.035, 0.14, k.mat('wax', '#fff6e0'), 6), 0, 1.02, 0));
    const flame = k.pivot('flame', 0, 1.13, 0);
    flame.add(k.scl(k.ball(0.03, glowMat(k, 'candleFlame', '#ffb43a', 2.6), 0), 1, 1.8, 1));
    g.add(flame);
    r.flame = flame;
  }, { anims: { idle: { label: '촛불 흔들림', duration: 1, apply(r, u) { r.flame.scale.y += Math.sin(u * TAU * 2) * 0.15; r.flame.rotation.z += Math.sin(u * TAU) * 0.15; } } }, clips: { idle: 'idle' }, light: { at: [0, 1.15, 0], color: '#ffb46a', intensity: 1.0, range: 3.5 }, seed: 523 }],
};

// ---- floor decorations (no collision) ------------------------------------------------------
const decor = {
  stage1_deco_grass: ['풀 무더기', (k, g) => { for (let i = 0; i < 6; i++) g.add(k.at(k.rot(k.cone(0.03, k.rand(0.15, 0.26), m(k, i % 2 ? 'leaf' : 'leaf2'), 3), k.rand(-0.3, 0.3), 0, k.rand(-0.3, 0.3)), k.rand(-0.1, 0.1), 0.08, k.rand(-0.1, 0.1))); }],
  stage1_deco_pebbles: ['조약돌', (k, g) => { for (let i = 0; i < 5; i++) g.add(k.at(k.scl(k.ball(k.rand(0.03, 0.06), m(k, 'stone2'), 0), 1, 0.6, 1), k.rand(-0.2, 0.2), 0.015, k.rand(-0.2, 0.2))); }],
  stage1_deco_flowers: ['꽃', (k, g) => {
    const cols = ['#ff8ac2', '#ffe14a', '#8ac8ff'];
    for (let i = 0; i < 4; i++) {
      const x = k.rand(-0.15, 0.15); const z = k.rand(-0.15, 0.15); const h = k.rand(0.1, 0.18);
      g.add(k.at(k.cyl(0.006, 0.006, h, m(k, 'leaf2'), 3), x, h / 2, z));
      g.add(k.at(k.scl(k.ball(0.03, k.mat(`petal${i % 3}`, cols[i % 3]), 0), 1, 0.5, 1), x, h, z));
    }
  }],
  stage1_deco_paper: ['종이 조각 (지워진 지식)', (k, g) => {
    const paper = k.mat('paper', '#f2ead6');
    const ink = k.mat('inkLine', '#5a5a7a');
    for (let i = 0; i < 4; i++) {
      const x = k.rand(-0.25, 0.25); const z = k.rand(-0.25, 0.25); const a = k.rand(0, 3);
      g.add(k.at(k.rot(k.box(0.12, 0.004, 0.16, paper, 0), k.rand(-0.1, 0.1), a, 0), x, 0.006, z));
      g.add(k.at(k.rot(k.box(0.07, 0.005, 0.01, ink, 0), 0, a, 0), x, 0.009, z));
    }
  }],
  stage1_deco_leaves: ['낙엽', (k, g) => {
    const leaves = [k.mat('leafOrange', '#e08a3a'), k.mat('leafYellow', '#e8c04a'), k.mat('leafRed', '#c8503a')];
    for (let i = 0; i < 7; i++) g.add(k.at(k.rot(k.box(0.07, 0.006, 0.045, leaves[i % 3], 0), k.rand(-0.2, 0.2), k.rand(0, 3), 0), k.rand(-0.3, 0.3), 0.005, k.rand(-0.3, 0.3)));
  }],
};

// ---- interactive objects ------------------------------------------------------------------
const chestAnims = {
  idle: { label: '닫힘 (반짝)', duration: 2, apply(r, u) { r.sparkle.scale.setScalar(Math.max(0.001, Math.max(0, Math.sin(u * TAU)) * 1)); r.lid.rotation.x += 0; } },
  open: {
    label: '열기 (뚜껑 + 빛)', duration: 1, loop: false,
    apply(r, u) {
      r.lid.rotation.x -= keys(u, [[0, 0], [0.15, -0.08], [0.5, 1.9], [0.65, 1.75], [1, 1.8]]);
      r.lid.position.y += keys(u, [[0, 0], [0.1, 0.03], [0.2, 0], [1, 0]]);
      r.light.scale.setScalar(Math.max(0.001, keys(u, [[0, 0], [0.3, 0], [0.6, 1.3], [1, 1]])));
      r.sparkle.scale.setScalar(0.001);
    },
  },
  opened: { label: '열린 상태 (유지)', duration: 2, apply(r, u) { r.lid.rotation.x -= 1.8; r.light.scale.setScalar(1 + Math.sin(u * TAU) * 0.08); r.sparkle.scale.setScalar(0.001); } },
};
const doorAnims = {
  idle: { label: '잠김', duration: 2, apply(r, u) { r.lock.rotation.z += Math.sin(u * TAU) * 0.05; } },
  open: {
    label: '열쇠로 열기', duration: 1.4, loop: false,
    apply(r, u) {
      r.lock.rotation.z += keys(u, [[0, 0], [0.2, 0.3], [0.3, -0.3], [0.4, 0], [1, 0]]);
      r.lock.position.y -= keys(u, [[0, 0], [0.4, 0], [0.65, 0.8], [1, 0.8]]);
      r.lock.scale.setScalar(Math.max(0.001, 1 - smooth(clamp01((u - 0.5) / 0.2))));
      r.doorL.rotation.y -= keys(u, [[0, 0], [0.5, 0], [1, 1.6]]);
      r.doorR.rotation.y += keys(u, [[0, 0], [0.5, 0], [1, 1.6]]);
    },
  },
};
const potAnims = {
  break: {
    label: '깨지기 (조각 + 반짝)', duration: 0.8, loop: false,
    apply(r, u) {
      r.pot.scale.setScalar(u < 0.08 ? 1 + u : 0.001);
      r.shards.children.forEach((s, i) => {
        const a = (i / r.shards.children.length) * TAU;
        const f = smooth(clamp01(u / 0.6));
        s.scale.setScalar(u < 0.06 ? 0.001 : Math.max(0.001, 1 - smooth(clamp01((u - 0.6) / 0.4))));
        s.position.x += Math.cos(a) * f * 0.45;
        s.position.z += Math.sin(a) * f * 0.45;
        s.position.y += Math.sin(Math.PI * f) * 0.3 - f * 0.25;
        s.rotation.x += f * 4;
      });
    },
  },
};
const stairsAnims = {
  idle: { label: '빛 기둥 (다음 층)', duration: 2.4, apply(r, u) { r.beam.scale.set(1 + Math.sin(u * TAU) * 0.08, 1 + Math.sin(u * TAU * 2) * 0.05, 1 + Math.sin(u * TAU) * 0.08); r.beam.rotation.y += u * TAU; } },
};

const interactive = {
  stage1_chest: ['보물상자 (닫힘 → 열림)', (k, g, r) => {
    const wood = k.mat('chestWood', '#9a5a2a');
    const band = k.mat('chestBand', '#f2c14e', { metalness: 0.6, roughness: 0.35 });
    g.add(k.at(k.box(0.7, 0.36, 0.46, wood, 0.006), 0, 0.18, 0));
    for (const x of [-0.25, 0.25]) g.add(k.at(k.box(0.06, 0.37, 0.47, band, 0), x, 0.18, 0));
    const lid = k.pivot('lid', 0, 0.36, -0.23); // hinge at the back
    lid.add(k.at(k.scl(k.rot(k.cyl(0.23, 0.23, 0.7, wood, 8, 0.004), 0, 0, Z), 1, 0.55, 1), 0, 0, 0.23));
    for (const x of [-0.25, 0.25]) lid.add(k.at(k.scl(k.rot(k.cyl(0.235, 0.235, 0.06, band, 8), 0, 0, Z), 1, 0.56, 1), x, 0, 0.23));
    lid.add(k.at(k.box(0.12, 0.14, 0.04, band, 0), 0, -0.02, 0.47)); // lock plate
    lid.add(k.at(k.box(0.68, 0.01, 0.44, wood, 0), 0, 0, 0.23)); // lid bottom
    g.add(lid);
    const light = k.pivot('light', 0, 0.36, 0); // golden light from inside
    light.add(k.at(k.cone(0.3, 0.6, glowMat(k, 'treasureGlow', '#ffe08a', 1.6, 0.45), 6), 0, 0.3, 0));
    light.add(k.box(0.6, 0.04, 0.38, glowMat(k, 'treasure', '#ffd34a', 1.4), 0));
    light.scale.setScalar(0.001);
    g.add(light);
    const sparkle = k.pivot('sparkle', 0.24, 0.5, 0.25);
    sparkle.add(k.box(0.08, 0.015, 0.015, glowMat(k, 'spark', '#ffffff', 2.5), 0));
    sparkle.add(k.box(0.015, 0.08, 0.015, glowMat(k, 'spark', '#ffffff', 2.5), 0));
    g.add(sparkle);
    Object.assign(r, { lid, light, sparkle });
  }, { anims: chestAnims, clips: { idle: 'idle', open: 'open', opened: 'opened' }, seed: 531 }],
  stage1_door_locked: ['잠긴 문 (열쇠)', (k, g, r) => {
    const stone = m(k, 'stone');
    const plank = k.mat('doorWood', '#8a5a32');
    const iron = k.mat('doorIron', '#4a4a56', { metalness: 0.6, roughness: 0.4 });
    for (const s of [-1, 1]) g.add(k.at(k.box(0.15, 1.6, 0.5, stone, 0.012), s * 0.425, 0.8, 0));
    g.add(k.at(k.box(1, 0.2, 0.5, stone, 0.012), 0, 1.7, 0));
    g.add(k.at(k.scl(k.ball(0.3, m(k, 'hedge2'), 0, 0.02), 2, 0.6, 1), 0, 1.86, 0));
    const doors = {};
    for (const [n, s] of [['L', -1], ['R', 1]]) { // hinges at the posts
      const d = k.pivot(`door${n}`, s * 0.35, 0, 0);
      d.add(k.at(k.box(0.35, 1.5, 0.08, plank, 0.004), -s * 0.175, 0.75, 0));
      for (const y of [0.35, 1.15]) d.add(k.at(k.box(0.34, 0.06, 0.1, iron, 0), -s * 0.175, y, 0));
      d.add(k.at(k.mesh(new k.THREE.TorusGeometry(0.04, 0.01, 3, 8), iron), -s * 0.3, 0.8, 0.06));
      g.add(d);
      doors[n] = d;
    }
    const lock = k.pivot('lock', 0, 0.8, 0.07); // a big glowing padlock
    lock.add(k.box(0.16, 0.14, 0.06, k.mat('padlock', '#f2c14e', { metalness: 0.7, roughness: 0.3 }), 0));
    lock.add(k.at(k.mesh(new k.THREE.TorusGeometry(0.05, 0.015, 3, 8, Math.PI), iron), 0, 0.07, 0));
    lock.add(k.at(k.box(0.03, 0.05, 0.065, glowMat(k, 'keyhole', '#5ae8ff', 2), 0), 0, -0.01, 0));
    g.add(lock);
    Object.assign(r, { doorL: doors.L, doorR: doors.R, lock });
  }, { anims: doorAnims, clips: { idle: 'idle', open: 'open' }, seed: 532 }],
  stage1_stairs_down: ['다음 층 계단 (빛 기둥)', (k, g, r) => {
    const stone = m(k, 'stone');
    // a 1 x 1 hole in the floor with steps going down toward -Z
    for (const [x, w] of [[-0.45, 0.1], [0.45, 0.1]]) g.add(k.at(k.box(w, 0.12, 1, stone, 0.006), x, 0.04, 0));
    g.add(k.at(k.box(1, 0.12, 0.1, stone, 0.006), 0, 0.04, -0.45));
    g.add(k.at(k.box(0.8, 0.5, 0.8, k.mat('pit', '#1a1a2a'), 0), 0, -0.26, 0));
    for (let i = 0; i < 4; i++) g.add(k.at(k.box(0.78, 0.04, 0.2, m(k, 'stone2'), 0.004), 0, -0.04 - i * 0.12, 0.3 - i * 0.2));
    const beam = k.pivot('beam', 0, 0, 0);
    beam.add(k.at(k.cyl(0.4, 0.45, 1.6, glowMat(k, 'stairBeam', '#8ad8ff', 1.2, 0.25), 8), 0, 0.8, 0));
    beam.add(k.at(k.rot(k.mesh(new k.THREE.TorusGeometry(0.45, 0.02, 3, 16), glowMat(k, 'stairRing', '#bff0ff', 2)), Z, 0, 0), 0, 0.05, 0));
    for (let i = 0; i < 3; i++) beam.add(k.at(k.ball(0.03, glowMat(k, 'stairMote', '#ffffff', 2.5), 0), Math.cos(i * 2.1) * 0.3, 0.4 + i * 0.4, Math.sin(i * 2.1) * 0.3));
    g.add(beam);
    r.beam = beam;
  }, { anims: stairsAnims, clips: { idle: 'idle' }, light: { at: [0, 0.6, 0], color: '#8ad8ff', intensity: 1.4, range: 4 }, seed: 533 }],
  stage1_pot: ['파괴 가능한 항아리', (k, g, r) => {
    const clay = k.mat('clay', '#c8784a');
    const pot = k.pivot('pot');
    pot.add(k.at(k.scl(k.ball(0.2, clay, 1, 0.006), 1, 1.1, 1), 0, 0.22, 0));
    pot.add(k.at(k.cyl(0.1, 0.12, 0.1, clay, 7), 0, 0.46, 0));
    pot.add(k.at(k.cyl(0.13, 0.13, 0.03, k.mat('clayRim', '#a85a32'), 7), 0, 0.51, 0));
    pot.add(k.at(k.cyl(0.205, 0.205, 0.04, k.mat('potBand', '#f2e2b0'), 8), 0, 0.26, 0));
    g.add(pot);
    const shards = k.pivot('shards', 0, 0.25, 0);
    for (let i = 0; i < 6; i++) {
      const s = k.pivot(`shard${i}`);
      s.add(k.box(0.1, 0.08, 0.02, clay, 0.01));
      s.scale.setScalar(0.001);
      shards.add(s);
    }
    g.add(shards);
    Object.assign(r, { pot, shards });
  }, { anims: potAnims, clips: { break: 'break' }, seed: 534 }],
};

export const FOREST_FLOORS = {};
export const FOREST_WALLS = {};
export const FOREST_PROPS = {};
export const FOREST_DECOR = {};
export const FOREST_INTERACTIVE = {};
const fill = (target, src, role, seedBase, post) => Object.entries(src).forEach(([name, [label, fn, opts]], i) => {
  target[name] = prop(name, label, role, post ? (k, g, r) => { fn(k, g, r); post(g); } : fn, { seed: seedBase + i, ...opts });
});
fill(FOREST_FLOORS, floors, '🟩 바닥', 541);
fill(FOREST_WALLS, walls, '🧱 벽', 551, bakeGroups);
fill(FOREST_PROPS, props, '🌳 소품·조명', 561);
fill(FOREST_DECOR, decor, '🌼 바닥 장식', 581);
fill(FOREST_INTERACTIVE, interactive, '🗝️ 상호작용', 591);
export const FOREST_ALL = { ...FOREST_FLOORS, ...FOREST_WALLS, ...FOREST_PROPS, ...FOREST_DECOR, ...FOREST_INTERACTIVE };
