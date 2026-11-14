// Shared pieces for the educational ARPG set ("망각의 그림자").
// Spec (see README): 1 unit = 1 m = one dungeon tile, front = +Z, flat-shaded vertex colours,
// named part groups the game rotates in code, no gore: defeated monsters scatter into
// light shards and letter fragments.
import { createKit } from '../core/kit.js';
import { TAU, clamp01, smooth } from '../core/monster.js';

// Always the cute style (horror 0), whatever the viewer's horror slider says.
export const eduKit = (seed, jitter = 0.5) => createKit(seed, jitter, 0);

export const glowMat = (k, name, color, intensity = 1.6, opacity = 1) => k.mat(name, color, {
  emissive: color, emissiveIntensity: intensity, keepColor: true,
  ...(opacity < 1 ? { transparent: true, opacity, depthWrite: false } : {}),
});

export const sizeSchema = { seed: { label: '시드', min: 1, max: 999, step: 1 }, size: { label: '크기', min: 0.5, max: 2, step: 0.01 } };
export const colorSchema = (labels) => Object.fromEntries(Object.entries(labels).map(([k, label]) => [k, { label }]));

// Letter fragments: tiny glyphs built from boxes (ㄱ, A, +, ㅇ-ish ring, L, ?) .
const GLYPHS = [
  (k, m) => [k.at(k.box(0.09, 0.022, 0.02, m, 0), 0, 0.04, 0), k.at(k.box(0.022, 0.09, 0.02, m, 0), 0.034, 0, 0)], // ㄱ
  (k, m) => [k.at(k.rot(k.box(0.022, 0.1, 0.02, m, 0), 0, 0, -0.35), -0.018, 0, 0), k.at(k.rot(k.box(0.022, 0.1, 0.02, m, 0), 0, 0, 0.35), 0.018, 0, 0), k.box(0.045, 0.018, 0.02, m, 0)], // A
  (k, m) => [k.box(0.09, 0.022, 0.02, m, 0), k.box(0.022, 0.09, 0.02, m, 0)], // +
  (k, m) => [k.mesh(new k.THREE.TorusGeometry(0.035, 0.012, 3, 8), m)], // ㅇ
  (k, m) => [k.at(k.box(0.022, 0.09, 0.02, m, 0), -0.03, 0, 0), k.at(k.box(0.07, 0.022, 0.02, m, 0), 0, -0.035, 0)], // L
  (k, m) => [k.at(k.box(0.07, 0.022, 0.02, m, 0), 0, 0.04, 0), k.at(k.box(0.022, 0.05, 0.02, m, 0), 0.025, 0.015, 0), k.at(k.box(0.022, 0.03, 0.02, m, 0), 0, -0.02, 0), k.at(k.box(0.022, 0.022, 0.02, m, 0), 0, -0.055, 0)], // ?
];

// Hidden burst group (scale ~0 at rest): light shards + letter fragments flying out.
// Returns the pivot; its children carry their flight direction in `dirs`.
export function fragments(k, parent, { y = 0.4, count = 10, spread = 1, shard = '#fff3b0', letter = '#bfe4ff' } = {}) {
  const g = k.pivot('fragments', 0, y, 0);
  const sm = glowMat(k, 'lightShard', shard, 2.2);
  const lm = glowMat(k, 'letterShard', letter, 1.8);
  const dirs = [];
  for (let i = 0; i < count; i++) {
    const f = k.pivot(`frag${i}`);
    if (i % 2) for (const m of GLYPHS[(i >> 1) % GLYPHS.length](k, lm)) f.add(m);
    else f.add(k.scl(k.mesh(new k.THREE.OctahedronGeometry(0.045, 0), sm), 0.7, 1.4, 0.7));
    const a = (i / count) * TAU + k.rand(-0.3, 0.3);
    const up = k.rand(0.2, 1);
    dirs.push([Math.cos(a) * spread, up * spread, Math.sin(a) * spread]);
    f.scale.setScalar(0.001);
    g.add(f);
  }
  g.userData.dirs = dirs;
  parent.add(g);
  return g;
}

// t: 0..1 progress of the burst. Shards fly out, spin, rise and fade (scale to 0).
export function burst(frags, t) {
  if (t <= 0) return;
  const dirs = frags.userData.dirs;
  const out = smooth(clamp01(t * 1.4));
  const s = Math.max(0.001, Math.sin(Math.PI * clamp01(t)) * 1.3);
  frags.children.forEach((f, i) => {
    const [x, y, z] = dirs[i];
    f.position.x += x * out * 0.7;
    f.position.y += y * out * 0.7 + t * 0.5;
    f.position.z += z * out * 0.7;
    f.rotation.y += t * TAU * (i % 2 ? 1 : -1);
    f.rotation.z += t * 3;
    f.scale.setScalar(s);
  });
}

// Soft dark disc on the floor (blob shadow), handy on low-end PCs with shadows off.
export function blobShadow(k, parent, r = 0.3) {
  parent.add(k.at(k.scl(k.cyl(r, r, 0.004, k.mat('blobShadow', '#000000', { transparent: true, opacity: 0.25, depthWrite: false, keepColor: true }), 12), 1, 1, 0.85), 0, 0.003, 0));
}

// Cheap cute eyes (the shared kit's eyes cost ~180 triangles each): white, pupil, shine.
// Pivots eyeL / eyeR (blink by scaling Y). Returns [eyeL, eyeR].
export function cuteEyes(k, parent, { y, z, spacing, size, pupil = '#1d1b26', look = 0 }) {
  const white = k.mat('eyeWhite', '#ffffff');
  const pm = k.mat('pupil', pupil);
  const shine = k.mat('shine', '#ffffff', { emissive: '#ffffff', emissiveIntensity: 0.5 });
  return [['L', 1], ['R', -1]].map(([n, s]) => {
    const e = k.pivot(`eye${n}`, s * spacing, y, z);
    e.add(k.scl(k.ball(size, white, 1), 1, 1.1, 0.7));
    e.add(k.at(k.scl(k.ball(size * 0.62, pm, 0), 1, 1.15, 0.6), look * size * 0.2, -size * 0.05, size * 0.5));
    e.add(k.at(k.box(size * 0.3, size * 0.3, size * 0.1, shine, 0), size * 0.22, size * 0.25, size * 0.82));
    parent.add(e);
    return e;
  });
}
export function cuteCheeks(k, parent, { y, z, spacing, size = 0.03, color = '#ff9aa8' }) {
  const m = k.mat('cheek', color, { roughness: 1 });
  for (const s of [-1, 1]) parent.add(k.at(k.scl(k.ball(size, m, 0), 1, 0.6, 0.35), s * spacing, y, z));
}
