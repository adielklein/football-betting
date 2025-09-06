import React, { useState } from 'react';
import Login from './components/Login';
import AdminView from './components/admin/AdminView';
import PlayerView from './components/player/PlayerView';
import './index.css';

function App() {
  const [currentUser, setCurrentUser] = useState(null);

  const handleLogin = (user) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  if (currentUser.role === 'admin') {
    return <AdminView user={currentUser} onLogout={handleLogout} />;
  }

  return <PlayerView user={currentUser} onLogout={handleLogout} />;
}

export default App;