// node edu-export.cjs <outRoot>  -> <outRoot>/public/models/..., public/icons/items/*.png, manifest.json
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
(async () => {
  const out = process.argv[2];
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader'] });
  const pg = await b.newPage();
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('http://localhost:4173/');
  await pg.waitForTimeout(800);
  const man = await pg.evaluate(() => window.__eduManifest());
  let n = 0;
  for (const [cat, entries] of Object.entries(man)) {
    for (const [key, e] of Object.entries(entries)) {
      const file = path.join(out, 'public/models', e.file);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      const b64 = await pg.evaluate(async ([cat, key]) => {
        const bytes = new Uint8Array(await window.__exportEdu(cat, key));
        let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
        return btoa(s);
      }, [cat, key]);
      fs.writeFileSync(file, Buffer.from(b64, 'base64'));
      n++;
      if (e.icon) {
        const icon = path.join(out, 'public', e.icon);
        fs.mkdirSync(path.dirname(icon), { recursive: true });
        const url = await pg.evaluate(([cat, key]) => window.__icon(cat, key, 128), [cat, key]);
        fs.writeFileSync(icon, Buffer.from(url.split(',')[1], 'base64'));
      }
    }
  }
  fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(man, null, 2) + '\n');
  console.log('glb', n, 'errors', JSON.stringify(errs));
  await b.close();
})();
