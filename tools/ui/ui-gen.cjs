// node tools/ui/ui-gen.cjs [outRoot=models/edu]  -> <out>/public/ui/**.png + <out>/ui-manifest.json
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
(async () => {
  const out = process.argv[2] ?? 'models/edu';
  const b = await chromium.launch();
  const pg = await b.newPage();
  const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await pg.goto('file://' + path.resolve(__dirname, 'gen.html'));
  await pg.evaluate(async () => { await document.fonts.ready; });
  const fonts = await pg.evaluate(() => [...document.fonts].map((f) => `${f.family}:${f.weight}:${f.status}`));
  const n = await pg.evaluate(() => window.ASSETS.length);
  for (let i = 0; i < n; i++) {
    const [p, url] = await pg.evaluate((i) => [window.ASSETS[i].path, window.render(i)], i);
    const file = path.join(out, 'public/ui', p);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, Buffer.from(url.split(',')[1], 'base64'));
  }
  fs.writeFileSync(path.join(out, 'ui-manifest.json'), JSON.stringify(await pg.evaluate(() => window.manifest()), null, 2) + '\n');
  console.log('ui assets', n, 'fonts', fonts.join(' '), 'errors', JSON.stringify(errs));
  await b.close();
})();
