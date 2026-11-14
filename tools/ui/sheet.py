# python3 tools/ui/sheet.py <dir> <out.png> [filter]  - contact sheet of PNGs (frame strips shown whole)
import sys, glob, os
from PIL import Image, ImageDraw
d, out = sys.argv[1], sys.argv[2]
flt = sys.argv[3] if len(sys.argv) > 3 else ''
fs = sorted(f for f in glob.glob(os.path.join(d, '**/*.png'), recursive=True) if flt in f)
T = 200
cols = 8
rows = (len(fs) + cols - 1) // cols
W = Image.new('RGB', (cols * T, rows * (T + 14)), (58, 66, 80))
dr = ImageDraw.Draw(W)
for i, f in enumerate(fs):
    im = Image.open(f).convert('RGBA')
    im.thumbnail((T - 8, T - 8))
    x, y = (i % cols) * T, (i // cols) * (T + 14)
    W.paste(im, (x + (T - im.width) // 2, y + (T - im.height) // 2), im)
    dr.text((x + 3, y + T), os.path.basename(f)[:30], fill=(220, 220, 220))
W.save(out)
print(len(fs))
