// חולצה תלת-ממדית: גוף כגליל אליפטי רציף (פנים וגב), שרוולים כצינורות
// מלאים שמצטרים לכיוון השרוול, כתפיים שסוגרות את החלק העליון, צווארון עגול
// סביב הצוואר ובטנה כהה מבפנים - כך שגם מהצד היא נראית כמו חולצה. הטקסטורה היא ציור החולצה עצמו (ה-SVG של TeamShirt), עם
// הסמל רק על הפנים. משמש את הסיבוב בלחיצה (ShirtSpinGL) ואת החולצות
// שמסובבים באצבע בחלון הנתונים (ShirtViewer3D).

import { loadImage } from './stage';

export const VB_W = 48;
export const VB_H = 44;
const A = 12.5;      // חצי רוחב הגוף (יחידות ציור)
const B = 6;         // חצי עומק (חולצה שטוחה יותר מגליל: עומק כ-0.5 מהרוחב)
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
  const front = make(true);
  // צבע הצווארון: צבע הצווארון של הערכה אם יש (קו בעובי 2.6 בציור),
  // אחרת צבע הבד במרכז החזה, מעט כהה יותר
  let collar = null;
  const stroke = svgEl.querySelector('path[stroke-width="2.6"]');
  if (stroke && stroke.getAttribute('stroke')) collar = stroke.getAttribute('stroke');
  else {
    try {
      const d = front.getContext('2d').getImageData(Math.round(texW * 24 / VB_W), Math.round(texH * 8.5 / VB_H), 1, 1).data;
      const k = 0.82;
      collar = `rgb(${Math.round(d[0] * k)},${Math.round(d[1] * k)},${Math.round(d[2] * k)})`;
    } catch (e) { collar = '#888'; }
  }
  return { front, back: make(false), collar };
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

// עומק הגוף (חצי) בנקודה x של הציור
const zAt = (x) => B * Math.sqrt(Math.max(0, 1 - ((x - 24) / A) ** 2));

// מסדר את המשולשים כך שהנורמל פונה החוצה (out(i) = כיוון החוצה בקודקוד i)
const orient = (pos, idx, out) => {
  const v = (i) => [pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]];
  for (let t = 0; t < idx.length; t += 3) {
    const a = v(idx[t]), b = v(idx[t + 1]), c = v(idx[t + 2]);
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], w = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
    const o = out(idx[t]);
    if (n[0] * o[0] + n[1] * o[1] + n[2] * o[2] < 0) { const k = idx[t + 1]; idx[t + 1] = idx[t + 2]; idx[t + 2] = k; }
  }
};

const gridIndex = (nu, nv) => {
  const idx = [];
  for (let j = 0; j < nv; j++) {
    for (let i = 0; i < nu; i++) {
      const a = j * (nu + 1) + i, b = a + 1, c = a + nu + 1, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }
  return idx;
};

const toGeometry = (THREE, pos, uv, idx) => {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
};

// שרוול: חצי צינור (פנים או גב) בין קצה הכתף/בית השחי לבין פתח השרוול.
// מלפנים הוא מכסה בדיוק את השרוול שבציור, ובעומק יש לו נפח אליפטי.
// הטקסטורה היא ההיטל של כל נקודה על הציור (בגב - במראה, כמו הגוף)
const SLEEVE = { ru: [13.2, 4.2], rl: [11.5, 18.5], cu: [1, 15], cl: [7.5, 21.5], dr: 3.9, dc: 2.7 };
const sleeveGeometry = (THREE, left, back) => {
  const mx = (p) => (left ? p : [VB_W - p[0], p[1]]);
  const ru = mx(SLEEVE.ru), rl = mx(SLEEVE.rl), cu = mx(SLEEVE.cu), cl = mx(SLEEVE.cl);
  const ns = 8, nf = 16;
  const pos = [], uv = [], centers = [];
  for (let j = 0; j <= ns; j++) {
    const s = j / ns;
    const pu = [ru[0] + (cu[0] - ru[0]) * s, ru[1] + (cu[1] - ru[1]) * s];
    const pl = [rl[0] + (cl[0] - rl[0]) * s, rl[1] + (cl[1] - rl[1]) * s];
    const c = [(pu[0] + pl[0]) / 2, (pu[1] + pl[1]) / 2];
    const h = [(pu[0] - pl[0]) / 2, (pu[1] - pl[1]) / 2];
    const d = SLEEVE.dr + (SLEEVE.dc - SLEEVE.dr) * s;
    for (let i = 0; i <= nf; i++) {
      const f = (i / nf) * Math.PI;
      const x = c[0] + h[0] * Math.cos(f), y = c[1] + h[1] * Math.cos(f);
      const z = (back ? -1 : 1) * d * Math.sin(f);
      pos.push(x - 24, VB_H / 2 - y, z);
      uv.push((back ? VB_W - x : x) / VB_W, 1 - y / VB_H);
      centers.push([c[0] - 24, VB_H / 2 - c[1], 0]);
    }
  }
  const idx = gridIndex(nf, ns);
  orient(pos, idx, (i) => [pos[i * 3] - centers[i][0], pos[i * 3 + 1] - centers[i][1], pos[i * 3 + 2]]);
  return toGeometry(THREE, pos, uv, idx);
};

// כתף: גג מעט מקושת שסוגר את הגוף בין קו הכתף שבציור, מהפנים לגב
const shoulderGeometry = (THREE, left) => {
  const xa = left ? X0 : 33, xb = left ? 15 : X1;
  const ySh = (x) => (left ? 3 + (15 - x) * 0.5 : 3 + (x - 33) * 0.5);
  const nx = 6, nz = 10;
  const pos = [], uv = [];
  for (let j = 0; j <= nz; j++) {
    for (let i = 0; i <= nx; i++) {
      const x = xa + ((xb - xa) * i) / nx;
      const zf = zAt(x);
      const q = 1 - (2 * j) / nz;            // 1 מלפנים, -1 בגב
      const y = ySh(x) - 0.7 * (1 - q * q);  // קשת קלה כלפי מעלה באמצע
      pos.push(x - 24, VB_H / 2 - y, zf * q);
      uv.push(x / VB_W, 1 - (ySh(x) + 2) / VB_H);
    }
  }
  const idx = gridIndex(nx, nz);
  orient(pos, idx, () => [0, 1, 0]);
  return toGeometry(THREE, pos, uv, idx);
};

// שוליים בפתח השרוול: טבעת דקה סביב הפתח, בצבע הצווארון
const cuffCurve = (THREE, left) => {
  const mx = (p) => (left ? p : [VB_W - p[0], p[1]]);
  const cu = mx(SLEEVE.cu), cl = mx(SLEEVE.cl);
  const c = [(cu[0] + cl[0]) / 2, (cu[1] + cl[1]) / 2], h = [(cu[0] - cl[0]) / 2, (cu[1] - cl[1]) / 2];
  const pts = [];
  for (let k = 0; k < 24; k++) {
    const f = (k / 24) * Math.PI * 2;
    const x = c[0] + h[0] * Math.cos(f), y = c[1] + h[1] * Math.cos(f);
    pts.push(new THREE.Vector3(x - 24, VB_H / 2 - y, SLEEVE.dc * Math.sin(f)));
  }
  return new THREE.CatmullRomCurve3(pts, true);
};

// צווארון: טבעת עגולה לאורך קו הצוואר שבציור מלפנים, וגבוה יותר בגב
const collarCurve = (THREE) => {
  const pts = [];
  for (let k = 0; k <= 12; k++) {
    const t = k / 12, x = 15 + 18 * t;
    pts.push(new THREE.Vector3(x - 24, VB_H / 2 - (3 + 12 * t * (1 - t)), zAt(x) + 0.35));
  }
  for (let k = 0; k <= 12; k++) {
    const t = k / 12, x = 33 - 18 * t;
    pts.push(new THREE.Vector3(x - 24, VB_H / 2 - (3 + 5 * t * (1 - t)), -(zAt(x) + 0.35)));
  }
  return new THREE.CatmullRomCurve3(pts, true, 'centripetal');
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
  const texture = (canvas) => {
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    disposers.push(() => t.dispose());
    return t;
  };
  const material = (map, opts = {}) => {
    const m = new THREE.MeshStandardMaterial({ map, alphaTest: 0.45, roughness: 1, metalness: 0, ...opts });
    disposers.push(() => m.dispose());
    return m;
  };
  const frontTex = texture(tex.front);
  const backTex = texture(tex.back);
  const front = material(frontTex);
  const back = material(backTex);
  // הבטנה: אותו בד, כהה יותר, נראה רק מבפנים (דרך הצוואר, השרוולים והמכפלת)
  const frontIn = material(frontTex, { side: THREE.BackSide, color: 0x3a3a3a });
  const backIn = material(backTex, { side: THREE.BackSide, color: 0x3a3a3a });
  const group = new THREE.Group();
  const add = (geo, outer, inner) => {
    disposers.push(() => geo.dispose());
    group.add(new THREE.Mesh(geo, outer));
    if (inner) group.add(new THREE.Mesh(geo, inner));
  };
  add(torsoGeometry(THREE, false), front, frontIn);
  add(torsoGeometry(THREE, true), back, backIn);
  [true, false].forEach((left) => {
    add(sleeveGeometry(THREE, left, false), front, frontIn);
    add(sleeveGeometry(THREE, left, true), back, backIn);
    add(shoulderGeometry(THREE, left), front, frontIn);
  });
  const collarMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(tex.collar || '#888'), roughness: 0.9, metalness: 0 });
  disposers.push(() => collarMat.dispose());
  add(new THREE.TubeGeometry(collarCurve(THREE), 96, 0.7, 8, true), collarMat);
  add(new THREE.TubeGeometry(cuffCurve(THREE, true), 48, 0.4, 6, true), collarMat);
  add(new THREE.TubeGeometry(cuffCurve(THREE, false), 48, 0.4, 6, true), collarMat);
  return { group, dispose: () => disposers.forEach((d) => d()) };
};

// מצלמה שבה החולצה בגודל הציור השטוח: גובה התצוגה = VB_H * zoom יחידות
export const shirtCamera = (THREE, aspect, zoom = 1.6) => {
  const camera = new THREE.PerspectiveCamera(30, aspect, 1, 1000);
  camera.position.set(0, 3, VB_H * zoom / 2 / Math.tan((15 * Math.PI) / 180));
  camera.lookAt(0, 0, 0);
  return camera;
};
