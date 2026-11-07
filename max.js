/* 3ds Max simulyatori — interfeys. Geometriya: maxcore.js, mashqlar: maxlabs.js */
import * as THREE from 'three';
import { OrbitControls } from './lib/controls/OrbitControls.js';
import { TransformControls } from './lib/controls/TransformControls.js';
import { RoomEnvironment } from './lib/environments/RoomEnvironment.js';
import { TYPES, CATS, CAT_TITLE, MODS, defaults, evaluate, wireOf, triangulate, uvw, texture, D2R } from './maxcore.js';
import { PRESETS, CHECK } from './maxlabs.js';

const WIRE_COLORS = ['#e7a83b', '#86c06c', '#5aa2df', '#d96b6b', '#a97fd8', '#4fc1b5', '#d9cf5a', '#e08a4f', '#8fb3e6', '#c77fb4', '#7fd18c', '#b89b6a'];
const LIGHTS = ['Omni', 'Spot', 'Sun'];

export function createMax(root, TX, opts = {}) {
  const LAB = opts.lab || null, LABS = TX.labs || {}, LT = opts.labTitles || {};
  const isTouch = matchMedia('(pointer: coarse)').matches;
  const H = TX.hints || {};
  const t = (k, f) => TX[k] || f;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmt = (v, d) => (d.int ? String(Math.round(v)) : (Math.round(v * 100) / 100).toFixed(Math.abs(v) < 10 && d.unit === '' ? 2 : 1)) + (d.unit || '');
  const KEY = LAB ? 'mx_lab_' + LAB : 'mx_autosave', DKEY = LAB ? 'mx_done_' + LAB : 'mx_tasks';

  /* ---------- holat ---------- */
  const S = { objs: [], sel: null, mode: 'select', tab: 'create', cat: 'geo', createType: null, justCreated: null, counters: {}, space: 'world', snap: false, asnap: false,
    active: 3, maxed: false, gridOn: true, stats: false, modSel: -1, undo: [], redo: [], createDefaults: {}, colorIdx: 0, draw: null, sample: false,
    flags: { maxed: false, shade: false, stats: false, rendered: false, xform: false, exported: false } };
  Object.keys(TYPES).forEach(k => S.createDefaults[k] = defaults(TYPES[k].p));

  /* ---------- DOM ---------- */
  const backHref = LAB ? '#ish-' + LAB : '#';
  root.innerHTML = `
  <div class="mx${isTouch ? ' touch' : ''}">
    <div class="mx-menu">${['File', 'Edit', 'Tools', 'Group', 'Views', 'Create', 'Modifiers', 'Animation', 'Graph Editors', 'Rendering', 'Customize', 'Scripting', 'Help'].map(m => `<button data-menu="${m}">${m}</button>`).join('')}
      <span class="mx-sp"></span><span class="mx-ws">${LAB ? esc(t('lab_word', 'Ish') + ' ' + (+LAB)) : 'Workspaces: Default'}</span><a class="mx-back" href="${backHref}">← ${esc(LAB ? t('back_lab', 'Ish sahifasi') : TX.back)}</a></div>
    <div class="mx-tool" id="mxTool"></div>
    <div class="mx-ribbon"><span class="on">Modeling</span><span>Freeform</span><span>Selection</span><span>Object Paint</span><span>Populate</span><em>Polygon Modeling ▾</em></div>
    <div class="mx-main">
      <aside class="mx-exp"><div class="mx-ph">Scene Explorer – Layer Explorer</div><input class="mx-find" placeholder="Find…"><div class="mx-exp-h">Name (Sorted Ascending)</div><div id="mxList" class="mx-list"></div></aside>
      <section class="mx-vps" id="mxVps">
        ${[0, 1, 2, 3].map(i => `<div class="vpbg" data-i="${i}"></div>`).join('')}
        <canvas id="mxCanvas"></canvas>
        ${[0, 1, 2, 3].map(i => `<div class="vp" data-i="${i}"><div class="vpl"><b data-a="plus">[+]</b> <b data-a="view"></b> <b data-a="std">[Standard]</b> <b data-a="shade"></b></div><div class="vps"></div></div>`).join('')}
        <div class="mx-vtabs">${['Top', 'Front', 'Left', 'Persp', '4×'].map((x, i) => `<button data-v="${i}">${x}</button>`).join('')}</div>
        <button class="mx-finish" id="mxFinish" hidden>✓ ${esc(t('finish_line', 'Chizishni tugatish'))}</button>
        <div class="mx-tasks" id="mxTasks" hidden></div>
        <div class="mx-toast" id="mxToast" hidden></div>
      </section>
      <aside class="mx-cmd"><div class="mx-tabs" id="mxTabs"></div><div class="mx-cp" id="mxCP"></div></aside>
    </div>
    <div class="mx-time"><div class="mx-slider"><span>0 / 100</span></div><div class="mx-track">${Array.from({ length: 21 }, (_, i) => `<i style="left:${i * 5}%">${i * 5}</i>`).join('')}</div></div>
    <div class="mx-status">
      <div class="mx-ms"><div>MAXScript Mi</div><div></div></div>
      <div class="mx-st"><div id="mxSelN"></div><div id="mxPrompt" class="mx-prompt"></div></div>
      <div class="mx-ti"><span class="mx-lock">cm</span>${['X', 'Y', 'Z'].map(a => `<label>${a}:<input data-ti="${a}" inputmode="decimal"></label>`).join('')}<span class="mx-grid">Grid = 10,0cm</span></div>
      <div class="mx-anim"><button class="mx-ak">Auto Key</button><select disabled><option>Selected</option></select><button>Set Key</button><span class="mx-play">⏮ ◀ ▶ ▶| ⏭</span><input value="0" disabled size="3"></div>
      <div class="mx-nav"><button data-nav="zoom" title="Zoom">🔍</button><button data-nav="ext" title="Zoom Extents All (Z)">⛶</button><button data-nav="fov" title="Field of View">◺</button><button data-nav="pan" title="Pan">✋</button><button data-nav="orbit" title="Orbit">⟲</button><button data-nav="max" title="Maximize Viewport Toggle (Alt+W)">▣</button></div>
    </div>
    <div class="mx-dd" id="mxDD" hidden></div>
    <div class="mx-modal" id="mxModal" hidden></div>
  </div>`;
  const $ = s => root.querySelector(s), $$ = s => [...root.querySelectorAll(s)];
  const vpsEl = $('#mxVps'), canvas = $('#mxCanvas'), CP = $('#mxCP');

  /* ---------- asboblar paneli ---------- */
  const ICON = {
    undo: '<path d="M7 7H3V3M3.5 7A8 8 0 1 1 4 15" />', redo: '<path d="M17 7h4V3M20.5 7A8 8 0 1 0 20 15" />', del: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/>',
    link: '<path d="M9 15l6-6M7 12l-2 2a3 3 0 0 0 4 4l2-2M17 12l2-2a3 3 0 0 0-4-4l-2 2"/>', unlink: '<path d="M7 12l-2 2a3 3 0 0 0 4 4l2-2M17 12l2-2a3 3 0 0 0-4-4l-2 2M4 4l16 16"/>',
    select: '<path d="M5 3l12 9-5 1 3 6-2 1-3-6-4 4z"/>', byname: '<path d="M4 5h10M4 10h10M4 15h7M17 13l4 4-4 4"/>', region: '<rect x="4" y="4" width="16" height="16" stroke-dasharray="3 2"/>',
    move: '<path d="M12 2v20M2 12h20M12 2l-3 3M12 2l3 3M12 22l-3-3M12 22l3-3M2 12l3-3M2 12l3 3M22 12l-3-3M22 12l-3 3"/>',
    rotate: '<path d="M20 12a8 8 0 1 1-3-6.2M20 4v5h-5"/>', scale: '<rect x="3" y="11" width="10" height="10"/><path d="M13 11l8-8M15 3h6v6"/>',
    snap: '<path d="M6 3v8a6 6 0 0 0 12 0V3h-4v8a2 2 0 0 1-4 0V3z"/>', asnap: '<path d="M4 20h16M4 20L16 6"/><path d="M10 20a6 6 0 0 0-2-4.5"/>',
    mirror: '<path d="M12 3v18M9 6L3 12l6 6zM15 6l6 6-6 6z"/>', array: '<rect x="3" y="3" width="5" height="5"/><rect x="10" y="3" width="5" height="5"/><rect x="17" y="3" width="4" height="5"/><rect x="3" y="10" width="5" height="5"/><rect x="10" y="10" width="5" height="5"/><rect x="3" y="17" width="5" height="4"/>',
    clone: '<rect x="8" y="8" width="12" height="12" rx="1"/><path d="M4 16V4h12"/>', mat: '<circle cx="8" cy="8" r="4"/><circle cx="16" cy="8" r="4"/><circle cx="8" cy="16" r="4"/><circle cx="16" cy="16" r="4"/>',
    render: '<path d="M4 18l6-12 4 8 2-3 4 7z"/>', setup: '<path d="M4 6h16M4 12h16M4 18h16"/><circle cx="9" cy="6" r="2"/><circle cx="15" cy="12" r="2"/><circle cx="7" cy="18" r="2"/>',
    tasks: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>', help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 17h.01"/>',
  };
  const svg = n => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${ICON[n]}</svg>`;
  const TB = [['undo', 'Undo (Ctrl+Z)'], ['redo', 'Redo (Ctrl+Y)'], ['del', 'Delete (Delete)'], '|', ['link', 'Select and Link', 1], ['unlink', 'Unlink Selection', 1], '|', ['filter'], ['select', 'Select Object (Q)'], ['byname', 'Select by Name (H)'], ['region', 'Rectangular Selection Region', 1], '|',
    ['move', 'Select and Move (W)'], ['rotate', 'Select and Rotate (E)'], ['scale', 'Select and Uniform Scale (R)'], ['coord'], '|', ['snap', '3D Snaps Toggle (S)'], ['asnap', 'Angle Snap Toggle (A)'], '|', ['clone', 'Clone (Ctrl+V)'], ['array', 'Array (Tools → Array)'], ['mirror', 'Mirror', 1], '|', ['mat', 'Material Editor (M)'], ['setup', 'Render Setup (F10)', 1], ['render', 'Render Production (Shift+Q)'],
    '|', ['tasks', TX.tasks_title], ['help', TX.help_title]];
  $('#mxTool').innerHTML = TB.map(b => {
    if (b === '|') return '<i class="sep"></i>';
    if (b[0] === 'filter') return '<select class="mx-sel" disabled><option>All</option></select>';
    if (b[0] === 'coord') return '<select class="mx-sel" id="mxCoord" title="Reference Coordinate System"><option value="world">World</option><option value="local">Local</option></select>';
    return `<button class="tb${b[2] ? ' dis' : ''}" data-tb="${b[0]}" title="${esc(b[1])}">${svg(b[0])}${b[0] === 'tasks' ? `<span>${esc(TX.tasks_title)}</span>` : ''}</button>`;
  }).join('');

  /* ---------- three.js ---------- */
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isTouch ? 1.5 : 2));
  renderer.setClearColor(0x000000, 0); renderer.autoClear = false;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  try { const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; pm.dispose(); } catch (e) {}
  const hemi = new THREE.HemisphereLight(0xffffff, 0x50555c, 1.0); hemi.position.set(0, 0, 1); scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffffff, 1.5); scene.add(key); scene.add(key.target);
  const grids = {};
  function mkGrid(plane) {
    const g = new THREE.GridHelper(400, 40, 0x1c1c1c, 0x5d5d5d); g.material.transparent = true; g.material.opacity = 0.9;
    if (plane === 'XY') g.rotation.x = Math.PI / 2; if (plane === 'YZ') g.rotation.z = Math.PI / 2;
    scene.add(g); return g;
  }
  grids.XY = mkGrid('XY'); grids.XZ = mkGrid('XZ'); grids.YZ = mkGrid('YZ');

  const VIEWS = {
    Top: { dir: [0, 0, 1], up: [0, 1, 0], plane: 'XY', ortho: true }, Bottom: { dir: [0, 0, -1], up: [0, -1, 0], plane: 'XY', ortho: true },
    Front: { dir: [0, -1, 0], up: [0, 0, 1], plane: 'XZ', ortho: true }, Back: { dir: [0, 1, 0], up: [0, 0, 1], plane: 'XZ', ortho: true },
    Left: { dir: [-1, 0, 0], up: [0, 0, 1], plane: 'YZ', ortho: true }, Right: { dir: [1, 0, 0], up: [0, 0, 1], plane: 'YZ', ortho: true },
    Perspective: { dir: [0.62, -0.78, 0.52], up: [0, 0, 1], plane: 'XY', ortho: false },
  };
  const VP = [{ view: 'Top', shade: 'wire' }, { view: 'Front', shade: 'wire' }, { view: 'Left', shade: 'wire' }, { view: 'Perspective', shade: 'shaded' }];
  const vpEls = $$('.vp'), bgEls = $$('.vpbg');
  const tcs = [];

  function setupView(i, keepTarget) {
    const v = VP[i], d = VIEWS[v.view], el = vpEls[i];
    const target = keepTarget && v.controls ? v.controls.target.clone() : new THREE.Vector3(0, 0, v.view === 'Perspective' ? 15 : 0);
    if (v.controls) v.controls.dispose();
    const cam = d.ortho ? new THREE.OrthographicCamera(-1, 1, 1, -1, -5000, 5000) : new THREE.PerspectiveCamera(40, 1, 1, 20000);
    cam.up.set(...d.up); const dist = d.ortho ? 1000 : 330;
    if (keepTarget && v.cam && v.cam.isOrthographicCamera === d.ortho && v.view === v.lastView) { cam.position.copy(v.cam.position); cam.zoom = v.cam.zoom; }
    else cam.position.set(target.x + d.dir[0] * dist, target.y + d.dir[1] * dist, target.z + d.dir[2] * dist);
    cam.lookAt(target); v.cam = cam; v.lastView = v.view;
    if (!tcs[i]) {
      const tc = new TransformControls(cam, el); tc.size = isTouch ? 1.15 : 0.9; scene.add(tc.getHelper()); tcs[i] = tc;
      tc.addEventListener('dragging-changed', e => { VP.forEach(x => x.controls && (x.controls.enabled = !e.value)); S.dragging = e.value; if (!e.value) { commit(); S.justDragged = performance.now(); } });
      tc.addEventListener('objectChange', () => { updateTypeIn(); if (S.tab === 'motion') renderCP(); updateBrackets(); });
      tc.addEventListener('change', req);
    } else tcs[i].camera = cam;
    const oc = new OrbitControls(cam, el); oc.target.copy(target); oc.enableDamping = false; oc.zoomSpeed = 1.2; oc.screenSpacePanning = true;
    oc.mouseButtons = { LEFT: -1, MIDDLE: THREE.MOUSE.PAN, RIGHT: d.ortho ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE };
    oc.touches = { ONE: d.ortho ? THREE.TOUCH.PAN : THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
    oc.enableRotate = !d.ortho; oc.addEventListener('change', req); oc.update(); v.controls = oc;
    el.querySelector('[data-a="view"]').textContent = `[${v.view}]`;
    el.querySelector('[data-a="shade"]').textContent = `[${{ wire: 'Wireframe', shaded: 'Default Shading', edged: 'Default Shading + Edged Faces' }[v.shade]}]`;
    bgEls[i].classList.toggle('persp', !d.ortho);
    layout(); req();
  }

  /* ---------- obyektlar ---------- */
  let uid = 1;
  const isLight = o => LIGHTS.includes(o.type);
  function makeObj(type, p, at, extra = {}) {
    const cat = TYPES[type].cat;
    const o = { id: uid++, type, cat, name: extra.name || nextName(type), src: extra.src || { p, mods: [] }, color: extra.color || (cat === 'light' ? '#ffd84d' : WIRE_COLORS[S.colorIdx++ % WIRE_COLORS.length]),
      hidden: false, see: false, piv: new THREE.Vector3(), mtl: extra.mtl ? { ...extra.mtl } : null };
    o.group = new THREE.Group(); o.group.position.set(...(at || [0, 0, 0]));
    if (cat === 'light') {
      const hg = type === 'Omni' ? new THREE.OctahedronGeometry(5) : type === 'Spot' ? new THREE.ConeGeometry(5, 9, 14).rotateX(-Math.PI / 2).translate(0, 0, 4.5) : new THREE.SphereGeometry(5, 14, 10);
      o.mat = new THREE.MeshBasicMaterial({ color: o.color }); o.mesh = new THREE.Mesh(hg, o.mat);
      o.light = type === 'Omni' ? new THREE.PointLight(0xffffff, 1, 0, 0) : type === 'Spot' ? new THREE.SpotLight(0xffffff, 1, 0, 0.5, 0.2, 0) : new THREE.DirectionalLight(0xffffff, 1);
      o.light.shadow.mapSize.set(1024, 1024); o.light.shadow.bias = -0.0008;
      if (o.light.shadow.camera.isOrthographicCamera) Object.assign(o.light.shadow.camera, { left: -350, right: 350, top: 350, bottom: -350, near: 1, far: 6000 });
      else { o.light.shadow.camera.near = 1; o.light.shadow.camera.far = 6000; }
      o.tgt = new THREE.Object3D(); scene.add(o.tgt); if (o.light.target) o.light.target = o.tgt;
      o.group.add(o.light);
    } else {
      o.mat = new THREE.MeshStandardMaterial({ color: o.color, roughness: 0.62, metalness: 0, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1, envMapIntensity: 0.6 });
      o.mesh = new THREE.Mesh(new THREE.BufferGeometry(), o.mat); o.mesh.castShadow = o.mesh.receiveShadow = true;
    }
    o.mesh.userData.obj = o;
    o.wire = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: o.color })); o.wire.userData.obj = o;
    o.brk = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xffffff })); o.brk.visible = false;
    o.group.add(o.mesh, o.wire, o.brk); scene.add(o.group); S.objs.push(o);
    rebuild(o); return o;
  }
  function nextName(type) { let n; do { S.counters[type] = (S.counters[type] || 0) + 1; n = type + String(S.counters[type]).padStart(3, '0'); } while (S.objs.some(o => o.name === n)); return n; }
  function rebuild(o) {
    const p = o.src.p;
    if (isLight(o)) {
      o.light.color.set(p.color); o.light.intensity = p.mult * (o.type === 'Spot' ? 2.6 : 2.2); o.light.castShadow = !!p.shadow;
      if (o.type === 'Spot') { o.light.angle = Math.min(1.5, p.fall * D2R / 2); o.light.penumbra = Math.max(0, Math.min(1, 1 - p.hot / p.fall)); }
      if (o.tgt) o.tgt.position.set(p.tx || 0, p.ty || 0, p.tz || 0);
      o.mat.color.set(o === S.sel ? '#ffffff' : p.color === '#ffffff' ? '#ffd84d' : p.color);
      o.polys = 0; o.verts = 0; o.tris = 0; updateBrackets(o); req(); return;
    }
    const st = evaluate(o.type, p, o.src.mods); o.top = st.faces && st.faces.length ? 'mesh' : 'shape';
    const geo = new THREE.BufferGeometry();
    if (o.top === 'mesh') {
      const pos = Float32Array.from(st.pos);
      if (o.piv.lengthSq()) for (let i = 0; i < pos.length; i += 3) { pos[i] += o.piv.x; pos[i + 1] += o.piv.y; pos[i + 2] += o.piv.z; }
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setIndex(triangulate(st.faces));
      const uv = st.uv || (o.mtl && o.mtl.map && o.mtl.map !== 'none' ? uvw(st, { map: 'Box', ulen: 0, uwid: 0, uhei: 0, utile: 1, vtile: 1 }) : null);
      if (uv) geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      geo.computeVertexNormals();
    }
    o.mesh.geometry.dispose(); o.mesh.geometry = geo;
    const smooth = st.smooth || (p.smooth === undefined ? false : p.smooth);
    o.mat.flatShading = !smooth; o.mat.needsUpdate = true; applyMat(o);
    const W = wireOf(st), wp = W.lines;
    if (o.piv.lengthSq()) for (let i = 0; i < wp.length; i += 3) { wp[i] += o.piv.x; wp[i + 1] += o.piv.y; wp[i + 2] += o.piv.z; }
    o.wire.geometry.dispose(); o.wire.geometry = new THREE.BufferGeometry(); o.wire.geometry.setAttribute('position', new THREE.BufferAttribute(wp, 3));
    o.wire.geometry.computeBoundingBox(); o.wire.geometry.computeBoundingSphere(); geo.computeBoundingBox(); geo.computeBoundingSphere();
    o.polys = W.polys; o.verts = W.verts; o.tris = o.top === 'mesh' ? geo.index.count / 3 : 0;
    o.len = o.top === 'shape' ? (st.loops || []).reduce((s, l) => s + l.pts.reduce((a, q, i, P) => i ? a + Math.hypot(q[0] - P[i - 1][0], q[1] - P[i - 1][1], q[2] - P[i - 1][2]) : a, 0) + (l.closed && l.pts.length > 2 ? Math.hypot(l.pts[0][0] - l.pts[l.pts.length - 1][0], l.pts[0][1] - l.pts[l.pts.length - 1][1]) : 0), 0) : 0;
    updateBrackets(o); req();
  }
  function applyMat(o) {
    if (isLight(o)) return; const m = o.mtl, mat = o.mat;
    if (!m) { mat.color.set(o.color); mat.roughness = 0.62; mat.metalness = 0; mat.map = null; mat.opacity = o.see ? 0.45 : 1; mat.transparent = o.see; mat.emissive.set('#000000'); mat.needsUpdate = true; return; }
    mat.color.set(m.map && m.map !== 'none' && (!m.color || m.color === '#ffffff') ? '#ffffff' : (m.color || o.color));
    mat.roughness = m.rough ?? 0.6; mat.metalness = m.metal ?? 0; mat.map = m.map && m.map !== 'none' ? texture(m.map) : null;
    const op = Math.min(m.opacity ?? 1, o.see ? 0.45 : 1); mat.opacity = op; mat.transparent = op < 1; mat.depthWrite = op >= 0.99;
    mat.emissive.set(m.emis || '#000000'); mat.emissiveIntensity = m.emisI ?? 0; mat.envMapIntensity = m.metal > 0.5 ? 1.2 : 0.6; mat.needsUpdate = true;
  }
  function rebuildShared(o) { S.objs.forEach(x => (x.src === o.src || x.src.p === o.src.p) && rebuild(x)); }
  function bboxOf(o) { const g = o.top === 'mesh' ? o.mesh.geometry : isLight(o) ? o.mesh.geometry : o.wire.geometry; if (!g.boundingBox) g.computeBoundingBox(); return g.boundingBox; }
  function updateBrackets(o = S.sel) {
    if (!o) return; const bb = bboxOf(o); if (!bb || bb.isEmpty()) return;
    const a = bb.min, b = bb.max, L = [(b.x - a.x) * 0.22, (b.y - a.y) * 0.22, (b.z - a.z) * 0.22], P = [];
    for (const x of [a.x, b.x]) for (const y of [a.y, b.y]) for (const z of [a.z, b.z]) {
      const sx = x === a.x ? 1 : -1, sy = y === a.y ? 1 : -1, sz = z === a.z ? 1 : -1;
      P.push(x, y, z, x + sx * L[0], y, z, x, y, z, x, y + sy * L[1], z, x, y, z, x, y, z + sz * L[2]);
    }
    o.brk.geometry.dispose(); o.brk.geometry = new THREE.BufferGeometry(); o.brk.geometry.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); req();
  }
  function removeObj(o) {
    scene.remove(o.group); if (o.tgt) scene.remove(o.tgt); if (o.light && o.light.dispose) o.light.dispose();
    o.mesh.geometry.dispose(); o.wire.geometry.dispose(); o.brk.geometry.dispose(); o.mat.dispose();
    S.objs = S.objs.filter(x => x !== o); if (S.sel === o) select(null);
  }
  function delSel() { if (!S.sel) return toast(TX.no_sel_modify); const n = S.sel.name; removeObj(S.sel); renderList(); commit(); toast(n + ' — Delete'); }
  function select(o) {
    const prev = S.sel; S.sel = o; S.objs.forEach(x => x.brk.visible = false); S.modSel = -1;
    tcs.forEach(t => { if (o && ['move', 'rotate', 'scale'].includes(S.mode) && !o.hidden) t.attach(o.group); else t.detach(); });
    if (S.justCreated && S.justCreated !== o) S.justCreated = null;
    [prev, o].forEach(x => x && isLight(x) && rebuild(x));
    updateBrackets(); renderList(); renderCP(); updateTypeIn(); setPrompt(); req();
  }
  function setMode(m) {
    if (S.draw) finishLine();
    S.mode = m; if (m !== 'create') S.createType = null;
    tcs.forEach(t => { if (['move', 'rotate', 'scale'].includes(m)) t.setMode({ move: 'translate', rotate: 'rotate', scale: 'scale' }[m]); });
    select(S.sel); syncTool();
  }
  function syncTool() {
    $$('[data-tb]').forEach(b => b.classList.toggle('on', b.dataset.tb === S.mode || (b.dataset.tb === 'snap' && S.snap) || (b.dataset.tb === 'asnap' && S.asnap) || (b.dataset.tb === 'tasks' && !$('#mxTasks').hidden)));
  }

  /* ---------- undo / saqlash ---------- */
  function serialize() {
    const ps = new Map(), ms = new Map(); const P = [], M = [];
    const objs = S.objs.map(o => {
      if (!ps.has(o.src.p)) { ps.set(o.src.p, P.length); P.push(JSON.parse(JSON.stringify(o.src.p))); }
      if (!ms.has(o.src.mods)) { ms.set(o.src.mods, M.length); M.push(o.src.mods.map(m => ({ type: m.type, on: m.on, p: { ...m.p } }))); }
      const g = o.group;
      return { type: o.type, name: o.name, p: ps.get(o.src.p), m: ms.get(o.src.mods), color: o.color, hidden: o.hidden, see: o.see, piv: o.piv.toArray(), mtl: o.mtl,
        pos: g.position.toArray(), rot: [g.rotation.x, g.rotation.y, g.rotation.z], quat: g.quaternion.toArray(), scl: g.scale.toArray() };
    });
    return JSON.stringify({ P, M, objs, sel: S.objs.indexOf(S.sel), counters: S.counters, colorIdx: S.colorIdx, sample: S.sample });
  }
  function restore(js) {
    const d = JSON.parse(js); [...S.objs].forEach(removeObj);
    const srcs = new Map(), P = d.P.map(x => JSON.parse(JSON.stringify(x))), M = d.M.map(ms => ms.map(m => ({ ...m, p: { ...m.p } })));
    d.objs.forEach(r => {
      if (!TYPES[r.type]) return;
      const k = r.p + ':' + r.m; if (!srcs.has(k)) srcs.set(k, { p: P[r.p], mods: M[r.m] });
      const o = makeObj(r.type, null, r.pos, { name: r.name, src: srcs.get(k), color: r.color, mtl: r.mtl });
      if (r.quat) o.group.quaternion.fromArray(r.quat); else o.group.rotation.set(...r.rot);
      o.group.scale.set(...r.scl); o.hidden = r.hidden; o.see = !!r.see; o.piv.fromArray(r.piv || [0, 0, 0]); rebuild(o);
    });
    S.counters = d.counters || {}; S.colorIdx = d.colorIdx || 0; S.sample = !!d.sample;
    select(d.sel >= 0 ? S.objs[d.sel] : null);
  }
  let last = '';
  function save() { try { localStorage.setItem(KEY, last); } catch (e) {} }
  function commit() {
    const now = serialize(); if (now === last) return;
    S.undo.push(last); if (S.undo.length > 60) S.undo.shift(); S.redo = []; last = now; save(); checkTasks();
  }
  function undo() { if (!S.undo.length) return; S.redo.push(last); last = S.undo.pop(); restore(last); save(); checkTasks(); }
  function redo() { if (!S.redo.length) return; S.undo.push(last); last = S.redo.pop(); restore(last); save(); checkTasks(); }

  /* ---------- Scene Explorer ---------- */
  function renderList() {
    const q = ($('.mx-find').value || '').toLowerCase();
    $('#mxList').innerHTML = [...S.objs].sort((a, b) => a.name.localeCompare(b.name)).filter(o => !q || o.name.toLowerCase().includes(q)).map(o =>
      `<div class="it${o === S.sel ? ' on' : ''}" data-id="${o.id}"><span class="eye${o.hidden ? ' off' : ''}" data-eye="${o.id}">${o.hidden ? '◌' : '◉'}</span><i style="background:${o.color}"></i><span class="nm">${esc(o.name)}</span><b class="mx-x" data-del="${o.id}" title="Delete">×</b></div>`).join('')
      || '<div class="mx-empty">—</div>';
  }
  $('.mx-find').addEventListener('input', renderList);
  $('#mxList').addEventListener('click', e => {
    const it = e.target.closest('[data-id]'); if (!it) return; const o = S.objs.find(x => x.id === +it.dataset.id);
    if (e.target.closest('[data-del]')) { select(o); delSel(); return; }
    if (e.target.closest('[data-eye]')) { o.hidden = !o.hidden; if (o.hidden && S.sel === o) select(null); else renderList(); commit(); req(); return; }
    if (!o.hidden) select(o);
  });

  /* ---------- Command Panel ---------- */
  const TABS = [['create', 'Create', '<path d="M12 5v14M5 12h14"/>'], ['modify', 'Modify', '<path d="M4 20l4-1 11-11-3-3L5 16z"/>'], ['hierarchy', 'Hierarchy', '<circle cx="12" cy="5" r="2"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="19" r="2"/><path d="M12 7v5M12 12l-6 5M12 12l6 5"/>'],
    ['motion', 'Motion', '<circle cx="6" cy="18" r="3"/><path d="M8 15c4-9 8-10 12-10"/>'], ['display', 'Display', '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'], ['utilities', 'Utilities', '<path d="M14 6l4 4-8 8H6v-4z"/><path d="M4 20h16"/>']];
  $('#mxTabs').innerHTML = TABS.map(([k, x, p]) => `<button data-tab="${k}" title="${x}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${p}</svg><span>${x}</span></button>`).join('');
  $('#mxTabs').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) { S.tab = b.dataset.tab; if (S.tab !== 'create' && S.mode === 'create') setMode('select'); renderCP(); } });

  const ro = (title, body, id, closed) => { const c = S['ro_' + id] ? S['ro_' + id] === 'c' : !!closed; return `<div class="ro${c ? ' closed' : ''}" data-ro="${id}"><div class="ro-h"><span>${c ? '+' : '−'}</span> ${title}</div><div class="ro-b">${body}</div></div>`; };
  function ctl(d, v, path) {
    const hint = H[d.k] ? ` data-hint="${esc(H[d.k])}"` : '';
    if (d.kind === 'bool') return `<label class="cb"${hint}><input type="checkbox" data-path="${path}" ${v ? 'checked' : ''}> ${d.label}</label>`;
    if (d.kind === 'color') return `<div class="row"${hint}><span>${d.label}:</span><input type="color" class="mx-col" data-path="${path}" value="${v}"></div>`;
    if (d.kind === 'enum') return `<div class="row"${hint}><span>${d.label}:</span><span class="rad">${d.opts.map(o => `<label><input type="radio" name="${path}" data-path="${path}" value="${o}" ${o === v ? 'checked' : ''}>${o}</label>`).join('')}</span></div>`;
    return `<div class="row"${hint}><span>${d.label}:</span><span class="sp" data-path="${path}"><input value="${fmt(v, d)}" inputmode="decimal"><b class="up">▲</b><b class="dn">▼</b></span></div>`;
  }
  const paramsHTML = (defs, vals, prefix) => defs.map(d => ctl(d, vals[d.k], `${prefix}.${d.k}`)).join('');
  function target(path) {
    const [a, k] = path.split('.');
    if (a === 'cdef') return { obj: S.createDefaults[S.createType], def: TYPES[S.createType].p.find(d => d.k === k), k, apply: () => {} };
    if (a === 'obj') { const o = S.sel; return { obj: o.src.p, def: TYPES[o.type].p.find(d => d.k === k), k, apply: () => rebuildShared(o) }; }
    if (a.startsWith('mod')) { const o = S.sel, m = o.src.mods[+a.slice(3)]; return { obj: m.p, def: MODS[m.type].p.find(d => d.k === k), k, apply: () => rebuildShared(o) }; }
    if (a === 'tr') { const o = S.sel, ax = 'xyz'['XYZ'.indexOf(k[1])], g = o.group;
      const get = () => k[0] === 'p' ? g.position[ax] : k[0] === 'r' ? g.rotation[ax] / D2R : g.scale[ax] * 100;
      return { obj: new Proxy({}, { get: () => get(), set: (_, __, v) => { if (k[0] === 'p') g.position[ax] = v; else if (k[0] === 'r') g.rotation[ax] = v * D2R; else g.scale[ax] = Math.max(0.0001, v / 100); return true; } }),
        def: { kind: 'num', unit: k[0] === 'p' ? 'cm' : k[0] === 'r' ? '°' : '%', min: -1e6, max: 1e6 }, k: 'v', apply: () => { updateTypeIn(); updateBrackets(); req(); } };
    }
  }
  function setVal(path, v, commitNow) {
    const tg = target(path); if (!tg || !tg.def) return;
    if (tg.def.kind === 'num') { v = Math.min(tg.def.max, Math.max(tg.def.min, v)); if (tg.def.int) v = Math.round(v); }
    tg.obj[tg.k] = v; tg.apply();
    const sp = CP.querySelector(`.sp[data-path="${path}"] input`); if (sp && document.activeElement !== sp) sp.value = fmt(v, tg.def);
    if (commitNow) commit(); checkTasksSoon();
  }
  CP.addEventListener('click', e => {
    const h = e.target.closest('.ro-h'); if (h) { const r = h.parentElement, id = r.dataset.ro; const c = !r.classList.contains('closed'); S['ro_' + id] = c ? 'c' : 'o'; r.classList.toggle('closed', c); h.firstElementChild.textContent = c ? '+' : '−'; return; }
    const b = e.target.closest('[data-act]'); if (b) action(b.dataset.act, b.dataset.arg);
  });
  CP.addEventListener('change', e => {
    const el = e.target, path = el.dataset.path;
    if (path && el.type === 'checkbox') setVal(path, el.checked, true);
    else if (path && el.type === 'radio') setVal(path, el.value, true);
    else if (path && el.type === 'color') setVal(path, el.value, true);
    else if (el.id === 'mxName' && S.sel) { S.sel.name = el.value.trim() || S.sel.name; renderList(); commit(); }
    else if (el.id === 'mxColor' && S.sel) { S.sel.color = el.value; if (!isLight(S.sel)) { S.sel.wire.material.color.set(el.value); applyMat(S.sel); } renderList(); commit(); req(); }
    else if (el.id === 'mxModList' && el.value) { addMod(el.value); el.value = ''; }
    else if (el.dataset.act2 && S.sel) { if (el.dataset.act2 === 'see') S.sel.see = el.checked; if (el.dataset.act2 === 'box') S.sel.asBox = el.checked; applyMat(S.sel); commit(); req(); }
  });
  CP.addEventListener('input', e => {
    const el = e.target; if (el.id === 'mxName' && S.sel) { S.sel.name = el.value; renderList(); checkTasksSoon(); return; }
    const sp = el.closest('.sp'); if (sp && sp.dataset.path) { const v = parseFloat(el.value.replace(',', '.')); if (!isNaN(v)) setVal(sp.dataset.path, v, false); }
    if (el.type === 'color' && el.dataset.path) setVal(el.dataset.path, el.value, false);
  });
  CP.addEventListener('keydown', e => { if (e.target.closest('.sp') && e.key === 'Enter') e.target.blur(); e.stopPropagation(); });
  CP.addEventListener('focusout', e => {
    const sp = e.target.closest('.sp');
    if (sp && sp.dataset.path) { const v = parseFloat(e.target.value.replace(',', '.')); if (!isNaN(v)) setVal(sp.dataset.path, v, true); else { const tg = target(sp.dataset.path); e.target.value = fmt(tg.obj[tg.k], tg.def); } }
    if (sp && sp.dataset.kb) S.kbd[sp.dataset.kb] = parseFloat(e.target.value.replace(',', '.')) || 0;
  });
  CP.addEventListener('pointerdown', e => {
    const ar = e.target.closest('.sp b'); if (!ar) return; e.preventDefault();
    const sp = ar.parentElement, tg = target(sp.dataset.path), d = tg.def, v0 = +tg.obj[tg.k], y0 = e.clientY;
    const step = d.step || (d.int ? 1 : d.unit === '°' || d.unit === '%' ? 1 : Math.max(0.1, Math.abs(v0) * 0.01 + 0.1));
    let moved = false;
    const mv = ev => { const dy = y0 - ev.clientY; if (Math.abs(dy) > 3) moved = true; if (moved) setVal(sp.dataset.path, v0 + Math.round(dy / (d.int ? 6 : 2)) * step, false); };
    const up = () => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); if (!moved) setVal(sp.dataset.path, v0 + (ar.classList.contains('up') ? step : -step), false); commit(); };
    window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
  });
  CP.addEventListener('pointerover', e => { const h = e.target.closest('[data-hint]'); if (h) setPrompt(h.dataset.hint); });
  CP.addEventListener('focusin', e => { const h = e.target.closest('[data-hint]'); if (h) setPrompt(h.dataset.hint); });

  const nameColor = o => ro('Name and Color', `<div class="nc"><input id="mxName" value="${esc(o ? o.name : '')}" ${o ? '' : 'disabled'}><input type="color" id="mxColor" value="${o ? o.color : '#888888'}" ${o ? '' : 'disabled'}></div>`, 'nc');
  const visParams = o => TYPES[o.type].p;
  function renderCP() {
    $$('#mxTabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === S.tab));
    const o = S.sel; let h = '';
    if (S.tab === 'create') {
      const ct = S.createType;
      h += `<div class="cats">${[['geo', '●', 'Geometry'], ['shape', '〰', 'Shapes'], ['light', '✺', 'Lights'], [null, '🎥', 'Cameras'], [null, '✚', 'Helpers'], [null, '≋', 'Space Warps'], [null, '⚙', 'Systems']].map(([c, ic, ti]) => `<b class="${!c ? 'dis' : S.cat === c ? 'on' : ''}" ${c ? `data-act="cat" data-arg="${c}"` : ''} title="${ti}">${ic}</b>`).join('')}</div>`;
      h += `<select class="mx-sel wide" disabled><option>${CAT_TITLE[S.cat]}</option></select>`;
      h += ro('Object Type', `<label class="cb"><input type="checkbox" disabled> AutoGrid</label><div class="otypes">${CATS[S.cat].map(x => `<button data-act="ctype" data-arg="${x}" class="${ct === x ? 'on' : ''}">${x}</button>`).join('')}</div>`, 'ot');
      const edit = S.justCreated && S.justCreated === o ? o : null;
      if (edit) { h += nameColor(edit); h += ro('Parameters', paramsHTML(visParams(edit), edit.src.p, 'obj'), 'par'); }
      else if (ct) {
        h += nameColor(null); S.kbd = S.kbd || { x: 0, y: 0, z: 0 };
        if (ct !== 'Line') h += ro('Keyboard Entry', ['x', 'y', 'z'].map(a => `<div class="row"><span>${a.toUpperCase()}:</span><span class="sp kb" data-kb="${a}"><input value="${S.kbd[a]}"></span></div>`).join('') + `<button class="wide" data-act="kbcreate">Create</button>`, 'kb', true);
        else h += `<p class="mx-info">${esc(t('line_help', ''))}</p>`;
        h += ro('Parameters', paramsHTML(TYPES[ct].p, S.createDefaults[ct], 'cdef'), 'par');
      }
    } else if (!o) h = `<p class="mx-info">${esc(TX.no_sel_modify)}</p>`;
    else if (S.tab === 'modify') {
      h += `<div class="nc"><input id="mxName" value="${esc(o.name)}"><input type="color" id="mxColor" value="${o.color}"></div>`;
      if (isLight(o)) { h += ro('General Parameters', paramsHTML(visParams(o), o.src.p, 'obj'), 'par'); }
      else {
        const mlist = Object.keys(MODS).filter(m => o.top === 'shape' ? ['conv', 'deform'].includes(MODS[m].kind) : MODS[m].kind !== 'conv');
        h += `<select id="mxModList" class="mx-sel wide"><option value="">Modifier List</option>${mlist.map(m => `<option>${m}</option>`).join('')}<option disabled>Edit Poly (3ds Max)</option><option disabled>Shell (3ds Max)</option></select>`;
        const mods = o.src.mods, inst = S.objs.filter(x => x.src === o.src).length;
        h += `<div class="stack">${mods.map((m, i) => ({ m, i })).reverse().map(({ m, i }) => `<div class="si${S.modSel === i ? ' on' : ''}" data-act="msel" data-arg="${i}"><b data-act="mon" data-arg="${i}" class="${m.on ? '' : 'off'}">💡</b>${m.type}</div>`).join('')}
          <div class="si base${S.modSel === -1 ? ' on' : ''}" data-act="msel" data-arg="-1">${inst > 1 ? '<i>' + o.type + '</i>' : o.type}</div></div>
          <div class="stackbtn"><button disabled title="Pin Stack">📌</button><button disabled title="Show end result">⊓</button><button data-act="unique" title="Make Unique" ${inst > 1 || S.objs.some(x => x !== o && x.src.p === o.src.p) ? '' : 'disabled'}>⊘</button><button data-act="mdel" title="Remove modifier from the stack" ${S.modSel >= 0 ? '' : 'disabled'}>🗑</button></div>`;
        if (S.modSel >= 0 && mods[S.modSel]) h += ro('Parameters', paramsHTML(MODS[mods[S.modSel].type].p, mods[S.modSel].p, 'mod' + S.modSel), 'mpar');
        else h += ro('Parameters', paramsHTML(visParams(o), o.src.p, 'obj'), 'par');
      }
      h += `<button class="wide danger" data-act="delete">🗑 Delete — ${esc(o.name)}</button>`;
    } else if (S.tab === 'hierarchy') {
      h += `<div class="seg"><b class="on">Pivot</b><b class="dis">IK</b><b class="dis">Link Info</b></div>`;
      h += ro('Adjust Pivot', `<p class="mx-mini">Alignment:</p><button class="wide" data-act="pcenter">Center to Object</button><button class="wide" data-act="pbase">Pivot to Base (Z min)</button><button class="wide" data-act="pminx" title="${esc(t('pminx_hint', ''))}">Pivot to Left Edge (X min)</button><button class="wide" data-act="preset">Reset Pivot</button>`, 'piv');
      h += ro('Adjust Transform', `<button class="wide" data-act="rxform">Reset: Transform (Reset XForm)</button><button class="wide" data-act="rscale">Reset: Scale</button>`, 'adj');
    } else if (S.tab === 'motion') {
      const tr = (lbl, k, unit) => ['X', 'Y', 'Z'].map(a => ctl({ k: 't', label: `${lbl} ${a}`, kind: 'num', unit, min: -1e6, max: 1e6 }, target('tr.' + k + a).obj.v, 'tr.' + k + a)).join('');
      h += ro('Position', tr('Position', 'p', 'cm'), 'mp') + ro('Rotation (Euler XYZ)', tr('Rotation', 'r', '°'), 'mr') + ro('Scale', tr('Scale', 's', '%'), 'ms');
    } else if (S.tab === 'display') {
      h += ro('Hide', `<button class="wide" data-act="hidesel">Hide Selected</button><button class="wide" data-act="hideun">Hide Unselected</button><button class="wide" data-act="unhide">Unhide All</button>`, 'hide');
      h += ro('Display Properties', `<label class="cb"><input type="checkbox" data-act2="see" ${o.see ? 'checked' : ''}> See-Through (Alt+X)</label><label class="cb"><input type="checkbox" data-act2="box" ${o.asBox ? 'checked' : ''}> Display as Box</label>`, 'dp');
    } else if (S.tab === 'utilities') {
      if (isLight(o)) h += `<p class="mx-info">—</p>`;
      else if (o.top === 'shape') h += ro('Measure', `<div class="kv"><span>Object</span><b>${esc(o.name)}</b><span>Length</span><b>${o.len.toFixed(1)} cm</b><span>Vertices</span><b>${o.verts}</b></div>`, 'meas');
      else { const m = measure(o); h += ro('Measure', `<div class="kv"><span>Object</span><b>${esc(o.name)}</b><span>Surface Area</span><b>${m.area.toFixed(1)} cm²</b><span>Volume</span><b>${m.vol.toFixed(1)} cm³</b><span>Dimensions</span><b>X ${m.d.x.toFixed(1)} · Y ${m.d.y.toFixed(1)} · Z ${m.d.z.toFixed(1)} cm</b><span>Polys</span><b>${o.polys}</b><span>Tris</span><b>${o.tris}</b><span>Verts</span><b>${o.verts}</b></div><p class="mx-mini">${esc(TX.measure_note)}</p>`, 'meas'); }
      h += ro('Export', `<button class="wide" data-act="export">File → Export → GLB (.glb)</button>`, 'exp');
    }
    CP.innerHTML = h;
  }
  function measure(o) {
    const g = o.mesh.geometry, P = g.getAttribute('position'), s = o.group.scale; let area = 0, vol = 0;
    if (!P || !g.index) return { area: 0, vol: 0, d: new THREE.Vector3() };
    const I = g.index.array, a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), ab = new THREE.Vector3(), ac = new THREE.Vector3();
    for (let i = 0; i < I.length; i += 3) {
      a.fromBufferAttribute(P, I[i]).multiply(s); b.fromBufferAttribute(P, I[i + 1]).multiply(s); c.fromBufferAttribute(P, I[i + 2]).multiply(s);
      area += ab.subVectors(b, a).cross(ac.subVectors(c, a)).length() / 2; vol += a.dot(b.clone().cross(c)) / 6;
    }
    const d = new THREE.Vector3(); g.boundingBox.getSize(d).multiply(s); return { area, vol: Math.abs(vol), d };
  }
  function addMod(type) {
    const o = S.sel; if (!o || isLight(o)) return;
    o.src.mods.push({ type, on: true, p: defaults(MODS[type].p) }); S.modSel = o.src.mods.length - 1; rebuildShared(o); renderCP(); commit();
  }
  function action(a, arg) {
    const o = S.sel;
    if (a === 'cat') { S.cat = arg; S.createType = null; if (S.mode === 'create') setMode('select'); renderCP(); return; }
    if (a === 'ctype') { if (S.draw) finishLine(); S.createType = arg; S.justCreated = null; S.mode = S.createType ? 'create' : 'select'; tcs.forEach(x => x.detach()); renderCP(); syncTool(); setPrompt(); return; }
    if (a === 'kbcreate') { const k = S.kbd; create(S.createType, [k.x, k.y, k.z]); return; }
    if (!o) return;
    if (a === 'delete') return delSel();
    if (a === 'export') return exportGLB();
    if (a === 'msel') { S.modSel = +arg; renderCP(); return; }
    if (a === 'mon') { const m = o.src.mods[+arg]; m.on = !m.on; rebuildShared(o); renderCP(); commit(); return; }
    if (a === 'mdel') { o.src.mods.splice(S.modSel, 1); S.modSel = -1; rebuildShared(o); renderCP(); commit(); return; }
    if (a === 'unique') { o.src = { p: JSON.parse(JSON.stringify(o.src.p)), mods: o.src.mods.map(m => ({ ...m, p: { ...m.p } })) }; rebuild(o); renderCP(); commit(); return; }
    if (['pcenter', 'pbase', 'pminx', 'preset'].includes(a)) {
      const bb = bboxOf(o), c = new THREE.Vector3(); bb.getCenter(c);
      if (a === 'pbase') c.z = bb.min.z; if (a === 'pminx') { c.x = bb.min.x; } if (a === 'preset') c.copy(o.piv).negate();
      o.piv.sub(c); o.group.position.add(c.clone().multiply(o.group.scale).applyQuaternion(o.group.quaternion)); rebuild(o); commit(); updateTypeIn(); toast(a === 'pminx' ? 'Pivot → X min' : 'Pivot ✓'); return;
    }
    if (a === 'rxform') { o.group.rotation.set(0, 0, 0); o.group.scale.set(1, 1, 1); S.flags.xform = true; }
    if (a === 'rscale') o.group.scale.set(1, 1, 1);
    if (a === 'hidesel') { o.hidden = true; select(null); }
    if (a === 'hideun') S.objs.forEach(x => x !== o && (x.hidden = true));
    if (a === 'unhide') S.objs.forEach(x => x.hidden = false);
    renderList(); updateTypeIn(); updateBrackets(); commit(); req();
  }
  function create(type, at) {
    const p = JSON.parse(JSON.stringify(S.createDefaults[type]));
    if (type === 'Spot' || type === 'Sun') { p.tx = 0; p.ty = 0; p.tz = 0; at = [at[0], at[1], Math.max(at[2], 120)]; }
    if (type === 'Omni') at = [at[0], at[1], Math.max(at[2], 80)];
    const o = makeObj(type, p, at); S.justCreated = o; S.tab = 'create'; select(o); S.justCreated = o; renderCP(); commit(); toast(`${o.name} ✓`);
    if (isLight(o) && S.objs.filter(isLight).length === 1) toast(t('lights_note', ''));
  }

  /* ---------- Line chizish ---------- */
  function basisFor(i) {
    const v = VP[i], d = VIEWS[v.view];
    if (!d.ortho) return { U: new THREE.Vector3(1, 0, 0), V: new THREE.Vector3(0, 1, 0), N: new THREE.Vector3(0, 0, 1) };
    v.cam.updateMatrixWorld(); const e = v.cam.matrixWorld.elements;
    return { U: new THREE.Vector3(e[0], e[1], e[2]).normalize(), V: new THREE.Vector3(e[4], e[5], e[6]).normalize(), N: new THREE.Vector3(e[8], e[9], e[10]).normalize() };
  }
  function lineClick(i, hit, ev) {
    if (!S.draw) {
      const b = basisFor(i), p = JSON.parse(JSON.stringify(S.createDefaults.Line)); p.pts = [[0, 0]];
      const o = makeObj('Line', p, hit.toArray()); o.group.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(b.U, b.V, b.N));
      S.draw = { o, b, O: hit.clone(), vp: i }; $('#mxFinish').hidden = false; select(o); S.justCreated = o; setPrompt(t('line_prompt', '')); return;
    }
    const D = S.draw, rel = hit.clone().sub(D.O), q = [Math.round(rel.dot(D.b.U) * 10) / 10, Math.round(rel.dot(D.b.V) * 10) / 10];
    const pts = D.o.src.p.pts, f = D.O.clone().project(VP[i].cam), r = vpEls[i].getBoundingClientRect();
    const fx = (f.x + 1) / 2 * r.width + r.left, fy = (1 - f.y) / 2 * r.height + r.top;
    if (pts.length >= 3 && Math.hypot(ev.clientX - fx, ev.clientY - fy) < (isTouch ? 22 : 10)) { D.o.src.p.closed = true; finishLine(); toast('Closed ✓'); return; }
    pts.push(q); rebuild(D.o);
  }
  function finishLine() {
    const D = S.draw; if (!D) return; S.draw = null; $('#mxFinish').hidden = true;
    if (D.o.src.p.pts.length < 2) { removeObj(D.o); return; }
    rebuild(D.o); select(D.o); S.justCreated = D.o; renderCP(); commit(); toast(D.o.name + ' ✓'); setPrompt();
  }
  $('#mxFinish').addEventListener('click', finishLine);

  /* ---------- transform type-in ---------- */
  function updateTypeIn() {
    const o = S.sel, ins = $$('[data-ti]');
    ins.forEach((el, i) => {
      if (document.activeElement === el) return; const ax = 'xyz'[i];
      if (!o) { el.value = ''; el.disabled = true; return; } el.disabled = false;
      const g = o.group, m = S.mode;
      el.value = m === 'rotate' ? (g.rotation[ax] / D2R).toFixed(1) : m === 'scale' ? (g.scale[ax] * 100).toFixed(1) : g.position[ax].toFixed(1);
    });
    $('.mx-lock').textContent = S.mode === 'rotate' ? '°' : S.mode === 'scale' ? '%' : 'cm';
  }
  $$('[data-ti]').forEach((el, i) => {
    const apply = () => {
      const o = S.sel; if (!o) return; const v = parseFloat(el.value.replace(',', '.')); if (isNaN(v)) return updateTypeIn(); const ax = 'xyz'[i], g = o.group;
      if (S.mode === 'rotate') g.rotation[ax] = v * D2R; else if (S.mode === 'scale') g.scale[ax] = Math.max(0.0001, v / 100); else g.position[ax] = v;
      updateBrackets(); req(); commit(); if (S.tab === 'motion') renderCP();
    };
    el.addEventListener('change', apply); el.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') el.blur(); });
  });

  /* ---------- prompt / toast ---------- */
  function setPrompt(x) {
    $('#mxSelN').textContent = S.sel ? TX.one_sel : TX.none_sel;
    if (x) { $('#mxPrompt').textContent = x; return; }
    $('#mxPrompt').textContent = S.draw ? t('line_prompt', '') : S.mode === 'create' ? (S.createType === 'Line' ? t('line_help', '') : TX.prompt_create.replace('{t}', S.createType)) : S.mode === 'move' ? TX.prompt_move : S.mode === 'rotate' ? TX.prompt_rotate : S.mode === 'scale' ? TX.prompt_scale : (isTouch ? TX.prompt_select_touch : TX.prompt_select);
  }
  let toastT; function toast(x) { if (!x) return; const el = $('#mxToast'); el.textContent = x; el.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => el.hidden = true, 2200); }

  /* ---------- viewport hodisalari ---------- */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function pick(i, ev) { const r = vpEls[i].getBoundingClientRect(); ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, VP[i].cam); return { rc: ray, r }; }
  function planeHit(i, rc) {
    const v = VIEWS[VP[i].view], n = v.plane === 'XY' ? [0, 0, 1] : v.plane === 'XZ' ? [0, 1, 0] : [1, 0, 0], hit = new THREE.Vector3();
    if (!rc.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(...n), 0), hit)) return null;
    if (S.snap) hit.set(Math.round(hit.x / 10) * 10, Math.round(hit.y / 10) * 10, Math.round(hit.z / 10) * 10);
    return hit.set(Math.round(hit.x * 10) / 10, Math.round(hit.y * 10) / 10, Math.round(hit.z * 10) / 10);
  }
  vpEls.forEach((el, i) => {
    let down = null;
    el.addEventListener('contextmenu', e => { e.preventDefault(); if (S.draw) finishLine(); });
    el.addEventListener('dblclick', () => { if (S.draw) finishLine(); });
    el.addEventListener('pointerdown', ev => {
      if (ev.target.closest('.vpl')) return;
      if (S.active !== i) { S.active = i; markActive(); }
      down = { x: ev.clientX, y: ev.clientY, t: performance.now(), alt: ev.altKey };
      const oc = VP[i].controls, ortho = VIEWS[VP[i].view].ortho;
      oc.mouseButtons.LEFT = ev.altKey && ev.button === 0 ? (ortho ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE) : navMode === 'pan' ? THREE.MOUSE.PAN : navMode === 'orbit' && !ortho ? THREE.MOUSE.ROTATE : -1;
    }, true);
    el.addEventListener('pointerup', ev => {
      if (!down) return; const moved = Math.hypot(ev.clientX - down.x, ev.clientY - down.y) > 6, dt = performance.now() - down.t; const d0 = down; down = null;
      if (moved || dt > 700 || d0.alt || S.dragging || (S.justDragged && performance.now() - S.justDragged < 150) || (ev.pointerType === 'mouse' && ev.button !== 0)) return;
      const { rc, r } = pick(i, ev);
      if (S.mode === 'create' && S.createType) {
        if (S.draw && S.draw.vp !== i) return toast(t('line_same_vp', ''));
        const hit = S.draw ? (() => { const h = new THREE.Vector3(); return rc.ray.intersectPlane(new THREE.Plane().setFromNormalAndCoplanarPoint(S.draw.b.N, S.draw.O), h) ? h : null; })() : planeHit(i, rc);
        if (!hit) return;
        if (S.createType === 'Line') return lineClick(i, hit, ev);
        create(S.createType, hit.toArray()); return;
      }
      if (tcs[i].axis) return;
      const v = VP[i], wpp = v.cam.isOrthographicCamera ? (v.cam.top - v.cam.bottom) / v.cam.zoom / r.height : v.cam.position.distanceTo(v.controls.target) * 0.0018;
      ray.params.Line = { threshold: wpp * (isTouch ? 10 : 5) };
      const cands = S.objs.filter(o => !o.hidden).flatMap(o => o.top === 'shape' ? [o.wire] : [o.mesh]);
      const hits = rc.intersectObjects(cands, false);
      select(hits.length ? hits[0].object.userData.obj : null);
    });
    el.addEventListener('wheel', () => { if (S.active !== i) { S.active = i; markActive(); } }, { passive: true });
    el.querySelector('.vpl').addEventListener('click', ev => {
      const a = ev.target.dataset.a; if (!a) return; S.active = i; markActive();
      if (a === 'shade') { const v = VP[i]; v.shade = { shaded: 'edged', edged: 'wire', wire: 'shaded' }[v.shade]; S.flags.shade = true; setupView(i, true); checkTasksSoon(); }
      if (a === 'view') dropdown(ev.target, ['Perspective', 'Top', 'Bottom', 'Front', 'Back', 'Left', 'Right'], v => { VP[i].view = v; setupView(i); zoomExt(i); });
      if (a === 'plus') dropdown(ev.target, ['Maximize Viewport (Alt+W)', 'Show Grids (G)', 'Viewport Statistics (7)'], v => { if (v.startsWith('Max')) toggleMax(); else if (v.startsWith('Show')) { S.gridOn = !S.gridOn; req(); } else toggleStats(); });
    });
  });
  function markActive() { vpEls.forEach((e, k) => e.classList.toggle('active', k === S.active)); $$('.mx-vtabs button').forEach((b, k) => b.classList.toggle('on', S.maxed ? k === S.active : k === 4)); }
  let navMode = null;
  $('.mx-nav').addEventListener('click', e => {
    const b = e.target.closest('[data-nav]'); if (!b) return; const n = b.dataset.nav;
    if (n === 'ext') zoomExtAll(); else if (n === 'max') toggleMax();
    else if (n === 'pan' || n === 'orbit') { navMode = navMode === n ? null : n; $$('.mx-nav button').forEach(x => x.classList.toggle('on', x.dataset.nav === navMode)); }
    else if (n === 'zoom') { const v = VP[S.active]; v.cam.isOrthographicCamera ? (v.cam.zoom *= 1.25, v.cam.updateProjectionMatrix()) : v.cam.position.lerp(v.controls.target, 0.2); v.controls.update(); req(); }
    else if (n === 'fov') { const v = VP[S.active]; if (v.cam.isPerspectiveCamera) { v.cam.fov = v.cam.fov > 50 ? 30 : v.cam.fov + 10; v.cam.updateProjectionMatrix(); req(); toast('FOV ' + v.cam.fov + '°'); } }
  });
  $('.mx-vtabs').addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (!b) return; const k = +b.dataset.v; if (k === 4) S.maxed = false; else { S.active = k; S.maxed = true; S.flags.maxed = true; } layout(); markActive(); req(); checkTasksSoon(); });
  function toggleMax() { S.maxed = !S.maxed; if (S.maxed) S.flags.maxed = true; layout(); markActive(); req(); checkTasksSoon(); }
  function toggleStats() { S.stats = !S.stats; if (S.stats) S.flags.stats = true; req(); checkTasksSoon(); }

  function sceneBox(onlySel) {
    scene.updateMatrixWorld(true); const bb = new THREE.Box3();
    (onlySel && S.sel ? [S.sel] : S.objs.filter(o => !o.hidden && !isLight(o))).forEach(o => bb.expandByObject(o.top === 'shape' ? o.wire : o.mesh));
    if (bb.isEmpty()) bb.set(new THREE.Vector3(-50, -50, 0), new THREE.Vector3(50, 50, 40)); return bb;
  }
  function zoomExt(i, bb = sceneBox()) {
    const v = VP[i], c = bb.getCenter(new THREE.Vector3()), r = Math.max(10, bb.getBoundingSphere(new THREE.Sphere()).radius), d = VIEWS[v.view];
    v.controls.target.copy(c);
    if (v.cam.isOrthographicCamera) { v.cam.position.set(c.x + d.dir[0] * 1000, c.y + d.dir[1] * 1000, c.z + d.dir[2] * 1000); v.cam.zoom = (v.cam.top - v.cam.bottom) / (2.15 * r * Math.max(1, (v.cam.top - v.cam.bottom) / (v.cam.right - v.cam.left))); v.cam.updateProjectionMatrix(); }
    else { const dir = v.cam.position.clone().sub(v.controls.target).normalize(); if (!isFinite(dir.x)) dir.set(...d.dir); v.cam.position.copy(c).addScaledVector(dir, r / Math.sin(v.cam.fov * D2R / 2) * 0.82 / Math.min(1, v.cam.aspect)); }
    v.controls.update(); req();
  }
  function zoomExtAll() { const bb = sceneBox(); VP.forEach((_, i) => zoomExt(i, bb)); }

  /* ---------- menyular ---------- */
  const MENUS = {
    File: [['New Scene', 'new', 'Ctrl+N'], ['Save to browser', 'save'], ['Open from browser', 'open'], ['Export → GLB (.glb)', 'export'], ['Save viewport image (PNG)', 'shot']],
    Edit: [['Undo', 'undo', 'Ctrl+Z'], ['Redo', 'redo', 'Ctrl+Y'], ['Delete', 'del', 'Delete'], ['Clone', 'clone', 'Ctrl+V'], ['Select None', 'selnone', 'Ctrl+D']],
    Tools: [['Array…', 'array'], ['Material Editor', 'mat', 'M']],
    Create: [['Standard Primitives', null], ...CATS.geo.map(x => ['   ' + x, 'c:' + x]), ['Shapes', null], ...CATS.shape.map(x => ['   ' + x, 'c:' + x]), ['Lights', null], ...CATS.light.map(x => ['   ' + x, 'c:' + x])],
    Modifiers: [['Parametric Deformers', null], ...['Bend', 'Taper', 'Twist', 'Spherify', 'Noise'].map(m => ['   ' + m, 'm:' + m]), ['Subdivision Surfaces', null], ['   TurboSmooth', 'm:TurboSmooth'], ['UV Coordinates', null], ['   UVW Map', 'm:UVW Map'], ['Mesh Editing (Shapes)', null], ['   Extrude', 'm:Extrude'], ['   Lathe', 'm:Lathe']],
    Views: [['Maximize Viewport Toggle', 'max', 'Alt+W'], ['Zoom Extents All', 'ext', 'Z'], ['Show Grids', 'grid', 'G'], ['Viewport Statistics', 'stats', '7']],
    Rendering: [['Render', 'render', 'Shift+Q'], ['Material Editor', 'mat', 'M']],
    Help: [[TX.help_title, 'help'], ['3ds Max Help (autodesk.com)', 'ahelp']],
  };
  function dropdown(anchor, items, cb) {
    const dd = $('#mxDD'), r = anchor.getBoundingClientRect(), rr = root.firstElementChild.getBoundingClientRect();
    dd.innerHTML = items.map((it, k) => typeof it === 'string' ? `<button data-k="${k}">${esc(it)}</button>` : it[1] === null ? `<div class="hd">${esc(it[0])}</div>` : `<button data-k="${k}">${esc(it[0])}<kbd>${it[2] || ''}</kbd></button>`).join('');
    dd.style.left = Math.max(0, Math.min(r.left - rr.left, rr.width - 240)) + 'px'; dd.style.top = (r.bottom - rr.top) + 'px'; dd.hidden = false;
    dd.onclick = e => { const b = e.target.closest('[data-k]'); if (!b) return; dd.hidden = true; const it = items[+b.dataset.k]; cb(typeof it === 'string' ? it : it[1]); };
  }
  root.addEventListener('pointerdown', e => { if (!e.target.closest('#mxDD') && !e.target.closest('[data-menu]') && !e.target.closest('.vpl')) $('#mxDD').hidden = true; });
  $('.mx-menu').addEventListener('click', e => { const b = e.target.closest('[data-menu]'); if (!b) return; dropdown(b, MENUS[b.dataset.menu] || [[TX.unavailable, null]], cmd); });
  function cmd(c) {
    if (!c) return;
    if (c.startsWith('c:')) { const x = c.slice(2); S.tab = 'create'; S.cat = TYPES[x].cat; action('ctype', x); return; }
    if (c.startsWith('m:')) { if (!S.sel) return toast(TX.no_sel_modify); S.tab = 'modify'; const m = c.slice(2); const ok = S.sel.top === 'shape' ? ['conv', 'deform'].includes(MODS[m].kind) : MODS[m].kind !== 'conv'; if (!ok || isLight(S.sel)) return toast(t('mod_bad', '')); addMod(m); return; }
    ({
      new: () => { [...S.objs].forEach(removeObj); S.counters = {}; S.sample = false; commit(); toast(TX.new_scene); renderTasks(); },
      save: () => { try { localStorage.setItem(KEY + '_saved', serialize()); toast(TX.saved); } catch (e) {} },
      open: () => { let s = null; try { s = localStorage.getItem(KEY + '_saved'); } catch (e) {} if (s) { restore(s); commit(); toast(TX.loaded); } else toast(TX.nothing_saved); },
      shot: () => { render(); const a = document.createElement('a'); a.download = '3dsmax_simulyator.png'; a.href = canvas.toDataURL('image/png'); a.click(); toast(TX.shot); },
      export: exportGLB, render: renderFrame, mat: matEditor, array: arrayDialog,
      undo, redo, del: delSel, clone: cloneDialog, selnone: () => select(null),
      max: toggleMax, ext: zoomExtAll, grid: () => { S.gridOn = !S.gridOn; req(); }, stats: toggleStats,
      help: helpDialog, ahelp: () => window.open('https://help.autodesk.com/view/3DSMAX/2026/ENU/', '_blank'),
    }[c] || (() => {}))();
  }
  function modal(html, onOk, wide) {
    const m = $('#mxModal'); m.innerHTML = `<div class="mx-dlg${wide ? ' wide' : ''}">${html}<div class="mx-dlgb">${onOk ? `<button data-ok>${esc(TX.ok)}</button>` : ''}<button data-cancel>${esc(onOk ? TX.cancel : 'OK')}</button></div></div>`; m.hidden = false;
    m.onclick = e => { if (e.target.closest('[data-ok]')) { onOk(m); m.hidden = true; } else if (e.target.closest('[data-cancel]') || e.target === m) m.hidden = true; };
    m.onkeydown = e => e.stopPropagation(); return m;
  }
  function cloneObj(o, src, pos) { const c = makeObj(o.type, null, pos || o.group.position.toArray(), { src, color: o.color, mtl: o.mtl }); c.group.quaternion.copy(o.group.quaternion); c.group.scale.copy(o.group.scale); c.piv.copy(o.piv); rebuild(c); return c; }
  const srcFor = (o, k) => k === 'inst' ? o.src : k === 'ref' ? { p: o.src.p, mods: o.src.mods.map(x => ({ ...x, p: { ...x.p } })) } : { p: JSON.parse(JSON.stringify(o.src.p)), mods: o.src.mods.map(x => ({ ...x, p: { ...x.p } })) };
  function cloneDialog() {
    const o = S.sel; if (!o) return toast(TX.no_sel_modify);
    modal(`<h3>${esc(TX.clone_title)}</h3><fieldset><legend>Object</legend>
      <label><input type="radio" name="ck" value="copy"> ${esc(TX.clone_copy)}</label><label><input type="radio" name="ck" value="inst" checked> ${esc(TX.clone_inst)}</label><label><input type="radio" name="ck" value="ref"> ${esc(TX.clone_ref)}</label></fieldset>
      <label class="row"><span>${esc(TX.clone_n)}:</span><input type="number" id="ckN" value="1" min="1" max="50"></label><p class="mx-mini">${esc(TX.clone_tip)}</p>`, m => {
      const k = m.querySelector('[name=ck]:checked').value, n = Math.max(1, Math.min(50, +m.querySelector('#ckN').value || 1)); let lastO = o;
      for (let i = 0; i < n; i++) lastO = cloneObj(o, srcFor(o, k));
      select(lastO); commit(); toast(`${n} × ${k === 'inst' ? 'Instance' : k === 'ref' ? 'Reference' : 'Copy'}`);
    });
  }
  function doArray(o, n, opt) {
    const R = new THREE.Euler(...opt.rot.map(x => x * D2R)), q1 = new THREE.Quaternion().setFromEuler(R), out = [];
    const p0 = o.group.position.clone(), q0 = o.group.quaternion.clone(), s0 = o.group.scale.clone();
    for (let k = 1; k < n; k++) {
      const qk = new THREE.Quaternion(); for (let j = 0; j < k; j++) qk.multiply(q1);
      const pos = opt.world ? p0.clone().applyQuaternion(qk).add(new THREE.Vector3(...opt.move).multiplyScalar(k)) : p0.clone().add(new THREE.Vector3(...opt.move).multiplyScalar(k));
      const c = cloneObj(o, srcFor(o, opt.inst ? 'inst' : 'copy'), pos.toArray()); c.group.quaternion.copy(qk.clone().multiply(q0)); c.group.scale.copy(s0.clone().multiplyScalar(Math.pow((opt.scale || 100) / 100, k)));
      if (opt.name) c.name = opt.name + String(k + 1).padStart(2, '0'); out.push(c);
    }
    return out;
  }
  function arrayDialog() {
    const o = S.sel; if (!o) return toast(TX.no_sel_modify);
    const f = (id, v) => `<input type="number" id="${id}" value="${v}" step="any">`;
    modal(`<h3>Array — ${esc(o.name)}</h3><p class="mx-mini">${esc(t('array_tip', ''))}</p>
      <table class="mx-arr"><tr><th></th><th>X</th><th>Y</th><th>Z</th></tr><tr><td>Move (cm)</td><td>${f('amx', 0)}</td><td>${f('amy', 0)}</td><td>${f('amz', 20)}</td></tr><tr><td>Rotate (°)</td><td>${f('arx', 0)}</td><td>${f('ary', 0)}</td><td>${f('arz', 18)}</td></tr><tr><td>Scale (%)</td><td colspan="3">${f('asc', 100)}</td></tr></table>
      <label class="row"><span>Count (1D):</span><input type="number" id="acn" value="20" min="2" max="200"></label>
      <fieldset><legend>Type of Object</legend><label><input type="radio" name="aty" value="copy"> Copy</label><label><input type="radio" name="aty" value="inst" checked> Instance</label></fieldset>
      <fieldset><legend>${esc(t('array_center', 'Markaz'))}</legend><label><input type="radio" name="ace" value="world" checked> World (0, 0, 0)</label><label><input type="radio" name="ace" value="pivot"> Pivot</label></fieldset>`, m => {
      const g = id => +m.querySelector('#' + id).value || 0, n = Math.max(2, Math.min(200, g('acn') || 2));
      const out = doArray(o, n, { move: [g('amx'), g('amy'), g('amz')], rot: [g('arx'), g('ary'), g('arz')], scale: g('asc') || 100, inst: m.querySelector('[name=aty]:checked').value === 'inst', world: m.querySelector('[name=ace]:checked').value === 'world' });
      select(out[out.length - 1] || o); commit(); toast(`Array: ${n}`); zoomExtAll();
    });
  }
  const MAT_PRESETS = [['plastic', { color: '#d84a3a', rough: 0.55, metal: 0, opacity: 1, map: 'none' }], ['gold', { color: '#e3b04b', rough: 0.25, metal: 1, opacity: 1, map: 'none' }], ['chrome', { color: '#eaeaea', rough: 0.05, metal: 1, opacity: 1, map: 'none' }],
    ['glass', { color: '#bfe3ff', rough: 0.02, metal: 0, opacity: 0.3, map: 'none' }], ['rubber', { color: '#262626', rough: 0.95, metal: 0, opacity: 1, map: 'none' }], ['wood', { color: '#ffffff', rough: 0.6, metal: 0, opacity: 1, map: 'wood' }],
    ['brick', { color: '#ffffff', rough: 0.85, metal: 0, opacity: 1, map: 'brick' }], ['checker', { color: '#ffffff', rough: 0.7, metal: 0, opacity: 1, map: 'checker' }]];
  function matEditor() {
    const o = S.sel; if (!o || isLight(o)) return toast(t('mat_nosel', TX.no_sel_modify));
    const m = o.mtl || { color: o.color, rough: 0.6, metal: 0, opacity: 1, emis: '#000000', emisI: 0, map: 'none' };
    const names = TX.mat_names || {};
    const html = `<h3>Material Editor — Physical Material · ${esc(o.name)}</h3><div class="mx-presets">${MAT_PRESETS.map(([k]) => `<button data-pre="${k}">${esc(names[k] || k)}</button>`).join('')}</div>
      <div class="mx-mf"><label>Base Color<input type="color" id="mfc" value="${m.color || '#ffffff'}"></label>
      <label>Roughness <b id="mfrv">${(m.rough ?? 0.6).toFixed(2)}</b><input type="range" id="mfr" min="0" max="1" step="0.01" value="${m.rough ?? 0.6}"></label>
      <label>Metalness <b id="mfmv">${(m.metal ?? 0).toFixed(2)}</b><input type="range" id="mfm" min="0" max="1" step="0.01" value="${m.metal ?? 0}"></label>
      <label>Transparency <b id="mftv">${(1 - (m.opacity ?? 1)).toFixed(2)}</b><input type="range" id="mft" min="0" max="0.95" step="0.01" value="${1 - (m.opacity ?? 1)}"></label>
      <label>Emission<input type="color" id="mfe" value="${m.emis || '#000000'}"></label><label>Luminance <b id="mfiv">${(m.emisI ?? 0).toFixed(1)}</b><input type="range" id="mfi" min="0" max="5" step="0.1" value="${m.emisI ?? 0}"></label>
      <label>Base Color Map<select id="mfmap">${['none', 'checker', 'wood', 'brick', 'tiles'].map(x => `<option value="${x}" ${m.map === x ? 'selected' : ''}>${x === 'none' ? 'None' : x[0].toUpperCase() + x.slice(1)}</option>`).join('')}</select></label></div>
      <p class="mx-mini">${esc(t('mat_tip', ''))}</p><button class="wide" id="mfdef">${esc(t('mat_default', 'Default material'))}</button>`;
    const dlg = modal(html, null, true);
    const read = () => ({ color: dlg.querySelector('#mfc').value, rough: +dlg.querySelector('#mfr').value, metal: +dlg.querySelector('#mfm').value, opacity: 1 - +dlg.querySelector('#mft').value, emis: dlg.querySelector('#mfe').value, emisI: +dlg.querySelector('#mfi').value, map: dlg.querySelector('#mfmap').value });
    const apply = () => { o.mtl = read(); ['r', 'm', 't', 'i'].forEach(k => { const el = dlg.querySelector('#mf' + k + 'v'); const v = k === 't' ? +dlg.querySelector('#mft').value : +dlg.querySelector('#mf' + k).value; if (el) el.textContent = v.toFixed(k === 'i' ? 1 : 2); }); rebuild(o); checkTasksSoon(); };
    dlg.addEventListener('input', apply); dlg.addEventListener('change', () => { apply(); commit(); });
    dlg.querySelector('.mx-presets').addEventListener('click', e => { const b = e.target.closest('[data-pre]'); if (!b) return; const p = MAT_PRESETS.find(x => x[0] === b.dataset.pre)[1];
      dlg.querySelector('#mfc').value = p.color; dlg.querySelector('#mfr').value = p.rough; dlg.querySelector('#mfm').value = p.metal; dlg.querySelector('#mft').value = 1 - p.opacity; dlg.querySelector('#mfmap').value = p.map; apply(); commit(); });
    dlg.querySelector('#mfdef').addEventListener('click', () => { o.mtl = null; rebuild(o); commit(); dlg.hidden = true; });
  }
  function renderFrame() {
    const vi = VIEWS[VP[S.active].view].ortho ? 3 : S.active, v = VP[vi], W = 1280, Hh = 720;
    const cam = v.cam.clone(); if (cam.isPerspectiveCamera) cam.aspect = W / Hh; else { const hh = (cam.top - cam.bottom) / 2; cam.left = -hh * W / Hh; cam.right = hh * W / Hh; } cam.updateProjectionMatrix();
    const hide = []; const hideIt = x => { if (x.visible) { hide.push(x); x.visible = false; } };
    Object.values(grids).forEach(hideIt); tcs.forEach(x => hideIt(x.getHelper()));
    S.objs.forEach(o => { o.group.visible = !o.hidden; hideIt(o.wire); hideIt(o.brk); if (isLight(o)) hideIt(o.mesh); else o.mesh.visible = !o.asBox; });
    setLights(); renderer.setPixelRatio(1); renderer.setSize(W, Hh, false); renderer.setScissorTest(false); renderer.setViewport(0, 0, W, Hh);
    renderer.setClearColor(0x2b2b2b, 1); renderer.clear(); renderer.shadowMap.needsUpdate = true; renderer.render(scene, cam);
    const url = canvas.toDataURL('image/png');
    renderer.setClearColor(0x000000, 0); hide.forEach(x => x.visible = true); renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isTouch ? 1.5 : 2)); layout();
    S.flags.rendered = true; checkTasksSoon();
    modal(`<h3>Rendered Frame Window — ${v.view}, 1280 × 720</h3><img class="mx-rimg" src="${url}" alt=""><p><a class="mx-dl" download="render.png" href="${url}">PNG ${esc(t('save_word', 'saqlash'))}</a></p><p class="mx-mini">${esc(t('render_tip', ''))}</p>`, null, true);
  }
  async function exportGLB() {
    try {
      const { GLTFExporter } = await import('./lib/exporters/GLTFExporter.js');
      const rootG = new THREE.Group(); rootG.rotation.x = -Math.PI / 2; rootG.scale.setScalar(0.01); scene.updateMatrixWorld(true);
      S.objs.filter(o => !o.hidden && !isLight(o) && o.top === 'mesh').forEach(o => { const m = new THREE.Mesh(o.mesh.geometry, o.mat.clone()); m.name = o.name; o.group.matrixWorld.decompose(m.position, m.quaternion, m.scale); rootG.add(m); });
      if (!rootG.children.length) return toast(t('export_empty', ''));
      new GLTFExporter().parse(rootG, buf => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([buf], { type: 'model/gltf-binary' })); a.download = (LAB ? 'ish' + LAB : 'sahna') + '.glb'; a.click(); S.flags.exported = true; checkTasksSoon(); toast('GLB ✓'); }, e => toast(String(e)), { binary: true });
    } catch (e) { toast(String(e)); }
  }
  function helpDialog() { modal(`<h3>${esc(TX.help_title)}</h3><table class="mx-keys">${TX.help.map(([a, b]) => `<tr><td><kbd>${esc(a)}</kbd></td><td>${esc(b)}</td></tr>`).join('')}</table><p class="mx-mini">${esc(TX.note)}</p>`); }

  $('#mxTool').addEventListener('click', e => {
    const b = e.target.closest('[data-tb]'); if (!b) return; const x = b.dataset.tb;
    if (b.classList.contains('dis')) return toast(TX.unavailable);
    if (x === 'undo') undo(); else if (x === 'redo') redo(); else if (x === 'del') delSel();
    else if (['select', 'move', 'rotate', 'scale'].includes(x)) setMode(x);
    else if (x === 'byname') { $('.mx-exp').classList.toggle('show'); $('.mx-find').focus(); }
    else if (x === 'snap') { S.snap = !S.snap; tcs.forEach(c => c.setTranslationSnap(S.snap ? 10 : null)); syncTool(); toast('3D Snap: ' + (S.snap ? 'ON (10 cm)' : 'OFF')); }
    else if (x === 'asnap') { S.asnap = !S.asnap; tcs.forEach(c => c.setRotationSnap(S.asnap ? 5 * D2R : null)); syncTool(); toast('Angle Snap: ' + (S.asnap ? 'ON (5°)' : 'OFF')); }
    else if (x === 'clone') cloneDialog(); else if (x === 'array') arrayDialog(); else if (x === 'mat') matEditor(); else if (x === 'render') renderFrame();
    else if (x === 'tasks') { $('#mxTasks').hidden = !$('#mxTasks').hidden; renderTasks(); syncTool(); }
    else if (x === 'help') helpDialog();
  });
  $('#mxCoord').addEventListener('change', e => { S.space = e.target.value; tcs.forEach(c => c.setSpace(S.space)); req(); });

  function onKey(e) {
    if (e.target.matches('input, select, textarea')) return;
    const k = e.key.toLowerCase();
    if (e.ctrlKey || e.metaKey) {
      if (k === 'z') { e.preventDefault(); undo(); } else if (k === 'y') { e.preventDefault(); redo(); } else if (k === 'v') { e.preventDefault(); cloneDialog(); } else if (k === 'd') { e.preventDefault(); select(null); } else if (k === 'n') { e.preventDefault(); cmd('new'); }
      return;
    }
    if (e.altKey && k === 'w') { e.preventDefault(); toggleMax(); return; }
    if (e.altKey && k === 'x') { if (S.sel) { S.sel.see = !S.sel.see; applyMat(S.sel); commit(); req(); } return; }
    if (e.shiftKey && k === 'q') { e.preventDefault(); renderFrame(); return; }
    const map = { q: 'select', w: 'move', e: 'rotate', r: 'scale' };
    if (map[k]) setMode(map[k]);
    else if (k === 'delete' || k === 'backspace') delSel();
    else if (k === 'enter' && S.draw) finishLine();
    else if (k === 'z') zoomExtAll();
    else if (k === 'g') { S.gridOn = !S.gridOn; req(); }
    else if (k === '7') toggleStats();
    else if (k === 'm') matEditor();
    else if (k === 's') $('[data-tb="snap"]').click();
    else if (k === 'a') $('[data-tb="asnap"]').click();
    else if (k === 'h') $('[data-tb="byname"]').click();
    else if (k === 'escape') { if (S.draw) finishLine(); else if (S.mode === 'create') { S.createType = null; setMode('select'); renderCP(); } $('#mxModal').hidden = true; $('#mxDD').hidden = true; }
    else if (e.key === 'F3') { e.preventDefault(); const v = VP[S.active]; v.shade = v.shade === 'wire' ? 'shaded' : 'wire'; S.flags.shade = true; setupView(S.active, true); checkTasksSoon(); }
    else if (e.key === 'F4') { e.preventDefault(); const v = VP[S.active]; v.shade = v.shade === 'edged' ? 'shaded' : 'edged'; S.flags.shade = true; setupView(S.active, true); checkTasksSoon(); }
  }
  window.addEventListener('keydown', onKey);

  /* ---------- mashqlar ---------- */
  const CH = LAB ? CHECK[LAB] || [] : [];
  let doneSet = new Set(); try { doneSet = new Set(JSON.parse(localStorage.getItem(DKEY) || '[]')); } catch (e) {}
  let ctT; function checkTasksSoon() { clearTimeout(ctT); ctT = setTimeout(checkTasks, 150); }
  function checkTasks() {
    if (LAB && !S.sample) { CH.forEach((f, i) => { try { if (f(S)) doneSet.add(i); } catch (e) {} }); try { localStorage.setItem(DKEY, JSON.stringify([...doneSet])); } catch (e) {} }
    renderTasks();
  }
  function renderTasks() {
    const el = $('#mxTasks'); if (el.hidden) return;
    if (!LAB) {
      el.innerHTML = `<div class="mx-th"><b>🎯 ${esc(TX.tasks_title)}</b><button data-x>×</button></div><p>${esc(t('pick_lab', ''))}</p><ol class="mx-labs">${Object.keys(LABS).sort().map(k => { let d = 0; try { d = JSON.parse(localStorage.getItem('mx_done_' + k) || '[]').length; } catch (e) {} return `<li><a href="#max-${k}"><span>${+k}</span>${esc(LT[k] || '')} <em>${d}/${(LABS[k].tasks || []).length}</em></a></li>`; }).join('')}</ol>`;
      return;
    }
    const L = LABS[LAB] || { tasks: [] }, n = L.tasks.length;
    el.innerHTML = `<div class="mx-th"><b>🎯 ${esc(t('lab_word', 'Ish'))} ${+LAB} · ${doneSet.size}/${n}</b><button data-x>×</button></div><p class="mx-lt">${esc(LT[LAB] || '')}</p>
      ${S.sample ? `<p class="mx-samp">${esc(t('sample_note', ''))}</p><button class="mx-big" data-start>▶ ${esc(t('start_tasks', 'Mashqni boshlash'))}</button>` : `<p>${esc(TX.tasks_hint)}</p>`}
      <ol>${L.tasks.map((x, i) => `<li class="${doneSet.has(i) ? 'ok' : ''}"><span>${doneSet.has(i) ? '✓' : i + 1}</span>${esc(x)}</li>`).join('')}</ol>
      ${doneSet.size === n && n ? `<p class="mx-done">${esc(TX.done)}</p>` : ''}
      <div class="mx-trow"><button data-sample>👁 ${esc(t('show_sample', 'Namuna'))}</button>${S.sample ? '' : `<button data-clear>🧹 ${esc(t('clear_scene', 'Toza sahna'))}</button>`}<button data-reset title="${esc(t('reset_tasks', ''))}">↺</button></div>`;
  }
  $('#mxTasks').addEventListener('click', e => {
    if (e.target.closest('[data-x]')) { $('#mxTasks').hidden = true; syncTool(); return; }
    if (e.target.closest('[data-reset]')) { doneSet.clear(); try { localStorage.setItem(DKEY, '[]'); } catch (x) {} renderTasks(); return; }
    if (e.target.closest('[data-sample]')) { loadSample(); return; }
    if (e.target.closest('[data-start]') || e.target.closest('[data-clear]')) { Object.keys(S.flags).forEach(k => S.flags[k] = false); [...S.objs].forEach(removeObj); S.counters = {}; S.colorIdx = 0; S.sample = false; select(null); commit(); zoomExtAll(); renderTasks(); toast(t('started', '')); }
  });
  function loadSample() {
    if (!LAB || !PRESETS[LAB]) return;
    [...S.objs].forEach(removeObj); S.counters = {}; S.colorIdx = 0;
    const api = {
      add: (type, params, pos, ex = {}) => { const p = { ...defaults(TYPES[type].p), ...params }; const o = makeObj(type, p, pos, { name: ex.name, color: ex.color }); if (ex.name) o.name = ex.name; return o; },
      inst: (o, pos, ex = {}) => { const c = cloneObj(o, o.src, pos); if (ex.name) c.name = ex.name; return c; },
      mod: (o, type, params) => { o.src.mods.push({ type, on: true, p: { ...defaults(MODS[type].p), ...params } }); rebuildShared(o); return o; },
      mat: (o, m) => { o.mtl = { color: '#ffffff', rough: 0.6, metal: 0, opacity: 1, emis: '#000000', emisI: 0, map: 'none', ...m }; rebuild(o); },
      arr: (o, n, opt) => doArray(o, n, { move: [0, 0, 0], rot: [0, 0, 0], scale: 100, ...opt }),
      rebuild,
      line: (pts, op = {}) => {
        const p = { ...defaults(TYPES.Line.p), pts, closed: !!op.closed, interp: op.interp || 'Corner' };
        const o = makeObj('Line', p, op.pos || [0, 0, 0], { name: op.name, color: op.color }); if (op.name) o.name = op.name;
        if (op.view === 'Front') o.group.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, -1, 0)));
        return o;
      },
    };
    PRESETS[LAB](api); S.sample = true; select(null); commit(); zoomExtAll(); renderTasks(); toast(t('sample_loaded', ''));
  }

  /* ---------- joylashuv va render ---------- */
  let rects = [];
  function layout() {
    const W = vpsEl.clientWidth, Hh = vpsEl.clientHeight, gap = 3, w2 = (W - gap) / 2, h2 = (Hh - gap) / 2;
    rects = [[0, 0, w2, h2], [w2 + gap, 0, w2, h2], [0, h2 + gap, w2, h2], [w2 + gap, h2 + gap, w2, h2]];
    if (S.maxed) rects = rects.map((r, i) => i === S.active ? [0, 0, W, Hh] : [0, 0, 0, 0]);
    renderer.setSize(W, Hh, false); canvas.style.width = W + 'px'; canvas.style.height = Hh + 'px';
    rects.forEach((r, i) => {
      for (const el of [vpEls[i], bgEls[i]]) { el.style.left = r[0] + 'px'; el.style.top = r[1] + 'px'; el.style.width = r[2] + 'px'; el.style.height = r[3] + 'px'; el.style.display = r[2] ? '' : 'none'; }
      const v = VP[i]; if (!v.cam || !r[2]) return; const asp = r[2] / Math.max(1, r[3]);
      if (v.cam.isOrthographicCamera) { const hh = 160; v.cam.left = -hh * asp; v.cam.right = hh * asp; v.cam.top = hh; v.cam.bottom = -hh; } else v.cam.aspect = asp;
      v.cam.updateProjectionMatrix();
    });
    req();
  }
  const ro2 = new ResizeObserver(() => layout()); ro2.observe(vpsEl);

  const triScene = new THREE.Scene(), triCam = new THREE.OrthographicCamera(-1.6, 1.6, 1.6, -1.6, -10, 10);
  [[1, 0, 0, 0xe53935, 'X'], [0, 1, 0, 0x43a047, 'Y'], [0, 0, 1, 0x1e88e5, 'Z']].forEach(([x, y, z, c, l]) => {
    triScene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(x, y, z)]), new THREE.LineBasicMaterial({ color: c })));
    const cv = document.createElement('canvas'); cv.width = cv.height = 64; const cx = cv.getContext('2d'); cx.fillStyle = '#' + c.toString(16).padStart(6, '0'); cx.font = 'bold 44px sans-serif'; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText(l, 32, 34);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), depthTest: false })); sp.position.set(x * 1.35, y * 1.35, z * 1.35); sp.scale.setScalar(0.6); triScene.add(sp);
  });

  function setLights() {
    const L = S.objs.filter(o => isLight(o) && !o.hidden);
    hemi.intensity = L.length ? 0.18 : 1.0; key.intensity = L.length ? 0 : 1.5; scene.environmentIntensity = L.length ? 0.12 : 0.45;
    S.objs.forEach(o => { if (isLight(o)) o.light.visible = !o.hidden; });
  }
  let need = true, raf = 0, alive = true;
  function req() { need = true; }
  function render() {
    const Hh = vpsEl.clientHeight; renderer.setScissorTest(true); renderer.clear(); setLights(); renderer.shadowMap.needsUpdate = true; renderer.shadowMap.autoUpdate = false;
    const tmp = new THREE.Vector3();
    rects.forEach((r, i) => {
      if (!r[2]) return; const v = VP[i], d = VIEWS[v.view];
      renderer.setViewport(r[0], Hh - r[1] - r[3], r[2], r[3]); renderer.setScissor(r[0], Hh - r[1] - r[3], r[2], r[3]); renderer.clear();
      for (const k in grids) grids[k].visible = S.gridOn && k === d.plane;
      key.position.copy(v.cam.position); key.target.position.copy(v.controls.target);
      S.objs.forEach(o => {
        const sel = o === S.sel; o.group.visible = !o.hidden;
        if (isLight(o)) {
          o.mesh.visible = true; o.brk.visible = false;
          if (o.type !== 'Omni') { o.mesh.lookAt(o.tgt.position); const lp = o.group.worldToLocal(tmp.copy(o.tgt.position)); o.wire.geometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, lp.x, lp.y, lp.z], 3)); o.wire.visible = true; o.wire.material.color.set(sel ? '#ffffff' : '#c8b04a'); }
          else o.wire.visible = false;
          return;
        }
        o.mesh.visible = v.shade !== 'wire' && !o.asBox && o.top === 'mesh'; o.wire.visible = v.shade !== 'shaded' || !!o.asBox || o.top === 'shape';
        o.wire.material.color.set(sel ? '#ffffff' : v.shade === 'edged' && o.top === 'mesh' ? new THREE.Color(o.color).multiplyScalar(0.45) : o.color);
        o.brk.visible = sel && v.shade !== 'wire';
      });
      tcs.forEach((c, k) => { c.getHelper().visible = k === i && !!c.object; });
      renderer.render(scene, v.cam);
      const s = 64; renderer.setViewport(r[0] + 4, Hh - r[1] - r[3] + 4, s, s); renderer.setScissor(r[0] + 4, Hh - r[1] - r[3] + 4, s, s);
      triCam.position.copy(v.cam.position).sub(v.controls.target).normalize().multiplyScalar(5); triCam.up.copy(v.cam.up); triCam.lookAt(0, 0, 0); triCam.quaternion.copy(v.cam.quaternion);
      renderer.clearDepth(); renderer.render(triScene, triCam);
      const st = vpEls[i].querySelector('.vps');
      if (S.stats) { const tot = S.objs.filter(o => !o.hidden).reduce((a, o) => [a[0] + (o.polys || 0), a[1] + (o.verts || 0)], [0, 0]); st.innerHTML = `Total<br>Polys: ${tot[0].toLocaleString()}<br>Verts: ${tot[1].toLocaleString()}${S.sel ? `<br><br>${esc(S.sel.name)}<br>Polys: ${S.sel.polys || 0}<br>Verts: ${S.sel.verts || 0}` : ''}`; st.style.display = ''; }
      else st.style.display = 'none';
    });
    renderer.setScissorTest(false);
  }
  function loop() { if (!alive) return; raf = requestAnimationFrame(loop); if (need) { need = false; render(); } }

  /* ---------- ishga tushirish ---------- */
  VP.forEach((_, i) => setupView(i)); if (isTouch || root.clientWidth < 760) S.maxed = true; markActive(); layout();
  let saved = null; try { saved = localStorage.getItem(KEY); } catch (e) {}
  if (saved) { try { restore(saved); } catch (e) { saved = null; } }
  if (!saved) {
    if (LAB) loadSample();
    else {
      const b = makeObj('Box', { ...S.createDefaults.Box, length: 50, width: 50, height: 30 }, [-55, 10, 0]);
      makeObj('Cylinder', { ...S.createDefaults.Cylinder, radius: 16, height: 45 }, [20, 40, 0]);
      makeObj('Teapot', { ...S.createDefaults.Teapot, tsize: 18 }, [40, -40, 0]);
      select(b);
    }
  }
  last = serialize(); save();
  zoomExtAll(); setMode('select'); S.tab = 'create'; renderCP(); renderList(); setPrompt(); updateTypeIn();
  if (LAB || opts.showTasks) $('#mxTasks').hidden = false;
  syncTool(); checkTasks();
  loop();

  return {
    dispose() {
      alive = false; cancelAnimationFrame(raf); window.removeEventListener('keydown', onKey); ro2.disconnect();
      tcs.forEach(c => c.dispose()); VP.forEach(v => v.controls && v.controls.dispose()); [...S.objs].forEach(removeObj); renderer.dispose();
    },
  };
}
