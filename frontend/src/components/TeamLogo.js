import { useState, useEffect } from 'react';
import { getTeamLogoUrl, fetchTeamLogoUrl, getTeamFlag } from '../utils/teamLogos';

/**
 * קומפוננטת לוגו קבוצה
 * - נבחרות: דגל אנימטיבי (WebP מתנופף)
 * - מועדונים: סמל מ-TheSportsDB (עם favicon כ-placeholder)
 */
// src - סמל שהגיע עם המשחק מהספק שממנו הוא יובא (365). כשהוא קיים הוא מנצח
// את הגילוי מול Google Favicon/TheSportsDB, שהוא ניחוש לפי שם ומכסה רק את
// הקבוצות שנמצאות בטבלאות הידניות
function TeamLogo({ name, size = 18, src = null }) {
  const flagUrl = getTeamFlag(name);
  // getTeamLogoUrl מחזיר ישירות (כולל TheSportsDB R2 לישראליות) - אין צורך בקאש כאן
  const [logoUrl, setLogoUrl] = useState(() => flagUrl ? null : (src || getTeamLogoUrl(name)));
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (flagUrl) return;

    // יש סמל מהספק - אין מה לגלות
    if (src) {
      setLogoUrl(src);
      setHidden(false);
      return;
    }

    let cancelled = false;
    fetchTeamLogoUrl(name).then(url => {
      if (!cancelled && url) {
        setLogoUrl(url);
        setHidden(false);
      }
    });
    return () => { cancelled = true; };
  }, [name, flagUrl, src]);

  // נבחרת - דגל אנימטיבי
  if (flagUrl) {
    return (
      <img
        src={flagUrl}
        alt=""
        onError={(e) => { e.target.style.display = 'none'; }}
        style={{
          width: size + 4,
          height: size,
          objectFit: 'contain',
          flexShrink: 0
        }}
      />
    );
  }

  // מועדון - תמונת סמל
  if (!logoUrl || hidden) return null;

  return (
    <img
      src={logoUrl}
      alt=""
      onError={() => setHidden(true)}
      style={{
        width: size,
        height: size,
        objectFit: 'contain',
        flexShrink: 0
      }}
    />
  );
}

export default TeamLogo;
