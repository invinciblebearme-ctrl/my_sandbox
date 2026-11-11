// Playground: player items.
import { makeItem, glowPart, itemSchema, ITEM_KINDS } from '../../core/item.js';

const Z = Math.PI / 2;

export const nailBat = {
  label: '못 박힌 야구배트', role: ITEM_KINDS.melee.label,
  defaults: { seed: 51, size: 1, woodColor: '#c9a06a', tapeColor: '#2a2a2a' },
  schema: itemSchema({ woodColor: '배트 색', tapeColor: '테이프 색' }),
  build: (p) => makeItem(p, {
    name: 'NailBat', kind: 'melee', decay: 0.4,
    shape(k, it) {
      const wood = k.mat('wood', p.woodColor);
      it.add(k.at(k.cyl(0.035, 0.016, 0.7, wood, 8, 0.004), 0, 0.25, 0));
      it.add(k.at(k.cyl(0.02, 0.02, 0.15, k.mat('tape', p.tapeColor), 6), 0, -0.02, 0));
      it.add(k.at(k.cyl(0.026, 0.026, 0.02, wood, 8), 0, -0.1, 0)); // knob
      const nail = k.mat('nail', '#9aa0a6', { metalness: 0.7 });
      for (let i = 0; i < 8; i++) {
        const a = i * 2.4;
        const y = 0.42 + (i % 4) * 0.05;
        const n = k.cone(0.005, 0.06, nail, 3);
        n.position.set(Math.cos(a) * 0.04, y, Math.sin(a) * 0.04);
        n.rotation.set(Math.sin(a) * Z, 0, -Math.cos(a) * Z);
        it.add(n);
      }
    },
  }),
};

export const waterBlaster = {
  label: '성수 물총', role: ITEM_KINDS.ranged.label,
  defaults: { seed: 52, size: 1, bodyColor: '#ff8a2a', tankColor: '#6ac8ff' },
  schema: itemSchema({ bodyColor: '물총 색', tankColor: '물 색' }),
  build: (p) => makeItem(p, {
    name: 'WaterBlaster', kind: 'ranged',
    shape(k, it, parts) {
      const plastic = k.mat('plastic', p.bodyColor, { roughness: 0.4 });
      it.add(k.at(k.rot(k.box(0.04, 0.1, 0.05, plastic, 0.004), -0.3, 0, 0), 0, -0.04, -0.02));
      it.add(k.at(k.box(0.05, 0.06, 0.22, plastic, 0.004), 0, 0.02, 0.06));
      it.add(k.at(k.rot(k.cyl(0.012, 0.016, 0.08, k.mat('nozzle', '#3a7aff'), 6), Z, 0, 0), 0, 0.02, 0.21));
      parts.glow = glowPart(k, it, 'tank', p.tankColor, k.at(k.rot(k.cyl(0.04, 0.04, 0.12, null, 8), Z, 0, 0), 0, 0.09, 0.03), 1);
      // water jet instead of a muzzle flash
      const flash = k.pivot('flash', 0, 0.02, 0.25);
      flash.add(k.at(k.rot(k.cyl(0.01, 0.03, 0.5, k.mat('jet', p.tankColor, { emissive: p.tankColor, emissiveIntensity: 1.5, transparent: true, opacity: 0.7, keepColor: true }), 6), Z, 0, 0), 0, 0, 0.25));
      flash.scale.setScalar(0.001);
      it.add(flash);
      parts.flash = flash;
    },
  }),
};

export const firecracker = {
  label: '폭죽 다발', role: ITEM_KINDS.throw.label,
  defaults: { seed: 53, size: 1, paperColor: '#d8302a', bandColor: '#ffd24a' },
  schema: itemSchema({ paperColor: '종이 색', bandColor: '띠 색' }),
  build: (p) => makeItem(p, {
    name: 'Firecracker', kind: 'throw', hoverY: 0.4,
    shape(k, it, parts) {
      const paper = k.mat('paper', p.paperColor);
      const band = k.mat('band', p.bandColor);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        it.add(k.at(k.cyl(0.016, 0.016, 0.12, paper, 6), Math.cos(a) * 0.03, 0.06, Math.sin(a) * 0.03));
      }
      it.add(k.at(k.cyl(0.05, 0.05, 0.02, band, 8), 0, 0.06, 0));
      it.add(k.at(k.cyl(0.004, 0.004, 0.08, k.mat('fuse', '#3a2a1a'), 4), 0, 0.16, 0));
      parts.spark = glowPart(k, it, 'spark', '#ffd24a', k.ball(0.018, null, 0), 3);
      parts.spark.position.set(0, 0.2, 0);
    },
  }),
};

export const giantLollipop = {
  label: '왕 막대사탕', role: ITEM_KINDS.heal.label,
  defaults: { seed: 54, size: 1, candyColor: '#ff5aa8', swirlColor: '#fff2f8' },
  schema: itemSchema({ candyColor: '사탕 색', swirlColor: '소용돌이 색' }),
  build: (p) => makeItem(p, {
    name: 'GiantLollipop', kind: 'heal',
    shape(k, it, parts) {
      it.add(k.at(k.cyl(0.008, 0.008, 0.28, k.mat('stick', '#f4f0e8'), 5), 0, 0.1, 0));
      const g = k.pivot('glow', 0, 0.3, 0);
      g.add(k.rot(k.cyl(0.09, 0.09, 0.03, k.mat('candy', p.candyColor, { emissive: p.candyColor, emissiveIntensity: 0.4, keepColor: true }), 14), Z, 0, 0));
      const swirl = k.mat('swirl', p.swirlColor);
      for (let i = 0; i < 6; i++) {
        const a = i * 1.1;
        g.add(k.at(k.rot(k.box(0.06, 0.01, 0.005, swirl, 0), 0, 0, a), Math.cos(a) * 0.04 * (i / 6 + 0.3), Math.sin(a) * 0.04 * (i / 6 + 0.3), 0.017));
      }
      it.add(g);
      parts.glow = g;
    },
  }),
};

export const flashlight = {
  label: '손전등', role: ITEM_KINDS.light.label,
  defaults: { seed: 55, size: 1, bodyColor: '#2a2e34', beamColor: '#fff2c0' },
  schema: itemSchema({ bodyColor: '몸체 색', beamColor: '불빛 색' }),
  build: (p) => makeItem(p, {
    name: 'Flashlight', kind: 'light',
    shape(k, it, parts) {
      // points forward (+Z) like a gun
      const body = k.mat('body', p.bodyColor, { metalness: 0.4 });
      it.add(k.at(k.rot(k.cyl(0.022, 0.022, 0.18, body, 8), Z, 0, 0), 0, 0, 0.02));
      it.add(k.at(k.rot(k.cyl(0.04, 0.025, 0.06, body, 8), Z, 0, 0), 0, 0, 0.14));
      it.add(k.at(k.box(0.012, 0.012, 0.02, k.mat('button', '#c0392b'), 0), 0, 0.024, 0.02));
      const g = k.pivot('glow', 0, 0, 0.17);
      g.add(k.rot(k.cyl(0.036, 0.036, 0.01, k.mat('lens', p.beamColor, { emissive: p.beamColor, emissiveIntensity: 2.5, keepColor: true }), 10), Z, 0, 0));
      g.add(k.at(k.rot(k.cyl(0.04, 0.25, 0.9, k.mat('beam', p.beamColor, { emissive: p.beamColor, emissiveIntensity: 0.6, transparent: true, opacity: 0.18, keepColor: true }), 10, 0), -Z, 0, 0), 0, 0, 0.45));
      it.add(g);
      parts.glow = g;
    },
  }),
};

export const ITEMS = { nailBat, waterBlaster, firecracker, giantLollipop, flashlight };
