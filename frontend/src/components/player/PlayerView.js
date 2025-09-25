import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { applyTheme } from '../../themes'; // 🎨 יבוא פונקציית ערכות נושא
import PlayerHeader from './PlayerHeader';
import BettingInterface from './BettingInterface';
import Leaderboard from './Leaderboard';
import HistoryViewer from './HistoryViewer';
import AllBetsViewer from './AllBetsViewer';

function PlayerView({ user, onLogout }) {
  const [weeks, setWeeks] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [matches, setMatches] = useState([]);
  const [bets, setBets] = useState({});
  const [leaderboard, setLeaderboard] = useState([]);
  const [activeTab, setActiveTab] = useState('betting');
  const [loading, setLoading] = useState(true);

  const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:5000/api'
    : 'https://football-betting-backend.onrender.com/api';

  // 🎨 החל ערכת נושא כשהקומפוננטה נטענת
  useEffect(() => {
    console.log('🎨 PlayerView: מחיל ערכת נושא למשתמש:', user);
    applyTheme(user);
  }, [user, user?.theme]); // תגיב גם לשינוי בערכת הנושא

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const [weeksData, leaderboardResponse] = await Promise.all([
        api.getWeeks(),
        fetch(`${API_URL}/scores/leaderboard`)
      ]);
      
      setWeeks(Array.isArray(weeksData) ? weeksData : []);
      
      const leaderData = await leaderboardResponse.json();
      // סנן רק שחקנים (לא אדמינים) בלוח התוצאות
      const playersOnly = leaderData.filter(entry => 
        entry.user && entry.user.role !== 'admin'
      );
      setLeaderboard(playersOnly);
      
      console.log('🏆 כל השבועות שהתקבלו:', weeksData);
      
      if (weeksData && weeksData.length > 0) {
        // חפש רק שבוע שהוא באמת פעיל ולא נעול ולא עבר זמן הנעילה
        const activeUnlockedWeek = weeksData.find(w => {
          if (!w || !w.active || w.locked) {
            console.log(`🔍 שבוע "${w?.name}" - פעיל: ${w?.active}, נעול: ${w?.locked} - לא מתאים`);
            return false;
          }
          
          // בדוק אם עבר זמן הנעילה
          if (w.lockTime) {
            const lockTime = new Date(w.lockTime);
            const now = new Date();
            if (now >= lockTime) {
              console.log(`🔍 שבוע "${w.name}" - עבר זמן הנעילה (${lockTime}) - לא מתאים`);
              return false;
            }
          }
          
          console.log(`✅ שבוע "${w.name}" - פעיל ולא נעול ולא עבר זמן - מתאים!`);
          return true;
        });
        
        console.log('🔍 שבוע פעיל אמיתי שנמצא:', activeUnlockedWeek);
        
        if (activeUnlockedWeek && activeUnlockedWeek._id) {
          setSelectedWeek(activeUnlockedWeek);
          await loadWeekData(activeUnlockedWeek._id);
          console.log('✅ נמצא שבוע פעיל אמיתי:', activeUnlockedWeek.name);
        } else {
          // אין שבוע פעיל אמיתי - אל תציג כלום בהימורים נוכחי
          console.log('⌫ אין שבוע פעיל אמיתי - לא מציג כלום בהימורים נוכחי');
          setSelectedWeek(null);
          setMatches([]);
          setBets({});
        }
      } else {
        console.log('⌫ אין שבועות בכלל');
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadWeekData = async (weekId) => {
    if (!weekId) return;
    
    try {
      const [matchesData, betsData] = await Promise.all([
        api.getMatches(weekId),
        api.getUserBets(user.id, weekId)
      ]);
      
      setMatches(Array.isArray(matchesData) ? matchesData : []);
      
      // Convert bets array to object for easier access
      const betsObj = {};
      if (Array.isArray(betsData)) {
        betsData.forEach(bet => {
          if (bet && bet.matchId && bet.matchId._id) {
            betsObj[bet.matchId._id] = bet.prediction;
          }
        });
      }
      setBets(betsObj);
    } catch (error) {
      console.error('Error loading week data:', error);
      setMatches([]);
      setBets({});
    }
  };

  // פונקציה לרענון הירוגים - תיקרא מעודכן תוצאות
  const refreshLeaderboard = async () => {
    try {
      const leaderboardResponse = await fetch(`${API_URL}/scores/leaderboard`);
      const leaderData = await leaderboardResponse.json();
      const playersOnly = leaderData.filter(entry => 
        entry.user && entry.user.role !== 'admin'
      );
      setLeaderboard(playersOnly);
      console.log('✅ לוח התוצאות רוענן');
    } catch (error) {
      console.error('Error refreshing leaderboard:', error);
    }
  };

  const handleBetUpdate = async () => {
    if (selectedWeek && selectedWeek._id) {
      await loadWeekData(selectedWeek._id);
      await refreshLeaderboard();
    }
  };

  const getUserTotalScore = () => {
    const userEntry = leaderboard.find(entry => entry.user._id === user.id);
    return userEntry ? userEntry.totalScore : 0;
  };

  if (loading) {
    return (
      <div style={{ 
        padding: '2rem', 
        textAlign: 'center',
        minHeight: '50vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #007bff',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginBottom: '1rem'
        }}></div>
        <h2 style={{ color: '#666', fontSize: '1.2rem' }}>טוען נתונים...</h2>
        
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div>
      <PlayerHeader 
        user={user} 
        selectedWeek={selectedWeek} 
        userScore={getUserTotalScore()} 
        onLogout={onLogout} 
      />

      <div className="container">
        <div style={{ 
          display: 'flex', 
          gap: '1rem', 
          marginBottom: '2rem',
          borderBottom: '1px solid #ddd',
          paddingBottom: '1rem'
        }}>
          <button 
            onClick={() => setActiveTab('betting')}
            className="btn"
            style={{ 
              backgroundColor: activeTab === 'betting' ? '#007bff' : '#f8f9fa', 
              color: activeTab === 'betting' ? 'white' : '#333' 
            }}
          >
            הימורים נוכחי
          </button>
          <button 
            onClick={() => setActiveTab('allbets')}
            className="btn"
            style={{ 
              backgroundColor: activeTab === 'allbets' ? '#007bff' : '#f8f9fa', 
              color: activeTab === 'allbets' ? 'white' : '#333' 
            }}
          >
            הימורי כולם
          </button>
          <button 
            onClick={() => setActiveTab('leaderboard')}
            className="btn"
            style={{ 
              backgroundColor: activeTab === 'leaderboard' ? '#007bff' : '#f8f9fa', 
              color: activeTab === 'leaderboard' ? 'white' : '#333' 
            }}
          >
            לוח תוצאות
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className="btn"
            style={{ 
              backgroundColor: activeTab === 'history' ? '#007bff' : '#f8f9fa', 
              color: activeTab === 'history' ? 'white' : '#333' 
            }}
          >
            היסטוריה
          </button>
        </div>

        {activeTab === 'betting' && (
          <BettingInterface 
            selectedWeek={selectedWeek}
            matches={matches}
            bets={bets}
            user={user}
            onBetUpdate={handleBetUpdate}
          />
        )}

        {activeTab === 'allbets' && (
          <AllBetsViewer 
            weeks={weeks}
            user={user}
          />
        )}

        {activeTab === 'leaderboard' && (
          <Leaderboard 
            leaderboard={leaderboard}
            user={user}
          />
        )}

        {activeTab === 'history' && (
          <HistoryViewer 
            weeks={weeks}
            user={user}
          />
        )}
      </div>
    </div>
  );
}

export default PlayerView;