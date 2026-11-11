// Graveyard: player items.
import { makeItem, muzzleFlash, glowPart, itemSchema, ITEM_KINDS } from '../../core/item.js';

const Z = Math.PI / 2; // rotate a Y-axis cylinder to point along Z

export const shovel = {
  label: '무덤 삽', role: ITEM_KINDS.melee.label,
  defaults: { seed: 1, size: 1, woodColor: '#7a5234', metalColor: '#7d848c' },
  schema: itemSchema({ woodColor: '자루 색', metalColor: '날 색' }),
  build: (p) => makeItem(p, {
    name: 'Shovel', kind: 'melee', decay: 0.3,
    shape(k, it) {
      const wood = k.mat('wood', p.woodColor);
      const metal = k.mat('metal', p.metalColor, { metalness: 0.5, roughness: 0.5 });
      it.add(k.at(k.cyl(0.018, 0.02, 0.82, wood, 6, 0.004), 0, 0.25, 0));
      it.add(k.at(k.box(0.14, 0.03, 0.03, wood, 0.004), 0, -0.16, 0)); // T grip
      it.add(k.at(k.box(0.2, 0.26, 0.02, metal, 0.008, 2), 0, 0.78, 0.01));
      it.add(k.at(k.cone(0.05, 0.08, metal, 4), 0, 0.64, 0.01));
    },
  }),
};

export const shotgun = {
  label: '쌍발 산탄총', role: ITEM_KINDS.ranged.label,
  defaults: { seed: 2, size: 1, woodColor: '#6a4428', metalColor: '#3e4248' },
  schema: itemSchema({ woodColor: '개머리 색', metalColor: '총열 색' }),
  build: (p) => makeItem(p, {
    name: 'Shotgun', kind: 'ranged',
    shape(k, it, parts) {
      const wood = k.mat('wood', p.woodColor);
      const metal = k.mat('metal', p.metalColor, { metalness: 0.6, roughness: 0.4 });
      it.add(k.at(k.rot(k.box(0.05, 0.1, 0.3, wood, 0.005), 0.15, 0, 0), 0, -0.04, -0.22));
      it.add(k.at(k.box(0.05, 0.07, 0.12, metal, 0.003), 0, 0.01, 0));
      for (const s of [-1, 1]) it.add(k.at(k.rot(k.cyl(0.014, 0.014, 0.5, metal, 6), Z, 0, 0), s * 0.015, 0.03, 0.3));
      const pump = k.pivot('pump', 0, 0, 0.22);
      pump.add(k.at(k.box(0.05, 0.04, 0.14, wood, 0.004), 0, 0, 0));
      it.add(pump);
      parts.pump = pump;
      parts.flash = muzzleFlash(k, it, 0.56, 0.03);
    },
  }),
};

export const holyWater = {
  label: '성수병', role: ITEM_KINDS.throw.label,
  defaults: { seed: 3, size: 1, glassColor: '#a8d8ff', waterColor: '#8fe8ff' },
  schema: itemSchema({ glassColor: '병 색', waterColor: '성수 빛' }),
  build: (p) => makeItem(p, {
    name: 'HolyWater', kind: 'throw', hoverY: 0.4,
    shape(k, it, parts) {
      const glass = k.mat('glass', p.glassColor, { transparent: true, opacity: 0.45, roughness: 0.1 });
      it.add(k.at(k.cyl(0.055, 0.06, 0.16, glass, 8), 0, 0.08, 0));
      it.add(k.at(k.cyl(0.02, 0.03, 0.06, glass, 6), 0, 0.19, 0));
      it.add(k.at(k.cyl(0.022, 0.022, 0.03, k.mat('cork', '#a07a50'), 6), 0, 0.235, 0));
      parts.glow = glowPart(k, it, 'water', p.waterColor, k.at(k.cyl(0.048, 0.052, 0.12, null, 8), 0, 0.07, 0), 1.2);
      parts.spark = parts.glow;
      const gold = k.mat('cross', '#e8c050', { metalness: 0.6 });
      it.add(k.at(k.box(0.012, 0.06, 0.01, gold, 0), 0, 0.09, 0.062));
      it.add(k.at(k.box(0.04, 0.012, 0.01, gold, 0), 0, 0.1, 0.062));
    },
  }),
};

export const firstAid = {
  label: '낡은 구급상자', role: ITEM_KINDS.heal.label,
  defaults: { seed: 4, size: 1, boxColor: '#d8d2c2', crossColor: '#b02a2a' },
  schema: itemSchema({ boxColor: '상자 색', crossColor: '십자 색' }),
  build: (p) => makeItem(p, {
    name: 'FirstAid', kind: 'heal',
    shape(k, it, parts) {
      const tin = k.mat('tin', p.boxColor, { metalness: 0.3 });
      const red = k.mat('cross', p.crossColor);
      it.add(k.at(k.box(0.26, 0.12, 0.09, tin, 0.006), 0, 0.06, 0));
      const lid = k.pivot('lid', 0, 0.12, -0.045);
      lid.add(k.at(k.box(0.27, 0.05, 0.095, tin, 0.005), 0, 0.02, 0.045));
      lid.add(k.at(k.box(0.06, 0.015, 0.02, red, 0), 0, 0.03, 0.09));
      lid.add(k.at(k.box(0.02, 0.015, 0.06, red, 0), 0, 0.03, 0.07));
      it.add(lid);
      parts.lid = lid;
      it.add(k.at(k.box(0.08, 0.025, 0.012, red, 0), 0, 0.07, 0.046));
      it.add(k.at(k.box(0.025, 0.08, 0.012, red, 0), 0, 0.07, 0.046));
      it.add(k.at(k.rot(k.cyl(0.008, 0.008, 0.1, k.mat('handle', '#3a3a3a'), 4), 0, 0, Z), 0, 0.18, 0));
    },
  }),
};

export const graveLantern = {
  label: '묘지기 랜턴', role: ITEM_KINDS.light.label,
  defaults: { seed: 5, size: 1, frameColor: '#3a3430', flameColor: '#ffb84a' },
  schema: itemSchema({ frameColor: '틀 색', flameColor: '불빛 색' }),
  build: (p) => makeItem(p, {
    name: 'GraveLantern', kind: 'light', hoverY: 0.55,
    shape(k, it, parts) {
      // origin = the handle on top, the lantern hangs below it
      const iron = k.mat('iron', p.frameColor, { metalness: 0.5 });
      it.add(k.at(k.box(0.14, 0.03, 0.14, iron, 0.004), 0, -0.06, 0));
      it.add(k.at(k.box(0.15, 0.03, 0.15, iron, 0.004), 0, -0.26, 0));
      for (const [x, z] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) it.add(k.at(k.box(0.012, 0.18, 0.012, iron, 0), x * 0.06, -0.16, z * 0.06));
      it.add(k.at(k.cone(0.08, 0.06, iron, 4), 0, -0.03, 0));
      parts.glow = glowPart(k, it, 'flame', p.flameColor, k.at(k.cone(0.03, 0.09, null, 5), 0, -0.17, 0), 2.5);
      it.add(k.at(k.box(0.012, 0.06, 0.012, iron, 0), 0, -0.01, 0)); // handle
    },
  }),
};

export const ITEMS = { shovel, shotgun, holyWater, firstAid, graveLantern };
