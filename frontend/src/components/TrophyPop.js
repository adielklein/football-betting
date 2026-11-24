import { getStage, getEnvironment } from '../three/stage';
import { buildTrophy } from '../three/trophy';

// "בול!": גביע זהב תלת-ממדי שקופץ מתוך התג, עולה ומסתובב ונעלם. שכבה צפה
// זמנית מעל המסך (לא חוסמת לחיצות), שנמחקת בסוף. בלי WebGL, או אצל מי
// שביקש פחות תנועה - לא קורה כלום (הקונפטי והחותמת נשארים).
const DUR = 1900;
const W = 110, H = 130;

export async function trophyFrom(el) {
  if (!el) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const stage = await getStage();
  if (!stage) return;
  const env = await getEnvironment(stage);
  const r = el.getBoundingClientRect();
  const canvas = document.createElement('canvas');
  Object.assign(canvas.style, {
    position: 'fixed', left: `${r.left + r.width / 2 - W / 2}px`, top: `${r.top + r.height / 2 - H + 14}px`,
    width: `${W}px`, height: `${H}px`, pointerEvents: 'none', zIndex: 12000
  });
  document.body.appendChild(canvas);

  const { THREE } = stage;
  const scene = new THREE.Scene();
  scene.add(new THREE.AmbientLight(0xffffff, 0.7));
  const key = new THREE.DirectionalLight(0xffffff, 2);
  key.position.set(10, 20, 25);
  scene.add(key);
  const trophy = buildTrophy(THREE, env);
  scene.add(trophy.group);
  const camera = new THREE.PerspectiveCamera(30, W / H, 1, 300);
  camera.position.set(0, 2, 44);
  camera.lookAt(0, 1, 0);

  const start = performance.now();
  const view = {
    canvas, width: W, height: H, scene, camera,
    frame(now) {
      const t = Math.min(1, (now - start) / DUR);
      // קפיצה: גדל מהר עם קפיץ קטן, עולה, מסתובב פעמיים, ונעלם ברבע האחרון
      const pop = t < 0.25 ? (t / 0.25) * 1.15 : t < 0.35 ? 1.15 - ((t - 0.25) / 0.1) * 0.15 : 1;
      trophy.group.scale.setScalar(Math.max(0.01, pop));
      trophy.group.rotation.y = t * Math.PI * 4;
      trophy.group.position.y = -4 + t * 7;
      canvas.style.opacity = String(t < 0.75 ? 1 : 1 - (t - 0.75) / 0.25);
      if (t >= 1) {
        setTimeout(() => { stage.remove(view); trophy.dispose(); canvas.remove(); }, 0);
        return false;
      }
      return true;
    }
  };
  stage.add(view);
}
