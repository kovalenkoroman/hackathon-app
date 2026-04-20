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
import DeleteAccount from './pages/DeleteAccount';
import ResetPasswordConfirm from './pages/ResetPasswordConfirm';
import RoomCatalog from './pages/RoomCatalog';
import MyRooms from './pages/MyRooms';
import RoomChat from './pages/RoomChat';
import Sessions from './pages/Sessions';
import Friends from './pages/Friends';
import DMChat from './pages/DMChat';
import Welcome from './pages/Welcome';
import Home from './pages/Home';

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

        // Try to connect WebSocket if authenticated. The session cookie is
        // httpOnly, so we don't pass a token from JS — the backend reads it
        // from the upgrade request's Cookie header.
        if (currentUser) {
          // Register the presence listener BEFORE connect() resolves — the
          // server pushes a batch of presence:update events right after
          // auth:ok, and if the listener isn't attached yet they're dropped.
          wsClient.on('presence:update', (payload) => {
            setPresence(prev => ({ ...prev, [payload.userId]: payload.status }));
          });
          try {
            await wsClient.connect(null, setWsState);
            setPresence(prev => ({ ...prev, [currentUser.id]: 'online' }));
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

  // Previously this was wrapped in a locally-defined `ProtectedLayout` component,
  // but defining a component inside the render function means a fresh component
  // reference on every render — so every `setWsState` / `setPresence` tick was
  // unmounting and remounting the whole routed tree (RoomChat, DMChat, etc.),
  // wiping their state. Inline the MainLayout at each route instead.
  const wrap = (content) => (
    <MainLayout user={user} onLogout={handleLogout} wsState={wsState} presence={presence}>
      {content}
    </MainLayout>
  );

  return (
    <Routes>
      <Route
        path="/"
        element={
          user ? (
            <MainLayout user={user} onLogout={handleLogout} wsState={wsState} presence={presence}>
              <Home user={user} />
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
      <Route
        path="/change-password"
        element={user ? wrap(<ChangePassword />) : <Navigate to="/login" />}
      />
      <Route
        path="/delete-account"
        element={user ? wrap(<DeleteAccount user={user} />) : <Navigate to="/login" />}
      />
      <Route
        path="/catalog"
        element={user ? wrap(<RoomCatalog />) : <Navigate to="/login" />}
      />
      <Route
        path="/my-rooms"
        element={user ? wrap(<MyRooms />) : <Navigate to="/login" />}
      />
      <Route
        path="/rooms/:roomId"
        element={user ? wrap(<RoomChat user={user} />) : <Navigate to="/login" />}
      />
      <Route
        path="/sessions"
        element={user ? wrap(<Sessions />) : <Navigate to="/login" />}
      />
      <Route
        path="/friends"
        element={user ? wrap(<Friends user={user} />) : <Navigate to="/login" />}
      />
      <Route
        path="/dm/:userId"
        element={user ? wrap(<DMChat user={user} />) : <Navigate to="/login" />}
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
