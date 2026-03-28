import { useState, useEffect } from 'react';
import { getTeamLogoUrl, fetchTeamLogoUrl, getTeamFlag } from '../utils/teamLogos';

/**
 * קומפוננטת לוגו קבוצה
 * - נבחרות: דגל אנימטיבי (WebP מתנופף)
 * - מועדונים: סמל מ-TheSportsDB (עם favicon כ-placeholder)
 */
function TeamLogo({ name, size = 18 }) {
  const flagUrl = getTeamFlag(name);
  const [logoUrl, setLogoUrl] = useState(() => {
    if (flagUrl) return null;
    try {
      const cached = localStorage.getItem('team_logo_' + name?.trim());
      if (cached) return cached;
    } catch (e) {}
    return getTeamLogoUrl(name);
  });
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (flagUrl) return;

    let cancelled = false;
    fetchTeamLogoUrl(name).then(url => {
      if (!cancelled && url) {
        setLogoUrl(url);
        setHidden(false);
      }
    });
    return () => { cancelled = true; };
  }, [name, flagUrl]);

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
