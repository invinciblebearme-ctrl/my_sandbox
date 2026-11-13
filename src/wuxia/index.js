// Martial arts: 항룡십팔장 (降龍十八掌, Eighteen Dragon-Subduing Palms) palm force.
//
// In the novel the palms are pure force: a hard, overwhelming palm wind that snaps a pine
// tree, with the power deliberately held in reserve. The visible golden dragon is a game
// visual (as in TV and comic adaptations); turn it off with `dragon: false` to get just the
// palm print and the rushing wind rings.
//
// GLB layout: root > force (lifted 1.0 so it shows in the viewer; the palm leaves the hand
// at about that height) > palmPrint, windRings, dragon (head + 7 body segments trailing -Z).
// Flies along +Z. Clips: charge (palm glows at the hand), fly (loop), impact (burst).
import { createKit } from '../core/kit.js';
import { finalizeMonster, TAU, keys, clamp01, smooth } from '../core/monster.js';
import { itemSchema } from '../core/item.js';
import { PALM_RELEASE } from '../player/animations.js';

const Z = Math.PI / 2;
export const PALM_LIFT = 1.0;
const SEGMENTS = 7;

const PALM_ANIMS = {
  charge: {
    label: '장력 모으기 (손바닥에 빛)',
    duration: 0.6,
    loop: false,
    apply(r, u) {
      const g = smooth(u);
      r.palm.scale.setScalar(Math.max(0.001, g * 0.55));
      r.palm.rotation.z += Math.sin(u * TAU * 3) * 0.1 * g;
      r.rings.scale.setScalar(0.001);
      r.dragon.scale.setScalar(0.001);
    },
  },
  fly: {
    label: '날아가기 (용이 꿈틀대며 돌진, 반복)',
    duration: 0.8,
    apply(r, u) {
      const w = u * TAU;
      r.palm.scale.setScalar(1 + Math.sin(w * 2) * 0.06);
      r.rings.children.forEach((ring, i) => {
        const f = (u + i / r.rings.children.length) % 1; // rings stream backwards
        ring.position.z -= f * 1.2;
        ring.scale.setScalar(0.6 + f * 0.9);
      });
      // body undulates like a swimming dragon, head bobs
      r.segs.forEach((s, i) => {
        s.rotation.y += Math.sin(w - i * 0.9) * 0.35;
        s.rotation.x += Math.sin(w * 2 - i * 0.9) * 0.15;
      });
      r.head.rotation.x += Math.sin(w) * 0.08;
      r.jaw.rotation.x += 0.25 + Math.sin(w * 2) * 0.12;
      r.whiskers.forEach((wh, i) => { wh.rotation.y += Math.sin(w + i) * 0.3; });
    },
  },
  impact: {
    label: '격중 (용이 덮치며 터짐)',
    duration: 0.9,
    loop: false,
    apply(r, u) {
      const lunge = keys(u, [[0, 0], [0.2, 1], [1, 1]]);
      const fade = Math.max(0.001, 1 - smooth(clamp01((u - 0.35) / 0.65)));
      r.head.position.z += lunge * 0.35;
      r.jaw.rotation.x += lunge * 0.6;
      r.dragon.scale.setScalar(fade * (1 + lunge * 0.15));
      r.palm.scale.setScalar(Math.max(0.001, (1 + smooth(u) * 1.8) * (1 - smooth(clamp01((u - 0.5) / 0.5)))));
      r.palm.position.z += u * 0.3;
      r.rings.children.forEach((ring, i) => {
        ring.position.z += 0.3 + i * 0.05;
        ring.scale.setScalar(u > 0.95 ? 0.001 : 0.5 + smooth(clamp01(u * 1.3 - i * 0.12)) * 3.2);
      });
    },
  },
};

export const dragonPalm = {
  label: '항룡장 장력 (투사체)', role: '🐉 무공 효과',
  defaults: { seed: 81, size: 1, dragon: true, forceColor: '#f0a828', glowColor: '#fff0b0', eyeColor: '#ff3a1a' },
  schema: { ...itemSchema({ forceColor: '기운 색', glowColor: '중심 빛', eyeColor: '용 눈 색' }), dragon: { label: '용 모양 (게임 연출)' } },
  build(p) {
    const k = createKit(p.seed, 0.4, 0);
    const root = k.pivot('root');
    root.name = 'DragonPalm';
    const force = k.pivot('force', 0, PALM_LIFT, 0);
    force.scale.setScalar(p.size);
    root.add(force);
    const glow = (n, c, i, opacity = 1) => k.mat(n, c, {
      emissive: c, emissiveIntensity: i, keepColor: true, ...(opacity < 1 ? { transparent: true, opacity, depthWrite: false } : {}),
    });
    const gold = glow('qi', p.forceColor, 0.7, 0.75);
    const goldSolid = k.mat('qiSolid', p.forceColor, { emissive: p.forceColor, emissiveIntensity: 0.55, metalness: 0.5, roughness: 0.35, keepColor: true });
    const core = glow('qiCore', p.glowColor, 1.4, 0.85);

    // giant palm print (fingers up, facing +Z)
    const palm = k.pivot('palmPrint', 0, 0, -0.05);
    palm.add(k.box(0.36, 0.38, 0.05, core, 0.01));
    for (let i = 0; i < 4; i++) palm.add(k.at(k.box(0.075, 0.26 - Math.abs(i - 1.5) * 0.04, 0.05, core, 0.006), -0.12 + i * 0.08, 0.3 - Math.abs(i - 1.5) * 0.02, 0));
    palm.add(k.at(k.rot(k.box(0.08, 0.2, 0.05, core, 0.006), 0, 0, 0.7), 0.22, 0.02, 0));
    palm.add(k.at(k.box(0.5, 0.56, 0.02, gold, 0.02), 0, 0.08, -0.04)); // aura behind it
    force.add(palm);

    // wind rings streaming behind the palm
    const rings = k.pivot('windRings');
    for (let i = 0; i < 4; i++) {
      const ring = k.pivot(`windRing${i}`, 0, 0, -0.1);
      ring.add(k.mesh(new k.THREE.TorusGeometry(0.4, 0.02, 4, 16), glow('wind', p.glowColor, 1.0, 0.45)));
      rings.add(ring);
    }
    force.add(rings);

    // the dragon: head leads at +Z, body segments chain backwards
    const dragon = k.pivot('dragon', 0, 0.05, 0.35);
    force.add(dragon);
    const head = k.pivot('dragonHead');
    dragon.add(head);
    head.add(k.at(k.box(0.26, 0.2, 0.3, goldSolid, 0.01), 0, 0.04, 0.05)); // skull
    head.add(k.at(k.box(0.2, 0.1, 0.26, goldSolid, 0.01), 0, 0.04, 0.3)); // upper snout
    head.add(k.at(k.box(0.24, 0.05, 0.05, goldSolid, 0), 0, 0.12, 0.13)); // brow
    for (const s of [-1, 1]) {
      head.add(k.at(k.rot(k.cone(0.03, 0.28, goldSolid, 4), -1.9, s * 0.35, 0), s * 0.08, 0.2, -0.12)); // antlers
      head.add(k.at(k.rot(k.cone(0.018, 0.12, goldSolid, 4), -2.2, s * 0.8, 0), s * 0.14, 0.24, -0.08));
      head.add(k.at(k.box(0.05, 0.035, 0.03, glow('dragonEye', p.eyeColor, 3), 0), s * 0.11, 0.1, 0.18));
      head.add(k.at(k.rot(k.cone(0.02, 0.06, glow('fang', '#ffffff', 1.2), 3), Math.PI, 0, 0), s * 0.07, -0.03, 0.4)); // fangs
      // mane spikes along the cheeks
      for (let j = 0; j < 3; j++) head.add(k.at(k.rot(k.cone(0.03, 0.14, gold, 4), -2.4 + j * 0.2, 0, s * (1.2 + j * 0.15)), s * 0.14, 0.02 - j * 0.04, -0.05 - j * 0.04));
    }
    const jaw = k.pivot('dragonJaw', 0, -0.02, 0.12);
    jaw.add(k.at(k.box(0.17, 0.05, 0.28, goldSolid, 0.008), 0, -0.03, 0.14));
    jaw.add(k.at(k.box(0.12, 0.02, 0.2, glow('mouth', '#ff7a2a', 2), 0), 0, 0, 0.14));
    head.add(jaw);
    const whiskers = [];
    for (const s of [-1, 1]) {
      const wh = k.pivot(`whisker${s > 0 ? 'L' : 'R'}`, s * 0.09, 0.06, 0.38);
      wh.add(k.at(k.rot(k.cyl(0.006, 0.012, 0.45, gold, 4), Z + 0.3, 0, -s * 0.5), s * 0.1, -0.05, -0.18));
      head.add(wh);
      whiskers.push(wh);
    }
    // body: each segment hangs off the previous one so the wave travels down the chain
    const segs = [];
    let parent = dragon;
    for (let i = 0; i < SEGMENTS; i++) {
      const r = 0.12 * (1 - i / (SEGMENTS + 1.5));
      const seg = k.pivot(`dragonBody${i}`, 0, 0, i === 0 ? -0.08 : -0.24);
      seg.add(k.at(k.rot(k.cyl(r, r * 0.92, 0.26, goldSolid, 6, 0.006), Z, 0, 0), 0, 0, -0.12));
      seg.add(k.at(k.rot(k.cone(0.025, 0.1, gold, 4), 0, 0, 0), 0, r + 0.03, -0.12)); // dorsal spine
      if (i === 1 || i === 4) for (const s of [-1, 1]) { // claws
        seg.add(k.at(k.rot(k.box(0.03, 0.16, 0.04, goldSolid, 0), 0.6, 0, s * 0.5), s * (r + 0.05), -r, -0.06));
        seg.add(k.at(k.rot(k.cone(0.02, 0.06, glow('claw', '#ffffff', 1.2), 3), Math.PI, 0, 0), s * (r + 0.1), -r - 0.07, 0));
      }
      if (i === SEGMENTS - 1) seg.add(k.at(k.rot(k.cone(0.08, 0.25, gold, 4), -Z, 0, 0), 0, 0, -0.35)); // tail flame
      parent.add(seg);
      segs.push(seg);
      parent = seg;
    }
    if (!p.dragon) dragon.scale.setScalar(0.001);

    return finalizeMonster(root, {
      rig: { force, palm, rings, dragon: p.dragon ? dragon : k.pivot('noDragon'), head, jaw, whiskers, segs }, params: p, animations: PALM_ANIMS,
      clips: { fly: 'fly', charge: 'charge', impact: 'impact' },
    });
  },
};

// Which player clip launches the palm force, from where and in which direction
// (direction in the player's local space: +Z forward).
export const PALM_SKILLS = {
  palmKangLong: { label: '항룡유회 亢龍有悔', release: PALM_RELEASE.palmKangLong, from: 'handR', dir: [0, 0, 1] },
  palmFeiLong: { label: '비룡재천 飛龍在天', release: PALM_RELEASE.palmFeiLong, from: 'handR', dir: [0, -0.55, 1] },
  palmShenLong: { label: '신룡파미 神龍擺尾', release: PALM_RELEASE.palmShenLong, from: 'handR', dir: [0, 0, -1] },
};

export const WUXIA_EFFECTS = { dragonPalm };
