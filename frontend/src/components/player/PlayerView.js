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

      if (weeksData && weeksData.length > 0) {
        const activeUnlockedWeek = weeksData.find(w => {
          if (!w || !w.active || w.locked) return false;
          if (w.lockTime) {
            const lockTime = new Date(w.lockTime);
            const now = new Date();
            if (now >= lockTime) return false;
          }
          return true;
        });

        if (activeUnlockedWeek && activeUnlockedWeek._id) {
          setSelectedWeek(activeUnlockedWeek);
          await loadWeekData(activeUnlockedWeek._id);
        } else {
          setSelectedWeek(null);
          setMatches([]);
          setBets({});
        }
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

  const tabs = [
    { key: 'betting', label: 'הימורים', icon: '⚽' },
    { key: 'allbets', label: 'כל ההימורים', icon: '👥' },
    { key: 'leaderboard', label: 'טבלה', icon: '🏆' },
    { key: 'history', label: 'היסטוריה', icon: '📋' }
  ];

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
          width: '44px',
          height: '44px',
          border: '3px solid #f0f0f0',
          borderTop: '3px solid var(--theme-primary, #007bff)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
          marginBottom: '1rem'
        }}></div>
        <h2 style={{ color: '#888', fontSize: '1rem', fontWeight: '500' }}>טוען נתונים...</h2>

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

        {/* Tab Bar */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '4px',
          marginBottom: '0.75rem',
          padding: '4px',
          backgroundColor: '#f0f2f5',
          borderRadius: '14px',
          boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.06)'
        }}>
          {tabs.map(tab => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: '0.5rem 0.1rem',
                  border: 'none',
                  borderRadius: '11px',
                  backgroundColor: isActive ? '#fff' : 'transparent',
                  color: isActive ? 'var(--theme-primary, #007bff)' : '#888',
                  fontWeight: isActive ? '700' : '500',
                  fontSize: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                  WebkitAppearance: 'none',
                  touchAction: 'manipulation',
                  whiteSpace: 'nowrap',
                  margin: 0,
                  boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '2px',
                  lineHeight: 1.2
                }}
              >
                <span style={{ fontSize: '16px', lineHeight: 1 }}>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div style={{ animation: 'scaleIn 0.2s ease' }}>
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
    </div>
  );
}

export default PlayerView;
