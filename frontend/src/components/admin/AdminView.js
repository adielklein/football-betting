import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import AdminHeader from './AdminHeader';
import WeeksManagement from './WeeksManagement';
import UsersManagement from './UsersManagement';
import BetsManagement from './BetsManagement';
import LeaguesManagement from './LeaguesManagement';
import PushManagement from './PushManagement';
import LoadingSpinner from './LoadingSpinner';

function AdminView({ user, onLogout }) {
  const [weeks, setWeeks] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [matches, setMatches] = useState([]);
  const [allBets, setAllBets] = useState([]);
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('weeks');
  const [loading, setLoading] = useState(true);

  const API_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:5000/api'
    : 'https://football-betting-backend.onrender.com/api';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [weeksData, usersData] = await Promise.all([
        api.getWeeks(),
        api.getUsers()
      ]);

      setWeeks(Array.isArray(weeksData) ? weeksData.filter(w => w && w._id) : []);
      setUsers(Array.isArray(usersData) ? usersData.filter(u => u && u._id) : []);

      if (weeksData && weeksData.length > 0) {
        const activeWeek = weeksData.find(w => w && w.active) || weeksData[0];
        if (activeWeek && activeWeek._id) {
          setSelectedWeek(activeWeek);
          await loadWeekData(activeWeek._id);
        }
      }
    } catch (error) {
      console.error('שגיאה בטעינת נתונים:', error);
      setWeeks([]);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const loadWeekData = async (weekId) => {
    if (!weekId) return;

    try {
      const [matchesData, betsResponse] = await Promise.all([
        api.getMatches(weekId),
        fetch(`${API_URL}/bets/week/${weekId}`)
      ]);

      const betsData = await betsResponse.json();

      setMatches(Array.isArray(matchesData) ? matchesData : []);
      setAllBets(Array.isArray(betsData) ? betsData : []);
    } catch (error) {
      console.error('שגיאה בטעינת נתוני שבוע:', error);
      setMatches([]);
      setAllBets([]);
    }
  };

  const refreshData = async () => {
    await loadData();
    if (selectedWeek && selectedWeek._id) {
      await loadWeekData(selectedWeek._id);
    }
  };

  const handleWeekSelect = async (week) => {
    setSelectedWeek(week);
    if (week && week._id) {
      await loadWeekData(week._id);
    }
  };

  if (loading) {
    return <LoadingSpinner message="טוען נתונים..." />;
  }

  const sharedProps = {
    weeks,
    selectedWeek,
    matches,
    allBets,
    users,
    user,
    loadData: refreshData,
    loadWeekData,
    onWeekSelect: handleWeekSelect,
    setSelectedWeek,
    setMatches,
    setAllBets,
    setWeeks,
    setUsers
  };

  const tabs = [
    { key: 'weeks', label: 'שבועות', icon: '📅' },
    { key: 'leagues', label: 'ליגות', icon: '🏆' },
    { key: 'users', label: 'משתמשים', icon: '👥' },
    { key: 'bets', label: 'הימורים', icon: '🎯' },
    { key: 'push', label: 'התראות', icon: '📢' }
  ];

  return (
    <div>
      <AdminHeader user={user} onLogout={onLogout} />

      <div className="container">
        {/* iOS-style segmented tab bar */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '3px',
          marginBottom: '0.75rem',
          padding: '3px',
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
                  padding: '0.45rem 0.1rem',
                  border: 'none',
                  borderRadius: '11px',
                  backgroundColor: isActive ? '#fff' : 'transparent',
                  color: isActive ? 'var(--theme-primary, #007bff)' : '#888',
                  fontWeight: isActive ? '700' : '500',
                  fontSize: '11px',
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
                  gap: '1px',
                  lineHeight: 1.2
                }}
              >
                <span style={{ fontSize: '15px', lineHeight: 1 }}>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div style={{ animation: 'scaleIn 0.2s ease' }}>
          {activeTab === 'weeks' && <WeeksManagement {...sharedProps} />}
          {activeTab === 'leagues' && <LeaguesManagement />}
          {activeTab === 'users' && <UsersManagement {...sharedProps} />}
          {activeTab === 'bets' && <BetsManagement {...sharedProps} />}
          {activeTab === 'push' && <PushManagement />}
        </div>
      </div>
    </div>
  );
}

export default AdminView;
