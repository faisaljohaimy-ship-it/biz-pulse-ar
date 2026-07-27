-- ============================================================================
-- RAG LAYER (2/4) — Arabic normalization function
--
-- STAGED, NOT APPLIED. `nx_ar_normalize(text)` folds the orthographic variance
-- that wrecks Arabic recall, so BOTH the FTS tsvector and the pg_trgm index are
-- built over one canonical form. It is IMMUTABLE / PARALLEL SAFE so it can back
-- STORED generated columns and functional indexes (a STABLE function cannot).
--
-- Transforms (exactly the set the brief requires, plus two safe neighbours):
--   • tashkeel  — strips the eight diacritics + superscript alef (ً ٌ ٍ َ ُ ِ ّ ْ ٰ)
--   • tatweel   — removes the kashida elongation (ـ)
--   • alef      — أ إ آ ٱ → ا   (unify all hamza/madda/wasla alef forms)
--   • ta marbuta— ة → ه          (matches how users actually type it)
--   • + alef maqsura ى → ي and carrier hamza ؤ→و ئ→ي (same ي/و confusion class)
--   • lower()   — folds Latin so code tokens match (SEC-18 == sec-18)
--
-- Only translate()/regexp_replace()/lower() are used — all IMMUTABLE. unaccent()
-- is deliberately AVOIDED: it is STABLE (config-dependent) and cannot be indexed.
-- STRICT: null in → null out.
-- ============================================================================

-- Order matters: (1) regex-strip tatweel + tashkeel + superscript alef FIRST,
-- (2) then a STRICT 1:1 EQUAL-LENGTH translate() for letter folding. Equal
-- from/to lengths are the point — translate() DELETES trailing unmatched
-- source chars, so an unequal mapping silently shifts every pairing; keeping
-- the fold set 8→8 and handling removals in the regex avoids that. (3) lower()
-- folds Latin. Verified on UTF8 (Supabase) via supabase/preflight/rag_layer_check.sql.
create or replace function public.nx_ar_normalize(_input text)
returns text
language sql
immutable
parallel safe
strict
set search_path = public
as $$
  select lower(
    translate(
      regexp_replace(
        _input,
        -- U+0640 tatweel · U+064B..U+0652 tashkeel · U+0670 superscript alef
        E'[ـً-ْٰ]',
        '',
        'g'
      ),
      -- from: أ إ آ ٱ ى ة ؤ ئ   (8 codepoints)
      E'أإآٱىةؤئ',
      -- to  : ا ا ا ا ي ه و ي   (8 codepoints — 1:1, no deletion)
      E'اااايهوي'
    )
  );
$$;

comment on function public.nx_ar_normalize(text)
  is 'Canonical Arabic form for RAG indexing: strips tashkeel/tatweel, unifies alef + ta-marbuta + alef-maqsura + carrier hamza, lowercases Latin. IMMUTABLE (indexable).';
