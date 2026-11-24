// הכדור של משחק הבעיטות בתלת-ממד. (השוער נשאר בציור הדו-ממדי שלו - גרסה
// תלת-ממדית מקפסולות נוסתה ונראתה רע.)
//
// כל ההחלטות והתנועה נשארות בדיוק כמו שהן: התנוחות מ-services/penalty.js
// (POSE/blendPose), מיקום הכדור והשוער מ-goalScene. כאן רק הציור. כל שחקן
// מצויר לקנבס קטן בדיוק בזווית המצלמה של הסצנה (אותו מוקד ואותה נקודת
// מרכז), והסצנה מניחה אותו בציור הדו-ממדי במקום הציור השטוח - כך הוא
// נשאר בסדר הנכון מול הקורות והרשת, ורעידות המצלמה והתאורה חלות עליו.

import { getStage } from './stage';

const BALL_R = 0.11;

const ballTexture = () => {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#eef1f5';
  ctx.fillRect(0, 0, 512, 256);
  ctx.fillStyle = '#1b1d22';
  // טלאים במיפוי כדורי (מקורב): שורות מחומשים מוזזות
  const rows = [[64, 6, 0], [128, 6, 42], [192, 6, 0]];
  for (const [y, n, off] of rows) {
    for (let i = 0; i < n; i++) {
      const x = off + i * (512 / n) + 40;
      ctx.beginPath();
      for (let q = 0; q < 5; q++) {
        const a = (-90 + q * 72) * Math.PI / 180;
        ctx[q ? 'lineTo' : 'moveTo'](x + 26 * Math.cos(a), y + 22 * Math.sin(a));
      }
      ctx.fill();
    }
  }
  ctx.fillRect(0, 0, 512, 14);
  ctx.fillRect(0, 242, 512, 14);
  return c;
};

export async function createPenalty3D() {
  const stage = await getStage();
  if (!stage) return null;
  const { THREE } = stage;
  const disposers = [];
  const track = (x) => { disposers.push(() => x.dispose()); return x; };

  // ===== תאורה משותפת (עוצמה לפי "light" של הסצנה - הזרקורים נדלקים) =====
  const makeLights = (scene) => {
    const amb = new THREE.AmbientLight(0xffffff, 0.8);
    const keyL = new THREE.DirectionalLight(0xfff6e6, 1.5);
    keyL.position.set(-6, 9, 8);
    const keyR = new THREE.DirectionalLight(0xe6eeff, 1.2);
    keyR.position.set(6, 9, 8);
    scene.add(amb, keyL, keyR);
    return (light) => { amb.intensity = 0.35 + 0.55 * light; keyL.intensity = 0.4 + 1.3 * light; keyR.intensity = 0.3 + 1.1 * light; };
  };

  // ===== כדור =====
  const bScene = new THREE.Scene();
  const bLight = makeLights(bScene);
  const ballTex = track(new THREE.CanvasTexture(ballTexture()));
  ballTex.colorSpace = THREE.SRGBColorSpace;
  const ball = new THREE.Mesh(track(new THREE.SphereGeometry(BALL_R, 28, 18)), track(new THREE.MeshStandardMaterial({ map: ballTex, roughness: 0.45 })));
  bScene.add(ball);

  // ===== מצלמה חלקית: רק המלבן שבו השחקן נמצא, באותה הקרנה של הסצנה =====
  const camera = new THREE.PerspectiveCamera();
  const NEAR = 0.05, FAR = 60;
  const aimCamera = (P, x0, y0, x1, y1) => {
    camera.position.set(P.CAM.x, P.CAM.y, P.CAM.z);
    camera.rotation.set(0, 0, 0);
    camera.updateMatrixWorld();
    const l = ((x0 - P.CX) / P.F) * NEAR, r = ((x1 - P.CX) / P.F) * NEAR;
    const t = ((P.Y0 - y0) / P.F) * NEAR, b = ((P.Y0 - y1) / P.F) * NEAR;
    camera.projectionMatrix.makePerspective(l, r, t, b, NEAR, FAR);
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
  };
  const proj = (P, x, y, z) => {
    const d = P.CAM.z - z;
    if (d < 0.05) return null;
    const s = P.F / d;
    return { x: P.CX + (x - P.CAM.x) * s, y: P.Y0 - (y - P.CAM.y) * s, s };
  };

    const bCanvas = document.createElement('canvas');
  const render = (scene, canvas, P, box) => {
    const w = Math.max(2, Math.ceil(box.x1 - box.x0)), h = Math.max(2, Math.ceil(box.y1 - box.y0));
    aimCamera(P, box.x0, box.y0, box.x0 + w, box.y0 + h);
    stage.renderNow({ canvas, width: w, height: h, scene, camera });
    return { canvas, x: box.x0, y: box.y0, w, h };
  };

  return {
    ball(pos, spin, light, P) {
      ball.position.set(pos.x, pos.y, pos.z);
      ball.rotation.set(spin, spin * 0.37, 0);
      bLight(light);
      const p = proj(P, pos.x, pos.y, pos.z);
      if (!p) return null;
      const R = BALL_R * p.s * 1.4 + 2;
      return render(bScene, bCanvas, P, { x0: p.x - R, y0: p.y - R, x1: p.x + R, y1: p.y + R });
    },
    dispose() { disposers.forEach((d) => d()); },
  };
}
