// מבנה חולצת הבית של כל קבוצה, לפי מספר הקבוצה ב-365 (team1ExternalId /
// team2ExternalId על המשחק). 365 מחזירים רק שני צבעים אחידים לקבוצה, בלי
// תבנית - ולכן ברצלונה יצאה כחולה אחידה וניוקאסל שחורה. כאן נכתב ידנית
// המבנה המסורתי: פסים, חצאים, שרוולים וכו'. בלי ספונסר ובלי סמל יצרן -
// רק הסמל של הקבוצה על החזה, כמו בשאר האפליקציה.
//
// קבוצה שלא כאן מקבלת חולצה אחידה בצבע מ-365. כשקבוצה מחליפה מבנה (נדיר -
// רובן שומרות עליו שנים), מעדכנים כאן.
//
// p: solid | stripes | hoops | halves | sash | checks | band | centerband
// body: צבע הבסיס. alt: הצבע השני של התבנית. sleeves / collar: אופציונלי.

const W = '#FFFFFF';
const K = '#111111';

export const KITS = {
  // ===== פרמייר ליג =====
  104: { p: 'solid', body: '#EF0107', sleeves: W, collar: W },          // ארסנל
  38: { p: 'stripes', body: '#0057B8', alt: W, collar: '#0057B8' },     // ברייטון
  110: { p: 'solid', body: '#6CABDD', collar: W },                      // מנצ'סטר סיטי
  108: { p: 'solid', body: '#C8102E', collar: '#C8102E' },              // ליברפול
  50: { p: 'stripes', body: '#DA291C', alt: K, collar: K },             // בורנמות'
  36: { p: 'solid', body: W, collar: '#1D428A' },                       // לידס
  107: { p: 'solid', body: '#003399', collar: W },                      // אברטון
  106: { p: 'solid', body: '#034694', collar: W },                      // צ'לסי
  114: { p: 'solid', body: W, collar: '#132257' },                      // טוטנהאם
  63: { p: 'stripes', body: '#E30613', alt: W, sleeves: K, collar: K }, // ברנטפורד
  11: { p: 'stripes', body: '#F5A12D', alt: K, collar: K },             // האל סיטי
  109: { p: 'solid', body: '#670E36', sleeves: '#95BFE5', collar: '#95BFE5' }, // אסטון וילה
  116: { p: 'stripes', body: K, alt: W, collar: K },                    // ניוקאסל
  24: { p: 'solid', body: '#59CBE8', collar: W },                       // קובנטרי
  120: { p: 'solid', body: W, collar: K },                              // פולהאם
  9: { p: 'solid', body: '#0044A9', collar: W },                        // איפסוויץ'
  29: { p: 'solid', body: '#DD0000', collar: W },                       // נוטינגהאם פורסט
  117: { p: 'stripes', body: '#EB172B', alt: W, collar: K },            // סנדרלנד
  105: { p: 'solid', body: '#DA291C', collar: W },                      // מנצ'סטר יונייטד
  10: { p: 'stripes', body: '#C4122E', alt: '#1B458F', collar: '#1B458F' }, // קריסטל פאלאס

  // ===== לה ליגה =====
  132: { p: 'stripes', body: '#A50044', alt: '#004D98', collar: '#EDBB00' }, // ברצלונה
  131: { p: 'solid', body: W, collar: '#FEBE10' },                      // ריאל מדריד
  134: { p: 'stripes', body: '#CB3524', alt: W, sleeves: '#CB3524', collar: '#272E61' }, // אתלטיקו
  146: { p: 'stripes', body: '#00954C', alt: W, collar: '#00954C' },    // בטיס
  154: { p: 'stripes', body: '#0067B1', alt: W, collar: '#0067B1' },    // ריאל סוסיאדד
  135: { p: 'solid', body: W, collar: '#D2152B' },                      // סביליה
  137: { p: 'solid', body: W, collar: '#00804A' },                      // ראסינג
  144: { p: 'stripes', body: '#EE2523', alt: W, collar: K },            // אתלטיק בילבאו
  168: { p: 'stripes', body: '#0761AF', alt: W, collar: '#0761AF' },    // אלאבס
  133: { p: 'solid', body: '#FFE667', collar: '#005187' },              // ויאריאל
  136: { p: 'stripes', body: '#007FC8', alt: W, collar: '#007FC8' },    // אספניול
  148: { p: 'stripes', body: '#0062B8', alt: W, collar: '#0062B8' },    // דפורטיבו
  143: { p: 'solid', body: '#D91A21', collar: '#0A346F' },              // אוסאסונה
  158: { p: 'solid', body: '#8AC3EE', collar: W },                      // סלטה
  174: { p: 'sash', body: W, alt: '#E53027', collar: '#E53027' },       // ראיו ואיקנו
  139: { p: 'solid', body: W, collar: K },                              // ולנסיה
  140: { p: 'solid', body: '#005999', collar: W },                      // חטאפה
  150: { p: 'stripes', body: '#00519E', alt: '#B4053F', collar: '#00519E' }, // לבאנטה
  156: { p: 'band', body: W, alt: '#05642C', collar: '#05642C' },       // אלצ'ה
  152: { p: 'stripes', body: '#0E5FA9', alt: W, collar: '#0E5FA9' },    // מלאגה

  // ===== ליגת העל =====
  567: { p: 'solid', body: '#E30613', collar: W },                      // הפועל תל אביב
  566: { p: 'solid', body: '#FFE600', collar: '#1B2C60' },              // מכבי תל אביב
  579: { p: 'solid', body: '#E30613', collar: W },                      // הפועל באר שבע
  559: { p: 'solid', body: '#FFD200', collar: K },                      // בית"ר ירושלים
  562: { p: 'solid', body: '#00843D', collar: W },                      // מכבי חיפה
  560: { p: 'solid', body: '#FFE200', collar: K },                      // מכבי נתניה
  561: { p: 'solid', body: '#C8102E', collar: W },                      // בני סכנין
  575: { p: 'solid', body: '#E30613', collar: W },                      // הפועל חיפה
  564: { p: 'solid', body: '#0033A0', collar: W },                      // מכבי פתח תקוה
  614: { p: 'solid', body: '#E30613', collar: K },                      // הפועל ירושלים
  563: { p: 'solid', body: '#1A4CA1', collar: W },                      // עירוני קרית שמונה
  571: { p: 'stripes', body: '#003DA5', alt: W, collar: '#003DA5' },    // הפועל פתח תקוה
  574: { p: 'solid', body: '#E30613', collar: W },                      // הפועל רמת גן

  // ===== ליגת האלופות (שאינן למעלה) =====
  480: { p: 'centerband', body: '#004170', alt: '#DA291C', collar: '#004170' }, // פ.ס.ז'
  6117: { p: 'solid', body: '#0A4FA6', collar: W },                     // קומו
  1169: { p: 'stripes', body: '#0066B3', alt: K, collar: K },           // קלאב ברוז'
  890: { p: 'hoops', body: '#00A859', alt: W, collar: '#00A859' },      // ספורטינג ליסבון
  341: { p: 'solid', body: '#FDE100', collar: K },                      // דורטמונד
  331: { p: 'solid', body: '#DC052D', collar: W },                      // באיירן מינכן
  338: { p: 'band', body: W, alt: '#E32219', collar: '#E32219' },       // שטוטגרט
  224: { p: 'stripes', body: '#0068A8', alt: K, collar: K },            // אינטר
  225: { p: 'solid', body: '#8E1F2F', collar: '#F0BC42' },              // רומא
  945: { p: 'halves', body: '#FDB912', alt: '#A90432', collar: '#A90432' }, // גלאטסראיי
  946: { p: 'stripes', body: '#1C2C5B', alt: '#FFED00', collar: '#1C2C5B' }, // פנרבחצ'ה
  1955: { p: 'stripes', body: '#F26522', alt: K, collar: K },           // שחטאר
  725: { p: 'stripes', body: '#ED1C24', alt: W, collar: '#ED1C24' },    // פ.ס.וו
  887: { p: 'stripes', body: '#0059A8', alt: W, collar: '#0059A8' },    // פורטו
  234: { p: 'solid', body: '#12A0D7', collar: W },                      // נאפולי
  7171: { p: 'solid', body: W, collar: '#DD0741' },                     // לייפציג
  691: { p: 'halves', body: '#E30613', alt: W, collar: K },             // פיינורד
  481: { p: 'solid', body: '#FFE500', sleeves: '#E2001A', collar: '#E2001A' }, // לאנס
  478: { p: 'solid', body: '#E01E13', collar: '#1F2D5C' },              // ליל
  1789: { p: 'halves', body: W, alt: '#E30613', collar: '#E30613' },    // סלאביה פראג

  // ===== נבחרות =====
  5055: { p: 'checks', body: W, alt: '#FF0000', collar: '#1B2A5C' },    // קרואטיה
  2378: { p: 'stripes', body: '#75AADB', alt: W, collar: K },           // ארגנטינה
  5070: { p: 'stripes', body: '#D52B1E', alt: W, collar: '#0038A8' },   // פרגוואי
  2379: { p: 'solid', body: '#FEDD00', collar: '#009C3B' },             // ברזיל
  2372: { p: 'solid', body: W, collar: K },                             // גרמניה
  5061: { p: 'solid', body: '#233E8B', collar: '#D21034' },             // צרפת
  5050: { p: 'solid', body: '#C60B1E', collar: '#FFC400' },             // ספרד
  5054: { p: 'solid', body: W, collar: '#1B2A5C' },                     // אנגליה
  5028: { p: 'solid', body: '#A6192E', collar: '#006600' },             // פורטוגל
  2375: { p: 'solid', body: '#0066CC', collar: W },                     // איטליה
  2377: { p: 'solid', body: '#F36C21', collar: K },                     // הולנד
  2373: { p: 'solid', body: '#C8102E', collar: K },                     // בלגיה
  5034: { p: 'solid', body: W, collar: '#0038B8' },                     // ישראל
  5027: { p: 'solid', body: '#C8102E', collar: W },                     // דנמרק
  5073: { p: 'solid', body: '#5CBFEB', collar: K },                     // אורוגוואי
  5093: { p: 'solid', body: '#C1272D', collar: '#006233' },             // מרוקו
  2389: { p: 'solid', body: W, collar: '#1B2A5C' },                     // ארה"ב
  5106: { p: 'solid', body: '#006847', collar: W },                     // מקסיקו
  2382: { p: 'solid', body: '#1E3A8A', collar: W },                     // יפן
  5038: { p: 'solid', body: W, collar: '#DC143C' },                     // פולין
  5069: { p: 'solid', body: '#1B2A5C', collar: W },                     // סקוטלנד
  2374: { p: 'solid', body: '#C6363C', collar: W },                     // סרביה
  5047: { p: 'solid', body: '#E30A17', collar: W },                     // טורקיה
  5032: { p: 'solid', body: '#D52B1E', collar: W },                     // שווייץ
  5057: { p: 'solid', body: '#FFD700', collar: '#0057B7' },             // אוקראינה
  5040: { p: 'solid', body: '#D7141A', collar: '#11457E' },             // צ'כיה
};

export const kitFor = (externalId) => (externalId != null ? KITS[String(externalId)] || null : null);

// ---- איזו חולצה מציגים לכל קבוצה במשחק ----
const rgb = (hex) => [1, 3, 5].map((i) => parseInt(String(hex).slice(i, i + 2), 16));
const distance = (a, b) => {
  if (!/^#[0-9a-f]{6}$/i.test(a || '') || !/^#[0-9a-f]{6}$/i.test(b || '')) return Infinity;
  const [x, y] = [rgb(a), rgb(b)];
  return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]);
};
const CLASH = 110;

// מחזיר לכל צד { kit } (מבנה מהטבלה), { color } (חולצה אחידה מ-365) או null.
// הטבלה היא של חולצות בית. כשהבית של האורחת מתנגש בבית של המארחת (ליברפול
// מול ארסנל - שתיהן אדומות), האורחת מקבלת חולצה אחידה בצבע ש-365 בחר לה,
// שהוא התלבושת השנייה שלה
export const shirtsForMatch = (match) => {
  const k1 = kitFor(match?.team1ExternalId);
  const k2 = kitFor(match?.team2ExternalId);
  const c1 = match?.team1Color || null;
  const c2 = match?.team2Color || null;
  const team1 = k1 ? { kit: k1 } : c1 ? { color: c1 } : null;
  const homeMain = k1?.body || c1;
  let team2 = k2 ? { kit: k2 } : c2 ? { color: c2 } : null;
  if (k2 && c2 && distance(homeMain, k2.body) < CLASH && distance(homeMain, c2) >= CLASH) {
    team2 = { color: c2 };
  }
  return { team1, team2 };
};
