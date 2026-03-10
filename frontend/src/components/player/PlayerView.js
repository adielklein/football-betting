import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { applyTheme } from '../../themes';
import PlayerHeader from './PlayerHeader';
import BettingInterface from './BettingInterface';
import Leaderboard from './Leaderboard';
import HistoryViewer from './HistoryViewer';
import AllBetsViewer from './AllBetsViewer';
import NotificationSettings from '../NotificationSettings';

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

  useEffect(() => {
    console.log('🎨 PlayerView: מחיל ערכת נושא למשתמש:', user);
    applyTheme(user);
  }, [user, user?.theme]);

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
      const playersOnly = leaderData.filter(entry => 
        entry.user && entry.user.role !== 'admin'
      );
      setLeaderboard(playersOnly);
      
      console.log('🏆 כל השבועות שהתקבלו:', weeksData);
      
      if (weeksData && weeksData.length > 0) {
        const activeUnlockedWeek = weeksData.find(w => {
          if (!w || !w.active || w.locked) {
            console.log(`🔍 שבוע "${w?.name}" - פעיל: ${w?.active}, נעול: ${w?.locked} - לא מתאים`);
            return false;
          }
          
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
        <NotificationSettings user={user} />
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '0.3rem',
          marginBottom: '0.75rem',
          padding: '0.25rem',
          backgroundColor: '#f0f0f0',
          borderRadius: '10px'
        }}>
          {[
            { key: 'betting', label: 'הימורים' },
            { key: 'allbets', label: 'כל ההימורים' },
            { key: 'leaderboard', label: 'טבלה' },
            { key: 'history', label: 'היסטוריה' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '0.5rem 0.15rem',
                border: 'none',
                borderRadius: '8px',
                backgroundColor: activeTab === tab.key ? '#007bff' : 'transparent',
                color: activeTab === tab.key ? 'white' : '#555',
                fontWeight: activeTab === tab.key ? '600' : '500',
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                WebkitAppearance: 'none',
                touchAction: 'manipulation',
                whiteSpace: 'nowrap',
                margin: 0
              }}
            >
              {tab.label}
            </button>
          ))}
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