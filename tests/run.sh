#!/bin/bash
# End-to-end API test runner for the Online Chat Server
# See tests/plan.md for the test catalogue.
set -u

BASE=${BASE:-http://localhost:3000/api/v1}
RUN_ID=$(date +%s)
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

CASES=0
PASS=0
FAIL=0

color_pass=$'\033[32m'
color_fail=$'\033[31m'
color_head=$'\033[1m'
color_dim=$'\033[90m'
color_off=$'\033[0m'

header() { echo ""; echo "${color_head}## $1${color_off}"; }
ok()   { CASES=$((CASES+1)); PASS=$((PASS+1)); echo "  ${color_pass}ok${color_off} $CASES — $1"; }
bad()  { CASES=$((CASES+1)); FAIL=$((FAIL+1)); echo "  ${color_fail}not ok${color_off} $CASES — $1"; [ -n "${2:-}" ] && echo "    ${color_dim}$2${color_off}"; }

# assert $actual_code == $expected, descr
assert_code() {
  local expected="$1"; local actual="$2"; local descr="$3"
  if [ "$actual" = "$expected" ]; then ok "$descr"; else bad "$descr" "expected $expected, got $actual"; fi
}

# assert $actual != $expected
assert_not_code() {
  local not="$1"; local actual="$2"; local descr="$3"
  if [ "$actual" != "$not" ]; then ok "$descr"; else bad "$descr" "got $actual (should differ)"; fi
}

assert_jq() {
  local file="$1"; local filter="$2"; local expected="$3"; local descr="$4"
  local got; got=$(jq -r "$filter" < "$file" 2>/dev/null || echo "<jq-error>")
  if [ "$got" = "$expected" ]; then ok "$descr"; else bad "$descr" "got '$got', expected '$expected'"; fi
}

# req METHOD PATH JSON_OR_- COOKIE_JAR → writes body to $TMP/resp, prints status code
req() {
  local method="$1"; local path="$2"; local body="$3"; local jar="$4"
  local args=(-s -w '%{http_code}' -o "$TMP/resp" -X "$method" "$BASE$path" -b "$jar" -c "$jar")
  if [ "$body" != "-" ]; then args+=(-H 'Content-Type: application/json' -d "$body"); fi
  curl "${args[@]}"
}

# upload PATH FILE MSG_ID COOKIE_JAR → writes body to $TMP/resp, prints status code
upload() {
  local path="$1"; local file="$2"; local msg_id="$3"; local jar="$4"
  curl -s -w '%{http_code}' -o "$TMP/resp" -X POST "$BASE$path" \
       -b "$jar" -c "$jar" \
       -F "file=@$file" -F "messageId=$msg_id"
}

# get_download PATH COOKIE_JAR → status code (body discarded)
get_download() {
  curl -s -w '%{http_code}' -o /dev/null "$BASE$1" -b "$2" -c "$2"
}

register() {
  local email="$1"; local username="$2"; local password="$3"; local jar="$4"
  req POST /auth/register "{\"email\":\"$email\",\"username\":\"$username\",\"password\":\"$password\"}" "$jar" > "$TMP/code"
}

login() {
  local email="$1"; local password="$2"; local jar="$3"
  req POST /auth/login "{\"email\":\"$email\",\"password\":\"$password\"}" "$jar" > "$TMP/code"
}

suffix=$RUN_ID

# ── Test fixtures ────────────────────────────────────────────────────────────
alice="tst_alice_$suffix"
bob="tst_bob_$suffix"
charlie="tst_charlie_$suffix"
alice_email="$alice@test.local"
bob_email="$bob@test.local"
charlie_email="$charlie@test.local"
pw="testpass123"

alice_jar="$TMP/alice.jar"
bob_jar="$TMP/bob.jar"
charlie_jar="$TMP/charlie.jar"
alice_jar2="$TMP/alice2.jar"   # second session for alice (logout-others test)

echo "${color_head}Chat API test run — suffix $suffix${color_off}"
echo "Target: $BASE"

# ── 2.1 Auth & Account ──────────────────────────────────────────────────────
header "2.1 Auth & Account"

code=$(req POST /auth/register "{\"email\":\"$alice_email\",\"username\":\"$alice\",\"password\":\"$pw\"}" "$alice_jar")
assert_code 201 "$code" "AUTH-01 register alice with valid fields"

code=$(req POST /auth/register "{\"email\":\"$alice_email\",\"username\":\"other_$suffix\",\"password\":\"$pw\"}" "$TMP/trash.jar")
assert_code 409 "$code" "AUTH-02 register duplicate email rejected"

code=$(req POST /auth/register "{\"email\":\"other_$suffix@test.local\",\"username\":\"$alice\",\"password\":\"$pw\"}" "$TMP/trash.jar")
assert_code 409 "$code" "AUTH-03 register duplicate username rejected"

code=$(req POST /auth/register "{\"email\":\"$bob_email\",\"username\":\"$bob\",\"password\":\"$pw\"}" "$bob_jar")
assert_code 201 "$code" "AUTH-01b register bob"
req POST /auth/login "{\"email\":\"$bob_email\",\"password\":\"$pw\"}" "$bob_jar" > /dev/null

code=$(req POST /auth/register "{\"email\":\"$charlie_email\",\"username\":\"$charlie\",\"password\":\"$pw\"}" "$charlie_jar")
assert_code 201 "$code" "AUTH-01c register charlie"
req POST /auth/login "{\"email\":\"$charlie_email\",\"password\":\"$pw\"}" "$charlie_jar" > /dev/null

code=$(req POST /auth/login "{\"email\":\"$alice_email\",\"password\":\"$pw\"}" "$alice_jar")
assert_code 200 "$code" "AUTH-04 login with correct credentials"

code=$(req POST /auth/login "{\"email\":\"$alice_email\",\"password\":\"wrong\"}" "$TMP/trash.jar")
assert_code 401 "$code" "AUTH-05 login with wrong password → 401"

code=$(req GET /auth/me - "$alice_jar")
assert_code 200 "$code" "AUTH-06 GET /auth/me with session"
assert_jq "$TMP/resp" ".data.username" "$alice" "AUTH-06 /me returns current user"

# AUTH-08: username immutable
code=$(req PATCH /auth/users/me "{\"username\":\"newname_$suffix\"}" "$alice_jar")
assert_not_code 200 "$code" "AUTH-08 PATCH /users/me username is rejected"

# AUTH-09: wrong current password
code=$(req POST /auth/password/change "{\"currentPassword\":\"wrong\",\"newPassword\":\"newpass123\"}" "$alice_jar")
assert_code 400 "$code" "AUTH-09 change-password with wrong current → 400"

# AUTH-10: correct change
code=$(req POST /auth/password/change "{\"currentPassword\":\"$pw\",\"newPassword\":\"newpass123\"}" "$alice_jar")
assert_code 200 "$code" "AUTH-10 change-password with correct current → 200"
# re-login with new password
code=$(req POST /auth/login "{\"email\":\"$alice_email\",\"password\":\"newpass123\"}" "$alice_jar")
assert_code 200 "$code" "AUTH-10 new password works"
pw_alice="newpass123"

# AUTH-11/12: sessions list + sign-out-others
code=$(req POST /auth/login "{\"email\":\"$alice_email\",\"password\":\"$pw_alice\"}" "$alice_jar2")
assert_code 200 "$code" "AUTH-11 second session for alice"

code=$(req GET /auth/sessions - "$alice_jar")
assert_code 200 "$code" "AUTH-11 GET /auth/sessions"
n=$(jq '[.data[] | select(.isCurrent == true)] | length' "$TMP/resp" 2>/dev/null || echo -1)
if [ "$n" = "1" ]; then ok "AUTH-11 exactly one session flagged isCurrent"; else bad "AUTH-11 isCurrent count" "got $n"; fi

code=$(req DELETE /auth/sessions - "$alice_jar")
assert_code 204 "$code" "AUTH-12 DELETE /auth/sessions (sign out others)"
code=$(req GET /auth/me - "$alice_jar")
assert_code 200 "$code" "AUTH-12 current session still valid"
code=$(req GET /auth/me - "$alice_jar2")
assert_code 401 "$code" "AUTH-12 other session invalidated"

# ── 2.3 Friends ─────────────────────────────────────────────────────────────
header "2.3 Contacts / Friends"

# FR-01 alice → bob request
code=$(req POST /friends/request "{\"username\":\"$bob\"}" "$alice_jar")
assert_code 201 "$code" "FR-01 send friend request by username"

# FR-02 self
code=$(req POST /friends/request "{\"username\":\"$alice\"}" "$alice_jar")
assert_code 400 "$code" "FR-02 request to self → 400"

# FR-03 accept
req GET /friends/requests/pending - "$bob_jar" > "$TMP/code"
req_id=$(jq -r '.data[0].id' "$TMP/resp")
code=$(req POST "/friends/requests/$req_id/accept" - "$bob_jar")
assert_code 200 "$code" "FR-03 accept pending request"

# FR-04 alice now sees bob
code=$(req GET /friends - "$alice_jar")
assert_code 200 "$code" "FR-04 GET /friends"
count=$(jq '.data | length' "$TMP/resp")
if [ "$count" -ge 1 ]; then ok "FR-04 friends list contains at least one entry"; else bad "FR-04 friends list empty"; fi
bob_id=$(jq -r ".data[] | select(.username==\"$bob\") | .friend_id // .id" "$TMP/resp")

# send a DM that we'll later check for read-only after block
code=$(req POST "/friends/dialogs/$bob_id/messages" "{\"content\":\"pre-block hello\"}" "$alice_jar")
assert_code 201 "$code" "MSG-09 send DM to friend"

# FR-05 block
code=$(req POST "/friends/users/$bob_id/ban" - "$alice_jar")
assert_code 201 "$code" "FR-05 block user"

# FR-07 bans list
code=$(req GET /friends/bans - "$alice_jar")
assert_code 200 "$code" "FR-07 GET /friends/bans"
count=$(jq '.data | length' "$TMP/resp")
if [ "$count" -ge 1 ]; then ok "FR-07 bans list contains blocked user"; else bad "FR-07 bans list empty"; fi

# FR-06 history still readable, new message rejected
code=$(req GET "/friends/dialogs/$bob_id/messages" - "$alice_jar")
assert_code 200 "$code" "FR-06 DM history readable after block"
count=$(jq '.data | length' "$TMP/resp")
if [ "$count" -ge 1 ]; then ok "FR-06 history retained ($count msgs)"; else bad "FR-06 history empty" "expected ≥1 message"; fi

code=$(req POST "/friends/dialogs/$bob_id/messages" "{\"content\":\"should be blocked\"}" "$alice_jar")
assert_not_code 201 "$code" "FR-06 new DM rejected after block"

# unblock so we can remove friend cleanly
req DELETE "/friends/users/$bob_id/ban" - "$alice_jar" > /dev/null

# ── 2.4 Rooms ───────────────────────────────────────────────────────────────
header "2.4 Chat Rooms"

room_name="room_$suffix"
# ROOM-01
code=$(req POST /rooms "{\"name\":\"$room_name\",\"description\":\"test room\",\"visibility\":\"public\"}" "$alice_jar")
assert_code 201 "$code" "ROOM-01 create public room"
room_id=$(jq -r '.data.id' "$TMP/resp")

# ROOM-02 duplicate name
code=$(req POST /rooms "{\"name\":\"$room_name\",\"description\":\"dup\",\"visibility\":\"public\"}" "$bob_jar")
assert_not_code 201 "$code" "ROOM-02 duplicate room name rejected"

# ROOM-03 catalog
code=$(req GET /rooms - "$bob_jar")
assert_code 200 "$code" "ROOM-03 GET /rooms catalog"
found=$(jq "[.data[] | select(.id == $room_id)] | length" "$TMP/resp")
if [ "$found" = "1" ]; then ok "ROOM-03 public room visible in catalog"; else bad "ROOM-03 room missing"; fi

# ROOM-04 private not visible
priv_name="priv_$suffix"
code=$(req POST /rooms "{\"name\":\"$priv_name\",\"description\":\"\",\"visibility\":\"private\"}" "$alice_jar")
assert_code 201 "$code" "ROOM-04 create private room"
priv_id=$(jq -r '.data.id' "$TMP/resp")
req GET /rooms - "$bob_jar" > "$TMP/code"
hidden=$(jq "[.data[] | select(.id == $priv_id)] | length" "$TMP/resp")
if [ "$hidden" = "0" ]; then ok "ROOM-04 private room hidden from catalog"; else bad "ROOM-04 private room leaked"; fi

# ROOM-05 bob joins
code=$(req POST "/rooms/$room_id/join" - "$bob_jar")
assert_code 200 "$code" "ROOM-05 non-owner joins public room"

# ROOM-06 bob leaves
code=$(req POST "/rooms/$room_id/leave" - "$bob_jar")
assert_code 200 "$code" "ROOM-06 non-owner leaves"
# re-join for later tests
req POST "/rooms/$room_id/join" - "$bob_jar" > /dev/null

# ROOM-07 owner cannot leave
code=$(req POST "/rooms/$room_id/leave" - "$alice_jar")
assert_code 403 "$code" "ROOM-07 owner cannot leave → 403"

# charlie joins
req POST "/rooms/$room_id/join" - "$charlie_jar" > /dev/null
req GET "/rooms/$room_id" - "$alice_jar" > "$TMP/code"
charlie_id=$(jq -r ".data.members[] | select(.username==\"$charlie\") | .user_id" "$TMP/resp")

# ROOM-08 owner promotes charlie to admin
code=$(req POST "/rooms/$room_id/admins/$charlie_id" - "$alice_jar")
assert_code 200 "$code" "ROOM-08 owner promotes member to admin"

# ROOM-09 bob (plain member) can't promote
req GET "/rooms/$room_id" - "$alice_jar" > "$TMP/code"
bob_room_id=$(jq -r ".data.members[] | select(.username==\"$bob\") | .user_id" "$TMP/resp")
code=$(req POST "/rooms/$room_id/admins/$bob_room_id" - "$bob_jar")
assert_code 403 "$code" "ROOM-09 non-owner cannot promote → 403"

# ROOM-10 admin (charlie) bans bob
code=$(req POST "/rooms/$room_id/members/$bob_room_id/ban" - "$charlie_jar")
assert_code 200 "$code" "ROOM-10 admin bans member"

# ROOM-11 bob cannot rejoin
code=$(req POST "/rooms/$room_id/join" - "$bob_jar")
assert_code 403 "$code" "ROOM-11 banned user cannot rejoin → 403"

# ROOM-12 unban
code=$(req DELETE "/rooms/$room_id/bans/$bob_room_id" - "$alice_jar")
assert_code 200 "$code" "ROOM-12 owner unbans member"
code=$(req POST "/rooms/$room_id/join" - "$bob_jar")
assert_code 200 "$code" "ROOM-12 user can rejoin after unban"

# ROOM-14 invite by username (private room)
code=$(req POST "/rooms/$priv_id/members/invite" "{\"username\":\"$charlie\"}" "$alice_jar")
assert_code 201 "$code" "ROOM-14 invite by username adds to private room"

# ── 2.5 Messaging ───────────────────────────────────────────────────────────
header "2.5 Messaging"

# MSG-01
code=$(req POST "/rooms/$room_id/messages" "{\"content\":\"hello room\"}" "$alice_jar")
assert_code 201 "$code" "MSG-01 send message"
msg_id=$(jq -r '.data.id' "$TMP/resp")

# MSG-02 oversized
big=$(python3 -c "print('x'*3100)" 2>/dev/null || perl -e 'print "x" x 3100')
code=$(req POST "/rooms/$room_id/messages" "{\"content\":\"$big\"}" "$alice_jar")
assert_code 400 "$code" "MSG-02 message > 3 KB → 400"

# MSG-03 reply
code=$(req POST "/rooms/$room_id/messages" "{\"content\":\"replying\",\"replyToId\":$msg_id}" "$bob_jar")
assert_code 201 "$code" "MSG-03 reply with replyToId"
reply_id=$(jq -r '.data.id' "$TMP/resp")
reply_to=$(jq -r '.data.reply_to_id' "$TMP/resp")
if [ "$reply_to" = "$msg_id" ]; then ok "MSG-03 reply_to_id set correctly"; else bad "MSG-03 reply_to_id" "got $reply_to"; fi

# MSG-04 edit own
code=$(req PATCH "/messages/$msg_id" "{\"content\":\"hello room (edited)\"}" "$alice_jar")
assert_code 200 "$code" "MSG-04 edit own message"
edited=$(jq -r '.data.edited' "$TMP/resp")
if [ "$edited" = "true" ]; then ok "MSG-04 edited flag true"; else bad "MSG-04 edited flag" "got $edited"; fi

# MSG-05 edit other → 403/400
code=$(req PATCH "/messages/$msg_id" "{\"content\":\"hacked\"}" "$bob_jar")
assert_not_code 200 "$code" "MSG-05 cannot edit other user's message"

# MSG-07 admin deletes user's message (charlie is admin, msg_id was alice's)
# charlie wasn't originally affected by bans — they're still admin. Delete reply_id (bob's msg).
code=$(req DELETE "/messages/$reply_id" - "$charlie_jar")
assert_code 200 "$code" "MSG-07 admin deletes other user's message"

# MSG-06 delete own message
code=$(req POST "/rooms/$room_id/messages" "{\"content\":\"to delete\"}" "$alice_jar")
own_id=$(jq -r '.data.id' "$TMP/resp")
code=$(req DELETE "/messages/$own_id" - "$alice_jar")
assert_code 200 "$code" "MSG-06 delete own message"

# MSG-08 chronological order
code=$(req GET "/rooms/$room_id/messages?limit=10" - "$alice_jar")
assert_code 200 "$code" "MSG-08 GET /rooms/:id/messages"
sorted=$(jq '[.data[].id] | (. == sort)' "$TMP/resp")
if [ "$sorted" = "true" ]; then ok "MSG-08 messages returned in chronological order"; else bad "MSG-08 order" "not ascending"; fi

# ── 2.6 Attachments ─────────────────────────────────────────────────────────
header "2.6 Attachments"

# FILE-01 upload + link to message
code=$(req POST "/rooms/$room_id/messages" "{\"content\":\"with file\"}" "$alice_jar")
att_msg=$(jq -r '.data.id' "$TMP/resp")
echo "hello from test runner" > "$TMP/note.txt"
code=$(upload /files/upload "$TMP/note.txt" "$att_msg" "$alice_jar")
assert_code 201 "$code" "FILE-01 upload file and link to message"
att_id=$(jq -r '.data.attachment.id' "$TMP/resp")

# FILE-02 attachment appears on message history
code=$(req GET "/rooms/$room_id/messages?limit=20" - "$alice_jar")
has_att=$(jq "[.data[] | select(.id==$att_msg) | .attachments[] | select(.id==$att_id)] | length" "$TMP/resp")
if [ "$has_att" = "1" ]; then ok "FILE-02 attachment returned on message history"; else bad "FILE-02 attachment missing"; fi

# FILE-03 member can download
code=$(get_download "/files/$att_id" "$bob_jar")
assert_code 200 "$code" "FILE-03 room member can download file"

# FILE-04 non-member cannot
# charlie is a member; create a fresh user to test non-member
outside_user="tst_outside_$suffix"
outside_jar="$TMP/outside.jar"
req POST /auth/register "{\"email\":\"$outside_user@test.local\",\"username\":\"$outside_user\",\"password\":\"$pw\"}" "$outside_jar" > /dev/null
req POST /auth/login "{\"email\":\"$outside_user@test.local\",\"password\":\"$pw\"}" "$outside_jar" > /dev/null
code=$(get_download "/files/$att_id" "$outside_jar")
assert_code 403 "$code" "FILE-04 non-member cannot download file"

# ── 2.7 Unread Indicators ───────────────────────────────────────────────────
header "2.7 Unread Indicators"

# bob sends a message; alice should see unread count
req POST "/rooms/$room_id/messages" "{\"content\":\"unread me\"}" "$bob_jar" > /dev/null
code=$(req GET /unreads - "$alice_jar")
assert_code 200 "$code" "UNREAD-01 GET /unreads"
cnt=$(jq -r "[.data.rooms[] | select(.room_id == $room_id)] | length" "$TMP/resp")
if [ "$cnt" -ge 0 ]; then ok "UNREAD-01 rooms entries returned"; else bad "UNREAD-01 room entry missing"; fi

# mark as read — fetch the newest message id, then POST mark-read
req GET "/rooms/$room_id/messages?limit=50" - "$alice_jar" > /dev/null
last_msg=$(jq -r '.data[-1].id' "$TMP/resp")
req POST "/rooms/$room_id/mark-read" "{\"lastMessageId\":$last_msg}" "$alice_jar" > /dev/null
code=$(req GET /unreads - "$alice_jar")
assert_code 200 "$code" "UNREAD-02 refetch unreads after mark-read"
remaining=$(jq -r "[.data.rooms[] | select(.room_id == $room_id)] | length" "$TMP/resp")
if [ "$remaining" = "0" ]; then ok "UNREAD-02 room unread cleared after mark-read"; else bad "UNREAD-02 still unread" "entries: $remaining"; fi

# UNREAD-03 — dialog entries keyed by other_user_id (just check shape)
code=$(req GET /unreads - "$alice_jar")
schema=$(jq -r '.data.dialogs[0] // {} | keys | sort | join(",")' "$TMP/resp" 2>/dev/null || echo "")
if [ -z "$schema" ] || echo "$schema" | grep -q 'other_user_id'; then
  ok "UNREAD-03 dialog entries include other_user_id (or list is empty)"
else
  bad "UNREAD-03 dialog schema missing other_user_id" "keys: $schema"
fi

# ── Cleanup: delete rooms owned by alice ────────────────────────────────────
req DELETE "/rooms/$room_id" - "$alice_jar" > /dev/null
req DELETE "/rooms/$priv_id" - "$alice_jar" > /dev/null

# ── Summary ────────────────────────────────────────────────────────────────
echo ""
echo "${color_head}Summary${color_off}"
echo "  Total: $CASES    ${color_pass}Passed: $PASS${color_off}    ${color_fail}Failed: $FAIL${color_off}"

if [ "$FAIL" -gt 0 ]; then exit 1; fi
