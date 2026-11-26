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
      let b1 = -2, b2 = -2, best = null, second = null;
      for (const cc of centers) {
        // מחומשים מעט גדולים מהחלוקה השווה (כמו בכדור אמיתי ובעיצוב) - כך
        // השחור נראה גם מלפנים ולא רק בשולי הכדור
        const dot = d[0] * cc.p[0] + d[1] * cc.p[1] + d[2] * cc.p[2] + (cc.black ? 0.13 : 0);
        if (dot > b1) { b2 = b1; second = best; b1 = dot; best = cc; } else if (dot > b2) { b2 = dot; second = cc; }
      }
      const seam = b1 - b2 < 0.012;
      const i = (y * W + x) * 4;
      // שלושת המחומשים שסביב משושה הפנים לבנים (עם התפרים): כך נוצר "מצח"
      // לבן גדול והפנים תמיד על לבן, כמו בעיצוב שנבחר
      const isBlack = (cc) => cc && cc.black && (cc.p[0] * hex[0][0] + cc.p[1] * hex[0][1] + cc.p[2] * hex[0][2]) < 0.72;
      const black = isBlack(best);
      // תפר בין שני משטחים לבנים - בהיר ועדין (כמו בעיצוב); ליד שחור - כהה
      const lightSeam = !black && !isBlack(second);
      const col = seam ? (lightSeam ? [206, 210, 217] : [70, 76, 86]) : black ? [30, 34, 41] : [246, 247, 250];
      img.data[i] = col[0]; img.data[i + 1] = col[1]; img.data[i + 2] = col[2]; img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  ballCanvas = c;
  return c;
};

// גיאומטריות, חומרים וטקסטורות קבועים משותפים לכל הגולים במסך: buildGoli רץ
// באותו סדר בכל פעם, ולכן המשאב ה-n שהוא מבקש הוא תמיד אותו משאב. כך גולי
// נוסף (מסך ריק, חגיגה) נבנה כמעט בלי עבודה - קודם כל אחד בנה ושלח לכרטיס
// המסך מחדש כדור, עיניים וטקסטורות, וזה האט את המעבר בין לשוניות בסיור.
// המשותפים לא משוחררים; רק מה שייחודי למופע (הצעיף, בצבעים שלו) משוחרר
const SHARED = [];

export const buildGoli = (THREE) => {
  const disposers = [];
  const track = (o) => { disposers.push(() => o.dispose && o.dispose()); return o; };
  let memoIndex = 0;
  const memo = (make) => {
    const i = memoIndex++;
    if (!SHARED[i]) SHARED[i] = make();
    return SHARED[i];
  };

  const root = new THREE.Group();      // מיקום וקפיצה
  const head = new THREE.Group();      // סיבובים והטיות - הכדור והפנים יחד
  root.add(head);

  const tex = memo(() => new THREE.CanvasTexture(makeBallCanvas()));
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const ball = new THREE.Mesh(memo(() => new THREE.SphereGeometry(1, 64, 48)), memo(() => new THREE.MeshStandardMaterial({ map: tex, roughness: 0.42, metalness: 0.02 })));
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

  const white = memo(() => new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.22 }));
  const pupilMat = memo(() => new THREE.MeshBasicMaterial({ color: 0x1a0f08 }));
  const shine = memo(() => new THREE.MeshBasicMaterial({ color: 0xffffff }));
  const browMat = memo(() => new THREE.MeshStandardMaterial({ color: 0x4a2f1c, roughness: 0.55 }));
  const lidMat = memo(() => new THREE.MeshStandardMaterial({ color: 0x3a2618, roughness: 0.55 }));
  const mouthMat = memo(() => new THREE.MeshStandardMaterial({ color: 0x8a1f2e, roughness: 0.55, side: THREE.DoubleSide }));
  const tongueMat = memo(() => new THREE.MeshStandardMaterial({ color: 0xff7b8f, roughness: 0.55, side: THREE.DoubleSide }));

  // קשתית חומה: עיגול עם מעבר מבהיר במרכז לכהה בשוליים, כמו בעיצוב
  const irisTex = memo(() => {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(64, 70, 6, 64, 64, 62);
    g.addColorStop(0, '#d9a05b'); g.addColorStop(0.55, '#a8662a'); g.addColorStop(0.9, '#6b3b14'); g.addColorStop(1, '#4a2509');
    x.fillStyle = g; x.beginPath(); x.arc(64, 64, 62, 0, Math.PI * 2); x.fill();
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  });
  const irisMat = memo(() => new THREE.MeshBasicMaterial({ map: irisTex, transparent: true }));
  // סומק רך: עיגול שדוהה לשוליים
  const blushTex = memo(() => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(32, 32, 2, 32, 32, 31);
    g.addColorStop(0, 'rgba(255,120,140,0.85)'); g.addColorStop(1, 'rgba(255,120,140,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  });
  const blushMat = memo(() => new THREE.MeshBasicMaterial({ map: blushTex, transparent: true, depthWrite: false }));

  // מקבץ שיושב על פני הכדור ופונה החוצה
  const anchor = (ax, ay, r) => {
    const g = new THREE.Group();
    const { pos, normal } = onSurface(ax, ay, r);
    g.position.copy(pos);
    g.lookAt(pos.clone().add(normal));
    head.add(g);
    return g;
  };

  // עיניים גדולות: גלגל עין לבן בולט, קשתית חומה, אישון, שתי השתקפויות.
  // look = הקבוצה שזזה כשהוא מסתכל. lid = קשת עין עצומה (שינה: ‿, שמחה: ^)
  const eyeGeo = memo(() => new THREE.SphereGeometry(0.33, 28, 20));
  const irisGeo = memo(() => new THREE.CircleGeometry(0.205, 32));
  const pupilGeo = memo(() => new THREE.CircleGeometry(0.1, 24));
  const hiGeo = memo(() => new THREE.CircleGeometry(0.065, 16));
  const hi2Geo = memo(() => new THREE.CircleGeometry(0.03, 12));
  const lidGeo = memo(() => new THREE.TorusGeometry(0.19, 0.03, 8, 24, Math.PI));
  const eyes = [-0.33, 0.33].map((ax) => {
    const g = anchor(ax, 0.1, 0.84);
    const ball = new THREE.Mesh(eyeGeo, white);
    ball.scale.set(1, 1.16, 0.55);
    const look = new THREE.Group();
    look.position.z = 0.192; // מעט לפני פני גלגל העין (0.33 × 0.55), אחרת הקשתית נבלעת בו
    const iris = new THREE.Mesh(irisGeo, irisMat); iris.scale.y = 1.12;
    const pupil = new THREE.Mesh(pupilGeo, pupilMat); pupil.position.set(0, 0.005, 0.002); pupil.scale.y = 1.1;
    const hi = new THREE.Mesh(hiGeo, shine); hi.position.set(0.078, 0.09, 0.004);
    const hi2 = new THREE.Mesh(hi2Geo, shine); hi2.position.set(-0.07, -0.085, 0.004);
    look.add(iris, pupil, hi, hi2);
    const open = new THREE.Group(); open.add(ball, look);
    const lid = new THREE.Mesh(lidGeo, lidMat);
    lid.position.z = 0.19; lid.visible = false;
    g.add(open, lid);
    return { g, open, look, lid, side: ax < 0 ? -1 : 1 };
  });

  // גבות: קפסולות חומות קטנות מעל העיניים, זזות עם הרגש
  const browGeo = memo(() => new THREE.CapsuleGeometry(0.032, 0.17, 4, 10));
  const brows = [-0.31, 0.31].map((ax) => {
    const g = anchor(ax, 0.47, 1.005);
    const m = new THREE.Mesh(browGeo, browMat);
    m.rotation.z = Math.PI / 2; // אופקית
    m.scale.set(1, 1, 0.6);
    const pivot = new THREE.Group(); pivot.add(m);
    g.add(pivot);
    return { g, pivot, side: ax < 0 ? -1 : 1 };
  });

  // לחיים
  const cheekGeo = memo(() => new THREE.PlaneGeometry(0.34, 0.22));
  [-0.55, 0.55].forEach((ax) => { const g = anchor(ax, -0.12, 1.006); g.add(new THREE.Mesh(cheekGeo, blushMat)); });

  // פה. open = פה פתוח בצורת D (חיוך עם לשון) - בדיבור הוא נפתח ונסגר.
  // smile = קשת סגורה (שינה), frown = קשת הפוכה (עצב), oh = פה עגול קטן (הפתעה)
  const mouth = anchor(0, -0.27, 1.004);
  mouth.scale.setScalar(1.25);
  const dShape = new THREE.Shape();
  dShape.moveTo(-0.17, 0.03);
  dShape.quadraticCurveTo(0, 0.07, 0.17, 0.03);
  dShape.quadraticCurveTo(0.15, -0.17, 0, -0.18);
  dShape.quadraticCurveTo(-0.15, -0.17, -0.17, 0.03);
  const open = new THREE.Group();
  open.add(new THREE.Mesh(memo(() => new THREE.ShapeGeometry(dShape, 16)), mouthMat));
  const tongueShape = new THREE.Shape();
  tongueShape.moveTo(-0.09, -0.09);
  tongueShape.quadraticCurveTo(0, -0.04, 0.09, -0.09);
  tongueShape.quadraticCurveTo(0.08, -0.17, 0, -0.17);
  tongueShape.quadraticCurveTo(-0.08, -0.17, -0.09, -0.09);
  const tongue = new THREE.Mesh(memo(() => new THREE.ShapeGeometry(tongueShape, 12)), tongueMat);
  tongue.position.z = 0.004;
  open.add(tongue);
  mouth.add(open);
  const arcGeo = memo(() => new THREE.TorusGeometry(0.11, 0.024, 8, 20, Math.PI));
  const smile = new THREE.Mesh(arcGeo, lidMat); smile.rotation.z = Math.PI; smile.position.y = 0.04; smile.visible = false;
  const frown = new THREE.Mesh(arcGeo, lidMat); frown.position.y = -0.1; frown.visible = false;
  const oh = new THREE.Mesh(memo(() => new THREE.CircleGeometry(0.06, 20)), mouthMat); oh.scale.set(0.85, 1.15, 1); oh.position.y = -0.04; oh.visible = false;
  mouth.add(smile, frown, oh);

  // כתר זהב (לזוכה השבועי): טבעת + חמישה שיניים עם כדורים, מוטה קצת
  const crown = new THREE.Group();
  {
    const gold = memo(() => new THREE.MeshStandardMaterial({ color: 0xf2c02e, metalness: 0.85, roughness: 0.28, emissive: 0x3a2800, emissiveIntensity: 0.25 }));
    const band = new THREE.Mesh(memo(() => new THREE.CylinderGeometry(0.36, 0.4, 0.17, 28, 1, true)), gold);
    band.material.side = THREE.DoubleSide;
    crown.add(band);
    const spikeGeo = memo(() => new THREE.ConeGeometry(0.075, 0.2, 10));
    const tipGeo = memo(() => new THREE.SphereGeometry(0.045, 10, 8));
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      const sp = new THREE.Mesh(spikeGeo, gold);
      sp.position.set(Math.sin(a) * 0.37, 0.18, Math.cos(a) * 0.37);
      const tip = new THREE.Mesh(tipGeo, gold);
      tip.position.set(Math.sin(a) * 0.37, 0.3, Math.cos(a) * 0.37);
      crown.add(sp, tip);
    }
    crown.position.set(0.32, 0.9, 0.05);
    crown.rotation.set(0.05, 0.3, -0.38);
    crown.visible = false;
    head.add(crown);
  }

  // צעיף בצבעי הקבוצה: טבעת סרוגה סביב החצי התחתון ושני קצוות תלויים.
  // setScarf(primary, secondary) מצייר את הפסים; null מסתיר
  const scarf = new THREE.Group();
  const scarfCanvas = document.createElement('canvas'); scarfCanvas.width = 256; scarfCanvas.height = 32;
  const scarfTex = track(new THREE.CanvasTexture(scarfCanvas));
  scarfTex.colorSpace = THREE.SRGBColorSpace; scarfTex.wrapS = THREE.RepeatWrapping;
  const scarfMat = track(new THREE.MeshStandardMaterial({ map: scarfTex, roughness: 0.95 }));
  {
    const ring = new THREE.Mesh(memo(() => new THREE.TorusGeometry(0.86, 0.16, 12, 48)), scarfMat);
    ring.rotation.x = Math.PI / 2 + 0.16; // החלק הקדמי נמוך - מתחת לפה, כמו צעיף על החזה
    ring.position.y = -0.56;
    scarf.add(ring);
    const tailGeo = memo(() => new THREE.BoxGeometry(0.2, 0.42, 0.06));
    [[0.5, -0.12], [0.68, 0.1]].forEach(([x, rz], k) => {
      const tail = new THREE.Mesh(tailGeo, scarfMat);
      tail.position.set(x, -0.86 - k * 0.04, 0.6 - k * 0.12);
      tail.rotation.set(0.25, -0.5, rz);
      scarf.add(tail);
    });
    scarf.visible = false;
    root.add(scarf); // לא מסתובב עם הראש - צעיף נשאר על הצוואר
  }
  const setScarf = (primary, secondary) => {
    if (!primary) { scarf.visible = false; return; }
    const x = scarfCanvas.getContext('2d');
    const stripes = 8;
    for (let k = 0; k < stripes; k++) {
      x.fillStyle = k % 2 ? (secondary || '#ffffff') : primary;
      x.fillRect((k * scarfCanvas.width) / stripes, 0, scarfCanvas.width / stripes + 1, scarfCanvas.height);
    }
    // מרקם סריגה עדין
    x.fillStyle = 'rgba(0,0,0,0.08)';
    for (let i = 0; i < scarfCanvas.width; i += 4) x.fillRect(i, 0, 1, scarfCanvas.height);
    scarfTex.needsUpdate = true;
    scarf.visible = true;
  };

  // צל על הקרקע
  const shadow = new THREE.Mesh(memo(() => new THREE.CircleGeometry(0.75, 32)), track(new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false })));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -1.18;

  return {
    root, head, shadow, eyes, brows, open, smile, frown, oh, crown, scarf, setScarf,
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
