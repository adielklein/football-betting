import { API_URL } from '../config';

// במה תלת-ממדית משותפת לכל האפליקציה.
//
// הקשר WebGL אחד בלבד, מחוץ למסך, שמצייר את כל "התצוגות" (חולצות, סמל,
// מדליות, שער) ומעתיק כל אחת לקנבס דו-ממדי משלה. לכל קנבס WebGL משלו
// דפדפנים מגבילים את מספר ההקשרים (כ-16), ובטלפון כל הקשר יקר - ועם מדליות
// בטבלה ובהיסטוריה, סמל בכותרת וחולצות, היינו חוצים את המגבלה.
//
// three.js נטען רק בפעם הראשונה שמישהו מבקש את הבמה (import דינמי).
//
// תצוגה (view): { canvas, width, height, scene, camera, frame(now) }.
// frame מעדכן את הסצנה ומחזיר true אם צריך לצייר שוב במסגרת הבאה; false -
// התצוגה "נחה" ולא מצוירת עד ש-wake(view) נקרא. כך מדליה שלא מסתובבת לא
// עולה כלום.

const MAX = 512; // צד הקנבס המשותף בפיקסלים. תצוגות גדולות מזה מוקטנות

let stagePromise = null;

export const loadThree = () => import('three');

export const getStage = () => {
  if (stagePromise) return stagePromise;
  stagePromise = loadThree().then((THREE) => {
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, premultipliedAlpha: false, powerPreference: 'low-power' });
    } catch {
      return null; // אין WebGL - כל רכיב נשאר עם הגרסה הדו-ממדית שלו
    }
    renderer.setPixelRatio(1);
    renderer.setSize(MAX, MAX, false);
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const views = new Set();
    const awake = new Set();
    let raf = 0;

    const draw = (view) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.min(MAX, Math.round(view.width * dpr));
      const h = Math.min(MAX, Math.round(view.height * dpr));
      if (view.canvas.width !== w || view.canvas.height !== h) {
        view.canvas.width = w;
        view.canvas.height = h;
      }
      renderer.setViewport(0, 0, w, h);
      renderer.setScissor(0, 0, w, h);
      renderer.setScissorTest(true);
      renderer.clear();
      renderer.render(view.scene, view.camera);
      const ctx = view.ctx || (view.ctx = view.canvas.getContext('2d'));
      ctx.clearRect(0, 0, w, h);
      // WebGL מצייר מלמטה; הקנבס הדו-ממדי קורא מלמעלה
      ctx.drawImage(renderer.domElement, 0, MAX - h, w, h, 0, 0, w, h);
    };

    const loop = (now) => {
      raf = 0;
      if (document.hidden) return; // ממשיכים כשהדף חוזר (visibilitychange)
      for (const view of [...awake]) {
        // תצוגה שמבקשת קצב נמוך (minInterval במילישניות) מדלגת על מסגרות
        if (view.minInterval && view._last && now - view._last < view.minInterval) continue;
        view._last = now;
        let again = false;
        try { again = view.frame ? view.frame(now) : false; } catch { again = false; }
        draw(view);
        if (!again) awake.delete(view);
      }
      if (awake.size) raf = requestAnimationFrame(loop);
    };
    const kick = () => { if (!raf && awake.size) raf = requestAnimationFrame(loop); };
    document.addEventListener('visibilitychange', kick);

    return {
      THREE,
      renderer,
      // ציור מיידי ומסונכרן של תצוגה (למי שמנהל לולאה משלו, כמו משחק הבעיטות)
      renderNow(view) { draw(view); },
      add(view) { views.add(view); awake.add(view); kick(); },
      remove(view) { views.delete(view); awake.delete(view); },
      wake(view) { if (views.has(view)) { awake.add(view); kick(); } },
    };
  }).catch(() => null);
  return stagePromise;
};

// סביבת השתקפויות למתכת (מדליות, סמל). נבנית פעם אחת
let envPromise = null;
export const getEnvironment = (stage) => {
  if (envPromise) return envPromise;
  envPromise = import('three/examples/jsm/environments/RoomEnvironment.js').then(({ RoomEnvironment }) => {
    const { THREE, renderer } = stage;
    const pmrem = new THREE.PMREMGenerator(renderer);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    return env;
  }).catch(() => null);
  return envPromise;
};

// טעינת תמונה לטקסטורה. WebGL מקבל תמונה מאתר אחר רק אם השרת שלה מרשה
// (CORS). קודם ישירות; אם נחסם - דרך המעבר בשרת שלנו (/api/image-proxy),
// שמוסיף את הכותרת לאתרי סמלים מרשימה סגורה. אם גם זה נכשל - null, והרכיב
// נשאר דו-ממדי או בלי סמל
const tryLoad = (src) => new Promise((resolve) => {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    try {
      const c = document.createElement('canvas');
      c.width = c.height = 2;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0, 2, 2);
      ctx.getImageData(0, 0, 1, 1);
      resolve(img);
    } catch { resolve(null); }
  };
  img.onerror = () => resolve(null);
  img.src = src;
});

export const loadImage = async (src) => {
  if (!src) return null;
  const direct = await tryLoad(src);
  if (direct || !/^https?:/i.test(src)) return direct;
  return tryLoad(`${API_URL}/image-proxy?u=${encodeURIComponent(src)}`);
};
