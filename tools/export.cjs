// usage: node export.cjs <outDir> [theme...]  -> <out>/<theme>/<monster>.glb, <out>/<theme>/items/<item>.glb
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const [out, ...only] = process.argv.slice(2);
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader'] });
  const pg = await b.newPage();
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('http://localhost:4173/');
  await pg.waitForTimeout(800);
  await pg.evaluate(() => window.__setHorror(0.9));
  const list = await pg.evaluate(() => window.__list());
  for (const [t, cats] of Object.entries(list)) {
    if (only.length && !only.includes(t)) continue;
    for (const [cat, names] of Object.entries(cats)) {
      const dir = cat === 'items' ? `${out}/${t}/items` : `${out}/${t}`;
      if (!names.length) continue;
      fs.mkdirSync(dir, { recursive: true });
      for (const m of names) {
        const b64 = await pg.evaluate(async ([t, m, cat]) => {
          const bytes = new Uint8Array(await window.__exportGLB(t, m, cat));
          let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
          return btoa(s);
        }, [t, m, cat]);
        fs.writeFileSync(`${dir}/${m}.glb`, Buffer.from(b64, 'base64'));
      }
    }
  }
  console.log('errors', JSON.stringify(errs));
  await b.close();
})();
