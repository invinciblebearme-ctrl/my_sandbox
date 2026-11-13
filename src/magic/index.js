// Magic: shared by every stage (not tied to a theme).
//   healingStaff     the wizard's staff (player item, held in gripR like a melee weapon)
//   healingFireball  the projectile the staff shoots (separate GLB, spawned by game code)
//
// Healing fireball in the game: it flies forward from the staff's `castPoint`,
// burns monsters it hits and heals players inside the burst (see unity/HealingFireball.cs).
import { makeItem, itemSchema, ITEM_KINDS } from '../core/item.js';
import { createKit } from '../core/kit.js';
import { finalizeMonster, TAU, keys, clamp01, smooth } from '../core/monster.js';

const Z = Math.PI / 2;

export const healingStaff = {
  label: '치유의 지팡이', role: ITEM_KINDS.magic.label,
  defaults: { seed: 71, size: 1, woodColor: '#6a4a2e', metalColor: '#d8b04a', orbColor: '#9dffb0' },
  schema: itemSchema({ woodColor: '자루 색', metalColor: '장식 색', orbColor: '구슬 빛' }),
  build: (p) => makeItem(p, {
    name: 'HealingStaff', kind: 'magic', hoverY: 0.6,
    shape(k, it, parts) {
      // grip at the origin, staff points up (+Y): 0.45 below the hand, 0.85 above it
      const wood = k.mat('wood', p.woodColor);
      const metal = k.mat('trim', p.metalColor, { metalness: 0.7, roughness: 0.35, keepColor: true });
      it.add(k.at(k.cyl(0.022, 0.028, 1.3, wood, 6, 0.006), 0, 0.2, 0));
      it.add(k.at(k.cone(0.03, 0.08, metal, 5), 0, -0.48, 0)); // foot
      it.add(k.at(k.rot(k.cone(0.03, 0.08, metal, 5), Math.PI, 0, 0), 0, -0.42, 0));
      for (const y of [0.1, -0.1]) it.add(k.at(k.cyl(0.03, 0.03, 0.025, metal, 6), 0, y, 0)); // grip bands
      it.add(k.at(k.cyl(0.04, 0.026, 0.06, metal, 6), 0, 0.85, 0));
      // three prongs holding the orb
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * TAU;
        const prong = k.cone(0.014, 0.2, metal, 4);
        prong.position.set(Math.cos(a) * 0.06, 0.96, Math.sin(a) * 0.06);
        prong.rotation.set(Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35);
        it.add(prong);
      }
      // orb (glows up when casting) and the spawn point for the fireball
      const orb = k.pivot('orb', 0, 0.98, 0);
      orb.add(k.ball(0.07, k.mat('orbGlow', p.orbColor, { emissive: p.orbColor, emissiveIntensity: 2.2, keepColor: true }), 1));
      orb.add(k.ball(0.035, k.mat('orbCore', '#ffffff', { emissive: '#fffbe0', emissiveIntensity: 3, keepColor: true }), 0));
      for (const s of [-1, 1]) { // little leaves wrapped around the top
        it.add(k.at(k.rot(k.scl(k.cone(0.03, 0.09, k.mat('leaf', '#5aa84a'), 4), 1, 1, 0.3), 0, 0, s * 0.9), s * 0.04, 0.78, 0));
      }
      it.add(orb);
      it.add(k.pivot('castPoint', 0, 0.98, 0.1));
      parts.glow = orb;
    },
  }),
};

// ---- the projectile -------------------------------------------------------------------
const FIREBALL_ANIMS = {
  fly: {
    label: '날아가기 (반복)',
    duration: 0.6,
    apply(r, u) {
      const w = u * TAU;
      r.core.scale.setScalar(1 + Math.sin(w * 3) * 0.08);
      r.core.rotation.z += w;
      r.flames.forEach((f, i) => {
        f.scale.setScalar(1 + Math.sin(w * 2 + i * 1.7) * 0.25);
        f.rotation.z += Math.sin(w + i) * 0.15;
      });
      r.crosses.rotation.z += w;
      r.crosses.children.forEach((c, i) => c.scale.setScalar(0.8 + Math.abs(Math.sin(w + i)) * 0.4));
      r.ring.scale.setScalar(0.001);
    },
  },
  charge: {
    label: '모으기 (지팡이 끝에서 커짐)',
    duration: 0.6,
    loop: false,
    apply(r, u) {
      const g = smooth(u);
      r.ball.scale.setScalar(Math.max(0.001, g));
      r.core.rotation.z += u * TAU * 2;
      r.crosses.rotation.z -= u * TAU;
      r.flames.forEach((f) => f.scale.setScalar(Math.max(0.001, clamp01((u - 0.3) / 0.7))));
      r.ring.scale.setScalar(0.001);
    },
  },
  impact: {
    label: '터짐 (적 피해 + 아군 회복)',
    duration: 0.8,
    loop: false,
    apply(r, u) {
      const burst = keys(u, [[0, 1], [0.15, 1.8], [0.5, 0.6], [1, 0.001]]);
      r.core.scale.setScalar(burst);
      r.flames.forEach((f, i) => {
        f.scale.setScalar(Math.max(0.001, 1 - u * 1.4));
        f.position.z -= u * 0.4;
        f.rotation.z += (i % 2 ? 1 : -1) * u * 2;
      });
      // shockwave ring on the ground plane of the ball
      r.ring.scale.setScalar(u < 0.95 ? 0.2 + smooth(u) * 2.6 : 0.001);
      // healing crosses float up and out
      r.crosses.children.forEach((c, i) => {
        const a = (i / r.crosses.children.length) * TAU;
        c.position.x += Math.cos(a) * u * 0.6;
        c.position.y += Math.sin(a) * u * 0.6 + u * 0.5;
        c.scale.setScalar(Math.max(0.001, 1.3 - u * 1.3));
      });
    },
  },
};

export const healingFireball = {
  label: '치유 파이어볼 (투사체)', role: '✨ 마법 효과',
  defaults: { seed: 72, size: 1, fireColor: '#ffb43a', healColor: '#7dffa0', crossColor: '#eaffd0' },
  schema: itemSchema({ fireColor: '불꽃 색', healColor: '치유 빛', crossColor: '십자 색' }),
  build(p) {
    const k = createKit(p.seed, 0.4, 0);
    const root = k.pivot('root');
    root.name = 'HealingFireball';
    const ball = k.pivot('ball', 0, 0.5, 0); // flies along +Z; lifted so it shows above the floor in the viewer
    ball.scale.setScalar(p.size);
    root.add(ball);
    const glowMat = (n, c, i, extra = {}) => k.mat(n, c, { emissive: c, emissiveIntensity: i, keepColor: true, ...extra });

    const core = k.pivot('core');
    core.add(k.ball(0.09, glowMat('coreWhite', '#fffbe8', 3), 1));
    core.add(k.ball(0.14, glowMat('heal', p.healColor, 1.6, { transparent: true, opacity: 0.75 }), 1, 0.012));
    core.add(k.ball(0.18, glowMat('fire', p.fireColor, 2.2, { transparent: true, opacity: 0.5 }), 1, 0.02));
    ball.add(core);

    // flame tongues trailing behind (-Z)
    const flames = [];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU;
      const f = k.pivot(`flame${i}`, Math.cos(a) * 0.08, Math.sin(a) * 0.08, -0.06);
      const mat = i % 2 ? glowMat('flameFire', p.fireColor, 1.4) : glowMat('flameHeal', p.healColor, 1.6);
      f.add(k.at(k.rot(k.cone(0.07, 0.4 - (i % 3) * 0.06, mat, 5), -Z, 0, 0), 0, 0, -0.18));
      ball.add(f);
      flames.push(f);
    }
    // little "+" healing crosses orbiting the ball
    const crosses = k.pivot('crosses');
    const cm = glowMat('cross', p.crossColor, 2.2);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU;
      const c = k.pivot(`cross${i}`, Math.cos(a) * 0.25, Math.sin(a) * 0.25, 0);
      c.add(k.box(0.07, 0.022, 0.022, cm, 0));
      c.add(k.box(0.022, 0.07, 0.022, cm, 0));
      crosses.add(c);
    }
    ball.add(crosses);
    // burst ring (only visible in `impact`), faces the flight direction
    const ring = k.pivot('burstRing');
    ring.add(k.mesh(new k.THREE.TorusGeometry(0.3, 0.025, 4, 18), glowMat('flameHeal', p.healColor, 1.6)));
    ring.scale.setScalar(0.001);
    ball.add(ring);

    return finalizeMonster(root, {
      rig: { ball, core, flames, crosses, ring }, params: p, animations: FIREBALL_ANIMS,
      clips: { fly: 'fly', charge: 'charge', impact: 'impact' },
    });
  },
};

export const MAGIC_ITEMS = { healingStaff };
export const MAGIC_EFFECTS = { healingFireball };
