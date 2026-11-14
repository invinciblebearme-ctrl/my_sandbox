const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader'] });
  const pg = await b.newPage();
  const errs = []; pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await pg.goto('http://localhost:4173/');
  await pg.waitForTimeout(800);
  const man = await pg.evaluate(() => window.__eduManifest());
  fs.writeFileSync(process.argv[2], JSON.stringify(man, null, 2));
  for (const [c, e] of Object.entries(man)) for (const [k, v] of Object.entries(e)) console.log(c.padEnd(10), k.padEnd(26), String(v.triangles).padStart(5), Object.keys(v.clips).join(','));
  console.log('errors', JSON.stringify(errs));
  await b.close();
})();
