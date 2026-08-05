#!/usr/bin/env bash
# ============================================================================
# فحوص ما قبل التطبيق لطبقة المعرفة (RAG) — تشغيل آلي على Postgres حقيقي.
#
# لماذا عنقود مؤقت لكل فحص: كل سكربت في supabase/preflight يبني سقالته
# بنفسه من الصفر (أدوار anon/authenticated، أنواع، جداول) ليقيس العزل
# والامتيازات تحت `set local role authenticated` لا بصلاحية superuser —
# والأدوار في Postgres عنقودية لا قاعدية، فتشغيل فحصين على العنقود نفسه
# يسقط الثاني بـ«الدور موجود». عنقود لكل فحص يجعل كل فحص مستقلًا تمامًا.
#
# الاستخدام:  bash scripts/rag-preflight.sh
# المتطلبات:  postgresql 16 + pgvector محليًّا (initdb/pg_ctl/psql في PATH
#             أو /usr/lib/postgresql/16/bin). يتخطى الفحص بلا فشل إن غابا.
# المخرج:     صفر عند نجاح كل الفحوص، وغير ذلك عند أول فشل.
# ============================================================================
set -uo pipefail

PGBIN="${PGBIN:-/usr/lib/postgresql/16/bin}"
[ -x "$PGBIN/initdb" ] || PGBIN="$(dirname "$(command -v initdb 2>/dev/null || echo /nonexistent)")"

if [ ! -x "$PGBIN/initdb" ] || [ ! -x "$PGBIN/pg_ctl" ]; then
  echo "⚠ لا يوجد Postgres محلي — فحوص RAG تُتخطّى (ليست فشلًا)."
  exit 0
fi

CHECKS=(
  supabase/preflight/rag_layer_check.sql
  supabase/preflight/rag_barrier_check.sql
  supabase/preflight/rag_capture_check.sql
  supabase/preflight/rag_operations_check.sql
  supabase/preflight/rag_search_check.sql
)

PORT="${RAG_PREFLIGHT_PORT:-55440}"
M="$(cd "$(dirname "$0")/../supabase/migrations" && pwd)"
RUNUSER=""
if [ "$(id -u)" = "0" ]; then
  # postgres يرفض العمل بصلاحية الجذر — نُسند التشغيل لمستخدم postgres.
  id postgres >/dev/null 2>&1 && RUNUSER="postgres"
fi

run_as() { if [ -n "$RUNUSER" ]; then su "$RUNUSER" -c "$1"; else bash -c "$1"; fi; }

failed=0
for check in "${CHECKS[@]}"; do
  name="$(basename "$check" .sql)"
  data="$(mktemp -d)/pg"
  mkdir -p "$data"
  [ -n "$RUNUSER" ] && chown -R "$RUNUSER" "$(dirname "$data")" "$data"

  run_as "$PGBIN/initdb -D $data -U postgres -E UTF8 --locale=C.utf8 -A trust" >/dev/null 2>&1
  run_as "$PGBIN/pg_ctl -D $data -o '-p $PORT -k /tmp -c listen_addresses=' -l $data/log start" >/dev/null 2>&1
  sleep 2

  # كل فحص يستدعي ملفات الترحيل الحقيقية بـ\i، فتُمرَّر مساراتها متغيّرات.
  out="$(psql -h /tmp -p "$PORT" -U postgres -v ON_ERROR_STOP=1 -q \
    -v normalize_file="$M/20260728093100_rag_ar_normalize.sql" \
    -v documents_file="$M/20260728093200_rag_documents.sql" \
    -v chunks_file="$M/20260728093300_rag_chunks.sql" \
    -v search_file="$M/20260728110000_rag_hybrid_search.sql" \
    -v loop_file="$M/20260728140000_rag_learning_loop.sql" \
    -v hardening_file="$M/20260728150000_rag_learning_hardening.sql" \
    -v capture_file="$M/20260728160000_rag_capture_readside.sql" \
    -v operations_file="$M/20260728170000_rag_operations.sql" \
    -f "$check" 2>&1)"
  code=$?
  if [ $code -eq 0 ]; then
    echo "✓ $name"
  else
    echo "✗ $name"
    echo "$out" | grep -i "error" | head -5
    failed=1
  fi

  run_as "$PGBIN/pg_ctl -D $data -m immediate stop" >/dev/null 2>&1
  rm -rf "$(dirname "$data")"
done

if [ $failed -ne 0 ]; then
  echo "✗ فحوص ما قبل التطبيق لم تمرّ — لا تُطبَّق ترحيلات RAG قبل إصلاحها."
  exit 1
fi

echo "✓ كل فحوص ما قبل التطبيق مرّت على Postgres حقيقي."
