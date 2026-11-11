// Graveyard theme: the original parametric zombies.
import { createZombie, DEFAULT_PARAMS, PRESETS } from './zombie.js';

const schema = {
  seed: { label: '시드', min: 1, max: 999, step: 1 },
  height: { label: '키', min: 0.6, max: 1.5, step: 0.01 },
  bulk: { label: '덩치', min: 0.6, max: 1.8, step: 0.01 },
  hunch: { label: '구부정함', min: 0, max: 0.8, step: 0.01 },
  armReach: { label: '팔 뻗기', min: 0, max: 1, step: 0.01 },
  armLength: { label: '팔 길이', min: 0.8, max: 1.4, step: 0.01 },
  neckLength: { label: '목 길이', min: 0, max: 1, step: 0.01 },
  belly: { label: '부푼 배', min: 0, max: 1, step: 0.01 },
  legs: { label: '다리', options: { 있음: 'full', 없음: 'none' } },
  headTilt: { label: '고개 기울기', min: -0.6, max: 0.6, step: 0.01 },
  jawOpen: { label: '입 벌림', min: 0, max: 0.6, step: 0.01 },
  rot: { label: '울퉁불퉁함', min: 0, max: 1.5, step: 0.01 },
  missingArm: { label: '잃은 팔', options: ['none', 'left', 'right'] },
  tornClothes: { label: '찢어진 옷' },
  wounds: { label: '상처 수', min: 0, max: 14, step: 1 },
  hair: { label: '머리카락', min: 0, max: 1, step: 0.01 },
  skinColor: { label: '피부' },
  shirtColor: { label: '셔츠' },
  pantsColor: { label: '바지' },
  hairColor: { label: '머리' },
  bloodColor: { label: '피' },
  eyeColor: { label: '눈' },
  eyeGlow: { label: '눈 발광', min: 0, max: 5, step: 0.1 },
};

const info = {
  walker: ['워커', '① 기본형'],
  runner: ['러너', '② 돌격형'],
  brute: ['브루트', '③ 탱커'],
  rotten: ['부패한 좀비', '④ 변칙형'],
  crawler: ['크롤러', '⑤ 매복형'],
  bloater: ['블로터', '⑥ 자폭/원거리'],
  screamer: ['스크리머', '⑦ 지휘형'],
};

export default {
  label: '🪦 묘지 (좀비)',
  env: {
    sky: '#1b2219', fog: [6, 16], ground: '#2f3a26',
    hemi: ['#b8c9a0', '#2a2018', 1.4], sun: ['#dfe8ff', 2.2], rim: ['#8cff6a', 1.0],
    kit: 'kits/kit-halloween-night.glb',
    props(k, group) {
      const stone = k.mat('stone', '#6b6e70');
      [[-1.8, -1.6, 0.2], [1.6, -2.2, -0.3], [-0.6, -3.0, 0.1], [2.6, -0.6, 0.5]].forEach(([x, z, r]) => {
        group.add(k.rot(k.at(k.box(0.55, 0.8, 0.14, stone, 0.02), x, 0.38, z), -0.08, r, r * 0.3));
      });
    },
  },
  monsters: Object.fromEntries(Object.entries(PRESETS).map(([key, preset]) => [key, {
    label: info[key][0],
    role: info[key][1],
    defaults: { ...DEFAULT_PARAMS, ...preset },
    schema,
    build: createZombie,
  }])),
};
