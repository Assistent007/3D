/* 3ds Max simulyatori — o'quv maqsadidagi soddalashtirilgan interfeys.
   Koordinatalar 3ds Max dagidek: Z — yuqoriga, birlik — sm. */
import * as THREE from 'three';
import { OrbitControls } from './lib/controls/OrbitControls.js';
import { TransformControls } from './lib/controls/TransformControls.js';
import { TeapotGeometry } from './lib/geometries/TeapotGeometry.js';

const TAU = Math.PI * 2, D2R = Math.PI / 180;
const WIRE_COLORS = ['#e7a83b', '#86c06c', '#5aa2df', '#d96b6b', '#a97fd8', '#4fc1b5', '#d9cf5a', '#e08a4f', '#8fb3e6', '#c77fb4', '#7fd18c', '#b89b6a'];

/* ---------------- parametr ta'riflari ---------------- */
const N = (k, label, def, min, max, o = {}) => ({ k, label, def, min, max, kind: 'num', int: !!o.int, unit: o.unit ?? (o.int ? '' : 'cm'), step: o.step });
const B = (k, label, def) => ({ k, label, def, kind: 'bool' });
const E = (k, label, def, opts) => ({ k, label, def, kind: 'enum', opts });
const I = (k, label, def, min, max) => N(k, label, def, min, max, { int: true });

const TYPES = {
  Box: { p: [N('length', 'Length', 40, 0.1, 1e4), N('width', 'Width', 40, 0.1, 1e4), N('height', 'Height', 40, 0.1, 1e4), I('lsegs', 'Length Segs', 1, 1, 100), I('wsegs', 'Width Segs', 1, 1, 100), I('hsegs', 'Height Segs', 1, 1, 100)], key: ['length', 'width', 'height'] },
  Cone: { p: [N('radius1', 'Radius 1', 20, 0, 1e4), N('radius2', 'Radius 2', 0, 0, 1e4), N('height', 'Height', 45, 0.1, 1e4), I('hsegs', 'Height Segments', 5, 1, 100), I('csegs', 'Cap Segments', 1, 1, 50), I('sides', 'Sides', 24, 3, 128), B('smooth', 'Smooth', true)], key: ['radius1', 'radius2', 'height'] },
  Sphere: { p: [N('radius', 'Radius', 22, 0.1, 1e4), I('segs', 'Segments', 32, 4, 128), B('smooth', 'Smooth', true), N('hemi', 'Hemisphere', 0, 0, 0.99, { unit: '', step: 0.05 }), B('base', 'Base To Pivot', false)], key: ['radius'] },
  GeoSphere: { p: [N('radius', 'Radius', 22, 0.1, 1e4), I('segs', 'Segments', 4, 1, 12), E('gtype', 'Geodesic Base Type', 'Icosa', ['Tetra', 'Octa', 'Icosa']), B('smooth', 'Smooth', true)], key: ['radius'] },
  Cylinder: { p: [N('radius', 'Radius', 18, 0.1, 1e4), N('height', 'Height', 50, 0.1, 1e4), I('hsegs', 'Height Segments', 5, 1, 100), I('csegs', 'Cap Segments', 1, 1, 50), I('sides', 'Sides', 18, 3, 128), B('smooth', 'Smooth', true)], key: ['radius', 'height'] },
  Tube: { p: [N('radius1', 'Radius 1', 20, 0.1, 1e4), N('radius2', 'Radius 2', 14, 0.1, 1e4), N('height', 'Height', 40, 0.1, 1e4), I('hsegs', 'Height Segments', 5, 1, 100), I('csegs', 'Cap Segments', 1, 1, 50), I('sides', 'Sides', 18, 3, 128), B('smooth', 'Smooth', true)], key: ['radius1', 'radius2', 'height'] },
  Torus: { p: [N('radius1', 'Radius 1', 20, 0.1, 1e4), N('radius2', 'Radius 2', 6, 0.1, 1e4), N('rot', 'Rotation', 0, -1e4, 1e4, { unit: '°' }), N('twist', 'Twist', 0, -1e4, 1e4, { unit: '°' }), I('segs', 'Segments', 24, 3, 128), I('sides', 'Sides', 12, 3, 64), B('smooth', 'Smooth', true)], key: ['radius1', 'radius2'] },
  Pyramid: { p: [N('width', 'Width', 40, 0.1, 1e4), N('depth', 'Depth', 40, 0.1, 1e4), N('height', 'Height', 40, 0.1, 1e4), I('hsegs', 'Height Segs', 1, 1, 100)], key: ['width', 'depth', 'height'] },
  Teapot: { p: [N('tsize', 'Radius', 20, 0.1, 1e4), I('segs', 'Segments', 4, 1, 12), B('smooth', 'Smooth', true), B('body', 'Body', true), B('lid', 'Lid', true)], key: ['tsize'] },
  Plane: { p: [N('length', 'Length', 60, 0.1, 1e4), N('width', 'Width', 60, 0.1, 1e4), I('lsegs', 'Length Segs', 4, 1, 200), I('wsegs', 'Width Segs', 4, 1, 200)], key: ['length', 'width'] },
};
const TYPE_ORDER = ['Box', 'Cone', 'Sphere', 'GeoSphere', 'Cylinder', 'Tube', 'Torus', 'Pyramid', 'Teapot', 'Plane'];
const MODS = {
  Bend: { p: [N('angle', 'Angle', 0, -1e4, 1e4, { unit: '°' }), N('dir', 'Direction', 0, -1e4, 1e4, { unit: '°' }), E('axis', 'Bend Axis', 'Z', ['X', 'Y', 'Z'])] },
  Taper: { p: [N('amount', 'Amount', 0, -10, 10, { unit: '', step: 0.05 }), N('curve', 'Curve', 0, -10, 10, { unit: '', step: 0.05 }), E('axis', 'Primary', 'Z', ['X', 'Y', 'Z'])] },
  Twist: { p: [N('angle', 'Angle', 0, -1e5, 1e5, { unit: '°' }), N('bias', 'Bias', 0, -100, 100, { unit: '' }), E('axis', 'Twist Axis', 'Z', ['X', 'Y', 'Z'])] },
  Spherify: { p: [N('percent', 'Percent', 100, 0, 100, { unit: '' })] },
  Noise: { p: [I('seed', 'Seed', 0, 0, 9999), N('scale', 'Scale', 100, 0.1, 1e4, { unit: '' }), N('sx', 'Strength X', 0, -1e4, 1e4), N('sy', 'Strength Y', 0, -1e4, 1e4), N('sz', 'Strength Z', 0, -1e4, 1e4)] },
};
const defaults = defs => Object.fromEntries(defs.map(d => [d.k, d.def]));

/* ---------------- geometriya quruvchilar (Z yuqoriga) ---------------- */
function G() { return { pos: [], idx: [], quads: [] }; }
function grid(g, o, U, V, nu, nv) {
  const b = g.pos.length / 3;
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
    g.pos.push(o[0] + U[0] * i / nu + V[0] * j / nv, o[1] + U[1] * i / nu + V[1] * j / nv, o[2] + U[2] * i / nu + V[2] * j / nv);
  }
  const w = nu + 1;
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const a = b + j * w + i, bb = a + 1, c = a + w + 1, d = a + w;
    g.idx.push(a, bb, c, a, c, d); g.quads.push(a, bb, c, d);
  }
}
// aylanma sirt: profil [[r,z],...] tashqi tomondan "soat strelkasiga qarshi" yuradi
function revolve(g, prof, sides, t0 = 0) {
  const b = g.pos.length / 3, w = sides + 1;
  for (let i = 0; i < prof.length; i++) for (let j = 0; j <= sides; j++) {
    const t = t0 + TAU * j / sides; g.pos.push(prof[i][0] * Math.cos(t), prof[i][0] * Math.sin(t), prof[i][1]);
  }
  for (let i = 0; i < prof.length - 1; i++) for (let j = 0; j < sides; j++) {
    const a = b + i * w + j, bb = a + 1, c = a + w + 1, d = a + w;
    g.idx.push(a, bb, c, a, c, d); g.quads.push(a, bb, c, d);
  }
}
const lerpPts = (a, b, n) => Array.from({ length: n + 1 }, (_, i) => [a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n]);

const BUILD = {
  Box(p) {
    const g = G(), W = p.width, L = p.length, H = p.height, nw = p.wsegs, nl = p.lsegs, nh = p.hsegs, x0 = -W / 2, y0 = -L / 2;
    grid(g, [x0, y0, H], [W, 0, 0], [0, L, 0], nw, nl);
    grid(g, [x0, y0, 0], [0, L, 0], [W, 0, 0], nl, nw);
    grid(g, [W / 2, y0, 0], [0, L, 0], [0, 0, H], nl, nh);
    grid(g, [x0, y0, 0], [0, 0, H], [0, L, 0], nh, nl);
    grid(g, [x0, L / 2, 0], [0, 0, H], [W, 0, 0], nh, nw);
    grid(g, [x0, y0, 0], [W, 0, 0], [0, 0, H], nw, nh);
    return g;
  },
  Plane(p) { const g = G(); grid(g, [-p.width / 2, -p.length / 2, 0], [p.width, 0, 0], [0, p.length, 0], p.wsegs, p.lsegs); return g; },
  Cylinder(p) { return BUILD.Cone({ radius1: p.radius, radius2: p.radius, height: p.height, hsegs: p.hsegs, csegs: p.csegs, sides: p.sides }); },
  Cone(p) {
    const g = G(), r1 = p.radius1, r2 = p.radius2, h = p.height;
    if (r1 > 0) revolve(g, lerpPts([0, 0], [r1, 0], p.csegs), p.sides);
    revolve(g, lerpPts([r1, 0], [r2, h], p.hsegs), p.sides);
    if (r2 > 0) revolve(g, lerpPts([r2, h], [0, h], p.csegs), p.sides);
    return g;
  },
  Tube(p) {
    const g = G(), ro = Math.max(p.radius1, p.radius2), ri = Math.min(p.radius1, p.radius2), h = p.height;
    revolve(g, lerpPts([ri, 0], [ro, 0], p.csegs), p.sides);
    revolve(g, lerpPts([ro, 0], [ro, h], p.hsegs), p.sides);
    revolve(g, lerpPts([ro, h], [ri, h], p.csegs), p.sides);
    revolve(g, lerpPts([ri, h], [ri, 0], p.hsegs), p.sides);
    return g;
  },
  Pyramid(p) {
    const g = G();
    revolve(g, [[0, 0], [1, 0]], 4, Math.PI / 4);
    revolve(g, lerpPts([1, 0], [0, p.height], p.hsegs), 4, Math.PI / 4);
    const sx = p.width / Math.SQRT2, sy = p.depth / Math.SQRT2;
    for (let i = 0; i < g.pos.length; i += 3) { g.pos[i] *= sx; g.pos[i + 1] *= sy; }
    return g;
  },
  Sphere(p) {
    const g = G(), r = p.radius, n = p.segs, rings = Math.max(2, Math.round(n / 2)), h = p.hemi;
    const f0 = Math.asin(Math.min(0.999, 2 * h - 1)), prof = [];
    for (let i = 0; i <= rings; i++) { const f = f0 + (Math.PI / 2 - f0) * i / rings; prof.push([r * Math.cos(f), r * Math.sin(f)]); }
    prof[prof.length - 1][0] = 0;
    if (h > 0.001) revolve(g, [[0, prof[0][1]], [prof[0][0], prof[0][1]]], n);
    revolve(g, prof, n);
    if (p.base) { const dz = h > 0.001 ? -prof[0][1] : r; for (let i = 2; i < g.pos.length; i += 3) g.pos[i] += dz; }
    return g;
  },
  GeoSphere(p) {
    const C = { Tetra: THREE.TetrahedronGeometry, Octa: THREE.OctahedronGeometry, Icosa: THREE.IcosahedronGeometry }[p.gtype] || THREE.IcosahedronGeometry;
    return fromThree(new C(p.radius, p.segs - 1));
  },
  Torus(p) {
    const g = G(), R = p.radius1, r = p.radius2, nu = p.segs, nv = p.sides, w = nv + 1;
    for (let i = 0; i <= nu; i++) {
      const u = TAU * i / nu;
      for (let j = 0; j <= nv; j++) {
        const v = TAU * j / nv + p.rot * D2R + p.twist * D2R * i / nu;
        g.pos.push((R + r * Math.cos(v)) * Math.cos(u), (R + r * Math.cos(v)) * Math.sin(u), r * Math.sin(v));
      }
    }
    for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) { const a = i * w + j, b = a + w, c = a + w + 1, d = a + 1; g.idx.push(a, b, c, a, c, d); g.quads.push(a, b, c, d); }
    return g;
  },
  Teapot(p) {
    const tg = new TeapotGeometry(p.tsize, p.segs, true, p.lid, p.body, true, true);
    tg.rotateX(Math.PI / 2); tg.computeBoundingBox(); tg.translate(0, 0, -tg.boundingBox.min.z);
    return fromThree(tg);
  },
};
function fromThree(tg) {
  const g = G(), P = tg.getAttribute('position');
  if (tg.index) { g.pos = Array.from(P.array); g.idx = Array.from(tg.index.array); }
  else { // ko'pyoq qirralari bitta uchga birlashtiriladi (silliq ko'rinish uchun)
    const m = new Map();
    for (let i = 0; i < P.count; i++) {
      const x = P.getX(i), y = P.getY(i), z = P.getZ(i), k = Math.round(x * 1e3) + ',' + Math.round(y * 1e3) + ',' + Math.round(z * 1e3);
      if (!m.has(k)) { m.set(k, g.pos.length / 3); g.pos.push(x, y, z); } g.idx.push(m.get(k));
    }
  }
  tg.dispose(); return g;
}

/* ---------------- modifikatorlar ---------------- */
const PERM = { X: [1, 2, 0], Y: [2, 0, 1], Z: [0, 1, 2] };
function axisLoop(pos, axis, fn) {
  const [ix, iy, iz] = PERM[axis] || PERM.Z, v = [0, 0, 0];
  for (let i = 0; i < pos.length; i += 3) {
    v[0] = pos[i + ix]; v[1] = pos[i + iy]; v[2] = pos[i + iz]; fn(v);
    pos[i + ix] = v[0]; pos[i + iy] = v[1]; pos[i + iz] = v[2];
  }
}
function range(pos, axis) {
  const iz = (PERM[axis] || PERM.Z)[2]; let lo = Infinity, hi = -Infinity;
  for (let i = iz; i < pos.length; i += 3) { lo = Math.min(lo, pos[i]); hi = Math.max(hi, pos[i]); }
  return [lo, hi];
}
function hash(x, y, z, s) { const h = Math.sin(x * 127.1 + y * 311.7 + z * 74.7 + s * 13.13) * 43758.5453; return h - Math.floor(h); }
function vnoise(x, y, z, s) {
  const X = Math.floor(x), Y = Math.floor(y), Z = Math.floor(z), fx = x - X, fy = y - Y, fz = z - Z;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), w = fz * fz * (3 - 2 * fz);
  const L = (a, b, t) => a + (b - a) * t, H = (i, j, k) => hash(X + i, Y + j, Z + k, s);
  return L(L(L(H(0, 0, 0), H(1, 0, 0), u), L(H(0, 1, 0), H(1, 1, 0), u), v), L(L(H(0, 0, 1), H(1, 0, 1), u), L(H(0, 1, 1), H(1, 1, 1), u), v), w) - 0.5;
}
const APPLY = {
  Bend(pos, p) {
    const th = p.angle * D2R; if (Math.abs(th) < 1e-6) return;
    const [lo, hi] = range(pos, p.axis), L = Math.max(1e-6, hi - Math.min(0, lo) - Math.max(0, lo)), Lb = Math.max(1e-6, hi - lo), R = Lb / th;
    const cd = Math.cos(-p.dir * D2R), sd = Math.sin(-p.dir * D2R);
    axisLoop(pos, p.axis, v => {
      let x = v[0] * cd - v[1] * sd; const y = v[0] * sd + v[1] * cd, z = v[2];
      const f = th * z / Lb, nx = R - (R - x) * Math.cos(f), nz = (R - x) * Math.sin(f);
      v[0] = nx * cd + y * sd; v[1] = -nx * sd + y * cd; v[2] = nz;
    });
    void L;
  },
  Taper(pos, p) {
    if (!p.amount && !p.curve) return;
    const [lo, hi] = range(pos, p.axis), L = Math.max(1e-6, hi - lo);
    axisLoop(pos, p.axis, v => { const t = (v[2] - lo) / L, s = 1 + p.amount * t + p.curve * 4 * t * (1 - t); v[0] *= s; v[1] *= s; });
  },
  Twist(pos, p) {
    if (!p.angle) return;
    const [lo, hi] = range(pos, p.axis), L = Math.max(1e-6, hi - lo), e = p.bias >= 0 ? 1 + p.bias / 25 : 1 / (1 - p.bias / 25);
    axisLoop(pos, p.axis, v => { const t = Math.pow(Math.max(0, (v[2] - lo) / L), e), a = p.angle * D2R * t, c = Math.cos(a), s = Math.sin(a); const x = v[0]; v[0] = x * c - v[1] * s; v[1] = x * s + v[1] * c; });
  },
  Spherify(pos, p) {
    const n = pos.length / 3, c = [0, 0, 0]; let ravg = 0;
    const bb = [[Infinity, -Infinity], [Infinity, -Infinity], [Infinity, -Infinity]];
    for (let i = 0; i < pos.length; i += 3) for (let k = 0; k < 3; k++) { bb[k][0] = Math.min(bb[k][0], pos[i + k]); bb[k][1] = Math.max(bb[k][1], pos[i + k]); }
    for (let k = 0; k < 3; k++) c[k] = (bb[k][0] + bb[k][1]) / 2;
    for (let i = 0; i < pos.length; i += 3) ravg += Math.hypot(pos[i] - c[0], pos[i + 1] - c[1], pos[i + 2] - c[2]);
    ravg /= Math.max(1, n); const t = p.percent / 100;
    for (let i = 0; i < pos.length; i += 3) {
      const dx = pos[i] - c[0], dy = pos[i + 1] - c[1], dz = pos[i + 2] - c[2], d = Math.hypot(dx, dy, dz) || 1, s = ravg / d;
      pos[i] = c[0] + dx * (1 - t + t * s); pos[i + 1] = c[1] + dy * (1 - t + t * s); pos[i + 2] = c[2] + dz * (1 - t + t * s);
    }
  },
  Noise(pos, p) {
    if (!p.sx && !p.sy && !p.sz) return;
    const k = 1 / p.scale;
    for (let i = 0; i < pos.length; i += 3) {
      const x = pos[i] * k, y = pos[i + 1] * k, z = pos[i + 2] * k;
      pos[i] += p.sx * vnoise(x, y, z, p.seed + 1); pos[i + 1] += p.sy * vnoise(x + 31.4, y, z, p.seed + 2); pos[i + 2] += p.sz * vnoise(x, y + 17.7, z, p.seed + 3);
    }
  },
};

/* ---------------- 3ds Max ko'rinishidagi sim to'r (to'rtburchak diagonallarisiz) ---------------- */
function wireEdges(pos, idx, quads) {
  const key = new Map(), canon = new Int32Array(pos.length / 3);
  for (let i = 0; i < canon.length; i++) {
    const k = Math.round(pos[3 * i] * 1e3) + ',' + Math.round(pos[3 * i + 1] * 1e3) + ',' + Math.round(pos[3 * i + 2] * 1e3);
    if (!key.has(k)) key.set(k, i); canon[i] = key.get(k);
  }
  const E = new Map(), nT = idx.length / 3, tn = new Float32Array(nT * 3), tl = new Float32Array(nT * 3);
  const P = i => [pos[3 * i], pos[3 * i + 1], pos[3 * i + 2]];
  for (let t = 0; t < nT; t++) {
    const a = canon[idx[3 * t]], b = canon[idx[3 * t + 1]], c = canon[idx[3 * t + 2]];
    if (a === b || b === c || a === c) continue;
    const A = P(a), Bv = P(b), C = P(c);
    const u = [Bv[0] - A[0], Bv[1] - A[1], Bv[2] - A[2]], v = [C[0] - A[0], C[1] - A[1], C[2] - A[2]];
    const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]], nl = Math.hypot(...n) || 1;
    tn[3 * t] = n[0] / nl; tn[3 * t + 1] = n[1] / nl; tn[3 * t + 2] = n[2] / nl;
    const ed = [[a, b], [b, c], [c, a]];
    ed.forEach(([p, q], m) => {
      const Pp = P(p), Pq = P(q); tl[3 * t + m] = Math.hypot(Pp[0] - Pq[0], Pp[1] - Pq[1], Pp[2] - Pq[2]);
      const k = p < q ? p * 4194304 + q : q * 4194304 + p;
      let e = E.get(k); if (!e) { e = { p, q, t: [] }; E.set(k, e); } e.t.push([t, m]);
    });
  }
  const out = []; let hidden = 0, degen = 0;
  for (let t = 0; t < nT; t++) { const a = canon[idx[3 * t]], b = canon[idx[3 * t + 1]], c = canon[idx[3 * t + 2]]; if (a === b || b === c || a === c) degen++; }
  const HID = new Set();
  if (quads && quads.length) {
    for (let q = 0; q < quads.length; q += 4) {
      const a = canon[quads[q]], b = canon[quads[q + 1]], c = canon[quads[q + 2]], d = canon[quads[q + 3]];
      if (new Set([a, b, c, d]).size === 4) HID.add(a < c ? a * 4194304 + c : c * 4194304 + a);
    }
  }
  for (const [k, e] of E) {
    if (quads && quads.length) { if (HID.has(k) && e.t.length === 2) { hidden++; continue; } out.push(e.p, e.q); continue; }
    if (e.t.length === 2) {
      const [[t1, m1], [t2, m2]] = e.t;
      const dot = tn[3 * t1] * tn[3 * t2] + tn[3 * t1 + 1] * tn[3 * t2 + 1] + tn[3 * t1 + 2] * tn[3 * t2 + 2];
      const longest = (t, m) => { const L = tl[3 * t + m]; return L > 1.02 * tl[3 * t + (m + 1) % 3] && L > 1.02 * tl[3 * t + (m + 2) % 3]; };
      if (dot > 0.97 && longest(t1, m1) && longest(t2, m2)) { hidden++; continue; }
    }
    out.push(e.p, e.q);
  }
  return { edges: Uint32Array.from(out), polys: nT - degen - hidden, verts: key.size };
}

/* ======================================================================= */
export function createMax(root, TX, opts = {}) {
  const isTouch = matchMedia('(pointer: coarse)').matches;
  const H = TX.hints || {};
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmt = (v, d) => (d.int ? String(Math.round(v)) : (Math.round(v * 10) / 10).toFixed(Math.abs(v) < 10 && d.unit === '' ? 2 : 1)) + (d.unit || '');

  /* ---------- holat ---------- */
  const S = { objs: [], sel: null, mode: 'select', tab: 'create', createType: null, justCreated: null, counters: {}, space: 'world', snap: false, asnap: false,
    active: 3, maxed: false, gridOn: true, stats: false, modSel: -1, undo: [], redo: [], createDefaults: {}, colorIdx: 0 };
  TYPE_ORDER.forEach(t => S.createDefaults[t] = defaults(TYPES[t].p));

  /* ---------- DOM ---------- */
  root.innerHTML = `
  <div class="mx${isTouch ? ' touch' : ''}">
    <div class="mx-menu">${['File', 'Edit', 'Tools', 'Group', 'Views', 'Create', 'Modifiers', 'Animation', 'Graph Editors', 'Rendering', 'Customize', 'Scripting', 'Help'].map(m => `<button data-menu="${m}">${m}</button>`).join('')}
      <span class="mx-sp"></span><span class="mx-ws">Workspaces: Default</span><a class="mx-back" href="#">← ${esc(TX.back)}</a></div>
    <div class="mx-tool" id="mxTool"></div>
    <div class="mx-ribbon"><span class="on">Modeling</span><span>Freeform</span><span>Selection</span><span>Object Paint</span><span>Populate</span><em>Polygon Modeling ▾</em></div>
    <div class="mx-main">
      <aside class="mx-exp"><div class="mx-ph">Scene Explorer – Layer Explorer</div><input class="mx-find" placeholder="Find…"><div class="mx-exp-h">Name (Sorted Ascending)</div><div id="mxList" class="mx-list"></div></aside>
      <section class="mx-vps" id="mxVps">
        ${[0, 1, 2, 3].map(i => `<div class="vpbg" data-i="${i}"></div>`).join('')}
        <canvas id="mxCanvas"></canvas>
        ${[0, 1, 2, 3].map(i => `<div class="vp" data-i="${i}"><div class="vpl"><b data-a="plus">[+]</b> <b data-a="view"></b> <b data-a="std">[Standard]</b> <b data-a="shade"></b></div><div class="vps"></div></div>`).join('')}
        <div class="mx-vtabs">${['Top', 'Front', 'Left', 'Persp', '4×'].map((t, i) => `<button data-v="${i}">${t}</button>`).join('')}</div>
        <div class="mx-tasks" id="mxTasks" hidden></div>
        <div class="mx-toast" id="mxToast" hidden></div>
      </section>
      <aside class="mx-cmd"><div class="mx-tabs" id="mxTabs"></div><div class="mx-cp" id="mxCP"></div></aside>
    </div>
    <div class="mx-time"><div class="mx-slider"><span>0 / 100</span></div><div class="mx-track">${Array.from({ length: 21 }, (_, i) => `<i style="left:${i * 5}%">${i * 5}</i>`).join('')}</div></div>
    <div class="mx-status">
      <div class="mx-ms"><div>MAXScript Mi</div><div></div></div>
      <div class="mx-st"><div id="mxSelN"></div><div id="mxPrompt" class="mx-prompt"></div></div>
      <div class="mx-ti"><span class="mx-lock">🔒</span>${['X', 'Y', 'Z'].map(a => `<label>${a}:<input data-ti="${a}" inputmode="decimal"></label>`).join('')}<span class="mx-grid">Grid = 10,0cm</span></div>
      <div class="mx-anim"><button class="mx-ak">Auto Key</button><select disabled><option>Selected</option></select><button>Set Key</button><span class="mx-play">⏮ ◀ ▶ ▶| ⏭</span><input value="0" disabled size="3"></div>
      <div class="mx-nav"><button data-nav="zoom" title="Zoom">🔍</button><button data-nav="ext" title="Zoom Extents All (Z)">⛶</button><button data-nav="fov" title="Field of View">◺</button><button data-nav="pan" title="Pan">✋</button><button data-nav="orbit" title="Orbit">⟲</button><button data-nav="max" title="Maximize Viewport Toggle (Alt+W)">▣</button></div>
    </div>
    <div class="mx-dd" id="mxDD" hidden></div>
    <div class="mx-modal" id="mxModal" hidden></div>
  </div>`;
  const $ = s => root.querySelector(s), $$ = s => [...root.querySelectorAll(s)];
  const vpsEl = $('#mxVps'), canvas = $('#mxCanvas'), CP = $('#mxCP');

  /* ---------- toolbar ---------- */
  const ICON = {
    undo: '<path d="M7 7H3V3M3.5 7A8 8 0 1 1 4 15" />', redo: '<path d="M17 7h4V3M20.5 7A8 8 0 1 0 20 15" />',
    link: '<path d="M9 15l6-6M7 12l-2 2a3 3 0 0 0 4 4l2-2M17 12l2-2a3 3 0 0 0-4-4l-2 2"/>', unlink: '<path d="M7 12l-2 2a3 3 0 0 0 4 4l2-2M17 12l2-2a3 3 0 0 0-4-4l-2 2M4 4l16 16"/>',
    select: '<path d="M5 3l12 9-5 1 3 6-2 1-3-6-4 4z"/>', byname: '<path d="M4 5h10M4 10h10M4 15h7M17 13l4 4-4 4"/>', region: '<rect x="4" y="4" width="16" height="16" stroke-dasharray="3 2"/>',
    move: '<path d="M12 2v20M2 12h20M12 2l-3 3M12 2l3 3M12 22l-3-3M12 22l3-3M2 12l3-3M2 12l3 3M22 12l-3-3M22 12l-3 3"/>',
    rotate: '<path d="M20 12a8 8 0 1 1-3-6.2M20 4v5h-5"/>', scale: '<rect x="3" y="11" width="10" height="10"/><path d="M13 11l8-8M15 3h6v6"/>',
    snap: '<path d="M6 3v8a6 6 0 0 0 12 0V3h-4v8a2 2 0 0 1-4 0V3z"/>', asnap: '<path d="M4 20h16M4 20L16 6"/><path d="M10 20a6 6 0 0 0-2-4.5"/>',
    mirror: '<path d="M12 3v18M9 6L3 12l6 6zM15 6l6 6-6 6z"/>', align: '<path d="M4 20h16M7 16V8h4v8M14 16V4h4v12"/>', mat: '<circle cx="8" cy="8" r="4"/><circle cx="16" cy="8" r="4"/><circle cx="8" cy="16" r="4"/><circle cx="16" cy="16" r="4"/>',
    render: '<path d="M4 18l6-12 4 8 2-3 4 7z"/>', setup: '<path d="M4 6h16M4 12h16M4 18h16"/><circle cx="9" cy="6" r="2"/><circle cx="15" cy="12" r="2"/><circle cx="7" cy="18" r="2"/>',
    tasks: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>', help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 17h.01"/>',
  };
  const svg = n => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${ICON[n]}</svg>`;
  const TB = [['undo', 'Undo (Ctrl+Z)'], ['redo', 'Redo (Ctrl+Y)'], '|', ['link', 'Select and Link', 1], ['unlink', 'Unlink Selection', 1], '|', ['filter'], ['select', 'Select Object (Q)'], ['byname', 'Select by Name (H)'], ['region', 'Rectangular Selection Region', 1], '|',
    ['move', 'Select and Move (W)'], ['rotate', 'Select and Rotate (E)'], ['scale', 'Select and Uniform Scale (R)'], ['coord'], '|', ['snap', '3D Snaps Toggle (S)'], ['asnap', 'Angle Snap Toggle (A)'], '|', ['mirror', 'Mirror', 1], ['align', 'Align', 1], '|', ['mat', 'Material Editor (M)', 1], ['setup', 'Render Setup (F10)', 1], ['render', 'Render Production (Shift+Q)', 1],
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
  const scene = new THREE.Scene();
  const hemi = new THREE.HemisphereLight(0xffffff, 0x50555c, 1.25); hemi.position.set(0, 0, 1); scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffffff, 1.6); scene.add(key); scene.add(key.target);
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
    cam.up.set(...d.up);
    const dist = d.ortho ? 1000 : 330;
    cam.position.set(target.x + d.dir[0] * dist, target.y + d.dir[1] * dist, target.z + d.dir[2] * dist);
    if (d.ortho) cam.zoom = 1;
    cam.lookAt(target); v.cam = cam;
    if (!tcs[i]) {
      const tc = new TransformControls(cam, el); tc.size = isTouch ? 1.15 : 0.9; scene.add(tc.getHelper()); tcs[i] = tc;
      tc.addEventListener('dragging-changed', e => { VP.forEach(x => x.controls && (x.controls.enabled = !e.value)); S.dragging = e.value; if (!e.value) { commit(); S.justDragged = performance.now(); } });
      tc.addEventListener('objectChange', () => { tcs.forEach(t => t !== tc && t.object && t.getHelper().updateMatrixWorld()); updateTypeIn(); if (S.tab === 'motion') renderCP(); updateBrackets(); });
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
  function makeObj(type, p, at, extra = {}) {
    const o = { id: uid++, type, name: extra.name || nextName(type), src: extra.src || { p, mods: [] }, color: extra.color || WIRE_COLORS[S.colorIdx++ % WIRE_COLORS.length],
      hidden: false, see: false, piv: new THREE.Vector3() };
    o.group = new THREE.Group(); o.group.position.set(...(at || [0, 0, 0]));
    o.mat = new THREE.MeshStandardMaterial({ color: o.color, roughness: 0.62, metalness: 0, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
    o.mesh = new THREE.Mesh(new THREE.BufferGeometry(), o.mat); o.mesh.userData.obj = o;
    o.wire = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: o.color }));
    o.brk = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xffffff })); o.brk.visible = false;
    o.group.add(o.mesh, o.wire, o.brk); scene.add(o.group); S.objs.push(o);
    rebuild(o); return o;
  }
  function nextName(type) { S.counters[type] = (S.counters[type] || 0) + 1; let n; do { n = type + String(S.counters[type]).padStart(3, '0'); S.counters[type]++; } while (S.objs.some(o => o.name === n)); S.counters[type]--; return n; }
  function rebuild(o) {
    const p = o.src.p, g = BUILD[o.type](p), pos = Float32Array.from(g.pos);
    for (const m of o.src.mods) if (m.on) APPLY[m.type](pos, m.p);
    if (o.piv.lengthSq()) for (let i = 0; i < pos.length; i += 3) { pos[i] += o.piv.x; pos[i + 1] += o.piv.y; pos[i + 2] += o.piv.z; }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setIndex(g.idx); geo.computeVertexNormals(); geo.computeBoundingBox(); geo.computeBoundingSphere();
    o.mesh.geometry.dispose(); o.mesh.geometry = geo;
    const smooth = p.smooth === undefined ? !['Box', 'Pyramid', 'Plane'].includes(o.type) && false : p.smooth;
    o.mat.flatShading = !smooth; o.mat.needsUpdate = true;
    const W = wireEdges(g.pos, g.idx, g.quads), wp = new Float32Array(W.edges.length * 3);
    for (let i = 0; i < W.edges.length; i++) { const v = W.edges[i]; wp[3 * i] = pos[3 * v]; wp[3 * i + 1] = pos[3 * v + 1]; wp[3 * i + 2] = pos[3 * v + 2]; }
    o.wire.geometry.dispose(); o.wire.geometry = new THREE.BufferGeometry(); o.wire.geometry.setAttribute('position', new THREE.BufferAttribute(wp, 3));
    o.polys = W.polys; o.verts = W.verts; o.tris = g.idx.length / 3;
    updateBrackets(o); req();
  }
  function rebuildShared(o) { S.objs.forEach(x => (x.src === o.src || x.src.p === o.src.p) && rebuild(x)); }
  function updateBrackets(o = S.sel) {
    if (!o) return; const bb = o.mesh.geometry.boundingBox; if (!bb) return;
    const a = bb.min, b = bb.max, L = [(b.x - a.x) * 0.22, (b.y - a.y) * 0.22, (b.z - a.z) * 0.22], P = [];
    for (const x of [a.x, b.x]) for (const y of [a.y, b.y]) for (const z of [a.z, b.z]) {
      const sx = x === a.x ? 1 : -1, sy = y === a.y ? 1 : -1, sz = z === a.z ? 1 : -1;
      P.push(x, y, z, x + sx * L[0], y, z, x, y, z, x, y + sy * L[1], z, x, y, z, x, y, z + sz * L[2]);
    }
    o.brk.geometry.dispose(); o.brk.geometry = new THREE.BufferGeometry(); o.brk.geometry.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); req();
  }
  function removeObj(o) {
    scene.remove(o.group); o.mesh.geometry.dispose(); o.wire.geometry.dispose(); o.brk.geometry.dispose(); o.mat.dispose();
    S.objs = S.objs.filter(x => x !== o); if (S.sel === o) select(null);
  }
  function select(o) {
    S.sel = o; S.objs.forEach(x => x.brk.visible = false); S.modSel = -1;
    tcs.forEach(t => { if (o && ['move', 'rotate', 'scale'].includes(S.mode) && !o.hidden) t.attach(o.group); else t.detach(); });
    if (S.justCreated && S.justCreated !== o) S.justCreated = null;
    updateBrackets(); renderList(); renderCP(); updateTypeIn(); setPrompt(); req();
  }
  function setMode(m) {
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
      if (!ps.has(o.src.p)) { ps.set(o.src.p, P.length); P.push({ ...o.src.p }); }
      if (!ms.has(o.src.mods)) { ms.set(o.src.mods, M.length); M.push(o.src.mods.map(m => ({ type: m.type, on: m.on, p: { ...m.p } }))); }
      const g = o.group;
      return { type: o.type, name: o.name, p: ps.get(o.src.p), m: ms.get(o.src.mods), color: o.color, hidden: o.hidden, see: o.see, piv: o.piv.toArray(),
        pos: g.position.toArray(), rot: [g.rotation.x, g.rotation.y, g.rotation.z], scl: g.scale.toArray() };
    });
    return JSON.stringify({ P, M, objs, sel: S.objs.indexOf(S.sel), counters: S.counters, colorIdx: S.colorIdx });
  }
  function restore(js) {
    const d = JSON.parse(js); [...S.objs].forEach(removeObj);
    const srcs = new Map(), P = d.P.map(x => ({ ...x })), M = d.M.map(ms => ms.map(m => ({ ...m, p: { ...m.p } })));
    d.objs.forEach(r => {
      const k = r.p + ':' + r.m; if (!srcs.has(k)) srcs.set(k, { p: P[r.p], mods: M[r.m] });
      const o = makeObj(r.type, null, r.pos, { name: r.name, src: srcs.get(k), color: r.color });
      o.group.rotation.set(...r.rot); o.group.scale.set(...r.scl); o.hidden = r.hidden; o.see = !!r.see; o.piv.fromArray(r.piv || [0, 0, 0]); rebuild(o);
    });
    S.counters = d.counters || {}; S.colorIdx = d.colorIdx || 0;
    select(d.sel >= 0 ? S.objs[d.sel] : null);
  }
  let last = serialize();
  function commit() {
    const now = serialize(); if (now === last) return;
    S.undo.push(last); if (S.undo.length > 60) S.undo.shift(); S.redo = []; last = now;
    try { localStorage.setItem('mx_autosave', now); } catch (e) {}
    checkTasks();
  }
  function undo() { if (!S.undo.length) return; S.redo.push(last); last = S.undo.pop(); restore(last); checkTasks(); }
  function redo() { if (!S.redo.length) return; S.undo.push(last); last = S.redo.pop(); restore(last); checkTasks(); }

  /* ---------- Scene Explorer ---------- */
  function renderList() {
    const q = ($('.mx-find').value || '').toLowerCase();
    $('#mxList').innerHTML = [...S.objs].sort((a, b) => a.name.localeCompare(b.name)).filter(o => !q || o.name.toLowerCase().includes(q)).map(o =>
      `<div class="it${o === S.sel ? ' on' : ''}" data-id="${o.id}"><span class="eye${o.hidden ? ' off' : ''}" data-eye="${o.id}">${o.hidden ? '◌' : '◉'}</span><i style="background:${o.color}"></i>${esc(o.name)}</div>`).join('')
      || '<div class="mx-empty">—</div>';
  }
  $('.mx-find').addEventListener('input', renderList);
  $('#mxList').addEventListener('click', e => {
    const eye = e.target.closest('[data-eye]'); const it = e.target.closest('[data-id]'); if (!it) return;
    const o = S.objs.find(x => x.id === +it.dataset.id);
    if (eye) { o.hidden = !o.hidden; if (o.hidden && S.sel === o) select(null); else renderList(); commit(); req(); return; }
    if (!o.hidden) select(o);
  });

  /* ---------- Command Panel ---------- */
  const TABS = [['create', 'Create', '<path d="M12 5v14M5 12h14"/>'], ['modify', 'Modify', '<path d="M4 20l4-1 11-11-3-3L5 16z"/>'], ['hierarchy', 'Hierarchy', '<circle cx="12" cy="5" r="2"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="19" r="2"/><path d="M12 7v5M12 12l-6 5M12 12l6 5"/>'],
    ['motion', 'Motion', '<circle cx="6" cy="18" r="3"/><path d="M8 15c4-9 8-10 12-10"/>'], ['display', 'Display', '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'], ['utilities', 'Utilities', '<path d="M14 6l4 4-8 8H6v-4z"/><path d="M4 20h16"/>']];
  $('#mxTabs').innerHTML = TABS.map(([k, t, p]) => `<button data-tab="${k}" title="${t}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${p}</svg><span>${t}</span></button>`).join('');
  $('#mxTabs').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) { S.tab = b.dataset.tab; if (S.tab !== 'create' && S.mode === 'create') setMode('select'); renderCP(); } });

  const ro = (title, body, id, closed) => `<div class="ro${closed && !S['ro_' + id] || S['ro_' + id] === 'c' ? ' closed' : ''}" data-ro="${id}"><div class="ro-h"><span>${closed && !S['ro_' + id] || S['ro_' + id] === 'c' ? '+' : '−'}</span> ${title}</div><div class="ro-b">${body}</div></div>`;
  function ctl(d, v, path) {
    const hint = H[d.k] ? ` data-hint="${esc(H[d.k])}"` : '';
    if (d.kind === 'bool') return `<label class="cb"${hint}><input type="checkbox" data-path="${path}" ${v ? 'checked' : ''}> ${d.label}</label>`;
    if (d.kind === 'enum') return `<div class="row"${hint}><span>${d.label}:</span><span class="rad">${d.opts.map(o => `<label><input type="radio" name="${path}" data-path="${path}" value="${o}" ${o === v ? 'checked' : ''}>${o}</label>`).join('')}</span></div>`;
    return `<div class="row"${hint}><span>${d.label}:</span><span class="sp" data-path="${path}"><input value="${fmt(v, d)}" inputmode="decimal"><b class="up">▲</b><b class="dn">▼</b></span></div>`;
  }
  function paramsHTML(defs, vals, prefix) { return defs.map(d => ctl(d, vals[d.k], `${prefix}.${d.k}`)).join(''); }
  // yo'l (path) bo'yicha qiymatni topish/o'rnatish
  function target(path) {
    const [a, k] = path.split('.');
    if (a === 'cdef') return { obj: S.createDefaults[S.createType], def: TYPES[S.createType].p.find(d => d.k === k), k, apply: () => {} };
    if (a === 'obj') { const o = S.sel; return { obj: o.src.p, def: TYPES[o.type].p.find(d => d.k === k), k, apply: () => rebuildShared(o) }; }
    if (a.startsWith('mod')) { const o = S.sel, m = o.src.mods[+a.slice(3)]; return { obj: m.p, def: MODS[m.type].p.find(d => d.k === k), k, apply: () => rebuildShared(o) }; }
    if (a === 'tr') { const o = S.sel, ax = 'xyz'['XYZ'.indexOf(k[1])], g = o.group;
      const get = () => k[0] === 'p' ? g.position[ax] : k[0] === 'r' ? g.rotation[ax] / D2R : g.scale[ax] * 100;
      const box = { get v() { return get(); } };
      return { obj: new Proxy({}, { get: () => get(), set: (_, __, v) => { if (k[0] === 'p') g.position[ax] = v; else if (k[0] === 'r') g.rotation[ax] = v * D2R; else g.scale[ax] = Math.max(0.0001, v / 100); return true; } }),
        def: { kind: 'num', unit: k[0] === 'p' ? 'cm' : k[0] === 'r' ? '°' : '%', min: -1e6, max: 1e6 }, k: 'v', apply: () => { updateTypeIn(); updateBrackets(); req(); }, box };
    }
  }
  function setVal(path, v, commitNow) {
    const t = target(path); if (!t) return;
    if (t.def.kind === 'num') { v = Math.min(t.def.max, Math.max(t.def.min, v)); if (t.def.int) v = Math.round(v); }
    t.obj[t.k] = v; t.apply();
    const sp = CP.querySelector(`.sp[data-path="${path}"] input`); if (sp && document.activeElement !== sp) sp.value = fmt(v, t.def);
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
    else if (el.id === 'mxName' && S.sel) { S.sel.name = el.value.trim() || S.sel.name; renderList(); commit(); }
    else if (el.id === 'mxColor' && S.sel) { S.sel.color = el.value; S.sel.mat.color.set(el.value); S.sel.wire.material.color.set(el.value); renderList(); commit(); req(); }
    else if (el.id === 'mxModList' && el.value) { addMod(el.value); el.value = ''; }
  });
  CP.addEventListener('input', e => { const el = e.target; if (el.id === 'mxName' && S.sel) { S.sel.name = el.value; renderList(); checkTasksSoon(); } });
  // spinner: yozish, Enter, strelkani bosish yoki tortish
  CP.addEventListener('keydown', e => { const sp = e.target.closest('.sp'); if (sp && e.key === 'Enter') { e.target.blur(); } e.stopPropagation(); });
  CP.addEventListener('focusout', e => { const sp = e.target.closest('.sp'); if (sp && sp.dataset.path) { const v = parseFloat(e.target.value.replace(',', '.')); if (!isNaN(v)) setVal(sp.dataset.path, v, true); else { const t = target(sp.dataset.path); e.target.value = fmt(t.obj[t.k], t.def); } } });
  CP.addEventListener('input', e => { const sp = e.target.closest('.sp'); if (sp && sp.dataset.path) { const v = parseFloat(e.target.value.replace(',', '.')); if (!isNaN(v)) setVal(sp.dataset.path, v, false); } });
  CP.addEventListener('pointerdown', e => {
    const ar = e.target.closest('.sp b'); if (!ar) return; e.preventDefault();
    const sp = ar.parentElement, t = target(sp.dataset.path), d = t.def, v0 = +t.obj[t.k], y0 = e.clientY;
    const step = d.step || (d.int ? 1 : d.unit === '°' ? 1 : d.unit === '%' ? 1 : Math.max(0.1, Math.abs(v0) * 0.01 + 0.1));
    let moved = false;
    const mv = ev => { const dy = y0 - ev.clientY; if (Math.abs(dy) > 3) moved = true; if (moved) setVal(sp.dataset.path, v0 + Math.round(dy / (d.int ? 6 : 2)) * step, false); };
    const up = () => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); if (!moved) setVal(sp.dataset.path, v0 + (ar.classList.contains('up') ? step : -step), false); commit(); };
    window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
  });
  CP.addEventListener('pointerover', e => { const h = e.target.closest('[data-hint]'); if (h) setPrompt(h.dataset.hint); });
  CP.addEventListener('focusin', e => { const h = e.target.closest('[data-hint]'); if (h) setPrompt(h.dataset.hint); });

  function nameColor(o) {
    return ro('Name and Color', `<div class="nc"><input id="mxName" value="${esc(o ? o.name : '')}" ${o ? '' : 'disabled'} data-hint="${esc(TX.tasks[0])}"><input type="color" id="mxColor" value="${o ? o.color : '#888888'}" ${o ? '' : 'disabled'}></div>`, 'nc');
  }
  function renderCP() {
    $$('#mxTabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === S.tab));
    const o = S.sel; let h = '';
    if (S.tab === 'create') {
      const ct = S.createType;
      h += `<div class="cats">${['Geometry', 'Shapes', 'Lights', 'Cameras', 'Helpers', 'Space Warps', 'Systems'].map((c, i) => `<b class="${i ? 'dis' : 'on'}" title="${c}">${['●', '〰', '✺', '🎥', '✚', '≋', '⚙'][i]}</b>`).join('')}</div>`;
      h += `<select class="mx-sel wide" disabled><option>Standard Primitives</option></select>`;
      h += ro('Object Type', `<label class="cb"><input type="checkbox" disabled> AutoGrid</label><div class="otypes">${TYPE_ORDER.map(t => `<button data-act="ctype" data-arg="${t}" class="${ct === t ? 'on' : ''}">${t}</button>`).join('')}</div>`, 'ot');
      const edit = S.justCreated && S.justCreated === o ? o : null;
      if (edit) {
        h += nameColor(edit);
        h += ro('Parameters', paramsHTML(TYPES[edit.type].p, edit.src.p, 'obj'), 'par');
      } else if (ct) {
        h += nameColor(null);
        const kd = S.createDefaults[ct]; S.kbd = S.kbd || { x: 0, y: 0, z: 0 };
        h += ro('Keyboard Entry', `<div class="row"><span>X:</span><span class="sp kb" data-kb="x"><input value="${S.kbd.x}"></span></div><div class="row"><span>Y:</span><span class="sp kb" data-kb="y"><input value="${S.kbd.y}"></span></div><div class="row"><span>Z:</span><span class="sp kb" data-kb="z"><input value="${S.kbd.z}"></span></div><button class="wide" data-act="kbcreate">Create</button>`, 'kb', true);
        h += ro('Parameters', paramsHTML(TYPES[ct].p, kd, 'cdef'), 'par');
      }
    } else if (!o) h = `<p class="mx-info">${esc(TX.no_sel_modify)}</p>`;
    else if (S.tab === 'modify') {
      h += `<div class="nc"><input id="mxName" value="${esc(o.name)}"><input type="color" id="mxColor" value="${o.color}"></div>`;
      h += `<select id="mxModList" class="mx-sel wide"><option value="">Modifier List</option>${Object.keys(MODS).map(m => `<option>${m}</option>`).join('')}<option disabled>TurboSmooth (3ds Max)</option><option disabled>Edit Poly (3ds Max)</option><option disabled>Shell (3ds Max)</option></select>`;
      const mods = o.src.mods, inst = S.objs.filter(x => x.src === o.src).length;
      h += `<div class="stack">${mods.map((m, i) => ({ m, i })).reverse().map(({ m, i }) => `<div class="si${S.modSel === i ? ' on' : ''}" data-act="msel" data-arg="${i}"><b data-act="mon" data-arg="${i}" class="${m.on ? '' : 'off'}">💡</b>${m.type}</div>`).join('')}
        <div class="si base${S.modSel === -1 ? ' on' : ''}" data-act="msel" data-arg="-1">${inst > 1 ? '<i>' + o.type + '</i>' : o.type}</div></div>
        <div class="stackbtn"><button disabled title="Pin Stack">📌</button><button disabled title="Show end result">⊓</button><button data-act="unique" title="Make Unique" ${inst > 1 || S.objs.some(x => x !== o && x.src.p === o.src.p) ? '' : 'disabled'}>⊘</button><button data-act="mdel" title="Remove modifier from the stack" ${S.modSel >= 0 ? '' : 'disabled'}>🗑</button></div>`;
      if (S.modSel >= 0 && mods[S.modSel]) h += ro('Parameters', paramsHTML(MODS[mods[S.modSel].type].p, mods[S.modSel].p, 'mod' + S.modSel), 'mpar');
      else h += ro('Parameters', paramsHTML(TYPES[o.type].p, o.src.p, 'obj'), 'par');
    } else if (S.tab === 'hierarchy') {
      h += `<div class="seg"><b class="on">Pivot</b><b class="dis">IK</b><b class="dis">Link Info</b></div>`;
      h += ro('Adjust Pivot', `<p class="mx-mini">Move/Rotate/Scale:</p><button class="wide dis" title="${esc(TX.unavailable)}">Affect Pivot Only</button><button class="wide dis" title="${esc(TX.unavailable)}">Affect Object Only</button><p class="mx-mini">Alignment:</p><button class="wide" data-act="pcenter">Center to Object</button><button class="wide" data-act="pbase">Pivot to Base (Z min)</button><button class="wide" data-act="preset">Reset Pivot</button>`, 'piv');
      h += ro('Adjust Transform', `<button class="wide" data-act="rxform">Reset: Transform</button><button class="wide" data-act="rscale">Reset: Scale</button>`, 'adj');
    } else if (S.tab === 'motion') {
      const tr = (lbl, k, unit) => ['X', 'Y', 'Z'].map(a => ctl({ k: 't', label: `${lbl} ${a}`, kind: 'num', unit, min: -1e6, max: 1e6 }, target('tr.' + k + a).obj.v, 'tr.' + k + a)).join('');
      h += ro('Position', tr('Position', 'p', 'cm'), 'mp') + ro('Rotation (Euler XYZ)', tr('Rotation', 'r', '°'), 'mr') + ro('Scale', tr('Scale', 's', '%'), 'ms');
    } else if (S.tab === 'display') {
      h += ro('Hide', `<button class="wide" data-act="hidesel">Hide Selected</button><button class="wide" data-act="hideun">Hide Unselected</button><button class="wide" data-act="unhide">Unhide All</button>`, 'hide');
      h += ro('Display Properties', `<label class="cb"><input type="checkbox" data-act2="see" ${o.see ? 'checked' : ''}> See-Through (Alt+X)</label><label class="cb"><input type="checkbox" data-act2="box" ${o.asBox ? 'checked' : ''}> Display as Box</label>`, 'dp');
    } else if (S.tab === 'utilities') {
      const m = measure(o);
      h += ro('Measure', `<div class="kv"><span>Object</span><b>${esc(o.name)}</b><span>Surface Area</span><b>${m.area.toFixed(1)} cm²</b><span>Volume</span><b>${m.vol.toFixed(1)} cm³</b><span>Dimensions</span><b>X ${m.d.x.toFixed(1)} · Y ${m.d.y.toFixed(1)} · Z ${m.d.z.toFixed(1)} cm</b><span>Polys</span><b>${o.polys}</b><span>Tris</span><b>${o.tris}</b><span>Verts</span><b>${o.verts}</b></div><p class="mx-mini">${esc(TX.measure_note)}</p>`, 'meas');
    }
    CP.innerHTML = h;
  }
  CP.addEventListener('change', e => {
    const a = e.target.dataset.act2; if (!a || !S.sel) return;
    if (a === 'see') { S.sel.see = e.target.checked; } if (a === 'box') { S.sel.asBox = e.target.checked; } commit(); req();
  });
  CP.addEventListener('focusout', e => { const kb = e.target.closest('.kb'); if (kb) S.kbd[kb.dataset.kb] = parseFloat(e.target.value.replace(',', '.')) || 0; });

  function measure(o) {
    const g = o.mesh.geometry, P = g.getAttribute('position'), I = g.index.array, s = o.group.scale; let area = 0, vol = 0;
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), ab = new THREE.Vector3(), ac = new THREE.Vector3();
    for (let i = 0; i < I.length; i += 3) {
      a.fromBufferAttribute(P, I[i]).multiply(s); b.fromBufferAttribute(P, I[i + 1]).multiply(s); c.fromBufferAttribute(P, I[i + 2]).multiply(s);
      area += ab.subVectors(b, a).cross(ac.subVectors(c, a)).length() / 2; vol += a.dot(b.clone().cross(c)) / 6;
    }
    const d = new THREE.Vector3(); g.boundingBox.getSize(d).multiply(s);
    return { area, vol: Math.abs(vol), d };
  }

  function addMod(type) {
    const o = S.sel; if (!o) return;
    o.src.mods.push({ type, on: true, p: defaults(MODS[type].p) }); S.modSel = o.src.mods.length - 1; rebuildShared(o); renderCP(); commit();
  }
  function action(a, arg) {
    const o = S.sel;
    if (a === 'ctype') { S.createType = S.createType === arg ? null : arg; S.justCreated = null; S.mode = S.createType ? 'create' : 'select'; tcs.forEach(t => t.detach()); renderCP(); syncTool(); setPrompt(); return; }
    if (a === 'kbcreate') { const k = S.kbd; create(S.createType, [k.x, k.y, k.z]); return; }
    if (!o) return;
    if (a === 'msel') { S.modSel = +arg; renderCP(); return; }
    if (a === 'mon') { const m = o.src.mods[+arg]; m.on = !m.on; rebuildShared(o); renderCP(); commit(); return; }
    if (a === 'mdel') { o.src.mods.splice(S.modSel, 1); S.modSel = -1; rebuildShared(o); renderCP(); commit(); return; }
    if (a === 'unique') { o.src = { p: { ...o.src.p }, mods: o.src.mods.map(m => ({ ...m, p: { ...m.p } })) }; rebuild(o); renderCP(); commit(); return; }
    if (a === 'pcenter' || a === 'pbase' || a === 'preset') {
      const bb = o.mesh.geometry.boundingBox, c = new THREE.Vector3();
      if (a === 'pcenter') bb.getCenter(c); else if (a === 'pbase') { bb.getCenter(c); c.z = bb.min.z; } else c.copy(o.piv).negate();
      o.piv.sub(c); o.group.position.add(c.clone().multiply(o.group.scale).applyQuaternion(o.group.quaternion)); rebuild(o); commit(); updateTypeIn(); return;
    }
    if (a === 'rxform') { o.group.rotation.set(0, 0, 0); o.group.scale.set(1, 1, 1); }
    if (a === 'rscale') o.group.scale.set(1, 1, 1);
    if (a === 'hidesel') { o.hidden = true; select(null); }
    if (a === 'hideun') S.objs.forEach(x => x !== o && (x.hidden = true));
    if (a === 'unhide') S.objs.forEach(x => x.hidden = false);
    renderList(); updateTypeIn(); updateBrackets(); commit(); req();
  }
  function create(type, at) {
    const p = { ...S.createDefaults[type] };
    const o = makeObj(type, p, at); S.justCreated = o; S.tab = 'create'; select(o); S.justCreated = o; renderCP(); commit(); toast(`${o.name} ✓`);
  }

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
  function setPrompt(t) {
    $('#mxSelN').textContent = S.sel ? TX.one_sel : TX.none_sel;
    if (t) { $('#mxPrompt').textContent = t; return; }
    $('#mxPrompt').textContent = S.mode === 'create' ? TX.prompt_create.replace('{t}', S.createType) : S.mode === 'move' ? TX.prompt_move : S.mode === 'rotate' ? TX.prompt_rotate : S.mode === 'scale' ? TX.prompt_scale : (isTouch ? TX.prompt_select_touch : TX.prompt_select);
  }
  let toastT; function toast(t) { const el = $('#mxToast'); el.textContent = t; el.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => el.hidden = true, 1800); }

  /* ---------- viewport hodisalari ---------- */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function pick(i, ev) {
    const r = vpEls[i].getBoundingClientRect(); ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, VP[i].cam); return ray;
  }
  vpEls.forEach((el, i) => {
    let down = null;
    el.addEventListener('pointerdown', ev => {
      if (ev.target.closest('.vpl')) return;
      if (S.active !== i) { S.active = i; markActive(); }
      down = { x: ev.clientX, y: ev.clientY, t: performance.now(), alt: ev.altKey };
      if (ev.altKey && ev.button === 0 && !VIEWS[VP[i].view].ortho) VP[i].controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
      else if (ev.altKey && ev.button === 0) VP[i].controls.mouseButtons.LEFT = THREE.MOUSE.PAN;
      else VP[i].controls.mouseButtons.LEFT = navMode === 'pan' ? THREE.MOUSE.PAN : navMode === 'orbit' && !VIEWS[VP[i].view].ortho ? THREE.MOUSE.ROTATE : -1;
    }, true);
    el.addEventListener('pointerup', ev => {
      if (!down) return; const moved = Math.hypot(ev.clientX - down.x, ev.clientY - down.y) > 6, dt = performance.now() - down.t; const d0 = down; down = null;
      if (moved || dt > 600 || d0.alt || S.dragging || (S.justDragged && performance.now() - S.justDragged < 150) || (ev.pointerType === 'mouse' && ev.button !== 0)) return;
      const rc = pick(i, ev);
      if (S.mode === 'create' && S.createType) {
        const v = VIEWS[VP[i].view], n = v.plane === 'XY' ? [0, 0, 1] : v.plane === 'XZ' ? [0, 1, 0] : [1, 0, 0];
        const pl = new THREE.Plane(new THREE.Vector3(...n), 0), hit = new THREE.Vector3();
        if (rc.ray.intersectPlane(pl, hit)) { if (S.snap) hit.set(Math.round(hit.x / 10) * 10, Math.round(hit.y / 10) * 10, Math.round(hit.z / 10) * 10); create(S.createType, hit.toArray().map(x => Math.round(x * 10) / 10)); }
        return;
      }
      if (tcs[i].axis) return;
      const hits = rc.intersectObjects(S.objs.filter(o => !o.hidden).map(o => o.mesh), false);
      select(hits.length ? hits[0].object.userData.obj : null);
    });
    el.addEventListener('wheel', () => { if (S.active !== i) { S.active = i; markActive(); } }, { passive: true });
    el.querySelector('.vpl').addEventListener('click', ev => {
      const a = ev.target.dataset.a; if (!a) return; S.active = i; markActive();
      if (a === 'shade') { const v = VP[i]; v.shade = { shaded: 'edged', edged: 'wire', wire: 'shaded' }[v.shade]; setupView(i, true); }
      if (a === 'view') dropdown(ev.target, ['Perspective', 'Top', 'Bottom', 'Front', 'Back', 'Left', 'Right'], v => { VP[i].view = v; setupView(i); zoomExt(i); });
      if (a === 'plus') dropdown(ev.target, ['Maximize Viewport (Alt+W)', 'Show Grids (G)', 'Viewport Statistics (7)'], v => { if (v.startsWith('Max')) toggleMax(); else if (v.startsWith('Show')) { S.gridOn = !S.gridOn; req(); } else { S.stats = !S.stats; req(); } });
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
  $('.mx-vtabs').addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (!b) return; const k = +b.dataset.v; if (k === 4) { S.maxed = false; } else { S.active = k; S.maxed = true; } layout(); markActive(); req(); });
  function toggleMax() { S.maxed = !S.maxed; layout(); markActive(); req(); }

  function sceneBox(onlySel) {
    scene.updateMatrixWorld(true); const bb = new THREE.Box3(); (onlySel && S.sel ? [S.sel] : S.objs.filter(o => !o.hidden)).forEach(o => bb.expandByObject(o.mesh));
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
    File: [['New Scene', 'new', 'Ctrl+N'], ['Save to browser', 'save'], ['Open from browser', 'open'], ['Save viewport image (PNG)', 'shot']],
    Edit: [['Undo', 'undo', 'Ctrl+Z'], ['Redo', 'redo', 'Ctrl+Y'], ['Delete', 'del', 'Delete'], ['Clone', 'clone', 'Ctrl+V'], ['Select None', 'selnone', 'Ctrl+D']],
    Create: [['Standard Primitives', null], ...TYPE_ORDER.map(t => ['   ' + t, 'c:' + t])],
    Modifiers: [['Parametric Deformers', null], ...Object.keys(MODS).map(m => ['   ' + m, 'm:' + m])],
    Views: [['Maximize Viewport Toggle', 'max', 'Alt+W'], ['Zoom Extents All', 'ext', 'Z'], ['Show Grids', 'grid', 'G'], ['Viewport Statistics', 'stats', '7']],
    Help: [[TX.help_title, 'help'], ['3ds Max Help (autodesk.com)', 'ahelp']],
  };
  function dropdown(anchor, items, cb) {
    const dd = $('#mxDD'), r = anchor.getBoundingClientRect(), rr = root.getBoundingClientRect();
    dd.innerHTML = items.map((it, k) => typeof it === 'string' ? `<button data-k="${k}">${esc(it)}</button>` : it[1] === null ? `<div class="hd">${esc(it[0])}</div>` : `<button data-k="${k}">${esc(it[0])}<kbd>${it[2] || ''}</kbd></button>`).join('');
    dd.style.left = Math.min(r.left - rr.left, rr.width - 230) + 'px'; dd.style.top = (r.bottom - rr.top) + 'px'; dd.hidden = false;
    dd.onclick = e => { const b = e.target.closest('[data-k]'); if (!b) return; dd.hidden = true; const it = items[+b.dataset.k]; cb(typeof it === 'string' ? it : it[1]); };
  }
  root.addEventListener('pointerdown', e => { if (!e.target.closest('#mxDD') && !e.target.closest('[data-menu]') && !e.target.closest('.vpl')) $('#mxDD').hidden = true; });
  $('.mx-menu').addEventListener('click', e => {
    const b = e.target.closest('[data-menu]'); if (!b) return; const m = b.dataset.menu;
    dropdown(b, MENUS[m] || [[TX.unavailable, null]], cmd);
  });
  function cmd(c) {
    if (!c) return;
    if (c.startsWith('c:')) { S.tab = 'create'; action('ctype', c.slice(2)); return; }
    if (c.startsWith('m:')) { if (!S.sel) return toast(TX.no_sel_modify); S.tab = 'modify'; addMod(c.slice(2)); return; }
    ({
      new: () => { [...S.objs].forEach(removeObj); S.counters = {}; commit(); toast(TX.new_scene); },
      save: () => { try { localStorage.setItem('mx_saved', serialize()); toast(TX.saved); } catch (e) {} },
      open: () => { let s = null; try { s = localStorage.getItem('mx_saved'); } catch (e) {} if (s) { restore(s); commit(); toast(TX.loaded); } else toast(TX.nothing_saved); },
      shot: () => { render(); const a = document.createElement('a'); a.download = '3dsmax_simulyator.png'; a.href = canvas.toDataURL('image/png'); a.click(); toast(TX.shot); },
      undo, redo, del: () => { if (S.sel) { removeObj(S.sel); commit(); } }, clone: cloneDialog, selnone: () => select(null),
      max: toggleMax, ext: zoomExtAll, grid: () => { S.gridOn = !S.gridOn; req(); }, stats: () => { S.stats = !S.stats; req(); },
      help: helpDialog, ahelp: () => window.open('https://help.autodesk.com/view/3DSMAX/2026/ENU/', '_blank'),
    }[c] || (() => {}))();
  }
  function modal(html, onOk) {
    const m = $('#mxModal'); m.innerHTML = `<div class="mx-dlg">${html}<div class="mx-dlgb">${onOk ? `<button data-ok>${esc(TX.ok)}</button>` : ''}<button data-cancel>${esc(onOk ? TX.cancel : 'OK')}</button></div></div>`; m.hidden = false;
    m.onclick = e => { if (e.target.closest('[data-ok]')) { onOk(m); m.hidden = true; } else if (e.target.closest('[data-cancel]') || e.target === m) m.hidden = true; };
    m.onkeydown = e => e.stopPropagation();
  }
  function cloneDialog() {
    const o = S.sel; if (!o) return toast(TX.no_sel_modify);
    modal(`<h3>${esc(TX.clone_title)}</h3><fieldset><legend>Object</legend>
      <label><input type="radio" name="ck" value="copy"> ${esc(TX.clone_copy)}</label><label><input type="radio" name="ck" value="inst" checked> ${esc(TX.clone_inst)}</label><label><input type="radio" name="ck" value="ref"> ${esc(TX.clone_ref)}</label></fieldset>
      <label class="row"><span>${esc(TX.clone_n)}:</span><input type="number" id="ckN" value="1" min="1" max="50"></label><p class="mx-mini">${esc(TX.clone_tip)}</p>`, m => {
      const k = m.querySelector('[name=ck]:checked').value, n = Math.max(1, Math.min(50, +m.querySelector('#ckN').value || 1)); let lastO = o;
      for (let i = 0; i < n; i++) {
        const src = k === 'inst' ? o.src : k === 'ref' ? { p: o.src.p, mods: o.src.mods.map(x => ({ ...x, p: { ...x.p } })) } : { p: { ...o.src.p }, mods: o.src.mods.map(x => ({ ...x, p: { ...x.p } })) };
        const c = makeObj(o.type, null, o.group.position.toArray(), { src, color: o.color }); c.group.rotation.copy(o.group.rotation); c.group.scale.copy(o.group.scale); c.piv.copy(o.piv); rebuild(c); lastO = c;
      }
      select(lastO); commit(); toast(`${n} × ${k === 'inst' ? 'Instance' : k === 'ref' ? 'Reference' : 'Copy'}`);
    });
  }
  function helpDialog() { modal(`<h3>${esc(TX.help_title)}</h3><table class="mx-keys">${TX.help.map(([a, b]) => `<tr><td><kbd>${esc(a)}</kbd></td><td>${esc(b)}</td></tr>`).join('')}</table><p class="mx-mini">${esc(TX.note)}</p>`); }

  $('#mxTool').addEventListener('click', e => {
    const b = e.target.closest('[data-tb]'); if (!b) return; const t = b.dataset.tb;
    if (b.classList.contains('dis')) return toast(TX.unavailable);
    if (t === 'undo') undo(); else if (t === 'redo') redo();
    else if (['select', 'move', 'rotate', 'scale'].includes(t)) setMode(t);
    else if (t === 'byname') { $('.mx-exp').classList.add('show'); $('.mx-find').focus(); }
    else if (t === 'snap') { S.snap = !S.snap; tcs.forEach(x => x.setTranslationSnap(S.snap ? 10 : null)); syncTool(); toast('3D Snap: ' + (S.snap ? 'ON (10 cm)' : 'OFF')); }
    else if (t === 'asnap') { S.asnap = !S.asnap; tcs.forEach(x => x.setRotationSnap(S.asnap ? 5 * D2R : null)); syncTool(); toast('Angle Snap: ' + (S.asnap ? 'ON (5°)' : 'OFF')); }
    else if (t === 'tasks') { $('#mxTasks').hidden = !$('#mxTasks').hidden; checkTasks(); syncTool(); }
    else if (t === 'help') helpDialog();
  });
  $('#mxCoord').addEventListener('change', e => { S.space = e.target.value; tcs.forEach(t => t.setSpace(S.space)); req(); });

  function onKey(e) {
    if (e.target.matches('input, select, textarea')) return;
    const k = e.key.toLowerCase();
    if (e.ctrlKey || e.metaKey) {
      if (k === 'z') { e.preventDefault(); undo(); } else if (k === 'y') { e.preventDefault(); redo(); } else if (k === 'v') { e.preventDefault(); cloneDialog(); } else if (k === 'd') { e.preventDefault(); select(null); } else if (k === 'n') { e.preventDefault(); cmd('new'); }
      return;
    }
    if (e.altKey && k === 'w') { e.preventDefault(); toggleMax(); return; }
    if (e.altKey && k === 'x') { if (S.sel) { S.sel.see = !S.sel.see; commit(); req(); } return; }
    const map = { q: 'select', w: 'move', e: 'rotate', r: 'scale' };
    if (map[k]) setMode(map[k]);
    else if (k === 'delete' || k === 'backspace') { if (S.sel) { removeObj(S.sel); commit(); } }
    else if (k === 'z') zoomExtAll();
    else if (k === 'g') { S.gridOn = !S.gridOn; req(); }
    else if (k === '7') { S.stats = !S.stats; req(); }
    else if (k === 's') $('[data-tb="snap"]').click();
    else if (k === 'a') $('[data-tb="asnap"]').click();
    else if (k === 'h') $('[data-tb="byname"]').click();
    else if (k === 'escape') { if (S.mode === 'create') { S.createType = null; setMode('select'); renderCP(); } $('#mxModal').hidden = true; $('#mxDD').hidden = true; }
    else if (e.key === 'F3') { e.preventDefault(); const v = VP[S.active]; v.shade = v.shade === 'wire' ? 'shaded' : 'wire'; setupView(S.active, true); }
    else if (e.key === 'F4') { e.preventDefault(); const v = VP[S.active]; v.shade = v.shade === 'edged' ? 'shaded' : 'edged'; setupView(S.active, true); }
  }
  window.addEventListener('keydown', onKey);

  /* ---------- mashqlar ---------- */
  const near = (a, b, t = 0.6) => Math.abs(a - b) <= t;
  const CHECK = [
    () => S.objs.some(o => o.type === 'Box' && o.name.trim().toLowerCase() === 'stol_qopqoq'),
    () => S.objs.some(o => o.type === 'Box' && o.name.trim().toLowerCase() === 'stol_qopqoq' && near(o.src.p.length, 130) && near(o.src.p.width, 240) && near(o.src.p.height, 8)),
    () => S.objs.some(o => o.type === 'Cylinder' && near(o.src.p.radius, 5) && near(o.src.p.height, 74)),
    () => S.objs.some(o => o.type === 'Cylinder' && S.objs.filter(x => x.src === o.src).length >= 4),
    () => S.objs.some(o => { const z = ((o.group.rotation.z / D2R) % 360 + 360) % 360; return (near(z, 45, 0.6) || near(z, 315, 0.6)) && near(o.group.rotation.x, 0, 0.01) && near(o.group.rotation.y, 0, 0.01); }),
    () => S.objs.some(o => o.type === 'Cylinder' && o.src.p.hsegs >= 10 && o.src.mods.some(m => m.type === 'Bend' && m.on && near(m.p.angle, 90, 0.6))),
  ];
  let ctT; function checkTasksSoon() { clearTimeout(ctT); ctT = setTimeout(checkTasks, 150); }
  let doneSet = new Set(); try { doneSet = new Set(JSON.parse(localStorage.getItem('mx_tasks') || '[]')); } catch (e) {}
  function checkTasks() {
    CHECK.forEach((f, i) => { try { if (f()) doneSet.add(i); } catch (e) {} });
    try { localStorage.setItem('mx_tasks', JSON.stringify([...doneSet])); } catch (e) {}
    const el = $('#mxTasks'); if (el.hidden) return;
    el.innerHTML = `<div class="mx-th"><b>🎯 ${esc(TX.tasks_title)} · ${doneSet.size}/${CHECK.length}</b><button data-x>×</button></div><p>${esc(TX.tasks_hint)}</p><ol>${TX.tasks.map((t, i) => `<li class="${doneSet.has(i) ? 'ok' : ''}"><span>${doneSet.has(i) ? '✓' : i + 1}</span>${esc(t)}</li>`).join('')}</ol>${doneSet.size === CHECK.length ? `<p class="mx-done">${esc(TX.done)}</p>` : ''}<button class="mx-reset" data-reset>↺</button>`;
  }
  $('#mxTasks').addEventListener('click', e => { if (e.target.closest('[data-x]')) { $('#mxTasks').hidden = true; syncTool(); } if (e.target.closest('[data-reset]')) { doneSet.clear(); checkTasks(); } });

  /* ---------- joylashuv va render ---------- */
  let rects = [];
  function layout() {
    const W = vpsEl.clientWidth, Hh = vpsEl.clientHeight, gap = 3; const w2 = (W - gap) / 2, h2 = (Hh - gap) / 2;
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

  // o'qlar uchligi (pastki chap burchak)
  const triScene = new THREE.Scene(), triCam = new THREE.OrthographicCamera(-1.6, 1.6, 1.6, -1.6, -10, 10);
  [[1, 0, 0, 0xe53935, 'X'], [0, 1, 0, 0x43a047, 'Y'], [0, 0, 1, 0x1e88e5, 'Z']].forEach(([x, y, z, c, t]) => {
    const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(x, y, z)]); triScene.add(new THREE.Line(g, new THREE.LineBasicMaterial({ color: c })));
    const cv = document.createElement('canvas'); cv.width = cv.height = 64; const cx = cv.getContext('2d'); cx.fillStyle = '#' + c.toString(16).padStart(6, '0'); cx.font = 'bold 44px sans-serif'; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText(t, 32, 34);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), depthTest: false })); sp.position.set(x * 1.35, y * 1.35, z * 1.35); sp.scale.setScalar(0.6); triScene.add(sp);
  });

  let need = true, raf = 0, alive = true;
  function req() { need = true; }
  function render() {
    const Hh = vpsEl.clientHeight; renderer.setScissorTest(true); renderer.clear();
    rects.forEach((r, i) => {
      if (!r[2]) return; const v = VP[i], d = VIEWS[v.view];
      renderer.setViewport(r[0], Hh - r[1] - r[3], r[2], r[3]); renderer.setScissor(r[0], Hh - r[1] - r[3], r[2], r[3]); renderer.clear();
      for (const k in grids) grids[k].visible = S.gridOn && k === d.plane;
      key.position.copy(v.cam.position); key.target.position.copy(v.controls.target);
      S.objs.forEach(o => {
        const sel = o === S.sel; o.group.visible = !o.hidden;
        o.mesh.visible = v.shade !== 'wire' && !o.asBox; o.wire.visible = v.shade !== 'shaded' || !!o.asBox;
        o.wire.material.color.set(sel && v.shade !== 'edged' ? '#ffffff' : v.shade === 'edged' ? new THREE.Color(o.color).multiplyScalar(0.45) : o.color);
        if (v.shade === 'edged' && sel) o.wire.material.color.set('#ffffff');
        o.brk.visible = sel && v.shade !== 'wire';
        o.mat.transparent = o.see; o.mat.opacity = o.see ? 0.45 : 1; o.mat.depthWrite = !o.see;
      });
      tcs.forEach((t, k) => { t.getHelper().visible = k === i && !!t.object; });
      renderer.render(scene, v.cam);
      // o'qlar uchligi
      const s = 64; renderer.setViewport(r[0] + 4, Hh - r[1] - r[3] + 4, s, s); renderer.setScissor(r[0] + 4, Hh - r[1] - r[3] + 4, s, s);
      triCam.position.copy(v.cam.position).sub(v.controls.target).normalize().multiplyScalar(5); triCam.up.copy(v.cam.up); triCam.lookAt(0, 0, 0); triCam.quaternion.copy(v.cam.quaternion);
      renderer.clearDepth(); renderer.render(triScene, triCam);
      const st = vpEls[i].querySelector('.vps');
      if (S.stats) { const tot = S.objs.filter(o => !o.hidden).reduce((a, o) => [a[0] + o.polys, a[1] + o.verts], [0, 0]); st.innerHTML = `Total<br>Polys: ${tot[0].toLocaleString()}<br>Verts: ${tot[1].toLocaleString()}${S.sel ? `<br><br>${esc(S.sel.name)}<br>Polys: ${S.sel.polys}<br>Verts: ${S.sel.verts}` : ''}`; st.style.display = ''; }
      else st.style.display = 'none';
    });
    renderer.setScissorTest(false);
  }
  function loop() { if (!alive) return; raf = requestAnimationFrame(loop); if (need) { need = false; render(); } }

  /* ---------- ishga tushirish ---------- */
  VP.forEach((_, i) => setupView(i)); if (isTouch || root.clientWidth < 760) S.maxed = true; markActive(); layout();
  let saved = null; try { saved = localStorage.getItem('mx_autosave'); } catch (e) {}
  if (saved) { try { restore(saved); last = serialize(); } catch (e) { saved = null; } }
  if (!saved) {
    const b = makeObj('Box', { ...S.createDefaults.Box, length: 50, width: 50, height: 30 }, [-55, 10, 0]);
    makeObj('Cylinder', { ...S.createDefaults.Cylinder, radius: 16, height: 45 }, [20, 40, 0]);
    makeObj('Teapot', { ...S.createDefaults.Teapot, tsize: 18 }, [40, -40, 0]);
    select(b); last = serialize();
  }
  zoomExtAll(); setMode('select'); S.tab = 'create'; renderCP(); renderList(); setPrompt(); updateTypeIn(); checkTasks();
  loop();

  return {
    dispose() {
      alive = false; cancelAnimationFrame(raf); window.removeEventListener('keydown', onKey); ro2.disconnect();
      tcs.forEach(t => t.dispose()); VP.forEach(v => v.controls && v.controls.dispose()); [...S.objs].forEach(removeObj); renderer.dispose();
    },
  };
}
