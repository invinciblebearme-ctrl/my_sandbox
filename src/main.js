import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import GUI from 'lil-gui';
import { THEMES } from './themes/index.js';
import { PLAYERS } from './player/index.js';
import { MAGIC_ITEMS, MAGIC_EFFECTS } from './magic/index.js';
import { CAST_RELEASE } from './player/animations.js';
import { WUXIA_EFFECTS, PALM_SKILLS } from './wuxia/index.js';
import { createKit } from './core/kit.js';
import { setPose, resetPose, bakeClips, disposeMonster, STANDARD_CLIPS, clamp01 } from './core/monster.js';

// ---- Scene ------------------------------------------------------------------
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog('#000', 6, 16);
const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.1, 200);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

const hemi = new THREE.HemisphereLight();
const sun = new THREE.DirectionalLight();
sun.position.set(3, 6, 4);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6 });
const rim = new THREE.DirectionalLight();
rim.position.set(-3, 2, -4);
scene.add(hemi, sun, rim);

const groundGeo = new THREE.CircleGeometry(12, 28);
groundGeo.rotateX(-Math.PI / 2);
const gp = groundGeo.attributes.position;
for (let i = 1; i < gp.count; i++) gp.setY(i, Math.abs(Math.sin(i * 12.9898) * 43758.5453 % 1) * 0.08);
groundGeo.computeVertexNormals();
const ground = new THREE.Mesh(groundGeo, new THREE.MeshStandardMaterial({ flatShading: true }));
ground.receiveShadow = true;
scene.add(ground);

const props = new THREE.Group(); // simple placeholder scenery per theme
scene.add(props);
const kitHolder = new THREE.Group(); // optional Polyfork kit (public/kits/*.glb)
scene.add(kitHolder);

// ---- State --------------------------------------------------------------------
const view = {
  theme: Object.keys(THEMES)[0],
  monster: '',
  animation: 'clip:move',
  animate: true,
  speed: 1,
  gallery: false,
  kitVisible: true,
  kitScale: 1,
  kitY: 0,
  horror: 0.9, // 0 = cute .. 1 = creepy (0.75+ matches the zombies), applies to every monster and the scenery
  category: 'monsters', // 'monsters' | 'items' | 'players'
  heldItem: '', // players: key of an item of the current theme to hold in the right hand
};
let params = {};
let current = null;
let gallery = [];
const theme = () => THEMES[view.theme];
const horrorOf = () => theme().env.horror ?? view.horror; // the edu set is always cute
// magic items are shared by every stage: listed with each theme's own items
const allItems = (t = view.theme) => (THEMES[t]?.standalone ? THEMES[t].items : { ...(THEMES[t]?.items ?? {}), ...MAGIC_ITEMS });
const entries = () => (view.category === 'players' ? PLAYERS
  : view.category === 'items' ? (theme().standalone ? allItems() : { ...allItems(), ...MAGIC_EFFECTS, ...WUXIA_EFFECTS }) : theme()[view.category] ?? {});
const def = () => entries()[view.monster];

function build(d, p) {
  const m = d.build({ ...p, horror: view.horror });
  m.traverse((o) => { if (o.isMesh) o.castShadow = o.receiveShadow = true; });
  return m;
}

const heldInfo = () => {
  const d = allItems()[view.heldItem];
  return d ? build(d, { ...d.defaults }).userData.itemInfo : null;
};
// Puts an item (from a theme's item list) into the player's right hand.
function holdItem(player, themeKey, itemKey) {
  const d = allItems(themeKey)[itemKey];
  if (!d) return null;
  const obj = build(d, { ...d.defaults });
  const node = obj.userData.rig.item;
  node.removeFromParent();
  node.position.set(0, 0, 0);
  node.rotation.set(0, 0, 0);
  node.name = 'heldItem';
  player.userData.rig.arms.R.grip.add(node);
  disposeMonster(obj); // only the leftover pickup ring is still in it
  return obj.userData.itemInfo;
}

function rebuild() {
  if (current) { scene.remove(current); disposeMonster(current); }
  current = build(def(), params);
  if (view.category === 'players' && view.heldItem) holdItem(current, view.theme, view.heldItem);
  current.visible = !view.gallery;
  scene.add(current);
  window.__monster = current;
}

function setGallery(on) {
  gallery.forEach((m) => { scene.remove(m); disposeMonster(m); });
  gallery = [];
  if (current) current.visible = !on;
  props.visible = !(on && theme().standalone); // edu galleries: no scenery in the way
  if (on) {
    const list = Object.values(entries());
    const items = view.category === 'items'; // items are small: line them up closer
    list.forEach((d, i) => {
      const m = build(d, { ...d.defaults });
      if (view.category === 'players') {
        // each outfit holds the ranged weapon of its own theme (or its own item)
        const themeItems = THEMES[d.theme]?.items ?? {};
        const gun = d.holds ?? Object.keys(themeItems).find((key) => build(themeItems[key], { ...themeItems[key].defaults }).userData.itemInfo.kind === 'ranged');
        if (gun) holdItem(m, d.theme, gun);
      }
      if (list.length > 12) { // long lists (edu tiles, items): a grid of rows going back
        const cols = 8;
        const gap = items ? 0.8 : 1.6;
        m.position.set((i % cols - (cols - 1) / 2) * gap, 0, -Math.floor(i / cols) * gap);
      } else {
        const x = i - (list.length - 1) / 2;
        m.position.set(x * (items ? 0.9 : 1.45), 0, -Math.abs(x) * (items ? 0 : 0.3));
        m.rotation.y = -x * 0.08;
      }
      scene.add(m);
      gallery.push(m);
    });
    if (items) {
      camera.position.set(0, 0.8, 3.0);
      controls.target.set(0, 0.32, 0);
    } else {
      camera.position.set(1.1, 1.9, 9.2);
      controls.target.set(1.1, 0.7, 0);
    }
  } else {
    camera.position.set(2.2, 1.6, 3.6);
    controls.target.set(0, 0.7, 0);
  }
  applyFog();
}

function applyFog() {
  const [near, far] = theme().env.fog;
  const close = 1 - horrorOf() * 0.45; // thicker fog at night
  scene.fog.near = (view.gallery ? near + 5 : near) * close;
  scene.fog.far = (view.gallery ? far + 8 : far) * close;
}

const loader = new GLTFLoader();
let kitToken = 0;
async function loadKit() {
  const token = ++kitToken;
  kitHolder.clear();
  props.visible = true;
  const file = theme().env.kit;
  if (!file) return;
  try {
    const gltf = await loader.loadAsync(file); // fails quietly when the file is not there
    if (token !== kitToken) return;
    gltf.scene.traverse((o) => { if (o.isMesh) o.castShadow = o.receiveShadow = true; });
    kitHolder.add(gltf.scene);
    props.visible = false;
    console.info(`kit loaded: ${file}`);
  } catch {
    console.info(`kit not found (${file}), using placeholder scenery`);
  }
}

// Theme lighting, pushed toward a moonlit night as the horror level goes up.
function applyLighting() {
  const env = theme().env;
  const h = horrorOf();
  const night = (c, target, amount) => new THREE.Color(c).lerp(new THREE.Color(target), amount);
  const sky = night(env.sky, '#141826', h * 0.85);
  scene.background = sky;
  scene.fog.color.copy(sky);
  ground.material.color.copy(night(env.ground, '#1c2220', h * 0.6));
  hemi.color.copy(night(env.hemi[0], '#8f9cc4', h));
  hemi.groundColor.copy(night(env.hemi[1], '#1a1420', h));
  hemi.intensity = env.hemi[2] * (1 - 0.45 * h);
  sun.color.copy(night(env.sun[0], '#b3c4ff', h));
  sun.intensity = env.sun[1] * (1 - 0.4 * h);
  rim.color.copy(night(env.rim[0], '#8a5cff', h));
  rim.intensity = env.rim[1] + h * 1.2; // eerie back light keeps silhouettes readable
  applyFog();
}

function applyTheme() {
  const env = theme().env;
  applyLighting();
  props.traverse((o) => { if (o.isMesh) o.geometry.dispose(); });
  props.clear();
  env.props?.(createKit(1, 1, horrorOf()), props);
  loadKit();
}

// ---- GUI ----------------------------------------------------------------------
const gui = new GUI({ title: 'Monsters 👾' });
let categoryCtrl;
let monsterCtrl;
let animCtrl;
let paramFolder;

function animOptions() {
  const d = def();
  const sample = d.build({ ...d.defaults }); // read clip map + animation list
  const { clips, animations } = sample.userData;
  disposeMonster(sample);
  const opts = {};
  const names = [...STANDARD_CLIPS, ...Object.keys(clips).filter((c) => !STANDARD_CLIPS.includes(c))];
  for (const c of names) if (clips[c]) opts[`⭐ ${c} · ${animations[clips[c]].label}`] = `clip:${c}`;
  for (const [key, a] of Object.entries(animations)) opts[`${key} · ${a.label}`] = `anim:${key}`;
  return opts;
}

function selectMonster(key) {
  view.monster = key;
  params = structuredClone(def().defaults);
  heldCtrl?.destroy();
  heldCtrl = null;
  if (view.category === 'players') {
    const items = allItems();
    if (def().holds) view.heldItem = def().holds; // e.g. the wizard starts with the staff
    const opts = { '없음': '', ...Object.fromEntries(Object.entries(items).map(([k, d]) => [`${d.role} ${d.label}`, k])) };
    if (!(view.heldItem in items)) view.heldItem = '';
    heldCtrl = gui.add(view, 'heldItem', opts).name('들고 있는 아이템').onChange(() => {
      rebuild();
      const info = heldInfo();
      view.animation = `clip:${info ? info.player.use : 'idle'}`;
      animCtrl.updateDisplay();
    });
    heldCtrl.domElement.parentElement.insertBefore(heldCtrl.domElement, monsterCtrl.domElement.nextSibling);
  }
  rebuild();
  const firstClip = Object.keys(current.userData.clips)[0];
  view.animation = `clip:${current.userData.clips.move ? 'move' : current.userData.clips.idle ? 'idle' : firstClip}`;
  if (view.category === 'players' && def().holds) view.animation = `clip:${heldInfo()?.player.use ?? 'idle'}`;
  animCtrl?.destroy();
  animCtrl = gui.add(view, 'animation', animOptions()).name('애니메이션');
  animCtrl.domElement.parentElement.insertBefore(animCtrl.domElement, monsterCtrl.domElement.nextSibling);
  paramFolder?.destroy();
  paramFolder = gui.addFolder('모양 · 색상');
  for (const [k, s] of Object.entries(def().schema)) {
    const v = params[k];
    let c;
    if (s.options) c = paramFolder.add(params, k, s.options);
    else if (typeof v === 'string' && v.startsWith('#')) c = paramFolder.addColor(params, k);
    else if (typeof v === 'boolean') c = paramFolder.add(params, k);
    else c = paramFolder.add(params, k, s.min, s.max, s.step);
    c.name(s.label).onChange(rebuild);
  }
  if (view.gallery) setGallery(true);
}

function selectTheme(key) {
  view.theme = key;
  if (!Object.keys(entries()).length || (theme().standalone && view.category === 'players')) { view.category = 'monsters'; categoryCtrl?.updateDisplay(); }
  const keys = Object.keys(entries());
  const opts = Object.fromEntries(keys.map((k) => [`${entries()[k].role} ${entries()[k].label}`, k]));
  monsterCtrl?.destroy();
  monsterCtrl = gui.add(view, 'monster', opts).name({ items: '아이템', players: '캐릭터', characters: '캐릭터', props: '타일·소품', vfx: '효과' }[view.category] ?? '괴물').onChange(selectMonster);
  monsterCtrl.domElement.parentElement.insertBefore(monsterCtrl.domElement, categoryCtrl.domElement.nextSibling);
  applyTheme();
  selectMonster(keys[0]);
  monsterCtrl.updateDisplay();
}

const themeOpts = Object.fromEntries(Object.entries(THEMES).map(([k, t]) => [t.label, k]));
const themeCtrl = gui.add(view, 'theme', themeOpts).name('테마').onChange(selectTheme);
categoryCtrl = gui.add(view, 'category', { '괴물': 'monsters', '플레이어 아이템': 'items', '플레이어 캐릭터': 'players', '[교육 ARPG] 캐릭터': 'characters', '[교육 ARPG] 타일·소품': 'props', '[교육 ARPG] 효과': 'vfx' }).name('종류')
  .onChange(() => selectTheme(view.theme));
let heldCtrl;
gui.add(view, 'animate').name('재생');
gui.add(view, 'speed', 0.1, 2, 0.05).name('속도');
gui.add(view, 'gallery').name('테마 전체 보기').onChange(setGallery);
gui.add(view, 'horror', 0, 1, 0.05).name('공포도 (0 귀여움 · 1 무서움)').onFinishChange(() => {
  applyTheme();
  rebuild();
  if (view.gallery) setGallery(true);
});

// GLB with the standard clips (idle, move, attack, hit, death, special).
function exportGLB(obj, filename) {
  const clips = bakeClips(obj);
  // a player's held item is a separate GLB: leave it out of the player file
  const held = obj.getObjectByName('heldItem');
  const heldParent = held?.parent;
  held?.removeFromParent();
  const restoreHeld = () => heldParent?.add(held);
  // userData would be written into the GLB as "extras" (the whole rig as JSON): leave it out
  const userData = obj.userData;
  obj.userData = {};
  return new Promise((resolve, reject) => {
    new GLTFExporter().parse(obj, (glb) => {
      obj.userData = userData;
      restoreHeld();
      if (filename) {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([glb], { type: 'model/gltf-binary' }));
        a.download = filename;
        a.click();
        URL.revokeObjectURL(a.href);
      }
      resolve(glb);
    }, (err) => { obj.userData = userData; restoreHeld(); reject(err); }, { binary: true, animations: clips });
  });
}
const actions = {
  exportGLB: () => exportGLB(current, view.category === 'players' ? `player-${view.monster}.glb`
    : `${view.theme}-${view.category === 'items' ? 'item-' : ''}${view.monster}.glb`),
  copyParams: () => navigator.clipboard?.writeText(JSON.stringify(params, null, 2)),
};
gui.add(actions, 'exportGLB').name('💾 GLB 내보내기 (Unity용 클립 포함)');
gui.add(actions, 'copyParams').name('📋 파라미터 복사(JSON)');

const kitFolder = gui.addFolder('배경 키트 (public/kits)');
kitFolder.add(view, 'kitVisible').name('키트 보이기').onChange((v) => { kitHolder.visible = v; });
kitFolder.add(view, 'kitScale', 0.05, 5, 0.01).name('키트 크기').onChange((v) => kitHolder.scale.setScalar(v));
kitFolder.add(view, 'kitY', -5, 5, 0.01).name('키트 높이').onChange((v) => { kitHolder.position.y = v; });
kitFolder.close();

selectTheme(view.theme);
setGallery(false);

// hooks for scripts / tests
window.__view = view;
window.__list = () => ({
  ...Object.fromEntries(Object.entries(THEMES).filter(([, th]) => !th.standalone).map(([t, th]) => [t, {
    monsters: Object.keys(th.monsters), items: Object.keys(th.items ?? {}),
  }])),
  magic: { effects: Object.keys(MAGIC_EFFECTS), items: Object.keys(MAGIC_ITEMS) },
  wuxia: { effects: Object.keys(WUXIA_EFFECTS) },
});
window.__players = () => Object.keys(PLAYERS);
window.__camera = (x, y, z, tx, ty, tz) => { camera.position.set(x, y, z); if (tx !== undefined) controls.target.set(tx, ty, tz); controls.update(); };
window.__hold = (itemKey, clip) => { view.heldItem = itemKey; rebuild(); if (clip) view.animation = `clip:${clip}`; };
// item -> player clips, for models/items.json
const manifestOf = (t, items) => Object.fromEntries(Object.entries(items).map(([k, d]) => {
  const info = build(d, { ...d.defaults }).userData.itemInfo;
  return [k, { label: d.label, kind: info.kind, file: `${t}/items/${k}.glb`, playerHold: info.player.hold, playerUse: info.player.use, playerMove: info.player.move }];
}));
window.__itemManifest = () => ({
  ...Object.fromEntries(Object.entries(THEMES).filter(([, th]) => th.items && !th.standalone).map(([t, th]) => [t, manifestOf(t, th.items)])),
  magic: {
    ...manifestOf('magic', MAGIC_ITEMS),
    healingFireball: { label: MAGIC_EFFECTS.healingFireball.label, kind: 'projectile', file: 'magic/healingFireball.glb', spawnAt: 'castPoint', releaseTime: CAST_RELEASE },
  },
  wuxia: {
    dragonPalm: {
      label: WUXIA_EFFECTS.dragonPalm.label, kind: 'projectile', file: 'wuxia/dragonPalm.glb',
      skills: Object.fromEntries(Object.entries(PALM_SKILLS).map(([clip, sk]) => [clip, { label: sk.label, releaseTime: sk.release, spawnAt: sk.from, direction: sk.dir }])),
    },
  },
});
window.__gallery = (on) => { view.gallery = on; setGallery(on); };
window.__select = (t, m, cat = 'monsters') => {
  if (t !== view.theme || cat !== view.category) { view.category = cat; categoryCtrl.updateDisplay(); selectTheme(t); }
  if (m) { selectMonster(m); monsterCtrl.updateDisplay(); }
};
window.__exportGLB = (t, m, cat = 'monsters') => {
  const d = cat === 'players' ? PLAYERS[m] : t === 'magic' || t === 'wuxia' ? { ...MAGIC_ITEMS, ...MAGIC_EFFECTS, ...WUXIA_EFFECTS }[m] : THEMES[t][cat][m];
  return exportGLB(build(d, { ...d.defaults }));
};
// ---- educational ARPG set: list, manifest and item icons --------------------------------
const EDU_CATS = ['characters', 'monsters', 'items', 'props', 'vfx'];
window.__eduList = () => Object.fromEntries(EDU_CATS.map((c) => [c, Object.keys(THEMES.edu[c])]));
window.__eduManifest = () => Object.fromEntries(EDU_CATS.map((c) => [c, Object.fromEntries(Object.entries(THEMES.edu[c]).map(([key, d]) => {
  const o = d.build({ ...d.defaults });
  const { clips, animations, rig } = o.userData;
  let tris = 0;
  o.traverse((m) => { if (m.isMesh) tris += (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3; });
  const entry = {
    label: d.label, file: d.file, triangles: Math.round(tris),
    clips: Object.fromEntries(Object.entries(clips).map(([c, a]) => [c, { seconds: animations[a].duration, loop: animations[a].loop !== false }])),
    parts: Object.keys(rig).filter((n) => rig[n]?.isObject3D),
  };
  if (d.light) entry.light = d.light;
  if (o.userData.eduItem) entry.icon = o.userData.eduItem.icon;
  disposeMonster(o);
  return [key, entry];
}))]));
window.__exportEdu = (cat, key) => { const d = THEMES.edu[cat][key]; return exportGLB(d.build({ ...d.defaults })); };
// Transparent PNG icon of an item (3/4 view, fitted to the frame).
let iconRenderer;
window.__icon = (cat, key, px = 128) => {
  iconRenderer ??= new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  iconRenderer.setPixelRatio(1);
  iconRenderer.setSize(px, px);
  const d = THEMES.edu[cat][key];
  const obj = d.build({ ...d.defaults });
  const s = new THREE.Scene();
  s.add(new THREE.HemisphereLight('#ffffff', '#55606a', 2.2));
  const key1 = new THREE.DirectionalLight('#fff4e0', 2.4); key1.position.set(2, 4, 3); s.add(key1);
  const back = new THREE.DirectionalLight('#9ad0ff', 1.2); back.position.set(-3, 1, -2); s.add(back);
  const item = obj.getObjectByName('item');
  if (item) item.position.y = 0; // no hover offset in the icon
  s.add(obj);
  obj.updateMatrixWorld(true);
  const raw = new THREE.Box3().setFromObject(obj).getSize(new THREE.Vector3());
  if (item && raw.y > 2.5 * Math.max(raw.x, raw.z)) { // long items (swords) lie diagonally, like classic icons
    item.rotation.z = -Math.PI / 4;
    obj.updateMatrixWorld(true);
  }
  const box = new THREE.Box3().setFromObject(obj);
  const center = box.getCenter(new THREE.Vector3());
  const radius = box.getSize(new THREE.Vector3()).length() / 2;
  const cam = new THREE.PerspectiveCamera(30, 1, 0.01, 50);
  const dir = new THREE.Vector3(0.55, 0.45, 1).normalize();
  cam.position.copy(center).addScaledVector(dir, radius / Math.sin((15 * Math.PI) / 180) * 0.92);
  cam.lookAt(center);
  iconRenderer.setClearColor(0x000000, 0);
  iconRenderer.render(s, cam);
  disposeMonster(obj);
  return iconRenderer.domElement.toDataURL('image/png');
};
window.__setHorror = (v) => { view.horror = v; applyTheme(); rebuild(); if (view.gallery) setGallery(true); };

// ---- Skill demo: show the projectile a clip launches (healing fireball, dragon palm) ----
const SKILL_FX = {
  castFireball: { effect: MAGIC_EFFECTS.healingFireball, release: CAST_RELEASE, from: 'castPoint', dir: [0, 0, 1], speed: 7, fly: 0.45 },
  ...Object.fromEntries(Object.entries(PALM_SKILLS).map(([clip, sk]) => [clip,
    { effect: WUXIA_EFFECTS.dragonPalm, release: sk.release, from: sk.from, dir: sk.dir, speed: 6, fly: 0.5 }])),
};
const demos = new Map();
const tmpV = new THREE.Vector3();
const FWD = new THREE.Vector3(0, 0, 1);
function skillDemo(player, animKey, t) {
  const fx = player?.visible ? SKILL_FX[animKey] : null;
  const point = fx && player.getObjectByName(fx.from);
  for (const [effect, obj] of demos) obj.visible = !!point && effect === fx.effect;
  if (!point) return;
  if (!demos.has(fx.effect)) {
    const obj = build(fx.effect, { ...fx.effect.defaults });
    scene.add(obj);
    demos.set(fx.effect, obj);
  }
  const demo = demos.get(fx.effect);
  demo.visible = true;
  const clip = player.userData.animations[animKey];
  const tt = t % (clip.duration + 0.8); // same cycle as the viewer's one-shot playback
  const release = fx.release * clip.duration;
  const { rig, animations } = demo.userData;
  resetPose(demo);
  const lift = demo.children[0].position.y; // effects are lifted inside their GLB
  player.updateMatrixWorld(true);
  const dir = new THREE.Vector3(...fx.dir).normalize().applyQuaternion(player.quaternion);
  if (tt < release) {
    point.getWorldPosition(tmpV);
    animations.charge.apply(rig, clamp01(tt / release));
  } else {
    // launched: keep flying from where the hand was at release
    if (!demo.userData.launch || tt - release < demo.userData.lastT) demo.userData.launch = point.getWorldPosition(new THREE.Vector3());
    demo.userData.lastT = tt - release;
    const fly = Math.min(tt - release, fx.fly);
    tmpV.copy(demo.userData.launch).addScaledVector(dir, fly * fx.speed);
    if (tt - release < fx.fly) animations.fly.apply(rig, ((tt - release) / animations.fly.duration) % 1);
    else animations.impact.apply(rig, clamp01((tt - release - fx.fly) / animations.impact.duration));
  }
  demo.quaternion.setFromUnitVectors(FWD, dir);
  demo.position.copy(tmpV).addScaledVector(new THREE.Vector3(0, -lift, 0).applyQuaternion(demo.quaternion), 1);
}

// ---- Loop -----------------------------------------------------------------------
const clock = new THREE.Clock();
let time = 0;
window.__setTime = (t) => { time = t; };
renderer.setAnimationLoop(() => {
  const dt = clock.getDelta();
  if (view.animate) time += dt * view.speed;
  const [kind, name] = view.animation.split(':');
  // clip:<standard name> -> that monster's animation for it; anim:<key> -> exact animation
  const resolve = (m) => (kind === 'clip' ? m.userData.clips[name] ?? m.userData.clips.move ?? m.userData.clips.idle ?? Object.values(m.userData.clips)[0] : name);
  for (const m of view.gallery ? gallery : [current]) setPose(m, time, resolve(m));
  skillDemo(view.gallery ? null : current, resolve(current), time);
  controls.update();
  renderer.render(scene, camera);
});

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
