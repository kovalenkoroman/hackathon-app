#!/usr/bin/env bash
# Perf test: 100K-message room history scroll.
#
# Verifies hackathon hint #5 — "progressive scroll to earliest messages with
# 100K+ message history". Seeds a dedicated perf-test room, runs the same
# query the API uses under `GET /api/v1/rooms/:id/messages?before=...`, and
# fails if a deep-paginated request takes longer than PERF_BUDGET_MS (default 100ms).
#
# Run via: docker compose up -d && tests/perf_history.sh
set -euo pipefail

PERF_BUDGET_MS="${PERF_BUDGET_MS:-100}"
MESSAGE_COUNT="${MESSAGE_COUNT:-100000}"
ROOM_NAME='__perf_test_room'
DB_EXEC=(docker compose exec -T db psql -U postgres -d chatapp -v ON_ERROR_STOP=1)

exec_sql() { "${DB_EXEC[@]}" -c "$1"; }
exec_sql_silent() { "${DB_EXEC[@]}" -qtAX -c "$1"; }

echo "== Applying pagination index (idempotent) =="
exec_sql "CREATE INDEX IF NOT EXISTS idx_messages_room_id_id ON messages (room_id, id);"
exec_sql "CREATE INDEX IF NOT EXISTS idx_messages_dialog_id_id ON messages (dialog_id, id);"

echo "== Preparing perf-test room =="
exec_sql "DELETE FROM messages WHERE room_id = (SELECT id FROM rooms WHERE name = '$ROOM_NAME');"
exec_sql "DELETE FROM rooms WHERE name = '$ROOM_NAME';"
exec_sql "INSERT INTO rooms (name, description, visibility, owner_id) VALUES ('$ROOM_NAME', 'Perf test fixture — do not use', 'public', 1);"

ROOM_ID=$(exec_sql_silent "SELECT id FROM rooms WHERE name = '$ROOM_NAME';")
echo "Room id: $ROOM_ID"

exec_sql "INSERT INTO room_members (room_id, user_id, role) VALUES ($ROOM_ID, 1, 'owner') ON CONFLICT DO NOTHING;"

echo "== Bulk-inserting $MESSAGE_COUNT messages =="
SEED_START=$(date +%s)
exec_sql "
  INSERT INTO messages (room_id, user_id, content)
  SELECT $ROOM_ID,
         ((i % 10) + 1),
         'perf message #' || i
    FROM generate_series(1, $MESSAGE_COUNT) AS i;
"
SEED_END=$(date +%s)
echo "Seed took $((SEED_END - SEED_START))s"

# Capture the highest message id for the cursor tests.
# Let the planner see accurate row counts before we test.
exec_sql "ANALYZE messages;"

MAX_ID=$(exec_sql_silent "SELECT MAX(id) FROM messages WHERE room_id = $ROOM_ID;")
MIN_ID=$(exec_sql_silent "SELECT MIN(id) FROM messages WHERE room_id = $ROOM_ID;")
MID_CURSOR=$((MAX_ID - MESSAGE_COUNT / 2))        # middle of history — worst case for sort
DEEP_CURSOR=$((MIN_ID + 500))                      # near the oldest messages
echo "MIN_ID=$MIN_ID MAX_ID=$MAX_ID MID_CURSOR=$MID_CURSOR DEEP_CURSOR=$DEEP_CURSOR"

run_timed_query() {
  local label="$1"
  local before_clause="$2"
  # Run the query 3x via EXPLAIN ANALYZE and keep the fastest "Execution Time"
  # so we measure warm-cache behaviour — matches how a paginating UI hits the DB.
  local best_ms=999999
  for _ in 1 2 3; do
    local ms
    ms=$("${DB_EXEC[@]}" -qtAX -c "
      EXPLAIN (ANALYZE, FORMAT TEXT)
      SELECT m.id FROM messages m
        WHERE m.room_id = $ROOM_ID AND m.deleted = false $before_clause
        ORDER BY m.id DESC LIMIT 50;
    " 2>/dev/null | awk -F'Execution Time: ' '/Execution Time/ {print $2}' | awk '{print $1}')
    if [ -n "$ms" ] && awk "BEGIN{exit !($ms < $best_ms)}"; then
      best_ms=$ms
    fi
  done
  printf '%-24s best=%sms\n' "$label" "$best_ms"
  awk -v v="$best_ms" -v b="$PERF_BUDGET_MS" 'BEGIN{exit !(v < b)}' \
    || { echo "  FAIL: exceeded ${PERF_BUDGET_MS}ms budget"; exit 1; }
}

echo "== Query timings (budget ${PERF_BUDGET_MS}ms, best of 3 runs) =="
run_timed_query "first page (newest 50)"       ""
run_timed_query "page 2 (~50 back)"            "AND m.id < $((MAX_ID - 50))"
run_timed_query "middle (~50k back, worst)"    "AND m.id < $MID_CURSOR"
run_timed_query "deep (~99500 back, oldest)"   "AND m.id < $DEEP_CURSOR"

echo "== EXPLAIN ANALYZE on middle page (worst case) =="
exec_sql "EXPLAIN (ANALYZE, BUFFERS) SELECT m.id FROM messages m
  WHERE m.room_id = $ROOM_ID AND m.deleted = false AND m.id < $MID_CURSOR
  ORDER BY m.id DESC LIMIT 50;"

echo "== End-to-end API timings (login + paginated fetch) =="
TMP_COOKIE=$(mktemp)
curl -sSf -c "$TMP_COOKIE" -H 'Content-Type: application/json' \
  -d '{"email":"alice@example.com","password":"password123"}' \
  http://localhost:3000/api/v1/auth/login > /dev/null
# Add alice as member so she can read the perf room
exec_sql "INSERT INTO room_members (room_id, user_id, role) VALUES ($ROOM_ID, 1, 'member') ON CONFLICT DO NOTHING;"

for cursor_label in "first" "middle" "deep"; do
  case "$cursor_label" in
    first)  CURSOR_Q="" ;;
    middle) CURSOR_Q="?before=$MID_CURSOR" ;;
    deep)   CURSOR_Q="?before=$DEEP_CURSOR" ;;
  esac
  # Take the best of 3 to measure warm-cache.
  BEST=999999
  for _ in 1 2 3; do
    T=$(curl -sSf -o /dev/null -b "$TMP_COOKIE" -w '%{time_total}' \
      "http://localhost:3000/api/v1/rooms/$ROOM_ID/messages$CURSOR_Q")
    MS=$(awk -v t="$T" 'BEGIN{printf "%.1f", t*1000}')
    if awk "BEGIN{exit !($MS < $BEST)}"; then BEST=$MS; fi
  done
  printf '%-24s best=%sms\n' "api-$cursor_label" "$BEST"
done
rm -f "$TMP_COOKIE"

echo "== Cleanup: drop perf-test room =="
exec_sql "DELETE FROM messages WHERE room_id = $ROOM_ID;"
exec_sql "DELETE FROM room_members WHERE room_id = $ROOM_ID;"
exec_sql "DELETE FROM rooms WHERE id = $ROOM_ID;"

echo
echo "PASS — deep pagination under ${PERF_BUDGET_MS}ms across $MESSAGE_COUNT messages"
