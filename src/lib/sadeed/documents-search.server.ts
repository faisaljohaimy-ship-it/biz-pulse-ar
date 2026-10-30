/**
 * بحث مستندات المستدعي الدلالي (صفحة `/sadeed-documents`) عبر `sadeed_match_documents`
 * (O4، ٢٠٢٦/١٠/٣٠) بدل `aria_match_documents`.
 *
 * الدالّة الجديدة تشترط **مؤسسةً صريحة** (`_org_id`)، والمستخدم من JWT (`auth.uid()`):
 * المستندات تبقى نطاق مستخدم كما كانت. وهذه الدالّة الخادمية لا تعرف المؤسسة
 * النشطة (لا `app_metadata.current_org` في سياق الوسيط)، فتسأل **كل مؤسسة
 * ينتمي إليها المستخدم** وتدمج بالتشابه: مستنداته هي وحدها تظهر (مسند
 * `user_id = auth.uid()` داخل الدالّة)، ولا اختيارَ مؤسسةٍ بالتخمين يُخفي مستندًا
 * رُفع تحت مؤسسة أخرى (الرفع اليوم يأخذ المؤسسة من عمود افتراضي لا من الجلسة).
 * بلا عضويةٍ ⇐ لا نداء ولا نتائج (الدستور ٣٢: بلا مؤسسة لا بحث واسع).
 *
 * التضمين والاستعلام يبقيان في المستدعي (`documents.functions.ts`)؛ هنا القراءة
 * وحدها، ليُختبَر سلوكها بعميلٍ مزروع.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type SadeedDocumentMatch = {
  chunk_id: string;
  document_id: string;
  title: string;
  content: string;
  similarity: number;
};

/** سقف المؤسسات المسؤول عنها لكل بحث: مستخدم بعضوياتٍ كثيرة لا يُضاعف النداءات بلا حدّ. */
export const MAX_SEARCH_ORGS = 8;

export async function searchSadeedDocumentsAcrossMemberships(
  supabase: SupabaseClient<Database>,
  userId: string,
  queryVector: string,
  limit: number,
): Promise<SadeedDocumentMatch[]> {
  const { data: memberships, error: membershipError } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("user_id", userId);
  if (membershipError) throw new Error(membershipError.message);

  const orgIds = [...new Set((memberships ?? []).map((m) => m.org_id))].slice(0, MAX_SEARCH_ORGS);
  if (orgIds.length === 0) return [];

  const perOrg = await Promise.all(
    orgIds.map(async (orgId) => {
      const { data, error } = await supabase.rpc("sadeed_match_documents", {
        _org_id: orgId,
        _query: queryVector,
        _limit: limit,
      });
      if (error) throw new Error(error.message);
      return (data ?? []) as SadeedDocumentMatch[];
    }),
  );

  return perOrg
    .flat()
    .sort((a, b) => Number(b.similarity) - Number(a.similarity))
    .slice(0, limit);
}
