#!/usr/bin/env bash
# ============================================================================
# فحص ما قبل التطبيق لدوالّ `sadeed_match_*` (O4) على Postgres حقيقي بـpgvector،
# مع إثبات أنه يسقط على انتهاكات مزروعة (المادة ٣٠).
#
# ما يفعله:
#   ١. عنقود مؤقّت (initdb) ثم قاعدة مستقلّة لكل تشغيل — الأدوار عنقودية فتُنشأ
#      مرة (السقالة تحرسها)، والباقي لا يتسرّب بين التشغيلات.
#   ٢. الأصل: `supabase/preflight/sadeed_match_check.sql` على الترحيل الحقيقي
#      وملف تراجعه — يجب أن ينجح.
#   ٣. سيناريو التكرار: ترحيل على جدول فيه زوج (document_id, chunk_index) مكرّر —
#      يجب أن يتوقّف برسالة الحارس ولا يترك شيئًا.
#   ٤. نسخٌ مكسورة عمدًا من الترحيل/التراجع (مسند مؤسسة محذوف، مسند مستخدم
#      محذوف، سحب anon محذوف، …): **كل واحدة يجب أن تفشل**. نسخةٌ تمرّ = ثغرة في
#      الفحص نفسه فيفشل السكربت. ونسخةٌ لا تختلف عن الأصل (تعديل لم يُطبَّق)
#      تُفشل السكربت أيضًا.
#
# يتخطّى **بإعلان صريح** (لا بنجاح مزيّف، رمز الخروج 0) حين لا يوجد Postgres محلي
# أو لا يتوفّر pgvector: «لم يُثبَت شيء». ولا يتصل بأي قاعدة حيّة ولا يحمل مفاتيح.
#
# الاستخدام: bash scripts/sadeed-match-preflight.sh   (أو npm run check:sadeed-match)
# ============================================================================
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PGBIN="${PGBIN:-/usr/lib/postgresql/16/bin}"
[ -x "$PGBIN/initdb" ] || PGBIN="$(dirname "$(command -v initdb 2>/dev/null || echo /nonexistent)")"
if [ ! -x "$PGBIN/initdb" ] || [ ! -x "$PGBIN/pg_ctl" ]; then
  echo "⚠ لا يوجد Postgres محلي — فحص sadeed_match يُتخطّى: لم يُثبَت شيء (ليس نجاحًا)."
  exit 0
fi
command -v psql >/dev/null 2>&1 || { echo "⚠ psql غير متاح — الفحص يُتخطّى: لم يُثبَت شيء (ليس نجاحًا)."; exit 0; }

PORT="${SADEED_MATCH_PORT:-55470}"
MIG="$ROOT/supabase/migrations/20261030120000_sadeed_match_functions.sql"
RB="$ROOT/supabase/migrations/20261030120001_sadeed_match_functions_rollback.sql"
SQL="$ROOT/supabase/preflight/sadeed_match_check.sql"
SCAFFOLD="$ROOT/supabase/preflight/_scaffold.sql"
for f in "$MIG" "$RB" "$SQL" "$SCAFFOLD"; do
  [ -f "$f" ] || { echo "✗ ملف ناقص: $f"; exit 1; }
done

RUNUSER=""
if [ "$(id -u)" = "0" ]; then id postgres >/dev/null 2>&1 && RUNUSER="postgres"; fi
run_as() { if [ -n "$RUNUSER" ]; then su "$RUNUSER" -c "$1"; else bash -c "$1"; fi; }

base="$(mktemp -d "${TMPDIR:-/tmp}/sadeed-match.XXXXXX")"
data="$base/pg"; sock="$base/sock"; work="$base/work"
mkdir -p "$data" "$sock" "$work"
[ -n "$RUNUSER" ] && chown -R "$RUNUSER" "$data" "$sock"
chmod 0755 "$base"

cleanup() {
  run_as "$PGBIN/pg_ctl -D $data -m immediate stop" >/dev/null 2>&1
  rm -rf "$base"
}
trap cleanup EXIT

run_as "$PGBIN/initdb -D $data -U postgres -E UTF8 --locale=C.utf8 -A trust" >/dev/null 2>&1 \
  || { echo "✗ تعذّر initdb"; exit 1; }
run_as "$PGBIN/pg_ctl -D $data -o '-p $PORT -k $sock -c listen_addresses=' -l $data/log -w start" >/dev/null 2>&1 \
  || { echo "✗ تعذّر تشغيل العنقود"; tail -5 "$data/log" 2>/dev/null; exit 1; }

PSQL=(psql -h "$sock" -p "$PORT" -U postgres -X -q)

has_vector="$("${PSQL[@]}" -d postgres -At -c "select count(*) from pg_available_extensions where name = 'vector'")"
if [ "${has_vector:-0}" = "0" ]; then
  echo "⚠ pgvector غير متاح على هذا Postgres — فحص sadeed_match يُتخطّى."
  echo "  لم يُثبَت شيء: لا عزل مؤسسات ولا امتيازات ولا فهرس فريد. (ليس نجاحًا.)"
  echo "  للتثبيت: apt-get install postgresql-16-pgvector"
  exit 0
fi

n=0
# run_case NAME SCENARIO MIGRATION_FILE ROLLBACK_FILE → يضع الرمز في $rc والمخرج في $work/NAME.out
run_case() {
  local name="$1" scenario="$2" mig="$3" rb="$4" db
  n=$((n + 1)); db="case_$n"
  "${PSQL[@]}" -d postgres -c "create database $db" >/dev/null 2>&1 || { echo "✗ تعذّر إنشاء القاعدة $db"; exit 1; }
  "${PSQL[@]}" -d "$db" -v ON_ERROR_STOP=1 -v scenario="$scenario" \
    -v scaffold_file="$SCAFFOLD" -v migration_file="$mig" -v rollback_file="$rb" \
    -f "$SQL" >"$work/$name.out" 2>&1 </dev/null
  rc=$?
}

failed=0

# ── ٢. الأصل ────────────────────────────────────────────────────────────────
run_case base full "$MIG" "$RB"
if [ $rc -eq 0 ] && grep -q "SADEED_MATCH_CHECK: FULL_OK" "$work/base.out"; then
  passes="$(grep -c 'NOTICE:  PASS:' "$work/base.out")"
  echo "✓ الأصل: $passes فحصًا نجح على pgvector $("${PSQL[@]}" -d postgres -At -c "select default_version from pg_available_extensions where name='vector'")"
  grep 'NOTICE:  MATRIX' "$work/base.out" | sed -e 's/^.*NOTICE:  /  /'
else
  echo "✗ الأصل فشل:"
  grep -E 'ERROR|FAIL' "$work/base.out" | head -8
  failed=1
fi

# الأصل بلا امتيازات Supabase الافتراضية: الـGRANT الصريح وحده يمنح authenticated وservice_role.
run_case base_bare full_bare "$MIG" "$RB"
if [ $rc -eq 0 ] && grep -q "SADEED_MATCH_CHECK: FULL_OK" "$work/base_bare.out"; then
  echo "✓ الأصل بلا امتيازات افتراضية: $(grep -c 'NOTICE:  PASS:' "$work/base_bare.out") فحصًا نجح"
else
  echo "✗ الأصل بلا امتيازات افتراضية فشل:"
  grep -E 'ERROR|FAIL' "$work/base_bare.out" | head -8
  failed=1
fi

# ── ٣. سيناريو التكرار ──────────────────────────────────────────────────────
GUARD_MSG='sadeed_match_functions: duplicate (document_id, chunk_index) pairs in finn_document_chunks'
run_case dup dup_abort "$MIG" "$RB"
if [ $rc -eq 0 ] && grep -q "SADEED_MATCH_CHECK: DUP_ABORT_OK" "$work/dup.out" \
   && grep -qF "$GUARD_MSG" "$work/dup.out" && grep -q 'PASS: dup_abort' "$work/dup.out"; then
  echo "✓ سيناريو التكرار: الحارس أوقف الترحيل برسالته ولم يترك أثرًا"
  grep -m1 -F "$GUARD_MSG" "$work/dup.out" | sed -e 's/^.*ERROR:  /  ERROR:  /' | cut -c1-210
else
  echo "✗ سيناريو التكرار لم يتصرّف كما يجب:"
  grep -E 'ERROR|FAIL' "$work/dup.out" | head -5
  failed=1
fi

# ── ٤. الانتهاكات المزروعة: كل نسخة يجب أن تسقط ─────────────────────────────
# اسم<TAB>الهدف(m ترحيل | r تراجع)<TAB>السيناريو<TAB>تعبير perl (-0777)
mutants="$work/mutants.tsv"
cat >"$mutants" <<'EOF'
org-docs	m	full	s{where c\.org_id = _org_id\n    and d\.org_id = _org_id\n    and c\.user_id}{where c.user_id}
org-knowledge	m	full	s{where k\.org_id = _org_id\n    and k\.embedding}{where k.embedding}
org-memory	m	full	s{where m\.org_id = _org_id\n    and m\.user_id}{where m.user_id}
user-docs-both	m	full	s{    and c\.user_id = \(select auth\.uid\(\)\)\n    and d\.user_id = \(select auth\.uid\(\)\)\n}{}
user-docs-document-only	m	full	s{    and d\.user_id = \(select auth\.uid\(\)\)\n}{}
user-docs-chunk-only	m	full	s{    and c\.user_id = \(select auth\.uid\(\)\)\n}{}
user-memory	m	full	s{    and m\.user_id = \(select auth\.uid\(\)\)\n}{}
status-ready	m	full	s{    and d\.status = 'ready'\n}{}
null-embedding-docs	m	full	s{\n    and c\.embedding is not null}{}
null-embedding-knowledge	m	full	s{\n    and k\.embedding is not null}{}
null-embedding-memory	m	full	s{\n    and m\.embedding is not null}{}
anon-revoke-dropped	m	full	s{(revoke all on function public\.sadeed_match_\w+\([^)]*\)) from public, anon;}{$1 from public;}g
authenticated-grant-dropped	m	full_bare	s{to authenticated, service_role;}{to service_role;}g
service-role-grant-dropped	m	full_bare	s{to authenticated, service_role;}{to authenticated;}g
security-definer	m	full	s{security invoker}{security definer}g
not-stable	m	full	s{\nstable\n}{\nvolatile\n}g
search-path-dropped	m	full	s{set search_path = public, extensions\nas}{as}g
tags-empty-array-zero-rows	m	full	s{ or cardinality\(_tags\) = 0}{}
tags-ignored	m	full	s{ or k\.tags && _tags}{ or true}
scope-ignored	m	full	s{\n    and \(_scope is null or m\.scope = _scope\)}{}
limit-removed	m	full	s{\n  limit least\(greatest\(coalesce\(_limit, 8\), 0\), 50\);}{;}
order-reversed	m	full	s{order by c\.embedding <=> _query}{order by c.embedding <=> _query desc}
similarity-is-distance	m	full	s{\(1 - \(c\.embedding <=> _query\)\)::numeric}{(c.embedding <=> _query)::numeric}
unique-index-removed	m	full	s{create unique index if not exists finn_document_chunks_doc_chunk_uq\n  on public\.finn_document_chunks \(document_id, chunk_index\);}{select 1;}; s{comment on index [^;]+;}{select 1;}
touches-aria-match	m	full	s{\z}{\ndrop function if exists public.aria_match_memory(uuid, vector, text, int);\n}
adds-gin-index	m	full	s{\z}{\ncreate index if not exists finn_knowledge_content_gin on public.finn_knowledge using gin (to_tsvector('simple', content));\n}
guard-disabled	m	dup_abort	s{if dup_pairs > 0 then}{if false then}
rollback-drops-aria	r	full	s{\z}{\ndrop function if exists public.aria_match_documents(uuid, vector, int);\n}
rollback-keeps-index	r	full	s{drop index if exists [^;]+;}{select 1;}
rollback-keeps-functions	r	full	s{drop function if exists public\.sadeed_match_memory[^;]+;}{select 1;}
null-org-docs	m	full	s{where c\.org_id = _org_id\n    and d\.org_id = _org_id}{where c.org_id = coalesce(_org_id, c.org_id)\n    and d.org_id = coalesce(_org_id, d.org_id)}
null-org-knowledge	m	full	s{where k\.org_id = _org_id}{where k.org_id = coalesce(_org_id, k.org_id)}
null-org-knowledge-service	m	full	s{where k\.org_id = _org_id}{where (k.org_id = _org_id or (_org_id is null and (select auth.uid()) is null))}
null-org-memory	m	full	s{where m\.org_id = _org_id}{where m.org_id = coalesce(_org_id, m.org_id)}
order-reversed-knowledge	m	full	s{order by k\.embedding <=> _query}{order by k.embedding <=> _query desc}
order-reversed-memory	m	full	s{order by m\.embedding <=> _query}{order by m.embedding <=> _query desc}
similarity-is-distance-knowledge	m	full	s{\(1 - \(k\.embedding <=> _query\)\)::numeric}{(k.embedding <=> _query)::numeric}
similarity-is-distance-memory	m	full	s{\(1 - \(m\.embedding <=> _query\)\)::numeric}{(m.embedding <=> _query)::numeric}
limit-removed-knowledge	m	full	s{(order by k\.embedding <=> _query)\n  limit least\(greatest\(coalesce\(_limit, 6\), 0\), 50\);}{$1;}
limit-removed-memory	m	full	s{(order by m\.embedding <=> _query)\n  limit least\(greatest\(coalesce\(_limit, 6\), 0\), 50\);}{$1;}
limit-cap-raised-docs	m	full	s{(limit least\(greatest\(coalesce\(_limit, 8\), 0\)), 50\)}{$1, 5000)}
limit-cap-raised-knowledge	m	full	s{(order by k\.embedding <=> _query\n  limit least\(greatest\(coalesce\(_limit, 6\), 0\)), 50\)}{$1, 5000)}
limit-cap-raised-memory	m	full	s{(order by m\.embedding <=> _query\n  limit least\(greatest\(coalesce\(_limit, 6\), 0\)), 50\)}{$1, 5000)}
limit-negative-docs	m	full	s{limit least\(greatest\((coalesce\(_limit, 8\)), 0\)}{limit least($1}
limit-negative-knowledge	m	full	s{(order by k\.embedding <=> _query\n  limit least\()greatest\((coalesce\(_limit, 6\)), 0\)}{$1$2}
limit-negative-memory	m	full	s{(order by m\.embedding <=> _query\n  limit least\()greatest\((coalesce\(_limit, 6\)), 0\)}{$1$2}
limit-null-docs	m	full	s{greatest\(coalesce\(_limit, 8\), 0\)}{greatest(_limit, 0)}
limit-null-knowledge	m	full	s{(order by k\.embedding <=> _query\n  limit least\(greatest\()coalesce\(_limit, 6\)}{$1_limit}
limit-null-memory	m	full	s{(order by m\.embedding <=> _query\n  limit least\(greatest\()coalesce\(_limit, 6\)}{$1_limit}
EOF

survivors=0; killed=0; noop=0
while IFS=$'\t' read -r mname target scen expr; do
  [ -z "$mname" ] && continue
  mcopy_m="$MIG"; mcopy_r="$RB"
  if [ "$target" = "m" ]; then src="$MIG"; else src="$RB"; fi
  out_file="$work/mut-$mname.sql"
  perl -0777 -pe "$expr" "$src" >"$out_file"
  if cmp -s "$src" "$out_file"; then
    echo "✗ [$mname] التعديل لم يُطبَّق (النسخة المزروعة مطابقة للأصل) — خطأ في السكربت لا في الفحص"
    noop=$((noop + 1)); failed=1; continue
  fi
  if [ "$target" = "m" ]; then mcopy_m="$out_file"; else mcopy_r="$out_file"; fi
  run_case "mut-$mname" "$scen" "$mcopy_m" "$mcopy_r"
  # dup_abort: النجاح يتطلّب رسالة الحارس؛ لذا النسخة تسقط بغيابها.
  survived=0
  if [ "$scen" = "dup_abort" ]; then
    if [ $rc -eq 0 ] && grep -q "SADEED_MATCH_CHECK: DUP_ABORT_OK" "$work/mut-$mname.out" \
       && grep -qF "$GUARD_MSG" "$work/mut-$mname.out"; then survived=1; fi
  else
    if [ $rc -eq 0 ] && grep -q "SADEED_MATCH_CHECK: FULL_OK" "$work/mut-$mname.out"; then survived=1; fi
  fi
  if [ $survived -eq 1 ]; then
    echo "✗ [$mname] نجا من الفحص — ثغرة في الفحص: لم يسقط على الانتهاك المزروع"
    survivors=$((survivors + 1)); failed=1
  else
    why="$(grep -m1 -E 'FAIL:|ERROR:' "$work/mut-$mname.out" | sed -e 's/^.*\(FAIL:\|ERROR:\)/\1/' | cut -c1-110)"
    printf '  ✓ [%s] سقط ← %s\n' "$mname" "${why:-(سقط دون رسالة)}"
    killed=$((killed + 1))
  fi
done <"$mutants"

total=$((killed + survivors + noop))
echo "الانتهاكات المزروعة: $killed/$total سقطت · $survivors نجت · $noop بلا أثر"

if [ $failed -ne 0 ]; then
  echo "✗ فحص sadeed_match لم يمرّ."
  exit 1
fi
echo "✓ فحص sadeed_match مرّ: الأصل أخضر، وكل انتهاك مزروع أحمر."
