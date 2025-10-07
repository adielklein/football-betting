const API_BASE_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:5000/api'
  : 'https://football-betting-backend.onrender.com/api';

export const api = {
  // Auth with username/password
  login: (username, password) => fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  }).then(res => res.json()),

  setupAdmin: () => fetch(`${API_BASE_URL}/auth/setup`, {
    method: 'POST'
  }).then(res => res.json()),

  createAdminNow: () => fetch(`${API_BASE_URL}/auth/create-admin-now`, {
    method: 'POST'
  }).then(res => res.json()),

  getUsers: () => fetch(`${API_BASE_URL}/auth/users`).then(res => res.json()),
  
  // User Management
  updateUser: (userId, userData) => fetch(`${API_BASE_URL}/auth/users/${userId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData)
  }).then(res => {
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    return res.json();
  }),
  
  deleteUser: (userId) => fetch(`${API_BASE_URL}/auth/users/${userId}`, {
    method: 'DELETE'
  }).then(res => {
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    return res.json();
  }),
  
  registerUser: (userData) => fetch(`${API_BASE_URL}/auth/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData)
  }).then(res => {
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    return res.json();
  }),
  
  // 🆕 Leagues Management
  getLeagues: () => fetch(`${API_BASE_URL}/leagues`).then(res => {
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    return res.json();
  }),
  
  getActiveLeagues: () => fetch(`${API_BASE_URL}/leagues/active`).then(res => {
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    return res.json();
  }),
  
  getLeague: (leagueId) => fetch(`${API_BASE_URL}/leagues/${leagueId}`).then(res => {
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    return res.json();
  }),
  
  createLeague: (leagueData) => fetch(`${API_BASE_URL}/leagues`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(leagueData)
  }).then(res => {
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    return res.json();
  }),
  
  updateLeague: (leagueId, leagueData) => fetch(`${API_BASE_URL}/leagues/${leagueId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(leagueData)
  }).then(res => {
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    return res.json();
  }),
  
  deleteLeague: (leagueId) => fetch(`${API_BASE_URL}/leagues/${leagueId}`, {
    method: 'DELETE'
  }).then(res => {
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    return res.json();
  }),
  
  initializeLeagues: () => fetch(`${API_BASE_URL}/leagues/initialize`, {
    method: 'POST'
  }).then(res => {
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    return res.json();
  }),
  
  // Setup
  setup: () => fetch(`${API_BASE_URL}/setup`).then(res => res.json()),
  
  // Weeks
  getWeeks: () => fetch(`${API_BASE_URL}/weeks`).then(res => {
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    return res.json();
  }),
  
  createWeek: (data) => fetch(`${API_BASE_URL}/weeks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(res => {
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    return res.json();
  }),
  
  deleteWeek: (weekId) => fetch(`${API_BASE_URL}/weeks/${weekId}`, {
    method: 'DELETE'
  }).then(res => {
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    return res.json();
  }),
  
  updateWeek: async (weekId, data) => {
    try {
      console.log('API: Updating week - Original ID:', weekId);
      console.log('API: Data to update:', data);
      
      const cleanWeekId = String(weekId).replace(/[^a-fA-F0-9]/g, '').substring(0, 24);
      console.log('API: Clean week ID:', cleanWeekId);
      
      if (!cleanWeekId || cleanWeekId.length !== 24) {
        throw new Error('מזהה שבוע לא תקין');
      }
      
      const url = `${API_BASE_URL}/weeks/${cleanWeekId}`;
      console.log('API: Request URL:', url);
      
      const response = await fetch(url, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      console.log('API: Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API: Error response:', errorText);
        
        if (errorText.includes('<!DOCTYPE html>')) {
          throw new Error(`נתיב לא נמצא - בדוק שהשרת רץ נכון`);
        }
        
        throw new Error(`שגיאת שרת: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      console.log('API: Success result:', result);
      return result;
      
    } catch (error) {
      console.error('API: updateWeek error:', error);
      throw error;
    }
  },
  
  // Matches
  getMatches: (weekId) => fetch(`${API_BASE_URL}/matches/week/${weekId}`).then(res => res.json()),
  
  createMatch: (data) => fetch(`${API_BASE_URL}/matches`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(res => res.json()),
  
  updateMatch: (matchId, data) => fetch(`${API_BASE_URL}/matches/${matchId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(res => res.json()),
  
  // Bets
  getUserBets: (userId, weekId) => fetch(`${API_BASE_URL}/bets/user/${userId}/week/${weekId}`).then(res => res.json()),
  getWeekBets: (weekId) => fetch(`${API_BASE_URL}/bets/week/${weekId}`).then(res => res.json()),
  createBet: (data) => fetch(`${API_BASE_URL}/bets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(res => res.json()),
  
  updateBet: (betId, prediction) => fetch(`${API_BASE_URL}/bets/${betId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prediction })
  }).then(res => res.json()),

  // Scores
  calculateScores: (weekId) => {
    console.log('API: Calculating scores for week', weekId);
    return fetch(`${API_BASE_URL}/scores/calculate/${weekId}`, {
      method: 'POST'
    }).then(res => {
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.json();
    });
  }
};