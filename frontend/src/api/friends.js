export async function getFriends() {
  const res = await fetch('/api/v1/friends', { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch friends');
  const data = await res.json();
  return data.data || [];
}

export async function sendFriendRequest(username) {
  const res = await fetch('/api/v1/friends/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ username })
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to send friend request');
  }
  return res.json();
}

export async function acceptRequest(requestId) {
  const res = await fetch(`/api/v1/friends/requests/${requestId}/accept`, {
    method: 'POST',
    credentials: 'include'
  });
  if (!res.ok) throw new Error('Failed to accept friend request');
  return res.json();
}

export async function removeFriend(friendshipId) {
  const res = await fetch(`/api/v1/friends/${friendshipId}`, {
    method: 'DELETE',
    credentials: 'include'
  });
  if (!res.ok) throw new Error('Failed to remove friend');
}
