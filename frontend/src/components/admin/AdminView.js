import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { runningCommit } from '../../services/appVersion';
import { api } from '../../services/api';
import AdminHeader from './AdminHeader';
import WeeksManagement from './WeeksManagement';
import UsersManagement from './UsersManagement';
import BetsManagement from './BetsManagement';
import LeaguesManagement from './LeaguesManagement';
import PushManagement from './PushManagement';
import AdminStats from './AdminStats';
import AuditLog from './AuditLog';
import ServerLogs from './ServerLogs';
import AdminToday from './AdminToday';
import SubTabs from './SubTabs';
import ErrorBoundary from '../ErrorBoundary';
import LoadingSpinner from './LoadingSpinner';
import useTabRoute from '../../services/useTabRoute';
import { syncPushSubscription } from '../../services/pushSync';

function AdminView({ user, onLogout }) {
  const [weeks, setWeeks] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [matches, setMatches] = useState([]);
  const [allBets, setAllBets] = useState([]);
  const [users, setUsers] = useState([]);
  // חמש לשוניות במקום שמונה: מה שקשור לשחקנים ב"שחקנים", וכל מה שהוא
  // תשתית (התראות, לוגים, פעולות, סטטיסטיקה) ב"מערכת". בקידומת admin כדי
  // שלא יתנגשו בלשוניות של השחקן
  const [activeTab, setActiveTab] = useTabRoute(
    ['today', 'week', 'players', 'leagues', 'system'],
    'today',
    { prefix: 'admin' }
  );

  // כתובות מהמבנה הקודם (מועדפים, קישורים בהתראות) ממשיכות להגיע לאותו מסך
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    const legacy = {
      weeks: 'week', users: 'players/users', bets: 'players/bets',
      push: 'system/push', stats: 'system/stats', audit: 'system/audit', logs: 'system/logs'
    };
    const m = location.pathname.match(/^\/admin\/(\w+)\/?$/);
    if (m && legacy[m[1]]) navigate(`/admin/${legacy[m[1]]}${location.search}`, { replace: true });
  }, [location.pathname, location.search, navigate]);
  const [loading, setLoading] = useState(true);
  const [auditCount, setAuditCount] = useState(0);

  const API_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:5000/api'
    : 'https://football-betting-backend.onrender.com/api';

  const isPrimaryAdmin = user?.username === 'adielklein';

  useEffect(() => {
    loadData();
  }, []);

  // גם מי שעובד רק במסך הניהול צריך שהמנוי שלו יסונכרן: זה מה שמרענן את
  // זיהוי המכשיר, וגם מה שנרשם מחדש כשהדפדפן ביטל את המנוי בשקט
  useEffect(() => {
    syncPushSubscription(user);
  }, [user]);

  // בדוק פעולות audit חדשות כל 30 שניות
  useEffect(() => {
    if (!isPrimaryAdmin) return;

    const checkAudit = async () => {
      try {
        const res = await fetch(`${API_URL}/audit?limit=50`);
        if (res.ok) {
          const logs = await res.json();
          // ספור פעולות של אדמינים אחרים מהיום
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const todayLogs = logs.filter(l =>
            l.adminName !== 'עדיאל קליין' && new Date(l.createdAt) >= today
          );
          setAuditCount(todayLogs.length);
        }
      } catch (e) { /* ignore */ }
    };

    checkAudit();
    const interval = setInterval(checkAudit, 30000);
    return () => clearInterval(interval);
  }, [isPrimaryAdmin, API_URL]);

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
    { key: 'today', label: 'היום', icon: '📋' },
    { key: 'week', label: 'שבוע', icon: '📅' },
    { key: 'players', label: 'שחקנים', icon: '👥' },
    { key: 'leagues', label: 'ליגות', icon: '🏆' },
    { key: 'system', label: 'מערכת', icon: '⚙️' }
  ];

  // לוגים, יומן פעולות וסטטיסטיקה עלולים להכיל פרטים על משתמשים ומכשירים -
  // רק למנהל הראשי. מנהל אחר רואה ב"מערכת" רק התראות
  const systemTabs = [
    { key: 'push', label: 'התראות', icon: '📢' },
    ...(isPrimaryAdmin ? [
      { key: 'logs', label: 'לוגים', icon: '📜' },
      { key: 'audit', label: 'פעולות', icon: '🔍', badge: auditCount },
      { key: 'stats', label: 'סטטיסטיקה', icon: '📊' }
    ] : [])
  ];
  const playerTabs = [
    { key: 'users', label: 'משתמשים', icon: '👥' },
    { key: 'bets', label: 'הימורים', icon: '🎯' }
  ];

  return (
    <div>
      <AdminHeader user={user} onLogout={onLogout} />

      <div className="container">
        {/* iOS-style segmented tab bar */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${tabs.length}, 1fr)`,
          gap: '3px',
          marginBottom: '0.75rem',
          padding: '3px',
          backgroundColor: 'var(--surface-3, #f0f2f5)',
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
                  backgroundColor: isActive ? 'var(--surface, #fff)' : 'transparent',
                  color: isActive ? 'var(--theme-primary, #007bff)' : 'var(--text-3, #888)',
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
                  lineHeight: 1.2,
                  position: 'relative'
                }}
              >
                <span style={{ fontSize: '15px', lineHeight: 1 }}>{tab.icon}</span>
                <span>{tab.label}</span>
                {tab.key === 'system' && isPrimaryAdmin && auditCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '2px',
                    right: '6px',
                    backgroundColor: '#ff3b30',
                    color: '#fff',
                    fontSize: '9px',
                    fontWeight: '700',
                    borderRadius: '50%',
                    width: '16px',
                    height: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    lineHeight: 1
                  }}>{auditCount}</span>
                )}
              </button>
            );
          })}
        </div>

        <div style={{ animation: 'scaleIn 0.2s ease' }}>
          {/* תקלה במסך אחד מוחלפת בהודעה, ולא מוחקת את כל מסך הניהול */}
          <ErrorBoundary name={`admin:${location.pathname.replace(/^\/admin\/?/, '') || 'today'}`} resetKey={location.pathname}>
          {activeTab === 'today' && <AdminToday />}
          {activeTab === 'week' && <WeeksManagement {...sharedProps} />}
          {activeTab === 'players' && (
            <SubTabs parent="players" tabs={playerTabs}>
              {(sub) => (sub === 'bets' ? <BetsManagement {...sharedProps} /> : <UsersManagement {...sharedProps} />)}
            </SubTabs>
          )}
          {activeTab === 'leagues' && <LeaguesManagement />}
          {activeTab === 'system' && (
            <SubTabs parent="system" tabs={systemTabs}>
              {(sub) => (
                <>
                  {sub === 'push' && <PushManagement />}
                  {sub === 'logs' && isPrimaryAdmin && <ServerLogs />}
                  {sub === 'audit' && isPrimaryAdmin && <AuditLog />}
                  {sub === 'stats' && isPrimaryAdmin && <AdminStats />}
                </>
              )}
            </SubTabs>
          )}
          </ErrorBoundary>
        </div>

        {/* חתימת הגרסה שרצה. אחרי דיפלוי, זו התשובה ל"האם אני כבר על
            הקוד החדש" - במקום לנחש לפי התנהגות */}
        {runningCommit() && (
          <div style={{
            textAlign: 'center', marginTop: '0.75rem',
            fontSize: '10px', color: 'var(--text-4, #c3c8d0)',
            fontFamily: 'monospace'
          }}>
            {runningCommit()}
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminView;
