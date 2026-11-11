// Campground & Lake theme.
import { swampy, wolfPup, bigBear, tentMimic, lakeEel, sporeShroom, campfireWisp } from './monsters.js';
import { ITEMS } from './items.js';

export default {
  label: '🏕️ 숲속 캠핑장',
  env: {
    sky: '#a9dcef', fog: [12, 32], ground: '#7cb85a',
    hemi: ['#ffffff', '#5c7d3c', 1.3], sun: ['#fff1d6', 2.4], rim: ['#ffd29a', 0.6],
    kit: 'kits/campground.glb',
    props(k, group) {
      const trunk = k.mat('trunk', '#8a5a36');
      const pine = k.mat('pine', '#2f8a4f');
      const pine2 = k.mat('pine2', '#3fa15c');
      [[-3, -3.2, 1.2], [-1.6, -4.2, 1.0], [2.8, -3.6, 1.4], [5.4, -2.2, 0.9], [-6, -1.8, 1.1], [0.6, -4.8, 1.3]].forEach(([x, z, s]) => {
        group.add(k.at(k.cyl(0.08 * s, 0.1 * s, 0.4 * s, trunk, 6), x, 0.2 * s, z));
        for (let i = 0; i < 3; i++) {
          group.add(k.at(k.cone((0.55 - i * 0.13) * s, 0.6 * s, i % 2 ? pine2 : pine, 7, 0.02), x, (0.55 + i * 0.35) * s, z));
        }
      });
      // campfire
      const log = k.mat('log', '#6b4226');
      for (let i = 0; i < 4; i++) group.add(k.rot(k.at(k.cyl(0.05, 0.05, 0.5, log, 6), -3.6, 0.06, 2.6), 0, (i / 4) * Math.PI, Math.PI / 2));
      group.add(k.at(k.cone(0.16, 0.4, k.glow('fire', '#ff8a2a', 2), 6), -3.6, 0.25, 2.6));
      const stone = k.mat('rock', '#9aa0a6');
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        group.add(k.at(k.ball(0.08, stone, 0, 0.01), -3.6 + Math.cos(a) * 0.38, 0.05, 2.6 + Math.sin(a) * 0.38));
      }
      // lake
      group.add(k.at(k.scl(k.cyl(2.2, 2.2, 0.02, k.mat('lake', '#5fb7e8', { roughness: 0.15 }), 16), 1.4, 1, 0.8), 4.5, 0.012, 2.5));
    },
  },
  monsters: { swampy, wolfPup, bigBear, tentMimic, lakeEel, sporeShroom, campfireWisp },
  items: ITEMS,
};
