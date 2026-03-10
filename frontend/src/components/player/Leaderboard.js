import React, { useState, useEffect } from 'react';

function Leaderboard({ leaderboard, user }) {
  const [monthlyScores, setMonthlyScores] = useState([]);
  const [selectedWeekScores, setSelectedWeekScores] = useState([]);
  const [availableWeeks, setAvailableWeeks] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedSeason, setSelectedSeason] = useState('2025-26');
  const [selectedWeekId, setSelectedWeekId] = useState('');
  const [loading, setLoading] = useState(false);

  const API_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:5000/api'
    : 'https://football-betting-backend.onrender.com/api';

  useEffect(() => {
    loadScoresData();
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

      if (scoresResponse.ok) {
        scoresData = await scoresResponse.json();
      }

      if (weeksResponse.ok) {
        weeksData = await weeksResponse.json();
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

  const calculateMonthlyScores = (scoresData, weeksData) => {
    const monthWeeks = weeksData.filter(week => {
      if (!week) return false;
      const weekMonth = week.month || new Date(week.createdAt).getMonth() + 1;
      const weekSeason = week.season || '2025-26';
      return weekMonth === selectedMonth && weekSeason === selectedSeason;
    });

    setAvailableWeeks(monthWeeks);

    if (monthWeeks.length > 0 && !selectedWeekId) {
      setSelectedWeekId(monthWeeks[0]._id);
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
        userScores[userId] = {
          name: userName,
          monthlyScore: 0,
          totalScore: score.totalScore || 0
        };
      }

      if (monthWeekIds.includes(weekId)) {
        userScores[userId].monthlyScore += score.weeklyScore || 0;
      }
    });

    const monthlyArray = Object.values(userScores).sort((a, b) => b.monthlyScore - a.monthlyScore);
    setMonthlyScores(monthlyArray);
  };

  const loadWeekScores = async () => {
    if (!selectedWeekId) {
      setSelectedWeekScores([]);
      return;
    }

    try {
      const betsResponse = await fetch(`${API_URL}/bets/week/${selectedWeekId}`);

      if (!betsResponse.ok) {
        setSelectedWeekScores([]);
        return;
      }

      const betsData = await betsResponse.json();

      const weekScores = {};

      betsData.forEach(bet => {
        if (!bet.userId || bet.userId.role === 'admin') return;

        const userId = bet.userId._id;
        const userName = bet.userId.name;
        const points = bet.points || 0;

        if (!weekScores[userId]) {
          weekScores[userId] = {
            name: userName,
            score: 0
          };
        }

        weekScores[userId].score += points;
      });

      const weekScoresArray = Object.values(weekScores).sort((a, b) => b.score - a.score);
      setSelectedWeekScores(weekScoresArray);

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

  const getMedalOrRank = (index) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return index + 1;
  };

  return (
    <div>
      {/* סינון עונה + חודש */}
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
          style={{ width: '100%', fontSize: '13px', padding: '0.45rem' }}
        >
          {seasons.map(season => (
            <option key={season.value} value={season.value}>
              {season.label}
            </option>
          ))}
        </select>

        <select
          value={selectedMonth}
          onChange={(e) => {
            setSelectedMonth(parseInt(e.target.value));
            setSelectedWeekId('');
          }}
          className="input"
          style={{ width: '100%', fontSize: '13px', padding: '0.45rem' }}
        >
          {months.map(month => (
            <option key={month.value} value={month.value}>
              {month.label}
            </option>
          ))}
        </select>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '1.5rem', color: '#666', fontSize: '14px' }}>
          טוען נתונים...
        </div>
      )}

      {/* דירוג חודשי */}
      <div className="card" style={{ marginBottom: '0.75rem' }}>
        <h2 style={{ fontSize: '1rem', margin: '0 0 0.5rem 0' }}>
          דירוג {months.find(m => m.value === selectedMonth)?.label} - {selectedSeason}
        </h2>
        {!loading && monthlyScores.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {monthlyScores.map((player, index) => (
              <div key={player.name} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.5rem 0.6rem',
                backgroundColor: player.name === user.name ? '#e3f2fd' : (index % 2 === 0 ? '#fafafa' : '#fff'),
                borderRadius: '8px',
                border: player.name === user.name ? '2px solid #90caf9' : '1px solid #f0f0f0'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0, flex: 1 }}>
                  <span style={{
                    fontSize: index < 3 ? '18px' : '13px',
                    fontWeight: 'bold',
                    minWidth: '28px',
                    textAlign: 'center',
                    color: index >= 3 ? '#999' : undefined
                  }}>
                    {getMedalOrRank(index)}
                  </span>
                  <span style={{
                    fontWeight: '500',
                    fontSize: '14px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {player.name}
                    {player.name === user.name && (
                      <span style={{ color: '#1976d2', fontSize: '11px', marginRight: '4px' }}> (אתה)</span>
                    )}
                  </span>
                </div>
                <span style={{
                  fontWeight: 'bold',
                  fontSize: '16px',
                  color: '#333',
                  flexShrink: 0,
                  backgroundColor: index === 0 ? '#fff9c4' : '#f5f5f5',
                  padding: '2px 10px',
                  borderRadius: '12px',
                  minWidth: '40px',
                  textAlign: 'center'
                }}>
                  {player.monthlyScore}
                </span>
              </div>
            ))}
          </div>
        )}

        {monthlyScores.length === 0 && !loading && (
          <div style={{ textAlign: 'center', color: '#666', padding: '1rem', fontSize: '14px' }}>
            אין נתונים לחודש {months.find(m => m.value === selectedMonth)?.label}
          </div>
        )}
      </div>

      {/* פירוט שבוע */}
      {availableWeeks.length > 0 && (
        <div className="card" style={{ marginBottom: '0.75rem' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.5rem',
            gap: '0.5rem'
          }}>
            <h2 style={{ fontSize: '1rem', margin: 0, flexShrink: 0 }}>פירוט שבוע</h2>
            <select
              value={selectedWeekId}
              onChange={(e) => setSelectedWeekId(e.target.value)}
              className="input"
              style={{ fontSize: '13px', padding: '0.35rem', maxWidth: '55%' }}
            >
              {availableWeeks.map(week => (
                <option key={week._id} value={week._id}>
                  {week.name}
                </option>
              ))}
            </select>
          </div>

          {selectedWeekId && selectedWeekScores.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              {selectedWeekScores.map((player, index) => (
                <div key={player.name} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.4rem 0.5rem',
                  backgroundColor: player.name === user.name ? '#e3f2fd' : (index % 2 === 0 ? '#fafafa' : '#fff'),
                  borderRadius: '6px',
                  border: player.name === user.name ? '1px solid #90caf9' : 'none'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: 0, flex: 1 }}>
                    <span style={{
                      fontSize: index < 3 ? '16px' : '12px',
                      fontWeight: 'bold',
                      minWidth: '24px',
                      textAlign: 'center',
                      color: index >= 3 ? '#999' : undefined
                    }}>
                      {getMedalOrRank(index)}
                    </span>
                    <span style={{
                      fontWeight: '500',
                      fontSize: '13px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {player.name}
                      {player.name === user.name && (
                        <span style={{ color: '#1976d2', fontSize: '10px' }}> (אתה)</span>
                      )}
                    </span>
                  </div>
                  <span style={{
                    fontWeight: 'bold',
                    fontSize: '14px',
                    color: '#333',
                    flexShrink: 0,
                    padding: '1px 8px',
                    backgroundColor: '#f5f5f5',
                    borderRadius: '10px'
                  }}>
                    {player.score}
                  </span>
                </div>
              ))}
            </div>
          )}

          {selectedWeekScores.length === 0 && selectedWeekId && (
            <div style={{ textAlign: 'center', color: '#666', padding: '0.75rem', fontSize: '13px' }}>
              אין נתוני ניקוד לשבוע זה
            </div>
          )}
        </div>
      )}

      {/* דירוג כללי */}
      <div className="card">
        <h2 style={{ fontSize: '1rem', margin: '0 0 0.5rem 0' }}>דירוג כללי - {selectedSeason}</h2>
        {leaderboard.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {leaderboard.map((entry, index) => (
              <div key={entry.user._id} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.5rem 0.6rem',
                backgroundColor: entry.user._id === user.id ? '#e3f2fd' : (index % 2 === 0 ? '#fafafa' : '#fff'),
                borderRadius: '8px',
                border: entry.user._id === user.id ? '2px solid #90caf9' : '1px solid #f0f0f0'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0, flex: 1 }}>
                  <span style={{
                    fontSize: index < 3 ? '18px' : '13px',
                    fontWeight: 'bold',
                    minWidth: '28px',
                    textAlign: 'center',
                    color: index >= 3 ? '#999' : undefined
                  }}>
                    {getMedalOrRank(index)}
                  </span>
                  <span style={{
                    fontWeight: '500',
                    fontSize: '14px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {entry.user.name}
                    {entry.user._id === user.id && (
                      <span style={{ color: '#1976d2', fontSize: '11px', marginRight: '4px' }}> (אתה)</span>
                    )}
                  </span>
                </div>
                <span style={{
                  fontWeight: 'bold',
                  fontSize: '18px',
                  color: '#333',
                  flexShrink: 0,
                  backgroundColor: index === 0 ? '#fff9c4' : '#f5f5f5',
                  padding: '2px 12px',
                  borderRadius: '12px',
                  minWidth: '44px',
                  textAlign: 'center'
                }}>
                  {entry.totalScore}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', color: '#666', padding: '1rem', fontSize: '14px' }}>
            אין נתוני דירוג עדיין
          </div>
        )}
      </div>
    </div>
  );
}

export default Leaderboard;
