import React, { useEffect, useRef } from 'react';
import TeamShirt from './TeamShirt';
import { getStage } from '../three/stage';
import { shirtCanvases, buildShirt, addShirtLights, shirtCamera } from '../three/shirt';

// חולצה תלת-ממדית שמסובבים באצבע (חלון הנתונים). כשלא נוגעים בה היא
// מסתובבת לאט לבד; גרירה לצדדים מסובבת אותה, ושחרור ממשיך עם תנופה שדועכת.
// גרירה למעלה-למטה נשארת גלילה רגילה של החלון (touch-action: pan-y).
//
// המקור לטקסטורה הוא TeamShirt שטוח ומוסתר שמצויר לידה. אם אין WebGL, או
// שהבמה עוד לא מוכנה, מוצגת החולצה השטוחה עצמה.

const AUTO = 0.5;       // רדיאנים לשנייה כשלא נוגעים
const DRAG = 0.014;     // רדיאנים לפיקסל גרירה
const FRICTION = 0.92;  // דעיכת התנופה לכל מסגרת

export default function ShirtViewer3D({ shirt, crestSrc, size = 96 }) {
  const flatRef = useRef(null);
  const canvasRef = useRef(null);
  const state = useRef({ ready: false, angle: -0.35, vel: 0, dragging: false, lastX: 0, lastT: 0, idleAt: 0 });
  const [ready, setReady] = React.useState(false);

  useEffect(() => {
    let gone = false, stage = null, view = null, built = null;
    (async () => {
      const svgEl = flatRef.current && flatRef.current.querySelector('svg');
      const [st, tex] = await Promise.all([getStage(), shirtCanvases(svgEl, crestSrc)]);
      if (gone || !st || !tex || !canvasRef.current) return;
      stage = st;
      const { THREE } = st;
      const scene = new THREE.Scene();
      addShirtLights(THREE, scene);
      built = buildShirt(THREE, tex);
      scene.add(built.group);
      const w = size * 1.3, h = size * 1.3 * 0.92;
      let last = performance.now();
      const s = state.current;
      view = {
        canvas: canvasRef.current, width: w, height: h, scene, camera: shirtCamera(THREE, w / h, 1.3),
        frame(now) {
          const dt = Math.min(0.05, (now - last) / 1000);
          last = now;
          if (!s.dragging) {
            if (Math.abs(s.vel) > 0.02) { s.angle += s.vel * dt; s.vel *= FRICTION; s.idleAt = now; }
            else if (now - s.idleAt > 1200) s.angle += AUTO * dt;
          }
          built.group.rotation.y = s.angle;
          built.group.rotation.x = 0.06;
          return true; // החלון פתוח לזמן קצר - מצויר כל הזמן, ומשוחרר בסגירה
        }
      };
      stage.add(view);
      setReady(true);
    })();
    return () => {
      gone = true;
      if (stage && view) stage.remove(view);
      if (built) built.dispose();
    };
  }, [crestSrc, size]);

  const s = state.current;
  const onDown = (e) => {
    e.stopPropagation();
    s.dragging = true; s.lastX = e.clientX; s.lastT = performance.now(); s.vel = 0;
    e.currentTarget.setPointerCapture && e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e) => {
    if (!s.dragging) return;
    const now = performance.now();
    const dx = e.clientX - s.lastX;
    s.angle += dx * DRAG;
    s.vel = (dx * DRAG) / Math.max(0.008, (now - s.lastT) / 1000);
    s.lastX = e.clientX; s.lastT = now; s.idleAt = now;
  };
  const onUp = () => { s.dragging = false; s.idleAt = performance.now(); };

  return (
    <span style={{ position: 'relative', display: 'inline-block', width: size * 1.3, height: size * 1.3 * 0.92 }}>
      <span ref={flatRef} style={{
        position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
        // opacity ולא visibility: החולצה השטוחה קובעת visibility: visible לעצמה,
        // וזה גבר על hidden של ההורה - והיא נשארה מאחורי התלת-ממדית
        opacity: ready ? 0 : 1, pointerEvents: 'none', lineHeight: 0
      }}>
        <TeamShirt {...shirt} size={size} />
      </span>
      <canvas
        ref={canvasRef}
        aria-label="אפשר לסובב את החולצה בגרירה"
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
        onClick={(e) => e.stopPropagation()}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', touchAction: 'pan-y', cursor: 'grab' }}
      />
    </span>
  );
}
