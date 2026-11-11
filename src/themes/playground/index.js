// Neighborhood playground theme (uses the Neighborhood Pathways kit).
import { brokenDoll, strayDog, jungleGymGolem, swingMimic, sandboxWorm, balloonMonster, jackInTheBox } from './monsters.js';
import { ITEMS } from './items.js';

export default {
  label: '🛝 동네 놀이터',
  env: {
    sky: '#a9c0dc', fog: [12, 30], ground: '#7a9a5a',
    hemi: ['#ffffff', '#5a5a4a', 1.3], sun: ['#ffe8c8', 2.2], rim: ['#ffb37a', 0.7],
    kit: 'kits/kit-neighborhood-pathways-kit-a992cf.glb',
    props(k, group) {
      const red = k.mat('red', '#d84a3a');
      const blue = k.mat('blue', '#3a7ad8');
      const yellow = k.mat('yellow', '#e8c03a');
      // slide
      group.add(k.at(k.box(0.6, 1.4, 0.08, blue, 0.01), -4.2, 0.7, -4.6));
      for (let i = 0; i < 5; i++) group.add(k.at(k.box(0.6, 0.04, 0.04, blue, 0), -4.2, 0.25 + i * 0.27, -4.62));
      group.add(k.at(k.box(0.8, 0.06, 0.8, red, 0.01), -4.2, 1.4, -4.2));
      group.add(k.at(k.rot(k.box(0.55, 0.05, 2.0, yellow, 0.01), -0.62, 0, 0), -4.2, 0.75, -3.0));
      // seesaw
      group.add(k.at(k.rot(k.box(2.4, 0.07, 0.25, red, 0.01), 0, 0, 0.18), 3.6, 0.35, -3.8));
      group.add(k.at(k.rot(k.cyl(0.18, 0.18, 0.3, yellow, 3), Math.PI / 2, 0, 0), 3.6, 0.15, -3.8));
      // merry-go-round
      group.add(k.at(k.cyl(0.9, 0.9, 0.08, k.mat('merry', '#3aa86a'), 12, 0.01), 0.4, 0.2, -5.4));
      group.add(k.at(k.cyl(0.05, 0.05, 0.9, yellow, 6), 0.4, 0.6, -5.4));
      // fence + benches + street lamp
      const fence = k.mat('picket', '#f0ece0');
      for (let i = 0; i < 20; i++) group.add(k.at(k.box(0.1, 0.55, 0.04, fence, 0.005), -6 + i * 0.6, 0.28, -7));
      const wood = k.mat('bench', '#8a5a36');
      group.add(k.at(k.box(1.4, 0.06, 0.4, wood, 0.01), 5.2, 0.45, 1.4));
      group.add(k.at(k.box(1.4, 0.35, 0.06, wood, 0.01), 5.2, 0.65, 1.6));
      const pole = k.mat('lampPole', '#2a2e34', { metalness: 0.4 });
      group.add(k.at(k.cyl(0.05, 0.06, 2.6, pole, 6), -6.2, 1.3, 1.4));
      group.add(k.at(k.ball(0.15, k.glow('lamp', '#ffe0a0', 2), 1), -6.2, 2.6, 1.4));
    },
  },
  monsters: { brokenDoll, strayDog, jungleGymGolem, swingMimic, sandboxWorm, balloonMonster, jackInTheBox },
  items: ITEMS,
};
