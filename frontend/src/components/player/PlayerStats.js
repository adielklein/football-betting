import React, { useState, useEffect, useRef } from 'react';
import { useCountUp, reducedMotion } from '../../services/motion';
import { SkeletonStats } from '../Skeleton';
import NearMissView from './NearMissView';
import TeamLogo from '../TeamLogo';
import { getTheme } from '../../themes';
import useReturnRefresh from '../../services/useReturnRefresh';
import { GoalsCard, CrowdCard, SeasonRankCard, LeaguesCard, ThemeTeamCard, accuracyBar, accuracyText } from './InsightCards';

// נקודות יכולות להיות שבריות (ניקוד לפי יחסים), ולכן ספרה אחת אחרי הנקודה
const pts = (n) => Math.round((n || 0) * 10) / 10;

// גרף העמודות השבועי.
//
// שמות השבועות באורכים שונים לחלוטין ("סופ״ש 2" מול "שלב הבתים בליגת
// האלופות"), ולכן על הציר מופיע רק המספר הסידורי של השבוע - תווית באורך
// אחיד שלא מתנגשת בעמודות. השם המלא נקרא מהכתובית שמתחת לגרף (בלחיצה על
// עמודה) ומהטבלה "פירוט לפי שבוע", שבה לכל שורה אותו מספר.
const PLOT_HEIGHT = 110;

const WeeklyBarChart = ({ weeks, activeIndex, onSelect }) => {
  // כשיש הרבה שבועות הגרף נגלל, ולכן השבוע הנבחר נגרר למרכז התצוגה
  const activeRef = useRef(null);
  useEffect(() => {
    const el = activeRef.current;
    if (el && el.scrollIntoView) el.scrollIntoView({ inline: 'center', block: 'nearest' });
  }, [activeIndex]);

  if (!weeks || weeks.length === 0) {
    return <p style={{ color: 'var(--text-4, #999)', fontSize: 'var(--fs-sm)', textAlign: 'center' }}>אין נתונים עדיין</p>;
  }

  const maxScore = Math.max(...weeks.map((w) => w.weeklyScore || 0), 1);
  // עד 11 שבועות נכנסים במסך טלפון בלי גלילה; מעבר לזה הגרף נגלל
  const barWidth = weeks.length > 8 ? 22 : 38;
  const gap = weeks.length > 12 ? 5 : 6;
  const active = weeks[activeIndex] || weeks[weeks.length - 1];

  const column = (week, i, children, ref) => (
    <div
      key={week.weekId || i}
      ref={ref}
      onClick={() => onSelect(i)}
      role="button"
      title={week.weekName}
      style={{ width: barWidth + 'px', flexShrink: 0, cursor: 'pointer' }}
    >
      {children}
    </div>
  );

  return (
    <div>
      <div style={{ overflowX: 'auto', paddingBottom: '2px' }}>
        <div style={{ minWidth: 'min-content' }}>
          {/* אזור העמודות - כולן יושבות על אותו קו בסיס */}
          <div style={{
            display: 'flex', gap: gap + 'px', alignItems: 'flex-end',
            borderBottom: '1px solid var(--border, #e9edf2)'
          }}>
            {weeks.map((week, i) => {
              const score = week.weeklyScore || 0;
              const height = Math.max(score > 0 ? 6 : 3, (score / maxScore) * PLOT_HEIGHT);
              const isActive = i === activeIndex;
              return column(week, i, (
                <>
                  <div style={{
                    height: '15px', textAlign: 'center',
                    fontSize: 'var(--fs-xs)', fontWeight: '700',
                    color: isActive ? 'var(--theme-primary-text, #007bff)' : 'var(--text-4, #aaa)'
                  }}>
                    {pts(score)}
                  </div>
                  <div style={{ height: PLOT_HEIGHT + 'px', display: 'flex', alignItems: 'flex-end' }}>
                    <div style={{
                      width: '100%', height: height + 'px',
                      borderRadius: '6px 6px 0 0',
                      background: score > 0
                        ? 'linear-gradient(180deg, var(--theme-primary, #007bff), var(--theme-secondary, #6c757d))'
                        : 'var(--surface-3, #e9edf2)',
                      opacity: isActive || score === 0 ? 1 : 0.55,
                      transition: 'height 0.5s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease',
                      transitionDelay: (i * 40) + 'ms'
                    }} />
                  </div>
                </>
              ), isActive ? activeRef : null);
            })}
          </div>

          {/* שורת התוויות - גובה אחיד, בלי סיבוב */}
          <div style={{ display: 'flex', gap: gap + 'px', marginTop: '5px' }}>
            {weeks.map((week, i) => {
              const isActive = i === activeIndex;
              return column(week, i, (
                <div style={{
                  textAlign: 'center', fontSize: 'var(--fs-xs)', lineHeight: '16px',
                  height: '16px', borderRadius: '8px',
                  fontWeight: isActive ? '800' : '600',
                  color: isActive ? '#fff' : 'var(--text-4, #aaa)',
                  background: isActive ? 'var(--theme-primary, #007bff)' : 'transparent'
                }}>
                  {week.weekIndex}
                </div>
              ));
            })}
          </div>
        </div>
      </div>

      {/* הכתובית - כאן מופיע השם המלא של השבוע הנבחר */}
      {active && (
        <div style={{
          marginTop: '10px', padding: '8px 10px', borderRadius: '10px',
          background: 'var(--surface-2, #f8f9fc)',
          display: 'flex', alignItems: 'center', gap: '8px'
        }}>
          <span style={{
            minWidth: '20px', height: '20px', borderRadius: '6px',
            background: 'var(--theme-primary, #007bff)', color: '#fff',
            fontSize: 'var(--fs-xs)', fontWeight: '800', lineHeight: '20px', textAlign: 'center'
          }}>
            {active.weekIndex}
          </span>
          <span style={{
            flex: 1, fontSize: 'var(--fs-xs)', fontWeight: '700', color: 'var(--text, #333)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
          }}>
            {active.weekName}
          </span>
          <span style={{ fontSize: 'var(--fs-sm)', fontWeight: '800', color: 'var(--theme-primary-text, #007bff)' }}>
            {pts(active.weeklyScore)} נק׳
          </span>
          <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-4, #aaa)', fontWeight: '500' }}>
            מצטבר {pts(active.cumulativeScore)}
          </span>
        </div>
      )}
      <p style={{ margin: '6px 2px 0', fontSize: 'var(--fs-xs)', color: 'var(--text-3, #5f6670)' }}>
        לחיצה על עמודה מציגה את שם השבוע
      </p>
    </div>
  );
};

// הגרף המצטבר. הסכום הרץ מחושב מהניקוד השבועי ולא מ-totalScore שנשמר על
// הרשומה: זה הסך הכולל של כל העונות, זהה בכל השבועות, ולכן הקו יצא שטוח
const CumulativeChart = ({ weeks, activeIndex, onSelect }) => {
  if (!weeks || weeks.length === 0) return null;

  const maxTotal = Math.max(...weeks.map((w) => w.cumulativeScore || 0), 1);
  const chartHeight = 120;
  const axisPad = 36; // מקום למספרים בציר. הוא מימין, כמו בכל שאר האפליקציה
  const step = Math.max(24, Math.min(60, (window.innerWidth - 110) / Math.max(weeks.length - 1, 1)));
  const chartWidth = Math.max(step * Math.max(weeks.length - 1, 1) + axisPad + 14, 280);

  // הזמן זורם מימין לשמאל, בדיוק כמו בגרף העמודות שמעליו
  const points = weeks.map((w, i) => {
    const x = chartWidth - axisPad - i * step;
    const y = chartHeight - ((w.cumulativeScore || 0) / maxTotal) * (chartHeight - 22) - 10;
    return { x, y, week: w };
  });

  const pathD = points.map((p, i) => (i === 0 ? 'M' : 'L') + p.x + ' ' + p.y).join(' ');
  const last = points[points.length - 1];

  // תוויות הציר: הראשון, האחרון והנבחר תמיד, והשאר רק אם נשאר להם מקום
  const labelled = new Set([0, points.length - 1, activeIndex].filter((i) => i >= 0 && i < points.length));
  const taken = [...labelled].map((i) => points[i].x);
  for (let i = 0; i < points.length; i++) {
    if (labelled.has(i)) continue;
    if (taken.every((x) => Math.abs(x - points[i].x) >= 26)) {
      labelled.add(i);
      taken.push(points[i].x);
    }
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg width={chartWidth} height={chartHeight + 26} style={{ display: 'block' }}>
        {[0, 0.5, 1].map((pct, i) => {
          const y = chartHeight - pct * (chartHeight - 22) - 10;
          return (
            <g key={i}>
              <line x1="8" y1={y} x2={chartWidth - axisPad + 6} y2={y} stroke="var(--border, #e5e7eb)" strokeWidth="1" />
              <text x={chartWidth - axisPad + 14} y={y + 4} fontSize="12" fill="var(--text-3, #5f6670)" textAnchor="start">
                {pts(maxTotal * pct)}
              </text>
            </g>
          );
        })}

        {points.length > 1 && (
          <path
            d={pathD + ' L' + last.x + ' ' + (chartHeight - 10) + ' L' + points[0].x + ' ' + (chartHeight - 10) + ' Z'}
            fill="url(#areaGradient)" opacity="0.3"
          />
        )}
        <path d={pathD} pathLength="1" className="line-draw" fill="none" stroke="var(--theme-primary, #007bff)" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round" />

        {points.map((p, i) => (
          <g key={i} onClick={() => onSelect(i)} style={{ cursor: 'pointer' }}>
            <circle cx={p.x} cy={p.y} r="9" fill="transparent" />
            <circle cx={p.x} cy={p.y} r={i === activeIndex ? '5' : '3.5'}
              fill={i === activeIndex ? 'var(--theme-primary, #007bff)' : '#fff'}
              stroke="var(--theme-primary, #007bff)" strokeWidth="2" />
          </g>
        ))}

        {/* מספרי השבועות על הציר - רק אלה שיש להם מקום, כדי שלא יתנגשו */}
        {points.map((p, i) => {
          if (!labelled.has(i)) return null;
          return (
            <text key={'l' + i} x={p.x} y={chartHeight + 18} fontSize="12" textAnchor="middle"
              fontWeight={i === activeIndex ? '800' : '500'}
              fill={i === activeIndex ? 'var(--theme-primary-text, #007bff)' : 'var(--text-3, #5f6670)'}>
              {p.week.weekIndex}
            </text>
          );
        })}

        <defs>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--theme-primary, #007bff)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="var(--theme-primary, #007bff)" stopOpacity="0.02" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
};

// "התאום בהימורים" - מי שמהמר הכי הרבה אותה תוצאה בדיוק כמוך.
// האחוז מחושב מתוך המשחקים ששניכם הימרתם עליהם, בשבועות נעולים בלבד
const BettingTwins = ({ data }) => {
  const twins = (data && data.twins) || [];
  if (twins.length === 0) {
    return (
      <p style={{ color: 'var(--text-4, #999)', fontSize: 'var(--fs-xs)', textAlign: 'center', margin: '0.3rem 0' }}>
        עוד אין מספיק משחקים משותפים עם שחקן אחר (צריך לפחות {(data && data.minCommon) || 10})
      </p>
    );
  }

  const [twin, ...rest] = twins;
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          width: '44px', height: '44px', borderRadius: '50%', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(135deg, var(--theme-primary, #007bff), var(--theme-secondary, #6c757d))',
          color: '#fff', fontSize: 'var(--fs-lg)', fontWeight: '800'
        }}>
          {(twin.name || '?').trim().charAt(0)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 'var(--fs-md)', fontWeight: '800', color: 'var(--text, #333)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
          }}>
            {twin.name}
          </div>
          <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3, #888)', marginTop: '1px' }}>
            אותה תוצאה בדיוק ב-{twin.same} מתוך {twin.common} משחקים משותפים
          </div>
        </div>
        <div style={{ textAlign: 'center', flexShrink: 0 }}>
          <div style={{ fontSize: 'var(--fs-xl)', fontWeight: '800', color: 'var(--theme-primary-text, #007bff)', lineHeight: 1.1 }}>
            {twin.sameRate}%
          </div>
          <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-4, #aaa)', fontWeight: '600' }}>זהים</div>
        </div>
      </div>

      <div style={{
        marginTop: '8px', fontSize: 'var(--fs-xs)', color: 'var(--text-3, #888)',
        background: 'var(--surface-2, #f8f9fc)', borderRadius: '8px', padding: '6px 10px'
      }}>
        ובאותו כיוון (מי מנצח או תיקו): <b style={{ color: 'var(--text-2, #555)' }}>{twin.directionRate}%</b> מהמשחקים
      </div>

      {rest.length > 0 && (
        <div style={{ marginTop: '8px' }}>
          {rest.map((t, i) => (
            <div key={t.userId} style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '5px 4px', fontSize: 'var(--fs-xs)'
            }}>
              <span style={{ width: '16px', textAlign: 'center', color: 'var(--text-4, #aaa)', fontWeight: '700' }}>{i + 2}</span>
              <span style={{
                flex: 1, fontWeight: '600', color: 'var(--text-2, #555)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
              }}>
                {t.name}
              </span>
              <span dir="ltr" style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-4, #aaa)' }}>{t.same}/{t.common}</span>
              <span style={{ minWidth: '36px', textAlign: 'left', fontWeight: '800', color: 'var(--text-2, #555)' }}>
                {t.sameRate}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// === רכיבי הסקירה ===
// מוגדרים מחוץ ל-PlayerStats בכוונה: רכיב שמוגדר בתוך רכיב אחר נבנה מחדש
// בכל ציור שלו, ואנימציית הכניסה הייתה מתחילה מחדש בכל לחיצה במסך.

// "גדל" אחרי הציור הראשון: מ-0 לערך האמיתי, עם מעבר ב-CSS
const useGrown = () => {
  const [grown, setGrown] = useState(reducedMotion);
  useEffect(() => {
    if (grown) return undefined;
    let r2;
    const r1 = requestAnimationFrame(() => { r2 = requestAnimationFrame(() => setGrown(true)); });
    return () => { cancelAnimationFrame(r1); cancelAnimationFrame(r2); };
  }, [grown]);
  return grown;
};

const DONUT_EASE = '1.1s cubic-bezier(0.4, 0, 0.2, 1)';

const DonutChart = ({ exact, direction, wrong, accuracy, size = 120 }) => {
  const grown = useGrown();
  const shown = useCountUp(accuracy, { duration: 1100 });
  const total = exact + direction + wrong;
  if (total === 0) return null;

  const r = (size - 16) / 2;
  const circumference = 2 * Math.PI * r;
  const center = size / 2;

  // הטבעת מתמלאת מ-0: הירוק והכתום גדלים, והאפור מקבל את השאר
  const k = grown ? 1 : 0;
  const exactLen = (exact / total) * circumference * k;
  const dirLen = (direction / total) * circumference * k;
  const wrongLen = circumference - exactLen - dirLen;
  const ring = { transition: `stroke-dasharray ${DONUT_EASE}, stroke-dashoffset ${DONUT_EASE}` };

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={center} cy={center} r={r} fill="none" stroke="var(--surface-3, #e8ecf0)" strokeWidth="14"
        strokeDasharray={`${wrongLen} ${circumference - wrongLen}`}
        strokeDashoffset={0} style={ring} />
      <circle cx={center} cy={center} r={r} fill="none" stroke="#f59e0b" strokeWidth="14"
        strokeDasharray={`${dirLen} ${circumference - dirLen}`}
        strokeDashoffset={-wrongLen} strokeLinecap={dirLen > 0 ? 'round' : 'butt'} style={ring} />
      <circle cx={center} cy={center} r={r} fill="none" stroke="#10b981" strokeWidth="14"
        strokeDasharray={`${exactLen} ${circumference - exactLen}`}
        strokeDashoffset={-(wrongLen + dirLen)} strokeLinecap={exactLen > 0 ? 'round' : 'butt'} style={ring} />
      <text x={center} y={center - 6} textAnchor="middle" dominantBaseline="middle"
        style={{ transform: 'rotate(90deg)', transformOrigin: `${center}px ${center}px`, fontSize: 'var(--fs-xl)', fontWeight: '800', fill: 'var(--text, #333)', fontVariantNumeric: 'tabular-nums' }}>
        {shown}%
      </text>
      <text x={center} y={center + 14} textAnchor="middle" dominantBaseline="middle"
        style={{ transform: 'rotate(90deg)', transformOrigin: `${center}px ${center}px`, fontSize: 'var(--fs-xs)', fill: 'var(--text-3, #5f6670)', fontWeight: '500' }}>
        פגיעה
      </text>
    </svg>
  );
};

const MiniBar = ({ value, max, color, label, count }) => {
  const grown = useGrown();
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div style={{ marginBottom: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
        <span style={{ fontSize: 'var(--fs-xs)', fontWeight: '600', color: 'var(--text-2, #555)' }}>{label}</span>
        <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3, #888)' }}>{count != null ? count : value}</span>
      </div>
      <div style={{ height: '8px', borderRadius: '4px', background: 'var(--surface-3, #f0f2f5)', overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: '4px', width: `${grown ? pct : 0}%`,
          background: color, transition: 'width 0.9s cubic-bezier(0.4, 0, 0.2, 1)'
        }} />
      </div>
    </div>
  );
};

// מספר שנספר מ-0 בכניסה הראשונה למסך
const StatPill = ({ value, decimals = 0, suffix = '', label, color, bg }) => {
  const shown = useCountUp(value, { decimals });
  return (
    <div style={{
      flex: 1, textAlign: 'center', padding: '0.6rem 0.3rem',
      background: bg || 'var(--surface-2, #f8f9fc)', borderRadius: '12px',
    }}>
      <div style={{ fontSize: 'var(--fs-xl)', fontWeight: '800', color: color || 'var(--text, #333)', lineHeight: 1.2, fontVariantNumeric: 'tabular-nums' }}>
        {shown}{suffix}
      </div>
      <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3, #888)', fontWeight: '600', marginTop: '2px' }}>
        {label}
      </div>
    </div>
  );
};

// === Card Wrapper ===
const Card = ({ children, title, icon, style = {} }) => (
  <div style={{
    background: 'var(--surface, #fff)', borderRadius: '16px',
    padding: '0.85rem', marginBottom: '0.6rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.04)',
    border: '1px solid rgba(0,0,0,0.05)',
    ...style
  }}>
    {title && (
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.7rem' }}>
        {icon && <span style={{ fontSize: 'var(--fs-md)' }}>{icon}</span>}
        <span style={{ fontWeight: '700', fontSize: 'var(--fs-sm)', color: 'var(--text, #333)' }}>{title}</span>
      </div>
    )}
    {children}
  </div>
);

// === Team Row ===
const TeamRow = ({ team, rank, isBest }) => {
  const color = isBest ? '#15803d' : '#c62828'; // לבן עליהם: 5:1 ומעלה
  const bg = isBest ? 'var(--good-bg, #ecfdf5)' : 'var(--bad-bg, #fef2f2)';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '8px',
      padding: '8px 10px', borderRadius: '10px',
      background: bg, marginBottom: '6px',
      animation: 'slideUp 0.3s ease both',
      animationDelay: (rank * 60) + 'ms'
    }}>
      <span style={{
        width: '22px', height: '22px', borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 'var(--fs-xs)', fontWeight: '800', color: '#fff',
        background: color
      }}>
        {rank + 1}
      </span>
      <TeamLogo name={team.name} src={team.logo} size={18} />
      <span style={{ flex: 1, fontSize: 'var(--fs-sm)', fontWeight: '700', color: 'var(--text, #333)' }}>
        {team.name}
      </span>
      <div style={{ textAlign: 'left', display: 'flex', gap: '8px', alignItems: 'center' }}>
        <span style={{
          fontSize: 'var(--fs-xs)', color: 'var(--text-3, #888)',
        }}>
          {team.bets} משחקים
        </span>
        <span style={{
          padding: '2px 8px', borderRadius: '8px',
          fontSize: 'var(--fs-xs)', fontWeight: '800',
          background: color, color: '#fff'
        }}>
          {team.accuracy}%
        </span>
      </div>
    </div>
  );
};

function PlayerStats({ user, active = true }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('overview');
  // השבוע שהכתובית בגרפים מציגה. null = השבוע האחרון
  const [selectedWeek, setSelectedWeek] = useState(null);

  const API_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:5000/api'
    : 'https://football-betting-backend.onrender.com/api';

  // הלשונית נשארת טעונה; חזרה אליה אחרי יותר מדקה מרעננת ברקע
  useReturnRefresh(active, () => loadStats({ silent: true }));

  useEffect(() => {
    loadStats();
  }, [user, user?.theme]);

  const loadStats = async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);
      const userId = user._id || user.id;
      // הקבוצה של ערכת הנושא, לכרטיס "אתה והקבוצה שלך". לערכות שאינן
      // קבוצה (ברירת המחדל) אין כרטיס
      const themeTeam = user.theme && user.theme !== 'default' ? getTheme(user.theme).name : '';
      const query = themeTeam ? `?team=${encodeURIComponent(themeTeam)}` : '';
      const response = await fetch(`${API_URL}/stats/user/${userId}${query}`);
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <SkeletonStats />;
  }

  if (!stats || stats.overview.totalBets === 0) {
    return (
      <div style={{
        padding: '2rem', textAlign: 'center',
        background: 'var(--info-bg, #f8f9ff)',
        borderRadius: '16px', margin: '0.5rem 0'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '0.5rem' }}>📊</div>
        <p style={{ color: 'var(--text-3, #666)', fontSize: 'var(--fs-md)', fontWeight: '600' }}>אין עדיין סטטיסטיקות</p>
        <p style={{ color: 'var(--text-4, #999)', fontSize: 'var(--fs-sm)' }}>התחל להמר כדי לראות את הנתונים שלך!</p>
      </div>
    );
  }

  const { overview, weeklyTimeline, predictionDistribution, topPredictions, bestTeams, worstTeams, bestHitStreak, currentHitStreak, nearMisses, bettingTwins } = stats;
  const insights = stats.insights || {};

  // סכום רץ אמיתי לכל שבוע. גם אם השרת עדיין לא שולח cumulativeScore
  // (גרסה קודמת), הגרף המצטבר לא נשאר שטוח
  let runningTotal = 0;
  const timelineWeeks = (weeklyTimeline || []).map((w, i) => {
    runningTotal += w.weeklyScore || 0;
    return {
      ...w,
      weekIndex: w.weekIndex || i + 1,
      cumulativeScore: w.cumulativeScore != null ? w.cumulativeScore : Math.round(runningTotal * 10) / 10,
    };
  });
  const activeWeek = timelineWeeks.length === 0
    ? -1
    : Math.min(selectedWeek == null ? timelineWeeks.length - 1 : selectedWeek, timelineWeeks.length - 1);

  const sections = [
    { key: 'overview', label: 'סקירה', icon: '📊' },
    { key: 'nearmiss', label: 'כמה קרוב', icon: '🎯' },
    { key: 'timeline', label: 'ציר זמן', icon: '📈' },
    { key: 'teams', label: 'קבוצות', icon: '⚽' },
  ];

  // === Donut Chart Component ===
  return (
    <div style={{ animation: 'scaleIn 0.2s ease' }}>
      {/* Section Tabs */}
      <div style={{
        display: 'grid', gridTemplateColumns: `repeat(${sections.length}, 1fr)`,
        gap: '4px', marginBottom: '0.6rem', padding: '3px',
        backgroundColor: 'var(--surface-3, #f0f2f5)', borderRadius: '12px',
        boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.06)'
      }}>
        {sections.map(s => {
          const isActive = activeSection === s.key;
          return (
            <button key={s.key} onClick={() => setActiveSection(s.key)} style={{
              padding: '0.4rem', border: 'none', borderRadius: '10px',
              background: isActive ? 'var(--surface, #fff)' : 'transparent',
              color: isActive ? 'var(--theme-primary-text, #007bff)' : 'var(--text-3, #888)',
              fontWeight: isActive ? '700' : '500', fontSize: 'var(--fs-xs)',
              cursor: 'pointer', display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: '1px',
              boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.25s ease'
            }}>
              <span style={{ fontSize: 'var(--fs-sm)' }}>{s.icon}</span>
              <span>{s.label}</span>
            </button>
          );
        })}
      </div>

      {/* === OVERVIEW === */}
      {activeSection === 'overview' && (
        <div style={{ animation: 'scaleIn 0.2s ease' }}>
          {/* Donut + Key Stats */}
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <DonutChart exact={overview.exactCount} direction={overview.directionCount} wrong={overview.wrongCount} accuracy={overview.accuracy} />
              <div style={{ flex: 1 }}>
                <MiniBar value={overview.exactCount} max={overview.totalBets} color="linear-gradient(90deg, #10b981, #34d399)" label="🎯 מדויק" count={overview.exactCount} />
                <MiniBar value={overview.directionCount} max={overview.totalBets} color="linear-gradient(90deg, #f59e0b, #fbbf24)" label="👆 כיוון" count={overview.directionCount} />
                <MiniBar value={overview.wrongCount} max={overview.totalBets} color="var(--text-4, #9aa2ae)" label="❌ החטאה" count={overview.wrongCount} />
              </div>
            </div>
          </Card>

          {/* Stats Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '0.6rem' }}>
            {/* רקעים מהטוקנים ולא מעברי צבע קבועים: הבהירים נשארו לבנים בוהקים במצב כהה */}
            <StatPill value={overview.totalBets} label="הימורים" color="var(--theme-primary-text, #007bff)" bg="var(--surface-2, #f8f9fc)" />
            <StatPill value={overview.totalPoints} decimals={1} label="נקודות" color="var(--good-fg, #1a6b35)" bg="var(--good-bg, #ecfdf5)" />
            <StatPill value={overview.exactRate} suffix="%" label="דיוק מלא" color="var(--info-fg, #1560ad)" bg="var(--info-bg, #eff6ff)" />
          </div>

          {/* Streaks */}
          <Card title="רצפים" icon="🔥">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div style={{
                textAlign: 'center', padding: '0.6rem',
                background: 'var(--warn-bg, #fff7ed)',
                borderRadius: '12px'
              }}>
                <div style={{ fontSize: 'var(--fs-xl)', fontWeight: '800', color: 'var(--warn-fg, #ea580c)' }}>{bestHitStreak}</div>
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--warn-fg, #9a3412)', fontWeight: '600' }}>שיא רצף פגיעות</div>
              </div>
              <div style={{
                textAlign: 'center', padding: '0.6rem',
                background: 'var(--warn-bg, #fefce8)',
                borderRadius: '12px'
              }}>
                <div style={{ fontSize: 'var(--fs-xl)', fontWeight: '800', color: 'var(--warn-fg, #8a5d00)' }}>{currentHitStreak}</div>
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--warn-fg, #854d0e)', fontWeight: '600' }}>רצף נוכחי</div>
              </div>
            </div>
          </Card>

          {/* התאום בהימורים. לא מוצג מול שרת ישן שעוד לא שולח את הנתון */}
          {/* Prediction Distribution */}
          <Card title="התפלגות ניחושים" icon="🎲">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
              {[
                { key: 'home', label: '1 ניצחון בית', color: 'var(--info-fg, #1d4ed8)', bg: 'var(--info-bg, #eff6ff)' },
                { key: 'draw', label: 'X תיקו', color: 'var(--warn-fg, #92400e)', bg: 'var(--warn-bg, #fffbeb)' },
                { key: 'away', label: '2 ניצחון חוץ', color: 'var(--bad-fg, #b91c1c)', bg: 'var(--bad-bg, #fef2f2)' },
              ].map(item => {
                const total = predictionDistribution.home + predictionDistribution.draw + predictionDistribution.away;
                const pct = total > 0 ? Math.round((predictionDistribution[item.key] / total) * 100) : 0;
                return (
                  <div key={item.key} style={{
                    textAlign: 'center', padding: '0.5rem 0.3rem',
                    background: item.bg, borderRadius: '10px'
                  }}>
                    <div style={{ fontSize: 'var(--fs-lg)', fontWeight: '800', color: item.color }}>{pct}%</div>
                    <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3, #666)', fontWeight: '600' }}>{item.label}</div>
                    <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-4, #aaa)' }}>{predictionDistribution[item.key]}</div>
                  </div>
                );
              })}
            </div>
          </Card>

          <GoalsCard goals={insights.goals} />

          {/* Top Predictions */}
          <Card title="תוצאות שמנחש הכי הרבה" icon="🏅">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {topPredictions.map((pred, i) => (
                <div key={i} style={{
                  padding: '6px 12px', borderRadius: '20px',
                  background: i === 0 ? 'linear-gradient(135deg, var(--theme-primary, #007bff), var(--theme-secondary, #6c757d))' : 'var(--surface-3, #f0f2f5)',
                  color: i === 0 ? '#fff' : 'var(--text-2, #555)',
                  fontSize: 'var(--fs-sm)', fontWeight: '700',
                  boxShadow: i === 0 ? '0 2px 8px rgba(0,0,0,0.15)' : 'none'
                }}>
                  {pred.score} <span style={{ fontSize: 'var(--fs-xs)', opacity: 0.8 }}>({pred.count}×)</span>
                </div>
              ))}
            </div>
          </Card>

          {/* מול שאר השחקנים */}
          {bettingTwins && (
            <Card title="התאום שלך בהימורים" icon="👯">
              <BettingTwins data={bettingTwins} />
            </Card>
          )}
          <CrowdCard crowd={insights.crowd} />
        </div>
      )}

      {/* === TIMELINE === */}
      {activeSection === 'timeline' && (
        <div style={{ animation: 'scaleIn 0.2s ease' }}>
          <SeasonRankCard history={insights.seasonRank} />

          <Card title="ניקוד שבועי" icon="📊">
            <WeeklyBarChart weeks={timelineWeeks} activeIndex={activeWeek} onSelect={setSelectedWeek} />
          </Card>

          <Card title="ניקוד מצטבר" icon="📈">
            <CumulativeChart weeks={timelineWeeks} activeIndex={activeWeek} onSelect={setSelectedWeek} />
          </Card>

          {/* Weekly Table */}
          <Card title="פירוט לפי שבוע" icon="📋">
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {timelineWeeks.map((week, i) => {
                const isActive = i === activeWeek;
                return (
                  <div key={week.weekId || i} onClick={() => setSelectedWeek(i)} style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '8px 10px', borderRadius: '8px', cursor: 'pointer',
                    background: isActive
                      ? 'var(--info-bg, #eff6ff)'
                      : (i % 2 === 0 ? 'var(--surface-2, #fafbfc)' : 'transparent'),
                  }}>
                    {/* אותו מספר שמופיע על הציר בגרפים */}
                    <span style={{
                      minWidth: '18px', height: '18px', borderRadius: '5px', textAlign: 'center',
                      fontSize: 'var(--fs-xs)', fontWeight: '800', lineHeight: '18px',
                      background: isActive ? 'var(--theme-primary, #007bff)' : 'var(--surface-3, #eef1f5)',
                      color: isActive ? '#fff' : 'var(--text-4, #aaa)'
                    }}>
                      {week.weekIndex}
                    </span>
                    <span style={{
                      flex: 1, fontSize: 'var(--fs-xs)', color: 'var(--text-2, #555)', fontWeight: '600',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                    }}>
                      {week.weekName}
                    </span>
                    <span style={{
                      fontSize: 'var(--fs-sm)', fontWeight: '800',
                      color: week.weeklyScore > 0 ? 'var(--theme-primary-text, #007bff)' : 'var(--text-4, #ccc)'
                    }}>
                      {pts(week.weeklyScore)} נק׳
                    </span>
                    <span style={{
                      fontSize: 'var(--fs-xs)', color: 'var(--text-4, #aaa)', fontWeight: '500',
                      minWidth: '58px', textAlign: 'left'
                    }}>
                      מצטבר {pts(week.cumulativeScore)}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* === כמה קרוב היית === */}
      {activeSection === 'nearmiss' && <NearMissView nearMisses={nearMisses} userId={user._id || user.id} />}

      {/* === TEAMS === */}
      {activeSection === 'teams' && (
        <div style={{ animation: 'scaleIn 0.2s ease' }}>
          <ThemeTeamCard data={insights.themeTeam} />
          <LeaguesCard leagues={insights.leagues} />

          {/* Best Teams */}
          <Card title="הכי טוב מנחש" icon="🏆">
            {bestTeams.length > 0 ? (
              bestTeams.map((team, i) => (
                <TeamRow key={team.name} team={team} rank={i} isBest={true} />
              ))
            ) : (
              <p style={{ color: 'var(--text-4, #999)', fontSize: 'var(--fs-sm)', textAlign: 'center' }}>צריך לפחות 3 הימורים לקבוצה</p>
            )}
          </Card>

          {/* Worst Teams */}
          <Card title="הכי קשה לנחש" icon="😵">
            {worstTeams.length > 0 ? (
              worstTeams.map((team, i) => (
                <TeamRow key={team.name} team={team} rank={i} isBest={false} />
              ))
            ) : (
              <p style={{ color: 'var(--text-4, #999)', fontSize: 'var(--fs-sm)', textAlign: 'center' }}>צריך לפחות 3 הימורים לקבוצה</p>
            )}
          </Card>

          {/* All Teams */}
          <Card title="כל הקבוצות" icon="📋">
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {stats.teamStats.map((team, i) => (
                <div key={team.name} style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '6px 8px', borderRadius: '8px',
                  background: i % 2 === 0 ? 'var(--surface-2, #fafbfc)' : 'transparent',
                }}>
                  <TeamLogo name={team.name} src={team.logo} size={16} />
                  <span style={{ flex: 1, fontSize: 'var(--fs-xs)', fontWeight: '600', color: 'var(--text-2, #444)' }}>
                    {team.name}
                  </span>
                  <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-4, #aaa)' }}>{team.bets}</span>
                  <div style={{
                    width: '50px', height: '6px', borderRadius: '3px',
                    background: 'var(--surface-3, #f0f2f5)', overflow: 'hidden'
                  }}>
                    <div style={{
                      height: '100%', borderRadius: '3px',
                      width: team.accuracy + '%',
                      background: accuracyBar(team.accuracy)
                    }} />
                  </div>
                  <span style={{
                    fontSize: 'var(--fs-xs)', fontWeight: '700', minWidth: '32px', textAlign: 'left',
                    color: accuracyText(team.accuracy)
                  }}>
                    {team.accuracy}%
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

export default PlayerStats;
