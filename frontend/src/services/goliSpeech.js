// גולי "מקריא" טקסט: הופך משפט לרצף צורות פה ([צורה, מילישניות]), כך
// שהפה זז לפי המילים ונמשך בערך כמו זמן הקריאה של הטקסט.
// צורות: closed (סגור בחיוך), mid (חצי פתוח), o (עגול), wide (פתוח).
//
// בעברית בלי ניקוד אין תנועות כתובות, אז הולכים לפי האותיות:
//   מ ב פ (וגם m b p) - השפתיים נסגרות לפני ההברה
//   ו (וגם o u w)       - פה עגול
//   א ה ע (וגם a e)     - פה פתוח
//   כל השאר             - חצי פתוח
// כל מילה מתחלקת להברות (בערך אות ותנועה לכל שתי אותיות), בין מילים
// סגירה קצרה, ואחרי סימני פיסוק עצירה כמו נשימה.

const SYL_OPEN = 105;   // זמן פתיחה בהברה
const SYL_CLOSE = 40;   // סגירה קצרה בין הברות
const WORD_GAP = 55;    // בין מילים
const PAUSE = 230;      // אחרי . , ! ? - :
const MAX_MS = 14000;   // שלא ידבר בלי סוף על טקסט ארוך

const LETTER = /[א-תA-Za-z0-9]/;
const LIPS = /[מםבפףmbpMBP]/;
const ROUND = /[וoOuUwW]/;
const WIDE = /[אהעaAeE]/;

const shapeOf = (chunk) => (ROUND.test(chunk) ? 'o' : WIDE.test(chunk) ? 'wide' : 'mid');

export const speechSeq = (text) => {
  const seq = [];
  let total = 0;
  const push = (v, ms) => {
    const last = seq[seq.length - 1];
    if (last && last[0] === v) last[1] += ms; else seq.push([v, ms]);
    total += ms;
  };
  const tokens = String(text || '').match(/[א-תA-Za-z0-9]+|[.,!?:;\-–]+/g) || [];
  for (const tok of tokens) {
    if (total > MAX_MS) break;
    if (!LETTER.test(tok[0])) { push('closed', PAUSE); continue; }
    // מספרים נקראים כמילה של שתי הברות ("שלוש", "שתיים")
    const word = /^\d+$/.test(tok) ? 'שלש' : tok;
    const n = Math.max(1, Math.round(word.length / 2));
    for (let i = 0; i < n; i++) {
      const chunk = word.slice(i * 2, i * 2 + 2) || word.slice(-1);
      if (LIPS.test(chunk[0])) push('closed', 40);
      push(shapeOf(chunk), SYL_OPEN);
      if (i < n - 1) push('closed', SYL_CLOSE);
    }
    push('closed', WORD_GAP);
  }
  if (!seq.length) return seq;
  // מסיים בפה סגור לרגע
  if (seq[seq.length - 1][0] === 'closed') seq[seq.length - 1][1] = Math.max(seq[seq.length - 1][1], 160);
  else push('closed', 160);
  return seq;
};

export const speechMs = (seq) => seq.reduce((s, [, ms]) => s + ms, 0);
