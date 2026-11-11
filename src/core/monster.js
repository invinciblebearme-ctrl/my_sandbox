// Monster runtime shared by all themes: rest-pose snapshot, procedural
// animation playback, baking into AnimationClips, and Unity-friendly mesh
// merging (one mesh per joint and material, so far fewer draw calls).
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Standard clip names every monster exports (what a Unity Animator expects).
export const STANDARD_CLIPS = ['idle', 'move', 'attack', 'hit', 'death', 'special'];

// Merge the plain meshes directly under each node, grouped by material.
function mergeByJoint(root) {
  const holders = [];
  root.traverse((o) => { if (!o.isMesh) holders.push(o); });
  for (const holder of holders) {
    const groups = new Map();
    for (const child of [...holder.children]) {
      if (!child.isMesh || child.children.length) continue;
      child.updateMatrix();
      const g = child.geometry.index ? child.geometry.toNonIndexed() : child.geometry.clone();
      for (const key of Object.keys(g.attributes)) if (key !== 'position' && key !== 'normal') g.deleteAttribute(key);
      if (!g.attributes.normal) g.computeVertexNormals();
      g.applyMatrix4(child.matrix);
      if (!groups.has(child.material)) groups.set(child.material, []);
      groups.get(child.material).push(g);
      holder.remove(child);
      child.geometry.dispose();
    }
    for (const [material, geos] of groups) {
      const merged = new THREE.Mesh(mergeGeometries(geos), material);
      merged.name = `${holder.name || 'root'}_${material.name}`;
      merged.castShadow = merged.receiveShadow = true;
      holder.add(merged);
      geos.forEach((g) => g.dispose());
    }
  }
}

// Call at the end of every monster builder, after setting the rest pose.
//   rig:        named pivots the animations use
//   animations: { key: { label, duration, loop?, apply(rig, u, params) } }
//   clips:      { idle: 'animKey', move: ..., attack: ..., hit: ..., death: ..., special? }
export function finalizeMonster(root, { rig, params, animations, clips }) {
  mergeByJoint(root);
  const nodes = [];
  root.traverse((o) => { if (o !== root && !o.isMesh) nodes.push(o); });
  const names = new Set();
  for (const n of nodes) {
    if (names.has(n.name)) throw new Error(`duplicate joint name "${n.name}"`); // breaks GLB tracks
    names.add(n.name);
  }
  const rest = nodes.map((n) => ({
    node: n, position: n.position.clone(), rotation: n.rotation.clone(), scale: n.scale.clone(),
  }));
  root.userData = { rig, params, animations, clips, nodes, rest };
  return root;
}

export function resetPose(obj) {
  for (const r of obj.userData.rest) {
    r.node.position.copy(r.position);
    r.node.rotation.copy(r.rotation); // Euler, so additive animations stay predictable
    r.node.scale.copy(r.scale);
  }
}

// Loop progress 0..1. One-shot clips play once, hold the last frame briefly, repeat.
function progress(anim, time) {
  if (anim.loop === false) return Math.min(1, (time % (anim.duration + 0.8)) / anim.duration);
  return (((time / anim.duration) % 1) + 1) % 1;
}

// `name` is an animation key, or a standard clip name (idle, move, ...) when no
// animation has that key.
export function setPose(obj, time, name = 'move') {
  const { animations, clips, rig, params } = obj.userData;
  resetPose(obj);
  const anim = animations[name] ?? animations[clips[name]];
  if (!anim) return;
  anim.apply(rig, progress(anim, time), params);
}

// Bakes [clipName, animKey] pairs into AnimationClips (default: standard clips).
export function bakeClips(obj, pairs = Object.entries(obj.userData.clips), fps = 30) {
  const { nodes, animations, rig, params } = obj.userData;
  const out = [];
  for (const [clipName, key] of pairs) {
    const anim = animations[key];
    if (!anim) continue;
    const frames = Math.max(2, Math.round(anim.duration * fps));
    const times = [];
    const data = nodes.map(() => ({ p: [], q: [], s: [] }));
    for (let f = 0; f <= frames; f++) {
      times.push((f / frames) * anim.duration);
      resetPose(obj);
      // looping clips: last frame equals the first so the loop is seamless
      const u = anim.loop === false ? f / frames : (f === frames ? 0 : f / frames);
      anim.apply(rig, u, params);
      nodes.forEach((n, i) => {
        data[i].p.push(...n.position.toArray());
        data[i].q.push(...n.quaternion.toArray());
        data[i].s.push(...n.scale.toArray());
      });
    }
    const changes = (arr, stride) => arr.some((v, k) => Math.abs(v - arr[k % stride]) > 1e-5);
    const tracks = [];
    nodes.forEach((n, i) => {
      if (changes(data[i].q, 4)) tracks.push(new THREE.QuaternionKeyframeTrack(`${n.name}.quaternion`, times, data[i].q));
      if (changes(data[i].p, 3)) tracks.push(new THREE.VectorKeyframeTrack(`${n.name}.position`, times, data[i].p));
      if (changes(data[i].s, 3)) tracks.push(new THREE.VectorKeyframeTrack(`${n.name}.scale`, times, data[i].s));
    });
    out.push(new THREE.AnimationClip(clipName, anim.duration, tracks));
  }
  resetPose(obj);
  return out;
}

export function disposeMonster(obj) {
  const mats = new Set();
  obj.traverse((o) => {
    if (o.isMesh) { o.geometry.dispose(); mats.add(o.material); }
  });
  mats.forEach((m) => m.dispose());
}

// ---- animation math helpers ----------------------------------------------------
export const TAU = Math.PI * 2;
export const clamp01 = (x) => Math.min(1, Math.max(0, x));
export const smooth = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); };
// 0 outside [a, b], 1 inside, with smooth ramps of length r
export const win = (u, a, b, r) => smooth((u - a) / r) * (1 - smooth((u - (b - r)) / r));
// quick blink near the given loop positions
export const blink = (u, at = [0.3, 0.8]) => at.reduce((m, t) => Math.max(m, 1 - clamp01(Math.abs(u - t) / 0.03)), 0);
// keyframe envelope: [[u, value], ...] smoothly interpolated
export const keys = (u, ks) => {
  if (u <= ks[0][0]) return ks[0][1];
  for (let i = 1; i < ks.length; i++) {
    if (u <= ks[i][0]) {
      const [u0, v0] = ks[i - 1];
      const [u1, v1] = ks[i];
      return v0 + (v1 - v0) * smooth((u - u0) / (u1 - u0));
    }
  }
  return ks[ks.length - 1][1];
};
