import React, { useState } from 'react';

function BetsManagement({ selectedWeek, matches, allBets, users, loadWeekData, user }) {
  const [savingBet, setSavingBet] = useState(null);

  const API_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:5000/api'
    : 'https://football-betting-backend.onrender.com/api';

  const saveBet = async (playerId, matchId, team1Goals, team2Goals) => {
    try {
      if (!selectedWeek) { alert('שגיאה: אין שבוע נבחר'); return false; }

      const isCurrentUserAdmin = user && user.role === 'admin';

      if (!isCurrentUserAdmin) {
        if (selectedWeek.locked) return false;
        if (selectedWeek.lockTime && new Date() >= new Date(selectedWeek.lockTime)) return false;
        if (!selectedWeek.active) return false;
      } else {
        const playerName = users.find(u => u._id === playerId)?.name || 'משתמש לא ידוע';
        const confirmMessage = '👑 אתה מתחבר כאדמין!\n\n' +
          `השבוע נעול לשחקנים רגילים, אבל אתה יכול לערוך הימור של ${playerName}.\n` +
          'האם אתה בטוח שרצית להמשיך?';
        if (!window.confirm(confirmMessage)) return false;
      }

      setSavingBet(`${playerId}-${matchId}`);

      const response = await fetch(`${API_URL}/bets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: playerId, matchId, weekId: selectedWeek._id,
          team1Goals: parseInt(team1Goals) || 0,
          team2Goals: parseInt(team2Goals) || 0,
          requestedByUserId: user.id
        })
      });

      if (response.ok) {
        await loadWeekData(selectedWeek._id);
        setSavingBet(null);
        return true;
      } else {
        const errorData = await response.json();
        if (errorData.message.includes('locked')) alert('🔒 השבוע נעול');
        else if (errorData.message.includes('expired')) alert('⏰ זמן ההימורים הסתיים');
        else if (errorData.message.includes('not active')) alert('❌ השבוע לא פעיל');
        else alert('שגיאה: ' + errorData.message);
        setSavingBet(null);
        return false;
      }
    } catch (error) {
      console.error('שגיאת רשת:', error);
      alert('שגיאה ברשת');
      setSavingBet(null);
      return false;
    }
  };

  const getLeagueName = (match) => {
    if (match.leagueId && typeof match.leagueId === 'object' && match.leagueId.name) return match.leagueId.name;
    const names = { 'english': 'פרמיירליג', 'spanish': 'לה ליגה', 'world': 'ליגת העל' };
    return names[match.league] || 'ליגה';
  };

  const getLeagueColor = (match) => {
    if (match.leagueId && typeof match.leagueId === 'object' && match.leagueId.color) return match.leagueId.color;
    const colors = { 'english': '#dc3545', 'spanish': '#007bff', 'world': '#6f42c1' };
    return colors[match.league] || '#6c757d';
  };

  const getWeekStatusForAdmin = () => {
    if (!selectedWeek) return null;
    const isLocked = selectedWeek.locked || (selectedWeek.lockTime && new Date() >= new Date(selectedWeek.lockTime));
    const isCurrentUserAdmin = user && user.role === 'admin';
    if (isLocked && isCurrentUserAdmin) return { type: 'admin-override', message: '👑 מצב אדמין: השבוע נעול לשחקנים אבל אתה יכול לערוך' };
    if (isLocked) return { type: 'locked', message: '🔒 השבוע נעול - ניתן לצפות בהימורים אבל לא לערוך' };
    return { type: 'active', message: '✅ ניתן לערוך הימורים' };
  };

  const getPointsBadge = (bet, match) => {
    if (!bet || !match.result || match.result.team1Goals === undefined) return null;
    const points = bet.points || 0;
    const isExact = bet.prediction.team1Goals === match.result.team1Goals && bet.prediction.team2Goals === match.result.team2Goals;

    if (points === 0) return { text: 'שגוי', bg: '#fee2e2', color: '#dc2626', border: '#fca5a5' };
    if (isExact) return { text: `מדויק ${points}`, bg: '#dcfce7', color: '#16a34a', border: '#86efac' };
    return { text: `כיוון ${points}`, bg: '#dbeafe', color: '#2563eb', border: '#93c5fd' };
  };

  if (!selectedWeek) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
        <div style={{ fontSize: '40px', marginBottom: '0.5rem' }}>🎯</div>
        <h2 style={{ fontSize: '1rem', fontWeight: '600', color: '#666' }}>יש לבחור שבוע לעריכת הימורים</h2>
        <p style={{ color: '#999', fontSize: '13px' }}>בחר שבוע מהרשימה למעלה</p>
      </div>
    );
  }

  const weekStatus = getWeekStatusForAdmin();
  const isCurrentUserAdmin = user && user.role === 'admin';
  const canEdit = isCurrentUserAdmin || weekStatus?.type === 'active';
  const playerUsers = users.filter(u => u && u.role !== 'admin');

  return (
    <div>
      {/* Header + Actions */}
      <div className="card" style={{ marginBottom: '0.75rem' }}>
        <h2 style={{ fontSize: '0.95rem', margin: '0 0 0.5rem 0', fontWeight: '700' }}>
          🎯 עריכת הימורים - {selectedWeek.name}
        </h2>

        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
          <button onClick={async () => { await loadWeekData(selectedWeek._id); }} style={{
            padding: '0.4rem 0.7rem',
            background: 'linear-gradient(135deg, #28a745, #20c997)',
            color: 'white', border: 'none', borderRadius: '8px',
            fontSize: '12px', fontWeight: '700', cursor: 'pointer'
          }}>
            🔄 רענן
          </button>
          <button onClick={async () => {
            try {
              const response = await fetch(`${API_URL}/scores/calculate/${selectedWeek._id}`, { method: 'POST' });
              if (response.ok) { await loadWeekData(selectedWeek._id); alert('ניקוד חושב מחדש!'); }
              else alert('שגיאה בחישוב ניקוד');
            } catch (error) { alert('שגיאה בחישוב ניקוד'); }
          }} style={{
            padding: '0.4rem 0.7rem',
            background: 'linear-gradient(135deg, #ffc107, #ffb300)',
            color: 'white', border: 'none', borderRadius: '8px',
            fontSize: '12px', fontWeight: '700', cursor: 'pointer'
          }}>
            🧮 חשב ניקוד
          </button>
          <button onClick={() => {
            console.log('=== נתוני שבוע ===', { selectedWeek, matches, allBets, users });
          }} style={{
            padding: '0.4rem 0.7rem', backgroundColor: '#6c757d',
            color: 'white', border: 'none', borderRadius: '8px',
            fontSize: '12px', fontWeight: '600', cursor: 'pointer'
          }}>
            🔍 קונסול
          </button>
        </div>

        {/* Stats row */}
        <div style={{
          display: 'flex', gap: '0.5rem', flexWrap: 'wrap'
        }}>
          {[
            { label: 'משחקים', value: matches.length, color: '#007bff' },
            { label: 'הימורים', value: allBets.length, color: '#28a745' },
            { label: 'שחקנים', value: playerUsers.length, color: '#6f42c1' }
          ].map(stat => (
            <span key={stat.label} style={{
              padding: '3px 10px', borderRadius: '20px',
              fontSize: '11px', fontWeight: '700',
              background: `${stat.color}15`, color: stat.color,
              border: `1px solid ${stat.color}30`
            }}>
              {stat.value} {stat.label}
            </span>
          ))}
        </div>

        {weekStatus && (
          <div style={{
            marginTop: '0.5rem', padding: '0.5rem 0.7rem', borderRadius: '10px',
            fontSize: '13px', fontWeight: '600',
            backgroundColor: weekStatus.type === 'admin-override' ? '#fff3cd' :
              weekStatus.type === 'locked' ? '#fee2e2' : '#dcfce7',
            color: weekStatus.type === 'admin-override' ? '#92400e' :
              weekStatus.type === 'locked' ? '#dc2626' : '#16a34a',
            border: `1px solid ${weekStatus.type === 'admin-override' ? '#fde68a' :
              weekStatus.type === 'locked' ? '#fca5a5' : '#86efac'}`
          }}>
            {weekStatus.message}
          </div>
        )}
      </div>

      {/* Bets - Card per match */}
      {matches.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '2rem', color: '#999', fontSize: '14px' }}>
          אין משחקים בשבוע זה. יש להוסיף משחקים תחילה.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {matches.map((match, matchIndex) => {
            const leagueColor = getLeagueColor(match);
            const hasResult = match.result && match.result.team1Goals !== undefined;

            return (
              <div key={match._id} className="card" style={{
                padding: 0, overflow: 'hidden',
                animation: `slideUp 0.25s ease ${matchIndex * 0.04}s both`
              }}>
                {/* Match header */}
                <div style={{
                  padding: '0.5rem 0.7rem',
                  background: `linear-gradient(135deg, ${leagueColor}12, ${leagueColor}06)`,
                  borderBottom: `2px solid ${leagueColor}25`
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '14px', color: '#333' }}>
                        {match.team1} נגד {match.team2}
                      </div>
                      <div style={{ fontSize: '11px', color: '#888', marginTop: '1px' }}>
                        <span style={{
                          display: 'inline-block', width: '8px', height: '8px',
                          backgroundColor: leagueColor, borderRadius: '50%',
                          marginLeft: '4px', verticalAlign: 'middle'
                        }}></span>
                        {getLeagueName(match)} • {match.date} {match.time}
                      </div>
                    </div>
                    {hasResult && (
                      <span style={{
                        padding: '3px 10px', borderRadius: '20px',
                        background: 'linear-gradient(135deg, #dcfce7, #bbf7d0)',
                        color: '#16a34a', fontSize: '13px', fontWeight: '800',
                        border: '1px solid #86efac'
                      }}>
                        {match.result.team1Goals}-{match.result.team2Goals}
                      </span>
                    )}
                  </div>
                </div>

                {/* Players bets */}
                <div style={{ padding: '0.3rem' }}>
                  {playerUsers.map((player, playerIndex) => {
                    const playerBets = allBets.filter(bet => bet && bet.userId && bet.userId._id === player._id);
                    const bet = playerBets.find(b => b && b.matchId && b.matchId._id === match._id);
                    const badge = getPointsBadge(bet, match);
                    const isSaving = savingBet === `${player._id}-${match._id}`;

                    return (
                      <div key={player._id} style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.35rem 0.5rem',
                        borderRadius: '8px',
                        background: playerIndex % 2 === 0 ? '#fafafa' : '#fff',
                        marginBottom: '2px'
                      }}>
                        <span style={{
                          fontWeight: '600', fontSize: '13px', color: '#444',
                          minWidth: '70px', flexShrink: 0
                        }}>
                          {player.name}
                        </span>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <input
                            id={`bet-${player._id}-${match._id}-team1`}
                            type="number" min="0" max="20"
                            defaultValue={bet?.prediction?.team1Goals ?? ''}
                            disabled={!canEdit}
                            style={{
                              width: '34px', textAlign: 'center', padding: '4px 2px',
                              fontSize: '13px', borderRadius: '8px',
                              border: '1.5px solid #e0e0e0',
                              fontWeight: '700', color: '#333',
                              backgroundColor: !canEdit ? '#f5f5f5' : '#fff'
                            }}
                            placeholder="-"
                          />
                          <span style={{ fontSize: '12px', color: '#ccc', fontWeight: '700' }}>-</span>
                          <input
                            id={`bet-${player._id}-${match._id}-team2`}
                            type="number" min="0" max="20"
                            defaultValue={bet?.prediction?.team2Goals ?? ''}
                            disabled={!canEdit}
                            style={{
                              width: '34px', textAlign: 'center', padding: '4px 2px',
                              fontSize: '13px', borderRadius: '8px',
                              border: '1.5px solid #e0e0e0',
                              fontWeight: '700', color: '#333',
                              backgroundColor: !canEdit ? '#f5f5f5' : '#fff'
                            }}
                            placeholder="-"
                          />

                          <button
                            onClick={async () => {
                              const t1 = document.getElementById(`bet-${player._id}-${match._id}-team1`);
                              const t2 = document.getElementById(`bet-${player._id}-${match._id}-team2`);
                              const success = await saveBet(player._id, match._id, t1.value, t2.value);
                              if (success) {
                                t1.style.backgroundColor = '#dcfce7';
                                t2.style.backgroundColor = '#dcfce7';
                                setTimeout(() => { t1.style.backgroundColor = ''; t2.style.backgroundColor = ''; }, 1000);
                              }
                            }}
                            disabled={!canEdit || isSaving}
                            style={{
                              padding: '4px 8px',
                              background: !canEdit ? '#e0e0e0' :
                                (isCurrentUserAdmin && weekStatus?.type === 'admin-override')
                                  ? 'linear-gradient(135deg, #ffc107, #ffb300)'
                                  : 'linear-gradient(135deg, #007bff, #0056d2)',
                              color: 'white', border: 'none', borderRadius: '6px',
                              fontSize: '10px', fontWeight: '700',
                              cursor: !canEdit ? 'not-allowed' : 'pointer',
                              minWidth: '36px'
                            }}
                          >
                            {isSaving ? '...' : !canEdit ? '🔒' :
                              (isCurrentUserAdmin && weekStatus?.type === 'admin-override') ? '👑' : '💾'}
                          </button>

                          {badge && (
                            <span style={{
                              padding: '2px 6px', borderRadius: '10px',
                              fontSize: '9px', fontWeight: '800',
                              backgroundColor: badge.bg, color: badge.color,
                              border: `1px solid ${badge.border}`,
                              whiteSpace: 'nowrap', minWidth: '42px', textAlign: 'center'
                            }}>
                              {badge.text}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default BetsManagement;
