// Shared low-poly building kit used by every monster.
// createKit(seed, jitterScale) returns small helpers that make flat-shaded,
// slightly lumpy meshes and named pivots (pivots become animated nodes).
import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Small deterministic RNG so the same seed always gives the same monster.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createKit(seed = 1, jitterScale = 1) {
  const rng = mulberry32(seed);
  const rand = (a, b) => a + (b - a) * rng();
  const mats = {};

  const mat = (name, color, extra = {}) =>
    (mats[name] ??= new THREE.MeshStandardMaterial({
      name, color, flatShading: true, roughness: 0.85, metalness: 0, ...extra,
    }));
  const glow = (name, color, intensity = 1.5) =>
    mat(name, color, { emissive: color, emissiveIntensity: intensity, roughness: 0.5 });

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
    const m = new THREE.Mesh(jitter > 0 ? jitterGeo(geo, jitter * jitterScale) : geo, material);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  };
  const at = (obj, x = 0, y = 0, z = 0) => (obj.position.set(x, y, z), obj);
  const rot = (obj, x = 0, y = 0, z = 0) => (obj.rotation.set(x, y, z), obj);
  const scl = (obj, x = 1, y = x, z = x) => (obj.scale.set(x, y, z), obj);
  const pivot = (name, x = 0, y = 0, z = 0) => at(Object.assign(new THREE.Group(), { name }), x, y, z);

  const box = (w, h, d, material, jitter = 0.01, seg = 1) =>
    mesh(new THREE.BoxGeometry(w, h, d, seg, seg, seg), material, jitter);
  const ball = (r, material, detail = 1, jitter = 0) =>
    mesh(new THREE.IcosahedronGeometry(r, detail), material, jitter);
  const cone = (r, h, material, seg = 6, jitter = 0) =>
    mesh(new THREE.ConeGeometry(r, h, seg), material, jitter);
  const cyl = (rt, rb, h, material, seg = 7, jitter = 0) =>
    mesh(new THREE.CylinderGeometry(rt, rb, h, seg), material, jitter);
  const dome = (r, material, seg = 8, jitter = 0) =>
    mesh(new THREE.SphereGeometry(r, seg, Math.max(3, seg / 2), 0, Math.PI * 2, 0, Math.PI / 2), material, jitter);

  // Big friendly cartoon eye: white ball + pupil + highlight, in its own pivot
  // (so animations can blink it by scaling Y). Faces +Z.
  const eye = (name, size, { pupil = '#1d1b26', white = '#ffffff', look = 0 } = {}) => {
    const e = pivot(name);
    e.add(ball(size, mat('eyeWhite', white), 1));
    e.add(at(ball(size * 0.55, mat('pupil', pupil), 1), look * size * 0.2, 0, size * 0.62));
    e.add(at(ball(size * 0.18, mat('shine', '#ffffff', { emissive: '#ffffff', emissiveIntensity: 0.4 }), 0),
      size * 0.22, size * 0.25, size * 0.98));
    return e;
  };

  // Adds two eyes to `parent`, returns [eyeL, eyeR].
  const eyes = (parent, { y, z, spacing, size, prefix = 'eye', ...opts }) => {
    const l = at(eye(`${prefix}L`, size, opts), spacing, y, z);
    const r = at(eye(`${prefix}R`, size, opts), -spacing, y, z);
    parent.add(l, r);
    return [l, r];
  };

  // A curved smile made of small boxes.
  const smile = (parent, { y, z, width, color = '#3a1f2b', thick = 0.025, curve = 0.5, segs = 5 }) => {
    const m = mat('smile', color);
    for (let i = 0; i < segs; i++) {
      const t = (i / (segs - 1)) * 2 - 1; // -1..1
      const piece = box(width / segs * 1.3, thick, thick, m, 0);
      at(piece, t * width / 2, y - (1 - t * t) * width * 0.25 * curve, z);
      piece.rotation.z = -t * curve * 0.8;
      parent.add(piece);
    }
  };

  const cheeks = (parent, { y, z, spacing, size = 0.05, color = '#ff9aa8' }) => {
    const m = mat('cheek', color, { roughness: 1 });
    for (const s of [-1, 1]) {
      const c = scl(ball(size, m, 1), 1, 0.6, 0.35);
      parent.add(at(c, s * spacing, y, z));
    }
  };

  return { rng, rand, mats, mat, glow, mesh, at, rot, scl, pivot, box, ball, cone, cyl, dome, eye, eyes, smile, cheeks };
}
