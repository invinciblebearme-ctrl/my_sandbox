// usage: node verify.mjs <dir>  (run from the repo so 'three' resolves)
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import fs from 'fs';
import path from 'path';
const dir = process.argv[2];
let bad = 0;
for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.glb'))) {
  const buf = fs.readFileSync(path.join(dir, f));
  const gltf = await new Promise((res, rej) => new GLTFLoader().parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), '', res, rej));
  const mixer = new THREE.AnimationMixer(gltf.scene);
  let meshes = 0; gltf.scene.traverse((o) => o.isMesh && meshes++);
  const res = gltf.animations.map((clip) => {
    const unbound = clip.tracks.filter((t) => !gltf.scene.getObjectByName(t.name.split('.')[0])).length;
    if (unbound) bad++;
    return `${clip.name}(${clip.duration.toFixed(1)}s,${clip.tracks.length}tr${unbound ? `,UNBOUND ${unbound}` : ''})`;
  });
  void mixer;
  console.log(`${f.padEnd(22)} ${(buf.length / 1024).toFixed(0).padStart(5)}KB meshes=${String(meshes).padStart(3)}  ${res.join(' ')}`);
}
if (bad) { console.log('BAD TRACKS', bad); process.exit(1); }
