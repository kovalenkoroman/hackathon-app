-- Optional text attached to a friend request (requirement 2.3.2)
ALTER TABLE friendships ADD COLUMN IF NOT EXISTS message TEXT;
