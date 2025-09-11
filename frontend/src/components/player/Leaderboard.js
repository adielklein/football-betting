import React, { useState, useEffect } from 'react';

function Leaderboard({ leaderboard, user }) {
  const [monthlyScores, setMonthlyScores] = useState([]);
  const [weeklyScores, setWeeklyScores] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(8); // אוגוסט כברירת מחדל
  const [selectedSeason, setSelectedSeason] = useState('2024-25');
  const [loading, setLoading] = useState(false);

  const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:5000/api'
    : 'https://football-betting-backend.onrender.com/api';

  useEffect(() => {
    loadScoresData();
  }, [selectedMonth, selectedSeason]);

  const loadScoresData = async () => {
    setLoading(true);
    try {
      console.log('🔍 טוען נתוני ניקוד לחודש:', selectedMonth, 'עונה:', selectedSeason);
      
      // טען את כל הנתונים של הניקוד
      const [scoresResponse, weeksResponse] = await Promise.all([
        fetch(`${API_URL}/scores/detailed`),
        fetch(`${API_URL}/weeks`)
      ]);

      let scoresData = [];
      let weeksData = [];

      if (scoresResponse.ok) {
        scoresData = await scoresResponse.json();
        console.log('🔍 נתוני ניקוד שהתקבלו:', scoresData);
      } else {
        console.error('❌ שגיאה בטעינת נתוני ניקוד');
      }
      
      if (weeksResponse.ok) {
        weeksData = await weeksResponse.json();
        console.log('🔍 נתוני שבועות שהתקבלו:', weeksData);
      } else {
        console.error('❌ שגיאה בטעינת נתוני שבועות');
      }

      // חשב ניקוד חודשי ושבועי
      calculateScores(scoresData, weeksData);
      
    } catch (error) {
      console.error('Error loading scores data:', error);
      // אם יש שגיאה, השתמש בנתונים הקיימים
      setMonthlyScores([]);
      setWeeklyScores([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateScores = (scoresData, weeksData) => {
    console.log('🔍 מחשב ניקוד לחודש:', selectedMonth, 'עונה:', selectedSeason);
    
    // קבץ לפי משתמש ועל פי חודש ועונה
    const userScores = {};
    const weeklyData = {};

    // סנן שבועות לפי החודש והעונה הנבחרים
    const monthWeeks = weeksData.filter(week => {
      const weekMonth = week.month || new Date(week.createdAt).getMonth() + 1;
      const weekSeason = week.season || '2024-25';
      
      console.log(`🔍 שבוע "${week.name}" - חודש: ${weekMonth}, עונה: ${weekSeason}, מחפש חודש: ${selectedMonth}, עונה: ${selectedSeason}`);
      
      return weekMonth === selectedMonth && weekSeason === selectedSeason;
    });
    
    console.log('🔍 שבועות שנמצאו לחודש', selectedMonth, 'ועונה', selectedSeason, ':', monthWeeks);
    
    const monthWeekIds = monthWeeks.map(week => week._id);

    // עבור על כל הניקוד
    scoresData.forEach(score => {
      if (!score.userId || score.userId.role === 'admin') return;
      
      const userId = score.userId._id;
      const userName = score.userId.name;
      const weekId = score.weekId._id || score.weekId; // תמיכה בשני פורמטים
      
      console.log('🔍 בודק ניקוד:', userName, 'שבוע ID:', weekId, 'ניקוד:', score.weeklyScore);
      
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
        console.log('✅ שבוע שייך לחודש ועונה, מוסיף ניקוד:', score.weeklyScore);
        userScores[userId].monthlyScore += score.weeklyScore || 0;
        
        // שמור נתונים שבועיים
        if (!weeklyData[weekId]) {
          const week = monthWeeks.find(w => w._id === weekId);
          weeklyData[weekId] = {
            weekName: week ? week.name : 'שבוע לא ידוע',
            players: {}
          };
        }
        
        weeklyData[weekId].players[userId] = {
          name: userName,
          score: score.weeklyScore || 0
        };
      } else {
        console.log('❌ שבוע לא שייך לחודש והעונה הנבחרים');
      }
    });

    console.log('🔍 ניקוד חודשי שחושב:', userScores);

    // ממן לפי ניקוד
    const monthlyArray = Object.values(userScores).sort((a, b) => b.monthlyScore - a.monthlyScore);
    setMonthlyScores(monthlyArray);

    // ארגן נתונים שבועיים
    const weeklyArray = Object.entries(weeklyData).map(([weekId, data]) => ({
      weekId,
      weekName: data.weekName,
      players: Object.values(data.players).sort((a, b) => b.score - a.score)
    }));
    
    console.log('🔍 נתונים שבועיים:', weeklyArray);
    setWeeklyScores(weeklyArray);
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
    <div>
      {/* בחירת עונה וחודש */}
      <div style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
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
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
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

      {/* לוח תוצאות כללי */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <h2>דירוג כללי - {selectedSeason}</h2>
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
            אין נתוני דירוג עדיין
          </div>
        )}
      </div>

      {/* לוח תוצאות חודשי */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <h2>דירוג חודש {months.find(m => m.value === selectedMonth)?.label} - {selectedSeason}</h2>
        {!loading && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', border: '1px solid #ddd' }}>
              <thead>
                <tr style={{ backgroundColor: '#e8f5e8' }}>
                  <th style={{ padding: '12px', textAlign: 'right' }}>מקום</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>שחקן</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>ניקוד חודשי</th>
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

      {/* לוח תוצאות שבועי */}
      <div className="card">
        <h2>פירוט שבועות - {months.find(m => m.value === selectedMonth)?.label} {selectedSeason}</h2>
        {!loading && weeklyScores.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {weeklyScores.map(week => (
              <div key={week.weekId} style={{ 
                border: '1px solid #ddd', 
                borderRadius: '8px', 
                padding: '1rem',
                backgroundColor: '#f9f9f9'
              }}>
                <h4 style={{ margin: '0 0 1rem 0', color: '#333' }}>{week.weekName}</h4>
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
                      {week.players.map((player, index) => (
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
              </div>
            ))}
          </div>
        )}
        
        {weeklyScores.length === 0 && !loading && (
          <div style={{ textAlign: 'center', color: '#666', padding: '2rem' }}>
            אין שבועות לחודש {months.find(m => m.value === selectedMonth)?.label} בעונת {selectedSeason}
          </div>
        )}
      </div>
    </div>
  );
}

export default Leaderboard;