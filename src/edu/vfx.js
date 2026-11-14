// Shared effects (MVP). Each GLB has one clip, `play` (one-shot unless noted).
// Spawn at the target's feet (or hit point), play, then destroy.
import { finalizeMonster, TAU, keys, clamp01, smooth } from '../core/monster.js';
import { eduKit, glowMat, fragments, burst, sizeSchema, colorSchema } from './common.js';

const Z = Math.PI / 2;

function effect(name, label, defaults, build, play, { loop = false, duration = 0.5 } = {}) {
  const colorKeys = Object.keys(defaults).filter((k) => k.endsWith('Color'));
  return {
    label, role: '✨ 효과', file: `vfx/${name}.glb`,
    defaults: { seed: 700, size: 1, ...defaults },
    schema: { ...sizeSchema, ...colorSchema(Object.fromEntries(colorKeys.map((c) => [c, c.replace('Color', ' 색')]))) },
    build(p) {
      const k = eduKit(p.seed, 0);
      const root = k.pivot('root');
      root.name = name;
      const fx = k.pivot('fx');
      fx.scale.setScalar(p.size);
      root.add(fx);
      const rig = { fx };
      build(k, fx, rig, p);
      return finalizeMonster(root, {
        rig, params: p,
        animations: { play: { label: loop ? '재생 (반복)' : '재생', duration, ...(loop ? {} : { loop: false }), apply: play } },
        clips: { play: 'play' },
      });
    },
  };
}

// star burst of thin rays
function rays(k, parent, name, n, len, mat, y = 0) {
  const g = k.pivot(name, 0, y, 0);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    g.add(k.at(k.rot(k.scl(k.mesh(new k.THREE.OctahedronGeometry(0.04, 0), mat), 0.5, len / 0.08, 0.5), 0, 0, a), Math.sin(-a) * len * 0.5, Math.cos(a) * len * 0.5, 0));
  }
  parent.add(g);
  return g;
}

export const EDU_VFX = {
  fx_hit_spark: effect('fx_hit_spark', '기본 타격 스파크', { sparkColor: '#fff3b0' }, (k, fx, r, p) => {
    r.rays = rays(k, fx, 'rays', 6, 0.3, glowMat(k, 'spark', p.sparkColor, 2.4), 0.9);
    r.core = k.pivot('core', 0, 0.9, 0);
    r.core.add(k.ball(0.07, glowMat(k, 'sparkCore', '#ffffff', 3), 0));
    fx.add(r.core);
  }, (r, u) => {
    const s = Math.max(0.001, keys(u, [[0, 0.3], [0.25, 1.2], [1, 0]]));
    r.rays.scale.setScalar(s);
    r.rays.rotation.z += u * 0.8;
    r.core.scale.setScalar(Math.max(0.001, keys(u, [[0, 1.5], [0.3, 1], [0.6, 0]])));
  }, { duration: 0.3 }),

  fx_crit: effect('fx_crit', '치명타 타격', { sparkColor: '#ff8a3a', flashColor: '#ffe14a' }, (k, fx, r, p) => {
    r.rays = rays(k, fx, 'rays', 10, 0.55, glowMat(k, 'critSpark', p.sparkColor, 2.4), 0.9);
    r.rays2 = rays(k, fx, 'rays2', 5, 0.35, glowMat(k, 'critFlash', p.flashColor, 2.8), 0.9);
    r.ring = k.pivot('ring', 0, 0.9, 0);
    r.ring.add(k.mesh(new k.THREE.TorusGeometry(0.3, 0.03, 3, 14), glowMat(k, 'critRing', p.flashColor, 2.4)));
    fx.add(r.ring);
  }, (r, u) => {
    r.rays.scale.setScalar(Math.max(0.001, keys(u, [[0, 0.2], [0.2, 1.3], [1, 0]])));
    r.rays2.scale.setScalar(Math.max(0.001, keys(u, [[0, 0.5], [0.15, 1.4], [0.7, 0]])));
    r.rays2.rotation.z += 0.3 + u;
    r.ring.scale.setScalar(u > 0.95 ? 0.001 : 0.3 + smooth(u) * 1.6);
  }, { duration: 0.45 }),

  fx_dissolve: effect('fx_dissolve', '몬스터 소멸 (빛 조각 + 글자)', { shardColor: '#fff3b0', letterColor: '#bfe4ff' }, (k, fx, r, p) => {
    r.frags = fragments(k, fx, { y: 0.4, count: 14, spread: 1, shard: p.shardColor, letter: p.letterColor });
    r.flash = k.pivot('flash', 0, 0.4, 0);
    r.flash.add(k.ball(0.25, glowMat(k, 'dissolveFlash', p.shardColor, 1.6, 0.5), 1));
    fx.add(r.flash);
  }, (r, u) => {
    burst(r.frags, u);
    r.flash.scale.setScalar(Math.max(0.001, keys(u, [[0, 0.4], [0.12, 1.2], [0.4, 0]])));
  }, { duration: 1 }),

  fx_levelup: effect('fx_levelup', '레벨업 빛 기둥', { beamColor: '#ffd34a', ringColor: '#fff3b0' }, (k, fx, r, p) => {
    r.beam = k.pivot('beam');
    r.beam.add(k.at(k.cyl(0.45, 0.55, 3, glowMat(k, 'lvBeam', p.beamColor, 1.4, 0.3), 10), 0, 1.5, 0));
    r.beam.add(k.at(k.cyl(0.2, 0.3, 3, glowMat(k, 'lvCore', '#ffffff', 2, 0.35), 8), 0, 1.5, 0));
    fx.add(r.beam);
    r.rings = k.pivot('rings');
    for (let i = 0; i < 3; i++) {
      const ring = k.pivot(`ring${i}`);
      ring.add(k.rot(k.mesh(new k.THREE.TorusGeometry(0.6, 0.03, 3, 18), glowMat(k, 'lvRing', p.ringColor, 2.2)), Z, 0, 0));
      r.rings.add(ring);
    }
    fx.add(r.rings);
    r.stars = rays(k, fx, 'stars', 8, 0.25, glowMat(k, 'lvStar', '#ffffff', 2.6), 1.6);
  }, (r, u) => {
    const on = keys(u, [[0, 0], [0.15, 1], [0.75, 1], [1, 0]]);
    r.beam.scale.set(Math.max(0.001, on), Math.max(0.001, smooth(clamp01(u / 0.25))), Math.max(0.001, on));
    r.beam.rotation.y += u * TAU;
    r.rings.children.forEach((ring, i) => {
      const f = (u * 1.5 + i / 3) % 1;
      ring.position.y += f * 2.8;
      ring.scale.setScalar(Math.max(0.001, (1 - f) * on * (0.8 + f * 0.4)));
    });
    r.stars.scale.setScalar(Math.max(0.001, keys(u, [[0, 0], [0.2, 0], [0.35, 1.6], [0.7, 0]])));
    r.stars.rotation.z += u * 2;
  }, { duration: 1.6 }),

  ...Object.fromEntries([['hp', '#ff4a6a', '체력'], ['mp', '#4a9aff', '마나']].map(([kind, color, label]) => [`fx_heal_${kind}`,
    effect(`fx_heal_${kind}`, `물약 회복 (${label})`, { healColor: color }, (k, fx, r, p) => {
      r.motes = k.pivot('motes');
      const gm = glowMat(k, `${kind}Mote`, p.healColor, 2);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU;
        const mote = k.pivot(`mote${i}`, Math.cos(a) * 0.4, 0.1 + (i % 3) * 0.2, Math.sin(a) * 0.4);
        if (kind === 'hp' && i % 2) { mote.add(k.box(0.09, 0.03, 0.03, gm, 0)); mote.add(k.box(0.03, 0.09, 0.03, gm, 0)); } // + crosses
        else mote.add(k.scl(k.mesh(new k.THREE.OctahedronGeometry(0.04, 0), gm), 1, 1.5, 1));
        r.motes.add(mote);
      }
      fx.add(r.motes);
      r.ring = k.pivot('ring', 0, 0.03, 0);
      r.ring.add(k.rot(k.mesh(new k.THREE.TorusGeometry(0.45, 0.025, 3, 16), glowMat(k, `${kind}Ring`, p.healColor, 1.8)), Z, 0, 0));
      fx.add(r.ring);
    }, (r, u) => {
      r.motes.rotation.y += u * TAU * 0.5;
      r.motes.children.forEach((m, i) => {
        const f = (u + i / 8) % 1;
        m.position.y += f * 1.3;
        m.scale.setScalar(Math.max(0.001, Math.sin(Math.PI * f) * keys(u, [[0, 0], [0.1, 1], [0.8, 1], [1, 0]])));
      });
      r.ring.scale.setScalar(Math.max(0.001, keys(u, [[0, 0.2], [0.2, 1], [0.8, 1.1], [1, 0]])));
    }, { duration: 1.2 })])),

  // rarity beams for floor drops (loop), one GLB per rarity colour
  ...Object.fromEntries([['common', '#c8c8c8', '일반'], ['magic', '#4a8aff', '마법'], ['rare', '#ffd34a', '희귀'], ['legendary', '#ff8a2a', '전설']].map(([rar, color, label]) => [`fx_loot_beam_${rar}`,
    effect(`fx_loot_beam_${rar}`, `아이템 빛 기둥 (${label})`, { beamColor: color }, (k, fx, r, p) => {
      const h = rar === 'legendary' ? 2.6 : rar === 'rare' ? 2 : rar === 'magic' ? 1.6 : 1;
      r.beam = k.pivot('beam');
      r.beam.add(k.at(k.cyl(0.06, 0.16, h, glowMat(k, 'lootBeam', p.beamColor, 1.6, 0.4), 6), 0, h / 2, 0));
      r.beam.add(k.at(k.cyl(0.02, 0.05, h, glowMat(k, 'lootCore', '#ffffff', 2, 0.6), 5), 0, h / 2, 0));
      fx.add(r.beam);
      r.ring = k.pivot('ring', 0, 0.02, 0);
      r.ring.add(k.rot(k.mesh(new k.THREE.TorusGeometry(0.22, 0.015, 3, 14), glowMat(k, 'lootRing', p.beamColor, 2)), Z, 0, 0));
      fx.add(r.ring);
    }, (r, u) => {
      r.beam.scale.set(1 + Math.sin(u * TAU) * 0.15, 1 + Math.sin(u * TAU * 2) * 0.04, 1 + Math.sin(u * TAU) * 0.15);
      r.beam.rotation.y += u * TAU;
      r.ring.scale.setScalar(0.8 + ((u * 2) % 1) * 0.6);
    }, { loop: true, duration: 1.6 })])),

  fx_click_marker: effect('fx_click_marker', '발밑 클릭 표시', { markColor: '#8ad8ff' }, (k, fx, r, p) => {
    r.ring = k.pivot('ring', 0, 0.02, 0);
    r.ring.add(k.rot(k.mesh(new k.THREE.TorusGeometry(0.3, 0.02, 3, 16), glowMat(k, 'clickRing', p.markColor, 2)), Z, 0, 0));
    fx.add(r.ring);
    r.arrows = k.pivot('arrows', 0, 0.02, 0);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU;
      const arrow = k.scl(k.cone(0.06, 0.12, glowMat(k, 'clickArrow', '#ffffff', 2), 3), 1, 1, 0.3);
      arrow.rotation.order = 'YXZ'; // tip along +Z, then turned to point at the centre
      arrow.rotation.set(Z, Math.atan2(-Math.cos(a), -Math.sin(a)), 0);
      r.arrows.add(k.at(arrow, Math.cos(a) * 0.35, 0, Math.sin(a) * 0.35));
    }
    fx.add(r.arrows);
  }, (r, u) => {
    r.ring.scale.setScalar(Math.max(0.001, keys(u, [[0, 1.6], [0.4, 0.7], [1, 0]])));
    r.arrows.scale.setScalar(Math.max(0.001, keys(u, [[0, 1.8], [0.5, 0.8], [1, 0]])));
    r.arrows.rotation.y += u * 1.5;
  }, { duration: 0.5 }),
};
