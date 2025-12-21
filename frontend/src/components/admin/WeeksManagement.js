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

  useEffect(() => {
    loadData();
  }, []);

  // State עבור ה-dropdown המקונן
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [hoveredSeason, setHoveredSeason] = useState(null);
  const [hoveredMonth, setHoveredMonth] = useState(null);
  const dropdownRef = useRef(null);

  // סגירת dropdown בלחיצה מחוץ לרכיב
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ×¡× ×›×¨×•×Ÿ ×¢× ×”×©×‘×•×¢ ×”× ×‘×—×¨ ×ž×”××‘
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
      
      // ×‘×—×¨ ××ª ×”×©×‘×•×¢ ×”××—×¨×•×Ÿ (×”×—×“×© ×‘×™×•×ª×¨) ×›×‘×¨×™×¨×ª ×ž×—×“×œ
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
      alert('×©×’×™××” ×‘×˜×¢×™× ×ª ×”×©×‘×•×¢×•×ª');
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
    
    // עדכון גם את השבוע באב
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
      alert('×©× ×”×©×‘×•×¢ ×—×•×‘×”');
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
      alert('×”×©×‘×•×¢ ×¢×•×“×›×Ÿ ×‘×”×¦×œ×—×”!');
    } catch (error) {
      console.error('Error updating week:', error);
      alert('×©×’×™××” ×‘×¢×“×›×•×Ÿ ×”×©×‘×•×¢: ' + error.message);
    }
  };

  const createWeek = async () => {
    if (!newWeek.name) {
      alert('×™×© ×œ×”×–×™×Ÿ ×©× ×œ×©×‘×•×¢');
      return;
    }
    if (!newWeek.month) {
      alert('×™×© ×œ×‘×—×•×¨ ×—×•×“×©');
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
      alert('×©×‘×•×¢ ×—×“×© × ×•×¦×¨ ×‘×”×¦×œ×—×”!');
    } catch (error) {
      console.error('Error creating week:', error);
      alert('×©×’×™××” ×‘×™×¦×™×¨×ª ×”×©×‘×•×¢: ' + error.message);
    }
  };

  const deactivateWeek = async () => {
    if (!selectedWeek || !selectedWeek._id) {
      alert('×™×© ×œ×‘×—×•×¨ ×©×‘×•×¢ ×§×•×“×');
      return;
    }

    if (window.confirm(`×”×× ××ª×” ×‘×˜×•×— ×©×‘×¨×¦×•× ×š ×œ×›×‘×•×ª ××ª "${selectedWeek.name}"?`)) {
      try {
        const response = await fetch(`${API_URL}/weeks/${selectedWeek._id}/deactivate`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Failed to deactivate week');
        }

        alert('×”×©×‘×•×¢ ×›×•×‘×” ×‘×”×¦×œ×—×”. ×¢×›×©×™×• ××ª×” ×™×›×•×œ ×œ×¢×¨×•×š ××•×ª×•.');
        await loadData();
      } catch (error) {
        console.error('×©×’×™××” ×‘×›×™×‘×•×™ ×©×‘×•×¢:', error);
        alert('×©×’×™××” ×‘×›×™×‘×•×™ ×”×©×‘×•×¢: ' + error.message);
      }
    }
  };

  const deleteWeek = async () => {
    if (!selectedWeek || !selectedWeek._id) {
      alert('×™×© ×œ×‘×—×•×¨ ×©×‘×•×¢ ×§×•×“×');
      return;
    }

    if (window.confirm(`×”×× ××ª×” ×‘×˜×•×— ×©×‘×¨×¦×•× ×š ×œ×ž×—×•×§ ××ª "${selectedWeek.name}"? ×¤×¢×•×œ×” ×–×• ×ª×ž×—×§ ×’× ××ª ×›×œ ×”×ž×©×—×§×™× ×•×”×”×™×ž×•×¨×™× ×©×œ ×”×©×‘×•×¢!`)) {
      try {
        const response = await fetch(`${API_URL}/weeks/${selectedWeek._id}`, {
          method: 'DELETE'
        });

        if (!response.ok) throw new Error('Failed to delete week');

        alert('×”×©×‘×•×¢ × ×ž×—×§ ×‘×”×¦×œ×—×”');
        setSelectedWeek(null);
        setMatches([]);
        await loadWeeks();
        
        if (onWeekSelect) {
          onWeekSelect(null);
        }
      } catch (error) {
        console.error('×©×’×™××” ×‘×ž×—×™×§×ª ×©×‘×•×¢:', error);
        alert('×©×’×™××” ×‘×ž×—×™×§×ª ×”×©×‘×•×¢');
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
    alert('×™×© ×œ×”×•×¡×™×£ ×ž×©×—×§×™× ×œ×¤× ×™ ×”×¤×¢×œ×ª ×”×©×‘×•×¢');
    return;
  }

  // ×”×¦×’ ×“×™××œ×•×’ ××™×©×•×¨ ×¢× ××•×¤×¦×™×” ×œ×”×ª×¨××•×ª
  setShowActivationDialog(true);
};

const confirmActivateWeek = async () => {
  try {
    const earliestMatch = findEarliestMatch(matches);
    
    if (!earliestMatch || !earliestMatch.date || !earliestMatch.time) {
      alert('×œ× × ×ž×¦× ×ž×©×—×§ ×ª×§×™×Ÿ ×¢× ×ª××¨×™×š ×•×©×¢×”');
      return;
    }

    console.log('ðŸ† ×”×ž×©×—×§ ×”×›×™ ×ž×•×§×“×:', `${earliestMatch.team1} × ×’×“ ${earliestMatch.team2}`);
    console.log('ðŸ“… ×ª××¨×™×š ×”×ž×©×—×§ ×”×ž×•×§×“×:', earliestMatch.date);
    console.log('ðŸ• ×©×¢×ª ×”×ž×©×—×§ ×”×ž×•×§×“×:', earliestMatch.time);

    const [day, month] = earliestMatch.date.split('.');
    const [hour, minute] = earliestMatch.time.split(':');
    
    const year = new Date().getFullYear();
    const lockTime = new Date(year, parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute));
    const lockTimeISO = new Date(lockTime.getTime() ).toISOString();

    console.log('ðŸ”’ ×–×ž×Ÿ × ×¢×™×œ×” (×™×©×¨××œ):', lockTime.toLocaleString('he-IL'));
    console.log('ðŸ“¤ × ×©×œ×— ×œ×©×¨×ª (UTC):', lockTimeISO);

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

    // ×”×¦×’ ×”×•×“×¢×ª ×”×¦×œ×—×” ×¢× ×¤×¨×˜×™ ×”×”×ª×¨××•×ª
    let successMessage = '×”×©×‘×•×¢ ×”×•×¤×¢×œ ×‘×”×¦×œ×—×”! ×”×•× ×™× ×¢×œ ××•×˜×•×ž×˜×™×ª ×‘×–×ž×Ÿ ×”×ž×©×—×§ ×”×¨××©×•×Ÿ.';
    
    // ×‘× ×™×™×ª ×ª×•×›×Ÿ ×”×”×•×“×¢×” (×ª×ž×™×“ ×›×©× ×‘×—×¨×” ×”××•×¤×¦×™×” ×œ×©×œ×•×—)
    if (sendPushNotifications) {
      const notificationMessage = `âš½ ${selectedWeek.name} ×¤×ª×•×— ×œ×”×™×ž×•×¨×™×!\nðŸ”’ × ×¢×™×œ×”: ${lockTime.toLocaleString('he-IL', { 
        day: '2-digit', 
        month: '2-digit', 
        hour: '2-digit', 
        minute: '2-digit' 
      })}`;
      
      successMessage += `\n\nðŸ’¬ ×ª×•×›×Ÿ ×”×”×•×“×¢×”:\n"${notificationMessage}"`;
      
      if (result.notificationResult) {
        successMessage += `\n\nðŸ“¢ ×”×ª×¨××•×ª × ×©×œ×—×• ×œ-${result.notificationResult.sent} ×ž×©×ª×ž×©×™×`;
        if (result.notificationResult.failed > 0) {
          successMessage += `\nâš ï¸ ${result.notificationResult.failed} ×”×ª×¨××•×ª × ×›×©×œ×•`;
        }
      } else {
        successMessage += '\n\nâš ï¸ ×œ× × ×©×œ×—×• ×”×ª×¨××•×ª (××™×Ÿ ×ž×©×ª×ž×©×™× ×ž× ×•×™×™×)';
      }
    }

    alert(successMessage);
    
    await loadData();
    
    // ×¢×“×›×Ÿ ×’× ××ª ×”×©×‘×•×¢ ×‘××‘
    const updatedWeek = weeks.find(w => w._id === selectedWeek._id);
    if (updatedWeek && onWeekSelect) {
      onWeekSelect({ ...updatedWeek, active: true, lockTime });
    }
    
    // ×¡×’×•×¨ ××ª ×”×“×™××œ×•×’
    setShowActivationDialog(false);
    setSendPushNotifications(true); // ××¤×¡ ×œ×‘×¨×™×¨×ª ×ž×—×“×œ
  } catch (error) {
    console.error('Error activating week:', error);
    alert('×©×’×™××” ×‘×”×¤×¢×œ×ª ×”×©×‘×•×¢: ' + error.message);
    setShowActivationDialog(false);
  }
};

  const addMatch = async () => {
    if (!selectedWeek || !selectedWeek._id) {
      alert('×™×© ×œ×‘×—×•×¨ ×©×‘×•×¢ ×§×•×“×');
      return;
    }

    if (!newMatch.leagueId || !newMatch.team1 || !newMatch.team2 || !newMatch.date || !newMatch.time) {
      alert('×™×© ×œ×ž×œ× ××ª ×›×œ ×”×©×“×•×ª');
      return;
    }

    if (!newMatch.date.match(/^\d{1,2}\.\d{1,2}$/)) {
      alert('×¤×•×¨×ž×˜ ×ª××¨×™×š ×œ× × ×›×•×Ÿ. ×”×©×ª×ž×© ×‘×¤×•×¨×ž×˜ DD.MM (×œ×“×•×’×ž×”: 10.08)');
      return;
    }

    if (!newMatch.time.match(/^\d{1,2}:\d{2}$/)) {
      alert('×¤×•×¨×ž×˜ ×©×¢×” ×œ× × ×›×•×Ÿ. ×”×©×ª×ž×© ×‘×¤×•×¨×ž×˜ HH:MM (×œ×“×•×’×ž×”: 20:00)');
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
        throw new Error(error.message || `×©×’×™××” ×‘×”×•×¡×¤×ª ×ž×©×—×§: ${response.status}`);
      }

      setNewMatch({ 
        leagueId: leagues.length > 0 ? leagues[0]._id : '', 
        team1: '', 
        team2: '', 
        date: '', 
        time: '' 
      });
      await loadWeekData(selectedWeek._id);
      alert('×ž×©×—×§ × ×•×¡×£ ×‘×”×¦×œ×—×”!');
    } catch (error) {
      console.error('×©×’×™××” ×‘×”×•×¡×¤×ª ×ž×©×—×§:', error);
      alert('×©×’×™××” ×‘×”×•×¡×¤×ª ×”×ž×©×—×§: ' + error.message);
    }
  };

  const updateMatchResult = async (matchId, team1Goals, team2Goals) => {
    if (!matchId) return;
    
    try {
      console.log('ðŸŽ¯ ×ž×¢×“×›×Ÿ ×ª×•×¦××ª ×ž×©×—×§:', { matchId, team1Goals, team2Goals });
      
      const matchResponse = await fetch(`${API_URL}/matches/${matchId}/result`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          team1Goals: parseInt(team1Goals) || 0, 
          team2Goals: parseInt(team2Goals) || 0 
        })
      });

      if (!matchResponse.ok) {
        throw new Error(`×©×’×™××” ×‘×¢×“×›×•×Ÿ ×ž×©×—×§: ${matchResponse.status}`);
      }

      const updatedMatch = await matchResponse.json();
      console.log('âœ… ×ª×•×¦××ª ×ž×©×—×§ ×¢×•×“×›× ×”:', updatedMatch);

      console.log('ðŸ§® ×ž×—×©×‘ × ×™×§×•×“ ×ž×—×“×© ×œ×›×œ ×”×©×—×§× ×™×...');
      
      const scoresResponse = await fetch(`${API_URL}/scores/calculate/${selectedWeek._id}`, {
        method: 'POST'
      });

      if (scoresResponse.ok) {
        console.log('âœ… × ×™×§×•×“ ×—×•×©×‘ ×ž×—×“×© ×‘×”×¦×œ×—×”');
        alert('×ª×•×¦××” × ×©×ž×¨×” ×•×”× ×™×§×•×“ ×—×•×©×‘ ×ž×—×“×©!');
      } else {
        console.log('âš ï¸ ×”×ª×•×¦××” × ×©×ž×¨×” ××‘×œ ×”×™×ª×” ×‘×¢×™×” ×‘×—×™×©×•×‘ ×”× ×™×§×•×“');
        alert('×”×ª×•×¦××” × ×©×ž×¨×” ××‘×œ ×”×™×ª×” ×‘×¢×™×” ×‘×—×™×©×•×‘ ×”× ×™×§×•×“');
      }

      await loadWeekData(selectedWeek._id);
      
    } catch (error) {
      console.error('Error updating result:', error);
      alert('×©×’×™××” ×‘×¢×“×›×•×Ÿ ×”×ª×•×¦××”');
    }
  };

  // ×¤×•× ×§×¦×™×” ×œ×¢×¨×™×›×ª ×¤×¨×˜×™ ×ž×©×—×§
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
        throw new Error(error.message || '×©×’×™××” ×‘×¢×“×›×•×Ÿ ×”×ž×©×—×§');
      }

      alert('âœ… ×”×ž×©×—×§ ×¢×•×“×›×Ÿ ×‘×”×¦×œ×—×”!');
      setEditingMatchDetails(null);
      await loadWeekData(selectedWeek._id);
    } catch (error) {
      console.error('×©×’×™××” ×‘×¢×“×›×•×Ÿ ×ž×©×—×§:', error);
      alert('×©×’×™××” ×‘×¢×“×›×•×Ÿ ×”×ž×©×—×§: ' + error.message);
    }
  };

  // ×¤×•× ×§×¦×™×” ×œ×ž×—×™×§×ª ×ž×©×—×§
  const handleDeleteMatch = async (matchId, matchName) => {
    if (window.confirm(`×”×× ××ª×” ×‘×˜×•×— ×©×‘×¨×¦×•× ×š ×œ×ž×—×•×§ ××ª ×”×ž×©×—×§:\n${matchName}?`)) {
      try {
        const response = await fetch(`${API_URL}/matches/${matchId}`, {
          method: 'DELETE'
        });

        if (!response.ok) {
          throw new Error('×©×’×™××” ×‘×ž×—×™×§×ª ×”×ž×©×—×§');
        }

        alert('âœ… ×”×ž×©×—×§ × ×ž×—×§ ×‘×”×¦×œ×—×”!');
        await loadWeekData(selectedWeek._id);
      } catch (error) {
        console.error('×©×’×™××” ×‘×ž×—×™×§×ª ×ž×©×—×§:', error);
        alert('×©×’×™××” ×‘×ž×—×™×§×ª ×”×ž×©×—×§');
      }
    }
  };

  // ×¤×•× ×§×¦×™×” ×œ×ž×—×™×§×ª ×ª×•×¦××ª ×ž×©×—×§
  const deleteMatchResult = async (matchId) => {
    if (!window.confirm('×”×× ××ª×” ×‘×˜×•×— ×©×‘×¨×¦×•× ×š ×œ×ž×—×•×§ ××ª ×ª×•×¦××ª ×”×ž×©×—×§?')) {
      return;
    }
    
    try {
      console.log('ðŸ—‘ï¸ ×ž×•×—×§ ×ª×•×¦××ª ×ž×©×—×§:', matchId);
      
      const response = await fetch(`${API_URL}/matches/${matchId}/result`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`×©×’×™××” ×‘×ž×—×™×§×ª ×ª×•×¦××”: ${response.status}`);
      }

      alert('âœ… ×”×ª×•×¦××” × ×ž×—×§×” ×‘×”×¦×œ×—×”!');
      
      // × ×§×” ×’× ××ª ×”×˜×•×¤×¡ ×”×ž×§×•×ž×™
      setEditingMatch(prev => {
        const newState = { ...prev };
        delete newState[matchId];
        return newState;
      });
      
      // ×¨×¢× ×Ÿ ××ª ×”× ×ª×•× ×™×
      await loadWeekData(selectedWeek._id);
      
    } catch (error) {
      console.error('×©×’×™××” ×‘×ž×—×™×§×ª ×ª×•×¦××”:', error);
      alert('×©×’×™××” ×‘×ž×—×™×§×ª ×”×ª×•×¦××”');
    }
  };

  // ×¤×•× ×§×¦×™×” ×œ×¤×•×¨×ž×˜ ×ª××¨×™×š ××•×˜×•×ž×˜×™
  const formatDateInput = (value) => {
    // ×”×¡×¨ ×›×œ ×ª×• ×©××™× ×• ×ž×¡×¤×¨ ××• × ×§×•×“×”
    let cleaned = value.replace(/[^\d.]/g, '');
    
    // ×× ×™×© ×™×•×ª×¨ ×ž× ×§×•×“×” ××—×ª, ×”×©××¨ ×¨×§ ××ª ×”×¨××©×•× ×”
    const dotCount = (cleaned.match(/\./g) || []).length;
    if (dotCount > 1) {
      const firstDotIndex = cleaned.indexOf('.');
      cleaned = cleaned.substring(0, firstDotIndex + 1) + 
                cleaned.substring(firstDotIndex + 1).replace(/\./g, '');
    }
    
    // ×”×•×¡×£ × ×§×•×“×” ××•×˜×•×ž×˜×™×ª ××—×¨×™ 2 ×¡×¤×¨×•×ª (×× ××™×Ÿ × ×§×•×“×” ×›×‘×¨)
    if (cleaned.length === 2 && !cleaned.includes('.')) {
      cleaned = cleaned + '.';
    }
    
    // ×”×’×‘×œ ××•×¨×š - ×ž×§×¡×™×ž×•× 5 ×ª×•×•×™× (DD.MM)
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
    { value: 1, label: '×™× ×•××¨' },
    { value: 2, label: '×¤×‘×¨×•××¨' },
    { value: 3, label: '×ž×¨×¥' },
    { value: 4, label: '××¤×¨×™×œ' },
    { value: 5, label: '×ž××™' },
    { value: 6, label: '×™×•× ×™' },
    { value: 7, label: '×™×•×œ×™' },
    { value: 8, label: '××•×’×•×¡×˜' },
    { value: 9, label: '×¡×¤×˜×ž×‘×¨' },
    { value: 10, label: '××•×§×˜×•×‘×¨' },
    { value: 11, label: '× ×•×‘×ž×‘×¨' },
    { value: 12, label: '×“×¦×ž×‘×¨' }
  ];

  const seasons = ['2025-26', '2026-27', '2027-28'];


  // פונקציה לארגון השבועות לפי עונה וחודש
  const organizeWeeksBySeasonAndMonth = () => {
    const organized = {};
    
    weeks.forEach(week => {
      const season = week.season || "2025-26";
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

  // פונקציה להצגת שם השבוע הנבחר
  const getSelectedWeekDisplay = () => {
    if (!selectedWeek) return "בחר שבוע";
    
    const monthLabel = months.find(m => m.value === selectedWeek.month)?.label || "";
    const seasonText = selectedWeek.season && selectedWeek.season !== "2025-26" ? ` (${selectedWeek.season})` : "";
    
    return `${selectedWeek.name} - ${monthLabel}${seasonText}`;
  };
  return (
    <div>
      <h2>× ×™×”×•×œ ×©×‘×•×¢×•×ª</h2>

      {/* ×™×¦×™×¨×ª ×©×‘×•×¢ ×—×“×© */}
      <div className="card">
        <h3>×¦×•×¨ ×©×‘×•×¢ ×—×“×©</h3>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 200px' }}>
            <label>×©× ×”×©×‘×•×¢:</label>
            <input
              type="text"
              placeholder="×œ×“×•×’×ž×”: ×©×‘×•×¢ 1"
              value={newWeek.name}
              onChange={(e) => setNewWeek({ ...newWeek, name: e.target.value })}
              className="input"
            />
          </div>
          
          <div style={{ flex: '1 1 150px' }}>
            <label>×—×•×“×©:</label>
            <select
              value={newWeek.month}
              onChange={(e) => setNewWeek({ ...newWeek, month: e.target.value })}
              className="input"
            >
              <option value="">×‘×—×¨ ×—×•×“×©</option>
              {months.map(month => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </div>
          
          <div style={{ flex: '1 1 150px' }}>
            <label>×¢×•× ×”:</label>
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
            âž• ×¦×•×¨ ×©×‘×•×¢
          </button>
        </div>
      </div>


      {/* בחירת שבוע - Dropdown מקונן עם Hover */}
      <div className="card">
        <h3>בחר שבוע לניהול</h3>
        
        <div ref={dropdownRef} style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
          {/* תיבת הבחירה הראשית */}
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

          {/* רשימת העונות */}
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
              zIndex: 1000,
              maxHeight: '400px',
              overflowY: 'auto'
            }}>
              {Object.keys(organizedWeeks).sort().reverse().map(season => (
                <div
                  key={season}
                  style={{ position: 'relative' }}
                  onMouseEnter={() => setHoveredSeason(season)}
                  onMouseLeave={() => {
                    setTimeout(() => {
                      if (hoveredSeason === season) setHoveredSeason(null);
                    }, 100);
                  }}
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

                  {/* רשימת החודשים */}
                  {hoveredSeason === season && (
                    <div style={{
                      position: 'absolute',
                      left: '100%',
                      top: 0,
                      width: '200px',
                      marginRight: '4px',
                      backgroundColor: 'white',
                      border: '1px solid #dee2e6',
                      borderRadius: '4px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                      zIndex: 1001,
                      maxHeight: '400px',
                      overflowY: 'auto'
                    }}>
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
                              onMouseLeave={() => {
                                setTimeout(() => {
                                  if (hoveredMonth === monthKey) setHoveredMonth(null);
                                }, 100);
                              }}
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

                              {/* רשימת השבועות */}
                              {hoveredMonth === monthKey && (
                                <div style={{
                                  position: 'absolute',
                                  left: '100%',
                                  top: 0,
                                  width: '250px',
                                  marginRight: '4px',
                                  backgroundColor: 'white',
                                  border: '1px solid #dee2e6',
                                  borderRadius: '4px',
                                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                  zIndex: 1002,
                                  maxHeight: '400px',
                                  overflowY: 'auto'
                                }}>
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

      {/* ×”×•×¡×£ ×ž×©×—×§ */}
      {selectedWeek && selectedWeek._id && (
        <div className="card">
          <h2>×”×•×¡×£ ×ž×©×—×§ ×œ{selectedWeek.name || '×”×©×‘×•×¢'}</h2>
          
          {loadingLeagues && (
            <div style={{ padding: '0.5rem', backgroundColor: '#fff3cd', borderRadius: '4px', marginBottom: '1rem' }}>
              â³ ×˜×•×¢×Ÿ ×œ×™×’×•×ª...
            </div>
          )}
          
          {!loadingLeagues && leagues.length === 0 && (
            <div style={{ padding: '0.5rem', backgroundColor: '#f8d7da', borderRadius: '4px', marginBottom: '1rem' }}>
              âš ï¸ ×œ× × ×ž×¦××• ×œ×™×’×•×ª ×¤×¢×™×œ×•×ª! ×¢×‘×•×¨ ×œ×˜××‘ "× ×™×”×•×œ ×œ×™×’×•×ª" ×œ×™×¦×™×¨×ª ×œ×™×’×•×ª ×—×“×©×•×ª.
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div>
              <label>×œ×™×’×”:</label>
              <select
                value={newMatch.leagueId}
                onChange={(e) => setNewMatch({ ...newMatch, leagueId: e.target.value })}
                className="input"
                disabled={leagues.length === 0}
              >
                {leagues.length === 0 ? (
                  <option value="">××™×Ÿ ×œ×™×’×•×ª ×–×ž×™× ×•×ª</option>
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
              <label>×§×‘×•×¦×ª ×‘×™×ª:</label>
              <input
                type="text"
                placeholder="×œ×“×•×’×ž×”: ×ž×›×‘×™ ×ª×œ ××‘×™×‘"
                value={newMatch.team1}
                onChange={(e) => setNewMatch({ ...newMatch, team1: e.target.value })}
                className="input"
              />
            </div>

            <div>
              <label>×§×‘×•×¦×ª ×—×•×¥:</label>
              <input
                type="text"
                placeholder="×œ×“×•×’×ž×”: ×”×¤×•×¢×œ ×ª×œ ××‘×™×‘"
                value={newMatch.team2}
                onChange={(e) => setNewMatch({ ...newMatch, team2: e.target.value })}
                className="input"
              />
            </div>

            <div>
              <label>×ª××¨×™×š (DD.MM):</label>
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
              <label>×©×¢×” (HH:MM):</label>
              <input
                type="text"
                placeholder="20:00"
                value={newMatch.time}
                maxLength="5"
                onChange={(e) => {
                  const formatted = formatTimeInput(e.target.value);
                  setNewMatch({ ...newMatch, time: formatted });
                }}
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
            âž• ×”×•×¡×£ ×ž×©×—×§
          </button>
        </div>
      )}

      {/* ×¨×©×™×ž×ª ×ž×©×—×§×™× */}
      {matches.length > 0 && (
        <div className="card">
          <h2>×ž×©×—×§×™ {selectedWeek.name}</h2>
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
                  {/* ×›×•×ª×¨×ª ×”×ž×©×—×§ */}
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
                        {match.leagueId?.name || match.league || '×œ× ×ž×•×’×“×¨'}
                      </span>
                      <span style={{ fontSize: '14px', color: '#666' }}>
                        ðŸ“… {match.date} â° {match.time}
                      </span>
                    </div>
                    
                    {/* ×›×¤×ª×•×¨×™ ×¤×¢×•×œ×” */}
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
                            title="×¢×¨×•×š ×¤×¨×˜×™ ×ž×©×—×§"
                          >
                            âœï¸ ×¢×¨×•×š
                          </button>
                          
                          {/* ×›×¤×ª×•×¨ ×ž×—×™×§×ª ×ª×•×¦××” - ×ž×•×¤×™×¢ ×¨×§ ×× ×™×© ×ª×•×¦××” */}
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
                              title="×ž×—×§ ×ª×•×¦××”"
                            >
                              ðŸ”„ ×ž×—×§ ×ª×•×¦××”
                            </button>
                          )}
                          
                          <button
                            onClick={() => handleDeleteMatch(match._id, `${match.team1} × ×’×“ ${match.team2}`)}
                            className="btn btn-danger"
                            style={{ fontSize: '12px', padding: '4px 8px' }}
                            title="×ž×—×§ ×ž×©×—×§"
                          >
                            ðŸ—‘ï¸
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* ×ž×¦×‘ ×¢×¨×™×›×ª ×¤×¨×˜×™× */}
                  {isEditingThis ? (
                    <div style={{ 
                      padding: '1rem', 
                      backgroundColor: 'white', 
                      borderRadius: '4px',
                      border: '2px solid #17a2b8'
                    }}>
                      <h4 style={{ marginBottom: '1rem', color: '#17a2b8' }}>
                        âœï¸ ×¢×¨×™×›×ª ×¤×¨×˜×™ ×ž×©×—×§
                      </h4>
                      
                      <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: '1fr 1fr',
                        gap: '1rem',
                        marginBottom: '1rem'
                      }}>
                        {/* ×œ×™×’×” */}
                        <div>
                          <label style={{ fontSize: '12px', color: '#666' }}>×œ×™×’×”:</label>
                          <select
                            value={editingMatchDetails.leagueId}
                            onChange={(e) => setEditingMatchDetails({
                              ...editingMatchDetails,
                              leagueId: e.target.value
                            })}
                            className="input"
                          >
                            <option value="">×‘×—×¨ ×œ×™×’×”</option>
                            {leagues.map(league => (
                              <option key={league._id} value={league._id}>
                                {league.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        {/* ×ª××¨×™×š ×•×©×¢×” ×¢× ×¤×•×¨×ž×˜ ××•×˜×•×ž×˜×™ */}
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '12px', color: '#666' }}>×ª××¨×™×š:</label>
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
                            <label style={{ fontSize: '12px', color: '#666' }}>×©×¢×”:</label>
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
                        
                        {/* ×§×‘×•×¦×•×ª */}
                        <div>
                          <label style={{ fontSize: '12px', color: '#666' }}>×§×‘×•×¦×” ×‘×™×ª×™×ª:</label>
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
                          <label style={{ fontSize: '12px', color: '#666' }}>×§×‘×•×¦×” ××•×¨×—×ª:</label>
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
                      
                      {/* ×›×¤×ª×•×¨×™ ×©×ž×™×¨×”/×‘×™×˜×•×œ */}
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => handleEditMatch(match._id)}
                          className="btn btn-success"
                          style={{ fontSize: '14px', padding: '6px 12px' }}
                        >
                          ðŸ’¾ ×©×ž×•×¨ ×©×™× ×•×™×™×
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
                          âŒ ×‘×™×˜×•×œ
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* ×ª×¦×•×’×ª ×”×ž×©×—×§ ×”×¨×’×™×œ×” + ×ª×•×¦××•×ª */
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ textAlign: 'center', fontWeight: '500' }}>
                          {match.team1} (×‘×™×ª)
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
                          {match.team2} (×—×•×¥)
                        </div>
                        
                        <div style={{ display: 'flex', gap: '0.5rem', marginLeft: '1rem' }}>
                          {isEditing && (
                            <button
                              onClick={() => updateMatchResult(match._id, currentResult.team1Goals, currentResult.team2Goals)}
                              className="btn btn-success"
                              style={{ fontSize: '12px', padding: '4px 8px' }}
                            >
                              ×©×ž×•×¨ ×ª×•×¦××”
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
                              âœ“ ×ª×•×¦××”: {match.result.team2Goals}-{match.result.team1Goals}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {isEditing && (
                        <div style={{ marginTop: '0.5rem', fontSize: '11px', color: '#666', textAlign: 'center' }}>
                          ×ª×¦×•×’×” ×ž×§×“×™×ž×”: {match.team1} {currentResult.team1Goals || 0} - {currentResult.team2Goals || 0} {match.team2}
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
            {/* ×“×™××œ×•×’ ××™×©×•×¨ ×”×¤×¢×œ×ª ×©×‘×•×¢ */} 
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
          zIndex: 1000
        }}>
          <div className="card" style={{
            maxWidth: '500px',
            width: '90%',
            margin: '1rem'
          }}>
            <h3 style={{ marginBottom: '1rem' }}>ðŸ† ×”×¤×¢×œ×ª ×©×‘×•×¢</h3>
            
            <p style={{ marginBottom: '1.5rem', lineHeight: '1.6' }}>
              ×”×× ×œ×”×¤×¢×™×œ ××ª ×”×©×‘×•×¢ <strong>{selectedWeek?.name}</strong>?
              <br />
              ×”×©×‘×•×¢ ×™× ×¢×œ ××•×˜×•×ž×˜×™×ª ×‘×–×ž×Ÿ ×”×ž×©×—×§ ×”×¨××©×•×Ÿ.
            </p>

            {/* ××•×¤×¦×™×” ×œ×”×ª×¨××•×ª Push */}
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
                  <strong>ðŸ“¢ ×©×œ×— ×”×ª×¨××•×ª Push ×œ×›×œ ×”×ž×©×ª×ž×©×™×</strong>
                  <div style={{ fontSize: '12px', color: '#666', marginTop: '0.25rem' }}>
                    ×”×”×ª×¨××” ×ª×›×œ×•×œ ××ª ×©× ×”×©×‘×•×¢ ×•×©×¢×ª ×”× ×¢×™×œ×”
                  </div>
                </span>
              </label>
              {/* ×ª×¦×•×’×” ×ž×§×“×™×ž×” ×©×œ ×ª×•×›×Ÿ ×”×”×•×“×¢×” */}
              {sendPushNotifications && selectedWeek && matches.length > 0 && (() => {
                const earliestMatch = findEarliestMatch(matches);
                if (!earliestMatch) return null;
                
                const [day, month] = earliestMatch.date.split('.');
                const [hour, minute] = earliestMatch.time.split(':');
                
                const currentDate = new Date();
                const currentYear = currentDate.getFullYear();
                const currentMonth = currentDate.getMonth() + 1;
                let year = currentYear;
                if (currentMonth === 12 && parseInt(month) === 1) {
                  year = currentYear + 1;
                }
                
                const lockTime = new Date(year, parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute));
                const lockTimeStr = lockTime.toLocaleString('he-IL', { 
                  day: '2-digit', 
                  month: '2-digit', 
                  hour: '2-digit', 
                  minute: '2-digit' 
                });
                
                return (
                  <div style={{
                    marginTop: '1rem',
                    padding: '0.75rem',
                    backgroundColor: '#fff',
                    border: '1px solid #dee2e6',
                    borderRadius: '6px'
                  }}>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                      ðŸ’¬ ×ª×•×›×Ÿ ×”×”×•×“×¢×” ×©×ª×™×©×œ×—:
                    </div>
                    <div style={{
                      fontSize: '14px',
                      lineHeight: '1.5',
                      whiteSpace: 'pre-line',
                      color: '#212529'
                    }}>
                      âš½ {selectedWeek.name} ×¤×ª×•×— ×œ×”×™×ž×•×¨×™×!{'\n'}ðŸ”’ × ×¢×™×œ×”: {lockTimeStr}
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
                âŒ ×‘×™×˜×•×œ
              </button>
              <button
                onClick={confirmActivateWeek}
                className="btn btn-success"
                style={{
                  padding: '0.5rem 1.5rem',
                  fontWeight: 'bold'
                }}
              >
                âœ… ×”×¤×¢×œ ×©×‘×•×¢
              </button>
            </div>
          </div>
        </div>
      )} 
    </div>
  );
}

export default WeeksManagement;