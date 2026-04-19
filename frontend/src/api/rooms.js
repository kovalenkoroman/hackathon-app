const BASE_URL = '/api/v1/rooms';

export async function createRoom(name, description, visibility) {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ name, description, visibility }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  return json.data;
}

export async function listPublicRooms(search = '', limit = 50, offset = 0) {
  const params = new URLSearchParams({ search, limit, offset });
  const res = await fetch(`${BASE_URL}?${params}`, {
    credentials: 'include',
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  return json.data;
}

export async function listUserRooms() {
  const res = await fetch(`${BASE_URL}/mine`, {
    credentials: 'include',
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  return json.data;
}

export async function getRoomDetail(roomId) {
  const res = await fetch(`${BASE_URL}/${roomId}`, {
    credentials: 'include',
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  return json.data;
}

export async function joinRoom(roomId) {
  const res = await fetch(`${BASE_URL}/${roomId}/join`, {
    method: 'POST',
    credentials: 'include',
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  return json.data;
}

export async function leaveRoom(roomId) {
  const res = await fetch(`${BASE_URL}/${roomId}/leave`, {
    method: 'POST',
    credentials: 'include',
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  return json.data;
}

export async function deleteRoom(roomId) {
  const res = await fetch(`${BASE_URL}/${roomId}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  return json.data;
}

export async function updateRoom(roomId, updates) {
  const res = await fetch(`${BASE_URL}/${roomId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(updates),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  return json.data;
}

export async function banMember(roomId, userId) {
  const res = await fetch(`${BASE_URL}/${roomId}/members/${userId}/ban`, {
    method: 'POST',
    credentials: 'include',
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  return json.data;
}

export async function unbanMember(roomId, userId) {
  const res = await fetch(`${BASE_URL}/${roomId}/bans/${userId}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  return json.data;
}

export async function promoteToAdmin(roomId, userId) {
  const res = await fetch(`${BASE_URL}/${roomId}/admins/${userId}`, {
    method: 'POST',
    credentials: 'include',
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  return json.data;
}

export async function demoteFromAdmin(roomId, userId) {
  const res = await fetch(`${BASE_URL}/${roomId}/admins/${userId}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  return json.data;
}

export async function inviteUser(roomId, userId) {
  const res = await fetch(`${BASE_URL}/${roomId}/invitations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ userId }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  return json.data;
}

export async function getRoomBans(roomId) {
  const res = await fetch(`${BASE_URL}/${roomId}/bans`, {
    credentials: 'include',
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  return json.data;
}
