// חולצה תלת-ממדית: גוף כגליל אליפטי רציף (פנים וגב), ושרוולים כמשטחים
// שבולטים לצדדים. הטקסטורה היא ציור החולצה עצמו (ה-SVG של TeamShirt), עם
// הסמל רק על הפנים. משמש את הסיבוב בלחיצה (ShirtSpinGL) ואת החולצות
// שמסובבים באצבע בחלון הנתונים (ShirtViewer3D).

import { loadImage } from './stage';

export const VB_W = 48;
export const VB_H = 44;
const A = 12.5;      // חצי רוחב הגוף (יחידות ציור)
const B = 7.5;       // חצי עומק
const X0 = 24 - A;   // 11.5
const X1 = 24 + A;   // 36.5

// SVG שעל המסך -> שני קנבסים (פנים עם סמל, גב בלי)
export const shirtCanvases = async (svgEl, crestSrc, texW = 512) => {
  if (!svgEl) return null;
  const clone = svgEl.cloneNode(true);
  const texH = Math.round(texW * VB_H / VB_W);
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', String(texW));
  clone.setAttribute('height', String(texH));
  clone.querySelectorAll('.shirt-shine').forEach((n) => n.remove());
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml' }));
  const img = await new Promise((resolve) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => resolve(null);
    i.src = url;
  });
  URL.revokeObjectURL(url);
  if (!img) return null;
  const crest = await loadImage(crestSrc);
  const make = (withCrest) => {
    const c = document.createElement('canvas');
    c.width = texW;
    c.height = texH;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0, texW, texH);
    if (withCrest && crest) {
      const s = texW * 0.22;
      ctx.drawImage(crest, texW * 0.63 - s / 2, texH * 0.33 - s / 2, s, s);
    }
    return c;
  };
  return { front: make(true), back: make(false) };
};

// חצי גליל אליפטי. θ במרווחים שווים; כל נקודה לוקחת מהטקסטורה את ה-x
// המתאים, כך שהציור "נעטף" על הגוף. בגב - הטקסטורה במראה
const torsoGeometry = (THREE, back) => {
  const nu = 32, nv = 2;
  const pos = [], uv = [], idx = [];
  for (let j = 0; j <= nv; j++) {
    const y = (j / nv) * VB_H;
    for (let i = 0; i <= nu; i++) {
      const t = -Math.PI / 2 + (i / nu) * Math.PI;
      const sx = Math.sin(t);
      pos.push(back ? -A * sx : A * sx, VB_H / 2 - y, back ? -B * Math.cos(t) : B * Math.cos(t));
      uv.push((24 + A * sx) / VB_W, 1 - y / VB_H);
    }
  }
  for (let j = 0; j < nv; j++) {
    for (let i = 0; i < nu; i++) {
      const a = j * (nu + 1) + i, b = a + 1, c = a + nu + 1, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
};

const sleeveGeometry = (THREE, left, back) => {
  const xa = left ? 0 : X1, xb = left ? X0 : VB_W;
  const yb = 23;
  const g = new THREE.PlaneGeometry(xb - xa, yb, 1, 1);
  const uvs = g.attributes.uv;
  for (let k = 0; k < uvs.count; k++) {
    const u = uvs.getX(k), v = uvs.getY(k);
    uvs.setXY(k, (xa + u * (xb - xa)) / VB_W, 1 - (1 - v) * yb / VB_H);
  }
  g.translate((xa + xb) / 2 - 24, VB_H / 2 - yb / 2, 0);
  if (back) g.rotateY(Math.PI);
  return g;
};

// תאורה שכוילה כך שפני החולצה בתלת-ממד בצבע של החולצה השטוחה
export const addShirtLights = (THREE, scene) => {
  scene.add(new THREE.AmbientLight(0xffffff, 1.5));
  const key = new THREE.DirectionalLight(0xffffff, 1.9);
  key.position.set(18, 30, 60);
  scene.add(key);
};

export const buildShirt = (THREE, tex) => {
  const disposers = [];
  const material = (canvas) => {
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    const m = new THREE.MeshStandardMaterial({ map: t, alphaTest: 0.45, roughness: 1, metalness: 0 });
    disposers.push(() => { t.dispose(); m.dispose(); });
    return m;
  };
  const front = material(tex.front);
  const back = material(tex.back);
  const group = new THREE.Group();
  const add = (geo, m) => { disposers.push(() => geo.dispose()); group.add(new THREE.Mesh(geo, m)); };
  add(torsoGeometry(THREE, false), front);
  add(torsoGeometry(THREE, true), back);
  add(sleeveGeometry(THREE, true, false), front);
  add(sleeveGeometry(THREE, false, false), front);
  add(sleeveGeometry(THREE, true, true), back);
  add(sleeveGeometry(THREE, false, true), back);
  return { group, dispose: () => disposers.forEach((d) => d()) };
};

// מצלמה שבה החולצה בגודל הציור השטוח: גובה התצוגה = VB_H * zoom יחידות
export const shirtCamera = (THREE, aspect, zoom = 1.6) => {
  const camera = new THREE.PerspectiveCamera(30, aspect, 1, 1000);
  camera.position.set(0, 3, VB_H * zoom / 2 / Math.tan((15 * Math.PI) / 180));
  camera.lookAt(0, 0, 0);
  return camera;
};
