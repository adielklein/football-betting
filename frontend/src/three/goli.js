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
  const browMat = memo(() => new THREE.MeshStandardMaterial({ color: 0x4a2f1c, roughness: 0.55 }));
  const lidMat = memo(() => new THREE.MeshStandardMaterial({ color: 0x2a1a10, roughness: 0.55 }));
  const mouthMat = memo(() => new THREE.MeshStandardMaterial({ color: 0x8a1f2e, roughness: 0.55, side: THREE.DoubleSide }));
  const tongueMat = memo(() => new THREE.MeshStandardMaterial({ color: 0xff7b8f, roughness: 0.55, side: THREE.DoubleSide }));

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

  // עיניים בסגנון סרט אנימציה: גלגל עין שהקשתית מצוירת עליו (המרקם קוטבי -
  // מרכז הקשתית בקוטב הקדמי, כך שסיבי הקשתית הם קווים רדיאליים והעין
  // "מסתכלת" בסיבוב אמיתי), טבעת כהה בשולי הקשתית, אור חם בחלקה התחתון,
  // ציפוי מבריק, צל עמוק סביב העין ("שקע") וקו ריסים כהה מעליה.
  // ההשתקפויות לא מסתובבות עם העין - הן נשארות מול האור, כמו בעין אמיתית
  const EYE = { r: 0.33, sy: 1.16, sz: 0.62, iris: 0.68, pupil: 0.27 };
  const eyeTex = memo(() => {
    const W = 512, H = 512;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d');
    const img = x.createImageData(W, H);
    const ss = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
    const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
    // סיבים: סכום גלים בזווית, עם שינוי קל לאורך הרדיוס
    const fib = (phi, t) => Math.sin(phi * 37 + t * 3) * 0.5 + Math.sin(phi * 71 + 1.3 - t * 5) * 0.3 + Math.sin(phi * 113 + 2.1) * 0.2;
    for (let yy = 0; yy < H; yy++) {
      const th = ((yy + 0.5) / H) * Math.PI;
      for (let xx = 0; xx < W; xx++) {
        const phi = ((xx + 0.5) / W) * Math.PI * 2;
        const down = Math.sin(phi); // 1 = למטה, -1 = למעלה (אחרי סיבוב הגיאומטריה)
        // לובן העין: לבן, מאפיר מעט לשוליים ולמעלה (צל העפעף)
        let col = mix([252, 252, 254], [222, 226, 234], ss(0.85, 1.5, th) * 0.8 + Math.max(0, -down) * ss(0.6, 1.3, th) * 0.35);
        if (th < EYE.iris + 0.02) {
          const t = Math.max(0, (th - EYE.pupil) / (EYE.iris - EYE.pupil));
          let ir = t < 0.25 ? mix([226, 160, 82], [176, 104, 44], t / 0.25)
            : t < 0.75 ? mix([176, 104, 44], [120, 64, 22], (t - 0.25) / 0.5)
            : mix([120, 64, 22], [52, 26, 10], (t - 0.75) / 0.25);
          const f = 1 + fib(phi, t) * 0.16 * ss(0.05, 0.3, t);
          // אור חם בתחתית הקשתית וצל בחלקה העליון - זה מה שנותן לה עומק
          const light = 1 + 0.45 * Math.max(0, down) * ss(0.2, 0.8, t) - 0.32 * Math.max(0, -down);
          ir = ir.map((v) => Math.min(255, v * f * light));
          // טבעת כהה בשוליים
          ir = mix(ir, [30, 16, 8], ss(0.78, 0.97, t) * 0.85);
          col = mix(ir, col, ss(EYE.iris - 0.012, EYE.iris + 0.012, th));
          // אישון עם קצה רך
          col = mix([14, 8, 4], col, ss(EYE.pupil - 0.02, EYE.pupil + 0.015, th));
        }
        const i = (yy * W + xx) * 4;
        img.data[i] = col[0]; img.data[i + 1] = col[1]; img.data[i + 2] = col[2]; img.data[i + 3] = 255;
      }
    }
    x.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
  });
  // הקוטב של הכדור (+y) מסובב קדימה (+z)
  const eyeGeo = memo(() => new THREE.SphereGeometry(EYE.r, 64, 48).rotateX(Math.PI / 2));
  const eyeMat = memo(() => new THREE.MeshPhysicalMaterial({ map: eyeTex, roughness: 0.35, clearcoat: 1, clearcoatRoughness: 0.06 }));
  // צל רך סביב העין שמושיב אותה בתוך הפנים
  const socketTex = memo(() => {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(70,60,75,0.3)'); g.addColorStop(0.6, 'rgba(70,60,75,0.24)'); g.addColorStop(1, 'rgba(70,60,75,0)');
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  });
  const socketMat = memo(() => new THREE.MeshBasicMaterial({ map: socketTex, transparent: true, depthWrite: false }));
  const socketGeo = memo(() => new THREE.PlaneGeometry(0.66, 0.78));
  // השתקפות גדולה ורכה + נקודה קטנה
  const glintTex = memo(() => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 31);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.72, 'rgba(255,255,255,0.97)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  });
  const glintMat = memo(() => new THREE.MeshBasicMaterial({ map: glintTex, transparent: true, depthWrite: false }));
  const glintGeo = memo(() => new THREE.PlaneGeometry(1, 1));
  const lashGeo = memo(() => new THREE.TorusGeometry(0.272, 0.03, 8, 32, Math.PI * 0.74));
  const lidGeo = memo(() => new THREE.TorusGeometry(0.19, 0.03, 8, 24, Math.PI));
  const eyes = [-0.33, 0.33].map((ax) => {
    const sock = anchor(ax, 0.1, 1.007); sock.add(new THREE.Mesh(socketGeo, socketMat));
    const g = anchor(ax, 0.1, 0.86);
    const shell = new THREE.Group(); shell.scale.set(1, EYE.sy, EYE.sz);
    // look = הסיבוב של גלגל העין (מבט). x/y של position נשמרים כממשק: Goli3D
    // מזיז אותו, ו-onBeforeRender ממיר את ההזזה לסיבוב
    const look = new THREE.Group();
    const ball = new THREE.Mesh(eyeGeo, eyeMat);
    ball.onBeforeRender = () => { ball.rotation.set(-look.position.y * 3.2, look.position.x * 3.6, 0); };
    shell.add(ball);
    const open = new THREE.Group(); open.add(shell, look);
    // ההשתקפויות: למעלה-שמאלה, מול אור המפתח
    const glints = new THREE.Group(); glints.position.z = 0.215;
    const big = new THREE.Mesh(glintGeo, glintMat); big.scale.set(0.13, 0.1, 1); big.position.set(-0.075, 0.115, 0); big.rotation.z = 0.5;
    const small = new THREE.Mesh(glintGeo, glintMat); small.scale.setScalar(0.06); small.position.set(0.07, -0.08, 0);
    glints.add(big, small); open.add(glints);
    const lash = new THREE.Mesh(lashGeo, lidMat);
    lash.rotation.z = Math.PI * 0.13; lash.scale.set(1, EYE.sy, 0.6); lash.position.set(0, -0.01, 0.135);
    open.add(lash);
    const lid = new THREE.Mesh(lidGeo, lidMat);
    lid.position.z = 0.19; lid.visible = false;
    g.add(open, lid);
    return { g, open, look, lid, side: ax < 0 ? -1 : 1 };
  });

  // גבות: קפסולות חומות קטנות מעל העיניים, זזות עם הרגש
  const browGeo = memo(() => new THREE.CapsuleGeometry(0.032, 0.17, 4, 10));
  const brows = [-0.31, 0.31].map((ax) => {
    const g = anchor(ax, 0.53, 1.005);
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
