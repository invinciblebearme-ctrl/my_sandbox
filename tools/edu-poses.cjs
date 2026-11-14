// node edu-poses.cjs <outPng> <cat> <key> clip:time[,clip:time...] [camX,camY,camZ,tX,tY,tZ]
// renders a row of poses of one model into a single PNG
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
(async () => {
  const [out, cat, key, list, cam = '1.6,1.5,3.0,0,0.85,0'] = process.argv.slice(2);
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader'] });
  const pg = await b.newPage({ viewport: { width: 700, height: 800 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('http://localhost:4173/');
  await pg.waitForTimeout(600);
  await pg.evaluate(([cat, key, cam]) => { document.querySelector('.lil-gui').style.display = 'none'; window.__view.animate = false; window.__select('edu', key, cat); window.__camera(...cam.split(',').map(Number)); }, [cat, key, cam]);
  const files = [];
  for (const [i, item] of list.split(',').entries()) {
    const [clip, t] = item.split(':');
    await pg.evaluate(([clip, t]) => { window.__view.animation = `clip:${clip}`; window.__setTime(Number(t)); }, [clip, t]);
    await pg.waitForTimeout(350);
    const f = `${out}.${i}.png`;
    await pg.screenshot({ path: f });
    files.push(f);
  }
  await b.close();
  execFileSync('python3', ['-c', `
import sys
from PIL import Image
fs=sys.argv[2:]; ims=[Image.open(f).resize((350,400)) for f in fs]
W=Image.new('RGB',(350*len(ims),400))
for i,im in enumerate(ims): W.paste(im,(i*350,0))
W.save(sys.argv[1])
import os
[os.remove(f) for f in fs]`, out, ...files]);
  console.log('errors', JSON.stringify(errs));
})();
