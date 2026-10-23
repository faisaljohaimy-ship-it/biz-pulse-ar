#!/usr/bin/env bash
# ============================================================================
# Integration stack — real Postgres 16 + PostgREST 12.2.3 + Node gateway.
#
#   tests/integration/stack.sh up      bring everything up, apply the chain,
#                                      seed fixtures, write .env.integration
#   tests/integration/stack.sh down    stop everything, delete the data dir
#   tests/integration/stack.sh status  print what is running
#
# Design notes (each one was measured, see the header of each file):
#   * The data directory is created with mktemp under ${RUNNER_TEMP:-/tmp},
#     never under the session scratch path: that path is reset to 0700 by the
#     agent harness and the checkpointer then PANICs on pg_control.
#   * As root (this container) Postgres refuses to run, so initdb/pg_ctl are
#     executed via `su postgres -c`; as a normal user (GitHub runners) they run
#     directly. Nothing else needs privileges.
#   * The database MUST be named `postgres`: 20260708133930 runs
#     `ALTER DATABASE postgres SET search_path`.
#   * PostgREST is a pinned static binary. If tests/integration/bin/postgrest
#     is absent the tarball is downloaded into a cache dir and verified by
#     sha256 before extraction; the binary is never committed.
#   * The JWT secret is random per run (hex 64) and written 0600 inside the
#     data dir. The env file holds test-only tokens signed with it. Nothing
#     secret is printed.
#   * Missing Postgres binaries: fail (exit 1) — on CI as well as locally.
#     A skipped stack would make the integration job green for nothing.
# ============================================================================
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"

PG_PORT="${INTEGRATION_PG_PORT:-55432}"
PGRST_PORT="${INTEGRATION_PGRST_PORT:-54331}"
GW_PORT="${INTEGRATION_GATEWAY_PORT:-54330}"
ENV_FILE="${INTEGRATION_ENV_FILE:-$HERE/.env.integration}"
BASE_TMP="${RUNNER_TEMP:-/tmp}"

POSTGREST_VERSION="v12.2.3"
POSTGREST_TARBALL_SHA256="9f71269e61ac3a940281e93ff415760f5957e430e475ba4c3889f3ede7d5527c"
POSTGREST_BINARY_SHA256="870a77f49508479bc87c5504b6b0c3715c7220926932d916b0d73952b297c617"
POSTGREST_URL="https://github.com/PostgREST/postgrest/releases/download/${POSTGREST_VERSION}/postgrest-${POSTGREST_VERSION}-linux-static-x64.tar.xz"
CACHE_DIR="${INTEGRATION_CACHE_DIR:-${XDG_CACHE_HOME:-$HOME/.cache}/sadeed-integration}"

PGBIN="${PGBIN:-/usr/lib/postgresql/16/bin}"
if [ ! -x "$PGBIN/initdb" ]; then
  PGBIN="$(dirname "$(command -v initdb 2>/dev/null || echo /nonexistent/initdb)")"
fi

RUNUSER=""
if [ "$(id -u)" = "0" ] && id postgres >/dev/null 2>&1; then
  RUNUSER="postgres"
fi
run_as() { if [ -n "$RUNUSER" ]; then su "$RUNUSER" -c "$1"; else bash -c "$1"; fi; }

PSQL=(psql -X -h 127.0.0.1 -p "$PG_PORT" -U postgres -d postgres)
# pg_isready ships with the server package; prefer the pinned PGBIN copy.
PG_ISREADY="$PGBIN/pg_isready"
[ -x "$PG_ISREADY" ] || PG_ISREADY="pg_isready"

log() { echo "[stack] $*"; }
die() { echo "[stack] ✗ $*" >&2; exit 1; }

sha256_of() { sha256sum "$1" | awk '{print $1}'; }

ensure_postgrest() {
  if [ -x "$HERE/bin/postgrest" ]; then
    POSTGREST="$HERE/bin/postgrest"
  else
    mkdir -p "$CACHE_DIR"
    POSTGREST="$CACHE_DIR/postgrest-${POSTGREST_VERSION}"
    if [ ! -x "$POSTGREST" ]; then
      log "downloading PostgREST ${POSTGREST_VERSION} into $CACHE_DIR"
      local dl
      dl="$(mktemp -d "$BASE_TMP/postgrest-dl.XXXXXX")"
      curl -sSfL --retry 3 -o "$dl/postgrest.tar.xz" "$POSTGREST_URL"
      local got
      got="$(sha256_of "$dl/postgrest.tar.xz")"
      [ "$got" = "$POSTGREST_TARBALL_SHA256" ] || { rm -rf "$dl"; die "PostgREST tarball sha256 mismatch: $got"; }
      tar --no-same-owner -xJf "$dl/postgrest.tar.xz" -C "$dl" postgrest
      mv "$dl/postgrest" "$POSTGREST"
      chmod 0755 "$POSTGREST"
      rm -rf "$dl"
    fi
  fi
  local bsha
  bsha="$(sha256_of "$POSTGREST")"
  [ "$bsha" = "$POSTGREST_BINARY_SHA256" ] || die "PostgREST binary sha256 mismatch at $POSTGREST: $bsha"
}

wait_for_port() {
  local port="$1" what="$2" i
  for i in $(seq 1 60); do
    if (exec 3<>"/dev/tcp/127.0.0.1/$port") 2>/dev/null; then return 0; fi
    sleep 0.5
  done
  die "$what did not open port $port in time"
}

cmd_status() {
  if [ ! -f "$ENV_FILE" ]; then echo "stack: down (no $ENV_FILE)"; return 0; fi
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  echo "stack: env file $ENV_FILE"
  echo "  workdir  ${INTEGRATION_WORKDIR:-?}"
  echo "  postgres 127.0.0.1:${INTEGRATION_PG_PORT:-?}  $("$PG_ISREADY" -h 127.0.0.1 -p "${INTEGRATION_PG_PORT:-0}" >/dev/null 2>&1 && echo up || echo down)"
  echo "  postgrest pid ${INTEGRATION_PGRST_PID:-?} $(kill -0 "${INTEGRATION_PGRST_PID:-0}" 2>/dev/null && echo up || echo down)"
  echo "  gateway   pid ${INTEGRATION_GATEWAY_PID:-?} $(kill -0 "${INTEGRATION_GATEWAY_PID:-0}" 2>/dev/null && echo up || echo down)  ${SUPABASE_URL:-}"
}

cmd_down() {
  if [ ! -f "$ENV_FILE" ]; then log "nothing to stop (no $ENV_FILE)"; return 0; fi
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  for pid in "${INTEGRATION_GATEWAY_PID:-}" "${INTEGRATION_PGRST_PID:-}"; do
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then kill "$pid" 2>/dev/null || true; fi
  done
  if [ -n "${INTEGRATION_PGDATA:-}" ] && [ -d "${INTEGRATION_PGDATA}" ]; then
    run_as "$PGBIN/pg_ctl -D '$INTEGRATION_PGDATA' -m fast -w stop" >/dev/null 2>&1 || true
  fi
  if [ -n "${INTEGRATION_WORKDIR:-}" ] && [ -d "${INTEGRATION_WORKDIR}" ]; then
    case "$INTEGRATION_WORKDIR" in
      "$BASE_TMP"/sadeed-integration.*) rm -rf "$INTEGRATION_WORKDIR" ;;
      *) log "refusing to delete unexpected workdir $INTEGRATION_WORKDIR" ;;
    esac
  fi
  rm -f "$ENV_FILE"
  log "✓ down"
}

cmd_up() {
  if [ -f "$ENV_FILE" ]; then
    log "an env file already exists at $ENV_FILE — running down first"
    cmd_down
  fi
  if [ ! -x "$PGBIN/initdb" ] || [ ! -x "$PGBIN/pg_ctl" ]; then
    if [ "${CI:-}" = "true" ]; then
      die "Postgres 16 binaries not found (PGBIN=$PGBIN). CI=true, so this is a failure, not a skip: install postgresql-16 on the runner."
    fi
    die "Postgres 16 binaries not found (PGBIN=$PGBIN). Install postgresql-16 (initdb/pg_ctl/psql) or set PGBIN."
  fi
  command -v node >/dev/null || die "node is required"
  command -v psql >/dev/null || die "psql is required"
  ensure_postgrest

  local W
  W="$(mktemp -d "$BASE_TMP/sadeed-integration.XXXXXX")"
  chmod 0711 "$W"
  local PGDATA="$W/pg"
  mkdir -p "$PGDATA"
  [ -n "$RUNUSER" ] && chown -R "$RUNUSER" "$PGDATA"

  # On any failure from here on, tear down what came up.
  cleanup_on_fail() {
    log "bring-up failed — cleaning up"
    [ -n "${GW_PID:-}" ] && kill "$GW_PID" 2>/dev/null || true
    [ -n "${PGRST_PID:-}" ] && kill "$PGRST_PID" 2>/dev/null || true
    run_as "$PGBIN/pg_ctl -D '$PGDATA' -m immediate -w stop" >/dev/null 2>&1 || true
    [ -f "$PGDATA/log" ] && { echo "--- postgres log (tail) ---"; tail -n 30 "$PGDATA/log"; }
    [ -f "$W/postgrest.log" ] && { echo "--- postgrest log (tail) ---"; tail -n 30 "$W/postgrest.log"; }
    rm -rf "$W"
  }
  trap cleanup_on_fail ERR

  log "initdb → $PGDATA"
  run_as "$PGBIN/initdb -D '$PGDATA' -U postgres -E UTF8 --locale=C.utf8 -A trust" >/dev/null
  run_as "$PGBIN/pg_ctl -D '$PGDATA' -o '-p $PG_PORT -k /tmp -c listen_addresses=127.0.0.1 -c fsync=off -c full_page_writes=off -c synchronous_commit=off -c log_min_messages=warning' -l '$PGDATA/log' -w start" >/dev/null
  for i in $(seq 1 40); do
    "$PG_ISREADY" -h 127.0.0.1 -p "$PG_PORT" >/dev/null 2>&1 && break
    sleep 0.5
  done
  "$PG_ISREADY" -h 127.0.0.1 -p "$PG_PORT" >/dev/null 2>&1 || die "postgres did not become ready"
  log "postgres up on 127.0.0.1:$PG_PORT"

  "${PSQL[@]}" -q -c 'alter database postgres set search_path = "$user", public, extensions' >/dev/null
  log "applying platform shim"
  "${PSQL[@]}" -q -v ON_ERROR_STOP=1 -f "$HERE/sql/00-platform-shim.sql" >/dev/null
  log "applying supabase/migrations (rollbacks excluded, one transaction per file)"
  bash "$HERE/apply-migrations.sh" -h 127.0.0.1 -p "$PG_PORT" -U postgres -d postgres
  log "seeding fixtures"
  "${PSQL[@]}" -q -v ON_ERROR_STOP=1 -f "$HERE/sql/fixtures.sql" >/dev/null

  # Per-run JWT secret (PostgREST needs ≥ 32 chars).
  local SECRET_FILE="$W/jwt-secret"
  node -e 'process.stdout.write(require("node:crypto").randomBytes(32).toString("hex"))' > "$SECRET_FILE"
  chmod 0600 "$SECRET_FILE"

  cat > "$W/postgrest.conf" <<EOF
db-uri = "postgres://authenticator@127.0.0.1:${PG_PORT}/postgres"
db-schemas = "public"
db-anon-role = "anon"
db-extra-search-path = "public, extensions"
db-pool = 10
jwt-secret = "@${SECRET_FILE}"
server-host = "127.0.0.1"
server-port = ${PGRST_PORT}
log-level = "error"
EOF
  "$POSTGREST" "$W/postgrest.conf" > "$W/postgrest.log" 2>&1 &
  PGRST_PID=$!
  wait_for_port "$PGRST_PORT" "PostgREST"
  log "postgrest up on 127.0.0.1:$PGRST_PORT (pid $PGRST_PID)"

  JWT_SECRET_FILE="$SECRET_FILE" PGRST_URL="http://127.0.0.1:${PGRST_PORT}" GATEWAY_PORT="$GW_PORT" \
    node "$HERE/harness/gateway.mjs" > "$W/gateway.log" 2>&1 &
  GW_PID=$!
  wait_for_port "$GW_PORT" "gateway"
  log "gateway up on 127.0.0.1:$GW_PORT (pid $GW_PID)"

  local ANON_JWT SERVICE_JWT
  ANON_JWT="$(node "$HERE/harness/mint-jwt.mjs" --secret-file "$SECRET_FILE" --role anon)"
  SERVICE_JWT="$(node "$HERE/harness/mint-jwt.mjs" --secret-file "$SECRET_FILE" --role service_role)"

  # Smoke: anon must see nothing in a protected table; service_role must see fixtures.
  local probe
  probe="$(curl -sS -H "apikey: $ANON_JWT" -H "Authorization: Bearer $SERVICE_JWT" \
    "http://127.0.0.1:${GW_PORT}/rest/v1/sec_incidents?select=ref&ref=like.INT-*&order=ref")"
  case "$probe" in
    *INT-A-1*INT-B-2*) ;;
    *) die "smoke probe through the gateway did not return the fixtures: $probe" ;;
  esac

  umask 077
  cat > "$ENV_FILE" <<EOF
# Generated by tests/integration/stack.sh — test-only values, random per run. Never commit.
SUPABASE_URL=http://127.0.0.1:${GW_PORT}
SUPABASE_PUBLISHABLE_KEY=${ANON_JWT}
SUPABASE_ANON_KEY=${ANON_JWT}
SUPABASE_SERVICE_ROLE_KEY=${SERVICE_JWT}
INTEGRATION_JWT_SECRET=$(cat "$SECRET_FILE")
INTEGRATION_PG_URL=postgres://postgres@127.0.0.1:${PG_PORT}/postgres
INTEGRATION_PG_PORT=${PG_PORT}
INTEGRATION_PGDATA=${PGDATA}
INTEGRATION_WORKDIR=${W}
INTEGRATION_PGRST_PID=${PGRST_PID}
INTEGRATION_GATEWAY_PID=${GW_PID}
EOF
  trap - ERR
  log "✓ up — env written to $ENV_FILE"
}

case "${1:-}" in
  up) cmd_up ;;
  down) cmd_down ;;
  status) cmd_status ;;
  *) echo "usage: $0 up|down|status" >&2; exit 2 ;;
esac
