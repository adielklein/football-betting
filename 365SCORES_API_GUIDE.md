# מדריך שימוש ב-API של 365scores

> מדריך לקלוד (או כל מפתח) שרוצה לחבר API של 365scores לפרויקט.
> מבוסס על הניסיון בפרויקט football-betting-complete.

---

## TL;DR - מה צריך לדעת מיד

1. **אין צורך ברישום, אין צורך ב-API key, אין צורך בכרטיס אשראי.** ה-API חופשי לחלוטין.
2. ה-API הוא **לא רשמי** - הוא reverse-engineered מהאתר `365scores.com`.
3. ה-base URL: `https://webws.365scores.com/web`
4. מחזיר שמות בעברית כשמשתמשים ב-`langId=2`.
5. צריך לשלוח כותרות (`User-Agent`, `Referer`) כדי לא לקבל חסימה.
6. הנתונים כוללים את **ליגת העל הישראלית** וגביע המדינה - דבר שרוב ה-APIs בחו"ל לא מספקים.

---

## 1. למה 365scores ולא ספק אחר?

| ספק | רישום | מפתח | ליגות ישראל | שמות בעברית | מגבלת קצב |
|-----|-------|------|-------------|-------------|------------|
| **365scores (unofficial)** | ❌ לא | ❌ לא | ✅ כן | ✅ כן | רך מאוד |
| football-data.org | ✅ כן | ✅ כן | ❌ לא | ❌ לא | 10/min בחינמי |
| API-Football (RapidAPI) | ✅ כן | ✅ כן | ✅ כן | ❌ לא | 100/day בחינמי |
| TheSportsDB | ❌ לא | ❌ לא | ✅ חלקית | ❌ לא | בלי בעיה |
| SofaScore (unofficial) | ❌ לא | ❌ לא | ✅ כן | ❌ לא | חסימות מהירות |
| ESPN (unofficial) | ❌ לא | ❌ לא | ❌ לא | ❌ לא | רך |

**מסקנה:** 365scores הוא הבחירה הטובה ביותר לפרויקט עברי שמכסה ליגות ישראל.

---

## 2. רישום לאתר - האם נדרש?

**לא נדרש בכלל.** אין דף "Developer Portal" באתר 365scores. ה-API משמש את האפליקציה הציבורית שלהם (האתר/אפליקציית הסלולר), ואנחנו פשוט קוראים לאותן נקודות קצה ש-Frontend שלהם קורא אליהן.

**עם זאת, חשוב לדעת:**
- ה-API לא מתועד רשמית. תנאי השימוש שלהם לא מתירים שימוש מסחרי-מאסיבי.
- אם תקלע ב-API כמעט באלפי בקשות לדקה - יש סיכוי שיחסמו לפי IP.
- לפרויקטים אישיים/קטנים - אין שום בעיה.

---

## 3. איך לגלות את נקודות הקצה (תהליך ה-Reverse Engineering)

**שיטת DevTools:**
1. פותחים את `https://www.365scores.com/he/football` בדפדפן.
2. פותחים DevTools (F12) → לשונית `Network` → סינון `Fetch/XHR`.
3. גוללים בעמוד / נכנסים לליגה / לוחצים על משחק.
4. רואים את הבקשות יוצאות ל-`webws.365scores.com/web/...`.
5. מעתיקים את ה-URL ובודקים אילו פרמטרים עוברים.

**זה ככה גילו את הנקודות הקצה שבמדריך הזה.** אם תצטרך נקודות נוספות (סטטיסטיקות שחקנים, ראש בראש וכו') - השיטה זהה.

---

## 4. הפרמטרים החשובים

כל ה-endpoints מקבלים את אותם פרמטרים בסיסיים:

| פרמטר | ערך | משמעות |
|--------|-----|---------|
| `appTypeId` | `5` | סוג האפליקציה (Web) |
| `langId` | `2` | עברית. `1` = אנגלית. |
| `timezoneName` | `Asia/Jerusalem` | אזור זמן להמרת השעות |
| `userCountryId` | `6` | ישראל (משפיע על קדימויות ליגות) |
| `competitions` | `42` | מזהה הליגה (ראה טבלה למטה) |
| `games` | `12345` | מזהה משחק ספציפי (ל-endpoint של משחק יחיד) |

---

## 5. מזהי ליגות (Competition IDs)

מזהים נפוצים שכבר זוהו:

| ליגה | ID |
|------|-----|
| ליגת העל הישראלית | `42` |
| גביע המדינה הישראלי | `49` |
| ליגת האלופות | `572` |
| הליגה האירופית (Europa) | `573` |
| קונפרנס ליג | `7685` |
| פרמייר ליג (אנגלית) | `7` |
| FA Cup | `8` |
| לה ליגה (ספרד) | `11` |
| Copa del Rey | `13` |
| סרייה א (איטליה) | `17` |
| Coppa Italia | `20` |
| בונדסליגה (גרמניה) | `25` |
| DFB-Pokal | `28` |
| ליג 1 (צרפת) | `35` |
| גביע צרפת | `37` |

**איך לגלות ID של ליגה חדשה?**
1. נכנסים ל-`https://www.365scores.com/he/football`.
2. בוחרים את הליגה (למשל "ליגה לאומית").
3. ה-URL הופך למשהו כמו: `https://www.365scores.com/he/football/league/leumit-43`.
4. המספר בסוף (`43`) הוא ה-Competition ID.
5. או: בודקים ב-Network tab איזה ערך עובר ב-`competitions=` כשטוענים את הדף.

---

## 6. נקודות הקצה (Endpoints)

### 6.1 משחקים עתידיים בליגה
```
GET https://webws.365scores.com/web/games/fixtures/
    ?appTypeId=5
    &langId=2
    &timezoneName=Asia/Jerusalem
    &userCountryId=6
    &competitions={LEAGUE_ID}
```

### 6.2 משחקים שהסתיימו (תוצאות)
```
GET https://webws.365scores.com/web/games/results/
    ?appTypeId=5
    &langId=2
    &timezoneName=Asia/Jerusalem
    &userCountryId=6
    &competitions={LEAGUE_ID}
```

### 6.3 משחק יחיד לפי ID
```
GET https://webws.365scores.com/web/games/
    ?appTypeId=5
    &langId=2
    &timezoneName=Asia/Jerusalem
    &userCountryId=6
    &games={GAME_ID}
```

---

## 7. כותרות HTTP חובה

בלי הכותרות האלה - תקבל `403 Forbidden`:

```javascript
{
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json',
  'Accept-Language': 'he-IL,he;q=0.9,en;q=0.8',
  'Referer': 'https://www.365scores.com/'
}
```

**ה-`Referer` קריטי** - בלעדיו ה-API לפעמים חוסם.

---

## 8. מבנה התגובה

תגובה טיפוסית מ-`/games/fixtures/`:

```json
{
  "games": [
    {
      "id": 4429837,
      "startTime": "2026-05-30T20:00:00+03:00",
      "statusText": "טרם החל",
      "statusGroup": 1,
      "competition": {
        "id": 42,
        "name": "ליגת העל"
      },
      "homeCompetitor": {
        "id": 1234,
        "name": "מכבי תל אביב",
        "score": -1
      },
      "awayCompetitor": {
        "id": 5678,
        "name": "הפועל באר שבע",
        "score": -1
      }
    }
  ]
}
```

### שדה `statusGroup` - חשוב מאוד
| ערך | משמעות |
|------|---------|
| `1` | מתוכנן (לא החל) |
| `2` | חי (בזמן אמת) |
| `3` | נדחה / בוטל |
| `4` | **הסתיים** ← רק כאן יש לקרוא את התוצאה |

**אזהרה:** בשלב מסוים בעבר חשבנו ש-`statusGroup=3` זה הסתיים. **זה לא נכון.** רק `statusGroup=4` משמעו משחק שהסתיים. גם `score=-1` משמעו שעדיין אין תוצאה.

---

## 9. לוגואים של קבוצות

יש URL מובנה ללוגואים לפי `competitor.id`:

```
https://imagecache.365scores.com/image/upload/f_png,w_64,h_64,c_limit,q_auto:eco,dpr_2,d_Competitors:default1.png/v9/Competitors/{COMPETITOR_ID}
```

ניתן לשנות `w_64,h_64` לכל גודל.

---

## 10. דוגמת קוד מינימלית (Node.js)

```javascript
async function fetch365Fixtures(competitionId) {
  const url = `https://webws.365scores.com/web/games/fixtures/` +
              `?appTypeId=5&langId=2&timezoneName=Asia/Jerusalem` +
              `&userCountryId=6&competitions=${competitionId}`;

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json',
      'Accept-Language': 'he-IL,he;q=0.9,en;q=0.8',
      'Referer': 'https://www.365scores.com/'
    }
  });

  if (!res.ok) throw new Error(`365 API error: ${res.status}`);
  const data = await res.json();

  return data.games.map(g => ({
    id: g.id,
    kickoff: g.startTime,
    home: g.homeCompetitor?.name,
    away: g.awayCompetitor?.name,
    homeScore: g.homeCompetitor?.score,
    awayScore: g.awayCompetitor?.score,
    finished: g.statusGroup === 4
  }));
}

// שימוש
const games = await fetch365Fixtures(42); // ליגת העל
console.log(games);
```

---

## 11. דברים חשובים שלמדנו בדרך הקשה

### 11.1 קאש חיוני
ה-API לא דורש מפתח, אבל לקרוא לו בכל בקשת משתמש זה בזבזני. בפרויקט שלנו עשינו קאש של **6 שעות** ל-`Map` בזיכרון. לפרויקטים קטנים זה מספיק; לפרודקשן עם הרבה משתמשים - שווה Redis.

```javascript
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const cache = new Map();
```

### 11.2 משחקים שעתיים ל-fromDate/toDate
ה-API מחזיר תמיד את כל המשחקים העתידיים. אם אתה רוצה רק טווח מסוים - **תסנן בצד שלך**:
```javascript
const fromTs = new Date(fromDate + 'T00:00:00Z').getTime();
const toTs = new Date(toDate + 'T23:59:59Z').getTime();
const inWindow = games.filter(g => {
  const ts = new Date(g.startTime).getTime();
  return ts >= fromTs && ts <= toTs;
});
```

### 11.3 שמות קבוצות - השוואות מסובכות
שמות בעברית מ-365scores לא תמיד תואמים שמות בעברית במקום אחר (ניקוד, פיסוק, "ה-" וכו'). אם אתה משווה בין מקורות:
- נרמל לפני השוואה: הסר ניקוד, גרשיים, רווחים כפולים.
- שקול תרגום עברית→אנגלית כ-fallback.
- ראה `backend/routes/external.js` ב-`normalizeTeamName` ו-`matchesPair` לדוגמה.

### 11.4 משחקים שהסתיימו ב-fixtures - לא יופיעו
`/games/fixtures/` מחזיר רק משחקים שטרם נגמרו. אם אתה מחפש משחק שהסתיים - חייב להשתמש ב-`/games/results/` או `/games/?games=ID`.

### 11.5 גילוי externalId רטרואקטיבי
אם הוספת משחק ידנית ואתה רוצה לקשר אותו ל-365scores כדי לשאוב תוצאה - תוכל לחפש בטווח ±5 ימים סביב מועד המשחק וב-`includePast=true` (גם fixtures וגם results). אחרי שמצאת התאמה לפי שמות הקבוצות - שמור את `g.id` כ-externalId.

---

## 12. אזורי סיכון / מה לא לעשות

1. **אל תפיץ את הנתונים כשירות מסחרי.** זה נגד תנאי השימוש שלהם.
2. **אל תקלע בקשות במקביל בלי backoff** - תיחסם.
3. **אל תסמוך על המבנה לאורך זמן** - הם יכולים לשנות את ה-API בכל רגע. תכתוב קוד שעוטף את ה-API ושיהיה קל להחליף אותו.
4. **אל תשתמש בכותרות חסרות** - הסיכוי לחסימה גבוה.

---

## 13. רעיונות להמשך

נקודות קצה נוספות שראינו ב-Network tab של 365scores (לא נבדקו לעומק):
- `/standings/` - טבלת ליגה
- `/players/` - מידע על שחקנים
- `/h2h/` - ראש בראש בין שתי קבוצות
- `/news/` - חדשות

כדי לחקור אותן - חזור על שיטת DevTools מסעיף 3.

---

## 14. מימוש מלא בפרויקט הזה

ראה:
- [backend/services/scores365Api.js](backend/services/scores365Api.js) - מימוש ה-service
- [backend/routes/external.js](backend/routes/external.js) - האינטגרציה ברמת ה-route, כולל fallback לספקים אחרים וגילוי externalId
- [backend/models/League.js#L88-92](backend/models/League.js#L88-L92) - שדה `scores365CompetitionId` במודל הליגה
- [backend/routes/leagues.js#L233-253](backend/routes/leagues.js#L233-L253) - רשימת ה-IDs של כל הליגות שהוגדרו

בהצלחה! 🎯

---

## 15. יחסי ווינר (Odds) - נבדק ואומת

היחסים **לא** מגיעים ב-`/games/fixtures/`. הם קיימים רק ב-endpoint של משחק יחיד,
תחת השדה `bestOdds` (לא `odds` - השדה הזה תמיד `null`):

```
GET /game/?appTypeId=5&langId=2&timezoneName=Asia/Jerusalem&userCountryId=6&gameId={ID}
```

```jsonc
"bestOdds": [{
  "lineTypeId": 1,                 // 1 = "תוצאת סיום" (1X2)
  "bookmakerId": 1,                // 1 = ווינר
  "bookmaker": { "name": "ווינר" },
  "options": [
    { "name": "1", "rate": { "decimal": 1.75 } },
    { "name": "X", "rate": { "decimal": 3.50 } },
    { "name": "2", "rate": { "decimal": 3.90 } }
  ]
}]
```

מיפוי: `options[].name` הוא `1`/`X`/`2` → `homeWin`/`draw`/`awayWin`.
עדיף למפות לפי `name` ולא לפי `num` (ה-`num` לא תמיד עקבי).

### ⚠️ החשוב ביותר: יחסים קיימים רק למחזור הקרוב
ווינר מפרסמים יחסים **רק למשחקים הקרובים** (בערך עד שבוע מראש). נבדק על ליגת העל:

| מרחק מהמשחק | יחסים |
|---|---|
| +1 יום | ✅ קיימים |
| +7 ימים ומעלה | ❌ `null` |

מתוך 18 משחקים עתידיים בליגת העל, רק ל-4 (המחזור הקרוב) היו יחסים.
**המשמעות המעשית:** אם מייבאים משחקים מראש, הם ייובאו בלי יחסים. צריך
מנגנון לרענון יחסים מאוחר יותר (בפרויקט הזה: `POST /api/external/sync-odds/:weekId`).

### ⚠️ מקביליות
כל משחק דורש קריאה נפרדת ל-`/game/`. **אל תריץ `Promise.all` על כל הרשימה** -
365 חוסמים לפי IP. השתמש במקביליות מוגבלת (בפרויקט הזה: 4).

---

## 16. טבלת ליגה (Standings) - נבדק ואומת

```
GET /standings/?appTypeId=5&langId=2&timezoneName=Asia/Jerusalem&userCountryId=6&competitions={COMP_ID}
```

מחזיר `standings[].rows[]`, וכל שורה היא מכרה זהב לקבוצה אחת:

| שדה | משמעות |
|---|---|
| `position` / `points` | מיקום ונקודות |
| `gamePlayed` / `gamesWon` / `gamesEven` / `gamesLost` | מאזן |
| `for` / `against` | שערי זכות / חובה |
| `strike` | רצף נוכחי |
| `detailedRecentForm[]` | משחקים אחרונים (אובייקטי משחק מלאים) |

בקריאה **אחת** מקבלים את הנתונים של **שתי** הקבוצות במשחק.
בגביעים (נוקאאוט) אין טבלה - צריך fallback שקט.

---

## 17. כושר וראש-בראש - נבדק ואומת

```
GET /games/results/?appTypeId=5&langId=2&timezoneName=Asia/Jerusalem&userCountryId=6&competitors={TEAM_ID}
```

מחזיר ~20 משחקים אחרונים של הקבוצה **על פני כל המסגרות** (ליגה, גביע, ידידות),
כולל `competitionDisplayName` לכל משחק. מכאן גוזרים:

- **כושר**: ממיינים לפי `startTime` יורד, מסננים `statusGroup === 4`, לוקחים 5 אחרונים.
- **ראש בראש**: מסננים את משחקי הקבוצה שבהם היריבה מופיעה כ-`homeCompetitor` או `awayCompetitor`.
  אין צורך ב-endpoint נפרד של h2h (הניסיונות ל-`/games/h2h/` מחזירים 500).
- **ממוצעי שערים**: מהתוצאות של אותם משחקים.

⚠️ שים לב שהתוצאות כוללות גם משחקי **ידידות** - אם זה מפריע, סנן לפי `competitionDisplayName`.

### סטטיסטיקות משחק (החזקת כדור, xG, בעיטות)
```
GET /game/stats/?appTypeId=5&langId=2&timezoneName=Asia/Jerusalem&userCountryId=6&games={ID}
```
מחזיר `statistics[]` עם `competitorId`, `name`, `value`, `valuePercentage`
(החזקת כדור, שערים צפויים, בעיטות לשער/למסגרת, קרנות, נבדלים, מסירות, כרטיסים).
**זמין רק למשחקים שהחלו/הסתיימו** (`hasStats: true`) - למשחק עתידי חוזר ריק,
ולכן הוא לא שימושי לקבלת החלטה *לפני* משחק.

---

## 18. מימוש התובנות בפרויקט הזה

- [backend/services/scores365Api.js](backend/services/scores365Api.js) - `fetchOddsForFixture`, `fetchTeamInsights`
- [backend/routes/external.js](backend/routes/external.js) - `GET /insights/:matchId`, `POST /sync-odds/:weekId`
- [frontend/src/components/player/MatchInsightsModal.js](frontend/src/components/player/MatchInsightsModal.js) - חלון ההשוואה
