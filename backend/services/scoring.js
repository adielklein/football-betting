// חישוב הניקוד להימור בודד. זו הלוגיקה המרכזית של האפליקציה, ולכן היא יושבת
// במודול נפרד בלי תלות במסד או ב-express - כדי שאפשר יהיה לבדוק אותה ישירות
// (ראה services/scoring.test.js).
//
// ללא יחסים: תוצאה מדויקת = 3, כיוון נכון = 1.
// עם יחסים:  תוצאה מדויקת = היחס * 2/3, כיוון נכון = היחס / 3 (מעוגל לעשירית).
// היחס שנלקח הוא זה שמתאים לתוצאה שקרתה בפועל, לא לזו שהמהמר ניחש.

const outcomeOf = (team1Goals, team2Goals) =>
  team1Goals > team2Goals ? 'home' : team1Goals < team2Goals ? 'away' : 'draw';

const roundToTenth = (n) => Math.round(n * 10) / 10;

function calculateMatchPoints(prediction, result, odds) {
  const predTeam1 = prediction.team1Goals;
  const predTeam2 = prediction.team2Goals;
  const resultTeam1 = result.team1Goals;
  const resultTeam2 = result.team2Goals;

  const predOutcome = outcomeOf(predTeam1, predTeam2);
  const resultOutcome = outcomeOf(resultTeam1, resultTeam2);

  const isExact = predTeam1 === resultTeam1 && predTeam2 === resultTeam2;
  const isDirection = predOutcome === resultOutcome;

  // יחס 0 או חסר נחשב כ"אין יחסים" - ככה זה התנהג מאז ומתמיד
  const hasOdds = !!(odds && (odds.homeWin || odds.draw || odds.awayWin));

  if (!hasOdds) {
    if (isExact) return 3;
    if (isDirection) return 1;
    return 0;
  }

  // אם דווקא היחס של התוצאה שקרתה חסר, נופלים ל-1 כדי לא לאפס את המהמר
  let relevantOdd = 1;
  if (resultOutcome === 'home' && odds.homeWin) relevantOdd = odds.homeWin;
  else if (resultOutcome === 'draw' && odds.draw) relevantOdd = odds.draw;
  else if (resultOutcome === 'away' && odds.awayWin) relevantOdd = odds.awayWin;

  if (isExact) return roundToTenth((relevantOdd * 2) / 3);
  if (isDirection) return roundToTenth(relevantOdd / 3);
  return 0;
}

module.exports = { calculateMatchPoints, outcomeOf };
