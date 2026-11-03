// סצנת הפתיחה של מסך הכניסה: פנדל באצטדיון בלילה.
//
// הכל מצויר על canvas אחד בפרספקטיבה אמיתית: מצלמה נמוכה מאחורי הכדור,
// השער במרחק 13.6 מטר. הזרקורים נדלקים, הכדור נבעט עם סיבוב, השוער קופץ
// ומחטיא בסנטימטרים, והרשת נמתחת אחורה בפיזיקה של קפיצים.
//
// מה שעושה את זה ריאליסטי: מרקם דשא ופסי כיסוח, יציע מטושטש כמו בעומק
// שדה של מצלמה, ערפל אור באוויר, כמה צללים חלשים מכל זרקור, טשטוש תנועה
// על הכדור, וגרעין עדין של צילום.
//
// createGoalScene(canvas, { onGoal, onDone, reduced }) -> { play, skip, destroy }

export function createGoalScene(canvas, { onGoal, onDone, reduced = false } = {}) {
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, DPR = 1, F = 1, Y0 = 0, CX = 0;
  const CAM = { x: 0, y: 0.95, z: 13.6 };

  // ===== גאומטריה (מטרים) =====
  const GOAL_W = 7.32, GOAL_H = 2.44, HALF = GOAL_W / 2;
  const NET_D = 2, NET_TOP = 2.25;
  const NX = 33, NY = 12;
  const BALL_R = 0.11;
  // כיווני הצללים: ארבעה זרקורים בפינות האצטדיון
  const LIGHTS = [[-0.9, -0.5], [0.9, -0.5], [-0.6, 0.7], [0.6, 0.7]];

  const proj = (x, y, z) => {
    const d = CAM.z - z;
    if (d < 0.05) return null;
    const s = F / d;
    return { x: CX + (x - CAM.x) * s, y: Y0 - (y - CAM.y) * s, s };
  };

  // ===== מצב =====
  let t = 0, last = 0, raf = 0, running = false;
  let goalFired = false, doneFired = false;
  const net = { dz: new Float32Array(NX * NY), v: new Float32Array(NX * NY) };
  const sparks = [];
  const trail = [];
  let crowdImg = null, boardsImg = null, grassImg = null, grainImg = null;
  let shake = 0, flash = 0;

  // ===== ציר הזמן (שניות) =====
  // קצר בכוונה: זו פתיחה למסך כניסה, לא סרט. הכרטיס עולה מיד אחרי הגול
  const T = {
    lightL: 0.04, lightR: 0.16, lightsFull: 0.45,
    lines0: 0.1, lines1: 0.55,
    kick: 0.55, impact: 1.1,
    keeper0: 0.63, keeper1: 1.06,
    done: 1.2
  };

  // ===== מסלול הכדור =====
  const START = { x: 0, y: BALL_R, z: 11 };
  const AIM = { x: 3.0, y: 1.98, z: -1.82 };
  // 72% מהדרך מהר, ו-28% האחרונים בהילוך איטי
  const flightP = (u) => (u < 0.55 ? (u / 0.55) * 0.72 : 0.72 + ((u - 0.55) / 0.45) * 0.28);
  const ballAt = (p) => {
    const curl = Math.sin(p * Math.PI) * 0.9;
    return {
      x: START.x + (AIM.x - START.x) * p - curl * 0.35,
      y: START.y + (AIM.y - START.y) * p + Math.sin(p * Math.PI) * 0.75,
      z: START.z + (AIM.z - START.z) * p
    };
  };
  let ball = { ...START }, ballSpin = 0;

  // ===== מידות =====
  function resize() {
    const r = canvas.getBoundingClientRect();
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width; H = r.height;
    if (!W || !H) return;
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
    F = 1.62 * Math.min(W, H * 0.62);
    Y0 = H * 0.36;
    CX = W / 2;
    buildCrowd();
    buildBoards();
    buildGrass();
    buildGrain();
    if (!running) draw();
  }

  const offscreen = (w, h) => {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w * DPR)); c.height = Math.max(1, Math.round(h * DPR));
    const x = c.getContext('2d');
    x.scale(DPR, DPR);
    return [c, x];
  };

  // ===== יציע: שתי קומות, קהל, מעקה מואר. מטושטש קלות כמו רקע בצילום =====
  function buildCrowd() {
    const rand = mulberry(7);
    const g = proj(0, 0, -13);
    const top = Math.max(0, Y0 - H * 0.32);
    const h = Math.max(10, g.y - top);
    const [raw, x] = offscreen(W, h);
    const bg = x.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#070a14'); bg.addColorStop(0.45, '#0f1527'); bg.addColorStop(1, '#161d33');
    x.fillStyle = bg; x.fillRect(0, 0, W, h);
    const shirts = ['#2b3a67', '#33416f', '#6b2638', '#24564f', '#7a6a32', '#4a505e', '#8a2d3d', '#1f4f7a', '#d9d9d9', '#b23a3a', '#2d6a9f'];
    const tiers = [[0.06, 0.42, 0.55], [0.5, 0.97, 1]];
    for (const [a, b, light] of tiers) {
      const rows = 13;
      for (let row = 0; row < rows; row++) {
        const k = row / (rows - 1);
        const y = h * (a + (b - a) * k);
        const size = (0.9 + k * 1.6) * (0.75 + 0.5 * light);
        for (let px = -4; px < W + 4; px += size * 2.1 + rand() * size) {
          if (rand() < 0.08) continue;
          x.globalAlpha = (0.4 + k * 0.45) * light;
          // גוף ומעליו ראש
          x.fillStyle = shirts[(rand() * shirts.length) | 0];
          x.fillRect(px - size * 0.75, y - size * 0.3, size * 1.5, size * 1.6);
          x.fillStyle = rand() < 0.5 ? '#c99a7a' : '#7a553d';
          x.beginPath(); x.arc(px, y - size * 0.75, size * 0.5, 0, Math.PI * 2); x.fill();
        }
      }
    }
    x.globalAlpha = 1;
    // מרפסת בין הקומות, עם פס LED
    const mid = h * 0.46;
    x.fillStyle = '#05070d'; x.fillRect(0, mid - 3, W, 7);
    const led = x.createLinearGradient(0, 0, W, 0);
    led.addColorStop(0, 'rgba(40,120,255,0)'); led.addColorStop(0.5, 'rgba(80,200,255,.55)'); led.addColorStop(1, 'rgba(40,120,255,0)');
    x.fillStyle = led; x.fillRect(0, mid - 1, W, 2);
    // גג
    x.fillStyle = '#03040a'; x.fillRect(0, 0, W, h * 0.05);
    // אור הזרקורים נופל חזק יותר על השורות התחתונות
    const lit = x.createLinearGradient(0, 0, 0, h);
    lit.addColorStop(0, 'rgba(0,0,0,.35)'); lit.addColorStop(1, 'rgba(255,240,210,.05)');
    x.fillStyle = lit; x.fillRect(0, 0, W, h);

    // עומק שדה: הרקע רך, כמו שמצלמה רואה אותו כשהפוקוס על השער
    const [c, cx] = offscreen(W, h);
    cx.setTransform(1, 0, 0, 1, 0, 0);
    if ('filter' in cx) cx.filter = `blur(${0.9 * DPR}px)`;
    cx.drawImage(raw, 0, 0);
    crowdImg = { c, top, h };
  }

  // ===== שלטי הפרסום מאחורי השער =====
  function buildBoards() {
    const a = proj(0, 0, -11), b = proj(0, 0.9, -11);
    const h = Math.max(4, a.y - b.y);
    const [c, x] = offscreen(W, h);
    const g = x.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, '#0a1f52'); g.addColorStop(0.5, '#0a5c48'); g.addColorStop(1, '#0a1f52');
    x.fillStyle = g; x.fillRect(0, 0, W, h);
    x.fillStyle = 'rgba(255,255,255,.88)';
    x.font = `800 ${Math.round(h * 0.6)}px Rubik, system-ui, sans-serif`;
    x.textBaseline = 'middle';
    const words = ['GAMBALL', 'ליגת העל', 'פרמייר ליג', 'לה ליגה'];
    let px = 8;
    for (let i = 0; px < W; i++) {
      const w = words[i % words.length];
      x.fillText(w, px, h / 2 + 1);
      px += x.measureText(w).width + h * 1.4;
    }
    // פסי LED אנכיים ואור עליון
    x.fillStyle = 'rgba(0,0,0,.22)';
    for (let i = 0; i < W; i += 2.5) x.fillRect(i, 0, 1, h);
    const sheen = x.createLinearGradient(0, 0, 0, h);
    sheen.addColorStop(0, 'rgba(255,255,255,.18)'); sheen.addColorStop(0.5, 'rgba(255,255,255,0)');
    x.fillStyle = sheen; x.fillRect(0, 0, W, h);
    boardsImg = { c, y: b.y, h };
  }

  // ===== מרקם דשא: רעש עדין שמונח מעל פסי הכיסוח =====
  function buildGrass() {
    const rand = mulberry(11);
    const S = 160;
    const c = document.createElement('canvas');
    c.width = S; c.height = S;
    const x = c.getContext('2d');
    const img = x.createImageData(S, S);
    for (let i = 0; i < S * S; i++) {
      const v = rand();
      const streak = Math.sin((i % S) * 0.9 + rand() * 2) * 0.5 + 0.5;
      img.data[i * 4] = 20 + v * 40;
      img.data[i * 4 + 1] = 60 + v * 90 * (0.7 + 0.3 * streak);
      img.data[i * 4 + 2] = 20 + v * 30;
      img.data[i * 4 + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    grassImg = ctx.createPattern(c, 'repeat');
  }

  // ===== גרעין צילום =====
  function buildGrain() {
    const rand = mulberry(3);
    const S = 128;
    const c = document.createElement('canvas');
    c.width = S; c.height = S;
    const x = c.getContext('2d');
    const img = x.createImageData(S, S);
    for (let i = 0; i < S * S; i++) {
      const v = (rand() * 255) | 0;
      img.data[i * 4] = v; img.data[i * 4 + 1] = v; img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    grainImg = ctx.createPattern(c, 'repeat');
  }

  // ===== עזרים =====
  const easeOut = (k) => 1 - Math.pow(1 - k, 3);
  const easeInOut = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
  const clamp01 = (k) => Math.max(0, Math.min(1, k));
  const span = (a, b) => clamp01((t - a) / (b - a));

  function lampLevel(on) {
    if (t < on) return 0;
    const k = (t - on) / 0.14;
    if (k >= 1) return 1;
    return [0.55, 0.05, 0.85, 0.25, 1][Math.min(4, (k * 5) | 0)];
  }

  function polyline(pts, progress, width) {
    let total = 0;
    const segs = [];
    for (let i = 1; i < pts.length; i++) {
      // מחלקים כל קטע לחלקים קטנים, כדי שהעובי ישתנה בהדרגה עם המרחק
      const A = pts[i - 1], B = pts[i];
      for (let k = 0; k < 8; k++) {
        const u0 = k / 8, u1 = (k + 1) / 8;
        const a = proj(A[0] + (B[0] - A[0]) * u0, A[1] + (B[1] - A[1]) * u0, A[2] + (B[2] - A[2]) * u0);
        const b = proj(A[0] + (B[0] - A[0]) * u1, A[1] + (B[1] - A[1]) * u1, A[2] + (B[2] - A[2]) * u1);
        if (!a || !b) continue;
        const len = Math.hypot(b.x - a.x, b.y - a.y);
        segs.push({ a, b, len }); total += len;
      }
    }
    let left = total * progress;
    for (const s of segs) {
      if (left <= 0) break;
      const k = Math.min(1, left / s.len);
      ctx.lineWidth = Math.max(0.5, width * (s.a.s + s.b.s) / 2);
      ctx.beginPath(); ctx.moveTo(s.a.x, s.a.y);
      ctx.lineTo(s.a.x + (s.b.x - s.a.x) * k, s.a.y + (s.b.y - s.a.y) * k);
      ctx.stroke();
      left -= s.len;
    }
  }

  // ===== רשת =====
  const netIdx = (i, j) => j * NX + i;
  const netPoint = (i, j) => {
    const x = -HALF + (GOAL_W * i) / (NX - 1);
    const y = (NET_TOP * j) / (NY - 1);
    // הרשת שוקעת קצת באמצע, כמו רשת אמיתית תלויה
    const sag = Math.sin((i / (NX - 1)) * Math.PI) * 0.06;
    return [x, y, -NET_D + sag + net.dz[netIdx(i, j)]];
  };
  // צעדי פיזיקה קטנים וקבועים: צעד גדול (פריים איטי בטלפון חלש) הופך את
  // הקפיצים ללא יציבים, והרשת "מתפוצצת"
  function stepNet(dt) {
    const n = Math.min(12, Math.ceil(dt / (1 / 240)));
    for (let i = 0; i < n; i++) stepNetOnce(dt / n);
  }
  function stepNetOnce(dt) {
    const { dz, v } = net;
    for (let j = 1; j < NY; j++) {
      for (let i = 1; i < NX - 1; i++) {
        const k = netIdx(i, j);
        const up = j < NY - 1 ? dz[netIdx(i, j + 1)] : dz[k] * 0.6;
        const lap = dz[netIdx(i - 1, j)] + dz[netIdx(i + 1, j)] + dz[netIdx(i, j - 1)] + up - 4 * dz[k];
        v[k] += (-55 * dz[k] + 520 * lap - 7 * v[k]) * dt;
      }
    }
    for (let k = 0; k < dz.length; k++) dz[k] += v[k] * dt;
  }
  function hitNet(x, y, power) {
    for (let j = 1; j < NY; j++) for (let i = 1; i < NX - 1; i++) {
      const px = -HALF + (GOAL_W * i) / (NX - 1), py = (NET_TOP * j) / (NY - 1);
      const d2 = (px - x) ** 2 + (py - y) ** 2;
      net.v[netIdx(i, j)] -= power * Math.exp(-d2 / (2 * 0.36 * 0.36));
    }
  }
  function netDzAt(x, y) {
    const i = Math.round(((x + HALF) / GOAL_W) * (NX - 1));
    const j = Math.round((y / NET_TOP) * (NY - 1));
    return net.dz[netIdx(Math.max(1, Math.min(NX - 2, i)), Math.max(1, Math.min(NY - 1, j)))];
  }

  function drawNet(light) {
    // צל הרשת על הדשא
    ctx.strokeStyle = `rgba(0,0,0,${0.12 * light})`;
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    for (let i = 0; i < NX; i += 2) {
      const a = proj(-HALF + (GOAL_W * i) / (NX - 1), 0, 0), b = proj(-HALF + (GOAL_W * i) / (NX - 1) + 0.4, 0, -NET_D);
      ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
    }
    ctx.stroke();

    ctx.strokeStyle = `rgba(232,236,244,${0.3 + 0.28 * light})`;
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    for (let j = 0; j < NY; j++) {
      for (let i = 0; i < NX; i++) {
        const p = proj(...netPoint(i, j));
        if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
      }
    }
    for (let i = 0; i < NX; i++) {
      for (let j = 0; j < NY; j++) {
        const p = proj(...netPoint(i, j));
        if (j === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
      }
    }
    for (let i = 0; i < NX; i++) {
      const x = -HALF + (GOAL_W * i) / (NX - 1);
      const a = proj(x, GOAL_H, 0), b = proj(...netPoint(i, NY - 1));
      ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
    }
    for (let r = 1; r < 6; r++) {
      const k = r / 6;
      for (let i = 0; i < NX; i++) {
        const x = -HALF + (GOAL_W * i) / (NX - 1);
        const back = netPoint(i, NY - 1);
        const p = proj(x, GOAL_H + (back[1] - GOAL_H) * k, back[2] * k);
        if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
      }
    }
    for (const side of [0, NX - 1]) {
      const x = side === 0 ? -HALF : HALF;
      for (let j = 0; j < NY; j++) {
        const y = (NET_TOP * j) / (NY - 1);
        const a = proj(x, y * (GOAL_H / NET_TOP), 0), b = proj(...netPoint(side, j));
        ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
      }
      for (let r = 1; r < 6; r++) {
        const z = -NET_D * (r / 6);
        const a = proj(x, 0, z), b = proj(x, GOAL_H + (NET_TOP - GOAL_H) * (r / 6), z);
        ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
      }
    }
    ctx.stroke();
  }

  function drawPosts(light) {
    const pts = [[-HALF, 0, 0], [-HALF, GOAL_H, 0], [HALF, GOAL_H, 0], [HALF, 0, 0]].map((p) => proj(...p));
    const w = 0.12 * pts[0].s;
    ctx.lineCap = 'butt'; ctx.lineJoin = 'miter';
    // צללי הקורות על הדשא
    ctx.strokeStyle = `rgba(0,0,0,${0.18 * light})`; ctx.lineWidth = w * 0.8;
    for (const [dx] of LIGHTS) {
      const a = proj(-HALF, 0, 0), b = proj(-HALF + dx * 1.6, 0, -1.4), c2 = proj(HALF, 0, 0), d = proj(HALF + dx * 1.6, 0, -1.4);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.moveTo(c2.x, c2.y); ctx.lineTo(d.x, d.y); ctx.stroke();
    }
    // הקורות: לבנות, עם צד מואר וצד בצל
    ctx.strokeStyle = shadeHex('#dfe4ea', 0.75 + 0.25 * light); ctx.lineWidth = w;
    ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.stroke();
    ctx.strokeStyle = `rgba(255,255,255,${0.6 + 0.4 * light})`; ctx.lineWidth = w * 0.45;
    ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p.x - w * 0.18, p.y - w * 0.18) : ctx.moveTo(p.x - w * 0.18, p.y))); ctx.stroke();
  }

  // ===== שוער: גוף מלא מצורות מתחדדות, לא קווים =====
  // תנוחה במטרים ביחס לאגן. ready = עמידת מוכנות, dive = מתוח באוויר
  const POSE = {
    ready: { sh: 0.5, head: [0, 0.74], el: [-0.36, 0.33], er: [0.36, 0.33], hl: [-0.5, 0.15], hr: [0.5, 0.15], kl: [-0.25, -0.44], kr: [0.25, -0.44], fl: [-0.3, -0.92], fr: [0.3, -0.92] },
    dive: { sh: 0.53, head: [0.03, 0.78], el: [0.0, 0.98], er: [-0.1, 0.94], hl: [0.08, 1.3], hr: [-0.12, 1.25], kl: [-0.08, -0.48], kr: [0.18, -0.42], fl: [-0.16, -0.95], fr: [0.14, -0.9] }
  };
  function keeperState() {
    const d = easeInOut(span(T.keeper0, T.keeper1));
    const pre = span(0.15, 0.45);
    const sway = t < T.keeper0 ? Math.sin(t * 7) * 0.12 * pre : 0;
    const hop = t < T.keeper0 ? Math.abs(Math.sin(t * 7)) * 0.035 * pre : 0;
    const land = t > T.keeper1 ? easeOut(Math.min(1, (t - T.keeper1) / 0.35)) : 0;
    const x = sway + d * 2.05 + land * 0.15;
    const y = 0.95 + hop + Math.sin(d * Math.PI) * 0.55 + d * 0.15 - land * 0.92;
    const rot = -d * 1.25 - land * 0.3;
    const lerp = (a, b) => [a[0] + (b[0] - a[0]) * d, a[1] + (b[1] - a[1]) * d];
    const pose = { sh: POSE.ready.sh + (POSE.dive.sh - POSE.ready.sh) * d };
    for (const k of ['head', 'el', 'er', 'hl', 'hr', 'kl', 'kr', 'fl', 'fr']) pose[k] = lerp(POSE.ready[k], POSE.dive[k]);
    return { x, y: Math.max(0.2, y), rot, pose, d };
  }
  function drawKeeper(light) {
    const k = keeperState();
    const z = 0.35;
    const root = proj(k.x, k.y, z);
    const s = root.s;
    // צללים מכל זרקור, חלשים ומתפזרים ככל שהשוער גבוה מהדשא
    const g0 = proj(k.x, 0, z);
    for (const [dx, dz] of LIGHTS) {
      const g = proj(k.x + dx * 0.5, 0, z + dz * 0.4);
      ctx.fillStyle = `rgba(0,0,0,${(0.13 - k.d * 0.05) * light + 0.04})`;
      ctx.beginPath(); ctx.ellipse((g.x + g0.x) / 2, g0.y, 0.42 * s * (1 + k.d * 0.8), 0.07 * s, 0, 0, Math.PI * 2); ctx.fill();
    }
    const c = Math.cos(k.rot), sn = Math.sin(k.rot);
    const P = ([px, py]) => ({ x: root.x + (px * c - py * sn) * s, y: root.y - (px * sn + py * c) * s });
    const lit = 0.55 + 0.45 * light;
    const col = (hex, f = 1) => shadeHex(hex, f * lit);

    // איבר מתחדד: עבה בהתחלה, דק בסוף, עם קצוות מעוגלים
    const limb = (a, b, wa, wb, fill) => {
      const A = P(a), B = P(b);
      const dx = B.x - A.x, dy = B.y - A.y, L = Math.hypot(dx, dy) || 1;
      const nx = -dy / L, ny = dx / L;
      const ra = (wa * s) / 2, rb = (wb * s) / 2;
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.moveTo(A.x + nx * ra, A.y + ny * ra); ctx.lineTo(B.x + nx * rb, B.y + ny * rb);
      ctx.lineTo(B.x - nx * rb, B.y - ny * rb); ctx.lineTo(A.x - nx * ra, A.y - ny * ra); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.arc(A.x, A.y, ra, 0, Math.PI * 2); ctx.arc(B.x, B.y, rb, 0, Math.PI * 2); ctx.fill();
    };
    const JERSEY = '#c6ec2e', JERSEY_D = '#97b81c', SHORTS = '#15171c', SKIN = '#c98d68', BOOT = '#0d0f14';
    const mid = (a, b, f = 0.5) => [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];

    // הצד הרחוק קודם (כהה יותר), אחר כך הקרוב
    for (const [side, knee, foot, f] of [[-1, k.pose.kl, k.pose.fl, 0.82], [1, k.pose.kr, k.pose.fr, 1]]) {
      const hip = [side * 0.1, -0.03];
      limb(hip, mid(hip, knee, 0.55), 0.2, 0.17, col(SHORTS, f));
      limb(mid(hip, knee, 0.5), knee, 0.15, 0.12, col(SKIN, f * 0.95));
      limb(knee, foot, 0.12, 0.075, col(JERSEY, f * 0.95));
      limb(foot, [foot[0] + side * 0.13, foot[1] - 0.03], 0.09, 0.07, col(BOOT));
    }
    // גוף: טרפז מהמותניים לכתפיים, עם הצללה
    const hl = P([-0.15, 0]), hr = P([0.15, 0]), sl = P([-0.23, k.pose.sh]), sr = P([0.23, k.pose.sh]);
    const torso = ctx.createLinearGradient(sl.x, sl.y, sr.x, sr.y);
    torso.addColorStop(0, col(JERSEY_D)); torso.addColorStop(0.55, col(JERSEY)); torso.addColorStop(1, col(JERSEY, 1.06));
    ctx.fillStyle = torso;
    ctx.beginPath(); ctx.moveTo(hl.x, hl.y); ctx.lineTo(hr.x, hr.y); ctx.lineTo(sr.x, sr.y); ctx.lineTo(sl.x, sl.y); ctx.closePath(); ctx.fill();
    limb([0, 0.02], [0, k.pose.sh - 0.05], 0.3, 0.38, torso);
    // ידיים: שרוולים ארוכים וכפפות גדולות
    for (const [side, elbow, hand, f] of [[-1, k.pose.el, k.pose.hl, 0.85], [1, k.pose.er, k.pose.hr, 1]]) {
      const sh = [side * 0.21, k.pose.sh - 0.03];
      limb(sh, elbow, 0.12, 0.1, col(JERSEY, f));
      limb(elbow, hand, 0.1, 0.085, col(JERSEY, f));
      const tip = [hand[0] + (hand[0] - elbow[0]) * 0.55, hand[1] + (hand[1] - elbow[1]) * 0.55];
      limb(hand, tip, 0.15, 0.13, col('#f2f4f7', f));
      limb(mid(elbow, hand, 0.85), hand, 0.11, 0.11, col('#ff7a1a', f));
    }
    // צוואר וראש
    limb([0, k.pose.sh - 0.02], [k.pose.head[0] * 0.6, k.pose.head[1] - 0.1], 0.09, 0.08, col(SKIN, 0.9));
    const hd = P(k.pose.head);
    ctx.fillStyle = col(SKIN);
    ctx.beginPath(); ctx.ellipse(hd.x, hd.y, 0.1 * s, 0.12 * s, -k.rot, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = col('#1a120a');
    ctx.beginPath(); ctx.ellipse(hd.x, hd.y, 0.105 * s, 0.125 * s, -k.rot, Math.PI * 0.95, Math.PI * 2.05); ctx.fill();
    // אור צד מהזרקור: קו בהיר דק לאורך הגוף
    ctx.strokeStyle = `rgba(255,255,240,${0.25 * light})`; ctx.lineWidth = 0.025 * s;
    ctx.beginPath(); ctx.moveTo(hr.x, hr.y); ctx.lineTo(sr.x, sr.y); ctx.stroke();
  }

  // ===== כדור =====
  const PHI = (1 + Math.sqrt(5)) / 2;
  const ICO = [[0, 1, PHI], [0, -1, PHI], [0, 1, -PHI], [0, -1, -PHI], [1, PHI, 0], [-1, PHI, 0], [1, -PHI, 0], [-1, -PHI, 0], [PHI, 0, 1], [-PHI, 0, 1], [PHI, 0, -1], [-PHI, 0, -1]]
    .map(([a, b, c]) => { const n = Math.hypot(a, b, c); return [a / n, b / n, c / n]; });
  function drawBall(pos, light, blur) {
    const p = proj(pos.x, pos.y, pos.z);
    if (!p) return null;
    const r = BALL_R * p.s;
    // טשטוש תנועה: שובל שקוף לאורך כיוון הטיסה
    if (blur && trail.length > 1) {
      const b = trail[0];
      const g = ctx.createLinearGradient(b.x, b.y, p.x, p.y);
      g.addColorStop(0, 'rgba(240,244,250,0)'); g.addColorStop(1, 'rgba(240,244,250,.35)');
      ctx.strokeStyle = g; ctx.lineCap = 'round'; ctx.lineWidth = r * 1.7;
      ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(p.x, p.y); ctx.stroke();
    }
    ctx.save();
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = '#eef1f5'; ctx.fillRect(p.x - r, p.y - r, r * 2, r * 2);
    const a = ballSpin, ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(a * 0.37), sb = Math.sin(a * 0.37);
    for (const [x0, y0, z0] of ICO) {
      const y1 = y0 * ca - z0 * sa, z1 = y0 * sa + z0 * ca;
      const x2 = x0 * cb + z1 * sb, z2 = -x0 * sb + z1 * cb;
      if (z2 < -0.1) continue;
      // מחומש: חמש פינות, מכווץ בצד שפונה הצידה
      const cx0 = p.x + x2 * r * 0.88, cy0 = p.y - y1 * r * 0.88;
      const rad = r * 0.3, squash = Math.max(0.2, z2), ang = Math.atan2(-y1, x2);
      ctx.fillStyle = blur ? 'rgba(30,32,38,.55)' : '#1b1d22';
      ctx.beginPath();
      for (let q = 0; q < 5; q++) {
        const th = (q / 5) * Math.PI * 2 + a * 0.5;
        const lx = Math.cos(th) * rad * squash, ly = Math.sin(th) * rad;
        const rx = lx * Math.cos(ang) - ly * Math.sin(ang), ry = lx * Math.sin(ang) + ly * Math.cos(ang);
        if (q === 0) ctx.moveTo(cx0 + rx, cy0 + ry); else ctx.lineTo(cx0 + rx, cy0 + ry);
      }
      ctx.closePath(); ctx.fill();
    }
    // הצללה כדורית ונקודת ברק
    const g = ctx.createRadialGradient(p.x - r * 0.38, p.y - r * 0.42, r * 0.05, p.x, p.y, r * 1.05);
    g.addColorStop(0, 'rgba(255,255,255,.75)'); g.addColorStop(0.3, 'rgba(255,255,255,.08)'); g.addColorStop(0.7, 'rgba(0,0,0,.12)'); g.addColorStop(1, `rgba(0,0,0,${0.6 - 0.15 * light})`);
    ctx.fillStyle = g; ctx.fillRect(p.x - r, p.y - r, r * 2, r * 2);
    ctx.restore();
    return { x: p.x, y: p.y, r };
  }
  function drawBallShadows(pos, light) {
    const h = pos.y - BALL_R;
    for (const [dx, dz] of LIGHTS) {
      const g = proj(pos.x + dx * h * 0.6, 0, pos.z + dz * h * 0.6);
      if (!g) continue;
      const r = BALL_R * g.s * (1.15 + h * 0.4);
      ctx.fillStyle = `rgba(0,0,0,${Math.max(0.03, 0.2 - h * 0.06) * (0.5 + 0.5 * light)})`;
      ctx.beginPath(); ctx.ellipse(g.x, g.y, r, r * 0.3, 0, 0, Math.PI * 2); ctx.fill();
    }
  }

  // ===== ציור פריים =====
  function draw() {
    if (!W) return;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const lampL = lampLevel(T.lightL), lampR = lampLevel(T.lightR);
    const light = Math.min(1, ((lampL + lampR) / 2) * 0.6 + 0.4 * span(T.lightR, T.lightsFull));
    const push = 1 + 0.05 * (1 - easeOut(span(0, T.kick + 0.2)));
    // מצלמה ביד: תזוזה זעירה ואיטית, ורעידה ברגע הפגיעה
    const drift = reduced ? 0 : Math.sin(t * 0.7) * 0.6;
    const sx = (shake ? (Math.random() - 0.5) * shake : 0) + drift, sy = (shake ? (Math.random() - 0.5) * shake : 0) + drift * 0.5;
    ctx.save();
    ctx.translate(W / 2 + sx, H * 0.45 + sy); ctx.scale(push, push); ctx.translate(-W / 2, -H * 0.45);

    // שמיים
    const sky = ctx.createLinearGradient(0, 0, 0, Y0);
    sky.addColorStop(0, '#02030a'); sky.addColorStop(1, '#0a1128');
    ctx.fillStyle = sky; ctx.fillRect(-30, -30, W + 60, Y0 + 60);
    if (crowdImg) ctx.drawImage(crowdImg.c, 0, crowdImg.top, W, crowdImg.h);
    for (const sp of sparks) {
      const g = ctx.createRadialGradient(sp.x, sp.y, 0, sp.x, sp.y, sp.r * 4);
      g.addColorStop(0, `rgba(255,255,255,${sp.a})`); g.addColorStop(1, 'rgba(200,220,255,0)');
      ctx.fillStyle = g; ctx.fillRect(sp.x - sp.r * 4, sp.y - sp.r * 4, sp.r * 8, sp.r * 8);
    }
    if (boardsImg) {
      ctx.globalAlpha = 0.3 + 0.7 * light;
      ctx.drawImage(boardsImg.c, 0, boardsImg.y, W, boardsImg.h);
      ctx.globalAlpha = 1;
    }

    // דשא: פסי כיסוח בפרספקטיבה, מרקם, ובריכת אור
    const bands = [-13, -10, -7, -4, -1.5, 1, 3.5, 6, 8.5, 11, 13.4];
    for (let i = 0; i < bands.length - 1; i++) {
      const a1 = proj(-40, 0, bands[i]), a2 = proj(40, 0, bands[i]), b1 = proj(40, 0, bands[i + 1]), b2 = proj(-40, 0, bands[i + 1]);
      ctx.fillStyle = i % 2 ? '#1b6a35' : '#238143';
      ctx.beginPath(); ctx.moveTo(a1.x, a1.y); ctx.lineTo(a2.x, a2.y); ctx.lineTo(b1.x, b1.y); ctx.lineTo(b2.x, b2.y); ctx.fill();
    }
    const far = proj(0, 0, -13);
    if (grassImg) {
      ctx.save(); ctx.globalAlpha = 0.22; ctx.globalCompositeOperation = 'overlay';
      ctx.fillStyle = grassImg; ctx.fillRect(-30, far.y, W + 60, H - far.y + 60);
      ctx.restore();
    }
    const poolY = proj(0, 0, 3).y;
    const pool = ctx.createRadialGradient(W / 2, poolY, 10, W / 2, poolY, W);
    pool.addColorStop(0, `rgba(210,255,200,${0.13 * light})`); pool.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = pool; ctx.fillRect(-30, far.y, W + 60, H);
    // מרחוק הדשא נבלע בערפל
    const near4 = proj(0, 0, 4).y;
    const fade = ctx.createLinearGradient(0, far.y, 0, near4);
    fade.addColorStop(0, 'rgba(20,30,50,.45)'); fade.addColorStop(1, 'rgba(20,30,50,0)');
    ctx.fillStyle = fade; ctx.fillRect(-30, far.y, W + 60, near4 - far.y);

    // גיר
    ctx.strokeStyle = `rgba(236,240,236,${0.5 + 0.38 * light})`;
    ctx.lineCap = 'butt';
    const lp = easeOut(span(T.lines0, T.lines1));
    polyline([[-30, 0, 0], [30, 0, 0]], lp, 0.12);
    polyline([[-9.16, 0, 0], [-9.16, 0, 5.5], [9.16, 0, 5.5], [9.16, 0, 0]], lp, 0.12);
    polyline([[-20.16, 0, 0], [-20.16, 0, 13], [-30, 0, 13]], lp, 0.12);
    polyline([[20.16, 0, 0], [20.16, 0, 13], [30, 0, 13]], lp, 0.12);
    if (lp > 0.7 && t > T.kick) {
      const sp = proj(0, 0, 11);
      ctx.fillStyle = 'rgba(236,240,236,.7)';
      ctx.beginPath(); ctx.ellipse(sp.x, sp.y, 0.05 * sp.s, 0.016 * sp.s, 0, 0, Math.PI * 2); ctx.fill();
    }

    drawNet(light);
    drawBallShadows(ball, light);
    const flying = t > T.kick && t < T.impact;
    if (ball.z < 0) drawBall(ball, light, false);
    drawPosts(light);
    drawKeeper(light);
    if (ball.z >= 0) {
      const b = drawBall(ball, light, flying);
      if (b && flying) { trail.push(b); if (trail.length > 4) trail.shift(); }
    }

    // ערפל אור באוויר: שכבה רכה בגובה השער, בולטת רק כשהזרקורים דולקים
    const haze = ctx.createLinearGradient(0, Y0 - H * 0.12, 0, Y0 + H * 0.12);
    haze.addColorStop(0, 'rgba(170,190,230,0)'); haze.addColorStop(0.5, `rgba(170,190,230,${0.1 * light})`); haze.addColorStop(1, 'rgba(170,190,230,0)');
    ctx.fillStyle = haze; ctx.fillRect(-30, Y0 - H * 0.12, W + 60, H * 0.24);

    // זרקורים: עמודי תאורה בפינות, סוללת מנורות, ואלומה רכה בתוך הערפל
    for (const [side, lvl] of [[-1, lampL], [1, lampR]]) {
      const lx = side < 0 ? W * 0.07 : W * 0.93, ly = H * 0.06;
      ctx.fillStyle = '#05070c';
      ctx.fillRect(lx - 1.5, ly + 8, 3, Y0 - ly - 8);
      ctx.fillRect(lx - 17, ly - 9, 34, 19);
      if (!lvl) continue;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const beam = ctx.createRadialGradient(lx, ly, 2, lx, ly, H * 0.85);
      beam.addColorStop(0, `rgba(255,248,225,${0.22 * lvl})`); beam.addColorStop(0.3, `rgba(190,210,255,${0.06 * lvl})`); beam.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = beam; ctx.fillRect(0, 0, W, H);
      for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) {
        const x = lx - 13 + c * 6.5, y = ly - 5 + r * 5.5;
        const g = ctx.createRadialGradient(x, y, 0, x, y, 7);
        g.addColorStop(0, `rgba(255,255,248,${lvl})`); g.addColorStop(0.4, `rgba(255,250,230,${0.5 * lvl})`); g.addColorStop(1, 'rgba(255,250,230,0)');
        ctx.fillStyle = g; ctx.fillRect(x - 7, y - 7, 14, 14);
      }
      // הילה אופטית: פס אור אופקי דק כמו בעדשה
      const fl = ctx.createLinearGradient(lx - W * 0.35, 0, lx + W * 0.35, 0);
      fl.addColorStop(0, 'rgba(160,190,255,0)'); fl.addColorStop(0.5, `rgba(200,220,255,${0.22 * lvl})`); fl.addColorStop(1, 'rgba(160,190,255,0)');
      ctx.fillStyle = fl; ctx.fillRect(lx - W * 0.35, ly - 1, W * 0.7, 2);
      ctx.restore();
    }
    ctx.restore();

    // חושך לפני שהאורות נדלקים
    if (light < 1) { ctx.fillStyle = `rgba(2,4,10,${0.84 * (1 - light)})`; ctx.fillRect(0, 0, W, H); }
    // ויניטה וגרעין
    const vg = ctx.createRadialGradient(W / 2, H * 0.42, Math.min(W, H) * 0.3, W / 2, H * 0.45, Math.max(W, H) * 0.78);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.6)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    if (grainImg) {
      ctx.save(); ctx.globalAlpha = 0.05; ctx.globalCompositeOperation = 'overlay';
      ctx.translate((Math.random() * 128) | 0, (Math.random() * 128) | 0);
      ctx.fillStyle = grainImg; ctx.fillRect(-128, -128, W + 256, H + 256);
      ctx.restore();
    }
    if (flash > 0) { ctx.fillStyle = `rgba(255,255,255,${flash})`; ctx.fillRect(0, 0, W, H); }
  }

  // ===== עדכון מצב לפי הזמן =====
  function update(dt) {
    if (t < T.kick) {
      ball = { ...START }; ballSpin = 0;
    } else if (t < T.impact) {
      const u = (t - T.kick) / (T.impact - T.kick);
      ball = ballAt(flightP(u));
      ballSpin += dt * 26;
    } else {
      if (!goalFired) {
        goalFired = true;
        hitNet(AIM.x, AIM.y, 8);
        shake = 6; flash = 0.18;
        for (let i = 0; i < 60; i++) spawnSpark();
        if (onGoal) onGoal();
      }
      const since = t - T.impact;
      const fall = Math.max(0, since - 0.18);
      const y = Math.max(BALL_R, AIM.y - 0.5 * 9.8 * fall * fall * 0.6);
      const bounce = y === BALL_R ? Math.abs(Math.sin((fall - 0.6) * 9)) * Math.max(0, 0.18 - (fall - 0.6) * 0.2) : 0;
      ball = { x: AIM.x - Math.min(0.25, since * 0.2), y: y + bounce, z: Math.min(-1.55, AIM.z + netDzAt(AIM.x, AIM.y) * 0.9 + Math.min(0.25, since * 0.3)) };
      ballSpin += dt * Math.max(0, 6 - since * 8);
      trail.length = 0;
    }
    stepNet(Math.min(dt, 1 / 20));
    shake = Math.max(0, shake - dt * 20);
    flash = Math.max(0, flash - dt * 0.9);
    const idle = t > 0.8 ? 2.5 : 0;
    const burst = t > T.impact && t < T.impact + 1.6 ? 24 : 0;
    if (Math.random() < (idle + burst) * dt) spawnSpark();
    for (let i = sparks.length - 1; i >= 0; i--) {
      sparks[i].a -= dt * 2.4;
      if (sparks[i].a <= 0) sparks.splice(i, 1);
    }
    if (!doneFired && t >= T.done) { doneFired = true; if (onDone) onDone(); }
  }
  function spawnSpark() {
    if (!crowdImg) return;
    sparks.push({ x: Math.random() * W, y: crowdImg.top + crowdImg.h * 0.08 + Math.random() * crowdImg.h * 0.85, r: 0.7 + Math.random() * 1.1, a: 0.95 });
  }

  // ===== לולאה =====
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;
    if (document.hidden) { raf = requestAnimationFrame(frame); return; }
    t += dt;
    update(dt);
    draw();
    // אחרי הרצף האצטדיון ממשיך לחיות כמה שניות (רשת נרגעת, הבזקים), ואז נעצר
    if (t > T.done + 8) { running = false; return; }
    raf = requestAnimationFrame(frame);
  }

  function setFinal() {
    t = T.done + 2; goalFired = true; doneFired = true;
    net.dz.fill(0); net.v.fill(0); trail.length = 0; shake = 0; flash = 0;
    ball = { x: AIM.x - 0.25, y: BALL_R, z: -1.55 }; ballSpin = 1.2;
  }

  const api = {
    play() {
      cancelAnimationFrame(raf);
      t = 0; goalFired = false; doneFired = false;
      net.dz.fill(0); net.v.fill(0); sparks.length = 0; trail.length = 0; shake = 0; flash = 0;
      if (reduced) { setFinal(); draw(); if (onDone) onDone(); return; }
      running = true; last = performance.now();
      raf = requestAnimationFrame(frame);
    },
    skip() {
      if (!running) return;
      const fireGoal = !goalFired;
      setFinal(); draw();
      if (fireGoal && onGoal) onGoal({ skipped: true });
      if (onDone) onDone();
      running = false; cancelAnimationFrame(raf);
    },
    destroy() { cancelAnimationFrame(raf); running = false; window.removeEventListener('resize', resize); }
  };

  window.addEventListener('resize', resize);
  resize();
  return api;
}

function shadeHex(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.round(((n >> 16) & 255) * f));
  const g = Math.min(255, Math.round(((n >> 8) & 255) * f));
  const b = Math.min(255, Math.round((n & 255) * f));
  return `rgb(${r},${g},${b})`;
}

function mulberry(seed) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let x = Math.imul(a ^ (a >>> 15), 1 | a);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}
