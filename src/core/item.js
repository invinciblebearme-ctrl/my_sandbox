// Player items (weapons, throwables, healing, lights, key items).
//
// Node layout of every item GLB:
//   Item (root)
//   ├─ pickupRing   glowing ring on the floor, hide it once the item is picked up
//   └─ item         the object itself; its origin is the GRIP point.
//                   Melee weapons and lights point up (+Y), guns point forward (+Z).
//                   In Unity: parent `item` to the hand bone and zero its position.
// Clips: idle (floating pickup), use (swing, recoil, throw, drink, flicker, scan).
import * as THREE from 'three';
import { createKit } from './kit.js';
import { finalizeMonster, TAU, keys, clamp01, smooth } from './monster.js';

export const ITEM_KINDS = {
  melee: { label: '🗡️ 근접 무기', ring: '#ffb04a', use: 'swing' },
  ranged: { label: '🔫 원거리 무기', ring: '#ff6a3a', use: 'recoil' },
  throw: { label: '💣 투척', ring: '#ffe14a', use: 'toss' },
  heal: { label: '❤️ 회복', ring: '#6aff7a', use: 'drink' },
  light: { label: '🔦 조명', ring: '#fff2b0', use: 'flicker' },
  special: { label: '⭐ 특수', ring: '#6ac8ff', use: 'scan' },
};

export const ITEM_ANIMS = {
  hover: {
    label: '바닥에 떠서 빙글 (줍기 전)',
    duration: 2.4,
    apply(rig, u) {
      const w = u * TAU;
      rig.item.rotation.y += u * TAU;
      rig.item.position.y += Math.sin(w) * 0.05;
      rig.ring.scale.setScalar(1 + Math.sin(w * 2) * 0.08);
      rig.ring.rotation.y += -u * TAU;
      if (rig.glow) rig.glow.scale.setScalar(1 + Math.sin(w * 3) * 0.1);
    },
  },
  swing: {
    label: '휘두르기',
    duration: 0.7,
    apply(rig, u) {
      rig.item.rotation.x += keys(u, [[0, 0], [0.3, -0.9], [0.5, 1.5], [0.75, 0.8], [1, 0]]);
      rig.item.rotation.z += keys(u, [[0, 0], [0.3, 0.3], [0.5, -0.2], [1, 0]]);
    },
  },
  recoil: {
    label: '발사 (반동)',
    duration: 0.5,
    apply(rig, u) {
      const kick = keys(u, [[0, 0], [0.08, 1], [0.5, 0], [1, 0]]);
      rig.item.rotation.x -= kick * 0.45;
      rig.item.position.z -= kick * 0.06;
      if (rig.flash) rig.flash.scale.setScalar(u < 0.15 ? 1 + u * 4 : 0.001);
      if (rig.pump) rig.pump.position.z -= keys(u, [[0, 0], [0.4, 0], [0.6, 0.06], [0.8, 0], [1, 0]]);
    },
  },
  toss: {
    label: '던지기',
    duration: 1.1,
    loop: false,
    apply(rig, u) {
      const f = smooth(clamp01((u - 0.15) / 0.75));
      rig.item.rotation.x += keys(u, [[0, 0], [0.15, 0.8], [1, 0.8]]) - f * TAU * 1.5;
      rig.item.position.z += f * 1.6;
      rig.item.position.y += Math.sin(Math.PI * f) * 0.5 - f * 0.3;
      if (rig.spark) rig.spark.scale.setScalar(1 + Math.abs(Math.sin(u * TAU * 8)) * 0.8);
    },
  },
  drink: {
    label: '사용 (마시기·바르기)',
    duration: 1.2,
    apply(rig, u) {
      const tip = keys(u, [[0, 0], [0.25, 1], [0.75, 1], [1, 0]]);
      rig.item.rotation.x -= tip * 1.2;
      rig.item.position.y += tip * 0.1;
      if (rig.lid) rig.lid.rotation.x -= tip * 1.8;
      if (rig.glow) rig.glow.scale.setScalar(1 + tip * 0.3 + Math.sin(u * TAU * 4) * 0.05 * tip);
    },
  },
  flicker: {
    label: '켜기 (깜빡깜빡)',
    duration: 1.2,
    apply(rig, u) {
      const on = u < 0.15 || (u > 0.22 && u < 0.3) || u > 0.38 ? 1 : 0.2;
      if (rig.glow) rig.glow.scale.setScalar(Math.max(0.001, on * (1 + Math.sin(u * TAU * 6) * 0.08)));
      rig.item.rotation.z += Math.sin(u * TAU) * 0.15;
    },
  },
  scan: {
    label: '사용 (빛나며 작동)',
    duration: 1.4,
    apply(rig, u) {
      const p = keys(u, [[0, 0], [0.2, 1], [0.8, 1], [1, 0]]);
      rig.item.rotation.y += Math.sin(u * TAU) * 0.6 * p;
      rig.item.position.y += p * 0.12;
      if (rig.glow) rig.glow.scale.setScalar(1 + p * (0.4 + Math.abs(Math.sin(u * TAU * 5)) * 0.4));
    },
  },
};

// Builds an item. `shape(k, item, parts)` adds meshes to the `item` pivot and may
// set parts.glow / flash / spark / lid / pump (pivots the use animation moves).
export function makeItem(p, { name, kind, hoverY = 0.35, decay = 0, shape }) {
  const k = createKit(p.seed, 0.6, p.horror);
  const root = k.pivot('root');
  root.name = name;
  const ring = k.pivot('pickupRing', 0, 0.02, 0);
  const ringColor = ITEM_KINDS[kind].ring;
  const ringMat = new THREE.MeshStandardMaterial({ name: 'pickupGlow', color: ringColor, emissive: ringColor, emissiveIntensity: 1.6, flatShading: true });
  ring.add(k.rot(k.mesh(new THREE.TorusGeometry(0.32, 0.018, 4, 20), ringMat), Math.PI / 2, 0, 0));
  root.add(ring);
  const item = k.pivot('item', 0, hoverY, 0);
  root.add(item);
  const parts = {};
  shape(k, item, parts);
  if (decay) k.decay(item, decay);
  item.scale.setScalar(p.size ?? 1);
  return finalizeMonster(root, {
    rig: { item, ring, ...parts }, params: p, animations: ITEM_ANIMS,
    clips: { idle: 'hover', use: ITEM_KINDS[kind].use },
  });
}

// Small reusable pieces -----------------------------------------------------------
// Muzzle flash pivot at `z` along the barrel (scaled to 0 until fired).
export function muzzleFlash(k, parent, z, y = 0, size = 1) {
  const flash = k.pivot('flash', 0, y, z);
  const m = k.mat('muzzleFlash', '#ffcf5a', { emissive: '#ffb020', emissiveIntensity: 3, keepColor: true });
  flash.add(k.at(k.rot(k.cone(0.05 * size, 0.16 * size, m, 6), Math.PI / 2, 0, 0), 0, 0, 0.08 * size));
  flash.scale.setScalar(0.001);
  parent.add(flash);
  return flash;
}
// A glowing part in its own pivot (flames, bulbs, liquids).
export function glowPart(k, parent, name, color, mesh, intensity = 2) {
  const g = k.pivot(name);
  mesh.material = k.mat(`${name}Glow`, color, { emissive: color, emissiveIntensity: intensity, keepColor: true });
  g.add(mesh);
  parent.add(g);
  return g;
}

export const itemSchema = (colors = {}) => ({
  seed: { label: '시드', min: 1, max: 999, step: 1 },
  size: { label: '크기', min: 0.5, max: 2, step: 0.01 },
  ...Object.fromEntries(Object.entries(colors).map(([k, label]) => [k, { label }])),
});
