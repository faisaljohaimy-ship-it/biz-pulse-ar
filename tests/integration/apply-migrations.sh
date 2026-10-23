#!/usr/bin/env bash
# ============================================================================
# Apply supabase/migrations/* to the integration cluster — tolerant, audited.
#
#   * `*_rollback.sql` files are EXCLUDED: they are interleaved with the
#     forward chain and would undo the feature applied just before them.
#   * One transaction per file (`psql -1 -v ON_ERROR_STOP=1`): a failing file
#     leaves nothing half-applied, and the next file still runs.
#   * Platform extensions that a stock Postgres lacks (vector, pg_cron, pg_net,
#     supabase_vault, pgmq) are commented out on the fly, and so are the
#     hnsw/ivfflat indexes that need the real pgvector. The copies live in a
#     temp dir; supabase/migrations is never written to.
#   * The set of failing files must EQUAL expected-migration-failures.txt.
#     Anything else — a new failure OR a listed file that now passes — exits 1.
#
# Usage: apply-migrations.sh <psql connection args...>
#   e.g. apply-migrations.sh -h 127.0.0.1 -p 55432 -U postgres -d postgres
# ============================================================================
set -uo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
MIGRATIONS="$ROOT/supabase/migrations"
EXPECTED="$HERE/expected-migration-failures.txt"

if [ $# -eq 0 ]; then
  echo "usage: $0 <psql connection args>" >&2
  exit 2
fi

work="$(mktemp -d "${TMPDIR:-/tmp}/sadeed-migrations.XXXXXX")"
trap 'rm -rf "$work"' EXIT
failed="$work/failed.txt"
: > "$failed"

ok=0
bad=0
for path in $(ls "$MIGRATIONS"/*.sql | grep -v '_rollback\.sql$' | sort); do
  f="$(basename "$path")"
  # Preprocess into the temp dir: platform-only DDL becomes a comment.
  perl -0777 -pe '
    s/CREATE\s+EXTENSION\s+(IF\s+NOT\s+EXISTS\s+)?("?)(vector|pg_cron|pg_net|supabase_vault|pgmq)\2([^;]*);/-- [shim] extension $3 stubbed;/gi;
    s/CREATE\s+(UNIQUE\s+)?INDEX\s+(IF\s+NOT\s+EXISTS\s+)?[^;]*?USING\s+(hnsw|ivfflat)[^;]*;/-- [shim] vector index removed;/gi;
    s/ALTER\s+EXTENSION\s+vector\s+SET\s+SCHEMA[^;]*;/-- [shim] vector schema move skipped;/gi;
  ' "$path" > "$work/$f"
  out="$(psql "$@" -X -q -1 -v ON_ERROR_STOP=1 -f "$work/$f" 2>&1)"
  if [ $? -eq 0 ]; then
    ok=$((ok + 1))
  else
    bad=$((bad + 1))
    echo "$f" >> "$failed"
    first="$(printf '%s\n' "$out" | grep -m1 'ERROR' || true)"
    echo "  ✗ $f — ${first:-see psql output}"
  fi
done
echo "migrations: $ok applied, $bad failed"

expected_sorted="$work/expected.txt"
grep -v '^\s*#' "$EXPECTED" | grep -v '^\s*$' | sort > "$expected_sorted"
sort "$failed" > "$work/failed.sorted"

if ! diff -u "$expected_sorted" "$work/failed.sorted" > "$work/diff.txt"; then
  echo "✗ failing migration set differs from expected-migration-failures.txt:" >&2
  echo "  lines with '-' are expected failures that now PASS (remove them from the allowlist);" >&2
  echo "  lines with '+' are NEW failures (the forward chain broke)." >&2
  grep '^[-+][^-+]' "$work/diff.txt" >&2
  exit 1
fi
echo "✓ failing set equals the allowlist ($(wc -l < "$expected_sorted") known files)."
