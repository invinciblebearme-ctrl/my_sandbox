// Desert town: player items.
import { makeItem, muzzleFlash, glowPart, itemSchema, ITEM_KINDS } from '../../core/item.js';

const Z = Math.PI / 2;

export const pickaxe = {
  label: '광산 곡괭이', role: ITEM_KINDS.melee.label,
  defaults: { seed: 31, size: 1, woodColor: '#8a6040', metalColor: '#6a6e74' },
  schema: itemSchema({ woodColor: '자루 색', metalColor: '날 색' }),
  build: (p) => makeItem(p, {
    name: 'Pickaxe', kind: 'melee', decay: 0.3,
    shape(k, it) {
      const metal = k.mat('metal', p.metalColor, { metalness: 0.5, roughness: 0.5 });
      it.add(k.at(k.cyl(0.02, 0.024, 0.65, k.mat('wood', p.woodColor), 6, 0.004), 0, 0.2, 0));
      for (const s of [-1, 1]) it.add(k.at(k.rot(k.cone(0.025, 0.22, metal, 4), 0, 0, -s * (Math.PI / 2 - 0.25)), s * 0.11, 0.5, 0));
      it.add(k.at(k.box(0.06, 0.05, 0.05, metal, 0), 0, 0.52, 0));
    },
  }),
};

export const revolver = {
  label: '보안관 리볼버', role: ITEM_KINDS.ranged.label,
  defaults: { seed: 32, size: 1, gripColor: '#6a3a22', metalColor: '#5a5e64' },
  schema: itemSchema({ gripColor: '손잡이 색', metalColor: '총 색' }),
  build: (p) => makeItem(p, {
    name: 'Revolver', kind: 'ranged',
    shape(k, it, parts) {
      const metal = k.mat('metal', p.metalColor, { metalness: 0.6, roughness: 0.35 });
      it.add(k.at(k.rot(k.box(0.032, 0.1, 0.045, k.mat('grip', p.gripColor), 0.004), -0.35, 0, 0), 0, -0.04, -0.03));
      it.add(k.at(k.box(0.035, 0.05, 0.07, metal, 0.003), 0, 0.02, 0.02));
      it.add(k.at(k.rot(k.cyl(0.028, 0.028, 0.05, metal, 6), Z, 0, 0), 0, 0.02, 0.05)); // cylinder
      it.add(k.at(k.rot(k.cyl(0.011, 0.011, 0.18, metal, 6), Z, 0, 0), 0, 0.035, 0.16));
      it.add(k.at(k.box(0.012, 0.025, 0.02, metal, 0), 0, 0.055, -0.02)); // hammer
      parts.flash = muzzleFlash(k, it, 0.26, 0.035);
    },
  }),
};

export const dynamite = {
  label: '다이너마이트', role: ITEM_KINDS.throw.label,
  defaults: { seed: 33, size: 1, stickColor: '#b02a22', ropeColor: '#c9a86a' },
  schema: itemSchema({ stickColor: '막대 색', ropeColor: '끈 색' }),
  build: (p) => makeItem(p, {
    name: 'Dynamite', kind: 'throw', hoverY: 0.4,
    shape(k, it, parts) {
      const stick = k.mat('stick', p.stickColor);
      for (const [x, z] of [[-0.025, 0], [0.025, 0], [0, 0.04]]) it.add(k.at(k.cyl(0.022, 0.022, 0.2, stick, 8), x, 0.1, z));
      const rope = k.mat('rope', p.ropeColor);
      for (const y of [0.05, 0.15]) it.add(k.at(k.scl(k.cyl(0.06, 0.06, 0.015, rope, 10), 1, 1, 0.85), 0, y, 0.013));
      it.add(k.at(k.rot(k.cyl(0.004, 0.004, 0.1, k.mat('fuse', '#2a2018'), 4), 0.3, 0, 0), 0, 0.24, 0.02));
      parts.spark = glowPart(k, it, 'spark', '#ffb43a', k.ball(0.018, null, 0), 3);
      parts.spark.position.set(0, 0.29, 0.035);
    },
  }),
};

export const canteen = {
  label: '물통', role: ITEM_KINDS.heal.label,
  defaults: { seed: 34, size: 1, coverColor: '#8a7a5a', strapColor: '#5a3a22' },
  schema: itemSchema({ coverColor: '덮개 색', strapColor: '끈 색' }),
  build: (p) => makeItem(p, {
    name: 'Canteen', kind: 'heal',
    shape(k, it, parts) {
      const cover = k.mat('cover', p.coverColor);
      it.add(k.at(k.rot(k.cyl(0.08, 0.08, 0.05, cover, 12, 0.004), Z, 0, 0), 0, 0.08, 0));
      it.add(k.at(k.cyl(0.015, 0.015, 0.04, k.mat('neck', '#8a9098', { metalness: 0.5 }), 6), 0, 0.17, 0));
      const lid = k.pivot('lid', 0, 0.19, -0.016);
      lid.add(k.at(k.cyl(0.02, 0.02, 0.02, k.mat('cap', '#3a3a3a'), 6), 0, 0.008, 0.016));
      it.add(lid);
      parts.lid = lid;
      it.add(k.at(k.rot(k.mesh(new k.THREE.TorusGeometry(0.09, 0.007, 4, 14, Math.PI), k.mat('strap', p.strapColor)), 0, 0, 0), 0, 0.08, 0));
    },
  }),
};

export const sheriffStar = {
  label: '보안관 배지', role: ITEM_KINDS.special.label,
  defaults: { seed: 35, size: 1, goldColor: '#ffd24a' },
  schema: itemSchema({ goldColor: '배지 색' }),
  build: (p) => makeItem(p, {
    name: 'SheriffStar', kind: 'special', hoverY: 0.45,
    shape(k, it, parts) {
      const g = k.pivot('glow');
      const gold = k.mat('gold', p.goldColor, { emissive: p.goldColor, emissiveIntensity: 0.6, metalness: 0.7, roughness: 0.3, keepColor: true });
      g.add(k.rot(k.cyl(0.05, 0.05, 0.015, gold, 10), Z, 0, 0));
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        g.add(k.at(k.rot(k.scl(k.cone(0.03, 0.08, gold, 4), 1, 1, 0.3), 0, 0, -a), Math.sin(a) * 0.075, Math.cos(a) * 0.075, 0));
        g.add(k.at(k.ball(0.012, gold, 0), Math.sin(a) * 0.115, Math.cos(a) * 0.115, 0));
      }
      it.add(g);
      parts.glow = g;
    },
  }),
};

export const ITEMS = { pickaxe, revolver, dynamite, canteen, sheriffStar };
