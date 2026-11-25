// גולי בתלת-ממד: כדור כדורגל אמיתי (תבנית מחומשים ומשושים), עם פנים -
// עיניים בולטות שממצמצות ומסתכלות, פה שנפתח כשהוא מדבר, ולחיים.
// הראש כולו (כדור + פנים) זז יחד: מקפץ, מתכווץ בנחיתה, מטה את הראש
// ומהנהן עם ההברות כשהוא מדבר, ופונה לכיוון האלמנט המואר.
// משמש את components/Goli3D.js על הבמה המשותפת (three/stage.js).

let ballCanvas = null;
let hexCenters = null;

// תבנית הכדור: 12 מחומשים שחורים (קודקודי איקוסהדרון) ו-20 משושים לבנים
// (מרכזי הפאות שלו). כל פיקסל בטקסטורה הוא כיוון על הכדור, וצובעים לפי
// המרכז הקרוב (ורונוי) - זה בדיוק כדור הכדורגל הקלאסי. קו תפר דק בין אזורים
const makeBallCanvas = () => {
  if (ballCanvas) return ballCanvas;
  const t = (1 + Math.sqrt(5)) / 2;
  const ico = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]];
  const norm = (v) => { const l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; };
  const pent = ico.map(norm);
  const faces = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
  const hex = faces.map(([a, b, c]) => norm([pent[a][0] + pent[b][0] + pent[c][0], pent[a][1] + pent[b][1] + pent[c][1], pent[a][2] + pent[b][2] + pent[c][2]]));
  hexCenters = hex;
  const centers = [...pent.map((p) => ({ p, black: true })), ...hex.map((p) => ({ p, black: false }))];

  const W = 512, H = 256;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(W, H);
  for (let y = 0; y < H; y++) {
    const theta = ((y + 0.5) / H) * Math.PI;
    const st = Math.sin(theta), ct = Math.cos(theta);
    for (let x = 0; x < W; x++) {
      const phi = ((x + 0.5) / W) * Math.PI * 2;
      // אותה המרה כמו SphereGeometry של three
      const d = [-Math.cos(phi) * st, ct, Math.sin(phi) * st];
      let b1 = -2, b2 = -2, best = null;
      for (const cc of centers) {
        const dot = d[0] * cc.p[0] + d[1] * cc.p[1] + d[2] * cc.p[2];
        if (dot > b1) { b2 = b1; b1 = dot; best = cc; } else if (dot > b2) b2 = dot;
      }
      const seam = b1 - b2 < 0.012;
      const i = (y * W + x) * 4;
      const col = seam ? [70, 76, 86] : best.black ? [30, 34, 41] : [246, 247, 250];
      img.data[i] = col[0]; img.data[i + 1] = col[1]; img.data[i + 2] = col[2]; img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  ballCanvas = c;
  return c;
};

export const buildGoli = (THREE) => {
  const disposers = [];
  const track = (o) => { disposers.push(() => o.dispose && o.dispose()); return o; };

  const root = new THREE.Group();      // מיקום וקפיצה
  const head = new THREE.Group();      // סיבובים והטיות - הכדור והפנים יחד
  root.add(head);

  const tex = track(new THREE.CanvasTexture(makeBallCanvas()));
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const ball = new THREE.Mesh(track(new THREE.SphereGeometry(1, 64, 48)), track(new THREE.MeshStandardMaterial({ map: tex, roughness: 0.42, metalness: 0.02 })));
  // הפנים על משושה לבן: מסובבים את הכדור כך שמרכז משושה יושב בין העיניים
  // לפה. בלי זה עין נפלה על מחומש שחור והפנים לא נקראו
  const h = hexCenters[0];
  ball.quaternion.setFromUnitVectors(new THREE.Vector3(h[0], h[1], h[2]), new THREE.Vector3(0, -0.05, 1).normalize());
  head.add(ball);

  // נקודה על פני הכדור לפי זוויות (ימינה/למעלה) והנורמל שלה
  const onSurface = (ax, ay, r = 1) => {
    const v = new THREE.Vector3(Math.sin(ax) * Math.cos(ay), Math.sin(ay), Math.cos(ax) * Math.cos(ay));
    return { pos: v.clone().multiplyScalar(r), normal: v };
  };
  const face = (mesh, ax, ay, r) => {
    const { pos, normal } = onSurface(ax, ay, r);
    mesh.position.copy(pos);
    mesh.lookAt(pos.clone().add(normal));
    head.add(mesh);
    return mesh;
  };

  const white = track(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25 }));
  const black = track(new THREE.MeshStandardMaterial({ color: 0x151822, roughness: 0.2 }));
  const shine = track(new THREE.MeshBasicMaterial({ color: 0xffffff }));
  const pink = track(new THREE.MeshBasicMaterial({ color: 0xff8fa3, transparent: true, opacity: 0.55, depthWrite: false }));
  const mouthMat = track(new THREE.MeshStandardMaterial({ color: 0x7a2230, roughness: 0.6, side: THREE.DoubleSide }));
  const tongueMat = track(new THREE.MeshStandardMaterial({ color: 0xff7b93, roughness: 0.6 }));
  const lineMat = track(new THREE.MeshStandardMaterial({ color: 0x2b2f36, roughness: 0.6 }));

  // עיניים: גוף לבן שבולט מהכדור, אישון ונקודת ברק. העפעף = כיווץ אנכי
  const eyeGeo = track(new THREE.SphereGeometry(0.25, 24, 18));
  const pupilGeo = track(new THREE.SphereGeometry(0.13, 20, 14));
  const glintGeo = track(new THREE.SphereGeometry(0.045, 10, 8));
  // הפנים כולן בתוך המשושה הלבן: עיניים, לחיים ופה צמודים יחסית
  const eyes = [-0.29, 0.29].map((ax) => {
    const g = new THREE.Group();
    const { pos, normal } = onSurface(ax, 0.13, 0.9);
    g.position.copy(pos);
    g.lookAt(pos.clone().add(normal));
    const eye = new THREE.Mesh(eyeGeo, white);
    eye.scale.set(1, 1.18, 0.62);
    const pupil = new THREE.Group();
    const pm = new THREE.Mesh(pupilGeo, black);
    pm.scale.set(1, 1.1, 0.5);
    pm.position.z = 0.15;
    const glint = new THREE.Mesh(glintGeo, shine);
    glint.position.set(0.05, 0.06, 0.21);
    pupil.add(pm, glint);
    g.add(eye, pupil);
    head.add(g);
    return { g, pupil };
  });

  // לחיים
  const cheekGeo = track(new THREE.CircleGeometry(0.13, 20));
  [-0.44, 0.44].forEach((ax) => { const m = face(new THREE.Mesh(cheekGeo, pink), ax, -0.1, 1.004); m.scale.set(1.1, 0.7, 1); });

  // פה: חלל פתוח (נפתח ונסגר בדיבור) עם לשון, וחיוך כשהוא שותק
  const mouth = new THREE.Group();
  {
    const { pos, normal } = onSurface(0, -0.22, 1.003);
    mouth.position.copy(pos);
    mouth.lookAt(pos.clone().add(normal));
    head.add(mouth);
  }
  const open = new THREE.Group();
  const cavity = new THREE.Mesh(track(new THREE.CircleGeometry(0.17, 28)), mouthMat);
  cavity.scale.set(1.15, 1, 1);
  const tongue = new THREE.Mesh(track(new THREE.CircleGeometry(0.1, 20)), tongueMat);
  tongue.position.set(0, -0.08, 0.004);
  tongue.scale.set(1.2, 0.55, 1);
  open.add(cavity, tongue);
  mouth.add(open);
  const smile = new THREE.Mesh(track(new THREE.TorusGeometry(0.15, 0.022, 8, 24, Math.PI)), lineMat);
  smile.rotation.z = Math.PI; // קשת כלפי מטה = חיוך
  smile.position.y = 0.06;
  mouth.add(smile);

  // צל על הקרקע
  const shadow = new THREE.Mesh(track(new THREE.CircleGeometry(0.75, 32)), track(new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false })));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -1.18;

  return {
    root, head, shadow, eyes, open, smile,
    dispose: () => disposers.forEach((d) => d())
  };
};

export const addGoliLights = (THREE, scene) => {
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8892a6, 1.25));
  const key = new THREE.DirectionalLight(0xffffff, 1.9);
  key.position.set(-2.5, 3.5, 5);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xbfd8ff, 0.9);
  rim.position.set(3, 1.5, -3);
  scene.add(rim);
};
