// זיהוי כיוון: האם הסדר שלנו (team1/team2) הפוך מזה של הספק (home/away).
//
// כל מספר בחלון הנתונים - יחסים, סיכויים, תחזית, ראש בראש - מגיע מהספק לפי
// home/away, ולכן טעות בכיוון מציגה למשתמש את המספרים של הקבוצה השנייה בלי
// שום סימן חיצוני שמשהו לא בסדר.
//
// שתי הקבוצות מצביעות, ולא רק הראשונה: כשהשם של האחת לא מזוהה, השנייה עדיין
// מכריעה. בתיקו - כלומר כששני השמות לא זוהו, או שהזיהוי סותר - נשארים בסדר
// הטבעי ומסמנים שהקביעה לא ודאית, במקום להעמיד פנים שידענו.

const buildDetector = (sameTeam) => (team1, team2, homeName, awayName) => {
  const score = (a, b) => (sameTeam(team1, a) ? 1 : 0) + (sameTeam(team2, b) ? 1 : 0);
  const direct = score(homeName, awayName);
  const swapped = score(awayName, homeName);

  if (swapped > direct) return { flipped: true, confident: true };
  if (direct > swapped) return { flipped: false, confident: true };
  return { flipped: false, confident: false };
};

// תוצאה מהספק בסדר שלו (בית/חוץ) → בסדר שלנו, כשהסדר אצלנו הפוך.
// כולל התוצאה הסופית (הארכה) והפנדלים, כדי שגם ההערה "הוכרע בהארכה" תהיה
// בכיוון הנכון
const flipResult = (r) => {
  if (!r) return r;
  const out = { ...r, team1Goals: r.team2Goals, team2Goals: r.team1Goals };
  if (r.finalScore) {
    out.finalScore = { ...r.finalScore, team1Goals: r.finalScore.team2Goals, team2Goals: r.finalScore.team1Goals };
    if (r.finalScore.penalties) {
      out.finalScore.penalties = { team1: r.finalScore.penalties.team2, team2: r.finalScore.penalties.team1 };
    }
  }
  return out;
};

module.exports = { buildDetector, flipResult };
