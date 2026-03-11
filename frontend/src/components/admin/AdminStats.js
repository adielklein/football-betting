import React, { useState, useEffect } from 'react';

function AdminStats() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('overview');

  const API_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:5000/api'
    : 'https://football-betting-backend.onrender.com/api';

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/stats/admin`);
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error loading admin stats:', error);
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

  if (!stats) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>
        שגיאה בטעינת נתונים
      </div>
    );
  }

  const { systemOverview, playerRankings, topByPoints, topByAccuracy, topByExact, topByParticipation, weeklyStats, globalTeamRankings, easiestTeams, hardestTeams, surprisingMatches, topGlobalPredictions, topResults } = stats;

  const sections = [
    { key: 'overview', label: 'סקירה', icon: '📊' },
    { key: 'players', label: 'שחקנים', icon: '👥' },
    { key: 'weeks', label: 'שבועות', icon: '📅' },
    { key: 'teams', label: 'קבוצות', icon: '⚽' },
  ];

  // === Reusable Components ===
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

  const StatBox = ({ value, label, color, bg, icon }) => (
    <div style={{
      textAlign: 'center', padding: '0.65rem 0.3rem',
      background: bg || '#f8f9fc', borderRadius: '14px',
      border: '1px solid rgba(0,0,0,0.04)'
    }}>
      {icon && <div style={{ fontSize: '18px', marginBottom: '2px' }}>{icon}</div>}
      <div style={{ fontSize: '20px', fontWeight: '800', color: color || '#333', lineHeight: 1.2 }}>
        {value}
      </div>
      <div style={{ fontSize: '10px', color: '#888', fontWeight: '600', marginTop: '3px' }}>
        {label}
      </div>
    </div>
  );

  const MiniBar = ({ value, max, color }) => {
    const pct = max > 0 ? (value / max) * 100 : 0;
    return (
      <div style={{ width: '50px', height: '6px', borderRadius: '3px', background: '#f0f2f5', overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: '3px', width: `${pct}%`,
          background: color, transition: 'width 0.6s ease'
        }} />
      </div>
    );
  };

  const getMedalEmoji = (index) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return (index + 1) + '.';
  };

  // === Player Ranking Row ===
  const PlayerRow = ({ player, rank, metric, metricLabel, metricColor }) => (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '8px',
      padding: '8px 10px', borderRadius: '10px',
      background: rank < 3 ? 'linear-gradient(135deg, #fffbeb, #fef3c7)' : (rank % 2 === 0 ? '#fafbfc' : 'transparent'),
      marginBottom: '4px',
      animation: 'slideUp 0.3s ease both',
      animationDelay: (rank * 40) + 'ms'
    }}>
      <span style={{ fontSize: rank < 3 ? '18px' : '12px', fontWeight: '700', color: '#888', minWidth: '24px', textAlign: 'center' }}>
        {getMedalEmoji(rank)}
      </span>
      <span style={{ flex: 1, fontSize: '13px', fontWeight: '700', color: '#333' }}>
        {player.name}
      </span>
      <span style={{
        padding: '3px 10px', borderRadius: '10px',
        fontSize: '12px', fontWeight: '800',
        background: metricColor || 'var(--theme-primary, #007bff)',
        color: '#fff'
      }}>
        {metric}
      </span>
      {metricLabel && (
        <span style={{ fontSize: '10px', color: '#aaa', minWidth: '35px' }}>{metricLabel}</span>
      )}
    </div>
  );

  // === Weekly Bar Chart ===
  const WeeklyBarChart = () => {
    if (!weeklyStats || weeklyStats.length === 0) return null;
    const maxPlayers = Math.max(...weeklyStats.map(w => w.activePlayers), 1);
    const barWidth = Math.max(18, Math.min(36, (window.innerWidth - 80) / weeklyStats.length));

    return (
      <div style={{ overflowX: 'auto', paddingBottom: '0.5rem' }}>
        <div style={{
          display: 'flex', alignItems: 'flex-end', gap: '3px',
          minHeight: '120px', padding: '0.5rem 0',
          minWidth: weeklyStats.length * (barWidth + 3)
        }}>
          {weeklyStats.map((week, i) => {
            const height = (week.activePlayers / maxPlayers) * 100;
            return (
              <div key={i} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                width: barWidth + 'px', flexShrink: 0
              }}>
                <span style={{ fontSize: '9px', fontWeight: '700', color: '#666', marginBottom: '3px' }}>
                  {week.activePlayers}
                </span>
                <div style={{
                  width: '100%', borderRadius: '5px 5px 2px 2px',
                  height: Math.max(4, height) + 'px',
                  background: `linear-gradient(180deg, var(--theme-primary, #007bff), var(--theme-secondary, #6c757d))`,
                  opacity: 0.6 + (height / 250),
                  transition: 'height 0.5s ease',
                  transitionDelay: (i * 30) + 'ms'
                }} />
                <span style={{
                  fontSize: '8px', color: '#bbb', marginTop: '3px',
                  writingMode: weeklyStats.length > 15 ? 'vertical-rl' : 'horizontal-tb',
                  whiteSpace: 'nowrap'
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

  // === Accuracy Heatmap Row ===
  const AccuracyWeekRow = ({ week, maxBets }) => {
    const accColor = week.accuracy >= 60 ? '#10b981' : week.accuracy >= 40 ? '#f59e0b' : '#ef4444';
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        padding: '6px 8px', borderRadius: '8px',
        background: '#fafbfc', marginBottom: '3px'
      }}>
        <span style={{ fontSize: '11px', fontWeight: '600', color: '#555', minWidth: '65px' }}>
          {week.weekName}
        </span>
        <MiniBar value={week.totalBets} max={maxBets} color="var(--theme-primary, #007bff)" />
        <span style={{ fontSize: '10px', color: '#aaa', minWidth: '30px' }}>{week.totalBets}</span>
        <div style={{
          padding: '2px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: '700',
          background: accColor + '18', color: accColor, minWidth: '38px', textAlign: 'center'
        }}>
          {week.accuracy}%
        </div>
        {week.bestPlayer && (
          <span style={{ fontSize: '10px', color: '#888', flex: 1, textAlign: 'left' }}>
            {week.bestPlayer} ({week.bestScore})
          </span>
        )}
      </div>
    );
  };

  return (
    <div style={{ animation: 'scaleIn 0.2s ease' }}>
      {/* Section Tabs */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
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
          {/* System Stats Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '0.6rem' }}>
            <StatBox value={systemOverview.totalPlayers} label="שחקנים" color="#3b82f6" bg="linear-gradient(135deg, #eff6ff, #dbeafe)" icon="👥" />
            <StatBox value={systemOverview.totalWeeks} label="שבועות" color="#8b5cf6" bg="linear-gradient(135deg, #f5f3ff, #ede9fe)" icon="📅" />
            <StatBox value={systemOverview.totalMatches} label="משחקים" color="#10b981" bg="linear-gradient(135deg, #ecfdf5, #d1fae5)" icon="⚽" />
            <StatBox value={systemOverview.totalBets} label="הימורים" color="#f59e0b" bg="linear-gradient(135deg, #fffbeb, #fef3c7)" icon="🎯" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '0.6rem' }}>
            <StatBox value={systemOverview.avgBetsPerMatch} label="ממוצע הימורים למשחק" color="#6366f1" bg="#f8f9fc" />
            <StatBox value={systemOverview.avgBetsPerPlayer} label="ממוצע הימורים לשחקן" color="#ec4899" bg="#fdf2f8" />
          </div>

          {/* Top 3 Podium */}
          <Card title="פודיום הנקודות" icon="🏆">
            {topByPoints.slice(0, 3).map((player, i) => {
              const sizes = [{ h: 80, bg: 'linear-gradient(135deg, #fbbf24, #f59e0b)' }, { h: 60, bg: 'linear-gradient(135deg, #94a3b8, #64748b)' }, { h: 45, bg: 'linear-gradient(135deg, #d97706, #b45309)' }];
              const order = [1, 0, 2];
              return null; // We'll use PlayerRow instead for cleaner look
            })}
            {topByPoints.slice(0, 5).map((player, i) => (
              <PlayerRow key={player.id} player={player} rank={i}
                metric={player.points} metricColor={i < 3 ? '#f59e0b' : '#64748b'} />
            ))}
          </Card>

          {/* Popular Predictions vs Actual Results */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '0.6rem' }}>
            <Card title="ניחושים נפוצים" icon="🎲">
              {topGlobalPredictions.slice(0, 5).map((pred, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '4px 8px', borderRadius: '8px',
                  background: i === 0 ? 'linear-gradient(135deg, #eff6ff, #dbeafe)' : 'transparent',
                  marginBottom: '2px'
                }}>
                  <span style={{ fontSize: '14px', fontWeight: '800', color: '#333' }}>{pred.score}</span>
                  <span style={{ fontSize: '11px', color: '#888' }}>{pred.count}×</span>
                </div>
              ))}
            </Card>

            <Card title="תוצאות בפועל" icon="📋">
              {topResults.slice(0, 5).map((res, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '4px 8px', borderRadius: '8px',
                  background: i === 0 ? 'linear-gradient(135deg, #ecfdf5, #d1fae5)' : 'transparent',
                  marginBottom: '2px'
                }}>
                  <span style={{ fontSize: '14px', fontWeight: '800', color: '#333' }}>{res.score}</span>
                  <span style={{ fontSize: '11px', color: '#888' }}>{res.count}×</span>
                </div>
              ))}
            </Card>
          </div>

          {/* Surprising Matches */}
          {surprisingMatches.length > 0 && (
            <Card title="משחקים מפתיעים (אף אחד לא דייק)" icon="😱">
              {surprisingMatches.map((match, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '8px 10px', borderRadius: '10px',
                  background: 'linear-gradient(135deg, #fef2f2, #fee2e2)',
                  marginBottom: '6px'
                }}>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#333', flex: 1 }}>
                    {match.team1} - {match.team2}
                  </span>
                  <span style={{
                    padding: '2px 10px', borderRadius: '8px', fontSize: '13px', fontWeight: '800',
                    background: '#ef4444', color: '#fff'
                  }}>
                    {match.result}
                  </span>
                  <span style={{ fontSize: '10px', color: '#888' }}>{match.totalBets} הימרו</span>
                </div>
              ))}
            </Card>
          )}
        </div>
      )}

      {/* === PLAYERS === */}
      {activeSection === 'players' && (
        <div style={{ animation: 'scaleIn 0.2s ease' }}>
          {/* Points Ranking */}
          <Card title="דירוג נקודות" icon="🏆">
            {topByPoints.map((player, i) => (
              <PlayerRow key={player.id} player={player} rank={i}
                metric={player.points} metricLabel="נק׳"
                metricColor={i < 3 ? '#f59e0b' : '#64748b'} />
            ))}
          </Card>

          {/* Accuracy Ranking */}
          <Card title="דירוג דיוק (מינ׳ 10 הימורים)" icon="🎯">
            {topByAccuracy.map((player, i) => (
              <PlayerRow key={player.id} player={player} rank={i}
                metric={player.accuracy + '%'} metricLabel=""
                metricColor={player.accuracy >= 50 ? '#10b981' : '#f59e0b'} />
            ))}
          </Card>

          {/* Exact Score Ranking */}
          <Card title="דירוג דיוק מלא" icon="🎯">
            {topByExact.map((player, i) => (
              <PlayerRow key={player.id} player={player} rank={i}
                metric={player.exactRate + '%'} metricLabel={player.exact + ' מדויקים'}
                metricColor="#8b5cf6" />
            ))}
          </Card>

          {/* Participation Ranking */}
          <Card title="דירוג השתתפות" icon="📊">
            {topByParticipation.map((player, i) => (
              <PlayerRow key={player.id} player={player} rank={i}
                metric={player.participation + '%'}
                metricLabel={player.weeklyScores.length + ' שבועות'}
                metricColor={player.participation >= 80 ? '#10b981' : player.participation >= 50 ? '#f59e0b' : '#ef4444'} />
            ))}
          </Card>

          {/* Full Player Table */}
          <Card title="כל השחקנים" icon="📋">
            <div style={{ overflowX: 'auto' }}>
              <div style={{ fontSize: '10px', color: '#aaa', display: 'flex', gap: '4px', padding: '4px 8px', marginBottom: '4px', fontWeight: '600' }}>
                <span style={{ width: '24px' }}>#</span>
                <span style={{ flex: 1 }}>שם</span>
                <span style={{ width: '40px', textAlign: 'center' }}>הימורים</span>
                <span style={{ width: '40px', textAlign: 'center' }}>נקודות</span>
                <span style={{ width: '35px', textAlign: 'center' }}>דיוק</span>
                <span style={{ width: '35px', textAlign: 'center' }}>מדויק</span>
              </div>
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {playerRankings.map((player, i) => (
                  <div key={player.id} style={{
                    display: 'flex', alignItems: 'center', gap: '4px',
                    padding: '6px 8px', borderRadius: '8px',
                    background: i % 2 === 0 ? '#fafbfc' : 'transparent',
                    fontSize: '12px'
                  }}>
                    <span style={{ width: '24px', fontWeight: '700', color: '#888', textAlign: 'center' }}>{i + 1}</span>
                    <span style={{ flex: 1, fontWeight: '600', color: '#333' }}>{player.name}</span>
                    <span style={{ width: '40px', textAlign: 'center', color: '#666' }}>{player.completedBets}</span>
                    <span style={{ width: '40px', textAlign: 'center', fontWeight: '700', color: 'var(--theme-primary, #007bff)' }}>{player.points}</span>
                    <span style={{
                      width: '35px', textAlign: 'center', fontWeight: '700',
                      color: player.accuracy >= 50 ? '#10b981' : player.accuracy >= 35 ? '#f59e0b' : '#ef4444'
                    }}>{player.accuracy}%</span>
                    <span style={{
                      width: '35px', textAlign: 'center', fontWeight: '700', color: '#8b5cf6'
                    }}>{player.exactRate}%</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* === WEEKS === */}
      {activeSection === 'weeks' && (
        <div style={{ animation: 'scaleIn 0.2s ease' }}>
          {/* Participation Over Time */}
          <Card title="השתתפות לאורך זמן" icon="📈">
            <WeeklyBarChart />
          </Card>

          {/* Weekly Accuracy Trend */}
          <Card title="דיוק לפי שבוע" icon="🎯">
            {(() => {
              if (!weeklyStats || weeklyStats.length === 0) return null;
              const maxAcc = 100;
              const chartHeight = 100;
              const chartWidth = Math.max(weeklyStats.length * 24, 300);
              const accData = weeklyStats.filter(w => w.totalBets > 0);

              if (accData.length < 2) return <p style={{ color: '#999', fontSize: '13px', textAlign: 'center' }}>אין מספיק נתונים</p>;

              const points = accData.map((w, i) => ({
                x: (i / Math.max(accData.length - 1, 1)) * (chartWidth - 20) + 10,
                y: chartHeight - (w.accuracy / maxAcc) * (chartHeight - 20) - 10,
                acc: w.accuracy
              }));
              const pathD = points.map((p, i) => (i === 0 ? 'M' : 'L') + p.x + ' ' + p.y).join(' ');

              return (
                <div style={{ overflowX: 'auto' }}>
                  <svg width={chartWidth} height={chartHeight + 10} style={{ display: 'block' }}>
                    {[25, 50, 75].map(pct => {
                      const y = chartHeight - (pct / maxAcc) * (chartHeight - 20) - 10;
                      return <line key={pct} x1="10" y1={y} x2={chartWidth - 10} y2={y} stroke="#f0f2f5" strokeWidth="1" />;
                    })}
                    <path d={pathD + ` L${points[points.length - 1].x} ${chartHeight - 10} L${points[0].x} ${chartHeight - 10} Z`}
                      fill="url(#accGrad)" opacity="0.3" />
                    <path d={pathD} fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    {points.map((p, i) => (
                      <circle key={i} cx={p.x} cy={p.y} r="3" fill="#fff" stroke="#10b981" strokeWidth="1.5" />
                    ))}
                    <defs>
                      <linearGradient id="accGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
              );
            })()}
          </Card>

          {/* Week Detail List */}
          <Card title="פירוט שבועות" icon="📋">
            <div style={{ maxHeight: '450px', overflowY: 'auto' }}>
              {(() => {
                const maxBets = Math.max(...weeklyStats.map(w => w.totalBets), 1);
                return [...weeklyStats].reverse().map((week, i) => (
                  <AccuracyWeekRow key={i} week={week} maxBets={maxBets} />
                ));
              })()}
            </div>
          </Card>
        </div>
      )}

      {/* === TEAMS === */}
      {activeSection === 'teams' && (
        <div style={{ animation: 'scaleIn 0.2s ease' }}>
          {/* Easiest Teams */}
          <Card title="הכי קל לנחש" icon="😎">
            {easiestTeams.length > 0 ? easiestTeams.map((team, i) => (
              <div key={team.name} style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '8px 10px', borderRadius: '10px',
                background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)',
                marginBottom: '6px',
                animation: 'slideUp 0.3s ease both',
                animationDelay: (i * 60) + 'ms'
              }}>
                <span style={{
                  width: '24px', height: '24px', borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '12px', fontWeight: '800', color: '#fff', background: '#10b981'
                }}>{i + 1}</span>
                <span style={{ flex: 1, fontSize: '13px', fontWeight: '700', color: '#333' }}>{team.name}</span>
                <span style={{ fontSize: '10px', color: '#888' }}>{team.bets} הימורים</span>
                <span style={{
                  padding: '2px 10px', borderRadius: '8px',
                  fontSize: '12px', fontWeight: '800', background: '#10b981', color: '#fff'
                }}>{team.accuracy}%</span>
              </div>
            )) : <p style={{ color: '#999', fontSize: '13px', textAlign: 'center' }}>צריך לפחות 20 הימורים לקבוצה</p>}
          </Card>

          {/* Hardest Teams */}
          <Card title="הכי קשה לנחש" icon="🤯">
            {hardestTeams.length > 0 ? hardestTeams.map((team, i) => (
              <div key={team.name} style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '8px 10px', borderRadius: '10px',
                background: 'linear-gradient(135deg, #fef2f2, #fee2e2)',
                marginBottom: '6px',
                animation: 'slideUp 0.3s ease both',
                animationDelay: (i * 60) + 'ms'
              }}>
                <span style={{
                  width: '24px', height: '24px', borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '12px', fontWeight: '800', color: '#fff', background: '#ef4444'
                }}>{i + 1}</span>
                <span style={{ flex: 1, fontSize: '13px', fontWeight: '700', color: '#333' }}>{team.name}</span>
                <span style={{ fontSize: '10px', color: '#888' }}>{team.bets} הימורים</span>
                <span style={{
                  padding: '2px 10px', borderRadius: '8px',
                  fontSize: '12px', fontWeight: '800', background: '#ef4444', color: '#fff'
                }}>{team.accuracy}%</span>
              </div>
            )) : <p style={{ color: '#999', fontSize: '13px', textAlign: 'center' }}>צריך לפחות 20 הימורים לקבוצה</p>}
          </Card>

          {/* All Teams */}
          <Card title="כל הקבוצות" icon="📋">
            <div style={{ maxHeight: '450px', overflowY: 'auto' }}>
              {globalTeamRankings.map((team, i) => (
                <div key={team.name} style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '5px 8px', borderRadius: '8px',
                  background: i % 2 === 0 ? '#fafbfc' : 'transparent',
                }}>
                  <span style={{ flex: 1, fontSize: '12px', fontWeight: '600', color: '#444' }}>
                    {team.name}
                  </span>
                  <span style={{ fontSize: '10px', color: '#aaa', minWidth: '25px' }}>{team.bets}</span>
                  <div style={{ width: '50px', height: '6px', borderRadius: '3px', background: '#f0f2f5', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: '3px',
                      width: team.accuracy + '%',
                      background: team.accuracy >= 55 ? '#10b981' : team.accuracy >= 40 ? '#f59e0b' : '#ef4444'
                    }} />
                  </div>
                  <span style={{
                    fontSize: '11px', fontWeight: '700', minWidth: '32px', textAlign: 'left',
                    color: team.accuracy >= 55 ? '#10b981' : team.accuracy >= 40 ? '#f59e0b' : '#ef4444'
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

export default AdminStats;
