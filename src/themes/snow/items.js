// Snow village: player items.
import { makeItem, glowPart, itemSchema, ITEM_KINDS } from '../../core/item.js';

export const icePick = {
  label: '얼음 피켈', role: ITEM_KINDS.melee.label,
  defaults: { seed: 21, size: 1, gripColor: '#2f5a8a', metalColor: '#9aa4ae' },
  schema: itemSchema({ gripColor: '손잡이 색', metalColor: '금속 색' }),
  build: (p) => makeItem(p, {
    name: 'IcePick', kind: 'melee', decay: 0.3,
    shape(k, it) {
      const metal = k.mat('metal', p.metalColor, { metalness: 0.6, roughness: 0.35 });
      it.add(k.at(k.cyl(0.016, 0.016, 0.6, metal, 6), 0, 0.2, 0));
      it.add(k.at(k.cyl(0.022, 0.022, 0.18, k.mat('grip', p.gripColor), 6, 0.003), 0, 0, 0));
      it.add(k.at(k.cone(0.012, 0.06, metal, 4), 0, -0.13, 0)); // spike at the bottom
      it.add(k.at(k.rot(k.cone(0.02, 0.18, metal, 4), 0, 0, -Math.PI / 2 + 0.2), 0.09, 0.5, 0)); // pick
      it.add(k.at(k.box(0.08, 0.025, 0.03, metal, 0), -0.04, 0.5, 0)); // adze
    },
  }),
};

export const snowSlingshot = {
  label: '눈뭉치 새총', role: ITEM_KINDS.ranged.label,
  defaults: { seed: 22, size: 1, woodColor: '#7a5234', bandColor: '#b0392b' },
  schema: itemSchema({ woodColor: '나무 색', bandColor: '고무줄 색' }),
  build: (p) => makeItem(p, {
    name: 'SnowSlingshot', kind: 'ranged',
    shape(k, it) {
      const wood = k.mat('wood', p.woodColor);
      it.add(k.at(k.cyl(0.018, 0.02, 0.14, wood, 6, 0.003), 0, 0, 0));
      for (const s of [-1, 1]) it.add(k.at(k.rot(k.cyl(0.014, 0.016, 0.12, wood, 6, 0.003), 0, 0, -s * 0.5), s * 0.03, 0.12, 0));
      const band = k.mat('band', p.bandColor);
      for (const s of [-1, 1]) it.add(k.at(k.rot(k.box(0.008, 0.008, 0.1, band, 0), 0, -s * 0.5, 0), s * 0.035, 0.17, -0.04));
      it.add(k.at(k.ball(0.035, k.mat('snow', '#f4f8fc', { roughness: 1 }), 1), 0, 0.17, -0.09));
    },
  }),
};

export const frostJar = {
  label: '서리 폭탄병', role: ITEM_KINDS.throw.label,
  defaults: { seed: 23, size: 1, glassColor: '#c8ecff', iceColor: '#7fd6ff' },
  schema: itemSchema({ glassColor: '병 색', iceColor: '얼음 빛' }),
  build: (p) => makeItem(p, {
    name: 'FrostJar', kind: 'throw', hoverY: 0.4,
    shape(k, it, parts) {
      const glass = k.mat('glass', p.glassColor, { transparent: true, opacity: 0.4, roughness: 0.1 });
      it.add(k.at(k.cyl(0.06, 0.055, 0.13, glass, 8), 0, 0.065, 0));
      it.add(k.at(k.cyl(0.062, 0.062, 0.03, k.mat('lidMetal', '#6a727a', { metalness: 0.5 }), 8), 0, 0.145, 0));
      parts.glow = glowPart(k, it, 'ice', p.iceColor, k.at(k.ball(0.045, null, 0), 0, 0.06, 0), 1.4);
      parts.spark = parts.glow;
    },
  }),
};

export const hotCocoa = {
  label: '핫초코', role: ITEM_KINDS.heal.label,
  defaults: { seed: 24, size: 1, mugColor: '#c0392b', cocoaColor: '#6a3a22' },
  schema: itemSchema({ mugColor: '머그 색', cocoaColor: '코코아 색' }),
  build: (p) => makeItem(p, {
    name: 'HotCocoa', kind: 'heal',
    shape(k, it, parts) {
      const mug = k.mat('mug', p.mugColor);
      it.add(k.at(k.cyl(0.05, 0.045, 0.1, mug, 10), 0, 0.05, 0));
      it.add(k.at(k.rot(k.mesh(new k.THREE.TorusGeometry(0.03, 0.009, 4, 8), mug), 0, 0, 0), 0.055, 0.05, 0));
      it.add(k.at(k.cyl(0.045, 0.045, 0.005, k.mat('cocoa', p.cocoaColor), 10), 0, 0.095, 0));
      const mallow = k.mat('marshmallow', '#fff6ec');
      for (const [x, z] of [[0.015, 0.01], [-0.015, -0.008]]) it.add(k.at(k.box(0.02, 0.016, 0.02, mallow, 0), x, 0.1, z));
      parts.glow = glowPart(k, it, 'steam', '#ffffff', k.at(k.scl(k.ball(0.03, null, 0), 1, 1.6, 1), 0, 0.15, 0), 0.6);
    },
  }),
};

export const pineTorch = {
  label: '솔가지 횃불', role: ITEM_KINDS.light.label,
  defaults: { seed: 25, size: 1, woodColor: '#6a4428', flameColor: '#ff8a2a' },
  schema: itemSchema({ woodColor: '나무 색', flameColor: '불꽃 색' }),
  build: (p) => makeItem(p, {
    name: 'PineTorch', kind: 'light',
    shape(k, it, parts) {
      it.add(k.at(k.cyl(0.018, 0.022, 0.5, k.mat('wood', p.woodColor), 6, 0.004), 0, 0.12, 0));
      it.add(k.at(k.cyl(0.035, 0.03, 0.09, k.mat('cloth', '#5a4a3a'), 6, 0.006), 0, 0.38, 0));
      parts.glow = glowPart(k, it, 'flame', p.flameColor, k.at(k.cone(0.045, 0.16, null, 6, 0.01), 0, 0.5, 0), 2.5);
    },
  }),
};

export const ITEMS = { icePick, snowSlingshot, frostJar, hotCocoa, pineTorch };
