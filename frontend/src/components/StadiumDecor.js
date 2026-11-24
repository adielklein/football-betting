import React, { useEffect, useRef, useState } from 'react';
import { getStage, loadImage } from '../three/stage';
import { crestTextureSource, buildCrest } from '../three/crest';

// עיטורי האצטדיון, משותפים למסך השחקן ולמסך המנהל. ההסברים המלאים
// והצבעים - ב-index.css (header-crest, stadium-lights, pitch-stripes).

// שכבות המטבע של הסמל המסתובב, לפי סדר הציור. כל צד הוא דפנות ואז פנים,
// וכל צד נראה רק כשהוא פונה אלינו. הגב קודם, כך שפני החזית מצוירים
// אחרונים. עומק בפיקסלים. כל שכבה מסתובבת לבד ולא בהקשר תלת-ממדי משותף -
// ספארי באייפון צייר הקשר כזה מעל חלונות קופצים וחסם בהם לחיצות
const CREST_LAYERS = [
  ...[-3, -1.5, 0, 1.5, 3].map((z) => ({ z, cls: 'is-edge is-backside' })),
  { z: -4.5, cls: 'is-backside' },
  ...[-3, -1.5, 0, 1.5, 3].map((z) => ({ z, cls: 'is-edge' })),
  { z: 4.5, cls: '' },
];

// סמל ערכת הנושא, מסתובב. בתוך כותרת עם המחלקה header--crest.
//
// הגרסה המלאה היא גוף תלת-ממדי אמיתי (three/crest.js) על הבמה המשותפת:
// הצורה המדויקת של הסמל עם עובי, דפנות מתכתיות ותאורה. עד שהיא מוכנה, וגם
// אם אין WebGL או שתמונת הסמל לא ניתנת לטעינה ל-WebGL (אתר בלי CORS), נשאר
// המטבע בשכבות CSS. אצל מי שביקש פחות תנועה - רק ה-CSS, שעומד.
const SPIN_SECONDS = 9;

export function HeaderCrest() {
  const canvasRef = useRef(null);
  const [is3d, setIs3d] = useState(false);
  const [themeKey, setThemeKey] = useState(0);

  // ערכת נושא חדשה = סמל חדש: applyTheme כותב משתני CSS על השורש
  useEffect(() => {
    // רק כשהסמל עצמו השתנה: השורש מקבל עוד משתנים (למשל גובה הסרגל התחתון
    // כשהמקלדת נפתחת), ובנייה מחדש על כל אחד מהם הייתה בזבוז
    const current = () => {
      const cs = getComputedStyle(document.documentElement);
      return `${cs.getPropertyValue('--theme-icon-image')}|${cs.getPropertyValue('--theme-icon')}`;
    };
    let last = current();
    const obs = new MutationObserver(() => {
      const now = current();
      if (now !== last) { last = now; setThemeKey((k) => k + 1); }
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    let gone = false, stage = null, view = null, built = null;
    const t = setTimeout(async () => {
      const [st, src] = await Promise.all([getStage(), crestTextureSource(loadImage)]);
      if (gone || !st || !src || !canvasRef.current) { if (!gone) setIs3d(false); return; }
      stage = st;
      const { THREE } = st;
      const scene = new THREE.Scene();
      scene.add(new THREE.AmbientLight(0xffffff, 1.6));
      const key = new THREE.DirectionalLight(0xffffff, 2.2);
      key.position.set(30, 40, 80);
      scene.add(key);
      const rim = new THREE.DirectionalLight(0xffffff, 1.2);
      rim.position.set(-60, 10, -30);
      scene.add(rim);
      built = buildCrest(THREE, src.image);
      scene.add(built.group);
      const box = canvasRef.current.getBoundingClientRect();
      const size = Math.max(40, Math.round(box.width || 96));
      const camera = new THREE.PerspectiveCamera(30, 1, 1, 1000);
      const span = Math.max(built.size.W, built.size.H) * 1.15;
      camera.position.set(0, 0, span / 2 / Math.tan((15 * Math.PI) / 180));
      const start = performance.now();
      view = {
        canvas: canvasRef.current, width: size, height: size, scene, camera,
        minInterval: 33, // 30 מסגרות בשנייה מספיקות לסיבוב איטי, וחוסכות סוללה
        frame(now) {
          built.group.rotation.y = (((now - start) / 1000) / SPIN_SECONDS) * Math.PI * 2;
          return true;
        }
      };
      stage.add(view);
      requestAnimationFrame(() => requestAnimationFrame(() => !gone && setIs3d(true)));
    }, 400); // אחרי שהמסך הראשון צויר
    return () => {
      gone = true;
      clearTimeout(t);
      if (stage && view) stage.remove(view);
      if (built) built.dispose();
      setIs3d(false);
    };
  }, [themeKey]);

  return (
    <div className={`header-crest${is3d ? ' is-3d' : ''}`} aria-hidden="true">
      {CREST_LAYERS.map(({ z, cls }, i) => (
        <span key={i} className={`header-crest__layer ${cls}`} style={{ '--z': `${z}px` }} />
      ))}
      <canvas ref={canvasRef} className="header-crest__gl" />
    </div>
  );
}

// דשא ברקע (מצב יום) וזרקורים על כל המסך. בראש העטיפה של המסך
export function StadiumBackdrop() {
  return (
    <>
      <div className="pitch-stripes" aria-hidden="true" />
      <div className="stadium-lights" aria-hidden="true">
        <span className="stadium-beam stadium-beam--a" />
        <span className="stadium-beam stadium-beam--b" />
      </div>
    </>
  );
}
