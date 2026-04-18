# Requirements — Online Chat Server

Source: `2026_04_18_AI_requirements.docx` (official hackathon task)

---

## 1. Functional Requirements

### 1.1 User Accounts & Authentication

- [ ] FR-AUTH-1: Self-registration with email, password, unique username
- [ ] FR-AUTH-2: Email must be unique; username must be unique and immutable after registration
- [ ] FR-AUTH-3: Sign in with email + password
- [ ] FR-AUTH-4: Sign out — invalidates current browser session only
- [ ] FR-AUTH-5: Persistent login across browser close/reopen (HTTP-only session cookie)
- [ ] FR-AUTH-6: Password reset flow
- [ ] FR-AUTH-7: Password change for logged-in users
- [ ] FR-AUTH-8: Passwords stored as bcrypt hashes
- [ ] FR-AUTH-9: Delete account — removes account, owned rooms + their messages/files, removes memberships in other rooms

### 1.2 Sessions & Presence

- [ ] FR-PRES-1: Three presence states: online / AFK / offline
- [ ] FR-PRES-2: AFK after 1 minute of inactivity across all open tabs
- [ ] FR-PRES-3: If any tab is active → online; AFK only when all tabs idle >1 min; offline when all tabs closed
- [ ] FR-PRES-4: Multi-tab correctness — same user across tabs must show consistent presence
- [ ] FR-PRES-5: Active sessions list — shows browser/IP; allows logging out individual sessions
- [ ] FR-PRES-6: Presence updates propagate with latency < 2 seconds

### 1.3 Contacts / Friends

- [ ] FR-FRIEND-1: Each user has a friend list
- [ ] FR-FRIEND-2: Send friend request by username or from room member list; optional message text
- [ ] FR-FRIEND-3: Friend request requires confirmation by recipient
- [ ] FR-FRIEND-4: Remove friend
- [ ] FR-FRIEND-5: User-to-user ban — blocks all contact, freezes existing DM history (read-only), terminates friendship
- [ ] FR-FRIEND-6: Personal messaging only allowed between mutual friends with no active ban

### 1.4 Chat Rooms

- [ ] FR-ROOM-1: Any registered user can create a room
- [ ] FR-ROOM-2: Room properties: name (unique), description, visibility (public/private), owner, admins, members, banned list
- [ ] FR-ROOM-3: Public room catalog — shows name, description, member count; supports search
- [ ] FR-ROOM-4: Public rooms joinable by any authenticated user unless banned
- [ ] FR-ROOM-5: Private rooms not visible in catalog; join by invitation only
- [ ] FR-ROOM-6: Users may leave rooms freely; owner cannot leave (must delete)
- [ ] FR-ROOM-7: Room deletion permanently deletes all messages, files, and images
- [ ] FR-ROOM-8: Owner is always admin and cannot lose admin status
- [ ] FR-ROOM-9: Admin actions: delete messages, remove/ban members, manage ban list, demote other admins
- [ ] FR-ROOM-10: Owner actions: all admin actions + remove any admin/member + delete room
- [ ] FR-ROOM-11: Removing a member = ban (cannot rejoin unless unbanned)
- [ ] FR-ROOM-12: Banned user loses access to room messages, files, and images via UI
- [ ] FR-ROOM-13: Room invitations for private rooms

### 1.5 Messaging

- [ ] FR-MSG-1: Send plain text, multiline text, emoji; max 3 KB per message; UTF-8 support
- [ ] FR-MSG-2: Reply/reference to another message — visually quoted in UI
- [ ] FR-MSG-3: Edit own messages — show grey "edited" indicator
- [ ] FR-MSG-4: Delete messages (by author or room admin)
- [ ] FR-MSG-5: Messages displayed in chronological order with infinite scroll for history
- [ ] FR-MSG-6: Messages to offline users persisted and delivered on next login
- [ ] FR-MSG-7: Personal dialogs behave identically to room chats (same features, no admins)

### 1.6 Attachments

- [ ] FR-FILE-1: Send images (max 3 MB) and arbitrary files (max 20 MB)
- [ ] FR-FILE-2: Attach via upload button or copy-paste
- [ ] FR-FILE-3: Preserve original filename; allow optional comment
- [ ] FR-FILE-4: Files downloadable only by current room members / dialog participants
- [ ] FR-FILE-5: User losing room access also loses access to room files
- [ ] FR-FILE-6: Files stored on local filesystem; persist unless room is deleted

### 1.7 Notifications

- [ ] FR-NOTIF-1: Unread indicator on room names and contact names
- [ ] FR-NOTIF-2: Unread indicator cleared when user opens that chat

---

## 2. Non-Functional Requirements

- Up to 300 simultaneous users
- Single room: up to 1000 participants
- Message delivery within 3 seconds of send
- Presence updates propagate in < 2 seconds
- Must handle rooms with 10,000+ messages (infinite scroll, no full load)
- Files on local filesystem, max 20 MB / 3 MB images
- No automatic logout on inactivity
- Login persists across browser close/open
- Works correctly across multiple tabs for same user

---

## 3. UI Requirements

- Top nav: logo, Public Rooms, Private Rooms, Contacts, Sessions, Profile, Sign out
- Left/right collapsable sidebar: room list (public + private, with unread counts) + contacts list
- Main chat area: message thread, infinite scroll upward
- Right panel: room info, member list with presence indicators, Invite/Manage buttons
- Message input: multiline, emoji picker, attach button, reply indicator
- Admin actions via modal dialogs (ban, unban, remove, manage admins, delete messages, delete room)
- Presence indicators: ● online, ◐ AFK, ○ offline

See `wireframes` section in original requirements doc for detailed ASCII layouts.

---

## 4. Advanced Requirements (bonus — implement if core is complete)

- [ ] ADV-1: Jabber/XMPP client connectivity (choose supported protocol level)
- [ ] ADV-2: Server federation — messages between two server instances
- [ ] ADV-3: Docker Compose setup supporting two federated server instances
- [ ] ADV-4: Load test: 50+ clients on server A, 50+ on server B, messaging A↔B
- [ ] ADV-5: Admin UI — Jabber connection dashboard
- [ ] ADV-6: Admin UI — federation traffic info/statistics

---

## 5. Key Clarifications (from official requirements doc section 5)

- Email and username are unique; username is immutable
- Room names are unique
- Public rooms are discoverable and freely joinable unless banned
- Private rooms: invitation only, not in catalog
- Personal dialogs = exactly two participants, same feature set as rooms
- Existing DM history stays visible (read-only) after a user-to-user ban
- Room deletion permanently removes all messages and attachments
- Losing room access = losing access to messages, files, images via UI
- Files persist in storage even if uploader loses access — unless room is deleted
- Offline = zero open browser tabs with the app
- Sign out = current browser session only; other sessions stay valid

---

## 6. Submission

- Public GitHub repository
- Must run via `docker compose up` in the repo root
