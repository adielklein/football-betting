// עזרי המספרים של המצב החי.
//
// שתי פונקציות טהורות שמופרדות מהרכיבים במכוון: הצגת מספר וזיהוי שער הן
// שתי החלטות שקל לטעות בהן בשקט, ורכיב שמצייר אותן לא ניתן לבדיקה.

// הניקוד מוצג כמו שהוא - 5 ולא 5.0, 5.4 ולא 5.40. באמצע גלגול המספר
// מקבל ערכי ביניים שבריריים, וזו בדיוק הצורה שמנקה אותם.
export const formatScore = (n) => {
  const v = Number(n);
  if (!Number.isFinite(v)) return '0';
  return String(Math.round(v * 10) / 10);
};

// האם נכנס שער בין שתי תמונות מצב של אותו משחק.
//
// שינוי בלבד לא מספיק: התמונה הראשונה שנטענת אחרי פתיחת המסך משנה את
// הערך מ"אין" ל-2-1 בלי ששום דבר קרה במגרש, ואילו הבזקנו עליה היה נדמה
// שנפלו שני שערים בכניסה לאפליקציה.
export const isGoal = (before, after) => {
  if (!before || !after) return false;
  const pair = (x) => (x.team1Goals == null || x.team2Goals == null ? null : `${x.team1Goals}-${x.team2Goals}`);
  const a = pair(before);
  const b = pair(after);
  return a !== null && b !== null && a !== b;
};

// זמני השערים לכל המשחקים, מתוך השוואה בין סריקה לסריקה. מפה של
// matchId -> חותמת זמן, וזו החותמת שמפעילה את ההבזק מחדש.
export const goalTimestamps = (before, after, previousStamps = {}, now = Date.now()) => {
  const stamps = { ...previousStamps };
  Object.keys(after).forEach((id) => {
    if (isGoal(before[id], after[id])) stamps[id] = now;
  });
  return stamps;
};

// מי הבקיע: לכל משחק שנכנס בו שער, הצד שהשערים שלו עלו (1 או 2) וחותמת זמן.
// החולצה של הקבוצה המבקיעה קופצת לפי זה. ביטול שער (המספר ירד) אינו "שער".
export const goalScorers = (before, after, previous = {}, now = Date.now()) => {
  const out = { ...previous };
  Object.keys(after).forEach((id) => {
    const a = before[id];
    const b = after[id];
    if (!isGoal(a, b)) return;
    const side = b.team1Goals > a.team1Goals ? 1 : b.team2Goals > a.team2Goals ? 2 : null;
    if (side) out[id] = { at: now, side };
  });
  return out;
};
