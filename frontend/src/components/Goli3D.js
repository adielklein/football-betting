import React, { useEffect, useRef, useState } from 'react';
import TourMascot from './TourMascot';
import { getStage, getEnvironment } from '../three/stage';
import { buildGoli, addGoliLights } from '../three/goli';

// גולי בתלת-ממד (three/goli.js). עד שהבמה מוכנה, ובלי WebGL בכלל, מוצג
// גולי הדו-ממדי (TourMascot) - אותה דמות, בלי שהחלון יחכה.
//
// תנועה:
//   idle      - קפיצה רכה עם כיווץ בנחיתה, מצמוץ מדי פעם, ראש פונה אל
//               האלמנט המואר (lookX/lookY) והאישונים איתו
//   דיבור     - בכל שלב חדש (stepKey) הפה נפתח ונסגר בקצב של הברות, והראש
//               מהנהן ומטה איתו - כמו דמות שמדברת באמת
//   wave      - קפיצות שלום עם הטיה לצדדים (שלב הפתיחה)
//   celebrate - קפיצה וסיבוב מלא, שוב ושוב (שלב הסיום)
//   sleep     - עיניים עצומות, נשימה איטית, ראש מוטה ו-Zzz (מסכים ריקים)
//   sad       - פה עצוב, ראש מורכן, קפיצה כבדה (אין חיבור, תקלה)
//   loading   - ג'אגלינג: שני כדרורים וסלטה קדימה, שוב ושוב (טעינה)
// talk=false - בלי "דיבור" בכניסה (למשל כשהוא ישן).
// מצויר רק כשהוא באמת על המסך (לשונית מוסתרת, גלילה) - לא מבזבז סוללה.

const TALK_MS = 1900;

export default function Goli3D({ mood = 'idle', stepKey, lookX = 0, lookY = 0, size = 66, still = false, talk = true }) {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const visibleRef = useRef(true);
  const wakeRef = useRef(() => {});
  const [ready, setReady] = useState(false);
  const props = useRef({});
  props.current = { mood, lookX, lookY, still };
  const talkUntil = useRef(0);
  const moodSince = useRef(0);

  useEffect(() => { if (talk && mood !== 'sleep') talkUntil.current = performance.now() + TALK_MS; }, [stepKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // מצויר רק כשנראה: לשונית מוסתרת (display:none) או מחוץ למסך - עוצר
  useEffect(() => {
    if (!wrapRef.current || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(([e]) => {
      const was = visibleRef.current;
      visibleRef.current = e.isIntersecting;
      if (!was && e.isIntersecting) wakeRef.current();
    });
    io.observe(wrapRef.current);
    return () => io.disconnect();
  }, []);
  useEffect(() => { moodSince.current = performance.now(); }, [mood, stepKey]);

  useEffect(() => {
    if (still) return undefined;
    let gone = false, stage = null, view = null, goli = null;
    (async () => {
      const st = await getStage();
      if (gone || !st || !canvasRef.current) return;
      stage = st;
      const { THREE } = st;
      const scene = new THREE.Scene();
      addGoliLights(THREE, scene);
      getEnvironment(st).then((env) => { if (env && !gone) { scene.environment = env; scene.environmentIntensity = 0.35; } }).catch(() => {});
      goli = buildGoli(THREE);
      scene.add(goli.root, goli.shadow);
      const w = size, h = size * 1.15;
      const camera = new THREE.PerspectiveCamera(30, w / h, 0.1, 50);
      camera.position.set(0, 0.25, 6.6);
      camera.lookAt(0, -0.05, 0);

      const look = { x: 0, y: 0 };
      let nextBlink = performance.now() + 1500;
      view = {
        canvas: canvasRef.current, width: w, height: h, scene, camera,
        frame(now) {
          const p = props.current;
          const t = now / 1000;
          const since = (now - moodSince.current) / 1000;

          // מבט: הראש מסתובב בעדינות אל המטרה, האישונים עוד קצת
          look.x += (p.lookX - look.x) * 0.08;
          look.y += (p.lookY - look.y) * 0.08;

          // דיבור: פתיחת פה בקצב הברות לא אחיד, שדועך בסוף המשפט
          const talking = now < talkUntil.current;
          let o = 0;
          if (talking) {
            const left = (talkUntil.current - now) / TALK_MS;
            const syl = Math.max(0, Math.sin(t * 17 + Math.sin(t * 4.3) * 1.7));
            o = Math.pow(syl, 0.6) * (0.55 + 0.45 * Math.sin(t * 3.3)) * Math.min(1, left * 4);
          }

          // קפיצה בסיסית, כיווץ בנחיתה
          let y = 0, sx = 1, sy = 1, rz = 0, rx = 0, ry = 0;
          const sleeping = p.mood === 'sleep';
          let loadExcite = 0, loadLookUp = 0;
          const sad = p.mood === 'sad';
          if (sleeping) {
            // נשימה איטית במקום קפיצה, ראש מוטה הצידה
            const br = Math.sin(t * 1.4);
            sx = 1 + br * 0.025; sy = 1 - br * 0.02;
            rz = 0.2; rx = 0.12;
          } else if (p.mood === 'loading') {
            // קטע ג'אגלינג במחזור של 2 שניות: שני כדרורים קטנים, ואז קפיצה
            // גדולה עם סלטה קדימה ונחיתה מתכווצת. העיניים למעלה, פה פתוח בסלטה
            const c = (t % 2) / 2;
            let k, hgt;
            if (c < 0.5) { k = (c % 0.25) / 0.25; hgt = 0.28; }
            else { k = (c - 0.5) / 0.5; hgt = 0.62; rx = -k * Math.PI * 2; }
            y = Math.sin(k * Math.PI) * hgt;
            const sq = k < 0.1 ? 1 - k / 0.1 : k > 0.9 ? (k - 0.9) / 0.1 : 0;
            sx = 1 + sq * 0.13; sy = 1 - sq * 0.16;
            if (c >= 0.5) { loadExcite = Math.sin(k * Math.PI); loadLookUp = 0.7; }
            else loadLookUp = 0.35;
          } else {
            const bob = Math.sin(t * (sad ? 1.6 : 2.6));
            y = (bob * 0.5 + 0.5) * (sad ? 0.05 : 0.12);
            const land = Math.max(0, -bob) ** 3;
            sx = 1 + land * 0.06; sy = 1 - land * 0.07;
            if (sad) { rx = 0.22; rz = Math.sin(t * 0.9) * 0.05; }
          }
          view.minInterval = sleeping ? 66 : 0; // ישן = 15 פריימים בשנייה מספיקים

          if (talking) {
            // הנהון עם כל הברה והטיה צדדית איטית
            rx += -o * 0.16;
            rz += Math.sin(t * 5.2) * 0.1;
            y += o * 0.07;
            sx += o * 0.025; sy -= o * 0.03;
          }

          if (p.mood === 'wave' && since < 3) {
            const k = (since % 1) * Math.PI * 2;
            y += Math.abs(Math.sin(k)) * 0.35;
            rz += Math.sin(k) * 0.28;
          }
          if (p.mood === 'celebrate') {
            const c = since % 2.4;
            if (c < 1.1) {
              const k = c / 1.1;
              y += Math.sin(k * Math.PI) * 0.9;
              ry += k * Math.PI * 2;
              const sq = k > 0.85 ? (k - 0.85) / 0.15 : 0;
              sx += sq * 0.1; sy -= sq * 0.12;
            }
          }

          goli.root.position.y = y;
          goli.root.scale.set(sx, sy, sx);
          goli.head.rotation.set(rx + -look.y * 0.28, ry + look.x * 0.45, rz);
          // הצל קטן ובהיר כשהוא באוויר
          const air = Math.min(1, y / 0.9);
          goli.shadow.scale.setScalar(1 - air * 0.45);
          goli.shadow.material.opacity = 0.22 * (1 - air * 0.6);

          // אישונים
          for (const e of goli.eyes) e.pupil.position.set(look.x * 0.06, -look.y * 0.05 + loadLookUp * 0.06, 0);
          // מצמוץ (ישן = עיניים עצומות)
          let blink = 1;
          if (sleeping) blink = 0.08;
          else if (now > nextBlink) {
            const b = (now - nextBlink) / 140;
            blink = b < 1 ? Math.abs(1 - 2 * b) * 0.9 + 0.1 : 1;
            if (b >= 1) nextBlink = now + 2600 + Math.random() * 2400;
          }
          for (const e of goli.eyes) e.g.scale.y = blink;

          // פה
          if (loadExcite > o) o = loadExcite * 0.7; // "וואו" באמצע הסלטה
          goli.open.visible = (talking || loadExcite > 0) && o > 0.04;
          goli.open.scale.set(0.85 + o * 0.25, 0.15 + o * 0.95, 1);
          goli.smile.visible = !goli.open.visible;
          goli.smile.scale.setScalar(p.mood === 'celebrate' ? 1.25 : sleeping ? 0.6 : 1);
          // עצוב: הקשת הפוכה (פה למטה)
          goli.smile.rotation.z = sad ? 0 : Math.PI;
          goli.smile.position.y = sad ? -0.08 : 0.06;
          return visibleRef.current; // מחוץ למסך - נעצר עד שיחזור (wakeRef)
        }
      };
      stage.add(view);
      wakeRef.current = () => stage.wake(view);
      setReady(true);
    })();
    return () => {
      gone = true;
      if (stage && view) stage.remove(view);
      if (goli) goli.dispose();
    };
  }, [size, still]);

  return (
    <span ref={wrapRef} style={{ position: 'relative', display: 'inline-block', width: size, height: size * 1.15 }}>
      {!ready && <TourMascot mood={mood} stepKey={stepKey} lookX={lookX} lookY={lookY} size={size} still={still} talk={talk} />}
      {mood === 'sleep' && !still && (
        <span aria-hidden="true" style={{ position: 'absolute', top: -size * 0.08, left: size * 0.72, pointerEvents: 'none', zIndex: 1 }}>
          <style>{'@keyframes goli-z { 0% { transform: translate(0,0) scale(.6); opacity: 0 } 25% { opacity: 1 } 100% { transform: translate(10px,-22px) scale(1.1); opacity: 0 } }'}</style>
          {[0, 1, 2].map((i) => (
            <span key={i} style={{
              position: 'absolute', left: i * 6, top: 0, fontWeight: 900, color: 'var(--text-3, #7a828e)',
              fontSize: Math.round(size * 0.18) + i * 2, animation: `goli-z 2.4s ease-out ${i * 0.8}s infinite`
            }}>z</span>
          ))}
        </span>
      )}
      {!still && (
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: ready ? 1 : 0 }}
        />
      )}
    </span>
  );
}
