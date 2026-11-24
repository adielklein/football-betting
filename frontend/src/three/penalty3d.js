// השחקנים של משחק הבעיטות בתלת-ממד: השוער (גוף עם נפח מאיברים) והכדור.
//
// כל ההחלטות והתנועה נשארות בדיוק כמו שהן: התנוחות מ-services/penalty.js
// (POSE/blendPose), מיקום הכדור והשוער מ-goalScene. כאן רק הציור. כל שחקן
// מצויר לקנבס קטן בדיוק בזווית המצלמה של הסצנה (אותו מוקד ואותה נקודת
// מרכז), והסצנה מניחה אותו בציור הדו-ממדי במקום הציור השטוח - כך הוא
// נשאר בסדר הנכון מול הקורות והרשת, ורעידות המצלמה והתאורה חלות עליו.

import { getStage } from './stage';

const KEEPER_Z = 0.35;
const BALL_R = 0.11;
const JERSEY = 0xc6ec2e, SHORTS = 0x15171c, SKIN = 0xc98d68, BOOT = 0x0d0f14, GLOVE = 0xf2f4f7, CUFF = 0xff7a1a, HAIR = 0x1a120a;

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

  // ===== שוער: איברים כקפסולות שמתעדכנות לפי התנוחה =====
  const kScene = new THREE.Scene();
  const kLight = makeLights(kScene);
  const rig = new THREE.Group();
  kScene.add(rig);
  const mat = (color, rough = 0.75) => track(new THREE.MeshStandardMaterial({ color, roughness: rough }));
  const M = { jersey: mat(JERSEY), jerseyD: mat(0x97b81c), shorts: mat(SHORTS), skin: mat(SKIN, 0.6), boot: mat(BOOT, 0.5), glove: mat(GLOVE, 0.55), cuff: mat(CUFF), hair: mat(HAIR) };
  const unitCapsule = track(new THREE.CapsuleGeometry(0.5, 1, 6, 12)); // גובה כולל 2, רדיוס 0.5
  const limbs = [];
  // a, b: פונקציות שמחזירות נקודה [x, y] במערכת של השוער; r: רדיוס; z: עומק
  const limb = (m, r, z, a, b) => {
    const mesh = new THREE.Mesh(unitCapsule, m);
    rig.add(mesh);
    limbs.push({ mesh, r, z, a, b });
  };
  const mid = (p, q, f = 0.5) => [p[0] + (q[0] - p[0]) * f, p[1] + (q[1] - p[1]) * f];
  for (const [side, kk, ff, z] of [[-1, 'kl', 'fl', -0.07], [1, 'kr', 'fr', 0.07]]) {
    const hip = () => [side * 0.1, -0.03];
    limb(M.shorts, 0.1, z, hip, (P) => mid(hip(), P[kk], 0.55));
    limb(M.skin, 0.065, z, (P) => mid(hip(), P[kk], 0.5), (P) => P[kk]);
    limb(M.jersey, 0.055, z, (P) => P[kk], (P) => P[ff]);
    limb(M.boot, 0.045, z + 0.02, (P) => P[ff], (P) => [P[ff][0] + side * 0.13, P[ff][1] - 0.03]);
  }
  // גוף
  limb(M.jersey, 0.19, 0, () => [0, 0.08], (P) => [0, P.sh - 0.12]);
  limb(M.jersey, 0.17, 0, (P) => [-0.12, P.sh - 0.06], (P) => [0.12, P.sh - 0.06]);
  for (const [side, ee, hh, z] of [[-1, 'el', 'hl', -0.09], [1, 'er', 'hr', 0.09]]) {
    const sh = (P) => [side * 0.21, P.sh - 0.03];
    limb(M.jersey, 0.06, z, sh, (P) => P[ee]);
    limb(M.jersey, 0.05, z, (P) => P[ee], (P) => P[hh]);
    limb(M.cuff, 0.055, z, (P) => mid(P[ee], P[hh], 0.85), (P) => P[hh]);
    limb(M.glove, 0.075, z + 0.01, (P) => P[hh], (P) => [P[hh][0] + (P[hh][0] - P[ee][0]) * 0.55, P[hh][1] + (P[hh][1] - P[ee][1]) * 0.55]);
  }
  limb(M.skin, 0.045, 0, (P) => [0, P.sh - 0.02], (P) => [P.head[0] * 0.6, P.head[1] - 0.1]);
  const head = new THREE.Mesh(track(new THREE.SphereGeometry(0.11, 20, 14)), M.skin);
  const hair = new THREE.Mesh(track(new THREE.SphereGeometry(0.115, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.55)), M.hair);
  rig.add(head, hair);

  const up = new THREE.Vector3(0, 1, 0);
  const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3(), dir = new THREE.Vector3();
  const poseRig = (k) => {
    const P = k.pose;
    for (const L of limbs) {
      const a = L.a(P), b = L.b(P);
      tmpA.set(a[0], a[1], L.z); tmpB.set(b[0], b[1], L.z);
      dir.subVectors(tmpB, tmpA);
      const len = Math.max(0.001, dir.length());
      L.mesh.position.addVectors(tmpA, tmpB).multiplyScalar(0.5);
      L.mesh.quaternion.setFromUnitVectors(up, dir.normalize());
      // קפסולת היחידה: גליל באורך 1 ושני חצאי כדור ברדיוס 0.5. האורך נמתח
      // לאורך האיבר, הרוחב לפי העובי שלו
      L.mesh.scale.set(L.r * 2, len, L.r * 2);
    }
    head.position.set(P.head[0], P.head[1], 0);
    hair.position.copy(head.position);
    hair.rotation.z = 0;
    rig.position.set(k.x, k.y, KEEPER_Z);
    rig.rotation.set(0, 0, k.rot);
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

  const kCanvas = document.createElement('canvas');
  const bCanvas = document.createElement('canvas');
  const render = (scene, canvas, P, box) => {
    const w = Math.max(2, Math.ceil(box.x1 - box.x0)), h = Math.max(2, Math.ceil(box.y1 - box.y0));
    aimCamera(P, box.x0, box.y0, box.x0 + w, box.y0 + h);
    stage.renderNow({ canvas, width: w, height: h, scene, camera });
    return { canvas, x: box.x0, y: box.y0, w, h };
  };

  return {
    // k: keeperState() של הסצנה; P: { F, CX, Y0, CAM }
    keeper(k, light, P) {
      poseRig(k);
      kLight(light);
      const root = proj(P, k.x, k.y, KEEPER_Z);
      if (!root) return null;
      const R = 1.7 * root.s; // מספיק לכל תנוחה, כולל צלילה מלאה
      return render(kScene, kCanvas, P, { x0: root.x - R, y0: root.y - R, x1: root.x + R, y1: root.y + R * 1.1 });
    },
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
