// הפיזיקה וההחלטות של משחק הבעיטות. בלי ציור ובלי DOM, כדי שאפשר יהיה
// לבדוק את רמת הקושי בסימולציה (penalty.test.mjs).
//
// יחידות: מטרים ושניות. x ימינה, y למעלה, z לכיוון המצלמה. קו השער ב-z=0,
// השוער עומד ב-z=0.35, נקודת הפנדל ב-z=11.
//
// מה עושה את זה אמיתי:
// - השוער מחליט לפני הבעיטה (ימין, שמאל או להישאר), כמו שוער אמיתי - כדור
//   מגיע לשער מהר מכדי להגיב עליו. הוא לא יודע לאן בעטת.
// - אחרי זמן תגובה הוא מתקן לכיוון הכדור, אבל רק כמה שהזמן מאפשר. כדור
//   חזק לא משאיר זמן, כדור איטי כן. לצד השני כמעט אי אפשר לתקן.
// - טווח הידיים מוגבל: קל להגיע לגובה בינוני, קשה לפינה התחתונה, וכמעט
//   אי אפשר לחיבורים העליונים.
// - כוח מול דיוק: בעיטה חזקה מהירה אבל מפוזרת. פינה עליונה היא סיכון של
//   ממש - הרבה כדורים עפים מעל או החוצה.
// - קורות: כדור שפוגע בקורה נכנס או יוצא, לפי הצד שבו פגע.
//
// השוער לא לומד את השחקן. ככל שהרצף עולה הוא מגיב מהר יותר, מתקן מהר
// יותר, ולפעמים "קורא" את הבועט (כמו שוער שמסתכל על הגוף לפני הבעיטה).

export const GOAL_W = 7.32;
export const GOAL_H = 2.44;
export const HALF = GOAL_W / 2;
export const BALL_R = 0.11;
export const POST_R = 0.06;
export const SPOT_Z = 11;
export const KEEPER_Z = 0.35;
export const START = { x: 0, y: BALL_R, z: SPOT_Z };

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
export const easeOut = (k) => 1 - Math.pow(1 - k, 3);

// ===== תנוחות השוער (מטרים ביחס לאגן, הגוף "למעלה") =====
export const POSE = {
  ready: { sh: 0.5, head: [0, 0.74], el: [-0.36, 0.33], er: [0.36, 0.33], hl: [-0.5, 0.15], hr: [0.5, 0.15], kl: [-0.25, -0.44], kr: [0.25, -0.44], fl: [-0.3, -0.92], fr: [0.3, -0.92] },
  dive: { sh: 0.53, head: [0.03, 0.78], el: [0.0, 0.98], er: [-0.1, 0.94], hl: [0.08, 1.3], hr: [-0.12, 1.25], kl: [-0.08, -0.48], kr: [0.18, -0.42], fl: [-0.16, -0.95], fr: [0.14, -0.9] }
};
const JOINTS = ['head', 'el', 'er', 'hl', 'hr', 'kl', 'kr', 'fl', 'fr'];

export function blendPose(d, mirror = false) {
  const pose = { sh: lerp(POSE.ready.sh, POSE.dive.sh, d) };
  for (const k of JOINTS) {
    const a = POSE.ready[k], b = POSE.dive[k];
    const x = lerp(a[0], b[0], d);
    pose[k] = [mirror ? -x : x, lerp(a[1], b[1], d)];
  }
  if (mirror) {
    // ימין ושמאל מתחלפים גם בשמות, כדי שהצד הרחוק יצויר ראשון
    [pose.el, pose.er] = [pose.er, pose.el];
    [pose.hl, pose.hr] = [pose.hr, pose.hl];
    [pose.kl, pose.kr] = [pose.kr, pose.kl];
    [pose.fl, pose.fr] = [pose.fr, pose.fl];
  }
  return pose;
}

// ===== רמת קושי לפי הרצף =====
export function keeperSkill(streak = 0) {
  const s = Math.max(0, streak);
  return {
    react: 0.3 - Math.min(0.1, s * 0.012),   // שניות עד שהוא מזהה לאן הכדור הולך
    vAdj: 2.4 + Math.min(1.4, s * 0.15),      // מהירות התיקון אחרי שזיהה (מ'/ש')
    read: Math.min(0.3, s * 0.03)              // סיכוי "לקרוא" את הבועט מראש
  };
}

// ===== תכנית השוער: מחליט לפני הבעיטה =====
// אסטרטגיה מעורבת: 37.5% שמאלה, 37.5% ימינה, 25% נשאר. כך אף נקודה אחת בשער
// לא "שבורה": אמצע נעצר כשהוא נשאר, פינות כשניחש נכון.
export function keeperPlan(shotTarget, skill, rand = Math.random) {
  const zone = shotTarget.x < -0.9 ? -1 : shotTarget.x > 0.9 ? 1 : 0;
  let side;
  if (rand() < skill.read) side = zone;
  else {
    const r = rand();
    side = r < 0.375 ? -1 : r < 0.75 ? 1 : 0;
  }
  if (side === 0) {
    // נשאר באמצע: כפוף ומוכן, מגיב לכדור אחרי זמן התגובה
    return { side, gx: 0, gy: 0.8, start: skill.react, launch: [0, 0.95] };
  }
  const h = rand();
  const gy = h < 0.42 ? 0.25 + rand() * 0.45 : h < 0.72 ? 0.8 + rand() * 0.7 : 1.6 + rand() * 0.6;
  return {
    side,
    gx: side * (1.5 + rand() * 1.7),
    gy,
    // שוער אמיתי יוצא לקפיצה בערך ברגע הבעיטה
    start: -0.15 + rand() * 0.1,
    launch: [side * 0.3, 0.95]
  };
}

// ===== תנועת השוער בזמן t (שניות מהבעיטה) =====
const DIVE_T = 0.68;
// קפיצה מתחילה לאט (דחיפה מהקרקע) ומאיצה
const diveEase = (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
const REACH = 2.45; // מהאגן לכפות בקפיצה מלאה, פחות האורך של הכפפות

export function keeperAt(t, plan, ballTarget, skill) {
  // התיקון: אחרי זמן התגובה הוא נמשך לכיוון הכדור, כמה שהזמן מאפשר
  // מי שכבר קפץ לצד אחד לא חוזר: לאמצע רק ברגל או ביד שנשארה מאחור,
  // ולצד השני כמעט בכלל לא
  const sameSide = plan.side === 0 || Math.sign(ballTarget.x) === plan.side;
  const factor = sameSide ? 1 : Math.abs(ballTarget.x) < 0.6 ? 0.35 : 0.15;
  const seen = Math.max(0, t - skill.react);
  const allowed = skill.vAdj * seen * factor;
  let gx = plan.gx, gy = plan.gy;
  const ex = ballTarget.x - gx, ey = ballTarget.y - gy, el = Math.hypot(ex, ey);
  if (el > 0) { const k = Math.min(1, allowed / el); gx += ex * k; gy += ey * k; }
  // טווח הידיים מנקודת הזינוק. כשיש זמן הוא גם צועד לכיוון הכדור לפני
  // הקפיצה, וכך מגיע רחוק יותר לבעיטה איטית
  const step = sameSide && plan.side !== 0 ? plan.side * 0.7 * clamp(seen / 0.5, 0, 1) : 0;
  const lx = plan.launch[0] + step, ly = plan.launch[1];
  let dx = gx - lx, dy = gy - ly;
  const dl = Math.hypot(dx, dy);
  if (dl > REACH) { dx *= REACH / dl; dy *= REACH / dl; }
  gx = lx + dx; gy = ly + dy;

  const e = diveEase(clamp((t - plan.start) / DIVE_T, 0, 1));
  const hx = lerp(0, gx, e), hy = lerp(1.1, gy, e);
  const vx = hx - lx, vy = hy - ly;
  const ul = Math.hypot(vx, vy) || 1;
  // כמה "שכוב" הוא: רק בקפיצה רחוקה הוא באמת נמתח לאורך
  const ext = clamp(Math.hypot(gx - lx, gy - ly) / 1.4, 0, 1) * e;
  // כיוון הגוף, עד אופקי לכל היותר. לכדור נמוך באמצע הוא נופל הצידה
  // עליו - לא מתהפך עם הרגליים למעלה
  const dir = vx > 0.02 ? 1 : vx < -0.02 ? -1 : (Math.sign(ballTarget.x) || 1);
  const ang = clamp(Math.atan2(-vx, vy), -1.55, 1.55) || 0;
  const a = Math.abs(ang) < 0.01 && vy < 0 ? -1.55 * dir : ang;
  const ux = -Math.sin(a), uy = Math.cos(a);
  const rot = a * ext;
  // האגן נמצא מאחורי הידיים לאורך הגוף, אבל לא מעבר לנקודת הזינוק
  const back = Math.min(1.3, ul);
  const x = lerp(0, hx - ux * back, ext);
  const y = Math.max(0.2, lerp(0.95, hy - uy * back, ext));
  const pose = blendPose(ext, ux < 0);
  return { x, y, rot, pose, d: ext };
}

// נקודה בגוף השוער (מטרים ביחס לאגן) -> עולם
const toWorld = (k, [px, py]) => {
  const c = Math.cos(k.rot), s = Math.sin(k.rot);
  return [k.x + px * c - py * s, k.y + px * s + py * c];
};
// הגוף כקפסולות: גו, שתי ידיים עם כפפות, רגליים
export function keeperCapsules(k) {
  const p = k.pose;
  const tip = (hand, elbow) => [hand[0] + (hand[0] - elbow[0]) * 0.55, hand[1] + (hand[1] - elbow[1]) * 0.55];
  return [
    [toWorld(k, [0, 0]), toWorld(k, [0, p.sh + 0.25]), 0.2],
    [toWorld(k, [-0.2, p.sh]), toWorld(k, tip(p.hl, p.el)), 0.12],
    [toWorld(k, [0.2, p.sh]), toWorld(k, tip(p.hr, p.er)), 0.12],
    [toWorld(k, [-0.1, 0]), toWorld(k, p.fl), 0.11],
    [toWorld(k, [0.1, 0]), toWorld(k, p.fr), 0.11]
  ];
}
const segDist = (px, py, [ax, ay], [bx, by]) => {
  const vx = bx - ax, vy = by - ay, L2 = vx * vx + vy * vy || 1;
  const k = clamp(((px - ax) * vx + (py - ay) * vy) / L2, 0, 1);
  return Math.hypot(px - ax - vx * k, py - ay - vy * k);
};

// ===== מהמחווה לבעיטה =====
// aim: לאן כיוונת (מטרים על קו השער). power 0..1. curl -1..1
// הפיזור גדל עם הכוח ועם הסיבוב: בעיטה חזקה לפינה עליונה היא הימור
export function executeShot({ aim, power, curl = 0 }, rand = Math.random) {
  const gauss = () => {
    let u = 0, v = 0;
    while (u === 0) u = rand();
    while (v === 0) v = rand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  const sigma = 0.2 + 0.5 * power * power + 0.06 * Math.abs(curl);
  // להרים כדור גבוה פחות מדויק מלבעוט נמוך
  const sigmaY = sigma * (0.75 + 0.45 * Math.min(1, aim.y / GOAL_H));
  return {
    x: aim.x + gauss() * sigma,
    y: Math.max(BALL_R, aim.y + gauss() * sigmaY),
    power,
    curl,
    flight: 0.95 - 0.5 * power // שניות עד קו השער
  };
}

// מסלול הכדור עד קו השער: קשת קלה, וסיבוב שמעקם אותו באמצע הדרך
export function ballPath(shot) {
  const lift = (0.15 + 0.35 * (1 - shot.power)) * (1 - Math.min(1, shot.y / 2.4) * 0.5);
  return (t) => {
    const p = t / shot.flight;
    const q = p * (1.08 - 0.08 * p); // מאט מעט באוויר
    const bend = Math.sin(Math.PI * Math.min(1, q)) * shot.curl * 0.8;
    return {
      x: lerp(START.x, shot.x, q) + bend,
      y: Math.max(BALL_R, lerp(START.y, shot.y, q) + Math.sin(Math.PI * Math.min(1, q)) * lift),
      z: lerp(START.z, 0, q)
    };
  };
}

// הזמן שבו הכדור מגיע ל-z נתון
export const timeAtZ = (shot, z) => {
  // q(p) = p(1.08 - 0.08p) = 1 - z/11  ->  פותרים את המשוואה הריבועית
  const q = 1 - z / SPOT_Z;
  const p = (1.08 - Math.sqrt(1.08 * 1.08 - 4 * 0.08 * q)) / (2 * 0.08);
  return p * shot.flight;
};

// ===== התוצאה =====
// goal | save | catch | post-in | post-out | bar-out | wide | over
export function resolveShot(shot, plan, skill) {
  const path = ballPath(shot);
  const target = { x: shot.x, y: shot.y };
  const tk = timeAtZ(shot, KEEPER_Z);
  const bk = path(tk);
  const k = keeperAt(tk, plan, target, skill);
  for (const [a, b, r] of keeperCapsules(k)) {
    const d = segDist(bk.x, bk.y, a, b);
    if (d < r + BALL_R) {
      // כדור איטי שמגיע לגוף או לכפות - נתפס. חזק או בקצה - נהדף
      const central = d < r * 0.6 && shot.power < 0.55;
      return { outcome: central ? 'catch' : 'save', tHit: tk, at: bk, keeper: k };
    }
  }
  const t0 = shot.flight;
  const ax = Math.abs(shot.x), y = shot.y;
  const touchPost = Math.abs(ax - HALF) < BALL_R + POST_R && y < GOAL_H + POST_R;
  const touchBar = Math.abs(y - GOAL_H) < BALL_R + POST_R && ax < HALF + POST_R;
  if (touchPost || touchBar) {
    const inside = ax < HALF && y < GOAL_H;
    // נגיעה קלה מבפנים היא סתם גול. "מהקורה" רק כשהכדור באמת פגע בה
    const deep = Math.min(Math.abs(ax - HALF), Math.abs(y - GOAL_H)) < BALL_R * 0.7;
    if (!inside || deep) {
      return { outcome: inside ? 'post-in' : touchBar && !touchPost ? 'bar-out' : 'post-out', tHit: t0, at: { x: shot.x, y, z: 0 } };
    }
  }
  if (ax > HALF) return { outcome: 'wide', tHit: t0, at: { x: shot.x, y, z: 0 } };
  if (y > GOAL_H) return { outcome: 'over', tHit: t0, at: { x: shot.x, y, z: 0 } };
  return { outcome: 'goal', tHit: t0, at: { x: shot.x, y, z: 0 } };
}

export const isGoal = (o) => o === 'goal' || o === 'post-in';

export const OUTCOME_TEXT = {
  goal: 'גול!',
  'post-in': 'גול מהקורה!',
  save: 'הצלה!',
  catch: 'נתפס!',
  'post-out': 'קורה!',
  'bar-out': 'משקוף!',
  wide: 'החוצה',
  over: 'מעל המשקוף'
};

// בעיטה שלמה: מהכוונה ועד התוצאה
export function playShot(input, streak, rand = Math.random) {
  const skill = keeperSkill(streak);
  const shot = executeShot(input, rand);
  const plan = keeperPlan(shot, skill, rand);
  const res = resolveShot(shot, plan, skill);
  return { shot, plan, skill, ...res };
}

// נקודת הכפפות בעולם (אמצע שתי הכפות) - לכדור שנתפס
export function keeperHands(k) {
  const p = k.pose;
  const tip = (hand, elbow) => [hand[0] + (hand[0] - elbow[0]) * 0.55, hand[1] + (hand[1] - elbow[1]) * 0.55];
  const a = toWorld(k, tip(p.hl, p.el)), b = toWorld(k, tip(p.hr, p.er));
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
}

// ===== מהמחווה על המסך לבעיטה =====
// goalPt(x, y) ממיר נקודה במסך לנקודה על קו השער (מטרים).
// path: נקודות האצבע [{x, y, t}] מההתחלה ועד השחרור.
// מחזיר null למחווה שאינה בעיטה (גרירה למטה, תזוזה קטנה לצד).
export function shotFromGesture(path, { goalPt, groundY, ball }) {
  if (!path.length) return null;
  const S = path[0], E = path[path.length - 1];
  const dx = E.x - S.x, dy = E.y - S.y, len = Math.hypot(dx, dy);
  // הקשה: בעיטה מדויקת לנקודה, בכוח בינוני
  if (len < 12) {
    const p = S.y <= groundY ? goalPt(S.x, S.y) : { x: goalPt(S.x, groundY).x, y: 0.15 };
    return { aim: { x: p.x, y: Math.max(BALL_R, p.y) }, power: 0.45, curl: 0 };
  }
  if (dy > -25 || Math.abs(dx) > -dy * 2.5) return null;
  // לאן: הנקודה שבה עזבת את המסך. החלקה קצרה שלא הגיעה לשער - נמוכה,
  // בהמשך הקו מהכדור
  let aim;
  if (E.y <= groundY) aim = goalPt(E.x, E.y);
  else aim = { x: goalPt(ball.x + (dx / dy) * (groundY - ball.y), groundY).x, y: 0.15 };
  // כוח: מהירות ההחלקה (פיקסלים למילישנייה)
  const dur = Math.max(16, E.t - S.t);
  const power = clamp((len / dur - 0.4) / 1.6, 0, 1);
  // סיבוב: כמה הדרך התעקלה הצידה ביחס לקו הישר
  let bulge = 0;
  for (const P of path) {
    const d = (dx * (P.y - S.y) - dy * (P.x - S.x)) / len;
    if (Math.abs(d) > Math.abs(bulge)) bulge = d;
  }
  // d חיובי = האצבע עברה מימין לקו (במסך) -> הכדור מתעקל ימינה
  const curl = clamp(bulge / 50, -1, 1);
  return { aim: { x: aim.x, y: Math.max(BALL_R, aim.y) }, power, curl: Math.abs(curl) < 0.15 ? 0 : curl };
}
