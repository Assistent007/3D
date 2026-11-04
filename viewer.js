// Yengil 3D ko'ruvchi: tarmoq so'rovisiz (GLB xotiradan o'qiladi), sensorli boshqaruv, savol nuqtalari.
import * as THREE from 'three';
import { GLTFLoader } from './lib/loaders/GLTFLoader.js';
import { OrbitControls } from './lib/controls/OrbitControls.js';
import { RoomEnvironment } from './lib/environments/RoomEnvironment.js';

export function createViewer(host, { onHotspot } = {}) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  } catch (e) { throw new Error('webgl'); }
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(dpr);
  renderer.toneMapping = THREE.NeutralToneMapping || THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  const sun = new THREE.DirectionalLight(0xffffff, 1.1); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.02;
  scene.add(sun); scene.add(sun.target);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a94a6, 0.35));
  const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 200);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = 0.08; controls.autoRotateSpeed = 1.6; controls.screenSpacePanning = true;
  const layer = document.createElement('div'); layer.className = 'hs-layer'; host.appendChild(layer);
  let root = null, hs = [], home = null, raf = 0, dirty = true, hsVisible = true;
  const ray = new THREE.Raycaster();

  function size() {
    const w = host.clientWidth, h = host.clientHeight;
    renderer.setSize(w, h, false); renderer.domElement.style.width = w + 'px'; renderer.domElement.style.height = h + 'px';
    camera.aspect = w / Math.max(h, 1); camera.updateProjectionMatrix(); dirty = true;
  }
  const ro = new ResizeObserver(size); ro.observe(host); size();
  controls.addEventListener('change', () => { dirty = true; });

  function parseOrbit(s) { const m = String(s).match(/(-?[\d.]+)deg\s+(-?[\d.]+)deg/); return m ? [THREE.MathUtils.degToRad(+m[1]), THREE.MathUtils.degToRad(+m[2])] : [0, Math.PI / 2.6]; }

  function frame(orbit) {
    const box = new THREE.Box3().setFromObject(root), c = box.getCenter(new THREE.Vector3()), sz = box.getSize(new THREE.Vector3());
    const r = sz.length() / 2, [th, ph] = parseOrbit(orbit);
    const fov = THREE.MathUtils.degToRad(camera.fov), fit = r / Math.sin(Math.min(fov, fov * camera.aspect) / 2) * (camera.aspect < 1 ? 1.0 : 0.82);
    const dir = new THREE.Vector3(Math.sin(ph) * Math.sin(th), Math.cos(ph), Math.sin(ph) * Math.cos(th));
    home = { pos: c.clone().addScaledVector(dir, fit), target: c.clone() };
    camera.near = fit / 200; camera.far = fit * 20; camera.updateProjectionMatrix();
    controls.minDistance = fit * 0.15; controls.maxDistance = fit * 3;
    reset();
    sun.position.copy(c).add(new THREE.Vector3(r * 1.2, r * 2.2, r * 1.4)); sun.target.position.copy(c);
    const s = sun.shadow.camera; s.left = s.bottom = -r * 1.3; s.right = s.top = r * 1.3; s.near = 0.01; s.far = r * 6; s.updateProjectionMatrix();
  }
  function reset() { if (!home) return; camera.position.copy(home.pos); controls.target.copy(home.target); controls.update(); dirty = true; }

  function load(arrayBuffer, orbit) {
    return new Promise((res, rej) => {
      new GLTFLoader().parse(arrayBuffer, '', g => {
        root = g.scene; root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; const m = o.material; if (m && m.transparent) { o.castShadow = false; m.depthWrite = false; } } });
        scene.add(root); frame(orbit); loop(); res();
      }, rej);
    });
  }

  function setHotspots(list) {
    layer.innerHTML = ''; hs = list.map((h, i) => {
      const p = h.pos.split(' ').map(parseFloat), n = h.normal.split(' ').map(parseFloat);
      const b = document.createElement('button'); b.className = 'hs'; b.innerHTML = `<span>${i + 1}</span>`;
      b.addEventListener('click', e => { e.stopPropagation(); onHotspot && onHotspot(i); });
      layer.appendChild(b);
      return { el: b, p: new THREE.Vector3(...p), n: new THREE.Vector3(...n).normalize() };
    });
    dirty = true;
  }
  function placeHotspots() {
    const w = host.clientWidth, h = host.clientHeight, cam = camera.position;
    hs.forEach(o => {
      const v = o.p.clone().project(camera);
      const vis = hsVisible && v.z < 1 && Math.abs(v.x) < 1.05 && Math.abs(v.y) < 1.05;
      o.el.style.display = vis ? 'flex' : 'none'; if (!vis) return;
      o.el.style.transform = `translate(${(v.x + 1) / 2 * w - 15}px, ${(1 - v.y) / 2 * h - 15}px)`;
      const toCam = cam.clone().sub(o.p).normalize(); let hidden = toCam.dot(o.n) < -0.15;
      if (!hidden && root) { ray.set(o.p.clone().addScaledVector(toCam, 0.002), toCam); const hit = ray.intersectObject(root, true)[0]; hidden = !!hit && hit.distance < cam.distanceTo(o.p) - 0.004; }
      o.el.classList.toggle('behind', hidden);
    });
  }
  let last = 0;
  function loop(t = 0) {
    raf = requestAnimationFrame(loop);
    const moved = controls.update();
    if (dirty || moved || controls.autoRotate) {
      renderer.render(scene, camera); dirty = false;
      if (t - last > 60 || !controls.autoRotate) { placeHotspots(); last = t; }
    }
  }
  return {
    load, setHotspots, reset,
    setAutoRotate(v) { controls.autoRotate = v; dirty = true; },
    toggleHotspots() { hsVisible = !hsVisible; dirty = true; placeHotspots(); return hsVisible; },
    dispose() { cancelAnimationFrame(raf); ro.disconnect(); controls.dispose(); renderer.dispose(); }
  };
}
