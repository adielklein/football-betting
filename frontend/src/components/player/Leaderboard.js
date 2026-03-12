import React, { useState, useEffect } from 'react';

function Leaderboard({ leaderboard, user }) {
  const [monthlyScores, setMonthlyScores] = useState([]);
  const [selectedWeekScores, setSelectedWeekScores] = useState([]);
  const [availableWeeks, setAvailableWeeks] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [selectedSeason, setSelectedSeason] = useState(null);
  const [initializedFromData, setInitializedFromData] = useState(false);
  const [selectedWeekId, setSelectedWeekId] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('monthly');

  const API_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:5000/api'
    : 'https://football-betting-backend.onrender.com/api';

  useEffect(() => {
    if (selectedMonth === null && selectedSeason === null) {
      // First load - initialize from data
      loadScoresData();
    } else if (selectedMonth !== null && selectedSeason !== null) {
      loadScoresData();
    }
  }, [selectedMonth, selectedSeason]);

  useEffect(() => {
    if (selectedWeekId && availableWeeks.length > 0) {
      loadWeekScores();
    }
  }, [selectedWeekId]);

  const loadScoresData = async () => {
    setLoading(true);
    try {
      const [scoresResponse, weeksResponse] = await Promise.all([
        fetch(`${API_URL}/scores/detailed`),
        fetch(`${API_URL}/weeks`)
      ]);

      let scoresData = [];
      let weeksData = [];

      if (scoresResponse.ok) scoresData = await scoresResponse.json();
      if (weeksResponse.ok) weeksData = await weeksResponse.json();

      // On first load, find the most recent week and use its month/season as default
      if (!initializedFromData && weeksData.length > 0) {
        const sorted = [...weeksData].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        const latest = sorted[0];
        const latestMonth = latest.month || new Date(latest.createdAt).getMonth() + 1;
        const latestSeason = latest.season || '2025-26';
        setSelectedMonth(latestMonth);
        setSelectedSeason(latestSeason);
        setInitializedFromData(true);
        // Calculate with the correct values directly
        calculateMonthlyScores(scoresData, weeksData, latestMonth, latestSeason);
        return;
      }

      calculateMonthlyScores(scoresData, weeksData);
    } catch (error) {
      console.error('Error loading scores data:', error);
      setMonthlyScores([]);
      setAvailableWeeks([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateMonthlyScores = (scoresData, weeksData, overrideMonth, overrideSeason) => {
    const useMonth = overrideMonth || selectedMonth;
    const useSeason = overrideSeason || selectedSeason;
    if (!useMonth || !useSeason) return;

    const monthWeeks = weeksData.filter(week => {
      if (!week) return false;
      const weekMonth = week.month || new Date(week.createdAt).getMonth() + 1;
      const weekSeason = week.season || '2025-26';
      return weekMonth === useMonth && weekSeason === useSeason;
    });

    setAvailableWeeks(monthWeeks);

    if (monthWeeks.length > 0 && !selectedWeekId) {
      setSelectedWeekId(monthWeeks[monthWeeks.length - 1]._id);
    } else if (monthWeeks.length === 0) {
      setSelectedWeekId('');
      setSelectedWeekScores([]);
    }

    const monthWeekIds = monthWeeks.map(week => week._id);
    const userScores = {};

    scoresData.forEach(score => {
      if (!score.userId || score.userId.role === 'admin') return;
      const userId = score.userId._id;
      const userName = score.userId.name;
      const weekId = score.weekId && score.weekId._id ? score.weekId._id : score.weekId;

      if (!userScores[userId]) {
        userScores[userId] = { name: userName, monthlyScore: 0, totalScore: score.totalScore || 0 };
      }

      if (monthWeekIds.includes(weekId)) {
        userScores[userId].monthlyScore += score.weeklyScore || 0;
      }
    });

    const monthlyArray = Object.values(userScores).sort((a, b) => b.monthlyScore - a.monthlyScore);
    setMonthlyScores(monthlyArray);
  };

  const loadWeekScores = async () => {
    if (!selectedWeekId) { setSelectedWeekScores([]); return; }

    try {
      const betsResponse = await fetch(`${API_URL}/bets/week/${selectedWeekId}`);
      if (!betsResponse.ok) { setSelectedWeekScores([]); return; }

      const betsData = await betsResponse.json();
      const weekScores = {};

      betsData.forEach(bet => {
        if (!bet.userId || bet.userId.role === 'admin') return;
        const userId = bet.userId._id;
        if (!weekScores[userId]) { weekScores[userId] = { name: bet.userId.name, score: 0 }; }
        weekScores[userId].score += bet.points || 0;
      });

      setSelectedWeekScores(Object.values(weekScores).sort((a, b) => b.score - a.score));
    } catch (error) {
      console.error('Error loading week scores:', error);
      setSelectedWeekScores([]);
    }
  };

  const months = [
    { value: 1, label: 'ינואר' }, { value: 2, label: 'פברואר' }, { value: 3, label: 'מרץ' },
    { value: 4, label: 'אפריל' }, { value: 5, label: 'מאי' }, { value: 6, label: 'יוני' },
    { value: 7, label: 'יולי' }, { value: 8, label: 'אוגוסט' }, { value: 9, label: 'ספטמבר' },
    { value: 10, label: 'אוקטובר' }, { value: 11, label: 'נובמבר' }, { value: 12, label: 'דצמבר' }
  ];

  const seasons = [
    { value: '2025-26', label: 'עונת 2025-26' },
    { value: '2026-27', label: 'עונת 2026-27' }
  ];

  const getRankStyle = (index) => {
    if (index === 0) return { icon: '🥇', bg: 'linear-gradient(135deg, #fff9c4 0%, #fff176 100%)', border: '#ffd54f', shadow: '0 2px 8px rgba(255,193,7,0.2)' };
    if (index === 1) return { icon: '🥈', bg: 'linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%)', border: '#bdbdbd', shadow: '0 2px 8px rgba(0,0,0,0.08)' };
    if (index === 2) return { icon: '🥉', bg: 'linear-gradient(135deg, #ffe0b2 0%, #ffcc80 100%)', border: '#ffb74d', shadow: '0 2px 8px rgba(255,152,0,0.15)' };
    return { icon: null, bg: 'transparent', border: 'transparent', shadow: 'none' };
  };

  const renderPlayerRow = (player, index, scoreKey, isMe, animDelay) => {
    const rank = getRankStyle(index);
    const isTop3 = index < 3;
    const score = player[scoreKey] !== undefined ? player[scoreKey] : player.score;

    return (
      <div key={player.name} style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: isTop3 ? '0.6rem 0.65rem' : '0.45rem 0.6rem',
        background: isMe ? 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)' : (isTop3 ? rank.bg : (index % 2 === 0 ? '#fafafa' : '#fff')),
        borderRadius: isTop3 ? '12px' : '8px',
        border: isMe ? '2px solid #64b5f6' : (isTop3 ? `1px solid ${rank.border}` : '1px solid #f0f0f0'),
        boxShadow: isMe ? '0 2px 8px rgba(33,150,243,0.15)' : rank.shadow,
        animation: `slideUp 0.25s ease ${animDelay}s both`,
        transition: 'all 0.2s ease'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0, flex: 1 }}>
          <span style={{
            fontSize: isTop3 ? '20px' : '13px',
            fontWeight: '800',
            minWidth: '28px',
            textAlign: 'center',
            color: !isTop3 ? '#bbb' : undefined
          }}>
            {rank.icon || (index + 1)}
          </span>
          <span style={{
            fontWeight: isMe ? '700' : '500',
            fontSize: '14px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            color: '#333'
          }}>
            {player.name}
            {isMe && (
              <span style={{ color: '#1976d2', fontSize: '10px', marginRight: '3px', fontWeight: '600' }}> (אתה)</span>
            )}
          </span>
        </div>
        <span style={{
          fontWeight: '800',
          fontSize: isTop3 ? '18px' : '15px',
          color: isTop3 ? '#333' : '#555',
          flexShrink: 0,
          background: isTop3 ? 'rgba(255,255,255,0.7)' : '#f5f5f5',
          padding: '2px 12px',
          borderRadius: '10px',
          minWidth: '40px',
          textAlign: 'center'
        }}>
          {score}
        </span>
      </div>
    );
  };

  const tabs = [
    { key: 'monthly', label: 'חודשי', icon: '🏅' },
    { key: 'weekly', label: 'שבועי', icon: '📊' },
    { key: 'general', label: 'כללי', icon: '🏆' }
  ];

  return (
    <div>
      {/* Tab bar */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '3px',
        marginBottom: '0.75rem',
        padding: '3px',
        backgroundColor: '#f0f2f5',
        borderRadius: '14px',
        boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.06)'
      }}>
        {tabs.map(tab => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '0.5rem 0.2rem',
                border: 'none',
                borderRadius: '11px',
                backgroundColor: isActive ? '#fff' : 'transparent',
                color: isActive ? 'var(--theme-primary, #007bff)' : '#888',
                fontWeight: isActive ? '700' : '500',
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                WebkitAppearance: 'none',
                touchAction: 'manipulation',
                boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)' : 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '2px',
                lineHeight: 1.2
              }}
            >
              <span style={{ fontSize: '16px', lineHeight: 1 }}>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* סינון עונה + חודש - מוצג בטאבים חודשי ושבועי */}
      {(activeTab === 'monthly' || activeTab === 'weekly') && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '0.5rem',
          marginBottom: '0.75rem'
        }}>
          <select
            value={selectedSeason}
            onChange={(e) => setSelectedSeason(e.target.value)}
            className="input"
            style={{ width: '100%', fontSize: '13px', padding: '0.45rem', borderRadius: '10px' }}
          >
            {seasons.map(season => (
              <option key={season.value} value={season.value}>{season.label}</option>
            ))}
          </select>
          <select
            value={selectedMonth}
            onChange={(e) => { setSelectedMonth(parseInt(e.target.value)); setSelectedWeekId(''); }}
            className="input"
            style={{ width: '100%', fontSize: '13px', padding: '0.45rem', borderRadius: '10px' }}
          >
            {months.map(month => (
              <option key={month.value} value={month.value}>{month.label}</option>
            ))}
          </select>
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>
          <div style={{
            width: '36px', height: '36px',
            border: '3px solid #f0f0f0', borderTop: '3px solid var(--theme-primary, #007bff)',
            borderRadius: '50%', animation: 'spin 0.8s linear infinite',
            margin: '0 auto 0.5rem'
          }}></div>
          <span style={{ fontSize: '13px' }}>טוען נתונים...</span>
        </div>
      )}

      <div style={{ animation: 'scaleIn 0.2s ease' }}>
        {/* דירוג חודשי */}
        {activeTab === 'monthly' && (
          <div className="card">
            <h2 style={{ fontSize: '0.95rem', margin: '0 0 0.5rem 0', fontWeight: '700' }}>
              🏅 דירוג {months.find(m => m.value === selectedMonth)?.label}
            </h2>
            {!loading && monthlyScores.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                {monthlyScores.map((player, index) =>
                  renderPlayerRow(player, index, 'monthlyScore', player.name === user.name, index * 0.04)
                )}
              </div>
            )}
            {monthlyScores.length === 0 && !loading && (
              <div style={{ textAlign: 'center', color: '#999', padding: '1.5rem', fontSize: '14px' }}>
                אין נתונים לחודש {months.find(m => m.value === selectedMonth)?.label}
              </div>
            )}
          </div>
        )}

        {/* פירוט שבוע */}
        {activeTab === 'weekly' && (
          <div className="card">
            {availableWeeks.length > 0 ? (
              <>
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  marginBottom: '0.5rem', gap: '0.5rem'
                }}>
                  <h2 style={{ fontSize: '0.95rem', margin: 0, flexShrink: 0, fontWeight: '700' }}>📊 פירוט שבוע</h2>
                  <select
                    value={selectedWeekId}
                    onChange={(e) => setSelectedWeekId(e.target.value)}
                    className="input"
                    style={{ fontSize: '13px', padding: '0.35rem', maxWidth: '55%', borderRadius: '10px' }}
                  >
                    {availableWeeks.map(week => (
                      <option key={week._id} value={week._id}>{week.name}</option>
                    ))}
                  </select>
                </div>

                {selectedWeekId && selectedWeekScores.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    {selectedWeekScores.map((player, index) =>
                      renderPlayerRow(player, index, 'score', player.name === user.name, index * 0.03)
                    )}
                  </div>
                )}
                {selectedWeekScores.length === 0 && selectedWeekId && (
                  <div style={{ textAlign: 'center', color: '#999', padding: '0.75rem', fontSize: '13px' }}>
                    אין נתוני ניקוד לשבוע זה
                  </div>
                )}
              </>
            ) : (
              <div style={{ textAlign: 'center', color: '#999', padding: '1.5rem', fontSize: '14px' }}>
                אין שבועות בחודש {months.find(m => m.value === selectedMonth)?.label}
              </div>
            )}
          </div>
        )}

        {/* דירוג כללי */}
        {activeTab === 'general' && (
          <div className="card">
            <h2 style={{ fontSize: '0.95rem', margin: '0 0 0.5rem 0', fontWeight: '700' }}>
              🏆 דירוג כללי - {selectedSeason}
            </h2>
            {/* בורר עונה לטאב כללי */}
            <div style={{ marginBottom: '0.5rem' }}>
              <select
                value={selectedSeason}
                onChange={(e) => setSelectedSeason(e.target.value)}
                className="input"
                style={{ width: '100%', fontSize: '13px', padding: '0.45rem', borderRadius: '10px' }}
              >
                {seasons.map(season => (
                  <option key={season.value} value={season.value}>{season.label}</option>
                ))}
              </select>
            </div>
            {leaderboard.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                {leaderboard.map((entry, index) =>
                  renderPlayerRow(
                    { name: entry.user.name, score: entry.totalScore },
                    index, 'score', entry.user._id === user.id, index * 0.04
                  )
                )}
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: '#999', padding: '1.5rem', fontSize: '14px' }}>
                אין נתוני דירוג עדיין
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Leaderboard;
