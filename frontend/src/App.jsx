import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import * as authApi from './api/auth';
import wsClient from './ws/client';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import RoomCatalog from './pages/RoomCatalog';
import RoomDetail from './pages/RoomDetail';

function Home({ user, onLogout, wsState, presence }) {
  const getPresenceIcon = (status) => {
    switch (status) {
      case 'online':
        return '●';
      case 'afk':
        return '◐';
      case 'offline':
        return '○';
      default:
        return '○';
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Online Chat Server</h1>
      <p>Welcome, {user.username}!</p>
      <p>WebSocket status: {wsState}</p>
      <p>Presence: {getPresenceIcon(presence)} {presence}</p>
      <nav style={{ marginBottom: '2rem' }}>
        <a href="/catalog" style={{ marginRight: '1rem' }}>Browse Rooms</a>
      </nav>
      <button onClick={onLogout}>Logout</button>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [wsState, setWsState] = useState('disconnected');
  const [presence, setPresence] = useState('offline');

  useEffect(() => {
    const checkSession = async () => {
      try {
        const currentUser = await authApi.getMe();
        setUser(currentUser);

        // Try to connect WebSocket if authenticated
        if (currentUser) {
          try {
            // Extract token from cookies
            const cookies = document.cookie.split('; ');
            const tokenCookie = cookies.find((row) => row.startsWith('sessionToken='));
            const token = tokenCookie ? tokenCookie.split('=')[1] : null;

            console.log('Session token found:', !!token);
            console.log('Cookies:', cookies);

            if (token) {
              console.log('Attempting WebSocket connection with token...');
              await wsClient.connect(token, setWsState);
              setPresence('online');

              // Listen for presence updates
              wsClient.on('presence:update', (payload) => {
                if (payload.userId === currentUser.id) {
                  setPresence(payload.status);
                }
              });
            } else {
              console.warn('No session token found in cookies');
              setWsState('disconnected');
            }
          } catch (wsError) {
            console.error('WebSocket connection failed:', wsError);
            setWsState('disconnected');
          }
        }
      } catch (error) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    return () => {
      wsClient.disconnect();
    };
  }, []);

  const handleLogout = async () => {
    try {
      wsClient.disconnect();
      await authApi.logout();
      setUser(null);
      setPresence('offline');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem' }}>Loading...</div>;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            user ? (
              <Home user={user} onLogout={handleLogout} wsState={wsState} presence={presence} />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to="/" /> : <Register />} />
        <Route path="/forgot-password" element={user ? <Navigate to="/" /> : <ForgotPassword />} />
        <Route
          path="/catalog"
          element={user ? <RoomCatalog /> : <Navigate to="/login" />}
        />
        <Route
          path="/rooms/:roomId"
          element={user ? <RoomDetail user={user} /> : <Navigate to="/login" />}
        />
      </Routes>
    </BrowserRouter>
  );
}
