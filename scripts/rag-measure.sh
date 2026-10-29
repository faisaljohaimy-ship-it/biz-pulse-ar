#!/usr/bin/env bash
# ============================================================================
# قياس استرجاع الرَّاق على Postgres حقيقي — أول قياس فعلي، بلا اختلاق.
#
# ## لماذا محليًّا لا على الإنتاج
#
# القياس الحيّ في `src/test/rag-live-eval.test.ts` يحتاج دوال Edge منشورة
# ورمز جلسة، وكلاهما بيد المالك. وحتى يتوفّرا لم يكن ثمّة **أي** رقم:
# «لم يُقَس» هي الحالة الصادقة، وذكر رقم دونها اختلاق (المادة ٢٧).
#
# لكن ذراع البحث المعجمي لا تحتاج شيئًا من ذلك: `rag_hybrid_search` تقبل
# `_query_embedding` **اختياريًّا** (`default null`)، وفرع المتّجهات مشروط
# بـ`is not null`. فالنصّ الكامل والثلاثيّات يعملان على عنقود محلّي بلا
# مزوّد تضمين ولا مفتاح ولا مساس بالإنتاج.
#
# ## ما يقيسه هذا السكربت وما لا يقيسه
#
# يقيس: **الذراع المعجمية وحدها** (FTS + trigram عبر RRF) على المتن
# المبذور نفسه، بمجسّات هي أسماء الصفوف حرفيًّا — لا أسئلة مؤلَّفة.
# لا يقيس: الذراع المتّجهية، ولا دقّة الاستشهاد، ولا الأداء على الإنتاج.
#
# فالرقم الخارج منه **لا يفتح البوابة** ولا يُقارن بعتبتَي الدستور
# (0.85 استدعاء@5 · 0.95 دقة استشهاد) — تلك تُقاس على المسار الكامل
# المنشور. هذا خطُّ أساسٍ للذراع المعجمية، يُقال بما هو.
#
# ## الذراع غير المتّصلة (O6، ٢٠٢٦/١٠/٢٩)
#
# قبل Postgres تُشغَّل ذراعٌ ثانية لا تحتاج قاعدة ولا مزوّدًا ولا شبكة: BM25
# الذاكري (`src/lib/retrieval/bm25.server.ts`) فوق المتن المضمّن في المستودع
# على المجموعة الموسومة (`src/lib/retrieval/eval/labelled-set.server.ts` —
# أسئلة من كاتب الاختبار بمراجع ملف:سطر؛ عددها يُطبع في سطر الحدود
# `offlineLimitsAr(n)` ولا يُكتب هنا كي لا ينحرف). رقمها يخرج **مع حدوده**:
# ليست استدعاء@5 على متن موثّق ولا تُستعمل لرفع rag_enabled. وذراعا
# المتّجهات والقاعدة فيها «لم يُقَس» لا صفر.
#
# الاستخدام: bash scripts/rag-measure.sh
# المخرج:    JSON على stdout (سطرٌ للذراع غير المتّصلة، ثم سطرٌ لذراع Postgres
#            حين تتوفّر) + جدول مقروء على stderr.
# ============================================================================
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# ── الذراع غير المتّصلة ─────────────────────────────────────────────────────
# يُحزَم المدخل بـesbuild (تبعية تطوير قائمة في package.json) إلى ملف عابر
# خارج المستودع ويُشغَّل بـnode. غياب esbuild تخطٍّ لا فشل؛ أمّا فشل الذراع
# نفسها فعطلٌ في الكود لا في البيئة، فيُعاد 1.
ESBUILD="$ROOT/node_modules/.bin/esbuild"
if [ -x "$ESBUILD" ]; then
  bundle_dir="$(mktemp -d)"
  if "$ESBUILD" "$ROOT/src/lib/retrieval/eval/offline-measure.main.server.ts" \
       --bundle --platform=node --format=esm --alias:@="$ROOT/src" \
       --log-level=error --outfile="$bundle_dir/offline-measure.mjs" \
     && node "$bundle_dir/offline-measure.mjs"; then
    :
  else
    echo "✗ تعذّرت الذراع غير المتّصلة — عطل كود لا بيئة." >&2
    rm -rf "$bundle_dir"
    exit 1
  fi
  rm -rf "$bundle_dir"
else
  echo "⚠ esbuild غير متاح — الذراع غير المتّصلة تُتخطّى (ليس فشلًا)." >&2
fi

# ── ذراع Postgres المحلية ───────────────────────────────────────────────────
PGBIN="${PGBIN:-/usr/lib/postgresql/16/bin}"
[ -x "$PGBIN/initdb" ] || PGBIN="$(dirname "$(command -v initdb 2>/dev/null || echo /nonexistent)")"
if [ ! -x "$PGBIN/initdb" ]; then
  echo "⚠ لا يوجد Postgres محلي — القياس يُتخطّى (ليس فشلًا)." >&2
  exit 0
fi

PORT="${RAG_MEASURE_PORT:-55460}"
M="$(cd "$(dirname "$0")/../supabase/migrations" && pwd)"
SQL="$(cd "$(dirname "$0")/../supabase/preflight" && pwd)/rag_measure.sql"
RUNUSER=""
if [ "$(id -u)" = "0" ]; then id postgres >/dev/null 2>&1 && RUNUSER="postgres"; fi
run_as() { if [ -n "$RUNUSER" ]; then su "$RUNUSER" -c "$1"; else bash -c "$1"; fi; }

data="$(mktemp -d)/pg"; mkdir -p "$data"
[ -n "$RUNUSER" ] && chown -R "$RUNUSER" "$(dirname "$data")" "$data"
run_as "$PGBIN/initdb -D $data -U postgres -E UTF8 --locale=C.utf8 -A trust" >/dev/null 2>&1
run_as "$PGBIN/pg_ctl -D $data -o '-p $PORT -k /tmp -c listen_addresses=' -l $data/log start" >/dev/null 2>&1
sleep 2

out="$(psql -h /tmp -p "$PORT" -U postgres -v ON_ERROR_STOP=1 -q -t -A \
  -v normalize_file="$M/20260728093100_rag_ar_normalize.sql" \
  -v documents_file="$M/20260728093200_rag_documents.sql" \
  -v chunks_file="$M/20260728093300_rag_chunks.sql" \
  -v search_file="$M/20260728110000_rag_hybrid_search.sql" \
  -v growth_file="$M/20260805120000_rag_corpus_growth.sql" \
  -v scaffold_file="$(dirname "$SQL")/_scaffold.sql" \
  -v hcis_seed_file="$M/20260719200000_hcis_framework_tables_seed_anon.sql" \
  -f "$SQL" 2>&1)"
code=$?

run_as "$PGBIN/pg_ctl -D $data -m immediate stop" >/dev/null 2>&1
rm -rf "$(dirname "$data")"

if [ $code -ne 0 ]; then
  echo "✗ تعذّر القياس على Postgres:" >&2
  echo "$out" | grep -i error | head -5 >&2
  exit 1
fi
echo "$out"
