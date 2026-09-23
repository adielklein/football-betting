import React, { useState } from 'react';

// סמל התחרות מ-365.
//
// אין מה לשמור ואין מה לסנכרן: הכתובת נגזרת ממזהה התחרות שכבר שמור על
// הליגה, ולכן אם המזהה נכון - הסמל נכון, וגם מתעדכן מעצמו כש-365 מחליפים
// אותו. ליגה בלי מזהה 365 פשוט לא מציגה סמל, והצבע והשם ממשיכים לזהות
// אותה כמו קודם.
//
// גודל כפול מהמבוקש בכתובת עצמה, כדי שיהיה חד במסכי רטינה.

const competitionImage = (id, px) =>
  `https://imagecache.365scores.com/image/upload/f_png,w_${px},h_${px},c_limit,q_auto:eco,dpr_2/v9/Competitions/${id}`;

// הליגה מגיעה למסכים בשתי צורות: אובייקט מאוכלס, או מזהה בלבד
const competitionIdOf = (league) =>
  league && typeof league === 'object' ? league.scores365CompetitionId || null : null;

function LeagueLogo({ league, size = 16 }) {
  const [failed, setFailed] = useState(false);

  const id = competitionIdOf(league);
  // null ולא מציין מקום: התג הצבעוני עם שם הליגה כבר עונה על השאלה,
  // וריבוע אפור לידו רק מוסיף רעש
  if (!id || failed) return null;

  return (
    <img
      src={competitionImage(id, size * 2)}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      loading="lazy"
      onError={() => setFailed(true)}
      style={{ objectFit: 'contain', flexShrink: 0, display: 'block' }}
    />
  );
}

export default LeagueLogo;
export { competitionImage, competitionIdOf };
