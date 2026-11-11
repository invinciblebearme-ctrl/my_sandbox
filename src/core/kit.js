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

// horror: 0 = cute (round eyes, smiles, rosy cheeks)
//         0.4+ = creepy cartoon (glowing slit eyes, angry brows, jagged teeth)
//         0.75+ = zombie style, matching the graveyard zombies: square glowing eyes in
//                 dark sockets, broken teeth, lumpy surfaces, blood patches and bones
// eyeColor: glow colour of zombie-style eyes.
export const ZOMBIE_STYLE = 0.75;

export function createKit(seed = 1, jitterScale = 1, horror = 0, { eyeColor = '#d8ff3a' } = {}) {
  const rng = mulberry32(seed);
  const rand = (a, b) => a + (b - a) * rng();
  const mats = {};
  const h = Math.min(1, Math.max(0, horror));
  const zombie = h >= ZOMBIE_STYLE;

  // colours lose saturation and get darker as horror goes up (glowing parts keep theirs)
  const grim = (color, keep = false) => {
    const c = new THREE.Color(color);
    if (keep || h === 0) return c;
    const hsl = {};
    c.getHSL(hsl);
    return c.setHSL(hsl.h, hsl.s * (1 - 0.4 * h), hsl.l * (1 - 0.3 * h));
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
    const c = new THREE.Color(color).lerp(new THREE.Color('#9dff5a'), Math.min(h, ZOMBIE_STYLE) * 0.55);
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
    const amount = jitter * jitterScale * (1 + h * 0.8); // the scarier, the lumpier
    const m = new THREE.Mesh(amount > 0 ? jitterGeo(geo, amount) : geo, material);
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
  // zombie style: fewer facets and always a little lumpy (except tiny details)
  const ball = (r, material, detail = 1, jitter = 0) => mesh(
    new THREE.IcosahedronGeometry(r, zombie && detail > 1 ? detail - 1 : detail), material,
    jitter || (zombie && r > 0.08 ? r * 0.05 : 0));
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
    if (zombie) {
      // like the zombies: dark square socket with a small glowing pupil
      e.add(box(size * 1.35, size * 0.9, size * 0.6, mat('socket', '#1a0b0b', { keepColor: true }), 0));
      e.add(at(box(size * 0.8, size * 0.5, size * 0.5, mat('zombieEye', eyeColor, { emissive: eyeColor, emissiveIntensity: 1.5 + h }), 0),
        look * size * 0.2, 0, size * 0.2));
      return e;
    }
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
    const odd = zombie ? 1 : 1 + h * 0.25;
    const droop = zombie ? -rand(0.1, 0.4) * size : h * size * 0.15; // one droopy eye
    const l = at(eye(`${prefix}L`, size * odd, opts), spacing, y, z);
    const r = at(eye(`${prefix}R`, size / odd, opts), -spacing, y + droop, z);
    parent.add(l, r);
    if (zombie) {
      // sockets tilt inward a little (angry, uneven)
      l.rotation.z = rand(0.1, 0.3);
      r.rotation.z = -rand(0.0, 0.25);
    } else if (h > 0.3) {
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
    if (zombie) {
      // like the zombies: dark mouth slot with broken, yellowed teeth
      const w = width * 1.15;
      const tall = width * 0.35;
      parent.add(at(box(w, tall, thick * 1.5, mat('mouthDark', '#1a0b0b', { keepColor: true }), 0), 0, y - tall * 0.2, z - thick * 0.3));
      const tooth = mat('zombieTeeth', '#c9be8a', { keepColor: true });
      const n = Math.max(4, segs);
      for (let i = 0; i < n; i++) {
        if (rng() < 0.22) continue; // missing tooth
        const tw = (w / n) * 0.8;
        const th = tall * rand(0.3, 0.55);
        parent.add(at(box(tw, th, thick, tooth, 0), (i + 0.5 - n / 2) * (w / n), y - tall * 0.2 + tall / 2 - th / 2, z + thick * 0.2));
      }
      return;
    }
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
    if (zombie) return;
    const m = h < 0.4 ? mat('cheek', color, { roughness: 1 }) : mat('eyeBags', '#2a1a24', { roughness: 1, keepColor: true });
    for (const s of [-1, 1]) {
      const c = scl(ball(size, m, 1), 1, h < 0.4 ? 0.6 : 0.35, 0.35);
      parent.add(at(c, s * spacing * (h < 0.4 ? 1 : 0.6), h < 0.4 ? y : y + size * 1.4, z));
    }
  };

  // Zombie style only: blood patches and bone shards stuck onto the body surface
  // (picked from real mesh vertices, so it works for any monster shape).
  const SKIP = /eye|pupil|shine|brow|mouth|fang|teeth|tooth|cheek|smile|socket|blood|bone|tongue|shadow|water|spore|spark/i;
  const decay = (root, amount = 1) => {
    if (h < 0.6) return;
    root.updateMatrixWorld(true);
    const parts = [];
    root.traverse((o) => {
      if (!o.isMesh || SKIP.test(o.material.name) || o.material.emissiveIntensity > 0 && o.material.emissive.getHex()) return;
      o.geometry.computeBoundingSphere();
      const r = o.geometry.boundingSphere.radius * Math.max(o.scale.x, o.scale.y, o.scale.z);
      if (r > 0.08) parts.push({ o, r });
    });
    if (!parts.length) return;
    const total = parts.reduce((a, p) => a + p.r, 0);
    const pick = () => { let t = rng() * total; for (const p of parts) { t -= p.r; if (t <= 0) return p.o; } return parts[0].o; };
    const blood = mat('blood', '#6e1212', { keepColor: true, roughness: 0.4 });
    const boneMat = mat('bone', '#d9d2b6', { keepColor: true });
    const count = Math.round((4 + 10 * h) * amount);
    const pos = new THREE.Vector3();
    const nrm = new THREE.Vector3();
    for (let i = 0; i < count; i++) {
      const o = pick();
      const g = o.geometry;
      if (!g.attributes.normal) g.computeVertexNormals();
      const vi = Math.floor(rng() * g.attributes.position.count);
      o.updateMatrix();
      pos.fromBufferAttribute(g.attributes.position, vi).applyMatrix4(o.matrix);
      nrm.fromBufferAttribute(g.attributes.normal, vi).applyMatrix3(new THREE.Matrix3().getNormalMatrix(o.matrix)).normalize();
      const isBone = rng() < 0.22;
      const piece = isBone ? cone(0.015, rand(0.06, 0.11), boneMat, 4) : box(rand(0.05, 0.13), rand(0.04, 0.1), 0.016, blood, 0.005);
      piece.position.copy(pos).addScaledVector(nrm, isBone ? 0.03 : 0.004);
      piece.lookAt(pos.clone().addScaledVector(nrm, 1));
      if (isBone) piece.rotateX(Math.PI / 2);
      else piece.rotateZ(rand(0, Math.PI));
      o.parent.add(piece);
    }
  };

  return { THREE, rng, rand, horror: h, zombie, decay, mats, mat, glow, mesh, at, rot, scl, pivot, box, ball, cone, cyl, dome, eye, eyes, smile, cheeks };
}
