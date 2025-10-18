import React, { useState, useEffect } from 'react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

function WeeksManagement({ selectedWeek: parentSelectedWeek, onWeekSelect }) {
  const [weeks, setWeeks] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [matches, setMatches] = useState([]);
  const [newWeek, setNewWeek] = useState({ name: '', month: '', season: '2025-26' });
  const [newMatch, setNewMatch] = useState({ leagueId: '', team1: '', team2: '', date: '', time: '' });
  const [editingMatch, setEditingMatch] = useState({});
  const [editingWeek, setEditingWeek] = useState(null);
  const [leagues, setLeagues] = useState([]);
  const [loadingLeagues, setLoadingLeagues] = useState(false);
  const [editingMatchDetails, setEditingMatchDetails] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  // סנכרון עם השבוע הנבחר מהאב
  useEffect(() => {
    if (parentSelectedWeek && parentSelectedWeek._id !== selectedWeek?._id) {
      setSelectedWeek(parentSelectedWeek);
      loadWeekData(parentSelectedWeek._id);
    }
  }, [parentSelectedWeek]);

  const loadData = async () => {
    await loadWeeks();
    await loadLeagues();
  };

  const loadWeeks = async () => {
    try {
      const response = await fetch(`${API_URL}/weeks`);
      if (!response.ok) throw new Error('Failed to fetch weeks');
      
      const data = await response.json();
      setWeeks(data);
    } catch (error) {
      console.error('Error loading weeks:', error);
      alert('שגיאה בטעינת השבועות');
    }
  };

  const loadLeagues = async () => {
    setLoadingLeagues(true);
    try {
      const response = await fetch(`${API_URL}/leagues`);
      if (!response.ok) throw new Error('Failed to fetch leagues');
      
      const data = await response.json();
      setLeagues(data);
      
      if (data.length > 0 && !newMatch.leagueId) {
        setNewMatch(prev => ({ ...prev, leagueId: data[0]._id }));
      }
    } catch (error) {
      console.error('Error loading leagues:', error);
      setLeagues([]);
    } finally {
      setLoadingLeagues(false);
    }
  };

  const loadWeekData = async (weekId) => {
    try {
      const response = await fetch(`${API_URL}/matches/week/${weekId}`);
      if (!response.ok) throw new Error('Failed to fetch matches');
      
      const data = await response.json();
      setMatches(data);
      
      const initEditingState = {};
      data.forEach(match => {
        if (match.result) {
          initEditingState[match._id] = {
            team1Goals: match.result.team1Goals?.toString() || '',
            team2Goals: match.result.team2Goals?.toString() || ''
          };
        }
      });
      setEditingMatch(initEditingState);
    } catch (error) {
      console.error('Error loading matches:', error);
      setMatches([]);
    }
  };

  const handleSelectWeek = async (weekId) => {
    const week = weeks.find(w => w._id === weekId);
    setSelectedWeek(week);
    
    // עדכון גם את השבוע באב
    if (onWeekSelect) {
      onWeekSelect(week);
    }
    
    if (weekId) {
      await loadWeekData(weekId);
    } else {
      setMatches([]);
    }
  };

  const handleEditWeek = async (weekId, name, month, season) => {
    if (!name || !name.trim()) {
      alert('שם השבוע חובה');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/weeks/${weekId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: name.trim(), 
          month: parseInt(month),
          season: season || '2025-26'
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update week');
      }

      const updatedWeek = await response.json();
      
      setWeeks(prevWeeks => 
        prevWeeks.map(w => w._id === weekId ? updatedWeek : w)
      );
      
      if (selectedWeek && selectedWeek._id === weekId) {
        setSelectedWeek(updatedWeek);
        if (onWeekSelect) {
          onWeekSelect(updatedWeek);
        }
      }
      
      setEditingWeek(null);
      alert('השבוע עודכן בהצלחה!');
    } catch (error) {
      console.error('Error updating week:', error);
      alert('שגיאה בעדכון השבוע: ' + error.message);
    }
  };

  const createWeek = async () => {
    if (!newWeek.name) {
      alert('יש להזין שם לשבוע');
      return;
    }
    if (!newWeek.month) {
      alert('יש לבחור חודש');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/weeks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newWeek)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create week');
      }

      setNewWeek({ name: '', month: '', season: '2025-26' });
      await loadWeeks();
      alert('שבוע חדש נוצר בהצלחה!');
    } catch (error) {
      console.error('Error creating week:', error);
      alert('שגיאה ביצירת השבוע: ' + error.message);
    }
  };

  const deactivateWeek = async () => {
    if (!selectedWeek || !selectedWeek._id) {
      alert('יש לבחור שבוע קודם');
      return;
    }

    if (window.confirm(`האם אתה בטוח שברצונך לכבות את "${selectedWeek.name}"?`)) {
      try {
        const response = await fetch(`${API_URL}/weeks/${selectedWeek._id}/deactivate`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Failed to deactivate week');
        }

        alert('השבוע כובה בהצלחה. עכשיו אתה יכול לערוך אותו.');
        await loadData();
      } catch (error) {
        console.error('שגיאה בכיבוי שבוע:', error);
        alert('שגיאה בכיבוי השבוע: ' + error.message);
      }
    }
  };

  const deleteWeek = async () => {
    if (!selectedWeek || !selectedWeek._id) {
      alert('יש לבחור שבוע קודם');
      return;
    }

    if (window.confirm(`האם אתה בטוח שברצונך למחוק את "${selectedWeek.name}"? פעולה זו תמחק גם את כל המשחקים וההימורים של השבוע!`)) {
      try {
        const response = await fetch(`${API_URL}/weeks/${selectedWeek._id}`, {
          method: 'DELETE'
        });

        if (!response.ok) throw new Error('Failed to delete week');

        alert('השבוע נמחק בהצלחה');
        setSelectedWeek(null);
        setMatches([]);
        await loadWeeks();
        
        if (onWeekSelect) {
          onWeekSelect(null);
        }
      } catch (error) {
        console.error('שגיאה במחיקת שבוע:', error);
        alert('שגיאה במחיקת השבוע');
      }
    }
  };

  const findEarliestMatch = (matches) => {
    if (!matches || matches.length === 0) return null;
    
    return matches.reduce((earliest, match) => {
      const [currentDay, currentMonth] = match.date.split('.');
      const [currentHour, currentMinute] = match.time.split(':');
      const currentDate = new Date(
        new Date().getFullYear(),
        parseInt(currentMonth) - 1,
        parseInt(currentDay),
        parseInt(currentHour),
        parseInt(currentMinute)
      );

      const [earliestDay, earliestMonth] = earliest.date.split('.');
      const [earliestHour, earliestMinute] = earliest.time.split(':');
      const earliestDate = new Date(
        new Date().getFullYear(),
        parseInt(earliestMonth) - 1,
        parseInt(earliestDay),
        parseInt(earliestHour),
        parseInt(earliestMinute)
      );

      return currentDate < earliestDate ? match : earliest;
    });
  };

  const activateWeek = async () => {
    if (!selectedWeek || !selectedWeek._id || matches.length === 0) {
      alert('יש להוסיף משחקים לפני הפעלת השבוע');
      return;
    }

    try {
      const earliestMatch = findEarliestMatch(matches);
      
      if (!earliestMatch || !earliestMatch.date || !earliestMatch.time) {
        alert('לא נמצא משחק תקין עם תאריך ושעה');
        return;
      }

      console.log('🏆 המשחק הכי מוקדם:', `${earliestMatch.team1} נגד ${earliestMatch.team2}`);
      console.log('📅 תאריך המשחק המוקדם:', earliestMatch.date);
      console.log('🕐 שעת המשחק המוקדם:', earliestMatch.time);

      const [day, month] = earliestMatch.date.split('.');
      const [hour, minute] = earliestMatch.time.split(':');
      
      const lockTime = new Date(
        new Date().getFullYear(),
        parseInt(month) - 1,
        parseInt(day),
        parseInt(hour),
        parseInt(minute)
      );

      console.log('🔒 זמן נעילה מחושב:', lockTime.toLocaleString('he-IL'));

      const response = await fetch(`${API_URL}/weeks/${selectedWeek._id}/activate`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lockTime: lockTime.toISOString() })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to activate week');
      }

      alert('השבוע הופעל בהצלחה! הוא ינעל אוטומטית בזמן המשחק הראשון.');
      await loadData();
      
      // עדכן גם את השבוע באב
      const updatedWeek = weeks.find(w => w._id === selectedWeek._id);
      if (updatedWeek && onWeekSelect) {
        onWeekSelect({ ...updatedWeek, active: true, lockTime });
      }
    } catch (error) {
      console.error('Error activating week:', error);
      alert('שגיאה בהפעלת השבוע: ' + error.message);
    }
  };

  const addMatch = async () => {
    if (!selectedWeek || !selectedWeek._id) {
      alert('יש לבחור שבוע קודם');
      return;
    }

    if (!newMatch.leagueId || !newMatch.team1 || !newMatch.team2 || !newMatch.date || !newMatch.time) {
      alert('יש למלא את כל השדות');
      return;
    }

    if (!newMatch.date.match(/^\d{1,2}\.\d{1,2}$/)) {
      alert('פורמט תאריך לא נכון. השתמש בפורמט DD.MM (לדוגמה: 10.08)');
      return;
    }

    if (!newMatch.time.match(/^\d{1,2}:\d{2}$/)) {
      alert('פורמט שעה לא נכון. השתמש בפורמט HH:MM (לדוגמה: 20:00)');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/matches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weekId: selectedWeek._id,
          leagueId: newMatch.leagueId,
          team1: newMatch.team1,
          team2: newMatch.team2,
          date: newMatch.date,
          time: newMatch.time
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `שגיאה בהוספת משחק: ${response.status}`);
      }

      setNewMatch({ 
        leagueId: leagues.length > 0 ? leagues[0]._id : '', 
        team1: '', 
        team2: '', 
        date: '', 
        time: '' 
      });
      await loadWeekData(selectedWeek._id);
      alert('משחק נוסף בהצלחה!');
    } catch (error) {
      console.error('שגיאה בהוספת משחק:', error);
      alert('שגיאה בהוספת המשחק: ' + error.message);
    }
  };

  const updateMatchResult = async (matchId, team1Goals, team2Goals) => {
    if (!matchId) return;
    
    try {
      console.log('🎯 מעדכן תוצאת משחק:', { matchId, team1Goals, team2Goals });
      
      const matchResponse = await fetch(`${API_URL}/matches/${matchId}/result`, {
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

      const updatedMatch = await matchResponse.json();
      console.log('✅ תוצאת משחק עודכנה:', updatedMatch);

      console.log('🧮 מחשב ניקוד מחדש לכל השחקנים...');
      
      const scoresResponse = await fetch(`${API_URL}/scores/calculate/${selectedWeek._id}`, {
        method: 'POST'
      });

      if (scoresResponse.ok) {
        console.log('✅ ניקוד חושב מחדש בהצלחה');
        alert('תוצאה נשמרה והניקוד חושב מחדש!');
      } else {
        console.log('⚠️ התוצאה נשמרה אבל היתה בעיה בחישוב הניקוד');
        alert('התוצאה נשמרה אבל היתה בעיה בחישוב הניקוד');
      }

      await loadWeekData(selectedWeek._id);
      
    } catch (error) {
      console.error('Error updating result:', error);
      alert('שגיאה בעדכון התוצאה');
    }
  };

  // פונקציה לעריכת פרטי משחק
  const handleEditMatch = async (matchId) => {
    if (!editingMatchDetails || !editingMatchDetails._id) return;
    
    try {
      const response = await fetch(`${API_URL}/matches/${matchId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leagueId: editingMatchDetails.leagueId,
          team1: editingMatchDetails.team1,
          team2: editingMatchDetails.team2,
          date: editingMatchDetails.date,
          time: editingMatchDetails.time
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'שגיאה בעדכון המשחק');
      }

      alert('✅ המשחק עודכן בהצלחה!');
      setEditingMatchDetails(null);
      await loadWeekData(selectedWeek._id);
    } catch (error) {
      console.error('שגיאה בעדכון משחק:', error);
      alert('שגיאה בעדכון המשחק: ' + error.message);
    }
  };

  // פונקציה למחיקת משחק
  const handleDeleteMatch = async (matchId, matchName) => {
    if (window.confirm(`האם אתה בטוח שברצונך למחוק את המשחק:\n${matchName}?`)) {
      try {
        const response = await fetch(`${API_URL}/matches/${matchId}`, {
          method: 'DELETE'
        });

        if (!response.ok) {
          throw new Error('שגיאה במחיקת המשחק');
        }

        alert('✅ המשחק נמחק בהצלחה!');
        await loadWeekData(selectedWeek._id);
      } catch (error) {
        console.error('שגיאה במחיקת משחק:', error);
        alert('שגיאה במחיקת המשחק');
      }
    }
  };

  // פונקציה למחיקת תוצאת משחק
  const deleteMatchResult = async (matchId) => {
    if (!window.confirm('האם אתה בטוח שברצונך למחוק את תוצאת המשחק?')) {
      return;
    }
    
    try {
      console.log('🗑️ מוחק תוצאת משחק:', matchId);
      
      const response = await fetch(`${API_URL}/matches/${matchId}/result`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`שגיאה במחיקת תוצאה: ${response.status}`);
      }

      alert('✅ התוצאה נמחקה בהצלחה!');
      
      // נקה גם את הטופס המקומי
      setEditingMatch(prev => {
        const newState = { ...prev };
        delete newState[matchId];
        return newState;
      });
      
      // רענן את הנתונים
      await loadWeekData(selectedWeek._id);
      
    } catch (error) {
      console.error('שגיאה במחיקת תוצאה:', error);
      alert('שגיאה במחיקת התוצאה');
    }
  };

  // פונקציה לפורמט תאריך אוטומטי
  const formatDateInput = (value) => {
    // הסר כל תו שאינו מספר או נקודה
    let cleaned = value.replace(/[^\d.]/g, '');
    
    // אם יש יותר מנקודה אחת, השאר רק את הראשונה
    const dotCount = (cleaned.match(/\./g) || []).length;
    if (dotCount > 1) {
      const firstDotIndex = cleaned.indexOf('.');
      cleaned = cleaned.substring(0, firstDotIndex + 1) + 
                cleaned.substring(firstDotIndex + 1).replace(/\./g, '');
    }
    
    // הוסף נקודה אוטומטית אחרי 2 ספרות (אם אין נקודה כבר)
    if (cleaned.length === 2 && !cleaned.includes('.')) {
      cleaned = cleaned + '.';
    }
    
    // הגבל אורך - מקסימום 5 תווים (DD.MM)
    if (cleaned.length > 5) {
      cleaned = cleaned.substring(0, 5);
    }
    
    return cleaned;
  };

  const months = [
    { value: 1, label: 'ינואר' },
    { value: 2, label: 'פברואר' },
    { value: 3, label: 'מרץ' },
    { value: 4, label: 'אפריל' },
    { value: 5, label: 'מאי' },
    { value: 6, label: 'יוני' },
    { value: 7, label: 'יולי' },
    { value: 8, label: 'אוגוסט' },
    { value: 9, label: 'ספטמבר' },
    { value: 10, label: 'אוקטובר' },
    { value: 11, label: 'נובמבר' },
    { value: 12, label: 'דצמבר' }
  ];

  const seasons = ['2025-26', '2026-27', '2027-28'];

  return (
    <div>
      <h2>ניהול שבועות</h2>

      {/* יצירת שבוע חדש */}
      <div className="card">
        <h3>צור שבוע חדש</h3>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 200px' }}>
            <label>שם השבוע:</label>
            <input
              type="text"
              placeholder="לדוגמה: שבוע 1"
              value={newWeek.name}
              onChange={(e) => setNewWeek({ ...newWeek, name: e.target.value })}
              className="input"
            />
          </div>
          
          <div style={{ flex: '1 1 150px' }}>
            <label>חודש:</label>
            <select
              value={newWeek.month}
              onChange={(e) => setNewWeek({ ...newWeek, month: e.target.value })}
              className="input"
            >
              <option value="">בחר חודש</option>
              {months.map(month => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </div>
          
          <div style={{ flex: '1 1 150px' }}>
            <label>עונה:</label>
            <select
              value={newWeek.season}
              onChange={(e) => setNewWeek({ ...newWeek, season: e.target.value })}
              className="input"
            >
              {seasons.map(season => (
                <option key={season} value={season}>
                  {season}
                </option>
              ))}
            </select>
          </div>
          
          <button onClick={createWeek} className="btn btn-primary">
            ➕ צור שבוע
          </button>
        </div>
      </div>

      {/* בחירת שבוע - חזרה לדרופדאון כמו שהיה */}
      <div className="card">
        <h3>בחר שבוע לניהול</h3>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            value={selectedWeek?._id || ''}
            onChange={(e) => handleSelectWeek(e.target.value)}
            className="input"
            style={{ width: '250px' }}
          >
            <option value="">בחר שבוע</option>
            {weeks.map(week => (
              <option key={week._id} value={week._id}>
                {week.name} 
                {week.month && ` - ${months.find(m => m.value === week.month)?.label || ''}`}
                {week.season && week.season !== '2025-26' && ` (${week.season})`}
              </option>
            ))}
          </select>

          {selectedWeek && (
            <>
              {!selectedWeek.active && !selectedWeek.locked && (
                <button onClick={activateWeek} className="btn btn-success">
                  ▶️ הפעל שבוע
                </button>
              )}
              {selectedWeek.active && !selectedWeek.locked && (
                <span style={{ padding: '0.5rem', color: '#28a745', fontWeight: 'bold' }}>
                  🟢 השבוע פעיל
                </span>
              )}
              {selectedWeek.locked && (
                <span style={{ padding: '0.5rem', color: '#dc3545', fontWeight: 'bold' }}>
                  🔒 השבוע נעול
                </span>
              )}
              {selectedWeek.active && (
                <button onClick={deactivateWeek} className="btn" style={{ backgroundColor: '#ffc107', color: '#000' }}>
                  ⏸️ כבה שבוע
                </button>
              )}
              <button 
                onClick={() => setEditingWeek(editingWeek === selectedWeek._id ? null : selectedWeek._id)} 
                className="btn"
                style={{ backgroundColor: '#17a2b8', color: 'white' }}
              >
                ✏️ ערוך שם
              </button>
              <button onClick={deleteWeek} className="btn btn-danger">
                🗑️ מחק שבוע
              </button>
            </>
          )}
        </div>

        {editingWeek === selectedWeek?._id && (
          <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#e9ecef', borderRadius: '4px' }}>
            <h4>עריכת שבוע</h4>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label>שם:</label>
                <input
                  type="text"
                  id="edit-week-name"
                  defaultValue={selectedWeek.name}
                  className="input"
                />
              </div>
              <div>
                <label>חודש:</label>
                <select
                  id="edit-week-month"
                  defaultValue={selectedWeek.month}
                  className="input"
                >
                  {months.map(month => (
                    <option key={month.value} value={month.value}>
                      {month.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label>עונה:</label>
                <select
                  id="edit-week-season"
                  defaultValue={selectedWeek.season || '2025-26'}
                  className="input"
                >
                  {seasons.map(season => (
                    <option key={season} value={season}>
                      {season}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => {
                  const nameInput = document.getElementById('edit-week-name');
                  const monthSelect = document.getElementById('edit-week-month');
                  const seasonSelect = document.getElementById('edit-week-season');
                  handleEditWeek(
                    selectedWeek._id, 
                    nameInput.value, 
                    monthSelect.value,
                    seasonSelect.value
                  );
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

      {/* הוסף משחק */}
      {selectedWeek && selectedWeek._id && (
        <div className="card">
          <h2>הוסף משחק ל{selectedWeek.name || 'השבוע'}</h2>
          
          {loadingLeagues && (
            <div style={{ padding: '0.5rem', backgroundColor: '#fff3cd', borderRadius: '4px', marginBottom: '1rem' }}>
              ⏳ טוען ליגות...
            </div>
          )}
          
          {!loadingLeagues && leagues.length === 0 && (
            <div style={{ padding: '0.5rem', backgroundColor: '#f8d7da', borderRadius: '4px', marginBottom: '1rem' }}>
              ⚠️ לא נמצאו ליגות פעילות! עבור לטאב "ניהול ליגות" ליצירת ליגות חדשות.
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div>
              <label>ליגה:</label>
              <select
                value={newMatch.leagueId}
                onChange={(e) => setNewMatch({ ...newMatch, leagueId: e.target.value })}
                className="input"
                disabled={leagues.length === 0}
              >
                {leagues.length === 0 ? (
                  <option value="">אין ליגות זמינות</option>
                ) : (
                  leagues.map(league => (
                    <option key={league._id} value={league._id}>
                      {league.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label>קבוצת בית:</label>
              <input
                type="text"
                placeholder="לדוגמה: מכבי תל אביב"
                value={newMatch.team1}
                onChange={(e) => setNewMatch({ ...newMatch, team1: e.target.value })}
                className="input"
              />
            </div>

            <div>
              <label>קבוצת חוץ:</label>
              <input
                type="text"
                placeholder="לדוגמה: הפועל תל אביב"
                value={newMatch.team2}
                onChange={(e) => setNewMatch({ ...newMatch, team2: e.target.value })}
                className="input"
              />
            </div>

            <div>
              <label>תאריך (DD.MM):</label>
              <input
                type="text"
                placeholder="DD.MM"
                value={newMatch.date}
                onChange={(e) => {
                  const formatted = formatDateInput(e.target.value);
                  setNewMatch({ ...newMatch, date: formatted });
                }}
                className="input"
                maxLength="5"
              />
            </div>

            <div>
              <label>שעה (HH:MM):</label>
              <input
                type="text"
                placeholder="20:00"
                value={newMatch.time}
                onChange={(e) => setNewMatch({ ...newMatch, time: e.target.value })}
                className="input"
              />
            </div>
          </div>

          <button
            onClick={addMatch}
            className="btn btn-primary"
            style={{ marginTop: '1rem' }}
            disabled={leagues.length === 0}
          >
            ➕ הוסף משחק
          </button>
        </div>
      )}

      {/* רשימת משחקים */}
      {matches.length > 0 && (
        <div className="card">
          <h2>משחקי {selectedWeek.name}</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {matches.map(match => {
              const isEditingThis = editingMatchDetails?._id === match._id;
              const currentResult = editingMatch[match._id] || { team1Goals: '', team2Goals: '' };
              const isEditing = currentResult.team1Goals !== '' || currentResult.team2Goals !== '';
              const hasResult = match.result?.team1Goals !== undefined && match.result?.team2Goals !== undefined;
              
              return (
                <div
                  key={match._id}
                  style={{
                    padding: '1rem',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    backgroundColor: isEditingThis ? '#f0f8ff' : '#f8f9fa'
                  }}
                >
                  {/* כותרת המשחק */}
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    marginBottom: '0.5rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span
                        style={{
                          padding: '2px 8px',
                          backgroundColor: match.leagueId?.color || match.color || '#6c757d',
                          color: 'white',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: 'bold'
                        }}
                      >
                        {match.leagueId?.name || match.league || 'לא מוגדר'}
                      </span>
                      <span style={{ fontSize: '14px', color: '#666' }}>
                        📅 {match.date} ⏰ {match.time}
                      </span>
                    </div>
                    
                    {/* כפתורי פעולה */}
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {!isEditingThis && (
                        <>
                          <button
                            onClick={() => setEditingMatchDetails({
                              _id: match._id,
                              leagueId: match.leagueId?._id || '',
                              team1: match.team1,
                              team2: match.team2,
                              date: match.date,
                              time: match.time
                            })}
                            className="btn"
                            style={{ 
                              fontSize: '12px', 
                              padding: '4px 8px',
                              backgroundColor: '#17a2b8',
                              color: 'white'
                            }}
                            title="ערוך פרטי משחק"
                          >
                            ✏️ ערוך
                          </button>
                          
                          {/* כפתור מחיקת תוצאה - מופיע רק אם יש תוצאה */}
                          {hasResult && (
                            <button
                              onClick={() => deleteMatchResult(match._id)}
                              className="btn"
                              style={{ 
                                fontSize: '12px', 
                                padding: '4px 8px',
                                backgroundColor: '#ffc107',
                                color: '#000'
                              }}
                              title="מחק תוצאה"
                            >
                              🔄 מחק תוצאה
                            </button>
                          )}
                          
                          <button
                            onClick={() => handleDeleteMatch(match._id, `${match.team1} נגד ${match.team2}`)}
                            className="btn btn-danger"
                            style={{ fontSize: '12px', padding: '4px 8px' }}
                            title="מחק משחק"
                          >
                            🗑️
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* מצב עריכת פרטים */}
                  {isEditingThis ? (
                    <div style={{ 
                      padding: '1rem', 
                      backgroundColor: 'white', 
                      borderRadius: '4px',
                      border: '2px solid #17a2b8'
                    }}>
                      <h4 style={{ marginBottom: '1rem', color: '#17a2b8' }}>
                        ✏️ עריכת פרטי משחק
                      </h4>
                      
                      <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: '1fr 1fr',
                        gap: '1rem',
                        marginBottom: '1rem'
                      }}>
                        {/* ליגה */}
                        <div>
                          <label style={{ fontSize: '12px', color: '#666' }}>ליגה:</label>
                          <select
                            value={editingMatchDetails.leagueId}
                            onChange={(e) => setEditingMatchDetails({
                              ...editingMatchDetails,
                              leagueId: e.target.value
                            })}
                            className="input"
                          >
                            <option value="">בחר ליגה</option>
                            {leagues.map(league => (
                              <option key={league._id} value={league._id}>
                                {league.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        {/* תאריך ושעה עם פורמט אוטומטי */}
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '12px', color: '#666' }}>תאריך:</label>
                            <input
                              type="text"
                              value={editingMatchDetails.date}
                              onChange={(e) => {
                                const formatted = formatDateInput(e.target.value);
                                setEditingMatchDetails({
                                  ...editingMatchDetails,
                                  date: formatted
                                });
                              }}
                              placeholder="DD.MM"
                              className="input"
                              maxLength="5"
                            />
                          </div>
                          <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '12px', color: '#666' }}>שעה:</label>
                            <input
                              type="text"
                              value={editingMatchDetails.time}
                              onChange={(e) => setEditingMatchDetails({
                                ...editingMatchDetails,
                                time: e.target.value
                              })}
                              placeholder="HH:MM"
                              className="input"
                            />
                          </div>
                        </div>
                        
                        {/* קבוצות */}
                        <div>
                          <label style={{ fontSize: '12px', color: '#666' }}>קבוצה ביתית:</label>
                          <input
                            type="text"
                            value={editingMatchDetails.team1}
                            onChange={(e) => setEditingMatchDetails({
                              ...editingMatchDetails,
                              team1: e.target.value
                            })}
                            className="input"
                          />
                        </div>
                        
                        <div>
                          <label style={{ fontSize: '12px', color: '#666' }}>קבוצה אורחת:</label>
                          <input
                            type="text"
                            value={editingMatchDetails.team2}
                            onChange={(e) => setEditingMatchDetails({
                              ...editingMatchDetails,
                              team2: e.target.value
                            })}
                            className="input"
                          />
                        </div>
                      </div>
                      
                      {/* כפתורי שמירה/ביטול */}
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => handleEditMatch(match._id)}
                          className="btn btn-success"
                          style={{ fontSize: '14px', padding: '6px 12px' }}
                        >
                          💾 שמור שינויים
                        </button>
                        <button
                          onClick={() => setEditingMatchDetails(null)}
                          className="btn"
                          style={{ 
                            fontSize: '14px', 
                            padding: '6px 12px',
                            backgroundColor: '#6c757d',
                            color: 'white'
                          }}
                        >
                          ❌ ביטול
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* תצוגת המשחק הרגילה + תוצאות */
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ textAlign: 'center', fontWeight: '500' }}>
                          {match.team1} (בית)
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
                          disabled={hasResult && !isEditing}
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
                          disabled={hasResult && !isEditing}
                        />
                        
                        <div style={{ textAlign: 'center', fontWeight: '500' }}>
                          {match.team2} (חוץ)
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
                          
                          {hasResult && !isEditing && (
                            <span style={{
                              padding: '4px 8px',
                              backgroundColor: '#d4edda',
                              color: '#155724',
                              borderRadius: '4px',
                              fontSize: '12px'
                            }}>
                              ✓ תוצאה: {match.result.team2Goals}-{match.result.team1Goals}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {isEditing && (
                        <div style={{ marginTop: '0.5rem', fontSize: '11px', color: '#666', textAlign: 'center' }}>
                          תצוגה מקדימה: {match.team1} {currentResult.team1Goals || 0} - {currentResult.team2Goals || 0} {match.team2}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default WeeksManagement;