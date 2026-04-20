import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import * as authApi from './api/auth';
import wsClient from './ws/client';
import { RoomContextProvider } from './RoomContext';
import MainLayout from './components/MainLayout';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ChangePassword from './pages/ChangePassword';
import ResetPasswordConfirm from './pages/ResetPasswordConfirm';
import RoomCatalog from './pages/RoomCatalog';
import MyRooms from './pages/MyRooms';
import RoomDetail from './pages/RoomDetail';
import RoomChat from './pages/RoomChat';
import Sessions from './pages/Sessions';
import Friends from './pages/Friends';
import DMChat from './pages/DMChat';
import Welcome from './pages/Welcome';

function Home() {
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>Welcome to Chat!</h1>
      <p>Select a room from the sidebar or browse public rooms to get started.</p>
    </div>
  );
}

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [wsState, setWsState] = useState('disconnected');
  const [presence, setPresence] = useState({});

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
              setPresence(prev => ({ ...prev, [currentUser.id]: 'online' }));

              // Listen for presence updates
              wsClient.on('presence:update', (payload) => {
                setPresence(prev => ({ ...prev, [payload.userId]: payload.status }));
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
  }, [location]);

  const handleLogout = async () => {
    try {
      wsClient.disconnect();
      await authApi.logout();
      setUser(null);
      setPresence({});
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
      navigate('/login');
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem' }}>Loading...</div>;
  }

  const ProtectedLayout = ({ children }) => (
    user ? (
      <MainLayout user={user} onLogout={handleLogout} wsState={wsState} presence={presence}>
        {children}
      </MainLayout>
    ) : (
      <Navigate to="/login" />
    )
  );

  return (
    <Routes>
      <Route
        path="/"
        element={
          user ? (
            <MainLayout user={user} onLogout={handleLogout} wsState={wsState} presence={presence}>
              <Home />
            </MainLayout>
          ) : (
            <Welcome />
          )
        }
      />
      <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/" /> : <Register />} />
      <Route path="/forgot-password" element={user ? <Navigate to="/" /> : <ForgotPassword />} />
      <Route path="/reset-password" element={user ? <Navigate to="/" /> : <ResetPasswordConfirm />} />
      <Route path="/change-password" element={user ? <ChangePassword /> : <Navigate to="/login" />} />
      <Route
        path="/catalog"
        element={user ? <ProtectedLayout><RoomCatalog /></ProtectedLayout> : <Navigate to="/login" />}
      />
      <Route
        path="/my-rooms"
        element={user ? <ProtectedLayout><MyRooms /></ProtectedLayout> : <Navigate to="/login" />}
      />
      <Route
        path="/rooms/:roomId"
        element={user ? <ProtectedLayout><RoomChat user={user} /></ProtectedLayout> : <Navigate to="/login" />}
      />
      <Route
        path="/rooms/:roomId/manage"
        element={user ? <ProtectedLayout><RoomDetail user={user} /></ProtectedLayout> : <Navigate to="/login" />}
      />
      <Route
        path="/sessions"
        element={user ? <ProtectedLayout><Sessions /></ProtectedLayout> : <Navigate to="/login" />}
      />
      <Route
        path="/friends"
        element={user ? <ProtectedLayout><Friends user={user} /></ProtectedLayout> : <Navigate to="/login" />}
      />
      <Route
        path="/dm/:userId"
        element={user ? <ProtectedLayout><DMChat user={user} /></ProtectedLayout> : <Navigate to="/login" />}
      />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <RoomContextProvider>
        <AppContent />
      </RoomContextProvider>
    </BrowserRouter>
  );
}
