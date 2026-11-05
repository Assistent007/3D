/* 3ds Max simulyatori — geometriya yadrosi: primitivlar, splaynlar, modifikatorlar.
   Koordinatalar 3ds Max dagidek: Z — yuqoriga, birlik — sm. */
import * as THREE from 'three';
import { TeapotGeometry } from './lib/geometries/TeapotGeometry.js';

export const TAU = Math.PI * 2, D2R = Math.PI / 180;

/* ---------------- parametr ta'riflari ---------------- */
export const N = (k, label, def, min, max, o = {}) => ({ k, label, def, min, max, kind: 'num', int: !!o.int, unit: o.unit ?? (o.int ? '' : 'cm'), step: o.step });
export const B = (k, label, def) => ({ k, label, def, kind: 'bool' });
export const E = (k, label, def, opts) => ({ k, label, def, kind: 'enum', opts });
export const C = (k, label, def) => ({ k, label, def, kind: 'color' });
const I = (k, label, def, min, max) => N(k, label, def, min, max, { int: true });
const SHAPE_COMMON = [I('steps', 'Steps', 6, 0, 40), B('render', 'Enable In Viewport', false), N('thick', 'Thickness', 2, 0.1, 1000), I('rsides', 'Sides', 12, 3, 32)];

export const TYPES = {
  Box: { cat: 'geo', p: [N('length', 'Length', 40, 0.1, 1e4), N('width', 'Width', 40, 0.1, 1e4), N('height', 'Height', 40, 0.1, 1e4), I('lsegs', 'Length Segs', 1, 1, 100), I('wsegs', 'Width Segs', 1, 1, 100), I('hsegs', 'Height Segs', 1, 1, 100)] },
  Cone: { cat: 'geo', p: [N('radius1', 'Radius 1', 20, 0, 1e4), N('radius2', 'Radius 2', 0, 0, 1e4), N('height', 'Height', 45, 0.1, 1e4), I('hsegs', 'Height Segments', 5, 1, 100), I('csegs', 'Cap Segments', 1, 1, 50), I('sides', 'Sides', 24, 3, 128), B('smooth', 'Smooth', true)] },
  Sphere: { cat: 'geo', p: [N('radius', 'Radius', 22, 0.1, 1e4), I('segs', 'Segments', 32, 4, 128), B('smooth', 'Smooth', true), N('hemi', 'Hemisphere', 0, 0, 0.99, { unit: '', step: 0.05 }), B('base', 'Base To Pivot', false)] },
  GeoSphere: { cat: 'geo', p: [N('radius', 'Radius', 22, 0.1, 1e4), I('segs', 'Segments', 4, 1, 12), E('gtype', 'Geodesic Base Type', 'Icosa', ['Tetra', 'Octa', 'Icosa']), B('smooth', 'Smooth', true)] },
  Cylinder: { cat: 'geo', p: [N('radius', 'Radius', 18, 0.1, 1e4), N('height', 'Height', 50, 0.1, 1e4), I('hsegs', 'Height Segments', 5, 1, 100), I('csegs', 'Cap Segments', 1, 1, 50), I('sides', 'Sides', 18, 3, 128), B('smooth', 'Smooth', true)] },
  Tube: { cat: 'geo', p: [N('radius1', 'Radius 1', 20, 0.1, 1e4), N('radius2', 'Radius 2', 14, 0.1, 1e4), N('height', 'Height', 40, 0.1, 1e4), I('hsegs', 'Height Segments', 5, 1, 100), I('csegs', 'Cap Segments', 1, 1, 50), I('sides', 'Sides', 18, 3, 128), B('smooth', 'Smooth', true)] },
  Torus: { cat: 'geo', p: [N('radius1', 'Radius 1', 20, 0.1, 1e4), N('radius2', 'Radius 2', 6, 0.1, 1e4), N('rot', 'Rotation', 0, -1e4, 1e4, { unit: '°' }), N('twist', 'Twist', 0, -1e4, 1e4, { unit: '°' }), I('segs', 'Segments', 24, 3, 128), I('sides', 'Sides', 12, 3, 64), B('smooth', 'Smooth', true)] },
  Pyramid: { cat: 'geo', p: [N('width', 'Width', 40, 0.1, 1e4), N('depth', 'Depth', 40, 0.1, 1e4), N('height', 'Height', 40, 0.1, 1e4), I('hsegs', 'Height Segs', 1, 1, 100)] },
  Teapot: { cat: 'geo', p: [N('tsize', 'Radius', 20, 0.1, 1e4), I('segs', 'Segments', 4, 1, 12), B('smooth', 'Smooth', true), B('body', 'Body', true), B('lid', 'Lid', true)] },
  Plane: { cat: 'geo', p: [N('length', 'Length', 60, 0.1, 1e4), N('width', 'Width', 60, 0.1, 1e4), I('lsegs', 'Length Segs', 4, 1, 200), I('wsegs', 'Width Segs', 4, 1, 200)] },
  // --- Shapes (splaynlar)
  Line: { cat: 'shape', p: [E('interp', 'Interpolation', 'Corner', ['Corner', 'Smooth', 'B-Spline']), B('closed', 'Closed', false), ...SHAPE_COMMON], hidden: ['pts'] },
  Rectangle: { cat: 'shape', p: [N('length', 'Length', 40, 0.1, 1e4), N('width', 'Width', 60, 0.1, 1e4), N('corner', 'Corner Radius', 0, 0, 1e4), ...SHAPE_COMMON] },
  Circle: { cat: 'shape', p: [N('radius', 'Radius', 25, 0.1, 1e4), ...SHAPE_COMMON] },
  Ellipse: { cat: 'shape', p: [N('length', 'Length', 30, 0.1, 1e4), N('width', 'Width', 50, 0.1, 1e4), ...SHAPE_COMMON] },
  NGon: { cat: 'shape', p: [N('radius', 'Radius', 25, 0.1, 1e4), I('sides', 'Sides', 6, 3, 100), ...SHAPE_COMMON] },
  Star: { cat: 'shape', p: [N('radius1', 'Radius 1', 30, 0.1, 1e4), N('radius2', 'Radius 2', 14, 0.1, 1e4), I('points', 'Points', 5, 3, 100), N('distort', 'Distortion', 0, -180, 180, { unit: '°' }), ...SHAPE_COMMON] },
  Donut: { cat: 'shape', p: [N('radius1', 'Radius 1', 25, 0.1, 1e4), N('radius2', 'Radius 2', 18, 0.1, 1e4), ...SHAPE_COMMON] },
  Helix: { cat: 'shape', p: [N('radius1', 'Radius 1', 20, 0, 1e4), N('radius2', 'Radius 2', 20, 0, 1e4), N('height', 'Height', 60, -1e4, 1e4), N('turns', 'Turns', 5, 0.1, 100, { unit: '', step: 0.5 }), E('dir', 'Direction', 'CW', ['CW', 'CCW']), ...SHAPE_COMMON] },
  // --- Lights
  Omni: { cat: 'light', p: [N('mult', 'Multiplier', 1, 0, 50, { unit: '', step: 0.1 }), C('color', 'Color', '#ffffff'), B('shadow', 'Shadows: On', false)] },
  Spot: { cat: 'light', p: [N('mult', 'Multiplier', 1.5, 0, 50, { unit: '', step: 0.1 }), C('color', 'Color', '#ffffff'), B('shadow', 'Shadows: On', true), N('hot', 'Hotspot/Beam', 43, 1, 170, { unit: '°' }), N('fall', 'Falloff/Field', 60, 2, 175, { unit: '°' }), N('tx', 'Target X', 0, -1e5, 1e5), N('ty', 'Target Y', 0, -1e5, 1e5), N('tz', 'Target Z', 0, -1e5, 1e5)] },
  Sun: { cat: 'light', p: [N('mult', 'Multiplier', 1, 0, 50, { unit: '', step: 0.1 }), C('color', 'Color', '#fff4e0'), B('shadow', 'Shadows: On', true), N('tx', 'Target X', 0, -1e5, 1e5), N('ty', 'Target Y', 0, -1e5, 1e5), N('tz', 'Target Z', 0, -1e5, 1e5)] },
};
export const CATS = { geo: ['Box', 'Cone', 'Sphere', 'GeoSphere', 'Cylinder', 'Tube', 'Torus', 'Pyramid', 'Teapot', 'Plane'], shape: ['Line', 'Rectangle', 'Circle', 'Ellipse', 'NGon', 'Star', 'Donut', 'Helix'], light: ['Omni', 'Spot', 'Sun'] };
export const CAT_TITLE = { geo: 'Standard Primitives', shape: 'Splines', light: 'Standard' };

export const MODS = {
  Bend: { kind: 'deform', p: [N('angle', 'Angle', 0, -1e4, 1e4, { unit: '°' }), N('dir', 'Direction', 0, -1e4, 1e4, { unit: '°' }), E('axis', 'Bend Axis', 'Z', ['X', 'Y', 'Z'])] },
  Taper: { kind: 'deform', p: [N('amount', 'Amount', 0, -10, 10, { unit: '', step: 0.05 }), N('curve', 'Curve', 0, -10, 10, { unit: '', step: 0.05 }), E('axis', 'Primary', 'Z', ['X', 'Y', 'Z']), E('effect', 'Effect', 'XY', ['X', 'Y', 'XY'])] },
  Twist: { kind: 'deform', p: [N('angle', 'Angle', 0, -1e5, 1e5, { unit: '°' }), N('bias', 'Bias', 0, -100, 100, { unit: '' }), E('axis', 'Twist Axis', 'Z', ['X', 'Y', 'Z'])] },
  Spherify: { kind: 'deform', p: [N('percent', 'Percent', 100, 0, 100, { unit: '' })] },
  Noise: { kind: 'deform', p: [I('seed', 'Seed', 0, 0, 9999), N('scale', 'Scale', 100, 0.1, 1e4, { unit: '' }), N('sx', 'Strength X', 0, -1e4, 1e4), N('sy', 'Strength Y', 0, -1e4, 1e4), N('sz', 'Strength Z', 0, -1e4, 1e4)] },
  TurboSmooth: { kind: 'topo', p: [I('iter', 'Iterations', 1, 0, 4)] },
  'UVW Map': { kind: 'uv', p: [E('map', 'Mapping', 'Planar', ['Planar', 'Cylindrical', 'Spherical', 'Box']), N('ulen', 'Length', 0, 0, 1e5), N('uwid', 'Width', 0, 0, 1e5), N('uhei', 'Height', 0, 0, 1e5), N('utile', 'U Tile', 1, 0.01, 100, { unit: '', step: 0.5 }), N('vtile', 'V Tile', 1, 0.01, 100, { unit: '', step: 0.5 })] },
  Extrude: { kind: 'conv', p: [N('amount', 'Amount', 20, -1e5, 1e5), I('segs', 'Segments', 1, 1, 100), B('capS', 'Cap Start', true), B('capE', 'Cap End', true)] },
  Lathe: { kind: 'conv', p: [N('deg', 'Degrees', 360, 0, 360, { unit: '°' }), I('segs', 'Segments', 24, 3, 128), E('axis', 'Direction', 'Y', ['X', 'Y']), E('align', 'Align', 'Min', ['Min', 'Center', 'Max']), B('flip', 'Flip Normals', false)] },
};
export const defaults = defs => Object.fromEntries(defs.map(d => [d.k, d.def]));

/* ---------------- yordamchi ---------------- */
function G() { return { pos: [], faces: [] }; }
function grid(g, o, U, V, nu, nv) {
  const b = g.pos.length / 3;
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++)
    g.pos.push(o[0] + U[0] * i / nu + V[0] * j / nv, o[1] + U[1] * i / nu + V[1] * j / nv, o[2] + U[2] * i / nu + V[2] * j / nv);
  const w = nu + 1;
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const a = b + j * w + i; g.faces.push([a, a + 1, a + w + 1, a + w]); }
}
// aylanma sirt: profil [[r,z],...] tashqi tomondan yuradi (Z o'qi atrofida)
function revolve(g, prof, sides, t0 = 0) {
  const b = g.pos.length / 3, w = sides + 1;
  for (let i = 0; i < prof.length; i++) for (let j = 0; j <= sides; j++) { const t = t0 + TAU * j / sides; g.pos.push(prof[i][0] * Math.cos(t), prof[i][0] * Math.sin(t), prof[i][1]); }
  for (let i = 0; i < prof.length - 1; i++) for (let j = 0; j < sides; j++) { const a = b + i * w + j; g.faces.push([a, a + 1, a + w + 1, a + w]); }
}
const lerpPts = (a, b, n) => Array.from({ length: n + 1 }, (_, i) => [a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n]);
function fromThree(tg) {
  const g = G(), P = tg.getAttribute('position'), m = new Map(), map = new Int32Array(P.count);
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i), y = P.getY(i), z = P.getZ(i), k = Math.round(x * 1e3) + ',' + Math.round(y * 1e3) + ',' + Math.round(z * 1e3);
    if (!m.has(k)) { m.set(k, g.pos.length / 3); g.pos.push(x, y, z); } map[i] = m.get(k);
  }
  const ix = tg.index ? tg.index.array : Array.from({ length: P.count }, (_, i) => i);
  for (let i = 0; i < ix.length; i += 3) g.faces.push([map[ix[i]], map[ix[i + 1]], map[ix[i + 2]]]);
  tg.dispose(); return g;
}

/* ---------------- primitivlar ---------------- */
const BUILD = {
  Box(p) {
    const g = G(), W = p.width, L = p.length, H = p.height, nw = p.wsegs, nl = p.lsegs, nh = p.hsegs, x0 = -W / 2, y0 = -L / 2;
    grid(g, [x0, y0, H], [W, 0, 0], [0, L, 0], nw, nl); grid(g, [x0, y0, 0], [0, L, 0], [W, 0, 0], nl, nw);
    grid(g, [W / 2, y0, 0], [0, L, 0], [0, 0, H], nl, nh); grid(g, [x0, y0, 0], [0, 0, H], [0, L, 0], nh, nl);
    grid(g, [x0, L / 2, 0], [0, 0, H], [W, 0, 0], nh, nw); grid(g, [x0, y0, 0], [W, 0, 0], [0, 0, H], nw, nh);
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
    revolve(g, lerpPts([ri, 0], [ro, 0], p.csegs), p.sides); revolve(g, lerpPts([ro, 0], [ro, h], p.hsegs), p.sides);
    revolve(g, lerpPts([ro, h], [ri, h], p.csegs), p.sides); revolve(g, lerpPts([ri, h], [ri, 0], p.hsegs), p.sides);
    return g;
  },
  Pyramid(p) {
    const g = G(); revolve(g, [[0, 0], [1, 0]], 4, Math.PI / 4); revolve(g, lerpPts([1, 0], [0, p.height], p.hsegs), 4, Math.PI / 4);
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
    const Cc = { Tetra: THREE.TetrahedronGeometry, Octa: THREE.OctahedronGeometry, Icosa: THREE.IcosahedronGeometry }[p.gtype] || THREE.IcosahedronGeometry;
    return fromThree(new Cc(p.radius, p.segs - 1));
  },
  Torus(p) {
    const g = G(), R = p.radius1, r = p.radius2, nu = p.segs, nv = p.sides, w = nv + 1;
    for (let i = 0; i <= nu; i++) { const u = TAU * i / nu;
      for (let j = 0; j <= nv; j++) { const v = TAU * j / nv + p.rot * D2R + p.twist * D2R * i / nu; g.pos.push((R + r * Math.cos(v)) * Math.cos(u), (R + r * Math.cos(v)) * Math.sin(u), r * Math.sin(v)); } }
    for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) { const a = i * w + j; g.faces.push([a, a + w, a + w + 1, a + 1]); }
    return g;
  },
  Teapot(p) {
    const tg = new TeapotGeometry(p.tsize, p.segs, true, p.lid, p.body, true, true);
    tg.rotateX(Math.PI / 2); tg.computeBoundingBox(); tg.translate(0, 0, -tg.boundingBox.min.z);
    return fromThree(tg);
  },
};

/* ---------------- splaynlar ---------------- */
function arcPts(cx, cy, r, a0, a1, n) { const o = []; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; o.push([cx + r * Math.cos(a), cy + r * Math.sin(a), 0]); } return o; }
function catmull(P, closed, steps) {
  const n = P.length, out = [], seg = closed ? n : n - 1, s = steps + 1;
  const at = i => closed ? P[(i + n) % n] : P[Math.max(0, Math.min(n - 1, i))];
  for (let i = 0; i < seg; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    for (let k = 0; k < s; k++) { const t = k / s, t2 = t * t, t3 = t2 * t;
      out.push([0, 1, 2].map(c => 0.5 * ((2 * p1[c]) + (-p0[c] + p2[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t3))); }
  }
  if (!closed) out.push([...P[n - 1]]);
  return out;
}
function bspline(P, closed, steps) {
  const n = P.length; if (n < 3) return P.map(p => [...p]);
  const s = Math.max(2, steps + 1), out = [];
  const Q = closed ? P : [P[0], P[0], ...P, P[n - 1], P[n - 1]], m = Q.length, seg = closed ? n : m - 3;
  const at = i => Q[(i + m) % m];
  for (let i = 0; i < seg; i++) {
    const p0 = at(i), p1 = at(i + 1), p2 = at(i + 2), p3 = at(i + 3);
    for (let k = 0; k < s; k++) { const t = k / s, it = 1 - t, b0 = it * it * it / 6, b1 = (3 * t * t * t - 6 * t * t + 4) / 6, b2 = (-3 * t * t * t + 3 * t * t + 3 * t + 1) / 6, b3 = t * t * t / 6;
      out.push([0, 1, 2].map(c => b0 * p0[c] + b1 * p1[c] + b2 * p2[c] + b3 * p3[c])); }
  }
  if (!closed) out.push([...P[n - 1]]);
  return out;
}
const SHAPES = {
  Line(p) {
    const P = (p.pts || []).map(q => [q[0], q[1], 0]); if (P.length < 2) return { loops: [{ pts: P, closed: false }] };
    const closed = !!p.closed && P.length > 2;
    const pts = p.interp === 'Smooth' ? catmull(P, closed, p.steps) : p.interp === 'B-Spline' ? bspline(P, closed, p.steps) : P;
    return { loops: [{ pts, closed }], cvs: P };
  },
  Rectangle(p) {
    const w = p.width / 2, l = p.length / 2, r = Math.min(p.corner, w, l), n = p.steps + 1;
    if (r <= 0.001) return { loops: [{ pts: [[-w, -l, 0], [w, -l, 0], [w, l, 0], [-w, l, 0]], closed: true }] };
    return { loops: [{ pts: [...arcPts(w - r, -l + r, r, -Math.PI / 2, 0, n), ...arcPts(w - r, l - r, r, 0, Math.PI / 2, n), ...arcPts(-w + r, l - r, r, Math.PI / 2, Math.PI, n), ...arcPts(-w + r, -l + r, r, Math.PI, 1.5 * Math.PI, n)], closed: true }] };
  },
  Circle(p) { const n = 4 * (p.steps + 1); return { loops: [{ pts: arcPts(0, 0, p.radius, 0, TAU, n).slice(0, n), closed: true }] }; },
  Ellipse(p) { const n = 4 * (p.steps + 1); return { loops: [{ pts: arcPts(0, 0, 1, 0, TAU, n).slice(0, n).map(q => [q[0] * p.width / 2, q[1] * p.length / 2, 0]), closed: true }] }; },
  NGon(p) { return { loops: [{ pts: arcPts(0, 0, p.radius, Math.PI / 2, Math.PI / 2 + TAU, p.sides).slice(0, p.sides), closed: true }] }; },
  Star(p) {
    const pts = [], n = p.points;
    for (let i = 0; i < 2 * n; i++) { const r = i % 2 ? p.radius2 : p.radius1, a = Math.PI / 2 + Math.PI * i / n + (i % 2 ? p.distort * D2R : 0); pts.push([r * Math.cos(a), r * Math.sin(a), 0]); }
    return { loops: [{ pts, closed: true }] };
  },
  Donut(p) { const n = 4 * (p.steps + 1); return { loops: [{ pts: arcPts(0, 0, p.radius1, 0, TAU, n).slice(0, n), closed: true }, { pts: arcPts(0, 0, p.radius2, 0, TAU, n).slice(0, n), closed: true }] }; },
  Helix(p) {
    const n = Math.max(8, Math.round(p.turns * 8 * (p.steps / 6 + 1))), pts = [], s = p.dir === 'CCW' ? -1 : 1;
    for (let i = 0; i <= n; i++) { const t = i / n, a = s * TAU * p.turns * t, r = p.radius1 + (p.radius2 - p.radius1) * t; pts.push([r * Math.cos(a), r * Math.sin(a), p.height * t]); }
    return { loops: [{ pts, closed: false }] };
  },
};

export function base(type, p) { return TYPES[type].cat === 'shape' ? SHAPES[type](p) : BUILD[type](p); }

/* ---------------- modifikatorlar (deformatorlar) ---------------- */
const PERM = { X: [1, 2, 0], Y: [2, 0, 1], Z: [0, 1, 2] };
function axisLoop(pos, axis, fn) {
  const [ix, iy, iz] = PERM[axis] || PERM.Z, v = [0, 0, 0];
  for (let i = 0; i < pos.length; i += 3) { v[0] = pos[i + ix]; v[1] = pos[i + iy]; v[2] = pos[i + iz]; fn(v); pos[i + ix] = v[0]; pos[i + iy] = v[1]; pos[i + iz] = v[2]; }
}
function range(pos, axis) { const iz = (PERM[axis] || PERM.Z)[2]; let lo = Infinity, hi = -Infinity; for (let i = iz; i < pos.length; i += 3) { lo = Math.min(lo, pos[i]); hi = Math.max(hi, pos[i]); } return [lo, hi]; }
function hash(x, y, z, s) { const h = Math.sin(x * 127.1 + y * 311.7 + z * 74.7 + s * 13.13) * 43758.5453; return h - Math.floor(h); }
function vnoise(x, y, z, s) {
  const X = Math.floor(x), Y = Math.floor(y), Z = Math.floor(z), fx = x - X, fy = y - Y, fz = z - Z;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), w = fz * fz * (3 - 2 * fz), L = (a, b, t) => a + (b - a) * t, H = (i, j, k) => hash(X + i, Y + j, Z + k, s);
  return L(L(L(H(0, 0, 0), H(1, 0, 0), u), L(H(0, 1, 0), H(1, 1, 0), u), v), L(L(H(0, 0, 1), H(1, 0, 1), u), L(H(0, 1, 1), H(1, 1, 1), u), v), w) - 0.5;
}
const DEFORM = {
  Bend(pos, p) {
    const th = p.angle * D2R; if (Math.abs(th) < 1e-6) return;
    const [lo, hi] = range(pos, p.axis), Lb = Math.max(1e-6, hi - lo), R = Lb / th, cd = Math.cos(-p.dir * D2R), sd = Math.sin(-p.dir * D2R);
    axisLoop(pos, p.axis, v => { const x = v[0] * cd - v[1] * sd, y = v[0] * sd + v[1] * cd, f = th * v[2] / Lb, nx = R - (R - x) * Math.cos(f), nz = (R - x) * Math.sin(f); v[0] = nx * cd + y * sd; v[1] = -nx * sd + y * cd; v[2] = nz; });
  },
  Taper(pos, p) {
    if (!p.amount && !p.curve) return; const [lo, hi] = range(pos, p.axis), L = Math.max(1e-6, hi - lo), ex = p.effect !== 'Y', ey = p.effect !== 'X';
    axisLoop(pos, p.axis, v => { const t = (v[2] - lo) / L, s = 1 + p.amount * t + p.curve * 4 * t * (1 - t); if (ex) v[0] *= s; if (ey) v[1] *= s; });
  },
  Twist(pos, p) {
    if (!p.angle) return; const [lo, hi] = range(pos, p.axis), L = Math.max(1e-6, hi - lo), e = p.bias >= 0 ? 1 + p.bias / 25 : 1 / (1 - p.bias / 25);
    axisLoop(pos, p.axis, v => { const t = Math.pow(Math.max(0, (v[2] - lo) / L), e), a = p.angle * D2R * t, c = Math.cos(a), s = Math.sin(a), x = v[0]; v[0] = x * c - v[1] * s; v[1] = x * s + v[1] * c; });
  },
  Spherify(pos, p) {
    const c = [0, 0, 0], bb = [[Infinity, -Infinity], [Infinity, -Infinity], [Infinity, -Infinity]]; let ravg = 0; const n = pos.length / 3;
    for (let i = 0; i < pos.length; i += 3) for (let k = 0; k < 3; k++) { bb[k][0] = Math.min(bb[k][0], pos[i + k]); bb[k][1] = Math.max(bb[k][1], pos[i + k]); }
    for (let k = 0; k < 3; k++) c[k] = (bb[k][0] + bb[k][1]) / 2;
    for (let i = 0; i < pos.length; i += 3) ravg += Math.hypot(pos[i] - c[0], pos[i + 1] - c[1], pos[i + 2] - c[2]);
    ravg /= Math.max(1, n); const t = p.percent / 100;
    for (let i = 0; i < pos.length; i += 3) { const dx = pos[i] - c[0], dy = pos[i + 1] - c[1], dz = pos[i + 2] - c[2], d = Math.hypot(dx, dy, dz) || 1, s = 1 - t + t * ravg / d; pos[i] = c[0] + dx * s; pos[i + 1] = c[1] + dy * s; pos[i + 2] = c[2] + dz * s; }
  },
  Noise(pos, p) {
    if (!p.sx && !p.sy && !p.sz) return; const k = 1 / p.scale;
    for (let i = 0; i < pos.length; i += 3) { const x = pos[i] * k, y = pos[i + 1] * k, z = pos[i + 2] * k; pos[i] += p.sx * vnoise(x, y, z, p.seed + 1); pos[i + 1] += p.sy * vnoise(x + 31.4, y, z, p.seed + 2); pos[i + 2] += p.sz * vnoise(x, y + 17.7, z, p.seed + 3); }
  },
};

/* ---------------- uchlarni birlashtirish va Catmull–Clark (TurboSmooth) ---------------- */
export function weld(g) {
  const m = new Map(), map = new Int32Array(g.pos.length / 3), P = [];
  for (let i = 0; i < map.length; i++) {
    const k = Math.round(g.pos[3 * i] * 1e3) + ',' + Math.round(g.pos[3 * i + 1] * 1e3) + ',' + Math.round(g.pos[3 * i + 2] * 1e3);
    if (!m.has(k)) { m.set(k, P.length / 3); P.push(g.pos[3 * i], g.pos[3 * i + 1], g.pos[3 * i + 2]); } map[i] = m.get(k);
  }
  const F = [];
  for (const f of g.faces) { const q = []; for (const v of f) { const c = map[v]; if (q[q.length - 1] !== c) q.push(c); } while (q.length > 1 && q[0] === q[q.length - 1]) q.pop(); if (new Set(q).size >= 3) F.push(q); }
  return { pos: P, faces: F };
}
function ccOnce(g) {
  const P = g.pos, F = g.faces, nv = P.length / 3, out = [...P];
  const E = new Map(), ek = (a, b) => a < b ? a * 8388608 + b : b * 8388608 + a;
  const fpi = F.map(f => { let x = 0, y = 0, z = 0; for (const v of f) { x += P[3 * v]; y += P[3 * v + 1]; z += P[3 * v + 2]; } out.push(x / f.length, y / f.length, z / f.length); return out.length / 3 - 1; });
  F.forEach((f, fi) => f.forEach((a, i) => { const b = f[(i + 1) % f.length], k = ek(a, b); let e = E.get(k); if (!e) { e = { a, b, f: [] }; E.set(k, e); } e.f.push(fi); }));
  const vF = Array.from({ length: nv }, () => []), vE = Array.from({ length: nv }, () => []);
  F.forEach((f, fi) => f.forEach(v => vF[v].push(fi)));
  for (const e of E.values()) {
    const { a, b } = e; let x = P[3 * a] + P[3 * b], y = P[3 * a + 1] + P[3 * b + 1], z = P[3 * a + 2] + P[3 * b + 2];
    if (e.f.length === 2) { const f1 = fpi[e.f[0]], f2 = fpi[e.f[1]]; x = (x + out[3 * f1] + out[3 * f2]) / 4; y = (y + out[3 * f1 + 1] + out[3 * f2 + 1]) / 4; z = (z + out[3 * f1 + 2] + out[3 * f2 + 2]) / 4; }
    else { x /= 2; y /= 2; z /= 2; }
    out.push(x, y, z); e.i = out.length / 3 - 1; vE[a].push(e); vE[b].push(e);
  }
  for (let v = 0; v < nv; v++) {
    const px = P[3 * v], py = P[3 * v + 1], pz = P[3 * v + 2], bnd = vE[v].filter(e => e.f.length < 2);
    if (bnd.length >= 2) {
      let x = 6 * px, y = 6 * py, z = 6 * pz; for (const e of bnd.slice(0, 2)) { const o = e.a === v ? e.b : e.a; x += P[3 * o]; y += P[3 * o + 1]; z += P[3 * o + 2]; }
      out[3 * v] = x / 8; out[3 * v + 1] = y / 8; out[3 * v + 2] = z / 8; continue;
    }
    const n = vF[v].length; if (!n) continue;
    let fx = 0, fy = 0, fz = 0, rx = 0, ry = 0, rz = 0;
    for (const fi of vF[v]) { const f = fpi[fi]; fx += out[3 * f]; fy += out[3 * f + 1]; fz += out[3 * f + 2]; }
    for (const e of vE[v]) { rx += (P[3 * e.a] + P[3 * e.b]) / 2; ry += (P[3 * e.a + 1] + P[3 * e.b + 1]) / 2; rz += (P[3 * e.a + 2] + P[3 * e.b + 2]) / 2; }
    const m = vE[v].length || 1;
    out[3 * v] = (fx / n + 2 * rx / m + (n - 3) * px) / n; out[3 * v + 1] = (fy / n + 2 * ry / m + (n - 3) * py) / n; out[3 * v + 2] = (fz / n + 2 * rz / m + (n - 3) * pz) / n;
  }
  const NF = [];
  F.forEach((f, fi) => { const n = f.length; for (let i = 0; i < n; i++) { const a = f[i], nx = f[(i + 1) % n], pv = f[(i - 1 + n) % n]; NF.push([a, E.get(ek(a, nx)).i, fpi[fi], E.get(ek(pv, a)).i]); } });
  return { pos: out, faces: NF };
}

/* ---------------- splayn → sirt (Extrude, Lathe, renderlanadigan splayn) ---------------- */
const area2 = pts => { let s = 0; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; };
function inside(pt, poly) { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a[1] > pt[1]) !== (b[1] > pt[1]) && pt[0] < (b[0] - a[0]) * (pt[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; }
function extrude(st, p) {
  const g = G(), H = p.amount, ns = p.segs, loops = st.loops.filter(l => l.pts.length >= 2);
  const closed = loops.filter(l => l.closed && l.pts.length >= 3);
  // ichma-ich joylashuv: juft chuqurlik — tashqi, toq — teshik
  const depth = closed.map(l => closed.filter(o => o !== l && inside(l.pts[0], o.pts)).length);
  const norm = closed.map((l, i) => { const ccw = area2(l.pts) > 0, want = depth[i] % 2 === 0; return want === ccw ? l.pts : [...l.pts].reverse(); });
  const wall = (pts, isClosed) => {
    const n = pts.length, b = g.pos.length / 3;
    for (let k = 0; k <= ns; k++) for (const q of pts) g.pos.push(q[0], q[1], (q[2] || 0) + H * k / ns);
    const seg = isClosed ? n : n - 1;
    for (let k = 0; k < ns; k++) for (let i = 0; i < seg; i++) { const a = b + k * n + i, a2 = b + k * n + (i + 1) % n; g.faces.push([a, a2, a2 + n, a + n]); }
  };
  norm.forEach(pts => wall(pts, true));
  loops.filter(l => !(l.closed && l.pts.length >= 3)).forEach(l => wall(l.pts, false));
  if (p.capS || p.capE) {
    norm.forEach((outer, i) => {
      if (depth[i] % 2) return;
      const holes = norm.filter((h, j) => depth[j] === depth[i] + 1 && inside(closed[j].pts[0], closed[i].pts));
      const all = [outer, ...holes].flat(), V2 = all.map(q => new THREE.Vector2(q[0], q[1]));
      const tris = THREE.ShapeUtils.triangulateShape(V2.slice(0, outer.length), holes.map((h, k) => V2.slice(outer.length + holes.slice(0, k).reduce((s, x) => s + x.length, 0), outer.length + holes.slice(0, k + 1).reduce((s, x) => s + x.length, 0))));
      for (const [z, top] of [[0, false], [H, true]]) {
        if ((top && !p.capE) || (!top && !p.capS)) continue;
        const b = g.pos.length / 3; all.forEach(q => g.pos.push(q[0], q[1], (q[2] || 0) + z));
        for (const t of tris) { const a = all[t[0]], c = all[t[1]], d = all[t[2]], up = (c[0] - a[0]) * (d[1] - a[1]) - (c[1] - a[1]) * (d[0] - a[0]) > 0;
          g.faces.push(up === (top === H >= 0) ? [b + t[0], b + t[1], b + t[2]] : [b + t[0], b + t[2], b + t[1]]); }
      }
    });
  }
  return g;
}
function lathe(st, p) {
  const g = G(), pts = st.loops.flatMap(l => l.pts); if (!pts.length) return g;
  const ax = p.axis === 'X' ? 1 : 0;  // Y o'qi: radius = x; X o'qi: radius = y
  const vals = pts.map(q => q[ax]), lo = Math.min(...vals), hi = Math.max(...vals), c = p.align === 'Min' ? lo : p.align === 'Max' ? hi : (lo + hi) / 2;
  const n = p.segs, full = p.deg >= 359.99;
  for (const l of st.loops) {
    const P = l.closed ? [...l.pts, l.pts[0]] : l.pts, b = g.pos.length / 3, w = n + 1;
    for (const q of P) for (let j = 0; j <= n; j++) {
      const t = p.deg * D2R * j / n, r = q[ax] - c, along = q[1 - ax];
      if (p.axis === 'X') g.pos.push(along, c + r * Math.cos(t), r * Math.sin(t)); else g.pos.push(c + r * Math.cos(t), along, r * Math.sin(t));
    }
    for (let i = 0; i < P.length - 1; i++) for (let j = 0; j < n; j++) { const a = b + i * w + j; g.faces.push(p.flip ? [a, a + w, a + w + 1, a + 1] : [a, a + 1, a + w + 1, a + w]); }
  }
  if (full && signedVolume(g) < 0) g.faces.forEach(f => f.reverse());
  return g;
}
function signedVolume(g) {
  let v = 0; const P = g.pos;
  for (const f of g.faces) for (let i = 1; i < f.length - 1; i++) { const a = f[0] * 3, b = f[i] * 3, c = f[i + 1] * 3;
    v += P[a] * (P[b + 1] * P[c + 2] - P[b + 2] * P[c + 1]) - P[a + 1] * (P[b] * P[c + 2] - P[b + 2] * P[c]) + P[a + 2] * (P[b] * P[c + 1] - P[b + 1] * P[c]); }
  return v / 6;
}
function sweep(st, p) {
  const g = G(), R = p.thick / 2, ns = p.rsides;
  for (const l of st.loops) {
    const P = l.closed ? [...l.pts, l.pts[0]] : l.pts; if (P.length < 2) continue;
    const T = P.map((q, i) => { const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)]; return new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]).normalize(); });
    let nrm = new THREE.Vector3(0, 0, 1); if (Math.abs(T[0].z) > 0.9) nrm.set(1, 0, 0); nrm.sub(T[0].clone().multiplyScalar(nrm.dot(T[0]))).normalize();
    const b0 = g.pos.length / 3, w = ns + 1;
    P.forEach((q, i) => {
      if (i) { const ax = new THREE.Vector3().crossVectors(T[i - 1], T[i]); if (ax.lengthSq() > 1e-12) nrm.applyAxisAngle(ax.normalize(), Math.acos(Math.max(-1, Math.min(1, T[i - 1].dot(T[i]))))); }
      const bn = new THREE.Vector3().crossVectors(T[i], nrm);
      for (let j = 0; j <= ns; j++) { const a = TAU * j / ns; g.pos.push(q[0] + R * (Math.cos(a) * nrm.x + Math.sin(a) * bn.x), q[1] + R * (Math.cos(a) * nrm.y + Math.sin(a) * bn.y), q[2] + R * (Math.cos(a) * nrm.z + Math.sin(a) * bn.z)); }
    });
    for (let i = 0; i < P.length - 1; i++) for (let j = 0; j < ns; j++) { const a = b0 + i * w + j; g.faces.push([a, a + w, a + w + 1, a + 1]); }
  }
  return g;
}

/* ---------------- UVW Map ---------------- */
function bbox(pos) { const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity]; for (let i = 0; i < pos.length; i += 3) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], pos[i + k]); hi[k] = Math.max(hi[k], pos[i + k]); } return [lo, hi]; }
export function uvw(g, p) {
  const [lo, hi] = bbox(g.pos), c = [0, 1, 2].map(k => (lo[k] + hi[k]) / 2), W = p.uwid || (hi[0] - lo[0]) || 1, L = p.ulen || (hi[1] - lo[1]) || 1, H = p.uhei || (hi[2] - lo[2]) || 1;
  const n = g.pos.length / 3, uv = new Float32Array(n * 2), P = g.pos;
  let nrm = null;
  if (p.map === 'Box') { nrm = new Float32Array(n * 3); for (const f of g.faces) { const a = f[0] * 3, b = f[1] * 3, cc = f[2] * 3; const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2], vx = P[cc] - P[a], vy = P[cc + 1] - P[a + 1], vz = P[cc + 2] - P[a + 2]; const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; for (const v of f) { nrm[3 * v] += nx; nrm[3 * v + 1] += ny; nrm[3 * v + 2] += nz; } } }
  for (let i = 0; i < n; i++) {
    const x = P[3 * i] - c[0], y = P[3 * i + 1] - c[1], z = P[3 * i + 2] - c[2]; let u, v;
    if (p.map === 'Planar') { u = x / W + 0.5; v = y / L + 0.5; }
    else if (p.map === 'Cylindrical') { u = Math.atan2(y, x) / TAU + 0.5; v = z / H + 0.5; }
    else if (p.map === 'Spherical') { u = Math.atan2(y, x) / TAU + 0.5; v = 1 - Math.acos(Math.max(-1, Math.min(1, z / (Math.hypot(x, y, z) || 1)))) / Math.PI; }
    else { const ax = Math.abs(nrm[3 * i]), ay = Math.abs(nrm[3 * i + 1]), az = Math.abs(nrm[3 * i + 2]); if (az >= ax && az >= ay) { u = x / W + 0.5; v = y / L + 0.5; } else if (ax >= ay) { u = y / L + 0.5; v = z / H + 0.5; } else { u = x / W + 0.5; v = z / H + 0.5; } }
    uv[2 * i] = u * p.utile; uv[2 * i + 1] = v * p.vtile;
  }
  return uv;
}

/* ---------------- baholash: asos + modifikatorlar steki ---------------- */
export function evaluate(type, p, mods) {
  let st = base(type, p), smoothForce = false;
  for (const m of mods) {
    if (!m.on) continue; const M = MODS[m.type];
    if (st.loops) {
      if (M.kind === 'conv') { st = m.type === 'Extrude' ? extrude(st, m.p) : lathe(st, m.p); if (m.type === 'Lathe') smoothForce = true; }
      else if (M.kind === 'deform') { const flat = st.loops.flatMap(l => l.pts.flat()); const arr = Float32Array.from(flat); DEFORM[m.type](arr, m.p); let k = 0; st.loops.forEach(l => l.pts = l.pts.map(() => [arr[k++], arr[k++], arr[k++]])); }
    } else {
      if (M.kind === 'deform') { const arr = Float32Array.from(st.pos); DEFORM[m.type](arr, m.p); st.pos = Array.from(arr); }
      else if (M.kind === 'topo') { let g = weld(st), it = m.p.iter; while (it-- > 0 && g.faces.length < 60000) g = ccOnce(g); st = g; smoothForce = true; }
      else if (M.kind === 'uv') st.uv = uvw(st, m.p);
    }
  }
  if (st.loops && p.render) { const tube = sweep(st, p); tube.loops = st.loops; st = tube; smoothForce = true; }
  st.smooth = smoothForce;
  return st;
}

/* ---------------- sim to'r (poligon qirralari) va statistika ---------------- */
export function wireOf(st) {
  if (!st.faces || !st.faces.length) {
    const out = []; let nv = 0;
    for (const l of st.loops || []) { const P = l.pts; nv += P.length; for (let i = 0; i < P.length - (l.closed ? 0 : 1); i++) { const a = P[i], b = P[(i + 1) % P.length]; out.push(...a, ...b); } }
    return { lines: Float32Array.from(out), polys: 0, verts: nv };
  }
  const w = weld(st), E = new Set(), out = [];
  for (const f of w.faces) for (let i = 0; i < f.length; i++) { const a = f[i], b = f[(i + 1) % f.length], k = a < b ? a * 8388608 + b : b * 8388608 + a; if (!E.has(k)) { E.add(k); out.push(w.pos[3 * a], w.pos[3 * a + 1], w.pos[3 * a + 2], w.pos[3 * b], w.pos[3 * b + 1], w.pos[3 * b + 2]); } }
  if (st.loops) for (const l of st.loops) { const P = l.pts; for (let i = 0; i < P.length - (l.closed ? 0 : 1); i++) out.push(...P[i], ...P[(i + 1) % P.length]); }
  return { lines: Float32Array.from(out), polys: w.faces.length, verts: w.pos.length / 3 };
}
export function triangulate(faces) { const idx = []; for (const f of faces) for (let i = 1; i < f.length - 1; i++) idx.push(f[0], f[i], f[i + 1]); return idx; }

/* ---------------- protsedural teksturalar ---------------- */
const TEX = {};
export function texture(kind) {
  if (TEX[kind]) return TEX[kind];
  const cv = document.createElement('canvas'); cv.width = cv.height = 512; const x = cv.getContext('2d');
  if (kind === 'checker') { for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { x.fillStyle = (i + j) % 2 ? '#1d1d1d' : '#f2f2f2'; x.fillRect(i * 64, j * 64, 64, 64); } x.fillStyle = '#e53935'; x.font = 'bold 30px sans-serif'; x.fillText('F', 18, 46); }
  else if (kind === 'wood') { const gr = x.createLinearGradient(0, 0, 512, 0); gr.addColorStop(0, '#9b6a3c'); gr.addColorStop(1, '#a8764a'); x.fillStyle = gr; x.fillRect(0, 0, 512, 512); for (let i = 0; i < 70; i++) { x.strokeStyle = `rgba(70,40,20,${0.08 + Math.random() * 0.18})`; x.lineWidth = 1 + Math.random() * 3; x.beginPath(); const y0 = Math.random() * 512; x.moveTo(0, y0); for (let k = 0; k <= 512; k += 32) x.lineTo(k, y0 + Math.sin(k / 60 + i) * 6); x.stroke(); } }
  else if (kind === 'brick') { x.fillStyle = '#cfc6b8'; x.fillRect(0, 0, 512, 512); for (let r = 0; r < 8; r++) for (let c = -1; c < 5; c++) { const ox = r % 2 ? 64 : 0; x.fillStyle = `hsl(${10 + Math.random() * 8},${45 + Math.random() * 15}%,${36 + Math.random() * 10}%)`; x.fillRect(c * 128 + ox + 3, r * 64 + 3, 122, 58); } }
  else if (kind === 'tiles') { x.fillStyle = '#7d8590'; x.fillRect(0, 0, 512, 512); for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { x.fillStyle = `hsl(205,${18 + Math.random() * 10}%,${78 + Math.random() * 8}%)`; x.fillRect(c * 128 + 4, r * 128 + 4, 120, 120); } }
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; TEX[kind] = t; return t;
}
