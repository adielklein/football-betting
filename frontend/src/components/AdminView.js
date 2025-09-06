import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

function AdminView({ user, onLogout }) {
  const [weeks, setWeeks] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [matches, setMatches] = useState([]);
  const [allBets, setAllBets] = useState([]);
  const [users, setUsers] = useState([]);
  const [newMatch, setNewMatch] = useState({
    league: 'english',
    team1: '',
    team2: '',
    date: '',
    time: ''
  });
  const [activeTab, setActiveTab] = useState('weeks');
  const [newUser, setNewUser] = useState({ name: '', email: '', role: 'player' });
  const [editingUser, setEditingUser] = useState(null);
  const [newWeekName, setNewWeekName] = useState('');
  const [editingWeek, setEditingWeek] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingMatch, setEditingMatch] = useState({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [weeksData, usersData] = await Promise.all([
        api.getWeeks(),
        api.getUsers()
      ]);
      
      setWeeks(Array.isArray(weeksData) ? weeksData.filter(w => w && w._id) : []);
      setUsers(Array.isArray(usersData) ? usersData.filter(u => u && u._id) : []);
      
      if (weeksData && weeksData.length > 0) {
        const activeWeek = weeksData.find(w => w && w.active) || weeksData[0];
        if (activeWeek && activeWeek._id) {
          setSelectedWeek(activeWeek);
          await loadWeekData(activeWeek._id);
        }
      }
    } catch (error) {
      console.error('שגיאה בטעינת נתונים:', error);
      setWeeks([]);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const loadWeekData = async (weekId) => {
    if (!weekId) return;
    
    try {
      const [matchesData, betsResponse] = await Promise.all([
        api.getMatches(weekId),
        fetch(`http://localhost:5000/api/bets/week/${weekId}`)
      ]);
      
      const betsData = await betsResponse.json();
      
      setMatches(Array.isArray(matchesData) ? matchesData : []);
      setAllBets(Array.isArray(betsData) ? betsData : []);
    } catch (error) {
      console.error('שגיאה בטעינת נתוני שבוע:', error);
      setMatches([]);
      setAllBets([]);
    }
  };

  // User Management Functions
  const handleAddUser = async () => {
    if (!newUser.name || !newUser.email) {
      alert('יש למלא שם ואימייל');
      return;
    }

    try {
      await api.registerUser(newUser);
      setNewUser({ name: '', email: '', role: 'player' });
      await loadData();
      alert('משתמש חדש נוסף בהצלחה!');
    } catch (error) {
      console.error('שגיאה בהוספת משתמש:', error);
      alert('שגיאה בהוספת המשתמש');
    }
  };

  const handleEditUser = async (userId, userData) => {
    if (!userId || !userData) return;
    
    try {
      await api.updateUser(userId, userData);
      setEditingUser(null);
      await loadData();
      alert('משתמש עודכן בהצלחה!');
    } catch (error) {
      console.error('שגיאה בעדכון משתמש:', error);
      alert('שגיאה בעדכון המשתמש');
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (!userId || !userName) return;
    
    if (window.confirm(`האם אתה בטוח שברצונך למחוק את ${userName}?`)) {
      try {
        await api.deleteUser(userId);
        await loadData();
        alert('משתמש נמחק בהצלחה!');
      } catch (error) {
        console.error('שגיאה במחיקת משתמש:', error);
        alert('שגיאה במחיקת המשתמש');
      }
    }
  };

  // Week Management Functions
  const createNewWeek = async () => {
    const weekName = newWeekName.trim() || `Week ${weeks.length + 1}`;
    try {
      await api.createWeek({
        name: weekName,
        month: Math.ceil((weeks.length + 1) / 4)
      });
      setNewWeekName('');
      await loadData();
      alert('שבוע חדש נוצר!');
    } catch (error) {
      console.error('שגיאה ביצירת שבוע:', error);
      alert('שגיאה ביצירת השבוע');
    }
  };

  const handleEditWeek = async (weekId, newName) => {
    if (!weekId || !newName || !newName.trim()) {
      alert('יש להכניס שם תקין לשבוע');
      return;
    }
    
    try {
      const cleanWeekId = String(weekId).replace(/[^a-fA-F0-9]/g, '').substring(0, 24);
      
      if (cleanWeekId.length !== 24) {
        throw new Error('מזהה שבוע לא תקין');
      }
      
      await api.updateWeek(cleanWeekId, { name: newName.trim() });
      setEditingWeek(null);
      
      if (selectedWeek && selectedWeek._id === weekId) {
        setSelectedWeek(prev => ({ ...prev, name: newName.trim() }));
      }
      
      await loadData();
      alert('שם השבוע עודכן בהצלחה!');
    } catch (error) {
      console.error('שגיאה בעדכון שבוע:', error);
      alert('שגיאה בעדכון שם השבוע');
    }
  };

  const handleDeleteWeek = async (weekId, weekName) => {
    if (!weekId || !weekName) return;
    
    if (window.confirm(`האם אתה בטוח שברצונך למחוק את ${weekName}?`)) {
      try {
        await api.deleteWeek(weekId);
        setSelectedWeek(null);
        setMatches([]);
        setAllBets([]);
        await loadData();
        alert('שבוע נמחק בהצלחה!');
      } catch (error) {
        console.error('שגיאה במחיקת שבוע:', error);
        alert('שגיאה במחיקת השבוע');
      }
    }
  };

  const activateWeek = async () => {
    if (!selectedWeek || !selectedWeek._id || matches.length === 0) {
      alert('יש להוסיף משחקים לפני הפעלת השבוע');
      return;
    }

    try {
      const firstMatch = matches[0];
      if (!firstMatch || !firstMatch.date || !firstMatch.time) {
        alert('פרטי המשחק הראשון חסרים');
        return;
      }

      const [day, month] = firstMatch.date.split('.');
      const [hour, minute] = firstMatch.time.split(':');
      const lockTime = new Date(2024, parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute));

      await fetch(`http://localhost:5000/api/weeks/${selectedWeek._id}/activate`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lockTime: lockTime.toISOString() })
      });

      alert('השבוע הופעל בהצלחה!');
      await loadData();
    } catch (error) {
      console.error('שגיאה בהפעלת שבוע:', error);
      alert('שגיאה בהפעלת השבוע');
    }
  };

  // Match Management Functions
  const addMatch = async () => {
    if (!selectedWeek || !selectedWeek._id) {
      alert('יש לבחור שבוע קודם');
      return;
    }

    if (!newMatch.team1 || !newMatch.team2 || !newMatch.date || !newMatch.time) {
      alert('יש למלא את כל השדות');
      return;
    }

    try {
      await fetch('http://localhost:5000/api/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newMatch,
          weekId: selectedWeek._id
        })
      });

      setNewMatch({ league: 'english', team1: '', team2: '', date: '', time: '' });
      await loadWeekData(selectedWeek._id);
      alert('משחק נוסף בהצלחה!');
    } catch (error) {
      console.error('שגיאה בהוספת משחק:', error);
      alert('שגיאה בהוספת המשחק');
    }
  };

  const updateMatchResult = async (matchId, team1Goals, team2Goals) => {
    if (!matchId) return;
    
    try {
      const matchResponse = await fetch(`http://localhost:5000/api/matches/${matchId}/result`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          team1Goals: parseInt(team1Goals) || 0, 
          team2Goals: parseInt(team2Goals) || 0 
        })
      });

      if (!matchResponse.ok) {
        throw new Error(`שגיאה בעדכון משחק: ${matchResponse.status}`);
      }

      const scoresResponse = await fetch(`http://localhost:5000/api/scores/calculate/${selectedWeek._id}`, {
        method: 'POST'
      });

      if (!scoresResponse.ok) {
        throw new Error(`שגיאה בחישוב ניקוד: ${scoresResponse.status}`);
      }

      await loadWeekData(selectedWeek._id);
      setEditingMatch({});
      alert('תוצאה נשמרה וניקוד חושב מחדש!');
    } catch (error) {
      console.error('שגיאה בעדכון תוצאה:', error);
      alert('שגיאה בעדכון התוצאה');
    }
  };

  // Bet Management Functions
  const saveBet = async (playerId, matchId, team1Goals, team2Goals) => {
    try {
      const betData = {
        userId: playerId,
        matchId: matchId,
        weekId: selectedWeek._id,
        team1Goals: parseInt(team1Goals) || 0,
        team2Goals: parseInt(team2Goals) || 0
      };

      const response = await fetch('http://localhost:5000/api/bets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(betData)
      });

      if (response.ok) {
        await loadWeekData(selectedWeek._id);
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error('שגיאה:', error);
      return false;
    }
  };

  const getLeagueColor = (league) => {
    const colors = {
      'english': '#dc3545',
      'spanish': '#007bff',
      'world': '#6f42c1'
    };
    return colors[league] || '#6c757d';
  };

  const getLeagueName = (league) => {
    const names = {
      'english': 'פרמייר ליג',
      'spanish': 'לה ליגה',
      'world': 'ליגת העל'
    };
    return names[league] || league;
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>טוען נתונים...</h2>
      </div>
    );
  }

  return (
    <div>
      <div className="header">
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1>פאנל ניהול - {user?.name || 'משתמש'}</h1>
              <p style={{ color: '#fff', opacity: 0.9 }}>ניהול משחקים ושחקנים</p>
            </div>
            <button onClick={onLogout} className="btn" style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' }}>
              יציאה
            </button>
          </div>
        </div>
      </div>

      <div className="container">
        {/* Navigation Tabs */}
        <div style={{ 
          display: 'flex', 
          gap: '1rem', 
          marginBottom: '2rem',
          borderBottom: '1px solid #ddd',
          paddingBottom: '1rem'
        }}>
          <button 
            onClick={() => setActiveTab('weeks')}
            className="btn"
            style={{ 
              backgroundColor: activeTab === 'weeks' ? '#007bff' : '#f8f9fa', 
              color: activeTab === 'weeks' ? 'white' : '#333' 
            }}
          >
            ניהול שבועות
          </button>
          <button 
            onClick={() => setActiveTab('users')}
            className="btn"
            style={{ 
              backgroundColor: activeTab === 'users' ? '#007bff' : '#f8f9fa', 
              color: activeTab === 'users' ? 'white' : '#333' 
            }}
          >
            ניהול משתמשים
          </button>
          <button 
            onClick={() => setActiveTab('bets')}
            className="btn"
            style={{ 
              backgroundColor: activeTab === 'bets' ? '#007bff' : '#f8f9fa', 
              color: activeTab === 'bets' ? 'white' : '#333' 
            }}
          >
            עריכת הימורים
          </button>
        </div>

        {/* Users Management Tab */}
        {activeTab === 'users' && (
          <>
            <div className="card">
              <h2>הוסף משתמש חדש</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto auto', gap: '1rem', alignItems: 'end' }}>
                <input
                  type="text"
                  placeholder="שם מלא"
                  value={newUser.name}
                  onChange={(e) => setNewUser(prev => ({ ...prev, name: e.target.value }))}
                  className="input"
                />
                <input
                  type="email"
                  placeholder="אימייל"
                  value={newUser.email}
                  onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                  className="input"
                />
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser(prev => ({ ...prev, role: e.target.value }))}
                  className="input"
                >
                  <option value="player">שחקן</option>
                  <option value="admin">מנהל</option>
                </select>
                <button onClick={handleAddUser} className="btn btn-success">
                  הוסף
                </button>
              </div>
            </div>

            <div className="card">
              <h2>רשימת משתמשים ({users.length})</h2>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8f9fa' }}>
                      <th style={{ padding: '12px', textAlign: 'right' }}>שם</th>
                      <th style={{ padding: '12px', textAlign: 'right' }}>אימייל</th>
                      <th style={{ padding: '12px', textAlign: 'right' }}>תפקיד</th>
                      <th style={{ padding: '12px', textAlign: 'right' }}>פעולות</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(userItem => {
                      if (!userItem || !userItem._id) return null;
                      
                      return (
                        <tr key={userItem._id}>
                          <td style={{ padding: '12px' }}>
                            {editingUser === userItem._id ? (
                              <input
                                type="text"
                                defaultValue={userItem.name || ''}
                                onBlur={(e) => handleEditUser(userItem._id, { 
                                  name: e.target.value, 
                                  email: userItem.email, 
                                  role: userItem.role 
                                })}
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter') e.target.blur();
                                }}
                                className="input"
                                style={{ width: '100%' }}
                                autoFocus
                              />
                            ) : (
                              <span style={{ fontWeight: '500' }}>{userItem.name || 'ללא שם'}</span>
                            )}
                          </td>
                          <td style={{ padding: '12px' }}>{userItem.email || 'ללא אימייל'}</td>
                          <td style={{ padding: '12px' }}>
                            <span style={{
                              padding: '4px 8px',
                              backgroundColor: userItem.role === 'admin' ? '#dc3545' : '#28a745',
                              color: 'white',
                              borderRadius: '4px',
                              fontSize: '12px'
                            }}>
                              {userItem.role === 'admin' ? 'מנהל' : 'שחקן'}
                            </span>
                          </td>
                          <td style={{ padding: '12px' }}>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button
                                onClick={() => setEditingUser(editingUser === userItem._id ? null : userItem._id)}
                                className="btn"
                                style={{ fontSize: '12px', padding: '4px 8px', backgroundColor: '#ffc107', color: 'white' }}
                              >
                                ערוך
                              </button>
                              {userItem._id !== user?.id && (
                                <button
                                  onClick={() => handleDeleteUser(userItem._id, userItem.name)}
                                  className="btn"
                                  style={{ fontSize: '12px', padding: '4px 8px', backgroundColor: '#dc3545', color: 'white' }}
                                >
                                  מחק
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Bets Management Tab */}
        {activeTab === 'bets' && selectedWeek && (
          <div className="card">
            <h2>עריכת הימורים - {selectedWeek.name}</h2>
            
            <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem' }}>
              <button 
                onClick={() => loadWeekData(selectedWeek._id)}
                className="btn"
                style={{ backgroundColor: '#28a745', color: 'white' }}
              >
                רענן נתונים
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
                                        alert('שגיאה בשמירת ההימור');
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
                                
                                {/* הצגת ניקוד */}
                                {bet && match.result && match.result.team1Goals !== undefined && (
                                  <div style={{ fontSize: '11px', marginTop: '4px' }}>
                                    <div style={{ fontSize: '10px', color: '#666', marginBottom: '2px' }}>
                                      הימור: {bet.prediction.team1Goals}-{bet.prediction.team2Goals}
                                    </div>
                                    <span style={{
                                      padding: '3px 6px',
                                      borderRadius: '3px',
                                      fontSize: '10px',
                                      fontWeight: 'bold',
                                      backgroundColor: bet.points === 3 ? '#d4edda' : bet.points === 1 ? '#cce5ff' : '#f8d7da',
                                      color: bet.points === 3 ? '#155724' : bet.points === 1 ? '#0066cc' : '#721c24'
                                    }}>
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
        )}

        {/* Weeks Management Tab */}
        {activeTab === 'weeks' && (
          <>
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2>ניהול שבועות ({weeks.length})</h2>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder="שם השבוע החדש"
                    value={newWeekName}
                    onChange={(e) => setNewWeekName(e.target.value)}
                    className="input"
                    style={{ width: '200px' }}
                  />
                  <button onClick={createNewWeek} className="btn btn-success">
                    שבוע חדש
                  </button>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <select 
                  value={selectedWeek?._id || ''} 
                  onChange={(e) => {
                    const week = weeks.find(w => w && w._id === e.target.value);
                    setSelectedWeek(week || null);
                    if (week && week._id) {
                      loadWeekData(week._id);
                    }
                  }}
                  className="input"
                  style={{ width: '200px' }}
                >
                  <option value="">בחר שבוע</option>
                  {weeks.map(week => {
                    if (!week || !week._id) return null;
                    return (
                      <option key={week._id} value={week._id}>{week.name || 'שבוע ללא שם'}</option>
                    );
                  })}
                </select>

                {selectedWeek && !selectedWeek.active && (
                  <button onClick={activateWeek} className="btn btn-success">
                    הפעל שבוע
                  </button>
                )}

                {selectedWeek && selectedWeek._id && (
                  <>
                    <button
                      onClick={() => setEditingWeek(editingWeek === selectedWeek._id ? null : selectedWeek._id)}
                      className="btn"
                      style={{ backgroundColor: '#ffc107', color: 'white' }}
                    >
                      ערוך שם
                    </button>
                    <button 
                      onClick={() => handleDeleteWeek(selectedWeek._id, selectedWeek.name)}
                      className="btn"
                      style={{ backgroundColor: '#dc3545', color: 'white' }}
                    >
                      מחק שבוע
                    </button>
                  </>
                )}

                {selectedWeek?.active && (
                  <span style={{ 
                    padding: '0.5rem 1rem', 
                    backgroundColor: '#d4edda', 
                    color: '#155724', 
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}>
                    שבוע פעיל
                    {selectedWeek.locked && ' (נעול)'}
                  </span>
                )}
              </div>

              {/* עריכת שם השבוע */}
              {editingWeek === selectedWeek?._id && (
                <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <input
                      type="text"
                      defaultValue={selectedWeek.name}
                      placeholder="שם השבוע החדש"
                      className="input"
                      style={{ width: '200px' }}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleEditWeek(selectedWeek._id, e.target.value);
                        }
                      }}
                      autoFocus
                    />
                    <button
                      onClick={(e) => {
                        const input = e.target.previousElementSibling;
                        handleEditWeek(selectedWeek._id, input.value);
                      }}
                      className="btn btn-success"
                    >
                      שמור
                    </button>
                    <button
                      onClick={() => setEditingWeek(null)}
                      className="btn"
                      style={{ backgroundColor: '#6c757d', color: 'white' }}
                    >
                      ביטול
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* הוספת משחק */}
            {selectedWeek && selectedWeek._id && (
              <div className="card">
                <h2>הוספת משחק ל{selectedWeek.name || 'השבוע'}</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                  <select
                    value={newMatch.league}
                    onChange={(e) => setNewMatch(prev => ({ ...prev, league: e.target.value }))}
                    className="input"
                  >
                    <option value="english">פרמייר ליג</option>
                    <option value="spanish">לה ליגה</option>
                    <option value="world">ליגת העל</option>
                  </select>
                  
                  <input
                    type="text"
                    placeholder="קבוצה בית (team1)"
                    value={newMatch.team1}
                    onChange={(e) => setNewMatch(prev => ({ ...prev, team1: e.target.value }))}
                    className="input"
                  />
                  
                  <input
                    type="text"
                    placeholder="קבוצה חוץ (team2)"
                    value={newMatch.team2}
                    onChange={(e) => setNewMatch(prev => ({ ...prev, team2: e.target.value }))}
                    className="input"
                  />
                  
                  <input
                    type="text"
                    placeholder="תאריך (DD.MM)"
                    value={newMatch.date}
                    onChange={(e) => setNewMatch(prev => ({ ...prev, date: e.target.value }))}
                    className="input"
                  />
                  
                  <input
                    type="time"
                    value={newMatch.time}
                    onChange={(e) => setNewMatch(prev => ({ ...prev, time: e.target.value }))}
                    className="input"
                  />
                  
                  <button onClick={addMatch} className="btn btn-primary">
                    הוסף משחק
                  </button>
                </div>
              </div>
            )}

            {/* רשימת משחקים */}
            {matches.length > 0 && (
              <div className="card">
                <h2>משחקי {selectedWeek?.name || 'השבוע'} ({matches.length})</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {matches.map(match => {
                    if (!match || !match._id) return null;
                    
                    const isEditing = editingMatch[match._id];
                    const currentResult = isEditing || {
                      team1Goals: match.result?.team1Goals || '',
                      team2Goals: match.result?.team2Goals || ''
                    };
                    
                    return (
                      <div key={match._id} style={{ 
                        padding: '1rem', 
                        border: '1px solid #ddd', 
                        borderRadius: '8px',
                        backgroundColor: '#f9f9f9'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                          <div>
                            <span style={{
                              padding: '4px 8px',
                              backgroundColor: getLeagueColor(match.league),
                              color: 'white',
                              borderRadius: '4px',
                              fontSize: '12px',
                              marginRight: '10px'
                            }}>
                              {getLeagueName(match.league)}
                            </span>
                            <strong>{match.team1} נגד {match.team2}</strong>
                          </div>
                          <div style={{ color: '#666', fontSize: '14px' }}>
                            {match.date || 'ללא תאריך'} • {match.time || 'ללא שעה'}
                          </div>
                        </div>

                        {/* הזנת תוצאה - מותאם לסדר עברית */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', justifyContent: 'center', direction: 'rtl' }}>
                          <div style={{ textAlign: 'center', fontWeight: '500' }}>
                            {match.team1}
                          </div>
                          
                          <input
                            type="number"
                            min="0"
                            max="20"
                            value={currentResult.team1Goals}
                            onChange={(e) => {
                              setEditingMatch(prev => ({
                                ...prev,
                                [match._id]: {
                                  ...currentResult,
                                  team1Goals: e.target.value
                                }
                              }));
                            }}
                            style={{ width: '50px', textAlign: 'center' }}
                            className="input"
                            placeholder="0"
                          />
                          
                          <span style={{ fontSize: '18px', fontWeight: 'bold' }}>-</span>
                          
                          <input
                            type="number"
                            min="0"
                            max="20"
                            value={currentResult.team2Goals}
                            onChange={(e) => {
                              setEditingMatch(prev => ({
                                ...prev,
                                [match._id]: {
                                  ...currentResult,
                                  team2Goals: e.target.value
                                }
                              }));
                            }}
                            style={{ width: '50px', textAlign: 'center' }}
                            className="input"
                            placeholder="0"
                          />
                          
                          <div style={{ textAlign: 'center', fontWeight: '500' }}>
                            {match.team2}
                          </div>
                          
                          <div style={{ display: 'flex', gap: '0.5rem', marginLeft: '1rem' }}>
                            {isEditing && (
                              <button
                                onClick={() => updateMatchResult(match._id, currentResult.team1Goals, currentResult.team2Goals)}
                                className="btn btn-success"
                                style={{ fontSize: '12px', padding: '4px 8px' }}
                              >
                                שמור תוצאה
                              </button>
                            )}
                            
                            {match.result?.team1Goals !== undefined && !isEditing && (
                              <span style={{
                                padding: '4px 8px',
                                backgroundColor: '#d4edda',
                                color: '#155724',
                                borderRadius: '4px',
                                fontSize: '12px'
                              }}>
                                ✓ תוצאה: {match.result.team1Goals}-{match.result.team2Goals}
                                <div style={{ fontSize: '10px', marginTop: '2px' }}>
                                  ({match.team1} {match.result.team1Goals} - {match.result.team2Goals} {match.team2})
                                </div>
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div style={{ marginTop: '0.5rem', fontSize: '11px', color: '#666', textAlign: 'center' }}>
                          {match.team1} {currentResult.team1Goals || 0} - {currentResult.team2Goals || 0} {match.team2}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default AdminView;