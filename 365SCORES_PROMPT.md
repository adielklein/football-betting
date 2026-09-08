# פרומפט: עבודה נכונה מול ה-API של 365scores

> העתק את כל מה שמתחת לקו לתוך שיחה חדשה עם קלוד.

---

אתה עובד מול ה-API הפנימי של **365scores** — אתר תוצאות ספורט ישראלי. זה API
לא רשמי שמשרת את האתר שלהם, ואין לו תיעוד ציבורי. כל מה שכתוב כאן אומת בפועל
מול השרת החי, לא נלקח ממסמך.

**היתרון שלו על ספקים אחרים:** שמות קבוצות וליגות בעברית מוכנים, כיסוי מלא של
הליגות בישראל, ואין צורך במפתח או ברישום.

## החוזה הבסיסי

```
בסיס:   https://webws.365scores.com/web
פרמטרים משותפים לכל קריאה:
        appTypeId=5
        langId=2                      ← 2 = עברית. 1 = אנגלית.
        timezoneName=Asia/Jerusalem
        userCountryId=6
```

**כותרות חובה.** בלעדיהן תקבל `403`:

```javascript
{
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json',
  'Accept-Language': 'he-IL,he;q=0.9,en;q=0.8',
  'Referer': 'https://www.365scores.com/'
}
```

ה-`Referer` הוא הקריטי מביניהן.

## נקודות הקצה

| מה | נתיב | הערות |
|---|---|---|
| משחקים עתידיים בליגה | `/games/fixtures/?...&competitions={ID}` | לא כולל משחקים שהסתיימו |
| תוצאות בליגה | `/games/results/?...&competitions={ID}` | |
| תוצאות של קבוצה | `/games/results/?...&competitors={TEAM_ID}` | ~20 אחרונים, **כל המסגרות** |
| משחק יחיד | `/game/?...&gameId={ID}` | |
| **כמה משחקים בבת אחת** | `/games/current/?...&games=id1,id2,id3` | ראה למטה — זה החשוב |
| טבלת ליגה | `/standings/?...&competitions={ID}` | לא קיים בגביעים; טפל בכישלון |
| סטטיסטיקות משחק | `/game/stats/?...&games={ID}` | רק אחרי שהמשחק החל |

מזהי ליגות שאומתו: פרמייר ליג `7`, לה ליגה `11`, סריה א `17`, בונדסליגה `25`,
ליג 1 `35`, ליגת האלופות `572`, ליגה אירופית `573`, ליגת העל הישראלית `42`,
גביע המדינה `49`. לגלות חדש: פתח את הליגה ב-365scores.com ובדוק מה עובר
ב-`competitions=` ב-Network tab.

---

# המלכודות — קרא את זה לפני שאתה כותב שורה

## 1. `statusGroup` ולא `statusText`

```
2 = טרם החל
3 = מתנהל עכשיו
4 = הסתיים
```

**אל תזהה משחק שהסתיים לפי טקסט.** `statusText` מגיע מתורגם ומשתנה
(`"הסתיים"`, `"אחרי הארכה"`, `"פנדלים"`). רק `statusGroup === 4` אמין.

## 2. `score: -1` פירושו "אין תוצאה", לא "אפס"

משחק שטרם החל מחזיר `homeCompetitor.score === -1`. אם תתייחס לזה כמספר תרשום
0-0 לכל משחק עתידי. בדוק `score == null || score < 0`.

## 3. שליפה קבוצתית — זה משנה הכול

```
/games/current/?...&games=4742065,4742067,4742069
```

מחזיר את **כל** המשחקים המבוקשים בבקשה אחת. אומת: 16 מזהים ← 16 משחקים.

אל תשלוף משחקים אחד-אחד בלולאה. מחזור סריקה של שבוע שלם הוא בקשה אחת.

## 4. השדה `ttl` אומר לך כל כמה זמן לרענן

```
אין משחקים חיים  →  ttl: 300   (5 דקות)
יש משחקים חיים   →  ttl: 5     (5 שניות)
```

הם עצמם אומרים לך את הקצב. אל תמציא אחד. סקירה כל דקה בזמן משחקים היא
שמרנית מאוד ביחס למה שהם מצפים לו.

## 5. `competitors=` הוא "או", לא "וגם" — אין ראש-בראש

`competitors=104,106` לא מחזיר את המשחקים **בין** שתי הקבוצות; הוא מחזיר את
המשחקים של כל אחת מהן. אין endpoint ייעודי ל-h2h — `/games/h2h/` מחזיר 500,
ו-`/games/headtohead/` מחזיר 404.

**כדי לקבל מפגשים קודמים:** שלוף את תוצאות קבוצה אחת וסנן את המשחקים שבהם
היריבה מופיעה כ-`homeCompetitor` או `awayCompetitor`. עמוד אחד מכסה בערך חצי
עונה, ולכן ברוב הזוגות תקבל **אפס מפגשים** בלי דפדוף. אם קיבלת ריק — זה
כמעט תמיד עומק, לא היעדר מפגשים.

## 6. הדפדוף, והמלכודת שבתוכו

התשובה מכילה:

```json
"paging": { "previousPage": "/web/games/?...&aftergame=4673897&direction=-1" }
```

`previousPage` = אחורה בזמן (ישן יותר). **הנתיב כבר כולל `/web`.** אם תצרף
אותו לבסיס שלך תקבל `/web/web/games/` ו-404. צרף לשורש:

```javascript
const url = 'https://webws.365scores.com' + json.paging.previousPage;
```

**גבול ההיסטוריה:** הדפדוף נגמר אחרי כ-8 עמודים, בערך עונה אחת אחורה. מעבר
לזה פשוט אין `previousPage`. אל תבנה תכונה שדורשת שלוש עונות של היסטוריה.

## 7. הוא מאט מאוד תחת בקשות רצופות

נמדד באותה סשן: בקשה בודדת ~250ms, אבל ברצף — 3.3 שניות, ואחת הגיעה ל-11.7
שניות. זה לא חסימה, זה האטה הדרגתית.

מכאן:
- קאש אגרסיבי. שש שעות זה סביר לנתונים שאינם חיים.
- תקציב זמן על כל לולאת דפדוף, לא רק מגבלת עמודים.
- אל תסרוק 50 משחקים ברצף בבקשת משתמש אחת. שלוף קבוצתית (סעיף 3).

## 8. יחסי הימורים — קיימים רק למחזור הקרוב

היחסים יושבים על אובייקט המשחק תחת `bestOdds`:

```javascript
const line = game.bestOdds?.find(o => o.lineTypeId === 1);   // 1 = 1X2
const winner = line?.bookmakers?.find(b => b.id === 1);      // בישראל: ווינר
// options[].name הוא '1' / 'X' / '2'
```

**המלכודת:** משחק מחר יחזיר יחסים, ומשחק בעוד שבוע יחזיר `bestOdds: null` —
אצל אותה ליגה, באותה קריאה. בבדיקה: 4 מתוך 18 משחקים עתידיים החזירו יחסים.

זה נראה בדיוק כמו באג בקוד שלך. אל תבזבז עליו זמן. אם אתה שומר יחסים
במסד — בנה מנגנון שממלא אותם מאוחר יותר, כי בזמן ייבוא המשחקים הם עוד לא
פורסמו.

## 9. סדר בית/חוץ שלך אינו בהכרח שלהם

365 מחזיר תמיד `homeCompetitor` / `awayCompetitor`. אם באפליקציה שלך יש סדר
משלך, אתה חייב ליישר — **וכל מספר** מושפע: יחסים, סיכויים, תחזיות, תוצאות
ראש-בראש.

אל תסתפק בבדיקה על קבוצה אחת. אם השם שלה לא זוהה, קוד כזה נופל בשקט לברירת
המחדל ומציג למשתמש את הנתונים של הקבוצה השנייה, בלי שום סימן חיצוני:

```javascript
// שתי הקבוצות מצביעות. בתיקו - מסמנים שלא ידוע, לא מנחשים.
const score = (a, b) => (sameTeam(t1, a) ? 1 : 0) + (sameTeam(t2, b) ? 1 : 0);
const direct = score(homeName, awayName);
const swapped = score(awayName, homeName);
if (swapped > direct) return { flipped: true,  confident: true };
if (direct > swapped) return { flipped: false, confident: true };
return { flipped: false, confident: false };
```

## 10. תוצאות של קבוצה כוללות ידידות

`/games/results/?competitors=X` מחזיר את כל המסגרות. אם אתה מחשב "כושר",
החלט במפורש אם ידידות נספרות, וסנן לפי `competitionDisplayName`.

## 11. סטטיסטיקות משחק חסרות ערך לפני המשחק

`/game/stats/` מחזיר ריק למשחק שטרם החל (`hasStats: false`). אם המטרה היא
לעזור למשתמש להחליט **לפני** המשחק — הוא לא יעזור. השתמש בטבלה, בכושר
ובראש-בראש במקום.

---

## שלד עובד

```javascript
const ROOT = 'https://webws.365scores.com';
const BASE = ROOT + '/web';
const Q = 'appTypeId=5&langId=2&timezoneName=Asia/Jerusalem&userCountryId=6';
const H = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json',
  'Accept-Language': 'he-IL,he;q=0.9,en;q=0.8',
  'Referer': 'https://www.365scores.com/'
};

const get = async (path) => {
  const res = await fetch((path.startsWith('/web') ? ROOT : BASE) + path, { headers: H });
  if (!res.ok) throw new Error(`365scores ${res.status}`);
  return res.json();
};

// כל המשחקים בבקשה אחת
const liveFor = async (gameIds) => {
  const json = await get(`/games/current/?${Q}&games=${gameIds.join(',')}`);
  return (json.games || []).map(g => ({
    id: g.id,
    finished: g.statusGroup === 4,
    live: g.statusGroup === 3,
    minute: g.gameTimeDisplay || null,
    home: g.homeCompetitor?.score >= 0 ? Math.round(g.homeCompetitor.score) : null,
    away: g.awayCompetitor?.score >= 0 ? Math.round(g.awayCompetitor.score) : null
  }));
};

// מפגשים קודמים - דפדוף עם תקציב זמן
const headToHead = async (teamId, opponentId, { want = 5, maxPages = 6, budgetMs = 8000 } = {}) => {
  const isMeeting = g => {
    const ids = [g.homeCompetitor?.id, g.awayCompetitor?.id];
    return ids.includes(teamId) && ids.includes(opponentId) && g.statusGroup === 4;
  };
  const found = [];
  let path = `/games/results/?${Q}&competitors=${teamId}`;
  const deadline = Date.now() + budgetMs;

  for (let i = 0; i < maxPages; i++) {
    if (!path || found.length >= want || Date.now() > deadline) break;
    const json = await get(path);
    found.push(...(json.games || []).filter(isMeeting));
    path = json.paging?.previousPage || null;   // כבר כולל /web
  }
  return found.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
};
```

---

## איך לעבוד

**אמת מול השרת, אל תסיק.** ה-API לא מתועד ולא יציב לאורך זמן. לפני שאתה
בונה על שדה — שלוף אותו והדפס אותו. כמה מהמלכודות למעלה נראו בדיוק כמו באגים
בקוד עד שנמדדו.

**כשמשהו חוזר ריק, שאל קודם "האם זה בכלל קיים כאן".** יחסים למשחק רחוק,
ראש-בראש בלי דפדוף, סטטיסטיקות לפני משחק — כל אלה מחזירים ריק תקין, לא שגיאה.

**זה API לא רשמי.** התנהג בהתאם: קאש, קצב סביר, וטיפול בכישלון שלא מפיל
את המסך. אל תבנה תכונה שנשברת אם 365 משנים שדה.
