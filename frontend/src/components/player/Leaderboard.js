import React, { useState, useEffect } from 'react';

function Leaderboard({ leaderboard, user }) {
  const [monthlyScores, setMonthlyScores] = useState([]);
  const [selectedWeekScores, setSelectedWeekScores] = useState([]);
  const [availableWeeks, setAvailableWeeks] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1); // ✅ החודש הנוכחי במקום אוגוסט קבוע
  const [selectedSeason, setSelectedSeason] = useState('2025-26');
  const [selectedWeekId, setSelectedWeekId] = useState('');
  const [loading, setLoading] = useState(false);

  const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:5000/api'
    : 'https://football-betting-backend.onrender.com/api';

  useEffect(() => {
    loadScoresData();
  }, [selectedMonth, selectedSeason]);

  useEffect(() => {
    if (selectedWeekId && availableWeeks.length > 0) {
      loadWeekScores();
    }
  }, [selectedWeekId]);

  const loadScoresData = async () => {
    setLoading(true);
    try {
      console.log('🔍 טוען נתוני ניקוד לחודש:', selectedMonth, 'עונה:', selectedSeason);
      
      // טען את כל הנתונים
      const [scoresResponse, weeksResponse] = await Promise.all([
        fetch(`${API_URL}/scores/detailed`),
        fetch(`${API_URL}/weeks`)
      ]);

      let scoresData = [];
      let weeksData = [];

      if (scoresResponse.ok) {
        scoresData = await scoresResponse.json();
        console.log('📊 נתוני ניקוד:', scoresData.slice(0, 3)); // הראה דוגמא
      }
      
      if (weeksResponse.ok) {
        weeksData = await weeksResponse.json();
        console.log('📅 נתוני שבועות:', weeksData);
      }

      // חישוב ניקוד חודשי ושבועות זמינים
      calculateMonthlyScores(scoresData, weeksData);
      
    } catch (error) {
      console.error('Error loading scores data:', error);
      setMonthlyScores([]);
      setAvailableWeeks([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateMonthlyScores = (scoresData, weeksData) => {
    console.log('🔍 מחשב ניקוד חודשי לחודש:', selectedMonth, 'עונה:', selectedSeason);
    
    // סנן שבועות לפי החודש והעונה הנבחרים
    const monthWeeks = weeksData.filter(week => {
      if (!week) return false;
      
      const weekMonth = week.month || new Date(week.createdAt).getMonth() + 1;
      const weekSeason = week.season || '2025-26'; // ברירת מחדל מעודכנת
      
      const matches = weekMonth === selectedMonth && weekSeason === selectedSeason;
      
      if (matches) {
        console.log(`✅ שבוע "${week.name}" נכלל - חודש: ${weekMonth}, עונה: ${weekSeason}`);
      } else {
        console.log(`❌ שבוע "${week.name}" לא נכלל - חודש: ${weekMonth}, עונה: ${weekSeason} (מחפש: ${selectedMonth}, ${selectedSeason})`);
      }
      
      return matches;
    });
    
    console.log('🔍 שבועות שנמצאו לחודש:', monthWeeks.map(w => w.name));
    setAvailableWeeks(monthWeeks);
    
    // ✅ קבע שבוע ראשון כברירת מחדל רק אם יש שבועות ואין שבוע נבחר כבר
    if (monthWeeks.length > 0 && !selectedWeekId) {
      console.log('🎯 קובע שבוע ראשון כברירת מחדל:', monthWeeks[0].name);
      setSelectedWeekId(monthWeeks[0]._id);
    } else if (monthWeeks.length === 0) {
      // אם אין שבועות לחודש הזה, נקה את הבחירה
      console.log('🧹 אין שבועות לחודש הזה, מנקה בחירה');
      setSelectedWeekId('');
      setSelectedWeekScores([]);
    }
    
    const monthWeekIds = monthWeeks.map(week => week._id);
    
    // חשב ניקוד חודשי
    const userScores = {};
    
    scoresData.forEach(score => {
      if (!score.userId || score.userId.role === 'admin') return;
      
      const userId = score.userId._id;
      const userName = score.userId.name;
      const weekId = score.weekId && score.weekId._id ? score.weekId._id : score.weekId;
      
      // אתחל משתמש אם לא קיים
      if (!userScores[userId]) {
        userScores[userId] = {
          name: userName,
          monthlyScore: 0,
          totalScore: score.totalScore || 0
        };
      }

      // אם השבוע שייך לחודש והעונה הנבחרים
      if (monthWeekIds.includes(weekId)) {
        console.log(`✅ מוסיף ניקוד ${score.weeklyScore} למשתמש ${userName} עבור שבוע ${weekId}`);
        userScores[userId].monthlyScore += score.weeklyScore || 0;
      }
    });

    console.log('🔍 ניקוד חודשי שחושב:', userScores);

    // ממן לפי ניקוד חודשי
    const monthlyArray = Object.values(userScores).sort((a, b) => b.monthlyScore - a.monthlyScore);
    setMonthlyScores(monthlyArray);
  };

  const loadWeekScores = async () => {
    if (!selectedWeekId) {
      setSelectedWeekScores([]);
      return;
    }

    try {
      console.log('🔍 טוען ניקוד לשבוע:', selectedWeekId);
      
      const betsResponse = await fetch(`${API_URL}/bets/week/${selectedWeekId}`);
      
      if (!betsResponse.ok) {
        console.error('❌ שגיאה בטעינת הימורי השבוע');
        setSelectedWeekScores([]);
        return;
      }

      const betsData = await betsResponse.json();
      console.log('📊 הימורי השבוע:', betsData);
      
      // חשב ניקוד לפי שחקן
      const weekScores = {};
      
      betsData.forEach(bet => {
        if (!bet.userId || bet.userId.role === 'admin') return;
        
        const userId = bet.userId._id;
        const userName = bet.userId.name;
        const points = bet.points || 0;
        
        if (!weekScores[userId]) {
          weekScores[userId] = {
            name: userName,
            score: 0
          };
        }
        
        weekScores[userId].score += points;
      });
      
      const weekScoresArray = Object.values(weekScores).sort((a, b) => b.score - a.score);
      console.log('🔍 ניקוד שבועי שחושב:', weekScoresArray);
      setSelectedWeekScores(weekScoresArray);
      
    } catch (error) {
      console.error('Error loading week scores:', error);
      setSelectedWeekScores([]);
    }
  };

  const months = [
    { value: 1, label: 'ינואר' }, { value: 2, label: 'פברואר' }, { value: 3, label: 'מרץ' },
    { value: 4, label: 'אפריל' }, { value: 5, label: 'מאי' }, { value: 6, label: 'יוני' },
    { value: 7, label: 'יולי' }, { value: 8, label: 'אוגוסט' }, { value: 9, label: 'ספטמבר' },
    { value: 10, label: 'אוקטובר' }, { value: 11, label: 'נובמבר' }, { value: 12, label: 'דצמבר' }
  ];

  const seasons = [
    { value: '2025-26', label: 'עונת 2025-26' },
    { value: '2026-27', label: 'עונת 2026-27' }
  ];

  return (
    <div>
      {/* ✅ בחירת עונה וחודש - ללא בחירת שבוע */}
      <div style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div>
          <label style={{ fontSize: '14px', color: '#666', marginRight: '0.5rem' }}>עונה:</label>
          <select 
            value={selectedSeason} 
            onChange={(e) => setSelectedSeason(e.target.value)}
            className="input"
            style={{ width: '150px' }}
          >
            {seasons.map(season => (
              <option key={season.value} value={season.value}>
                {season.label}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label style={{ fontSize: '14px', color: '#666', marginRight: '0.5rem' }}>חודש:</label>
          <select 
            value={selectedMonth} 
            onChange={(e) => {
              setSelectedMonth(parseInt(e.target.value));
              // ✅ כשמשנים חודש, נקה את בחירת השבוע כדי שיבחר אוטומטית
              setSelectedWeekId('');
            }}
            className="input"
            style={{ width: '150px' }}
          >
            {months.map(month => (
              <option key={month.value} value={month.value}>
                {month.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
          טוען נתונים...
        </div>
      )}

      {/* 1. הירוג חודשי - ראשון */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <h2>הירוג חודש {months.find(m => m.value === selectedMonth)?.label} - {selectedSeason}</h2>
        {!loading && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', border: '1px solid #ddd' }}>
              <thead>
                <tr style={{ backgroundColor: '#e8f5e8' }}>
                  <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #ddd' }}>מקום</th>
                  <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #ddd' }}>שחקן</th>
                  <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #ddd' }}>ניקוד חודשי</th>
                </tr>
              </thead>
              <tbody>
                {monthlyScores.map((player, index) => (
                  <tr key={player.name} style={{ 
                    backgroundColor: player.name === user.name ? '#e3f2fd' : 'transparent' 
                  }}>
                    <td style={{ padding: '12px' }}>
                      {index === 0 && '🥇 '}
                      {index === 1 && '🥈 '}
                      {index === 2 && '🥉 '}
                      {index + 1}
                    </td>
                    <td style={{ padding: '12px', fontWeight: '500' }}>
                      {player.name}
                      {player.name === user.name && <span style={{ color: '#1976d2', fontSize: '12px' }}> (אתה)</span>}
                    </td>
                    <td style={{ padding: '12px', fontWeight: 'bold', fontSize: '16px' }}>
                      {player.monthlyScore}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {monthlyScores.length === 0 && !loading && (
          <div style={{ textAlign: 'center', color: '#666', padding: '2rem' }}>
            אין נתונים לחודש {months.find(m => m.value === selectedMonth)?.label} בעונת {selectedSeason}
          </div>
        )}
      </div>

      {/* 2. ✅ פירוט שבוע נבחר - שני, עם בחירת השבוע כאן */}
      {availableWeeks.length > 0 && (
        <div className="card" style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2>פירוט שבוע</h2>
            {/* ✅ בחירת שבוע מועברת לכאן */}
            <div>
              <label style={{ fontSize: '14px', color: '#666', marginRight: '0.5rem' }}>שבוע:</label>
              <select 
                value={selectedWeekId} 
                onChange={(e) => setSelectedWeekId(e.target.value)}
                className="input"
                style={{ width: '200px' }}
              >
                {availableWeeks.map(week => (
                  <option key={week._id} value={week._id}>
                    {week.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedWeekId && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%' }}>
                <thead>
                  <tr style={{ backgroundColor: '#fff3cd' }}>
                    <th style={{ padding: '8px', textAlign: 'right', fontSize: '14px' }}>מקום</th>
                    <th style={{ padding: '8px', textAlign: 'right', fontSize: '14px' }}>שחקן</th>
                    <th style={{ padding: '8px', textAlign: 'right', fontSize: '14px' }}>ניקוד השבוע</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedWeekScores.map((player, index) => (
                    <tr key={player.name} style={{ 
                      backgroundColor: player.name === user.name ? '#e3f2fd' : 'transparent' 
                    }}>
                      <td style={{ padding: '8px', fontSize: '14px' }}>
                        {index === 0 && '🥇 '}
                        {index === 1 && '🥈 '}
                        {index === 2 && '🥉 '}
                        {index + 1}
                      </td>
                      <td style={{ padding: '8px', fontWeight: '500', fontSize: '14px' }}>
                        {player.name}
                        {player.name === user.name && <span style={{ color: '#1976d2', fontSize: '11px' }}> (אתה)</span>}
                      </td>
                      <td style={{ padding: '8px', fontWeight: 'bold', fontSize: '14px' }}>
                        {player.score}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {selectedWeekScores.length === 0 && selectedWeekId && (
            <div style={{ textAlign: 'center', color: '#666', padding: '1rem' }}>
              אין נתוני ניקוד לשבוע זה
            </div>
          )}
        </div>
      )}

      {/* 3. לוח תוצאות כללי - שלישי */}
      <div className="card">
        <h2>הירוג כללי - {selectedSeason}</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', border: '1px solid #ddd' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa' }}>
                <th style={{ padding: '12px', textAlign: 'right' }}>מקום</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>שחקן</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>ניקוד כללי</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((entry, index) => (
                <tr key={entry.user._id} style={{ 
                  backgroundColor: entry.user._id === user.id ? '#e3f2fd' : 'transparent' 
                }}>
                  <td style={{ padding: '12px' }}>
                    {index === 0 && '🥇 '}
                    {index === 1 && '🥈 '}
                    {index === 2 && '🥉 '}
                    {index + 1}
                  </td>
                  <td style={{ padding: '12px', fontWeight: '500' }}>
                    {entry.user.name}
                    {entry.user._id === user.id && <span style={{ color: '#1976d2', fontSize: '12px' }}> (אתה)</span>}
                  </td>
                  <td style={{ padding: '12px', fontWeight: 'bold', fontSize: '18px' }}>
                    {entry.totalScore}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {leaderboard.length === 0 && (
          <div style={{ textAlign: 'center', color: '#666', padding: '2rem' }}>
            אין נתוני הירוץ עדיין
          </div>
        )}
      </div>
    </div>
  );
}

export default Leaderboard;