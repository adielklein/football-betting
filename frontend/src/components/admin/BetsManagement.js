import React from 'react';

function BetsManagement({ selectedWeek, matches, allBets, users, loadWeekData }) {
  
  const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:5000/api'
    : 'https://football-betting-backend.onrender.com/api';
  
  const saveBet = async (playerId, matchId, team1Goals, team2Goals) => {
    try {
      const betData = {
        userId: playerId,
        matchId: matchId,
        weekId: selectedWeek._id,
        team1Goals: parseInt(team1Goals) || 0,
        team2Goals: parseInt(team2Goals) || 0
      };

      console.log('שומר הימור:', betData);

      const response = await fetch(`${API_URL}/bets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(betData)
      });

      if (response.ok) {
        await loadWeekData(selectedWeek._id);
        return true;
      } else {
        console.error('שגיאה בשמירת הימור:', response.status);
        return false;
      }
    } catch (error) {
      console.error('שגיאה:', error);
      return false;
    }
  };

  const getLeagueName = (league) => {
    const names = {
      'english': 'פרמייר ליג',
      'spanish': 'לה ליגה',
      'world': 'ליגת העל'
    };
    return names[league] || league;
  };

  if (!selectedWeek) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
        <h2>יש לבחור שבוע לעריכת הימורים</h2>
        <p style={{ color: '#666' }}>בחר שבוע מהרשימה למעלה כדי לערוך הימורים</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2>עריכת הימורים - {selectedWeek.name}</h2>
      
      {/* כפתורי פקודה משופרים */}
      <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <button 
          onClick={async () => {
            console.log('רענון נתונים - מתחיל...');
            await loadWeekData(selectedWeek._id);
            console.log('רענון נתונים - הושלם');
          }}
          className="btn"
          style={{ backgroundColor: '#28a745', color: 'white' }}
        >
          🔄 רענן נתונים
        </button>
        
        <button 
          onClick={async () => {
            try {
              console.log('מחשב ניקוד מחדש לשבוע:', selectedWeek._id);
              const response = await fetch(`${API_URL}/scores/calculate/${selectedWeek._id}`, {
                method: 'POST'
              });
              
              if (response.ok) {
                console.log('חישוב ניקוד הושלם בהצלחה');
                await loadWeekData(selectedWeek._id);
                alert('ניקוד חושב מחדש בהצלחה!');
              } else {
                console.error('שגיאה בחישוב ניקוד:', response.status);
                alert('שגיאה בחישוב ניקוד');
              }
            } catch (error) {
              console.error('שגיאה בחישוב ניקוד:', error);
              alert('שגיאה בחישוב ניקוד');
            }
          }}
          className="btn"
          style={{ backgroundColor: '#ffc107', color: 'white' }}
        >
          🧮 חשב ניקוד מחדש
        </button>

        <button 
          onClick={() => {
            console.log('=== פרטי שבוע ===');
            console.log('שבוע:', selectedWeek);
            console.log('משחקים:', matches);
            console.log('הימורים:', allBets);
            console.log('משתמשים:', users);
          }}
          className="btn"
          style={{ backgroundColor: '#6c757d', color: 'white' }}
        >
          🔍 הצג נתונים בקונסול
        </button>
        
        <div style={{ fontSize: '14px', padding: '8px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
          משחקים: {matches.length} | הימורים: {allBets.length} | שחקנים: {users.filter(u => u.role !== 'admin').length}
        </div>
      </div>
      
      {matches.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#666', padding: '2rem' }}>
          אין משחקים בשבוע זה. יש להוסיף משחקים תחילה.
        </p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: '800px', border: '1px solid #ddd' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa' }}>
                <th style={{ padding: '12px', textAlign: 'right', borderRight: '1px solid #ddd' }}>שחקן</th>
                {matches.map((match) => (
                  <th key={match._id} style={{ 
                    padding: '12px', 
                    textAlign: 'center', 
                    minWidth: '140px',
                    borderRight: '1px solid #ddd',
                    fontSize: '12px'
                  }}>
                    <div style={{ marginBottom: '4px', fontWeight: 'bold' }}>
                      {match.team1} נגד {match.team2}
                    </div>
                    <div style={{ fontSize: '10px', color: '#666' }}>
                      {getLeagueName(match.league)} • {match.date} {match.time}
                    </div>
                    {match.result && match.result.team1Goals !== undefined && (
                      <div style={{ 
                        marginTop: '4px', 
                        padding: '2px 6px',
                        backgroundColor: '#d4edda',
                        color: '#155724',
                        borderRadius: '3px',
                        fontSize: '11px',
                        fontWeight: 'bold'
                      }}>
                        תוצאה: {match.result.team2Goals}-{match.result.team1Goals}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.filter(u => u && u.role !== 'admin').map(player => {
                const playerBets = allBets.filter(bet => bet && bet.userId && bet.userId._id === player._id);
                
                return (
                  <tr key={player._id} style={{ borderBottom: '1px solid #ddd' }}>
                    <td style={{ 
                      padding: '12px', 
                      fontWeight: '500',
                      backgroundColor: '#f8f9fa',
                      borderRight: '1px solid #ddd'
                    }}>
                      {player.name}
                    </td>
                    {matches.map(match => {
                      const bet = playerBets.find(b => b && b.matchId && b.matchId._id === match._id);
                      
                      return (
                        <td key={match._id} style={{ 
                          padding: '12px', 
                          textAlign: 'center',
                          borderRight: '1px solid #ddd'
                        }}>
                          <div style={{ marginBottom: '8px' }}>
                            <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', marginBottom: '6px', direction: 'rtl' }}>
                              <input
                                id={`bet-${player._id}-${match._id}-team1`}
                                type="number"
                                min="0"
                                max="20"
                                defaultValue={bet?.prediction?.team1Goals || ''}
                                style={{ 
                                  width: '35px', 
                                  textAlign: 'center', 
                                  padding: '4px',
                                  fontSize: '12px'
                                }}
                                placeholder="0"
                              />
                              <span style={{ margin: '0 4px', fontSize: '14px' }}>-</span>
                              <input
                                id={`bet-${player._id}-${match._id}-team2`}
                                type="number"
                                min="0"
                                max="20"
                                defaultValue={bet?.prediction?.team2Goals || ''}
                                style={{ 
                                  width: '35px', 
                                  textAlign: 'center', 
                                  padding: '4px',
                                  fontSize: '12px'
                                }}
                                placeholder="0"
                              />
                            </div>
                            <div style={{ fontSize: '9px', color: '#666', marginBottom: '4px' }}>
                              {match.team1} - {match.team2}
                            </div>
                            
                            <button
                              onClick={async () => {
                                const team1Input = document.getElementById(`bet-${player._id}-${match._id}-team1`);
                                const team2Input = document.getElementById(`bet-${player._id}-${match._id}-team2`);
                                
                                const success = await saveBet(
                                  player._id, 
                                  match._id, 
                                  team1Input.value, 
                                  team2Input.value
                                );
                                
                                if (success) {
                                  team1Input.style.backgroundColor = '#d4edda';
                                  team2Input.style.backgroundColor = '#d4edda';
                                  setTimeout(() => {
                                    team1Input.style.backgroundColor = '';
                                    team2Input.style.backgroundColor = '';
                                  }, 1000);
                                } else {
                                  alert('שגיאה בשמירת הימור');
                                }
                              }}
                              style={{ 
                                fontSize: '10px', 
                                padding: '4px 8px',
                                backgroundColor: '#007bff',
                                color: 'white',
                                border: 'none',
                                borderRadius: '3px',
                                cursor: 'pointer'
                              }}
                            >
                              שמור
                            </button>
                          </div>
                          
                          {/* הצגת ניקוד עם אפשרות לחיצה לפרטים */}
                          {bet && match.result && match.result.team1Goals !== undefined && (
                            <div style={{ fontSize: '11px', marginTop: '4px' }}>
                              <div style={{ fontSize: '10px', color: '#666', marginBottom: '2px' }}>
                                הימור: {bet.prediction.team2Goals}-{bet.prediction.team1Goals}
                              </div>
                              <span 
                                style={{
                                  padding: '3px 6px',
                                  borderRadius: '3px',
                                  fontSize: '10px',
                                  fontWeight: 'bold',
                                  backgroundColor: bet.points === 3 ? '#d4edda' : bet.points === 1 ? '#cce5ff' : '#f8d7da',
                                  color: bet.points === 3 ? '#155724' : bet.points === 1 ? '#0066cc' : '#721c24',
                                  cursor: 'pointer'
                                }}
                                onClick={() => {
                                  console.log('=== פרטי הימור ===');
                                  console.log('שחקן:', player.name);
                                  console.log('משחק:', `${match.team1} נגד ${match.team2}`);
                                  console.log('הימור שחקן:', `${bet.prediction.team1Goals}-${bet.prediction.team2Goals}`);
                                  console.log('תוצאה אמיתית:', `${match.result.team1Goals}-${match.result.team2Goals}`);
                                  console.log('נקודות שקיבל:', bet.points);
                                  console.log('ID הימור:', bet._id);
                                  console.log('פרטי הימור מלא:', bet);
                                  console.log('פרטי משחק מלא:', match);
                                }}
                                title="לחץ לפרטים בקונסול"
                              >
                                {bet.points === 3 ? 'מדויק 3 נק' : bet.points === 1 ? 'תוצאה 1 נק' : 'שגוי 0 נק'}
                              </span>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default BetsManagement;