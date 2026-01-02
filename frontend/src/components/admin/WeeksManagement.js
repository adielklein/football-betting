import React, { useState, useEffect, useRef } from 'react';

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
  const [showActivationDialog, setShowActivationDialog] = useState(false);
  const [sendPushNotifications, setSendPushNotifications] = useState(true);

  // State עבור ה-dropdown המקונן
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [hoveredSeason, setHoveredSeason] = useState(null);
  const [hoveredMonth, setHoveredMonth] = useState(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    loadData();
  }, []);

  // סגירת dropdown בלחיצה מחוץ לרכיב
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
        setHoveredSeason(null);
        setHoveredMonth(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
      const reversedWeeks = data.reverse();
      setWeeks(reversedWeeks);
      
      // בחר את השבוע האחרון (החדש ביותר) כבררת מחדל
      if (reversedWeeks.length > 0 && !selectedWeek) {
        const latestWeek = reversedWeeks[0];
        setSelectedWeek(latestWeek);
        if (onWeekSelect) {
          onWeekSelect(latestWeek);
        }
        loadWeekData(latestWeek._id);
      }
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

  const handleSelectWeek = async (week) => {
    setSelectedWeek(week);
    setIsDropdownOpen(false);
    setHoveredSeason(null);
    setHoveredMonth(null);
    
    if (onWeekSelect) {
      onWeekSelect(week);
    }
    
    if (week._id) {
      await loadWeekData(week._id);
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

  // 🆕 פונקציה מעודכנת - משתמשת ב-fullDate אם קיים
  const findEarliestMatch = (matches) => {
    if (!matches || matches.length === 0) return null;
    
    return matches.reduce((earliest, match) => {
      let currentDate, earliestDate;
      
      // 🆕 השתמש ב-fullDate אם קיים
      if (match.fullDate) {
        currentDate = new Date(match.fullDate);
      } else {
        // חשב בעצמך אם אין fullDate (משחק ישן)
        const [currentDay, currentMonth] = match.date.split('.');
        const [currentHour, currentMinute] = match.time.split(':');
        
        const now = new Date();
        const currentYear = now.getFullYear();
        const nowMonth = now.getMonth() + 1;
        
        let year = currentYear;
        if (nowMonth === 12 && parseInt(currentMonth) === 1) {
          year = currentYear + 1;
        }
        
        currentDate = new Date(
          year,
          parseInt(currentMonth) - 1,
          parseInt(currentDay),
          parseInt(currentHour),
          parseInt(currentMinute)
        );
      }
      
      if (earliest.fullDate) {
        earliestDate = new Date(earliest.fullDate);
      } else {
        const [earliestDay, earliestMonth] = earliest.date.split('.');
        const [earliestHour, earliestMinute] = earliest.time.split(':');
        
        const now = new Date();
        const currentYear = now.getFullYear();
        const nowMonth = now.getMonth() + 1;
        
        let year = currentYear;
        if (nowMonth === 12 && parseInt(earliestMonth) === 1) {
          year = currentYear + 1;
        }
        
        earliestDate = new Date(
          year,
          parseInt(earliestMonth) - 1,
          parseInt(earliestDay),
          parseInt(earliestHour),
          parseInt(earliestMinute)
        );
      }

      return currentDate < earliestDate ? match : earliest;
    });
  };

  const activateWeek = async () => {
    if (!selectedWeek || !selectedWeek._id || matches.length === 0) {
      alert('יש להוסיף משחקים לפני הפעלת השבוע');
      return;
    }

    setShowActivationDialog(true);
  };

  // 🆕 פונקציה מעודכנת - משתמשת ב-fullDate אם קיים
  const confirmActivateWeek = async () => {
    try {
      const earliestMatch = findEarliestMatch(matches);
      
      if (!earliestMatch || !earliestMatch.date || !earliestMatch.time) {
        alert('לא נמצא משחק תקין עם תאריך ושעה');
        return;
      }

      console.log('🏆 המשחק הכי מוקדם:', `${earliestMatch.team1} נגד ${earliestMatch.team2}`);
      console.log('📅 תאריך המשחק המוקדם:', earliestMatch.date);
      console.log('🕐 שעת המשחק המוקדם:', earliestMatch.time);
      
      // 🆕 השתמש ב-fullDate אם קיים, אחרת חשב בעצמך
      let lockTime;
      
      if (earliestMatch.fullDate) {
        // יש fullDate מהשרת - השתמש בו!
        lockTime = new Date(earliestMatch.fullDate);
        console.log('✅ משתמש ב-fullDate מהשרת:', lockTime);
      } else {
        // אין fullDate (משחק ישן) - חשב בעצמך
        console.log('⚠️ אין fullDate, מחשב בעצמי');
        const [day, month] = earliestMatch.date.split('.');
        const [hour, minute] = earliestMatch.time.split(':');
        
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;
        
        let year = currentYear;
        if (currentMonth === 12 && parseInt(month) === 1) {
          year = currentYear + 1;
        }
        
        lockTime = new Date(year, parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute));
      }

      const lockTimeISO = lockTime.toISOString();

      console.log('🔒 זמן נעילה (ישראל):', lockTime.toLocaleString('he-IL'));
      console.log('📤 נשלח לשרת (UTC):', lockTimeISO);

      const response = await fetch(`${API_URL}/weeks/${selectedWeek._id}/activate`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          lockTime: lockTimeISO,
          sendNotifications: sendPushNotifications 
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to activate week');
      }

      const result = await response.json();

      let successMessage = 'השבוע הופעל בהצלחה! הוא ינעל אוטומטית בזמן המשחק הראשון.';
      
        // שורה 399 - תחליף את כל הבלוק הזה:
if (sendPushNotifications) {
  const notificationMessage = `⚽ ${selectedWeek.name} פתוח להימורים!\n🔒 נעילה: ${earliestMatch.date} ${earliestMatch.time}`;
        
        successMessage += `\n\n💬 תוכן ההודעה:\n"${notificationMessage}"`;
        
        if (result.notificationResult) {
          successMessage += `\n\n📢 התראות נשלחו ל-${result.notificationResult.sent} משתמשים`;
          if (result.notificationResult.failed > 0) {
            successMessage += `\n⚠️ ${result.notificationResult.failed} התראות נכשלו`;
          }
        } else {
          successMessage += '\n\n⚠️ לא נשלחו התראות (אין משתמשים מנויים)';
        }
      }

      alert(successMessage);
      
      await loadData();
      
      const updatedWeek = weeks.find(w => w._id === selectedWeek._id);
      if (updatedWeek && onWeekSelect) {
        onWeekSelect({ ...updatedWeek, active: true, lockTime });
      }
      
      setShowActivationDialog(false);
      setSendPushNotifications(true);
    } catch (error) {
      console.error('Error activating week:', error);
      alert('שגיאה בהפעלת השבוע: ' + error.message);
      setShowActivationDialog(false);
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
        console.log('⚠️ התוצאה נשמרה אבל הייתה בעיה בחישוב הניקוד');
        alert('התוצאה נשמרה אבל הייתה בעיה בחישוב הניקוד');
      }

      await loadWeekData(selectedWeek._id);
      
    } catch (error) {
      console.error('Error updating result:', error);
      alert('שגיאה בעדכון התוצאה');
    }
  };

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
      
      setEditingMatch(prev => {
        const newState = { ...prev };
        delete newState[matchId];
        return newState;
      });
      
      await loadWeekData(selectedWeek._id);
      
    } catch (error) {
      console.error('שגיאה במחיקת תוצאה:', error);
      alert('שגיאה במחיקת התוצאה');
    }
  };

  const formatDateInput = (value) => {
    let cleaned = value.replace(/[^\d.]/g, '');
    
    const dotCount = (cleaned.match(/\./g) || []).length;
    if (dotCount > 1) {
      const firstDotIndex = cleaned.indexOf('.');
      cleaned = cleaned.substring(0, firstDotIndex + 1) + 
                cleaned.substring(firstDotIndex + 1).replace(/\./g, '');
    }
    
    if (cleaned.length === 2 && !cleaned.includes('.')) {
      cleaned = cleaned + '.';
    }
    
    if (cleaned.length > 5) {
      cleaned = cleaned.substring(0, 5);
    }
    
    return cleaned;
  };

  const formatTimeInput = (value) => {
    let cleaned = value.replace(/[^\d:]/g, "");
    const colonCount = (cleaned.match(/:/g) || []).length;
    if (colonCount > 1) {
      const firstColonIndex = cleaned.indexOf(":");
      cleaned = cleaned.substring(0, firstColonIndex + 1) + 
                cleaned.substring(firstColonIndex + 1).replace(/:/g, "");
    }
    if (!cleaned.includes(":") && cleaned.length >= 2) {
      cleaned = cleaned.substring(0, 2) + ":" + cleaned.substring(2);
    }
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

  const organizeWeeksBySeasonAndMonth = () => {
    const organized = {};
    
    weeks.forEach(week => {
      const season = week.season || '2025-26';
      const month = week.month;
      
      if (!organized[season]) {
        organized[season] = {};
      }
      
      if (!organized[season][month]) {
        organized[season][month] = [];
      }
      
      organized[season][month].push(week);
    });
    
    return organized;
  };

  const organizedWeeks = organizeWeeksBySeasonAndMonth();

  const getSelectedWeekDisplay = () => {
    if (!selectedWeek) return 'בחר שבוע';
    
    const monthLabel = months.find(m => m.value === selectedWeek.month)?.label || '';
    const seasonText = selectedWeek.season && selectedWeek.season !== '2025-26' ? ` (${selectedWeek.season})` : '';
    
    return `${selectedWeek.name} - ${monthLabel}${seasonText}`;
  };

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

      {/* בחירת שבוע - Dropdown מקונן */}
      <div className="card" style={{ position: 'relative', zIndex: 100 }}>
        <h3>בחר שבוע לניהול</h3>
        
        <div ref={dropdownRef} style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
          <div
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            style={{
              padding: '0.75rem',
              border: '1px solid #dee2e6',
              borderRadius: '4px',
              backgroundColor: 'white',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              userSelect: 'none'
            }}
          >
            <span>{getSelectedWeekDisplay()}</span>
            <span style={{ 
              fontSize: '12px',
              transition: 'transform 0.2s',
              transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)'
            }}>
              ▼
            </span>
          </div>

          {isDropdownOpen && (
            <div style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              width: '100%',
              marginTop: '4px',
              backgroundColor: 'white',
              border: '1px solid #dee2e6',
              borderRadius: '4px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              zIndex: 10000,
              maxHeight: 'none',
              overflow: 'visible'
            }}>
              {Object.keys(organizedWeeks).sort().reverse().map(season => (
                <div
                  key={season}
                  style={{ position: 'relative' }}
                  onMouseEnter={() => setHoveredSeason(season)}
                  onMouseLeave={() => setHoveredSeason(null)}
                >
                  <div style={{
                    padding: '0.75rem',
                    borderBottom: '1px solid #f0f0f0',
                    backgroundColor: hoveredSeason === season ? '#f8f9fa' : 'white',
                    cursor: 'pointer',
                    fontWeight: '500',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span>עונה {season}</span>
                    <span style={{ fontSize: '12px' }}>◀</span>
                  </div>

                  {hoveredSeason === season && (
                    <div 
                      style={{
                        position: 'absolute',
                        right: '100%',
                        top: 0,
                        width: '200px',
                        marginRight: '-2px',
                        backgroundColor: 'white',
                        border: '1px solid #dee2e6',
                        borderRadius: '4px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        zIndex: 10001,
                        maxHeight: 'none',
                        overflow: 'visible'
                      }}
                      onMouseEnter={() => setHoveredSeason(season)}
                    >
                      {Object.keys(organizedWeeks[season])
                        .sort((a, b) => parseInt(b) - parseInt(a))
                        .map(monthNum => {
                          const monthLabel = months.find(m => m.value === parseInt(monthNum))?.label || monthNum;
                          const monthKey = `${season}-${monthNum}`;
                          
                          return (
                            <div
                              key={monthKey}
                              style={{ position: 'relative' }}
                              onMouseEnter={() => setHoveredMonth(monthKey)}
                              onMouseLeave={() => setHoveredMonth(null)}
                            >
                              <div style={{
                                padding: '0.65rem 0.75rem',
                                borderBottom: '1px solid #f0f0f0',
                                backgroundColor: hoveredMonth === monthKey ? '#f8f9fa' : 'white',
                                cursor: 'pointer',
                                fontSize: '14px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                              }}>
                                <span>{monthLabel}</span>
                                <span style={{ fontSize: '11px' }}>◀</span>
                              </div>

                              {hoveredMonth === monthKey && (
                                <div 
                                  style={{
                                    position: 'absolute',
                                    right: '100%',
                                    top: 0,
                                    width: '250px',
                                    marginRight: '-2px',
                                    backgroundColor: 'white',
                                    border: '1px solid #dee2e6',
                                    borderRadius: '4px',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                    zIndex: 10002,
                                    maxHeight: 'none',
                                    overflow: 'visible'
                                  }}
                                  onMouseEnter={() => setHoveredMonth(monthKey)}
                                >
                                  {organizedWeeks[season][monthNum].map(week => (
                                    <div
                                      key={week._id}
                                      onClick={() => handleSelectWeek(week)}
                                      style={{
                                        padding: '0.65rem 0.75rem',
                                        borderBottom: '1px solid #f0f0f0',
                                        backgroundColor: selectedWeek?._id === week._id ? 'var(--accent-color)' : 'white',
                                        color: selectedWeek?._id === week._id ? 'white' : '#495057',
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        transition: 'background-color 0.2s'
                                      }}
                                      onMouseEnter={(e) => {
                                        if (selectedWeek?._id !== week._id) {
                                          e.currentTarget.style.backgroundColor = '#f8f9fa';
                                        }
                                      }}
                                      onMouseLeave={(e) => {
                                        if (selectedWeek?._id !== week._id) {
                                          e.currentTarget.style.backgroundColor = 'white';
                                        }
                                      }}
                                    >
                                      <span>{week.name}</span>
                                      <div style={{ display: 'flex', gap: '4px' }}>
                                        {week.locked && <span style={{ fontSize: '11px' }}>🔒</span>}
                                        {week.active && !week.locked && <span style={{ fontSize: '11px' }}>🟢</span>}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedWeek && (
          <div style={{ 
            padding: '1rem', 
            backgroundColor: '#f8f9fa', 
            borderRadius: '6px',
            marginTop: '1rem'
          }}>
            <div style={{ 
              display: 'flex', 
              gap: '0.5rem', 
              flexWrap: 'wrap',
              alignItems: 'center'
            }}>
              <strong style={{ marginLeft: '0.5rem' }}>
                נבחר: {selectedWeek.name}
              </strong>
              
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
            </div>
          </div>
        )}

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
      {selectedWeek && (
        <div className="card">
          <h3>הוסף משחק ל-{selectedWeek.name}</h3>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: '1 1 150px' }}>
              <label>ליגה:</label>
              <select
                value={newMatch.leagueId}
                onChange={(e) => setNewMatch({ ...newMatch, leagueId: e.target.value })}
                className="input"
                disabled={loadingLeagues}
              >
                {loadingLeagues ? (
                  <option>טוען ליגות...</option>
                ) : (
                  leagues.map(league => (
                    <option key={league._id} value={league._id}>
                      {league.name}
                    </option>
                  ))
                )}
              </select>
            </div>
            <div style={{ flex: '1 1 150px' }}>
              <label>קבוצת בית:</label>
              <input
                type="text"
                placeholder="לדוגמה: מכבי חיפה"
                value={newMatch.team1}
                onChange={(e) => setNewMatch({ ...newMatch, team1: e.target.value })}
                className="input"
              />
            </div>
            <div style={{ flex: '1 1 150px' }}>
              <label>קבוצת חוץ:</label>
              <input
                type="text"
                placeholder="לדוגמה: הפועל ת״א"
                value={newMatch.team2}
                onChange={(e) => setNewMatch({ ...newMatch, team2: e.target.value })}
                className="input"
              />
            </div>
            <div style={{ flex: '1 1 100px' }}>
              <label>תאריך (DD.MM):</label>
              <input
                type="text"
                placeholder="10.08"
                value={newMatch.date}
                onChange={(e) => setNewMatch({ ...newMatch, date: formatDateInput(e.target.value) })}
                className="input"
              />
            </div>
            <div style={{ flex: '1 1 100px' }}>
              <label>שעה (HH:MM):</label>
              <input
                type="text"
                placeholder="20:00"
                value={newMatch.time}
                onChange={(e) => setNewMatch({ ...newMatch, time: formatTimeInput(e.target.value) })}
                className="input"
              />
            </div>
            <button onClick={addMatch} className="btn btn-primary">
              ➕ הוסף משחק
            </button>
          </div>
        </div>
      )}

      {/* רשימת משחקים */}
      {selectedWeek && matches.length > 0 && (
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
                              onChange={(e) => {
                                const formatted = formatTimeInput(e.target.value);
                                setEditingMatchDetails({
                                  ...editingMatchDetails,
                                  time: formatted
                                });
                              }}
                              placeholder="HH:MM"
                              className="input"
                              maxLength="5"
                            />
                          </div>
                        </div>
                        
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
                      
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => handleEditMatch(match._id)}
                          className="btn btn-success"
                          style={{ fontSize: '14px' }}
                        >
                          💾 שמור שינויים
                        </button>
                        <button
                          onClick={() => setEditingMatchDetails(null)}
                          className="btn"
                          style={{ backgroundColor: '#6c757d', color: 'white' }}
                        >
                          ביטול
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '2fr 80px 30px 80px 2fr',
                        gap: '0.5rem',
                        alignItems: 'center',
                        marginBottom: '0.75rem'
                      }}>
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
                          style={{ 
                            width: '100%', 
                            textAlign: 'center',
                            fontSize: '16px',
                            fontWeight: 'bold'
                          }}
                          className="input"
                          placeholder="0"
                          disabled={hasResult}
                        />
                        
                        <div style={{ textAlign: 'center', fontSize: '18px', fontWeight: 'bold' }}>-</div>
                        
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
                          style={{ 
                            width: '100%', 
                            textAlign: 'center',
                            fontSize: '16px',
                            fontWeight: 'bold'
                          }}
                          className="input"
                          placeholder="0"
                          disabled={hasResult}
                        />
                        
                        <div style={{ textAlign: 'center', fontWeight: '500' }}>
                          {match.team2} (חוץ)
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', alignItems: 'center' }}>
                        {!hasResult ? (
                          <button
                            onClick={() => updateMatchResult(match._id, currentResult.team1Goals, currentResult.team2Goals)}
                            className="btn btn-success"
                            style={{ fontSize: '14px' }}
                            disabled={!currentResult.team1Goals && !currentResult.team2Goals}
                          >
                            💾 שמור תוצאה
                          </button>
                        ) : (
                          <div style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: '#d4edda',
                            color: '#155724',
                            borderRadius: '4px',
                            fontWeight: 'bold'
                          }}>
                            ✓ תוצאה סופית: {match.result.team1Goals}-{match.result.team2Goals}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* דיאלוג אישור הפעלת שבוע */}
      {showActivationDialog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100000
        }}>
          <div className="card" style={{
            maxWidth: '500px',
            width: '90%',
            margin: '1rem'
          }}>
            <h3 style={{ marginBottom: '1rem' }}>🏆 הפעלת שבוע</h3>
            
            <p style={{ marginBottom: '1.5rem', lineHeight: '1.6' }}>
              האם להפעיל את השבוע <strong>{selectedWeek?.name}</strong>?
              <br />
              השבוע ינעל אוטומטית בזמן המשחק הראשון.
            </p>

            <div style={{
              backgroundColor: '#f8f9fa',
              padding: '1rem',
              borderRadius: '8px',
              marginBottom: '1.5rem'
            }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: 'pointer',
                fontSize: '16px'
              }}>
                <input
                  type="checkbox"
                  checked={sendPushNotifications}
                  onChange={(e) => setSendPushNotifications(e.target.checked)}
                  style={{
                    width: '20px',
                    height: '20px',
                    cursor: 'pointer'
                  }}
                />
                <span style={{ flex: 1 }}>
                  <strong>📢 שלח התראות Push לכל המשתמשים</strong>
                  <div style={{ fontSize: '12px', color: '#666', marginTop: '0.25rem' }}>
                    ההתראה תכלול את שם השבוע ושעת הנעילה
                  </div>
                </span>
              </label>
              {sendPushNotifications && selectedWeek && matches.length > 0 && (() => {
                const earliestMatch = findEarliestMatch(matches);
                if (!earliestMatch) return null;
                
                // 🆕 השתמש ב-fullDate אם קיים
                let lockTime;
                if (earliestMatch.fullDate) {
                  lockTime = new Date(earliestMatch.fullDate);
                } else {
                  const [day, month] = earliestMatch.date.split('.');
                  const [hour, minute] = earliestMatch.time.split(':');
                  
                  const currentDate = new Date();
                  const currentYear = currentDate.getFullYear();
                  const currentMonth = currentDate.getMonth() + 1;
                  let year = currentYear;
                  if (currentMonth === 12 && parseInt(month) === 1) {
                    year = currentYear + 1;
                  }
                  
                  lockTime = new Date(year, parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute));
                }
                
                // שורה 1117 - תחליף:
                const lockTimeStr = `${earliestMatch.date} ${earliestMatch.time}`;
                
                return (
                  <div style={{
                    marginTop: '1rem',
                    padding: '0.75rem',
                    backgroundColor: '#fff',
                    border: '1px solid #dee2e6',
                    borderRadius: '6px'
                  }}>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                      💬 תוכן ההודעה שתישלח:
                    </div>
                    <div style={{
                      fontSize: '14px',
                      lineHeight: '1.5',
                      whiteSpace: 'pre-line',
                      color: '#212529'
                    }}>
                      ⚽ {selectedWeek.name} פתוח להימורים!{'\n'}🔒 נעילה: {lockTimeStr}
                    </div>
                  </div>
                );
              })()}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowActivationDialog(false);
                  setSendPushNotifications(true);
                }}
                className="btn"
                style={{
                  backgroundColor: '#6c757d',
                  color: 'white',
                  padding: '0.5rem 1rem'
                }}
              >
                ❌ ביטול
              </button>
              <button
                onClick={confirmActivateWeek}
                className="btn btn-success"
                style={{
                  padding: '0.5rem 1.5rem',
                  fontWeight: 'bold'
                }}
              >
                ✅ הפעל שבוע
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default WeeksManagement;