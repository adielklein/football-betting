import React from 'react';
import { lockModeOf } from '../../services/betLock';

// שלבי הסיור המודרך (components/Walkthrough.js), בקול של גולי - הכדור שמנחה.
// רק מה שצריך כדי לשחק: איך מהמרים, מתי נסגר, איך צוברים נקודות ואיפה
// רואים מה. בלי הסברים על עיצוב ואנימציות - את זה מגלים לבד.
// target = ערך data-tour של האלמנט שמואר (או רשימה - הראשון שגלוי);
// tab = לאיזו לשונית לעבור. כשמשנים התנהגות באפליקציה, מעדכנים גם כאן.
// בכוונה לא מוזכר: משחק הפנדלים הסודי.

const B = ({ children }) => <strong style={{ color: 'var(--text, #23272f)' }}>{children}</strong>;

// שלבים שצריכים שבוע פעיל עם משחקים על המסך
const BETTING = new Set(['week', 'countdown', 'score', 'points', 'stats']);

export const buildTourSteps = ({ week, hasMatches = true } = {}) => {
  // בלי שבוע ידוע - ברירת המחדל לשבוע חדש: כל משחק נסגר בנפרד
  const perMatch = week ? lockModeOf(week) === 'match' : true;

  const steps = [
    {
      id: 'welcome',
      tab: 'betting',
      title: 'היי, אני גולי!',
      body: <>אראה לך בדקה איך הכל עובד. אפשר לדלג מתי שרוצים.</>,
      cta: 'יאללה'
    },
    {
      id: 'week',
      tab: 'betting',
      target: 'week-panel',
      title: 'השבוע שלך',
      body: <>כאן רואים כמה משחקים כבר מילאת מתוך כולם.</>
    },
    {
      id: 'countdown',
      tab: 'betting',
      target: 'countdown',
      title: 'מתי נסגר?',
      body: perMatch
        ? <><B>כל משחק נסגר ברגע שהוא מתחיל.</B> עד אז אפשר להמר ולשנות.</>
        : <>כל המשחקים של השבוע נסגרים יחד, כשהראשון מתחיל.</>
    },
    {
      id: 'score',
      tab: 'betting',
      target: 'score-inputs',
      title: 'מנחשים תוצאה',
      body: <>מקלידים את התוצאה - וזהו. <B>זה נשמר לבד.</B></>
    },
    {
      id: 'points',
      tab: 'betting',
      target: ['odds', 'match-card'],
      title: 'ככה צוברים נקודות',
      body: (
        <>
          <B>בול = 3 נקודות. כיוון נכון = נקודה.</B> במשחק עם יחסים מקבלים לפי
          היחס - הפתעה שווה יותר.
        </>
      )
    },
    {
      id: 'stats',
      tab: 'betting',
      target: 'stats-pill',
      title: 'צריך עזרה להחליט?',
      body: <>ב-<B>📊 נתונים</B> יש תחזית, יחסים, כושר אחרון וראש בראש.</>
    },
    {
      id: 'allbets',
      tab: 'allbets',
      target: 'tab-allbets',
      title: 'מה אחרים הימרו',
      body: perMatch
        ? <>ההימורים של כולם על משחק <B>נחשפים כשהוא מתחיל</B>, ואחריו רואים מי קלע.</>
        : <>ההימורים של כולם נחשפים כשההימורים נסגרים, ואחרי המשחקים רואים מי קלע.</>
    },
    {
      id: 'leaderboard',
      tab: 'leaderboard',
      target: 'lb-tabs',
      title: 'הטבלה',
      body: (
        <>
          חודשי, שבועי, עונתי וכללי. <B>🐒 McCannkey</B> הוא מחשב שמהמר לפי
          התחזית - בוא נראה אם תנצח אותו.
        </>
      )
    },
    {
      id: 'history',
      tab: 'history',
      target: 'tab-history',
      title: 'היסטוריה',
      body: <>כל השבועות הקודמים: מה הימרת ומה יצא.</>
    },
    {
      id: 'mystats',
      tab: 'stats',
      target: ['stats-sections', 'tab-stats'],
      title: 'הסטטיסטיקה שלך',
      body: <>רצפים, החמצות של שער אחד, הניקוד לאורך העונה, ואיזה קבוצות אתה מנחש הכי טוב.</>
    },
    {
      id: 'notifications',
      tab: 'settings',
      target: 'notif-settings',
      title: 'שלא תפספס',
      body: (
        <>
          <B>תפעיל התראות</B> ותקבל תזכורת לפני שמשחק שלא הימרת עליו נסגר. אפשר
          להוסיף גם גולים ותוצאות.
        </>
      )
    },
    {
      id: 'settings-tabs',
      tab: 'settings',
      target: 'settings-tabs',
      title: 'עוד בהגדרות',
      body: (
        <>
          ערכת נושא של הקבוצה שלך. ובחשבון: <B>נתונים מורחבים</B> - פצועים,
          הרכבים וטרנדים לכל משחק.
        </>
      )
    },
    {
      id: 'done',
      tab: 'betting',
      title: 'יאללה, בהצלחה! 🎉',
      body: <>אם תצטרך אותי, אני מחכה ב-<B>הגדרות ← חשבון</B>.</>,
      cta: 'בוא נהמר!'
    }
  ];

  // אין שבוע פעיל עם משחקים - אין מה להאיר במסך ההימורים. שלבי ההימור
  // מתכנסים לכרטיס אחד
  if (!week || !week.active || !hasMatches) {
    const howTo = {
      id: 'howto',
      tab: 'betting',
      title: 'איך מהמרים',
      body: (
        <>
          כשנפתח שבוע, מקלידים תוצאה לכל משחק <B>והיא נשמרת לבד</B>.{' '}
          {perMatch ? 'כל משחק נסגר כשהוא מתחיל.' : 'ההימורים נסגרים עם המשחק הראשון.'}
          {' '}<B>בול = 3 נקודות, כיוון = נקודה.</B>
        </>
      )
    };
    const i = steps.findIndex((x) => BETTING.has(x.id));
    return [...steps.slice(0, i), howTo, ...steps.filter((x, k) => k > i && !BETTING.has(x.id))];
  }
  return steps;
};
