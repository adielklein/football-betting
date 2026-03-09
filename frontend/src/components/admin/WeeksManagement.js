import React, { useState, useEffect, useRef } from 'react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

function WeeksManagement({ selectedWeek: parentSelectedWeek, onWeekSelect }) {
  const [weeks, setWeeks] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [matches, setMatches] = useState([]);
  const [newWeek, setNewWeek] = useState({ name: '', month: '', season: '2025-26' });
  const [newMatch, setNewMatch] = useState({ leagueId: '', team1: '', team2: '', date: '', time: '', oddsHome: '', oddsDraw: '', oddsAway: '' });
  const [editingMatch, setEditingMatch] = useState({});
  const [editingWeek, setEditingWeek] = useState(null);
  const [leagues, setLeagues] = useState([]);
  const [loadingLeagues, setLoadingLeagues] = useState(false);
  const [editingMatchDetails, setEditingMatchDetails] = useState(null);
  const [showActivationDialog, setShowActivationDialog] = useState(false);
  const [sendPushNotifications, setSendPushNotifications] = useState(true);
  const [notificationImage, setNotificationImage] = useState(null);
  const [customNotificationTitle, setCustomNotificationTitle] = useState('');
  const [customNotificationBody, setCustomNotificationBody] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [hoveredSeason, setHoveredSeason] = useState(null);
  const [hoveredMonth, setHoveredMonth] = useState(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    loadData();
  }, []);

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
      if (reversedWeeks.length > 0 && !selectedWeek) {
        const latestWeek = reversedWeeks[0];
        setSelectedWeek(latestWeek);
        if (onWeekSelect) onWeekSelect(latestWeek);
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
    if (onWeekSelect) onWeekSelect(week);
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
        body: JSON.stringify({ name: name.trim(), month: parseInt(month), season: season || '2025-26' })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update week');
      }
      const updatedWeek = await response.json();
      setWeeks(prevWeeks => prevWeeks.map(w => w._id === weekId ? updatedWeek : w));
      if (selectedWeek && selectedWeek._id === weekId) {
        setSelectedWeek(updatedWeek);
        if (onWeekSelect) onWeekSelect(updatedWeek);
      }
      setEditingWeek(null);
      alert('השבוע עודכן בהצלחה!');
    } catch (error) {
      console.error('Error updating week:', error);
      alert('שגיאה בעדכון השבוע: ' + error.message);
    }
  };

  const createWeek = async () => {
    if (!newWeek.name) { alert('יש להזין שם לשבוע'); return; }
    if (!newWeek.month) { alert('יש לבחור חודש'); return; }
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
    if (!selectedWeek || !selectedWeek._id) { alert('יש לבחור שבוע קודם'); return; }
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
    if (!selectedWeek || !selectedWeek._id) { alert('יש לבחור שבוע קודם'); return; }
    if (window.confirm(`האם אתה בטוח שברצונך למחוק את "${selectedWeek.name}"? פעולה זו תמחק גם את כל המשחקים וההימורים של השבוע!`)) {
      try {
        const response = await fetch(`${API_URL}/weeks/${selectedWeek._id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Failed to delete week');
        alert('השבוע נמחק בהצלחה');
        setSelectedWeek(null);
        setMatches([]);
        await loadWeeks();
        if (onWeekSelect) onWeekSelect(null);
      } catch (error) {
        console.error('שגיאה במחיקת שבוע:', error);
        alert('שגיאה במחיקת השבוע');
      }
    }
  };

  const findEarliestMatch = (matches) => {
    if (!matches || matches.length === 0) return null;
    return matches.reduce((earliest, match) => {
      let currentDate, earliestDate;
      if (match.fullDate) {
        currentDate = new Date(match.fullDate);
      } else {
        const [currentDay, currentMonth] = match.date.split('.');
        const [currentHour, currentMinute] = match.time.split(':');
        const now = new Date();
        let year = now.getFullYear();
        if (now.getMonth() + 1 === 12 && parseInt(currentMonth) === 1) year++;
        currentDate = new Date(year, parseInt(currentMonth) - 1, parseInt(currentDay), parseInt(currentHour), parseInt(currentMinute));
      }
      if (earliest.fullDate) {
        earliestDate = new Date(earliest.fullDate);
      } else {
        const [earliestDay, earliestMonth] = earliest.date.split('.');
        const [earliestHour, earliestMinute] = earliest.time.split(':');
        const now = new Date();
        let year = now.getFullYear();
        if (now.getMonth() + 1 === 12 && parseInt(earliestMonth) === 1) year++;
        earliestDate = new Date(year, parseInt(earliestMonth) - 1, parseInt(earliestDay), parseInt(earliestHour), parseInt(earliestMinute));
      }
      return currentDate < earliestDate ? match : earliest;
    });
  };

  const activateWeek = async () => {
    if (!selectedWeek || !selectedWeek._id || matches.length === 0) {
      alert('יש להוסיף משחקים לפני הפעלת השבוע');
      return;
    }
    const earliest = findEarliestMatch(matches);
    if (earliest) {
      const [d, m] = earliest.date.split('.');
      const [h, min] = earliest.time.split(':');
      const ft = `${d.padStart(2, '0')}/${m.padStart(2, '0')} ${h.padStart(2, '0')}:${min.padStart(2, '0')}`;
      setCustomNotificationTitle(`⚽ ${selectedWeek.name} פתוח להימורים!`);
      setCustomNotificationBody(`🔒 נעילה: ${ft}`);
    }
    setShowActivationDialog(true);
  };

  const uploadToImgBB = async (base64Image) => {
    try {
      console.log('📤 [ImgBB] Uploading image...');
      setUploadingImage(true);
      const base64Data = base64Image.split(',')[1];
      const sizeInBytes = Math.ceil(base64Data.length * 3 / 4);
      console.log('📏 [ImgBB] Image size:', Math.round(sizeInBytes / 1024), 'KB');
      if (sizeInBytes > 32 * 1024 * 1024) {
        throw new Error('התמונה גדולה מדי עבור ImgBB (מקסימום 32MB)');
      }
      const params = new URLSearchParams();
      params.append('image', base64Data);
      const response = await fetch('https://api.imgbb.com/1/upload?key=f706bcf744e5ee62e389284b874c696a', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params
      });
      const data = await response.json();
      console.log('📋 [ImgBB] Response:', JSON.stringify(data));
      if (!response.ok || !data.success) {
        const errorMsg = data.error?.message || data.error || `HTTP ${response.status}`;
        throw new Error(`ImgBB error: ${errorMsg}`);
      }
      console.log('✅ [ImgBB] Image uploaded successfully:', data.data.url);
      return data.data.url;
    } catch (error) {
      console.error('❌ [ImgBB] Upload failed:', error);
      throw error;
    } finally {
      setUploadingImage(false);
    }
  };

  const confirmActivateWeek = async () => {
    try {
      const earliestMatch = findEarliestMatch(matches);
      if (!earliestMatch || !earliestMatch.date || !earliestMatch.time) {
        alert('לא נמצא משחק תקין עם תאריך ושעה');
        return;
      }

      let lockTime;
      if (earliestMatch.fullDate) {
        lockTime = new Date(earliestMatch.fullDate);
      } else {
        const [day, month] = earliestMatch.date.split('.');
        const [hour, minute] = earliestMatch.time.split(':');
        const now = new Date();
        let year = now.getFullYear();
        if (now.getMonth() + 1 === 12 && parseInt(month) === 1) year++;
        lockTime = new Date(year, parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute));
      }

      const lockTimeISO = lockTime.toISOString();

      let imageUrl = null;
      if (notificationImage) {
        try {
          console.log('🖼️ Uploading notification image to ImgBB...');
          imageUrl = await uploadToImgBB(notificationImage);
          console.log('✅ Image URL ready:', imageUrl);
        } catch (error) {
          console.error('❌ Failed to upload image:', error);
          if (!window.confirm('שגיאה בהעלאת התמונה. להמשיך ללא תמונה?')) return;
        }
      }

      console.log('🔒 זמן נעילה (ישראל):', lockTime.toLocaleString('he-IL'));
      console.log('📤 נשלח לשרת (UTC):', lockTimeISO);
      console.log('💬 כותרת:', customNotificationTitle);
      console.log('💬 תוכן:', customNotificationBody);
      console.log('🖼️ תמונה:', imageUrl || 'ללא תמונה');

      const response = await fetch(`${API_URL}/weeks/${selectedWeek._id}/activate`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lockTime: lockTimeISO,
          sendNotifications: sendPushNotifications,
          notificationTitle: customNotificationTitle,
          notificationBody: customNotificationBody,
          imageUrl: imageUrl || undefined
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to activate week');
      }

      const result = await response.json();

      let successMessage = 'השבוע הופעל בהצלחה! הוא ינעל אוטומטית בזמן המשחק הראשון.';
      if (sendPushNotifications) {
        const notificationMessage = `${customNotificationTitle}\n${customNotificationBody}`;
        successMessage += `\n\n💬 תוכן ההודעה:\n"${notificationMessage}"`;
        if (imageUrl) successMessage += `\n🖼️ עם תמונה מצורפת`;
        if (result.notificationResult) {
          successMessage += `\n\n📢 התראות נשלחו ל-${result.notificationResult.sent} מכשירים`;
          if (result.notificationResult.users) successMessage += ` (${result.notificationResult.users} משתמשים)`;
          if (result.notificationResult.failed > 0) successMessage += `\n⚠️ ${result.notificationResult.failed} מכשירים נכשלו`;
        } else {
          successMessage += '\n\n⚠️ לא נשלחו התראות (אין משתמשים מנויים)';
        }
      }

      alert(successMessage);
      await loadData();

      const updatedWeek = weeks.find(w => w._id === selectedWeek._id);
      if (updatedWeek && onWeekSelect) onWeekSelect({ ...updatedWeek, active: true, lockTime });

      setShowActivationDialog(false);
      setSendPushNotifications(true);
      setNotificationImage(null);
      setCustomNotificationTitle('');
      setCustomNotificationBody('');
    } catch (error) {
      console.error('Error activating week:', error);
      alert('שגיאה בהפעלת השבוע: ' + error.message);
      setShowActivationDialog(false);
    }
  };

  const addMatch = async () => {
    if (!selectedWeek || !selectedWeek._id) { alert('יש לבחור שבוע קודם'); return; }
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
          time: newMatch.time,
          odds: (newMatch.oddsHome || newMatch.oddsDraw || newMatch.oddsAway) ? {
            homeWin: newMatch.oddsHome || undefined,
            draw: newMatch.oddsDraw || undefined,
            awayWin: newMatch.oddsAway || undefined
          } : undefined
        })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `שגיאה בהוספת משחק: ${response.status}`);
      }
      setNewMatch({
        leagueId: leagues.length > 0 ? leagues[0]._id : '',
        team1: '', team2: '', date: '', time: '',
        oddsHome: '', oddsDraw: '', oddsAway: ''
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
      const matchResponse = await fetch(`${API_URL}/matches/${matchId}/result`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team1Goals: parseInt(team1Goals) || 0, team2Goals: parseInt(team2Goals) || 0 })
      });
      if (!matchResponse.ok) throw new Error(`שגיאה בעדכון משחק: ${matchResponse.status}`);
      const scoresResponse = await fetch(`${API_URL}/scores/calculate/${selectedWeek._id}`, { method: 'POST' });
      if (scoresResponse.ok) {
        alert('תוצאה נשמרה והניקוד חושב מחדש!');
      } else {
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
          time: editingMatchDetails.time,
          odds: (editingMatchDetails.oddsHome || editingMatchDetails.oddsDraw || editingMatchDetails.oddsAway) ? {
            homeWin: editingMatchDetails.oddsHome || undefined,
            draw: editingMatchDetails.oddsDraw || undefined,
            awayWin: editingMatchDetails.oddsAway || undefined
          } : null
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
        const response = await fetch(`${API_URL}/matches/${matchId}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('שגיאה במחיקת המשחק');
        alert('✅ המשחק נמחק בהצלחה!');
        await loadWeekData(selectedWeek._id);
      } catch (error) {
        console.error('שגיאה במחיקת משחק:', error);
        alert('שגיאה במחיקת המשחק');
      }
    }
  };

  const deleteMatchResult = async (matchId) => {
    if (!window.confirm('האם אתה בטוח שברצונך למחוק את תוצאת המשחק?')) return;
    try {
      const response = await fetch(`${API_URL}/matches/${matchId}/result`, { method: 'DELETE' });
      if (!response.ok) throw new Error(`שגיאה במחיקת תוצאה: ${response.status}`);
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
      cleaned = cleaned.substring(0, firstDotIndex + 1) + cleaned.substring(firstDotIndex + 1).replace(/\./g, '');
    }
    if (cleaned.length === 2 && !cleaned.includes('.')) cleaned = cleaned + '.';
    if (cleaned.length > 5) cleaned = cleaned.substring(0, 5);
    return cleaned;
  };

  const formatTimeInput = (value) => {
    let cleaned = value.replace(/[^\d:]/g, '');
    const colonCount = (cleaned.match(/:/g) || []).length;
    if (colonCount > 1) {
      const firstColonIndex = cleaned.indexOf(':');
      cleaned = cleaned.substring(0, firstColonIndex + 1) + cleaned.substring(firstColonIndex + 1).replace(/:/g, '');
    }
    if (!cleaned.includes(':') && cleaned.length >= 2) cleaned = cleaned.substring(0, 2) + ':' + cleaned.substring(2);
    if (cleaned.length > 5) cleaned = cleaned.substring(0, 5);
    return cleaned;
  };

  const months = [
    { value: 1, label: 'ינואר' }, { value: 2, label: 'פברואר' }, { value: 3, label: 'מרץ' },
    { value: 4, label: 'אפריל' }, { value: 5, label: 'מאי' }, { value: 6, label: 'יוני' },
    { value: 7, label: 'יולי' }, { value: 8, label: 'אוגוסט' }, { value: 9, label: 'ספטמבר' },
    { value: 10, label: 'אוקטובר' }, { value: 11, label: 'נובמבר' }, { value: 12, label: 'דצמבר' }
  ];

  const seasons = ['2025-26', '2026-27', '2027-28'];

  const organizeWeeksBySeasonAndMonth = () => {
    const organized = {};
    weeks.forEach(week => {
      const season = week.season || '2025-26';
      const month = week.month;
      if (!organized[season]) organized[season] = {};
      if (!organized[season][month]) organized[season][month] = [];
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
            <select value={newWeek.month} onChange={(e) => setNewWeek({ ...newWeek, month: e.target.value })} className="input">
              <option value="">בחר חודש</option>
              {months.map(month => (
                <option key={month.value} value={month.value}>{month.label}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: '1 1 150px' }}>
            <label>עונה:</label>
            <select value={newWeek.season} onChange={(e) => setNewWeek({ ...newWeek, season: e.target.value })} className="input">
              {seasons.map(season => <option key={season} value={season}>{season}</option>)}
            </select>
          </div>
          <button onClick={createWeek} className="btn btn-primary">➕ צור שבוע</button>
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
            <span style={{ fontSize: '12px', transition: 'transform 0.2s', transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
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
              zIndex: 10000
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
                        zIndex: 10001
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
                                    zIndex: 10002
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
                                        alignItems: 'center'
                                      }}
                                      onMouseEnter={(e) => {
                                        if (selectedWeek?._id !== week._id) e.currentTarget.style.backgroundColor = '#f8f9fa';
                                      }}
                                      onMouseLeave={(e) => {
                                        if (selectedWeek?._id !== week._id) e.currentTarget.style.backgroundColor = 'white';
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
          <div style={{ padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '6px', marginTop: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <strong style={{ marginLeft: '0.5rem' }}>נבחר: {selectedWeek.name}</strong>
              {!selectedWeek.active && !selectedWeek.locked && (
                <button onClick={activateWeek} className="btn btn-success">▶️ הפעל שבוע</button>
              )}
              {selectedWeek.active && !selectedWeek.locked && (
                <span style={{ padding: '0.5rem', color: '#28a745', fontWeight: 'bold' }}>🟢 השבוע פעיל</span>
              )}
              {selectedWeek.locked && (
                <span style={{ padding: '0.5rem', color: '#dc3545', fontWeight: 'bold' }}>🔒 השבוע נעול</span>
              )}
              {selectedWeek.active && (
                <button onClick={deactivateWeek} className="btn" style={{ backgroundColor: '#ffc107', color: '#000' }}>⏸️ כבה שבוע</button>
              )}
              <button
                onClick={() => setEditingWeek(editingWeek === selectedWeek._id ? null : selectedWeek._id)}
                className="btn"
                style={{ backgroundColor: '#17a2b8', color: 'white' }}
              >
                ✏️ ערוך שם
              </button>
              <button onClick={deleteWeek} className="btn btn-danger">🗑️ מחק שבוע</button>
            </div>
          </div>
        )}

        {editingWeek === selectedWeek?._id && (
          <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#e9ecef', borderRadius: '4px' }}>
            <h4>עריכת שבוע</h4>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <div>
                <label>שם:</label>
                <input type="text" id="edit-week-name" defaultValue={selectedWeek.name} className="input" />
              </div>
              <div>
                <label>חודש:</label>
                <select id="edit-week-month" defaultValue={selectedWeek.month} className="input">
                  {months.map(month => <option key={month.value} value={month.value}>{month.label}</option>)}
                </select>
              </div>
              <div>
                <label>עונה:</label>
                <select id="edit-week-season" defaultValue={selectedWeek.season || '2025-26'} className="input">
                  {seasons.map(season => <option key={season} value={season}>{season}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => {
                  handleEditWeek(
                    selectedWeek._id,
                    document.getElementById('edit-week-name').value,
                    document.getElementById('edit-week-month').value,
                    document.getElementById('edit-week-season').value
                  );
                }}
                className="btn btn-success"
              >
                שמור
              </button>
              <button onClick={() => setEditingWeek(null)} className="btn" style={{ backgroundColor: '#6c757d', color: 'white' }}>ביטול</button>
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
              <select value={newMatch.leagueId} onChange={(e) => setNewMatch({ ...newMatch, leagueId: e.target.value })} className="input" disabled={loadingLeagues}>
                {loadingLeagues ? <option>טוען ליגות...</option> : leagues.map(league => (
                  <option key={league._id} value={league._id}>{league.name}</option>
                ))}
              </select>
            </div>
            <div style={{ flex: '1 1 150px' }}>
              <label>קבוצת בית:</label>
              <input type="text" placeholder="לדוגמה: מכבי חיפה" value={newMatch.team1} onChange={(e) => setNewMatch({ ...newMatch, team1: e.target.value })} className="input" />
            </div>
            <div style={{ flex: '1 1 150px' }}>
              <label>קבוצת חוץ:</label>
              <input type="text" placeholder='לדוגמה: הפועל ת"א' value={newMatch.team2} onChange={(e) => setNewMatch({ ...newMatch, team2: e.target.value })} className="input" />
            </div>
            <div style={{ flex: '1 1 100px' }}>
              <label>תאריך (DD.MM):</label>
              <input type="text" placeholder="10.08" value={newMatch.date} onChange={(e) => setNewMatch({ ...newMatch, date: formatDateInput(e.target.value) })} className="input" />
            </div>
            <div style={{ flex: '1 1 100px' }}>
              <label>שעה (HH:MM):</label>
              <input type="text" placeholder="20:00" value={newMatch.time} onChange={(e) => setNewMatch({ ...newMatch, time: formatTimeInput(e.target.value) })} className="input" />
            </div>
            <button onClick={addMatch} className="btn btn-primary">➕ הוסף משחק</button>
          </div>
          {/* יחסים (אופציונלי) */}
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '13px', color: '#666', fontWeight: 'bold' }}>📊 יחסים (אופציונלי):</span>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <label style={{ fontSize: '12px', color: '#888' }}>1:</label>
              <input type="number" step="0.1" min="1" placeholder="בית" value={newMatch.oddsHome} onChange={(e) => setNewMatch({ ...newMatch, oddsHome: e.target.value })} className="input" style={{ width: '70px', textAlign: 'center' }} />
              <label style={{ fontSize: '12px', color: '#888' }}>X:</label>
              <input type="number" step="0.1" min="1" placeholder="תיקו" value={newMatch.oddsDraw} onChange={(e) => setNewMatch({ ...newMatch, oddsDraw: e.target.value })} className="input" style={{ width: '70px', textAlign: 'center' }} />
              <label style={{ fontSize: '12px', color: '#888' }}>2:</label>
              <input type="number" step="0.1" min="1" placeholder="חוץ" value={newMatch.oddsAway} onChange={(e) => setNewMatch({ ...newMatch, oddsAway: e.target.value })} className="input" style={{ width: '70px', textAlign: 'center' }} />
            </div>
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
                  {/* כותרת המשחק */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{
                        padding: '2px 8px',
                        backgroundColor: match.leagueId?.color || match.color || '#6c757d',
                        color: 'white',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}>
                        {match.leagueId?.name || match.league || 'לא מוגדר'}
                      </span>
                      <span style={{ fontSize: '14px', color: '#666' }}>📅 {match.date} ⏰ {match.time}</span>
                      {match.odds && (match.odds.homeWin || match.odds.draw || match.odds.awayWin) && (
                        <span style={{ fontSize: '12px', color: '#fff', backgroundColor: '#ff9800', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                          📊 {match.odds.homeWin || '-'} / {match.odds.draw || '-'} / {match.odds.awayWin || '-'}
                        </span>
                      )}
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
                              time: match.time,
                              oddsHome: match.odds?.homeWin || '',
                              oddsDraw: match.odds?.draw || '',
                              oddsAway: match.odds?.awayWin || ''
                            })}
                            className="btn"
                            style={{ fontSize: '12px', padding: '4px 8px', backgroundColor: '#17a2b8', color: 'white' }}
                            title="ערוך פרטי משחק"
                          >
                            ✏️ ערוך
                          </button>
                          {hasResult && (
                            <button
                              onClick={() => deleteMatchResult(match._id)}
                              className="btn"
                              style={{ fontSize: '12px', padding: '4px 8px', backgroundColor: '#ffc107', color: '#000' }}
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
                    <div style={{ padding: '1rem', backgroundColor: 'white', borderRadius: '4px', border: '2px solid #17a2b8' }}>
                      <h4 style={{ marginBottom: '1rem', color: '#17a2b8' }}>✏️ עריכת פרטי משחק</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                        <div>
                          <label style={{ fontSize: '12px', color: '#666' }}>ליגה:</label>
                          <select value={editingMatchDetails.leagueId} onChange={(e) => setEditingMatchDetails({ ...editingMatchDetails, leagueId: e.target.value })} className="input">
                            <option value="">בחר ליגה</option>
                            {leagues.map(league => <option key={league._id} value={league._id}>{league.name}</option>)}
                          </select>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '12px', color: '#666' }}>תאריך:</label>
                            <input
                              type="text"
                              value={editingMatchDetails.date}
                              onChange={(e) => setEditingMatchDetails({ ...editingMatchDetails, date: formatDateInput(e.target.value) })}
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
                              onChange={(e) => setEditingMatchDetails({ ...editingMatchDetails, time: formatTimeInput(e.target.value) })}
                              placeholder="HH:MM"
                              className="input"
                              maxLength="5"
                            />
                          </div>
                        </div>
                        <div>
                          <label style={{ fontSize: '12px', color: '#666' }}>קבוצה ביתית:</label>
                          <input type="text" value={editingMatchDetails.team1} onChange={(e) => setEditingMatchDetails({ ...editingMatchDetails, team1: e.target.value })} className="input" />
                        </div>
                        <div>
                          <label style={{ fontSize: '12px', color: '#666' }}>קבוצה אורחת:</label>
                          <input type="text" value={editingMatchDetails.team2} onChange={(e) => setEditingMatchDetails({ ...editingMatchDetails, team2: e.target.value })} className="input" />
                        </div>
                      </div>
                      {/* יחסים בעריכה */}
                      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '13px', color: '#666', fontWeight: 'bold' }}>📊 יחסים:</span>
                        <label style={{ fontSize: '12px', color: '#888' }}>1:</label>
                        <input type="number" step="0.1" min="1" placeholder="בית" value={editingMatchDetails.oddsHome} onChange={(e) => setEditingMatchDetails({ ...editingMatchDetails, oddsHome: e.target.value })} className="input" style={{ width: '70px', textAlign: 'center' }} />
                        <label style={{ fontSize: '12px', color: '#888' }}>X:</label>
                        <input type="number" step="0.1" min="1" placeholder="תיקו" value={editingMatchDetails.oddsDraw} onChange={(e) => setEditingMatchDetails({ ...editingMatchDetails, oddsDraw: e.target.value })} className="input" style={{ width: '70px', textAlign: 'center' }} />
                        <label style={{ fontSize: '12px', color: '#888' }}>2:</label>
                        <input type="number" step="0.1" min="1" placeholder="חוץ" value={editingMatchDetails.oddsAway} onChange={(e) => setEditingMatchDetails({ ...editingMatchDetails, oddsAway: e.target.value })} className="input" style={{ width: '70px', textAlign: 'center' }} />
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button onClick={() => handleEditMatch(match._id)} className="btn btn-success" style={{ fontSize: '14px', padding: '6px 12px' }}>💾 שמור שינויים</button>
                        <button onClick={() => setEditingMatchDetails(null)} className="btn" style={{ fontSize: '14px', padding: '6px 12px', backgroundColor: '#6c757d', color: 'white' }}>❌ ביטול</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                        <div style={{ textAlign: 'center', fontWeight: '500' }}>{match.team1} (בית)</div>
                        <input
                          type="number" min="0" max="20"
                          value={currentResult.team1Goals}
                          onChange={(e) => setEditingMatch(prev => ({ ...prev, [match._id]: { ...currentResult, team1Goals: e.target.value } }))}
                          style={{ width: '50px', textAlign: 'center' }}
                          className="input"
                          placeholder="0"
                          disabled={hasResult && !isEditing}
                        />
                        <span style={{ fontSize: '18px', fontWeight: 'bold' }}>-</span>
                        <input
                          type="number" min="0" max="20"
                          value={currentResult.team2Goals}
                          onChange={(e) => setEditingMatch(prev => ({ ...prev, [match._id]: { ...currentResult, team2Goals: e.target.value } }))}
                          style={{ width: '50px', textAlign: 'center' }}
                          className="input"
                          placeholder="0"
                          disabled={hasResult && !isEditing}
                        />
                        <div style={{ textAlign: 'center', fontWeight: '500' }}>{match.team2} (חוץ)</div>
                        <div style={{ display: 'flex', gap: '0.5rem', marginLeft: '1rem' }}>
                          {isEditing && (
                            <button onClick={() => updateMatchResult(match._id, currentResult.team1Goals, currentResult.team2Goals)} className="btn btn-success" style={{ fontSize: '12px', padding: '4px 8px' }}>
                              שמור תוצאה
                            </button>
                          )}
                          {hasResult && !isEditing && (
                            <span style={{ padding: '4px 8px', backgroundColor: '#d4edda', color: '#155724', borderRadius: '4px', fontSize: '12px' }}>
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

      {/* דיאלוג אישור הפעלת שבוע */}
      {showActivationDialog && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="card" style={{
            maxWidth: '500px',
            width: '90%',
            margin: '1rem',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* תוכן גלילה */}
            <div style={{ overflowY: 'auto', flex: 1, padding: '0.25rem 0' }}>
              <h3 style={{ marginBottom: '1rem' }}>🏆 הפעלת שבוע</h3>

              <p style={{ marginBottom: '1.5rem', lineHeight: '1.6' }}>
                האם להפעיל את השבוע <strong>{selectedWeek?.name}</strong>?
                <br />
                השבוע ינעל אוטומטית בזמן המשחק הראשון.
              </p>

              {/* אופציה להתראות Push */}
              <div style={{
                backgroundColor: '#f8f9fa',
                padding: '1rem',
                borderRadius: '8px',
                marginBottom: sendPushNotifications ? '1rem' : '1.5rem'
              }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '16px' }}>
                  <input
                    type="checkbox"
                    checked={sendPushNotifications}
                    onChange={(e) => setSendPushNotifications(e.target.checked)}
                    style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                  />
                  <span style={{ flex: 1 }}>
                    <strong>📢 שלח התראות Push לכל המשתמשים</strong>
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '0.25rem' }}>
                      ההתראה תכלול את שם השבוע ושעת הנעילה
                    </div>
                  </span>
                </label>
              </div>

              {/* הגדרות נוספות לפוש */}
              {sendPushNotifications && (
                <div style={{ marginBottom: '1.5rem' }}>
                  {/* כותרת */}
                  <div style={{ marginBottom: '0.75rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 'bold', fontSize: '14px' }}>
                      📝 כותרת ההתראה:
                    </label>
                    <input
                      type="text"
                      value={customNotificationTitle}
                      onChange={(e) => setCustomNotificationTitle(e.target.value)}
                      placeholder={`⚽ ${selectedWeek?.name} פתוח להימורים!`}
                      className="input"
                      style={{ width: '100%', boxSizing: 'border-box' }}
                    />
                  </div>

                  {/* תוכן */}
                  <div style={{ marginBottom: '0.75rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 'bold', fontSize: '14px' }}>
                      💬 תוכן ההתראה:
                    </label>
                    <input
                      type="text"
                      value={customNotificationBody}
                      onChange={(e) => setCustomNotificationBody(e.target.value)}
                      placeholder="🔒 נעילה: DD/MM HH:MM"
                      className="input"
                      style={{ width: '100%', boxSizing: 'border-box' }}
                    />
                  </div>

                  {/* העלאת תמונה */}
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 'bold', fontSize: '14px' }}>
                      🖼️ תמונה להתראה (אופציונלי):
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (!file) return;
                        if (file.size > 10 * 1024 * 1024) {
                          alert('התמונה גדולה מדי! מקסימום 10MB');
                          e.target.value = '';
                          return;
                        }
                        const reader = new FileReader();
                        reader.onloadend = () => setNotificationImage(reader.result);
                        reader.readAsDataURL(file);
                      }}
                      className="input"
                      style={{ width: '100%', boxSizing: 'border-box' }}
                    />
                    {uploadingImage && (
                      <div style={{ fontSize: '12px', color: '#666', marginTop: '0.35rem' }}>⏳ מעלה תמונה...</div>
                    )}
                    {notificationImage && (
                      <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <img src={notificationImage} alt="preview" style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #ddd' }} />
                        <button
                          onClick={() => setNotificationImage(null)}
                          style={{ fontSize: '12px', color: '#dc3545', background: 'none', border: 'none', cursor: 'pointer' }}
                        >
                          ❌ הסר תמונה
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* כפתורים - sticky בתחתית */}
            <div style={{
              display: 'flex',
              gap: '0.5rem',
              justifyContent: 'flex-end',
              paddingTop: '1rem',
              borderTop: '1px solid #e9ecef',
              marginTop: '0.5rem'
            }}>
              <button
                onClick={() => {
                  setShowActivationDialog(false);
                  setSendPushNotifications(true);
                  setNotificationImage(null);
                  setCustomNotificationTitle('');
                  setCustomNotificationBody('');
                }}
                className="btn"
                style={{ backgroundColor: '#6c757d', color: 'white', padding: '0.5rem 1rem' }}
              >
                ❌ ביטול
              </button>
              <button
                onClick={confirmActivateWeek}
                className="btn btn-success"
                style={{ padding: '0.5rem 1.5rem', fontWeight: 'bold' }}
                disabled={uploadingImage}
              >
                {uploadingImage ? '⏳ מעלה תמונה...' : '✅ הפעל שבוע'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default WeeksManagement;
