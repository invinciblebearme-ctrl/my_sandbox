// Campground: player items.
import { makeItem, muzzleFlash, glowPart, itemSchema, ITEM_KINDS } from '../../core/item.js';

const Z = Math.PI / 2;

export const hatchet = {
  label: '손도끼', role: ITEM_KINDS.melee.label,
  defaults: { seed: 11, size: 1, woodColor: '#8a5a36', metalColor: '#8a9098' },
  schema: itemSchema({ woodColor: '자루 색', metalColor: '날 색' }),
  build: (p) => makeItem(p, {
    name: 'Hatchet', kind: 'melee', decay: 0.3,
    shape(k, it) {
      const wood = k.mat('wood', p.woodColor);
      const metal = k.mat('metal', p.metalColor, { metalness: 0.6, roughness: 0.4 });
      it.add(k.at(k.cyl(0.018, 0.022, 0.42, wood, 6, 0.004), 0, 0.12, 0));
      it.add(k.at(k.box(0.1, 0.07, 0.025, metal, 0.004), 0.04, 0.32, 0));
      it.add(k.at(k.rot(k.box(0.03, 0.1, 0.02, metal, 0), 0, 0, 0.15), 0.1, 0.32, 0)); // edge
      it.add(k.at(k.box(0.04, 0.05, 0.03, metal, 0), -0.03, 0.32, 0));
    },
  }),
};

export const flareGun = {
  label: '신호탄 총', role: ITEM_KINDS.ranged.label,
  defaults: { seed: 12, size: 1, bodyColor: '#e86a1a', flareColor: '#ff3a2a' },
  schema: itemSchema({ bodyColor: '총 색', flareColor: '신호탄 빛' }),
  build: (p) => makeItem(p, {
    name: 'FlareGun', kind: 'ranged',
    shape(k, it, parts) {
      const plastic = k.mat('plastic', p.bodyColor, { roughness: 0.5 });
      it.add(k.at(k.rot(k.box(0.04, 0.11, 0.05, plastic, 0.004), -0.25, 0, 0), 0, -0.05, -0.02));
      it.add(k.at(k.box(0.05, 0.05, 0.09, plastic, 0.004), 0, 0.02, 0.02));
      it.add(k.at(k.rot(k.cyl(0.028, 0.028, 0.16, plastic, 8), Z, 0, 0), 0, 0.03, 0.14));
      it.add(k.at(k.box(0.012, 0.03, 0.03, k.mat('trigger', '#2a2a2a'), 0), 0, -0.02, 0.03));
      parts.flash = muzzleFlash(k, it, 0.22, 0.03, 1.3);
      parts.flash.children[0].material = k.mat('flareFlash', p.flareColor, { emissive: p.flareColor, emissiveIntensity: 3, keepColor: true });
    },
  }),
};

export const propaneBomb = {
  label: '부탄가스 폭탄', role: ITEM_KINDS.throw.label,
  defaults: { seed: 13, size: 1, canColor: '#3a7a4a', tapeColor: '#a8a8a0' },
  schema: itemSchema({ canColor: '통 색', tapeColor: '테이프 색' }),
  build: (p) => makeItem(p, {
    name: 'PropaneBomb', kind: 'throw', hoverY: 0.4,
    shape(k, it, parts) {
      const can = k.mat('can', p.canColor, { metalness: 0.4 });
      it.add(k.at(k.cyl(0.06, 0.06, 0.2, can, 10), 0, 0.1, 0));
      it.add(k.at(k.cyl(0.04, 0.06, 0.04, can, 10), 0, 0.22, 0));
      it.add(k.at(k.cyl(0.012, 0.012, 0.04, k.mat('valve', '#c9a23a', { metalness: 0.6 }), 6), 0, 0.26, 0));
      const tape = k.mat('tape', p.tapeColor);
      for (const y of [0.06, 0.14]) it.add(k.at(k.cyl(0.063, 0.063, 0.025, tape, 10), 0, y, 0));
      it.add(k.at(k.rot(k.cyl(0.005, 0.005, 0.1, k.mat('fuse', '#3a2a1a'), 4), 0.4, 0, 0), 0, 0.3, 0.02));
      parts.spark = glowPart(k, it, 'spark', '#ffb43a', k.ball(0.02, null, 0), 3);
      parts.spark.position.set(0, 0.35, 0.04);
    },
  }),
};

export const beanCan = {
  label: '콩 통조림', role: ITEM_KINDS.heal.label,
  defaults: { seed: 14, size: 1, labelColor: '#c0392b', tinColor: '#a8aeb4' },
  schema: itemSchema({ labelColor: '라벨 색', tinColor: '깡통 색' }),
  build: (p) => makeItem(p, {
    name: 'BeanCan', kind: 'heal',
    shape(k, it, parts) {
      const tin = k.mat('tin', p.tinColor, { metalness: 0.6, roughness: 0.4 });
      it.add(k.at(k.cyl(0.05, 0.05, 0.12, tin, 10), 0, 0.06, 0));
      it.add(k.at(k.cyl(0.052, 0.052, 0.08, k.mat('label', p.labelColor), 10), 0, 0.06, 0));
      it.add(k.at(k.box(0.04, 0.02, 0.005, k.mat('labelText', '#f2e6c8'), 0), 0, 0.07, 0.052));
      const lid = k.pivot('lid', 0, 0.12, -0.045);
      lid.add(k.at(k.cyl(0.048, 0.048, 0.006, tin, 10), 0, 0, 0.045));
      lid.add(k.at(k.box(0.02, 0.004, 0.03, tin, 0), 0, 0.005, 0.06)); // pull tab
      it.add(lid);
      parts.lid = lid;
    },
  }),
};

export const campLantern = {
  label: '캠핑 랜턴', role: ITEM_KINDS.light.label,
  defaults: { seed: 15, size: 1, bodyColor: '#2f6a8a', lightColor: '#fff0b0' },
  schema: itemSchema({ bodyColor: '몸체 색', lightColor: '불빛 색' }),
  build: (p) => makeItem(p, {
    name: 'CampLantern', kind: 'light', hoverY: 0.5,
    shape(k, it, parts) {
      const body = k.mat('body', p.bodyColor, { metalness: 0.3 });
      it.add(k.at(k.rot(k.mesh(new k.THREE.TorusGeometry(0.05, 0.006, 4, 10, Math.PI), body), 0, 0, 0), 0, -0.02, 0)); // handle arc
      it.add(k.at(k.cyl(0.06, 0.07, 0.04, body, 10), 0, -0.07, 0));
      it.add(k.at(k.cyl(0.07, 0.075, 0.05, body, 10), 0, -0.28, 0));
      parts.glow = glowPart(k, it, 'bulb', p.lightColor, k.at(k.cyl(0.05, 0.05, 0.15, null, 8), 0, -0.175, 0), 2.2);
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2;
        it.add(k.at(k.box(0.01, 0.17, 0.01, body, 0), Math.cos(a) * 0.06, -0.175, Math.sin(a) * 0.06));
      }
    },
  }),
};

export const ITEMS = { hatchet, flareGun, propaneBomb, beanCan, campLantern };
