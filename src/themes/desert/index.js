// Frontier Town (desert) theme.
import { skeletonCowboy, zombieCoyote, cactusGolem, rattlesnake, sandworm, tumbleweed, ghostSheriff } from './monsters.js';
import { ITEMS } from './items.js';

export default {
  label: '🤠 사막 마을',
  env: {
    sky: '#f0c08a', fog: [12, 32], ground: '#d8b07a',
    hemi: ['#fff0d6', '#9a6a44', 1.3], sun: ['#ffd9a0', 2.4], rim: ['#ff9a5a', 0.8],
    kit: 'kits/kit-frontier-town-a0085b.glb',
    props(k, group) {
      const cactus = k.mat('saguaro', '#5d8a48');
      for (const [x, z, s] of [[-3.2, -3.4, 1.3], [3.4, -3.8, 1.1], [-5.6, -1.5, 0.9], [5.8, -1.8, 1.2]]) {
        group.add(k.at(k.cyl(0.12 * s, 0.14 * s, 1.6 * s, cactus, 7, 0.01), x, 0.8 * s, z));
        group.add(k.at(k.rot(k.cyl(0.08 * s, 0.09 * s, 0.5 * s, cactus, 6), 0, 0, 0.0), x + 0.3 * s, 1.0 * s, z));
        group.add(k.at(k.rot(k.cyl(0.08 * s, 0.08 * s, 0.3 * s, cactus, 6), 0, 0, Math.PI / 2), x + 0.18 * s, 0.75 * s, z));
      }
      const rock = k.mat('mesa', '#b5774a');
      group.add(k.at(k.scl(k.cyl(1.6, 2, 1.4, rock, 7, 0.06), 1, 1, 0.8), -1.2, 0.7, -7));
      group.add(k.at(k.scl(k.cyl(1.0, 1.3, 0.9, rock, 6, 0.05), 1, 1, 0.8), 2.8, 0.45, -6.5));
      // fence
      const wood = k.mat('fence', '#8a6040');
      for (let i = 0; i < 6; i++) group.add(k.at(k.box(0.08, 0.6, 0.08, wood, 0.01), -6 + i * 0.6, 0.3, 2.6));
      group.add(k.at(k.box(3.2, 0.07, 0.05, wood, 0.01), -4.5, 0.45, 2.6));
      group.add(k.at(k.box(3.2, 0.07, 0.05, wood, 0.01), -4.5, 0.25, 2.6));
      // cattle skull
      const bone = k.mat('skull', '#e8dcc0');
      group.add(k.at(k.box(0.25, 0.18, 0.3, bone, 0.02), 3.6, 0.09, 2.2));
      for (const s of [-1, 1]) group.add(k.at(k.rot(k.cone(0.04, 0.3, bone, 5), 0, 0, -s * 1.2), 3.6 + s * 0.2, 0.15, 2.1));
    },
  },
  monsters: { skeletonCowboy, zombieCoyote, cactusGolem, rattlesnake, sandworm, tumbleweed, ghostSheriff },
  items: ITEMS,
};
