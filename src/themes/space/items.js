// Space base: player items.
import { makeItem, muzzleFlash, glowPart, itemSchema, ITEM_KINDS } from '../../core/item.js';

const Z = Math.PI / 2;

export const heavyWrench = {
  label: '대형 렌치', role: ITEM_KINDS.melee.label,
  defaults: { seed: 41, size: 1, metalColor: '#9aa2aa', gripColor: '#d8a83a' },
  schema: itemSchema({ metalColor: '금속 색', gripColor: '손잡이 색' }),
  build: (p) => makeItem(p, {
    name: 'HeavyWrench', kind: 'melee', decay: 0.3,
    shape(k, it) {
      const metal = k.mat('metal', p.metalColor, { metalness: 0.6, roughness: 0.35 });
      it.add(k.at(k.box(0.035, 0.5, 0.02, metal, 0.003), 0, 0.17, 0));
      it.add(k.at(k.box(0.045, 0.16, 0.03, k.mat('grip', p.gripColor), 0.003), 0, 0, 0));
      // open jaw
      it.add(k.at(k.box(0.12, 0.04, 0.025, metal, 0), 0, 0.43, 0));
      for (const s of [-1, 1]) it.add(k.at(k.box(0.03, 0.08, 0.025, metal, 0), s * 0.045, 0.48, 0));
    },
  }),
};

export const laserPistol = {
  label: '레이저 권총', role: ITEM_KINDS.ranged.label,
  defaults: { seed: 42, size: 1, bodyColor: '#d8dde2', energyColor: '#3affd8' },
  schema: itemSchema({ bodyColor: '몸체 색', energyColor: '에너지 색' }),
  build: (p) => makeItem(p, {
    name: 'LaserPistol', kind: 'ranged',
    shape(k, it, parts) {
      const body = k.mat('body', p.bodyColor, { metalness: 0.3, roughness: 0.4 });
      const dark = k.mat('dark', '#2a2e36', { metalness: 0.4 });
      it.add(k.at(k.rot(k.box(0.035, 0.1, 0.045, dark, 0.003), -0.25, 0, 0), 0, -0.04, -0.02));
      it.add(k.at(k.box(0.045, 0.06, 0.16, body, 0.003), 0, 0.02, 0.05));
      it.add(k.at(k.rot(k.cyl(0.018, 0.024, 0.08, dark, 8), Z, 0, 0), 0, 0.02, 0.17));
      parts.glow = glowPart(k, it, 'cell', p.energyColor, k.at(k.box(0.05, 0.02, 0.07, null, 0), 0, 0.055, 0.03), 2);
      parts.flash = muzzleFlash(k, it, 0.21, 0.02);
      parts.flash.children[0].material = k.mat('laserFlash', p.energyColor, { emissive: p.energyColor, emissiveIntensity: 3, keepColor: true });
    },
  }),
};

export const plasmaGrenade = {
  label: '플라즈마 수류탄', role: ITEM_KINDS.throw.label,
  defaults: { seed: 43, size: 1, shellColor: '#5a626e', plasmaColor: '#b06aff' },
  schema: itemSchema({ shellColor: '껍질 색', plasmaColor: '플라즈마 색' }),
  build: (p) => makeItem(p, {
    name: 'PlasmaGrenade', kind: 'throw', hoverY: 0.4,
    shape(k, it, parts) {
      const shell = k.mat('shell', p.shellColor, { metalness: 0.5 });
      it.add(k.at(k.ball(0.06, shell, 1), 0, 0.06, 0));
      parts.glow = glowPart(k, it, 'plasma', p.plasmaColor, k.at(k.cyl(0.064, 0.064, 0.02, null, 10), 0, 0.06, 0), 2.5);
      parts.spark = parts.glow;
      it.add(k.at(k.cyl(0.015, 0.02, 0.03, shell, 6), 0, 0.125, 0));
      it.add(k.at(k.rot(k.mesh(new k.THREE.TorusGeometry(0.016, 0.004, 4, 10), k.mat('pin', '#c9a23a', { metalness: 0.6 })), 0, Z, 0), 0.02, 0.14, 0));
    },
  }),
};

export const mediInjector = {
  label: '응급 주사기', role: ITEM_KINDS.heal.label,
  defaults: { seed: 44, size: 1, bodyColor: '#e8ecf0', serumColor: '#6aff7a' },
  schema: itemSchema({ bodyColor: '몸체 색', serumColor: '약물 색' }),
  build: (p) => makeItem(p, {
    name: 'MediInjector', kind: 'heal', hoverY: 0.4,
    shape(k, it, parts) {
      const body = k.mat('body', p.bodyColor, { metalness: 0.2 });
      it.add(k.at(k.cyl(0.022, 0.022, 0.05, body, 8), 0, 0.025, 0));
      parts.glow = glowPart(k, it, 'serum', p.serumColor, k.at(k.cyl(0.018, 0.018, 0.1, null, 8), 0, 0.1, 0), 1.8);
      it.add(k.at(k.cyl(0.02, 0.02, 0.1, k.mat('glass', '#d8f0ff', { transparent: true, opacity: 0.35 }), 8), 0, 0.1, 0));
      it.add(k.at(k.cyl(0.004, 0.004, 0.04, k.mat('needle', '#c0c8d0', { metalness: 0.8 }), 4), 0, 0.17, 0));
      it.add(k.at(k.box(0.06, 0.012, 0.02, body, 0), 0, 0.0, 0)); // plunger grip
      const lid = k.pivot('lid', 0, 0.15, 0);
      lid.add(k.at(k.cyl(0.012, 0.012, 0.05, k.mat('cap', '#ff5a3a'), 6), 0, 0.03, 0));
      it.add(lid);
      parts.lid = lid;
    },
  }),
};

export const keycard = {
  label: '보안 키카드', role: ITEM_KINDS.special.label,
  defaults: { seed: 45, size: 1, cardColor: '#2a3a5a', stripeColor: '#3affd8' },
  schema: itemSchema({ cardColor: '카드 색', stripeColor: '띠 색' }),
  build: (p) => makeItem(p, {
    name: 'Keycard', kind: 'special', hoverY: 0.45,
    shape(k, it, parts) {
      it.add(k.box(0.09, 0.13, 0.006, k.mat('card', p.cardColor), 0));
      it.add(k.at(k.box(0.025, 0.02, 0.008, k.mat('chip', '#d8b040', { metalness: 0.7 }), 0), -0.02, 0.02, 0));
      it.add(k.at(k.box(0.05, 0.03, 0.008, k.mat('photo', '#a8b0b8'), 0), 0.015, -0.025, 0));
      parts.glow = glowPart(k, it, 'stripe', p.stripeColor, k.at(k.box(0.092, 0.015, 0.008, null, 0), 0, 0.05, 0), 2);
      it.add(k.at(k.rot(k.mesh(new k.THREE.TorusGeometry(0.012, 0.003, 4, 8), k.mat('clip', '#8a9098')), 0, 0, 0), 0, 0.075, 0));
    },
  }),
};

export const ITEMS = { heavyWrench, laserPistol, plasmaGrenade, mediInjector, keycard };
