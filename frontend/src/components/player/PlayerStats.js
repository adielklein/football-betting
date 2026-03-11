import React, { useState, useEffect } from 'react';

function PlayerStats({ user }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('overview');

  const API_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:5000/api'
    : 'https://football-betting-backend.onrender.com/api';

  useEffect(() => {
    loadStats();
  }, [user]);

  const loadStats = async () => {
    try {
      setLoading(true);
      const userId = user._id || user.id;
      const response = await fetch(`${API_URL}/stats/user/${userId}`);
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div style={{
          width: '40px', height: '40px', margin: '0 auto 1rem',
          border: '3px solid #f0f0f0',
          borderTop: '3px solid var(--theme-primary, #007bff)',
          borderRadius: '50%', animation: 'spin 0.8s linear infinite'
        }} />
        <p style={{ color: '#888', fontSize: '14px' }}>טוען סטטיסטיקות...</p>
      </div>
    );
  }

  if (!stats || stats.overview.totalBets === 0) {
    return (
      <div style={{
        padding: '2rem', textAlign: 'center',
        background: 'linear-gradient(135deg, #f8f9ff, #f0f4ff)',
        borderRadius: '16px', margin: '0.5rem 0'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '0.5rem' }}>📊</div>
        <p style={{ color: '#666', fontSize: '15px', fontWeight: '600' }}>אין עדיין סטטיסטיקות</p>
        <p style={{ color: '#999', fontSize: '13px' }}>התחל להמר כדי לראות את הנתונים שלך!</p>
      </div>
    );
  }

  const { overview, weeklyTimeline, predictionDistribution, topPredictions, bestTeams, worstTeams, bestHitStreak, currentHitStreak } = stats;

  const sections = [
    { key: 'overview', label: 'סקירה', icon: '📊' },
    { key: 'timeline', label: 'ציר זמן', icon: '📈' },
    { key: 'teams', label: 'קבוצות', icon: '⚽' },
  ];

  // === Donut Chart Component ===
  const DonutChart = ({ exact, direction, wrong, size = 120 }) => {
    const total = exact + direction + wrong;
    if (total === 0) return null;

    const exactPct = (exact / total) * 100;
    const dirPct = (direction / total) * 100;

    const r = (size - 16) / 2;
    const circumference = 2 * Math.PI * r;
    const center = size / 2;

    const exactLen = (exactPct / 100) * circumference;
    const dirLen = (dirPct / 100) * circumference;
    const wrongLen = circumference - exactLen - dirLen;

    return (
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {/* Wrong (gray) */}
        <circle cx={center} cy={center} r={r} fill="none" stroke="#e8ecf0" strokeWidth="14"
          strokeDasharray={`${wrongLen} ${circumference - wrongLen}`}
          strokeDashoffset={0} />
        {/* Direction (orange) */}
        <circle cx={center} cy={center} r={r} fill="none" stroke="#f59e0b" strokeWidth="14"
          strokeDasharray={`${dirLen} ${circumference - dirLen}`}
          strokeDashoffset={-wrongLen} strokeLinecap="round" />
        {/* Exact (green) */}
        <circle cx={center} cy={center} r={r} fill="none" stroke="#10b981" strokeWidth="14"
          strokeDasharray={`${exactLen} ${circumference - exactLen}`}
          strokeDashoffset={-(wrongLen + dirLen)} strokeLinecap="round" />
        {/* Center text */}
        <text x={center} y={center - 6} textAnchor="middle" dominantBaseline="middle"
          style={{ transform: 'rotate(90deg)', transformOrigin: `${center}px ${center}px`, fontSize: '22px', fontWeight: '800', fill: '#333' }}>
          {overview.accuracy}%
        </text>
        <text x={center} y={center + 14} textAnchor="middle" dominantBaseline="middle"
          style={{ transform: 'rotate(90deg)', transformOrigin: `${center}px ${center}px`, fontSize: '10px', fill: '#999', fontWeight: '500' }}>
          דיוק
        </text>
      </svg>
    );
  };

  // === Mini Bar Component ===
  const MiniBar = ({ value, max, color, label, count }) => {
    const pct = max > 0 ? (value / max) * 100 : 0;
    return (
      <div style={{ marginBottom: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
          <span style={{ fontSize: '12px', fontWeight: '600', color: '#555' }}>{label}</span>
          <span style={{ fontSize: '12px', color: '#888' }}>{count != null ? count : value}</span>
        </div>
        <div style={{
          height: '8px', borderRadius: '4px', background: '#f0f2f5', overflow: 'hidden'
        }}>
          <div style={{
            height: '100%', borderRadius: '4px', width: `${pct}%`,
            background: color,
            transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
          }} />
        </div>
      </div>
    );
  };

  // === Card Wrapper ===
  const Card = ({ children, title, icon, style = {} }) => (
    <div style={{
      background: '#fff', borderRadius: '16px',
      padding: '0.85rem', marginBottom: '0.6rem',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.04)',
      border: '1px solid rgba(0,0,0,0.05)',
      ...style
    }}>
      {title && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.7rem' }}>
          {icon && <span style={{ fontSize: '16px' }}>{icon}</span>}
          <span style={{ fontWeight: '700', fontSize: '14px', color: '#333' }}>{title}</span>
        </div>
      )}
      {children}
    </div>
  );

  // === Stat Pill ===
  const StatPill = ({ value, label, color, bg }) => (
    <div style={{
      flex: 1, textAlign: 'center', padding: '0.6rem 0.3rem',
      background: bg || '#f8f9fc', borderRadius: '12px',
    }}>
      <div style={{ fontSize: '22px', fontWeight: '800', color: color || '#333', lineHeight: 1.2 }}>
        {value}
      </div>
      <div style={{ fontSize: '10px', color: '#888', fontWeight: '600', marginTop: '2px' }}>
        {label}
      </div>
    </div>
  );

  // === Timeline Bar Chart ===
  const TimelineChart = () => {
    if (!weeklyTimeline || weeklyTimeline.length === 0) {
      return <p style={{ color: '#999', fontSize: '13px', textAlign: 'center' }}>אין נתונים עדיין</p>;
    }

    const maxScore = Math.max(...weeklyTimeline.map(w => w.weeklyScore), 1);
    const barWidth = Math.max(20, Math.min(40, (window.innerWidth - 80) / weeklyTimeline.length));

    return (
      <div style={{ overflowX: 'auto', paddingBottom: '0.5rem' }}>
        <div style={{
          display: 'flex', alignItems: 'flex-end', gap: '4px',
          minHeight: '140px', padding: '0.5rem 0',
          minWidth: weeklyTimeline.length * (barWidth + 4)
        }}>
          {weeklyTimeline.map((week, i) => {
            const height = maxScore > 0 ? (week.weeklyScore / maxScore) * 100 : 0;
            return (
              <div key={i} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                width: barWidth + 'px', flexShrink: 0
              }}>
                <span style={{
                  fontSize: '10px', fontWeight: '700', color: 'var(--theme-primary, #007bff)',
                  marginBottom: '4px'
                }}>
                  {week.weeklyScore}
                </span>
                <div style={{
                  width: '100%', borderRadius: '6px 6px 2px 2px',
                  height: Math.max(4, height) + 'px',
                  background: `linear-gradient(180deg, var(--theme-primary, #007bff), var(--theme-secondary, #6c757d))`,
                  opacity: 0.75 + (height / 400),
                  transition: 'height 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                  transitionDelay: (i * 50) + 'ms'
                }} />
                <span style={{
                  fontSize: '9px', color: '#aaa', marginTop: '4px',
                  writingMode: weeklyTimeline.length > 15 ? 'vertical-rl' : 'horizontal-tb',
                  textOrientation: 'mixed',
                  whiteSpace: 'nowrap', fontWeight: '500'
                }}>
                  {week.weekName.replace('שבוע ', '')}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // === Cumulative Line (using bars with line effect) ===
  const CumulativeChart = () => {
    if (!weeklyTimeline || weeklyTimeline.length === 0) return null;

    const maxTotal = Math.max(...weeklyTimeline.map(w => w.totalScore), 1);
    const chartHeight = 120;
    const chartWidth = Math.max(weeklyTimeline.length * 28, 300);

    const points = weeklyTimeline.map((w, i) => {
      const x = (i / Math.max(weeklyTimeline.length - 1, 1)) * (chartWidth - 20) + 10;
      const y = chartHeight - (w.totalScore / maxTotal) * (chartHeight - 20) - 10;
      return { x, y, score: w.totalScore, name: w.weekName };
    });

    const pathD = points.map((p, i) => (i === 0 ? 'M' : 'L') + p.x + ' ' + p.y).join(' ');

    return (
      <div style={{ overflowX: 'auto' }}>
        <svg width={chartWidth} height={chartHeight + 20} style={{ display: 'block' }}>
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
            const y = chartHeight - pct * (chartHeight - 20) - 10;
            return (
              <g key={i}>
                <line x1="10" y1={y} x2={chartWidth - 10} y2={y} stroke="#f0f2f5" strokeWidth="1" />
                <text x="4" y={y + 3} fontSize="8" fill="#ccc">{Math.round(maxTotal * pct)}</text>
              </g>
            );
          })}
          {/* Area fill */}
          <path
            d={pathD + ` L${points[points.length - 1].x} ${chartHeight - 10} L${points[0].x} ${chartHeight - 10} Z`}
            fill="url(#areaGradient)" opacity="0.3"
          />
          {/* Line */}
          <path d={pathD} fill="none" stroke="var(--theme-primary, #007bff)" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round" />
          {/* Dots */}
          {points.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="3.5"
              fill="#fff" stroke="var(--theme-primary, #007bff)" strokeWidth="2" />
          ))}
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

  // === Team Row ===
  const TeamRow = ({ team, rank, isBest }) => {
    const color = isBest ? '#10b981' : '#ef4444';
    const bg = isBest ? 'linear-gradient(135deg, #ecfdf5, #d1fae5)' : 'linear-gradient(135deg, #fef2f2, #fee2e2)';
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
          fontSize: '11px', fontWeight: '800', color: '#fff',
          background: color
        }}>
          {rank + 1}
        </span>
        <span style={{ flex: 1, fontSize: '13px', fontWeight: '700', color: '#333' }}>
          {team.name}
        </span>
        <div style={{ textAlign: 'left', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{
            fontSize: '11px', color: '#888',
          }}>
            {team.bets} משחקים
          </span>
          <span style={{
            padding: '2px 8px', borderRadius: '8px',
            fontSize: '12px', fontWeight: '800',
            background: color, color: '#fff'
          }}>
            {team.accuracy}%
          </span>
        </div>
      </div>
    );
  };

  return (
    <div style={{ animation: 'scaleIn 0.2s ease' }}>
      {/* Section Tabs */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '4px', marginBottom: '0.6rem', padding: '3px',
        backgroundColor: '#f0f2f5', borderRadius: '12px',
        boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.06)'
      }}>
        {sections.map(s => {
          const isActive = activeSection === s.key;
          return (
            <button key={s.key} onClick={() => setActiveSection(s.key)} style={{
              padding: '0.4rem', border: 'none', borderRadius: '10px',
              background: isActive ? '#fff' : 'transparent',
              color: isActive ? 'var(--theme-primary, #007bff)' : '#888',
              fontWeight: isActive ? '700' : '500', fontSize: '12px',
              cursor: 'pointer', display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: '1px',
              boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.25s ease'
            }}>
              <span style={{ fontSize: '14px' }}>{s.icon}</span>
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
              <DonutChart exact={overview.exactCount} direction={overview.directionCount} wrong={overview.wrongCount} />
              <div style={{ flex: 1 }}>
                <MiniBar value={overview.exactCount} max={overview.totalBets} color="linear-gradient(90deg, #10b981, #34d399)" label="🎯 מדויק" count={overview.exactCount} />
                <MiniBar value={overview.directionCount} max={overview.totalBets} color="linear-gradient(90deg, #f59e0b, #fbbf24)" label="👆 כיוון" count={overview.directionCount} />
                <MiniBar value={overview.wrongCount} max={overview.totalBets} color="linear-gradient(90deg, #cbd5e1, #e2e8f0)" label="❌ החטאה" count={overview.wrongCount} />
              </div>
            </div>
          </Card>

          {/* Stats Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '0.6rem' }}>
            <StatPill value={overview.totalBets} label="הימורים" color="var(--theme-primary, #007bff)" bg="linear-gradient(135deg, #eff6ff, #dbeafe)" />
            <StatPill value={overview.totalPoints} label="נקודות" color="#10b981" bg="linear-gradient(135deg, #ecfdf5, #d1fae5)" />
            <StatPill value={overview.exactRate + '%'} label="דיוק מלא" color="#8b5cf6" bg="linear-gradient(135deg, #f5f3ff, #ede9fe)" />
          </div>

          {/* Streaks */}
          <Card title="רצפים" icon="🔥">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div style={{
                textAlign: 'center', padding: '0.6rem',
                background: 'linear-gradient(135deg, #fff7ed, #ffedd5)',
                borderRadius: '12px'
              }}>
                <div style={{ fontSize: '24px', fontWeight: '800', color: '#ea580c' }}>{bestHitStreak}</div>
                <div style={{ fontSize: '10px', color: '#9a3412', fontWeight: '600' }}>שיא רצף פגיעות</div>
              </div>
              <div style={{
                textAlign: 'center', padding: '0.6rem',
                background: 'linear-gradient(135deg, #fefce8, #fef9c3)',
                borderRadius: '12px'
              }}>
                <div style={{ fontSize: '24px', fontWeight: '800', color: '#ca8a04' }}>{currentHitStreak}</div>
                <div style={{ fontSize: '10px', color: '#854d0e', fontWeight: '600' }}>רצף נוכחי</div>
              </div>
            </div>
          </Card>

          {/* Prediction Distribution */}
          <Card title="התפלגות ניחושים" icon="🎲">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
              {[
                { key: 'home', label: '1 ניצחון בית', color: '#3b82f6', bg: '#eff6ff' },
                { key: 'draw', label: 'X תיקו', color: '#8b5cf6', bg: '#f5f3ff' },
                { key: 'away', label: '2 ניצחון חוץ', color: '#ef4444', bg: '#fef2f2' },
              ].map(item => {
                const total = predictionDistribution.home + predictionDistribution.draw + predictionDistribution.away;
                const pct = total > 0 ? Math.round((predictionDistribution[item.key] / total) * 100) : 0;
                return (
                  <div key={item.key} style={{
                    textAlign: 'center', padding: '0.5rem 0.3rem',
                    background: item.bg, borderRadius: '10px'
                  }}>
                    <div style={{ fontSize: '20px', fontWeight: '800', color: item.color }}>{pct}%</div>
                    <div style={{ fontSize: '10px', color: '#666', fontWeight: '600' }}>{item.label}</div>
                    <div style={{ fontSize: '10px', color: '#aaa' }}>{predictionDistribution[item.key]}</div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Top Predictions */}
          <Card title="תוצאות שמנחש הכי הרבה" icon="🏅">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {topPredictions.map((pred, i) => (
                <div key={i} style={{
                  padding: '6px 12px', borderRadius: '20px',
                  background: i === 0 ? 'linear-gradient(135deg, var(--theme-primary, #007bff), var(--theme-secondary, #6c757d))' : '#f0f2f5',
                  color: i === 0 ? '#fff' : '#555',
                  fontSize: '13px', fontWeight: '700',
                  boxShadow: i === 0 ? '0 2px 8px rgba(0,0,0,0.15)' : 'none'
                }}>
                  {pred.score} <span style={{ fontSize: '10px', opacity: 0.8 }}>({pred.count}×)</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* === TIMELINE === */}
      {activeSection === 'timeline' && (
        <div style={{ animation: 'scaleIn 0.2s ease' }}>
          <Card title="ניקוד שבועי" icon="📊">
            <TimelineChart />
          </Card>

          <Card title="ניקוד מצטבר" icon="📈">
            <CumulativeChart />
          </Card>

          {/* Weekly Table */}
          <Card title="פירוט לפי שבוע" icon="📋">
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {weeklyTimeline.map((week, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '8px 10px', borderRadius: '8px',
                  background: i % 2 === 0 ? '#fafbfc' : 'transparent',
                }}>
                  <span style={{ fontSize: '12px', color: '#555', fontWeight: '600' }}>
                    {week.weekName}
                  </span>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <span style={{
                      fontSize: '13px', fontWeight: '800',
                      color: week.weeklyScore > 0 ? 'var(--theme-primary, #007bff)' : '#ccc'
                    }}>
                      {week.weeklyScore} נק׳
                    </span>
                    <span style={{
                      fontSize: '11px', color: '#aaa', fontWeight: '500',
                      minWidth: '50px', textAlign: 'left'
                    }}>
                      סה״כ {week.totalScore}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* === TEAMS === */}
      {activeSection === 'teams' && (
        <div style={{ animation: 'scaleIn 0.2s ease' }}>
          {/* Best Teams */}
          <Card title="הכי טוב מנחש" icon="🏆">
            {bestTeams.length > 0 ? (
              bestTeams.map((team, i) => (
                <TeamRow key={team.name} team={team} rank={i} isBest={true} />
              ))
            ) : (
              <p style={{ color: '#999', fontSize: '13px', textAlign: 'center' }}>צריך לפחות 3 הימורים לקבוצה</p>
            )}
          </Card>

          {/* Worst Teams */}
          <Card title="הכי קשה לנחש" icon="😵">
            {worstTeams.length > 0 ? (
              worstTeams.map((team, i) => (
                <TeamRow key={team.name} team={team} rank={i} isBest={false} />
              ))
            ) : (
              <p style={{ color: '#999', fontSize: '13px', textAlign: 'center' }}>צריך לפחות 3 הימורים לקבוצה</p>
            )}
          </Card>

          {/* All Teams */}
          <Card title="כל הקבוצות" icon="📋">
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {stats.teamStats.map((team, i) => (
                <div key={team.name} style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '6px 8px', borderRadius: '8px',
                  background: i % 2 === 0 ? '#fafbfc' : 'transparent',
                }}>
                  <span style={{ flex: 1, fontSize: '12px', fontWeight: '600', color: '#444' }}>
                    {team.name}
                  </span>
                  <span style={{ fontSize: '10px', color: '#aaa' }}>{team.bets}</span>
                  <div style={{
                    width: '50px', height: '6px', borderRadius: '3px',
                    background: '#f0f2f5', overflow: 'hidden'
                  }}>
                    <div style={{
                      height: '100%', borderRadius: '3px',
                      width: team.accuracy + '%',
                      background: team.accuracy >= 60 ? '#10b981' : team.accuracy >= 40 ? '#f59e0b' : '#ef4444'
                    }} />
                  </div>
                  <span style={{
                    fontSize: '11px', fontWeight: '700', minWidth: '32px', textAlign: 'left',
                    color: team.accuracy >= 60 ? '#10b981' : team.accuracy >= 40 ? '#f59e0b' : '#ef4444'
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
