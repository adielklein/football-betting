import { useState, useEffect } from 'react';
import { getTeamLogoUrl, fetchTeamLogoUrl } from '../utils/teamLogos';

/**
 * קומפוננטת לוגו קבוצה
 * - מציגה מיידית אם יש מיפוי סטטי
 * - מחפשת אוטומטית ב-TheSportsDB אם לא נמצא
 * - שומרת ב-localStorage cache
 */
function TeamLogo({ name, size = 18 }) {
  const [logoUrl, setLogoUrl] = useState(() => getTeamLogoUrl(name));
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    // אם יש כבר URL סטטי, לא צריך חיפוש
    const staticUrl = getTeamLogoUrl(name);
    if (staticUrl) {
      setLogoUrl(staticUrl);
      setHidden(false);
      return;
    }

    // חיפוש אסינכרוני
    let cancelled = false;
    setLogoUrl(null);
    setHidden(false);
    fetchTeamLogoUrl(name).then(url => {
      if (!cancelled) {
        setLogoUrl(url);
      }
    });
    return () => { cancelled = true; };
  }, [name]);

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
