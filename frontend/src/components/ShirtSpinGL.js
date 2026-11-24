import React, { useEffect, useRef } from 'react';
import { getStage } from '../three/stage';
import { shirtCanvases, buildShirt, addShirtLights, shirtCamera } from '../three/shirt';

// סיבוב תלת-ממדי של חולצה בלחיצה (0.8 שניות), על הבמה המשותפת
// (three/stage.js). עד שהמסגרת הראשונה צוירה מוצגת החולצה השטוחה, ו-onReady
// מודיע מתי להסתיר אותה. אחרי הסיבוב הכל משוחרר.

const DUR = 800;
const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

export default function ShirtSpinGL({ svgEl, crestSrc, size, onReady }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    let gone = false;
    let view = null, shirt = null, stage = null;
    (async () => {
      const [st, tex] = await Promise.all([getStage(), shirtCanvases(svgEl, crestSrc)]);
      if (gone || !st || !tex || !canvasRef.current) return;
      stage = st;
      const { THREE } = st;
      const scene = new THREE.Scene();
      addShirtLights(THREE, scene);
      shirt = buildShirt(THREE, tex);
      scene.add(shirt.group);
      const w = size * 1.6, h = size * 1.6 * 0.92;
      const start = performance.now();
      let first = true;
      view = {
        canvas: canvasRef.current, width: w, height: h, scene, camera: shirtCamera(THREE, w / h),
        frame(now) {
          const p = Math.min(1, (now - start) / DUR);
          shirt.group.rotation.y = ease(p) * Math.PI * 2;
          if (first) { first = false; requestAnimationFrame(() => !gone && onReady && onReady()); }
          return p < 1;
        }
      };
      stage.add(view);
    })();
    return () => {
      gone = true;
      if (stage && view) stage.remove(view);
      if (shirt) shirt.dispose();
    };
  }, [svgEl, crestSrc, size, onReady]);

  return (
    <canvas ref={canvasRef} aria-hidden="true" className="shirt-flip" style={{
      position: 'absolute', left: '50%', top: '50%', width: size * 1.6, height: size * 1.6 * 0.92,
      transform: 'translate(-50%, -50%)', pointerEvents: 'none'
    }} />
  );
}
