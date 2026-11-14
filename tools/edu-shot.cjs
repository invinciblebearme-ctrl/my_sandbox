// node edu-shot.cjs <outDir>
const { chromium } = require('playwright');
(async () => {
  const out = process.argv[2];
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader'] });
  const pg = await b.newPage({ viewport: { width: 1400, height: 800 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('http://localhost:4173/');
  await pg.waitForTimeout(600);
  await pg.evaluate(() => { document.querySelector('.lil-gui').style.display = 'none'; window.__view.animate = false; });
  const shot = async (name, fn, t = 0.3, arg) => {
    await pg.evaluate(fn, arg);
    await pg.evaluate((t) => window.__setTime(t), t);
    await pg.waitForTimeout(500);
    await pg.screenshot({ path: `${out}/${name}.png` });
  };
  await shot('monsters', () => { window.__select('edu', 'inkSlime', 'monsters'); window.__view.animation = 'clip:idle'; window.__gallery(true); window.__camera(0, 1.3, 4.6, 0, 0.6, 0); });
  await shot('items', () => { window.__select('edu', 'weapon_sword_t1', 'items'); window.__view.animation = 'clip:idle'; window.__gallery(true); window.__camera(0, 3.2, 4.2, 0, 0, -1.2); });
  await shot('props', () => { window.__select('edu', 'stage1_floor_01', 'props'); window.__view.animation = 'clip:idle'; window.__gallery(true); window.__camera(0, 6.5, 7.5, 0, 0, -2.6); });
  await shot('vfx', () => { window.__select('edu', 'fx_hit_spark', 'vfx'); window.__view.animation = 'clip:play'; window.__gallery(true); window.__camera(0, 1.8, 7, 0, 0.9, 0); }, 0.25);
  await pg.evaluate(() => window.__gallery(false));
  const poses = { idle: 0.5, walk: 0.2, attack: 0.18, cast: 0.45, hit: 0.07, death: 0.9, drink: 0.6, victory: 0.4 };
  for (const [c, t] of Object.entries(poses)) await shot(`warrior-${c}`, (c) => { window.__select('edu', 'warrior', 'characters'); window.__view.animation = `clip:${c}`; window.__camera(1.6, 1.5, 3.0, 0, 0.85, 0); }, t, c).catch(e => errs.push(e.message));
  const mon = { inkSlime: ['attack', 0.5], acornSoldier: ['attack', 0.5], fireflySpirit: ['attack', 0.38] };
  for (const [m, [c, t]] of Object.entries(mon)) for (const [cc, tt] of [[c, t], ['death', 0.55], ['walk', 0.4]]) {
    await shot(`m-${m}-${cc}`, ([m, cc]) => { window.__select('edu', m, 'monsters'); window.__view.animation = `clip:${cc}`; window.__camera(1.4, 1.2, 2.4, 0, 0.5, 0); }, tt * 0.9 * ({ attack: 0.8, death: 1.2, walk: 0.7 }[cc] ?? 1), [m, cc]);
  }
  console.log('errors', JSON.stringify(errs));
  await b.close();
})();
