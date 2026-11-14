// node review.cjs <stageDir> <out.png>  (vite preview on :4173) - contact sheet + sizes of GLBs
const { chromium } = require('playwright');
const fs = require('fs'); const path = require('path');
const { execFileSync } = require('child_process');
(async () => {
  const [dir, out] = process.argv.slice(2);
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader'] });
  const pg = await b.newPage();
  await pg.goto('http://localhost:4173/'); await pg.waitForTimeout(600);
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.glb')).sort();
  const tiles = []; const sizes = {};
  for (const f of files) {
    const r = await pg.evaluate((b64) => window.__renderGLB(b64, { w: 200, h: 200 }), fs.readFileSync(path.join(dir, f)).toString('base64'));
    const t = `${out}.${tiles.length}.png`; fs.writeFileSync(t, Buffer.from(r.png.split(',')[1], 'base64')); tiles.push(t); sizes[f] = { size: r.size, min: r.min };
  }
  await b.close();
  fs.writeFileSync(out.replace(/\.png$/, '.json'), JSON.stringify(sizes, null, 1));
  execFileSync('python3', ['-c', `
import sys, os
from PIL import Image, ImageDraw
out, names = sys.argv[1], sys.argv[2].split(',')
fs = sys.argv[3:]; cols = 8; rows = (len(fs) + cols - 1) // cols
W = Image.new('RGB', (200 * cols, 214 * rows), (40, 48, 60)); d = ImageDraw.Draw(W)
for i, f in enumerate(fs):
    W.paste(Image.open(f), ((i % cols) * 200, (i // cols) * 214)); d.text(((i % cols) * 200 + 3, (i // cols) * 214 + 200), names[i][:32], fill=(230, 230, 230)); os.remove(f)
W.save(out)`, out, files.map((f) => f.replace('.glb', '')).join(','), ...tiles]);
  console.log(files.length);
})();
