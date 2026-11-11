// Neighborhood Pathways - alley version (kept as a backup of the original set).
import { mannequin, strayDog, trashGolem, shadowCat, sewerGator, balloonMonster, megaphoneBot } from './monsters.js';

export default {
  label: '🏘️ 동네 골목 (백업)',
  env: {
    sky: '#a9c0dc', fog: [12, 30], ground: '#6f8a5a',
    hemi: ['#ffffff', '#5a5a4a', 1.3], sun: ['#ffe8c8', 2.2], rim: ['#ffb37a', 0.7],
    kit: 'kits/kit-neighborhood-pathways-kit-a992cf.glb',
    props(k, group) {
      // street + sidewalk
      group.add(k.at(k.box(16, 0.02, 2.4, k.mat('asphalt', '#3a3c40'), 0), 0, 0.01, 2.8));
      const dash = k.mat('dash', '#e8d87a');
      for (let i = -6; i <= 6; i++) group.add(k.at(k.box(0.6, 0.025, 0.08, dash, 0), i * 1.2, 0.012, 2.8));
      group.add(k.at(k.box(16, 0.08, 0.8, k.mat('sidewalk', '#a8a49a'), 0), 0, 0.04, 1.3));
      // houses
      const roofs = ['#8a3a32', '#3a4a6a', '#5a4a3a'];
      const walls = ['#e8dcc0', '#c8d8e0', '#d8c8a8'];
      [-4.5, 0, 4.5].forEach((x, i) => {
        group.add(k.at(k.box(2.6, 1.8, 2, k.mat(`wall${i}`, walls[i]), 0.01), x, 0.9, -5.5));
        group.add(k.at(k.rot(k.cyl(1.7, 1.7, 2.1, k.mat(`roof${i}`, roofs[i]), 3), -Math.PI / 2, 0, 0), x, 1.8 + 0.85, -5.5));
        group.add(k.at(k.box(0.5, 0.9, 0.05, k.mat('door', '#5a3a2a'), 0), x, 0.45, -4.48));
        group.add(k.at(k.box(0.5, 0.4, 0.05, k.glow('window', '#ffd27a', 0.6), 0), x + 0.8, 1.1, -4.48));
      });
      // picket fence
      const fence = k.mat('picket', '#f0ece0');
      for (let i = 0; i < 20; i++) group.add(k.at(k.box(0.1, 0.55, 0.04, fence, 0.005), -6 + i * 0.6, 0.28, -3.6));
      group.add(k.at(k.box(12, 0.06, 0.03, fence, 0), 0, 0.38, -3.6));
      // street lamp + mailbox
      const pole = k.mat('lampPole', '#2a2e34', { metalness: 0.4 });
      group.add(k.at(k.cyl(0.05, 0.06, 2.6, pole, 6), -6.2, 1.3, 1.4));
      group.add(k.at(k.ball(0.15, k.glow('lamp', '#ffe0a0', 2), 1), -6.2, 2.6, 1.4));
      group.add(k.at(k.box(0.3, 0.25, 0.45, k.mat('mailbox', '#3a5a8a'), 0.005), 6, 0.95, 1.2));
      group.add(k.at(k.cyl(0.03, 0.03, 0.85, pole, 5), 6, 0.42, 1.2));
    },
  },
  monsters: { mannequin, strayDog, trashGolem, shadowCat, sewerGator, balloonMonster, megaphoneBot },
};
