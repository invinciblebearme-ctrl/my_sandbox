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

// horror: 0 = cute (round eyes, smiles, rosy cheeks) .. 1 = creepy (glowing slit
// eyes, angry brows, jagged teeth, darker and less saturated colours).
export function createKit(seed = 1, jitterScale = 1, horror = 0) {
  const rng = mulberry32(seed);
  const rand = (a, b) => a + (b - a) * rng();
  const mats = {};
  const h = Math.min(1, Math.max(0, horror));

  // colours lose saturation and get darker as horror goes up (glowing parts keep theirs)
  const grim = (color, keep = false) => {
    const c = new THREE.Color(color);
    if (keep || h === 0) return c;
    const hsl = {};
    c.getHSL(hsl);
    return c.setHSL(hsl.h, hsl.s * (1 - 0.45 * h), hsl.l * (1 - 0.35 * h));
  };
  // keepColor / keepGlow are hints for this kit only, not material properties
  const withoutKeep = ({ keepColor: _keep, keepGlow: _glow, ...rest }) => rest;
  const mat = (name, color, extra = {}) =>
    (mats[name] ??= new THREE.MeshStandardMaterial({
      name, flatShading: true, roughness: 0.85, metalness: 0, ...withoutKeep(extra),
      color: grim(color, !!extra.emissive || extra.keepColor),
    }));
  // Glowing parts drift toward an eerie ghost-fire green as horror goes up.
  const glow = (name, color, intensity = 1.5) => {
    const c = new THREE.Color(color).lerp(new THREE.Color('#9dff5a'), h * 0.55);
    return mat(name, c, { emissive: c, emissiveIntensity: intensity, roughness: 0.5 });
  };


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

  // Cartoon eye in its own pivot (animations blink it by scaling Y). Faces +Z.
  // Cute: white ball, round pupil, highlight. Creepy: yellowed white, glowing
  // red slit pupil, no highlight.
  const eye = (name, size, { pupil = '#1d1b26', white = '#ffffff', look = 0 } = {}) => {
    const e = pivot(name);
    // white sclera turns into a dark socket; the pupil starts to glow
    const whiteCol = new THREE.Color(white).lerp(new THREE.Color('#231a1e'), Math.min(1, h * 1.15));
    e.add(ball(size, mat('eyeWhite', whiteCol, { keepColor: true }), 1));
    const pupilMat = h > 0.3
      ? mat('pupilGlow', '#ff3a1c', { emissive: '#ff3a1c', emissiveIntensity: 1 + h * 2.5, keepGlow: true })
      : mat('pupil', pupil);
    const pp = ball(size * (0.55 + h * 0.05), pupilMat, 1);
    pp.scale.x = 1 - h * 0.6; // round -> slit
    e.add(at(pp, look * size * 0.2, 0, size * 0.62));
    if (h < 0.5) {
      e.add(at(ball(size * 0.18, mat('shine', '#ffffff', { emissive: '#ffffff', emissiveIntensity: 0.4 }), 0),
        size * 0.22, size * 0.25, size * 0.98));
    }
    return e;
  };

  // Adds two eyes to `parent`, returns [eyeL, eyeR]. Creepy eyes get angry brows
  // and slightly different sizes.
  const eyes = (parent, { y, z, spacing, size, prefix = 'eye', ...opts }) => {
    const odd = 1 + h * 0.25;
    const l = at(eye(`${prefix}L`, size * odd, opts), spacing, y, z);
    const r = at(eye(`${prefix}R`, size / odd, opts), -spacing, y + h * size * 0.15, z);
    parent.add(l, r);
    if (h > 0.3) {
      const brow = mat('brow', '#1a1418');
      for (const [s, e] of [[1, l], [-1, r]]) {
        const b = box(size * 1.6, size * 0.28, size * 0.3, brow, 0);
        b.rotation.z = s * (0.25 + h * 0.35); // inner end down = angry
        parent.add(at(b, e.position.x, e.position.y + size * 0.95, z + size * 0.35));
      }
    }
    return [l, r];
  };

  // Mouth. Cute: a curved smile. Creepy: a gaping frown full of jagged teeth.
  const smile = (parent, { y, z, width, color = '#3a1f2b', thick = 0.025, curve = 0.5, segs = 5 }) => {
    if (h < 0.4) {
      const m = mat('smile', color);
      for (let i = 0; i < segs; i++) {
        const t = (i / (segs - 1)) * 2 - 1; // -1..1
        const piece = box(width / segs * 1.3, thick, thick, m, 0);
        at(piece, t * width / 2, y - (1 - t * t) * width * 0.25 * curve, z);
        piece.rotation.z = -t * curve * 0.8;
        parent.add(piece);
      }
      return;
    }
    const w = width * (1 + h * 0.4);
    const tall = width * (0.25 + h * 0.25);
    const hole = box(w, tall, thick * 1.2, mat('mouthDark', '#1a0608', { keepColor: true }), 0);
    parent.add(at(hole, 0, y - tall * 0.2, z - thick * 0.3));
    const tooth = mat('fangs', '#efe4c0', { keepColor: true });
    const n = Math.max(4, Math.round(segs * 1.4));
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      const len = tall * rand(0.35, 0.6);
      const top = cone(w / n * 0.45, len, tooth, 4);
      top.rotation.x = Math.PI;
      parent.add(at(top, (t - 0.5) * w, y - tall * 0.2 + tall / 2 - len / 2, z + thick * 0.2));
      if (i % 2) {
        const bot = cone(w / n * 0.4, len * 0.8, tooth, 4);
        parent.add(at(bot, (t - 0.5) * w, y - tall * 0.2 - tall / 2 + len * 0.4, z + thick * 0.2));
      }
    }
  };

  // Rosy cheeks when cute, dark sunken eye bags when creepy.
  const cheeks = (parent, { y, z, spacing, size = 0.05, color = '#ff9aa8' }) => {
    const m = h < 0.4 ? mat('cheek', color, { roughness: 1 }) : mat('eyeBags', '#2a1a24', { roughness: 1, keepColor: true });
    for (const s of [-1, 1]) {
      const c = scl(ball(size, m, 1), 1, h < 0.4 ? 0.6 : 0.35, 0.35);
      parent.add(at(c, s * spacing * (h < 0.4 ? 1 : 0.6), h < 0.4 ? y : y + size * 1.4, z));
    }
  };

  return { rng, rand, horror: h, mats, mat, glow, mesh, at, rot, scl, pivot, box, ball, cone, cyl, dome, eye, eyes, smile, cheeks };
}
