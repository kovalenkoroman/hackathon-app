-- Test data seed script
-- Passwords: all users have password "password123" (bcrypt hashed with cost 12)
-- Hashes generated with: bcrypt.hash('password123', 12)

-- Clear existing data (careful - this deletes all data!)
DELETE FROM attachments;
DELETE FROM user_dialog_read;
DELETE FROM user_room_read;
DELETE FROM messages;
DELETE FROM personal_dialogs;
DELETE FROM user_bans;
DELETE FROM room_bans;
DELETE FROM room_members;
DELETE FROM friendships;
DELETE FROM rooms;
DELETE FROM sessions;
DELETE FROM users;

-- Reset sequences
ALTER SEQUENCE users_id_seq RESTART WITH 1;
ALTER SEQUENCE rooms_id_seq RESTART WITH 1;
ALTER SEQUENCE messages_id_seq RESTART WITH 1;
ALTER SEQUENCE friendships_id_seq RESTART WITH 1;
ALTER SEQUENCE attachments_id_seq RESTART WITH 1;
ALTER SEQUENCE personal_dialogs_id_seq RESTART WITH 1;

-- Insert users (password: "password123")
INSERT INTO users (email, username, password_hash) VALUES
  ('alice@example.com', 'alice', '$2b$12$ihVHMA1GtkYAxacLsIjZs.FYstPOYYtBReZWw2vl9JLhJdRJLqaQO'),
  ('bob@example.com', 'bob', '$2b$12$ihVHMA1GtkYAxacLsIjZs.FYstPOYYtBReZWw2vl9JLhJdRJLqaQO'),
  ('charlie@example.com', 'charlie', '$2b$12$ihVHMA1GtkYAxacLsIjZs.FYstPOYYtBReZWw2vl9JLhJdRJLqaQO'),
  ('diana@example.com', 'diana', '$2b$12$ihVHMA1GtkYAxacLsIjZs.FYstPOYYtBReZWw2vl9JLhJdRJLqaQO'),
  ('eve@example.com', 'eve', '$2b$12$ihVHMA1GtkYAxacLsIjZs.FYstPOYYtBReZWw2vl9JLhJdRJLqaQO');

-- Insert public rooms
INSERT INTO rooms (name, description, visibility, owner_id) VALUES
  ('General Chat', 'General discussion room for everyone', 'public', 1),
  ('Tech Discussion', 'Share technology tips and ask questions', 'public', 2),
  ('Random', 'Off-topic chat and fun content', 'public', 3),
  ('Project Updates', 'Share project progress and updates', 'public', 1);

-- Insert private rooms
INSERT INTO rooms (name, description, visibility, owner_id) VALUES
  ('Design Team', 'Private design team collaboration', 'private', 1),
  ('Backend Development', 'Private backend dev discussions', 'private', 2),
  ('Book Club', 'Private book club discussion', 'private', 4);

-- Add members to public rooms
INSERT INTO room_members (room_id, user_id, role) VALUES
  -- General Chat (room 1)
  (1, 1, 'owner'),
  (1, 2, 'member'),
  (1, 3, 'member'),
  (1, 4, 'member'),
  (1, 5, 'member'),
  -- Tech Discussion (room 2)
  (2, 2, 'owner'),
  (2, 1, 'admin'),
  (2, 3, 'member'),
  (2, 5, 'member'),
  -- Random (room 3)
  (3, 3, 'owner'),
  (3, 1, 'member'),
  (3, 2, 'member'),
  (3, 4, 'member'),
  -- Project Updates (room 4)
  (4, 1, 'owner'),
  (4, 2, 'member'),
  (4, 3, 'member'),
  (4, 4, 'admin'),
  (4, 5, 'member');

-- Add members to private rooms
INSERT INTO room_members (room_id, user_id, role) VALUES
  -- Design Team (room 5)
  (5, 1, 'owner'),
  (5, 4, 'member'),
  -- Backend Development (room 6)
  (6, 2, 'owner'),
  (6, 3, 'member'),
  (6, 5, 'member'),
  -- Book Club (room 7)
  (7, 4, 'owner'),
  (7, 1, 'member'),
  (7, 5, 'member');

-- Insert friend relationships (some pending, some accepted)
INSERT INTO friendships (requester_id, addressee_id, status) VALUES
  (1, 2, 'accepted'),
  (1, 4, 'accepted'),
  (2, 3, 'accepted'),
  (2, 5, 'accepted'),
  (3, 4, 'pending'),
  (3, 5, 'accepted'),
  (4, 5, 'accepted');

-- Insert messages in General Chat (room 1)
INSERT INTO messages (room_id, user_id, content) VALUES
  (1, 1, 'Welcome to General Chat! 👋 Feel free to introduce yourselves'),
  (1, 2, 'Hi everyone! 😊 Excited to join this community'),
  (1, 3, 'Hello all! Looking forward to interesting discussions here'),
  (1, 4, 'Hi there! 👋 Great to see everyone'),
  (1, 5, 'Hey folks! 🎉 Ready to chat');

-- Insert reply to a message in General Chat
INSERT INTO messages (room_id, user_id, content, reply_to_id) VALUES
  (1, 1, '@bob Sure! Tell us about yourself', 2);

-- Insert messages with emoji in Tech Discussion (room 2)
INSERT INTO messages (room_id, user_id, content) VALUES
  (2, 2, 'Today I learned about optimizing database queries 🚀'),
  (2, 1, 'That sounds great! 💡 Do you have any specific tips?'),
  (2, 3, 'I prefer using indexes on frequently queried columns 📊'),
  (2, 5, 'Has anyone tried query caching? ⚡'),
  (2, 1, 'Query caching works well for read-heavy workloads 🔥');

-- Insert messages with replies in Random (room 3)
INSERT INTO messages (room_id, user_id, content) VALUES
  (3, 3, 'What is everyone''s favorite programming language? 🤔'),
  (3, 1, 'I love Python for its simplicity 🐍'),
  (3, 2, 'JavaScript is great for web development 🌐'),
  (3, 4, 'Go is my go-to for system programs 🎯');

-- Insert reply to language discussion
INSERT INTO messages (room_id, user_id, content, reply_to_id) VALUES
  (3, 2, '@alice Python is indeed elegant! 😍', (SELECT id FROM messages WHERE room_id = 3 AND user_id = 1 AND content LIKE 'I love Python%'));

-- Insert messages in Project Updates (room 4)
INSERT INTO messages (room_id, user_id, content) VALUES
  (4, 1, '📋 Sprint planning completed for next week'),
  (4, 4, '✅ Backend API is 80% complete'),
  (4, 2, '🎨 Frontend redesign in progress'),
  (4, 3, 'Testing suite covers 75% of features now 🧪'),
  (4, 5, '🚀 Deployment pipeline is ready');

-- Insert messages in Design Team (room 5)
INSERT INTO messages (room_id, user_id, content) VALUES
  (5, 1, 'Sharing the latest design mockups for the dashboard 🎨'),
  (5, 4, 'Love the color scheme! 😍 Very modern'),
  (5, 1, 'Thanks! Let me know if you want any changes'),
  (5, 4, 'The spacing looks perfect 👌');

-- Insert messages in Backend Development (room 6)
INSERT INTO messages (room_id, user_id, content) VALUES
  (6, 2, 'Just refactored the authentication middleware 🔐'),
  (6, 3, 'Nice! Did you add unit tests? 🧪'),
  (6, 2, 'Of course! 100% coverage on critical paths'),
  (6, 5, 'What about error handling? 🤔'),
  (6, 2, 'All edge cases covered with proper error messages');

-- Insert messages in Book Club (room 7)
INSERT INTO messages (room_id, user_id, content) VALUES
  (7, 4, 'Finished reading "Clean Code" 📚 Highly recommended!'),
  (7, 1, 'Great book! 👍 The naming conventions chapter was eye-opening'),
  (7, 5, 'Just started it. Looking forward to discussing! 📖'),
  (7, 4, 'We should discuss the refactoring patterns next week');

-- Insert messages with replies in Book Club
INSERT INTO messages (room_id, user_id, content, reply_to_id) VALUES
  (7, 1, '@diana The testing chapter was also valuable 🎯', (SELECT id FROM messages WHERE room_id = 7 AND user_id = 4 AND content LIKE 'Finished reading%'));

-- Insert personal dialog between Alice and Bob
INSERT INTO personal_dialogs (user_a_id, user_b_id) VALUES (1, 2);

-- Insert messages in personal dialog
INSERT INTO messages (dialog_id, user_id, content) VALUES
  ((SELECT id FROM personal_dialogs WHERE (user_a_id = 1 AND user_b_id = 2) OR (user_a_id = 2 AND user_b_id = 1)), 1, 'Hey Bob! How are you doing? 😊'),
  ((SELECT id FROM personal_dialogs WHERE (user_a_id = 1 AND user_b_id = 2) OR (user_a_id = 2 AND user_b_id = 1)), 2, 'Hi Alice! Doing great! 👋 How about you?'),
  ((SELECT id FROM personal_dialogs WHERE (user_a_id = 1 AND user_b_id = 2) OR (user_a_id = 2 AND user_b_id = 1)), 1, 'Excellent! Want to grab coffee later? ☕'),
  ((SELECT id FROM personal_dialogs WHERE (user_a_id = 1 AND user_b_id = 2) OR (user_a_id = 2 AND user_b_id = 1)), 2, 'Sure! 3 PM at the usual place? ✅');

-- Insert personal dialog between Alice and Diana
INSERT INTO personal_dialogs (user_a_id, user_b_id) VALUES (1, 4);

-- Insert messages in personal dialog
INSERT INTO messages (dialog_id, user_id, content) VALUES
  ((SELECT id FROM personal_dialogs WHERE (user_a_id = 1 AND user_b_id = 4) OR (user_a_id = 4 AND user_b_id = 1)), 1, 'Diana, did you see the design feedback? 🎨'),
  ((SELECT id FROM personal_dialogs WHERE (user_a_id = 1 AND user_b_id = 4) OR (user_a_id = 4 AND user_b_id = 1)), 4, 'Yes! Your feedback was really helpful 😊'),
  ((SELECT id FROM personal_dialogs WHERE (user_a_id = 1 AND user_b_id = 4) OR (user_a_id = 4 AND user_b_id = 1)), 1, 'Let''s schedule a meeting to discuss the next phase');

-- Insert attachments (simulated - not actual files)
INSERT INTO attachments (message_id, filename, original_name, size, mime_type) VALUES
  ((SELECT MIN(id) FROM messages WHERE room_id = 5), 'dashboard-mockup-v2.pdf', 'dashboard-mockup-v2.pdf', 2048576, 'application/pdf'),
  ((SELECT MIN(id) FROM messages WHERE room_id = 5) + 1, 'color-palette.png', 'color-palette.png', 512000, 'image/png'),
  ((SELECT MIN(id) FROM messages WHERE room_id = 6), 'auth-middleware.js', 'auth-middleware.js', 15360, 'text/javascript'),
  ((SELECT MIN(id) FROM messages WHERE room_id = 7), 'clean-code-notes.txt', 'clean-code-notes.txt', 8192, 'text/plain');

-- Initialize user read tracking (mark some messages as read, others as unread for testing)
-- For Alice: mark all General Chat messages as read except the last one
INSERT INTO user_room_read (user_id, room_id, last_read_message_id) VALUES
  (1, 1, (SELECT id FROM messages WHERE room_id = 1 ORDER BY created_at DESC LIMIT 1 OFFSET 1)),
  (1, 2, (SELECT id FROM messages WHERE room_id = 2 ORDER BY created_at DESC LIMIT 1)),
  (1, 3, (SELECT id FROM messages WHERE room_id = 3 ORDER BY created_at DESC LIMIT 1)),
  (1, 4, (SELECT id FROM messages WHERE room_id = 4 ORDER BY created_at DESC LIMIT 1)),
  (1, 5, (SELECT id FROM messages WHERE room_id = 5 ORDER BY created_at DESC LIMIT 1)),
  (1, 7, (SELECT id FROM messages WHERE room_id = 7 ORDER BY created_at DESC LIMIT 1));

-- For Bob: mark most messages as read
INSERT INTO user_room_read (user_id, room_id, last_read_message_id) VALUES
  (2, 1, (SELECT id FROM messages WHERE room_id = 1 ORDER BY created_at DESC LIMIT 1)),
  (2, 2, (SELECT id FROM messages WHERE room_id = 2 ORDER BY created_at DESC LIMIT 1 OFFSET 2)),
  (2, 3, (SELECT id FROM messages WHERE room_id = 3 ORDER BY created_at DESC LIMIT 1 OFFSET 1)),
  (2, 4, (SELECT id FROM messages WHERE room_id = 4 ORDER BY created_at DESC LIMIT 1)),
  (2, 6, (SELECT id FROM messages WHERE room_id = 6 ORDER BY created_at DESC LIMIT 1));

-- For personal dialogs
INSERT INTO user_dialog_read (user_id, dialog_id, last_read_message_id) VALUES
  (1, 1, (SELECT id FROM messages WHERE dialog_id = 1 ORDER BY created_at DESC LIMIT 1)),
  (2, 1, (SELECT id FROM messages WHERE dialog_id = 1 ORDER BY created_at DESC LIMIT 1 OFFSET 1)),
  (1, 2, (SELECT id FROM messages WHERE dialog_id = 2 ORDER BY created_at DESC LIMIT 1 OFFSET 1)),
  (4, 2, (SELECT id FROM messages WHERE dialog_id = 2 ORDER BY created_at DESC LIMIT 1));
