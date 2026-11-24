// שער תלת-ממדי ל"כל ההימורים הוזנו": דשא, קורות, רשת שנמתחת סביב נקודת
// הפגיעה, וכדור שמסתובב בטיסה, פוגע ברשת, נופל ומקפץ. פעם אחת (DUR).

export const GOAL_DUR = 1800;

const ballCanvas = () => {
  // טקסטורה פשוטה של כדור: לבן עם טלאים שחורים פזורים (מיפוי כדורי)
  const c = document.createElement('canvas');
  c.width = 256; c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#f4f4f4';
  ctx.fillRect(0, 0, 256, 128);
  ctx.fillStyle = '#1d1f24';
  const spots = [[32, 64], [96, 30], [96, 98], [160, 64], [224, 30], [224, 98], [0, 20], [256, 108], [128, 0], [128, 128]];
  for (const [x, y] of spots) {
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = (-90 + i * 72) * Math.PI / 180;
      ctx[i ? 'lineTo' : 'moveTo'](x + 14 * Math.cos(a), y + 12 * Math.sin(a));
    }
    ctx.fill();
  }
  return c;
};

const netCanvas = () => {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 3;
  for (let i = 0; i <= 128; i += 16) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 128); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(128, i); ctx.stroke();
  }
  return c;
};

const grassCanvas = () => {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 64;
  const ctx = c.getContext('2d');
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = i % 2 ? '#5c9e3c' : '#6bb047';
    ctx.fillRect(i * 32, 0, 32, 64);
  }
  return c;
};

export const buildGoal = (THREE) => {
  const disposers = [];
  const track = (x) => { disposers.push(() => x.dispose()); return x; };
  const W = 6, H = 2.3, D = 1.7;
  const group = new THREE.Group();

  // דשא
  const grassTex = track(new THREE.CanvasTexture(grassCanvas()));
  grassTex.colorSpace = THREE.SRGBColorSpace;
  grassTex.wrapS = grassTex.wrapT = THREE.RepeatWrapping;
  grassTex.repeat.set(2, 3);
  const grass = new THREE.Mesh(track(new THREE.PlaneGeometry(16, 12)), track(new THREE.MeshStandardMaterial({ map: grassTex, roughness: 1 })));
  grass.rotation.x = -Math.PI / 2;
  grass.position.set(0, 0, 2);
  group.add(grass);

  // קורות
  const postMat = track(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 }));
  const postGeo = track(new THREE.CylinderGeometry(0.07, 0.07, H, 12));
  for (const x of [-W / 2, W / 2]) {
    const p = new THREE.Mesh(postGeo, postMat);
    p.position.set(x, H / 2, 0);
    group.add(p);
  }
  const bar = new THREE.Mesh(track(new THREE.CylinderGeometry(0.07, 0.07, W + 0.14, 12)), postMat);
  bar.rotation.z = Math.PI / 2;
  bar.position.set(0, H, 0);
  group.add(bar);

  // רשתות מקווים אמיתיים (LineSegments) ולא טקסטורה: בגודל הזה טקסטורת רשת
  // התמזגה למשטח אפור. אחורית (נמתחת סביב הפגיעה), גג וצדדים
  const lineMat = track(new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75 }));
  // רשת של קווים על מלבן; to3d ממפה (u,v) בטווח 0..1 לנקודה במרחב
  const netLines = (nx, ny, to3d) => {
    const verts = [];
    const pt = (u, v) => to3d(u, v);
    for (let i = 0; i <= nx; i++) for (let j = 0; j < ny; j++) verts.push(...pt(i / nx, j / ny), ...pt(i / nx, (j + 1) / ny));
    for (let j = 0; j <= ny; j++) for (let i = 0; i < nx; i++) verts.push(...pt(i / nx, j / ny), ...pt((i + 1) / nx, j / ny));
    const g = track(new THREE.BufferGeometry());
    g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    return g;
  };
  const backGeo = netLines(18, 8, (u, v) => [-W / 2 + u * W, v * H, -D]);
  group.add(new THREE.LineSegments(backGeo, lineMat));
  const rest = Float32Array.from(backGeo.attributes.position.array);
  group.add(new THREE.LineSegments(netLines(18, 5, (u, v) => [-W / 2 + u * W, H, -v * D]), lineMat));
  for (const sx of [-W / 2, W / 2]) {
    group.add(new THREE.LineSegments(netLines(5, 8, (u, v) => [sx, v * H, -u * D]), lineMat));
  }

  // כדור
  const ballTex = track(new THREE.CanvasTexture(ballCanvas()));
  ballTex.colorSpace = THREE.SRGBColorSpace;
  const ball = new THREE.Mesh(track(new THREE.SphereGeometry(0.22, 24, 16)), track(new THREE.MeshStandardMaterial({ map: ballTex, roughness: 0.5 })));
  group.add(ball);
  const shadow = new THREE.Mesh(track(new THREE.CircleGeometry(0.24, 20)), track(new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3 })));
  shadow.rotation.x = -Math.PI / 2;
  group.add(shadow);

  const HIT = new THREE.Vector3(-0.9, 1.35, -D + 0.02);
  const START = new THREE.Vector3(3.2, 0.3, 7);
  const lerp = (a, b, t) => a + (b - a) * t;

  // t בין 0 ל-1 לאורך האנימציה
  const update = (t) => {
    const pos = new THREE.Vector3();
    let bulge = 0;
    if (t < 0.42) {
      // טיסה בקשת אל הרשת
      const u = t / 0.42;
      pos.set(lerp(START.x, HIT.x, u), lerp(START.y, HIT.y, u) + Math.sin(u * Math.PI) * 1.2, lerp(START.z, HIT.z, u));
    } else if (t < 0.55) {
      // נכנס לרשת ומותח אותה
      const u = (t - 0.42) / 0.13;
      bulge = Math.sin(u * Math.PI / 2) * 0.55;
      pos.set(HIT.x, HIT.y - u * 0.15, HIT.z - bulge);
    } else {
      // הרשת משחררת, הכדור נופל ומקפץ על הדשא בתוך השער
      const u = (t - 0.55) / 0.45;
      bulge = 0.55 * Math.max(0, 1 - u * 2.2) * Math.cos(u * 9);
      const yFloor = 0.22;
      const fall = Math.max(0, 1 - u * 1.8);
      const hop = Math.abs(Math.sin(Math.min(1, u * 1.8) * Math.PI * 1.5)) * (1 - Math.min(1, u * 1.8)) * 0.5;
      pos.set(HIT.x + u * 0.3, yFloor + (HIT.y - yFloor) * fall * fall + hop, HIT.z + 0.35 + u * 0.2);
    }
    ball.position.copy(pos);
    ball.rotation.x = -t * 14;
    ball.rotation.z = t * 4;
    shadow.position.set(pos.x, 0.01, pos.z);
    shadow.scale.setScalar(Math.max(0.4, 1.4 - pos.y * 0.4));
    // מתיחת הרשת האחורית סביב נקודת הפגיעה
    const arr = backGeo.attributes.position.array;
    for (let i = 0; i < arr.length; i += 3) {
      const x = rest[i], y = rest[i + 1];
      const d2 = (x - HIT.x) ** 2 + (y - HIT.y) ** 2;
      arr[i + 2] = rest[i + 2] - bulge * Math.exp(-d2 / 0.9);
    }
    backGeo.attributes.position.needsUpdate = true;
  };
  update(0);
  return { group, update, dispose: () => disposers.forEach((d) => d()) };
};
