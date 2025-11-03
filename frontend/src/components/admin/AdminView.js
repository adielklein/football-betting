import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import AdminHeader from './AdminHeader';
import WeeksManagement from './WeeksManagement';
import UsersManagement from './UsersManagement';
import BetsManagement from './BetsManagement';
import LeaguesManagement from './LeaguesManagement';
import PushManagement from './PushManagement'; // 🆕 הוספה
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

  // Shared props for all components
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

  return (
    <div>
      <AdminHeader user={user} onLogout={onLogout} />

      <div className="container">
        {/* Navigation Tabs */}
        <div style={{ 
          display: 'flex', 
          gap: '1rem', 
          marginBottom: '2rem',
          borderBottom: '1px solid #ddd',
          paddingBottom: '1rem',
          overflowX: 'auto',
          flexWrap: 'nowrap',
          WebkitOverflowScrolling: 'touch'
        }}>
          <button 
            onClick={() => setActiveTab('weeks')}
            className="btn"
            style={{ 
              backgroundColor: activeTab === 'weeks' ? '#007bff' : '#f8f9fa', 
              color: activeTab === 'weeks' ? 'white' : '#333',
              flexShrink: 0,
              whiteSpace: 'nowrap'
            }}
          >
            📅 ניהול שבועות
          </button>
          
          <button 
            onClick={() => setActiveTab('leagues')}
            className="btn"
            style={{ 
              backgroundColor: activeTab === 'leagues' ? '#007bff' : '#f8f9fa', 
              color: activeTab === 'leagues' ? 'white' : '#333',
              flexShrink: 0,
              whiteSpace: 'nowrap'
            }}
          >
            🏆 ניהול ליגות
          </button>
          
          <button 
            onClick={() => setActiveTab('users')}
            className="btn"
            style={{ 
              backgroundColor: activeTab === 'users' ? '#007bff' : '#f8f9fa', 
              color: activeTab === 'users' ? 'white' : '#333',
              flexShrink: 0,
              whiteSpace: 'nowrap'
            }}
          >
            👥 ניהול משתמשים
          </button>
          
          <button 
            onClick={() => setActiveTab('bets')}
            className="btn"
            style={{ 
              backgroundColor: activeTab === 'bets' ? '#007bff' : '#f8f9fa', 
              color: activeTab === 'bets' ? 'white' : '#333',
              flexShrink: 0,
              whiteSpace: 'nowrap'
            }}
          >
            🎯 עריכת הימורים
          </button>

          {/* 🆕 כפתור התראות חדש */}
          <button 
            onClick={() => setActiveTab('push')}
            className="btn"
            style={{ 
              backgroundColor: activeTab === 'push' ? '#007bff' : '#f8f9fa', 
              color: activeTab === 'push' ? 'white' : '#333',
              flexShrink: 0,
              whiteSpace: 'nowrap'
            }}
          >
            📢 התראות
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'weeks' && <WeeksManagement {...sharedProps} />}
        {activeTab === 'leagues' && <LeaguesManagement />}
        {activeTab === 'users' && <UsersManagement {...sharedProps} />}
        {activeTab === 'bets' && <BetsManagement {...sharedProps} />}
        {activeTab === 'push' && <PushManagement />} {/* 🆕 טאב התראות חדש */}
      </div>
    </div>
  );
}

export default AdminView;