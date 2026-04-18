# Skill: React Frontend Structure

Use this skill when building or extending the React frontend. Covers WS integration into React state, API wrappers, routing, and CSS modules.

---

## Entry point (`frontend/src/main.jsx`)

```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
```

---

## App shell with auth guard (`frontend/src/App.jsx`)

```jsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { authApi } from './api/auth';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ChatPage from './pages/ChatPage';
import SessionsPage from './pages/SessionsPage';

export default function App() {
  const [user, setUser] = useState(undefined); // undefined = loading

  useEffect(() => {
    authApi.me().then(setUser).catch(() => setUser(null));
  }, []);

  if (user === undefined) return null; // loading splash

  return (
    <Routes>
      <Route path="/login" element={!user ? <LoginPage onLogin={setUser} /> : <Navigate to="/" />} />
      <Route path="/register" element={!user ? <RegisterPage onLogin={setUser} /> : <Navigate to="/" />} />
      <Route path="/*" element={user ? <ChatPage user={user} onLogout={() => setUser(null)} /> : <Navigate to="/login" />} />
      <Route path="/sessions" element={user ? <SessionsPage /> : <Navigate to="/login" />} />
    </Routes>
  );
}
```

---

## API wrapper pattern (`frontend/src/api/`)

One file per resource domain. All return parsed `data` or throw with `error` message.

```js
// frontend/src/api/base.js
async function request(method, path, body) {
  const res = await fetch(`/api/v1${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include', // sends session cookie
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json.data;
}

export const get = (path) => request('GET', path);
export const post = (path, body) => request('POST', path, body);
export const patch = (path, body) => request('PATCH', path, body);
export const del = (path) => request('DELETE', path);
```

```js
// frontend/src/api/auth.js
import { get, post, del } from './base';
export const authApi = {
  me: () => get('/auth/me'),
  login: (email, password) => post('/auth/login', { email, password }),
  register: (email, username, password) => post('/auth/register', { email, username, password }),
  logout: () => post('/auth/logout'),
  sessions: () => get('/auth/sessions'),
  deleteSession: (id) => del(`/auth/sessions/${id}`),
  changePassword: (currentPassword, newPassword) => post('/auth/password/change', { currentPassword, newPassword }),
};
```

```js
// frontend/src/api/rooms.js
import { get, post, patch, del } from './base';
export const roomsApi = {
  list: (search = '') => get(`/rooms?search=${encodeURIComponent(search)}`),
  get: (id) => get(`/rooms/${id}`),
  create: (name, description, visibility) => post('/rooms', { name, description, visibility }),
  update: (id, data) => patch(`/rooms/${id}`, data),
  delete: (id) => del(`/rooms/${id}`),
  join: (id) => post(`/rooms/${id}/join`),
  leave: (id) => post(`/rooms/${id}/leave`),
  banMember: (roomId, userId) => post(`/rooms/${roomId}/members/${userId}/ban`),
  unbanMember: (roomId, userId) => del(`/rooms/${roomId}/bans/${userId}`),
  promoteAdmin: (roomId, userId) => post(`/rooms/${roomId}/admins/${userId}`),
  demoteAdmin: (roomId, userId) => del(`/rooms/${roomId}/admins/${userId}`),
  invite: (roomId, username) => post(`/rooms/${roomId}/invitations`, { username }),
  bans: (roomId) => get(`/rooms/${roomId}/bans`),
  messages: (roomId, before) => get(`/rooms/${roomId}/messages${before ? `?before=${before}` : ''}`),
};
```

---

## WebSocket integration into React

The WS client is a singleton (`ws/client.js`). Components subscribe to events via `useEffect`.

```jsx
// frontend/src/hooks/useRoomMessages.js
import { useState, useEffect, useCallback } from 'react';
import ws from '../ws/client';
import { roomsApi } from '../api/rooms';

export function useRoomMessages(roomId) {
  const [messages, setMessages] = useState([]);
  const [hasMore, setHasMore] = useState(true);

  // Initial load
  useEffect(() => {
    if (!roomId) return;
    setMessages([]);
    roomsApi.messages(roomId).then(msgs => {
      setMessages(msgs);
      setHasMore(msgs.length === 50);
    });
  }, [roomId]);

  // Real-time new messages
  useEffect(() => {
    const handler = (payload) => {
      if (payload.roomId !== roomId) return;
      setMessages(prev => [...prev, payload.message]);
    };
    ws.on('message:new', handler);
    return () => ws.off('message:new', handler); // cleanup on unmount
  }, [roomId]);

  // Real-time edits
  useEffect(() => {
    ws.on('message:edit', ({ messageId, content }) => {
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, content, edited: true } : m));
    });
  }, []);

  // Infinite scroll: load older messages
  const loadMore = useCallback(async () => {
    const oldest = messages[0];
    if (!oldest) return;
    const older = await roomsApi.messages(roomId, oldest.id);
    setMessages(prev => [...older, ...prev]);
    setHasMore(older.length === 50);
  }, [roomId, messages]);

  return { messages, hasMore, loadMore };
}
```

```js
// Add off() to ws/client.js
off(type) { delete this.handlers[type]; }
```

---

## Presence state hook

```jsx
// frontend/src/hooks/usePresence.js
import { useState, useEffect } from 'react';
import ws from '../ws/client';

export function usePresence(initialPresenceMap = {}) {
  const [presence, setPresence] = useState(initialPresenceMap);

  useEffect(() => {
    ws.on('presence:update', ({ userId, status }) => {
      setPresence(prev => ({ ...prev, [userId]: status }));
    });
  }, []);

  return presence;
}

// Usage in component:
// const presence = usePresence();
// <span>{presence[user.id] === 'online' ? '●' : presence[user.id] === 'afk' ? '◐' : '○'}</span>
```

---

## CSS Modules convention

One `.module.css` file per component, co-located.

```css
/* frontend/src/components/MessageBubble.module.css */
.bubble { padding: 6px 10px; border-radius: 8px; max-width: 70%; }
.edited { font-size: 11px; color: #999; margin-left: 4px; }
.replyQuote { border-left: 3px solid #ccc; padding-left: 8px; font-size: 13px; color: #666; margin-bottom: 4px; }
```

```jsx
import styles from './MessageBubble.module.css';
<div className={styles.bubble}>
  {message.reply_to && <div className={styles.replyQuote}>{message.reply_to.content}</div>}
  {message.content}
  {message.edited && <span className={styles.edited}>edited</span>}
</div>
```

---

## Infinite scroll (IntersectionObserver)

```jsx
// Attach to the top sentinel div in the message list
import { useRef, useEffect } from 'react';

function useInfiniteScroll(onLoadMore, hasMore) {
  const sentinelRef = useRef(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) onLoadMore();
    }, { threshold: 0.1 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [onLoadMore, hasMore]);
  return sentinelRef;
}

// In message list component:
// const sentinelRef = useInfiniteScroll(loadMore, hasMore);
// <div ref={sentinelRef} /> ← place at the TOP of the message list
```

---

## Key rules

- Never call `fetch` directly in a component — always go through `src/api/`
- Never subscribe to WS events outside a `useEffect` — always return a cleanup that calls `ws.off()`
- Keep components dumb: logic in custom hooks, display in components
- Credentials must be `'include'` on every fetch so the session cookie is sent
- Auto-scroll to bottom: only when user is already within ~100px of the bottom; use a `useRef` on the message list container and check `scrollHeight - scrollTop - clientHeight < 100` before calling `scrollIntoView`
