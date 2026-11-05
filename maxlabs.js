/* Har bir amaliy ish uchun: namuna sahna (Namuna) va mashqlarni avtomatik tekshirish.
   Mashq matnlari window.DATA.max.labs[NN].tasks da (o'zbekcha), tartibi shu fayldagi CHECK bilan bir xil. */

// namuna sahnalar: api = { add(type, params, pos, extra), line(pts, opts), mod(o, type, params), inst(o, pos, extra), mat(o, m), arr(o, n, step) }
export const PRESETS = {
  '01': a => {
    a.add('Box', { length: 40, width: 40, height: 40 }, [-60, 20, 0], { name: 'Box001' });
    a.add('Cylinder', { radius: 18, height: 50 }, [0, 60, 0], { name: 'Cylinder001' });
    a.add('Sphere', { radius: 22 }, [60, 10, 22], { name: 'Sphere001' });
    a.add('Cone', { radius1: 20, radius2: 0, height: 45 }, [55, -60, 0], { name: 'Cone001' });
    a.add('Torus', { radius1: 18, radius2: 6 }, [-55, -55, 6], { name: 'Torus001' });
    a.add('Teapot', { tsize: 16 }, [0, -10, 0], { name: 'Teapot001' });
  },
  '02': a => {
    const top = a.add('Box', { length: 130, width: 240, height: 8 }, [0, 0, 74], { name: 'Stol_Qopqoq', color: '#a0703f' });
    const leg = a.add('Cylinder', { radius: 5, height: 74, sides: 24 }, [-105, -50, 0], { name: 'Stol_Oyoq01', color: '#6e4524' });
    [[105, -50], [105, 50], [-105, 50]].forEach((p, i) => a.inst(leg, [p[0], p[1], 0], { name: 'Stol_Oyoq0' + (i + 2) }));
    for (const [y, r] of [[105, 0], [-105, 180]]) {
      const s = a.add('Box', { length: 60, width: 60, height: 6 }, [0, y, 45], { name: 'Stul_Orindiq', color: '#7a4a2a' }); s.group.rotation.z = r * Math.PI / 180;
      const b = a.add('Box', { length: 5, width: 60, height: 66 }, [0, y + (r ? -27.5 : 27.5), 51], { name: 'Stul_Suyanchiq', color: '#7a4a2a' });
      const l = a.add('Cylinder', { radius: 3.5, height: 45, sides: 16 }, [-25, y - 25, 0], { name: 'Stul_Oyoq', color: '#5c3a1f' });
      [[25, -25], [25, 25], [-25, 25]].forEach(p => a.inst(l, [p[0], y + p[1], 0])); void b;
    }
    a.add('Torus', { radius1: 14, radius2: 1.6, segs: 36, sides: 10 }, [-38, 0, 83.6], { name: 'Bezak_Torus', color: '#c9a227' });
    [[-40, -10, '#e74c3c'], [-28, 5, '#f1c40f'], [-45, 8, '#27ae60']].forEach(([x, y, c], i) => a.add('Sphere', { radius: 5.5, segs: 24 }, [x, y, 87.5], { name: 'Meva_' + (i + 1), color: c }));
    a.add('Teapot', { tsize: 9 }, [60, 10, 82], { name: 'Choynak', color: '#2f6fd6' }); void top;
  },
  '03': a => {
    a.add('Cylinder', { radius: 18, height: 430, sides: 24, hsegs: 1 }, [0, 0, 0], { name: 'Ustun', color: '#8d99a6' });
    const st = a.add('Box', { length: 42, width: 130, height: 10 }, [83, 0, 0], { name: 'Pogona_01', color: '#c9b79c' });
    a.arr(st, 20, { move: [0, 0, 20], rot: [0, 0, 18], world: true, inst: true, name: 'Pogona_' });
    const d = a.add('Box', { length: 5, width: 90, height: 210 }, [-200, -150, 0], { name: 'Eshik', color: '#8a5a2b' });
    d.piv.set(45, 0, 0); d.group.position.x -= 45; a.rebuild(d); d.group.rotation.z = -50 * Math.PI / 180;
  },
  '04': a => {
    a.add('Box', { width: 300, length: 200, height: 180 }, [0, 0, 0], { name: 'Uy_devor', color: '#efe6d2' });
    const t = a.add('Box', { width: 324, length: 224, height: 110 }, [0, 0, 180], { name: 'Uy_tom', color: '#b5443b' });
    a.mod(t, 'Taper', { amount: -1, effect: 'Y' });
    for (const x of [-100, 100]) a.add('Box', { width: 44, length: 2, height: 26 }, [x, -101, 64], { name: 'Deraza', color: '#3d8fd1' });
    a.add('Box', { width: 52, length: 2, height: 116 }, [0, -101, 0], { name: 'Eshik', color: '#8a5a2b' });
    a.add('Box', { width: 40, length: 40, height: 120 }, [80, 40, 200], { name: 'Mori', color: '#9c8f86' });
    a.add('Box', { width: 40, length: 40, height: 40, lsegs: 3, wsegs: 3, hsegs: 3 }, [260, 0, 0], { name: 'Box_3x3x3', color: '#4f8ef7' });
  },
  '05': a => {
    const b1 = a.add('Box', { width: 40, length: 40, height: 40 }, [-70, 0, 0], { name: 'Box_tayanchsiz', color: '#4f8ef7' }); a.mod(b1, 'TurboSmooth', { iter: 2 });
    const b2 = a.add('Box', { width: 40, length: 40, height: 40, lsegs: 3, wsegs: 3, hsegs: 3 }, [0, 0, 0], { name: 'Box_3seg', color: '#27ae60' }); a.mod(b2, 'TurboSmooth', { iter: 2 });
    a.add('Tube', { radius1: 16, radius2: 14, height: 34, sides: 16, hsegs: 4 }, [80, 0, 0], { name: 'Krujka', color: '#e8e2d6' });
    a.add('Cylinder', { radius: 14, height: 2, sides: 16 }, [80, 0, 0], { name: 'Krujka_tag', color: '#e8e2d6' });
    const h = a.add('Torus', { radius1: 9, radius2: 2, segs: 16, sides: 8 }, [97, 0, 18], { name: 'Tutqich', color: '#e8e2d6' }); h.group.rotation.x = Math.PI / 2;
  },
  '06': a => {
    a.add('Cylinder', { radius: 45, height: 6, sides: 48 }, [0, 0, 0], { name: 'Aylanma_stol', color: '#5d6570' });
    a.add('Teapot', { tsize: 22, segs: 8 }, [0, 0, 6], { name: 'Model_high', color: '#d9a066' });
    a.add('Teapot', { tsize: 22, segs: 1 }, [160, 0, 0], { name: 'Model_low', color: '#7aa6d9' });
    const cam = a.add('Box', { width: 6, length: 10, height: 6 }, [130, 0, 30], { name: 'Kamera_1', color: '#ffd84d' });
    a.arr(cam, 24, { rot: [0, 0, 15], world: true, inst: true, name: 'Kamera_' });
  },
  '07': a => {
    a.add('Rectangle', { length: 60, width: 90, corner: 12 }, [-120, 0, 0], { name: 'Rectangle_Fillet' });
    a.line([[0, -22], [24, 4], [13, 20], [0, 11], [-13, 20], [-24, 4]], { closed: true, interp: 'Smooth', name: 'Yurak', pos: [0, 0, 0], color: '#e53935' });
    a.add('Circle', { radius: 25, steps: 0 }, [90, 0, 0], { name: 'Circle_Steps0' });
    a.add('Circle', { radius: 25, steps: 12 }, [90, 70, 0], { name: 'Circle_Steps12' });
    const s = a.add('Star', { radius1: 30, radius2: 14, points: 5 }, [0, 80, 0], { name: 'Yulduz', color: '#f2b632' }); a.mod(s, 'Extrude', { amount: 10 });
  },
  '08': a => {
    const v = a.line([[0, 0], [12, 0], [15, 8], [19, 22], [14, 36], [8, 44], [9, 50], [12, 54]], { view: 'Front', interp: 'Smooth', name: 'Vaza_profil', pos: [-80, 0, 0], color: '#2f9e8f' });
    a.mod(v, 'Lathe', { segs: 32, align: 'Min' });
    const r = a.add('Rectangle', { length: 70, width: 50, corner: 0 }, [40, 0, 0], { name: 'Rom', color: '#a0703f' });
    a.add('Rectangle', { length: 56, width: 36 }, [40, 0, 0], { name: 'Rom_ichki', color: '#a0703f' }); void r;
    const h = a.add('Helix', { radius1: 14, radius2: 14, height: 60, turns: 7, render: true, thick: 2.5 }, [140, 0, 0], { name: 'Prujina', color: '#9aa3ad' }); void h;
    const st = a.add('Star', { radius1: 18, radius2: 12, points: 8 }, [0, 110, 0], { name: 'Ustun', color: '#cfc6b8' });
    a.mod(st, 'Extrude', { amount: 80, segs: 16 }); a.mod(st, 'Twist', { angle: 90 });
  },
  '09': a => {
    const c = a.line([[0, 0], [16, 0], [22, 10], [10, 22], [18, 34], [26, 46], [12, 56], [14, 64]], { view: 'Front', interp: 'B-Spline', name: 'CV_Curve', pos: [-60, 0, 0], color: '#43a047' });
    a.mod(c, 'Lathe', { segs: 32 });
    const p = a.add('Plane', { length: 160, width: 160, lsegs: 5, wsegs: 5 }, [80, 0, 0], { name: 'Landshaft', color: '#7cb342' });
    a.mod(p, 'Noise', { sz: 40, scale: 60, seed: 3 }); a.mod(p, 'TurboSmooth', { iter: 2 });
  },
  '10': a => {
    const g = a.line([[0.1, 0], [7, 0], [7.5, 0.6], [1.2, 1.4], [0.9, 7], [1.1, 10], [6.5, 12.5], [8.2, 19], [7.4, 24]], { view: 'Front', interp: 'Smooth', name: 'Qadah_profil', pos: [-25, 0, 0], color: '#9fd3ff' });
    a.mod(g, 'Lathe', { segs: 48 }); a.mat(g, { color: '#cfe9ff', rough: 0.05, metal: 0, opacity: 0.35 });
    const m = a.add('Box', { width: 6.5, length: 12, height: 4, wsegs: 2, lsegs: 3, hsegs: 2 }, [20, 0, 0], { name: 'Sichqoncha', color: '#2b2f36' });
    a.mod(m, 'TurboSmooth', { iter: 2 }); a.mod(m, 'Taper', { amount: -0.25, axis: 'Y', effect: 'X' });
  },
  '11': a => {
    const h = a.add('Box', { width: 16, length: 19, height: 22, wsegs: 2, lsegs: 2, hsegs: 3 }, [0, 0, 0], { name: 'Bosh', color: '#e2b08f' }); a.mod(h, 'TurboSmooth', { iter: 2 });
    const e = a.add('Sphere', { radius: 1.4, segs: 16 }, [-3.4, -8.6, 12.5], { name: 'Koz_chap', color: '#f4f4f4' }); a.inst(e, [3.4, -8.6, 12.5], { name: 'Koz_ong' });
    a.add('Box', { width: 9, length: 2.5, height: 10, wsegs: 2, hsegs: 2 }, [30, 0, 0], { name: 'Kaft', color: '#e2b08f' });
    const f = a.add('Cylinder', { radius: 0.9, height: 7, hsegs: 8, sides: 10 }, [26.6, 0, 10], { name: 'Barmoq_1', color: '#e2b08f' }); a.mod(f, 'Bend', { angle: 30, dir: 90 });
    [[28.9, 10], [31.1, 10], [33.3, 10]].forEach((p, i) => a.inst(f, [p[0], 0, p[1]], { name: 'Barmoq_' + (i + 2) }));
    const t = a.inst(f, [25, 0, 4], { name: 'Barmoq_bosh' }); t.group.rotation.y = -0.8;
  },
  '12': a => {
    const b = a.add('Box', { width: 40, length: 40, height: 40 }, [-70, 0, 0], { name: 'Box_UV' }); a.mod(b, 'UVW Map', { map: 'Box' }); a.mat(b, { map: 'checker' });
    const c = a.add('Cylinder', { radius: 18, height: 50, sides: 32 }, [0, 0, 0], { name: 'Cylinder_UV' }); a.mod(c, 'UVW Map', { map: 'Cylindrical', utile: 4 }); a.mat(c, { map: 'checker' });
    const s = a.add('Sphere', { radius: 22, segs: 32 }, [70, 0, 22], { name: 'Sphere_UV' }); a.mod(s, 'UVW Map', { map: 'Spherical', utile: 4, vtile: 2 }); a.mat(s, { map: 'checker' });
    const w = a.add('Box', { width: 160, length: 10, height: 80 }, [0, 80, 0], { name: 'Devor' }); a.mod(w, 'UVW Map', { map: 'Box', utile: 2, vtile: 2 }); a.mat(w, { map: 'brick', rough: 0.85 });
  },
  '13': a => {
    for (let i = 0; i < 5; i++) { const s = a.add('Sphere', { radius: 12, segs: 32 }, [-100 + 50 * i, -40, 12], { name: 'Roughness_' + (i * 25) }); a.mat(s, { color: '#c0392b', rough: i / 4, metal: 0 }); }
    const g = a.add('Sphere', { radius: 16, segs: 40 }, [-75, 40, 16], { name: 'Oltin' }); a.mat(g, { color: '#e3b04b', rough: 0.25, metal: 1 });
    const x = a.add('Sphere', { radius: 16, segs: 40 }, [-25, 40, 16], { name: 'Xrom' }); a.mat(x, { color: '#e8e8e8', rough: 0.05, metal: 1 });
    const gl = a.add('Sphere', { radius: 16, segs: 40 }, [25, 40, 16], { name: 'Shisha' }); a.mat(gl, { color: '#bfe3ff', rough: 0.02, opacity: 0.3 });
    const r = a.add('Sphere', { radius: 16, segs: 40 }, [75, 40, 16], { name: 'Rezina' }); a.mat(r, { color: '#2b2b2b', rough: 0.95 });
    const w = a.add('Box', { width: 220, length: 8, height: 70 }, [0, 100, 0], { name: 'Gisht_devor' }); a.mod(w, 'UVW Map', { map: 'Box', utile: 3, vtile: 2 }); a.mat(w, { map: 'brick', rough: 0.85 });
  },
  '14': a => {
    a.add('Plane', { length: 300, width: 300 }, [0, 0, 0], { name: 'Pol', color: '#c8c8c8' });
    a.add('Teapot', { tsize: 22, segs: 8 }, [0, 0, 0], { name: 'Choynak', color: '#2f6fd6' });
    a.add('Spot', { mult: 1.6, shadow: true, tx: 0, ty: 0, tz: 15 }, [-120, -140, 180], { name: 'Key_Spot' });
    a.add('Omni', { mult: 0.45, shadow: false }, [150, -90, 80], { name: 'Fill_Omni' });
    a.add('Omni', { mult: 0.8, shadow: false, color: '#dfe9ff' }, [40, 160, 140], { name: 'Back_Omni' });
  },
  '15': a => {
    [12, 6, 3, 1].forEach((s, i) => a.add('Teapot', { tsize: 18, segs: s }, [-120 + 80 * i, 0, 0], { name: 'Choynak_LOD' + i, color: ['#4caf50', '#8bc34a', '#ffc107', '#ff5722'][i] }));
    a.add('Box', { width: 52, length: 34, height: 30 }, [-120, 0, 0], { name: 'UCX_Choynak_LOD0', color: '#ff00ff' });
  },
};

/* ---------------- tekshiruvlar ---------------- */
const near = (a, b, t = 0.6) => Math.abs(a - b) <= t;
const nm = o => (o.name || '').trim().toLowerCase();
const deg = r => ((r / (Math.PI / 180)) % 360 + 360) % 360;
const hasMod = (o, t, f = () => true) => o.src.mods.some(m => m.type === t && m.on && f(m.p));
const groups = S => { const m = new Map(); S.objs.forEach(o => { m.set(o.src, (m.get(o.src) || []).concat(o)); }); return [...m.values()]; };
const T = (S, t) => S.objs.filter(o => o.type === t);
const isGeo = o => !['Omni', 'Spot', 'Sun'].includes(o.type);
const lights = S => S.objs.filter(o => ['Omni', 'Spot', 'Sun'].includes(o.type) && !o.hidden);

export const CHECK = {
  '01': [S => S.flags.maxed, S => T(S, 'Teapot').some(o => nm(o) === 'choynak'), S => S.flags.shade, S => S.flags.stats, S => new Set(S.objs.filter(o => o.cat === 'geo').map(o => o.type)).size >= 5],
  '02': [
    S => T(S, 'Box').some(o => nm(o) === 'stol_qopqoq' && near(o.src.p.length, 130) && near(o.src.p.width, 240) && near(o.src.p.height, 8)),
    S => T(S, 'Box').some(o => nm(o) === 'stol_qopqoq' && near(o.group.position.z, 74)),
    S => groups(S).some(g => g.length >= 4 && g[0].type === 'Cylinder' && near(g[0].src.p.radius, 5) && near(g[0].src.p.height, 74)),
    S => S.objs.some(o => S.objs.some(x => x !== o && x.src !== o.src && x.src.p === o.src.p)),
    S => new Set(S.objs.filter(o => o.cat === 'geo').map(o => o.type)).size >= 8,
  ],
  '03': [
    S => S.objs.some(o => near(o.group.position.x, 50, 0.05) && near(o.group.position.y, -30, 0.05) && near(o.group.position.z, 0, 0.05)),
    S => S.objs.some(o => { const z = deg(o.group.rotation.z); return (near(z, 45) || near(z, 315)) && near(o.group.rotation.x, 0, 0.01) && near(o.group.rotation.y, 0, 0.01); }),
    S => S.objs.some(o => o.group.scale.z >= 1.49 && near(o.group.scale.x, 1, 0.01) && near(o.group.scale.y, 1, 0.01)),
    S => T(S, 'Box').some(o => near(o.src.p.width, 90) && near(o.src.p.height, 210) && near(Math.abs(o.piv.x), 45, 1) && Math.abs(deg(o.group.rotation.z) - 180) <= 150 && deg(o.group.rotation.z) >= 30 && deg(o.group.rotation.z) <= 330),
    S => groups(S).some(g => g.length >= 20 && g[0].type === 'Box' && new Set(g.map(o => Math.round(o.group.position.z))).size >= 20),
  ],
  '04': [
    S => T(S, 'Box').some(o => nm(o) === 'uy_devor' && near(o.src.p.width, 300) && near(o.src.p.length, 200) && near(o.src.p.height, 180)),
    S => T(S, 'Box').some(o => nm(o) === 'uy_tom' && near(o.group.position.z, 180, 1)),
    S => T(S, 'Box').some(o => nm(o) === 'uy_tom' && hasMod(o, 'Taper', p => near(p.amount, -1, 0.05) && p.effect !== 'XY')),
    S => T(S, 'Box').some(o => o.src.p.lsegs === 3 && o.src.p.wsegs === 3 && o.src.p.hsegs === 3) && S.flags.stats,
  ],
  '05': [
    S => T(S, 'Box').some(o => o.src.p.lsegs === 1 && o.src.p.hsegs === 1 && hasMod(o, 'TurboSmooth', p => p.iter >= 1)),
    S => T(S, 'Box').some(o => o.src.p.lsegs >= 3 && o.src.p.wsegs >= 3 && o.src.p.hsegs >= 3 && hasMod(o, 'TurboSmooth', p => p.iter >= 1)),
    S => S.objs.some(o => hasMod(o, 'TurboSmooth', p => p.iter >= 3)),
    S => T(S, 'Tube').some(o => o.src.p.sides === 16) && T(S, 'Torus').length > 0,
  ],
  '06': [
    S => groups(S).some(g => g.length >= 24 && g[0].type === 'Box' && new Set(g.map(o => Math.round(deg(o.group.rotation.z)))).size >= 12),
    S => T(S, 'Box').filter(o => o.src.p.width <= 20 && o.src.p.length <= 20).length >= 40,
    S => { const tp = T(S, 'Teapot'); return tp.some(a => tp.some(b => a.polys >= 20 * b.polys)); },
  ],
  '07': [
    S => T(S, 'Line').some(o => o.src.p.closed && (o.src.p.pts || []).length >= 4),
    S => T(S, 'Line').some(o => o.src.p.closed && o.src.p.interp !== 'Corner' && (o.src.p.pts || []).length >= 4),
    S => T(S, 'Rectangle').some(o => o.src.p.corner > 0),
    S => S.objs.some(o => o.cat === 'shape' && o.src.p.steps === 0) && S.objs.some(o => o.cat === 'shape' && o.src.p.steps >= 12),
    S => T(S, 'Star').some(o => o.src.p.points === 5 && hasMod(o, 'Extrude', p => Math.abs(p.amount) > 0)),
  ],
  '08': [
    S => T(S, 'Line').some(o => !o.src.p.closed && hasMod(o, 'Lathe', p => p.segs >= 16)),
    S => S.objs.some(o => o.cat === 'shape' && o.type !== 'Line' && hasMod(o, 'Extrude', p => Math.abs(p.amount) >= 5)),
    S => T(S, 'Helix').some(o => o.src.p.render),
    S => S.objs.some(o => o.cat === 'shape' && hasMod(o, 'Extrude') && hasMod(o, 'Twist', p => Math.abs(p.angle) > 0)),
  ],
  '09': [
    S => T(S, 'Line').some(o => o.src.p.interp === 'B-Spline' && (o.src.p.pts || []).length >= 8),
    S => T(S, 'Line').some(o => o.src.p.interp === 'B-Spline' && hasMod(o, 'Lathe')),
    S => T(S, 'Plane').some(o => o.src.p.lsegs === 5 && o.src.p.wsegs === 5 && hasMod(o, 'Noise', p => Math.abs(p.sz) >= 5)),
    S => T(S, 'Sphere').some(o => hasMod(o, 'Noise', p => Math.abs(p.sx) + Math.abs(p.sy) + Math.abs(p.sz) > 0)),
  ],
  '10': [
    S => T(S, 'Line').some(o => o.src.p.interp === 'Smooth' && hasMod(o, 'Lathe', p => p.deg >= 359.9)),
    S => S.objs.some(o => hasMod(o, 'Lathe', p => p.segs >= 32)),
    S => T(S, 'Box').some(o => hasMod(o, 'TurboSmooth') && hasMod(o, 'Taper', p => p.amount !== 0)),
    S => S.flags.stats,
  ],
  '11': [
    S => T(S, 'Box').some(o => nm(o) === 'bosh' && hasMod(o, 'TurboSmooth')),
    S => groups(S).some(g => g.length >= 2 && g[0].type === 'Sphere'),
    S => groups(S).some(g => g.length >= 5 && g[0].type === 'Cylinder' && hasMod(g[0], 'Bend', p => p.angle !== 0)),
    S => S.flags.stats,
  ],
  '12': [
    S => S.objs.filter(o => o.mtl && o.mtl.map === 'checker').length >= 3,
    S => new Set(S.objs.flatMap(o => o.src.mods.filter(m => m.type === 'UVW Map' && m.on).map(m => m.p.map))).size >= 3,
    S => S.objs.some(o => hasMod(o, 'UVW Map', p => p.utile >= 4 || p.vtile >= 4)),
  ],
  '13': [
    S => new Set(T(S, 'Sphere').filter(o => o.mtl).map(o => Math.round(o.mtl.rough * 100))).size >= 5,
    S => S.objs.some(o => o.mtl && o.mtl.metal >= 0.9),
    S => S.objs.some(o => o.mtl && o.mtl.opacity <= 0.5),
    S => S.objs.some(o => o.mtl && o.mtl.map === 'brick'),
  ],
  '14': [
    S => lights(S).length >= 1,
    S => lights(S).length >= 3 && new Set(lights(S).map(o => Math.round(o.src.p.mult * 10))).size >= 2,
    S => lights(S).some(o => o.src.p.shadow),
    S => S.flags.rendered,
  ],
  '15': [
    S => [0, 1, 2, 3].every(i => S.objs.some(o => /_lod\d$/.test(nm(o)) && nm(o).endsWith('_lod' + i))),
    S => { const L = [0, 1, 2, 3].map(i => S.objs.find(o => nm(o).endsWith('_lod' + i))); return L.every(Boolean) && L[0].polys > L[1].polys && L[1].polys > L[2].polys && L[2].polys > L[3].polys; },
    S => S.objs.some(o => isGeo(o) && nm(o).startsWith('ucx_')),
    S => S.flags.xform,
    S => S.flags.exported,
  ],
};
