import React, { useState, useEffect } from 'react';

function HistoryViewer({ weeks, user }) {
  const [selectedHistoryWeek, setSelectedHistoryWeek] = useState(null);
  const [historyData, setHistoryData] = useState({ matches: [], bets: [], allBets: [] });
  const [loading, setLoading] = useState(false);

  const [selectedSeason, setSelectedSeason] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [availableSeasons, setAvailableSeasons] = useState([]);
  const [availableMonths, setAvailableMonths] = useState([]);
  const [filteredWeeks, setFilteredWeeks] = useState([]);

  const API_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:5000/api'
    : 'https://football-betting-backend.onrender.com/api';

  useEffect(() => {
    if (!weeks || weeks.length === 0) return;
    const seasons = [...new Set(weeks.map(w => w.season || '2025-26'))].sort().reverse();
    setAvailableSeasons(seasons);
    if (!selectedSeason && seasons.length > 0) setSelectedSeason(seasons[0]);
  }, [weeks]);

  useEffect(() => {
    if (!weeks || !selectedSeason) return;
    const weeksInSeason = weeks.filter(w => (w.season || '2025-26') === selectedSeason);
    const months = [...new Set(weeksInSeason.map(w => w.month))].sort((a, b) => b - a);
    setAvailableMonths(months);
    if (!selectedMonth && months.length > 0) setSelectedMonth(months[0]);
  }, [weeks, selectedSeason]);

  useEffect(() => {
    if (!weeks) return;
    let filtered = weeks;
    if (selectedSeason) filtered = filtered.filter(w => (w.season || '2025-26') === selectedSeason);
    if (selectedMonth) filtered = filtered.filter(w => w.month === selectedMonth);
    filtered = filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    setFilteredWeeks(filtered);
    if (filtered.length > 0 && !selectedHistoryWeek) {
      setSelectedHistoryWeek(filtered[0]);
      loadHistoryData(filtered[0]._id);
    } else if (filtered.length === 0) {
      setSelectedHistoryWeek(null);
      setHistoryData({ matches: [], bets: [], allBets: [] });
    }
  }, [weeks, selectedSeason, selectedMonth]);

  const loadHistoryData = async (weekId) => {
    if (!weekId) return;
    setLoading(true);
    try {
      const [matchesResponse, userBetsResponse, allBetsResponse] = await Promise.all([
        fetch(`${API_URL}/matches/week/${weekId}`),
        fetch(`${API_URL}/bets/user/${user.id}/week/${weekId}`),
        fetch(`${API_URL}/bets/week/${weekId}`)
      ]);
      const matches = await matchesResponse.json();
      const userBetsArray = await userBetsResponse.json();
      const allBets = await allBetsResponse.json();
      const userBetsObj = {};
      if (Array.isArray(userBetsArray)) {
        userBetsArray.forEach(bet => {
          if (bet && bet.matchId) {
            const matchId = typeof bet.matchId === 'object' ? bet.matchId._id : bet.matchId;
            userBetsObj[matchId] = bet.prediction;
          }
        });
      }
      setHistoryData({ matches, bets: userBetsObj, allBets });
    } catch (error) {
      console.error('Error loading history:', error);
    } finally { setLoading(false); }
  };

  const getLeagueColor = (match) => {
    if (match.leagueId && typeof match.leagueId === 'object' && match.leagueId.color) return match.leagueId.color;
    return { 'english': '#dc3545', 'spanish': '#007bff', 'world': '#6f42c1' }[match.league] || '#6c757d';
  };

  const getLeagueName = (match) => {
    if (match.leagueId && typeof match.leagueId === 'object' && match.leagueId.name) return match.leagueId.name;
    return { 'english': 'פרמיירליג', 'spanish': 'לה ליגה', 'world': 'ליגת העל' }[match.league] || 'ליגה';
  };

  const calculateUserWeekScore = () => {
    if (!selectedHistoryWeek || !historyData.allBets.length) return 0;
    return historyData.allBets
      .filter(bet => bet.userId && bet.userId._id === user.id)
      .reduce((total, bet) => total + (bet.points || 0), 0);
  };

  const getScoreboardData = () => {
    if (!historyData.allBets.length) return [];
    const playerScores = {};
    historyData.allBets.forEach(bet => {
      if (bet.userId && bet.userId._id && bet.userId.role !== 'admin') {
        if (!playerScores[bet.userId._id]) playerScores[bet.userId._id] = { name: bet.userId.name, score: 0 };
        playerScores[bet.userId._id].score += bet.points || 0;
      }
    });
    return Object.values(playerScores).sort((a, b) => b.score - a.score);
  };

  const months = [
    { value: 1, label: 'ינואר' }, { value: 2, label: 'פברואר' }, { value: 3, label: 'מרץ' },
    { value: 4, label: 'אפריל' }, { value: 5, label: 'מאי' }, { value: 6, label: 'יוני' },
    { value: 7, label: 'יולי' }, { value: 8, label: 'אוגוסט' }, { value: 9, label: 'ספטמבר' },
    { value: 10, label: 'אוקטובר' }, { value: 11, label: 'נובמבר' }, { value: 12, label: 'דצמבר' }
  ];

  const getRankStyle = (index) => {
    if (index === 0) return { icon: '🥇', bg: 'linear-gradient(135deg, #fff9c4, #fff176)', border: '#ffd54f' };
    if (index === 1) return { icon: '🥈', bg: 'linear-gradient(135deg, #f5f5f5, #e0e0e0)', border: '#bdbdbd' };
    if (index === 2) return { icon: '🥉', bg: 'linear-gradient(135deg, #ffe0b2, #ffcc80)', border: '#ffb74d' };
    return { icon: null, bg: 'transparent', border: 'transparent' };
  };

  const getPointsBadge = (points, isExact) => {
    if (points === 0) return { bg: '#fce4ec', color: '#c62828', text: '❌ +0' };
    if (isExact) return { bg: '#e8f5e9', color: '#2e7d32', text: `🎯 מדויק +${points}` };
    return { bg: '#e3f2fd', color: '#1565c0', text: `✅ כיוון +${points}` };
  };

  return (
    <div>
      {/* סינונים */}
      <div className="card" style={{ marginBottom: '0.75rem', padding: '0.75rem' }}>
        <h2 style={{ fontSize: '0.95rem', margin: '0 0 0.5rem 0', fontWeight: '700' }}>📋 היסטוריית שבועות</h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', marginBottom: '0.4rem' }}>
          <select value={selectedSeason} onChange={(e) => { setSelectedSeason(e.target.value); setSelectedMonth(''); setSelectedHistoryWeek(null); }}
            className="input" style={{ width: '100%', fontSize: '13px', padding: '0.4rem', borderRadius: '10px' }}>
            <option value="">כל העונות</option>
            {availableSeasons.map(s => <option key={s} value={s}>עונת {s}</option>)}
          </select>
          <select value={selectedMonth} onChange={(e) => { setSelectedMonth(parseInt(e.target.value) || ''); setSelectedHistoryWeek(null); }}
            className="input" style={{ width: '100%', fontSize: '13px', padding: '0.4rem', borderRadius: '10px' }}
            disabled={!selectedSeason || availableMonths.length === 0}>
            <option value="">כל החודשים</option>
            {availableMonths.map(m => <option key={m} value={m}>{months.find(x => x.value === m)?.label}</option>)}
          </select>
        </div>

        <select value={selectedHistoryWeek?._id || ''} onChange={(e) => {
          const week = filteredWeeks.find(w => w._id === e.target.value);
          setSelectedHistoryWeek(week);
          if (week) loadHistoryData(week._id);
        }} className="input" style={{ width: '100%', fontSize: '13px', padding: '0.4rem', borderRadius: '10px' }}
          disabled={filteredWeeks.length === 0}>
          <option value="">בחר שבוע ({filteredWeeks.length} זמינים)</option>
          {filteredWeeks.map(w => <option key={w._id} value={w._id}>{w.name} - {months.find(m => m.value === w.month)?.label}</option>)}
        </select>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>
          <div style={{ width: '36px', height: '36px', border: '3px solid #f0f0f0', borderTop: '3px solid var(--theme-primary, #007bff)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 0.5rem' }}></div>
          <span style={{ fontSize: '13px' }}>טוען היסטוריה...</span>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {!selectedHistoryWeek && !loading && filteredWeeks.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '2rem', background: 'linear-gradient(135deg, #f8f9ff, #f0f4ff)' }}>
          <div style={{ fontSize: '40px', marginBottom: '0.5rem' }}>📭</div>
          <p style={{ color: '#888', fontSize: '14px', margin: 0 }}>אין שבועות מסוננים. נסה לשנות את הסינון.</p>
        </div>
      )}

      {selectedHistoryWeek && !loading && (
        <>
          {/* כותרת שבוע + ניקוד */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: '0.5rem', padding: '0.55rem 0.75rem',
            background: 'linear-gradient(135deg, #f0f7ff, #e3efff)',
            borderRadius: '14px', border: '1px solid #c8dcf5',
            animation: 'scaleIn 0.25s ease'
          }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: '700', fontSize: '14px', color: '#333' }}>{selectedHistoryWeek.name}</div>
              <div style={{ color: '#888', fontSize: '12px' }}>
                {months.find(m => m.value === selectedHistoryWeek.month)?.label} {selectedHistoryWeek.season}
              </div>
            </div>
            <div style={{
              textAlign: 'center',
              background: 'linear-gradient(135deg, #007bff, #0056d2)',
              color: 'white', padding: '0.35rem 0.85rem', borderRadius: '12px',
              flexShrink: 0, boxShadow: '0 4px 12px rgba(0,123,255,0.25)'
            }}>
              <div style={{ fontSize: '9px', opacity: 0.85, lineHeight: 1, textTransform: 'uppercase', letterSpacing: '0.5px' }}>הניקוד שלך</div>
              <div style={{ fontSize: '22px', fontWeight: '800', lineHeight: 1.2 }}>{calculateUserWeekScore()}</div>
            </div>
          </div>

          {/* ההימורים שלך */}
          <div style={{ marginBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '0.9rem', margin: '0 0 0.5rem 0', fontWeight: '700', color: '#555' }}>ההימורים שלך</h3>
            {historyData.matches.length === 0 ? (
              <p style={{ color: '#888', fontSize: '14px' }}>אין משחקים בשבוע זה</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {historyData.matches.map((match, index) => {
                  const bet = historyData.bets[match._id];
                  const hasResult = match.result?.team1Goals !== undefined;
                  let points = 0;
                  let isExact = false;
                  if (bet && hasResult) {
                    const fullBet = historyData.allBets.find(b =>
                      b.userId && b.userId._id === user.id &&
                      b.matchId && (b.matchId._id === match._id || b.matchId === match._id)
                    );
                    if (fullBet && fullBet.points !== undefined && fullBet.points !== null) {
                      points = fullBet.points;
                    } else {
                      const predOutcome = bet.team1Goals > bet.team2Goals ? 'home' : bet.team1Goals < bet.team2Goals ? 'away' : 'draw';
                      const resultOutcome = match.result.team1Goals > match.result.team2Goals ? 'home' : match.result.team1Goals < match.result.team2Goals ? 'away' : 'draw';
                      const hasOdds = match.odds && (match.odds.homeWin || match.odds.draw || match.odds.awayWin);
                      if (hasOdds) {
                        let relevantOdd = 1;
                        if (resultOutcome === 'home' && match.odds.homeWin) relevantOdd = match.odds.homeWin;
                        else if (resultOutcome === 'draw' && match.odds.draw) relevantOdd = match.odds.draw;
                        else if (resultOutcome === 'away' && match.odds.awayWin) relevantOdd = match.odds.awayWin;
                        if (bet.team1Goals === match.result.team1Goals && bet.team2Goals === match.result.team2Goals) points = Math.round(relevantOdd * 2 / 3 * 10) / 10;
                        else if (predOutcome === resultOutcome) points = Math.round(relevantOdd / 3 * 10) / 10;
                      } else {
                        if (bet.team1Goals === match.result.team1Goals && bet.team2Goals === match.result.team2Goals) points = 3;
                        else if (predOutcome === resultOutcome) points = 1;
                      }
                    }
                    isExact = bet.team1Goals === match.result.team1Goals && bet.team2Goals === match.result.team2Goals;
                  }
                  const badge = getPointsBadge(points, isExact);

                  return (
                    <div key={match._id} style={{
                      padding: '0.65rem', border: '1px solid #eee', borderRadius: '14px',
                      backgroundColor: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                      animation: `slideUp 0.25s ease ${index * 0.04}s both`
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                        <span style={{
                          padding: '2px 8px', backgroundColor: getLeagueColor(match), color: 'white',
                          borderRadius: '6px', fontSize: '10px', fontWeight: '700',
                          boxShadow: `0 2px 4px ${getLeagueColor(match)}33`
                        }}>{getLeagueName(match)}</span>
                        <span style={{ fontSize: '11px', color: '#aaa', fontWeight: '500' }}>{match.date} • {match.time}</span>
                      </div>

                      {match.odds && (match.odds.homeWin || match.odds.draw || match.odds.awayWin) && (
                        <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.35rem', justifyContent: 'center' }}>
                          {[
                            { label: '1', value: match.odds.homeWin, bg: '#eef4ff', color: '#3b6fd4' },
                            { label: 'X', value: match.odds.draw, bg: '#fef6e6', color: '#c67e00' },
                            { label: '2', value: match.odds.awayWin, bg: '#edf7ee', color: '#2d8a3e' }
                          ].map(odd => (
                            <span key={odd.label} style={{ padding: '2px 8px', backgroundColor: odd.bg, borderRadius: '8px', fontSize: '10px', color: odd.color, fontWeight: '700' }}>
                              {odd.label}: {odd.value || '-'}
                            </span>
                          ))}
                        </div>
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
                        <span style={{ flex: '1 1 0', textAlign: 'center', fontWeight: '700', fontSize: '13px', lineHeight: 1.2, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', color: '#333' }}>
                          {match.team1}
                        </span>
                        <div style={{ textAlign: 'center', flexShrink: 0 }}>
                          <div style={{ fontSize: '20px', fontWeight: '800', color: '#1976d2', fontFamily: 'monospace', lineHeight: 1 }}>
                            {bet ? `${bet.team1Goals} - ${bet.team2Goals}` : '-'}
                          </div>
                          {hasResult && (
                            <div style={{ fontSize: '12px', color: '#888', marginTop: '2px', fontWeight: '600' }}>
                              {match.result.team1Goals} - {match.result.team2Goals}
                            </div>
                          )}
                        </div>
                        <span style={{ flex: '1 1 0', textAlign: 'center', fontWeight: '700', fontSize: '13px', lineHeight: 1.2, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', color: '#333' }}>
                          {match.team2}
                        </span>
                      </div>

                      <div style={{ textAlign: 'center' }}>
                        {hasResult && bet && (
                          <span style={{
                            padding: '4px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: '700',
                            backgroundColor: badge.bg, color: badge.color,
                            display: 'inline-block'
                          }}>{badge.text}</span>
                        )}
                        {hasResult && !bet && <span style={{ color: '#ccc', fontSize: '12px' }}>לא הימרת</span>}
                        {!hasResult && <span style={{ color: '#aaa', fontSize: '12px', fontStyle: 'italic' }}>ממתין לתוצאה</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* לוח תוצאות */}
          {historyData.allBets.length > 0 && (
            <div className="card">
              <h3 style={{ fontSize: '0.9rem', margin: '0 0 0.5rem 0', fontWeight: '700', color: '#555' }}>🏆 לוח תוצאות השבוע</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {getScoreboardData().map((player, index) => {
                  const rank = getRankStyle(index);
                  const isMe = player.name === user.name;
                  const isTop3 = index < 3;
                  return (
                    <div key={player.name} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: isTop3 ? '0.5rem 0.55rem' : '0.4rem 0.5rem',
                      background: isMe ? 'linear-gradient(135deg, #e3f2fd, #bbdefb)' : (isTop3 ? rank.bg : (index % 2 === 0 ? '#fafafa' : '#fff')),
                      borderRadius: isTop3 ? '10px' : '6px',
                      border: isMe ? '2px solid #64b5f6' : (isTop3 ? `1px solid ${rank.border}` : 'none'),
                      boxShadow: isMe ? '0 2px 8px rgba(33,150,243,0.15)' : 'none',
                      animation: `slideUp 0.2s ease ${index * 0.03}s both`
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: 0, flex: 1 }}>
                        <span style={{ fontSize: isTop3 ? '18px' : '12px', fontWeight: '800', minWidth: '24px', textAlign: 'center', color: !isTop3 ? '#bbb' : undefined }}>
                          {rank.icon || (index + 1)}
                        </span>
                        <span style={{ fontWeight: isMe ? '700' : '500', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#333' }}>
                          {player.name}
                          {isMe && <span style={{ color: '#1976d2', fontSize: '10px' }}> (אתה)</span>}
                        </span>
                      </div>
                      <span style={{
                        fontWeight: '800', fontSize: isTop3 ? '16px' : '14px', flexShrink: 0,
                        padding: '2px 10px', background: isTop3 ? 'rgba(255,255,255,0.7)' : '#f5f5f5',
                        borderRadius: '10px', color: '#333'
                      }}>{player.score}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {!selectedHistoryWeek && !loading && filteredWeeks.length > 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
          <p style={{ color: '#888', fontSize: '14px', margin: 0 }}>בחר שבוע מהרשימה למעלה</p>
        </div>
      )}
    </div>
  );
}

export default HistoryViewer;
