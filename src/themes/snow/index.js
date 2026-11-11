// Alpine & Snow village theme.
import { snowman, frostFox, yeti, icicleSpider, snowShark, bombSnowball, blizzardFairy } from './monsters.js';
import { ITEMS } from './items.js';

export default {
  label: '❄️ 눈 내리는 마을',
  env: {
    sky: '#cfe5f5', fog: [12, 32], ground: '#f2f7fc',
    hemi: ['#ffffff', '#9db4c8', 1.3], sun: ['#ffffff', 2.2], rim: ['#9fd4ff', 0.7],
    kit: 'kits/kit-alpine-and-snow-092f66.glb',
    props(k, group) {
      const trunk = k.mat('trunk', '#7a5236');
      const pine = k.mat('pine', '#2f7a5a');
      const snow = k.mat('snowCap', '#ffffff', { roughness: 1 });
      [[-3, -3.2, 1.2], [-1.4, -4.4, 1.0], [2.6, -3.8, 1.4], [5.4, -2.2, 0.9], [-6, -1.8, 1.1]].forEach(([x, z, s]) => {
        group.add(k.at(k.cyl(0.08 * s, 0.1 * s, 0.4 * s, trunk, 6), x, 0.2 * s, z));
        for (let i = 0; i < 3; i++) {
          group.add(k.at(k.cone((0.55 - i * 0.13) * s, 0.6 * s, pine, 7, 0.02), x, (0.55 + i * 0.35) * s, z));
          group.add(k.at(k.cone((0.3 - i * 0.07) * s, 0.3 * s, snow, 7, 0.01), x, (0.72 + i * 0.35) * s, z));
        }
      });
      // little cabin
      const wood = k.mat('wood', '#a0643c');
      group.add(k.at(k.box(1.4, 0.9, 1.1, wood, 0.01), 6.2, 0.45, -5.5));
      // triangular roof, ridge along Z (3-sided cylinder turned so a corner points up)
      group.add(k.at(k.rot(k.cyl(0.9, 0.9, 1.3, snow, 3), -Math.PI / 2, 0, 0), 6.2, 0.9 + 0.45, -5.5));
      group.add(k.at(k.box(0.3, 0.5, 0.02, k.glow('window', '#ffd27a', 0.8)), 6.2, 0.5, -4.94));
      // snow piles
      for (const [x, z, r] of [[-3.8, 2.4, 0.5], [3.6, 2.2, 0.7], [-5, -0.5, 0.4]]) {
        group.add(k.at(k.scl(k.ball(r, snow, 1, 0.03), 1.4, 0.45, 1), x, 0, z));
      }
    },
  },
  monsters: { snowman, frostFox, yeti, icicleSpider, snowShark, bombSnowball, blizzardFairy },
  items: ITEMS,
};
