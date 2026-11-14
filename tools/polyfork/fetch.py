# python3 tools/polyfork/fetch.py [outRoot=models/edu]
# Downloads the picked Polyfork parts (free low poly GLBs, no key needed) to
#   <out>/public/models/props/stage<N>/<slug>.glb  and writes <out>/polyfork-manifest.json
# with the source id, kit, triangles, size and the CC BY credit line of every file.
import json, os, re, sys, time, urllib.request
OUT = sys.argv[1] if len(sys.argv) > 1 else 'models/edu'
API = 'https://polyfork.dev'
sel = json.load(open(os.path.join(os.path.dirname(__file__), 'select.json')))
def get(url, binary=False):
    for attempt in range(4):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'edu-arpg-asset-fetch'}), timeout=60) as r:
                data = r.read()
                return data if binary else json.loads(data)
        except Exception as e:
            if attempt == 3: raise
            time.sleep(2 ** attempt)
slug = lambda s: re.sub(r'[^a-z0-9]+', '_', s.lower()).strip('_')
kits = {}
manifest = {}
missing = []
for stage, spec in sel.items():
    if stage.startswith('_'): continue
    rows = []
    for kit, titles in spec['kits'].items():
        if kit == '_assets':
            for aid in titles: rows.append(get(f'{API}/api/assets/{aid}'))
            continue
        kits.setdefault(kit, get(f'{API}/api/kits/{kit}'))
        by_title = {p['title']: p for p in kits[kit]['parts']}
        for t in titles:
            if t in by_title: rows.append(by_title[t])
            else: missing.append(f'{stage}: {kit} / {t}')
    for r in rows:
        a = r.get('asset', r)
        aid = a['id']
        name = f"{stage}_{slug(a['title'])}"
        rel = f'models/props/{stage}/{name}.glb'
        path = os.path.join(OUT, 'public', rel)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        if not os.path.exists(path):
            open(path, 'wb').write(get(f'{API}/cdn/{aid}.glb', binary=True))
        detail = a if 'credit' in a else get(f'{API}/api/assets/{aid}')
        detail = detail.get('asset', detail)
        manifest[name] = {
            'stage': stage, 'stageLabel': spec['label'], 'title': a['title'], 'file': rel, 'polyforkId': aid,
            'kit': a.get('kit'), 'triangles': a.get('triangles'), 'size_m': detail.get('size_m'),
            'origin_y': detail.get('origin_y'), 'credit': detail.get('credit'), 'page': f'{API}/asset/{aid}',
        }
        print(stage, name, a.get('triangles'))
json.dump({'license': 'Polyfork free low poly mesh files: CC BY 4.0 with the credit line, or the Polyfork licence (no credit, files not redistributed). https://polyfork.dev/licensing', 'assets': manifest}, open(os.path.join(OUT, 'polyfork-manifest.json'), 'w'), ensure_ascii=False, indent=2)
print('files', len(manifest), 'missing', missing)
