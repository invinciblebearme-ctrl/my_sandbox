// node tools/ui/art-gen.cjs [outRoot=models/edu]   (needs `vite preview` on :4173)
// 3D renders from the viewer -> composited in tools/ui/gen.html -> PNGs under <out>/public/ui and icons
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
(async () => {
  const out = process.argv[2] ?? 'models/edu';
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader'] });
  const v = await b.newPage();
  const errs = []; v.on('pageerror', (e) => errs.push(e.message));
  await v.goto('http://localhost:4173/');
  await v.waitForTimeout(800);
  const art = await b.newPage();
  art.on('pageerror', (e) => errs.push(e.message));
  await art.goto('file://' + path.resolve(__dirname, 'gen.html'));
  await art.evaluate(async () => { await document.fonts.ready; });
  const render = (cat, key, opts) => v.evaluate(([c, k, o]) => window.__render(c, k, o), [cat, key, opts]);
  const scene = (items, opts) => v.evaluate(([i, o]) => window.__renderScene(i, o), [items, opts]);
  const compose = (kind, srcs, opts) => art.evaluate(([k, s, o]) => window.composeArt(k, s, o), [kind, srcs, opts]);
  const save = (rel, url) => { const f = path.join(out, 'public', rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, Buffer.from(url.split(',')[1], 'base64')); manifest.push(rel); };
  const manifest = [];

  // portraits: heroes with quiz reactions, NPCs, bosses (boss HP bar), Lumi faces
  const HEROES = { warrior: ['수호기사', '#3a6ad8', '방패로 막고 검으로 벤다'], starHunter: ['별사냥꾼', '#3a9a5a', '빠른 발과 별빛 화살'], sage: ['현자', '#7a4ad8', '불·얼음·번개의 원소 마법'] };
  const REACT = { normal: ['idle', 0.5, null], think: ['idle', 1.0, 'think'], correct: ['victory', 0.55, 'correct'], wrong: ['hit', 0.07, 'wrong'] };
  for (const [key, [name, color, desc]] of Object.entries(HEROES)) {
    for (const [r, [clip, t, emote]] of Object.entries(REACT)) save(`ui/portraits/${key}_${r}.png`, await compose('portrait', [await render('characters', key, { w: 256, h: 256, clip, t, cam: 'head' })], { color, emote }));
    save(`ui/select/card_${key}.png`, await compose('card', [await render('characters', key, { w: 400, h: 480, clip: 'idle', t: 0.5, cam: 'fit', fov: 28 })], { color, name, desc }));
    save(`ui/select/art_${key}.png`, await render('characters', key, { w: 1024, h: 1024, clip: 'victory', t: 0.55, cam: 'fit' }));
  }
  for (const key of ['npcMerchant', 'npcBlacksmith', 'npcStorekeeper', 'npcArchivist', 'npcChief']) save(`ui/portraits/${key}.png`, await compose('portrait', [await render('characters', key, { w: 256, h: 256, clip: 'idle', t: 0.5, cam: 'head' })], { color: '#c8803a' }));
  for (const [key, cam] of Object.entries({ oldroot: [1.2, 1.9, 3.4, 0, 1.6, 0], forbiddenLord: [0.8, 2.6, 3.2, 0, 2.4, 0], timeKeeper: [0.8, 2.3, 3.2, 0, 2.1, 0], oblivionSource: [1.2, 2.4, 4.4, 0, 2.0, 0] })) save(`ui/portraits/boss_${key}.png`, await compose('portrait', [await render('bosses', key, { w: 256, h: 256, clip: 'idle', t: 0.3, cam })], { color: '#8a2a4a' }));
  for (const f of ['default', 'think', 'happy', 'sad', 'surprised', 'cheer']) save(`ui/mascot/lumi_${f}.png`, await render('characters', 'lumi', { w: 256, h: 256, clip: `face_${f}`, t: 0.3, cam: [0, 0.5, 1.3, 0, 0.36, 0] }));

  // skill icons (48 and 96)
  const skills = await v.evaluate(() => Object.fromEntries(Object.entries(window.__eduManifest().skills).map(([k, e]) => [k, Object.keys(e.clips)])));
  const CLS = { knight: '#3a8aff', hunter: '#4ac86a', sage: '#b48aff' };
  for (const [key, clips] of Object.entries(skills)) {
    const cls = key.split('_')[1];
    const clip = clips.includes('play') ? 'play' : 'fly';
    const img = await render('skills', key, { w: 192, h: 192, clip, t: clip === 'play' ? 0.4 : 0.2, cam: 'fit', fov: 34 });
    for (const s of [48, 96]) save(`icons/skills/${key}${s === 96 ? '@2x' : ''}.png`, await compose('skillIcon', [img], { color: CLS[cls], border: CLS[cls], size: s }));
  }

  // title + loading screens (no stage tiles: those come from Polyfork kits; only our props and characters)
  const P = (key, pos, rotY = 0, scale) => ({ cat: 'props', key, pos, rotY, scale });
  const M = (cat, key, pos, rotY = 0, clip = 'idle', t = 0.3) => ({ cat, key, pos, rotY, clip, t });
  const titleShot = await scene([
    P('stage1_tree_01', [-4.5, 0, -3]), P('stage1_tree_02', [4.8, 0, -2.5]), P('stage1_tree_02', [-6.5, 0, 0.5]), P('stage1_lantern_post', [-2.6, 0, -0.8], 0.3), P('stage1_lantern_post', [3, 0, -0.5], 2.6), P('stage1_mushroom_glow', [1.8, 0, 1.2]),
    M('characters', 'warrior', [0, 0, 0.6], 0, 'victory', 0.7), M('characters', 'starHunter', [-1.4, 0, 0.2], 0.25), M('characters', 'sage', [1.4, 0, 0.2], -0.25), M('characters', 'lumi', [0.55, 1.75, 0.5], -0.2, 'fly', 0.1),
    M('monsters', 'inkSlime', [-2.6, 0, 2], 0.6), M('monsters', 'fireflySpirit', [2.8, 0, 1.8], -0.6),
  ], { cam: [0, 1.6, 7.4, 0, 1.6, 0], sky: '#1a2f44', ground: '#2f6a46', fog: [7, 22], lights: [{ pos: [-2.3, 1.3, -0.8], color: '#ffc36a', intensity: 6, range: 6 }, { pos: [2.7, 1.3, -0.5], color: '#ffc36a', intensity: 6, range: 6 }] });
  const logo = 'data:image/png;base64,' + fs.readFileSync(path.join(out, 'public/ui/title/logo.png')).toString('base64');
  save('ui/title/title_background.png', titleShot);
  save('ui/title/title_screen.png', await compose('title', [titleShot, logo], {}));
  const LOAD = {
    village: ['등불 마을', '따뜻한 등불 아래에서 쉬어 가세요', '#2a2a44', '#5a7a4a', [M('characters', 'npcChief', [0, 0, 0], 0, 'wave', 0.6), M('characters', 'npcMerchant', [-1.6, 0, -0.5], 0.3), M('characters', 'npcBlacksmith', [1.6, 0, -0.5], -0.3), M('characters', 'lumi', [0.8, 0, 1.2], -0.3), P('stage1_lantern_post', [-3, 0, -1]), P('stage1_lantern_post', [3, 0, -1], 3)]],
    forest: ['속삭이는 숲', '1~5층 · 잉크 슬라임을 조심하세요', '#1d3a40', '#3f7a4a', [M('bosses', 'oldroot', [0, 0, -2.5], 0), M('monsters', 'inkSlime', [-1.8, 0, 0.5], 0.4), M('monsters', 'acornSoldier', [1.6, 0, 0.6], -0.4), M('monsters', 'fireflySpirit', [-0.4, 0, 1.2]), P('stage1_tree_02', [-4, 0, -2]), P('stage1_tree_01', [4, 0, -2.5])]],
    library: ['무너진 대도서관', '6~10층 · 날아다니는 마법서', '#2a2238', '#6a5a4a', [M('bosses', 'forbiddenLord', [0, 0, -2.5], 0), M('monsters', 'bookworm', [-1.8, 0, 0.6], 0.5), M('monsters', 'grimoire', [1.6, 0, 0.4], -0.4, 'fly'), M('monsters', 'inkGolem', [-3, 0, -0.8], 0.4)]],
    clocktower: ['얼어붙은 시계탑', '11~15층 · 시간이 멈춘 곳', '#22384a', '#8aa8b8', [M('bosses', 'timeKeeper', [0, 0, -2.5], 0), M('monsters', 'clockMouse', [-1.6, 0, 0.8], 0.5), M('monsters', 'snowGuard', [1.8, 0, 0.2], -0.4), M('monsters', 'pendulumBat', [-0.4, 0, 0.8], 0, 'fly')]],
    abyss: ['망각의 심연', '16~20층 · 모든 지식이 사라지는 곳', '#160e24', '#2a1a3a', [M('bosses', 'oblivionSource', [0, 0, -3], 0), M('monsters', 'shadowEcho', [-1.8, 0, 0.6], 0.4), M('monsters', 'erasedKnight', [1.8, 0, 0.2], -0.4), M('monsters', 'oblivionEye', [-0.2, 0, 0.6], 0, 'fly')]],
  };
  for (const [k, [title, sub, sky, ground, items]] of Object.entries(LOAD)) {
    const shot = await scene(items, { cam: [0, 2.2, 7.8, 0, 1.6, -0.8], sky, ground, fog: [8, 24], lights: [{ pos: [0, 3, 2], color: '#ffe8c0', intensity: 4, range: 10 }] });
    save(`ui/loading/loading_${k}.png`, await compose('loading', [shot], { title, sub }));
  }
  fs.writeFileSync(path.join(out, 'art-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log('art', manifest.length, 'errors', JSON.stringify(errs));
  await b.close();
})();
