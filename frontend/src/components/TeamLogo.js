import { useState, useEffect } from 'react';
import { getTeamLogoUrl, fetchTeamLogoUrl, getTeamFlag } from '../utils/teamLogos';

/**
 * קומפוננטת לוגו קבוצה
 * - נבחרות: דגל אימוג'י
 * - מועדונים: favicon סטטי או חיפוש אוטומטי ב-TheSportsDB
 */
function TeamLogo({ name, size = 18 }) {
  const flag = getTeamFlag(name);
  const [logoUrl, setLogoUrl] = useState(() => flag ? null : getTeamLogoUrl(name));
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (flag) return;

    const staticUrl = getTeamLogoUrl(name);
    if (staticUrl) {
      setLogoUrl(staticUrl);
      setHidden(false);
      return;
    }

    let cancelled = false;
    setLogoUrl(null);
    setHidden(false);
    fetchTeamLogoUrl(name).then(url => {
      if (!cancelled) setLogoUrl(url);
    });
    return () => { cancelled = true; };
  }, [name, flag]);

  // נבחרת - דגל אימוג'י מתנופף
  if (flag) {
    return (
      <span style={{
        fontSize: size,
        lineHeight: 1,
        flexShrink: 0,
        display: 'inline-block',
        animation: 'wave-flag 2s ease-in-out infinite',
        transformOrigin: 'bottom left'
      }}>
        {flag}
        <style>{`
          @keyframes wave-flag {
            0%, 100% { transform: rotate(0deg); }
            25% { transform: rotate(8deg); }
            50% { transform: rotate(-4deg); }
            75% { transform: rotate(6deg); }
          }
        `}</style>
      </span>
    );
  }

  // מועדון - תמונת לוגו
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
