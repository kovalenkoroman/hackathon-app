-- Comprehensive test data seed
-- All 50 users have password "password123" (bcrypt cost 12).
-- Covers: multi-role rooms, public+private, long thread for infinite-scroll,
-- friendships (accepted + pending incoming/outgoing for alice),
-- user-to-user bans (including a frozen dialog), room bans, room invitations,
-- edited + deleted + multiline messages, real attachments (files copied at startup).

-- ============================================================
-- 1. Clean slate
-- ============================================================
DELETE FROM attachments;
DELETE FROM user_dialog_read;
DELETE FROM user_room_read;
DELETE FROM messages;
DELETE FROM personal_dialogs;
DELETE FROM user_bans;
DELETE FROM room_bans;
DELETE FROM room_invitations;
DELETE FROM room_members;
DELETE FROM friendships;
DELETE FROM rooms;
DELETE FROM password_reset_tokens;
DELETE FROM sessions;
DELETE FROM users;

ALTER SEQUENCE users_id_seq RESTART WITH 1;
ALTER SEQUENCE rooms_id_seq RESTART WITH 1;
ALTER SEQUENCE messages_id_seq RESTART WITH 1;
ALTER SEQUENCE friendships_id_seq RESTART WITH 1;
ALTER SEQUENCE attachments_id_seq RESTART WITH 1;
ALTER SEQUENCE personal_dialogs_id_seq RESTART WITH 1;
ALTER SEQUENCE room_invitations_id_seq RESTART WITH 1;
ALTER SEQUENCE user_bans_id_seq RESTART WITH 1;
ALTER SEQUENCE sessions_id_seq RESTART WITH 1;

-- ============================================================
-- 2. USERS (50) — all passwords: password123
-- ============================================================
INSERT INTO users (email, username, password_hash)
SELECT
  u || '@example.com',
  u,
  '$2b$12$ihVHMA1GtkYAxacLsIjZs.FYstPOYYtBReZWw2vl9JLhJdRJLqaQO'
FROM unnest(ARRAY[
  'alice', 'bob', 'charlie', 'diana', 'eve',
  'frank', 'grace', 'henry', 'iris', 'jack',
  'kate', 'liam', 'mia', 'noah', 'olivia',
  'peter', 'quinn', 'rachel', 'sam', 'tina',
  'uma', 'victor', 'wendy', 'xavier', 'yuki',
  'zoe', 'adam', 'beth', 'carl', 'dana',
  'ethan', 'fiona', 'gary', 'hannah', 'ian',
  'julia', 'kevin', 'luna', 'mason', 'nora',
  'oscar', 'piper', 'ryan', 'sara', 'tom',
  'violet', 'wyatt', 'xena', 'yara', 'zack'
]) AS u;

-- ============================================================
-- 3. ROOMS (10 public + 5 private)
-- ============================================================
INSERT INTO rooms (name, description, visibility, owner_id) VALUES
  -- Public
  ('General Chat',      'Everyone welcome — introductions, announcements, chit-chat',  'public',  1),
  ('Tech Discussion',   'Share tech tips, ask engineering questions',                  'public',  2),
  ('Random',            'Off-topic, memes, and fun content',                           'public',  3),
  ('Project Updates',   'Weekly project status and updates',                           'public',  1),
  ('Music Lovers',      'Share playlists, new releases, concert recommendations',      'public',  6),
  ('Gaming Zone',       'Party up, discuss releases, swap gaming tips',                'public',  7),
  ('Fitness Club',      'Workouts, nutrition, and accountability',                     'public',  8),
  ('Photography',       'Share shots, discuss gear and techniques',                    'public',  9),
  ('Cooking Tips',      'Recipes, techniques, and kitchen hacks',                      'public', 10),
  ('Travel Stories',    'Share trip reports and travel tips',                          'public', 11),
  -- Private
  ('Design Team',       'Internal design collaboration',                               'private', 1),
  ('Backend Dev',       'Backend engineering private channel',                         'private', 2),
  ('Book Club',         'Monthly book discussion',                                     'private', 4),
  ('Executive Board',   'Leadership-only strategy discussion',                         'private',12),
  ('Marketing Team',    'Campaign planning and internal marketing chat',               'private',13);

-- ============================================================
-- 4. ROOM MEMBERS
-- ============================================================

-- Room 1 (General Chat): 30 members; alice owner, bob + charlie admins
INSERT INTO room_members (room_id, user_id, role) VALUES (1, 1, 'owner'), (1, 2, 'admin'), (1, 3, 'admin');
INSERT INTO room_members (room_id, user_id, role)
SELECT 1, s, 'member' FROM generate_series(4, 30) s;

-- Room 2 (Tech Discussion): bob owner, alice admin, plus mix
INSERT INTO room_members (room_id, user_id, role) VALUES
  (2, 2, 'owner'), (2, 1, 'admin'),
  (2, 3, 'member'), (2, 5, 'member'),
  (2, 11, 'member'), (2, 12, 'member'),
  (2, 14, 'member'), (2, 31, 'member'), (2, 35, 'member');

-- Room 3 (Random): charlie owner
INSERT INTO room_members (room_id, user_id, role) VALUES
  (3, 3, 'owner'), (3, 1, 'member'), (3, 2, 'member'),
  (3, 4, 'member'), (3, 6, 'member'), (3, 20, 'member'),
  (3, 25, 'member'), (3, 40, 'member');
-- (eve/5 will be banned from Random below — not a current member)

-- Room 4 (Project Updates): alice owner, diana admin
INSERT INTO room_members (room_id, user_id, role) VALUES
  (4, 1, 'owner'), (4, 4, 'admin'),
  (4, 2, 'member'), (4, 3, 'member'), (4, 5, 'member'),
  (4, 6, 'member'), (4, 7, 'member'), (4, 8, 'member');

-- Room 5 (Music Lovers): frank owner
INSERT INTO room_members (room_id, user_id, role) VALUES
  (5, 6, 'owner'),
  (5, 1, 'member'), (5, 7, 'member'), (5, 8, 'member'),
  (5, 10, 'member'), (5, 15, 'member'), (5, 20, 'member'),
  (5, 30, 'member'), (5, 45, 'member');

-- Room 6 (Gaming Zone): grace owner
INSERT INTO room_members (room_id, user_id, role) VALUES
  (6, 7, 'owner'),
  (6, 9, 'member'), (6, 10, 'member'), (6, 11, 'member'),
  (6, 14, 'member'), (6, 22, 'admin'), (6, 38, 'member');

-- Room 7 (Fitness Club): henry owner
INSERT INTO room_members (room_id, user_id, role) VALUES
  (7, 8, 'owner'),
  (7, 11, 'member'), (7, 12, 'member'),
  (7, 25, 'member'), (7, 30, 'member'), (7, 33, 'member');

-- Room 8 (Photography): iris owner, alice member
INSERT INTO room_members (room_id, user_id, role) VALUES
  (8, 9, 'owner'),
  (8, 1, 'member'), (8, 14, 'member'),
  (8, 28, 'member'), (8, 42, 'member');

-- Room 9 (Cooking Tips): jack owner
INSERT INTO room_members (room_id, user_id, role) VALUES
  (9, 10, 'owner'),
  (9, 2, 'member'), (9, 16, 'member'), (9, 22, 'member'),
  (9, 32, 'member'), (9, 44, 'member');

-- Room 10 (Travel Stories): kate owner
INSERT INTO room_members (room_id, user_id, role) VALUES
  (10, 11, 'owner'),
  (10, 13, 'member'), (10, 23, 'member'),
  (10, 34, 'member'), (10, 49, 'member');

-- Room 11 (Design Team, private): alice owner
INSERT INTO room_members (room_id, user_id, role) VALUES
  (11, 1, 'owner'), (11, 4, 'member'), (11, 18, 'member');

-- Room 12 (Backend Dev, private): bob owner
INSERT INTO room_members (room_id, user_id, role) VALUES
  (12, 2, 'owner'), (12, 3, 'member'), (12, 5, 'member'), (12, 17, 'member');

-- Room 13 (Book Club, private): diana owner
INSERT INTO room_members (room_id, user_id, role) VALUES
  (13, 4, 'owner'), (13, 1, 'member'), (13, 5, 'member'), (13, 27, 'member');

-- Room 14 (Executive Board, private): liam owner; alice will get a pending invite
INSERT INTO room_members (room_id, user_id, role) VALUES
  (14, 12, 'owner'), (14, 2, 'admin'), (14, 39, 'member');

-- Room 15 (Marketing Team, private): mia owner
INSERT INTO room_members (room_id, user_id, role) VALUES
  (15, 13, 'owner'), (15, 16, 'member'), (15, 28, 'member'), (15, 41, 'member');

-- ============================================================
-- 5. FRIENDSHIPS
-- ============================================================

-- Wide friendship chain across all users: (1-2), (2-3), ..., (49-50)
INSERT INTO friendships (requester_id, addressee_id, status)
SELECT s, s + 1, 'accepted' FROM generate_series(1, 49) s;

-- Extra accepted friendships for alice so she has more demo connections
INSERT INTO friendships (requester_id, addressee_id, status) VALUES
  (1, 3, 'accepted'),
  (1, 4, 'accepted'),
  (1, 6, 'accepted'),
  (1, 7, 'accepted'),
  (1, 18, 'accepted');

-- Pending INCOMING friend requests to alice (so she sees them on login)
INSERT INTO friendships (requester_id, addressee_id, status, message) VALUES
  (8,  1, 'pending', 'Hi Alice! Saw you in General Chat — want to connect?'),
  (11, 1, 'pending', 'Hey, Kate here. Would love to chat about the travel thread.'),
  (14, 1, 'pending', NULL);

-- Pending OUTGOING friend requests from alice
INSERT INTO friendships (requester_id, addressee_id, status, message) VALUES
  (1, 17, 'pending', 'Hi Quinn, lets connect!'),
  (1, 28, 'pending', NULL);

-- Some extra cluster friendships so the network is denser
INSERT INTO friendships (requester_id, addressee_id, status) VALUES
  (2, 5, 'accepted'), (2, 6, 'accepted'), (2, 11, 'accepted'),
  (3, 8, 'accepted'), (3, 12, 'accepted'),
  (4, 9, 'accepted'), (4, 13, 'accepted'),
  (5, 14, 'accepted'),
  (6, 15, 'accepted'),
  (7, 16, 'accepted'),
  (10, 20, 'accepted'),
  (15, 30, 'accepted'),
  (20, 40, 'accepted');

-- ============================================================
-- 6. USER-TO-USER BANS
-- ============================================================
-- Alice (1) banned olivia (15) — related room-ban will follow
-- Alice (1) banned yuki (25) — frozen dialog scenario below
-- Tina (20) banned wendy (23)
-- Eve (5) banned victor (22)
INSERT INTO user_bans (banner_id, banned_id) VALUES
  (1, 15),
  (1, 25),
  (20, 23),
  (5, 22);

-- ============================================================
-- 7. ROOM BANS
-- ============================================================
INSERT INTO room_bans (room_id, user_id, banned_by) VALUES
  (3, 5, 3),    -- Charlie banned Eve from Random
  (1, 15, 1),   -- Alice banned Olivia from General Chat
  (2, 24, 2),   -- Bob banned Xavier from Tech Discussion
  (6, 38, 7);   -- Grace banned Mason from Gaming Zone

-- ============================================================
-- 8. ROOM INVITATIONS (share tokens for private rooms)
-- ============================================================
INSERT INTO room_invitations (room_id, invited_by, token, expires_at) VALUES
  (14, 12, 'invite_exec_board_alice_demo_token_001', NOW() + INTERVAL '7 days'),
  (15, 13, 'invite_marketing_team_demo_token_002',   NOW() + INTERVAL '7 days'),
  (11, 1,  'invite_design_team_demo_token_003',       NOW() + INTERVAL '3 days');
-- One already used (for history/demo)
INSERT INTO room_invitations (room_id, invited_by, token, expires_at, used_at) VALUES
  (13, 4, 'invite_book_club_used_demo_token_004', NOW() + INTERVAL '7 days', NOW() - INTERVAL '1 day');

-- ============================================================
-- 9. PERSONAL DIALOGS
-- ============================================================
INSERT INTO personal_dialogs (user_a_id, user_b_id) VALUES
  (1, 2),   -- alice ↔ bob
  (1, 4),   -- alice ↔ diana
  (1, 3),   -- alice ↔ charlie
  (2, 3),   -- bob ↔ charlie
  (1, 25);  -- alice ↔ yuki — FROZEN (alice banned yuki; friendship never created)

-- ============================================================
-- 10. MESSAGES
-- ============================================================

-- --- Room 1 (General Chat) — curated opener + 200 bulk for infinite scroll ---
INSERT INTO messages (room_id, user_id, content, created_at) VALUES
  (1, 1, 'Welcome to General Chat! 👋 Feel free to introduce yourselves.', NOW() - INTERVAL '7 days'),
  (1, 2, 'Hi everyone! 😊 Excited to join this community.',                 NOW() - INTERVAL '7 days' + INTERVAL '2 minutes'),
  (1, 3, 'Hello all! Looking forward to the discussions here.',            NOW() - INTERVAL '7 days' + INTERVAL '4 minutes'),
  (1, 4, 'Hi there! 👋 Great to see everyone.',                            NOW() - INTERVAL '7 days' + INTERVAL '6 minutes'),
  (1, 5, 'Hey folks! 🎉 Ready to chat.',                                   NOW() - INTERVAL '7 days' + INTERVAL '8 minutes');

-- Reply
INSERT INTO messages (room_id, user_id, content, reply_to_id, created_at)
SELECT 1, 1, '@bob Tell us about yourself!', 2, NOW() - INTERVAL '7 days' + INTERVAL '10 minutes';

-- Bulk-generated older history for infinite-scroll demo
INSERT INTO messages (room_id, user_id, content, created_at)
SELECT
  1,
  ((s - 1) % 27) + 4,   -- cycle through users 4..30
  CASE (s % 6)
    WHEN 0 THEN 'Quick status update: all green on my end 🟢 (#' || s || ')'
    WHEN 1 THEN 'Anyone free for a quick sync later? (msg #' || s || ')'
    WHEN 2 THEN 'Reminder: standup moved by 15 min (msg #' || s || ')'
    WHEN 3 THEN 'Nice work everyone, momentum is strong 💪 (msg #' || s || ')'
    WHEN 4 THEN 'Sharing a useful link I came across earlier (msg #' || s || ')'
    ELSE         'Small heads-up about the next release (msg #' || s || ')'
  END,
  NOW() - INTERVAL '6 days' + (INTERVAL '30 seconds' * s)
FROM generate_series(1, 200) s;

-- A multiline message (newlines preserved)
INSERT INTO messages (room_id, user_id, content, created_at) VALUES
  (1, 1, E'Friendly reminder about next week:\n\n1. Submit updates by Mon\n2. Demo Wed 2pm\n3. Retro Fri\n\nLet me know if conflicts.', NOW() - INTERVAL '1 hour');

-- An edited message
INSERT INTO messages (room_id, user_id, content, edited, created_at, updated_at) VALUES
  (1, 2, 'Meeting moved to 3pm — sorry for the short notice!', TRUE, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 hour 50 minutes');

-- A deleted message
INSERT INTO messages (room_id, user_id, content, deleted, created_at) VALUES
  (1, 5, 'oops, wrong channel', TRUE, NOW() - INTERVAL '30 minutes');

-- --- Room 2 (Tech Discussion) ---
INSERT INTO messages (room_id, user_id, content) VALUES
  (2, 2, 'Today I learned about optimising database queries 🚀'),
  (2, 1, 'That sounds great! 💡 Any specific tips to share?'),
  (2, 3, 'I prefer using indexes on frequently queried columns 📊'),
  (2, 5, 'Has anyone tried query caching? ⚡'),
  (2, 1, 'Query caching works well for read-heavy workloads 🔥'),
  (2, 11, 'EXPLAIN ANALYZE is your friend for sequential scans.'),
  (2, 14, 'Partial indexes + covering indexes have been underrated in my stack.'),
  (2, 35, 'Postgres 16 adds logical replication improvements worth checking.');

-- Edited message in Tech Discussion
INSERT INTO messages (room_id, user_id, content, edited, updated_at) VALUES
  (2, 1, 'Correction: query caching is at the application layer here, not Postgres-native.', TRUE, NOW() - INTERVAL '10 minutes');

-- --- Room 3 (Random) ---
INSERT INTO messages (room_id, user_id, content) VALUES
  (3, 3, 'What is everyones favourite programming language? 🤔'),
  (3, 1, 'I love Python for its simplicity 🐍'),
  (3, 2, 'JavaScript is great for web work 🌐'),
  (3, 4, 'Go is my go-to for backend systems 🎯'),
  (3, 6, 'Rust has been my weekend project 🦀');

INSERT INTO messages (room_id, user_id, content, reply_to_id)
SELECT 3, 2, '@alice Python is indeed elegant! 😍',
  (SELECT id FROM messages WHERE room_id = 3 AND user_id = 1 AND content LIKE 'I love Python%' LIMIT 1);

-- --- Room 4 (Project Updates) — incl. deleted ---
INSERT INTO messages (room_id, user_id, content) VALUES
  (4, 1, '📋 Sprint planning completed for next week'),
  (4, 4, '✅ Backend API is 80% complete'),
  (4, 2, '🎨 Frontend redesign in progress'),
  (4, 3, 'Testing suite covers 75% of features now 🧪'),
  (4, 5, '🚀 Deployment pipeline is ready');

INSERT INTO messages (room_id, user_id, content, deleted) VALUES
  (4, 6, 'draft — ignore, still WIP', TRUE);

-- --- Room 5 (Music Lovers) ---
INSERT INTO messages (room_id, user_id, content) VALUES
  (5, 6, 'Sharing my weekly playlist 🎧'),
  (5, 7, 'Love that album — the second track especially'),
  (5, 10, 'Any live-album recommendations?'),
  (5, 1, 'Getting into ambient electronic this month'),
  (5, 20, 'Concert on the 30th — anyone going?');

-- --- Room 6 (Gaming Zone) ---
INSERT INTO messages (room_id, user_id, content) VALUES
  (6, 7, 'Who is up for co-op tonight? 🎮'),
  (6, 9, 'In! 9pm local works'),
  (6, 10, 'Count me in 🎯'),
  (6, 22, 'Remember ping rules — use push-to-talk please');

-- --- Room 7 (Fitness Club) ---
INSERT INTO messages (room_id, user_id, content) VALUES
  (7, 8, 'Challenge: 5k a day this week — who''s in? 🏃'),
  (7, 11, 'In! 🙋'),
  (7, 25, 'Done with day 1 — knees are screaming 😅');

-- --- Room 8 (Photography) — attachments will reference these ---
INSERT INTO messages (room_id, user_id, content) VALUES
  (8, 9,  'Sunrise at the bridge this morning 🌅'),
  (8, 1,  'Nice composition! What aperture?'),
  (8, 14, 'Shared my weekend gallery — feedback welcome 📸');

-- --- Room 9 (Cooking Tips) ---
INSERT INTO messages (room_id, user_id, content) VALUES
  (9, 10, 'Weekly recipe: one-pan chicken with lemon 🍋'),
  (9, 22, 'Tried it — delicious!'),
  (9, 32, 'Replaced chicken with tofu — worked great');

-- --- Room 10 (Travel Stories) ---
INSERT INTO messages (room_id, user_id, content) VALUES
  (10, 11, 'Back from Lisbon — amazing food scene 🇵🇹'),
  (10, 13, 'Any must-visit spots?'),
  (10, 23, 'Planning Japan in October — tips?');

-- --- Room 11 (Design Team, private) ---
INSERT INTO messages (room_id, user_id, content) VALUES
  (11, 1, 'Sharing the latest dashboard mockups 🎨'),
  (11, 4, 'Love the colour scheme! 😍'),
  (11, 1, 'Thanks — I can tweak contrast on the dark variant'),
  (11, 18, 'Typography hierarchy could go one step larger on H1 imo');

-- --- Room 12 (Backend Dev, private) ---
INSERT INTO messages (room_id, user_id, content) VALUES
  (12, 2, 'Refactored the auth middleware 🔐'),
  (12, 3, 'Unit tests added?'),
  (12, 2, '100% coverage on critical paths ✅'),
  (12, 17, 'I can take error-handling coverage tomorrow');

-- --- Room 13 (Book Club, private) ---
INSERT INTO messages (room_id, user_id, content) VALUES
  (13, 4, 'Finished "Clean Code" 📚 — highly recommended'),
  (13, 1, 'Naming conventions chapter was eye-opening 👍'),
  (13, 5, 'Just starting. What''s next pick?'),
  (13, 27, 'Voting for "A Philosophy of Software Design" next');

INSERT INTO messages (room_id, user_id, content, reply_to_id)
SELECT 13, 1, '@diana The testing chapter was also valuable 🎯',
  (SELECT id FROM messages WHERE room_id = 13 AND user_id = 4 AND content LIKE 'Finished "Clean Code"%' LIMIT 1);

-- --- Room 14 (Executive Board, private) ---
INSERT INTO messages (room_id, user_id, content) VALUES
  (14, 12, 'Quarterly roadmap draft shared in the docs 📈'),
  (14, 2, 'Reviewed — one comment on Q3 milestones'),
  (14, 39, 'Head-count plan aligned with ops');

-- --- Room 15 (Marketing Team, private) ---
INSERT INTO messages (room_id, user_id, content) VALUES
  (15, 13, 'Campaign brief for the spring launch attached 📎'),
  (15, 16, 'Copy draft ready for review'),
  (15, 28, 'Creative assets by Friday'),
  (15, 41, 'Targeting segment finalised');

-- ============================================================
-- 11. DIALOG MESSAGES
-- ============================================================

-- Dialog 1 (alice ↔ bob)
INSERT INTO messages (dialog_id, user_id, content) VALUES
  (1, 1, 'Hey Bob! How are you doing? 😊'),
  (1, 2, 'Hi Alice! Doing great 👋 How about you?'),
  (1, 1, 'Excellent — coffee later? ☕'),
  (1, 2, 'Sure! 3 PM at the usual place? ✅'),
  (1, 1, 'Perfect, see you then'),
  (1, 2, 'btw did you review the PR?'),
  (1, 1, 'Yep — approved, minor nits'),
  (1, 2, 'Thanks! Merging now');

-- Dialog 2 (alice ↔ diana)
INSERT INTO messages (dialog_id, user_id, content) VALUES
  (2, 1, 'Diana, did you see the design feedback? 🎨'),
  (2, 4, 'Yes — very helpful 😊'),
  (2, 1, 'Let''s schedule a review for phase 2'),
  (2, 4, 'Tuesday 10am works?'),
  (2, 1, 'Booked ✅');

-- Dialog 3 (alice ↔ charlie)
INSERT INTO messages (dialog_id, user_id, content) VALUES
  (3, 1, 'Charlie — quick question about the random room settings'),
  (3, 3, 'Shoot'),
  (3, 1, 'What''s the ban policy for off-topic?'),
  (3, 3, 'One warning then temp-ban');

-- Dialog 4 (bob ↔ charlie)
INSERT INTO messages (dialog_id, user_id, content) VALUES
  (4, 2, 'Charlie, got a minute for deployment questions?'),
  (4, 3, 'Ya, whats up'),
  (4, 2, 'Rolling the new middleware to staging — anything to watch?'),
  (4, 3, 'Check pg pool size, we bumped it last week');

-- Dialog 5 (alice ↔ yuki — FROZEN, alice banned yuki after this)
INSERT INTO messages (dialog_id, user_id, content, created_at) VALUES
  (5, 1,  'Hey Yuki, welcome aboard 👋',       NOW() - INTERVAL '30 days'),
  (5, 25, 'Thanks Alice, glad to be here',    NOW() - INTERVAL '30 days' + INTERVAL '2 minutes'),
  (5, 1,  'Let me know if you need any help', NOW() - INTERVAL '29 days'),
  (5, 25, 'Appreciate it!',                   NOW() - INTERVAL '29 days' + INTERVAL '1 minute'),
  (5, 1,  'heads up, some of your posts were flagged', NOW() - INTERVAL '15 days'),
  (5, 25, 'what? that''s not fair',           NOW() - INTERVAL '15 days' + INTERVAL '3 minutes');
-- No further messages after this — alice banned yuki; dialog is read-only.

-- ============================================================
-- 12. ATTACHMENTS (backed by real sample files copied at startup)
-- ============================================================
-- Filenames match files in backend/seed-uploads/ that backend copies to UPLOAD_DIR on boot.
INSERT INTO attachments (message_id, filename, original_name, size, mime_type) VALUES
  -- Design Team first message
  ((SELECT MIN(id) FROM messages WHERE room_id = 11),
   'seed_design_notes.txt', 'dashboard-notes.txt', 295, 'text/plain'),
  -- Photography first message
  ((SELECT MIN(id) FROM messages WHERE room_id = 8),
   'seed_photo_readme.md',  'shoot-details.md',   233, 'text/markdown'),
  -- Marketing Team first message
  ((SELECT MIN(id) FROM messages WHERE room_id = 15),
   'seed_marketing_brief.txt', 'spring-campaign-brief.txt', 436, 'text/plain'),
  -- Backend Dev refactor note
  ((SELECT MIN(id) FROM messages WHERE room_id = 12),
   'seed_auth_changelog.txt', 'auth-middleware-changelog.txt', 371, 'text/plain');

-- ============================================================
-- 13. READ TRACKING (mix of fully-read and partially-read)
-- ============================================================
-- For alice, leave a few rooms with unread tail so indicators show
INSERT INTO user_room_read (user_id, room_id, last_read_message_id) VALUES
  (1, 1, (SELECT id FROM messages WHERE room_id = 1 ORDER BY created_at DESC LIMIT 1 OFFSET 5)),  -- some unread in General
  (1, 2, (SELECT id FROM messages WHERE room_id = 2 ORDER BY created_at DESC LIMIT 1)),
  (1, 3, (SELECT id FROM messages WHERE room_id = 3 ORDER BY created_at DESC LIMIT 1 OFFSET 2)),
  (1, 4, (SELECT id FROM messages WHERE room_id = 4 ORDER BY created_at DESC LIMIT 1)),
  (1, 8, (SELECT id FROM messages WHERE room_id = 8 ORDER BY created_at DESC LIMIT 1 OFFSET 1)),
  (1, 11, (SELECT id FROM messages WHERE room_id = 11 ORDER BY created_at DESC LIMIT 1));

-- Bob
INSERT INTO user_room_read (user_id, room_id, last_read_message_id) VALUES
  (2, 1, (SELECT id FROM messages WHERE room_id = 1 ORDER BY created_at DESC LIMIT 1)),
  (2, 2, (SELECT id FROM messages WHERE room_id = 2 ORDER BY created_at DESC LIMIT 1 OFFSET 2)),
  (2, 12, (SELECT id FROM messages WHERE room_id = 12 ORDER BY created_at DESC LIMIT 1));

-- Dialogs
INSERT INTO user_dialog_read (user_id, dialog_id, last_read_message_id) VALUES
  (1, 1, (SELECT id FROM messages WHERE dialog_id = 1 ORDER BY created_at DESC LIMIT 1 OFFSET 2)),  -- some unread
  (2, 1, (SELECT id FROM messages WHERE dialog_id = 1 ORDER BY created_at DESC LIMIT 1)),
  (1, 2, (SELECT id FROM messages WHERE dialog_id = 2 ORDER BY created_at DESC LIMIT 1)),
  (4, 2, (SELECT id FROM messages WHERE dialog_id = 2 ORDER BY created_at DESC LIMIT 1 OFFSET 1)),
  (1, 5, (SELECT id FROM messages WHERE dialog_id = 5 ORDER BY created_at DESC LIMIT 1));          -- frozen dialog all read
