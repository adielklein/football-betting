// חלוקת התחרויות לקבוצות בבורר הייבוא.
//
// רשימה שטוחה של עשרים ותשע תחרויות מחייבת לקרוא את כולן כדי למצוא אחת,
// והיא גם מטשטשת את ההבדל שבאמת מעניין: ליגה משוחקת כל שבוע, גביע רק
// בסיבובים, ותחרות נבחרות רק בחלונות. מי שבונה שבוע חושב בקבוצות האלה.
//
// החלוקה נגזרת מהנתונים שכבר יש על הליגה ולא מרשימה קבועה, כדי שתחרות
// חדשה תיפול למקום הנכון בלי לגעת כאן.

const CUP_PATTERN = /גביע|קופה|קאפ|cup/i;

const groupOf = (league) => {
  if (league.type === 'national') return 'national';
  // תחרויות המועדונים של אופ"א הן גביעים מבחינת מבנה, אבל מי שמחפש
  // אותן מחפש "אירופאיות" ולא "גביעים"
  if (league.region === 'אירופה') return 'european';
  if (CUP_PATTERN.test(league.name || '') || /cup/i.test(league.key || '')) return 'cup';
  return 'league';
};

const GROUPS = [
  { key: 'league', label: 'ליגות', icon: '🏆' },
  { key: 'cup', label: 'גביעים', icon: '🥇' },
  { key: 'european', label: 'אירופאיות', icon: '⭐' },
  { key: 'national', label: 'נבחרות', icon: '🌐' }
];

/**
 * @returns [{ key, label, icon, leagues }] - רק קבוצות שיש בהן תחרויות
 */
const groupLeagues = (leagues = []) =>
  GROUPS
    .map((group) => ({ ...group, leagues: leagues.filter((l) => groupOf(l) === group.key) }))
    .filter((group) => group.leagues.length > 0);

export { groupLeagues, groupOf, GROUPS };
