// מעבר בין לשוניות בהחלקת אצבע.
//
// שתי החלטות שקובעות אם המחווה מרגישה נכונה או מעצבנת, ולכן הן כאן
// כפונקציות טהורות ולא בתוך רכיב.

// כיוון ההחלקה, או null כשזו לא הייתה החלקה בכלל.
//
// שלושה מסננים, וכל אחד מהם קיים בגלל תנועה אמיתית שאסור לחטוף:
// גלילה אנכית (הרוב המוחלט של המגע במסך), לחיצה שזזה קצת, וגרירה איטית
// שהיא בדרך כלל ניסיון לסמן טקסט.
//
// RTL: הלשוניות מסודרות מימין לשמאל - "הימורים" בקצה הימני - ולכן
// הלשונית הבאה נמצאת משמאל, ומביאים אותה על ידי גרירת המסך ימינה.
export const swipeIntent = ({ dx, dy, dt }, options = {}) => {
  const { minDistance = 60, maxDuration = 700, ratio = 1.6 } = options;

  if (!Number.isFinite(dx) || !Number.isFinite(dy) || !Number.isFinite(dt)) return null;
  if (dt > maxDuration) return null;
  if (Math.abs(dx) < minDistance) return null;
  if (Math.abs(dx) < Math.abs(dy) * ratio) return null;

  return dx > 0 ? 'next' : 'prev';
};

// הלשונית שאליה עוברים, או null כשאין לאן.
//
// אין מעבר מעגלי בכוונה: החלקה אחת אחרי הלשונית האחרונה שמחזירה לראשונה
// מרגישה כמו תקלה, ובעיקר גורמת למי שמחליק ברצף לאבד את מקומו.
export const stepTab = (keys, current, intent) => {
  if (!intent) return null;
  const i = keys.indexOf(current);
  if (i < 0) return null;
  const j = intent === 'next' ? i + 1 : i - 1;
  return j >= 0 && j < keys.length ? keys[j] : null;
};
