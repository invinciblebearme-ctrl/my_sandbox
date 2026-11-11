import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import GUI from 'lil-gui';
import { createZombie, setPose, disposeZombie, DEFAULT_PARAMS, PRESETS } from './zombie.js';

// ---- Scene ------------------------------------------------------------------
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#1b2219');
scene.fog = new THREE.Fog('#1b2219', 6, 16);

const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.1, 100);
camera.position.set(2.4, 1.7, 3.4);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1.0, 0);
controls.enableDamping = true;

scene.add(new THREE.HemisphereLight('#b8c9a0', '#2a2018', 1.4));
const moon = new THREE.DirectionalLight('#dfe8ff', 2.2);
moon.position.set(3, 6, 4);
moon.castShadow = true;
moon.shadow.mapSize.set(2048, 2048);
Object.assign(moon.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4 });
scene.add(moon);
const rim = new THREE.DirectionalLight('#8cff6a', 1.0);
rim.position.set(-3, 2, -4);
scene.add(rim);

// low-poly graveyard ground
const groundGeo = new THREE.CircleGeometry(8, 24, 0, Math.PI * 2);
groundGeo.rotateX(-Math.PI / 2);
const gp = groundGeo.attributes.position;
for (let i = 1; i < gp.count; i++) gp.setY(i, (Math.sin(i * 12.9898) * 43758.5453 % 1) * 0.08);
groundGeo.computeVertexNormals();
const ground = new THREE.Mesh(groundGeo, new THREE.MeshStandardMaterial({ color: '#2f3a26', flatShading: true }));
ground.receiveShadow = true;
scene.add(ground);
const stoneMat = new THREE.MeshStandardMaterial({ color: '#6b6e70', flatShading: true });
[[-1.8, -1.6, 0.2], [1.6, -2.2, -0.3], [-0.6, -3.0, 0.1], [2.6, -0.6, 0.5]].forEach(([x, z, r]) => {
  const g = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.8, 0.14), stoneMat);
  g.position.set(x, 0.38, z);
  g.rotation.set(-0.08, r, r * 0.3);
  g.castShadow = g.receiveShadow = true;
  scene.add(g);
});

// ---- Zombie ------------------------------------------------------------------
const params = { ...DEFAULT_PARAMS };
const view = { animate: true, preset: 'walker' };
let zombie = null;

function rebuild() {
  if (zombie) {
    scene.remove(zombie);
    disposeZombie(zombie);
  }
  zombie = createZombie(params);
  scene.add(zombie);
  window.__zombie = zombie; // handy for debugging in the console
}
rebuild();

// ---- GUI ---------------------------------------------------------------------
const gui = new GUI({ title: 'Zombie 🧟' });
const onChange = () => rebuild();

gui.add(view, 'preset', Object.keys(PRESETS)).name('프리셋').onChange((name) => {
  Object.assign(params, DEFAULT_PARAMS, PRESETS[name], { seed: params.seed });
  gui.controllersRecursive().forEach((c) => c.updateDisplay());
  rebuild();
});

const shape = gui.addFolder('형태');
shape.add(params, 'seed', 1, 999, 1).name('시드').onChange(onChange);
shape.add(params, 'height', 0.6, 1.5, 0.01).name('키').onChange(onChange);
shape.add(params, 'bulk', 0.6, 1.8, 0.01).name('덩치').onChange(onChange);
shape.add(params, 'hunch', 0, 0.8, 0.01).name('구부정함').onChange(onChange);
shape.add(params, 'armReach', 0, 1, 0.01).name('팔 뻗기').onChange(onChange);
shape.add(params, 'headTilt', -0.6, 0.6, 0.01).name('고개 기울기').onChange(onChange);
shape.add(params, 'jawOpen', 0, 0.6, 0.01).name('입 벌림').onChange(onChange);

const decay = gui.addFolder('부패');
decay.add(params, 'rot', 0, 1.5, 0.01).name('울퉁불퉁함').onChange(onChange);
decay.add(params, 'missingArm', ['none', 'left', 'right']).name('잃은 팔').onChange(onChange);
decay.add(params, 'tornClothes').name('찢어진 옷').onChange(onChange);
decay.add(params, 'wounds', 0, 14, 1).name('상처 수').onChange(onChange);
decay.add(params, 'hair', 0, 1, 0.01).name('머리카락').onChange(onChange);

const colors = gui.addFolder('색상');
colors.addColor(params, 'skinColor').name('피부').onChange(onChange);
colors.addColor(params, 'shirtColor').name('셔츠').onChange(onChange);
colors.addColor(params, 'pantsColor').name('바지').onChange(onChange);
colors.addColor(params, 'hairColor').name('머리').onChange(onChange);
colors.addColor(params, 'bloodColor').name('피').onChange(onChange);
colors.addColor(params, 'eyeColor').name('눈').onChange(onChange);
colors.add(params, 'eyeGlow', 0, 5, 0.1).name('눈 발광').onChange(onChange);
colors.close();

const actions = {
  randomize() {
    params.seed = 1 + Math.floor(Math.random() * 999);
    const hsl = (h, s, l) => '#' + new THREE.Color().setHSL(h, s, l).getHexString();
    params.skinColor = hsl(0.18 + Math.random() * 0.12, 0.25 + Math.random() * 0.2, 0.35 + Math.random() * 0.15);
    params.shirtColor = hsl(Math.random(), 0.2 + Math.random() * 0.3, 0.2 + Math.random() * 0.25);
    params.pantsColor = hsl(Math.random(), 0.15 + Math.random() * 0.2, 0.15 + Math.random() * 0.15);
    params.hunch = Math.random() * 0.6;
    params.headTilt = (Math.random() - 0.5) * 0.9;
    params.armReach = 0.4 + Math.random() * 0.6;
    params.missingArm = ['none', 'none', 'left', 'right'][Math.floor(Math.random() * 4)];
    gui.controllersRecursive().forEach((c) => c.updateDisplay());
    rebuild();
  },
  exportGLB() {
    setPose(zombie, 0, 0); // export in rest pose
    new GLTFExporter().parse(zombie, (glb) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([glb], { type: 'model/gltf-binary' }));
      a.download = `zombie-${params.seed}.glb`;
      a.click();
      URL.revokeObjectURL(a.href);
    }, (err) => console.error(err), { binary: true });
  },
  copyParams() {
    navigator.clipboard?.writeText(JSON.stringify(params, null, 2));
  },
};
gui.add(view, 'animate').name('걷기 애니메이션');
gui.add(actions, 'randomize').name('🎲 랜덤 좀비');
gui.add(actions, 'exportGLB').name('💾 GLB 내보내기');
gui.add(actions, 'copyParams').name('📋 파라미터 복사(JSON)');

// ---- Loop --------------------------------------------------------------------
const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  setPose(zombie, clock.getElapsedTime(), view.animate ? 1 : 0);
  controls.update();
  renderer.render(scene, camera);
});

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
