export async function register(email, username, password) {
  const res = await fetch('/api/v1/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, username, password }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  return json.data;
}

export async function login(email, password) {
  const res = await fetch('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  return json.data;
}

export async function logout() {
  const res = await fetch('/api/v1/auth/logout', {
    method: 'POST',
    credentials: 'include',
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  return json.data;
}

export async function getMe() {
  const res = await fetch('/api/v1/auth/me', {
    credentials: 'include',
  });
  const json = await res.json();
  if (!res.ok) return null;
  return json.data;
}

export async function changePassword(currentPassword, newPassword) {
  const res = await fetch('/api/v1/auth/password/change', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  return json.data;
}

export async function resetPassword(email) {
  const res = await fetch('/api/v1/auth/password/reset', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  return json.data;
}

export async function confirmPasswordReset(token, newPassword) {
  const res = await fetch('/api/v1/auth/password-reset/confirm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, newPassword }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  return json.data;
}

export async function deleteAccount() {
  const res = await fetch('/api/v1/auth/account', {
    method: 'DELETE',
    credentials: 'include',
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  return json.data;
}

export async function getSessions() {
  const res = await fetch('/api/v1/auth/sessions', {
    credentials: 'include',
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  return json.data;
}

export async function deleteSession(id) {
  const res = await fetch(`/api/v1/auth/sessions/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  return json.data;
}
