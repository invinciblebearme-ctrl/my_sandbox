// Space Base theme.
import { infectedAstronaut, alienBug, securityBot, morphSlime, ventTentacle, acidEgg, commandDrone } from './monsters.js';

export default {
  label: '🚀 우주 기지',
  env: {
    sky: '#1c2236', fog: [10, 28], ground: '#5d6472',
    hemi: ['#cfe0ff', '#2a2f3a', 1.3], sun: ['#e0ecff', 2.0], rim: ['#5affc8', 1.0],
    kit: 'kits/kit-space-base-kit-cf65de.glb',
    props(k, group) {
      const panel = k.mat('panel', '#4a505c', { metalness: 0.3 });
      const line = k.mat('panelLine', '#2a2e36');
      // floor grid
      for (let i = -6; i <= 6; i++) {
        group.add(k.at(k.box(14, 0.012, 0.03, line, 0), 0, 0.006, i * 1.1));
        group.add(k.at(k.box(0.03, 0.012, 14, line, 0), i * 1.1, 0.006, 0));
      }
      // back wall with glowing windows and pipes
      group.add(k.at(k.box(14, 3, 0.3, panel, 0.01), 0, 1.5, -6));
      const screen = k.glow('screen', '#5affc8', 1.2);
      for (let i = 0; i < 5; i++) group.add(k.at(k.box(1.1, 0.6, 0.05, screen, 0), -5 + i * 2.5, 1.8, -5.83));
      const pipe = k.mat('pipe', '#7a828e', { metalness: 0.5 });
      group.add(k.at(k.rot(k.cyl(0.08, 0.08, 14, pipe, 8), 0, 0, Math.PI / 2), 0, 2.7, -5.75));
      group.add(k.at(k.rot(k.cyl(0.05, 0.05, 14, pipe, 8), 0, 0, Math.PI / 2), 0, 0.4, -5.75));
      // crates and a console
      const crate = k.mat('crate', '#6a7380');
      const stripe = k.mat('hazard', '#d8a83a');
      for (const [x, z, s] of [[-4.5, -3.5, 0.8], [-3.7, -3.9, 0.6], [4.8, -3.2, 0.9]]) {
        group.add(k.at(k.box(s, s, s, crate, 0.01), x, s / 2, z));
        group.add(k.at(k.box(s * 1.02, s * 0.12, s * 1.02, stripe, 0), x, s * 0.8, z));
      }
      group.add(k.at(k.box(1.2, 0.9, 0.5, panel, 0.01), 3.6, 0.45, -4.6));
      group.add(k.at(k.rot(k.box(1.0, 0.4, 0.04, screen, 0), -0.5, 0, 0), 3.6, 0.95, -4.4));
    },
  },
  monsters: { infectedAstronaut, alienBug, securityBot, morphSlime, ventTentacle, acidEgg, commandDrone },
};
