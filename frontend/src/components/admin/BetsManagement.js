import React from 'react';

function BetsManagement({ selectedWeek, matches, allBets, users, loadWeekData, user }) {
  
  const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:5000/api'
    : 'https://football-betting-backend.onrender.com/api';
  
  const saveBet = async (playerId, matchId, team1Goals, team2Goals) => {
    try {
      // 🆕 בדיקה מוקדמת - רק אזהרה לאדמין, לא חסימה
      if (!selectedWeek) {
        alert('שגיאה: אין שבוע נבחר');
        return false;
      }

      // 🆕 האדמין מקבל אזהרה אבל יכול להמשיך
      const isCurrentUserAdmin = user && user.role === 'admin';
      
      if (selectedWeek.locked || (selectedWeek.lockTime && new Date() >= new Date(selectedWeek.lockTime))) {
        if (isCurrentUserAdmin) {
          const playerName = users.find(u => u._id === playerId)?.name || 'משתמש לא ידוע';
          const confirmMessage = '👑 אתה מתחבר כאדמין!\n\n' +
            `השבוע נעול לשחקנים רגילים, אבל אתה יכול לערוך הימור של ${playerName}.\n` +
            'האם אתה בטוח שרצית להמשיך?';
          
          if (!window.confirm(confirmMessage)) {
            return false;
          }
          
          console.log('👑 Admin override: Allowing bet edit in locked week for player:', playerName);
        } else {
          // זה לא אמור לקרות, אבל ביטחון כפול
          alert('🔒 השבוע נעול - לא ניתן לערוך הימורים');
          return false;
        }
      }

      const betData = {
        userId: playerId,
        matchId: matchId,
        weekId: selectedWeek._id,
        team1Goals: parseInt(team1Goals) || 0,
        team2Goals: parseInt(team2Goals) || 0
      };

      console.log('💾 שומר הימור:', betData);

      const response = await fetch(`${API_URL}/bets`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Requested-By-User-Id': user.id  // 🆕 שלח את ה-admin ID ב-header
        },
        body: JSON.stringify(betData)
      });

      if (response.ok) {
        console.log('✅ הימור נשמר בהצלחה');
        await loadWeekData(selectedWeek._id);
        return true;
      } else {
        const errorData = await response.json();
        console.error('❌ שגיאה בשמירת הימור:', response.status, errorData);
        
        // הודעות שגיאה ברורות יותר
        if (response.status === 400) {
          if (errorData.message.includes('locked')) {
            alert('🔒 השבוע נעול - לא ניתן להמר יותר');
          } else if (errorData.message.includes('expired')) {
            alert('⏰ זמן ההימורים הסתיים');
          } else if (errorData.message.includes('not active')) {
            alert('❌ השבוע לא פעיל');
          } else {
            alert('שגיאה בשמירת ההימור: ' + errorData.message);
          }
        } else {
          alert('שגיאה בשמירת ההימור - קוד שגיאה: ' + response.status);
        }
        return false;
      }
    } catch (error) {
      console.error('❌ שגיאת רשת:', error);
      alert('שגיאה ברשת - בדוק את החיבור לאינטרנט');
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

  // 🆕 פונקציה לבדיקה אם יש להציג אזהרת נעילה
  const getWeekStatusForAdmin = () => {
    if (!selectedWeek) return null;
    
    const isLocked = selectedWeek.locked || (selectedWeek.lockTime && new Date() >= new Date(selectedWeek.lockTime));
    const isCurrentUserAdmin = user && user.role === 'admin';
    
    if (isLocked && isCurrentUserAdmin) {
      return {
        type: 'admin-override',
        message: '👑 מצב אדמין: השבוע נעול לשחקנים אבל אתה יכול לערוך'
      };
    } else if (isLocked) {
      return {
        type: 'locked',
        message: '🔒 השבוע נעול - ניתן לצפות בהימורים אבל לא לערוך'
      };
    }
    
    return {
      type: 'active',
      message: '✅ ניתן לערוך הימורים'
    };
  };

  if (!selectedWeek) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
        <h2>יש לבחור שבוע לעריכת הימורים</h2>
        <p style={{ color: '#666' }}>בחר שבוע מהרשימה למעלה כדי לערוך הימורים</p>
      </div>
    );
  }

  const weekStatus = getWeekStatusForAdmin();
  
  return (
    <div className="card">
      <h2>עריכת הימורים - {selectedWeek.name}</h2>
      
      {/* כפתורי פקודה משופרים */}
      <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <button 
          onClick={async () => {
            console.log('🔄 רענון נתונים - מתחיל...');
            await loadWeekData(selectedWeek._id);
            console.log('🔄 רענון נתונים - הושלם');
          }}
          className="btn"
          style={{ backgroundColor: '#28a745', color: 'white' }}
        >
          🔄 רענן נתונים
        </button>
        
        <button 
          onClick={async () => {
            try {
              console.log('🧮 מחשב ניקוד מחדש לשבוע:', selectedWeek._id);
              const response = await fetch(`${API_URL}/scores/calculate/${selectedWeek._id}`, {
                method: 'POST'
              });
              
              if (response.ok) {
                console.log('✅ חישוב ניקוד הושלם בהצלחה');
                await loadWeekData(selectedWeek._id);
                alert('✅ ניקוד חושב מחדש בהצלחה!');
              } else {
                console.error('❌ שגיאה בחישוב ניקוד:', response.status);
                alert('❌ שגיאה בחישוב ניקוד');
              }
            } catch (error) {
              console.error('❌ שגיאה בחישוב ניקוד:', error);
              alert('❌ שגיאה בחישוב ניקוד');
            }
          }}
          className="btn"
          style={{ backgroundColor: '#ffc107', color: 'white' }}
        >
          🧮 חשב ניקוד מחדש
        </button>

        <button 
          onClick={() => {
            console.log('=== 🔍 פרטי שבוע ===');
            console.log('שבוע:', selectedWeek);
            console.log('משחקים:', matches);
            console.log('הימורים:', allBets);
            console.log('משתמשים:', users);
            console.log('נעול:', selectedWeek?.locked);
            console.log('זמן נעילה:', selectedWeek?.lockTime);
            if (selectedWeek?.lockTime) {
              console.log('זמן נעילה מפורמט:', new Date(selectedWeek.lockTime).toLocaleString('he-IL'));
            }
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

      {/* 🆕 הודעת סטטוס השבוע - מותאמת לאדמין */}
      {weekStatus && (
        <div style={{ 
          marginBottom: '1rem', 
          padding: '1rem', 
          borderRadius: '8px',
          backgroundColor: 
            weekStatus.type === 'admin-override' ? '#fff3cd' :
            weekStatus.type === 'locked' ? '#f8d7da' : '#d4edda',
          color: 
            weekStatus.type === 'admin-override' ? '#856404' :
            weekStatus.type === 'locked' ? '#721c24' : '#155724'
        }}>
          {weekStatus.message}
        </div>
      )}
      
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
                        תוצאה: {match.result.team1Goals}-{match.result.team2Goals}
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
                      
                      // 🆕 האדמין יכול תמיד לערוך
                      const isCurrentUserAdmin = user && user.role === 'admin';
                      const canEdit = isCurrentUserAdmin || weekStatus?.type === 'active';
                      
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
                                disabled={!canEdit}
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
                                disabled={!canEdit}
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
                                }
                              }}
                              disabled={!canEdit}
                              style={{ 
                                fontSize: '10px', 
                                padding: '4px 8px',
                                backgroundColor: !canEdit ? '#6c757d' : 
                                  (isCurrentUserAdmin && weekStatus?.type === 'admin-override') ? '#ffc107' : '#007bff',
                                color: 'white',
                                border: 'none',
                                borderRadius: '3px',
                                cursor: !canEdit ? 'not-allowed' : 'pointer'
                              }}
                            >
                              {!canEdit ? 'נעול' : 
                               (isCurrentUserAdmin && weekStatus?.type === 'admin-override') ? '👑 שמור' : 'שמור'}
                            </button>
                          </div>
                          
                          {/* הצגת ניקוד עם אפשרות לחיצה לפרטים */}
                          {bet && match.result && match.result.team1Goals !== undefined && (
                            <div style={{ fontSize: '11px', marginTop: '4px' }}>
                              <div style={{ fontSize: '10px', color: '#666', marginBottom: '2px' }}>
                                הימור: {bet.prediction.team1Goals}-{bet.prediction.team2Goals}
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
                                  console.log('=== 🎯 פרטי הימור ===');
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