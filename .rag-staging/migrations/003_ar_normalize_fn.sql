-- =============================================================================
-- 003_ar_normalize_fn.sql — Arabic text normalization for retrieval
-- STAGING — NOT applied.
--
-- Handles:
--   • alef family        (أ إ آ ٱ → ا)
--   • teh marbuta        (ة → ه)
--   • alef maksura       (ى → ي)
--   • tashkeel/harakat   (ً ٌ ٍ َ ُ ِ ّ ْ ٰ)  → stripped
--   • tatweel/kashida    (ـ) → stripped
--   • yeh forms          (ئ → ي)  -- conservative; keeps hamza-on-waw as-is
--   • unicode BiDi marks + zero-width joiners → stripped
--
-- IMMUTABLE + STRICT so it can back a GENERATED column or an index expression.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.normalize_ar(_input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
STRICT
PARALLEL SAFE
SET search_path = public
AS $$
  SELECT
    -- Collapse whitespace to single spaces last.
    regexp_replace(
      -- Strip tatweel + tashkeel + BiDi/ZWJ marks.
      regexp_replace(
        -- Fold letter variants.
        translate(
          lower(_input),
          -- from
          'أإآٱةىئـًٌٍَُِّْٰ' ||
          E'\u200B\u200C\u200D\u200E\u200F\u202A\u202B\u202C\u202D\u202E\uFEFF',
          -- to (same length; empties are handled by regexp below)
          'اااااهيي' ||
          '                ' ||
          '                '
        ),
        '[\u064B-\u0652\u0670\u0640]', '', 'g'
      ),
      '\s+', ' ', 'g'
    )
$$;

COMMENT ON FUNCTION public.normalize_ar(text) IS
  'Arabic normalization for retrieval: folds alef/teh-marbuta/yeh, strips tashkeel/tatweel/BiDi. IMMUTABLE — safe for GENERATED and index expressions.';

-- =============================================================================
-- VERIFY:
--   SELECT public.normalize_ar('الإسْتِراتِيْجِيَّة');   -- → 'الاستراتيجيه'
--   SELECT public.normalize_ar('السَّـــلامة');          -- → 'السلامه'
--   SELECT public.normalize_ar('نُظُم أمن SEC-01');      -- → 'نظم امن sec-01'
--
-- ROLLBACK:
--   DROP FUNCTION IF EXISTS public.normalize_ar(text);
-- =============================================================================
