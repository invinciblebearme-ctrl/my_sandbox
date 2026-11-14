// 교육용 핵앤슬래시 ARPG "망각의 그림자" — MVP asset set (stage 1, 속삭이는 숲).
// A separate game from the zombie sets: cute, no gore, horror always 0.
// Output layout follows the spec: public/models/{characters,monsters,props,items,vfx}/.
import { warrior, starHunter, sage } from './warrior.js';
import { EDU_MONSTERS, EDU_PROJECTILES } from './monsters.js';
import { EDU_MONSTERS_2 } from './monsters2.js';
import { EDU_BOSSES } from './bosses.js';
import { EDU_ITEMS } from './items.js';
import { FOREST_ALL, FOREST_PROPS } from './forest.js';
import { EDU_VFX } from './vfx.js';

export default {
  label: '📚 [교육 ARPG] 속삭이는 숲',
  standalone: true, // own items only (no zombie-game magic items), not in the zombie item manifest
  env: {
    sky: '#1d3a40', fog: [9, 26], ground: '#3f7a4a', horror: 0,
    hemi: ['#d8f0ff', '#2a4a3a', 1.2], sun: ['#ffe8c0', 1.8], rim: ['#8ad8ff', 1.0],
    props(k, group) {
      const place = (d, x, z, ry = 0) => { const o = d.build({ ...d.defaults }); o.position.set(x, 0, z); o.rotation.y = ry; group.add(o); };
      [[-3, -3.5], [3.2, -3], [-5, -1], [5.5, -1.5], [0.5, -5]].forEach(([x, z], i) => place(i % 2 ? FOREST_PROPS.stage1_tree_02 : FOREST_PROPS.stage1_tree_01, x, z, i));
      place(FOREST_PROPS.stage1_lantern_post, -2, -1.5);
      place(FOREST_PROPS.stage1_mushroom_glow, 2.2, -1.2);
      place(FOREST_PROPS.stage1_rock_01, 3.6, 1.6);
    },
  },
  characters: { warrior, starHunter, sage },
  monsters: { ...EDU_MONSTERS, ...EDU_PROJECTILES, ...EDU_MONSTERS_2 },
  bosses: EDU_BOSSES,
  items: EDU_ITEMS,
  props: FOREST_ALL,
  vfx: EDU_VFX,
};
