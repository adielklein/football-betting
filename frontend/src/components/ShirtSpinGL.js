import React, { useEffect, useRef } from 'react';

// סיבוב תלת-ממדי אמיתי של חולצה בלחיצה, ב-WebGL (three.js).
//
// גוף החולצה הוא גליל אליפטי רציף (רשת אחת לפנים ואחת לגב), והשרוולים
// משטחים שבולטים לצדדים. הטקסטורה היא ציור החולצה עצמו (ה-SVG שעל המסך),
// עם הסמל רק על הפנים. תאורה אמיתית: אור רך מסביב ואור מלפנים-למעלה, כך
// שהגוף מתכהה בצדדים כמו בד על גוף.
//
// three.js נטען רק בלחיצה הראשונה (import דינמי), כך שהוא לא מאט את טעינת
// האפליקציה. עד שהוא מוכן מוצגת החולצה השטוחה, והקנבס מחליף אותה רק כשהמסגרת
// הראשונה צוירה (onReady). אחרי הסיבוב הכל משוחרר, כולל הקשר ה-WebGL -
// לדפדפן יש מגבלה על מספר הקשרים פתוחים.

const VB_W = 48;
const VB_H = 44;
const A = 12.5;      // חצי רוחב הגוף (יחידות הציור)
const B = 7.5;       // חצי עומק
const X0 = 24 - A;   // 11.5
const X1 = 24 + A;   // 36.5
const DUR = 800;
const TEX_W = 512;

let threePromise = null;
const loadThree = () => (threePromise = threePromise || import('three'));

// SVG -> תמונה -> קנבס. הסמל (תמונה מאתר אחר) נוסף רק אם השרת מרשה
// (CORS); אחרת קנבס "נגוע" היה מפיל את ה-WebGL, ולכן ממשיכים בלעדיו
const svgToCanvas = (svgEl, crestSrc) => new Promise((resolve) => {
  const clone = svgEl.cloneNode(true);
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', String(TEX_W));
  clone.setAttribute('height', String(Math.round(TEX_W * VB_H / VB_W)));
  clone.querySelectorAll('.shirt-shine').forEach((n) => n.remove());
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml' }));
  const img = new Image();
  img.onload = () => {
    const make = (withCrest, crestImg) => {
      const c = document.createElement('canvas');
      c.width = TEX_W;
      c.height = Math.round(TEX_W * VB_H / VB_W);
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0, c.width, c.height);
      if (withCrest && crestImg) {
        const s = c.width * 0.22;
        ctx.drawImage(crestImg, c.width * 0.63 - s / 2, c.height * 0.33 - s / 2, s, s);
      }
      return c;
    };
    URL.revokeObjectURL(url);
    if (!crestSrc) { resolve({ front: make(false), back: make(false) }); return; }
    const crest = new Image();
    crest.crossOrigin = 'anonymous';
    crest.onload = () => {
      const front = make(true, crest);
      try { front.getContext('2d').getImageData(0, 0, 1, 1); resolve({ front, back: make(false) }); }
      catch { resolve({ front: make(false), back: make(false) }); }
    };
    crest.onerror = () => resolve({ front: make(false), back: make(false) });
    crest.src = crestSrc;
  };
  img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
  img.src = url;
});

// רשת של חצי גליל אליפטי. θ במרווחים שווים; כל נקודה לוקחת מהטקסטורה את
// ה-x המתאים, כך שהציור "נעטף" על הגוף. back: החצי האחורי, בטקסטורה הפוכה
const torsoGeometry = (THREE, back) => {
  const nu = 32, nv = 2;
  const pos = [], uv = [], idx = [];
  for (let j = 0; j <= nv; j++) {
    const y = (j / nv) * VB_H;
    for (let i = 0; i <= nu; i++) {
      const t = -Math.PI / 2 + (i / nu) * Math.PI;      // -90..90 מעלות
      const sx = Math.sin(t);
      const x = back ? -A * sx : A * sx;
      const z = back ? -B * Math.cos(t) : B * Math.cos(t);
      pos.push(x, VB_H / 2 - y, z);
      const texX = 24 + A * sx;                          // במראה בגב
      uv.push(texX / VB_W, 1 - y / VB_H);
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

// שרוול: משטח מהצלע של הגוף החוצה, בחלק המתאים של הטקסטורה
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

export default function ShirtSpinGL({ svgEl, crestSrc, size, onReady }) {
  const hostRef = useRef(null);

  useEffect(() => {
    let disposed = false;
    let frame = 0;
    const cleanup = [];

    (async () => {
      const [THREE, tex] = await Promise.all([loadThree(), svgEl ? svgToCanvas(svgEl, crestSrc) : null]);
      if (disposed || !tex || !hostRef.current) return;

      const box = size * 1.6;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      let renderer;
      try {
        renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, premultipliedAlpha: true });
      } catch {
        return; // אין WebGL - נשארים עם החולצה השטוחה
      }
      renderer.setPixelRatio(dpr);
      renderer.setSize(box, box * 0.92);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      hostRef.current.appendChild(renderer.domElement);
      cleanup.push(() => { renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove(); });

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(30, 1 / 0.92, 1, 1000);
      // המרחק נקבע כך שהחולצה בתלת-ממד באותו גודל כמו השטוחה: גובה הקנבס
      // מכסה בדיוק VB_H * 1.6 יחידות ציור
      camera.position.set(0, 3, VB_H * 1.6 / 2 / Math.tan((15 * Math.PI) / 180));
      camera.lookAt(0, 0, 0);

      const texture = (canvas) => {
        const t = new THREE.CanvasTexture(canvas);
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 4;
        cleanup.push(() => t.dispose());
        return t;
      };
      const mat = (canvas) => {
        const m = new THREE.MeshStandardMaterial({ map: texture(canvas), alphaTest: 0.45, roughness: 1, metalness: 0, side: THREE.FrontSide });
        cleanup.push(() => m.dispose());
        return m;
      };
      const front = mat(tex.front);
      const back = mat(tex.back);
      const group = new THREE.Group();
      const add = (geo, m) => { cleanup.push(() => geo.dispose()); group.add(new THREE.Mesh(geo, m)); };
      add(torsoGeometry(THREE, false), front);
      add(torsoGeometry(THREE, true), back);
      add(sleeveGeometry(THREE, true, false), front);
      add(sleeveGeometry(THREE, false, false), front);
      add(sleeveGeometry(THREE, true, true), back);
      add(sleeveGeometry(THREE, false, true), back);
      scene.add(group);

      scene.add(new THREE.AmbientLight(0xffffff, 1.5));
      const key = new THREE.DirectionalLight(0xffffff, 1.9);
      key.position.set(18, 30, 60);
      scene.add(key);

      const start = performance.now();
      const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
      let first = true;
      const tick = (now) => {
        if (disposed) return;
        const p = Math.min(1, (now - start) / DUR);
        group.rotation.y = ease(p) * Math.PI * 2;
        renderer.render(scene, camera);
        if (first) { first = false; onReady && onReady(); }
        if (p < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    })();

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      cleanup.reverse().forEach((f) => { try { f(); } catch { /* כבר שוחרר */ } });
    };
  }, [svgEl, crestSrc, size, onReady]);

  return (
    <span ref={hostRef} aria-hidden="true" className="shirt-flip" style={{
      position: 'absolute', left: '50%', top: '50%', width: size * 1.6, height: size * 1.6 * 0.92,
      transform: 'translate(-50%, -50%)', pointerEvents: 'none', lineHeight: 0
    }} />
  );
}
