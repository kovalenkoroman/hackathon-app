const BASE_URL = '/api/v1';

export async function getMessages(roomId, beforeId = null, limit = 50) {
  const params = new URLSearchParams({ limit });
  if (beforeId) params.append('before', beforeId);

  const res = await fetch(`${BASE_URL}/rooms/${roomId}/messages?${params}`, {
    credentials: 'include',
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  return json.data;
}

export async function sendMessage(roomId, content, replyToId = null) {
  const res = await fetch(`${BASE_URL}/rooms/${roomId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ content, replyToId }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  return json.data;
}

export async function editMessage(messageId, content) {
  const res = await fetch(`${BASE_URL}/messages/${messageId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ content }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  return json.data;
}

export async function deleteMessage(messageId) {
  const res = await fetch(`${BASE_URL}/messages/${messageId}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  return json.data;
}
