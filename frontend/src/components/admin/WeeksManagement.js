import React, { useState } from 'react';
import { api } from '../../services/api';

function WeeksManagement({ 
  weeks, 
  selectedWeek, 
  matches, 
  onWeekSelect, 
  loadData, 
  loadWeekData,
  setMatches,
  setWeeks
}) {
  const [newWeekName, setNewWeekName] = useState('');
  const [newWeekMonth, setNewWeekMonth] = useState(new Date().getMonth() + 1);
  const [newWeekSeason, setNewWeekSeason] = useState('2024-25');
  const [editingWeek, setEditingWeek] = useState(null);
  const [editingMatch, setEditingMatch] = useState({});
  const [newMatch, setNewMatch] = useState({
    league: 'english',
    team1: '',
    team2: '',
    date: '',
    time: ''
  });

  const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:5000/api'
    : 'https://football-betting-backend.onrender.com/api';

  const createNewWeek = async () => {
    const weekName = newWeekName.trim() || `Week ${weeks.length + 1}`;
    try {
      const response = await fetch(`${API_URL}/weeks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: weekName,
          month: parseInt(newWeekMonth),
          season: newWeekSeason
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      setNewWeekName('');
      setNewWeekMonth(new Date().getMonth() + 1);
      setNewWeekSeason('2024-25');
      await loadData();
      alert('שבוע חדש נוצר!');
    } catch (error) {
      console.error('שגיאה ביצירת שבוע:', error);
      alert('שגיאה ביצירת השבוע');
    }
  };

  const handleEditWeek = async (weekId, newName, newMonth, newSeason) => {
    if (!weekId || !newName || !newName.trim()) {
      alert('יש להכניס שם תקין לשבוע');
      return;
    }
    
    try {
      const cleanWeekId = String(weekId).replace(/[^a-fA-F0-9]/g, '').substring(0, 24);
      
      if (cleanWeekId.length !== 24) {
        throw new Error('מזהה שבוע לא תקין');
      }
      
      const updateData = { name: newName.trim() };
      if (newMonth) updateData.month = parseInt(newMonth);
      if (newSeason) updateData.season = newSeason;
      
      const response = await fetch(`${API_URL}/weeks/${cleanWeekId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        throw new Error(`שגיאת שרת: ${response.status}`);
      }

      setEditingWeek(null);
      
      // עדכון מיידי של השבוע הנבחר
      if (selectedWeek && selectedWeek._id === weekId) {
        onWeekSelect({ 
          ...selectedWeek, 
          name: newName.trim(),
          month: newMonth ? parseInt(newMonth) : selectedWeek.month,
          season: newSeason || selectedWeek.season
        });
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
        onWeekSelect(null);
        setMatches([]);
        await loadData();
        alert('שבוע נמחק בהצלחה!');
      } catch (error) {
        console.error('שגיאה במחיקת שבוע:', error);
        alert('שגיאה במחיקת השבוע');
      }
    }
  };

  // פונקציה חדשה למציאת המשחק הכי מוקדם
  const findEarliestMatch = (matches) => {
    if (!matches || matches.length === 0) return null;
    
    return matches.reduce((earliest, match) => {
      // המרה לאובייקט Date לצורך השוואה
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
      // מצא את המשחק הכי מוקדם במקום הראשון ברשימה
      const earliestMatch = findEarliestMatch(matches);
      
      if (!earliestMatch || !earliestMatch.date || !earliestMatch.time) {
        alert('לא נמצא משחק תקין עם תאריך ושעה');
        return;
      }

      console.log('🏆 המשחק הכי מוקדם:', `${earliestMatch.team1} נגד ${earliestMatch.team2}`);
      console.log('🔍 תאריך המשחק המוקדם:', earliestMatch.date);
      console.log('🔍 שעת המשחק המוקדם:', earliestMatch.time);

      // פירוק התאריך DD.MM (כמו 10.08)
      const [day, month] = earliestMatch.date.split('.');
      console.log('🔍 אחרי פירוק תאריך:', { day: day, month: month });

      // פירוק השעה HH:MM (כמו 20:00)
      const [hour, minute] = earliestMatch.time.split(':');
      console.log('🔍 אחרי פירוק שעה:', { hour: hour, minute: minute });

      // יצירת התאריך
      // שים לב: new Date(year, monthIndex, day, hour, minute)
      // monthIndex מתחיל מ-0, אז אוגוסט (8) = 7
      const currentYear = new Date().getFullYear(); // שנה נוכחית
      const lockTime = new Date(
        currentYear, // שנה נוכחית (2024)
        parseInt(month) - 1, // חודש (0-11), אוגוסט = 7
        parseInt(day), // יום
        parseInt(hour), // שעה
        parseInt(minute) // דקה
      );

      console.log('🔍 זמן נעילה שחושב:', {
        input: `${earliestMatch.date} ${earliestMatch.time}`,
        year: currentYear,
        month: parseInt(month) - 1,
        day: parseInt(day),
        hour: parseInt(hour),
        minute: parseInt(minute),
        calculated: lockTime.toLocaleString('he-IL'),
        iso: lockTime.toISOString()
      });

      // בדיקה שהתאריך הגיוני
      const now = new Date();
      console.log('🔍 זמן נוכחי:', now.toLocaleString('he-IL'));
      console.log('🔍 האם עבר הזמן?', lockTime < now);

      let confirmMessage;
      if (lockTime < now) {
        confirmMessage = `⚠️ זמן הנעילה שחושב כבר עבר!\n` +
          `משחק מוקדם: ${earliestMatch.team1} נגד ${earliestMatch.team2}\n` +
          `זמן נעילה: ${lockTime.toLocaleString('he-IL')}\n` +
          `זמן נוכחי: ${now.toLocaleString('he-IL')}\n\n` +
          `האם אתה בטוח שרצית להפעיל את השבוע?`;
      } else {
        confirmMessage = `השבוע יינעל אוטומטית ב:\n` +
          `${lockTime.toLocaleString('he-IL')}\n\n` +
          `משחק מוקדם: ${earliestMatch.team1} נגד ${earliestMatch.team2}\n` +
          `האם זה נכון?`;
      }

      if (!window.confirm(confirmMessage)) {
        return;
      }

      const response = await fetch(`${API_URL}/weeks/${selectedWeek._id}/activate`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lockTime: lockTime.toISOString() })
      });

      if (!response.ok) {
        throw new Error(`שגיאה בהפעלת שבוע: ${response.status}`);
      }

      alert('השבוע הופעל בהצלחה!');
      await loadData();
    } catch (error) {
      console.error('שגיאה בהפעלת שבוע:', error);
      alert('שגיאה בהפעלת השבוע: ' + error.message);
    }
  };

  // פונקציה חדשה לכיבוי שבוע
  const deactivateWeek = async () => {
    if (!selectedWeek || !selectedWeek._id) {
      alert('יש לבחור שבוע קודם');
      return;
    }

    if (!selectedWeek.active) {
      alert('השבוע כבר לא פעיל');
      return;
    }

    if (selectedWeek.locked) {
      alert('לא ניתן לכבות שבוע שכבר נעול');
      return;
    }

    if (window.confirm(`האם אתה בטוח שרצית לכבות את השבוע "${selectedWeek.name}"?\n\nהשחקנים לא יוכלו יותר לראות אותו או להמר בו.`)) {
      try {
        console.log('מכבה שבוע:', selectedWeek._id);
        
        const response = await fetch(`${API_URL}/weeks/${selectedWeek._id}/deactivate`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
          throw new Error(`שגיאה בכיבוי שבוע: ${response.status}`);
        }

        console.log('השבוע כובה בהצלחה');
        alert('השבוע כובה בהצלחה! עכשיו אתה יכול לערוך אותו.');
        await loadData();
      } catch (error) {
        console.error('שגיאה בכיבוי שבוע:', error);
        alert('שגיאה בכיבוי השבוע: ' + error.message);
      }
    }
  };

  const addMatch = async () => {
    if (!selectedWeek || !selectedWeek._id) {
      alert('יש לבחור שבוע קודם');
      return;
    }

    if (!newMatch.team1 || !newMatch.team2 || !newMatch.date || !newMatch.time) {
      alert('יש למלא את כל השדות');
      return;
    }

    // בדיקה שהתאריך בפורמט נכון
    if (!newMatch.date.match(/^\d{1,2}\.\d{1,2}$/)) {
      alert('פורמט תאריך לא נכון. השתמש בפורמט DD.MM (לדוגמה: 10.08)');
      return;
    }

    // בדיקה שהשעה בפורמט נכון
    if (!newMatch.time.match(/^\d{1,2}:\d{2}$/)) {
      alert('פורמט שעה לא נכון. השתמש בפורמט HH:MM (לדוגמה: 20:00)');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/matches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newMatch,
          weekId: selectedWeek._id
        })
      });

      if (!response.ok) {
        throw new Error(`שגיאה בהוספת משחק: ${response.status}`);
      }

      setNewMatch({ league: 'english', team1: '', team2: '', date: '', time: '' });
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
      console.log('שולח תוצאה:', { matchId, team1Goals, team2Goals });
      
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
      console.log('תגובה מהשרת:', updatedMatch);

      const scoresResponse = await fetch(`${API_URL}/scores/calculate/${selectedWeek._id}`, {
        method: 'POST'
      });

      if (!scoresResponse.ok) {
        throw new Error(`שגיאה בחישוב ניקוד: ${scoresResponse.status}`);
      }

      console.log('טוען נתונים מחדש...');
      await loadWeekData(selectedWeek._id);
      setEditingMatch({});
      alert('תוצאה נשמרה וניקוד חושב מחדש!');
    } catch (error) {
      console.error('שגיאה בעדכון תוצאה:', error);
      alert('שגיאה בעדכון התוצאה');
    }
  };

  const deleteMatch = async (matchId, matchName) => {
    if (!matchId) {
      alert('שגיאה: מזהה משחק חסר');
      return;
    }
    
    console.log('🗑️ מנסה למחוק משחק:', matchId, matchName);
    
    if (window.confirm(`האם אתה בטוח שברצונך למחוק את המשחק:\n${matchName}?\n\nפעולה זו תמחק גם את כל ההימורים הקשורים למשחק!`)) {
      try {
        console.log('📡 שולח בקשת מחיקה...');
        const response = await fetch(`${API_URL}/matches/${matchId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        console.log('📩 תגובת שרת:', response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ שגיאת שרת:', errorText);
          throw new Error(`שגיאה במחיקת משחק: ${response.status} - ${errorText}`);
        }

        console.log('✅ משחק נמחק בהצלחה, מרענן נתונים...');
        await loadWeekData(selectedWeek._id);
        alert('✅ משחק נמחק בהצלחה!');
      } catch (error) {
        console.error('❌ שגיאה במחיקת משחק:', error);
        alert(`❌ שגיאה במחיקת המשחק: ${error.message}`);
      }
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

  const seasons = [
    { value: '2025-26', label: 'עונת 2025-26' },
    { value: '2026-27', label: 'עונת 2026-27' }
  ];

  return (
    <>
      {/* ניהול שבועות */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2>ניהול שבועות ({weeks.length})</h2>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="שם השבוע החדש"
              value={newWeekName}
              onChange={(e) => setNewWeekName(e.target.value)}
              className="input"
              style={{ width: '150px' }}
            />
            <select
              value={newWeekMonth}
              onChange={(e) => setNewWeekMonth(parseInt(e.target.value))}
              className="input"
              style={{ width: '120px' }}
            >
              {months.map(month => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
            <select
              value={newWeekSeason}
              onChange={(e) => setNewWeekSeason(e.target.value)}
              className="input"
              style={{ width: '130px' }}
            >
              {seasons.map(season => (
                <option key={season.value} value={season.value}>
                  {season.label}
                </option>
              ))}
            </select>
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
              onWeekSelect(week || null);
            }}
            className="input"
            style={{ width: '250px' }}
          >
            <option value="">בחר שבוע</option>
            {weeks.map(week => {
              if (!week || !week._id) return null;
              return (
                <option key={week._id} value={week._id}>
                  {week.name || 'שבוע ללא שם'} - {months.find(m => m.value === week.month)?.label} {week.season}
                </option>
              );
            })}
          </select>

          {/* כפתור הפעלה - רק אם השבוע לא פעיל */}
          {selectedWeek && !selectedWeek.active && (
            <button onClick={activateWeek} className="btn btn-success">
              הפעל שבוע
            </button>
          )}

          {/* כפתור כיבוי - רק אם השבוע פעיל אבל לא נעול */}
          {selectedWeek && selectedWeek.active && !selectedWeek.locked && (
            <button onClick={deactivateWeek} className="btn" style={{ backgroundColor: '#ffc107', color: 'white' }}>
              כבה שבוע
            </button>
          )}

          {selectedWeek && selectedWeek._id && (
            <>
              <button
                onClick={() => setEditingWeek(editingWeek === selectedWeek._id ? null : selectedWeek._id)}
                className="btn"
                style={{ backgroundColor: '#17a2b8', color: 'white' }}
              >
                ערוך
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

          {/* הצגת סטטוס השבוע */}
          {selectedWeek && (
            <div style={{ 
              padding: '0.5rem 1rem', 
              borderRadius: '4px',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              {!selectedWeek.active && (
                <span style={{ backgroundColor: '#f8d7da', color: '#721c24' }}>
                  ⚪ לא פעיל
                </span>
              )}
              {selectedWeek.active && !selectedWeek.locked && (
                <span style={{ backgroundColor: '#d4edda', color: '#155724' }}>
                  ✅ פעיל
                </span>
              )}
              {selectedWeek.active && selectedWeek.locked && (
                <span style={{ backgroundColor: '#cce5ff', color: '#0066cc' }}>
                  🔒 נעול
                </span>
              )}
            </div>
          )}
        </div>

        {/* עריכת פרטי השבוע */}
        {editingWeek === selectedWeek?._id && (
          <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', alignItems: 'end' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#666' }}>שם השבוע:</label>
                <input
                  type="text"
                  defaultValue={selectedWeek.name}
                  placeholder="שם השבוע החדש"
                  className="input"
                  id="edit-week-name"
                  autoFocus
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#666' }}>חודש:</label>
                <select
                  defaultValue={selectedWeek.month}
                  className="input"
                  id="edit-week-month"
                >
                  {months.map(month => (
                    <option key={month.value} value={month.value}>
                      {month.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#666' }}>עונה:</label>
                <select
                  defaultValue={selectedWeek.season || '2025-26'}
                  className="input"
                  id="edit-week-season"
                >
                  {seasons.map(season => (
                    <option key={season.value} value={season.value}>
                      {season.label}
                    </option>
                  ))}
                </select>
              </div>
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
          <div style={{ marginBottom: '1rem', padding: '0.5rem', backgroundColor: '#e3f2fd', borderRadius: '4px', fontSize: '14px' }}>
            💡 <strong>פורמט תאריכים:</strong> DD.MM (לדוגמה: 10.08 = 10 באוגוסט) | 
            <strong> פורמט שעות:</strong> HH:MM (לדוגמה: 20:00)
          </div>
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
              const currentResult = editingMatch[match._id] || {
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
                  {/* כותרת המשחק עם כפתור מחיקה */}
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ color: '#666', fontSize: '14px' }}>
                        {match.date || 'ללא תאריך'} • {match.time || 'ללא שעה'}
                      </div>
                      {/* 🗑️ כפתור מחיקת משחק */}
                      <button
                        onClick={() => deleteMatch(match._id, `${match.team1} נגד ${match.team2}`)}
                        style={{ 
                          fontSize: '12px', 
                          padding: '6px 10px', 
                          backgroundColor: '#dc3545', 
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontWeight: 'bold'
                        }}
                        title="מחק משחק זה"
                      >
                        🗑️ מחק
                      </button>
                    </div>
                  </div>

                  {/* הזנת תוצאה - מותאם לסדר עברית */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', justifyContent: 'center' }}>
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
                      
                      {match.result?.team1Goals !== undefined && !isEditing && (
                        <span style={{
                          padding: '4px 8px',
                          backgroundColor: '#d4edda',
                          color: '#155724',
                          borderRadius: '4px',
                          fontSize: '12px'
                        }}>
                          ✓ תוצאה: {match.result.team2Goals}-{match.result.team1Goals}
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
  );
}

export default WeeksManagement;