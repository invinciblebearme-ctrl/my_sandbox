// node edu-sheet.cjs <outPng> <cat> [cols] [camX,camY,camZ,tX,tY,tZ]
// one tile per item of an edu category, each at the middle of its main clip
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
(async () => {
  const [out, cat, cols = '6', cam = '2.6,2.4,4.2,0,0.8,0'] = process.argv.slice(2);
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader'] });
  const pg = await b.newPage({ viewport: { width: 500, height: 420 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('http://localhost:4173/');
  await pg.waitForTimeout(600);
  const keys = await pg.evaluate((cat) => window.__eduList()[cat], cat);
  const files = [];
  for (const [i, key] of keys.entries()) {
    const t = await pg.evaluate(([cat, key, cam]) => {
      document.querySelector('.lil-gui').style.display = 'none';
      window.__view.animate = false;
      window.__select('edu', key, cat);
      const clips = window.__monster.userData.clips;
      const clip = ['play', 'fly', 'attack', 'idle'].find((c) => clips[c]) ?? Object.keys(clips)[0];
      window.__view.animation = `clip:${clip}`;
      window.__camera(...cam.split(',').map(Number));
      const a = window.__monster.userData.animations[clips[clip]];
      window.__setTime(a.duration * 0.45);
      return clip;
    }, [cat, key, cam]);
    await pg.waitForTimeout(250);
    const f = `${out}.${i}.png`;
    await pg.screenshot({ path: f });
    files.push(f);
  }
  await b.close();
  execFileSync('python3', ['-c', `
import sys, os
from PIL import Image, ImageDraw
out, cols, names = sys.argv[1], int(sys.argv[2]), sys.argv[3].split(',')
fs = sys.argv[4:]
ims = [Image.open(f).resize((250, 210)) for f in fs]
rows = (len(ims) + cols - 1) // cols
W = Image.new('RGB', (250 * cols, 210 * rows))
for i, im in enumerate(ims):
    ImageDraw.Draw(im).text((6, 6), names[i], fill=(255, 255, 255))
    W.paste(im, ((i % cols) * 250, (i // cols) * 210))
W.save(out)
[os.remove(f) for f in fs]`, out, cols, keys.join(','), ...files]);
  console.log('errors', JSON.stringify(errs));
})();
