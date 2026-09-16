// טבלת האומץ: מי הולך נגד היחסים, ומי תמיד על הבטוח.
//
// היחסים נשמרים על המשחק ומשמשים היום רק לניקוד. הם גם דעה: יחס 1.3 לניצחון
// בית אומר שהבוקמייקר נותן לזה כ-77%, ויחס 6.0 לניצחון חוץ אומר כ-17%. לכן
// לכל ניחוש אפשר לצמוד מחיר - כמה לא סביר היה הכיוון שבחרת.
//
// אומץ של הימור = 1 פחות ההסתברות המשתמעת של הכיוון שנבחר. ניחוש על
// פייבוריט מובהק שווה ~0.2, ניחוש על מנצחת חוץ מופתעת שווה ~0.8.
//
// שתי החלטות מדידה, באותה רוח של טבלת חוסר המזל:
//
// 1. מדרגים לפי ממוצע ולא לפי סכום. מי שהימר יותר בהכרח צבר יותר אומץ
//    מצטבר, ודירוג כזה היה מודד ותק ולא אופי.
//
// 2. השאלה "האם האומץ משתלם" נשאלת אצל כל שחקן מול עצמו - הנקודות שלו
//    בהימורים האמיצים מול הזהירים שלו - ולא מול הממוצע של הליגה. הסלייט
//    זהה לכולם, אבל תמהיל ההימורים אינו, והשוואה חוצת-שחקנים הייתה מודדת
//    בעיקר על אילו משחקים כל אחד בחר להסתכן.
//
// משחק בלי יחסים פשוט לא נספר, ולכן הטבלה מדווחת גם על הכיסוי: אחוז
// ההימורים שהיה אפשר לתמחר בכלל.

// מתחת לזה הממוצע רועש מדי - כמה הימורים בודדים זורקים אותו לכל כיוון
const MIN_BETS_FOR_RANK = 20;

// הסף שמפריד "אמיץ" מ"זהיר". 0.5 הוא הנקודה שבה הכיוון שנבחר הוא כבר לא
// הסביר מבין השלושה
const BRAVE_THRESHOLD = 0.5;

const round1 = (n) => Math.round(n * 10) / 10;
const round2 = (n) => Math.round(n * 100) / 100;

const directionOf = (team1Goals, team2Goals) =>
  team1Goals > team2Goals ? 'home' : team1Goals < team2Goals ? 'away' : 'draw';

// הסתברויות משתמעות מנוקות ממרווח הבוקמייקר. בלי הנרמול הסכום גדול מ-1
// והאומץ היה יוצא נמוך מדי באופן שיטתי
const impliedProbabilities = (odds) => {
  if (!odds) return null;
  const raw = {
    home: odds.homeWin > 0 ? 1 / odds.homeWin : 0,
    draw: odds.draw > 0 ? 1 / odds.draw : 0,
    away: odds.awayWin > 0 ? 1 / odds.awayWin : 0
  };
  const total = raw.home + raw.draw + raw.away;
  if (!total) return null;
  return { home: raw.home / total, draw: raw.draw / total, away: raw.away / total };
};

// כמה אומץ נדרש לניחוש הזה, או null כשאין יחסים לתמחר לפיהם
const courageOf = (prediction, odds) => {
  if (!prediction || prediction.team1Goals == null || prediction.team2Goals == null) return null;
  const probs = impliedProbabilities(odds);
  if (!probs) return null;

  const picked = probs[directionOf(prediction.team1Goals, prediction.team2Goals)];
  // כיוון שלא תומחר בכלל (יחס חסר לאותו צד) אינו ראיה לאומץ
  if (!picked) return null;
  return 1 - picked;
};

/**
 * @param bets    הימורים מוכרעים, כל אחד עם userId, prediction ו-match
 * @param players [{ _id, name }] - שחקנים בלבד, בלי מנהלים
 */
const buildCourageTable = (bets, players) => {
  const byUser = new Map(
    players.map((p) => [String(p._id), {
      userId: String(p._id),
      name: p.name,
      bets: 0,           // הימורים מוכרעים בכלל
      priced: 0,         // מתוכם, כמה היה אפשר לתמחר לפי יחסים
      courageSum: 0,
      braveBets: 0,
      bravePoints: 0,
      safeBets: 0,
      safePoints: 0
    }])
  );

  for (const bet of bets) {
    const row = byUser.get(String(bet.userId));
    if (!row) continue; // מנהל, או משתמש שנמחק

    const match = bet.match;
    if (!match?.result || match.result.team1Goals == null || match.result.team2Goals == null) continue;
    if (!bet.prediction || bet.prediction.team1Goals == null) continue;

    row.bets++;

    const courage = courageOf(bet.prediction, match.odds);
    if (courage == null) continue;

    row.priced++;
    row.courageSum += courage;

    const points = bet.points || 0;
    if (courage >= BRAVE_THRESHOLD) {
      row.braveBets++;
      row.bravePoints += points;
    } else {
      row.safeBets++;
      row.safePoints += points;
    }
  }

  const rows = [...byUser.values()]
    .filter((r) => r.priced > 0)
    .map((r) => {
      const bravePerBet = r.braveBets > 0 ? r.bravePoints / r.braveBets : null;
      const safePerBet = r.safeBets > 0 ? r.safePoints / r.safeBets : null;

      return {
        userId: r.userId,
        name: r.name,
        bets: r.bets,
        priced: r.priced,
        // אחוז ההימורים שהיה אפשר לתמחר. כיסוי נמוך = מספר פחות אמין
        coverage: Math.round((r.priced / r.bets) * 100),
        courage: round2(r.courageSum / r.priced),
        braveBets: r.braveBets,
        safeBets: r.safeBets,
        bravePerBet: bravePerBet == null ? null : round2(bravePerBet),
        safePerBet: safePerBet == null ? null : round2(safePerBet),
        // ההפרש הוא התשובה: חיובי = האומץ השתלם לך. דורש את שני הצדדים,
        // אחרת אין מול מה להשוות
        braveryPaid:
          bravePerBet == null || safePerBet == null ? null : round2(bravePerBet - safePerBet),
        totalPoints: round1(r.bravePoints + r.safePoints),
        ranked: r.priced >= MIN_BETS_FOR_RANK
      };
    })
    .sort((a, b) => {
      // מי שאין לו מספיק הימורים מתומחרים יורד לתחתית, בלי מקום
      if (a.ranked !== b.ranked) return a.ranked ? -1 : 1;
      return b.courage - a.courage;
    });

  let rank = 0;
  rows.forEach((r) => { r.rank = r.ranked ? ++rank : null; });
  return rows;
};

module.exports = {
  buildCourageTable,
  courageOf,
  impliedProbabilities,
  MIN_BETS_FOR_RANK,
  BRAVE_THRESHOLD
};
