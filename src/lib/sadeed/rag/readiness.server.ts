/**
 * جاهزية الاسترجاع كما يعلنها `/api/chat/health` (O7 ب، ٢٠٢٦/١٠/٣٠) — بلا قاعدة
 * ولا شبكة: قراءةٌ متزامنة للبيئة.
 *
 * - `lexical_ready` دائمًا `true`: الفهرس الداخلي (بذرة المستودع + أسماء HCIS) نصٌّ
 *   في الشيفرة ولا يحتاج مزوّدًا ولا قاعدة (قرار المالك ②: «يخدم بصفر مزوّد»).
 *   ليست فحصًا حيًّا لجداول القاعدة — تلك أذرع إضافية تُسجَّل في `rag.outcome`.
 * - `vector_ready` = الراية `SADEED_GEMINI_RAG_READY` **و** مفتاح التضمين معًا
 *   (قرار ③: الراية بوّابة المتّجهية وحدها). اليوم `false` في الإنتاج.
 * - `embedding_provider` معرّفٌ محايد لا اسم مورّد: `primary` حين يوجد مفتاح تضمين
 *   (مهيّأ، ولو كانت الراية منخفضة فلا تكون المتّجهية جاهزة)، وإلا `none`.
 *
 * الحقول الأقدم في الجسم (`rag_ready` · `rag_embedding_model` · `key_present` ·
 * `provider`) لا تُمسّ هنا: يقرؤها `scripts/smoke-production.mjs`.
 */
import { resolveGeminiApiKey } from "../gemini-embeddings.server";
import { isGeminiRagReady } from "./vector-arm.server";

export type EmbeddingProviderId = "primary" | "none";

export interface RetrievalReadiness {
  lexical_ready: true;
  vector_ready: boolean;
  embedding_provider: EmbeddingProviderId;
}

export function describeRetrievalReadiness(
  env: Record<string, string | undefined> = process.env,
): RetrievalReadiness {
  const keyPresent = resolveGeminiApiKey(env) !== null;
  return {
    lexical_ready: true,
    vector_ready: isGeminiRagReady(env) && keyPresent,
    embedding_provider: keyPresent ? "primary" : "none",
  };
}
