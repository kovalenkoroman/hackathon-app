# Testing Plan: Friends & Contacts Feature (2.3)

## Overview
This document outlines comprehensive tests for the Friends/Contacts feature, covering friend list management, friend requests, confirmations, bans, and personal messaging rules.

---

## Test Environment Setup

### Prerequisites
- Docker environment running (`docker compose up`)
- Backend: `http://localhost:3000/api/v1`
- Frontend: `http://localhost:3000`
- Browser DevTools or Playwright for testing
- Curl or Postman for API testing

### Test Users
Create at least 5 test users before running tests:
```bash
# User 1: alice
POST /api/v1/auth/register
{ "email": "alice@test.com", "username": "alice", "password": "password123" }

# User 2: bob
POST /api/v1/auth/register
{ "email": "bob@test.com", "username": "bob", "password": "password123" }

# User 3: charlie
POST /api/v1/auth/register
{ "email": "charlie@test.com", "username": "charlie", "password": "password123" }

# User 4: diana
POST /api/v1/auth/register
{ "email": "diana@test.com", "username": "diana", "password": "password123" }

# User 5: eve
POST /api/v1/auth/register
{ "email": "eve@test.com", "username": "eve", "password": "password123" }
```

### Test Rooms
Create public rooms for testing room member friend requests:
```bash
# Room 1: General
POST /api/v1/rooms
{ "name": "General", "description": "General chat", "visibility": "public" }

# Have alice, bob, and charlie join this room
```

---

## Test Cases

## 2.3.1 Friend List

### TC-FL-001: Empty Friend List
**Objective**: Verify new user starts with empty friend list

**Steps**:
1. Create new user account (user: `newuser`)
2. Navigate to Friends page (`/friends`)
3. Click "Friends List" tab

**Expected Result**:
- Page displays "No friends yet. Send a friend request!"
- Empty list shown
- GET `/api/v1/friends` returns empty data array

**API Verification**:
```bash
curl -H "Cookie: sessionToken=<token>" http://localhost:3000/api/v1/friends
# Response: { "data": [] }
```

---

### TC-FL-002: Friend List Display
**Objective**: Verify existing friends are displayed in friend list

**Precondition**: alice and bob are already mutual friends

**Steps**:
1. Login as alice
2. Navigate to Friends page
3. Click "Friends List" tab

**Expected Result**:
- bob is listed with username "bob"
- Friend list shows member count: 1 friend
- GET `/api/v1/friends` returns bob's info

**API Verification**:
```bash
curl -H "Cookie: sessionToken=<alice_token>" http://localhost:3000/api/v1/friends
# Response includes bob's user_id, username, email
```

---

### TC-FL-003: Multiple Friends Display
**Objective**: Verify friend list displays all mutual friends

**Precondition**: alice is friends with bob, charlie, and diana

**Steps**:
1. Login as alice
2. Navigate to Friends page
3. Click "Friends List" tab

**Expected Result**:
- List displays bob, charlie, diana (3 friends)
- All friends are clickable (can open DM)
- Friends are sorted consistently

---

## 2.3.2 Sending Friend Requests

### TC-FR-001: Send Friend Request by Username
**Objective**: Verify user can send friend request by typing username

**Precondition**: alice and bob have no prior friendship

**Steps**:
1. Login as alice
2. Navigate to Friends page (`/friends`)
3. Click "Find Users" tab
4. Enter username "bob" in input field
5. Click "Send Request" button

**Expected Result**:
- Request sent successfully
- POST `/api/v1/friends/request` returns 201 Created
- bob receives `friend:request` WebSocket event (if connected)
- Page shows success or redirects to request confirmation
- Friendship record created with status "pending"

**API Verification**:
```bash
# alice sends request to bob
curl -X POST \
  -H "Cookie: sessionToken=<alice_token>" \
  -H "Content-Type: application/json" \
  -d '{"username":"bob"}' \
  http://localhost:3000/api/v1/friends/request
# Response: 201 { "data": { "id": X, "requester_id": alice_id, "addressee_id": bob_id, "status": "pending" } }
```

---

### TC-FR-002: Send Friend Request with Optional Message
**Objective**: Verify friend request can include optional text (future enhancement)

**Status**: Feature in scope but optional text not stored in current schema

**Notes**: Current implementation accepts requests without message text. Recommendation: Store request_message in friendships table for future phases.

---

### TC-FR-003: Send Friend Request from Room Members
**Objective**: Verify user can send request from room member list

**Precondition**: alice and bob are both in "General" room; no prior friendship

**Steps**:
1. Login as alice
2. Navigate to room chat (e.g., room "General")
3. Look for bob in room member list (right sidebar)
4. Click "Add Friend" or equivalent button on bob's entry (if implemented)
5. OR: Use frontend to extract bob's username and send request via Friends tab

**Expected Result**:
- Friendship request is created
- POST `/api/v1/friends/request` is called with bob's username
- UI confirms request sent

**Current Status**: UI button for room member friend request not yet implemented. Manual test via Friends tab is valid workaround.

---

### TC-FR-004: Reject Friend Request (Same Username)
**Objective**: Verify system rejects request with invalid username

**Steps**:
1. Login as alice
2. Navigate to Friends > Find Users
3. Enter invalid username "nonexistent_user_xyz"
4. Click "Send Request"

**Expected Result**:
- POST `/api/v1/friends/request` returns 400 Bad Request
- Error message: "User not found"
- No friendship record created

---

### TC-FR-005: Reject Duplicate Request
**Objective**: Verify user cannot send duplicate friend request

**Precondition**: alice already sent request to bob (pending)

**Steps**:
1. Login as alice
2. Navigate to Friends > Find Users
3. Enter "bob"
4. Click "Send Request"

**Expected Result**:
- POST `/api/v1/friends/request` returns 400 Bad Request
- Error message: "Friendship already exists or request pending"
- No duplicate record created

---

### TC-FR-006: Reject Self-Request
**Objective**: Verify user cannot send request to themselves

**Steps**:
1. Login as alice
2. Navigate to Friends > Find Users
3. Enter "alice"
4. Click "Send Request"

**Expected Result**:
- POST `/api/v1/friends/request` returns 400 Bad Request
- Error message: "Cannot send request to yourself"

**API Verification**:
```bash
curl -X POST \
  -H "Cookie: sessionToken=<alice_token>" \
  -H "Content-Type: application/json" \
  -d '{"username":"alice"}' \
  http://localhost:3000/api/v1/friends/request
# Response: 400 { "error": "Cannot send request to yourself" }
```

---

## 2.3.3 Friendship Confirmation

### TC-FC-001: View Pending Requests
**Objective**: Verify recipient can see incoming friend requests

**Precondition**: alice sent request to bob

**Steps**:
1. Login as bob
2. Navigate to Friends page
3. Click "Pending Requests" tab

**Expected Result**:
- alice is listed as requester
- Request can be accepted or rejected
- GET `/api/v1/friends/requests/pending` returns alice's request

**API Verification**:
```bash
curl -H "Cookie: sessionToken=<bob_token>" http://localhost:3000/api/v1/friends/requests/pending
# Response: { "data": [ { "id": X, "requester_id": alice_id, "username": "alice", ... } ] }
```

---

### TC-FC-002: Accept Friend Request
**Objective**: Verify recipient can accept request and establish friendship

**Precondition**: alice sent request to bob; bob viewing pending requests

**Steps**:
1. Login as bob
2. Navigate to Friends > Pending Requests
3. Find alice's request
4. Click "Accept" button

**Expected Result**:
- POST `/api/v1/friends/requests/{id}/accept` returns 200 OK
- Friendship status changes from "pending" to "accepted"
- alice and bob can now message each other
- Request disappears from bob's pending list
- alice receives `friend:accepted` WebSocket event (if connected)

**API Verification**:
```bash
curl -X POST \
  -H "Cookie: sessionToken=<bob_token>" \
  http://localhost:3000/api/v1/friends/requests/123/accept
# Response: 200 { "data": { "id": 123, "status": "accepted" } }
```

---

### TC-FC-003: Reject Friend Request
**Objective**: Verify recipient can reject request without creating friendship

**Precondition**: alice sent request to bob

**Steps**:
1. Login as bob
2. Navigate to Friends > Pending Requests
3. Find alice's request
4. Click "Reject" button

**Expected Result**:
- POST `/api/v1/friends/requests/{id}/reject` returns 204 No Content
- Friendship record is deleted
- alice and bob cannot message
- Request disappears from bob's pending list

**API Verification**:
```bash
curl -X POST \
  -H "Cookie: sessionToken=<bob_token>" \
  http://localhost:3000/api/v1/friends/requests/123/reject
# Response: 204 (no content)
```

---

### TC-FC-004: Cannot Accept Request as Non-Recipient
**Objective**: Verify only recipient can accept request

**Precondition**: alice sent request to bob

**Steps**:
1. Login as charlie (not involved in request)
2. Attempt to accept bob←alice request via API:
```bash
curl -X POST \
  -H "Cookie: sessionToken=<charlie_token>" \
  http://localhost:3000/api/v1/friends/requests/123/accept
```

**Expected Result**:
- Returns 400 Bad Request
- Error: "You cannot accept this request"
- Friendship remains pending

---

### TC-FC-005: Bidirectional Friendship
**Objective**: Verify accepted friendship works both directions

**Precondition**: bob accepted alice's request

**Steps**:
1. Login as alice
2. Navigate to Friends > Friends List
3. Verify bob is shown

4. Login as bob
5. Navigate to Friends > Friends List
6. Verify alice is shown

**Expected Result**:
- Both users see each other in their friend lists
- Both can initiate DMs
- GET `/api/v1/friends` for both returns the other user

---

## 2.3.4 Removing Friends

### TC-RF-001: Remove Friend
**Objective**: Verify user can remove another user from friend list

**Precondition**: alice and bob are mutual friends

**Steps**:
1. Login as alice
2. Navigate to Friends > Friends List
3. Find bob in list
4. Click "Remove" button next to bob

**Expected Result**:
- DELETE `/api/v1/friends/{friendship_id}` returns 200 OK
- Friendship record deleted
- bob disappears from alice's friend list
- alice disappears from bob's friend list
- Both users can no longer exchange messages

**API Verification**:
```bash
curl -X DELETE \
  -H "Cookie: sessionToken=<alice_token>" \
  http://localhost:3000/api/v1/friends/123
# Response: 200 { "data": null }
```

---

### TC-RF-002: Remove Friend with Confirmation
**Objective**: Verify UI shows confirmation before removing

**Steps**:
1. Login as alice
2. Navigate to Friends > Friends List
3. Click "Remove" button next to bob
4. Cancel on confirmation dialog

**Expected Result**:
- Confirmation dialog appears: "Remove this friend?"
- If cancel clicked: friendship remains intact
- If confirm clicked: friend is removed

---

### TC-RF-003: Cannot Message After Removal
**Objective**: Verify messaging is blocked after friend removal

**Precondition**: alice and bob were friends; alice just removed bob

**Steps**:
1. Login as bob
2. Attempt to send DM to alice:
```bash
curl -X POST \
  -H "Cookie: sessionToken=<bob_token>" \
  -H "Content-Type: application/json" \
  -d '{"content":"Hello alice"}' \
  http://localhost:3000/api/v1/friends/dialogs/alice_id/messages
```

**Expected Result**:
- POST returns 400 Bad Request
- Error: "You are not friends with this user"
- Message is not sent

---

## 2.3.5 User-to-User Ban

### TC-BAN-001: Ban Another User
**Objective**: Verify user can ban another user

**Precondition**: alice and bob are mutual friends

**Steps**:
1. Login as alice
2. Navigate to Friends > Friends List
3. Find bob
4. Click "Ban" button or use API:
```bash
curl -X POST \
  -H "Cookie: sessionToken=<alice_token>" \
  http://localhost:3000/api/v1/friends/users/bob_id/ban
```

**Expected Result**:
- POST `/api/v1/friends/users/{userId}/ban` returns 201 Created
- Ban record created in user_bans table
- Friendship is deleted (alice and bob no longer friends)
- Bob cannot send DMs to alice

**API Verification**:
```bash
curl -X POST \
  -H "Cookie: sessionToken=<alice_token>" \
  http://localhost:3000/api/v1/friends/users/bob_id/ban
# Response: 201 { "data": { "id": X, "banner_id": alice_id, "banned_id": bob_id } }
```

---

### TC-BAN-002: Blocked User Cannot Send DMs
**Objective**: Verify banned user cannot send messages to banner

**Precondition**: alice banned bob

**Steps**:
1. Login as bob
2. Attempt to send DM to alice:
```bash
curl -X POST \
  -H "Cookie: sessionToken=<bob_token>" \
  -H "Content-Type: application/json" \
  -d '{"content":"Hi alice"}' \
  http://localhost:3000/api/v1/friends/dialogs/alice_id/messages
```

**Expected Result**:
- POST returns 403 Forbidden
- Error: "You are banned by this user"
- Message not sent

---

### TC-BAN-003: Banned User Sees Banner as Banned
**Objective**: Verify banner status is indicated to banned user (if implemented)

**Precondition**: alice banned bob

**Steps**:
1. Login as bob
2. Look for alice in Friends list

**Expected Result**:
- alice should not appear in bob's friends list (friendship deleted)
- Current implementation: bob cannot see ban status in UI (future enhancement)

---

### TC-BAN-004: Existing DM History Frozen (Read-Only)
**Objective**: Verify past DM history is preserved but read-only after ban

**Precondition**: 
- alice and bob exchanged messages
- alice banned bob
- DM history exists for both users

**Steps**:
1. Login as bob
2. Attempt to view DM history with alice:
```bash
curl -H "Cookie: sessionToken=<bob_token>" \
  http://localhost:3000/api/v1/friends/dialogs/alice_id/messages
```

**Expected Result**:
- GET returns 400 Bad Request (per current implementation)
- Error: "You are banned by this user"
- Banned user cannot see past messages (implementation choice)

**Alternative Implementation Note**: Some systems preserve read-only history. Current code blocks access entirely, which is valid.

---

### TC-BAN-005: Unban User
**Objective**: Verify user can unban another user

**Precondition**: alice banned bob

**Steps**:
1. Login as alice
2. Use API to unban bob:
```bash
curl -X DELETE \
  -H "Cookie: sessionToken=<alice_token>" \
  http://localhost:3000/api/v1/friends/users/bob_id/ban
```

**Expected Result**:
- DELETE `/api/v1/friends/users/{userId}/ban` returns 200 OK
- Ban record deleted
- Bob can now send friend request to alice again

---

### TC-BAN-006: Ban Does Not Affect Other Users
**Objective**: Verify ban is unidirectional

**Precondition**: alice banned bob

**Steps**:
1. Login as charlie
2. Attempt to send DM to alice as usual

**Expected Result**:
- No effect; charlie can message alice normally
- Ban is between alice and bob only

---

## 2.3.6 Personal Messaging Rules

### TC-MSG-001: Friends Can Message
**Objective**: Verify mutual friends can send DMs

**Precondition**: alice and bob are mutual friends, no ban

**Steps**:
1. Login as alice
2. Navigate to Friends page
3. Click "Message" button for bob
4. Type message "Hello bob"
5. Send

**Expected Result**:
- Message sent successfully
- POST `/api/v1/friends/dialogs/{bob_id}/messages` returns 201 Created
- bob receives message in DM
- WebSocket `message:new` event sent (if subscribed)

---

### TC-MSG-002: Non-Friends Cannot Message
**Objective**: Verify strangers cannot send DMs

**Precondition**: alice and eve have never interacted

**Steps**:
1. Login as alice
2. Attempt to send DM to eve via API:
```bash
curl -X POST \
  -H "Cookie: sessionToken=<alice_token>" \
  -H "Content-Type: application/json" \
  -d '{"content":"Hi eve"}' \
  http://localhost:3000/api/v1/friends/dialogs/eve_id/messages
```

**Expected Result**:
- POST returns 400 Bad Request
- Error: "You are not friends with this user"
- Message not sent

---

### TC-MSG-003: Blocked User Cannot Message
**Objective**: Verify banned user cannot send DMs

**Precondition**: alice banned bob

**Steps**:
1. (Same as TC-BAN-002)

**Expected Result**:
- Returns 403 Forbidden: "You are banned by this user"

---

### TC-MSG-004: Banner Can Still Message Banned User (One-Way Block)
**Objective**: Verify ban is one-directional

**Precondition**: alice banned bob

**Steps**:
1. Login as alice
2. Attempt to send message to bob:
```bash
curl -X POST \
  -H "Cookie: sessionToken=<alice_token>" \
  -H "Content-Type: application/json" \
  -d '{"content":"Goodbye"}' \
  http://localhost:3000/api/v1/friends/dialogs/bob_id/messages
```

**Expected Result**:
- POST returns 400 Bad Request
- Error: "You are not friends with this user" (friendship deleted)
- alice must unban bob first to restore friendship

---

### TC-MSG-005: Message Content Validation
**Objective**: Verify DM content is validated

**Precondition**: alice and bob are friends

**Steps**:
1. Login as alice
2. Attempt to send empty message:
```bash
curl -X POST \
  -H "Cookie: sessionToken=<alice_token>" \
  -H "Content-Type: application/json" \
  -d '{"content":""}' \
  http://localhost:3000/api/v1/friends/dialogs/bob_id/messages
```

**Expected Result**:
- POST returns 400 Bad Request
- Error: "Message content is required"

---

### TC-MSG-006: Message Size Limit
**Objective**: Verify DM respects size limit (3072 bytes)

**Precondition**: alice and bob are friends

**Steps**:
1. Create message > 3072 bytes
2. Login as alice
3. Attempt to send oversized DM

**Expected Result**:
- POST returns 400 Bad Request
- Error: "Message is too long"

---

## Edge Cases & Concurrency Tests

### TC-EDGE-001: Concurrent Friendship Confirmation
**Objective**: Verify race condition handling when both users accept each other's requests

**Precondition**: 
- alice sent request to bob
- bob sent request to alice
- Both are pending

**Steps**:
1. alice accepts bob's request
2. Simultaneously, bob accepts alice's request

**Expected Result**:
- Final state: single friendship with status "accepted"
- No duplicate records
- Both users see each other as friends

---

### TC-EDGE-002: Ban During Pending Friendship
**Objective**: Verify ban works during pending friendship state

**Precondition**: alice sent request to bob (pending)

**Steps**:
1. Bob bans alice:
```bash
curl -X POST \
  -H "Cookie: sessionToken=<bob_token>" \
  http://localhost:3000/api/v1/friends/users/alice_id/ban
```

**Expected Result**:
- Pending friendship is deleted
- Ban record created
- alice cannot resend request

---

### TC-EDGE-003: Accept After Self-Removal
**Objective**: Verify behavior when user removes friend, then friend tries to accept old request

**Precondition**: alice and bob are friends; alice removed bob

**Steps**:
1. alice and bob become friends again via new request/accept
2. alice removes bob again
3. bob sends new request to alice
4. alice accepts

**Expected Result**:
- New friendship is established
- System treats as separate request/response cycle

---

## WebSocket Event Testing

### TC-WS-001: Friend Request Notification
**Objective**: Verify recipient receives real-time notification

**Prerequisites**: 
- bob's WebSocket is connected
- alice's WebSocket is connected

**Steps**:
1. alice sends friend request to bob
2. Monitor bob's WebSocket for `friend:request` event

**Expected Result**:
- bob receives WebSocket event:
```json
{
  "type": "friend:request",
  "payload": {
    "id": 123,
    "requesterId": alice_id,
    "requesterUsername": "alice"
  }
}
```

---

### TC-WS-002: Friendship Acceptance Notification
**Objective**: Verify requester gets real-time confirmation

**Prerequisites**:
- alice's WebSocket is connected
- bob accepted alice's request

**Steps**:
1. bob accepts alice's request
2. Monitor alice's WebSocket for `friend:accepted` event

**Expected Result**:
- alice receives WebSocket event:
```json
{
  "type": "friend:accepted",
  "payload": {
    "id": 123,
    "accepterId": bob_id
  }
}
```

---

## Data Persistence Tests

### TC-PERSIST-001: Friendships Survive Server Restart
**Objective**: Verify friendship data persists after server restart

**Precondition**: alice and bob are mutual friends

**Steps**:
1. Restart backend (`docker compose restart`)
2. Login as alice
3. Check friends list

**Expected Result**:
- bob still appears in alice's friend list
- Friendship data in database is intact

---

### TC-PERSIST-002: Friend Requests Survive Server Restart
**Objective**: Verify pending requests persist

**Precondition**: alice sent request to bob (not yet accepted)

**Steps**:
1. Restart backend
2. Login as bob
3. Check pending requests

**Expected Result**:
- alice's request still appears as pending
- bob can accept or reject as normal

---

## Security Tests

### TC-SEC-001: Cannot View Others' Friend List
**Objective**: Verify privacy of friend lists

**Steps**:
1. Login as alice
2. Attempt to access bob's friend list:
```bash
# Assuming no public endpoint exists
curl -H "Cookie: sessionToken=<alice_token>" \
  http://localhost:3000/api/v1/friends/bob_id/friends
```

**Expected Result**:
- Returns 404 Not Found or 403 Forbidden
- alice cannot see bob's friends

---

### TC-SEC-002: Unauthenticated Users Cannot Access Friends
**Objective**: Verify auth middleware protects friends endpoints

**Steps**:
1. Call friends endpoint without session cookie:
```bash
curl http://localhost:3000/api/v1/friends
```

**Expected Result**:
- Returns 401 Unauthorized
- No data returned

---

### TC-SEC-003: Cannot Modify Others' Friendships
**Objective**: Verify users cannot manipulate others' relationships

**Steps**:
1. Login as alice
2. Attempt to accept friendship request intended for bob:
```bash
curl -X POST \
  -H "Cookie: sessionToken=<alice_token>" \
  http://localhost:3000/api/v1/friends/requests/123/accept
# where 123 is bob's incoming request
```

**Expected Result**:
- Returns 400 Bad Request
- Error: "You cannot accept this request"

---

## Summary Checklist

- [ ] TC-FL-001: Empty Friend List
- [ ] TC-FL-002: Friend List Display
- [ ] TC-FL-003: Multiple Friends Display
- [ ] TC-FR-001: Send Friend Request by Username
- [ ] TC-FR-002: Optional Message (noted as future enhancement)
- [ ] TC-FR-003: Send from Room Members (noted as future UI enhancement)
- [ ] TC-FR-004: Reject Invalid Username
- [ ] TC-FR-005: Reject Duplicate Request
- [ ] TC-FR-006: Reject Self-Request
- [ ] TC-FC-001: View Pending Requests
- [ ] TC-FC-002: Accept Friend Request
- [ ] TC-FC-003: Reject Friend Request
- [ ] TC-FC-004: Cannot Accept as Non-Recipient
- [ ] TC-FC-005: Bidirectional Friendship
- [ ] TC-RF-001: Remove Friend
- [ ] TC-RF-002: Remove with Confirmation
- [ ] TC-RF-003: Cannot Message After Removal
- [ ] TC-BAN-001: Ban Another User
- [ ] TC-BAN-002: Blocked User Cannot Send DMs
- [ ] TC-BAN-003: Banned User Sees Ban Status (noted as future enhancement)
- [ ] TC-BAN-004: Existing History Frozen
- [ ] TC-BAN-005: Unban User
- [ ] TC-BAN-006: Ban Doesn't Affect Others
- [ ] TC-MSG-001: Friends Can Message
- [ ] TC-MSG-002: Non-Friends Cannot Message
- [ ] TC-MSG-003: Blocked User Cannot Message
- [ ] TC-MSG-004: Banner Can Still Message (unidirectional)
- [ ] TC-MSG-005: Message Content Validation
- [ ] TC-MSG-006: Message Size Limit
- [ ] TC-EDGE-001: Concurrent Confirmation
- [ ] TC-EDGE-002: Ban During Pending State
- [ ] TC-EDGE-003: Accept After Self-Removal
- [ ] TC-WS-001: Friend Request Notification
- [ ] TC-WS-002: Friendship Acceptance Notification
- [ ] TC-PERSIST-001: Friendships Survive Restart
- [ ] TC-PERSIST-002: Requests Survive Restart
- [ ] TC-SEC-001: Cannot View Others' Lists
- [ ] TC-SEC-002: Unauthenticated Access Blocked
- [ ] TC-SEC-003: Cannot Modify Others' Friendships

---

## Notes for Execution

### Using Playwright for Automated Testing
```javascript
// Example: Test sending friend request
const { test, expect } = require('@playwright/test');

test('Alice can send friend request to Bob', async ({ browser }) => {
  const alice = await browser.newContext();
  const alicePage = await alice.newPage();
  
  // Login as alice
  await alicePage.goto('http://localhost:3000/login');
  await alicePage.fill('input[type="email"]', 'alice@test.com');
  await alicePage.fill('input[type="password"]', 'password123');
  await alicePage.click('button:has-text("Sign in")');
  
  // Navigate to Friends
  await alicePage.goto('http://localhost:3000/friends');
  await alicePage.click('text=Find Users');
  
  // Send request
  await alicePage.fill('input[placeholder="Enter username"]', 'bob');
  await alicePage.click('button:has-text("Send Request")');
  
  // Verify
  await expect(alicePage.locator('text=Request sent')).toBeVisible();
});
```

### Using curl for API Testing
All tests can be executed via curl with proper session tokens from login responses.

### Manual Testing via UI
All features can be tested manually via the browser at `/friends` page with two browser windows (for sender and recipient).

---

## Known Limitations & Future Enhancements

1. **Optional Request Message**: Current schema doesn't store message text in requests. Recommendation: Add `request_message` column to friendships table.

2. **Friend Request from Room Members**: UI button not implemented in member list. Users must use "Find Users" tab. Recommendation: Add action button in RoomPanel next to each member.

3. **Ban UI Status**: Banned users cannot see they are banned in UI. Recommendation: Add visual indicator in friends list (if still visible) or separate "Blocked By Me" vs "I Blocked" sections.

4. **Frozen DM History**: Current implementation blocks all access. Alternative: Allow read-only access to past messages. Recommendation: Clarify requirement and implement accordingly.

5. **WebSocket Presence in Friends List**: Current implementation doesn't show real-time online status next to friends. Recommendation: Integrate with presence service for online/AFK/offline indicators.

